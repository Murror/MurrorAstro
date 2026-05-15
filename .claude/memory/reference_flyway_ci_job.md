---
name: Flyway-in-CI Job template — imagePullSecrets required
description: viasr-api migration Job template must reference ghcr-secret; private ghcr.io pull otherwise 401s and Job hangs to activeDeadlineSeconds
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
The viasr-api CI runs a standalone K8s Job `murror-ai-migration-<tag>-<ts>` per deploy to apply Flyway migrations before rolling pods. Template lives at `viasr-api/k8s/migration-job.yaml`; renderer at `viasr-api/scripts/ci/run-flyway-migration.sh`.

**The Job template MUST include `imagePullSecrets: [{name: ghcr-secret}]`.** The migration image `ghcr.io/murror/murror-ai-migration:<tag>` is private — without the pull secret, every pod hits `failed to authorize: ... 401 Unauthorized`, stays in `ImagePullBackOff`, and the Job silently hangs until `activeDeadlineSeconds: 900` trips. The deploy step then fails with DeadlineExceeded and no useful log (pod is gone by the time CI tries to read it).

Signature of this exact bug: Flyway Job runs 15min in CI but an identical manually-applied Job + identical image tag finishes in seconds — the manual test probably used a public flyway/flyway image or already-cached layers and didn't exercise the pull path.

**Pull secret canonical name:** `ghcr-secret` (type `kubernetes.io/dockerconfigjson`). Exists in all three namespaces and is the same secret the main `murror-ai` Deployment uses. A `registry-murror` secret also exists but `ghcr-secret` is the one referenced by the API deploy, so keep the migration Job consistent with it.

**Port note:** Inside the migration Job we parse `SUPABASE_CONNECTION` and rebuild the JDBC URL with port **5432** (session mode) — NOT 6543 (pgbouncer transaction mode). DDL and Flyway's advisory lock need session mode. Runtime services still use 6543 per the pgbouncer/Prisma rule.

Fix shipped in viasr-api PR #369, commit 22bb918, on 2026-04-19.
