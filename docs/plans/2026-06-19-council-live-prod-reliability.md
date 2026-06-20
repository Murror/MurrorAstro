# 2026-06-19 (eve) — Council of Advisors live in production + reliability fixes

## Context
Following the prod/alpha promotion earlier in the session (see
2026-06-19-prod-promotion-council-redeem.md), council was deployed everywhere but
the prod backend gate was still off. This documents enabling it for prod users
and the two reliability fixes that followed.

## What shipped (viasr-api, all on staging -> production branch -> deployed prod-4080575 + alpha)

### 1. Council enabled in production (PR #511, commit 765438e)
- The `STATSIG_API_KEY` in viasr secrets is a SERVER key, not a console key, so
  the council_enabled gate could not be created/enabled via the Statsig Console
  API. Enabled it in code instead: moved `COUNCIL_ENABLED` from the
  non-production-only `UNRECOGNIZED_USES_DEFAULT` block into the base set
  (app/core/feature_flag/feature_flag_name.py) so an UNDEFINED Statsig gate falls
  back to the ON default in every environment (council is pull-only, no
  background consumer). A council_enabled gate can still be created in the Statsig
  console later as an OFF kill-switch (console value then wins).
- Verified on prod: log `council_enabled is not defined in Statsig
  (reason=Network:Unrecognized); using code default True`, advisors seated.
- murror-api does NOT gate council itself (passes through whatever viasr returns),
  so the viasr flag is the only switch.

### 2. Tolerate stringified `merged` (PR #512, commit d689dea)
- Symptom: council came back fully empty ~50% of the time in prod. Cause: Claude
  haiku intermittently returns the new `merged` single-voice object as a JSON
  STRING in its structured/tool_use output, which failed strict CouncilResponse
  validation inside allm_request and dropped to the (often exhausted) fallback
  chain (Gemini disabled) -> empty council.
- Fix: a `mode="before"` field_validator on `CouncilResponse.merged`
  (app/services/council/schema.py) that json.loads a string into the nested
  object (and falls back to the empty merged body for blank/unparseable/None).
  21/21 council tests pass (2 new).
- Verified: council rendered 5/5 after (advisors always seated), but the merged
  paragraph itself was still blank ~2/5 -> led to fix 3.

### 3. Raise council max_tokens 2200 -> 4096 (PR #513, commit 4080575)
- The merged synthesis is Part 2 of the generation (emitted AFTER the per-advisor
  takes). A full council is ~1700 output tokens, so a verbose run at the 2200
  ceiling filled the takes then truncated `merged` (the web's primary display) to
  empty. Raised `_MAX_TOKENS` to 4096 (app/services/council/service.py) for
  headroom so both parts finish on the primary path. On-demand + cached, so paid
  at most once per entry.

## Verification (prod, murror-ai.api.ambercare.app POST /council)
- 8 calls: advisors populated 8/8; merged single-voice populated 7/8. The only
  miss was the cold first call right after the pod became ready (racing the
  fire-and-forget corpus warmup); steady-state calls 2-8 were 7/7. Even on the
  cold call, the per-advisor takes render, so a full council always shows.

## Gotchas
- A `git stash pop` onto an advanced origin/staging left conflict markers that
  got committed + pushed (PR #511) because `git add` staged the unmerged files.
  Fixed by resolving the markers + `git push --force-with-lease`. Prefer commit
  + cherry-pick over stash when the base has moved.
- Backticks in a double-quoted `git commit -m "..."` are command-substituted by
  bash and silently dropped from the message. Use single quotes (or `-F`).
- Council primary model is Claude haiku; it is weak on deeply-nested structured
  output (the merged object). Follow-ups, if the merged display matters more:
  stronger primary tier and/or prompt tightening; warm the corpus before the
  first call to avoid the cold-first-call blank.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
