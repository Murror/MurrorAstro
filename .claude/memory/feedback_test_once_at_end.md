---
name: Test once at end of multi-task sprint, not iteratively
description: When working a multi-fix sprint, finish ALL tasks before asking Astro to test on TestFlight. Don't ship intermediate TF builds for each fix.
type: feedback
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
**Rule:** When executing a multi-task fix sprint, **complete ALL tasks** (backend + mobile + infra) **before** asking Astro to test on TestFlight. Build ONE TestFlight build at the end with everything bundled, not multiple intermediate builds.

**Why:** Astro called this out 2026-05-06 during the launch sprint. Each TF cycle costs him real attention (force-quit, install, test, screenshot, report). Iterative testing across many small fixes wastes his time when most of those fixes can't be validated independently anyway (they compound). He'd rather wait for the full set to land and test the whole package once.

**How to apply:**
- For multi-task sprints (3+ fixes), batch ALL changes into one TF build cycle.
- Backend / infra changes can ship continuously (CI deploys in ~7 min, no Astro action needed).
- Mobile changes accumulate in a single branch and produce ONE TF build at the end.
- When dispatching parallel agents, include "stage all changes, do not push" so I can synthesize + commit when ready.
- Tell Astro "ready to test" only when:
  1. All backend deploys are live + healthy
  2. The TF build is uploaded AND processed by ASC
  3. Astro can install + test in one session
- Exception: if a SHIP-BLOCKER bug is discovered mid-sprint that blocks all further testing (like the Anthropic API trailing-whitespace bug), get that fix in flight immediately. But don't ask Astro to test until the rest is also done.
