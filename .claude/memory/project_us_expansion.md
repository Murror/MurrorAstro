---
name: US market focus and production migration plan
description: Production moving to US region, US customers are priority target market, Alpha 2 already migrated to us-west-2
type: project
---

Murror's target market is **US-based customers**. Plan is to move everything (including production) to the US.

**Why:** Strategic decision to focus on US market growth.

**Current state (2026-03-28):**
- Alpha 2: migrated to **us-west-2** (Oregon) — Supabase project `ormdzpvhrzvietlsvmro`. DB latency ~120ms.
- Production: DOKS in SFO2 but database still in Singapore (ap-southeast-1) — ~950ms latency. Migration pending.
- Current users are mostly in South East Asia

**Multi-region strategy:** Single US region + Cloudflare CDN for now. SEA users get ~200ms network latency which is acceptable. Read replicas or multi-region only needed at scale (thousands of DAU in other regions).

**How to apply:** When making infrastructure decisions, optimize for US-based users. Prod Supabase migration to us-west-2 is the next major infra task.
