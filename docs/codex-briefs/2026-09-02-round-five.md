# Codex brief, round five (2026-09-02)

**First: thank you, and here is what you already finished.** Verified merged on `murror-api`
`staging` @ `c33bb144` — round four's A1 (scheduler alarm `severity` → `condition`, #887),
A2 (wellness goals idempotent, #898), B1 (RabbitMQ dead-letter on confirm timeout, #899),
B2 (bounded high-risk text payloads, #900), C1 (`legacyNullDoneAt` + the 278 comments),
C2 (recovery triage fields object-first), C3 (connection-integrity status shape),
C4 (centralized indicator status ownership). **Do not redo any of those.**

This brief is the **remainder of round four plus what today's device testing and reviews
surfaced**. It supersedes rounds three and four; ignore both of those files.

**Line numbers pinned 2026-09-02 against `murror-api` `staging` @ `c33bb144`, `viasr-api`
`staging`, `MurrorMobile` `staging-environment-setup` @ `be8feee0`.** Numbers drift; grep for
the quoted code rather than trusting them.

## Hard rules for every task

- **PRs target `staging`** (`staging-environment-setup` for MurrorMobile). Never `main`.
  For viasr-api, `main` deploys ALPHA and the `production` branch is prod.
- **Do not deploy. Do not write to any database.** Read-only DB access is fine and encouraged.
- **murror-api:** sibling worktree, symlink the canonical `node_modules`, **never
  `pnpm install`** there (it wipes the shared tree for ~40 worktrees). `npx prisma generate` for
  BOTH `prisma/schema.prisma` and `prisma/schema.murror.prisma`. `npx tsc --noEmit` baseline is
  **exactly 7 errors**, all `sharp` / `heic-convert` typings; anything else is yours.
- **MurrorMobile:** lint is an **exact baseline** (131 occurrences / 110 tuples) — run
  `yarn lint`, not targeted eslint; `yarn type-check` must be 0; run `yarn prettier --check` on
  changed files. Do **not** run the full jest suite (fake-timer hang where zero output reads as
  zero failures); run touched specs with explicit paths and read the FULL summary. Every
  MurrorMobile PR can cost a ~40 minute hosted macOS build, so batch and push once.
  ⚠️ `Build iOS App` is gated on paths: `Gemfile`, `package.json`, `yarn.lock`,
  `.github/scripts`, `patches/`, `ios/`. A change touching any of those WILL spend the build.
- **Logging (murror-api):** nestjs-pino **discards a trailing object**. Log **object-first**.
  **Never name a log field `severity`** (it is the log-level key); use `condition`. Assert on the
  **rendered record** via `src/shared/tests/capture-pino-output.ts`, never
  `toHaveBeenCalledWith`, which passes for both forms and proves nothing.
- **Every fix needs a test that FAILS before and PASSES after, and you must prove it:** apply the
  fix, revert the product change (not the test), show `git diff --numstat` and the red line,
  restore. Put both in the PR body. Specs here routinely encode the defect they should catch, so
  a green test alone is not evidence.
- Read `Murror/docs/CODEX-HANDOFF.md` first; add your PR numbers there when done.

---

# Priority A — the two with a clock on them

## A1. `nanoid` must be bumped before 2026-09-16 or every mobile PR goes red

`MurrorMobile`: `nanoid@3.3.8` carries GHSA-xwg4-73v4-xw9w, and unlike the other baselined
advisories the bundle-exposure gate proves it is present in the **production iOS source map**, so
a "dev-only" rationale is not available. It was baselined in `scripts/ci/osv-baseline.json` with a
deliberately short expiry of **2026-09-16**. `check-osv-baseline.mjs` compares with a strict `>`,
so **from 2026-09-17 every MurrorMobile PR is blocked.** Confirmed still outstanding today:
`yarn.lock` contains `nanoid@npm:3.3.8` twice and the baseline still lists it.

**Fix:** add a yarn `resolutions` entry (or bump the consumer) so every `nanoid@3.x` range
resolves to **>= 3.3.12**; `3.3.16` is already in the lockfile for another consumer. Run
`yarn install` with the repo's pinned toolchain. Confirm `nanoid@npm:3.3.8` is gone.
**Re-pin the OSV baseline's lockfile hash** (the file records the `yarn.lock` sha it was reviewed
against and the checker fails on a mismatch) and delete the nanoid entry. Run `yarn lint`,
`yarn type-check`, and `node scripts/ci/check-osv-baseline.mjs` locally. One PR, no other
dependency changes. This touches `yarn.lock`, so it **will** spend a macOS build — that is
expected and correct for a dependency change.

## A2. The production AI worker's logs reach nobody

`viasr-api`. The prod celery worker (`murror-ai-celery-worker`, `nsp-prod-murror-ai`,
`do-sgp1-murror-cluster-sgp1`) emits **zero** lines to `kubectl logs` after 20 hours of uptime.
Everything lands in `/viasr/worker.log` **inside the container** (4.9 MB), which nothing collects
and which is lost on every restart. **No background failure in production is visible to anyone.**
This is why a broken suggestion path went unnoticed for months, and it is hiding whatever else is
failing right now.

Already verified, do not redo: a positive control shows the `murror-ai` FastAPI pod and
`murror-ai-beat` pod both DO return output from the same namespace and command, so this is the
worker specifically, not the cluster or credentials. The worker runs `--loglevel=info`, so
`LOGGER_LEVEL=ERROR` is not the gate. `ENVIRONMENT=production` is set on the pod.
`app/celery_worker.py:25-26` adds a `StreamHandler` when `ENVIRONMENT != LOCAL`, and `:31` adds a
`FileHandler("worker.log")` where records demonstrably land.

**Unresolved, and the thing to find:** why the StreamHandler produces nothing. Test rather than
assume: Celery's own logging hijack (`worker_hijack_root_logger`, on by default) replacing
handlers after setup; `propagate` disabled; the handler attached to a different logger than the
tasks use; the container command redirecting the stream; or a `setup_logging` signal. Prove which,
ideally by reproducing locally with the same `ENVIRONMENT` and celery invocation.

**Fix** so worker logs reach stdout and therefore `kubectl logs`, **without losing structure**:
production uses a `JsonFormatter` and the security contract tests assert private values never
reach rendered records, so keep both. Add a test that fails if the worker stops emitting to
stdout. Decide whether the `FileHandler` should be removed entirely (an uncollected file growing
unbounded inside a container is its own problem) or kept for local development only.

---

# Priority B — authorization and correctness

## B1. Either party can delete the other's takeaway reflection

`murror-api/src/connections/application/use-cases/takeaway/delete-takeaway.use-case.ts`.
It gates **only on connection membership**, so either party can delete the other's takeaway,
including one where they are the RECEIVER and the sender is still waiting for an answer. That is
an authorization gap on shared, emotionally significant content: one person can erase what the
other wrote.

**Fix, honouring the existing product rulings rather than inventing new ones:**
- The **sender** should be the only one who can delete an **unanswered** card.
- A **completed** reflection is a joint artifact. Per Astro's 2026-08-31 ruling a departed
  connection KEEPS shared content, so a completed reflection should be **redacted or hidden for
  the requester**, not hard-deleted for both. If the right shape is genuinely ambiguous,
  implement the conservative option (refuse the delete) and say so rather than guessing.
- Either way, the other person must never silently lose content they wrote.

Tests: the receiver cannot delete an unanswered takeaway; the sender can; a completed one behaves
per the ruling you implement. Mutation-prove each.

**In the same PR:** `takeaway-reflection.repository.ts` `findPendingForUser` (~:164-175) has
**zero callers**. It queries `receiverUserId = me AND status = PENDING`, which reads like the
receiver's card query, but the real read path is connection-scoped (`findByConnectionId`) and
returns both directions, which is what the UI needs. **Delete it** after confirming it still has
no callers. A tested-looking method nobody calls is a trap for the next person.

## B2. Connection scoping on the Step 4 predicate is unfalsifiable

`murror-api/src/connections/services/guided-mtc-progress.service.spec.ts` (~:46-48). The mock is
`takeawayReflection: {findMany: jest.fn().mockResolvedValue([])}`, which **ignores its `where`
argument**. A reviewer deleted the `connectionId` filter from the service entirely and all 19
tests stayed green. The guard preventing "Step 4 clears because you reflected on a *different*
connection" is untested.

The shipped code is correct (the filter is present at `guided-mtc-progress.service.ts:174`), and
the blindness is **pre-existing** — removing `connectionId` from the two original task queries
also passes 19/19. **Fix:** give `takeawayReflection.findMany` and the two task-row mocks a
`where`-aware fake so connection scoping becomes falsifiable, then prove it by deleting the filter
and watching a test go red. Small, mechanical, and it pays for itself.

## B3. A reciprocal takeaway card is reachable (SUSPECTED, confirm first)

`murror-api` + `MurrorMobile`, after PR #1196 (merged today) made the connection-detail path
create takeaways. `add-log-screen.tsx:1546` plus `connection-share-confirm-policy.ts` plus
`relationship-detail-screen.tsx:2605-2665`.

The policy comment states a reflect-back must never open a reverse card, and guards on
`takeawayId`. But the **"SHARE YOURS" responder path** (`onStart`) passes
`isReflectingBackToConnection: true` and **no `takeawayId`**, and that value derives from
`isOtherCompleted`, which is the LOG/QUIZ task cycle, not whether a takeaway row exists. Chain:
confirm suppressed → `shareToConnection` stays true → `resolveConnectionTakeawayTarget` passes
every guard → a row is created in the opposite direction. The server dedupes per
`(connectionId, sender, receiver)` **direction**, so B→A is not blocked while A→B is PENDING.

Bounded by `relationship-detail-screen.tsx:3227-3231`, which routes any card carrying
`item.takeawayId` to `onStartTakeaway` (which does pass it). The reachable case is a user with an
inbound PENDING takeaway who taps the generic "For Us" reflect card instead. Impact is a confusing
double card, not data loss. It becomes more likely now that #1196 produces rows.

**First confirm it is reachable** (a test, or a traced call chain — say which). If it is: make the
reciprocal guard key on "is there a PENDING inbound takeaway on this connection" rather than on
the `takeawayId` route param. If it is not reachable, say why and close it.

---

# Priority C — small, self-contained

## C1. viasr: guards that read a field the producer never emits

viasr PR #653 found `reject_meta_definable_words` in `app/services/journal_analysis/` read a
`meaning` key while the parser emits `{"word", "definition", "category"}`. **The guard was a no-op
in production**, and its unit test passed only because the test built its own dicts carrying
`meaning`. Deleting the call changed nothing, because the call did nothing.

Sweep `app/services/**` for the same class: any guard, filter, sanitizer or validator
(`reject_*`, `looks_like_*`, `sanitize_*`, `filter_*`, `_coerce_*`, `is_*_fallback`,
`contains_verbatim_span`, and the `safety.py` modules in `takeaway/`, `reflection_card/`,
`insight_deeper/`, `new_relationship/`, `journal_analysis/`, `council/`, `care_tips/`) whose input
shape is asserted **only** by a unit test that builds its own dict, rather than by a test that
runs the **real producer** (`_parse_response`, `model_validate_json`, the parser) and feeds its
output to the guard.

For each: list the keys the producer emits and the keys the guard reads. If they differ, that is a
live no-op — fix it and add a pipeline-level test that goes red when the field name is wrong. If
they match, add the pipeline-level test anyway so a future rename cannot silently disconnect them.
Also grep for `.get("<key>", default)` on parsed model output where the key is not in the
producer's schema. Deliver a table: guard | producer | keys read | keys emitted | verdict.
No live LLM calls; mock the provider.

## C2. Docs read `.info.x` on a 200, which is always null

`/api/health/monitoring` wraps a 200 in `{status, statusCode, message, data}`; a 503 is **not**
wrapped. So `jq .info.influxdb` returns `null` on a healthy service and only works during an
outage. Still outstanding in all three files (verified today): `docs/github-influxdb-alpha-checklist.md`,
`docs/github-influxdb-setup.md`, `docs/monitoring/influxdb-monitoring.md`. Change to
`jq '.data.info.influxdb // .info.influxdb'` and add a one-line note saying why.

## C3. The invite-type fallthrough makes every new type a song

`MurrorMobile/src/utils/notification.ts:85-90`:
`type === MOVIE_INVITE ? 'movie' : type === PLACE_INVITE ? 'location' : 'song'`. `'song'` is the
`else` arm, so **any invite type added later silently produces a song focus key**. Make the
mapping exhaustive over the known types with an explicit fallback that is not a real type, and add
a test that a new/unknown invite type does not map to `song`. Small; batch it with another mobile
change if you can, to share the macOS build.

---

# Priority D — the investigation that matters most

## D1. `journals` recorded ZERO rows from April through July while 252 users registered

Production `murror_api.journals` has **0 rows April–July 2026**, while **252 users registered** in
that window. Separately, `murror_api.user_connection_tasks` and `user_connection_task_history`
have **zero rows between 2026-03-10 08:10 and 2026-08-25 06:03**, a 168-day gap. The two blackouts
overlap and may share a cause.

Investigate **READ-ONLY** against production Supabase `dcftszkbpamgeivhtuzl` (SELECT and count
only, never a write, and **never print journal or reflection TEXT** — ids, counts, timestamps and
statuses only). Establish which of these it is, with evidence rather than inference:

1. **Nobody wrote** — genuinely no activity. Compare registrations against sign-ins, sessions,
   deep-chat conversations, diary entries and other activity tables over the same months. If other
   tables show activity while `journals` shows none, writing was broken, not idle.
2. **Writing was broken** — a regression between April and July that silently failed journal
   creation. Check murror-api and MurrorMobile history across that window for changes to the
   journal write path, and look for a fix near 2026-08-25 that coincides with rows resuming.
3. **The data was deleted or migrated** — check for a migration in that window that moved, renamed
   or truncated the table, and whether an older table still holds those rows.

Also determine whether the 168-day task-table gap shares the explanation, and whether any other
table shows the same stop-and-restart shape on those dates.

**Deliver:** which explanation the evidence supports, the tables and counts that prove it, and if
data was genuinely lost, what is recoverable. A four-month hole in the core content table is either
a large silent outage nobody noticed or missing user data, and it matters more than any single bug
in this brief. No deploys, no writes, no schema changes.

---

## Suggested PR split

A1 alone (it touches the lockfile). A2 alone. B1 alone. B2 alone. B3 alone (confirm before
fixing). C1 alone. C2 and C3 can ride with anything. D1 produces a written finding, not a PR.

In each PR body: the mutation numstat and the red test line, the full jest or pytest summary
(suites **and** tests, never the `Tests:` line alone), and `tsc` = 7 for murror-api. Then append
your PR numbers to `Murror/docs/CODEX-HANDOFF.md` under the round-five pointer.
