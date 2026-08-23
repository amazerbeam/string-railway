Part of [Hunt](README.md).

# Blast Guard — the fight-long flag, and what makes "fight-long" a real duration

DLR-91. The **first item on the shop's fight-long shelf**, which DLR-89 built empty and DLR-90 left
empty. One coin, bought between fights, and it does exactly one thing: **the next time the player's own
Timebomb lands on them, they still lose the health but their streak survives.** It is spent the first
time it fires, and it is gone when the fight ends whether it fired or not.

The Timebomb it insures against is [Timebomb](timebomb-and-the-delayed-hit.md); the cash-out it suppresses
is [the bank's](../war-council/bank-and-cash-out.md). This file owns the flag, its lifetime, and the
refusal.

## The flag is on `RunState`, not `EncounterState` — and the ticket said otherwise

`RunState.blastGuardHeld: boolean`. DLR-91's AC2 asks for a duration of "the encounter it was bought
during" and points at `EncounterState` as the natural home for encounter-scoped state. **Putting it
there would have made the item unbuyable**, and the reason is a sequencing detail worth stating once:

- The shop is reachable only **after** an encounter resolves and **before** `advanceRun` runs.
- `advanceRun` calls `startEncounter`, which builds a **fresh** `EncounterState` for the next fight.

So a flag on `EncounterState` would be written onto the *finished* encounter and then destroyed by the
very transition that opens the fight it was bought for. The flag has to survive `advanceRun` to be worth
anything, which means it has to be run-level — and it then needs an explicit end, which is the next
section. Run-level storage plus a clear-on-resolve is what delivers AC2's *intent*: **live for exactly
one fight.**

Everything about carrying it is free, because `advanceRun`'s existing `...run` spread already carries
`coins`, `cheats` and `timebombCharges` across a fight boundary. No line was added for the carry.

## `guardAfter` is the one statement of the expiry

```ts
function guardAfter(encounter: EncounterState, held: boolean): boolean {
  return isEncounterResolved(encounter) ? false : held
}
```

Module-private in `run.ts`, and read by `recordEncounter` — which passes it whatever the finished hand
reported and adopts the result. **A resolved encounter clears the Guard; an unresolved one keeps it**,
so a Guard bought for a fight survives every hand of that fight and dies with the fight itself,
regardless of whether it was ever spent.

It is a **named function rather than an inline ternary**, deliberately. `recordEncounter` is the only
transition that adopts a hand's end state today — `beginNextHand`, which would have been the second, was
deleted by this same contract — so the helper has exactly one caller. A second adopting transition is
precisely the kind of thing that gets added without remembering to clear this, and a named rule beside
`outcomeFor` is what a reviewer finds.

`recordEncounter` therefore gained a **required fifth parameter**, for the reason its third and fourth
are required: the hand owns the flag for its lifetime and hands it back, and an optional parameter would
let a caller silently drop the spend so the run quietly refilled it.

## What it suppresses, and what it does not

The Guard reaches the trick's resolution as `TrickFacts.blastGuarded` and gates **one** thing:

```ts
const timebombResets = trick.timebombToPlayer > 0 && !trick.blastGuarded
```

| Case | Health | Streak | Guard |
| --- | --- | --- | --- |
| Timebomb owed to the player, Guard held | **lost** — the 2 is still paid | **survives** | **spent** |
| Timebomb owed to the player, no Guard | lost | cashed and reset to zero | — |
| Timebomb owed to the **Quarry** | the Quarry's | untouched | **not** spent |
| A trick the player simply **lost** | lost | cashed and reset | **not** spent |

Four properties, and each is a decision rather than a consequence:

- **It buys the streak, never the health.** `damageToPlayer` is computed outside the cash-out branch, so
  the 2 is owed whether or not the reset fires. A Guard is not a shield.
- **It gates the Timebomb trigger only.** A trick the player loses on its own merits still resets the
  streak while a Guard is held, and does **not** consume it. Otherwise a 1-coin item would insure
  against every hit in the game, which the ticket's scope boundary forbids.
- **It does nothing on the Quarry-side case**, which is AC5 — that case already costs the player
  nothing, so there is nothing to protect.
- **It is spent whenever it actually suppresses a reset**, which is AC4's "regardless of whether a
  streak was in progress" read literally: it fires and is gone even when the bank was 0 and there was
  nothing to save. `TrickResolution.blastGuardSpent` reports that, so the reducer flips the flag rather
  than re-deriving "did the Guard matter" — a second reading of one rule.

`timebombToPlayer > 0` is `false` for `NaN`, so a primed figure fails safe by **not** firing the Guard
rather than by spending it silently.

## Buying it, and the refusal that stops a second one

| Piece | Where |
| --- | --- |
| `ShopItem.BlastGuard`, third in `SHOP_ITEMS` | `shop.ts` |
| `BLAST_GUARD_PRICE = 1` — transcribed | `config.ts` |
| `ShopCategory.FightLong`, via `categoryOf` | `shop.ts` |
| `PurchaseRefusal.GuardAlreadyActive` | `shop.ts` |
| `ShopStock.blastGuardHeld` — a **required** field | `shop.ts` |
| `buyFromShop`'s `case ShopItem.BlastGuard` | `run.ts` |

**It cost no UI edit to put it on the right shelf**, which is the property DLR-89's ladder was built
for and the second item to test it: `SHOP_ITEMS_BY_CATEGORY` derives the fight-long shelf at module load
from `SHOP_ITEMS` + `categoryOf`, and `isShopCategoryAvailable` already returned `true` for that rung.
The only screen change in the whole item is a purse cell — see
[the shop screen](../run-ui/shop-screen.md).

`refusalFor` gained one clause, placed **after** the Heal branch and **before** the coin check, per
that function's stated ordering rule: an item-specific reason is the one that will still be true when
the coin arrives.

```ts
if (item === ShopItem.BlastGuard && stock.blastGuardHeld) {
  return PurchaseRefusal.GuardAlreadyActive
}
```

That single predicate is what AC3's "no silent overwrite, no silent stack" is made of, read in the two
places `refusalFor` is always read: `buyFromShop` throws a `RangeError` naming the code, and the screen
disables the control and prints the sentence. Reaching the throw stays a driver bug.

`ShopStock`'s new field is **required**, so every construction site was a compile error until it was
supplied — `shopStockFor` and every literal in `shop.test.ts`. No component builds a `ShopStock` by
hand, so nothing in the UI was affected by the widening.

## Through the hand and back

The flag travels the exact path `timebombCharges` already proved, and nothing new was invented for it:

```
RunState.blastGuardHeld
  → WarCouncilMountProps → RoundUiSeed → RoundUiState
  → WarCouncilRoundResult → recordEncounter → guardAfter
```

A second mechanism for carrying run state through a hand is a second mechanism to keep in step, which
is the whole argument for copying the existing one verbatim in shape.

## Where the tests are

`__tests__/blastGuard.test.ts` (new) covers the purchase, the encounter-only scope, the refusal on a
second purchase while one is held, consumption on the player-side backfire, and the Quarry-side
non-interaction — DLR-91's AC6 by name. `run.test.ts` was 343 lines and was deliberately not the place
for any of it.

## Deferred

- **Nothing shows a held Guard during a fight.** The shop's purse cell states "Held" or "None" while
  you are choosing, and after that the flag is invisible: the felt has no plate, no badge and no line
  for it, and the moment it fires shows as damage with a streak that survived — with nothing naming the
  cause. Out of scope by decision, and the thing most likely to come back from a play session.
- **Holding a Guard can cost the player health, and there is no hint.** Because the Guard suppresses the
  cash-out, a Quarry that would have died to that cash-out survives — and under Quarry-first sequencing
  (D7) a surviving Quarry means the player takes the 2 they would otherwise have dodged. So the correct
  play is sometimes **not** to hold one, which is the opposite of how insurance reads. Accepted as a real
  decision (D8), recorded in `the-hunt.md`'s Known tensions, and unsurfaced.
- **One at a time, and no stacking.** The flag is a boolean, so a second Guard is refused rather than
  queued. Making it a count is a field, one `refusalFor` edit and one spend site.
- **`BLAST_GUARD_PRICE` is unmeasured against the item it insures.** 1 coin is transcribed, and whether
  it is right against a 2-health hit plus a lost streak — when the Timebomb that causes it costs 2 — only
  shows in play.
