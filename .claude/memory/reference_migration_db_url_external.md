---
name: MURROR_DATABASE_URL_EXTERNAL — migrate deploy connection
description: Separate DB URL for Prisma migrate deploy using port 5432 session-mode Supavisor, distinct from runtime's port 6543 tx-mode pgbouncer URL. Without it, migration Jobs hang indefinitely.
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Why two URLs

Prisma `migrate deploy` takes advisory locks + runs DDL that PgBouncer **transaction mode** (port 6543) cannot support. The migration Job hangs indefinitely with no error — the pooler swallows the prepared-statement traffic.

Runtime, on the other hand, MUST use the pooled URL to stay within Supabase's 3-session limit and get connection pooling. So we keep two env vars, used in different contexts.

## The two env vars

| Var | Port | Mode | Used by |
|-----|------|------|---------|
| `MURROR_DATABASE_URL` | 6543 | Transaction (pgbouncer=true) | Runtime Prisma client in the running pod |
| `MURROR_DATABASE_URL_EXTERNAL` | 5432 | Session (Supavisor direct) | Prisma `migrate deploy` Job only |

Format examples (Supabase):
```
MURROR_DATABASE_URL=postgresql://USER:PASS@HOST:6543/postgres?pgbouncer=true&connection_limit=1
MURROR_DATABASE_URL_EXTERNAL=postgresql://USER:PASS@HOST:5432/postgres
```

## Where it must exist

Both GitHub env secrets AND in-cluster K8s secrets — for every env on both repos:

- GitHub repo `murror/murror-api` → environments: staging, alpha, production
- GitHub repo `murror/viasr-api` → environments: staging, alpha, production
- K8s namespaces: `nsp-staging-murror`, `nsp-alpha-murror`, `nsp-prod-murror` (same pattern for murror-ai namespaces if they run migrations)

All three prod secrets were populated preemptively on 2026-04-18 even though prod pipeline hasn't run yet — so the prod run won't hit the same 3-hour discovery.

## How it's consumed

murror-api `.github/actions/deploy/action.yml` (patched in PR #321) creates the migration Job with `DATABASE_URL` set to the `MURROR_DATABASE_URL_EXTERNAL` value. Runtime Deployment still reads `MURROR_DATABASE_URL` from the regular secret.

## Symptom if missing

`kubectl -n nsp-staging-murror logs job/murror-api-migrate` shows `Applying migration ...` and then nothing for 10+ minutes. No error. Job times out at the workflow level. Fix: set the EXTERNAL var and re-run.

## Related

See `feedback_pgbouncer_prisma.md` for why runtime uses 6543.
