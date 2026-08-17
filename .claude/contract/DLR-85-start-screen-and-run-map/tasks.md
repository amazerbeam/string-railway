# Tasks: Start screen and run map showing the path to the final boss

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-17
Finished: 2026-08-17

> **All thirteen tasks landed and every gate is green** — typecheck 0, lint 0, `Tests 634 passed (634)`
> across 50 files, prettier clean on the contract's files, production build 0, no file over 400 lines,
> the pure-core boundary grep clean, and `CONTINUE_LABEL` gone from every reader.
>
> **One acceptance criterion ships UNMET, and it needs a developer decision: AC11.** The path is wider
> than the viewport below about 1088px and `.run-shell` is `overflow: hidden`, so it **crops silently** —
> 21/25 nodes at 1024×768, 16/25 at 768×1024, 14/25 at 500×844 (losing Diarmuid, plus a truncated title
> and action button). AC3 was also broken on first implementation — the per-stage node list had no CSS
> rule, so the path rendered as a 5×5 vertical grid while all 633 tests passed — and **fixing AC3 is what
> revealed the AC11 crop**, which the broken-but-more-compact layout had been hiding. AC1 and AC3–AC10
> were confirmed working live in a browser, including a run played to a real loss and restarted.
>
> The three fixes for AC11 named by `plan.md` — a smaller name font, a steeper name angle, or letting the
> path be the one horizontally-scrolling region — are all tuning or layout decisions that are the
> developer's, so none was applied.

**Goal:** Give the run a visible shape — a start screen showing the whole path to Diarmuid, a map reachable between fights, and every opponent named on it and on every run-level surface — with the path generated from the run's own configuration and the run extended to its full twenty-five fights.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (published at https://claude.ai/code/artifact/fb98f3b4-0003-425f-b822-d9689153818e), approved at the planning gate 2026-08-17.

---

## File map

**Created:**
- `src/hunt/runPath.ts` — the pure path model: stages derived from boss position, nodes tagged beaten / current / upcoming
- `src/hunt/__tests__/runPath.test.ts` — exhaustive unit coverage of `runPath`, including the three-ordinary-no-boss case
- `src/app/run/RunMap.tsx` — the horizontal path diagram; computes nothing
- `src/app/run/RunPathScreen.tsx` — title + goal + `RunMap` + one action; serves both the start screen and the between-fights map
- `src/app/run/runMap.css` — the path's own classes; reuses `.run-shell` and `.run-btn` from `run.css`
- `src/app/run/__tests__/RunMap.test.tsx` — node kinds, the three states, names, the accessible group
- `src/app/run/__tests__/RunPathScreen.test.tsx` — title, goal, action label, action fires
- `src/__tests__/App.test.tsx` — AC1: the start screen precedes the felt

**Modified:**
- `src/hunt/config.ts` — `OpponentKind`, the two roster lists, `RunEncounterConfig`, the four tunables, `buildRunEncounters`, `RUN_ENCOUNTERS`, `QUARRY_ENCOUNTER_HEALTH` becomes a projection, `runEncounterAt`, `quarryHealthForEncounter` body
- `src/hunt/__tests__/config.test.ts` — coverage for the new keys and the projection invariant
- `src/hunt/run.ts` — add `beatenCount`
- `src/hunt/__tests__/run.test.ts` — coverage for `beatenCount`
- `src/hunt/index.ts` — barrel exports for everything new
- `src/app/run/runLabels.ts` — add `fightLabel`, `runGoalText`, `runPositionLabel`, five copy constants; widen `runHeadline` and `runVerdictDetail`; delete `CONTINUE_LABEL`
- `src/app/run/__tests__/runLabels.test.ts` — follows both signature changes and the deletion
- `src/app/run/RunOutcomePanel.tsx` — `beatenName`, `nextName`, `onMap` props; named headline; named primary control; third `Map` control
- `src/app/run/__tests__/RunOutcomePanel.test.tsx` — follows the prop and label changes
- `src/app/run/ShopPanel.tsx:147` — leave control names the next opponent, falling back to `NEXT_FIGHT_LABEL`
- `src/app/run/__tests__/ShopPanel.test.tsx` — follows the leave-label change
- `src/App.tsx` — `BetweenPhase` → `RunPhase` widened with `Start` and `Map`; roster reads; wires both new surfaces

**Deleted:** *(none — `CONTINUE_LABEL` is a removed export, not a removed file)*

**Developer decides or observes:**
- `src/hunt/config.ts` → **`BOSS_HEALTH_MULTIPLIER`** — ships at `1.5`, the one number in this contract nobody has chosen. Trades boss difficulty spike against a run that is already not winnable.
- `src/hunt/config.ts` → **`ORDINARY_HEALTH_BASE` / `ORDINARY_HEALTH_STEP`** — ship at `10` / `4`, reverse-engineered to reproduce the existing `10, 14, 18`. Confirm that curve is still what you want across twenty-five fights rather than three.
- `src/hunt/config.ts` → **`ORDINARY_PER_STAGE`** — ships at `4`, from the sketch.
- `src/app/run/runMap.css` → **every `clamp()` bound, the -52° name angle, the name font size, and the three state colours.** The angle and font size are the two that decide whether twenty-five names fit at a narrow viewport.
- `src/app/run/runLabels.ts` → **all new copy**: `START_TITLE` (`'The Hunt'`), `MAP_TITLE` (`'The path'`), `MAP_LABEL` (`'Map'`), `MAP_BACK_LABEL` (`'Back'`), `runGoalText`'s `'Beat all 25'`, and the `'<name> defeated'` headline that replaces `FIGHT WON`.
- **Whether the start screen's button should read `Fight Aoife` or `Begin run`.** The contract ships `Fight Aoife` (AC8 over AC1's phrasing), with the title carrying the "this is the start" framing.
- **Whether the two coexisting rosters are acceptable for one release** — "Aoife" on the map versus "The Monarch" in the fight screen's dossier and "The Quarry's health" on its bar. The ticket names that as a separate ticket; this is the moment to pull it in instead.
- **Whether the run feels right at twenty-five fights.** It is expected to be lost in stage one or two, and `YOU WIN` is effectively unreachable in play — checking that copy needs the run temporarily shortened.
- **Whether the map reads at a glance** — whether five stages of four ticks and a block communicate "five stages" without counting.

---

## Phase 1 — The run's sequence becomes one configured source

Everything downstream reads `RUN_ENCOUNTERS`, so it lands first and alone. The phase is a safe stopping point because `QUARRY_ENCOUNTER_HEALTH` keeps its name, type, and its first three values while gaining twenty-two more — every one of its twenty-eight existing readers compiles and passes untouched, which the phase's own test step proves before anything renders a path.

### Task 1: Add the roster, the kind union, and the configured run sequence to `src/hunt/config.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/config.ts:1-45` — insert above the existing `QUARRY_ENCOUNTER_HEALTH` declaration and rewrite it as a projection
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — adds `ORDINARY_PER_STAGE`, `ORDINARY_HEALTH_BASE`, `ORDINARY_HEALTH_STEP`, `BOSS_HEALTH_MULTIPLIER` (all four values are developer decisions, documented placeholders)

- [x] **Step 1: Insert the kind union, the two roster lists, the encounter type, the four tunables, and the builder — ABOVE the existing `QUARRY_ENCOUNTER_HEALTH`**

Placement is load-bearing: `QUARRY_ENCOUNTER_HEALTH` will read `RUN_ENCOUNTERS` at module-evaluation time, and module-level `const` initialisation runs in declaration order. Declared below, `RUN_ENCOUNTERS` is `undefined` and `.map` throws at import.

Insert immediately after the `PLAYER_START_HEALTH` block (currently ending at line 15):

