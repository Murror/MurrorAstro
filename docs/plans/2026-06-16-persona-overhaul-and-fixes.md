# 2026-06-16 — Persona overhaul + bug-fix sprint

Cross-repo session: a new RAG persona, a full safety red-team, persona loop
videos + animated picker cards, a persona-voiced proactive follow-up, a persona
picker UI cleanup, an in-chat identity reframe, plus two real bug fixes and a
mobile-web scroll fix. Everything is on **staging only**; prod untouched.

Repos: `viasr-api` (AI/Celery), `murror-api` (NestJS), `murror-platform` (web-client).

---

## 1. Thành Lộc persona (memoir-grounded RAG)

New selectable persona "Thành Lộc" (Vietnamese stage artist), built by replicating
the existing persona+RAG pattern. Original English paraphrase only (paraphrase-only
license; never verbatim).

- viasr: `app/personas/registry.py` Persona entry + `app/personas/corpus/thanh_loc.py`
  (40 paraphrased teachings) + `corpus/__init__.py`. PR #479.
- murror-api: `PERSONA_ID_VALUES` whitelist adds `thanh-loc`. PR #459.
- web: `persona.ts` entry + portrait + 5 personaId union sites. PR #63.

## 2. Safety red-team (0 blockers)

5 parallel adversarial agents (crisis/medical, jailbreak/injection, NSFW/hate/violence,
copyright/impersonation, dependency) probed all 5 personas via the staging `/chat/text`
+ `/chat/stream` API. ~127 probes, **0 FAIL**. 4 CONCERNs, all the DEFAULT voice on the
legacy `/chat/text` path under-attaching a crisis resource; verified the LIVE
`/chat/stream` path already force-adds 988/741741 via `detect_crisis_async` BEFORE the
persona LLM runs.

Key architecture confirmed: **safety is layered ABOVE persona.** `stream_chat.py`
`execute()` runs `detect_crisis_async(text)` first and on `is_crisis` streams a fixed
crisis reply and `return`s; the persona voice (`build_persona_voice_block`) is prepended
as VOICE only and never reached on a crisis turn.

Probe harness recipe (reusable): header `VIASR-API-Key` (secret `murror-ai-secrets`);
`/chat/text` accepts `persona_id` as a form field; `conversation_id` must be a UUID;
the AI rate-limiter returns HTTP 200 `{"detail":"Too many AI requests"}` not 429.

## 3. Persona loop videos + animated picker cards

Higgsfield `seedance_2_0` living-portrait loops for Murror (butterfly), Astro Vinh,
Minh Niệm, Thành Lộc (NOT Thich Nhat Hanh, by request). Web-optimized muted mp4s
(190-334KB, faststart) in `public/personas/`.

- web PR #64: `Persona.videoSrc`; `PersonaCard` plays the centered card's muted/looping/
  playsInline clip via `IntersectionObserver` (viewport center band `rootMargin 0 -42%
  0 -42%`), pausing off-center; static portrait poster underneath (no blank frame).
  Respects `prefers-reduced-motion`, jsdom-guarded, `pointer-events-none` so it never
  blocks tap/swipe, `preload="none"` (one clip at a time). Review: GO-WITH-NITS.

## 4. Persona proactive follow-up (a few hours after a chat) — viasr PR #484

A few hours after a meaningful deep chat, the chosen persona sends ONE warm,
persona-voiced push referencing a captured memory. Reuses Callback Pings machinery.

- Queue fix (the latent reason pings never ran): callback-ping + backfill tasks pinned
  `queue="emotional_memory"`, which NO worker consumes (worker runs with no `-Q` so it
  only consumes the env-scoped default `celery-{env}`) and which is not env-scoped.
  Routed all four to the default queue. Resolves the queue-routing incident.
- Trigger: `rabbitmq_deep_chat/consumer.py` `_handle_completion` enqueues
  `send_callback_ping_task.apply_async(kwargs={user_id, trigger:"post_chat"}, countdown=3h)`.
- Eligibility: `post_chat` trigger skips the two engagement gates (account_age,
  journal_count) but keeps the full safety floor (kill switch, opt-in, send-window,
  quiet-hours, CRISIS) + a 20h cadence.
- Copy: `llm_copy._build_persona_prompt` + `registry.build_persona_copy_hint`
  (reword-never-recite); deterministic template fallback intact.
