# WHO-5 + UCLA-3, Plan 1 of 4: murror-api foundation (ships dark)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give murror-api everything the new check-in needs:
- instrument scoring;
- storage;
- a global switch;
- consent;
- endpoints;
- the study export.

With the switch at `phq9_gad7`, every existing behaviour is unchanged.

**Architecture:** A new bounded context, `src/assessment/`, with the repo's usual layout: domain, application, infrastructure and presentation.
- **Scoring and due-date rules** are pure functions in `domain/`, so they are tested without a database.
- **Three new `murror_api` tables:**
  - `assessment_responses`;
  - `research_consents`;
  - `assessment_settings`, a single row holding the switch.
- **Profile and bootstrap integration:** the three existing check-in-due sites read the switch. When it is `who5_ucla3`, they tell older app builds "no check-in due".

**Tech Stack:** NestJS 11, Prisma 6 (`schema.murror.prisma`), class-validator, Jest, pnpm.

**Spec:** `Murror-docs/docs/plans/2026-10-04-who5-ucla3-primary-measure-design.md`. Read sections 5, 6.1, 6.2, 8, 10 and 11 before starting.

**The other plans (written after this one merges, because they consume its interfaces):**
- Plan 2: viasr-api (notification tone, prompt claim, persona).
- Plan 3: MurrorMobile + murror-platform (one build).
- Plan 4: safety evidence, then the flip.

## Global Constraints

- **Repo and branch:**
  - Work in `prod/murror-api`.
  - Branch `feat/assessment-who5-ucla3`, cut from `origin/staging`.
  - The PR targets `staging`.
  - Never push to `main`, `staging` or `production`.
- **Dark ship:** with `assessment_settings.active_instrument_set = 'PHQ9_GAD7'`:
  - every existing response body is byte-identical to today;
  - every existing test still passes unchanged.
- **Migrations take three files** (memory: `reference_murror_api_production_migration_set_two_keys.md`):
  - `prisma/migrations/<name>/migration.sql` plus the schema change;
  - `scripts/release/production-migration-set.json` (`includePending`);
  - `test/production-non-galaxy-migrations.contract.sh` (`expectedIncluded`).
  - Run every `test/*.contract.sh` locally.
- **Enums:** Prisma enum values are UPPERCASE with no `@map`, matching `DailyNoteKind` and `AiProcessingChoice`. Wire values are lowercase strings, mapped in the repository.
- **Copy:**
  - No em dashes in any string.
  - English only.
  - Item wording is copied exactly from section 5 of the spec. Task 1, step 0 verifies it against the primary sources.
- **Commits:**
  - Conventional Commits, header 72 characters or fewer.
  - **No `#123` anywhere in a commit body** (commitlint reads it as a footer).
  - End every commit with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Errors:** never swallow an error. A missing settings row means legacy (`phq9_gad7`); a database error propagates.
- **Privacy:** no score, band or answer in any log line, Sentry payload, PostHog event or push payload.
- **CI costs $0:**
  - Run `pnpm test`, `pnpm type-check`, `pnpm lint`, `pnpm format-check` and every `test/*.contract.sh` locally before the single push.
  - CI is label-gated (`run-ci`). Do not add the label without Astro.

## Review Focus

1. **Double-submit:** a person taps Submit twice, or the request is retried after a timeout. Expected: one check-in is stored, and both calls return the same result. Pinned by the `checkInId` idempotency test in Task 4 and the uuid DTO test in Task 6.
2. **Malformed answers:** strings (`"3"`), decimals (`2.5`), out-of-range values (`6`, `0` on UCLA-3), missing or extra items. Expected: 400 `ASSESSMENT_ANSWERS_INVALID`, and nothing stored. Pinned in Tasks 1 and 6.
3. **The exact 14-day boundary:** a check-in exactly 14 days ago. Expected: due (14 days or more). One millisecond less is not due. Pinned in Task 3.
4. **The switch flipped twice** (who5, back to phq9, back to who5). Expected: the second flip to who5 opens a new baseline for everyone, and flipping to the value already set changes nothing. Pinned in Tasks 2 and 3.
5. **A missing settings row** (fresh database, or a test fixture). Expected: legacy behaviour, never `who5_ucla3`. Pinned in Task 2.

---

## File map

| File | Responsibility |
|---|---|
| `src/assessment/domain/instruments.ts` | WHO-5 / UCLA-3 definitions, answer validation, scoring |
| `src/assessment/domain/instruments.spec.ts` | Scoring, direction and validation tests |
| `src/assessment/domain/check-in-state.ts` | Pure due / baseline / consent rules |
| `src/assessment/domain/check-in-state.spec.ts` | Time-boundary tests |
| `src/assessment/domain/assessment.repository.interface.ts` | Repository port and its types |
| `src/assessment/infrastructure/assessment.repository.ts` | Prisma implementation |
| `src/assessment/infrastructure/assessment.repository.spec.ts` | Settings-default and enum-mapping tests |
| `src/assessment/application/assessment.service.ts` | Use cases: settings, state, questions, submit, history, consent, export |
| `src/assessment/application/assessment.service.spec.ts` | Use-case tests with an in-memory repository |
| `src/assessment/presentation/assessment.controller.ts` | `/v1/assessments/*` (user) |
| `src/assessment/presentation/assessment-admin.controller.ts` | `/v1/admin/assessments/*` (admin key) |
| `src/assessment/presentation/dto/*.ts` | Request DTOs |
| `src/assessment/assessment.module.ts` | Wiring; exports `AssessmentService` |
| `src/app.module.ts` | Imports `AssessmentModule` |
| `prisma/schema.murror.prisma` | Three models, two enums, User back-relations |
| `prisma/migrations/20261004120000_add_assessments/migration.sql` | DDL plus the seed settings row |
| `scripts/release/production-migration-set.json`, `test/production-non-galaxy-migrations.contract.sh` | Migration declarations |
| `src/user-profile/application/services/account-deletion.registry.ts` (+ snapshot spec) | Deletion coverage |
| `src/user-profile/user-profile.service.ts` (2 sites), `src/user-profile/application/use-cases/bootstrap-app.use-case.ts` (1 site), `src/user-profile/dto/user-profile-response.dto.ts` | Switch-aware check-in flags |
| `src/common/utils/sentry-scrub.util.spec.ts` | Proves score keys are dropped |

---

### Task 1: Instrument definitions and scoring (pure domain)

**Files:**
- Create: `src/assessment/domain/instruments.ts`
- Test: `src/assessment/domain/instruments.spec.ts`

**Interfaces:**
- Produces:
  - `type Instrument = 'WHO5' | 'UCLA3'`
  - `type InstrumentSet = 'phq9_gad7' | 'who5_ucla3'`
  - `INSTRUMENTS: Record<Instrument, InstrumentDefinition>`
  - `validateAnswers(instrument, answers: unknown): Record<string, number>`, which throws `InvalidAnswersError`
  - `scoreInstrument(instrument, answers: Record<string, number>): InstrumentScore`
  - `INSTRUMENT_ORDER: readonly Instrument[] = ['WHO5', 'UCLA3']`

- [ ] **Step 0: Verify the item wording and licensing (gate)**

Check the WHO-5 text and anchors against the Psychiatric Centre North Zealand WHO-5 page. Check UCLA-3 against Hughes et al. 2004 (*Research on Aging* 26(6)). Record both sources and the licence terms in the PR description. If either licence forbids in-app commercial use, stop and tell Astro. Do not continue to Step 1.

- [ ] **Step 1: Write the failing tests**

```ts
// src/assessment/domain/instruments.spec.ts
import {
  INSTRUMENTS,
  InvalidAnswersError,
  scoreInstrument,
  validateAnswers,
} from './instruments';

const who5 = (v: number[]) =>
  Object.fromEntries(v.map((n, i) => [`who5_${i + 1}`, n]));
const ucla3 = (v: number[]) =>
  Object.fromEntries(v.map((n, i) => [`ucla3_${i + 1}`, n]));

describe('WHO-5 scoring', () => {
  it('scores all-fives as 100 percent, wellbeing fine, higher is better', () => {
    expect(scoreInstrument('WHO5', who5([5, 5, 5, 5, 5]))).toEqual({
      instrument: 'WHO5',
      instrumentVersion: 'who5-1998',
      rawScore: 25,
      normalizedScore: 100,
      higherIsBetter: true,
      band: 'fine',
    });
  });

  it('a person reporting more good days scores HIGHER, never lower', () => {
    const worse = scoreInstrument('WHO5', who5([1, 1, 1, 1, 1]));
    const better = scoreInstrument('WHO5', who5([4, 4, 4, 4, 4]));
    expect(better.normalizedScore!).toBeGreaterThan(worse.normalizedScore!);
  });

  it('bands 28 percent as low (support card) and 32 as below_average', () => {
    expect(scoreInstrument('WHO5', who5([2, 2, 1, 1, 1])).band).toBe('low'); // raw 7 = 28
    expect(scoreInstrument('WHO5', who5([2, 2, 2, 1, 1])).band).toBe(
      'below_average',
    ); // raw 8 = 32
  });

  it('bands 48 as below_average and 52 as fine', () => {
    expect(scoreInstrument('WHO5', who5([3, 3, 2, 2, 2])).band).toBe(
      'below_average',
    ); // raw 12 = 48
    expect(scoreInstrument('WHO5', who5([3, 3, 3, 2, 2])).band).toBe('fine'); // raw 13 = 52
  });
});

describe('UCLA-3 scoring', () => {
  it('scores all "often" as 9, lonely, higher is NOT better, no percentage', () => {
    expect(scoreInstrument('UCLA3', ucla3([3, 3, 3]))).toEqual({
      instrument: 'UCLA3',
      instrumentVersion: 'ucla3-hughes2004-3pt',
      rawScore: 9,
      normalizedScore: null,
      higherIsBetter: false,
      band: 'lonely',
    });
  });

  it('puts the lonely line at 6: 5 is not_lonely, 6 is lonely', () => {
    expect(scoreInstrument('UCLA3', ucla3([2, 2, 1])).band).toBe('not_lonely');
    expect(scoreInstrument('UCLA3', ucla3([2, 2, 2])).band).toBe('lonely');
  });
});

describe('validateAnswers', () => {
  it.each([
    ['a string', {...who5([1, 1, 1, 1, 1]), who5_1: '3'}],
    ['a decimal', {...who5([1, 1, 1, 1, 1]), who5_2: 2.5}],
    ['above range', {...who5([1, 1, 1, 1, 1]), who5_3: 6}],
    ['below range', {...who5([1, 1, 1, 1, 1]), who5_3: -1}],
    ['a missing item', {who5_1: 1, who5_2: 1, who5_3: 1, who5_4: 1}],
    ['an extra item', {...who5([1, 1, 1, 1, 1]), who5_6: 1}],
    ['not an object', [1, 1, 1, 1, 1]],
    ['null', null],
  ])('rejects WHO-5 answers with %s', (_label, answers) => {
    expect(() => validateAnswers('WHO5', answers)).toThrow(InvalidAnswersError);
  });

  it('rejects 0 on UCLA-3, whose scale starts at 1', () => {
    expect(() => validateAnswers('UCLA3', ucla3([0, 1, 1]))).toThrow(
      InvalidAnswersError,
    );
  });

  it('accepts a complete, in-range set and returns it unchanged', () => {
    expect(validateAnswers('UCLA3', ucla3([1, 2, 3]))).toEqual(ucla3([1, 2, 3]));
  });
});

describe('definitions', () => {
  it('has 5 WHO-5 items scored 0-5 and 3 UCLA-3 items scored 1-3', () => {
    expect(INSTRUMENTS.WHO5.items).toHaveLength(5);
    expect(INSTRUMENTS.WHO5.options.map(o => o.value)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(INSTRUMENTS.UCLA3.items).toHaveLength(3);
    expect(INSTRUMENTS.UCLA3.options.map(o => o.value)).toEqual([1, 2, 3]);
  });

  it('contains no em dash in any user-facing string', () => {
    expect(JSON.stringify(INSTRUMENTS)).not.toContain('—');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/assessment/domain/instruments.spec.ts`
