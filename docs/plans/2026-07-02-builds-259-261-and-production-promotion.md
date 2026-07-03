# Builds 259-261 (QA258/259/260) + the Production Promotion (2026-07-02)

Continuation of `2026-07-01-qa257-sprint-streak-redesign-journal-chat-parity.md` (through build 258). This covers three more QA sprints (builds 259/260/261), two same-day incidents, and the big one: promoting the validated staging codebase to LIVE production, zero downtime.

## QA258 -> build 259 (from build-258 feedback)
- Glass buttons REVERTED to original (byte-identical to pre-glass `d02bfd7`) - Astro disliked the frost on device.
- "shaped by {persona}" chips removed from insight-detail card titles (both journal + chat screens, unification rule); teaching GroundingBlock kept.
- Connections `+` button restyled to match the add-memory-photo `+`.
- Bottomsheet (eye icon, connection detail): horizontal `SlideInRight` -> `LinearTransition` expand-in-place; state untouched; T12 rule respected.
- History story-card uses the same `bedtimeBackgroundForDate(createdAt)` image as home, no text overlay (was a hardcoded gradient with no image).
- "Connection Streak" title on the missed surface (`reflection.streakCardTitle`, rendered on both Home + Reflection; vi was "Chuỗi ngày hạnh phúc"/Happy-day-streak - worse) + benefit subtext + grace-accurate educational progress-bar description.
- PRs #515-#517 -> build 259 (canonical `4303054`).

