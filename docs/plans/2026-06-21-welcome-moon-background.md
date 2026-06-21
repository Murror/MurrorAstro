# 2026-06-21 — Web welcome screen: moon/aurora background

## Context
Astro asked to replace the "flower scene" background on the sign-up landing
with the "you were never meant to do this alone" moon + butterflies + aurora
scene. The request first pointed at murror.app (marketing), but the real target
was the web app's logged-out landing at web.murror.app/welcome, whose background
is a looping video (`/videos/welcome-bg.mp4` + `.webp` poster) that was a
glowing flower-field clip.

## What shipped (murror-platform, web-client)
- New background assets built from the marketing film scene 3 frames
  (`apps/marketing/public/film/s3`, the moon/butterfly/aurora clip):
  - `welcome-bg.mp4`: forward-only seamless loop (ffmpeg xfade self-crossfade,
    frames f121-f240 base, ~4s, 1280x720, h264). Astro rejected an earlier
    boomerang version because it played in reverse.
  - `welcome-bg.webp`: poster = the loop's first frame (no pop), via cwebp.
- `?v=moon` cache-bust appended to the three asset URLs in
  `apps/web-client/src/presentation/pages/welcome-page.tsx` (fixed filenames
  were served stale from Cloudflare edge cache after the swap).
- Drive-by build fix: `diary-card.tsx` cast `cardStyle as MotionStyle`. A clean
  from-scratch web-client build (clean pnpm install, current lockfile) failed
  `tsc -b` (framer-motion MotionStyle no longer accepts plain CSSProperties,
  TS2322 on dominantBaseline). This was pre-existing on the trunk and unrelated
  to the welcome change; it blocked the image build.

## PRs / commits / images
- PR #130 squash-merged to web trunk `feat/web-app-from-mobile` (commit
  `483e5302`). Branch `feat/welcome-moon-bg` tip was `ad7ae842`.
- The diary-card fix also landed directly on the trunk (`ebb8a374`) before the
  PR, because a concurrent routine had checked out a different branch in the
  shared main checkout (see gotchas).
- Built per-env via `build-web-client.yml` (workflow_dispatch, --ref
  feat/welcome-moon-bg): `staging-ad7ae842`, `alpha-ad7ae842`, `prod-ad7ae842`.
- Deployed via `kubectl set image` (NOT deploy-matrix): nsp-staging-murror,
  nsp-dev-murror, nsp-prod-murror.
- Prod later rolled to `prod-be02443e` (trunk advanced with #131) which still
  contains #130, so the moon persisted. Prior prod image (rollback for the
  welcome change specifically): `prod-1ebe981f`.

## Verification
- Staging `/welcome` visually verified (logged-out) showing moon + butterflies
  + aurora behind the wordmark/tagline/CTAs.
- Alpha + prod: `curl` confirmed `/videos/welcome-bg.mp4?v=moon` = 555297 bytes,
  `cf-cache-status: MISS` (fresh from origin). Pod file confirmed 555297 bytes.
- Logged-out prod page not screenshot-able from this machine (the browser
  session is authenticated; `/welcome` redirects authed users to home).

## Gotchas (carry forward)
- SHARED MAIN CHECKOUT IS CONTESTED. The murror-platform main checkout
  (`~/Projects/murror-transfer/Murror/murror-platform`) had its HEAD moved out
  from under me twice mid-session (onto `feat/web-app-from-mobile`, then
  `docs/2026-06-21-session`) by a concurrent routine. Two commits landed on the
  wrong branch as a result. Fix: do web-client git work in a dedicated
  `git worktree`, not the shared checkout. Verify the pushed branch tip before
  dispatching builds.
- FIXED-FILENAME ASSET SWAPS ARE CACHED BY CLOUDFLARE. web.murror.app is
  CF-proxied (max-age 14400 on the asset). Swapping bytes under the same
  filename serves stale until TTL. The CF MCP token can list zones but lacks
  cache-purge permission, and no CF token/wrangler is in the local env. Use a
  `?v=` query cache-bust in code instead (permanent, future-proof). murror.app
  zone = 40f938dae4ef036634c4714ea8a80968 (Astro CF account
  3f3f1ac28d8f7a94e8e2ac610e1da0b3).
- A clean Docker build (`tsc -b && vite build`) catches type errors that a local
  turbo cache hit or stale node_modules hides. Staging cache-hit, alpha
  cache-miss exposed the diary-card error.

## Follow-ups
- The web welcome page is described as a 1:1 port of the mobile LandingScreen
  but they are separate files; the iPhone app opening screen still shows the
  flower clip. Matching it needs a mobile asset swap + new build.
- A stray copy of the cache-bust change (`f6922948`) is on
  `docs/2026-06-21-session` (another routine's branch); harmless, superseded by
  the squashed PR #130.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
