# Tasks: Vanguard board engine — hex grid, bases, Expand/Overwrite/Reinforce

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-03

**Goal:** Build the Vanguard board as a pure, headless TypeScript module under `src/vanguard/` — a hex-grid rhombus board with two fixed seeded bases, permanent defense cells, and the three Clash actions (Expand, Overwrite, Reinforce) each enforcing its documented legality and cost.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/vanguard/types.ts` — hex coordinate, cell, board, action, and reason-code types
- `src/vanguard/hexGrid.ts` — axial hex coordinate math and a reusable BFS
- `src/vanguard/config.ts` — tunable configuration and fixed rule constants
- `src/vanguard/network.ts` — a side's connected-network query
- `src/vanguard/createBoard.ts` — board construction (bases, starting clusters, defense cells)
- `src/vanguard/expand.ts` — Expand legality, cost, and board update
- `src/vanguard/overwrite.ts` — Overwrite legality, cost, and board update
- `src/vanguard/reinforce.ts` — Reinforce legality, cost, and board update
- `src/vanguard/applyVanguardAction.ts` — single reducer-shaped dispatch entry
- `src/vanguard/__tests__/hexGrid.test.ts`
- `src/vanguard/__tests__/network.test.ts`
- `src/vanguard/__tests__/createBoard.test.ts`
- `src/vanguard/__tests__/expand.test.ts`
- `src/vanguard/__tests__/overwrite.test.ts`
- `src/vanguard/__tests__/reinforce.test.ts`
- `src/vanguard/__tests__/applyVanguardAction.test.ts`
- `src/vanguard/__tests__/testBoard.ts` — test-only `boardWith` helper, extracted post-review (code-evaluator fix pass) from the 5 spec files that had each declared it locally; not part of the original plan's file map

**Modified:**
- `src/vanguard/index.ts` — replaces the SCRUM-19 placeholder (`VanguardState = unknown`) with the real public surface

**Deleted:** (none)

**Developer decides or observes:**
- config → `BOARD_SIZE` (currently `11`, placeholder) — retune after first playtest
- config → `STARTING_CLUSTER_SIZE` (currently `4`, placeholder) — retune after first playtest
- config → `DEFENSE_CELLS` (currently an invented 5-cell placeholder layout near board centre) — retune the actual positions once the board is playable
- Judgement call: reinforcement modeled as a numeric stack (`reinforced: number`, capped by `REINFORCE_MAX_STACK = 1`) rather than a boolean — confirm this reading or say if the cap should be permanently fixed at one
- Judgement call: Overwrite resets the captured cell's reinforcement to `0` for the new owner — confirm or say if fortification should carry over
- No behaviour in this ticket needs `npm run dev` — the module has no UI surface; everything is machine-verifiable by Vitest and `npm run typecheck`

---

## Phase 1 — Hex coordinate math and board/action types

This phase establishes every type the rest of the module builds on, plus the coordinate math and the single reusable BFS both board construction (Phase 2) and network queries (Phase 2) are built from. It ends type-checking with no behaviour wired up yet — a safe, inert stopping point.

### Task 1: Declare the board, cell, and action types in `src/vanguard/types.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/types.ts`

- [x] **Step 1: Write the type declarations**

```ts
import type { PlayerSide } from '../warCouncil'

export interface HexCoord {
  readonly q: number
  readonly r: number
}

export type CellKey = string // `${q},${r}`

export const VanguardCellKind = {
  Token: 'token',
  Defense: 'defense',
} as const
export type VanguardCellKind = (typeof VanguardCellKind)[keyof typeof VanguardCellKind]

export interface TokenCell {
  readonly kind: typeof VanguardCellKind.Token
  readonly owner: PlayerSide
  readonly reinforced: number // stacked reinforcement level, 0..REINFORCE_MAX_STACK
}

export interface DefenseCell {
  readonly kind: typeof VanguardCellKind.Defense
}

export type VanguardCell = TokenCell | DefenseCell

export interface VanguardBoard {
  readonly size: number
  readonly bases: Readonly<Record<PlayerSide, HexCoord>>
  // Sparse: an in-bounds coordinate absent from this record is an empty cell.
  // Typed with `| undefined` explicitly since `noUncheckedIndexedAccess` is not on
  // in this project's tsconfig — without it, an unguarded `.kind` read on a
  // genuinely empty cell would compile cleanly and crash at runtime.
  readonly cells: Readonly<Record<CellKey, VanguardCell | undefined>>
}

