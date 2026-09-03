import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import { DuelSide, isEncounterResolved, PLAYER_HAND_FLOOR, startEncounter } from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiSeed } from '../roundUiState'
import {
  baseDamageBonusFixture,
  card,
  discardsRemainingFixture,
  makeRound,
} from './roundFixture'

/**
 * A fight the player can end on demand through an ORDINARY win, banked, then cashed by the
 * player's own Apply choice — the only way the Quarry can take damage mid-hand at all now
 * (DLR-156 AC5/AC7: a hit pays the Quarry nothing, and a win only pays when the player presses
 * Apply on the resolution screen). `WarCouncilRound.duelHealthBars.test.tsx`'s own DLR-156
 * rewrite is the pattern this follows.
 *
 * DLR-109 — this file used to trigger its kill through two Apply Damage taps queuing a delayed
 * payout; DLR-156 deleted that queue outright (Phase 4). DLR-156 B3 — the file's SECOND
 * generation, driving the kill through a forced two-thirds cash-out on a LOSS, is gone too: a
 * loss pays the Quarry nothing at all now, so that mechanism cannot kill anything. This
 * generation drives it the only way left: a WIN banks the streak, and the player's own `ApplyPot`
 * dispatch is what cashes it into the Quarry — `captureUnplayed` (DLR-95 AC2) is exercised
 * through that transition instead.
 */
function seedOneTrickKill(): RoundUiSeed {
  const lethalEncounter = startEncounter(0)
  return {
    round: makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      total: 0,
      roll: 0,
      tricksPlayed: 2,
      hands: {
        // Bells 9 is the Witch: a single Witch acts as an effective trump regardless of the
        // fixture's own trump suit, so the player's lead wins deterministically — the same
        // construction `WarCouncilRound.readouts.test.tsx`'s own clean-take spec uses.
        [PlayerSide.Player]: [card(Suit.Bells, 9), card(Suit.Keys, 4)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 5)],
      },
      currentTrick: [],
    }),
    // BASE_DAMAGE(1) x roll 1 = a pot of 1 the instant the Witch banks — sized to exceed a
    // Quarry health of 1, so the SAME figure that would otherwise merely bank is what the
    // player's own Apply then cashes into a kill.
    encounter: { ...lethalEncounter, health: { ...lethalEncounter.health, [DuelSide.Quarry]: 1 } },
    baseDamageBonus: baseDamageBonusFixture,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  }
}

const tap = (c: ReturnType<typeof card>) => ({ kind: RoundUiActionKind.TapCard, card: c }) as const
const applyPot = { kind: RoundUiActionKind.ApplyPot } as const

describe('roundReducer — capturing the unplayed count at the kill (DLR-95 AC2)', () => {
  it('holds null while the encounter is still live', () => {
    const state = createRoundUiState(seedOneTrickKill())
    expect(isEncounterResolved(state.encounter)).toBe(false)
    expect(state.unplayedAtResolve).toBeNull()
  })

  it('freezes the player’s hand size — refilled to the floor — on the transition that empties the Quarry’s bar', () => {
    const state = createRoundUiState(seedOneTrickKill())
    const led = card(Suit.Bells, 9)
    // DLR-146 — this used to be a bare `.length - 1` (the pre-refill count). The winning trick
    // here is trick 3 of 6 (non-final), so `playCard`'s refill tops the player back up to
    // PLAYER_HAND_FLOOR before `captureUnplayed` reads the hand — the deck has plenty of cards to
    // draw, so the refill always reaches the floor exactly. `Math.max` keeps this correct whether
    // or not a refill was needed, and collapses to the old `.length - 1` at PLAYER_HAND_FLOOR = 0.
    const expectedUnplayed = Math.max(
      state.round.hands[PlayerSide.Player].length - 1,
      PLAYER_HAND_FLOOR,
    )

    // The Witch banks the streak (total 1, roll 1) — the Quarry is still untouched, exactly
    // AC5's rule that a win pays nothing on its own. Only the explicit Apply that follows cashes
    // the pot and empties the Quarry's bar.
    const banked = roundReducer(roundReducer(state, tap(led)), tap(led))
    expect(isEncounterResolved(banked.encounter)).toBe(false)
    const killed = roundReducer(banked, applyPot)

    expect(isEncounterResolved(killed.encounter)).toBe(true)
    expect(killed.encounter.health[DuelSide.Quarry]).toBe(0)
    expect(killed.unplayedAtResolve).toBe(expectedUnplayed)
  })

  it('never overwrites the captured figure on a later dispatch', () => {
    const state = createRoundUiState(seedOneTrickKill())
    const led = card(Suit.Bells, 9)
    const banked = roundReducer(roundReducer(state, tap(led)), tap(led))
    const killed = roundReducer(banked, applyPot)
    const captured = killed.unplayedAtResolve

    const later = roundReducer(killed, { kind: RoundUiActionKind.CarryOn })
    expect(later.unplayedAtResolve).toBe(captured)
  })
})
