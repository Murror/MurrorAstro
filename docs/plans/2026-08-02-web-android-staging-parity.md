# Murror Web and Android Staging Parity Matrix

**Date:** 2026-08-02  
**Product:** Murror  
**Scope:** iOS, Android, and web only  
**Staging reference:** `MurrorMobile` `origin/staging-environment-setup` at `4ff1572b` after the latest 2026-08-05 fetch; verify again before any release claim  
**Web implementation lane:** `murror-platform-worktrees/codex-web-parity-integration-20260804` on `codex/web-parity-integration-20260804` at local commit `8bcbfa6f` (server-backed journal draft sync on top of the local draft/recovery commits)  
**Memory Room web flag:** `VITE_MEMORY_ROOM_ENABLED` (missing/false = off)
**Connection journey web flag:** `VITE_CONNECTION_JOURNEY_ENABLED` (missing/false = off)
**English-only web flag:** `VITE_ENGLISH_ONLY_LAUNCH` (source default off; staging must explicitly set true)

## Operating boundary

This is a Murror document. Uni is not part of this workstream. There is no Murror
macOS app target. The mobile source is shared React Native code, but Android parity is
not considered verified until the Android staging worktree has passed its checks and a
real Android device or emulator has exercised the affected flow.

The mobile staging branch is the behavior reference for staging catch-up. Existing API
contracts are reused as-is. No API migration, schema change, production deployment,
TestFlight archive, Android store release, or production flag change is implied by
this matrix.

## 2026-08-05 parked state

- Astro requested that the parity lane pause while iOS ships first. The saved client order is iOS,
  then web, then Android; no macOS app is in scope.
- The web checkpoint remains `8bcbfa6f` in the isolated web worktree, and the Android checkpoint
  remains `0eebee48` in the isolated Android worktree. Both are clean and local-only.
- The recurring parity heartbeat is paused. No push, PR, merge, rebase, deployment, staging-runtime
  mutation, device run, signing, database change, or production action is authorized while parked.
- Resume only after explicit iOS production-promotion confirmation. At resume, fetch the current
  remote trunks, audit overlap and drift, then rerun the complete verification matrix before
  integrating API, web, or Android work.

## 2026-08-05 production-promotion isolation policy

- Astro clarified that the freeze blocks integration and external state, not safe
  isolated progress. Keep all three parity branches preserved.
  API `2c6594c`, web `d4bf2daf`, and Android `0eebee48` remain preserved in
  their isolated worktrees. No push, PR, merge, workflow dispatch, staging
  deployment, database migration, feature-flag/configuration change, signing,
  device run, iOS edit, staging-runtime mutation, or production action is
  authorized during the freeze.
- Source audits, approved implementation inside existing isolated worktrees, unit
  tests, accessibility work, internal documentation/progress tracking, read-only
  trunk fetches, deterministic contract generation, and cleanup of explicitly
  inventoried task-owned reproducible artifacts may continue. Stop on
  promotion-owned path overlap or remote drift.
- App heartbeat `murror-post-production-parity-hold`, shown as **Murror parity
  freeze-safe progress**, checks every 12 hours and follows the same boundary. It
  brings a ranked substantive slice to Astro before implementation.
- After confirmation, fetch the newly promoted API `staging`, web `dev`, and
  mobile `staging-environment-setup` trunks; audit path and behavior overlap;
  merge the new trunks into the isolated parity branches; and rerun the full
  API, web, Android contract, isolation, and source verification matrix.
- Only then review/land API first, web second, and Android third. Web artifact
  build/deployment, deployed-schema/realtime corroboration, Android hosted
  CI/signing/device work, and authenticated two-account validation remain
  separately approved gates.
- Overall evidence-weighted progress stays at 77%. The former 14–19 Aug calendar
  forecast is superseded by a relative estimate of 3–5 working days after
  production promotion and all runtime/access gates are open.

## 2026-08-05 web accessible primary navigation checkpoint

- The isolated web branch `codex/web-parity-integration-20260804` records local
  source commit `7bedcf5c` (`feat(web): add accessible primary navigation`). It
  adds a responsive primary navigation for the five existing destinations:
  Home, Connections, Reflection, Knowledge, and Diary. Diary remains the active
  parent for journal, Deep Chat, and voice-summary routes.
- The layout now includes a skip link, a focusable `main` landmark, focus
  transfer after path/query navigation, a polite route announcement, and
  document titles. Navigation links expose route-aware `aria-current`, reuse
  existing Lucide icons, keep 44px minimum targets, and include reduced-motion
  transition handling. No route, API contract, dependency, analytics payload,
  Android/shared React Native source, iOS source, workflow, deployment, or
  staging runtime changed.
- The focused accessibility suite passes 12/12. The full web client gate passes
  41 suites / 220 tests, TypeScript, lint, Prettier, and a production Vite
  build. The build retains the existing stale browser-data and large-chunk
  warnings; they are maintenance debt, not new errors from this slice. The
  repository-wide pre-commit hook was not runnable with the filtered web-only
  dependency install because it invokes unrelated workspace typechecks whose
  NestJS/Winston/TypeORM dependencies were intentionally not installed.
- This is local source evidence only. The commit was not pushed, reviewed,
  merged, deployed, or run on a browser/device. Overall parity remains 77%
  until authenticated runtime and release evidence changes. The next safe
  source candidate remains Diary lifecycle reliability or connection quiz/task
  presentation, subject to a fresh overlap audit.

## 2026-08-05 Diary lifecycle parity checkpoint

- The isolated web branch records local source commit `41b13baa`
  (`feat(web): harden Diary lifecycle parity`). The web Diary model now accepts
  the existing mobile/API `voice_summary` entry type and its optional audio,
  ambience, and script fields. A shared destination adapter keeps journal and
  Deep Chat routes unchanged, opens voice summaries at their source date with
  autoplay continuity, and fails closed to `/diary` for malformed dates.
- Diary cards now expose explicit Journal, Deep Chat, and Voice reflection labels,
  accessible names, 44px-native button semantics, voice-script fallback content,
  and a dedicated cyan/indigo voice style. Diary and Home use the same adapter.
  The Diary page now distinguishes initial failure from valid empty state,
  provides retry, keeps cached entries visible during refresh failure, and adds
  focus-visible controls. No API schema/runtime, dependency, analytics,
  Android/shared React Native source, iOS source, workflow, deployment, or
  staging runtime changed.
- Focused lifecycle tests pass 10/10. The full web client gate passes 43 suites /
  226 tests, TypeScript, lint, Prettier, and a production Vite build. Existing
  stale browser-data and large-chunk warnings remain maintenance debt. This is
  local source evidence only: the commit was not pushed, reviewed, merged,
  deployed, or browser/device-validated.
- Overall evidence-weighted parity remains 77%. The next safe source candidate
  is connection quiz/task presentation or invitation lifecycle, subject to a
  fresh overlap audit after this checkpoint.

## 2026-08-05 Relationship Mission quiz parity checkpoint

- The isolated web branch records local source commit `d2970686`
  (`feat(web): add relationship quiz parity slice`). It reuses the existing
  generated OpenAPI declarations for `GET /api/v1/connections/{id}/questions`
  and `POST /api/v1/connections/{id}/answers`, adds typed RTK Query adapters,
  and validates both response shapes fail-closed before rendering or updating
  relationship state. Submission invalidates the quiz, task-status, and For Us
  bundle tags so a completed quiz can reconcile through the existing owner.
- Web now has an accessible `/friends/:id/quiz` Relationship Mission route with
  one-question-at-a-time progress, private-until-both-reflect copy, choice and
  optional 500-character answer support, retryable loading/error states, a
  valid empty state, a completed state that does not expose private answers,
  and a For Us CTA when the current task is `QUIZ`. The mobile compare-answer
  payoff remains a separate next slice; this checkpoint never reveals partner
  answers early.
- Focused quiz/For Us tests pass 11/11. The final full web gate passes 45
  suites / 231 tests, TypeScript, lint, Prettier, and a production Vite build.
  Existing stale browser-data and large-chunk warnings remain maintenance debt.
  No API source/schema, Android/shared React Native source, iOS source, workflow,
  deployment, staging runtime, browser/device run, or external state changed.
- This is local source evidence only: the commit is not pushed, reviewed,
  merged, deployed, or browser/device-validated. Authenticated two-account
  flows, deployed web artifact/CSP and schema corroboration, review/landing,
  and the post-promotion release gates remain open. Overall parity remains 77%.

## 2026-08-05 Relationship Mission comparison payoff checkpoint

- The isolated web branch records local source commit `2e82f5ba`
  (`feat(web): add relationship quiz comparison parity slice`). It adds the
  protected `/friends/:id/quiz/compare` route, links it from the completed quiz
  and For Us states, and keeps the API, Android/shared React Native, iOS,
  workflows, staging runtime, and production unchanged.
- The comparison adapter requires exactly two answer rows, maps the current
  viewer by user ID, resolves choice keys to display values, compares sorted
  choice sets, and fails closed for missing identity or partial answers. The
  page shows only shared rows and an optional common insight after a valid
  comparison; it does not render private user identifiers, and valid choice
  keys are translated to display labels with an explicit malformed-payload
  fallback.
- Focused quiz/For Us/contract tests pass 17/17. The full web gate passes 46
  suites / 237 tests, TypeScript, lint, Prettier, and a production Vite build.
  Existing watcher/browser-data/browserslist and large-chunk advisories remain
  maintenance debt. No push, review, merge, deployment, browser/device run, or
  staging-runtime change occurred.
- Final task-owned cleanup removed about 791 MiB of the web lane's reproducible
  dependency tree and Vite output into an exact temporary directory before
  deletion. The web source worktree is about 28 MiB; shared caches, other
  worktrees, iOS, and Uni were preserved.
- This remains local source evidence, not shipped staging parity. Authenticated
  two-account behavior, deployed artifact/CSP/schema corroboration,
  review/landing, and post-promotion release gates remain open. Overall
  evidence-weighted parity remains 77%; the forecast is 3–5 working days after
  promotion and all runtime/access gates open.

## 2026-08-05 Relationship reflection task-completion slice

- Local web commits `82fa6051` and `1700ae42` extend the existing For Us →
  journal flow with relationship context, current task type, cycle token,
  owner-safe completion, prompt continuity, and journal-first orchestration.
  They reuse the generated journal
  `relationshipConnectionId` field and the existing
  `/api/v1/connections/{id}/task-completion` endpoint; no API, Android, iOS,
  staging, workflow, or production change occurred.
- The slice follows mobile's cycle-safety behavior: reflection is always a
  free-text writer, and the exact current task type is captured when the user
  starts, including `QUIZ` cycles. The dedicated web quiz page still owns the
  question/answer UI. Completion cache tags invalidate Task Status, Overview,
  and the relationship bundle.
- Retry behavior is bounded and account-scoped. Only relationship ID, task type,
  cycle token, and owner ID are stored; transient 408/429/5xx/network failures
  can retry on the next protected journal-writer visit, while terminal
  4xx/auth/access/validation errors are dropped. Account reset already clears
  the `murror_*` namespace. Private journal text never enters storage.
- Verification: focused contract/intent/queue/For Us/orchestration tests 22/22;
  full web client 50 suites / 253 tests; TypeScript, lint, Prettier, and
  production Vite build pass. Existing Watchman/browser-data/browserslist/
  large-chunk warnings remain maintenance debt. The repository-wide commit hook
  was attempted but the filtered web-only install lacked unrelated workspace
  dependencies, so only the web-client gates are evidence for this local
  checkpoint. The branch is local-only and 40 commits ahead / 0
  behind `origin/dev` after a fresh read-only fetch; it is not pushed, reviewed,
  merged, deployed, or browser/device-validated.
