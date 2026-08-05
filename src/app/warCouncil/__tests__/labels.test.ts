import { describe, expect, it } from 'vitest'
import { IllegalMoveReason, Suit } from '../../../warCouncil'
import { cardAccessibleName, ILLEGAL_MOVE_MESSAGE, RANK_NAME, SUIT_NAME } from '../labels'

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
})
