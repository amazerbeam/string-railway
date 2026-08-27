Part of [War Council](README.md).

# Buffs in the cash-out — where evaluation happens, and why it is inside `resolveTrickBank`

Built by DLR-125, DLR-150. This page covers the **call site**: how an activated buff reaches the trick that
resolves it, where in `resolveTrickBank` its contribution lands, and how the per-trick half of the
evaluation context is derived. What a buff's condition actually *asks* lives one module over, in
[hunt/buff-condition-evaluation.md](../hunt/buff-condition-evaluation.md); the design rule both
implement is `hybrid-design.md` §5 (R1–R7), cited and never restated.

## Why the call site is inside `resolveTrickBank` rather than before or after it

Both alternatives were worked through on paper first and both fail on a specific fact.

**Before the call** cannot work because two conditions read figures that do not exist until
`resolveTrickBank` has run: Hoarder needs the bank **after this trick's climb**, and Unbloodied needs
to know whether this trick cost the player health. Evaluating first would need either a discarded
throwaway pass or a second copy of the climb arithmetic in the caller.

**After the call** cannot work at all, because R3 puts Momentum **inside** the cash-out product and
Blade **outside** it — and the product is `resolveTrickBank`'s. There is no position after the
function from which you can reach into the middle of it.

So `resolveTrickBank` receives `TrickFacts.buffs`, evaluates immediately after the take/hit branch
and before the cash-out, and reports what happened back out on `TrickResolution` as `buffAccrual`
and `firedBuffIds` so that nothing downstream re-derives it.

## R3's five steps, and which two land here

| Step | Axis                       | Where it lands                                                        |
| ---- | -------------------------- | --------------------------------------------------------------------- |
| 1    | Second Wind (AP refund)    | the felt's fold, into the pool for the **next** window                 |
| 2    | Momentum (multiplier)      | **here** — joins the multiplier feeding `forcedCashValue`/`cashValue`  |
| 3    | the product                | **here** — the cash-out itself, unchanged                             |
| 4    | Blade (flat damage)        | **here** — added to the result, after §7's two-thirds floor           |
| 5    | Purse (coins)              | the felt's fold, accumulated for the hand's end                       |

Steps 1 and 5 touch nothing this hand's damage depends on, which is exactly why they are folded
outside — see [war-council-ui/buff-hand-state-and-the-fold.md](../war-council-ui/buff-hand-state-and-the-fold.md).

Both cash-out branches in this file read the same pair of functions:
`payableCashOutBonus(accrual)` for what is still unspent, and `markCashOutPaid` to record the spend.
That is what makes R6's ceiling a **per-hand** bound rather than a per-cash-out one — a hand holding
a forced cash-out, a voluntary Apply Damage and an end-of-hand fold would otherwise pay three full
pools. `NO_CASH_OUT_BONUS` is a module `const` (never mutable state) so a `null` accrual — a caller
that evaluates no buffs — reads identically to an accrual with nothing left to spend, and neither
branch needs a second guard.

Blade pays whenever a cash-out branch fires **even if the product is zero**: R3 step 4 says flat
damage is added to the result of the product, and a product of zero is a result. The alternative
would make Blade silently worthless on exactly the trick a streak is caught at a multiplier of zero.

## `trickIsLoss` — this file exports the outcome axis rather than letting `hunt` re-derive it

DLR-150's Feeder carry needs the **outcome** axis: a Feeder that fires on a Loss banks its reward for
the next hand, while one that fires on a **dodge** — a Win — pays into this hand as before. Every
buff *condition*, by contrast, reads only the mechanical axis (`ctx.playerWon`, did the player
physically take the cards). The two disagree on exactly the tricks that matter: taking a skulled
trick is a Loss, and not taking one is a Win.

This file already owns that inversion, once, in the total `TAKEN` table behind `isTaken` — and
`isTaken(outcome)` is already exactly "this trick was a Win". So `resolveTrickBank` passes
`!isTaken(outcome)` into `resolveTrickBuffs` as a third argument, `trickIsLoss`, which forwards it
untouched to `resolveFiredBuffs`. **`src/hunt/` learns nothing new about skulls.** The rejected
alternative — a `trickWasLoss(ctx)` predicate in `buffEvaluation.ts` reading
`playerWon === skullTrick` — would have put a second statement of the game's most misread rule in a
different module from the first. The mechanic itself is
[hunt/the-feeder-carry.md](../hunt/the-feeder-carry.md).

Nothing else in `resolveTrickBank` moved: the take/hit branch, R3's order, both cash-out branches and
`payableCashOutBonus`/`markCashOutPaid` are unchanged, and the carry is deliberately **not** payable
from either branch in the hand that earns it.

## The two new fields, and why both are required rather than optional

`TrickFacts.buffs: BuffTrickInput | null` and `TrickResolution.buffAccrual: BuffBonusAccrual | null`
are **required properties typed `| null`**, following `bankClimbBonus` and `swanKeepsBank`. Optional
would let a construction site silently skip buffs; required makes the compiler enumerate all five
`TrickFacts` and six `TrickResolution` construction sites, and `null` is the explicit "this reader
has no buffs" value. `TrickResolution.firedBuffIds` is a plain list, empty when nothing fired.

`BuffTrickInput` and `BuffHandContext` are **imported from `src/hunt/buffEvaluation.ts`**, not
declared here: `hunt` owns what a buff is, and `bank.ts` is already an importer of `../hunt`.

## `buffTrickFactsFor` — the single producer of the per-trick facts

`buffTrickFacts.ts` mirrors `swanTierFactsFor` exactly, and for the same reason: two readings of
"what did the player play" is precisely how a preview and a commit drift apart.
`buffTrickFactsFor(trick, remainingHand, input)` derives the three card-shaped fields — the suits and
the ranks the **player** put into this trick, and the suits still in their hand **after** the played
card left it (which is what "at hand's end" means for Keepsake) — and passes the rest of the
hand-scoped input through untouched. Its two readers are `playCard.ts` and `cardDamage.ts`'s preview.

`null` in gives `{ buffs: null }` out, so a caller that evaluates no buffs says so once, here.

**`src/hunt/` cannot see `TrickCard`**, which is why this crossing lives on the `warCouncil` side and
hands `hunt` plain `BuffTargetSuit` values. `TARGET_SUIT` is the total `Record<Suit, BuffTargetSuit>`
map between the two unions, so a member added to `Suit` fails to compile here rather than silently
mapping to `undefined`; a test in `buffs.test.ts` pins the two unions member for member.

## `PlayCardOptions` gains a sixth field

`buffs?: BuffHandInput` is optional like every other field on that interface — absent is "this caller
evaluates no buffs", which is exactly what the Quarry's own call sites are. It is assembled once, by
`playOptions(state)` in the app layer, which is the one assembly the player's commit, the Quarry's
follow and DLR-117's per-card preview all share. That single assembly is why the preview inherited
buff contributions at the cost of one line and no arithmetic of its own — see
[war-council-ui/card-damage-preview.md](../war-council-ui/card-damage-preview.md).

## What this module still does not know

It does not know what a run is, what a shop item is called, or what an action point is. The buffs
arrive as a value assembled a layer up, exactly as `bankClimbBonus` (a Whetstone count, renamed to a
plain fact) and the Timebomb queue already do. Nothing here calls `Math.random()`, imports React, or
touches a DOM global, so the pure-core lint boundary is unchanged by the addition of
`buffTrickFacts.ts`.
