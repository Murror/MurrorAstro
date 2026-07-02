# Runbook: AI Eval Harness

**When to use:** validating AI behavior changes (prompt edits, model swaps, new agent integrations) before they ship; investigating regression in chat / journal / crisis detection quality.
**Prerequisites:** access to viasr-api repo + Anthropic API key.

---

## Location + entry point

```
/Users/astro/Projects/murror-transfer/Murror/viasr-api/evals/
├── runner.py            # entry point — `poetry run python -m evals.runner`
├── fixtures/            # YAML test cases per suite — discovery is RECURSIVE
│   ├── crisis_detection.yaml
│   ├── deep_chat.yaml
│   ├── emotion_detection.yaml
│   ├── journal_completion.yaml
│   ├── memory_recall_quality.yaml
│   ├── insight_deeper/          # "Dive Deeper" pills (subdirectory suites
│   ├── new_relationship/        #  are discovered too — do NOT assume a
│   └── reflection_card/         #  subdirectory hides a fixture from the run)
├── graders/             # code + LLM-as-judge graders
└── reports/
    └── baseline.json    # current accepted baseline (committed)
```

⚠️ **Every suite hits a RUNNING viasr-api** (`EVAL_BASE_URL`). There is no
offline mode: without a reachable target every trial errors out. The
deterministic guard logic additionally has offline pytest coverage under
`tests/` (no server, no token spend), and
`tests/evals/test_runner_discovery.py` enforces that every fixture's `suite:`
has a registered runner — a fixture can no longer sit silently unrun (that
happened for months to `insight_deeper/` and `new_relationship/`: the old
discovery glob was non-recursive and the dispatcher only knew five suites).

---

## Common runs

```bash
cd /Users/astro/Projects/murror-transfer/Murror/viasr-api

# Full run — all 4 suites, 5 trials per task
poetry run python -m evals.runner

# Quick targeted run for development
poetry run python -m evals.runner --suite crisis_detection --trials 2

# Save current results as the new baseline (after intentional behavior change)
poetry run python -m evals.runner --save-baseline

# CI mode: compare against baseline, exit non-zero if degraded
poetry run python -m evals.runner --check-baseline --trials 3
```

---

## Required env vars