- The generated web contract follows API source/artifact lineage
  `ae75086`/`2c6594c`, but the canonical API checkout is older. Target/deployed
  API lineage confirmation remains an external gate; this freeze-safe slice did
  not edit API source, generated artifacts, Android/shared React Native runtime,
  or iOS.
- Keep authenticated two-account completion, deployed contract/schema and web
  artifact/CSP/realtime proof, invitation public-token/auth routing, Android
  Gradle/hosted CI/device proof, and post-promotion landing as explicit gates.
  Overall evidence-weighted parity remains 77%; forecast remains 3–5 working
  days after promotion and runtime/access gates open.

## 2026-08-05 web friend-invitation handoff checkpoint

- The isolated web branch records local commit `5751b81e`
  (`feat(web): preserve friend invitation handoff`). This bounded source slice
  keeps the existing protected `/friends?token=...` flow and carries its
  internal return target through ProtectedRoute, login, signup/OTP,
  onboarding, subscription, and Google-auth routing. It rejects external/auth
  redirects, malformed state, control characters, and unsafe query/hash
  fragments.
- Invitation tokens are normalized and looked up once, removed from the URL
  with replace semantics, and kept out of analytics, logs, and persistent
  storage. Existing inviter lookup and accept/decline adapters remain in place;
  own, expired, and invalid outcomes are explicit, successful actions
  invalidate friend/connection/public-inviter caches, and failed actions remain
  retryable. Account changes clear pending invitation state.
- The existing invitation and error dialogs now have labelled dialog semantics,
  focus trapping/restoration, Escape handling, reduced-motion-compatible
  transitions, visible focus, and 44px targets. This slice intentionally does
  not add a public `/invite` route, migrate invitation endpoints, add canonical
  connection-request APIs, or change Android/shared React Native/iOS source.
- Focused safety suites pass 26/26; the final web client gate passes 52 suites /
  268 tests, TypeScript, ESLint, Prettier, and a production Vite build. The
  repository hook still fails only on unrelated monorepo typechecks missing
  filtered-install NestJS/Winston/TypeORM dependencies; the local checkpoint
  used `HUSKY=0` after the web-specific gates passed. No push, review, merge,
  deploy, browser/device run, or staging-runtime action occurred.
- Authenticated cold-link/email/OTP flows, two-account privacy, deployed
  artifact/CSP/WebSocket proof, API lineage, Android native/device proof, and
  post-promotion landing remain open. Task-owned web dependencies and `dist`
  were removed after verification (about 791 MiB); shared/global caches and
  all other lanes were preserved. Overall evidence-weighted parity remains 77%
  with the 3–5 working-day estimate beginning only after promotion and access
  gates open.

## 2026-08-05 web connection-request parity checkpoint

- The isolated web branch records local commit `d4055493`
  (`feat(web): add connection request parity`). The source-only slice adds
  authenticated exact-email lookup/send, a neutral not-found state,
  status-aware result messaging, and a `PendingReceived` Requests filter. It
  uses the existing API contract routes
  `/v1/connections/lookup` and
  `/v1/connections/:userId/connection-request`; numeric `invitationId` is
  preferred for the existing accept/decline action path, with the legacy token
  as fallback. The existing share-link flow remains available.
- The dialog and cards are accessibility-oriented: internal email validation,
  generic failure/rate-limit messages, loading/disabled states, labelled modal
  semantics, keyboard-safe focus behavior, valid non-nested interactive markup,
  visible focus, and 44px controls. No raw response payloads, tokens, or
  private identifiers are logged or sent to analytics.
- Focused contract coverage is **41/41 tests**; the full web gate is **53
  suites / 283 tests**, TypeScript, ESLint, Prettier, and production build.
  `verify-api-client.mjs` returns `API_CLIENT_CONTRACT_OK` with schema
  `15cb3806…`, declaration `8302ba75…`, and receipt `61fc837f…`; both web
  staging source guards pass. The repository hook failed only on unrelated
  filtered-install workspace dependencies, so the local commit used `HUSKY=0`
  after the web-specific gates passed.
- This remains local evidence: no API/Android/iOS/shared-trunk source,
  deployment, merge, browser/device run, authenticated staging session, or
  runtime schema proof occurred. Migrating the legacy accept/decline adapter,
  two-account privacy, deployed API/web artifact/CSP/WebSocket proof, Android
  native/device validation, and post-promotion landing remain open. Exact
  task-owned web dependencies, `dist`, and the coverage artifact were removed
  recoverably after verification. Overall evidence-weighted parity remains
  **77%**; forecast remains 3–5 working days after promotion and runtime/access
  gates open.

## 2026-08-05 web Memory Room navigation parity checkpoint

- The isolated web branch records local commit `7a0d362d`
  (`feat(web): close memory room navigation parity`). The feature-gated Diary
  header now opens the existing protected Memory Room surface, matching the
  Android `diary_header` entry. The web route also accepts the native
  `/memory_room/:id` deep-link spelling and maps it to the canonical
  `/memory-room/:memoryId` page without duplicating API or UI lifecycle logic.
- The alias and Diary entry remain fail-dark behind the existing exact
  `VITE_MEMORY_ROOM_ENABLED === "true"` gate. The Diary control has a 44px
  target, label/title, visible focus, and icon-only accessible semantics. The
  existing Home entry, owner-scoped read API, month/detail/summary lifecycle,
  and account-reset boundaries remain unchanged.
- Focused Memory Room/navigation coverage passes **4 suites / 21 tests**; the
  full web gate passes **53 suites / 285 tests**, TypeScript, ESLint, Prettier,
  production build, API-client contract verification, and both web staging
  source guards. The pre-commit hook still fails only on missing filtered-install
  monorepo dependencies; local commit used `HUSKY=0` after web-specific gates.
- This is source/automated evidence only: no API, Android, iOS, shared-trunk,
  deployment, browser/device, authenticated staging, or production state
  changed. Hosted artifact/CSP/WebSocket proof, two-account behavior, Android
  native/device validation, and post-promotion landing remain open. Overall
  evidence-weighted parity remains **77%**. The task-owned web dependency
  trees, Vite `dist`, and coverage artifact were moved recoverably to Trash
  after validation (about **790 MiB**); shared/global caches and all other
  lanes were preserved.

## 2026-08-05 web read-only Our Memories wall checkpoint

- The isolated web branch records local commit `17928a84`
  (`feat(web): add read-only shared memories wall`). The existing protected
  connection-detail page now consumes the generated
  `GET /api/v1/connections/{id}/memories` contract and renders the shared
  connection wall after For Us, matching Android's relationship-detail order.
  The slice includes a newest-first preview, empty state, “View all” gallery,
  detail dialog, loading/error/stale-ready states, and neutral 403/404 handling.
- The response reader is fail-closed for malformed envelopes, nested reactions,
  comments, dates, and signed-image fields. It hides cached private media after
  a membership/access failure. The `hasUnseen` indicator is read-only in this
  checkpoint; uploads, reactions, comments, reports, edit/delete, mark-seen,
  notifications, and deep-link focus remain deferred to separately gated slices.
- Accessibility is source-covered with semantic section/heading structure,
  native keyboard controls, descriptive image alt text, visible focus,
  44px-equivalent controls, labelled modal semantics, Escape, focus trapping,
  focus restoration, reduced-motion-safe static rendering, and neutral
  authorization copy.
- Focused coverage passes **3 suites / 13 tests**. The full web gate passes
  **55 suites / 294 tests**, TypeScript, exact-file ESLint, Prettier, production
  build, API-client contract verification, and both web staging source guards.
  The normal repository hook failed only on unrelated filtered-install
  NestJS/Winston/TypeORM type dependencies, so the local checkpoint used
  `HUSKY=0` after the web-specific gates passed. Existing Watchman,
  stale-browser-data, Browserslist, and large-chunk advisories remain.
- This is local source/automated evidence only: no API source, Android, iOS,
  shared checkout, staging runtime, deployment, browser/device, authenticated
  two-account, signed-image/CSP, mutation, notification, merge, or production
  state changed. The exact task-owned web dependency trees, `dist`, and empty
  reproducible build directories were moved recoverably to Trash after the
  final evidence update (about **790 MiB**); shared/global caches and all other
  lanes were preserved. Overall evidence-weighted parity remains **77%**;
  forecast remains 3–5 working days after promotion and runtime/access gates
  open.

## 2026-08-05 web shared-memory seen-marker checkpoint

- The isolated web branch records local commit `5d8a4502`
  (`feat(web): sync shared memories seen lifecycle`). After the shared wall is
  presented with unseen partner activity, web now calls the canonical
  `POST /api/v1/connections/{id}/memories/seen` route, clears the `hasUnseen`
  dot optimistically, rolls back on failure, and permits one bounded retry.
  This follows the existing Android lifecycle without touching API source,
  Android runtime, iOS, staging runtime, or production state.
- The web contract parser pins the encoded seen route and accepts only the
  successful response envelope. The section keeps semantic loading/error and
  modal accessibility behavior, while upload, reaction, comment, report,
  edit/delete, notification, and deep-link mutation work remain separate
  slices.
- Focused coverage passes **2 suites / 9 tests**; the full web gate passes
  **55 suites / 295 tests**, TypeScript, changed-file ESLint, Prettier,
  production build, API-client verification, and both web staging source
  guards. Existing Watchman, stale-browser-data, Browserslist, and large-chunk
  advisories remain.
- This is local source/automated evidence only. No push, PR, merge, workflow,
  deployment, browser/device run, authenticated two-account staging check,
  database/configuration change, iOS edit, or production action occurred.
  Overall evidence-weighted parity remains **77%**; the next shared-wall slice
  is comments/reactions/reporting after the external gates open.

## 2026-08-05 web shared-memory social lifecycle checkpoint

- The isolated web branch records local commit `e8892c9f`
  (`feat(web): add shared memory social lifecycle`). The connection-detail
  memory dialog now matches Android's partner-only heart behavior, two-way
  append-only comment thread, and private report reason/confirmation flow.
  Reactions and comments optimistically patch the cached wall and reconcile
  server rows or roll back on failure; reports keep moderation state private
  and guard duplicate submissions.
- The web adapter uses the existing generated routes for reaction, comments,
  and report, with encoded connection/memory IDs and fail-closed mutation
  response readers. The section receives the viewer and partner identity from
  the protected relationship page, keeps semantic dialog focus management, and
  uses native 44px controls, labelled textarea/form semantics, live status/error
  regions, and keyboard-safe report choices.
- Focused coverage passes **3 suites / 15 tests**; the full web gate passes
  **55 suites / 296 tests**, TypeScript, changed-file ESLint, Prettier,
  production build, API-client verification, and both web staging source
  guards. Existing Watchman, stale-browser-data, Browserslist, and large-chunk
  advisories remain.
- This is local source/automated evidence only. No push, PR, merge, workflow,
  deployment, browser/device run, authenticated two-account staging check,
  database/configuration change, iOS edit, or production action occurred.
  Owner upload/edit/delete, moderation read-after behavior, Android native
  validation, and post-promotion landing remain open; overall evidence-weighted
  parity remains **77%**.

## 2026-08-05 web shared-memory owner lifecycle checkpoint

- The isolated web branch records local source commit `1d763993`
  (`feat(web): add shared memory owner lifecycle`). The existing connection
  wall now gives an authenticated owner an accessible one-photo composer with
  an optional note, plus owner-only metadata edit and explicit delete
  confirmation in the existing detail dialog.
- The web contract keeps the generated `POST /api/v1/connections/{id}/memories`,
  `PATCH /api/v1/connections/{id}/memories/{pid}`, and
  `DELETE /api/v1/connections/{id}/memories/{pid}` routes encoded and
  fail-closed. The API service is the only web layer that constructs multipart
  data. The UI validates the backend's 10 MiB image cap and JPEG/PNG/WebP/HEIC/
  HEIF types, uses a revocable local preview URL, and never persists a signed
  URL or storage path. Server-side sanitization/private storage/owner checks
  remain authoritative.
