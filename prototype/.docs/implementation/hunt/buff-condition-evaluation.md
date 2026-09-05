Part of [Hunt](README.md).

# Condition evaluation — which buffs fire, and what a firing is worth

Built by DLR-125, DLR-150. Until this ticket `buffAccrual.ts` had **no caller anywhere in `src/`**: a player
could open the loadout, pay action points for a condition-family buff, and receive nothing at all.
This module is the missing middle — the pure predicate that answers "did this buff's condition come
true on this trick", plus the cadence rule that decides how often a satisfied condition may pay.

Where the answer is then *spent* is not here: the call site is `resolveTrickBank` in
`src/warCouncil/streak.ts`, documented at
[war-council/buffs-in-the-trick-damage.md](../war-council/buffs-in-the-trick-damage.md), and the fold back
onto the felt is [war-council-ui/buff-hand-state-and-the-fold.md](../war-council-ui/buff-hand-state-and-the-fold.md).
The stacking rule this all implements is `hybrid-design.md` §5 → _Resolving several buffs on one
trick_ (R1–R7), cited and never restated.

## `buffFires` — one buff, one trick, one boolean

`buffFires(buff, ctx)` in `buffEvaluation.ts` is a **total `switch` over `BuffConditionKind`**,
guarded above the switch by `isConditionFamily(buff.kind)` (`buffCosts.ts`). Everything that is not
one of the thirteen condition families (eleven until DLR-161) — every Activated card (Cheat, Curse,
the Wildcard, Ward, Puppeteer, Second Thoughts, Foresight, Spyglass, Shield) and
`BuffKind.Unassigned` — returns `false` through that guard rather than through a `default` case. The
switch itself has no `default`, so a fourteenth family added to `buffCosts.ts` fails to compile
**here** rather than silently never firing.

**Every case reads the mechanical axis — `playerWentHigh`, did the player physically take the cards
— and nothing else.** That is the whole reason the axis has its own word: whether a trick banked or
hurt is the *outcome* axis, and no condition consults it.

The thirteen, and what each reads:

| Family              | Fires when                                                                |
| ------------------- | ------------------------------------------------------------------------- |
| `suitHigh`          | the player went high and played a card of the target suit                 |
| `suitLow`           | the player went low and played a card of the target suit                  |
| `markOfRank`        | the player went high and played a card of the target rank                 |
| `skullLow`          | the trick carried a skull and the player went low                         |
| `glutton`           | the trick carried a skull and the player went high                        |
| `skullHelmet`       | at bronze, as `glutton`; at silver and gold, any Defeat — see below        |
| `skullTether`       | as `skullHelmet`                                                          |
| `hoarder`           | the bank **after this trick's climb** reaches the threshold               |
| `unbloodied`        | the run of tricks ending with no damage to the player reaches it        |
| `debtCollector`     | Apply Damage has been **pressed** this hand                             |
| `keepsake`          | it is the final trick and a card of the target suit is still in hand    |
| `miser`             | the run's purse reaches the threshold                                   |
| `cornered`          | the player's health is below the threshold percentage of the maximum    |

Two readings are decisions rather than transcriptions and are worth stating plainly.

**Two of these families are the reason the vocabulary was split, and their predicates should be read
literally:**

- **`suitLow` is `!playerWentHigh && (wild || suit matches)`. There is no skull term in it at all**,
  so it pays on a **Low Victory and a Low Defeat alike**. That is deliberate: it is a *Low* card and
  it does not care about the outcome.
- **`skullLow` is `skullTrick && !playerWentHigh`** — the only condition card that can never fire on
  a bad outcome, because a skull trick the player did not take is always a Low Victory.

