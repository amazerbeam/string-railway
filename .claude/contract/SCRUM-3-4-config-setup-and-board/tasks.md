# Tasks: Tuning config, debug toggles, and the New Game setup + board render

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-07-31

**Goal:** Move every M2 geometry constant and the M17 deck composition into `public/rules.json` behind a validator that fails loudly, add a seeded deterministic setup generator under `src/rules/` that produces a complete legal `GameState` for 2–5 players with retry ceilings instead of hangs, render it as a self-scaling SVG board with placeholder station cards and legible owner-to-colour pairing, wire a New Game control with player-count selection, and put all scores, the seed, and the geometry overlays behind a visually distinct toggle that defaults to off.

**Spec:** `plan.md` in this folder.

**One file-layout decision made here, not in `plan.md`:** `plan.md` → Data shapes groups `validateSetup` under `src/rules/setup.ts`. Keeping it there would put `regularPolygon` + `validateSetup` + `generateSetup` + `boardBounds` + types in one file at roughly 395 lines — inside the >400 blocking rule by a margin too thin to rely on. `validateSetup`, `SetupFailure` and `SetupValidationResult` therefore live in a sibling **`src/rules/setupValidation.ts`**. Every exported identifier keeps the name `plan.md` gave it; only the module boundary differs. Task 22 measures both files.

---

## File map

**Created:**

- `src/constants/setup.ts` — colour seats, §4.3 offset fraction, segment counts, retry ceilings, §2.1 per-seat supply
- `src/rules/rng.ts` — seeded mulberry32 PRNG + `hashSeed`
- `src/rules/deck.ts` — §4.1 step 5 / §8.1 seeded deck build
- `src/rules/setup.ts` — M3 generation, `regularPolygon`, `inradius`, `sideCountFor`, `boardBounds`
- `src/rules/setupValidation.ts` — SCRUM-4 AC9's whole-board gate over the §4.1 invariants
- `src/rules/__tests__/config.test.ts` — `parseRulesConfig` reject cases
- `src/rules/__tests__/rng.test.ts` — determinism and range guards
- `src/rules/__tests__/deck.test.ts` — composition, ids, seeded shuffle
- `src/rules/__tests__/setup.test.ts` — polygon exactness, generation, 2p mapping, determinism, ceilings
- `src/rules/__tests__/setupValidation.test.ts` — one spec per `SETUP_FAILURE` code
- `src/ui/useRulesConfig.ts` — the project's only `fetch`, four async states
- `src/ui/useGame.ts` — the single reducer store, `NEW_GAME | MOVE`
- `src/ui/StationCard.tsx` + `StationCard.css` — AC11 placeholder card
- `src/ui/BoardTerrain.tsx` + `BoardTerrain.css` — border / river / mountain paths
- `src/ui/BoardOverlays.tsx` + `BoardOverlays.css` — SCRUM-3 AC7 overlay layer, owns `OverlayFlags`
- `src/ui/Board.tsx` + `Board.css` — AC10 self-scaling SVG root
- `src/ui/SeatLegend.tsx` + `SeatLegend.css` — AC12 owner-to-colour pairing
- `src/ui/NewGamePanel.tsx` + `NewGamePanel.css` — AC1 / AC3 player-count selection
- `src/ui/DebugPanel.tsx` + `DebugPanel.css` — SCRUM-3 AC5–8

**Modified:**

- `public/rules.json` — populate `geometry` and `deck.composition`; update `_note`
- `src/constants/game.ts` — add `CONFIG_FAILURE`, `SETUP_FAILURE`, `GAME_ACTION`
- `src/constants/stations.ts` — add `DECK_SIZE`
- `src/rules/config.ts` — widen `RulesConfig`; add `parseRulesConfig`, `describeConfigFailures`
- `src/rules/containment.ts` — add `pointTouchesPath`
- `src/rules/__tests__/fixtures.ts:24-30` — extend `TEST_CONFIG` with the four new fields
- `src/rules/__tests__/stations.test.ts` — assert `DECK_SIZE` against `STATION_DEFINITIONS`
- `src/rules/__tests__/containment.test.ts` — `pointTouchesPath` cases
- `src/ui/AppShell.tsx` + `AppShell.css` — wire config load, game store, board, panels

**Deleted:** *(none)*

**Developer decides or observes:**

- `public/rules.json` → the nine §3 / §8.1 values. Transcriptions, not inventions, but the file becoming non-empty is when the prototype acquires a difficulty setting. Confirm the table in `plan.md` → Data shapes before Task 3 runs.
- `public/rules.json` → whether per-player-count edge lengths should be keys after all. This contract derives them as `borderPerimeter / sideCount`; SCRUM-3 AC1 lists them as stored.
- `public/rules.json` → `tangencyTolerance: 0.5`, inherited unchanged from SCRUM-2, whose `pr-description.md` flags it as still open.
- **Rule reading:** SCRUM-4 AC9 versus §5.2. Resolved here as a separate `validateSetup`; the alternative weakens the in-play validator to serve setup.
- **Rule reading:** whether `DECK_SIZE` should instead be derived from the composition, letting a play-tester try a non-35-card deck from `rules.json` alone.
- `src/constants/setup.ts` → `MOUNTAIN_OFFSET_FRACTION`. §4.3 states the 0–15% range, so it is not unchosen — but it is a difficulty lever and could be promoted to `rules.json`.
- **Visual judgement:** the five `COLOUR_SEATS` hexes — mutual distinguishability, contrast against the terrain strokes, and WCAG AA. AC12's legibility depends on it.
- **Visual judgement:** whether station cards are legible without final art (AC11), whether the four terrain / station layers are distinguishable (AC10), and whether the board fits without clipping at your window sizes.
- **Two dev dependencies** (`jsdom`, `@testing-library/react`) plus a Vitest environment split, if you want automated renderer coverage. Declined by default in this contract.
- **Whether the board is any good** — a 4000 perimeter with a 1400 mountain and 120 cards: tight puzzle or cramped? §12 is the symptom table. Needs the app running.
- Empty folder `.claude/contract/SCRUM-3-tuning-config-and-debug-shell/` — `rmdir` failed with "Device or resource busy"; remove it or plan resolution keeps offering it as a malformed candidate.

---

## Phase 1 — The config surface

Populates `rules.json`, widens `RulesConfig` in lockstep with its one construction site, and adds the validator, the seeded PRNG and the deck build. The phase boundary is safe because every new module is pure and self-contained: the widened interface and its only constructor change in a single task, so there is no point at which a `RulesConfig` is missing a required field. `useRulesConfig` lands unconsumed at the end, which type-checks cleanly — `noUnusedLocals` does not flag unused exports.

### Task 1: Add the three new reason-code maps to `src/constants/game.ts`

- Skill: `react-frontend`

**Files:**
- Modify: `src/constants/game.ts:49` (append after `SKIP_REASON`)

- [ ] **Step 1: Append `CONFIG_FAILURE`, `SETUP_FAILURE` and `GAME_ACTION`**

All three are string-bound names the compiler cannot check across the `rules.json` boundary or a `switch`, so they are declared once here per the skill's constants rule. `GAME_ACTION` is deliberately separate from `MOVE_KIND` — see the doc comment.

```ts
/**
 * parseRulesConfig failure codes (SCRUM-3 AC4). Every one names a specific
 * malformed-config condition so the startup error can say which key is wrong
 * rather than "invalid config".
 */
export const CONFIG_FAILURE = {
  NOT_AN_OBJECT: 'NOT_AN_OBJECT',
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  MISSING_KEY: 'MISSING_KEY',
  NOT_A_NUMBER: 'NOT_A_NUMBER',
  NOT_POSITIVE: 'NOT_POSITIVE',
  TOLERANCE_OUT_OF_RANGE: 'TOLERANCE_OUT_OF_RANGE',
  LONG_NOT_LONGER_THAN_SHORT: 'LONG_NOT_LONGER_THAN_SHORT',
  DECK_COUNT_NOT_INTEGER: 'DECK_COUNT_NOT_INTEGER',
  DECK_TOTAL_MISMATCH: 'DECK_TOTAL_MISMATCH',
  DECK_TYPE_NOT_ALLOWED: 'DECK_TYPE_NOT_ALLOWED',
} as const

/**
 * validateSetup failure codes (SCRUM-4 AC9). These are the §4.1 setup
 * invariants, NOT §10.2's in-play REJECTION_REASON codes — §4.1 step 6
 * requires a starting station to touch the border, which §5.2 forbids for an
 * in-play placement. Two distinct rule sets, two distinct code sets.
 */
export const SETUP_FAILURE = {
  BORDER_SELF_INTERSECTS: 'BORDER_SELF_INTERSECTS',
  BORDER_WRONG_PERIMETER: 'BORDER_WRONG_PERIMETER',
  MOUNTAIN_SELF_INTERSECTS: 'MOUNTAIN_SELF_INTERSECTS',
  MOUNTAIN_WRONG_LENGTH: 'MOUNTAIN_WRONG_LENGTH',
  MOUNTAIN_OUTSIDE_BORDER: 'MOUNTAIN_OUTSIDE_BORDER',
  MOUNTAIN_TOUCHES_BORDER: 'MOUNTAIN_TOUCHES_BORDER',
  MOUNTAIN_TOUCHES_RIVER: 'MOUNTAIN_TOUCHES_RIVER',
  RIVER_SELF_INTERSECTS: 'RIVER_SELF_INTERSECTS',
  RIVER_WRONG_LENGTH: 'RIVER_WRONG_LENGTH',
  RIVER_OUTSIDE_BORDER: 'RIVER_OUTSIDE_BORDER',
  RIVER_BORDER_TOUCH_COUNT: 'RIVER_BORDER_TOUCH_COUNT',
  RIVER_TOO_NEAR_MOUNTAIN: 'RIVER_TOO_NEAR_MOUNTAIN',
  STATION_OUTSIDE_BORDER: 'STATION_OUTSIDE_BORDER',
  STATION_NOT_TOUCHING_BORDER: 'STATION_NOT_TOUCHING_BORDER',
  STATION_TOUCHES_TERRAIN: 'STATION_TOUCHES_TERRAIN',
  STATION_TOUCHES_STATION: 'STATION_TOUCHES_STATION',
  SEAT_COUNT_MISMATCH: 'SEAT_COUNT_MISMATCH',
  SEAT_STARTING_STATION_MISSING: 'SEAT_STARTING_STATION_MISSING',
} as const

/**
 * UI-level action kinds for useGame. Deliberately NOT added to MOVE_KIND:
 * Move is the persisted move-log union that undo and replay derive from, and
 * starting a new game is not an event in a game's own history. Widening Move
 * would force a new case through every existing switch and invalidate any
 * stored log.
 */
export const GAME_ACTION = {
  NEW_GAME: 'NEW_GAME',
  MOVE: 'MOVE',
} as const
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add `DECK_SIZE` to `src/constants/stations.ts`

- Skill: `react-frontend`

**Files:**
- Modify: `src/constants/stations.ts:14` (after the `StationType` export)
- Test: `src/rules/__tests__/stations.test.ts`

- [ ] **Step 1: Add the constant**

```ts
/**
 * §2 — 35 station cards in the box. The M17 tunable is the DISTRIBUTION across
 * this total (rules.json → deck.composition), not the total itself. Rulebook
 * constant, following the precedent turn.ts:23 set with ROUNDS_PER_GAME.
 */
export const DECK_SIZE = 35
```

- [ ] **Step 2: Add a spec tying `DECK_SIZE` to the nine deck-eligible types**

Append to `src/rules/__tests__/stations.test.ts`. This is the guard that catches a `STATION_DEFINITIONS` row being added or removed without the composition type changing with it.

```ts
describe('DECK_SIZE', () => {
  it('is the §2 printed total of 35 station cards', () => {
    expect(DECK_SIZE).toBe(35)
  })

  it('has a STATION_DEFINITIONS row for every deck-eligible type', () => {
    const deckTypes = Object.values(STATION_TYPE).filter(
      (type) => type !== STATION_TYPE.STARTING,
    )
    expect(deckTypes).toHaveLength(9)
    for (const type of deckTypes) {
      expect(STATION_DEFINITIONS[type]).toBeDefined()
    }
  })
})
```

- [ ] **Step 3: Run the stations spec**

Run: `npx vitest run src/rules/__tests__/stations.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 3: Populate `rules.json` and widen `RulesConfig` with its one constructor, in one task

- Skill: `react-frontend`

The mandatory config-change shape: the JSON, the TypeScript type and every construction site move together. `plan.md` → audit established that `RulesConfig` is *constructed* in exactly one place (`fixtures.ts:24`); its 8 `import type` consumers need no change because adding fields cannot break a reader of existing ones. Splitting this across tasks would leave a phase boundary where `TEST_CONFIG` is missing required fields and the whole suite fails to compile.

**Files:**
- Modify: `src/rules/config.ts:6-17` — widen the interface, add `CONFIG_VERSION` and the deck types
- Modify: `src/rules/__tests__/fixtures.ts:24-30` — extend `TEST_CONFIG`
- Config: `public/rules.json` — populate `geometry` and `deck.composition`, update `_note`

- [ ] **Step 1: Write the real values into `public/rules.json`**

Every number is transcribed from `.docs/Game_Rules/Rules.md` §3 and §8.1. Per-player-count edge lengths are **not** keys — they are derived as `borderPerimeter / sideCount`, so AC2's "perimeter preserved" is an identity rather than a tolerance.

```json
{
  "configVersion": 1,
  "_note": "Tuning surface for String Railway. geometry: borderPerimeter (M2, §3, world units) · cardSize (M2, §3, square card footprint) · shortStringLength / longStringLength (M2, §3) · mountainLength (M2, §3, closed-loop perimeter) · riverLength (M2, §3, open arc) · arcLengthTolerance (M6, §5.3.1, fraction, inclusive) · tangencyTolerance (M8, §5.3.2, world units). deck.composition: M17 station-type counts (§8.1), summing to the §2 printed total of 35. Per-player-count border edge lengths are NOT stored — they are derived as borderPerimeter / sideCount. See §12 for the symptom-to-cause tuning table and §14 for the M-number index.",
  "geometry": {
    "borderPerimeter": 4000,
    "cardSize": 120,
    "shortStringLength": 350,
    "longStringLength": 700,
    "mountainLength": 1400,
    "riverLength": 700,
    "arcLengthTolerance": 0.02,
    "tangencyTolerance": 0.5
  },
  "deck": {
    "composition": {
      "HAMLET": 6,
      "VILLAGE": 6,
      "TOWN": 5,
      "SCENIC": 4,
      "RURAL": 4,
      "TERMINUS": 3,
      "RAILYARD": 3,
      "LANDMARK": 2,
      "DEPOT": 2
    }
  }
}
```

- [ ] **Step 2: Widen `RulesConfig` and add the deck types in `src/rules/config.ts`**

Replace the file's existing header comment and interface. `DeckStationType` uses `Exclude` so a composition containing `STARTING` is a compile error on the fixture side and a `DECK_TYPE_NOT_ALLOWED` failure on the JSON side.

```ts
import { STATION_TYPE } from '../constants/stations'
import type { StationType } from '../constants/stations'

/** The only `configVersion` this build can read. A mismatch is a hard failure,
 *  never a best-effort parse. */
export const CONFIG_VERSION = 1

/** §8.1 — the nine deck-eligible types. STARTING is excluded: §2 ships the five
 *  starting stations as their own component, and generation places them. */
export type DeckStationType = Exclude<StationType, typeof STATION_TYPE.STARTING>
export type DeckComposition = Readonly<Record<DeckStationType, number>>

/**
 * Tuning values the engine and the setup generator are injected with. Every
 * field is a tunable read from rules.json (M2 / M6 / M8 / M17) — none may ever
 * appear as a literal in src/.
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
  /** M2 — total border string length, world units. Edge = this / sideCount, so the
   *  perimeter is preserved exactly across every player count (§3, §6). */
  readonly borderPerimeter: number
  /** M2 — mountain closed-loop perimeter, world units. */
  readonly mountainLength: number
  /** M2 — river open-arc length, world units. */
  readonly riverLength: number
  /** M17 — station-type counts, summing to DECK_SIZE. */
  readonly deckComposition: DeckComposition
}
```

- [ ] **Step 3: Extend `TEST_CONFIG` in `src/rules/__tests__/fixtures.ts`**

Keeps the deliberately-synthetic small figures (so the `no hard-coded tunable` grep over `src/` stays meaningful) and adds the four new fields in the same ratios. The composition sums to `DECK_SIZE` so `parseRulesConfig`-independent consumers of the fixture stay valid.

```ts
export const TEST_CONFIG: RulesConfig = {
  shortStringLength: 400,
  longStringLength: 800,
  arcLengthTolerance: 0.02,
  tangencyTolerance: 0.5,
  cardSize: 20,
  borderPerimeter: 2000,
  mountainLength: 700,
  riverLength: 350,
  deckComposition: {
    HAMLET: 6,
    VILLAGE: 6,
    TOWN: 5,
    SCENIC: 4,
    RURAL: 4,
    TERMINUS: 3,
    RAILYARD: 3,
    LANDMARK: 2,
    DEPOT: 2,
  },
}
```

- [ ] **Step 4: Typecheck, then run the existing rules suite to prove the widening broke no reader**

Run: `npm run typecheck; npx vitest run src/rules/__tests__/validate.test.ts src/rules/__tests__/search.test.ts src/rules/__tests__/turn.test.ts src/rules/__tests__/reducer.test.ts`
Expected: typecheck exits 0; Vitest exits 0 with 0 failed — the four specs that consume `TEST_CONFIG` most heavily still pass unchanged.

### Task 4: Add `parseRulesConfig` and `describeConfigFailures` to `src/rules/config.ts`

- Skill: `react-frontend`

Test-first: the reject cases are the entire point of SCRUM-3 AC4, and each one is a specific `CONFIG_FAILURE` code rather than a generic throw.

**Files:**
- Modify: `src/rules/config.ts` — append the result types and both functions
- Test: `src/rules/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing spec for every reject condition**

Create `src/rules/__tests__/config.test.ts`. `valid()` returns a fresh deep copy of the real `rules.json` shape so each case mutates one thing only.

```ts
import { describe, expect, it } from 'vitest'
import { CONFIG_FAILURE } from '../../constants/game'
import { parseRulesConfig, describeConfigFailures } from '../config'

function valid(): Record<string, unknown> {
  return {
    configVersion: 1,
    geometry: {
      borderPerimeter: 4000,
      cardSize: 120,
      shortStringLength: 350,
      longStringLength: 700,
      mountainLength: 1400,
      riverLength: 700,
      arcLengthTolerance: 0.02,
      tangencyTolerance: 0.5,
    },
    deck: {
      composition: {
        HAMLET: 6, VILLAGE: 6, TOWN: 5, SCENIC: 4, RURAL: 4,
        TERMINUS: 3, RAILYARD: 3, LANDMARK: 2, DEPOT: 2,
      },
    },
  }
}

function reasons(raw: unknown): readonly string[] {
  const result = parseRulesConfig(raw)
  return result.ok ? [] : result.failures.map((failure) => failure.reason)
}

