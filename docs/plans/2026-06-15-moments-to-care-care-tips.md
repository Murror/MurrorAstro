# Care Tips (Moments to Care redesign) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the gated, often-empty "Moments to Care" cards with low-friction, AI-generated Care Tips that help a user remember, understand, and act on the people they care about.

**Architecture:** Purely additive across three repos. A new viasr-api `care_tips` generator (synchronous HTTP, mirrors the zodiac / relationship-questions pattern) reads the user's in-app data about a connection + the connection's own privacy-gated activity, and always returns >= 1 tip (cold-start seeds when data is thin). murror-api exposes `GET /v1/connections/:id/care-tips`, caching results in a new `care_tips` table. web-client fetches it alongside today's calls and renders a new card kind in the existing carousel. Everything is flag-gated; the existing insight/takeaway pipeline is untouched. External public-profile scanning is Phase 2, behind a second flag, gated on legal + compliance sign-off.

**Tech Stack:** viasr-api (FastAPI, LangGraph, pytest), murror-api (NestJS, Prisma, Jest, Statsig), web-client (React, RTK Query, Vitest/Jest).

**Reference design:** `docs/plans/2026-06-15-moments-to-care-tips-redesign-design.md`

**Repos (paths):**
- viasr-api: `/Users/astro/Projects/murror-transfer/Murror/viasr-api`
- murror-api: `/Users/astro/Projects/murror-transfer/Murror/murror-api`
- web-client: `/Users/astro/Projects/murror-transfer/Murror/murror-platform/apps/web-client`

**Conventions to honor (from memory):**
- Always branch + PR to `staging`, never `main`/`production`. Deploy to BOTH `nsp-staging-murror` and `nsp-dev-murror`.
- Migrations land WITH code in the same PR; `prisma migrate deploy` uses the port-5432 external URL.
- Statsig returns `False` for console-undefined gates — define both flags in Statsig console; keep `FF_DEFAULT=False` (do NOT add to `UNRECOGNIZED_USES_DEFAULT`).
- Use isolated git worktrees per parallel agent.
- Run the compassion-review skill on every new prompt; run `/code-review` (agent review) before any deploy.
- No em dashes in user-facing copy; CTAs are black text.

---

## CARD CONTRACT (the shape every layer agrees on)

```
GET /v1/connections/:relationshipId/care-tips
{
  relationshipId, connectionName, generatedAt,
  dataRichness: "cold_start" | "in_app" | "enriched",
  externalScan: { status: "skipped" | "awaiting_identity_confirmation" | "scanning" | "ready" | "no_match",
                  candidates?: [{ id, label, sourceType, url, thumbnail }] },   // Phase 2; Phase 1 always "skipped"
  tips: [{
    id, flavor: "remember"|"action"|"understand"|"question",
    text, detail?, source: "in_app"|"external"|"cold_start",
    provenance?: { label, url },   // only when source==="external" (Phase 2)
    isNew, dismissible
  }]
}
```

---

# PHASE 1 — In-app Care Tips (build now, flag `careTipsEnabled`)

## Phase 1A — viasr-api generator

### Task 1: Add the `CARE_TIPS_ENABLED` feature flag

**Files:**
- Modify: `viasr-api/app/core/feature_flag/feature_flag_name.py`
- Test: `viasr-api/tests/core/feature_flag/test_care_tips_flag.py` (create)

**Step 1 — Write the failing test**
```python
from app.core.feature_flag.feature_flag_name import (
    FeatureFlagName, FF_DEFAULT, UNRECOGNIZED_USES_DEFAULT,
)

def test_care_tips_flag_defaults_off_and_not_default_on_when_undefined():
    assert FeatureFlagName.CARE_TIPS_ENABLED.value == "care_tips_enabled"
    assert FF_DEFAULT[FeatureFlagName.CARE_TIPS_ENABLED] is False
    # Crisis-detection gotcha: a console-undefined gate must resolve False, so it
    # must NOT be in the set that falls back to its default when unrecognized.
    assert FeatureFlagName.CARE_TIPS_ENABLED not in UNRECOGNIZED_USES_DEFAULT
```

