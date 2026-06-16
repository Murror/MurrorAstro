# 2026-06-16 — Retention notifications + Care Tips lifecycle redesign

Staging-only sprint (no prod, no MurrorMobile builds). Three streams: (A) re-engagement notifications, (B) Care Tips lifecycle redesign, (C) a new standing brainstorming rule. Plus a Q2 investor update draft.

## A. Retention notifications sprint (murror-api + MurrorMobile)

All merged to `staging` and deployed; mobile = code/PR only (no TestFlight).

- **Connection-request push** — PR #462 (0ebdbe6). Was silently broken (no consumer). Added `CONNECTION_REQUEST_SENT` consumer; also aligned deep-link type strings (`artwork_generated`, `voice_summary`).
- **AI connection-insight push** — PR #465 (f0d0352). Fires from `ConnectionInsightResponseHandlerService.handleCompleted`, fire-and-forget, notifies BOTH members, quiet-hours aware, bilingual, type `connection_insight_ready`. NOT flag-gated → live on deploy.
- **Streak-loss reminder** — PR #464 (f3dfa08). Hourly `@Cron`, fires at user local 20:00 if active streak + not journaled today. Cross-replica de-dupe via new `streak_reminder_log` table (UNIQUE user_id+local-day). Migration `20260616000000_add_streak_reminder_log` applied.
- **Streak reminder turned ON in non-prod** — PR #467 (903b729). murror-api's Statsig tier = `NODE_ENV` = `production` on every tier, so a gate can't target staging-only and there is no Statsig console key in-cluster. Fix: expose the deploy's `ENVIRONMENT` var to the app (k8s/manifests.yml, `${ENVIRONMENT}`) and `StreakReminderService.nonProdDefaultOn()` defaults ON for staging/alpha/development (allow-list, fail-safe-off). Prod (`ENVIRONMENT=production`) stays dark; kill-switch still wins. Verified live: pod `ENVIRONMENT=staging`, scheduler module initialized. **Side benefit: murror-api now has `process.env.ENVIRONMENT` for any future per-env code.**
- **Mobile deep-links** — MurrorMobile PR #480 (b8c06a7) merged to `staging-environment-setup`: routes `movie_invite`, `milestone_voice_ready`, `connection_insight_ready`, `care_tip_ready`, `streak_reminder`. PR #481: fixed a pre-existing TS error by passing `date` to `DailyVoiceSummaryScreen` on the `voice_summary` push (the daily-voice push now also opens the correct day).
- **Care Tips runtime-confirmed live** (the "card not populating" fix): web image staging-aa6f1d26 (build-arg), murror-api defer PR #463 (2c47c8f), viasr non-prod default PR #486 (aaa6653). Proven via in-pod `POST /care-tips/generate` returning populated tips + `care_tips.service ... cold-start path` log (service ran ⇒ gate ON).

## B. Care Tips lifecycle redesign (web + viasr + murror-api; web-only scope)

Brainstormed before/during/after. Design + plan: `murror-platform/docs/plans/2026-06-16-care-tips-lifecycle-redesign-design.md` + `-redesign.md`.

Root problems: every connection showed the same generic content; the "Message {name}" CTA promised messaging the app can't do (it only navigated to /friends/:id); and dismissing a tip silently killed that connection's tips forever (permanent `string[]` of cardKeys, stable per-connection key).

