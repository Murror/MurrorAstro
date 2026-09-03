# Codex brief, round three: health-indicator and logging follow-ups (2026-09-02)

Six narrow follow-ups from the adversarial review of murror-api #882 (merged 2026-09-01, now in
production). Every line number below was re-verified against `origin/staging` @ `8b069fc7` on
2026-09-02. Do them in order; items 1 and 2 are the ones that matter in production today.

## Hard rules that apply to EVERY task below

- Repo: `Murror/murror-api`. Branch from `origin/staging`. **PRs target `staging`, never `main`.**
  Do not deploy. Do not write to any database. Do not run `pnpm install` in a worktree that
  symlinks the canonical `node_modules` (it wipes the shared tree).
- Baseline first: `npx prisma generate` for BOTH `prisma/schema.prisma` and
  `prisma/schema.murror.prisma`, then `npx tsc --noEmit` must report **0** errors before any
  test result counts. Non-zero means a broken environment, not a code finding.
- Logging here is nestjs-pino. `logger.warn('msg', {obj})` emits the sentence and **nothing of
  obj**. Only object-first (`logger.warn({...fields}, 'msg')` or `logger.warn({msg, ...})`)
  reaches stdout. Assert on the RENDERED record via
  `src/shared/tests/capture-pino-output.ts` (`captureNestPinoOutput`), never on
  `toHaveBeenCalledWith`, which passes for both forms and proves nothing.
- **Never name a log field `severity`.** `app.module.ts:81` sets
  `formatters: {level: label => ({severity: label.toUpperCase()})}`, so `severity` IS the
  log-level key. The convention is `condition` (see `artwork-integrity-health.indicator.ts`).
- Every new spec must be mutation-tested: reintroduce the defect, prove it applied with
  `git diff --numstat`, watch the spec go red, revert. Put the numstat and the red line in the
  PR body. Specs in this repo routinely encode the defect they should catch.
- Read `Murror/docs/CODEX-HANDOFF.md` first and add your PR numbers to it when done.

## 1. 🚨 Two production alarms overwrite their own log level

`src/articles/services/scheduler-monitoring.service.ts:223` and `:251` log object-first with a
`severity: 'CRITICAL'` field. These are the "no successful article generation in over 24
hours" alarms.

Measured 2026-09-01 against this repo's pino with app.module.ts's exact formatter:

```
log.error({event, severity:'CRITICAL', message})
  -> rendered bytes contain TWO "severity" keys
  -> JSON.parse keeps the LAST: severity = "CRITICAL"   (the level ERROR is gone)

log.error({event, condition:'CRITICAL', message})      <- positive control
  -> ONE "severity" = "ERROR", and condition = "CRITICAL" survives separately
```

Consequence: any alert or query filtering `severity IN ('ERROR','FATAL')` does not match these
records. The alarm fires into a filter that drops it. Duplicate JSON keys are also
consumer-dependent (some processors keep the first key), so the log vendor may disagree with
`JSON.parse`.

**Fix:** rename the field to `condition` on both lines; keep the values. Add a spec that drives
the real service method through `captureNestPinoOutput()` and asserts the parsed record has
`severity === 'ERROR'` and `condition === 'CRITICAL'`. Mutation: put `severity:` back, prove
numstat `1 1`, spec goes red.

**Scope is exactly these two lines.** Repo-wide, excluding `src/generated/` and specs, they are
the only hand-written `severity:` fields in log payloads. The `src/checkin/` matches
(`anxiety_severity`, `status_severity`) are Prisma column names in files with zero logger
calls. Do NOT rename them.

## 2. `historicalBacklog` reports 0 forever, and two comments say 514

`stuck-artwork-health-check.service.ts` computes `historicalBacklog` as COMPLETED + PENDING +
`doneAt < now-7d`. Measured on production 2026-09-01 (read-only):

| status_artwork_url | rows | done_at NULL | newest created |
|---|---|---|---|
| PENDING | 278 | **278** | 2026-03-20 |
| SUCCESS | 602 | 0 | 2026-09-01 |
| ERROR | 1 | 1 | 2026-02-23 |

