# iOS 2.0.0 release lane: eight blockers, one root cause family

Date: 2026-08-20
Repos: MurrorMobile only (murror-api, murror-platform, viasr-api untouched)
Canonical at time of writing: `03de2309` (build 439), PR #1125 open for the ninth fix

## Context

The production archive was blocked. The recorded reason was that all six
supply-chain tree digests went stale after a `brew upgrade`. That was wrong, and
disproving it opened a chain of eight further defects, every one in the release
lane rather than in the product. No product launch blocker was found in this
period.

## The root cause family

Every defect was the same mistake in different clothing: **a recorded value that
encodes its environment rather than its content**, or a guard whose check could
not fail.

| # | Defect | Mechanism |
|---|---|---|
| 1 | Ruby runtime pins "stale" | recorded at `umask 022`, lane runs `umask 077`; digests record permission bits. `brew` was a red herring, the files were byte-identical |
| 2 | RubyGems pin unsatisfiable | digest covered freshly compiled gems; `LC_UUID` plus an `N_OSO` debug map embedding each `.o` path AND mtime. No fixed value could ever hold |
| 3 | `@rneui` commits orphaned upstream | two pinned commits unreachable from any branch or tag; GitHub served them by explicit SHA until it rate-limited us |
| 4 | Vendored lockfile encoded the umask | yarn's `file:` protocol hashes a directory INCLUDING file modes: 644 gives `hash=2abd57`, 600 gives `fd848c`. One lockfile cannot satisfy both CI and the lane |
| 5 | `xcuserdata` scheme guard too broad | refused every `.xcscheme`, but CocoaPods generates 178 inert ones |
| 6 | Hermes vs the read-only Pods seal | RN's build phase deletes and re-extracts `Pods/hermes-engine`; the tree is sealed |
| 7 | Compatibility header vs the seal | `ditto` PRESERVES permissions, so copying from the sealed tree yields a read-only file the next line appends to. 15 pods affected |
| 8 | `.xcode.env.local` absent | gitignored, so the lane's pristine clone never has it; RN's shim then overwrites the driver's pinned `NODE_BINARY` |

## What shipped

- **#1117** two Ruby pins corrected, measured inside the lane
- **#1119** `@rneui` vendored as npm tarballs. A tarball resolution carries only a
  content checksum and no mode-derived `hash=`, so the umask drops out entirely
- **#1121** `xcuserdata` guard narrowed to refuse only schemes that can execute,
  with a non-UTF-8 refusal added after review found a UTF-16 bypass
- **#1123** release Hermes placed before the seal, so RN's phase becomes a
  verified no-op instead of a build-time mutation of a manifested tree
- **#1125** (open) `post_install` hook makes the compatibility-header phase able
  to append to its own copy, fixing all 15 pods generically

Build numbers consumed: 436, 437, 438, 439. Each source fix invalidates the
previous bump because the lane requires the bump to be the canonical tip.

## Deliberate approved re-baselines

Each was measured from a real driver run, never computed by hand.

| Pin | From | To |
|---|---|---|
| `ios/RubyRuntimeInput.tree-sha256` | `41663db5` | `4b57e0ec` |
| `ios/RubyRuntimeRelocated.tree-sha256` | `1546db2f` | `357c9afb` |
| `ios/RubyGems.tree-sha256` | unsatisfiable | `e4aed8da` after canonicalization |
| manifest tool hash (2 pinners) | `5fef1ab7` | `961af60b` |
| `ios/Pods.tree-sha256` | `29b019f0` | `1ec4610e` then `d0a729fc` |

The manifest tool hash is pinned in TWO places, `xcode-bundle-with-sentry-disabled.sh`
and `finalize-ios-observability.mjs`. Updating one leaves the suite failing with
"the finalizer must pin the same dependency-manifest tool".

## Gotchas worth keeping

- **`ditto` preserves permissions.** This caused defect 7 and also fixed defect
  earlier in the prefetch copy. It cuts both ways.
- **`%()` in Ruby has double-quote semantics**, so `\0` is a NUL byte, not a
  backreference. The first version of the `post_install` hook would have deleted
  the `printf` line from all 15 phases. Use a `gsub` block instead.
- **Verify the artifact, not a retyped copy.** The above shipped because the
  control test and the Podfile were generated separately and their escaping
  diverged. The control now extracts the expression from the file on disk.
- **A shell NUL test is an empty pattern** that matches every line, so it always
  reports NUL present. Read bytes directly.
- **Compare failure SETS, not counts.** "4 failures before and after" hid the
  fact that one of the four was new and caused by the branch.
- **An exit code is not a result.** A delete loop reported "deleted 1" having
  deleted nothing, because it counted the helper's exit status rather than the
  HTTP status.
- **Backticks in a `git commit -m` message execute as commands** and can make the
  commit silently fail. Use `-F -` with a quoted heredoc.
- **The driver re-fetches `canonical_branch` itself**, so an ephemeral
  measurement copy must redirect the branch target in two places, not one.

## Verification

- All six supply-chain pins passed for the first time in project history
- The archive reached 45,707 log lines inside Xcode, up from a previous best of
  roughly 8,600
- Pods digests reproduced across independent runs before being trusted
- The `post_install` hook verified on the generated `project.pbxproj`: 15 chmods,
  15 printf appends preserved, zero NUL bytes, entry count unchanged at 18,776

## Still unproven

**No archive has completed.** Sixteen attempts, zero `.xcarchive` files. Nothing
has been uploaded; App Store Connect still tops out at build 432. Device
verification cannot start because no build anywhere contains the login and
onboarding fixes.
