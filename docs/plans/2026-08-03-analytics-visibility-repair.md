# Analytics Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Be able to answer "did this change move retention?" Today we cannot, for two separate and unrelated reasons, only one of which is a bug.

**Architecture:** Read the production baseline out of Mixpanel, where it already exists. Close the blind gap in the Moments compose funnel on staging with new events. Do not attempt to repair PostHog production coverage, because that is not a config problem.

**Tech Stack:** React Native 0.77, Mixpanel and PostHog fan-out via `src/common/analytics/analytics-service.ts`.

**Spec:** section 14 of `Murror/docs/specs/2026-08-03-spots-photo-layer-design.md`

---

## The root cause, proven

An earlier read of this said "production mobile is invisible." That was correct about PostHog and wrong as a general claim. The proven picture:

| | Production (`main`, the App Store build) | Staging (`staging-environment-setup`) |
|---|---|---|
| Mixpanel | **present and initialized** (`mixpanel-service.ts:41,53`) | present |
| PostHog | **does not exist. Zero files, zero references in `src` or `package.json`** | present |
| Moments feature | does not exist | present, flag-gated |

`origin/main` is **1,656 commits behind** `origin/staging-environment-setup`. PostHog was added after the last production release and has never shipped to the App Store.

**Consequences:**

1. **PostHog production coverage is not fixable by this plan.** It arrives when the 2.0.0 production release ships, and not before. Any attempt to "repair" it is fixing a symptom.
2. **Production is measurable today, in Mixpanel.** Nobody has queried it. The retention baseline being treated as missing may already exist.
3. **There are zero Moments events on production**, because the feature is not there. All Moments funnel work is staging-only until the release ships.
4. The `env` person-property returning NULL is a real but **separate and smaller** issue, affecting staging flag targeting only.

## Global Constraints

- Branch off `origin/staging-environment-setup`. PRs target `staging-environment-setup`. Never push direct.
- Kebab-case filenames, enforced by lint.
- Never use `console.*`. Use `devLog` from `src/common/dev-logger.ts`.
- **Never expose counts, view counts, or seen-state to users.** These events are server and internal only. Measuring internally is fine; surfacing is a rail violation.
- PostHog staging and production **share one project**. Scope every query by `$app_namespace`, never by `env`.
- Full jest suite hangs. Run targeted only.
- Do not add analytics that collect photo content, captions, or any user text.

## File Structure

| File | Responsibility |
|---|---|
| `src/common/analytics/analytics-constants.ts` | **Modify.** Event name constants. |
| `src/common/analytics/analytics-schemas.ts` | **Modify.** Property shapes per event. |
| `src/components/moments/moment-share-sheet.tsx` | **Modify.** Fires the compose funnel events. |
| `src/components/moments/moment-share.helpers.ts` | **Modify.** Pure helper for abandon-step resolution. |
| `Murror/docs/analytics-production-baseline-2026-08.md` | **Create.** The written baseline from Task 1. |

---

### Task 1: Establish the production baseline from Mixpanel — ✅ DONE 2026-08-03

**Delivered:** `Murror/docs/analytics-production-baseline-2026-08.md`, branch `docs/analytics-production-baseline-2026-08`, commit `fea2f95`. No PR opened yet.

**The premise held: production was measurable all along.** Mixpanel project **3639348 "Murror Live"** has been ingesting continuously, including today. Nobody had queried it. Project identity was proven rather than assumed: production's token matches the web client's, staging's differs, and a Mixpanel project has exactly one token.

| Finding | Value |
|---|---|
| **Users who ever reached a connection** | **1.9%** (70 of 3,617, trailing 12 months) |
| D1 / D7 / D30 retention | 7% / 5% / **0%** (benchmarks 40 / 25 / 15) |
| DAU/MAU | **5.0%** (benchmark >20). The average monthly-active user opens the app ~1.5 days a month. |
| Photo or memory events on production | **Zero**, verified across six probes, not assumed |

**Unresolved, deliberately not papered over:** July MAU on `lifecycle.app_open` = **146** against memory's 62-114, which is 28% outside the range. `auth.identified` in the same window = 74, inside it, and the gap is consistent with counting users who never authenticated — **but that was not proven** and needs a distinct_id join.

**Two corrections that change how everyone should read this repo:**

1. **`origin/main` is ahead of the shipped binary.** A full invitation funnel landed on `main` on 2026-07-26 with a live call site and has produced **zero events**. "It is on `main`" is not evidence a production user can trigger it. Same failure mode as PostHog, one layer down.
2. **Mixpanel's `environment` property is NULL on 100% of events** (2,634 checked). Independent of the PostHog `env` bug, identical shape. Do not filter Mixpanel by it either.

