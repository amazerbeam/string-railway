# Tasks: Battle loop orchestrator — War Council → Muster → Clash → Breach/loop

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-04

**Goal:** Build the code that sequences a full battle end to end — one `BattleState` moves through War Council round → Muster conversion → The Clash → (Breach, or loop back to the next round with the same persistent Vanguard board and an alternated dealer) — wiring together the four already-built engines with no CPU logic or UI.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/battle/config.ts` — `WAR_COUNCIL_FIRST_DEALER` configuration constant
- `src/battle/battleAction.ts` — `BattleRejectionReason` and `BattleActionResult`
- `src/battle/startBattle.ts` — battle-start function
- `src/battle/submitWarCouncilCard.ts` — War Council card submission + round-completion transition
- `src/battle/beginClash.ts` — Muster-conversion-to-Clash transition
- `src/battle/submitClashAction.ts` — Clash action submission + Breach/next-round transitions
- `src/battle/__tests__/startBattle.test.ts`
- `src/battle/__tests__/submitWarCouncilCard.test.ts`
- `src/battle/__tests__/beginClash.test.ts`
- `src/battle/__tests__/submitClashAction.test.ts`
- `src/battle/__tests__/battleTestHelpers.ts` — test-only scripted drivers (not re-exported from `index.ts`)
- `src/battle/__tests__/battleLoop.integration.test.ts` — AC5's 2+ full simulated battles

**Modified:**
- `src/battle/battleState.ts` — replaces the SCRUM-19 placeholder interface with a 4-variant discriminated union
- `src/battle/index.ts` — barrel exports for the new config, types, and functions

**Deleted:** (none)

**Developer decides or observes:**
- config → `WAR_COUNCIL_FIRST_DEALER` — no stated default exists anywhere in the brief or design docs; placeholdered to `PlayerSide.Player` in `src/battle/config.ts`. Flip it in one line if you want the other side or want it to contrast with `CLASH_FIRST_ROUND_OPENER`'s `Cpu` default.
- Whether `MusterConversion` should remain its own explicit, driver-called phase (`beginClash`) — this plan's choice — versus being folded silently into `submitWarCouncilCard`'s round-completion branch.
- Whether `submitClashAction` auto-dealing the next round on a natural (non-Breach) Clash end is the right API shape, versus a separate explicit `startNextWarCouncilRound(state, rng)` call.
- Whether the integration test's "nearest-cell-first" Clash script reads as acceptably "CPU-free scripted" per AC5, or whether a stricter reading (a literal hardcoded coordinate path) is wanted instead.

---

## Phase 1 — BattleState redesign and shared result/config types

This phase replaces the SCRUM-19 placeholder `BattleState` with the real discriminated union the orchestrator needs, and adds the two small type/config modules every later function in this contract depends on. Nothing here has runtime behaviour beyond type declarations and one constant — the phase ends fully type-checked, with `src/battle/index.ts`'s existing barrel still resolving correctly against the new `BattleState` shape.

### Task 1: Replace the placeholder `BattleState` with a 4-variant discriminated union ✓

- Skill: react-frontend

**Files:**
- Modify: `src/battle/battleState.ts`

- [x] **Step 1: Replace the file's contents with the phase-keyed union**

```ts
import type { PlayerSide, WarCouncilState } from '../warCouncil'
import type { VanguardState, ClashState } from '../vanguard'
import { BattlePhase } from './battlePhase'

export type BattleState =
  | {
      readonly phase: typeof BattlePhase.WarCouncilRound
      readonly round: number
      readonly dealer: PlayerSide
      readonly vanguard: VanguardState
      readonly warCouncil: WarCouncilState
    }
  | {
      readonly phase: typeof BattlePhase.MusterConversion
      readonly round: number
      readonly dealer: PlayerSide
      readonly vanguard: VanguardState
      readonly warCouncil: WarCouncilState
    }
  | {
      readonly phase: typeof BattlePhase.Clash
      readonly round: number
      readonly dealer: PlayerSide
      readonly clash: ClashState
    }
  | {
      readonly phase: typeof BattlePhase.Resolved
      readonly round: number
      readonly vanguard: VanguardState
      readonly winner: PlayerSide
    }
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. Confirms `src/battle/index.ts`'s existing `export type { BattleState } from './battleState'` and `src/battle/__tests__/battlePhase.test.ts` (which only imports `BattlePhase`, never `BattleState`) both still resolve cleanly.

### Task 2: Add the `WAR_COUNCIL_FIRST_DEALER` configuration constant ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/config.ts`
- Config: `src/battle/config.ts` — new configuration constant; value is a developer decision (see File map)

- [x] **Step 1: Write the config file**

