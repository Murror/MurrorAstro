# Murror launch hardening — session handoff, 2026-08-13

Paste the block below into a new session.

---

## PROMPT

Continue Murror iOS launch hardening. Scope is **iOS mobile, launch only. Apple Watch, Android and Web are out of scope.**

Read `Murror/docs/plans/2026-08-13-launch-hardening-handoff.md` (this file) and the scratchpad file it names before starting. Do not re-derive what is already verified below.

### Ground truth you must not re-litigate

- **Canonical mobile branch is `staging-environment-setup`, NOT `main`.** `main` is stale at PR #974 and carries none of this work. Measured against `main`, every finding below looks open and every fix looks missing.
- Build **430**, marketing **2.0.0**.
- The local `Murror/MurrorMobile` checkout is stranded on an old branch at build 380 with 7 dirty files. **Never work there.** Create a fresh worktree off `origin/staging-environment-setup`. A fresh worktree has no `node_modules`; run `yarn install` or symlink from an existing worktree.
- Live App Store build is **1.0.19 from November 2025**. Build 430 is uploaded but attached to no App Store version. **1.1.0 is REJECTED.**
- Production Supabase is `dcftszkbpamgeivhtuzl`. Staging is `sprkxmwrvgqgebajopwp`.

### Already done, do not redo

- **RLS leak CLOSED in production and verified.** `deep_chat`, `deep_chat_message`, `connections`, `friend_invitations`, `streaks` are now scoped to `auth.uid()`. Migration also exists as murror-backend PR #907 (merging it records history; the change is already live).
- **OSV `extract-zip` advisory** already recorded in the baseline on the canonical branch. CI is green again.
- MurrorMobile PR **#1094** (consent gate on journal completion) is open, rebased, adversarially reviewed, and fixed. CI should be green.
- Launch board artifact: https://claude.ai/code/artifact/18706bde-ace5-4d13-b820-38d8dc69e0cd
- Privacy decisions in Notion: https://app.notion.com/p/3bb3af4aaa928132928fc864b48bfc87 (37 `[NEEDS DECISION]`, 18 `[NEEDS COUNSEL]`)
- ASC API credentials exist: key ID `GGV7225WH5`, issuer `628f9cc5-6342-4c1d-8a74-3723334b1fc2`, `.p8` at `~/.appstoreconnect/private_keys/`. Astro adds them as repo secrets; never handle the key material yourself.

### Your tasks, none of which need Astro

Work each to a reviewable PR against `staging-environment-setup` (mobile) or `staging` (api). Never push direct.

1. **CONSENT-004 reword.** Draft autosave POSTs the reflection before any consent gate: an 800ms keystroke debounce calls `persistComposer` then `saveDraft` then `syncDraftToBackend` then `journals.create({journal, isDraft: true})`. `onSaveDraftLog` and `onSaveAndExist` do it on demand. Astro decided: **do not gate the save, reword the consent copy** so it is accurate about what is stored versus what is sent for AI analysis. Copy lives at `src/locales/en.json` under `descriptionAIProcessingConsent`. English only at launch.

2. **viasr-api log body privacy.** Production still logs request and response bodies. On `origin/main`, `app/components/environment/config.yaml` has `log_request_body: ${HTTP_LOGGING_REQUEST_BODY:true}`. PR #591 (`182ab3b`) flipped the defaults but is on `staging` only; promotion PR #611 is a DRAFT. PR #615 is open and adds masking for `text`, the field name on `ChatRequest`. No `HTTP_LOGGING_*` key exists in `helm/values.yaml` or the CI ConfigMap builder, so nothing pins it. Land #615, add the explicit keys to helm and the CI `key-value-pairs:` block, and get the default flip onto `main`. Do not deploy; rollout is Astro's.

