# Tasks: Rules engine — geometry, validation, scoring and turn loop

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-07-31

**Goal:** Build the complete String Railway rules engine as pure TypeScript under `src/rules/` — §10.1 predicates, the §10.2 validator with typed reason codes, §10.3 scoring returning an itemised breakdown, the §10.4 turn loop, a bounded legal-placement search, and a `(state, move) => state` reducer — with every limit, trigger and connection map keyed on `ColourId`.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**

- `src/constants/game.ts` — `PATH_KIND`, `TURN_PHASE`, `MOVE_KIND`, `REJECTION_REASON`, `SKIP_REASON`
- `src/constants/stations.ts` — `STATION_TYPE` and the §8 printed card values for all 10 types
- `src/rules/types.ts` — the §10 data model plus branded ids and geometry types
- `src/rules/config.ts` — the injected `RulesConfig` shape
- `src/rules/geometry.ts` — §10.1 path↔path: `arcLength`, `selfIntersects`, `crossings`
- `src/rules/containment.ts` — §10.1 rect predicates: `touchesRect`, `entryCount`, `passesThrough`/`endsOn`, and containment
- `src/rules/validate.ts` — §10.2 ten checks in reject order, plus the §5.2 station constraints
- `src/rules/scoring.ts` — §10.3 resolution returning `ScoringBreakdown`
- `src/rules/search.ts` — the bounded legal-placement search backing M4 and M9
- `src/rules/turn.ts` — §10.4 loop
- `src/rules/gameEnd.ts` — per-colour and per-owner standings, shared ties
- `src/rules/reducer.ts` — `(state, move) => state` and the move log
- `src/rules/__tests__/fixtures.ts` — synthetic `GameState` builders shared by the specs
- `src/rules/__tests__/stations.test.ts`
- `src/rules/__tests__/geometry.test.ts`
- `src/rules/__tests__/containment.test.ts`
- `src/rules/__tests__/validate.test.ts`
- `src/rules/__tests__/scoring.test.ts`
- `src/rules/__tests__/search.test.ts`
- `src/rules/__tests__/turn.test.ts`
- `src/rules/__tests__/gameEnd.test.ts`
- `src/rules/__tests__/reducer.test.ts`
- `pr-description.md` (in this plan folder)

**Modified:**

- `eslint.config.js:24` — widen the purity override glob to cover `src/constants/**`

**Deleted:** (none)

**Developer decides or observes:**

- `rules.json` → `geometry.shortStringLength`, `geometry.longStringLength`, `geometry.cardSize` — the M2 values. Not chosen, not invented here; the engine reads them from the injected `RulesConfig` and SCRUM-3a puts them in the file. Test fixtures use synthetic numbers.
- `rules.json` → `geometry.tangencyTolerance` — **0.5** decided 2026-07-31. Unvalidated by play. If placements that look plainly legal start being rejected by `DEGENERATE_TANGENCY`, this is the value to move first.
- **M12** (Railyard repeats at grey) and **M13** (Landmark/Depot trigger on every scoring event) are hard-implemented here. Both are medium-confidence readings; disagreement in play is a §14 tuning signal, and overturning either is a design call.
- **Whether the move-log granularity is right.** Nothing persists yet, so renaming a `Move` kind or field is free until SCRUM-3 or SCRUM-7 writes a log. After that it needs a migration.

---

## Phase 1 — Domain model, constants and the purity guard

Establishes every name the rest of the contract binds to, and closes the lint gap the audit found before any code can exploit it. No behaviour ships in this phase, so it ends type-checking with a lint-clean tree and no dead imports — `types.ts` is referenced by nothing yet, which is expected.

### Task 1: Create `src/constants/game.ts` and extend the purity override to cover it ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/constants/game.ts`
- Modify: `eslint.config.js:24`
- Config: `eslint.config.js` — widen the `files` glob on the `src/rules/**` override

- [x] **Step 1: Write the constant maps**

Create `src/constants/game.ts`. `UPPER_SNAKE_CASE` keys, one `as const` object per category, per the engineering-standards constants taxonomy.

```ts
export const PATH_KIND = {
  SHORT_RAIL: 'SHORT_RAIL',
  LONG_RAIL: 'LONG_RAIL',
  MOUNTAIN: 'MOUNTAIN',
  RIVER: 'RIVER',
  BORDER: 'BORDER',
} as const

export const TURN_PHASE = {
  STATION: 'STATION',
  STRING: 'STRING',
  COMPLETE: 'COMPLETE',
} as const

export const MOVE_KIND = {
  BEGIN_TURN: 'BEGIN_TURN',
  PLACE_STATION: 'PLACE_STATION',
  SKIP_STATION_STEP: 'SKIP_STATION_STEP',
  PLACE_STRING: 'PLACE_STRING',
  FORFEIT_STRING: 'FORFEIT_STRING',
  END_TURN: 'END_TURN',
} as const

/** Rules.md §10.2, in reject order. The trailing number is the check's position. */
export const REJECTION_REASON = {
  NOT_IN_SUPPLY: 'NOT_IN_SUPPLY', // 1
  WRONG_LENGTH: 'WRONG_LENGTH', // 2 (M6)
  SELF_INTERSECTS: 'SELF_INTERSECTS', // 3
  ENDPOINT_OFF_STATION: 'ENDPOINT_OFF_STATION', // 4
  NETWORK_DISCONNECTED: 'NETWORK_DISCONNECTED', // 5
  STATION_ENTERED_TWICE: 'STATION_ENTERED_TWICE', // 6
  TERMINUS_PASS_THROUGH: 'TERMINUS_PASS_THROUGH', // 7
  PLAYER_LIMIT_EXCEEDED: 'PLAYER_LIMIT_EXCEEDED', // 8 (M15)
  LEAVES_BORDER: 'LEAVES_BORDER', // 9 (M7)
  DEGENERATE_TANGENCY: 'DEGENERATE_TANGENCY', // 10 (M8)
} as const

/** §5.2 station-placement constraints, used by validateStationPlacement. */
export const STATION_REJECTION_REASON = {
  TOUCHES_STRING: 'TOUCHES_STRING',
  TOUCHES_STATION: 'TOUCHES_STATION',
  NOT_INSIDE_BORDER: 'NOT_INSIDE_BORDER',
} as const

/** Why step 1 of a turn was skipped. */
export const SKIP_REASON = {
  DECK_EMPTY: 'DECK_EMPTY', // M5
  NO_LEGAL_PLACEMENT: 'NO_LEGAL_PLACEMENT', // M4, after 3 consecutive failures
} as const
```

- [x] **Step 2: Widen the ESLint purity override so `src/constants/` is guarded too**

`src/rules/` is about to import from `src/constants/`, so rules-engine purity would otherwise depend on an unguarded tree. Change only the `files` array at `eslint.config.js:24`; leave every rule body untouched.

Replace:

```js
    files: ['src/rules/**/*.{ts,tsx}'],
```

with:

```js
    // src/rules/ imports the station definitions from src/constants/, so the purity
    // contract only holds if both trees are guarded. See plan.md → audit.
    files: ['src/rules/**/*.{ts,tsx}', 'src/constants/**/*.{ts,tsx}'],
```

- [x] **Step 3: Confirm types and lint are clean**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0, no errors reported.

