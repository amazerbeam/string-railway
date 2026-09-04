import { describe, expect, it } from 'vitest'
import { priceOf, ShopItem, type ShopStock } from '../../../hunt'
import { shopPricesFor } from '../shopPrices'
import { ALL_BRONZE } from '../../../hunt/rankTiers'

const stock = (over: Partial<ShopStock> = {}): ShopStock => ({
  coins: 5,
  playerHealth: 6,
  maxPlayerHealth: 10,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
  ...over,
})

describe('shopPricesFor', () => {
  it('prices every ShopItem member, shelved or not', () => {
    const prices = shopPricesFor(stock())
    for (const item of Object.values(ShopItem)) {
      expect(typeof prices[item]).toBe('number')
    }
  })

  it('never reads the price rule a second time', () => {
    const s = stock()
    const prices = shopPricesFor(s)
    for (const item of Object.values(ShopItem)) {
      expect(prices[item]).toBe(priceOf(item, s))
    }
  })
})
