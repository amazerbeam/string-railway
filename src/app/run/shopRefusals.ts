import { refusalFor, ShopItem, type PurchaseRefusal, type ShopStock } from '../../hunt'

/**
 * Every `ShopItem`'s refusal in one pass. DERIVED from the union rather than hand-listed: this was
 * an eight-row literal inside `App.tsx` that had to be edited by hand whenever `ShopItem` gained a
 * member, and a missing row was an `undefined` the panel rendered as "buyable". Pure, and testable
 * with no renderer. Reads `refusalFor` — never a second reading of the shop's rules.
 */
export function shopRefusalsFor(
  stock: ShopStock,
): Readonly<Record<ShopItem, PurchaseRefusal | null>> {
  const refusals = {} as Record<ShopItem, PurchaseRefusal | null>
  for (const item of Object.values(ShopItem)) {
    refusals[item] = refusalFor(stock, item)
  }
  return refusals
}
