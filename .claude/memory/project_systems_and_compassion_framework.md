---
name: Systems Thinking + Compassion + Habit Design Framework
description: Applied insights from 3 books (Meadows, TNH, Clear) to Murror — AI prompt engineering DONE, skills created, principles documented. Crisis detection gap found.
type: project
---

## Status: Compassion Framework IMPLEMENTED (2026-04-07)

### What Was Done
- Read 3 books cover-to-cover: *Thinking in Systems* (Meadows), *Happiness* (TNH), *Atomic Habits* (Clear)
- Created 4 reference documents in `/Users/astro/Murror/mac-migration-20260326/`:
  - `SYSTEMS_MAP.md` — Murror mapped as stocks/flows/feedback loops/leverage points
  - `COMPASSION_GUIDELINES.md` — TNH's 10 principles → concrete AI behavior rules
  - `PROMPT_INTEGRATION_GUIDE.md` — Exact changes for 6 viasr-api prompt files
  - `MURROR_PRINCIPLES.md` — Unified 10 operating principles from all 3 books
- Created 3 skills: `/compassion-review`, `/systems-analysis`, `/habit-design`
- **Implemented prompt changes** across 6 files (PR #352, merged to develop):
  1. `conversation_chat.yaml` — `<compassion_framework>` block (+41 lines)
  2. `ai_personality_prompt.py` — `###Compassion Depth` for all 5 personalities (+41 lines)
  3. `multi_agent_prompt.yaml` — Compassion for 4 agents: EmpatheticListener, MoodBooster, MindfulnessGuide, CognitiveReframer (+30 lines)
  4. `journal/prompt.py` — Compassion principles for summary generation (+7 lines)
  5. `journal_analysis/prompts.py` — Gentler proposals/insights/perspectives (+23 lines)
  6. `conversation_wrapup.yaml` — Present-moment closing (+2 lines)
- Deployed to alpha via kubectl (image tag `0.73.0-alpha`)
- Fixed eval client: added retry with backoff for 429 rate limiting

### What Was Found
- **CRITICAL: Crisis detection gap** — `/chat/stream` does not include crisis hotline resources when receiving suicidal ideation. Pre-existing issue, NOT caused by compassion changes. Tracked separately in `incident_crisis_detection_gap.md`.

### Three Pillars (Quick Reference)

**Thinking in Systems (Meadows):**
- Growth engine: journal → insight → trust → more journaling (reinforce this)
- Churn spiral: skip → stale data → generic AI → distrust (add balancing loops)
- Highest leverage: paradigm ("loneliness dissolves through self-understanding")
- Avoid: dependency trap, drift to low performance, seeking wrong goal

**Happiness (TNH):**
- Deep Listening: acknowledge before advising
- Loving Speech: warm, non-clinical, never label
- Present Moment: ground in now
- Embracing Emotions: never rush, emotions are visitors
- Watering Seeds: celebrate growth, not just pain
- Build Capacity: "that insight came from you"

**Atomic Habits (Clear):**
- 4 Laws: Make it Obvious, Attractive, Easy, Satisfying
- Identity > outcomes: "become someone who understands themselves"
- Two-Minute Rule: ultra-low-friction entry points
- Never Miss Twice: welcome back, don't guilt
- Habit Stacking: tie journaling to existing routines

### How to Apply
- **Editing AI prompts?** → Run `/compassion-review` skill
- **Designing features?** → Run `/systems-analysis` then `/habit-design` skills
- **Evaluating product decisions?** → Reference `MURROR_PRINCIPLES.md`
- **After any AI change?** → Run eval harness (fix crisis detection first)
