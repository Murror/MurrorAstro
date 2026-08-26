# Spots Phase 1 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A **solo Spot** works end to end. A user creates a Spot with zero recipients and adds photos to it. No fan-out, no notifications, no privacy change, no row migration.

**Architecture:** Two new tables plus two nullable columns, additive. A new membership service that sits **beside** the existing pair-based connection resolver rather than widening it. Existing per-pair walls keep working untouched.

**Tech Stack:** NestJS, Prisma, Supabase Postgres, DDD layout (`application/use-cases`, `infrastructure`, `presentation`, `guards`).

**Spec:** `Murror/docs/specs/2026-08-03-spots-photo-layer-design.md` sections 8, 9, 10, 16.
**Companion:** `2026-08-03-spots-phase1-mobile.md` depends on the interfaces this plan produces.

---

## ✅ Task 0 is DONE. Alpha's lane is clear.

Cleared 2026-08-03 with `prisma migrate resolve --applied`, which was provably correct: Alpha held 0 eligible pairs, so the migration had zero work to skip. Prisma reports no failed migrations.

**The root cause was not data drift.** It was a logic bug in the migration's own guard, which would have jammed **production** identically on first deploy. Fixed and merged in murror-api PR #727.

**Also done since:** Alpha was 9 migrations behind trunk. Those were applied **separately first**, then the Spots schema alone, so the regression gate could attribute cleanly. Alpha is now at trunk parity plus Spots. Tasks 1 and 1a are applied and verified; see their sections.

Gotcha worth keeping: `migrate resolve` failed repeatedly with **P3017 "migration could not be found"** because the default checkout is 555 commits stale and lacks the migration directory. Run migrate commands from a worktree off `origin/staging`, with `--schema` pointing at it.

## 🚨 Corrections from the verification pass (2026-08-03)

A preparation pass built the schema and **proved the SQL by executing it** against a throwaway Postgres. It found four errors in the original draft of this plan. They are fixed below, and recorded here so nobody re-derives the wrong version.

| What the plan said | What is actually true |
|---|---|
| Ship behind the `SHARED_PHOTOS_ENABLED` guard | **False.** That guard is class-level on the `connections` controller, so a new `SpotsController` inherits nothing but throttling and would ship **unauthenticated and ungated**. It also returns `true` unconditionally on staging and Alpha without consulting Statsig, so **it cannot keep Spots dark on Alpha.** Use the `GalaxyFeatureGuard` model, which deliberately excludes staging. |
| Prisma emits `murror_api."table"` | **No.** `multiSchema` is not enabled; qualification comes only from `?schema=` on the connection URL. Generated SQL has **zero** occurrences of `murror_api`. Hand-qualify every statement. |
| Grep `connectionId:` to find writes | **Misses the only real insert.** `shared-photos.repository.ts:93-95` uses a nested Prisma `connect`, so that string never appears. This is *stronger* than hoped: `connect` physically cannot insert a null. |
| Use `TIMESTAMPTZ(6)` like the recent registry migrations | **No.** Our Prisma fields carry no `@db.` annotation, so that would put the DB out of sync with the datamodel. Existing `shared_photos` timestamps on Alpha are `timestamp without time zone`, precision 3. Use `TIMESTAMP(3)`. |

Five more, found the same way:

- **The repo is pnpm@9.6.0, not yarn.** Every command in the original draft said `yarn`. Corrected throughout. `pnpm lint` runs `scripts/lint-changed.sh` over changed files only.
- **`ConnectionIdHelper` is referenced from 54 files, not ~25.** The never-widen rule is even more load-bearing than assumed. Its return shape `{connectionId, legacyConnectionId, userId1, userId2}` is structurally two-person; N members cannot be added without changing that type at all 54 call sites.
- **Task 1 broke the build, and it is repaired on this branch at `6b2eca5`.** Widening `connection_id` made `photo.connectionId` `string | null` while `MemoryResponseDto.connectionId` was still `string`, so `memory.mapper.ts:23` failed with TS2322 and took 7 shared-photos suites down as compile failures. **Anything branched off `feat/spots-phase1-schema` before `6b2eca5` inherits the breakage.** After the fix: `tsc --noEmit` exits 0, and `pnpm jest src/shared-photos` is 16 suites / 141 tests green.
- **The FK-existence guard copied from `20260621120000_add_shared_photos_memory_wall` is schema-blind.** `pg_constraint.conname` is unique per schema, not per database, so a same-named constraint in `public` makes it silently skip and leave the FK unmade while reporting success. Add `AND connamespace = 'murror_api'::regnamespace`.
- **The real endpoint path is `/api/v1/connections/:id/memories`**, not `/connections/:id/memories`.

