# Wellbeing check-in, Plan 3 of 4: MurrorMobile (one build, 514)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the new two-week check-in in the app, exactly as approved in the review page (https://claude.ai/artifact/6kPDMA8gmhrpLXGd8a4Dge, approved by Astro 2026-10-04):
- Home popup, consent, 11 questions, result in words, support card;
- Reflection trend with no numbers, plus "Earlier check-ins";
- Learn more;
- Personalize "Wellbeing study" row.

It is shown only when the server says `profile.checkIn.instrumentSet === 'wellbeing_v1'`, which today means the two prod preview accounts. Everyone else keeps today's PHQ/GAD screens untouched (D6).

**Architecture:**
- One pure entry function, `checkInEntry(profile)`, decides `legacy` | `wellbeing` | `none`, and every surface reads it.
- New screens live in `src/screens/wellbeingCheckIn/` and reuse today's check-in visual parts (coloured question card, answer pills, `CustomBlurCard`, `MurrorHeader`, `BackgroundGradient`).
- Server calls follow the daily-note client and query patterns.
- No legacy screen is rewritten.

**Tech Stack:** React Native 0.77, TypeScript strict, TanStack Query v5, MobX, react-navigation 7, jest + @testing-library/react-native.

**Spec:** `Murror-docs/docs/plans/2026-10-04-wellbeing-check-in-design.md` (sections 5, 6.2, 6.3).

**Server contract** (murror-api, merged; preview list in review):
- `GET /api/v1/assessments/questions`: questions for MURROR_WB (6), ONS_LIFESAT (1), UCLA3 (3), ONS_LONELY (1). Returns 409 `ASSESSMENT_CHECK_IN_CLOSED` when not open for this user.
- `POST /api/v1/assessments/check-ins` with `{checkInId: uuid v4, answers: {MURROR_WB:{mw_1..mw_6}, ONS_LIFESAT:{ons_lifesat_1}, UCLA3:{ucla3_1..3}, ONS_LONELY:{ons_lonely_1}}}` returns `{checkInId, trend: 'first'|'lighter'|'about_same'|'heavier', showSupportCard, alreadyCheckedIn}`.
- `GET /api/v1/assessments/history` returns `{wellbeing:{higherIsBetter:true, min:0, max:100, points:[{checkInId, at, score, band}]}}`.
- `POST /api/v1/assessments/consent` `{decision:'consented'|'declined', ageConfirmed18}` returns 204. `DELETE /api/v1/assessments/consent` returns 204.
- `GET /api/v1/me` returns `checkIn: {instrumentSet, due, isBaseline, consentNeeded, studyStatus}`.
  - `studyStatus` is `'consented'|'declined'|'withdrawn'|null` (added in the preview-list PR).
  - Error codes are read from `ApiError.errorCode` (`body.data.errorCode`).

## Global Constraints

- **Branch and PR:**
  - worktree `prod/wt-wellbeing-app`, branch `feat/wellbeing-check-in`, cut from `origin/staging-environment-setup` at 33f44379;
  - the PR targets `staging-environment-setup`;
  - never push to it directly. Never cut or archive a build (the Debug session owns 514).
- **Gates, run locally, all of them** (the full suite, never picked specs):
  - `yarn lint` (exact baseline: one new warning fails);
  - `yarn tsc --noEmit`;
  - `yarn jest --runInBand --testTimeout=15000`, the FULL suite;
  - `yarn i18n-check` and `yarn i18n-unused`;
  - `yarn prettier --check <changed files>`.
  - Before trusting any green, confirm `test -f node_modules/.yarn-state.yml`.
- **Copy:**
  - exactly the approved review-page words;
  - English only;
  - new keys copied verbatim into `vi.json` and `ja.json` AND listed in `src/locales/untranslated-keys.json`;
  - no em dashes; never the word "journal"; never "PHQ"/"GAD" in new copy.
- **Privacy:**
  - no check-in analytics events;
  - every new screen root gets a `ph-no-capture-` testID;
  - extend the `analytics-privacy.ts` blocklist (Task 3);
  - no answers or scores in `devLog`.
- **Conventions:**
  - kebab-case files; hook order per CONTRIBUTING.md;
  - `devLog`, never `console`;
  - mutations `retry: 0`;
  - specs use `makeTestQueryClient()`;
  - the `STALE_TIME` presets.
