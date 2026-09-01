Part of [War Council](README.md).

# The streak, the trick's damage, and the pot

`streak.ts` (DLR-156, and `bank.ts` from DLR-80 until 2026-09-01) is the whole of the game's scoring
loop in one pure module. It originally replaced `scoring.ts`, `spoils.ts` and `declareHunt.ts`, which
were deleted outright — with them went Spoils, the capture piles, both Standing multiplier tables,
rank inversion, the Win/Lose declaration, damage rounding, and the once-per-Hunt damage application.

**DLR-156 replaced the equation itself, and renamed the file with it.** Until 2026-09-01 the module
held a `bank` (a count of tricks taken) and a `multiplier` (a count of the same tricks), cashed
`bank × multiplier`, paid back two-thirds on a hit, force-cashed at the end of a hand, and pooled
buff rewards across the whole hand. All of that is gone. What replaced it:

```
trick damage = (BASE_DAMAGE + baseDamageBonus + buffDamage) × buffMult
total        = every banked trick's damage, added up
pot          = total × roll
```

`total` accumulates **damage** and `roll` counts the **tricks** it is multiplied by, so the pair no
longer counts the same thing twice. `BankState` became `StreakState`, `cashValue` became `potValue`,
`bank.ts` became `streak.ts`, and `voluntaryCashOut.ts` was deleted with its module — `applyPot` and
`incomingFromPot` are what survived of it, and they live here.

Nothing here imports React or touches the DOM; it imports `DAMAGE_PER_HIT`, `BASE_DAMAGE`,
`DuelSide`, `IncomingDamage`, `resolveTrickBuffs` and `trickBonusFor` from `src/hunt/`. **It reads no
card at all** — PT-002 removed the last one, and with it the `TrickCard` import.

## The four outcomes — `trickOutcomeFor` and `isTaken`

Two booleans — did the player win the trick, was it a skull trick — produce one of four named
outcomes:

| | Clean trick | Skull trick |
| --- | --- | --- |
| **Player won** | `CleanWin` — banked | `SkullWin` — hurt |
| **Player lost** | `CleanLoss` — hurt | `Dodge` — banked |

`trickOutcomeFor(playerWon, skullTrick)` is a total function over the two booleans, and the outcome is
a named `as const` union rather than a pair of booleans threaded through every branch — so the rule
reads out of the code the way it reads out of the design's table.

`isTaken(outcome)` answers whether an outcome **banks** or **hurts**. It reads from a total
`Record<TrickOutcome, boolean>` rather than comparing against two members, so adding a fifth outcome
becomes a missing-property compile error rather than a silently-false default.

The pairing is exact: `CleanWin` and `Dodge` are identical in every respect but their name, as are
`CleanLoss` and `SkullWin`. The names survive only so the UI can say _which_ rule fired.

**This is the axis the whole equation is keyed to**, and getting it backwards is the most common
error about this game. A dodge is a good outcome reached by losing the trick, and it banks; eating a
skull is a bad outcome reached by winning one, and it hurts.

## The whole rule — `resolveTrickBank`

```ts
resolveTrickBank(before: StreakState, trick: TrickFacts): TrickResolution
// TrickFacts = { playerWon, skullTrick, finalTrick, timebombTrick,
//                timebombToPlayer, timebombToQuarry, blastGuarded,   // DLR-91
//                baseDamageBonus,                                    // DLR-92, renamed DLR-156
//                swanKeepsMultiplier, swanKeepsBank,                 // DLR-122
//                buffs }                                             // DLR-125
```

One call still decides everything a trick does. `before` is the running `{ total, roll }`; the return
is a `TrickResolution` carrying the new pair plus what the trick did to get there. The function kept
its name and its shape through DLR-156 and lost three whole branches: the forced two-thirds cash-out,
the end-of-hand fold, and the `payableCashOutBonus`/`markCashOutPaid` spend model.

The three DLR-91 facts are **the Timebomb owed from an earlier trick, being paid at this one** — a
`Damage` per side, `0` when nothing is owed — plus whether a Blast Guard is held. They are handed in
rather than fetched: the pending queue lives on `EncounterState` in `src/hunt/`, `src/hunt/` must not
learn what a `RoundState` is, and the reducer is the one place that holds both. See
[the delayed hit](../hunt/timebomb-and-the-delayed-hit.md).

**The flags are a parameter object since DLR-90**, and they were four positional booleans before it.
`resolveTrickBank(START, true, false, false, false)` is unreadable at the call site — worse, **a
transposed pair of booleans type-checks cleanly and produces plausible numbers**, on the one function
that decides both health bars and the whole streak.

