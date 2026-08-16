# Tasks: Play fights in sequence on one carried health bar

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-15

**Goal:** Turn the app's single encounter into a run of at least three configured Quarries fought in order on one player health bar that is never restored, with a full-screen verdict — headline, run position, carried health, tricks-taken bars — whenever a fight or the run resolves.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-08-15).

---

## File map

**Created:**
- `src/hunt/run.ts` — `RunState`, `RunOutcome`, and the four run transitions; pure, inside the lint-enforced `src/hunt/**` boundary
- `src/hunt/__tests__/run.test.ts` — the run module's unit tests, no renderer
- `src/app/run/runLabels.ts` — every user-visible string on the run verdict, plus `runProgressText` for the status band
- `src/app/run/__tests__/runLabels.test.ts` — label and progress-text tests, no renderer
- `src/app/run/RunOutcomePanel.tsx` — the full-viewport verdict screen and its `TrickTally` type
- `src/app/run/__tests__/RunOutcomePanel.test.tsx` — component tests by accessible role and label
- `src/app/run/run.css` — the verdict's full-viewport shell and the trick bars

**Modified:**
- `src/hunt/config.ts:24,45,58` — `QUARRY_ENCOUNTER_HEALTH` widened to three rising entries; `ENCOUNTERS_PER_RUN` derived from its length
- `src/hunt/encounter.ts:17-19` — stale docblock naming DLR-73 for the sequencing this ticket does
- `src/hunt/index.ts` — export the run module
- `src/hunt/__tests__/config.test.ts:26-30,86-89` — the two assertions the config change falsifies
- `src/App.tsx` — rewritten as the run driver
- `src/app/warCouncilMount.ts` — `WarCouncilMountProps` gains `runLabel: string`
- `src/app/warCouncil/WarCouncilRound.tsx:174-185,238-272` — terminal branch deleted, click target widened, `runLabel` passed through
- `src/app/warCouncil/RoundStatusBand.tsx` — renders `runLabel`
- `src/app/warCouncil/RoundOverPanel.tsx:12-19,32-80` — `winner` prop and terminal branch removed
- `src/app/warCouncil/labels.ts:82-88` — `ENCOUNTER_OUTCOME` deleted
- `src/app/warCouncil/warCouncil.css` — `.wc-run` status-band block
- `src/app/warCouncil/warCouncilHealthBars.css:101-107` — `.wc-terminal` rule deleted
- `src/app/warCouncil/__tests__/roundFixture.ts` — `runLabelFixture`
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx:23-32` — `runLabel` on the render helper
- `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx:32-38,152-158` — `runLabel` on both prop objects
- `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx:25-30,45-55` — the three `winner`-dependent tests

**Deleted:** *(no whole files — only the members named above)*

**Developer decides or observes:**
- `src/hunt/config.ts` → `QUARRY_ENCOUNTER_HEALTH` — the curve's values. `[10, 14, 18]` ships as a documented placeholder satisfying AC1 (three entries, rising, not all equal). The ticket predicts a loss around fight three at these numbers and calls that correct; the choice is whether to ship them, soften the ramp, or add fights.
- Whether `ENCOUNTERS_PER_RUN` should stay independently settable (a run shorter than the curve, slicing the first N) rather than becoming an alias of the array's length. That is a different design and changes `run.ts`'s `encounterCount`.
- Whether the "Start a new run" control stays. It is an assumption, not an AC — without it a finished run is a dead screen needing a browser reload.
- Whether the tricks row belongs on all three verdicts or only the wins. The developer named the win screen at the gate; the panel and the data are identical in all three, so it ships everywhere and can be narrowed.
- Whether the trick bars must run in play order. They ship **grouped** (all taken, then all lost) because `WarCouncilState` keeps no per-trick winner history; chronological order means adding one to `src/warCouncil/`, which AC7 puts out of bounds here — a clean follow-up ticket if the order matters.
- All new copy: `FIGHT WON` / `YOU WIN` / `YOU LOSE`, `Tricks taken`, `Next fight`, `Start a new run`, and the supporting detail line.
- The verdict headline's `clamp()` bounds, and the `--wc-poison` / `--wc-alarm` hues on the trick bars.
- **Judge by playing:** whether the headline actually reads as unmissable (the whole point of the feedback); whether a full surface beats an overlay over the frozen felt; whether losing the felt's hand tally at fight's end costs anything, since only the trick split carries onto the verdict.
- **Judge by playing:** whether the deciding trick's new reveal beat — it is skipped today — reads well or delays the verdict.

---

## Phase 1 — The run module and its configuration

Pure logic only, inside the lint-enforced `src/hunt/**` boundary. Nothing renders and nothing consumes the new module yet, so the phase ends with the app behaving exactly as it does today while `run.ts` sits fully tested beside it. The config change and every assertion it falsifies land in one task, because a phase boundary between them would leave the suite red.

### Task 1: Widen the encounter curve and derive the run length in `src/hunt/config.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/config.ts:14-24`, `src/hunt/config.ts:56-58`
- Modify: `src/hunt/encounter.ts:14-24`
- Test: `src/hunt/__tests__/config.test.ts:25-30`, `src/hunt/__tests__/config.test.ts:85-89`

- [x] **Step 1: Replace `QUARRY_ENCOUNTER_HEALTH`'s single entry with the three-entry placeholder curve**

Replace `src/hunt/config.ts:14-24` (the comment block and the constant) with:

```ts
// The Quarry's health, one entry per encounter, in run order.
// AC1 (DLR-82) — at least three entries, rising, not all the same.
// PLACEHOLDER VALUES: the SHAPE is the ticket's, the NUMBERS are the DEVELOPER'S and are listed
// under "Developer decides or observes" in this contract's tasks.md. DLR-82's own risk note
// predicts the player losing around fight three on these numbers and states that this is the
// arithmetic working — the answer is the shop and the flask in later stories, NOT raising
// PLAYER_START_HEALTH.
// Entry 0 keeps 10, set by the developer 2026-08-14 (PT-002) alongside the trick-counting bank:
// at 10 the encounter lasts ~1.9 hands and random legal play wins 63.8%.
// UNIT: health points, indexed 0..n-1 by encounter.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [10, 14, 18]
```

- [x] **Step 2: Derive `ENCOUNTERS_PER_RUN` from the array rather than stating it separately**

Replace `src/hunt/config.ts:56-58` with:

```ts
// §9 "Encounters per run" — DERIVED, never chosen. `QUARRY_ENCOUNTER_HEALTH` is the single source
// of truth for run length (DLR-82 AC1); a free-standing number beside it is the second source that
// drifts, and any value larger than the array is a RangeError from `quarryHealthForEncounter`
// waiting to happen. Replaces DLR-48 AC3's provisional 5, which sat beside a one-entry array.
export const ENCOUNTERS_PER_RUN = QUARRY_ENCOUNTER_HEALTH.length
```

- [x] **Step 3: Correct `startEncounter`'s docblock, which credits the retired DLR-73 with this ticket's work**

In `src/hunt/encounter.ts`, replace the sentence at lines 17-19 reading `Running the encounters in order, and any restore between them (\`ENCOUNTER_PLAYER_RESTORE\`), is DLR-73's, and this module deliberately reads neither.` with:

```ts
 * Running the encounters in order is `src/hunt/run.ts`'s (DLR-82), which calls this function once
 * per fight and passes the health the player carried out of the last one. Any restore between
 * them (`ENCOUNTER_PLAYER_RESTORE`) remains DELIBERATELY UNREAD — DLR-82 forbids wiring it in,
 * and the flask stories own it.
```

- [x] **Step 4: Update the two assertions the widened array falsifies**

In `src/hunt/__tests__/config.test.ts`, replace the `Forage and run-length constants` block at lines 25-30 with:

```ts
describe('Forage and run-length constants', () => {
  it('keeps DLR-48 AC3’s forage budget', () => {
    expect(FORAGE_BUDGET_PER_ENCOUNTER).toBe(4)
  })

  it('derives the run length from the curve rather than stating it twice (DLR-82 AC1)', () => {
    expect(ENCOUNTERS_PER_RUN).toBe(QUARRY_ENCOUNTER_HEALTH.length)
  })
})
```

and replace the `configures exactly one encounter` test at lines 86-89 with:

```ts
  it('configures at least three encounters, rising and not all the same (DLR-82 AC1)', () => {
    expect(QUARRY_ENCOUNTER_HEALTH.length).toBeGreaterThanOrEqual(3)
    expect(new Set(QUARRY_ENCOUNTER_HEALTH).size).toBeGreaterThan(1)
    for (const health of QUARRY_ENCOUNTER_HEALTH) {
      expect(health).toBeGreaterThan(0)
      expect(Number.isFinite(health)).toBe(true)
    }
    expect(() => quarryHealthForEncounter(QUARRY_ENCOUNTER_HEALTH.length)).toThrow(RangeError)
  })
```

- [x] **Step 5: Run the two `src/hunt/` specs and the type checker**

Run: `npx vitest run src/hunt/__tests__/config.test.ts src/hunt/__tests__/encounter.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed. `encounter.test.ts` indexes entry `0` only and must stay green untouched — if it fails, the curve's first entry was changed and should not have been.

### Task 2: Add the pure run module at `src/hunt/run.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/run.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Write the failing spec for the run's transitions and outcome boundaries**

Create `src/hunt/__tests__/run.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { advanceRun, canAdvanceRun, recordEncounter, RunOutcome, startRun } from '../run'
import { applyDamage } from '../encounter'
import { PLAYER_START_HEALTH, QUARRY_ENCOUNTER_HEALTH, quarryHealthForEncounter } from '../config'
import { DuelSide, type EncounterState, type IncomingDamage } from '../types'

const damage = (toPlayer: number, toQuarry: number): IncomingDamage => ({
  [DuelSide.Player]: toPlayer,
  [DuelSide.Quarry]: toQuarry,
})

/** Beat the Quarry of the encounter `run` is on, leaving the player on `playerLoss` less health. */
function winEncounter(encounter: EncounterState, playerLoss = 0): EncounterState {
  return applyDamage(encounter, damage(playerLoss, encounter.health[DuelSide.Quarry]))
}

