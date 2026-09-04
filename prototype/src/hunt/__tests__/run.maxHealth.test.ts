import { describe, expect, it } from 'vitest'
import { buyFromShop, drinkFlask, shopStockFor, startRun } from '../run'
import { applyDamage } from '../encounter'
import { flaskHealAmount } from '../flask'
import { MAX_HEALTH_PER_PURCHASE, maxHealthPriceFor } from '../maxHealth'
import { PurchaseRefusal, refusalFor, ShopItem } from '../shop'
import { DuelSide, type EncounterState } from '../types'
import type { RunState } from '../run'

/** A run with coins to spend, on the given carried health. */
const funded = (coins: number, health: number): RunState => {
  const run = startRun(health)
  return { ...run, coins }
}

/** A resolved encounter the player won, on the given carried health — drained through
 *  `applyDamage` rather than built by hand, so `winner` and `isEncounterResolved` are set by the
 *  engine's own rules, following `run.flask.test.ts`'s own `wonEncounter` fixture. */
function wonEncounter(encounter: EncounterState, carriedPlayerHealth: number): EncounterState {
  let next: EncounterState = {
    ...encounter,
    health: { ...encounter.health, [DuelSide.Player]: carriedPlayerHealth },
  }
  while (next.winner === null) {
    next = applyDamage(next, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: next.health[DuelSide.Quarry],
    })
  }
  return next
}

/** A run with a RESOLVED, won encounter, so `drinkFlask` (a between-fights action) is legal. */
const resolvedFunded = (coins: number, health: number): RunState => {
  const run = funded(coins, health)
  return { ...run, encounter: wonEncounter(run.encounter, health) }
}

describe('DLR-158 — the max-health purchase', () => {
  it('AC1 — raises the run maximum by the configured amount', () => {
    const run = funded(10, 6)
    const bought = buyFromShop(run, ShopItem.MaxHealth)
    expect(bought.maxPlayerHealth).toBe(run.maxPlayerHealth + MAX_HEALTH_PER_PURCHASE)
  })

  it('AC2 — fills to the NEW ceiling from a hurt state', () => {
    const run = funded(10, 6)
    const hurt = {
      ...run,
      encounter: {
        ...run.encounter,
        health: { ...run.encounter.health, [DuelSide.Player]: 1 },
      },
    }
    const bought = buyFromShop(hurt, ShopItem.MaxHealth)
    const raisedCeiling = hurt.maxPlayerHealth + MAX_HEALTH_PER_PURCHASE
    expect(bought.maxPlayerHealth).toBe(raisedCeiling)
    expect(bought.encounter.health[DuelSide.Player]).toBe(raisedCeiling)
  })

  it('AC2/AC6 — buying at full health still raises the ceiling and is not refused', () => {
    const run = funded(10, 6)
    const full = {
      ...run,
      encounter: {
        ...run.encounter,
        health: { ...run.encounter.health, [DuelSide.Player]: run.maxPlayerHealth },
      },
    }
    const stock = shopStockFor(full)
    expect(refusalFor(stock, ShopItem.MaxHealth)).toBeNull()
    const bought = buyFromShop(full, ShopItem.MaxHealth)
    const raisedCeiling = full.maxPlayerHealth + MAX_HEALTH_PER_PURCHASE
    expect(bought.maxPlayerHealth).toBe(raisedCeiling)
    expect(bought.encounter.health[DuelSide.Player]).toBe(raisedCeiling)
  })

  it('AC4 — consecutive purchases cost strictly more each time', () => {
    const run = funded(1000, 6)
    const first = buyFromShop(run, ShopItem.MaxHealth)
    expect(run.coins - first.coins).toBe(maxHealthPriceFor(0))
    const second = buyFromShop(first, ShopItem.MaxHealth)
    expect(first.coins - second.coins).toBe(maxHealthPriceFor(1))
    const third = buyFromShop(second, ShopItem.MaxHealth)
    expect(second.coins - third.coins).toBe(maxHealthPriceFor(2))
    expect(third.maxHealthPurchases).toBe(3)
  })

  it('AC3 — the flask heals a percentage of the RAISED ceiling', () => {
    const before = resolvedFunded(1000, 6)
    const beforeHeal = flaskHealAmount(before.maxPlayerHealth)

    const bought = buyFromShop(before, ShopItem.MaxHealth)
    const afterHeal = flaskHealAmount(bought.maxPlayerHealth)
    expect(afterHeal).toBeGreaterThan(beforeHeal)

    // Hurt the raised run, resolve its encounter, then drink — the restored amount is the RAISED
    // figure, not the pre-purchase one.
    const hurt = {
      ...bought,
      encounter: wonEncounter(
        { ...bought.encounter, health: { ...bought.encounter.health, [DuelSide.Player]: 1 } },
        1,
      ),
    }
    const drunk = drinkFlask(hurt)
    expect(drunk.encounter.health[DuelSide.Player]).toBe(1 + afterHeal)
  })

  it('AC6 — short coins refuses with NotEnoughCoins and nothing changes', () => {
    const run = funded(0, 6)
    const stock = shopStockFor(run)
    expect(refusalFor(stock, ShopItem.MaxHealth)).toBe(PurchaseRefusal.NotEnoughCoins)
    const before = JSON.stringify(run)
    expect(() => buyFromShop(run, ShopItem.MaxHealth)).toThrow(/notEnoughCoins/)
    expect(JSON.stringify(run)).toBe(before)
  })

  it('AC5 — the price on the stock climbs the moment a purchase lands', () => {
    const run = funded(1000, 6)
    const purchasesBefore = shopStockFor(run).maxHealthPurchases
    const priceBefore = maxHealthPriceFor(purchasesBefore)

    const bought = buyFromShop(run, ShopItem.MaxHealth)
    const purchasesAfter = shopStockFor(bought).maxHealthPurchases
    const priceAfter = maxHealthPriceFor(purchasesAfter)

    expect(purchasesAfter).toBe(purchasesBefore + 1)
    expect(priceAfter).toBeGreaterThan(priceBefore)
  })
})
