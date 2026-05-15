---
name: Always target the `staging` branch — never `main`
description: All PRs land on staging branch first. Never merge to main. Production deploys are manual dispatch only.
type: feedback
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
**Rule:** Every PR I open or merge MUST target the `staging` branch on murror-api and viasr-api. Never target `main`. Never target `production`.

**Why:** Astro's developer historically described `main` as production. Even though today's CI/CD overhaul (PR #320/#358) remapped `main → alpha` and `production → production`, Astro wants the safer assumption to hold. Targeting `staging` keeps everything in the env Astro actively tests on (`staging.api.murror.app` / `nsp-staging-murror`), and matches the existing memory `project_env_priority_staging_first.md` which says staging is the primary active dev env.

**How to apply:**
- New branches: cut from `origin/staging`, not `main` or `develop`.
- Open PRs with `--base staging`.
- When verifying merge state, confirm `baseRefName` is `staging` before merging.
- If a PR is currently targeting `main` or `develop`, retarget it to `staging` (or close + reopen against `staging`) before merging.
- Production promotion (`staging → production`) is NEVER something I do unilaterally — it requires Astro's explicit go-ahead and a manual `workflow_dispatch`.
- viasr-api has a known issue: `staging` branch is 653 commits behind `main`. If a fresh branch off `staging` lacks needed prerequisite code, surface it to Astro and propose a one-shot `main → staging` sync PR rather than silently switching base to `main`.

**Source:** Astro, 2026-04-18, after I proposed targeting `main` and Astro pushed back: "main is production right? ... please always target staging, so please set this in the memory and the rules."
