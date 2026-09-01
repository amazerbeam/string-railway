import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit, TrickOutcome, type WarCouncilState } from '../../../warCouncil'
import {
  applyDamage,
  BASE_DAMAGE,
  DuelSide,
  isEncounterResolved,
  quarryHealthForEncounter,
  startEncounter,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { BeatKind } from '../resolutionBeats'
import {
  createRoundUiState,
  RoundUiActionKind,
  type ResolutionView,
  type RoundUiState,
} from '../roundUiState'
import { card, discardsRemainingFixture, makeRound } from './roundFixture'

// DLR-156 AC3/AC5/AC6/AC7/AC14 — the resolution screen's reducer-side state, and the two new
// player choices. The screen ITSELF does not exist yet (Task 15) — nothing renders `ui.resolution`
// and nothing dispatches `ApplyPot`/`RollOver` from a component. This file is the proof that the
// reducer's own half of the contract holds; wiring the switch is a later task.

const tap = (c: ReturnType<typeof card>) => ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const applyPot = { kind: RoundUiActionKind.ApplyPot } as const
const rollOver = { kind: RoundUiActionKind.RollOver } as const

function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    blastGuardHeld: false,
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

/** A single clean win, Bells 9 over Bells 2 — no buffs, so the beats are just Base and Banked. */
function winningRound(total: number, roll: number): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    total,
    roll,
    hands: {
      [PlayerSide.Player]: [card(Suit.Bells, 9)],
      [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
    },
    currentTrick: [],
  })
}

/** A single clean loss, Bells 2 under Bells 9 — the hurt branch, one Hurt beat. */
function losingRound(total: number, roll: number): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    total,
    roll,
    hands: {
      [PlayerSide.Player]: [card(Suit.Bells, 2)],
      [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
    },
    currentTrick: [],
  })
}

describe('AC14 — a banked trick sets ui.resolution to a non-null view', () => {
  it('carries both played cards, the winner, the trick number and its beats', () => {
    let ui = uiFrom(winningRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    const view = ui.resolution as ResolutionView
    expect(view).not.toBeNull()
    expect(view.cards.map((tc) => tc.card)).toEqual([card(Suit.Bells, 9), card(Suit.Bells, 2)])
    expect(view.winner).toBe(PlayerSide.Player)
    expect(view.trickNumber).toBe(1)
    // No buffs fired: exactly Base then Banked (`resolutionBeats.test.ts` pins the derivation
    // itself — this only proves the reducer actually calls it).
    expect(view.beats.map((beat) => beat.kind)).toEqual([BeatKind.Base, BeatKind.Banked])
    // AC2 — the bare-rule floor: potValue(1 + BASE_DAMAGE, 1 + 1) = 2 x 2 = 4.
    expect(view.nextPotFloor).toBe((1 + BASE_DAMAGE) * 2)
  })
})

describe('AC5 — ApplyPot deals the pot, zeroes the streak, and closes the screen', () => {
  it('deals potValue(total, roll) to the Quarry and zeroes total/roll', () => {
    let ui = uiFrom(winningRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    expect(ui.round.total).toBe(1)
    expect(ui.round.roll).toBe(1)

    ui = roundReducer(ui, applyPot)

    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)
    expect(ui.resolution).toBeNull()
    // potValue(1, 1) = 1.
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 1)
  })
})

describe('AC6 — RollOver leaves the streak standing and closes the screen', () => {
  it('leaves total/roll untouched and the Quarry unpaid', () => {
    let ui = uiFrom(winningRound(0, 0))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))

    ui = roundReducer(ui, rollOver)

    expect(ui.round.total).toBe(1)
    expect(ui.round.roll).toBe(1)
    expect(ui.resolution).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
  })
})

describe('AC7 — the hurt branch has nothing to decide', () => {
  it('sets a view with exactly one Hurt beat, and RollOver is a no-op on the already-zero figures', () => {
    let ui = uiFrom(losingRound(12, 2))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    const view = ui.resolution as ResolutionView
    expect(view.beats.map((beat) => beat.kind)).toEqual([BeatKind.Hurt])
    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)

    ui = roundReducer(ui, rollOver)

    expect(ui.resolution).toBeNull()
    expect(ui.round.total).toBe(0)
    expect(ui.round.roll).toBe(0)
  })
})

describe('the two actions are TOTAL and GUARDED — never a throw', () => {
  it('ApplyPot/RollOver on a null resolution are no-ops returning the SAME state', () => {
    const state = uiFrom(winningRound(0, 0))
    expect(state.resolution).toBeNull()

    expect(roundReducer(state, applyPot)).toBe(state)
    expect(roundReducer(state, rollOver)).toBe(state)
  })

  it('applying into an already-resolved encounter is inert rather than a RangeError', () => {
    const resolvedEncounter = applyDamage(startEncounter(0), {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: quarryHealthForEncounter(0) + 100,
    })
    expect(isEncounterResolved(resolvedEncounter)).toBe(true)

    // A contrived state — the resolution view was built before the encounter resolved by some
    // other route, which the reducer must treat as inert rather than trust never to happen.
    const base = uiFrom(winningRound(5, 1), resolvedEncounter)
    const fakeView: ResolutionView = {
      cards: [],
      winner: PlayerSide.Player,
      resolution: {
        outcome: TrickOutcome.CleanWin,
        trickDamage: { base: 1, buffDamage: 0, buffMult: 1, overlapBonus: 0, dealt: 1 },
        cashOut: 0,
        damageToPlayer: 0,
        total: 5,
        roll: 1,
        timebombTarget: null,
        timebombToQuarry: 0,
        blastGuardSpent: false,
        buffAccrual: null,
        firedBuffIds: [],
      },
      beats: [],
      trickNumber: 1,
      nextPotFloor: 0,
    }
    const state: RoundUiState = { ...base, resolution: fakeView }

    expect(() => roundReducer(state, applyPot)).not.toThrow()
    const after = roundReducer(state, applyPot)
    expect(after.resolution).toBeNull()
    expect(after.encounter).toBe(resolvedEncounter)
    expect(after.round.total).toBe(5)
    expect(after.round.roll).toBe(1)
  })
})
