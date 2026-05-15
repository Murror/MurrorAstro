---
name: Eval harness commands and location
description: How to run the AI eval harness in viasr-api — commands, env vars, suite mapping, baseline workflow, correct alpha URL
type: reference
---

**Location:** `/Users/astro/Projects/murror-transfer/Murror/viasr-api/evals/`

**Run evals:**
```bash
cd /Users/astro/Projects/murror-transfer/Murror/viasr-api

# Full run (all 4 suites, 5 trials each)
poetry run python -m evals.runner

# Quick targeted run (2 trials, one suite)
poetry run python -m evals.runner --suite crisis_detection --trials 2

# Save baseline
poetry run python -m evals.runner --save-baseline

# Compare against baseline (CI mode — exits non-zero if degraded)
poetry run python -m evals.runner --check-baseline --trials 3
```

**Running against alpha (CORRECT URL):**
```bash
EVAL_BASE_URL=https://ai.api.murror.app EVAL_API_KEY=lpoOytGzw07IFZMaRrLWeLACfrxjh6kU poetry run python -m evals.runner --trials 2
```
**NOTE:** The URL `alpha.ai.api.ambercare.app` returns 503. The correct alpha URL is `ai.api.murror.app`.

**Required env vars:**
- `EVAL_BASE_URL` — target API (default: `http://localhost:8000`, alpha: `https://ai.api.murror.app`)
- `EVAL_API_KEY` — same as `VIASR_API_KEY` (value: `lpoOytGzw07IFZMaRrLWeLACfrxjh6kU`)
- `ANTHROPIC_API_KEY` — for LLM-as-judge grading
- `EVAL_TRIALS` — trials per task (default: 5)
- `EVAL_JUDGE_MODEL` — judge model (default: `claude-sonnet-4-6`)

**Suite mapping (which to run for which code change):**
- `app/services/chat/` changes → `--suite deep_chat`
- Emotion detection changes → `--suite emotion_detection`
- `app/services/journal/` changes → `--suite journal_completion`
- Crisis-related changes → `--suite crisis_detection` (ALWAYS run this for any AI change)
- Broad AI changes → omit `--suite` flag (runs all)

**Suite toggle env vars:** `EVAL_RUN_CRISIS`, `EVAL_RUN_EMOTION`, `EVAL_RUN_CHAT`, `EVAL_RUN_JOURNAL` (all default `true`)

**Baseline:** Saved at `evals/reports/baseline.json`. Update after intentional AI behavior changes.

**CI:** `run-evals` job in `.github/workflows/ci.yaml` — runs after alpha/beta deploy when AI files change.

**Known issues (as of 2026-04-07):**
- CI deploy to alpha fails with kubectl auth error — kubeconfig token expired in GitHub Actions secret
- Crisis detection suite: crisis_001–010 all fail (pre-existing, not caused by compassion changes)
- Intermittent 502 Bad Gateway on first trial of each task — pod warmup
- Retry with exponential backoff added to eval client (3 attempts, 2s base delay)
- 1.5s delay between trials to avoid rate limiting
