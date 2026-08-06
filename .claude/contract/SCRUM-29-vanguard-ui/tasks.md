# Tasks: Vanguard UI — hex board renderer and action selection

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-08-06

**Goal:** Build the playable Vanguard board as a full-viewport, non-scrolling game screen — the hex rhombus with both bases, every token in its owner's colour, defense cells and the +1 reinforced state, plus an action palette that submits Expand/Overwrite/Reinforce against a target cell to the existing engine — mounted as `VanguardMountProps` so it spans a whole match, with a Test-mode host that supplies each round's Muster from a manual trick-entry form.

**Spec:** `plan.md` in this folder. **`mockup.html` in this folder is the approved visual and interaction specification** — where it and `plan.md` disagree, the mockup wins.

**Pre-change test baseline, measured during planning:** `npm test` → `Test Files 40 passed (40)`, `Tests 314 passed (314)` — `node` 37 files / 292 tests, `dom` 3 files / 22 tests. Every count below is measured against this.

---

## File map

**Created:**

- `src/app/vanguard/hexLayout.ts` — pure axial→screen geometry; owns the board's orientation
- `src/app/vanguard/labels.ts` — accessible cell names, action names, rejection copy
- `src/app/vanguard/legalTargets.ts` — legal+affordable target set, by dry-running the real engine
- `src/app/vanguard/matchReducer.ts` — the single pure reducer owning the whole match
- `src/app/vanguard/useHexRovingFocus.ts` — one tab stop across the board, axial arrow-key movement
- `src/app/vanguard/HexCell.tsx` — one cell as a native `<button>`
- `src/app/vanguard/VanguardBoardView.tsx` — the board group (AC1)
- `src/app/vanguard/ActionPalette.tsx` — the three Clash actions plus the hint line (AC2)
- `src/app/vanguard/ClashOverPanel.tsx` — the Breach and round-over panels
- `src/app/vanguard/VanguardMatch.tsx` — the mount implementing `VanguardMountProps`
- `src/app/vanguard/TrickEntryForm.tsx` — Test-mode manual trick entry (AC6)
- `src/app/vanguard/TestModeVanguardHost.tsx` — Test-mode host owning `requestTricksWon` (AC6)
- `src/app/vanguard/vanguard.css` — the full-viewport shell, tokens, board, cells, palette, panels
- `src/app/vanguard/__tests__/boardFixture.ts` — hand-built `VanguardBoard` helper (not a spec)
- `src/app/vanguard/__tests__/hexLayout.test.ts`
- `src/app/vanguard/__tests__/labels.test.ts`
- `src/app/vanguard/__tests__/legalTargets.test.ts`
- `src/app/vanguard/__tests__/matchReducer.test.ts`
- `src/app/vanguard/__tests__/VanguardBoardView.test.tsx`
- `src/app/vanguard/__tests__/VanguardMatch.test.tsx`
- `src/app/vanguard/__tests__/TrickEntryForm.test.tsx`
- `.docs/implementation/vanguard-ui.md`

**Modified:**

- `src/App.tsx` — temporary mode control so Test mode is reachable; re-destructure `setMode`
- `src/app/vanguardMount.ts:11` — the comment naming `VanguardStub` as the consuming mount
- `.docs/implementation/app.md` — the Vanguard half of the contract now has a real UI
- `.docs/implementation/README.md` — add the `src/app/vanguard/` row

**Deleted:**

- `src/app/stubs/VanguardStub.tsx` — replaced wholesale, per `.docs/implementation/app.md`. This empties `src/app/stubs/`; remove the folder too.

**Developer decides or observes:**

- Every token value in `vanguard.css` is transcribed from the approved mockup and is a one-line retune: `--vg-player` / `--vg-player-deep` and `--vg-cpu` / `--vg-cpu-deep` (purple Player / green CPU are fixed by `skirmish-board-replacement.md`; these values are not), `--vg-defense`, `--vg-empty`, `--vg-empty-edge`, `--vg-selectable`, `--vg-reinforce-mark`, `--vg-board-max`'s `clamp()` bounds, and `--vg-radius`.
- Whether the reinforced marker reads clearly as "+1" in its mockup form (a parchment bar across the token's waist) rather than a ring, pip, or numeral.
- Whether keeping the palette armed after a successful submission is right — it makes a run of Expands cost one tap each after the first, but it also means a mis-tap places a token instead of doing nothing. Only playing settles it.
- Whether two taps per Clash action (palette, then cell) drags across a full Muster of 7–10 moves per round.
- Whether an 11×11 rhombus is legible and pleasant at a phone viewport, and whether 121 cells is the right density. `BOARD_SIZE` stays SCRUM-21's placeholder `11`; retune it in one line in `src/vanguard/config.ts` — not this contract's change.
- Whether a screen-reader user can genuinely navigate a 2D hex board by axial arrow keys. QA can confirm focus moves; whether the mental model works is real assistive-technology use.
- Accepting this module's single `try`/`catch` (around `chooseCpuClashAction`'s documented dead-end throw), where `src/app/warCouncil/` has none.
- Accepting that `src/App.tsx`'s mode control is throwaway scaffolding SCRUM-34 deletes.

---

## Phase 1 — Pure logic

Every module here is plain TypeScript with no React import and no DOM access, tested in the cheap `node` Vitest project — this is where all of this feature's real invariants live. Test-first throughout, since each has a stated invariant. The phase boundary is safe because nothing renders yet: `App.tsx` is untouched, so the running app is byte-for-byte unchanged, and each task ends with `npm run typecheck` clean.

### Task 1: Add `src/app/vanguard/hexLayout.ts`

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/hexLayout.ts`
- Test: `src/app/vanguard/__tests__/hexLayout.test.ts`

- [ ] **Step 1: Write the failing spec**

The invariants that matter are orientation (the developer's confirmed instruction), containment, and finiteness. Finiteness is not pedantry: a `NaN` reaching a `%` offset positions the cell at the container origin with no error anywhere — the same class of silent failure `fanLayout.ts`'s `count > 1` guard exists to prevent.

```ts
import { describe, expect, it } from 'vitest'
import { hexBoardMetrics, hexPlacement } from '../hexLayout'

describe('hexBoardMetrics', () => {
  it('reports a wider-than-tall rhombus', () => {
    const m = hexBoardMetrics(11)
    expect(m.widthUnits).toBeGreaterThan(m.heightUnits)
    expect(m.aspectRatio).toBeCloseTo(m.widthUnits / m.heightUnits)
  })

  it('never divides by zero on a degenerate size', () => {
    for (const size of [0, -1]) {
      const m = hexBoardMetrics(size)
      expect(Number.isFinite(m.aspectRatio)).toBe(true)
      expect(m.aspectRatio).toBeGreaterThan(0)
    }
  })
})

describe('hexPlacement — orientation', () => {
  // Developer-confirmed at the approval gate: the player's base {0,0} renders at
  // the BOTTOM-LEFT and the CPU's {10,10} at the TOP-RIGHT, so the rhombus leans
  // left-to-right off its bottom-left corner. y grows downward.
  it('puts the player base at the bottom and the cpu base at the top', () => {
    const player = hexPlacement({ q: 0, r: 0 }, 11)
    const cpu = hexPlacement({ q: 10, r: 10 }, 11)
    expect(player.yFraction).toBeGreaterThan(cpu.yFraction)
  })

  it('makes the player base the leftmost cell on the board', () => {
    const player = hexPlacement({ q: 0, r: 0 }, 11)
    for (let q = 0; q < 11; q++) {
      for (let r = 0; r < 11; r++) {
        expect(hexPlacement({ q, r }, 11).xFraction).toBeGreaterThanOrEqual(player.xFraction)
      }
    }
  })

  it('leans rows to the right as they climb', () => {
    const low = hexPlacement({ q: 0, r: 0 }, 11)
    const high = hexPlacement({ q: 0, r: 10 }, 11)
    expect(high.xFraction).toBeGreaterThan(low.xFraction)
    expect(high.yFraction).toBeLessThan(low.yFraction)
  })
})

describe('hexPlacement — containment and safety', () => {
  it('keeps every cell centre inside the bounding box and finite', () => {
    for (const size of [1, 5, 11]) {
      for (let q = 0; q < size; q++) {
        for (let r = 0; r < size; r++) {
          const p = hexPlacement({ q, r }, size)
          expect(Number.isFinite(p.xFraction)).toBe(true)
          expect(Number.isFinite(p.yFraction)).toBe(true)
          expect(p.xFraction).toBeGreaterThan(0)
          expect(p.xFraction).toBeLessThan(1)
          expect(p.yFraction).toBeGreaterThan(0)
          expect(p.yFraction).toBeLessThan(1)
        }
      }
    }
  })
})
```

- [ ] **Step 2: Confirm it fails for the right reason**

Run: `npx vitest run src/app/vanguard/__tests__/hexLayout.test.ts`
Expected: non-zero exit, failing to resolve `../hexLayout`. A different error means the spec itself is wrong.

- [ ] **Step 3: Implement `hexLayout.ts`**

`ROW_HEIGHT_RATIO` and `HEX_HEIGHT_TO_WIDTH` are pure geometry, not tunables — a pointy-top hex row advances three quarters of a hex height, and a pointy-top hex is `2/√3` as tall as it is wide. Neither is the developer's to retune.

```ts
import type { HexCoord } from '../../vanguard'

/** A pointy-top hex row advances three quarters of a hex height. Geometry, not a tunable. */
const ROW_HEIGHT_RATIO = 0.75
/** A pointy-top hex is 2/√3 as tall as it is wide. Geometry, not a tunable. */
const HEX_HEIGHT_TO_WIDTH = 2 / Math.sqrt(3)

export interface HexPlacement {
  readonly xFraction: number
  readonly yFraction: number
}

export interface HexBoardMetrics {
  readonly widthUnits: number
  readonly heightUnits: number
  readonly aspectRatio: number
  readonly cellWidthFraction: number
}

