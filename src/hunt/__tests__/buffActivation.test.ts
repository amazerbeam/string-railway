import { describe, expect, it } from 'vitest'
import { apCostOf } from '../buffCosts'
import { spendAp } from '../actionPoints'
import { AP_ENABLED, STARTING_AP } from '../apConfig'
import { cheatBuff, timebombBuff } from '../buffCatalog'
import { ACTIVATED_BUFF_CONDITION, BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'
import {
  BuffActivationRefusal,
  activateBuff,
  buffActivationRefusalFor,
  buffActivationStockFor,
  openBuffWindow,
  refreshBuffsForNewHand,
  startBuffActivation,
  type BuffActivationState,
} from '../buffActivation'

/** A bronze Foresight for the stacking test — `apCostOf` reads only `kind`/`tier` for a
 *  consumable, so the reward axis carried here is irrelevant to its price. */
function foresightBuff(tier: BuffTier, id: number): Buff {
  return {
    id,
    kind: BuffKind.Foresight,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.None, value: 0 },
  }
}

/** A Ward for the stacking test — same reasoning as `foresightBuff`. */
function wardBuff(tier: BuffTier, id: number): Buff {
  return {
    id,
    kind: BuffKind.Ward,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.DamageAbsorbed, value: 0 },
  }
}

describe('buffActivationRefusalFor — AC5, refusal with a reason', () => {
  it('refuses InsufficientAp when the pool is below the cost', () => {
    expect(
      buffActivationRefusalFor({
        windowOpen: true,
        apPool: 1,
        apCost: 2,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.InsufficientAp)
  })

  it('refuses WindowClosed when the window is not open', () => {
    expect(
      buffActivationRefusalFor({
        windowOpen: false,
        apPool: 6,
        apCost: 2,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.WindowClosed)
  })

  it('refuses AlreadyActive when the buff is already active this trick', () => {
    expect(
      buffActivationRefusalFor({
        windowOpen: true,
        apPool: 6,
        apCost: 2,
        alreadyActive: true,
      }),
    ).toBe(BuffActivationRefusal.AlreadyActive)
  })

  it('permits activation — null — when window is open, affordable, and not already active', () => {
    expect(
      buffActivationRefusalFor({
        windowOpen: true,
        apPool: 6,
        apCost: 2,
        alreadyActive: false,
      }),
    ).toBeNull()
  })

  it('reports WindowClosed before InsufficientAp — a closed window is true of the whole felt', () => {
    expect(
      buffActivationRefusalFor({
        windowOpen: false,
        apPool: 0,
        apCost: 5,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.WindowClosed)
  })
})

describe('activateBuff — AC3, stacking several activations against one pool', () => {
  it('spends a bronze Foresight then a bronze Ward against STARTING_AP, then refuses a gold Cheat', () => {
    let state: BuffActivationState = startBuffActivation()
    expect(state.apPool).toBe(STARTING_AP)

    const foresight = foresightBuff(BuffTier.Bronze, 1)
    const ward = wardBuff(BuffTier.Bronze, 2)

    state = activateBuff(state, foresight, true)
    expect(state.apPool).toBe(STARTING_AP - apCostOf(foresight))
    expect(state.activatedThisTrick).toContain(1)

    state = activateBuff(state, ward, true)
    expect(state.apPool).toBe(3)
    expect(state.activatedThisTrick).toEqual([1, 2])

    const cheat = cheatBuff(BuffTier.Gold, 3)
    const refusal = buffActivationRefusalFor(buffActivationStockFor(state, cheat, true))
    expect(refusal).toBe(BuffActivationRefusal.InsufficientAp)
    expect(() => activateBuff(state, cheat, true)).toThrow(RangeError)
    expect(() => activateBuff(state, cheat, true)).toThrow(/insufficientAp/)
  })
})

describe('activateBuff — AC4, the pool does not silently refresh mid-hand', () => {
  it('keeps falling across successive openBuffWindow boundaries and only refreshBuffsForNewHand restores it', () => {
    let state: BuffActivationState = startBuffActivation()

    const timebomb1 = timebombBuff(BuffTier.Bronze, 10)
    state = activateBuff(state, timebomb1, true)
    const afterFirst = state.apPool
    expect(afterFirst).toBeLessThan(STARTING_AP)

    state = openBuffWindow(state)
    expect(state.apPool).toBe(afterFirst)
    expect(state.activatedThisTrick).toEqual([])

    const timebomb2 = timebombBuff(BuffTier.Bronze, 11)
    state = activateBuff(state, timebomb2, true)
    const afterSecond = state.apPool
    expect(afterSecond).toBeLessThan(afterFirst)

    state = openBuffWindow(state)
    expect(state.apPool).toBe(afterSecond)

    const timebomb3 = timebombBuff(BuffTier.Bronze, 12)
    state = activateBuff(state, timebomb3, true)
    const afterThird = state.apPool
    expect(afterThird).toBeLessThan(afterSecond)

    // Never silently returns to STARTING_AP across any of these boundaries.
    expect(afterFirst).not.toBe(STARTING_AP)
    expect(afterSecond).not.toBe(STARTING_AP)
    expect(afterThird).not.toBe(STARTING_AP)

    state = refreshBuffsForNewHand(state)
    expect(state.apPool).toBe(STARTING_AP)
    expect(state.activatedThisTrick).toEqual([])
  })
})

describe('openBuffWindow', () => {
  it('clears activatedThisTrick and leaves apPool byte-for-byte unchanged', () => {
    const seeded: BuffActivationState = { apPool: 4, activatedThisTrick: [7, 8] }
    const next = openBuffWindow(seeded)
    expect(next.activatedThisTrick).toEqual([])
    expect(next.apPool).toBe(4)
  })
})

describe('activateBuff never mutates its input state', () => {
  it('leaves the original state object untouched', () => {
    const state = startBuffActivation()
    const snapshot = { ...state, activatedThisTrick: [...state.activatedThisTrick] }
    const timebomb = timebombBuff(BuffTier.Bronze, 20)
    activateBuff(state, timebomb, true)
    expect(state.apPool).toBe(snapshot.apPool)
    expect(state.activatedThisTrick).toEqual(snapshot.activatedThisTrick)
  })
})

describe('AP_ENABLED is honoured through the same spendAp path', () => {
  it('activating a buff sets the pool to spendAp(before, apCostOf(buff)) — no second subtraction path', () => {
    const state = startBuffActivation()
    const timebomb = timebombBuff(BuffTier.Silver, 30)
    const next = activateBuff(state, timebomb, true)
    expect(next.apPool).toBe(spendAp(state.apPool, apCostOf(timebomb)))
    expect(AP_ENABLED).toBe(true)
  })
})
