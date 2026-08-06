# Tasks: Vanguard targeting-and-layout fixes (SCRUM-40, SCRUM-41, SCRUM-42)

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-06

**Goal:** Broaden Expand/Overwrite legality to key off any owned cell (SCRUM-40), let a player tap
any highlighted board cell directly with the action inferred from its occupancy (SCRUM-41), and
move both Vanguard bases to the horizontal center of their own edge row with a geometry-derived
starting cluster (SCRUM-42).

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files, all changes are to existing modules)

**Modified:**
- `src/vanguard/network.ts` — add `ownedCells`
- `src/vanguard/expand.ts` — key off `ownedCells` instead of `connectedNetwork`
- `src/vanguard/overwrite.ts` — key off `ownedCells` instead of `connectedNetwork`
- `src/vanguard/cpuPlayer.ts` — candidate generation/tiering keyed off `ownedCells`
- `src/vanguard/index.ts` — barrel: add `ownedCells`, remove `STARTING_CLUSTER_SIZE`
- `src/vanguard/config.ts` — remove `STARTING_CLUSTER_SIZE`
- `src/vanguard/createBoard.ts` — new base coordinates + cluster construction
- `src/app/vanguard/legalTargets.ts` — add `inferActionKind`, `allLegalTargets`
- `src/app/vanguard/matchReducer.ts` — remove `selectedAction`/`SelectAction`, rename
  `CancelSelection` → `ClearRejection`, rewrite `handleTapCell`
- `src/app/vanguard/ActionPalette.tsx` — non-interactive legend, no `onSelect`/`selected`
- `src/app/vanguard/vanguard.css` — `.vg-actions`/`.vg-action` rules for the new markup
- `src/app/vanguard/VanguardMatch.tsx` — wire `allLegalTargets`, updated hint, updated dispatch
- `.docs/design/skirmish-board-replacement.md` — Expand/Overwrite legality text, base-placement text
- `.docs/implementation/vanguard.md` — refresh (via `implementation-doc-writer`)
- `.docs/implementation/vanguard-ui.md` — refresh (via `implementation-doc-writer`)

**Deleted:** (none)

**Developer decides or observes:**
- Whether `ActionPalette` should stay a read-only legend or be removed entirely (plan's default,
  approved at the mockup gate — flag if the running app changes your mind).
- Whether the single shared brass-ring highlight (rather than a colour per inferred action) reads
  clearly enough with several cells lit up at once.
- Whether inferring `Expand` for a tapped defense cell (surfacing `CellIsDefense`) feels like the
  right rejection.
- QA: confirm in a real browser that the board highlight appears immediately once it's the
  player's turn (no arming tap needed), that a tap commits directly, that the legend dims a kind
  with no legal target, and that both bases render at their row's horizontal center per the
  mockup — at at least one desktop and one narrow-viewport size.

---

## Phase 1 — SCRUM-40: Expand and Overwrite key off any owned cell

This phase only touches `src/vanguard/`'s pure engine modules and their tests. It ends
type-checking, with `expand.ts`/`overwrite.ts`/`cpuPlayer.ts` all reading the same new
`ownedCells` reference set and `breach.ts` untouched — a safe stopping point because nothing
outside `src/vanguard/` depends on this phase's internals yet (Phase 3's UI layer only ever calls
the already-generic `applyVanguardAction`/`legalTargetsFor`).

### Task 1: Add `ownedCells` to `src/vanguard/network.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/network.ts`, `src/vanguard/index.ts:33`
- Test: `src/vanguard/__tests__/network.test.ts`

- [x] **Step 1: Write the failing tests for `ownedCells`**

Append to `src/vanguard/__tests__/network.test.ts`, and change its import line
`import { connectedNetwork, minDistanceToNetwork } from '../network'` to
`import { connectedNetwork, minDistanceToNetwork, ownedCells } from '../network'`:

```ts
describe('ownedCells', () => {
  it('includes every token the side owns, chain-connected or not', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '3,3': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(new Set(ownedCells(board, PlayerSide.Player).map(cellKey))).toEqual(
      new Set(['0,0', '3,3']),
    )
  })

  it('excludes enemy tokens and defense cells', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '0,1': { kind: VanguardCellKind.Defense },
    })
    expect(ownedCells(board, PlayerSide.Player)).toEqual([{ q: 0, r: 0 }])
  })
})
```

Run: `npx vitest run src/vanguard/__tests__/network.test.ts`
Expected: fails — `ownedCells` is not exported yet.

- [x] **Step 2: Implement `ownedCells`**

In `src/vanguard/network.ts`, change the import line
`import { cellKey, hexBfs, hexDistance } from './hexGrid'` to
`import { allBoardCoords, cellKey, hexBfs, hexDistance } from './hexGrid'`, then add, after
`connectedNetwork`:

```ts
// Every cell `side` currently owns, regardless of whether it's chain-connected
// to the base — SCRUM-40's reference set for Expand and Overwrite legality.
// connectedNetwork stays the Breach's own, narrower reference set (breach.ts
// is unchanged) — this is a deliberately separate, broader query.
export function ownedCells(board: VanguardBoard, side: PlayerSide): readonly HexCoord[] {
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side
  })
}
```

- [x] **Step 3: Export `ownedCells` from the barrel**

In `src/vanguard/index.ts:33`, change
`export { connectedNetwork, minDistanceToNetwork } from './network'` to
`export { connectedNetwork, minDistanceToNetwork, ownedCells } from './network'`.

- [x] **Step 4: Verify**

Run: `npx vitest run src/vanguard/__tests__/network.test.ts; npm run typecheck`
Expected: all tests pass (existing `connectedNetwork`/`minDistanceToNetwork` tests plus the two new
`ownedCells` tests); typecheck exits 0.

### Task 2: `applyExpand` keys off `ownedCells` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/expand.ts`
- Test: `src/vanguard/__tests__/expand.test.ts`

- [x] **Step 1: Write the failing test for a gapped, disconnected owned cell**

Append to `src/vanguard/__tests__/expand.test.ts`:

```ts
it('is legal within EXPAND_RANGE of an owned cell that is not chain-connected to the base — SCRUM-40', () => {
  const board = boardWith({
    '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 }, // base
    '3,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 }, // gapped island
  })
  // (4,0) is distance 4 from the base alone (the old connectedNetwork-only
  // rule would reject it) but distance 1 from the gapped island — legal only
  // because the reference set is now every owned cell.
  const result = applyExpand(board, PlayerSide.Player, { q: 4, r: 0 })
  expect(result.ok).toBe(true)
})
```

Run: `npx vitest run src/vanguard/__tests__/expand.test.ts`
Expected: the new test fails with `OutOfExpandRange` (still keyed off `connectedNetwork`); the
existing tests keep passing.

- [x] **Step 2: Swap the reference set in `applyExpand`**

In `src/vanguard/expand.ts:4`, change
`import { connectedNetwork, minDistanceToNetwork } from './network'` to
`import { minDistanceToNetwork, ownedCells } from './network'`. Then change lines 25-26 from:

```ts
  const network = connectedNetwork(board, side)
  if (minDistanceToNetwork(target, network) > EXPAND_RANGE) {
```

to:

```ts
  const owned = ownedCells(board, side)
  if (minDistanceToNetwork(target, owned) > EXPAND_RANGE) {
```

- [x] **Step 3: Verify**

Run: `npx vitest run src/vanguard/__tests__/expand.test.ts; npm run typecheck`
Expected: all tests pass, including the new gapped-cell test; typecheck exits 0.

### Task 3: `applyOverwrite` keys off `ownedCells` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/overwrite.ts`
- Test: `src/vanguard/__tests__/overwrite.test.ts`

- [x] **Step 1: Write the failing test for a gapped, disconnected owned cell**

Append to `src/vanguard/__tests__/overwrite.test.ts`:

```ts
it('is legal adjacent to an owned cell that is not chain-connected to the base — SCRUM-40', () => {
  const board = boardWith({
    '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 }, // base
    '3,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 }, // gapped island
    '4,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 }, // adjacent only to the island
  })
  // (4,0) is distance 4 from the base alone (the old rule would reject it as
  // NotAdjacentToNetwork) but distance 1 from the gapped island.
  const result = applyOverwrite(board, PlayerSide.Player, { q: 4, r: 0 })
  expect(result.ok).toBe(true)
})
```

