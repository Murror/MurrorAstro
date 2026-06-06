# Ambercare.app → Murror.app Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all Murror infrastructure to `murror.app` under one Cloudflare account and retire `ambercare.app` per-service, with zero disruption to live users.

**Architecture:** Transparent-alias, build-before-retire. Each live `ambercare.app` host gets a `murror.app` twin pointing at the same origin; only after the twin is verified live do we switch internals and (eventually) retire the old host. The baked prod API host `murror.api.ambercare.app` stays as a permanent alias.

**Tech Stack:** Cloudflare (DNS, Tunnels, R2, Workers), DigitalOcean DOKS (do-sfo2), Kubernetes ingress-nginx + cert-manager, NestJS (murror-api), FastAPI (viasr-api), React Native (mobile).

**Companion design doc:** `docs/plans/2026-06-05-ambercare-to-murror-migration-design.md`

**Golden rules (every task obeys these):**
1. **Never delete an `ambercare.app` record** until its `murror.app` twin is verified serving identical responses.
2. **Never break `murror.api.ambercare.app`** — it is baked into released apps. Permanent alias.
3. **Verify against the LIVE do-sfo2 cluster**, never repo "production" values (Landmine A: they target the wrong cluster).
4. After each change, run the prod health check and confirm green before moving on.

**Cluster context:** `kubectl config use-context do-sfo2-murror-cluster`. Prod API/AI = namespaces `nsp-prod-murror` / `nsp-prod-murror-ai`, origin IP `159.89.222.109`.

---

## Phase 1 — Dead DNS cleanup (low risk, immediate win)

### Task 1.1: Build the verified-dead kill-list

**Files:**
- Create: `docs/plans/migration/phase1-killlist.md` (working artifact)

**Step 1: List candidate-dead records** (from the design doc §3 dead list):
`admin`, `web`, `statistic-api`, `alpha.statistic-api`, `alpha.cost-api`, `alpha.admin`, `alpha.web`, `alpha.notifications`, `us.kol`, `vn.kol`, `us.murror.api`, `alpha-us.murror.api`, `alpha-us.ai.api`, `rabbitmq`, `dev.rabbitmq`, `cdn-alpha`, `*.api`, `*.app`, `*.portal`, `*.conversation.ai.api`, `*.ai.api`, `*.murror.api`, the stale `_acme-challenge.mu-*` TXTs, and the 2 typo records `dev.api.murror.app.ambercare.app` + `ssh.murror.app.ambercare.app`.

**Step 2: Per-record "nothing live points here" check.** For each:
```bash
H=admin.ambercare.app
echo "== $H =="
dig +short $H                                   # current target
curl -sS -m 8 -o /dev/null -w "%{http_code}\n" "https://$H/" || echo "no-response"
grep -rn "$H" /Users/astro/Projects/murror-transfer/Murror --include="*.ts" --include="*.py" --include="*.json" --include="*.yml" --include="*.env*" 2>/dev/null | grep -viE "node_modules|/dist/" | head
```
Mark DEAD only if: target is a decommissioned IP (`15.235.x` OVH, `14.225.210.108` VN, `154.26.131.23`, `65.49.60.35` once vps40 retired) **and** no live code references it **and** it does not serve a 2xx for a real route.

**Step 3:** Record verdicts (DEAD / KEEP / VERIFY) in `phase1-killlist.md`.

**Step 4: Commit**
```bash
git add docs/plans/migration/phase1-killlist.md
git commit -m "docs(migration): phase1 dead-DNS kill-list with per-record verification"
```

### Task 1.2: Delete the verified-DEAD records

**Step 1:** In Cloudflare (Ambercare.app account → Domains → ambercare.app → DNS), delete only the records marked DEAD in Task 1.1. Do them in small batches.
> NOTE: the API token in this environment is scoped and cannot edit this zone — Astro deletes via dashboard, OR provides a zone-scoped token for `cloudflare.request({method:'DELETE', path:'/zones/{zone_id}/dns_records/{id}'})`.

**Step 2: Verify no regression** — run the prod health check; confirm all live endpoints still green:
```bash
curl -sS -m 10 -w "\n%{http_code}\n" https://murror.api.ambercare.app/api/health
curl -sS -m 10 -w "\n%{http_code}\n" https://murror-ai.api.ambercare.app/health/readiness-k8s
```
Expected: both 200, unchanged.

**Step 3: Commit** the updated kill-list (mark rows "deleted YYYY-MM-DD").

---

## Phase 2 — Prod API + AI murror.app aliases (additive, verify parity) — ✅ DONE 2026-06-05

