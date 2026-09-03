# CODEX BRIEF: medication-topic guardrail (viasr-api)

**Filed 2026-09-02 by Claude. Repo: `viasr-api`. PR base: `staging`.**

## Why this exists

Murror's AI personas are instructed in prompt text never to give medical or psychiatric
advice. Verified today on this checkout:

- `app/personas/registry.py` — "Never act as a licensed therapist; never diagnose or
  prescribe treatment"
- `app/services/council/prompt.py`
- `app/services/supabase_db/schemas.py`

Those three files are the ONLY places in `app/` where medication vocabulary appears at
all. Total hit count across `app/**/*.py` for
`medication|prescrib|antidepress|ssri|lithium|benzo|taper` is **3**, and all three are
prompt or schema text.

**There is no medication classifier, detector, or deterministic refusal path anywhere in
the codebase.** Verified: a grep for
`medication_(detect|classif|guard)|med_(detect|guard)|MedicationDetector|medication_topic`
across `app/**/*.py` returns zero hits.

So today, if a user asks "should I stop taking my Lexapro" or "do I still need my
lithium", the only thing between them and a generated answer is prompt text.

**This codebase already rejects that as a safety guarantee, in its own words.**
`app/services/crisis_detection/detector.py:507-509`:

> Hardcoded crisis response. We do NOT let the LLM generate this, when someone
> is at risk, we cannot rely on prompt-following to surface 988 reliably.

The whole `crisis_detection` module exists because prompt-following is not enough. The
same reasoning applies to medication questions, and the guard does not exist yet.

**Clinical stakes, so the response copy is written with the right weight.** Abrupt
discontinuation of psychiatric medication is genuinely dangerous. Benzodiazepine
withdrawal can cause seizures and death. Lithium discontinuation is associated with a
large increase in suicidal acts and with discontinuation-induced refractoriness.
Antipsychotic discontinuation relapse involves loss of insight, so the person cannot
self-correct. This is not a compliance checkbox.

## Read first

1. `app/services/crisis_detection/detector.py` (587 lines). This is the pattern to
   mirror. Structure as of today:
   - `CrisisSeverity(str, Enum)` :41
   - `CrisisAssessment(BaseModel)` :47
   - `_ClassifierOutput(BaseModel)` :89
   - `_compile_patterns()` :110
   - `_RegexResult(BaseModel)` :319
   - `_regex_pre_classify(text)` :329
   - `_parse_classifier_output(raw)` :493
   - `_select_crisis_text(severity)` :564
   - `crisis_response_text(severity)` :585
2. `app/services/crisis_detection/guard.py`. The single shared pre-check every chat
   entrypoint calls. Note its contract: gated behind
   `FeatureFlagName.CRISIS_DETECTION_ENABLED`, fails OPEN for safety-critical flags,
   and NEVER raises, because a classifier failure must not take a chat entrypoint down.
3. `app/services/crisis_detection/__init__.py` for the export surface.
4. Existing tests: `tests/services/test_crisis_guard.py`,
   `tests/services/test_chat_entrypoint_crisis_coverage.py`,
   `tests/services/test_crisis_turn_persistence.py`, `tests/services/crisis_detection/`.

## Order

1. **Build `app/services/medication_guard/`** mirroring `crisis_detection`'s shape:
   a `detector.py` with a conservative regex pre-classifier, and a `guard.py` exposing a
   single `medication_precheck(...)` with the same never-raises, fail-safe contract and
   its own kill-switch feature flag.
