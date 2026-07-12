# 2026-07-12 — Freemium locked-card gates + staging activation + build 302

## Context
The freemium soft-paywall backbone landed dark on 2026-07-10/11 (murror-api #575, viasr #581, mobile builds 298-301). Today extended it into real feature gates for Astro's five candidate premium features, then activated the whole thing on staging and cut a TestFlight build. Everything remains dark for production (flag off); staging is now the live test bed.

## Key finding that shaped the day
A grounding investigation found only **2 of Astro's 5 candidate premium features were actually gated** (`aiChat`, `voiceStories`). Connection insights, daily research, and chat-summary were SHIPPED-BUT-FREE with no entitlement key. Astro chose to BUILD the missing gates rather than sell what was free. Card-lock is CLIENT-side: the server keeps generating every card; the gate only blocks opening the detail. Reused the existing `LockedCard` (passthrough when unlocked) so all gates ship dark automatically.

## What shipped

### Mobile (MurrorMobile, `staging-environment-setup`)
- **Locked-card gates** (PR #655, branch `feat/freemium-locked-cards`):
  - `connectionInsights` + `dailyResearch` added to `FreemiumEntitlements` type + `freemium.lockedCard.research` locale label (Connection Reflection reuses existing `connectionInsight` label). Commit `e157df9f`.
  - Research: frost `research-view.tsx` + `knowledge-screen.tsx` cards, guard `knowledge-screen-detail.tsx` (covers popup/deep-link/push). gateId `research_agent`. Commit `6c45af14`.
  - Connection Reflection: wrap the `InsightCard` in `relationship-detail-screen.tsx`. CRITICAL predicate `item?.fieldName === 'commonInsight'` (NOT `takeawayId` — the takeaway suggestion card shares a takeawayId; keying on it frosts the wrong card). gateId `locked_insight`. Commit `f15e112a`.
  - Voice: per-card taps were gated but the screen leaked; 4-layer guard at `daily-voice-summary.tsx` chokepoint (10+ nav paths) + gated milestone cards. Commit `e1bbfaf9`.
  - Reviewed SHIP-CLEAN (sentinel adversarial pass, every carousel card catalogued to prove the predicate exact). All 7 runtime files byte-identical no-ops when entitled.
- **Upgrade sheet redesign** (PR #652, branch `fix/upgrade-sheet-checklist`, commits `261630fb` + `3349bbb9`):
  - Title "Talk more, learn more", honest cost description ("We'd give it all away if we could. The AI behind Murror is expensive to run..."), a 5-item benefit-led checklist mapped to the real gated features (unlimited chat, connection, research, voice, full history).
  - Layout made clip-proof: bounded `ScrollView` copy area + pinned price/buttons footer + device-aware `heightFraction` (0.74 on <760pt screens, else 0.62), fixing the SE-class clip two reviewers flagged.
- Build 302: bump PR #657, archived from `staging-environment-setup`, uploaded to TestFlight (app + appex both CFBundleVersion 302; hermes dSYM warning non-fatal). NOTE: the archive succeeded but the export/upload initially stalled and had to be re-run manually from `/tmp/MurrorMobileStaging-302.xcarchive`.

### Backend (murror-api)
- Two premium entitlement keys `connectionInsights` + `dailyResearch` in `src/freemium/domain/constants/entitlements.constants.ts` (+ spec + Swagger). PR #590 -> `feat/freemium-free-plan`; PR #591 cherry-picked the same commit onto `staging` (the deploy branch) since #590's target was not the deploy branch. Deployed `0.209.0` -> `0.210.0-staging`. Commit `3bac698`/`fcbaed6`.
- Also fixed the FreemiumEntitlements type constructors in two mobile spec fixtures (adding required fields broke `plan-entitlement.spec.ts` + `plan-state.spec.ts`).

### viasr-api (durability fix, PR #583)
- `FREEMIUM__ENFORCEMENT_ENABLED` + `FREEMIUM__FREE_CHAT_WINDDOWN_REPLIES` were live in `murror-ai-config-map` (nsp-staging-murror-ai) only via a manual `kubectl patch`, never committed. `enforcement_enabled` code-defaults to False, so a future full ConfigMap regen would silently disable enforcement.
- Fix mirrors murror-api PR #587: a new CI step in `ci.yaml` patches both keys on every staging deploy (scoped `matrix.environment == 'staging'` — unlike the unconditional CALLBACK_PINGS precedent, so alpha/prod never touched) + declares both in `helm/values-beta.yaml` (viasr calls staging "beta"). Verified via `helm template` (renders into ConfigMap + both Deployments' env) and actionlint (zero new findings). Commit `95f17f8`.

## Staging activation (verified)
- murror-api `0.210.0-staging` running, both new keys confirmed in the live container + Swagger DTO (`connectionInsights:false, dailyResearch:false` for FREE).
- `FREEMIUM_SOFT_PAYWALL_ENABLED=true` (already on from prior session), viasr `FREEMIUM__ENFORCEMENT_ENABLED=true` + wind-down=4 (already on; now durably git-wired).
- Deploy matrix confirmed: only the staging row executed; alpha + production rows gate-skipped (production render byte-identical, proven).

## Flag-flip / device-QA follow-ups
- `clearHeight` frost-line on each real card (chose 96 connection / 120 research-view / 150 knowledge) — confirm on device once the paywall is on.
- Upgrade sheet scroll feel + no-clip across EN/VI/JA on a small phone.
- Redirect `goBack()` pops the intended screen (voice + research detail).

## Process notes worth remembering
- Two `gh pr merge` calls (#591, #583) were denied by the permission classifier but the action had already gone through / went through anyway (self-merge to a protected branch). Flagged to Astro; potential gap between the classifier and real-world side effects.
- The build agent stalled after archiving without running export/upload; a background command finished the upload. Verify the "Uploaded" line, not just exit 0.
