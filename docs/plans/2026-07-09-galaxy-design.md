# Murror Galaxy — Design

- **Date:** 2026-07-09
- **Author:** Codex with Astro
- **Status:** Design approved; implementation plan to follow
- **Driver:** Let people autonomously find understanding beyond their existing close relationships, while preserving Murror as a private and safe place for reflection.

## 1. Goal

Add **Galaxy**, an opt-in discovery layer where adults can meet through voluntarily shared, short-lived Signals. A connection may become friendship, romance, creative kinship, or one meaningful exchange, but no outcome is assumed.

Murror remains a private mirror for self-reflection and close relationships. Galaxy is a separate outer orbit, never a way to expose journals by default.

## 2. Decisions (Astro)

| Question | Decision |
|---|---|
| Relationship scope | Any outcome may grow: friendship, romance, collaboration, or a meaningful one-time exchange. |
| Discovery model | A finite, relevant field of Signals, not a global infinite social feed. |
| Entry | First-time Galaxy setup is remembered; browsing and availability are lightweight thereafter. |
| Private/public boundary | A private journal never becomes public. A user explicitly creates or approves a separate Galaxy Signal. |
| First contact | A heart means “I relate”; “I can listen” offers one consented, guided exchange. No direct chat opens automatically. |
| Relationship progression | Signal → Resonance → Orbit. Ongoing contact is earned through mutual choices. |
| Pass | Pass hides that exact Signal for the viewer, privately and permanently; it does not notify or penalize the author. |
| Design process | Every design must show a visual and explicitly model before, during, and after states before implementation begins. |

## 3. Product language

| Term | Meaning |
|---|---|
| **My Space** | The private Murror experience: journal, AI reflection, close connections, and earned Orbits. |
| **Galaxy** | The opt-in discovery surface for new people and current Signals. |
| **Signal** | A short, editable, alias-based, expiring item a user explicitly chooses to share in Galaxy. |
| **Resonance** | A bounded first contact: either a quiet “I relate” or an offer to listen. |
| **Orbit** | A persistent private relationship space created only after mutual continuation. |
| **Field** | The finite set of current, compatible Signals shown in Galaxy; it is not an infinite feed. |

## 4. Non-negotiable boundaries

1. **Private by default.** No journal entry, chat, voice note, photo, or AI-inferred feeling is eligible for discovery unless the user deliberately creates and approves a separate Signal.
2. **Pseudonymous outside, accountable inside.** Galaxy begins with aliases and abstract avatars, while Murror maintains account-level enforcement, age assurance, anti-fraud controls, and moderation records.
3. **Adults only at launch.** Romance and discovery cannot include minors or ambiguous-age accounts.
4. **Mutual, gradual disclosure.** Identity, photos, live chat, external contact, and exact location never unlock by default.
5. **No public popularity system.** No follower graph, likes, reposts, public comment threads, view counts, compatibility scores, or paid visibility.
6. **Support is not therapy or crisis care.** Acute-risk content exits discovery and receives the appropriate support path; it is never distributed as matching inventory.

## 5. One-time setup and persistent controls

### First Galaxy visit

The user completes a short, editable setup:

- adult verification and a pseudonymous alias;
- language, broad timezone/region, values/vibe, pace, and capacity;
- intentions: be understood, friendship, romance, or open to seeing what grows;
- content boundaries and topics to avoid;
- a separate optional consent to use selected themes from private reflections to personalize what they **see**. This consent never shares the source reflection.

### Every later visit

- **My Space / Galaxy** is a persistent top-level switch.
- The user can browse Galaxy with no active Signal.
- **Open to new Resonances / Receiving paused** is one tap. Pausing removes active Signals from new discovery but does not affect private journals or existing Orbits.
- The Signal composer remembers the user’s saved intentions, alias, boundaries, and expiry preference, but every Signal is still reviewed before it is visible.

## 6. Signal lifecycle — before, during, and after

### Before: a Signal enters Galaxy

1. A user creates or approves a standalone Signal, chooses its intention and a short expiry window.
2. Murror previews the exact Signal, alias, audience boundary, and expiry before publication.
3. Automated and human safety controls remove or hold personal contact details, scams, doxxing, exploitation, unsafe solicitation, and acute-risk content.
4. The Signal enters a compatible, finite Field. Matching uses selected topics, mutual intention, language, availability, broad region when appropriate, fairness, and safety eligibility—not raw private writing or inferred vulnerability.

### During: a user encounters a Signal

Each card shows only:

- alias and abstract avatar;
- short user-approved Signal;
- intention, boundary, broad language/timezone, and expiry;
- a clear explanation of relevance based on consented inputs.

The first-contact actions are intentionally small:

| Action | Meaning | Immediate effect |
|---|---|---|
| **♡ I relate** | “This landed with me.” | A private acknowledgment reaches the author. No chat opens and no public count is created. |
| **I can listen** | “I have capacity for one gentle exchange.” | The author may accept, decline, or let the request close. No direct message opens automatically. |
| **Pass** | “Not this Signal, not this moment.” | The Signal disappears for that viewer. A brief Undo is available. |