Run: `npx vitest run src/vanguard/__tests__/overwrite.test.ts`
Expected: the new test fails with `NotAdjacentToNetwork`; the existing tests keep passing.

- [x] **Step 2: Swap the reference set in `applyOverwrite`**

In `src/vanguard/overwrite.ts:4`, change
`import { connectedNetwork, minDistanceToNetwork } from './network'` to
`import { minDistanceToNetwork, ownedCells } from './network'`. Then change lines 30-31 from:

```ts
  const network = connectedNetwork(board, side)
  if (minDistanceToNetwork(target, network) > 1) {
```

to:

```ts
  const owned = ownedCells(board, side)
  if (minDistanceToNetwork(target, owned) > 1) {
```

- [x] **Step 3: Verify**

Run: `npx vitest run src/vanguard/__tests__/overwrite.test.ts; npm run typecheck`
Expected: all tests pass, including the new gapped-cell test; typecheck exits 0.

### Task 4: `chooseCpuClashAction` candidate generation keys off `ownedCells` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/cpuPlayer.ts`
- Test: `src/vanguard/__tests__/cpuPlayer.test.ts`

- [x] **Step 1: Write the failing test for a gapped owned island**

In `src/vanguard/__tests__/cpuPlayer.test.ts`, add to the imports:
`import { hexDistance } from '../hexGrid'` and `import { EXPAND_RANGE } from '../config'`. Then
append:

```ts
describe('chooseCpuClashAction — SCRUM-40: candidates key off every owned cell, not just the connected chain', () => {
  it('expands from a gapped owned island the base-connected chain alone would miss', () => {
    const board: VanguardBoard = {
      size: 11,
      bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 10, r: 10 } },
      cells: {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '5,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      },
    }
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action.kind).toBe(VanguardActionKind.Expand)
    expect(hexDistance(action.target, { q: 5, r: 0 })).toBeLessThanOrEqual(EXPAND_RANGE)
  })
})
```

Run: `npx vitest run src/vanguard/__tests__/cpuPlayer.test.ts`
Expected: the new test fails — the heuristic currently only ranges from the base-connected chain,
so it cannot find a candidate near `(5,0)`.

- [x] **Step 2: Rewrite `src/vanguard/cpuPlayer.ts`, replacing `connectedNetwork` with `ownedCells` throughout**

Replace the whole file:

```ts
import { applyVanguardAction } from './applyVanguardAction'
import { EXPAND_RANGE, REINFORCE_COST, REINFORCE_MAX_STACK } from './config'
import { allBoardCoords, cellKey, hexDistance } from './hexGrid'
import { minDistanceToNetwork, ownedCells } from './network'
import { overwriteCostFor } from './overwrite'
import { VanguardActionKind, VanguardCellKind } from './types'
import type { HexCoord, VanguardAction, VanguardBoard } from './types'
import { otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'

function byCellKey(a: HexCoord, b: HexCoord): number {
  return cellKey(a).localeCompare(cellKey(b))
}

// Empty cells within reach of any cell the acting side currently owns — the
// engine's own applyExpand check (SCRUM-40: every owned cell, not just the
// base-connected chain), reused rather than re-derived.
function expandCandidates(board: VanguardBoard, owned: readonly HexCoord[]): HexCoord[] {
  return allBoardCoords(board.size).filter(
    (coord) =>
      board.cells[cellKey(coord)] === undefined &&
      minDistanceToNetwork(coord, owned) <= EXPAND_RANGE,
  )
}

// Enemy-token cells adjacent to any cell the acting side currently owns that
// it can afford to overwrite with the Muster it has left this turn — the
// engine's own applyOverwrite adjacency check (SCRUM-40: every owned cell),
// reused rather than re-derived; the cost itself comes from overwrite.ts's
// own overwriteCostFor so the two never drift.
function overwriteCandidates(
  board: VanguardBoard,
  opponent: PlayerSide,
  owned: readonly HexCoord[],
  musterAvailable: number,
): HexCoord[] {
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    if (cell?.kind !== VanguardCellKind.Token || cell.owner !== opponent) return false
    if (minDistanceToNetwork(coord, owned) > 1) return false
    return overwriteCostFor(cell.reinforced) <= musterAvailable
  })
}

// The acting side's own unreinforced tokens that this side can afford to
// reinforce with the Muster it has left this turn.
function reinforceCandidates(
  board: VanguardBoard,
  side: PlayerSide,
  musterAvailable: number,
): HexCoord[] {
  if (REINFORCE_COST > musterAvailable) return []
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side && cell.reinforced < REINFORCE_MAX_STACK
  })
}

// Tier 1 = distance-1-from-any-owned-cell (contiguous; every Overwrite
// candidate qualifies by construction, since Overwrite itself requires
// adjacency). Tier 2 = distance-2 (an Expand gap-jump only). A gap doesn't
// count toward the Breach until it's filled in
// (skirmish-board-replacement.md -> "The Breach"), so a gap-jump is worth
// less than clearing an adjacent blocker even when it lands nominally closer
// to the opponent's base.
function candidateTier(target: HexCoord, owned: readonly HexCoord[]): number {
  return minDistanceToNetwork(target, owned) <= 1 ? 1 : 2
}

// Ranks Expand + Overwrite candidates by tier first (contiguous beats a
// gap-jump), then by resulting distance to the opponent's base within a
// tier — closest wins, cellKey breaks remaining ties. This is what makes
// "prefer Overwrite when it's blocking the shortest path" actually hold: a
// flat distance-only ranking would instead favor an Expand gap-jump past the
// blocker, since EXPAND_RANGE (2) always reaches one hex closer to a distant
// base than overwriting an adjacent blocker does (see plan.md Part 1 ->
// Assumptions made).
function rankedAdvanceCandidates(
  board: VanguardBoard,
  opponent: PlayerSide,
  owned: readonly HexCoord[],
  musterAvailable: number,
): VanguardAction[] {
  const opponentBase = board.bases[opponent]
  const expand = expandCandidates(board, owned).map(
    (target): VanguardAction => ({ kind: VanguardActionKind.Expand, target }),
  )
  const overwrite = overwriteCandidates(board, opponent, owned, musterAvailable).map(
    (target): VanguardAction => ({ kind: VanguardActionKind.Overwrite, target }),
  )
  return [...expand, ...overwrite].sort(
    (a, b) =>
      candidateTier(a.target, owned) - candidateTier(b.target, owned) ||
      hexDistance(a.target, opponentBase) - hexDistance(b.target, opponentBase) ||
      byCellKey(a.target, b.target),
  )
}

// Walks a ranked candidate list, dry-run-validating each through the engine's
// own applyVanguardAction, and returns the first one it confirms legal. Never
// trusts candidate generation alone — see plan.md Part 2 -> Approach.
function firstValidated(
  board: VanguardBoard,
  side: PlayerSide,
  candidates: readonly VanguardAction[],
): VanguardAction | undefined {
  for (const candidate of candidates) {
    if (applyVanguardAction(board, side, candidate).ok) return candidate
  }
  return undefined
}

export function chooseCpuClashAction(
  board: VanguardBoard,
  side: PlayerSide,
  musterAvailable: number,
): VanguardAction {
  const opponent = otherSide(side)
  const owned = ownedCells(board, side)

  const advance = firstValidated(
    board,
    side,
    rankedAdvanceCandidates(board, opponent, owned, musterAvailable),
  )
  if (advance) return advance

  const reinforce = firstValidated(
    board,
    side,
    reinforceCandidates(board, side, musterAvailable)
      .sort(byCellKey)
      .map((target): VanguardAction => ({ kind: VanguardActionKind.Reinforce, target })),
  )
  if (reinforce) return reinforce

  // Reachable whenever the acting side still has Muster but no candidate
  // validates — e.g. a locally boxed-in frontier with no empty cell within
  // EXPAND_RANGE, no unreinforced own token, and only enemy tokens priced
  // above the remaining Muster. A documented, accepted, unmodeled dead end
  // (see .docs/implementation/vanguard.md and
  // .docs/design/skirmish-board-replacement.md) — not board saturation only,
  // and not something this function handles; the caller has no recovery path.
  throw new Error(`chooseCpuClashAction: no legal action available for ${side}`)
}
```