```ts
import { PlayerSide } from '../warCouncil'

// --- Configuration: no stated default in the brief or design docs for who deals
// round 1 of a battle — placeholder pending developer confirmation (see plan.md
// Part 1 -> Risks and judgement calls) ---
export const WAR_COUNCIL_FIRST_DEALER: PlayerSide = PlayerSide.Player
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 3: Add `BattleRejectionReason` and `BattleActionResult` ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/battleAction.ts`

- [x] **Step 1: Write the rejection-reason map and the shared result type**

```ts
import type { IllegalMoveReason } from '../warCouncil'
import type { IllegalActionReason, ClashRejectionReason } from '../vanguard'
import type { BattleState } from './battleState'

export const BattleRejectionReason = {
  NotWarCouncilPhase: 'notWarCouncilPhase',
  NotMusterConversionPhase: 'notMusterConversionPhase',
  NotClashPhase: 'notClashPhase',
} as const
export type BattleRejectionReason = (typeof BattleRejectionReason)[keyof typeof BattleRejectionReason]

export type BattleActionResult =
  | { readonly ok: true; readonly state: BattleState }
  | {
      readonly ok: false
      readonly reason:
        | BattleRejectionReason
        | IllegalMoveReason
        | IllegalActionReason
        | ClashRejectionReason
    }
```

- [x] **Step 2: Typecheck — closes Phase 1**

Run: `npm run typecheck`
Expected: exits 0. All three new/modified files in this phase combine cleanly; no half-applied type.

---

## Phase 2 — Battle lifecycle functions

This phase builds the four functions that actually drive the state machine — one per arrow in `hybrid-concept.md`'s battle-loop diagram — plus the shared test helper that plays a full War Council round. Each task is TDD: write the test against the not-yet-existing module (confirms the right failure), implement, confirm green. The phase ends with all four functions typechecking and passing their own focused unit tests; nothing here yet drives a full battle to a Breach — that is Phase 3.

### Task 4: `startBattle` ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/startBattle.ts`
- Test: `src/battle/__tests__/startBattle.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { BattlePhase } from '../battlePhase'
import { WAR_COUNCIL_FIRST_DEALER } from '../config'
import { RoundPhase } from '../../warCouncil'

describe('startBattle', () => {
  it('starts round 1 in the WarCouncilRound phase, dealt by the configured first dealer', () => {
    const state = startBattle(() => 0.5)
    expect(state.phase).toBe(BattlePhase.WarCouncilRound)
    expect(state.round).toBe(1)
    expect(state.dealer).toBe(WAR_COUNCIL_FIRST_DEALER)
    if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    expect(state.warCouncil.dealer).toBe(WAR_COUNCIL_FIRST_DEALER)
    expect(state.warCouncil.phase).toBe(RoundPhase.AwaitingLead)
    expect(state.warCouncil.hands.player).toHaveLength(13)
    expect(state.warCouncil.hands.cpu).toHaveLength(13)
  })

  it('creates a fresh Vanguard board on every call, not a shared reference', () => {
    const a = startBattle(() => 0.1)
    const b = startBattle(() => 0.1)
    expect(a.vanguard).not.toBe(b.vanguard)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/battle/__tests__/startBattle.test.ts`
Expected: fails — `startBattle.ts` does not exist yet (module resolution error).

- [x] **Step 3: Implement**

```ts
import { createVanguardBoard } from '../vanguard'
import { dealRound } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { WAR_COUNCIL_FIRST_DEALER } from './config'
import type { BattleState } from './battleState'

export function startBattle(rng: () => number): BattleState {
  const dealer = WAR_COUNCIL_FIRST_DEALER
  return {
    phase: BattlePhase.WarCouncilRound,
    round: 1,
    dealer,
    vanguard: createVanguardBoard(),
    warCouncil: dealRound(dealer, rng),
  }
}
```

- [x] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/battle/__tests__/startBattle.test.ts`
Expected: 2 passed.

### Task 5: `submitWarCouncilCard` ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/submitWarCouncilCard.ts`
- Test: `src/battle/__tests__/submitWarCouncilCard.test.ts`

- [x] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { submitWarCouncilCard } from '../submitWarCouncilCard'
import { startBattle } from '../startBattle'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  legalMoves,
  PlayerSide,
  Suit,
} from '../../warCouncil'
import type { BattleState } from '../battleState'