describe('parseRulesConfig', () => {
  it('accepts the shipped rules.json shape and returns every field', () => {
    const result = parseRulesConfig(valid())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.config.borderPerimeter).toBe(4000)
    expect(result.config.mountainLength).toBe(1400)
    expect(result.config.riverLength).toBe(700)
    expect(result.config.deckComposition.HAMLET).toBe(6)
  })

  it('rejects a non-object payload', () => {
    expect(reasons(null)).toContain(CONFIG_FAILURE.NOT_AN_OBJECT)
    expect(reasons('{}')).toContain(CONFIG_FAILURE.NOT_AN_OBJECT)
  })

  it('rejects an unreadable configVersion rather than best-effort parsing', () => {
    const raw = valid()
    raw.configVersion = 2
    expect(reasons(raw)).toContain(CONFIG_FAILURE.VERSION_MISMATCH)
  })

  it('names the missing key when a geometry constant is absent', () => {
    const raw = valid()
    delete (raw.geometry as Record<string, unknown>).riverLength
    const result = parseRulesConfig(raw)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failures[0].reason).toBe(CONFIG_FAILURE.MISSING_KEY)
    expect(result.failures[0].key).toBe('geometry.riverLength')
  })

  it('rejects a non-finite number', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).cardSize = 'big'
    expect(reasons(raw)).toContain(CONFIG_FAILURE.NOT_A_NUMBER)
  })

  it('rejects a non-positive length (SCRUM-3 AC4)', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).shortStringLength = 0
    expect(reasons(raw)).toContain(CONFIG_FAILURE.NOT_POSITIVE)
  })

  it('rejects a long string that is not longer than the short one (SCRUM-3 AC4)', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).longStringLength = 350
    expect(reasons(raw)).toContain(CONFIG_FAILURE.LONG_NOT_LONGER_THAN_SHORT)
  })

  it('rejects a tolerance outside (0, 1)', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).arcLengthTolerance = 1
    expect(reasons(raw)).toContain(CONFIG_FAILURE.TOLERANCE_OUT_OF_RANGE)
  })

  it('accepts a zero tangencyTolerance, which is a legitimate exact-touch setting', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).tangencyTolerance = 0
    expect(parseRulesConfig(raw).ok).toBe(true)
  })

  it('rejects a fractional deck count', () => {
    const raw = valid()
    ;(raw.deck as { composition: Record<string, unknown> }).composition.TOWN = 5.5
    expect(reasons(raw)).toContain(CONFIG_FAILURE.DECK_COUNT_NOT_INTEGER)
  })

  it('rejects a composition that does not sum to DECK_SIZE (SCRUM-3 AC4)', () => {
    const raw = valid()
    ;(raw.deck as { composition: Record<string, unknown> }).composition.TOWN = 4
    expect(reasons(raw)).toContain(CONFIG_FAILURE.DECK_TOTAL_MISMATCH)
  })

  it('rejects STARTING in the composition — §2 ships those separately', () => {
    const raw = valid()
    const composition = (raw.deck as { composition: Record<string, unknown> }).composition
    composition.TOWN = 4
    composition.STARTING = 1
    expect(reasons(raw)).toContain(CONFIG_FAILURE.DECK_TYPE_NOT_ALLOWED)
  })

  it('reports every failure, not just the first', () => {
    const raw = valid()
    ;(raw.geometry as Record<string, unknown>).cardSize = -1
    ;(raw.geometry as Record<string, unknown>).riverLength = -1
    const result = parseRulesConfig(raw)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.failures.length).toBeGreaterThanOrEqual(2)
  })
})

describe('describeConfigFailures', () => {
  it('names each offending key by dotted path so the startup error is actionable', () => {
    const raw = valid()
    delete (raw.geometry as Record<string, unknown>).mountainLength
    const result = parseRulesConfig(raw)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const message = describeConfigFailures(result.failures)
    expect(message).toContain('geometry.mountainLength')
    expect(message).toContain(CONFIG_FAILURE.MISSING_KEY)
  })
})
```

- [ ] **Step 2: Confirm the spec fails for the right reason**

Run: `npx vitest run src/rules/__tests__/config.test.ts`
Expected: exits non-zero. The failure is a transform/collection error naming `parseRulesConfig` as not exported — not an assertion failure, because the functions do not exist yet.

- [ ] **Step 3: Implement both functions in `src/rules/config.ts`**

Collects **all** failures rather than short-circuiting, so a play-tester who mistyped two keys fixes both in one pass. No branch returns a default or a partially-filled config.

```ts
export type ConfigFailureReason = (typeof CONFIG_FAILURE)[keyof typeof CONFIG_FAILURE]

export interface ConfigFailure {
  readonly reason: ConfigFailureReason
  /** Dotted path of the offending key, e.g. "geometry.riverLength". */
  readonly key: string
  readonly detail: string
}

export type ParseResult =
  | { readonly ok: true; readonly config: RulesConfig }
  | { readonly ok: false; readonly failures: readonly ConfigFailure[] }

/** The eight geometry keys, all of which must be finite and > 0. */
const GEOMETRY_KEYS = [
  'borderPerimeter',
  'cardSize',
  'shortStringLength',
  'longStringLength',
  'mountainLength',
  'riverLength',
  'arcLengthTolerance',
  'tangencyTolerance',
] as const

/** tangencyTolerance may legitimately be 0 (exact-touch); every other length may not. */
const ZERO_ALLOWED: ReadonlySet<string> = new Set(['tangencyTolerance'])

const DECK_TYPES: readonly DeckStationType[] = Object.values(STATION_TYPE).filter(
  (type): type is DeckStationType => type !== STATION_TYPE.STARTING,
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * SCRUM-3 AC4 — validates a parsed rules.json payload. Takes `unknown` rather
 * than doing its own fetch or JSON.parse so this module stays pure and inside
 * the src/rules/ boundary; useRulesConfig owns both of those.
 *
 * Never returns a default and never returns a partially-filled config: a
 * defaulted constant plays a differently-tuned game and silently corrupts
 * every conclusion drawn from the session.
 */
export function parseRulesConfig(raw: unknown): ParseResult {
  const failures: ConfigFailure[] = []
  const fail = (reason: ConfigFailureReason, key: string, detail: string): void => {
    failures.push({ reason, key, detail })
  }

  if (!isRecord(raw)) {
    return {
      ok: false,
      failures: [
        {
          reason: CONFIG_FAILURE.NOT_AN_OBJECT,
          key: '(root)',
          detail: `expected a JSON object, received ${typeof raw}`,
        },
      ],
    }
  }

  if (raw.configVersion !== CONFIG_VERSION) {
    fail(
      CONFIG_FAILURE.VERSION_MISMATCH,
      'configVersion',
      `this build reads configVersion ${CONFIG_VERSION}, file declares ${String(raw.configVersion)}`,
    )
  }

  const geometry = isRecord(raw.geometry) ? raw.geometry : {}
  if (!isRecord(raw.geometry)) {
    fail(CONFIG_FAILURE.MISSING_KEY, 'geometry', 'geometry object is absent or not an object')
  }

  const numbers = new Map<string, number>()
  for (const key of GEOMETRY_KEYS) {
    const path = `geometry.${key}`
    const value = geometry[key]
    if (value === undefined) {
      fail(CONFIG_FAILURE.MISSING_KEY, path, 'required geometry constant is absent')
      continue
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      fail(CONFIG_FAILURE.NOT_A_NUMBER, path, `expected a finite number, received ${String(value)}`)
      continue
    }
    if (value < 0 || (value === 0 && !ZERO_ALLOWED.has(key))) {
      fail(CONFIG_FAILURE.NOT_POSITIVE, path, `must be greater than 0, received ${value}`)
      continue
    }
    numbers.set(key, value)
  }

  const tolerance = numbers.get('arcLengthTolerance')
  if (tolerance !== undefined && (tolerance <= 0 || tolerance >= 1)) {
    fail(
      CONFIG_FAILURE.TOLERANCE_OUT_OF_RANGE,
      'geometry.arcLengthTolerance',
      `must be a fraction strictly between 0 and 1, received ${tolerance}`,
    )
  }

  const short = numbers.get('shortStringLength')
  const long = numbers.get('longStringLength')
  if (short !== undefined && long !== undefined && long <= short) {
    fail(
      CONFIG_FAILURE.LONG_NOT_LONGER_THAN_SHORT,
      'geometry.longStringLength',
      `long string (${long}) must exceed short string (${short})`,
    )
  }

  const deck = isRecord(raw.deck) ? raw.deck : {}
  const composition = isRecord(deck.composition) ? deck.composition : {}
  if (!isRecord(deck.composition)) {
    fail(
      CONFIG_FAILURE.MISSING_KEY,
      'deck.composition',
      'deck.composition object is absent or not an object',
    )
  }

  for (const key of Object.keys(composition)) {
    if (!(DECK_TYPES as readonly string[]).includes(key)) {
      fail(
        CONFIG_FAILURE.DECK_TYPE_NOT_ALLOWED,
        `deck.composition.${key}`,
        'not a deck-eligible station type (§2 ships the starting stations separately)',
      )
    }
  }

  const counts: Partial<Record<DeckStationType, number>> = {}
  let total = 0
  for (const type of DECK_TYPES) {
    const path = `deck.composition.${type}`
    const value = composition[type]
    if (value === undefined) {
      fail(CONFIG_FAILURE.MISSING_KEY, path, 'required station-type count is absent')
      continue
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      fail(
        CONFIG_FAILURE.DECK_COUNT_NOT_INTEGER,
        path,
        `expected a non-negative integer, received ${String(value)}`,
      )
      continue
    }
    counts[type] = value
    total += value
  }

  if (failures.length === 0 && total !== DECK_SIZE) {
    fail(
      CONFIG_FAILURE.DECK_TOTAL_MISMATCH,
      'deck.composition',
      `counts sum to ${total}, expected the §2 printed total of ${DECK_SIZE}`,
    )
  }

  if (failures.length > 0) {
    return { ok: false, failures }
  }

  return {
    ok: true,
    config: {
      shortStringLength: numbers.get('shortStringLength') as number,
      longStringLength: numbers.get('longStringLength') as number,
      arcLengthTolerance: numbers.get('arcLengthTolerance') as number,
      tangencyTolerance: numbers.get('tangencyTolerance') as number,
      cardSize: numbers.get('cardSize') as number,
      borderPerimeter: numbers.get('borderPerimeter') as number,
      mountainLength: numbers.get('mountainLength') as number,
      riverLength: numbers.get('riverLength') as number,
      deckComposition: counts as DeckComposition,
    },
  }
}

/** One line per failure, for the startup error UI. */
export function describeConfigFailures(failures: readonly ConfigFailure[]): string {
  return failures.map((failure) => `${failure.key}: ${failure.reason} — ${failure.detail}`).join('; ')
}
```

Add `import { DECK_SIZE, STATION_TYPE } from '../constants/stations'` and `import { CONFIG_FAILURE } from '../constants/game'` to the file's import block. The five `as number` / `as DeckComposition` assertions at the return are reachable only when `failures.length === 0`, which guarantees every key was set — noted here so the summary can state the reason rather than leaving them unexplained.

- [ ] **Step 4: Run the spec to green, then typecheck and lint the boundary**

Run: `npx vitest run src/rules/__tests__/config.test.ts; npm run typecheck; npm run lint`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0; lint exits 0 — the `src/rules/**` override proves `config.ts` reached no DOM global and imported no React.

### Task 5: Create the seeded PRNG at `src/rules/rng.ts`

- Skill: `react-frontend`

Determinism is SCRUM-4 AC8, so this is test-first. Hand-rolled mulberry32: ~15 lines, no dependency, and each `createRng` closes over its own counter so two generators never share a stream and no module-level state leaks between tests.

**Files:**
- Create: `src/rules/rng.ts`
- Test: `src/rules/__tests__/rng.test.ts`

- [ ] **Step 1: Write the failing spec**

```ts
import { describe, expect, it } from 'vitest'
import { createRng, hashSeed } from '../rng'

describe('createRng', () => {
  it('produces an identical stream for an identical seed (SCRUM-4 AC8)', () => {
    const a = createRng(12345)
    const b = createRng(12345)
    const drawA = Array.from({ length: 20 }, () => a.nextFloat())
    const drawB = Array.from({ length: 20 }, () => b.nextFloat())
    expect(drawA).toEqual(drawB)
  })

  it('produces different streams for different seeds', () => {
    const a = Array.from({ length: 10 }, ((rng) => () => rng.nextFloat())(createRng(1)))
    const b = Array.from({ length: 10 }, ((rng) => () => rng.nextFloat())(createRng(2)))
    expect(a).not.toEqual(b)
  })

  it('holds no module-level state — two instances are independent', () => {
    const a = createRng(7)
    const first = a.nextFloat()
    const b = createRng(7)
    expect(b.nextFloat()).toBe(first)
  })

  it('keeps nextFloat in [0, 1)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 500; i++) {
      const value = rng.nextFloat()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('keeps nextInt in [0, maxExclusive)', () => {
    const rng = createRng(4)
    for (let i = 0; i < 200; i++) {
      const value = rng.nextInt(5)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(5)
    }
  })

  it('throws rather than returning NaN for a non-positive bound', () => {
    const rng = createRng(4)
    expect(() => rng.nextInt(0)).toThrow(/maxExclusive/)
    expect(() => rng.nextInt(-3)).toThrow(/maxExclusive/)
  })

  it('keeps nextRange within its half-open interval', () => {
    const rng = createRng(31)
    for (let i = 0; i < 200; i++) {
      const value = rng.nextRange(10, 20)
      expect(value).toBeGreaterThanOrEqual(10)
      expect(value).toBeLessThan(20)
    }
  })
})

describe('hashSeed', () => {
  it('is deterministic for the same text', () => {
    expect(hashSeed('interesting-board')).toBe(hashSeed('interesting-board'))
  })

  it('separates different text', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'))
  })

  it('returns a finite 32-bit unsigned integer for any input, including empty', () => {
    for (const text of ['', 'x', '999999999999999999999', '🎲 seed']) {
      const seed = hashSeed(text)
      expect(Number.isInteger(seed)).toBe(true)
      expect(seed).toBeGreaterThanOrEqual(0)
      expect(seed).toBeLessThanOrEqual(0xffffffff)
    }
  })
})
```

- [ ] **Step 2: Confirm it fails because the module does not exist**

Run: `npx vitest run src/rules/__tests__/rng.test.ts`
Expected: exits non-zero with a "Failed to load" / cannot-resolve error for `../rng`.

- [ ] **Step 3: Implement `src/rules/rng.ts`**

```ts
/**
 * Seeded PRNG. Determinism is an acceptance criterion (SCRUM-4 AC8) — the same
 * seed and player count must produce an identical board so a situation can be
 * reproduced — and Math.random() is a defect anywhere reachable from
 * generation. mulberry32 is used because it is ~15 lines, has no dependency,
 * and passes well enough for layout sampling; nothing here is cryptographic.
 *
 * Each createRng closes over its OWN counter. There is deliberately no
 * module-level mutable state: a `let` at module scope would survive HMR and
 * leak across every test in a file, so a spec that passes alone would fail in
 * the suite.
 */
export interface Rng {
  /** Uniform in [0, 1). */
  nextFloat(): number
  /** Uniform integer in [0, maxExclusive). Throws for maxExclusive <= 0. */
  nextInt(maxExclusive: number): number
  /** Uniform in [min, max). */
  nextRange(min: number, max: number): number
}

export function createRng(seed: number): Rng {
  // Coerced to a 32-bit unsigned integer so a fractional or negative seed is
  // still usable rather than poisoning the state with NaN.
  let state = Math.trunc(seed) >>> 0

  const nextFloat = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    nextFloat,
    nextInt(maxExclusive: number): number {
      if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
        throw new Error(`Rng.nextInt: maxExclusive must be a positive number, received ${maxExclusive}`)
      }
      return Math.floor(nextFloat() * maxExclusive)
    },
    nextRange(min: number, max: number): number {
      return min + nextFloat() * (max - min)
    },
  }
}

/**
 * Deterministic 32-bit hash of a user-typed seed (SCRUM-3 AC6 accepts a typed
 * seed, and engineering-standards treats a seed as input to sanitise). FNV-1a:
 * any string, including empty, maps to a usable unsigned integer.
 */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}
```

- [ ] **Step 4: Run to green**

Run: `npx vitest run src/rules/__tests__/rng.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0.

### Task 6: Create the seeded deck build at `src/rules/deck.ts`

- Skill: `react-frontend`

**Files:**
- Create: `src/rules/deck.ts`
- Test: `src/rules/__tests__/deck.test.ts`

- [ ] **Step 1: Write the failing spec**

```ts
import { describe, expect, it } from 'vitest'
import { DECK_SIZE, STATION_DEFINITIONS, STATION_TYPE } from '../../constants/stations'
import { buildDeck } from '../deck'
import { createRng } from '../rng'
import { TEST_CONFIG } from './fixtures'

const composition = TEST_CONFIG.deckComposition

describe('buildDeck', () => {
  it('builds exactly DECK_SIZE cards from the M17 composition (§8.1)', () => {
    expect(buildDeck(composition, createRng(1))).toHaveLength(DECK_SIZE)
  })

  it('honours every per-type count', () => {
    const deck = buildDeck(composition, createRng(1))
    for (const [type, count] of Object.entries(composition)) {
      expect(deck.filter((card) => card.type === type)).toHaveLength(count)
    }
  })

  it('never includes a STARTING card — §2 ships those separately', () => {
    const deck = buildDeck(composition, createRng(1))
    expect(deck.some((card) => card.type === STATION_TYPE.STARTING)).toBe(false)
  })

  it('copies the §8 printed values from STATION_DEFINITIONS, not from config', () => {
    const deck = buildDeck(composition, createRng(1))
    const scenic = deck.find((card) => card.type === STATION_TYPE.SCENIC)
    expect(scenic).toBeDefined()
    const definition = STATION_DEFINITIONS[STATION_TYPE.SCENIC]
    expect(scenic?.bonusFirst).toBe(definition.bonusFirst)
    expect(scenic?.bonusLater).toBe(definition.bonusLater)
    expect(scenic?.playerLimit).toBe(definition.playerLimit)
    expect(scenic?.flags.mountainBonus).toBe(true)
  })

  it('gives every card a unique id so a move log can name one unambiguously', () => {
    const deck = buildDeck(composition, createRng(1))
    expect(new Set(deck.map((card) => card.id)).size).toBe(DECK_SIZE)
  })

  it('shuffles deterministically for a given seed (SCRUM-4 AC8)', () => {
    const a = buildDeck(composition, createRng(42)).map((card) => card.id)
    const b = buildDeck(composition, createRng(42)).map((card) => card.id)
    expect(a).toEqual(b)
  })

  it('shuffles differently for a different seed', () => {
    const a = buildDeck(composition, createRng(1)).map((card) => card.id)
    const b = buildDeck(composition, createRng(2)).map((card) => card.id)
    expect(a).not.toEqual(b)
  })

  it('tolerates a zero count for a type', () => {
    const deck = buildDeck({ ...composition, DEPOT: 0, TOWN: 7 }, createRng(1))
    expect(deck.some((card) => card.type === STATION_TYPE.DEPOT)).toBe(false)
    expect(deck).toHaveLength(DECK_SIZE)
  })
})
```

