# Wellbeing check-in, Plan 1 of 4: murror-api foundation (ships dark)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give murror-api everything the new check-in needs. With the switch at `phq9_gad7`, every existing behaviour is unchanged. The check-in has four parts:
- Murror's own 6-question wellbeing questionnaire;
- the ONS life-satisfaction question (a reference point);
- UCLA-3;
- the ONS direct loneliness question.

The work covers scoring, trend and support-card rules, storage, a global switch, consent, endpoints and the study export.

**Architecture:** A new bounded context, `src/assessment/`, with the usual domain / application / infrastructure / presentation layout.
- **Pure functions in `domain/`:** scoring, trend words, the support card, and due dates. They are tested without a database.
- **Three new `murror_api` tables:**
  - `assessment_responses`;
  - `research_consents`;
  - `assessment_settings`, a single row holding the switch.
- **Existing check-in-due sites:** all three read the switch. When it is `wellbeing_v1`, they tell older app builds that nothing is due.

**Tech Stack:** NestJS 11, Prisma 6 (`schema.murror.prisma`), class-validator, Jest, pnpm.

**Spec:** `Murror-docs/docs/plans/2026-10-04-wellbeing-check-in-design.md`. Read sections 5, 6.1, 6.2, 8, 10 and 11 first.

**Next plans** (written after this one merges, because they consume its interfaces):
- Plan 2: viasr-api.
- Plan 3: MurrorMobile + murror-platform.
- Plan 4: safety evidence and the flip.

## Global Constraints

- **Branch and PR:** work in `prod/wt-assessment-api` on branch `feat/assessment-who5-ucla3`, cut from `origin/staging` at 230fff44. The PR targets `staging`. Never push to `main`, `staging` or `production`. (The branch name predates the switch away from WHO-5, so keep it to avoid churn.)
- **Dark ship:** with `assessment_settings.active_instrument_set = 'PHQ9_GAD7'`, every existing response body is byte-identical to today, and every existing test passes unchanged. The staging baseline before this work: **690 suites, 8879 tests passed** (15 suites and 151 tests skipped).
- **Migrations take three files:**
  - `prisma/migrations/<name>/migration.sql` plus the schema change;
  - `scripts/release/production-migration-set.json` (`includePending`);
  - `test/production-non-galaxy-migrations.contract.sh` (`expectedIncluded`).
  - Run every `test/*.contract.sh` locally.
- **Enums:** Prisma enum values are UPPERCASE with no `@map`, like `DailyNoteKind`. Wire values are lowercase strings, mapped in the repository.
- **Copy:**
  - No em dashes in any string. English only.
  - Item wording is copied exactly from spec section 5.
  - No `MURROR_WB` item may contain WHO-5 wording; a test guards this.
- **What the user sees:** the submit response carries **no scores**, only `trend` and `showSupportCard`.
- **Commits:**
  - Conventional Commits, header 72 characters or fewer.
  - **No `#123` in any commit body.**
  - End every commit with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Errors:** never swallowed. A missing settings row means legacy; a database error propagates.
- **Privacy:** no score, band or answer in any log line, Sentry payload, PostHog event or push payload.
- **CI costs $0:**
  - Run `pnpm test`, `pnpm type-check`, `pnpm lint`, `pnpm format-check` and all contracts locally before the single push.
  - The `run-ci` label needs Astro.
- **Codex sandbox:** it cannot write the worktree's shared `.git` (index.lock EPERM). Codex leaves its changes uncommitted, and Claude reviews and commits each task. Use `--watchman=false` for jest inside the sandbox.

## Review Focus

1. **Double-submit:** a person taps Submit twice, or the request is retried after a timeout. One check-in (4 rows) must be stored, and both calls must return the same result. Pinned in Task 4 (service) and Task 6 (uuid DTO).
2. **Malformed answers:** strings, decimals, out of range (`5` on a 0-4 item, `11` on life satisfaction, `0` on UCLA-3 or the direct loneliness question), a missing instrument, a missing or extra item. Expected: 400 `ASSESSMENT_ANSWERS_INVALID` and nothing stored. Pinned in Tasks 1, 4 and 6.
3. **Trend and support boundaries:** a change of exactly ±10 is `about_same`; ±11 changes the word. A score of exactly 25 shows the card, and so does a drop of exactly 30. Pinned in Task 3.
4. **The exact 14-day boundary, and a switch flipped twice:** due at 14 days, not due 1 ms short of it. A re-flip opens a new baseline; setting the value already set changes nothing. Pinned in Tasks 2 and 3.
5. **A missing settings row:** the result is legacy behaviour, never `wellbeing_v1`. Pinned in Task 2.

---

## File map

| File | Responsibility |
|---|---|
| `src/assessment/domain/instruments.ts` (+ spec) | Definitions for the 4 instruments, validation, scoring |
| `src/assessment/domain/result-rules.ts` (+ spec) | Trend words and the support-card rule |
| `src/assessment/domain/check-in-state.ts` (+ spec) | Due, baseline and consent rules |
| `src/assessment/domain/assessment.repository.interface.ts` | The repository port and its types |
| `src/assessment/infrastructure/assessment.repository.ts` (+ spec) | The Prisma implementation |
| `src/assessment/application/assessment.service.ts` (+ spec) | Use cases |
| `src/assessment/presentation/*.controller.ts`, `dto/*.ts` (+ http spec) | User and admin endpoints |
| `src/assessment/assessment.module.ts`, `src/app.module.ts` | Wiring |
| `prisma/schema.murror.prisma`, `prisma/migrations/20261004120000_add_assessments/migration.sql`, the manifest and the contract | Schema |
| `src/user-profile/application/services/account-deletion.registry.ts` (+ snapshot spec) | Deletion coverage |
| `src/user-profile/user-profile.service.ts` (2 sites), `.../use-cases/bootstrap-app.use-case.ts` (1 site), `dto/user-profile-response.dto.ts`, `user-profile.module.ts` | Switch-aware flags |
| `src/common/utils/sentry-scrub.util.spec.ts` | Proves scores are dropped |

---

### Task 1: Instrument definitions and scoring (pure domain)

**Files:**
- Create: `src/assessment/domain/instruments.ts`
- Test: `src/assessment/domain/instruments.spec.ts`

**Interfaces:**
- Produces:
  - `type Instrument = 'MURROR_WB' | 'ONS_LIFESAT' | 'UCLA3' | 'ONS_LONELY'`
  - `type InstrumentSet = 'phq9_gad7' | 'wellbeing_v1'`
  - `type InstrumentBand`
  - `PRIMARY_INSTRUMENT = 'MURROR_WB'`
  - `INSTRUMENT_ORDER: readonly Instrument[]`
  - `INSTRUMENTS: Record<Instrument, InstrumentDefinition>`
  - `validateAnswers(instrument, answers: unknown): Record<string, number>` (throws `InvalidAnswersError`)
  - `scoreInstrument(instrument, answers): InstrumentScore`

- [ ] **Step 1: Write the failing tests**

