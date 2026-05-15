# Shared Memory Index

This directory contains team-shareable institutional knowledge captured during Astro's solo work with Claude over March–May 2026. **53 files** organized by type. They supplement (and link to) the longer-form docs at [`../../docs/`](../../docs/).

> **Per-engineer feedback memories (tone, style, personal preferences) are NOT in this shared directory.** Each engineer's own Claude Code installation maintains its own private feedback memory at `~/.claude/projects/.../memory/`. This file only contains the *team-relevant* subset.

## How Claude Code uses this

When you run `claude` inside any directory under `/Users/astro/Projects/murror-transfer/Murror/`, Claude Code auto-loads the relevant CLAUDE.md files. These memory entries become referenceable context — Claude can recall them when relevant to a task.

Cross-referenced in the per-repo CLAUDE.md files at `MurrorMobile/CLAUDE.md`, `murror-api/CLAUDE.md`, `viasr-api/CLAUDE.md`.

---

## 🏛 Architecture / system maps

These describe how the system fits together. Read [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) first for the synthesis; these are the raw notes that informed it.

- [DOKS infrastructure state](infrastructure.md) — K8s cluster layout, Redis, RabbitMQ, DB connection config, perf baselines
- [Backend consolidation status](project_backend_consolidation.md) — 100% of Edge Functions migrated to NestJS (March 31, 2026)
- [Emotional Memory Vault design](project_emotional_memory_vault.md) — 4-component AI system: Librarian + Callbacks + Memory Room + Pings
- [Eliminate legacy public.* schema](project_eliminate_legacy_schema.md) — post-launch sprint plan
- [Environment URLs + Supabase projects](reference_environment_urls.md) — canonical URLs, region info, namespaces
- [viasr-api K8s Secret layout](reference_viasr_ai_k8s_secret_layout.md) — `app-secret` is a ghost; pods read `murror-ai-secrets`
- [asyncpg + SQLAlchemy + pgbouncer fix](reference_asyncpg_sqlalchemy_pgbouncer.md) — the three-layer prepared-statement fix
- [Anthropic API constraints + gotchas](reference_anthropic_api_constraints.md) — trailing whitespace, empty user content, 1M context org-gating

---

## 🚨 Incident postmortems

Read [`../../docs/INCIDENT_LOG.md`](../../docs/INCIDENT_LOG.md) for the consolidated narrative; these are the source memory entries with full detail.

- [Prod viasr-api stuck 0/1 for 33h](incident_prod_viasr_readiness_probe_2026_03_26.md) — worker saturation. Resolved 2026-03-26.
- [Recurring "reflection stuck at generating"](incident_reflection_not_completing_recurring.md) — RMQ vhost parity is the most common cause. Resolved 2026-04-15.
- [Crisis detection gap on /chat/stream](incident_crisis_detection_gap.md) — safety-critical. Resolved 2026-04-22.
- [Bug H: bedtime story missing in prod](incident_bug_h_bedtime_story.md) — missing `murror-ai-beat` deployment. Resolved 2026-04-22.
- [Celery cross-env task contamination](incident_celery_cross_env_contamination.md) — shared Redis + default queue. Resolved 2026-04-23 via PR #402.
- [Callback Pings queue routing bug](incident_callback_pings_queue_routing_bug.md) — hardcoded `emotional_memory` queue with no consumers. Partial fix; feature kept disabled for launch.
- [Staging murror-api deployment stale](incident_staging_murror_api_stale_deployment.md) — image tag pinning kept staging on `0.40.0-staging`. Resolved in promotion PR #352.

---

## 📚 Runbooks (operational references)

Read [`../../docs/runbooks/`](../../docs/runbooks/) for the polished runbooks; these are the source notes.

- [App Store Connect API key](reference_appstore_connect.md) → [polished: app-store-connect.md](../../docs/runbooks/app-store-connect.md)
- [iOS TestFlight build process](reference_ios_build.md) → [polished: ios-build.md](../../docs/runbooks/ios-build.md)
- [Prod Health Check runbook](reference_prod_health_check_runbook.md) → [polished: prod-health-check.md](../../docs/runbooks/prod-health-check.md)
- [CI static-token DOKS kubeconfig](reference_ci_token_kubeconfig.md) → [polished: ci-kubeconfig.md](../../docs/runbooks/ci-kubeconfig.md)
- [Eval harness commands](reference_eval_harness.md) → [polished: eval-harness.md](../../docs/runbooks/eval-harness.md)
- [MURROR_DATABASE_URL_EXTERNAL](reference_migration_db_url_external.md) → [polished: db-migrations.md](../../docs/runbooks/db-migrations.md)
- [Staging environment](reference_staging_environment.md) → [polished: staging-environment.md](../../docs/runbooks/staging-environment.md)
- [Migration Job imagePullPolicy](reference_migration_job_imagepullpolicy.md) → referenced in db-migrations runbook
- [Flyway-in-CI Job needs ghcr-secret](reference_flyway_ci_job.md) → referenced in db-migrations runbook
- [Staging murror-api ingress gotcha](reference_staging_ingress.md) → referenced in staging-environment runbook
- [iOS ATS + OneSignal silent-failure gotchas](reference_ios_ats_onesignal_gotchas.md) — http:// loads blocked by iOS ATS, OneSignal 0-recipients returns HTTP 200 "success"

