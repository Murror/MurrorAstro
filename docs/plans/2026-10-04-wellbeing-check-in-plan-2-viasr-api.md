# Wellbeing check-in, Plan 2 of 4: viasr-api stops relying on PHQ-9

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The AI stops claiming the app runs PHQ-9/GAD-7 tests, and stops guessing a GAD-7/PHQ-9 score from conversations and feeding it back into every chat.

**Architecture:** Two small, independent changes in viasr-api:
- the app-features entry in the local chat prompt `app/prompts/conversation_chat.yaml` (loaded locally first by `aread_prompt`);
- `UserPersonaWithProfile.get_attributes()`, the single function every chat-side reader uses to dump the persona into a prompt, plus the persona-extraction task that writes the guess.

No database change. The `current_status` column stays, but is no longer written or read into prompts.

**Tech Stack:** Python 3.11, FastAPI, Pydantic, pytest (asyncio_mode=auto), ruff, poetry.

**Spec:** `Murror-docs/docs/plans/2026-10-04-wellbeing-check-in-design.md`, section 6.4. Read this plan's "Scope change" first.

## Scope change from the spec (evidence, 2026-10-04)

Spec 6.4 asked for "notification tone from the latest MURROR_WB band". **Dropped.** Read on origin/staging (aad09c06):
- The scheduled notification path (`app/tasks/notification/load_and_schedule_notifications.py`) only runs when `NOTIFICATION_SCHEDULING_ENABLED` is set, and nothing in the repo sets it.
- `phq9_score` is hard-coded to 0 there (~line 496), and is sent as "Not found".
- The LLM's message is discarded (`message=None`). Every push reads "You have something new in Murror."
- `POST /notification/decide` has no callers.

Building a band-to-level mapping would be work on dead code. If notifications are revived, that work owns the question.

## Global Constraints

- **Branch and PR:** worktree `prod/wt-wellbeing-viasr`, branch `feat/retire-phq-from-ai`, cut from `origin/staging` at aad09c06. The PR targets `staging`.
  - PROD is the `production` branch and is deployed by dispatch only. `main` is ALPHA.
  - A merge to `staging` runs CI (lint, pytest, image build, deploy to staging) on ubuntu.
  - A PR without the `run-ci` label runs nothing.
- **Copy:** no em dashes; English; non-diagnostic. The compassion-review skill applies to `conversation_chat.yaml`.
- **Commits:** Conventional Commits, lowercase type. End with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Gate:**
  - `poetry run ruff check app tests` and `poetry run ruff format --check` on the touched files;
  - the targeted pytest files listed per task;
  - then the full `poetry run pytest -q`, compared against an origin/staging baseline run in the same worktree.
- **No change to `murror-resources`.** The GitHub-hosted `user_persona.yaml` still tells the model to return `current_status`. After this plan, that output is ignored. Editing that repo is a separate, optional cleanup.

## Review Focus

1. **A persona with a `current_status` value already stored.** The value must not appear in ANY prompt built via `get_attributes()`: stream chat, deep conversation, care tips, relationship prompts. Pinned in Task 2.
2. **The LLM still returns `current_status`**, because the GitHub prompt asks for it. The value must not be written back. Pinned in Task 2.
3. **The persona-extraction prompt sent to the LLM** must not ask for GAD7/PHQ9: neither the schema it embeds, nor the "current persona" summary. Pinned in Task 2.
4. **The chat prompt still describes the Reflection tab check-in accurately under BOTH switch settings.** It names no instrument and makes no diagnosis claim. Pinned in Task 1.
5. **Other persona fields keep flowing unchanged** (moods, needs, issues, preferred_name). Pinned in Task 2.

---

### Task 1: Chat prompt describes the check-in truthfully

**Files:**
- Modify: `app/prompts/conversation_chat.yaml` (the two entries at ~lines 98-103)
- Test: `tests/prompts/test_conversation_chat_check_in_copy.py` (new)

- [ ] **Step 1: Write the failing test**