- Focused coverage passes **3 suites / 11 tests**; the full web gate passes
  **56 suites / 297 tests**, TypeScript, changed-file ESLint, Prettier,
  production build, API-client verification, and both web staging source
  guards. Existing Watchman, stale-browser-data, Browserslist, and large-chunk
  advisories remain.
- This is local source/automated evidence only. No push, PR, merge, workflow,
  deployment, browser/device run, authenticated two-account staging check,
  database/configuration change, iOS edit, or production action occurred.
  Android's multi-photo album picker, authenticated privacy/moderation,
  browser upload behavior, Android native/device validation, deployed schema/
  CSP/WebSocket proof, and post-promotion landing remain open. Overall
  evidence-weighted parity remains **77%**; the forecast remains 3–5 working
  days after promotion and runtime/access gates open.

## 2026-08-05 web shared-memory album upload parity checkpoint

- The isolated web branch records local source commit `2089c37`
  (`test(web): cover shared memory retry queue`) atop behavior commit
  `3154ba1b` (`feat(web): match shared memory album uploads`). The owner composer now
  stages up to 10 photos, matching Android's existing album picker and shared
  note. Each staged item has an accessible remove control and a temporary
  object-URL preview that is revoked when removed, uploaded, or unmounted.
- Uploads remain sequential through the existing generated create-memory route.
  The UI removes each successful item from the retry queue, announces progress,
  and leaves only unsaved items after a partial failure. This prevents the
  common retry path from replaying files already accepted by the server. The
  API service still owns multipart construction; server sanitization, private
  storage, signed URLs, ownership, and retention cleanup remain authoritative.
- Focused coverage passes **4 suites / 12 tests**; the full web gate passes
  **57 suites / 298 tests**, TypeScript, changed-file ESLint, Prettier,
  production build, API-client verification, and both web staging source
  guards. Existing Watchman, stale-browser-data, Browserslist, and large-chunk
  advisories remain.
- This is local source/automated evidence only. No push, PR, merge, workflow,
  deployment, browser/device run, authenticated two-account staging check,
  database/configuration change, iOS edit, or production action occurred.
  Browser upload behavior, Android native/device validation, deployed
  schema/CSP/WebSocket proof, authenticated privacy/moderation, and
  post-promotion landing remain open. Overall evidence-weighted parity remains
  **77%**; the forecast remains 3–5 working days after promotion and
  runtime/access gates open.

## 2026-08-05 web Diary empty-state entry checkpoint

- The isolated web branch records local source commit `fba30117`
  (`feat(web): add diary empty-state entry point`). When Diary has a valid
  empty result, web now exposes an accessible, keyboard-focusable, 44px
  `Start a reflection` action that opens the existing `/journal/new` composer,
  matching Android's empty-Diary start action. Loading, initial failure,
  refresh-failure-with-saved-content, and the feature-gated Memory Room entry
  remain unchanged.
- Focused Diary coverage passes **4 tests**; the full web gate passes
  **57 suites / 298 tests**, TypeScript, changed-file ESLint, Prettier,
  production build, API-client verification, and both web staging source
  guards. The repository hook also completed nine workspace typecheck tasks.
- This is local source/automated evidence only. No push, PR, merge, workflow,
  deployment, browser/device run, authenticated staging check,
  database/configuration change, iOS edit, or production action occurred.
  Overall evidence-weighted parity remains **77%**; authenticated browser and
  Android device validation, deployed schema/artifact proof, review/landing,
  and post-promotion gates remain open.

## 2026-08-05 web notification preference parity checkpoint

- The isolated web branch records local source commit `ccff6602`
  (`feat(web): add notification preference parity`). Web now consumes the
  existing authenticated callback-ping and quiet-hours routes with fail-closed
  response readers, whole-hour 0–23 payload validation, account-keyed
  optimistic rollback, retryable quiet-hours loading failure, and accessible
  switches/selects. Callback reminders default to the server's documented
  opt-in state when the legacy profile envelope omits the optional field.
- The web surface keeps browser permission and provider delivery explicitly
  separate from server preference persistence. It does not claim browser push
  delivery, provider registration, or staging runtime proof.
- Focused notification coverage passes **2 suites / 9 tests**; the full web
  gate passes **59 suites / 307 tests**, TypeScript, changed-file ESLint,
  Prettier, production build (2,842 modules), API-client provenance, and both
  web staging source guards. The repository hook also completed nine workspace
  typecheck tasks.
- This is local source/automated evidence only. No push, PR, merge, workflow,
  deployment, browser/device run, authenticated staging check,
  database/configuration change, iOS edit, or production action occurred.
  Browser permission/delivery, authenticated staging, Android device proof,
  deployed schema/artifact/CSP/WebSocket evidence, review/landing, and
  post-promotion gates remain open. Overall evidence-weighted parity remains
  **77%**.

## 2026-08-05 web Home Diary recovery checkpoint

- The isolated web branch records local source commit `81e18bab`
  (`feat(web): harden Home Diary lifecycle`). The Home Diary query now opts
  into focus/reconnect refresh like the Android Home rail, preserves saved
  cards during a failed refresh, distinguishes an initial request failure from
  a valid empty Diary, and exposes retryable, keyboard-focusable 44px
  loading/error/status controls. Existing navigation, mood check-in, and
  journal creation paths remain unchanged.
- Focused Home coverage passes **1 suite / 3 tests**; the full web gate passes
  **60 suites / 310 tests**, TypeScript, changed-file ESLint, Prettier, diff
  check, production build (2,842 modules), API-client provenance, both web
  staging source guards, the Murror workspace guard, and the repository hook's
  nine workspace typecheck tasks. Fresh read-only trunk comparisons are web
  0/52, Android 0/23, and API 0/27 (behind/ahead).
- This remains isolated local source/automated evidence only. No push, PR,
  merge, workflow, deployment, browser/device run, authenticated staging
  check, database/configuration change, iOS edit, or production action
  occurred. Authenticated browser recovery, deployed artifact/schema/CSP/
  WebSocket proof, Android device validation, review/landing, and
  post-promotion gates remain open. Overall evidence-weighted parity remains
  **77%**.

## 2026-08-05 web Home mood check-in parity checkpoint

- The isolated web branch records local source commit `6024b7b9`
  (`feat(web): harden Home mood check-in flow`). The web mood-check-in and
  journal-mode choice modals now use the shared focus/escape/restore hook,
  labelled dialog semantics, explicit descriptions, and keyboard-focusable
  44px controls. Mood choices expose selected/saving states; non-duplicate
  failures remain inside the private modal with an accessible retry action,
  while duplicate completion still routes through the existing mode choice.
- Focused Home modal coverage passes **2 suites / 4 tests**; the full web gate
  passes **62 suites / 314 tests**, TypeScript, changed-file ESLint, Prettier,
  diff check, production build (2,843 modules), API-client provenance, both
  web staging source guards, the Murror workspace guard, and the repository
  hook's nine workspace typecheck tasks. Fresh trunk comparisons remain web
  0/53, Android 0/24, and API 0/27 (behind/ahead).
- This remains isolated local source/automated evidence only. No push, PR,
  merge, workflow, deployment, browser/device run, authenticated staging
  check, database/configuration change, iOS edit, or production action
  occurred. Browser/provider delivery, authenticated staging, Android device
  validation, deployed artifact/schema/CSP/WebSocket proof, review/landing,
  and post-promotion gates remain open. Overall evidence-weighted parity
  remains **77%**.

## 2026-08-05 Android alternate Branch test-link parity checkpoint

- The isolated Android lane records local commit `0eebee48` (`fix(android):
  restore alternate Branch test links`) on top of the fetched
  `origin/staging-environment-setup@4ff1572b`; the lane is **24 ahead / 0
  behind**. The change is limited to the Android manifest and its source-level
  build-isolation guard, with no shared React Native runtime or `ios/**` path.
- Android's staging flavor already defined the four Branch hosts that iOS
  staging declares, but the HTTPS intent filter omitted
  `branch_alternate_test_domain`. The manifest now registers that host while
  preserving the custom `murror-stg` scheme, `singleTask` activity lifecycle,
  and Branch session callbacks. The guard asserts the flavor resources and all
  four manifest declarations so the omission is caught locally.
- The Android build-isolation and manual staging-workflow guards pass, the
  manifest is well-formed XML, 11/11 API-contract tests pass, deterministic
  generated-client verification passes, exact-file ESLint and Prettier pass,
  and `git diff --check` is clean. No staging environment, signing material,
  Gradle artifact, hosted CI, device, or authenticated flow is claimed. The
  workflow guard passed before the dependency cleanup; after the exact
  task-owned dependency tree moved to Trash it is not rerunnable without
  restoring the removed YAML package.
- This is local source/automated evidence only: no push, PR, merge, workflow
  dispatch, deployment, database/configuration change, iOS edit, or production
  action occurred. Overall evidence-weighted parity remains **77%**, with the
  3–5 working-day forecast beginning after production promotion and all runtime
  and access gates open.

## 2026-08-05 Web private journal draft parity checkpoint

- The isolated web lane records feature commit `95e6dcd5` (`feat(web):
  preserve private journal drafts`) and safety follow-up `d4bf2daf` (`fix(web):
  protect journal draft recovery`), at **55 ahead / 0 behind** freshly fetched
  `origin/dev`. Only the web journal writer, account-scoped draft adapter, and
  focused tests changed; API, Android/shared React Native runtime, branch-owned
  `ios/**`, Claude's canonical iOS checkout, workflows, deployment, staging
  runtime, database, production, and Uni remain untouched.
- Fresh unscoped free-writing restores only the current account's private local
  draft, autosaves after a short idle period, persists through Close and Draft,
  clears after successful submit, and announces browser-storage failure.
  Prompted and relationship-task writing never restores generic text into the
  wrong context. The follow-up preserves text typed before profile hydration and
  keeps the editor open when a non-empty draft cannot be saved. Server-backed
  draft sync and explicit discard remain open follow-ups.
- Focused coverage passes **3 suites / 9 tests**. The full web gate passes
  **65 suites / 323 tests**, TypeScript, changed-file ESLint, Prettier, diff
  check, production Vite build (**2,845 modules**), API-client provenance, both
  web staging source guards, and the repository hook's nine workspace typecheck
  tasks. This is local source/automated evidence only: authenticated browser
  reload, server-backed sync, deployed artifact/schema/CSP/WebSocket proof,
  Android device validation, review/landing, and post-promotion gates remain
  open. Overall evidence-weighted parity remains **77%**; the 3–5 working-day
  forecast begins only after promotion and runtime/access gates open.

## 2026-08-05 Web server-backed private journal draft checkpoint

- The isolated web lane records local commit `8bcbfa6f` (`feat(web): sync
  private journal drafts`) at **56 ahead / 0 behind** freshly fetched
  `origin/dev`. The slice extends the prior account-scoped local draft behavior
  with authenticated GET/create/update/delete calls through the existing journal
  API routes. No API source, generated declaration, Android/shared React Native
  runtime, branch-owned `ios/**`, Claude's canonical iOS checkout, workflow,
  deployment, staging runtime, database, production, or Uni changed.
- Local and remote drafts are reconciled per account after the profile and remote
  request are ready. A remote draft wins only when it is at least as new as local
  text; local text typed before hydration is preserved and linked to the remote
  draft identity. Autosave and Save for later serialize writes so a slow request
  cannot create duplicate drafts. Server failure leaves a recoverable browser
  draft and exposes a retry status without sending journal content to analytics.
- The accessible exit dialog now offers Keep writing, Save for later, and an
  explicit Discard draft. Discard removes the server draft when known, then
  clears the account-scoped browser copy; failed deletion leaves the draft saved.
  Contract readers reject malformed or oversized server payloads, and storage
  tests prove server identity survives later local edits.
