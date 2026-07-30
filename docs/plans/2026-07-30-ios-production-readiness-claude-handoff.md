# Murror iOS production-readiness handoff to Claude

**Prepared:** July 30, 2026 PDT  
**Current decision:** Staging is not yet approved for production promotion. Continue the remaining staging work, prepare the candidate and promotion evidence, then ask Astro again before any production mutation.

## Paste-ready continuation prompt

```text
You are continuing Murror's iOS mobile and API production-readiness work from Codex.

PRIMARY OBJECTIVE
Autonomously audit, fix, verify, and prepare Murror mobile and API staging so the staging state is safe to promote into the live production environment. Use parallel agents and two-account validation where it materially proves two-sided behavior. Do not deploy or mutate production without Astro's explicit approval after presenting the final evidence.

SCOPE
- iOS mobile only, plus the supporting murror-api and viasr-api services.
- Exclude Galaxy completely. Galaxy is an unfinished alpha feature, not part of this release.
- Exclude Android and Apple Watch.
- Do not repeat the five-step MTC guidance journey. Astro already tested all five steps successfully.
- Do test the complete Connection Reflection process after the guidance journey, including takeaway cards, pending/completed/final states, exact-card navigation, persistence, and both users' experiences.
- Include Solo and Duo subscription behavior, RevenueCat/StoreKit recovery, invites, ownership, restoration, and soft-paywall transitions.

WORKING RULES AND ASTRO PREFERENCES
- Continue existing implementations. Never rebuild a working surface from scratch.
- Read the current code and branch state before editing. Preserve unrelated user changes and dirty worktrees.
- Use a relevant specialist panel for a substantive new direction, but do not interrupt Astro for routine implementation decisions already agreed here.
- Manage reasoning effort automatically. Use the lowest safe effort and do not ask Astro to switch effort levels.
- Keep CI costs low. Use focused local tests first, allow one necessary hosted run after a coherent fix, and do not repeatedly rerun paid macOS jobs.
- Explain actions briefly in plain language.
- Use separate branches/worktrees and small targeted commits. PRs target staging branches first.
- Use port 5432 and MURROR_DATABASE_URL_EXTERNAL for migrations and one-off SQL. Never use the 6543 pooler for these operations.
- Never print secrets. Put required secrets in chmod-600 temporary files, then securely remove them.
- Never mutate production without explicit approval. Read-only production inspection is allowed only when needed and must not expose secrets.
- No em dash in product strings.
- Maintain storage hygiene. Check disk space during the work and delete only disposable artifacts created by the work. Do not mass-delete Astro's worktrees.
- Current disk snapshot: 237 GiB free, 73% used.

READ FIRST
1. /Users/astro/Projects/murror-transfer/Murror/CODEX_HANDOFF.md
2. /Users/astro/Projects/murror-transfer/Murror/docs/plans/2026-07-30-ios-production-readiness-claude-handoff.md
3. /Users/astro/Projects/murror-transfer/Murror/docs/plans/2026-07-28-connection-duo-verification-and-prod-readiness.md
4. /Users/astro/.claude/projects/-Users-astro-Projects-murror-transfer/memory/MEMORY.md, searching only for the area you touch

IMPORTANT ENVIRONMENT FACTS
- Container: /Users/astro/Projects/murror-transfer/Murror
- Mobile repo: /Users/astro/Projects/murror-transfer/Murror/MurrorMobile
- API repo: /Users/astro/Projects/murror-transfer/Murror/murror-api
- AI repo: /Users/astro/Projects/murror-transfer/Murror/viasr-api
- Mobile staging branch: staging-environment-setup
- API and AI staging branch: staging
- Staging targets only until the final approval gate: nsp-staging-murror, nsp-staging-murror-ai, Supabase sprkxmwrvgqgebajopwp
- The container root is intentionally dirty and contains many nested worktrees. Never run broad cleanup or reset commands there.

COMPLETED AND VERIFIED
1. API non-Galaxy migration allowlist merged in PR #681, merge 40acb5aeb52942872d2aa6be92e4146a685fcdea.
2. API private-media production-readiness hardening merged in PR #682, merge 35bbb50bd16f6cb897a04a59630adf1fa8b0b4a6.
3. API cost-aware CI merged in PR #683, merge b01cdb1e92bfcc469901d135fff01088826fca3e.
4. API staging deploy run 30573700416 succeeded end to end, including build, migration image, staging deploy, smoke test, release, and summary.
5. API staging live, ready, and aggregate health endpoints returned 200 after deployment.
6. AI private queue-payload logging was redacted in PR #595, merge 85f19d38ad8b036fe556aecf1130d6306f66f8ee. Staging run 30573560505 succeeded. Focused privacy tests passed.
7. Connection Reflection focused contracts passed: 46 API tests plus 46 mobile tests, 92 total. These cover creation/completion/get, insight generation and retries, realtime/notifications, offline completion retries, exact-card focus, cache refresh, card states, and recovery. They do not replace the remaining real two-account end-to-end proof.
8. Existing Duo/subscription audit passed 9 mobile suites with 92 tests and 5 API suites with 119 tests. It still found the runtime gaps listed below.
9. Mobile PR #958's current pushed revision d6934e63 has a fully green hosted CI run 30570998726, including Ubuntu checks, 2,582-unit-test coverage set, and a successful hosted iOS build. Do not merge it until the unpushed ODE Firebase launch fix below is finished and validated.
10. The API production-rehearsal and deployment work has not mutated production.

CRITICAL SECURITY NOTE
A production Postgres credential was exposed in internal command output during an earlier local rehearsal. Never repeat or print it. Rotation is mandatory before the live release. Rotation has NOT been authorized yet and must not happen until Astro explicitly approves it. The safe operation must pre-stage every consumer, quiesce clients, reset the Supabase password, update API/AI/worker/beat/dashboard copies across active clusters, canary services, and verify health. There is no safe rollback to the exposed password.

CURRENT IN-FLIGHT WORK

A. Mobile hosted E2E / ODE Firebase launch fix
- PR: https://github.com/Murror/MurrorMobile/pull/958
- Worktree: /Users/astro/Projects/murror-transfer/Murror/mobile-ci-cost-lifecycle
- Branch: ci/mobile-actions-cost-lifecycle
- Current pushed head: 854158759d766b7f36976032e54f3c283284670b
- Commit `85415875` contains the ODE Firebase launch fix in exactly three files:
  - .github/workflows/e2e.yaml
  - ios/MurrorMobile.xcodeproj/project.pbxproj
  - scripts/ci/verify-workflow-contracts.mjs
- Root cause is proven: MurrorMobileODE launches then aborts at FirebaseApp.configure because GoogleService-Info.plist is absent from the ODE bundle. Manually adding the tracked plist kept the process alive.
- The local fix adds the tracked plist to ODE Resources only and adds a pre-WebDriverIO install/launch/PID-survival gate. It does not change environment selection.
- Evidence is green locally: workflow contract PASS, git diff check, bundled plist present and valid, clean Xcode 26.6 simulator build, Metro bundle, and direct iOS 26.4 process-survival proof after five seconds.
- Temporary simulator, Metro process, vendor symlink, build evidence directory, and pod-install log were cleaned. Disk free space increased to 241 GiB.
- Hosted PR run `30575281935` is now running. Exact next action: wait for this single run, inspect failures rather than rerunning blindly, then merge PR #958 to staging only if every required check is green.

B. iOS subscription offering timeout and Restore lock
- Worktree: /Users/astro/Projects/murror-transfer/Murror/MurrorMobile-worktrees/ios-storekit-offering-timeout-restore-lock
- Branch: fix/ios-storekit-offering-timeout-and-restore-lock
- Base: origin/staging-environment-setup at d650803a
- No commit, push, PR, or CI yet.
- Only two test files are modified and uncommitted:
  - src/hooks/use-subscription-prices.spec.ts
  - src/screens/setting/subscription-screen.spec.tsx
- The two focused Jest suites have now run using the primary checkout's dependency tree: 33 existing tests passed and 3 new tests failed. The hook remained `loading` after 10 seconds, and the full screen did not surface Retry, proving the missing timeout. The Restore test did not reach `Purchases.purchasePackage`, so correct that test's selected-plan/purchase setup before treating it as mutex evidence.
- Implement a shared iOS-only 10-second timeout around both Purchases.getOfferings() calls so a hung SDK reaches the existing unavailable/Retry state.
- Keep telemetry privacy-safe: operation, surface, outcome, and latency_ms only. Never log receipts, transaction ids, or private user content.
- Make Restore acquire the same global purchaseOperationMutex, disable Restore during purchase or restore, and add/preserve a stable testID.
- Then run focused Jest, ESLint for touched files, yarn tsc --noEmit, and git diff --check. Commit, push, and open a PR to staging-environment-setup.
- Notion mapping: closes the remaining SUB-3 Restore race and SUB-5 indefinite-offering-load gap. SUB-4 and SUB-6 code paths were already fixed but still need real Apple Sandbox evidence.

C. AI production release gate
- PR: https://github.com/Murror/viasr-api/pull/596
- Worktree: /Users/astro/Projects/murror-transfer/Murror/viasr-api-worktrees/prod-release-gates
- Branch: fix/prod-release-gates
- Head: 3f6cccaebcb60e8f9ffb6aecb88d8923e6a4a5ec
- Production source guard passes on PRs and remains fail-closed for production.
- Commit `3f6ccca` removed the invalid pre-install Poetry cache lookup. Local actionlint, focused CI tests, Ruff, and diff checks passed.
- PR #596 is merged into staging at `3a642962f26363c0939151a111e57f2277870639` after every required PR check passed and the production deploy job was skipped.
- Automatic staging run `30575394844` is in progress.
- Exact next action: wait for that single staging run, confirm the staging deployment succeeds, and verify AI staging health. Do not dispatch production.

D. Kubernetes hardening, staging first
- API worktree: /Users/astro/Projects/murror-transfer/Murror/murror-api-k8s-hardening
- AI worktree: /Users/astro/Projects/murror-transfer/Murror/viasr-api-k8s-hardening
- Branch in each: fix/staging-kubernetes-hardening
- Both are clean with no edits/PRs.
- Existing baseline: API image already UID/GID 1001 with partial pod security; AI image uses UID 1000; AI readiness is DB-aware. Missing work includes readOnlyRootFilesystem compatibility, AI worker/beat/Cron contexts, ghost-secret cleanup, namespace-policy compatibility, and complete dependency mapping.
- Do a read-only SGP1 topology inspection first. Never read secret values. Map every external Supabase/Redis/RabbitMQ/API dependency before default-deny policies because standard NetworkPolicy cannot allow DNS names.
- Do not apply PSA restricted until every pod-producing workload is compatible. Add contract tests, render Helm/envsubst, and perform server-side dry-run against staging only before opening separate API and AI PRs.

OPEN PRODUCT/RELEASE GATES
1. SUB-2 chat-reflection keyboard dismissal while typing is still open and unassigned. Reproduce on iOS, isolate ownership, add a regression test where possible, fix on its own branch, and verify on device/simulator.
2. Run a real two-account Connection Reflection lifecycle on two iOS simulators or devices: sender creates/shares, receiver gets exactly one pending card, receiver completes, both reach the same final insight, exact notification/deep-link focus works, no stacked/duplicate card state appears, and relaunch preserves state. Do not rerun the five-step guide itself.
3. Run real Apple Sandbox subscription validation on two physical iPhones/testers after subscription fixes merge:
   - offering loads or reaches Retry within the timeout
   - repeated purchase/Restore taps yield one StoreKit operation
   - Solo monthly/yearly purchase, relaunch, reinstall, and Restore converge to Premium
   - Duo purchase converges to organizer ownership and bounded invite/setup state
   - second account accepts, organizer/member states persist after relaunch
   - cross-account switching leaks no cached ownership or handoff
4. Verify RevenueCat production API key permissions with a non-mutating product-read check. An older check returned HTTP 403, so do not assume it is resolved.
5. Update the five subscription Notion issues only after code plus runtime evidence exists: SUB-3, SUB-4, SUB-5, SUB-6, and SUB-2.
6. After every staging fix is merged, fetch the current App Store Connect build number, bump once on a dedicated branch, archive the staging iOS candidate, upload one TestFlight build, and verify processing. Do not create duplicate builds.
7. Prepare an exact production-snapshot migration rehearsal using only the non-Galaxy migration allowlist. It must be isolated and non-production first. Compare schema/data/config behavior and preserve production-only capabilities.
8. Before any live promotion, rotate the exposed production database credential with Astro's separate approval.
9. Produce a final promotion dossier: exact mobile/API/AI commits, migration list, configuration diff, test matrix, two-account evidence, Apple Sandbox evidence, security findings, rollback/forward-fix plan, health checks, and explicit remaining risks.
10. Ask Astro for final production approval. Do not deploy production merely because staging/TestFlight is green.

KNOWN RELEASE REALITY
- Production has historically contained branch/image drift and production-only capabilities. Treat the actual live image/config/schema as authoritative, not only the production branch.
- Earlier investigation found a production image off-branch and far behind the production branch. Re-inspect current state read-only before preparing promotion.
- A final TestFlight candidate is not proof that the backend promotion is safe. Both mobile and service evidence are required.

GITHUB/CI GOTCHA
- The current gh token may lack workflow scope, so CLI merge can fail for PRs that edit workflow files. Do not work around branch protection. Use an appropriately authorized GitHub UI/session or refresh authentication, then merge only after green checks.

DEFINITION OF DONE
- All relevant staging fixes are merged and deployed.
- iOS hosted build and ODE/Appium launch proof are green.
- Two-account Connection Reflection lifecycle is proven end to end.
- Solo/Duo Apple Sandbox flows are proven on two iOS accounts/devices.
- No open P0/P1 release blocker remains.
- Security hardening and exact migration rehearsal are complete enough for the promotion risk level.
- The exposed production database credential has been rotated with explicit approval.
- One final TestFlight candidate is processed and identified.
- The promotion dossier is complete.
- Astro explicitly approves production mutation afterward.

Start by taking fresh git status and PR/check snapshots in every listed worktree. Preserve the uncommitted work exactly. Finish the smallest already-in-flight validation lanes first, then merge only green PRs into staging. Keep Astro updated at meaningful milestones rather than asking routine questions.
```