describe('submitWarCouncilCard', () => {
  it('rejects a card submitted outside the WarCouncilRound phase', () => {
    const started = startBattle(() => 0.5)
    const resolved: BattleState = {
      phase: BattlePhase.Resolved,
      round: 1,
      vanguard: started.vanguard,
      winner: PlayerSide.Player,
    }
    const result = submitWarCouncilCard(resolved, PlayerSide.Player, { suit: Suit.Bells, rank: 2 })
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotWarCouncilPhase })
  })

  it('bubbles an illegal-move rejection from playCard unchanged', () => {
    const state = startBattle(() => 0.5)
    if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    const side = currentTurn(state.warCouncil)
    const result = submitWarCouncilCard(state, side, { suit: Suit.Bells, rank: 999 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.CardNotInHand })
  })

  it('advances the round and stays in WarCouncilRound after one legal card', () => {
    const state = startBattle(() => 0.5)
    if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    const side = currentTurn(state.warCouncil)
    const card = legalMoves(state.warCouncil, side)[0]
    const choice = card.rank === CardRank.Fox ? { kind: AbilityChoiceKind.FoxDecline } : undefined
    const result = submitWarCouncilCard(state, side, card, choice)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.WarCouncilRound)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/battle/__tests__/submitWarCouncilCard.test.ts`
Expected: fails — `submitWarCouncilCard.ts` does not exist yet.

- [x] **Step 3: Implement**

```ts
import { playCard, RoundPhase } from '../warCouncil'
import type { AbilityChoice, Card, PlayerSide } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'

export function submitWarCouncilCard(
  state: BattleState,
  side: PlayerSide,
  card: Card,
  choice?: AbilityChoice,
): BattleActionResult {
  if (state.phase !== BattlePhase.WarCouncilRound) {
    return { ok: false, reason: BattleRejectionReason.NotWarCouncilPhase }
  }

  const result = playCard(state.warCouncil, side, card, choice)
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }

  if (result.state.phase === RoundPhase.Complete) {
    return {
      ok: true,
      state: { ...state, phase: BattlePhase.MusterConversion, warCouncil: result.state },
    }
  }

  return { ok: true, state: { ...state, warCouncil: result.state } }
}
```

- [x] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/battle/__tests__/submitWarCouncilCard.test.ts`
Expected: 3 passed.

### Task 6: Scripted War Council driver + round-completion coverage ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/__tests__/battleTestHelpers.ts`
- Modify: `src/battle/__tests__/submitWarCouncilCard.test.ts`

- [x] **Step 1: Write the test-only scripted driver**

```ts
import { AbilityChoiceKind, CardRank, currentTurn, legalMoves } from '../../warCouncil'
import type { AbilityChoice, Card } from '../../warCouncil'
import { BattlePhase } from '../battlePhase'
import { submitWarCouncilCard } from '../submitWarCouncilCard'
import type { BattleState } from '../battleState'

// A fixed, non-adaptive script: always plays the first legal card, declines Fox,
// and discards the just-drawn card on Woodcutter. Used only to drive a War Council
// round to completion in tests — not CPU decision-making.
export function autoPlayWarCouncilRound(state: BattleState): BattleState {
  let current = state
  while (current.phase === BattlePhase.WarCouncilRound) {
    const side = currentTurn(current.warCouncil)
    const card = legalMoves(current.warCouncil, side)[0]
    const choice = abilityChoiceFor(card, current.warCouncil.drawPile[0])
    const result = submitWarCouncilCard(current, side, card, choice)
    if (!result.ok) throw new Error(`scripted war council move rejected: ${result.reason}`)
    current = result.state
  }
  return current
}

function abilityChoiceFor(card: Card, drawnCard: Card): AbilityChoice | undefined {
  if (card.rank === CardRank.Fox) return { kind: AbilityChoiceKind.FoxDecline }
  if (card.rank === CardRank.Woodcutter) {
    return { kind: AbilityChoiceKind.WoodcutterDiscard, discard: drawnCard }
  }
  return undefined
}
```

- [x] **Step 2: Add a round-completion test using the driver, and confirm it fails to compile first**

Add to `src/battle/__tests__/submitWarCouncilCard.test.ts`, importing `autoPlayWarCouncilRound` from `./battleTestHelpers` and `RoundPhase` from `'../../warCouncil'` in its existing import list:

```ts
  it('reaches MusterConversion after a full round of legal play', () => {
    const state = startBattle(() => 0.42)
    const after = autoPlayWarCouncilRound(state)
    expect(after.phase).toBe(BattlePhase.MusterConversion)
    if (after.phase !== BattlePhase.MusterConversion) throw new Error('expected MusterConversion')
    expect(after.warCouncil.phase).toBe(RoundPhase.Complete)
    expect(after.warCouncil.tricksPlayed).toBe(13)
    expect(after.warCouncil.tricksWon.player + after.warCouncil.tricksWon.cpu).toBe(13)
  })
```

Run: `npx vitest run src/battle/__tests__/submitWarCouncilCard.test.ts`
Expected: this new test passes immediately (it exercises already-implemented `submitWarCouncilCard` through the new driver) — confirms the driver itself is correct, since there is no separate "fail" state to observe here.

- [x] **Step 3: Run the full file and confirm all four tests pass**

