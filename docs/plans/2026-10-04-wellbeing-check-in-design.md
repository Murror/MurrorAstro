# Murror wellbeing check-in as the primary measure: design

- **Status:** BUILT 2026-10-04/05, dark for real users. murror-api #1243 + #1247 in production (promotion #1248); viasr #851 in production (promotion #854); MurrorMobile #1980 merged to `staging-environment-setup` at ff275c75, so build 515 includes it. Live only for the prod preview accounts (`ASSESSMENT_PREVIEW_USER_IDS`). The flip (Plan 4) waits on the UCLA-3 licence and the chat-crisis proof.
- **Owner:** Astro (decisions). Claude drives and reviews; Codex builds.
- **Surface map:** https://claude.ai/artifact/AAZND28Ncfk3Bo5EJBqhbz (private until shared)
- **Code read:** `prod/` checkouts. MurrorMobile is from 2026-10-03; murror-api and viasr-api are `production` from 2026-10-01. `Murror/<repo>` is a stale July checkout, so do not plan from it.

## 1. Goal

Replace PHQ-9 + GAD-7 (symptom severity) with a new check-in made of four parts:

- **Murror's own 6-question wellbeing questionnaire.** This is the primary measure.
- **The ONS life-satisfaction question**, used as a reference point. It is not part of the score.
- **UCLA-3 + the ONS direct loneliness question**, which measure loneliness.

The check-in is the primary measure for an 8-week internal study with real users. One global server switch turns the old pair off and the new check-in on.

**Why not WHO-5:** on 2026-10-04, WHO's own publication page listed WHO-5 under CC BY-NC-SA 3.0 IGO, which is non-commercial, and Murror is a paid app. Astro chose to write Murror's own questionnaire rather than ask WHO for permission. A light rewording of WHO-5 would still count as an adaptation under that licence, so the questionnaire is original, not reworded.

## 2. Decisions (Astro, 2026-10-04)

| Topic | Decision |
|---|---|
| What "validation" means | A study with real users: a baseline, then a check-in every 14 days |
| Wellbeing measure | Murror's own 6 questions (section 5.1), not WHO-5 |
| Reference point | Add the ONS life-satisfaction question. It is not part of the score. |
| Loneliness | ONS direct question + UCLA-3. If UCLA-3 cannot be cleared for commercial use before the flip, drop it and keep the direct question. |
| Self-harm safety net | Rely on chat crisis detection. The check-in has no structured self-harm question. |
| How the switch applies | One global switch. It flips before the study starts and stays frozen until the study ends. |
| Home popup (Astro 4 Oct, D2/D2b) | Root-cause fix: a due check-in no longer blocks its own popup. For wellbeing users the connections-intro suppression (since Feb 2026) no longer applies. |
| Result view | **Trend words, no numbers.** "This is your starting point", "a little lighter", "about the same", "a little heavier", plus the support card when needed. (This replaced "score 0-100 + trend" to reduce the pull to answer nicely.) |
| Baseline | On switch day, everyone active is asked right away, whatever their 14-day clock says |
| Low wellbeing | A gentle support card triggered by a product rule (section 5.1). It is not a clinical threshold, not the crisis banner, and not an upsell. |
| Use of results | Internal learning only. In-app research consent, no outside ethics review. |
| Study length | 8 weeks: a baseline plus 4 check-ins. The primary read is at day 56. |

**Knock-on of "internal learning only":** no public or investor efficacy claim may be made from this data, and that includes the monthly investor letter. If that changes, the study needs an ethics review before it starts.

## 3. Non-goals

- No conversion between PHQ/GAD scores and the new measures.
- No deletion, hiding or rewriting of anyone's PHQ/GAD history.
- No vi/ja translation. Launch is English-only, and vi/ja keys get the English text.
- No control group. The design is pre/post (see section 10).
- No per-user instrument choice in Settings.
- No numbers on the result screen.

## 4. How it works today (verified in code)

- **When the check-in appears:** the Home popup and the Reflection chart's CHECK-IN button are both gated on `biWeeklyCheckinAvailable`. It is true when there is no report, or the last report is more than 14 days old.
- **Three places compute this today:**
  - `murror-api/src/user-profile/user-profile.service.ts` has two: `getUserProfile`, and a raw-SQL method.
  - `bootstrap-app.use-case.ts` has `checkReportSubmitted`, which uses a 13-day rule.