3. **PHQ-9 crisis resources.** A user scoring severe sees a severity word, a paragraph and a PubMed link. No crisis resource at all. `src/screens/mentalTests/test-result-screen.tsx` is the whole surface (~182 lines). **Do not write new clinical copy.** Reuse the existing surface: `CrisisInlinePrompt` accepts `metadata` and `getCrisisSignal` fires on `metadata.crisis === true` (see `src/utils/detect-crisis.ts`), so render it when `depression_severity` or `anxiety_severity` is severe. That inherits the reviewed copy and the "never sell into distress" upsell suppression. A branch `fix/phq9-crisis-resources` and worktree `Murror/mobile-phq9-crisis` already exist. **Do NOT touch the severity thresholds** — a clinician is handling those separately.

4. **SEC-427-002.** `ios/MurrorLiveActivity/LiveActivityPhotoStore.swift:28` calls `URLSession.shared.data(from:)` with no host allowlist, MIME check or byte cap, writing to one shared filename. Caller `ios/RNLiveActivityBridge.swift:52-53` passes any string that parses as a URL. This is a native change, so it needs an iOS build.

5. **`journal_prompts` follow-up.** Still `USING (true)` for `authenticated` in production. 65 rows, and it HAS a `user_id` column. Check whether `user_id` is populated. If those are per-user generated prompts they are world-readable; if it is a shared pool with null user_id the policy is fine. Decide, then either scope it or record why not.

6. **PRIV-427-003 consent flag split.** Astro decided: `enable_cleanup_data` becomes **consent only**; deletion gets its own column. Today one column means both, so declining AI training also schedules deletion in two weeks via `delete_old_user_data()` on a 15-minute pg_cron job (`murror-backend/supabase/migrations/20240807120939_clean_up_user_data.sql:85`). **Do not flip any existing user's stored value.** This unblocks CONSENT-003 (server-side consent enforcement; `deep-chat.controller.ts` currently carries `AuthGuard` and nothing else across all 15 routes).

### Traps that cost real time this session

- **Read the policy CONTENT, never the policy COUNT.** `deep_chat_messages` (plural, Prisma) has zero policies and is closed. `deep_chat_message` (singular, Supabase) had one policy and it was `USING (true)`. Checking the plural one and reporting safety was a one-character mistake with a 26,937-row blast radius.
- **RLS fixes must DROP, not ADD.** Permissive policies combine with OR. `streaks` already had a correct scoped policy sitting uselessly beside a permissive one.
- **`indexOf` ordering assertions need `toBeGreaterThan(-1)` first**, or deleting the thing under test returns -1 and the assertion passes on the exact bug it guards.
- **Verify every count before quoting it.** Three numbers were wrong this session and each was caught by tooling or a reviewer, never by re-reading: six tables that were five, CVSS 7.1 that the scanner reports as 8.6, 38/19 markers that were 37/18.
- Commitlint rejects body lines over 100 chars and `#123` references in the body. No em dashes anywhere in copy, prompts or commit messages. Never re-add `--forceExit` to jest.

### Open question worth resolving early

The App Store rejection was **"could not use the provided account to sign in and test the product."** Astro believes shipping the freemium paywall unblocks it. That is probably wrong: the paywall sits after sign-in, and **2,813 of 3,103 production users currently hold placeholder Premium** (SUB-001), so a demo account almost certainly saw no gate. Production also never sends confirmation emails, which matches the wording. Shipping SUB-001 could make review harder by removing that accidental entitlement. Recommend testing the actual review-notes credentials against production before treating freemium as the fix.

### Waiting on Astro, do not block on these

Merge #1094 and murror-backend #907 · add the three ASC secrets then merge #1093 · SUB-001 ramp decision (the flag is a boolean, 1/10/100 bucketing does not exist) · PHQ-9 band thresholds (clinician) · 37 privacy decisions · six physical-device gates · move the artifact share pin.

### Detailed evidence

Full verified findings with file:line evidence are in the previous session's scratchpad at
`/private/tmp/claude-501/-Users-astro-Projects-murror-transfer/5c1bee0c-3025-41cb-9243-24cf8ef4017e/scratchpad/verified-findings.md`
If that path is gone, everything load-bearing is reproduced above.
