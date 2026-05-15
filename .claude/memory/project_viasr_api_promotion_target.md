---
name: viasr-api production promotion target — staging → main
description: viasr-api has no `production` branch; promotion target is `main` via workflow_dispatch
type: project
originSessionId: 177ad938-2f97-48d7-81b3-a6b45eb8618d
---
## Decision (2026-04-22 PDT)

viasr-api's production deploy target is **`main` branch** (not a separate `production` branch like murror-api uses).

**Why:** viasr-api never had a `production` branch cut. CI workflow `.github/workflows/ci.yaml` dispatches to `nsp-prod-murror-ai` when triggered via `workflow_dispatch` with `environment=production`, reading from whatever is HEAD of the chosen branch. Adding a `production` branch now would require CI changes for no functional gain.

**How to apply:**
- When promoting to production, open a PR titled `deploy: promote staging → main for launch` with `base=main` and `head=staging`.
- After Astro reviews + merges, trigger the `CI` workflow manually via GitHub Actions UI with:
  - Workflow: `ci.yaml`
  - Branch: `main`
  - `environment` input: `production`
- This builds a fresh image from `main` HEAD and deploys to `nsp-prod-murror-ai`.
- murror-api still uses the dedicated `production` branch (separate convention).

**Promotion pairing:** Production promotion always pairs murror-api + viasr-api. Do not deploy one without the other (mobile expects both to advance together for EMV features to work end-to-end).
