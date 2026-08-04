# Tasks: The Clash — turn engine (alternating spend, uncontested leftover)

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-04

**Goal:** Build the state machine that spends a round's Muster — a reducer that processes one submitted `VanguardAction` at a time, enforcing whose turn it is, delegating legality/cost to `applyVanguardAction`, checking the Breach after every action, and alternating turns until one side is exhausted (then letting the other spend the rest uncontested) — plus a pure function for which side opens a given round.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/vanguard/clashOpener.ts` — `openingSideForRound(roundNumber)`, the round-opener alternation
- `src/vanguard/clash.ts` — `startClash` and `applyClashAction`, the turn-engine reducer
- `src/vanguard/__tests__/clashOpener.test.ts` — round-opener alternation test
- `src/vanguard/__tests__/clash.test.ts` — turn-engine tests: alternation, uncontested leftover, Breach mid-exchange, and rejection paths

**Modified:**
- `src/vanguard/types.ts` — add `ClashStatus`, `ClashState`, `ClashRejectionReason`, `ClashActionResult`
- `src/vanguard/config.ts` — add `CLASH_FIRST_ROUND_OPENER` (and the `PlayerSide` import it needs)
- `src/vanguard/index.ts` — barrel-export the five new names

**Deleted:** (none)

**Developer decides or observes:** (none) — both config defaults this ticket needs (`CLASH_FIRST_ROUND_OPENER`, and "unspent moves are lost") are transcribed directly from the ticket's own acceptance criteria, not invented. The structural judgement calls in `plan.md` Part 2 → Risks (the `ClashState` discriminated-union shape, whether `ClashAlreadyResolved` should exist) were surfaced at the Part 1/Part 2 review and are already folded into the approved design below — nothing here is still open, and there is no UI surface in this ticket for the developer to play.

---

## Phase 1 — Clash data shapes and config

This phase adds only types and one configuration constant — no logic yet. It is a safe stopping point because nothing new is called from anywhere: the project type-checks with these additions sitting unused, exactly as `types.ts` and `config.ts` already hold exports nothing in this ticket has wired up yet.

### Task 1: Add the Clash state and rejection types to `src/vanguard/types.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/types.ts` (append at end of file)

- [x] **Step 1: Append the four new type/const exports**

Add to the end of `src/vanguard/types.ts`:

```ts
export const ClashStatus = {
  InProgress: 'inProgress',
  Breached: 'breached',
  Complete: 'complete',
} as const
export type ClashStatus = (typeof ClashStatus)[keyof typeof ClashStatus]

export type ClashState =
  | {
      readonly status: typeof ClashStatus.InProgress
      readonly board: VanguardBoard
      readonly muster: Muster
      readonly turn: PlayerSide
    }
  | {
      readonly status: typeof ClashStatus.Breached
      readonly board: VanguardBoard
      readonly muster: Muster
      readonly winner: PlayerSide
    }
  | {
      readonly status: typeof ClashStatus.Complete
      readonly board: VanguardBoard
      readonly muster: Muster
    }

export const ClashRejectionReason = {
  NotYourTurn: 'notYourTurn',
  InsufficientMuster: 'insufficientMuster',
  ClashAlreadyResolved: 'clashAlreadyResolved',
} as const
export type ClashRejectionReason = (typeof ClashRejectionReason)[keyof typeof ClashRejectionReason]

export type ClashActionResult =
  | { readonly ok: true; readonly state: ClashState }
  | { readonly ok: false; readonly reason: IllegalActionReason | ClashRejectionReason }
```

`PlayerSide`, `Muster`, `VanguardBoard`, and `IllegalActionReason` are already defined or imported earlier in this file — no new imports needed for this block.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add the round-opener config constant to `src/vanguard/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/config.ts`

- [x] **Step 1: Import `PlayerSide` and append the constant**

Add the import at the top of `src/vanguard/config.ts`, alongside the existing `HexCoord` import:

```ts
import type { HexCoord } from './types'
import { PlayerSide } from '../warCouncil'
```

Append at the end of the file:

