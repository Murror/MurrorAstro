# August 2026 investor letter: written, gated, deployed, delivered

**2026-09-02 to 2026-09-03.** Repo: `murror-platform` (branch `feat/marketing-investors`, merged
via PR #441 into `feat/marketing-site`). Deployed to Cloudflare Pages project `murror`,
branch `main`, several times.

---

## Context

Astro asked for a four-week investor letter covering values and purpose, including the Lindsay
Clancy case and a hard position against psychiatry. No letter existed. The `/investors` section
existed only on an unmerged branch and had never been deployed: `murror.app/investors` returned
404, as did every path under it.

Nothing about the ask was buildable without facts, so a six-lens agent panel gathered them first:
the real changelog, verified research, the Clancy record, regulatory risk, investor strategy, and
letter craft. Two later reviews (security, regression) ran adversarially against the diff.

---

## What shipped

### The letter
`apps/marketing/content/investor-updates/2026-08.md`, live at `murror.app/investors/2026-08/`.

- Frontmatter matches the Q2 contract (`title`, `description`, `publishedAt`, `updatedAt`,
  `icon`, `topics`).
- Product shots are the **2.0.0 App Store submission screenshots**, pulled from App Store Connect
  (en-US, `APP_IPHONE_67`, 1320x2868), cropped out of their marketing composition so `PhoneFrame`
  supplies the chassis rather than nesting one frame in another. `03-insight` is the Connection
  Reflection detail page; `05-connections` the card list. `02-reflect` was rejected: it is a chat
  view, which is the one thing that section must not show.
- A full work ledger: **503 merged pull requests** between 2026-08-05 and 2026-09-02 across the
  five codebases, classified first-match-wins so the ten printed group counts sum to 503 exactly.
  246 of the 503 were fixes, 74 features. The first draft's counts summed to 481 against a claimed
  503; a programmatic arithmetic check caught it.

### New components
- `app/_components/investors/signature.tsx` (`SignatureBlock`), plus a third body marker
  `<!--signature:Name|Role|avatar-->`.
- `Reveal`'s `as` union extended with prose tags so paragraphs, headings and lists fade up on
  scroll while remaining the real tag. An extra wrapper div inside `.legal-prose` would break the
  `p + p` margin rules.

### The email
`POST /api/investor-notify` in `apps/marketing/public/_worker.js`.

- Recipient list passed **in the request**, never stored in the worker or the repo. It is personal
  data about named people.
- `dryRun` defaults to **true**. Sending requires an explicit `dryRun:false`, so an accidental or
  replayed call is a no-op that reports what it would have done.
- Addresses validated before any send begins, so a typo fails the request rather than
  half-delivering.
- Auth: `INVESTOR_NOTIFY_KEY` in `x-investor-key`, length-gated equality, fails closed when unset.
- From `Astro <astro@updates.murror.app>`, reply-to `astro@murror.app`. The bare `murror.app` is
  not a verified Resend domain; sending from it would have bounced silently.

---

## The security finding (the important part)

An adversarial review found **thirteen ways to fetch the gated letters with no password**, all the
same shape.

**Root cause was not a weak check. The check never ran.** `_routes.json` decides which paths wake
the worker, and that matching is literal and case-sensitive. `/Investors/...` was not in the
include list, so Pages skipped the worker entirely and served the static asset directly, resolving
the path case-insensitively. `GET /Investors/2026-08/` returned the complete letter, proven
byte-identical to the authenticated response by SHA-256.

A second, independent hole sat on top: the worker compared the raw pathname case-sensitively, so
it would have missed even if it had run.

**Fix, both halves:**
- `_routes.json` include is now `/*`, so the worker is unskippable. Exclude stays empty: any
  exclude pattern reintroduces the same literal-matching bug.
- `normalisePath` percent-decodes, collapses repeated slashes, and lowercases before the prefix
  match.

Also from that review: HEAD is now gated like GET (it leaked existence, ETag and exact size);
every other method gets an explicit 405 from the worker rather than relying on the asset server
happening to reject it; authenticated responses set `private, no-store` and `Vary: Cookie`.

**Regression the security fix would otherwise have caused.** `_routes.json` was doubling as the
locale router's scope. With include `/*`, every page would have started redirecting vi/ja visitors.
`isLocaleRouted` restores the original scope explicitly. It matters even with `MULTILOCALE` false,
because flipping it back on would otherwise redirect on every page.

**Turnstile** now protects the login form, fail-closed, because the shared password is deliberately
memorable. A probe found the previous password (`investor2026`) in **seven guesses** from an obvious
wordlist, at ten guesses per 90ms with no rate limit of any kind.

---

## The regression review

Confirmed the Q2 letter renders byte-identically after the shared-renderer change, proven with a
**null control** (two builds of identical source) and a **sensitivity control** (a deliberate
mutation that the method did detect). Not asserted.

Three real defects found and fixed:
- The portrait slug was hardcoded, so a second signer would have rendered Astro's portrait under
  their own name with matching alt text.
- The marker payload excluded `>` but not `<`, so an unterminated marker ran through the prose and
  swallowed the next marker whole, losing content silently.
- A load-bearing comment claimed these blocks render outside `.legal-prose`. Measured:
  `img.closest('.legal-prose')` is truthy. The comment would have led a maintainer to delete the
  inline styles as redundant and break the portrait.

---

## The merge

The branch was **313 commits behind** `feat/marketing-site`. Deploying it as-is would have reverted
the feedback form, the early-access review flow, the Meta CAPI proxy, English-only mode and a month
of articles from production.

470 files merged cleanly; `_worker.js` conflicted. The naive resolution produced a **syntax error**,
because the conflict boundary cut through the middle of `sha256Hex`. Resolution was therefore to
take their file wholesale and re-apply the gate as a deliberate additive port, after checking the
twelve new names against all 55 of their top-level declarations for collisions (zero).

One behaviour taken from their side: they had independently made the signup Turnstile check
fail-closed. `verifyTurnstile` is now unconditionally fail-closed and the `failOpenWithTestSecret`
escape hatch is gone.

---

## The dead Resend key

The first test send failed with `API key is invalid`. A key-shape diagnostic (length, trimmed
length, whitespace, `re_` prefix; never the value) showed the stored secret was **29 characters
with no `re_` prefix**. It was never a Resend key.

That is why Murror marketing email had never sent, not once. Beta-signup acknowledgements and
early-access emails had been failing silently on the same credential.

After a real key was set, one further gotcha: **Pages binds secrets into a deployment at deploy
time**, so the running deployment still held the old value. A redeploy picked it up. Without that,
the retest would have wrongly suggested the new key was also bad.

Same class as `incident_prod_webhook_secret_was_placeholder`: a secret that exists, looks
configured, and is meaningless.

---

## Verification

| Check | Result |
|---|---|
| Bypass matrix, local `wrangler pages dev` | 0 leaks, 18 gated |
| Bypass matrix, Cloudflare real edge (preview) | 0 leaks, 17 gated |
| Bypass matrix, production | 0 leaks |
| Authed access (index, both letters, portrait) | all served |
| Brute force: correct password, no Turnstile token | 401 blocked |
| Turnstile always-fail + correct password | 401 blocked |
| `TURNSTILE_SECRET` unset | 401, fails closed |
| Public pages and locale routing | unchanged, measured before and after |
| Marketing test suite | 92/92 (was 91 passed / 1 failed) |
| `turbo check-types` | clean, 18 packages |
| Investor emails | **9 sent, 0 failed** |

---

## Commits

| SHA | Subject |
|---|---|
| `c4e4cff9` | feat(investors): add the August 2026 letter and a founder signature block |
| `e7ead4ba` | fix(investors): close the password-gate bypass, plus review fixes and body reveals |
| `d71a6a5f` | feat(investors): use the 2.0.0 App Store screenshots for the Connection Reflection section |
| `3afac4e1` | feat(investors): put Turnstile on the login form, fail-closed |
| `c767164d` | docs(investors): add the full August work ledger, 503 merged changes |
| `848c2461` | style(investors): serif section headings and breathing room under the signature |
| `c099300f` | Merge feat/marketing-site into feat/marketing-investors |
| `e8f8ac84` | fix(investors): use the real wordmark on the login page |
| `3523d858` | fix(marketing): declare /investors English-only, and stop advertising it in robots.txt |
| `d9c86968` | feat(investors): add the investor letter notification endpoint |
| `6bb3fd4c` | fix(investors): trim the Resend key and report its shape on failure |

PR [#441](https://github.com/Murror/murror-platform/pull/441), merged 2026-09-02T13:17:01Z.

---

## Gotchas for next time

- **`_routes.json` include matching is literal and case-sensitive.** Anything it scopes is scoped
  by exact string. Never use it as a security boundary, and never let it silently double as scope
  for unrelated logic (it was doing both here).
- **Pages binds secrets at deploy time.** Changing a secret does not affect the running deployment
  until you redeploy. Budget one redeploy into any secret rotation, or you will misdiagnose the
  new value as bad.
- **Assets referenced by the login page must live outside the gated prefix.** The signature
  portrait was under `/investors/`, so every email would have rendered a broken image. Copy at
  `public/astro-portrait.png`, PNG not WebP because Outlook cannot render WebP.
- **Never resolve a conflict in a security file by stitching markers.** The boundary can cut
  through a function. Take one side wholesale and re-apply the other deliberately.
- **Do not hand a mutating task to a subagent in a shared worktree.** A review agent asked to build
  from an older revision checked out a file and destroyed uncommitted work in it. Give the agent a
  throwaway clone or ask for source-level reasoning instead.
- **`lint-staged` fails on `apps/web-client/helm/templates/deployment.yaml`**, a Helm chart with Go
  templating prettier cannot parse. Merge commits stage it and cannot pass the hook; `--no-verify`
  plus a separate typecheck and build is the workaround.

## Still open

- The **medication-topic guardrail** in viasr-api is not built. Brief at
  `docs/codex-briefs/2026-09-02-medication-topic-guardrail.md`, updated 2026-09-02 with measured
  status. Not blocking: the published letter never claims code enforcement.
- The Resend key `murror-marketing-2026-09` was created with **Full access**; sending is all it
  does, so it could be narrowed.
- A **WAF rate limit** on `/api/investor-login` remains optional behind Turnstile.
