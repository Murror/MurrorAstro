# Murror Team Conventions

**Audience:** everyone working on Murror — engineers, contractors, anyone opening a PR.
**Reading time:** ~5 minutes.
**Last updated:** May 11, 2026.

These rules aren't taste — they're encoded responses to actual past incidents. Most have a "why" with a date attached. When in doubt: ask, don't bypass.

---

## 🚀 PR & branching

### 1. Always target `staging`, never `main` or `production`

| Repo | Target branch for new PRs |
|---|---|
| `MurrorMobile` | `staging-environment-setup` |
| `murror-api` | `staging` |
| `viasr-api` | `staging` |

- New branches: cut from `origin/staging`, not `main` or `develop`.
- Open PRs with `--base staging`.
- Verify `baseRefName` is `staging` before merging.
- If a PR is currently targeting `main`: retarget to `staging` (or close + reopen) before merging.
- **Production promotion** (`staging → production`) is **never** done unilaterally — requires explicit go-ahead + manual `workflow_dispatch`.

**Known issue:** `viasr-api` `staging` branch is 653 commits behind `main`. If a fresh branch off `staging` lacks needed prerequisite code, surface it and propose a one-shot `main → staging` sync PR — don't silently switch base to `main`.

**Source:** 2026-04-18. Astro: *"main is production right? please always target staging."*

---

### 2. Never push direct to `main` on any repo

All changes via branch + PR + GitHub merge. Even one-line fixes. Even `--admin` admin-merges need a PR record.

When using `--admin` to bypass required reviews, note it in the PR description so there's a record.

---

### 3. Back-merge PRs use merge-commit, NEVER squash

When merging a branch whose purpose is *"bring N commits from branch A into branch B while preserving history"* (e.g., production → staging back-merge after a hotfix), use **`gh pr merge --merge`** (creates a merge commit). Never `--squash`.

**Why:** Squash flattens the merge into a single non-merge commit with one parent. GitHub's `mergeable` / `mergeStateStatus` uses commit ancestry, not tree equivalence. After a squashed back-merge:
- Production's commits are "in staging's tree" but NOT in staging's parent chain
- The downstream promotion PR (staging → production) stays CONFLICTING forever
- Fixing it requires a second merge-commit PR with zero file diff just to restore ancestry

**Source:** 2026-04-22. PR #353 was squash-merged. PR #352 stayed CONFLICTING. PR #354 was a zero-diff merge-commit just to restore ancestry.

Squash is fine for normal feature PRs where you want one logical commit on `staging`. The rule is back-merge-specific.

---

### 4. Migrations and code land together. NEVER apply out-of-band.

If a PR contains a Prisma migration, the migration and the code that depends on it **must land together** via the normal PR → CI → deploy flow.

🚫 **Never** run `prisma migrate deploy` from a feature branch against a shared DB (staging, alpha, prod).
🚫 **Never** apply migration SQL manually via Supabase Studio / `psql` to "unblock testing."

**Source:** 2026-04-20 P2032 incident. PR #310's migration was applied to staging out-of-band on 2026-04-15. PR didn't merge for 5 days. Three orphan rows were created with NULL `insight_id`. When the hourly `expirePendingInvites` cron eventually read them, it crashed every 10 minutes with `P2032`. See [`INCIDENT_LOG.md`](./INCIDENT_LOG.md).

**How to apply:**
- Migration PRs merge within 24-48h or get closed/reworked. No feature branch lives >3 days with an unshipped migration.
- If you need to validate a migration before merge, use a local/ephemeral DB (`docker-compose up postgres` or a throwaway Supabase branch DB), not staging.
- If you find a schema/DB mismatch (P2032, P2002 with unexpected columns, "column doesn't exist"): grep `prisma/migrations/` across **open PRs** first. That's almost always the cause.

**Fix recipe for schema drift when found:** cherry-pick the original migration commit onto a fresh branch off the target environment branch, ship via normal PR flow. Don't try to manually reconcile.

---

### 5. Always deploy to BOTH staging AND alpha when shipping backend changes

| Namespace | Cluster role |
|---|---|
| `nsp-dev-murror` | Alpha 2 — internal test environment |
| `nsp-staging-murror` | Staging — pre-production |

Every `kubectl set image` must target both. Every CI build deploy must roll out to both namespaces. If only one gets the fix, the other stays broken and causes confusion during testing.

**Source:** Recurring "fix is deployed but test account still sees old behavior" issues.

---

## 🛡 Code quality

### 6. Permanent fixes only — zero tolerance for band-aids

Every fix must be a *permanent* solution. Band-aids are explicitly forbidden, even temporary ones.