- [ ] **Step 2: Confirm it fails because the module does not exist**

Run: `npx vitest run src/rules/__tests__/deck.test.ts`
Expected: exits non-zero with a cannot-resolve error for `../deck`.

- [ ] **Step 3: Implement `src/rules/deck.ts`**

```ts
import { STATION_DEFINITIONS, STATION_TYPE } from '../constants/stations'
import { asStationId } from './types'
import type { DeckComposition, DeckStationType } from './config'
import type { Rng } from './rng'
import type { StationCard } from './types'

/**
 * §4.1 step 5 + §8.1 — builds the shuffled station deck from the M17
 * composition. The composition is the tunable (rules.json); the per-card
 * values are §8 printed rulebook data and come from STATION_DEFINITIONS, so
 * retuning the deck can never accidentally retune a card's scoring.
 *
 * Card ids are `${TYPE}-${n}`, 1-based, assigned BEFORE the shuffle. That
 * makes an id stable for a given composition regardless of seed, so a move log
 * naming a card id replays identically even if the shuffle order differs.
 *
 * Iterates DECK_TYPE_ORDER — a fixed array — rather than Object.keys(
 * composition), because object-key iteration order is a determinism hazard the
 * moment rules.json is hand-edited and the keys come back in a different order.
 */
const DECK_TYPE_ORDER: readonly DeckStationType[] = [
  STATION_TYPE.HAMLET,
  STATION_TYPE.VILLAGE,
  STATION_TYPE.TOWN,
  STATION_TYPE.SCENIC,
  STATION_TYPE.RURAL,
  STATION_TYPE.TERMINUS,
  STATION_TYPE.RAILYARD,
  STATION_TYPE.LANDMARK,
  STATION_TYPE.DEPOT,
]

export function buildDeck(composition: DeckComposition, rng: Rng): readonly StationCard[] {
  const cards: StationCard[] = []
  for (const type of DECK_TYPE_ORDER) {
    const definition = STATION_DEFINITIONS[type]
    const count = composition[type]
    for (let n = 1; n <= count; n++) {
      cards.push({
        id: asStationId(`${type}-${n}`),
        type,
        bonusFirst: definition.bonusFirst,
        bonusLater: definition.bonusLater,
        playerLimit: definition.playerLimit,
        flags: definition.flags,
      })
    }
  }

  // Seeded Fisher-Yates, in place on our own local array.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1)
    const swap = cards[i]
    cards[i] = cards[j]
    cards[j] = swap
  }

  return cards
}
```

- [ ] **Step 4: Run to green**

Run: `npx vitest run src/rules/__tests__/deck.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0.

### Task 7: Create the config loader hook at `src/ui/useRulesConfig.ts`

- Skill: `react-frontend`

The project's only `fetch`. All four async states, an `AbortController` released in the effect's cleanup, and no `catch`-to-defaults path anywhere. Lands unconsumed; Task 21 wires it.

**Files:**
- Create: `src/ui/useRulesConfig.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useEffect, useState } from 'react'
import { describeConfigFailures, parseRulesConfig } from '../rules/config'
import type { RulesConfig } from '../rules/config'

const RULES_URL = `${import.meta.env.BASE_URL}rules.json`

/**
 * Four states, not two. A silently failed config load means playing a
 * differently-tuned game than you think you are, which corrupts every
 * play-test conclusion drawn from the session — so `load-failed` and
 * `invalid` are distinct, and neither ever resolves to a default.
 *
 * "Empty" is modelled AS `invalid` rather than as a fifth case: a rules.json
 * with no keys is a validation failure with a specific list of missing keys,
 * which is more actionable than a generic blank state.
 */
export type RulesConfigState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly config: RulesConfig }
  | { readonly status: 'load-failed'; readonly message: string }
  | { readonly status: 'invalid'; readonly message: string }