```python
# tests/prompts/test_conversation_chat_check_in_copy.py
from pathlib import Path

PROMPT = Path(__file__).resolve().parents[2] / "app" / "prompts" / "conversation_chat.yaml"


def _text() -> str:
    return PROMPT.read_text(encoding="utf-8")


def test_chat_prompt_names_no_clinical_instrument():
    text = _text().lower()
    for banned in ("phq", "gad-7", "gad7", "depression and anxiety levels"):
        assert banned not in text, banned


def test_chat_prompt_still_describes_the_two_week_check_in():
    text = _text()
    assert "**Two-week check-in** (Reflection tab)" in text
    assert "not a test and not a diagnosis" in text


def test_chat_prompt_has_no_em_dash():
    assert "—" not in _text()
```

- [ ] **Step 2: Run it and verify it fails**

Run: `poetry run pytest -q tests/prompts/test_conversation_chat_check_in_copy.py`
Expected: FAIL. `phq` is present, and the new entry is missing.

- [ ] **Step 3: Replace the two entries**

Replace exactly these lines:

```yaml
  - **Mental State** (Reflection tab)
    Description: Track your depression and anxiety levels through PHQ-9 & GAD-7 tests every two weeks. The colored bars show how your mental state changes over time.
    How to use it: Open the app > Go to the Homepage > Open Reflection tab > Scroll down to the Mental State
  - **Bi-weekly Checkin Test** (Reflection tab)
    Description: Every two weeks, Murror will ask you to recheck your mental state through PHQ-9 & GAD-7 tests
    How to use it: Open the app > Go to the Homepage > Open Reflection tab > Scroll down to Bi-weekly Checkin Test
```

with:

```yaml
  - **Two-week check-in** (Reflection tab)
    Description: Every two weeks, Murror offers a short check-in about how the past two weeks have been. It is a gentle snapshot, not a test and not a diagnosis, and the Reflection tab shows how things have moved over time.
    How to use it: Open the app > Go to the Homepage > Open Reflection tab > Scroll down to the check-in
```

Keep the surrounding indentation and blank lines byte-identical.

- [ ] **Step 4: Run it and verify it passes**

Same command. Expected: PASS.

- [ ] **Step 5: Compassion review (Claude)**

Claude runs the compassion-review skill on the new entry before committing. The wording is non-diagnostic and names no instrument, so it stays true whether the app shows PHQ/GAD or the new check-in.

- [ ] **Step 6: Commit**

```bash
git add app/prompts/conversation_chat.yaml tests/prompts/test_conversation_chat_check_in_copy.py
git commit -m "fix(prompts): describe the two-week check-in without naming phq-9/gad-7"
```

---

### Task 2: Retire the AI-guessed `current_status`

**Files:**
- Modify: `app/services/user_persona/schema.py` (`get_attributes()` ~line 281)
- Modify: `app/tasks/user_persona/update_from_conversations.py` (~lines 129-131, 212-216, 325-327)
- Test: `tests/services/user_persona/test_current_status_retired.py` (new)

**Interfaces:**
- `get_attributes()` never includes the key `current_status`, whatever the persona holds.
- The persona-extraction system prompt embeds an output schema with no `current_status` property, and no "Current mental health status" line.
- An LLM response that includes `current_status` does not change the stored persona's `current_status`.

- [ ] **Step 1: Write the failing tests**

Use the real models. Build a `UserPersonaWithProfile` the way `tests/services/user_persona/test_profile_schema.py` does: read that file and copy its construction helper. The persona should carry `current_status=14.0` and one ordinary field (for example `moods=["tired"]`).

Find the extraction helpers' real names in `update_from_conversations.py`: the function that formats the current persona (~line 200-216; the existing test `test_format_current_persona_for_llm` calls it), the function that builds the system prompt (~line 125-131), and the one that merges insights into the persona (~line 300-330). Tests:

```python
# tests/services/user_persona/test_current_status_retired.py
def test_get_attributes_never_returns_current_status():
    persona = _persona_with(current_status=14.0, moods=["tired"])
    attrs = persona.get_attributes()
    assert "current_status" not in attrs
    assert attrs.get("moods") == ["tired"]  # other fields still flow


def test_extraction_context_has_no_mental_health_score():
    text = format_current_persona_for_llm(_persona_model(current_status=14.0, moods=["tired"]))
    assert "mental health status" not in text.lower()
    assert "14" not in text


def test_extraction_schema_sent_to_llm_does_not_ask_for_current_status():
    schema = persona_output_schema_for_llm()
    assert "current_status" not in schema.get("properties", {})
    assert "GAD7" not in str(schema) and "PHQ9" not in str(schema)


def test_llm_returned_current_status_is_not_written_back():
    current = _persona_model(current_status=None, moods=["tired"])
    insights = _persona_model(current_status=21.0, moods=["tired", "hopeful"])
    merged = merge_insights(current, insights)
    assert merged.current_status is None
    assert "hopeful" in (merged.moods or [])  # ordinary merge still works
```

