# Codex brief, round two: five follow-ups from the 2026-09-01 merge round

Written by Claude Code, 2026-09-01, after 19 PRs merged across three repos. Every finding
below came out of an adversarial review whose main change has already landed; these are the
pieces deliberately kept OUT so those branches stayed reviewable.

**This is a SECOND brief.** The first is `2026-09-01-eleven-followups.md` and its shared
hard rules apply here unchanged — read them, they are not repeated. In short: read-only
databases, no deploys, viasr production is the `production` branch and NOT `main`,
MurrorMobile is iOS-only, mutation-prove every claim with `git diff --numstat`,
`LOGGER_LEVEL=ERROR` discards info/warning, nestjs-pino drops a trailing object, and the
specs-encode-the-defect checklist.

🚨 **Two corrections to that first brief, both measured since:**

1. **murror-api `tsc --noEmit` is now 0**, not 7. A git worktree was nested inside the
   canonical checkout, unignored, and tsc was compiling it as project source — 90 of 91
   errors. It has been removed. If you measure anything other than 0, **diagnose your
   worktree before trusting any number**, and do not repeat the earlier "missing
   `heic-convert`" explanation: that package is not declared anywhere and nothing imports it.
2. 🚨 **`gh run rerun` replays the ORIGINAL merge commit.** It does not recompute against a
   moved base. Use `gh pr update-branch`. See task 5, which is about exactly this class.

Work **one task at a time**, one PR per task.

---

## 1. 🚨 P1 — a deletion rollback that bulldozes completed, irreversible work

**Repo:** murror-api. **Pre-existing**, not introduced by the PR whose review found it.

`account-deletion.service.ts:377` runs `tx.deletionStep.deleteMany({where: {requestId}})` with
**no status filter**. It destroys COMPLETE receipts, the tombstone, and the request row, and
clears `deletedAt`.

It is reached from `:347` when `authBanned || damage.mutated` is false at `:300`, and 🚨 **both
are the HTTP worker's own local variables**, so a concurrent cron worker's in-flight redaction
is invisible to that decision.

The window is real:
- `k8s/manifests.yml:20` sets **`replicas: 2`**, and `@Cron` fires once per pod.
- `runScheduledPurge` at `:440` does **NOT** take `withClusterCronLock`. **Fifteen other
  services do.** The irreversible-deletion cron is the only omission.
- `damage.mutated = true` is set at `:922`, **after** the guards at `:898`/`:899`, so a throw
  in either leaves it false and routes to the full rollback.
- `processPendingAuthRevocations` selects `REQUESTED` at `:454-461` — exactly the state a new
  request sits in while `requestDeletion` is still running and holding no claim.

**If it fires:** joint content irreversibly redacted, audit trail deleted, account
un-suppressed, and the user told *"Nothing was changed."*

**Fix, in priority order:**
1. 🥇 **Wrap `runScheduledPurge` at `:440` in `withClusterCronLock`.** Copy the pattern the
   other fifteen use. One line, halves every race window in the file.
2. Scope the rollback: `:377` to `status: {not: 'COMPLETE'}` and `:379` to `status: 'REQUESTED'`,
   **or** refuse to roll back once any step is COMPLETE or RUNNING. Choose and justify.
   🚨 A rollback that can destroy an irreversible action is the wrong shape regardless of how
   narrow the window is.
3. `markRequestFailed` at `:2871` uses `update`, which throws P2025 on a deleted row, and the
   catch at `:516-522` does not wrap it — unlike the equivalent at `:308-320`. **One rolled-back
   request can abort the whole cron tick for every user.** Change to `updateMany` and give that
   catch its own try/catch.

**Also: five untested fail-closed guards**, all currently CORRECT but with no test holding
them there, all in `resolveCapturedStorageTargets`/`purgeStorage`. Mutating each leaves all
153 tests green: `storageTargetsRetiredAt` re-stamped every rerun; a missing bucket defaulting
to `users`; `verifiedPathCount` always nonzero; 🥇 **a malformed snapshot tolerated as empty**
(fix this one first — turning that throw into "return empty" reintroduces exactly the
vacuous-pass class); the path-traversal assertion removed on re-read.

🚨 **Do NOT run any deletion or purge against real data.**

