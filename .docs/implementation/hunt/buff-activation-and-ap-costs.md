Part of [Hunt](README.md).

DLR-108 is the buff system's first code ticket. It closes the four shape gaps
`v1-buff-card-list.md`'s _Code-shape alignment_ section names, ships that document's AP cost model
as executable arithmetic, adds the per-hand accrual `hybrid-design.md` §5's stacking rule asks for,
and builds the activation flow itself. It shipped with **nothing in `src/` calling any of it** — no
reducer action, no component, no reader of `RunState.buffs` — the same deliberate intermediate state
[Cheat and Timebomb as buff-pile objects](cheat-and-timebomb-buffs.md) already documents.

> **DLR-114 gave all of it a caller.** The felt's action bar's **Apply Buff** button opens a loadout
> panel that reads `RunState.buffs` (threaded through as a required mount prop), prices every row with
> `apCostOf`, disables each row through `buffActivationRefusalFor`, and commits through `activateBuff`
> on a confirming second tap. `BuffActivationState` **has an owner now** —
> `RoundUiState.buffActivation`, which replaced that state's separate `apPool` field so the hand has
> one pool rather than two. `openBuffWindow` fires from the reducer on the transition that resolves a
> trick. The two things this page describes that are **still uncalled** are `buffAccrual.ts` entirely
> and `refreshBuffsForNewHand`; see the foot of this page. Read
> [war-council-ui/action-bar-and-loadout.md](../war-council-ui/action-bar-and-loadout.md) for the
> screen.

## The four shape gaps, and how each was closed

**`BuffKind` went from 3 members to 19.** The 16 additions are the 11 shipping condition families
(`taker`, `feeder`, `markOfRank`, `sidestep`, `glutton`, `hoarder`, `unbloodied`, `debtCollector`,
`keepsake`, `miser`, `cornered`) and the 5 consumables (`ward`, `puppeteer`, `secondThoughts`,
`foresight`, `spyglass`). `unassigned`, `cheat` and `timebomb` are untouched and mean exactly what
they meant. `markOfRank`, not `markOfThe` — the rank lives in the condition's payload, not in the
member name, which is the whole point of the payload below. Long Fall is reserved and deliberately
absent until its template ships.

**`BuffRewardAxis` went from 3 to 11**, gaining `coins`, `apRefund`, `multiplier`, `cardsRevealed`,
`candidatesEliminated`, `discardCharges`, `damageAbsorbed` and `none` (Puppeteer's, whose effect is
not a scaled quantity). One deliberate narrowing of the source document's list: **Blade — flat
damage — maps onto the existing `magnitude` axis rather than a new `flatDamage` one.** `magnitude`
is already the flat-damage axis DLR-105 shipped, and a synonym would give one quantity two names.

Both widenings are additive and broke no reader: there is no `switch` over either union anywhere in
`src/`, and every existing read is an equality or inequality check.

**`BuffCondition` gained an optional `target`.** It was `{ kind: string }` with nowhere to put a
suit or a rank, and 49 of the 71 condition templates are parameterised by one — Taker, Feeder and
Keepsake by suit, Mark of the _R_ by rank. `target` is `{ suit?: BuffTargetSuit; rank?: number }`,
optional so `UNASSIGNED_BUFF_CONDITION` and `ACTIVATED_BUFF_CONDITION` stay valid unchanged. The
alternative — baking the parameter into `BuffKind` as `takerBells`/`markOfThe9`/… — needs 33
members where 4 do, and turns "is this a Taker?" from an equality check into a string-prefix test.

`BuffTargetSuit` is **a hunt-local union carrying the same three values as `src/warCouncil/`'s
`Suit`**, and that duplication is forced rather than chosen: `src/hunt/` cannot import
`src/warCouncil/` without a cycle — warCouncil already imports hunt. A test in
`src/hunt/__tests__/buffs.test.ts` pins the two member-for-member, so drift fails a test rather
than surfacing as a live bug. `BUFF_TARGET_RANK_MIN`/`MAX` (1 and 11) bound the rank, and
`isValidBuffTarget` is the one place that check lives.

**`Buff` still has no `apCost` field, and that is the resolution rather than a gap left open.** The
cost is a derived lookup — `apCostOf(buff)` reads `(kind, reward.axis, tier)` off the buff it is
handed. `v1-buff-card-list.md` offers both shapes and recommends this one: the cost model is a
formula over two small tables, and a minted field would turn a two-number retune into 78
construction sites that can drift from the table they came from. One buff still has exactly one
answer, because the lookup reads only fields the buff already carries.

## The cost model — a formula over two tables, not 78 numbers

`buffCosts.ts` is the whole model, and every figure in it is transcribed from
`v1-buff-card-list.md` → _The cost model_, agent-chosen on DLR-111 under that ticket's own
tuning-value override, and **never played**.

```
apCost = clamp(REWARD_BASE[axis][tier] + CONDITION_MODIFIER[family], AP_COST_MIN, AP_COST_MAX)
```

