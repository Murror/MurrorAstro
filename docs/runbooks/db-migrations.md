# Runbook: Database Migrations

**When to use:** writing a Prisma migration, debugging a stuck migration Job, or troubleshooting a schema-mismatch incident.
**Prerequisites:** access to GitHub Actions secrets + DOKS kubectl.

---

## ⚠️ Read this first

**Migrations and code land together.** Never apply a migration manually to a shared DB before its PR merges. This rule exists because of the 2026-04-20 P2032 incident — see [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md#2026-04-20--p2032-cron-crash-on-staging-out-of-band-migration) and [`../CONVENTIONS.md`](../CONVENTIONS.md) §4.

If you need to validate a migration before merging, use a local/ephemeral DB (`docker-compose up postgres` or a throwaway Supabase branch DB).

---

## Two database URLs (this trips everyone up)

Prisma needs **two different connection strings** for two different contexts. Both must exist in every environment.

| Env var | Port | Mode | Used by |
|---|---|---|---|
| `MURROR_DATABASE_URL` | **6543** | Transaction (pgbouncer) | Runtime Prisma client in the running pod |
| `MURROR_DATABASE_URL_EXTERNAL` | **5432** | Session (Supavisor direct) | Prisma `migrate deploy` Job ONLY |

**Why two URLs:**
Prisma `migrate deploy` takes advisory locks + runs DDL that PgBouncer transaction mode (port 6543) cannot support. The migration Job hangs **indefinitely with no error** — the pooler swallows the prepared-statement traffic. Runtime, on the other hand, MUST use the pooled URL to stay within Supabase's 3-session limit.

**Format examples (Supabase):**

```bash
MURROR_DATABASE_URL=postgresql://USER:PASS@HOST:6543/postgres?pgbouncer=true&connection_limit=1
MURROR_DATABASE_URL_EXTERNAL=postgresql://USER:PASS@HOST:5432/postgres
```

### Symptom if `MURROR_DATABASE_URL_EXTERNAL` is missing

```bash
kubectl -n nsp-staging-murror logs job/murror-api-migrate
# Output: Applying migration `20260420...`
# (then nothing for 10+ minutes; Job times out at the workflow level)
```

Fix: add the env var to both **GitHub environment secrets** AND in-cluster K8s secrets, then re-run the deploy.

---

## Where the URLs must exist

For both repos (`murror-api`, and `viasr-api` if it runs migrations), in every environment:

### GitHub repo environments

| Repo | Environments needing both vars |
|---|---|
| `murror-api` | staging, alpha, production |
| `viasr-api` | staging, alpha, production (if migrations run) |

Set via the GitHub UI: Repo → Settings → Environments → `<env>` → Environment secrets.

### K8s namespaces

| Env | Secret name | Namespace |
|---|---|---|
| Alpha 2 | `murror-api-secret` | `nsp-dev-murror` |
| Staging | `murror-api-secret` | `nsp-staging-murror` |
| Production | `murror-api-secret` | `nsp-prod-murror` |

The CI deploy action creates the K8s Secret from GitHub env secrets each deploy.

---

## How a migration runs in CI

1. PR merged to target branch (e.g., `staging`)
2. CI builds the new Docker image
3. CI applies a Kubernetes **Job** named `murror-api-migrate` (per `murror-api/.github/actions/deploy/action.yml`, patched in PR #321):
   - Uses `MURROR_DATABASE_URL_EXTERNAL` as `DATABASE_URL`
   - Runs `npx prisma migrate deploy`
   - Job has `imagePullPolicy: Always` (critical — see below)
   - Job has `imagePullSecrets: [{name: ghcr-secret}]` (critical — see below)
4. After Job completes successfully, CI rolls out the runtime Deployment
5. Runtime Deployment uses `MURROR_DATABASE_URL` (port 6543, transaction mode)

---

## Two known Job-config gotchas

### Gotcha 1: `imagePullPolicy` must be `Always` on the migration Job

Without it, K8s reuses any locally-cached image with the same tag. If you push a new image with the same tag (e.g., `staging-latest`), the Job runs the OLD image's SQL.

**Symptom:** three deploys in a row apply the same stale migration. New migration changes never reach the DB. Detected May 2026 (see PR #335/#336).

**Fix:** Job manifest must include:
```yaml
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: ghcr.io/murror/murror-api:staging-latest
        imagePullPolicy: Always   # CRITICAL
```

Also: **no backticks in heredoc comments** in the Job template (PR #336). Bash mis-parses them and the Job manifest gets mangled.

### Gotcha 2: `imagePullSecrets` must reference `ghcr-secret`

The murror-api Docker image is on GHCR (private). Without the imagePullSecret, the Job fails with `401 Unauthorized` and hangs to `activeDeadlineSeconds`.

**Symptom:** `kubectl describe job/murror-api-migrate` shows `Failed to pull image ... 401 Unauthorized`.

**Fix:** Job manifest must include:
```yaml
spec:
  template:
    spec:
      imagePullSecrets:
      - name: ghcr-secret
```

The `ghcr-secret` Secret is created by CI (`create-ghcr-secret` step in `.github/actions/deploy/action.yml`) using `secrets.GITHUB_TOKEN`.

---

## Schema mismatch incidents — what to check first

If the app starts throwing `P2022` ("column does not exist"), `P2032` ("null value for non-null field"), or `42704` ("undefined object"):

1. **Grep open PRs for migrations:** `gh pr list --state open --json files --jq '.[].files[] | select(.path | contains("prisma/migrations"))'`. An unmerged migration PR with applied SQL is the most common cause.
2. **Compare DB schema vs Prisma schema:** `cd murror-api && npx prisma db pull` (against the affected env's DB) and diff against `schema.prisma`. Drift means out-of-band migration was applied.
3. **Check the cron / job that crashed:** the failure happens at consumer time, not migration time. Look at logs from `kubectl logs -n nsp-<env>-murror -l app.kubernetes.io/name=murror-api --since=1h | grep -E "P2022|P2032|42704"`.

**Recovery if drift is found:**
- Cherry-pick the original migration commit onto a fresh branch off the target environment branch
- Open a PR through the normal flow
- Merge → CI deploys → schema reconciles
- Don't try to manually unwind via `psql` — migrations are tracked in `_prisma_migrations` and going around them creates worse drift

---

## viasr-api (Python) database access

viasr-api connects to the same Postgres but does NOT run Prisma migrations (NestJS-only). It uses asyncpg via SQLAlchemy's async dialect against pgbouncer transaction mode (port 6543).

This needs **three layers of prepared-statement disabling** or it throws `DuplicatePreparedStatementError`:

```python
from uuid import uuid4

create_async_engine(
    url,
    prepared_statement_cache_size=0,    # SQLAlchemy dialect cache
    connect_args={
        "statement_cache_size": 0,       # asyncpg cache
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4().hex}__",  # unique names
    },
)
```

**Missing any layer = error.** See PRs #382→#384→#385 (April 2026 saga). Source: `app/core/db/postgres/session_factory.py` in viasr-api.

---

## Production-specific notes

- Prod Supabase project: `dcftszkbpamgeivhtuzl` in `ap-southeast-1` (Singapore). ~950ms latency from SFO2 — migration to US planned.
- Prod migrations are gated behind a manual `workflow_dispatch` per [`../CONVENTIONS.md`](../CONVENTIONS.md) §1.
- Both `MURROR_DATABASE_URL` and `MURROR_DATABASE_URL_EXTERNAL` were populated for prod preemptively on 2026-04-18 — first prod migration run won't repeat the 3-hour discovery dance.

---

## Cross-references

- pgbouncer + Prisma config rules: `feedback_pgbouncer_prisma.md` (memory)
- Migration Job imagePullPolicy: `reference_migration_job_imagepullpolicy.md` (memory)
- Flyway-in-CI Job + GHCR secret: `reference_flyway_ci_job.md` (memory)
- The 2026-04-20 P2032 incident: [`../INCIDENT_LOG.md`](../INCIDENT_LOG.md)
- CI kubectl access (how the Job runs): [`ci-kubeconfig.md`](./ci-kubeconfig.md)
