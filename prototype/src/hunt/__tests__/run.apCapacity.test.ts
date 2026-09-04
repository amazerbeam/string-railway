import { describe, expect, it } from 'vitest'
import { apCapacityFor } from '../actionPoints'
import { startBuffActivation } from '../buffActivation'
import { AP_CAPACITY_PRICE, AP_CAPACITY_STEP, STARTING_AP } from '../config'
import { startRun } from '../run'
import { buyFromShop } from '../runTransitions'
import { ShopItem } from '../shop'

describe('apCapacityFor', () => {
  it('is STARTING_AP at zero purchases', () => {
    expect(apCapacityFor(0)).toBe(STARTING_AP)
  })

  it('adds AP_CAPACITY_STEP per purchase', () => {
    expect(apCapacityFor(2)).toBe(STARTING_AP + 2 * AP_CAPACITY_STEP)
  })

  it('guards a negative bonus by returning STARTING_AP rather than a lower pool', () => {
    expect(apCapacityFor(-1)).toBe(STARTING_AP)
  })

  it('guards a non-finite bonus by returning STARTING_AP rather than a NaN pool', () => {
    expect(apCapacityFor(Number.NaN)).toBe(STARTING_AP)
  })
})

describe('startBuffActivation', () => {
  it('defaults to STARTING_AP, reproducing the pre-DLR-116 value exactly', () => {
    expect(startBuffActivation().apPool).toBe(STARTING_AP)
  })

  it('accepts a bought capacity', () => {
    expect(startBuffActivation(11).apPool).toBe(11)
  })
})

describe('buyFromShop(ShopItem.ApCapacity)', () => {
  it('deducts AP_CAPACITY_PRICE and raises apCapacityBonus by exactly 1', () => {
    const run = { ...startRun(), coins: AP_CAPACITY_PRICE }
    const after = buyFromShop(run, ShopItem.ApCapacity)
    expect(after.coins).toBe(0)
    expect(after.apCapacityBonus).toBe(run.apCapacityBonus + 1)
    expect(apCapacityFor(after.apCapacityBonus)).toBe(STARTING_AP + AP_CAPACITY_STEP)
  })

  it('stacks across repeated purchases', () => {
    const run = { ...startRun(), coins: AP_CAPACITY_PRICE * 2 }
    const twice = buyFromShop(buyFromShop(run, ShopItem.ApCapacity), ShopItem.ApCapacity)
    expect(twice.apCapacityBonus).toBe(2)
    expect(apCapacityFor(twice.apCapacityBonus)).toBe(STARTING_AP + 2 * AP_CAPACITY_STEP)
  })
})