**Step 2 — Run, expect FAIL** (`AttributeError: CARE_TIPS_ENABLED`)
Run: `cd viasr-api && pytest tests/core/feature_flag/test_care_tips_flag.py -v`

**Step 3 — Implement** — add the enum member and `FF_DEFAULT[...] = False`; do NOT add it to `UNRECOGNIZED_USES_DEFAULT`.

**Step 4 — Run, expect PASS.**

**Step 5 — Commit** `feat(viasr): add care_tips_enabled feature flag (default off)`

---

### Task 2: Define the care-tips Pydantic schema

**Files:**
- Create: `viasr-api/app/services/care_tips/__init__.py`
- Create: `viasr-api/app/services/care_tips/schema.py`
- Test: `viasr-api/tests/services/care_tips/test_schema.py`

**Step 1 — Failing test**
```python
from app.services.care_tips.schema import CareTip, CareTipsResult, TipFlavor, DataRichness

def test_caretip_round_trips_and_defaults():
    tip = CareTip(flavor=TipFlavor.REMEMBER, text="Loves hiking")
    assert tip.source == "in_app"
    assert tip.is_new is True
    res = CareTipsResult(tips=[tip], data_richness=DataRichness.IN_APP)
    assert res.tips[0].flavor == TipFlavor.REMEMBER
```

**Step 2 — Run, expect FAIL.**

**Step 3 — Implement** (`schema.py`)
```python
from enum import Enum
from typing import Optional
from pydantic import BaseModel

class TipFlavor(str, Enum):
    REMEMBER = "remember"
    ACTION = "action"
    UNDERSTAND = "understand"
    QUESTION = "question"

class DataRichness(str, Enum):
    COLD_START = "cold_start"
    IN_APP = "in_app"
    ENRICHED = "enriched"

class CareTip(BaseModel):
    flavor: TipFlavor
    text: str
    detail: Optional[str] = None
    source: str = "in_app"        # in_app | external | cold_start
    is_new: bool = True

class CareTipsResult(BaseModel):
    tips: list[CareTip]
    data_richness: DataRichness
```

**Step 4 — Run, expect PASS. Step 5 — Commit** `feat(viasr): care_tips schema`

---

### Task 3: Author the care-tips prompt

**Files:**
- Create: `viasr-api/app/prompts/care_tips.yaml`

Mirror the structure of `app/prompts/relationship.yaml` (`EXTRACT_INSIGHT_RELATIONSHIP_V2`). Add one key `GENERATE_CARE_TIPS_V1` whose template receives: `{user_persona}`, `{partner_persona}`, `{relationship_type}`, `{partner_recent_context}` (privacy-gated summaries/keywords), `{how_we_met}`, `{birthday_context}`, `{output_schema}`. The instruction must:
- Produce a small set of tips across the four flavors (remember / action / understand / question), warm and specific.
- Never infer or surface sensitive categories (health, religion, politics, sexuality).
- When `{partner_recent_context}` is empty/withheld, emit gentle cold-start "getting to know them" tips instead and set richness accordingly.
- No em dashes.

**After writing, run the compassion-review skill on this file. Commit** `feat(viasr): care_tips prompt (compassion-reviewed)`.

---

### Task 4: Implement `CareTipsService` (with privacy gate + cold start)

**Files:**
- Create: `viasr-api/app/services/care_tips/service.py`
- Test: `viasr-api/tests/services/care_tips/test_service.py`

Reuse patterns from `app/services/new_relationship/service.py`: persona fetch (`UserPersonaCacheService`), `get_user_data()` (deep_chat summaries/keywords), the privacy gate at lines 211-218, and `allm_request(..., response_format=CareTipsResult)`.

