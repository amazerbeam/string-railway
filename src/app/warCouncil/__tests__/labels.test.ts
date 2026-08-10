import { describe, expect, it } from 'vitest'
import { DemandOutcome, IllegalMoveReason, QuarryIntentStance, Suit } from '../../../warCouncil'
import { StandingBandName } from '../../../hunt'
import {
  cardAccessibleName,
  DEMAND_OUTCOME_VERDICT,
  ILLEGAL_MOVE_MESSAGE,
  intentAccessibleName,
  RANK_NAME,
  STANCE_PHRASE,
  STANDING_BAND_NAME,
  SUIT_NAME,
} from '../labels'

describe('cardAccessibleName', () => {
  it('names an ability-bearing rank', () => {
    expect(cardAccessibleName({ suit: Suit.Keys, rank: 3 })).toBe('3 of Keys (Fox)')
  })

  it('omits the parenthetical for an ordinary rank', () => {
    expect(cardAccessibleName({ suit: Suit.Bells, rank: 7 })).toBe('7 of Bells')
  })
})

describe('the label maps', () => {
  it('names every suit', () => {
    for (const suit of Object.values(Suit)) expect(SUIT_NAME[suit]).toBeTruthy()
  })

  it('names exactly the five ability-bearing ranks', () => {
    expect(
      Object.keys(RANK_NAME)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([1, 3, 5, 9, 11])
  })

  it('carries copy for every illegal-move reason', () => {
    for (const reason of Object.values(IllegalMoveReason)) {
      expect(ILLEGAL_MOVE_MESSAGE[reason]).toBeTruthy()
    }
  })

  it('carries a stance phrase for every QuarryIntentStance', () => {
    for (const stance of Object.values(QuarryIntentStance)) {
      expect(STANCE_PHRASE[stance]).toBeTruthy()
    }
  })

  it('carries a display name for every Standing band', () => {
    for (const name of Object.values(StandingBandName)) {
      expect(STANDING_BAND_NAME[name]).toBeTruthy()
    }
  })

  it('carries a verdict for both Demand outcomes', () => {
    for (const outcome of Object.values(DemandOutcome)) {
      expect(DEMAND_OUTCOME_VERDICT[outcome]).toBeTruthy()
    }
  })
})

describe('intentAccessibleName', () => {
  it('names the suit and the stance for a live intent', () => {
    expect(
      intentAccessibleName({ suit: Suit.Bells, stance: QuarryIntentStance.Pressing }, false),
    ).toBe('The Quarry will press with Bells.')
  })

  it('prefixes with "If you lead that card" when speculative', () => {
    expect(
      intentAccessibleName({ suit: Suit.Keys, stance: QuarryIntentStance.Ducking }, true),
    ).toBe('If you lead that card: The Quarry will duck with Keys.')
  })

  it('returns a distinct sentence for null in each mode', () => {
    const live = intentAccessibleName(null, false)
    const speculative = intentAccessibleName(null, true)
    expect(live).not.toBe(speculative)
    expect(live).toBeTruthy()
    expect(speculative).toBeTruthy()
  })

  it('omits the stance without crashing when stance is absent (suit-only fidelity)', () => {
    expect(intentAccessibleName({ suit: Suit.Moons }, false)).toBe('The Quarry will play Moons.')
  })
})