- **One combined 16-item form:** `murror-api/src/checkin/mental-health.controller.ts` serves and scores it, writing `public.user_checkin_reports` with `crisis_disclosed`. The pipeline only fits two instruments: a two-value `question_type` enum, fixed score columns, and an error thrown when no band matches.
- **Item-9 safety path:** any positive answer to PHQ-9 item 9 sets `crisis_disclosed`, and the result screen then shows `CrisisInlinePrompt`. The screen also shows it when a band is severe.
- **AI:** viasr-api `app/services/notification/service.py` (13 `phq9` sites) picks the push tone from the PHQ score. A score of 0 skips the decision. `app/prompts/conversation_chat.yaml` claims the app asks PHQ-9 and GAD-7 every two weeks.
- **Chat crisis detection:** murror-api deep-chat sets `crisis: true` on a chat turn. This is not yet proven end to end in prod.
- **Flags:** Statsig is unreachable from the app, so a Statsig flag cannot carry this switch.

## 5. Instruments

The check-in asks the four parts below in this order. Asking the loneliness questions last keeps them from colouring the wellbeing answers. Within loneliness, UCLA-3 comes before the direct question so the word "lonely" is not primed (verify against the ONS guidance before the flip). It takes about 70 seconds.

### 5.1 Murror wellbeing (primary; key `MURROR_WB`, version `murror-wellbeing-v1`)

- **Stem:** "Thinking about the past 14 days, how true has each of these been for you?"
- **Options, scored 0-4:** Not at all true (0), Slightly true (1), Somewhat true (2), Mostly true (3), Completely true (4).

| Key | Item | Domain |
|---|---|---|
| mw_1 | When I felt something strongly, I could put it into words. | Emotional clarity |
| mw_2 | When something upset me, I found my way back to feeling okay. | Steadiness and recovery |
| mw_3 | The good moments outweighed the hard ones. | Overall balance |
| mw_4 | When things went wrong, I spoke to myself the way I would to a friend. | Self-kindness |
| mw_5 | I told someone in my life how I was really doing. | Openness with people |
| mw_6 | When something weighed on me, I could work through it myself or with people I know. | Own capacity (a dependency guard) |

- **Scoring:**
  - Raw score is 0-24. Score = round(raw ÷ 24 × 100), so 0-100. **Higher is better.**
  - There are no reverse-keyed items: on a phone they get misread.
- **Bands (product, not clinical):** `low` at a score of 25 or less (answers average "slightly true" or lower); `ok` otherwise.
- **Support card:** shown when the band is `low`, OR the score dropped 30 or more points since the previous check-in. At day 14, measure how often it fires. If it fires for more than 20% of people, tighten the rule.
- **Trend words** compare with the previous check-in:
  - no previous check-in gives `first`;
  - a change of 10 points or less either way gives `about_same`;
  - a rise of more than 10 gives `lighter`; a fall of more than 10 gives `heavier`.
  - The 10-point threshold is a placeholder until day-14 data gives the smallest detectable change. Then it is revisited once, before day 28.
- **Kept original:** no item rewords WHO-5. Mood, calm, energy, sleep and "interesting life" are all left out. Hope and "dealing with problems well" are left out too, because they are too close to WEMWBS and SWEMWBS. Items describe concrete situations rather than "I understand myself", so the measure does not just echo the AI's own vocabulary.
- **Not yet validated.** Section 10 is the validation plan.

### 5.2 ONS life satisfaction (reference point; key `ONS_LIFESAT`)

- **Question:** "Overall, how satisfied are you with your life nowadays?"
- **Scale:** 0 (Not at all) to 10 (Completely). Higher is better.
- **ONS bands:** 0-4 low, 5-6 medium, 7-8 high, 9-10 very high.
- **Not in the score, and never shown to the user.**
- **Licence:** ONS content is under the Open Government Licence v3.0, which allows commercial use with attribution. Verify the attribution wording before the flip.

### 5.3 UCLA-3 (key `UCLA3`, version `ucla3-hughes2004-3pt`)

- **Stem:** "How often do you feel"
- **Items:** "that you lack companionship?", "left out?", "isolated from others?"
- **Options:** Hardly ever or never (1), Some of the time (2), Often (3). This wording is from the ONS national guidance.
- **Scoring:** total 3-9; **higher is lonelier.** Band `lonely` at 6 or more.
- **Licence:** unconfirmed. The scale is copyrighted (Russell / Hughes et al. 2004). The flip is gated on clearance. If it is not cleared, remove UCLA-3 and keep 5.4.

### 5.4 ONS direct loneliness (key `ONS_LONELY`)

- **Question:** "How often do you feel lonely?"
- **Options:** Never (1), Hardly ever (2), Occasionally (3), Some of the time (4), Often or always (5). **Higher is lonelier.**
- **Band:** `often_lonely` at 5, `not_often_lonely` otherwise.
- **Licence:** ONS-owned, under the Open Government Licence v3.0.

## 6. Design

### 6.1 Data (murror-api, `murror_api` schema, new)

