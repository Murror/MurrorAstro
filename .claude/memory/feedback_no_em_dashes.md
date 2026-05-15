---
name: Never use em dashes in app copy or AI-generated content
description: All written content (locale files, prompts, AI-generated text) must never use em dashes
type: feedback
---

**RULE:** Never use em dashes (—) in any content — neither hand-written copy nor AI-generated content. Always use commas, periods, or restructure the sentence.

**Why:** Astro's style preference for cleaner, more accessible text. Em dashes can feel academic or heavy in a wellness app context.

**How to apply:**

1. **Hand-written copy** (locale files: en.json, vi.json, ja.json, UI strings) — use commas or restructure
2. **AI generation prompts** — every prompt that asks an LLM to generate user-facing text MUST include an explicit instruction: `"Never use em dashes (—). Use commas or restructure the sentence instead."`
3. **Audit existing prompts** — when touching any prompt file, check that the no-em-dash rule is present

**Affected files (audit list):**
- `viasr-api/app/services/instant_reflection/prompt.py`
- `viasr-api/app/services/takeaway/prompt.py`
- `viasr-api/app/prompts/*.yaml` (all of them)
- `viasr-api/app/services/relationship/*` prompts
- Any future AI prompt files