export function useRulesConfig(): RulesConfigState {
  const [state, setState] = useState<RulesConfigState>({ status: 'loading' })

  useEffect(() => {
    // Released in the cleanup below. Without it, StrictMode's double mount
    // leaves the first request in flight and its resolution writes state
    // after teardown.
    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        const response = await fetch(RULES_URL, { signal: controller.signal })
        if (!response.ok) {
          setState({
            status: 'load-failed',
            message: `Could not load ${RULES_URL} — the server replied ${response.status} ${response.statusText}.`,
          })
          return
        }
        const raw: unknown = await response.json()
        const result = parseRulesConfig(raw)
        if (!result.ok) {
          setState({
            status: 'invalid',
            message: `${RULES_URL} loaded but is not valid: ${describeConfigFailures(result.failures)}`,
          })
          return
        }
        setState({ status: 'ready', config: result.config })
      } catch (error) {
        // An abort is our own teardown, not a failure to report — surfacing it
        // would show a spurious error on every StrictMode dev boot.
        if (controller.signal.aborted) {
          return
        }
        const detail = error instanceof Error ? error.message : String(error)
        setState({
          status: 'load-failed',
          message: `Could not load ${RULES_URL} — ${detail}`,
        })
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [])

  return state
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. Lint proves the `react-hooks` rules are satisfied (empty dep array with no reactive input) and that this file, being under `src/ui/`, is allowed the `fetch` that `src/rules/` is not.

- [ ] **Step 3: Confirm the phase left the rules boundary intact**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage|fetch\("`
Expected: zero hits — `config.ts`, `rng.ts` and `deck.ts` are pure, and the only `fetch` is in `src/ui/`.

---

## Phase 2 — Setup constants and geometry primitives

The pieces `generateSetup` is assembled from: the constants file, one new containment predicate, and the exact-perimeter polygon helpers. Each is independently testable and adds no consumer, so the phase boundary is safe — nothing half-wired, and `setup.ts` exports only complete functions.

### Task 8: Create `src/constants/setup.ts`

- Skill: `react-frontend`

Every value here is either a fixed-meaning constant (colours, §2.1 supply counts) or a numeric bound (segment counts, retry ceilings) — not a tunable. The constants-versus-tunables split in `references/engineering-standards.md` is what decides that, and each entry carries its reason so a later reader does not "fix" one by moving it to `rules.json`.

**Files:**
- Create: `src/constants/setup.ts`

- [ ] **Step 1: Write the file**

```ts
/**
 * Setup-generation constants. None of these is a rules.json tunable: the M2/M6/
 * M8/M17 tunables all live in RulesConfig. What is here is either a value with
 * fixed meaning (a colour, a §2.1 component count) or a numeric bound on a
 * search (segment counts, retry ceilings) — the same category as search.ts's
 * REFINEMENT_DEPTH and turn.ts's ROUNDS_PER_GAME.
 */

/**
 * The five player colours (§2 — five colours of components). A colour never
 * changes value, so this is a constant map, not a tunable. `display` is the SVG
 * stroke/fill. The palette itself is visual judgement — mutual
 * distinguishability, contrast against the terrain strokes and WCAG AA are the
 * developer's to confirm.
 */
export const COLOUR_SEATS = [
  { id: 'RED', label: 'Red', display: '#e0403f' },
  { id: 'BLUE', label: 'Blue', display: '#2f7fd4' },
  { id: 'YELLOW', label: 'Yellow', display: '#e6b52c' },
  { id: 'GREEN', label: 'Green', display: '#3aa757' },
  { id: 'PINK', label: 'Pink', display: '#c760a8' },
] as const

/** Terrain stroke colours (§2 names them green mountain, blue river, black border). */
export const TERRAIN_DISPLAY = {
  BORDER: '#2b2b2b',
  RIVER: '#3f9fd0',
  MOUNTAIN: '#3f7d4a',
} as const

/**
 * §4.3 / SCRUM-4 AC5 — the mountain's centre is offset from the play-area
 * centre by a random 0-15% of the border's inradius. A stated spec range, not
 * an unchosen number. It IS a difficulty lever, so it is a candidate to promote
 * to rules.json if the developer wants to tune it.
 */
export const MOUNTAIN_OFFSET_FRACTION = 0.15

/**
 * Rendering-fidelity bounds. Raising either costs vertices and generation time;
 * neither changes arc length, because both shapes are sized so their polyline
 * length equals the configured length exactly.
 */
export const MOUNTAIN_SEGMENTS = 48
export const RIVER_SEGMENTS = 32

/** Total turn the river may accumulate across its whole walk, radians. Bounds how
 *  far it can curl, which is what keeps it a readable arc rather than a spiral. */
export const RIVER_MAX_TOTAL_TURN = Math.PI * 0.75

/** Fraction of a border edge, from each end, where the river may not start —
 *  keeps its mouth clear of the corners the starting stations occupy. */
export const RIVER_EDGE_MARGIN = 0.2

/**
 * Retry ceilings (SCRUM-4 AC9): generation retries rather than emitting an
 * illegal board, and exhausting a ceiling surfaces an error instead of looping
 * forever. The river's is highest because it is the most constrained sampler
 * and the brief names it as the one likeliest to fail on a cramped board.
 */
export const MAX_MOUNTAIN_ATTEMPTS = 40
export const MAX_RIVER_ATTEMPTS = 200
export const MAX_STATION_ATTEMPTS = 60

/** Bisection depth for the corner-station inset search (§4.1 step 6 — the
 *  smallest inset at which the card is fully inside the border). */
export const STATION_INSET_DEPTH = 24

/** §2.1 derived per-seat supply: 4 short + 1 long string, 2 player markers. */
export const SHORT_STRINGS_PER_SEAT = 4
export const LONG_STRINGS_PER_SEAT = 1
export const MARKERS_PER_SEAT = 2
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 9: Add `pointTouchesPath` to `src/rules/containment.ts`

- Skill: `react-frontend`

The river's "exactly one end touching the border" check (AC6) needs point-to-polyline closeness. `containment.ts` already has a private `distancePointToSegment`; this exposes a narrow predicate over it rather than duplicating the arithmetic or abusing `touchesPath` with a degenerate two-point path.

**Files:**
- Modify: `src/rules/containment.ts:154` (after `pointInAnyRect`)
- Test: `src/rules/__tests__/containment.test.ts`

- [ ] **Step 1: Write the failing spec**

Append to `src/rules/__tests__/containment.test.ts`, matching the file's existing `SQUARE`-style fixture convention.

```ts
describe('pointTouchesPath', () => {
  const line: Polyline = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]

  it('is true for a point exactly on the path', () => {
    expect(pointTouchesPath({ x: 50, y: 0 }, line, 0.5)).toBe(true)
  })

  it('is true for a point within tolerance', () => {
    expect(pointTouchesPath({ x: 50, y: 0.4 }, line, 0.5)).toBe(true)
  })

  it('is false for a point beyond tolerance', () => {
    expect(pointTouchesPath({ x: 50, y: 5 }, line, 0.5)).toBe(false)
  })

  it('is inclusive at exactly the tolerance', () => {
    expect(pointTouchesPath({ x: 50, y: 0.5 }, line, 0.5)).toBe(true)
  })

  it('clamps to the segment extent rather than the infinite line', () => {
    expect(pointTouchesPath({ x: 200, y: 0 }, line, 0.5)).toBe(false)
  })

  it('is false for an empty path rather than throwing', () => {
    expect(pointTouchesPath({ x: 0, y: 0 }, [], 0.5)).toBe(false)
  })

  it('handles a single-point path as plain point distance', () => {
    const single: Polyline = [{ x: 10, y: 10 }]
    expect(pointTouchesPath({ x: 10, y: 10.2 }, single, 0.5)).toBe(true)
    expect(pointTouchesPath({ x: 10, y: 20 }, single, 0.5)).toBe(false)
  })

  it('measures against a closed loop when the caller wraps it themselves', () => {
    expect(pointTouchesPath({ x: 250, y: 0 }, SQUARE, 0.5)).toBe(true)
  })
})
```

- [ ] **Step 2: Confirm it fails on the missing export**

Run: `npx vitest run src/rules/__tests__/containment.test.ts`
Expected: exits non-zero, reporting `pointTouchesPath` is not exported from `../containment`.

- [ ] **Step 3: Implement the predicate**

```ts
/**
 * §10.1-adjacent — point-to-polyline closeness, inclusive of `tolerance`.
 * Needed by setup generation's "exactly one end of the river touches the
 * border" check (SCRUM-4 AC6): touchesPath answers the question for two
 * polylines, and a single point is not a polyline.
 *
 * Treats the polyline as OPEN — it does not wrap the last point back to the
 * first. A caller testing a closed loop passes the loop and gets its edges as
 * written; setup's border loop is tested by appending its first point, which
 * keeps the wrap decision at the call site rather than hidden here.
 */
export function pointTouchesPath(point: Point, other: Polyline, tolerance: number): boolean {
  if (other.length === 0) {
    return false
  }
  if (other.length === 1) {
    return Math.hypot(point.x - other[0].x, point.y - other[0].y) <= tolerance
  }
  for (let i = 0; i < other.length - 1; i++) {
    const segment: Segment = { a: other[i], b: other[i + 1] }
    if (distancePointToSegment(point, segment) <= tolerance) {
      return true
    }
  }
  return false
}
```

Note the closed-loop spec case: `SQUARE` in the existing fixtures is corners-only, so the task's own spec expects the wrap edge to be measured. Either append `SQUARE[0]` at the call site in that one assertion, or drop that assertion — the implementer picks, but the doc comment and the spec must agree.

- [ ] **Step 4: Run to green and confirm no existing containment behaviour moved**

Run: `npx vitest run src/rules/__tests__/containment.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed — every pre-existing containment spec still passes, since only an addition was made.

### Task 10: Add `sideCountFor`, `regularPolygon` and `inradius` to `src/rules/setup.ts`

- Skill: `react-frontend`

The one place regularity is assumed (§4.2 extensibility). Exact perimeter is the whole point: SCRUM-4 AC2 says "total perimeter preserved at the configured value", and `arcLength` is a real predicate the engine applies, so a polygon sized by radius would fail its own length check.

**Files:**
- Create: `src/rules/setup.ts`
- Test: `src/rules/__tests__/setup.test.ts`

- [ ] **Step 1: Write the failing spec**

```ts
import { describe, expect, it } from 'vitest'
import { arcLength, selfIntersects } from '../geometry'
import { inradius, regularPolygon, sideCountFor } from '../setup'
import type { Polyline } from '../types'

/** Closed-loop arc length: the polygon is corners-only, so wrap it to measure. */
function perimeterOf(loop: Polyline): number {
  return arcLength([...loop, loop[0]])
}

describe('sideCountFor', () => {
  it('maps player counts to §6 border shapes', () => {
    expect(sideCountFor(3)).toBe(3)
    expect(sideCountFor(4)).toBe(4)
    expect(sideCountFor(5)).toBe(5)
  })

  it('gives 2 players the four-player square per §9, not a two-corner board (AC3)', () => {
    expect(sideCountFor(2)).toBe(4)
  })
})

describe('regularPolygon', () => {
  const centre = { x: 0, y: 0 }

  it('preserves the requested perimeter exactly for every side count (AC2)', () => {
    for (const sides of [3, 4, 5, 48]) {
      const loop = regularPolygon(centre, sides, 4000)
      expect(perimeterOf(loop)).toBeCloseTo(4000, 6)
    }
  })

  it('returns one vertex per side', () => {
    expect(regularPolygon(centre, 5, 4000)).toHaveLength(5)
  })

  it('gives every edge the same length, perimeter / sideCount', () => {
    const loop = regularPolygon(centre, 4, 4000)
    const wrapped = [...loop, loop[0]]
    for (let i = 0; i < 4; i++) {
      expect(arcLength([wrapped[i], wrapped[i + 1]])).toBeCloseTo(1000, 6)
    }
  })

  it('does not self-intersect', () => {
    const loop = regularPolygon(centre, 5, 4000)
    expect(selfIntersects([...loop, loop[0]])).toBe(false)
  })

  it('is centred on the requested point', () => {
    const loop = regularPolygon({ x: 500, y: 300 }, 4, 4000)
    const meanX = loop.reduce((sum, point) => sum + point.x, 0) / loop.length
    const meanY = loop.reduce((sum, point) => sum + point.y, 0) / loop.length
    expect(meanX).toBeCloseTo(500, 6)
    expect(meanY).toBeCloseTo(300, 6)
  })

  it('winds clockwise from the top so "clockwise seat order" is unambiguous (AC7)', () => {
    const loop = regularPolygon(centre, 4, 4000)
    // First vertex is topmost (most negative y in SVG coordinates).
    expect(loop[0].y).toBeLessThan(loop[1].y)
    // Signed area is negative for clockwise winding in a y-down coordinate system.
    let signed = 0
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]
      const b = loop[(i + 1) % loop.length]
      signed += a.x * b.y - b.x * a.y
    }
    expect(signed).toBeGreaterThan(0)
  })

  it('throws rather than dividing by zero for a degenerate side count', () => {
    expect(() => regularPolygon(centre, 2, 4000)).toThrow(/sideCount/)
    expect(() => regularPolygon(centre, 0, 4000)).toThrow(/sideCount/)
  })

  it('throws for a non-positive perimeter', () => {
    expect(() => regularPolygon(centre, 4, 0)).toThrow(/perimeter/)
  })
})

describe('inradius', () => {
  it('is the distance from centre to an edge midpoint', () => {
    const loop = regularPolygon({ x: 0, y: 0 }, 4, 4000)
    const midX = (loop[0].x + loop[1].x) / 2
    const midY = (loop[0].y + loop[1].y) / 2
    expect(inradius(4, 4000)).toBeCloseTo(Math.hypot(midX, midY), 6)
  })

  it('is 500 for a 4000-perimeter square', () => {
    expect(inradius(4, 4000)).toBeCloseTo(500, 6)
  })

  it('is always smaller than the circumradius', () => {
    for (const sides of [3, 4, 5]) {
      const loop = regularPolygon({ x: 0, y: 0 }, sides, 4000)
      const circumradius = Math.hypot(loop[0].x, loop[0].y)
      expect(inradius(sides, 4000)).toBeLessThan(circumradius)
    }
  })
})
```

- [ ] **Step 2: Confirm it fails because the module does not exist**

Run: `npx vitest run src/rules/__tests__/setup.test.ts`
Expected: exits non-zero with a cannot-resolve error for `../setup`.

- [ ] **Step 3: Implement the three helpers**

```ts
import type { Point, Polyline } from './types'

export type PlayerCount = 2 | 3 | 4 | 5

/**
 * §6 / §9 — the border shape's side count. Two players play the FOUR-player
 * square (SCRUM-4 AC3: selecting 2 must not produce a two-corner board), which
 * is also what gives the 2-player variant four corners for its four
 * colour-seats.
 */
export function sideCountFor(playerCount: PlayerCount): 3 | 4 | 5 {
  return playerCount === 2 ? 4 : playerCount
}

/**
 * A regular polygon with EXACTLY the requested perimeter (SCRUM-4 AC2). The
 * edge is perimeter / sideCount and the circumradius follows from it as
 * edge / (2 sin(pi/n)) — so the perimeter is an identity, not a tolerance, and
 * the per-player-count edge lengths §3 tabulates (1333 / 1000 / 800) are
 * derived here rather than stored as separate config keys that could drift.
 *
 * Vertex 0 sits at the top (angle -pi/2) and the winding is CLOCKWISE in SVG's
 * y-down coordinate system, so "in clockwise seat order" (§4.1 step 7) means
 * simply walking this array.
 *
 * This is the ONLY function that assumes regularity. Everything downstream
 * consumes a Polyline plus its vertex list, so §4.2's irregular borders later
 * mean a sibling generator for this one function, not a rewrite.
 */
export function regularPolygon(centre: Point, sideCount: number, perimeter: number): Polyline {
  if (!Number.isInteger(sideCount) || sideCount < 3) {
    throw new Error(`regularPolygon: sideCount must be an integer >= 3, received ${sideCount}`)
  }
  if (!Number.isFinite(perimeter) || perimeter <= 0) {
    throw new Error(`regularPolygon: perimeter must be a positive number, received ${perimeter}`)
  }

  const edge = perimeter / sideCount
  // sin(pi/n) is strictly positive for n >= 3, so the divisor is guarded by the
  // sideCount check above rather than needing its own epsilon test.
  const circumradius = edge / (2 * Math.sin(Math.PI / sideCount))

  const points: Point[] = []
  for (let i = 0; i < sideCount; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / sideCount
    points.push({
      x: centre.x + circumradius * Math.cos(angle),
      y: centre.y + circumradius * Math.sin(angle),
    })
  }
  return points
}

/** Distance from the centre to an edge midpoint — the basis for the mountain's
 *  0-15% centre offset (SCRUM-4 AC5). */
export function inradius(sideCount: number, perimeter: number): number {
  if (!Number.isInteger(sideCount) || sideCount < 3) {
    throw new Error(`inradius: sideCount must be an integer >= 3, received ${sideCount}`)
  }
  return perimeter / sideCount / (2 * Math.tan(Math.PI / sideCount))
}
```

- [ ] **Step 4: Run to green, typecheck and lint**

Run: `npx vitest run src/rules/__tests__/setup.test.ts; npm run typecheck; npm run lint`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0; lint exits 0.

---

## Phase 3 — Generation and its whole-board gate

The validator lands before the generator so `generateSetup` can use it as its final gate rather than duplicating the checks. The phase boundary is safe because the generator is the only new consumer of the validator, and both are pure functions with no UI wiring — at the end of this phase the engine can produce and prove a legal board with no component in existence.

### Task 11: Create `src/rules/setupValidation.ts`

- Skill: `react-frontend`

SCRUM-4 AC9's gate. **This is deliberately not `validateStationPlacement`**: §4.1 step 6 requires a starting station to *touch* the border, while §5.2's validator rejects any station touching any string — and the border is a `PlacedPath`. Running the in-play validator over a generated board would reject every legal setup. Same §10.1 predicates, different rule set.

**Files:**
- Create: `src/rules/setupValidation.ts`
- Test: `src/rules/__tests__/setupValidation.test.ts`

- [ ] **Step 1: Write the failing spec — one case per failure code**

Each case takes a known-good state and breaks exactly one invariant, so a passing suite proves each code is reachable and that a legal board trips none of them. Uses `makeState` / `makePath` / `makeStation` / `makeSeat` from `fixtures.ts` and `TEST_CONFIG`.

```ts
import { describe, expect, it } from 'vitest'
import { PATH_KIND } from '../../constants/game'
import { SETUP_FAILURE } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { validateSetup } from '../setupValidation'
import { generateSetup } from '../setup'
import { makePath, makeSeat, makeStation, makeState, TEST_CONFIG } from './fixtures'
import type { GameState } from '../types'

/** A real generated 4-player board is the known-good baseline — validating the
 *  generator's own output against the validator is exactly AC9. */
function goodState(): GameState {
  return generateSetup({ playerCount: 4, seed: 2026 }, TEST_CONFIG)
}

function codes(state: GameState): readonly string[] {
  const result = validateSetup(state, TEST_CONFIG)
  return result.ok ? [] : result.failures.map((failure) => failure.reason)
}

describe('validateSetup', () => {
  it('passes a freshly generated board for every player count (AC9)', () => {
    for (const playerCount of [2, 3, 4, 5] as const) {
      const state = generateSetup({ playerCount, seed: 77 }, TEST_CONFIG)
      expect(validateSetup(state, TEST_CONFIG)).toEqual({ ok: true })
    }
  })

  it('does NOT reject a starting station for touching the border (§4.1 step 6)', () => {
    // The check §5.2 would fail. This is the regression guard for the whole
    // reason this module exists rather than reusing validateStationPlacement.
    expect(codes(goodState())).not.toContain(SETUP_FAILURE.STATION_TOUCHES_TERRAIN)
  })

  it('reports a border whose perimeter is not the configured value', () => {
    const state = goodState()
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.BORDER
          ? makePath(PATH_KIND.BORDER, [
              { x: 0, y: 0 },
              { x: 10, y: 0 },
              { x: 10, y: 10 },
              { x: 0, y: 10 },
            ])
          : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.BORDER_WRONG_PERIMETER)
  })

  it('reports a self-intersecting border', () => {
    const state = goodState()
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.BORDER
          ? makePath(PATH_KIND.BORDER, [
              { x: 0, y: 0 },
              { x: 100, y: 100 },
              { x: 100, y: 0 },
              { x: 0, y: 100 },
            ])
          : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.BORDER_SELF_INTERSECTS)
  })

  it('reports a mountain of the wrong length', () => {
    const state = goodState()
    const mountain = state.paths.find((path) => path.kind === PATH_KIND.MOUNTAIN)
    expect(mountain).toBeDefined()
    const shrunk = mountain!.path.map((point) => ({ x: point.x * 0.5, y: point.y * 0.5 }))
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.MOUNTAIN ? makePath(PATH_KIND.MOUNTAIN, shrunk) : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.MOUNTAIN_WRONG_LENGTH)
  })

  it('reports a mountain that escapes the border', () => {
    const state = goodState()
    const mountain = state.paths.find((path) => path.kind === PATH_KIND.MOUNTAIN)
    const shifted = mountain!.path.map((point) => ({ x: point.x + 100000, y: point.y }))
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.MOUNTAIN ? makePath(PATH_KIND.MOUNTAIN, shifted) : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.MOUNTAIN_OUTSIDE_BORDER)
  })

  it('reports a river whose length is wrong', () => {
    const state = goodState()
    const river = state.paths.find((path) => path.kind === PATH_KIND.RIVER)
    const truncated = river!.path.slice(0, 3)
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.RIVER ? makePath(PATH_KIND.RIVER, truncated) : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.RIVER_WRONG_LENGTH)
  })

  it('reports a river touching the border at both ends (AC6 — exactly one)', () => {
    const state = goodState()
    const river = state.paths.find((path) => path.kind === PATH_KIND.RIVER)
    const reversedEndOnBorder = [...river!.path, river!.path[0]]
    const broken: GameState = {
      ...state,
      paths: state.paths.map((path) =>
        path.kind === PATH_KIND.RIVER
          ? makePath(PATH_KIND.RIVER, reversedEndOnBorder)
          : path,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.RIVER_BORDER_TOUCH_COUNT)
  })

  it('reports a station fully outside the border', () => {
    const state = goodState()
    const broken: GameState = {
      ...state,
      stations: [
        ...state.stations.slice(1),
        makeStation(STATION_TYPE.STARTING, {
          x: 900000,
          y: 900000,
          width: TEST_CONFIG.cardSize,
          height: TEST_CONFIG.cardSize,
        }),
      ],
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.STATION_OUTSIDE_BORDER)
  })

  it('reports two stations overlapping each other', () => {
    const state = goodState()
    const first = state.stations[0]
    const duplicate = makeStation(STATION_TYPE.STARTING, first.rect)
    const broken: GameState = { ...state, stations: [...state.stations, duplicate] }
    expect(codes(broken)).toContain(SETUP_FAILURE.STATION_TOUCHES_STATION)
  })

  it('reports a seat count that does not match the turn order', () => {
    const state = goodState()
    const broken: GameState = { ...state, seats: state.seats.slice(1) }
    expect(codes(broken)).toContain(SETUP_FAILURE.SEAT_COUNT_MISMATCH)
  })

  it('reports a seat whose starting station is not on the board', () => {
    const state = goodState()
    const broken: GameState = {
      ...state,
      seats: state.seats.map((seat, index) =>
        index === 0 ? makeSeat(String(seat.colour), String(seat.owner)) : seat,
      ),
    }
    expect(codes(broken)).toContain(SETUP_FAILURE.SEAT_STARTING_STATION_MISSING)
  })

  it('reports a missing border rather than passing vacuously', () => {
    const bare = makeState({ paths: [] })
    const result = validateSetup(bare, TEST_CONFIG)
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Confirm it fails on the missing module**

Run: `npx vitest run src/rules/__tests__/setupValidation.test.ts`
Expected: exits non-zero with a cannot-resolve error for `../setupValidation`.

- [ ] **Step 3: Implement `src/rules/setupValidation.ts`**

```ts
import { PATH_KIND, SETUP_FAILURE } from '../constants/game'
import { arcLength, selfIntersects } from './geometry'
import {
  pathFullyInside,
  pointTouchesPath,
  rectFullyInside,
  rectsOverlapOrTouch,
  touchesPath,
  touchesRect,
} from './containment'
import type { RulesConfig } from './config'
import type { GameState, PlacedPath, Polyline } from './types'

export type SetupFailureReason = (typeof SETUP_FAILURE)[keyof typeof SETUP_FAILURE]

export interface SetupFailure {
  readonly reason: SetupFailureReason
  readonly detail: string
}

export type SetupValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly failures: readonly SetupFailure[] }

/** A closed loop is stored corners-only, so wrap it to measure or to test
 *  containment along its final edge. */
function closed(loop: Polyline): Polyline {
  return loop.length === 0 ? loop : [...loop, loop[0]]
}

function terrain(state: GameState, kind: PlacedPath['kind']): PlacedPath | undefined {
  return state.paths.find((path) => path.kind === kind)
}

/** Inclusive, matching validate.ts:96's M6 comparison — a length exactly at
 *  ±tolerance passes. */
function lengthWithinTolerance(actual: number, nominal: number, tolerance: number): boolean {
  return Math.abs(actual - nominal) <= nominal * tolerance
}

/**
 * SCRUM-4 AC9 — a generated board always passes the rules engine's own legality
 * checks. Those checks are the §4.1 SETUP invariants, not §10.2's in-play
 * order: §4.1 step 6 requires a starting station to be both contained within
 * AND touching the border, which validateStationPlacement rejects outright
 * because the border is a PlacedPath and §5.2 forbids a station touching any
 * string. Same §10.1 predicates underneath; different rule set on top.
 *
 * Collects every failure rather than short-circuiting, so a generator bug
 * reports its full shape in one run.
 */
export function validateSetup(state: GameState, config: RulesConfig): SetupValidationResult {
  const failures: SetupFailure[] = []
  const fail = (reason: SetupFailureReason, detail: string): void => {
    failures.push({ reason, detail })
  }

  const border = terrain(state, PATH_KIND.BORDER)
  const river = terrain(state, PATH_KIND.RIVER)
  const mountain = terrain(state, PATH_KIND.MOUNTAIN)

  if (!border) {
    // Everything below measures against the border, so a missing one is
    // reported and the rest is skipped rather than passing vacuously.
    fail(SETUP_FAILURE.BORDER_SELF_INTERSECTS, 'no BORDER path is present in state.paths')
    return { ok: false, failures }
  }

  const borderLoop = closed(border.path)

  if (selfIntersects(borderLoop)) {
    fail(SETUP_FAILURE.BORDER_SELF_INTERSECTS, 'the border loop crosses itself (§4.1 step 2)')
  }
  const borderLength = arcLength(borderLoop)
  if (!lengthWithinTolerance(borderLength, config.borderPerimeter, config.arcLengthTolerance)) {
    fail(
      SETUP_FAILURE.BORDER_WRONG_PERIMETER,
      `border perimeter ${borderLength.toFixed(2)} is not within tolerance of borderPerimeter ${config.borderPerimeter}`,
    )
  }

  if (mountain) {
    const mountainLoop = closed(mountain.path)
    if (selfIntersects(mountainLoop)) {
      fail(SETUP_FAILURE.MOUNTAIN_SELF_INTERSECTS, 'the mountain loop crosses itself (§4.1 step 4)')
    }
    const mountainLength = arcLength(mountainLoop)
    if (!lengthWithinTolerance(mountainLength, config.mountainLength, config.arcLengthTolerance)) {
      fail(
        SETUP_FAILURE.MOUNTAIN_WRONG_LENGTH,
        `mountain length ${mountainLength.toFixed(2)} is not within tolerance of mountainLength ${config.mountainLength}`,
      )
    }
    if (!pathFullyInside(mountainLoop, border.path)) {
      fail(SETUP_FAILURE.MOUNTAIN_OUTSIDE_BORDER, 'the mountain is not fully inside the border')
    }
    if (touchesPath(mountainLoop, borderLoop, config.tangencyTolerance)) {
      fail(SETUP_FAILURE.MOUNTAIN_TOUCHES_BORDER, 'the mountain touches the border (§4.1 step 4)')
    }
    if (river && touchesPath(mountainLoop, river.path, config.tangencyTolerance)) {
      fail(SETUP_FAILURE.MOUNTAIN_TOUCHES_RIVER, 'the mountain touches the river (§4.1 step 4)')
    }
  }

  if (river) {
    if (selfIntersects(river.path)) {
      fail(SETUP_FAILURE.RIVER_SELF_INTERSECTS, 'the river crosses itself (§4.1 step 3)')
    }
    const riverLength = arcLength(river.path)
    if (!lengthWithinTolerance(riverLength, config.riverLength, config.arcLengthTolerance)) {
      fail(
        SETUP_FAILURE.RIVER_WRONG_LENGTH,
        `river length ${riverLength.toFixed(2)} is not within tolerance of riverLength ${config.riverLength}`,
      )
    }
    if (!pathFullyInside(river.path, border.path)) {
      fail(SETUP_FAILURE.RIVER_OUTSIDE_BORDER, 'the river leaves the border')
    }
    // AC6 / §4.1 step 3 — EXACTLY one end touches the border, and no interior
    // vertex does either, which is what "curving inward" means geometrically.
    const touching = river.path.filter((point) =>
      pointTouchesPath(point, borderLoop, config.tangencyTolerance),
    )
    const endsTouching = [river.path[0], river.path[river.path.length - 1]].filter((point) =>
      pointTouchesPath(point, borderLoop, config.tangencyTolerance),
    )
    if (endsTouching.length !== 1 || touching.length !== 1) {
      fail(
        SETUP_FAILURE.RIVER_BORDER_TOUCH_COUNT,
        `exactly one river END must touch the border and no other vertex may: ${endsTouching.length} end(s) and ${touching.length} vertex/vertices touch`,
      )
    }
    if (mountain && touchesPath(river.path, closed(mountain.path), config.cardSize)) {
      fail(
        SETUP_FAILURE.RIVER_TOO_NEAR_MOUNTAIN,
        `the river comes within one card width (${config.cardSize}) of the mountain (§4.3)`,
      )
    }
  }

  for (const station of state.stations) {
    if (!rectFullyInside(station.rect, border.path)) {
      fail(
        SETUP_FAILURE.STATION_OUTSIDE_BORDER,
        `station ${String(station.card.id)} is not fully inside the border (§4.1 step 6)`,
      )
    }
    // §4.1 step 6 requires the card to be TOUCHING the border, so this asserts
    // the presence of a touch — the inverse of §5.2's in-play check.
    if (!touchesRect(borderLoop, station.rect, config.tangencyTolerance)) {
      fail(
        SETUP_FAILURE.STATION_NOT_TOUCHING_BORDER,
        `station ${String(station.card.id)} does not touch the border (§4.1 step 6)`,
      )
    }
    for (const kind of [PATH_KIND.RIVER, PATH_KIND.MOUNTAIN] as const) {
      const path = terrain(state, kind)
      if (path && touchesRect(closed(path.path), station.rect, config.tangencyTolerance)) {
        fail(
          SETUP_FAILURE.STATION_TOUCHES_TERRAIN,
          `station ${String(station.card.id)} touches the ${kind.toLowerCase()} (§5.2)`,
        )
      }
    }
    for (const other of state.stations) {
      if (other !== station && rectsOverlapOrTouch(station.rect, other.rect)) {
        fail(
          SETUP_FAILURE.STATION_TOUCHES_STATION,
          `stations ${String(station.card.id)} and ${String(other.card.id)} overlap or touch`,
        )
      }
    }
  }

  if (state.seats.length !== state.turnOrder.length) {
    fail(
      SETUP_FAILURE.SEAT_COUNT_MISMATCH,
      `${state.seats.length} seat(s) but ${state.turnOrder.length} entries in turnOrder`,
    )
  }
  for (const seat of state.seats) {
    if (!state.stations.some((station) => station.card.id === seat.startingStationId)) {
      fail(
        SETUP_FAILURE.SEAT_STARTING_STATION_MISSING,
        `seat ${String(seat.colour)} names startingStationId ${String(seat.startingStationId)}, which is not on the board`,
      )
    }
  }

  return failures.length > 0 ? { ok: false, failures } : { ok: true }
}
```

Note: `touchesRect`'s first parameter is the *path*, so the station checks pass the loop first. The `STATION_TOUCHES_STATION` loop reports each offending pair twice (once from each side); that is acceptable for a diagnostic and cheaper than tracking seen pairs, but say so in the summary rather than leaving it as an apparent bug.

- [ ] **Step 4: Leave the spec red until Task 12 exists**

Run: `npm run typecheck`
Expected: exits 0. `setupValidation.test.ts` still fails because it imports `generateSetup`, which Task 12 adds — that is the intended state at this step, not a defect. Do not stub `generateSetup` to make it green early.

### Task 12: Add `generateSetup` and `SetupGenerationError` to `src/rules/setup.ts`

- Skill: `react-frontend`

M3 generation (SCRUM-4 AC1, 4–9). The three samplers stay **private** to this module — `containment.ts` is the pattern reference for private helpers behind narrow exports, and each is verified through `generateSetup` plus `validateSetup` rather than by exporting internals a caller has no use for.

**Files:**
- Modify: `src/rules/setup.ts` — append the error class, the samplers and `generateSetup`
- Test: `src/rules/__tests__/setup.test.ts` — append the generation specs

- [ ] **Step 1: Append the failing generation specs**

```ts
describe('generateSetup', () => {
  it('produces a complete setup: border, mountain, river and one station per corner (AC1)', () => {
    const state = generateSetup({ playerCount: 4, seed: 11 }, TEST_CONFIG)
    const kinds = state.paths.map((path) => path.kind)
    expect(kinds).toContain(PATH_KIND.BORDER)
    expect(kinds).toContain(PATH_KIND.MOUNTAIN)
    expect(kinds).toContain(PATH_KIND.RIVER)
    expect(state.stations).toHaveLength(4)
    expect(state.stations.every((station) => station.card.type === STATION_TYPE.STARTING)).toBe(true)
  })

  it('matches the §6 border shape to the player count (AC2)', () => {
    expect(generateSetup({ playerCount: 3, seed: 1 }, TEST_CONFIG).stations).toHaveLength(3)
    expect(generateSetup({ playerCount: 5, seed: 1 }, TEST_CONFIG).stations).toHaveLength(5)
  })

  it('gives 2 players the square setup with four colour-seats, not two (AC3, AC4)', () => {
    const state = generateSetup({ playerCount: 2, seed: 1 }, TEST_CONFIG)
    expect(state.seats).toHaveLength(4)
    expect(state.stations).toHaveLength(4)
    expect(state.turnOrder).toHaveLength(4)
  })

  it('maps four 2-player colour-seats to two owners in [A1, B1, A2, B2] order (AC4)', () => {
    const state = generateSetup({ playerCount: 2, seed: 1 }, TEST_CONFIG)
    const owners = state.turnOrder.map(
      (colour) => state.seats.find((seat) => seat.colour === colour)?.owner,
    )
    expect(owners[0]).toBe(owners[2])
    expect(owners[1]).toBe(owners[3])
    expect(owners[0]).not.toBe(owners[1])
    expect(new Set(owners).size).toBe(2)
  })

  it('gives each 2-player owner opposite corners (AC4)', () => {
    const state = generateSetup({ playerCount: 2, seed: 1 }, TEST_CONFIG)
    const centre = { x: 0, y: 0 }
    const border = state.paths.find((path) => path.kind === PATH_KIND.BORDER)
    centre.x = border!.path.reduce((sum, p) => sum + p.x, 0) / border!.path.length
    centre.y = border!.path.reduce((sum, p) => sum + p.y, 0) / border!.path.length
    const seatFor = (colour: ColourId) => state.seats.find((seat) => seat.colour === colour)
    const rectFor = (colour: ColourId) =>
      state.stations.find((s) => s.card.id === seatFor(colour)?.startingStationId)!.rect
    const angle = (colour: ColourId) => {
      const rect = rectFor(colour)
      return Math.atan2(rect.y + rect.height / 2 - centre.y, rect.x + rect.width / 2 - centre.x)
    }
    // A1 and A2 sit two corners apart on a square, i.e. ~pi radians of separation.
    const separation = Math.abs(angle(state.turnOrder[0]) - angle(state.turnOrder[2]))
    expect(Math.min(separation, 2 * Math.PI - separation)).toBeGreaterThan(Math.PI * 0.75)
  })

  it('gives every seat the §2.1 supply and its own starting station', () => {
    const state = generateSetup({ playerCount: 5, seed: 3 }, TEST_CONFIG)
    for (const seat of state.seats) {
      expect(seat.shortStringsLeft).toBe(SHORT_STRINGS_PER_SEAT)
      expect(seat.longStringsLeft).toBe(LONG_STRINGS_PER_SEAT)
      expect(seat.markersLeft).toBe(MARKERS_PER_SEAT)
      expect(seat.score).toBe(0)
      expect(state.stations.some((s) => s.card.id === seat.startingStationId)).toBe(true)
    }
    expect(new Set(state.seats.map((seat) => seat.startingStationId)).size).toBe(5)
  })

  it('sets each starting station markerOwner to its own colour so §9 fires', () => {
    const state = generateSetup({ playerCount: 2, seed: 3 }, TEST_CONFIG)
    for (const seat of state.seats) {
      const station = state.stations.find((s) => s.card.id === seat.startingStationId)
      expect(station?.markerOwner).toBe(seat.colour)
    }
  })

  it('does not spend a player marker on the starting station (§2 / §2.1)', () => {
    const state = generateSetup({ playerCount: 4, seed: 3 }, TEST_CONFIG)
    expect(state.seats.every((seat) => seat.markersLeft === MARKERS_PER_SEAT)).toBe(true)
  })

  it('offsets the mountain centre by no more than 15% of the inradius (AC5)', () => {
    const limit = inradius(4, TEST_CONFIG.borderPerimeter) * MOUNTAIN_OFFSET_FRACTION
    for (let seed = 0; seed < 25; seed++) {
      const state = generateSetup({ playerCount: 4, seed }, TEST_CONFIG)
      const border = state.paths.find((path) => path.kind === PATH_KIND.BORDER)!
      const mountain = state.paths.find((path) => path.kind === PATH_KIND.MOUNTAIN)!
      const centreOf = (points: typeof border.path) => ({
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
      })
      const b = centreOf(border.path)
      const m = centreOf(mountain.path)
      expect(Math.hypot(m.x - b.x, m.y - b.y)).toBeLessThanOrEqual(limit + 1e-6)
    }
  })

  it('builds the full shuffled deck from the M17 composition (§4.1 step 5)', () => {
    const state = generateSetup({ playerCount: 4, seed: 5 }, TEST_CONFIG)
    expect(state.deck).toHaveLength(DECK_SIZE)
    expect(state.deck.some((card) => card.type === STATION_TYPE.STARTING)).toBe(false)
  })

  it('starts in round 1, phase STATION, seat 0, IN_PLAY, with an empty move log', () => {
    const state = generateSetup({ playerCount: 4, seed: 5 }, TEST_CONFIG)
    expect(state.round).toBe(1)
    expect(state.activeSeatIndex).toBe(0)
    expect(state.phase).toBe(TURN_PHASE.STATION)
    expect(state.status).toBe('IN_PLAY')
    expect(state.moveLog).toEqual([])
    expect(state.pendingCard).toBeNull()
    expect(state.lastScoring).toBeNull()
  })

  it('is deterministic — same seed and player count give an identical board (AC8)', () => {
    for (const playerCount of [2, 3, 4, 5] as const) {
      const a = generateSetup({ playerCount, seed: 987 }, TEST_CONFIG)
      const b = generateSetup({ playerCount, seed: 987 }, TEST_CONFIG)
      expect(a).toEqual(b)
    }
  })

  it('produces a different board for a different seed', () => {
    const a = generateSetup({ playerCount: 4, seed: 1 }, TEST_CONFIG)
    const b = generateSetup({ playerCount: 4, seed: 2 }, TEST_CONFIG)
    expect(a.paths).not.toEqual(b.paths)
  })

  it('emits a board that passes validateSetup across many seeds (AC9)', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const playerCount of [2, 3, 4, 5] as const) {
        const state = generateSetup({ playerCount, seed }, TEST_CONFIG)
        expect(validateSetup(state, TEST_CONFIG)).toEqual({ ok: true })
      }
    }
  })

  it('throws SetupGenerationError carrying the seed when the board is impossible (AC9)', () => {
    // A card larger than the whole border leaves nowhere legal for a corner
    // station, so the station sampler exhausts its ceiling.
    const impossible: RulesConfig = {
      ...TEST_CONFIG,
      borderPerimeter: 40,
      cardSize: 500,
      mountainLength: 20,
      riverLength: 10,
    }
    let thrown: unknown
    try {
      generateSetup({ playerCount: 4, seed: 4242 }, impossible)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(SetupGenerationError)
    const error = thrown as SetupGenerationError
    expect(error.seed).toBe(4242)
    expect(error.playerCount).toBe(4)
    expect(error.failures.length).toBeGreaterThan(0)
    expect(error.message).toContain('4242')
  })

  it('terminates rather than hanging on an over-constrained board (AC9)', () => {
    const cramped: RulesConfig = { ...TEST_CONFIG, borderPerimeter: 60, cardSize: 400 }
    expect(() => generateSetup({ playerCount: 5, seed: 9 }, cramped)).toThrow(SetupGenerationError)
  })
})
```

Add to the spec's import block: `PATH_KIND`, `TURN_PHASE` from `../../constants/game`; `DECK_SIZE`, `STATION_TYPE` from `../../constants/stations`; `MOUNTAIN_OFFSET_FRACTION`, `SHORT_STRINGS_PER_SEAT`, `LONG_STRINGS_PER_SEAT`, `MARKERS_PER_SEAT` from `../../constants/setup`; `generateSetup`, `SetupGenerationError` from `../setup`; `validateSetup` from `../setupValidation`; `TEST_CONFIG` from `./fixtures`; and types `ColourId`, `RulesConfig`.

- [ ] **Step 2: Confirm the new specs fail on the missing exports**

Run: `npx vitest run src/rules/__tests__/setup.test.ts`
Expected: exits non-zero, reporting `generateSetup` / `SetupGenerationError` are not exported. The Task 10 describes (`sideCountFor`, `regularPolygon`, `inradius`) do not run either, because a collection error stops the whole file — that is expected here, not a regression.

- [ ] **Step 3: Add the error class and the mountain sampler**

```ts
/**
 * Raised when a sampler exhausts its retry ceiling (SCRUM-4 AC9 — a ceiling
 * surfaces an error instead of looping forever). Carries the seed and player
 * count so the failing board is reproducible from the message alone, which is
 * the diagnostic the brief's stated river risk asks for.
 */