export function hexBoardMetrics(size: number): HexBoardMetrics {
  // A degenerate size must not produce a zero divisor: aspectRatio feeds a CSS
  // `aspect-ratio` and cellWidthFraction feeds a `%` width, and a NaN in either
  // is dropped silently by the browser with no error anywhere.
  const span = size > 0 ? size : 1
  const widthUnits = span + (span - 1) / 2 + 1
  const heightUnits = (span - 1) * ROW_HEIGHT_RATIO + HEX_HEIGHT_TO_WIDTH

  return {
    widthUnits,
    heightUnits,
    aspectRatio: widthUnits / heightUnits,
    cellWidthFraction: 1 / widthUnits,
  }
}

/**
 * Axial coordinate to a fractional position inside the rhombus bounding box.
 *
 * The r axis is FLIPPED for screen space — increasing r climbs the screen — so the
 * engine's fixed `bases.player` at {0,0} renders bottom-left (lowest and leftmost)
 * and `bases.cpu` at {size-1,size-1} renders top-right, leaning the rhombus
 * left-to-right off its bottom-left corner. Developer-confirmed at SCRUM-29's
 * approval gate. This function is the ONLY place orientation is decided: no
 * coordinate is rewritten and nothing in src/vanguard/ changes, so re-orienting
 * the board later is a one-line change here rather than a sweep of every consumer.
 */
export function hexPlacement(coord: HexCoord, size: number): HexPlacement {
  const { widthUnits, heightUnits } = hexBoardMetrics(size)
  const span = size > 0 ? size : 1

  return {
    xFraction: (coord.q + coord.r / 2 + 0.5) / widthUnits,
    yFraction:
      ((span - 1 - coord.r) * ROW_HEIGHT_RATIO + HEX_HEIGHT_TO_WIDTH / 2) / heightUnits,
  }
}
```

- [ ] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/vanguard/__tests__/hexLayout.test.ts; npm run typecheck`
Expected: Vitest reports 6 passed, 0 failed; typecheck exits 0.

