Part of [Hunt](README.md).

# Condition evaluation — which buffs fire, and what a firing is worth

Built by DLR-125. Until this ticket `buffAccrual.ts` had **no caller anywhere in `src/`**: a player
could open the loadout, pay action points for a condition-family buff, and receive nothing at all.
This module is the missing middle — the pure predicate that answers "did this buff's condition come
true on this trick", plus the cadence rule that decides how often a satisfied condition may pay.

Where the answer is then *spent* is not here: the call site is `resolveTrickBank` in
`src/warCouncil/bank.ts`, documented at
[war-council/buffs-in-the-cash-out.md](../war-council/buffs-in-the-cash-out.md), and the fold back
onto the felt is [war-council-ui/buff-hand-state-and-the-fold.md](../war-council-ui/buff-hand-state-and-the-fold.md).
The stacking rule this all implements is `hybrid-design.md` §5 → _Resolving several buffs on one
trick_ (R1–R7), cited and never restated.

## `buffFires` — one buff, one trick, one boolean

`buffFires(buff, ctx)` in `buffEvaluation.ts` is a **total `switch` over `BuffConditionKind`**,
guarded above the switch by `isConditionFamily(buff.kind)` (`buffCosts.ts`). Everything that is not
one of the eleven condition families — all eight Activated consumables (Cheat, Timebomb, Ward,
Puppeteer, Second Thoughts, Foresight, Spyglass, Shield) and `BuffKind.Unassigned` — returns `false`
through that guard rather than through a `default` case. The switch itself has no `default`, so a
twelfth family added to `buffCosts.ts` fails to compile **here** rather than silently never firing.

The eleven, and what each reads:

| Family              | Fires when                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| `taker`             | the player won the trick and played a card of the target suit           |
| `feeder`            | the player lost the trick and played a card of the target suit          |
| `markOfRank`        | the player won the trick and played a card of the target rank           |
| `sidestep`          | the trick carried a skull and the player did **not** win it (a Dodge)   |
| `glutton`           | the trick carried a skull and the player **did** win it (a Skull Win)   |
| `hoarder`           | the bank **after this trick's climb** reaches the threshold             |
| `unbloodied`        | the run of tricks ending with no damage to the player reaches it        |
| `debtCollector`     | Apply Damage has been **pressed** this hand                             |
| `keepsake`          | it is the final trick and a card of the target suit is still in hand    |
| `miser`             | the run's purse reaches the threshold                                   |
| `cornered`          | the player's health is below the threshold percentage of the maximum    |

