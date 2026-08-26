# Spots Phase 1 Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Photos become a dominant band on the flag-on home, filled by the user's **own** Spots, working with zero connections. Solo capture becomes possible.

**Architecture:** A new horizontally-scrolling band between the orbital constellation and the pinned card rail, each Spot drawn as a fanned polaroid stack. Rendered **only** inside the flag-on branch. The flag-off home stays byte-identical.

**Tech Stack:** React Native 0.77 (Fabric / New Architecture), TypeScript strict, TanStack Query v5, Skia orbital renderer, `react-native-reanimated-carousel`.

**Spec:** `Murror/docs/specs/2026-08-03-spots-photo-layer-design.md` sections 5, 15.
**Depends on:** `2026-08-03-spots-phase1-backend.md`. Tasks 1 onward need `GET /api/v1/spots` and `POST /api/v1/spots` live on Alpha. **Do not start before the backend is deployed there.**

## Global Constraints

- **Test bed is ALPHA.** Astro's standing rule. `Config.ENV === 'development'` already flips `enable_moments_quick_share` and `enable_home_state_of_world` ON by default, so Alpha sees this with no gate flip.
- **Alpha builds use their own build-number sequence.** Scheme `MurrorMobileDevelopment`, `.env.development`, app "Murror Alpha" (`app.murror.mobile.dev`). **Never bump the shared `CURRENT_PROJECT_VERSION` and never PR a build bump to `staging-environment-setup` for an Alpha build** — that forces any concurrent staging build to a higher number. Build from an isolated throwaway worktree.
- Branch off `origin/staging-environment-setup`. PRs target it. Never push direct.
- **The flag-off home must stay byte-identical.** Parity specs enforce this.
- Kebab-case filenames. Hook order: state, refs, custom hooks, data hooks, memoization, effects, handlers, JSX.
- Never use `console.*`. Use `devLog` from `src/common/dev-logger.ts`.
- **No em dashes** in any user-facing string. The `banned-words.spec.ts` guard also fails the build if "journal" reaches a user in EN, JA or VI.
- **ENGLISH ONLY for Spots copy** (Astro, 2026-08-03: Alpha is a new-feature test bed, not a production surface, so no translation work). **But you cannot simply omit the other locales:** `locale-key-parity.spec.ts` asserts `scalarKeys(ja) === scalarKeys(en)` and the same for VI, so an English-only key fails CI.
  **Do this instead:** add every new key to all three files, with the **English string in the `ja.json` and `vi.json` slots**. Parity passes, no translation is done, and a Japanese user on Alpha sees English, which is the intent.
  Prefix untranslated values with nothing special, but list every such key in the PR description so a real translation pass before production promotion has a work-list.
  **Correction to an earlier draft of this plan:** it claimed Japanese was missing 94 keys and Vietnamese 36. That was measured on a checkout 243 commits behind trunk and is **false**. On trunk all three locales hold exactly 1,786 keys with zero drift.
- **Full jest suite hangs.** Run targeted only, with `--runInBand --forceExit --testTimeout=15000`.
- **The async-act trap:** when a component has a persistent rAF loop (the orbital view does), flush async work inside `act` with `await Promise.resolve()`, **never** a `setTimeout` macrotask. A macrotask wait lets the rAF loop keep scheduling updates and `act` never settles, hanging the suite forever. Documented at `home-orbital-view.spec.tsx:439-441`.
- 🚨 **A SECOND hang, found 2026-08-04 while building Task 2.** `await queryClient.refetchQueries(...)` on a **paused** query never settles, because an offline-first query does not fail, it waits. The suite hangs with **zero output**, and `--testTimeout` does **not** rescue it. Use `void` rather than `await` when the query under test may be paused. This is the query-side twin of the paused-*mutation* trap already documented in `paused-query-states.spec.ts`.
- **The photo normalizer only RELABELS, it does not transcode.** The bytes must already be JPEG, which is guaranteed at pick time by `assetRepresentationMode: 'compatible'` plus `quality < 1`. If the solo-capture path in Task 6 launches the picker with different options, HEIC uploads break **server-side** and the client looks innocent. Reuse `src/apis/client/shared-photo-picker-options.ts`.
- **Under jest the global `FormData` is Node's**, which coerces React Native's `{uri, name, type}` file object to the string `"[object Object]"`. On device RN's own FormData keeps the object. A multipart spec needs a recording FormData shim or it asserts nothing.