export const VanguardActionKind = {
  Expand: 'expand',
  Overwrite: 'overwrite',
  Reinforce: 'reinforce',
} as const
export type VanguardActionKind = (typeof VanguardActionKind)[keyof typeof VanguardActionKind]

export type VanguardAction =
  | { readonly kind: typeof VanguardActionKind.Expand; readonly target: HexCoord }
  | { readonly kind: typeof VanguardActionKind.Overwrite; readonly target: HexCoord }
  | { readonly kind: typeof VanguardActionKind.Reinforce; readonly target: HexCoord }

export const IllegalActionReason = {
  CellOutOfBounds: 'cellOutOfBounds',
  CellIsDefense: 'cellIsDefense',
  CellOccupied: 'cellOccupied',
  OutOfExpandRange: 'outOfExpandRange',
  TargetNotEnemyToken: 'targetNotEnemyToken',
  NotAdjacentToNetwork: 'notAdjacentToNetwork',
  TargetNotOwnToken: 'targetNotOwnToken',
  ReinforcementCapReached: 'reinforcementCapReached',
} as const
export type IllegalActionReason = (typeof IllegalActionReason)[keyof typeof IllegalActionReason]

export type VanguardActionResult =
  | { readonly ok: true; readonly board: VanguardBoard; readonly cost: number }
  | { readonly ok: false; readonly reason: IllegalActionReason }
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Hex coordinate math and a reusable BFS in `src/vanguard/hexGrid.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/hexGrid.ts`
- Test: `src/vanguard/__tests__/hexGrid.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { allBoardCoords, cellKey, hexBfs, hexDistance, hexNeighbors, isWithinBoard } from '../hexGrid'
import type { HexCoord } from '../types'

describe('cellKey', () => {
  it('formats a coordinate as "q,r"', () => {
    expect(cellKey({ q: 3, r: -2 })).toBe('3,-2')
  })
})

describe('isWithinBoard', () => {
  it('accepts the corners of a size-N board', () => {
    expect(isWithinBoard({ q: 0, r: 0 }, 5)).toBe(true)
    expect(isWithinBoard({ q: 4, r: 4 }, 5)).toBe(true)
  })

  it('rejects one step outside either axis', () => {
    expect(isWithinBoard({ q: -1, r: 0 }, 5)).toBe(false)
    expect(isWithinBoard({ q: 0, r: 5 }, 5)).toBe(false)
  })
})

describe('hexNeighbors', () => {
  it('returns the 6 axial-direction neighbours, unfiltered by bounds', () => {
    expect(hexNeighbors({ q: 0, r: 0 })).toEqual([
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ])
  })
})

describe('hexDistance', () => {
  it('is 0 for the same cell', () => {
    expect(hexDistance({ q: 2, r: 2 }, { q: 2, r: 2 })).toBe(0)
  })

  it('is 1 for each of the 6 neighbours', () => {
    const origin: HexCoord = { q: 4, r: 4 }
    for (const neighbor of hexNeighbors(origin)) {
      expect(hexDistance(origin, neighbor)).toBe(1)
    }
  })

  it('is 2 exactly 2 hex-spaces away, and 3 exactly 3 away', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2)
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3)
  })
})

describe('allBoardCoords', () => {
  it('returns exactly size*size coordinates with no duplicates', () => {
    const coords = allBoardCoords(4)
    expect(coords).toHaveLength(16)
    expect(new Set(coords.map(cellKey)).size).toBe(16)
  })
})

describe('hexBfs', () => {
  it('returns [] when the start cell itself fails canEnter', () => {
    expect(hexBfs({ q: 0, r: 0 }, 5, () => false)).toEqual([])
  })

  it('returns [] when the start cell is out of bounds', () => {
    expect(hexBfs({ q: -1, r: 0 }, 5, () => true)).toEqual([])
  })

  it('visits every canEnter-passing cell reachable from start, no duplicates', () => {
    const result = hexBfs({ q: 0, r: 0 }, 3, () => true)
    expect(result).toHaveLength(9)
    expect(new Set(result.map(cellKey)).size).toBe(9)
  })

  it('stops at a canEnter boundary rather than crossing it', () => {
    const blocked = new Set(['1,0', '0,1'])
    const result = hexBfs({ q: 0, r: 0 }, 3, (c) => !blocked.has(cellKey(c)))
    expect(result).toEqual([{ q: 0, r: 0 }])
  })

  it('every prefix of the visiting order is itself connected back to start', () => {
    const result = hexBfs({ q: 0, r: 0 }, 3, () => true)
    const visitedSoFar = new Set<string>()
    for (const coord of result) {
      const hasNeighborAlready =
        visitedSoFar.size === 0 || hexNeighbors(coord).some((n) => visitedSoFar.has(cellKey(n)))
      expect(hasNeighborAlready).toBe(true)
      visitedSoFar.add(cellKey(coord))
    }
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/hexGrid.test.ts`
Expected: fails — `../hexGrid` does not exist yet.

