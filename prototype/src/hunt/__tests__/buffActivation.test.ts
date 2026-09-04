import { describe, expect, it } from 'vitest'
import { apCostOf } from '../buffCosts'
import { spendAp } from '../actionPoints'
import { AP_ENABLED, STARTING_AP } from '../apConfig'
import { cheatBuff, shieldBuff, wildcardBuff } from '../buffCatalog'
import { isShopOnlyBuff } from '../buffs'
import { ACTIVATED_BUFF_CONDITION, BuffKind, BuffRewardAxis, BuffTier, type Buff } from '../buffs'
import {
  BuffActivationRefusal,
  activateBuff,
  activateFromPile,
  buffActivationRefusalFor,
  buffActivationStockFor,
  isRevocableBuff,
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

/** A condition-family buff, DLR-145 — `kind` is the caller's, so the same helper builds a
 *  consumed family (SuitHigh) and a kept one (MarkOfRank). `reward.axis` is `Magnitude` so
 *  `apCostOf` can price it through `REWARD_BASE`. */
function conditionBuff(kind: BuffKind, tier: BuffTier, id: number): Buff {
  return {
    id,
    kind,
    tier,
    condition: { kind: `${kind}Trigger` },
    reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
  }
}

// `buffActivationRefusalFor`'s own tests live in `buffActivationRefusal.test.ts` now — split out on
// the DLR-162..167 fix pass, when this file passed its 400-line budget. Those tests are pure
// question-in, reason-out calls on one predicate and need none of the fixtures above; this file
// keeps the TRANSITIONS: activate, spend, revoke, and the per-trick window.

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
    expect(buffActivationStockFor(state, shieldBuff(BuffTier.Bronze, 4), true).effectLive).toBe(
      true,
    )
  })
})

