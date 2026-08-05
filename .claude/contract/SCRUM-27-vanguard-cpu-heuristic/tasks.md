# Tasks: Vanguard CPU — heuristic action selection

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-05

**Goal:** Give the Vanguard board engine a CPU that always spends its Muster on a legal Expand,
Overwrite, or Reinforce action via a stated, deterministic heuristic — ranking legal, affordable
advances by distance to the opponent's base and falling back to Reinforce — plus a thin
battle-level function that plugs it into `submitClashAction`.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/vanguard/cpuPlayer.ts` — pure candidate-ranking and dry-run-validated action-selection
  heuristic for the CPU's Clash turns.
- `src/vanguard/__tests__/cpuPlayer.test.ts` — unit tests plus the AC4 seeded Clash-level
  simulation coverage.
- `src/battle/playCpuClashTurn.ts` — battle-level composition of the heuristic with
  `submitClashAction`.
- `src/battle/__tests__/playCpuClashTurn.test.ts` — tests for the battle-level wrapper, including
  a short battle-level integration simulation.

**Modified:**
- `src/vanguard/index.ts` — export `chooseCpuClashAction`.
- `src/battle/index.ts` — export `playCpuClashTurn`.

**Deleted:** (none)

**Developer decides or observes:** (none — no configuration value, persisted shape, or UI/feel
judgement is introduced by this contract; see `plan.md` Part 2 → Risks and judgement calls for the
distance-ranking design reading and the deliberately-dropped contiguous-vs-gap Expand refinement,
which are documented assumptions, not open developer decisions.)

---

## Phase 1 — Pure candidate ranking and dry-run-validated action selection

Introduces `src/vanguard/cpuPlayer.ts`, built up one exported helper at a time, each covered by its
own unit tests before the next is added. Every function in this phase is pure TypeScript with no
DOM or React access. The phase ends with `chooseCpuClashAction` composing candidate generation,
ranking, and dry-run validation, and re-exported from `src/vanguard/index.ts` — a safe stopping
point, since nothing outside `src/vanguard/` has changed yet and the module type-checks on its own.

### Task 1: Add candidate generation and ranking helpers ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/cpuPlayer.ts`
- Test: `src/vanguard/__tests__/cpuPlayer.test.ts`

- [x] **Step 1: Write the failing tests for the ranked-advance-candidate ordering**

```ts
import { describe, expect, it } from 'vitest'
import { chooseCpuClashAction } from '../cpuPlayer'
import { applyVanguardAction } from '../applyVanguardAction'
import { VanguardActionKind, VanguardCellKind } from '../types'
import type { CellKey, VanguardBoard, VanguardCell } from '../types'
import { PlayerSide } from '../../warCouncil'

const BASES = {
  [PlayerSide.Player]: { q: 0, r: 0 },
  [PlayerSide.Cpu]: { q: 10, r: 10 },
}

function boardWith(cells: Record<CellKey, VanguardCell>): VanguardBoard {
  return { size: 11, bases: BASES, cells }
}

describe('chooseCpuClashAction — prefers a blocking Overwrite over a farther tier-1 Expand', () => {
  it('overwrites the adjacent enemy token directly toward the opponent base', () => {
    // Player network is the single cell (2,2); opponent base is far away at
    // (10,2), directly along the (1,0) hex axis. The enemy token at (3,2) is
    // the one neighbor of (2,2) that sits on that straight line, so it has
    // the lowest hex-distance to (10,2) (7) of any tier-1 candidate — the
    // other five neighbors of (2,2) are all farther (8 or 9). This is worked
    // by hand against hexGrid.ts's actual hexDistance/hexNeighbors, not
    // assumed: a flat (non-tiered) distance ranking would instead pick a
    // distance-2 Expand gap-jump past this token, which is exactly the bug
    // the two-tier design fixes (see plan.md Part 1 -> Assumptions made).
    const board: VanguardBoard = {
      size: 11,
      bases: { [PlayerSide.Player]: { q: 2, r: 2 }, [PlayerSide.Cpu]: { q: 10, r: 2 } },
      cells: {
        '2,2': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '3,2': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
    }
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action).toEqual({ kind: VanguardActionKind.Overwrite, target: { q: 3, r: 2 } })
    const result = applyVanguardAction(board, PlayerSide.Player, action)
    expect(result.ok).toBe(true)
  })
})

describe('chooseCpuClashAction — Expands toward the opponent base when nothing blocks it', () => {
  it('picks a legal tier-1 Expand cell among the network\'s own neighbors', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action.kind).toBe(VanguardActionKind.Expand)
    const result = applyVanguardAction(board, PlayerSide.Player, action)
    expect(result.ok).toBe(true)
  })
})

describe('chooseCpuClashAction — respects an unaffordable Overwrite', () => {
  it('falls through to Expand when the only blocking Overwrite costs more than the Muster available', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      // (1,0) is a genuine neighbor of (0,0) — distance 1, so it's the sole
      // Overwrite candidate; reinforced:1 makes it cost OVERWRITE_COST_REINFORCED (3).
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 1 },
    })
    const action = chooseCpuClashAction(board, PlayerSide.Player, 2) // can't afford cost-3 Overwrite
    expect(action.kind).toBe(VanguardActionKind.Expand)
  })
})
```

