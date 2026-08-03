# Production analytics baseline, August 2026

**Pulled:** 2026-08-03 (PST)
**Source:** Mixpanel project 3639348 "Murror Live", workspace 4138492, org "Murror" (2567688)
**Author:** Oracle, Task 1 of `docs/plans/2026-08-03-analytics-visibility-repair.md`
**Status of every figure below:** explicitly marked VERIFIED or UNAVAILABLE. Nothing here is estimated.

> **Why this document exists.** An earlier read concluded "production mobile is invisible."
> That was correct about PostHog and wrong as a general claim. Mixpanel has been receiving
> production data continuously, including today. Nobody had queried it. This is the first pull.

---

## Headline

**Production is measured, and the measurement says the core loop is not working.**

Over the trailing 12 months, 3,617 unique users opened the app and **70** ever reached a
connection detail screen. That is **1.9%**. It was reached from Mixpanel event data, entirely
independently of the prod SQL pull recorded on 2026-07-31, which concluded "about 2 percent
have ever formed a connection." Two unrelated instruments, same answer.

---

## 1. Project identification

### 1.1 Which project receives production's token

| Item | Value | Status |
|---|---|---|
| Production Mixpanel project ID | **3639348** ("Murror Live") | VERIFIED |
| Workspace ID | 4138492 ("All Project Data") | VERIFIED |
| Organization | "Murror", ID 2567688 | VERIFIED |
| Production token (`Config.MIXPANEL_TOKEN`) | `0d967f8d…` (32 chars) | VERIFIED |
| Token source file | `MurrorMobile/.env.production`, **tracked in git** | VERIFIED |
| Token on `origin/main` vs local checkout | **identical** | VERIFIED |

**How the token-to-project mapping was proven** (not assumed from the project name):

1. `MurrorMobile/.env.production` and the web client's production env both carry the **same**
   token `0d967f8d…`. Confirmed by direct string match against `murror-platform`.
2. Project 3639348 contains **web-only** events (`LandingViewed`, `LandingGetStartedClicked`,
   `CheckoutStarted`, `CheckoutCancelled`, `PlanSelected`) **and** mobile-only events
   (`lifecycle.app_open`, `diary.*`, `onboarding.*`). Both surfaces read that one token and
   both land in this project.
3. `app_version` in this project is dominated by the 1.0.x App Store lineage
   (1.0.19 = 1,610 opens, 1.0.18 = 613), not by a staging build line.
4. Scale check: 3,617 unique users over 12 months, against 3,110 rows in production
   `auth.users`. Consistent (Mixpanel additionally counts users who never completed signup).
   Staging would be tens, not thousands.

### 1.2 Is it distinct from staging's project?

**VERIFIED: yes, distinct.**

| Env file | Token prefix | Same as production? |
|---|---|---|
| `.env.production` | `0d967f8d…` | (this is production) |
| `.env.staging` | `6bfe8e…` | **No** |
| `.env.development` / `.env.alpha2` | `6ee5b4…` | No |
| `.env.ode` | `7b7aba…` | No |

A Mixpanel project has exactly one project token, so different tokens necessarily mean
different projects. Distinctness is proven by token inequality alone and needs no further check.

### 1.3 Staging's project ID

**UNAVAILABLE.** The plan asked for both project IDs. Only production's can be recorded.

`List-Organizations` returns exactly one organization. `Get-Projects` returns exactly one
project (3639348). The credential behind this MCP connection cannot see any staging project.
So the staging token `6bfe8e…` either points at a project in an org this credential does not
belong to, or points at nothing at all. **I could not determine which.** Resolving it needs
either a Mixpanel admin console session or a credential with wider org access.

---

## 2. Production retention

### 2.1 A caveat that governs every number in this section

**There is no reliable "account created" event in production Mixpanel.** Every candidate is
either effectively dead or is not actually a signup. Measured over the trailing 6 months,
unique users:

| Candidate event | 6-month unique users | Why it is not usable as "signup" |
|---|---|---|
| `CompleteRegistration` | **1** | Effectively dead. Web-only marker. |
| `OnboardingCompleted` | **1** | Effectively dead. |
| `GoogleSignupSucceeded` | 4 | Only fired from 2026-07 onward. |
| `onboarding.create_account_clicked` | 70 | A button **click**, not a confirmed creation. |
| `kol.onboarding_login_success` | 399 | Login success. Fires for **returning** users too. |
| `auth.identified` | 344 | Identify call. Fires every session. |