Expected: FAIL, "Cannot find module './instruments'".

- [ ] **Step 3: Write the implementation**

```ts
// src/assessment/domain/instruments.ts
export type Instrument = 'WHO5' | 'UCLA3';
export type InstrumentSet = 'phq9_gad7' | 'who5_ucla3';
export type InstrumentBand =
  | 'low'
  | 'below_average'
  | 'fine'
  | 'lonely'
  | 'not_lonely';

export interface InstrumentDefinition {
  instrument: Instrument;
  version: string;
  stem: string;
  items: readonly {key: string; text: string}[];
  options: readonly {value: number; label: string}[];
  higherIsBetter: boolean;
}

export interface InstrumentScore {
  instrument: Instrument;
  instrumentVersion: string;
  rawScore: number;
  /** WHO-5 percentage 0-100. Null for UCLA-3, which has no percentage form. */
  normalizedScore: number | null;
  higherIsBetter: boolean;
  band: InstrumentBand;
}

export class InvalidAnswersError extends Error {
  constructor(instrument: Instrument, reason: string) {
    super(`Invalid ${instrument} answers: ${reason}`);
    this.name = 'InvalidAnswersError';
  }
}

export const INSTRUMENT_ORDER: readonly Instrument[] = ['WHO5', 'UCLA3'];

// Wording is the published instrument text, used verbatim (spec section 5).
// House tone rules apply to the copy AROUND the items, never to the items.
export const INSTRUMENTS: Record<Instrument, InstrumentDefinition> = {
  WHO5: {
    instrument: 'WHO5',
    version: 'who5-1998',
    stem: 'Over the last two weeks',
    items: [
      {key: 'who5_1', text: 'I have felt cheerful and in good spirits'},
      {key: 'who5_2', text: 'I have felt calm and relaxed'},
      {key: 'who5_3', text: 'I have felt active and vigorous'},
      {key: 'who5_4', text: 'I woke up feeling fresh and rested'},
      {
        key: 'who5_5',
        text: 'My daily life has been filled with things that interest me',
      },
    ],
    options: [
      {value: 0, label: 'At no time'},
      {value: 1, label: 'Some of the time'},
      {value: 2, label: 'Less than half of the time'},
      {value: 3, label: 'More than half of the time'},
      {value: 4, label: 'Most of the time'},
      {value: 5, label: 'All of the time'},
    ],
    higherIsBetter: true,
  },
  UCLA3: {
    instrument: 'UCLA3',
    version: 'ucla3-hughes2004-3pt',
    stem: 'How often do you feel',
    items: [
      {key: 'ucla3_1', text: 'that you lack companionship?'},
      {key: 'ucla3_2', text: 'left out?'},
      {key: 'ucla3_3', text: 'isolated from others?'},
    ],
    options: [
      {value: 1, label: 'Hardly ever'},
      {value: 2, label: 'Some of the time'},
      {value: 3, label: 'Often'},
    ],
    higherIsBetter: false,
  },
};

export function validateAnswers(
  instrument: Instrument,
  answers: unknown,
): Record<string, number> {
  const def = INSTRUMENTS[instrument];
  if (answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new InvalidAnswersError(instrument, 'answers must be an object');
  }
  const record = answers as Record<string, unknown>;
  const expected = def.items.map(i => i.key);
  const keys = Object.keys(record);
  if (keys.length !== expected.length || !expected.every(k => k in record)) {
    throw new InvalidAnswersError(instrument, 'every item, and only those items');
  }
  const min = Math.min(...def.options.map(o => o.value));
  const max = Math.max(...def.options.map(o => o.value));
  for (const key of expected) {
    const v = record[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      throw new InvalidAnswersError(instrument, `${key} out of range`);
    }
  }
  return record as Record<string, number>;
}

export function scoreInstrument(
  instrument: Instrument,
  answers: Record<string, number>,
): InstrumentScore {
  const def = INSTRUMENTS[instrument];
  const rawScore = def.items.reduce((sum, item) => sum + answers[item.key], 0);
  if (instrument === 'WHO5') {
    const normalizedScore = rawScore * 4;
    return {
      instrument,
      instrumentVersion: def.version,
      rawScore,
      normalizedScore,
      higherIsBetter: true,
      band:
        normalizedScore <= 28 ? 'low' : normalizedScore < 50 ? 'below_average' : 'fine',
    };
  }
  return {
    instrument,
    instrumentVersion: def.version,
    rawScore,
    normalizedScore: null,
    higherIsBetter: false,
    band: rawScore >= 6 ? 'lonely' : 'not_lonely',
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/assessment/domain/instruments.spec.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Mutate the behaviour and prove a named test dies**

Change the WHO-5 percentage line to `const normalizedScore = 100 - rawScore * 4;`. That is the direction bug, written in different words from the guard. Run the spec. Expected: "a person reporting more good days scores HIGHER, never lower" FAILS.

Then restore with `git checkout -- src/assessment/domain/instruments.ts` and re-run. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/assessment/domain/instruments.ts src/assessment/domain/instruments.spec.ts
git commit -m "feat(assessment): WHO-5 and UCLA-3 definitions and scoring"
```

---

### Task 2: Schema, migration, settings repository, deletion registry

**Files:**
- Modify: `prisma/schema.murror.prisma` (append the models; add back-relations inside `model User`)
- Create: `prisma/migrations/20261004120000_add_assessments/migration.sql`
- Modify: `scripts/release/production-migration-set.json`, `test/production-non-galaxy-migrations.contract.sh`
- Create: `src/assessment/domain/assessment.repository.interface.ts`, `src/assessment/infrastructure/assessment.repository.ts`
- Test: `src/assessment/infrastructure/assessment.repository.spec.ts`
- Modify: `src/user-profile/application/services/account-deletion.registry.ts`, `account-deletion.registry-snapshot.spec.ts`

**Interfaces:**
- Consumes: `Instrument`, `InstrumentSet`, `InstrumentScore` (Task 1).
- Produces:
  - `ASSESSMENT_REPOSITORY` token, plus `AssessmentRepository` with:
    - `getSettings(): Promise<AssessmentSettings>`
    - `setActiveInstrumentSet(set: InstrumentSet, now: Date): Promise<AssessmentSettings>`
    - `lastResponseAt(userId: string, instrument: Instrument): Promise<Date | null>`
    - `findCheckIn(userId: string, checkInId: string): Promise<StoredResponse[]>`
    - `createCheckIn(userId: string, checkInId: string, rows: NewResponse[]): Promise<'created' | 'duplicate'>`
    - `latestBefore(userId: string, instrument: Instrument, checkInId: string): Promise<StoredResponse | null>`
    - `listResponses(userId: string): Promise<StoredResponse[]>`
    - `getConsent(userId: string, studyKey: string): Promise<ConsentRecord | null>`
    - `saveConsent(record: ConsentRecord): Promise<void>`
    - `listConsentedResponses(studyKey: string): Promise<Array<StoredResponse & {consent: ConsentRecord}>>`
  - `AssessmentSettings = {activeInstrumentSet: InstrumentSet; switchedAt: Date | null}`
  - `LEGACY_SETTINGS: AssessmentSettings = {activeInstrumentSet: 'phq9_gad7', switchedAt: null}`

- [ ] **Step 1: Write the failing repository tests**