**The biggest measurement gap is not in this plan.** There is no connection-created event, client or server, so the product's central conversion can only be inferred from a proxy. Until that event exists, "did this change move connections?" is unanswerable by any instrument. Retention cohorts also had to use login-success as a proxy, because `CompleteRegistration` and `OnboardingCompleted` have **one user each in six months**.

**Recommended addition to this plan:** a `connection_created` event, server-side, before any further funnel work. It is cheap and it unblocks the only question that matters.

---

### Task 1 (original brief, kept for the record)

**Files:**
- Create: `Murror/docs/analytics-production-baseline-2026-08.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the written baseline document. Every later retention claim cites it.

This task writes no code. Its deliverable is a document, and it is first because every downstream decision depends on knowing whether a baseline exists.

- [ ] **Step 1: Confirm the production project and token**

Identify which Mixpanel project receives `Config.MIXPANEL_TOKEN` from the production scheme. Confirm it is distinct from staging's. Record both project IDs in the document.

- [ ] **Step 2: Pull the production retention curve**

Query Mixpanel for D1, D7 and D30 retention on production users, by monthly signup cohort, for the last 6 months. Record N per cohort.

- [ ] **Step 3: Pull the production active counts**

Daily and monthly active users on production for the last 90 days. Cross-check the monthly figure against the 62 to 114 range recorded in memory. **If they disagree, stop and report the discrepancy rather than picking one.**

- [ ] **Step 4: Pull the connection-formation funnel**

Signup through to first connection created, on production. This is the prerequisite step that gates every photo feature. Record the conversion rate and the absolute count.

- [ ] **Step 5: Write the document**

Record, for each figure: the value, the window, N, the query used, and the date pulled. Mark every number **verified** or **unavailable**. Do not estimate. If a step cannot be answered from Mixpanel, write "not measurable today" and say what is missing.

- [ ] **Step 6: Commit**

```bash
git add Murror/docs/analytics-production-baseline-2026-08.md
git commit -m "docs(analytics): record the production baseline from Mixpanel"
```

---

### Task 2: Name the compose funnel events

**Files:**
- Modify: `src/common/analytics/analytics-constants.ts`
- Modify: `src/common/analytics/analytics-schemas.ts`
- Test: `src/common/analytics/analytics-schemas.spec.ts` (create if absent, matching the folder's existing spec style)

**Interfaces:**
- Consumes: nothing.
- Produces: the constants `MOMENT_COMPOSE_OPENED`, `MOMENT_PHOTO_SELECTED`, `MOMENT_RECIPIENTS_CONFIRMED`, `MOMENT_COMPOSE_ABANDONED`, and their schemas. Task 3 fires them.

**Why:** today the funnel is `chooser_opened` then `quick_share_sent`, with nothing in between. On staging, 28 camera taps produced 8 sends. That 71% gap is entirely unmeasured, so we cannot tell whether people abandon at photo choice, at recipient choice, or at the send itself. Those have opposite fixes.

- [ ] **Step 1: Write the failing test**

```ts
import {
  MOMENT_COMPOSE_ABANDONED,
  MOMENT_COMPOSE_OPENED,
  MOMENT_PHOTO_SELECTED,
  MOMENT_RECIPIENTS_CONFIRMED,
} from './analytics-constants';
import {analyticsSchemas} from './analytics-schemas';

