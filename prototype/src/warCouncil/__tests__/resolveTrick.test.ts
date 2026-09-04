import { describe, expect, it } from 'vitest'
import { resolveTrickWinner } from '../resolveTrick'
import type { Suit, TrickCard } from '../types'

function trick(
  leadSuit: Suit,
  leadRank: number,
  followSuit: Suit,
  followRank: number,
): [TrickCard, TrickCard] {
  return [
    { side: 'player', card: { suit: leadSuit, rank: leadRank } },
    { side: 'cpu', card: { suit: followSuit, rank: followRank } },
  ]
}

describe('resolveTrickWinner', () => {
  it('higher trump wins when both cards are trump suit', () => {
    expect(resolveTrickWinner(trick('bells', 4, 'bells', 9), 'bells')).toBe('cpu')
  })

  it('a single trump card beats a non-trump lead-suit card', () => {
    expect(resolveTrickWinner(trick('keys', 8, 'bells', 2), 'bells')).toBe('cpu')
  })

  it('neither trump: higher card in the lead suit wins', () => {
    expect(resolveTrickWinner(trick('keys', 3, 'keys', 10), 'bells')).toBe('cpu')
  })

  it('neither trump, follower off-suit: the lead card wins', () => {
    expect(resolveTrickWinner(trick('keys', 3, 'moons', 10), 'bells')).toBe('player')
  })

  it('a single Witch (rank 9) is treated as trump even off-suit', () => {
    expect(resolveTrickWinner(trick('keys', 3, 'moons', 9), 'bells')).toBe('cpu')
  })

  it('a single Witch loses to a genuine higher trump', () => {
    expect(resolveTrickWinner(trick('bells', 10, 'moons', 9), 'bells')).toBe('player')
  })

  it('two Witches neutralise each other: normal trump/lead-suit rule applies', () => {
    expect(resolveTrickWinner(trick('keys', 9, 'moons', 9), 'bells')).toBe('player')
  })

  it('two Witches, trump suit present: the trump-suit Witch wins', () => {
    expect(resolveTrickWinner(trick('keys', 9, 'bells', 9), 'bells')).toBe('cpu')
  })
})