### Task 2: Create `src/constants/stations.ts` with the §8 card values ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/constants/stations.ts`
- Test: `src/rules/__tests__/stations.test.ts`

- [x] **Step 1: Write the failing spec for the §8 table**

Create `src/rules/__tests__/stations.test.ts`. Assert the four values the ticket's criterion 7 names explicitly, plus the shape of the whole table. These are printed rulebook values, not tunables — the test is what stops them drifting.

```ts
import { describe, expect, it } from 'vitest'
import { STATION_DEFINITIONS, STATION_TYPE } from '../../constants/stations'

describe('STATION_DEFINITIONS (§8)', () => {
  it('defines all ten station types', () => {
    expect(Object.keys(STATION_DEFINITIONS).sort()).toEqual(Object.values(STATION_TYPE).sort())
  })

  it("gives Depot its inverted 0/2 values", () => {
    const depot = STATION_DEFINITIONS[STATION_TYPE.DEPOT]
    expect(depot.bonusFirst).toBe(0)
    expect(depot.bonusLater).toBe(2)
    expect(depot.flags.markerBonus).toBe(true)
    expect(depot.flags.needsMarker).toBe(true)
  })

  it('gives Rural a player limit of 1 and the draw-station flag', () => {
    const rural = STATION_DEFINITIONS[STATION_TYPE.RURAL]
    expect(rural.playerLimit).toBe(1)
    expect(rural.flags.drawStation).toBe(true)
  })

  it('flags Terminus as pass-through banned and Railyard as a multiplier', () => {
    expect(STATION_DEFINITIONS[STATION_TYPE.TERMINUS].flags.terminus).toBe(true)
    expect(STATION_DEFINITIONS[STATION_TYPE.RAILYARD].flags.multiplier).toBe(true)
  })

  it('gives Landmark a marker penalty and Starting Station the same', () => {
    expect(STATION_DEFINITIONS[STATION_TYPE.LANDMARK].flags.markerPenalty).toBe(true)
    expect(STATION_DEFINITIONS[STATION_TYPE.STARTING].flags.markerPenalty).toBe(true)
  })

  it('gives Scenic the mountain bonus flag at base 1/1', () => {
    const scenic = STATION_DEFINITIONS[STATION_TYPE.SCENIC]
    expect(scenic.flags.mountainBonus).toBe(true)
    expect(scenic.bonusFirst).toBe(1)
    expect(scenic.bonusLater).toBe(1)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails to resolve the module**

Run: `npx vitest run src/rules/__tests__/stations.test.ts`
Expected: non-zero exit; the failure is a module-resolution / transform error for `../../constants/stations`, not an assertion failure.

- [x] **Step 3: Write `src/constants/stations.ts`**

Populate every row from the §8 table: Starting 3/2/5 markerPenalty · Hamlet 2/2/2 · Village 2/2/3 · Town 3/3/5 · Scenic 1/1/3 mountainBonus · Rural 1/1/1 drawStation · Terminus 3/3/5 terminus · Railyard 1/1/3 multiplier · Landmark 3/2/5 needsMarker+markerPenalty · Depot 0/2/5 needsMarker+markerBonus. Every flag not listed for a row is `false`.

```ts
export const STATION_TYPE = {
  STARTING: 'STARTING',
  HAMLET: 'HAMLET',
  VILLAGE: 'VILLAGE',
  TOWN: 'TOWN',
  SCENIC: 'SCENIC',
  RURAL: 'RURAL',
  TERMINUS: 'TERMINUS',
  RAILYARD: 'RAILYARD',
  LANDMARK: 'LANDMARK',
  DEPOT: 'DEPOT',
} as const

export type StationType = (typeof STATION_TYPE)[keyof typeof STATION_TYPE]

export interface StationFlags {
  readonly drawStation: boolean
  readonly mountainBonus: boolean
  readonly terminus: boolean
  readonly multiplier: boolean
  readonly needsMarker: boolean
  readonly markerPenalty: boolean
  readonly markerBonus: boolean
}

export interface StationDefinition {
  readonly bonusFirst: number
  readonly bonusLater: number
  readonly playerLimit: number
  readonly flags: StationFlags
}

/**
 * Rules.md §8 printed card values. These are rulebook data, NOT tunables — the
 * only tunable in the deck is the M17 composition, which lives in rules.json.
 */
export const STATION_DEFINITIONS: Readonly<Record<StationType, StationDefinition>> = {
  /* ...ten rows as above... */
}
```

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/stations.test.ts`
Expected: exits 0; Vitest reports 6 passed, 0 failed.

### Task 3: Create `src/rules/types.ts` — the §10 data model ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/types.ts`

- [x] **Step 1: Write the branded ids, geometry types and domain types**

Transcribe the "Data shapes → `src/rules/types.ts`" block from `plan.md` verbatim: branded `ColourId` / `PlayerId` / `StationId` / `PathId`; `Point`, `Polyline`, `Segment`, `Rect`; the union aliases derived from the `src/constants/` maps; `StationCard`, `PlacedStation`, `PlacedPath`, `ColourSeat`, `GameState`, `Move`. Re-export `StationType` and `StationFlags` from `src/constants/stations` rather than redeclaring them.

Two things the plan calls out and the file must honour:

```ts
/** Branded so a PlayerId can never be passed where a ColourId is required (§9). */
export type ColourId = string & { readonly __brand: 'ColourId' }
export type PlayerId = string & { readonly __brand: 'PlayerId' }

/** Map, not Record: a branded key survives on a Map, and Map iteration is
 *  insertion-ordered, where object-key order is a determinism hazard. */
readonly connections: ReadonlyMap<ColourId, number>
```

`GameState` carries the five fields §10 does not list — `phase`, `pendingCard`, `stationStepFailures`, `extraDraws`, `drewRuralAlready` — because §10.4 holds them as loop locals and a reducer cannot.

- [x] **Step 2: Add id constructor helpers at the bottom of the file**

Branded types need one sanctioned construction point, or every call site grows a cast.

```ts
export const asColourId = (value: string): ColourId => value as ColourId
export const asPlayerId = (value: string): PlayerId => value as PlayerId
export const asStationId = (value: string): StationId => value as StationId
export const asPathId = (value: string): PathId => value as PathId
```

- [x] **Step 3: Confirm types and lint are clean**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 4: Create `src/rules/config.ts` — the injected `RulesConfig` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/config.ts`

- [x] **Step 1: Declare the type — and no values**

No value ships here. SCRUM-3a populates `rules.json` and its loader produces this shape. Document each field with its unit and M-number so a play-tester knows what they are changing.

```ts
/**
 * Tuning values the engine is injected with. Every field is a tunable read from
 * rules.json (M2 / M6 / M8) — none may ever appear as a literal in src/.
 * SCRUM-3a owns the file, its loader and its validation.
 */