**What counts as a band-aid (don't ship these):**

| Band-aid | The real fix |
|---|---|
| Retries that paper over a race | Fix the timing. Retries are only for genuinely flaky external network calls. |
| Cosmetic error-message improvements | Prevent the state that throws. "Cleaner FAILED state" is not a fix. |
| Manual DB inserts / SQL patches to unstick a user | Fix the code path that creates the row. |
| Pod restarts / cache flushes "to see if it recovers" | Understand why state got bad, fix that. |
| Ad-hoc RabbitMQ publishes to kick a stuck job | Fix the code that queues / consumes. |
| Feature flags hiding broken code | Delete the code or fix it. Don't leave the flag as a tombstone. |
| "Works on staging, deal with prod later" | If the fix only works on staging by coincidence, it's not a fix. |
| `// TODO` + ship | Either do it now or explicitly say it's not done. Don't bury it in a comment. |
| `try/catch` that swallows the real error | Catch only where you have a meaningful response. Log-and-ignore hides root causes. |
| Timeouts bumped instead of slow query investigated | If a query is slow enough to need a bigger timeout, it's slow enough to need fixing. |
| Disabling a test instead of fixing the underlying code | `.skip` is a band-aid. Either fix or delete the test. |

### 7. Never break working code without explicit confirmation

Before modifying ANY file that has working functionality:

1. Stop and ask: *"This change touches [file] which currently handles [working feature]. Here's what I'm changing and why — is this okay?"*
2. Default to **adding new code paths** rather than modifying existing ones.
3. If a fix requires changing working code, explain exactly what will change and what could break.
4. When in doubt, use the same proven patterns that already work.
5. Never assume a change is safe — trace impact on all code paths that touch the same files.
6. One change at a time, test before moving to the next.

**Source:** 2026-04-05 sprint. Cascading failures because changes to one area (emotion detection) broke the entire journal pipeline, leading to 2 days of reactive fixes that each introduced new problems.

---

## 🚦 Pre-deploy / pre-release

### 8. Code review BEFORE high-cost deploys (TestFlight, prod, irreversible)

Before any high-cost deploy cycle — TestFlight build, production promotion, prod deploy, or any irreversible change — **dispatch parallel domain-specialist review agents to QA the diff**. Apply their findings BEFORE the cycle starts.

**Trigger conditions:**
- Pre-TF build (always, except for trivial changes)
- Pre-production-promotion PR merge (always)
- Pre-prod-deploy workflow dispatch (always)
- Any change with multi-repo blast radius
- Any change touching streaming / animation / fetch / timing / lifecycle / migrations
- Any change to auth, payments, IAP, or crisis detection

**Why:** During the 2026-05-03/04 SSE streaming sprint, multiple TF cycles were wasted on bugs that domain agents would have caught at code-review time (RN's `fetch` doesn't stream response bodies; lifecycle mismatches in streaming gradient text). Each TF cycle = 25-35 min wall-clock + Astro's testing attention. Each prod promotion = irreversible. **Five min of agent review beats one wasted cycle every time.**

**Source:** TF 205 self-review (May 4) caught a streaming-text lifecycle bug before archive. TF 211 self-review (May 11) caught the `mutations.retry: 3` data-corruption risk before archive.

### 9. Test once at the END of a multi-task sprint

When executing a multi-task sprint (3+ fixes), batch ALL changes into ONE TestFlight build cycle. Don't ask for intermediate testing.

- Backend / infra changes can ship continuously (CI deploys ~7 min, no user-facing TestFlight involvement).
- Mobile changes accumulate in a single branch and produce **one** TF build at the end.
- Tell Astro "ready to test" only when: (a) all backend deploys are live + healthy, (b) the TF build is uploaded AND processed by ASC, (c) Astro can install + test in one session.

**Exception:** if a SHIP-BLOCKER bug is discovered mid-sprint, get the fix in flight immediately. But don't ask for testing until the rest is also done.

**Source:** 2026-05-06. Astro: *"Each TF cycle costs me real attention. Iterative testing across small fixes wastes my time when most can't be validated independently anyway."*

### 10. Test the full flow programmatically BEFORE asking anyone to test in simulator/device

After deploying any change, simulate the full user flow via curl / API calls before telling anyone to test:

**Example: journal flow**
1. `POST /log`
2. Wait
3. `GET /log/:id` → verify `processed=true`, `summary` exists, `emotionArc` populated

**Example: deep chat flow**
1. `POST /deep-chat/conversations`
2. `POST .../complete`
3. Verify `status=COMPLETED`, `summary`, `artwork`

**Example: dive deeper**
1. `POST .../proposals`
2. Verify `proposals` array has items

**Example: every async flow**
1. Check pod logs for errors after each API call
2. Check RabbitMQ queue consumer counts (should be exactly 1 each)

Only after ALL checks pass: *"Verified via API — ready to test in simulator."*

---

## 🤖 When working with AI agents (Claude Code, etc.)

### 11. Agent dispatch discipline: findings BEFORE PR

When dispatching any subagent for code changes, the agent's prompt must say:

> Do NOT open a PR. Do NOT push a branch. Report findings + proposed diff back for review.

Agent returns:
1. Files touched with exact line ranges
2. Diff or before/after snippets
3. Which standing rules apply
4. Target branch they would use
5. Any judgment calls they made when the brief was ambiguous

A human reviews the proposal. **Only after approval** is the change applied (preferred: directly, by the dispatching human) or the agent sent back with *"approved, open the PR targeting X."*

**Source:** 2026-04-20. Two near-misses: iris (Memory Room flag) targeted wrong branch because no proper one existed; muse (journal 500) pivoted from API repro to static analysis without flagging it. Pattern: agents fill context gaps with training instincts that don't match team standards. Cost of a miss scales with blast radius.

### 12. Isolated git worktrees when running parallel agents in the same repo

When dispatching 2+ parallel agents that will both edit code in the **same repo**, give each agent an **isolated git worktree**:

```bash
cd /Users/astro/Projects/murror-transfer/Murror/<repo>
git worktree add -b <branch-A> /tmp/<task-A> <base>
git worktree add -b <branch-B> /tmp/<task-B> <base>
```

In each agent's prompt, **explicitly tell them which worktree path to work in** ("CRITICAL: work only in `/tmp/<task-A>`"). After agents return, commit + push from each worktree separately. Cleanup with `git worktree remove`.

**Why:** Hit this 3× during the 2026-05-06 perf sprint. Parallel agents in the same working tree silently overwrite each other's staged changes. Each agent reports success but the cumulative state is wrong.

---

## 📝 Style

### 13. No em-dashes in app copy or prompts

**Never** use em dashes (—) in any user-facing content — neither hand-written copy nor AI-generated.

- Locale files (`en.json`, `vi.json`, `ja.json`) — use commas or restructure.
- UI strings — same.
- AI generation prompts — every prompt asking an LLM to generate user-facing text MUST include: *"Never use em dashes (—). Use commas or restructure the sentence instead."*

**Source:** Style preference for cleaner, more accessible text. Em dashes feel academic or heavy in a wellness app context — and AI models over-use them, which makes the text read as AI-generated.

**Audit files** (add the rule when touching any of them):
- `viasr-api/app/services/instant_reflection/prompt.py`
- `viasr-api/app/services/takeaway/prompt.py`
- `viasr-api/app/prompts/*.yaml`
- `viasr-api/app/services/relationship/*` prompts

### 14. Visual-first communication

PR descriptions, docs, status updates — use tables, headers, bullet points, code blocks. Don't dump walls of plain text.

- Tables for comparisons, status lists, structured data
- Headers + sections for hierarchy
- Code blocks with syntax highlighting
- Bullet points over paragraphs
- Bold for key terms and important values
- Emoji as visual markers (✅ ❌ ⚠️ 📦 🔧) for at-a-glance status
- ASCII flow arrows (→, ↓) for architecture
- Before/after layouts for changes
- TL;DR at the top for long explanations
- Whitespace generous, don't cram

Every doc / response is a mini design artifact, not a text dump.

---

## 🎯 Commit + branch naming

- **Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/). `perf(mobile): ...`, `fix(detail): ...`, `chore(ios): ...`, `feat(memory-vault): ...`.
- **Branches:** `type/scope-description`. `perf/mobile-sprint-6`, `hotfix/conversation-detail-anim-stuck`, `chore/bump-build-209`, `feature/memory-room`.
- **PR titles:** mirror the commit prefix. Body has Summary + Test Plan checkboxes + Verification.

---

## 🚫 Specific gotchas

- **Mobile `console.*` is stripped from production bundles** by `babel-plugin-transform-remove-console`. Use `devLog`/`devWarn`/`devError`/`devInfo` from `MurrorMobile/src/common/dev-logger.ts`. CI fails the build if production console calls slip in.
- **Python `str, Enum` equality:** compare to `.value`, not the NAME literal. `MyEnum.FOO == "FOO"` is **False**; you need `MyEnum.FOO.value == "FOO"`. Caused a silent privacy-gate filtering bug previously.
- **`zsh` reserved variable names:** `status`, `path`, `cdpath`, `argv`, `history` are read-only built-ins. Never assign to them in shell commands.
- **iOS-only — never iPad.** Build target is iPhone only.

---

For why these conventions exist (specific incidents), see [`INCIDENT_LOG.md`](./INCIDENT_LOG.md). For the system context they protect, see [`ARCHITECTURE.md`](./ARCHITECTURE.md). For day-1 onboarding, see [`HANDOFF.md`](./HANDOFF.md).
