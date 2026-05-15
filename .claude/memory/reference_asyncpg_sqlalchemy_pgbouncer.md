---
name: asyncpg + SQLAlchemy + pgbouncer — three-layer prepared-statement fix
description: On Supabase pooler 6543 (transaction mode), prepared statements must be killed at THREE layers — asyncpg statement_cache, SQLAlchemy dialect prepared_statement_cache, AND a unique-name function. Missing any layer = DuplicatePreparedStatementError
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---

When using `asyncpg` via SQLAlchemy's async dialect against Supabase pooler **port 6543 (transaction mode)**, prepared statements cannot be shared across transactions (the pooler recycles server connections between transactions). You will see:

```
asyncpg.exceptions.DuplicatePreparedStatementError: prepared statement "__asyncpg_stmt_N__" already exists
HINT: pgbouncer with pool_mode=transaction does not support prepared statements properly.
```

This bug has **three independent caching layers** that each must be disabled. Disabling any one alone is **not sufficient**. From the 2026-04-20 debugging saga (PRs #382 → #384 → #385):

### Layer 1 — asyncpg driver's own statement cache

```python
connect_args={
    "statement_cache_size": 0,   # asyncpg level
}
```

Disables asyncpg's *own* prepared-statement cache. Shipped in **PR #382**. Necessary but insufficient.

### Layer 2 — SQLAlchemy asyncpg dialect's cache

```python
create_async_engine(
    url,
    prepared_statement_cache_size=0,   # dialect level
    connect_args={...},
)
```

Disables SQLAlchemy's *separate* cache of prepared statements. Shipped in **PR #384**. Necessary but still insufficient — because the dialect still calls `asyncpg.Connection.prepare()` on every execute.

### Layer 3 — Unique per-prepare statement names

```python
from uuid import uuid4

create_async_engine(
    url,
    prepared_statement_cache_size=0,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4().hex}__",   # ⚠️ inside connect_args, NOT top-level
    },
)
```

SQLAlchemy's default name func increments `__asyncpg_stmt_1__`, `__asyncpg_stmt_2__`, … — these collide on a recycled pgbouncer transaction-mode connection because previous transactions left those names registered. Unique UUID names make collisions impossible. Shipped in **PR #385** (wrong placement as top-level kwarg → CrashLoop) → **PR #386** hotfix (moved to `connect_args` where the asyncpg dialect actually pops it). **This is the permanent fix.**

⚠️ **Do NOT put `prepared_statement_name_func` at the top level of `create_async_engine(...)`** — SQLAlchemy 2.0.43 raises `TypeError: Invalid argument 'prepared_statement_name_func' sent to create_engine()`. It MUST go inside `connect_args`. Reference: https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#prepared-statement-name

### Summary — the complete engine config

```python
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    _sanitize_pg_url(url),  # strip pgbouncer=, connection_limit=, pool_timeout= kwargs
    prepared_statement_cache_size=0,
    prepared_statement_name_func=lambda: f"__asyncpg_{uuid4().hex}__",
    connect_args={
        "statement_cache_size": 0,
    },
)
```

### Debug recipe — if `DuplicatePreparedStatementError` shows up again

1. Check the DB URL — are we on port 6543 (transaction mode)? If port 5432 (session mode), prepared statements work and this error is unexpected.
2. Check all three layers are disabled in `app/core/db/postgres/session_factory.py`. If any is missing, add it.
3. Verify via kubectl exec: run a quick `SELECT 1` repeatedly on the shared engine — collisions manifest within a handful of calls.

### Runtime vs migrations

- **Runtime** uses port 6543 (pgbouncer, transaction mode) — needs all 3 layers disabled.
- **Prisma migrate deploy** uses `MURROR_DATABASE_URL_EXTERNAL` (port 5432 session mode) — prepared statements are fine; do NOT apply these settings there.