- [x] **Step 2: Run and confirm the red state**

Run: `npx vitest run src/vanguard/__tests__/cpuPlayer.test.ts`
Expected: fails to collect — `chooseCpuClashAction` has no implementation module yet (`../cpuPlayer`
does not resolve). This is the expected red state.

- [x] **Step 3: Implement candidate generation, ranking, and `chooseCpuClashAction`**

```ts
import { applyVanguardAction } from './applyVanguardAction'
import { EXPAND_RANGE, OVERWRITE_COST, OVERWRITE_COST_REINFORCED, REINFORCE_MAX_STACK } from './config'
import { allBoardCoords, cellKey, hexDistance } from './hexGrid'
import { connectedNetwork, minDistanceToNetwork } from './network'
import { VanguardActionKind, VanguardCellKind } from './types'
import type { HexCoord, VanguardAction, VanguardBoard } from './types'
import { otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'

function byCellKey(a: HexCoord, b: HexCoord): number {
  return cellKey(a).localeCompare(cellKey(b))
}

// Empty cells within reach of the acting side's own network — the engine's own
// applyExpand check, reused rather than re-derived.
function expandCandidates(board: VanguardBoard, network: readonly HexCoord[]): HexCoord[] {
  return allBoardCoords(board.size).filter(
    (coord) =>
      board.cells[cellKey(coord)] === undefined &&
      minDistanceToNetwork(coord, network) <= EXPAND_RANGE,
  )
}

// Enemy-token cells adjacent to the acting side's network that it can afford
// to overwrite with the Muster it has left this turn — the engine's own
// applyOverwrite adjacency/cost formula, reused rather than re-derived.
function overwriteCandidates(
  board: VanguardBoard,
  opponent: PlayerSide,
  network: readonly HexCoord[],
  musterAvailable: number,
): HexCoord[] {
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    if (cell?.kind !== VanguardCellKind.Token || cell.owner !== opponent) return false
    if (minDistanceToNetwork(coord, network) > 1) return false
    const cost = cell.reinforced > 0 ? OVERWRITE_COST_REINFORCED : OVERWRITE_COST
    return cost <= musterAvailable
  })
}

// The acting side's own unreinforced tokens — every Reinforce candidate.
function reinforceCandidates(board: VanguardBoard, side: PlayerSide): HexCoord[] {
  return allBoardCoords(board.size).filter((coord) => {
    const cell = board.cells[cellKey(coord)]
    return cell?.kind === VanguardCellKind.Token && cell.owner === side && cell.reinforced < REINFORCE_MAX_STACK
  })
}

// Tier 1 = distance-1-from-network (contiguous; every Overwrite candidate
// qualifies by construction, since Overwrite itself requires adjacency).
// Tier 2 = distance-2 (an Expand gap-jump only). A gap doesn't count toward
// the Breach until it's filled in (skirmish-board-replacement.md -> "The
// Breach"), so a gap-jump is worth less than clearing an adjacent blocker
// even when it lands nominally closer to the opponent's base.
function candidateTier(target: HexCoord, network: readonly HexCoord[]): number {
  return minDistanceToNetwork(target, network) <= 1 ? 1 : 2
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
  network: readonly HexCoord[],
  musterAvailable: number,
): VanguardAction[] {
  const opponentBase = board.bases[opponent]
  const expand = expandCandidates(board, network).map(
    (target): VanguardAction => ({ kind: VanguardActionKind.Expand, target }),
  )
  const overwrite = overwriteCandidates(board, opponent, network, musterAvailable).map(
    (target): VanguardAction => ({ kind: VanguardActionKind.Overwrite, target }),
  )
  return [...expand, ...overwrite].sort(
    (a, b) =>
      candidateTier(a.target, network) - candidateTier(b.target, network) ||
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
  const network = connectedNetwork(board, side)

  const advance = firstValidated(
    board,
    side,
    rankedAdvanceCandidates(board, opponent, network, musterAvailable),
  )
  if (advance) return advance

  const reinforce = firstValidated(
    board,
    side,
    reinforceCandidates(board, side)
      .sort(byCellKey)
      .map((target): VanguardAction => ({ kind: VanguardActionKind.Reinforce, target })),
  )
  if (reinforce) return reinforce

  throw new Error(`chooseCpuClashAction: no legal action available for ${side}`)
}
```