Every backlog row has `done_at IS NULL`, and `NULL < X` is UNKNOWN, so the filter excludes all
of them. Live `/api/health/monitoring` on production shows `"historicalBacklog": 0`. The field
is structurally dead, not "0 instead of 278". It is reported, never evaluated: the alarm keys
only on `stuckCount === 0 && erroredCount === 0` (`artwork-integrity-health.indicator.ts:~100`).

**Fix (about five lines, no behaviour change to the alarm):**
- Add a separate reported count, e.g. `legacyNullDoneAt`: COMPLETED + PENDING + `deletedAt:
  null` + `doneAt: null`. **Never fold it into `stuckCount`**; that would pin the alarm red on
  278 five-month-old rows, which is the exact failure the window exists to avoid.
- Correct the three stale comments: `stuck-artwork-health-check.service.ts:15` and `:43`, and
  `artwork-integrity-health.indicator.ts:27`. The count is 278 not 514, and the unbounded query
  would still return 0 because the bound is not what excludes them.
- Do not change any existing filter.
- Spec: seed via the existing Prisma mock pattern in `stuck-artwork-health-check.service.spec.ts`
  and assert the new field is reported and `stuckCount` is unchanged. Mutation: fold the NULLs
  into `stuckCount`, spec goes red.

## 3. The sibling stuck-conversation alarms are blind

Same pipeline, same directory as the alarm fixed in #882, same defect: string-first log calls
whose fields never reach stdout. A responder debugging stuck artwork reads these next.

- `src/deep-chat/application/scheduled-jobs/stuck-completion-recovery.service.ts:54, 95, 101, 122, 131`
- `src/deep-chat/application/scheduled-jobs/auto-complete-stale-active-conversations.service.ts:99, 107, 117`

**Fix:** convert each to object-first (`this.logger.warn({...fields}, 'Found stuck chat
conversations')`). Keep the message text. Do not log user text, emails, or names; ids and counts
only. One rendered-record spec per file (pattern:
`stuck-artwork-health-check.service.logging.spec.ts`), with the string-first form as the
control that must LOSE the fields. Mutation: revert one call to string-first, spec goes red.

## 4. `connection-integrity-health.indicator.ts` has no spec

The indicator that shipped the #882 bug to production has zero unit coverage; it is covered only
through `health.controller.integrity-status.spec.ts`. Mirror
`artwork-integrity-health.indicator.spec.ts`: healthy, degraded, and measurement-failed paths;
the class guard `expect(['up','down']).toContain(result.status)`; and `condition` carrying the
wording. Mutation: put `status: 'degraded'` back inside the data object (the original defect),
the guard goes red.

## 5. The hazardous shape survives in three other indicators

They still put `status:` inside the terminus data object, the copy-paste template #882 removed.
Values agree with `isHealthy` today, so there is no live bug, but the next edit inherits the trap.

- `src/health/indicators/influxdb-health.indicator.ts:24, 32`
- `src/health/indicators/redis-health.indicator.ts:61, 73, 79, 91`
- `src/health/indicators/viasr-api-health.indicator.ts:36, 48` (`:36` hand-builds the whole
  result object, bypassing `getStatus`; route it through `getStatus` like the others)

**Fix:** remove `status:` from the data objects, let `getStatus(key, isHealthy, data)` own it,
and add the `// no status key here on purpose` note that `config-presence` already carries.
For each indicator, a spec asserting `['up','down']` contains `status` under every path, plus
the mutation above.

## 6. Docs read `.info.x` on a 200, which is always null

`/api/health/monitoring` wraps a 200 in `{status, statusCode, message, data}`; a 503 is NOT
wrapped. So `jq .info.influxdb` returns `null` on a healthy service and only starts working
during an outage. Fix the three doc sites to `jq '.data.info.influxdb // .info.influxdb'` and
say why in one line:

- `docs/github-influxdb-alpha-checklist.md:75`
- `docs/github-influxdb-setup.md:134`
- `docs/monitoring/influxdb-monitoring.md:390`

## Reporting back

One PR per item is fine, or 1+2, 3, 4+5, 6 as four PRs. Each PR body: the mutation numstat and
the red test line, the full jest summary (suites and tests, not the `Tests:` line alone), and
`tsc` = 0. Then append your PR numbers to `Murror/docs/CODEX-HANDOFF.md` under this brief's
pointer.
