# Murror Project — Progress Overview
> Last updated: 2026-03-10 (Task 2a design approved, implementation planning)
> This file tracks what has been done and what is left to do. Update this after every work session.

---

## How to read this

- ✅ Done
- 🔄 In progress
- ⬜ Not started yet
- ❌ Blocked / has a problem

Progress bars show overall completion:
`[██████████] 100%` = fully done
`[█████░░░░░] 50%`  = halfway
`[░░░░░░░░░░] 0%`   = not started

---

---

# TASK 1 — Run the full product on simulator

> Goal: Get the Murror app running on a phone simulator on this computer, with all services (backend, auth, AI, etc.) connected and working together.

**Overall progress:**
```
[██████░░░░] 60%
```

**Strategy:** Work locally on MurrorMobile features, connect to team's remote staging/dev backend. Only run backend services locally when actively modifying them. Ship features via PRs, publish to App Store independently over time.

| Step | Status | Notes |
|------|--------|-------|
| Download all code repositories | ✅ Done | 7 repos cloned and organized |
| Install dependencies for MurrorMobile | ✅ Done | yarn 3 (corepack) + CocoaPods (149 pods) |
| Run MurrorMobile on iOS simulator | ✅ Done | MurrorMobileDevelopment scheme on iPhone 17 Pro |
| Get staging/dev API URLs from team | ⬜ Not started | Supabase, auth, API endpoints |
| Configure MurrorMobile .env for staging | ⬜ Not started | Point app at remote services |
| Verify app connects to staging backend | ⬜ Not started | End-to-end smoke test |
| Set up local backend services (as needed) | ⬜ As needed | Only when modifying backend code |

**What was done:**
- 2026-03-04: All 7 repos downloaded and organized correctly in one folder
- 2026-03-04: Set up global "never rebuild" rule for safe development going forward
- 2026-03-05: Installed MurrorMobile dependencies (yarn 3 via corepack + CocoaPods)
- 2026-03-05: Built and ran MurrorMobileDevelopment on iOS simulator (iPhone 17 Pro)
- 2026-03-05: Fixed accidentally deleted config files on ast-mu (app.json, jest.config.js, etc.)
- 2026-03-05: Revised strategy — use remote staging backend instead of running everything locally

**What's next:**
- Get staging/dev API URLs and keys from team
- Configure MurrorMobile .env to connect to staging
- Start building features (Task 2) in parallel

---

---

# TASK DS — Design System Implementation

> Goal: Extract the official Figma Design System into reusable code components and a living design guidelines document, so all new UI work follows one consistent system.

**Overall progress:**
```
[█████████░] 90%
```

| Step | Status | Notes |
|------|--------|-------|
| Extract design patterns from existing codebase | ✅ Done | Analyzed all existing components |
| Create DESIGN_GUIDELINES.md | ✅ Done | 11 sections, comprehensive reference |
| Review 15 Figma screen designs (M6 file) | ✅ Done | Screen-level patterns added to guidelines |
| Implement Typography system | ✅ Done | 20 variants in `typography.ts`, variant prop on MUText |
| Implement Color system | ✅ Done | 77 new tokens across 8 scales in `colors.ts` |
| Implement Button system | ✅ Done | size, danger, link props on MUButton |
| Implement Text Field system | ✅ Done | size (sm/md/lg), headingContent, helpText on MURTextField |
| Implement Text Area component | ✅ Done | New `mu-text-area.tsx` — normal + chatbox types |
| Implement Stacked Sheet (Modal) | ✅ Done | New `mu-stacked-sheet.tsx` — full + partial types |
| Bottom Nav review | ✅ Done | Already matches Figma, no changes needed |
| Overline typography audit & adoption | ✅ Done | All uppercase text now uses `variant="overline"` (10 files) |
| Remaining Figma Design System pages | ⬜ Not started | More pages may exist in the official file |

