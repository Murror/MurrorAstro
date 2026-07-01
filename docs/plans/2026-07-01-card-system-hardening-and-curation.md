# Card system hardening + curation groundwork (2026-06-30 → 07-01)

Continuation of the QA248 sprint (see `2026-06-30-qa248-sprint.md`). Astro QA'd more cards, which surfaced systemic backend gaps (Flyway migration drift, a fallback-string crash, a missing takeaway reaper, a dead notification flag). All fixed + deployed to staging. A full card-health audit + a 4-lens design panel on card curation followed. Builds 250 + 251 shipped to TestFlight.

## Shipped to staging

### viasr-api
- **#544** (`e7d2b8d`): dive-deeper drops the redundant 2nd LLM call (name/pronoun swap done in code), model rebalance, reflection-card rules moved to system_prompt.
- **#545** (`ccdf372`): **V20 migration** re-applies the `user_profile (user_id) WHERE deleted_at IS NULL` partial unique index (skipped because staging was Flyway-baselined at V15, so V1-V14 never ran) + a **universal `safe_validate_suggestion` guard** so a provider-failure fallback string can never crash the whole insight (it was crashing `Movie.model_validate_json`). Root cause of the `saolasao8` stuck FOR US card.
- **#546** (`fab21cb`): **V21 migration** converts `user_persona` columns to their intended types (`text[]`/`jsonb`/`double precision`) so the "learned persona" writes finally succeed (were failing silently, 0 rows), + re-adds the below-baseline hot-table indexes.

### murror-api
- **#527**: `TakeawayReflectionReaperService` (5-min cron, cluster-locked, mark-FAILED-only) reaps takeaway rows stuck in PENDING > 15 min. ~37% of takeaways were stuck forever because no reaper scanned `takeaway_reflections`. Does NOT reuse the disabled autoFixMissingInsights loop.
- **#528**: care notification **default-on**. Root cause: two `enable_notification` columns (legacy `public.user_profiles` read by viasr, murror `User` written by the app); onboarding never set the legacy one, so it stayed false for all 143 users. Sets `@default(true)` on both + backfills. Verified 143/143 enabled post-deploy.

### MurrorMobile
- **Build 250** (`3f880be`): self-stopping Home feed poll + dead-code removal.
- **Build 252** (`967bd59` challenge fix): tapping opens a details popup (`MUPopup`) instead of blanking; body truncated to 4 lines; the wrong generic "Dive deeper"->CRI button removed; receiver-only Accept, sender sees "Waiting for {name}". Decline intentionally NOT added (X-to-dismiss covers it, per Astro).
  - **Build-251 collision (why the fix first missed TestFlight):** two build 251s existed. A parallel session's 251 (PR #496: `03f9de1` bump + `4459638` render-perf hoist + lint cleanup) was merged to the canonical `staging-environment-setup` WITHOUT the challenge fix, and reached TestFlight; this session's 251 (`build/251` @ `a0c82c8`) carried the challenge fix but not the render-perf, and Apple rejected the duplicate build number. Resolved by rebuilding as **252** off `origin/staging-environment-setup` + cherry-picking `3f880be` (Home poll perf) and `967bd59` (challenge fix) [clean auto-merge on insight-card.tsx, `tsc` exit 0], bump `e3d4d7c`. Uploaded 2026-07-01 01:38 PST. FOLLOW-UP: fold `967bd59` + `3f880be` into `staging-environment-setup` so the two build lines stop diverging (they currently live only on `build/252`). LESSON: iOS build numbers are a cross-session shared resource; check `origin/staging-environment-setup` `CURRENT_PROJECT_VERSION` before uploading.

## Audits + design
- **Card-health audit** (`docs/card-mechanics-audit-2026-06-30.md` is the taxonomy): 11/14 card types healthy on staging. DEGRADED: Takeaway (fixed via #527), Challenge (mobile fix, build 251), Daily prompt (stale 8 days - Astro decided: keep off). Movie fallback-crash verified gone post-deploy.
- **"When to show what" curation panel** (Heart / Prism / North / Iris): converged on "one calm thing at a time" - a single hero card (Tier-0 core reflection always shown), everything else earned via tiers + state + cooldowns, silence/empty as a feature, never manufacture filler. Iris's build path: a pure `curateCards()` layer behind a `FEED_CURATION` Statsig flag (flag-off = today's behavior), rolled out Stage 1 (config allowlist, delivers "suggestions on / daily-prompt off / challenge simplified" now) -> Stage 2 (scoring + caps + cooldowns). NOT yet built - awaiting Astro's direction on the forks (strict-hero vs hero+"Look closer", Not-now/Remove split, instrumentation first).

## Gotchas / lessons
- **Flyway baseline drift**: staging baselined at V15 means V1-V14 never ran. V7's index + V4's persona types were silently missing. Audited V1-V14; only user_persona (V21) + hot indexes were genuine gaps; the rest obsolete. Watch for this class on any baselined env.
- **The provider-failure fallback string** ("I'm having trouble responding...") reaching an unguarded `model_validate_json` crashes the whole insight. `safe_validate_suggestion` (a central detectable signal) now guards every suggestion parse.
- **Two enable_notification columns**: the app-facing toggle and the viasr-read flag are different columns on different tables. Fixing one alone would not have worked.
- **Card curation near-term**: Astro hand-curated (suggestions in, daily prompt out, challenge simplified) rather than blanket-gating; the full mechanic is designed but paused for his direction.
- **Session instability**: repeated teardowns killed background agents; all fix work was committed incrementally per PR. A background task also hijacked the main MurrorMobile worktree onto a chore branch with cross-session files (stashed, preserved).