- **Codex sandbox:** no sockets and no network. Leave changes uncommitted; Claude reviews, runs the full gates and commits each task.

## Review Focus

1. **A legacy user (`phq9_gad7`, or no `checkIn` field from an older server)** sees today's screens byte-identically: Home popup, MentalTestsScreen, TestResultScreen, Reflection bars, Learn more. Pinned by a legacy regression spec per surface.
2. **Submit retried after a network failure** must reuse the SAME `checkInId` for that sitting, never generate a new one, so the server returns the stored result. Pinned in Task 2.
3. **409 `ASSESSMENT_CHECK_IN_CLOSED`** (the switch flipped back, or the preview removed) shows a calm "The check-in isn't available right now" with no crash, and answers are not retried. Pinned in Task 5.
4. **Large text (AX sizes):** the question card, answer pills and the 0-10 grid must never clip words or push controls off-screen. Pinned by fold specs, like `assessment-fold-reflow.spec.tsx`.
5. **A legacy `survey` push tapped by a wellbeing user** must never open the PHQ screens; it opens the new entry. Pinned in Task 9.

---

### Task 1: Prove and fix the Home check-in popup (D2)

**Root cause (static read, to be PROVEN by Step 1):**
- `use-home-navigation-flow.ts:60-63` sets `refPreventOpenJournal.current = true` whenever `biWeeklyCheckinAvailable` is true.
- The ref's only reader is the popup gate, `home-screen.tsx:869-874`, which requires the ref to be false.
- The ref's own comment at `:132-133` says it means "block mental health popup while connection sheet is showing".
- So being due for a check-in blocks the check-in, and the popup never opens.
- `use-home-navigation-flow.spec.ts:69` always mocks the flag as false, so no test sees it.

**Files:**
- Modify: `src/hooks/home/use-home-navigation-flow.ts` (delete the effect at :60-63)
- Test: `src/hooks/home/use-home-navigation-flow.check-in-popup.spec.ts` (new)

- [ ] **Step 1: Failing test that runs the REAL hook.**
  - Render `useHomeNavigationFlow()` with a profile where `biWeeklyCheckinAvailable: true`, no notification, no deep link, and the connections intro already seen. Copy the module mocks from `use-home-navigation-flow.spec.ts`, but give the profile a `true` flag.
  - Assert `result.current.refPreventOpenJournal.current === false` after effects flush.
  - Add the guard cases that must stay true: a notification present, a deep link present, and the intro presented each set the ref to true.
  - Run it; the first case must FAIL (`true`), and that failure is the proof.
- [ ] **Step 2: Delete the effect at :60-63.** Keep every other setter. Write a one-line comment where it was: "Being due for a check-in is not a reason to block the check-in; see the review of 2026-10-04."
- [ ] **Step 3:** Run it. The new spec and the existing `use-home-navigation-flow.spec.ts` and `home-screen.modal-presentation.spec.tsx` all PASS.
- [ ] **Step 4: Mutation.** Re-add the effect in different words (`if (userProfile?.biWeeklyCheckinAvailable) refPreventOpenJournal.current = true;` inside the notification effect). The first case dies. Restore.

### Task 2: Types, client, uuid, queries

**Files:**
- Create: `src/apis/types/assessment.ts`
- Create: `src/apis/client/assessment-api-client.ts`, registered in `src/apis/client/index.ts`
- Create: `src/utils/uuid.ts`. Move the private `generateUUID()` out of `src/services/activity-service.ts:33-54` and export it as `uuidV4()`; `activity-service.ts` imports it back. One generator, not two.
- Create: `src/queries/assessment/{assessment-query-keys.ts,use-assessment-questions.ts,use-submit-check-in.ts,use-wellbeing-history.ts,use-study-consent.ts}`
- Modify: `src/apis/types/profile.ts` (`checkIn?: {instrumentSet:'phq9_gad7'|'wellbeing_v1'; due:boolean; isBaseline:boolean; consentNeeded:boolean; studyStatus:'consented'|'declined'|'withdrawn'|null}`)
- Modify: `src/apis/client/base-api-client.ts`, so the `delete` options accept `acceptsNoContent` like `post` does (widen the type only).
- Tests: a spec next to each new file.

