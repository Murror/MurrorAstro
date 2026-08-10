# 2026-08-10 — Launch hardening: two audits, 19 PRs, two decisions parked

## Context

The session opened as QA follow-up on production build 425/427 and turned into
launch hardening after two evidence-ledger audits landed:

- **iOS build 427** (Codex, isolated worktree) — verdict NO-GO, ~35 findings.
- **murror-api** (Codex, this session, first ever) — verdict NO-GO, two PROVEN
  critical source defects.

Both ledgers are pushed and are the source of truth:

```
origin/codex/ios-production-427-audit-20260810:docs/audits/ios-production-427-evidence.md
origin/codex/api-prod-audit-20260810:docs/audits/murror-api-production-readiness.md
```

## What shipped (19 PRs, 3 repos)

### murror-api

| PR | Ledger ID | What |
|---|---|---|
| #752 | — | back-merge of the 2026-08-10 production promotions |
| #753 | — | corrected a comment that described the Care Tips bug as the design |
| #754 | **API-001** critical | invitation takeover |

**API-001** was four defects in one expression:

```ts
isAccept ? invitation.invitee_id && invitation.invitee_id !== userId : false
```

1. `invitee_id &&` short-circuits on NULL, so a link invitation had no owner check.
   `friend_invitations.id` is a sequential autoincrement PK, so invitations were
   enumerable and any authenticated caller could accept a stranger's, creating a
   real connection to each inviter.
2. The `: false` branch meant DECLINE was never authorized at all.
3. `status` existed on the table and was never read, so a consumed invitation was
   replayable.
4. The numeric lookup used `findUnique` with no `deleted_at` filter, unlike the
   token path, so soft-deleted rows stayed actionable.

Fix follows how the two invite shapes differ: a uuid token is unguessable so
bearing it is the proof; a numeric id is guessable so it only ever authorizes the
ASSIGNED invitee. A first attempt over-tightened and broke a token-bearer
declining a share link; the existing suite caught it.

**A test encoded the vulnerability.** `freshInvitation` set `invitee_id: null` and
the suite asserted an unassigned caller accepting by numeric id returned success.
Rewritten with the reason recorded. The fixture also omitted `status`, which is
`NOT NULL @default(SENT)`, and that omission is what hid the missing replay guard.

### MurrorMobile

| PR | Ledger ID | What |
|---|---|---|
| #1064 | — | Moments: empty state for a user with no connections |
| #1065 | — | remote kill switches for the four defaulted-on features |
| #1066 | **REL-427-001/003** | OTA modal CTA opened the App Store; plus Codex's archive guard |
| #1067 | **PRIV-427-005** | journal drafts written to plaintext AsyncStorage |
| #1068 | **PRIV-427-006** | stale "never the photo" rail (comment only) |
| #1070 | **SEC-427-003** | account switch declared a dirty device clean |
| #1071 | **AUTO-427-002** | leaked QueryClient GC timers |
| #1072 | — | build number bump to 428 |
| #1073 | **SEC-427-004** | deep links matched anywhere in the string |
| #1069 | DEP/E2E/CI/AUTO | Codex CI lane. OPEN, needs Astro |

Notes on the harder ones:

- **#1066.** A previous fix made the OTA check run again after a store prompt had
  silenced it. Necessary and not sufficient: the destination was still armed
  before `await asyncCodePush()`, so the OTA modal's own button called
  `Linking.openURL`. `resolveUpdateDestination` now takes both inputs at once so
  the destination cannot be computed without the OTA answer.
- **#1067.** `local-storage.ts` already reserved the secure trio for "private
  reflection content"; `conversation-draft-service.ts` had been migrated for
  exactly this reason and the journal draft was left behind. Includes a
  migrate-on-read for drafts already on devices, secure write awaited BEFORE the
  plaintext delete.
- **#1070.** `completeAccountCleanup` returned bare `undefined` on the
  preserve-session path, so a partial wipe read as success and
  `setPersistentCacheOwner` cleared the switch sentinel. Now reports its outcome;
  the caller purges the persistent cache as the fallback boundary, and if that
  also fails it does not advance ownership. Read with `?.` so an absent result
  fails safe rather than throwing.
