Part of [Hunt](README.md).

# Coins and the shop — the run's economy, and the one predicate that guards it

`src/hunt/shop.ts` (DLR-84) is the game's first economy. It is deliberately tiny: a two-item
catalogue, a price lookup, and **one predicate** that decides whether a purchase may be made. The
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
export const ShopItem = { Cheat: 'cheat', Heal: 'heal' } as const
export const SHOP_ITEMS: readonly ShopItem[] = [ShopItem.Cheat, ShopItem.Heal]

export const PurchaseRefusal = {
  SlotsFull: 'slotsFull',
  AlreadyFullHealth: 'alreadyFullHealth',
  NotEnoughCoins: 'notEnoughCoins',
} as const
```

`SHOP_ITEMS` is the single statement of the catalogue — the screen **maps** it and never lists the
two items itself, so a third item would appear on screen without the component being edited.

A `PurchaseRefusal` is a **reason code, not a sentence**. `src/hunt/` holds no user-facing copy;
`src/app/run/shopLabels.ts` maps each code to words. `priceOf` is an exhaustive `switch` over
`ShopItem` rather than a `Record`, so adding a third item is a compile error at the lookup rather
than an `undefined` price at runtime.

## `ShopStock` — the snapshot, deliberately not a `RunState`

```ts
export interface ShopStock {
  readonly coins: Coins
  readonly cheatCount: number
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
}
```

Four fields, and nothing else. This module states the shop's rules and **must not learn the run's
shape** — which is what keeps its whole specification function-in, value-out with no renderer and no
`RunState` in sight. `run.ts`'s `shopStockFor(run, maxPlayerHealth?)` performs the projection, so no
screen assembles a `ShopStock` by hand and gets one field wrong.

## `refusalFor` — the one rule, read four times

```ts
export function refusalFor(stock: ShopStock, item: ShopItem): PurchaseRefusal | null {
  if (item === ShopItem.Cheat && stock.cheatCount >= CHEAT_SLOT_COUNT) return PurchaseRefusal.SlotsFull
  if (item === ShopItem.Heal && stock.playerHealth >= stock.maxPlayerHealth) return PurchaseRefusal.AlreadyFullHealth
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
  therefore the more useful one to print.
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
if (item === ShopItem.Cheat) {
  return { ...paid, cheats: addCheat(run.cheats, { id: run.nextCheatId }), nextCheatId: run.nextCheatId + 1 }
}
return { ...paid, encounter: { ...run.encounter, health: { ...run.encounter.health,
  [DuelSide.Player]: Math.min(maxPlayerHealth, run.encounter.health[DuelSide.Player] + HEAL_HEALTH_RESTORED) } } }
```

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

## The four tunables

All four are **transcribed from the ticket**, not chosen here.

| Key | Value | Unit |
| --- | --- | --- |
| `COINS_PER_ENCOUNTER_WIN` | `1` | coins, credited once per encounter won |
| `CHEAT_PRICE` | `1` | coins per purchase |
| `HEAL_PRICE` | `1` | coins per purchase |
| `HEAL_HEALTH_RESTORED` | `4` | health points, added once, before the clamp |

The two prices are **deliberately separate keys** rather than one shared price. The ticket predicts
the player buying Heal on every visit and names re-pricing the Cheat as the answer — which is only a
one-line change if the two prices are two keys.

`config.test.ts` pins their **shape and not their values** — non-negative integers, and a heal that
is positive, finite, and no larger than `PLAYER_START_HEALTH`. A test asserting `1` would turn a
one-line re-price into a two-line one, which is the opposite of what the keys are for.

`HEAL_HEALTH_RESTORED` is the **only source of healing in the game**. There is no flask and no rest
site, and `ENCOUNTER_PLAYER_RESTORE` beside it stays deliberately unread — DLR-82 forbade wiring it
in and DLR-84 did not.

## Purity

`shop.ts` imports only `./config` and `./types` — no React, no DOM global, no `Math.random()`. The
economy is integer arithmetic on configured constants; **there is no division anywhere in it**, so
the classic `NaN` source is absent and no epsilon is needed. `run.ts` gained imports from `./shop`
and `./cheats`, both already inside the lint-enforced `src/hunt/**` tree, so the existing
`eslint.config.js` override covers the new file without an edit.

Nothing here is persisted. Coins die on reload with the rest of `RunState`, which the ticket puts
out of scope — but it means the first ticket to add a save file inherits a `coins` field with no
migration story.
