Part of [Hunt](README.md).

# Coins and the shop — the run's economy, and the one predicate that guards it

`src/hunt/shop.ts` (DLR-84) is the game's first economy. It is deliberately tiny: a four-item
catalogue — two as DLR-84 shipped it, a third at DLR-90 and a fourth at DLR-91 — a price lookup, and
**one predicate** that decides whether a purchase may be made. The
purchase itself lives next door in `run.ts`, because spending changes a run and this module is not
allowed to know what a run is.

Before DLR-84 there was no currency anywhere — [PT-002 had left overkill damage explicitly
unconverted](hand-and-skull-tunables.md) and DLR-83 had laid `addCheat` and `nextCheatId` down
unread, naming this ticket as the thing that would call them. Both now have production readers.

## What a coin is, and where it comes from

`Coins` is a bare `number` alias in `types.ts` — a whole number, never fractional and never
negative. `RunState` carries one field of it:

```ts
readonly coins: Coins
```

`startRun` seeds it to `0`. `advanceRun` carries it across a fight boundary through the spread it
already had, so the carry needed no code. Exactly one thing credits it.

### The payout has one site, and it is `recordEncounter`

```ts
const wonThisEncounter = encounter.winner === DuelSide.Player
return {
  ...run,
  encounter,
  cheats,
  coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN : run.coins,
  outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
}
```

`recordEncounter` was already the one place a fight's outcome is derived, it already refuses a run
that has ended, and the driver stops feeding it hands once an encounter resolves — so the credit
lands **exactly once by construction** rather than by a guard.

The two alternatives were both worse and both were considered. Crediting in the driver puts a game
rule in a component. Crediting in `advanceRun` never pays for the **final** fight of a won run,
because `advanceRun` does not run after it.

## The catalogue, and the reason codes

```ts
export const ShopItem = {
  Cheat: 'cheat',
  Envenom: 'envenom', // DLR-90
  PoisonGuard: 'poisonGuard', // DLR-91
  Heal: 'heal',
} as const
export const SHOP_ITEMS: readonly ShopItem[] = [
  ShopItem.Cheat, ShopItem.Envenom, ShopItem.PoisonGuard, ShopItem.Heal,
]

export const PurchaseRefusal = {
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  GuardAlreadyActive: 'guardAlreadyActive', // DLR-91
  NotEnoughCoins: 'notEnoughCoins',
} as const
```

`SHOP_ITEMS` is the single statement of the catalogue — the screen **maps** it and never lists the
items itself, so a new item appears on screen without the component being edited. That prediction has
now been tested twice, by DLR-90 and DLR-91, and held both times.