**Step 1 — Failing tests** (mock the LLM + Supabase like `tests/services/new_relationship/test_emotion_extraction.py`)
```python
import pytest
from app.services.care_tips.schema import CareTipsResult, CareTip, TipFlavor, DataRichness

@pytest.mark.asyncio
async def test_rich_data_returns_real_tips(care_tips_service, mock_llm):
    mock_llm.return_value = CareTipsResult(
        tips=[CareTip(flavor=TipFlavor.ACTION, text="Ask how her defense went")],
        data_richness=DataRichness.IN_APP,
    )
    out = await care_tips_service.run(user_id="u1", partner_id="u2",
                                      relationship_type="friend", privacy_share_level="detailed")
    assert len(out.tips) >= 1
    assert out.data_richness == DataRichness.IN_APP

@pytest.mark.asyncio
async def test_thin_data_falls_back_to_cold_start(care_tips_service_no_data):
    out = await care_tips_service_no_data.run(user_id="u1", partner_id="u2",
                                              relationship_type="friend", privacy_share_level="overview")
    assert len(out.tips) >= 1                       # NEVER empty
    assert out.data_richness == DataRichness.COLD_START
    assert all(t.source == "cold_start" for t in out.tips)

@pytest.mark.asyncio
async def test_privacy_gate_overview_excludes_partner_personal_content(care_tips_service, captured_prompt):
    await care_tips_service.run(user_id="u1", partner_id="u2",
                                relationship_type="friend", privacy_share_level="overview")
    assert "Not shared at overview level" in captured_prompt.value  # mirrors new_relationship gate
```

**Step 2 — Run, expect FAIL.**

**Step 3 — Implement** `CareTipsService.run(...)`:
1. Fetch user + partner personas (cache).
2. Fetch partner recent context via the `get_user_data` pattern; apply the SAME `shareLevel` gate as `new_relationship/service.py:211-218` (string compare; watch the `str, Enum` trap — compare to the `.value`).
3. If partner context is fully withheld AND user-side context is empty → build cold-start tips (deterministic seeds from profile: birthday proximity, "added N weeks ago", "haven't checked in") with `source="cold_start"`, `data_richness=COLD_START`; return without an LLM call.
4. Otherwise render `GENERATE_CARE_TIPS_V1` and call `allm_request(response_format=CareTipsResult, ...)`; set richness `IN_APP` (Phase 1 never `ENRICHED`).
5. Translate per preferred language (reuse `translate_if_need`).

**Step 4 — Run, expect PASS. Step 5 — Commit** `feat(viasr): CareTipsService with privacy gate + cold start`

---

### Task 5: Expose `POST /care-tips/generate` HTTP route

**Files:**
- Create: `viasr-api/app/api/controller/care_tips/route.py`
- Modify: `viasr-api/app/api/controller/router.py` (register the route, mirror `new_relationship`)
- Test: `viasr-api/tests/api/care_tips/test_route.py`

Mirror `app/api/controller/new_relationship/route.py` (`POST /extract-insight-relationship`). Request body: `{ user_id, partner_id, relationship_type, privacy_share_level, how_we_met?, birthday?, preferred_language? }`. Guard with the existing VIASR-API-Key dependency. Gate on `is_feature_enabled_with_cache(FeatureFlagName.CARE_TIPS_ENABLED, user_id=user_id)`; when off, return `{ tips: [], data_richness: "cold_start" }` (murror-api treats empty as "fall back to today's cards").

**Step 1 — failing route test** (TestClient, flag patched on) → **Step 4 — PASS. Step 5 — Commit** `feat(viasr): POST /care-tips/generate route`

---

## Phase 1B — murror-api endpoint + cache

### Task 6: Add the `CareTips` Prisma model + migration

**Files:**
- Modify: `murror-api/prisma/schema.murror.prisma` (add model + enum + `careTips CareTips[]` on `Connection`)
- Create: `murror-api/prisma/migrations/<TIMESTAMP>_add_care_tips_model/migration.sql`

