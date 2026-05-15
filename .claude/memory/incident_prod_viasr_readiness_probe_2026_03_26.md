---
name: Incident (RESOLVED) — prod viasr-api stuck 0/1 for 33h (2026-03-26)
description: RESOLVED. Root cause: 2 uvicorn workers saturated by LLM requests → readiness probe timeout. Fixed by workers 2→4 + rollout restart. Key lesson: same image tag = no K8s rollout.
type: project
---

## Timeline

- ~11 AM PDT 2026-03-25: prod `murror-ai` pod entered 0/1 Ready state
- 8:36 PM PDT 2026-03-26: Fix deployed (33h later)

## Root Cause

`viasr-api` was running with `--workers 2`. Long-running LLM inference requests (5-30s) and web scraping occupied both workers simultaneously. Kubernetes readiness probe requests (`/health/liveness`) joined the OS TCP accept queue. With both workers busy, probes waited >15s timeout → pod marked not-ready → traffic stopped.

This is a **worker saturation** problem, not an app bug. The liveness endpoint itself (`return {"status": "alive"}`) cannot hang — it only hangs when no worker is free to serve it.

## Fix

1. Changed `viasr-api/Dockerfile` line 65: `--workers 2` → `--workers 4`
2. Committed + pushed to main → CI built new image (run #23629909539)
3. CI succeeded but K8s did NOT auto-roll out because image tag `0.73.0-alpha` was unchanged (tag is derived from git history, not commit SHA)
4. Manually triggered: `kubectl rollout restart deployment/murror-ai -n nsp-prod-murror-ai`
5. New pod `55f4f498c4-ppns8` came up 1/1 Ready in ~72 seconds

## Key Lesson

**Same image tag = no K8s rollout.** When `imagePullPolicy: IfNotPresent` or the tag doesn't change, K8s sees no spec diff and skips the rollout. Always use `kubectl rollout restart` after Dockerfile changes that keep the same tag.

## Helm Complication

First CI attempt timed out in pre-upgrade hook because a `migration_coordination` lock from a manual migration run ~25min earlier was still 'active' (cleanup threshold is 30min). Resolved by waiting for lock to age out and re-running with `gh run rerun --failed`.