**Files created/modified:**
- `MurrorMobile/DESIGN_GUIDELINES.md` — created, then expanded across sessions
- `MurrorMobile/src/assets/styles/typography.ts` — NEW: 20 typography variants
- `MurrorMobile/src/assets/styles/colors.ts` — UPDATED: +77 color tokens
- `MurrorMobile/src/components/mu-text.tsx` — UPDATED: added `variant` prop
- `MurrorMobile/src/components/mu-button.tsx` — UPDATED: added size/danger/link, then overline variant for button text
- `MurrorMobile/src/components/mutext-field.tsx` — UPDATED: added size/heading/helpText
- `MurrorMobile/src/components/mu-text-area.tsx` — NEW: multi-line text area
- `MurrorMobile/src/components/mu-stacked-sheet.tsx` — NEW: gesture-driven modal sheets
- `MurrorMobile/src/components/murror-header.tsx` — UPDATED: uses `variant="overline"` for title
- `MurrorMobile/src/components/toast-dialog.tsx` — UPDATED: button text uses `variant="overline"`
- `MurrorMobile/src/components/mu-popup.tsx` — UPDATED: removed redundant uppercase titleStyle
- `MurrorMobile/src/components/custom-modal-announce.tsx` — UPDATED: removed redundant uppercase titleStyle

**What was done:**
- 2026-03-05: Extracted design patterns from codebase, created DESIGN_GUIDELINES.md
- 2026-03-05: Reviewed 15 Figma screen designs, added screen-level patterns to guidelines
- 2026-03-05: Implemented typography (20 variants from Figma node 400-399)
- 2026-03-05: Implemented color system (77 tokens from Figma node 9-101)
- 2026-03-05: Implemented button system (size/danger/link from Figma nodes 15-4, 63-1293, 84-904)
- 2026-03-05: Implemented text field sizes + heading/helpText (from Figma node 95-1053)
- 2026-03-05: Created MUTextArea component (from Figma node 95-1053)
- 2026-03-05: Created MUStackedSheet modal component (from Figma node 59-1727)
- 2026-03-05: Confirmed Bottom Nav matches Figma (node 229-2390), no changes needed
- 2026-03-05: Updated DESIGN_GUIDELINES.md with all new component specs
- 2026-03-06: Overline audit — verified against Figma (node 400-418: SF Pro Bold, 14px, lineHeight 22, letterSpacing 8%, uppercase)
- 2026-03-06: Replaced all manual overline styling with `variant="overline"` across 10 files
- 2026-03-06: MUButton now uses `variant="overline"` for all button text (was manual semibold + letterSpacing)
- 2026-03-06: MurrorHeader title uses `variant="overline"` (removed 5 manual props)
- 2026-03-06: Removed `.toUpperCase()` from 15+ call sites (variant auto-uppercases)
- 2026-03-06: Cleaned up redundant `txtUppercase`/`txtBtn`/`buttonText` styles from 3 components

**What's next:**
- Check if the official Figma Design System file has more pages to implement
- Begin using the design system components in new feature screens

---

# TASK PRD — Product Foundation Documents

> Goal: Establish the PRD, user personas, and development rules as the foundation for all product work.

**Overall progress:**
```
[██████████] 100%
```

| Step | Status | Notes |
|------|--------|-------|
| Save PRD to codebase | ✅ Done | `/PRD.md` — full product requirements |
| Create 5 user personas | ✅ Done | `/USER_PERSONAS.md` — Maya, Jaylen, Ava, Kai, Noor |
| Establish persona-driven development rule | ✅ Done | Every feature must map to personas |
| Document all session decisions | ✅ Done | This progress update |

**Key decisions made:**
- **Persona-driven development**: Every feature brainstorm, design decision, and new feature MUST be evaluated against the 5 personas. Ask: "Which persona does this serve? How would they use it? Does it address their core loneliness?"
- **PRD is source of truth**: Product decisions reference `/PRD.md`
- **5 Personas**: Maya (long-distance daughter), Jaylen (disconnected friend), Ava (anxious partner), Kai (family peacemaker), Noor (invisible roommate / international student)
- **Branch findings**: `ast-mu` = `origin/mu-121` (same commit, most recently updated branch). Had accidentally deleted config files — restored.

**What was done:**
- 2026-03-05: Saved full PRD to `/PRD.md`
- 2026-03-05: Created 5 user personas aligned to PRD in `/USER_PERSONAS.md`
- 2026-03-05: Established persona-driven development rule (saved to Claude memory)
- 2026-03-05: Investigated branch history — confirmed ast-mu tracks origin/mu-121
- 2026-03-05: Restored accidentally deleted files on ast-mu (app.json, jest.config.js, tailwind.config.js, mocks, patches)
- 2026-03-05: Rebuilt and ran app on simulator with MurrorMobileDevelopment scheme

---

# TASK PERF — Performance Optimization