export interface RulesConfig {
  /** M2 — nominal arc length of a short railway string, world units. */
  readonly shortStringLength: number
  /** M2 — nominal arc length of a long railway string, world units. */
  readonly longStringLength: number
  /** M6 — permitted deviation from nominal, as a fraction (0.02 = ±2%). Inclusive. */
  readonly arcLengthTolerance: number
  /** M8 — how close a near-touch must be before §10.2 check 10 rejects it, world units. */
  readonly tangencyTolerance: number
  /** M2 — station card footprint (square), world units. Also the search sampling step. */
  readonly cardSize: number
}
```

- [x] **Step 2: Confirm types and lint are clean**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 2 — Path geometry (§10.1, path against path)

The predicates §11 warns the bugs will live in. Test-first throughout, with the degenerate cases written before the implementation so an epsilon choice cannot be quietly tuned to make a test pass. The phase ends with `geometry.ts` complete and consumed by nothing, which type-checks cleanly.

### Task 5: Add `arcLength` and the transversal segment test to `src/rules/geometry.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/geometry.ts`
- Test: `src/rules/__tests__/geometry.test.ts`

- [x] **Step 1: Write the failing specs for `arcLength` and `segmentsCrossTransversally`**

Create `src/rules/__tests__/geometry.test.ts`. Cover the degenerate cases explicitly — they are the whole point of writing these first.

```ts
import { describe, expect, it } from 'vitest'
import { EPSILON, arcLength, segmentsCrossTransversally } from '../geometry'
import type { Point, Segment } from '../types'

const p = (x: number, y: number): Point => ({ x, y })

describe('arcLength', () => {
  it('sums segment lengths along a polyline', () => {
    expect(arcLength([p(0, 0), p(3, 4), p(3, 14)])).toBe(15)
  })

  it('returns 0 for a single point and for an empty path', () => {
    expect(arcLength([p(1, 1)])).toBe(0)
    expect(arcLength([])).toBe(0)
  })

  it('ignores a duplicated consecutive point rather than producing NaN', () => {
    expect(arcLength([p(0, 0), p(0, 0), p(3, 4)])).toBe(5)
  })
})

