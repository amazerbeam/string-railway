import { describe, expect, it } from 'vitest'
import { apCostOf } from '../buffCosts'
import { spendAp } from '../actionPoints'
import { AP_ENABLED, STARTING_AP } from '../apConfig'
import { cheatBuff, timebombBuff } from '../buffCatalog'
import { ACTIVATED_BUFF_CONDITION, BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'
import {
  BuffActivationRefusal,
  activateBuff,
  activateFromPile,
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
        effectLive: true,
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
        effectLive: true,
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
        effectLive: true,
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
        effectLive: true,
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
        effectLive: true,
        windowOpen: false,
        apPool: 0,
        apCost: 5,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.WindowClosed)
  })

  it('DLR-126 — reports NoEffectYet before every other reason, because it is true of the CARD', () => {
    expect(
      buffActivationRefusalFor({
        effectLive: false,
        windowOpen: false,
        apPool: 0,
        apCost: 5,
        alreadyActive: true,
      }),
    ).toBe(BuffActivationRefusal.NoEffectYet)
  })

  it('DLR-126 — refuses NoEffectYet even on a wide-open felt with a full pool', () => {
    expect(
      buffActivationRefusalFor({
        effectLive: false,
        windowOpen: true,
        apPool: STARTING_AP,
        apCost: 1,
        alreadyActive: false,
      }),
    ).toBe(BuffActivationRefusal.NoEffectYet)
  })
})

describe('buffActivationStockFor — DLR-126, effectLive comes off the card', () => {
  it('reports a Foresight as not live and a Ward as live', () => {
    const state = startBuffActivation()
    expect(buffActivationStockFor(state, foresightBuff(BuffTier.Bronze, 1), true).effectLive).toBe(
      false,
    )
    expect(buffActivationStockFor(state, wardBuff(BuffTier.Bronze, 2), true).effectLive).toBe(true)
  })

  it('reports every NON-consumable as live — NoEffectYet is about unbuilt consumable surfaces', () => {
    const state = startBuffActivation()
    expect(buffActivationStockFor(state, cheatBuff(BuffTier.Bronze, 3), true).effectLive).toBe(true)
    expect(buffActivationStockFor(state, timebombBuff(BuffTier.Bronze, 4), true).effectLive).toBe(
      true,
    )
  })
})

describe('activateFromPile — DLR-126, an activation that also SPENDS the card', () => {
  it('removes a consumable item from the pile and spends its AP in one move', () => {
    const ward = wardBuff(BuffTier.Bronze, 2)
    const pile: readonly Buff[] = [wardBuff(BuffTier.Bronze, 1), ward]

    const { activation, buffs } = activateFromPile(startBuffActivation(), pile, ward, true)

    expect(activation.apPool).toBe(STARTING_AP - apCostOf(ward))
    expect(activation.activatedThisTrick).toEqual([2])
    expect(buffs.map((b) => b.id)).toEqual([1])
    // The pile handed in is untouched — every transition in `src/hunt/` is pure.
    expect(pile).toHaveLength(2)
  })

  it('leaves the pile UNCHANGED for a Cheat — an Activated card is not a one-shot item', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 3)
    const pile: readonly Buff[] = [cheat]

    const { activation, buffs } = activateFromPile(startBuffActivation(), pile, cheat, true)

    expect(buffs).toEqual(pile)
    expect(activation.activatedThisTrick).toEqual([3])
  })

  it('throws on a refused activation and leaves neither the pool nor the pile changed', () => {
    const ward = wardBuff(BuffTier.Bronze, 2)
    const pile: readonly Buff[] = [ward]

    expect(() => activateFromPile(startBuffActivation(), pile, ward, false)).toThrow(RangeError)
    expect(pile.map((b) => b.id)).toEqual([2])
  })
})

describe('activateBuff — AC3, stacking several activations against one pool', () => {
  // DLR-126 — this test used to stack a bronze Foresight then a bronze Ward. Foresight is now
  // refused with `NoEffectYet` (its effect needs a surface no screen provides), so the pair is a
  // bronze Timebomb then a bronze Ward — two live cards at 2 AP each. The test's SUBJECT is
  // unchanged: several activations drawing down one pool until the next one cannot be afforded.
  it('spends a bronze Timebomb then a bronze Ward against STARTING_AP, then refuses a gold Cheat', () => {
    let state: BuffActivationState = startBuffActivation()
    expect(state.apPool).toBe(STARTING_AP)

    const timebomb = timebombBuff(BuffTier.Bronze, 1)
    const ward = wardBuff(BuffTier.Bronze, 2)

    state = activateBuff(state, timebomb, true)
    expect(state.apPool).toBe(STARTING_AP - apCostOf(timebomb))
    expect(state.activatedThisTrick).toContain(1)

    state = activateBuff(state, ward, true)
    expect(state.apPool).toBe(STARTING_AP - apCostOf(timebomb) - apCostOf(ward))
    expect(state.activatedThisTrick).toEqual([1, 2])

    const cheat = cheatBuff(BuffTier.Gold, 3)
    const refusal = buffActivationRefusalFor(buffActivationStockFor(state, cheat, true))
    expect(refusal).toBe(BuffActivationRefusal.InsufficientAp)
    expect(() => activateBuff(state, cheat, true)).toThrow(RangeError)
    expect(() => activateBuff(state, cheat, true)).toThrow(/insufficientAp/)
  })
})

describe('activateBuff + openBuffWindow — 2026-08-25, PerTrick cadence refills every trick boundary', () => {
  it('falls within a trick from activations, then returns to capacity at every openBuffWindow', () => {
    let state: BuffActivationState = startBuffActivation()

    const timebomb1 = timebombBuff(BuffTier.Bronze, 10)
    state = activateBuff(state, timebomb1, true)
    expect(state.apPool).toBeLessThan(STARTING_AP)

    // 2026-08-25 supersedes AC4's PerHand assertion here: under the PerTrick default,
    // openBuffWindow is the refill boundary, not just the activation-clearing one.
    state = openBuffWindow(state)
    expect(state.apPool).toBe(STARTING_AP)
    expect(state.activatedThisTrick).toEqual([])

    const timebomb2 = timebombBuff(BuffTier.Bronze, 11)
    state = activateBuff(state, timebomb2, true)
    expect(state.apPool).toBeLessThan(STARTING_AP)

    state = openBuffWindow(state)
    expect(state.apPool).toBe(STARTING_AP)

    // refreshBuffsForNewHand — the per-hand boundary — is unaffected by the cadence change and
    // still resets the pool (and, unlike openBuffWindow, is capacity-unaware; see its docblock).
    state = refreshBuffsForNewHand(state)
    expect(state.apPool).toBe(STARTING_AP)
    expect(state.activatedThisTrick).toEqual([])
  })
})

describe('openBuffWindow', () => {
  it('2026-08-25 — clears activatedThisTrick and refills apPool back to capacity', () => {
    const seeded: BuffActivationState = { apPool: 4, capacity: 6, activatedThisTrick: [7, 8] }
    const next = openBuffWindow(seeded)
    expect(next.activatedThisTrick).toEqual([])
    expect(next.apPool).toBe(6)
  })

  it('2026-08-25 — never changes capacity itself', () => {
    const seeded: BuffActivationState = { apPool: 2, capacity: 11, activatedThisTrick: [] }
    expect(openBuffWindow(seeded).capacity).toBe(11)
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