- [x] **Step 3: Verify**

Run: `npx vitest run src/vanguard/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: all tests pass, including the new gapped-island test and the existing seeded
multi-round simulations (AC4); typecheck exits 0.

### Task 5: Update the Expand/Overwrite legality text in the design doc ✓

- Skill: game-designer

**Files:**
- Modify: `.docs/design/skirmish-board-replacement.md`

- [x] **Step 1: Update the Actions table's Expand and Overwrite rows**

In `.docs/design/skirmish-board-replacement.md`, change:

```
| **Expand**    | Place a token on an empty cell        | Within 2 hex-spaces of your existing connected network — a 1-cell gap is allowed | 1 move                                                                           |
| **Overwrite** | Replace an enemy token with your own  | Only on a cell **adjacent** (touching) to your existing network — no gap allowed | 2 moves (3 if the target is reinforced)                                          |
```

to:

```
| **Expand**    | Place a token on an empty cell        | Within 2 hex-spaces of any cell you own — a 1-cell gap is allowed                | 1 move                                                                           |
| **Overwrite** | Replace an enemy token with your own  | Only on a cell **adjacent** (touching) to any cell you own — no gap allowed      | 2 moves (3 if the target is reinforced)                                          |
```

- [x] **Step 2: Verify**

Run: `Select-String -Path .docs\design\skirmish-board-replacement.md -Pattern "your existing connected network"`
Expected: zero hits — both mentions replaced.

---

## Phase 2 — SCRUM-42: bases to row-center, cluster = base + touching hexes

This phase only touches `src/vanguard/createBoard.ts`/`config.ts`/`index.ts` and the tests that
assert board construction, plus one stale UI-layer geometry test. It ends type-checking, with the
whole `src/vanguard/` tree building against the new base coordinates and no dangling reference to
the removed `STARTING_CLUSTER_SIZE` — safe to stop here because nothing in `src/app/vanguard/`
reads that constant or hard-codes a base coordinate (confirmed in `plan.md`'s audit).

### Task 6: Remove `STARTING_CLUSTER_SIZE` from configuration ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/config.ts:7`, `src/vanguard/index.ts:22-32`
- Config: `src/vanguard/config.ts` — delete the `STARTING_CLUSTER_SIZE` key (dead configuration
  per SCRUM-42; no replacement value)

- [x] **Step 1: Delete the constant**

In `src/vanguard/config.ts`, delete line 7: `export const STARTING_CLUSTER_SIZE = 4`.

- [x] **Step 2: Remove it from the barrel export**

In `src/vanguard/index.ts`, change:

```ts
export {
  BOARD_SIZE,
  STARTING_CLUSTER_SIZE,
  DEFENSE_CELLS,
  EXPAND_RANGE,
  EXPAND_COST,
  OVERWRITE_COST,
  OVERWRITE_COST_REINFORCED,
  REINFORCE_COST,
  REINFORCE_MAX_STACK,
} from './config'
```

to:

```ts
export {
  BOARD_SIZE,
  DEFENSE_CELLS,
  EXPAND_RANGE,
  EXPAND_COST,
  OVERWRITE_COST,
  OVERWRITE_COST_REINFORCED,
  REINFORCE_COST,
  REINFORCE_MAX_STACK,
} from './config'
```

- [x] **Step 3: Verify the compiler catches every remaining reader**

Run: `npm run typecheck`
Expected: fails — `src/vanguard/createBoard.ts` and `src/vanguard/__tests__/createBoard.test.ts`
still import the now-deleted constant. This confirms both are the only remaining readers before
Task 7 fixes them.

### Task 7: `createVanguardBoard` places bases at row-center with a geometry-derived cluster ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/createBoard.ts`
- Test: `src/vanguard/__tests__/createBoard.test.ts`

- [x] **Step 1: Rewrite `src/vanguard/createBoard.ts`**

Replace the whole file:

```ts
import { PlayerSide } from '../warCouncil'
import { DEFENSE_CELLS, BOARD_SIZE } from './config'
import { cellKey, hexNeighbors, isWithinBoard } from './hexGrid'
import { VanguardCellKind } from './types'
import type { CellKey, HexCoord, VanguardBoard, VanguardCell } from './types'

export function createVanguardBoard(): VanguardBoard {
  const centerColumn = Math.floor(BOARD_SIZE / 2)
  const bases: Record<PlayerSide, HexCoord> = {
    [PlayerSide.Player]: { q: centerColumn, r: 0 },
    [PlayerSide.Cpu]: { q: centerColumn, r: BOARD_SIZE - 1 },
  }

  const cells: Record<CellKey, VanguardCell> = {}
  for (const coord of DEFENSE_CELLS) {
    cells[cellKey(coord)] = { kind: VanguardCellKind.Defense }
  }

  for (const side of [PlayerSide.Player, PlayerSide.Cpu] as const) {
    const base = bases[side]
    // The starting cluster is definitionally the base plus every on-board hex
    // touching it — derived from hex geometry and the base's own position,
    // never a chosen size (SCRUM-42). The occupied-cell filter mirrors the
    // guard the removed hexBfs's own canEnter predicate provided, so a
    // cluster can never overlap a defense cell or the other side's cluster.
    const cluster = [base, ...hexNeighbors(base)].filter(
      (coord) => isWithinBoard(coord, BOARD_SIZE) && cells[cellKey(coord)] === undefined,
    )

    for (const coord of cluster) {
      cells[cellKey(coord)] = { kind: VanguardCellKind.Token, owner: side, reinforced: 0 }
    }
  }

  return { size: BOARD_SIZE, bases, cells }
}
```

- [x] **Step 2: Rewrite `src/vanguard/__tests__/createBoard.test.ts`**

Replace the whole file:

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { BOARD_SIZE, DEFENSE_CELLS } from '../config'
import { createVanguardBoard } from '../createBoard'
import { cellKey, hexNeighbors, isWithinBoard } from '../hexGrid'
import { connectedNetwork } from '../network'
import { VanguardCellKind } from '../types'

describe('createVanguardBoard', () => {
  const board = createVanguardBoard()
  const centerColumn = Math.floor(BOARD_SIZE / 2)

  it('sizes the board per BOARD_SIZE', () => {
    expect(board.size).toBe(BOARD_SIZE)
  })

  it('places each base at the horizontal center of its own home row, owned by that side', () => {
    expect(board.bases[PlayerSide.Player]).toEqual({ q: centerColumn, r: 0 })
    expect(board.bases[PlayerSide.Cpu]).toEqual({ q: centerColumn, r: BOARD_SIZE - 1 })
    expect(board.cells[cellKey(board.bases[PlayerSide.Player])]).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 0,
    })
  })

  it('seeds each side with the base plus every on-board hex touching it — count derived from geometry', () => {
    const expectedSize = (base: { q: number; r: number }) =>
      1 + hexNeighbors(base).filter((c) => isWithinBoard(c, BOARD_SIZE)).length
    expect(connectedNetwork(board, PlayerSide.Player)).toHaveLength(
      expectedSize(board.bases[PlayerSide.Player]),
    )
    expect(connectedNetwork(board, PlayerSide.Cpu)).toHaveLength(
      expectedSize(board.bases[PlayerSide.Cpu]),
    )
  })

  it('marks every configured defense cell', () => {
    for (const coord of DEFENSE_CELLS) {
      expect(board.cells[cellKey(coord)]).toEqual({ kind: VanguardCellKind.Defense })
    }
  })

  it('never overlaps a defense cell with either starting cluster', () => {
    const playerNetwork = connectedNetwork(board, PlayerSide.Player).map(cellKey)
    const cpuNetwork = connectedNetwork(board, PlayerSide.Cpu).map(cellKey)
    const defenseKeys = DEFENSE_CELLS.map(cellKey)
    for (const key of [...playerNetwork, ...cpuNetwork]) {
      expect(defenseKeys).not.toContain(key)
    }
  })

  it('builds a symmetric opening position for both sides — SCRUM-42', () => {
    expect(connectedNetwork(board, PlayerSide.Player)).toHaveLength(
      connectedNetwork(board, PlayerSide.Cpu).length,
    )
  })
})
```

- [x] **Step 3: Verify**

Run: `npx vitest run src/vanguard/__tests__/createBoard.test.ts; npm run typecheck`
Expected: all five tests pass; typecheck exits 0 (confirms Task 6's dangling readers are now
fixed).

### Task 8: Replace the stale corner-placement assertion in `hexLayout.test.ts` ✓

- Skill: react-frontend

**Files:**
- Test: `src/app/vanguard/__tests__/hexLayout.test.ts:27-34`

- [x] **Step 1: Replace the `'makes the player base the leftmost cell on the board'` test**

`hexLayout.ts` itself needs no change — `hexPlacement` was always generic over any coordinate —
but this test encoded the old corner-base assumption, which SCRUM-42 breaks by design (this is the
plan's own documented, expected fallout, not a defect). In
`src/app/vanguard/__tests__/hexLayout.test.ts`, change:

```ts
  it('makes the player base the leftmost cell on the board', () => {
    const player = hexPlacement({ q: 0, r: 0 }, 11)
    for (let q = 0; q < 11; q++) {
      for (let r = 0; r < 11; r++) {
        expect(hexPlacement({ q, r }, 11).xFraction).toBeGreaterThanOrEqual(player.xFraction)
      }
    }
  })