Model (cache of the latest generated payload per viewer+connection):
```prisma
model CareTips {
  id                 String         @id @default(cuid())
  connectionId       String         @map("connection_id")
  legacyConnectionId String?        @map("legacy_connection_id") @db.Uuid
  viewerUserId       String         @map("viewer_user_id")
  partnerUserId      String         @map("partner_user_id")
  payload            Json                                   // the full card contract JSON
  dataRichness       String         @map("data_richness")
  status             CareTipsStatus @default(COMPLETED)
  externalScanStatus String?        @map("external_scan_status")  // Phase 2
  confirmedProfileId String?        @map("confirmed_profile_id")  // Phase 2
  generatedAt        DateTime       @default(now()) @map("generated_at")
  createdAt          DateTime       @default(now()) @map("created_at")
  updatedAt          DateTime       @updatedAt @map("updated_at")
  connection         Connection     @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  @@unique([connectionId, viewerUserId])
  @@index([connectionId])
  @@map("care_tips")
}
enum CareTipsStatus { PENDING GENERATING COMPLETED FAILED }
```
Hand-write `migration.sql` (CREATE TABLE + unique + index + FK) matching an existing migration's style (e.g. `20260415210000_add_takeaway_id_to_invites`).

**Verify:** `cd murror-api && npx prisma validate && npx prisma generate`. **Commit** `feat(murror-api): care_tips model + migration`.

### Task 7: Add the Statsig `CARE_TIPS_ENABLED` flag
**Files:** Modify `murror-api/src/libs/statsig/statsig.constants.ts` (add to `FeatureFlags` + `FeatureFlagDefaults: false`). Trivial test asserting the constant. **Commit.**

### Task 8: `AIServiceClient.generateCareTips`
**Files:** Modify `murror-api/src/connections/services/ai-service.client.ts`; test `...ai-service.client.spec.ts`.
Mirror `getZodiacInsight` (POST + `VIASR-API-Key`, 30s AbortController, snake_case→camelCase map). Signature: `generateCareTips(payload): Promise<CareTipsContract>`. **TDD → Commit.**

### Task 9: `CareTipsRepository`
**Files:** Create `murror-api/src/connections/repositories/care-tips.repository.ts`; test alongside.
Methods: `findFresh(connectionId, viewerUserId, maxAgeHours)`, `upsert(connectionId, viewerUserId, payload)`. Wrap Prisma `careTips`. **TDD → Commit.**

### Task 10: `GetCareTipsUseCase`
**Files:** Create `murror-api/src/connections/application/use-cases/care-tips/get-care-tips.use-case.ts`; spec alongside.
Logic: resolve connection id (`ConnectionIdHelper.resolveConnection`), verify membership (else `ForbiddenException`), return cached `payload` if `findFresh` hit, else call `AIServiceClient.generateCareTips`, `upsert`, return. If viasr returns empty tips → return `null` (signals web to fall back).

**Step 1 — failing specs** (mirror `get-takeaways.use-case.spec.ts`): cached-fresh returns cached; membership check throws Forbidden; empty-from-AI returns null. **→ PASS → Commit.**

### Task 11: `CareTipsResponseDto`
**Files:** Create `murror-api/src/modules/connection/presentation/dto/care-tips/care-tips-response.dto.ts`. Class-based `@ApiProperty` DTO matching the card contract. **Commit.**

### Task 12: Controller route + module wiring
**Files:** Modify `murror-api/src/modules/connection/presentation/controllers/connections.controller.ts` (add `@Get(':connectionId/care-tips')`, `AuthGuard`, `userId = req.user.id`, Statsig gate → if off return `null`); modify `murror-api/src/modules/connection/connections.module.ts` (provide use case + repository). Add a controller spec asserting the gate + delegation.

**Verify:** `cd murror-api && npm run build && npm test -- care-tips`. **Commit** `feat(murror-api): GET /connections/:id/care-tips`.

---

## Phase 1C — web-client card

Known files (from exploration): `apps/web-client/src/presentation/components/home/moment-to-care.tsx`, `.../moment-to-care-feed-card.tsx`, `.../application/hooks/use-cross-connection-feed.ts`, `.../application/services/feed-card-builder.ts`, `.../infrastructure/api/connections-api.ts`, `.../domain/entities/connection.ts`.

### Task 13: Types + RTK Query endpoint `getCareTips`
**Files:** Modify `connection.ts` (add `CareTip`, `CareTipsResponse`, extend `FeedCardItem.kind` with `"careTip"` + a `careTip?` body); modify `connections-api.ts` (add `getCareTips` query → `GET v1/connections/{relationshipId}/care-tips`). **TDD** (type-level + a query-builds test) **→ Commit.**