```ts
/** DLR-85 AC3 — whether a path entry is an ordinary opponent (a tick) or a stage boss
 *  (a filled block). The ONLY two node types; the ticket puts rewards, shops and events
 *  off the path explicitly. */
export const OpponentKind = {
  Ordinary: 'ordinary',
  Boss: 'boss',
} as const
export type OpponentKind = (typeof OpponentKind)[keyof typeof OpponentKind]

/**
 * DLR-85 AC4 — the ordinary opponents, in run order. THE DEVELOPER'S LIST, 2026-08-15,
 * replacing the deck-rank names (Swan, Fox, Woodcutter, Witch, Monarch) the design used
 * until now. Ten women and ten men. `as const` so an index read is a string literal
 * rather than a possibly-undefined element.
 *
 * Fadas are ordinary Unicode and need NO special handling. The ticket records plain
 * anglicisations as a fallback; nothing here implements one, because nothing needs to.
 */
export const ORDINARY_OPPONENT_NAMES = [
  'Aoife',
  'Cillian',
  'Niamh',
  'Eoin',
  'Saoirse',
  'Rónán',
  'Maeve',
  'Fergus',
  'Órla',
  'Declan',
  'Sinéad',
  'Pádraig',
  'Bríd',
  'Lorcán',
  'Clodagh',
  'Tadhg',
  'Róisín',
  'Cormac',
  'Aisling',
  'Oisín',
] as const

/** The five stage bosses, in order. Diarmuid closes the run and is the boss the design
 *  intends to ignore follow-suit — that power is a later ticket's, not this one's. */
export const STAGE_BOSS_NAMES = [
  'Bréanainn',
  'Muireann',
  'Conchobhar',
  'Gráinne',
  'Diarmuid',
] as const

/** One encounter of the run: who it is, what they are, and how much health they hold. */
export interface RunEncounterConfig {
  readonly name: string
  readonly kind: OpponentKind
  readonly health: Health
}

// How many ordinary opponents precede each stage boss. From the developer's sketch
// (2026-08-15): four ticks then a block, five times over. `runPath` NEVER reads this — a
// stage is derived from where a boss actually sits, so changing this reshapes the run
// without touching the path model.
// UNIT: ordinary opponents per stage. VALUE: the developer's.
export const ORDINARY_PER_STAGE = 4

// The health curve's three tunables. PLACEHOLDER VALUES: twenty-five hand-written figures
// would be twenty-five tuning decisions, so the SHAPE is here and the NUMBERS are the
// DEVELOPER'S — see this contract's tasks.md, "Developer decides or observes".
//
// BASE and STEP are chosen to reproduce DLR-82's existing curve EXACTLY at indices 0..2:
// 10, 14, 18. Entry 0's 10 is the developer's measured value (2026-08-14, PT-002, where
// the encounter lasted ~1.9 hands and random legal play won 63.8%) and this formula does
// not disturb it. BOSS_HEALTH_MULTIPLIER is the only genuinely new number.
//
// The run is NOT expected to be winnable on these values — Oisín holds 86 and Diarmuid
// 129 against a player starting on 10. DLR-82 already recorded that the answer is the
// shop and later stories, NOT raising PLAYER_START_HEALTH.
// UNIT: health points; health points per ordinary step; unitless multiplier.
export const ORDINARY_HEALTH_BASE: Health = 10
export const ORDINARY_HEALTH_STEP: Health = 4
export const BOSS_HEALTH_MULTIPLIER = 1.5

/**
 * `[ORDINARY_PER_STAGE × Ordinary, Boss]`, repeated until either roster list runs out —
 * so the two name lists are the run's length ceiling and no index can go out of range.
 *
 * An ordinary opponent's health is BASE + STEP × (how many ordinary opponents precede it);
 * a boss's is that same figure times the multiplier, `Math.round`ed so no fractional
 * health can reach a heart row that renders whole hearts.
 */
function buildRunEncounters(): readonly RunEncounterConfig[] {
  const encounters: RunEncounterConfig[] = []
  let ordinariesUsed = 0
  for (const bossName of STAGE_BOSS_NAMES) {
    for (let i = 0; i < ORDINARY_PER_STAGE; i += 1) {
      const name = ORDINARY_OPPONENT_NAMES[ordinariesUsed]
      if (name === undefined) break
      encounters.push({
        name,
        kind: OpponentKind.Ordinary,
        health: ORDINARY_HEALTH_BASE + ORDINARY_HEALTH_STEP * ordinariesUsed,
      })
      ordinariesUsed += 1
    }
    encounters.push({
      name: bossName,
      kind: OpponentKind.Boss,
      health: Math.round(
        (ORDINARY_HEALTH_BASE + ORDINARY_HEALTH_STEP * ordinariesUsed) * BOSS_HEALTH_MULTIPLIER,
      ),
    })
  }
  return encounters
}

/**
 * THE run's sequence — AC2's "the same source the run itself reads", literally rather than
 * approximately. Its length IS the run's length, its `kind` positions decide the stages,
 * and its `health` figures are what QUARRY_ENCOUNTER_HEALTH projects.
 *
 * MUST stay declared above QUARRY_ENCOUNTER_HEALTH: that projection reads this at module
 * init, and a forward reference evaluates as `undefined` and throws on `.map`.
 *
 * Still a plain array. Replacing the builder with twenty-five explicit literals later is a
 * local edit with no consumer change.
 */
export const RUN_ENCOUNTERS: readonly RunEncounterConfig[] = buildRunEncounters()
```

- [x] **Step 2: Rewrite `QUARRY_ENCOUNTER_HEALTH` as a projection and route its range guard through one accessor**

Replace the existing `QUARRY_ENCOUNTER_HEALTH` declaration and the body of `quarryHealthForEncounter` (currently lines 17-40). Keep every existing comment about the values being the developer's — it is still true, now one level up.

```ts
// The Quarry's health, one entry per encounter, in run order — now a PROJECTION of
// RUN_ENCOUNTERS rather than a hand-written literal (DLR-85). A second array beside the
// roster is the source that drifts: a fourth name with only three healths would render a
// fourth node for a fight that throws the moment the player reached it.
// Opens 10, 14, 18 exactly as it did before DLR-85.
// UNIT: health points, indexed 0..n-1 by encounter.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = RUN_ENCOUNTERS.map((e) => e.health)

/**
 * THE range guard for the run's sequence, in one place. Throws a `RangeError` rather than
 * returning `undefined` for the reason this module already gave: an out-of-range index
 * becomes `NaN` on the first subtraction and vanishes from a health bar with no error
 * logged anywhere. A bad index is a caller bug.
 */
export function runEncounterAt(index: number): RunEncounterConfig {
  const encounter = RUN_ENCOUNTERS[index]
  if (encounter === undefined) {
    throw new RangeError(
      `No opponent configured for encounter ${index} (${RUN_ENCOUNTERS.length} configured)`,
    )
  }
  return encounter
}

/** Unchanged signature and behaviour; the guard now lives in `runEncounterAt` so it is
 *  stated once rather than twice. */
export function quarryHealthForEncounter(index: number): Health {
  return runEncounterAt(index).health
}
```

- [x] **Step 3: Add config coverage for the projection invariant, the roster, and the guard**

Append to `src/hunt/__tests__/config.test.ts`. The projection invariant is the important one — it is what stops the two ever drifting.

```ts
describe('RUN_ENCOUNTERS (DLR-85)', () => {
  it('is the source QUARRY_ENCOUNTER_HEALTH projects, entry for entry', () => {
    expect(QUARRY_ENCOUNTER_HEALTH).toEqual(RUN_ENCOUNTERS.map((e) => e.health))
    expect(ENCOUNTERS_PER_RUN).toBe(RUN_ENCOUNTERS.length)
  })

  it('preserves DLR-82’s measured opening curve', () => {
    expect(QUARRY_ENCOUNTER_HEALTH.slice(0, 3)).toEqual([10, 14, 18])
  })

  it('runs four ordinary opponents to a boss, five stages over, closing on Diarmuid', () => {
    expect(RUN_ENCOUNTERS).toHaveLength(25)
    expect(RUN_ENCOUNTERS.filter((e) => e.kind === OpponentKind.Boss)).toHaveLength(5)
    const last = RUN_ENCOUNTERS[RUN_ENCOUNTERS.length - 1]
    expect(last?.kind).toBe(OpponentKind.Boss)
    expect(last?.name).toBe('Diarmuid')
  })

  it('names every entry from the roster, without reuse', () => {
    const names = RUN_ENCOUNTERS.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
    for (const e of RUN_ENCOUNTERS) {
      const roster = e.kind === OpponentKind.Boss ? STAGE_BOSS_NAMES : ORDINARY_OPPONENT_NAMES
      expect(roster).toContain(e.name)
    }
  })

  it('gives every entry a positive finite health', () => {
    for (const e of RUN_ENCOUNTERS) {
      expect(Number.isFinite(e.health)).toBe(true)
      expect(e.health).toBeGreaterThan(0)
      expect(Number.isInteger(e.health)).toBe(true)
    }
  })

  it('throws a RangeError for an index past the configured run', () => {
    expect(() => runEncounterAt(RUN_ENCOUNTERS.length)).toThrow(RangeError)
    expect(() => runEncounterAt(-1)).toThrow(RangeError)
  })
})
```

