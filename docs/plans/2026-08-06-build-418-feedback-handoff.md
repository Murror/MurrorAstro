# 2026-08-06 — Build 418 feedback, and the groundwork for the next session

Astro's feedback on build 418, plus what was already established about each item so
the next session starts from findings rather than zero. **Nothing here is fixed.**

Builds 417 and 418 are both live in TestFlight, see
`2026-08-06-builds-417-418-shipped.md`.

---

## 1. Paywall and premium confused (HIGHEST SEVERITY, do first)

**Astro:** "When I first came into the app, there was no soft paywall at all. I went
to the settings and checked, and it did show that I have a premium subscription.
When I go back, tapping around, then go back to the history or research page, I
started to see the locks."

A paying subscriber being shown locks is a revenue and trust bug.

**Why the description is diagnostic:** no locks initially, Settings reports premium,
locks appear only after navigating. That is the signature of **two different
derivations of "is premium"** where one hydrates later or falls back to locked, not
of a single wrong flag.

**First step:** find both call sites, the one Settings reads and the one the card
gates read, and establish which is stale on focus. Do NOT widen a shared
entitlement query, see `feedback_occupancy_vs_entitlement` and
`feedback_one_derivation_for_a_key`.

Related prior art: `incident_prod_freemium_leak_free_plan_active` (the inverse
failure, "Free Plan ACTIVE" granting premium to ~92% of prod) and
`project_freemium_locked_card_gates`.

---

## 2. Connection prompt pronouns still wrong

**Astro:** "The gender pronoun in the prompt suggestion for connection is still
wrong. When the user taps on refresh the prompt, it felt like the prompt was
pre-determined rather than being generated based on the context of the person."

TWO separate failures, both mine.

### It never shipped

The fix from the previous session is **still uncommitted in the `viasr-api` working
tree**. It is a server-side prompt change that ships by API deploy, not TestFlight,
so build 418 could not have contained it. Check `git status` in `viasr-api`.

### It was probably the wrong surface anyway

Astro's "felt pre-determined" is accurate, and it is the tell. Established this
session:

- `add-log-screen.tsx:1740` `onChangePrompt` cycles a **pool** with a refresh nonce
  and an exclusion set. Its own comment says "pool picks used Math.random" and
  "Fix (mobile-only, no backend endpoint)". Refresh does NOT regenerate anything.
- The pool arrives from `useGetSuggestions` ->
  `apiClient.journals.getSuggestions(relationshipConnectionId)`.
- **Verified there are NO gendered pronouns** in `src/utils/reflection-prompt.ts`
  or in any prompt/suggest/reflect locale string. So the wrong pronoun is not
  client-side.

Conclusion: prompts are generated server-side ONCE, stored/pooled, then cycled on
the client. The wrong pronoun is **frozen in the stored pool**.

The previous fix edited `app/prompts/relationship.yaml:890`, which drives the
relationship INSIGHT ("Expression difference"), a different surface from connection
prompt suggestions.

**What actually fixes it:**
1. Find the server prompt that generates SUGGESTIONS (not relationship.yaml) and
   apply the same rule: address by first name, never a third-person gendered
   pronoun, they/them fallback.
2. Add the OUTPUT guard (layer 2 of the agreed design). This is the durable part.
3. Regenerate or filter the EXISTING pool. Without this, already-stored prompts
   keep serving wrong pronouns no matter what the prompt says.

The relationship.yaml change is still worth keeping and committing; it fixes a real
instance of the same class on a different surface.

---

## 3. Keyboard pushes the note field under the header

**Astro:** "When tapping on the writing note text field, the keyboard goes up and
pushes the text field input field all the way to the top, which goes under the
header and hits the text field itself."

Layout. The composer's keyboard avoidance is not accounting for the header inset,
so the input travels past it. Not yet investigated.

---

## 4. Zodiac cards are black on a black section

**Astro:** "Zodiac cards right now are in black, and the section is also in black,
so it's very unclear on the card. Can we add a subtle border to the cards so that
it's more legible?"

Styling. Note this may have been WORSENED by the build-417 background change, which
darkened the shared gradient bottom stop from `#323245` to `#15151D` and aligned
nine full-screen backdrops. If the zodiac section sits on that gradient, the cards
lost contrast as a side effect. Worth checking that before treating it as
pre-existing.

---

## 5. Orbit dots less vivid on Home than in onboarding

**Astro:** "the dots in the orbit on home are not as vivid as the dots in the orbit
within onboarding. Please make it vivid in onboarding as well. Keep them
consistent."

Two implementations that have drifted. A first grep of `src/components/orbital/`
and `src/screens/onboarding/v2/` for dot/particle/star/field files found nothing,
so the files need a real search before any change.

Also possibly a side effect of the 417 background darkening plus the aurora wash
cuts (top 0.30 -> 0.14, bottom 0.26 -> 0.07): the dots may be unchanged while their
backdrop moved. Measure before restyling.

---

## The pattern worth naming

Four of the hard bugs this week were the same shape: **one thing implemented twice,
drifting apart.**

- R10 purple retint lived in TWO copies, `tab-controller.tsx` and
  `murror-bubble.tsx`. Fixing the nav did not fix the FAB.
- The app background had **15 hand-rolled copies** of `['#000000', '#323245']`
  while a comment claimed "ONE derivation".
- The paywall had two prop-driven variants that read as two different screens and
  cost several rounds of debugging the wrong one.
- Item 1 above (two derivations of "is premium") and item 5 (two orbit dot
  implementations) look like the same shape.

A deliberate dedup pass would likely pay for itself. The cheap version: grep for
duplicated colour literals and duplicated entitlement checks, and give each one a
single named source.

---

## Process lessons from the same run

- **Read the runbook before declaring a blocker.** The TestFlight upload was called
  impossible twice; `docs/runbooks/ios-build.md` had the `-authenticationKey*`
  flags all along, and the API key IS the account. See
  `feedback_read_the_runbook_before_declaring_a_blocker`.
- **Verify which screen is on the simulator before trusting a pixel sample.**
  Numbers were reported from the wrong screen three times. Assert on a known glyph.
  See `feedback_verify_screen_before_sampling_pixels`.
- **`scripts/ios-next-build.sh` MUTATES.** It was run as a read-only App Store
  Connect query and wrote a stray 419 that had to be reverted.
- **A correct measurement of the wrong thing is worse than none.** The paywall
  footer ramp measured "correct" five times while the real cause was that the
  footer was a flex sibling with nothing behind it.

---

## Still open from before

- `PROGRESS.md` has a multi-author uncommitted pile-up. Codex confirmed the hunks
  must be split per author. At least three authors involved, including an orphaned
  iOS/TestFlight section from an earlier Claude session.
- Notion Engineering Log still blocked. Verified again 2026-08-06 via Composio:
  connection ACTIVE (workspace Murror), but the database returns
  `404 object_not_found` with "Make sure the relevant pages and databases are
  shared with your integration Composio". Astro must add the Composio connection
  to that database. Three writeups are pending.
- MTC card overlap: did not reproduce across four simulator configurations. No
  seventh fix written. Recommendation is a latching diagnostic capturing the real
  max per-item `animationValue` and measured face/stride from Astro's device,
  because the build-414 telemetry structurally cannot report a bad frame.
- `SET_SUPPORT_TITLE` now has zero code references but the unused-key scanner still
  passes it.
- `hermes.framework` dSYM missing from archives, so Hermes frames will not
  symbolicate in crash reports.
