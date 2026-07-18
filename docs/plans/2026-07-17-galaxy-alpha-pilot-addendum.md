# Galaxy Alpha Pilot — Scope Addendum

- **Date:** 2026-07-17
- **Author:** Claude with Astro
- **Status:** Approved (mockup round 1 signed off 2026-07-17)
- **Supersedes:** the *sequencing* of `2026-07-09-galaxy-pilot-implementation.md` for the Alpha pilot. All invariants in that plan and in `2026-07-09-galaxy-design.md` remain binding.

## 1. What changed

Galaxy pilots first on the **Alpha app only** ("Murror Alpha", dev scheme, dev backend `ormdzpvhrzvietlsvmro`, internal cohort). The original 12-task plan was written for a real 18+ external pilot; this addendum cuts it to the slice an internal test-bed needs, without weakening any privacy or safety invariant.

## 2. Locked decisions (Astro, 2026-07-17, after 6-agent panel)

| # | Decision | Detail |
|---|---|---|
| 1 | **Continuous zoom-out from day one** | One camera: My Space constellation at center, Galaxy field beyond it. Implementation: flag-on home renders a new composite scene; flag-off home stays byte-identical. Deliberate **threshold** ("Beyond your circle") with commit tap on first crossing; glide-through ring afterwards. Never swipe/drift into stranger content accidentally. |
| 2 | **Mock-first mobile + parallel API** | `FixtureGalaxyApiClient` behind the same interface as the real client (`GALAXY_USE_FIXTURES` one-line swap). Mobile UX is feelable on device before endpoints exist. |
| 3 | **All intentions in Alpha, including romance** | Full intention picker (friendship / romance / collaboration / open). Near-empty pools accepted at Alpha scale. |
| 4 | **Seeding = dummy seeds + team Signals** | 8–12 seeded Signals on the existing dev dummy users, tagged `seedSource='astro_dummy'`, bulk-deletable. Team members write real Signals for the emotional read. Seeds get an "Example" label or are purged before any non-team tester. Never fake personas presented as human; never fabricated resonances. |

Approved mockups (round 1): claude.ai artifact `galaxy-alpha-mockups-r1` — hero flow with before/during/after states. Round 2 (Resonances inbox + Orbit graduation) mocked before those screens are built.

## 3. Phase-1 cut

### Mobile (repo: MurrorMobile, all PRs flag-dark to `staging-environment-setup`, flag `galaxy_enabled`, resolver `src/utils/galaxy-variant.ts`, env default ON in dev scheme only)

1. Foundation: flag + resolver, persisted-cache exclusion for `galaxy*` keys, gated lazy `GalaxyScreen` stub, fail-safe deep link, API types/client/fixtures, query hooks. *(in flight)*
2. Galaxy scene model (signal lifecycle state machine, pure + tested).
3. Renderer + orbit view: composite zoom-out scene, threshold veil, intention-colored signal stars. Reuses onboarding-v2 core primitives read-only; **never** imports `home-orbital-scene-model`; onboarding files stay byte-frozen.
4. Signal card + list view + decisions (♡ / listen / pass + Undo over server truth; Hide/Block/Report in guarded overflow).
5. Composer + after-states (new-words-only trust line, preview gate "Let it drift", Heart's approved copy set).
6. Fixture → real API swap + Alpha TestFlight build (own build lane, isolated worktree, per the recorded Alpha recipe).

### API (repo: murror-api, branch lane `feat/galaxy-pilot-api` → `main`, server-enforced default-off `galaxy_enabled` gate)

| In Phase 1 | Deferred (safe for internal cohort) |
|---|---|
| Full Prisma schema up front (all models incl. dormant moderation columns), `schema.murror.prisma` only | Moderation case workflow (report **rows** are written; review is manual-via-DB) |
| Settings + signal publish/withdraw + pre-publish validator (contact/link/solicitation/**crisis** refuse, fail conservative, draft preserved) | OneSignal push (resonances are pulled; push payload privacy deferred with it) |
| Finite Field with allowlisted card projection (separate repo methods; no journal joins possible) | Topic-suppression + hide-person decisions (pass + block cover Alpha) |
| Heart / Listen / Pass / Undo, block + report rows, idempotent via composite uniques | Scheduled expiry cron (`WHERE expiresAt > now()` filter instead) |
| Exchange → Orbit state machine (riskiest chunk: idempotency keys, DB uniques, transaction per transition, full tests) | Web client entirely; identity-verification provider; moderation staffing docs |

Field ordering Phase 1: filter (self, blocked either direction, passed, expired, withdrawn, active-exchange) then `intent-match DESC, freshness DESC`. Contract already returns an opaque ordered list + `completionState`, so the real ranker swaps in later with zero client change.

## 4. Safety floor for the very first Alpha build (Shield bucket A)

1. Server-enforced default-off gate; no staging/prod exposure of any kind.
2. Zero journal/emotion/Connection joins in any discovery query (repository-layer allowlist).
3. Crisis-keyword exit on publish: blocks publication, preserves the draft privately, shows warm 988 / 741741 resources, never a raw error.
4. Analytics/logs carry opaque IDs + enums only — never Signal text, aliases, or matched keywords.
5. Block + report plumbing exists end-to-end (human SLA is a real-pilot gate, not an Alpha gate).
6. Galaxy keys excluded from the mobile persisted query cache; cleared at logout.

Before ANY non-team TestFlight cohort (Apple Guideline 1.2): content filtering, report, block, zero-tolerance terms, 24h action path, age gate. Tracked, not built now.

## 5. Alpha exit criteria (North)

1. Transition + Field feel calm and curious to every internal tester; zero "feels like a dating app" reactions.
2. State machine 100% correct across all paths incl. races (double-listen, expiry-mid-exchange, undo-after-commit).
3. Median Signal composed < 90s without bailing.
4. Anti-metric discipline verified by inspection (no counts, no popularity, no pass traces).
5. Block / report / exit all work end-to-end, even if review is manual.

Pass all five → fund the real pilot (verification, moderation, cohort). Kill signals: field feels performative/anxious, Orbit graduation lands flat, state machine can't be made reliable, or it cannibalizes Together/freemium attention.

## 6. Sequencing guardrails

- Galaxy is a **parallel learning bet**: it must not displace the freemium measurement window or the Together/Duo build.
- Alpha builds cut from isolated worktrees on the Alpha lane (own build-number sequence); the shared staging lane is untouched by Galaxy work.
- Prod remains frozen per standing policy; nothing in this addendum changes that.