- [x] **Step 4: Prove the twenty-eight existing readers still pass, then typecheck**

This is the step that makes the phase a safe boundary — it runs every spec that touches the run's length before any UI exists.

Run: `npx vitest run src/hunt/__tests__/config.test.ts src/hunt/__tests__/encounter.test.ts src/hunt/__tests__/run.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed across all three files; `typecheck` exits 0. Per `plan.md`'s audit every length-coupled assertion is `.length`-relative or `>= 3`, so no existing assertion should need editing — **if one fails, read it before changing it**, because a genuine drift between `RUN_ENCOUNTERS` and its projection would surface here first.

### Task 2: Add `beatenCount` to `src/hunt/run.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/run.ts` — add beside `canAdvanceRun` (currently around line 104)
- Test: `src/hunt/__tests__/run.test.ts`

- [x] **Step 1: Write the failing test for the won-but-not-yet-advanced case**

This is the whole reason the function exists — get it wrong and the map marks the opponent just beaten as the one about to be fought. Append to `src/hunt/__tests__/run.test.ts`:

```ts
describe('beatenCount (DLR-85)', () => {
  it('counts nothing beaten on a fresh run', () => {
    expect(beatenCount(startRun())).toBe(0)
  })

  it('counts the current encounter as beaten once the player has won it', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      { ...run.encounter, health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
        winner: DuelSide.Player },
      run.cheats,
    )
    expect(won.encounterIndex).toBe(0)
    expect(beatenCount(won)).toBe(1)
  })

  it('does not count a live encounter as beaten after advancing', () => {
    const run = startRun()
    const won = recordEncounter(
      run,
      { ...run.encounter, health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
        winner: DuelSide.Player },
      run.cheats,
    )
    expect(beatenCount(advanceRun(won))).toBe(1)
  })

  it('counts every encounter on a won run', () => {
    let run = startRun()
    for (let i = 0; i < run.encounterCount; i += 1) {
      run = recordEncounter(
        run,
        { ...run.encounter, health: { ...run.encounter.health, [DuelSide.Quarry]: 0 },
          winner: DuelSide.Player },
        run.cheats,
      )
      if (run.outcome === RunOutcome.InProgress) run = advanceRun(run)
    }
    expect(run.outcome).toBe(RunOutcome.Won)
    expect(beatenCount(run)).toBe(run.encounterCount)
  })
})
```

Run: `npx vitest run src/hunt/__tests__/run.test.ts`
Expected: the four new tests fail — `beatenCount is not defined` / not exported.

- [x] **Step 2: Implement `beatenCount`**

Add immediately after `canAdvanceRun` in `src/hunt/run.ts`:

```ts
/**
 * DLR-85 AC6/AC7 — how many encounters of the run are behind the player, as one integer.
 *
 * `encounterIndex` alone is WRONG: a won-but-not-yet-advanced run sits at index n with
 * `encounter.winner === Player`, so without the +1 the map marks the opponent just beaten
 * as the one about to be fought. One exported statement, beside `canAdvanceRun` and for the
 * same reason — the screen drawing the path and the transition advancing it must not each
 * do their own arithmetic.
 */
export function beatenCount(run: RunState): number {
  return run.encounterIndex + (run.encounter.winner === DuelSide.Player ? 1 : 0)
}
```

- [x] **Step 3: Run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/run.test.ts; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0.

---

## Phase 2 — The pure path model

One module, no React, no DOM, behind the lint-enforced `src/hunt/**` boundary. Test-first throughout, because stage grouping and status tagging are exactly the invariant `react-frontend` says to push out of a component. The phase ends type-checking with the model complete and nothing rendering it yet, so it is a clean stopping point.

### Task 3: Create `src/hunt/runPath.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/runPath.ts`
- Test: `src/hunt/__tests__/runPath.test.ts`

- [x] **Step 1: Write the failing spec, covering the derived-stage requirement at BOTH run shapes**

The three-ordinary-no-boss case is the ticket's own risk note ("this must render three ticks and no boss just as happily as it renders five stages") and it lives here, as a test, rather than as the shipped configuration. Create `src/hunt/__tests__/runPath.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { OpponentKind, RUN_ENCOUNTERS, type RunEncounterConfig } from '../config'
import { PathNodeStatus, runPath } from '../runPath'

const ordinary = (name: string): RunEncounterConfig => ({
  name,
  kind: OpponentKind.Ordinary,
  health: 10,
})
const boss = (name: string): RunEncounterConfig => ({ name, kind: OpponentKind.Boss, health: 20 })

describe('runPath stage derivation', () => {
  it('groups a flat run of ordinary opponents into ONE stage with no boss', () => {
    const stages = runPath(0, [ordinary('Aoife'), ordinary('Cillian'), ordinary('Niamh')])
    expect(stages).toHaveLength(1)
    expect(stages[0]?.nodes).toHaveLength(3)
    expect(stages[0]?.closedByBoss).toBe(false)
    expect(stages[0]?.stageNumber).toBe(1)
  })

  it('closes a stage at every boss', () => {
    const stages = runPath(0, [ordinary('a'), boss('B1'), ordinary('b'), boss('B2')])
    expect(stages.map((s) => s.nodes.length)).toEqual([2, 2])
    expect(stages.map((s) => s.closedByBoss)).toEqual([true, true])
    expect(stages.map((s) => s.stageNumber)).toEqual([1, 2])
  })

  it('gives a trailing group with no boss its own final stage', () => {
    const stages = runPath(0, [ordinary('a'), boss('B1'), ordinary('b'), ordinary('c')])
    expect(stages.map((s) => s.closedByBoss)).toEqual([true, false])
    expect(stages[1]?.nodes.map((n) => n.name)).toEqual(['b', 'c'])
  })

  it('handles a boss in first position', () => {
    const stages = runPath(0, [boss('B1'), ordinary('a')])
    expect(stages.map((s) => s.nodes.length)).toEqual([1, 1])
  })

  it('derives five stages from the shipped configuration', () => {
    const stages = runPath(0, RUN_ENCOUNTERS)
    expect(stages).toHaveLength(5)
    expect(stages.every((s) => s.closedByBoss)).toBe(true)
    expect(stages.flatMap((s) => s.nodes)).toHaveLength(RUN_ENCOUNTERS.length)
  })

  it('defaults to the shipped configuration when none is supplied', () => {
    expect(runPath(0)).toEqual(runPath(0, RUN_ENCOUNTERS))
  })
})

describe('runPath status tagging', () => {
  const three = [ordinary('a'), ordinary('b'), ordinary('c')]
  const statuses = (beaten: number) =>
    runPath(beaten, three).flatMap((s) => s.nodes.map((n) => n.status))

  it('marks everything upcoming with the first node current on a fresh run', () => {
    expect(statuses(0)).toEqual([
      PathNodeStatus.Current,
      PathNodeStatus.Upcoming,
      PathNodeStatus.Upcoming,
    ])
  })

  it('marks beaten nodes beaten and keeps them in the path (AC6)', () => {
    expect(statuses(2)).toEqual([
      PathNodeStatus.Beaten,
      PathNodeStatus.Beaten,
      PathNodeStatus.Current,
    ])
  })

  it('has no current node once every encounter is beaten', () => {
    expect(statuses(3)).toEqual([
      PathNodeStatus.Beaten,
      PathNodeStatus.Beaten,
      PathNodeStatus.Beaten,
    ])
  })

  it('carries each node’s index, name and kind through', () => {
    const nodes = runPath(1, [ordinary('Aoife'), boss('Diarmuid')]).flatMap((s) => s.nodes)
    expect(nodes.map((n) => n.index)).toEqual([0, 1])
    expect(nodes.map((n) => n.name)).toEqual(['Aoife', 'Diarmuid'])
    expect(nodes.map((n) => n.kind)).toEqual([OpponentKind.Ordinary, OpponentKind.Boss])
  })
})

describe('runPath guards', () => {
  const three = [ordinary('a'), ordinary('b'), ordinary('c')]

  it('rejects an empty encounter list rather than returning an empty path', () => {
    expect(() => runPath(0, [])).toThrow(RangeError)
  })

  it('rejects a beatenCount outside 0..length', () => {
    expect(() => runPath(-1, three)).toThrow(RangeError)
    expect(() => runPath(4, three)).toThrow(RangeError)
  })

  it('rejects a non-integer or non-finite beatenCount', () => {
    expect(() => runPath(1.5, three)).toThrow(RangeError)
    expect(() => runPath(Number.NaN, three)).toThrow(RangeError)
  })
})
```

Run: `npx vitest run src/hunt/__tests__/runPath.test.ts`
Expected: every test fails — `Cannot find module '../runPath'`.

- [x] **Step 2: Implement `src/hunt/runPath.ts`**

```ts
import { OpponentKind, RUN_ENCOUNTERS, type RunEncounterConfig } from './config'

/**
 * DLR-85 AC6/AC7 — where one opponent stands relative to the player's progress.
 *
 * `Current` is the opponent about to be fought, and there is at most one: a fully beaten
 * run has none, which is why a caller reads the status rather than comparing indices.
 */