```ts
// --- Configuration: the round-opener default AC3 states outright (not a
// placeholder) — exposed as one constant so a later retune is one line ---
export const CLASH_FIRST_ROUND_OPENER: PlayerSide = PlayerSide.Cpu
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — Round-opener alternation

This phase adds one small, standalone pure function with no dependency on the turn-engine reducer built in Phase 3. It is a safe stopping point because `openingSideForRound` has no callers yet and no other file's behaviour depends on it.

### Task 3: Implement `openingSideForRound` in `src/vanguard/clashOpener.ts` ✓

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/clashOpener.ts`
- Test: `src/vanguard/__tests__/clashOpener.test.ts`

- [x] **Step 1: Write the failing test**

Create `src/vanguard/__tests__/clashOpener.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { openingSideForRound } from '../clashOpener'

describe('openingSideForRound', () => {
  it('has the CPU open round 1 and alternates every round thereafter', () => {
    expect(openingSideForRound(1)).toBe(PlayerSide.Cpu)
    expect(openingSideForRound(2)).toBe(PlayerSide.Player)
    expect(openingSideForRound(3)).toBe(PlayerSide.Cpu)
    expect(openingSideForRound(4)).toBe(PlayerSide.Player)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/clashOpener.test.ts`
Expected: fails — `clashOpener.ts` does not exist yet, so the import cannot resolve.

- [x] **Step 3: Implement `openingSideForRound`**

Create `src/vanguard/clashOpener.ts`:

```ts
import { otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'
import { CLASH_FIRST_ROUND_OPENER } from './config'

export function openingSideForRound(roundNumber: number): PlayerSide {
  const isOddRound = roundNumber % 2 === 1
  return isOddRound ? CLASH_FIRST_ROUND_OPENER : otherSide(CLASH_FIRST_ROUND_OPENER)
}
```

- [x] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/vanguard/__tests__/clashOpener.test.ts`
Expected: `Tests  1 passed`, exits 0.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 3 — The Clash turn engine and barrel wiring

This phase adds the actual reducer — the substantive logic of this ticket — and wires everything through the module's barrel. It is a safe stopping point because after this phase every export this ticket adds is both implemented and reachable from `src/vanguard/index.ts`, and the whole-project typecheck confirms nothing downstream broke.

### Task 4: Implement `startClash` and `applyClashAction` in `src/vanguard/clash.ts` ✓

> **Post-review fix (round 1):** Defender flagged that the affordability check silently passed a
> non-finite (`NaN`) `state.muster[side]`, letting a corrupted Muster value propagate instead of
> being rejected. Fixed by adding a `!Number.isFinite(state.muster[side])` guard, reusing the
> existing `ClashRejectionReason.InsufficientMuster`; one new test added proving the rejection.
> Verified non-tautological and re-approved by all three reviewers on the round-2 re-review.

- Skill: react-frontend

**Files:**
- Create: `src/vanguard/clash.ts`
- Test: `src/vanguard/__tests__/clash.test.ts`

- [x] **Step 1: Write the failing tests**

Create `src/vanguard/__tests__/clash.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../warCouncil'
import { applyClashAction, startClash } from '../clash'
import { OVERWRITE_COST } from '../config'
import {
  ClashRejectionReason,
  ClashStatus,
  IllegalActionReason,
  VanguardActionKind,
  VanguardCellKind,
} from '../types'
import { boardWith } from './testBoard'

describe('startClash', () => {
  it('builds an in-progress state with the given board, muster, and opening side', () => {
    const board = boardWith({})
    const state = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Cpu)
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) {
      expect(state.turn).toBe(PlayerSide.Cpu)
      expect(state.muster).toEqual({ player: 5, cpu: 5 })
      expect(state.board).toBe(board)
    }
  })
})