2. **Pre-classifier design.** Cross medication vocabulary (drug class names, common
   psychotropic generic and brand names, plus generic terms: meds, medication,
   prescription, antidepressant, SSRI, SNRI, mood stabilizer, antipsychotic) with intent
   verbs (stop, quit, come off, taper, wean, skip, halve, cut down, "should I keep
   taking", "do I still need"). The cross is what keeps precision up: a message that
   merely mentions a drug is NOT a match.
3. **Hardcoded response.** No LLM call in the safety path, same as
   `crisis_response_text`. Copy should say plainly that Murror does not give guidance
   about medication, that changing or stopping psychiatric medication can be dangerous,
   and to talk to the prescriber. Follow the crisis copy's precedent of NOT translating
   safety-critical text.
4. **Precedence with crisis.** If both classifiers trip, crisis wins or both surface,
   whichever matches the existing convention in the crisis path. Read it, match it,
   state in the PR body which you chose and why.
5. **Wire it into every chat entrypoint that already calls `crisis_precheck`.** The
   crisis module's own docstring records that crisis detection originally covered only
   the streaming use case and users on `/chat/text` (v1), the v2 multi-agent route, and
   `/chat/voice` were missed. Do not repeat that bug. Enumerate the call sites and cover
   all of them.
6. **Tests.** True positives, and true NEGATIVES that matter more: ordinary conversation
   mentioning a medication in passing must not be derailed. Include the crisis-overlap
   case.

## Rules

- PR against **`staging`**. Do not merge. No deploy. No DB writes.
- 🚨 **viasr production is the `production` branch; `main` is ALPHA.** The repo's own
  `CLAUDE.md` states the opposite and is **false**. Do not trust it.
- Confirm `git branch --show-current` before any git operation. Never switch branches in
  a shared checkout.
- Do not regress the pytest baseline: **2073 passing** as of 2026-09-02.
- Extend the existing pattern. Do not refactor or rebuild `crisis_detection`.
- Deterministic and testable. **No LLM in the safety path.**

## 🚨 Collision warning, read before you touch a file

**viasr PR #653 is OPEN against `staging`**: "fix(safety): guard the journal prompt,
journal output, and the crisis sentinel". It touches:

```
app/services/journal_analysis/generation.py
app/services/journal_analysis/prompts.py
app/services/journal_analysis/safety.py
app/services/murror_chat/chat.py
app/services/prompt_guards.py
app/services/tts/summary_script_generator.py
```

`app/services/prompt_guards.py` and `app/services/murror_chat/chat.py` are plausible
integration points for this work and are **already claimed by #653**. Either rebase on
#653, or keep the new module entirely self-contained and wire the entrypoints in a
follow-up once #653 lands. State which you chose. Do not produce a competing revision of
those two files.

**PR #652** is also open against `staging` (four pre-launch security holes). Check it for
overlap before touching auth or rate limiting.

## Sandbox notes for this lane

- A git **worktree cannot be your sandbox**. A worktree's `.git` is a pointer file, so
  git writes land outside the `workspace-write` root and commits can never land. Use a
  standalone `git clone --local`, then set the origin to the real remote and fetch
  `staging`.
- There is **no network egress**. Write a git bundle and report its SHA-256; it will be
  verified, fetched, rebased and pushed on this side.

## Status

Not started. Filed by Claude 2026-09-02. No competing Claude lane on
`app/services/medication_guard/`.

---

## ADDENDUM, 2026-09-02 evening: this has NOT landed. Re-measured.

A first attempt at this brief produced adjacent work rather than this work.
**viasr #652** (four pre-launch security holes: auth, shutdown, rate limiting,
cost) and **#653** (journal prompt guard, journal output guard, crisis sentinel)
both merged on 2026-09-02. Both are genuinely useful. Neither is this.

Measured on `origin/staging`, `origin/production` and `HEAD` after those merged:

```
files matching "medication"                                          0
grep -lniE "taper|come off|stop taking|prescriber|antidepress|lithium|ssri"
  across app/**/*.py                                                 0
grep for medication_(detect|classif|guard)|MedicationDetector        0
open PRs mentioning medication                                       0
```

So the gap is exactly as originally described and nothing above is superseded.

### Why it is worth doing even though the letter no longer depends on it

The original brief said an investor letter would claim the guardrail exists.
That claim was removed: the published letter now says only *"If you are on
medication, stay on it and talk to your prescriber before you change anything"*,
which is policy and advice, true regardless of the code. **So this is no longer
blocking anything, and it is not urgent.**

It is still worth building, for the reason the codebase already accepts
elsewhere: `app/services/crisis_detection/detector.py:507-509` states plainly
that prompt-following is not a safety guarantee, which is why the crisis path is
a deterministic classifier with a hardcoded response and no LLM in the loop.
Medication questions carry comparable stakes (benzodiazepine withdrawal can
cause seizures and death; lithium discontinuation is associated with a large
increase in suicidal acts) and currently have nothing but prompt text.

### What changed about the integration point

`#653` has now merged, which means the collision warning in the original brief
is **resolved**: `app/services/prompt_guards.py` and
`app/services/murror_chat/chat.py` are no longer claimed by an open PR. Rebase
on current `staging` and wire the entrypoints directly rather than deferring.

Everything else in this brief stands as written.