## Global Constraints

- **Test bed is ALPHA, not staging.** Astro's standing rule: new features prove out on Alpha first. Alpha is `nsp-dev-murror` / sfo2 / `dev.api.murror.app`, Supabase project `ormdzpvhrzvietlsvmro`.
- Branch off `origin/staging`. PRs target `staging`. **Never push direct.**
- **The local `murror-api` checkout is 554 commits behind `origin/staging`** and lacks batch, unseen, comments and reports entirely. Read from `origin/staging`, or work in a fresh worktree off it. Anyone reading the working copy maps a fiction.
- **Gate on a guard modelled on `GalaxyFeatureGuard`, NOT `SHARED_PHOTOS_ENABLED`.** See the corrections table above: the shared-photos guard is class-level on a different controller and returns `true` unconditionally on staging and Alpha, so it can neither protect a new controller nor keep Spots dark where we intend to test it. A new `SpotsController` inherits **no** guard by default and must apply auth and the feature gate explicitly.
- **Never widen `ConnectionIdHelper.resolveConnection`.** It has ~25 callers across deep chat, insights, cycle wrap-up and the legacy relationship controller. Widening it grants N-member semantics to all of them silently. Add a separate service.
- **Never expose counts, view counts, or seen-state** in any response body. Internal columns are fine; response fields are not.
- Migrations run on port **5432** (session mode), not the pgbouncer 6543 pooler.
- Schema-qualify every table in raw SQL (`murror_api."TableName"`).
- No em dashes in any user-facing string.

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.murror.prisma` | **Modify.** Two new models, two nullable columns. |
| `prisma/migrations/<ts>_add_spots/migration.sql` | **Create.** Additive DDL only. |
| `src/shared-photos/application/spot-membership.service.ts` | **Create.** The N-member authorization check. Deliberately separate from `ConnectionIdHelper`. |
| `src/shared-photos/application/use-cases/create-spot.use-case.ts` | **Create.** |
| `src/shared-photos/application/use-cases/add-spot-photo.use-case.ts` | **Create.** |
| `src/shared-photos/application/use-cases/get-spots.use-case.ts` | **Create.** |
| `src/shared-photos/infrastructure/spots.repository.ts` | **Create.** All Prisma access for spots. |
| `src/shared-photos/presentation/dto/spot-response.dto.ts` | **Create.** |
| `src/shared-photos/presentation/shared-photos.controller.ts` | **Modify.** New routes. |

---

### Task 0: Unjam the Alpha migration lane

**Files:** none. This is an operational task requiring Astro's decision.

**Interfaces:** Produces a DEV database that accepts migrations. Every later task depends on it.

- [ ] **Step 1: Confirm the jam is still present**

```sql
SELECT migration_name, started_at, finished_at, applied_steps_count
FROM murror_api._prisma_migrations
WHERE finished_at IS NULL AND rolled_back_at IS NULL;
```

Against project `ormdzpvhrzvietlsvmro`. Expected: one row, `20260801190000_dedupe_wellness_goals`.

- [ ] **Step 2: Establish what the guard actually found**

The migration aborted deliberately. Its guard reported a `wellness_goals` pair where the canonical row and the duplicate row **partially exist**. Query the real state of that pair before deciding anything. Do not guess.

- [ ] **Step 3: Put the choice to Astro**

Two options, and this is his call, not the implementer's:

| Option | Command | Consequence |
|---|---|---|
| Mark applied | `prisma migrate resolve --applied 20260801190000_dedupe_wellness_goals` | The lane unjams immediately, but the dedupe **never runs on Alpha**, so the duplicate rows stay. Acceptable only if Alpha's wellness data is disposable. |
| Roll back and fix | `prisma migrate resolve --rolled-back <name>`, repair the drifted pair, re-run | Correct, slower, and requires understanding the drift first. |

**Do not proceed past this task without an explicit answer.** Marking a data migration as applied when it did not run is exactly the kind of silent state divergence that produces a later "impossible" bug.

- [ ] **Step 4: Verify the lane accepts migrations**

After resolution, confirm `prisma migrate status` reports no failed migrations against DEV.

---

### Task 1: Schema

**Files:**
- Modify: `prisma/schema.murror.prisma`
- Create: `prisma/migrations/<timestamp>_add_spots/migration.sql`

**Interfaces:**
- Consumes: Task 0's unjammed lane.
- Produces: models `Spot`, `SpotMember`; `SharedPhoto.spotId` (nullable); `SharedPhoto.connectionId` widened to nullable. Tasks 2 through 5 all depend on these names.

- [ ] **Step 1: Add the models**

```prisma
/// A Spot: one shared photo container. Zero members beyond the creator is a
/// SOLO spot, which is the only shape Phase 1 ships. Group spots (2+ members
/// who can see each other) are Phase 2 and gated on the privacy work.
model Spot {
  id             String       @id @default(cuid())
  createdByUserId String      @map("created_by_user_id")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")
  deletedAt      DateTime?    @map("deleted_at")
  /// Denormalized on write. Never computed with an aggregate, because a count
  /// must never be derivable from a response.
  lastActivityAt DateTime     @default(now()) @map("last_activity_at")
  members        SpotMember[]
  photos         SharedPhoto[]

  @@index([createdByUserId])
  @@index([lastActivityAt(sort: Desc)])
  @@index([deletedAt])
  @@map("spots")
}