describe('applyClashAction', () => {
  it('alternates strictly, one action at a time, while both sides still have Muster', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '4,4': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    let state = startClash(board, { player: 2, cpu: 2 }, PlayerSide.Player)

    const first = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    if (!first.ok) throw new Error('expected ok')
    state = first.state
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Cpu)
    expect(state.muster).toEqual({ player: 1, cpu: 2 })

    const second = applyClashAction(state, PlayerSide.Cpu, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 4, r: 4 },
    })
    if (!second.ok) throw new Error('expected ok')
    state = second.state
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Player)
    expect(state.muster).toEqual({ player: 1, cpu: 1 })
  })

  it('locks the turn to the side with leftover Muster once the other side is exhausted, uncontested', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '4,4': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '2,2': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      '1,1': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    let state = startClash(board, { player: 1, cpu: 3 }, PlayerSide.Player)

    const playerMove = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    if (!playerMove.ok) throw new Error('expected ok')
    state = playerMove.state
    expect(state.status).toBe(ClashStatus.InProgress)
    if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Cpu)

    const outOfTurn = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    expect(outOfTurn).toEqual({ ok: false, reason: ClashRejectionReason.NotYourTurn })

    for (const target of [
      { q: 4, r: 4 },
      { q: 2, r: 2 },
      { q: 1, r: 1 },
    ]) {
      const cpuMove = applyClashAction(state, PlayerSide.Cpu, {
        kind: VanguardActionKind.Reinforce,
        target,
      })
      if (!cpuMove.ok) throw new Error('expected ok')
      state = cpuMove.state
      if (state.status === ClashStatus.InProgress) expect(state.turn).toBe(PlayerSide.Cpu)
    }

    expect(state.status).toBe(ClashStatus.Complete)
    expect(state.muster).toEqual({ player: 0, cpu: 0 })
  })

  it('ends the exchange immediately on a Breach, leaving both sides Muster unspent', () => {
    const bases = { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 2, r: 0 } }
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
      { size: 3, bases },
    )
    const state = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)

    const result = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Overwrite,
      target: { q: 2, r: 0 },
    })
    if (!result.ok) throw new Error('expected ok')
    expect(result.state.status).toBe(ClashStatus.Breached)
    if (result.state.status === ClashStatus.Breached) {
      expect(result.state.winner).toBe(PlayerSide.Player)
    }
    expect(result.state.muster).toEqual({ player: 5 - OVERWRITE_COST, cpu: 5 })

    const afterResolution = applyClashAction(result.state, PlayerSide.Cpu, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 2, r: 0 },
    })
    expect(afterResolution).toEqual({ ok: false, reason: ClashRejectionReason.ClashAlreadyResolved })
  })

  it('rejects an action submitted by the side that is not currently up', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const state = startClash(board, { player: 3, cpu: 3 }, PlayerSide.Player)
    const result = applyClashAction(state, PlayerSide.Cpu, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    expect(result).toEqual({ ok: false, reason: ClashRejectionReason.NotYourTurn })
  })

  it('rejects an action the side cannot afford, and the rejection spends nothing', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const state = startClash(board, { player: 1, cpu: 3 }, PlayerSide.Player)

    const tooExpensive = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Overwrite,
      target: { q: 1, r: 0 },
    })
    expect(tooExpensive).toEqual({ ok: false, reason: ClashRejectionReason.InsufficientMuster })

    const affordable = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 0, r: 0 },
    })
    if (!affordable.ok) throw new Error('expected ok')
    expect(affordable.state.muster.player).toBe(0)
  })

  it('bubbles a board-legality rejection from applyVanguardAction unchanged', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const state = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)

    const result = applyClashAction(state, PlayerSide.Player, {
      kind: VanguardActionKind.Reinforce,
      target: { q: 4, r: 4 },
    })
    expect(result).toEqual({ ok: false, reason: IllegalActionReason.TargetNotOwnToken })
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vanguard/__tests__/clash.test.ts`
Expected: fails — `clash.ts` does not exist yet, so the import cannot resolve.

- [x] **Step 3: Implement `startClash` and `applyClashAction`**

Create `src/vanguard/clash.ts`:

```ts
import { PlayerSide, otherSide } from '../warCouncil'
import { applyVanguardAction } from './applyVanguardAction'
import { hasReachedBreach } from './breach'
import { ClashRejectionReason, ClashStatus } from './types'
import type { ClashActionResult, ClashState, Muster, VanguardAction, VanguardBoard } from './types'

