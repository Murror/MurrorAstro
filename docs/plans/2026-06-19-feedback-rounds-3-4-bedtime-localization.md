# 2026-06-19 (pt 2) — Feedback rounds 3 + 4, article-pipeline repair, bedtime, localization

Continuation of the same staging-feedback day (earlier part:
`2026-06-19-staging-feedback-richer-articles-chat-voice.md`). All staging only;
prod untouched. Subagent-driven, isolated worktree per task, diffs reviewed
before commit/PR.

## Feedback round 3 (web)
- **#112** council: restored the "What the council thinks" section title (new `web.pages.entryDetail.council.mergedTitle`, Overline) + "Write to {name}" care-tip CTA -> "Reach out".
- **#113** mental check-in graph: per-level gradient fills matching mobile `chart-view.tsx` + tapping a bar opens `/mental-test/result` (new page reusing the shared TestResult card; PHQ-9/GAD-7 band derivation). Mobile parity.
- **#114** save-draft regression fix: a mid-conversation draft was saved but invisible on return because `conversationMode` is local state that resets to false on remount. Derive `isConversation = conversationMode || messages.length > 0` so a restored server thread re-enters conversation mode. Red/green test mirrors the real user flow.
- **viasr #504** Learning card reworked to teach the science: each learning weaves a named psychology concept + plain definition, an honest research-informed point (no fabricated studies/stats), and a realistic angle that names the downside (not toxic positivity). Same schema, no migration. (deep-chat wrap-up `learning` prompt.)
- Dive Deeper persona attribution: confirmed PR #108's `GroundedInAvatars` already satisfies it; Astro's design call = keep the top cluster as-is (no per-block lines).

## Article pipeline repair (the big one) — see the dedicated incident doc
Generating one richer-design article for review revealed the staging research-article
pipeline was dead (since ~April). SIX chained failures, each hiding the next. Full
write-up + lessons: `2026-06-19-incident-article-pipeline-six-broken-links.md`.
Summary of fixes: viasr #505 (persona take on the Celery path), #506 (circular-import
boot crash -> PersonaTake leaf module), #507 (enable new-article RMQ consumer on
non-prod), #508 (publish COMPLETED instead of the dead `save_to_db` no-op), #509
(make all three callout blocks mandatory); murror-api #483 (send personaId on the
generate event), #484 (register the `ai.article.response` consumer + persist
personaTake). Infra: deployed a real staging Redis (`redis-murror`) + repointed the
staging Celery worker off prod Redis. VERIFIED E2E: article `cmqlbaewu0007...`
(astrovinh/minh-niem) = 599-word body, all 3 callouts, persona take (book "Hiểu Về
Trái Tim"). Images murror-api 0.120.0-staging, viasr staging-587635d.

## Bedtime stories
- **viasr #510** disable background music for all bedtime story types. Bedtime story =
  the voice summaries (daily/weekly/milestone). Daily + weekly were already
  music-free (ambientUrl=""); only milestone voice still generated a tier ambient
  track. Guarded behind `BEDTIME_AMBIENT_MUSIC_ENABLED=False`. Narration unchanged;
  no other ambient-music consumers; also removes an ElevenLabs sound-gen call + upload
  per milestone (cost down).

## Feedback round 4 (web)
- **#115** carousels: one shared `CarouselArrowButton` (the For Us arrow style) now used
  by For Us + home rails + the persona picker (was two divergent styles); all rails use
  `touch-action: pan-x` + `overflow-y-hidden` + `overscroll-x-contain` so vertical page
  scroll always wins on mobile (no more carousel scroll-trap). Persona picker gained
  arrows; zodiac rail hardened.
- **#116** settings: de-boxed the Get Help + Settings header controls (icon + label only,
  border/glass box removed); added a Resources settings row -> https://murror.app/resources/
  (new tab, BookOpen icon, en/vi/ja labels).
- **#117** localize article branded-callout labels (Key takeaway / Did you know / Reflect)
  for vi/ja (were hardcoded English in the web markdown renderer; `renderMarkdown` takes
  optional `calloutLabels`, defaults to English for other callers) + fix a JA clinical
  disclaimer string. Audit finding: the locale DICTIONARIES are 100% key-parity; the real
  gap is hardcoded strings (next item).
- **#118** localization hardcoded-string refactor: wired ~14 older components through
  react-i18next (settings: cancel-subscription/password/subscription/account/ai-tone/
  persona-selector + journal-persona-switcher; reflection: streak-stats/mental-checkin/
  mood-checkin; home/common: crisis-resources-panel/voice-bedtime/murror-ai-shortcut/
  murror-bubble/avatar-circle). ~107 strings -> t(); ~80 new `web.*` keys in en/vi/ja
  (incl. streak day/days plurals); reused existing keys where present. Fixed the
  "ACCESSMENT" -> "ASSESSMENT" typo. Crisis phone numbers + resource names untouched.
  0 missing keys, tsc clean, 59 tests pass.

## Family plan paywall (item 3 of round 4) — roadmap only, NOT built
Astro chose roadmap-only. Key clarification: the Apple/Google anti-steering "no in-app
purchase link" constraint applies to the NATIVE apps, NOT the web app, so a web paywall
family CTA is fine (it is the web-first purchase the design intended). The only blocker
for a priced card is a RevenueCat family product + price (web pricing is read live from
RC). Roadmap: (1) add the web paywall family card -> existing web family flow; (2) create
the RC family product/price (suggested ~$29.99/mo for 5 seats vs $16.99 individual);
(3) for real 13-17 purchases: wire a real email provider for parental consent + attorney
ToS/Privacy sign-off. See [[project_family_plan_design]].

## Deploy / verification
- Web staging: build-web-client.yml (env=staging) -> `kubectl set image deployment/web-client`.
  Final bundle `index-IcAS7yYH`.
- viasr + murror-api auto-deploy on staging push. One viasr CI failure was a transient
  Debian apt-mirror network blip (re-ran); one viasr CrashLoop was the circular import
  (#506 fixed). Confirmed live mobile prod backend healthy + untouched throughout.

## Follow-ups
- Family plan: gated on Astro setting RC price + the consent/legal items.
- `didYouKnow` callout was being dropped by the model -> prompt now enforces all three
  (verify it holds across more generations).
- Article cost: richer articles ~3-4x output tokens; check daily token budget before prod.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