## File Structure

| File | Responsibility |
|---|---|
| `src/apis/client/spots-api-client.ts` | **Create.** Typed calls for the three spot endpoints. |
| `src/queries/spots/use-spots.ts` | **Create.** TanStack query hook plus the paused/empty distinction. |
| `src/components/spots/spot-stack.tsx` | **Create.** One Spot drawn as a fanned polaroid stack. Wraps `MomentPolaroid`, does not modify it. |
| `src/components/spots/spot-band.tsx` | **Create.** The horizontal band. Owns the empty and paused behaviour. |
| `src/screens/main/Home/home-screen.tsx` | **Modify.** Insert the band in the **flag-on branch only**. |
| `src/components/moments/moment-share-sheet.tsx` | **Modify.** Allow zero recipients. |

---

### Task 1: The API client

**Files:**
- Create: `src/apis/client/spots-api-client.ts`
- Test: `src/apis/client/spots-api-client.spec.ts`

**Interfaces:**
- Consumes: `GET /api/v1/spots`, `POST /api/v1/spots`, `POST /api/v1/spots/:spotId/photos`.
- Produces: `SpotsApiClient` plus **two** response types. Tasks 2 and 5 consume these.

🚨 **Four corrections, found by building it against the live API (2026-08-04):**

1. **Paths carry the full `/api/v1/` prefix.** An earlier draft said `{path: '/spots'}`. Proven by real HTTP: `/api/v1/spots` returns 401, `/spots` returns **404**. `isNewBE: true` only swaps the host, it does not add the prefix. A test written to the old snippet would have pinned a 404 and looked green.

2. **`Spot` and `CreatedSpot` are different shapes.** `GET` returns `{id, lastActivityAt, coverPhotoUrls}`, but `POST /api/v1/spots` returns `{id, createdAt, lastActivityAt}` with **no** `coverPhotoUrls`, because a fresh Spot has no photos. One shared interface would have lied to Task 4's consumer.

3. **`addSpotPhoto(spotId, args)`, not `(spotId, asset)`.** The server's DTO accepts optional `title`, `note` and `memoryDate`. Mirror `createMemory(connectionId, args)`.

4. **The recipient rule in the backend plan is stale.** Its Task 3 still pins a test rejecting non-empty recipients. The deployed code supersedes it (`03e8ced`): any length is accepted, including empty. The client passes the array through and enforces no rule of its own.

Mirror `shared-photos-api-client.ts` exactly, including `isNewBE` handling and the multipart normalisation used by `normalizePhotoForUpload`. Read it first.

- [ ] **Step 1: Write the failing tests**

```ts
it('requests the spots list from the new backend', async () => {
  await client.getSpots();
  expect(lastRequest).toMatchObject({path: '/spots', isNewBE: true});
});

it('sends an empty recipient array for a solo spot', async () => {
  await client.createSpot([]);
  expect(lastBody).toEqual({recipientUserIds: []});
});

it('normalizes a HEIC asset before upload', async () => {
  // the picker mislabels HEIC as image/jpeg; the existing normalizer handles it
  await client.addSpotPhoto('spot-1', heicAsset);
  expect(normalizeCalled).toBe(true);
});
```

The HEIC case is not hypothetical. iPhone's picker returns raw HEIC bytes mislabelled `image/jpeg`, which is why `normalizePhotoForUpload` exists. A new upload path that skips it uploads bytes the server may reject.

- [ ] **Step 2 through 5:** run to fail, implement, run to pass, `yarn tsc --noEmit && yarn lint`, commit.

---

### Task 2: The query hook

**Files:**
- Create: `src/queries/spots/use-spots.ts`
- Test: `src/queries/spots/use-spots.spec.tsx`