**Executed:** `api.murror.app` + `ai.murror.app` → do-sfo2 `159.89.222.109` (DNS-only, repointed the dead `api.murror.app → 20.46.249.55`). Added both hosts to the live prod ingresses (`murror-api` in nsp-prod-murror, `murror-ai` in nsp-prod-murror-ai) via additive `kubectl patch` (new rule + new tls secret `murror-api-murrorapp-tls` / `murror-ai-murrorapp-tls`). cert-manager `letsencrypt-prod` auto-issued both certs (HTTP-01). Parity verified: both twins return identical 200 to their ambercare originals; originals untouched. Ingress backups at `/tmp/ingress-bak/`.
**⚠️ Durability follow-up:** changes were live `kubectl patch` (out-of-band). Add `api.murror.app`/`ai.murror.app` to the repo ingress manifests so a future re-apply doesn't drop them.

### (original plan below)
## Phase 2 — Prod API + AI murror.app aliases (additive, verify parity)

### Task 2.1: Add `api.murror.app` + `ai.murror.app` to the live ingress + TLS

**Files:**
- Modify (live, do-sfo2): the murror-api ingress in `nsp-prod-murror` and the murror-ai ingress in `nsp-prod-murror-ai`. (Capture live manifests first — repo values are Landmine-A-stale.)

**Step 1: Snapshot the live ingresses** (so changes are reversible):
```bash
kubectl -n nsp-prod-murror get ingress -o yaml > /tmp/murror-api-ingress.bak.yaml
kubectl -n nsp-prod-murror-ai get ingress -o yaml > /tmp/murror-ai-ingress.bak.yaml
```