Two of those readings are decisions rather than transcriptions and are worth stating plainly.
**Sidestep and Glutton's "with this card" needs no target-card field**, because a buff is activated
in the between-tricks window *for the coming trick* — so "this card" already means "the card played
on the trick this buff was bought for". And **Debt Collector fires on the Apply Damage press, not on
the landing** (DLR-109's reading, unenforced in code until now): a hand-scoped `applyDamagePressed`
flag is set in `handleTapApplyDamage`'s committing branch and read at the next trick's resolution.
Firing on the landing would pay a trick or more later and would quietly contradict a reading DLR-109
already recorded.

**`buffFires` never throws.** No `ErrorBoundary` exists (DLR-131) and this runs inside a reducer
dispatch, so a throw would unmount the tree. `cornered`'s percentage is evaluated as
`health * 100 < threshold * PLAYER_START_HEALTH` — integer on both sides, **no division anywhere in
the module**, so no `NaN` is producible and no epsilon is needed.

Every number the evaluator compares against is read from a constant, never inlined:
`CONDITION_THRESHOLD` in `buffTemplates.ts` (Hoarder 2/3/4 bank, Unbloodied 2/3/4 tricks, Miser
5/10/20 coins, Cornered 60/45/33 percent), through `conditionThresholdOf`, which answers `null` for
every non-threshold family rather than being missing.

## `firedBuffs` — DLR-124 R4's cadence, layered on top

A satisfied condition is not the same as a payment. `firedBuffs(active, firedThisHand, ctx)` filters
`active` by three things in order: the buff's cadence is not `Activated`; it has not already spent
its once-per-hand allowance; and its condition is satisfied. `BUFF_CADENCE` in `buffs.ts` is the
total map, and `firesOncePerHand` is the single statement of which cadences it applies to.

- **Event** (Taker, Feeder, Mark of the *R*, Sidestep, Glutton, Debt Collector) — fires on every
  trick its condition holds.
- **Threshold** (Hoarder, Unbloodied, Miser, Cornered) — fires **once per hand**, filtered against
  the `firedThisHand` id list. Otherwise a condition like "purse at 10 coins" would pay on every
  remaining trick of the hand for having been true once.
- **Terminal** (Keepsake) — only when `ctx.finalTrick`.
- **Activated** (all eight consumables, plus `Unassigned`) — never fires from a condition at all.

Order follows `active`, because the pile's order is the player's mental order.

## `resolveTrickBuffs` — one call, so `bank.ts` states R3's order and nothing else

`resolveTrickBuffs(input, ctx)` composes the cadence filter with the accrual arithmetic and returns
`{ accrual, firedIds }`. It **delegates every figure to `resolveFiredBuffs`** in `buffAccrual.ts` —
R1 (one axis per contribution), R2 (contributions add within an axis), R5 (the Overlap Bonus,
`max(0, k − 1)`) and R6 (the per-hand caps) are never re-derived here. That is what leaves
`src/warCouncil/bank.ts` holding exactly one rule of its own: R3's *order*.

`BuffTrickInput` and `BuffHandContext` are declared **in this module**, not in `bank.ts`, because
`src/hunt/` owns what a buff is and `bank.ts` is already an importer of `../hunt`. `BuffHandContext`
is a `Pick<>` of `BuffTrickContext`, so the hand-scoped half and the whole cannot drift apart.

## `advanceTricksWithoutHit` — the one counter here that zeroes on a hit

`advanceTricksWithoutHit(current, playerHit)` is `playerHit ? 0 : current + 1`, and it is **the**
statement of Unbloodied's counter. It is called from exactly two places: `resolveTrickBank`, which
needs the value *including* this trick, and `foldBuffOutcome`, which stores it for the next one — so
the two can never disagree.

**It is a condition counter, not a cap**, and that distinction is deliberately visible in the file
tree. R6's four caps (`multiplierBonus`, `flatDamageBonus`, `coinBonus`, `apRefunded`) reset **per
hand and NOT on a hit** — that asymmetry is the rule's whole containment mechanism, and it survives
this ticket unchanged: `startHandAccrual()` is still the only reset `buffAccrual.ts` exports, no
`resetOnHit`-shaped function was added, and the per-hand reset is `createRoundUiState` calling
`startBuffHand()`. `tricksWithoutHit` is the one thing that legitimately zeroes on a hit, and it
lives in `src/app/warCouncil/buffRoundState.ts`, on the far side of a module boundary from the caps,
precisely so no reader can mistake one for the other.

## The cash-out spend model — a plan decision, not a transcription

`buffAccrual.ts` gained two counters this ticket, `multiplierPaid` and `flatDamagePaid`, plus
`payableCashOutBonus` (what this cash-out may still add) and `markCashOutPaid` (recording it spent).
Both counters move **forward only**, only when a cash-out actually fires, and are reset by
`startHandAccrual` and nothing else.

They exist because `hybrid-design.md` R6 states a cap **per hand** but does not say in so many words
what happens when a hand has more than one cash-out. A pool re-added at every cash-out would pay up
to `MAX_FLAT_DAMAGE_BONUS_PER_HAND` three times over in a hand holding a forced cash-out, a voluntary
Apply Damage and an end-of-hand fold — at which point the cap is not a cap. **This plan spent each
pool once**, which is a reading taken by the contract rather than a value transcribed from the
design (`plan.md` → Risks). If the developer wants the pool re-applied at every cash-out it is a
one-line change in `bank.ts` and the two `*Paid` counters come out.

`payableCashOutBonus` clamps with `Math.max(0, …)`, so a malformed accrual can never yield a
negative bonus that *reduces* damage on its way to a rendered heart row.

## Purse coins reach the run's purse — on a win and on a loss

R3's step 5 accumulates onto `BuffHandState.coinsEarned`, leaves the hand as
`WarCouncilRoundResult.coinsEarned`, and reaches the run through a new **optional eighth parameter**
on `recordEncounter` in `runTransitions.ts`, `buffCoinsEarned`, defaulted to `0` — the same widening
`apCapacity?` and `rankTiers?` already use, so all 48 existing call sites are untouched and `App.tsx`
is the only caller that passes it.

It is added **outside** the `wonThisEncounter` ternary, deliberately: a buff's condition already
decided whether it fired, and the run's purse is not the place to re-judge that. So a Purse
contribution lands even on a lost encounter.

## Known defects, recorded and not fixed

- **`Keepsake` evaluates correctly and is structurally unfireable in live play.** With `HAND_SIZE`
  cards and that many tricks every dealt card is played, so the player's hand at the end of the hand
  is empty and "hold a card of suit S at hand's end" is false by construction. **Three Purse cards
  therefore pay nothing.** The evaluator itself is right — a test in
  `src/hunt/__tests__/buffEvaluation.test.ts` fires it against a non-empty remaining hand — and a
  second assertion pins the live path supplying an empty one. Two exits, both the developer's:
  redefine "hand's end" against DLR-123's persistent encounter deck, or retire the family.
- **`Ward` silver and gold are indistinguishable** while `DAMAGE_PER_HIT = 1`. Unmoved by this
  ticket: Ward is an Activated consumable with no condition and never reaches the evaluator.
- **`Miser` rewards unspent coins and fights the shop**, and is now genuinely live rather than
  theoretical — a Miser buff fires and pays whenever the purse clears its threshold. A balance call
  for the developer's end-of-epic pass, not a code defect.
- **`Long Fall` (v1 list row #8) is not implemented and generates no template**, deferred by DLR-111
  for want of a UI answer. **Eleven of the twelve condition rows are evaluated.**