export const PathNodeStatus = {
  Beaten: 'beaten',
  Current: 'current',
  Upcoming: 'upcoming',
} as const
export type PathNodeStatus = (typeof PathNodeStatus)[keyof typeof PathNodeStatus]

/** One opponent on the path. */
export interface PathNode {
  /** 0-based index into the encounter list — stable, unique, and therefore the React key. */
  readonly index: number
  readonly name: string
  readonly kind: OpponentKind
  readonly status: PathNodeStatus
}

/** One group of the path: the opponents up to and including a boss. */
export interface PathStage {
  /** 1-based, for display. */
  readonly stageNumber: number
  readonly nodes: readonly PathNode[]
  /**
   * `true` when this stage ends in a boss. `false` for a trailing group with no boss after
   * it — which is the whole path of a flat run, the shape the ticket requires this render
   * "just as happily" as five stages.
   */
  readonly closedByBoss: boolean
}

/**
 * AC2/AC3/AC6/AC7 — the whole path, grouped into stages, every node tagged.
 *
 * Stages are DERIVED: a stage closes wherever a boss actually sits, so no stage count and
 * no opponents-per-stage figure appears here. Feed it three ordinary opponents and it
 * returns one stage of three ticks; feed it the shipped twenty-five and it returns five.
 *
 * Both guards throw rather than returning a plausible value, because both are caller or
 * configuration bugs and a silent fallback renders a wrong path forever with nothing in the
 * console to find it by. An empty list in particular would render an empty path — visible
 * as nothing at all, logged as nothing at all.
 */
export function runPath(
  beatenCount: number,
  encounters: readonly RunEncounterConfig[] = RUN_ENCOUNTERS,
): readonly PathStage[] {
  if (encounters.length === 0) {
    throw new RangeError('Cannot build a run path from an empty encounter list')
  }
  if (!Number.isInteger(beatenCount) || beatenCount < 0 || beatenCount > encounters.length) {
    throw new RangeError(
      `Cannot build a run path with ${beatenCount} beaten: it must be an integer in 0..${encounters.length}`,
    )
  }

  const stages: PathStage[] = []
  let nodes: PathNode[] = []

  encounters.forEach((encounter, index) => {
    nodes.push({
      index,
      name: encounter.name,
      kind: encounter.kind,
      status:
        index < beatenCount
          ? PathNodeStatus.Beaten
          : index === beatenCount
            ? PathNodeStatus.Current
            : PathNodeStatus.Upcoming,
    })
    if (encounter.kind === OpponentKind.Boss) {
      stages.push({ stageNumber: stages.length + 1, nodes, closedByBoss: true })
      nodes = []
    }
  })

  if (nodes.length > 0) {
    stages.push({ stageNumber: stages.length + 1, nodes, closedByBoss: false })
  }
  return stages
}
```

- [x] **Step 3: Run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/runPath.test.ts; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0.

### Task 4: Export everything new from the `src/hunt` barrel ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add the new type and value exports**

`src/App.tsx` and the two new components import from `'./hunt'`, not from the module files, matching every existing consumer. Add to the existing `./config` block and append two new blocks:

```ts
export type { RunEncounterConfig } from './config'
export {
  OpponentKind,
  RUN_ENCOUNTERS,
  ORDINARY_OPPONENT_NAMES,
  STAGE_BOSS_NAMES,
  ORDINARY_PER_STAGE,
  ORDINARY_HEALTH_BASE,
  ORDINARY_HEALTH_STEP,
  BOSS_HEALTH_MULTIPLIER,
  runEncounterAt,
} from './config'

export type { PathNode, PathStage } from './runPath'
export { PathNodeStatus, runPath } from './runPath'
```

Also add `beatenCount` to the existing `./run` export block.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

---

## Phase 3 — The path surfaces

The two new components plus their CSS. Both compute nothing and take every figure as a prop, following `ShopPanel`'s stated discipline. The phase ends with both components built and tested but not yet mounted anywhere, so the app still behaves exactly as it did — a safe boundary.

### Task 5: Create `src/app/run/RunMap.tsx` and `src/app/run/runMap.css` ✓

- Skill: `react-frontend`, and `game-ux` for the layout and the state-without-colour requirement

**Files:**
- Create: `src/app/run/RunMap.tsx`
- Create: `src/app/run/runMap.css`
- Test: `src/app/run/__tests__/RunMap.test.tsx`

Layout, glyph shapes, the three state treatments, and every value below are transcribed from `mockup.html` in this folder — its `.run-path*` rules and its screen-3 states. Do not redesign; the mockup was approved at the planning gate.

- [x] **Step 1: Write the failing component spec**

Create `src/app/run/__tests__/RunMap.test.tsx`. Queries go by accessible role and name, per `react-frontend`.

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OpponentKind, PathNodeStatus, runPath, type RunEncounterConfig } from '../../../hunt'
import RunMap from '../RunMap'
import { RUN_MAP_GROUP_LABEL } from '../runLabels'

const ordinary = (name: string): RunEncounterConfig => ({
  name,
  kind: OpponentKind.Ordinary,
  health: 10,
})
const boss = (name: string): RunEncounterConfig => ({ name, kind: OpponentKind.Boss, health: 20 })

const FIVE = [ordinary('Aoife'), ordinary('Cillian'), boss('Bréanainn'), ordinary('Niamh'), boss('Muireann')]

describe('RunMap', () => {
  it('names every opponent on the path (AC4)', () => {
    render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    for (const name of ['Aoife', 'Cillian', 'Bréanainn', 'Niamh', 'Muireann']) {
      expect(screen.getByText(name)).toBeTruthy()
    }
  })

  it('states the run’s goal alongside the path (AC5)', () => {
    render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(screen.getByText('Beat all 5')).toBeTruthy()
  })

  it('exposes the path as one labelled group', () => {
    render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(screen.getByRole('list', { name: RUN_MAP_GROUP_LABEL })).toBeTruthy()
  })

  it('marks ordinary opponents and bosses with different glyphs (AC3)', () => {
    const { container } = render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(container.querySelectorAll('.run-path-tick')).toHaveLength(3)
    expect(container.querySelectorAll('.run-path-block')).toHaveLength(2)
  })

  it('keeps beaten opponents visible and struck out, not removed (AC6)', () => {
    const { container } = render(<RunMap stages={runPath(2, FIVE)} goalText="Beat all 5" />)
    expect(screen.getByText('Aoife')).toBeTruthy()
    expect(container.querySelectorAll(`[data-status="${PathNodeStatus.Beaten}"]`)).toHaveLength(2)
    // Struck out in FORM, not by colour — game-ux requires a greyscale screenshot to read.
    expect(container.querySelectorAll('.run-path-name s')).toHaveLength(2)
  })

  it('distinguishes the current opponent from those beyond it (AC7)', () => {
    const { container } = render(<RunMap stages={runPath(2, FIVE)} goalText="Beat all 5" />)
    const current = container.querySelectorAll(`[data-status="${PathNodeStatus.Current}"]`)
    expect(current).toHaveLength(1)
    expect(current[0]?.getAttribute('aria-current')).toBe('step')
    expect(screen.getByText('Bréanainn')).toBeTruthy()
  })

  it('adds no tab stops — the path is a status display, not a control group', () => {
    const { container } = render(<RunMap stages={runPath(0, FIVE)} goalText="Beat all 5" />)
    expect(container.querySelectorAll('button, a, [tabindex]')).toHaveLength(0)
  })

  it('renders a flat run as one stage of ticks with no block', () => {
    const flat = [ordinary('a'), ordinary('b'), ordinary('c')]
    const { container } = render(<RunMap stages={runPath(0, flat)} goalText="Beat all 3" />)
    expect(container.querySelectorAll('.run-path-block')).toHaveLength(0)
    expect(container.querySelectorAll('.run-path-stage')).toHaveLength(1)
  })
})
```

