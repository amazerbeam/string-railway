import { describe, expect, it } from 'vitest'
import { startEncounter } from '../../../hunt'
import { createRoundUiState } from '../roundUiState'
import { roundResultFor } from '../roundResult'
import { discardsRemainingFixture, makeRound } from './roundFixture'

// The seed pattern `roundReducer.test.ts`'s `uiFrom` already uses — spelled once here since this
// spec needs only one state, not a family of them.
function seededUi() {
  const round = makeRound()
  const encounter = startEncounter(0)
  return createRoundUiState({
    round,
    encounter,
    blastGuardHeld: true,
    bankClimbBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: [],
  })
}

describe('roundResultFor', () => {
  it('reports every field straight off the state it was given', () => {
    const ui = seededUi()
    const result = roundResultFor(ui)

    expect(result.finalState).toBe(ui.round)
    expect(result.encounter).toBe(ui.encounter)
    expect(result.blastGuardHeld).toBe(ui.blastGuardHeld)
    expect(result.discardsRemaining).toBe(ui.discardsRemaining)
    expect(result.buffs).toBe(ui.buffs)
    expect(result.unplayedAtResolve).toBe(ui.unplayedAtResolve)
    expect(result.coinsEarned).toBe(ui.buffHand.coinsEarned)
  })

  it('reads coinsEarned through buffHand rather than a constant', () => {
    const ui = seededUi()
    const uiWithCoins = { ...ui, buffHand: { ...ui.buffHand, coinsEarned: 7 } }

    expect(roundResultFor(uiWithCoins).coinsEarned).toBe(7)
  })
})