---

## ⚙️ Team conventions (the why behind CONVENTIONS.md)

The [`../../docs/CONVENTIONS.md`](../../docs/CONVENTIONS.md) doc is the synthesis. These are the source memories — useful when you want the "why" with date attached.

- [Always target staging](feedback_always_target_staging.md)
- [Back-merge PRs use merge-commit, never squash](feedback_backmerge_not_squash.md)
- [Always deploy to both staging and alpha](feedback_always_deploy_both_envs.md)
- [Never apply migrations out-of-band](feedback_no_out_of_band_migrations.md)
- [Always use PRs, never merge to main directly](feedback_never_merge_to_main_without_review.md)
- [Never touch production env / scheme](feedback_never_touch_production_env.md)
- [Code review BEFORE TestFlight / high-cost deploys](feedback_code_review_before_tf.md)
- [Test once at end of multi-task sprint](feedback_test_once_at_end.md)
- [Test full flow before asking anyone to test in simulator](feedback_test_before_asking_user.md)
- [Permanent fixes only — zero tolerance for band-aids](feedback_permanent_fixes_only.md)
- [Never break working code without explicit confirmation](feedback_never_break_working_code.md)
- [No em-dashes in app copy or AI prompts](feedback_no_em_dashes.md)
- [Run AI evals automatically after any AI/prompt change](feedback_run_evals_automatically.md)
- [Isolated git worktrees for parallel agents in the same repo](feedback_isolated_worktree_for_parallel_agents.md)
- [PgBouncer + Prisma: port 6543 + pgbouncer=true](feedback_pgbouncer_prisma.md)
- [Python str, Enum equality — compare to .value not NAME](feedback_python_str_enum_equality.md)

---

## 🌍 Project context

- [Mobile branch convention — staging-environment-setup, not staging](reference_mobile_branch_convention.md)
- [Environment priority — staging first](project_env_priority_staging_first.md)
- [US market focus + prod migration plan](project_us_expansion.md)
- [viasr-api promotion target — staging → main (no production branch)](project_viasr_api_promotion_target.md)
- [Compliance & Security roadmap](project_compliance_roadmap.md)
- [Loneliness Strategy & Defensibility](project_loneliness_strategy.md)
- [Perf sprint 2026-05-03 to 05-08 outcomes](project_perf_sprint_2026_05_03_to_05_08.md) — earlier perf work
- [Speed sprint 2026-05-03](project_speed_sprint_2026_05_03.md)
- [Systems + Compassion + Habit Design framework](project_systems_and_compassion_framework.md)
- [Workflow-config invariants across repos](reference_workflow_config_invariants.md)
- [Settings audit false-positives](reference_settings_nonbugs.md) — don't re-open these

---

## What's NOT in this shared directory

Intentionally excluded — these are Claude-behavioral or personal-preference memories that don't generalize to the team:

- `user_profile.md` (Astro's profile)
- Communication style preferences (tone, emoji rules, explain-like-3-year-old, visual-first — already encoded in [`../../docs/CONVENTIONS.md`](../../docs/CONVENTIONS.md))
- Per-task scratch notes (`task_apple_watch.md`)
- Claude-tool gotchas (`reference_claude_model_default.md`, `reference_zsh_readonly_vars.md`)
- Already-done items (`project_manage_account_redesign_done.md`)
- Items flagged "ignore" (`feedback_ignore_ambient_music_language.md`)
- Notion / external-tool integrations specific to Astro's setup (`reference_notion_api.md`, `reference_pc_remote_access.md`, `reference_sentry.md` with personal DSN)

If something in your individual Claude Code session needs that personal context, it'll be in your own `~/.claude/projects/<your-project-path>/memory/` directory. The shared knowledge here is the engineering-team subset.
