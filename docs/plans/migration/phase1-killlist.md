# Phase 1 — ambercare.app dead-DNS kill-list

> **STATUS: ✅ EXECUTED 2026-06-05.** All 44 dead records deleted via Cloudflare API (Astro confirmed the murror-platform suite is unused). ambercare.app went 58 → 14 records (only live prod API/AI, R2 files, tunnel CNAMEs, apex/www remain). Live prod health verified green (murror.api + murror-ai.api both 200) post-delete. Follow-up: drop `us.kol` from murror-api `cors.util.ts` (now inert).

Generated 2026-06-05 from the DNS export + live verification (HTTP probe + code-ref grep across the Murror umbrella). Live prod = do-sfo2 only runs `murror-api` + `murror-ai`; every other service referenced below lives in the abandoned `murror-platform` apps or legacy boxes.

Legend: **DELETE** = safe now · **PHASE 6** = delete when the vps40 / legacy-platform boxes retire · **DECIDE** = needs Astro (is it still used?) · **KEEP** = live/required.

## ✅ DELETE NOW (high confidence)
| Record | Target | Why safe |
|---|---|---|
| `dev.api.murror.app.ambercare.app` | tunnel | **Typo** — meant to be `dev.api.murror.app`, landed in wrong zone |
| `ssh.murror.app.ambercare.app` | tunnel | **Typo** — same |
| `vn.kol.ambercare.app` | `14.225.210.108` (VN) | VN cluster decommissioned; prod has zero VN dependency; 0 live refs |
| `rabbitmq.ambercare.app` | `14.225.210.108` (VN) | VN box; 0 refs; prod uses in-cluster RabbitMQ |
| `dev.rabbitmq.ambercare.app` | `163.61.110.117` | Not responding; 0 refs |
| `cdn-alpha.ambercare.app` | `rustfs.sg3.canhnv.com` | sg3 decommissioned + former-eng personal domain; 0 refs |
| `api.auth.us.ambercare.app` | `65.49.60.35` | 503, 0 refs |
| `alpha.cost-api.ambercare.app` | `15.235.211.39` (OVH) | 503, 0 refs |
| `alpha-us.ai.api.ambercare.app` | `65.49.60.35` | 404, 0 refs |
| `alpha-us.murror.api.ambercare.app` | `65.49.60.35` | 404, 0 refs |
| `auth-ui.ambercare.app` | `65.49.60.35` | 404, 0 refs |
| `auth.ambercare.app` | `65.49.60.35` | **Verified 2026-06-05:** live auth = Supabase; `auth.ambercare.app` only in abandoned `murror-platform/auth-service`. Not used by live |
| `notifications.ambercare.app`, `alpha.notifications.ambercare.app` | `65.49.60.35` / OVH | **Verified 2026-06-05:** live push = OneSignal (`ONESIGNAL_APP_ID=6640c83b…` in prod pod, wired in murror-api + viasr); zero `notifications.ambercare.app` refs in live code. Not used by live |
| `_acme-challenge.mu-{36,59,66,69,70,81,88,102,107}.*` (TXT) | — | Stale DNS-01 challenges for `mu-NN` subdomains that no longer exist |

## 🟡 PHASE 6 (delete when the legacy platform + vps40 box retire)
These point to the abandoned `murror-platform` microservices (still answering on old boxes `65.49.60.35` / OVH `15.235.x`, but NOT running on live do-sfo2). Retire together with the vps40 / legacy-platform decommission.
| Record | Target | Service (murror-platform app) |
|---|---|---|
| `admin.ambercare.app`, `alpha.admin.` | 65.49.60.35 / OVH | admin-portal |
| `web.ambercare.app`, `alpha.web.` | 65.49.60.35 / OVH | web-client |
| `statistic-api.`, `alpha.statistic-api.` | 65.49.60.35 / `15.235.197.12` | statistic-service |
| `auth-alpha.`, `auth-ui-alpha.`, `auth.us.` | OVH / 65.49.60.35 | auth-service (alpha/us) |
| `us.murror.api.`, `*.murror.api.` | 65.49.60.35 / OVH | abandoned multi-region API + geo-router |
| `*.api.`, `*.app.`, `*.portal.`, `*.conversation.ai.api.`, `*.ai.api.` | `154.26.131.23` / OVH | dev-k8s wildcards (verify nothing dev still resolves under them) |
| `_acme-challenge.alpha.murror.api`, `.alpha.ai.api`, `.dev.rabbitmq` (TXT) | — | stale unless alpha still renews certs on OVH |

## 🔍 DECIDE (Astro — is it still used by anyone?)
| Record | Target | Question |
|---|---|---|
| `auth.ambercare.app` | 65.49.60.35 (200) | Does anything still use the self-hosted auth-service? (Live mobile auth = Supabase, so likely no — confirm) |
| `notifications.ambercare.app`, `alpha.notifications.` | 65.49.60.35 / OVH (200) | Is the notification-service still used? (Live push = OneSignal — confirm) |
| `us.kol.ambercare.app` | 65.49.60.35 (404) | **In murror-api's live CORS allowlist** — is the KOL portal still live? If retired, delete + drop from `cors.util.ts` |

## KEEP (live / required)
| Record | Reason |
|---|---|
| `murror.api.ambercare.app` | LIVE prod API (baked into apps) — permanent alias |
| `murror-ai.api.ambercare.app` | LIVE prod AI |
| `files.ambercare.app` | LIVE R2 storage (Phase 3 → files.murror.app) |
| `ai.api`, `dev.api`, `inference`, `remote`, `ssh`, `terminal` | Tunnel box (Phase 6 rebuild under murror.app) |
| `ambercare.app` / `www` (apex) | ✅ 2026-06-05: Cloudflare Redirect Rule 301s apex + www → murror.app (path/query preserved). Live API/AI/files subdomains unaffected. |
| `_acme-challenge` apex google-site-verification TXT | Domain verification |

## Next action
Astro deletes the **DELETE NOW** set in Cloudflare (Ambercare.app → DNS), then answers the 3 **DECIDE** questions. Re-run the prod health check after deletion (must stay green).
