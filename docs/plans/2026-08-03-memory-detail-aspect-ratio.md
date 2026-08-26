# Memory Detail Aspect Ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show photos in the memory detail sheet at their true aspect ratio instead of center-cropping every image into a square.

**Architecture:** Add a pure clamp helper, measure the photo's real dimensions from the FastImage `onLoad` event that already fires during decode, and drive `photoWrap`'s `aspectRatio` from that measurement. The initial value stays exactly `1`, so anything unmeasured renders byte-identical to today.

**Tech Stack:** React Native 0.77 (Fabric / New Architecture), TypeScript strict, `react-native-fast-image`, Jest with `@testing-library/react-native`.

**Spec:** `Murror/docs/specs/2026-08-03-memory-detail-aspect-ratio.md`

## Global Constraints

- Branch off `origin/staging-environment-setup`. PRs target `staging-environment-setup`. **Never push direct to `main` or `staging-environment-setup`.**
- All `.ts` / `.tsx` filenames are **kebab-case**, enforced by `eslint-plugin-check-file`. A violation fails CI lint.
- Hook ordering inside components: state, refs, custom hooks, data-fetching hooks, memoization, effects, event handlers, JSX. Enforced in review.
- **Never use `console.*`.** Use `devLog` / `devWarn` from `src/common/dev-logger.ts`. Production console calls fail the build.
- No em dashes in any user-facing string. Not applicable to this plan (no copy changes) but binding if any is added.
- **The full jest suite hangs on this repo.** Always run targeted: `yarn jest <path> --runInBand --forceExit --testTimeout=15000`.
- **Do not modify `memories-all-sheet.tsx`.** Its grid uses percentage width plus `aspectRatio` inside a `flexWrap` row, the documented Fabric pattern that collapses tiles to 1px lines. Out of scope.
- **Do not modify `our-memories-section.tsx`.** Its square thumbnails are intentional and its fixed 248pt parent makes them safe.

## File Structure

| File | Responsibility |
|---|---|
| `src/screens/main/Diary/memories/memory-card.helpers.ts` | **Modify.** Gains `clampPhotoAspectRatio`, a pure function. This file already holds the pure helpers for this folder. |
| `src/screens/main/Diary/memories/memory-card.helpers.spec.ts` | **Modify.** Unit tests for the clamp. |
| `src/screens/main/Diary/memories/memory-detail-sheet.tsx` | **Modify.** One state value, one effect, one `onLoad` handler, one style change. |
| `src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx` | **Modify.** Behavioural tests for measurement and reset. |

## Correction to the spec

The spec claims the existing assertion `expect(...resizeMode).toBe('cover')` must be updated. **It does not.** `resizeMode` stays `cover` unconditionally, because when the container matches the photo's true ratio, `cover` and `contain` render identically, and when the ratio is clamped, `cover` correctly crops to the bound rather than letterboxing with black bars. That existing test stays green and untouched, which is a useful regression guard.

---

### Task 1: The clamp helper

**Files:**
- Modify: `src/screens/main/Diary/memories/memory-card.helpers.ts`
- Test: `src/screens/main/Diary/memories/memory-card.helpers.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `clampPhotoAspectRatio(width: number, height: number): number` and the exported constants `MIN_PHOTO_ASPECT_RATIO = 0.6`, `MAX_PHOTO_ASPECT_RATIO = 1.6`, `DEFAULT_PHOTO_ASPECT_RATIO = 1`. Task 2 imports all four.

- [ ] **Step 1: Write the failing tests**

Append to `memory-card.helpers.spec.ts`:

```ts
import {
  clampPhotoAspectRatio,
  DEFAULT_PHOTO_ASPECT_RATIO,
  MAX_PHOTO_ASPECT_RATIO,
  MIN_PHOTO_ASPECT_RATIO,
} from './memory-card.helpers';