**One rule was added with the fifth fact**, and it is the only way a lost trick can cost the player
nothing — see [the Timebomb mark](the-timebomb-mark.md) for why it is keyed on the _outcome_ rather
than on which side won:

```ts
const replaced = trick.timebombTrick && outcome === TrickOutcome.CleanLoss
```

When `replaced` is true the hurt half below is skipped entirely, so `damageToPlayer` stays 0 and
`total`/`roll` pass through untouched rather than resetting. The resolution screen narrates this on a
beat of its own rather than as a broken streak — see
[the resolution screen](../war-council-ui/the-resolution-screen.md).

### On a banked trick (DLR-156 AC1/AC11)

```ts
const bonus = trick.buffs === null ? EMPTY_TRICK_BONUS : trickBonusFor(fired, false)
const base = BASE_DAMAGE + safeBonus(trick.baseDamageBonus)
const buffMult = 1 + bonus.multiplierBonus + bonus.overlapBonus
trickDamage = { base, buffDamage: bonus.flatDamageBonus, buffMult,
                overlapBonus: bonus.overlapBonus,
                dealt: (base + bonus.flatDamageBonus) * buffMult }
total += trickDamage.dealt
roll  += 1
```

Four things about that are the decisions:

- **`BASE_DAMAGE` is read here and nowhere else in the damage path.** It is a configured constant in
  `src/hunt/config.ts` at **1**, deliberately not a variable: a card family that raises the base is a
  separate design, and nothing else may write a bare `1` into the equation.
