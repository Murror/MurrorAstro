# 2026-06-19 — Staging feedback batch, richer articles, persona-take, chat voice

Continued staging-feedback sprint on web.murror.app (staging). All work shipped to
staging only; prod promotion remains a manual, human-gated step. Subagent-driven,
isolated worktree per task, diffs reviewed before commit.

## Reflection + quiz (verification + fixes)

- E2E-verified the connection-reflection / takeaway loop on staging (live API +
  pod logs): generate -> create PENDING -> receiver sees -> reflect back ->
  COMPLETED -> INSIGHT_READY summary card in ~6s, both sides + push. Clean.
- **murror-platform #104** `f0ae997e` — fix: reflect-back never completed the
  takeaway when the receiver reflected in CONVERSATION mode (the completeTakeaway
  call only lived in submitDirectly, not handleSaveConversation). Sender stayed
  PENDING forever. Extracted shared `completeReflectTakeaway` helper used by both
  paths (conversation path uses conversationId as the receiver entry id).
- Quiz flow verified working on staging (Connections -> friend -> For Us -> Take
  the quiz; daily-rotating two-sided task; insight needs both partners).
- **murror-api #480** `90dfd7a` — fix: quiz answer submission made idempotent per
  user/day. A duplicate submit was re-firing the partner poke push AND re-triggering
  individual-reflection AI gen, and re-stamping answeredAt. Guard reads the per-day
  relationshipUserProgress inside the existing FOR UPDATE tx; returns idempotent
  2xx with `alreadyCompleted: true` (no 409, so web needs no change). No migration.

## Staging-feedback batch (web)

- **#105** `bec6654a` — Save draft persistence: Save and exit share one persistDraft()
  path; written to localStorage so an unsubmitted composer survives navigation,
  reload, and leaving the site. Restores text+connection+prompt; clears on submit
  (submittedRef latch). New `journal-draft-storage` util.
- **#106** `8684f91c` — Dive Deeper: removed the `(N)` count badge; capitalized
  titles use the existing Overline component.
- **#107** `d9c9d5fb` — Research article header image gets `rounded-3xl` to match the
  summary page hero.
- **#108** `0b7abfbf` — Dive Deeper persona avatars: `GroundedInAvatars` cluster
  ("grounded in {names}" + small avatars) at the top of Dive Deeper, sourced from
  council.advisors. Keeps the merged narrative; excludes hidden persona; empty-safe.
  Design call later confirmed: keep as-is (no per-block lines).

## Richer research articles (Phase 1 + 2, 3 repos)

Contract: branded callout directives `:::keyTakeaway` (cyan) `:::didYouKnow` (purple)
`:::reflect` (blue) in the markdown body; persona take as a separate camelCase field
`personaTake {personaId, text, book}`.

- **viasr #501** `810fcd0` — generation prompt rewritten for ~600-900 word articles
  (intro hook, 3-4 sections w/ examples + an evidence point, reflective close) and
  emits one each of the three callout directives. max_tokens 4096 -> 8000. VI
  translation preserves markdown structure + ::: fences. (~3-4x output token cost.)
- **#109** `7de3ab22` — web Marked extension renders the callouts as branded
  left-accent blocks; still DOMPurify-sanitized (no allowlist widening); old
  articles + unknown directives degrade gracefully.
- **viasr #502** `da914e9` — generate a persona take per article in the user's
  selected persona voice via `build_persona_voice_block_with_rag_grounded`; one
  bounded fail-safe LLM call; consent-gated (reuses council CONSENTED_ADVISOR_IDS;
  excludes hidden persona + default). personaId in -> personaTake out.
- **murror-api #481** `198ec41` — nullable `persona_take` JSONB column on
  user_articles (idempotent migration, public schema, lands with code). Accept on
  webhook, persist, echo on GET/list. Sends target user's User.personaId on the
  viasr generate request. Backward-compatible; legacy RMQ completion path untouched.
- **#110** `a0029d17` — web "What [persona] thinks" card at the end of the article,
  reusing AttributedTake (green accent). Renders nothing when absent/unknown/hidden.

Note: persona-take card only populates on NEWLY generated articles for persona
users (existing articles have personaTake null).

## Chat voice (real-user feedback)

- **viasr #503** `bf7f40d` — deep-chat replies were repetitive ("That's a real X to
  feel good about" every turn), relentlessly positive, and stacked two questions.
  Reworked both chat paths (live SSE stream_chat + legacy /chat/text) + default tone
  + YAML base: lead with the persona's own honest reflection (hook early), vary
  openings, warm AND honest (gentle challenge for growth), <=1 question often none,
  emoji sparingly. Pain carve-out + crisis path + persona voice + consent untouched.
- Live-verified on staging via /chat/stream: 6 replies (default + Minh Niem) over
  the screenshot conversation showed varied openers, <=1 question (one at zero),
  reflection-led, zero emoji, honest moves; crisis message still fired the hardcoded
  988/741741 response.

## Mobile carousel arrows (web)

- **#111** `f7777e7c` — mobile scroll-trap fix: shared `CarouselArrows` control (For
  Us arrow style, drives the existing HorizontalScroll rail via scrollBy) added to
  the home Moments to Care, Research, and My Diary rails. Arrows hide when nothing
  overflows, disable at ends. The rails already had `touch-action: pan-x` so vertical
  scroll falls through; arrows are the explicit no-swipe affordance. Additive.

## Deploy / verification

- Web staging deploys: build-web-client.yml (workflow_dispatch, env=staging) then
  `kubectl set image deployment/web-client ... -n nsp-staging-murror`. Final bundle
  index-6zw_atLu.
- viasr + murror-api auto-deploy on staging push; murror-api Deploy ran the
  persona_take migration (image 0.117.0-staging). All pods 1/1 Running.

## Open / follow-ups

- Persona-take card needs a freshly generated article (persona user) to be visible.
- Richer articles cost ~3-4x output tokens; check daily token budget before prod.
- Carousel smoothness + mobile scroll best confirmed on a real device.
- Whole batch is staging-only; prod promotion is the user's manual call.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