- [x] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

### Task 2: Add the Reinforce-fallback and dead-end tests, then export from `src/vanguard/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/__tests__/cpuPlayer.test.ts`
- Modify: `src/vanguard/index.ts`

- [x] **Step 1: Write the failing tests for the Reinforce fallback and the dead-end throw**

Append to `src/vanguard/__tests__/cpuPlayer.test.ts`:

```ts
describe('chooseCpuClashAction — falls back to Reinforce when no advance validates', () => {
  it('reinforces the lowest-cellKey unreinforced own token when Expand/Overwrite are unavailable', () => {
    // A tiny board (size 2) with no room to Expand and no adjacent enemy token.
    const board: VanguardBoard = {
      size: 2,
      bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 1, r: 1 } },
      cells: {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Defense },
        '0,1': { kind: VanguardCellKind.Defense },
        '1,1': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
    }
    const action = chooseCpuClashAction(board, PlayerSide.Player, 5)
    expect(action).toEqual({ kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } })
  })
})

describe('chooseCpuClashAction — throws on a true dead end', () => {
  it('throws when no Expand, Overwrite, or Reinforce candidate validates', () => {
    const board: VanguardBoard = {
      size: 1,
      bases: { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 0, r: 0 } },
      cells: {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 1 },
      },
    }
    expect(() => chooseCpuClashAction(board, PlayerSide.Player, 5)).toThrow(
      'chooseCpuClashAction: no legal action available for player',
    )
  })
})
```

- [x] **Step 2: Run and confirm green, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed (the implementation from Task 1 already
covers this behaviour — this step is verification, not new production code); `npm run typecheck`
exits 0.

- [x] **Step 3: Export `chooseCpuClashAction` from `src/vanguard/index.ts`**

Add one line at the end of `src/vanguard/index.ts`:

```ts
export { chooseCpuClashAction } from './cpuPlayer'
```

- [x] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

- [x] **Step 5: Measure `cpuPlayer.ts`**

Run: `(Get-Content src\vanguard\cpuPlayer.ts | Measure-Object -Line).Lines`
Expected: well under 400.

---

## Phase 2 — Seeded simulation coverage for AC4

