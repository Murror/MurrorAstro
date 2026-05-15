# Runbook: CI Kubeconfig (DOKS deploys from GitHub Actions)

**When to use:** setting up CI deploys for a new repo, rotating the `KUBE_CONFIG` secret, debugging "exec: doctl not found" or expired-token errors in CI logs.
**Prerequisites:** DOKS cluster admin access, GitHub repo admin access.

---

## The problem this solves

DigitalOcean Kubernetes' default kubeconfig (from `doctl kubernetes cluster kubeconfig save`) uses an **exec-plugin** that calls `doctl kubernetes cluster kubeconfig exec-credential`. GitHub-hosted runners don't have `doctl` installed — every `kubectl` command fails with `exec: executable doctl not found`.

Installing `doctl` on the runner is possible but adds auth brittleness (token rotation, env var hygiene, etc.). The clean permanent fix: a **static ServiceAccount token** that doesn't expire and doesn't depend on any external CLI.

---

## One-time setup on the cluster

Apply this manifest once. Namespace is `kube-system` so the SA is cluster-scoped for admin ops.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deploy
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ci-deploy-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: ci-deploy
  namespace: kube-system
---
apiVersion: v1
kind: Secret
metadata:
  name: ci-deploy-token
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: ci-deploy
type: kubernetes.io/service-account-token
```

`cluster-admin` is intentional — CI needs to apply manifests, create secrets, patch deployments, run Jobs across multiple namespaces. Scope this down later if/when deploy roles split (e.g., per-env CI service accounts).

Apply with: `kubectl apply -f ci-deploy-sa.yaml`.

---

## Build the kubeconfig

```bash
TOKEN=$(kubectl -n kube-system get secret ci-deploy-token -o jsonpath='{.data.token}' | base64 -d)
CA=$(kubectl -n kube-system get secret ci-deploy-token -o jsonpath='{.data.ca\.crt}')
SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

cat > ci-kubeconfig.yaml <<EOF
apiVersion: v1
kind: Config
clusters:
- name: doks
  cluster:
    server: $SERVER
    certificate-authority-data: $CA
users:
- name: ci-deploy
  user:
    token: $TOKEN
contexts:
- name: ci
  context:
    cluster: doks
    user: ci-deploy
current-context: ci
EOF

# Encode + copy to clipboard for pasting into GitHub
base64 -i ci-kubeconfig.yaml | pbcopy
```

---

## Where to set `KUBE_CONFIG`

`KUBE_CONFIG` is a **base64-encoded kubeconfig**, set as a **GitHub environment secret** (NOT a repo secret) on every environment that deploys.

| Repo | Environments needing `KUBE_CONFIG` |
|---|---|
| `murror-api` | `staging`, `alpha`, `production` |
| `viasr-api` | `staging`, `alpha`, `production` |

GitHub UI: Repo → Settings → Environments → `<env>` → Environment secrets → New environment secret → name `KUBE_CONFIG`, value the base64 blob.

---

## How CI consumes it

In each deploy action / job:

```yaml
- name: Setup kubeconfig
  run: |
    echo "$KUBE_CONFIG" | base64 -d > kubeconfig.yaml
    echo "KUBECONFIG=$PWD/kubeconfig.yaml" >> $GITHUB_ENV
  env:
    KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}

- name: Deploy
  run: kubectl apply -f manifests/...
```

---

## Verification

```bash
# Locally, after building ci-kubeconfig.yaml:
kubectl --kubeconfig=./ci-kubeconfig.yaml get ns
# Should list all namespaces.
```

The token does NOT expire (unlike `kubectl create token`'s default 1-hour TTL). It only goes away if the `ci-deploy-token` Secret is deleted.

---

## Why not `kubectl create token`?

That command produces a short-lived token (1h default, 48h max). Workflows that sleep between steps or are re-run after delays would fail with auth errors. The Secret-backed token is non-expiring until you explicitly rotate.

---

## Rotation

When the token needs rotation (engineer leaves, suspected leak, etc.):

```bash
# Delete + recreate the Secret to get a new token
kubectl delete secret ci-deploy-token -n kube-system
kubectl apply -f ci-deploy-sa.yaml   # the Secret resource recreates with a fresh token

# Then rebuild the kubeconfig (above) and update KUBE_CONFIG in GitHub
```

The SA + ClusterRoleBinding stay; only the Secret rotates.

---

## viasr-api K8s Secret gotcha

When deploying to viasr-api namespaces (`nsp-*-murror-ai`), be aware: **the `app-secret` K8s Secret created by CI is NOT what the pods read.** Pods read `murror-ai-secrets` (helm-seeded + ad-hoc-patched).

When adding a new credential env var:
1. Add a GitHub Actions repo secret in `Murror/viasr-api`
2. **Do NOT** add an entry to the `app-secret` block in `ci.yaml` — it won't reach the pod
3. Add a `kubectl patch secret murror-ai-secrets --type=merge` step in `ci.yaml`, mirroring the Spotify pattern from PR #395
4. Place the patch step BEFORE the `kubectl set image` rollouts so the rolling ReplicaSet picks up the new env vars
5. Matrix already targets alpha + staging + production namespaces — one PR covers all envs

---

## Cross-references

- viasr-api K8s Secret layout: `reference_viasr_ai_k8s_secret_layout.md` (memory)
- Architecture overview: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
