import { describe, expect, it } from 'vitest'
import {
  PlayerSide,
  RoundPhase,
  Suit,
  TrickOutcome,
  type WarCouncilState,
} from '../../../warCouncil'
import {
  DuelSide,
  PLAYER_START_HEALTH,
  isEncounterResolved,
  queueTimebomb,
  quarryHealthForEncounter,
  startEncounter,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, timebombChargesFixture, makeRound } from './roundFixture'

const tapApply = { kind: RoundUiActionKind.TapApplyDamage } as const
const cancelApply = { kind: RoundUiActionKind.CancelApplyDamage } as const

function uiFrom(
  round: WarCouncilState,
  encounter: EncounterState = startEncounter(0),
): RoundUiState {
  return createRoundUiState({
    round,
    encounter,
    cheats: [],
    timebombCharges: timebombChargesFixture,
    poisonGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: discardsRemainingFixture,
  })
}

/** The player is to lead, holding a streak of 3 x 3 = 9. */
function streakRound(): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    bank: 3,
    multiplier: 3,
    currentTrick: [],
  })
}

const apply = (ui: RoundUiState) => roundReducer(roundReducer(ui, tapApply), tapApply)

describe('Apply Damage — the poise, and the refusals (AC1, D6)', () => {
  it('one tap poises and changes nothing else', () => {
    const ui = roundReducer(uiFrom(streakRound()), tapApply)
    expect(ui.applyPoised).toBe(true)
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
  })

  it('AC1 — an empty bank cannot even be poised', () => {
    const ui = roundReducer(uiFrom(makeRound({ leader: PlayerSide.Player })), tapApply)
    expect(ui.applyPoised).toBe(false)
  })

  it('D6 — a pending poison hit cannot be poised past', () => {
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player)
    const ui = roundReducer(uiFrom(streakRound(), owed), tapApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
  })

  // The felt can change under a poised plate. A poise made while the control was live must not
  // commit after it stopped being — which is D6's "read the predicate before it commits".
  it('D6 — poison booked AFTER the poise still stops the commit, and drops the poise', () => {
    let ui = roundReducer(uiFrom(streakRound()), tapApply)
    expect(ui.applyPoised).toBe(true)
    ui = { ...ui, encounter: queueTimebomb(ui.encounter, DuelSide.Player) }
    ui = roundReducer(ui, tapApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
  })

  it('cancels a poise without spending anything', () => {
    let ui = roundReducer(uiFrom(streakRound()), tapApply)
    ui = roundReducer(ui, cancelApply)
    expect(ui.applyPoised).toBe(false)
    expect(ui.round.bank).toBe(3)
    expect(ui.round.multiplier).toBe(3)
  })
})

describe('Apply Damage — the commit (AC2, AC3)', () => {
  it('AC2 — the second tap pays the FULL bank × multiplier into the Quarry', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 9)
  })

  it('AC2 — and costs the player nothing', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('AC2 — resets the bank and the multiplier, and un-poises', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.round.bank).toBe(0)
    expect(ui.round.multiplier).toBe(0)
    expect(ui.applyPoised).toBe(false)
  })

  it('AC3 — no trick is resolved, so no reveal is held and the hand stays live', () => {
    const ui = apply(uiFrom(streakRound()))
    expect(ui.resolvedTrick).toBeNull()
    expect(ui.round.lastResolution).toBeNull()
    expect(ui.round.phase).toBe(RoundPhase.AwaitingLead)
    expect(ui.round.currentTrick).toEqual([])
  })

  it('AC3 — the player then plays their card by the ordinary rules, against a zeroed bank', () => {
    let ui = apply(
      uiFrom(
        makeRound({
          leader: PlayerSide.Player,
          trumpSuit: Suit.Keys,
          bank: 3,
          multiplier: 3,
          hands: {
            [PlayerSide.Player]: [card(Suit.Bells, 2)],
            [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
          },
          currentTrick: [],
        }),
      ),
    )
    const quarryAfterApply = ui.encounter.health[DuelSide.Quarry]
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 2) })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 2) })

    // The trick is lost, but the bank was already spent — so the forced cash-out pays nothing.
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(0)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryAfterApply)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 1)
  })

  it('cashing out a lethal streak ends the fight through the ordinary machinery', () => {
    const ui = apply(uiFrom(makeRound({ leader: PlayerSide.Player, bank: 500, multiplier: 2 })))
    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(0)
    // AC2 holds even on the killing blow: the player took nothing for it.
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('a further tap on a resolved fight is inert rather than throwing', () => {
    const settled = apply(
      uiFrom(makeRound({ leader: PlayerSide.Player, bank: 500, multiplier: 2 })),
    )
    expect(roundReducer(settled, tapApply)).toBe(settled)
  })
})