Run: `npx vitest run src/battle/__tests__/submitWarCouncilCard.test.ts`
Expected: 4 passed.

### Task 7: `beginClash` ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/beginClash.ts`
- Test: `src/battle/__tests__/beginClash.test.ts`

- [x] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { beginClash } from '../beginClash'
import { startBattle } from '../startBattle'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { autoPlayWarCouncilRound } from './battleTestHelpers'
import { ClashStatus, MUSTER_BASELINE, openingSideForRound } from '../../vanguard'

describe('beginClash', () => {
  it('rejects a call outside the MusterConversion phase', () => {
    const state = startBattle(() => 0.5)
    const result = beginClash(state)
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotMusterConversionPhase })
  })

  it('converts the completed round score into Muster and opens the Clash', () => {
    const started = startBattle(() => 0.42)
    const afterRound = autoPlayWarCouncilRound(started)
    if (afterRound.phase !== BattlePhase.MusterConversion) throw new Error('expected MusterConversion')

    const result = beginClash(afterRound)
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.Clash)
    if (result.state.phase !== BattlePhase.Clash) throw new Error('expected Clash')
    expect(result.state.clash.status).toBe(ClashStatus.InProgress)
    if (result.state.clash.status !== ClashStatus.InProgress) throw new Error('expected InProgress')
    expect(result.state.clash.muster.player).toBeGreaterThanOrEqual(MUSTER_BASELINE)
    expect(result.state.clash.muster.cpu).toBeGreaterThanOrEqual(MUSTER_BASELINE)
    expect(result.state.clash.turn).toBe(openingSideForRound(afterRound.round))
    expect(result.state.clash.board).toBe(afterRound.vanguard)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/battle/__tests__/beginClash.test.ts`
Expected: fails — `beginClash.ts` does not exist yet.

- [x] **Step 3: Implement**

```ts
import { scoreRound } from '../warCouncil'
import { convertScoreToMuster, openingSideForRound, startClash } from '../vanguard'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'

export function beginClash(state: BattleState): BattleActionResult {
  if (state.phase !== BattlePhase.MusterConversion) {
    return { ok: false, reason: BattleRejectionReason.NotMusterConversionPhase }
  }

  const score = scoreRound(state.warCouncil.tricksWon)
  const muster = convertScoreToMuster(score)
  const openingSide = openingSideForRound(state.round)
  const clash = startClash(state.vanguard, muster, openingSide)

  return {
    ok: true,
    state: { phase: BattlePhase.Clash, round: state.round, dealer: state.dealer, clash },
  }
}
```

- [x] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/battle/__tests__/beginClash.test.ts`
Expected: 2 passed.

### Task 8: `submitClashAction` ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/submitClashAction.ts`
- Test: `src/battle/__tests__/submitClashAction.test.ts`

- [x] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { submitClashAction } from '../submitClashAction'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { boardWith } from '../../vanguard/__tests__/testBoard'
import { PlayerSide } from '../../warCouncil'
import {
  ClashRejectionReason,
  VanguardActionKind,
  VanguardCellKind,
  startClash,
} from '../../vanguard'
import type { BattleState } from '../battleState'

describe('submitClashAction', () => {
  it('rejects an action submitted outside the Clash phase', () => {
    const board = boardWith({})
    const resolved: BattleState = {
      phase: BattlePhase.Resolved,
      round: 1,
      vanguard: board,
      winner: PlayerSide.Player,
    }
    const result = submitClashAction(
      resolved,
      PlayerSide.Player,
      { kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } },
      () => 0.5,
    )
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotClashPhase })
  })

  it('bubbles a rejection from applyClashAction unchanged', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
    })
    const clash = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)
    const state: BattleState = { phase: BattlePhase.Clash, round: 1, dealer: PlayerSide.Player, clash }

    const result = submitClashAction(
      state,
      PlayerSide.Cpu,
      { kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } },
      () => 0.5,
    )
    expect(result).toEqual({ ok: false, reason: ClashRejectionReason.NotYourTurn })
  })

  it('resolves the battle on a Breach, naming the winner and the final board', () => {
    const bases = { [PlayerSide.Player]: { q: 0, r: 0 }, [PlayerSide.Cpu]: { q: 2, r: 0 } }
    const board = boardWith(
      {
        '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '1,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
        '2,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
      },
      { size: 3, bases },
    )
    const clash = startClash(board, { player: 5, cpu: 5 }, PlayerSide.Player)
    const state: BattleState = { phase: BattlePhase.Clash, round: 1, dealer: PlayerSide.Player, clash }

    const result = submitClashAction(
      state,
      PlayerSide.Player,
      { kind: VanguardActionKind.Overwrite, target: { q: 2, r: 0 } },
      () => 0.5,
    )
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.Resolved)
    if (result.state.phase !== BattlePhase.Resolved) throw new Error('expected Resolved')
    expect(result.state.winner).toBe(PlayerSide.Player)
    expect(result.state.vanguard.cells['2,0']).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 0,
    })
  })

  it('deals the next War Council round on a natural Clash end, alternating the dealer and persisting the board', () => {
    const board = boardWith({
      '0,0': { kind: VanguardCellKind.Token, owner: PlayerSide.Player, reinforced: 0 },
      '4,4': { kind: VanguardCellKind.Token, owner: PlayerSide.Cpu, reinforced: 0 },
    })
    const clash = startClash(board, { player: 1, cpu: 0 }, PlayerSide.Player)
    const state: BattleState = { phase: BattlePhase.Clash, round: 1, dealer: PlayerSide.Player, clash }

    const result = submitClashAction(
      state,
      PlayerSide.Player,
      { kind: VanguardActionKind.Reinforce, target: { q: 0, r: 0 } },
      () => 0.77,
    )
    if (!result.ok) throw new Error(`expected ok, got ${result.reason}`)
    expect(result.state.phase).toBe(BattlePhase.WarCouncilRound)
    if (result.state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    expect(result.state.round).toBe(2)
    expect(result.state.dealer).toBe(PlayerSide.Cpu)
    expect(result.state.vanguard.cells['0,0']).toEqual({
      kind: VanguardCellKind.Token,
      owner: PlayerSide.Player,
      reinforced: 1,
    })
    expect(result.state.warCouncil.dealer).toBe(PlayerSide.Cpu)
  })
})
```

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/battle/__tests__/submitClashAction.test.ts`
Expected: fails — `submitClashAction.ts` does not exist yet.

