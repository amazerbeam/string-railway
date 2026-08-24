import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import {
  apCostOf,
  cheatBuff,
  startBuffActivation,
  BuffTier,
  STARTING_AP,
  AP_CAPACITY_STEP,
  type BuffActivationState,
} from '../../../hunt'
import {
  createRoundUiState,
  discardWindowOpen,
  buffActivationStock,
  applyDamageStock,
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
    buffs: [],
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

describe('DLR-114 — the felt has exactly one AP pool', () => {
  it('buffActivationStock reads the same pool applyDamageStock does', () => {
    const state = createRoundUiState(makeSeed())
    expect(buffActivationStock(state, state.buffActivation, cheat).apPool).toBe(
      applyDamageStock(state).apPool,
    )
  })

  it('the pool opens the hand at STARTING_AP with nothing activated', () => {
    const state = createRoundUiState(makeSeed())
    expect(state.buffActivation.apPool).toBe(STARTING_AP)
    expect(state.buffActivation.activatedThisTrick).toEqual([])
  })
})

describe('DLR-116 — apCapacity threads into the opening pool', () => {
  it('a seed with no apCapacity opens the hand at STARTING_AP', () => {
    const state = createRoundUiState(makeSeed())
    expect(state.buffActivation.apPool).toBe(STARTING_AP)
  })

  it('a seed with apCapacity opens the hand at exactly that pool', () => {
    const state = createRoundUiState({ ...makeSeed(), apCapacity: STARTING_AP + AP_CAPACITY_STEP })
    expect(state.buffActivation.apPool).toBe(STARTING_AP + AP_CAPACITY_STEP)
  })
})
