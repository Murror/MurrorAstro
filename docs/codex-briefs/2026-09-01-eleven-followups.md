# Codex brief: eleven follow-ups from the 2026-09-01 review round

Written by Claude Code, 2026-09-01. Every finding below came out of an adversarial review that
already landed its main change; these are the pieces deliberately kept **out** of those PRs so the
branches stayed reviewable. Nothing here is speculative — each one was measured, and where a claim
is reasoned rather than reproduced it says so.

**Do not take these eleven in one session.** A 4,275-line Codex scope already idle-timed out at
1800s on this codebase. Work **one batch at a time**, one PR per task unless a batch says otherwise.

---

## Hard rules that apply to EVERY task below

Read these once; they are not repeated per task.

| Rule | Detail |
|---|---|
| **Databases** | 🚨 **READ-ONLY on every Murror database.** Production Supabase is `dcftszkbpamgeivhtuzl`. No writes, no migrations, no backfills, no data repair without Astro's explicit sign-off on both plan and execution. Your own disposable Postgres is fine and encouraged for tests. |
| **Deploys** | Do NOT deploy, do NOT merge. Merging to viasr `staging` **auto-deploys**, so opening a PR is the end of your job. |
| **viasr branches** | 🚨 viasr production deploys from the **`production` branch**. `main` deploys **ALPHA** (`nsp-dev-murror-ai`). Diff `production...staging`, never `main...staging` — the latter shows a fake 390-commit gap. `viasr-api/CLAUDE.md` used to deny the `production` branch exists; that was corrected in #646. |
| **PR targets** | viasr → `staging`. murror-api → `staging`. MurrorMobile → `staging-environment-setup`. |
| **Mobile scope** | MurrorMobile is **iOS-only** right now. Do NOT trigger Android or hosted macOS CI. Do not modify `package.json`, `yarn.lock`, workflows, `Gemfile`, `patches/`, `ios/`, or build numbers — those paths force a ~50 min hosted macOS build. A `src/`-only diff skips it. |
| **Actions budget** | **NOT capped.** September net spend is $0.00 against $8.57 gross, fully inside the allowance. Four agents held finished work over the retired August cap today. Settle it with `gh api "/organizations/Murror/settings/billing/usage?year=<Y>&month=<M>"` and sum `netAmount`. |
| **Worktrees** | Do not disturb worktrees you did not create; ~40 exist and other agents are active. Use a fresh one. |
| **Mutation testing** | Mutation-test every guarantee you claim, and **PROVE each mutation applied with `git diff --numstat` BEFORE trusting the run.** A prettier reformat, a quoting slip, or a compile error all produce a meaningless green. |
| **Baselines** | Establish the type-checker / test baseline yourself and report it, with a positive control proving your instrument can fail. For murror-api run `prisma generate` **worktree-local**; do NOT symlink `src/generated`. For viasr integration tests pin `LC_ALL=C` for `initdb`/`pg_ctl` or the cluster aborts on macOS. |
| **Logging** | 🚨 Production runs `LOGGER_LEVEL=ERROR`, so `info` and `warning` are **discarded**. The Celery worker hardcodes INFO and never reads that var. In murror-api, nestjs-pino **silently drops a trailing object** — `logger.error('msg', {obj})` emits nothing of `obj`. Log **object-first**. |
| **The dominant defect class** | 🚨 A spec that asserts the bug. Watch for: a mock that answers regardless of its input; an assertion satisfied by a **code comment**; a shape assertion mistaken for a behaviour assertion; a fixture equal to the code's own fallback; a negative assertion (`not.toBe`) that passes against the wrong type; an expected array that happens to be in a degenerate order. **A test that would pass against the broken code is the finding.** |
| **Reporting** | Label every finding **CONFIRMED** (you reproduced it) or **SUSPECTED** (you reasoned it). Never present a hypothesis as a finding. Always state explicitly what you did NOT verify. |
| **Coordination** | Update `docs/CODEX-HANDOFF.md` when you ship something Claude Code would trip over. Do not push competing revisions of the same branch. |

---

# BATCH A — live production hazards. Do these first.

## A1. Five boolean flags on live admin routes are INVERTED

**Severity: highest in this brief.** These routes shipped months ago.

