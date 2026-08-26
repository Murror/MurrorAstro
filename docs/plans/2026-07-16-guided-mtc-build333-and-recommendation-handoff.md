# Guided MTC build 333 and personalized recommendation handoff

Date: July 16, 2026  
Area: MurrorMobile staging  
Primary worktree: `/Users/astro/Projects/murror-transfer/Murror/MurrorMobile-worktrees/build332-cri-polish`

## Summary

Build 333 was uploaded to App Store Connect for staging TestFlight after a sequence of guided MTC, connection reflection, memory photo, and note-detail polish fixes. The remaining product question is the post-graduation guided MTC recommendation card.

The current recommended card is not truly personalized. It is relationship-aware only:

- It chooses an active or fallback connection.
- It renders `Reflect again with {{name}}.`
- It routes into another shared LOG connection reflection.

Astro wants the next pass to make this card choose a specific next best action using available relationship, reflection, memory, prompt, and journey signals.

## Shipped mobile state

Latest relevant PRs:

- MurrorMobile PR #745, `Fix guided recommendation and note fade polish`
- MurrorMobile PR #746, `Bump staging build to 333`

Latest staging build:

- Build: `333`
- Version: `2.1.0`
- Bundle id: `app.murror.mobile.stg`
- Archive: succeeded
- Export/upload: succeeded
- App Store Connect status at upload time: package processing
- Known non-blocking warning: Hermes dSYM upload warning

## Fixed before build 333

- Guided MTC post-graduation recommendation no longer shows five starter checkmarks.
- Guided MTC recommendation title area is left-aligned after graduation.
- Photo detail heart alignment was adjusted inside the Polaroid footer.
- Note detail streaming text reset was fixed so route changes can replay the fade sequence.
- Build 333 was cut from `staging-environment-setup` using the build-number script, not by hand.

## Current guided MTC starter journey

The fixed starter journey remains:

1. Talk with Murror about today.
2. View the first generated insight.
3. Add someone who matters.
4. Reflect on that connection with a shared LOG reflection.
5. View the connection journey.

Progress is backed by:

- `GET /api/v1/guided-mtc-progress`
- `POST /api/v1/guided-mtc-progress/complete`

The mobile selector is:

- `src/utils/feed/select-guided-mtc-card.ts`

The Home feed integration is:

- `src/components/feed/use-pinned-feed.ts`

The progress hook is:

- `src/queries/relationship/use-guided-mtc-progress.ts`

## Next work for Claude

Read this active implementation handoff first:

- `MurrorMobile-worktrees/build332-cri-polish/docs/plans/2026-07-16-guided-mtc-personalized-recommendations.md`

Recommended approach:

1. Keep the five-step starter journey unchanged.
2. Add a real post-graduation recommendation payload, ideally backend-backed.
3. Mobile should consume the payload and map it to the compact MTC card.
4. If the payload is absent or malformed, fallback to `Reflect again with {{name}}.`
5. Post-graduation recommendations must not show the five checkmarks.

Possible recommendation actions:

- Start another connection reflection.
- Share a memory or moment.
- Open the connection journey.
- Start AI chat from a prompt-library prompt.
- Revisit a recent insight or theme.

## Suggested restart command

```bash
cd /Users/astro/Projects/murror-transfer/Murror/MurrorMobile-worktrees/build332-cri-polish
git fetch origin staging-environment-setup
git switch -c feature/guided-mtc-personalized-recommendations origin/staging-environment-setup
```

Then read:

1. `CLAUDE.md`
2. `HANDOFF.md`
3. `docs/plans/2026-07-16-guided-mtc-personalized-recommendations.md`

## Verification references

Focused test command used before build 333:

```bash
yarn test src/utils/feed/select-guided-mtc-card.spec.ts src/components/feed/compact-feed-card.spec.tsx src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx src/components/markdown-streaming-text.spec.tsx src/utils/personal-note.spec.ts --runInBand
```

Result:

- 5 suites passed.
- 141 tests passed.

Type check:

```bash
yarn type-check
```

Result:

- exit 0.

## Release guardrails

- STAGING ONLY.
- PR target is `staging-environment-setup`.
- Do not merge or cut a TestFlight build unless Astro asks.
- Use `./scripts/ios-next-build.sh` for build numbers.
- Archive only from updated `staging-environment-setup`.
