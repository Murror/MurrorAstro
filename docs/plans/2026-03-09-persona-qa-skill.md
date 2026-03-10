# persona-qa Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `persona-qa` Claude Code skill that stress-tests the Murror product by embodying each of the 5 user personas, walking their defined test scenarios against the codebase, and producing a structured QA report covering flow integrity, speed, animation quality, and emotional value clarity.

**Architecture:** A single `SKILL.md` file placed at `~/.claude/skills/persona-qa/SKILL.md`. When invoked, the skill instructs Claude to run in 3 phases: (1) code-based persona journey analysis for all 5 personas, (2) visual review request for flagged screens, (3) consolidated pass/fail report with product health verdict. The skill is self-contained — no code dependencies, no external tools required.

**Tech Stack:** Claude Code skill (markdown), references `Murror/USER_PERSONAS.md` and `MurrorMobile/src/` source files at runtime.

**Design doc:** `docs/plans/2026-03-09-persona-qa-skill-design.md`

---

## Task 1: Read the writing-skills skill to understand skill authoring conventions

**Why:** Skills have specific structural conventions (trigger descriptions, checklists, process flows) that make them work reliably. We need to match the existing format.

**Files:**
- Read: `~/.claude/skills/writing-skills/SKILL.md`

**Step 1: Read the writing-skills skill**

Run:
```
Read /Users/vinhtran/.claude/skills/writing-skills/SKILL.md
```

**Step 2: Note the key conventions**

Capture:
- How the skill description line is written (used for skill selection)
- Whether a checklist is used and how it's formatted
- How process flows are documented
- How the skill signals its terminal state

---

## Task 2: Create the persona-qa skill directory and SKILL.md

**Why:** This is the core deliverable — the skill file that Claude will load and follow when `/persona-qa` is invoked.

**Files:**
- Create: `~/.claude/skills/persona-qa/SKILL.md`

**Step 1: Create the skill directory**

```bash
mkdir -p /Users/vinhtran/.claude/skills/persona-qa
```

**Step 2: Write the SKILL.md file**

Create `/Users/vinhtran/.claude/skills/persona-qa/SKILL.md` with this exact content:

````markdown
---
name: persona-qa
description: Use when the user wants to stress-test or QA the Murror product using the defined user personas. Triggers on phrases like "run persona QA", "stress test with personas", "QA the product", or "/persona-qa".
---

# Persona QA — Murror Product Stress Test

## What This Skill Does

Stress-tests the Murror mobile app by embodying each of the 5 defined user personas, walking their test scenarios against the current codebase, and producing a structured QA report. Evaluates flow integrity, speed, animation quality, and emotional value clarity — the dimensions that determine whether Murror actually delivers its promise of making users feel seen.

**Announce at start:** "I'm using persona-qa to stress test the Murror product through all 5 personas."

## Checklist

You MUST create a TodoWrite task for each of these and complete them in order:

1. **Read persona definitions** — load `Murror/USER_PERSONAS.md` in full
2. **Phase 1: Maya journey** — embody + walk scenarios + write verdict card
3. **Phase 1: Jaylen journey** — embody + walk scenarios + write verdict card
4. **Phase 1: Ava journey** — embody + walk scenarios + write verdict card
5. **Phase 1: Kai journey** — embody + walk scenarios + write verdict card
6. **Phase 1: Noor journey** — embody + walk scenarios + write verdict card
7. **Phase 2: Request visual review** — list flagged screens with screenshot instructions
8. **Phase 3: Write consolidated report** — pass/fail table, top issues, health verdict

## Core Principle: Embody, Don't Audit

When evaluating as a persona, reason in first person through their emotional lens.

**Wrong:** "Check if home screen renders."
**Right:** "I'm Maya. I just got home from work in Chicago. I feel guilty about not calling my mom. I open Murror. The first thing I see is [X]. Does this feel like a safe place to start that conversation?"

Emotional correctness = functional correctness for Murror. A technically working flow that feels cold or clinical is a ❌.

## The 5 Personas

Load full details from `Murror/USER_PERSONAS.md`. Summary:

| # | Persona | Core Feeling | Key Scenarios to Walk |
|---|---------|-------------|----------------------|
| 1 | Maya, 22 | Guilty about distance from mom | Onboarding → add mom → first reflection → SMS invite → shared insight |
| 2 | Jaylen, 25 | Misses depth in friendships | Onboarding → add 3 friends → solo journal → invite Marcus → shared reflection |
| 3 | Ava, 19 | Anxious, spiraling at 2 AM | Late-night signup → first stream-of-consciousness reflection → GAD-7 → streak |
| 4 | Kai, 24 | Exhausted from being everyone's anchor | Add 3 family members → Family Plan → shared reflection with sister → PHQ-9 |
| 5 | Noor, 21 | Unknown by anyone around her | Skips connections → heavy solo journaling → adds sister → cross-timezone shared reflection |