- **`baseDamageBonus` (DLR-92's Whetstone, renamed from `bankClimbBonus`) is folded into the base,
  inside the bracket.** The item used to add to the trick's bank contribution; the nearest faithful
  translation was to add to the trick's base damage, so both `buffMult` and the roll now multiply it
  and a long streak is worth many times more per copy than a short one. That is a rule reading the
  ticket's brief did not make — `plan.md`'s Assumption 2 — chosen over the two alternatives (adding
  outside the bracket, or quietly retiring a purchasable shop item). It is floored to 0 unless it is
  a positive integer, by `safeBonus`, for `bankAdded`'s old reason: it is the only figure this module
  does not compute itself, and it feeds damage and then a rendered heart row.
- **`buffDamage` and `buffMult` come from the buffs fired on THIS trick and nothing else.** Nothing
  pools any more. A Blade fired on trick 1 pays into trick 1's bracket and does not survive it; a
  Momentum card raises trick 1's multiplier only. `trickBonusFor` in `src/hunt/buffAccrual.ts` is the
  producer — see [buffs in the trick's damage](buffs-in-the-trick-damage.md).
- **The Overlap Bonus joins `buffMult`, and is carried out separately on `TrickDamage`** so the
  resolution screen can give it its own beat without re-deriving `overlapBonusFor`.

### On a hurt trick (DLR-156 AC7)

`damageToPlayer` picks up `DAMAGE_PER_HIT`, `total` and `roll` both reset to zero, and the Quarry is
paid **nothing**. There is no reduced share any more — `forcedCashValue`,
`FORCED_CASH_OUT_NUMERATOR` and `FORCED_CASH_OUT_DENOMINATOR` were deleted with the branch, and with
them the codebase's only division in this file. That is the change that makes the roll-over choice a
real bet: losing a nine-trick streak now costs everything rather than a third, and it is expected to
feel harsh.

DLR-122's Swan ladder is the one exception and is unchanged in shape: on a **clean loss** only, a
silver Swan spares the `roll` and a gold Swan spares `total` as well. Gold implies silver, folded in
here rather than trusted from the caller, so "the total survives but the streak that valued it does
not" is unexpressible.

### There is no end-of-hand cash-out any more (DLR-156 AC8)

`finalTrick` no longer folds anything in. `total` and `roll` cross a hand boundary untouched and are
seeded into the next hand from the run — see [the streak's lifetime](#the-streaks-lifetime) below.
The field `TrickResolution.cashedAtHandEnd` was deleted with the rule, as was `bankAdded`.
`finalTrick` survives on `TrickFacts` because Unbloodied still reads it as a hand-scoped condition
and `HAND_SIZE` still ends the hand elsewhere.

### `TrickResolution.cashOut` is now always zero

It is kept on the shape, and kept at `0`, because `incomingFrom` still sums it into the Quarry's
side. Only the apply choice pays the Quarry now, and it pays through `applyPot`, never through a
resolution.

## The pot, and the one cash-out left — `potValue` and `applyPot`

```ts
potValue(total, roll): number            // the plain product; replaces `cashValue`
applyPot(streak): { streak, dealt }      // deals the pot and returns EMPTY_STREAK
incomingFromPot(dealt): IncomingDamage   // the seat -> side crossing for that payment
```

`potValue` is **the** statement of what a streak is worth. `cashValue` existed so three cash-outs
could not disagree about what they were a share of; there is now exactly **one** cash-out, so the
function has one caller pair (`applyPot`, plus the screen's own read for display) and the question it
answered can no longer arise.

It keeps `cashValue`'s guard verbatim: a non-integer, non-positive, `NaN` or infinite input floors to
`0` rather than propagating, because this figure feeds damage and then a rendered heart row, and a
`NaN` would vanish into a health bar with nothing logged. Every real input is a non-negative integer,
so the guard is a backstop rather than a live path.

`applyPot` cannot fail — a `StreakState` in, `EMPTY_STREAK` and a dealt figure out. It was lifted
from the deleted `voluntaryCashOut.ts`'s `cashBankNow` and renamed, because there is no longer a
second, forced cash-out for it to be a _voluntary_ alternative to.

**Everything that gated the old Apply Damage button is gone**: `applyDamageRefusalFor`,
`ApplyDamageRefusal`, `ApplyDamageStock` and `incomingFromCashOut`, along with the five refusal
reasons (not your move, trick in progress, payout pending, insufficient AP, empty bank). The prompt
now fires only after a banked trick has resolved, so four of the five cannot occur and the fifth — an
empty pot — cannot either, because a banked trick has just added damage to the total. The AP cost
went with them (`plan.md` Assumption 4): the prompt is mandatory rather than a press the player
chooses, so charging for it would tax every banked trick. **That is a balance change in a ticket that
forbade balancing, and it was flagged rather than hidden.**

## Two sources of a hurt trick since DLR-91, one branch

```ts
const trickHit = !taken && !replaced                                      // the pre-existing one
const timebombResets = trick.timebombToPlayer > 0 && !trick.blastGuarded  // the new one

// Owed whether or not the streak resets: a Guard buys back the streak, never the health.
const damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) + trick.timebombToPlayer

if (trickHit || timebombResets) {
  if (!swanKeepsBank) { total = 0; if (!swanKeepsMultiplier) roll = 0 }
}
```

Three things about that shape are the decisions, each chosen against a plausible alternative:

- **Timebomb reaches the same branch rather than a branch of its own.** That is what makes "Timebomb
  behaves like any other damage" true _in code_ instead of asserted in a comment.
- **`damageToPlayer` is computed outside the branch.** The health is owed whether or not the streak
  resets, which is what lets a held Guard suppress the reset without cancelling the hit. The
  arithmetic is `2` on a trick the player won while primed and `3` on one they also lost.
- **A banked trick banks first, then the Timebomb wipes it.** The `taken` climb above runs before
  this branch, so a won-but-primed trick loses that trick's own contribution too. Under the old rules
  that trick still _cashed_ the larger figure; under DLR-156 it cashes nothing at all, because a hurt
  trick pays the Quarry nothing. The streak visibly climbing and then dying is what makes the
  Timebomb legible as the cause.

`TrickResolution` carries **`timebombToQuarry`** so `incomingFrom` can sum it, and
**`blastGuardSpent`** so the reducer can flip the run's flag rather than re-deriving "did the Guard
matter". See [Blast Guard](../hunt/blast-guard.md).

## The streak's lifetime

`total` and `roll` are **run-carried figures**, following DLR-150's `feederCarry` pattern field for
field:

```
RunState.streak                          src/hunt/run.ts — seeded EMPTY_STREAK by startRun
  -> WarCouncilMountProps.streak?        src/app/warCouncilMount.ts — OPTIONAL, defaults to empty
  -> RoundUiSeed -> RoundState.total/roll  src/app/warCouncil/roundUiSeed.ts
  -> WarCouncilRoundResult.streak        src/app/warCouncil/roundResult.ts — REQUIRED
  -> recordEncounter(..., streak)        src/hunt/runTransitions.ts
  -> streakAfter(encounter, streak)      carries it while the fight is live
```

`streakAfter` returns `{ total: 0, roll: 0 }` the moment `isEncounterResolved(encounter)` is true and
the streak unchanged otherwise — the exact shape of `feederCarryAfter` and `guardAfter` beside it. So
**a hand boundary does nothing at all** (AC8) and **a fight boundary wipes both** (AC9). The mount
prop is optional and defaulted so every existing mount site and fixture reproduces today's game
without an edit; the result field is required so the compiler enumerates every construction site.

`dealRound` no longer seeds the pair at zero — `roundUiSeed.ts` seeds them from the carried streak
after the deal.

## Why bare play still pays 1, 4, 9, 16, 25, 36

With no buffs fired and no Whetstone owned, each banked trick's damage is `(1 + 0 + 0) × 1 = 1`, so
after _n_ tricks `total` is _n_ and `roll` is _n_, and the pot is `n × n`. The bare curve is
**identical to the old `bank × multiplier`** by construction (AC13), which is what makes the change
legible: the gap opens only once buffs are involved, because `buffDamage` moved inside the
multiplication and the roll now multiplies an accumulated damage total rather than a trick count.

With buffs the payout is **roughly two and a half to three times** the old one for identical cards,
and **nothing caps a streak** now that the hand-end force-cash is gone. That is deliberate and
unbalanced; the counterweight — a health penalty staked by firing a buff — is a later ticket, and how
much of it is needed is meant to be found by playing this one.

## Numeric safety

There is **no division anywhere in this module** — removing `forcedCashValue` removed the file's only
one — so no epsilon is needed and none is invented. Every figure is an integer sum or product of
non-negative integers.

Two explicit guards remain, both for the same stated reason (`web-project.md` → "NaN propagates
silently"): `safeBonus` on `TrickFacts.baseDamageBonus`, which arrives from four layers away rather
than being computed here, and `potValue`'s own floor. `applyDamage`'s non-finite/negative guard
downstream is a backstop against a bad caller, not against this arithmetic.

The old ceiling analysis no longer applies. The largest pot is bounded only by how long a streak runs
and what is riding on it, not by a six-trick hand.

## The one seat → side crossing — `incomingFrom` and `incomingFromPot`

```ts
incomingFrom(resolution): IncomingDamage    // a resolved trick
incomingFromPot(dealt): IncomingDamage      // the apply choice
```

The program's only `PlayerSide` → `DuelSide` translations. `incomingFrom` is keyed by the side the
damage is **applied to**: the player eats `damageToPlayer`, the Quarry eats `cashOut` (now always 0)
plus any Timebomb paid at this trick. `incomingFromPot`'s player entry is a hard `0` — "applying
deals no damage to the player" is literally that line.

Existing as functions is the point. A call site building either record by hand is one transposition
away from depleting the wrong bar — which would type-check cleanly and produce plausible numbers
indefinitely, because both fields are non-negative integers and neither bar can tell whose damage it
received.

## Where it is called

`playCard.ts` calls `resolveTrickBank` once, when a trick completes, and writes the result onto
`RoundState.lastResolution`. `playCard` decides nothing about the outcome itself — it reports who won,
whether the trick was skulled, whether it carried a mark, and forwards the facts it was handed
through `PlayCardOptions`. Every rule stays here.

`applyPot` has exactly one caller: `applyPotAction` in `src/app/warCouncil/commitHandlers.ts`, the
resolution screen's Apply choice.

`lastResolution` is cleared to `null` on a lead, so a held resolution cannot outlive the trick it
describes and be shown against the next one.

## What the tests pin

Four spec files, `streak.test.ts`, `streak.formula.test.ts`, `streak.buffs.test.ts` and
`streak.integration.test.ts` (all renamed from `bank.*` with the module). `streak.test.ts` keeps the
two equality pairs — a dodge against a clean win, eating a skull against losing a clean trick — which
are what pin the four outcomes to two behaviours, plus DLR-91's 2-or-3 Timebomb arithmetic and the
Blast Guard cases.

**The headline spec is still the bare curve**, now in `streak.formula.test.ts`: a streak walked from
1 to 6 with nothing fired, whose pot after each banked trick is exactly `[1, 4, 9, 16, 25, 36]`. It
is the spec that would catch the base or the roll silently ceasing to climb per trick, and DLR-156
kept its numbers unchanged on purpose — the same table now proves the _new_ equation collapses to the
old bare rule.

Beside it in that file: the worked six-trick example from `spec.md` (`+2` flat and `+2` momentum
every trick paying 9 a trick, the pot reaching 324); a Blade fired on trick 1 contributing nothing to
tricks 2–6; a hurt trick paying the Quarry `0`, zeroing both figures and returning `trickDamage:
null`; an eaten skull being identical to a clean loss; a dodge banking; `finalTrick` on a banked
trick leaving both figures standing and paying nothing; and `baseDamageBonus` landing inside the
base. `streak.integration.test.ts` buys two Whetstones through the real `buyFromShop` and proves a
hit wipes the boosted total exactly as it would the bare one.