- [x] **Step 3: Implement `src/vanguard/hexGrid.ts`**

```ts
import type { CellKey, HexCoord } from './types'

const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function cellKey(coord: HexCoord): CellKey {
  return `${coord.q},${coord.r}`
}

export function isWithinBoard(coord: HexCoord, size: number): boolean {
  return coord.q >= 0 && coord.q < size && coord.r >= 0 && coord.r < size
}

export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }))
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2
}

export function allBoardCoords(size: number): HexCoord[] {
  const coords: HexCoord[] = []
  for (let q = 0; q < size; q++) {
    for (let r = 0; r < size; r++) {
      coords.push({ q, r })
    }
  }
  return coords
}

export function hexBfs(
  start: HexCoord,
  size: number,
  canEnter: (coord: HexCoord) => boolean,
): HexCoord[] {
  if (!isWithinBoard(start, size) || !canEnter(start)) return []

  const visited = new Set<CellKey>([cellKey(start)])
  const order: HexCoord[] = [start]
  const queue: HexCoord[] = [start]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of hexNeighbors(current)) {
      const key = cellKey(neighbor)
      if (visited.has(key)) continue
      if (!isWithinBoard(neighbor, size) || !canEnter(neighbor)) continue
      visited.add(key)
      order.push(neighbor)
      queue.push(neighbor)
    }
  }

  return order
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/hexGrid.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

---

## Phase 2 — Tunable configuration and board construction

This phase adds every named constant the ticket's Dependencies & Risks note calls for, then builds the board itself on top of Phase 1's coordinate math. It ends with a fully-constructed, testable `VanguardBoard` — still no actions can be applied to it yet, so nothing is half-wired.

### Task 3: Tunable configuration and fixed rule constants in `src/vanguard/config.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/config.ts`
- Config: `src/vanguard/config.ts` — adds `BOARD_SIZE`, `STARTING_CLUSTER_SIZE`, `DEFENSE_CELLS` (values are placeholders — developer decision, see File map)

- [x] **Step 1: Write the configuration file**

```ts
import type { HexCoord } from './types'

// --- Configuration: values with no chosen number yet, retunable without a design
// change (see plan.md Part 1 -> Risks and judgement calls) ---
export const BOARD_SIZE = 11
export const STARTING_CLUSTER_SIZE = 4
export const DEFENSE_CELLS: readonly HexCoord[] = [
  { q: 5, r: 4 },
  { q: 5, r: 5 },
  { q: 5, r: 6 },
  { q: 4, r: 5 },
  { q: 6, r: 5 },
]

// --- Constants: values the ticket's acceptance criteria already state; named so
// they are never inlined in an action module ---
export const EXPAND_RANGE = 2
export const EXPAND_COST = 1
export const OVERWRITE_COST = 2
export const OVERWRITE_COST_REINFORCED = 3
export const REINFORCE_COST = 1
export const REINFORCE_MAX_STACK = 1
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 4: The connected-network query in `src/vanguard/network.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/network.ts`
- Test: `src/vanguard/__tests__/network.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { cellKey } from '../hexGrid'
import { connectedNetwork, minDistanceToNetwork } from '../network'
import { VanguardCellKind, type VanguardBoard } from '../types'

function boardWith(cells: VanguardBoard['cells']): VanguardBoard {
  return {
    size: 5,
    bases: { player: { q: 0, r: 0 }, cpu: { q: 4, r: 4 } },
    cells,
  }
}

describe('connectedNetwork', () => {
  it('includes the base and every chain-connected token the side owns', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const network = connectedNetwork(board, PlayerSide.Player)
    expect(new Set(network.map(cellKey))).toEqual(new Set(['0,0', '1,0', '2,0']))
  })

  it('excludes a same-owner token that is not chain-connected to the base', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '3,3': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(connectedNetwork(board, PlayerSide.Player)).toEqual([{ q: 0, r: 0 }])
  })

  it('does not cross an enemy token or a defense cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '0,1': { kind: VanguardCellKind.Defense },
    })
    expect(connectedNetwork(board, PlayerSide.Player)).toEqual([{ q: 0, r: 0 }])
  })

  it('returns [] when the side no longer owns its own base cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(connectedNetwork(board, PlayerSide.Player)).toEqual([])
  })
})

describe('minDistanceToNetwork', () => {
  it('is Infinity for an empty network', () => {
    expect(minDistanceToNetwork({ q: 0, r: 0 }, [])).toBe(Infinity)
  })

  it('is the minimum hex distance to any network cell', () => {
    const network = [{ q: 0, r: 0 }, { q: 5, r: 5 }]
    expect(minDistanceToNetwork({ q: 1, r: 0 }, network)).toBe(1)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/network.test.ts`
