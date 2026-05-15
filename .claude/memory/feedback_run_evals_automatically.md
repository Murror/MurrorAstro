---
name: Run AI evals automatically when relevant
description: Automatically run the viasr-api eval harness after changes to prompts, AI logic, emotion detection, or chat behavior
type: feedback
---

Run the eval harness (`python -m evals.runner`) automatically during sessions when AI-related code changes are made.

**When to run:**
- After modifying any prompt template or system prompt in viasr-api
- After changing emotion detection logic
- After changing chat streaming, journal generation, or dive-deeper code
- After changing LLM routing/fallback logic in `general_llm_request.py`
- Before deploying viasr-api to staging or production
- After updating Claude/OpenAI model versions

**How to run:**
- Location: `cd /Users/astro/Projects/murror-transfer/Murror/viasr-api`
- Full suite: `poetry run python -m evals.runner`
- Quick check on specific suite: `poetry run python -m evals.runner --suite <suite_name> --trials 2`
- Requires viasr-api running locally or port-forwarded

**Why:** Astro requested this. The Anthropic evals article showed that reactive debugging (fixing one thing while breaking another) was exactly the pattern from the deep chat pipeline sprint. Running evals proactively catches regressions before they hit users.

**How to apply:** Don't ask — just run the relevant eval suite after making AI changes. Report results in the summary. If a suite fails, fix before declaring done.
