# Murror Company Progress — Horizon Redesign

**Date:** 2026-07-23  
**Status:** Approved by Astro  
**Scope:** Milestone 1 clickable prototype

## Decision

Replace the prototype's Company Map and Living Mission Map with one primary
**Progress** destination and a simpler **Mission Progress** detail. Preserve the
dark macOS shell and dark conversation surfaces. Use a luminous gradient
Horizon and a warm editorial sheet for work orientation.

This decision supersedes only the constellation and dependency-map portions of
the earlier Company Memory design. Channels, DMs, Today, Work Sessions, Context
Refill, Outcome Review, and human-verified Company Memory remain intact.

## Product job

For Murror's small AI-native team, Progress must answer in under 60 seconds:

1. What has not started?
2. What is moving?
3. What is nearly finished?
4. What is done and human-checked?
5. What needs my attention now?

The everyday experience should feel like reading the company's weather, not
operating project-management software.

## Information architecture

```text
Today
Inbox

Direct messages
Channels

Work
  Progress
  Company Memory
  Agents
```

**Progress** replaces Company Map and the separate Missions destination.
Command-K may still open any Mission directly.

## Four-stage model

| Display name | Literal meaning | Entry rule |
|---|---|---|
| Up next | Not started | An agreed outcome exists; work has not begun. |
| In motion | Work has begun | A person or agent is actively moving it. |
| Almost there | Needs a final step | A result exists and needs review, approval, validation, or one answer. |
| Done | Finished and checked | A person accepted the result and its evidence. |

Blockers remain conditions, not extra stages:

- Needs a little help
- Ready for you
- Waiting on…
- Paused for now
- Needs an update

Only human acceptance moves work to Done. An agent may propose Almost there but
cannot declare completion.

## Progress overview

```text
┌─ dark navigation ─┬─ warm editorial progress sheet ────────────────┐
│ Today             │ ╭──── Murror Horizon ───────────────────────╮ │
│ Inbox             │ │ TODAY AT MURROR                           │ │
│ DMs               │ │ 3 things moving                          │ │
│ Channels          │ │ 2 are ready for you · updated now        │ │
│                   │ ╰───────────────────────────────────────────╯ │
│ Progress          │                                               │
│ Company Memory    │ UP NEXT  IN MOTION  ALMOST THERE  DONE        │
│ Agents            │    2         3            2         5         │
│                   │ ━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                   │                                               │
│                   │ Company Memory prototype                      │
│                   │ Ready for Astro's final review                │
│                   │ ○────○────●────○      Mona + Claude           │
└───────────────────┴───────────────────────────────────────────────┘
```

The page is a **progress ledger**, not a draggable board. A four-part summary
rail makes the whole company scannable. Mission rows are ordered by attention,
then stage freshness.

Each row shows only:

- outcome name;
- one plain-language next move;
- current stage and four-step rail;
- one accountable human and any collaborating agents;
- one attention condition;
- last meaningful change.

Percentages, dependency lines, zoom controls, raw logs, token counts, source
counts, MCP vocabulary, and productivity scoring do not appear on the overview.

## Mission Progress detail

Selecting a Mission opens a calm detail surface containing:

1. The outcome
2. What is happening now
3. What happens next
4. What needs help
5. People and agents involved
6. Accepted decisions and results
7. Recent meaningful changes

Technical evidence is progressively disclosed through a secondary **How we
know** drawer. It contains sources, permissions, Context Capsule versions,
costs, artifacts, and structured agent activity.

## Visual system

### Surfaces

- **Night Studio — `#171719`:** title bar, navigation, conversations
- **Night Lift — `#222226`:** selected navigation and dark controls
- **Daylight Sheet — `#F1F0ED`:** Progress and Mission Progress
- **Paper Lift — `#FAF9F6`:** mission rows and detail cards
- **Editorial Ink — `#19191B`:** primary text on light surfaces
- **Quiet Graphite — `#6E6D70`:** secondary text

### Murror Horizon

The Horizon is one soft blurred field built from:

- Powder blue — `#B9D8F4`
- Lavender — `#C8C5F3`
- Coral — `#FF8968`
- Sun amber — `#FFD66F`
- Pale cyan haze — `#C9F2EA`

The gradient is the signature, not a status score. It appears as one large
header and as very small, low-contrast blooms at the edge of selected items.
Text never sits on a busy part of the gradient.

### Typography

- Character display: Avenir Next, used for the Horizon statement and major count
- Body and navigation: SF Pro / system sans
- Utility: SF Mono, used only for dates, stage markers, and small labels

Mono typography never carries paragraphs or primary navigation because that
would make the interface feel technical.

## Before, during, and after

### Before

Today shows the compact four-stage rail and how many items are ready for the
viewer. Opening Progress restores the previous scroll position and selected
Mission when useful, but starts at the company overview after a long absence.

### During

There is no panning, zooming, dragging, or connector interpretation. Selecting
a row opens Mission Progress. One primary next action is visible at a time.
Agent work uses human copy such as “Claude is helping” and “Ready for you.”

### After

When a Mission advances, its marker softly moves along the rail and a plain
confirmation names the new stage. Reduced Motion uses a fade. Done work remains
in the overview for seven days, then moves into searchable history. On return,
the Horizon says how many meaningful items moved while the teammate was away.

## Accessibility and calm

- Every stage uses position, label, and symbol; color is never the only cue.
- Light surfaces meet contrast requirements without placing text over gradients.
- All Progress interactions work by keyboard.
- Reduced Motion removes drifting gradients and positional animation.
- No ranking, overdue shame, streak, confetti, productivity score, or individual
  performance comparison appears.

## Prototype acceptance

- Astro can identify Up next, In motion, Almost there, Done, and Ready for you
  items in under 30 seconds.
- The full agent flow still moves a Mission from In motion through Almost there
  to Done after human acceptance.
- The Progress overview contains no floating nodes, connectors, pan, or zoom.
- The dark conversation experience remains coherent with the light Progress
  experience.
- The visual identity is recognizable from the Horizon alone.