Shipped (all live on staging):
- **Dismiss-bug fix** (web, 95d87cc2): `DISMISSED_FEED_CARDS_KEY` is now `Record<cardKey, ISO>`; `applyDismissals` re-surfaces a card whose `generatedAt` > dismissal; legacy array migrates to epoch; non-careTip cards keep prior behavior. Files: `use-cross-connection-feed.ts`, `feed-card-builder.ts`.
- **Honest CTA + lifecycle** (web, 3b982e99): hero "Reflect on {name}" → `/deep-chat` seeded `{journalPrompt, relationshipId, reflectConnection}` (journal-write-page seeds the picker); secondary "Write to {name}" → `shareOrCopy` (Web Share API + clipboard fallback, AbortError=cancelled) with editable draft, never claims to send. Write chip→collapse; Reflect acknowledgment + per-connection rest window (REFLECT 6d / WRITE 3d / ACK 24h). Dismiss softened to "set aside" + one-time reassurance. 5 analytics events via new pluggable `care-tip-analytics` sink.
- **Personalization** (viasr PR #490, branch feat/care-tips-personalization → staging-d574050): cold-start interpolates `partner_name` + varies by `relationship_type`/`how_we_met`; LLM path grounds in `user_context_about_partner` + excludes `recent_shown_tips` + flavor rotation. New optional `CareTipsRequest` fields in `app/api/controller/care_tips/route.py`; prompt `app/prompts/care_tips.yaml`. RUNTIME-CONFIRMED in-pod: Sofia vs Marcus tips name the person and differ.
- **Context + no-repeat + pause** (murror-api PR #469 c737198 → 0.106.0-staging): use-case sends partner_name + user_context_about_partner (from viewer's RelationshipReflection) + recent_shown_tips; persists recent-shown on the `care_tips` cache row. Pause: `PATCH /api/v1/connections/:connectionId/care-tips/settings {paused}` → GET returns empty + `paused:true` without calling viasr. Migrations `20260616020000_add_recent_shown_tips` + `20260616140000_add_care_tips_paused` applied. Web pause toggle on `friend-detail-page.tsx`.
- **Web deploy**: branch `feat/care-tips-lifecycle` built (staging-50ce5f61) + `kubectl set image` (field-manager-drift gotcha). PR #72 → feat/web-app-from-mobile persists the web code so a later deploy can't revert it.

Deferred (per plan, NOT built): ignored-N-times back-off ladder; connection priority algorithm (crisis-signal pinning, longest-since-contact); cross-device backend action record + cooldown-gated regeneration; post-reflect forward message.

## C. Standing rule — brainstorm before/during/after

Every feature brainstorm must design the full lifecycle: before (triggers/entry/context), during (interaction), after (dismissal/return/refresh/next state). Baked into `~/.claude/skills/brainstorming/SKILL.md` (Presenting-the-design bullet + Key Principle) + memory `feedback_brainstorm_before_during_after`.

## Q2 investor update
Drafted + saved to Notion ("Murror team updates" → "Q2 2026 Investor Update: The AI-Native Quarter (Draft)"). Em-dash-free; bracketed metric placeholders. Thesis: app-with-AI → AI-native, foundational quarter.

## Verification + gotchas
- Gates green pre-merge: web 100+ care-tip vitest + tsc; viasr 24 pytest + ruff; murror-api 39 jest + build + prisma + prettier. Streak: 22 jest. AI-insight: 144 jest.
- All migrations applied on staging (confirmed in migration-job logs).
- **Verification gap:** no working staging password this session → full user-level click-through E2E (login, tap Reflect/Write, pause toggle) not run. Proven instead via deploys + migrations + in-pod viasr personalization. Memory-grounded LLM tips need real per-connection data to see live (unit-tested).
- **Concurrent-session hazard observed**: another session's viasr #489 queued behind #490; serialized cleanly (both merged). Lesson: one repo per session or unique branches + commit promptly; shared working tree is the danger (caused the earlier streak/AI-insight entanglement).
- **Loose end:** stale viasr test `tests/core/feature_flag/test_care_tips_flag.py` asserts CARE_TIPS_ENABLED default False (now True since #486). Task chip spawned.

## PRs
murror-api: #462 #463 #464 #465 #467 #469 (+ other-session #466 #468). viasr: #486 #490 (+ other-session #487). MurrorMobile: #480 #481. murror-platform (web): #72 (care-tips → web branch). Care-tips branches: feat/care-tips-lifecycle, feat/care-tips-personalization, feat/care-tips-context.
