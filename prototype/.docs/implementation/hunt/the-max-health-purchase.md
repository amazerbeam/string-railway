Part of [Hunt](README.md).

# The max-health purchase, and the ceiling becoming run state

DLR-158 put a second item on the shop's shelf — `ShopItem.MaxHealth` — and, to build it, moved the
player's maximum health out of a module constant and into the run.

## Before: the ceiling was a constant threaded through four defaulted parameters

`PLAYER_START_HEALTH` in `config.ts` was the only maximum the game had. Four functions took it as a
defaulted parameter — `shopStockFor`, `flaskStockFor`, `buyFromShop` and `drinkFlask`, each
`maxPlayerHealth: Health = PLAYER_START_HEALTH` — so a caller could pass whatever it liked and a
caller that forgot silently got the constant. Nothing raised it, and the parameter existed only so a
spec could vary the clamp without mutating module state.

## After: two fields on `RunState`

```ts
readonly maxPlayerHealth: Health    // the run's LIVE ceiling
readonly maxHealthPurchases: number // copies of the raise bought this run
```

Both are seeded by `startRun` — the ceiling from the `playerHealth` argument it already took, the
count at zero — and both ride `advanceRun`'s and `recordEncounter`'s existing spreads untouched, so
they have exactly the run-permanent lifetime `whetstones` and `apCapacityBonus` already had.
**Neither is persisted**: `RunState` is never saved, and `SAVE_SCHEMA_VERSION` was not touched.

**The four parameters were deleted rather than made required.** A required parameter still lets a
caller pass `10` against a run whose ceiling is `14`, which type-checks and silently clamps to the
wrong figure. Deleting it means `run.maxPlayerHealth` is the only reading there is, and every one of
the ~18 call sites that passed one became a `tsc` error — an exhaustive worklist rather than a
hopeful grep. `startEncounter` was deliberately **not** touched: its second parameter is *current*
health, a different quantity that happens to share a default.

`flaskHealAmount` also keeps its numeric parameter — it takes a number, not a run — and its callers
now hand it `run.maxPlayerHealth`. That is the whole of "the flask's percentage heal scales with the
raised ceiling": no edit to `flask.ts` at all.

## `maxHealth.ts` — the three figures and the two rules

A small pure module beside `shop.ts`, in the shape `rankTiers.ts` already established for the shop's
other stacking price. It is **not** in `config.ts`, which sits at 382 lines against this project's
400-line blocking budget; a cross-reference comment beside `HEAL_PRICE` names where these keys live.

| Constant                  | Value | Unit                                   |
| ------------------------- | ----- | -------------------------------------- |
| `MAX_HEALTH_PER_PURCHASE` | `2`   | health points added to the ceiling      |
| `MAX_HEALTH_PRICE_BASE`   | `3`   | coins — what the first copy costs       |
| `MAX_HEALTH_PRICE_STEP`   | `2`   | coins added per copy already bought     |

**All three are documented placeholders marked `VALUE UNCHOSEN` in the source, and none has ever
been played.** They are the developer's to move — DLR-158 puts choosing them out of scope and says
to ship rough defaults and tune by feel. At these figures the price ladder is 3 / 5 / 7 / 9 against
a 10-coin fight win.

```ts
export function maxHealthPriceFor(purchases: number): Coins   // base + step × purchases
export function raisedMaxHealthFor(maxPlayerHealth: Health): Health  // ceiling + step
```

`maxHealthPriceFor` is **the** single statement of the escalating price, so the tile, the refusal and
the coin deduction cannot disagree. Linear is the simplest rule satisfying "the Nth copy costs more
than the (N-1)th"; the ticket required only the ordering, so **the shape is a choice this
implementation made** and swapping it for a multiplier is an edit to that one expression.

