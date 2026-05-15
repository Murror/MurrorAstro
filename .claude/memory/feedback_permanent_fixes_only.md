---
name: Permanent fixes only — zero tolerance for band-aids
description: Every change must be a permanent root-cause fix. No retries that mask races, no cosmetic error-message improvements, no manual DB inserts, no temp workarounds, no "ship it, we'll clean up later"
type: feedback
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
**The rule.** Every fix, every change, every action must be a *permanent* solution. Never ship a band-aid. Never propose one. Never accept one.

**Why this rule exists.** Astro has caught me doing this repeatedly — across many sessions, many repos, many sprints. Each time it's a different flavor of shortcut, but the shape is the same: I work around the real problem instead of fixing it. The band-aid works once, then the user hits the same bug again, and we've burned trust and time. This is happening many, many times and it must stop.

---

## What counts as a band-aid (do NOT ship these)

1. **Retries that paper over a race.** If something fails because of a timing issue, fixing the timing is the permanent fix — not "retry 3 times and hope." Retries are appropriate for genuinely flaky network calls, never for races we can eliminate.
2. **Cosmetic error-message improvements.** If code throws in a state that shouldn't happen, the fix is to prevent the state, not to make the error message nicer. "Cleaner FAILED state" is not a fix.
3. **Manual DB inserts / SQL patches to unstick a user.** The user will hit it again. Fix the code path that creates the row.
4. **Ad-hoc RabbitMQ publishes / admin API calls to kick a stuck job.** Same problem. Fix the code that queues or consumes the job.
5. **Pod restarts / cache flushes "to see if it recovers."** Understand why state got bad, fix that.
6. **Feature flags hiding broken code.** If a flag is off because the code is broken, delete the code or fix it. Don't leave the flag as a tombstone.
7. **"Works on staging, we'll deal with prod later."** If the fix only works on staging by coincidence, it's not a fix.
8. **`// TODO` + ship.** A TODO in a diff is a public commitment to come back. If you can't do it now, say so explicitly; don't bury it in a comment.
9. **Try/catch that swallows the real error.** Catching to log-and-ignore hides the root cause. Catch only where you have a meaningful response.
10. **Timeouts bumped instead of slow query investigated.** If a query is slow enough to need a bigger timeout, it's slow enough to need fixing.
11. **Disabling a test instead of fixing the underlying code.** `.skip` is a band-aid. Either fix the code or delete the test.

---

## The two-test rule — apply to every change before shipping

Before any commit, answer both:

**Q1: "Will this still work the next time the user hits this flow?"**
If no → band-aid. Stop.

**Q2: "If a different engineer encountered the same symptom in 6 months, would my fix still be the right fix, or would they have to redo it properly?"**
If redo → band-aid. Stop.

---

## When you're tempted to band-aid

You will be tempted. Some signals:
- "It's just a retry, low-risk."
- "This only matters at prod cutover, we can defer."
- "Just add a clearer error message."
- "The user flow that hits this is rare."
- "Staging only, we'll re-audit before prod."

**When you feel any of these, STOP and do one of three things instead:**

1. **Fix it permanently now.** Most often the permanent fix is only marginally more work than the band-aid, and you save yourself from revisiting it.
2. **Name it explicitly as technical debt** in the response to Astro, with the real fix spelled out, and let Astro decide whether to defer. "I can do X as a band-aid (30 min) or Y as the real fix (2 hrs) — here are the tradeoffs." Never decide unilaterally to defer.
3. **Stop and investigate further.** If you don't know what the permanent fix is, say so. Don't ship the band-aid while pretending it's the fix.

---

## Examples from recent sessions (learn from these)

- **Phase 6e QA:** Shipped `ensureUserExistsById` retry with 750ms backoff instead of fixing user-sync to run synchronously in the auth hook. Astro called it out: it's a band-aid that masks the race, doesn't eliminate it.
- **Phase 6e QA:** Made `buildInsightPayload` throw a clearer error message instead of guarding upstream so the insight never queues for one-sided connections. Cosmetic, not a fix.
- **Earlier sessions:** Manual DB inserts to recover users, ad-hoc RabbitMQ republishes to retry insights, pod restarts to clear stuck state — each one shipped, each one re-broke the next time.

---

## What "permanent" looks like in practice

- **Fix the root cause**, even if it means touching more files.
- **Change the contract** (event sequencing, schema, guard conditions) so the bad state can't happen again.
- **Test the full user flow** that exercises the fix — not an injected fixture.
- **Leave the codebase more resilient** than you found it, not just quieter.
- **If you can't do it right, flag it transparently** and let Astro decide; don't silently downgrade the scope.

---

## Meta

If this rule feels expensive — good. The cost of shipping a band-aid is always higher than the cost of fixing it properly, we just don't see that cost until the second or third time the same bug resurfaces. Every band-aid compounds into brittle code. Every permanent fix compounds into a stronger system.

**The default answer to "should I band-aid this?" is NO.**
