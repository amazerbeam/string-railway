Part of [Hunt](README.md).

# Coins and the shop — the run's economy, and the one predicate that guards it

`src/hunt/shop.ts` (DLR-84) is the game's first economy. It is deliberately tiny: a catalogue, a
price lookup, and
**one predicate** that decides whether a purchase may be made. The
purchase itself lives next door in `run.ts`, because spending changes a run and this module is not
allowed to know what a run is.

> **DLR-132 deleted `cheats.ts`, `CHEAT_SLOT_COUNT` and `RunState.timebombCharges`, 2026-08-24.**
> Every reference to them below (`cheats.length`, `addCheat`, `nextCheatId`, `stock.cheatCount`) is
> this file's original historical record and describes machinery that no longer exists — a Cheat and
> a Timebomb are ordinary `Buff` objects in `RunState.buffs` now, with no capacity cap. Both purchases
> remain off the shelf (`SHOP_ITEMS` still does not list either `ShopItem`, unchanged since DLR-116);
> what changed is only what the branch does on the rare direct call. See
> [Cheat and Timebomb as buff-pile objects](cheat-and-timebomb-buffs.md).

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
already had, so the carry needed no code. Exactly one transition credits it — since DLR-95 with two
terms rather than one.

### The crediting has one site, and it is `recordEncounter`

```ts
const wonThisEncounter = encounter.winner === DuelSide.Player
return {
  ...run,
  encounter,
  cheats,
  coins: wonThisEncounter ? run.coins + COINS_PER_ENCOUNTER_WIN + quickKill : run.coins,
  outcome: outcomeFor(run.encounterIndex, run.encounterCount, encounter),
}
```

**Two payouts, one site.** DLR-84 shipped this as the flat `COINS_PER_ENCOUNTER_WIN` alone; DLR-95
added the **quick-kill payout** beside it in the same expression, so a fast win now pays more than a
slow one. The two are **additive** — a reading the developer resolved on 2026-08-20, and one that
must not be "simplified" back into a replacement, because the quick kill tapers to zero from the
fourth hand of a fight and the flat coin is what stops a long win paying literally nothing. What
gets credited is still decided in exactly one place; only _how much_ gained a second term.
`quickKill` is computed just above this return, and the rule behind it belongs to
[the quick-kill payout](quick-kill-payout.md) rather than to this file.

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
  Timebomb: 'timebomb', // DLR-90
  BlastGuard: 'blastGuard', // DLR-91
  Whetstone: 'whetstone', // DLR-92
  Heal: 'heal',
  ApCapacity: 'apCapacity', // DLR-116
} as const

// DLR-116 pared this to the two fixed items. The UNION above still holds all six.
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.ApCapacity, ShopItem.Heal]

export const PurchaseRefusal = {
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  GuardAlreadyActive: 'guardAlreadyActive', // DLR-91
  NotEnoughCoins: 'notEnoughCoins',
} as const
```

`SHOP_ITEMS` is the single statement of the catalogue — the screen **maps** it and never lists the
items itself, so a new item appears on screen without the component being edited. That prediction was
tested **three times**, by DLR-90, DLR-91 and DLR-92, and held every time.

**DLR-116 pared the offered list to two, and the distinction it drew is the one to remember:**

> `SHOP_ITEMS` is **what the shop offers**. The `ShopItem` union is **everything the game prices.**

Cheat, Timebomb, Blast Guard and Whetstone left the list; **none of their mechanics left the
codebase.** `priceOf`, `categoryOf`, `refusalFor` and `buyFromShop` all stay **total over the union**,
so each is still priced, still buyable by a caller, and still covered by `shop.test.ts` — which now
also iterates `Object.values(ShopItem)` to assert exactly that. The consequence, stated plainly: until
a later ticket re-offers them, **no screen sells those four.** That is what "pared down, tested before
anything else is added back" asks for.

`ApCapacity` is DLR-116's one new item — `AP_CAPACITY_PRICE` coins for `AP_CAPACITY_STEP` (5) action
points a hand, for the rest of the run, stacking without a cap. It gained **no** `refusalFor` case,
which is precisely what "fixed and always-purchasable" means: only the coin check can refuse it.
`RunState.apCapacityBonus` counts purchases rather than points, and `apCapacityFor` owns the
multiplication so the step is stated once.

**`Heal` stays last in `SHOP_ITEMS` on purpose**: `UNCATEGORISED_SHOP_ITEMS` derives from this array's
order, and the heal is the only member with no category. `SHOP_ITEMS` is also a plain array, so nothing
forces a new `ShopItem` member into it — `shop.test.ts`'s deep-equality assertion is what does.

**The four-rung ladder below is still the model, but no longer a widget.** DLR-116 deleted
`ShopCategoryTabs.tsx`: two fixed items do not need a shelf ladder over a catalogue that is empty on
three rungs. `ShopCategory`, `SHOP_CATEGORIES`, `categoryOf`, `SHOP_ITEMS_BY_CATEGORY`,
`UNCATEGORISED_SHOP_ITEMS` and `isShopCategoryAvailable` all remain exported and tested, and
`SHOP_ITEMS_BY_CATEGORY` now derives to `{ oneTimeUse: [], fightLong: [], runPermanent: [ApCapacity],
gamePermanent: [] }`. A tab widget is not a mechanic, and the ladder is expected back once there is a
catalogue to hang on it.

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
    case ShopItem.Timebomb: // DLR-90
      return ShopCategory.OneTimeUse
    case ShopItem.BlastGuard: // DLR-91 — the fight-long shelf's first item
      return ShopCategory.FightLong
    case ShopItem.Whetstone: // DLR-92 — the run-permanent shelf's first item
    case ShopItem.ApCapacity: // DLR-116 — truthfully run-permanent, though no shelf renders it
      return ShopCategory.RunPermanent
    case ShopItem.Heal:
      return null
  }
}
```