## QA259 -> build 260 + QUIZ REVAMP + 2 incidents
- CR pending-card stale-cache fix (the T13 detail-bundle migration left 3 mutation hooks invalidating only the legacy `takeawayCards` key; the For Us feed reads `relationshipDetailBundle` - sender saw nothing, resubmitted 4x; DB proof). Receiver read-full quote expand. NEW share confirmation gating connection-scoped sharing.
- QUIZ REVAMP: backend always generated 3 grounded multiple-choice questions but mobile discarded 2 + routed to free-text. Now: own feed card (cyan Quiz badge) + in-chat quiz (3 questions, chips-only, composer hidden) via the SEPARATE `/questions`+`/answers` endpoints - the LOG/QUIZ task-alternation cycle + streaks untouched (reflect card sends the REAL currentTaskType, the old `journalPrompt` proxy would have frozen the cycle). Quiz grounding both sides (murror-api sends recentReflections journal+chat + top-5 salient EIM memories, privacy short-circuited BEFORE query, crisis-filtered AT query; viasr folds them into the existing summaries slot, `relationship.yaml` byte-identical). relationship_type mislabel fixed (was sending LOG/QUIZ where lover/family/friend/colleague expected). explore-deeper you-voice flip (reverses #553's I-voice, all guards kept). reflection-card pronoun-first fix + unbound-gender crash guard. Avatar HEIC normalization (reuse memory-photo normalizer at both avatar sites).
- INCIDENT: LLM chain collapse (`incident_llm_chain_collapse_2026_07_02`). All 4 fallback rungs failed at once - OpenAI removed the "Chat Completions" component from status.openai.com so the check failed CLOSED, Claude truncated tool_use at max_tokens=512, Groq circuit transient, Gemini disabled. Fix: status page advisory-only (fail-open), stop_reason-aware retry at 4x budget, extractor budget 512->1024. viasr #555.
- INCIDENT: staging web-auth ES256 break. Rebuilt staging Supabase signs ES256; the Supabase platform RELAY (not our code) rejected ES256 before our middleware ran (deploy lacked `--no-verify-jwt`). Fix: `--no-verify-jwt` deploy + CI persistence; all 28 functions proven to self-authenticate in-code. murror-backend #896.
- Also: `exploreConnection` cuid-into-UUID-lookup crash fixed (bundle #540 + controllers #541), quiz-compare answers payload (privacy-gated, #546).
- PRs #520-#523 mobile -> build 260 (`f78db05`).

## QA260 -> build 261
- Pending RC card: vertically centered + `connection_reflecting` background artwork + "Remind them" copy (was top-anchored on flat blue). The centering was a scoped one-line bug (top-anchor rule for the bubble state was catching the waiting state too).
- Share-confirm popup reframed as an invitation ("Invite {name} to reflect on this too? ... Your full entry stays yours.") + warmer MessageIcon (was a red half-open-door reading as exit). Finding: receiver never sees the sender's full entry, only a one-line takeaway that seeds their own reflection.
- Quiz AFTER-flow (the before/during/after rule): post-submit anticipation -> no-rush wait state (with nudge) -> "you both answered" invitation card -> a COMPARE DETAIL PAGE (reuses the journal/chat detail-page design system) showing all 3 questions side-by-side + "Murror noticed" insight when present. Backend read path added (both users' answers exposed ONLY when the day is COMPLETED - privacy-gated, #546).
- History loading card fix: an `observer()` component read the pending-journal MobX store only inside effects, never in render body, so MobX never subscribed it; the screen sits on a frozen tab that never remounts -> the loading card appeared only by lucky coincidence. Read the store in render body.
- PRs #525-#528 -> build 261 (`f66ef3e`).

## THE PRODUCTION PROMOTION (the headline)
Goal: "get prod current" - promote the validated staging codebase to live production without disrupting real users.

**Premise corrections (each gate caught something):**
1. The infra scan mistook the DEAD Vietnam-k3s prod (scaled to 0, `vn` context) for production. Live verification: prod is healthy on DOKS (`do-sfo2-murror-cluster`, `nsp-prod-murror(-ai)`), serving real users, murror-api `0.36.15`, beat running. So "move to DOKS" was already done.
2. The "verify no prod-only commits" gate caught that `production` had DIVERGED from staging: 33 murror-api + 6 viasr commits applied DIRECTLY to prod (bypassing staging), including security + prod-data-loss fixes. A naive fast-forward would have dropped them.

**Reconciliation (Opus, read-only + local dry-run):** staging turned out to be a strict SUPERSET - the staging QA/security sweep had re-implemented essentially every prod hotfix. murror-api: 24 already-in-staging / 3 superseded / 1 must-drop / 0 genuinely-prod-only. viasr: all 6 already in staging. Built reconcile merges (staging INTO production, take-staging default + Astro's 2 posture decisions); resolved 23 (murror-api) + 4 (viasr) conflicts; DATA-LOSS guard + data-integrity fixes + crisis hardening confirmed surviving; DI boots; 626+137 tests pass. `git diff origin/staging..reconcile` = 0 files (tree-identical to validated staging).

**Pre-flight + gates:** 9 pending Prisma migrations proven ADDITIVE via local Postgres dry-run (0 drops/retypes; only 18 nullable cols + 5 enum values); crisis-detection eval CLEARED with fresh 100% must-flag (the earlier "0%" was a DNS/unreachable-host artifact); crisis-gate fail-open HARDENING added (any Statsig error -> crisis stays ON, not just "unrecognized"; `endswith(":Recognized")` strict check; viasr #566); restore point = prod daily backup 2026-07-02T21:35Z (PITR is OFF - held, no spend).

**Promote (both together, on Opus):** fast-forwarded `production` -> reconcile (murror-api `033d88d`, viasr `9e9ccb2`; no force). Deployed via `deploy-matrix.yml`/`ci.yaml` workflow_dispatch (environment=production). murror-api migration Job Complete (9 additive, gated) then rolled to `0.37.0`; verified 131 migrations applied + RLS still ON on emotion_events/diary_entries/deep_chat_messages/user_profile (2026-07-02 exposure fix survived). viasr rolled to `prod-9e9ccb2`, Statsig healthy, crisis gate ON. ZERO downtime (old code served through the additive migration).

**Follow-ups filed/done:**
- CI-deployer cronjob RBAC (viasr deploy false red-X): the daily-voice-summary CronJob was MISSING in prod entirely (it's the sole trigger, not redundant with beat - beat's `last_run_at` on ephemeral disk + `strategy: Recreate` = zero fires on deploy-day). Granted additive RBAC + applied the CronJob (fires 3:30 UTC).
- Drift guard (both repos, merged to staging #548/#567): daily-cron + push-to-production check that fails if merging production into staging would change staging (`git merge-tree --write-tree` content comparison - NOT rev-list/cherry, both false-positive on merge-based promotion + re-implemented fixes).
- OPEN: flip prod `shared_photos_enabled` Statsig gate ON (Memories dark until then - Astro's take-staging choice); prod-pointed mobile build HELD; enable PITR (deferred); rotate the pasted Supabase token; viasr CLAUDE.md stale-doc ("no production branch").

## Gotchas / lessons
- Verify the LIVE topology before acting on an infra assessment - the first scan named the wrong (dead) cluster as prod.
- Before promoting a branch, `git rev-list staging..production` must be checked - production had 39 direct hotfixes that a naive promote would have silently dropped.
- After a merge-based promotion, `git rev-list` AND `git cherry` both false-positive (SHA + patch-id divergence from merge commits + re-implemented fixes); the accurate "in sync" check is `git merge-tree --write-tree staging production == staging^{tree}`.
- A feature-flag service auth error (Statsig 401) silently disabling a SAFETY gate is a real class - safety gates must fail-open to ON on ANY flag error, not just "unrecognized."
- The reconcile-tree == staging-tree (0-file diff) is the strongest possible proof a divergent-branch merge preserved the validated state.

## Verification
- murror-api prod `/api/health` 200, image 0.37.0, migration Job Complete, 131 migrations, RLS anon-safe (bool_and true).
- viasr prod healthy (murror-ai + beat + celery-worker 1/1), Statsig init OK, crisis gate ON.
- Reconcile branches tree-identical to origin/staging (both repos, 0-file diff).
- Local migration dry-run: 9/9 apply clean on a faithful prod replica.
- Crisis eval fresh: 100% must-flag (988/Crisis Text Line), 0 false positives.
