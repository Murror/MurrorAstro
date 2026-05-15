---
name: Agent code review BEFORE every high-cost deploy cycle
description: Always dispatch parallel domain agents to QA the diff before any high-cost deploy cycle (TF build, prod promotion). Catches bugs at code-review time, not at user-facing-test time, saving 25-min+ round trips.
type: feedback
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
**Rule:** Before any high-cost deploy cycle — TestFlight build, production promotion, prod deploy, or any irreversible change — dispatch parallel domain-specialist review agents to QA the diff. Apply their findings BEFORE the cycle starts. The deploy round-trip is too expensive to use as the first feedback loop.

**Why:** During the 2026-05-03/04 SSE streaming sprint we burned multiple TF cycles on bugs that domain agents would have caught at code-review time:
- TF 203: `response.body = null` on RN fetch — `iris` would have flagged "RN's fetch doesn't stream response bodies, use XHR" the moment it saw the fetch+ReadableStream pattern. Cost: 1 wasted TF cycle (~25 min) + 1 round of "something went wrong" debugging on Astro's iPhone.
- TF 204: gradient broken because streaming bubble mounts in `instant` mode and never replays after `isAnimating` flips. `iris`/`sentinel` would have flagged the lifecycle mismatch. Cost: 1 wasted TF cycle + screenshot debugging.
- TF 205: **First time we ran the agent review gate.** Both `iris` and `sentinel` independently confirmed the diff was safe to ship in ~5 min total. Validated the workflow saves time AND increases confidence at the same time.

Each TF cycle = 25-35 min wall-clock (archive + upload + ASC processing + install + test). Each prod promotion = irreversible. Five min of agent review beats one wasted cycle every time.

This compounds the mobile-first speed rule (`feedback_mobile_first_speed.md`): the simulator hides device-specific bugs, so we can't trust simulator either. Agent review fills the gap between "type-checks and builds" and "ships clean on iPhone / clean to prod."

**How to apply:**

1. **Trigger conditions (when the gate fires):**
   - Pre-TF build (always, except for trivial changes — see exemptions below)
   - Pre-production-promotion PR merge (always)
   - Pre-prod-deploy workflow dispatch (always — review what's in the image being deployed)
   - Any change with multi-repo blast radius
   - Any change touching streaming / animation / fetch / timing / lifecycle / migrations
   - Any change to auth, payments, IAP, or crisis detection

2. **Agent selection by domain:**
   | Change touches | Dispatch |
   |---|---|
   | Mobile UI / React Native / hooks / animations / streaming consumer | `iris` (Frontend & Mobile) |
   | Backend / NestJS / API contracts / use cases / Prisma migrations | `cortex` (Backend & API) |
   | LLM streaming / token handling / prompt flow / RAG | `muse` (AI & ML) |
   | Cross-cutting / regression / error paths / tests / pre-deploy check | `sentinel` (Quality & Debugging) |
   | UX flows / design spec compliance / accessibility | `prism` (Design & UX) |
   | Infra / K8s / CI / DNS / secrets | `atlas` (Infrastructure & DevOps) |
   | Security / encryption / RBAC / audit | `vault` (Security) |
   | HIPAA / health data / crisis safety | `shield` (Healthcare & Regulatory Compliance) |

3. **Default fleets (pick one based on diff):**
   - **Mobile streaming/animation/fetch:** `iris` + `sentinel` parallel
   - **Backend API/use case:** `cortex` + `sentinel` parallel
   - **AI / LLM prompt or token logic:** `muse` + `sentinel` parallel
   - **Cross-repo refactor:** `iris` + `cortex` + `sentinel` parallel
   - **Production promotion:** `sentinel` + relevant domain agent + `vault` (if security-adjacent)

4. **Prompt structure:**
   - Hand them the SHA range or branch (e.g. `git diff staging...feature/xyz`)
   - Tell them WHAT they're reviewing (bug fix? feature? perf? migration?)
   - Tell them WHY (the user-visible problem this is meant to solve)
   - Ask for: critical issues, important issues, minor issues, edge cases that simulator/CI wouldn't catch
   - Cap response at ~250 words per agent
   - Ask for explicit ship/block recommendation

5. **Apply the findings yourself (per `feedback_agent_dispatch_discipline.md`):** Agents NEVER open PRs autonomously. They report back, you decide, you apply.

6. **Always run agents in parallel (per `feedback_use_parallel_agents.md`):** Single message with multiple Agent tool calls.

7. **Exemptions (the gate can be skipped):**
   - 1-line removal of a known-dead call
   - Comment-only changes
   - Version bumps with no logic change
   - String-only changes (locale files, copy)
   In these cases, a careful diff-review is the gate.

**Concrete workflow checklist before EVERY TF build:**
- [ ] Type-check passes
- [ ] Diff is committed to a branch (so agents can `git diff base...branch`)
- [ ] Domain agents dispatched in parallel with full context
- [ ] Critical/important findings applied (or explicitly waived with reason)
- [ ] (Optional) Simulator smoke test for high-risk changes
- [ ] Bump build version
- [ ] Archive + upload

**Concrete workflow checklist before production promotion:**
- [ ] All Ship Gates passed
- [ ] Promotion PR is up-to-date with staging
- [ ] `sentinel` + domain agent reviewed the cumulative diff (staging → prod)
- [ ] Critical/important findings applied
- [ ] Astro explicit go-ahead
- [ ] Admin-merge promotion PRs
- [ ] Run Deploy workflow

**Validation evidence (2026-05-03):**
PR #466 (skip rainbow gradient for streamed bubbles): `iris` + `sentinel` in parallel returned ship-as-is verdict in ~5 min. Both independently traced every `typewriterIndex` consumer, confirmed no orphan side effects, and verified all 4 build version bumps targeted staging blocks (production at 164 untouched). Saved one speculative TF cycle worth of risk. First validated application of the workflow.

Skipping any of these on a meaningful change is a process failure to call out explicitly.
