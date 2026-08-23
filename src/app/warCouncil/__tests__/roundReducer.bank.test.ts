import { describe, expect, it } from 'vitest'
import {
  currentTurn,
  PlayerSide,
  RoundPhase,
  Suit,
  TrickOutcome,
  type WarCouncilState,
} from '../../../warCouncil'
import {
  DAMAGE_PER_HIT,
  DuelSide,
  PLAYER_START_HEALTH,
  isEncounterResolved,
  quarryHealthForEncounter,
  startEncounter,
  type EncounterState,
} from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiState } from '../roundUiState'
import { card, discardsRemainingFixture, timebombChargesFixture, makeRound } from './roundFixture'

// The bank cash-out specs (AC6/AC8) — carved into their own file for the same reason DLR-71's
// own splits exist in this codebase: `roundReducer.test.ts` crossed the 400-line budget once
// Task 12 added the encounter to its state, and this describe block was the largest single
// piece. Duplicated rather than imported, matching the established local pattern
// (`WarCouncilRound.duelHealthBars.test.tsx`, `playCard.test.ts`, `deal.test.ts`).

const tap = (c: Parameters<typeof card>[0] extends never ? never : ReturnType<typeof card>) =>
  ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const carryOn = { kind: RoundUiActionKind.CarryOn } as const

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

describe('the bank cash-out — AC6/AC8, applied mid-hand as it happens', () => {
  it('cashes the bank into the Quarry the moment a clean trick is lost', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 2,
      multiplier: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    // DLR-94 AC4 — a forced hit pays two-thirds of 2 x 2, floored: 2.
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(2)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 2)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - DAMAGE_PER_HIT)
  })

  it('leaves both bars alone on a trick that neither cashed nor hit', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 0,
      multiplier: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 9)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const encounter = startEncounter(0)
    let ui = uiFrom(round, encounter)
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 9)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.resolvedTrick?.resolution.cashOut).toBe(0)
    // Same reference, not just equal values — `applyResolution` skips `applyDamage` entirely
    // when nothing moved, so an all-zero event never bumps `damageEventsApplied`.
    expect(ui.encounter).toBe(encounter)
  })

  it('stops accepting taps once a cash-out empties the Quarry’s bar mid-hand', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 500,
      multiplier: 2,
      tricksPlayed: 2,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 1), card(Suit.Keys, 4)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 8), card(Suit.Keys, 5)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    // Player leads the Swan (rank 1) and loses it — the losing Swan-player leads next
    // (`nextLeaderAfterTrick`), so it would ordinarily be the Player's turn again. The
    // cash-out (500 x 2 = 1000) comfortably exceeds this encounter's 10-health Quarry, so the
    // bar empties and resolves the encounter first — this isolates the new guard from the
    // ordinary turn-order one, independent of the fixture's synthetic magnitude.
    ui = roundReducer(ui, tap(card(Suit.Bells, 1)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 1)))
    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.round.phase).not.toBe(RoundPhase.Complete)

    ui = roundReducer(ui, carryOn)
    expect(ui.resolvedTrick).toBeNull()
    expect(currentTurn(ui.round)).toBe(PlayerSide.Player)

    const stuck = ui
    const after = roundReducer(ui, tap(card(Suit.Keys, 4)))
    expect(after).toBe(stuck)
  })

  it('carries the streak across tricks and resets it on damage', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 0,
      multiplier: 0,
      tricksPlayed: 0,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11), card(Suit.Keys, 11), card(Suit.Moons, 4)],
        // Keys 6, not Keys 3 — rank 3 is the Fox (CardRank.Fox), and the Quarry is forced to
        // play its only Keys card here. A Fox forced into play always resolves its ability
        // (chooseCpuMove never leaves it unanswered), which would exchange trump away from
        // Bells and hand the Quarry the decree instead of its Moons 6 — breaking trick 3's
        // matchup below. Keys 6 carries no ability, so trick 2 stays a plain clean win.
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 6), card(Suit.Moons, 6)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)

    // Trick 1 — the Player's Bells 11 beats the Quarry's only Bells card: a clean win.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    expect(ui.round.multiplier).toBe(1)
    ui = roundReducer(ui, carryOn)

    // Trick 2 — likewise with Keys: the streak climbs.
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    ui = roundReducer(ui, tap(card(Suit.Keys, 11)))
    expect(ui.round.multiplier).toBe(2)
    ui = roundReducer(ui, carryOn)

    // Trick 3 — the Player leads low, the Quarry's only Moons card beats it: damage resets
    // both the bank and the streak to zero.
    ui = roundReducer(ui, tap(card(Suit.Moons, 4)))
    ui = roundReducer(ui, tap(card(Suit.Moons, 4)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.round.multiplier).toBe(0)
    expect(ui.round.bank).toBe(0)
  })
})