describe('activateFromPile — DLR-126, an activation that also SPENDS the card', () => {
  it('removes a consumable item from the pile and spends its AP in one move', () => {
    const ward = wardBuff(BuffTier.Bronze, 2)
    const pile: readonly Buff[] = [wardBuff(BuffTier.Bronze, 1), ward]

    const { activation, buffs } = activateFromPile(startBuffActivation(), pile, ward, true)

    // DLR-145 AC2 — AP_ENABLED is off, so the activation still spends the CARD but leaves the
    // pool untouched: `apCostOf(ward)` still prices the buff, but `spendAp` re-derives an
    // effective cost of 0 through the disabled flag.
    expect(activation.apPool).toBe(STARTING_AP)
    expect(activation.activatedThisTrick).toEqual([2])
    expect(buffs.map((b) => b.id)).toEqual([1])
    // The pile handed in is untouched — every transition in `src/hunt/` is pure.
    expect(pile).toHaveLength(2)
  })

  it('removes a Cheat from the pile too — DLR-142, Activated cards default to single-use', () => {
    const cheat = cheatBuff(BuffTier.Bronze, 3)
    const pile: readonly Buff[] = [cheat]

    const { activation, buffs } = activateFromPile(startBuffActivation(), pile, cheat, true)

    expect(buffs).toHaveLength(0)
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
  // bronze Shield then a bronze Ward — two live cards at 2 AP each. DLR-145 AC2 supersedes the
  // test's original point (stacking exhausts the pool and the next activation is refused
  // InsufficientAp): with AP_ENABLED off the pool never drops, so the SUBJECT becomes that
  // stacking several activations never depletes the pool and a further activation always succeeds.
  it('stacks a bronze Shield then a bronze Ward with the pool untouched, then permits a gold Cheat too', () => {
    let state: BuffActivationState = startBuffActivation()
    expect(state.apPool).toBe(STARTING_AP)

    const shieldCard = shieldBuff(BuffTier.Bronze, 1)
    const ward = wardBuff(BuffTier.Bronze, 2)

    state = activateBuff(state, shieldCard, true)
    expect(state.apPool).toBe(STARTING_AP)
    expect(state.activatedThisTrick).toContain(1)

    state = activateBuff(state, ward, true)
    expect(state.apPool).toBe(STARTING_AP)
    expect(state.activatedThisTrick).toEqual([1, 2])

    const cheat = cheatBuff(BuffTier.Gold, 3)
    const refusal = buffActivationRefusalFor(buffActivationStockFor(state, cheat, true))
    expect(refusal).toBeNull()
    state = activateBuff(state, cheat, true)
    expect(state.apPool).toBe(STARTING_AP)
    expect(state.activatedThisTrick).toEqual([1, 2, 3])
  })
})

describe('activateBuff + openBuffWindow — 2026-08-25, PerTrick cadence refills every trick boundary', () => {
  it('holds the pool at capacity across activations (DLR-145 AC2 — nothing spends AP any more) and clears activatedThisTrick at every openBuffWindow', () => {
    let state: BuffActivationState = startBuffActivation()

    const shield1 = shieldBuff(BuffTier.Bronze, 10)
    state = activateBuff(state, shield1, true)
    // DLR-145 supersedes this suite's original point (an activation drops the pool below
    // capacity, and openBuffWindow is what restores it): with AP_ENABLED off the pool never
    // drops in the first place. What still holds is that activatedThisTrick clears at the
    // trick boundary and the pool stays exactly at STARTING_AP throughout.
    expect(state.apPool).toBe(STARTING_AP)

    state = openBuffWindow(state)
    expect(state.apPool).toBe(STARTING_AP)
    expect(state.activatedThisTrick).toEqual([])

    const shield2 = shieldBuff(BuffTier.Bronze, 11)
    state = activateBuff(state, shield2, true)
    expect(state.apPool).toBe(STARTING_AP)

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
    const seeded: BuffActivationState = {
      apPool: 4,
      capacity: 6,
      activatedThisTrick: [7, 8],
      spentThisTrick: [],
    }
    const next = openBuffWindow(seeded)
    expect(next.activatedThisTrick).toEqual([])
    expect(next.apPool).toBe(6)
  })

  it('2026-08-25 — never changes capacity itself', () => {
    const seeded: BuffActivationState = {
      apPool: 2,
      capacity: 11,
      activatedThisTrick: [],
      spentThisTrick: [],
    }
    expect(openBuffWindow(seeded).capacity).toBe(11)
  })
})

describe('activateBuff never mutates its input state', () => {
  it('leaves the original state object untouched', () => {
    const state = startBuffActivation()
    const snapshot = { ...state, activatedThisTrick: [...state.activatedThisTrick] }
    const shieldCard = shieldBuff(BuffTier.Bronze, 20)
    activateBuff(state, shieldCard, true)
    expect(state.apPool).toBe(snapshot.apPool)
    expect(state.activatedThisTrick).toEqual(snapshot.activatedThisTrick)
  })
})

describe('AP_ENABLED is off (DLR-145) — the pool never actually drops, however the buff is priced', () => {
  it('activating a buff sets the pool to spendAp(before, apCostOf(buff)) — spendAp is a no-op, even though apCostOf itself still returns a nonzero raw price', () => {
    const state = startBuffActivation()
    const shieldCard = shieldBuff(BuffTier.Silver, 30)
    const next = activateBuff(state, shieldCard, true)
    expect(next.apPool).toBe(spendAp(state.apPool, apCostOf(shieldCard)))
    expect(AP_ENABLED).toBe(false)
    expect(apCostOf(shieldCard)).toBeGreaterThan(0)
    expect(next.apPool).toBe(state.apPool)
  })
})

describe('spentThisTrick (DLR-145)', () => {
  it('records a consumed condition card, and drops it from the returned pile', () => {
    const suitHigh = conditionBuff(BuffKind.SuitHigh, BuffTier.Bronze, 1)
    const { activation, buffs } = activateFromPile(
      startBuffActivation(),
      [suitHigh],
      suitHigh,
      true,
    )
    expect(buffs).toHaveLength(0)
    expect(activation.spentThisTrick.map((buff) => buff.id)).toEqual([1])
    expect(activation.activatedThisTrick).toEqual([1])
  })

  it('records nothing for a card that stays in the pile', () => {
    const kept = conditionBuff(BuffKind.MarkOfRank, BuffTier.Bronze, 2)
    const { activation, buffs } = activateFromPile(startBuffActivation(), [kept], kept, true)
    expect(buffs).toHaveLength(1)
    expect(activation.spentThisTrick).toEqual([])
  })

  it('openBuffWindow clears spentThisTrick on the SAME edge as activatedThisTrick', () => {
    const suitHigh = conditionBuff(BuffKind.SuitHigh, BuffTier.Bronze, 1)
    const { activation } = activateFromPile(startBuffActivation(), [suitHigh], suitHigh, true)
    const next = openBuffWindow(activation)
    expect(next.spentThisTrick).toEqual([])
    expect(next.activatedThisTrick).toEqual([])
  })

  it('refreshBuffsForNewHand clears it too', () => {
    const suitHigh = conditionBuff(BuffKind.SuitHigh, BuffTier.Bronze, 1)
    const { activation } = activateFromPile(startBuffActivation(), [suitHigh], suitHigh, true)
    expect(refreshBuffsForNewHand(activation).spentThisTrick).toEqual([])
  })
})

describe('isRevocableBuff — DLR-154 AC5/AC13', () => {
  it('reports a Shield as non-revocable', () => {
    expect(isRevocableBuff(shieldBuff(BuffTier.Bronze, 40))).toBe(false)
  })

  it('still reports a Cheat as non-revocable', () => {
    expect(isRevocableBuff(cheatBuff(BuffTier.Bronze, 41))).toBe(false)
  })
})

describe('ShopOnly (DLR-162)', () => {
  const openStock = {
    shopOnly: false,
    effectLive: true,
    curseLive: false,
    windowOpen: true,
    apPool: STARTING_AP,
    apCost: 1,
    alreadyActive: false,
  }

  it('refuses a shop-only card even on a wide-open felt', () => {
    expect(buffActivationRefusalFor({ ...openStock, shopOnly: true })).toBe(
      BuffActivationRefusal.ShopOnly,
    )
  })

  it('reports ShopOnly ahead of every other reason - it is true of the CARD, not of the felt', () => {
    const worst = {
      ...openStock,
      shopOnly: true,
      effectLive: false,
      curseLive: false,
      windowOpen: false,
      alreadyActive: true,
    }
    expect(buffActivationRefusalFor(worst)).toBe(BuffActivationRefusal.ShopOnly)
  })

  it('is set for a wildcard and for nothing else', () => {
    expect(isShopOnlyBuff(wildcardBuff(BuffTier.Bronze, 1))).toBe(true)
    expect(isShopOnlyBuff(cheatBuff(BuffTier.Bronze, 2))).toBe(false)
    expect(isShopOnlyBuff(shieldBuff(BuffTier.Bronze, 3))).toBe(false)
  })

  it('is carried onto the stock the felt reads', () => {
    const state = startBuffActivation()
    expect(buffActivationStockFor(state, wildcardBuff(BuffTier.Bronze, 1), true).shopOnly).toBe(
      true,
    )
    expect(buffActivationStockFor(state, cheatBuff(BuffTier.Bronze, 2), true).shopOnly).toBe(false)
  })

  it('prices a wildcard rather than throwing on a render path', () => {
    expect(() => apCostOf(wildcardBuff(BuffTier.Gold, 4))).not.toThrow()
  })
})