Run: `npx vitest run src/app/run/__tests__/RunMap.test.tsx`
Expected: fails — `Cannot find module '../RunMap'`.

- [x] **Step 2: Write `src/app/run/runMap.css`**

Transcribe the `.run-path*` block from `mockup.html`'s `<style>`, including the beaten / current / final-node state rules and the angled-name rule. Reuse `.run-shell` and `.run-btn` from `run.css` — do **not** redefine a shell. Head the file with the ownership note every sibling CSS file carries:

```css
/* The run path's own classes (DLR-85). Transcribed from
   `.claude/contract/DLR-85-start-screen-and-run-map/mockup.html`, approved 2026-08-17.
   The full-viewport shell is `.run-shell` in run.css — this file adds no second shell.
   Every clamp() bound, the -52deg name angle, the name font size and every colour below
   is the DEVELOPER'S to retune. */
```

Names are angled, not vertical (developer's choice at the gate):

```css
.run-path-name {
  margin-top: 0.3rem;
  font-size: clamp(0.55rem, 1.5vmin, 0.78rem);
  color: var(--wc-chalk-dim, #9aa4a8);
  white-space: nowrap;
  transform: rotate(-52deg);
  transform-origin: top right;
  height: 4.2rem;
  text-align: right;
  direction: rtl;
}
```

- [x] **Step 3: Implement `src/app/run/RunMap.tsx`**

```tsx
import { OpponentKind, PathNodeStatus, type PathStage } from '../../hunt'
import { RUN_MAP_GROUP_LABEL } from './runLabels'
import './runMap.css'

interface RunMapProps {
  /** From `runPath(beatenCount(run))`. Derived by the driver, NEVER here. */
  readonly stages: readonly PathStage[]
  /** From `runGoalText(...)` — already worded, so this component holds no copy rule. */
  readonly goalText: string
}

/**
 * The run's path (DLR-85 AC3-AC7): one horizontal line, a short tick per ordinary opponent
 * and a filled block per stage boss, in run order, every node named.
 *
 * Computes NOTHING — a `ShopPanel` clone in discipline. Stage grouping and node status both
 * arrive already decided by `src/hunt/runPath.ts`, so this component cannot disagree with the
 * run module about who has been beaten.
 *
 * A STATUS DISPLAY, not a control group: nothing on the path is clickable, because route
 * choice is out of scope for this ticket. So there are no tab stops and no roving tabindex —
 * twenty-five tab stops would breach `game-ux`'s own threshold rather than satisfy it.
 *
 * All three states read WITHOUT colour: a beaten node's name sits in `<s>`, a boss is a block
 * against an ordinary opponent's thin tick, and the current node carries a caret and a taller
 * glyph. A greyscale screenshot still tells them apart.
 *
 * Layout per `.claude/contract/DLR-85-start-screen-and-run-map/mockup.html`, screens 1 and 3.
 */
export default function RunMap({ stages, goalText }: RunMapProps) {
  const total = stages.reduce((n, stage) => n + stage.nodes.length, 0)
  return (
    <>
      <p className="run-path-goal">{goalText}</p>
      <ol className="run-path" aria-label={RUN_MAP_GROUP_LABEL}>
        {stages.map((stage) => (
          <li key={stage.stageNumber} className="run-path-stage">
            <ol className="run-path-stage-nodes">
              {stage.nodes.map((node) => (
                <li
                  key={node.index}
                  className="run-path-node"
                  data-status={node.status}
                  data-final={node.index === total - 1 ? 'true' : undefined}
                  {...(node.status === PathNodeStatus.Current ? { 'aria-current': 'step' } : {})}
                >
                  <span className="run-path-glyph" aria-hidden="true">
                    <span
                      className={
                        node.kind === OpponentKind.Boss ? 'run-path-block' : 'run-path-tick'
                      }
                    />
                  </span>
                  <span className="run-path-name">
                    {node.status === PathNodeStatus.Beaten ? <s>{node.name}</s> : node.name}
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </>
  )
}
```

- [x] **Step 4: Run the spec and typecheck**

Run: `npx vitest run src/app/run/__tests__/RunMap.test.tsx; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0. This spec imports `RUN_MAP_GROUP_LABEL`, which Task 7 adds — if the import fails, do Task 7's Step 1 first and return here.

### Task 6: Create `src/app/run/RunPathScreen.tsx` ✓

- Skill: `react-frontend`, and `game-ux` for the full-viewport shell

**Files:**
- Create: `src/app/run/RunPathScreen.tsx`
- Test: `src/app/run/__tests__/RunPathScreen.test.tsx`

- [x] **Step 1: Write the failing component spec**

```tsx
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OpponentKind, runPath, type RunEncounterConfig } from '../../../hunt'
import RunPathScreen from '../RunPathScreen'

const three: RunEncounterConfig[] = ['a', 'b', 'c'].map((name) => ({
  name,
  kind: OpponentKind.Ordinary,
  health: 10,
}))

const props = {
  title: 'The Hunt',
  stages: runPath(0, three),
  goalText: 'Beat all 3',
  actionLabel: 'Fight a',
}

