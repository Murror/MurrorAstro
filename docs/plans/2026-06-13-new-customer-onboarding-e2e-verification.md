# New-customer onboarding E2E verification — staging web

Date: 2026-06-13 (PDT)
App: `apps/web-client` (murror-platform), branch `feat/web-app-from-mobile`
Env: staging.app.murror.app (web) + staging.api.murror.app (murror-api), web rev 112
Author: autonomous parity QA loop

## Context

Astro asked for a full, uninterrupted walk of the new-customer signup/onboarding
flow on staging web to confirm a brand-new user can get from signup all the way
into the app (home), including the post-signup invite-friends step, and that it is
consistent with mobile. Standing caveat to remove: previous runs had only verified
onboarding screens piecemeal, not in one continuous new-account run.

This doc records the verification result. It produced no application-code changes
(verification + harness scripts only); the only repo edit was PARITY_LOOP_LOG.md.

## What was verified (live, staging)

Performed as a brand-new, never-onboarded account (`e2e-newcust`, created via the
Supabase admin API; session minted server-side, never typing credentials into any
form). Driver: puppeteer-core headless, session injected into localStorage key
`murror-auth-storage`. Scripts: `/tmp/shotrig/full-walk.mjs` (walk) and
`/tmp/shotrig/verify-complete.mjs` (post-completion routing).

End-to-end result (0 page errors throughout):

| Stage | Result |
| --- | --- |
| New user opens app | routed to `/onboarding` |
| All 27 onboarding screens | walked in ONE uninterrupted run: landing intros, privacy AGREE, birth-date, gender, hear-us, tried-other, interests, affirmations, characteristics, the 4 relationship questions, goals, insight-preview, mirror-question (AI reveal), the 4 connection intros, rating, value screens |
| save-progress (step 28) | account-creation screen = Google OAuth only (see below) |
| `POST /v1/onboarding/complete` | 201 Created, with the real walked answers |
| Land on app | HOME, header shows first name "Quinn", not bounced back to onboarding |
| Post-signup invite step | `/welcome/connections` invite-friends intro renders (mobile parity) |
| Invite -> add -> Continue | `/welcome/connections/add` then back to HOME |

Screenshots captured: `/tmp/save-progress.png`, `/tmp/vc-home.png`,
`/tmp/vc-invite-intro.png`, `/tmp/vc-final.png`.

## The save-progress / Google-OAuth design (the one unautomated link)

The web onboarding is anonymous-first: a visitor walks all 27 screens with NO
account, then creates the account at the final step `/onboarding/save-progress`
via Google OAuth ONLY. Rationale is documented in
`apps/web-client/src/presentation/pages/onboarding/save-progress-page.tsx`: an
inline email register() + immediate login() fails whenever Supabase
email-confirmation is enabled ("Email not confirmed"), which would strand the user
and lose all 27 answers. OAuth returns a session synchronously, so it is the only
reliable signup path; email remains the LOGIN path for returning users.

The Google click could not be automated (cannot drive Google's OAuth consent, and
entering credentials into an auth form is prohibited). Astro explicitly scoped it
out ("ignore google sign up"). To verify the post-auth half without it, the harness
captured `localStorage.murror_onboarding_data` (the exact answers the app would
send) at save-progress and POSTed `/v1/onboarding/complete` with the session bearer
token, replicating `submitOnboarding`'s network call. Then it observed the real
routing outcomes (home + invite flow) with the injected session.

Code-verified the link itself: `GoogleSignInButton` and the save-progress
auto-submit `useEffect` both read the same Redux auth source (`useAuth()`), so a
real Google click dispatches `setSession` -> the `useEffect` fires
`submitOnboarding()` -> `/welcome/connections` -> home.

## Findings (non-blocking)

1. Dual auth source. `ProtectedRoute` reads `useAuthContext()` (the AuthProvider
   React Context, boot-hydrated from `authService.getSession()` in
   `infrastructure/providers/auth-provider.tsx`), but the save-progress auto-submit
   and the Google button read `useAuth()` (Redux `state.auth`, set only by a fresh
   `setSession` dispatch and never boot-hydrated from an existing Supabase session).
   - Normal new-customer path is unaffected (the Google click sets Redux).
   - Narrow, self-healing edge: a user with an existing Supabase session who reloads
     exactly on save-progress with onboarding still incomplete would see the Google
     button again instead of auto-completing; one more click resolves it.
   - Optional hardening: dispatch `setSession` into Redux at boot from
     `getSession()` so the two sources never disagree. Store is not exposed on
     `window`. NOT done autonomously (touches working auth; awaiting Astro's call).

2. No `preferredLanguage` bug. The DTO rejects uppercase ("must be one of: vi, en");
   the web app correctly sends lowercase `"en"` (`PreferredLanguage.English === "en"`
   in `domain/enums/preferred-language.ts`). A first API probe used "EN" by mistake;
   corrected to "en" -> 201.

## Harness notes (for re-runs)

- birth-date uses a custom DatePicker = 3 controlled text inputs (placeholders
  DD/MM/YYYY) that strip non-digits; type real digits, not arbitrary text.
- mirror-question's `@repo/ui` Textarea has no id/name; select via `page.$("textarea")`,
  then SHOW ME and wait for the reveal panel's CONTINUE (always renders, even on AI
  timeout, via graceful fallback).
- Onboarding answers persist to `localStorage.murror_onboarding_data` and survive
  navigation.

## Session context (what this verification covered)

The capstone for a session that shipped, on `feat/web-app-from-mobile`:
daily voice summary to full parity (956ee11), milestone voice UI (45871ed) +
pipeline (viasr #454/#455/#456/#457, murror-api #444/#445), JA language enum
(murror-api #443), 5 reported bug fixes (bad8f30), and the post-signup
invite-friends flow (b4e492e).

## Verification status

PASS. A real new account reaches home with the invite step in between, consistent
with mobile. Only the Google sign-up click is unverified (scoped out), and its
wiring is code-verified.