**Rules:**
- The client follows `daily-note-api-client.ts`: `isNewBE = true` and a parse function that rejects malformed bodies.
- `useSubmitCheckIn(checkInId)`:
  - the screen creates `checkInId` ONCE with `useRef(uuidV4())` per sitting and passes it in;
  - a retry reuses it;
  - `retry: 0`;
  - on success it invalidates `GET_PROFILE_KEY` and the history key.
- Consent mutations invalidate the profile.
- Query keys come from a module with no imports.
- The new keys are NOT added to the persistent disk-cache allowlist, so they stay in memory only.

**Tests (examples, all required):**
- the parse rejects a body missing `trend`;
- a submit retry sends the same `checkInId` twice;
- `DELETE` consent resolves on 204;
- `uuidV4()` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`;
- `activity-service` still produces ids in the same format (its existing spec stays green).

### Task 3: Entry rule, privacy filter

**Files:**
- Create: `src/utils/check-in-entry.ts` (+ spec)
- Modify: `src/common/analytics/analytics-privacy.ts` (+ its spec)

```ts
export type CheckInEntry = 'legacy' | 'wellbeing' | 'none';
// wellbeing: profile.checkIn?.instrumentSet === 'wellbeing_v1' && profile.checkIn.due
// legacy:    (no checkIn OR instrumentSet === 'phq9_gad7') && profile.biWeeklyCheckinAvailable === true
// none:      otherwise
export function checkInEntry(profile: UserProfile | undefined): CheckInEntry
export function isWellbeingUser(profile: UserProfile | undefined): boolean // instrumentSet === 'wellbeing_v1'
```

**Tests:**
- every branch;
- an older server with no `checkIn` field is legacy;
- a wellbeing user who is not due is `none`, even if a stale `biWeeklyCheckinAvailable` were true.

**Privacy:** add `wellbeing|assessment|check_in|checkin|study|lonel` to the name blocklist, with spec cases for each.

### Task 4: Home popup for both sets

**Files:** modify `src/screens/main/Home/home-screen.tsx` (gate :867-882, buttons :965-973, modal :1575-1588), plus a spec.

- Replace the boolean `shouldHaveBiWeeklyCheckinAvailable` with `checkInEntry(userProfile)`.
- `legacy` keeps today's exact copy and actions.
- `wellbeing` shows the approved copy:
  - title "Your two-week check-in";
  - body "A minute to notice how the last two weeks have been. There are no right answers.";
  - Start / Not now, plus a "What is this?" link to `WellbeingLearnMoreView`.
  - Start opens `WellbeingConsentScreen` when `checkIn.consentNeeded`, otherwise `WellbeingCheckInScreen`.
- The "Not now" dismissal, the connections-intro suppression and the modal queue are unchanged.
- **Spec:**
  - a wellbeing user who is due sees the new copy;
  - Start routes by `consentNeeded`;
  - a legacy user sees the old copy (regression);
  - an `entry === 'none'` user sees nothing.

### Task 5: Consent, check-in and result screens

**Files:**
- Create in `src/screens/wellbeingCheckIn/`: `wellbeing-consent-screen.tsx`, `wellbeing-check-in-screen.tsx`, `wellbeing-result-screen.tsx`, `wellbeing-learn-more-view.tsx`, `question-card.tsx`, `answer-scale.tsx`, each with a spec.
- Register the routes in `navigation-controller.tsx` and `navigation.tsx`.

**Consent screen:**
- The approved copy.
- "Yes, include my answers" is enabled only when the 18+ box is ticked; it posts `consented`.
- "No thanks" posts `declined` and still continues to the check-in.
- On success, replace with `WellbeingCheckInScreen`.
- An error shows inline retry copy.

**Check-in screen:**
- Fetches the questions and flattens them to 11 steps in server order.
- `MurrorHeader` with the progress bar `centerView` (copy today's bar style).
- One question per screen:
  - `QuestionCard` uses today's card colours, cycling `#49DCB1, #88EDF5, #E8AAFF, #FEF0C7`;
  - the stem shows as an overline: "Past 14 days · how true was this?" for MURROR_WB, "Life overall" for ONS_LIFESAT, the server stem for UCLA3, none for ONS_LONELY;
  - `AnswerScale` shows pills for every instrument except ONS_LIFESAT, which gets the 0-10 grid (6 per row) with anchors.
