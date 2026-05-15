---
name: Anthropic API constraints + gotchas hit during 2026-05 sprint
description: Specific Anthropic API behaviors that caused production bugs - empty content rejection, trailing whitespace rejection, 1M context beta org-gating, prompt caching cache_control. Reference for future Anthropic SDK work.
type: reference
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
## Constraint 1: User messages must have non-empty content

```
anthropic.BadRequestError: Error code: 400 - {'error': {'message': 'messages.0: user messages must have non-empty content'}}
```

If you build a `messages` array where any user message has empty `content`, Anthropic rejects with 400. Hit on 2026-05-07 because T9 fire-and-forget user-message storage created a race: history fetch ran before the create_task flushed to Redis, so the LLM call sent a user message that hadn't propagated.

**Fix pattern:** explicitly append the new user message to the messages array before send, don't rely on storage round-trip:
```python
history = self._get_history_prompt(chat_history=chat_history)
if not history or history[-1].get("role") != "user" or history[-1].get("content") != text:
    history.append({"role": "user", "content": text})
```

Reference: `viasr-api/app/services/deep_chat_stream/application/use_cases/stream_chat.py` (PR #414).

## Constraint 2: Assistant messages cannot end with trailing whitespace

```
anthropic.BadRequestError: Error code: 400 - {'error': {'message': 'messages: final assistant content cannot end with trailing whitespace'}}
```

Any assistant message in the array ending with a space, newline, or tab triggers 400. Hit on 2026-05-06 because stored AI replies had trailing whitespace from streamed token concatenation.

**Fix pattern:** rstrip every assistant message before sending to API:
```python
if m["role"] == "assistant" and isinstance(m["content"], str):
    stripped = m["content"].rstrip()
    if stripped:
        msgs.append({**m, "content": stripped})
```

Reference: `viasr-api/app/utils/claude_request.py:_build_messages_and_system` (PR #412).

## Constraint 3: 1M context beta is org-gated

Adding `ANTHROPIC_BETAS=context-1m-2025-08-07` to `~/.claude/settings.json` (or as env var) causes EVERY Anthropic API call to fail with:
```
{"type":"error","error":{"type":"invalid_request_error","message":"The long context beta is not yet available for this subscription."}}
```

**This blocks ALL Agent dispatches** in Claude Code (because Agent uses Anthropic API). Hit on 2026-05-08 — Astro asked to enable 1M context, we added the env var, then ALL parallel agent dispatches started failing.

**How to apply:** Do NOT add the 1M beta env var unless explicitly confirmed the Anthropic org has Tier 4 / 1M context access enabled. Symptoms when wrong:
- Agent dispatches fail with "long context beta is not yet available" 400
- Other Anthropic calls (model.create, etc.) also fail
- Claude Code session itself may continue working if it has its own routing

**Removal:** edit `~/.claude/settings.json`, drop the `ANTHROPIC_BETAS` key from `env`, save. Takes effect on next session restart (in-flight session still has the old env until new session loads).

## Prompt caching (works, ALREADY enabled in viasr-api)

`cache_control: {"type": "ephemeral"}` on system text gives 90% input cost savings on cache hits within 5-min TTL. Enabled when `prompt_cache_key` is passed to `aclaude_request`. Per-user cache key: `hashlib.md5(user_id.encode()).hexdigest()[:16]`.

Verify cache hits via Anthropic response headers / logs:
- `cache_read_input_tokens > 0` = cache hit
- `cache_creation_input_tokens > 0` = first call, primed cache

Reference: `viasr-api/app/utils/claude_request.py:73,222` and `stream_chat.py:572`.

## Models in use (as of 2026-05-08)

- `model_complex_task: claude-sonnet-4-6-20250929` (chat hot path) — bumped from `claude-sonnet-4-20250514` for ~30-40% TTFT improvement on the same prompts
- `model_medium_task: claude-haiku-4-5-20251001` (medium-complexity tasks)
- `model_simple_task: claude-3-5-haiku-20241022` (simple tasks)
- File: `viasr-api/app/components/environment/config.py:110-117`