describe('segmentsCrossTransversally (M8)', () => {
  const horizontal: Segment = { a: p(0, 0), b: p(10, 0) }

  it('returns the intersection point for a clean X crossing', () => {
    const vertical: Segment = { a: p(5, -5), b: p(5, 5) }
    expect(segmentsCrossTransversally(horizontal, vertical)).toEqual(p(5, 0))
  })

  it('returns null for a segment that touches and returns to the same side', () => {
    const touching: Segment = { a: p(5, 0), b: p(8, 3) }
    expect(segmentsCrossTransversally(horizontal, touching)).toBeNull()
  })

  it('returns null for collinear overlap', () => {
    const collinear: Segment = { a: p(3, 0), b: p(7, 0) }
    expect(segmentsCrossTransversally(horizontal, collinear)).toBeNull()
  })

  it('returns null for parallel non-touching segments', () => {
    const parallel: Segment = { a: p(0, 1), b: p(10, 1) }
    expect(segmentsCrossTransversally(horizontal, parallel)).toBeNull()
  })

  it('treats a deviation below EPSILON as non-transversal', () => {
    const grazing: Segment = { a: p(5, -EPSILON / 2), b: p(6, EPSILON / 2) }
    expect(segmentsCrossTransversally(horizontal, grazing)).toBeNull()
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/geometry.test.ts`
Expected: non-zero exit; module-resolution error for `../geometry`.

- [x] **Step 3: Implement `EPSILON`, `arcLength` and `segmentsCrossTransversally`**

Create `src/rules/geometry.ts`. Transversality is a strict sign change of the signed area on **both** sides — that is what makes a tangency return `null`. Guard the divisor before computing the intersection point so a degenerate pair cannot emit `NaN`.

```ts
/**
 * Unitless float-noise guard for cross-product sign tests. This is numeric
 * robustness, NOT a tuning lever — the geometric threshold that is one is
 * RulesConfig.tangencyTolerance (M8), applied at validation time.
 */
export const EPSILON = 1e-9

export function arcLength(path: Polyline): number

/**
 * M8 — transversal crossing only. Returns the intersection point when each
 * segment strictly straddles the other's line, and null for tangency,
 * collinearity, a shared endpoint, or any near-touch within EPSILON.
 */
export function segmentsCrossTransversally(a: Segment, b: Segment): Point | null
```

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/geometry.test.ts`
Expected: exits 0; Vitest reports 8 passed, 0 failed.

### Task 6: Add `selfIntersects` and `crossings` to `src/rules/geometry.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/rules/geometry.ts`
- Test: `src/rules/__tests__/geometry.test.ts`

- [x] **Step 1: Append the failing specs**

Criterion 2 and the ticket's second stated risk both live here: each intersection point counts separately, and a tangency is not a crossing.

```ts
describe('selfIntersects', () => {
  it('detects a figure-eight', () => {
    expect(selfIntersects([p(0, 0), p(10, 10), p(10, 0), p(0, 10)])).toBe(true)
  })

  it('does not flag adjacent segments sharing an endpoint', () => {
    expect(selfIntersects([p(0, 0), p(5, 0), p(5, 5)])).toBe(false)
  })

  it('does not flag a tight switchback that touches without crossing', () => {
    expect(selfIntersects([p(0, 0), p(10, 0), p(10, 1), p(0, 1)])).toBe(false)
  })
})

describe('crossings (M8)', () => {
  const straight = [p(0, 0), p(20, 0)]

  it('counts each intersection point separately', () => {
    const zigzag = [p(5, -5), p(5, 5), p(15, 5), p(15, -5)]
    expect(crossings(straight, zigzag)).toHaveLength(2)
  })

  it('returns an empty array for a path that touches and returns to the same side', () => {
    const tangent = [p(5, -5), p(10, 0), p(15, -5)]
    expect(crossings(straight, tangent)).toEqual([])
  })

  it('returns the crossing coordinates, not just a count', () => {
    const vertical = [p(8, -3), p(8, 3)]
    expect(crossings(straight, vertical)).toEqual([p(8, 0)])
  })
})
```

- [x] **Step 2: Run the spec and confirm the new blocks fail**

Run: `npx vitest run src/rules/__tests__/geometry.test.ts`
Expected: non-zero exit; the three `selfIntersects` and three `crossings` cases fail, the eight from Task 5 still pass.

- [x] **Step 3: Implement both against `segmentsCrossTransversally`**

Neither re-derives intersection maths — both walk segment pairs and delegate. `selfIntersects` skips adjacent pairs, which share an endpoint by construction. `crossings` takes two whole polylines so SCRUM-6 can later call it with a single newest segment against each existing path, which is what makes incremental crossing detection possible.

```ts
export function selfIntersects(path: Polyline): boolean

/** Every transversal intersection point, one entry per point. The page-7 example
 *  scores −2 for two crossings of one string, so a boolean here under-counts. */
export function crossings(newPath: Polyline, existing: Polyline): Point[]
```

- [x] **Step 4: Run the spec and confirm all of it passes**

Run: `npx vitest run src/rules/__tests__/geometry.test.ts`
Expected: exits 0; Vitest reports 14 passed, 0 failed.

- [x] **Step 5: Measure the file against the size budget**

Run: `(Get-Content src\rules\geometry.ts | Measure-Object -Line).Lines`
Expected: under 400. Report the number; if it is over 200, say so in the phase summary.

---

## Phase 3 — Containment predicates (§10.1, against a rect)

The other half of §10.1. `entryCount` is the one with a stated criterion of its own (criterion 3) — contiguous runs, not raw boundary intersections. The phase ends with all of §10.1 implemented and specced, still consumed by nothing.

### Task 7: Add the containment predicates to `src/rules/containment.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/containment.ts`
- Test: `src/rules/__tests__/containment.test.ts`

- [x] **Step 1: Write the failing specs for `rectsOverlapOrTouch`, `rectFullyInside`, `pathFullyInside` and `pointInAnyRect`**

Create `src/rules/__tests__/containment.test.ts`. "Touch" counts as overlap for §5.2 — a card sharing an edge with another card is an illegal placement, not a legal one.

```ts
import { describe, expect, it } from 'vitest'
import {
  pathFullyInside,
  pointInAnyRect,
  rectFullyInside,
  rectsOverlapOrTouch,
} from '../containment'
import type { Point, Rect } from '../types'

const p = (x: number, y: number): Point => ({ x, y })
const r = (x: number, y: number, size = 20): Rect => ({ x, y, width: size, height: size })
const SQUARE = [p(0, 0), p(100, 0), p(100, 100), p(0, 100)] // closed loop, implicit last edge

describe('rectsOverlapOrTouch', () => {
  it('is true for overlapping rects', () => {
    expect(rectsOverlapOrTouch(r(0, 0), r(10, 10))).toBe(true)
  })

  it('is true for rects sharing exactly one edge', () => {
    expect(rectsOverlapOrTouch(r(0, 0), r(20, 0))).toBe(true)
  })

  it('is false for separated rects', () => {
    expect(rectsOverlapOrTouch(r(0, 0), r(21, 0))).toBe(false)
  })
})

describe('rectFullyInside', () => {
  it('is true when the whole rect is within the loop', () => {
    expect(rectFullyInside(r(40, 40), SQUARE)).toBe(true)
  })

  it('is false when the rect straddles the loop boundary', () => {
    expect(rectFullyInside(r(95, 40), SQUARE)).toBe(false)
  })

  it('is false when the rect is entirely outside', () => {
    expect(rectFullyInside(r(200, 200), SQUARE)).toBe(false)
  })
})

describe('pathFullyInside (M7)', () => {
  it('is true for a path that stays within the loop', () => {
    expect(pathFullyInside([p(10, 10), p(90, 90)], SQUARE)).toBe(true)
  })

  it('is false for a path that leaves and re-enters', () => {
    expect(pathFullyInside([p(10, 50), p(150, 50), p(90, 90)], SQUARE)).toBe(false)
  })
})

describe('pointInAnyRect', () => {
  it('is true when the point falls inside one of the rects', () => {
    expect(pointInAnyRect(p(45, 45), [r(0, 0), r(40, 40)])).toBe(true)
  })

  it('is true on a rect boundary — an on-edge crossing is still on the card', () => {
    expect(pointInAnyRect(p(40, 45), [r(40, 40)])).toBe(true)
  })

  it('is false when no rect contains it, and for an empty list', () => {
    expect(pointInAnyRect(p(300, 300), [r(0, 0)])).toBe(false)
    expect(pointInAnyRect(p(5, 5), [])).toBe(false)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/containment.test.ts`
Expected: non-zero exit; module-resolution error for `../containment`.

- [x] **Step 3: Implement the four predicates**

Create `src/rules/containment.ts`. Point-in-loop uses a ray cast; `rectFullyInside` requires all four corners inside **and** no loop edge crossing any rect edge, because four-corners-inside alone passes a rect that a concave loop cuts through.

```ts
export function rectsOverlapOrTouch(a: Rect, b: Rect): boolean
export function rectFullyInside(rect: Rect, loop: Polyline): boolean
export function pathFullyInside(path: Polyline, loop: Polyline): boolean
export function pointInAnyRect(point: Point, rects: readonly Rect[]): boolean
```

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/containment.test.ts`
Expected: exits 0; Vitest reports 11 passed, 0 failed.

### Task 8: Add `touchesRect`, `entryCount`, `passesThrough` and `endsOn` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/rules/containment.ts`
- Test: `src/rules/__tests__/containment.test.ts`

- [x] **Step 1: Append the failing specs**

Criterion 3 is the graze-twice case. Criterion 1's Terminus pair is `passesThrough` / `endsOn`.

```ts
describe('touchesRect', () => {
  it('is true when the path enters the rect', () => {
    expect(touchesRect([p(30, 50), p(50, 50)], r(40, 40), 0.5)).toBe(true)
  })

  it('is true when the path ends exactly on the rect edge', () => {
    expect(touchesRect([p(20, 50), p(40, 50)], r(40, 40), 0.5)).toBe(true)
  })

  it('is false when the path passes near but outside the tolerance', () => {
    expect(touchesRect([p(0, 50), p(35, 50)], r(40, 40), 0.5)).toBe(false)
  })
})

describe('entryCount (criterion 3)', () => {
  it('counts one entry for a straight pass through', () => {
    expect(entryCount([p(30, 50), p(70, 50)], r(40, 40))).toBe(1)
  })

  it('counts one entry for a path that grazes the same edge twice in one pass', () => {
    const grazing = [p(30, 40), p(45, 39), p(50, 41), p(55, 39), p(70, 40)]
    expect(entryCount(grazing, r(40, 40))).toBe(1)
  })

  it('counts two entries for a path that leaves the rect and comes back', () => {
    const inOutIn = [p(45, 45), p(45, 20), p(55, 20), p(55, 45)]
    expect(entryCount(inOutIn, r(40, 40))).toBe(2)
  })

  it('counts zero for a path that never reaches the rect', () => {
    expect(entryCount([p(0, 0), p(10, 10)], r(40, 40))).toBe(0)
  })
})

describe('passesThrough / endsOn (Terminus, §5.3)', () => {
  it('reports a mid-path traversal as passing through', () => {
    const through = [p(30, 50), p(70, 50)]
    expect(passesThrough(through, r(40, 40))).toBe(true)
    expect(endsOn(through, r(40, 40))).toBe(false)
  })

  it('reports a path ending inside the rect as ending on it, not passing through', () => {
    const ending = [p(20, 50), p(45, 50)]
    expect(endsOn(ending, r(40, 40))).toBe(true)
    expect(passesThrough(ending, r(40, 40))).toBe(false)
  })

  it('reports a path with both endpoints on the rect as ending on it', () => {
    const both = [p(42, 42), p(58, 58)]
    expect(endsOn(both, r(40, 40))).toBe(true)
    expect(passesThrough(both, r(40, 40))).toBe(false)
  })
})
```

- [x] **Step 2: Run the spec and confirm the new blocks fail**

Run: `npx vitest run src/rules/__tests__/containment.test.ts`
Expected: non-zero exit; the ten new cases fail, the eleven from Task 7 still pass.

- [x] **Step 3: Implement the four predicates**

`entryCount` is the load-bearing one: walk the path accumulating **contiguous runs** where the path is inside the rect, and increment only on an outside→inside transition. Counting boundary intersections instead is the bug criterion 3 exists to prevent. `passesThrough` is defined per §10.1 as being inside the rect at a point that is not part of an endpoint's contiguous run.

```ts
export function touchesRect(path: Polyline, rect: Rect, tolerance: number): boolean

/** §10.1 — contiguous runs inside the rect, NOT raw boundary intersections.
 *  A string grazing an edge twice in one pass entered once. */
export function entryCount(path: Polyline, rect: Rect): number

export function passesThrough(path: Polyline, rect: Rect): boolean
export function endsOn(path: Polyline, rect: Rect): boolean
```

- [x] **Step 4: Run the spec and confirm all of it passes**

Run: `npx vitest run src/rules/__tests__/containment.test.ts`
Expected: exits 0; Vitest reports 21 passed, 0 failed.

- [x] **Step 5: Confirm the boundary and the size budget**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage"; (Get-Content src\rules\containment.ts | Measure-Object -Line).Lines; npm run typecheck; npm run lint`
Expected: zero grep hits; line count under 400; both npm commands exit 0.

---

## Phase 4 — Placement validation (§10.2 and §5.2)

Turns the predicates into legality decisions. The §10.2 order is normative — criterion 4 says "in that exact order" — so the ordering itself gets a test that feeds a path violating two rules and asserts the earlier reason wins. The phase ends with validation complete and scoring not yet written; nothing else imports `validate.ts` yet.

### Task 9: Build the shared test fixtures and `validateStationPlacement` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/__tests__/fixtures.ts`
- Create: `src/rules/validate.ts`
- Test: `src/rules/__tests__/validate.test.ts`

- [x] **Step 1: Write the shared fixture builders**

Create `src/rules/__tests__/fixtures.ts`. **Synthetic geometry only** — no M2 value appears here, so the tunable grep over `src/` stays meaningful and the numbers stay readable.

```ts
import { PATH_KIND, TURN_PHASE } from '../../constants/game'
import { STATION_DEFINITIONS, STATION_TYPE } from '../../constants/stations'
import { asColourId, asPathId, asPlayerId, asStationId } from '../types'
import type { ColourId, GameState, PlacedPath, PlacedStation, Rect } from '../types'
import type { RulesConfig } from '../config'

export const TEST_CONFIG: RulesConfig = {
  shortStringLength: 400,
  longStringLength: 800,
  arcLengthTolerance: 0.02,
  tangencyTolerance: 0.5,
  cardSize: 20,
}

/** A 500×500 square border, no terrain, no stations, one seat per colour given. */
export function makeState(overrides?: Partial<GameState>): GameState

/** A seat, defaulting to 4 short + 1 long strings and 2 markers. */
export function makeSeat(colour: string, owner: string, overrides?: Partial<ColourSeat>): ColourSeat

/** A placed station of the given type at the given rect, with no connections. */
export function makeStation(type: StationType, rect: Rect, overrides?: Partial<PlacedStation>): PlacedStation

export function makePath(kind: PathKind, points: Polyline, owner?: ColourId): PlacedPath
```

- [x] **Step 2: Write the failing spec for the three §5.2 constraints**

```ts
describe('validateStationPlacement (§5.2)', () => {
  it('accepts a card inside the border touching nothing', () => { /* expect ok: true */ })
  it('rejects a card touching any string with TOUCHES_STRING', () => { /* ... */ })
  it('rejects a card touching another station with TOUCHES_STATION', () => { /* ... */ })
  it('rejects a card not fully inside the border with NOT_INSIDE_BORDER', () => { /* ... */ })
  it('rejects a card touching a string before one touching a station', () => { /* order */ })
})
```

- [x] **Step 3: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/validate.test.ts`
Expected: non-zero exit; module-resolution error for `../validate`.

- [x] **Step 4: Implement `validateStationPlacement`**

Create `src/rules/validate.ts`. Terrain paths are read out of `state.paths` by `kind`, per the plan's decision that terrain lives only there.

```ts
export type PlacementResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: RejectionReason | StationRejectionReason; readonly stationId?: StationId }

export function validateStationPlacement(state: GameState, rect: Rect, config: RulesConfig): PlacementResult
```

- [x] **Step 5: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/validate.test.ts`
Expected: exits 0; Vitest reports 5 passed, 0 failed.

### Task 10: Implement `validateStringPlacement` — the ten §10.2 checks in order ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/rules/validate.ts`
- Test: `src/rules/__tests__/validate.test.ts`

- [x] **Step 1: Append a failing spec with one case per check, plus two ordering cases**

Twelve cases: one asserting each `REJECTION_REASON` fires on a path that violates only that check, and two feeding a path that violates checks 2 and 6 (expect `WRONG_LENGTH`) and checks 7 and 8 (expect `TERMINUS_PASS_THROUGH`). Criterion 8's own case is a string running over a station already at its player limit with neither endpoint on it — expect `PLAYER_LIMIT_EXCEEDED`.

```ts
describe('validateStringPlacement (§10.2)', () => {
  it('rejects a string type the seat has none of with NOT_IN_SUPPLY', () => {})
  it('rejects a path outside ±2% of nominal with WRONG_LENGTH (M6)', () => {})
  it('accepts a path exactly at +2% — the tolerance is inclusive', () => {})
  it('accepts a path exactly at −2% — the tolerance is inclusive', () => {})
  it('rejects a self-intersecting path with SELF_INTERSECTS', () => {})
  it('rejects a path whose endpoint is off every station with ENDPOINT_OFF_STATION', () => {})
  it('rejects a path unconnected to the colour’s own network with NETWORK_DISCONNECTED', () => {})
  it('rejects a path entering one station twice with STATION_ENTERED_TWICE', () => {})
  it('rejects a path crossing a Terminus mid-run with TERMINUS_PASS_THROUGH', () => {})
  it('rejects a pass-through over a full station with PLAYER_LIMIT_EXCEEDED (M15)', () => {})
  it('rejects a path leaving the border with LEAVES_BORDER (M7)', () => {})
  it('rejects a degenerate tangency with DEGENERATE_TANGENCY (M8)', () => {})
  it('reports WRONG_LENGTH, not STATION_ENTERED_TWICE, when both are violated', () => {})
  it('reports TERMINUS_PASS_THROUGH, not PLAYER_LIMIT_EXCEEDED, when both are violated', () => {})
})
```

- [x] **Step 2: Run the spec and confirm the new block fails**

Run: `npx vitest run src/rules/__tests__/validate.test.ts`
Expected: non-zero exit; the fourteen new cases fail, the five from Task 9 still pass.

- [x] **Step 3: Implement the ten checks as a straight-line sequence**

A straight-line function, not a rule table, so it reads against §10.2 line for line. Return on the first failure. Two subtleties the plan calls out:

- Check 2 is **inclusive**: `Math.abs(arcLength(path) - nominal) <= nominal * config.arcLengthTolerance`.
- Check 8 runs over **every** station the path touches, not just the endpoints, and counts distinct `ColourId`s after the hypothetical placement — that is M15.

```ts
export function validateStringPlacement(
  state: GameState,
  colour: ColourId,
  stringKind: 'SHORT_RAIL' | 'LONG_RAIL',
  path: Polyline,
  config: RulesConfig,
): PlacementResult
```

- [x] **Step 4: Run the spec and confirm all of it passes**

Run: `npx vitest run src/rules/__tests__/validate.test.ts`
Expected: exits 0; Vitest reports 19 passed, 0 failed.

- [x] **Step 5: Confirm the colour-first rule and the size budget**

Run: `Select-String -Path src\rules\validate.ts -Pattern "PlayerId"; (Get-Content src\rules\validate.ts | Measure-Object -Line).Lines; npm run typecheck`
Expected: zero `PlayerId` hits — a limit check must never see one; line count under 400; typecheck exits 0.

---

## Phase 5 — Scoring resolution (§10.3)

Where the ticket's headline test lives. Scoring returns a `ScoringBreakdown`, never a number — SCRUM-7's stated risk is that a number-returning engine forces a rework, and its criteria 1–7 and 12 each need a specific line in this shape. The phase ends with the page-7 example green.

### Task 11: Implement `resolveScoring` and the breakdown shape ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/scoring.ts`
- Test: `src/rules/__tests__/scoring.test.ts`

- [x] **Step 1: Write the failing spec for each §10.3 rule**

Create `src/rules/__tests__/scoring.test.ts`. Every criterion that is a scoring rule gets a case, keyed on colour throughout.

```ts
describe('resolveScoring (§10.3)', () => {
  it('scores the black value for the first colour to connect', () => {})
  it('scores the grey value for a later colour', () => {})
  it('scores nothing for a station this colour is already connected to', () => {})
  it('scores a Railyard again at grey on every later connection (M12)', () => {})
  it('itemises the Scenic +2 mountain bonus separately from the base (M11)', () => {})
  it('counts pass-through stations as connections (M15)', () => {})
  it('charges −1 per crossing point, counting each separately', () => {})
  it('charges nothing for a crossing that falls inside a station rect', () => {})
  it('charges −1 for crossing the mountain, the river and the border alike (M10)', () => {})
  it('fires a Landmark penalty against the marker owner on every scoring event (M13)', () => {})
  it('fires a Depot bonus of +1 to the marker owner (M13)', () => {})
  it('does not fire a marker trigger when the scorer owns the marker', () => {})
  it('fires the trigger between two colours sharing an owner, flagged sameOwner (§9)', () => {})
  it('allows the net total to go below zero (M14)', () => {})
})
```

The §9 case is criterion 14 and the assertion that proves the engine is colour-first: two seats with the same `owner`, one scoring at the other's Landmark. Expect a `MarkerEffectLine` with `delta: -1` and `sameOwner: true`.

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/scoring.test.ts`
Expected: non-zero exit; module-resolution error for `../scoring`.

- [x] **Step 3: Implement `resolveScoring`**

Create `src/rules/scoring.ts` with the `ConnectionLine`, `CrossingLine`, `MarkerEffectLine` and `ScoringBreakdown` types from `plan.md` → Data shapes, then walk §10.3's pseudocode. Every comparison is between `ColourId`s; `sameOwner` is computed by looking up both colours' seats and comparing `owner`, and is reported for SCRUM-7 criterion 12 to explain — it never changes whether the trigger fires.

```ts
export function resolveScoring(
  state: GameState,
  colour: ColourId,
  newPath: PlacedPath,
  config: RulesConfig,
): ScoringBreakdown
```

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/scoring.test.ts`
Expected: exits 0; Vitest reports 14 passed, 0 failed.

### Task 12: Add `applyScoring` and the page-7 worked example ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/rules/scoring.ts`
- Test: `src/rules/__tests__/scoring.test.ts`

- [x] **Step 1: Append the failing page-7 spec on a synthetic board**

Criterion 5. The fixture preserves the example's topology, not its measurements — a mountain loop, a Scenic station inside it, a second station connected for the first time, two mountain crossings, and one crossing exempted by falling on a card.

```ts
describe('the rulebook page-7 worked example (§5.4)', () => {
  // Mountain: closed square (100,100)-(300,300).
  // Station A  (own, already connected): rect { x: 50,  y: 180, w: 20, h: 20 }
  // Scenic     (inside the mountain):    rect { x: 180, y: 180, w: 20, h: 20 }
  // Village    (first connection):       rect { x: 450, y: 180, w: 20, h: 20 }
  // Yellow's existing string: (455,170) → (455,210), crossing inside the Village rect.
  // Pink's new string: (60,190) → (460,190). Arc length 400 = TEST_CONFIG.shortStringLength.
  //   Enters the mountain at x=100, passes through Scenic, exits at x=300, ends in Village.

  it('scores +3 for the Scenic station inside the mountain', () => {})
  it('scores +2 for the Village station connected for the first time', () => {})
  it('scores nothing for station A, already on this colour’s network', () => {})
  it('charges −1 −1 for the two mountain crossings', () => {})
  it('charges nothing for the crossing that falls on the Village card', () => {})
  it('nets +3', () => {
    expect(breakdown.gained).toBe(5)
    expect(breakdown.lost).toBe(2)
    expect(breakdown.net).toBe(3)
  })
})
```

- [x] **Step 2: Run the spec and confirm the new block fails**

Run: `npx vitest run -t "the rulebook page-7 worked example"`
Expected: non-zero exit; the six cases fail.

- [x] **Step 3: Add `applyScoring` and fix whatever the example exposes**

`applyScoring` folds a breakdown into state: adds `net` to the scoring colour's seat, applies each `MarkerEffectLine.delta` to the marker owner's seat, updates `connections` and `firstConnector` on every station scored, and appends nothing to the move log. Scores are not floored (M14).

```ts
export function applyScoring(state: GameState, breakdown: ScoringBreakdown): GameState
```

- [x] **Step 4: Run the whole scoring spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/scoring.test.ts`
Expected: exits 0; Vitest reports 20 passed, 0 failed. **Actual: 25 passed** (14 Task 11 + 6 page-7 + 5 `applyScoring` assertions) — above 20, per the task's own allowance.

- [x] **Step 5: Confirm the colour-first rule and the size budget**

Run: `Select-String -Path src\rules\scoring.ts -Pattern "PlayerId"; (Get-Content src\rules\scoring.ts | Measure-Object -Line).Lines; npm run typecheck`
Expected: `PlayerId` appears only in the `sameOwner` seat-lookup comparison, nowhere in a trigger decision; line count under 400; typecheck exits 0.

---

## Phase 6 — The bounded legal-placement search

Answers "does any legal placement exist", which M4's three-failure skip and M9's forfeit both need. Pulled into this story by developer decision on 2026-07-31; SCRUM-5 criterion 8 consumes it rather than building its own. Isolated behind two exported functions so bounding it later touches one module.

### Task 13: Implement `src/rules/search.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/search.ts`
- Test: `src/rules/__tests__/search.test.ts`

- [x] **Step 1: Write the failing spec**

The cases that matter are the two extremes and the bound, because a search that always returns `true` passes a naive happy-path test.

```ts
describe('hasLegalStationPlacement (M4)', () => {
  it('is true on an empty board inside the border', () => {})
  it('is false when the border is fully packed with stations', () => {})
  it('is false when every gap is smaller than the card footprint', () => {})
  it('finds a single legal gap exactly one card wide', () => {})
})

describe('hasAnyLegalStringPlacement (M9)', () => {
  it('is true when a reachable station is within the string’s length budget', () => {})
  it('is false when the seat has no strings left in supply', () => {})
  it('is false when every other station is beyond the length budget', () => {})
})
```

The "single legal gap exactly one card wide" case is the one that catches sampling that never lands on the gap — it is why refinement exists.

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/search.test.ts`
Expected: non-zero exit; module-resolution error for `../search`.

- [x] **Step 3: Implement both functions**

Sample candidate rects across the border's bounding box at `config.cardSize` granularity, filter with `validateStationPlacement`, and bisect near a near-hit to a fixed depth. `REFINEMENT_DEPTH` is a code constant, not config — it trades runtime against false negatives rather than shaping the game, so it is not a tuning lever.

```ts
/** Bisection steps taken around a near-hit before giving up. Numeric bound, not
 *  a tuning lever — raising it costs runtime and lowers the false-negative rate. */
const REFINEMENT_DEPTH = 3

export function hasLegalStationPlacement(state: GameState, card: StationCard, config: RulesConfig): boolean
export function hasAnyLegalStringPlacement(state: GameState, colour: ColourId, config: RulesConfig): boolean
```

Both are pure functions of `(state, config)` — no `Math.random()`, no `Date.now()` — which is what keeps the reducer's draw-and-recycle sequence replayable from the move log.

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/search.test.ts`
Expected: exits 0; Vitest reports 7 passed, 0 failed.

- [x] **Step 5: Confirm no randomness reached the search**

Run: `Select-String -Path src\rules\search.ts -Pattern "Math\.random|Date\.now"; npm run typecheck`
Expected: zero grep hits; typecheck exits 0.

---

## Phase 7 — Turn loop, game end and the reducer

Assembles the pieces into a playable engine. `turn.ts` turns §10.4's loop locals into resumable state, `gameEnd.ts` is the only module that reads `PlayerId`, and `reducer.ts` is the single entry point the UI will dispatch against. The phase ends with the engine complete.

### Task 14: Implement `src/rules/turn.ts` — the §10.4 loop ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/turn.ts`
- Test: `src/rules/__tests__/turn.test.ts`

- [x] **Step 1: Write the failing spec covering every §10.4 branch**

Criterion 6 and criterion 13 both land here.

```ts
describe('beginStationStep (§10.4)', () => {
  it('draws the top card and holds it as pendingCard', () => {})
  it('recycles a needsMarker card to the bottom when the seat has no markers left', () => {})
  it('recycles an unplaceable card to the bottom and draws again (M4)', () => {})
  it('skips the station step with NO_LEGAL_PLACEMENT after 3 consecutive failures (M4)', () => {})
  it('skips the station step with DECK_EMPTY on an empty deck (M5)', () => {})
  it('never reshuffles — a recycled card goes to the bottom, not into a discard', () => {})
})

describe('commitStationPlacement', () => {
  it('attaches a marker automatically on a Landmark or Depot (M16)', () => {})
  it('queues one extra draw for a Rural station', () => {})
  it('does not queue a third station when the second is also Rural (drewRuralAlready)', () => {})
})

describe('advanceTurn / isGameOver', () => {
  it('advances through a 3-colour turnOrder', () => {})
  it('advances through a 4-colour turnOrder', () => {})
  it('advances through a 5-colour turnOrder', () => {})
  it('advances through the §9 two-player order [A1, B1, A2, B2]', () => {})
  it('runs exactly five rounds over whatever turnOrder it is given', () => {})
  it('reports game over only after the last seat of round 5', () => {})
})
```

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/turn.test.ts`
Expected: non-zero exit; module-resolution error for `../turn`.

- [x] **Step 3: Implement the loop as resumable state transitions**

§10.4's `extraDraws`, `drewRuralAlready` and `failures` become `GameState` fields, because a reducer cannot hold a `while` loop open across dispatches. The draw-and-recycle sequence uses `hasLegalStationPlacement` from Task 13.

```ts
export interface StationStepOutcome {
  readonly state: GameState
  readonly skipped: SkipReason | null
}

export function beginStationStep(state: GameState, config: RulesConfig): StationStepOutcome
export function commitStationPlacement(state: GameState, rect: Rect, config: RulesConfig): GameState
export function advanceTurn(state: GameState): GameState
export function isGameOver(state: GameState): boolean
```

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/turn.test.ts`
Expected: exits 0; Vitest reports 15 passed, 0 failed.

### Task 15: Implement `src/rules/gameEnd.ts` — standings and shared victory ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/gameEnd.ts`
- Test: `src/rules/__tests__/gameEnd.test.ts`

- [x] **Step 1: Write the failing spec**

Criterion 15. This is the one module where reading `PlayerId` is correct.

```ts
describe('finalStandings (§5.5, §9)', () => {
  it('returns a score per colour', () => {})
  it('sums an owner’s two colour scores into one owner total (§9)', () => {})
  it('reports a single winner when one owner total is highest', () => {})
  it('reports every tied owner as a winner — ties share the victory (§5.5)', () => {})
  it('handles negative totals without flooring (M14)', () => {})
})
```

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/gameEnd.test.ts`
Expected: non-zero exit; module-resolution error for `../gameEnd`.

- [x] **Step 3: Implement `finalStandings`**

```ts
export interface ColourStanding { readonly colour: ColourId; readonly score: number }
export interface OwnerStanding {
  readonly owner: PlayerId
  readonly colours: readonly ColourStanding[]
  readonly total: number
}
export interface FinalStandings {
  readonly byColour: readonly ColourStanding[]
  readonly byOwner: readonly OwnerStanding[]
  /** More than one entry means a shared victory (§5.5). */
  readonly winners: readonly PlayerId[]
}

export function finalStandings(state: GameState): FinalStandings
```

Group with a `Map<PlayerId, ...>` rather than an object, so iteration order stays insertion-ordered and deterministic.

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/gameEnd.test.ts`
Expected: exits 0; Vitest reports 5 passed, 0 failed.

### Task 16: Implement `src/rules/reducer.ts` — `(state, move) => state` and the move log ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/rules/reducer.ts`
- Test: `src/rules/__tests__/reducer.test.ts`

- [x] **Step 1: Write the failing spec**

The two behaviours that matter most are that an illegal move cannot commit, and that an impossible move throws rather than silently corrupting state.

```ts
describe('gameReducer', () => {
  it('appends every applied move to the move log', () => {})
  it('returns state unchanged when PLACE_STRING fails validation', () => {})
  it('does not append a rejected move to the log', () => {})
  it('returns state unchanged when PLACE_STATION fails validation', () => {})
  it('applies scoring on a legal PLACE_STRING and records lastScoring', () => {})
  it('spends a short string from supply on a legal PLACE_STRING', () => {})
  it('keeps the string in supply on FORFEIT_STRING but still advances the turn (M9)', () => {})
  it('throws on a move dispatched in the wrong phase', () => {})
  it('throws on PLACE_STATION naming a cardId that is not the pending card', () => {})
  it('throws on PLACE_STRING for a string kind the seat has none of', () => {})
  it('produces identical state when the same move log is replayed from the same start', () => {})
  it('does not mutate the state object it was given', () => {})
})
```

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/rules/__tests__/reducer.test.ts`
Expected: non-zero exit; module-resolution error for `../reducer`.

- [x] **Step 3: Implement the reducer**

A `switch` over `MOVE_KIND`. Validation runs before any state change, so an illegal placement returns the input state untouched and is not logged. A genuinely impossible move — wrong phase, unknown card, unavailable string kind — throws, because that is a caller bug and swallowing it would let the board and the log diverge. No `catch` returns a success shape.

```ts
export function gameReducer(state: GameState, move: Move, config: RulesConfig): GameState
```

- [x] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/reducer.test.ts`
Expected: exits 0; Vitest reports 12 passed, 0 failed.

- [x] **Step 5: Confirm the size budget across the phase**

Run: `Get-ChildItem src\rules\*.ts | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName | Measure-Object -Line).Lines)" }`
Expected: every file under 400 lines. Report each number; flag anything over 200.

---

## Phase 8 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean, plus the PR description.

### Task 17: Confirm the `src/rules/` boundary still holds ✓

- Skill: `none — verification only, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Grep for React and DOM references under `src/rules/` and `src/constants/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts,src\constants\*.ts -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Confirm the ESLint override actually covers `src/constants/`**

Run: `Select-String -Path eslint.config.js -Pattern "src/constants"`
Expected: one hit, in the `files` array of the purity override.

### Task 18: Confirm the engine is colour-first ✓

- Skill: `none — verification only, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Grep every rules module for `PlayerId`**

Run: `Select-String -Path src\rules\*.ts -Pattern "PlayerId"`
Expected: hits only in `types.ts` (the `PlayerId` declaration, `asPlayerId`, and `ColourSeat.owner`), `gameEnd.ts` (per-owner summing), and `scoring.ts` (the `sameOwner` seat lookup, which reports rather than decides). **Zero hits in `validate.ts`, `turn.ts`, `search.ts` and `containment.ts`** — a `PlayerId` in a limit check or a marker trigger is the defect criterion 11 exists to prevent.

### Task 19: Confirm no tunable was hard-coded ✓

- Skill: `none — verification only, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Grep production source for the literals `rules.json` owns**

Test fixtures are excluded deliberately: they use synthetic geometry, so any hit here is in shipped code.

Run: `Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch '__tests__' } | Select-String -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits.

### Task 20: Static gates and the full suite ✓

- Skill: `none — verification only, no code written`

**Files:**

- (no files changed)

- [x] **Step 1: Typecheck, lint, format check and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` summary line.

- [x] **Step 2: If and only if `format:check` failed, reformat and re-run**

A `format:check` failure on newly written files is Prettier disagreeing about whitespace, not a defect. Reformatting is mechanical and changes no behaviour, so it is in scope for this phase; skip this step entirely if step 1 was clean.

Run: `npm run format; npm run format:check; npm run typecheck`
Expected: all three exit 0. State in the phase summary which files were reformatted.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 21: Write the PR description ✓

- Skill: `none — documentation hand-off, no code written`

**Files:**

- Create: `.claude/contract/SCRUM-2-rules-engine/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` in this folder, and the SCRUM-2 ticket.
- Summary of the change: nine new modules under `src/rules/`, two under `src/constants/`, one ESLint glob widened.
- **Every decision the developer must make:** the three unchosen M2 values (`shortStringLength`, `longStringLength`, `cardSize`) that SCRUM-3a puts in `rules.json`; whether `tangencyTolerance: 0.5` survives contact with play; whether M12 and M13 are the right readings.
- **What can only be judged by playing:** nothing in this story renders, so the honest statement is that none of it has been seen on a board — the page-7 example is verified against synthetic geometry, not against a generated board.
- Verification results from the prior phases: the actual `Tests  N passed` line, typecheck, lint, format and build results.
- A one-line note for future contributors on the new conventions introduced: branded id types with `as*` constructors, `ColourId`-keyed `Map`s over `Record`s, and the fact that the ESLint purity override now guards `src/constants/` as well as `src/rules/`.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage** (`plan.md` Part 1 → In scope, then the ticket's 15 criteria):

- `types.ts` — Task 3. `config.ts` — Task 4. `constants/game.ts` — Task 1. `constants/stations.ts` — Task 2. `eslint.config.js` — Task 1, verified Task 17.
- `geometry.ts` + `containment.ts` (§10.1) — Tasks 5–8. **AC 1** (nine predicates with degenerate cases) — Tasks 5, 6, 7, 8. **AC 2** (transversal only, tangency test) — Task 5 step 1, Task 6 step 1. **AC 3** (contiguous runs) — Task 8 step 1.
- `validate.ts` (§10.2) — Tasks 9, 10. **AC 4** (ten checks, exact order, typed reason) — Task 10, including two explicit ordering cases. **AC 8** (M15 pass-through limit) — Task 10 step 1.
- `scoring.ts` (§10.3) — Tasks 11, 12. **AC 5** (page-7 example) — Task 12. **AC 7** (all 10 station behaviours) — Task 2 for the values, Task 11 for Railyard/Landmark/Depot behaviour, Task 10 for Terminus. **AC 9** (negative scores) — Task 11 step 1. **AC 14** (§9 same-owner trigger) — Task 11 step 1.
- `search.ts` — Task 13, backing **AC 6**'s M4 and M9 branches.
- `turn.ts` (§10.4) — Task 14. **AC 6** (Rural cap, M4, M5, M9) — Task 14 step 1. **AC 13** (turn-order arrays for all four counts) — Task 14 step 1.
- `gameEnd.ts` — Task 15. **AC 15** (per-colour, per-owner, shared ties) — Task 15 step 1.
- `reducer.ts` and the move log — Task 16.
- **AC 10** (purity, lint-enforced) — Task 1 step 2, verified Task 17. **AC 11** (colour-first keying) — Task 3 branded types, Task 11's §9 case, verified Task 18. **AC 12** (owner only for summing) — Task 15, verified Task 18.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact signature, or a runnable command with `Run:` / `Expected:`. Test bodies given as `it('...', () => {})` in Tasks 9–16 are deliberate: the assertion titles are the specification, and the fixture builders they use are defined concretely in Task 9 step 1.

**Type / name consistency:** `REJECTION_REASON` keys (Task 1) are used unchanged in Task 10's spec and implementation. `STATION_TYPE` / `STATION_DEFINITIONS` (Task 2) are consumed by Tasks 9–14. `segmentsCrossTransversally` is named identically in Tasks 5 and 6. `crossings` keeps one signature `(newPath, existing) => Point[]` in Tasks 6, 10 and 11. `ScoringBreakdown` and its three line types are declared in Task 11 and consumed unchanged in Tasks 12 and 16. `hasLegalStationPlacement` / `hasAnyLegalStringPlacement` are named identically in Task 13, Task 14 and the SCRUM-5 Jira comment. `RulesConfig`'s five fields (Task 4) match `TEST_CONFIG` (Task 9) and `plan.md` → Data shapes exactly.

**Phase boundary cleanliness:**

- Phase 1 ends with constants, types and config declared and imported by nothing — type-checks, lints, no dead imports.
- Phase 2 ends with `geometry.ts` complete and specced; nothing imports it yet, which is consistent, not broken.
- Phase 3 ends with all of §10.1 present and specced; the boundary grep runs here for the first time.
- Phase 4 ends with validation complete and consuming Phases 2–3; `scoring.ts` does not exist yet and nothing references it.
- Phase 5 ends with scoring complete and the page-7 example green; `search.ts` does not exist yet and `scoring.ts` does not reference it.
- Phase 6 ends with the search complete and consumed by nothing; `turn.ts` does not exist yet.
- Phase 7 ends with the engine complete — every module written, every spec green, no `src/ui/` consumer expected or required.
- Phase 8 changes no production code.