- **`assessment_responses`**: one row per instrument per check-in, so four rows per check-in. Columns:
  - `checkInId`: client-generated, shared by the four rows of one sitting;
  - `instrument`, `instrumentVersion`;
  - `itemAnswers` (jsonb);
  - `rawScore`, `normalizedScore` (only `MURROR_WB` has one);
  - `higherIsBetter`, `band`, `createdAt`.
- **`research_consents`**: `userId`, `studyKey`, `consentVersion`, `status` (consented, declined or withdrawn), `ageConfirmed18`, `decidedAt`.
- **`assessment_settings`**: a single row holding `activeInstrumentSet` (`phq9_gad7` | `wellbeing_v1`) and `switchedAt`. It is flipped by an admin endpoint, never via Statsig.
- **Legacy PHQ/GAD tables:** untouched, read-only history.
- **Deletion:** the new user tables are registered in `account-deletion.registry.ts`.
- **Singapore-to-US sync:** the prod sync uses a fixed table list (publication `murror_move`). The moment the migration reaches Singapore PROD, message the DB Migration session so the three tables are created on the US side and added to the publication.

### 6.2 API (murror-api)

- **New endpoints:**
  - questions, submit, history and consent for users;
  - set-switch and export for admins.
- **Old endpoints:** the existing `mental-health` endpoints keep their exact behaviour for older app builds.
- **Submit:**
  - validates every instrument's items and ranges;
  - rejects a partial check-in;
  - is idempotent on `checkInId`.
- **What submit returns:** `{checkInId, trend, showSupportCard}` and **no scores**. History returns the wellbeing series for a numberless trend view.
- **Profile** gains `checkIn: {due, instrumentSet, isBaseline, consentNeeded}`.
  - `due` is true if there is no `MURROR_WB` response since `switchedAt`, or the last one is 14 days old or more.
  - When the switch is `wellbeing_v1`, the legacy `biWeeklyCheckinAvailable` is false and bootstrap's `isReportSubmitted` is true, so older builds never prompt.

### 6.3 App (MurrorMobile, one build)

- **Administration rules** (these stop the data being skewed by a good mood after chatting):
  - Never offer the check-in at the end of a chat or a moment. Offer it on a fresh app open, before any chat that day.
  - Neutral framing: "how your last two weeks have been", never "help us improve Murror", and no item mentions Murror.
  - Answers and past scores are not shown back, and no reward depends on the answers.
- **Flow:**
  - A one-time consent screen.
  - Then 6 wellbeing items, the life-satisfaction item, the 3 UCLA-3 items, and the direct question. One item per screen, with Back allowed.
- **Result screen:**
  - The trend words for `first`, `lighter`, `about_same` and `heavier`.
  - The support card when `showSupportCard` is true.
  - A non-diagnostic disclaimer.
  - No numbers.
- **Support card:** warm copy and one action that opens the existing support resources sheet. No paywall and no upsell.
- **Reflection chart:**
  - The new wellbeing series is shown as a trend shape with no numeric axis.
  - The legacy PHQ/GAD history stays reachable as its own labelled view.
  - No line crosses between the two.
- **Learn more:** rewritten. It says the check-in is Murror's own, is not a test, does not diagnose, and is not therapy.
- **Retired V1 onboarding questionnaire:** confirm nothing reaches it, then remove its route.
- **Analytics:** check-in started, completed and abandoned. No scores, no answers.

### 6.4 AI (viasr-api)

> **Scope change (2026-10-04, Plan 2 evidence):** notification tone was NOT moved to the MURROR_WB band. The scheduled notification path is dormant: `NOTIFICATION_SCHEDULING_ENABLED` is unset, `phq9_score` is hard-coded to 0, the LLM message is discarded, and `/notification/decide` has no callers. Shipped instead: the chat prompt no longer names PHQ-9/GAD-7, and the LLM-guessed `current_status` score is retired from every prompt.

- **Notification tone:** comes from the latest `MURROR_WB` band. A missing score means "unknown", never 0. Goes through compassion review.
- **Server AI switch:** scores reach viasr only when the user's server-side AI setting allows it.
- **`conversation_chat.yaml`:** the PHQ-9/GAD-7 claim is removed or corrected.
- **`user_persona.yaml` `current_status`:** stop scoring GAD-7/PHQ-9. First list its readers, then retarget or retire it.

### 6.5 Web (murror-platform)

The reflection check-in card follows the same rules as the app.

## 7. Safety (preconditions to flipping the switch)

1. **Chat crisis detection fires in prod.** Proven on a test account with reviewed phrases, with screenshots.
2. **Free users can reach crisis resources** from chat and from a permanent entry point, with no paywall.
3. **The support card opens the resources sheet** for a free account.
4. **The legacy item-9 behaviour is intact** for old builds and for old results.

## 8. Privacy