export function startClash(
  board: VanguardBoard,
  muster: Muster,
  openingSide: PlayerSide,
): ClashState {
  return { status: ClashStatus.InProgress, board, muster, turn: openingSide }
}

export function applyClashAction(
  state: ClashState,
  side: PlayerSide,
  action: VanguardAction,
): ClashActionResult {
  if (state.status !== ClashStatus.InProgress) {
    return { ok: false, reason: ClashRejectionReason.ClashAlreadyResolved }
  }
  if (side !== state.turn) {
    return { ok: false, reason: ClashRejectionReason.NotYourTurn }
  }

  const result = applyVanguardAction(state.board, side, action)
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }
  if (result.cost > state.muster[side]) {
    return { ok: false, reason: ClashRejectionReason.InsufficientMuster }
  }

  const muster: Muster = { ...state.muster, [side]: state.muster[side] - result.cost }
  const board = result.board

  if (hasReachedBreach(board, side)) {
    return { ok: true, state: { status: ClashStatus.Breached, board, muster, winner: side } }
  }

  const playerHasMoves = muster.player > 0
  const cpuHasMoves = muster.cpu > 0

  if (playerHasMoves && cpuHasMoves) {
    return { ok: true, state: { status: ClashStatus.InProgress, board, muster, turn: otherSide(side) } }
  }
  if (!playerHasMoves && !cpuHasMoves) {
    return { ok: true, state: { status: ClashStatus.Complete, board, muster } }
  }

  const leftoverSide = playerHasMoves ? PlayerSide.Player : PlayerSide.Cpu
  return { ok: true, state: { status: ClashStatus.InProgress, board, muster, turn: leftoverSide } }
}
```

- [x] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/vanguard/__tests__/clash.test.ts`
Expected: `Tests  7 passed`, exits 0.

- [x] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 5: Wire the barrel exports in `src/vanguard/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/vanguard/index.ts` (append at end of file)

- [x] **Step 1: Append the five new export lines**

Add to the end of `src/vanguard/index.ts`:

```ts
export { ClashStatus, ClashRejectionReason } from './types'
export type { ClashState, ClashActionResult } from './types'
export { CLASH_FIRST_ROUND_OPENER } from './config'
export { startClash, applyClashAction } from './clash'
export { openingSideForRound } from './clashOpener'
```

- [x] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

- [x] **Step 3: Run the scoped Vanguard test files**

Run: `npx vitest run src/vanguard/__tests__/clash.test.ts src/vanguard/__tests__/clashOpener.test.ts`
Expected: `Tests  8 passed`, exits 0.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 6: Confirm the pure-core boundary still holds for `src/vanguard/` ✓

- [x] **Step 1: Grep the two new source files for React or DOM references**