## Phase 1: Persona Journey Analysis

For each persona, do all of the following:

### Step A: Adopt the persona mindset

Write 2-3 sentences in first person stating:
- Who you are and your current emotional state
- Why you opened Murror right now
- What you're hoping to find or feel

### Step B: Walk the test scenarios

Reference the numbered test scenarios from `USER_PERSONAS.md` for this persona. For each scenario step:
1. Identify which screen/component is involved
2. Read the relevant source file to verify the flow exists
3. Check whether the step leads correctly to the next one

**Key source paths:**
- Navigation: `MurrorMobile/src/common/navigation-controller.tsx`, `tab-controller.tsx`
- Home: `src/screens/main/Home/home-screen.tsx`
- Journal/AddLog: `src/screens/main/Journal/add-log-screen.tsx`
- Connections: `src/screens/main/Diary/relationship-screen.tsx`
- Connection detail: `src/screens/main/Diary/relationship-detail-screen.tsx`
- Reflection/Stats: `src/screens/main/Reflection/reflection-screen.tsx`
- Knowledge/Research: `src/screens/main/knowledge/knowledge-screen.tsx`
- Journey/Diary history: `src/screens/main/Journey/journey-screen.tsx`
- Onboarding flow: `src/screens/onboarding/onboarding-navigation.ts`
- Mental tests: `src/screens/mentalTests/mental-tests-screen.tsx`
- Panic/SOS: `src/screens/panic/panic-screen.tsx`
- Settings: `src/screens/setting/settings-screen.tsx`

### Step C: Evaluate 4 dimensions

For every scenario step, evaluate:

**Flow integrity** — Does this step lead to the next? Dead ends? Missing screens? Navigation gaps?

**Speed** — Unnecessary re-renders? Heavy synchronous calls? Missing loading states? Flag any operation that likely exceeds 300ms without a visible loader.

**Animation quality** — Use these standards:
- Standard transitions (screen → screen): 150–300ms — snappy but intentional
- Emotionally significant moments (takeaway reveal, first shared insight, PHQ-9/GAD-7 results, first connection invite accepted): 400–600ms — slower, deliberate, honor the moment
- No layout shifts during infinite scroll loads (friends list, journal list, articles)
- Loading skeleton states preferred over blank flashes

**Value / clarity** — Would this persona understand what to do next? Does the copy speak to their emotional state? Does this moment deliver Murror's promise ("feel seen, not alone")?

### Step D: Write a Persona Verdict Card

After walking all scenarios, write:

```
## [Name] Verdict

**Overall:** ✅ Passing / ⚠️ Issues Found / ❌ Broken

**Top Issues (max 3):**
1. [Screen/file reference] — [specific issue] — Severity: Critical/High/Medium
2. ...
3. ...

**Moment That Matters:**
The most emotionally important UX moment for this persona is [X]. Currently it [feels right / falls flat / is broken] because [specific observation].
```

## Phase 2: Visual Review Request

After all 5 verdict cards are written:

1. Compile a list of every screen/state flagged as ⚠️ or ❌
2. For each, give specific screenshot instructions:
   - Which screen to navigate to
   - What state to trigger first (e.g., "after adding one connection", "while a reflection is loading")
   - What to look for specifically

**Tell the user:**
> "Phase 1 code analysis is complete. Before I write the final report, I need to visually verify [N] screens. Please provide screenshots or a short screen recording of the following..."

**Wait for the user to provide screenshots before proceeding to Phase 3.**

After receiving screenshots, review each against:
- Animation timing and smoothness (does it match the emotional weight of the moment?)
- Layout correctness (no overflow, proper padding, nothing clipped)
- Copy legibility and emotional tone
- Empty states (do they communicate warmth or feel like an error?)

## Phase 3: Consolidated QA Report

Write the final report in this exact structure:

---

### Murror Persona QA Report — [Date]

#### Pass/Fail Summary

| Persona | Flow | Speed | Animation | Value/Clarity | Overall |
|---------|------|-------|-----------|---------------|---------|
| Maya | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ | ✅/⚠️/❌ |
| Jaylen | | | | | |
| Ava | | | | | |
| Kai | | | | | |
| Noor | | | | | |

#### Top 5 Issues (by user impact)

Rank by how much the issue would damage a real user's experience — not by technical severity.

