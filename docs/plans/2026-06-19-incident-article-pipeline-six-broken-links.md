# Incident (RESOLVED): staging research-article pipeline dead — six chained failures

**Date:** 2026-06-19 (PDT). **Scope:** STAGING only (prod article generation stays off; prod untouched). **Status:** RESOLVED + verified end-to-end.

## TL;DR
A simple ask ("generate one richer-design article on astrovinh so I can review it") revealed the entire staging research-article generation pipeline was dead, and had been since roughly April (matches the long-standing "research articles stopped generating since April" note). It was not one bug. Six independent broken links sat in series, each hiding the next: every fix uncovered the layer behind it. All six are now fixed; a fresh article generates and persists with the full new design.

The richer-articles + persona-take feature shipped earlier in the session (viasr #501/#502, murror-api #481, web #109/#110) was real and correct, but it was built on top of an already-broken delivery path, so it appeared "shipped but inert" until the pipeline beneath it was repaired.

## The six links (in the order they were peeled back)

1. **Article RMQ consumer was OFF on staging.** viasr `lifetime.py` only starts the new-article consumer when `ENABLE_RABBITMQ_FOR_NEW_ARTICLE` (Statsig gate `trigger_new_article_generation_via_rabbitmq`) is enabled. The gate does not exist in the Statsig console, so Statsig returns Unrecognized=False, and this RMQ flag was deliberately NOT in `UNRECOGNIZED_USES_DEFAULT` (the non-prod rescue set), so it stayed OFF. `murror.ai.queue` sat at ~29 messages, 0 consumers.
   - Fix: added `ENABLE_RABBITMQ_FOR_NEW_ARTICLE` to the NON-PROD branch of `UNRECOGNIZED_USES_DEFAULT` (mirrors council/care_tips/voice_insights). Prod stays undefined=off. viasr PR #507. Pinned flag-set test updated.

2. **Staging Celery worker connected to PRODUCTION Redis.** `REDIS_ADDRESS` for staging was hardcoded to `murror-redis-master.nsp-prod-murror` (staging never had its own Redis). Cross-env contamination (see [[incident_celery_cross_env_contamination]]).
   - Fix: deployed a real staging Redis (`redis-murror` in nsp-staging-murror-ai), patched the staging config-map `REDIS_ADDRESS` to it, updated the GitHub Actions staging env var so future deploys keep it, restarted the worker. Prod Redis untouched. (atlas, live + config; durable via helm values).

3. **Persona take never generated on the real (Celery) path.** PR #502 wired the persona take only into the HTTP route (`route.py::_run_article_generation`), but murror-api drives generation via the RMQ event -> Celery `generate_new_article_job`, which never called `generate_persona_take`.
   - Fix: murror-api now sends the user's `personaId` (camelCase `data.personaId`) on the `ARTICLE_GENERATION_REQUESTED` event (PR #483, in publishToAI + the stale-retry service); viasr parses `persona_id`/`personaId` in the consumer, calls the existing consent-gated fail-safe `generate_persona_take` in the Celery job, attaches `personaTake` to the response (PR #505).

4. **Circular import crashed viasr at boot.** Wiring #3 made `app/services/new_article/schema.py` import `PersonaTake` from `app.api.controller.article.schema`, whose package `__init__` imports the router, which imports `new_article.article_generation`, which imports the still-initializing `new_article.schema` -> ImportError -> CrashLoopBackOff (staging-f44a90a). Deploy-only crash (passes local import-order, fails at full app boot).
   - Fix: moved `PersonaTake` to a dependency-free leaf module `app/services/persona_take_schema.py`; the article schema re-exports it for back-compat. viasr PR #506.

5. **murror-api's `ai.article.response` consumer was never registered.** `ArticleResponseController` had the correct `@MessagePattern('ai.article.response')` and the exchange/queue/routingKey matched viasr exactly, but the controller was NOT in any module's `controllers` array (and `ArticleResponseHandlerService` not in providers), so NestJS never instantiated it -> the RMQ server had no handler -> every article result was NACKed "An unsupported event was received ... Pattern: ai.article.response" (requeue=false) and dropped. This is the NACK the bug report quoted.
   - Fix: registered `ArticleResponseController` + `ArticleResponseHandlerService` in `ArticlesModule`; routed the COMPLETED branch through `HandleAIResponseUseCase` (which persists body + personaTake via `aggregate.complete(...)`); added `personaTake` to the completed-event type. murror-api PR #484. (NestJS gotcha cousin of [[reference_nest_authguard_module_import]]: a controller only handles messages if its module is in the microservice context.)

6. **viasr generated the article then threw it away.** The Celery completion handler called the DEPRECATED no-op `NewArticleGenerator.save_to_db` (a stub that logs "deprecated" and returns) instead of publishing. So the full article (body + callouts + personaTake) was generated and then dropped: no RMQ COMPLETED publish, no HTTP-bridge POST. Proven live: worker logs "succeeded ... COMPLETED" + "Persona take generated", then zero outbound delivery to murror-api.
   - Fix: completion handler now publishes the COMPLETED `NewArticleGenerationResponse` (carrying personaTake) via `NewArticleGenerationProducer.send_response` to exchange `murror.article.response.direct` / routingKey `ai.article.response`; FAILED also publishes (no longer silently dropped); publish errors logged not fatal. viasr PR #508.

Plus a content follow-on (not a pipeline link): the model dropped the `:::didYouKnow` callout on one generation. Strengthened the article prompt so all three callouts (`:::keyTakeaway`/`:::didYouKnow`/`:::reflect`) are mandatory. viasr PR #509.

## Verification (live, staging)
Fresh article `cmqlbaewu0007ss07xhv5q1yg` (user astrovinh, persona minh-niem): 599-word body, all three callout directives present, `personaTake` populated (minh-niem, book "Hiểu Về Trái Tim"). Six-link chain proven via logs: murror-api emits generate (with personaId) -> viasr consumer ON -> Celery generates + persona take -> viasr publishes COMPLETED via send_response -> murror-api ArticleResponseController receives (no NACK) -> repository saves. Images: murror-api 0.120.0-staging, viasr staging-587635d.

## Lessons
- A feature can be fully built + unit-tested + "deployed" and still be 100% inert if the pipeline it rides was already broken. Verify E2E on the REAL transport, not just unit tests, before calling a cross-service feature done.
- Two viasr article paths exist (HTTP route.py vs RMQ/Celery). murror-api uses the RMQ path. Wire features into the path that production actually uses, and confirm which one that is first.
- A NestJS `@MessagePattern`/`@EventPattern` handler does nothing unless its controller is in a module loaded by the microservice context. "Unsupported event ... negative acknowledged" = no registered handler for that pattern.
- "Deprecated no-op left in the hot path" is a silent killer: `save_to_db` logged "deprecated" and returned, so generation looked successful while delivery never happened.
- RMQ-pipeline feature flags default undefined=off by design; enabling on non-prod = add to the non-prod `UNRECOGNIZED_USES_DEFAULT` block (council/care_tips pattern), never prod.
- Cross-env Redis (staging worker -> prod Redis) recurs; staging needs its own Redis. See [[incident_celery_cross_env_contamination]].

PRs: viasr #505 #506 #507 #508 #509; murror-api #483 #484. See [[project_richer_articles]].

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