- [x] **Step 3: Implement**

```ts
import { dealRound, otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'
import { applyClashAction, ClashStatus } from '../vanguard'
import type { VanguardAction } from '../vanguard'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'

export function submitClashAction(
  state: BattleState,
  side: PlayerSide,
  action: VanguardAction,
  rng: () => number,
): BattleActionResult {
  if (state.phase !== BattlePhase.Clash) {
    return { ok: false, reason: BattleRejectionReason.NotClashPhase }
  }

  const result = applyClashAction(state.clash, side, action)
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }

  if (result.state.status === ClashStatus.Breached) {
    return {
      ok: true,
      state: {
        phase: BattlePhase.Resolved,
        round: state.round,
        vanguard: result.state.board,
        winner: result.state.winner,
      },
    }
  }

  if (result.state.status === ClashStatus.Complete) {
    const round = state.round + 1
    const dealer = otherSide(state.dealer)
    return {
      ok: true,
      state: {
        phase: BattlePhase.WarCouncilRound,
        round,
        dealer,
        vanguard: result.state.board,
        warCouncil: dealRound(dealer, rng),
      },
    }
  }

  return { ok: true, state: { ...state, clash: result.state } }
}
```

- [x] **Step 4: Run and confirm it passes**

Run: `npx vitest run src/battle/__tests__/submitClashAction.test.ts`
Expected: 4 passed.

---

## Phase 3 — Integration coverage and barrel

This phase adds the aggressive scripted Clash driver, wires every new export through `src/battle/index.ts`, and writes the AC5 integration test that runs full battles to a Breach. The phase ends with the whole `src/battle/` suite green, including two full simulated battles — the highest-value check in this contract, since it is the only test exercising every function in sequence the way a real driver eventually will.

### Task 9: Update the `src/battle/index.ts` barrel ✓

- Skill: react-frontend

**Files:**
- Modify: `src/battle/index.ts`

- [x] **Step 1: Add the new exports**

```ts
export { BattlePhase } from './battlePhase'
export type { BattleState } from './battleState'
export { WAR_COUNCIL_FIRST_DEALER } from './config'
export { BattleRejectionReason } from './battleAction'
export type { BattleActionResult } from './battleAction'
export { startBattle } from './startBattle'
export { submitWarCouncilCard } from './submitWarCouncilCard'
export { beginClash } from './beginClash'
export { submitClashAction } from './submitClashAction'
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 10: Scripted Clash driver (nearest-cell-first policy) ✓

- Skill: react-frontend

**Files:**
- Modify: `src/battle/__tests__/battleTestHelpers.ts`

- [x] **Step 1: Add the aggressive scripted Clash action and the passive local one** — see Notes below for the deviations from the snippet found necessary during Step 2 of Task 11.

Add to `src/battle/__tests__/battleTestHelpers.ts`, extending its existing imports with the vanguard names below and `otherSide` from `'../../warCouncil'`:

```ts
import {
  allBoardCoords,
  cellKey,
  connectedNetwork,
  EXPAND_RANGE,
  hexDistance,
  minDistanceToNetwork,
  VanguardActionKind,
  VanguardCellKind,
} from '../../vanguard'
import type { VanguardAction, VanguardState } from '../../vanguard'
import { otherSide } from '../../warCouncil'
import type { PlayerSide } from '../../warCouncil'

