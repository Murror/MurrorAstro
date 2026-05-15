---
name: Prod Health Check runbook — what to do when a probe goes red
description: Per-probe diagnostic steps + likely causes when the 6h prod health check fails. Use when Astro gets the GitHub "Run failed: Prod Health Check" email.
type: reference
originSessionId: 7a79f288-534c-450c-a002-dd263fa3bbff
---
When Astro gets an email titled `[Murror/murror-api] Run failed: Prod Health Check - main`, follow this runbook.

## Step 0 — Get the digest

1. Open the Notion page `Murror team updates` (ID `3273af4aaa9280fea697f5c2df66f92a`). The newest `❌ Prod sweep — N red probe(s)` block at the bottom has the probe table.
2. OR pull logs: `gh run view <run_id> --log` on the murror-api repo.

## Per-probe diagnostic steps

### Probe 1 — `/api/health` non-200 or subsystem `down`

**Subsystems**: `memory_heap`, `memory_rss`, `storage`, `legacyDatabase`, `database`, `rabbitmq`, `redis`, `viasrApi`

| Subsystem down | Likely cause | First action |
|---|---|---|
| `database` or `legacyDatabase` | Supabase down, bad connection string, pgbouncer out of connections | Check Supabase dashboard + `kubectl logs -n nsp-prod-murror -l app.kubernetes.io/name=murror-api \| grep -i prisma` |
| `redis` | In-cluster Redis pod crashed | `kubectl get pods -n nsp-prod-murror -l app=redis` |
| `rabbitmq` | In-cluster RabbitMQ pod crashed or consumer disconnected | `kubectl get pods -n nsp-prod-murror -l app=rabbitmq`; check stale-consumer memory `incident_reflection_not_completing_recurring.md` |
| `viasrApi` | viasr-api pod down in `nsp-prod-murror-ai` | `kubectl get pods -n nsp-prod-murror-ai` |
| `memory_*` | Heap/RSS above threshold (2 GB) | Likely leak — bounce pod, investigate after |
| `storage` | Disk > 99% | Clear logs / ephemeral volumes |

### Probe 2 — `/connections/types` unexpected HTTP code

- HTTP 500 → controller exception; check pod logs
- HTTP 404 → routing broken, bad deploy
- Timeout → same as probe 1 diagnosis (app itself unreachable)

### Probe 3 — DNS resolves to wrong IP

- Expected: `159.89.222.109` (DOKS ingress)
- If different: someone changed Cloudflare/Squarespace DNS. Check Cloudflare dashboard. This is a **configuration change**, not an app bug.

### Probe 4 — Pod not Running

- `kubectl describe pod -n <ns> <pod>` → look at events (ImagePullBackOff, CrashLoopBackOff, OOMKilled)
- `kubectl logs -n <ns> <pod> --previous` if it already restarted
- See atlas agent's pod-triage section for details

### Probe 5 — `permission denied for schema app_storage`

- Means the `service_role` GRANT on `app_storage` was reverted (see `incident_prod_viasr_readiness_probe_2026_03_26.md` for the original fix).
- Re-apply: connect to prod Supabase DB as superuser and run `GRANT USAGE ON SCHEMA app_storage TO service_role; GRANT SELECT ON ALL TABLES IN SCHEMA app_storage TO service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA app_storage GRANT SELECT ON TABLES TO service_role;`

### Probe 6 — >100 P2022/42704 hits

- P2022 = Prisma "column does not exist"
- 42704 = Postgres "undefined object"
- Means new schema drift beyond the known baseline (`invitee_phone`, `audio_url`).
- Identify which column with: `kubectl logs -n nsp-prod-murror -l app.kubernetes.io/name=murror-api --since=6h --tail=-1 | grep -E "P2022|42704" | head -20`
- Fix is a Prisma migration — see `feedback_pgbouncer_prisma.md` for how migrations hit prod (port 5432 session mode required, NOT pgbouncer 6543).

## Step N — "I fixed it, now what?"

- Next scheduled run in < 6h will verify green. Or manually dispatch:
  ```bash
  gh workflow run prod-health-check.yml --ref main -R Murror/murror-api
  ```
- If the fix requires deeper work, leave a note on the Notion block or open an issue so Astro has the trail.

## Critical rule — NEVER band-aid

Per `feedback_permanent_fixes_only.md`: do NOT silence probes, raise thresholds, or bypass the check to "make the email stop." The email is the feature. Fix the underlying red condition.