describe('moment compose funnel events', () => {
  const events = [
    MOMENT_COMPOSE_OPENED,
    MOMENT_PHOTO_SELECTED,
    MOMENT_RECIPIENTS_CONFIRMED,
    MOMENT_COMPOSE_ABANDONED,
  ];

  it('registers a schema for every compose funnel event', () => {
    events.forEach(name => {
      expect(analyticsSchemas[name]).toBeDefined();
    });
  });

  it('never declares a property that could carry user content', () => {
    const banned = ['caption', 'note', 'title', 'uri', 'url', 'photo_data'];
    events.forEach(name => {
      const props = Object.keys(analyticsSchemas[name]?.properties ?? {});
      props.forEach(p => {
        expect(banned).not.toContain(p);
      });
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
yarn jest src/common/analytics/analytics-schemas.spec.ts --runInBand --forceExit --testTimeout=15000
```

Expected: FAIL, constants not exported.

- [ ] **Step 3: Add the constants**

In `analytics-constants.ts`, alongside the existing moment events, matching the file's established naming and export style:

```ts
export const MOMENT_COMPOSE_OPENED = 'moment_compose_opened';
export const MOMENT_PHOTO_SELECTED = 'moment_photo_selected';
export const MOMENT_RECIPIENTS_CONFIRMED = 'moment_recipients_confirmed';
export const MOMENT_COMPOSE_ABANDONED = 'moment_compose_abandoned';
```

- [ ] **Step 4: Add the schemas**

In `analytics-schemas.ts`, following the file's existing schema shape:

```ts
  [MOMENT_COMPOSE_OPENED]: {
    properties: {entry_point: 'string'},
  },
  [MOMENT_PHOTO_SELECTED]: {
    // Count only. Never a uri, never a filename.
    properties: {photo_count: 'number'},
  },
  [MOMENT_RECIPIENTS_CONFIRMED]: {
    // Count only. Never recipient ids or names.
    properties: {recipient_count: 'number'},
  },
  [MOMENT_COMPOSE_ABANDONED]: {
    // last_step is one of: 'opened' | 'photos_picked' | 'recipients_picked'
    properties: {last_step: 'string'},
  },
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
yarn jest src/common/analytics/analytics-schemas.spec.ts --runInBand --forceExit --testTimeout=15000
```

- [ ] **Step 6: Type-check, lint, commit**

```bash
yarn tsc --noEmit && yarn lint
git add src/common/analytics/analytics-constants.ts src/common/analytics/analytics-schemas.ts src/common/analytics/analytics-schemas.spec.ts
git commit -m "feat(analytics): name the moment compose funnel events"
```

---

### Task 3: Resolve the abandon step

**Files:**
- Modify: `src/components/moments/moment-share.helpers.ts`
- Test: `src/components/moments/moment-share.helpers.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `resolveComposeAbandonStep(photoCount: number, recipientCount: number): 'opened' | 'photos_picked' | 'recipients_picked'`. Task 4 calls it.

Pure function, separated so the branching is tested without mounting the sheet.

- [ ] **Step 1: Write the failing test**

```ts
import {resolveComposeAbandonStep} from './moment-share.helpers';

describe('resolveComposeAbandonStep', () => {
  it('reports opened when nothing was chosen', () => {
    expect(resolveComposeAbandonStep(0, 0)).toBe('opened');
  });

  it('reports photos_picked when photos were chosen but no recipients', () => {
    expect(resolveComposeAbandonStep(3, 0)).toBe('photos_picked');
  });

  it('reports recipients_picked when both were chosen but nothing sent', () => {
    expect(resolveComposeAbandonStep(3, 2)).toBe('recipients_picked');
  });

  it('reports opened when recipients exist but no photo does', () => {
    expect(resolveComposeAbandonStep(0, 2)).toBe('opened');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
yarn jest src/components/moments/moment-share.helpers.spec.ts -t resolveComposeAbandonStep --runInBand --forceExit --testTimeout=15000
```

- [ ] **Step 3: Implement**

```ts
export type ComposeAbandonStep =
  | 'opened'
  | 'photos_picked'
  | 'recipients_picked';

/**
 * How far the sender got before closing without sending. Photos gate the flow,
 * so recipients chosen with no photo still counts as 'opened' rather than
 * implying progress the sender never made.
 */
export const resolveComposeAbandonStep = (
  photoCount: number,
  recipientCount: number,
): ComposeAbandonStep => {
  if (photoCount <= 0) {
    return 'opened';
  }
  return recipientCount > 0 ? 'recipients_picked' : 'photos_picked';
};
```

- [ ] **Step 4: Run to verify pass, then commit**

```bash
yarn jest src/components/moments/moment-share.helpers.spec.ts --runInBand --forceExit --testTimeout=15000
yarn tsc --noEmit && yarn lint
git add src/components/moments/moment-share.helpers.ts src/components/moments/moment-share.helpers.spec.ts
git commit -m "feat(moments): resolve which compose step a sender abandoned at"
```

---

### Task 4: Fire the funnel events

**Files:**
- Modify: `src/components/moments/moment-share-sheet.tsx`
- Test: `src/components/moments/moment-share-sheet.spec.tsx`

**Interfaces:**
- Consumes: the four constants from Task 2 and `resolveComposeAbandonStep` from Task 3.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the failing tests**

Mock the analytics dispatcher the way the existing specs in this folder already do. Read one first and match it exactly rather than inventing a mock shape.

```tsx
  it('reports the sheet opening', () => {
    renderSheet();

    expect(mockTrack).toHaveBeenCalledWith(
      'moment_compose_opened',
      expect.objectContaining({entry_point: expect.any(String)}),
    );
  });

  it('reports the photo count when photos are chosen', async () => {
    const {getByTestId} = renderSheet();

    await act(async () => {
      fireEvent.press(getByTestId('moment-add-photos'));
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledWith(
      'moment_photo_selected',
      expect.objectContaining({photo_count: expect.any(Number)}),
    );
  });

  it('reports how far the sender got when the sheet closes unsent', async () => {
    const {getByTestId} = renderSheet();

    await act(async () => {
      fireEvent.press(getByTestId('moment-share-close'));
      await Promise.resolve();
    });

    expect(mockTrack).toHaveBeenCalledWith('moment_compose_abandoned', {
      last_step: 'opened',
    });
  });

  it('does not report abandonment after a successful send', async () => {
    const {getByTestId} = renderSheet({photos: ['a'], recipients: ['r1']});

    await act(async () => {
      fireEvent.press(getByTestId('moment-send-button'));
      await Promise.resolve();
    });

    expect(mockTrack).not.toHaveBeenCalledWith(
      'moment_compose_abandoned',
      expect.anything(),
    );
  });
```

The testIDs above are placeholders until verified. **Read `moment-share-sheet.tsx` and use its real testIDs.** If a control has none, add one in this task.

- [ ] **Step 2: Run to verify they fail**

```bash
yarn jest src/components/moments/moment-share-sheet.spec.tsx --runInBand --forceExit --testTimeout=15000
```

- [ ] **Step 3: Implement the four call sites**

- `MOMENT_COMPOSE_OPENED` on mount, with the entry point that opened it.
- `MOMENT_PHOTO_SELECTED` after the picker returns, carrying the resulting count.
- `MOMENT_RECIPIENTS_CONFIRMED` when the selection is committed, carrying the count.
- `MOMENT_COMPOSE_ABANDONED` on dismiss, using `resolveComposeAbandonStep`, **guarded by a ref that a successful send sets**, so a send is never also recorded as an abandonment.

Follow the existing analytics call pattern in this file. Do not introduce a second dispatcher.

- [ ] **Step 4: Run to verify pass**

```bash
yarn jest src/components/moments --runInBand --forceExit --testTimeout=15000
```

- [ ] **Step 5: Type-check, lint, commit**

```bash
yarn tsc --noEmit && yarn lint
git add src/components/moments/
git commit -m "feat(moments): close the blind gap in the compose funnel"
```

---

### Task 5: Confirm the env person-property actually sets

**Files:**
- Test only: `src/common/analytics/posthog-flag-targeting.spec.ts`

**Interfaces:** none.

`posthog-service.ts:160` calls `setPersonPropertiesForFlags({env: Config.ENV})` and `:275` sets `env` again. A prior incident recorded this being lost on identify and reset, which unlocked premium for free staging accounts. The fix shipped in build 406 but **was never backfilled**, so historical NULLs remain and are expected.

This task proves the property survives the identity lifecycle going forward. It does not repair history.

- [ ] **Step 1: Write the failing or confirming test**

```ts
  it('keeps env set after an identify followed by a reset and re-identify', async () => {
    const service = PostHogService.getInstance();
    await service.initialize({apiKey: 'test-key'});

    service.identify('user-1');
    service.reset();
    service.identify('user-2');

    expect(mockSetPersonPropertiesForFlags).toHaveBeenLastCalledWith({
      env: Config.ENV,
    });
  });
```

- [ ] **Step 2: Run it**

```bash
yarn jest src/common/analytics/posthog-flag-targeting.spec.ts --runInBand --forceExit --testTimeout=15000
```

If it passes, the fix holds and this task is a regression guard. **If it fails, stop and report** rather than patching, because that would mean the premium-unlock incident is live again and needs its own root-cause pass.

- [ ] **Step 3: Commit**

```bash
git add src/common/analytics/posthog-flag-targeting.spec.ts
git commit -m "test(analytics): pin env person-property across identity resets"
```

---

## Explicitly out of scope

- **Repairing PostHog production coverage.** It ships with the 2.0.0 release. See `project_mobile_prod_release_v200`.
- **Backfilling historical NULL `env` values.** Not worth the effort; scope queries by `$app_namespace` instead.
- Any event that exposes a count, a view, or a seen-state to a user.

## Definition of done

- [ ] Production baseline document committed, every figure marked verified or unavailable
- [ ] Four compose funnel events named, schema-tested, and firing
- [ ] Abandon step never fires after a successful send
- [ ] `env` lifecycle test green, or its failure reported as an incident
- [ ] `yarn jest src/common/analytics src/components/moments --runInBand --forceExit --testTimeout=15000` green
- [ ] PR opened against `staging-environment-setup`
