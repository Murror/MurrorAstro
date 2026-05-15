---
name: Recurring "reflection stuck at generating" pattern (RESOLVED 2026-04-15)
description: Root-cause analysis of why deep-chat reflection completion keeps breaking across the past month, with the specific RMQ wiring fragility that causes recurrence
type: project
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## The recurring symptom (user-facing)

> "Single reflection is stuck at generating, final state never shows"

Reported **at least 4 times** in the past month (Apr 4-5, Apr 6, Apr 7, Apr 15). Each time "we fixed it and it came back." Same surface symptom, **different underlying cause every time**.

## Why it keeps coming back

The deep-chat → reflection pipeline has **many points of failure in the RMQ wiring**, and each class fails with the identical user-facing symptom. Every env change / deploy / config drift can trigger a different one of these:

| Failure class | Effect | How it was hit historically |
|---|---|---|
| **vhost mismatch** | 100% of messages lost (producer and consumer in different vhosts) | **2026-04-15** — murror-api was pointing at `murror-dev`, viasr-api at `murror-staging`. Likely wrong since staging setup day one. |
| **Duplicate NestJS consumers round-robin** | 50% message loss (half go to internal server consumer that has no handler) | **2026-04-06** — fixed by polling `conversation_wrapup` table directly instead of relying on RMQ response. |
| **Stale consumers after pod restart** | N% loss based on how many zombie connections CloudAMQP keeps alive | **2026-04-04/05** — "Permanent fix still needed" in old memory. Workaround: manual queue purge + pod restart. |
| **FK violation blocks message persistence** | Conversation has no messages in PG → wrapup has empty input → summary fails | **2026-04-15** — murror-api upserted conversation AFTER stream instead of before. |
| **Prisma enum casing mismatch** | findUnique throws on reading messages with "user" vs "USER" | **2026-04-15** — Prisma declared USER/AI, viasr wrote user/openai. Fixed with `@map()` per enum value. |
| **PgBouncer prepared-statement cache stale** | Wrapup queries fail with `__asyncpg_stmt_f__ does not exist` | **2026-04-15** — asyncpg engine missing `statement_cache_size=0`. |
| **Missing Supabase buckets** | Voice/artwork uploads fail, which cascades into partial completion | **2026-04-15** — 3 voice buckets missing on staging. |
| **AI message never persists to PG** | Summary generated from user-only conversation history | **Still not fully fixed.** asyncio.shield attempted; didn't work because the generator is cancelled BEFORE reaching the await. |

## What worked in the past and is still in place

These are the cumulative defenses built over multiple sprints. All of these must stay working or the symptom returns:

1. **[murror-api] `/deep-chat/conversations/:id/complete` polls `deepChatConversation.status` for 90s** instead of listening for RMQ response. Added 2026-04-04 (`46def01`). Bypasses the unreliable response queue.
2. **[viasr-api] Consumer writes completion data directly to `murror_api.deep_chat_conversations`** via raw asyncpg with `statement_cache_size=0`, bypassing SQLAlchemy/PgBouncer. Added 2026-04-06. Current code at `consumer.py:507`.
3. **[viasr-api] Consumer also writes to `public.conversation_wrapup`** — legacy fallback path. Still in place.
4. **[murror-api] DiaryEntry auto-created on status → COMPLETED transition.** PrismaConversationRepository.save(). Added 2026-04-04 (`fbd0379`).
5. **[murror-api] `createConversation` upserts the conversation row BEFORE calling viasr-api stream.** Added 2026-04-15 — required because viasr writes messages with FK to the conversation.
6. **[mobile] `useCompleteConversation.onSuccess` invalidates DIARY_ENTRIES_QUERY_KEY.** React Query refetches after completion.

## Permanent prevention checks

Every time we touch staging or create a new env, verify:

### Config parity check (the one that would have caught today's bug)

```bash
# murror-api and viasr-api MUST be on the same RabbitMQ vhost
API_VHOST=$(kubectl -n nsp-staging-murror get secret murror-api-secret -o jsonpath='{.data.RABBITMQ_URL}' | base64 -d | grep -oE '/[^/]+$' | tr -d '/')
AI_VHOST=$(kubectl -n nsp-staging-murror-ai exec deploy/murror-ai -- sh -c 'echo $RABBITMQ_VIRTUAL_HOST' | tr -d '\r\n')
[ "$API_VHOST" = "$AI_VHOST" ] && echo "OK: both on $API_VHOST" || echo "MISMATCH: api=$API_VHOST ai=$AI_VHOST"
```

### Consumer count check (catches stale-consumer recurrence)

```bash
# Each main queue should have exactly 1 consumer, no more, no less
kubectl -n rabbitmq exec murror-rabbitmq-0 -- rabbitmqctl list_queues -p <vhost> name consumers | \
  awk '$1 ~ /^murror\..*\.queue$/ && !/response|dlq/ { if ($2 != 1) print "DRIFT: " $0 }'
```

### E2E smoke test (definitive "is this working" check)

1. Create deep-chat conversation via POST `/deep-chat/conversations?lang=en`
2. Capture conversationId from response
3. POST `/deep-chat/conversations/:id/complete?lang=en`
4. Within 30s expect HTTP 202 with body `{data: {status: 'completed'}}`
5. Verify DB: `murror_api.deep_chat_conversations` has `status=COMPLETED`, `done_at` non-null, `summary` non-null
6. Verify DB: `murror_api.diary_entries` has a row with `entry_id = conversationId`

If any step fails, check the config parity + consumer count first, THEN dig deeper.

## Today's specific fixes (2026-04-15, PR staging only)

- viasr-api `3ea1981`: set `updated_at=message.created_at` at INSERT (NOT NULL column was rejecting Python writes)
- viasr-api `9363dc8`: `statement_cache_size=0` + `prepared_statement_cache_size=0` on SQLAlchemy async engine (PgBouncer transaction mode)
- viasr-api `cd1e05a`: `asyncio.shield()` around AI message save (didn't help — generator cancelled BEFORE await)
- viasr-api `0d64169f` (current image): same as `cd1e05a`
- murror-api `70cd600`: upsert conversation BEFORE viasr stream (FK race fix)
- murror-api `06cb545`: Prisma enum `@map()` for lowercase DB values (`user`/`openai`)
- murror-api image: `feat-remove-legacy-dual-write-06cb545`
- Staging Supabase: created voice-insights / voice-milestones / voice-summaries buckets
- Staging K8s secret `nsp-staging-murror/murror-api-secret`: `RABBITMQ_URL` vhost patched `/murror-dev` → `/murror-staging` — **THE critical fix**

## Key learning

Every time this symptom recurs, the instinct is "fix the code." The actual root cause is almost always **config drift in the messaging plumbing** — not the business logic. Check config parity + consumer count before touching code.

Alpha + prod are on OLDER images that don't have today's race-condition fixes; but they also don't have today's vhost bug because those envs were set up before the staging-specific misconfiguration. Keep frozen.
