import { describe, expect, it } from 'vitest'
import { ShopItem, PurchaseRefusal, ALL_BRONZE } from '../../../hunt'
import { shopRefusalsFor } from '../shopRefusals'

const stock = {
  coins: 5,
  playerHealth: 10,
  maxPlayerHealth: 20,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
}

describe('shopRefusalsFor', () => {
  it('answers for every ShopItem the union declares', () => {
    const refusals = shopRefusalsFor(stock)
    for (const item of Object.values(ShopItem)) {
      expect(Object.prototype.hasOwnProperty.call(refusals, item)).toBe(true)
    }
  })

  it('refuses a heal at full health and nothing else for that reason', () => {
    const full = shopRefusalsFor({ ...stock, playerHealth: 20 })
    expect(full[ShopItem.Heal]).toBe(PurchaseRefusal.AlreadyFullHealth)
  })

  it('refuses everything priced above the purse for want of coins', () => {
    expect(shopRefusalsFor({ ...stock, coins: 0 })[ShopItem.Heal]).toBe(
      PurchaseRefusal.NotEnoughCoins,
    )
  })
})
