import { describe, expect, it } from 'vitest'
import { SKULL_DENSITY, SKULL_MIN_RANK } from '../../hunt'
import { assignSkulls, isSkulled, skullableCards, suitShape, trickIsSkulled } from '../skulls'
import { PlayerSide, Suit, type Card, type TrickCard } from '../types'

const HAND: readonly Card[] = [
  { suit: Suit.Bells, rank: 1 },
  { suit: Suit.Bells, rank: 6 },
  { suit: Suit.Bells, rank: 10 },
  { suit: Suit.Keys, rank: 1 },
  { suit: Suit.Keys, rank: 8 },
  { suit: Suit.Moons, rank: 2 },
]

/** A deterministic stand-in for Math.random — `shuffle` consumes it, so a fixed sequence
 *  makes every selection below reproducible without seeding anything global. */
function sequenceRng(values: readonly number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('skullableCards', () => {
  it('excludes every rank 1 and keeps the rest', () => {
    const eligible = skullableCards(HAND)
    expect(eligible).toHaveLength(4)
    expect(eligible.every((c) => c.rank >= SKULL_MIN_RANK)).toBe(true)
  })

  it('returns nothing when every card is a rank 1', () => {
    expect(skullableCards([{ suit: Suit.Keys, rank: 1 }])).toHaveLength(0)
  })
})

describe('assignSkulls', () => {
  it('skulls Math.round(hand.length * density) cards', () => {
    const skulls = assignSkulls(HAND, sequenceRng([0.1, 0.7, 0.3, 0.9, 0.5]))
    expect(skulls).toHaveLength(Math.round(HAND.length * SKULL_DENSITY))
  })

  it('never skulls a rank 1', () => {
    const skulls = assignSkulls(HAND, sequenceRng([0.42]))
    expect(skulls.some((c) => c.rank === 1)).toBe(false)
  })

  it('only ever skulls cards drawn from the hand it was given', () => {
    const skulls = assignSkulls(HAND, sequenceRng([0.2, 0.8]))
    expect(skulls.every((s) => HAND.some((c) => c.suit === s.suit && c.rank === s.rank))).toBe(true)
  })

  it('is deterministic for one rng sequence', () => {
    const a = assignSkulls(HAND, sequenceRng([0.1, 0.7, 0.3, 0.9, 0.5]))
    const b = assignSkulls(HAND, sequenceRng([0.1, 0.7, 0.3, 0.9, 0.5]))
    expect(a).toEqual(b)
  })

  it('clamps to the eligible cards when the density would ask for more', () => {
    const oneEligible: readonly Card[] = [
      { suit: Suit.Bells, rank: 1 },
      { suit: Suit.Keys, rank: 1 },
      { suit: Suit.Moons, rank: 4 },
    ]
    expect(assignSkulls(oneEligible, sequenceRng([0.5]), 1)).toHaveLength(1)
  })

  it('skulls nothing at a density of zero', () => {
    expect(assignSkulls(HAND, sequenceRng([0.5]), 0)).toHaveLength(0)
  })
})

describe('isSkulled', () => {
  const skulls: readonly Card[] = [{ suit: Suit.Bells, rank: 6 }]

  it('matches on suit and rank together', () => {
    expect(isSkulled(skulls, { suit: Suit.Bells, rank: 6 })).toBe(true)
    expect(isSkulled(skulls, { suit: Suit.Keys, rank: 6 })).toBe(false)
    expect(isSkulled(skulls, { suit: Suit.Bells, rank: 7 })).toBe(false)
  })
})

describe('suitShape', () => {
  const skulls: readonly Card[] = [
    { suit: Suit.Bells, rank: 6 },
    { suit: Suit.Keys, rank: 8 },
  ]

  it('reports held and skulled counts per suit and no rank at all', () => {
    const shape = suitShape(HAND, skulls)
    expect(shape).toEqual([
      { suit: Suit.Bells, held: 3, skulled: 1 },
      { suit: Suit.Keys, held: 2, skulled: 1 },
      { suit: Suit.Moons, held: 1, skulled: 0 },
    ])
  })

  it('reports a zero row for a suit that has been stripped', () => {
    const shape = suitShape([{ suit: Suit.Moons, rank: 2 }], [])
    expect(shape.find((s) => s.suit === Suit.Bells)).toEqual({
      suit: Suit.Bells,
      held: 0,
      skulled: 0,
    })
  })
})

describe('trickIsSkulled', () => {
  const skulls: readonly Card[] = [{ suit: Suit.Bells, rank: 6 }]
  const trick = (a: Card, b: Card): readonly TrickCard[] => [
    { side: PlayerSide.Cpu, card: a },
    { side: PlayerSide.Player, card: b },
  ]

  it('is true when the opponent played the skull', () => {
    expect(
      trickIsSkulled(skulls, trick({ suit: Suit.Bells, rank: 6 }, { suit: Suit.Keys, rank: 9 })),
    ).toBe(true)
  })

  it('is true when the skull changed hands and the player played it', () => {
    expect(
      trickIsSkulled(skulls, trick({ suit: Suit.Keys, rank: 9 }, { suit: Suit.Bells, rank: 6 })),
    ).toBe(true)
  })

  it('is false for a clean trick', () => {
    expect(
      trickIsSkulled(skulls, trick({ suit: Suit.Keys, rank: 9 }, { suit: Suit.Moons, rank: 2 })),
    ).toBe(false)
  })
})