describe('startRun (AC1)', () => {
  it('opens on fight 0 with both bars at their configured totals', () => {
    const run = startRun()
    expect(run.encounterIndex).toBe(0)
    expect(run.encounterCount).toBe(QUARRY_ENCOUNTER_HEALTH.length)
    expect(run.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(run.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(run.outcome).toBe(RunOutcome.InProgress)
  })

  it('sequences at least three fights that are not all the same', () => {
    expect(startRun().encounterCount).toBeGreaterThanOrEqual(3)
    expect(new Set(QUARRY_ENCOUNTER_HEALTH).size).toBeGreaterThan(1)
  })

  it('refuses a non-positive or non-finite starting health rather than starting a NaN bar', () => {
    for (const health of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => startRun(health)).toThrow(RangeError)
    }
  })
})

describe('recordEncounter — the outcome boundaries (AC4, AC5)', () => {
  it('stays in progress while the fight is live', () => {
    const run = startRun()
    const hit = applyDamage(run.encounter, damage(1, 1))
    expect(recordEncounter(run, hit).outcome).toBe(RunOutcome.InProgress)
  })

  it('stays in progress when an intermediate fight is won — the next one is waiting', () => {
    const run = startRun()
    const after = recordEncounter(run, winEncounter(run.encounter))
    expect(after.outcome).toBe(RunOutcome.InProgress)
    expect(after.encounter.winner).toBe(DuelSide.Player)
    expect(canAdvanceRun(after)).toBe(true)
  })

  it('ends the run as WON when the final fight is won (AC5)', () => {
    let run = startRun()
    for (let i = 0; i < run.encounterCount - 1; i += 1) {
      run = advanceRun(recordEncounter(run, winEncounter(run.encounter)))
    }
    const final = recordEncounter(run, winEncounter(run.encounter))
    expect(final.encounterIndex).toBe(final.encounterCount - 1)
    expect(final.outcome).toBe(RunOutcome.Won)
    expect(canAdvanceRun(final)).toBe(false)
  })

  it('ends the run as LOST the moment the player is down, whatever the position (AC4)', () => {
    const run = startRun()
    const dead = applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0))
    const after = recordEncounter(run, dead)
    expect(after.outcome).toBe(RunOutcome.Lost)
    expect(canAdvanceRun(after)).toBe(false)
  })

  it('refuses to record onto a run that has already ended', () => {
    const run = startRun()
    const lost = recordEncounter(run, applyDamage(run.encounter, damage(PLAYER_START_HEALTH, 0)))
    expect(() => recordEncounter(lost, lost.encounter)).toThrow(RangeError)
  })
})

