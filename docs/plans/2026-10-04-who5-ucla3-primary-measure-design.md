# WHO-5 + UCLA-3 as Murror's primary measure: design

- **Status:** design, approved in conversation 2026-10-04. The written spec is awaiting Astro's review. Nothing is built.
- **Owner:** Astro (decisions). Claude drives and reviews; Codex builds.
- **Surface map:** https://claude.ai/artifact/AAZND28Ncfk3Bo5EJBqhbz (private until shared)
- **Code read:** `prod/` checkouts. MurrorMobile is from 2026-10-03; murror-api and viasr-api are `production` from 2026-10-01. `Murror/<repo>` is a stale July checkout, so do not plan from it.

## 1. Goal

Replace PHQ-9 + GAD-7 (symptom severity) with the WHO-5 Well-Being Index plus the UCLA 3-Item Loneliness Scale as the in-app check-in. This becomes the primary measure for an 8-week validation study with real users. One global server switch turns the old pair off and the new pair on.

## 2. Decisions (Astro, 2026-10-04)

| Topic | Decision |
|---|---|
| What "validation" means | A study with real users: a baseline, then a check-in every 14 days |
| Self-harm safety net | Rely on chat crisis detection. There is no structured self-harm question in the check-in. |
| How the switch applies | One global switch. It flips before the study starts and stays frozen until the study ends. |
| Result view | A gentle score and trend: wellbeing 0-100, a loneliness level, and the change since last time |
| Baseline | On switch day, everyone active is asked right away, whatever their 14-day clock says |
| Low wellbeing (WHO-5 <= 28/100) | A gentle support card. It is not the crisis banner and not an upsell. |
| Use of results | Internal learning only. In-app research consent, no outside ethics review. |
| Study length | 8 weeks: a baseline plus 4 check-ins. The primary read is at day 56. |

**Knock-on of "internal learning only":** no public or investor efficacy claim may be made from this data. That includes the monthly investor letter. If that changes, the study needs an ethics review before it starts, not afterwards.

## 3. Non-goals

- No conversion between PHQ/GAD scores and WHO-5/UCLA-3. No validated crosswalk exists.
- No deletion, hiding, or rewriting of anyone's PHQ/GAD history.
- No vi/ja translation. Launch is English-only, and vi/ja keys get the English text.
- No control group. This is a pre/post study (see section 10 for what that can and cannot show).
- No per-user instrument choice in Settings.

## 4. How it works today (verified in code)

- **Check-in prompt:** the Home popup and the Reflection chart's CHECK-IN button are both gated on the profile field `biWeeklyCheckinAvailable`. It is true when there is no report yet or the last one is more than 14 days old (`murror-api/src/user-profile/user-profile.service.ts`).
- **One combined form, 16 items.** The questions are served and scored by `murror-api/src/checkin/mental-health.controller.ts` (`GET questions`, `POST answers`). Scoring:
  - Answers are summed by `question_type`.
  - Each sum is banded through `user_checkin_report_statuses`.
  - One `public.user_checkin_reports` row is written, with `anxiety_score`, `depression_score` and `crisis_disclosed`.
- **The pipeline only fits two instruments:**
  - `question_type` is an enum with exactly two values.
  - The score columns are fixed.
  - A score with no band throws.
- **Item-9 safety path:** any positive answer to PHQ-9 item 9 sets `crisis_disclosed` and returns `metadata.crisis`. `test-result-screen.tsx` then shows `CrisisInlinePrompt`, and it also does so when either band is severe.
- **AI:** viasr-api `app/services/notification/service.py` (13 `phq9` sites) uses the PHQ score to choose the push-notification tone. A score of 0 skips the decision. `app/prompts/conversation_chat.yaml` tells the model that the app asks PHQ-9 and GAD-7 every two weeks.
- **Chat crisis detection exists:** the murror-api deep-chat `send-message.use-case.ts` sets `crisis: true` on a turn. It is not yet proven end to end in prod.
- **Flags:** the app cannot reach Statsig, so every Statsig gate reads false. A Statsig flag cannot carry this switch.

