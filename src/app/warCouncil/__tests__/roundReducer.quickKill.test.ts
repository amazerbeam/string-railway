import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import { DuelSide, isEncounterResolved, PLAYER_HAND_FLOOR, startEncounter } from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiSeed } from '../roundUiState'
import {
  bankClimbBonusFixture,
  blastGuardHeldFixture,
  card,
  discardsRemainingFixture,
  makeRound,
} from './roundFixture'

/**
 * A fight the player can end on demand through an ORDINARY trick: a banked streak sized to
 * comfortably exceed the Quarry's remaining health. Losing the led Swan cashes the streak into
 * the Quarry and empties its bar mid-hand — the same construction
 * `roundReducer.bank.test.ts`'s "stops accepting taps" spec uses.
 *
 * DLR-109 — this file used to trigger its kill through two Apply Damage taps. Apply Damage now
 * QUEUES a delayed payout rather than dealing damage in the same transition as the press, so that
 * construction no longer produces a kill here at all; that payout's own capture of the unplayed
 * count is `roundReducer.delayedApply.test.ts`'s AC4 case. This file goes back to testing
 * `captureUnplayed` (DLR-95 AC2) through the mechanism it actually generalises over — an ordinary
 * trick's cash-out — so it stays independent of Apply Damage's own timing.
 */
function seedOneTrickKill(): RoundUiSeed {
  return {
    round: makeRound({
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
    }),
    encounter: startEncounter(0),
    blastGuardHeld: blastGuardHeldFixture,
    bankClimbBonus: bankClimbBonusFixture,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  }
}

const tap = (c: ReturnType<typeof card>) => ({ kind: RoundUiActionKind.TapCard, card: c }) as const

describe('roundReducer — capturing the unplayed count at the kill (DLR-95 AC2)', () => {
  it('holds null while the encounter is still live', () => {
    const state = createRoundUiState(seedOneTrickKill())
    expect(isEncounterResolved(state.encounter)).toBe(false)
    expect(state.unplayedAtResolve).toBeNull()
  })

  it('freezes the player’s hand size — refilled to the floor — on the transition that empties the Quarry’s bar', () => {
    const state = createRoundUiState(seedOneTrickKill())
    const led = card(Suit.Bells, 1)
    // DLR-146 — this used to be a bare `.length - 1` (the pre-refill count). The kill trick here
    // is trick 3 of 6 (non-final), so `playCard`'s refill tops the player back up to
    // PLAYER_HAND_FLOOR before `captureUnplayed` reads the hand — the deck has plenty of cards to
    // draw, so the refill always reaches the floor exactly. `Math.max` keeps this correct whether
    // or not a refill was needed, and collapses to the old `.length - 1` at PLAYER_HAND_FLOOR = 0.
    const expectedUnplayed = Math.max(
      state.round.hands[PlayerSide.Player].length - 1,
      PLAYER_HAND_FLOOR,
    )

    const killed = roundReducer(roundReducer(state, tap(led)), tap(led))

    expect(isEncounterResolved(killed.encounter)).toBe(true)
    expect(killed.encounter.health[DuelSide.Quarry]).toBe(0)
    expect(killed.unplayedAtResolve).toBe(expectedUnplayed)
  })

  it('never overwrites the captured figure on a later dispatch', () => {
    const state = createRoundUiState(seedOneTrickKill())
    const led = card(Suit.Bells, 1)
    const killed = roundReducer(roundReducer(state, tap(led)), tap(led))
    const captured = killed.unplayedAtResolve

    const later = roundReducer(killed, { kind: RoundUiActionKind.CarryOn })
    expect(later.unplayedAtResolve).toBe(captured)
  })
})