```

to:

```ts
  it('centers each row’s base near mid-board, leaning left as the rhombus leans — SCRUM-42', () => {
    // SCRUM-42 moves both bases off the corners to {q: 5, r: 0} / {q: 5, r: 10}
    // (BOARD_SIZE 11's row-0/row-10 horizontal center). The bases are not
    // vertically aligned on screen because the rhombus itself leans
    // left-to-right — expected, per skirmish-board-replacement.md.
    const bottomRowCenter = hexPlacement({ q: 5, r: 0 }, 11)
    const topRowCenter = hexPlacement({ q: 5, r: 10 }, 11)
    expect(bottomRowCenter.xFraction).toBeLessThan(0.5)
    expect(topRowCenter.xFraction).toBeGreaterThan(0.5)
    expect(topRowCenter.xFraction).toBeGreaterThan(bottomRowCenter.xFraction)
  })
```

- [x] **Step 2: Verify**

Run: `npx vitest run src/app/vanguard/__tests__/hexLayout.test.ts`
Expected: all tests pass.

### Task 9: Update the base-placement text in the design doc ✓

- Skill: game-designer

**Files:**
- Modify: `.docs/design/skirmish-board-replacement.md`

- [x] **Step 1: Update the intro paragraph**

Change:

```
Two fixed bases sit on a full hex-grid board — purple (Player) in one corner, green (CPU) in the
opposite corner — each pre-seeded with a small cluster of connected tokens.
```

to:

```
Two fixed bases sit on a full hex-grid board — purple (Player) at the horizontal center of the
bottom row, green (CPU) at the horizontal center of the top row — each pre-seeded with a cluster
of every hex touching its base.
```

- [x] **Step 2: Update the Board section's two bullets**

Change:

```
- A hex-grid rhombus (same shape Hex used), with two fixed **base cells** instead of two edges —
  purple and green, in roughly opposite corners.
- Each base starts with a small pre-seeded cluster of that side's own connected tokens (size not
  yet decided — illustrative only).
```

to:

```
- A hex-grid rhombus (same shape Hex used), with two fixed **base cells** instead of two edges —
  purple and green, each at the horizontal center of its own home row.
- Each base starts with a pre-seeded cluster of that side's own tokens: the base cell plus every
  on-board hex touching it — a count derived from hex geometry and the base's position, never a
  chosen size (SCRUM-42).
```

- [x] **Step 3: Update the "illustrative numbers" bullet in Open, not yet decided**

Change:

```
- **Numbers used above are illustrative, not chosen:** starting cluster size, board size, base
  distance, the 7-move baseline Muster, the 2/3 overwrite cost, and the +1 reinforce cap are all
  the developer's to set once there's something playable to test them against.
```

to:

```
- **Numbers used above are illustrative, not chosen:** board size, base distance, the 7-move
  baseline Muster, the 2/3 overwrite cost, and the +1 reinforce cap are all the developer's to set
  once there's something playable to test them against. (Starting cluster size is no longer one of
  these — SCRUM-42 makes it a derived fact of hex geometry and the base's position, not a chosen
  number.)
```

- [x] **Step 4: Verify**

Run: `Select-String -Path .docs\design\skirmish-board-replacement.md -Pattern "opposite corner|starting cluster size,"`
Expected: zero hits.

---

## Phase 3 — SCRUM-41: click-to-act, no palette-first step

This phase touches the UI/reducer layer under `src/app/vanguard/`. It ends type-checking with
`matchReducer.ts`, `ActionPalette.tsx`, and `VanguardMatch.tsx` all agreeing on the new
`MatchUiState`/`MatchUiAction` shape — safe to stop here because `HexCell.tsx`,
`VanguardBoardView.tsx`, and `useHexRovingFocus.ts` need no change at all (they only ever consumed
`legalTargets` as an opaque `ReadonlySet<CellKey>`).

### Task 10: Add `inferActionKind` and `allLegalTargets` to `legalTargets.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/legalTargets.ts`
- Test: `src/app/vanguard/__tests__/legalTargets.test.ts`

- [x] **Step 1: Write the failing tests**

In `src/app/vanguard/__tests__/legalTargets.test.ts`, change the imports:

```ts
import { describe, expect, it } from 'vitest'
import {
  VanguardActionKind,
  VanguardCellKind,
  allBoardCoords,
  applyVanguardAction,
  cellKey,
} from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { allLegalTargets, inferActionKind, legalTargetsFor } from '../legalTargets'
import { makeBoard } from './boardFixture'
```

Then append:

```ts
describe('inferActionKind', () => {
  it('infers Expand for an empty cell', () => {
    expect(inferActionKind(undefined, PlayerSide.Player)).toBe(VanguardActionKind.Expand)
  })

  it('infers Expand for a defense cell, so the engine reports CellIsDefense rather than a client guess', () => {
    expect(inferActionKind({ kind: VanguardCellKind.Defense }, PlayerSide.Player)).toBe(
      VanguardActionKind.Expand,
    )
  })

  it('infers Reinforce for the side’s own token, even at the reinforcement cap', () => {
    const cell = { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 1 } as const
    expect(inferActionKind(cell, PlayerSide.Player)).toBe(VanguardActionKind.Reinforce)
  })

  it('infers Overwrite for an enemy token', () => {
    const cell = { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 } as const
    expect(inferActionKind(cell, PlayerSide.Player)).toBe(VanguardActionKind.Overwrite)
  })
})