## 5. Instruments

- **WHO-5 (version key `who5-1998`)**
  - Stem: "Over the last two weeks". Five positively worded items, each answered 0 ("At no time") to 5 ("All of the time").
  - Raw score is 0-25; multiply by 4 for a 0-100 percentage. **Higher is better.**
  - Bands for the result copy: <= 28 is low (shows the support card); 29-49 is below average; >= 50 is fine.
  - Meaningful change: >= 10 points. That is a group-level benchmark, so the app never tells an individual "you improved meaningfully".
- **UCLA-3 (version key `ucla3-hughes2004-3pt`)**
  - Three items: lack companionship, left out, isolated. Each answered 1 ("Hardly ever"), 2 ("Some of the time"), 3 ("Often").
  - Total is 3-9. **Higher is lonelier.** 6 or above means lonely.
  - It is not designed to detect change, so it is a secondary result only.
- **Wording:** item wording is used exactly as published. House-tone rules do not apply to item text. They do apply to everything around it: intro, result, support card, learn-more.
- **Verify before build (section 12):** licensing for both scales, and the exact item text and anchors against the primary sources.

## 6. Design

### 6.1 Data (murror-api, `murror_api` schema, new)

New tables are used because the legacy `public` check-in tables cannot hold a third or fourth instrument without bending their enum, columns and banding.

- **`assessment_response`**: one row per instrument per check-in.
  - `id` (uuid), `userId`.
  - `checkInId`: groups the WHO-5 and UCLA-3 rows of one sitting.
  - `instrument`: enum `WHO5 | UCLA3`.
  - `instrumentVersion`.
  - `itemAnswers`: jsonb, item key to numeric value.
  - `rawScore`; `normalizedScore` (WHO-5 percentage, null for UCLA-3).
  - `higherIsBetter`; `band`.
  - `createdAt`.
- **`research_consent`**: `userId`, `studyKey`, `consentVersion`, `consentedAt`, `withdrawnAt`.
- **The global switch** is a server-side setting:
  - It holds `activeInstrumentSet` (`phq9_gad7 | who5_ucla3`) and `switchedAt`.
  - It must be flippable without a deploy, and it is never Statsig.
  - The implementation plan picks the mechanism (an existing config table, or a new single-row table) after checking what murror-api already has.
- **Legacy tables are untouched.** `public.user_checkin_reports` and its related tables stay read-only history.
- **Deletion:** the new tables are registered in `account-deletion.registry.ts`.

### 6.2 API (murror-api)

- **New endpoints** for the new instruments: questions, submit and history. The existing `mental-health` endpoints keep their exact current behaviour for older app builds.
  - Submit validates every item value against its instrument's range.
  - Submit rejects a partial check-in.
  - Every DTO field is declared, because ValidationPipe strips undeclared fields.
- **Profile** gains a `checkIn` object: `{due, instrumentSet, isBaseline, consentNeeded}`. It is read by new builds only.
- **`due` rules:**
  - When the switch is `who5_ucla3`, `due` is true if the user has no WHO-5 response since `switchedAt` (the baseline-on-switch-day decision), or if their last WHO-5 response is 14 or more days old.
- **Older app builds:** when the switch is `who5_ucla3`, the legacy `biWeeklyCheckinAvailable` returns false.
  - That hides both legacy entry points in old builds.
  - Without this, old builds would keep collecting PHQ/GAD after the switch, mixing instruments.
  - Old builds can still open past PHQ/GAD results from the chart.
  - Optionally, raise the minimum app version through app-config. That is Astro's call at flip time.
- **History endpoint:** returns both the legacy PHQ/GAD series and the new series. Each series is tagged with its instrument and `higherIsBetter`, and is never merged into one.

### 6.3 App (MurrorMobile, one build)

- **Check-in flow:**
  - A consent step is shown once, before the first new check-in, while `consentNeeded` is true.
  - Then the 5 WHO-5 items, then the 3 UCLA-3 items. Each part has its own stem and answer scale.
  - About one minute in total.
  - The existing carousel screen is extended rather than duplicated.
