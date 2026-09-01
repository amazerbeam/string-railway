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
> trick. The two things this page describes that were **still uncalled** after DLR-114 were
> `buffAccrual.ts` entirely and `refreshBuffsForNewHand`; see the foot of this page. **DLR-125 gave
> `buffAccrual.ts` its caller** — `resolveTrickBuffs` in `buffEvaluation.ts`, reached from
> `resolveTrickBank` — and widened it with the once-per-hand cash-out spend counters, so only
> `refreshBuffsForNewHand` is still uncalled (the per-hand reset is the felt's remount). See
> [Condition evaluation](buff-condition-evaluation.md). Read
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
suit or a rank, and 49 of the 71 condition templates were parameterised by one — Taker, Feeder and
Keepsake by suit, Mark of the _R_ by rank. (DLR-145 pared the mintable pool to 11 condition
templates, of which the 9 Taker and Feeder ones carry a suit and none carries a rank; `target` and
its `rank` field both stay, since `buffFires` still evaluates the unminted families.) `target` is `{ suit?: BuffTargetSuit; rank?: number }`,
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
what `BuffKind.Unassigned` is: the retained unpriced-kind sentinel that nothing has minted since
DLR-135. Returning a plausible small integer there is the bug that type-checks.
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
reordering the engine's live cash-out would be a change nobody can observe. Wiring it is a later
ticket's.

> **Still true after DLR-114, and this is the asymmetry not to smooth over.** `buffAccrual.ts` gained
> no caller when the loadout became reachable. A player can now spend action points on a
> condition-family buff and watch the pool fall — and **the condition is never evaluated and the
> reward is never paid**. Activation is what DLR-114 made reachable; firing is a later ticket's.
>
> **DLR-125 was that ticket, and the paragraph above is now history rather than status.** The
> cash-out step **is** performed: `resolveTrickBank` applies R3's step 2 (Momentum into the
> multiplier feeding the cash-out product) and step 4 (Blade added flat, after §7's
> two-thirds floor), and the felt's fold applies step 1 (Second Wind into the pool for the next
> window) and step 5 (Purse into the run's coins). `buffAccrual.ts` also gained `multiplierPaid` /
> `flatDamagePaid` with `payableCashOutBonus` / `markCashOutPaid`, so each of those two pools paid
> **once per hand** rather than once per cash-out. See
> [Condition evaluation](buff-condition-evaluation.md).

## Activating a buff — the window, the spend, and the refusal

`buffActivation.ts` follows the shape `flask.ts`, `shop.ts` and the since-deleted `voluntaryCashOut.ts` already set:
a reason **code** (never a sentence — `src/hunt/` holds no user-facing copy), a `*Stock` of plain
values assembled in one place, and one predicate read by both the guard and the disabled control so
the two can never disagree.

`BuffActivationRefusal` has three members, checked in this order:

1. **`windowClosed`** — the felt is not between tricks.
2. **`alreadyActive`** — this buff is already activated for this trick.
3. **`insufficientAp`** — the pool does not cover this buff's cost, via `canAffordAp`.

> **Two members were added later, and the order is now five long.** DLR-126 put `noEffectYet`
> **first** (see [consumable items](consumable-items.md)); DLR-154 put `timebombLive` between
> `windowClosed` and `alreadyActive`. The full order is
> **`noEffectYet → windowClosed → timebombLive → alreadyActive → insufficientAp`**, and it still
> reads the same way: what is true of the **card**, then of the whole **felt**, then of this card on
> this felt. `timebombLive` is what refuses a **second Timebomb** while one is armed or primed — the
> spend is refused outright rather than allowed and then blocked at the prime, which would strand a
> just-paid-for card. It is a **distinct member rather than a reuse of `alreadyActive`**, which means
> "this same card, twice in one trick" and is false of a *different* Timebomb blocked by state from
> an earlier trick. The felt fact reaches this module the way `windowOpen` does — assembled once by
> `roundUiState.ts`'s `buffActivationStock` and passed in — and `buffActivationStockFor` applies it
> only to a Timebomb. Adding a member cost one enum entry and one row in
> `buffLabels.ts`'s `BUFF_ACTIVATION_REFUSAL_MESSAGE`: nothing `switch`es over the union.

The window reason comes first for `applyDamageRefusalFor`'s reason (that predicate was deleted on DLR-156; the reason survives it): report what is true of the whole
felt before what is true of this one control. `alreadyActive` is the one rule here with no source
document behind it — §5's R7 says a player paying for a card that cannot fire is a legitimate
mistake, but paying **twice for one card in one trick** is a duplicate payment, not a mistake worth
allowing.

**No new timing gate was built, which is the whole of AC1.** `buffActivationStock` in
`src/app/warCouncil/roundUiState.ts` sits beside `discardStock` and feeds `windowOpen` from
`discardWindowOpen(state)` — the same signal the discard already uses, so the two actions cannot
drift apart about when the felt is between tricks. It reads nothing else from `RoundUiState`.

`BuffActivationState` is `{ apPool, capacity, activatedThisTrick, spentThisTrick }` — the fourth
field is DLR-145's, see [its own section](#spentthistrick--how-a-consumed-card-still-gets-paid--dlr-145-2026-08-25)
below. `activateBuff` refuses through
`buffActivationRefusalFor` **first**, throws `RangeError` naming the refusal code rather than
returning the state unchanged, and spends through `spendAp` — the only subtraction path, so
`AP_ENABLED` is honoured exactly as every other AP consumer honours it. Stacking needs no rule of
its own: the pool is one number, so two `activateBuff` calls draw down one budget.

**AC4's "the pool does not silently refresh mid-hand" held under `PerHand` cadence by there being
two functions rather than one.** `openBuffWindow` cleared `activatedThisTrick` and left `apPool`
untouched; `refreshBuffsForNewHand` was the only thing in the module that reset the pool, delegating
to `refreshActionPointsForNewHand` so a cadence change needed no edit here.

> **2026-08-25 changed the default cadence to `PerTrick`, 2026-08-25 — developer-directed.**
> `BuffActivationState` gained `capacity` (the pool's full value, set once by `startBuffActivation`
> and never touched again mid-hand) precisely so `openBuffWindow` would have something to refill
> to. Under `AP_REFRESH_CADENCE = ApRefreshCadence.PerTrick`, `openBuffWindow` now refills `apPool`
> back to `capacity` at every trick boundary, in addition to clearing `activatedThisTrick` — AC4's
> two-function separation is unchanged in *shape* (`openBuffWindow` is still the trick boundary,
> `refreshBuffsForNewHand` is still the hand boundary and still preserves `capacity` through its
> reset), but AC4's own guarantee ("the pool does not silently refresh mid-hand") now describes the
> retired `PerHand` branch, not the live default. `refreshActionPointsForNewHand`
> (`actionPoints.ts`) also changed: it now resets under **both** `PerHand` and `PerTrick`, because
> `PerTrick` is strictly more frequent than `PerHand`, never coarser — a hand boundary still resets
> under it. Only a future coarser cadence (per-fight, per-run) would leave that function's `else`
> branch live. See [action-points.md](action-points.md#dlr-141--per-trick-refresh) for the cadence
> itself and the AP-spent sim-metric fix it required.

## `isPricedBuff` / `activatableBuffs` — the guard that keeps `RangeError` off a render — DLR-114

`apCostOf` **throws** on `BuffKind.Unassigned`, and when DLR-114 was written `startRun` seeded
`STARTING_BUFF_COUNT` of exactly that. So the moment a screen was going to price an owned pile,
something had to stand between the two. DLR-114 put it here, beside the function that throws, rather
than in the component that would otherwise have had to remember it:

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

The consequence worth stating plainly, as it stood until 2026-08-25: **on a fresh run with an empty
Vault, `activatableBuffs` returned nothing**, so the loadout panel offered no buffs at all. That was
the placeholder pile being correctly filtered, not a failure.

> **DLR-135 removed the cause and left the guard alone, 2026-08-25.** `startRun` no longer seeds any
> `BuffKind.Unassigned` at all — a fresh run's pile is four distinct real bronze cards plus the
> guaranteed bronze Cheat, and **all five are priced**, so `activatableBuffs` discards nothing at run
> start and the loadout panel opens holding five rows. `isPricedBuff` and `activatableBuffs` are
> **byte-identical** across that change, deliberately: any unpriced kind reaching a render is still
> the class of bug this guard catches, and `BuffKind.Unassigned` is retained as the sentinel five
> guard suites fire against by name. See [The opening pile](the-opening-pile.md).

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

## `spentThisTrick` — how a consumed card still gets paid — DLR-145, 2026-08-25

DLR-145 made Taker, Feeder and Sidestep single-use (`CONDITION_CARD_SINGLE_USE`,
[consumable items](consumable-items.md)). On its own that change **silently pays nothing**, and the
failure mode is the reason this section exists rather than a footnote.

The trick's active set is built by filtering the *pile*: `buffHandInputFor`
(`src/app/warCouncil/buffRoundState.ts`) reads `offeredBuffs(state)`, which is
`activatableBuffs(state.buffs)`. `activateFromPile` removes a consumable from `state.buffs` at the
moment of the commit tap. So the instant a Taker became consumable, activating one deleted it from
the pile, the filter found nothing, and the card paid nothing — no throw, no refusal, no log, just a
card that cost itself and did zero.

The fix is a fourth field on `BuffActivationState`:

```ts
readonly spentThisTrick: readonly Buff[]
```

- **Populated** by `activateFromPile`, the only function that knows a card left the pile — and only
  on the consumable branch, so it is always empty for a non-consumable activation.
- **Cleared** by `openBuffWindow` and `refreshBuffsForNewHand`, alongside `activatedThisTrick`.
- **Read** by unioning it with `offeredBuffs` wherever a fired id is resolved back to a `Buff`.

It lives on the activation state rather than on `RoundUiState` because it has **exactly
`activatedThisTrick`'s lifetime** and is cleared on the same two edges. Splitting the two across
different owners is how this bug comes back in a different shape.

The union is **disjoint by construction** — a spent card is no longer in the pile — so no
de-duplication is needed and R5's overlap-bonus count stays correct. There are **three** readers of
that union and they must be kept in step: `buffHandInputFor` and `firedOncePerHandIds` (both in
`src/app/warCouncil/buffRoundState.ts`), and the simulator's active-set snapshot in
`src/sim/playHand.ts`.

**The alternative that was rejected** was deferring pile removal to the trick boundary, which would
have changed DLR-142's already-shipped Cheat and Timebomb behaviour.

## The two damage caps were removed — DLR-145, 2026-08-25

R6's containment is deliberately relaxed for the two axes a card can still pay on.
`MAX_MULTIPLIER_BONUS_PER_HAND` and `MAX_FLAT_DAMAGE_BONUS_PER_HAND` are
`Number.POSITIVE_INFINITY`, so `accrueAxisBonus`'s `Math.min(current + amount, cap)` is the identity
on `multiplierBonus` and `flatDamageBonus`. The **per-hand, not-on-a-hit** asymmetry documented
above is unchanged in shape and still governs `coinBonus` and `apRefunded`, whose caps (10 and 6)
are untouched — but neither of those axes mints any more, so as the game currently ships **no
accrual is ever clipped**.

The reason is the consumption rule, not a balance judgement: a clipped contribution used to cost a
player a card they could re-activate next trick, and now costs them a card they can never get back.
The two constants stay declared, with their `UNIT:` comments, as the single place a cap would be
restored.

## Taking a buff back off the trick — DLR-153, 2026-08-27

Until this ticket the ruleset recorded activation as irreversible: "once the second tap lands there
is no way to un-activate". `buffActivation.ts` is where that changed, because that is where the rule
lives.

**`isRevocableBuff(buff)` is the single statement of which cards may come back off.** It is a
membership test against a frozen `ReadonlySet<BuffKind>` holding exactly `Taker`, `Feeder` and
`Sidestep` — the three condition families, whose activation touches nothing but the pool and the
pile, which is precisely what makes them putbackable. It is **false for every Activated card**:
Cheat, Timebomb, Ward and Shield each arm felt state at the spend — `cheatTricksRemaining`,
`timebombArmedDamage`, `activateShield`'s credited hearts, `activateWard`'s guard — none of which
this module can reach. Reversing those is a larger rule change and its own ticket.

> **DLR-154 renamed the set and widened it by exactly one, 2026-08-31.**
> `REVOCABLE_CONDITION_KINDS` is now `REVOCABLE_BUFF_KINDS` — it is no longer condition-only — and
> `BuffKind.Timebomb` joins it as **the first revocable Activated card**. That is valid only
> because `AP_ENABLED` is `false`: with points off, the whole of a revocation is the card returning
> to the pile, which is exactly what `deactivateFromPile` already does. Cheat, Ward and Shield stay
> out, and the paragraph above is corrected on Timebomb alone.
>
> **`true` here does not mean this module can fully reverse one.** The felt-state reversal —
> `timebombArmedDamage`, `primedTimebombDamage`, `timebombFuseRemaining`, `timebombBuff` and the
> mark itself — is `handleRemoveBuff`'s, in `src/app/warCouncil/`, and this module must not learn
> about any of it. In practice both of that function's Timebomb branches intercept the call before
> the generic path below ever runs, because a Timebomb outlives the trick boundary that clears
> `activatedThisTrick` and `deactivateFromPile` throws on exactly that membership check. See
> [Priming a Timebomb](../war-council-ui/timebomb-priming-and-the-fuse.md).

One predicate, read by **both** the riding row's control and the reducer's guard, is the same
discipline `buffActivationRefusalFor` sets for activation: two readings of one gate is how a control
and a transition drift apart.

**`deactivateFromPile(state, buffs, buff)` returns the same `BuffActivationResult` pair
`activateFromPile` returns**, for the identical reason — a refund without the card returned is a free
spend, and a card returned without a refund is a double charge, so the pool and the pile must move
together or not at all. It:

- refunds through `refundAp`, clamped to `capacity` (see [action points](action-points.md));
- drops the id from `activatedThisTrick`;
- drops the buff from `spentThisTrick`;
- and returns the card to the pile **only if it was actually removed at activation** — membership of
  `spentThisTrick` is the test, so a card that never left is not added a second time.

**The card is appended to the end of the pile, not reinserted at its old index.** `offeredBuffs`
preserves pile order deliberately — the pile's order is the player's mental order — and storing an
index whose only job is to survive one transition would be a second piece of state. The card is
demonstrably back, and the gallery regroups by run anyway; the cost is that it moves under the
player's finger.

**It throws a `RangeError` naming the reason** when handed a non-revocable buff, or one not in
`activatedThisTrick` — exactly the contract `activateBuff` sets on a refused activation, so a caller
that skipped the predicate cannot commit an incoherent pool/pile pair. Nothing reachable from a tap
can reach the throw: `handleRemoveBuff` in `src/app/warCouncil/buffHandlers.ts` asks membership and
then `isRevocableBuff` first and returns the state unchanged on a no, because a throw inside a
reducer during an event handler unmounts the tree.
