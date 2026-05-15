---
name: viasr-api K8s Secret layout — app-secret is a ghost, pods read murror-ai-secrets
description: In nsp-*-murror-ai namespaces, the K8s Secret CI creates (app-secret) is NOT what the pods read; all three deployments envFrom murror-ai-secrets which is helm-seeded + ad-hoc patched
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
**Two K8s Secrets exist in each `nsp-*-murror-ai` namespace:**

| Name | Source | Consumed by |
|---|---|---|
| `app-secret` | CI `create-k8s-secret` step (`.github/workflows/ci.yaml` ~line 200, `secret-name: "app-secret"`) — recreated every deploy with 16 keys | **Nothing.** Ghost. None of the three deployments reference it. |
| `murror-ai-secrets` | Helm install (one-time) + ad-hoc kubectl patches from CI actions | `murror-ai`, `murror-ai-worker`, `murror-ai-beat` — all three `envFrom: [{secretRef: {name: murror-ai-secrets}}]` |

**How `murror-ai-secrets` actually gets updated:**
- Seeded by a one-time `helm install` using `helm/values.yaml` `secrets:` block (but the helm template's `{{- if and $value (ne $value "") }}` filter means only non-empty entries get emitted, so values.yaml alone doesn't suffice)
- Incrementally patched by ad-hoc `kubectl patch secret murror-ai-secrets` calls in composite actions (see `.github/actions/redis-helm-deploy/action.yml` for the REDIS_PASSWORD pattern, and `ci.yaml` "Patch Spotify credentials" step added in PR #395 for SPOTIFY_CLIENT_ID/SECRET)

**Practical rules when adding a new credential env var:**
1. Add a GitHub Actions repo secret in `Murror/viasr-api` via `gh secret set`
2. DO NOT add an entry to the `app-secret` key-value-pairs block in ci.yaml — it won't reach the pod
3. Add a `kubectl patch secret murror-ai-secrets --type=merge` step in ci.yaml (mirror the Spotify step from PR #395)
4. Place the patch step BEFORE the `kubectl set image` rollouts so the rolling ReplicaSet picks up the new env vars
5. The matrix already targets alpha + staging + production namespaces, so one PR covers all envs

**Cleanup debt:** the `app-secret` K8s Secret and the ci.yaml step that creates it are dead code. Safe to delete in a future cleanup PR, but out of scope for launch.

**Discovered:** 2026-04-21 during Bug F / Spotify wiring investigation. Confirmed via readonly `kubectl get deploy murror-ai -o yaml` showing `envFrom: [{secretRef: {name: murror-ai-secrets}}]` only.