// A fixed, distance-minimizing script: always closes the gap to the opponent's
// base by the shortest available legal move. No lookahead, no evaluation of
// alternatives, no hidden-information reasoning — not CPU decision-making.
export function scriptedClashAction(board: VanguardState, side: PlayerSide): VanguardAction {
  const opponent = otherSide(side)
  const opponentBase = board.bases[opponent]
  const network = connectedNetwork(board, side)

  if (minDistanceToNetwork(opponentBase, network) <= 1) {
    const baseCell = board.cells[cellKey(opponentBase)]
    if (baseCell?.kind === VanguardCellKind.Token && baseCell.owner === opponent) {
      return { kind: VanguardActionKind.Overwrite, target: opponentBase }
    }
  }

  const byDistanceToOpponentBase = (a: { q: number; r: number }, b: { q: number; r: number }) =>
    hexDistance(a, opponentBase) - hexDistance(b, opponentBase) ||
    cellKey(a).localeCompare(cellKey(b))

  const empty = allBoardCoords(board.size)
    .filter((coord) => board.cells[cellKey(coord)] === undefined)
    .filter((coord) => minDistanceToNetwork(coord, network) <= EXPAND_RANGE)
    .sort(byDistanceToOpponentBase)
  if (empty.length > 0) {
    return { kind: VanguardActionKind.Expand, target: empty[0] }
  }

  const enemyAdjacent = allBoardCoords(board.size)
    .filter((coord) => {
      const cell = board.cells[cellKey(coord)]
      return cell?.kind === VanguardCellKind.Token && cell.owner === opponent
    })
    .filter((coord) => minDistanceToNetwork(coord, network) <= 1)
    .sort(byDistanceToOpponentBase)
  if (enemyAdjacent.length > 0) {
    return { kind: VanguardActionKind.Overwrite, target: enemyAdjacent[0] }
  }

  const ownUnreinforced = allBoardCoords(board.size)
    .filter((coord) => {
      const cell = board.cells[cellKey(coord)]
      return cell?.kind === VanguardCellKind.Token && cell.owner === side && cell.reinforced === 0
    })
    .sort((a, b) => cellKey(a).localeCompare(cellKey(b)))
  if (ownUnreinforced.length > 0) {
    return { kind: VanguardActionKind.Reinforce, target: ownUnreinforced[0] }
  }

  throw new Error('scriptedClashAction: no legal action available for this side')
}

// A fixed, non-seeking script: reinforces or expands only from the side's own
// network, never targeting the opponent — used for the defending side in the
// integration test so the attacking side's march is not contested.
export function scriptedLocalAction(board: VanguardState, side: PlayerSide): VanguardAction {
  const network = connectedNetwork(board, side)

  const ownUnreinforced = allBoardCoords(board.size)
    .filter((coord) => {
      const cell = board.cells[cellKey(coord)]
      return cell?.kind === VanguardCellKind.Token && cell.owner === side && cell.reinforced === 0
    })
    .sort((a, b) => cellKey(a).localeCompare(cellKey(b)))
  if (ownUnreinforced.length > 0) {
    return { kind: VanguardActionKind.Reinforce, target: ownUnreinforced[0] }
  }

  const empty = allBoardCoords(board.size)
    .filter((coord) => board.cells[cellKey(coord)] === undefined)
    .filter((coord) => minDistanceToNetwork(coord, network) <= EXPAND_RANGE)
    .sort((a, b) => cellKey(a).localeCompare(cellKey(b)))
  if (empty.length > 0) {
    return { kind: VanguardActionKind.Expand, target: empty[0] }
  }

  throw new Error('scriptedLocalAction: no legal action available for this side')
}
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 11: Integration test — 2+ full simulated battles to a Breach ✓

- Skill: react-frontend

**Files:**
- Create: `src/battle/__tests__/battleLoop.integration.test.ts`

- [x] **Step 1: Write the integration test** — implemented as shown, with two call-site adjustments carried through from Task 10's deviation (see Notes): `scriptedClashAction`/`scriptedLocalAction` calls pass `clash.muster[side]` as a third argument.