describe('RunPathScreen', () => {
  it('shows the title, the goal and the path', () => {
    render(<RunPathScreen {...props} onAction={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'The Hunt' })).toBeTruthy()
    expect(screen.getByText('Beat all 3')).toBeTruthy()
    expect(screen.getByText('a')).toBeTruthy()
  })

  it('offers exactly one action, named by its prop (AC1, AC8)', () => {
    render(<RunPathScreen {...props} onAction={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.textContent).toBe('Fight a')
  })

  it('fires onAction when the control is pressed', () => {
    const onAction = vi.fn()
    render(<RunPathScreen {...props} onAction={onAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fight a' }))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('fires onAction on Escape, matching ShopPanel’s keyboard contract', () => {
    const onAction = vi.fn()
    const { container } = render(<RunPathScreen {...props} onAction={onAction} />)
    fireEvent.keyDown(container.querySelector('.run-path-screen') as Element, { key: 'Escape' })
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
```

Run: `npx vitest run src/app/run/__tests__/RunPathScreen.test.tsx`
Expected: fails — `Cannot find module '../RunPathScreen'`.

- [x] **Step 2: Implement `src/app/run/RunPathScreen.tsx`**

```tsx
import type { PathStage } from '../../hunt'
import RunMap from './RunMap'
import './run.css'
import './runMap.css'

interface RunPathScreenProps {
  readonly title: string
  readonly stages: readonly PathStage[]
  /** Already worded by `runGoalText`. */
  readonly goalText: string
  /** Already worded — `fightLabel(firstName)` on the start screen, `MAP_BACK_LABEL` on the map. */
  readonly actionLabel: string
  readonly onAction: () => void
}

/**
 * The path, full-viewport, with one forward control (DLR-85 AC1, AC9).
 *
 * ONE component for BOTH surfaces — the start screen before fight one and the map reached
 * between fights — because they are the same layout and differ only in their title and their
 * button's label. Two near-identical siblings would be duplication for a two-string
 * difference.
 *
 * Computes NOTHING; mounts inside `run.css`'s existing `.run-shell` rather than defining a
 * second full-viewport shell, so there is one `100dvh` grid in the codebase to keep right.
 *
 * `Escape` fires the same action as the control, matching `ShopPanel`'s contract. It is a
 * container `onKeyDown`, NOT a document listener — so there is nothing to clean up and no
 * effect in this file at all.
 */
export default function RunPathScreen({
  title,
  stages,
  goalText,
  actionLabel,
  onAction,
}: RunPathScreenProps) {
  return (
    <div className="run-shell">
      <div
        className="run-path-screen"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onAction()
        }}
      >
        <h1 className="run-path-title">{title}</h1>
        <RunMap stages={stages} goalText={goalText} />
        <div className="run-actions">
          <button type="button" className="run-btn is-primary" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 3: Run both new component specs and typecheck**

Run: `npx vitest run src/app/run/__tests__/RunPathScreen.test.tsx src/app/run/__tests__/RunMap.test.tsx; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0.

---

## Phase 4 — Names on every run-level surface

The copy layer and the three surfaces that read it. `runLabels.ts` changes first, in one task with every one of its readers, because `runHeadline` and `runVerdictDetail` each gain a required parameter and `CONTINUE_LABEL` disappears — splitting those across tasks would leave a phase boundary where the app does not compile.

### Task 7: Change `src/app/run/runLabels.ts` and every one of its readers together ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/run/runLabels.ts` — add five constants and three functions; widen two signatures; delete `CONTINUE_LABEL`
- Modify: `src/app/run/RunOutcomePanel.tsx` — imports and both call sites
- Modify: `src/app/run/ShopPanel.tsx:16,147` — leave-label import and render
- Test: `src/app/run/__tests__/runLabels.test.ts`

The `CONTINUE_LABEL` deletion has ten hits across four files, and `runHeadline`'s widening has eleven across three (`plan.md` → audit). All of them are in this task or Task 8.

- [x] **Step 1: Add the new copy and widen the two verdict functions**

In `src/app/run/runLabels.ts`, update the file's header docblock — it currently says it "deliberately names NO Quarry … DLR-85 lands the roster and updates this file in the same change". That prediction is now true, so replace that sentence rather than leaving a stale note. Then:

```ts
/** AC8 — every continue-style control's label. ONE function, three call sites: the start
 *  screen's begin action, the verdict's primary control, and the shop's leave control. */
export function fightLabel(name: string): string {
  return `Fight ${name}`
}

/** AC5 — the run's goal, in words, from the configured length. Never a quoted number. */
export function runGoalText(total: number): string {
  return `Beat all ${total}`
}

/** The felt's status-band readout, now naming the opponent being fought (the ticket's
 *  explicit scope extension). Built ON runProgressText so the position is worded once. */
export function runPositionLabel(
  encounterIndex: number,
  encounterCount: number,
  name: string,
): string {
  return `${runProgressText(encounterIndex, encounterCount)} — ${name}`
}

/** PLACEHOLDER COPY, as this file's header states — all of it the developer's. */
export const START_TITLE = 'The Hunt'
export const MAP_TITLE = 'The path'
export const MAP_LABEL = 'Map'
export const MAP_BACK_LABEL = 'Back'
/** The path list's accessible name. */
export const RUN_MAP_GROUP_LABEL = 'The run’s path'
```

Widen `runHeadline` — the `InProgress` case names the opponent just beaten (AC8 / the ticket's scope extension); the two terminal cases keep DLR-82's wording, because a run-level verdict is about the run rather than one opponent:

```ts
export function runHeadline(outcome: RunOutcome, beatenName: string | undefined): string {
  switch (outcome) {
    case RunOutcome.Won:
      return 'YOU WIN'
    case RunOutcome.Lost:
      return 'YOU LOSE'
    case RunOutcome.InProgress:
      return beatenName === undefined ? 'FIGHT WON' : `${beatenName} defeated`
  }
}
```

Widen `runVerdictDetail` with a trailing `nextName: string | undefined`, naming the coming opponent in the `InProgress` case. **Keep the existing `runProgressText(...)` substrings intact** — three existing `toContain` assertions depend on them:

```ts
    case RunOutcome.InProgress:
      return nextName === undefined
        ? `The Quarry is down. ${runProgressText(encounterIndex + 1, encounterCount)} is waiting, and you carry ${carriedHealth} health into it.`
        : `${runProgressText(encounterIndex + 1, encounterCount)} — ${nextName} — is waiting, and you carry ${carriedHealth} health into it.`
```

Then delete the `CONTINUE_LABEL` declaration and update the comment above `CONTINUE_LABEL`/`SHOP_LABEL` (currently lines 62-66), which describes a `Continue` control that no longer exists — the primary now reads `Fight <next>`.

- [x] **Step 2: Follow the changes in `RunOutcomePanel.tsx` and `ShopPanel.tsx`**

In `RunOutcomePanel.tsx`, drop the `CONTINUE_LABEL` import. The remaining prop and render changes are Task 8's; this step only keeps the file compiling by passing the new arguments through from the props Task 8 adds — so **do Task 8's Step 1 in the same edit pass** if the compiler objects to `beatenName`/`nextName` not existing yet.

In `ShopPanel.tsx`, change the leave control (line 147) so it names the opponent when one is known:

```tsx
            {nextOpponentName === undefined ? NEXT_FIGHT_LABEL : fightLabel(nextOpponentName)}
```

and add `fightLabel` to the existing `./runLabels` import on line 16. `ShopPanelProps` is untouched — `nextOpponentName: string | undefined` already exists. Update that prop's docblock, which currently says it "Reads 'The Monarch' on every fight until DLR-85 lands the roster; that is correct today" — it is no longer correct today.

- [x] **Step 3: Update `runLabels.test.ts` for both signatures and the deletion**

Remove the `CONTINUE_LABEL` import and its assertion at line 75. Pass the new arguments at every `runHeadline` / `runVerdictDetail` call site, and add coverage for the new functions and the naming behaviour:

```ts
describe('naming (DLR-85)', () => {
  it('names a continue control after its opponent', () => {
    expect(fightLabel('Cillian')).toBe('Fight Cillian')
  })

  it('states the goal from the configured length', () => {
    expect(runGoalText(25)).toBe('Beat all 25')
  })

  it('names the opponent just beaten in the headline', () => {
    expect(runHeadline(RunOutcome.InProgress, 'Aoife')).toBe('Aoife defeated')
  })

  it('falls back to the generic headline with no name', () => {
    expect(runHeadline(RunOutcome.InProgress, undefined)).toBe('FIGHT WON')
  })

  it('keeps the terminal headlines about the run, not one opponent', () => {
    expect(runHeadline(RunOutcome.Won, 'Diarmuid')).toBe('YOU WIN')
    expect(runHeadline(RunOutcome.Lost, 'Aoife')).toBe('YOU LOSE')
  })

  it('names the coming opponent in the verdict detail', () => {
    expect(runVerdictDetail(RunOutcome.InProgress, 0, 25, 7, 'Cillian')).toContain('Cillian')
    expect(runVerdictDetail(RunOutcome.InProgress, 0, 25, 7, 'Cillian')).toContain('Fight 2 of 25')
  })

  it('names the opponent in the felt’s position readout', () => {
    expect(runPositionLabel(0, 25, 'Aoife')).toBe('Fight 1 of 25 — Aoife')
  })
})
```

- [x] **Step 4: Run the label spec and typecheck**

Run: `npx vitest run src/app/run/__tests__/runLabels.test.ts; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0.

### Task 8: Add the named headline, the named primary control, and the `Map` control to `src/app/run/RunOutcomePanel.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/run/RunOutcomePanel.tsx:29-52` (props), `:93-95` (headline and detail), `:138-150` (the unwarned action row)
- Test: `src/app/run/__tests__/RunOutcomePanel.test.tsx`

- [x] **Step 1: Add the three props**

```tsx
  /** AC8 / the ticket's scope extension — the opponent just beaten, which names the
   *  headline. `undefined` falls back to DLR-82's generic `FIGHT WON`. */
  readonly beatenName: string | undefined
  /** The opponent the primary control leads to. `undefined` on a won or lost run, where
   *  there is no next fight and the only control is `Start a new run`. */
  readonly nextName: string | undefined
  /** AC9 — opens the run map. The third control beside DLR-84's Continue and Shop. */
  readonly onMap: () => void
```

- [x] **Step 2: Name the headline and the detail, and add the third control**

Pass `beatenName` to `runHeadline` and `nextName` to `runVerdictDetail`. Then in the unwarned action row (currently lines 138-150) replace `CONTINUE_LABEL` with the named label and add the `Map` button:

```tsx
          <div className="run-actions">
            <button type="button" className="run-btn is-primary" onClick={onContinue}>
              {nextName === undefined ? NEXT_FIGHT_LABEL : fightLabel(nextName)}
            </button>
            <button type="button" className="run-btn" onClick={onShop}>
              {SHOP_LABEL}
            </button>
            <button type="button" className="run-btn" onClick={onMap}>
              {MAP_LABEL}
            </button>
          </div>
```

Leave the **warned** branch's `VISIT_SHOP_LABEL` / `CONTINUE_ANYWAY_LABEL` unchanged — DLR-84's spec tells the warned verdict from the plain one by button name, and renaming both branches risks a collision. Update the component docblock to record the third control and the named headline.

- [x] **Step 3: Update `RunOutcomePanel.test.tsx` for the new props and labels**

Add `beatenName`, `nextName` and `onMap` to the shared props fixture. Replace the four `CONTINUE_LABEL` queries (lines 32, 47, 98, 121) with `fightLabel(nextName)`. Add coverage for the two new behaviours:

```tsx
  it('names the opponent just beaten in the headline (AC8)', () => {
    render(<RunOutcomePanel {...props} beatenName="Aoife" />)
    expect(screen.getByRole('heading', { name: 'Aoife defeated' })).toBeTruthy()
  })

  it('names the next opponent on the primary control (AC8)', () => {
    render(<RunOutcomePanel {...props} nextName="Cillian" />)
    expect(screen.getByRole('button', { name: 'Fight Cillian' })).toBeTruthy()
  })

  it('offers a Map control that fires onMap (AC9)', () => {
    const onMap = vi.fn()
    render(<RunOutcomePanel {...props} onMap={onMap} />)
    fireEvent.click(screen.getByRole('button', { name: MAP_LABEL }))
    expect(onMap).toHaveBeenCalledTimes(1)
  })

  it('offers no Map or continue control on a finished run', () => {
    render(<RunOutcomePanel {...props} canContinue={false} outcome={RunOutcome.Lost} />)
    expect(screen.queryByRole('button', { name: MAP_LABEL })).toBeNull()
    expect(screen.getByRole('button', { name: NEW_RUN_LABEL })).toBeTruthy()
  })
```

- [x] **Step 4: Run the two affected panel specs and typecheck**

Run: `npx vitest run src/app/run/__tests__/RunOutcomePanel.test.tsx src/app/run/__tests__/ShopPanel.test.tsx; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0. `ShopPanel.test.tsx` queries the leave control by name — if it asserts the literal `NEXT_FIGHT_LABEL` while passing a `nextOpponentName`, update that assertion to `fightLabel(...)`; that is the intended change, not a regression.

---

## Phase 5 — Wire the driver

`App.tsx` is the only file that reads the roster and hands names down, so it changes last and alone. The phase ends with every acceptance criterion reachable in the running app.

### Task 9: Widen `App.tsx`'s phase union and mount both new surfaces ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/App.tsx:43-48` (the union), `:73` (initial state), `:112-145` (the transitions), `:149-200` (the render branches)
- Test: `src/__tests__/App.test.tsx`

- [x] **Step 1: Rename and widen the phase union**

`BetweenPhase` has eleven references, **all inside this file** (`plan.md` → audit), so the rename cannot break an external reader.

```tsx
/** Which surface is showing. A union rather than a phase boolean beside it, because
 *  "in the shop AND warned" and "in the shop before the run began" are both states that
 *  must not exist. Widened on DLR-85 with Start and Map — folding the start screen in here
 *  costs no new state variable. */
const RunPhase = {
  Start: 'start',
  Verdict: 'verdict',
  Warned: 'warned',
  Shop: 'shop',
  Map: 'map',
} as const
type RunPhase = (typeof RunPhase)[keyof typeof RunPhase]
```

Rename the state to `phase`/`setPhase` and open on `RunPhase.Start`. Update all eleven references.

- [x] **Step 2: Derive the roster reads and the path, once**

Add beside the existing `maxHealth` derivation. `beatenCount` and `runPath` are the only new calls, and both are pure:

```tsx
  // The roster reads, in ONE place. Every named surface below takes a string from here, so
  // no component looks an opponent up for itself.
  const beaten = beatenCount(run)
  const stages = runPath(beaten)
  const goalText = runGoalText(run.encounterCount)
  const currentName = runEncounterAt(run.encounterIndex).name
  // `undefined` exactly when there is no next fight — the final encounter of a won run.
  const nextName =
    run.encounterIndex + 1 < run.encounterCount
      ? runEncounterAt(run.encounterIndex + 1).name
      : undefined
```

`stages` is not memoised: `runPath` is one O(n) pass over twenty-five entries on a click-driven render, and `react-frontend` forbids `useMemo` without profiling evidence.

- [x] **Step 3: Add the start-screen and map render branches**

Before the existing `encounterOver` branches, and reusing one component for both:

```tsx
  if (phase === RunPhase.Start) {
    return (
      <RunPathScreen
        title={START_TITLE}
        stages={stages}
        goalText={goalText}
        actionLabel={fightLabel(currentName)}
        onAction={() => setPhase(RunPhase.Verdict)}
      />
    )
  }

  if (encounterOver && phase === RunPhase.Map) {
    return (
      <RunPathScreen
        title={MAP_TITLE}
        stages={stages}
        goalText={goalText}
        actionLabel={MAP_BACK_LABEL}
        onAction={() => setPhase(RunPhase.Verdict)}
      />
    )
  }
```

- [x] **Step 4: Pass the names down, and send a lost run back to the start screen**

On `RunOutcomePanel`, add `beatenName={currentName}` (the opponent just beaten *is* the one at `encounterIndex`), `nextName={nextName}`, and `onMap={() => setPhase(RunPhase.Map)}`.

On `ShopPanel`, replace `nextOpponentName={quarryCharacterInfo(SLICE_QUARRY_CHARACTER)?.name}` with `nextOpponentName={nextName}` — a real fix, since the old expression printed "The Monarch" as the next opponent on every fight of the run. Drop the now-unused `quarryCharacterInfo` and `SLICE_QUARRY_CHARACTER` imports **only if nothing else uses them**; `SLICE_QUARRY_CHARACTER` still feeds the module-scope `HUNT` constant, so it stays.

On `WarCouncilRound`, replace `runLabel={runProgressText(run.encounterIndex, run.encounterCount)}` with `runLabel={runPositionLabel(run.encounterIndex, run.encounterCount, currentName)}`.

AC10 — in `handleNewRun`, set `RunPhase.Start` instead of `RunPhase.Verdict`, so losing returns to the start screen. "Starting again resets the path" is then true by construction: `startRun()` returns `encounterIndex: 0`, so `beatenCount` is 0 and every node is upcoming again.

- [x] **Step 5: Add the App-level spec for AC1 and AC10's mechanism**

Create `src/__tests__/App.test.tsx`. Deliberately narrow — the full lose-and-restart loop needs a fight played to a loss and belongs to QA in a browser.

```tsx
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { RUN_ENCOUNTERS, runGoalText } from '../hunt'
import { fightLabel, START_TITLE } from '../app/run/runLabels'

describe('App run flow (DLR-85)', () => {
  it('shows the start screen before the first fight (AC1)', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: START_TITLE })).toBeTruthy()
    expect(screen.getByText(runGoalText(RUN_ENCOUNTERS.length))).toBeTruthy()
  })

  it('names every opponent of the run on the start screen (AC4)', () => {
    render(<App />)
    for (const encounter of RUN_ENCOUNTERS) {
      expect(screen.getByText(encounter.name)).toBeTruthy()
    }
  })

  it('offers one action, named after the first opponent (AC1, AC8)', () => {
    render(<App />)
    const first = RUN_ENCOUNTERS[0]?.name as string
    expect(screen.getByRole('button', { name: fightLabel(first) })).toBeTruthy()
  })

  it('leaves the start screen for the felt when the action is pressed', () => {
    render(<App />)
    const first = RUN_ENCOUNTERS[0]?.name as string
    fireEvent.click(screen.getByRole('button', { name: fightLabel(first) }))
    expect(screen.queryByRole('heading', { name: START_TITLE })).toBeNull()
  })
})
```

- [x] **Step 6: Run the App spec and typecheck**

Run: `npx vitest run src/__tests__/App.test.tsx; npm run typecheck`
Expected: 0 failed; `typecheck` exits 0.

- [x] **Step 7: Confirm `App.tsx` is still inside the file budget**

Run: `(Get-Content src\App.tsx).Count`
Expected: under 400. `plan.md` predicts roughly 240 (from 208). **Use `(Get-Content …).Count`, not `Measure-Object -Line`** — the latter drops blank lines and hid a real breach on DLR-63. If it is over 400, split it in this task per `react-frontend`: the roster derivations move to a `use*` hook.

---

## Phase 6 — Final verification

No production changes. Only sanity checks that the cumulative work is clean.

### Task 10: Confirm the pure-core boundary still holds ✓

- Skill: `react-frontend`

**Files:**
- Test: none — verification only

- [x] **Step 1: Grep the pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|requestAnimationFrame"`
Expected: zero hits. `src/hunt/runPath.ts` and the `config.ts` additions are pure TypeScript. Recursive form is required — `Select-String -Path 'src\hunt\**\*.ts'` reaches only one directory level and would report a false zero for `__tests__/`.

- [x] **Step 2: Confirm the lint rule agrees**

Run: `npm run lint`
Expected: exits 0. The existing `eslint.config.js` override for `src/hunt/**` covers the new module with no config change; a failure here means the design crossed the boundary, and the fix is the design — never an `eslint-disable`.

### Task 11: Confirm no tunable was hard-coded and no stale name remains ✓

- Skill: `react-frontend`

**Files:**
- Test: none — verification only

- [x] **Step 1: Confirm `CONTINUE_LABEL` is gone from every reader**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "CONTINUE_LABEL"`
Expected: hits ONLY on `CONTINUE_ANYWAY_LABEL`. Zero hits on `CONTINUE_LABEL` as a standalone name — the audit found ten across four files, all of which Tasks 7 and 8 changed.

- [x] **Step 2: Confirm the health figures and the run's length are read, never written, outside config**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "\b(25|129|86)\b" | Select-String -NotMatch "config.ts|__tests__"`
Expected: zero hits. The run's length reaches a screen only as `run.encounterCount` or `RUN_ENCOUNTERS.length`, and no health figure is quoted in a component or a stylesheet. A hit in `config.ts` or a spec is expected and fine.

- [x] **Step 3: Confirm the opponent names appear in exactly one place**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Aoife|Diarmuid|Conchobhar"`
Expected: hits only in `src/hunt/config.ts` and under `__tests__/`. A name hard-coded into a component or a label module is the duplication the roster exists to prevent.

### Task 12: Static gates and the full suite ✓

- Skill: `react-frontend`

**Files:**
- Test: none — verification only

- [x] **Step 1: Warm the Vitest cache one project at a time**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This step exists because a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` — a jsdom worker-*start* timeout, not a failing test. Warming first makes the next step's result trustworthy.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` line.

- [x] **Step 3: Formatting, scoped to this contract's files**

Run: `npx prettier --check src\hunt\runPath.ts src\hunt\config.ts src\hunt\run.ts src\hunt\index.ts src\App.tsx src\app\run\RunMap.tsx src\app\run\RunPathScreen.tsx src\app\run\RunOutcomePanel.tsx src\app\run\ShopPanel.tsx src\app\run\runLabels.ts src\app\run\runMap.css`
Expected: exits 0. Scoped deliberately — the repo-wide `format:check` fails on pre-existing `.docs/**` files no current contract has touched, and fixing that is not this contract's work.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

- [x] **Step 5: Confirm no file breached the 400-line budget**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | ForEach-Object { [pscustomobject]@{ File = $_.Name; Lines = (Get-Content $_.FullName).Count } } | Where-Object Lines -gt 400`
Expected: no rows returned. `(Get-Content …).Count`, never `Measure-Object -Line`.

### Task 13: Write the PR description ✓

- Skill: none — a hand-off document, not code

**Files:**
- Create: `.claude/contract/DLR-85-start-screen-and-run-map/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include:
- A link to `plan.md` and `mockup.html` in this folder.
- A summary of the change: the configured run sequence, the derived path model, the two new surfaces, the naming pass across four surfaces, and the run's extension from three fights to twenty-five.
- **Every decision the developer must make**, copied from this file's "Developer decides or observes" block — `BOSS_HEALTH_MULTIPLIER` above all, then the CSS bounds and the name angle, then all new copy.
- **Every behaviour they must judge by playing:** whether five stages of four ticks and a block read as five stages without counting; whether the map is worth the extra click from the verdict; whether `'<name> defeated'` still lands as a win now that `FIGHT WON` is gone; whether the two coexisting rosters ("Aoife" on the map, "The Monarch" in the dossier) are tolerable for one release.
- **The two things QA must confirm in a real browser, with the viewport sizes named:** that neither new surface scrolls or crops at twenty-five nodes (AC11 — `jsdom` has no layout engine, so no test can prove this), and that losing a run lands on the start screen with a fresh path (AC10's full loop).
- The stated expectation that the twenty-five-fight run is **not winnable** on the placeholder curve, and that `YOU WIN` is therefore effectively unreachable in play — with DLR-82's recorded ruling that the answer is the shop, not raising `PLAYER_START_HEALTH`.
- Verification results from Task 12, quoted.
- One line for future contributors on the new convention: **`RUN_ENCOUNTERS` is the run's single source, `QUARRY_ENCOUNTER_HEALTH` is a projection of it, and it must stay declared above that projection.**

---

## Self-review

*(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)*

**Spec coverage:**
- Start screen precedes fight one, one action to begin (AC1) — Tasks 6, 9 (Steps 3, 5).
- Path drawn from run configuration; stages, per-stage counts and boss positions all from one source (AC2) — Tasks 1, 3.
- Ticks for ordinary opponents, blocks for bosses, one horizontal path in run order (AC3) — Tasks 3, 5.
- Every opponent named, from the roster (AC4) — Tasks 1, 5, 9 (Step 5).
- The run's goal stated in words alongside the path (AC5) — Tasks 5, 7.
- Beaten opponents struck out and still visible (AC6) — Tasks 2, 3, 5.
- The next opponent distinguishable from those beyond (AC7) — Tasks 3, 5.
- Continue controls named after their opponent (AC8) — Tasks 7, 8, 9 (Step 4).
- The map reachable between fights (AC9) — Tasks 6, 8, 9 (Step 3).
- Losing returns to the start screen; starting again resets the path (AC10) — Task 9 (Step 4); full loop to QA.
- No-scroll viewport fit (AC11) — Tasks 5, 6 (`.run-shell` reuse); verification to QA, Task 13.
- The ticket's scope extension — verdict headline, `NEXT_FIGHT_LABEL`, and the felt's `runLabel` all named — Tasks 7, 8, 9 (Step 4).
- `plan.md` in-scope bullet "the run extended to its full twenty-five entries" — Task 1.
- `plan.md` in-scope bullet "Vitest coverage" — Tasks 1 (Step 3), 2 (Step 1), 3 (Step 1), 5 (Step 1), 6 (Step 1), 7 (Step 3), 8 (Step 3), 9 (Step 5).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`. No step invents a tuning value — all four config values ship as documented placeholders and are listed under "Developer decides or observes". No `eslint-disable` appears as a fix.

**Type / name consistency:** `OpponentKind`, `RunEncounterConfig`, `RUN_ENCOUNTERS`, `ORDINARY_OPPONENT_NAMES`, `STAGE_BOSS_NAMES`, `ORDINARY_PER_STAGE`, `ORDINARY_HEALTH_BASE`, `ORDINARY_HEALTH_STEP`, `BOSS_HEALTH_MULTIPLIER`, `buildRunEncounters`, `runEncounterAt` (Task 1) are used identically in Tasks 3, 4, 9, 10, 11. `PathNode`, `PathStage`, `PathNodeStatus`, `runPath` (Task 3) are used identically in Tasks 4, 5, 6, 9. `beatenCount` (Task 2) is used in Tasks 4, 9. `fightLabel`, `runGoalText`, `runPositionLabel`, `START_TITLE`, `MAP_TITLE`, `MAP_LABEL`, `MAP_BACK_LABEL`, `RUN_MAP_GROUP_LABEL` (Task 7) are used identically in Tasks 5, 6, 8, 9. `beatenName` / `nextName` / `onMap` (Task 8) match Task 9's props exactly. `RunPhase` (Task 9) is App-local. Every name matches `plan.md` Part 2 → Data shapes. One forward reference is flagged in the file: Task 5's spec imports `RUN_MAP_GROUP_LABEL` from Task 7, and Task 5 Step 4 says so and names the fix.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking with `RUN_ENCOUNTERS` authoritative and `QUARRY_ENCOUNTER_HEALTH` a projection of it; Task 1 Step 4 runs all three affected hunt specs before anything renders, so no half-applied rename survives the boundary.
- **Phase 2** ends with the path model complete, exported, and fully unit-tested, and nothing importing it yet — no dead import, no spec referencing a missing module.
- **Phase 3** ends with both components built and passing their own specs but not mounted; the app compiles and behaves exactly as before, so this is a genuine stopping point.
- **Phase 4** changes `runLabels.ts` and every one of its readers in one task, so the boundary is never crossed with a deleted export still imported or a widened signature called with the old arity.
- **Phase 5** ends with every acceptance criterion reachable in the running app and the file budget re-measured.
- **Phase 6** makes no production change at all.