`REWARD_BASE` prices the four reward axes per tier — flat damage 1/2/3, coin 2/3/4, AP refund
1/1/1, multiplier 2/3/5. Multiplier costs most because `the-hunt.md` §7 cashes the bank as a
_product_, so a bought multiplier point is multiplied by the bank and a bought damage point is not;
coin carries a smaller surcharge because coins are run-permanent. `CONDITION_MODIFIER` prices **how
often a family actually fires**, and runs the opposite way to intuition — Feeder is `+1` because
you can always throw a trick away in a suit you hold, Mark-of-rank is `−1` because it needs a
specific one of eleven ranks in a six-card hand _and_ the win. `AP_COST_MIN` and `AP_COST_MAX` are
1 and 6; every operand is an integer, so no cost is fractional and none can be `NaN`.

`CONSUMABLE_AP_COST` prices the seven consumable and activated cards off the formula entirely,
because DLR-111 sets three of them off-curve for stated reasons: **Ward is flat at 2** because
`DAMAGE_PER_HIT = 1` makes absorbing 1, 3 and 5 the same outcome, **Timebomb is flat at 2** because
its tier is already paid in health rather than AP, and **gold Cheat is 7 — deliberately above
`STARTING_AP = 6`**, unplayable until the shop's `+5 AP` capacity item is bought.

`buffApCost(kind, axis, tier)` dispatches between the two regimes; `apCostOf(buff)` is the single
entry point a consumer should call. Both **throw `RangeError`** on a kind with no price — which is
what `BuffKind.Unassigned` is, since the four buffs `seedStartingBuffPile` mints are documented
placeholder content. Returning a plausible small integer there is the bug that type-checks.
`narrowToCostAxis` throws for the same class of reason on a condition family minted on an axis
`REWARD_BASE` does not price (`heartCount`, say) rather than defaulting to zero, which would price
it at the clamp floor and look entirely reasonable.

> **This does not implement the ticket's own AC2, and the divergence is deliberate.** AC2 specifies
> `BUFF_ACTIVATION_COST = { bronze: 3, silver: 5, gold: 8 }`. It predates DLR-111's pool, and a
> single tier table cannot price a list where cost depends on family and reward axis as well as
> tier. The one number the ticket names that actually moves is **gold Cheat: 7, not 8**. The
> constant name is not shipped anywhere in `src/`.

`src/hunt/__tests__/buffCosts.test.ts` checks the formula against DLR-111's published per-family AP
table **cell by cell**, so a retune that breaks a documented price fails loudly rather than
silently.

## The per-hand accrual, and the one asymmetry that must not be lost

`buffAccrual.ts` holds `BuffBonusAccrual` — four running totals, one per reward axis
(`multiplierBonus`, `flatDamageBonus`, `coinBonus`, `apRefunded`), each already clipped at its cap
so a reader never re-checks a bound. It is **state on the hand, not a field on `Buff`**: two copies
of the same card share one accrual, and how much of an axis's cap has been consumed this hand is
not a property of the card.

Three rules from `hybrid-design.md` §5 are implemented here. **R1** — a contribution moves exactly
one axis's counter and creates no interaction between axes. **R2** — within an axis, contributions
add; `accrueAxisBonus` is `Math.min(current + amount, cap)`. **R5** — the Overlap Bonus:
`overlapBonusFor(k)` is `max(0, k − 1)`, linear in the count of buffs that fired on one trick
rather than quadratic in the pairs among them, and it draws from the **same**
`MAX_MULTIPLIER_BONUS_PER_HAND` pool Momentum cards draw from — which is what makes a tall Momentum
loadout collect nothing for width it did not build, and a wide mixed loadout collect the lot.
**R6** — a contribution past a cap is clipped and the remainder is lost; nothing is banked.

**The load-bearing property is what the module deliberately does not have.** The caps reset **per
hand and NOT on a hit**. A hit resets the multiplier itself to zero, and it does not refund the cap
— a player who has spent all 6 of their Momentum bonus and then takes a hit restarts the streak
with no bonus left for the rest of the hand. Without that asymmetry the cap is a per-streak
allowance refreshed by the very event the player is trying to avoid, and a hand containing three
hits would pay three full pools. `startHandAccrual()` is therefore the module's **only** exported
reset, and there is deliberately **no** `resetOnHit`-shaped function at all: leaving absent the
function an obvious wrong reading would need is what makes sure it never gets written. A test
asserts that absence against the module's own export surface rather than trusting the docblock.

`resolveFiredBuffs(accrual, fired)` applies R1/R2/R5 for one trick. It reflects R3's five-step
order (Second Wind → Momentum → cash-out product → Blade → Purse) in the sequence it applies
contributions, but **does not perform the cash-out step** — nothing in `src/` reads a buff, so
reordering `bank.ts`'s live cash-out would be a change nobody can observe. Wiring it is a later
ticket's.

