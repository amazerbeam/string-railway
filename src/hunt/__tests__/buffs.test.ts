import { describe, expect, it } from 'vitest'
import { Suit } from '../../warCouncil/types'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  BuffCadence,
  BuffTargetSuit,
  BUFF_CADENCE,
  BUFF_TARGET_RANK_MIN,
  BUFF_TARGET_RANK_MAX,
  UNASSIGNED_BUFF_CONDITION,
  UNASSIGNED_BUFF_REWARD,
  ACTIVATED_BUFF_CONDITION,
  isValidBuffTarget,
  seedStartingBuffPile,
  type BuffCondition,
} from '../buffs'

describe('seedStartingBuffPile', () => {
  it('mints `count` buffs with consecutive ids from `firstId`, all bronze (AC1/AC3)', () => {
    const pile = seedStartingBuffPile(2, 1)
    expect(pile).toEqual([
      {
        id: 1,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
      {
        id: 2,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
    ])
  })

  it('seeds nothing for 0 rather than throwing', () => {
    expect(seedStartingBuffPile(0, 1)).toEqual([])
  })

  it('starts ids at `firstId`, not always 1', () => {
    expect(seedStartingBuffPile(1, 7)).toEqual([
      {
        id: 7,
        kind: BuffKind.Unassigned,
        tier: BuffTier.Bronze,
        condition: UNASSIGNED_BUFF_CONDITION,
        reward: UNASSIGNED_BUFF_REWARD,
      },
    ])
  })

  it('seeds placeholder content as `unassigned`, never as a real card (DLR-107)', () => {
    expect(seedStartingBuffPile(3, 1).every((b) => b.kind === BuffKind.Unassigned)).toBe(true)
  })
})

describe('BuffKind (DLR-108/DLR-111 finding 1 — widened to 19 members)', () => {
  it('carries all 19 members, pairwise distinct', () => {
    const values = Object.values(BuffKind)
    expect(values).toHaveLength(19)
    expect(new Set(values).size).toBe(19)
  })

  it('carries the three pre-existing members unchanged', () => {
    expect(BuffKind.Unassigned).toBe('unassigned')
    expect(BuffKind.Cheat).toBe('cheat')
    expect(BuffKind.Timebomb).toBe('timebomb')
  })

  it('carries the 11 shipping condition families', () => {
    expect(BuffKind.Taker).toBe('taker')
    expect(BuffKind.Feeder).toBe('feeder')
    expect(BuffKind.MarkOfRank).toBe('markOfRank')
    expect(BuffKind.Sidestep).toBe('sidestep')
    expect(BuffKind.Glutton).toBe('glutton')
    expect(BuffKind.Hoarder).toBe('hoarder')
    expect(BuffKind.Unbloodied).toBe('unbloodied')
    expect(BuffKind.DebtCollector).toBe('debtCollector')
    expect(BuffKind.Keepsake).toBe('keepsake')
    expect(BuffKind.Miser).toBe('miser')
    expect(BuffKind.Cornered).toBe('cornered')
  })

  it('carries the 5 consumables', () => {
    expect(BuffKind.Ward).toBe('ward')
    expect(BuffKind.Puppeteer).toBe('puppeteer')
    expect(BuffKind.SecondThoughts).toBe('secondThoughts')
    expect(BuffKind.Foresight).toBe('foresight')
    expect(BuffKind.Spyglass).toBe('spyglass')
  })
})

describe('BuffRewardAxis (DLR-108/DLR-111 finding 2 — widened to 11 members)', () => {
  it('carries all 11 members, pairwise distinct', () => {
    const values = Object.values(BuffRewardAxis)
    expect(values).toHaveLength(11)
    expect(new Set(values).size).toBe(11)
  })

  it('carries the three pre-existing members unchanged', () => {
    expect(BuffRewardAxis.Magnitude).toBe('magnitude')
    expect(BuffRewardAxis.DurationTricks).toBe('durationTricks')
    expect(BuffRewardAxis.HeartCount).toBe('heartCount')
  })

  it('carries the 8 new axes', () => {
    expect(BuffRewardAxis.Coins).toBe('coins')
    expect(BuffRewardAxis.ApRefund).toBe('apRefund')
    expect(BuffRewardAxis.Multiplier).toBe('multiplier')
    expect(BuffRewardAxis.CardsRevealed).toBe('cardsRevealed')
    expect(BuffRewardAxis.CandidatesEliminated).toBe('candidatesEliminated')
    expect(BuffRewardAxis.DiscardCharges).toBe('discardCharges')
    expect(BuffRewardAxis.DamageAbsorbed).toBe('damageAbsorbed')
    expect(BuffRewardAxis.None).toBe('none')
  })
})

describe('BuffTargetSuit (DLR-111 finding 3 — pinned to warCouncil Suit, member for member)', () => {
  it('carries identical values to warCouncil’s Suit', () => {
    expect(Object.values(BuffTargetSuit).sort()).toEqual(Object.values(Suit).sort())
  })

  it('names the same three suits', () => {
    expect(BuffTargetSuit.Bells).toBe(Suit.Bells)
    expect(BuffTargetSuit.Keys).toBe(Suit.Keys)
    expect(BuffTargetSuit.Moons).toBe(Suit.Moons)
  })
})

describe('BuffCondition gains an optional `target` payload', () => {
  it('type-checks with no target at all', () => {
    const condition: BuffCondition = { kind: 'anything' }
    expect(condition.target).toBeUndefined()
  })

  it('leaves the two existing shared conditions unchanged', () => {
    expect(UNASSIGNED_BUFF_CONDITION).toEqual({ kind: 'unassigned' })
    expect(ACTIVATED_BUFF_CONDITION).toEqual({ kind: 'activated' })
  })
})

describe('isValidBuffTarget — the rank bound (1..11)', () => {
  it('rejects rank 0 and rank 12', () => {
    expect(isValidBuffTarget({ rank: 0 })).toBe(false)
    expect(isValidBuffTarget({ rank: 12 })).toBe(false)
  })

  it('accepts rank 1 and rank 11, the closed bound', () => {
    expect(isValidBuffTarget({ rank: BUFF_TARGET_RANK_MIN })).toBe(true)
    expect(isValidBuffTarget({ rank: BUFF_TARGET_RANK_MAX })).toBe(true)
  })

  it('accepts a target with no rank at all (suit-only target)', () => {
    expect(isValidBuffTarget({ suit: BuffTargetSuit.Bells })).toBe(true)
  })
})

describe('BUFF_CADENCE — DLR-124 R4’s classification, transcribed', () => {
  it('classifies the six event families as event', () => {
    for (const kind of [
      BuffKind.Taker,
      BuffKind.Feeder,
      BuffKind.MarkOfRank,
      BuffKind.Sidestep,
      BuffKind.Glutton,
      BuffKind.DebtCollector,
    ]) {
      expect(BUFF_CADENCE[kind]).toBe(BuffCadence.Event)
    }
  })

  it('classifies the four threshold families as threshold', () => {
    for (const kind of [BuffKind.Hoarder, BuffKind.Unbloodied, BuffKind.Miser, BuffKind.Cornered]) {
      expect(BUFF_CADENCE[kind]).toBe(BuffCadence.Threshold)
    }
  })

  it('classifies keepsake as terminal', () => {
    expect(BUFF_CADENCE[BuffKind.Keepsake]).toBe(BuffCadence.Terminal)
  })

  it('classifies Cheat, Timebomb, and the five consumables as activated', () => {
    for (const kind of [
      BuffKind.Cheat,
      BuffKind.Timebomb,
      BuffKind.Ward,
      BuffKind.Puppeteer,
      BuffKind.SecondThoughts,
      BuffKind.Foresight,
      BuffKind.Spyglass,
    ]) {
      expect(BUFF_CADENCE[kind]).toBe(BuffCadence.Activated)
    }
  })
})