> Goal: Audit and optimize app speed across mobile, backend, and web.

**Overall progress:**
```
[█████████░] 90%
```

| Step | Status | Notes |
|------|--------|-------|
| Audit mobile app for performance issues | ✅ Done | Identified 12 issues across build, lists, images, caching, memory |
| Fix FlatList index-based keys | ✅ Done | `moment-to-care.tsx` — changed to `item.id` |
| Fix image cache service directory bug | ✅ Done | Was saving to wrong dir + scanning all caches. Throttled cleanup |
| Fix sound retry loop memory leak | ✅ Done | Added timeout ref + clearTimeout on unmount in `use-home-sound.ts` |
| Remove 700ms startup delay | ✅ Done | Replaced setTimeout with InteractionManager.runAfterInteractions |
| Avatar orbit fade-in animation | ✅ Done | Removed skeleton, added randomized staggered fade-in (300ms stagger, 800ms duration) |
| Parallelize activity scheduler queues | ✅ Done | `addBulk()` instead of sequential loop in `activity-scheduler.service.ts` |
| Combine diary count + data query | ✅ Done | Single query with `COUNT(*) OVER()` in `diary.repository.ts` |
| Lazy-load infrequent screens | ✅ Done | 75 screens converted to deferred `require()` via `lazyScreen` utility |
| Diary ScrollView virtualization | ✅ Done | ScrollView+map → FlatList with windowing, onEndReached, native RefreshControl |
| Home screen useCallback for handlers | ✅ Done | 4 event handlers wrapped with useCallback in `home-screen.tsx` |
| Rate limiter singleton | ✅ Done | Moved Ratelimit instantiation out of per-request handler (all 3 middlewares) |
| Widget reload on every API call | ✅ Already done | `lastSavedToken` check already prevents redundant reloads |
| Onboarding batch INSERT | ✅ Already done | Already uses dynamic SQL placeholders in single query |
| Sequential AsyncStorage reads | ✅ Already done | Already uses `Promise.all()` in home-screen.tsx |
| Check-in parallel DB queries | ✅ Already done | Already uses `Promise.all()` for 4 queries |
| Check-in parallel notifications | ✅ Already done | Already uses `Promise.all()` for 3 notification calls |
| Articles CTE count+data | ✅ Already done | Already uses single CTE query |
| Articles parallel signed URLs | ✅ Already done | Already uses `Promise.all()` with `.map()` |
| Articles body field excluded | ✅ Already done | List endpoint already excludes body field |
| Onboarding goals single fetch | ✅ Already done | Already fetched once, reused for validation + titles |
| Home screen useMemo | ✅ Already done | `homeBackgroundImage` and `userName` already memoized |
| FlatList optimization flags | ✅ Already done | `journal-view.tsx` already has removeClippedSubviews, batching flags |
| Artwork generation blocks response | ⬜ Not started | Needs QStash async task — larger architectural change |
| Enable ProGuard/R8 for Android | ⬜ Deferred | Needs dedicated QA pass — risk of runtime crashes without keep rules |
| Tune React Query cache strategy | ⬜ Skipped | 7-day staleTime is intentional for offline-first design |
| Add route-level code splitting (web) | ⬜ Not started | Web platform — lower priority |
| Add HTTP cache headers to API | ⬜ Not started | API responses — lower priority |

**Files modified:**
- `MurrorMobile/src/screens/main/Home/moment-to-care.tsx` — FlatList key fix
- `MurrorMobile/src/services/image-cache-service.ts` — directory bug + throttled cleanup
- `MurrorMobile/src/hooks/home/use-home-sound.ts` — timeout cleanup on unmount
- `MurrorMobile/app.tsx` — InteractionManager instead of setTimeout
- `MurrorMobile/src/screens/main/Home/avatar-circle-view.tsx` — randomized fade-in animation
- `murror-api/src/user-activity/processors/activity-scheduler.service.ts` — addBulk
- `murror-api/src/diary/infrastructure/repositories/diary.repository.ts` — COUNT(*) OVER()
- `MurrorMobile/src/common/lazy-screen.tsx` — NEW: lazyScreen deferred require utility
- `MurrorMobile/src/common/navigation-controller.tsx` — 75 screen imports → deferred requires
- `MurrorMobile/src/screens/main/Diary/diary-screen.tsx` — ScrollView → FlatList with virtualization
- `MurrorMobile/src/screens/main/Home/home-screen.tsx` — useCallback for 4 event handlers
- `murror-backend/.../ratelimitPerUserMiddleware.ts` — Ratelimit singleton
- `murror-backend/.../ratelimitPerIPMiddleware.ts` — Ratelimit singleton
- `murror-backend/.../ratelimitPerServiceMiddleware.ts` — Ratelimit singleton

