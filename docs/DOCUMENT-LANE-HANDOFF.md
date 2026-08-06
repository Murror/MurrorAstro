# Murror documentation lane handoff

This worktree exists so Claude Code can run `/document` without competing with
the dirty shared umbrella checkout at
`/Users/astro/Projects/murror-transfer/Murror`.

## Ownership

- Worktree: `/Users/astro/Projects/murror-transfer/Murror/worktrees/codex-docs-unblock-20260805`
- Branch: `codex/docs-unblock-20260805`
- Base: umbrella Murror documentation checkout at `3426cdcd`
- The canonical umbrella checkout still contains in-progress Claude/iOS
  documentation changes. Do not reset, stash, or edit those files from here.
- The web parity implementation is isolated and clean at
  `murror-platform-worktrees/codex-web-parity-integration-20260804`, commit
  `8bcbfa6f`; it contains no `ios/` path.

## Safe `/document` procedure

1. Run the document gather step from this worktree.
2. Read the active iOS worktree and the web/Android handoff files by absolute
   path when collecting the day's evidence.
3. Append the new technical entry to this worktree's `PROGRESS.md` and write any
   dated plan beside it.
4. Keep public progress, deployment, staging runtime, database, and production
   actions separate from this freeze-safe internal record.
5. Commit the documentation branch for review. Do not merge, push, or modify the
   canonical iOS checkout during the promotion freeze.

The umbrella checkout has local-only excludes for nested repositories and
worktrees. They reduce status noise but do not delete or alter any nested files.
