import { describe, expect, it } from 'vitest'
import {
  advanceRun,
  applyDamage,
  buyFromShop,
  DuelSide,
  POISON_GUARD_PRICE,
  PurchaseRefusal,
  recordEncounter,
  refusalFor,
  ShopItem,
  shopStockFor,
  startRun,
} from '..'

/** A run holding enough coins to buy a Guard, sitting on a won encounter — which is the only
 *  state the shop is reachable from. */
function wonRunWithCoins(coins: number) {
  const run = startRun(10)
  const killed = applyDamage(run.encounter, {
    [DuelSide.Player]: 0,
    [DuelSide.Quarry]: run.encounter.health[DuelSide.Quarry],
  })
  return {
    ...recordEncounter(
      run,
      killed,
      run.cheats,
      run.envenomCharges,
      false,
      run.discardsRemaining,
      null,
    ),
    coins,
  }
}

describe('Poison Guard purchase (AC1/AC3)', () => {
  it('AC1 — buying one spends the price and holds the Guard', () => {
    const bought = buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard)
    expect(bought.poisonGuardHeld).toBe(true)
    expect(bought.coins).toBe(3 - POISON_GUARD_PRICE)
  })

  it('AC3 — a second purchase is refused rather than stacking or overwriting', () => {
    const bought = buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard)
    expect(refusalFor(shopStockFor(bought), ShopItem.PoisonGuard)).toBe(
      PurchaseRefusal.GuardAlreadyActive,
    )
    expect(() => buyFromShop(bought, ShopItem.PoisonGuard)).toThrow(RangeError)
    expect(bought.coins).toBe(3 - POISON_GUARD_PRICE)
  })

  it('a fresh run holds no Guard', () => {
    expect(startRun(10).poisonGuardHeld).toBe(false)
  })
})

describe('Poison Guard lifetime (AC2)', () => {
  it('AC2 — survives the advanceRun that opens the fight it was bought for', () => {
    const bought = buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard)
    expect(advanceRun(bought).poisonGuardHeld).toBe(true)
  })

  it('AC2 — is gone once that fight resolves, spent or not', () => {
    const fighting = advanceRun(buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard))
    const killed = applyDamage(fighting.encounter, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: fighting.encounter.health[DuelSide.Quarry],
    })
    const after = recordEncounter(
      fighting,
      killed,
      fighting.cheats,
      fighting.envenomCharges,
      true,
      fighting.discardsRemaining,
      null,
    )
    expect(after.poisonGuardHeld).toBe(false)
  })

  it('AC2 — survives a hand that does NOT resolve the fight', () => {
    const fighting = advanceRun(buyFromShop(wonRunWithCoins(3), ShopItem.PoisonGuard))
    const scratched = applyDamage(fighting.encounter, {
      [DuelSide.Player]: 1,
      [DuelSide.Quarry]: 1,
    })
    const after = recordEncounter(
      fighting,
      scratched,
      fighting.cheats,
      fighting.envenomCharges,
      true,
      fighting.discardsRemaining,
      null,
    )
    expect(after.poisonGuardHeld).toBe(true)
  })
})