An exhaustive `switch` copying `priceOf`'s shape, so a new item is a compile error here rather than
an item that quietly appears on no shelf.

**Heal's `null` is its answer, not a missing one.** A heal is an instant transfer with no duration, so
it sits outside the ladder entirely rather than being forced onto a rung. The ticket's own acceptance
criteria said both "every entry in `SHOP_ITEMS` carries a category" _and_ "`Heal` carries no
category" — literally contradictory, since Heal is a `SHOP_ITEMS` entry. The reading taken: the
assignment is **total over `ShopItem`**, and Heal's assignment is `null`. `SHOP_ITEMS` itself is
untouched, so `canBuyAnything` and the spec asserting the catalogue holds exactly two members both
keep working unchanged.

### The two groupings are derived once, at module load

```ts
export const SHOP_ITEMS_BY_CATEGORY: Readonly<Record<ShopCategory, readonly ShopItem[]>>
export const UNCATEGORISED_SHOP_ITEMS: readonly ShopItem[] // [Heal] — and only ever Heal so far
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
before every rung is filled. This is deliberately a separate fact from emptiness: **fight-long and
run-permanent were both empty and both perfectly selectable until DLR-91 and DLR-92 filled them** — neither
of which needed a change here, because availability was never read off a shelf's length. Reading refusal off
a zero-length array would have started refusing those two as well, and would silently _stop_ refusing
game-permanent the moment its first item shipped.

**Since DLR-92 the distinction is doing less visible work and more structural work.** Every rung that can
be opened now holds an item, so `isShopCategoryAvailable` and "is this shelf empty" no longer disagree about
anything a player can reach — the one empty rung is also the refused one. The separation still matters for
the next rung added, and `SHOP_CATEGORY_EMPTY` was **deleted outright by DLR-116** along with the tab widget that
branched on it. The idea survives one screen over: `SLOT_NO_PULL_YET` states an empty slot result
rather than leaving it blank, for exactly the reason the shelf sentence existed.

Nothing about pricing, refusals or the purchase path changed — DLR-89 added a grouping and no rule.

## `ShopStock` — the snapshot, deliberately not a `RunState`

```ts
export interface ShopStock {
  readonly coins: Coins
  readonly cheatCount: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
  readonly blastGuardHeld: boolean // DLR-91
}
```

Five fields, and nothing else. The fifth is **required**, not optional, so every construction site was
a compile error until it was supplied — `shopStockFor` and every literal in `shop.test.ts`. This module states the shop's rules and **must not learn the run's
shape** — which is what keeps its whole specification function-in, value-out with no renderer and no
`RunState` in sight. `run.ts`'s `shopStockFor(run, maxPlayerHealth?)` performs the projection, so no
screen assembles a `ShopStock` by hand and gets one field wrong.

## `refusalFor` — the one rule, read four times

> **DLR-132 deleted the `SlotsFull` clause below, 2026-08-24.** `CHEAT_SLOT_COUNT` and
> `stock.cheatCount` no longer exist — the pile a Cheat now lives in has no capacity cap, so a Cheat
> purchase (already unreachable via `SHOP_ITEMS` since DLR-116) can no longer be refused for being
> full. The other three clauses are unchanged. The code below is DLR-84/DLR-91's original snapshot.

```ts
export function refusalFor(stock: ShopStock, item: ShopItem): PurchaseRefusal | null {
  if (item === ShopItem.Cheat && stock.cheatCount >= CHEAT_SLOT_COUNT)
    return PurchaseRefusal.SlotsFull
  if (item === ShopItem.Heal && stock.playerHealth >= stock.maxPlayerHealth)
    return PurchaseRefusal.AlreadyFullHealth
  if (item === ShopItem.BlastGuard && stock.blastGuardHeld)
    return PurchaseRefusal.GuardAlreadyActive // DLR-91
  if (!Number.isFinite(stock.coins) || stock.coins < priceOf(item))
    return PurchaseRefusal.NotEnoughCoins
  return null
}
```

**This is the load-bearing arrangement of the whole ticket, and it is worth stating as a convention
rather than as a detail.** One exported predicate is read by:

| Reader                                | What it does with the answer                          |
| ------------------------------------- | ----------------------------------------------------- |
| `buyFromShop` (`run.ts`)              | throws a `RangeError` on a non-null result            |
| `handleBuy` (`src/App.tsx`)           | no-ops inside the state updater on a non-null result  |
| the `refusals` prop `App.tsx` derives | greys the purchase control and prints the reason      |
| `canBuyAnything` (below)              | `some()` over it, to decide whether the verdict warns |

A component that re-derived "are the slots full" from `cheats.length` would be a second reading of a
rule `cheats.ts` already owns, and the visible symptom would be an enabled button that throws. **No
call site re-derives a refusal from raw fields**; the reviewers checked this specifically.

Two details in that function are defensive rather than cosmetic:

- **Item-specific reasons come before the coin check.** With full slots _and_ no coins, buying a
  Cheat reports `SlotsFull` — the reason that will still be true when the coin arrives, and
  therefore the more useful one to print. DLR-91's Guard clause was placed under the same rule.
- **A non-finite balance refuses rather than passing the comparison.** `NaN >= 1` is `false`, which
  would otherwise read as "not enough coins" _by accident_ and hide a primed figure behind a
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

`runTransitions.ts` composes (it lived in `run.ts` until DLR-93 split the transitions out — see
[the run](run-sequence.md)): consult `refusalFor`, throw if it is non-null, otherwise deduct and
apply.

> **DLR-132 rewrote the Cheat and Timebomb arms below, 2026-08-24.** `addCheat`/`nextCheatId` and
> `timebombCharges` are deleted; both arms now mint a bronze `Buff` into `RunState.buffs` through a
> shared `withMintedBuff(run, buff)` helper instead. The snippet below is DLR-84/DLR-90's original.

```ts
const paid = { ...run, coins: run.coins - priceOf(item) }
// DLR-90 — a `switch` with NO `default`, so a new item is a compile error here.
switch (item) {
  case ShopItem.Cheat:
    return {
      ...paid,
      cheats: addCheat(run.cheats, { id: run.nextCheatId }),
      nextCheatId: run.nextCheatId + 1,
    }
  case ShopItem.Timebomb:
    return { ...paid, timebombCharges: run.timebombCharges + 1 }
  case ShopItem.BlastGuard: // DLR-91
    return { ...paid, blastGuardHeld: true }
  case ShopItem.Whetstone: // DLR-92 — a count, not a flag: it stacks
    return { ...paid, whetstones: run.whetstones + 1 }
  case ShopItem.Heal: // DLR-93 — the clamp moved into the shared `healedBy`, byte-identical result
    return healedBy(paid, HEAL_HEALTH_RESTORED, maxPlayerHealth)
}
```

**The Heal branch inlined its own `Math.min` until DLR-93**, and its comment called itself "THE clamp,
and therefore also the single place overheal is discarded". Once the flask healed too, that sentence
was only true if the expression moved — so it did, into a private `healedBy(run, restored, max)` that
both callers read. The paid Heal's behaviour is unchanged for identical inputs, which the existing
heal specs in `run.test.ts` and `shop.test.ts` prove by passing unedited. See
[the flask](the-flask.md).

**DLR-90 restructured that tail, and it was hiding a real defect.** Until the third item arrived the
function branched `if (item === ShopItem.Cheat) { … }` and then **returned the heal unconditionally**
as its fallback — so adding Timebomb without restructuring would have healed the player, silently, and
type-checked cleanly. It is now exhaustive with no `default` and every arm returning, which makes a
new item a compile error here rather than an item that quietly does whatever the last branch
happened to do. QA confirmed the fix in a real browser as well as in the type system: buying a Heal
raises health and leaves the Timebomb count untouched. **DLR-91 was the first item to arrive after that
fix, and it landed as one added `case` and nothing else.**

**Timebomb needed no `refusalFor` clause**, and that is the correct rule rather than an omission — it
falls through both item-specific guards to the coin check, because there is no cap on charges held.
The Cheat's `SlotsFull` refusal exists because `CHEAT_SLOT_COUNT` is a designed cap. See
[Timebomb — the held charge, the delayed-hit queue, and where it is paid](timebomb-and-the-delayed-hit.md).

**The Whetstone is the same case, and DLR-92 added nothing to `refusalFor` either.** Stacking is uncapped
by design — the design doc prices it as the limiter — so `NotEnoughCoins` is the only refusal it can raise,
`ShopStock` gained no field, and `PurchaseRefusal` gained no code. It is the second item to arrive as
**exactly one `ShopItem` member, one `priceOf` case, one `categoryOf` case and one `buyFromShop` case**, with
the screen following for free. A cap, if one is ever wanted, is a config key, one `refusalFor` clause and one
reason code — the same shape the Timebomb entry above already costs out.

**Blast Guard is the opposite case, and it does need one.** Only one may be held at a time, so a
second purchase while one is unspent is refused with `GuardAlreadyActive` rather than silently
overwriting or stacking — DLR-91 AC3 states that outright. The flag's lifetime is the part worth
reading before touching it: it lives on `RunState` so it survives the `advanceRun` that opens the fight
it was bought for, and a private `guardAfter` clears it when that fight resolves. See
[Blast Guard](blast-guard.md).

Four things about it are decisions rather than mechanics:

**It throws rather than returning the run unchanged.** A silent no-op is exactly the "took payment
for nothing" failure `cheats.ts`'s `addCheat` already refuses to allow. Reaching the throw is a
**driver bug** — the control is disabled whenever `refusalFor` is non-null — so it exists to be loud
rather than to be caught. The message names the item, the code, and the balance. There is no `catch`
anywhere in the diff.

**The heal writes into `encounter.health[DuelSide.Player]`, because that _is_ the carried figure.**
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

**A Whetstone is a count on `RunState`, and `bankClimbBonusFor` is the one statement of what a copy buys.**

```ts
readonly whetstones: number            // RunState — seeded 0 by startRun, +1 per purchase