### Task 2: Add `src/app/vanguard/labels.ts`

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/labels.ts`
- Test: `src/app/vanguard/__tests__/labels.test.ts`

- [ ] **Step 1: Write the failing spec**

`cellAccessibleName` is what every AC4 query binds to, so its exact output is a contract, not a detail. The totality checks on the two `Record` maps matter because a future engine ticket widening either union must fail to compile here rather than rendering `undefined`.

```ts
import { describe, expect, it } from 'vitest'
import {
  ClashRejectionReason,
  IllegalActionReason,
  VanguardActionKind,
  VanguardCellKind,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { ACTION_NAME, cellAccessibleName, REJECTION_MESSAGE } from '../labels'

const BASES = {
  [PlayerSide.Player]: { q: 0, r: 0 },
  [PlayerSide.Cpu]: { q: 10, r: 10 },
}

describe('cellAccessibleName', () => {
  it('names an empty cell by coordinate', () => {
    expect(cellAccessibleName({ q: 2, r: 7 }, undefined, BASES)).toBe('Cell 2, 7 — empty')
  })

  it('names the player base and its token together', () => {
    expect(
      cellAccessibleName(
        { q: 0, r: 0 },
        { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        BASES,
      ),
    ).toBe('Cell 0, 0 — your base, your token')
  })

  it('names a reinforced enemy token', () => {
    expect(
      cellAccessibleName(
        { q: 3, r: 4 },
        { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 1 },
        BASES,
      ),
    ).toBe('Cell 3, 4 — their token, reinforced')
  })

  it('names a defense cell', () => {
    expect(cellAccessibleName({ q: 5, r: 5 }, { kind: VanguardCellKind.Defense }, BASES)).toBe(
      'Cell 5, 5 — permanent defense',
    )
  })

  it('names an empty enemy base cell', () => {
    expect(cellAccessibleName({ q: 10, r: 10 }, undefined, BASES)).toBe(
      'Cell 10, 10 — their base, empty',
    )
  })
})

describe('the label maps', () => {
  it('names every action kind', () => {
    for (const kind of Object.values(VanguardActionKind)) expect(ACTION_NAME[kind]).toBeTruthy()
  })

  it('carries copy for every reason from both rejection unions', () => {
    for (const reason of Object.values(IllegalActionReason)) {
      expect(REJECTION_MESSAGE[reason]).toBeTruthy()
    }
    for (const reason of Object.values(ClashRejectionReason)) {
      expect(REJECTION_MESSAGE[reason]).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Confirm it fails for the right reason**

Run: `npx vitest run src/app/vanguard/__tests__/labels.test.ts`
Expected: non-zero exit, failing to resolve `../labels`.

- [ ] **Step 3: Implement `labels.ts`**

Copy is transcribed from the approved mockup. Side words are local copy (`your` / `their`), never a raw `PlayerSide` string leaking into the UI — the same rule `TrickWell` follows in the War Council module. Both `Record` types are total over their unions so a widened union is a compile error here.

```ts
import {
  ClashRejectionReason,
  IllegalActionReason,
  VanguardActionKind,
  VanguardCellKind,
  type HexCoord,
  type VanguardCell,
} from '../../vanguard'
import { PlayerSide } from '../../warCouncil'

export const SIDE_NAME: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'your',
  [PlayerSide.Cpu]: 'their',
}

export const ACTION_NAME: Readonly<Record<VanguardActionKind, string>> = {
  [VanguardActionKind.Expand]: 'Expand',
  [VanguardActionKind.Overwrite]: 'Overwrite',
  [VanguardActionKind.Reinforce]: 'Reinforce',
}

export const ACTION_DESCRIPTION: Readonly<Record<VanguardActionKind, string>> = {
  [VanguardActionKind.Expand]: '1 move · empty, within 2',
  [VanguardActionKind.Overwrite]: '2–3 moves · adjacent enemy',
  [VanguardActionKind.Reinforce]: '1 move · your own token',
}

/** The one accessible name every cell button binds to (AC4). */
export function cellAccessibleName(
  coord: HexCoord,
  cell: VanguardCell | undefined,
  bases: Readonly<Record<PlayerSide, HexCoord>>,
): string {
  const at = `Cell ${coord.q}, ${coord.r}`
  const base = basePrefix(coord, bases)

  if (!cell) return `${at} — ${base}empty`
  if (cell.kind === VanguardCellKind.Defense) return `${at} — permanent defense`

  const owner = `${SIDE_NAME[cell.owner]} token`
  return `${at} — ${base}${owner}${cell.reinforced > 0 ? ', reinforced' : ''}`
}

function basePrefix(coord: HexCoord, bases: Readonly<Record<PlayerSide, HexCoord>>): string {
  for (const side of [PlayerSide.Player, PlayerSide.Cpu]) {
    const base = bases[side]
    if (base.q === coord.q && base.r === coord.r) return `${SIDE_NAME[side]} base, `
  }
  return ''
}

export const REJECTION_MESSAGE: Readonly<
  Record<IllegalActionReason | ClashRejectionReason, string>
> = {
  [IllegalActionReason.CellOutOfBounds]: 'That cell is off the board.',
  [IllegalActionReason.CellIsDefense]: 'That cell is a permanent defense — nobody may hold it.',
  [IllegalActionReason.CellOccupied]: 'That cell is already occupied.',
  [IllegalActionReason.OutOfExpandRange]: 'That cell is too far from your network to expand into.',
  [IllegalActionReason.TargetNotEnemyToken]: 'Overwrite only takes an enemy token.',
  [IllegalActionReason.NotAdjacentToNetwork]:
    'That cell is not next to your network — Overwrite allows no gap.',
  [IllegalActionReason.TargetNotOwnToken]: 'Reinforce only strengthens a token you already hold.',
  [IllegalActionReason.ReinforcementCapReached]: 'That token is already reinforced.',
  [ClashRejectionReason.NotYourTurn]: 'It is not your turn.',
  [ClashRejectionReason.InsufficientMuster]: 'You do not have the moves left for that.',
  [ClashRejectionReason.ClashAlreadyResolved]: 'This round of The Clash is already over.',
}
```

- [ ] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/vanguard/__tests__/labels.test.ts; npm run typecheck`
Expected: Vitest reports 7 passed, 0 failed; typecheck exits 0.

### Task 3: Add the board fixture helper

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/__tests__/boardFixture.ts`

- [ ] **Step 1: Write the fixture builder**

Following the precedent of `src/vanguard/__tests__/testBoard.ts` and `src/app/warCouncil/__tests__/roundFixture.ts`: a helper inside `__tests__/` whose name does not match `*.test.ts`, so neither Vitest project collects it as a spec. Hand-built at a **small size** rather than produced by `createVanguardBoard`, because the reducer and legal-target specs need specific adjacency situations that a real 11×11 board cannot be aimed at, and a 5×5 board keeps assertions readable.

```ts
import {
  VanguardCellKind,
  cellKey,
  type HexCoord,
  type VanguardBoard,
  type VanguardCell,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'

const token = (owner: PlayerSide, reinforced = 0): VanguardCell => ({
  kind: VanguardCellKind.Token,
  owner,
  reinforced,
})

const defense = (): VanguardCell => ({ kind: VanguardCellKind.Defense })

export const SMALL_SIZE = 5

/**
 * A 5x5 board. Player holds a connected cluster off {0,0}; the CPU holds one off
 * {4,4} with a single token at {2,1} adjacent to the player's network, so an
 * Overwrite target exists. {2,2} is a permanent defense.
 */
export function makeBoard(overrides: Partial<VanguardBoard> = {}): VanguardBoard {
  const cells: Record<string, VanguardCell | undefined> = {}

  for (const c of [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 1, r: 1 },
  ]) {
    cells[cellKey(c)] = token(PlayerSide.Player)
  }
  cells[cellKey({ q: 1, r: 1 })] = token(PlayerSide.Player, 1)

  for (const c of [
    { q: 4, r: 4 },
    { q: 3, r: 4 },
    { q: 2, r: 1 },
  ]) {
    cells[cellKey(c)] = token(PlayerSide.Cpu)
  }

  cells[cellKey({ q: 2, r: 2 })] = defense()

  return {
    size: SMALL_SIZE,
    bases: {
      [PlayerSide.Player]: { q: 0, r: 0 },
      [PlayerSide.Cpu]: { q: 4, r: 4 },
    },
    cells,
    ...overrides,
  }
}

export const coord = (q: number, r: number): HexCoord => ({ q, r })
export { token, defense }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. A `noUnusedLocals` error here means an unused import — fix it rather than suppressing it.

### Task 4: Add `src/app/vanguard/legalTargets.ts`

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/legalTargets.ts`
- Test: `src/app/vanguard/__tests__/legalTargets.test.ts`

- [ ] **Step 1: Write the failing spec**

The load-bearing property is that this module **agrees with the engine by construction**, because it asks the engine rather than deciding. The last spec is the one that proves it: every coordinate the set contains must be accepted by `applyVanguardAction`, and every coordinate it omits must be rejected or unaffordable. That is a stronger assertion than any hand-listed expectation, and it is what keeps AC2 honest.

```ts
import { describe, expect, it } from 'vitest'
import {
  VanguardActionKind,
  allBoardCoords,
  applyVanguardAction,
  cellKey,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { legalTargetsFor } from '../legalTargets'
import { makeBoard } from './boardFixture'

const board = makeBoard()

describe('legalTargetsFor', () => {
  it('offers no target when nothing is affordable', () => {
    expect(legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, 0).size).toBe(0)
  })

  it('offers no target for a non-finite Muster', () => {
    expect(
      legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, Number.NaN).size,
    ).toBe(0)
  })

  it('never offers a defense cell to Expand', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, 9)
    expect(targets.has(cellKey({ q: 2, r: 2 }))).toBe(false)
  })

  it('offers the adjacent enemy token to Overwrite', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Overwrite, 9)
    expect(targets.has(cellKey({ q: 2, r: 1 }))).toBe(true)
  })

  it('offers only unreinforced own tokens to Reinforce', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Reinforce, 9)
    expect(targets.has(cellKey({ q: 0, r: 0 }))).toBe(true)
    // {1,1} is already reinforced in the fixture, so it is at the cap.
    expect(targets.has(cellKey({ q: 1, r: 1 }))).toBe(false)
  })

  it('agrees with the engine on every coordinate, for every action kind', () => {
    const muster = 9
    for (const kind of Object.values(VanguardActionKind)) {
      const targets = legalTargetsFor(board, PlayerSide.Player, kind, muster)
      for (const target of allBoardCoords(board.size)) {
        const engine = applyVanguardAction(board, PlayerSide.Player, { kind, target })
        const engineAllows = engine.ok && engine.cost <= muster
        expect(targets.has(cellKey(target))).toBe(engineAllows)
      }
    }
  })
})
```

- [ ] **Step 2: Confirm it fails for the right reason**

Run: `npx vitest run src/app/vanguard/__tests__/legalTargets.test.ts`
Expected: non-zero exit, failing to resolve `../legalTargets`.

- [ ] **Step 3: Implement `legalTargets.ts`**

This is the `firstValidated` pattern `chooseCpuClashAction` already uses, generalised from "the first legal candidate" to "every legal candidate". It contains **no legality rule of its own** — no distance check, no adjacency test, no ownership comparison, no cost arithmetic.

```ts
import {
  allBoardCoords,
  applyVanguardAction,
  cellKey,
  type CellKey,
  type VanguardActionKind,
  type VanguardBoard,
} from '../../vanguard'
import type { PlayerSide } from '../../warCouncil'

/**
 * Every coordinate where `kind` is both legal and affordable for `side`, found by
 * dry-running the real engine rather than re-deriving its rules — AC2's "no
 * client-side re-implementation of legality". Mirrors `chooseCpuClashAction`'s
 * own dry-run-validate pattern.
 *
 * Bounded by board.size^2 (121 calls at BOARD_SIZE 11), recomputed per render
 * while an action is armed. This is a discrete turn-based board, not a pointer
 * hot path, so recompute-from-scratch is the simplest correct design — the same
 * stance `network.ts` documents for `connectedNetwork`.
 */
export function legalTargetsFor(
  board: VanguardBoard,
  side: PlayerSide,
  kind: VanguardActionKind,
  musterAvailable: number,
): ReadonlySet<CellKey> {
  const targets = new Set<CellKey>()

  // Mirrors applyClashAction's own Number.isFinite guard: without it a malformed
  // Muster would compare as affordable against every cost.
  if (!Number.isFinite(musterAvailable)) return targets

  for (const target of allBoardCoords(board.size)) {
    const result = applyVanguardAction(board, side, { kind, target })
    if (result.ok && result.cost <= musterAvailable) targets.add(cellKey(target))
  }

  return targets
}
```

- [ ] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/vanguard/__tests__/legalTargets.test.ts; npm run typecheck`
Expected: Vitest reports 6 passed, 0 failed; typecheck exits 0.

### Task 5: Add `src/app/vanguard/matchReducer.ts`

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/matchReducer.ts`
- Test: `src/app/vanguard/__tests__/matchReducer.test.ts`

- [ ] **Step 1: Write the failing spec**

Covers the Muster pipeline, the player's commit path, the engine's own rejection surface, board persistence across rounds, and the CPU-advance loop's termination.

**The trick split matters and is easy to get wrong.** `tricksToPoints` (`src/warCouncil/scoring.ts`) is the "winning too much loses" curve: `<= 3 → 6`, `4 → 1`, `5 → 2`, `6 → 3`, `7–9 → 6`, `>= 10 → 0`. So a 10–3 split scores the player **0** and the CPU **6** — the CPU takes the bonus. Use **9–4** (player 6 points, CPU 1) when the player should win the War Council: that gives the player `MUSTER_BASELINE + MUSTER_BONUS` = 10 and the CPU 7.

```ts
import { describe, expect, it } from 'vitest'
import {
  ClashStatus,
  IllegalActionReason,
  VanguardActionKind,
  cellKey,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { createMatchUiState, matchReducer, MatchActionKind } from '../matchReducer'
import { makeBoard } from './boardFixture'

const start = () => createMatchUiState(makeBoard())
// 9 tricks scores 6 points against 4 tricks' 1 point, so the player takes the
// bonus. Do NOT use 10 here: tricksToPoints returns 0 for 10+ ("winning too
// much loses"), which hands the bonus to the CPU instead.
const musterReady = (player: number) =>
  ({
    kind: MatchActionKind.MusterReady,
    tricks: { [PlayerSide.Player]: player, [PlayerSide.Cpu]: 13 - player },
  }) as const

describe('createMatchUiState', () => {
  it('starts at round 1 with no clash and nothing armed', () => {
    const ui = start()
    expect(ui.round).toBe(1)
    expect(ui.clash).toBeNull()
    expect(ui.selectedAction).toBeNull()
    expect(ui.fault).toBeNull()
  })
})

describe('MusterReady', () => {
  it('rejects an impossible trick split as a fault rather than scoring it', () => {
    const ui = matchReducer(start(), {
      kind: MatchActionKind.MusterReady,
      tricks: { [PlayerSide.Player]: 10, [PlayerSide.Cpu]: 10 },
    })
    expect(ui.fault).toEqual({ kind: 'invalidTricks' })
    expect(ui.clash).toBeNull()
  })

  it('opens the clash with a Muster for both sides', () => {
    const ui = matchReducer(start(), musterReady(9))
    expect(ui.clash).not.toBeNull()
    expect(ui.clash?.muster[PlayerSide.Player]).toBeGreaterThan(0)
    expect(ui.clash?.muster[PlayerSide.Cpu]).toBeGreaterThan(0)
  })

  it('hands the turn back to the player after the opening side has moved', () => {
    // CLASH_FIRST_ROUND_OPENER is the CPU, so round 1 opens with CPU turns that
    // the reducer must run itself — the player must not face an inert board.
    const ui = matchReducer(start(), musterReady(9))
    expect(ui.clash?.status).toBe(ClashStatus.InProgress)
    if (ui.clash?.status === ClashStatus.InProgress) {
      expect(ui.clash.turn).toBe(PlayerSide.Player)
    }
  })
})

describe('the player’s turn', () => {
  const armed = () => {
    const ui = matchReducer(start(), musterReady(9))
    return matchReducer(ui, {
      kind: MatchActionKind.SelectAction,
      action: VanguardActionKind.Reinforce,
    })
  }

  it('ignores a tap with no action selected', () => {
    const ui = matchReducer(start(), musterReady(9))
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next).toBe(ui)
  })

  it('commits a legal action and spends Muster', () => {
    const ui = armed()
    const before = ui.clash?.muster[PlayerSide.Player] ?? 0
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.muster[PlayerSide.Player]).toBeLessThan(before)
    expect(next.clash?.board.cells[cellKey({ q: 0, r: 0 })]).toMatchObject({ reinforced: 1 })
  })

  it('names the engine’s own reason on an illegal target and leaves the board untouched', () => {
    const ui = armed()
    const boardBefore = ui.clash?.board
    // {2,2} is a permanent defense — never a Reinforce target.
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(next.rejection).toBe(IllegalActionReason.TargetNotOwnToken)
    expect(next.clash?.board).toBe(boardBefore)
  })

  it('clears a rejection when a new action is selected', () => {
    const ui = armed()
    const rejected = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(rejected.rejection).not.toBeNull()
    const reselected = matchReducer(rejected, {
      kind: MatchActionKind.SelectAction,
      action: VanguardActionKind.Expand,
    })
    expect(reselected.rejection).toBeNull()
  })

  it('keeps the action armed after a successful submission', () => {
    const ui = armed()
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next.selectedAction).toBe(VanguardActionKind.Reinforce)
  })
})

describe('rounds', () => {
  it('carries the board forward and clears the clash on NextRound', () => {
    const ui = matchReducer(start(), musterReady(9))
    const board = ui.clash?.board
    const next = matchReducer(ui, { kind: MatchActionKind.NextRound })
    expect(next.round).toBe(2)
    expect(next.clash).toBeNull()
    expect(next.board).toBe(board)
  })
})
```

- [ ] **Step 2: Confirm it fails for the right reason**

Run: `npx vitest run src/app/vanguard/__tests__/matchReducer.test.ts`
Expected: non-zero exit, failing to resolve `../matchReducer`.

- [ ] **Step 3: Implement `matchReducer.ts`**

Types exactly as `plan.md` Part 2 → Data shapes declares them: `MatchRejection`, `MatchFault`, `MatchUiState`, `MatchActionKind`, `MatchUiAction`, `createMatchUiState`, `matchReducer`. Structure: imports → exported shapes → `createMatchUiState` → `matchReducer` → private helpers → nothing else.

Four rules the implementation must hold:

1. **No rule is decided here.** Legality, cost, turn order, and the Breach all come back from `applyClashAction`. The reducer never calls `hasReachedBreach`, never compares a distance, and never computes a cost — it reads `ClashState.status` and `ClashState.turn`.
2. **`MusterReady` runs the documented pipeline unchanged** — `isValidTricksWon` → `scoreRound` → `convertScoreToMuster` → `startClash(state.board, muster, openingSideForRound(state.round))`. No parallel scoring rule. An invalid split sets `fault: { kind: 'invalidTricks' }` and never reaches `scoreRound`.
3. **The CPU advance is a loop, not a single step**, because an exhausted side hands consecutive turns to the other (`vanguard.md` → *The Clash turn engine*, step 7). It runs after every accepted player action and after `MusterReady`. Its shape:

```ts
/**
 * Spends the CPU's turns until the turn returns to the player or the clash ends.
 * Bounded by muster[cpu]: every accepted action costs at least EXPAND_COST (1),
 * and any rejection breaks immediately, so this cannot spin.
 *
 * `chooseCpuClashAction` throws on its documented dead end — a side with Muster
 * but no legal affordable action (vanguard.md -> Deferred). There is no legal-move
 * enumerator to guard with the way roundReducer guards `legalMoves(...).length === 0`,
 * and re-deriving one here is exactly what AC2 forbids. So the throw is caught and
 * converted into visible, play-blocking fault state — surfaced, never swallowed.
 */
function advanceCpu(clash: ClashState): { clash: ClashState; fault: MatchFault | null } {
  let current = clash

  while (current.status === ClashStatus.InProgress && current.turn === PlayerSide.Cpu) {
    let action: VanguardAction
    try {
      action = chooseCpuClashAction(current.board, PlayerSide.Cpu, current.muster[PlayerSide.Cpu])
    } catch (error) {
      return {
        clash: current,
        fault: { kind: 'cpuDeadEnd', message: error instanceof Error ? error.message : String(error) },
      }
    }

    const result = applyClashAction(current, PlayerSide.Cpu, action)
    if (!result.ok) {
      return { clash: current, fault: { kind: 'cpuRejected', reason: result.reason } }
    }
    current = result.state
  }

  return { clash: current, fault: null }
}
```

4. **Behaviour per action:**
   - `MusterReady` — no-op if `state.clash !== null` or `state.fault !== null`. Otherwise validate, build the Muster, `startClash`, then `advanceCpu`.
   - `RequestFailed` — sets `fault: { kind: 'requestFailed', message }`.
   - `SelectAction` — toggles off when the same kind is already selected; otherwise arms it. Always clears `rejection`. Ignored when it is not the player's turn.
   - `TapCell` — ignored unless `clash?.status === InProgress && clash.turn === Player && selectedAction !== null && fault === null`. Calls `applyClashAction(clash, PlayerSide.Player, { kind: selectedAction, target })`. On `{ ok: false }` sets `rejection` to the engine's own reason and returns the input state's `clash` **by reference** — the engine never partially commits, so the board is provably untouched. On success replaces `clash`, clears `rejection`, keeps `selectedAction` armed, then runs `advanceCpu`.
   - `CancelSelection` — clears `selectedAction` and `rejection`.
   - `NextRound` — no-op while `clash` is `null`. Otherwise `round + 1`, `board` set to `clash.board`, `clash` back to `null`, selection and rejection cleared.

- [ ] **Step 4: Confirm the spec passes**

Run: `npx vitest run src/app/vanguard/__tests__/matchReducer.test.ts; npm run typecheck`
Expected: Vitest reports 11 passed, 0 failed; typecheck exits 0.

- [ ] **Step 5: Confirm the four pure modules stayed pure and within budget**

Run: `Select-String -Path src\app\vanguard\hexLayout.ts,src\app\vanguard\labels.ts,src\app\vanguard\legalTargets.ts,src\app\vanguard\matchReducer.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"; (Get-Content src\app\vanguard\matchReducer.ts | Measure-Object -Line).Lines`
Expected: zero `Select-String` hits; the line count is reported and under 250. This is what lets all four run in the cheap `node` Vitest project.

---

## Phase 2 — The shell and the board

`game-ux` is explicit that retrofitting a no-scroll grid around a laid-out screen is the expensive order, so the shell comes first, before any content. Read `.claude/skills/game-ux/references/full-viewport-layout.md` before writing the CSS. Then the board itself. The phase boundary is safe because nothing mounts these components yet — `App.tsx` is still untouched, so the running app is unchanged.

### Task 6: Add `src/app/vanguard/vanguard.css`

- Skill: `game-ux`

**Files:**

- Create: `src/app/vanguard/vanguard.css`

- [ ] **Step 1: Transcribe the shell, the token table, and every zone from the mockup**

Transcribe from `mockup.html`'s `<style>` block. Every custom property and class takes a `vg-` prefix — the audit confirmed that namespace is free (0 hits in `src/`) while `wc-` has 95. The mockup deliberately reuses the War Council's chamber/felt/brass/chalk neutrals and its serif+sans pairing, so this is a sibling stylesheet, not a new identity.

Non-negotiable in this file:

```css
.vg-shell {
  height: 100dvh;
  width: 100%;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-areas: 'status' 'board' 'palette';
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
  box-sizing: border-box;
  color-scheme: dark;
}
```

Five details the mockup settled that are easy to lose:

- **`1fr` belongs to the board row**, `auto` to the band and the palette. Reversed, the palette grows and the board collapses at short viewports.
- **The board container is `aspect-ratio`-constrained and `max-height: 100%`**, with `width: min(100%, var(--vg-board-max))`. The ratio is written as `16 / 8.6547` with a comment naming it as `hexBoardMetrics(11)`'s output — derived, never hand-chosen.
- **A focused cell drops its `clip-path`** (`clip-path: none; border-radius: 3px`) and takes a square brass outline. `clip-path` clips an outline as well as pointer events, so without this the keyboard focus ring is invisible — an accessibility defect no test would catch.
- **State reads without colour alone**: a base carries a heavy parchment inner ring plus a `★` glyph, a reinforced token a parchment bar across its waist via `::before`, a defense cell a 45° hatch over its fill, and a legal target a brass inner ring. Colour-vision differences and a static screenshot must both still work.
- **Interactive controls clear 44px and use `:focus-visible`**, hover rules sit inside `@media (hover: hover)`, and `touch-action: manipulation` is set — per `react-frontend` § *Accessibility and input*. Honour `prefers-reduced-motion` for the cell and action transitions.

No `vh`/`vw` unit anywhere: dimensions are `dvh`, `%`, `rem`, or `vmin`.

- [ ] **Step 2: Confirm the file is within budget and formatted**

Run: `(Get-Content src\app\vanguard\vanguard.css | Measure-Object -Line).Lines; npx prettier --check src/app/vanguard/vanguard.css`
Expected: line count reported and under 400; `prettier --check` exits 0. A CSS file over 400 lines is blocking — split the panel and form rules into a sibling `vanguardPanels.css` imported by the same component, exactly as `warCouncilCards.css` was split, and record the split in the File map.

### Task 7: Add `src/app/vanguard/useHexRovingFocus.ts`

- Skill: `game-ux`

**Files:**

- Create: `src/app/vanguard/useHexRovingFocus.ts`

- [ ] **Step 1: Write the hook**

Per `HexRovingFocus` in `plan.md` Part 2 → Data shapes. 121 sibling controls is far past `game-ux`'s "about five" hard floor, so the whole board must be **one** tab stop.

Requirements:

- Local `useState` holds the focused `CellKey`, seeded to the player's own base — the developer's confirmed bottom-left corner, which is where a keyboard player's attention starts.
- Exactly one cell carries `tabIndex={0}`; every other carries `-1`.
- `ArrowLeft`/`ArrowRight` step `q` by ∓1. **`ArrowUp` steps `r` by +1 and `ArrowDown` by −1**, because `hexPlacement` flips the `r` axis so increasing `r` climbs the screen — an arrow key must move focus the way it points, not the way the axis is signed. Clamp both to `[0, board.size - 1]`.
- `Home`/`End` jump to the first/last focusable cell in row-major order.
- `Escape` calls `onCancel`.
- `Enter` and `Space` need no handling — they activate the focused `<button>` natively.
- Focus moves **imperatively inside the keydown handler**, never from an effect. There is no `useEffect` in this file.
- When the target cell is not focusable (a `disabled` button cannot take focus), still move the tab stop so a subsequent arrow press continues from there, and skip the `.focus()` call rather than leaving focus stranded.

Carry this comment, because it is the module's one string-bound invariant:

```ts
// Invariant this hook depends on but cannot enforce: every cell renders a native
// <button> carrying data-cell="<q>,<r>". The lookup binds by attribute string with
// no typed contract — if HexCell ever stops setting it, or renders something other
// than a <button>, arrow-key navigation silently stops moving focus. The call is
// optional-chained, so nothing throws, no test fails differently, and TypeScript
// cannot see it. Task 8 owns the other half of this binding.
const target = groupRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${key}"]`)
```

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `react-hooks/refs` forbids reading a ref's `.current` during render — this hook only reads it inside the keydown handler, so it must stay silent.

### Task 8: Add `src/app/vanguard/HexCell.tsx`

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/HexCell.tsx`

- [ ] **Step 1: Write the component**

Per `HexCellProps` in `plan.md` Part 2 → Data shapes. This component computes **no geometry** — it is handed a `HexPlacement` and a `cellWidthFraction` and applies them.

Requirements:

- The element is always a `<button type="button">`, and its accessible name is `cellAccessibleName(coord, cell, bases)` from `labels.ts`. **This is what every AC4 query binds to.**
- It sets `data-cell={cellKey(coord)}` — the other half of Task 7's binding.
- Position and size come from `style`: `left`/`top` as `%` from the placement's fractions, `width` as `%` from `cellWidthFraction`, and `aspectRatio` for the hexagon's height. Everything else — the clip-path, the fill, the rings, the hatch, the reinforce bar — is a CSS rule keyed off `data-*` attributes, so no colour or shape value appears in this file.
- `data-kind` is `'empty' | 'token' | 'defense'`; `data-owner` is set only for a token; `data-reinforced="true"` only when `cell.reinforced > 0`; `data-base="true"` when the coordinate matches either base; `data-selectable="true"` when `selectable`.
- `disabled={!selectable}` — this is half of AC2's "rejected/**disabled** if illegal", and it is also what makes the roving tabindex skip illegal cells for free.
- `tabIndex={tabStop ? 0 : -1}`.
- The `★` base glyph is `aria-hidden` — the base is already named in the accessible name, so announcing the glyph would duplicate it.

- [ ] **Step 2: Typecheck, lint, and confirm no colour literal leaked in**

Run: `npm run typecheck; npm run lint; Select-String -Path src\app\vanguard\HexCell.tsx -Pattern "#[0-9a-fA-F]{3,6}"`
Expected: both commands exit 0; zero `Select-String` hits. Every colour belongs to `vanguard.css`'s token table.

### Task 9: Add `src/app/vanguard/VanguardBoardView.tsx` — AC1

- Skill: `game-ux`

**Files:**

- Create: `src/app/vanguard/VanguardBoardView.tsx`
- Test: `src/app/vanguard/__tests__/VanguardBoardView.test.tsx`

- [ ] **Step 1: Write the component**

Per `VanguardBoardViewProps`. Renders every coordinate from `allBoardCoords(board.size)` as a `HexCell`, placed by `hexPlacement(coord, board.size)` — this component computes no geometry itself and decides no legality; it renders the `legalTargets` set it is handed.

- The container is a `<div role="group">` with `aria-label` naming the board and its size, carrying `useHexRovingFocus`'s `groupRef` and `handleKeyDown`.
- The container's inline style sets `aspect-ratio` from `hexBoardMetrics(board.size).aspectRatio`, so a retuned `BOARD_SIZE` reshapes the board with no CSS edit.
- A cell is `selectable` when `interactive && legalTargets.has(cellKey(coord))`.
- The React list key is `cellKey(coord)`.
- Render order is row-major by `r` then `q`, so DOM order is stable and predictable for `Home`/`End`.

- [ ] **Step 2: Write the component test**

Must be `.test.tsx` — `vite.config.ts:26` collects only `.tsx` into the `dom` project, and a component spec in a `.ts` file silently never runs. `afterEach(cleanup)` is declared per file rather than in `setupFiles`, because a global setup file would import `@testing-library/react` into every node-environment spec and break them.

```tsx
/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VanguardActionKind, cellKey } from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { legalTargetsFor } from '../legalTargets'
import VanguardBoardView from '../VanguardBoardView'
import { makeBoard, SMALL_SIZE } from './boardFixture'

afterEach(cleanup)

const board = makeBoard()
const noTargets = new Set<string>()

describe('VanguardBoardView — AC1', () => {
  it('renders one button per board coordinate', () => {
    render(
      <VanguardBoardView
        board={board}
        legalTargets={noTargets}
        interactive={false}
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(SMALL_SIZE * SMALL_SIZE)
  })

  it('names both bases, a reinforced token, a defense cell, and an empty cell', () => {
    render(
      <VanguardBoardView
        board={board}
        legalTargets={noTargets}
        interactive={false}
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Cell 0, 0 — your base, your token' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cell 4, 4 — their base, their token' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cell 1, 1 — your token, reinforced' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cell 2, 2 — permanent defense' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cell 3, 0 — empty' })).toBeDefined()
  })

  it('disables every cell that is not a legal target — AC2', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Reinforce, 9)
    render(
      <VanguardBoardView
        board={board}
        legalTargets={targets}
        interactive
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    // {0,0} is an unreinforced own token — legal. {2,2} is a defense — never legal.
    // `jest-dom` is NOT a dependency here, so there is no `toBeDisabled` matcher:
    // assert the DOM property directly rather than adding a package.
    expect(targets.has(cellKey({ q: 0, r: 0 }))).toBe(true)
    const own = screen.getByRole('button', { name: 'Cell 0, 0 — your base, your token' })
    const defense = screen.getByRole('button', { name: 'Cell 2, 2 — permanent defense' })
    expect((own as HTMLButtonElement).disabled).toBe(false)
    expect((defense as HTMLButtonElement).disabled).toBe(true)
  })

  it('is one tab stop across the whole board, not one per cell', () => {
    render(
      <VanguardBoardView
        board={board}
        legalTargets={noTargets}
        interactive={false}
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const stops = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(stops).toHaveLength(1)
  })
})
```

Confirmed during planning: neither `@testing-library/jest-dom` nor `@testing-library/user-event` is in `package.json`. The spec above therefore asserts `.disabled` directly and uses only `render`, `screen`, `cleanup` and `fireEvent` from `@testing-library/react`. **Do not add either package** — a new dependency needs developer approval and this contract has none.

- [ ] **Step 3: Confirm the spec passes**

Run: `npx vitest run src/app/vanguard/__tests__/VanguardBoardView.test.tsx; npm run typecheck`
Expected: Vitest reports 4 passed, 0 failed; typecheck exits 0. If the run reports `Timeout waiting for worker to respond`, that is the cold-cache jsdom flake recorded in `plan.md` Risks — re-run before treating it as a failure.

---

## Phase 3 — Action selection and the mount

The interactive half. `ActionPalette` and `ClashOverPanel` are handed state and decide nothing; `VanguardMatch` wires the reducer to them and owns the module's single effect. The phase boundary is safe because the mount is still not referenced from `App.tsx` — it compiles and is tested, but the running app is unchanged until Phase 4.

### Task 10: Add `src/app/vanguard/ActionPalette.tsx` — AC2

- Skill: `game-ux`

**Files:**

- Create: `src/app/vanguard/ActionPalette.tsx`

- [ ] **Step 1: Write the component**

Per `ActionPaletteProps`. Three `<button type="button">` controls, one per `VanguardActionKind`, named from `ACTION_NAME` with `ACTION_DESCRIPTION` as a `<small>` sub-label so the cost is on the face of the control and never hover-only.

- `aria-pressed` reflects `selected === kind` — the armed state must read for a screen reader, not only as a brass fill.
- `disabled` when `!interactive || !enabled[kind]`. `enabled` comes from the mount, which computes it as "this action has at least one legal target"; the palette itself decides nothing.
- The hint line above the actions is the `hint` prop in an `aria-live="polite"` region with `data-reject` set, so a rejection is announced as well as coloured.
- Every control clears 44px.
- The group is a `<div role="group" aria-label="Clash actions">`. Three controls is under `game-ux`'s "about five", so no roving tabindex here — three natural tab stops is correct.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 11: Add `src/app/vanguard/ClashOverPanel.tsx`

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/ClashOverPanel.tsx`

- [ ] **Step 1: Write the component**

Per `ClashOverPanelProps`. Two renderings off `outcome.kind`, copy transcribed from the mockup:

- `'breached'` — names the winner via `SIDE_NAME` and offers a **"Finish"** button. This is what calls `onComplete`, from a click handler rather than an effect, so it cannot double-fire on a second mount.
- `'roundOver'` — states that both sides spent their Muster with no Breach and the board carries over, and offers **"Next round"**. This is the "resolved, not broken" reading `concept-critique.md` asks for; SCRUM-30 owns the fuller messaging.

A plain `<button type="button" onClick>` with no manual key handler — `Enter`/`Space` activate natively, and `war-council-ui.md` records that pairing a native button with a manual handler is the shape that risks a double dispatch.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 12: Add `src/app/vanguard/VanguardMatch.tsx` — AC2, AC3

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/VanguardMatch.tsx`
- Test: `src/app/vanguard/__tests__/VanguardMatch.test.tsx`

- [ ] **Step 1: Write the mount**

Implements `VanguardMountProps`. One `useReducer(matchReducer, initialState, createMatchUiState)` and one effect — nothing else holds state.

The effect, following `VanguardStub`'s shape exactly:

```tsx
useEffect(() => {
  if (ui.clash !== null) return
  let cancelled = false

  requestTricksWon(ui.round)
    .then((tricks) => {
      if (cancelled) return
      dispatch({ kind: MatchActionKind.MusterReady, tricks })
    })
    .catch((error: unknown) => {
      if (cancelled) return
      dispatch({
        kind: MatchActionKind.RequestFailed,
        message: error instanceof Error ? error.message : String(error),
      })
    })

  return () => {
    cancelled = true
  }
  // eslint-disable-next-line -- DO NOT ADD. The deps below are exhaustive; if the
  // linter complains, fix the dependency rather than suppressing it.
}, [ui.clash, ui.round, requestTricksWon])
```

Three things about it that are load-bearing:

- **The `.catch` is new relative to the stub.** `app.md` → *Deferred* records the stub's unhandled rejection as a real implementation's decision, and `react-frontend` requires all four async states. A rejected request becomes visible fault state, never a silent "Requesting…" forever.
- **`dispatch` is called only inside the async callbacks**, never synchronously in the effect body — a synchronous `setState` there fails this project's `react-hooks/set-state-in-effect` rule. The reducer's `MusterReady` no-ops when `clash !== null`, so a late duplicate resolution cannot restart a clash in progress.
- **The `cancelled` flag is the only resource** — no listener, timer, observer, or `AbortController` — so cleanup is complete by construction, and StrictMode's development double-invocation cannot dispatch twice.

Render, per the shell in `vanguard.css`:

- **The board renders unconditionally in the `1fr` row — this is AC3.** There must be no branch anywhere in this component that replaces `VanguardBoardView` with a loading state, a panel, or a fault message. The panels and the alert are overlays inside `.vg-shell`, positioned by CSS; the board is always behind them.
- `legalTargets` is `ui.selectedAction && playerTurn ? legalTargetsFor(board, PlayerSide.Player, ui.selectedAction, muster) : new Set()`.
- `enabled` for the palette is each kind's `legalTargetsFor(...).size > 0`.
- The hint cascade mirrors the mockup: a rejection's `REJECTION_MESSAGE` wins, then the armed action's "Choose a target for X", then whose turn it is, then the awaiting-War-Council line while `clash === null`.
- `ui.fault` renders a `role="alert"` naming the fault and **blocks further play** rather than retrying — it is an engine or host bug and must look like one, per `war-council-ui.md`'s precedent.
- `ClashOverPanel` renders on `status === Breached` (→ `onComplete`) or `status === Complete` (→ `NextRound`).

- [ ] **Step 2: Write the component test — AC2, AC3, AC4**

This is the spec AC4 names. Two constraints confirmed during planning, both already applied below:

- **`@testing-library/user-event` is not a devDependency.** Use `fireEvent` from `@testing-library/react`. Do not add the package — a new dependency needs developer approval and this contract has none.
- **The 9–4 trick split, not 10–3.** `tricksToPoints` returns 0 for 10+ tricks, so a 10–3 split hands the bonus to the CPU. 9–4 gives the player 6 points against 1 and a Muster of 10, which is what the multi-action assertions need.

`requestTricksWon` is a module-level constant per test, honouring the contract's referential-stability requirement — an inline arrow would re-fire the effect on every render and issue unbounded duplicate requests. `act` wraps the promise flush so React applies the dispatch before assertions run.

```tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import VanguardMatch from '../VanguardMatch'
import { makeBoard } from './boardFixture'

afterEach(cleanup)

// 9 tricks (6 points) beats 4 tricks (1 point), so the player takes the bonus.
const winningSplit = { [PlayerSide.Player]: 9, [PlayerSide.Cpu]: 4 }
const resolveTricks = () => Promise.resolve(winningSplit)
const neverResolves = () => new Promise<never>(() => {})

const cell = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
const clashStarted = () => waitFor(() => expect(screen.getByRole('button', { name: /Expand/ })).toBeDefined())

describe('VanguardMatch', () => {
  it('keeps the board on screen while the War Council result is outstanding — AC3', () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={neverResolves}
        onComplete={vi.fn()}
      />,
    )
    // The request never settles, so this is the War Council phase. The board must
    // still be fully rendered — no branch replaces it with a loading state.
    expect(cell('Cell 0, 0 — your base, your token')).toBeDefined()
    expect(cell('Cell 2, 2 — permanent defense')).toBeDefined()
  })

  it('submits a legal Expand to the engine — AC2', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    fireEvent.click(screen.getByRole('button', { name: /Expand/ }))

    // Any cell the engine offered. Arming Expand is what enables them, so an
    // enabled cell here is by definition one applyVanguardAction accepted.
    const target = screen
      .getAllByRole('button')
      .find(
        (b) => /^Cell /.test(b.getAttribute('aria-label') ?? '') && !(b as HTMLButtonElement).disabled,
      )
    expect(target).toBeDefined()
    const nameBefore = target!.getAttribute('aria-label')!
    fireEvent.click(target!)

    // The coordinate now holds the player's token, so its accessible name changed.
    await waitFor(() => expect(screen.queryByRole('button', { name: nameBefore })).toBeNull())
  })

  it('submits a legal Overwrite to the engine — AC2', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    fireEvent.click(screen.getByRole('button', { name: /Overwrite/ }))

    // {2,1} is the CPU token the fixture places adjacent to the player's network.
    const target = cell('Cell 2, 1 — their token')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)

    await waitFor(() => expect(cell('Cell 2, 1 — your token')).toBeDefined())
  })

  it('disables an illegal target so it cannot be submitted — AC2, AC4', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    fireEvent.click(screen.getByRole('button', { name: /Overwrite/ }))

    // A permanent defense cell is never an Overwrite target, in any position.
    const defense = cell('Cell 2, 2 — permanent defense')
    expect(defense.disabled).toBe(true)
    fireEvent.click(defense)
    // Nothing happened: the cell is unchanged and no rejection was raised,
    // because the action never reached the engine.
    expect(cell('Cell 2, 2 — permanent defense')).toBeDefined()
  })
})
```

**If the CPU's opening turns consume its whole Muster before the player acts**, `clashStarted` will still resolve but the player may face a `Complete` round rather than their turn. The fixture's 5×5 board with a Muster of 7 makes that unlikely, but if it happens, aim the fixture (give the CPU a smaller starting network) rather than weakening an assertion.

- [ ] **Step 3: Confirm the spec passes**

Run: `npx vitest run src/app/vanguard/__tests__/VanguardMatch.test.tsx; npm run typecheck`
Expected: Vitest reports 4 passed, 0 failed; typecheck exits 0. A `Timeout waiting for worker to respond` is the cold-cache jsdom flake — re-run before treating it as a failure.

- [ ] **Step 4: Confirm the mount holds exactly one effect and the file is within budget**

Run: `Select-String -Path src\app\vanguard\*.tsx,src\app\vanguard\*.ts -Pattern "useEffect|useLayoutEffect"; (Get-Content src\app\vanguard\VanguardMatch.tsx | Measure-Object -Line).Lines`
Expected: exactly **one** hit, in `VanguardMatch.tsx`. Line count reported and under 300. A second effect anywhere in the module means a transition that should have been a reducer action or a handler.

---

## Phase 4 — Test mode and reachability

The half that makes AC6 real and the screen reachable at all. `TrickEntryForm` and `TestModeVanguardHost` implement the Test-mode side of SCRUM-37's contract, then `App.tsx` gains the temporary control that lets a human get to it. The phase boundary is safe because it ends with the app running and every gate green — this is the first phase whose changes are visible in the browser.

### Task 13: Add `src/app/vanguard/TrickEntryForm.tsx` — AC6

- Skill: `game-ux`

**Files:**

- Create: `src/app/vanguard/TrickEntryForm.tsx`
- Test: `src/app/vanguard/__tests__/TrickEntryForm.test.tsx`

- [ ] **Step 1: Write the component**

Per `TrickEntryFormProps`. **One** number input, for the player's trick count; the opponent's is *derived* as `TRICKS_PER_ROUND - player` and displayed, never entered. This answers the open question `app.md` → *Deferred* poses for this ticket: it makes an impossible split nearly unrepresentable in the first place rather than relying on `isValidTricksWon` as the primary defence. That validator stays in the reducer as the backstop, unchanged.

- The input is a real `<label>`-associated `<input type="number" min="0" max="13" step="1">`, so it is queryable by `getByLabelText`.
- The derived line updates on every input and states the invalid case in words when the entry is not a whole number in range — "Enter a whole number from 0 to 13" — rather than silently clamping.
- Submit is disabled, or refuses, while the entry is invalid. It calls `onSubmit({ player, cpu: TRICKS_PER_ROUND - player })`.
- `TRICKS_PER_ROUND` is imported from `src/app/tricksWon.ts`. **Never write `13` as a literal in this file.**
- Copy is transcribed from the mockup, including the note that this runs the same `scoreRound` → `convertScoreToMuster` pipeline a real round takes.

- [ ] **Step 2: Write the component test**

```tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import TrickEntryForm from '../TrickEntryForm'

afterEach(cleanup)

describe('TrickEntryForm — AC6', () => {
  it('derives the opponent’s count instead of asking for it', () => {
    render(<TrickEntryForm round={1} onSubmit={vi.fn()} />)
    const input = screen.getByLabelText(/tricks you won/i)
    fireEvent.change(input, { target: { value: '9' } })
    expect(screen.getByText(/they won 4/i)).toBeDefined()
    // There is exactly one number input — the opponent's count is not enterable.
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
  })

  it('submits a split that always sums to a full round', () => {
    const onSubmit = vi.fn()
    render(<TrickEntryForm round={1} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/tricks you won/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /convert to muster/i }))
    expect(onSubmit).toHaveBeenCalledWith({ [PlayerSide.Player]: 3, [PlayerSide.Cpu]: 10 })
  })

  it('refuses an out-of-range entry rather than clamping it', () => {
    const onSubmit = vi.fn()
    render(<TrickEntryForm round={1} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/tricks you won/i), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: /convert to muster/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/whole number from 0 to 13/i)).toBeDefined()
  })
})
```

- [ ] **Step 3: Confirm the spec passes**

Run: `npx vitest run src/app/vanguard/__tests__/TrickEntryForm.test.tsx; npm run typecheck`
Expected: Vitest reports 3 passed, 0 failed; typecheck exits 0.

### Task 14: Add `src/app/vanguard/TestModeVanguardHost.tsx` — AC6

- Skill: `react-frontend`

**Files:**

- Create: `src/app/vanguard/TestModeVanguardHost.tsx`

- [ ] **Step 1: Write the host**

This is where AC6's "Test-mode only" becomes **structural** rather than a runtime check: the form lives here, and Campaign's host (SCRUM-34) simply never renders it. The mount stays mode-blind, per SCRUM-37's central design idea that "Vanguard itself never knows which mode it is in".

Requirements:

- Builds the board once with `useState<VanguardState>(() => createVanguardBoard())`. `createVanguardBoard` is deterministic — no `rng` parameter — so StrictMode's double-invocation recomputes an identical board and nothing is wasted.
- Holds the pending request's `resolve` in a `useRef`, keyed by round, and exposes `requestTricksWon` via **`useCallback` with an empty dependency array**. This is not speculative memoisation: `vanguardMount.ts:11` documents that an unstable identity re-fires the mount's effect and issues unbounded duplicate in-flight requests. Note the justification in the change summary.
- **A repeat request for the same round overwrites the stored resolver rather than queueing.** StrictMode calls the effect twice in development, and without this the first promise is orphaned forever.
- Renders `<VanguardMatch initialState={board} requestTricksWon={requestTricksWon} onComplete={...} />` and, whenever a request is pending, `<TrickEntryForm round={pendingRound} onSubmit={...} />` **as a sibling overlay anchored to the screen edge, not a full-screen curtain** — the board must stay visible behind it (AC3). `onSubmit` resolves the stored promise and clears the pending state.
- `onComplete` renders a plain match-over summary naming the winner. This host is developer scaffolding, not a designed screen.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `react-hooks/exhaustive-deps` must be silent — if it complains about the `useCallback`, fix the dependency rather than suppressing it.

### Task 15: Wire Test mode into `src/App.tsx` and delete the stub

- Skill: `react-frontend`

**Files:**

- Modify: `src/App.tsx:14-38`
- Modify: `src/app/vanguardMount.ts:11`
- Delete: `src/app/stubs/VanguardStub.tsx` (and the now-empty `src/app/stubs/` folder)

- [ ] **Step 1: Re-destructure `setMode` and add the temporary mode control**

`.docs/implementation/app.md` anticipates exactly this: "the menu ticket re-destructures both when it needs the setter". Without it Test mode is unreachable, AC6 is unverifiable, and this whole screen is as invisible in the running app as `VanguardStub` is today.

Change `const [mode] = useState<AppMode>(AppMode.Campaign)` to `const [mode, setMode] = useState<AppMode>(AppMode.Campaign)`, and add a small control that switches to `AppMode.Test`, which renders `TestModeVanguardHost` instead of the War Council dev host. Import the host by path (`./app/vanguard/TestModeVanguardHost`) — `src/app/index.ts` deliberately excludes components.

Keep the existing `'./app/index'` import specifier exactly as it is: `app.md` records that the bare `'./app'` fails to compile on this case-insensitive Windows checkout (`TS2614`/`TS1149`) because it resolves against the sibling `App.tsx` first.

Extend the existing comment so the next reader knows this is scaffolding:

```tsx
/**
 * Minimal dev host. Deals one War Council round and mounts the real UI, and now
 * also offers a Test-mode switch that mounts the standalone Vanguard. Both are
 * temporary: SCRUM-34 owns real battle-loop orchestration and should delete this
 * host rather than extend it.
 */
```

- [ ] **Step 2: Delete `VanguardStub.tsx` and correct the comment that names it**

The audit found `VanguardStub` is imported by no file and is deliberately absent from `src/app/index.ts` — deleting it breaks nothing. Remove `src/app/stubs/VanguardStub.tsx` and then the empty `src/app/stubs/` folder.

In `src/app/vanguardMount.ts:11`, the referential-stability comment names the stub as the consuming mount. Replace `the consuming mount (VanguardStub) calls` with `the consuming mount (VanguardMatch) calls` — the requirement is unchanged, only the file it points at.

- [ ] **Step 3: Confirm the stub is gone and nothing references it**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "VanguardStub"; Get-ChildItem src\app\stubs -ErrorAction SilentlyContinue`
Expected: zero `Select-String` hits and no directory listing — both the file and the folder are gone.

- [ ] **Step 4: Typecheck, lint, and confirm the suite still collects**

Run: `npm run typecheck; npm run lint; npx vitest run --project node`
Expected: both gates exit 0. The `node` project reports **at least 41 files and 306 tests** — the 37/292 baseline plus Phase 1's four new specs. A lower file count means a spec stopped being collected; stop and fix that rather than continuing.

---

## Phase 5 — Implementation docs

No production code. `.docs/implementation/` is maintained per its own skill, and this module is large enough to warrant its own file rather than a section inside `app.md` — the same call `war-council-ui.md` records for `src/app/warCouncil/`.

### Task 16: Document the module

- Skill: `implementation-doc-writer`

**Files:**

- Create: `.docs/implementation/vanguard-ui.md`
- Modify: `.docs/implementation/app.md`
- Modify: `.docs/implementation/README.md:15-25`

- [ ] **Step 1: Write `.docs/implementation/vanguard-ui.md`**

Invoke the `implementation-doc-writer` skill and follow its structure — the same shape `war-council-ui.md` uses: Responsibility, Key types & exports (a table), How it works, Rules & invariants enforced, Deferred / not yet implemented. Header: `**Status:** implemented`, `**Built by:** SCRUM-29`.

The things that will be expensive to rediscover, and so must be written down:

- **`hexPlacement` flips the `r` axis, and that is the whole of the board's orientation** — player base bottom-left, CPU top-right, rhombus leaning left-to-right. It is the single point where axial space becomes screen space, so re-orienting is one line. Record that this was the developer's instruction at SCRUM-29's approval gate.
- **`legalTargets.ts` asks the engine rather than deciding** — the dry-run pattern, its `board.size²` bound, and why that is not a re-implementation of legality.
- **The module's single `try`/`catch`**, why `chooseCpuClashAction`'s dead-end throw cannot be guarded the way `roundReducer` guards `chooseCpuMove`, and that the fault blocks play deliberately.
- **The CPU-advance loop and its termination argument** (bounded by `muster[cpu]`, breaks on rejection).
- **The single effect**, its `cancelled` flag, and why `dispatch` never runs synchronously in the effect body.
- **AC3 is structural** — the board occupies the shell's `1fr` row unconditionally and no branch can replace it.
- **AC6 is structural too** — the form is in the host, the mount is mode-blind.
- **The `data-cell` attribute is a string-bound invariant** shared between `useHexRovingFocus` and `HexCell`.
- **`ArrowUp` increases `r`** because of the flip.
- Every developer tuning value still outstanding, copied from this file's *Developer decides or observes*.

- [ ] **Step 2: Update `app.md` — append, never replace**

Per the `implementation-doc-writer` skill, append so SCRUM-37's and SCRUM-28's contributions survive. Specifically:

- *Responsibility* — the Vanguard half of the contract now has a real UI; point at `vanguard-ui.md` the way it already points at `war-council-ui.md`.
- *The two stubs, then one* — becomes none. Record that `VanguardStub.tsx` was replaced wholesale by `VanguardMatch.tsx` and that `stubs/` is gone.
- *Deferred* — remove the three entries this ticket satisfies: "The Vanguard half of the contract still has no real UI", "No visual form for manual trick entry" (and note that its open question was answered by deriving the opponent's count), and the `VanguardStub`-specific unhandled-rejection entry (`VanguardMatch` has a `.catch`). Leave "No battle-loop wiring" and the `TRICKS_PER_ROUND` duplication entry — both are still true.
- *`AppMode` and the `App.tsx` mode slot* — `setMode` is now destructured and there is a temporary Test-mode control. Correct the note that says nothing changes the mode.

- [ ] **Step 3: Update the README index**

Add a row to the table at `.docs/implementation/README.md:15-25`, matching the existing column formatting:

```
| `src/app/vanguard/`   | [vanguard-ui.md](vanguard-ui.md)       | implemented | SCRUM-29                                                   |
```

Also update the paragraph below the table — it currently explains only why `src/app/warCouncil/` has its own doc, and says `app.md` keeps "the remaining Vanguard stub", which is no longer true.

- [ ] **Step 4: Confirm the docs are within budget and formatted**

Run: `(Get-Content .docs\implementation\vanguard-ui.md | Measure-Object -Line).Lines; (Get-Content .docs\implementation\app.md | Measure-Object -Line).Lines; npx prettier --check .docs/implementation/vanguard-ui.md .docs/implementation/app.md .docs/implementation/README.md`
Expected: both line counts reported and under 400; `prettier --check` exits 0. If `app.md` has grown past 400, the `implementation-doc-writer` skill owns whether and how to split it — not this task.

---

## Phase 6 — Final verification

No production changes. Only checks that the cumulative work is clean, plus the browser verification no test can perform.

### Task 17: Confirm the purity boundary, the naming bindings, and the unit discipline

- Skill: `react-frontend`

**Files:** *(no file changes — verification only)*

- [ ] **Step 1: Confirm the four pure modules import no React and touch no DOM global**

Run: `Select-String -Path src\app\vanguard\hexLayout.ts,src\app\vanguard\labels.ts,src\app\vanguard\legalTargets.ts,src\app\vanguard\matchReducer.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("`
Expected: zero hits. This is what lets all four run in the cheap `node` Vitest project.

- [ ] **Step 2: Confirm no `vh`/`vw` unit and no colour literal escaped into a component**

Run: `Select-String -Path src\**\*.css,src\**\*.tsx,index.html -Pattern "\d(vh|vw)\b"; Select-String -Path src\app\vanguard\*.tsx -Pattern "#[0-9a-fA-F]{3,6}"`
Expected: zero hits for both. Every dimension is `dvh`, `%`, `rem`, or `vmin`; every colour belongs to `vanguard.css`'s token table.

- [ ] **Step 3: Confirm the `data-cell` binding matches on both sides**

Run: `Select-String -Path src\app\vanguard\HexCell.tsx,src\app\vanguard\useHexRovingFocus.ts -Pattern "data-cell"`
Expected: at least two hits — the attribute set in `HexCell.tsx` and the selector reading it in `useHexRovingFocus.ts`. A mismatch silently stops arrow-key navigation with no error and no failing test.

- [ ] **Step 4: Confirm no tunable was hard-coded and no `data-testid` was introduced**

Run: `Select-String -Path src\app\vanguard\*.ts,src\app\vanguard\*.tsx -Pattern "\b(13|11)\b|data-testid"`
Expected: no `data-testid` hits at all. Any `13` must be `TRICKS_PER_ROUND`'s import site, never a literal — `Number('13')` in a test fixture is fine, a `13` in `TrickEntryForm.tsx` is a defect. Any `11` must not be a board dimension; the layout reads `board.size`.

- [ ] **Step 5: Measure every file this contract created**

Run: `Get-ChildItem src\app\vanguard -Recurse -Include *.ts,*.tsx,*.css | ForEach-Object { "{0}: {1}" -f $_.Name, (Get-Content $_.FullName | Measure-Object -Line).Lines }`
Expected: every file reported and **under 400 lines**. Over 400 is blocking — split it in this pass, per `react-frontend`'s hard floor.

### Task 18: Static gates and the full suite

- Skill: `react-frontend`

**Files:** *(no file changes — verification only)*

- [ ] **Step 1: Run the two Vitest projects separately first**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. `node` reports **at least 41 files / 306 tests**; `dom` reports **at least 7 files / 33 tests** (the 3/22 baseline plus this contract's four new `.test.tsx` files). Running them separately first is deliberate: a cold combined run has been observed failing with `[vitest-pool-runner]: Timeout waiting for worker to respond` on the jsdom files — a worker-*start* timeout, not a test failure. See `plan.md` → Risks.

- [ ] **Step 2: Typecheck, lint, formatting, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0. Vitest reports 0 failed with **at least 48 files and 339 tests** across both projects, against the 40/314 baseline. If `npm test` reports a worker-start timeout, re-run it once — the transform cache is warm after Step 1, and a warm run has been measured at 1.70s. Treat a *second* consecutive timeout as a real problem worth reporting, not a flake.

Run `npm run format:check` separately and report it: it currently fails on pre-existing out-of-scope files across `.docs/**`, `src/battle/**` and `src/vanguard/**`. Only this contract's own files must pass — check them with `npx prettier --check src/app/vanguard/**/* src/App.tsx .docs/implementation/vanguard-ui.md`.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `lint` first, so a lint failure surfaces here as a build failure.

### Task 19: Browser verification — the checks no test can make

- Skill: `game-ux`

**Files:** *(no file changes — verification only)*

QA owns this task. jsdom has no layout engine, so nothing in the suite can detect a screen that scrolls, crops, or overflows — and every check below has a right answer, which is what makes it QA's rather than a developer observation. Start the dev server **detached** on the deterministic port per `.claude/workflow/web-project.md`, checking first whether one is already listening; never run `npm run dev` in the foreground.

- [ ] **Step 1: Confirm the shell never scrolls, at three viewport sizes**

At a short laptop window (about 1280×720), a phone in portrait (about 390×844 — note the tooling floors window width at 500px on this machine, so report the width actually achieved), and the same phone in landscape (about 844×390):

- Confirm `document.scrollingElement.scrollHeight <= window.innerHeight` and the same for width. **The document must not scroll at any of the three.**
- Confirm the whole board is visible — no cell clipped at any edge — along with the status band and all three action buttons.
- Confirm the console is clean: no errors, no warnings, no React key or `set-state-in-effect` complaints.

Report the three sizes and the measured values. Landscape is the hardest case: a 16:8.65 rhombus in a `1fr` row between two `auto` bands is where the board will be squeezed first.

- [ ] **Step 2: Confirm the board's orientation is what the developer asked for**

The single most reversible-looking detail in this contract, and the one a test can only assert in fractions:

- The **purple** player base is at the **bottom-left** of the board — visibly the lowest *and* the leftmost cell.
- The **green** CPU base is at the **top-right**.
- Rows shift right as they climb, so the rhombus leans left-to-right.

- [ ] **Step 3: Play a Clash turn through and confirm the functional behaviour**

Reach the board via the Test-mode control in the app shell.

- Enter a trick count in the Test-mode form; confirm the opponent's count is derived, not enterable, and that the **board is visible behind the form** while it is open (AC3).
- Submit it and confirm the Clash opens with the CPU having already moved (round 1's opener is the CPU).
- Select Expand; confirm legal cells take the brass ring and every other cell is inert.
- Tap a legal cell; confirm a purple token lands and the palette stays armed.
- Select Overwrite and confirm only adjacent enemy tokens are offered.
- Confirm a reinforced token is distinguishable from an unreinforced one **in a greyscale screenshot** — colour alone must not carry it.
- Tab into the board once and cross it with the arrow keys: confirm **one** tab stop rather than 121, that `ArrowUp` moves focus **up** the screen, that the focus ring is visible on a hexagonal cell, and that `Escape` clears the selection.
- Play until a round ends and confirm the round-over panel reads as resolved rather than broken, and that "Next round" re-opens the trick-entry form.

Expected: every behaviour as described, console clean throughout.

### Task 20: Write the PR description

- Skill: `none — a hand-off document, no code`

**Files:**

- Create: `.claude/contract/SCRUM-29-vanguard-ui/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` for the developer to paste**

Include:

- Links to `plan.md` and `mockup.html` in this folder, naming the mockup as the approved specification.
- A summary: the new `src/app/vanguard/` module, the full-viewport shell, action-then-target selection, legality by engine dry-run, the Test-mode host and trick-entry form, the `App.tsx` mode control, and the deleted stub.
- **An explicit statement that no dependency was added** — runtime or dev. This contract adds none.
- Verification results: the real `typecheck` / `lint` / `npm test` / `build` outcomes with actual test counts against the 40/314 baseline, and QA's three viewport sizes with measured scroll values.
- Every decision the developer must make and every behaviour they must judge by playing, copied from the File map's *Developer decides or observes*.
- New conventions introduced, for future contributors: the `vg-` CSS token and class prefix; that `hexPlacement` is the single point of board orientation; that `legalTargets.ts` asks the engine rather than deciding; and the `data-cell` string binding between `HexCell` and `useHexRovingFocus`.
- Known debt carried deliberately: the module's single `try`/`catch` around `chooseCpuClashAction`'s dead-end throw and the underlying stalemate gap it papers over; the `cpuRejected` branch being defensive and untested because it is unreachable through today's engine; `useHexRovingFocus` near-duplicating `src/app/warCouncil/useRovingTabIndex`; the two match loops now existing (this mount's and `src/battle/`'s) for SCRUM-34 to reconcile; the cold-cache `npm test` worker-timeout flake; and that no automated test covers the no-scroll layout.

---

## Self-review

**Spec coverage:**

- AC1 — the rhombus with bases, tokens by owner colour, defense cells, reinforced state — Tasks 6, 8, 9 (test), 19 Step 2.
- AC2 — action then target, submitted to the engine, rejected/disabled if illegal, no re-implemented legality — Tasks 4, 5, 10, 12 (tests), 19 Step 3.
- AC3 — the board stays visible during the War Council phase — Tasks 12 (Step 1 render rule, Step 2 test), 14, 19 Step 3.
- AC4 — component tests by role/label covering legal Expand, legal Overwrite, and a rejected/disabled illegal target — Tasks 2, 9 Step 2, 12 Step 2.
- AC5 — functional-default visuals, not blocked on art — Task 6 (transcribed from the mockup; no art asset anywhere in the contract).
- AC6 — Test-mode-only manual score entry, reachable each round, through the Muster conversion — Tasks 13, 14, 15, 19 Step 3.
- Board orientation (developer instruction at the gate) — Tasks 1 (spec + implementation), 7 (arrow mapping), 19 Step 2.
- In-scope bullet "deletion of `VanguardStub.tsx`" — Task 15.
- In-scope bullet "implementation docs" — Task 16.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact change, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `hexBoardMetrics`, `hexPlacement`, `HexPlacement`, `HexBoardMetrics`, `cellAccessibleName`, `ACTION_NAME`, `ACTION_DESCRIPTION`, `SIDE_NAME`, `REJECTION_MESSAGE`, `legalTargetsFor`, `matchReducer`, `createMatchUiState`, `MatchUiState`, `MatchUiAction`, `MatchActionKind`, `MatchFault`, `MatchRejection`, `useHexRovingFocus`, `HexCell`, `VanguardBoardView`, `ActionPalette`, `ClashOverPanel`, `VanguardMatch`, `TrickEntryForm`, `TestModeVanguardHost`, and the `vg-` / `--vg-` prefix are each used identically in every task that names them, and each matches `plan.md` Part 2 → Data shapes. The `data-cell` attribute name is used identically in Tasks 7, 8 and 17. No configuration key is added or renamed anywhere in this contract.

**Phase boundary cleanliness:**

- **Phase 1** ends with four pure modules and a fixture compiled and tested in the `node` project; nothing imports them yet and `App.tsx` is untouched, so the running app is byte-for-byte unchanged.
- **Phase 2** ends with the stylesheet, the hook, and two components compiling and one component spec green; nothing mounts them, so the app is still unchanged.
- **Phase 3** ends with the mount compiling and fully specced, still unreferenced from `App.tsx` — the last phase whose changes are invisible in the browser.
- **Phase 4** is the first phase visible in the app: it adds the Test-mode path, deletes the stub, and fixes the one comment that named it in the same task, so no dangling reference survives the boundary. Task 15 Step 4 re-runs the `node` project to prove no spec stopped being collected.
- **Phase 5** touches only `.docs/`, so the code state is identical to Phase 4's.
- **Phase 6** makes no production change at all.