**What was done:**
- 2026-03-05: Full performance audit across MurrorMobile, murror-api, murror-platform
- 2026-03-05: Fixed 6 issues (4 mobile, 2 backend), deferred 2, skipped 1, left 2 for later
- 2026-03-05: Added avatar orbit randomized fade-in animation (no skeleton, smooth appearance)
- 2026-03-08: Lazy-load 75 screens — deferred require() to reduce startup module evaluation
- 2026-03-08: Diary screen ScrollView → FlatList with virtualization, native pull-to-refresh, onEndReached pagination
- 2026-03-08: Confirmed widget reload + onboarding batch INSERT were already optimized
- 2026-03-08: Verified Priority 2+3 items (10 of 10) were already optimized — no changes needed
- 2026-03-08: Added useCallback to 4 home screen event handlers
- 2026-03-08: Rate limiter singleton — moved instantiation out of per-request handler (all 3 middlewares)

**What's next:**
- Artwork generation async offload (QStash) — architectural change, plan separately
- Enable ProGuard with proper keep rules (needs QA)
- Route-level code splitting for web apps
- HTTP cache headers on API GET endpoints

---

---

# TASK 2 — New Product Features

---

## 2a — SMS Reflections (Messaging with non-Murror users)

> Goal: Allow Murror users to share takeaway reflections and connection invites with people who don't have the app, via server-side SMS (Twilio). Includes web preview pages for receivers and opt-out/re-subscribe compliance.

**Overall progress:**
```
[████████░░] 80%
```

**Design doc:** `docs/plans/2026-03-10-sms-reflections-design.md` (approved)
**Branch:** `feature/sms-reflections`

**Two flows:**
- **Flow A — SMS Takeaway Sharing:** User journals about a pending (non-app) connection → AI generates takeaway → system sends SMS via Twilio with link to web preview page at `ambercare.app/takeaway/[token]`
- **Flow B — SMS Connection Invite:** Replaces current native SMS app behavior. Tapping "Add" on a phone contact sends invite via Twilio server-side instead of opening native SMS app. Landing page at `ambercare.app/invite/[token]`

**Key decisions:**
- SMS delivery: Server-side via Twilio (automatic, not native SMS app)
- Web preview pages: New routes on murror-platform (Next.js, `ambercare.app`)
- Connection model: Extend existing `friend_invitation` flow — add `invitee_phone` column
- Rate limiting: Max 2 SMS per day per connection
- Opt-out: Link in every SMS → `ambercare.app/sms/unsubscribe/[token]` with re-subscribe option
- No quiet hours

| Step | Status | Notes |
|------|--------|-------|
| Define requirements & user flow | ✅ Done | Design doc approved, UX flows documented |
| Design database changes | ✅ Done | `invitee_phone` + `sms_opt_out` on friend_invitations, new `sms_delivery_log` table |
| Write implementation plan | ✅ Done | 10-task plan at `docs/plans/2026-03-10-sms-reflections-implementation.md` |
| Database migrations | ✅ Done | Manual SQL migration (no local DB) — `20260310000000_add_sms_fields` |
| Set up Twilio integration (backend) | ✅ Done | `SmsService` with rate limiting, opt-out checks, delivery logging |
| Backend API endpoints | ✅ Done | 6 endpoints: send-takeaway, send-invite, opt-out, resubscribe, takeaway-preview, invite-preview |
| Web preview pages (murror-platform) | ✅ Done | Takeaway preview, invite landing, opt-out/resubscribe page |
| Mobile UI changes | ✅ Done | API client, connection picker with pending/SMS badge, takeaway SMS flow |
| Code review | ✅ Done | 3 critical, 5 important issues identified (see blockers below) |
| Fix critical issues | ⬜ Not started | Must fix before production |
| Test end-to-end | ⬜ Not started | Blocked on Twilio account setup + DB migration on alpha |

**Blockers before production (from code review):**

