---
name: CI static-token DOKS kubeconfig
description: How to build a ServiceAccount token-based kubeconfig so GitHub Actions runners can deploy to DOKS without doctl. Required because DOKS's default kubeconfig uses an exec-plugin (doctl) that isn't available on runners.
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Problem

DOKS (`doctl kubernetes cluster kubeconfig save`) emits a kubeconfig whose `user.exec` block calls `doctl kubernetes cluster kubeconfig exec-credential`. GitHub-hosted runners don't have `doctl`, so every `kubectl` command fails with `exec: executable doctl not found`. Installing doctl on runners is possible but adds auth brittleness — a static ServiceAccount token is the clean permanent fix.

## The fix — ServiceAccount + ClusterRoleBinding + Secret

Apply this to the DOKS cluster once. Namespace is `kube-system` so the SA is cluster-scoped for admin ops.

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

`cluster-admin` is intentional — CI needs to apply manifests, create secrets, patch deployments, run Jobs. Scope down later if we split deploy roles.

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

base64 -i ci-kubeconfig.yaml | pbcopy   # paste into KUBE_CONFIG GitHub env secret
```

## Where to set it

`KUBE_CONFIG` must be a base64-encoded kubeconfig, set as a GitHub **environment** secret (not repo secret) on every env that deploys:

| Repo | Environments |
|------|--------------|
| murror-api | staging, alpha, production |
| viasr-api | staging, alpha, production |

Deploy actions decode with `echo "$KUBE_CONFIG" | base64 -d > kubeconfig.yaml` then export `KUBECONFIG=./kubeconfig.yaml`.

## Verification

- `kubectl --kubeconfig=./ci-kubeconfig.yaml get ns` should list all namespaces.
- Token does not expire (unlike `kubectl create token`'s default 1h).
- If rotated, only `ci-deploy-token` secret needs regen; the SA + binding stay.

## Why not `kubectl create token`

That command produces a short-lived token (1h default, max 48h). Workflows that sleep between steps or are re-run would fail. The Secret-backed token is non-expiring until the Secret is deleted.