export function bankClimbBonusFor(run: RunState): number {
  return run.whetstones
}
```

The field is a **count, not a flag**, because the item stacks — modelling it as a boolean was named in the
ticket as the specific thing not to do. It follows `timebombCharges`' precedent for an uncapped run-level
figure, and like `coins` it is carried across a fight boundary by `advanceRun`'s and `recordEncounter`'s
existing spread, so **the carry needed no code**. Unlike `cheats`, `timebombCharges` and `blastGuardHeld` it
is **never handed back by a hand** — a hand cannot spend a Whetstone — so `recordEncounter`'s signature did
not grow a sixth parameter and nothing in the round layer can write it.

`bankClimbBonusFor` is a one-line function and earns its place: it is where "+1 per copy" is stated, so that
rule does not end up encoded at the JSX wiring site in `App.tsx` that happens to need it, and it is where the
multiplier twin's own figure would be added. It is also the **whole of this module's contribution to the
card layer** — `src/warCouncil/` receives its return value as a plain number called `bankClimbBonus` and
never learns the word Whetstone. See
[the bank, the streak, and the cash-out](../war-council/bank-and-cash-out.md) for the rest of the route.

`maxPlayerHealth` is a **defaulted parameter** on both `shopStockFor` and `buyFromShop`
(`= PLAYER_START_HEALTH`), matching `startEncounter`/`startRun`'s injectable pattern so a spec varies
the clamp without mutating module state. `buyFromShop` validates it (`Number.isFinite` and `> 0`)
before doing anything, so a bad ceiling cannot silently Timebomb a health bar.

## The tunables

Almost all of them are **transcribed**, not chosen here — the five below from DLR-84's ticket and the
design doc, plus `TIMEBOMB_PRICE` (2 coins) and `TIMEBOMB_QUARRY_DAMAGE` (4 health) from
`version-4-scope.md` at DLR-90. **One exception: `TIMEBOMB_PLAYER_DAMAGE` (2 health) is the developer's
own choice**, added by DLR-91 on 2026-08-19 when the single `TIMEBOMB_DAMAGE` key was split — the
player-side hit is deliberately smaller, because it _also_ forces the streak's cash-out.

| Key                       | Value | Unit                                                                                                          |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------------- |
| `COINS_PER_ENCOUNTER_WIN` | `1`   | coins, credited once per encounter won — the **flat** term; since DLR-95 the quick-kill payout is added to it |
| `CHEAT_PRICE`             | `1`   | coins per purchase                                                                                            |
| `HEAL_PRICE`              | `1`   | coins per purchase                                                                                            |
| `BLAST_GUARD_PRICE`       | `1`   | coins per purchase (DLR-91)                                                                                   |
| `WHETSTONE_PRICE`         | `4`   | coins per purchase (DLR-92)                                                                                   |
| `HEAL_HEALTH_RESTORED`    | `4`   | health points, added once, before the clamp                                                                   |

**`WHETSTONE_PRICE = 4` is transcribed from `version-4-scope.md` §1's own heading** — "priced as the shop's
one real splurge" — and is the only price in the shop above 2 coins. The design's reasoning, not arithmetic
done here: on flat win income (1 coin a fight, against a run expected to end in its first or second stage)
it eats most of a short attempt, and the intended way to reach it early is the **quick-kill payout**, which
is a separate ticket and **is not built**. So the item is currently priced for an income that does not exist
yet, which is why the price is `provisional` in `the-hunt.md` rather than settled. QA reached the shop in two
full runs and never got past 2 coins.

**There is deliberately no key for the per-copy `+1`.** DLR-92's ticket names exactly one new key, and the
bonus per copy is the item's _definition_ rather than a tunable — the same reasoning `bank.ts` already uses
to keep its `bankAdded = 1` out of configuration. An item granting +2 a copy would be a different item. The
rule is stated once, in `bankClimbBonusFor` below.

**`BLAST_GUARD_PRICE` is its own key rather than a reuse of `HEAL_PRICE`**, for the reason those two
are already separate: re-pricing one item must not move another. It is priced level with the heal
because both are a 1-coin-for-4-health trade run in opposite directions — that is the design doc's
reasoning, transcribed, not arithmetic done here.

The Cheat's and the heal's prices are **deliberately separate keys** rather than one shared price. The ticket predicts
the player buying Heal on every visit and names re-pricing the Cheat as the answer — which is only a
one-line change if the two prices are two keys.

`config.test.ts` pins their **shape and not their values** — non-negative integers, and a heal that
is positive, finite, and no larger than `PLAYER_START_HEALTH`. A test asserting `1` would turn a
one-line re-price into a two-line one, which is the opposite of what the keys are for.

`HEAL_HEALTH_RESTORED` is **no longer the only source of healing in the game** — DLR-93 landed the
**flask**, a free charge-limited heal restoring a proportion of the maximum rather than a flat figure,
drunk from this same screen but deliberately not a `ShopItem`. It is still the only healing you
**pay** for. There is still no rest site, and `ENCOUNTER_PLAYER_RESTORE` beside both stays deliberately
unread — DLR-82 forbade wiring it in, and neither DLR-84 nor DLR-93 did. See
[the flask](the-flask.md).

## Purity

`shop.ts` imports only `./config` and `./types` — no React, no DOM global, no `Math.random()`, and
DLR-90 and DLR-91 added no import to it. The
economy is integer arithmetic on configured constants; **there is no division anywhere in it**, so
the classic `NaN` source is absent and no epsilon is needed. `run.ts` gained imports from `./shop`
and `./cheats`, both already inside the lint-enforced `src/hunt/**` tree, so the existing
`eslint.config.js` override covers the new file without an edit.

Nothing here is persisted. Coins die on reload with the rest of `RunState`, which the ticket puts
out of scope — but it means the first ticket to add a save file inherits a `coins` field with no
migration story, and since DLR-90/DLR-91/DLR-92 an `timebombCharges` count, a `blastGuardHeld` flag and a
`whetstones` count beside it. Every shape change made here is free **today** and becomes a migration the
first time a run is saved. **Four free `RunState` widenings have now been taken**, which is worth noting
because the window is still open only by accident of nothing being saved yet — DLR-92's audit checked for a
store and found none.
