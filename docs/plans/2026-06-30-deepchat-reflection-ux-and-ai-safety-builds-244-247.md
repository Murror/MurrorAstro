# Deep-chat / reflection UX feedback loop + AI emotional-safety backend (builds 244-247)

Date: 2026-06-28 to 2026-06-30 (PST). Author: Astro (Claude). Follows
`2026-06-28-bedtime-voice-story-and-mobile-batch-builds-236-243.md`.

## Context

Rapid QA feedback loops on the deep-chat / reflection experience. Astro tested
each staging TestFlight build on device and sent batches of findings (with
screenshots); each item was root-caused (often via parallel specialist agents),
fixed, reviewed, and rolled into the next build. In parallel, three AI
emotional-safety + UX issues were fixed in the backend and deployed to staging.
Mobile shipped staging TestFlight builds 244 -> 247; viasr-api + murror-api
shipped 4 PRs to staging.

## Mobile (MurrorMobile, builds 244-247, branch fix/bedtime-card-journal-list)

### Build 244 (QA243)
- (d072721) LockIcon SVG had no viewBox, so it clipped instead of scaling at
  small sizes; added `viewBox="0 0 20 20"` (fixes every small lock app-wide).
- (02e0f2f) Home Journal rail did not refetch on focus, so a freshly saved
  deep-chat/journal entry did not appear without a manual refresh; added a
  `useFocusEffect(refetch)` (the diary query is already invalidated on save).
- (5b4a08e) Birth time was lost on reinstall: the onboarding store only loaded
  from local AsyncStorage. Added `hydrateFromProfile()` to backfill durable
  fields from the server `/me` on launch (only fields still undefined, so it
  never clobbers in-progress onboarding). Server already stored/returned it.

### Build 245 (deep-chat copy/UX + For-Us)
- (0d42905) For-Us: "Reflect about X" on a care tip synchronously flipped the tip
  to "resting" -> the carousel dropped the card mid-screen and recycling blanked
  neighbors. Snapshot the visibility per visit; rest applies on the next focus.
- (bbc3324) Deep-chat copy/UX batch: connection-picker section title, second-person
  solo prompts, clearer privacy + invite copy, council attribution dedup,
  save-draft contrast, reflection-card spacing. (Partial: see gotcha below.)
- Persona attribution already renders on all 3 summary sections (12c4f33,
  prior); a stale comment was corrected.

### Build 246
- (09bce5a) Voice input: tapping Done called `Voice.stop()` immediately, clipping
  a trailing word. Defer the stop ~1s (recognizer keeps capturing), ref-guarded
  + cleared on unmount.
- (5a2b399) Removed stale `[DEBUG dive]` console instrumentation (CI forbids
  production console.*).

### Build 247 (QA246, the second deep-chat batch)
- (337e71f) Pronoun: the 11 named/relationship reflect prompts were still
  first-person; flipped to second person in en + vi (ja intentionally unchanged,
  it already reads second-person). Privacy: restored the original encryption
  reassurance line alongside the new "between you and Murror" line (both shown),
  and rewired "Learn more" to a user-privacy popup instead of the CBT explainer.
- (e4401d5) For-Us reflect card: removed the prompt subtext that clipped under
  the SHARE YOURS CTA; set carousel `loop={false}` (wrap reordered cards). CRI
  "Dive deeper": added a loading spinner until prompt options arrive. Tab nav
  white flash: set `sceneStyle`/`cardStyle` backgrounds to `neutralBlack`
  (version-correct props for bottom-tabs v7 + stack v7).

## Backend (staging deploys)

- murror-api `#522` (4a70392) regenerate legacy connection reflections with empty
  `quote`/`insight` so the CRI "Quote" + "What both can do" sections render
  (cache-validity only required `overview`). Loop-guarded by a per-row createdAt
  cutoff; fresh AI generations cannot be empty (validated schema). Deployed.
- viasr-api `#537` (e62dc3b) stop the AI meta-response leak on the reflection
  card: when a connection's deep_chat summary was empty (new/low-activity
  connection), the model replied conversationally ("I don't see a journal
  summary...") and that was published verbatim to the receiver. Added an input
  guard (empty -> generic reflection) + an output guard (meta-phrase detector ->
  warm relationship-keyed fallback). Compassion review 10/10. Deployed.
- viasr-api `#538` (68787fd) mood-aware care notifications: the daily scheduler
  hardcoded `phq9_score=0` and ignored mood. Now reads the latest daily mood
  check-in (24h recency), maps it to a level as a FLOOR (`max(llm, mood)`; NOT_OK
  never crisis-grade), and tunes cadence (OK=2, Neutral/Not-OK/no-mood=3, crisis=7
  unchanged) + tone. Failure-isolated + gentle fallback bank. Deployed.
- viasr-api `#539` (47405a5) phrase AI-generated journaling/reflection prompts in
  second person ("What are you afraid..." not "What am I afraid..."); fixed the
  rule + all 5 baked examples in `JOURNAL_SYSTEM_PROMPT`. Deployed.

## Gotchas / lessons
- Background agents that die mid-task can leave PARTIALLY committed work. Build
  245/246 shipped only part of the copy batch because the agent's process exited
  and I built on top without verifying each item. Lesson: require every agent to
  COMMIT + report its hash, and verify the hash (and the actual strings/behavior)
  landed before cutting a build. Builds 247+ were verified item-by-item.
- The reflection-card meta-leak was an emotional-safety bug that surfaced only on
  the empty-data path (new connections) - the worst moment for a hopeful user.
  Guard empty inputs AND validate model output before it reaches a human.
- Japanese second-person: do NOT mechanically add `あなた`; the language already
  reads second-person from the user's seat, and explicit pronouns feel clinical.

## Verification
- Builds 244-247 archived + uploaded (app + extension build numbers verified
  equal before each upload). Build 247 reviewed (self-review after the review
  agent died): tsc 0 new errors, all 3 locales parse, no first-person left in
  en/vi prompts, reflect-card removal gated, carousel index-clamp safe, nav props
  version-correct.
- Backend: #522/#537/#538/#539 all merged to staging with passing CI and
  deploy `conclusion: success`; 39/39 (mood) + 8/8 (prompt) + 36 (safety) unit
  tests; compassion-review 10/10 on the two prompt changes.
