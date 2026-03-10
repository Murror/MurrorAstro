# Design: `persona-qa` Skill

**Date:** 2026-03-09
**Status:** Approved
**Author:** Vinh Tran (via brainstorming session)

---

## What We're Building

A Claude Code skill named `persona-qa` that stress-tests the Murror product by embodying each of the 5 defined user personas. It walks their test scenarios against the current codebase, evaluates flow integrity, speed, animation quality, and emotional value clarity — then requests a visual review and outputs a consolidated QA report.

**Primary goal:** Catch UX, performance, and value communication issues before they reach users. Ensure Murror feels smooth, fast, and emotionally resonant for each persona type.

---

## Skill Identity

| Property | Value |
|----------|-------|
| Name | `persona-qa` |
| Location | `~/.claude/skills/persona-qa/` (global skill) |
| Trigger phrases | `/persona-qa`, "run persona QA", "stress test with personas", "QA the product" |
| Scope | Runs all 5 personas every time (no scoping by persona) |
| Input | Source code (automatic) + screenshots/recording (user-provided in Phase 2) |
| Output | Consolidated QA report with pass/fail table, top issues, and product health verdict |

---

## Personas Covered

All 5 personas defined in `Murror/USER_PERSONAS.md`:

| # | Persona | Core Loneliness | Key Features Tested |
|---|---------|----------------|---------------------|
| 1 | Maya, 22 — Long-Distance Daughter | Parent-child distance | Shared reflections, SMS invite, Family Plan |
| 2 | Jaylen, 25 — Disconnected Friend | Fading friendships | Shared reflections, Moments to Care, Research tab |
| 3 | Ava, 19 — Anxious Partner | Unseen in relationship | Solo journal, GAD-7, Streak |
| 4 | Kai, 24 — Family Peacemaker | Caretaker invisibility | Family Plan, PHQ-9, Shared reflections |
| 5 | Noor, 21 — Invisible Roommate | Cultural displacement | Solo journal, SMS Reflection, Research tab |

---

## Skill Structure: 3 Phases

### Phase 1 — Persona Journey Analysis (Code-based)

For each persona in order (Maya → Jaylen → Ava → Kai → Noor), Claude:

**Step 1: Adopt the persona mindset**
State who they are, their emotional state, and why they opened the app right now. Example: *"I'm Maya. I just got back from work in Chicago. I haven't called my mom in 2 weeks and I feel guilty. I'm opening Murror because I don't know how to start that conversation."*

**Step 2: Walk each test scenario**
Reference the numbered test scenarios from `USER_PERSONAS.md`. For each step, read the relevant source file to verify the flow exists and behaves as expected. Follow the navigation logic in the codebase — don't assume.

**Step 3: Evaluate 4 dimensions per scenario**

| Dimension | What to Check |
|-----------|---------------|
| **Flow integrity** | Does this step lead to the next? Are there dead ends, missing screens, broken navigation paths? |
| **Speed** | Unnecessary re-renders? Heavy synchronous calls? Missing loading states for operations > 300ms? |
| **Animation quality** | Are transitions present and appropriate (150–300ms standard, 400–600ms for emotionally significant moments)? Layout shifts during list loads? |
| **Value / clarity** | Would this persona understand what to do? Does the copy speak to their emotional state? Does this moment deliver Murror's core promise ("feel seen")? |

**Step 4: Write a Persona Verdict Card**
- Overall status: ✅ Passing / ⚠️ Issues / ❌ Broken
- Top issues found (max 3, specific with file/screen references)
- One "moment that matters" — the most emotionally important UX moment for this persona and whether it's landing

---

### Phase 2 — Visual Review Request

After all 5 persona analyses, Claude:
1. Lists all screens/states flagged as ⚠️ or ❌ during code analysis
2. Gives specific screenshot instructions per screen (which state to capture, which interaction to perform first)
3. Waits for user to provide screenshots or screen recording
4. Reviews visuals against persona expectations (animation, layout, copy legibility, emotional tone of design)

**The visual review is not optional.** The skill explicitly pauses and waits before producing the final report.

---

### Phase 3 — Consolidated Report

Final structured output:

**1. 5-Persona Pass/Fail Table**

| Persona | Flow | Speed | Animation | Value/Clarity | Overall |
|---------|------|-------|-----------|---------------|---------|
| Maya | ✅/⚠️/❌ | ... | ... | ... | ... |
| Jaylen | ... | ... | ... | ... | ... |
| Ava | ... | ... | ... | ... | ... |
| Kai | ... | ... | ... | ... | ... |
| Noor | ... | ... | ... | ... | ... |

**2. Top 5 Issues** — ranked by user impact (persona + screen + severity + recommendation)

**3. Top 3 Moments Working Well** — positive signal; what's resonating

**4. Product Health Verdict** — one-line summary:
> *"Murror is [ready / not ready / conditionally ready] for [persona type] users as of [date]. Primary blocker: [X]."*

---

## Key Principles Baked Into the Skill

### 1. Embody, don't just audit
When evaluating as Maya, Claude reasons in first person through her emotional lens. Not: "check if home screen renders." But: "Maya opens the app at 9 PM, feeling guilty. The first thing she sees is [X]. Does that feel like a safe space to start?"

### 2. Emotional weight = functional weight
A flow that works technically but feels cold or clinical for a persona in a vulnerable moment is a ❌. Murror's product value lives in emotional resonance. Correct is not enough — it must feel right.

### 3. Animation standards
- **Standard transitions:** 150–300ms (snappy but intentional)
- **Emotionally significant moments** (takeaway reveal, first shared insight, PHQ-9 results, first connection invite acceptance): 400–600ms (slower, more deliberate — honor the moment)
- **Loading states:** Required for any operation > 300ms
- **No layout shifts** during infinite scroll loads

### 4. Issue ranking = persona impact, not technical severity
A missing loader on a low-frequency admin screen is low priority. A jarring transition right before a user reads their first shared insight is critical — even if it's "just" CSS.

### 5. Visual review is non-negotiable
Code analysis catches logic and performance issues. Visual review catches the actual experience. Both are required for a complete report.

---

## Source Files the Skill Reads

| Area | Files |
|------|-------|
| Personas | `Murror/USER_PERSONAS.md` |
| Navigation | `MurrorMobile/src/common/navigation-controller.tsx`, `tab-controller.tsx`, `navigation.tsx` |
| Core screens | `screens/main/Home/home-screen.tsx`, `screens/main/Journal/add-log-screen.tsx`, `screens/main/Diary/relationship-screen.tsx`, `screens/main/Reflection/reflection-screen.tsx`, `screens/main/knowledge/knowledge-screen.tsx`, `screens/main/Journey/journey-screen.tsx` |
| Shared reflection flows | `screens/main/Diary/relationship-detail-screen.tsx` |
| Onboarding | `screens/onboarding/onboarding-navigation.ts` |
| Mental tests | `screens/mentalTests/mental-tests-screen.tsx` |
| Panic mode | `screens/panic/panic-screen.tsx` |

---

## What This Skill Does NOT Do

- Does not run automated tests or execute code
- Does not modify any source files
- Does not replace manual device testing — it informs it
- Does not test backend API behavior (only the mobile client layer)

---

## Success Criteria

The skill is working correctly if:
1. Each persona verdict card includes a specific file reference for every issue flagged
2. The visual review request lists concrete screenshots to take (not vague)
3. The final report gives a clear, actionable top-5 issue list with enough context to fix without additional investigation
4. The product health verdict is a single sentence any stakeholder can understand
