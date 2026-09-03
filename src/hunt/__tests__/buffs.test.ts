import { describe, expect, it } from 'vitest'
import { Suit } from '../../warCouncil/types'
import {
  BuffKind,
  BuffRewardAxis,
  BuffCadence,
  BuffTargetSuit,
  BUFF_CADENCE,
  BUFF_TARGET_RANK_MIN,
  BUFF_TARGET_RANK_MAX,
  UNASSIGNED_BUFF_CONDITION,
  ACTIVATED_BUFF_CONDITION,
  isValidBuffTarget,
  type BuffCondition,
} from '../buffs'

describe('BuffKind (DLR-108/DLR-111 finding 1 — widened to 22 members on DLR-161)', () => {
  it('carries all 22 members, pairwise distinct', () => {
    const values = Object.values(BuffKind)
    expect(values).toHaveLength(22)
    expect(new Set(values).size).toBe(22)
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

  it('DLR-110 — carries Shield', () => {
    expect(BuffKind.Shield).toBe('shield')
  })

  it('DLR-161 — carries the two protective condition families', () => {
    expect(BuffKind.SkullHelmet).toBe('skullHelmet')
    expect(BuffKind.SkullTether).toBe('skullTether')
  })
})

describe('BuffRewardAxis (DLR-108/DLR-111 finding 2 — widened to 12 members on DLR-161)', () => {
  it('carries all 12 members, pairwise distinct', () => {
    const values = Object.values(BuffRewardAxis)
    expect(values).toHaveLength(12)
    expect(new Set(values).size).toBe(12)
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

  it('DLR-161 — carries the Protection axis', () => {
    expect(BuffRewardAxis.Protection).toBe('protection')
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

  it('DLR-161 — classifies Skull Helmet and Skull Tether as event', () => {
    expect(BUFF_CADENCE[BuffKind.SkullHelmet]).toBe(BuffCadence.Event)
    expect(BUFF_CADENCE[BuffKind.SkullTether]).toBe(BuffCadence.Event)
  })

  it('classifies Cheat, Timebomb, Shield and the five consumables as activated', () => {
    for (const kind of [
      BuffKind.Cheat,
      BuffKind.Timebomb,
      BuffKind.Ward,
      BuffKind.Puppeteer,
      BuffKind.SecondThoughts,
      BuffKind.Foresight,
      BuffKind.Spyglass,
      BuffKind.Shield,
    ]) {
      expect(BUFF_CADENCE[kind]).toBe(BuffCadence.Activated)
    }
  })

  // The table's `Readonly<Record<BuffKind, BuffCadence>>` type already forces totality at compile
  // time; this asserts it at runtime too, so a member added with a cast cannot slip through as
  // `undefined`.
  it('is total over every BuffKind member', () => {
    for (const kind of Object.values(BuffKind)) {
      expect(BUFF_CADENCE[kind]).toBeDefined()
    }
    expect(Object.keys(BUFF_CADENCE)).toHaveLength(Object.values(BuffKind).length)
  })
})