describe('allLegalTargets', () => {
  it('unions every action kind’s legal targets with no duplication', () => {
    const byAction = {
      [VanguardActionKind.Expand]: new Set(['2,0']),
      [VanguardActionKind.Overwrite]: new Set(['2,1']),
      [VanguardActionKind.Reinforce]: new Set(['0,0', '2,0']),
    }
    expect(allLegalTargets(byAction)).toEqual(new Set(['2,0', '2,1', '0,0']))
  })

  it('agrees with the union of legalTargetsFor’s own per-kind sets on a real board — SCRUM-41', () => {
    const muster = 9
    const byAction = {
      [VanguardActionKind.Expand]: legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, muster),
      [VanguardActionKind.Overwrite]: legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Overwrite, muster),
      [VanguardActionKind.Reinforce]: legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Reinforce, muster),
    }
    const union = allLegalTargets(byAction)
    for (const target of allBoardCoords(board.size)) {
      const inferred = inferActionKind(board.cells[cellKey(target)], PlayerSide.Player)
      const engine = applyVanguardAction(board, PlayerSide.Player, { kind: inferred, target })
      const engineAllows = engine.ok && engine.cost <= muster
      expect(union.has(cellKey(target))).toBe(engineAllows)
    }
  })
})
```

Run: `npx vitest run src/app/vanguard/__tests__/legalTargets.test.ts`
Expected: fails — `inferActionKind`/`allLegalTargets` are not exported yet.

- [x] **Step 2: Implement `inferActionKind` and `allLegalTargets`**

In `src/app/vanguard/legalTargets.ts`, change the import block to:

```ts
import {
  allBoardCoords,
  applyVanguardAction,
  cellKey,
  VanguardActionKind,
  VanguardCellKind,
  type CellKey,
  type VanguardBoard,
  type VanguardCell,
} from '../../vanguard'
import type { PlayerSide } from '../../warCouncil'
```

Then append, after `legalTargetsFor`:

```ts
/**
 * Which action kind a tap on this cell means, inferred from its occupancy —
 * SCRUM-41's click-to-act model. Total over every occupancy state so a tap
 * never has "no inferred action": an own token infers Reinforce even when
 * already at the reinforcement cap, and a defense cell infers Expand so the
 * engine's own CellIsDefense rejection — not a client-side guess — is what
 * the player sees. This function decides no legality; applyVanguardAction /
 * applyClashAction still adjudicate every attempt.
 */
export function inferActionKind(
  cell: VanguardCell | undefined,
  side: PlayerSide,
): VanguardActionKind {
  if (cell === undefined || cell.kind === VanguardCellKind.Defense) {
    return VanguardActionKind.Expand
  }
  return cell.owner === side ? VanguardActionKind.Reinforce : VanguardActionKind.Overwrite
}

/**
 * The union of every action kind's legal targets — SCRUM-41's continuous
 * board highlight, since a click-to-act board must show every cell some
 * action can currently land on, not just one armed kind's cells. Takes the
 * already-computed per-kind sets rather than re-dry-running the engine, so a
 * caller building both the palette's per-kind `enabled` map and the board's
 * highlight set pays for the size^2 engine pass once per kind, not a fourth
 * time for the union.
 */
export function allLegalTargets(
  byAction: Readonly<Record<VanguardActionKind, ReadonlySet<CellKey>>>,
): ReadonlySet<CellKey> {
  const all = new Set<CellKey>()
  for (const targets of Object.values(byAction)) {
    for (const key of targets) all.add(key)
  }
  return all
}
```

- [x] **Step 3: Verify**

Run: `npx vitest run src/app/vanguard/__tests__/legalTargets.test.ts; npm run typecheck`
Expected: all tests pass, including the existing `legalTargetsFor` coverage; typecheck exits 0.

### Task 11: `matchReducer.ts` — tap infers the action, no arming step

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/matchReducer.ts`
- Test: `src/app/vanguard/__tests__/matchReducer.test.ts`

- [x] **Step 1: Rewrite `src/app/vanguard/matchReducer.ts`**

Replace the whole file:

```ts
import {
  applyClashAction,
  cellKey,
  ClashStatus,
  chooseCpuClashAction,
  convertScoreToMuster,
  openingSideForRound,
  startClash,
  type ClashRejectionReason,
  type ClashState,
  type HexCoord,
  type IllegalActionReason,
  type VanguardAction,
  type VanguardState,
} from '../../vanguard'
import { PlayerSide, scoreRound } from '../../warCouncil'
import { isValidTricksWon, type TricksWon } from '../tricksWon'
import { inferActionKind } from './legalTargets'

export type MatchRejection = IllegalActionReason | ClashRejectionReason

export type MatchFault =
  | { readonly kind: 'cpuDeadEnd'; readonly message: string }
  | { readonly kind: 'cpuRejected'; readonly reason: MatchRejection }
  | { readonly kind: 'requestFailed'; readonly message: string }
  | { readonly kind: 'invalidTricks' }

export interface MatchUiState {
  readonly round: number
  readonly board: VanguardState
  readonly clash: ClashState | null
  readonly rejection: MatchRejection | null
  readonly fault: MatchFault | null
}

export const MatchActionKind = {
  MusterReady: 'musterReady',
  RequestFailed: 'requestFailed',
  TapCell: 'tapCell',
  ClearRejection: 'clearRejection',
  NextRound: 'nextRound',
} as const
export type MatchActionKind = (typeof MatchActionKind)[keyof typeof MatchActionKind]

export type MatchUiAction =
  | { readonly kind: typeof MatchActionKind.MusterReady; readonly tricks: TricksWon }
  | { readonly kind: typeof MatchActionKind.RequestFailed; readonly message: string }
  | { readonly kind: typeof MatchActionKind.TapCell; readonly target: HexCoord }
  | { readonly kind: typeof MatchActionKind.ClearRejection }
  | { readonly kind: typeof MatchActionKind.NextRound }

export function createMatchUiState(initialState: VanguardState): MatchUiState {
  return {
    round: 1,
    board: initialState,
    clash: null,
    rejection: null,
    fault: null,
  }
}

export function matchReducer(state: MatchUiState, action: MatchUiAction): MatchUiState {
  switch (action.kind) {
    case MatchActionKind.MusterReady:
      return handleMusterReady(state, action.tricks)
    case MatchActionKind.RequestFailed:
      return { ...state, fault: { kind: 'requestFailed', message: action.message } }
    case MatchActionKind.TapCell:
      return handleTapCell(state, action.target)
    case MatchActionKind.ClearRejection:
      return { ...state, rejection: null }
    case MatchActionKind.NextRound:
      return handleNextRound(state)
  }
}

function handleMusterReady(state: MatchUiState, tricks: TricksWon): MatchUiState {
  if (state.clash !== null || state.fault !== null) {
    return state
  }

  if (!isValidTricksWon(tricks)) {
    return { ...state, fault: { kind: 'invalidTricks' } }
  }

  const score = scoreRound(tricks)
  const muster = convertScoreToMuster(score)
  const clash = startClash(state.board, muster, openingSideForRound(state.round))

  const { clash: advancedClash, fault } = advanceCpu(clash)
  return { ...state, clash: advancedClash, fault }
}

/**
 * Infers the action from the tapped cell's own occupancy (SCRUM-41's
 * click-to-act model — no palette arming step) and submits it directly.
 * `inferActionKind` is total, so every tap names a candidate action; whether
 * it's actually legal and affordable is still decided entirely by
 * `applyClashAction`, never here.
 */
function handleTapCell(state: MatchUiState, target: HexCoord): MatchUiState {
  const { clash, fault } = state
  if (clash?.status !== ClashStatus.InProgress || clash.turn !== PlayerSide.Player || fault !== null) {
    return state
  }

  const cell = clash.board.cells[cellKey(target)]
  const action: VanguardAction = { kind: inferActionKind(cell, PlayerSide.Player), target }
  const result = applyClashAction(clash, PlayerSide.Player, action)
  if (!result.ok) {
    return { ...state, rejection: result.reason }
  }

  const { clash: advancedClash, fault: cpuFault } = advanceCpu(result.state)
  return { ...state, clash: advancedClash, rejection: null, fault: cpuFault }
}

function handleNextRound(state: MatchUiState): MatchUiState {
  if (state.clash === null) {
    return state
  }

  return {
    ...state,
    round: state.round + 1,
    board: state.clash.board,
    clash: null,
    rejection: null,
  }
}

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
        fault: {
          kind: 'cpuDeadEnd',
          message: error instanceof Error ? error.message : String(error),
        },
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

- [x] **Step 2: Rewrite `src/app/vanguard/__tests__/matchReducer.test.ts`**

Replace the whole file:

```ts
import { describe, expect, it } from 'vitest'
import { ClashStatus, IllegalActionReason, VanguardActionKind, cellKey } from '../../../vanguard'
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
  it('starts at round 1 with no clash and nothing at fault', () => {
    const ui = start()
    expect(ui.round).toBe(1)
    expect(ui.clash).toBeNull()
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
    const ui = matchReducer(start(), musterReady(9))
    expect(ui.clash?.status).toBe(ClashStatus.InProgress)
    if (ui.clash?.status === ClashStatus.InProgress) {
      expect(ui.clash.turn).toBe(PlayerSide.Player)
    }
  })
})