**Interfaces:**
- Consumes: Task 1's `SpotsApiClient`.
- Produces: `useSpots()` returning `{spots: Spot[]; isPaused: boolean; isLoading: boolean}`. Task 4 consumes all three.

**The trap this task exists to close:** a TanStack query paused by `offlineFirst` reports `isLoading` **and** `isError` both `false`, with empty data. Rendering that as "you have no Spots" tells an offline user their photos are gone. The hook must expose paused as a distinct state, not fold it into empty.

- [ ] **Step 1: Write the failing tests**

```tsx
it('reports paused separately from empty when offline', async () => {
  // onlineManager offline, query paused
  expect(result.current.isPaused).toBe(true);
  expect(result.current.spots).toEqual([]);
});

it('reports empty as empty when genuinely online with no spots', async () => {
  expect(result.current.isPaused).toBe(false);
  expect(result.current.spots).toEqual([]);
});
```

Derive paused from the query's `fetchStatus === 'paused'`, not from inferring it out of the loading and error flags.

- [ ] **Step 2 through 5:** run to fail, implement using the `MEDIUM` `STALE_TIME` preset from `src/config/react-query/query-client.ts`, run to pass, verify, commit.

---

### Task 3: One Spot as a polaroid stack

**Files:**
- Create: `src/components/spots/spot-stack.tsx`
- Test: `src/components/spots/spot-stack.spec.tsx`

**Interfaces:**
- Consumes: `MomentPolaroid` from `src/components/feed/moment-polaroid.tsx`, Task 1's `Spot` type.
- Produces: `<SpotStack spot={Spot} onPress={() => void} />` at a fixed ~100pt frame width. Task 4 renders it.

**🚨 The byte-identity trap.** `moment-polaroid.tsx:71` declares `frameWidth = 46` as a **default parameter**, and its only consumer, `compact-feed-card.tsx:648`, renders in **both** the flag-on and flag-off home branches. Changing that default silently resizes the legacy home and breaks the parity specs.

**Pass `frameWidth={100}` explicitly at this call site. Do not touch the default.**

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders the fanned stack at the larger spot size', () => {
  const {getAllByTestId} = render(<SpotStack spot={spotWith(3)} onPress={noop} />);
  expect(getAllByTestId('moment-polaroid')).toHaveLength(3);
});

it('passes an explicit frameWidth and never relies on the shared default', () => {
  // guards the flag-off home: the 46pt default must remain untouched
  expect(momentPolaroidProps.frameWidth).toBe(100);
});

it('shows a single polaroid for a spot with one photo', () => {
  expect(getAllByTestId('moment-polaroid')).toHaveLength(1);
});

it('renders nothing rather than an empty frame when a spot has no photos', () => {
  expect(queryByTestId('moment-polaroid')).toBeNull();
});
```

- [ ] **Step 2 through 5:** run to fail, implement, run to pass, verify, commit.

- [ ] **Step 6: Prove the shared default is untouched**

```bash
git diff origin/staging-environment-setup...HEAD -- src/components/feed/moment-polaroid.tsx
```

Expected: **empty**. If this file appears in the diff at all, stop and reconsider.

---

### Task 4: The home band

**Files:**
- Create: `src/components/spots/spot-band.tsx`
- Test: `src/components/spots/spot-band.spec.tsx`

**Interfaces:**
- Consumes: Task 2's `useSpots`, Task 3's `SpotStack`.
- Produces: `<SpotBand />`, self-contained, height 0 when there is nothing to show. Task 5 mounts it.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders nothing at all when the user has no spots', () => {
  // NOT a placeholder, NOT a dashed frame, NOT a prompt
  expect(toJSON()).toBeNull();
});

it('renders nothing while the query is paused, so offline never reads as empty', () => {
  expect(toJSON()).toBeNull();
});

it('orders spots by most recent activity', () => {
  expect(renderedIds).toEqual(['spot-newest', 'spot-middle', 'spot-oldest']);
});

it('never renders a count anywhere', () => {
  expect(JSON.stringify(toJSON())).not.toMatch(/\b\d+\s*(photo|member)/i);
});
```