I used `kol.onboarding_login_success` as the cohort-defining event because it is the only one
with enough volume to produce a non-degenerate curve. Mixpanel cohorts a user by their **first**
occurrence of that event inside the window, so each cohort is "users whose first login success
in the window fell in period P". **That is not a pure new-signup cohort** and the numbers should
not be quoted as though it were.

For completeness, the same retention run using `onboarding.create_account_clicked` (the closest
thing to a true signup) is in section 2.5. Its cohorts are 4 to 22 users, which is too small to
carry a decision.

### 2.2 Monthly cohort retention (VERIFIED)

Born event `kol.onboarding_login_success`, return event `lifecycle.app_open`, monthly buckets.

| Signup month | N | Month 1 | Month 2 | Month 3 | Month 4 |
|---|---|---|---|---|---|
| 2026-02 | 54 | 11% | 6% | 4% | 7% |
| 2026-03 | 80 | 9% | 6% | 5% | 5% |
| 2026-04 | 85 | 2% | 2% | 0% | 0% |
| 2026-05 | 74 | 1% | 1% | 0% | - |
| 2026-06 | 82 | 6% | 0% | - | - |
| 2026-07 | 35 | 0% | - | - | - |
| **Average** | **72.9** | **5%** | **4%** | **3%** | **6%** |

### 2.3 Weekly and daily cohort retention (VERIFIED)

| Granularity | Window | Avg cohort N | P1 | P2 | P3 | P4+ |
|---|---|---|---|---|---|---|
| Daily (June cohorts) | 2026-06-01 to 2026-07-02 | 4.98/day, 82 total | **7%** | 2% | 3% | 0% by day 19 |
| Weekly | 2026-06-01 to 2026-08-03 | 4.24/day | **8%** | 5% | 4% | 0% from week 4 |
| Monthly | 2026-02 to 2026-07 | 72.9/month | **5%** | 4% | 3% | 6% |

Reading the daily row at the requested checkpoints: **D1 = 7%, D7 = 5%, D30 = 0%.**

**Stated limitation on the index semantics.** Mixpanel returns retention as a positional array.
I could not conclusively determine whether index 0 is "day 0, the birth day" or "day 1, the next
day", and I did not want to guess on the headline number. The reading above assumes index 0 is
day 1. The argument for it: `lifecycle.app_open` necessarily fires on the birth day (a user
cannot log in without opening the app), so a day-0 bucket should read near 100%, and it reads 7%.
The counter-argument: Mixpanel only counts the return event occurring *after* the birth event,
so a day-0 bucket could legitimately be small. If the alternative reading is correct, shift one
position and D1 = 2%, D7 = 2%, D30 = 0%. **Both readings are catastrophic, so this ambiguity does
not change any decision.** It should still be pinned before these numbers go in a deck.

### 2.4 Benchmark

| Metric | Murror production | Mental health app benchmark | Verdict |
|---|---|---|---|
| D1 | 7% (or 2%) | 40%+ | far below |
| D7 | 5% (or 2%) | 25%+ | far below |
| D30 | 0% | 15%+ | far below |

Retention is not merely below benchmark, it decays to zero. No cohort in the last 6 months has
a non-zero month-3 figure except February and March, and those are 4% and 5%, which at N=54 and
N=80 means 2 and 4 humans.

### 2.5 The true-signup-proxy run, for the record (VERIFIED)

Born event `onboarding.create_account_clicked`, monthly buckets:

| Signup month | N | M1 | M2 | M3 | M4 |
|---|---|---|---|---|---|
| 2026-02 | 11 | 0% | 9% | 9% | 9% |
| 2026-03 | 14 | 7% | 0% | 7% | 0% |
| 2026-04 | 13 | 0% | 8% | 0% | 0% |
| 2026-05 | 22 | 5% | 0% | 0% | - |
| 2026-06 | 8 | 0% | 0% | - | - |
| 2026-07 | 4 | 0% | - | - | - |

At these cohort sizes one returning user is 5 to 9 percentage points. **Not decision-grade.**

---

## 3. Production active counts

### 3.1 DAU (VERIFIED)

Event `lifecycle.app_open`, unique users per day, 2026-05-05 to 2026-08-03 (91 days).