---

## 2. Guard the other half of the silent field-drop bug

**Repo:** murror-api. PR #868 merged and guards 14 enumerating factories — 217 mutations, 217
killed, 0 survived. Its **title** claims "every enumerating factory" and that is now merged
prose. **Two live sites are not covered:**

1. **`ConversationResponseMapper.toMessageResponse`** (`conversation-response.mapper.ts:74`) —
   same file as a guarded factory, identical tsc-blind `dto.x =` pattern, 9 fields, zero spec
   references, live via `toMessageResponseList` from `deep-chat.controller.ts:636`. Cheapest
   fix: a near-copy of the mapper guard already in that file.
2. 🚨 **`PrismaConversationRepository.toDomain`** (`prisma-conversation.repository.ts:546`) —
   **32 keys** into `Partial<ConversationProps>`. **A `Partial` sink means ZERO type pressure.**
   This is **the other half of #852**: #868 guards the aggregate dropping a field the repository
   passed; nothing guards the repository failing to pass it. **Both produce identical
   user-visible symptoms**, so a bug here would be misdiagnosed as the one already fixed.

**Copy #868's proven method, do not invent one.** It works on two layers: a compile-time probe
(adding `__probeField?: string` to each input type must produce exactly one `TS2741` per guard
spec) and a runtime value round-trip against **distinct sentinels**.

🚨 **The acceptance test is a per-field mutation table.** For EVERY field each site forwards,
break the forwarding and confirm the guard dies. Report field / mutation / killed-or-survived.
🚨 **Distinguish an assertion kill from a throw kill** — a value-diff assertion is strong
evidence; a constructor rejecting `undefined` is weaker because it does not prove the fixture
differs from the fallback.

🚨 **Reproduce the #853 placebo as a control on your own instrument**: set one fixture equal to
the code's own fallback, apply the matching mutation, and confirm your harness reports a
SURVIVOR. A harness that has never reported one cannot be trusted to report zero.

**Also, mechanism already proven:** a ~4-line Prisma column pin for `SyncExecution` —
`type EveryColumnMirrored = keyof GeneratedRow extends keyof PrismaSyncExecution ? true : never;`
compiles clean today; a negative control with a fake column errors `TS2322`.

**Do NOT** add another 28-44 line duplicated doc header per guard; #868 is already 34% comment
and the reviewer flagged the prose as the drift risk. **Keep the fixtures duplicated** — that
duplication is load-bearing.

---

## 3. Delete a test that passes with its bug fully live

**Repo:** viasr-api. Found empirically during the #645 conflict resolution.

`tests/services/deep_chat_stream/test_stream_chat_emotion_source_id.py` — the test asserting
that the persisted message row and that turn's emotion event share one id.

🚨 **It passes with the bug live.** Measured: with the id-destroying defect reintroduced, this
suite reported **4 passed** while a purpose-written replacement reported **4 failed**.

**Why:** at roughly `:160-164` it replaces the whole service with a `MagicMock`, then reads
`svc.add_user_message.await_args.kwargs["message_id"]` — the id going *into* the mock. The id
is destroyed one frame *below* that boundary. **It asserts what the caller passed, not what the
system produced.**

Second instance, same class: `test_user_row_keeps_its_own_generated_id` in
`test_stream_chat_shared_ai_message_id.py` is a **negative assertion** (`!=`) that a wrongly
regenerated uuid4 also satisfies.

