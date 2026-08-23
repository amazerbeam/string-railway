import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import {
  apCostOf,
  cheatBuff,
  startBuffActivation,
  BuffTier,
  type BuffActivationState,
} from '../../../hunt'
import {
  createRoundUiState,
  discardWindowOpen,
  buffActivationStock,
  type RoundUiSeed,
} from '../roundUiState'
import { makeRound, encounterFixture } from './roundFixture'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

function makeSeed(overrides: Partial<WarCouncilState> = {}): RoundUiSeed {
  return {
    round: makeRound(overrides),
    encounter: encounterFixture,
    cheats: [],
    timebombCharges: 0,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: 2,
  }
}

const cheat = cheatBuff(BuffTier.Bronze, 1)

describe('buffActivationStock — AC1, fed by the existing discardWindowOpen', () => {
  it('windowOpen agrees with discardWindowOpen when the window is open (nothing committed, no trick, no resolved trick)', () => {
    const state = createRoundUiState(makeSeed())
    const activation = startBuffActivation()

    expect(discardWindowOpen(state)).toBe(true)
    expect(buffActivationStock(state, activation, cheat).windowOpen).toBe(true)
    expect(buffActivationStock(state, activation, cheat).windowOpen).toBe(discardWindowOpen(state))
  })

  it('windowOpen agrees with discardWindowOpen when it is false — mid-trick, a card already committed', () => {
    const state = createRoundUiState(
      makeSeed({ currentTrick: [{ side: PlayerSide.Player, card: card(Suit.Bells, 2) }] }),
    )
    const activation = startBuffActivation()

    expect(discardWindowOpen(state)).toBe(false)
    expect(buffActivationStock(state, activation, cheat).windowOpen).toBe(false)
    expect(buffActivationStock(state, activation, cheat).windowOpen).toBe(discardWindowOpen(state))
  })

  it('windowOpen agrees with discardWindowOpen when the round phase is Complete', () => {
    const state = createRoundUiState(makeSeed({ phase: RoundPhase.Complete }))
    const activation = startBuffActivation()

    expect(discardWindowOpen(state)).toBe(false)
    expect(buffActivationStock(state, activation, cheat).windowOpen).toBe(false)
  })

  it('apCost equals apCostOf(buff) for a minted Cheat', () => {
    const state = createRoundUiState(makeSeed())
    const activation = startBuffActivation()

    expect(buffActivationStock(state, activation, cheat).apCost).toBe(apCostOf(cheat))
  })

  it('alreadyActive flips once the buff id is in activatedThisTrick', () => {
    const state = createRoundUiState(makeSeed())
    const notActivated = startBuffActivation()
    expect(buffActivationStock(state, notActivated, cheat).alreadyActive).toBe(false)

    const activated: BuffActivationState = {
      apPool: notActivated.apPool,
      activatedThisTrick: [cheat.id],
    }
    expect(buffActivationStock(state, activated, cheat).alreadyActive).toBe(true)
  })

  it('apPool is read straight from the activation state', () => {
    const state = createRoundUiState(makeSeed())
    const activation: BuffActivationState = { apPool: 3, activatedThisTrick: [] }
    expect(buffActivationStock(state, activation, cheat).apPool).toBe(3)
  })
})