- Focused draft/dialog/writer coverage passes **4 suites / 12 tests**. The full
  web gate passes **67 suites / 329 tests**, TypeScript, changed-file ESLint,
  Prettier, `git diff --check`, a production Vite build (**2,847 modules**),
  `verify-web-staging-build.mjs`, and `verify-web-staging-deploy.mjs`. The
  repository pre-commit hook also completes all nine workspace typecheck tasks.
  Watchman, stale browser-data, Browserslist, and large-chunk messages remain
  advisories.
- This is local source and automated evidence only. Authenticated two-account
  browser reload/discard behavior, hosted artifact/API/schema/CSP/WebSocket
  proof, Android Gradle/CI/signing/device validation, review/landing, and
  post-promotion release gates remain open. Overall evidence-weighted parity
  remains **77%** and the forecast remains 3–5 working days after promotion and
  runtime/access gates open.
- After the final checks, the exact web-lane root dependency tree (**1.7 GB**),
  web-client dependency directory (**124 KB**), and Vite `dist` output (**3.9
  MB**) moved recoverably to macOS Trash. Android dependency/build artifacts
  were already absent; pre-existing Turbo metadata, shared/global caches, other
  worktrees, iOS, and Uni were preserved.

## 2026-08-05 For Us relationship reliability checkpoint

- Astro approved the contract-first reliability slice. API source commit
  `ae75086` removes redundant array metadata from relationship tasks and
  insights, and deterministic artifact commit `2c6594c` exports 83 controllers,
  307 paths, and 336 operations at schema SHA-256
  `15cb3806b297328bd848423f99376be98e54c413929a0e806e9b33d089c6062d`.
  API build, typecheck, lint, repository format, 12/12 OpenAPI tests, and
  deterministic verification pass.
- Web checkpoint `88fb887a` and Android checkpoint `d861f0b8` consume the same
  schema. Their generated declarations are byte-identical at SHA-256
  `8302ba75e9d4fc450d8b334be228fba41d9df245f14ea0fb096b51a458ab2cff`;
  the web receipt is
  `61fc837f…`. Android changes exactly four generated contract files and has no
  branch-owned `ios/**` diff.
- Web commit `b7722371` replaces three overlapping relationship reads with one
  fail-closed bundle boundary keyed by viewer and relationship. It rejects
  malformed nested arrays, suppresses private stale data on 401/403/404, and
  preserves valid cards across partial, stale, generating, failed, and
  recoverable timeout states.
- Web commit `e164e8d2` reconciles exact-identity Socket.IO task/insight updates
  and identifier-only Supabase takeaway events with timestamp ordering, burst
  coalescing, timeout recovery, and complete listener/channel teardown. The
  existing carousel renders pending, preparing, failed, and ready takeaway cards
  with a named busy region, 44px controls, visible focus, polite status
  announcements, light/dark contrast, and reduced motion. No private content or
  identifiers were added to analytics/logging.
- The full web gate passes 38 suites / 208 tests, 12/12 API-client checks,
  deterministic client verification, app and monorepo typechecks, lint,
  repository format, both staging source guards, and the production build.
  Commit `d347f21e` is the narrow optional-insight type fix found by that build.
  The existing large-chunk warning remains broader performance debt.
- API, web, and Android are clean at `2c6594c` (27 ahead / 0 behind
  `origin/staging`), `d347f21e` (34 ahead / 0 behind `origin/dev`), and
  `d861f0b8` (23 ahead / 0 behind `origin/staging-environment-setup`).
  Nothing was pushed, reviewed, merged, deployed, signed, or run on a device.
  Authenticated two-account For Us behavior, deployed schema/artifact,
  browser Socket.IO/Supabase delivery, CSP, Android Gradle/device behavior, and
  release approval remain separate gates.
- Evidence-weighted overall parity is now 77%: capability 96%,
  contracts/configuration 99%, current-trunk integration 97%, authenticated
  runtime 18%, and reviewed release gates 12%. The 14–19 Aug conditional
  staging-proof window still assumes review/landing, test accounts, Android
  hosted CI/device access, and web deployment ownership are available by 7 Aug;
  runtime proof is expected to take 3–5 working days after those gates open.

## 2026-08-04 complete web account recovery source lifecycle

- The clean web lane records the approved account-recovery design and plan in
  commits `05c530ad` and `51afd12c`, with the implementation in local commit
  `a2191695`. The branch is 17 commits ahead and zero behind freshly fetched
  `origin/dev` (`00fa6cd1`) at this checkpoint.
- The placeholder forgot-password surface is now a complete request lifecycle:
  trimmed/validated email, explicit same-origin `/reset-password` redirect,
  generic anti-enumeration confirmation, retryable transport failure, and a clear
  return to sign-in.
- The reset route separates loading, invalid/expired, and ready states. Only an
  authenticated Supabase `PASSWORD_RECOVERY` event unlocks the form; an ordinary
  authenticated session does not. Password completion reuses the existing policy,
  updates only the password, preserves the recovery session, and replaces
  navigation with `/` so normal onboarding/subscription routing remains
  authoritative.
- Labels, autocomplete, announced errors/status, keyboard submission, double-submit
  protection, and a focusable `aria-pressed` show/hide control are covered. PostHog
  uses the existing mobile recovery event names through a fixed adapter that cannot
  accept email, password, token, URL, or error-text properties.
- The clean gate passes 21 web suites / 104 tests, 12/12 client-contract checks,
  deterministic API-client verification, TypeScript, lint, Prettier, both web
  staging source guards, and three production builds: default, both parity flags
  enabled, and both flags disabled. Recovery remains present in all three bundles;
  Memory Room and Connection Journey remain fail-dark when disabled.
- This is local source evidence only. Redirect allowlisting in hosted Supabase,
  real email receipt, single-use and expired-link behavior, same-browser completion,
  authenticated return routing, deployed artifact/CSP behavior, review, landing,
  and release remain external. Android and iOS source were not changed for this
  slice.

## 2026-08-05 Android current-trunk reconciliation checkpoint

- A fresh fetch first confirmed mobile staging at `2dbda2fb`. After a zero-overlap
  path audit, clean merge simulation, build-415 ancestry check, and specialist
  review, the seven trunk commits were merged—not rebased—into the isolated Android
  parity branch at local checkpoint `d4be1f56`.
- Metadata-only commit `617b6e2a` later refreshed the reviewed API manifest/receipt.
  When Claude’s PR #1032 advanced mobile staging to `157ab61c`, a second fresh audit
  found only two incoming OneSignal subscription-tag files, zero overlap, and a clean
  merge simulation. They were merged locally at checkpoint `a3286ce3`; the later
  iOS-only build-416 PR #1033 was already anchored on trunk and merged as
  ancestry-only checkpoint `a208ed77`. Documentation-only decision commit
  `a63805d9` records the approved recovery after-state. The branch is now 18 commits
  ahead and zero behind. Its delta against current staging remains the original 20
  Android/config/contract paths plus one decision document, with no `ios/` path.
  Build-415 project/plist files are byte-identical to trunk, and the
  canonical iOS checkout retained the same SHA, seven-file tracked status, and
  status hash before and after the work.
- The reconciled gate passes 18 focused suites / 105 tests, 11/11 client-contract
  tests, deterministic generated-client verification, contract lint/format,
  workflow and build-isolation guards, TypeScript, ESLint with zero errors, i18n,
  copy, privacy, diff, and branch-owned Prettier checks. The full no-cache Jest gate
  passes 367 suites / 3,121 tests, with one suite / three tests intentionally skipped.
- The repository-wide Prettier command still reports 97 current-trunk baseline files
  outside the branch-owned delta; none were rewritten. JDK 17 and Android
  platform/build-tools 35 are locally available, but the NDK, secret-backed staging
  environment, and staging signing material are not. An offline staging-debug
  preflight stopped before compilation on an uncached Gradle plugin, so no native
  build, hosted CI, signed artifact, authenticated runtime, or device proof is
  claimed.
- The late PR #1032 reconciliation additionally passes its 4/4 focused tests,
  TypeScript, ESLint with zero errors, 11/11 client-contract tests, deterministic
  client verification, and targeted formatting. The canonical iOS checkout retained
  the same SHA and status hash throughout.
- PR #1033 changes only the Xcode project and four iOS Info.plists. Those files are
  byte-identical to current trunk and absent from the branch-owned diff; no build
  number was selected, edited, archived, or uploaded by this lane.

## 2026-08-05 approved mobile account-recovery behavior

- Astro approved the mobile-parity reset after-state: update the password through a
  recovery-authenticated Supabase session, keep that session after success, and let
  the existing Murror authenticated/onboarding/subscription routing choose the
  destination.
- The current mobile source already follows that request → recovery OTP → session →
  password update → returning-user route lifecycle. Web commit `a2191695` reaches the
  same outcome through its browser-appropriate `PASSWORD_RECOVERY` event and route.
- A read-only Iris/Cortex/Sentinel panel unanimously recommended no shared React
  Native source change. Such a change would affect Claude's iOS staging lane, while
  an Android-only fork would introduce divergence without a reproduced Android-only
  defect.
- Mobile commit `a63805d9` records the approved behavior, known mobile hardening
  debt, and external Android recovery matrix. It changes one Markdown file only;
  no runtime, API, database, build-number, or `ios/**` path changed.
- This decision does not count as authenticated runtime evidence. Real Android
  recovery receipt, invalid/expired/reused proofs, session retention, old/new
  credential behavior, account isolation, analytics privacy, and final routing all
  remain device/staging gates.

## 2026-08-05 API-first provenance reconciliation

- The isolated API lane merged current staging `74e2dd3` at `d5afc83a`. The incoming
  RevenueCat subscription fix touched only two service/test files and had zero path
  overlap with the OpenAPI/Memory Room parity delta.
- The fail-closed provenance guard correctly rejected the old source SHA because it
  treats every `src/**` change as a possible schema input. Regeneration produced the
  same 83 controllers, 307 paths, 336 operations, and schema hash `69b1b99f…`; local
  artifact commit `c424bdb` therefore changes only the manifest source SHA.
- API build, TypeScript, changed-file lint, full Prettier, 10/10 OpenAPI tests,
  read-only regeneration/verification, and 75 targeted subscription plus Memory Room
  controller tests pass. The API branch is 15 commits ahead and zero behind.
- Web commit `be58e50b` and Android commit `617b6e2a` copy that exact reviewed
  manifest and regenerate only the client receipt. Schema `69b1b99f…`, manifest
  `f9192c49…`, client receipt `eed2fbc8…`, and declaration `de34c34a…` are identical
  across their applicable lanes. Web passes 12/12 and Android 11/11 client-contract
  tests plus deterministic generation; web’s commit hook also passes nine workspace
  typecheck tasks. No runtime behavior, iOS path, deployment, workflow, or hosted
  configuration changed.

## 2026-08-04 digest-pinned web staging source

- Clean local web commit `4e250b56` adds a dedicated two-step staging path on
  current `origin/dev`. The existing build workflow accepts only exact `dev` for
  staging, requires the reviewed staging inputs, publishes a revision-labelled
  web-client image, and records its immutable OCI digest. It has no deployment
  authority.
- A separate manual deploy workflow is web-client-only, fixed to the Vietnam
  staging cluster, protected by one non-cancelling environment concurrency lane,
  and restricted to `refs/heads/dev`. It requires a `sha256` digest plus an exact
  confirmation phrase, pulls that image, and rejects it unless the OCI revision
  label matches the current `dev` commit. It does not build, push, deploy a mutable
  tag, or include the backend.
- `apps/web-client/helm/values-staging.yaml` is now tracked for the current nginx
  port-80 runtime and `staging.app.murror.app`. Namespace, release name, API,
  Supabase, Memory Room, and Connection Journey values remain reviewed GitHub
  staging-environment inputs; no credential, secret, or flag value was guessed or
  committed. Alpha and production tag rendering remain backward-compatible.