The first test is a product rail, not a style preference. A photo-shaped placeholder on the home of someone with no Spots is exactly the emptiness the design is meant to avoid.

- [ ] **Step 2 through 5:** run to fail, implement, run to pass, verify, commit.

---

### Task 5: Mount it on the flag-on home only

**Files:**
- Modify: `src/screens/main/Home/home-screen.tsx`
- Test: `src/screens/main/Home/home-screen.spec.tsx`

**Interfaces:**
- Consumes: Task 4's `<SpotBand />`.
- Produces: nothing downstream.

The flag-on layout is `fixedRoot` → `fixedOrbital` (`flex: 1`) → `fixedPinned`. Both are **absolutely positioned style slots** (around `:699-708`), so adding a third band means re-deriving that geometry, not appending a view. The orbital band gives up roughly 20% of its height.

- [ ] **Step 1: Write the failing tests**

```tsx
it('renders the spot band on the flag-on home', () => {
  expect(queryByTestId('home-spot-band')).toBeTruthy();
});

it('renders NO spot band on the flag-off home', () => {
  // the legacy home must be untouched
  expect(queryByTestId('home-spot-band')).toBeNull();
});

it('keeps the orbital and the pinned rail both mounted alongside it', () => {
  expect(queryByTestId('home-orbital')).toBeTruthy();
  expect(queryByTestId('home-pinned-rail')).toBeTruthy();
});
```

Read the existing spec for the real testIDs before writing this. Do not invent them.

- [ ] **Step 2 through 4:** run to fail, implement inside the flag-on branch only, run to pass.

- [ ] **Step 5: Prove flag-off byte-identity**

Run the existing home parity specs. They read the flag-off source and fail on drift. If any parity spec fails, the change leaked out of the flag-on branch.

- [ ] **Step 6: Check the frame budget on a small device**

The Skia orbital loop is per-frame rAF and does **not** get cheaper when its band shrinks, so this adds large FastImage decodes on top of an unchanged render cost. Verify on an SE-class height that the orbital does not clip (the code already notes clipping risk there) and that `getDeviceTier` gates any decorative motion in the new band.

- [ ] **Step 7: Commit**

---

### Task 6: Allow a solo send

**Files:**
- Modify: `src/components/moments/moment-share-sheet.tsx`
- Test: `src/components/moments/moment-share-sheet.spec.tsx`

**Interfaces:**
- Consumes: Task 1's `createSpot`.
- Produces: nothing downstream.

`moment-share-sheet.tsx:179` currently reads `canSend = photos.length > 0 && selectedIds.length > 0`. **Zero recipients is hard-blocked**, so a solo Spot cannot be created from the UI at all.

- [ ] **Step 1: Write the failing tests**

```tsx
it('allows sending with photos and no recipients selected', () => {
  expect(getByTestId('moment-send-button').props.disabled).toBe(false);
});

it('still blocks sending with no photos', () => {
  expect(getByTestId('moment-send-button').props.disabled).toBe(true);
});

it('labels the action for a solo keep rather than a send', () => {
  // copy must not imply an audience that does not exist
  expect(getByText(t('home.spots.keepForYourself'))).toBeTruthy();
});
```

- [ ] **Step 2 through 4:** run to fail, implement, run to pass.

- [ ] **Step 5: Add the copy — English text, all three files**

Write the English strings in `en.json`. Then add **the same English strings** under the identical keys in `ja.json` and `vi.json`. This is not laziness: `locale-key-parity.spec.ts` requires the key sets to match exactly, so omitting them fails CI, and Astro's decision is that Alpha does no translation work.

No em dashes. Avoid "journal" — and because you are putting English into `ja.json`, note that `banned-words.spec.ts` applies the **Japanese** regex (日記, ジャーナ forms) to that file, so an English value containing "journal" would slip past it. Do not use the word at all.

List every key you left untranslated in the PR description, so a real translation pass before production promotion has a work-list.

- [ ] **Step 6: Run both locale guards**

```bash
yarn jest src/locales --runInBand --forceExit --testTimeout=15000
```