/// Membership in a Spot. `removedAt` is a soft removal so a departed member
/// loses access without destroying the audit trail.
model SpotMember {
  id        String    @id @default(cuid())
  spotId    String    @map("spot_id")
  userId    String    @map("user_id")
  joinedAt  DateTime  @default(now()) @map("joined_at")
  removedAt DateTime? @map("removed_at")
  spot      Spot      @relation(fields: [spotId], references: [id], onDelete: Cascade)

  @@unique([spotId, userId])
  @@index([userId, spotId])
  @@map("spot_members")
}
```

- [ ] **Step 2: Widen SharedPhoto**

In the existing `SharedPhoto` model, change the connection fields to nullable and add the spot fields. **Do not repoint the model off `connectionId`** — that FK carries the cascade delete, every current authorization call, and the account-deletion registry.

```prisma
  connectionId     String?               @map("connection_id")
  spotId           String?               @map("spot_id")
  connection       Connection?           @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  spot             Spot?                 @relation(fields: [spotId], references: [id], onDelete: Cascade)
```

Add `@@index([spotId])` to the model's index block.

- [ ] **Step 3: Write the migration SQL by hand**

Generate it, then read every line before committing. Expected shape, and nothing else:

```sql
CREATE TABLE murror_api."spots" (...);
CREATE TABLE murror_api."spot_members" (...);
ALTER TABLE murror_api."shared_photos" ADD COLUMN "spot_id" TEXT;
ALTER TABLE murror_api."shared_photos" ALTER COLUMN "connection_id" DROP NOT NULL;
CREATE INDEX ... ;
ALTER TABLE murror_api."shared_photos" ADD CONSTRAINT ... FOREIGN KEY ("spot_id") ...;
```

**If the generated SQL contains any `DROP TABLE`, `DROP COLUMN`, or a `DELETE`, stop.** This migration is additive plus one `DROP NOT NULL`, which is a widening and therefore non-destructive. Anything else is a generation accident.

🚨 **The riskiest statement, and it is a production concern, not an Alpha one:**

```sql
CREATE INDEX IF NOT EXISTS "shared_photos_spot_id_idx"
  ON "murror_api"."shared_photos" ("spot_id");