```ts
// src/assessment/domain/instruments.spec.ts
import {
  INSTRUMENT_ORDER,
  INSTRUMENTS,
  InvalidAnswersError,
  scoreInstrument,
  validateAnswers,
} from './instruments';

const mw = (v: number[]) => Object.fromEntries(v.map((n, i) => [`mw_${i + 1}`, n]));
const ucla3 = (v: number[]) => Object.fromEntries(v.map((n, i) => [`ucla3_${i + 1}`, n]));

describe('Murror wellbeing (MURROR_WB)', () => {
  it('scores all "completely true" as 100, ok, higher is better', () => {
    expect(scoreInstrument('MURROR_WB', mw([4, 4, 4, 4, 4, 4]))).toEqual({
      instrument: 'MURROR_WB',
      instrumentVersion: 'murror-wellbeing-v1',
      rawScore: 24,
      normalizedScore: 100,
      higherIsBetter: true,
      band: 'ok',
    });
  });

  it('a person answering "more true" scores HIGHER, never lower', () => {
    const worse = scoreInstrument('MURROR_WB', mw([1, 1, 1, 1, 1, 1]));
    const better = scoreInstrument('MURROR_WB', mw([3, 3, 3, 3, 3, 3]));
    expect(better.normalizedScore!).toBeGreaterThan(worse.normalizedScore!);
  });

  it('bands 25 as low and 29 as ok', () => {
    expect(scoreInstrument('MURROR_WB', mw([1, 1, 1, 1, 1, 1]))).toMatchObject({normalizedScore: 25, band: 'low'});
    expect(scoreInstrument('MURROR_WB', mw([2, 1, 1, 1, 1, 1]))).toMatchObject({normalizedScore: 29, band: 'ok'});
  });

  it('contains no WHO-5 wording in any item', () => {
    const text = INSTRUMENTS.MURROR_WB.items.map(i => i.text.toLowerCase()).join(' ');
    for (const word of ['cheerful', 'spirits', 'calm', 'relaxed', 'active', 'vigorous', 'fresh', 'rested', 'interest']) {
      expect(text).not.toContain(word);
    }
  });
});

describe('ONS life satisfaction (ONS_LIFESAT)', () => {
  it.each([
    [0, 'low'], [4, 'low'], [5, 'medium'], [6, 'medium'], [7, 'high'], [8, 'high'], [9, 'very_high'], [10, 'very_high'],
  ])('bands %i as %s, with no percentage', (v, band) => {
    expect(scoreInstrument('ONS_LIFESAT', {ons_lifesat_1: v})).toMatchObject({
      rawScore: v, normalizedScore: null, higherIsBetter: true, band,
    });
  });
});

describe('loneliness', () => {
  it('UCLA-3: higher is lonelier, 5 not_lonely, 6 lonely', () => {
    expect(scoreInstrument('UCLA3', ucla3([2, 2, 1]))).toMatchObject({rawScore: 5, band: 'not_lonely', higherIsBetter: false});
    expect(scoreInstrument('UCLA3', ucla3([2, 2, 2])).band).toBe('lonely');
  });

  it('ONS direct: only "often or always" (5) is often_lonely', () => {
    expect(scoreInstrument('ONS_LONELY', {ons_lonely_1: 4}).band).toBe('not_often_lonely');
    expect(scoreInstrument('ONS_LONELY', {ons_lonely_1: 5})).toMatchObject({band: 'often_lonely', higherIsBetter: false});
  });
});

describe('validateAnswers', () => {
  it.each([
    ['a string', {...mw([1, 1, 1, 1, 1, 1]), mw_1: '3'}],
    ['a decimal', {...mw([1, 1, 1, 1, 1, 1]), mw_2: 2.5}],
    ['above range', {...mw([1, 1, 1, 1, 1, 1]), mw_3: 5}],
    ['below range', {...mw([1, 1, 1, 1, 1, 1]), mw_3: -1}],
    ['a missing item', {mw_1: 1, mw_2: 1, mw_3: 1, mw_4: 1, mw_5: 1}],
    ['an extra item', {...mw([1, 1, 1, 1, 1, 1]), mw_7: 1}],
    ['an array', [1, 1, 1, 1, 1, 1]],
    ['null', null],
    ['undefined', undefined],
  ])('rejects MURROR_WB answers with %s', (_label, answers) => {
    expect(() => validateAnswers('MURROR_WB', answers)).toThrow(InvalidAnswersError);
  });

  it.each([
    ['UCLA3', ucla3([0, 1, 1])],
    ['ONS_LIFESAT', {ons_lifesat_1: 11}],
    ['ONS_LONELY', {ons_lonely_1: 0}],
  ] as const)('rejects out-of-range %s', (instrument, answers) => {
    expect(() => validateAnswers(instrument, answers)).toThrow(InvalidAnswersError);
  });

  it('accepts a complete, in-range set and returns it unchanged', () => {
    expect(validateAnswers('UCLA3', ucla3([1, 2, 3]))).toEqual(ucla3([1, 2, 3]));
  });
});

describe('definitions', () => {
  it('asks wellbeing, then life satisfaction, then UCLA-3, then the direct loneliness question', () => {
    expect(INSTRUMENT_ORDER).toEqual(['MURROR_WB', 'ONS_LIFESAT', 'UCLA3', 'ONS_LONELY']);
  });

  it('has the right item counts and option ranges', () => {
    expect(INSTRUMENTS.MURROR_WB.items).toHaveLength(6);
    expect(INSTRUMENTS.MURROR_WB.options.map(o => o.value)).toEqual([0, 1, 2, 3, 4]);
    expect(INSTRUMENTS.ONS_LIFESAT.options.map(o => o.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(INSTRUMENTS.UCLA3.options.map(o => o.value)).toEqual([1, 2, 3]);
    expect(INSTRUMENTS.ONS_LONELY.options.map(o => o.value)).toEqual([1, 2, 3, 4, 5]);
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
export type Instrument = 'MURROR_WB' | 'ONS_LIFESAT' | 'UCLA3' | 'ONS_LONELY';
export type InstrumentSet = 'phq9_gad7' | 'wellbeing_v1';
export type InstrumentBand =
  | 'low'
  | 'ok'
  | 'medium'
  | 'high'
  | 'very_high'
  | 'lonely'
  | 'not_lonely'
  | 'often_lonely'
  | 'not_often_lonely';

export interface InstrumentDefinition {
  instrument: Instrument;
  version: string;
  /** Shown above the items. Empty when each item is a full question. */
  stem: string;
  items: readonly {key: string; text: string}[];
  options: readonly {value: number; label: string}[];
  higherIsBetter: boolean;
}

export interface InstrumentScore {
  instrument: Instrument;
  instrumentVersion: string;
  rawScore: number;
  /** 0-100 for MURROR_WB only. Null for every other instrument. */
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

export const PRIMARY_INSTRUMENT: Instrument = 'MURROR_WB';

// Wellbeing first, loneliness last so it does not colour the wellbeing answers;
// UCLA-3 before the direct question so the word "lonely" is not primed.
export const INSTRUMENT_ORDER: readonly Instrument[] = ['MURROR_WB', 'ONS_LIFESAT', 'UCLA3', 'ONS_LONELY'];

const zeroToTen = Array.from({length: 11}, (_, v) => ({
  value: v,
  label: v === 0 ? 'Not at all' : v === 10 ? 'Completely' : String(v),
}));

// Wording is fixed for the study (spec section 5). MURROR_WB is Murror's own
// original questionnaire; it must never be reworded towards WHO-5 or WEMWBS.
export const INSTRUMENTS: Record<Instrument, InstrumentDefinition> = {
  MURROR_WB: {
    instrument: 'MURROR_WB',
    version: 'murror-wellbeing-v1',
    stem: 'Thinking about the past 14 days, how true has each of these been for you?',
    items: [
      {key: 'mw_1', text: 'When I felt something strongly, I could put it into words.'},
      {key: 'mw_2', text: 'When something upset me, I found my way back to feeling okay.'},
      {key: 'mw_3', text: 'The good moments outweighed the hard ones.'},
      {key: 'mw_4', text: 'When things went wrong, I spoke to myself the way I would to a friend.'},
      {key: 'mw_5', text: 'I told someone in my life how I was really doing.'},
      {key: 'mw_6', text: 'When something weighed on me, I could work through it myself or with people I know.'},
    ],
    options: [
      {value: 0, label: 'Not at all true'},
      {value: 1, label: 'Slightly true'},
      {value: 2, label: 'Somewhat true'},
      {value: 3, label: 'Mostly true'},
      {value: 4, label: 'Completely true'},
    ],
    higherIsBetter: true,
  },
  ONS_LIFESAT: {
    instrument: 'ONS_LIFESAT',
    version: 'ons4-life-satisfaction',
    stem: '',
    items: [{key: 'ons_lifesat_1', text: 'Overall, how satisfied are you with your life nowadays?'}],
    options: zeroToTen,
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
      {value: 1, label: 'Hardly ever or never'},
      {value: 2, label: 'Some of the time'},
      {value: 3, label: 'Often'},
    ],
    higherIsBetter: false,
  },
  ONS_LONELY: {
    instrument: 'ONS_LONELY',
    version: 'ons-loneliness-direct-2018',
    stem: '',
    items: [{key: 'ons_lonely_1', text: 'How often do you feel lonely?'}],
    options: [
      {value: 1, label: 'Never'},
      {value: 2, label: 'Hardly ever'},
      {value: 3, label: 'Occasionally'},
      {value: 4, label: 'Some of the time'},
      {value: 5, label: 'Often or always'},
    ],
    higherIsBetter: false,
  },
};

export function validateAnswers(instrument: Instrument, answers: unknown): Record<string, number> {
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
  const values = def.options.map(o => o.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  for (const key of expected) {
    const v = record[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
      throw new InvalidAnswersError(instrument, `${key} out of range`);
    }
  }
  return record as Record<string, number>;
}

export function scoreInstrument(instrument: Instrument, answers: Record<string, number>): InstrumentScore {
  const def = INSTRUMENTS[instrument];
  const rawScore = def.items.reduce((sum, item) => sum + answers[item.key], 0);
  const base = {instrument, instrumentVersion: def.version, rawScore, higherIsBetter: def.higherIsBetter};
  switch (instrument) {
    case 'MURROR_WB': {
      const normalizedScore = Math.round((rawScore / 24) * 100);
      return {...base, normalizedScore, band: normalizedScore <= 25 ? 'low' : 'ok'};
    }
    case 'ONS_LIFESAT':
      return {
        ...base,
        normalizedScore: null,
        band: rawScore <= 4 ? 'low' : rawScore <= 6 ? 'medium' : rawScore <= 8 ? 'high' : 'very_high',
      };
    case 'UCLA3':
      return {...base, normalizedScore: null, band: rawScore >= 6 ? 'lonely' : 'not_lonely'};
    case 'ONS_LONELY':
      return {...base, normalizedScore: null, band: rawScore === 5 ? 'often_lonely' : 'not_often_lonely'};
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/assessment/domain/instruments.spec.ts`
Expected: PASS.