**Fix:** delete or rewrite both. The working pattern already exists —
`test_persisted_row_id_equals_the_emotion_event_source_id` (added by #645) runs the real chain
and reads **both** ids from what the code produced. 🚨 **Prove your replacement by
reintroducing the defect** (remove the `isinstance` passthrough in `_coerce_message_id`) and
confirming it FAILS.

**Sweep for siblings:** any test asserting on `await_args`/`call_args` of a mock standing in for
the component under test has the same blindness. Report the complete table including the ones
you judge fine.

---

## 4. Alert when a user gets permanently locked out of AI personalization

**Repo:** viasr-api. The defect is fixed (#647, deployed) and 7 affected users were cleared on
2026-09-01. **This task is the detection that was missing**, chosen by Astro over a one-off check.

viasr recorded "no local profile replica yet" as a durable `state=DELETED` tombstone, on a
persona READ. Unrecoverable. 8 rows accrued 08-28 → 09-01 at ~1.6/day.

🚨 **Nothing detected it**, three independent failures: the blocked decision logged at
`logger.info`; the consumer logged `result=ignored` at `logger.info` then published
`success=True` and acked; and **production runs `LOGGER_LEVEL=ERROR`**, so both are discarded.
The Celery worker separately hardcodes INFO and never reads that variable. Worse, the false
`success=True` made murror-api write `SYNCED` and NULL out `profileSyncError`, **erasing the only
durable evidence**.

**Build:** a counter for synthetic tombstone writes (`metrics.py` already carries lifecycle
concepts) and one for blocked syncs with a `reason` label. 🚨 **Alert on non-zero at all** — a
synthetic tombstone should now be impossible, so one is a regression, not a threshold to tune.
Log at **ERROR, object-first** (`stream_chat.py:1072` and `:1424` carry the established pattern).

🚨 **Establish whether the counter actually reaches a scrape.** Only the FastAPI process exposes
a registry, so a Celery-path increment may be lost, and `/metrics` previously returned 404 on
staging. **If a counter is the wrong mechanism here, say so and propose the right one — do not
ship detection that cannot detect.** Prove the counter increments and the alert condition fires.

🚨 **Do NOT modify the one remaining tombstone row** `1f6cd927-1f08-43a2-a7d2-015f16d6533b` —
it is a genuine deletion.

---

## 5. CI grades PRs against a stale base

**Repos:** all three, one PR each. Confirmed independently by me.

CI runs against the PR's **branch tip**, not the merge result, so a green badge describes a
state that may no longer exist.

Measured on murror-api #869/#870: CI ran 2026-08-31 21:26 PDT against base `9beee503`; staging
was **17 commits ahead** by the next morning. **#867 merged 42 minutes after CI and edits the
exact file #870 deletes from. #868 merged ~7.7h after and added a spec #869 is sensitive to** —
that spec dies under two mutations and did not exist when CI ran. Both PRs happened to hold when
re-run on the true merge result. **That is luck, not process.**

This repo merges on CI green as a standing gate. A gate that grades a stale base is not a gate,
and the failure is silent — nothing on the PR page says the base moved.

**Do:**
1. **Establish the current trigger** — read `.github/workflows/ci.yml` and find which ref checks
   actually run against. `pull_request` normally provides `refs/pull/N/merge`; if this repo gets
   the branch tip instead, find out why (an explicit `ref:` on checkout, a `push`-triggered
   workflow being what reports, `pull_request_target`). **Report the cause before changing
   anything** — the fix depends entirely on it.
2. **Fix it**, weighing options explicitly with their CI-minute cost: run on the merge ref;
   require branches up to date before merging (a repo setting, not a workflow change);
   re-trigger on base movement. 🚨 A naive "re-run everything on every base change" would
   multiply runs and violate the standing cost rule. **Recommend one, with costs stated.**
3. **Check all three repos, report per repo, one PR each** so each stays reviewable.
4. 🚨 **Prove the fix works**: make a PR green against base X, advance the base with a commit
   that would break it, and show the check goes red. A fix you cannot demonstrate failing is not
   verified — which is the exact lesson this defect teaches.

**Related:** `gh run rerun` replays the original merge commit and does NOT recompute against the
current base; the remedy is `gh pr update-branch`. If your fix changes which ref is used, say how
it interacts.

🚨 Workflow files are release-sensitive on MurrorMobile and force a ~50 min hosted macOS build.
Note: `scripts/ios-next-build.sh`'s five-file bump set IS allowlisted and correctly skips it —
do not break that allowlist.

---

# Suggested order

1. **Task 1** — P1, an irreversible action with a live race. The one-line cron lock first.
2. **Task 5** — every other merge decision rests on it.
3. **Task 3** — a green test asserting a live bug is actively misleading.
4. **Task 2** — the repository seam is the other half of a bug already shipped once.
5. **Task 4** — detection for a defect already fixed.

One PR per task. If a task turns out bigger than its description, **say so and stop** rather
than expanding scope silently.