```ts
import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { beginClash } from '../beginClash'
import { submitClashAction } from '../submitClashAction'
import { BattlePhase } from '../battlePhase'
import { autoPlayWarCouncilRound, scriptedClashAction, scriptedLocalAction } from './battleTestHelpers'
import { PlayerSide } from '../../warCouncil'
import { ClashStatus } from '../../vanguard'
import type { VanguardState } from '../../vanguard'
import type { BattleState } from '../battleState'

function seededRng(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

function runBattleToResolution(seed: number) {
  const rng = seededRng(seed)
  let state: BattleState = startBattle(rng)
  const roundStartBoards: VanguardState[] = []

  while (state.phase !== BattlePhase.Resolved) {
    if (state.phase === BattlePhase.WarCouncilRound) {
      roundStartBoards.push(state.vanguard)
      state = autoPlayWarCouncilRound(state)
      continue
    }
    if (state.phase === BattlePhase.MusterConversion) {
      const result = beginClash(state)
      if (!result.ok) throw new Error(`beginClash rejected: ${result.reason}`)
      state = result.state
      continue
    }

    const clash = state.clash
    const side = clash.status === ClashStatus.InProgress ? clash.turn : PlayerSide.Player
    const action =
      side === PlayerSide.Player
        ? scriptedClashAction(clash.board, side)
        : scriptedLocalAction(clash.board, side)
    const result = submitClashAction(state, side, action, rng)
    if (!result.ok) throw new Error(`submitClashAction rejected: ${result.reason}`)
    state = result.state
  }

  return { state, roundStartBoards }
}

function claimedCellCount(board: VanguardState): number {
  return Object.values(board.cells).filter((cell) => cell?.kind === 'token').length
}

describe('battle loop integration', () => {
  it.each([1, 2])(
    'runs a full battle to a Breach with a persistent, ever-growing board (seed %i)',
    (seed) => {
      const { state, roundStartBoards } = runBattleToResolution(seed)

      expect(state.phase).toBe(BattlePhase.Resolved)
      if (state.phase !== BattlePhase.Resolved) throw new Error('expected Resolved')
      expect(state.winner).toBe(PlayerSide.Player)

      const loserBaseKey = `${state.vanguard.bases[PlayerSide.Cpu].q},${state.vanguard.bases[PlayerSide.Cpu].r}`
      expect(state.vanguard.cells[loserBaseKey]).toEqual({
        kind: 'token',
        owner: PlayerSide.Player,
        reinforced: 0,
      })

      expect(roundStartBoards.length).toBeGreaterThan(1)
      for (let i = 1; i < roundStartBoards.length; i++) {
        expect(claimedCellCount(roundStartBoards[i])).toBeGreaterThanOrEqual(
          claimedCellCount(roundStartBoards[i - 1]),
        )
      }
      expect(claimedCellCount(roundStartBoards[roundStartBoards.length - 1])).toBeGreaterThan(
        claimedCellCount(roundStartBoards[0]),
      )
    },
    20000,
  )
})
```

- [x] **Step 2: Run and confirm both seeded battles pass**

Run: `npx vitest run src/battle/__tests__/battleLoop.integration.test.ts`
Expected: 2 passed (one per seed). If either run times out or throws from `scriptedClashAction`/`scriptedLocalAction` finding no legal action, that is a defect in the scripted policy (most likely the board reaching saturation before a Breach) to fix in `battleTestHelpers.ts`, not a defect in `submitClashAction` — re-run with `npx vitest run src/battle/__tests__/submitClashAction.test.ts` first to isolate which side the problem is on.

Result: hit exactly the anticipated failure mode on the first run (see Notes for the full diagnosis and fix) — 2 passed after the scripted-policy fix.

- [x] **Step 3: Run the whole `src/battle/` suite**

Run: `npx vitest run src/battle`
Expected: all specs in the folder pass (`startBattle`, `submitWarCouncilCard`, `beginClash`, `submitClashAction`, `battlePhase`, `battleLoop.integration`).

Result: 6 test files, 16 tests, all passed.