Critical:
1. **No authorization on send-takeaway** — Any authenticated user can send SMS for any invitation. Must verify `invitation.inviter_id === req.user.id`
2. **Opt-out uses GET** — Link preview bots/crawlers could trigger opt-out. Must change to POST with confirmation button
3. **Takeaway text not stored** — Preview page needs the takeaway text but it's not persisted anywhere retrievable by token

Important:
4. Rate limiting uses UTC midnight (should use user's timezone or rolling 24h window)
5. Opt-out is per-invitation, should be per-phone-number across all invitations
6. No phone number normalization (E.164 format)
7. Web pages fall back to mock data on API error (should show error state)
8. `contactName` parameter in send-invite DTO is accepted but unused

**What was done:**
- 2026-03-10: Brainstormed and approved design (Twilio server-side SMS, web preview pages, compliance)
- 2026-03-10: Wrote design doc `docs/plans/2026-03-10-sms-reflections-design.md`
- 2026-03-10: Created `feature/sms-reflections` branch
- 2026-03-10: Updated UX flows doc with Sections 8, 9, 10 (SMS takeaway, invite, opt-out)
- 2026-03-11: Implemented all backend (murror-api: SmsModule, SmsService, SmsController, DTOs, Twilio config, migration)
- 2026-03-11: Implemented all web pages (murror-platform: takeaway preview, invite landing, opt-out/resubscribe)
- 2026-03-11: Implemented all mobile changes (MurrorMobile: API client, connection picker with pending support, SMS takeaway flow)
- 2026-03-11: Completed code review — 3 critical issues must be fixed before shipping

---

## 2b — Family Plan

> Goal: Allow multiple family members to share a Murror subscription under one account/plan.

**Overall progress:**
```
[░░░░░░░░░░] 0%
```

| Step | Status | Notes |
|------|--------|-------|
| Define requirements (how many members? pricing?) | ⬜ Not started | |
| Design subscription model changes | ⬜ Not started | |
| Build backend billing/subscription logic | ⬜ Not started | |
| Build invitation flow | ⬜ Not started | |
| Build mobile UI | ⬜ Not started | |
| Test end-to-end | ⬜ Not started | |

**What was done:**
- Nothing yet

---

## 2c — Choose a Connection When Reflecting + Shared Takeaway Reflection

> Goal: When a user starts a reflection session, let them choose which person (connection) they want to reflect on or with. Additionally, let users share "takeaway" reflections with connections and receive shared AI insights.

**Overall progress:**
```
[██████████] 100%
```

**Complete.** All code merged to main across all repos. TestFlight build 130 uploaded for team testing. Deployed to alpha.

| Step | Status | Notes |
|------|--------|-------|
| Review existing reflect feature code | ✅ Done | AddLogScreen already accepts relationshipId but has no picker UI |
| Define how connection selection should work | ✅ Done | Horizontal avatar scroll inside AddLogScreen, "Just me" default |
| Build mobile UI (connection picker) | ✅ Done | ConnectionPicker component + integrated into AddLogScreen |
| AI prompt personalization | ✅ Done | Prefixes connection name into suggestion and deep chat messages |
| Takeaway card carousel (receiver side) | ✅ Done | PENDING → generating (butterfly) → INSIGHT_READY cards in "For Us" carousel |
| Reflect-back flow | ✅ Done | Receiver taps "Reflect Back" → journal → completeTakeawayReflection API |
| Deep link handling | ✅ Done | Branch.io (`takeawayReflection`) + widget URL (`/takeaway/`) |
| Feature flag | ✅ Done | `TAKEAWAY_REFLECT_BACK_VARIANT` (themed_prompt vs mirrored_prompts) |
| Generating state animation | ✅ Done | Butterfly GIF + GradientTextLoading shimmer + "Come back later" |
| INSIGHT_READY card | ✅ Done | Renders `card.insightText` from API as normal insight card |
| Journal connection avatar | ✅ Done | `journalConnectionStore.set()` for reflect-back journal entries |
| i18n translations | ✅ Done | EN + VI for all takeaway + connection picker keys |
| Remove dev mocks, clean for PR | ✅ Done | All `__DEV__` overrides removed before shipping |
| Backend: takeaway API endpoints | ✅ Done | GET/POST takeaways, POST complete — all implemented + unit tested |
| Backend: AI insight synthesis | ✅ Done | CompleteTakeawayUseCase triggers background insight generation after receiver reflects back |
| Backend: INSIGHT_READY push notification | ✅ Done | OneSignal push to sender when AI insight is ready (PR #255 merged) |
| Backend: Supabase realtime broadcast | ✅ Done | TAKEAWAY_INSIGHT_READY event so mobile auto-refreshes cards |
| Mobile: TAKEAWAY_INSIGHT_READY listener | ✅ Done | Supabase realtime subscription in `supabase-socket.ts` invalidates takeaway query |
| Backend: DB table | ✅ Done | takeaway_reflections table with PENDING→COMPLETED→INSIGHT_READY lifecycle + insightText column |
| viasr-api: generate-insight endpoint | ✅ Done | POST /takeaway/generate-insight — synthesizes insight from both sender/receiver journal texts |
| Mobile: share error feedback | ✅ Done | Fixed `onShareTakeaway` — error now keeps sheet open, preserves draft for retry |
| Personalized takeaway AI prompt | ✅ Done | Emotionally resonant, varied styles — not generic summaries |
| Push notifications to both users | ✅ Done | Sender + receiver notified at each step, personalized AI content |
| Notification text fix | ✅ Done | "Your artwork's ready" → "Your journal is ready" |
| Unique insight card backgrounds | ✅ Done | Seeded by insightId, not date — each card looks different |
| Remove confusing Poke CTA text | ✅ Done | Removed "Let them know you read this →" |
| viasr-api model config fix | ✅ Done | Fixed `model_light_task` → `model_simple_task` (attribute error) |
| End-to-end testing | ✅ Done | Tested on two simulators, all states work |
| TestFlight build | ✅ Done | Build 130 uploaded for team device testing |

**What was done:**
- 2026-03-05: Explored existing reflection flow — found AddLogScreen has no picker UI
- 2026-03-05: Designed horizontal avatar scroll approach (brainstormed 3 options)
- 2026-03-05: Created `use-get-connected-friends.ts` query hook (filters to Connected friends)
- 2026-03-05: Created `connection-picker.tsx` component (avatar FlatList with selection ring)
- 2026-03-05: Integrated into AddLogScreen — state, picker UI, AI personalization
- 2026-03-05: Added i18n keys for "Just me" (EN: "Just me", VI: "Chỉ mình tôi")
- 2026-03-08: Built takeaway card carousel (3 visual states: PENDING, COMPLETED/generating, INSIGHT_READY)
- 2026-03-08: Built butterfly generating animation (GIF + shimmer text + "Come back later")
- 2026-03-08: Built reflect-back flow (receiver → AddLogScreen → completeTakeawayReflection)
- 2026-03-08: Added deep link handling for takeaway notifications (Branch.io + widget URL)
- 2026-03-08: Added `TAKEAWAY_REFLECT_BACK_VARIANT` feature flag (Statsig)
- 2026-03-08: Added `insightText` field to `TakeawayCardData` for AI-generated insights
- 2026-03-08: Added `journalConnectionStore.set()` in reflect-back path for connection avatars
- 2026-03-08: Removed "Read more" button from reflect-back cards
- 2026-03-08: Cleaned all `__DEV__` mocks and shipped PR #426

**Files created:**
- `MurrorMobile/src/queries/relationship/use-get-connected-friends.ts`
- `MurrorMobile/src/screens/main/Journal/connection-picker.tsx`

**Files modified:**
- `MurrorMobile/src/screens/main/Journal/add-log-screen.tsx`
- `MurrorMobile/src/screens/main/Diary/relationship-detail-screen.tsx`
- `MurrorMobile/src/screens/main/Diary/insight-card.tsx`
- `MurrorMobile/src/apis/client/relationship-api-client.ts`
- `MurrorMobile/src/queries/relationship/use-get-takeaway-cards.ts`
- `MurrorMobile/src/common/linking.ts`
- `MurrorMobile/src/common/navigation.tsx`
- `MurrorMobile/src/constants/feature-flags.ts`
- `MurrorMobile/src/hooks/use-feature-flags.ts`
- `MurrorMobile/src/locales/en.json`
- `MurrorMobile/src/locales/vi.json`

---

---

# Repo Status

| Repo | Purpose | Branch | Git status |
|------|---------|--------|------------|
| `MurrorMobile` | iOS/Android app | main | ✅ Clean — all merged, TestFlight build 130 |
| `murror-api` | Main REST API | main | ✅ Clean — PRs #255-#260 merged, deployed to alpha |
| `murror-backend` | Supabase edge functions | main | ✅ Clean — PR #878 merged, deployed |
| `viasr-api` | AI / voice service | develop | ✅ Clean — prompt + model fix deployed |
| `auth-service` | Login & authentication | main | ✅ Clean |
| `auth-service-ui` | Login web page | main | ✅ Clean |
| `murror-platform` | Platform services | dev | ✅ Clean |

---

# Change Log

| Date | What changed |
|------|-------------|
| 2026-03-04 | Downloaded and organized all 7 repos into correct structure |
| 2026-03-04 | Confirmed murror-backend is healthy (Grade A) — all files intact |
| 2026-03-04 | Created "never rebuild" global rule for safe development |
| 2026-03-04 | Created this progress file |
| 2026-03-04 | Language picker reordered: English now appears above Vietnamese (alphabetical) on onboarding + settings screens. Committed in MurrorMobile (ast-mu) and murror-backend (mur-873). |
| 2026-03-05 | Design System: Created DESIGN_GUIDELINES.md, reviewed 15 Figma screens |
| 2026-03-05 | Design System: Implemented typography (20 variants), colors (+77 tokens), buttons (size/danger/link) |
| 2026-03-05 | Design System: Implemented text field sizes/heading/helpText, new MUTextArea, new MUStackedSheet modal |
| 2026-03-05 | Design System: Confirmed Bottom Nav matches Figma, updated guidelines with all specs |
| 2026-03-05 | Investigated ast-mu branch — confirmed it tracks origin/mu-121, most recently updated (Mar 5) |
| 2026-03-05 | Fixed ast-mu: restored accidentally deleted config files (app.json, jest.config.js, tailwind.config.js, mocks, patches) |
| 2026-03-05 | Built and ran MurrorMobileDevelopment on iOS simulator (iPhone 17 Pro) — full ast-mu branch |
| 2026-03-05 | Saved full PRD to `/PRD.md` |
| 2026-03-05 | Created 5 user personas in `/USER_PERSONAS.md` (Maya, Jaylen, Ava, Kai, Noor) |
| 2026-03-05 | Established persona-driven development rule — all features must map to personas |
| 2026-03-05 | Performance audit: identified and fixed 6 optimizations across mobile + backend |
| 2026-03-05 | Mobile: Fixed FlatList index-based keys in moment-to-care.tsx (use item.id) |
| 2026-03-05 | Mobile: Fixed image cache service — wrong directory bug + throttled cleanup |
| 2026-03-05 | Mobile: Fixed sound retry loop memory leak (clearTimeout on unmount) |
| 2026-03-05 | Mobile: Replaced 700ms startup setTimeout with InteractionManager.runAfterInteractions |
| 2026-03-05 | Mobile: Avatar orbit — removed skeleton loading, added randomized staggered fade-in |
| 2026-03-05 | Backend: Parallelized activity scheduler queue additions (addBulk instead of sequential loop) |
| 2026-03-05 | Task 2c: Built connection picker for AddLogScreen — avatar scroll, AI personalization, i18n |
| 2026-03-05 | Backend: Combined diary count + data into single SQL query (COUNT(*) OVER window function) |
| 2026-03-06 | Design System: Overline audit — verified spec against Figma (node 400-418), confirmed match |
| 2026-03-06 | Design System: Replaced all manual uppercase styling with `variant="overline"` across 10 files |
| 2026-03-06 | Design System: MUButton now renders all text via `variant="overline"` (bold 14px, 8% tracking, auto-uppercase) |
| 2026-03-06 | Design System: MurrorHeader, moment-to-care, knowledge-screen, value-final, subscription-screen all use overline variant |
| 2026-03-06 | Design System: Removed 15+ redundant `.toUpperCase()` calls and 3 redundant style objects |
| 2026-03-06 | Build: TypeScript check passes, app rebuilt and launched on iPhone 16 Pro simulator |
| 2026-03-08 | Perf: Lazy-load 75 screens — created `lazyScreen` utility, converted imports to deferred `require()` in navigation-controller.tsx |
| 2026-03-08 | Perf: Diary screen ScrollView → FlatList with virtualization, native RefreshControl, onEndReached pagination |
| 2026-03-08 | Perf: Confirmed widget reload + onboarding batch INSERT were already optimized (no changes needed) |
| 2026-03-08 | Perf: Removed unused `onboardingStore` import from navigation-controller.tsx |
| 2026-03-08 | Perf: Verified all Priority 2+3 backend items already optimized (Promise.all, CTE, no body in list, etc.) |
| 2026-03-08 | Perf: Added useCallback to 4 home screen event handlers (onPressSetting, onPanicMode, onPrimaryButtonPress, onPressLearnMore) |
| 2026-03-08 | Perf: Rate limiter singleton — all 3 middlewares (user, IP, service) now create Ratelimit once per middleware, not per request |
| 2026-03-08 | Task 2c: Built takeaway card carousel — 3 visual states (PENDING, generating butterfly, INSIGHT_READY) |
| 2026-03-08 | Task 2c: Built reflect-back flow — receiver taps "Reflect Back" → journal → completeTakeawayReflection |
| 2026-03-08 | Task 2c: Added deep link handling for takeaway notifications (Branch.io + widget URL) |
| 2026-03-08 | Task 2c: Added `TAKEAWAY_REFLECT_BACK_VARIANT` feature flag (themed_prompt vs mirrored_prompts) |
| 2026-03-08 | Task 2c: Added `insightText` field + INSIGHT_READY status to TakeawayCardData |
| 2026-03-08 | Task 2c: Journal entries from reflect-back now show connection avatar via journalConnectionStore |
| 2026-03-08 | Task 2c: Cleaned all __DEV__ mocks, shipped PR #426 (perf + 2c combined) |
| 2026-03-10 | Task 2c: Deleted 2 stuck "generating" takeaway cards from alpha DB |
| 2026-03-10 | Task 2c: Added INSIGHT_READY push notification via OneSignal + Supabase realtime broadcast |
| 2026-03-10 | Task 2c: Added TAKEAWAY_INSIGHT_READY listener in mobile (supabase-socket.ts) for auto-refresh |
| 2026-03-10 | Task 2c: Fixed onShareTakeaway silent failure — error keeps sheet open, preserves draft for retry |
| 2026-03-10 | Task 2c: Merged murror-api PR #255 (notifications + realtime) → deploying to alpha |
| 2026-03-10 | Task 2c: Fixed viasr-api `model_light_task` → `model_simple_task` (500 error on takeaway generation) |
| 2026-03-10 | Task 2c: Updated takeaway AI prompt — emotionally resonant, varied styles, first person, under 200 chars |
| 2026-03-10 | Task 2c: Increased takeaway generation max_tokens from 200 → 300 |
| 2026-03-10 | Task 2c: Fixed snake_case response mapping in ai-service.client.ts (`insight_text` → `insightText`) |
| 2026-03-10 | Task 2c: Merged murror-api PRs #258 (snake_case fix), #259 (both-user notifications), #260 (personalized AI content) |
| 2026-03-10 | Task 2c: Changed notification text "Your artwork's ready" → "Your journal is ready" (murror-backend PR #878) |
| 2026-03-10 | Task 2c: Removed "Let them know you read this →" text below Poke CTA |
| 2026-03-10 | Task 2c: Unique insight card backgrounds — seeded by insightId instead of date |
| 2026-03-10 | Task 2c: Merged MurrorMobile ast-mu branch to main (with Sentry metro.config.js conflict resolution) |
| 2026-03-10 | Task 2c: TestFlight build 130 uploaded (MurrorMobileDevelopment scheme, bundle ID app.murror.mobile.dev) |
| 2026-03-10 | Task 2c: Gitignored iOS build artifacts (ExportOptions.plist, ios/build/) |
| 2026-03-10 | Task 2c: **FEATURE COMPLETE** — all repos clean on main, deployed to alpha, TestFlight ready |
| 2026-03-10 | Task 2a: Brainstormed SMS reflections — decided on Twilio server-side, web preview pages, extend friend_invitations |
| 2026-03-10 | Task 2a: Wrote and approved design doc (`docs/plans/2026-03-10-sms-reflections-design.md`) |
| 2026-03-10 | Task 2a: Created `feature/sms-reflections` branch |
| 2026-03-10 | Task 2a: Updated UX flows with SMS takeaway sharing, SMS connection invite, and opt-out flows |
| 2026-03-10 | Task 2a: Updated PRD compliance section — rate limit corrected to 2/day, removed quiet hours, added opt-out web page |
