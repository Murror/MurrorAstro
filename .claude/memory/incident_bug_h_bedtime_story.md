---
name: Bug H — bedtime story missing on prod (missing beat deployment)
description: Root cause of Apr 20 missing bedtime story — `nsp-prod-murror-ai` has no murror-ai-beat pod, so the daily-voice-summary crontab never fires in prod
type: incident
originSessionId: 177ad938-2f97-48d7-81b3-a6b45eb8618d
---
## Bug H root cause (found 2026-04-22 PDT)

**Symptom:** Astro's bedtime story didn't generate on Apr 20, 2026 PDT (prod).

**Root cause:** `nsp-prod-murror-ai` namespace only has `murror-ai` + `murror-ai-celery-worker` deployments. The `murror-ai-beat` pod (Celery beat scheduler) exists only in `nsp-staging-murror-ai`, never in prod. The crontab schedule in `app/celery_app/utils.py:118-121` (`crontab(hour=3, minute=30)` = 8:30 PM PDT) is defined in code but has no process to fire it in prod. The entire voice-summary / bedtime-story pipeline is dormant in prod.

**Why: How to apply:** When prod promotion happens, the Helm release must include `murror-ai-beat` Deployment or equivalent CronJob. Staging already has this running — compare live staging manifest to the prod Helm values.

## Pipeline verification
- ✅ Statsig flag `voice_insights_enabled` defaults true
- ❌ Beat: no pod in prod → crontab never dispatches
- ❌ Worker: task registered but never invoked on Apr 20
- ❌ Downstream (murror-api POST → ElevenLabs → S3 → OneSignal): never reached
- DB table `murror_api.takeaway_reflections` (snake_case, 78 tables in schema) — no Apr 19-21 row for Astro's user `867fb7cb-728c-43ec-8747-4372ad0c2b20`

## Relevant paths
- `viasr-api/app/celery_app/utils.py` (beat schedule definition, lines 113-136)
- `viasr-api/app/tasks/voice/generate_daily_summary.py` (task body)
- `viasr-api/app/core/feature_flag/feature_flag_name.py` (flag default)
- `viasr-api/helm/` (prod beat Deployment missing from release)

## Fix scope
**Small — deploy-config only, no code change.** Ship the beat deployment manifest to prod. No runtime logic changes needed; pipeline code is correct.

## Launch-path implication
This is the ONLY launch-path item that needs prod-infra action beyond code promotion. Staging bedtime story WILL work today if tested. Prod bedtime story requires the beat deployment to land before it generates — add to promotion checklist.