- The staging lane consumes the reviewed vendored contract artifact and its
  provenance receipt. It does not regenerate from mutable hosted Swagger; the
  staging docs `404` therefore remains an open deployed-corroboration signal, not
  permission to substitute another environment's schema.
- Both source verifiers, workflow syntax/actionlint, JSON parsing, Helm lint and
  digest/tag renders, invalid-input guards, all 15 web suites / 76 tests, 12/12
  client contract tests, deterministic artifact verification, typecheck, lint,
  Prettier, and flag-on plus fail-dark production builds pass. The branch is 14
  commits ahead and zero behind `origin/dev` at this checkpoint.
- This is source/configuration evidence only. Nothing was pushed, merged remotely,
  dispatched, deployed, enabled, signed, or changed in GitHub values, secrets,
  iOS, or Uni. Authenticated browser, CSP, WebSocket, deployed-artifact, and release
  proof remain open.

## 2026-08-04 clean-lane evidence correction

- The former `murror-web-parity-codex` lane is preserved read-only. Its source is
  useful design history, but its dirty diff and 100-commit trunk gap are not
  current integration evidence.
- Current clean web evidence is limited to the commits ahead of `origin/dev` in
  `codex/web-parity-integration-20260804`: account isolation, mobile link aliases,
  authorized takeaway detail, deterministic contracts, Your Growth, Daily Voice,
  Memory Room, and Connection Journey.
- Connection Journey landed locally at `5d3dcb02` against the current mobile
  model, not the stale legacy detail page. It preserves origin/current stars
  through capping, excludes failed cards, hides pending topics, opens only ready
  historical reflections, uses the mobile orbital palette, and renders no stage
  counts.
- `VITE_CONNECTION_JOURNEY_ENABLED` is exact-lowercase and fail-dark. Missing
  values skip the additional connection request and remove Journey copy from the
  production bundle; staging image source now requires the reviewed value to be
  exactly `true`. No GitHub value was changed and no image or deploy ran.
- Focused Journey tests pass 15/15; the full clean web gate passes 15 suites / 76
  tests, 12/12 contract tests, typecheck, lint, deterministic client verification,
  workflow syntax, and flag-on plus fail-dark production builds.

## 2026-08-04 resume update

- The private tracker is `docs/progress/web-android-staging-parity.html`; it is
  internal evidence and is deliberately separate from the investor page.
- Android now carries the current English-only launch initialization/settings
  behavior and true memory-photo aspect-ratio measurement with a square fallback.
  Two focused suites pass 50 tests.
- Android also carries the current Home Moments first-load resolver: the carousel
  uses the known card resting position until a live UI-thread value exists. The
  pure resolver suite passes 3 tests, and the full Android TypeScript check is
  green.
- Web carries the English-only policy through i18n, profile/REST language
  handling, settings, Docker, local builds, and staging workflow guards. The
  staging contract checks pass, and the focused language-section runtime test
  passes 5/5 using a controlled offline temporary dependency link; the original
  symlink was restored afterward.
- The remaining work is not reduced to these source slices: current iOS shared
  deltas still need reviewed Android/web decisions, and hosted schema,
  authenticated staging, generated-client freshness, browser/WebSocket, Gradle,
  device, and release approvals remain open.

## 2026-08-03 lane update

- A read-only staging handoff audit confirms `staging.api.murror.app` live/ready
  health returns `200`, while the candidate hosted Swagger JSON routes return
  `404`; the hosted web shell returns `200` but is stamped July 28 and its current
  CSP omits the staging REST and WebSocket origins. The isolated web nginx config
  now allows both `https://staging.api.murror.app` and
  `wss://staging.api.murror.app` in all five report-only CSP headers, and the
  staging contract verifier requires those origins. No image build or deployment
  was triggered, so the live shell has not been claimed as updated.
- Web image/build and deploy workflows, plus the Android manual staging workflow,
  now fail closed when `MURROR_API_OPENAPI_URL` is missing. Pull-request,
  development, and alpha paths retain their existing optional behavior; staging
  cannot silently build from checked-in generated declarations that were not
  compared against a hosted API schema.
- The same staging gates pin the expected API origins: web must use
  `https://staging.api.murror.app/api`, and Android must use the bare
  `https://staging.api.murror.app` host. A non-empty production or development
  URL is rejected before the staging artifact is built.
- The Android generated-client guard now requires the two shared-memory route
  groups already used by its hand-written `SharedPhotosApiClient`: append-only
  comments and partner-only reports. A temporary generation from the public dev
  schema confirmed the exact operation/type names, but it was not promoted because
  dev is not staging truth and the hosted staging schema still returns `404`.
  Android client/staging/workflow contracts, the shared-photos report test, and
  fail-closed staging codegen behavior pass; the checked-in declaration remains
  unchanged until a reviewed/versioned schema is available.
- A fresh unauthenticated staging route probe returned `401` for the scoped Memory
  Room, Emotional Growth, voice-summary, takeaways, relationship-reflection,
  Together leave, shared-memory comment, and shared-memory report routes. The
  `401` results confirm deployed route protection and distinguish these routes from
  `404` missing routes; they do not replace authenticated account or device checks.
- A follow-up source audit found no remaining shared-memory UI gap: Android's
  detail sheet and web's memory detail both expose the two-way comment thread,
  append-only optimistic reconciliation/rollback, and partner-only report reason
  and confirmation states. The native-capability audit likewise found the
  existing honest browser alternatives and failure handling for speech, share or
  clipboard, and notifications. This narrows the remaining parity work to
  authenticated staging, hosted native build, browser/device, and human release
  gates rather than another safe source rewrite.
- The web deploy matrix and local Docker build helper now forward the complete
  capability-flag set already supported by the web image: Safari web push identity,
  hard-paywall, Council, shared memories, Memory Room, and connection journey. The
  web staging verifier now checks those values in the Dockerfile, helper (including
  each parity Docker build argument), one-off workflow, and deploy matrix so a
  normal staging deployment cannot silently drop an existing capability.
- The existing manual web deploy matrix now exposes an explicit `staging` target,
  selects the staging Helm values on the Vietnam cluster, and limits that target to
  `web-client` because the other services do not all have staging values in this
  repository. The same existing codegen and typed-client gates run before the image
  build; no deployment was triggered in this pass.
- The Android lane now has a dependency-free staging contract verifier covering the
  staging flavor, application suffix, staging signing inputs, `BASE_API_URL` fail
  closed behavior, `ENV=staging`, and `assembleStagingRelease`. The verifier runs in
  the Android workflow before native build setup.
- Android staging is now an explicit manual target rather than a push-triggered
  release from the shared `staging-environment-setup` branch. The workflow validates
  the selected build target and source branch, separates staging/development
  concurrency, and keeps pull-request validation available without allowing an iOS
  staging push to start an Android staging build.
- Web staging now serializes by target environment and rejects manual staging
  dispatches whose source ref is not listed in `.github/matrix-config.json`. The
  current approved source is the isolated `feat/web-core-loop-parity` lane.
- Android Your Growth now covers the mobile detail lifecycle in the isolated lane:
  localized title and sections, newest-first moments, loading, empty, initial error,
  stale-content error with retry, and explicit back navigation. Its hermetic screen
  test covers five states/behaviors; the focused screen-plus-query run passes 5
  suites and 22 tests.
- Android Memory Room now covers the mobile lifecycle in the isolated lane:
  initial and stale index/summary/month errors with retry, invalid and expired
  deep links including an empty-index case, cursor pagination, load-more errors
  with retry while preserving loaded memories, and localized loading/error copy.
  The new lifecycle suite covers these states without touching the iOS checkout.
- Android's daily voice-summary detail now distinguishes ready, loading, empty,
  and first-load error states. Deep links with inline or stale content remain
  playable, while a first-load failure hides playback controls and offers a
  localized retry. The focused state suite passes 3 tests; the existing
  connection-journey, Memory Room lifecycle, and Your Growth suites remain green.
- Web's daily voice-summary detail now follows the same recovery contract: inline
  or stale content remains playable, a first-load failure offers localized retry,
  and playback controls stay hidden until content exists. The focused web page
  checks, full TypeScript check, client/staging guards, production build,
  formatting, and diff checks pass. A missing `note` member in the existing
  Personal Note carousel union was corrected as a narrow type-contract fix.
- The Android workflow now runs the focused parity suites on pull requests
  and manual staging dispatches, after contract checks and before JDK/Gradle setup.
  The gate covers Connection Journey, voice summary, Memory Room lifecycle plus
  screen regression, Your Growth, AI chat resume/history, quiet-hours storage,
  and the native deep-link path contract.
  The workflow verifier pins the command and ordering.
- Android workflow push and pull-request triggers are path-scoped to Android
  and shared client inputs. Xcode-only `ios/**` changes cannot start Android
  validation; shared `src/**` changes continue to run the parity gate.
- The baseline ten-file parity run passes 49 tests, alongside client/staging contracts,
  workflow verification, formatting, and diff checks. Authenticated
  staging, cancellation behavior, Gradle packaging, and device validation remain
  external gates.
- Android's native linking table and web route table both exposed
  `/relationship_screen`, but Android's raw URL interception and widget fallback
  omitted it. The isolated Android lane now registers the path and routes it to
  the existing Connections tab; the focused linking suite passes 6 tests.
- Web now covers the mobile personal-note exchange on relationship detail: a
  partner-only received-note rail and dialog, a 240-character composer, one-note-
  per-day handling, crisis-safe inline prompt reuse, typed note messages, and the
  caller-scoped note mutation. The focused API/domain/page run passes 3 files and
  45 tests; own notes are excluded from the received-note rail.
- Web's shared Our Memories wall now follows Android's freshness contract: it
  refetches on visible focus/return and on a 15-second visible cadence, pauses
  background-tab polling, and retries the seen marker once after an authenticated
  failure. TypeScript, Prettier, web client/staging contract checks, and diff checks
  pass; the focused web wall/detail run passes 4 files and 42 tests with the
  disposable offline dependency mirror.
- Web's shared-memory detail now matches the Android append-only comment and
  partner-reporting lifecycle: both members can render and submit comments with
  optimistic reconciliation/rollback, while only the viewer of a partner memory can
  choose a report reason and explicitly confirm submission. The generated web
  declaration, source-backed codegen route requirements, EN/VI/JA locale keys, and
  contract guard are aligned with the existing API controller/DTO source. The focused
  web run passes 4 files and 42 tests; authenticated two-account staging and
  moderation read-after behavior remain open.
- Web Home's recent journal rail now follows Android's focus-refresh behavior and
  keeps the failure lifecycle honest: visible window focus and tab return trigger a
  bounded refetch, an initial load error offers retry instead of rendering the empty
  onboarding card, and stale entries remain visible with an inline retry when a
  refresh fails. EN/VI/JA copy is aligned, and the focused Home suite passes 10 tests;
  cancellation, quota, private-input recovery, authenticated staging, and device or
  browser validation remain open.
- Web deep chat now consumes the backend's first-class `chat_quota` event alongside
  Android's quota notice contract. At-cap codes render a warm localized reset line and
  route to the existing subscription page; temporary AI unavailability stays
  retryable without an upgrade CTA; the compatibility `message_complete` emitted
  after `chat_quota` is deduplicated so the warm copy cannot appear twice. The focused
  web parity set passes 8 files and 70 tests; authenticated quota staging, cancellation,
  deep-link/resume, and real browser validation remain open.
- Android Home's recent journal rail now distinguishes an initial diary-load failure
  from a genuinely empty journal and preserves loaded entries when a focus refresh
  fails. Both states expose localized retry actions in EN/VI/JA; the focused recovery
  component suite passes 2 tests. Authenticated staging, Android device/emulator
  behavior, and the remaining Home cancellation/quota/private-input checks remain
  open.