**Phase 3 deviation from the plan's exact snippets (Tasks 10 and 11):** the scripted policy as given in the plan deadlocked — `scriptedLocalAction: no legal action available for this side` — because it had no fallback once the local cluster was fully reinforced and the board saturated, and separately `submitClashAction rejected: insufficientMuster` once an Overwrite fallback was added naively (the given snippets never check the acting side's remaining Muster before choosing a variable-cost Overwrite). A third, deeper issue surfaced once those two were fixed: the plan's strict Expand-then-Overwrite tier order let the player's script sidestep the opponent's defended perimeter indefinitely (nearest-cell expand kept finding "somewhere else" to grow) instead of breaking through, taking 8-12 rounds and saturating the board before reaching a Breach. Fixed in `battleTestHelpers.ts` by: (1) adding `musterAvailable` as a third parameter to both `scriptedClashAction` and `scriptedLocalAction`, gating every Overwrite candidate on affordability; (2) adding the same last-resort Overwrite-adjacent-enemy tier to `scriptedLocalAction` that `scriptedClashAction` already had, so a saturated board never leaves a side with zero legal moves; (3) preferring Expand candidates that are hex-distance-1 from the current network (i.e. stay connected) over the full `EXPAND_RANGE` jump, since a 2-hex jump lands outside `connectedNetwork`'s BFS reach and is invisible to every later proximity check — silently wasting the move; (4) ranking Expand and Overwrite candidates together by resulting distance to the opponent's base in `scriptedClashAction`, rather than trying all Expands before any Overwrite, so a legal Overwrite that actually closes the gap is never skipped in favor of a legal-but-pointless Expand elsewhere on the board. Verified against 8 seeds (1, 2, 3, 4, 5, 42, 100, 12345) via a temporary debug harness (created and deleted within this phase, never committed) — every seed now resolves in 3-4 rounds. Call sites in `battleLoop.integration.test.ts` updated to pass `clash.muster[side]` as the new third argument. None of this touched `src/warCouncil/` or `src/vanguard/` — every fix is confined to the test-only scripted policy in `src/battle/__tests__/battleTestHelpers.ts`, per the phase's explicitly allowed engineering judgment for a flaky/slow scripted policy.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean. `src/battle/` carries no pure-core ESLint boundary (SCRUM-19 explicitly declined one for the orchestrator module, and this ticket doesn't revisit that call), so there is no boundary grep to run here. There is also no numeric tunable this ticket introduces that risks being accidentally hardcoded elsewhere — `WAR_COUNCIL_FIRST_DEALER` has exactly one consumer (`startBattle.ts`), already confirmed in the plan's config audit — so no dedicated hardcoding grep is needed either.

### Task 12: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.

Result: all three exit 0. Vitest: 28 test files, 149 tests, all passed (confirmed by QA, round 1 and round 2 re-verification).

### Task 13: Production build ✓

- [x] **Step 1: Build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Result: exit 0, `dist/index.html` + `dist/assets/index-*.css` + `dist/assets/index-*.js` written, no bundler errors (confirmed by QA).

### Task 14: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: the four-function battle-loop orchestrator (`startBattle`, `submitWarCouncilCard`, `beginClash`, `submitClashAction`) sequencing War Council → Muster → Clash → Breach/loop over a single persistent `BattleState`, replacing the SCRUM-19 placeholder.
- Every decision the developer must make (from the File map's "Developer decides or observes" list above).
- Verification results from Phase 4 (typecheck/lint/test/build exit codes, Vitest pass counts).
- A one-line note for future contributors: `BattlePhase.MusterConversion` is a real, reachable phase now — any future code branching on `BattleState.phase` must handle all four cases, not just three.

---

## Self-review

**Spec coverage:**
- AC1 (single `BattleState` through the full sequence, board persists) — Tasks 1, 4, 8, 11.
- AC2 (dealer alternation as one named field) — Tasks 1, 4, 8; asserted directly in Task 8's fourth test and Task 11's integration test.
- AC3 (clean termination naming the winner) — Task 8 (`Resolved` variant, Breach branch); asserted in Task 8's third test and Task 11.
- AC4 (no round cap) — structural: `round` is a plain incrementing number with no bound check anywhere in Tasks 4-8; Task 11's loop itself has no round limit, only a Vitest per-test timeout as a safety net against a genuine defect.
- AC5 (2+ full integration battles, scripted card play + CPU-free scripted board actions, board persistence, correct winner) — Task 11 directly; Task 10 provides the scripted drivers; Task 6 provides the War Council driver.
- In-scope bullet "redesigning `BattleState`" — Task 1. "One function per phase-boundary transition" — Tasks 4, 5, 7, 8. "Dealer alternation" — Task 8. "Board persistence structurally guaranteed" — Task 4 (single `createVanguardBoard()` call) + Task 8 (board always threaded from `result.state.board`). "Clean, unambiguous resolution" — Task 8. "No round cap" — Tasks 4-8 (structural). "Integration tests" — Task 11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows exact code or a `Run:`/`Expected:` command.

**Type / name consistency:** `BattleState`, `BattlePhase`, `BattleRejectionReason`, `BattleActionResult`, `WAR_COUNCIL_FIRST_DEALER`, `startBattle`, `submitWarCouncilCard`, `beginClash`, `submitClashAction` are spelled identically across every task that references them, matching `plan.md` Part 2 → Data shapes exactly. `autoPlayWarCouncilRound`, `scriptedClashAction`, and `scriptedLocalAction` (test-only) are introduced once each (Tasks 6 and 10) and referenced identically in Task 11.

**Phase boundary cleanliness:** Phase 1 ends with three new/modified files typechecking together and no other file touched. Phase 2 ends with four new modules and their four test files all green, the module still fully self-contained (nothing outside `src/battle/` touched). Phase 3 ends with the barrel updated, the scripted drivers added, and the full `src/battle/` suite — including both integration-test seeds — green. Phase 4 makes no production change at all, only running the gates every earlier phase already implied would pass.
