import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import {
  ACTIVATED_BUFF_CONDITION,
  apCostOf,
  BuffKind,
  BuffRewardAxis,
  cheatBuff,
  startBuffActivation,
  BuffTier,
  TIMEBOMB_DAMAGE,
  timebombBuff,
  type Buff,
  STARTING_AP,
  AP_CAPACITY_STEP,
  type BuffActivationState,
} from '../../../hunt'
import {
  createRoundUiState,
  discardWindowOpen,
  buffActivationStock,
  timebombLive,
  type RoundUiSeed,
  type RoundUiState,
} from '../roundUiState'
import { makeRound, encounterFixture } from './roundFixture'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

function makeSeed(overrides: Partial<WarCouncilState> = {}): RoundUiSeed {
  return {
    round: makeRound(overrides),
    encounter: encounterFixture,
    blastGuardHeld: false,
    baseDamageBonus: 0,
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
      capacity: notActivated.capacity,
      activatedThisTrick: [cheat.id],
      spentThisTrick: [],
    }
    expect(buffActivationStock(state, activated, cheat).alreadyActive).toBe(true)
  })

  it('apPool is read straight from the activation state', () => {
    const state = createRoundUiState(makeSeed())
    const activation: BuffActivationState = {
      apPool: 3,
      capacity: 3,
      activatedThisTrick: [],
      spentThisTrick: [],
    }
    expect(buffActivationStock(state, activation, cheat).apPool).toBe(3)
  })
})

describe('DLR-114 — the felt has exactly one AP pool', () => {
  it('buffActivationStock reads the reducer state’s own pool', () => {
    const state = createRoundUiState(makeSeed())
    expect(buffActivationStock(state, state.buffActivation, cheat).apPool).toBe(
      state.buffActivation.apPool,
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

describe('buffActivationStock — DLR-126, effectLive is delegated to the card', () => {
  it('reports a Cheat as live and a Foresight as not, on the same open felt', () => {
    const state = createRoundUiState(makeSeed())
    const foresight: Buff = {
      id: 2,
      kind: BuffKind.Foresight,
      tier: BuffTier.Bronze,
      condition: ACTIVATED_BUFF_CONDITION,
      reward: { axis: BuffRewardAxis.None, value: 0 },
    }
    expect(discardWindowOpen(state)).toBe(true)
    expect(buffActivationStock(state, startBuffActivation(), cheat).effectLive).toBe(true)
    expect(buffActivationStock(state, startBuffActivation(), foresight).effectLive).toBe(false)
  })
})

describe('timebombLive — DLR-154 R2', () => {
  it('reports a Timebomb as live while one is armed', () => {
    const state: RoundUiState = {
      ...createRoundUiState(makeSeed()),
      timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze],
    }
    expect(timebombLive(state)).toBe(true)
  })

  it('reports a Timebomb as live while a card is primed', () => {
    const held = card(Suit.Bells, 2)
    const state = createRoundUiState(makeSeed({ primedCards: [held] }))
    expect(timebombLive(state)).toBe(true)
  })

  it('reports no Timebomb live on an untouched felt', () => {
    const state = createRoundUiState(makeSeed())
    expect(timebombLive(state)).toBe(false)
  })
})

describe('buffActivationStock — DLR-154 R2, timebombLive is fed from the felt', () => {
  it('refuses a Timebomb row while one is already live', () => {
    const state: RoundUiState = {
      ...createRoundUiState(makeSeed()),
      timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze],
    }
    const timebomb = timebombBuff(BuffTier.Bronze, 2)
    expect(buffActivationStock(state, startBuffActivation(), timebomb).timebombLive).toBe(true)
  })

  it('never refuses a non-Timebomb row for this reason', () => {
    const state: RoundUiState = {
      ...createRoundUiState(makeSeed()),
      timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze],
    }
    expect(buffActivationStock(state, startBuffActivation(), cheat).timebombLive).toBe(false)
  })
})
