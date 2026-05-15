---
name: Migration Job needs imagePullPolicy=Always (and no backticks in heredoc comments)
description: Root cause + fix for the 2026-04-20 "3 deploys ran the same broken SQL" staging incident, plus the heredoc-syntax follow-up
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Symptom

- Migration SQL fix PR is merged, new image is built and pushed, deploy is green, but the Prisma `migrate deploy` step keeps failing with **the exact same error from before the fix**.
- `kubectl describe pod murror-migration-…` shows every Job pod (across multiple deploys) pulled **the same image digest** — no re-pull happened.

## Root cause

`.github/actions/deploy/action.yml` generates the migration Job YAML inline via a bash heredoc. The Job template was missing `imagePullPolicy`, so kubelet defaulted to `IfNotPresent` (default for any tag that isn't `:latest` or a digest).

On staging/alpha the tag is mutable — every deploy re-pushes `murror-migration:<version>-<env>` to a new digest. `IfNotPresent` means each node caches whatever digest it pulled first and reuses it forever. Subsequent migration Jobs scheduled on that node silently run **stale migration SQL**.

Same class of bug as `incident_prod_viasr_readiness_probe_2026_03_26.md` ("same image tag = no K8s rollout").

## Fix

In `.github/actions/deploy/action.yml`, inside the inline Job template:

```yaml
containers:
- name: migration
  image: ${{ inputs.REGISTRY }}/${{ inputs.REPOSITORY_OWNER }}/murror-migration:${{ inputs.IMAGE_TAG }}
  imagePullPolicy: Always     # force re-pull on every Job because tag is mutable
```

Shipped in PR #335 (commit `ccc5dd1`), 2026-04-20.

## Secondary gotcha — backticks in heredoc comments

PR #335's first attempt wrapped the word `<version>-<env>` in backticks inside a YAML comment. The heredoc is `cat <<EOF` (UNQUOTED — required because the script interpolates `$JOB_NAME` and GHA `${{ }}` expressions). Unquoted heredocs expand **both** `$vars` and backtick command substitution.

```
command substitution: line 15: syntax error near unexpected token 'newline'
Process completed with exit code 2
```

Fix shipped in PR #336 (commit `8401e3c`): remove the backticks. Cannot quote the heredoc (`<<'EOF'`) because that would break `$JOB_NAME` / `${{ }}` interpolation.

**Rule of thumb:** never put backticks (or unescaped `$`) in a comment inside an unquoted bash heredoc — they're still parsed.

## How to verify the fix worked

After a deploy:

```bash
kubectl get pods -n nsp-staging-murror -l job-name=murror-migration-<timestamp>
kubectl logs -n nsp-staging-murror <migration-pod> | grep "Applying migration"
kubectl describe pod -n nsp-staging-murror <migration-pod> | grep "Image ID"
```

Expect: `Applying migration` line for the new migration + an `Image ID` (digest) that differs from the previous failing deploy's digest.

## Related

- `reference_flyway_ci_job.md` — sibling gotcha (Job template needs `imagePullSecrets: [{name: ghcr-secret}]`)
- `incident_prod_viasr_readiness_probe_2026_03_26.md` — same class (mutable tag masking a rollout)