```ts
// src/assessment/infrastructure/assessment.repository.spec.ts
import {LEGACY_SETTINGS} from '../domain/assessment.repository.interface';
import {PrismaAssessmentRepository} from './assessment.repository';

const prismaWith = (row: unknown) =>
  ({
    assessmentSettings: {
      findUnique: jest.fn().mockResolvedValue(row),
      upsert: jest.fn(async ({create, update}) => ({...create, ...update})),
    },
  }) as any;

describe('PrismaAssessmentRepository settings', () => {
  it('a missing settings row means legacy, never who5_ucla3', async () => {
    const repo = new PrismaAssessmentRepository(prismaWith(null));
    await expect(repo.getSettings()).resolves.toEqual(LEGACY_SETTINGS);
  });

  it('maps the DB enum to the wire value', async () => {
    const at = new Date('2026-11-01T00:00:00Z');
    const repo = new PrismaAssessmentRepository(
      prismaWith({id: 1, activeInstrumentSet: 'WHO5_UCLA3', switchedAt: at}),
    );
    await expect(repo.getSettings()).resolves.toEqual({
      activeInstrumentSet: 'who5_ucla3',
      switchedAt: at,
    });
  });

  it('a database error propagates instead of falling back', async () => {
    const prisma = prismaWith(null);
    prisma.assessmentSettings.findUnique.mockRejectedValue(new Error('db down'));
    await expect(new PrismaAssessmentRepository(prisma).getSettings()).rejects.toThrow(
      'db down',
    );
  });

  it('flipping to who5_ucla3 from phq9_gad7 stamps switchedAt with now', async () => {
    const now = new Date('2026-11-01T09:00:00Z');
    const prisma = prismaWith({id: 1, activeInstrumentSet: 'PHQ9_GAD7', switchedAt: null});
    const result = await new PrismaAssessmentRepository(prisma).setActiveInstrumentSet(
      'who5_ucla3',
      now,
    );
    expect(result).toEqual({activeInstrumentSet: 'who5_ucla3', switchedAt: now});
  });

  it('setting the value already set changes nothing, keeping the old switchedAt', async () => {
    const first = new Date('2026-11-01T09:00:00Z');
    const prisma = prismaWith({id: 1, activeInstrumentSet: 'WHO5_UCLA3', switchedAt: first});
    const result = await new PrismaAssessmentRepository(prisma).setActiveInstrumentSet(
      'who5_ucla3',
      new Date('2026-12-01T09:00:00Z'),
    );
    expect(result.switchedAt).toEqual(first);
    expect(prisma.assessmentSettings.upsert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/assessment/infrastructure/assessment.repository.spec.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Add the schema**

Append to `prisma/schema.murror.prisma`:

```prisma
enum AssessmentInstrument {
  WHO5
  UCLA3
}

enum AssessmentInstrumentSet {
  PHQ9_GAD7
  WHO5_UCLA3
}

enum ResearchConsentStatus {
  CONSENTED
  DECLINED
  WITHDRAWN
}

/// Single row (id = 1, DB CHECK). The global switch for which check-in is served.
model AssessmentSettings {
  id                  Int                     @id @default(1)
  activeInstrumentSet AssessmentInstrumentSet @default(PHQ9_GAD7) @map("active_instrument_set")
  /// When the set last changed TO WHO5_UCLA3. Opens a new baseline for everyone.
  switchedAt          DateTime?               @map("switched_at") @db.Timestamptz(6)
  updatedAt           DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("assessment_settings")
}

/// One row per instrument per check-in. Sensitive: never logged, never sent to analytics.
model AssessmentResponse {
  id                String               @id @default(uuid())
  userId            String               @map("user_id")
  /// Client-generated uuid shared by the WHO-5 and UCLA-3 rows of one sitting.
  checkInId         String               @map("check_in_id") @db.Uuid
  instrument        AssessmentInstrument
  instrumentVersion String               @map("instrument_version")
  itemAnswers       Json                 @map("item_answers")
  rawScore          Int                  @map("raw_score")
  normalizedScore   Int?                 @map("normalized_score")
  higherIsBetter    Boolean              @map("higher_is_better")
  band              String
  createdAt         DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  user              User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, checkInId, instrument], map: "assessment_responses_checkin_uq")
  @@index([userId, instrument, createdAt], map: "assessment_responses_user_instrument_idx")
  @@map("assessment_responses")
}

model ResearchConsent {
  userId         String                @map("user_id")
  studyKey       String                @map("study_key")
  consentVersion String                @map("consent_version")
  status         ResearchConsentStatus
  ageConfirmed18 Boolean               @map("age_confirmed_18")
  decidedAt      DateTime              @map("decided_at") @db.Timestamptz(6)
  updatedAt      DateTime              @updatedAt @map("updated_at") @db.Timestamptz(6)
  user           User                  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, studyKey])
  @@map("research_consents")
}
```

Inside `model User { ... }`, next to the other relation lists, add:

```prisma
  assessmentResponses AssessmentResponse[]
  researchConsents    ResearchConsent[]
```

- [ ] **Step 4: Write the migration**

```sql
-- prisma/migrations/20261004120000_add_assessments/migration.sql
-- WHO-5 + UCLA-3 check-in (spec: Murror-docs docs/plans/2026-10-04-who5-ucla3-primary-measure-design.md).
--
-- Additive only: three enum types, three new tables, one seed row. No change to
-- any existing table. The seed row is PHQ9_GAD7, so deploying this changes no
-- behaviour until an admin flips the switch.
--
-- Enum values are UPPERCASE with no @map, like AiProcessingChoice.
-- Apply BEFORE deploying the API that reads these tables.

SET lock_timeout = '5s';

CREATE TYPE "murror_api"."AssessmentInstrument" AS ENUM ('WHO5', 'UCLA3');
CREATE TYPE "murror_api"."AssessmentInstrumentSet" AS ENUM ('PHQ9_GAD7', 'WHO5_UCLA3');
CREATE TYPE "murror_api"."ResearchConsentStatus" AS ENUM ('CONSENTED', 'DECLINED', 'WITHDRAWN');

CREATE TABLE IF NOT EXISTS "murror_api"."assessment_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "active_instrument_set" "murror_api"."AssessmentInstrumentSet" NOT NULL DEFAULT 'PHQ9_GAD7',
  "switched_at" TIMESTAMPTZ(6),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessment_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_settings_single_row_check" CHECK ("id" = 1)
);

INSERT INTO "murror_api"."assessment_settings" ("id", "active_instrument_set")
VALUES (1, 'PHQ9_GAD7')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "murror_api"."assessment_responses" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "check_in_id" UUID NOT NULL,
  "instrument" "murror_api"."AssessmentInstrument" NOT NULL,
  "instrument_version" TEXT NOT NULL,
  "item_answers" JSONB NOT NULL,
  "raw_score" INTEGER NOT NULL,
  "normalized_score" INTEGER,
  "higher_is_better" BOOLEAN NOT NULL,
  "band" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_responses_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "murror_api"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "assessment_responses_checkin_uq"
  ON "murror_api"."assessment_responses" ("user_id", "check_in_id", "instrument");
CREATE INDEX IF NOT EXISTS "assessment_responses_user_instrument_idx"
  ON "murror_api"."assessment_responses" ("user_id", "instrument", "created_at");