`src/main.ts:132` sets `transformOptions: {enableImplicitConversion: true}`. class-transformer coerces
the raw query string toward the reflected `design:type` (Boolean) **before** `@Transform` runs.
`Boolean('false') === true`. So the widespread idiom

```ts
@Transform(({value}) => value === 'true' || value === true)
```

never sees the string `'false'`. The real behaviour of every one of these fields is
**"any present value means true, omitted means false"** — which is not what any of them document.

| DTO / field | Consequence |
|---|---|
| `SyncBatchQueryDto.force` | 🚨 **WORST.** `if (!force)` is what gates the status filter in `syncAllUnsyncedProfiles` (`user-profile.service.ts` ~:871). `?force=false` yields `force=true`, which **drops the filter and selects EVERY user**. On five existing admin sync routes. Confirmed by reading both the DTO and the guard. |
| `ReconcileStaleSubscriptionsQueryDto.apply` | 🚨 `subscription.controller.ts:907`. `?apply=false` **actually applies** subscription changes. |
| `TriggerAllFailedWebhooksQueryDto.forceReprocess` | reprocesses when told not to |
| `TriggerAllFailedWebhooksQueryDto.dryRun` | arms when told to dry-run |
| `TriggerAllFailedWebhooksQueryDto.stopOnError` | keeps going when told to stop |

**The polarity DIFFERS per field, so there is no single mechanical fix.** `dryRun` is safe-by-default;
`force` and `apply` are dangerous-by-presence. Derive each field's intended semantics from its own
docs and call sites, and say what you chose and why.