## Current release assessment

The staging line has materially improved and core Connection Reflection contracts are green, but it is **not yet production-ready**. The remaining blockers are concrete rather than exploratory: finish three in-flight iOS/AI fixes, validate subscriptions and Connection Reflection across two real accounts, close the keyboard issue, complete staging-first infrastructure hardening, rehearse the exact non-Galaxy promotion, rotate the exposed database credential with approval, and cut one final TestFlight candidate.

## Evidence links

- API migration allowlist: https://github.com/Murror/murror-api/pull/681
- API private media: https://github.com/Murror/murror-api/pull/682
- API CI lifecycle: https://github.com/Murror/murror-api/pull/683
- API successful staging deployment: https://github.com/Murror/murror-api/actions/runs/30573700416
- AI private log redaction: https://github.com/Murror/viasr-api/pull/595
- AI production release gate: https://github.com/Murror/viasr-api/pull/596
- Mobile hosted iOS lifecycle and E2E work: https://github.com/Murror/MurrorMobile/pull/958
- Mobile green hosted run before the local ODE fix: https://github.com/Murror/MurrorMobile/actions/runs/30570998726

## Storage and cleanup ledger

- Disk at handoff: 237 GiB free, 73% used.
- Retain the listed dirty worktrees because they contain intentional continuation work.
- The ODE worktree owns a temporary `vendor` symlink and `/tmp/murror-pr958-*` artifacts. Remove them after simulator-survival evidence is captured.
- The subscription worktree has no `node_modules`; reuse the primary checkout dependency tree without copying it.
- The Kubernetes hardening worktrees are clean and intentionally retained.

## Public documentation decision

No public progress-page update was made. This handoff records internal release engineering, security, and unfinished validation work rather than a newly shipped user-facing capability.