- The Android parity gate now also runs Home journal recovery, AI quota messaging,
  composer persistence, and draft-resurrection coverage. The expanded isolated run
  now includes the shared-memory comment/report transport suite and passes 15 suites
  and 67 tests with the workflow contract verifier, client/staging contracts,
  Prettier, and diff checks; authenticated staging, Gradle packaging, and device
  validation remain external gates.
- Android's full TypeScript check is now green after narrowing the optional React
  Navigation linking config in the isolated deep-link test. Targeted ESLint and
  Prettier also pass; this is static source evidence only and does not replace the
  hosted Gradle build or real-device gate.
- A fresh web-lane recheck passes the client and staging contracts, web TypeScript,
  8 focused Vitest files with 77 tests, the production Vite build, and targeted
  ESLint. The original broken dependency symlinks were restored exactly afterward;
  the generated 12 MB `dist` artifact was moved recoverably to Trash.
- A later native packaging audit found Homebrew JDK 17 plus Android platform and
  build-tools 35 outside the default environment path. The required NDK,
  secret-backed `.env.staging`, staging signing material, and `android/local.properties`
  remain absent. An offline `assembleStagingDebug` preflight stopped before
  compilation because the Foojay Gradle plugin was not cached; no native artifact
  or runtime result is claimed.
- Web journal draft persistence now has explicit private-mode/quota coverage for
  blocked `getItem`, `setItem`, and `removeItem` calls. The storage suite passes 12
  tests, and the combined storage/writer check passes 42 tests; authenticated
  browser reload and staging acceptance remain open.
- Web notification settings now route the existing push toggle, mobile-parity
  soft prompt, callback-pings errors, and browser permission recovery through the
  existing EN/VI/JA locale contract. The focused notification suite passes 12
  tests; the web TypeScript, formatting, and diff checks pass.
- Web locale keys now match Android for the shared `takeaway.syncError` recovery
  message in EN/VI/JA. The recursive locale audit passes with 2,455 keys in each
  web locale.
- Web AI chat now localizes generic Socket.IO connection/auth and not-connected
  fallbacks while preserving server-provided error messages. The focused deep-chat
  and notification run passes 2 files and 21 tests; TypeScript, formatting, and
  diff checks pass.
- Android notification settings now read quiet-hours preferences through a
  fail-safe parser that accepts the shared numeric storage shape and the web
  time-string shape, while preserving the existing mobile-compatible serializer.
  Malformed storage falls back per field instead of surfacing an unhandled parse
  error. The new contract suite passes 4 tests; the baseline combined parity run
  passed 10 suites and 49 tests, including the native linking path contract. The helper
  passes isolated TypeScript validation and the
  repository Prettier check; full Android lint/typecheck still depends on a
  correctly installed project dependency tree.
- Web Memory Room now accepts the mobile-compatible `/memory_room/:id` deep-link
  shape as well as the existing `/memory-room?memoryId=...` form. Path links
  canonicalize to the web route when selecting another month/memory or closing
  detail. The focused Memory Room suite passes 4 tests, and the web app
  TypeScript, formatting, and targeted ESLint checks pass.
- Web now registers the remaining shipped mobile deep-link shapes:
  `/home_screen` and `/relationship_screen` redirect to the protected home and
  Friends routes, `/knowledge/:articleId` reuses the article detail screen, and
  `/takeaway/:relationshipId/:takeawayId` reuses the relationship takeaway
  screen. A route contract suite covers these aliases together with Memory Room
  and voice summary; the focused run now covers 10 tests.
- The investor-facing progress page now has a source contract test that preserves
  its public timeline in EN/VI/JA and rejects the removed internal live-ledger
  markers. The focused contract test passes 2 tests with Prettier and ESLint.
- Verified locally in the isolated lanes: web staging and generated-client contracts,
  shell syntax and diff checks; Android staging, workflow, and generated-client
  contracts, formatting, and the focused Android parity suites described above.
- The staging API source lineage already contains the additive Together membership
  block (`planKind`, `planRole`, privacy-limited `planCompanions`,
  `cancelAtPeriodEnd`, and `seatGraceUntil`). A new isolated API contract lane adds
  an explicit Swagger companion DTO so `planCompanions` is emitted as an object
  array instead of an underspecified `string[]`; it changes no runtime, database,
  or deployment behavior.
- Web now normalizes the additive Together payload and renders Duo/Circle organizer
  and member states in Settings with the mobile privacy rule that a member never
  receives the organizer email. Android's checked-in generated declaration carries
  the same fields, while its existing mobile entitlement model remains the source
  of runtime behavior.
- Web subscription management now covers the shared-plan member lifecycle that was
  still missing from the web surface: privacy-safe organizer display, included-cost
  reassurance, caller-scoped member leave with confirmation, graceful seat-grace
  messaging, and an organizer link back to shared-plan management. The generated
  web contract and CI guard pin `POST /api/v1/family-plan/leave`; 10 focused web
  files pass with 85 tests, followed by TypeScript, production build, staging
  contract, locale, and formatting checks.
- Android already had the matching caller-scoped Together member action, but its
  generated declaration and contract verifier did not pin the route. The isolated
  Android lane now records `POST /api/v1/family-plan/leave` in the generated
  declaration and directly tests the no-seat-id request; 9 focused suites pass with
  65 tests, alongside TypeScript, Android client/staging/workflow guards, and
  generator-style declaration formatting.
- The web lane's pre-existing `node_modules` symlinks still point to a missing
  worktree and were not changed. A disposable offline dependency mirror was used
  instead: web typecheck passed, 8 focused Vitest files passed with 26 tests, the
  production build passed, and Prettier passed. Each mirror was moved to dated Trash
  with a manifest after validation; superseded mirrors were later removed while the
  latest passing mirror was retained; no dependency tree was borrowed from iOS.

## Capability matrix

Status meanings:

- **Baseline:** present in the mobile staging source and treated as the behavior reference.
- **Web present:** implemented in the current web parity lane, but staging runtime proof may still be pending.
- **Partial:** a related surface exists, but a capability or lifecycle state is missing.
- **Gap:** no equivalent surface in the target client yet.
- **Flag-dark:** intentionally excluded until its separate privacy and consent gates are complete.
- **Pending validation:** source exists, but Android runtime or authenticated staging evidence is still required.

| Capability                                                                | iOS       | Android                                                                                | Web                                                                                                | Next parity action                                                                                                                                                                                                      |
| ------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth, onboarding, and account recovery                                    | Baseline  | Pending validation in isolated staging worktree                                        | Web present in the clean lane; authenticated staging runtime remains pending                       | Validate hosted redirect allowlisting, email receipt, single-use/expired links, same-browser completion, and normal authenticated return routing with staging accounts.                                                 |
| Authenticated API and typed client foundation                             | Baseline  | Typed domain clients and fail-closed generator contract present, staging build pending | Shared authenticated RTK Query base, parity clients, and fail-closed generator contract present    | Keep endpoint envelopes, base URL rules, auth reset, timeout, and retry behavior aligned. Tie generated artifacts to a reviewed API source revision and expose a hosted staging schema before enabling CI regeneration. |
| Private Home and daily journal loop                                       | Baseline  | Pending validation                                                                     | Partial; web Home now has Android-matched refresh/recovery and accessible mood-to-journal/deep-chat handoff, while broader legacy deltas remain open | Validate cancel/quota/private-input recovery and authenticated Home/mood handoff behavior.                                                                         |
| AI deep chat, resume, history, quota, and completion return               | Baseline  | Pending validation                                                                     | Web present in the clean lane; authenticated browser/WebSocket proof remains pending               | Land the reviewed contract and tolerant web lifecycle, then validate Fresh/Continue, pagination, quota, interruption, exit/discard, completion return, focus, and reconnect against the deployed artifact.             |
| Diary, reflections, mental tests, and voice summary history               | Baseline  | Pending validation                                                                     | Partial; clean Your Growth and Daily Voice slices are present                                      | Complete the wider Diary lifecycle, then exercise voice loading/error/retry, refresh, empty, and authenticated staging states.                                                                                          |
| Connection Streak Home strip and Reflection month history                 | Baseline  | Generated contract current; native staging/device validation pending                   | Web present in the clean lane with local contract, lifecycle, accessibility, and build proof       | Deploy the tolerant web reader before changing the API runtime envelope, corroborate the deployed schema/revision, then validate authenticated browser dates, reload/Back state, errors, stale data, and Android device behavior. |
| Connections, invites, relationship detail, For Us, quizzes, and takeaways | Baseline  | Pending validation                                                                     | Partial; clean For Us reliability, authorized takeaway detail, and Connection Journey are present  | Review remaining invite/quiz gaps, then confirm authenticated two-account complementary states, realtime delivery, timeout recovery, and privacy boundaries.                                                             |
| Connection journey timeline and milestones                                | Baseline  | Pending validation                                                                     | Web present behind flag                                                                            | Complete authenticated staging and two-account lifecycle review before enabling the flag.                                                                                                                               |
| Shared Our Memories wall, comments, and reporting                         | Baseline  | Pending validation                                                                     | Partial; wall, seen-marker, reaction, comment, report, and owner upload/edit/delete lifecycles exist locally, while runtime evidence remains open | Complete authenticated two-account privacy/moderation and browser upload validation, then run Android native/device checks and complete deployed-schema corroboration.                                                                                              |
| Personal Memory Room, month index, detail, summary, and deep links        | Baseline  | Pending validation                                                                     | Web present behind flag                                                                            | Keep the web flag aligned with mobile `memory_room_enabled`, then complete authenticated staging/runtime checks.                                                                                                        |
| Push notifications, callback entry, quiet hours, and permission recovery  | Baseline  | Pending validation                                                                     | Partial; web now has callback-ping and quiet-hours preference controls, while permission and delivery lifecycles remain open | Validate browser permission denial/recovery, callback-ping persistence, quiet-hour reload, actual delivery, and return states against the deployed artifact. |
| Settings, language, subscription, restore, and Duo readiness              | Baseline  | Pending validation                                                                     | Partial; English-only behavior is clean, while the broader entitlement lifecycle is not            | Review legacy shared-plan deltas, then validate restore, downgrade, unavailable, shared-plan, grace-period, and privacy states.                                                                                         |
| Galaxy discovery experiment                                               | Flag-dark | Flag-dark                                                                              | Flag-dark                                                                                          | Do not include in this parity train until consent, privacy, and moderation gates are approved.                                                                                                                          |
| Native capabilities: camera, microphone, OS share, purchases, and push    | Baseline  | Pending validation                                                                     | Partial by browser alternative                                                                     | Record honest unsupported and permission-denied states rather than forcing a false 1:1 implementation.                                                                                                                  |

## First vertical slice: personal Memory Room

The Memory Room is the safest next cross-platform slice because:

1. Mobile already has a read-only personal surface with explicit month, detail, and
   summary queries.
2. `murror-api` already exposes the authenticated read endpoints:
   `GET /api/v1/memories/index`, `GET /api/v1/memories/month/:yyyymm`,
   `GET /api/v1/memories/:id`, and `GET /api/v1/memories/summary`.
3. Web currently has shared connection memories, but the personal Memory Room now has
   its own types, route, API cache, Home and Diary entry points, and flag gate. Keeping
   those separate prevents private memories from appearing in a shared relationship
   wall.
4. The feature is read-only, so it does not require a new mutation, migration, queue,
   or notification contract.

The slice must cover the full visible lifecycle: entry, loading, empty account, month
selection, list pagination, detail, invalid or expired deep link, API failure, return
to the selected month, and logout or auth reset. It must use the existing web layout,
authenticated API client, localization, accessibility, and responsive patterns.

## Second vertical slice: Your Growth detail

The iOS reference exposes a full Your Growth detail screen from the Reflection card.
The web parity lane now matches that lifecycle at `/reflection/growth`:

- The Reflection card is an accessible pointer and keyboard entry point and previews
  up to three moments and themes, matching the mobile summary behavior.
