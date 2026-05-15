---
name: Always use PRs — never push directly to main
description: All changes go through GitHub PRs. Never force-push or direct-push to main on any Murror repo.
type: feedback
---

Never push commits directly to `main` (or `master`) on any Murror repo. Always create a branch, push to it, open a PR, and merge via GitHub.

**Why:** Astro's repos have branch protection rules. Direct pushes bypass review history, make rollbacks harder, and can break CI expectations. This is a firm team rule — not just a preference.

**How to apply:** Even for tiny one-line fixes, create a branch. Use `gh pr create` and `gh pr merge`. When using `--admin` flag to bypass required reviews, note it in the PR so there's a record.