export class SetupGenerationError extends Error {
  readonly seed: number
  readonly playerCount: PlayerCount
  readonly failures: readonly SetupFailure[]

  constructor(seed: number, playerCount: PlayerCount, failures: readonly SetupFailure[]) {
    super(
      `generateSetup failed for ${playerCount} players at seed ${seed}: ` +
        failures.map((failure) => `${failure.reason} (${failure.detail})`).join('; '),
    )
    this.name = 'SetupGenerationError'
    this.seed = seed
    this.playerCount = playerCount
    this.failures = failures
  }
}

function centroid(points: Polyline): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  }
}

/**
 * §4.1 step 4 / §4.3 / AC5 — a closed loop whose PERIMETER is exactly
 * config.mountainLength (a circle polygonised by radius would come out short
 * and fail arcLength's own check), centred within MOUNTAIN_OFFSET_FRACTION of
 * the border's inradius from the play-area centre. Rejected and resampled if it
 * escapes or touches the border.
 */
function sampleMountain(
  centre: Point,
  borderLoop: Polyline,
  sideCount: number,
  config: RulesConfig,
  rng: Rng,
): Polyline {
  const maxOffset = inradius(sideCount, config.borderPerimeter) * MOUNTAIN_OFFSET_FRACTION
  const closedBorder = [...borderLoop, borderLoop[0]]

  for (let attempt = 0; attempt < MAX_MOUNTAIN_ATTEMPTS; attempt++) {
    const angle = rng.nextRange(0, Math.PI * 2)
    const distance = rng.nextRange(0, maxOffset)
    const loop = regularPolygon(
      { x: centre.x + Math.cos(angle) * distance, y: centre.y + Math.sin(angle) * distance },
      MOUNTAIN_SEGMENTS,
      config.mountainLength,
    )
    const closedLoop = [...loop, loop[0]]
    if (
      pathFullyInside(closedLoop, borderLoop) &&
      !touchesPath(closedLoop, closedBorder, config.tangencyTolerance)
    ) {
      return loop
    }
  }

  throw new SetupGenerationError(0, 4, [
    {
      reason: SETUP_FAILURE.MOUNTAIN_OUTSIDE_BORDER,
      detail: `no mountain placement found in ${MAX_MOUNTAIN_ATTEMPTS} attempts — mountainLength ${config.mountainLength} may be too large for borderPerimeter ${config.borderPerimeter} (see §12)`,
    },
  ])
}
```

The `throw new SetupGenerationError(0, 4, …)` placeholder arguments are wrong on purpose at this step — Step 6 replaces every sampler throw with a thrown `SetupFailure[]` that `generateSetup` wraps with the real seed and player count. Do not leave them.

- [ ] **Step 4: Add the river sampler**

```ts
/**
 * §4.1 step 3 / §4.3 / AC6 — an open arc of length exactly config.riverLength
 * with exactly one end on the border, curving inward.
 *
 * Implemented as a fixed-step turtle walk: RIVER_SEGMENTS steps of
 * riverLength / RIVER_SEGMENTS each, turning by a constant per-river curvature
 * drawn once from the RNG. Arc length is therefore exact BY CONSTRUCTION with
 * no rescaling pass — which matters because a rescale would have to re-check
 * every rejection condition afterwards.
 *
 * Rejected and resampled if it self-intersects, leaves the border, touches the
 * border anywhere but its first vertex, or comes within one card width of the
 * mountain (§4.3's tolerance here is cardSize, NOT tangencyTolerance).
 */
function sampleRiver(
  borderLoop: Polyline,
  mountainLoop: Polyline,
  config: RulesConfig,
  rng: Rng,
): Polyline {
  const closedBorder = [...borderLoop, borderLoop[0]]
  const closedMountain = [...mountainLoop, mountainLoop[0]]
  const centre = centroid(borderLoop)
  const step = config.riverLength / RIVER_SEGMENTS

  for (let attempt = 0; attempt < MAX_RIVER_ATTEMPTS; attempt++) {
    const edgeIndex = rng.nextInt(borderLoop.length)
    const from = borderLoop[edgeIndex]
    const to = borderLoop[(edgeIndex + 1) % borderLoop.length]
    // Kept clear of the corners the starting stations occupy.
    const t = rng.nextRange(RIVER_EDGE_MARGIN, 1 - RIVER_EDGE_MARGIN)
    const mouth: Point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }

    // Head inward: toward the centre, jittered so successive attempts explore.
    const inward = Math.atan2(centre.y - mouth.y, centre.x - mouth.x)
    let heading = inward + rng.nextRange(-Math.PI / 5, Math.PI / 5)
    const turnPerStep = rng.nextRange(-RIVER_MAX_TOTAL_TURN, RIVER_MAX_TOTAL_TURN) / RIVER_SEGMENTS

    const points: Point[] = [mouth]
    let current = mouth
    for (let i = 0; i < RIVER_SEGMENTS; i++) {
      current = {
        x: current.x + Math.cos(heading) * step,
        y: current.y + Math.sin(heading) * step,
      }
      points.push(current)
      heading += turnPerStep
    }

    if (selfIntersects(points)) {
      continue
    }
    if (!pathFullyInside(points, borderLoop)) {
      continue
    }
    // Exactly one vertex — the mouth — may touch the border.
    const touchingCount = points.filter((point) =>
      pointTouchesPath(point, closedBorder, config.tangencyTolerance),
    ).length
    if (touchingCount !== 1) {
      continue
    }
    if (touchesPath(points, closedMountain, config.cardSize)) {
      continue
    }
    return points
  }

  throw new SetupGenerationError(0, 4, [
    {
      reason: SETUP_FAILURE.RIVER_TOO_NEAR_MOUNTAIN,
      detail: `no river placement found in ${MAX_RIVER_ATTEMPTS} attempts — the board may be too cramped for riverLength ${config.riverLength} to clear the mountain by cardSize ${config.cardSize} (see §12)`,
    },
  ])
}
```

- [ ] **Step 5: Add the corner-station placer**

```ts
/**
 * §4.1 steps 6-7 / AC7 — one station per corner, inset along the corner's
 * interior bisector to the SMALLEST inset at which the card is fully inside the
 * border, which is the position that is simultaneously "contained within" and
 * "touching" the border. Found by bisection to STATION_INSET_DEPTH.
 *
 * Retries with a small tangential nudge when the bisected position clashes with
 * terrain or an already-placed sibling, so a river mouth near a corner does not
 * make the whole board unplaceable.
 */
function placeCornerStation(
  cornerIndex: number,
  borderLoop: Polyline,
  blockers: readonly Polyline[],
  placed: readonly Rect[],
  config: RulesConfig,
  rng: Rng,
): Rect {
  const size = config.cardSize
  const corner = borderLoop[cornerIndex]
  const previous = borderLoop[(cornerIndex - 1 + borderLoop.length) % borderLoop.length]
  const next = borderLoop[(cornerIndex + 1) % borderLoop.length]

  const unit = (from: Point, to: Point): Point => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy)
    // Guarded: a zero-length edge would poison every coordinate downstream.
    return length < EPSILON ? { x: 0, y: 0 } : { x: dx / length, y: dy / length }
  }
  const toPrevious = unit(corner, previous)
  const toNext = unit(corner, next)
  const bisector = unit({ x: 0, y: 0 }, { x: toPrevious.x + toNext.x, y: toPrevious.y + toNext.y })
  const tangent = { x: -bisector.y, y: bisector.x }

  const rectAt = (offset: number, slide: number): Rect => {
    const cx = corner.x + bisector.x * offset + tangent.x * slide
    const cy = corner.y + bisector.y * offset + tangent.y * slide
    return { x: cx - size / 2, y: cy - size / 2, width: size, height: size }
  }

  const clear = (rect: Rect): boolean =>
    blockers.every((blocker) => !touchesRect(blocker, rect, config.tangencyTolerance)) &&
    placed.every((other) => !rectsOverlapOrTouch(rect, other))

  // The bisector can never need more than the card's diagonal plus the
  // inradius, so that bounds the bisection interval.
  const maxOffset = size * 2 + inradius(borderLoop.length, config.borderPerimeter)

  for (let attempt = 0; attempt < MAX_STATION_ATTEMPTS; attempt++) {
    const slide = attempt === 0 ? 0 : rng.nextRange(-size * 1.5, size * 1.5)
    let low = 0
    let high = maxOffset
    let found: Rect | null = null
    for (let depth = 0; depth < STATION_INSET_DEPTH; depth++) {
      const mid = (low + high) / 2
      const candidate = rectAt(mid, slide)
      if (rectFullyInside(candidate, borderLoop)) {
        found = candidate
        high = mid
      } else {
        low = mid
      }
    }
    if (
      found &&
      touchesRect([...borderLoop, borderLoop[0]], found, config.tangencyTolerance) &&
      clear(found)
    ) {
      return found
    }
  }

  throw new SetupGenerationError(0, 4, [
    {
      reason: SETUP_FAILURE.STATION_OUTSIDE_BORDER,
      detail: `no legal position found for the corner-${cornerIndex} starting station in ${MAX_STATION_ATTEMPTS} attempts — cardSize ${config.cardSize} may be too large for borderPerimeter ${config.borderPerimeter} (see §12)`,
    },
  ])
}
```

- [ ] **Step 6: Add `generateSetup`, and make every sampler throw failures the orchestrator wraps**

Replace each sampler's `throw new SetupGenerationError(0, 4, [...])` with `throw new SetupSamplerError([...])` — a module-private error carrying only `failures` — and let `generateSetup` catch it and re-throw a `SetupGenerationError` with the real seed and player count. That keeps the seed in one place instead of threading it through three samplers.

```ts
/** Module-private: a sampler knows which invariant it could not satisfy, but not
 *  the seed. generateSetup owns wrapping it. */
class SetupSamplerError extends Error {
  readonly failures: readonly SetupFailure[]
  constructor(failures: readonly SetupFailure[]) {
    super(failures.map((failure) => failure.reason).join('; '))
    this.name = 'SetupSamplerError'
    this.failures = failures
  }
}

export interface SetupRequest {
  readonly playerCount: PlayerCount
  readonly seed: number
}

/** The play area is centred on the origin; boardBounds is what the view uses,
 *  so no world offset needs choosing here. */
