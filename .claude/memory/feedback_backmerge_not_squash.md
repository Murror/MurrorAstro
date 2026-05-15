---
name: Back-merge PRs must use merge-commit strategy — never squash
description: Squash-merging a back-merge PR breaks ancestry and leaves downstream promotion PRs in CONFLICTING state
type: feedback
originSessionId: 177ad938-2f97-48d7-81b3-a6b45eb8618d
---
Back-merge PRs (e.g. production → staging, main → develop) MUST be admin-merged with `--merge` (create a merge commit), **never** `--squash`.

**Why:**
- `--squash` flattens the merge into a single non-merge commit with one parent
- GitHub's `mergeable` / `mergeStateStatus` calculation uses commit ancestry (parent chain), not tree equivalence
- After a squashed back-merge, production's commits are "in staging's tree" but NOT in staging's parent chain
- The downstream promotion PR (staging → production) still shows CONFLICTING because GitHub sees production's commits as "missing" from staging
- Fix requires a second merge-commit PR with zero file diff just to record ancestry

**How to apply:**
- When merging a branch whose purpose is "bring N commits from branch A into branch B while preserving history", always choose the **Create merge commit** option (or `gh pr merge --merge`)
- Squash-merging is fine for feature PRs where a single logical commit on the target branch is desirable
- When in doubt on a back-merge, ask Astro which strategy to use — the default admin-merge strategy may not match what's needed

**Detected 2026-04-22 PDT:** PR #353 (production → staging back-merge) admin-merged with `--squash` instead of `--merge`. PR #352 (staging → production promotion) stayed CONFLICTING. Required a second PR #354 with a merge commit of zero file diff just to restore ancestry.