Adapt `format_current_persona_for_llm` and `merge_insights` to the real function names and signatures. If the merge logic is inline in a larger async function, extract the `current_status` decision into a small pure helper. Do not restructure anything else. `persona_output_schema_for_llm()` is NEW: it returns `UserPersona.model_json_schema()` with `current_status` removed from `properties`, and also from `required` if it is listed there.

Also update the existing `tests/test_update_from_conversations.py::test_format_current_persona_for_llm`, which asserts the status string. Its expectation encoded the PHQ guess, so change the assertion to expect NO status line. Name the change in the commit body.

- [ ] **Step 2: Run them and verify they fail**

Run: `poetry run pytest -q tests/services/user_persona/test_current_status_retired.py tests/test_update_from_conversations.py`
Expected: FAIL. The attribute is present, the status line is present, and the schema property is present.

- [ ] **Step 3: Implement**

1. In `get_attributes()`, after the persona fields are merged in, `attributes.pop("current_status", None)`. Add a comment:

```python
# current_status held an LLM guess of a GAD-7/PHQ-9 score. Retired 2026-10-04:
# never put it in a prompt. The column remains; nothing writes it any more.
```

2. Add `persona_output_schema_for_llm()` next to the prompt builder in `update_from_conversations.py`, and use it in place of `UserPersona.model_json_schema()` at ~line 130.
3. Delete the "Current mental health status" block (~lines 212-216).
4. Delete the write-back (~lines 325-327), or route it through the pure helper that always keeps the stored value as it is. Do not write the LLM value.

- [ ] **Step 4: Run them and verify they pass, plus every persona reader's tests**

```
poetry run pytest -q tests/services/user_persona tests/test_update_from_conversations.py tests/test_redis_user_persona_cache.py \
  tests/services/care_tips tests/services/deep_chat_stream/test_stream_chat_voice_moments.py \
  tests/prompts/test_demographic_suppression.py tests/api/controller/takeaway/test_emotion_extraction.py
```

Expected: all PASS.

- [ ] **Step 5: Mutate the behaviour**

Each row is a separate mutation. Apply it, confirm the named test dies, then restore.

| Mutation | Test that must fail |
|---|---|
| Remove the `pop` | `test_get_attributes_never_returns_current_status` |
| Restore the write-back | `test_llm_returned_current_status_is_not_written_back` |

- [ ] **Step 6: Commit**

```bash
git add app/services/user_persona/schema.py app/tasks/user_persona/update_from_conversations.py tests
git commit -m "fix(persona): stop guessing a phq-9/gad-7 score and feeding it into chat"
```

---

### Task 3: Gate, PR, staging, spec note

- [ ] **Step 1:** Run `poetry run ruff check app tests`, then `poetry run ruff format --check` on the touched files.
- [ ] **Step 2:** Run the full `poetry run pytest -q` here, and the same on origin/staging in this worktree before the change (`git stash` is NOT allowed: check out `origin/staging` into a temporary second worktree). Report both totals. The only allowed difference is the new tests.
- [ ] **Step 3:** Prompt evals. Run `poetry run python -m evals.runner`, or the documented subset for chat prompts, if it runs offline or with the configured keys. If it needs secrets, say so and skip. Do not fake it.
- [ ] **Step 4:** Push once. Open a PR to `staging` with no label. After review, merge with squash pinned to the full head SHA. The staging push runs CI and deploys staging.
- [ ] **Step 5:** Verify on staging by effect:
  - the deployed image tag includes the merge sha;
  - start a chat as a staging test account and confirm the system prompt no longer contains "PHQ". Use log-safe evidence, never chat words: for example, a unit-level check in the pod that `aread_prompt_cached("conversation_chat")` has no "PHQ", after the 300 s prompt cache expires.
- [ ] **Step 6:** Add a short note to spec section 6.4 in Murror-docs recording the dropped notification work and the evidence above.
