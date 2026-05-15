# Runbook: Prod Health Check (when a probe goes red)

**When to use:** you got the email `[Murror/murror-api] Run failed: Prod Health Check - main`, or a Notion `Murror team updates` page entry shows `❌ Prod sweep — N red probe(s)`.
**Prerequisites:** kubectl access to DOKS, optional Notion + Sentry access for context.

---

## Step 0 — Get the digest

1. Open the Notion page **Murror team updates** (page ID `3273af4aaa9280fea697f5c2df66f92a`). The newest `❌ Prod sweep — N red probe(s)` block has the probe table.
2. OR pull GitHub Actions logs: `gh run view <run_id> --log` on the `murror-api` repo.

---

## Step 1 — Identify which probe is red

The 6 probes:

| # | Probe | What it checks |
|---|---|---|
| 1 | `/api/health` | Subsystem `up/down` for memory_heap, memory_rss, storage, legacyDatabase, database, rabbitmq, redis, viasrApi |
| 2 | `/connections/types` | Endpoint returns expected HTTP code |
| 3 | DNS resolution | `murror.api.ambercare.app` resolves to expected IP |
| 4 | Pod status | All required pods `Running` in prod namespaces |
| 5 | DB schema permissions | `service_role` GRANT on `app_storage` intact |
| 6 | Prisma errors | `<100` P2022/42704 hits in last 6h |

---

## Step 2 — Diagnose by probe

### Probe 1 — `/api/health` non-200 OR a subsystem `down`

| Subsystem `down` | Likely cause | First action |
|---|---|---|
| `database` or `legacyDatabase` | Supabase down, bad connection string, pgbouncer out of connections | Check Supabase dashboard. `kubectl logs -n nsp-prod-murror -l app.kubernetes.io/name=murror-api \| grep -i prisma` |
| `redis` | In-cluster Redis pod crashed | `kubectl get pods -n nsp-prod-murror -l app=redis` |
| `rabbitmq` | In-cluster RabbitMQ pod crashed or consumer disconnected | `kubectl get pods -n nsp-prod-murror -l app=rabbitmq`. Check `incident_reflection_not_completing_recurring.md` for stale-consumer pattern |
| `viasrApi` | viasr-api pod down in `nsp-prod-murror-ai` | `kubectl get pods -n nsp-prod-murror-ai` |
| `memory_heap` / `memory_rss` | Heap/RSS above 2 GB threshold | Likely leak — bounce pod, investigate after |
| `storage` | Disk > 99% | Clear logs / ephemeral volumes |

### Probe 2 — `/connections/types` unexpected HTTP code

| Code | Meaning | Action |
|---|---|---|
| HTTP 500 | Controller exception | Check pod logs for stack trace |
| HTTP 404 | Routing broken / bad deploy | Check that the latest image deployed and Ingress points at the right Service |
| Timeout | App itself unreachable | Same diagnosis as Probe 1 |

### Probe 3 — DNS resolves to wrong IP

- **Expected:** `159.89.222.109` (DOKS ingress)
- If different: someone changed Cloudflare/Squarespace DNS. Check Cloudflare dashboard.
- This is a **configuration change**, NOT an app bug.

### Probe 4 — Pod not Running

```bash
kubectl get pods -n nsp-prod-murror
kubectl describe pod -n <ns> <pod>            # look at Events (ImagePullBackOff, CrashLoopBackOff, OOMKilled)
kubectl logs -n <ns> <pod> --previous         # if it already restarted
```

### Probe 5 — `permission denied for schema app_storage`

The `service_role` GRANT on `app_storage` was reverted (see [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md#2026-03-26--prod-viasr-api-stuck-01-ready-for-33h) for the original fix that introduced these GRANTs).

Re-apply (connect to prod Supabase DB as superuser):

```sql
GRANT USAGE ON SCHEMA app_storage TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA app_storage TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_storage GRANT SELECT ON TABLES TO service_role;
```

### Probe 6 — > 100 P2022 / 42704 hits

- **P2022** = Prisma "column does not exist"
- **42704** = Postgres "undefined object"

Means new schema drift beyond the known baseline. See [`db-migrations.md`](./db-migrations.md) "Schema mismatch incidents — what to check first".

Identify which column with:

```bash
kubectl logs -n nsp-prod-murror -l app.kubernetes.io/name=murror-api \
  --since=6h --tail=-1 | grep -E "P2022|42704" | head -20
```

Fix is a Prisma migration via the normal PR flow — see [`db-migrations.md`](./db-migrations.md).

---

## Step N — "I fixed it, now what?"

The next scheduled run in <6h will verify green automatically.

To manually re-trigger:

```bash
gh workflow run prod-health-check.yml --ref main -R Murror/murror-api
```

If the fix requires deeper work, leave a note on the Notion block or open an issue so others have the trail.

---

## Critical rule — NEVER band-aid

Per [`../CONVENTIONS.md`](../CONVENTIONS.md) §6 (permanent fixes only): do **NOT**:

- Silence probes
- Raise thresholds to hide the failure
- Bypass the check to "make the email stop"

The email is the feature. Fix the underlying red condition.

---

## Cross-references

- Architecture: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- Migration troubleshooting: [`db-migrations.md`](./db-migrations.md)
- Past incidents: [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md)