```

It is the only statement whose cost scales with live data. A plain `CREATE INDEX` takes a `SHARE` lock that **blocks every write** to `shared_photos` while it builds, and it **cannot** be `CONCURRENTLY` because `migrate deploy` wraps migrations in a transaction.

On Alpha this is nothing: 33 rows, microseconds. On production it is a memory-wall write outage of **unmeasured** length. **Before promoting this beyond Alpha, measure production's `shared_photos` row count.** If it is large, pre-create that exact index name with `CONCURRENTLY` on the 5432 session URL first, and `IF NOT EXISTS` turns the migration statement into a no-op.

- [ ] **Step 4: Prove the widening is backward-compatible**

**Already proven, 2026-08-03. Re-verify only if the repository changes.** The single insert is `shared-photos.repository.ts:93-95`, a nested Prisma `connect`:

```ts
const created = await this.prisma.sharedPhoto.create({
  data: {
    connection: {connect: {id: data.connectionId, deletedAt: null}},
```

`connect` **cannot** insert a null: Prisma throws on a null or undefined id, and P2025 if the connection is missing or soft-deleted. The 47 other `connectionId:` hits are type declarations, controller param plumbing, and `SharedPhotoSeen` writes (a separate table, still `NOT NULL`).

Both existing reads already exclude null rows for free: the raw unseen query uses `connection_id = ANY($1)`, which NULL never matches, and `listByConnection` filters on an optional relation a null FK cannot satisfy.

**But the same property bites later:** `updatePhoto` and `softDeletePhoto` both key on `where: {id, connection: {deletedAt: null}}`, so **they will not work for spot photos.** Tasks 4 and 5 must not reuse them as written.

- [ ] **Step 5: Apply to Alpha — read this before running it**

🚨 **Alpha is 9 migrations behind trunk** (the VI PHQ-9 fix, JA check-in, and the whole privacy/account-deletion registry set). `prisma migrate deploy` applies **all pending migrations**, so this command ships **10 migrations, not 1**, and the regression gate below could not attribute a failure to Spots.

Decide first, and record the decision:
- **Preferred:** land those 9 separately, verify Alpha is healthy, then apply this one alone.
- **Or:** accept the coupling knowingly, and treat any failure as unattributed until bisected.

```bash
# Confirm the lane and SEE the 9 unrelated pending migrations before deciding
DATABASE_URL="$MURROR_DATABASE_URL_EXTERNAL" \
  npx prisma migrate status --schema=prisma/schema.murror.prisma

DATABASE_URL="$MURROR_DATABASE_URL_EXTERNAL" \
  npx prisma migrate deploy --schema=prisma/schema.murror.prisma
```

Port 5432 session mode, not the 6543 pgbouncer pooler. Then verify both tables exist and `shared_photos.connection_id` is nullable:

```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_schema='murror_api' AND table_name='shared_photos'
  AND column_name IN ('connection_id','spot_id');
```

Expected: both `YES`.

- [ ] **Step 6: Prove the existing wall still works**

Call the existing `GET /connections/:id/memories` for a connection that has photos, on Alpha, and confirm an unchanged response body. **This is the regression gate for the whole plan.**

- [ ] **Step 7: Commit**

```bash
git add prisma/
git commit -m "feat(spots): add the spot container tables, additive"
```

---

### Task 1a: Forbid the two illegal row shapes

**Files:**
- Modify: the Task 1 migration, or a follow-up migration if Task 1 already applied
- Test: a repository spec asserting both shapes are rejected

**Interfaces:** Consumes Task 1's columns. Produces no new API.

**Why:** widening `connection_id` opens two shapes the database now permits and **nothing forbids**. Both were demonstrated live during verification:

| Shape | Consequence |
|---|---|
| `connection_id` NULL **and** `spot_id` NULL | The row is unreachable by every read path, and undeletable: no cascade reaches it and the TOMBSTONE disposition will not remove it. A permanent orphan. |
| `connection_id` set **and** `spot_id` set | The photo appears on a pair wall **and** in a Spot. Two audiences, one row, no way for a user to reason about it. |

Only application code prevents either today, and application code is exactly what gets refactored later.

- [ ] **Step 1: Write the failing test**

Assert at the repository layer that creating a photo with neither parent, and with both parents, each throws.

- [ ] **Step 2: Add the database constraint**

A `CHECK` that exactly one of the two is non-null is the durable fix, because it survives any future code path:

```sql
ALTER TABLE murror_api."shared_photos"
  ADD CONSTRAINT "shared_photos_exactly_one_parent"
  CHECK (num_nonnulls("connection_id", "spot_id") = 1) NOT VALID;
```

`NOT VALID` skips the scan of existing rows, so it takes no long lock. Existing rows all have a `connection_id` and satisfy it anyway; validate separately when convenient.

- [ ] **Step 3: Run, verify both shapes are rejected, commit**

---

### Task 1b: Register Spots in the account-deletion registry

**Files:**
- Modify: `src/user-profile/application/services/account-deletion.registry.ts`
- Modify: `account-deletion.service.ts` storage collection
- Test: the registry's own contract spec

**Interfaces:** Consumes Task 1's tables. Produces no new API.

**Why:** `spots` and `spot_members` are **absent from the registry entirely**, which violates its own stated contract that every table has a declared disposition.

Worse, the existing disposition for shared photos is **TOMBSTONE**, justified as *"preserve the partner's shared media."* **A solo Spot has no partner.** So a deleted user's solo photos would be retained forever on a rationale that does not apply to them. And `collectStorageTargets` never includes `shared_photos.storagePath` — a test currently pins that omission — so the image file survives too.

- [ ] **Step 1: Write the failing contract test**

Assert the registry declares a disposition for `spots` and `spot_members`, and that a solo-Spot photo belonging to a deleted user is removed rather than tombstoned.

- [ ] **Step 2: Declare the dispositions**

A Spot with no surviving members has no partner interest to preserve. Delete it and its photos, including the stored objects. A Spot with surviving members keeps the container; remove only the departing user's own photos and scrub their identity, following the survivor-safe joint-content redaction already built in murror-api #713 rather than reinventing it.

- [ ] **Step 3: Fix the storage omission for the solo case, run, commit**

**This is a privacy obligation, not a nicety.** "Delete my data" that leaves a user's photos and image files on disk forever is a false claim, and the current live privacy policy is already known to contain claims that do not match reality.

---

### Task 2: Membership authorization

**Files:**
- Create: `src/shared-photos/application/spot-membership.service.ts`
- Test: `src/shared-photos/application/spot-membership.service.spec.ts`

**Interfaces:**
- Consumes: Task 1's `SpotMember` model.
- Produces: `SpotMembershipService.assertMember(spotId: string, userId: string): Promise<void>` which throws `ForbiddenException` for a non-member or a removed member, and `NotFoundException` for a missing or soft-deleted spot. Tasks 3, 4 and 5 all call it.

**Why a new service:** `ConnectionIdHelper.resolveConnection` returns `{userId1, userId2}` and is called from roughly 25 files. Teaching it about N members would silently change the authorization semantics of deep chat, insights and cycle wrap-up. This is the "add a check, never widen a shared one" rule.

- [ ] **Step 1: Write the failing tests**

Mirror the mocking style in `src/shared-photos/infrastructure/shared-photos.repository.spec.ts`. Read it first.

```ts
describe('SpotMembershipService', () => {
  it('allows a current member', async () => {
    // findFirst resolves a membership row with removedAt null
    await expect(service.assertMember('spot-1', 'user-1')).resolves.toBeUndefined();
  });

  it('rejects a user with no membership row', async () => {
    await expect(service.assertMember('spot-1', 'stranger')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a REMOVED member even though the row still exists', async () => {
    // membership row present, removedAt set
    await expect(service.assertMember('spot-1', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('reports a soft-deleted spot as not found', async () => {
    await expect(service.assertMember('deleted-spot', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

The removed-member case is the important one. Revoking on write alone leaves read access open, which is Phase 2 blocker 5 arriving early.

- [ ] **Step 2: Run to verify they fail**

```bash
pnpm jest src/shared-photos/application/spot-membership.service.spec.ts
```

- [ ] **Step 3: Implement**

Follow the `@Injectable()` + `Logger` + constructor-injected `PrismaService` pattern from `mark-seen.use-case.ts`.

```ts
@Injectable()
export class SpotMembershipService {
  private readonly logger = new Logger(SpotMembershipService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Throws unless the caller is a CURRENT member. Deliberately separate from
   * ConnectionIdHelper: that helper resolves a two-person connection and has
   * ~25 callers, so widening it would hand N-member semantics to every one of
   * them silently.
   */
  async assertMember(spotId: string, userId: string): Promise<void> {
    const spot = await this.prisma.spot.findFirst({
      where: {id: spotId, deletedAt: null},
      select: {id: true},
    });
    if (!spot) {
      throw new NotFoundException('Spot not found');
    }

    const membership = await this.prisma.spotMember.findFirst({
      where: {spotId, userId, removedAt: null},
      select: {id: true},
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this spot');
    }
  }
}
```

- [ ] **Step 4: Run to verify they pass, then commit**

```bash
pnpm jest src/shared-photos/application/spot-membership.service.spec.ts
git add src/shared-photos/application/spot-membership.service.ts src/shared-photos/application/spot-membership.service.spec.ts
git commit -m "feat(spots): add N-member authorization beside the pair resolver"
```

---

### Task 3: Create a Spot — ✅ SHIPPED, and its original text is SUPERSEDED

⚠️ The text below pinned a test rejecting more than zero recipients, on the assumption Phase 1 was solo-only. **That assumption was wrong and is kept only for the trail.**

Astro corrected the model on 2026-08-04: **"this is not for pairs, it's meant for 2+ people."** Zero recipients is a solo Spot; exactly one recipient routes to the **existing per-pair wall** and is a client-side decision; 2+ is a Spot, which *is* the feature rather than a deferred phase of it. **The API enforces no minimum member count.** Shipped as `03e8ced`, with `684d8af` adding batched membership writes and a connection check.

Anything reading this task for the recipient rule should read that paragraph, not the steps below.

**Files:**
- Create: `src/shared-photos/infrastructure/spots.repository.ts`
- Create: `src/shared-photos/application/use-cases/create-spot.use-case.ts`
- Create: `src/shared-photos/presentation/dto/spot-response.dto.ts`
- Modify: `src/shared-photos/presentation/shared-photos.controller.ts`
- Test: `src/shared-photos/application/use-cases/create-spot.use-case.spec.ts`

**Interfaces:**
- Consumes: Task 1 models, Task 2 `assertMember`.
- Produces: `POST /api/v1/spots` accepting `{recipientUserIds: string[]}` (empty array = solo), returning `{id, createdAt, lastActivityAt, memberCount: never}`. **The response must not include a member count.** Task 4 and the mobile plan consume `id`.

- [ ] **Step 1: Write the failing tests**

```ts
it('creates a solo spot with the creator as the only member', async () => {
  const out = await useCase.execute({userId: 'user-1', recipientUserIds: []});
  expect(out.id).toBeDefined();
  // creator row written
});

it('rejects more than zero recipients in phase 1', async () => {
  await expect(
    useCase.execute({userId: 'user-1', recipientUserIds: ['user-2']}),
  ).rejects.toThrow(BadRequestException);
});

it('never returns a member count', async () => {
  const out = await useCase.execute({userId: 'user-1', recipientUserIds: []});
  expect(Object.keys(out)).not.toContain('memberCount');
});
```

The second test is the Phase 1 boundary. Group Spots are gated on the privacy work, and the API must refuse them rather than quietly allowing what the UI does not yet disclose.

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Implement the repository, use-case, DTO and route**

Match the existing DDD split exactly: the repository holds all Prisma calls, the use-case holds the rules, the controller holds only routing and the guard. Read `create-memory.use-case.ts` and the controller's `POST :id/memories` route first and mirror them, including the `SHARED_PHOTOS_ENABLED` guard.

Creating a spot writes the `Spot` row and the creator's `SpotMember` row **in one transaction**. A spot with no members is unreachable forever.

- [ ] **Step 4: Run to verify they pass, lint, commit**

---

### Task 4: Add a photo to a Spot

**Files:**
- Create: `src/shared-photos/application/use-cases/add-spot-photo.use-case.ts`
- Modify: `src/shared-photos/infrastructure/spots.repository.ts`
- Modify: `src/shared-photos/presentation/shared-photos.controller.ts`
- Test: `src/shared-photos/application/use-cases/add-spot-photo.use-case.spec.ts`

**Interfaces:**
- Consumes: Task 2 `assertMember`, Task 3's spot id.
- Produces: `POST /api/v1/spots/:spotId/photos` multipart, returning the created photo. The mobile plan consumes this.

- [ ] **Step 1: Write the failing tests**

```ts
it('stores the photo under a spot-scoped path, not a connection path', async () => {
  await useCase.execute({spotId: 'spot-1', userId: 'user-1', file});
  expect(storagePathUsed).toMatch(/^spots\/spot-1\//);
});

it('refuses a non-member', async () => {
  // assertMember throws
  await expect(useCase.execute({spotId: 'spot-1', userId: 'stranger', file}))
    .rejects.toThrow(ForbiddenException);
});

it('writes the photo with a null connectionId', async () => {
  // a solo spot photo belongs to no pair
  expect(created.connectionId).toBeNull();
  expect(created.spotId).toBe('spot-1');
});

it('bumps lastActivityAt so ordering has no need of a count', async () => {
  expect(spotUpdate).toMatchObject({lastActivityAt: expect.any(Date)});
});

it('still strips EXIF', async () => {
  expect(sanitizerCalled).toBe(true);
});
```

The EXIF test matters. The existing memories path sanitizes via `src/common/images/image-sanitizer.ts`, and a new upload route that skips it would silently reintroduce GPS data into shared photos.

- [ ] **Step 2: Run to verify they fail**

- [ ] **Step 3: Implement**

Reuse `MemoryMediaService` and the existing sanitizer. **Do not write a second upload path.**

🚨 **DO NOT hand-write the storage path.** Call the shared derivation, which already exists at `memory-media.service.ts` (commit `937d8a3`):

```ts
import {spotStoragePath} from '../memory-media.service';

const storageKey = randomUUID();
const storagePath = spotStoragePath(spotId, storageKey, ext);
```

**Why this is not optional.** The pair-photo line you are about to copy reads:

```ts
const storagePath = `shared_photos/${resolved.connectionId}/${storageKey}.${ext}`;
```

Copy it faithfully and swap the id and you get `shared_photos/{spotId}/...`. Account deletion's ownership check is **fail-closed** on `spots/{spotId}/`: an unrecognised path throws *"Refusing to purge an unowned spot photo path"*, which fails the purge-storage step and leaves that user's deletion request **permanently stuck**. The writer does not degrade gracefully; it wedges a legal obligation.

`memory-media.storage-path.spec.ts` already asserts the writer's output satisfies the reader's predicate, and one of its cases rejects exactly the `shared_photos/` string this mistake produces. If you inline the literal, that spec will not save you — it tests the helper. **Use the helper.**

- [ ] **Step 4: Verify, lint, commit**

---

### Task 5: List a user's Spots

**Files:**
- Create: `src/shared-photos/application/use-cases/get-spots.use-case.ts`
- Modify: `src/shared-photos/infrastructure/spots.repository.ts`, controller
- Test: `src/shared-photos/application/use-cases/get-spots.use-case.spec.ts`

**Interfaces:**
- Consumes: Tasks 1 through 4.
- Produces: `GET /api/v1/spots` returning `{spots: [{id, lastActivityAt, coverPhotoUrls: string[]}]}`, ordered by `lastActivityAt` descending. The mobile home band consumes exactly this.

- [ ] **Step 1: Write the failing tests**

```ts
it('returns only spots the caller is a current member of', async () => {...});
it('excludes spots the caller was removed from', async () => {...});
it('orders by most recent activity, not creation', async () => {...});
it('returns at most 3 cover photos per spot for the fanned stack', async () => {...});
it('never returns a photo count or a member count', async () => {
  expect(JSON.stringify(out)).not.toMatch(/count/i);
});
```

- [ ] **Step 2 through 4:** run, implement, verify, commit as above.

---

### Task 6: Deploy to Alpha and prove it

**Files:** none.

- [ ] **Step 1: Deploy**

Alpha deploys must run the migration job. A bare image roll does **not** migrate. Confirm `prisma migrate status` after deploying, not before.

- [ ] **Step 2: Prove the new path works**

Create a solo spot, add a photo, list spots. Record the actual curl calls and responses in the PR.

- [ ] **Step 3: Prove the old path is untouched**

Call `GET /connections/:id/memories` and `POST /connections/memories/batch` on Alpha. Both must behave exactly as before. **This is the regression gate.**

- [ ] **Step 4: Confirm EXIF stripping on the new route**

Upload a photo containing GPS EXIF through the spot route and verify the stored object has none. Do not take the shared sanitizer on faith just because it is shared.

## Definition of done

- [ ] Alpha migration lane unjammed, with Astro's recorded decision
- [ ] Both tables live on Alpha, `connection_id` nullable, existing wall verified unchanged
- [ ] Solo spot create, add photo, list all working on Alpha with recorded responses
- [ ] A removed member is denied on the READ path, not just the write path
- [ ] No response body anywhere contains a count
- [ ] EXIF stripping verified on the new upload route specifically
- [ ] PR opened against `staging`, feature behind the existing gate