Run: `Select-String -Path src\vanguard\clash.ts,src\vanguard\clashOpener.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. — Confirmed: zero hits.

### Task 7: Confirm no tunable was hard-coded and every new name is used consistently ✓

- [x] **Step 1: Grep for the new round-opener literal outside its config declaration**

Run: `Select-String -Path src\vanguard\*.ts,src\vanguard\__tests__\*.ts -Pattern "CLASH_FIRST_ROUND_OPENER"`
Expected: hits only in `config.ts` (the declaration) and `clashOpener.ts` (the one consumer) — no inlined `PlayerSide.Cpu` standing in for it anywhere else in the round-opener logic. — Confirmed: hits in `config.ts` (declaration) and `clashOpener.ts` (two lines, its one consumer) and `index.ts` (barrel re-export) only.

- [x] **Step 2: Grep for the new identifiers to confirm consistent naming across every file that uses them**

Run: `Select-String -Path src\vanguard\*.ts,src\vanguard\__tests__\*.ts -Pattern "ClashState|ClashStatus|ClashRejectionReason|ClashActionResult|applyClashAction|startClash|openingSideForRound"`
Expected: every name appears in `types.ts` (declaration), its implementation file, its test file, and `index.ts` (barrel) — no alternate spelling or casing anywhere. — Confirmed: every identifier appears consistently spelled in `types.ts`, `clash.ts`/`clashOpener.ts`, `index.ts`, and both `__tests__` files; no alternate casing found.

### Task 8: Static gates and full suite ✓

- [x] **Step 1: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. — Confirmed: `tsc -b` and `eslint .` both completed with no errors reported.

- [x] **Step 1b (ran by QA): the unfiltered `npm test`** — `Test Files 23 passed (23)`, `Tests 135 passed (135)`.

- [x] **Step 2 (ran by QA): Production build (`npm run build`)** — exits 0, `dist/` written, no bundler errors.

### Task 9: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: adds the Clash turn engine (`applyClashAction`, `startClash`) and the round-opener alternation (`openingSideForRound`) to `src/vanguard/` — strict alternation while both sides have Muster, uncontested leftover spend once one side is exhausted, a per-action Breach check that can end the round mid-exchange, and unspent Muster that is simply never banked.
- Note that both config defaults this ticket needed (`CLASH_FIRST_ROUND_OPENER = Cpu`, and unspent moves being lost) were transcribed directly from the ticket's own acceptance criteria — nothing was left for the developer to choose.
- Note the judgement calls from `plan.md` Part 2 → Risks for the developer's awareness: the `ClashState` discriminated-union shape, the existence of the `ClashAlreadyResolved` rejection, and that a side with Muster left but nothing affordable/legal has no built-in escape (out of scope — action selection is a future ticket).
- Verification results from Task 8 (typecheck/lint/test/build all green).
- A one-line note for future contributors: any future orchestrator wiring `ClashState` into `BattleState` should read `.docs/implementation/vanguard.md`'s Deferred section first — this ticket deliberately does not touch `src/battle/`.

---

## Self-review

**Spec coverage:**
- AC1 (strict alternation) — Task 4, test "alternates strictly, one action at a time, while both sides still have Muster".
- AC2 (uncontested leftover, no further alternation) — Task 4, test "locks the turn to the side with leftover Muster... uncontested" (including the explicit out-of-turn rejection assertion).
- AC3 (round-opener default, single named function/flag) — Task 2 (`CLASH_FIRST_ROUND_OPENER`), Task 3 (`openingSideForRound`).
- AC4 (Breach checked after every action, round can end mid-exchange) — Task 4, test "ends the exchange immediately on a Breach, leaving both sides Muster unspent".
- AC5 (unspent moves at natural end are lost, not banked) — Task 4, test "locks the turn..." (asserts `Complete` with `{ player: 0, cpu: 0 }`, no field anywhere to hold a banked value) and the `ClashState` type shape from Task 1 (the `Complete` variant has no leftover field at all).
- AC6 (the four named test scenarios) — all four are present: strict alternation, uncontested leftover, Breach mid-exchange, and round-opener alternation across two-plus consecutive rounds (Task 3).
- Scope boundary (turn order and round-end only, not action selection) — no task adds CPU or UI logic; every test action is a hand-picked `VanguardAction` passed in by the test itself.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `ClashStatus`, `ClashState`, `ClashRejectionReason`, `ClashActionResult` (Task 1) are imported and used identically in `clash.ts` (Task 4), `index.ts` (Task 5), and both test files (Tasks 3–4) — no alternate name introduced anywhere. `CLASH_FIRST_ROUND_OPENER` (Task 2) has exactly one declaration and one consumer (Task 3), confirmed by the Task 7 grep. `openingSideForRound`, `startClash`, and `applyClashAction` each have exactly one implementation and are re-exported once from `index.ts`.

**Phase boundary cleanliness:** Phase 1 ends with two new type/config additions that nothing yet imports — the project type-checks with them sitting unused. Phase 2 ends with `clashOpener.ts` fully implemented and tested but not yet re-exported from `index.ts` — an internal, self-contained addition with no dangling import anywhere else in the tree. Phase 3 ends with every new export both implemented and reachable from the barrel, confirmed by a whole-project typecheck and a scoped test run — no half-applied rename, no dead import. Phase 4 makes no production change.