- **Consent:** explains in plain words:
  - what is measured, and why;
  - that answers are used, de-identified, for internal product learning;
  - that taking part is optional;
  - how to withdraw.
  - Declining still lets the user take the check-in and see their own results. Their data is just excluded from the study export.
- **Result screen:**
  - A wellbeing score of 0-100, labelled "higher is better".
  - A loneliness level in words (from the band).
  - The change since the last check-in, shown only when there is a previous WHO-5.
  - If WHO-5 is 28 or below, the gentle support card.
  - A non-diagnostic disclaimer.
- **Low-wellbeing support card:** warm wording, and one action that opens the existing support/resources sheet. No paywall in front of it, and no upsell on the card.
- **Reflection chart:**
  - New series from the first WHO-5 onwards.
  - The legacy PHQ/GAD history stays reachable as its own labelled view.
  - No line or arrow crosses between instruments.
  - The empty trend after one point says when the next check-in comes. It must not imply "no change".
- **Learn more:** rewritten for WHO-5 and UCLA-3, about 60 keys in `en.json`.
- **Severity bands:** the 4 divergent hard-coded copies of the bands are not reused for the new instruments. Bands come from the server.
- **Retired V1 onboarding questionnaire** (`src/screens/onboarding/weekly-*`): confirm no live route reaches it, then remove its route so it cannot serve PHQ/GAD after the switch.
- **Analytics:** add check-in started / completed / abandoned events. They carry no scores and no answers.

### 6.4 AI (viasr-api)

- **Notification tone:** derived from the latest WHO-5 band instead of `phq9_score`.
  - A missing score means "unknown". It is never 0, which today skips the decision.
  - Mapping and wording go through compassion review.
- **Scores reach viasr only when the user's server-side AI setting allows it**, following the existing server AI-switch gating.
- **`conversation_chat.yaml`:** the PHQ-9/GAD-7 claim is removed or replaced with an accurate one.
- **`user_persona.yaml` `current_status`:** stop asking the model to score GAD-7/PHQ-9. The implementation plan lists the readers of `current_status` first, and retargets or retires it.

### 6.5 Web (murror-platform)

- The reflection check-in card shows the same two series and the new copy.

## 7. Safety (preconditions to flipping the switch)

There is no structured self-harm question any more, so these move from nice-to-have to **required before the switch flips**. Each one needs evidence, not a code read.

1. **Chat crisis detection fires in prod.** On a test account, reviewed crisis phrases in chat produce the crisis flag, and the app shows resources. Recorded with screenshots.
2. **Free users reach crisis resources** from chat and from a permanent entry point, with no paywall. Tested on a free test account.
3. **The low-wellbeing card** opens the resources sheet for a free account.
4. **Legacy item-9 behaviour stays intact** for any PHQ submission made by an old build before the flip, and for viewing old results.

Even a positive item-9 answer has modest predictive value. The removal is still a real loss of one disclosure route, accepted by Astro on 2026-10-04 on the condition that items 1-3 are proven.

## 8. Privacy

- Wellbeing and loneliness scores are sensitive, health-adjacent data.
- **Never in:** PostHog event properties, Sentry payloads (extend `sentry-scrub.util.ts`), logs, or push payloads.
- **Never shown to Duo/Circle partners.** Proven by a two-account test, not assumed.
- **Deletion:** account deletion removes `assessment_response` and `research_consent` rows.
- **Withdrawal:** withdrawing consent sets `withdrawnAt` and excludes the user from every later export. The user keeps their own history.
- **Privacy policy and App Store label:** check that they cover wellbeing/loneliness data and internal research use before the flip. The label was last published 2026-09-07.
- **Users under 18:** excluded from the study export. `birth_date` is optional, so the plan must decide how age is established (a consent attestation is the minimum).

## 9. Copy