**Both throw a `RangeError` rather than returning `NaN`.** `maxHealthPriceFor` rejects a non-integer
or negative count; `raisedMaxHealthFor` rejects a non-finite or non-positive ceiling, matching
`flaskHealAmount`'s existing guard. The reason is concrete in each case: a `NaN` price fails
`stock.coins < price` — every `NaN` comparison is false — so it would read as **affordable** and
charge an unknowable amount; a `NaN` ceiling would poison `Math.min` inside `healedBy`, land in
`encounter.health`, and vanish off the health bar with nothing logged.

## `priceOf` gained a required second parameter

```ts
export function priceOf(item: ShopItem, stock: ShopStock): Coins
```

Every other item has a fixed price; this one's depends on `stock.maxHealthPurchases`, which
`ShopStock` now carries. Required, not defaulted, for the same reason the four `maxPlayerHealth`
parameters were deleted. A second `currentPriceOf` beside `priceOf` was rejected on the module's own
stated ground: it would give the screen and the transition two functions that can disagree about
what a thing costs. With one function, `refusalFor`'s coin check, `buyFromShop`'s deduction and the
printed figure are necessarily the same number. The change ripples into every call site, about a dozen of
them in `shop.test.ts`.

`categoryOf` puts `MaxHealth` on `ShopCategory.RunPermanent`, beside the Whetstone and the AP raise;
`tieredRankOf` returns `null` for it; `SHOP_ITEMS` is `[Heal, MaxHealth]` — the first addition to the
shelf since the 2026-09-01 pass pared it to `Heal` alone, and nothing that left comes back.

## `refusalFor` gained no branch, and that is the rule

Being at full health must **not** refuse this purchase — the raise fills the bar to the new top
whether the player was hurt or not — so `MaxHealth` appears in no item-specific check and falls
straight through to the coin comparison. `NotEnoughCoins` is therefore the only reason it can ever
produce, and there is no purchase cap: the climbing price is the only limiter. This is expressed as
the *absence* of code, which is fragile against a well-meaning later edit, so a comment in
`refusalFor` says so outright: do not "fix" this by adding an `AlreadyFullHealth` branch.

## `buyFromShop` — raise, then fill, then count

```ts
case ShopItem.MaxHealth: {
  const raised = raisedMaxHealthFor(run.maxPlayerHealth)
  return {
    ...fullyHealed({ ...paid, maxPlayerHealth: raised }, raised),
    maxHealthPurchases: run.maxHealthPurchases + 1,
  }
}
```

**Order matters:** the ceiling is written before the fill, so `healedBy`'s clamp is measured against
the raised figure. "A player on 1 of 6 who buys a +2 raise leaves on 8 of 8" then falls out of
`Math.min(8, 1 + 8)` with no second clamp written and no special case in the health writer.

`fullyHealed(run, ceiling)` is a named private helper beside `healedBy` in `runTransitions.ts`,
rather than an inline `healedBy(run, max, max)` — the double-argument call is opaque about what it
means, and this file's convention is that a rule gets a name a reviewer can find. `healedBy` remains
the single writer that raises player health, so blue hearts are still never restored by any heal.

A **count** is incremented, not a flag set, exactly as `apCapacityBonus` counts purchases and
`apCapacityFor` owns the arithmetic.

`buyFromShop`'s leading guard moved from validating a parameter to validating `run.maxPlayerHealth`,
so a corrupted run still fails loudly at the purchase rather than silently clamping.

## Tests

`maxHealth.test.ts` covers the two functions and their guards; `run.maxHealth.test.ts` covers the
purchase end to end — the ceiling rising, the full restore from an arbitrary hurt state, the count
climbing, the price climbing with it, full health not refusing, short coins refusing with
`NotEnoughCoins` and changing nothing, and the flask healing a percentage of the raised ceiling. `shop.test.ts`, `run.shop.test.ts`, `run.flask.test.ts` and `shield.encounter.test.ts`
absorbed the signature changes.

## Where the screen half lives

The shop screen computes nothing, so the price is derived by the driver and handed down — see
[the shop screen](../run-ui/shop-screen.md) and [the run driver](../app/run-driver.md).