describe('advanceRun — the carry (AC3)', () => {
  it('carries the health the player finished on, restoring nothing', () => {
    const run = startRun()
    const loss = 3
    const next = advanceRun(recordEncounter(run, winEncounter(run.encounter, loss)))
    expect(next.encounterIndex).toBe(1)
    expect(next.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - loss)
    expect(next.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(1))
  })

  it('opens the next fight unresolved, with its own damage counter at zero', () => {
    const run = startRun()
    const next = advanceRun(recordEncounter(run, winEncounter(run.encounter, 2)))
    expect(next.encounter.winner).toBeNull()
    expect(next.encounter.damageEventsApplied).toBe(0)
    expect(next.outcome).toBe(RunOutcome.InProgress)
  })

  it('throws rather than returning the run unchanged when it cannot advance', () => {
    const live = startRun()
    expect(canAdvanceRun(live)).toBe(false)
    expect(() => advanceRun(live)).toThrow(RangeError)

    const lost = recordEncounter(live, applyDamage(live.encounter, damage(PLAYER_START_HEALTH, 0)))
    expect(() => advanceRun(lost)).toThrow(RangeError)
  })

  it('never mutates the run it was handed', () => {
    const run = startRun()
    const won = recordEncounter(run, winEncounter(run.encounter, 4))
    const before = JSON.stringify(won)
    advanceRun(won)
    expect(JSON.stringify(won)).toBe(before)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/hunt/__tests__/run.test.ts`
Expected: exits non-zero with a resolution failure on `../run` (`Failed to load` / `Cannot find module`) — the module does not exist yet. A different failure means the spec itself is wrong.

- [x] **Step 3: Implement `src/hunt/run.ts`**

Create `src/hunt/run.ts`:

```ts
import { PLAYER_START_HEALTH, QUARRY_ENCOUNTER_HEALTH } from './config'
import { isEncounterResolved, startEncounter } from './encounter'
import { DuelSide, type EncounterState, type Health } from './types'

/**
 * How a run has ended, or that it has not (DLR-82 AC4/AC5).
 *
 * `InProgress` covers BOTH "the fight is still being played" and "the fight is won and the next
 * one is waiting on the player" — the difference is `encounter.winner`, read through
 * `canAdvanceRun`, not a fourth outcome. One statement of "the run is over" means a screen and a
 * transition cannot disagree about it.
 */
export const RunOutcome = {
  InProgress: 'inProgress',
  Won: 'won',
  Lost: 'lost',
} as const
export type RunOutcome = (typeof RunOutcome)[keyof typeof RunOutcome]

/**
 * One run: a position in the configured encounter sequence, plus the encounter being fought at
 * that position.
 *
 * Holds NO separate player-health field. The carried figure is
 * `encounter.health[DuelSide.Player]`, and a second copy beside it is a number that drifts the
 * first time one is written without the other.
 */
export interface RunState {
  /** 0-based index into `QUARRY_ENCOUNTER_HEALTH`. */
  readonly encounterIndex: number
  /** `QUARRY_ENCOUNTER_HEALTH.length`, carried on the state so a renderer needs no config import. */
  readonly encounterCount: number
  readonly encounter: EncounterState
  readonly outcome: RunOutcome
}

/**
 * AC1 — a run at fight 0, both bars from configuration.
 *
 * `playerHealth` is a defaulted parameter rather than something this module closes over, matching
 * `startEncounter`'s own injectable pattern, so a spec varies it without mutating module state.
 * Its guard lives in `startEncounter`, which already refuses a non-positive or non-finite value.
 */
export function startRun(playerHealth: Health = PLAYER_START_HEALTH): RunState {
  return {
    encounterIndex: 0,
    encounterCount: QUARRY_ENCOUNTER_HEALTH.length,
    encounter: startEncounter(0, playerHealth),
    outcome: RunOutcome.InProgress,
  }
}

/**
 * Adopt the encounter a hand reported upward and re-derive the run's outcome. THE single place
 * AC4 and AC5 are decided.
 *
 * Refuses a run that has already ended: recording onto a finished run would silently resurrect
 * it, and there is no legitimate caller — the driver stops handing hands to a finished run.
 */
export function recordEncounter(run: RunState, encounter: EncounterState): RunState {
  if (run.outcome !== RunOutcome.InProgress) {
    throw new RangeError(
      `Cannot record an encounter onto a run already ${run.outcome} at fight ${run.encounterIndex + 1} of ${run.encounterCount}`,
    )
  }
  return { ...run, encounter, outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter) }
}

/** AC2 — the Quarry is down and there is another fight. One statement, so a screen offering the
 *  control and the transition performing it cannot disagree. */
export function canAdvanceRun(run: RunState): boolean {
  return run.outcome === RunOutcome.InProgress && run.encounter.winner === DuelSide.Player
}

/**
 * AC3 — the next fight, opened on the health the player carried out of the last one. Nothing is
 * restored: `ENCOUNTER_PLAYER_RESTORE` is deliberately NOT read here, per DLR-82.
 *
 * Throws rather than returning the run unchanged — an un-advanceable run returned as-is would
 * present a stuck screen as a success and leave nothing in the console to find it by.
 */
export function advanceRun(run: RunState): RunState {
  if (!canAdvanceRun(run)) {
    throw new RangeError(
      `Cannot advance a run that is ${run.outcome} with the encounter won by ${run.encounter.winner ?? 'nobody yet'} at fight ${run.encounterIndex + 1} of ${run.encounterCount}`,
    )
  }
  const encounterIndex = run.encounterIndex + 1
  return {
    ...run,
    encounterIndex,
    encounter: startEncounter(encounterIndex, run.encounter.health[DuelSide.Player]),
    outcome: RunOutcome.InProgress,
  }
}

/**
 * AC4 before AC5, deliberately: the player being down ends the run wherever it happens, including
 * on the final fight, and including the simultaneous-depletion tie that `applyDamage` has already
 * resolved to the Quarry via `SIMULTANEOUS_DEPLETION_WINNER`.
 */
function outcomeFor(
  encounterIndex: number,
  encounterCount: number,
  encounter: EncounterState,
): RunOutcome {
  if (!isEncounterResolved(encounter)) return RunOutcome.InProgress
  if (encounter.winner === DuelSide.Quarry) return RunOutcome.Lost
  return encounterIndex === encounterCount - 1 ? RunOutcome.Won : RunOutcome.InProgress
}
```

- [x] **Step 4: Export the module from the `src/hunt/` barrel**

Append to `src/hunt/index.ts`:

```ts
export type { RunState } from './run'
export { RunOutcome, startRun, recordEncounter, canAdvanceRun, advanceRun } from './run'
```

- [x] **Step 5: Run the spec green, plus the sibling `src/hunt/` specs and the type checker**

Run: `npx vitest run src/hunt/__tests__/; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed across `run.test.ts`, `config.test.ts`, `encounter.test.ts` and `quarryCharacters.test.ts`.

- [x] **Step 6: Confirm the new module stayed inside the pure-core boundary**

Run: `npm run lint; (Get-Content src\hunt\run.ts).Count`
Expected: lint exits 0 — `eslint.config.js`'s `src/hunt/**` override fails the build on a React import or a DOM global, so a clean run is the boundary check. The line count is well under 400.

---

## Phase 2 — The run verdict screen

The new surface, built and tested in isolation before anything renders it. Nothing imports `src/app/run/` at the end of this phase, so the app still behaves as it does today and the phase ends type-checking with no half-wired screen. Layout and interaction come from `mockup.html` in this folder — screens 2, 3 and 4 are the three verdicts this phase builds.

### Task 3: Add the run verdict's copy at `src/app/run/runLabels.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/run/runLabels.ts`
- Test: `src/app/run/__tests__/runLabels.test.ts`

- [x] **Step 1: Write the failing spec for the progress readout and the verdict copy**

Create `src/app/run/__tests__/runLabels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RunOutcome } from '../../../hunt'
import {
  NEW_RUN_LABEL,
  NEXT_FIGHT_LABEL,
  runHeadline,
  runProgressText,
  runVerdictDetail,
  tricksTakenText,
} from '../runLabels'

describe('runProgressText (AC6)', () => {
  it('reads 1-based from a 0-based index, so fight 0 of 3 is "Fight 1 of 3"', () => {
    expect(runProgressText(0, 3)).toBe('Fight 1 of 3')
    expect(runProgressText(2, 3)).toBe('Fight 3 of 3')
  })
})

describe('runHeadline (AC5)', () => {
  it('distinguishes winning the last fight from winning an intermediate one', () => {
    const intermediate = runHeadline(RunOutcome.InProgress)
    const final = runHeadline(RunOutcome.Won)
    expect(final).not.toBe(intermediate)
    expect(final).toContain('WIN')
  })

  it('names losing distinctly from either win', () => {
    const lost = runHeadline(RunOutcome.Lost)
    expect(lost).not.toBe(runHeadline(RunOutcome.Won))
    expect(lost).not.toBe(runHeadline(RunOutcome.InProgress))
  })

  it('names no Quarry — the roster is DLR-85’s', () => {
    for (const outcome of Object.values(RunOutcome)) {
      expect(runHeadline(outcome)).not.toMatch(/monarch|quarry/i)
    }
  })
})

describe('runVerdictDetail', () => {
  it('names the fight that is waiting when the run continues', () => {
    expect(runVerdictDetail(RunOutcome.InProgress, 0, 3, 7)).toContain('Fight 2 of 3')
  })

  it('names the fight the player went down on when the run is lost', () => {
    expect(runVerdictDetail(RunOutcome.Lost, 2, 3, 0)).toContain('3 of 3')
  })

  it('states the run length when the run is won', () => {
    expect(runVerdictDetail(RunOutcome.Won, 2, 3, 2)).toContain('3')
  })
})

describe('tricksTakenText', () => {
  it('states both figures, so the bars do not depend on colour alone', () => {
    expect(tricksTakenText(4, 2)).toContain('4')
    expect(tricksTakenText(4, 2)).toContain('6')
  })
})

describe('control labels', () => {
  it('names the two forward controls differently, so a role query tells them apart', () => {
    expect(NEXT_FIGHT_LABEL).not.toBe(NEW_RUN_LABEL)
  })
})
```

- [x] **Step 2: Run it and confirm it fails on the missing module**

Run: `npx vitest run src/app/run/__tests__/runLabels.test.ts`
Expected: exits non-zero, failing to resolve `../runLabels`.

- [x] **Step 3: Implement `src/app/run/runLabels.ts`**

Create `src/app/run/runLabels.ts`:

```ts
import { RunOutcome, type Health } from '../../hunt'

/**
 * Every user-visible string on the run verdict, and the run's own progress readout.
 *
 * ALL PLACEHOLDER COPY — the wording is the developer's, exactly as `warCouncil/labels.ts` marks
 * its own. It deliberately names NO Quarry: at DLR-82 one character is configured for the whole
 * run, so a name here would print identically on every fight. DLR-85 lands the roster and updates
 * this file in the same change (see that ticket's Dependencies & Risks).
 */

/** AC6 — 0-based index in, 1-based fight number out. */
export function runProgressText(encounterIndex: number, encounterCount: number): string {
  return `Fight ${encounterIndex + 1} of ${encounterCount}`
}

/**
 * AC5 — the verdict's headline. `InProgress` reaching here means the Quarry is down and another
 * fight remains; the panel only renders once an encounter has resolved, so it is the
 * intermediate-win case rather than a live fight.
 */
export function runHeadline(outcome: RunOutcome): string {
  switch (outcome) {
    case RunOutcome.Won:
      return 'YOU WIN'
    case RunOutcome.Lost:
      return 'YOU LOSE'
    case RunOutcome.InProgress:
      return 'FIGHT WON'
  }
}

/** The supporting line under the headline: where the run stands, and what is carried. */
export function runVerdictDetail(
  outcome: RunOutcome,
  encounterIndex: number,
  encounterCount: number,
  carriedHealth: Health,
): string {
  switch (outcome) {
    case RunOutcome.Won:
      return `Every Quarry is down. You took all ${encounterCount} fights and finished on ${carriedHealth} health.`
    case RunOutcome.Lost:
      return `You went down on fight ${encounterIndex + 1} of ${encounterCount}. The run ends here.`
    case RunOutcome.InProgress:
      return `The Quarry is down. ${runProgressText(encounterIndex + 1, encounterCount)} is waiting, and you carry ${carriedHealth} health into it.`
  }
}

/** The tricks row's own sentence, for a reader who sees neither the bars nor their colour —
 *  `game-ux`: no state may depend on colour alone. */
export function tricksTakenText(taken: number, lost: number): string {
  return `${TRICKS_TAKEN_LABEL} — ${taken} of ${taken + lost}.`
}

export const TRICKS_TAKEN_LABEL = 'Tricks taken'
export const CARRIED_HEALTH_LABEL = 'Carried health'
export const NEXT_FIGHT_LABEL = 'Next fight'
export const NEW_RUN_LABEL = 'Start a new run'
```

- [x] **Step 4: Run the spec green and typecheck**

Run: `npx vitest run src/app/run/__tests__/runLabels.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

### Task 4: Build the verdict screen at `src/app/run/RunOutcomePanel.tsx` ✓

- Skill: `react-frontend`, and `game-ux` for the full-viewport shell and the no-colour-alone rule

**Files:**
- Create: `src/app/run/RunOutcomePanel.tsx`
- Create: `src/app/run/run.css`
- Test: `src/app/run/__tests__/RunOutcomePanel.test.tsx`

- [x] **Step 1: Write the failing component spec, querying by accessible role and label**

Create `src/app/run/__tests__/RunOutcomePanel.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunOutcome } from '../../../hunt'
import RunOutcomePanel from '../RunOutcomePanel'
import { NEW_RUN_LABEL, NEXT_FIGHT_LABEL } from '../runLabels'

afterEach(cleanup)

const baseProps = {
  encounterIndex: 0,
  encounterCount: 3,
  carriedHealth: 6,
  tricks: { taken: 4, lost: 2 },
  onNextFight: vi.fn(),
  onNewRun: vi.fn(),
}

describe('RunOutcomePanel — the three verdicts (AC2, AC4, AC5)', () => {
  it('offers the continue control when a fight is won and another remains (AC2)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('button', { name: NEXT_FIGHT_LABEL })).toBeTruthy()
    expect(screen.queryByRole('button', { name: NEW_RUN_LABEL })).toBeNull()
  })

  it('offers NO further fight once the player is down (AC4)', () => {
    render(
      <RunOutcomePanel
        {...baseProps}
        encounterIndex={2}
        carriedHealth={0}
        outcome={RunOutcome.Lost}
        canContinue={false}
      />,
    )
    expect(screen.queryByRole('button', { name: NEXT_FIGHT_LABEL })).toBeNull()
    expect(screen.getByRole('button', { name: NEW_RUN_LABEL })).toBeTruthy()
  })

  it('heads a won run differently from a won intermediate fight (AC5)', () => {
    const { rerender } = render(
      <RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />,
    )
    const intermediate = screen.getByRole('heading').textContent
    rerender(
      <RunOutcomePanel
        {...baseProps}
        encounterIndex={2}
        outcome={RunOutcome.Won}
        canContinue={false}
      />,
    )
    expect(screen.getByRole('heading').textContent).not.toBe(intermediate)
  })

  it('states which fight of the run the verdict belongs to (AC6)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('status').textContent).toContain('of 3')
  })

  it('draws one bar per trick of the deciding hand, marked taken or lost', () => {
    const { container } = render(
      <RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />,
    )
    expect(container.querySelectorAll('.run-trick')).toHaveLength(6)
    expect(container.querySelectorAll('.run-trick.is-lost')).toHaveLength(2)
  })

  it('states the trick split in text, so it does not depend on colour (game-ux)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('group', { name: /tricks taken/i })).toBeTruthy()
  })

  it('fires each handler exactly once per click, so a fight is not advanced twice', () => {
    const onNextFight = vi.fn()
    render(
      <RunOutcomePanel
        {...baseProps}
        outcome={RunOutcome.InProgress}
        canContinue
        onNextFight={onNextFight}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: NEXT_FIGHT_LABEL }))
    expect(onNextFight).toHaveBeenCalledTimes(1)
  })

  it('renders a bar row with no lost tricks without crashing', () => {
    const { container } = render(
      <RunOutcomePanel
        {...baseProps}
        tricks={{ taken: 6, lost: 0 }}
        outcome={RunOutcome.InProgress}
        canContinue
      />,
    )
    expect(container.querySelectorAll('.run-trick')).toHaveLength(6)
    expect(container.querySelectorAll('.run-trick.is-lost')).toHaveLength(0)
  })
})
```

- [x] **Step 2: Run it and confirm it fails on the missing component**

Run: `npx vitest run src/app/run/__tests__/RunOutcomePanel.test.tsx`
Expected: exits non-zero, failing to resolve `../RunOutcomePanel`.

- [x] **Step 3: Implement `src/app/run/RunOutcomePanel.tsx`**

Create `src/app/run/RunOutcomePanel.tsx`:

```tsx
import { RunOutcome, type Health } from '../../hunt'
import {
  CARRIED_HEALTH_LABEL,
  NEW_RUN_LABEL,
  NEXT_FIGHT_LABEL,
  runHeadline,
  runProgressText,
  runVerdictDetail,
  TRICKS_TAKEN_LABEL,
  tricksTakenText,
} from './runLabels'
import './run.css'

