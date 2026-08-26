import { describe, expect, it } from 'vitest'
import {
  AP_ENABLED as AP_ENABLED_FROM_APCONFIG,
  STARTING_AP as STARTING_AP_FROM_APCONFIG,
  ApRefreshCadence as ApRefreshCadenceFromApConfig,
  AP_REFRESH_CADENCE as AP_REFRESH_CADENCE_FROM_APCONFIG,
  MAX_REFUND_PER_HAND as MAX_REFUND_PER_HAND_FROM_APCONFIG,
  MAX_MULTIPLIER_BONUS_PER_HAND as MAX_MULTIPLIER_BONUS_PER_HAND_FROM_APCONFIG,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND as MAX_FLAT_DAMAGE_BONUS_PER_HAND_FROM_APCONFIG,
  MAX_COIN_BONUS_PER_HAND as MAX_COIN_BONUS_PER_HAND_FROM_APCONFIG,
} from '../apConfig'
import {
  AP_ENABLED,
  STARTING_AP,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
  MAX_REFUND_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_COIN_BONUS_PER_HAND,
} from '../config'

describe('the four DLR-108 per-hand caps (values, agent-chosen on DLR-111/DLR-124)', () => {
  it('names the two surviving finite caps at their transcribed figure, as whole numbers', () => {
    expect(MAX_REFUND_PER_HAND).toBe(6)
    expect(MAX_COIN_BONUS_PER_HAND).toBe(10)
    for (const cap of [MAX_REFUND_PER_HAND, MAX_COIN_BONUS_PER_HAND]) {
      expect(Number.isInteger(cap)).toBe(true)
      expect(cap).toBeGreaterThan(0)
    }
  })

  // DLR-145 AC9 — the Multiplier and Magnitude axes are UNCAPPED because their reward now comes
  // from a CONSUMED card, not a rented one; a clipped contribution would silently destroy an
  // irreplaceable card. Do not "fix" this back to a finite integer — that is the regression AC9
  // exists to prevent.
  it('names the two uncapped axes as POSITIVE_INFINITY, not a finite integer', () => {
    expect(MAX_MULTIPLIER_BONUS_PER_HAND).toBe(Number.POSITIVE_INFINITY)
    expect(MAX_FLAT_DAMAGE_BONUS_PER_HAND).toBe(Number.POSITIVE_INFINITY)
    for (const cap of [MAX_MULTIPLIER_BONUS_PER_HAND, MAX_FLAT_DAMAGE_BONUS_PER_HAND]) {
      expect(Number.isInteger(cap)).toBe(false)
    }
  })

  it("matches DLR-111's stated derivation: the refund cap equals the starting AP pool", () => {
    expect(MAX_REFUND_PER_HAND).toBe(STARTING_AP)
  })
})

describe('the config.ts re-export is the same value as the apConfig.ts original', () => {
  it('AP_ENABLED', () => {
    expect(AP_ENABLED).toBe(AP_ENABLED_FROM_APCONFIG)
  })

  it('STARTING_AP', () => {
    expect(STARTING_AP).toBe(STARTING_AP_FROM_APCONFIG)
  })

  it('ApRefreshCadence', () => {
    expect(ApRefreshCadence).toBe(ApRefreshCadenceFromApConfig)
  })

  it('AP_REFRESH_CADENCE', () => {
    expect(AP_REFRESH_CADENCE).toBe(AP_REFRESH_CADENCE_FROM_APCONFIG)
  })

  it('MAX_REFUND_PER_HAND', () => {
    expect(MAX_REFUND_PER_HAND).toBe(MAX_REFUND_PER_HAND_FROM_APCONFIG)
  })

  it('MAX_MULTIPLIER_BONUS_PER_HAND', () => {
    expect(MAX_MULTIPLIER_BONUS_PER_HAND).toBe(MAX_MULTIPLIER_BONUS_PER_HAND_FROM_APCONFIG)
  })

  it('MAX_FLAT_DAMAGE_BONUS_PER_HAND', () => {
    expect(MAX_FLAT_DAMAGE_BONUS_PER_HAND).toBe(MAX_FLAT_DAMAGE_BONUS_PER_HAND_FROM_APCONFIG)
  })

  it('MAX_COIN_BONUS_PER_HAND', () => {
    expect(MAX_COIN_BONUS_PER_HAND).toBe(MAX_COIN_BONUS_PER_HAND_FROM_APCONFIG)
  })
})