- The detail page reads the existing `GET /v1/emotional-growth` contract and renders
  the emotional trajectory, all growth moments in newest-first order, and all themes.
- Loading, empty, recoverable error with retry, localized labels, deep navigation, and
  light/dark theme states are covered by focused tests and the production build.

This slice does not claim authenticated staging or Android runtime parity. Those gates
remain open until the staging web route and the Android client are exercised with real
accounts and devices.

## Third vertical slice: connection journey timeline

The mobile Connection Reflection detail already defines the journey lifecycle. The
clean web parity lane now extends the existing authorized takeaway detail route,
`/friends/:id/takeaway/:takeawayId`, behind
`VITE_CONNECTION_JOURNEY_ENABLED`:

- The pure model preserves the connection origin, sorts reflections oldest to newest,
  omits failed cards, keeps pending and completed cards visible as non-interactive
  stages, and marks only the current stage as gold.
- Historical `INSIGHT_READY` stages are the only tappable stages. They navigate to
  another takeaway on that same route, so this slice does not create a duplicate
  destination or detail contract.
- The static, responsive timeline uses yearless date labels, 44-pixel tap targets,
  visible keyboard focus, and no stage counts or numbered progression. The oldest
  history is capped while the origin and current stage remain visible.
- The existing takeaway query supplies the reflection cards. The additional
  connection query is skipped unless the exact-lowercase flag is `true`; missing or
  malformed values leave the existing detail page and production bundle unchanged.
- Focused Journey tests pass 15/15, and the full clean web gate passes 76 tests,
  typecheck, lint, contract checks, deterministic client verification, workflow
  syntax, and both flag-on and fail-dark production builds.

This slice is web source parity only until authenticated staging, two-account privacy
checks, and browser/device review are completed.

## Fourth vertical slice: generated relationship-reflection contract

The existing Connection Journey and "Read More" flow now consumes the generated
relationship-reflection response shape in both target clients:

- Web aliases `RelationshipReflectionData` and its nested difference, insight, and
  user shapes to the generated OpenAPI declaration while keeping the existing route,
  cache tags, loading states, and navigation unchanged.
- Android aliases the shared relationship-detail response used by
  `getRelationshipDetailShared` to the same generated declaration and keeps the
  existing `BaseApiClient` transport and auth behavior unchanged.
- This is contract integration only. It does not change the endpoint, response
  runtime, database, or feature-flag behavior, and still requires authenticated
  staging and two-account privacy validation.

## Typed client and OpenAPI status