Both must pass: `banned-words.spec.ts` and `locale-key-parity.spec.ts`. Parity is the one that will catch a forgotten file.

- [ ] **Step 7: Commit**

---

### Task 6a: The after-state — land the sender inside the Spot

**Files:**
- Modify: `src/components/moments/moment-share-sheet.tsx`
- Test: `src/components/moments/moment-share-sheet.spec.tsx`

**Interfaces:**
- Consumes: the `spotId` returned by Task 1's `createSpot`.
- Produces: nothing downstream.

**Why this task exists:** it closes a gap recorded against the spec's own section 13, which the first draft of this plan missed entirely. A flow that dead-ends after completion is an incomplete design, and this one currently does: on send, the sender is returned to their own wall, so **"sent" never becomes "here is the place I made."**

That is exactly the failure the standing before/during/after rule exists to catch, and it was caught by the plan's self-review rather than by a user, which is the point of running it.

- [ ] **Step 1: Write the failing tests**

```tsx
  it('lands the sender inside the newly created spot', async () => {
    const {getByTestId} = renderSheet({photos: ['a'], recipients: []});

    await act(async () => {
      fireEvent.press(getByTestId('moment-send-button'));
      await Promise.resolve();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'SpotDetail',
      expect.objectContaining({spotId: expect.any(String)}),
    );
  });

  it('does not navigate when the send fails', async () => {
    // create rejects
    await act(async () => {
      fireEvent.press(getByTestId('moment-send-button'));
      await Promise.resolve();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
```

Read the existing spec for the real navigation mock and testIDs before writing this. Do not invent them.

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Implement**

Navigate to the Spot on send success, carrying the returned `spotId`. Preserve the existing giving-spark timing: the current flow defers navigation by `SPARK_THEN_NAV_MS` when decorative animations are enabled and navigates synchronously otherwise. **Do not remove that deferral** — it exists because a previous round shipped a spark that fired while the screen was already changing.

Never navigate on failure. The sheet stays open with its error state.

- [ ] **Step 4: Run to verify they pass, verify, commit**

**Design note for the next day, not this task:** a Spot holding only the sender's own photos must read as complete, never as unanswered. No count, no member tally, no "waiting on anyone". Task 4's tests already pin the no-count rule at the band; the Spot detail screen inherits the same obligation.

---

### Task 7: Alpha build and device verification

**Files:** none.

- [ ] **Step 1: Build for Alpha from an isolated worktree**

Scheme `MurrorMobileDevelopment`, `.env.development`. Set the Alpha build number in the pbxproj and all four app Info.plists. **Do not touch the shared staging build number.**

Known trap: `/tmp/envfile` is a shared global. A concurrent staging build clobbers it mid-archive and leaks staging config into secondary targets. Do not run an Alpha archive at the same time as a staging build.

- [ ] **Step 2: Verify the binary points at Alpha**

Check `ios/tmp.xcconfig` or run `strings` on the compiled **binary** for `dev.api.murror.app`. **Do not grep `main.jsbundle`** — react-native-config values are compiled natively and never appear in the JS bundle. A jsbundle grep has produced a false failure on a correct build before.

- [ ] **Step 3: Verify on device**

With **zero connections**: create a solo Spot, add photos, confirm the band appears on home and the constellation still reads correctly.
Then delete every Spot and confirm the band **disappears entirely**, with no placeholder.
Then go offline and confirm the band does not render the empty state as fact.

- [ ] **Step 4: Report honestly**

"Unit-tested, not device-verified" is a complete and acceptable sentence. Implying verification that did not happen is worse than the bug.

## Definition of done

- [ ] Backend deployed to Alpha first, and this plan started only after
- [ ] Spot band live on the flag-on home, absent from flag-off, parity specs green
- [ ] `moment-polaroid.tsx` shows **zero diff**
- [ ] Zero-spot state renders nothing; offline does not render as empty
- [ ] Solo send works with no recipients selected
- [ ] EN, JA and VI copy present; banned-words guard green
- [ ] Device-verified on Alpha with a zero-connection account
- [ ] PR opened against `staging-environment-setup`