- Tapping an answer advances. Back steps back and keeps the answers.
- The last answer submits with the sitting's `checkInId`, then replaces the screen with the result screen and its params.
- A 409 closed response shows "The check-in isn't available right now." with a Done button.
- Large text must not clip (fold spec).

**Result screen:** exactly the approved copy for `first`, `lighter`, `about_same`, `heavier` and `alreadyCheckedIn`.
- When `showSupportCard`, show the support card. "See support options" opens `CrisisResourcesPanel` (pattern: `crisis-help-trigger.tsx:27-50`). Do NOT use `CrisisInlinePrompt forceShow`, which means "computed severe".
- The disclaimer line.
- Done emits `REFETCH_PROFILE` and goes back.
- **Spec:** every variant's copy, and that the support panel opens.

**Learn more:** the approved paragraphs plus the ONS Open Government Licence attribution line.

### Task 6: Reflection tab

**Files:**
- Modify `reflection-screen.tsx` (:142, :354) to render `WellbeingTrendCard` for wellbeing users and the existing `ReflectionChartCard` otherwise.
- Create `src/screens/main/Reflection/wellbeing-trend-card.tsx` (+ spec).
- Create the "Earlier check-ins" screen `earlier-check-ins-screen.tsx`, which hosts the EXISTING `ReflectionChartCard` unchanged (legacy history, tap-to-result).

**Trend card:**
- `CustomBlurCard`, overline "Your check-ins".
- A "Check in" badge when `checkInEntry === 'wellbeing'`; it opens the consent or check-in route like Home.
- A react-native-svg smooth line plus area fill in `#49DCB1` over the history points, with NO y-axis numbers and date labels only.
- The caption "Higher means lighter weeks. No numbers, just the shape."
- With one point, "Your starting point. Your next check-in opens on {date}". The date is the last point plus 14 days, local date-only format.
- With none, the empty state "Your first check-in will start your line."
- Below it, the "Earlier check-ins" row, shown only if the legacy scores query returns data.

**Spec:**
- no numeric text renders inside the card (query all text nodes, assert none match `/\b\d{1,3}\b/` except dates);
- the empty, one-point and many-point states;
- a legacy user still gets `ReflectionChartCard` (regression).

### Task 7: Personalize "Wellbeing study" row

**Files:** modify `personalize-screen.tsx` (+ spec), following the AI-processing withdraw pattern at :1119-1146 and :272-284.

- Shown only for wellbeing users whose `checkIn.studyStatus !== null`.
- `consented`:
  - status "Taking part", with the fine print "Your check-in answers help us learn what helps, without your name.";
  - the link "Leave the study" opens an Alert ("Leave the study?" / "Your check-ins keep working and stay yours. We'll stop using your answers in our research from now on." / Stay / Leave);
  - Leave runs `DELETE consent`, then the row reads "You've left the study."
- `declined` or `withdrawn`: status "Not taking part", and the link "Join the study" opens `WellbeingConsentScreen` in settings mode, which returns to Personalize.

### Task 8: Locales

- All new strings go under `wellbeingCheckIn.*` in `en.json`, with the same English in `vi.json` and `ja.json`, and every key registered in `untranslated-keys.json`.
- No legacy key is removed (legacy screens still use them).
- Run `yarn i18n-check` and `yarn i18n-unused`.

### Task 9: Legacy survey push routes by the entry rule

**Files:** modify `src/utils/notification.ts:298-302` (+ spec).

- A legacy push with `targetView === 'survey'` now calls one helper, `openCheckIn(profile)`:
  - `wellbeing` goes to consent or check-in;
  - `legacy` goes to `MentalTestsScreen` exactly as today;
  - `none` goes to Home.
- The same helper is used by Home and the trend card, so there is ONE way into the check-in.
- **Spec:** a wellbeing user never reaches `MentalTestsScreen`.

### Task 10 (Claude): gates, simulator QA, PR

1. Run the full gates listed in Global Constraints. Compare jest totals to an `origin/staging-environment-setup` baseline run in this worktree before the change.
2. Simulator QA (Claude), following the sim lock protocol, on a production-scheme JS build:
   - prove Task 1 on a device (popup appears for a due account; before vs after);
   - walk every review-page screen at default and AX3 text sizes with real screenshots;
   - run a legacy account regression pass.
   Publish the before/after page.
3. Push once, then PR to `staging-environment-setup` with no `run-ci` label. Coordinate the merge with the Debug session (514 owner).