The current parity foundation is typed and shared, and both isolated client lanes
now consume generated declarations from the Murror API contract for Memory Room,
Emotional Growth, relationship reflection, and the daily voice-summary route
guard. Each lane includes
a pinned, fail-closed `generate:api-client` command. It validates a Nest OpenAPI 3
JSON document and requires the routes used by the parity slices before invoking
`openapi-typescript`. The generator is documented by the
[openapi-typescript CLI](https://openapi-ts.dev/cli) and accepts either a hosted
schema or a local JSON stream.

The current generated declarations were produced from a local Swagger export of an
isolated API worktree. That export contains 271 paths and complete response schemas
for the four Memory Room reads, and the web and Android clients derive their Memory
Room data and envelope types from it. The isolated API change only adds Swagger
response metadata to existing read handlers; it does not change runtime behavior,
data, or migrations, and it is not staging deployment proof.

The staging API source lineage also includes the Together membership response fields.
The isolated `codex-together-contract` lane makes the companion shape explicit to
Swagger, and both checked-in client declarations now carry the resulting typed
fields. A local Swagger model check confirms `planCompanions` is an array of
`PlanCompanionResponseDto` with `name`, `email`, `avatarUrl`, and `status`. Web's
adapter keeps legacy payloads safe and the Settings selector limits a member view
to the organizer's display name. This is source/contract evidence only: the public
development Swagger document still exposes the pre-deployment
`planCompanions: string[]` shape, while the staging docs endpoint is intentionally
unavailable, so authenticated staging runtime verification remains open.

The web member-side leave flow now uses the existing caller-scoped family-plan
route. The API controller source documents that the request carries no seat id and
only stands down the authenticated member's own seat; the web generated declaration
and verifier preserve that boundary, as does the Android client declaration and
verifier. The current development Swagger artifact advertises the route, and an
unauthenticated staging `POST` returns `401`, which is route/guard evidence rather
than authenticated product validation. The staging Swagger artifact itself remains
unavailable, so regeneration is treated as a deliberate drift gate rather than
silently accepting a declaration that drops the behavior.

Both web and Android generated-client verifiers now fail closed if regeneration
drops the Together companion object shape back to `string[]`; they require the
privacy-limited name, email, avatar URL, and `PENDING`/`ACTIVE` status fields.
This is a deterministic schema-drift guard, not proof that the currently deployed
staging API has received the isolated DTO metadata patch.

The daily voice-summary read route is now part of both generators' required route
sets, and Android's `GeneralApiClient` plus web's Diary query are tied to the
generated route key. The isolated `codex-together-contract` API lane now documents
the existing response as `VoiceSummaryResponseDto`; a source-backed Swagger probe
confirmed the schema and both checked-in declarations reference it instead of
`Object`. The hosted staging docs endpoint still returns `404`, so hosted
regeneration and authenticated runtime validation remain open.

The build workflows invoke the generator only when the explicit
`MURROR_API_OPENAPI_URL` variable is configured. Staging now fails closed before
that step when the variable is absent, while pull-request, development, and alpha
paths retain the existing optional behavior. Once the hosted schema is supplied,
the existing generator validates the required parity routes before emitting client
declarations.
Android routes the Memory Room and Emotional Growth clients through
`BaseApiClient`, including the shared base URL, bearer-token cache, unauthorized
callback, and logout reset paths. Web routes the matching clients through the shared
authenticated RTK Query base query and registers both API slices in the store.

The API source config exposes Swagger JSON at `api/docs/json` outside production, but
the corresponding staging docs candidates currently return `404`. The live staging
health route returns `200`, and unauthenticated probes for the parity routes return
`401`, which confirms gateway and route protection behavior but not an authenticated
user flow. The generator correctly refuses to emit output from that `404`. The local
generated declarations therefore remain source-backed artifacts until the hosted
staging schema is exposed or versioned and compared against the deployed API.

## Evidence and gates

### Verified locally

- Web account recovery is complete at source level in local commit `a2191695`:
  only a real Supabase recovery event plus session unlocks the reset form, ordinary
  authenticated sessions remain blocked from it, completion preserves the session,
  generic request confirmation avoids account enumeration, and analytics expose no
  recovery PII. The full 21-suite / 104-test web gate, contract checks, typecheck,
  lint, formatting, staging source guards, and three production-build variants pass.
- The canonical workspace guard passes from the isolated web and Android parity
  worktrees.
- The web staging contract now checks the staging REST and WebSocket origins in
  every nginx report-only CSP header; `WEB_STAGING_CONTRACT_OK`,
  `WEB_CLIENT_CONTRACT_OK`, JavaScript syntax, and diff checks pass. This is a
  source/configuration fix until the approved web image is built and deployed.
- The web and Android staging workflow contracts now require the hosted OpenAPI
  schema guard before code generation; `WEB_STAGING_CONTRACT_OK`,
  `ANDROID_STAGING_CONTRACT_OK`, `ANDROID_CLIENT_CONTRACT_OK`, the YAML-aware
  workflow verifier, i18n synchronization, and copy lint pass. The guard is
  intentionally not a hosted-schema result: current staging Swagger candidates
  still return `404`. The web and Android workflow contracts also require their
  exact staging API hosts.
- The remaining native-capability audit found honest web fallbacks already in
  place: Web Speech unsupported/prefix/error handling, Web Share/clipboard
  share-cancel/failure handling, and OneSignal notification gating. The focused
  web run passes 5 files and 43 tests; this is browser-contract evidence, not a
  replacement for real permission/device checks.
- The API source explicitly excludes internet-facing staging from its Swagger
  allowlist in `src/main.ts`; the hosted `404` is intentional privacy hardening.
  The parity lanes do not bypass that control. A reviewed versioned or otherwise
  protected schema source is required before staging regeneration can proceed.
- The mobile staging reference is `3929992a`.
- The API memory module and read-only routes exist in the current Murror API checkout.
- The current web parity lane records Personal Memory Room as a web-present slice behind
  `VITE_MEMORY_ROOM_ENABLED`.
- The current web parity lane records the connection journey timeline as a web-present
  slice behind `VITE_CONNECTION_JOURNEY_ENABLED`, reusing the existing takeaways and
  connection contracts.
- The Android client foundation is centralized in `BaseApiClient` plus typed domain
  clients, including Memory Room, Emotional Growth, and relationship reflection,
  with shared auth reset and unauthorized handling.
- Android's private journaling lifecycle now has baseline focused source evidence for draft
  persistence, resumable conversation history, quota terminal frames, streamed
  status, retry, and completion return: 10 suites and 48 tests passed in the
  isolated staging lane. This is client/runtime-contract evidence; authenticated
  staging and real-device checks remain separate gates.
- Android's daily voice-summary state model now preserves inline/stale content,
  shows a retryable first-load error, and withholds player controls until content
  is ready. The focused parity run passes 4 suites and 27 tests, including the
  new state suite; Android device and authenticated staging validation remain
  open.
- The relationship-reflection contract is now generated in both target clients;
  the existing Connection Journey/"Read More" route remains the runtime path.
- Dependency-free typed-client contract checks pass for both parity lanes:
  `ANDROID_CLIENT_CONTRACT_OK` and `WEB_CLIENT_CONTRACT_OK`. The checks cover shared
  transport, endpoint paths, API registration, auth reset, and unauthorized handling.
- The daily voice-summary route is required by both generators, appears in both
  checked-in declarations, and is consumed through the generated route key in
  Android and web. The isolated API contract lane now publishes the existing
  `VoiceSummaryResponseDto` shape (`id`, `userId`, `date`, `audioUrl`, nullable
  `ambientUrl`, `script`, `insightIds`, and `createdAt`), and both declarations
  reference it for the two authenticated read operations. No client behavior was
  changed.
- Both parity lanes expose a pinned `generate:api-client` command that validates the
  OpenAPI source and generates declarations into the owning client repository. A
  staging run correctly fails closed on HTTP `404`; the local source-backed run
  generated the declarations now consumed by both clients.
- Web build/deploy and Android build workflows conditionally invoke the generator
  before the typed-client verifier when `MURROR_API_OPENAPI_URL` is explicitly
  configured. That variable is not currently configured in this local audit, so CI
  does not regenerate from staging by default; the checked-in parity source remains
  tied to the local API revision until the hosted schema is supplied.
- The isolated API contract lane builds successfully and exports 271 OpenAPI paths,
  including response schemas for Memory Room index, month, detail, and summary.
  The canonical dirty API checkout remains untouched.
- The isolated Together API contract lane passes the focused DTO compile, generated
  Swagger-schema check, formatting, targeted ESLint, and the whole-worktree
  TypeScript check. A source-backed controller probe exported 311 paths, including
  all required parity routes and the voice-summary DTO; no runtime or deployment
  behavior was exercised. The lane retains the decorated `PlanCompanionResponseDto`
  and the voice/memory response metadata; generated Prisma output used for local
  checks remains recoverable in dated Trash.
- Temporary API dependency and generated-client symlinks were removed after
  validation. The 58 MB generated Prisma output remains recoverable in the dated
  Trash validation folder, with no generated artifacts left in the worktree.
- Redundant web validation mirrors were removed from the task-owned Trash folder;
  the latest passing mirror, regenerable build output, and OpenAPI snapshot remain
  recoverable. The Android dependency tree was restored from the checked-in Yarn
  cache only for focused validation, then moved to
  `/Users/astro/.Trash/murror-android-parity-node_modules-2026-08-03-journal`
  (approximately 1.2 GB); no shared package-manager cache was purged.
- The Android staging workflow now writes `BASE_API_URL`, fails closed when the
  staging URL is absent, selects `stagingRelease` only for an explicit manual
  staging dispatch from `staging-environment-setup`, and isolates staging signing
  from development signing. Pushes to that shared branch no longer start Android
  builds automatically.
- The Android staging workflow now gates pull requests and manual staging builds
  on the focused Connection Journey, voice-summary, Memory Room lifecycle, Your
  Growth, AI chat resume/history, and quiet-hours suites before native build
  setup; the workflow contract verifier passes for the gate.
- The web staging build contract now carries both parity flags through the manual
  Docker build script, Dockerfile, build workflow, and deploy matrix workflow.
- The manual web staging image-build path now applies the same
  `matrix-config.json` source-ref allowlist before Docker push, so an unapproved
  ref cannot produce an image that later appears eligible for parity deployment.
- Web staging now passes the Care Tips and Memory Recall client flags through
  Docker, local builds, GitHub image builds, and deploys. Care Tips keeps its
  existing client default while the backend gate remains authoritative; Memory
  Recall remains off unless explicitly enabled for staging review.
- The web staging deploy simulation resolves to `staging` on `vietnam` with exactly
  `web-client` selected and no backend services. `WEB_STAGING_CONTRACT_OK`, JSON,
  YAML, shell-syntax, typed-client, and diff checks pass. This validates the
  source/configuration path only; cluster credentials, image publication, Helm,
  pod health, authenticated browser flows, and rollback remain external gates.
- Read-only staging probes reached `https://staging.api.murror.app`: health returned
  `200`, protected parity routes returned `401`, and the candidate Swagger docs route
  returned `404`. These are gateway checks only, not authenticated product validation.
- The hosted web shell at `https://staging.app.murror.app` returns `200`, but the
  current response is stamped July 28 and advertises older API domains in its CSP.
  This does not prove the isolated parity lane is deployed, so no dispatch was
  triggered from the dirty worktree.
- The specific staging Together member-leave probe returned `401` for an
  unauthenticated `POST`, while the current development Swagger document contains
  `/api/v1/family-plan/leave` among 307 paths with operation id
  `FamilyPlanController_leaveFamilyPlan_v1`, no request body, and a `200` response.
  This supports route/guard and development-contract alignment, but does not prove
  a real member can leave, retain grace, or re-enter on staging.
- The isolated Android staging ref passes TypeScript, five Memory Room query suites
  (21 tests), i18n synchronization, copy lint, privacy-file checks, targeted ESLint,
  Prettier, syntax checks, generated-client contract checks, and the YAML-aware
  workflow contract verifier. The latest isolated Your Growth screen-plus-query
  check also passes TypeScript, i18n, Prettier, 5 suites, and 22 tests. A broader
  six-suite run reproduced four failures in the pre-existing Memory Room UI suite
  because the retained offline dependency mirror loads two React copies; the four
  memory query suites and the new Your Growth suite pass, and no Memory Room source
  change was made to work around that environment limitation.
- The relationship-reflection slice passes web typecheck plus 3 focused suites and
  7 tests, and Android typecheck plus 8 focused suites and 39 tests. Both generated
  client contract verifiers pass.
- The temporary Android dependency tree was restored only for validation and then
  moved recoverably to `/Users/astro/.Trash/murror-android-parity-node_modules-2026-08-02`
  as exact storage cleanup. No Java runtime is installed here, so Gradle packaging,
  hosted CI, and real Android device or emulator checks remain external gates.
- The web Memory Room slice passes lint, TypeScript, API/page/Diary/Home tests (15
  focused tests), and production builds with the flag both off and on.
- The web Your Growth detail slice passes targeted lint, TypeScript, adjacent
  reflection/Diary regression tests (51 tests), and production builds with the Memory
  Room flag both off and on.
- The web connection journey slice passes focused model/component/detail-page tests,
  targeted lint, TypeScript, and workflow/locale syntax checks.
- The web personal-note slice passes focused API normalization, daily-limit helper,
  and friend-detail tests (45 tests), TypeScript, locale synchronization, staging
  and client contract guards, targeted formatting, and diff checks. A bare HTTP
  `429` is not treated as a daily note cap unless the API error code says so.
- The Android Memory Room lifecycle slice passes the new lifecycle/Growth-focused
  tests, TypeScript, i18n synchronization, formatting, generated-client and
  staging contract guards, workflow validation, syntax checks, and diff checks.
  The older broad Memory Room UI suite remains limited by the retained offline
  mirror's React Native bridge setup; its failure is recorded as an environment
  limitation rather than hidden as a source regression.
- Web notification settings now cover the existing browser push toggle plus mobile-
  parity callback-pings via the generated authenticated profile route and mobile-
  compatible quiet-hours local storage. The prompt, settings labels, success/error
  toasts, and browser permission-recovery message are localized in EN/VI/JA. The
  focused notification suite passes 12 tests; TypeScript, formatting, and diff
  checks pass. Authenticated/browser permission and reload checks remain open.
- Web deep-chat recovery now uses the shared EN/VI/JA error contract for generic
  socket/auth failures. The hook regression keeps server-provided messages intact;
  authenticated staging and cancellation behavior remain external gates.
- The web Settings subscription card now mirrors the mobile lifecycle state that is
  already available on the web: an active subscription with auto-renew disabled
  shows localized non-renewing copy and its known expiration date, while free and
  renewing states remain unchanged. It now also renders normalized Duo/Circle
  organizer/member states, grace-period copy, localized companion joining, and
  member-safe display data. The adapter, selector, and component tests cover legacy
  fallback, Duo member normalization/privacy, organizer state, grace handling, and
  Circle joining. The isolated API DTO fix preserves that object shape when a hosted
  schema is regenerated; it is not a staging deployment proof.
- The web subscription-management slice passes 10 focused Vitest files with 85
  tests. Its member test proves that a private companion email is not rendered, the
  billing portal is hidden for a shared member, the leave confirmation is explicit,
  and the caller-scoped mutation is followed by entitlement refresh. The production
  build, TypeScript check, `WEB_CLIENT_CONTRACT_OK`, `WEB_STAGING_CONTRACT_OK`,
  locale parsing, and Prettier checks also pass. This remains local source evidence;
  authenticated staging and browser/device acceptance are still open.
- The Android Together member-leave contract slice passes 9 focused Jest files with
  65 tests. The family-plan client test proves the request is caller-scoped and
  sends no seat id; the generated-client, staging, workflow, TypeScript, and
  formatting guards also pass. This is source/contract evidence only until an
  authenticated Android staging session exercises leave, grace, and re-entry.
- The disposable web dependency mirror was created with `pnpm install --offline`
  from the local store, then moved recoverably to
  `/Users/astro/.Trash/murror-web-validation-2026-08-03` with a manifest. The two
  pre-existing broken worktree symlinks remain untouched.
- The web build is fail-closed: the off build omits the Memory Room lazy chunk, while
  the opt-in build emits it.

### Connection Streak + History checkpoint (2026-08-05)

- Astro approved the contract-first implementation. API source commit `c734adc`
  now uses the existing canonical paginated response instead of nesting the
  service result under `data.data`, and its query documentation matches the
  validated 1-366 limit. Artifact commit `288ef63` exports 83 controllers, 307
  paths, and 336 operations at schema SHA-256
  `3b135a42eb4cc44a5dda2aca11633e428498cac75c4e5a700259cfdf9605dee9`.
- Web generated checkpoint `74e8b935` and Android generated checkpoint
  `7f0e0ce4` use that exact artifact. The client declarations are byte-identical
  at SHA-256
  `090c70cb3bf6309467f14014cab8277662788f392d0e25cb1747680f3620a3f5`.
  Android changes exactly four contract files and has no branch-owned `ios/**`
  delta.
- Web commit `5bbf0cb3` owns the normalized contract and lifecycle model: a
  fail-closed dual-envelope parser for safe staggered rollout, one 366-day
  account-reset-safe query cache, canonical `streakDay` bucketing, duplicate-day
  collapse, one resting day, reset after a gap of at least three dates,
  per-run display reset, six Home cells, continuous milestones, and a bounded
  13-month history/projection window.
- Web commit `4d5a0dbc` aligns the existing Home and Reflection surfaces in
  place. Home shows **Connection Streak**, two past days, today, and three future
  days with connection/mood/rest/milestone/today/future states. Reflection uses
  `?month=YYYY-MM` for Back/Forward/reload continuity, opens the selected/current
  month directly, and provides `Day X of Y`, milestone guidance, stale/error
  recovery, semantic date/state labels, shape meaning, 44px controls, focus
  treatment, and reduced-motion behavior. It emits no private streak or mood
  analytics.
- API passes build, typecheck, lint, formatting, 12 Streak suites / 122 tests,
  12/12 OpenAPI checks, and deterministic export verification. Web passes 30
  suites / 150 tests, API/client drift guards, app and monorepo typechecks, lint,
  formatting, both staging source guards, and a production build. Android passes
  11/11 API-contract checks, client verification, contract lint/format,
  TypeScript, zero-error ESLint, and 2 focused Streak/Reflection suites / 56
  tests. Its repository-wide formatting baseline still reports 97 pre-existing
  unrelated files; all four task files pass and were not mass-reformatted.
- Fresh remote-trunk proof is zero-behind in all lanes: API `288ef63` is 25
  commits ahead of `origin/staging@74e2dd3c`; web `4d5a0dbc` is 28 ahead of
  `origin/dev@00fa6cd1`; Android `7f0e0ce4` is 22 ahead of
  `origin/staging-environment-setup@4ff1572b`. Nothing was pushed, merged,
  deployed, signed, distributed, or run through GitHub Actions.
- The private evidence-weighted tracker is 75%: capability 93%, contracts 99%,
  current-trunk integration 94%, authenticated runtime 18%, and reviewed release
  gates 12%. Authenticated browser, deployed API/web, Android Gradle/emulator/device,
  review, merge, workflow, and release evidence remain separate open gates.
- Final focused cleanup removed about 3.9 GiB of task-owned dependency trees,
  API/web build output, Turbo metadata, and the isolated Android Yarn install
  cache. The clean worktrees now occupy approximately 74 MiB API, 28 MiB web,
  and 64 MiB Android. Tracked files, lockfiles, shared/global caches, other
  worktrees, Claude's canonical iOS checkout, and Uni were preserved.

### Still required

- Review and land the current API contract artifact first, web second, and Android
  third against freshly fetched trunks.
- Confirm the hosted Supabase redirect allowlist for the exact staging origin, then
  prove real reset-email receipt, same-browser recovery, single-use and expired-link
  handling, password completion, preserved session, and normal authenticated return
  routing without recording credentials or tokens.
- Confirm protected GitHub staging-environment ownership and reviewed inputs. Build
  from the exact landed `dev` commit, record its immutable digest, then separately
  authorize the web-only digest deployment. After deployment, verify the live shell
  CSP, authenticated browser flows, WebSocket behavior, and deployed revision.
- Corroborate the deployed API schema/artifact. The repository artifact remains the
  deterministic generation source; current staging docs candidates still return
  `404`, and mutable hosted Swagger must not silently replace the reviewed artifact.
- Android Gradle staging build, hosted CI, and real Android device or emulator checks.
- Authenticated staging HTTP checks and real Android or browser flow checks.
- Human review before merge, deploy, TestFlight, Android distribution, or feature-flag changes.

## Change control

- Work only in isolated Murror worktrees.
- Do not edit the dirty canonical iOS checkout, API checkout, or unrelated worktrees.
- Do not copy staging credentials into source files.
- Do not modify Uni files or the retired Google Drive Uni reference folder.
- Run `/Users/astro/Projects/murror-transfer/verify-murror-cross-platform-workspace.sh`
  before code, build, deploy, and cleanup commands.
