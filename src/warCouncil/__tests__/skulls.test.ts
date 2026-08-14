import { describe, expect, it } from 'vitest'
import {
  SKULL_DENSITY,
  SKULL_WEIGHTS_AMBUSH,
  SKULL_WEIGHTS_HUMP,
  SKULL_WEIGHTS_RAMP,
  SKULL_WEIGHTS_UNIFORM,
  type SkullRankWeights,
} from '../../hunt'
import {
  assignSkulls,
  isSkulled,
  skullableCards,
  suitShape,
  trickIsSkulled,
  weightedDraw,
} from '../skulls'
import { PlayerSide, Suit, type Card, type TrickCard } from '../types'

const HAND: readonly Card[] = [
  { suit: Suit.Bells, rank: 1 },
  { suit: Suit.Bells, rank: 6 },
  { suit: Suit.Bells, rank: 10 },
  { suit: Suit.Keys, rank: 1 },
  { suit: Suit.Keys, rank: 8 },
  { suit: Suit.Moons, rank: 2 },
]

/** A deterministic stand-in for Math.random — `weightedDraw` consumes it, one call per card
 *  drawn, so a fixed sequence makes every selection below reproducible without seeding
 *  anything global. */
function sequenceRng(values: readonly number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

/** A seeded generator for the distribution tests, which need many more values than a literal
 *  sequence can carry. Same shape as the one in `cpuPlayer.test.ts`. */
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const ONE_OF_EACH: readonly Card[] = Array.from({ length: 11 }, (_, i) => ({
  suit: Suit.Bells,
  rank: i + 1,
}))

describe('skullableCards', () => {
  it('keeps only ranks whose weight is positive', () => {
    const eligible = skullableCards(HAND, SKULL_WEIGHTS_UNIFORM)
    expect(eligible).toHaveLength(4)
    expect(eligible.some((c) => c.rank === 1)).toBe(false)
  })

  it('returns nothing when every card has weight zero', () => {
    expect(skullableCards([{ suit: Suit.Keys, rank: 1 }], SKULL_WEIGHTS_UNIFORM)).toHaveLength(0)
  })
})

describe('weightedDraw', () => {
  it('never draws a zero-weight rank, across many seeds', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const drawn = weightedDraw(ONE_OF_EACH, lcg(seed), SKULL_WEIGHTS_UNIFORM, 3)
      expect(drawn.some((c) => c.rank === 1)).toBe(false)
    }
  })

  it('draws distinct cards — without replacement', () => {
    const drawn = weightedDraw(ONE_OF_EACH, lcg(7), SKULL_WEIGHTS_UNIFORM, 5)
    expect(new Set(drawn.map((c) => c.rank)).size).toBe(drawn.length)
  })

  it('is deterministic for one rng sequence', () => {
    expect(weightedDraw(ONE_OF_EACH, lcg(11), SKULL_WEIGHTS_HUMP, 3)).toEqual(
      weightedDraw(ONE_OF_EACH, lcg(11), SKULL_WEIGHTS_HUMP, 3),
    )
  })

  it('consumes exactly one rng call per card drawn', () => {
    let calls = 0
    const counting = () => {
      calls += 1
      return 0.5
    }
    weightedDraw(ONE_OF_EACH, counting, SKULL_WEIGHTS_UNIFORM, 4)
    expect(calls).toBe(4)
  })

  it('returns empty when every candidate has weight zero, rather than looping', () => {
    const allZero = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 }
    expect(weightedDraw(ONE_OF_EACH, lcg(3), allZero, 2)).toHaveLength(0)
  })

  it('returns fewer than asked when candidates run out', () => {
    expect(weightedDraw(ONE_OF_EACH, lcg(5), SKULL_WEIGHTS_UNIFORM, 99)).toHaveLength(10)
  })

  it('skews toward high ranks under the ramp and low ranks under the ambush', () => {
    const tally = (weights: SkullRankWeights) => {
      const counts = new Array(12).fill(0)
      const rng = lcg(2026)
      for (let t = 0; t < 4000; t++) {
        weightedDraw(ONE_OF_EACH, rng, weights, 1).forEach((c) => counts[c.rank]++)
      }
      return counts
    }
    const ramp = tally(SKULL_WEIGHTS_RAMP)
    expect(ramp[11]).toBeGreaterThan(ramp[2])

    const ambush = tally(SKULL_WEIGHTS_AMBUSH)
    expect(ambush[2]).toBeGreaterThan(ambush[11])
  })
})

describe('assignSkulls', () => {
  it('skulls Math.round(hand.length * density) cards', () => {
    expect(assignSkulls(HAND, lcg(1))).toHaveLength(Math.round(HAND.length * SKULL_DENSITY))
  })

  it('never skulls a rank 1', () => {
    for (let seed = 1; seed <= 100; seed++) {
      expect(assignSkulls(HAND, lcg(seed)).some((c) => c.rank === 1)).toBe(false)
    }
  })

  it('only ever skulls cards drawn from the hand it was given', () => {
    const skulls = assignSkulls(HAND, lcg(9))
    expect(skulls.every((s) => HAND.some((c) => c.suit === s.suit && c.rank === s.rank))).toBe(
      true,
    )
  })

  it('is deterministic for one rng sequence', () => {
    expect(assignSkulls(HAND, lcg(4))).toEqual(assignSkulls(HAND, lcg(4)))
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