| Var | What it is | Default / notes |
|---|---|---|
| `EVAL_BASE_URL` | Target API to evaluate against | `http://localhost:8000` (default); alpha is `https://ai.api.murror.app` |
| `EVAL_API_KEY` | Same as `VIASR_API_KEY` for the target env | (sensitive — pull from env, don't commit) |
| `ANTHROPIC_API_KEY` | LLM-as-judge model | Required |
| `EVAL_TRIALS` | Trials per task | Default `5` |
| `EVAL_JUDGE_MODEL` | Judge model | Default `claude-sonnet-4-6` |

**Suite-toggle env vars** (default all `true`):
- `EVAL_RUN_CRISIS`
- `EVAL_RUN_EMOTION`
- `EVAL_RUN_CHAT` (also gates `memory_recall_quality`)
- `EVAL_RUN_JOURNAL`
- `EVAL_RUN_RELATIONSHIP` (gates `insight_deeper`, `new_relationship`, `reflection_card`)

---

## Running against alpha (the correct URL)

```bash
EVAL_BASE_URL=https://ai.api.murror.app \
EVAL_API_KEY=<ALPHA_VIASR_API_KEY> \
poetry run python -m evals.runner --trials 2
```

⚠️ **`alpha.ai.api.ambercare.app` returns 503.** Use `ai.api.murror.app` for alpha eval runs.

---

## Suite mapping (which to run for which code change)

| Code change touches... | Run suite |
|---|---|
| `app/services/chat/` | `--suite deep_chat` |
| Emotion detection / extraction | `--suite emotion_detection` |
| `app/services/journal/` | `--suite journal_completion` |
| Memory recall / librarian | `--suite memory_recall` |
| `app/services/insight_deeper/` or the EXPLORE_INSIGHT_DEEPER prompt | `--suite insight_deeper` |
| `app/services/new_relationship/` | `--suite new_relationship` |
| `app/services/reflection_card/` | `--suite reflection_card` |
| Crisis-related — **always run regardless** | `--suite crisis_detection` |
| Broad AI changes (model swap, multi-agent prompt restructure) | omit `--suite` (runs all) |

The `--suite` filter matches against the fixture path relative to
`evals/fixtures/` (so both a subdirectory name and a filename keyword work).

**Perspective note:** the `insight_deeper` suite's `you_voice_perspective`
grader encodes the you-voice contract from `fix/qa259-voice-and-pronouns`
(reader = "you"/"your", other person = "them"/"they", no personal names, no
relationship labels). Against a server still running the older first-person
prompt, model-generated questions are EXPECTED to fail that grader; the
warm fallback pairs pass either way (they were always second person).

Per [`../CONVENTIONS.md`](../CONVENTIONS.md) §6 (permanent fixes only): **never disable a failing eval to "make CI pass."** If an eval is failing, either fix the code or decide the new behavior is intended and update the baseline.

### Local-run caveats for the relationship-family suites (verified 2026-07-02)

Running these three against a **local** viasr-api needs a fully-provisioned
environment; verify against staging/alpha if a suite fails locally:

| Suite | Endpoint | Runs locally? | Gotcha |
|---|---|---|---|
| `insight_deeper` | `/new-relationship/explore-insight-deeper` | ✅ yes | Light; fallback + one model call. Verified 7/7 on staging code. |
| `reflection_card` | `/reflection/invidual/share` | ✅ yes | One reflection call. Verified 9/9. Run it in isolation. |
| `new_relationship` | `/new-relationship/extract-insight-relationship` | ⚠️ needs full env | Heavy multi-step LangGraph flow that calls **external services** (a "Suggest location" places lookup) which hang without local config, and reads self-hosted profile columns absent from dev Supabase. Verify on staging. |

Two model/config traps hit locally:
- The hardcoded default `model_complex_task = "claude-sonnet-4-6-20250929"`
  (`app/components/environment/config.py`) returns a **live 404** from Anthropic;
  the heavy flows 404 unless the deployed env overrides
  `LLM__CLAUDE__LLM_MODEL__MODEL_COMPLEX_TASK`. (Filed as a separate task.)
- A single orphaned `extract-insight` request blocks the default single uvicorn
  worker's event loop (its external call is blocking), so **stop a hung run and
  restart the server before the next suite** or later requests queue and time out.

---

## Baseline workflow

The accepted baseline lives at `evals/reports/baseline.json` (committed to git).

**After an intentional AI behavior change** (e.g., new tone, refined safety prompt):

1. Run evals to confirm new behavior is what you expect: `poetry run python -m evals.runner --trials 5`
2. Eyeball the report (`evals/reports/<timestamp>.json`) — confirm any newly-passing/failing tasks are intentional
3. Save as new baseline: `poetry run python -m evals.runner --save-baseline`
4. Commit `baseline.json` along with the prompt change in the same PR
5. PR description should explain WHY the baseline shifted

**After unintentional change** (regression caught by CI):

1. CI runs `--check-baseline` and exits non-zero
2. Read the report — identify which tasks regressed
3. Fix the underlying code/prompt — don't update the baseline to mask the regression
4. Re-run until parity restored

---

## CI integration

`run-evals` job in `viasr-api/.github/workflows/ci.yaml` — runs after alpha/beta deploy when AI files change.

The job is gated to AI-touching paths (prompts, services/chat, services/journal, etc.) so it doesn't run for every PR.

---

## Known issues + workarounds

**(as of 2026-04-07 — verify against current state)**

- **Crisis detection suite: `crisis_001`–`010` all fail.** This was the original `incident_crisis_detection_gap.md` symptom. Resolved by PR `6cfcc33` (April 22) which hardcodes 988 + Crisis Text Line on `urgency=critical`. **Re-run the suite to confirm the resolution still holds before changing crisis-related code.**
- **Intermittent 502 Bad Gateway on first trial of each task** — pod warmup. Eval client now retries with exponential backoff (3 attempts, 2s base delay).
- **1.5s delay between trials** to avoid Anthropic rate limiting.
- **CI deploy to alpha was failing earlier with kubectl auth error** — kubeconfig token expired in GitHub Actions secret. See [`ci-kubeconfig.md`](./ci-kubeconfig.md) for permanent token-based fix.

---

## Cross-references

- Crisis detection incident + fix: [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md#2026-04-07--crisis-detection-gap-on-chatstream)
- Run evals automatically rule: `feedback_run_evals_automatically.md` (memory) — auto-run after any prompt/AI/emotion/chat code change
- Architecture for the AI services: [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §4
