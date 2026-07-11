# 2026-07-11 — Personal Note polish: card redesign, Letter, Home envelope badge

Astro-driven design + QA pass over the Personal Note feature (received notes) across
`MurrorMobile` + `murror-api`. Shipped in TestFlight builds 298 and 299. All work
reviewed by adversarial subagents before each build cut.

## Context

The received-note feature (For Us card -> Letter screen) was functional after the
earlier camelCase read-contract fix (PR #574, 07-10). This day was Astro's design
review of it: the card looked "black and uninspiring", the Letter text was
left-aligned with a dead CTA, and the Home ring had no cue for an unopened note.

## What shipped

### Mobile (MurrorMobile, branch `staging-environment-setup`)

| PR | Commit(s) | What |
| --- | --- | --- |
| #635 | `ead4aca`,`96cf838`,`ef882d4` | Note card artwork background (seeded from the same bundled pool as Connection Reflection cards, by message id, never content) + 24% scrim replacing the black glass; new `NoteCardAmbient` candlelit glow (cream radial, 6s sine breathe, opened -> 9s softer, static midpoint under reduce-motion/low-tier, crisis never mounts); sibling-consistent pill `"A note ✉️"` (sentence case) + name moved to the `"From {name} · Tap to open"` footer (new `noteCardBadge`/`noteCardFrom` en/vi/ja keys); gesture icon above the avatar pair breathes at 2% scale (nested inside the echo spring + outside the warmth-fade opacity so aged gestures auto-quiet). Letter opens onto the same artwork; crisis notes stay byte-identical to the plain dark wash. `MUColors.cream` promoted from the hardcoded pill hex. Build 298. |
| #637 | `e5df9b4`,`1ff3376` | Letter body vertically centered + serif center-aligned (flexGrow, long notes still scroll); CTA now `popTo` the connection detail with a `focusNoteComposer` nonce so it focuses the note composer instead of a dead `goBack()`. New `popTo` nav helper (stack v7 `navigate` dedups only against the focused route, so plain push made a phantom duplicate detail). |
| #638 | `e446173`,`8fdbf60` | Home-ring envelope badge for an unopened received note; opened-ness = per-note LocalStorage flag the Letter writes, hydrated on focus for visible friends only. Badge state kept OUT of the entrance-animation memo (render-time lookup `noteBadgeByRelId` + stable-identity Set) so a badge flip never re-fades the whole ring (T12 hazard). |

### Backend (murror-api, branch `staging`)

| PR | Commit(s) | What |
| --- | --- | --- |
| #582 | `bfffabc` | `latestNote {id, createdAt}` on the friends list + friend detail payload, batched in one `DISTINCT ON (relationship_id) ... ORDER BY relationship_id, created_at DESC` query with `ANY($1::uuid[])` + `sender_id <> me`. Privacy: id + timestamp only, note text never rides the friends list. Drives the Home envelope badge. |
| #583 | `f8bc7cc` | Test-only: pin the `created_at DESC` direction (reviewer gap; an ASC flip would silently badge the oldest note). |
| #584 | `856b344` | Composite index `(relationship_id, created_at DESC)` on `public.relationship_messages` matching the DISTINCT ON ORDER BY (kills the Sort node). Legacy-schema DDL via the standard prisma/migrations flow. |

## Verification

- Every PR: `tsc`/`type-check` 0 errors, lint clean, targeted specs green (37/37 note-teaser+personal-note; 24/24 friends repo+detail).
- Adversarial review per PR before each build. Real catches that were fixed:
  - CTA pushed a phantom duplicate detail screen (looked fixed, broke back) -> `popTo`.
  - Home badge Set-identity churn would re-fade the whole ring on every focus for all users -> render-time lookup + stable Set.
  - Crisis note's *card* still celebrated while its Letter went somber -> crisis card falls back to plain glass.
  - Gesture pulse 3.5% -> 2% to hold Astro's "size unchanged" bar.
- Backend deployed to staging (`0.203.0-staging`, rollout verified, health 200) so build 299's badge has live data.
- Builds 298 + 299 cut through the single lane, app + extension build numbers verified pre-upload, `Uploaded MurrorMobileStaging` confirmed both.

## Gotchas / notes for next time

- `lint --fix` at repo scope swept another session's onboarding-v2 files into commits twice; always scope `eslint --fix <files>`.
- Cross-session conflict sweep is now a standing rule (memory `feedback_cross_session_conflict_check`): before merging to a shared branch or bumping a build, check other sessions' open PRs / bump PRs / file overlap. Astro runs a parallel onboarding session.
- Open i18n PRs #620/#621 also touch `vi.json`/`ja.json` -> they may need a trivial rebase after these note-key additions.
- Follow-ups filed as task chips: envelope badge on the connections list (friend-card) for consistency; send-response dual-key already shipped (#576).

## On-device gate (build 299)

Visual pass owed before promotion: note card + Letter (centered, glow) + Home ring
envelope + gesture breathe + CTA round-trip (back stack has no phantom entries).