Adds the seeded-simulation tests AC4 asks for directly, driving the real Clash engine
(`createVanguardBoard`, `startClash`, `applyClashAction`) through `chooseCpuClashAction` for both
sides across many Clash rounds chained together (each round's ending board feeding the next
round's `startClash`, mirroring how the real battle loop persists the board across rounds). No
production code changes in this phase — it verifies behaviour Phase 1 already built, so the
codebase stays exactly as type-safe as it was at the end of Phase 1.

### Task 3: Add seeded multi-round Clash simulation tests to `cpuPlayer.test.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/__tests__/cpuPlayer.test.ts`

- [x] **Step 1: Write the simulation tests**

Add these imports to the top of the file (`VanguardCellKind` and the `VanguardBoard` type are
already imported by Task 1's setup — do not re-import them, or `tsc` reports a duplicate
identifier):

```ts
import { createVanguardBoard } from '../createBoard'
import { applyClashAction, startClash } from '../clash'
import { MUSTER_BASELINE } from '../config'
import { ClashStatus } from '../types'
import type { ClashState } from '../types'
```

Append at the end of the file:

```ts
function claimedCellCount(board: VanguardBoard): number {
  return Object.values(board.cells).filter((cell) => cell?.kind === VanguardCellKind.Token).length
}

function runClashRound(board: VanguardBoard, opener: PlayerSide, muster: number): ClashState {
  let state: ClashState = startClash(board, { player: muster, cpu: muster }, opener)
  let guard = 0
  while (state.status === ClashStatus.InProgress) {
    guard += 1
    if (guard > 500) throw new Error('runaway loop — clash round never resolved')
    const side = state.turn
    const action = chooseCpuClashAction(state.board, side, state.muster[side])
    const result = applyClashAction(state, side, action)
    if (!result.ok) throw new Error(`illegal action for ${side}: ${result.reason}`)
    state = result.state
  }
  return state
}

describe('chooseCpuClashAction — seeded multi-round battle simulations (AC4)', () => {
  const seeds = Array.from({ length: 25 }, (_, i) => i + 1)

  it.each(seeds)('runs several Clash rounds with zero illegal actions (seed %i)', (seed) => {
    let board = createVanguardBoard()
    const startingCount = claimedCellCount(board)
    let opener = seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu
    let round = 0

    while (round < 6) {
      round += 1
      const result = runClashRound(board, opener, MUSTER_BASELINE)
      board = result.board
      if (result.status === ClashStatus.Breached) break
      opener = opener === PlayerSide.Player ? PlayerSide.Cpu : PlayerSide.Player
    }

    expect(claimedCellCount(board)).toBeGreaterThan(startingCount)
  })
})
```

- [x] **Step 2: Run and confirm green, then typecheck**

Run: `npx vitest run src/vanguard/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; zero `illegal action` / `runaway loop`
errors thrown; `npm run typecheck` exits 0. Report the printed test count rather than assuming it.

- [x] **Step 3: Measure `cpuPlayer.test.ts`**

Run: `(Get-Content src\vanguard\__tests__\cpuPlayer.test.ts | Measure-Object -Line).Lines`
Expected: under 400. If it is at or over, split the simulation `describe` block into a sibling
file (e.g. `cpuPlayerSimulation.test.ts`) before continuing — do not disable the check.

---

## Phase 3 — Battle-level composition

Plugs the heuristic into `src/battle/` so the battle module has something to call on the CPU's
Clash turn, following the exact shape of the existing `playCpuWarCouncilTurn`/`submitClashAction`
actions. Ends with `playCpuClashTurn` exported from `src/battle/index.ts` and fully tested — a safe
stopping point since it introduces no new state-mutation path of its own, only composition of two
already-tested primitives (`chooseCpuClashAction`, `submitClashAction`).

### Task 4: Add `playCpuClashTurn` and export it from `src/battle/index.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/playCpuClashTurn.ts`
- Modify: `src/battle/index.ts`
- Test: `src/battle/__tests__/playCpuClashTurn.test.ts`

- [x] **Step 1: Write the failing tests**

> **Implementer note:** the "drives a full Clash phase forward" `it.each` block as given below
> called `playCpuClashTurn` unconditionally on every turn, including the Player's. That contradicts
> the rejection test two blocks above (and the production code in Step 3, which is deliberately
> CPU-only, matching `playCpuWarCouncilTurn`) — `playCpuClashTurn` correctly returns `NotCpuTurn`
> once the turn flips to Player, since both sides start Muster > 0 (`MUSTER_BASELINE = 7`) and
> `applyClashAction` flips `turn` to the other side whenever both still have Muster left. Confirmed
> empirically: with the code exactly as shown, all 3 seeded cases in that block threw
> `clash turn rejected: notCpuTurn`. Fixed in the test file only — the Player's turn is now
> submitted directly via `submitClashAction` using the same side-agnostic `chooseCpuClashAction`
> heuristic, so the block still exercises `playCpuClashTurn` for every CPU turn while a Player move
> drives the alternating turns forward. No production code changed to accommodate this — the
> `playCpuClashTurn`/`submitClashAction` implementation below is applied exactly as specified.

```ts
import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { beginClash } from '../beginClash'
import { playCpuClashTurn } from '../playCpuClashTurn'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { autoPlayWarCouncilRound } from './battleTestHelpers'
import { ClashStatus } from '../../vanguard'
import { PlayerSide } from '../../warCouncil'
import type { BattleState } from '../battleState'

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function reachClash(seed: number): BattleState {
  const afterWarCouncil = autoPlayWarCouncilRound(startBattle(lcg(seed)))
  const result = beginClash(afterWarCouncil)
  if (!result.ok) throw new Error(`beginClash rejected: ${result.reason}`)
  return result.state
}

describe('playCpuClashTurn — rejections', () => {
  it('rejects when the battle is not in the Clash phase', () => {
    const opened = startBattle(lcg(1))
    const result = playCpuClashTurn(opened, lcg(1))
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotClashPhase })
  })

  it("rejects when it is not the CPU's turn", () => {
    const state = reachClash(2)
    if (state.phase !== BattlePhase.Clash) throw new Error('expected Clash')
    if (state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    // Deterministic, not seed-dependent: round 1's Clash always opens with
    // openingSideForRound(1) === CLASH_FIRST_ROUND_OPENER === PlayerSide.Cpu.
    expect(state.clash.turn).toBe(PlayerSide.Cpu)

    // Advance one turn with the function under test itself, which flips the
    // turn to Player (both sides still have Muster left after one action).
    const afterCpuTurn = playCpuClashTurn(state, lcg(2))
    if (!afterCpuTurn.ok) throw new Error(`setup move rejected: ${afterCpuTurn.reason}`)
    if (afterCpuTurn.state.phase !== BattlePhase.Clash) throw new Error('expected still Clash')
    if (afterCpuTurn.state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    expect(afterCpuTurn.state.clash.turn).toBe(PlayerSide.Player)

    const result = playCpuClashTurn(afterCpuTurn.state, lcg(2))
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotCpuTurn })
  })
})