- **#1071.** A bare `new QueryClient()` gets the default gcTime, so building a
  query or mutation schedules a real setTimeout. `--detectOpenHandles` named it:
  `Mutation.scheduleGc`. Fixed by never scheduling (`gcTime: Infinity`), matching
  what `query-test-env.tsx` always did. CLAUDE.md's `--forceExit` instruction was
  corrected; it was our own leak, not "a pre-existing RN test env issue".

### viasr-api

| PR | What |
|---|---|
| #605 | Care Tips defaulted ON in production too |
| #606 | journal starter questions stop guessing gender |
| #607 | baked example stops teaching the model to use em dashes |
| #608 | shared deterministic gender guard across surfaces |
| #609 | h2 4.4.1 for CVE-2026-71554 |

**Care Tips had been dark in production the whole time.** Chain proven against the
running pod: `CARE_TIPS_ENABLED` was rescued only inside
`if ENVIRONMENT != "production"`, the prod configmap sets `ENVIRONMENT=production`,
the Statsig gate was never created, Statsig returns false for an undefined gate,
so `/care_tips/generate` returned empty tips and murror-api fell back to today's
cards. Being environment-conditional is exactly what hid it.

Also: production viasr runs `ghcr.io/murror/murror-ai:staging-27d3f4b`, a
**staging-tagged image**, not `main`. `main` has no care-tips or council code at
all. CLAUDE.md's "Production target: main" does not describe what is deployed.

**Gender, measured on claude-haiku-4-5 (the model `llm_request` tries first):**

| Surface | No rule | Prompt rule | + guard |
|---|---|---|---|
| relationship_reflection | **100%** (16/16) | 0% | n/a |
| Care Tips | **65.3%** | 8.3% | **0%** |
| journal starters | 13.8% | 3.8% | **0%** |

Every failure in every run was "Anna". Minh and Linh never failed once across
hundreds of lines. `relationship_reflection` read `if (user2_pronoun != "they")`,
so the one case with no data got no instruction at all.

## Gotchas worth keeping

- **`--force-with-lease` fails with "stale info"** on a `--single-branch` clone,
  because there is no remote-tracking ref to lease against. Fix with an explicit
  `--force-with-lease=<branch>:<sha>`, not `--force`.
- **A git worktree cannot be used as a Codex sandbox.** Its `.git` is a pointer
  OUTSIDE the sandbox root, so file edits work and commits never land. Produced
  10,000 log lines and zero commits. Use a standalone clone.
- **Codex's sandbox has no network egress**; it wrote a checksummed git bundle
  instead. Verify the SHA-256 and recover the branch locally.
- **The Codex MCP tool hangs silently for 30 minutes** if the CLI is older than
  the configured model needs. Upgrading 0.142.3 to 0.147.0 fixed it; the running
  MCP server holds the old binary until Claude Code restarts, so `codex exec`
  from Bash is the workaround.

## Verification standard applied

Every fix mutation-tested: reintroduce the defect, confirm the test goes red, and
confirm the mutation actually applied first. One `sed`-based mutation silently
matched nothing because prettier had wrapped the call, producing a meaningless
green run.

Full suites: MurrorMobile 3215 passed (exit 0, no `--forceExit`), murror-api 3477
passed, viasr-api 1517 passed.

## Open

- **#1069** needs Astro: it changes `yarn lint` team-wide.
- **SUB-001** (murror-api): `ACTIVE` + null expiry reads as lifetime Premium.
  2,813 of 3,067 users (~92%) hold a `Free Plan` placeholder; 12 genuinely pay.
  `isFreeTierPlaceholder()` exists, is correct, has a passing spec, and NOTHING in
  product code calls it. Decision made (make production real), built nothing:
  needs a gate-off implementation then Astro's ramp.
- **PRIV-427-003**: consent recorded but never asked, and the flag is overloaded
  so declining training also schedules deletion in 2 weeks. Decision made (split
  the flag first), not built.
- Remaining source-tier: SEC-427-001, SEC-427-002, OFFLINE-427-001, AUTH-427-001,
  REL-427-004, QA-427-001, OBS-427-001, A11Y-427-001.

Handoff for the Mac mini: `docs/plans/2026-08-10-mac-mini-PROMPT.md` and
`docs/plans/2026-08-10-mac-mini-setup.md`.
