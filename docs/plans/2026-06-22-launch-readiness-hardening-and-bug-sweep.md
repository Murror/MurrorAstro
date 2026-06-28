# 2026-06-22 Launch-readiness sweep, security hardening, follow-ups + bug batch

Continuation of the same day's `2026-06-22-prod-incident-three-fixes.md`. This covers
the multi-agent launch-readiness QA sweep, the security fixes it surfaced, the 6
hardening follow-ups, and a batch of user-reported bugs. All shipped + verified in prod.

## Final prod state (end of session)
- web: `prod-7728793d` (feat/web-app-from-mobile)
- murror-api: `0.36.10` (production branch)
- viasr: `prod-a8e4c24` (production branch)
- murror-backend: edge functions on `main` (friend-invite cleanup scoped; db push re-enabled)
- web.murror.app 200, murror.api/health 200, viasr healthy.

## Launch QA sweep — 4 P0s (multi-agent, verified live)
1. **IDOR x3 (vault, live-proven)** — fixed in murror-api #504 (prod 0.36.8):
   - `GET /relationships/:id/progress` (PII leak) + `/messages` (private messages): added connection-membership ownership checks (403 / 404). Verified live: foreign connection -> 403 (progress) / 404 data:null (messages); own -> 200.
   - `PATCH /connections/takeaways/:id/audio`: owner-scoped (sender/receiver) -> 404 for non-owners.
   - Admin diagnostics routes gated behind AdminApiKeyGuard (reused BullBoard's timing-safe x-admin-key; Supabase AuthGuard has no roles array so RolesGuard would DoS). Swagger hidden when ENVIRONMENT=production.
2. **Journal data loss — deep_chat_messages.message_source enum cast (viasr #520, prod-ee31df3):** prod column is the `DeepChatMessageSource` enum but the ORM bound a varchar literal -> 39 DatatypeMismatch/24h -> USER messages saved to Redis only, dropped from the durable journal. Staging column is `text` so staging was blind. Fixed: map column as postgresql.ENUM(create_type=False). Verified 0 errors post-deploy.
3. **friend_invitations mass-wipe re-armed (murror-backend #893):** main's cleanUpExpiredLinks was unscoped (`WHERE created_at < $1`) -> would soft-delete 63 ACCEPTED friendships on next invite-link gen. Scoped to `deleted_at IS NULL AND status='SENT'`. 2-file surgical change off main (NOT the divergent hotfix branch); gated the ledger-blocked db push step.
4. **Cross-account client cache leak (web #147, prod-42d22a53):** after sign-out + sign-in as a different user, the global RTK `getProfile` cache + localStorage `murror_profile_cache` were never cleared -> user B saw user A's account. Fix: `resetAllApis()` helper + full hygiene in the UI logout (use-auth) + AuthProvider; user-scoped boot seed; ProtectedRoute holds loader until `profile.id === authUser.id`. (Earlier sentinel agent flagged it as still-broken: that was a STALE checkout read; the fix was confirmed live on origin tip + prod.)

Crisis-safety verified GREEN (heart agent proved it defaults ON in prod live, overriding atlas "verify").

## 6 hardening follow-ups (all shipped)
1. **App-feature-tour empathy fix (viasr #521):** the detector substring-matched emotional words (update/page/navigate/broken) and hijacked emotional messages into a dry app tour. Now requires help-intent + UI anchor with an emotion-word veto. Crisis short-circuit untouched.
2. **Rate limiting (murror-api #505):** moved ThrottlerStorage to Redis (cluster-wide, atomic Lua, fails open) + tight @Throttle on redeem (10/min) and AI/chat routes (20/min). Auth-hook webhook intentionally NOT IP-throttled.
3. **Security headers:** API (murror-api #505) helmet + x-powered-by off. Web (#149) Referrer-Policy + Permissions-Policy enforced + CSP **Report-Only** (launch-safe; surfaces violations without breaking OAuth/paywall/OneSignal). nginx.conf, repeated per location block.
4. **Slow-query indexes (murror-api #505):** composite indexes on connection_insights(connection_id, generated_at DESC, created_at DESC) + deep_chat_conversations(user_id, deleted_at, created_at DESC). Plain CREATE INDEX (tables tiny: 83 / 2.8k rows) = transaction-safe for migrate deploy.
5. **Article pipeline:** verified WORKING in prod (consumer bound, no errors). Only remaining = create Statsig gate `trigger_new_article_generation_via_rabbitmq` = ON (human; works today via code-default fallback).
6. **Phantom migration ledger + staging drift:** deleted the 2 phantom rows (20260312000000 / 20260312100000) from prod + staging `supabase_migrations.schema_migrations` (ledger == 244 repo files, zero backlog), re-enabled db push (murror-backend #894). Staging drift fixed: User.enable_notification/is_panic_mode SET NOT NULL, dropped orphan voice_summaries."ambientUrl"; shared_photos tables present.

## User-reported bug batch
- **Sign-up link black-on-dark (web #150):** auth card is a dark glass gradient; links were text-black (invisible). Sign-up -> white + bold; forgot-password + back-to-sign-in -> white/90. update-password-page left black (white card).
- **Reflection streak fragmented (web #151):** streak info folded into the card description.
- **"Generating Insight" CTA during summary gen (web #151):** perspective cards now show the same loading shimmer as "Within You" (no button).
- **Slow app load / no caching (web #151 + #152):** (a) .mp4/.webm now cached 7d in nginx (were re-fetched every ~4h; Cloudflare converges as its 4h entries expire). (b) Locale bundle split (#152): English eager, vi/ja lazy-loaded as separate chunks -> main entry chunk 1080KB -> 786KB (-288KB / -27%). Language switch routes through changeLanguageWithLoad (idempotent, fails safe to en).
- **Bedtime story never generated (viasr #522 + murror-api #506):** NOT timezone/beat-pod. `VOICE_INSIGHTS_ENABLED` resolved OFF in prod (undefined Statsig + non-prod-only UNRECOGNIZED_USES_DEFAULT + stale "no beat pod" note; beat pod runs since 2026-06-13). Moved into base UNRECOGNIZED_USES_DEFAULT (default-on everywhere). Secondary: voice-summary eligibility day-window now computed in UTC (was server-local) so non-UTC users' day matches what viasr sends.
- **Takeaway/insight page loads forever (Astro + Khanh) (murror-api #506):** the actual takeaway was fine; the shared-insight/relationship-reflection detail returned status GENERATING when there was no seed insight and never dispatched -> infinite spinner (~52/62 prod connections). Now returns 404 (terminal) which the web renders as a calm empty state.
- **Movie "Ask to join" did nothing (murror-api #506):** backend 500 -- the ConnectionId value object rejected legacy bare-hex connection ids (e.g. c0f501b5403744ff2a0b28304f4148a90) that exist as real prod primary keys, breaking movie/place/song/challenge CREATE. VO now also accepts the legacy hex form (id is already resolved + access-checked when the VO runs).

## Data ops (prod, reversible)
- Restored 2 soft-deleted ACTIVE conversations (delete-draft data loss, earlier doc).
- Deleted 2 phantom migration-ledger rows (prod + staging).
- Staging drift ALTERs (NOT NULL x2, drop orphan column) — staging only.

## Gotchas / lessons (recurring)
- **Prod-vs-staging schema drift is a silent-data-loss class:** the enum-cast bug only manifested in prod (enum) and was invisible on staging (text). Always check prod column types for hot write tables; staging E2E can be blind.
- **Statsig undefined=OFF trap keeps recurring** (council, article, now voice): a default-True flag goes dark in prod because the gate is undefined AND excluded from prod UNRECOGNIZED_USES_DEFAULT. Fix pattern = move into the BASE set. Server keys cannot manage Statsig, so creating the gates is a human action.
- **dev-branch web clobber** (from earlier doc): prod web must only build from feat/web-app-from-mobile; guard merged to dev (#145).
- **commitlint header <= 100 chars** in murror-api (a long subject silently aborts the commit -> empty branch -> PR fails with "no commits").
- **murror-api migration runner** wraps in a transaction -> CREATE INDEX CONCURRENTLY fails; use plain CREATE INDEX for small tables.

## Open / human action items
- Astro: create Statsig gates `voice_insights_enabled` = ON and `trigger_new_article_generation_via_rabbitmq` = ON (both work via code fallback; gates make them durable + dashboard-controllable).
- Cloudflare: persona/welcome .mp4 still served from CF's old 4h cache until those entries expire (~4h) then pick up the 7d header; no purge perm on the API token.
- Deferred perf: optional PWA service worker for near-instant repeat visits (needs careful OneSignal-SW coexistence + QA).
- Connection-id backfill: malformed legacy `connections.id` values -> real CUIDs is the permanent fix (FK migration, separate track); the VO relaxation is the immediate unblock.