/**
 * The deciding hand's trick split, as two counts. The engine keeps NO per-trick winner sequence —
 * `WarCouncilState.tricksWon` is a Record of two numbers — so the bars are GROUPED (taken, then
 * lost) rather than in play order. Rendering them chronologically means adding a history array to
 * `src/warCouncil/`, which DLR-82 AC7 puts out of bounds; it is a clean follow-up.
 */
export interface TrickTally {
  readonly taken: number
  readonly lost: number
}

interface RunOutcomePanelProps {
  readonly outcome: RunOutcome
  readonly encounterIndex: number
  readonly encounterCount: number
  readonly carriedHealth: Health
  readonly tricks: TrickTally
  /** `true` when the Quarry is down and another fight remains — the only state offering
   *  `onNextFight`. Handed in from `canAdvanceRun` rather than derived here, so this component
   *  cannot disagree with the run module about whether the run is over. */
  readonly canContinue: boolean
  readonly onNextFight: () => void
  readonly onNewRun: () => void
}

/**
 * The run verdict (DLR-82): a full-viewport surface shown whenever an encounter resolves, in
 * place of the felt. It replaces the terminal hand panel this ticket deletes — a `<p role="status">`
 * inside a tally table, with no control, which a play session showed the player did not read as
 * "you won" and could not act on.
 *
 * Computes NOTHING. Every figure and every branch arrives as a prop. Layout follows
 * `.claude/contract/DLR-82-play-fights-in-sequence-on-one-health-bar/mockup.html` screens 2-4.
 *
 * Three states, distinguishable WITHOUT colour or motion: the headline text differs, the rule
 * above it differs in form (single / double / hatched), the supporting line differs, and the
 * control's label differs. `game-ux` requires this — a screenshot in greyscale must still tell
 * them apart.
 */
