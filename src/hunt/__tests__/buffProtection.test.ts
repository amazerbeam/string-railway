import { describe, expect, it } from 'vitest'
import {
  NO_STREAK_PROTECTION,
  conditionIsWidened,
  isProtectiveKind,
  protectionCoversLowDefeat,
  streakProtectionFor,
} from '../buffProtection'
import { BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'
import { mintFromTemplate } from '../buffTemplates'

const HELMET_TEMPLATE = {
  form: 'condition',
  id: 'skullHelmet:protection',
  kind: BuffKind.SkullHelmet,
  axis: BuffRewardAxis.Protection,
} as const
const TETHER_TEMPLATE = {
  form: 'condition',
  id: 'skullTether:protection',
  kind: BuffKind.SkullTether,
  axis: BuffRewardAxis.Protection,
} as const
const SUIT_HIGH_TEMPLATE = {
  form: 'condition',
  id: 'suitHigh:bells:magnitude',
  kind: BuffKind.SuitHigh,
  axis: BuffRewardAxis.Magnitude,
  target: { suit: 'bells' as const },
} as const

function helmet(tier: BuffTier, id = 1): Buff {
  return mintFromTemplate(HELMET_TEMPLATE, tier, id)
}
function tether(tier: BuffTier, id = 1): Buff {
  return mintFromTemplate(TETHER_TEMPLATE, tier, id)
}
function suitHigh(tier: BuffTier, id = 1): Buff {
  return mintFromTemplate(SUIT_HIGH_TEMPLATE, tier, id)
}

describe('streakProtectionFor', () => {
  it('an empty fired array returns NO_STREAK_PROTECTION', () => {
    expect(streakProtectionFor([])).toEqual(NO_STREAK_PROTECTION)
  })

  it('a bronze Helmet gives keepsTotal with totalBonus 0', () => {
    const result = streakProtectionFor([helmet(BuffTier.Bronze)])
    expect(result.keepsTotal).toBe(true)
    expect(result.totalBonus).toBe(0)
    expect(result.keepsRoll).toBe(false)
  })

  it('a gold Helmet gives totalBonus 1', () => {
    const result = streakProtectionFor([helmet(BuffTier.Gold)])
    expect(result.keepsTotal).toBe(true)
    expect(result.totalBonus).toBe(1)
  })

  it('AC8 — two gold Helmets give totalBonus 1, not 2', () => {
    const result = streakProtectionFor([helmet(BuffTier.Gold, 1), helmet(BuffTier.Gold, 2)])
    expect(result.totalBonus).toBe(1)
  })

  it('a gold and a bronze Helmet together give 1', () => {
    const result = streakProtectionFor([helmet(BuffTier.Gold, 1), helmet(BuffTier.Bronze, 2)])
    expect(result.totalBonus).toBe(1)
  })

  it('a Tether moves keepsRoll/rollBonus and never touches the total', () => {
    const result = streakProtectionFor([tether(BuffTier.Gold)])
    expect(result.keepsRoll).toBe(true)
    expect(result.rollBonus).toBe(1)
    expect(result.keepsTotal).toBe(false)
    expect(result.totalBonus).toBe(0)
  })

  it('AC9 — one of each sets both flags', () => {
    const result = streakProtectionFor([helmet(BuffTier.Gold, 1), tether(BuffTier.Gold, 2)])
    expect(result.keepsTotal).toBe(true)
    expect(result.keepsRoll).toBe(true)
    expect(result.totalBonus).toBe(1)
    expect(result.rollBonus).toBe(1)
  })

  it('a fired Suit High card changes nothing', () => {
    const result = streakProtectionFor([suitHigh(BuffTier.Gold)])
    expect(result).toEqual(NO_STREAK_PROTECTION)
  })
})

describe('protectionCoversLowDefeat', () => {
  it('is false at bronze', () => {
    expect(protectionCoversLowDefeat(BuffTier.Bronze)).toBe(false)
  })

  it('is true at silver and gold', () => {
    expect(protectionCoversLowDefeat(BuffTier.Silver)).toBe(true)
    expect(protectionCoversLowDefeat(BuffTier.Gold)).toBe(true)
  })
})

describe('conditionIsWidened', () => {
  it('is false for a silver Suit High card — not a protective kind at all', () => {
    expect(conditionIsWidened(suitHigh(BuffTier.Silver))).toBe(false)
  })

  it('is false for a bronze Helmet', () => {
    expect(conditionIsWidened(helmet(BuffTier.Bronze))).toBe(false)
  })

  it('is true for a silver Helmet and a silver Tether', () => {
    expect(conditionIsWidened(helmet(BuffTier.Silver))).toBe(true)
    expect(conditionIsWidened(tether(BuffTier.Silver))).toBe(true)
  })
})

describe('isProtectiveKind', () => {
  it('is true only for the two protective families', () => {
    expect(isProtectiveKind(BuffKind.SkullHelmet)).toBe(true)
    expect(isProtectiveKind(BuffKind.SkullTether)).toBe(true)
    expect(isProtectiveKind(BuffKind.SuitHigh)).toBe(false)
  })
})