Expected: fails — `../network` does not exist yet.

- [x] **Step 3: Implement `src/vanguard/network.ts`**

```ts
import type { PlayerSide } from '../warCouncil'
import { cellKey, hexBfs, hexDistance } from './hexGrid'
import { VanguardCellKind } from './types'
import type { HexCoord, VanguardBoard } from './types'

export function connectedNetwork(board: VanguardBoard, side: PlayerSide): readonly HexCoord[] {
  const base = board.bases[side]
  return hexBfs(base, board.size, (coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side
  })
}

export function minDistanceToNetwork(target: HexCoord, network: readonly HexCoord[]): number {
  if (network.length === 0) return Infinity
  return Math.min(...network.map((coord) => hexDistance(target, coord)))
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/network.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

### Task 5: Board construction in `src/vanguard/createBoard.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/createBoard.ts`
- Test: `src/vanguard/__tests__/createBoard.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { BOARD_SIZE, DEFENSE_CELLS, STARTING_CLUSTER_SIZE } from '../config'
import { createVanguardBoard } from '../createBoard'
import { cellKey } from '../hexGrid'
import { connectedNetwork } from '../network'
import { VanguardCellKind } from '../types'

describe('createVanguardBoard', () => {
  const board = createVanguardBoard()

  it('sizes the board per BOARD_SIZE', () => {
    expect(board.size).toBe(BOARD_SIZE)
  })

  it('places each base in its configured corner, owned by that side', () => {
    expect(board.bases[PlayerSide.Player]).toEqual({ q: 0, r: 0 })
    expect(board.bases[PlayerSide.Cpu]).toEqual({ q: BOARD_SIZE - 1, r: BOARD_SIZE - 1 })
    expect(board.cells[cellKey(board.bases[PlayerSide.Player])]).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 0,
    })
  })

  it('seeds each side with exactly STARTING_CLUSTER_SIZE chain-connected tokens', () => {
    expect(connectedNetwork(board, PlayerSide.Player)).toHaveLength(STARTING_CLUSTER_SIZE)
    expect(connectedNetwork(board, PlayerSide.Cpu)).toHaveLength(STARTING_CLUSTER_SIZE)
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
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/createBoard.test.ts`
Expected: fails — `../createBoard` does not exist yet.

- [x] **Step 3: Implement `src/vanguard/createBoard.ts`**

```ts
import { PlayerSide } from '../warCouncil'
import { DEFENSE_CELLS, BOARD_SIZE, STARTING_CLUSTER_SIZE } from './config'
import { cellKey, hexBfs } from './hexGrid'
import { VanguardCellKind } from './types'
import type { CellKey, HexCoord, VanguardBoard, VanguardCell } from './types'

export function createVanguardBoard(): VanguardBoard {
  const bases: Record<PlayerSide, HexCoord> = {
    [PlayerSide.Player]: { q: 0, r: 0 },
    [PlayerSide.Cpu]: { q: BOARD_SIZE - 1, r: BOARD_SIZE - 1 },
  }

  const cells: Record<CellKey, VanguardCell> = {}
  for (const coord of DEFENSE_CELLS) {
    cells[cellKey(coord)] = { kind: VanguardCellKind.Defense }
  }

  for (const side of [PlayerSide.Player, PlayerSide.Cpu] as const) {
    const cluster = hexBfs(
      bases[side],
      BOARD_SIZE,
      (coord) => cells[cellKey(coord)] === undefined,
    ).slice(0, STARTING_CLUSTER_SIZE)

    for (const coord of cluster) {
      cells[cellKey(coord)] = { kind: VanguardCellKind.Token, owner: side, reinforced: 0 }
    }
  }

  return { size: BOARD_SIZE, bases, cells }
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/createBoard.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

---

## Phase 3 — Actions: legality, cost, and the single reducer entry

This phase adds the three Clash actions and the dispatch entry point that routes to them. Each action is independently pure and testable against a hand-built board, so this phase can be checked out task by task; it ends with the full public action surface wired together and re-exported.

### Task 6: Expand in `src/vanguard/expand.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/expand.ts`
- Test: `src/vanguard/__tests__/expand.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { EXPAND_COST } from '../config'
import { applyExpand } from '../expand'
import { IllegalActionReason, VanguardCellKind, type VanguardBoard } from '../types'

function boardWith(cells: VanguardBoard['cells']): VanguardBoard {
  return {
    size: 5,
    bases: { player: { q: 0, r: 0 }, cpu: { q: 4, r: 4 } },
    cells,
  }
}

const NETWORK_BOARD = boardWith({
  '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
})

describe('applyExpand', () => {
  it('is legal exactly 2 hex-spaces from the network (a 1-cell gap)', () => {
    const result = applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: 2, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cost).toBe(EXPAND_COST)
      expect(result.board.cells['2,0']).toEqual({
        kind: VanguardCellKind.Token,
        owner: PlayerSide.Player,
        reinforced: 0,
      })
    }
  })

  it('is illegal exactly 3 hex-spaces from the network', () => {
    const result = applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: 3, r: 0 })
    expect(result).toEqual({ ok: false, reason: IllegalActionReason.OutOfExpandRange })
  })

  it('is illegal onto an already-occupied cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(applyExpand(board, PlayerSide.Player, { q: 1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOccupied,
    })
  })

  it('is illegal onto a defense cell', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Defense },
    })
    expect(applyExpand(board, PlayerSide.Player, { q: 1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellIsDefense,
    })
  })

  it('is illegal outside the board', () => {
    expect(applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: -1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOutOfBounds,
    })
  })

  it('never mutates the input board', () => {
    const before = JSON.stringify(NETWORK_BOARD)
    applyExpand(NETWORK_BOARD, PlayerSide.Player, { q: 1, r: 0 })
    expect(JSON.stringify(NETWORK_BOARD)).toBe(before)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/expand.test.ts`
Expected: fails — `../expand` does not exist yet.

- [x] **Step 3: Implement `src/vanguard/expand.ts`**

```ts
import type { PlayerSide } from '../warCouncil'
import { EXPAND_COST, EXPAND_RANGE } from './config'
import { cellKey, isWithinBoard } from './hexGrid'
import { connectedNetwork, minDistanceToNetwork } from './network'
import { IllegalActionReason, VanguardCellKind } from './types'
import type { HexCoord, VanguardActionResult, VanguardBoard } from './types'

export function applyExpand(
  board: VanguardBoard,
  side: PlayerSide,
  target: HexCoord,
): VanguardActionResult {
  if (!isWithinBoard(target, board.size)) {
    return { ok: false, reason: IllegalActionReason.CellOutOfBounds }
  }

  const existing = board.cells[cellKey(target)]
  if (existing?.kind === VanguardCellKind.Defense) {
    return { ok: false, reason: IllegalActionReason.CellIsDefense }
  }
  if (existing?.kind === VanguardCellKind.Token) {
    return { ok: false, reason: IllegalActionReason.CellOccupied }
  }

  const network = connectedNetwork(board, side)
  if (minDistanceToNetwork(target, network) > EXPAND_RANGE) {
    return { ok: false, reason: IllegalActionReason.OutOfExpandRange }
  }

  return {
    ok: true,
    cost: EXPAND_COST,
    board: {
      ...board,
      cells: {
        ...board.cells,
        [cellKey(target)]: { kind: VanguardCellKind.Token, owner: side, reinforced: 0 },
      },
    },
  }
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/expand.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

### Task 7: Overwrite in `src/vanguard/overwrite.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/overwrite.ts`
- Test: `src/vanguard/__tests__/overwrite.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { OVERWRITE_COST, OVERWRITE_COST_REINFORCED } from '../config'
import { applyOverwrite } from '../overwrite'
import { IllegalActionReason, VanguardCellKind, type VanguardBoard } from '../types'

function boardWith(cells: VanguardBoard['cells']): VanguardBoard {
  return {
    size: 5,
    bases: { player: { q: 0, r: 0 }, cpu: { q: 4, r: 4 } },
    cells,
  }
}

describe('applyOverwrite', () => {
  it('is legal adjacent to the network, costs OVERWRITE_COST against an unreinforced token', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const result = applyOverwrite(board, PlayerSide.Player, { q: 1, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cost).toBe(OVERWRITE_COST)
      expect(result.board.cells['1,0']).toEqual({
        kind: VanguardCellKind.Token,
        owner: PlayerSide.Player,
        reinforced: 0,
      })
    }
  })

  it('costs OVERWRITE_COST_REINFORCED against a reinforced enemy token', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 1 },
    })
    const result = applyOverwrite(board, PlayerSide.Player, { q: 1, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(OVERWRITE_COST_REINFORCED)
  })

  it('is illegal across a 1-cell gap (distance 2) — no gap allowed for Overwrite', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: 2, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.NotAdjacentToNetwork,
    })
  })

  it('is illegal against an empty cell or one already owned by the acting side', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: 0, r: 1 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotEnemyToken,
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: 1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotEnemyToken,
    })
  })

  it('is illegal outside the board', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    expect(applyOverwrite(board, PlayerSide.Player, { q: -1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOutOfBounds,
    })
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/overwrite.test.ts`
Expected: fails — `../overwrite` does not exist yet.

- [x] **Step 3: Implement `src/vanguard/overwrite.ts`**

```ts
import type { PlayerSide } from '../warCouncil'
import { OVERWRITE_COST, OVERWRITE_COST_REINFORCED } from './config'
import { cellKey, isWithinBoard } from './hexGrid'
import { connectedNetwork, minDistanceToNetwork } from './network'
import { IllegalActionReason, VanguardCellKind } from './types'
import type { HexCoord, VanguardActionResult, VanguardBoard } from './types'

export function applyOverwrite(
  board: VanguardBoard,
  side: PlayerSide,
  target: HexCoord,
): VanguardActionResult {
  if (!isWithinBoard(target, board.size)) {
    return { ok: false, reason: IllegalActionReason.CellOutOfBounds }
  }

  const existing = board.cells[cellKey(target)]
  if (existing?.kind !== VanguardCellKind.Token || existing.owner === side) {
    return { ok: false, reason: IllegalActionReason.TargetNotEnemyToken }
  }

  const network = connectedNetwork(board, side)
  if (minDistanceToNetwork(target, network) > 1) {
    return { ok: false, reason: IllegalActionReason.NotAdjacentToNetwork }
  }

  const cost = existing.reinforced > 0 ? OVERWRITE_COST_REINFORCED : OVERWRITE_COST
  return {
    ok: true,
    cost,
    board: {
      ...board,
      cells: {
        ...board.cells,
        [cellKey(target)]: { kind: VanguardCellKind.Token, owner: side, reinforced: 0 },
      },
    },
  }
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/overwrite.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

### Task 8: Reinforce in `src/vanguard/reinforce.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/reinforce.ts`
- Test: `src/vanguard/__tests__/reinforce.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { REINFORCE_COST } from '../config'
import { applyReinforce } from '../reinforce'
import { IllegalActionReason, VanguardCellKind, type VanguardBoard } from '../types'

function boardWith(cells: VanguardBoard['cells']): VanguardBoard {
  return {
    size: 5,
    bases: { player: { q: 0, r: 0 }, cpu: { q: 4, r: 4 } },
    cells,
  }
}

describe('applyReinforce', () => {
  it('reinforces an unreinforced own token for REINFORCE_COST', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const result = applyReinforce(board, PlayerSide.Player, { q: 0, r: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cost).toBe(REINFORCE_COST)
      expect(result.board.cells['0,0']).toEqual({
        kind: VanguardCellKind.Token,
        owner: PlayerSide.Player,
        reinforced: 1,
      })
    }
  })

  it('does not stack past the +1 cap', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 1 },
    })
    expect(applyReinforce(board, PlayerSide.Player, { q: 0, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.ReinforcementCapReached,
    })
  })

  it('is illegal on a cell the acting side does not own', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    expect(applyReinforce(board, PlayerSide.Player, { q: 0, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotOwnToken,
    })
  })

  it('is illegal on an empty cell', () => {
    expect(applyReinforce(boardWith({}), PlayerSide.Player, { q: 0, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.TargetNotOwnToken,
    })
  })

  it('is illegal outside the board', () => {
    expect(applyReinforce(boardWith({}), PlayerSide.Player, { q: -1, r: 0 })).toEqual({
      ok: false,
      reason: IllegalActionReason.CellOutOfBounds,
    })
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/reinforce.test.ts`
Expected: fails — `../reinforce` does not exist yet.

- [x] **Step 3: Implement `src/vanguard/reinforce.ts`**

```ts
import type { PlayerSide } from '../warCouncil'
import { REINFORCE_COST, REINFORCE_MAX_STACK } from './config'
import { cellKey, isWithinBoard } from './hexGrid'
import { IllegalActionReason, VanguardCellKind } from './types'
import type { HexCoord, VanguardActionResult, VanguardBoard } from './types'

export function applyReinforce(
  board: VanguardBoard,
  side: PlayerSide,
  target: HexCoord,
): VanguardActionResult {
  if (!isWithinBoard(target, board.size)) {
    return { ok: false, reason: IllegalActionReason.CellOutOfBounds }
  }

  const existing = board.cells[cellKey(target)]
  if (existing?.kind !== VanguardCellKind.Token || existing.owner !== side) {
    return { ok: false, reason: IllegalActionReason.TargetNotOwnToken }
  }
  if (existing.reinforced >= REINFORCE_MAX_STACK) {
    return { ok: false, reason: IllegalActionReason.ReinforcementCapReached }
  }

  return {
    ok: true,
    cost: REINFORCE_COST,
    board: {
      ...board,
      cells: {
        ...board.cells,
        [cellKey(target)]: { ...existing, reinforced: existing.reinforced + 1 },
      },
    },
  }
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/reinforce.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

### Task 9: The single reducer entry in `src/vanguard/applyVanguardAction.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/applyVanguardAction.ts`
- Test: `src/vanguard/__tests__/applyVanguardAction.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { applyVanguardAction } from '../applyVanguardAction'
import { EXPAND_COST, OVERWRITE_COST, REINFORCE_COST } from '../config'
import { VanguardActionKind, VanguardCellKind, type VanguardBoard } from '../types'

function boardWith(cells: VanguardBoard['cells']): VanguardBoard {
  return {
    size: 5,
    bases: { player: { q: 0, r: 0 }, cpu: { q: 4, r: 4 } },
    cells,
  }
}

describe('applyVanguardAction', () => {
  it('dispatches an Expand action to applyExpand', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const result = applyVanguardAction(board, PlayerSide.Player, {
      kind: VanguardActionKind.Expand,
      target: { q: 1, r: 0 },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(EXPAND_COST)
  })

  it('dispatches an Overwrite action to applyOverwrite', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const result = applyVanguardAction(board, PlayerSide.Player, {
      kind: VanguardActionKind.Overwrite,
      target: { q: 1, r: 0 },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(OVERWRITE_COST)
  })

  it('dispatches a Reinforce action to applyReinforce', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const result = applyVanguardAction(board, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cost).toBe(REINFORCE_COST)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/applyVanguardAction.test.ts`
Expected: fails — `../applyVanguardAction` does not exist yet.

- [x] **Step 3: Implement `src/vanguard/applyVanguardAction.ts`**

```ts
import type { PlayerSide } from '../warCouncil'
import { applyExpand } from './expand'
import { applyOverwrite } from './overwrite'
import { applyReinforce } from './reinforce'
import { VanguardActionKind } from './types'
import type { VanguardAction, VanguardActionResult, VanguardBoard } from './types'

export function applyVanguardAction(
  board: VanguardBoard,
  side: PlayerSide,
  action: VanguardAction,
): VanguardActionResult {
  switch (action.kind) {
    case VanguardActionKind.Expand:
      return applyExpand(board, side, action.target)
    case VanguardActionKind.Overwrite:
      return applyOverwrite(board, side, action.target)
    case VanguardActionKind.Reinforce:
      return applyReinforce(board, side, action.target)
  }
}
```

- [x] **Step 4: Run and confirm it passes, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/applyVanguardAction.test.ts; npm run typecheck`
Expected: all tests pass; typecheck exits 0.

### Task 10: Replace the placeholder and export the public surface in `src/vanguard/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/index.ts` (currently `export type VanguardState = unknown`)

- [x] **Step 1: Replace the file contents**

```ts
export type { VanguardBoard as VanguardState } from './types'

export { VanguardCellKind, VanguardActionKind, IllegalActionReason } from './types'
export type {
  HexCoord,
  CellKey,
  TokenCell,
  DefenseCell,
  VanguardCell,
  VanguardBoard,
  VanguardAction,
  VanguardActionResult,
} from './types'
export { cellKey, isWithinBoard, hexNeighbors, hexDistance, allBoardCoords, hexBfs } from './hexGrid'
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
export { connectedNetwork, minDistanceToNetwork } from './network'
export { createVanguardBoard } from './createBoard'
export { applyExpand } from './expand'
export { applyOverwrite } from './overwrite'
export { applyReinforce } from './reinforce'
export { applyVanguardAction } from './applyVanguardAction'
```

- [x] **Step 2: Typecheck the whole project, confirming `src/battle/battleState.ts` still compiles against the new shape**

Run: `npm run typecheck`
Expected: exits 0, no errors reported — `BattleState.vanguard: VanguardState` now resolves to the real `VanguardBoard` interface instead of `unknown`, with no change needed in `src/battle/`.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 11: Confirm the pure-core boundary still holds ✓

- [x] **Step 1: Grep for React and DOM references inside `src/vanguard/`**

Run: `Select-String -Path src\vanguard\*.ts,src\vanguard\__tests__\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits.

### Task 12: Confirm no tunable was hard-coded outside `config.ts` ✓

- [x] **Step 1: Grep for a second declaration of any configured or fixed-rule constant**

Run: `Select-String -Path src\vanguard\*.ts -Pattern "\b(BOARD_SIZE|STARTING_CLUSTER_SIZE|DEFENSE_CELLS|EXPAND_RANGE|EXPAND_COST|OVERWRITE_COST_REINFORCED|OVERWRITE_COST|REINFORCE_COST|REINFORCE_MAX_STACK)\s*=" -Exclude config.ts`
Expected: zero hits — every one of these names is assigned exactly once, in `config.ts`, and every other file only imports it.

### Task 13: Static gates, full suite, and production build ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.
Actual (run by QA): all three exit 0. `Test Files 19 passed (19)`, `Tests 112 passed (112)`.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Actual (run by QA): exit 0, `dist/index.html` + JS/CSS assets written, no bundler errors.

### Task 14: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary of the change: the Vanguard board engine (hex grid, bases, defense cells, Expand/Overwrite/Reinforce).
- Every decision the developer must make: `BOARD_SIZE`, `STARTING_CLUSTER_SIZE`, `DEFENSE_CELLS` are placeholders to retune; the reinforcement-as-stack-level and overwrite-resets-fortification judgement calls need sign-off.
- Verification results from Task 13 (typecheck/lint/test/build, with the actual pass counts).
- A one-line note that `VanguardState` is no longer `unknown` — any future ticket touching `src/battle/` should expect the real shape.

---

## Self-review

**Spec coverage:**
- AC1 (hex board, two bases, seeded starting clusters, cluster size as a named constant) — Task 5, Task 3.
- AC2 (permanent defense cells, per-map fixed set) — Task 3, Task 5.
- AC3 (Expand range/gap legality) — Task 6.
- AC4 (Overwrite adjacency legality, 2/3 cost) — Task 7.
- AC5 (Reinforce, +1 cap) — Task 8.
- AC6 (no React/DOM, consistent with War Council's boundary) — Tasks 1–10 comply by construction (no such import anywhere in this tree); re-confirmed by Task 11.
- AC7 (the three named boundary tests) — Task 6 ("exactly 2 away" / "exactly 3 away"), Task 7 (adjacency boundary + 2-vs-3 cost), Task 8 (+1 cap).
- The single reducer-shaped dispatch entry (`applyVanguardAction`) — Task 9.
- `VanguardState` placeholder replacement — Task 10.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references anywhere in this file. Every step shows the exact code or command; every `Run:` line has a matching `Expected:` line.

**Type / name consistency:** `VanguardCellKind`, `VanguardActionKind`, `IllegalActionReason`, `HexCoord`, `CellKey`, `TokenCell`, `DefenseCell`, `VanguardCell`, `VanguardBoard`, `VanguardAction`, `VanguardActionResult`, and every config/constant name (`BOARD_SIZE`, `STARTING_CLUSTER_SIZE`, `DEFENSE_CELLS`, `EXPAND_RANGE`, `EXPAND_COST`, `OVERWRITE_COST`, `OVERWRITE_COST_REINFORCED`, `REINFORCE_COST`, `REINFORCE_MAX_STACK`) are spelled identically everywhere they appear across Tasks 1–10, matching `plan.md` Part 2 "Data shapes" exactly. Function names (`cellKey`, `isWithinBoard`, `hexNeighbors`, `hexDistance`, `allBoardCoords`, `hexBfs`, `connectedNetwork`, `minDistanceToNetwork`, `createVanguardBoard`, `applyExpand`, `applyOverwrite`, `applyReinforce`, `applyVanguardAction`) are identical at every definition and call site.

**Phase boundary cleanliness:** Phase 1 ends with `types.ts` and `hexGrid.ts` fully typed and tested, nothing else referencing them yet — no half-applied change. Phase 2 ends with a fully-constructed, tested `VanguardBoard` and a working `connectedNetwork` query, with no action yet able to mutate it — internally consistent. Phase 3 ends with all three actions and the dispatch entry implemented, tested, and re-exported from `index.ts`, with `VanguardState` now resolving to the real shape and `src/battle/battleState.ts` confirmed still compiling — no dangling import, no dead placeholder. Phase 4 makes no production change.