describe('TapCell — SCRUM-41: the action is inferred from the tapped cell, no arming step', () => {
  const started = () => matchReducer(start(), musterReady(9))

  it('infers Reinforce for the player’s own unreinforced token and commits it', () => {
    const ui = started()
    const before = ui.clash?.muster[PlayerSide.Player] ?? 0
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.muster[PlayerSide.Player]).toBeLessThan(before)
    expect(next.clash?.board.cells[cellKey({ q: 0, r: 0 })]).toMatchObject({ reinforced: 1 })
  })

  it('infers Overwrite for an adjacent enemy token and commits it', () => {
    const ui = started()
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 1 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.board.cells[cellKey({ q: 2, r: 1 })]).toMatchObject({
      owner: PlayerSide.Player,
    })
  })

  it('infers Expand for an empty cell in range and commits it', () => {
    const ui = started()
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 0 } })
    expect(next.rejection).toBeNull()
    expect(next.clash?.board.cells[cellKey({ q: 2, r: 0 })]).toMatchObject({
      owner: PlayerSide.Player,
    })
  })

  it('names the engine’s own reason on an illegal target and leaves the board untouched', () => {
    const ui = started()
    const boardBefore = ui.clash?.board
    // (2,2) is a permanent defense — inferActionKind infers Expand, and
    // applyExpand's own CellIsDefense check is what rejects it.
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(next.rejection).toBe(IllegalActionReason.CellIsDefense)
    expect(next.clash?.board).toBe(boardBefore)
  })

  it('rejects a tap on an already-reinforced own token with the engine’s own cap reason', () => {
    const ui = started()
    // (1,1) is the fixture's already-reinforced player token.
    const next = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 1, r: 1 } })
    expect(next.rejection).toBe(IllegalActionReason.ReinforcementCapReached)
  })

  it('ignores a tap when there is no clash in progress', () => {
    const noClash = start()
    const next = matchReducer(noClash, { kind: MatchActionKind.TapCell, target: { q: 0, r: 0 } })
    expect(next).toBe(noClash)
  })
})