const PLAY_AREA_CENTRE: Point = { x: 0, y: 0 }

/**
 * §4.1 / §4.3 — M3 seeded setup generation (SCRUM-4 AC1, 4-9).
 *
 * Pure: the same seed and playerCount produce an identical GameState (AC8), and
 * no Math.random(), Date.now() or object-key iteration is reachable from here.
 * Every sampling decision comes from the one Rng created below, drawn in a fixed
 * order, so inserting a draw changes every downstream board — which is why the
 * order is not rearranged casually.
 *
 * Throws SetupGenerationError rather than returning a partial or illegal board:
 * a per-element ceiling is exhausted, or the assembled board fails
 * validateSetup's whole-board gate (AC9).
 */
export function generateSetup(request: SetupRequest, config: RulesConfig): GameState {
  const { playerCount, seed } = request
  const rng = createRng(seed)
  const sideCount = sideCountFor(playerCount)

  try {
    const borderLoop = regularPolygon(PLAY_AREA_CENTRE, sideCount, config.borderPerimeter)
    const mountainLoop = sampleMountain(PLAY_AREA_CENTRE, borderLoop, sideCount, config, rng)
    const riverPath = sampleRiver(borderLoop, mountainLoop, config, rng)

    const blockers: readonly Polyline[] = [riverPath, [...mountainLoop, mountainLoop[0]]]

    // §9 — the 2-player variant takes FOUR colour-seats mapped to two owners,
    // in turn order [A1, B1, A2, B2]. Colours are consumed in COLOUR_SEATS
    // order and owners alternate, so seat k takes corner k: owner A lands on
    // corners 0 and 2, owner B on 1 and 3 — opposite corners for free (AC4).
    const seatCount = playerCount === 2 ? 4 : playerCount
    const ownerFor = (index: number): string =>
      playerCount === 2 ? `P${(index % 2) + 1}` : `P${index + 1}`

    const stations: PlacedStation[] = []
    const seats: ColourSeat[] = []
    const startingDefinition = STATION_DEFINITIONS[STATION_TYPE.STARTING]

    for (let index = 0; index < seatCount; index++) {
      const colour = asColourId(COLOUR_SEATS[index].id)
      const rect = placeCornerStation(
        index,
        borderLoop,
        blockers,
        stations.map((station) => station.rect),
        config,
        rng,
      )
      const stationId = asStationId(`${COLOUR_SEATS[index].id}-START`)

      stations.push({
        card: {
          id: stationId,
          type: STATION_TYPE.STARTING,
          bonusFirst: startingDefinition.bonusFirst,
          bonusLater: startingDefinition.bonusLater,
          playerLimit: startingDefinition.playerLimit,
          flags: startingDefinition.flags,
        },
        rect,
        // Its own colour, so §9's marker penalty fires when ANOTHER colour —
        // including the same owner's other colour — scores here. STARTING has
        // markerPenalty but not needsMarker, and scoring.ts only fires an
        // effect when markerOwner is non-null, so leaving this null would
        // silently disable the penalty. No marker is spent: §2 ships the
        // starting station as its own component and §2.1's two markers are for
        // Landmark and Depot.
        markerOwner: colour,
        connections: new Map(),
        firstConnector: null,
        // Setup places stations in corners and the mountain is a central loop
        // that may touch neither, so this is false by construction — but it is
        // derived, not assumed, so a retuned mountain cannot make it a lie.
        insideMountain: rectFullyInside(rect, mountainLoop),
      })

      seats.push({
        colour,
        owner: asPlayerId(ownerFor(index)),
        shortStringsLeft: SHORT_STRINGS_PER_SEAT,
        longStringsLeft: LONG_STRINGS_PER_SEAT,
        markersLeft: MARKERS_PER_SEAT,
        startingStationId: stationId,
        score: 0,
      })
    }

    const paths: readonly PlacedPath[] = [
      { id: asPathId('BORDER'), kind: PATH_KIND.BORDER, owner: null, path: borderLoop, placedOnTurn: 0 },
      { id: asPathId('MOUNTAIN'), kind: PATH_KIND.MOUNTAIN, owner: null, path: mountainLoop, placedOnTurn: 0 },
      { id: asPathId('RIVER'), kind: PATH_KIND.RIVER, owner: null, path: riverPath, placedOnTurn: 0 },
    ]

    const state: GameState = {
      seats,
      turnOrder: seats.map((seat) => seat.colour),
      round: 1,
      activeSeatIndex: 0,
      phase: TURN_PHASE.STATION,
      pendingCard: null,
      stationStepFailures: 0,
      extraDraws: 0,
      drewRuralAlready: false,
      deck: buildDeck(config.deckComposition, rng),
      stations,
      paths,
      moveLog: [],
      lastScoring: null,
      status: 'IN_PLAY',
    }

    // AC9's gate. A sampler bug that produced a subtly illegal board surfaces
    // here as named failures rather than reaching the reducer.
    const validation = validateSetup(state, config)
    if (!validation.ok) {
      throw new SetupGenerationError(seed, playerCount, validation.failures)
    }
    return state
  } catch (error) {
    if (error instanceof SetupSamplerError) {
      throw new SetupGenerationError(seed, playerCount, error.failures)
    }
    throw error
  }
}
```

Add to `src/rules/setup.ts`'s import block: `PATH_KIND`, `SETUP_FAILURE`, `TURN_PHASE` from `../constants/game`; `STATION_DEFINITIONS`, `STATION_TYPE` from `../constants/stations`; `COLOUR_SEATS`, `MAX_MOUNTAIN_ATTEMPTS`, `MAX_RIVER_ATTEMPTS`, `MAX_STATION_ATTEMPTS`, `MOUNTAIN_OFFSET_FRACTION`, `MOUNTAIN_SEGMENTS`, `RIVER_EDGE_MARGIN`, `RIVER_MAX_TOTAL_TURN`, `RIVER_SEGMENTS`, `STATION_INSET_DEPTH`, `SHORT_STRINGS_PER_SEAT`, `LONG_STRINGS_PER_SEAT`, `MARKERS_PER_SEAT` from `../constants/setup`; `EPSILON`, `selfIntersects` from `./geometry`; `pathFullyInside`, `pointTouchesPath`, `rectFullyInside`, `rectsOverlapOrTouch`, `touchesPath`, `touchesRect` from `./containment`; `buildDeck` from `./deck`; `createRng` from `./rng`; `validateSetup` from `./setupValidation`; `asColourId`, `asPathId`, `asPlayerId`, `asStationId` from `./types`; and the types `ColourSeat`, `GameState`, `PlacedPath`, `PlacedStation`, `Rect`, plus `RulesConfig`, `Rng` and `SetupFailure`.

- [ ] **Step 7: Run both setup specs to green**

Run: `npx vitest run src/rules/__tests__/setup.test.ts src/rules/__tests__/setupValidation.test.ts`
Expected: both exit 0 with 0 failed. `setupValidation.test.ts` now resolves `generateSetup`, so the Task 11 specs run for the first time.

- [ ] **Step 8: Typecheck, lint, and confirm no `Math.random` reached generation**

Run: `npm run typecheck; npm run lint; Select-String -Path src\rules\*.ts -Pattern "Math\.random|Date\.now"`
Expected: typecheck and lint exit 0; the `Select-String` returns zero hits.

### Task 13: Add `boardBounds` to `src/rules/setup.ts`

- Skill: `react-frontend`

Pure so the SVG `viewBox` is testable without a renderer (AC10).

**Files:**
- Modify: `src/rules/setup.ts` — append
- Test: `src/rules/__tests__/setup.test.ts` — append

- [ ] **Step 1: Write the failing spec**

```ts
describe('boardBounds', () => {
  it('contains every path vertex and every station rect', () => {
    const state = generateSetup({ playerCount: 5, seed: 21 }, TEST_CONFIG)
    const bounds = boardBounds(state, TEST_CONFIG)
    for (const path of state.paths) {
      for (const point of path.path) {
        expect(point.x).toBeGreaterThanOrEqual(bounds.x)
        expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(point.y).toBeGreaterThanOrEqual(bounds.y)
        expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.height)
      }
    }
    for (const station of state.stations) {
      expect(station.rect.x).toBeGreaterThanOrEqual(bounds.x)
      expect(station.rect.x + station.rect.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    }
  })

  it('pads by one card width so a corner card is never flush against the edge', () => {
    const state = generateSetup({ playerCount: 4, seed: 21 }, TEST_CONFIG)
    const border = state.paths.find((path) => path.kind === PATH_KIND.BORDER)!
    const minX = Math.min(...border.path.map((point) => point.x))
    const bounds = boardBounds(state, TEST_CONFIG)
    expect(minX - bounds.x).toBeGreaterThanOrEqual(TEST_CONFIG.cardSize / 2)
  })

  it('returns positive dimensions so no viewBox divides by zero', () => {
    const bounds = boardBounds(generateSetup({ playerCount: 3, seed: 1 }, TEST_CONFIG), TEST_CONFIG)
    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
  })

  it('falls back to a card-sized box for a state with nothing in it', () => {
    const bounds = boardBounds(makeState({ paths: [], stations: [] }), TEST_CONFIG)
    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Implement**

```ts
/**
 * Axis-aligned bounds of every path vertex and station rect, padded by one card
 * width. Pure and exported so Board.tsx's viewBox is unit-testable without a
 * renderer, and so a later pan/zoom story has the same box to work from.
 *
 * Never returns a zero dimension: an SVG viewBox with a zero width renders
 * nothing and reports no error, which is exactly the silent-NaN class of bug
 * web-project.md warns about.
 */
export function boardBounds(state: GameState, config: RulesConfig): Rect {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const path of state.paths) {
    for (const point of path.path) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }
  for (const station of state.stations) {
    minX = Math.min(minX, station.rect.x)
    minY = Math.min(minY, station.rect.y)
    maxX = Math.max(maxX, station.rect.x + station.rect.width)
    maxY = Math.max(maxY, station.rect.y + station.rect.height)
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: 0, y: 0, width: config.cardSize, height: config.cardSize }
  }

  const pad = config.cardSize
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(maxX - minX + pad * 2, config.cardSize),
    height: Math.max(maxY - minY + pad * 2, config.cardSize),
  }
}
```

- [ ] **Step 3: Run to green and measure both new rules modules**

Run: `npx vitest run src/rules/__tests__/setup.test.ts; npm run typecheck; (Get-Content src\rules\setup.ts | Measure-Object -Line).Lines; (Get-Content src\rules\setupValidation.ts | Measure-Object -Line).Lines`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0; **both line counts are under 400**. If `setup.ts` exceeds it, split the three samplers into `src/rules/setupSamplers.ts` in this task rather than deferring it.

---

## Phase 4 — The SVG board

Leaf components first, then the root that composes them, so every import resolves within the phase. `BoardOverlays` lands here rather than with the debug panel because it is a board concern and it owns `OverlayFlags`, which `Board` needs — putting it in Phase 6 would make Phase 4 import from a file that does not exist yet. The phase ends with a board that renders but is not yet reachable from the app; Phase 5 wires it.

### Task 14: Create `src/ui/StationCard.tsx` and its CSS

- Skill: `react-frontend`

AC11 — type name, connection bonus black-over-grey (§7.2), and the player-limit pawn count (§7.1), legible without final art. Every number comes from the `StationCard` the engine built; none is a literal here.

**Files:**
- Create: `src/ui/StationCard.tsx`
- Create: `src/ui/StationCard.css`

- [ ] **Step 1: Write the component**

File order is imports → constants → component → helpers → export, matching `HeroBanner.tsx`.

```tsx
import './StationCard.css'
import type { PlacedStation } from '../rules/types'

/** Fractions of the card's own size, so the layout scales with cardSize (M2)
 *  rather than assuming a pixel footprint. */
const TITLE_Y = 0.28
const BONUS_Y = 0.58
const PAWN_Y = 0.84
const PAWN_RADIUS = 0.05

interface StationCardProps {
  station: PlacedStation
  /** The owning colour's display hex for a starting station, else null. */
  colour: string | null
}

function StationCard({ station, colour }: StationCardProps) {
  const { rect, card } = station
  const size = rect.width
  const label = `${card.type} station, connection bonus ${card.bonusFirst} first or ${card.bonusLater} later, player limit ${card.playerLimit}`

  return (
    <g className="station-card" role="img" aria-label={label}>
      <rect
        className="station-card__body"
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        stroke={colour ?? undefined}
      />
      <text className="station-card__type" x={rect.x + size / 2} y={rect.y + size * TITLE_Y}>
        {card.type}
      </text>
      <text className="station-card__bonus-first" x={rect.x + size / 2} y={rect.y + size * BONUS_Y}>
        {card.bonusFirst}
      </text>
      <text className="station-card__bonus-later" x={rect.x + size / 2} y={rect.y + size * (BONUS_Y + 0.16)}>
        {card.bonusLater}
      </text>
      {pawns(station).map((cx, index) => (
        <circle
          key={index}
          className="station-card__pawn"
          cx={cx}
          cy={rect.y + size * PAWN_Y}
          r={size * PAWN_RADIUS}
        />
      ))}
    </g>
  )
}

/** §7.1 — one pawn per allowed distinct player, evenly spaced along the bottom. */
function pawns(station: PlacedStation): readonly number[] {
  const { rect, card } = station
  const count = card.playerLimit
  const spacing = rect.width / (count + 1)
  return Array.from({ length: count }, (_unused, index) => rect.x + spacing * (index + 1))
}

export default StationCard
```

- [ ] **Step 2: Write `src/ui/StationCard.css`**

`font-size` in user units so it scales with the `viewBox`; `paint-order` keeps the stroke behind the glyph so text stays legible over the card fill.

```css
.station-card__body {
  fill: #fdfaf3;
  stroke: #2b2b2b;
  stroke-width: 3;
}

.station-card__type,
.station-card__bonus-first,
.station-card__bonus-later {
  text-anchor: middle;
  font-family: system-ui, sans-serif;
  font-weight: 600;
  paint-order: stroke fill;
}

.station-card__type {
  font-size: 16px;
  fill: #2b2b2b;
  letter-spacing: 0.04em;
}

.station-card__bonus-first {
  font-size: 26px;
  fill: #111111;
}

.station-card__bonus-later {
  font-size: 20px;
  fill: #8a8a8a;
}

.station-card__pawn {
  fill: #ffffff;
  stroke: #4a4a4a;
  stroke-width: 1.5;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 15: Create `src/ui/BoardTerrain.tsx` and its CSS

- Skill: `react-frontend`

AC10's "border, river, mountain visually distinguishable". The border and mountain are closed (`Z`); the river is open.

**Files:**
- Create: `src/ui/BoardTerrain.tsx`
- Create: `src/ui/BoardTerrain.css`

- [ ] **Step 1: Write the component**

```tsx
import { PATH_KIND } from '../constants/game'
import { TERRAIN_DISPLAY } from '../constants/setup'
import './BoardTerrain.css'
import type { PathKind, PlacedPath, Polyline } from '../rules/types'

/** The three terrain kinds, back to front. Railway strings are SCRUM-6's. */
const TERRAIN_ORDER: readonly PathKind[] = [PATH_KIND.BORDER, PATH_KIND.MOUNTAIN, PATH_KIND.RIVER]

const CLOSED: ReadonlySet<PathKind> = new Set([PATH_KIND.BORDER, PATH_KIND.MOUNTAIN])

const LABEL: Readonly<Record<string, string>> = {
  [PATH_KIND.BORDER]: 'Border string',
  [PATH_KIND.MOUNTAIN]: 'Mountain string',
  [PATH_KIND.RIVER]: 'River string',
}

interface BoardTerrainProps {
  paths: readonly PlacedPath[]
}

function BoardTerrain({ paths }: BoardTerrainProps) {
  return (
    <g className="board-terrain">
      {TERRAIN_ORDER.map((kind) => {
        const path = paths.find((candidate) => candidate.kind === kind)
        if (!path || path.path.length < 2) {
          return null
        }
        return (
          <path
            key={kind}
            className={`board-terrain__path board-terrain__path--${kind.toLowerCase()}`}
            d={toPathData(path.path, CLOSED.has(kind))}
            stroke={TERRAIN_DISPLAY[kind as keyof typeof TERRAIN_DISPLAY]}
            aria-label={LABEL[kind]}
          />
        )
      })}
    </g>
  )
}

/** Polyline to SVG path data. Loops are stored corners-only, so `Z` closes them
 *  rather than repeating the first point. */
function toPathData(points: Polyline, close: boolean): string {
  const body = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  return close ? `${body} Z` : body
}

export default BoardTerrain
```

- [ ] **Step 2: Write `src/ui/BoardTerrain.css`**

Distinguishable by width *and* dash pattern, not colour alone — so the layers stay readable for a colour-blind play-tester and in a greyscale screenshot.

```css
.board-terrain__path {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.board-terrain__path--border {
  stroke-width: 8;
}

.board-terrain__path--mountain {
  stroke-width: 6;
  stroke-dasharray: 18 10;
}

.board-terrain__path--river {
  stroke-width: 7;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 16: Create `src/ui/BoardOverlays.tsx` and its CSS

- Skill: `react-frontend`

SCRUM-3 AC7 — station bounding rects, sampled string vertices, detected crossing points. Owns the `OverlayFlags` type. Crossing points are **computed** with the existing `crossings()` predicate, never stored, so derived state stays derived.

**Files:**
- Create: `src/ui/BoardOverlays.tsx`
- Create: `src/ui/BoardOverlays.css`

- [ ] **Step 1: Write the component**

```tsx
import { crossings } from '../rules/geometry'
import './BoardOverlays.css'
import type { GameState, Point } from '../rules/types'

const VERTEX_RADIUS = 4
const CROSSING_RADIUS = 7

export interface OverlayFlags {
  rects: boolean
  vertices: boolean
  crossings: boolean
}

export const NO_OVERLAYS: OverlayFlags = { rects: false, vertices: false, crossings: false }

interface BoardOverlaysProps {
  state: GameState
  flags: OverlayFlags
}

function BoardOverlays({ state, flags }: BoardOverlaysProps) {
  return (
    <g className="board-overlays" aria-hidden="true">
      {flags.rects &&
        state.stations.map((station) => (
          <rect
            key={String(station.card.id)}
            className="board-overlays__rect"
            x={station.rect.x}
            y={station.rect.y}
            width={station.rect.width}
            height={station.rect.height}
          />
        ))}

      {flags.vertices &&
        state.paths.flatMap((path) =>
          path.path.map((point, index) => (
            <circle
              key={`${String(path.id)}-${index}`}
              className="board-overlays__vertex"
              cx={point.x}
              cy={point.y}
              r={VERTEX_RADIUS}
            />
          )),
        )}

      {flags.crossings &&
        allCrossings(state).map((point, index) => (
          <g key={index} className="board-overlays__crossing">
            <circle cx={point.x} cy={point.y} r={CROSSING_RADIUS} />
          </g>
        ))}
    </g>
  )
}

/**
 * Every transversal crossing between every unordered pair of placed paths,
 * recomputed on render from state.paths — never stored, because a stored copy of
 * derived geometry drifts and then the board lies about the rules.
 *
 * On a freshly generated board this is empty: setup guarantees the mountain
 * touches neither the border nor the river, and there are no railway strings
 * until SCRUM-6. An empty crossing overlay on a new game is correct, not broken.
 */
function allCrossings(state: GameState): readonly Point[] {
  const points: Point[] = []
  for (let i = 0; i < state.paths.length; i++) {
    for (let j = i + 1; j < state.paths.length; j++) {
      points.push(...crossings(state.paths[i].path, state.paths[j].path))
    }
  }
  return points
}

export default BoardOverlays
```

- [ ] **Step 2: Write `src/ui/BoardOverlays.css`**

Magenta throughout, matching the debug palette in Task 22, so overlay marks read as instrumentation rather than as game state (SCRUM-3 AC8).

```css
.board-overlays__rect {
  fill: none;
  stroke: #d81b8f;
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.board-overlays__vertex {
  fill: #d81b8f;
  fill-opacity: 0.75;
}

.board-overlays__crossing circle {
  fill: none;
  stroke: #d81b8f;
  stroke-width: 3;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 17: Create `src/ui/Board.tsx` and its CSS

- Skill: `react-frontend`

AC10 — scaled to fit the viewport at any window size without clipping. `viewBox` from the pure `boardBounds` plus `preserveAspectRatio="xMidYMid meet"`, so there is **no resize listener and no observer**, and therefore no cleanup to leak.

**Files:**
- Create: `src/ui/Board.tsx`
- Create: `src/ui/Board.css`

- [ ] **Step 1: Write the component**

```tsx
import BoardOverlays from './BoardOverlays'
import BoardTerrain from './BoardTerrain'
import StationCard from './StationCard'
import { COLOUR_SEATS } from '../constants/setup'
import { boardBounds } from '../rules/setup'
import './Board.css'
import type { OverlayFlags } from './BoardOverlays'
import type { RulesConfig } from '../rules/config'
import type { ColourId, GameState } from '../rules/types'

interface BoardProps {
  state: GameState
  config: RulesConfig
  overlays: OverlayFlags
}

function Board({ state, config, overlays }: BoardProps) {
  const bounds = boardBounds(state, config)

  return (
    <svg
      className="board"
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`String Railway board, ${state.seats.length} colour seats, round ${state.round}`}
    >
      <BoardTerrain paths={state.paths} />
      {state.stations.map((station) => (
        <StationCard
          key={String(station.card.id)}
          station={station}
          colour={displayFor(station.markerOwner)}
        />
      ))}
      <BoardOverlays state={state} flags={overlays} />
    </svg>
  )
}

/** COLOUR_SEATS is the single source of a colour's display hex; a station's own
 *  colour comes from its markerOwner, which generation set to its seat's colour. */
function displayFor(colour: ColourId | null): string | null {
  if (colour === null) {
    return null
  }
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.display ?? null
}

export default Board
```

- [ ] **Step 2: Write `src/ui/Board.css`**

The SVG fills its container and the `viewBox` does the scaling, so no width or height is computed in JavaScript.

```css
.board {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 78vh;
  background: #f4efe4;
  border-radius: 12px;
  touch-action: manipulation;
}
```

- [ ] **Step 3: Typecheck, lint, and measure**

Run: `npm run typecheck; npm run lint; (Get-Content src\ui\Board.tsx | Measure-Object -Line).Lines`
Expected: both commands exit 0; the line count is well under 400.

### Task 18: Create `src/ui/SeatLegend.tsx` and its CSS

- Skill: `react-frontend`

AC12 — in a 2-player game the board must make owner-to-colour pairing readable at a glance, since it is not inferable from colour alone. Groups seats by `owner`, which is the one legitimate use of `PlayerId` outside game-end summing.

**Files:**
- Create: `src/ui/SeatLegend.tsx`
- Create: `src/ui/SeatLegend.css`

- [ ] **Step 1: Write the component**

```tsx
import { COLOUR_SEATS } from '../constants/setup'
import './SeatLegend.css'
import type { PlayerCount } from '../rules/setup'
import type { ColourId, ColourSeat, PlayerId } from '../rules/types'

interface SeatLegendProps {
  seats: readonly ColourSeat[]
  turnOrder: readonly ColourId[]
  playerCount: PlayerCount
}

function SeatLegend({ seats, turnOrder, playerCount }: SeatLegendProps) {
  const groups = groupByOwner(seats, turnOrder)
  const sharing = playerCount === 2

  return (
    <section className="seat-legend" aria-label="Players and their colours">
      {sharing && (
        <p className="seat-legend__note">
          Two players, four colours — each player controls the two colours shown together. Every
          colour counts as a separate player for station limits and marker triggers (§9).
        </p>
      )}
      <ul className="seat-legend__owners">
        {groups.map(([owner, ownedSeats], index) => (
          <li className="seat-legend__owner" key={String(owner)}>
            <span className="seat-legend__owner-name">Player {index + 1}</span>
            <span className="seat-legend__colours">
              {ownedSeats.map((seat) => (
                <span className="seat-legend__colour" key={String(seat.colour)}>
                  <span
                    className="seat-legend__swatch"
                    style={{ background: displayFor(seat.colour) }}
                    aria-hidden="true"
                  />
                  {labelFor(seat.colour)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Groups colour-seats by owner, in turn order. A Map keyed on PlayerId, not an
 * object: insertion order is defined on a Map, and object-key order is a
 * determinism hazard. This is the only PlayerId read in src/ui/ — every limit
 * and trigger stays keyed on ColourId (§9).
 */
function groupByOwner(
  seats: readonly ColourSeat[],
  turnOrder: readonly ColourId[],
): ReadonlyArray<readonly [PlayerId, readonly ColourSeat[]]> {
  const grouped = new Map<PlayerId, ColourSeat[]>()
  for (const colour of turnOrder) {
    const seat = seats.find((candidate) => candidate.colour === colour)
    if (!seat) {
      continue
    }
    const existing = grouped.get(seat.owner)
    if (existing) {
      existing.push(seat)
    } else {
      grouped.set(seat.owner, [seat])
    }
  }
  return [...grouped.entries()]
}

function displayFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.display ?? '#888888'
}

function labelFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.label ?? String(colour)
}

export default SeatLegend
```

- [ ] **Step 2: Write `src/ui/SeatLegend.css`**

```css
.seat-legend {
  margin: 0.75rem 0 0;
  font-family: system-ui, sans-serif;
}

.seat-legend__note {
  margin: 0 0 0.5rem;
  max-width: 60ch;
  font-size: 0.85rem;
  color: #4a4a4a;
}

.seat-legend__owners {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.seat-legend__owner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid #d8d0bf;
  border-radius: 999px;
  background: #fdfaf3;
}

.seat-legend__owner-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.seat-legend__colours {
  display: flex;
  gap: 0.6rem;
}

.seat-legend__colour {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.seat-legend__swatch {
  width: 14px;
  height: 14px;
  border: 1px solid #2b2b2b;
  border-radius: 3px;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 5 — New Game and the debug panel, wired end to end

The store, the player-count control, the debug panel, and the shell that joins them to the config load. At the end of this phase the app is reachable: pick a count, get a board, toggle the instrumentation. `AppShell` is deliberately **last** — it is the only file that imports all four, so writing it earlier would leave the phase type-checking against a component that does not exist yet.

### Task 19: Create the game store at `src/ui/useGame.ts`

- Skill: `react-frontend`

One `useReducer` — the sanctioned store. `NEW_GAME` is a UI-level action, deliberately not a `Move`, and `generateSetup` runs **before** dispatch so `SetupGenerationError` becomes displayed state rather than a render-time crash.

**Files:**
- Create: `src/ui/useGame.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useReducer, useState } from 'react'
import { GAME_ACTION } from '../constants/game'
import { gameReducer } from '../rules/reducer'
import { generateSetup, SetupGenerationError } from '../rules/setup'
import type { RulesConfig } from '../rules/config'
import type { PlayerCount } from '../rules/setup'
import type { GameState, Move } from '../rules/types'

export type GameAction =
  | { readonly kind: typeof GAME_ACTION.NEW_GAME; readonly state: GameState }
  | { readonly kind: typeof GAME_ACTION.MOVE; readonly move: Move; readonly config: RulesConfig }

export interface UseGameResult {
  readonly state: GameState | null
  readonly seed: number | null
  readonly playerCount: PlayerCount | null
  readonly setupError: string | null
  newGame(playerCount: PlayerCount, seed?: number): void
  dispatchMove(move: Move): void
}

/**
 * The single sanctioned store (no Redux, no Zustand, no second useReducer over
 * a parallel copy of game state). MOVE delegates straight to the §10.4 reducer;
 * NEW_GAME replaces the whole GameState.
 *
 * NEW_GAME is deliberately NOT a Move: Move is the persisted move-log union that
 * undo and replay derive from, and starting a game is not an event in that
 * game's own history. Widening Move would force a case through every existing
 * switch and invalidate any stored log.
 *
 * The config travels ON the MOVE action rather than being captured in a closure,
 * so the reducer stays a pure function of (state, action) and cannot read a
 * stale config from an earlier render.
 */
function reduce(state: GameState | null, action: GameAction): GameState | null {
  switch (action.kind) {
    case GAME_ACTION.NEW_GAME:
      return action.state
    case GAME_ACTION.MOVE:
      if (state === null) {
        // A move before a game exists is a caller bug, not a player mistake.
        throw new Error('useGame: MOVE dispatched before a game was created')
      }
      return gameReducer(state, action.move, action.config)
  }
}

export function useGame(config: RulesConfig): UseGameResult {
  const [state, dispatch] = useReducer(reduce, null)
  const [seed, setSeed] = useState<number | null>(null)
  const [playerCount, setPlayerCount] = useState<PlayerCount | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)

  const newGame = useCallback(
    (nextPlayerCount: PlayerCount, requestedSeed?: number): void => {
      // Date.now() is used ONLY to mint a seed at the UI boundary, never inside
      // a sampler. The seed is then recorded and displayed, which is what makes
      // the board reproducible (SCRUM-4 AC8, SCRUM-3 AC6).
      const nextSeed = requestedSeed ?? Date.now() >>> 0
      // Cleared on entry so a previous failure cannot linger behind a board.
      setSetupError(null)
      try {
        const generated = generateSetup({ playerCount: nextPlayerCount, seed: nextSeed }, config)
        setSeed(nextSeed)
        setPlayerCount(nextPlayerCount)
        dispatch({ kind: GAME_ACTION.NEW_GAME, state: generated })
      } catch (error) {
        // Only a generation failure is turned into displayed state. Anything
        // else propagates — swallowing it would disguise a real defect as a
        // cramped board.
        if (error instanceof SetupGenerationError) {
          setSetupError(error.message)
          return
        }
        throw error
      }
    },
    [config],
  )

  const dispatchMove = useCallback(
    (move: Move): void => {
      dispatch({ kind: GAME_ACTION.MOVE, move, config })
    },
    [config],
  )

  return { state, seed, playerCount, setupError, newGame, dispatchMove }
}
```

`useCallback` here is not memoisation-for-performance — both callbacks are returned from a hook and would otherwise be a new identity every render, which makes them unsafe to use in a future effect's dep array. Stated so it is a decision, not an unjustified `useCallback`.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. Lint confirms `react-hooks` is satisfied — `config` is the only reactive input to either callback and both list it.

### Task 20: Create `src/ui/NewGamePanel.tsx` and its CSS

- Skill: `react-frontend`

AC1 and AC3 — the New Game action with player count selectable for 2, 3, 4 and 5. Controls are ≥44×44px and use `:focus-visible`.

**Files:**
- Create: `src/ui/NewGamePanel.tsx`
- Create: `src/ui/NewGamePanel.css`

- [ ] **Step 1: Write the component**

```tsx
import './NewGamePanel.css'
import type { PlayerCount } from '../rules/setup'

const PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4, 5]

/** §6 — the border shape each count plays on. 2 plays the four-player square (§9). */
const SHAPE_NOTE: Readonly<Record<PlayerCount, string>> = {
  2: 'square, four colours between two players',
  3: 'triangle',
  4: 'square',
  5: 'pentagon',
}

interface NewGamePanelProps {
  onNewGame: (playerCount: PlayerCount) => void
  disabled: boolean
}

function NewGamePanel({ onNewGame, disabled }: NewGamePanelProps) {
  return (
    <section className="new-game" aria-label="Start a new game">
      <h2 className="new-game__heading">New game</h2>
      <ul className="new-game__counts">
        {PLAYER_COUNTS.map((count) => (
          <li key={count}>
            <button
              type="button"
              className="new-game__button"
              onClick={() => onNewGame(count)}
              disabled={disabled}
              aria-label={`Start a ${count} player game — ${SHAPE_NOTE[count]}`}
            >
              <span className="new-game__count">{count}</span>
              <span className="new-game__shape">{SHAPE_NOTE[count]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default NewGamePanel
```

- [ ] **Step 2: Write `src/ui/NewGamePanel.css`**

`min-height`/`min-width` of 44px, hover wrapped in `@media (hover: hover)` and paired with `:active`, `:focus-visible` rather than bare `:focus`.

```css
.new-game {
  font-family: system-ui, sans-serif;
}

.new-game__heading {
  margin: 0 0 0.6rem;
  font-size: 1.1rem;
}

.new-game__counts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.new-game__button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem 0.9rem;
  border: 1px solid #2b2b2b;
  border-radius: 10px;
  background: #fdfaf3;
  color: #2b2b2b;
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
}

.new-game__button:disabled {
  opacity: 0.5;
  cursor: default;
}

.new-game__button:focus-visible {
  outline: 3px solid #2f7fd4;
  outline-offset: 2px;
}

@media (hover: hover) {
  .new-game__button:not(:disabled):hover {
    background: #fff8e8;
  }
}

.new-game__button:not(:disabled):active {
  background: #f0e6d0;
}

.new-game__count {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1;
}

.new-game__shape {
  font-size: 0.72rem;
  color: #5a5a5a;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 21: Create `src/ui/DebugPanel.tsx` and its CSS

- Skill: `react-frontend`

SCRUM-3 AC5–8 — all scores revealed, the seed shown and re-enterable, the three overlay toggles, all behind a toggle that **defaults to off** and looks unmistakably like instrumentation.

**Files:**
- Create: `src/ui/DebugPanel.tsx`
- Create: `src/ui/DebugPanel.css`

- [ ] **Step 1: Write the component**

```tsx
import { useState } from 'react'
import { COLOUR_SEATS } from '../constants/setup'
import { hashSeed } from '../rules/rng'
import './DebugPanel.css'
import type { OverlayFlags } from './BoardOverlays'
import type { ColourId, GameState } from '../rules/types'

/** SCRUM-3 AC7's three overlays, declared once so the label and the flag key
 *  cannot drift apart. */
const OVERLAY_TOGGLES: ReadonlyArray<{ key: keyof OverlayFlags; label: string }> = [
  { key: 'rects', label: 'Station bounding rects' },
  { key: 'vertices', label: 'Sampled string vertices' },
  { key: 'crossings', label: 'Detected crossing points' },
]

interface DebugPanelProps {
  state: GameState
  seed: number
  flags: OverlayFlags
  onFlagsChange: (flags: OverlayFlags) => void
  onRegenerate: (seed: number) => void
}

function DebugPanel({ state, seed, flags, onFlagsChange, onRegenerate }: DebugPanelProps) {
  // AC8 — defaults to off, so a play-test cannot accidentally run with scores
  // revealed. Local UI state, not game state, so it belongs in useState.
  const [open, setOpen] = useState(false)
  const [seedInput, setSeedInput] = useState('')

  return (
    <section className="debug" aria-label="Debug tools">
      <button
        type="button"
        className="debug__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {open ? 'Hide debug tools' : 'Show debug tools'}
      </button>

      {open && (
        <div className="debug__body">
          <p className="debug__warning">
            Debug view — scores are hidden from other players during normal play (§10.5).
          </p>

          <h3 className="debug__heading">Scores</h3>
          <ul className="debug__scores">
            {state.turnOrder.map((colour, index) => {
              const seat = state.seats.find((candidate) => candidate.colour === colour)
              if (!seat) {
                return null
              }
              return (
                <li className="debug__score" key={String(colour)}>
                  <span className="debug__swatch" style={{ background: displayFor(colour) }} aria-hidden="true" />
                  <span>
                    {labelFor(colour)} ({String(seat.owner)})
                    {index === state.activeSeatIndex ? ' — active' : ''}
                  </span>
                  <strong>{seat.score}</strong>
                </li>
              )
            })}
          </ul>

          <h3 className="debug__heading">Seed</h3>
          <p className="debug__seed">
            Current: <code>{seed}</code>
          </p>
          <form
            className="debug__seed-form"
            onSubmit={(event) => {
              event.preventDefault()
              onRegenerate(parseSeed(seedInput, seed))
            }}
          >
            <label className="debug__label" htmlFor="debug-seed">
              Regenerate from seed
            </label>
            <input
              id="debug-seed"
              className="debug__input"
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              placeholder={String(seed)}
            />
            <button type="submit" className="debug__button">
              Regenerate
            </button>
          </form>

          <h3 className="debug__heading">Geometry overlays</h3>
          <ul className="debug__overlays">
            {OVERLAY_TOGGLES.map(({ key, label }) => (
              <li key={key}>
                <label className="debug__checkbox">
                  <input
                    type="checkbox"
                    checked={flags[key]}
                    onChange={(event) => onFlagsChange({ ...flags, [key]: event.target.checked })}
                  />
                  {label}
                </label>
              </li>
            ))}
          </ul>
          <p className="debug__note">
            No railway strings exist until one is placed, so a fresh board shows no crossing points.
          </p>

          <p className="debug__note">
            <code>rules.json</code> is read once at startup. Editing it applies on the next page
            load, not to the game in progress.
          </p>
        </div>
      )}
    </section>
  )
}

/**
 * A seed is user input, so it is sanitised at the boundary: a plain integer is
 * used directly, any other text is hashed to a usable 32-bit seed, and empty
 * falls back to the current one rather than to NaN.
 */
function parseSeed(text: string, fallback: number): number {
  const trimmed = text.trim()
  if (trimmed === '') {
    return fallback
  }
  const asNumber = Number(trimmed)
  if (Number.isFinite(asNumber) && Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber >>> 0
  }
  return hashSeed(trimmed)
}

function displayFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.display ?? '#888888'
}

function labelFor(colour: ColourId): string {
  return COLOUR_SEATS.find((seat) => seat.id === String(colour))?.label ?? String(colour)
}

export default DebugPanel
```

- [ ] **Step 2: Write `src/ui/DebugPanel.css`**

AC8's "visually distinct" is carried by the dashed magenta border and the monospace body — the same magenta the overlays use, so instrumentation reads as one system and never as game state.

```css
.debug {
  margin-top: 1rem;
  font-family: system-ui, sans-serif;
}

.debug__toggle,
.debug__button {
  min-height: 44px;
  padding: 0.5rem 0.9rem;
  border: 2px dashed #d81b8f;
  border-radius: 8px;
  background: #fff5fb;
  color: #8c0f5c;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.debug__toggle:focus-visible,
.debug__button:focus-visible,
.debug__input:focus-visible {
  outline: 3px solid #d81b8f;
  outline-offset: 2px;
}

@media (hover: hover) {
  .debug__toggle:hover,
  .debug__button:hover {
    background: #ffe9f6;
  }
}

.debug__toggle:active,
.debug__button:active {
  background: #ffd7ee;
}

.debug__body {
  margin-top: 0.6rem;
  padding: 0.9rem 1.1rem;
  border: 2px dashed #d81b8f;
  border-radius: 10px;
  background: #fffafd;
  font-family: ui-monospace, monospace;
  font-size: 0.82rem;
  max-width: 62ch;
}

.debug__warning {
  margin: 0 0 0.7rem;
  color: #8c0f5c;
  font-weight: 700;
}

.debug__heading {
  margin: 0.9rem 0 0.35rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8c0f5c;
}

.debug__scores,
.debug__overlays {
  margin: 0;
  padding: 0;
  list-style: none;
}

.debug__score {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.15rem 0;
}

.debug__score strong {
  margin-left: auto;
}

.debug__swatch {
  width: 12px;
  height: 12px;
  border: 1px solid #2b2b2b;
  border-radius: 3px;
}

.debug__seed {
  margin: 0;
}

.debug__seed-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.debug__label {
  flex-basis: 100%;
}

.debug__input {
  min-height: 44px;
  padding: 0.35rem 0.6rem;
  border: 1px solid #d81b8f;
  border-radius: 6px;
  font: inherit;
}

.debug__checkbox {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  cursor: pointer;
}

.debug__note {
  margin: 0.7rem 0 0;
  color: #6a4a5e;
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 22: Wire everything in `src/ui/AppShell.tsx` and its CSS

- Skill: `react-frontend`

The four async states of the config load, the game store, and the board. Keeps `HeroBanner` — the SCRUM-8 scaffold work is not discarded, it moves above the fold and shrinks once a game exists.

**Files:**
- Modify: `src/ui/AppShell.tsx:1-12` — replace the whole component
- Modify: `src/ui/AppShell.css` — add the new layout classes

- [ ] **Step 1: Replace `src/ui/AppShell.tsx`**

```tsx
import { useState } from 'react'
import Board from './Board'
import DebugPanel from './DebugPanel'
import HeroBanner from './HeroBanner'
import NewGamePanel from './NewGamePanel'
import SeatLegend from './SeatLegend'
import { NO_OVERLAYS } from './BoardOverlays'
import { useGame } from './useGame'
import { useRulesConfig } from './useRulesConfig'
import './AppShell.css'
import type { OverlayFlags } from './BoardOverlays'
import type { RulesConfig } from '../rules/config'

function AppShell() {
  const configState = useRulesConfig()

  if (configState.status === 'loading') {
    return (
      <main className="app-shell">
        <HeroBanner />
        <p className="app-shell__status" role="status">
          Loading the tuning configuration…
        </p>
      </main>
    )
  }

  if (configState.status !== 'ready') {
    // load-failed and invalid are distinct states with distinct copy: one means
    // the file could not be reached, the other that it was reached and is wrong.
    // Neither ever falls back to constants nobody chose.
    return (
      <main className="app-shell">
        <HeroBanner />
        <section className="app-shell__error" role="alert">
          <h2>
            {configState.status === 'load-failed'
              ? 'Could not load rules.json'
              : 'rules.json is not valid'}
          </h2>
          <p className="app-shell__error-detail">{configState.message}</p>
          <p>
            The prototype cannot start without its tuning constants — playing with defaults nobody
            chose would invalidate every play-test conclusion. Fix the file and reload.
          </p>
        </section>
      </main>
    )
  }

  return <GameShell config={configState.config} />
}

/**
 * Split from AppShell so the game store's hooks are only mounted once a valid
 * config exists — useGame takes a RulesConfig, and a conditional hook call in
 * one component is not allowed.
 */
function GameShell({ config }: { config: RulesConfig }) {
  const { state, seed, playerCount, setupError, newGame } = useGame(config)
  const [overlays, setOverlays] = useState<OverlayFlags>(NO_OVERLAYS)

  return (
    <main className="app-shell">
      <HeroBanner />

      <NewGamePanel onNewGame={newGame} disabled={false} />

      {setupError !== null && (
        <section className="app-shell__error" role="alert">
          <h2>Could not generate a board</h2>
          <p className="app-shell__error-detail">{setupError}</p>
          <p>
            The geometry constants in <code>rules.json</code> may be too cramped for this player
            count — §12 of the rules document maps this symptom to the value to change.
          </p>
        </section>
      )}

      {state !== null && playerCount !== null && seed !== null && (
        <section className="app-shell__game" aria-label="Game board">
          <Board state={state} config={config} overlays={overlays} />
          <SeatLegend seats={state.seats} turnOrder={state.turnOrder} playerCount={playerCount} />
          <DebugPanel
            state={state}
            seed={seed}
            flags={overlays}
            onFlagsChange={setOverlays}
            onRegenerate={(nextSeed) => newGame(playerCount, nextSeed)}
          />
        </section>
      )}
    </main>
  )
}

export default AppShell
```

- [ ] **Step 2: Append the new layout classes to `src/ui/AppShell.css`**

Leave the existing `.app-shell` rule in place and add below it.

```css
.app-shell__status {
  margin: 1rem 0;
  font-family: system-ui, sans-serif;
  color: #4a4a4a;
}

.app-shell__error {
  margin: 1rem 0;
  padding: 0.9rem 1.1rem;
  border: 1px solid #c2483f;
  border-left-width: 5px;
  border-radius: 8px;
  background: #fdf3f2;
  font-family: system-ui, sans-serif;
  max-width: 70ch;
}

.app-shell__error h2 {
  margin: 0 0 0.4rem;
  font-size: 1rem;
}

.app-shell__error p {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
}

.app-shell__error-detail {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  word-break: break-word;
}

.app-shell__game {
  margin-top: 1.2rem;
}
```

- [ ] **Step 3: Typecheck, lint and measure**

Run: `npm run typecheck; npm run lint; (Get-Content src\ui\AppShell.tsx | Measure-Object -Line).Lines`
Expected: typecheck and lint exit 0 — every component `AppShell` imports was created in Tasks 14–21, so this is the point at which the whole app resolves for the first time. The line count is under 400.

- [ ] **Step 4: Re-run the specs this contract added, to confirm the UI wiring broke no engine behaviour**

Run: `npx vitest run src/rules/__tests__/config.test.ts src/rules/__tests__/rng.test.ts src/rules/__tests__/deck.test.ts src/rules/__tests__/setup.test.ts src/rules/__tests__/setupValidation.test.ts`
Expected: exits 0, Vitest reports 0 failed. Deliberately path-scoped — the unfiltered suite and the production build belong to the Final verification phase, not here.

---

## Phase 6 — Final verification

No production changes. Only sanity checks that the cumulative work is clean.

### Task 23: Confirm the `src/rules/` boundary still holds

- Skill: `react-frontend`

**Files:**
- Test: *(no file changes — verification only)*

- [ ] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("`
Expected: zero hits. Four new pure modules (`rng.ts`, `deck.ts`, `setup.ts`, `setupValidation.ts`) plus the widened `config.ts` are all DOM-free; the only `fetch` is in `src/ui/useRulesConfig.ts`.

- [ ] **Step 2: Confirm no `.tsx` file appeared under `src/rules/`**

Run: `Get-ChildItem -Path src\rules -Recurse -Filter *.tsx`
Expected: no output — pure logic has no JSX.

- [ ] **Step 3: Confirm generation is seeded**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "Math\.random|Date\.now"`
Expected: zero hits. `Date.now()` appears once in the whole codebase, in `src/ui/useGame.ts`, purely to mint a seed at the UI boundary.

- [ ] **Step 4: Confirm `PlayerId` never reached a limit or trigger path**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts,src\ui\*.tsx,src\ui\*.ts -Pattern "PlayerId"`
Expected: hits only in `types.ts` (the brand and `ColourSeat.owner`), `gameEnd.ts` (game-end summing), `scoring.ts:98` (the `sameOwner` report, which does not decide whether a trigger fires), `setup.ts` (`asPlayerId` when building seats) and `SeatLegend.tsx` (grouping for display). No hit inside a player-limit, marker-trigger or connection-map lookup.

### Task 24: Confirm no tunable was hard-coded

- Skill: `react-frontend`

**Files:**
- Test: *(no file changes — verification only)*

- [ ] **Step 1: Grep source for the literals `rules.json` now owns**

`src/ui/HeroScene.tsx` is excluded by name: lines 22 and 31 are decorative SVG hero-art path coordinates that happen to contain the bare tokens `120` and `800`, and `HeroScene.tsx:6` already documents that it reads nothing from `src/rules/`. The exclusion is one named file with a stated reason — the pattern itself is not weakened.

Run: `Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch '__tests__' -and $_.Name -ne 'HeroScene.tsx' } | Select-String -Pattern "\b(350|700|4000|1400|120|1333|1000)\b"`
Expected: zero hits. Every M2 value reaches the code through `RulesConfig`.

- [ ] **Step 2: Confirm the deck composition appears only in `rules.json`**

Run: `Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch '__tests__' } | Select-String -Pattern "HAMLET.*6|VILLAGE.*6"`
Expected: zero hits. `DECK_TYPE_ORDER` in `deck.ts` names the types but carries no counts; the counts live only in `public/rules.json` and in `TEST_CONFIG`.

- [ ] **Step 3: Confirm `rules.json` is the only fetched resource and no server call crept in**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "fetch\(|XMLHttpRequest|axios|WebSocket"`
Expected: exactly one hit — the `fetch(RULES_URL, …)` in `src/ui/useRulesConfig.ts`.

- [ ] **Step 4: Confirm no `console.log` / `console.debug` shipped**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "console\.(log|debug)"`
Expected: zero hits.

- [ ] **Step 5: Confirm no dependency was added**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --stat -- package.json package-lock.json`
Expected: no output — neither file changed. Two runtime dependencies, unchanged.

### Task 25: Measure every file created or grown

- Skill: `react-frontend`

Measured, not estimated. >400 lines is blocking and must be split in this contract, not deferred.

**Files:**
- Test: *(no file changes — verification only)*

- [ ] **Step 1: Line-count every new and modified source file**

Run: `Get-ChildItem -Path src\rules\setup.ts,src\rules\setupValidation.ts,src\rules\config.ts,src\rules\deck.ts,src\rules\rng.ts,src\constants\setup.ts,src\ui\Board.tsx,src\ui\BoardOverlays.tsx,src\ui\BoardTerrain.tsx,src\ui\StationCard.tsx,src\ui\SeatLegend.tsx,src\ui\NewGamePanel.tsx,src\ui\DebugPanel.tsx,src\ui\AppShell.tsx,src\ui\useGame.ts,src\ui\useRulesConfig.ts | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName | Measure-Object -Line).Lines)" }`
Expected: every count under 400. Anything in the 200–400 band gets a second look for a hook or sibling component hiding in it; anything over 400 is split before this contract is declared done.

### Task 26: Static gates, full suite and production build

- Skill: `react-frontend`

**Files:**
- Test: *(no file changes — verification only)*

- [ ] **Step 1: Typecheck, lint, format check, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` summary line.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note `build` runs `npm run lint` first, so a lint regression fails here too.

- [ ] **Step 3: Confirm `rules.json` shipped into the build**

`public/` is the only tree Vite copies into `dist/`, and a root-level `rules.json` would 404 in production — this is the check that the tuning surface is actually reachable from the built app.

Run: `Get-ChildItem dist\rules.json`
Expected: the file is listed.

- [ ] **Step 4: Confirm the built `rules.json` is the populated one, not the empty shell**

Run: `Get-Content dist\rules.json -Raw | Select-String -Pattern "borderPerimeter" -Quiet; Get-Content dist\rules.json -Raw | Select-String -Pattern "HAMLET" -Quiet`
Expected: `True` twice. Two separate greps rather than one alternation — `Select-String` reports one match per physical line and a minified JSON asset can be a single line, so an alternation would prove only that whichever branch appears first is present.

### Task 27: Write the PR description

- Skill: `none — a hand-off document for the developer, not code`

**Files:**
- Create: `.claude/contract/SCRUM-3-4-config-setup-and-board/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` in this folder, and a note that this one PR closes **SCRUM-3** and **SCRUM-4** together, with the reason (they are mutually blocking — SCRUM-4 needs SCRUM-3 AC1–4, SCRUM-3 AC5–8 need SCRUM-4's board and seed).
- Summary of the change: `rules.json` populated and validated, seeded generation, the SVG board, New Game, the debug panel.
- Every decision the developer must make, copied from the File map's "Developer decides or observes" section — the nine `rules.json` values, the derived-vs-stored edge lengths, `DECK_SIZE`, `MOUNTAIN_OFFSET_FRACTION`, `tangencyTolerance`, the colour palette, and the two declined dev dependencies.
- Every behaviour that can only be judged by playing: whether the board is legible and unclipped at the developer's window sizes, whether the station cards read without final art, whether the 2-player pairing is obvious, and whether the geometry makes a tight puzzle or a cramped one (§12).
- Verification results from Task 26, quoting the actual `Tests  N passed` line and the build outcome — not a claim that they were run.
- New conventions introduced, for future contributors: `validateSetup` is the setup-time counterpart to `validateStationPlacement` and the two must not be conflated; `NEW_GAME` is a UI action and `Move` stays the persisted union; `src/constants/setup.ts` holds numeric bounds and fixed-meaning values while every tunable stays in `rules.json`.
- The known accessibility gap: the board is a static SVG with an `aria-label`, and nothing in this contract needs pointer input, but SCRUM-6's fixed-length drag will have no keyboard equivalent.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage — SCRUM-3:**

- AC1 `rules.json` holds every §3 geometry constant, engine reads from file — Tasks 3, 4, 7. *Deviation: per-player edge lengths are derived, not stored — see `plan.md` → Risks.*
- AC2 `rules.json` holds the §8.1 composition and the deck is built from it — Tasks 3, 6, and Task 12 Step 6 (`buildDeck` call).
- AC3 a value change applies on a new game with no code edit — Tasks 3, 7, 22; the "read once at startup" caveat is stated in the panel copy in Task 21.
- AC4 validated on load with a clear startup error — Task 4 (all ten `CONFIG_FAILURE` codes, one spec each), surfaced by Task 22's `load-failed` / `invalid` branches.
- AC5 debug panel reveals all scores — Task 21.
- AC6 panel exposes the seed and accepts one — Task 21 (`parseSeed` sanitises; `hashSeed` from Task 5).
- AC7 overlays: station rects, sampled vertices, detected crossings — Tasks 16, 21.
- AC8 debug affordances visually distinct and default off — Task 21 (`useState(false)`, dashed magenta, monospace).

**Spec coverage — SCRUM-4:**

- AC1 New Game generates border, mountain, river, one station per corner — Tasks 12, 20, 22.
- AC2 regular polygon per §6 with perimeter preserved — Task 10 (`regularPolygon`, exactness asserted to 6 decimal places).
- AC3 2/3/4/5 selectable; 2 gives the square — Tasks 10 (`sideCountFor`), 12, 20.
- AC4 four colour-seats, two owners, `[A1, B1, A2, B2]`, opposite corners — Task 12 Steps 1 and 6.
- AC5 mountain loop of the configured circumference, 0–15% offset, touching neither border nor river — Tasks 8, 12 Step 3, 11.
- AC6 river of the configured length, exactly one end on the border, curving inward, regenerated on self-intersection or within one card width of the mountain — Tasks 9, 12 Step 4, 11.
- AC7 stations one per corner in clockwise seat order, inside and touching — Tasks 10 (clockwise winding), 12 Step 5, 11.
- AC8 seeded and deterministic — Tasks 5, 6, 12 (deep-equality across all four player counts).
- AC9 always passes legality checks; retries; a ceiling raises an error — Tasks 11, 12 Steps 3–6.
- AC10 SVG, distinguishable layers, fits any viewport without clipping — Tasks 13 (`boardBounds`), 15, 17.
- AC11 placeholder rects with type name, black-over-grey bonus, pawn count — Task 14.
- AC12 2-player seat ownership readable at a glance — Task 18.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows exact code or a runnable command with `Run:` / `Expected:`. Two steps deliberately describe a *transient* red state (Task 11 Step 4, Task 12 Step 2) and say so explicitly rather than leaving the executor to guess; Task 12 Step 3 flags its own placeholder constructor arguments and Step 6 replaces them.

**Type / name consistency:** Verified across tasks — `parseRulesConfig`, `describeConfigFailures`, `CONFIG_VERSION`, `DeckStationType`, `DeckComposition`, `RulesConfig`'s four new fields, `DECK_SIZE`, `CONFIG_FAILURE`, `SETUP_FAILURE`, `GAME_ACTION`, `createRng`, `hashSeed`, `Rng`, `buildDeck`, `pointTouchesPath`, `PlayerCount`, `sideCountFor`, `regularPolygon`, `inradius`, `generateSetup`, `SetupRequest`, `SetupGenerationError`, `SetupFailure`, `SetupValidationResult`, `validateSetup`, `boardBounds`, `OverlayFlags`, `RulesConfigState`, `GameAction`, `UseGameResult`, `useGame`, `useRulesConfig`, and every `src/constants/setup.ts` name are each spelled identically at every site. `rules.json` key names (`configVersion`, `geometry.*`, `deck.composition.*`) match `GEOMETRY_KEYS` in Task 4 and `TEST_CONFIG` in Task 3 — the chain the compiler cannot see.

**Three additions beyond `plan.md` → Data shapes, stated rather than silent:** (1) `SeatLegendProps` gains `turnOrder`, because grouping owners in `[A1, B1, A2, B2]` order requires it and `seats` alone does not carry turn order. (2) `BoardOverlays` exports a `NO_OVERLAYS` constant so `AppShell` does not inline the initial flag object. (3) `GameAction`'s `MOVE` variant carries `config`, keeping `reduce` a pure function of its arguments instead of closing over a possibly-stale config. None changes the design; all three are named here so review can reject them.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: `rules.json`, the widened `RulesConfig` and its single construction site change in one task (Task 3), so no half-applied rename exists; `rng.ts`, `deck.ts` and `useRulesConfig.ts` are complete and self-contained, the last of them unconsumed, which type-checks cleanly.
- **Phase 2** ends type-checking: three additive units, no consumer changed. `setup.ts` exists with three complete exported functions.
- **Phase 3** ends type-checking with both new specs green. Task 11's spec is transiently red because it imports `generateSetup` from Task 12 — both are inside this phase, so the *boundary* is clean, and Task 11 Step 4 says so explicitly.
- **Phase 4** ends type-checking: leaf components first, `Board` last, every import resolving inside the phase. Nothing imports `AppShell`'s wiring yet, so the board renders nowhere — complete but unreached, not broken.
- **Phase 5** ends type-checking with the full suite green: `AppShell` is deliberately the final task so every component it imports already exists.
- **Phase 6** makes no production change.

