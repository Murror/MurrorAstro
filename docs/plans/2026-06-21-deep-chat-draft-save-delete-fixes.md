# 2026-06-21 (PM) — Deep-chat: draft Save + Delete fixes (prod)

## Reported bugs (prod, web.murror.app)
1. After a mood check-in, an existing AI-chat draft is restored; clicking **Save**
   "keeps loading then says couldn't save."
2. Clicking **Delete draft** did not actually delete the draft (it came back).

## Root causes (verified)
- **Save fails:** the conversation lifecycle is DRAFT -> ACTIVE -> COMPLETING ->
  COMPLETED. `findLatestResumable` (restore) and `canSendMessage` allow DRAFT +
  ACTIVE, but `canComplete()` allows only ACTIVE. A resumed DRAFT is therefore
  restorable + shows Save, but `/complete` threw `BadRequest: Cannot complete
  conversation in status: DRAFT` (only if the user did not first send a new
  message, which would activate it). 761 legacy 2025 drafts (all is_draft=true,
  with messages, done_at null) were being surfaced this way.
- **The real "keeps loading then couldn't save":** the complete route
  (deep-chat.controller.ts) POLLS up to 90s for viasr to finish the journal, but
  the nginx ingress has no proxy-read-timeout override (60s default). Any
  completion that ran long, or could never finish (a legacy draft with no
  viasr-side messages), produced an nginx 504 -> the web `saveConversationError`
  toast. Confirmed via prod log: `Conversation X not completed after 90000ms`,
  responseTime 91239ms, while the client got 504 at 60s.
- **Delete does nothing:** `handleConfirmDeleteChat` (journal-write-page.tsx)
  only cleared localStorage + reset local redux; it never called the server, and
  the web had no delete mutation. The server draft survived and the restore read
  re-surfaced it. (The DELETE /current-draft endpoint + soft-delete use-case
  already existed; only the client wiring was missing.)

## Fixes shipped (all live prod + staging)
- **Fix C (data):** soft-deleted the 761 stale legacy DRAFTs in prod
  (deleted_at=now, reversible). Immediate relief: 0 resumable DRAFTs remain.
- **Fix A (murror-api #497, commit 3132454 / prod df6c884):** activate a DRAFT
  in CompleteConversationUseCase before completing (mirrors SendMessageUseCase).
  +5 unit tests (complete-conversation.use-case.spec.ts). Verified in prod pod
  (`activate` present). E2E on staging: DRAFT -> ACTIVE -> completion proceeds
  (no more instant 400).
- **Fix B (web #136, commit ce371969):** add `deleteCurrentDraft` mutation
  (DELETE /v1/deep-chat/current-draft) + call it in handleConfirmDeleteChat +
  latch submittedRef so the unmount-save cannot re-persist. Built + deployed web
  staging/alpha/prod. E2E on staging: seed draft -> DELETE -> 200 -> draft gone
  -> deleted_at set.
- **Fix D (murror-api #498, commit 78ac1f4 / prod via deploy-matrix):** cap the
  complete poll 90s -> 50s (under nginx 60s) so it returns a 2xx `processing`
  before nginx cuts the connection; the journal finalizes async. Verified on
  staging: the previously-504 Save now returns `202 processing` at 51s. Verified
  in prod pod (`maxWaitMs = 50000`).
- **Fix (CI) (murror-api #499, commit 33fb00f):** the staging deploy-matrix
  skip-rebuild guard ("skip if version tag exists") shipped a stale image when
  two commits shared a semver (Fix D was in source but not the pod). Restricted
  the skip to workflow_dispatch re-deploys; always build on push. (Production's
  deploy-matrix has no skip step, so prod was unaffected; Fix A had deployed
  cleanly.)

## E2E verification (staging, real test-user token)
- Minted a Supabase session for a redeemtest user (admin generate_link +
  verify). Staging Supabase project sprkxmwrvgqgebajopwp; API staging.api.murror.app.
- Save flow: DRAFT seeded -> GET /current-draft/messages returns it -> POST
  /complete returns 202 `processing` at ~51s (was 504). Activate confirmed.
- Delete flow: DRAFT seeded -> GET returns it -> DELETE /current-draft 200 ->
  GET returns empty -> deleted_at set.

## Gotchas
- `UID` is a read-only shell var (use USERID).
- deep_chat_messages.message_source enum = USER/AI/PREDEFINED (uppercase); the
  lowercase "user" is only the API response mapping.
- psql rejects the `?schema=...` query param on MURROR_DATABASE_URL_EXTERNAL;
  strip it and schema-qualify (murror_api.*).
- murror-api production branch is actively advanced by release routines; the main
  checkout was on `production` mid-session. Cherry-pick onto origin/production in
  a clean checkout; production deploy-matrix has NO force_rebuild input (don't
  pass it) and NO skip step.

## Rollback
- Fix C data: `UPDATE murror_api.deep_chat_conversations SET deleted_at=NULL
  WHERE status='DRAFT' AND done_at IS NULL AND created_at<'2026-01-01' AND
  deleted_at IS NOT NULL;`
- Code: redeploy prior murror-api/web images.

## Follow-ups
- Alpha (nsp-dev-murror) not updated with Fix A/D (deferred per Astro).
- Longer term: the complete endpoint could return 202 immediately and rely fully
  on the socket "generation complete" event instead of a 50s poll.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
