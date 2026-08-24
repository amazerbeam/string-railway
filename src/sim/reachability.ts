/**
 * DLR-120 — the integration ticket's reachability audit: which cards the game DECLARES against
 * which cards a player can actually OBTAIN. Derived from production data at every step and
 * hand-listing nothing, so a family added to `BUFF_TEMPLATES` or an item returned to `SHOP_ITEMS`
 * is admitted here without an edit.
 *
 * It lives in `src/sim/` rather than in `src/hunt/` because reachability is a property of the WHOLE
 * RUN — a card exists AND some path puts it in a player's hand — and no single module owns both
 * halves. `src/sim/` is the only tree whose subject is the whole run.
 *
 * A PURE, DATA-ONLY module: it builds no `RoundState`, drives no reducer, and calls no `rng`.
 */
import { BUFF_TEMPLATES, BuffKind, SHOP_ITEMS, ShopItem, startRun } from '../hunt'

/** Every `BuffKind` some production path can put in the BUFF PILE today. `Unassigned` is excluded:
 *  it is `seedStartingBuffPile`'s placeholder, filtered out of every offer by `activatableBuffs`,
 *  and it is not a card. */
export function mintableBuffKinds(): ReadonlySet<BuffKind> {
  const kinds = new Set<BuffKind>()
  for (const template of BUFF_TEMPLATES) {
    kinds.add(template.kind)
  }
  for (const buff of startRun().buffs) {
    if (buff.kind !== BuffKind.Unassigned) kinds.add(buff.kind)
  }
  return kinds
}

/** Every `BuffKind` the game declares that no production path can mint — `mintableBuffKinds`'s
 *  complement, less `Unassigned`. NON-EMPTY TODAY, and that is the finding, not a bug in this
 *  function: see `reachability.test.ts` for what is in it and which ticket each entry belongs to. */
export function unreachableBuffKinds(): ReadonlySet<BuffKind> {
  const mintable = mintableBuffKinds()
  const unreachable = new Set<BuffKind>()
  for (const kind of Object.values(BuffKind)) {
    if (kind !== BuffKind.Unassigned && !mintable.has(kind)) unreachable.add(kind)
  }
  return unreachable
}

/** Every `ShopItem` the game prices that the current shelf does not offer. `SHOP_ITEMS` is the
 *  shelf; the `ShopItem` union is everything `priceOf` still knows how to charge for. */
export function unshelvedShopItems(): ReadonlySet<ShopItem> {
  const shelved = new Set<ShopItem>(SHOP_ITEMS)
  const unshelved = new Set<ShopItem>()
  for (const item of Object.values(ShopItem)) {
    if (!shelved.has(item)) unshelved.add(item)
  }
  return unshelved
}