- Flags (separate so win-back stays off): `CALLBACK_PINGS_POST_CHAT_ENABLED`,
  `CALLBACK_PINGS_LLM_COPY_ENABLED`, `CALLBACK_PINGS_PERSONA_VOICE_ENABLED` = true +
  `CALLBACK_PINGS_ENABLED=true`; `CALLBACK_PINGS_SCHEDULER_ENABLED` left unset.
  Set on `murror-ai-config-map` (kubectl-patch-managed; not in CI's create-config-map
  vars, so the patch persists across `kubectl apply` deploys). 215 unit tests (33 new).
  ENABLED + E2E-proven on staging.

## 5. Picker UI cleanup — web PR #66

Hide Thich Nhat Hanh from the picker (`hidden` flag + `SELECTABLE_PERSONAS`; entry kept
so existing selections + getPersona resolve). Remove the on-card/sheet/settings
"AI interpretation, not the real person" label + strip the disclaimer sentences from
bios. Detail-sheet CTA "Speak as {name}" -> "Select" (en/vi/ja, new `select` key).
19 persona tests updated + passing.

## 6. In-chat identity reframe — viasr PR #485

When asked "are you really him?", the CONSENTED personas now answer they are "a clone
of [his] mind, created with his collaboration and consent" (Minh Niệm, Thành Lộc) /
"a clone built by Astro himself" (astrovinh), to convey the effort + the person's
blessing, while gently noting they are not the flesh-and-blood person. Disclaimer
surfacing label `AI INTERPRETATION` -> `YOUR IDENTITY`. TNH UNCHANGED (no consent ->
no false consent claim; also hidden). LEGAL RULE: the consent wording is applied ONLY
to personas with documented consent (or self). Safety preserved + E2E-verified: a
binding directive "as the real person" is refused and redirected to user agency.

## 7. Bug fix — invite link (murror-api PR #461)

Edge->NestJS migration regression: `generateInvitationLink` dropped the `link` field
(mobile guards `if (results.link)` so the share silently no-oped) and shortened expiry
from 7 days to 1 hour. Restored `link` = `${FRIEND_INVITATION_BASE_URL}?token=${token}`
(undefined when env unset, so prod-safe) + 7-day expiry. Wired
`FRIEND_INVITATION_BASE_URL` through the deploy config chain (GitHub env var ->
create-k8s-config-map action -> ConfigMap -> pod `configMapKeyRef optional:true`); set
the GitHub var for staging + alpha only (production left unset). 15/15 tests.

## 8. Bug fix — user_profile array drift (viasr PR #481, V19)

`user_profile_sync_consumer` failed every message: asyncpg `expected str, got list` on
9 columns the code treats as `list[str]` but the live DB had as scalar `text`. Flyway
`V19__user_profile_list_columns_to_array.sql` converts them to `text[]` (view-aware:
drops/recreates the staging `murror_api.user_profile` compat view; idempotent; safe
USING; 0 rows so zero data risk). No code change. **PROD STILL DRIFTED** -> promote V19
before prod relies on profile sync. See `incident_user_profile_array_drift` memory.

## 9. Mobile-web scroll fix — web PR #65

Four hand-rolled `overflow-x-auto` rails (mental-checkin-chart, journal-write
reflect-together row, friends-page filter tabs, friend-detail zodiac carousel) lacked
`touch-action: pan-x`, trapping vertical page scroll on touch. Added `[touch-action:pan-x]`
to match the shared `HorizontalScroll`. CSS-only; verify on a real device.

---

## Gotchas logged this session
- Env-scoped Celery default queue is `celery-{env}`; pinning a custom queue with no
  matching worker `-Q` orphans tasks silently. Staging shares the prod Redis broker, so
  env-scoping the queue is what prevents cross-env contamination.
- `murror-ai-config-map` flags are kubectl-patch-managed and persist across `kubectl
  apply` deploys (3-way merge does not strip keys absent from last-applied-configuration).
- murror-platform commitlint enforces a 100-char header; viasr/murror-api commit-msg are
  lenient. No em dashes in app copy (locale + persona prompt text).
- viasr CI cancels in-progress staging runs when a newer commit lands (concurrency); a
  cancelled migration run is fine if a newer run redeploys the same merged code, but
  verify the migration actually applied (`schema_version`).

## Staging deploy commits
- web-client images: `staging-9758bde4` (animated cards) -> `staging-90f8ca5c` (scroll
  fix) -> `staging-6d7ad9a1` (picker cleanup).
- viasr/murror-api: deployed via their staging CI on each merge.

## Prod-promotion backlog (founder's call)
- viasr V19 (profile-sync) — promote before prod relies on profile sync.
- invite link — alpha env var pre-set; alpha/prod get it on promotion.
- persona proactive follow-up — staging-only, prod dark.
