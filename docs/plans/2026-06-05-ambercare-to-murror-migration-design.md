# Ambercare.app → Murror.app Migration — Design

- **Date:** 2026-06-05
- **Author:** Claude (with Astro)
- **Status:** Design approved; implementation plan to follow
- **Driver:** "Centralize everything to murror.app on Cloudflare and move away from ambercare.app."

## 1. Goal

Make `murror.app` the single canonical home for all Murror infrastructure under the one Cloudflare account (`astrovinh@gmail.com`), and decommission `ambercare.app` **per-service** — with **zero disruption to live users**. The hard constraint: released mobile apps have `murror.api.ambercare.app` baked into them, so that hostname must keep working until those installs age out.

## 2. Decisions (Astro)

| Question | Decision |
|---|---|
| End state for ambercare.app | **Decide per-service** — retire dead now, keep the API alias for apps, migrate the rest opportunistically |
| Mobile baked URL | **Transparent alias (zero risk)** — `murror.api.ambercare.app` keeps working; `api.murror.app` becomes canonical |
| Scope | **Everything** — prod + staging + alpha, including DNS cleanup |
| Dev/inference/remote box (vps40) | **Rebuild under murror.app, then retire** — verified safe (no live-prod dependency) |

## 3. Current architecture (DNS export 2026-06-05 + live do-sfo2 cluster)

**Both `ambercare.app` and `murror.app` zones live in ONE Cloudflare account** (`astrovinh@gmail.com`). So centralizing = *add records in the same account*, not move a zone.

### Live prod (DigitalOcean do-sfo2, `159.89.222.109`, DNS-only / grey-cloud)
- `murror.api.ambercare.app` → prod API. **Baked into released apps.**
- `murror-ai.api.ambercare.app` → prod AI (viasr). Ingress host on do-sfo2 is **only** this.
- Prod murror→AI traffic is **in-cluster** (`http://murror-ai.nsp-prod-murror-ai.svc.cluster.local`) — never leaves do-sfo2, never touches ambercare.app.
- `files.ambercare.app` → Cloudflare R2 (`public.r2.dev`).
- The `murror-api-geo-router` Worker has routes for `murror.api`/`www.murror.api`, but the prod records are **grey-cloud (DNS-only)**, so the Worker is **not actually in the prod path**.

### Tunnel box = the "vps40" box (Cloudflare Tunnel `d461c959-…`, region `us`, currently down)
Serves, via one tunnel: `remote.`, `ssh.`, `terminal.`, `dev.api.`, `ai.api.`, `inference.` — **dev/ops only; verified NOT in any live-prod request path.** Likely IP `65.49.60.35` (also hosts `us.murror.api` + `auth/admin/notifications/kol/web/statistic-api`). This box also had live prod DB creds and had hijacked the prod article-scheduler leadership (fixed separately, PR #410 / image 0.34.3).

### Dead / legacy (delete after verification)
OVH (`15.235.x`), VN (`14.225.210.108`, in the VN-decommission list), dev-k8s (`154.26.131.23`), the `65.49.60.35` legacy stack, wildcards (`*.api`, `*.app`, `*.portal`, `*.conversation.ai.api`, `*.ai.api`, `*.murror.api`), `rabbitmq`→VN, `cdn-alpha`→`sg3.canhnv.com` (former-eng domain), `us.kol`/`vn.kol`, `admin`/`web`/`statistic-api`/`cost-api`, stale `_acme-challenge` TXTs, and 2 typo records (`dev.api.murror.app.ambercare.app`, `ssh.murror.app.ambercare.app`).

## 4. Target naming on murror.app (consistent with existing dev/staging)

| Service | Today (ambercare.app) | New canonical (murror.app) |
|---|---|---|
| Prod API | `murror.api.ambercare.app` | `api.murror.app` |
| Prod AI | `murror-ai.api.ambercare.app` | `ai.murror.app` |
| Files | `files.ambercare.app` | `files.murror.app` |
| Auth | `auth.ambercare.app` | `auth.murror.app` (verify usage first) |
| Push | `notifications.ambercare.app` | `notifications.murror.app` (verify first) |
| Remote/ops | `remote./ssh./terminal.ambercare.app` | `remote./ssh./terminal.murror.app` |
| Dev API | (`dev.api.ambercare.app`) | already `dev.api.murror.app` ✅ |
| Staging API | — | already `staging.api.murror.app` ✅ |

## 5. Migration mechanism — transparent alias, build-before-retire

For each live service:
1. **Add** the murror.app hostname to the backend (ingress `hosts` + a TLS cert that covers it).
2. **Add** the Cloudflare DNS record in the murror.app zone, pointing at the same origin.
3. **Verify** parity — the murror.app endpoint returns identical responses (health + a real request).
4. **Switch** internal/service-to-service refs, CI, webhooks, and the next mobile build to murror.app.
5. **Keep** the ambercare.app record as an alias until old-app traffic is negligible; then retire per-service.

**Invariant:** never delete an ambercare.app record until its murror.app replacement is verified live. No gap, ever.

## 6. Phased plan (dependency-ordered, not calendar)

- **Phase 0 — Map & freeze.** This doc. (done)
- **Phase 1 — Dead DNS cleanup.** Delete the abandoned records (§3 dead list) after a 6-layer "nothing live resolves here" check per record.
- **Phase 2 — Prod API + AI aliases.** Add `api.murror.app` + `ai.murror.app` to the do-sfo2 ingress hosts + TLS; add DNS; verify parity. Both domains serve identically.
- **Phase 3 — Files.** `files.murror.app` as an R2 custom domain; verify; switch references.
- **Phase 4 — Switch internals.** Point service-to-service refs, webhooks, CI, and configs at murror.app (no app release needed).
- **Phase 5 — New mobile build.** Mobile `.env` → murror.app endpoints. Released apps keep riding the ambercare.app alias.
- **Phase 6 — Dev/inference/remote rebuild.** Stand up `remote./ssh./terminal./dev.api./ai.api./inference.murror.app` on fresh infra (new Cloudflare Tunnel), verify, then retire the vps40 box + **rotate its prod DB creds + `VIASR_API_KEY`**.
- **Phase 7 — Staging/alpha sweep.** Finish moving any remaining staging/alpha hosts (dev/staging API already on murror.app).
- **Phase 8 — Per-service retirement.** Retire each ambercare.app service as adoption allows; **keep the prod API alias indefinitely** until old-app traffic is negligible.

## 7. Safety & risks

- **Never break `murror.api.ambercare.app`** — it's baked into released apps. Permanent alias.
- **TLS per new host** — each murror.app host needs a cert (Cloudflare edge + cert-manager/origin on the ingress).
- **`auth.` / `notifications.`** — verify live usage before touching (sensitive; may be legacy or live).
- **vps40 cleanup** — rotate the prod DB creds + `VIASR_API_KEY` after retiring (the box held prod creds; `VIASR_API_KEY` was surfaced in a 2026-06-05 terminal session and should be rotated regardless).
- **Landmine A** — repo "production" helm/CI values reference ambercare.app / the wrong cluster. Do **not** trust them; verify every change against the live do-sfo2 cluster.
- **Gated deletes** — every ambercare.app record deletion is gated on (a) a verified murror.app replacement and (b) a no-live-traffic check.

## 8. Open items

- Confirm vps40 = `65.49.60.35` (Astro to check the hosting-provider dashboard).
- Decide the retention window for the prod API alias (default: indefinite).
- Inventory the mobile **prod** `.env` for any direct ambercare.app references beyond the API host.
- Confirm the geo-router Worker can be retired (prod is DNS-only; Worker appears vestigial).