### Task 14: Build careTip cards in `feed-card-builder.ts`
**Files:** Modify `feed-card-builder.ts`; test `feed-card-builder.spec.ts`.
Add a pure helper that maps a `CareTipsResponse` → `FeedCardItem[]` (one hero card per connection carrying its tips; sortPriority above the static reflect card). Keep the 3-card cap + dismissal gate.
**Step 1 — failing test:** given a `CareTipsResponse` with 3 tips → returns one `careTip` FeedCardItem with the hero + secondary tips and correct `connectionName`. **→ PASS → Commit.**

### Task 15: Fetch care-tips in `use-cross-connection-feed.ts` (flag-gated)
**Files:** Modify the hook to also fan out `getCareTips` per friend when `careTipsEnabled` is on, merge into the card list, and on error/empty fall back to today's insight/takeaway cards. **TDD with mocked queries → Commit.**

### Task 16: Render the careTip card in `moment-to-care-feed-card.tsx`
**Files:** Modify the card renderer: hero tip (flavor-colored, adaptive CTA), 2 secondary tip rows, `new` badge, provenance line (hidden in Phase 1 since `source` is never `external`), dismissible secondary tips. Match the approved mockup (coral=action, amber=remember, teal=understand, blue=question). CTAs are black text. **Add render tests per flavor → Commit.**

### Task 17: Flag-gate the section in `moment-to-care.tsx`
**Files:** Modify to read `careTipsEnabled`; when off, behavior is byte-for-byte today's. **Render test for both states → Commit.**

---

## Phase 1D — verify + ship to staging

### Task 18: Cross-repo green check
Run, and paste output: `viasr` `pytest -q`; `murror-api` `npm run build && npm test`; `web-client` `npm run typecheck && npm test`. (verification-before-completion skill.)

### Task 19: Agent code review BEFORE deploy
Dispatch parallel domain agents (cortex/muse/iris/sentinel) on the diff per the pre-deploy review rule. Address findings.

### Task 20: Deploy to staging + alpha, then E2E
- Define `care_tips_enabled` in Statsig console (ON for staging) — remember undefined-gate=False.
- Deploy viasr + murror-api to BOTH `nsp-staging-murror` and `nsp-dev-murror`; deploy web to staging.
- Run migration with the port-5432 external URL.
- E2E with real test accounts: one rich connection (real tips, `in_app`) and one brand-new/quiet connection (`cold_start`, still >= 1 tip). Assert the card renders, fallback works when the flag is off.
- Open PR to `staging` (never `main`).

---

# PHASE 2 — External public-profile enrichment (GATED on aegis + shield sign-off)

> Do NOT enable in production until legal + compliance clear it. Build/test on staging behind a second flag `careTipsExternalScan`. The five guardrails in the design doc are requirements, not options.

Outline (expand into bite-sized tasks once the provider + legal review are settled — deliberately not over-specified now, YAGNI):

1. **Flag** `careTipsExternalScan` (both repos), default off; never default-on-when-undefined.
2. **Identity confirm** — `POST /v1/connections/:id/care-tips/identity` (murror-api) storing `confirmedProfileId`; viasr proposes candidates (public search), web renders the confirm prompt from the mockup; nothing scans before confirmation.
3. **Compliant fetch layer** (viasr) — public pages/profiles only, no auth-gated scraping; provider + caching + refresh cadence + rate limits TBD.
4. **Async scan** — RabbitMQ/Celery job (mirror `rabbitmq_connection_insight`) that enriches the cached `care_tips.payload` and flips `externalScanStatus` → `ready`; card enriches on next load, never blocks first render.
5. **Sensitive-category filter** + **transparent provenance** (`source: "external"`, `provenance.label/url`) + dismiss/report.
6. **Privacy review checklist** for aegis + shield; production enable only after sign-off.

---

## Notes for the executor
- One worktree per repo per parallel agent (avoid the shared-working-tree overwrite trap).
- Subagents report diffs back for review; they do NOT open PRs autonomously.
- Keep the existing insight/takeaway pipeline untouched — Care Tips is additive and flag-gated end to end.