- [ ] **Step 5: Mutate the behaviour and prove a named test dies**

Change the `MURROR_WB` line to `const normalizedScore = 100 - Math.round((rawScore / 24) * 100);`. Expected: "a person answering \"more true\" scores HIGHER, never lower" FAILS. Restore and re-run (PASS).

- [ ] **Step 6: Commit** (Claude, after review)

```bash
git add src/assessment/domain/instruments.ts src/assessment/domain/instruments.spec.ts
git commit -m "feat(assessment): wellbeing, life satisfaction and loneliness scoring"
```

---

### Task 2: Schema, migration, settings repository, deletion registry

**Files:**
- Modify: `prisma/schema.murror.prisma`, `scripts/release/production-migration-set.json`, `test/production-non-galaxy-migrations.contract.sh`
- Modify: `src/user-profile/application/services/account-deletion.registry.ts`, `account-deletion.registry-snapshot.spec.ts`
- Create: `prisma/migrations/20261004120000_add_assessments/migration.sql`
- Create: `src/assessment/domain/assessment.repository.interface.ts`, `src/assessment/infrastructure/assessment.repository.ts`
- Test: `src/assessment/infrastructure/assessment.repository.spec.ts`

**Interfaces:**
- Consumes: `Instrument`, `InstrumentSet`, `InstrumentBand` (Task 1).
- Produces:
  - the `ASSESSMENT_REPOSITORY` token and the `AssessmentRepository` port, with the methods below;
  - `AssessmentSettings`, `LEGACY_SETTINGS`, `NewResponse`, `StoredResponse`, `ConsentRecord`, `ConsentStatus`;
  - `PrismaAssessmentRepository`.
