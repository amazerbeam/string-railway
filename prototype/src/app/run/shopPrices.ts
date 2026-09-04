import { priceOf, ShopItem, type Coins, type ShopStock } from '../../hunt'

/**
 * Every `ShopItem`'s CURRENT price in one pass — the sibling of `shopRefusals.ts` and written to
 * its shape for its reason. DERIVED from the union rather than hand-listed, so an item added to
 * `ShopItem` needs no edit here and cannot arrive as an `undefined` the panel renders as blank.
 * Pure, and testable with no renderer.
 *
 * Exists because a price is stock-dependent from DLR-158 on: `ShopItem.MaxHealth` costs more with
 * every copy already bought. `ShopPanel` computes nothing, so the driver derives this and hands it
 * down — which is also what makes AC5's "the price updates after a purchase without leaving the
 * shop" fall out of the ordinary render rather than needing a mechanism.
 */
export function shopPricesFor(stock: ShopStock): Readonly<Record<ShopItem, Coins>> {
  const prices = {} as Record<ShopItem, Coins>
  for (const item of Object.values(ShopItem)) {
    prices[item] = priceOf(item, stock)
  }
  return prices
}
