# 2026-06-23 — MurrorMobile catch-up: TestFlight builds 213 to 224 + backend fixes

**Context.** Continuous device-QA sprint bringing the native iOS app (MurrorMobile,
branch `staging-environment-setup`, scheme `MurrorMobileStaging`, env staging) to
parity with the web app and stabilizing it. Eleven device-QA rounds (builds 213 to
224) plus four backend fixes (murror-api x3, viasr-api x1) and one infra fix
(Tavily key). Each round = cluster the founder's feedback, fan out parallel
isolated-worktree agents (iris/sentinel/cortex/muse), review diffs, merge into
`staging-environment-setup`, typecheck gate (new-vs-baseline), bump
`CURRENT_PROJECT_VERSION` (staging app+ext only, never dev/prod 164), autonomous
archive + ASC API-key upload (no password). fmt consteval patch already in place;
zero new native deps all session.

## TestFlight builds shipped (all `MurrorMobileStaging`, MARKETING_VERSION 2.1.0)

| Build | Round | Highlights |
|---|---|---|
| 213/214/215 | pre-session restyle | chat restyle, repeat-bubble bug (real fix = synchronous `bubbleInserted` guard) |
| 216 | r3 | chat to web look, streaming pace/rainbow, council flag, draft-delete, connection pre-select |
| 217 | web-parity | TRUE web chat parity (compared the RIGHT web file `journal-write-page.tsx`): user messages = plain left text, AI = one bubble per reply; white text on dark blue gradient |
| 218 | r4 | persona-switch crash attempt 1, all chrome text white, picker above composer, unified 150ms streaming, glass chrome; viasr journal emoji prompts |
| 219 | r5 | removed persona video (wrong fix), draft-delete attempt, streaming snap-to-end, pill, bedtime sort |
| 220 | r6 | **persona freeze REAL fix (nested modals)**, restored video, chunked multi-bubble, **server force-discard draft**, butterfly nav |
| 221 | r7 | save-draft white, prompt pill + blank fix, bigger text, persona left, human-texting bubbles, connection flow nav, diary fixes, Add-Log CTA butterfly; + Giang PR #491 |
| 222 | r8 | chat avatar = selected persona, one avatar per turn, smooth card gradient, takeaway insight detail parity |
| 223 | r9+r10 | care-tip in For Us, insight quote/actions, sorting, poke gating, voice (state-vs-ref), HEIC photo upload, home empty-state templates; r10 solo prompt, dismiss-X, per-chunk streaming, journal web-card, research card, sign-in bg |
| 224 | r11 | **cross-account profile leak fix**, **voice REAL fix (speech-recognition permission)**, animated journal-summary loading, splash removed, moments CTA |

## Key root-causes (the hard ones)

- **Persona-switch freeze (3 attempts).** NOT the video. Two nested `<Modal>`s
  (picker modal contains PersonaDetailSheet modal); selecting tore both down at
  once leaving a stuck iOS dark scrim that blocked all touch. Fix: made the detail
  sheet an in-modal overlay (one modal). Restored the animated video (red herring).