**Step 2: Add the new host** to each ingress `spec.rules` (a new rule with `host: api.murror.app` / `ai.murror.app`, same backend service/port) and to `spec.tls` (new host on a cert-manager-issued cert, e.g. a `murror-app-tls` secret). Apply via a reviewed patch (not the repo's stale values):
```bash
kubectl -n nsp-prod-murror patch ingress <name> --type=json \
  -p '[{"op":"add","path":"/spec/rules/-","value":{"host":"api.murror.app","http":{"paths":[<copy existing path block>]}}}]'
# repeat tls host add; repeat for murror-ai with ai.murror.app
```

**Step 3: Verify cert issued**:
```bash
kubectl -n nsp-prod-murror get certificate
kubectl -n nsp-prod-murror describe certificate <murror-app-tls> | grep -iE "ready|issued"
```
Expected: `Ready=True` for the new host.

### Task 2.2: Add the Cloudflare DNS records

**Step 1:** In the murror.app zone, add (DNS-only / grey-cloud, matching the prod ambercare.app records):
```
api.murror.app  A  159.89.222.109   (DNS-only)
ai.murror.app   A  159.89.222.109   (DNS-only)
```
(Astro via dashboard, or zone-scoped API.)

**Step 2: Verify resolution**:
```bash
dig +short api.murror.app   # -> 159.89.222.109
dig +short ai.murror.app    # -> 159.89.222.109
```

### Task 2.3: Verify parity (the "test")

**Step 1:** Hit the new hosts and confirm identical behavior to the old ones:
```bash
for H in murror.api.ambercare.app api.murror.app; do
  echo "== $H =="; curl -sS -m 10 -w "\n%{http_code}\n" "https://$H/api/health"; done
for H in murror-ai.api.ambercare.app ai.murror.app; do
  echo "== $H =="; curl -sS -m 10 -w "\n%{http_code}\n" "https://$H/health/readiness-k8s"; done
```
Expected: new hosts return the same 200 + body as the old hosts. **Do not proceed if they differ.**

**Step 2: Commit** the ingress patch manifests into the repo (so it's reproducible, not just live-patched):
```bash
git add k8s/<prod-ingress-manifests>
git commit -m "feat(migration): add api.murror.app + ai.murror.app aliases to prod ingress (build-before-retire)"
```

---

## Phase 3 — Files → `files.murror.app`

### Task 3.1: Add the R2 custom domain

**Step 1:** Cloudflare → R2 → the bucket behind `files.ambercare.app` → Custom Domains → add `files.murror.app`. Wait for active.

**Step 2: Verify** a known object loads on both hosts:
```bash
curl -sS -m 10 -o /dev/null -w "%{http_code}\n" "https://files.ambercare.app/<known-key>"
curl -sS -m 10 -o /dev/null -w "%{http_code}\n" "https://files.murror.app/<known-key>"
```
Expected: both 200, identical bytes.

**Step 3:** Record in the migration log. (No code switch yet — that's Phase 4.)

---

## Phase 4 — Switch internal / service refs to murror.app

### Task 4.1: Inventory and switch external references

**Step 1: Find every committed reference** to the live ambercare.app hosts that is NOT the in-cluster service DNS:
```bash
grep -rnE "murror\.api\.ambercare\.app|murror-ai\.api\.ambercare\.app|files\.ambercare\.app" \
  /Users/astro/Projects/murror-transfer/Murror --include="*.ts" --include="*.py" --include="*.json" \
  --include="*.yml" --include="*.env*" 2>/dev/null | grep -viE "node_modules|/dist/" | tee /tmp/refs.txt
```

**Step 2:** For each external ref (webhooks, CI configs, cross-service base URLs, third-party callbacks), change to the murror.app twin. **Leave in-cluster `*.svc.cluster.local` URLs unchanged** (they never touched ambercare.app).

**Step 3:** One small PR per repo (murror-api, viasr-api, configs). Each PR: change refs → CI green → deploy to staging → verify → deploy prod via `deploy-doks`.

**Step 4: Verify** the live flow end-to-end after each deploy (health + one real request through the changed path).

**Step 5: Commit / PR** per repo with message `refs(migration): point <service> at murror.app twin`.

---

## Phase 5 — New mobile build uses murror.app

### Task 5.1: Point mobile prod config at murror.app

**Step 1:** In the mobile repo (`MurrorMobile`), inventory prod env refs:
```bash
grep -rnE "ambercare\.app" <MurrorMobile> --include="*.ts" --include="*.tsx" --include="*.json" --include="*.env*" | grep -viE "node_modules"
```

**Step 2:** Update the **prod** `.env` API/AI/files hosts to `api.murror.app` / `ai.murror.app` / `files.murror.app`. Do NOT touch `.env.production` if it is the live-prod scheme — confirm which env file the release build uses first (see memory: never touch production env without confirmation).

**Step 3: Verify** on a simulator/dev build that the app reaches the murror.app endpoints and all core flows work.

**Step 4:** Ship as a normal app release. **Released apps keep using `murror.api.ambercare.app` via the alias** — no forced update.

**Step 5: Commit** on the mobile integration branch (`staging-environment-setup`), open PR.

---

## Phase 6 — Dev/inference/remote rebuild + vps40 retirement

### Task 6.1: Stand up the murror.app tunnel

**Step 1:** Create a NEW Cloudflare Tunnel (in the murror.app context) for `remote./ssh./terminal./dev.api./ai.api./inference.murror.app`, on whatever box should host dev/inference going forward (NOT the old vps40). Run `cloudflared` there.

**Step 2: Verify** each new host responds (after the box is up).

### Task 6.2: Switch references off the old tunnel

**Step 1:** Update the PC-remote memory + any tooling that calls `remote.ambercare.app` to `remote.murror.app`. Update dev configs from `dev.api.ambercare.app` → `dev.api.murror.app` (latter already exists).

### Task 6.3: Retire the vps40 box (gated on Phases 2-6 done)

**Step 1:** Confirm vps40 (`65.49.60.35` / the tunnel box) no longer serves anything live (DNS twins all moved + verified).

**Step 2:** Power off the box.

**Step 3: ROTATE SECRETS** (it held prod creds): rotate the prod DB password AND `VIASR_API_KEY`. Update the K8s secrets, roll the deployments, verify health. (Watch Supabase failed-auth logs — they reveal any straggler still using old creds, incl. confirming vps40's IP.)

**Step 4:** Delete the old tunnel DNS records (`remote./ssh./terminal./dev.api./ai.api./inference.ambercare.app`) once the murror.app twins are verified.

---

## Phase 7 — Staging / alpha sweep

### Task 7.1: Finish non-prod hosts

**Step 1:** Confirm dev/staging API already on murror.app (`dev.api.murror.app`, `staging.api.murror.app`). Add any missing staging/alpha twins (auth, files, notifications) the same build-before-retire way.

**Step 2:** Update staging/alpha configs + CI to murror.app. Verify each env health.

---

## Phase 8 — Per-service ambercare.app retirement (ongoing, gated)

### Task 8.1: Retire as adoption allows

**Step 1:** For each non-API ambercare.app service whose consumers are fully migrated + verified, delete its DNS record (after a final no-traffic check via Cloudflare analytics).

**Step 2:** **Keep `murror.api.ambercare.app` (+ `ai`) as a permanent alias** until Cloudflare analytics show old-app traffic is negligible. Only then schedule its retirement (likely a future app force-update decision — separate call).

**Step 3:** Final state: murror.app canonical for everything; ambercare.app down to just the legacy app alias (or fully retired + domain parked).

---

## Verification checklist (run after every phase)
- [ ] `https://murror.api.ambercare.app/api/health` → 200 (never breaks)
- [ ] `https://murror-ai.api.ambercare.app/health/readiness-k8s` → 200
- [ ] New murror.app twin returns identical response to its ambercare.app source
- [ ] Prod 6-hour health check email still green
- [ ] No ambercare.app record deleted without a verified murror.app twin