| Statistic | Value |
|---|---|
| Mean DAU, 91 days | **9.2** |
| Median DAU, 91 days | 8 |
| Range | 2 to 39 |
| Mean DAU, last 30 days | **6.4** |
| Median DAU, last 30 days | 6 |
| Range, last 30 days | 2 to 11 |

Data is live and current: 2026-08-01 = 3, 2026-08-02 = 2, 2026-08-03 = 2. **Mixpanel is still
receiving production events today.** There is no ingestion outage.

### 3.2 MAU (VERIFIED)

Event `lifecycle.app_open`, unique users per calendar month.

| Month | MAU |
|---|---|
| 2026-02 | 190 |
| 2026-03 | 232 |
| 2026-04 | 240 |
| 2026-05 | 228 |
| 2026-06 | 207 |
| 2026-07 | **146** |
| 2026-08 (3 days only) | 7 |

July platform split (VERIFIED): iOS 112, Android 36, total 146. So `lifecycle.app_open` is a
mobile-only event and is not contaminated by web traffic.

### 3.3 DAU/MAU ratio (VERIFIED)

July mean DAU 7.3 against July MAU 146 = **5.0%**.

Benchmark for a daily-habit product is above 20%. At 5%, the average monthly-active user opens
the app roughly 1.5 days per month. This is the strongest single signal that the habit loop is
not forming.

### 3.4 STOP: the MAU cross-check disagrees with memory

The plan instructed me to stop and report rather than pick one if these disagreed. **They disagree.**

| Source | Measure | Value |
|---|---|---|
| Memory `reference_production_engagement_truth`, prod SQL, 2026-07-31 | 30-day active | **62 (strict) to 114 (composite)** |
| Mixpanel, this pull, 2026-08-03 | July MAU on `lifecycle.app_open` | **146** |

146 sits **28% above the top of the recorded range**. I am not picking one.

**What I did establish, offered as a lead and not as a finding:** in the same July window,
`auth.identified` had **74** unique users, and 74 falls comfortably **inside** the 62 to 114 range.
The gap between 146 and 74 is 72 users who opened the app but never fired an identify.

That is *consistent with* the two sources measuring different populations, with Mixpanel's 146
including users who never authenticated, and the SQL measure counting only rows in `auth.users`.
**I did not prove this.** Proving it requires joining Mixpanel `distinct_id` values against
production user IDs, which I did not do and which this task did not authorize. Competing
explanations I could not rule out: a single human reinstalling gets a fresh `distinct_id` before
identify runs, which would inflate Mixpanel independently of any population difference.

**Recommendation:** do not quote either number as "MAU" until this is settled. If a single figure
is needed today, `auth.identified` unique users is the one that reconciles with the database.

---

## 4. The connection-formation funnel

### 4.1 What is measurable (VERIFIED)

Trailing 12 months, unique users.

| Step | Event | Unique users | Conversion from previous | Conversion from app open |
|---|---|---|---|---|
| 1. Opened the app | `lifecycle.app_open` | **3,617** | - | 100% |
| 2. Logged in | `kol.onboarding_login_success` | **1,542** | 42.6% | 42.6% |
| 3. Viewed connections | `connections.connections_viewed` | **559** | 36.3% | 15.5% |
| 4. Viewed a connection's detail | `connection_detail.connections_friend_detail_viewed` | **70** | 12.5% | **1.9%** |
| (side branch) Clicked invite popup | `connections.connections_invitation_popup_clicked` | **28** | - | 0.8% |

Monthly detail, unique users:

| Month | connections viewed | friend detail viewed | invite popup clicked |
|---|---|---|---|
| 2026-02 | 42 | 15 | 1 |
| 2026-03 | 59 | 14 | 2 |
| 2026-04 | 30 | 4 | 1 |
| 2026-05 | 36 | 3 | 0 |
| 2026-06 | 36 | 5 | 1 |
| 2026-07 | 20 | 4 | 1 |

### 4.2 The terminal step does not exist

**UNAVAILABLE: there is no "connection created" event in production Mixpanel.**

The complete set of connection events ever received by project 3639348 is nine, all of them UI
views and clicks:

