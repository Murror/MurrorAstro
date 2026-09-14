# Reflection tab CPU: what to measure, and what each number rules out

**Status:** the cause is UNKNOWN. A previous diagnosis blamed the streak calendar's
sparkle loops; that was measured and disproved (see below). Do not start from a
hypothesis. Take these five readings first.

## Why this exists

The reported figures are **Reflection 15.9% idle vs Knowledge 7.1% idle**. Two
explanations have already been proposed and killed:

1. **The butterfly FAB.** Disproved by reading: `app.tsx` mounts it for every route in
   `MAIN_ROUTER`, so it is a constant on all five tabs. A constant cannot explain a
   difference between two tabs.
2. **The wrap-up sparkle loops.** Disproved by measurement. An instrumented probe
   counted `withRepeat(..., -1)` calls through the real component:

   | Scenario | before the fix | after |
   |---|---|---|
   | Empty calendar (user never recorded a wrap-up) | **0** | 0 |
   | 28 check-ins, no wrap-ups | **0** | 0 |
   | 3 wrap-ups in 3 months | 39 | 13 |
   | A wrap-up in each of the 7 past months | 91 | 13 |

   For the modal user the calendar contributed **zero** sparkle loops even before
   PR #1334. That PR is a real improvement for heavy users and does NOT explain 15.9%.

Both were wrong because they were reasoned from source rather than sampled. Hence this.

## The four remaining suspects

Established by reading, none measured:

| # | Suspect | Where |
|---|---|---|
| A | **7 iOS `BlurView`s** (6 `CustomBlurCard` + header) vs Knowledge's 2. Each is a per-frame backdrop readback. | `custom-blur-card.tsx:66`, `murror-header.tsx:77` |
| B | **13 month pages mounted, un-virtualized** — roughly 1,100-1,300 native views for the ~40 on screen, in a plain `ScrollView` with no `removeClippedSubviews`. | `scroll-calendar-view.tsx:250-303` |
| C | **12 always-mounted chart columns**, each with a Reanimated mapper and a `LinearTransition` registration, regardless of how much data exists. | `chart-view.tsx:211-220` |
| D | **~10,000 Luxon ISO parses per render** of `ScrollCalendarView` (13 months x ~396 entries x 2 parses), re-paid on every incidental state settle. | `scroll-calendar-view.tsx:90-99` |

A and B are **idle** costs. C is mostly mount cost. D is a **render** cost, so it
should NOT move an idle number at all. That distinction is what makes the readings
below discriminating.

## Take these five readings

Same build, same device, same account, screen brightness fixed, airplane mode OFF but
no active sync. Let each tab settle for 30 seconds before sampling, and sample for at
least 30 seconds. Record the **idle** figure with no finger on the screen.

| # | Reading | What it settles |
|---|---|---|
| 1 | Knowledge tab, idle | The baseline. Confirms 7.1% reproduces at all. |
| 2 | Reflection tab, idle, **account with NO wrap-ups** | If this is still ~15.9%, the calendar's animations are definitively not the cause and A/B/D own it. |
| 3 | Reflection tab, idle, **account with several wrap-ups** | The delta between 2 and 3 is the true cost of the sparkle loops. Expected to be small after #1334. |
| 4 | Reflection tab, idle, **scrolled so the calendar card is fully off screen** | Isolates B. A large drop means the mounted month pages dominate. No drop means the cost is not the calendar. |
| 5 | Reflection tab, idle, **immediately after switching tabs** vs **after 60s settled** | Separates render cost (D) from idle cost (A/B). If they are equal, D is not involved and the Luxon work is a red herring for this number. |

## What to capture

- A **Time Profiler** trace on Reflection idle, at least 30s. The symbol names are the
  answer: `CA::Layer::collect_animations_` points at animation/layer count;
  blur-related symbols point at A; heavy `DateTime`/Luxon frames point at D.
- Total **native view count** on each tab if the tooling allows it, which tests B directly.

## The rule for whoever acts on this

Do not fix anything until a reading names the cause. Two plausible causes have already
been wrong. If a reading is ambiguous, take another reading rather than picking the
most likely-sounding suspect.

Related: `CA::Layer::collect_animations_` is a Core Animation symbol, so the original
sample was iOS. Note that Connection Detail has an `AndroidCarouselPaintWindow` that
bounds native drawing WITHOUT unmounting, and iOS has no equivalent. If the trace points
at layer/animation count, extending that paint window to iOS is the likely fix, not
React-level windowing, which trades card state for layers.