**No buff attaches to a card.** A buff is activated for a *trick*, in the between-tricks window, and
checked when that trick resolves — so `skullLow` and `glutton` need no target-card field. Their
printed text said "with this card" until DLR-167 corrected it: that phrasing came from an unbuilt
"Apply-to-card" category and was never what the code did. And **Debt Collector fires on the Apply
Damage press, not on
the landing** (DLR-109's reading, unenforced in code until now): a hand-scoped `applyDamagePressed`
flag is set in `handleTapApplyDamage`'s committing branch and read at the next trick's resolution.
Firing on the landing would pay a trick or more later and would quietly contradict a reading DLR-109
already recorded.

**`buffFires` never throws.** A root `ErrorBoundary` exists (DLR-131), but it catches a render-phase
throw and replaces the whole app with a fallback — it is a net, not a licence, and this runs inside
a reducer dispatch where a throw would unmount the tree. `cornered`'s percentage is evaluated as
`health * 100 < threshold * PLAYER_START_HEALTH` — integer on both sides, **no division anywhere in
the module**, so no `NaN` is producible and no epsilon is needed.

**A wild condition drops the suit term and nothing else.** `buffFires` reads one local,
`const wild = buffIsWild(buff)`, and the two suited cases become
`ctx.playerWentHigh && (wild || suit matches)` and its low twin. The mechanical axis is untouched: a
wild Suit High card still has to go high. See [Wild cards](wild-cards.md).

Every number the evaluator compares against is read from a constant, never inlined:
`CONDITION_THRESHOLD` in `buffTemplates.ts` (Hoarder 2/3/4 bank, Unbloodied 2/3/4 tricks, Miser
5/10/20 coins, Cornered 60/45/33 percent), through `conditionThresholdOf`, which answers `null` for
every non-threshold family rather than being missing.

## `firedBuffs` — DLR-124 R4's cadence, layered on top

A satisfied condition is not the same as a payment. `firedBuffs(active, firedThisHand, ctx)` filters
`active` by three things in order: the buff's cadence is not `Activated`; it has not already spent
its once-per-hand allowance; and its condition is satisfied. `BUFF_CADENCE` in `buffs.ts` is the
total map, and `firesOncePerHand` is the single statement of which cadences it applies to.

- **Event** (Suit High, Suit Low, Mark of the *R*, Skull Low, Glutton, Debt Collector, Skull Helmet,
  Skull Tether) — fires on every trick its condition holds.
- **Threshold** (Hoarder, Unbloodied, Miser, Cornered) — fires **once per hand**, filtered against
  the `firedThisHand` id list. Otherwise a condition like "purse at 10 coins" would pay on every
  remaining trick of the hand for having been true once.
- **Terminal** (Keepsake) — only when `ctx.finalTrick`.
- **Activated** (Cheat, Curse, the Wildcard, Shield, the five consumables, plus `Unassigned`) —
  never fires from a condition at all. A Curse's payoff is therefore owed for the trick it was
  *activated* for, and `curseBonusOf` reads the activated set rather than the fired set.

Order follows `active`, because the pile's order is the player's mental order.

## `resolveTrickBuffs` — one call, so `streak.ts` states R3's order and nothing else

`resolveTrickBuffs(input, ctx, trickIsDefeat)` composes the cadence filter with the accrual arithmetic and returns
`{ accrual, firedIds }`. It **delegates every figure to `resolveFiredBuffs`** in `buffAccrual.ts` —
R1 (one axis per contribution), R2 (contributions add within an axis), R5 (the Overlap Bonus,
`max(0, k − 1)`) and R6 (the per-hand caps) are never re-derived here. That is what leaves
`src/warCouncil/streak.ts` holding exactly one rule of its own: R3's *order*.

**`trickIsDefeat` is the outcome axis, and this module never derives it.** DLR-150 added it as a
third parameter that is passed straight through to `resolveFiredBuffs` and read for nothing here. It
arrives from `src/warCouncil/streak.ts` as `!isTaken(outcome)`, because that file's `TAKEN` table
*is* the skull inversion and a second statement of it in `src/hunt/` — a `trickWasDefeat(ctx)`
predicate reading `playerWentHigh === skullTrick` — would be two copies of the game's most misread
rule in two modules. Every `buffFires` case still reads only the **mechanical** axis
(`ctx.playerWentHigh`, did the player physically take the cards); the outcome axis is used for
exactly one thing, the low carry. See [The low carry](the-low-carry.md).

`BuffTrickInput` and `BuffHandContext` are declared **in this module**, not in `streak.ts`, because
`src/hunt/` owns what a buff is and `streak.ts` is already an importer of `../hunt`. `BuffHandContext`
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

## The cash-out spend model — a plan decision, and **deleted by DLR-156**

> **None of this section describes live code.** DLR-156 stopped buff rewards pooling across a hand:
> `trickBonusFor` reads one trick's Blade and Momentum contribution directly, into that trick's own
> `(base + bd) × bm` bracket, and nothing survives the trick. With one cash-out left and no pool for
> it to read, `payableCashOutBonus`, `markCashOutPaid`, `CashOutBonus`, `NO_CASH_OUT_BONUS` and the
> `multiplierPaid`/`flatDamagePaid` counters all lost their only reason to exist and were deleted.
> The section is kept because the reading it records — that R6's cap is per *hand* and a pool is
> spent once — is the reading a ticket restoring a hand-long pool would have to make again.


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
one-line change in `streak.ts` and the two `*Paid` counters come out.

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

- **`Keepsake` evaluates correctly, and DLR-146 removed the structural reason it could never fire —
  without making it reachable.** The old statement was that every dealt card is played, so the
  player's hand at the end of a hand is empty and "hold a card of suit S at hand's end" is false by
  construction. **That is no longer true**: since 2026-08-26 the player is refilled to
  `PLAYER_HAND_FLOOR` as tricks resolve and the refill is *skipped* on the final trick, so a hand now
  ends with cards still in hand and `remainingSuits` is non-empty at the moment the condition is
  checked. What keeps the family dead is a different fact — **DLR-145 cut the Purse reward axis and
  made `keepsake` unmintable**, so no card the game can deal observes the difference. The evaluator
  is still right, and `src/hunt/__tests__/buffEvaluation.test.ts` still pins both halves. The exits
  are now the developer's in the other direction: restore the family and its axis, or retire it —
  redefining "hand's end" is no longer one of them, because the game supplies a real instant for it.
- **`Ward` silver and gold are indistinguishable** while `DAMAGE_PER_HIT = 1`. Unmoved by this
  ticket: Ward is an Activated consumable with no condition and never reaches the evaluator.
- **`Miser` rewards unspent coins and fights the shop**, and is now genuinely live rather than
  theoretical — a Miser buff fires and pays whenever the purse clears its threshold. A balance call
  for the developer's end-of-epic pass, not a code defect.
- **`Long Fall` (v1 list row #8) is not implemented and generates no template**, deferred by DLR-111
  for want of a UI answer. **Eleven of the twelve condition rows are evaluated.**

## Eight of the eleven families became unmintable — DLR-145, 2026-08-25

`markOfRank`, `glutton`, `hoarder`, `unbloodied`, `debtCollector`, `miser`, `cornered` and
`keepsake` were removed from `TEMPLATE_FAMILIES`, and the `coins` and `apRefund` reward axes were
removed from what a template may carry. **Nothing in this file changed.** Each of the eight keeps its
`BuffKind` member, its `buffFires` case, its `BUFF_CADENCE` row, its `CONDITION_MODIFIER` price and
its `CONDITION_THRESHOLD` entry, and both cut axes keep their `REWARD_BASE` and `REWARD_TIER_VALUE`
ladders. `buffFires` is still a total `switch` over eleven families.

What changed is one table upstream: `templateById` returns `undefined` for a cut family's id, so no
reel, no opening pile and no Vault grant can produce one. A card of a cut family would behave
exactly as it always did if one existed — none can. This is DLR-116's shelf-versus-union precedent
applied to the template pool, and it is what makes the cut reversible in a single table rather than
a redesign.

Two consequences worth stating:

- **DLR-125's confirmed `keepsake` defect is now unreachable rather than fixed.** It is still
  described above and still true of the code.
- **Vault grants keyed by a cut template id are dead.** `mintGrants` skips an id `templateById`
  cannot resolve, and `oddsBoostRefusalFor` and `startingTierRefusalFor` refuse one — the existing
  DLR-113 paths, so nothing corrupts and no save is rejected. A developer carrying a populated Vault
  from before DLR-145 silently loses those starting cards and odds boosts. See
  [../vault/README.md](../vault/README.md).

## Suit Low's Momentum row came back — DLR-150, 2026-08-27

`suitLow` is unchanged as a **condition**: it fires on `!ctx.playerWentHigh && (wild || suit
matches)`, with no skull term in it at all, so it pays on a **Low Victory and a Low Defeat alike** —
deliberate, and not a bug. What changed is what one may be *minted* as. DLR-145 had cut it to
Blade-only because a multiplier raised on the Defeat half was wiped by that Defeat's own reset
before it could be spent; the carry removes exactly that failure mode, so `TEMPLATE_FAMILIES`'s Suit
Low row is `BLADE_AND_MOMENTUM` again.

`BUFF_TEMPLATE_COUNT` now stands at **19** — 16 condition templates (6 Suit High + 6 Suit Low +
2 Skull Low + 1 Skull Helmet + 1 Skull Tether) plus 3 activated ones (Cheat, the Wildcard, Curse).
The eight cut families and the two cut reward axes are untouched by all of it — one row came back,
not the pruning. See [The low carry](the-low-carry.md).
