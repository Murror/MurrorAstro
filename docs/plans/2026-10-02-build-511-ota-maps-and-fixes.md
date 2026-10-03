# 2026-10-02: Build 511, OTA proof, exact place in Maps, and the 510 fix sweep

Session: Debug (Claude), working the Build 510 test board against production.

## Shipped

### iOS build 511 (TestFlight, Early Access)
- Trunk `ed482e9b` (bump #1904) = 510 + RevenueCat 10.3.0 (#1888) + chat sounds (#1887, Audio session) + #1890 to #1903.
- First archive from the vinhtran MBPro with **Xcode 27.0 (27A266a)**; the pinned Xcode 26.6 is gone from this Mac. Apple accepted the upload (no ITMS).
- Build number from `scripts/ios-next-build.sh` with an ASC check (highest claimed 510). This Mac's ASC key is `AuthKey_GBQ7...`; the issuer is per team (`628f9cc5-...`). python with pyjwt from the viasr poetry venv.
- Only Development certs in the keychain: export used `-allowProvisioningUpdates` + the API key = Cloud Managed Apple Distribution (Team Store profiles x3, get-task-allow false). Export locally, then `altool --upload-app`.
- Artifact checks: app.murror.mobile 2.0.0 (511) on app + both appex; Production OTA key prefix; 6 fix markers in main.jsbundle (python byte counts) with a negative control; 10 chat-*.caf; ChatSound in the binary.
- VALID 16:52 PDT, attached to Early Access (204), beta review auto-approved -> IN_BETA_TESTING. Notion board renamed "Build 511 test board".

### Mobile fixes on trunk (all squash `[skip ci]`, full local gate each time: jest ~13.8k, tsc 0, lint baseline, scripts/ci 478/0)
- #1888 RevenueCat 10.3.0 + Podfile post_install iOS 15.5 floor (Xcode 27 build).
- #1890 reflect-back after own daily task; #1891 chat place shown to its sender; #1892 Ask to join stays pending until shown; #1893 shared insight no 5 s flip back, refresh on push, pop navigation; #1894 Moments table offsets; #1895 draft sync off the Google sign-in path; #1896 Dr. Hong An in the Council; #1897 History ordered by finishedAt; #1898 restored draft keeps its question.
- #1899 stale "picture on its way" receipt expires 30 min after savedAt; #1900 sent-gesture Lottie pauses on iOS idle; #1901 InstantText renders markdown emphasis, splitter never cuts a span, lone `*` stripped; #1902 adopt a server AI ALLOWED when the phone has no answer (same account, strict re-read).
- #1903 Google Maps opens `query_place_id` when the server knows the id.
- #1907 OTA assets under Revopush's 500 KiB per-file cap (hong-an.mp4 1503 -> 402 KiB, welcome-bg.mp4 542 -> 440 KiB, unused star-background.webp deleted).
- #1908 Home's decorative loops pause while an opaque screen covers Home (root stack `layout` coverage context; `useIsTabSelected` = selected && !covered). Sim CPU: Notifications 3.0-4.1% -> 0.1%, Settings after a tap 28.4% -> 0.2%.

### Servers (promoted to production, verified by effect in a prod pod, setting names diffed 110/110)
- viasr #823 real display names in place descriptions; #824 Council Hong An seat (switch off); #826 + #827 Google place id (`places.id` in the field mask; `SkipJsonSchema` so the model never sees the field; a prompt-hash test caught the first version); #830 wrap-up cards (Next Steps / Perspective) carry the conversation in the user turn + `conversation_wrapup/safety.py` meta-reply guard with capped retry (fixes viasr #829).
- murror-api #1216 History finishedAt ordering; #1218 nullable `google_place_id` on chat_place_ideas, connection_place_suggestions, place_invites (migration 20261002100000, 3-file rule; applied staging + prod sgp1).

### OTA (Revopush) proven end to end on Staging
- Release sim build of trunk on the Staging scheme with `MARKETING_VERSION=2.0.90` (bundle id app.murror.mobile.stg), release `-t 2.0.90 --force`, prompt shown, UPDATE applied, changed text rendered. Staging v3 then disabled.
- Astro rule: no Production OTA targeting 2.0.0 while 510-and-older are out (RevenueCat 10 JS on 9.x native may crash purchases).

## Gotchas learned
- Prod Postgres replicates to the new US Supabase (rows only): every prod migration must be sent to the DB Migration session (it applied #1218's columns by hand).
- `git stash push` on a clean tree is a no-op; a following `stash apply $empty` applied another session's stash. Use a detached scratch worktree for before/after.
- `simctl spawn defaults read app.murror.mobile` reads the wrong domain for a sandboxed app; read the container plist path.
- The scheme prepare script overwrites the worktree `.env` with the scheme's env; restore after a Staging build.
- Picking up a 3-card sim pass needs the opposite person's state (Ask to join only exists when neither side has invited).

## Open / follow-ups
- viasr #829 follow-ups in flight: Council merged sections guard, empty-card cache replay.
- Re-send after cancel (Khanh: insight place card, Between Us, other person cancelled) not reproduced on sim.
- Phone-only rows on the 511 board: purchases/restore, chat sounds, Google Maps place pin, reinstall AI consent.
- Next build must come from trunk at or after 29e990066 (#1905 Supabase endpoint from server) and carries #1907/#1908.