**The pattern that works** (proven in murror-api PR #879): read the **untransformed** source so the
pipe option cannot reach it —

```ts
@Transform(({obj}) => {
  const raw = (obj as Record<string, unknown> | undefined)?.fieldName;
  return !(raw === 'false' || raw === false);
})
```

or pin the field with `@Type(() => String)`.

**Required:**
1. **Sweep for more.** Enumerate EVERY boolean query/param DTO field in the repo. Report the complete
   table **including the ones already correct** — a list of only the broken ones does not show you
   looked everywhere.
2. Ship a **truth-table spec per fixed field**, asserted through the **real `ValidationPipe`** with
   `main.ts`'s exact options, and again over real HTTP where the route allows. The existing tests
   structurally cannot see this class: they test the DTO in isolation, where the bug does not exist.
3. Include a **positive control** proving `enableImplicitConversion` is still the mechanism, so the
   spec fails loudly if someone "fixes" it by changing the global pipe instead.
4. Argue explicitly: is removing `enableImplicitConversion: true` globally the better fix? It repairs
   the whole class at once but changes coercion for every DTO including numbers. **Recommend, do not
   unilaterally do it.**

🚨 **Do NOT call any of these routes against any environment, with any parameter value.** One syncs
every user; another mutates subscriptions.

**Repo:** murror-api.

---

## A2. Deep-chat analysis logs the user's private text on a DB error

`app/services/rabbitmq_deep_chat_analysis/consumer.py:456` and `:495`. Both are `logger.exception`
— ERROR **plus** `exc_info` — guarding raw SQL that binds user-derived text:

- `:456` wraps `UPDATE murror_api.deep_chat_conversations SET learning = CAST(:learning AS jsonb)`,
  binding the LLM's reflection about a private conversation.
- `:495` wraps `UPDATE ... SET {column} = :results`, binding the generated insight list.

A SQLAlchemy `DBAPIError` stringifies to the statement **plus its bound parameters**, and `exc_info`
republishes it independently through the traceback. These run in the FastAPI pod at
`LOGGER_LEVEL=ERROR`, so production sees them.

**Fix:** reuse `exception_identity()` from `app/components/logger/exception_identity.py` (landed in
#648). Drop `exc_info` on both.

🚨 **Keep the line at ERROR and keep the conversation identifiers.** These are the only signal that a
durable write failed. Deleting or downgrading them trades a privacy bug for a silent data-loss path —
that exact trade has already been caught once here.

**Method:** prove the leak **before** fixing — plant the payload, render through the production
`JsonFormatter`, show it appears; then show it does not. Mutation-test that the signal survives: one
mutation deleting the line and one downgrading it to `info` must **both** fail a test. Run #641's
widened AST guard and confirm it catches these; if it does not, that is a finding about the guard.

**Note:** `hide_parameters=True` on the async engine is in flight separately and would remove this
class at the source. Do this fix anyway — defence in depth, and the two land independently.

**Repo:** viasr-api.

---

## A3. Raw exception text crosses the service boundary

`rabbitmq_journal/consumer.py:409`, `rabbitmq_journal_analysis/consumer.py:327`,
`rabbitmq_deep_chat/consumer.py:256`, `rabbitmq_deep_chat_analysis/consumer.py:334`. Each puts
`str(e)` into the message body it publishes back to murror-api.

**This is an EGRESS path, not a log path.** No `LOGGER_LEVEL` setting touches it. The payload crosses
a service boundary and lands wherever murror-api persists or logs it.

Proven carriers here: a SQLAlchemy `DBAPIError` stringifies to statement plus bound parameters; a
pydantic `ValidationError` echoes a ~45-character window of `input_value` — which on the journal path
**is the journal body**.

**Establish first, before changing anything:**
1. **Where does that field actually go?** Trace it into murror-api: which handler receives it, is it
   persisted, logged, or **returned in an HTTP response**? 🚨 Whether any of it can reach a client
   response decides the severity — answer that first.
2. **What is the message contract?** Is the field typed, documented, or consumed by anything that
   branches on its content? A stable error code is only safe if nothing downstream parses free text.

**Then fix:** replace the raw string with a stable error code plus a correlation identifier.
🚨 **Do not simply blank it** — it is the only signal a consumer failed. The failure must stay
diagnosable from murror-api's side without the raw text.

If murror-api needs a matching change, that is a **separate PR**; say plainly whether the two must
land together and in which order.

**Repos:** viasr-api, possibly murror-api.

---

# BATCH B — silent data defects

## B1. Every user profile has a NULL work status

murror-api builds the profile-sync payload with a field named `work`
(`src/microservice/message-patterns.ts:304`). viasr's inbound DTO expects that value under the alias
`workStatus`. Pydantic populates by alias, so the incoming `work` key matches nothing, the field falls
to its default, and `user_profile.work_status` is written NULL.

**Silent:** no validation error, no log, because a defaulted optional field is a legal payload.

🚨 **Urgent because of timing.** murror-api #878 adds an onboarding sync trigger and #879 adds a
backfill. Production holds only 25 viasr profiles today, but the trigger is about to create them for
every new user. **Fix this before any backfill runs**, or the backfilled cohort inherits the hole.

**Required:**
1. Verify the mismatch on both sides with `file:line`, and confirm the production effect READ-ONLY:
   how many rows in viasr `public.user_profile` have a non-NULL `work_status`? **If it is not zero,
   the premise is wrong — say so and stop.**
2. Decide which name is canonical and say why. Check whether anything already reads `work_status`.
   🚨 **Enumerate every field in that payload and report which ones actually land** — a mismatch this
   silent rarely appears once.
3. 🚨 The guarantee is **cross-service**, so a test asserting the payload shape on one side proves
   nothing. Pin it against the receiving DTO's alias, or add a contract test that constructs the real
   payload and feeds it to the real DTO. Renaming either side must fail it.

Repairing existing NULL rows needs Astro's sign-off. Say what a repair would involve; do not run it.

**Repos:** murror-api and/or viasr-api.

---

## B2. Silent 42883 in `deep_chat_stream` `exists()` / `count()`

`app/services/deep_chat_stream/.../postgres_repository.py:218` (`exists`) and `:238` (`count`) take
`conversation_id: UUID` and compare it to `DeepChatMessageEntity.conversation_id`, which is mapped
`Text` and is `text` in both production and staging. Callers pass a real `uuid.UUID`
(`get_conversation.py:115,130`), so the query emits `text = uuid` and asyncpg raises
`UndefinedFunctionError` (42883).

**Confirmed on a real throwaway Postgres with the exact ORM mapping:** a `str` param returns the
correct count; the `UUID` param raises.

Both methods catch bare `Exception`, log, and return `False`/`0`. So the failure surfaces as
**"this conversation has no messages"** rather than as an error — a silent wrong answer on a live path.

**Fix at the cause:** align the signature to `str`, matching the text column. Sweep the module for the
same pattern. Stop the swallow from conflating "query failed" with "no rows".

🚨 **A mocked session cannot raise 42883** — that is exactly why this shipped. Cover it with a test
that executes against a real Postgres.

**Repo:** viasr-api.

---

## B3. Inverted `Prisma.JsonNull` vs `DbNull` comments

Comments in murror-api describe these two backwards. `Prisma.DbNull` is a **SQL NULL**;
`Prisma.JsonNull` is a **stored JSON null**. They are not interchangeable and the distinction decides
what a `Json?` column actually holds.

Lowest severity in this brief — it is documentation — but it is the same class as the
`viasr-api/CLAUDE.md` line that caused the largest wrong premise of 2026-09-01 (an agent measured
`main`, concluded a shipped fix was unshipped, and sized a 14-file promotion as a 390-commit release).
A comment that lies is worse than no comment.

Find every occurrence, correct it, and check whether any **code** was written against the wrong
understanding. If it was, that is a real defect and should be reported separately, not folded in.

**Repo:** murror-api.

---

# BATCH C — mobile UX and guards

## C1. Site six: the quiz pill ignores the partner's state

**This is the sixth instance of one falsehood.** PR #1178 removed it from three surfaces, #1183 from a
fourth, #1184 from a fifth — each found by reviewing the previous fix. Site six was found by
**exhaustive enumeration** instead, which is what finally terminated the chain.

`src/screens/main/Journal/add-log-screen.tsx:3247` renders
`t('quiz.completedPill', {name: quizName})` — "You'll compare once {{name}} answers". Its only gate is
`quizPhase === 'done'` at `:3214`. Nothing about the partner.

The quiz is symmetric, so **whoever answers second is told the comparison is waiting on a person who
has already answered.**

Evidence the file cannot know the partner's state, with a positive control proving the grep works:
- `grep -c -E "quizOtherAnswered|otherAnswered|partnerAnswered|bothAnswered|quizUserAnswered"` → **0**
- `grep -c "quizPhase"` → **9** (the control)

**Fix:** the information exists one level up. `relationship-detail-screen.tsx:1086-1091` computes
`quizUserAnswered` and `quizOtherAnswered`. Thread `quizOtherAnswered` down and branch the pill.

🚨 **The pattern behind all six: reading ONE completion flag where the claim needs TWO.** Adopt the
shape used by `src/utils/feed/moment-to-care-accessibility.ts:107-113` — the only site that names the
both-completed state **explicitly** instead of letting it fall off the end of a ternary. Every site
that drifted lacked that branch.

**Required:** extract the decision into a testable helper beside the screen, in the style of the
merged `relationship-hero-reflection-state.ts` and `reflect-card-poke.ts`. Verify the helper
**actually executes** at the render site and no caller re-computes the old condition inline.

🚨 Any new locale key must exist in **en, ja AND vi**. The repo's `i18n-check` compares catalogs only
to each other, never code→catalog, so a key missing from every catalog ships **green** and renders as
the raw key on screen. Prove each key resolves by **executing** i18next, not by reading. Do not use
`t('key') || 'fallback'` — the key is truthy so the fallback is dead. No em dashes.

**Repo:** MurrorMobile.

---

## C2. Quiz nudge gate, and the stuck "Reminded" button

Two adjacent defects, both **SUSPECTED** — confirm or refute each before fixing. A clean refutation is
a good outcome.

**Defect 1: the quiz nudge can be offered when the backend will reject it.**
`src/screens/main/Diary/insight-card.tsx:2632` renders a "Give {{name}} a nudge" affordance and calls
`pokeTheOther` with **no `canPoke` gate**. Its guard is correct about who has ANSWERED
(`bothAnswered = quizUserAnswered && quizOtherAnswered` at `:2485`), so this is **not** the
single-flag falsehood class. The concern is different: the backend poke invariant reportedly requires
today's LOG/QUIZ cycle done, while the grounded quiz is documented as separate from that cycle at
`relationship-detail-screen.tsx:1073-1076`.

Read the poke endpoint's **real** precondition in murror-api rather than inferring it from the mobile
side. If confirmed, decide deliberately: gate the affordance, or make the failure legible. **Do not
add a silent catch.**

**Defect 2: a sent poke can leave a recycled sibling's button stuck on "Reminded".**
`hasPoked` (`insight-card.tsx:1481`) is never reset, and the For Us carousel recycles `InsightCard`
instances (documented at `relationship-detail-screen.tsx:2999`). After poking on one card, a recycled
instance showing a **different connection** can render its CTA already disabled and labelled
"Reminded".

🚨 This is card-identity-versus-recycled-state, a class this codebase has hit before. **Key the state
to the card's identity**, do not reset it on some event — a reset is a symptom fix and will drift
again. Reproduce it in a test first; if you cannot reproduce it, say so and do not ship a speculative
fix.

**Repo:** MurrorMobile.

---

## C3. Three guard gaps in the arc vocabulary

The conversation emotion-arc vocabulary **shipped** (viasr #642, MurrorMobile #1185, both merged
2026-09-01). Its behaviour is verified correct: the schema's 45 words and the client's colour table are
provably identical, checked with instruments proven non-blind by mutation. What did **not** ship are
three guards that stop the bug returning. The agent assigned them was stopped before pushing.

**1. 🚨 The producer-delegation guard FAILS OPEN. This is the one that matters.** Reverting
`app/tasks/journal/generate.py` to a non-deduping plain `for` loop, leaving `as_arc()` only in a
comment, **passed all 78 tests**. That mutation reintroduces the build-451 duplicate-chip bug with a
fully green suite. Two guards were meant to stop it and both failed:
- `test_the_producer_delegates_to_the_shared_arc_rule` is a substring check for `"as_arc()"` — the
  **comment** satisfies it.
- `test_the_producer_has_no_inline_arc_comprehension` is a real AST check, but it only matches
  `ListComp`/`SetComp`/`GeneratorExp`, so a plain `for` loop walks straight past.

Widen the AST check to catch ANY construct reading `.start`/`.middle`/`.end` off the arc result.
**DELETE** the `"as_arc()"` substring check rather than repairing it. Re-run the plain-`for`-loop
mutation and prove the widened guard kills it.

**2. An assertion satisfied by a code comment.**
`test_the_shared_rule_uses_the_repos_existing_dedupe_helper` uses `inspect.getsource` plus a string
check; hand-rolling the dedupe and naming the helper only in a comment passed 12/12. Delete it or
rewrite it as behaviour — seven other tests already cover the behaviour.

**3. Nothing enforces the cross-repo identity.** 🚨 There are **THREE** consumers of this word list:
viasr's `ArcEmotion` schema, `MurrorMobile/src/utils/emotion-color.ts`, and
`apps/web-client/src/presentation/components/journal/emotional-journey.helpers.ts` in murror-platform.
A **fourth** hand-typed copy sits in `MurrorMobile/src/.../emotion-arc.spec.ts`
(`ARC_EMOTION_VOCABULARY`). Adding an uncolourable word to viasr's schema left the mobile suite
**25/25 green**. The only tripwire is `assert len(ARC_EMOTIONS) == 45` in viasr, which fires in the
wrong repo and says nothing about a colour.

Build a check that reads the schema's word set and the client colour-table keys and diffs them.
🚨 **Make it fail in BOTH directions** — a consumer growing values its producer can never send is the
other half of this bug class, and a one-directional check is blind to it. Say where the check runs and
which repo's CI owns it. If a true cross-repo check is impractical, implement the strongest
single-repo version, make viasr's count tripwire name `emotion-color.ts` **and** the web helper
explicitly in its failure message, and state clearly what it cannot catch.

**Context:** the web client's table lacks all 13 added words and falls back to grey `#C8C8C8` with no
designed unmapped state — which **is** the original bug. It sits on `feat/web-core-loop-parity`, which
I verified is **not** an ancestor of main, staging, production or dev, so it is undeployed and not
user-reachable today. **Verify that is still true** before deciding whether it blocks anything.

**Do NOT touch** the 45 words themselves (Astro approved them as drafted) or the
`content`/`contentment` hue mismatch (separate PR — it touches the extraction surface too).

🚨 Every guard you write must have a **positive control proving it can fail**. A guard never seen to
fire is not a guard; that is precisely how all three of these gaps shipped.

**Repos:** viasr-api and MurrorMobile.

---

## C4. Integrity tag on deletion step metadata

**Security finding V5**, confirmed during the adversarial review of murror-api PR #871. It is
**pre-existing**, not a regression from that PR, and was deliberately left out of scope so it would
not block that branch.

`isOwnedTakeawayTarget(target, ownerIds)` in the account-deletion service (~`:2007-2022`) accepts any
storage path prefixed `voice-insights/<ownerId>/` for any id in `ownerIds`. Critically, `ownerIds` is
supplied by the **same step metadata snapshot** that carries the path. So a tampered
`deletion_steps.metadata` entry with `path: voice-insights/<VICTIM>/...` and
`ownerIds: [<DEPARTING>, <VICTIM>]` satisfies both the binding check (~`:1676`) and the kind proof,
and produces an **irreversible `remove()` against a surviving third party's files**.

**Scope honestly stated: bounded.** It requires write access to `deletion_steps.metadata`, is limited
to `voice-insights*` buckets, and is destructive rather than confidential. The other three target
kinds do NOT have this property, because their owner binding is derived independently.

**Why the obvious fix does not work:** `ownerIds` genuinely cannot be re-derived after redaction —
that is the whole reason the snapshot exists. "Look the owner up again at purge time" is unavailable.

**Implement:** an HMAC over the step metadata. Compute it when the snapshot is written, verify before
any `remove()` acts on snapshot-supplied owner ids, refuse on mismatch. Decide and justify: which
fields the tag covers, where the key lives (🚨 do NOT commit a key, and do not place credentials in
files without Astro's sign-off on where they live), and what happens to rows written before the tag
existed — a migration path, or a grace mode that logs rather than refuses, **with an expiry**.

🚨 Do NOT run any deletion or purge against real data.

**Repo:** murror-api.

---

# NOT AN IMPLEMENTATION TASK — bring this back as a decision

## D1. The crisis detector fails open when its own LLM call fails

`detect_crisis_async` in viasr-api returns `is_crisis=False` when its own LLM call fails. **An
infrastructure failure is currently indistinguishable from a person being fine**, on a live safety
path. Found while reviewing PR #644, which correctly failed closed at its own boundary and correctly
declined to change the live crisis path.

**Establish first:**
1. Confirm the fail-open. Every caller, with `file:line`. Which exception paths yield `is_crisis=False`
   versus a genuine negative. CONFIRMED or SUSPECTED.
2. Map the blast radius: text chat, voice chat, journaling, backfill. For each, say what a real user in
   distress experiences — specifically whether crisis resources and hotline numbers are withheld. Note
   there is a separate known gap that **journaling has no server-side crisis detection at all**; do not
   conflate the two.
3. 🚨 `allm_request` **swallows all provider exceptions** and returns a fallback rather than raising, so
   the detector may be receiving a fallback **string** rather than an exception. That is a materially
   different failure shape and changes the fix. Establish which it is.
4. Distinguish the three outcomes the code may be collapsing into one: a genuine no-crisis, a model
   abstention, and an infrastructure failure.

**Then recommend, do not implement.** The correct default on a safety path is to fail closed, but
🚨 a naive flip has a real cost: false positives push crisis resources at people who are fine, which is
its own harm and trains people to dismiss the banner. **Argue it in both directions.** Consider whether
a distinct `unknown` state beats a boolean, and what each consumer should do with it.

Whatever you propose must be **observable**: production runs `LOGGER_LEVEL=ERROR`, so a detector
failure must emit at ERROR, object-first, and increment a counter. Right now nobody would know.

🚨 Watch for a spec that encodes the defect: a mock detector that always succeeds makes the failure
branch untestable, which is likely why this shipped.

**Astro decides the default.** Bring it as a recommendation with evidence, not a fait accompli.

**Repo:** viasr-api.

---

# Suggested order

1. **A1** — live hazard, an explicit `=false` fans out to every user.
2. **A2, A3** — user text leaving the service.
3. **B1** — must land before any profile backfill runs.
4. **B2, B3**.
5. **C1, C2** — user-visible falsehoods.
6. **C3, C4**.
7. **D1** — evidence only, then back to Astro.

One PR per task. If a task turns out to be bigger than its description, **say so and stop** rather
than expanding scope silently.
