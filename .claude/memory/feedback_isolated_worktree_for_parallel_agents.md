---
name: Use isolated git worktrees when dispatching multiple agents to same repo
description: Parallel agents working in the same git working tree silently overwrite each other's staged changes. Use git worktree add for isolation when dispatching 2+ agents to the same repo.
type: feedback
originSessionId: 8f1c5851-d71b-4095-b91e-a4809d2f710c
---
**Rule:** When dispatching 2+ parallel agents that will both edit code in the **same git repository**, give each agent an **isolated git worktree** via `git worktree add /tmp/<name> -b <branch> <base>`. Do NOT let multiple agents share the main checkout — they will silently overwrite each other's staged changes.

**Why:** Hit this **3 times** during the 2026-05-06 perf sprint:
1. T9 (cortex, /me migration) staged changes were wiped by T10 (cortex, detail-bundle endpoint) running in the same working tree. Had to redo T9 entirely.
2. T18 (muse, exploreConnection cache) was wiped by T19 (cortex, insights N+1) for the same reason.
3. T6 (auth-jwt) and T8 (subscription cache) had their staged files cross-contaminate, requiring manual `git restore --staged` to untangle.

The agents reported their work succeeded (each saw its own diff at completion), but the LATER agent's `git checkout`/`git add` operations clobbered the EARLIER agent's staged set. The reports were technically correct in isolation but the cumulative state was wrong.

**Symptoms when this is happening:**
- Agent reports "X files staged, build green" but `git status` later shows different files
- Re-doing the lost agent's work consistently fixes it
- Branches show different staged content depending on checkout order

**How to apply:**
1. Before dispatching parallel agents to the same repo, create isolated worktrees:
   ```bash
   cd /Users/astro/Projects/murror-transfer/Murror/<repo>
   git worktree add -b <branch-A> /tmp/<task-A> <base>
   git worktree add -b <branch-B> /tmp/<task-B> <base>
   ```
2. In each agent's prompt, **explicitly tell them which worktree path to work in** ("CRITICAL: work only in `/tmp/<task-A>`") and verify the branch via `git branch --show-current` from that path.
3. After agents return, commit + push from each worktree separately.
4. Cleanup: `git worktree remove /tmp/<name>` after merge.

**Exception:** If only ONE agent will write code in a given repo (others just read), no worktree needed.

**Anti-pattern that triggers this:** dispatching `cortex` for two backend tasks at once without specifying isolated worktrees. Cortex (and other agents) default to the main checkout and will overwrite each other.

**Bonus side effect:** worktrees also let you keep the main checkout on a different branch (e.g., `staging`) while agents work on feature branches, which avoids the "wrong base" risk too.
