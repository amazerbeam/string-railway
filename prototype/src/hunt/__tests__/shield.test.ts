import { describe, expect, it } from 'vitest'
import { BuffTier } from '../buffs'
import { NO_SHIELD_HEARTS, SHIELD_HEARTS, absorbWithShield, shieldHeartsForTier } from '../shield'

describe('SHIELD_HEARTS', () => {
  it('AC2 — is exactly the transcribed { bronze: 1, silver: 2, gold: 3 } ladder', () => {
    expect(SHIELD_HEARTS).toEqual({
      [BuffTier.Bronze]: 1,
      [BuffTier.Silver]: 2,
      [BuffTier.Gold]: 3,
    })
  })

  it('no protection is zero blue hearts', () => {
    expect(NO_SHIELD_HEARTS).toBe(0)
  })
})

describe('shieldHeartsForTier', () => {
  it('AC2 — returns each tier’s count', () => {
    expect(shieldHeartsForTier(BuffTier.Bronze)).toBe(1)
    expect(shieldHeartsForTier(BuffTier.Silver)).toBe(2)
    expect(shieldHeartsForTier(BuffTier.Gold)).toBe(3)
  })

  it('throws on a tier outside the table rather than returning undefined', () => {
    expect(() => shieldHeartsForTier('platinum' as BuffTier)).toThrow(RangeError)
  })
})

describe('absorbWithShield', () => {
  it('AC4 — blue hearts take the damage before red health sees any of it', () => {
    expect(absorbWithShield(2, 1)).toEqual({
      absorbed: 1,
      throughToHealth: 0,
      shieldHeartsRemaining: 1,
    })
  })

  it('AC4 — damage equal to the blue hearts is absorbed exactly, spending them all', () => {
    expect(absorbWithShield(2, 2)).toEqual({
      absorbed: 2,
      throughToHealth: 0,
      shieldHeartsRemaining: 0,
    })
  })

  it('AC4 — a blue heart is worth ONE POINT, not one hit: 3 damage into 2 hearts lets 1 through', () => {
    expect(absorbWithShield(2, 3)).toEqual({
      absorbed: 2,
      throughToHealth: 1,
      shieldHeartsRemaining: 0,
    })
  })

  it('no shield passes the whole hit through unchanged', () => {
    expect(absorbWithShield(NO_SHIELD_HEARTS, 3)).toEqual({
      absorbed: 0,
      throughToHealth: 3,
      shieldHeartsRemaining: 0,
    })
  })

  it('a zero-damage event spends no blue heart', () => {
    expect(absorbWithShield(2, 0)).toEqual({
      absorbed: 0,
      throughToHealth: 0,
      shieldHeartsRemaining: 2,
    })
  })

  it('fractional damage survives — DAMAGE_ROUNDING = None is a supported configuration', () => {
    expect(absorbWithShield(2, 0.5)).toEqual({
      absorbed: 0.5,
      throughToHealth: 0,
      shieldHeartsRemaining: 1.5,
    })
  })

  it('refuses a non-finite or negative blue-heart count rather than producing NaN', () => {
    expect(() => absorbWithShield(Number.NaN, 1)).toThrow(RangeError)
    expect(() => absorbWithShield(Number.POSITIVE_INFINITY, 1)).toThrow(RangeError)
    expect(() => absorbWithShield(-1, 1)).toThrow(RangeError)
  })

  it('refuses a non-finite or negative damage rather than producing NaN', () => {
    expect(() => absorbWithShield(2, Number.NaN)).toThrow(RangeError)
    expect(() => absorbWithShield(2, Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => absorbWithShield(2, -1)).toThrow(RangeError)
  })
})