- **English only.** No em dashes. No "journal" term.
- Every string outside the item wording goes through the compassion-review skill: consent, intro, result, support card, learn-more, notification tone.
- **Framing:** "a snapshot of the last two weeks, not a diagnosis".

## 10. Study protocol (pre-registered here, before any data)

- **Population:** active users who consent within 14 days of the flip form the main cohort. Later sign-ups form a rolling cohort, analysed separately.
- **Schedule:** baseline at day 0, then days 14, 28, 42 and 56. A check-in counts for day N if it falls within N +/- 7 days.
- **Primary result:** mean change in WHO-5 percentage from baseline to day 56, among participants with both measures.
- **Secondary results:**
  - the share of participants with a WHO-5 gain of 10 points or more;
  - mean UCLA-3 change;
  - the share scoring lonely (>= 6) at baseline and at day 56.
- **Attrition:** completion rate at each point, reported with the results. Missing data is reported, not imputed.
- **What it can and cannot show:** pre/post with no control group. A change cannot be attributed to Murror, and people who start low tend to drift up anyway (regression to the mean). This is fine for internal learning. It is not evidence of efficacy.
- **Freeze:** no change to instrument wording, order, cadence or result screen during the 8 weeks.
- **Export:** de-identified, per participant. Columns are a study id, consent date, cohort, each point's scores and their dates. Withdrawn users and under-18s are excluded.

## 11. Testing

- **Scoring unit tests** for both instruments, including direction, with a **behaviour mutation**: invert WHO-5 direction in different words and watch a named test fail.
- **API tests:**
  - range validation, and rejection of a partial check-in;
  - the `due` rules, including baseline-on-switch-day and the 14-day rule;
  - legacy `biWeeklyCheckinAvailable` returns false when the switch is on.
- **App:** full jest suite, `yarn lint`, tsc, prettier. Then simulator QA of every row on the surface map, with real before/after screenshots.
- **Old-build compatibility:** run an old build against the flipped server. No prompt appears, and old results still open.
- **Two-account partner test:** no score is visible to the partner.
- **Deletion and withdrawal tests.**
- **Time-passage check:** use `sim-swap --clock` to step through days 0, 14, 28, 42 and 56, and confirm each check-in becomes due at the right moment.

## 12. To verify before build

- WHO-5 and UCLA-3 licensing for in-app commercial use, plus the exact item text and anchors from the primary sources.
- How the global switch is stored in murror-api, using an existing mechanism if one exists.
- Whether the murror-backend bi-weekly reminder cron is live. If so, update its copy and tap target, or retire it.
- Whether any live route still reaches the V1 `weekly-*` questionnaire.
- Who reads viasr `current_status`.
- Privacy-policy coverage of research use.

## 13. Rollout

1. **Prep (no code):** verifications in section 12, consent and copy drafts, compassion review, and evidence for safety preconditions 1-2.
2. **murror-api:** tables, endpoints, switch (off), deletion and scrubbing, export. Ships dark.
3. **viasr-api:** notification tone, prompt claim, persona. Ships dark, and is safe with the switch off.
4. **App + web:** one build, after the pre-514 list. Simulator QA, then TestFlight.
5. **Flip:** prove safety preconditions 3-4 on the shipped build. Then Astro flips the switch, which is when baselines open and the 8 weeks start.

**Sequencing constraint:** the app build lands only after the pre-514 master list (handoff of 2026-10-02/04). Server phases can land earlier because they are dark.

## 14. Risks

| Risk | Mitigation |
|---|---|
| A distress disclosure route is lost | Safety preconditions 1-4 are proven before the flip |
| WHO-5 is read upside down somewhere | `higherIsBetter` on every row, no merged series, a direction mutation test |
| Old builds mix instruments | Legacy flag returns false after the flip; optional minimum-version raise |
| Data leaks into analytics or partner views | Scrubbing, no score properties, two-account test |
| Results get used as efficacy claims | Internal-only rule written here; investor letter excluded |
| Heavy drop-off | Attrition reported; one-minute check-in; 14-day spacing |