- **Draft delete persisting (5 attempts).** Server `DELETE /current-draft` only
  soft-deleted an EMPTY draft (the #501 data-loss guard); a content-bearing draft
  survived and the app-startup/auth sync re-downloaded it. Fix: a `force` query
  flag on explicit confirmed discard (murror-api `50e9339`) + client passes
  `force=true` only at `onDiscardAndExist`. Automatic paths keep the guard.
- **Voice (4 attempts).** Real cause: on a fresh iOS install `react-native-permissions`
  `check()` returns `'denied'` (= not-yet-asked); the code only branched on
  `'blocked'`, so `request()` was never called and `Voice.start` ran without
  speech-recognition authorization. Native emitted `onSpeechError "not yet
  authorized"` which had no handler. Fix: request mic + speech perms before start,
  gate on GRANTED, register `onSpeechError`. Info.plist already had both keys.
- **Cross-account profile leak.** `['getProfile']` react-query key was global (not
  user-scoped) AND persisted to disk 7d; `completeAccountCleanup` only ran on
  logout, never on login. Fix: `isolateAccountOnLogin(newUserId)` wipes all
  per-account state (MobX stores, persisted+in-memory react-query cache, AsyncStorage
  allowlist) when the user id changes. 100% client-side; no server leak.
- **Streaming (many rounds).** Settled on: thinking-butterfly beat, then the chunk
  bubble streams word-by-word (MarkdownStreamingText), then next beat, then next
  chunk. Removed the three-dots. Single shared `STREAMING_WORD_DELAY_MS` (150ms).

## Backend fixes

- **murror-api `e7f24cd`** — `DomainException` mapped to opaque 500 (caught by the
  global filter catch-all, fired Sentry). Now maps to 400 + the real message. Fixes
  the poke "something went wrong" + every domain-rule path.
- **murror-api `50e9339` / `de332bb`** — force-discard a content-bearing draft on
  explicit user discard (see above). +unit test. E2E-reasoned: `findLatestResumable`
  (used by both DELETE and GET /me) filters `deletedAt:null`, so soft-delete hides it.
- **murror-api `dc5e4df`** — onboarding-complete now invalidates the user's `/me`
  cache via `UserProfileService.invalidateMeCacheForUser`. The 60s `/me` cache was
  never busted on completion, so an already-onboarded user could read a stale
  `isOnboardingCompleted=false` and get re-routed into onboarding. Per-module
  isolated in-memory caches + 1-3 pods mean cross-pod staleness remains bounded by
  the 60s TTL (shared-Redis cache store deferred per Astro). Name-on-resubmit left
  as-is (onboarding DTO has no name field; the new name was never sent to the server).
- **viasr-api `76c8af6`** — journal-analysis prompts (insights/perspectives/proposals,
  en+vi) now emit structured markdown + bullets + tasteful emojis so the "Within You /
  Mirror Perspective / Next Steps" sections render rich instead of a flat blob.

## Infra fix — Tavily (articles unblock)

Research articles were 100% failing at the Tavily web-search step ("exceeds your
plan's set usage limit"). Root cause: STAGING `murror-ai-secrets/TAVILY_API_KEY`
had drifted onto an old exhausted 41-char key while PROD already had the good
58-char key. Fix: patched the staging k8s secret to the good key (Astro provided
it), restarted `murror-ai-worker`/`-beat`/`murror-ai`, verified the worker can now
run `TavilyClient.search()` (2 results, no 429). Key lives ONLY in the live k8s
secret (not repo/CI), so it survives normal deploys but is not version-controlled.

## Notable: Giang PR #491 (`e861e16`)
Device API perf, invite live-updates, quiz/zodiac fixes, AI-reply streaming,
task-completion reliability. Merged into `staging-environment-setup`.

## Verification
- Every round: `yarn type-check` new-error delta = 0 (baseline ~9-20 pre-existing in
  untouched files); merges conflict-free; locale JSON validated.
- murror-api: `nest build` green, delete-draft jest 5/5, deploys green on `staging`.
- Tavily: worker `TavilyClient.search()` returns results in-pod.

## Gotchas / open
- **Hermes dSYM** upload warning on every TF upload (non-blocking); MUST fix before
  any PROD build or JS crash frames won't symbolicate.
- **Tavily** key is in a chat transcript (treat as exposed) + only in the live k8s
  secret (re-add if the cluster/secret is recreated).
- **Prod promotions deferred**: the murror-api backend fixes (poke 400, force-discard,
  /me cache) are on `staging` only; promote when a prod mobile build ships.
- **Web is the canonical localization source** (new standing rule); EN-only mobile
  keys are tolerated, mirror web for VI/JA.
- Bedtime story: configured + healthy on staging; only generates for users who had
  insights that day.
