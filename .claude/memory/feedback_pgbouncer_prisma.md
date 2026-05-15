---
name: PgBouncer + Prisma connection setup
description: Always use port 6543 + pgbouncer=true for Prisma with PgBouncer — port 5432 causes 3-connection limit exhaustion
type: feedback
---

When configuring `DATABASE_URL` for any service using Prisma with PgBouncer (Supabase transaction pooler):

- Use **port 6543** (transaction mode), NOT 5432 (session mode)
- Append **`?pgbouncer=true`** to the connection string
- Example: `postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1`

**Why:** Prisma uses prepared statements by default, which are incompatible with PgBouncer in transaction mode. The `pgbouncer=true` flag disables prepared statements. Port 5432 is Supabase's session mode which has a hard 3-connection limit per project — will exhaust quickly in production.

**How to apply:** Any time `MURROR_DATABASE_URL` or any Prisma DB connection string is set or reviewed, confirm it uses port 6543 + `pgbouncer=true`.