- `AssessmentRepository` methods:
  - `getSettings()`
  - `setActiveInstrumentSet(set, now)`
  - `lastResponseAt(userId, instrument)`
  - `findCheckIn(userId, checkInId)`
  - `createCheckIn(userId, checkInId, rows)`, returning `'created' | 'duplicate'`
  - `latestBefore(userId, instrument, checkInId)`
  - `listResponses(userId)`
  - `getConsent(userId, studyKey)`
  - `saveConsent(record)`
  - `listConsentedResponses(studyKey)`

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
  it('a missing settings row means legacy, never wellbeing_v1', async () => {
    await expect(new PrismaAssessmentRepository(prismaWith(null)).getSettings()).resolves.toEqual(LEGACY_SETTINGS);
  });

  it('maps the DB enum to the wire value', async () => {
    const at = new Date('2026-11-01T00:00:00Z');
    const repo = new PrismaAssessmentRepository(prismaWith({id: 1, activeInstrumentSet: 'WELLBEING_V1', switchedAt: at}));
    await expect(repo.getSettings()).resolves.toEqual({activeInstrumentSet: 'wellbeing_v1', switchedAt: at});
  });

  it('a database error propagates instead of falling back', async () => {
    const prisma = prismaWith(null);
    prisma.assessmentSettings.findUnique.mockRejectedValue(new Error('db down'));
    await expect(new PrismaAssessmentRepository(prisma).getSettings()).rejects.toThrow('db down');
  });

  it('flipping to wellbeing_v1 from phq9_gad7 stamps switchedAt with now', async () => {
    const now = new Date('2026-11-01T09:00:00Z');
    const prisma = prismaWith({id: 1, activeInstrumentSet: 'PHQ9_GAD7', switchedAt: null});
    await expect(new PrismaAssessmentRepository(prisma).setActiveInstrumentSet('wellbeing_v1', now)).resolves.toEqual({
      activeInstrumentSet: 'wellbeing_v1',
      switchedAt: now,
    });
  });

  it('setting the value already set changes nothing, keeping the old switchedAt', async () => {
    const first = new Date('2026-11-01T09:00:00Z');
    const prisma = prismaWith({id: 1, activeInstrumentSet: 'WELLBEING_V1', switchedAt: first});
    const result = await new PrismaAssessmentRepository(prisma).setActiveInstrumentSet('wellbeing_v1', new Date('2026-12-01T09:00:00Z'));
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
  MURROR_WB
  ONS_LIFESAT
  UCLA3
  ONS_LONELY
}

enum AssessmentInstrumentSet {
  PHQ9_GAD7
  WELLBEING_V1
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
  /// When the set last changed TO WELLBEING_V1. Opens a new baseline for everyone.
  switchedAt          DateTime?               @map("switched_at") @db.Timestamptz(6)
  updatedAt           DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("assessment_settings")
}

/// One row per instrument per check-in. Sensitive: never logged, never sent to analytics.
model AssessmentResponse {
  id                String               @id @default(uuid())
  userId            String               @map("user_id")
  /// Client-generated uuid shared by every row of one sitting.
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
-- Wellbeing check-in (spec: Murror-docs docs/plans/2026-10-04-wellbeing-check-in-design.md).
--
-- Additive only: three enum types, three new tables, one seed row. No change to
-- any existing table. The seed row is PHQ9_GAD7, so deploying this changes no
-- behaviour until an admin flips the switch.
--
-- PROD: the Singapore-to-US sync uses a fixed table list (publication
-- murror_move). Tell the DB Migration session the moment this reaches prod.
--
-- Enum values are UPPERCASE with no @map, like AiProcessingChoice.
-- Apply BEFORE deploying the API that reads these tables.

SET lock_timeout = '5s';

CREATE TYPE "murror_api"."AssessmentInstrument" AS ENUM ('MURROR_WB', 'ONS_LIFESAT', 'UCLA3', 'ONS_LONELY');
CREATE TYPE "murror_api"."AssessmentInstrumentSet" AS ENUM ('PHQ9_GAD7', 'WELLBEING_V1');
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

- [ ] **Step 5: Declare the migration in the other two files, then run every contract**

Add `"20261004120000_add_assessments"`:
- to `includePending` in `scripts/release/production-migration-set.json`;
- to `expectedIncluded` in `test/production-non-galaxy-migrations.contract.sh`.

Run: `for c in test/*.contract.sh; do echo "== $c"; bash "$c" || break; done`
Expected: every contract exits 0. If a privacy contract names something a user-bearing table must declare, satisfy it in Step 7 and re-run.

- [ ] **Step 6: Write the repository port and its implementation**

```ts
// src/assessment/domain/assessment.repository.interface.ts
import type {Instrument, InstrumentBand, InstrumentSet} from './instruments';

export const ASSESSMENT_REPOSITORY = Symbol('ASSESSMENT_REPOSITORY');

export interface AssessmentSettings {
  activeInstrumentSet: InstrumentSet;
  switchedAt: Date | null;
}

export const LEGACY_SETTINGS: AssessmentSettings = {activeInstrumentSet: 'phq9_gad7', switchedAt: null};

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
  createCheckIn(userId: string, checkInId: string, rows: NewResponse[]): Promise<'created' | 'duplicate'>;
  latestBefore(userId: string, instrument: Instrument, checkInId: string): Promise<StoredResponse | null>;
  listResponses(userId: string): Promise<StoredResponse[]>;
  getConsent(userId: string, studyKey: string): Promise<ConsentRecord | null>;
  saveConsent(record: ConsentRecord): Promise<void>;
  listConsentedResponses(studyKey: string): Promise<Array<StoredResponse & {consent: ConsentRecord}>>;
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

const SET_TO_DB = {phq9_gad7: 'PHQ9_GAD7', wellbeing_v1: 'WELLBEING_V1'} as const;
const SET_FROM_DB: Record<string, InstrumentSet> = {PHQ9_GAD7: 'phq9_gad7', WELLBEING_V1: 'wellbeing_v1'};
const STATUS_TO_DB = {consented: 'CONSENTED', declined: 'DECLINED', withdrawn: 'WITHDRAWN'} as const;
const STATUS_FROM_DB = {CONSENTED: 'consented', DECLINED: 'declined', WITHDRAWN: 'withdrawn'} as const;

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
    return {activeInstrumentSet: SET_FROM_DB[row.activeInstrumentSet], switchedAt: row.switchedAt};
  }

  async setActiveInstrumentSet(set: InstrumentSet, now: Date): Promise<AssessmentSettings> {
    const current = await this.getSettings();
    if (current.activeInstrumentSet === set) return current;
    const switchedAt = set === 'wellbeing_v1' ? now : current.switchedAt;
    const row = await this.prisma.assessmentSettings.upsert({
      where: {id: 1},
      create: {id: 1, activeInstrumentSet: SET_TO_DB[set], switchedAt},
      update: {activeInstrumentSet: SET_TO_DB[set], switchedAt},
    });
    return {activeInstrumentSet: SET_FROM_DB[row.activeInstrumentSet], switchedAt: row.switchedAt};
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
    return (await this.prisma.assessmentResponse.findMany({where: {userId, checkInId}})).map(toStored);
  }

  async createCheckIn(userId: string, checkInId: string, rows: NewResponse[]) {
    try {
      // One statement, so a check-in is never half stored.
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
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return 'duplicate' as const;
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
    return (
      await this.prisma.assessmentResponse.findMany({where: {userId}, orderBy: {createdAt: 'asc'}})
    ).map(toStored);
  }

  async getConsent(userId: string, studyKey: string) {
    const row = await this.prisma.researchConsent.findUnique({where: {userId_studyKey: {userId, studyKey}}});
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

In `account-deletion.registry-snapshot.spec.ts`:
- add `'murror_api.assessment_responses'` and `'murror_api.research_consents'` to `EXPECTED_REGISTRY_TABLES`, in sorted position;
- change `EXPECTED_REGISTRY_TABLE_COUNT` from `142` to `144`.

`assessment_settings` has no user column and is not registered.

- [ ] **Step 8: Generate the client and run the tests**

Run: `pnpm db:generate && pnpm test src/assessment src/user-profile/application/services/account-deletion`
Expected: PASS. That includes `account-deletion.schema-drift.spec.ts`.

- [ ] **Step 9: Commit** (Claude, after review)

```bash
git add prisma/schema.murror.prisma prisma/migrations/20261004120000_add_assessments \
  scripts/release/production-migration-set.json test/production-non-galaxy-migrations.contract.sh \
  src/assessment/domain/assessment.repository.interface.ts src/assessment/infrastructure \
  src/user-profile/application/services/account-deletion.registry.ts \
  src/user-profile/application/services/account-deletion.registry-snapshot.spec.ts
git commit -m "feat(assessment): tables, switch row and repository"
```

---

### Task 3: Pure rules: trend words, support card, check-in state

**Files:**
- Create: `src/assessment/domain/result-rules.ts`, `src/assessment/domain/check-in-state.ts`
- Test: `src/assessment/domain/result-rules.spec.ts`, `src/assessment/domain/check-in-state.spec.ts`

**Interfaces:**
- Consumes: `AssessmentSettings` (Task 2), `InstrumentSet` (Task 1).
- Produces:
  - `type Trend = 'first' | 'lighter' | 'about_same' | 'heavier'`
  - `trendFor(current: number, previous: number | null): Trend`
  - `showSupportCardFor(current: number, previous: number | null): boolean`
  - the constants `TREND_THRESHOLD = 10`, `SUPPORT_SCORE_MAX = 25` and `SUPPORT_DROP = 30`
  - `CHECK_IN_INTERVAL_MS`
  - `computeCheckInState(input: CheckInStateInput): CheckInState`, with:
    - `CheckInStateInput = {settings, legacyDue, lastPrimaryAt: Date | null, hasConsentDecision, now}`
    - `CheckInState = {instrumentSet, due, isBaseline, consentNeeded}`

- [ ] **Step 1: Write the failing tests**

```ts
// src/assessment/domain/result-rules.spec.ts
import {showSupportCardFor, trendFor} from './result-rules';

describe('trendFor', () => {
  it('is first when there is no previous check-in', () => expect(trendFor(60, null)).toBe('first'));
  it('treats a change of exactly 10 either way as about_same', () => {
    expect(trendFor(70, 60)).toBe('about_same');
    expect(trendFor(50, 60)).toBe('about_same');
  });
  it('11 up is lighter, 11 down is heavier', () => {
    expect(trendFor(71, 60)).toBe('lighter');
    expect(trendFor(49, 60)).toBe('heavier');
  });
});

describe('showSupportCardFor', () => {
  it('shows at a score of exactly 25, not at 26 (first check-in)', () => {
    expect(showSupportCardFor(25, null)).toBe(true);
    expect(showSupportCardFor(26, null)).toBe(false);
  });
  it('shows on a drop of exactly 30 even when the score is not low', () => {
    expect(showSupportCardFor(50, 80)).toBe(true);
    expect(showSupportCardFor(51, 80)).toBe(false);
  });
  it('does not show on a rise', () => expect(showSupportCardFor(90, 40)).toBe(false));
});
```

```ts
// src/assessment/domain/check-in-state.spec.ts
import {CHECK_IN_INTERVAL_MS, computeCheckInState} from './check-in-state';

const SWITCH = new Date('2026-11-01T09:00:00Z');
const on = {activeInstrumentSet: 'wellbeing_v1' as const, switchedAt: SWITCH};
const off = {activeInstrumentSet: 'phq9_gad7' as const, switchedAt: null};
const base = {legacyDue: false, hasConsentDecision: true};

describe('computeCheckInState', () => {
  it('switch off: mirrors the legacy rule and never asks for consent', () => {
    expect(
      computeCheckInState({...base, settings: off, legacyDue: true, lastPrimaryAt: null, hasConsentDecision: false, now: SWITCH}),
    ).toEqual({instrumentSet: 'phq9_gad7', due: true, isBaseline: false, consentNeeded: false});
  });

  it('switch day: someone who did PHQ/GAD yesterday is due a baseline now', () => {
    expect(computeCheckInState({...base, settings: on, lastPrimaryAt: null, now: SWITCH})).toMatchObject({due: true, isBaseline: true});
  });

  it('a check-in from BEFORE the latest switch does not count as this baseline', () => {
    const before = new Date(SWITCH.getTime() - 1000);
    expect(computeCheckInState({...base, settings: on, lastPrimaryAt: before, now: SWITCH})).toMatchObject({due: true, isBaseline: true});
  });

  it('after the baseline: not due one millisecond short of 14 days', () => {
    const last = new Date('2026-11-02T10:00:00Z');
    const now = new Date(last.getTime() + CHECK_IN_INTERVAL_MS - 1);
    expect(computeCheckInState({...base, settings: on, lastPrimaryAt: last, now})).toMatchObject({due: false, isBaseline: false});
  });

  it('after the baseline: due at exactly 14 days', () => {
    const last = new Date('2026-11-02T10:00:00Z');
    const now = new Date(last.getTime() + CHECK_IN_INTERVAL_MS);
    expect(computeCheckInState({...base, settings: on, lastPrimaryAt: last, now})).toMatchObject({due: true, isBaseline: false});
  });

  it('walks the study: due at days 0, 14, 28, 42 and 56, not the day after each', () => {
    let last: Date | null = null;
    for (const day of [0, 14, 28, 42, 56]) {
      const now = new Date(SWITCH.getTime() + day * 86_400_000);
      expect(computeCheckInState({...base, settings: on, lastPrimaryAt: last, now}).due).toBe(true);
      last = now;
      const nextDay = new Date(now.getTime() + 86_400_000);
      expect(computeCheckInState({...base, settings: on, lastPrimaryAt: last, now: nextDay}).due).toBe(false);
    }
  });

  it('asks for consent only while no decision is recorded', () => {
    expect(computeCheckInState({...base, settings: on, lastPrimaryAt: null, hasConsentDecision: false, now: SWITCH}).consentNeeded).toBe(true);
    expect(computeCheckInState({...base, settings: on, lastPrimaryAt: null, hasConsentDecision: true, now: SWITCH}).consentNeeded).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/assessment/domain/result-rules.spec.ts src/assessment/domain/check-in-state.spec.ts`
Expected: FAIL, the modules are not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/assessment/domain/result-rules.ts
// Product rules, not clinical thresholds (spec section 5.1). TREND_THRESHOLD
// is a placeholder until day-14 data gives the smallest detectable change.
export type Trend = 'first' | 'lighter' | 'about_same' | 'heavier';

export const TREND_THRESHOLD = 10;
export const SUPPORT_SCORE_MAX = 25;
export const SUPPORT_DROP = 30;

export function trendFor(current: number, previous: number | null): Trend {
  if (previous === null) return 'first';
  const change = current - previous;
  if (change > TREND_THRESHOLD) return 'lighter';
  if (change < -TREND_THRESHOLD) return 'heavier';
  return 'about_same';
}

export function showSupportCardFor(current: number, previous: number | null): boolean {
  if (current <= SUPPORT_SCORE_MAX) return true;
  return previous !== null && previous - current >= SUPPORT_DROP;
}
```

```ts
// src/assessment/domain/check-in-state.ts
import type {AssessmentSettings} from './assessment.repository.interface';
import type {InstrumentSet} from './instruments';

/** The questionnaire asks about the past 14 days, so asking more often is not valid. */
export const CHECK_IN_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;

export interface CheckInStateInput {
  settings: AssessmentSettings;
  /** The existing PHQ/GAD rule, computed exactly as today by the caller. */
  legacyDue: boolean;
  lastPrimaryAt: Date | null;
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
  const {settings, legacyDue, lastPrimaryAt, hasConsentDecision, now} = input;
  if (settings.activeInstrumentSet === 'phq9_gad7') {
    return {instrumentSet: 'phq9_gad7', due: legacyDue, isBaseline: false, consentNeeded: false};
  }
  const switchedAt = settings.switchedAt ?? new Date(0);
  const baselineDone = lastPrimaryAt !== null && lastPrimaryAt >= switchedAt;
  const due = !baselineDone || now.getTime() - lastPrimaryAt!.getTime() >= CHECK_IN_INTERVAL_MS;
  return {instrumentSet: 'wellbeing_v1', due, isBaseline: !baselineDone, consentNeeded: !hasConsentDecision};
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the same command. Expected: PASS.

- [ ] **Step 5: Mutate the behaviour**

Apply each change, run the specs, then restore the file:

| Change | Test that must fail |
|---|---|
| `change > TREND_THRESHOLD` → `change >= TREND_THRESHOLD` | "treats a change of exactly 10 either way as about_same" |
| `lastPrimaryAt >= switchedAt` → `lastPrimaryAt !== null` | "a check-in from BEFORE the latest switch does not count as this baseline" |
| `>= CHECK_IN_INTERVAL_MS` → `> CHECK_IN_INTERVAL_MS` | "due at exactly 14 days" |

- [ ] **Step 6: Commit** (Claude, after review)

```bash
git add src/assessment/domain/result-rules.ts src/assessment/domain/result-rules.spec.ts \
  src/assessment/domain/check-in-state.ts src/assessment/domain/check-in-state.spec.ts
git commit -m "feat(assessment): trend, support card and due rules"
```

---

### Task 4: Assessment service (use cases)

**Files:**
- Create: `src/assessment/application/assessment.service.ts`
- Test: `src/assessment/application/assessment.service.spec.ts`

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces `AssessmentService`:
  - `getSettings()`
  - `setActiveInstrumentSet(set)`
  - `getCheckInState(userId, legacyDue): Promise<CheckInState>`
  - `getQuestions(): Promise<QuestionsView>`
  - `submitCheckIn(userId, checkInId, answers: unknown): Promise<CheckInResult>`
  - `getHistory(userId): Promise<HistoryView>`
  - `recordConsent(userId, decision, ageConfirmed18)`
  - `withdrawConsent(userId)`
  - `exportStudy(salt): Promise<ExportRow[]>`
- Also produces:
  - `CheckInResult = {checkInId, trend: Trend, showSupportCard: boolean}`, which carries no scores;
  - `CheckInClosedError`, plus a re-export of `InvalidAnswersError`;
  - `STUDY_KEY = 'murror-wellbeing-2026'` and `CONSENT_VERSION = 'v1'`.

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
  settings: AssessmentSettings = {activeInstrumentSet: 'wellbeing_v1', switchedAt: new Date(Date.now() - 60_000)};
  rows: StoredResponse[] = [];
  consents = new Map<string, ConsentRecord>();
  async getSettings() { return this.settings; }
  async setActiveInstrumentSet(set: any, now: Date) {
    if (this.settings.activeInstrumentSet !== set) {
      this.settings = {activeInstrumentSet: set, switchedAt: set === 'wellbeing_v1' ? now : this.settings.switchedAt};
    }
    return this.settings;
  }
  async lastResponseAt(userId: string, instrument: string) {
    return this.rows.filter(x => x.userId === userId && x.instrument === instrument).at(-1)?.createdAt ?? null;
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

const mw = (n: number) => ({mw_1: n, mw_2: n, mw_3: n, mw_4: n, mw_5: n, mw_6: n});
const answers = (n = 2) => ({
  MURROR_WB: mw(n),
  ONS_LIFESAT: {ons_lifesat_1: 7},
  UCLA3: {ucla3_1: 2, ucla3_2: 1, ucla3_3: 1},
  ONS_LONELY: {ons_lonely_1: 2},
});
const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';

describe('AssessmentService.submitCheckIn', () => {
  it('stores one row per instrument and returns trend words, never scores', async () => {
    const repo = new MemoryRepo();
    const result = await new AssessmentService(repo).submitCheckIn('u1', ID1, answers());
    expect(repo.rows.map(r => r.instrument)).toEqual(['MURROR_WB', 'ONS_LIFESAT', 'UCLA3', 'ONS_LONELY']);
    expect(result).toEqual({checkInId: ID1, trend: 'first', showSupportCard: false});
  });

  it('a double-submit with the same checkInId stores once and returns the same result', async () => {
    const repo = new MemoryRepo();
    const svc = new AssessmentService(repo);
    const first = await svc.submitCheckIn('u1', ID1, answers());
    const second = await svc.submitCheckIn('u1', ID1, answers());
    expect(repo.rows).toHaveLength(4);
    expect(second).toEqual(first);
  });

  it('says lighter when the wellbeing score rose by more than 10', async () => {
    const svc = new AssessmentService(new MemoryRepo());
    await svc.submitCheckIn('u1', ID1, answers(2)); // 50
    expect((await svc.submitCheckIn('u1', ID2, answers(3))).trend).toBe('lighter'); // 75
  });

  it('shows the support card for a low wellbeing score', async () => {
    const result = await new AssessmentService(new MemoryRepo()).submitCheckIn('u1', ID1, answers(1)); // 25
    expect(result.showSupportCard).toBe(true);
  });

  it('rejects a check-in missing an instrument and stores nothing', async () => {
    const repo = new MemoryRepo();
    const {ONS_LONELY: _dropped, ...partial} = answers();
    await expect(new AssessmentService(repo).submitCheckIn('u1', ID1, partial)).rejects.toThrow(InvalidAnswersError);
    expect(repo.rows).toHaveLength(0);
  });

  it('rejects any check-in while the switch is phq9_gad7', async () => {
    const repo = new MemoryRepo();
    repo.settings = {activeInstrumentSet: 'phq9_gad7', switchedAt: null};
    await expect(new AssessmentService(repo).submitCheckIn('u1', ID1, answers())).rejects.toThrow(CheckInClosedError);
  });
});

describe('AssessmentService consent and export', () => {
  it('withdrawal removes the person from every later export but keeps their history', async () => {
    const svc = new AssessmentService(new MemoryRepo());
    await svc.recordConsent('u1', 'consented', true);
    await svc.submitCheckIn('u1', ID1, answers());
    expect(await svc.exportStudy('salt')).toHaveLength(4);
    await svc.withdrawConsent('u1');
    expect(await svc.exportStudy('salt')).toHaveLength(0);
    expect((await svc.getHistory('u1')).wellbeing.points).toHaveLength(1);
  });

  it('a decline or a missing 18+ confirmation never reaches the export', async () => {
    const svc = new AssessmentService(new MemoryRepo());
    await svc.recordConsent('u1', 'consented', false);
    await svc.submitCheckIn('u1', ID1, answers());
    expect(await svc.exportStudy('salt')).toHaveLength(0);
  });

  it('exports a stable pseudonymous study id, never the user id', async () => {
    const svc = new AssessmentService(new MemoryRepo());
    await svc.recordConsent('u1', 'consented', true);
    await svc.submitCheckIn('u1', ID1, answers());
    const rows = await svc.exportStudy('salt');
    expect(JSON.stringify(rows)).not.toContain('u1');
    expect(new Set(rows.map(r => r.studyId)).size).toBe(1);
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
  Instrument,
  INSTRUMENT_ORDER,
  INSTRUMENTS,
  InstrumentSet,
  InvalidAnswersError,
  PRIMARY_INSTRUMENT,
  scoreInstrument,
  validateAnswers,
} from '../domain/instruments';
import {showSupportCardFor, Trend, trendFor} from '../domain/result-rules';

export {InvalidAnswersError};

export const STUDY_KEY = 'murror-wellbeing-2026';
export const CONSENT_VERSION = 'v1';
const DAY_MS = 86_400_000;
const MAIN_COHORT_WINDOW_MS = 14 * DAY_MS;

export class CheckInClosedError extends Error {
  constructor() {
    super('The wellbeing check-in is not active');
    this.name = 'CheckInClosedError';
  }
}

/** What the person sees. No scores, by design (spec section 2). */
export interface CheckInResult {
  checkInId: string;
  trend: Trend;
  showSupportCard: boolean;
}

export interface QuestionsView {
  instruments: Array<{
    instrument: Instrument;
    version: string;
    stem: string;
    items: readonly {key: string; text: string}[];
    options: readonly {value: number; label: string}[];
  }>;
}

export interface HistoryView {
  wellbeing: {
    higherIsBetter: true;
    min: 0;
    max: 100;
    points: Array<{checkInId: string; at: Date; score: number; band: string}>;
  };
}

export interface ExportRow {
  studyKey: string;
  studyId: string;
  cohort: 'main' | 'rolling';
  consentedOn: string;
  checkInId: string;
  instrument: Instrument;
  instrumentVersion: string;
  itemAnswers: Record<string, number>;
  rawScore: number;
  normalizedScore: number | null;
  band: string;
  dayFromBaseline: number;
}

@Injectable()
export class AssessmentService {
  constructor(@Inject(ASSESSMENT_REPOSITORY) private readonly repo: AssessmentRepository) {}

  getSettings(): Promise<AssessmentSettings> {
    return this.repo.getSettings();
  }

  setActiveInstrumentSet(set: InstrumentSet): Promise<AssessmentSettings> {
    return this.repo.setActiveInstrumentSet(set, new Date());
  }

  async getCheckInState(userId: string, legacyDue: boolean): Promise<CheckInState> {
    const settings = await this.repo.getSettings();
    if (settings.activeInstrumentSet === 'phq9_gad7') {
      return computeCheckInState({settings, legacyDue, lastPrimaryAt: null, hasConsentDecision: true, now: new Date()});
    }
    const [lastPrimaryAt, consent] = await Promise.all([
      this.repo.lastResponseAt(userId, PRIMARY_INSTRUMENT),
      this.repo.getConsent(userId, STUDY_KEY),
    ]);
    return computeCheckInState({settings, legacyDue, lastPrimaryAt, hasConsentDecision: consent !== null, now: new Date()});
  }

  async getQuestions(): Promise<QuestionsView> {
    await this.assertOpen();
    return {
      instruments: INSTRUMENT_ORDER.map(i => {
        const d = INSTRUMENTS[i];
        return {instrument: i, version: d.version, stem: d.stem, items: d.items, options: d.options};
      }),
    };
  }

  async submitCheckIn(userId: string, checkInId: string, answers: unknown): Promise<CheckInResult> {
    await this.assertOpen();
    const existing = await this.repo.findCheckIn(userId, checkInId);
    if (existing.length > 0) return this.resultFrom(userId, checkInId, existing);

    if (answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new InvalidAnswersError(PRIMARY_INSTRUMENT, 'answers must be an object');
    }
    const byInstrument = answers as Record<string, unknown>;
    // Validate every instrument before writing anything: a check-in is all or nothing.
    const scored = INSTRUMENT_ORDER.map(i => {
      const valid = validateAnswers(i, byInstrument[i]);
      return {itemAnswers: valid, ...scoreInstrument(i, valid)};
    });

    // 'duplicate' means a concurrent retry won the race; either way the stored
    // rows are the truth, so both callers get the same result.
    await this.repo.createCheckIn(userId, checkInId, scored);
    const stored = await this.repo.findCheckIn(userId, checkInId);
    if (stored.length !== INSTRUMENT_ORDER.length) throw new Error('Check-in was not stored');
    return this.resultFrom(userId, checkInId, stored);
  }

  private async assertOpen() {
    if ((await this.repo.getSettings()).activeInstrumentSet !== 'wellbeing_v1') throw new CheckInClosedError();
  }

  private async resultFrom(userId: string, checkInId: string, rows: StoredResponse[]): Promise<CheckInResult> {
    const primary = rows.find(r => r.instrument === PRIMARY_INSTRUMENT)!;
    const prev = await this.repo.latestBefore(userId, PRIMARY_INSTRUMENT, checkInId);
    // <= not <: two fast check-ins can share a millisecond in tests.
    const previous = prev && prev.createdAt <= primary.createdAt ? prev.normalizedScore : null;
    return {
      checkInId,
      trend: trendFor(primary.normalizedScore!, previous),
      showSupportCard: showSupportCardFor(primary.normalizedScore!, previous),
    };
  }

  async getHistory(userId: string): Promise<HistoryView> {
    const rows = await this.repo.listResponses(userId);
    return {
      wellbeing: {
        higherIsBetter: true,
        min: 0,
        max: 100,
        points: rows
          .filter(r => r.instrument === PRIMARY_INSTRUMENT)
          .map(r => ({checkInId: r.checkInId, at: r.createdAt, score: r.normalizedScore!, band: r.band})),
      },
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
    const switchedAt = (await this.repo.getSettings()).switchedAt ?? new Date(0);
    const rows = await this.repo.listConsentedResponses(STUDY_KEY);
    const baselineByUser = new Map<string, Date>();
    for (const r of rows) {
      if (r.createdAt >= switchedAt && !baselineByUser.has(r.userId)) baselineByUser.set(r.userId, r.createdAt);
    }
    return rows
      .filter(r => baselineByUser.has(r.userId))
      .map(r => ({
        studyKey: STUDY_KEY,
        studyId: createHmac('sha256', salt).update(r.userId).digest('hex').slice(0, 16),
        cohort: r.consent.decidedAt.getTime() - switchedAt.getTime() <= MAIN_COHORT_WINDOW_MS ? 'main' : 'rolling',
        consentedOn: r.consent.decidedAt.toISOString().slice(0, 10),
        checkInId: r.checkInId,
        instrument: r.instrument,
        instrumentVersion: r.instrumentVersion,
        itemAnswers: r.itemAnswers,
        rawScore: r.rawScore,
        normalizedScore: r.normalizedScore,
        band: r.band,
        dayFromBaseline: Math.floor((r.createdAt.getTime() - baselineByUser.get(r.userId)!.getTime()) / DAY_MS),
      }));
  }
}
```

The export includes `itemAnswers` because the validation analyses in spec section 10 (omega, the factor model, per-item change) need item-level data. `checkInId` is a random uuid and identifies no one.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/assessment/application/assessment.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit** (Claude, after review)

```bash
git add src/assessment/application
git commit -m "feat(assessment): check-in, history, consent and export use cases"
```

---

### Task 5: Make the three existing check-in-due sites switch-aware

There are exactly three sibling sites today. Confirm the count first with `grep -rn "user_checkin_reports" src --include='*.ts' | grep -v spec`. The three are:
- `getUserProfile` in `user-profile.service.ts`, around line 198;
- the raw-SQL method in the same file, around lines 341-409;
- `checkReportSubmitted` in `bootstrap-app.use-case.ts`, around line 54.

Read any other non-spec hit. Either add it to this task, or note in the PR why it is not a due-site.

**Files:**
- Modify: `src/user-profile/user-profile.service.ts`, `src/user-profile/application/use-cases/bootstrap-app.use-case.ts`, `src/user-profile/dto/user-profile-response.dto.ts`, `src/user-profile/user-profile.module.ts` (import `AssessmentModule`; Task 6 creates it, so do Task 6 Step 3's module file first if running out of order)
- Test: `src/user-profile/user-profile.service.assessment-switch.spec.ts`, `src/user-profile/application/use-cases/bootstrap-app.assessment-switch.spec.ts`

**Interfaces:**
- Consumes: `AssessmentService.getCheckInState(userId, legacyDue)` and `getSettings()` (Task 4).
- Produces:
  - profile field `checkIn: CheckInStateDto`;
  - legacy `biWeeklyCheckinAvailable` is `false` whenever the set is `wellbeing_v1`;
  - bootstrap `isReportSubmitted` is `true` whenever the set is `wellbeing_v1`.

- [ ] **Step 1: Write the failing tests**

Build each spec by copying the module setup of the nearest existing spec for that file (`ls src/user-profile/*.spec.ts src/user-profile/application/use-cases/*.spec.ts`). Add `{provide: AssessmentService, useValue: assessment}` and these cases:

```ts
// user-profile.service.assessment-switch.spec.ts
const assessment = {getCheckInState: jest.fn(), getSettings: jest.fn()};

it('switch off: biWeeklyCheckinAvailable is unchanged and checkIn mirrors it', async () => {
  legacyPrisma.user_checkin_reports.findFirst.mockResolvedValue(null);
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
  assessment.getCheckInState.mockResolvedValue({instrumentSet: 'wellbeing_v1', due: true, isBaseline: true, consentNeeded: true});
  const profile = await service.getUserProfile(USER_ID);
  expect(profile.biWeeklyCheckinAvailable).toBe(false);
  expect(profile.checkIn.due).toBe(true);
});
```

Write the same two cases against the raw-SQL profile method, mocking `legacyPrisma.$queryRaw` to resolve `[{biWeeklyCheckinAvailable: true}]`. Use the method's real name from the file.

```ts
// bootstrap-app.assessment-switch.spec.ts
it('switch on: isReportSubmitted is true so older builds do not prompt', async () => {
  legacyPrisma.user_checkin_reports.findFirst.mockResolvedValue(null);
  assessment.getSettings.mockResolvedValue({activeInstrumentSet: 'wellbeing_v1', switchedAt: new Date()});
  expect((await useCase.execute(USER_ID)).isReportSubmitted).toBe(true);
});

it('switch off: isReportSubmitted keeps the 13-day legacy rule', async () => {
  legacyPrisma.user_checkin_reports.findFirst.mockResolvedValue(null);
  assessment.getSettings.mockResolvedValue({activeInstrumentSet: 'phq9_gad7', switchedAt: null});
  expect((await useCase.execute(USER_ID)).isReportSubmitted).toBe(false);
});
```

Use the use case's real public method name and result shape. If it is not `execute`, use that name.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/user-profile -t "switch"`
Expected: FAIL. `checkIn` is undefined, and `biWeeklyCheckinAvailable` is still `true` when the switch is on.

- [ ] **Step 3: Write the implementation**

In `user-profile-response.dto.ts`:

```ts
export class CheckInStateDto {
  @ApiProperty({enum: ['phq9_gad7', 'wellbeing_v1']})
  instrumentSet: 'phq9_gad7' | 'wellbeing_v1';

  @ApiProperty()
  due: boolean;

  @ApiProperty()
  isBaseline: boolean;

  @ApiProperty()
  consentNeeded: boolean;
}
```

Under `biWeeklyCheckinAvailable` in `UserProfileResponseDto`, add:

```ts
  @ApiProperty({type: CheckInStateDto})
  checkIn: CheckInStateDto;
```

In `getUserProfile`, replace the `biWeeklyCheckinAvailable` computation:

```ts
      // Legacy PHQ/GAD rule, unchanged. Older builds read only this field.
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const legacyDue = !lastCheckin || lastCheckin.created_at < fourteenDaysAgo;
      const checkIn = await this.assessmentService.getCheckInState(userId, legacyDue);
      // Once the wellbeing check-in is active, older builds must not collect PHQ/GAD.
      const biWeeklyCheckinAvailable = checkIn.instrumentSet === 'wellbeing_v1' ? false : legacyDue;
```

Then add `checkIn,` next to `biWeeklyCheckinAvailable,` in the returned object.

In the raw-SQL method, add above the returned object:

```ts
    const legacyDue = checkinRows[0]?.biWeeklyCheckinAvailable ?? true;
    const checkIn = await this.assessmentService.getCheckInState(<that method's user id variable>, legacyDue);
```

Then replace its return line with:

```ts
      biWeeklyCheckinAvailable: checkIn.instrumentSet === 'wellbeing_v1' ? false : legacyDue,
      checkIn,
```

Inject `private readonly assessmentService: AssessmentService` into `UserProfileService`. Add `AssessmentModule` to `UserProfileModule.imports`.

In `bootstrap-app.use-case.ts`, at the top of `checkReportSubmitted(userId)`:

```ts
    // With the wellbeing check-in active, report "submitted" so older builds
    // never prompt a PHQ/GAD check-in. New builds read profile.checkIn instead.
    const settings = await this.assessmentService.getSettings();
    if (settings.activeInstrumentSet === 'wellbeing_v1') {
      return true;
    }
```

Inject `AssessmentService` into that use case's constructor.

- [ ] **Step 4: Run every user-profile spec**

Run: `pnpm test src/user-profile`
Expected: PASS. Existing specs that build these classes without an `AssessmentService` will fail at construction. In each one, add this provider with switch-off behaviour, so their assertions stay unchanged:

```ts
{provide: AssessmentService, useValue: {
  getCheckInState: async (_u: string, d: boolean) => ({instrumentSet: 'phq9_gad7', due: d, isBaseline: false, consentNeeded: false}),
  getSettings: async () => ({activeInstrumentSet: 'phq9_gad7', switchedAt: null}),
}}
```

- [ ] **Step 5: Mutate the behaviour**

In `getUserProfile`, write `const biWeeklyCheckinAvailable = legacyDue;`. Expected: "switch on: older builds are told nothing is due" FAILS. Restore.

- [ ] **Step 6: Commit** (Claude, after review)

```bash
git add src/user-profile
git commit -m "feat(user-profile): switch-aware check-in flags for all 3 due sites"
```

---

### Task 6: User and admin endpoints

**Files:**
- Create: `src/assessment/presentation/dto/submit-check-in.dto.ts`, `dto/consent.dto.ts`, `dto/set-instrument-set.dto.ts`
- Create: `src/assessment/presentation/assessment.controller.ts`, `assessment-admin.controller.ts`
- Create: `src/assessment/assessment.module.ts`
- Modify: `src/app.module.ts`
- Test: `src/assessment/presentation/assessment.controller.http.spec.ts`

**Interfaces:**
- Consumes: `AssessmentService` (Task 4).
- Produces the routes Plan 3 consumes:
  - `GET /api/v1/assessments/questions`. Returns 409 `ASSESSMENT_CHECK_IN_CLOSED` while the switch is off.
  - `POST /api/v1/assessments/check-ins`, with body `{checkInId: uuid, answers: {MURROR_WB, ONS_LIFESAT, UCLA3, ONS_LONELY}}`. Returns `{checkInId, trend, showSupportCard}`. Errors: 400 `ASSESSMENT_ANSWERS_INVALID`, 409 `ASSESSMENT_CHECK_IN_CLOSED`.
  - `GET /api/v1/assessments/history`
  - `POST /api/v1/assessments/consent`, with body `{decision: 'consented' | 'declined', ageConfirmed18: boolean}`. Returns 204.
  - `DELETE /api/v1/assessments/consent`. Returns 204.
  - `PUT /api/v1/admin/assessments/settings`, with header `x-admin-key` and body `{activeInstrumentSet: 'phq9_gad7' | 'wellbeing_v1'}`.
  - `GET /api/v1/admin/assessments/export`, with header `x-admin-key`.

- [ ] **Step 1: Write the failing HTTP tests**

Copy the bootstrapping from `src/checkin/mental-health.controller.answers-errors.http.spec.ts`:
- a Nest testing module;
- `AuthGuard` overridden to set `req.user = {id: 'u1'}`;
- the global `ValidationPipe` exactly as `main.ts` configures it;
- supertest.

Provide `AssessmentService` as a jest mock, then add these cases:

```ts
const ID1 = '11111111-1111-4111-8111-111111111111';
const answers = {
  MURROR_WB: {mw_1: 2, mw_2: 2, mw_3: 2, mw_4: 2, mw_5: 2, mw_6: 2},
  ONS_LIFESAT: {ons_lifesat_1: 7},
  UCLA3: {ucla3_1: 1, ucla3_2: 1, ucla3_3: 1},
  ONS_LONELY: {ons_lonely_1: 2},
};

it('POST check-ins: a non-uuid checkInId is 400 and the service is never called', async () => {
  await request(app.getHttpServer()).post('/v1/assessments/check-ins').send({checkInId: 'abc', answers}).expect(400);
  expect(service.submitCheckIn).not.toHaveBeenCalled();
});

it('POST check-ins: InvalidAnswersError maps to 400 ASSESSMENT_ANSWERS_INVALID', async () => {
  service.submitCheckIn.mockRejectedValue(new InvalidAnswersError('MURROR_WB', 'x'));
  const res = await request(app.getHttpServer()).post('/v1/assessments/check-ins').send({checkInId: ID1, answers}).expect(400);
  expect(res.body.errorCode ?? res.body.error?.errorCode).toBe('ASSESSMENT_ANSWERS_INVALID');
});

it('POST check-ins: switch off maps to 409', async () => {
  service.submitCheckIn.mockRejectedValue(new CheckInClosedError());
  await request(app.getHttpServer()).post('/v1/assessments/check-ins').send({checkInId: ID1, answers}).expect(409);
});

it('POST check-ins: the answers object reaches the service intact (not stripped)', async () => {
  service.submitCheckIn.mockResolvedValue({checkInId: ID1, trend: 'first', showSupportCard: false});
  await request(app.getHttpServer()).post('/v1/assessments/check-ins').send({checkInId: ID1, answers}).expect(201);
  expect(service.submitCheckIn).toHaveBeenCalledWith('u1', ID1, answers);
});

it('PUT admin settings without x-admin-key is 401', async () => {
  await request(app.getHttpServer())
    .put('/v1/admin/assessments/settings')
    .send({activeInstrumentSet: 'wellbeing_v1'})
    .expect(401);
  expect(service.setActiveInstrumentSet).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/assessment/presentation`
Expected: FAIL with 404s.

- [ ] **Step 3: Write the DTOs, controllers and module**

```ts
// src/assessment/presentation/dto/submit-check-in.dto.ts
import {ApiProperty} from '@nestjs/swagger';
import {IsObject, IsUUID} from 'class-validator';

export class SubmitCheckInDto {
  @ApiProperty({format: 'uuid', description: 'Client-generated; makes a retry safe'})
  @IsUUID('4')
  checkInId: string;

  // Shapes and ranges are checked by the domain (validateAnswers), which knows
  // each instrument's items. Declared here so ValidationPipe does not strip it.
  @ApiProperty({example: {MURROR_WB: {mw_1: 2}, ONS_LIFESAT: {ons_lifesat_1: 7}, UCLA3: {ucla3_1: 1}, ONS_LONELY: {ons_lonely_1: 2}}})
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
  @ApiProperty({enum: ['phq9_gad7', 'wellbeing_v1']})
  @IsIn(['phq9_gad7', 'wellbeing_v1'])
  activeInstrumentSet: 'phq9_gad7' | 'wellbeing_v1';
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
import {AssessmentService, CheckInClosedError, InvalidAnswersError} from '../application/assessment.service';
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
      await this.service.submitCheckIn(req.user.id, body.checkInId, body.answers).catch(mapAssessmentError),
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
    return this.responseFactory.success(await this.service.setActiveInstrumentSet(body.activeInstrumentSet));
  }

  @Get('export')
  async export() {
    return this.responseFactory.success({rows: await this.service.exportStudy(process.env.STUDY_EXPORT_SALT ?? '')});
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
  providers: [AssessmentService, {provide: ASSESSMENT_REPOSITORY, useClass: PrismaAssessmentRepository}],
  exports: [AssessmentService],
})
export class AssessmentModule {}
```

Add `AssessmentModule` to `src/app.module.ts` imports, next to `CheckinModule`. If `PrismaService` is not global, copy the import `CheckinModule`'s repository relies on.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test src/assessment`
Expected: PASS.

- [ ] **Step 5: Commit** (Claude, after review)

```bash
git add src/assessment src/app.module.ts
git commit -m "feat(assessment): user and admin endpoints"
```

---

### Task 7: Privacy proof, full gate, PR, dark deploy, US sync handoff

**Files:**
- Test: `src/common/utils/sentry-scrub.util.spec.ts` (append)

- [ ] **Step 1: Write the scrub test**

Use the scrub function and event-builder helpers that `sentry-scrub.util.spec.ts` already uses. Append:

```ts
it('drops check-in scores, bands and answers from every Sentry surface', () => {
  const sensitive = {
    rawScore: 9, normalizedScore: 25, band: 'often_lonely',
    itemAnswers: {mw_1: 0, ons_lonely_1: 5}, trend: 'heavier', showSupportCard: true,
  };
  const out = JSON.stringify(scrubUnderTest(eventWith(sensitive)));
  for (const leaked of ['rawScore', 'normalizedScore', 'often_lonely', 'itemAnswers', 'mw_1', 'ons_lonely_1', 'heavier']) {
    expect(out).not.toContain(leaked);
  }
});
```

Replace `scrubUnderTest` and `eventWith` with the spec's real helpers. The scrubber is allow-list based, so this should pass with no production change. If it fails, add the leaking surface to the drop path before continuing.

- [ ] **Step 2: Run the full local gate**

```bash
pnpm db:generate
pnpm test
pnpm type-check
pnpm lint
pnpm format-check
for c in test/*.contract.sh; do echo "== $c"; bash "$c" || exit 1; done
```

Expected: every command exits 0. Tests read **690+N suites, 8879+M tests passed**, where N and M are only the new specs, and the skipped counts are unchanged (15 / 151).

- [ ] **Step 3: Prove "dark" by effect locally**

Run `docker compose up` and `pnpm prisma:migrate`. Find the profile route with `grep -rn "getUserProfile(" src --include='*.controller.ts'` and call it for a test user.

Expected:
- `biWeeklyCheckinAvailable` matches `origin/staging`;
- `checkIn.instrumentSet` is `"phq9_gad7"`;
- `GET /api/v1/assessments/questions` returns 409.

- [ ] **Step 4: Push once and open the PR**

```bash
git push -u origin feat/assessment-who5-ucla3
gh pr create -R Murror/murror-api --base staging \
  --title "feat(assessment): wellbeing check-in foundation, ships dark" \
  --body-file <scratchpad>/pr-body.md
```

The PR body covers:
- the spec link;
- "ships dark: the seed row is PHQ9_GAD7";
- the instrument sources and licences (Murror original; ONS under the Open Government Licence v3.0; UCLA-3 pending clearance, with the flip gated on it);
- the 3-sibling count;
- the mutation results;
- the before and after test counts;
- "adds env var STUDY_EXPORT_SALT (needed only for export)";
- the Claude Code attribution line.

Do not add `run-ci` without Astro.

- [ ] **Step 5: After merge, verify staging by effect**

A merge to `staging` auto-deploys staging; do not also dispatch. Check:
- the migration applied;
- `/api/health` is OK;
- a test account's profile shows `checkIn.instrumentSet: "phq9_gad7"`.

Set `STUDY_EXPORT_SALT` in both namespaces before any export.

- [ ] **Step 6: The moment the migration reaches Singapore PROD, hand the tables to the US sync**

The prod sync from Singapore to the US uses a fixed table list (publication `murror_move`, `puballtables = false`), so new tables are not synced. On 2026-10-04 a prod migration that skipped the US broke the sync and forced a 70-minute re-copy.

Message the **DB Migration** session with `20261004120000_add_assessments`. It then:
1. creates the 3 enums and 3 tables in the US;
2. adds the tables to the publication;
3. refreshes the subscription.

Production promotion otherwise follows the CLAUDE.md steps, with the switch still `PHQ9_GAD7`.

---

## Self-review against the spec

| Spec section | Covered by |
|---|---|
| 5.1-5.4 Instruments (items, scales, bands, direction, versions, order, no WHO-5 wording) | Task 1 |
| 5.1 Trend words, support card, thresholds | Task 3 |
| 6.1 Data, deletion, US sync | Tasks 2 and 7 |
| 6.2 API (endpoints, no scores in the result, DTOs declared, `checkIn`, `due`, legacy flags, history) | Tasks 3-6 |
| 7 Safety, item 4 (legacy item-9 intact) | The legacy controller is untouched; the full suite stays green (Task 7) |
| 8 Privacy (deletion, scrubbing, withdrawal, 18+, pseudonymous export) | Tasks 2, 4 and 7 |
| 10 Export (item-level data for validation, cohort, day from baseline) | Task 4 |
| 11 Testing (direction mutation, boundaries, baseline-on-switch, old builds) | Tasks 1, 3 and 5 |
| 6.3-6.5, safety items 1-3, the flip | Plans 2-4 |
