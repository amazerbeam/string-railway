Part of [War Council](README.md).

# Buffs in the trick's damage — where evaluation happens, and why it is inside `resolveTrickBank`

Built by DLR-125, DLR-150, DLR-156. This page covers the **call site**: how an activated buff reaches
the trick that resolves it, where in `resolveTrickBank` its contribution lands, and how the per-trick
half of the evaluation context is derived. What a buff's condition actually _asks_ lives one module
over, in [hunt/buff-condition-evaluation.md](../hunt/buff-condition-evaluation.md); the design rule
both implement is `hybrid-design.md` §5 (R1–R7), cited and never restated.

**DLR-156 changed what a fired buff pays into.** Until 2026-09-01 a buff's reward was added to a
hand-long accrual and spent at whichever cash-out fired, so a Momentum card multiplied the whole
hand's pot however late it was played and a Blade was added outside the product. Now a fired buff
pays into **its own trick's bracket and nothing else** — `(base + buffDamage) × buffMult` — and does
not survive that trick. The hand-long accrual still exists, but only for the three axes that are not
damage.

## Why the call site is inside `resolveTrickBank` rather than before or after it

Both alternatives were worked through on paper first and both fail on a specific fact.

**Before the call** cannot work because two conditions read figures that do not exist until
`resolveTrickBank` has run: Hoarder needs the streak figure **after this trick's climb**, and
Unbloodied needs to know whether this trick cost the player health. Evaluating first would need
either a discarded throwaway pass or a second copy of the climb arithmetic in the caller.

**After the call** cannot work at all, because Momentum sits **inside** the product and the product
is `resolveTrickBank`'s. There is no position after the function from which you can reach into the
middle of it. DLR-156 made this stricter rather than looser: `buffDamage` is now inside the bracket
too, so both damage axes are unreachable from outside the function.

So `resolveTrickBank` receives `TrickFacts.buffs`, evaluates immediately after the banked/hurt
branch, and reports what happened back out on `TrickResolution` as `buffAccrual` and `firedBuffIds`
so nothing downstream re-derives it.

## The split: two functions over one set of fired buffs

`resolveTrickBank` calls `resolveTrickBuffs` once to decide **which** buffs fired, then feeds the
same fired list to two different consumers:

| Consumer | Axes | Scope | Lives in |
| --- | --- | --- | --- |
| `trickBonusFor(fired, trickIsLoss)` | Momentum (multiplier), Blade (flat damage), the Overlap Bonus | **this trick only** (DLR-156 AC11) | `src/hunt/buffAccrual.ts` |
| `resolveFiredBuffs(accrual, fired, trickIsLoss)` | Purse (coins), Second Wind (AP refund), DLR-150's Feeder carry | the hand's accrual, folded by the felt | `src/hunt/buffAccrual.ts` |

Both read `buff.reward` through the same `narrowToCostAxis` and the same `BuffKind.Feeder` /
`trickIsLoss` split, so the tier table, the cadence and the Feeder carry are inherited rather than
restated in two places.

`trickBonusFor` returns the Overlap Bonus **separately** rather than folded into `multiplierBonus`,
so the resolution screen can give it its own beat without re-deriving `overlapBonusFor`.

**R6's four per-hand caps are deliberately not applied to `trickBonusFor`.** They bound what a _hand_
may pay and this figure is per _trick_; both damage caps (`MAX_MULTIPLIER_BONUS_PER_HAND`,
`MAX_FLAT_DAMAGE_BONUS_PER_HAND`) are `Number.POSITIVE_INFINITY` today, so no number moved either
way. Coins, the AP refund and the carry still run through `resolveFiredBuffs` and its caps, untouched.

**What DLR-156 deleted from the accrual**: `CashOutBonus`, `payableCashOutBonus`, `markCashOutPaid`,
and the `multiplierPaid` / `flatDamagePaid` bookkeeping. All four existed only to stop a hand-long
pool being paid twice by two cash-outs in one hand. There is exactly one cash-out now, and it reads
no pool, so all four lost their reason to exist.

## `trickIsLoss` — this file exports the outcome axis rather than letting `hunt` re-derive it

DLR-150's Feeder carry needs the **outcome** axis: a Feeder that fires on a Loss banks its reward for
the next hand, while one that fires on a **dodge** — a Win — pays into this hand as before. Every
buff _condition_, by contrast, reads only the mechanical axis (`ctx.playerWon`, did the player
physically take the cards). The two disagree on exactly the tricks that matter: taking a skulled
trick is a Loss, and not taking one is a Win.

`streak.ts` already owns that inversion, once, in the total `TAKEN` table behind `isTaken` — and
`isTaken(outcome)` is already exactly "this trick was a Win". So `resolveTrickBank` passes
`!isTaken(outcome)` into `resolveTrickBuffs` as a third argument, `trickIsLoss`, and passes the same
value into `trickBonusFor`. **`src/hunt/` learns nothing new about skulls.** The rejected alternative
— a `trickWasLoss(ctx)` predicate in `buffEvaluation.ts` reading `playerWon === skullTrick` — would
have put a second statement of the game's most misread rule in a different module from the first. The
mechanic itself is [hunt/the-feeder-carry.md](../hunt/the-feeder-carry.md).

## The two fields, and why both are required rather than optional

`TrickFacts.buffs: BuffTrickInput | null` and `TrickResolution.buffAccrual: BuffBonusAccrual | null`
are **required properties typed `| null`**, following `baseDamageBonus` and `swanKeepsBank`. Optional
would let a construction site silently skip buffs; required makes the compiler enumerate every
construction site, and `null` is the explicit "this reader has no buffs" value.
`TrickResolution.firedBuffIds` is a plain list, empty when nothing fired — and DLR-156 gave it a
second reader: `resolutionBeatsFor` walks it in order to build the screen's build-up, so the ledger
narrates what the engine decided rather than running a second copy of the rules.

`BuffTrickInput` and `BuffHandContext` are **imported from `src/hunt/buffEvaluation.ts`**, not
declared here: `hunt` owns what a buff is, and `streak.ts` is already an importer of `../hunt`.

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
mapping to `undefined`; a test in `buffs.test.ts` pins the two unions member for member. DLR-152
exported that crossing as `targetSuitOf(suit)` so `buffProjection.ts` could reuse the one statement
of it; the map itself stays module-private.

## `PlayCardOptions` gains a sixth field

`buffs?: BuffHandInput` is optional like every other field on that interface — absent is "this caller
evaluates no buffs", which is exactly what the Quarry's own call sites are. It is assembled once, by
`playOptions(state)` in the app layer, which is the one assembly the player's commit, the Quarry's
follow and DLR-117's per-card preview all share. That single assembly is why the preview inherited
buff contributions at the cost of one line and no arithmetic of its own — and why DLR-156's new
equation reached the preview with **no arithmetic change at all**. See
[war-council-ui/card-damage-preview.md](../war-council-ui/card-damage-preview.md).

## What this module still does not know

It does not know what a run is, what a shop item is called, or what an action point is. The buffs
arrive as a value assembled a layer up, exactly as `baseDamageBonus` (a Whetstone count, renamed to a
plain fact) and the Timebomb queue already do. Nothing here calls `Math.random()`, imports React, or
touches a DOM global, so the pure-core lint boundary is unchanged.