> **Still true after DLR-114, and this is the asymmetry not to smooth over.** `buffAccrual.ts` gained
> no caller when the loadout became reachable. A player can now spend action points on a
> condition-family buff and watch the pool fall — and **the condition is never evaluated and the
> reward is never paid**. Activation is what DLR-114 made reachable; firing is a later ticket's.

## Activating a buff — the window, the spend, and the refusal

`buffActivation.ts` follows the shape `voluntaryCashOut.ts`, `flask.ts` and `shop.ts` already set:
a reason **code** (never a sentence — `src/hunt/` holds no user-facing copy), a `*Stock` of plain
values assembled in one place, and one predicate read by both the guard and the disabled control so
the two can never disagree.

`BuffActivationRefusal` has three members, checked in this order:

1. **`windowClosed`** — the felt is not between tricks.
2. **`alreadyActive`** — this buff is already activated for this trick.
3. **`insufficientAp`** — the pool does not cover this buff's cost, via `canAffordAp`.

The window reason comes first for `applyDamageRefusalFor`'s reason: report what is true of the whole
felt before what is true of this one control. `alreadyActive` is the one rule here with no source
document behind it — §5's R7 says a player paying for a card that cannot fire is a legitimate
mistake, but paying **twice for one card in one trick** is a duplicate payment, not a mistake worth
allowing.

**No new timing gate was built, which is the whole of AC1.** `buffActivationStock` in
`src/app/warCouncil/roundUiState.ts` sits beside `discardStock` and feeds `windowOpen` from
`discardWindowOpen(state)` — the same signal the discard already uses, so the two actions cannot
drift apart about when the felt is between tricks. It reads nothing else from `RoundUiState`.

`BuffActivationState` is `{ apPool, activatedThisTrick }`. `activateBuff` refuses through
`buffActivationRefusalFor` **first**, throws `RangeError` naming the refusal code rather than
returning the state unchanged, and spends through `spendAp` — the only subtraction path, so
`AP_ENABLED` is honoured exactly as every other AP consumer honours it. Stacking needs no rule of
its own: the pool is one number, so two `activateBuff` calls draw down one budget.

**AC4's "the pool does not silently refresh mid-hand" is enforced by there being two functions
rather than one.** `openBuffWindow` clears `activatedThisTrick` and leaves `apPool` untouched;
`refreshBuffsForNewHand` is the only thing in the module that resets the pool, and it delegates to
`refreshActionPointsForNewHand` so a cadence change needs no edit here. A single "start the next
trick" function that also reset the pool is precisely the bug the test suite exists to catch.

## `isPricedBuff` / `activatableBuffs` — the guard that keeps `RangeError` off a render — DLR-114

`apCostOf` **throws** on `BuffKind.Unassigned`, and `startRun` seeds `STARTING_BUFF_COUNT` of exactly
that. So the moment a screen was going to price an owned pile, something had to stand between the two.
DLR-114 put it here, beside the function that throws, rather than in the component that would
otherwise have had to remember it:

```ts
export function isPricedBuff(buff: Buff): boolean {
  return isConsumableKind(buff.kind) || isConditionFamily(buff.kind)
}

export function activatableBuffs(buffs: readonly Buff[]): readonly Buff[] {
  return buffs.filter(isPricedBuff)
}
```

`isPricedBuff` is a **mirror of `buffApCost`'s own two branches, not a second rule** — it reads the
same two membership predicates, so a kind added to either pricing table is admitted here
automatically, and a kind added to neither is refused here rather than throwing at a render.
`activatableBuffs` preserves order, because the pile's order is the player's mental order. Both are
re-exported from `src/hunt/index.ts`; the felt reads them once, through `roundUiState.ts`'s
`offeredBuffs`.

The consequence worth stating plainly: **on a fresh run with an empty Vault, `activatableBuffs`
returns nothing**, so the loadout panel offers no buffs at all and shows only the relocated Cheat and
Timebomb controls. That is the placeholder pile being correctly filtered, not a failure.

## Where the state lives now

`BuffActivationState` **had no owner** as DLR-108 shipped it — a pure value with no home on
`RunState` or `RoundUiState`, on the stated reasoning that whichever ticket built the button should
decide, and that giving a per-hand budget a run-lifetime home early would be the wrong answer written
early.

**DLR-114 decided it, and the answer was `RoundUiState.buffActivation`** — hand-lifetime, seeded by
`startBuffActivation()` in `createRoundUiState`, which **is** the per-hand refresh because `App.tsx`
remounts the felt per hand. It is not on `RunState` and is not persisted. In the same move
`RoundUiState.apPool` — DLR-109's separate copy of the same pool, which Apply Damage spent from — was
**deleted**, so the felt has exactly one action-point number and divergence between the two spenders
is unexpressible. `refreshBuffsForNewHand` remains the pure statement of the per-hand rule and remains
uncalled, because a remount already performs it.