**`Heal` stays last in `SHOP_ITEMS` on purpose**: `UNCATEGORISED_SHOP_ITEMS` derives from this array's
order, and the heal is the only member with no category. `SHOP_ITEMS` is also a plain array, so nothing
forces a new `ShopItem` member into it — `shop.test.ts`'s deep-equality assertion is what does. Since
DLR-89 it maps it **per shelf** rather than flat; see [the ladder](#the-persistence-length-ladder--dlr-89)
below.

A `PurchaseRefusal` is a **reason code, not a sentence**. `src/hunt/` holds no user-facing copy;
`src/app/run/shopLabels.ts` maps each code to words, through a `Record` total over the union — so a new
code is a compile error there rather than a blank sentence on screen. `priceOf` is an exhaustive
`switch` over `ShopItem` rather than a `Record`, so adding an item is a compile error at the lookup
rather than an `undefined` price at runtime.

## The persistence-length ladder — DLR-89

DLR-89 organised the catalogue into **four rungs by how long a purchase lasts**, so the shape of the
intended shop reads before the items that fill it exist. The rungs are named after the design doc's
own terms rather than Balatro's deck / Joker / consumable, because this game has no deck-building
layer for those names to mean anything against (version-4-scope §1).

```ts
export const ShopCategory = {
  OneTimeUse: 'oneTimeUse',
  FightLong: 'fightLong',
  RunPermanent: 'runPermanent',
  GamePermanent: 'gamePermanent',
} as const
export const SHOP_CATEGORIES: readonly ShopCategory[] = [/* the four, in render order */]
```

An `as const` map rather than an `enum`, because `erasableSyntaxOnly` is on. `SHOP_CATEGORIES` is
**the** statement of tab order — the screen maps it and never lists the four categories itself.

### `categoryOf` returns `ShopCategory | null`, and the `null` is a real answer

```ts
export function categoryOf(item: ShopItem): ShopCategory | null {
  switch (item) {
    case ShopItem.Cheat:
    case ShopItem.Envenom: // DLR-90
      return ShopCategory.OneTimeUse
    case ShopItem.PoisonGuard: // DLR-91 — the fight-long shelf's first item
      return ShopCategory.FightLong
    case ShopItem.Heal:
      return null
  }
}
```

An exhaustive `switch` copying `priceOf`'s shape, so a new item is a compile error here rather than
an item that quietly appears on no shelf.

**Heal's `null` is its answer, not a missing one.** A heal is an instant transfer with no duration, so
it sits outside the ladder entirely rather than being forced onto a rung. The ticket's own acceptance
criteria said both "every entry in `SHOP_ITEMS` carries a category" *and* "`Heal` carries no
category" — literally contradictory, since Heal is a `SHOP_ITEMS` entry. The reading taken: the
assignment is **total over `ShopItem`**, and Heal's assignment is `null`. `SHOP_ITEMS` itself is
untouched, so `canBuyAnything` and the spec asserting the catalogue holds exactly two members both
keep working unchanged.

### The two groupings are derived once, at module load

```ts
export const SHOP_ITEMS_BY_CATEGORY: Readonly<Record<ShopCategory, readonly ShopItem[]>>
export const UNCATEGORISED_SHOP_ITEMS: readonly ShopItem[]   // [Heal] — and only ever Heal so far
```

Both are computed from `SHOP_ITEMS` + `categoryOf` by a hoisted `itemsOnRung` helper — hoisted
deliberately, because `SHOP_ITEMS_BY_CATEGORY` calls it from above and a `const` arrow would be a
temporal-dead-zone error at module init.

Three consequences, and the first is the one three follow-on tickets depend on:

- **Adding an item needs no UI edit at all** — one `ShopItem` member, one `priceOf` case, one
  `categoryOf` case, and it appears on the right shelf. The catalogue is still stated exactly once.
- `SHOP_ITEMS_BY_CATEGORY` is **total over `ShopCategory`**, so a fifth rung is a compile error rather
  than an `undefined` a tab would render as nothing.
- Grouping is a **module-load constant, not a render-time filter**. Switching shelves never re-scans a
  catalogue that is expected to grow, and no `useMemo` is involved — which would have needed profiling
  evidence it does not have.

### `isShopCategoryAvailable` is not "is this rung empty"

```ts
export function isShopCategoryAvailable(category: ShopCategory): boolean {
  return category !== ShopCategory.GamePermanent
}
```

`GamePermanent` is **shown and refused** rather than hidden, so the shape of the full ladder reads
before every rung is filled. This is deliberately a separate fact from emptiness: run-permanent is
still empty today and perfectly selectable, and fight-long was too **until DLR-91 put Poison Guard on
it** — which needed no change here, because availability was never read off a shelf's length. Reading refusal off a zero-length
array would start refusing those two as well, and would silently *stop* refusing game-permanent the
moment its first item shipped.

Nothing about pricing, refusals or the purchase path changed — DLR-89 added a grouping and no rule.

## `ShopStock` — the snapshot, deliberately not a `RunState`

```ts
export interface ShopStock {
  readonly coins: Coins
  readonly cheatCount: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
  readonly poisonGuardHeld: boolean // DLR-91
}
```

Five fields, and nothing else. The fifth is **required**, not optional, so every construction site was
a compile error until it was supplied — `shopStockFor` and every literal in `shop.test.ts`. This module states the shop's rules and **must not learn the run's
shape** — which is what keeps its whole specification function-in, value-out with no renderer and no
`RunState` in sight. `run.ts`'s `shopStockFor(run, maxPlayerHealth?)` performs the projection, so no
screen assembles a `ShopStock` by hand and gets one field wrong.

## `refusalFor` — the one rule, read four times

```ts
export function refusalFor(stock: ShopStock, item: ShopItem): PurchaseRefusal | null {
  if (item === ShopItem.Cheat && stock.cheatCount >= CHEAT_SLOT_COUNT) return PurchaseRefusal.SlotsFull
  if (item === ShopItem.Heal && stock.playerHealth >= stock.maxPlayerHealth) return PurchaseRefusal.AlreadyFullHealth
  if (item === ShopItem.PoisonGuard && stock.poisonGuardHeld) return PurchaseRefusal.GuardAlreadyActive // DLR-91
  if (!Number.isFinite(stock.coins) || stock.coins < priceOf(item)) return PurchaseRefusal.NotEnoughCoins
  return null
}
```

**This is the load-bearing arrangement of the whole ticket, and it is worth stating as a convention
rather than as a detail.** One exported predicate is read by:

| Reader | What it does with the answer |
| --- | --- |
| `buyFromShop` (`run.ts`) | throws a `RangeError` on a non-null result |
| `handleBuy` (`src/App.tsx`) | no-ops inside the state updater on a non-null result |
| the `refusals` prop `App.tsx` derives | greys the purchase control and prints the reason |
| `canBuyAnything` (below) | `some()` over it, to decide whether the verdict warns |

A component that re-derived "are the slots full" from `cheats.length` would be a second reading of a
rule `cheats.ts` already owns, and the visible symptom would be an enabled button that throws. **No
call site re-derives a refusal from raw fields**; the reviewers checked this specifically.

Two details in that function are defensive rather than cosmetic:

- **Item-specific reasons come before the coin check.** With full slots *and* no coins, buying a
  Cheat reports `SlotsFull` — the reason that will still be true when the coin arrives, and
  therefore the more useful one to print. DLR-91's Guard clause was placed under the same rule.
- **A non-finite balance refuses rather than passing the comparison.** `NaN >= 1` is `false`, which
  would otherwise read as "not enough coins" *by accident* and hide a poisoned figure behind a
  plausible-looking message.

### `canBuyAnything` is `some()` over it, never a second reading

```ts
export function canBuyAnything(stock: ShopStock): boolean {
  return SHOP_ITEMS.some((item) => refusalFor(stock, item) === null)
}
```

This is what the verdict's `Continue` warning fires on. Deliberately **affordability, not a non-zero
balance**: a player holding a coin with both slots full and full health has nothing to stop for, and
a warning that cannot be acted on is noise. It also means the warning cannot claim there is
something to buy while every purchase card on the shop screen is greyed out.

## `buyFromShop` — the purchase

`run.ts` composes: consult `refusalFor`, throw if it is non-null, otherwise deduct and apply.

```ts
const paid = { ...run, coins: run.coins - priceOf(item) }
// DLR-90 — a `switch` with NO `default`, so a new item is a compile error here.
switch (item) {
  case ShopItem.Cheat:
    return { ...paid, cheats: addCheat(run.cheats, { id: run.nextCheatId }), nextCheatId: run.nextCheatId + 1 }
  case ShopItem.Envenom:
    return { ...paid, envenomCharges: run.envenomCharges + 1 }
  case ShopItem.PoisonGuard: // DLR-91
    return { ...paid, poisonGuardHeld: true }
  case ShopItem.Heal:
    return { ...paid, encounter: { ...run.encounter, health: { ...run.encounter.health,
      [DuelSide.Player]: Math.min(maxPlayerHealth, run.encounter.health[DuelSide.Player] + HEAL_HEALTH_RESTORED) } } }
}
```

**DLR-90 restructured that tail, and it was hiding a real defect.** Until the third item arrived the
function branched `if (item === ShopItem.Cheat) { … }` and then **returned the heal unconditionally**
as its fallback — so adding Envenom without restructuring would have healed the player, silently, and
type-checked cleanly. It is now exhaustive with no `default` and every arm returning, which makes a
new item a compile error here rather than an item that quietly does whatever the last branch
happened to do. QA confirmed the fix in a real browser as well as in the type system: buying a Heal
raises health and leaves the Envenom count untouched. **DLR-91 was the first item to arrive after that
fix, and it landed as one added `case` and nothing else.**

**Envenom needed no `refusalFor` clause**, and that is the correct rule rather than an omission — it
falls through both item-specific guards to the coin check, because there is no cap on charges held.
The Cheat's `SlotsFull` refusal exists because `CHEAT_SLOT_COUNT` is a designed cap. See
[Envenom — the held charge, the delayed-hit queue, and where it is paid](envenom-and-the-delayed-hit.md).

**Poison Guard is the opposite case, and it does need one.** Only one may be held at a time, so a
second purchase while one is unspent is refused with `GuardAlreadyActive` rather than silently
overwriting or stacking — DLR-91 AC3 states that outright. The flag's lifetime is the part worth
reading before touching it: it lives on `RunState` so it survives the `advanceRun` that opens the fight
it was bought for, and a private `guardAfter` clears it when that fight resolves. See
[Poison Guard](poison-guard.md).

Four things about it are decisions rather than mechanics:

**It throws rather than returning the run unchanged.** A silent no-op is exactly the "took payment
for nothing" failure `cheats.ts`'s `addCheat` already refuses to allow. Reaching the throw is a
**driver bug** — the control is disabled whenever `refusalFor` is non-null — so it exists to be loud
rather than to be caught. The message names the item, the code, and the balance. There is no `catch`
anywhere in the diff.

**The heal writes into `encounter.health[DuelSide.Player]`, because that *is* the carried figure.**
`run.ts`'s own docblock states that a second copy of player health beside the encounter is the
number that drifts, and `advanceRun` seeds the next fight from this one. It deliberately does **not**
go through `applyDamage`, which refuses a resolved encounter — and at the moment a purchase happens
the encounter is always resolved. A restore is not a damage event.

**`Math.min` is the single clamp, and therefore the single place overheal is discarded.** Buying at
9 of 10 lands exactly on 10 and the surplus leaves no trace anywhere in the returned state.

**A bought Cheat gets a fresh id from `nextCheatId`, which advances.** This is precisely what DLR-83
laid that counter down for: re-issuing a spent card's id would collide as a React key. Before this
ticket `nextCheatId` never advanced past the opening grant, and its contract flagged that as
possibly not worth its place — it is now load-bearing.

`maxPlayerHealth` is a **defaulted parameter** on both `shopStockFor` and `buyFromShop`
(`= PLAYER_START_HEALTH`), matching `startEncounter`/`startRun`'s injectable pattern so a spec varies
the clamp without mutating module state. `buyFromShop` validates it (`Number.isFinite` and `> 0`)
before doing anything, so a bad ceiling cannot silently poison a health bar.

## The tunables

Almost all of them are **transcribed**, not chosen here — the five below from DLR-84's ticket and the
design doc, plus `ENVENOM_PRICE` (2 coins) and `ENVENOM_QUARRY_DAMAGE` (4 health) from
`version-4-scope.md` at DLR-90. **One exception: `ENVENOM_PLAYER_DAMAGE` (2 health) is the developer's
own choice**, added by DLR-91 on 2026-08-19 when the single `ENVENOM_DAMAGE` key was split — the
player-side hit is deliberately smaller, because it *also* forces the streak's cash-out.

| Key | Value | Unit |
| --- | --- | --- |
| `COINS_PER_ENCOUNTER_WIN` | `1` | coins, credited once per encounter won |
| `CHEAT_PRICE` | `1` | coins per purchase |
| `HEAL_PRICE` | `1` | coins per purchase |
| `POISON_GUARD_PRICE` | `1` | coins per purchase (DLR-91) |
| `HEAL_HEALTH_RESTORED` | `4` | health points, added once, before the clamp |

**`POISON_GUARD_PRICE` is its own key rather than a reuse of `HEAL_PRICE`**, for the reason those two
are already separate: re-pricing one item must not move another. It is priced level with the heal
because both are a 1-coin-for-4-health trade run in opposite directions — that is the design doc's
reasoning, transcribed, not arithmetic done here.

The Cheat's and the heal's prices are **deliberately separate keys** rather than one shared price. The ticket predicts
the player buying Heal on every visit and names re-pricing the Cheat as the answer — which is only a
one-line change if the two prices are two keys.

`config.test.ts` pins their **shape and not their values** — non-negative integers, and a heal that
is positive, finite, and no larger than `PLAYER_START_HEALTH`. A test asserting `1` would turn a
one-line re-price into a two-line one, which is the opposite of what the keys are for.

`HEAL_HEALTH_RESTORED` is the **only source of healing in the game**. There is no flask and no rest
site, and `ENCOUNTER_PLAYER_RESTORE` beside it stays deliberately unread — DLR-82 forbade wiring it
in and DLR-84 did not.

## Purity

`shop.ts` imports only `./config` and `./types` — no React, no DOM global, no `Math.random()`, and
DLR-90 and DLR-91 added no import to it. The
economy is integer arithmetic on configured constants; **there is no division anywhere in it**, so
the classic `NaN` source is absent and no epsilon is needed. `run.ts` gained imports from `./shop`
and `./cheats`, both already inside the lint-enforced `src/hunt/**` tree, so the existing
`eslint.config.js` override covers the new file without an edit.

Nothing here is persisted. Coins die on reload with the rest of `RunState`, which the ticket puts
out of scope — but it means the first ticket to add a save file inherits a `coins` field with no
migration story, and since DLR-90/DLR-91 an `envenomCharges` count and a `poisonGuardHeld` flag beside
it. Every shape change made here is free **today** and becomes a migration the first time a run is
saved.
