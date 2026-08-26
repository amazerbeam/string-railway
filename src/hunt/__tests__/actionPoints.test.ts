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

describe('canAffordAp (DLR-145 — AP_ENABLED is off, so every cost reads as affordable)', () => {
  it('is true when the pool covers the cost', () => {
    expect(canAffordAp(10, 5)).toBe(true)
    expect(canAffordAp(5, 5)).toBe(true)
  })

  it('is true even when the pool is below the nominal cost, because the cost reads as 0', () => {
    expect(canAffordAp(4, 5)).toBe(true)
  })
})

describe('spendAp (AC2 — the single place a cost is actually deducted; DLR-145 — AP_ENABLED is off, so every spend is free)', () => {
  it('deducts nothing from the pool, since the effective cost is 0', () => {
    expect(spendAp(10, 3)).toBe(10)
  })

  it('never throws for want of AP, since the effective cost is always affordable', () => {
    expect(() => spendAp(2, 3)).not.toThrow()
    expect(spendAp(2, 3)).toBe(2)
  })

  it('leaves the pool at zero when it starts at zero', () => {
    expect(spendAp(0, 3)).toBe(0)
  })
})

describe('refreshActionPointsForNewHand (AC3 — perHand reset)', () => {
  it('resets to STARTING_AP regardless of the incoming pool size', () => {
    expect(refreshActionPointsForNewHand(0)).toBe(STARTING_AP)
    expect(refreshActionPointsForNewHand(STARTING_AP - 1)).toBe(STARTING_AP)
    expect(refreshActionPointsForNewHand(STARTING_AP + 4)).toBe(STARTING_AP)
  })
})
