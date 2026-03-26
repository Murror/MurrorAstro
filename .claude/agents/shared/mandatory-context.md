# Mandatory Context Loading

**Every agent MUST complete these steps before writing ANY code or making ANY suggestions.**

Skipping these steps has caused broken builds, wrong environment deploys, and lost work. This is non-negotiable.

## Step 0: Read the Rules (ALL agents)

Read these files IN THIS ORDER before doing anything else:

1. `Murror/CLAUDE.md` — Branching rules, environment targets, agent team, repo structure, conventions
2. `Murror/.claude/agents/shared/team-context.md` — Current sprint, active branches, recent changes, known issues, environment state
3. Check `Murror/docs/handoffs/` for any files addressed to you

## Step 1: Read Your Domain's Codebase (domain-specific)

**Do NOT skip this.** Read the actual source code structure before suggesting or writing anything. "I already know the codebase" is never true — code changes every session.

### Iris (Frontend)
- Read `MurrorMobile/CONTRIBUTING.md` and `MurrorMobile/DESIGN_GUIDELINES.md`
- Read `MurrorMobile/src/common/navigation-controller.tsx` (know which screens exist)
- Read `MurrorMobile/src/common/navigation.tsx` (know the route types)
- Run `ls MurrorMobile/src/screens/main/` to see current screen structure
- Run `git log --oneline -10` in MurrorMobile to see recent changes

### Cortex (Backend)
- Read `murror-api/CLAUDE.md` — database architecture, deploy process, health checks
- Read `murror-backend/CLAUDE.md` — Edge Functions structure, categories, shared code
- Read `auth-service/CLAUDE.md` — DDD architecture, auth flow
- Run `git log --oneline -10` in murror-api to see recent changes
- Check `murror-api/prisma/schema.murror.prisma` for current data model

### Muse (AI)
- Read `viasr-api/CLAUDE.md` — environment enum, deploy, config priority
- Run `ls viasr-api/app/tasks/` to see current Celery tasks
- Run `ls viasr-api/app/api/` to see current endpoints
- Run `git log --oneline -10` in viasr-api to see recent changes
- Check memory: `ai_personality_system.md`, `task_eim_system.md`

### Atlas (Infrastructure)
- Read memory files: `infrastructure.md`, `runbooks.md`, `feedback_deploy_strategy.md`, `feedback_single_compute_target.md`, `feedback_production_freeze.md`
- Run pod status check on all 4 DOKS namespaces
- Check `team-context.md` Environment State section for current compute target

### Prism (Design & UX)
- Read `Murror/USER_PERSONAS.md` — the 5 people you design for
- Read `MurrorMobile/DESIGN_GUIDELINES.md` — full design system
- Read `MurrorMobile/src/assets/styles/colors.ts` — actual color tokens
- Read `MurrorMobile/src/assets/styles/typography.ts` — actual type scale
- Check memory: `ux-flows.md` for documented user flows

### Sentinel (QC)
- Read `Murror/.claude/skills/verification-before-completion/SKILL.md`
- Read `Murror/.claude/skills/systematic-debugging/SKILL.md`
- Run health checks: `curl -s https://dev.api.murror.app/api/health/ready`
- Read ALL handoff files (Sentinel needs full picture)
- Check memory: `qa_sweep_2026_03_23.md` for known issues

### Heart (Empathy)
- Read `Murror/USER_PERSONAS.md` — know Maya, Jaylen, Ava, Kai, Noor deeply
- Read `Murror/PRD.md` (if exists) — product mission and values
- Check memory: `ai_personality_system.md`, `task_eim_system.md`

### Voice (Brand)
- Read `Murror/USER_PERSONAS.md` — target audience
- Read `Murror/docs/PROGRESS.md` — what's actually shipped vs planned
- Read `Murror/PRD.md` (if exists) — product mission

### North (Co-CEO)
- Read `Murror/docs/PROGRESS.md` — task status and completion rates
- Read `Murror/USER_PERSONAS.md` — ground strategy in user needs
- Scan `Murror/docs/plans/` for in-flight work
- Check `Murror/docs/ai-services-cost-tracker.md` for costs

## Step 2: Critical Rules (ALL agents that write code)

These rules exist because breaking them caused real incidents. Read before every session:

- **Production freeze**: NO changes to production backend, K8s, secrets, DB, or Edge Functions without explicit Astro approval
- **Single branch rule**: NEVER work on `main`. Always create feature branch FIRST. Check `git branch --show-current` before every git operation
- **One branch per session**: NEVER switch branches mid-session. Use `git worktree` for parallel work
- **Alpha 2 only**: All work targets `dev.api.murror.app` (DOKS `nsp-dev-murror`). Production is off-limits
- **Never run PC + DOKS simultaneously**: Causes Supabase pool exhaustion
- **Verify before claiming done**: No "should work" — run the actual verification command and show evidence
- **Read before edit**: Always Read a file immediately before Edit — context compaction can invalidate earlier reads
- **Use `git add -p`**: When files have uncommitted changes from other sessions
- **NestJS DI verification**: Always verify DI resolves before pushing murror-api (DI errors crash the whole app)
- **MUText variant only**: Never use raw fontSize/fontFamily — always use the typography system
- **Use "Connection Reflection"** not "Takeaway", **"AI Chat"** not "Deep Chat" in user-facing text
- **PST timezone**: Always use PST for dates/times, not UTC

## Step 3: Report to Astro

After loading context, tell Astro:
1. Which branch you're on
2. Any pending handoffs
3. Any issues you noticed (unhealthy pods, stale branches, etc.)

Only THEN begin working on the task.
