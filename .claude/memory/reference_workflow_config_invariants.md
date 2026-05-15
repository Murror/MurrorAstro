---
name: Workflow-config invariants across repos
description: CI triggers, imagePullSecrets, base-branch behavior must stay in sync across viasr-api/murror-api/MurrorMobile — and fixes to base-branch-read config must land on that base branch
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## The three repos with parallel CI/deploy configs

| Repo | Workflow file | Deploys |
|---|---|---|
| viasr-api | `.github/workflows/ci.yaml` | FastAPI + Celery worker/beat to `nsp-{dev,staging,prod}-murror-ai` |
| murror-api | `.github/workflows/ci.yml` + `deploy-matrix.yml` | NestJS to `nsp-{dev,staging,prod}-murror` |
| MurrorMobile | `.github/workflows/*.yml` | TestFlight build uploads |

These repos have the SAME structural setup (main + staging + production branches, staging-first deploy pattern, same kubectl context). When the shape of CI config changes in one, it almost always needs to change in the other two.

## Invariants to preserve

1. **`pull_request.branches` must include every long-lived branch that receives PRs.** For this codebase that means at minimum `[main, staging]`. Without `staging`, pre-merge CI silently skips and PRs merge blind. Saga: 2026-04-21 — PR #393 and #347 both merged-ready with zero pre-merge CI because staging wasn't in the trigger list.

2. **GitHub reads the workflow file from the BASE branch of a `pull_request`.** A fix landed only on `main` does NOT help PRs that target `staging`. Any CI trigger/behavior fix must land on the base branch it's meant to cover — usually via a second PR to `staging`, or by merging `main → staging` explicitly.

3. **`imagePullSecrets: ghcr-secret` must be set on every K8s Job/Deployment that pulls private GHCR images.** Migration Job incident 2026-04-19 (PR #335/#336): without it, the pod 401s and the Job hangs to `activeDeadlineSeconds`.

4. **`imagePullPolicy: Always`** on Jobs/Deployments whose image tag is mutable (`staging-<shortsha>`, `latest`, etc.). Otherwise `IfNotPresent` runs stale cached SQL/code.

5. **Kubeconfig secrets use the CI static-token pattern** (ServiceAccount + non-expiring token Secret), not exec-plugin kubeconfig. Exec-plugin variants fail on GitHub runners. See `reference_ci_token_kubeconfig.md`.

## When editing CI/deploy config in one repo, reflex-check the other two

Before merging a CI/infra change in any of the three repos, run this check:

```bash
for repo in viasr-api murror-api MurrorMobile; do
  grep -A 5 'pull_request:\|push:\|ghcr-secret\|imagePullPolicy' \
    ~/Projects/murror-transfer/Murror/$repo/.github/workflows/*.y*ml \
    ~/Projects/murror-transfer/Murror/$repo/k8s/*.yaml 2>/dev/null
done
```

If the output is asymmetric and the asymmetry isn't intentional (documented in a PR description), fix both/all three.

## Historical drift examples to avoid repeating

- **viasr-api PR #358 (2026-04-17):** CI pipeline rewrite set `pull_request.branches: [main]`. Never added `staging`. Gap surfaced 4 days later as PR #393 skipping CI.
- **murror-api PR #345 (2026-04-20):** fixed the same gap but merged only to `main`. Because GitHub reads the workflow from the base branch, staging PRs like #347 still skipped CI until PR #348 propagated the fix to staging.

Lesson: **local fix ≠ universal fix** when the three repos share architectural patterns. Always check the sibling repos and always check that the base branch has the version of the config you need.
