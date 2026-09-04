import { describe, expect, it } from 'vitest'
import {
  MAX_HEALTH_PER_PURCHASE,
  MAX_HEALTH_PRICE_BASE,
  MAX_HEALTH_PRICE_STEP,
  maxHealthPriceFor,
  raisedMaxHealthFor,
} from '../maxHealth'

describe('maxHealthPriceFor', () => {
  it('charges the base price for the first copy', () => {
    expect(maxHealthPriceFor(0)).toBe(MAX_HEALTH_PRICE_BASE)
  })

  it('AC4 — every copy costs more than the one before it', () => {
    for (let n = 0; n < 8; n++) {
      expect(maxHealthPriceFor(n + 1)).toBeGreaterThan(maxHealthPriceFor(n))
    }
  })

  it('climbs by exactly the configured step, so the growth is stated once', () => {
    expect(maxHealthPriceFor(1) - maxHealthPriceFor(0)).toBe(MAX_HEALTH_PRICE_STEP)
    expect(maxHealthPriceFor(4)).toBe(MAX_HEALTH_PRICE_BASE + MAX_HEALTH_PRICE_STEP * 4)
  })

  it('throws rather than returning NaN on a corrupted count', () => {
    expect(() => maxHealthPriceFor(Number.NaN)).toThrow(RangeError)
    expect(() => maxHealthPriceFor(-1)).toThrow(RangeError)
  })
})

describe('raisedMaxHealthFor', () => {
  it('AC1 — raises the ceiling by the configured amount', () => {
    expect(raisedMaxHealthFor(10)).toBe(10 + MAX_HEALTH_PER_PURCHASE)
  })

  it('throws rather than returning NaN on a corrupted ceiling', () => {
    expect(() => raisedMaxHealthFor(0)).toThrow(RangeError)
    expect(() => raisedMaxHealthFor(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})