```
connections.connections_viewed
connections.connections_clicked
connections.connections_invitation_popup_viewed
connections.connections_invitation_popup_clicked
connection_detail.connections_friend_detail_clicked
connection_detail.connections_friend_detail_viewed
connection_detail.connections_friend_insights_viewed
connection_detail.connections_friend_questions_popup_viewed
connection_detail.connections_friend_settings_popup_viewed
```

**The funnel cannot be closed from Mixpanel.** `friend_detail_viewed` is a *proxy* for holding a
connection (you cannot view a connection's detail without having one), not a record of forming one.

### 4.3 Verify or refute the "64 connections ever" figure

Memory records 64 connections ever created product-wide, from prod SQL on 2026-07-31.

**VERDICT: corroborated in order of magnitude, not verified exactly. Not refuted.**

- Mixpanel cannot verify it. There is no connection-created event, so the count is not
  reconstructible from event data.
- The nearest independent signal is 70 unique users who viewed a connection detail over 12
  months, against 64 connections ever created (52 after 12 user deletions). Those are different
  quantities, and they should not be equal. They are the same order of magnitude and mutually
  consistent.
- The stronger corroboration is the ratio. Mixpanel gives 70/3,617 = **1.9%** of app openers ever
  reaching a connection. The 2026-07-31 SQL pull independently concluded "about 2 percent have
  ever formed a connection". **Two unrelated instruments, same answer.**

To verify the exact count, query production SQL. That was out of scope here and would touch
production.

### 4.4 Instrumentation that exists in source but has never fired

`origin/main` **does** define an invitation funnel:

- `trackInvitationSent` to `connections.invitation_sent_client`
- `trackInvitationOpened` to `connections.invitation_opened_client`
- one live call site at `src/queries/relationship/use-generate-invitation.ts`

**Zero of these events have ever been received by Mixpanel.** Searching the project for `invit`
returns only the two popup events. Reason: the commit that added them,
`2330a7d5 feat(analytics): instrument the second-seat invitation funnel`, landed on `main` on
**2026-07-26**, after the currently shipped App Store binary was cut. See section 6.

The source comment on that block also states the authoritative funnel is intended to be
**server-side** (`connections.invitation_sent` / `_opened` / `_accepted`). I found no
implementation of those server-side events in `murror-api/src`, and no such events in Mixpanel.
**Status: UNAVAILABLE, and apparently not built.**

---

## 5. Photo and memory activity on production

**VERIFIED: none exists. Zero events, across six independent probes.**

| Probe term | Events found in project 3639348 |
|---|---|
| `moment` | 0 |
| `photo` | 0 |
| `spot` | 0 |
| `memor` | 0 |
| `share` | 0 |
| `media` | 0 |

This confirms rather than assumes the expected answer. The Moments feature does not exist on the
production branch, so it emits nothing. All Moments funnel work is staging-only until the
production release ships, exactly as the plan states.

---

## 6. A correction to the plan's premise

The plan states that `origin/main` **is** the App Store build. That is true as a branch identity
and misleading as a statement about the binary.

`origin/main` HEAD is `98b9a557` (2026-07-31). It contains commits that have never shipped,
demonstrated by the invitation analytics added on 2026-07-26 that produce zero events in
Mixpanel. So `main` is **ahead of** the shipped binary, in the same way `staging` is ahead of `main`.

**Consequence:** "it is on `main`" is not sufficient evidence that a production user can trigger
it. Before treating any instrumentation as live in production, check that its events actually
appear in project 3639348. That check is cheap and it just caught one false assumption.

The plan's core claims that I did independently confirm:

- **VERIFIED:** zero PostHog files on `origin/main`. `git ls-tree -r origin/main | grep -i posthog` returns nothing.
- **VERIFIED:** `mixpanel-service.ts` is present on `origin/main` and reads `Config.MIXPANEL_TOKEN`.
- **VERIFIED:** production Mixpanel is live and ingesting as of 2026-08-03.

---

## 7. A second broken environment property

The plan warns that PostHog's `env` person-property is broken and that `$app_namespace` should be
used instead. **Mixpanel has the same class of problem, independently.**

Project 3639348 has an `environment` event property. Queried across `lifecycle.app_open` from
2026-02-01 to 2026-08-03, **it is NULL on every single event**, 2,634 events across 10 app versions.

It is not currently harmful, because production has its own project and does not need in-project
environment scoping. It would become harmful the moment anyone tries to scope a Mixpanel query by
environment. **Do not filter Mixpanel by `environment`.** Filter by project, or by `app_version`.

---

## 8. Queries used

All run 2026-08-03 (PST) via the Mixpanel MCP against project 3639348. Report URLs are stable and
re-runnable.

| # | Purpose | Type | Window | Report |
|---|---|---|---|---|
| 1 | Unique users, 12mo | insights | rel. 12 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#REnafEThq7Pq) |
| 2 | DAU daily | insights | 90 days | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#QbNdKBGRAbtH) |
| 3 | MAU monthly | insights | rel. 6 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#XUFXRitLda6N) |
| 4 | Signup candidates monthly | insights | rel. 6 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#TdQktJjqYsUA) |
| 5 | Signup completion candidates | insights | rel. 6 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#iK6tHQCRn9eR) |
| 6 | app_open by platform | insights | 2026-07 | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#LhxTSP73DYKZ) |
| 7 | Monthly retention, login success | retention | rel. 6 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#Vu1xdxrr133S) |
| 8 | Weekly retention | retention | 2026-06-01 to 2026-08-03 | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#onDiB2KuAwu3) |
| 9 | Daily retention, June cohorts | retention | 2026-06-01 to 2026-07-02 | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#aiWxWpX7UmPd) |
| 10 | Monthly retention, signup proxy | retention | rel. 6 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#iELLiNZYSeAF) |
| 11 | Connection events monthly | insights | rel. 6 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#EoqJVBByp34R) |
| 12 | Connection funnel totals | insights | rel. 12 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#Ro3cuAe81ZHG) |
| 13 | True 6mo uniques, signup candidates | insights | rel. 6 months | [link](https://mixpanel.com/project/3639348/view/4138492/app/insights#BZeCZMtsUJAV) |

Note on query 13: the 6-month unique-user counts in section 2.1 are true distinct-user counts
from a single aggregate query, **not** sums of the monthly series. Summing monthly uniques
double-counts anyone active in more than one month. An earlier draft of this document made that
error for `kol.onboarding_login_success` (summed to 410, actual 399) and it was corrected.

Non-query checks: `Get-Events` catalog probes for `connect`, `invit`, `moment`, `photo`, `spot`,
`memor`, `share`, `media`; `Get-Property-Values` for `environment` and `app_version`; git
inspection of `origin/main` for PostHog files, Mixpanel service, env tokens, and the invitation
analytics commit.

---

## 9. What is still not measurable

Ranked by how much it blocks a decision.

1. **Connection formation.** No created-event, client or server. The single most important
   conversion in the product is invisible at its terminal step. Everything downstream of it,
   including every photo feature, is gated on a step nobody can count.
2. **A true signup cohort.** `CompleteRegistration` and `OnboardingCompleted` have one user each
   in 6 months. Every retention number above rests on a login-success proxy that includes
   returning users.
3. **Whether 146 or 74 is production MAU.** Unresolved, see 3.4.
4. **Staging's Mixpanel project.** Not visible to this credential, see 1.3.
5. **The retention array index convention.** Costs a factor of ~3 on D1, see 2.3.

---

## 10. Recommended instrumentation, in priority order

Not part of this task. Recorded so the next person does not have to re-derive it.

1. **Emit a connection-created event, server-side.** Server-side because it sees web and app, and
   cannot be lost by a flaky client. This closes the funnel in 4.1 and makes the 1.9% number
   trackable over time instead of a one-off.
2. **Emit one reliable account-created event** and verify it actually fires. Two of the three
   existing candidates are dead in production and nobody noticed.
3. **Before shipping any funnel instrumentation, confirm the events arrive.** The invitation
   funnel has been sitting in `main` since 2026-07-26 producing nothing.
4. **Set `environment` on Mixpanel events, or delete the property.** A property that is NULL on
   100% of events is worse than no property, because it looks usable.

---

## Cross-references

- `~/.claude/projects/-Users-astro-Projects-murror-transfer/memory/reference_production_engagement_truth.md` (the 2026-07-31 prod SQL pull this document cross-checks)
- `~/.claude/projects/-Users-astro-Projects-murror-transfer/memory/reference_analytics_platform.md` (dispatcher and fan-out architecture)
- `docs/plans/2026-08-03-analytics-visibility-repair.md` (the plan this is Task 1 of)