1. **[Persona] — [Screen] — [Severity]**
   What: [Specific description]
   Why it matters: [Impact on this persona's experience]
   Fix: [Concrete recommendation]

2–5. Same format.

#### Top 3 Moments Working Well

1. **[Persona] — [Screen/Flow]** — [Why this is landing well]
2. ...
3. ...

#### Product Health Verdict

> Murror is [ready / not ready / conditionally ready] for [user type] users as of [date]. [One sentence on primary strength or blocker.]

---

## Issue Ranking Guide

When deciding severity:

| Severity | Definition |
|----------|-----------|
| **Critical** | Flow is broken — user cannot complete this scenario |
| **High** | Flow works but emotionally jarring at a vulnerable moment, or visually broken |
| **Medium** | UX friction — slows user down or causes confusion |
| **Low** | Polish gap — noticeable but doesn't impede the experience |

**Important:** A missing loader on a low-frequency settings screen is Low. A jarring cut-to-black right before a user reads their first shared insight is Critical — even if it's "just" an animation.

## What This Skill Does NOT Do

- Does not run automated tests or execute code
- Does not modify source files
- Does not test backend API behavior (mobile client layer only)
- Does not replace on-device testing — it informs it
````

**Step 3: Verify the file was created**

```bash
ls -la /Users/vinhtran/.claude/skills/persona-qa/
cat /Users/vinhtran/.claude/skills/persona-qa/SKILL.md | head -20
```

Expected: File exists, first lines show the frontmatter and skill name.

---

## Task 3: Verify the skill appears in the skill list

**Why:** The skill system needs to pick up the new skill. We confirm it's discoverable.

**Files:**
- Read: `~/.claude/SKILL.md` (global skill index, if it exists)

**Step 1: Check if there's a global skill registry**

```bash
ls /Users/vinhtran/.claude/skills/
```

Expected: `persona-qa` appears in the list alongside the other skills.

**Step 2: Spot-check the SKILL.md structure**

```bash
wc -l /Users/vinhtran/.claude/skills/persona-qa/SKILL.md
```

Expected: File has > 100 lines (it's a substantial skill document).

---

## Task 4: Do a dry run — invoke the skill mentally against one persona

**Why:** Before shipping, verify the skill instructions are clear enough that Claude would actually follow them correctly without ambiguity.

**Step 1: Read the completed SKILL.md top to bottom**

Read `/Users/vinhtran/.claude/skills/persona-qa/SKILL.md`

**Step 2: Walk through the checklist mentally as if you were executing it**

For Maya (persona 1), simulate:
- Can you identify which source files to read from the paths in the skill?
- Are the verdict card instructions unambiguous?
- Does the visual review request section clearly tell you what to ask for?
- Does the Phase 3 report template have everything needed?

**Step 3: Flag any gaps**

If anything is unclear, vague, or missing — fix it in the SKILL.md before calling this task done.

---

## Task 5: Update MEMORY.md with the new skill

**Why:** Future sessions should know this skill exists and when to use it.

**Files:**
- Modify: `/Users/vinhtran/.claude/projects/-Users-vinhtran-Projects-murror-transfer/memory/MEMORY.md`

**Step 1: Add an entry for the persona-qa skill**

Add under an "Available Skills" or "QA" section:

```markdown
## Available Project Skills

- **persona-qa** — Stress tests the Murror product through all 5 personas (Maya, Jaylen, Ava, Kai, Noor). Evaluates flow, speed, animation, and value clarity. Run before any major release or after significant UX changes. Invoke with `/persona-qa`.
```

---

## Task 6: Commit

**Step 1: Stage files**

```bash
cd /Users/vinhtran/Projects/murror-transfer/Murror
git add docs/plans/2026-03-09-persona-qa-skill-design.md
git add docs/plans/2026-03-09-persona-qa-skill.md
```

Note: The skill file itself (`~/.claude/skills/persona-qa/SKILL.md`) lives outside the repo — no need to commit it.

**Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: add persona-qa skill design and implementation plan

Adds design doc and implementation plan for the persona-qa Claude Code
skill. The skill stress-tests Murror through all 5 user personas
(Maya, Jaylen, Ava, Kai, Noor), evaluating flow integrity, speed,
animation quality, and emotional value clarity across all key flows.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Notes

- The skill lives at `~/.claude/skills/persona-qa/SKILL.md` — global, not project-scoped
- Persona definitions are read fresh from `Murror/USER_PERSONAS.md` at runtime — no need to copy them into the skill
- If USER_PERSONAS.md is updated with new personas, the skill automatically picks them up (it references the file, not a copy)
- The visual review (Phase 2) is intentionally a pause point — do not skip it or make it optional