describe('playCpuClashTurn — plays a legal CPU action', () => {
  it("submits an action accepted by submitClashAction on the CPU's turn", () => {
    const state = reachClash(3)
    if (state.phase !== BattlePhase.Clash) throw new Error('expected Clash')
    if (state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    expect(state.clash.turn).toBe(PlayerSide.Cpu) // deterministic, see rejection test above

    const result = playCpuClashTurn(state, lcg(3))
    expect(result.ok).toBe(true)
  })
})

describe('playCpuClashTurn — drives a full Clash phase forward across several seeds', () => {
  it.each([4, 5, 6])('completes several turns with both sides using playCpuClashTurn (seed %i)', (seed) => {
    let state = reachClash(seed)
    let guard = 0

    while (state.phase === BattlePhase.Clash) {
      guard += 1
      if (guard > 200) throw new Error('runaway loop — clash never resolved')
      const result = playCpuClashTurn(state, lcg(seed))
      if (!result.ok) throw new Error(`clash turn rejected: ${result.reason}`)
      state = result.state
      if (state.phase !== BattlePhase.Clash) break
    }

    expect(state.phase === BattlePhase.Resolved || state.phase === BattlePhase.WarCouncilRound).toBe(true)
  })
})
```

- [x] **Step 2: Run and confirm the red state**

Run: `npx vitest run src/battle/__tests__/playCpuClashTurn.test.ts`
Expected: fails to collect — `../playCpuClashTurn` does not exist yet.

- [x] **Step 3: Implement `playCpuClashTurn` and export it**

```ts
// src/battle/playCpuClashTurn.ts
import { chooseCpuClashAction, ClashStatus } from '../vanguard'
import { PlayerSide } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'
import { submitClashAction } from './submitClashAction'

export function playCpuClashTurn(state: BattleState, rng: () => number): BattleActionResult {
  if (state.phase !== BattlePhase.Clash) {
    return { ok: false, reason: BattleRejectionReason.NotClashPhase }
  }
  if (state.clash.status !== ClashStatus.InProgress || state.clash.turn !== PlayerSide.Cpu) {
    return { ok: false, reason: BattleRejectionReason.NotCpuTurn }
  }
  const action = chooseCpuClashAction(state.clash.board, PlayerSide.Cpu, state.clash.muster[PlayerSide.Cpu])
  return submitClashAction(state, PlayerSide.Cpu, action, rng)
}
```

In `src/battle/index.ts`, add one line at the end of the file:

```ts
export { playCpuClashTurn } from './playCpuClashTurn'
```

- [x] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/battle/__tests__/playCpuClashTurn.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

- [x] **Step 5: Measure both changed test/production files**

Run: `(Get-Content src\battle\playCpuClashTurn.ts | Measure-Object -Line).Lines; (Get-Content src\battle\__tests__\playCpuClashTurn.test.ts | Measure-Object -Line).Lines`
Expected: both well under 400.

---

## Phase 4 — Final verification

No production changes — only sanity-checks that the cumulative work is clean. This project has no
enforced pure-core import boundary yet (per `.claude/workflow/web-project.md`) and this contract
introduces no configuration key or tunable, so the boundary-grep and tunable-grep checks from the
standard template are omitted rather than run against nothing.

### Task 5: Static gates and full suite ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed across the whole suite (including every
existing `warCouncil`, `vanguard`, and `battle` spec, not just this contract's new files).

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 6: Update the PR description ✓

- Skill: react-frontend

**Files:**
- Create: `.claude/contract/SCRUM-27-vanguard-cpu-heuristic/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: adds a pure, dry-run-validated heuristic CPU action-selector for the Vanguard Clash
  (`src/vanguard/cpuPlayer.ts`) plus a thin `src/battle/playCpuClashTurn.ts` composition function;
  zero illegal actions verified structurally (every returned action is engine-confirmed via
  `applyVanguardAction` before being returned) and empirically across seeded multi-round
  simulations.
- The two-tier (contiguous-before-gap-jump, then distance-to-base) ranking is a documented design
  reading of AC2's example, grounded in the Breach's "no gaps" rule (see `plan.md` Part 1 →
  Assumptions made) — flag it for a quick sanity read, not as an open question.
- Note the flagged follow-up: `battleTestHelpers.ts`'s scripted Clash helpers now duplicate a
  simplified version of the real heuristic; a later ticket could swap
  `battleLoop.integration.test.ts` over to the real thing.
- Verification results from Task 5 (typecheck / lint / test / build).
- One-line note for future contributors: `chooseCpuClashAction` is side-generic per `PlayerSide`,
  matching `chooseCpuCard`'s shape — it can drive either side's turn.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**
- plan.md In scope → "pure heuristic function `chooseCpuClashAction`... only ever returns an
  action confirmed legal by a dry-run call" — Task 1.
- plan.md In scope → "stated, simple ranking rule... Reinforce is attempted only when no such
  candidate validates" — Tasks 1, 2.
- plan.md In scope → "thin `src/battle/` composition function, `playCpuClashTurn`" — Task 4.
- plan.md In scope → "unit tests for the heuristic's candidate ranking and fallback behaviour" —
  Tasks 1, 2.
- plan.md In scope → "seeded simulation tests driving multiple full Clash rounds (and a short
  battle-level run...) confirming zero illegal-action rejections and... network grows" — Tasks 3,
  4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or
"similar to Task N" references. Every step shows exact code or a `Run:`/`Expected:` command pair.

**Type / name consistency:** `chooseCpuClashAction`, `expandCandidates`, `overwriteCandidates`,
`reinforceCandidates`, `candidateTier`, `rankedAdvanceCandidates`, `firstValidated`, and
`playCpuClashTurn` are each introduced exactly once (all in Task 1 except `playCpuClashTurn` in
Task 4) and referenced identically in every later task and in `plan.md` Part 2 → Data shapes. No
new `BattleRejectionReason` member is introduced — `NotClashPhase` and `NotCpuTurn` are reused
exactly as named in `plan.md`.

**Phase boundary cleanliness:** Phase 1 ends with `cpuPlayer.ts` fully implemented, exported from
`src/vanguard/index.ts`, typechecking cleanly, and no import from `src/battle/` — internally
consistent on its own. Phase 2 adds tests only, no production code, so the type-check state is
identical to the end of Phase 1. Phase 3 ends with `playCpuClashTurn` implemented, exported, and
tested, touching only `src/battle/` files — no half-applied rename, no dead import. Phase 4 makes
no production change at all.
