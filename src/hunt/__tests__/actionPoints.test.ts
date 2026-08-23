import { describe, expect, it } from 'vitest'
import { AP_ENABLED, STARTING_AP } from '../config'
import {
  apCostGiven,
  apCostFor,
  canAffordAp,
  spendAp,
  refreshActionPointsForNewHand,
} from '../actionPoints'

describe('apCostGiven (AC2 — the toggle logic, both branches)', () => {
  it('returns the cost unchanged when enabled', () => {
    expect(apCostGiven(5, true)).toBe(5)
    expect(apCostGiven(0, true)).toBe(0)
  })

  it('returns zero when disabled, regardless of the cost', () => {
    expect(apCostGiven(5, false)).toBe(0)
    expect(apCostGiven(8, false)).toBe(0)
  })
})

describe('apCostFor (wired to the live AP_ENABLED config value)', () => {
  it('matches apCostGiven at the current AP_ENABLED setting', () => {
    expect(apCostFor(7)).toBe(apCostGiven(7, AP_ENABLED))
  })
})

describe('canAffordAp', () => {
  it('is true when the pool covers the cost', () => {
    expect(canAffordAp(10, 5)).toBe(true)
    expect(canAffordAp(5, 5)).toBe(true)
  })

  it('is false when the pool falls short', () => {
    expect(canAffordAp(4, 5)).toBe(false)
  })
})

describe('spendAp (AC2 — the single place a cost is actually deducted)', () => {
  it('deducts the cost from the pool', () => {
    expect(spendAp(10, 3)).toBe(7)
  })

  it('refuses a spend the pool cannot cover, rather than clamping to zero', () => {
    expect(() => spendAp(2, 3)).toThrow(RangeError)
  })

  it('allows spending the pool down to exactly zero', () => {
    expect(spendAp(3, 3)).toBe(0)
  })
})

describe('refreshActionPointsForNewHand (AC3 — perHand reset)', () => {
  it('resets to STARTING_AP regardless of the incoming pool size', () => {
    expect(refreshActionPointsForNewHand(0)).toBe(STARTING_AP)
    expect(refreshActionPointsForNewHand(STARTING_AP - 1)).toBe(STARTING_AP)
    expect(refreshActionPointsForNewHand(STARTING_AP + 4)).toBe(STARTING_AP)
  })
})