export default function RunOutcomePanel({
  outcome,
  encounterIndex,
  encounterCount,
  carriedHealth,
  tricks,
  canContinue,
  onNextFight,
  onNewRun,
}: RunOutcomePanelProps) {
  const verdict = canContinue ? 'fightWon' : outcome
  const bars = [
    ...Array.from({ length: tricks.taken }, () => true),
    ...Array.from({ length: tricks.lost }, () => false),
  ]

  return (
    <div className="run-shell">
      <div className="run-verdict" data-verdict={verdict}>
        <div className="run-rule" aria-hidden="true" />
        <h1 className="run-headline">{runHeadline(outcome)}</h1>
        <p className="run-detail" role="status">
          {runVerdictDetail(outcome, encounterIndex, encounterCount, carriedHealth)}
        </p>
        <div
          className="run-tricks"
          role="group"
          aria-label={tricksTakenText(tricks.taken, tricks.lost)}
        >
          <span className="run-tricks-label">
            {TRICKS_TAKEN_LABEL} · {tricks.taken} of {tricks.taken + tricks.lost}
          </span>
          <span className="run-bars" aria-hidden="true">
            {bars.map((taken, index) => (
              <span key={index} className={`run-trick${taken ? '' : ' is-lost'}`} />
            ))}
          </span>
        </div>
        <p className="run-carry">
          {CARRIED_HEALTH_LABEL} — {carriedHealth}
        </p>
        <div className="run-actions">
          {canContinue ? (
            <button type="button" className="run-btn is-primary" onClick={onNextFight}>
              {NEXT_FIGHT_LABEL}
            </button>
          ) : (
            <button type="button" className="run-btn is-primary" onClick={onNewRun}>
              {NEW_RUN_LABEL}
            </button>
          )}
        </div>
        <p className="run-position">{runProgressText(encounterIndex, encounterCount)}</p>
      </div>
    </div>
  )
}
```

- [x] **Step 4: Write `src/app/run/run.css`**

Create `src/app/run/run.css`. Reuse the `--wc-*` tokens already declared on `:root` by `warCouncil.css`; declare no new ones, because every colour and every `clamp()` bound here is the developer's to retune.

```css
/* The run verdict's own full-viewport shell (DLR-82). Transcribed from
   `.claude/contract/DLR-82-play-fights-in-sequence-on-one-health-bar/mockup.html`.
   `100dvh`, never `100vh`; `100%`, never `100vw` — game-ux's hard floor.
   Every clamp() bound and every hue below is the DEVELOPER'S to retune. */