“Ask to connect” is not a feed action. It occurs only later, after a mutual exchange has earned enough safety and interest for an Orbit.

### After: every important outcome

| Outcome | Viewer state | Author state | System behavior |
|---|---|---|---|
| **Heart** | Card leaves the active Field. | Receives a private resonance, never a public like count. | Closes quietly unless both choose more. |
| **Listen accepted** | A pending Resonance becomes one guided, asynchronous exchange. | Chooses whether to accept. | No live chat, files, links, or location sharing. |
| **Listen declined or expires** | Neutral closure; no rejection explanation or score. | Neutral closure. | The request closes quietly. |
| **Pass** | Exact Signal never returns. Undo is briefly available. | No notification, pass count, or visibility penalty. | No automatic card refill; different Signals from the same person require a meaningful cooldown. |
| **No action** | Signal remains once in the current Field, then disappears. | No exposure or rejection metrics. | It does not chase the viewer through notifications or repeated resurfacing. |
| **Signal expiry** | Passed Signals remain passed; other Signals leave the Field. | May rest, revise, or open a new Signal later. | Murror never says “nobody wanted you” or exposes view/pass data. |

## 7. Feed, pass, and discovery rules

Galaxy is a calm, finite matching window—initially a small daily Field rather than an endless scroll. The end state should explicitly say that the current Field is complete and that more Signals arrive when meaningful.

### Pass semantics

- **Pass this Signal:** suppress this exact Signal permanently for the viewer. It is private, needs no reason, does not lower the author’s standing, and offers brief Undo.
- **Not interested in this topic:** a reversible, time-bounded preference that reduces a category; it never affects the author.
- **Hide this person:** suppress future Signals from that alias; reversible in safety settings.
- **Block:** immediate, durable two-way separation; no future discovery or contact.
- **Report:** immediately hides the Signal and starts moderation review; the reporter’s identity is never disclosed.

The system must not create a new card immediately after a pass. This prevents Galaxy from becoming a swipe loop. Every eligible Signal receives a bounded, fair exposure budget among compatible users before it is deprioritized; popularity, image appeal, paid boosts, and time spent never determine visibility.

## 8. Relationship progression

```text
Private reflection
  → user-approved Signal
  → quiet Resonance or offer to listen
  → mutual guided first exchange
  → both independently choose whether to continue
  → private Orbit
  → friendship, romance, collaboration, or a meaningful close
```

Romance is an outcome, not the discovery engine. It is available only when both verified adults separately select that openness. A user may be open to different intentions in separate compatible pools, but romance, friendship, and support-seeking should not share a queue by default.

## 9. Safety, privacy, and moderation

- visible block/report on every Galaxy surface and immediate enforcement;
- rate limits, anti-spam/scam detection, abuse review, audit logs, and meaningful appeal routes;
- no images, attachments, external links, payments, or location in early exchange stages;
- no exact location, school, workplace, full name, or off-platform contact until later double consent;
- prevention and priority escalation for harassment, coercion, stalking, sexual exploitation, image-based abuse, impersonation, discrimination, and financial scams;
- separately consented, minimal collection of gender, orientation, relationship status, and romantic openness; never infer these from private reflections;
- moderation capacity, incident-response targets, legal/privacy review, and red-team testing are launch gates, not post-launch aspirations.

## 10. Success measures and anti-metrics

### Primary outcome

The primary measure is the share of completed participants who report: **“I felt more understood and no less safe.”** Measure it one day and seven days after an exchange.

### Operational measures

- time to first respectful, relevant exchange;
- signal coverage and exposure fairness;
- share-to-meaningful-exchange conversion;
- Signal regret/delete rate, blocks, reports, and harmful-contact incidence;
- capacity saturation and moderation cost per helpful exchange;
- return to private reflection and activation of close-connection practices after Galaxy use.

### Do not optimize

Do not optimize messages sent, scrolling time, feed impressions, swipes, popularity, follower counts, romantic conversion, or paid visibility. Those measures would turn a sanctuary into an attention machine.

## 11. MVP and non-goals

### MVP

- 18+ verified pilot cohort;
- aliases and abstract avatars only;
- standalone expiring Signals;
- bounded compatible Field;
- ♡ I relate, I can listen, and Pass;
- guided asynchronous first exchanges;
- separate Resonances and Orbits inbox states;
- one-tap pause/withdraw controls;
- block/report, moderation, and crisis-exit pathways.

### Explicitly out of scope for MVP

- global searchable people directory;
- infinite feed, swipes, popularity mechanics, or advertisements;
- photos, live chat, voice/video, attachments, payment requests, or location sharing;
- automatic publication from journaling or AI inference;
- local romance discovery until adult verification, moderation, and city-level liquidity prove ready;
- youth discovery.

## 12. Open implementation decisions

1. Exact initial Signal expiry defaults by intention.
2. Cooldown before a new Signal from a previously passed alias may appear.
3. The minimum cohort size, themes, languages, and moderation staffing required for the pilot.
4. The first-exchange prompt design and its maximum duration.
5. Identity-verification provider and abuse-prevention architecture.
6. The smallest safe way to test whether a Heart should be visible to the author as a private individual resonance or an anonymous aggregate.