CREATE TABLE IF NOT EXISTS "murror_api"."research_consents" (
  "user_id" TEXT NOT NULL,
  "study_key" TEXT NOT NULL,
  "consent_version" TEXT NOT NULL,
  "status" "murror_api"."ResearchConsentStatus" NOT NULL,
  "age_confirmed_18" BOOLEAN NOT NULL,
  "decided_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "research_consents_pkey" PRIMARY KEY ("user_id", "study_key"),
  CONSTRAINT "research_consents_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "murror_api"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
```

- [ ] **Step 5: Declare the migration in the other two files**

In `scripts/release/production-migration-set.json`, add `"20261004120000_add_assessments"` to `includePending`, keeping the existing order convention. In `test/production-non-galaxy-migrations.contract.sh`, add the same name to `expectedIncluded`.

Run: `for c in test/*.contract.sh; do echo "== $c"; bash "$c" || break; done`
Expected: every contract prints and exits 0. If `privacy-deletion-migrations` or `privacy-schema-preflight` fails, read its message: it names what a user-bearing table must declare. Satisfy that in Step 7, then re-run.

- [ ] **Step 6: Write the repository port and its implementation**

```ts
// src/assessment/domain/assessment.repository.interface.ts
import type {Instrument, InstrumentBand, InstrumentSet} from './instruments';

export const ASSESSMENT_REPOSITORY = Symbol('ASSESSMENT_REPOSITORY');

export interface AssessmentSettings {
  activeInstrumentSet: InstrumentSet;
  switchedAt: Date | null;
}

export const LEGACY_SETTINGS: AssessmentSettings = {
  activeInstrumentSet: 'phq9_gad7',
  switchedAt: null,
};

export interface NewResponse {
  instrument: Instrument;
  instrumentVersion: string;
  itemAnswers: Record<string, number>;
  rawScore: number;
  normalizedScore: number | null;
  higherIsBetter: boolean;
  band: InstrumentBand;
}

export interface StoredResponse extends NewResponse {
  userId: string;
  checkInId: string;
  createdAt: Date;
}

export type ConsentStatus = 'consented' | 'declined' | 'withdrawn';

export interface ConsentRecord {
  userId: string;
  studyKey: string;
  consentVersion: string;
  status: ConsentStatus;
  ageConfirmed18: boolean;
  decidedAt: Date;
}

export interface AssessmentRepository {
  getSettings(): Promise<AssessmentSettings>;
  setActiveInstrumentSet(set: InstrumentSet, now: Date): Promise<AssessmentSettings>;
  lastResponseAt(userId: string, instrument: Instrument): Promise<Date | null>;
  findCheckIn(userId: string, checkInId: string): Promise<StoredResponse[]>;
  createCheckIn(
    userId: string,
    checkInId: string,
    rows: NewResponse[],
  ): Promise<'created' | 'duplicate'>;
  latestBefore(
    userId: string,
    instrument: Instrument,
    checkInId: string,
  ): Promise<StoredResponse | null>;
  listResponses(userId: string): Promise<StoredResponse[]>;
  getConsent(userId: string, studyKey: string): Promise<ConsentRecord | null>;
  saveConsent(record: ConsentRecord): Promise<void>;
  listConsentedResponses(
    studyKey: string,
  ): Promise<Array<StoredResponse & {consent: ConsentRecord}>>;
}
```

```ts
// src/assessment/infrastructure/assessment.repository.ts
import {Injectable} from '@nestjs/common';
import {Prisma} from '@prisma/client';

import {PrismaService} from '../../shared/infrastructure/database/prisma.service';
import {
  AssessmentRepository,
  AssessmentSettings,
  ConsentRecord,
  LEGACY_SETTINGS,
  NewResponse,
  StoredResponse,
} from '../domain/assessment.repository.interface';
import type {Instrument, InstrumentBand, InstrumentSet} from '../domain/instruments';

const SET_TO_DB = {phq9_gad7: 'PHQ9_GAD7', who5_ucla3: 'WHO5_UCLA3'} as const;
const SET_FROM_DB: Record<string, InstrumentSet> = {
  PHQ9_GAD7: 'phq9_gad7',
  WHO5_UCLA3: 'who5_ucla3',
};
const STATUS_TO_DB = {
  consented: 'CONSENTED',
  declined: 'DECLINED',
  withdrawn: 'WITHDRAWN',
} as const;
const STATUS_FROM_DB = {
  CONSENTED: 'consented',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
} as const;

type ResponseRow = {
  userId: string;
  checkInId: string;
  instrument: string;
  instrumentVersion: string;
  itemAnswers: unknown;
  rawScore: number;
  normalizedScore: number | null;
  higherIsBetter: boolean;
  band: string;
  createdAt: Date;
};

const toStored = (r: ResponseRow): StoredResponse => ({
  userId: r.userId,
  checkInId: r.checkInId,
  instrument: r.instrument as Instrument,
  instrumentVersion: r.instrumentVersion,
  itemAnswers: r.itemAnswers as Record<string, number>,
  rawScore: r.rawScore,
  normalizedScore: r.normalizedScore,
  higherIsBetter: r.higherIsBetter,
  band: r.band as InstrumentBand,
  createdAt: r.createdAt,
});

const toConsent = (r: {
  userId: string;
  studyKey: string;
  consentVersion: string;
  status: keyof typeof STATUS_FROM_DB;
  ageConfirmed18: boolean;
  decidedAt: Date;
}): ConsentRecord => ({
  userId: r.userId,
  studyKey: r.studyKey,
  consentVersion: r.consentVersion,
  status: STATUS_FROM_DB[r.status],
  ageConfirmed18: r.ageConfirmed18,
  decidedAt: r.decidedAt,
});

@Injectable()
export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<AssessmentSettings> {
    const row = await this.prisma.assessmentSettings.findUnique({where: {id: 1}});
    if (!row) return LEGACY_SETTINGS;
    return {
      activeInstrumentSet: SET_FROM_DB[row.activeInstrumentSet],
      switchedAt: row.switchedAt,
    };
  }

  async setActiveInstrumentSet(
    set: InstrumentSet,
    now: Date,
  ): Promise<AssessmentSettings> {
    const current = await this.getSettings();
    if (current.activeInstrumentSet === set) return current;
    const switchedAt = set === 'who5_ucla3' ? now : current.switchedAt;
    const row = await this.prisma.assessmentSettings.upsert({
      where: {id: 1},
      create: {id: 1, activeInstrumentSet: SET_TO_DB[set], switchedAt},
      update: {activeInstrumentSet: SET_TO_DB[set], switchedAt},
    });
    return {
      activeInstrumentSet: SET_FROM_DB[row.activeInstrumentSet],
      switchedAt: row.switchedAt,
    };
  }

  async lastResponseAt(userId: string, instrument: Instrument) {
    const row = await this.prisma.assessmentResponse.findFirst({
      where: {userId, instrument},
      orderBy: {createdAt: 'desc'},
      select: {createdAt: true},
    });
    return row?.createdAt ?? null;
  }

  async findCheckIn(userId: string, checkInId: string) {
    const rows = await this.prisma.assessmentResponse.findMany({
      where: {userId, checkInId},
    });
    return rows.map(toStored);
  }

  async createCheckIn(userId: string, checkInId: string, rows: NewResponse[]) {
    try {
      await this.prisma.assessmentResponse.createMany({
        data: rows.map(r => ({
          userId,
          checkInId,
          instrument: r.instrument,
          instrumentVersion: r.instrumentVersion,
          itemAnswers: r.itemAnswers,
          rawScore: r.rawScore,
          normalizedScore: r.normalizedScore,
          higherIsBetter: r.higherIsBetter,
          band: r.band,
        })),
      });
      return 'created' as const;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return 'duplicate' as const;
      }
      throw e;
    }
  }

  async latestBefore(userId: string, instrument: Instrument, checkInId: string) {
    const row = await this.prisma.assessmentResponse.findFirst({
      where: {userId, instrument, NOT: {checkInId}},
      orderBy: {createdAt: 'desc'},
    });
    return row ? toStored(row) : null;
  }

  async listResponses(userId: string) {
    const rows = await this.prisma.assessmentResponse.findMany({
      where: {userId},
      orderBy: {createdAt: 'asc'},
    });
    return rows.map(toStored);
  }

  async getConsent(userId: string, studyKey: string) {
    const row = await this.prisma.researchConsent.findUnique({
      where: {userId_studyKey: {userId, studyKey}},
    });
    return row ? toConsent(row) : null;
  }

  async saveConsent(record: ConsentRecord) {
    const data = {
      consentVersion: record.consentVersion,
      status: STATUS_TO_DB[record.status],
      ageConfirmed18: record.ageConfirmed18,
      decidedAt: record.decidedAt,
    };
    await this.prisma.researchConsent.upsert({
      where: {userId_studyKey: {userId: record.userId, studyKey: record.studyKey}},
      create: {userId: record.userId, studyKey: record.studyKey, ...data},
      update: data,
    });
  }

  async listConsentedResponses(studyKey: string) {
    const consents = await this.prisma.researchConsent.findMany({
      where: {studyKey, status: 'CONSENTED', ageConfirmed18: true},
    });
    if (consents.length === 0) return [];
    const byUser = new Map(consents.map(c => [c.userId, toConsent(c)]));
    const rows = await this.prisma.assessmentResponse.findMany({
      where: {userId: {in: [...byUser.keys()]}},
      orderBy: [{userId: 'asc'}, {createdAt: 'asc'}],
    });
    return rows.map(r => ({...toStored(r), consent: byUser.get(r.userId)!}));
  }
}
```

The `createMany` in `createCheckIn` writes both rows in one statement, so a check-in is never half stored. The unique index turns a double-submit into a `P2002` error, which is reported as `'duplicate'`.

- [ ] **Step 7: Register the tables for account deletion**

In `ACCOUNT_DELETION_REGISTRY`, next to the other `murror_api` cascade entries, add:

```ts
  {
    schema: 'murror_api',
    table: 'assessment_responses',
    userColumns: ['user_id'],
    disposition: 'CASCADE_FROM_USER_DELETE',
  },
  {
    schema: 'murror_api',
    table: 'research_consents',
    userColumns: ['user_id'],
    disposition: 'CASCADE_FROM_USER_DELETE',
  },
```

Make the matching change in `account-deletion.registry-snapshot.spec.ts`:
- add `'murror_api.assessment_responses'` and `'murror_api.research_consents'` to `EXPECTED_REGISTRY_TABLES`, in sorted position;
- change `EXPECTED_REGISTRY_TABLE_COUNT` from `142` to `144`.

`assessment_settings` has no user column and is not registered.

- [ ] **Step 8: Generate the client and run the tests**

Run: `pnpm db:generate && pnpm test src/assessment src/user-profile/application/services/account-deletion`
Expected: PASS. That includes `account-deletion.schema-drift.spec.ts`, which fails if a user-bearing table is missing from the registry.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.murror.prisma prisma/migrations/20261004120000_add_assessments \
  scripts/release/production-migration-set.json test/production-non-galaxy-migrations.contract.sh \
  src/assessment/domain/assessment.repository.interface.ts src/assessment/infrastructure \
  src/user-profile/application/services/account-deletion.registry.ts \
  src/user-profile/application/services/account-deletion.registry-snapshot.spec.ts
git commit -m "feat(assessment): tables, switch row and repository"
```

---

### Task 3: Check-in state rules (pure)

**Files:**
- Create: `src/assessment/domain/check-in-state.ts`
- Test: `src/assessment/domain/check-in-state.spec.ts`

**Interfaces:**
- Consumes: `AssessmentSettings` (Task 2), `InstrumentSet` (Task 1).
- Produces:
  - `computeCheckInState(input: CheckInStateInput): CheckInState`
  - `CHECK_IN_INTERVAL_MS`
  - `type CheckInState = {instrumentSet: InstrumentSet; due: boolean; isBaseline: boolean; consentNeeded: boolean}`
  - `type CheckInStateInput = {settings: AssessmentSettings; legacyDue: boolean; lastWho5At: Date | null; hasConsentDecision: boolean; now: Date}`

- [ ] **Step 1: Write the failing tests**

```ts
// src/assessment/domain/check-in-state.spec.ts
import {CHECK_IN_INTERVAL_MS, computeCheckInState} from './check-in-state';

const SWITCH = new Date('2026-11-01T09:00:00Z');
const on = {activeInstrumentSet: 'who5_ucla3' as const, switchedAt: SWITCH};
const off = {activeInstrumentSet: 'phq9_gad7' as const, switchedAt: null};
const base = {legacyDue: false, hasConsentDecision: true};

describe('computeCheckInState', () => {
  it('switch off: mirrors the legacy rule and never asks for consent', () => {
    expect(
      computeCheckInState({...base, settings: off, legacyDue: true, lastWho5At: null, hasConsentDecision: false, now: SWITCH}),
    ).toEqual({instrumentSet: 'phq9_gad7', due: true, isBaseline: false, consentNeeded: false});
  });

  it('switch day: a person who checked in yesterday on PHQ/GAD is due a baseline now', () => {
    expect(
      computeCheckInState({...base, settings: on, lastWho5At: null, now: SWITCH}),
    ).toMatchObject({due: true, isBaseline: true});
  });

  it('a WHO-5 from BEFORE the latest switch does not count as this baseline', () => {
    const before = new Date(SWITCH.getTime() - 1000);
    expect(
      computeCheckInState({...base, settings: on, lastWho5At: before, now: SWITCH}),
    ).toMatchObject({due: true, isBaseline: true});
  });

  it('after the baseline: not due one millisecond short of 14 days', () => {
    const last = new Date('2026-11-02T10:00:00Z');
    const now = new Date(last.getTime() + CHECK_IN_INTERVAL_MS - 1);
    expect(
      computeCheckInState({...base, settings: on, lastWho5At: last, now}),
    ).toMatchObject({due: false, isBaseline: false});
  });

  it('after the baseline: due at exactly 14 days', () => {
    const last = new Date('2026-11-02T10:00:00Z');
    const now = new Date(last.getTime() + CHECK_IN_INTERVAL_MS);
    expect(
      computeCheckInState({...base, settings: on, lastWho5At: last, now}),
    ).toMatchObject({due: true, isBaseline: false});
  });

  it('walks the study: baseline, then due again at days 14, 28, 42 and 56', () => {
    let last: Date | null = null;
    for (const day of [0, 14, 28, 42, 56]) {
      const now = new Date(SWITCH.getTime() + day * 86_400_000);
      expect(
        computeCheckInState({...base, settings: on, lastWho5At: last, now}).due,
      ).toBe(true);
      last = now;
      expect(
        computeCheckInState({...base, settings: on, lastWho5At: last, now: new Date(now.getTime() + 86_400_000)}).due,
      ).toBe(false);
    }
  });

  it('asks for consent only while no decision is recorded', () => {
    expect(
      computeCheckInState({...base, settings: on, lastWho5At: null, hasConsentDecision: false, now: SWITCH}).consentNeeded,
    ).toBe(true);
    expect(
      computeCheckInState({...base, settings: on, lastWho5At: null, hasConsentDecision: true, now: SWITCH}).consentNeeded,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/assessment/domain/check-in-state.spec.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/assessment/domain/check-in-state.ts
import type {AssessmentSettings} from './assessment.repository.interface';
import type {InstrumentSet} from './instruments';

/** WHO-5 asks about the last two weeks, so asking more often is not valid. */
export const CHECK_IN_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

export interface CheckInStateInput {
  settings: AssessmentSettings;
  /** The existing PHQ/GAD rule, computed exactly as today by the caller. */
  legacyDue: boolean;
  lastWho5At: Date | null;
  hasConsentDecision: boolean;
  now: Date;
}

export interface CheckInState {
  instrumentSet: InstrumentSet;
  due: boolean;
  isBaseline: boolean;
  consentNeeded: boolean;
}

export function computeCheckInState(input: CheckInStateInput): CheckInState {
  const {settings, legacyDue, lastWho5At, hasConsentDecision, now} = input;
  if (settings.activeInstrumentSet === 'phq9_gad7') {
    return {instrumentSet: 'phq9_gad7', due: legacyDue, isBaseline: false, consentNeeded: false};
  }
  const switchedAt = settings.switchedAt ?? new Date(0);
  const baselineDone = lastWho5At !== null && lastWho5At >= switchedAt;
  const due =
    !baselineDone || now.getTime() - lastWho5At!.getTime() >= CHECK_IN_INTERVAL_MS;
  return {
    instrumentSet: 'who5_ucla3',
    due,
    isBaseline: !baselineDone,
    consentNeeded: !hasConsentDecision,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/assessment/domain/check-in-state.spec.ts`
Expected: PASS.

- [ ] **Step 5: Mutate the behaviour**

Replace `lastWho5At >= switchedAt` with `lastWho5At !== null`. That is "any old WHO-5 counts", written differently. Run the spec. Expected: "a WHO-5 from BEFORE the latest switch does not count as this baseline" FAILS. Restore with `git checkout --` on the file.

Replace `>= CHECK_IN_INTERVAL_MS` with `> CHECK_IN_INTERVAL_MS`. Expected: "due at exactly 14 days" FAILS. Restore.

- [ ] **Step 6: Commit**

```bash
git add src/assessment/domain/check-in-state.ts src/assessment/domain/check-in-state.spec.ts
git commit -m "feat(assessment): check-in due, baseline and consent rules"
```

---

### Task 4: Assessment service (use cases)

**Files:**
- Create: `src/assessment/application/assessment.service.ts`
- Test: `src/assessment/application/assessment.service.spec.ts`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces `AssessmentService` with:
  - `getSettings(): Promise<AssessmentSettings>`
  - `setActiveInstrumentSet(set: InstrumentSet): Promise<AssessmentSettings>`
  - `getCheckInState(userId: string, legacyDue: boolean): Promise<CheckInState>`
  - `getQuestions(): Promise<QuestionsView>`
  - `submitCheckIn(userId: string, checkInId: string, answers: unknown): Promise<CheckInResult>`
  - `getHistory(userId: string): Promise<HistoryView>`
  - `recordConsent(userId: string, decision: 'consented' | 'declined', ageConfirmed18: boolean): Promise<void>`
  - `withdrawConsent(userId: string): Promise<void>`
  - `exportStudy(salt: string): Promise<ExportRow[]>`
  - errors `CheckInClosedError` and `InvalidAnswersError` (re-exported)
  - constants `STUDY_KEY = 'who5-ucla3-2026'` and `CONSENT_VERSION = 'v1'`

- [ ] **Step 1: Write the failing tests**

```ts
// src/assessment/application/assessment.service.spec.ts
import {
  AssessmentRepository,
  AssessmentSettings,
  ConsentRecord,
  NewResponse,
  StoredResponse,
} from '../domain/assessment.repository.interface';
import {InvalidAnswersError} from '../domain/instruments';
import {AssessmentService, CheckInClosedError, STUDY_KEY} from './assessment.service';

class MemoryRepo implements AssessmentRepository {
  // A minute ago, so rows the tests create (stamped "now") fall after the switch.
  settings: AssessmentSettings = {activeInstrumentSet: 'who5_ucla3', switchedAt: new Date(Date.now() - 60_000)};
  rows: StoredResponse[] = [];
  consents = new Map<string, ConsentRecord>();
  async getSettings() { return this.settings; }
  async setActiveInstrumentSet(set: any, now: Date) {
    if (this.settings.activeInstrumentSet !== set) {
      this.settings = {activeInstrumentSet: set, switchedAt: set === 'who5_ucla3' ? now : this.settings.switchedAt};
    }
    return this.settings;
  }
  async lastResponseAt(userId: string, instrument: string) {
    const r = this.rows.filter(x => x.userId === userId && x.instrument === instrument).at(-1);
    return r?.createdAt ?? null;
  }
  async findCheckIn(userId: string, checkInId: string) {
    return this.rows.filter(r => r.userId === userId && r.checkInId === checkInId);
  }
  async createCheckIn(userId: string, checkInId: string, rows: NewResponse[]) {
    if ((await this.findCheckIn(userId, checkInId)).length) return 'duplicate' as const;
    rows.forEach(r => this.rows.push({...r, userId, checkInId, createdAt: new Date()}));
    return 'created' as const;
  }
  async latestBefore(userId: string, instrument: any, checkInId: string) {
    return this.rows.filter(r => r.userId === userId && r.instrument === instrument && r.checkInId !== checkInId).at(-1) ?? null;
  }
  async listResponses(userId: string) { return this.rows.filter(r => r.userId === userId); }
  async getConsent(userId: string) { return this.consents.get(userId) ?? null; }
  async saveConsent(r: ConsentRecord) { this.consents.set(r.userId, r); }
  async listConsentedResponses() {
    return this.rows
      .filter(r => this.consents.get(r.userId)?.status === 'consented' && this.consents.get(r.userId)?.ageConfirmed18)
      .map(r => ({...r, consent: this.consents.get(r.userId)!}));
  }
}

const answers = {
  WHO5: {who5_1: 3, who5_2: 3, who5_3: 3, who5_4: 3, who5_5: 3},
  UCLA3: {ucla3_1: 2, ucla3_2: 2, ucla3_3: 2},
};
const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';

describe('AssessmentService.submitCheckIn', () => {
  it('stores one WHO-5 row and one UCLA-3 row and returns both scores', async () => {
    const repo = new MemoryRepo();
    const result = await new AssessmentService(repo).submitCheckIn('u1', ID1, answers);
    expect(repo.rows).toHaveLength(2);
    expect(result.who5).toMatchObject({normalizedScore: 60, band: 'fine', higherIsBetter: true});
    expect(result.ucla3).toMatchObject({rawScore: 6, band: 'lonely', higherIsBetter: false});
    expect(result.who5Change).toBeNull();
  });

  it('a double-submit with the same checkInId stores once and returns the same result', async () => {
    const repo = new MemoryRepo();
    const svc = new AssessmentService(repo);
    const first = await svc.submitCheckIn('u1', ID1, answers);
    const second = await svc.submitCheckIn('u1', ID1, answers);
    expect(repo.rows).toHaveLength(2);
    expect(second).toEqual(first);
  });

  it('reports the WHO-5 change against the previous check-in', async () => {
    const repo = new MemoryRepo();
    const svc = new AssessmentService(repo);
    await svc.submitCheckIn('u1', ID1, answers);
    const better = {...answers, WHO5: {who5_1: 4, who5_2: 4, who5_3: 4, who5_4: 4, who5_5: 4}};
    expect((await svc.submitCheckIn('u1', ID2, better)).who5Change).toBe(20);
  });

  it('rejects a partial check-in and stores nothing', async () => {
    const repo = new MemoryRepo();
    await expect(
      new AssessmentService(repo).submitCheckIn('u1', ID1, {WHO5: answers.WHO5}),
    ).rejects.toThrow(InvalidAnswersError);
    expect(repo.rows).toHaveLength(0);
  });

  it('rejects any check-in while the switch is phq9_gad7', async () => {
    const repo = new MemoryRepo();
    repo.settings = {activeInstrumentSet: 'phq9_gad7', switchedAt: null};
    await expect(new AssessmentService(repo).submitCheckIn('u1', ID1, answers)).rejects.toThrow(CheckInClosedError);
  });
});

describe('AssessmentService consent and export', () => {
  it('withdrawal removes the person from every later export but keeps their history', async () => {
    const repo = new MemoryRepo();
    const svc = new AssessmentService(repo);
    await svc.recordConsent('u1', 'consented', true);
    await svc.submitCheckIn('u1', ID1, answers);
    expect(await svc.exportStudy('salt')).toHaveLength(2);
    await svc.withdrawConsent('u1');
    expect(await svc.exportStudy('salt')).toHaveLength(0);
    expect((await svc.getHistory('u1')).who5.points).toHaveLength(1);
  });

  it('exports a stable pseudonymous study id, never the user id', async () => {
    const repo = new MemoryRepo();
    const svc = new AssessmentService(repo);
    await svc.recordConsent('u1', 'consented', true);
    await svc.submitCheckIn('u1', ID1, answers);
    const rows = await svc.exportStudy('salt');
    expect(JSON.stringify(rows)).not.toContain('u1');
    expect(rows[0].studyId).toBe(rows[1].studyId);
    expect(rows[0]).toMatchObject({cohort: 'main', dayFromBaseline: 0, studyKey: STUDY_KEY});
  });

  it('refuses to export without a salt', async () => {
    await expect(new AssessmentService(new MemoryRepo()).exportStudy('')).rejects.toThrow('salt');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/assessment/application/assessment.service.spec.ts`
Expected: FAIL, the module is not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/assessment/application/assessment.service.ts
import {Inject, Injectable} from '@nestjs/common';
import {createHmac} from 'crypto';

import {
  ASSESSMENT_REPOSITORY,
  AssessmentRepository,
  AssessmentSettings,
  StoredResponse,
} from '../domain/assessment.repository.interface';
import {CheckInState, computeCheckInState} from '../domain/check-in-state';
import {
  INSTRUMENT_ORDER,
  INSTRUMENTS,
  InstrumentScore,
  InstrumentSet,
  InvalidAnswersError,
  scoreInstrument,
  validateAnswers,
} from '../domain/instruments';

export {InvalidAnswersError};

export const STUDY_KEY = 'who5-ucla3-2026';
export const CONSENT_VERSION = 'v1';
const DAY_MS = 86_400_000;
const MAIN_COHORT_WINDOW_MS = 14 * DAY_MS;

export class CheckInClosedError extends Error {
  constructor() {
    super('The WHO-5 and UCLA-3 check-in is not active');
    this.name = 'CheckInClosedError';
  }
}

export interface CheckInResult {
  checkInId: string;
  who5: InstrumentScore;
  ucla3: InstrumentScore;
  /** Percentage points vs the previous WHO-5, or null for a first check-in. */
  who5Change: number | null;
}

export interface QuestionsView {
  instruments: Array<{
    instrument: 'WHO5' | 'UCLA3';
    version: string;
    stem: string;
    items: readonly {key: string; text: string}[];
    options: readonly {value: number; label: string}[];
  }>;
}

export interface HistoryPoint {
  checkInId: string;
  at: Date;
  score: number;
  band: string;
}

export interface HistoryView {
  who5: {higherIsBetter: true; min: 0; max: 100; points: HistoryPoint[]};
  ucla3: {higherIsBetter: false; min: 3; max: 9; points: HistoryPoint[]};
}

export interface ExportRow {
  studyKey: string;
  studyId: string;
  cohort: 'main' | 'rolling';
  consentedOn: string;
  instrument: 'WHO5' | 'UCLA3';
  instrumentVersion: string;
  rawScore: number;
  normalizedScore: number | null;
  band: string;
  dayFromBaseline: number;
}

const toScore = (r: StoredResponse): InstrumentScore => ({
  instrument: r.instrument,
  instrumentVersion: r.instrumentVersion,
  rawScore: r.rawScore,
  normalizedScore: r.normalizedScore,
  higherIsBetter: r.higherIsBetter,
  band: r.band,
});

@Injectable()
export class AssessmentService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY) private readonly repo: AssessmentRepository,
  ) {}

  getSettings(): Promise<AssessmentSettings> {
    return this.repo.getSettings();
  }

  setActiveInstrumentSet(set: InstrumentSet): Promise<AssessmentSettings> {
    return this.repo.setActiveInstrumentSet(set, new Date());
  }

  async getCheckInState(userId: string, legacyDue: boolean): Promise<CheckInState> {
    const settings = await this.repo.getSettings();
    if (settings.activeInstrumentSet === 'phq9_gad7') {
      return computeCheckInState({settings, legacyDue, lastWho5At: null, hasConsentDecision: true, now: new Date()});
    }
    const [lastWho5At, consent] = await Promise.all([
      this.repo.lastResponseAt(userId, 'WHO5'),
      this.repo.getConsent(userId, STUDY_KEY),
    ]);
    return computeCheckInState({
      settings,
      legacyDue,
      lastWho5At,
      hasConsentDecision: consent !== null,
      now: new Date(),
    });
  }

  async getQuestions(): Promise<QuestionsView> {
    if ((await this.repo.getSettings()).activeInstrumentSet !== 'who5_ucla3') {
      throw new CheckInClosedError();
    }
    return {
      instruments: INSTRUMENT_ORDER.map(i => {
        const d = INSTRUMENTS[i];
        return {instrument: i, version: d.version, stem: d.stem, items: d.items, options: d.options};
      }),
    };
  }

  async submitCheckIn(userId: string, checkInId: string, answers: unknown): Promise<CheckInResult> {
    if ((await this.repo.getSettings()).activeInstrumentSet !== 'who5_ucla3') {
      throw new CheckInClosedError();
    }
    const existing = await this.repo.findCheckIn(userId, checkInId);
    if (existing.length > 0) return this.resultFrom(userId, checkInId, existing);

    if (answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new InvalidAnswersError('WHO5', 'answers must be an object');
    }
    const byInstrument = answers as Record<string, unknown>;
    const scored = INSTRUMENT_ORDER.map(i => {
      const valid = validateAnswers(i, byInstrument[i]);
      return {itemAnswers: valid, ...scoreInstrument(i, valid)};
    });

    // 'duplicate' means a concurrent retry won the race; either way the stored
    // rows are the truth, so both callers get the same result.
    await this.repo.createCheckIn(userId, checkInId, scored);
    const stored = await this.repo.findCheckIn(userId, checkInId);
    if (stored.length !== INSTRUMENT_ORDER.length) {
      throw new Error('Check-in was not stored');
    }
    return this.resultFrom(userId, checkInId, stored);
  }

  private async resultFrom(userId: string, checkInId: string, rows: StoredResponse[]): Promise<CheckInResult> {
    const who5 = rows.find(r => r.instrument === 'WHO5')!;
    const ucla3 = rows.find(r => r.instrument === 'UCLA3')!;
    const previous = await this.repo.latestBefore(userId, 'WHO5', checkInId);
    return {
      checkInId,
      who5: toScore(who5),
      ucla3: toScore(ucla3),
      who5Change:
        // <= not <: two fast check-ins can share a millisecond in tests.
        previous && previous.createdAt <= who5.createdAt
          ? who5.normalizedScore! - previous.normalizedScore!
          : null,
    };
  }

  async getHistory(userId: string): Promise<HistoryView> {
    const rows = await this.repo.listResponses(userId);
    const points = (instrument: 'WHO5' | 'UCLA3') =>
      rows
        .filter(r => r.instrument === instrument)
        .map(r => ({
          checkInId: r.checkInId,
          at: r.createdAt,
          score: instrument === 'WHO5' ? r.normalizedScore! : r.rawScore,
          band: r.band,
        }));
    return {
      who5: {higherIsBetter: true, min: 0, max: 100, points: points('WHO5')},
      ucla3: {higherIsBetter: false, min: 3, max: 9, points: points('UCLA3')},
    };
  }

  async recordConsent(userId: string, decision: 'consented' | 'declined', ageConfirmed18: boolean) {
    await this.repo.saveConsent({
      userId,
      studyKey: STUDY_KEY,
      consentVersion: CONSENT_VERSION,
      status: decision,
      ageConfirmed18: decision === 'consented' && ageConfirmed18,
      decidedAt: new Date(),
    });
  }

  async withdrawConsent(userId: string) {
    const current = await this.repo.getConsent(userId, STUDY_KEY);
    await this.repo.saveConsent({
      userId,
      studyKey: STUDY_KEY,
      consentVersion: current?.consentVersion ?? CONSENT_VERSION,
      status: 'withdrawn',
      ageConfirmed18: current?.ageConfirmed18 ?? false,
      decidedAt: new Date(),
    });
  }

  async exportStudy(salt: string): Promise<ExportRow[]> {
    if (!salt) throw new Error('STUDY_EXPORT_SALT is not set; refusing to export without a salt');
    const settings = await this.repo.getSettings();
    const switchedAt = settings.switchedAt ?? new Date(0);
    const rows = await this.repo.listConsentedResponses(STUDY_KEY);
    const baselineByUser = new Map<string, Date>();
    for (const r of rows) {
      if (r.createdAt >= switchedAt && !baselineByUser.has(r.userId)) {
        baselineByUser.set(r.userId, r.createdAt);
      }
    }
    return rows
      .filter(r => baselineByUser.has(r.userId))
      .map(r => ({
        studyKey: STUDY_KEY,
        studyId: createHmac('sha256', salt).update(r.userId).digest('hex').slice(0, 16),
        cohort:
          r.consent.decidedAt.getTime() - switchedAt.getTime() <= MAIN_COHORT_WINDOW_MS
            ? 'main'
            : 'rolling',
        consentedOn: r.consent.decidedAt.toISOString().slice(0, 10),
        instrument: r.instrument,
        instrumentVersion: r.instrumentVersion,
        rawScore: r.rawScore,
        normalizedScore: r.normalizedScore,
        band: r.band,
        dayFromBaseline: Math.floor(
          (r.createdAt.getTime() - baselineByUser.get(r.userId)!.getTime()) / DAY_MS,
        ),
      }));
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/assessment/application/assessment.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assessment/application
git commit -m "feat(assessment): check-in, history, consent and export use cases"
```

---

### Task 5: Make the three existing check-in-due sites switch-aware

There are exactly three sibling sites today. Before editing, confirm the count with:

```bash
grep -rn "user_checkin_reports" src --include='*.ts' | grep -v spec
```

The three sites are:
- `getUserProfile` in `user-profile.service.ts`, around line 198;
- the raw-SQL method in the same file, around lines 341-409;
- `checkReportSubmitted` in `bootstrap-app.use-case.ts`, around line 54.

Any other non-spec hit must be read and either added to this task or noted in the PR as not a due-site.

**Files:**
- Modify: `src/user-profile/user-profile.service.ts`, `src/user-profile/application/use-cases/bootstrap-app.use-case.ts`, `src/user-profile/dto/user-profile-response.dto.ts`, `src/user-profile/user-profile.module.ts` (import `AssessmentModule`)
- Test: `src/user-profile/user-profile.service.assessment-switch.spec.ts`, `src/user-profile/application/use-cases/bootstrap-app.assessment-switch.spec.ts`

**Interfaces:**
- Consumes: `AssessmentService.getCheckInState(userId, legacyDue)` (Task 4).
- Produces:
  - profile DTO field `checkIn: CheckInStateDto`, read by Plan 3;
  - legacy `biWeeklyCheckinAvailable` is `false` whenever the set is `who5_ucla3`;
  - bootstrap `isReportSubmitted` is `true` whenever the set is `who5_ucla3`, so older builds see nothing due.

- [ ] **Step 1: Write the failing tests**

Build each spec by copying the existing test module setup of the nearest spec for that file. Find it with `ls src/user-profile/*.spec.ts`; it provides `PrismaService` and `LegacyPrismaService` mocks. Add `{provide: AssessmentService, useValue: assessment}` and these cases:

```ts
// in user-profile.service.assessment-switch.spec.ts
const assessment = {getCheckInState: jest.fn()};

it('switch off: biWeeklyCheckinAvailable is unchanged and checkIn mirrors it', async () => {
  legacyPrisma.user_checkin_reports.findFirst.mockResolvedValue(null); // never checked in
  assessment.getCheckInState.mockImplementation(async (_u: string, legacyDue: boolean) => ({
    instrumentSet: 'phq9_gad7', due: legacyDue, isBaseline: false, consentNeeded: false,
  }));
  const profile = await service.getUserProfile(USER_ID);
  expect(profile.biWeeklyCheckinAvailable).toBe(true);
  expect(profile.checkIn).toEqual({instrumentSet: 'phq9_gad7', due: true, isBaseline: false, consentNeeded: false});
  expect(assessment.getCheckInState).toHaveBeenCalledWith(USER_ID, true);
});

it('switch on: older builds are told nothing is due, new builds get the baseline', async () => {
  legacyPrisma.user_checkin_reports.findFirst.mockResolvedValue(null);
  assessment.getCheckInState.mockResolvedValue({
    instrumentSet: 'who5_ucla3', due: true, isBaseline: true, consentNeeded: true,
  });
  const profile = await service.getUserProfile(USER_ID);
  expect(profile.biWeeklyCheckinAvailable).toBe(false);
  expect(profile.checkIn.due).toBe(true);
});
```

Write the same two cases against the raw-SQL profile method. Mock `legacyPrisma.$queryRaw` to resolve `[{biWeeklyCheckinAvailable: true}]`.

For `bootstrap-app.assessment-switch.spec.ts`:

```ts
it('switch on: isReportSubmitted is true so older builds do not prompt', async () => {
  legacyPrisma.user_checkin_reports.findFirst.mockResolvedValue(null);
  assessment.getSettings = jest.fn().mockResolvedValue({activeInstrumentSet: 'who5_ucla3', switchedAt: new Date()});
  const result = await useCase.execute(USER_ID);
  expect(result.isReportSubmitted).toBe(true);
});

it('switch off: isReportSubmitted keeps the 13-day legacy rule', async () => {
  legacyPrisma.user_checkin_reports.findFirst.mockResolvedValue(null);
  assessment.getSettings = jest.fn().mockResolvedValue({activeInstrumentSet: 'phq9_gad7', switchedAt: null});
  expect((await useCase.execute(USER_ID)).isReportSubmitted).toBe(false);
});
```

Use the use-case's real public method name and result shape from `bootstrap-app.use-case.ts`. If it is not `execute`, use that name in the test.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/user-profile -t "switch"`
Expected: FAIL. The `checkIn` property is undefined, and `biWeeklyCheckinAvailable` is still `true` when the switch is on.

- [ ] **Step 3: Write the implementation**

In `user-profile-response.dto.ts`, add:

```ts
export class CheckInStateDto {
  @ApiProperty({enum: ['phq9_gad7', 'who5_ucla3']})
  instrumentSet: 'phq9_gad7' | 'who5_ucla3';

  @ApiProperty()
  due: boolean;

  @ApiProperty()
  isBaseline: boolean;

  @ApiProperty()
  consentNeeded: boolean;
}
```

Then, under the existing `biWeeklyCheckinAvailable` property of `UserProfileResponseDto`, add:

```ts
  @ApiProperty({type: CheckInStateDto})
  checkIn: CheckInStateDto;
```

In `getUserProfile`, replace the block that computes `biWeeklyCheckinAvailable`:

```ts
      // Legacy PHQ/GAD rule, unchanged. Older builds read only this field.
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const legacyDue = !lastCheckin || lastCheckin.created_at < fourteenDaysAgo;
      const checkIn = await this.assessmentService.getCheckInState(userId, legacyDue);
      // Once WHO-5/UCLA-3 is active, older builds must not collect PHQ/GAD.
      const biWeeklyCheckinAvailable =
        checkIn.instrumentSet === 'who5_ucla3' ? false : legacyDue;
```

Then add `checkIn,` next to `biWeeklyCheckinAvailable,` in the returned object.

In the raw-SQL method, replace the return line with:

```ts
      biWeeklyCheckinAvailable:
        checkIn.instrumentSet === 'who5_ucla3' ? false : legacyDue,
      checkIn,
```

Above the object being built, add:

```ts
    const legacyDue = checkinRows[0]?.biWeeklyCheckinAvailable ?? true;
    const checkIn = await this.assessmentService.getCheckInState(murrorUser.id, legacyDue);
```

Use the user id variable that method already uses.

Inject `private readonly assessmentService: AssessmentService` into the `UserProfileService` constructor. Add `AssessmentModule` to `UserProfileModule.imports`.

In `bootstrap-app.use-case.ts`, at the top of `checkReportSubmitted(userId)`, before the legacy query, add:

```ts
    // With WHO-5/UCLA-3 active, report "submitted" so older builds never prompt
    // a PHQ/GAD check-in. New builds read profile.checkIn instead.
    const settings = await this.assessmentService.getSettings();
    if (settings.activeInstrumentSet === 'who5_ucla3') {
      return true;
    }
```

Inject `AssessmentService` into that use case's constructor in the same way.

- [ ] **Step 4: Run the tests to verify they pass, including every existing user-profile spec**

Run: `pnpm test src/user-profile`
Expected: PASS. Existing specs that build `UserProfileService` without an `AssessmentService` provider fail at construction. In each of those, add `{provide: AssessmentService, useValue: {getCheckInState: async (_u, d) => ({instrumentSet: 'phq9_gad7', due: d, isBaseline: false, consentNeeded: false}), getSettings: async () => ({activeInstrumentSet: 'phq9_gad7', switchedAt: null})}}`. That is the switch-off behaviour, so their assertions stay unchanged.

- [ ] **Step 5: Mutate the behaviour**

In `getUserProfile`, change the ternary to `const biWeeklyCheckinAvailable = legacyDue;`. That is "forgot the old builds", written differently. Expected: "switch on: older builds are told nothing is due" FAILS. Restore.

- [ ] **Step 6: Commit**

```bash
git add src/user-profile
git commit -m "feat(user-profile): switch-aware check-in flags for all 3 due sites"
```

---

### Task 6: User and admin endpoints

**Files:**
- Create: `src/assessment/presentation/dto/submit-check-in.dto.ts`, `src/assessment/presentation/dto/consent.dto.ts`, `src/assessment/presentation/dto/set-instrument-set.dto.ts`
- Create: `src/assessment/presentation/assessment.controller.ts`, `src/assessment/presentation/assessment-admin.controller.ts`, `src/assessment/assessment.module.ts`
- Modify: `src/app.module.ts`
- Test: `src/assessment/presentation/assessment.controller.http.spec.ts`

**Interfaces:**
- Consumes: `AssessmentService` (Task 4).
- Produces (Plan 3 consumes these routes):
  - `GET /api/v1/assessments/questions` returns `QuestionsView`; 409 `ASSESSMENT_CHECK_IN_CLOSED` while the switch is off.
  - `POST /api/v1/assessments/check-ins`, body `{checkInId: uuid, answers: {WHO5: {...}, UCLA3: {...}}}`, returns `CheckInResult`; 400 `ASSESSMENT_ANSWERS_INVALID`; 409 `ASSESSMENT_CHECK_IN_CLOSED`.
  - `GET /api/v1/assessments/history` returns `HistoryView`.
  - `POST /api/v1/assessments/consent`, body `{decision: 'consented' | 'declined', ageConfirmed18: boolean}`, returns 204.
  - `DELETE /api/v1/assessments/consent` withdraws; returns 204.
  - `PUT /api/v1/admin/assessments/settings`, header `x-admin-key`, body `{activeInstrumentSet}`.
  - `GET /api/v1/admin/assessments/export`, header `x-admin-key`.

- [ ] **Step 1: Write the failing HTTP tests**

Copy the app bootstrapping from `src/checkin/mental-health.controller.answers-errors.http.spec.ts`: Nest testing module, `AuthGuard` overridden to set `req.user = {id: 'u1'}`, global `ValidationPipe` exactly as `main.ts` configures it, supertest. Provide `AssessmentService` as a jest mock. Cases:

```ts
it('POST check-ins: a non-uuid checkInId is 400 and the service is never called', async () => {
  await request(app.getHttpServer())
    .post('/v1/assessments/check-ins')
    .send({checkInId: 'abc', answers: {}})
    .expect(400);
  expect(service.submitCheckIn).not.toHaveBeenCalled();
});

it('POST check-ins: InvalidAnswersError maps to 400 ASSESSMENT_ANSWERS_INVALID', async () => {
  service.submitCheckIn.mockRejectedValue(new InvalidAnswersError('WHO5', 'x'));
  const res = await request(app.getHttpServer())
    .post('/v1/assessments/check-ins')
    .send({checkInId: ID1, answers: {WHO5: {}, UCLA3: {}}})
    .expect(400);
  expect(res.body.errorCode ?? res.body.error?.errorCode).toBe('ASSESSMENT_ANSWERS_INVALID');
});

it('POST check-ins: switch off maps to 409 ASSESSMENT_CHECK_IN_CLOSED', async () => {
  service.submitCheckIn.mockRejectedValue(new CheckInClosedError());
  await request(app.getHttpServer())
    .post('/v1/assessments/check-ins')
    .send({checkInId: ID1, answers: {WHO5: {}, UCLA3: {}}})
    .expect(409);
});

it('POST check-ins: the answers object reaches the service intact (not stripped)', async () => {
  service.submitCheckIn.mockResolvedValue({checkInId: ID1});
  const answers = {WHO5: {who5_1: 3, who5_2: 3, who5_3: 3, who5_4: 3, who5_5: 3}, UCLA3: {ucla3_1: 1, ucla3_2: 1, ucla3_3: 1}};
  await request(app.getHttpServer()).post('/v1/assessments/check-ins').send({checkInId: ID1, answers}).expect(201);
  expect(service.submitCheckIn).toHaveBeenCalledWith('u1', ID1, answers);
});

it('PUT admin settings without x-admin-key is 401', async () => {
  await request(app.getHttpServer())
    .put('/v1/admin/assessments/settings')
    .send({activeInstrumentSet: 'who5_ucla3'})
    .expect(401);
  expect(service.setActiveInstrumentSet).not.toHaveBeenCalled();
});
```

The "not stripped" test pins the ValidationPipe trap. If `answers` were not declared on the DTO, the pipe would strip it to `undefined`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/assessment/presentation`
Expected: FAIL with 404s, because the routes do not exist yet.

- [ ] **Step 3: Write the DTOs, controllers and module**

```ts
// src/assessment/presentation/dto/submit-check-in.dto.ts
import {ApiProperty} from '@nestjs/swagger';
import {IsObject, IsUUID} from 'class-validator';

export class SubmitCheckInDto {
  @ApiProperty({format: 'uuid', description: 'Client-generated; makes a retry safe'})
  @IsUUID('4')
  checkInId: string;

  // Shape and ranges are checked by the domain (validateAnswers), which knows
  // each instrument's items. Declared here so ValidationPipe does not strip it.
  @ApiProperty({example: {WHO5: {who5_1: 3}, UCLA3: {ucla3_1: 2}}})
  @IsObject()
  answers: Record<string, unknown>;
}
```

```ts
// src/assessment/presentation/dto/consent.dto.ts
import {ApiProperty} from '@nestjs/swagger';
import {IsBoolean, IsIn} from 'class-validator';

export class ConsentDto {
  @ApiProperty({enum: ['consented', 'declined']})
  @IsIn(['consented', 'declined'])
  decision: 'consented' | 'declined';

  @ApiProperty()
  @IsBoolean()
  ageConfirmed18: boolean;
}
```

```ts
// src/assessment/presentation/dto/set-instrument-set.dto.ts
import {ApiProperty} from '@nestjs/swagger';
import {IsIn} from 'class-validator';

export class SetInstrumentSetDto {
  @ApiProperty({enum: ['phq9_gad7', 'who5_ucla3']})
  @IsIn(['phq9_gad7', 'who5_ucla3'])
  activeInstrumentSet: 'phq9_gad7' | 'who5_ucla3';
}
```

```ts
// src/assessment/presentation/assessment.controller.ts
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';

import {AuthGuard} from '../../auth/guards/auth.guard';
import {ResponseFactory} from '../../common/factories/response.factory';
import {
  AssessmentService,
  CheckInClosedError,
  InvalidAnswersError,
} from '../application/assessment.service';
import {ConsentDto} from './dto/consent.dto';
import {SubmitCheckInDto} from './dto/submit-check-in.dto';

interface AuthenticatedRequest {
  user: {id: string};
}

export const mapAssessmentError = (e: unknown): never => {
  if (e instanceof InvalidAnswersError) {
    throw new BadRequestException({message: e.message, errorCode: 'ASSESSMENT_ANSWERS_INVALID'});
  }
  if (e instanceof CheckInClosedError) {
    throw new ConflictException({message: e.message, errorCode: 'ASSESSMENT_CHECK_IN_CLOSED'});
  }
  throw e;
};

@ApiTags('assessments')
@Controller({path: 'assessments', version: '1'})
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class AssessmentController {
  constructor(
    private readonly service: AssessmentService,
    private readonly responseFactory: ResponseFactory,
  ) {}

  @Get('questions')
  async questions() {
    return this.responseFactory.success(await this.service.getQuestions().catch(mapAssessmentError));
  }

  @Post('check-ins')
  async submit(@Request() req: AuthenticatedRequest, @Body() body: SubmitCheckInDto) {
    return this.responseFactory.success(
      await this.service
        .submitCheckIn(req.user.id, body.checkInId, body.answers)
        .catch(mapAssessmentError),
    );
  }

  @Get('history')
  async history(@Request() req: AuthenticatedRequest) {
    return this.responseFactory.success(await this.service.getHistory(req.user.id));
  }

  @Post('consent')
  @HttpCode(204)
  async consent(@Request() req: AuthenticatedRequest, @Body() body: ConsentDto) {
    await this.service.recordConsent(req.user.id, body.decision, body.ageConfirmed18);
  }

  @Delete('consent')
  @HttpCode(204)
  async withdraw(@Request() req: AuthenticatedRequest) {
    await this.service.withdrawConsent(req.user.id);
  }
}
```

```ts
// src/assessment/presentation/assessment-admin.controller.ts
import {Body, Controller, Get, Put, UseGuards} from '@nestjs/common';
import {ApiTags} from '@nestjs/swagger';

import {AdminApiKeyGuard} from '../../auth/guards/admin-api-key.guard';
import {ResponseFactory} from '../../common/factories/response.factory';
import {AssessmentService} from '../application/assessment.service';
import {SetInstrumentSetDto} from './dto/set-instrument-set.dto';

@ApiTags('admin-assessments')
@Controller({path: 'admin/assessments', version: '1'})
@UseGuards(AdminApiKeyGuard)
export class AssessmentAdminController {
  constructor(
    private readonly service: AssessmentService,
    private readonly responseFactory: ResponseFactory,
  ) {}

  @Put('settings')
  async setSettings(@Body() body: SetInstrumentSetDto) {
    return this.responseFactory.success(
      await this.service.setActiveInstrumentSet(body.activeInstrumentSet),
    );
  }

  @Get('export')
  async export() {
    return this.responseFactory.success({
      rows: await this.service.exportStudy(process.env.STUDY_EXPORT_SALT ?? ''),
    });
  }
}
```

```ts
// src/assessment/assessment.module.ts
import {Module} from '@nestjs/common';

import {AuthModule} from '../auth/auth.module';
import {CommonModule} from '../common/common.module';
import {AssessmentService} from './application/assessment.service';
import {ASSESSMENT_REPOSITORY} from './domain/assessment.repository.interface';
import {PrismaAssessmentRepository} from './infrastructure/assessment.repository';
import {AssessmentAdminController} from './presentation/assessment-admin.controller';
import {AssessmentController} from './presentation/assessment.controller';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [AssessmentController, AssessmentAdminController],
  providers: [
    AssessmentService,
    {provide: ASSESSMENT_REPOSITORY, useClass: PrismaAssessmentRepository},
  ],
  exports: [AssessmentService],
})
export class AssessmentModule {}
```

Add `AssessmentModule` to the `imports` array of `src/app.module.ts`, next to `CheckinModule`. If `PrismaService` is not provided globally, copy the import that `CheckinModule`'s repository relies on.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/assessment`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assessment src/app.module.ts
git commit -m "feat(assessment): user and admin endpoints"
```

---

### Task 7: Privacy proof, full gate, PR, dark deploy

**Files:**
- Test: `src/common/utils/sentry-scrub.util.spec.ts` (append)

- [ ] **Step 1: Write the scrub test**

Open `sentry-scrub.util.spec.ts` and use the scrub function and event shape its existing tests use. Append:

```ts
it('drops check-in scores, bands and answers from every Sentry surface', () => {
  const sensitive = {
    rawScore: 9, normalizedScore: 28, band: 'lonely',
    itemAnswers: {ucla3_1: 3}, who5: {normalizedScore: 28}, ucla3: {rawScore: 9},
  };
  const out = JSON.stringify(scrubUnderTest(eventWith(sensitive)));
  for (const leaked of ['rawScore', 'normalizedScore', 'lonely', 'itemAnswers', 'ucla3_1']) {
    expect(out).not.toContain(leaked);
  }
});
```

Replace `scrubUnderTest` and `eventWith` with the spec's real helpers. The scrubber is allow-list based, so this should pass with no production change. If it fails, the leaking key's surface must be added to the scrubber's drop path before continuing.

- [ ] **Step 2: Run the full local gate**

```bash
pnpm db:generate
pnpm test
pnpm type-check
pnpm lint
pnpm format-check
for c in test/*.contract.sh; do echo "== $c"; bash "$c" || exit 1; done
```

Expected: every command exits 0, and the test count goes up by the new specs only. For the baseline, run `pnpm test 2>&1 | tail -5` on `origin/staging` in a separate worktree first, and record both numbers in the PR.

- [ ] **Step 3: Prove "dark" by effect locally**

Start Postgres with `docker compose up` and apply migrations with `pnpm prisma:migrate`. Then call the profile route the app uses for a test user. Find it with `grep -rn "getUserProfile(" src --include='*.controller.ts'`.

Expected:
- `biWeeklyCheckinAvailable` has the same value as on `origin/staging`;
- `checkIn.instrumentSet` is `"phq9_gad7"`;
- `GET /api/v1/assessments/questions` returns 409.

- [ ] **Step 4: Push once and open the PR**

```bash
git push -u origin feat/assessment-who5-ucla3
gh pr create -R Murror/murror-api --base staging \
  --title "feat(assessment): WHO-5 and UCLA-3 foundation, ships dark" \
  --body-file /tmp/pr-body.md
```

The PR body covers:
- the spec link;
- "ships dark: the seed row is PHQ9_GAD7";
- the licence sources from Task 1, Step 0;
- the 3-sibling count;
- the mutation results;
- the before and after test counts;
- the line "Adds env var STUDY_EXPORT_SALT (needed only for export)".

It ends with the Claude Code attribution line. Do not add the `run-ci` label without Astro.

- [ ] **Step 5: After merge, deploy to staging and verify by effect**

A merge to `staging` auto-deploys staging; do not also dispatch. Check:
- the migration applied;
- `/api/health` is OK;
- a test account's profile shows `checkIn.instrumentSet: "phq9_gad7"`.

Production promotion follows the CLAUDE.md promotion steps, with the switch still `PHQ9_GAD7`. Set `STUDY_EXPORT_SALT` in both namespaces before any export.

---

## Self-review against the spec

| Spec section | Covered by |
|---|---|
| 5 Instruments (items, scales, bands, direction, version keys) | Task 1 |
| 6.1 Data (three tables, deletion) | Task 2 |
| 6.2 API (new endpoints, DTOs declared, profile `checkIn`, `due` rules, older builds false, history) | Tasks 3, 4, 5, 6 |
| 7 Safety, item 4 (legacy item-9 intact) | The legacy controller is untouched; Task 7, Step 2 keeps every existing spec green |
| 8 Privacy (deletion, scrubbing, withdrawal, under-18 exclusion) | Tasks 2, 4, 7 |
| 10 Study export (pseudonymous id, cohort, day from baseline, withdrawn excluded) | Task 4 |
| 11 Testing (direction mutation, boundary, baseline-on-switch, old-build) | Tasks 1, 3, 5 |
| 6.3 / 6.4 / 6.5, safety items 1-3, flip | Plans 2-4, out of scope here |
