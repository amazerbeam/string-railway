import { describe, expect, it } from 'vitest'
import { EMPTY_BUFF_ACCRUAL } from '../../hunt'
import { buffTrickFactsFor, type BuffHandInput } from '../buffTrickFacts'
import { CardRank, PlayerSide, Suit, type Card, type TrickCard } from '../types'

const INPUT: BuffHandInput = {
  active: [],
  accrual: EMPTY_BUFF_ACCRUAL,
  firedThisHand: [],
  tricksWithoutHit: 0,
  coins: 0,
  playerHealth: 5,
  applyDamagePressed: false,
}

const playerCard = (suit: Suit, rank: number): TrickCard => ({
  side: PlayerSide.Player,
  card: { suit, rank },
})
const quarryCard = (suit: Suit, rank: number): TrickCard => ({
  side: PlayerSide.Cpu,
  card: { suit, rank },
})

describe('buffTrickFactsFor', () => {
  it('a null input yields { buffs: null }', () => {
    expect(buffTrickFactsFor([], [], null)).toEqual({ buffs: null })
  })

  it('reads only the PLAYER’s cards into playerSuits/playerRanks — a Quarry card does not count', () => {
    const trick = [playerCard(Suit.Bells, 9), quarryCard(Suit.Keys, CardRank.Swan)]
    const result = buffTrickFactsFor(trick, [], INPUT)
    expect(result.buffs?.hand.playerSuits).toEqual([Suit.Bells])
    expect(result.buffs?.hand.playerRanks).toEqual([9])
  })

  it('remainingSuits reflects the hand passed in, verbatim', () => {
    const remaining: readonly Card[] = [
      { suit: Suit.Moons, rank: 4 },
      { suit: Suit.Bells, rank: 2 },
    ]
    const result = buffTrickFactsFor([playerCard(Suit.Keys, 3)], remaining, INPUT)
    expect(result.buffs?.hand.remainingSuits).toEqual([Suit.Moons, Suit.Bells])
  })

  it('a trick with no player card yields empty playerSuits and playerRanks', () => {
    const trick = [quarryCard(Suit.Bells, 5), quarryCard(Suit.Keys, 6)]
    const result = buffTrickFactsFor(trick, [], INPUT)
    expect(result.buffs?.hand.playerSuits).toEqual([])
    expect(result.buffs?.hand.playerRanks).toEqual([])
  })

  it('carries the rest of the hand input straight through', () => {
    const result = buffTrickFactsFor([], [], { ...INPUT, coins: 7, tricksWithoutHit: 2 })
    expect(result.buffs?.hand.coins).toBe(7)
    expect(result.buffs?.hand.tricksWithoutHit).toBe(2)
    expect(result.buffs?.accrual).toBe(INPUT.accrual)
    expect(result.buffs?.firedThisHand).toBe(INPUT.firedThisHand)
    expect(result.buffs?.active).toBe(INPUT.active)
  })
})