- Scores are sensitive health-adjacent data. They never appear in PostHog, Sentry, logs or push payloads.
- Partners never see them. This is proven by a two-account test.
- Account deletion removes the rows.
- Withdrawing excludes the person from later exports, and they keep their own history.
- **Consent copy must be accurate:**
  - the export is pseudonymous (a salted hash, no name or email);
  - the team can technically access the database, so the copy says answers are "studied without your name", not "we never see them";
  - withdrawing stops future use and keeps the person's own history.
- Under-18s are excluded from the export, based on an age confirmation in the consent step.
- The privacy policy and App Store label must be checked before the flip.

## 9. Copy

- English only. No em dashes. No "journal".
- Compassion review covers everything outside the item wording.
- Framing: "a snapshot of the last two weeks, not a test, not a diagnosis."
- The PHQ-9/GAD-7 credit line in `testResult.disclaimer` is removed.

## 10. Study protocol (pre-registered here, before any data)

**Population and schedule:**
- The main cohort is consenting users active within 14 days of the flip. Later sign-ups form a rolling cohort, analysed separately.
- Testers and people Astro knows are tagged and analysed separately.
- Check-ins fall on days 0, 14, 28, 42 and 56, each within ±7 days.

**Results:**
- **Primary:** the mean change in the Murror wellbeing score from baseline to day 56, among people with both measurements.
- **Secondary:**
  - the share of people better vs worse on wellbeing, using the smallest detectable change from the day-0 vs day-14 data, fixed before day 28;
  - the change in UCLA-3 and in the direct loneliness answer;
  - change for each item, especially mw_4 (self-kindness, which the AI coaches) and mw_6 (the dependency guard);
  - whether clarity (mw_1) moves before loneliness does.

**Validating the questionnaire:**

| Analysis | Target |
|---|---|
| Internal consistency (omega) | ≥ .80, with .70 acceptable; needs ≥ 100 at baseline |
| Day 0 vs day 14 stability (ICC) for stable users | ≥ .60-.70 |
| One-factor model | Needs ≥ 200 people; with 100-199 it is exploratory only |
| Correlation with ONS life satisfaction | About .55 to .75 |
| Correlation with loneliness | About -.40 to -.60 |
| Floor and ceiling | Under 15% at either end |

**Reading the results:**
- **Look at first:** retention to day 56, and whether dropouts started worse; the share better vs worse; the shape of the curve across waves.
- **Can conclude:** whether people who stayed changed, in which areas, and whether anyone got worse.
- **Cannot conclude:** that Murror caused it. Time, starting at a low point and wanting to please would all produce the same curve.
- **Freeze:** wording, order, cadence and the result screen stay fixed for the 8 weeks. The one planned exception is the trend threshold, revisited before day 28.

**Export:** pseudonymous study id, cohort, consent date, each instrument's scores, and day from baseline. Withdrawn people and under-18s are excluded.

## 11. Testing

- Unit tests for scoring every instrument, with a direction mutation on `MURROR_WB`.
- A guard test that no `MURROR_WB` item contains WHO-5 wording.
- Tests for the trend and support-card rules at their boundaries.
- API tests for validation, idempotency, the `due` rules and the legacy flags.
- App: the full jest suite, lint, tsc and prettier; then simulator QA of every map row with screenshots.
- An old build against a flipped server.
- A two-account partner test.
- Deletion and withdrawal tests.
- Time travel with `sim-swap --clock` across days 0 to 56.

## 12. To verify before the flip

- UCLA-3 commercial-use clearance. If it is not cleared, remove UCLA-3.
- The ONS attribution wording (Open Government Licence v3.0) and the recommended loneliness question order.
- How the murror-backend bi-weekly reminder cron behaves, whether any V1 `weekly-*` route is still live, and who reads `current_status`.
- That the privacy policy covers internal research use.

## 13. Rollout

1. **Prep:** verifications, consent and copy, compassion review, and evidence for safety items 1-2.
2. **murror-api:** ships dark.
3. **viasr-api:** ships dark.
4. **App + web:** one build, after the pre-514 list. Simulator QA, then TestFlight.
5. **Flip:** prove safety items 3-4 on the shipped build. Then Astro flips the switch and the 8 weeks start.

## 14. Risks

| Risk | Mitigation |
|---|---|
| A distress disclosure route is lost | Safety preconditions 1-4 |
| The questionnaire does not measure wellbeing well | Anchor item, validation analyses, honest "not validated" labelling |
| Scores move from answering nicely or picking up the AI's vocabulary | Concrete items, no numbers shown back, administered away from chats, life-satisfaction anchor |
| Old builds mix instruments | Legacy flags turned off after the flip |
| Licence exposure | Original items; ONS under the Open Government Licence; UCLA-3 gated on clearance |
| Data leaks | Scrubbing, no score properties, two-account test |
| Heavy drop-off | About 70 seconds per check-in, 14-day spacing, attrition reported |