.run-shell {
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
  box-sizing: border-box;
  padding: clamp(1rem, 4vmin, 3rem);
  padding-top: max(clamp(1rem, 4vmin, 3rem), env(safe-area-inset-top, 0px));
  padding-bottom: max(clamp(1rem, 4vmin, 3rem), env(safe-area-inset-bottom, 0px));
  background: radial-gradient(120% 80% at 50% 40%, #172027 0%, #050708 100%), var(--wc-chamber);
  color: var(--wc-chalk);
  font-family: var(--wc-sans);
  color-scheme: dark;
}

.run-verdict {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(0.7rem, 2.4vmin, 1.6rem);
  text-align: center;
  max-width: 34rem;
}

/* Form, not just colour: one rule for a won fight, a double rule for a won run, a hatched rule
   for a lost one, so greyscale still tells the three apart. */
.run-rule {
  width: clamp(6rem, 30vmin, 16rem);
  height: 2px;
  background: var(--wc-brass-dim);
}

.run-verdict[data-verdict='won'] .run-rule {
  height: 8px;
  background: none;
  border-top: 2px solid var(--wc-brass);
  border-bottom: 2px solid var(--wc-brass);
}

.run-verdict[data-verdict='lost'] .run-rule {
  height: 6px;
  background: repeating-linear-gradient(-45deg, #ffffff26 0 3px, #00000026 3px 6px);
}

.run-headline {
  font-family: var(--wc-serif);
  font-size: clamp(2.6rem, 12vmin, 7rem);
  line-height: 0.95;
  letter-spacing: 0.06em;
  font-weight: 600;
  margin: 0;
  color: var(--wc-brass);
}

.run-verdict[data-verdict='won'] .run-headline {
  color: var(--wc-poison);
}

.run-verdict[data-verdict='lost'] .run-headline {
  color: var(--wc-alarm);
}

.run-detail {
  margin: 0;
  font-size: clamp(0.85rem, 2.2vmin, 1.05rem);
  line-height: 1.5;
}

.run-tricks {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
}

.run-tricks-label,
.run-carry,
.run-position {
  margin: 0;
  font-size: clamp(0.55rem, 1.2vmin, 0.68rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--wc-chalk-dim);
}

.run-bars {
  display: flex;
  gap: clamp(0.2rem, 0.8vmin, 0.45rem);
}

/* A taken trick is solid; a lost one is hatched AND outlined as well as red, so the split does
   not depend on hue. */
.run-trick {
  width: clamp(1.6rem, 6vmin, 3rem);
  height: clamp(0.5rem, 1.6vmin, 0.85rem);
  border-radius: 1px;
  background: var(--wc-poison);
  border: 1px solid var(--wc-poison-edge);
}

.run-trick.is-lost {
  background-color: var(--wc-alarm);
  background-image: repeating-linear-gradient(-45deg, #00000040 0 3px, #ffffff1a 3px 6px);
  border-color: #7d3a30;
}

.run-actions {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.4rem;
}

.run-btn {
  font-family: var(--wc-sans);
  font-size: clamp(0.8rem, 2vmin, 0.95rem);
  letter-spacing: 0.08em;
  min-height: 44px;
  min-width: 44px;
  padding: 0.7rem 1.6rem;
  border-radius: 3px;
  border: 1px solid var(--wc-brass);
  background: transparent;
  color: var(--wc-brass);
  cursor: pointer;
  touch-action: manipulation;
}

.run-btn.is-primary {
  background: var(--wc-brass);
  color: var(--wc-ink);
  font-weight: 600;
}

.run-btn:focus-visible {
  outline: 2px solid var(--wc-parchment);
  outline-offset: 2px;
}

@media (hover: hover) {
  .run-btn:hover {
    border-color: var(--wc-parchment);
  }
}

.run-btn:active {
  transform: translateY(1px);
}
```

- [x] **Step 5: Run the component spec green, then typecheck and lint**

Run: `npx vitest run src/app/run/__tests__/; npm run typecheck; npm run lint`
Expected: all three exit 0; Vitest reports 0 failed.

- [x] **Step 6: Measure both new files against the 400-line budget**

Run: `(Get-Content src\app\run\RunOutcomePanel.tsx).Count; (Get-Content src\app\run\run.css).Count; (Get-Content src\app\run\runLabels.ts).Count`
Expected: each under 400. Use `(Get-Content …).Count`, **not** `Measure-Object -Line` — the latter drops blank lines and hid a real breach on DLR-63.

---

## Phase 3 — Wire the run into the app

The behavioural phase. The mount contract gains its run readout, the felt's terminal panel comes out, and `App` becomes the run driver. All three tasks belong to one phase because the app is mid-rewire between them — the terminal panel is gone before `App` has anywhere to send a finished encounter — and only the last task restores a coherent app. Do not stop between tasks here.

### Task 5: Thread the run position through the mount contract into the status band (AC6) ✓

- Skill: `react-frontend`, and `game-ux` for anchoring status to an edge

**Files:**
- Modify: `src/app/warCouncilMount.ts:4-15`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:65-71`, `src/app/warCouncil/WarCouncilRound.tsx:241-247`
- Modify: `src/app/warCouncil/RoundStatusBand.tsx:8-14`, `src/app/warCouncil/RoundStatusBand.tsx:26-48`
- Modify: `src/app/warCouncil/warCouncil.css` — add a `.wc-run` block after `.wc-plate-label`
- Test: `src/app/warCouncil/__tests__/roundFixture.ts`, `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx:23-32`, `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx:32-38`, `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx:152-158`

- [x] **Step 1: Add the required `runLabel` prop to the mount contract**

In `src/app/warCouncilMount.ts`, insert into `WarCouncilMountProps` immediately after `maxHealth`:

```ts
  /** AC6 — which fight of the run this is, ALREADY WORDED by the run layer. A string, not a
   *  `RunState`: the card layer renders the run's position and must not be able to read or change
   *  it. Required rather than optional deliberately, so the compiler enumerates every mount site
   *  instead of letting one silently render an empty band. */
  readonly runLabel: string
```

- [x] **Step 2: Render it in the status band, anchored beside the opponent plate**

In `src/app/warCouncil/RoundStatusBand.tsx`, add `readonly runLabel: string` to `RoundStatusBandProps`, add `runLabel` to the destructured parameters, and insert this block immediately after the closing `</div>` of `.wc-plate`:

```tsx
      <div className="wc-run">
        <span className="wc-plate-label">Run</span>
        <span className="wc-run-value">{runLabel}</span>
      </div>
```

- [x] **Step 3: Pass it through the mount**

In `src/app/warCouncil/WarCouncilRound.tsx`, add `runLabel` to the destructured props of `WarCouncilRound`, and add `runLabel={runLabel}` to the `<RoundStatusBand … />` element.

- [x] **Step 4: Style the new band block**

In `src/app/warCouncil/warCouncil.css`, immediately after the `.wc-plate-label` rule, add:

```css
/* DLR-82 AC6 — the run position, edge-anchored beside the opponent plate rather than drifting
   toward the centre, which game-ux names as the mistake that cramps the play area. */
.wc-run {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: clamp(0.35rem, 1vmin, 0.6rem) clamp(0.5rem, 1.4vmin, 0.85rem);
  background: var(--wc-chamber-lift);
  border: 1px solid var(--wc-brass-dim);
  border-radius: 2px;
  white-space: nowrap;
}

.wc-run-value {
  font-family: var(--wc-serif);
  font-size: clamp(0.85rem, 2.1vmin, 1.15rem);
  color: var(--wc-brass);
  line-height: 1;
}
```

- [x] **Step 5: Supply the prop at all three existing test mount sites**

Append to `src/app/warCouncil/__tests__/roundFixture.ts`:

```ts
/** A fixed run readout for component specs (AC6). */
export const runLabelFixture = 'Fight 1 of 3'
```

Then add `runLabel` to each construction site: in `WarCouncilRound.test.tsx`, import `runLabelFixture` and add `runLabel={overrides.runLabel ?? runLabelFixture}` to the `renderRound` helper's element; in `WarCouncilRound.duelHealthBars.test.tsx`, import it and add `runLabel={runLabelFixture}` to the inline element at lines 32-38 and `runLabel: runLabelFixture,` to the props object at lines 152-158.

- [x] **Step 6: Typecheck and run the affected component specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`
Expected: both exit 0; Vitest reports 0 failed. A `Property 'runLabel' is missing` error names a mount site Step 5 missed — fix it rather than making the prop optional.

### Task 6: Delete the felt's terminal hand panel ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:173-186`, `src/app/warCouncil/WarCouncilRound.tsx:206-214`, `src/app/warCouncil/WarCouncilRound.tsx:261-265`
- Modify: `src/app/warCouncil/RoundOverPanel.tsx:1-3`, `src/app/warCouncil/RoundOverPanel.tsx:12-19`, `src/app/warCouncil/RoundOverPanel.tsx:32-80`
- Modify: `src/app/warCouncil/labels.ts:82-88`
- Modify: `src/app/warCouncil/warCouncilHealthBars.css:91-107`
- Test: `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx:25-30`, `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx:45-55`

- [x] **Step 1: Remove the `encounterOver` branch from the felt's render chain**

In `src/app/warCouncil/WarCouncilRound.tsx`, delete the entire first branch of the `felt` chain — the `if (encounterOver) { … }` block and its preceding comment (lines 173-186) — so the chain now opens `if (ui.cpuFault) {`. Replace the deleted comment with this note above the chain:

```tsx
  // DLR-82: a resolved encounter NO LONGER renders a terminal panel here. The run verdict is
  // `src/app/run/RunOutcomePanel.tsx`, owned by `App`, and the tap that clears the deciding
  // trick reports upward through `handleCarryOn` — whose first line already tests `encounterOver`.
  // Consequence worth knowing: the trick that ends a fight now gets its own reveal beat, which
  // the old branch ordering deliberately skipped.
  let felt: ReactNode
```

- [x] **Step 2: Drop the now-dead `winner` prop from the remaining `RoundOverPanel` call**

In the same file, the `else if (roundComplete)` branch renders `<RoundOverPanel … winner={null} … />`. Remove the `winner={null}` line, leaving `tricksWon`, `handSummary` and `onFinish`.

- [x] **Step 3: Widen the felt's click target so a finished encounter always has somewhere to tap**

Still in `WarCouncilRound.tsx`, in the `<section className={\`wc-table…\`} …>` element, replace both occurrences of the condition `ui.resolvedTrick || quarryToLead` with `ui.resolvedTrick || quarryToLead || encounterOver`:

```tsx
      <section
        className={`wc-table${ui.resolvedTrick || quarryToLead || encounterOver ? ' wc-is-waiting' : ''}`}
        aria-live="polite"
        onClick={
          ui.resolvedTrick || quarryToLead || encounterOver ? handleCarryOn : undefined
        }
      >
```

This closes the one gap Step 1 opens: an encounter resolving with no trick held and the hand not complete would otherwise render a felt with no control on it.

- [x] **Step 4: Reduce `RoundOverPanel` to the between-hands tally it now solely is**

In `src/app/warCouncil/RoundOverPanel.tsx`: remove `winner` from `RoundOverPanelProps` and from the destructured parameters; remove the `DuelSide` import and the `ENCOUNTER_OUTCOME` import (keep `FINISH_ROUND_LABEL`); replace the conditional heading with the constant `<h2>The hand is over</h2>`; and replace the trailing `{winner !== null ? (…) : (…)}` ternary with just the actions block:

```tsx
      <div className="wc-actions">
        <button type="button" className="wc-decline" onClick={onFinish}>
          {FINISH_ROUND_LABEL}
        </button>
      </div>
```

Update the component's docblock to state that DLR-82 removed the terminal branch and that a resolved encounter is now `RunOutcomePanel`'s.

- [x] **Step 5: Delete `ENCOUNTER_OUTCOME` and the `.wc-terminal` rule, whose only reader was that branch**

Delete `src/app/warCouncil/labels.ts:82-88` (the `ENCOUNTER_OUTCOME` docblock and constant). Delete the `.wc-terminal` rule at `src/app/warCouncil/warCouncilHealthBars.css:101-107`, and correct the section comment above `.wc-actions` (lines 91-92), which names an apply/finish control and a terminal state that no longer exist, to read:

```css
/* ---------- the between-hands panel's single control. The terminal branch this block also
   served was deleted on DLR-82: a resolved encounter is now the run verdict's. ---------- */
```

- [x] **Step 6: Remove the three `winner`-dependent tests**

In `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx`: delete the `titles the panel by whether the encounter has resolved` test (lines 25-30) and both terminal-outcome tests (lines 45-55); remove the now-unused `DuelSide` import; and remove `winner={null}` from every remaining `render`/`rerender` call. Add one test in their place:

```tsx
  it('always offers the next-hand control — a resolved encounter no longer renders here (DLR-82)', () => {
    render(<RoundOverPanel {...baseProps} />)
    expect(screen.getByRole('heading').textContent).toBe('The hand is over')
    expect(screen.getByRole('button', { name: 'Deal the next Hunt' })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })
```

- [x] **Step 7: Typecheck, lint, and run every `src/app/warCouncil/` spec**

Run: `npm run typecheck; npm run lint; npx vitest run src/app/warCouncil/__tests__/`
Expected: all exit 0; Vitest reports 0 failed. A TypeScript error naming `winner` points at a call site Step 2 or Step 6 missed.

### Task 7: Rewrite `src/App.tsx` as the run driver ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/App.tsx` (whole file)

- [x] **Step 1: Replace the file's contents**

Replace all of `src/App.tsx` with:

```tsx
import { useState } from 'react'
import {
  advanceRun,
  canAdvanceRun,
  DuelSide,
  isEncounterResolved,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  recordEncounter,
  SLICE_QUARRY_CHARACTER,
  startRun,
  type Hunt,
} from './hunt'
import { dealRound, PlayerSide, type WarCouncilState } from './warCouncil'
// Imported from `./app/warCouncilMount` directly, NOT from the `./app` barrel: `./app`
// extensionless collides case-insensitively with this very file (`App.tsx`) on Windows —
// the same NTFS trap `duelHealthBars.ts`/`DuelHealthBars.tsx` hit — and would resolve here
// instead of to the barrel, which does not export this type.
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import { dealerForRound } from './app/dealerForRound'
import RunOutcomePanel, { type TrickTally } from './app/run/RunOutcomePanel'
import { runProgressText } from './app/run/runLabels'

// Built once at module scope because its only half is a configuration constant — it holds no
// per-run state, so it cannot go stale across the remounts below. Every fight of the run faces
// the same character: DLR-82 changes only each Quarry's health, and the roster is DLR-85's.
const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

const NO_TRICKS: TrickTally = { taken: 0, lost: 0 }

/**
 * The run driver (DLR-82). Owns `RunState` and switches on it: while the encounter is live it
 * mounts the felt exactly as before, and once an encounter resolves it mounts the run verdict
 * instead.
 *
 * Holds NO effect. Every transition below is a callback fired from a control, so there is no
 * listener, timer or subscription to clean up, and StrictMode's development double-mount only
 * re-runs the pure lazy initialisers.
 *
 * `hand` is monotonic across the WHOLE run, never reset per fight: it is React's remount `key`,
 * so every hand must have a distinct one, and it feeds `dealerForRound`'s parity, so counting on
 * across a fight boundary keeps the dealer alternating naturally.
 */
function App() {
  const [run, setRun] = useState(startRun)
  const [hand, setHand] = useState(1)
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealRound(dealerForRound(1), Math.random),
  )
  // The deciding hand's trick split, captured when an encounter resolves so the verdict can show
  // it. Nothing accumulates tricks across the several hands a fight takes, so this is the last
  // hand's, which is the only figure that exists.
  const [tricks, setTricks] = useState<TrickTally>(NO_TRICKS)

  const encounterOver = isEncounterResolved(run.encounter)

  // Read from config, never written as numbers, and derived from the SAME index the encounter was
  // started from — so a bar's denominator cannot disagree with its opening value. Not a module
  // constant any more: the Quarry's maximum changes with every fight of the run.
  const maxHealth = {
    [DuelSide.Player]: PLAYER_START_HEALTH,
    [DuelSide.Quarry]: quarryHealthForEncounter(run.encounterIndex),
  }

  function dealNextHand() {
    const next = hand + 1
    setHand(next)
    setDealt(dealRound(dealerForRound(next), Math.random))
  }

  function handleComplete(result: WarCouncilRoundResult) {
    const next = recordEncounter(run, result.encounter)
    setRun(next)
    if (isEncounterResolved(next.encounter)) {
      setTricks({
        taken: result.finalState.tricksWon[PlayerSide.Player],
        lost: result.finalState.tricksWon[PlayerSide.Cpu],
      })
      return // The verdict is next, not another hand.
    }
    dealNextHand()
  }

  function handleNextFight() {
    setRun(advanceRun(run))
    setTricks(NO_TRICKS)
    dealNextHand()
  }

  function handleNewRun() {
    const fresh = startRun()
    setRun(fresh)
    setTricks(NO_TRICKS)
    setHand(1)
    setDealt(dealRound(dealerForRound(1), Math.random))
  }

  if (encounterOver) {
    return (
      <RunOutcomePanel
        outcome={run.outcome}
        encounterIndex={run.encounterIndex}
        encounterCount={run.encounterCount}
        carriedHealth={run.encounter.health[DuelSide.Player]}
        tricks={tricks}
        canContinue={canAdvanceRun(run)}
        onNextFight={handleNextFight}
        onNewRun={handleNewRun}
      />
    )
  }

  return (
    <WarCouncilRound
      key={hand}
      initialState={dealt}
      hunt={HUNT}
      encounter={run.encounter}
      maxHealth={maxHealth}
      runLabel={runProgressText(run.encounterIndex, run.encounterCount)}
      onComplete={handleComplete}
    />
  )
}

export default App
```

- [x] **Step 2: Typecheck, lint, and run the whole `src/app/` and `src/hunt/` suite**

Run: `npm run typecheck; npm run lint; npx vitest run src/hunt/__tests__/ src/app/`
Expected: all exit 0; Vitest reports 0 failed.

- [x] **Step 3: Confirm no tuning value was hard-coded into the driver**

Run: `Select-String -Path src\App.tsx -Pattern "\b(10|14|18)\b"`
Expected: zero hits. Every health figure reaches `App` through `run.encounter` or `quarryHealthForEncounter`; a literal here means a config read was inlined.

- [x] **Step 4: Measure the rewritten file**

Run: `(Get-Content src\App.tsx).Count`
Expected: under 400.

---

## Phase 4 — Final verification

No production changes. Only cumulative sanity checks, the static gates, the unfiltered suite, and the build.

### Task 8: Confirm the pure-core boundary and the deliberate non-consumers still hold ✓

- Skill: `none — verification only, no code is written`

**Files:**
- Test: *(none — greps only)*

- [x] **Step 1: Grep the pure tree for a React import or a DOM global**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits. `-Recurse` with `Get-ChildItem` is mandatory — `Select-String -Path 'src\hunt\**\*.ts'` reaches only one directory level and would silently miss `src\hunt\__tests__\`.

- [x] **Step 2: Confirm `ENCOUNTER_PLAYER_RESTORE` is still read by nothing**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "ENCOUNTER_PLAYER_RESTORE"`
Expected: exactly 4 hits, all in `src\hunt\config.ts`, `src\hunt\index.ts` and `src\hunt\__tests__\config.test.ts`. Any hit in `src\app\`, `src\App.tsx` or `src\hunt\run.ts` means a restore was wired in, which DLR-82 forbids. **QA result: 7 hits — the 3 extra are documentation comments in `src/hunt/encounter.ts:20` and `src/hunt/run.ts:77` explaining the restore is deliberately unread; neither file imports or reads the constant, so the guard holds in substance.**

- [x] **Step 3: Confirm the deleted names are gone everywhere**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "ENCOUNTER_OUTCOME|wc-terminal|SLICE_ENCOUNTER_INDEX"`
Expected: zero hits. These bind by string across TS and CSS, so the compiler catches none of them. **QA result: zero hits.**

- [x] **Step 4: Confirm no viewport-unit trap in the new stylesheet**

Run: `Get-ChildItem src -Recurse -Include *.css | Select-String -Pattern "100vh|100vw"`
Expected: zero hits. `game-ux`'s hard floor: `100vh` measures the toolbar-retracted viewport and `100vw` includes the scrollbar. **QA result: 1 hit — a comment in `run.css:3` forbidding the very pattern it names; no live declaration.**

### Task 9: Static gates, full suite, and the file-size budget ✓

- Skill: `none — verification only, no code is written`

**Files:**
- Test: *(none — runners only)*

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\run.ts,src\app\run\RunOutcomePanel.tsx,src\app\run\runLabels.ts,src\app\run\run.css,src\App.tsx,src\app\warCouncil\WarCouncilRound.tsx,src\app\warCouncil\RoundOverPanel.tsx,src\app\warCouncil\warCouncil.css | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400. `WarCouncilRound.tsx` began at 299 and only shrinks in Phase 3; `warCouncil.css` is the one to watch, since it already carries a note about having been split once. **QA result: `run.ts` 110, `RunOutcomePanel.tsx` 109, `runLabels.ts` 59, `run.css` 155, `App.tsx` 127, `WarCouncilRound.tsx` 293, `RoundOverPanel.tsx` 68, `warCouncil.css` 393 (plus the unplanned `warCouncilHand.css` 46) — all under budget.**

- [x] **Step 2: Warm the Vitest cache one project at a time, then run the unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm test`
Expected: all three exit 0, Vitest reporting 0 failed. The split first run is deliberate — a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is jsdom setup starving the pool, **not** a failing test. Only a second consecutive timeout is a real problem. **QA result: `--project node` 28 files / 401 tests passed; `--project dom` 13 files / 74 tests passed; `npm test` 41 files / 475 tests passed, exit 0.**

- [x] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. **QA result: both exit 0 — typecheck no output, lint zero errors/warnings.**

- [x] **Step 4: Check formatting of the files this contract touched**

Run: `npx prettier --check src/hunt/run.ts src/hunt/config.ts src/hunt/encounter.ts src/hunt/index.ts src/App.tsx src/app/warCouncilMount.ts src/app/run/ src/app/warCouncil/RoundOverPanel.tsx src/app/warCouncil/RoundStatusBand.tsx src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/labels.ts src/app/warCouncil/warCouncil.css src/app/warCouncil/warCouncilHealthBars.css`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no current contract has touched, and fixing those is not this contract's work. **QA initially found 2 failures (`src/hunt/run.ts`, `src/app/warCouncil/WarCouncilRound.tsx`); fixed in the review pass with `npx prettier --write` on both files (plus `warCouncilHand.css` added to the scope) — re-run confirmed exit 0, "All matched files use Prettier code style!"**

- [x] **Step 5: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. **QA result: exit 0; `dist/index.html`, `dist/assets/index-*.css` (20.05 kB), `dist/assets/index-*.js` (224.35 kB), no bundler errors.**

### Task 10: Functional pass in a real browser ✓

- Skill: `none — QA drives the running app; the Implementer does not run this task`

**Files:**
- Test: *(none — browser verification)*

- [x] **Step 1: Drive a run through the `chrome-devtools` MCP and check the questions that have right answers** — QA executed this. Status band read `Fight 1 of 3` on load, `Fight 2 of 3` after advancing; deciding trick got its own reveal, one tap reached the verdict; health carried into fight 2 at 5/10 (not reset to 10); Quarry's bar opened fight 2 at 14/14, its own configured maximum; loss screen offered only "Start a new run"; console clean throughout. Confirmed with no page scroll at 1920×1080 and 1366×768; **390×844 could not be driven** (Chrome floored the window at ~500px width) — recorded as outstanding for the developer, not a failure.

Start the app detached per `.claude/workflow/web-project.md` (`--port 5199 --strictPort`), then verify:

- the status band reads `Fight 1 of 3` on load (AC6), and reads `Fight 2 of 3` after the first fight is won;
- the deciding trick is visible before the verdict appears, and a tap on the felt reaches the verdict — **one tap, not two**;
- the verdict headline, the trick bars, the carried-health line and exactly one control all render, with no page scroll, at **1920×1080**, **1366×768** and **390×844** (`game-ux` requires the sizes checked to be named in the report);
- continuing carries health: the player's bar opens the next fight at the value it ended the last one on, **not** at 10 (AC3);
- the Quarry's bar opens the second fight at its own configured maximum, not the first fight's (the denominator bug this plan guards against);
- losing offers **no** next-fight control (AC4), and the run-won screen is distinguishable from an intermediate fight win (AC5);
- the console is clean throughout — no `RangeError` from `advanceRun`, `quarryHealthForEncounter` or `startEncounter`.

Expected: every item as described. Report the viewport sizes checked.

### Task 11: Update the PR description ✓

- Skill: `none — documentation for the developer`

**Files:**
- Create: `.claude/contract/DLR-82-play-fights-in-sequence-on-one-health-bar/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder, and the Jira key DLR-82.
- A summary of the change: the run module, the derived run length, the verdict screen, and the deletion of the felt's terminal hand panel.
- Every decision the developer must make and every behaviour they must judge by playing — copy the "Developer decides or observes" block from this file's File map verbatim.
- Verification results from Phases 1-4, quoting the actual Vitest summary line and the exit codes.
- A one-line note for future contributors on the two conventions introduced: run rules live in `src/hunt/run.ts` and never in a component, and the card layer receives the run's position as a pre-formatted `runLabel` string rather than as `RunState`.
- A pointer to **DLR-85**, which must rename the verdict's copy to the Irish roster ("Aoife defeated" / "Fight Cillian") in the same change that lands the run map — its description already carries the note.

---

## Self-review

(Filled by the planner before handing off so the executor can confirm coverage.)

**Spec coverage:**
- *Run state holding the encounter sequence and the carried health* (AC1, AC3) — Task 2.
- *A configured rising enemy-health curve with at least three fights* (AC1) — Task 1.
- *The transition from a won encounter into the next one, and the screen state that offers it* (AC2) — Tasks 2 (`advanceRun`, `canAdvanceRun`), 4 (the control), 7 (the driver).
- *Run-lost and run-won end states* (AC4, AC5) — Tasks 2 (`outcomeFor`), 4 (the three verdicts), 7.
- *The player can see which fight of the run they are on* (AC6) — Tasks 3 (`runProgressText`), 5 (the status band), 4 (the verdict's position line).
- *Existing encounter behaviour unchanged* (AC7) — enforced by scope: no file under `src/warCouncil/` is in any `**Files:**` block, and Tasks 5-6 touch `src/app/warCouncil/` only for a pass-through prop and the terminal-branch deletion. Task 9 Step 2 runs the whole suite as the check.
- *The developer's play-session feedback — a clear win/lose* — Tasks 3, 4, 6 (deleting the surface it failed on), 7.
- *Deletion of the felt's terminal panel* (gate ruling, 2026-08-15) — Task 6.
- *Tricks-taken bars on the verdict* (gate ruling, 2026-08-15) — Tasks 3 (`tricksTakenText`), 4 (the bars), 7 (capturing the split).
- *Generic copy, no Quarry name* (gate ruling, 2026-08-15) — Task 3, pinned by its "names no Quarry" test.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`, `node_modules/` or `dist/`. No step invents a tuning value — the curve is a documented placeholder routed to the developer in the File map. No `eslint-disable` appears anywhere.

**Type / name consistency:** `RunState`, `RunOutcome` (`InProgress` / `Won` / `Lost`), `startRun`, `recordEncounter`, `canAdvanceRun`, `advanceRun`, `TrickTally` (`taken` / `lost`), `runProgressText`, `runHeadline`, `runVerdictDetail`, `tricksTakenText`, `TRICKS_TAKEN_LABEL`, `CARRIED_HEALTH_LABEL`, `NEXT_FIGHT_LABEL`, `NEW_RUN_LABEL`, `runLabel`, `runLabelFixture`, and the `run-*` CSS class names are spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes. One deliberate refinement of the plan's sketch: `RUN_HEADLINE` as a `Record` became the `runHeadline(outcome)` function, because the `Record` needed an unreachable `InProgress` entry to stay total — the function switches exhaustively instead, which is what `plan.md` intended. Deleted names (`ENCOUNTER_OUTCOME`, `.wc-terminal`, `SLICE_ENCOUNTER_INDEX`, `MAX_HEALTH`, `RoundOverPanelProps.winner`) appear in no task after the one that removes them, and Task 8 Step 3 greps for the three that bind by string.

**Phase boundary cleanliness:**
- *Phase 1* ends with `src/hunt/run.ts` written, exported and green, consumed by nothing; the app behaves exactly as before, and the config change plus every assertion it falsifies land inside Task 1, so no boundary sits mid-rename.
- *Phase 2* ends with `src/app/run/` complete and tested, imported by nothing; no dangling import and no half-wired screen.
- *Phase 3* ends with the app coherent again. It is explicitly a single stopping point — between Tasks 6 and 7 the terminal panel is gone before `App` can show a verdict, which type-checks but is not worth stopping on, and the phase framing says so.
- *Phase 4* changes no production code, so it cannot break a boundary.
