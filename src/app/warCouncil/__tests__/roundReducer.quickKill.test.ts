import { describe, expect, it } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import { DuelSide, isEncounterResolved } from '../../../hunt'
import { roundReducer } from '../roundReducer'
import { createRoundUiState, RoundUiActionKind, type RoundUiSeed } from '../roundUiState'
import {
  bankClimbBonusFixture,
  discardsRemainingFixture,
  encounterFixture,
  timebombChargesFixture,
  makeRound,
  poisonGuardHeldFixture,
} from './roundFixture'

/** A fight the player can end on demand: a banked streak worth exactly the Quarry's last health,
 *  with the full six-card hand still undealt onto the table. Tapping Apply Damage twice cashes it
 *  and empties the Quarry's bar with every card still in hand — the cleanest expression of "at the
 *  instant the Quarry's health reaches zero". */
function seedOneTapKill(quarryHealth: number): RoundUiSeed {
  return {
    round: makeRound({ bank: quarryHealth, multiplier: 1 }),
    encounter: {
      ...encounterFixture,
      health: { ...encounterFixture.health, [DuelSide.Quarry]: quarryHealth },
    },
    cheats: [],
    timebombCharges: timebombChargesFixture,
    poisonGuardHeld: poisonGuardHeldFixture,
    bankClimbBonus: bankClimbBonusFixture,
    discardsRemaining: discardsRemainingFixture,
  }
}

const applyDamage = { kind: RoundUiActionKind.TapApplyDamage } as const

describe('roundReducer — capturing the unplayed count at the kill (DLR-95 AC2)', () => {
  it('holds null while the encounter is still live', () => {
    const state = createRoundUiState(seedOneTapKill(4))
    expect(state.unplayedAtResolve).toBeNull()

    // One tap only POISES the plate — nothing has been cashed and nothing has died.
    const poised = roundReducer(state, applyDamage)
    expect(isEncounterResolved(poised.encounter)).toBe(false)
    expect(poised.unplayedAtResolve).toBeNull()
  })

  it('freezes the player’s hand size on the transition that empties the Quarry’s bar', () => {
    const state = createRoundUiState(seedOneTapKill(4))
    const handSize = state.round.hands[PlayerSide.Player].length

    const killed = roundReducer(roundReducer(state, applyDamage), applyDamage)

    expect(isEncounterResolved(killed.encounter)).toBe(true)
    expect(killed.encounter.health[DuelSide.Quarry]).toBe(0)
    expect(killed.unplayedAtResolve).toBe(handSize)
  })

  it('never overwrites the captured figure on a later dispatch', () => {
    const state = createRoundUiState(seedOneTapKill(4))
    const killed = roundReducer(roundReducer(state, applyDamage), applyDamage)
    const captured = killed.unplayedAtResolve

    const later = roundReducer(roundReducer(killed, applyDamage), {
      kind: RoundUiActionKind.CarryOn,
    })
    expect(later.unplayedAtResolve).toBe(captured)
  })
})