describe('ClearRejection', () => {
  it('clears a rejection without touching the clash', () => {
    const ui = matchReducer(start(), musterReady(9))
    const rejected = matchReducer(ui, { kind: MatchActionKind.TapCell, target: { q: 2, r: 2 } })
    expect(rejected.rejection).not.toBeNull()
    const cleared = matchReducer(rejected, { kind: MatchActionKind.ClearRejection })
    expect(cleared.rejection).toBeNull()
    expect(cleared.clash).toBe(rejected.clash)
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

- [ ] **Step 3: Verify** — NOT fully as expected, see note below

Run: `npx vitest run src/app/vanguard/__tests__/matchReducer.test.ts; npm run typecheck`
Expected: all tests pass; typecheck fails at this point because `VanguardMatch.tsx` and
`ActionPalette.tsx` still reference the removed `selectedAction`/`SelectAction`/`CancelSelection` —
confirms both are the only remaining readers before Tasks 12–14 fix them.

> **Actual:** typecheck failure matched exactly as expected (confirmed the only two remaining
> readers). But 2 of the 12 tests fail, both for the same reason: `musterReady(9)` opens round 1
> with the CPU (`openingSideForRound(1) === PlayerSide.Cpu`), and Phase 1's broadened
> `ownedCells`-based Overwrite adjacency lets the CPU's opening move Overwrite the player's
> reinforced token at `{q:1,r:1}` (CPU-owned `{q:2,r:1}` is adjacent to it). This is the exact
> "Known fallout from an earlier phase" mechanism the contract calls out at the end of Phase 3 —
> just also reaching `matchReducer.test.ts`, not only the explicitly-named `VanguardMatch.test.tsx`.
> Not fixed here per the contract's explicit instruction not to edit `boardFixture.ts` — reported to
> the orchestrator in the Implementer Report instead. Code (Steps 1–2) matches the spec verbatim.

### Task 12: `ActionPalette` becomes a read-only legend ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/ActionPalette.tsx`

- [x] **Step 1: Rewrite `src/app/vanguard/ActionPalette.tsx`**

Replace the whole file:

```tsx
import { VanguardActionKind } from '../../vanguard'
import { ACTION_DESCRIPTION, ACTION_NAME, REJECTION_MESSAGE } from './labels'

export interface ActionPaletteProps {
  readonly enabled: Readonly<Record<VanguardActionKind, boolean>>
  readonly interactive: boolean
  readonly hint: string
}

// The closed set of strings `hint` can ever equal when it names a rejection —
// comparing against it is what lets `data-reject` react to the mount's hint
// cascade without threading a second boolean prop alongside the text.
const REJECTION_TEXTS = new Set<string>(Object.values(REJECTION_MESSAGE))

const ACTIONS = Object.values(VanguardActionKind)

/**
 * A read-only legend for the three Clash actions (AC2, revised by SCRUM-41):
 * cost/range reference only, no selection step. `enabled` — this action has
 * at least one legal target this turn — is the mount's own dry-run result,
 * not decided here. Tapping a board cell (VanguardBoardView) is the only way
 * to act; this list never receives a click handler.
 */
export default function ActionPalette({ enabled, interactive, hint }: ActionPaletteProps) {
  return (
    <div className="vg-palette">
      <p
        className="vg-hint"
        aria-live="polite"
        data-reject={REJECTION_TEXTS.has(hint) ? 'true' : undefined}
      >
        {hint}
      </p>
      <ul className="vg-actions" aria-label="Clash actions">
        {ACTIONS.map((kind) => (
          <li key={kind} className="vg-action" data-enabled={interactive && enabled[kind] ? 'true' : 'false'}>
            {ACTION_NAME[kind]}
            <small>{ACTION_DESCRIPTION[kind]}</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [x] **Step 2: Verify**

Run: `npm run typecheck`
Expected: still fails only at `VanguardMatch.tsx` (its call site still passes the removed
`selected`/`onSelect` props) — confirms Task 12 itself compiles cleanly and Task 14 is the
remaining fix.

### Task 13: Update `vanguard.css` for the non-interactive legend ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/vanguard.css:217-305`

- [x] **Step 1: Replace the action-palette CSS block**

In `src/app/vanguard/vanguard.css`, replace everything from the
`/* ------------------------------ action palette ----------------------------- */`
comment through the end of the file with:

```css
/* ------------------------------ action legend ------------------------------ */
/* SCRUM-41: ActionPalette is a read-only legend now — no button semantics,
   no armed/selected state, no click handler. */
.vg-palette {
  grid-area: palette;
  border-top: 1px solid var(--vg-felt-line);
  background: var(--vg-chamber-lift);
  padding: 0.7rem 1rem calc(0.7rem + env(safe-area-inset-bottom, 0px));
  display: grid;
  gap: 0.6rem;
  justify-items: center;
}

.vg-hint {
  margin: 0;
  min-height: 1.25em;
  font-size: clamp(0.78rem, 1.9vmin, 0.9rem);
  color: var(--vg-chalk-dim);
  text-align: center;
  text-wrap: balance;
}

.vg-hint[data-reject='true'] {
  color: var(--vg-alarm);
}

.vg-actions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.vg-action {
  min-height: 44px;
  min-width: 44px;
  padding: 0.4rem 1rem;
  border-radius: var(--vg-radius);
  border: 1px solid var(--vg-felt-line);
  background: var(--vg-felt);
  color: var(--vg-chalk);
  font-family: var(--vg-serif);
  font-size: clamp(0.85rem, 2vmin, 1rem);
  display: grid;
  gap: 0.05rem;
  justify-items: center;
}

.vg-action small {
  font-family: var(--vg-sans);
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  color: var(--vg-chalk-dim);
  font-variant-numeric: tabular-nums;
}

.vg-action[data-enabled='false'] {
  opacity: 0.38;
}

@media (prefers-reduced-motion: reduce) {
  .vg-cell {
    transition: none;
  }
}
```

- [x] **Step 2: Verify no stale selector remains**

Run: `Select-String -Path src\app\vanguard\vanguard.css -Pattern "aria-pressed|:disabled|cursor: ?pointer"`
Expected: zero hits inside the action-legend block (a `.vg-cell` rule earlier in the file still
legitimately uses `cursor: pointer` and `:disabled` — this check is about the palette section only,
confirm by eye that any hits are in `.vg-cell` rules, not `.vg-action`).

### Task 14: `VanguardMatch.tsx` — wire the union highlight and updated hint ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/vanguard/VanguardMatch.tsx`
- Test: `src/app/vanguard/__tests__/VanguardMatch.test.tsx`

- [x] **Step 1: Update the `legalTargets` import**

Change `import { legalTargetsFor } from './legalTargets'` to
`import { allLegalTargets, legalTargetsFor } from './legalTargets'`.

- [x] **Step 2: Replace the `legalTargets` derivation**

Change:

```ts
  const legalTargets =
    ui.selectedAction !== null && playerTurn ? targetsByAction[ui.selectedAction] : EMPTY_TARGETS
```

to:

```ts
  const legalTargets = playerTurn ? allLegalTargets(targetsByAction) : EMPTY_TARGETS
```

- [x] **Step 3: Update the `onCancel` dispatch**

Change `onCancel={() => dispatch({ kind: MatchActionKind.CancelSelection })}` to
`onCancel={() => dispatch({ kind: MatchActionKind.ClearRejection })}`.

- [x] **Step 4: Update the `ActionPalette` call site**

Change:

```tsx
      <ActionPalette
        selected={ui.selectedAction}
        enabled={enabled}
        interactive={canAct}
        hint={hint}
        onSelect={(action) => dispatch({ kind: MatchActionKind.SelectAction, action })}
      />
```

to:

```tsx
      <ActionPalette enabled={enabled} interactive={canAct} hint={hint} />
```

- [x] **Step 5: Update `deriveHint`**

Change:

```ts
function deriveHint(ui: MatchUiState): string {
  if (ui.rejection !== null) return REJECTION_MESSAGE[ui.rejection]
  if (ui.selectedAction !== null) return `Choose a target for ${ACTION_NAME[ui.selectedAction]}`
  if (ui.clash === null) return 'The War Council is deciding this round’s Muster'
  if (ui.clash.status !== ClashStatus.InProgress) return ''
  return ui.clash.turn === PlayerSide.Player
    ? 'Choose an action, then a target cell'
    : 'They are spending their Muster'
}
```

to:

```ts
function deriveHint(ui: MatchUiState): string {
  if (ui.rejection !== null) return REJECTION_MESSAGE[ui.rejection]
  if (ui.clash === null) return 'The War Council is deciding this round’s Muster'
  if (ui.clash.status !== ClashStatus.InProgress) return ''
  return ui.clash.turn === PlayerSide.Player ? 'Tap a cell to act' : 'They are spending their Muster'
}
```

`ACTION_NAME` is now unused in this file's `deriveHint` — check whether it is still imported for
another use; if the import `import { ACTION_NAME, REJECTION_MESSAGE } from './labels'` has no
remaining use of `ACTION_NAME` after this edit, change it to
`import { REJECTION_MESSAGE } from './labels'`.

- [x] **Step 6: Rewrite `src/app/vanguard/__tests__/VanguardMatch.test.tsx`**

Replace the whole file:

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
// SCRUM-41: no arming step, so "the clash has started (and it's the
// player's turn)" is signalled by at least one board cell becoming a live,
// enabled target — the legend renders no button at all anymore.
const clashStarted = () =>
  waitFor(() =>
    expect(screen.getAllByRole('button').some((b) => !(b as HTMLButtonElement).disabled)).toBe(
      true,
    ),
  )

describe('VanguardMatch', () => {
  it('keeps the board on screen while the War Council result is outstanding — AC3', () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={neverResolves}
        onComplete={vi.fn()}
      />,
    )
    expect(cell('Cell 0, 0 — your base, your token')).toBeDefined()
    expect(cell('Cell 2, 2 — permanent defense')).toBeDefined()
  })

  it('taps an empty cell directly and submits the inferred Expand — SCRUM-41', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    const target = cell('Cell 2, 0 — empty')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Cell 2, 0 — empty' })).toBeNull(),
    )
  })

  it('taps an adjacent enemy token directly and submits the inferred Overwrite — SCRUM-41', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    const target = cell('Cell 2, 1 — their token')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)
    await waitFor(() => expect(cell('Cell 2, 1 — your token')).toBeDefined())
  })

  it('taps the player’s own token directly and submits the inferred Reinforce — SCRUM-41', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    const target = cell('Cell 0, 0 — your base, your token')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)
    await waitFor(() =>
      expect(cell('Cell 0, 0 — your base, your token, reinforced')).toBeDefined(),
    )
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
    const defense = cell('Cell 2, 2 — permanent defense')
    expect(defense.disabled).toBe(true)
    fireEvent.click(defense)
    expect(cell('Cell 2, 2 — permanent defense')).toBeDefined()
  })
})
```

- [ ] **Step 7: Verify** — NOT fully as expected, see note below

Run: `npx vitest run src/app/vanguard/__tests__/VanguardMatch.test.tsx; npx vitest run src/app/vanguard/__tests__/VanguardBoardView.test.tsx; npm run typecheck`
Expected: all tests pass (`VanguardBoardView.test.tsx` needs no source change — its calls pass a
`ReadonlySet<CellKey>` directly, unaffected by this task); typecheck exits 0 for the whole
`src/app/vanguard/` tree.

> **Actual:** `VanguardBoardView.test.tsx` passes fully (6/6) and typecheck exits 0 for the whole
> `src/app/vanguard/` tree, as expected. But 1 of 5 `VanguardMatch.test.tsx` tests fails — the same
> root cause as Task 11's note: the CPU's round-1 opening move Overwrites the player's reinforced
> token at `{q:1,r:1}`, so `{q:2,r:1}` (the CPU's other token, tapped by this test expecting a
> legal Overwrite) is no longer adjacent to any player-owned cell and is correctly disabled. The
> contract's own "Known fallout" note at the end of this phase anticipated exactly this test
> needing attention and explicitly directed **not** to edit `boardFixture.ts` but to report it —
> done here and in the Implementer Report. Code (Steps 1–6) matches the spec verbatim.

---

## Phase 4 — Documentation refresh

Both implementation docs are refreshed once, after all three tickets' code has landed, so they
describe the final shipped state in one pass. No production code changes in this phase — safe to
run any time after Phase 3.

### Task 15: Refresh `.docs/implementation/vanguard.md` and `vanguard-ui.md` ✓

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/implementation/vanguard.md`, `.docs/implementation/vanguard-ui.md`

- [x] **Step 1: Refresh `vanguard.md` for `src/vanguard/`**

Invoke the `implementation-doc-writer` skill for `src/vanguard/`, incorporating: `ownedCells`
(new export in `network.ts`, added to the Key types & exports table and a new "Every owned cell,
not just the connected chain" subsection under How it works); `applyExpand`/`applyOverwrite`'s
reference-set change from `connectedNetwork` to `ownedCells` (SCRUM-40); `chooseCpuClashAction`'s
candidate generation and tiering keyed off the same broadened set; `createVanguardBoard`'s new
base coordinates (`{q: floor(BOARD_SIZE/2), r: 0}` / `{..., r: BOARD_SIZE-1}`) and its cluster
construction (base + in-bounds neighbours, no more `hexBfs`) replacing the old corner-placement
description (SCRUM-42); `STARTING_CLUSTER_SIZE`'s removal — update the existing "Developer
decisions still outstanding" bullet that names it as an un-retuned placeholder, since it no longer
exists at all. Append `SCRUM-40, SCRUM-42` to the module's **Built by** line.

- [x] **Step 2: Refresh `vanguard-ui.md` for `src/app/vanguard/`**

Invoke the `implementation-doc-writer` skill for `src/app/vanguard/`, incorporating:
`inferActionKind`/`allLegalTargets` (new exports in `legalTargets.ts`, added to the Key types &
exports table); the click-to-act interaction model replacing the existing "Action-then-target: two
taps, no confirm step" section — a tap infers the action from the cell's own occupancy and submits
it directly, with every currently-legal cell across all three kinds highlighted continuously;
`matchReducer.ts`'s `MatchUiState`/`MatchActionKind`/`MatchUiAction` shape change (`selectedAction`
and `SelectAction` removed, `CancelSelection` renamed `ClearRejection`); `ActionPalette`'s
read-only-legend redesign (no more armed/selected state, no click handler). Update the existing
"Developer decides or observes" bullet about "whether two taps per Clash action... drags" — it no
longer applies now that a Clash action is one tap. Append `SCRUM-41` to the module's **Built by**
line.

