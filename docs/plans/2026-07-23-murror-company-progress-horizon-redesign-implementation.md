# Murror Company Progress — Horizon Prototype Implementation

**Goal:** Redesign the existing Milestone 1 prototype so company work is
understood through a simple four-stage Progress Ledger with a distinctive
Murror Horizon visual identity.

**Architecture:** Continue the dependency-free HTML/CSS/JavaScript prototype.
Preserve channels, DMs, Work Sessions, context refill, outcome review, Company
Memory, lifecycle states, keyboard behavior, and current state model. Replace
only map-oriented navigation and renderers.

**Working directory:**
`/Users/astro/Projects/murror-transfer/Murror/worktrees/company-memory-macos-prototype`

## Task 1: Replace map information architecture with Progress

**Files:**

- Modify: `prototypes/company-memory-macos/index.html`
- Modify: `prototypes/company-memory-macos/app.js`
- Modify: `prototypes/company-memory-macos/README.md`

**Steps:**

1. Rename Company Map to Progress in the sidebar and command palette.
2. Remove the redundant Missions navigation item.
3. Replace `renderCompanyMap` with a Company Progress overview containing:
   - Horizon summary;
   - four stage counts;
   - four-stage company rail;
   - sparse Mission ledger rows;
   - Ready for you priority.
4. Replace `renderMissionMap` with Mission Progress detail containing:
   - outcome;
   - present stage;
   - now, next, and help sections;
   - people and agents;
   - How we know progressive disclosure.
5. Update routes and navigation helpers while retaining internal screen keys
   where changing them would add unnecessary risk.
6. Update walkthrough documentation.

**Verification:** Navigation reaches Progress, Mission selection reaches Mission
Progress, and no primary Progress surface contains pan, zoom, or floating nodes.

## Task 2: Install the Murror Horizon visual system

**Files:**

- Modify: `prototypes/company-memory-macos/styles.css`
- Modify: `prototypes/company-memory-macos/app.js`

**Steps:**

1. Add Night Studio, Daylight Sheet, Paper Lift, Editorial Ink, and Horizon
   tokens without disturbing dark conversation surfaces.
2. Build the Horizon header using layered CSS gradients and restrained motion.
3. Style the four-stage summary rail, stage markers, Mission rows, attention
   conditions, avatars, and Mission Progress detail.
4. Collapse the technical inspector by default on Progress surfaces and provide
   useful plain-language context instead.
5. Add responsive 2-column and 1-column behavior without sideways panning.
6. Ensure Reduced Motion produces static gradients and fades.

**Verification:** Capture Today, Progress, Mission Progress, and Work Session
screens at 1512×982. Confirm legibility, contrast, hierarchy, and no clipping.

## Task 3: Connect lifecycle state to the four-stage model

**Files:**

- Modify: `prototypes/company-memory-macos/app.js`
- Modify: `prototypes/company-memory-macos/prototype-contract.test.mjs`

**Steps:**

1. Derive the active Mission stage from the existing Work Session state:
   - idle → Up next;
   - needs context or paused → In motion;
   - review → Almost there;
   - completed after human acceptance → Done.
2. Use plain-language conditions such as Needs a little help, Ready for you,
   Paused for now, and Checked.
3. Keep agent permissions, source exclusions, and Company Memory verification
   unchanged in their detailed flows.
4. Update contract tests to require Company Progress, Mission Progress, the four
   stages, Horizon tokens, and the absence of map controls.
5. Run syntax, contract, and diff checks.
6. Replay the complete browser walkthrough and confirm Mission Progress and
   Company Memory synchronize after human acceptance.

**Verification commands:**

```bash
node --check prototypes/company-memory-macos/app.js
node --test prototypes/company-memory-macos/prototype-contract.test.mjs
git diff --check
```

## Commit

After all three tasks and browser verification:

```bash
git add prototypes/company-memory-macos
git -c commit.gpgsign=false commit -m "prototype: redesign company progress with Murror Horizon"
```

Then report the checkpoint and wait for Astro's feedback before proceeding to
native SwiftUI implementation.