describe('clampPhotoAspectRatio', () => {
  it('returns the true ratio for a landscape photo inside the clamp', () => {
    expect(clampPhotoAspectRatio(1200, 900)).toBeCloseTo(1.3333, 4);
  });

  it('returns the true ratio for a portrait photo inside the clamp', () => {
    expect(clampPhotoAspectRatio(900, 1200)).toBeCloseTo(0.75, 4);
  });

  it('returns exactly 1 for a square photo', () => {
    expect(clampPhotoAspectRatio(1000, 1000)).toBe(1);
  });

  it('clamps a panorama to the wide bound', () => {
    expect(clampPhotoAspectRatio(4000, 1000)).toBe(MAX_PHOTO_ASPECT_RATIO);
  });

  it('clamps a tall screenshot to the narrow bound', () => {
    expect(clampPhotoAspectRatio(1170, 2532)).toBe(MIN_PHOTO_ASPECT_RATIO);
  });

  it('falls back to the default when height is zero', () => {
    expect(clampPhotoAspectRatio(1000, 0)).toBe(DEFAULT_PHOTO_ASPECT_RATIO);
  });

  it('falls back to the default when a dimension is missing or negative', () => {
    expect(clampPhotoAspectRatio(0, 1000)).toBe(DEFAULT_PHOTO_ASPECT_RATIO);
    expect(clampPhotoAspectRatio(-5, 100)).toBe(DEFAULT_PHOTO_ASPECT_RATIO);
  });

  it('falls back to the default for non-finite input', () => {
    expect(clampPhotoAspectRatio(NaN, 100)).toBe(DEFAULT_PHOTO_ASPECT_RATIO);
    expect(clampPhotoAspectRatio(Infinity, 100)).toBe(
      DEFAULT_PHOTO_ASPECT_RATIO,
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
yarn jest src/screens/main/Diary/memories/memory-card.helpers.spec.ts --runInBand --forceExit --testTimeout=15000
```

Expected: FAIL. `clampPhotoAspectRatio is not a function` / import errors.

- [ ] **Step 3: Write the implementation**

Append to `memory-card.helpers.ts`:

```ts
/**
 * The detail sheet renders a photo inside a fixed-width cream frame, so an
 * unbounded aspect ratio would let a panorama collapse to a sliver or a tall
 * screenshot push the caption entirely off screen. These bounds keep the frame
 * usable; anything outside them is cropped by the image's own `cover` mode.
 */
export const MIN_PHOTO_ASPECT_RATIO = 0.6;
export const MAX_PHOTO_ASPECT_RATIO = 1.6;

/** Square. The pre-measurement value, matching the sheet's historical render. */
export const DEFAULT_PHOTO_ASPECT_RATIO = 1;

/**
 * Width over height, bounded. Returns the square default for any input that is
 * not a usable pair of positive finite dimensions, so a failed or partial
 * decode leaves the sheet exactly as it renders today.
 */
export const clampPhotoAspectRatio = (
  width: number,
  height: number,
): number => {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return DEFAULT_PHOTO_ASPECT_RATIO;
  }
  return Math.min(
    MAX_PHOTO_ASPECT_RATIO,
    Math.max(MIN_PHOTO_ASPECT_RATIO, width / height),
  );
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
yarn jest src/screens/main/Diary/memories/memory-card.helpers.spec.ts --runInBand --forceExit --testTimeout=15000
```

Expected: PASS, all 8 new cases green, existing cases in the file still green.

- [ ] **Step 5: Type-check and lint**

```bash
yarn tsc --noEmit && yarn lint
```

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/screens/main/Diary/memories/memory-card.helpers.ts src/screens/main/Diary/memories/memory-card.helpers.spec.ts
git commit -m "feat(memories): add a bounded aspect-ratio helper for detail photos"
```

---

### Task 2: Measure the photo and drive the frame

**Files:**
- Modify: `src/screens/main/Diary/memories/memory-detail-sheet.tsx` (state near `:101`, JSX at `:385-391`, styles at `:936-941`)
- Test: `src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx`

**Interfaces:**
- Consumes: `clampPhotoAspectRatio`, `DEFAULT_PHOTO_ASPECT_RATIO` from Task 1.
- Produces: the `memory-detail-photo` element now carries an `onLoad` prop accepting `{nativeEvent: {width: number; height: number}}`. Task 3 fires it.

- [ ] **Step 1: Write the failing tests**

Add to `memory-detail-sheet.spec.tsx`, inside the same top-level `describe` that holds the existing photo tests:

```tsx
  it('renders a square frame before the photo has been measured', () => {
    const {getByTestId} = renderSheet(partnerMemory([]));

    expect(
      flattenStyle(getByTestId('memory-detail-photo-wrap').props.style),
    ).toMatchObject({aspectRatio: 1});
  });

  it('adopts the true ratio of a landscape photo once measured', () => {
    const {getByTestId} = renderSheet(partnerMemory([]));

    act(() => {
      getByTestId('memory-detail-photo').props.onLoad({
        nativeEvent: {width: 1200, height: 900},
      });
    });

    expect(
      flattenStyle(getByTestId('memory-detail-photo-wrap').props.style)
        .aspectRatio,
    ).toBeCloseTo(1.3333, 4);
  });

  it('adopts the true ratio of a portrait photo once measured', () => {
    const {getByTestId} = renderSheet(partnerMemory([]));

    act(() => {
      getByTestId('memory-detail-photo').props.onLoad({
        nativeEvent: {width: 900, height: 1200},
      });
    });

    expect(
      flattenStyle(getByTestId('memory-detail-photo-wrap').props.style)
        .aspectRatio,
    ).toBeCloseTo(0.75, 4);
  });

  it('clamps a panorama instead of collapsing the frame', () => {
    const {getByTestId} = renderSheet(partnerMemory([]));

    act(() => {
      getByTestId('memory-detail-photo').props.onLoad({
        nativeEvent: {width: 4000, height: 1000},
      });
    });

    expect(
      flattenStyle(getByTestId('memory-detail-photo-wrap').props.style)
        .aspectRatio,
    ).toBe(1.6);
  });

  it('keeps the square frame when the photo reports no usable dimensions', () => {
    const {getByTestId} = renderSheet(partnerMemory([]));

    act(() => {
      getByTestId('memory-detail-photo').props.onLoad({
        nativeEvent: {width: 0, height: 0},
      });
    });

    expect(
      flattenStyle(getByTestId('memory-detail-photo-wrap').props.style),
    ).toMatchObject({aspectRatio: 1});
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
yarn jest src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx --runInBand --forceExit --testTimeout=15000
```

Expected: FAIL. `memory-detail-photo-wrap` has no matching testID, so `getByTestId` throws.

- [ ] **Step 3: Add the import**

In `memory-detail-sheet.tsx`, extend the existing import from `./memory-card.helpers` (currently at `:57-62`) to include the two new names, keeping the members alphabetically ordered as the file already does:

```ts
import {
  clampPhotoAspectRatio,
  DEFAULT_PHOTO_ASPECT_RATIO,
  formatMemoryFullDate,
  partnerReaction,
  sortedComments,
  viewerLiked,
} from './memory-card.helpers';
```

- [ ] **Step 4: Add the state**

In the component body, immediately after `const [isReportSubmitting, setIsReportSubmitting] = useState(false);` (`:112`), so it stays inside the state block required by the hook-ordering convention:

```ts
  const [photoAspectRatio, setPhotoAspectRatio] = useState(
    DEFAULT_PHOTO_ASPECT_RATIO,
  );
```

- [ ] **Step 5: Add the handler**

With the other event handlers, above the JSX:

```ts
  // FastImage reports the decoded dimensions from the fetch already in flight,
  // so this costs no extra request. Image.getSize would issue a second one and
  // bypass the FastImage cache entirely.
  const handlePhotoLoad = (e: {
    nativeEvent: {width: number; height: number};
  }) => {
    setPhotoAspectRatio(
      clampPhotoAspectRatio(e.nativeEvent.width, e.nativeEvent.height),
    );
  };
```

- [ ] **Step 6: Wire the JSX**

Replace the photo wrap and image (`:385-391`) with:

```tsx
                  <View
                    testID="memory-detail-photo-wrap"
                    style={[styles.photoWrap, {aspectRatio: photoAspectRatio}]}>
                    <FastImage
                      testID="memory-detail-photo"
                      source={{uri: memory.publicUrl}}
                      style={styles.photo}
                      resizeMode={FastImage.resizeMode.cover}
                      onLoad={handlePhotoLoad}
                    />
```

Then remove `aspectRatio: 1` from the `photoWrap` style block (`:937`), leaving:

```ts
  photoWrap: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
```

`resizeMode` stays `cover`. Inside the clamp the container matches the photo, so `cover` and `contain` are identical; outside it, `cover` crops to the bound rather than letterboxing.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
yarn jest src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx --runInBand --forceExit --testTimeout=15000
```

Expected: PASS. The 5 new cases green, and critically the pre-existing `fills the photo frame edge to edge` and `shows the detail image as a straight levitating Polaroid` cases still green.

- [ ] **Step 8: Type-check and lint**

```bash
yarn tsc --noEmit && yarn lint
```

- [ ] **Step 9: Commit**

```bash
git add src/screens/main/Diary/memories/memory-detail-sheet.tsx src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx
git commit -m "fix(memories): show detail photos at their true aspect ratio"
```

---

### Task 3: Reset the measurement between photos

**Files:**
- Modify: `src/screens/main/Diary/memories/memory-detail-sheet.tsx`
- Test: `src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx`

**Interfaces:**
- Consumes: `photoAspectRatio` state and `DEFAULT_PHOTO_ASPECT_RATIO` from Task 2.
- Produces: nothing consumed downstream.

**Why this task exists:** the sheet is reused across memories rather than remounted per photo. Without a reset, opening a portrait photo after a landscape one renders the new photo inside the previous photo's frame until its own load event lands.

- [ ] **Step 1: Write the failing test**

```tsx
  it('returns to a square frame when a different memory opens', () => {
    const landscape = partnerMemory([]);
    const {getByTestId, rerender} = renderSheet(landscape);

    act(() => {
      getByTestId('memory-detail-photo').props.onLoad({
        nativeEvent: {width: 1200, height: 900},
      });
    });

    rerender(
      <MemoryDetailSheet
        visible
        memory={{...landscape, id: 'a-different-memory'}}
        connectionId="conn-1"
        currentUserId="user-1"
        partnerName="Ana"
        onClose={jest.fn()}
      />,
    );

    expect(
      flattenStyle(getByTestId('memory-detail-photo-wrap').props.style),
    ).toMatchObject({aspectRatio: 1});
  });
```

If `renderSheet` does not already expose `rerender`, or builds props internally, mirror its existing prop construction rather than hand-writing the element above. Read the helper before writing this test and match it exactly.

- [ ] **Step 2: Run the test to verify it fails**

```bash
yarn jest src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx -t "returns to a square frame" --runInBand --forceExit --testTimeout=15000
```

Expected: FAIL. Received `aspectRatio: 1.3333...`, the previous photo's ratio.

- [ ] **Step 3: Add the reset effect**

With the other effects, after the state and handlers:

```ts
  // The sheet is reused across memories rather than remounted, so a new photo
  // would otherwise inherit the previous one's frame until its own load lands.
  useEffect(() => {
    setPhotoAspectRatio(DEFAULT_PHOTO_ASPECT_RATIO);
  }, [memory?.id]);
```

- [ ] **Step 4: Run the full file's tests**

```bash
yarn jest src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx --runInBand --forceExit --testTimeout=15000
```

Expected: PASS, every case in the file.

- [ ] **Step 5: Run the whole memories folder**

```bash
yarn jest src/screens/main/Diary/memories --runInBand --forceExit --testTimeout=15000
```

Expected: PASS. This proves `our-memories-section` and `memories-all-sheet` are untouched by the helper change.

- [ ] **Step 6: Type-check and lint**

```bash
yarn tsc --noEmit && yarn lint
```

- [ ] **Step 7: Commit**

```bash
git add src/screens/main/Diary/memories/memory-detail-sheet.tsx src/screens/main/Diary/memories/memory-detail-sheet.spec.tsx
git commit -m "fix(memories): reset the photo frame when a new memory opens"
```

---

## Device verification

Unit tests cannot prove this looks right. Before the PR is marked ready, run the app and open the memory detail sheet on three real photos: one landscape, one portrait, one panorama or full-length screenshot.

```bash
yarn ios:staging
```

Confirm: the cream border is even on all four sides for every shape, the gloss sweep still tracks, the caption and metadata sit correctly beneath a tall photo, and the clamped panorama crops rather than stretching.

"Unit-tested, not device-verified" is an acceptable status to report. Implying device verification that did not happen is not.

## Definition of done

- [ ] All three tasks committed
- [ ] `yarn jest src/screens/main/Diary/memories --runInBand --forceExit --testTimeout=15000` fully green
- [ ] `yarn tsc --noEmit` and `yarn lint` clean
- [ ] Device-checked on landscape, portrait, and an out-of-clamp photo
- [ ] `memories-all-sheet.tsx` and `our-memories-section.tsx` show zero diff
- [ ] PR opened against `staging-environment-setup`