- [x] **Step 3: Verify both docs actually name the new code**

Run: `Select-String -Path .docs\implementation\vanguard.md -Pattern "ownedCells"; Select-String -Path .docs\implementation\vanguard-ui.md -Pattern "inferActionKind|allLegalTargets"`
Expected: at least one hit each — confirms the refresh actually landed, not just claimed.

> **Actual (Step 6.5, orchestrator-run):** both greps returned multiple hits (5 in `vanguard.md`, 6
> in `vanguard-ui.md`). Docs refreshed: `vanguard.md` gained `ownedCells`'s Key-types row and a new
> "Every owned cell, not just the connected chain" subsection, `createVanguardBoard`'s section
> rewritten for row-center bases + geometry cluster, the CPU-heuristic section updated for the
> broadened reference set, `STARTING_CLUSTER_SIZE` removed from the tunables list and the
> Deferred/developer-decisions bullet. `vanguard-ui.md` gained `inferActionKind`/`allLegalTargets`
> rows, the "Action-then-target: two taps" section replaced with "Click-to-act: one tap," the
> `MatchUiState`/`MatchActionKind` table rows updated, and the two stale Deferred bullets about
> arming/two-taps corrected. `Built by` lines and `README.md`'s table both updated. **Residual, not
> fixed here:** 4 stale "armed action" code comments outside doc scope (`legalTargets.ts:20`,
> `useHexRovingFocus.ts:29`, `VanguardMatch.tsx:69,149`) — flagged by both Code-Evaluator and
> Defender in round 2, logged as a residual per the 2-round fix-review cap rather than spawning a
> third fix pass; carried into the Final Report's Developer Actions Outstanding.

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work across all
three tickets is clean.

### Task 16: Confirm the pure-core boundary still holds ✓

- [x] **Step 1: Grep `src/vanguard/` for React and DOM references**

Run: `Get-ChildItem -Recurse -Path src\vanguard -Include *.ts | Select-String -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Grep the two React-free files under `src/app/vanguard/`**

Run: `Select-String -Path src\app\vanguard\legalTargets.ts,src\app\vanguard\matchReducer.ts -Pattern "from 'react'|\bwindow\.|\bdocument\."`
Expected: zero hits — both files are documented (`vanguard-ui.md`) as importing no React and
touching no DOM global, and `inferActionKind`/`allLegalTargets`/the rewritten `handleTapCell`
must not have broken that.

> **Actual (QA, round 2, delegated final verification):** both greps returned zero hits, confirmed.

### Task 17: Confirm no stale name remains ✓

- [x] **Step 1: Grep for the removed configuration key**

Run: `Get-ChildItem -Recurse -Path src -Include *.ts,*.tsx | Select-String -Pattern "STARTING_CLUSTER_SIZE"`
Expected: zero hits.

- [x] **Step 2: Grep for the removed/renamed reducer surface, scoped to the Vanguard tree only**

Run: `Get-ChildItem -Recurse -Path src\vanguard,src\app\vanguard -Include *.ts,*.tsx | Select-String -Pattern "selectedAction|SelectAction|CancelSelection"`
Expected: zero hits. (Scoped deliberately: `src/app/warCouncil/roundReducer.ts` has its own,
unrelated `SelectAction`/`selectedAction` names in a different reducer — out of scope for this
plan, confirmed in `plan.md`'s audit.)

> **Actual (QA, round 2, delegated final verification):** both greps returned zero hits, confirmed.

### Task 18: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.

> **Actual (QA, round 2):** all three exit 0. `npm test` → `Test Files 47 passed (47)`,
> `Tests 371 passed (371)`, 0 failed — the 3 failures QA reported round 1 (fixture-premise
> fallout, see Tasks 11/14/19's notes) are gone after the combined fix pass's `boardFixture.ts`
> repositioning.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

> **Actual (QA, round 2):** exits 0, `dist/index.html` + CSS/JS assets written, "✓ built in 1.79s".

### Task 19: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: Expand/Overwrite now key off any owned cell (SCRUM-40); Clash actions are now one tap,
  inferred from the tapped cell's occupancy, with `ActionPalette` reduced to a read-only legend
  (SCRUM-41); both bases now sit at the horizontal center of their own row with a
  geometry-derived starting cluster, and `STARTING_CLUSTER_SIZE` is gone (SCRUM-42).
- Every decision the developer must make: whether the read-only `ActionPalette` legend should stay
  or be removed; whether the single shared highlight ring reads clearly with several cells lit at
  once; whether the `Defense → Expand → CellIsDefense` rejection copy feels right.
- Verification results from Phases 1–4 (typecheck/lint/test/build).
- A one-line note for future contributors: Expand/Overwrite legality's reference set is
  `ownedCells`, not `connectedNetwork` — only the Breach still uses the connected chain.

> **Fix-pass note (post-review):** written at
> `.claude/contract/SCRUM-40-vanguard-targeting-and-layout-fixes/pr-description.md`. This task was
> never dispatched during the original phase walk (an orchestration gap) — closed here as part of
> the combined review fix pass, alongside the `boardFixture.ts` repositioning that resolved Tasks
> 11/14's noted fallout (see those tasks' own notes — their checkboxes are left as originally
> ticked, since the code itself already matched spec verbatim; only the fixture and its dependent
> test coordinates changed).

---

## Self-review

**Spec coverage:**
- SCRUM-40 (Expand/Overwrite key off any owned cell) — Tasks 1–5.
- SCRUM-41 (click-to-act, no palette-first step) — Tasks 10–14.
- SCRUM-42 (bases to row-center, cluster = base + touching hexes) — Tasks 6–9.
- Documentation refresh for all three — Task 15.
- Final verification (boundary, stale names, gates, build, PR description) — Tasks 16–19.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or
"similar to Task N" references anywhere in this file. Every step shows the exact code, the exact
before/after text, or a runnable `Run:`/`Expected:` command.

**Type / name consistency:** `ownedCells` is spelled identically across Tasks 1, 2, 3, 4, and its
barrel export, and matches `plan.md` Part 2 → Data shapes. `inferActionKind`/`allLegalTargets` are
spelled identically across Tasks 10, 11, 14, and their tests. `MatchActionKind.ClearRejection` is
spelled identically across Tasks 11 and 14. `centerColumn`/`BOARD_SIZE`/`hexNeighbors` usage in
Task 7's `createBoard.ts` matches Task 7's own `createBoard.test.ts` and Task 8's `hexLayout.test.ts`
(`q: 5, r: 0` / `q: 5, r: 10` at `BOARD_SIZE 11`).

**Phase boundary cleanliness:** Phase 1 ends with `src/vanguard/`'s Expand/Overwrite/CPU-heuristic
trio all reading `ownedCells`, `breach.ts` untouched, and the whole tree type-checking. Phase 2
ends with `STARTING_CLUSTER_SIZE` fully removed and every reader updated (Task 6's own Step 3
deliberately runs `typecheck` *before* Task 7 to prove those are the only two dangling readers).
Phase 3 ends with `matchReducer.ts`/`ActionPalette.tsx`/`VanguardMatch.tsx` agreeing on the new
state/action shape (Task 11's own Step 3 deliberately runs `typecheck` before Tasks 12–14 to prove
those two files are the only remaining callers). Phase 4 makes no code change. Phase 5 makes no
production change at all — only verification.
