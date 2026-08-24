Part of [War Council](README.md).

# The bank, the streak, and the cash-out

`bank.ts` (DLR-80) is the whole of the game's scoring loop in one pure module. It replaced
`scoring.ts`, `spoils.ts` and `declareHunt.ts`, which were deleted outright — with them went Spoils,
the capture piles, both Standing multiplier tables, rank inversion, the Win/Lose declaration, damage
rounding, and the once-per-Hunt damage application.

**PT-002 changed what the bank counts.** It banked both cards' printed ranks until 2026-08-14; it now
banks **1 per trick taken**, so both terms of the cash-out equation are the streak length and a
streak of _n_ cashes exactly `n × n`.

**DLR-91 then gave the reset a second trigger** — Timebomb owed to the player at this trick — reaching the
**same** branch a lost trick reaches rather than getting a rule of its own. The four outcomes, the
`finalTrick` fold and `incomingFrom`'s job are all still as DLR-80 left them; what moved is that
`damageToPlayer` is now computed outside the cash-out branch and `incomingFrom` sums two sources into
the Quarry's total.

**DLR-92 made the per-trick climb purchasable.** `bankAdded` was the literal `1` from PT-002 until
2026-08-19; it is now `1 + bonus`, where the bonus is a plain number handed in on `TrickFacts` and sourced
from the run's Whetstone count. `multiplier += 1` is untouched, so a streak of _n_ cashes
`(1 + bonus) × n²`. **This module still knows nothing about a shop, an item, or a `RunState`** — see
[how the bonus gets here](#how-the-bonus-reaches-a-pure-module-without-a-runstate-import) below, which is
the part of DLR-92 worth reading before changing anything.

**DLR-94 split the cash-out into two rates and named the arithmetic they share.** Until 2026-08-20 every
cash-out paid the plain `bank × multiplier`. Now `cashValue` states that product once, and
`forcedCashValue` reduces it to a configured fraction — two-thirds, floored — for the branch a player did
**not** choose. The forced branch calls the second; the `finalTrick` fold calls the first; and the new
voluntary cash-out in [`voluntaryCashOut.ts`](voluntary-cash-out.md) calls the first too. Three call
sites, one product, and the asymmetry visible in two lines rather than inferred from a comment.

Nothing here imports React or touches the DOM; it imports `DAMAGE_PER_HIT`, `DuelSide`,
`IncomingDamage` and — since DLR-94 — `FORCED_CASH_OUT_NUMERATOR` / `FORCED_CASH_OUT_DENOMINATOR` from
`src/hunt/`. **It reads no card at all** — PT-002 removed the last one, and with it the `TrickCard`
import.

## The four outcomes — `trickOutcomeFor` and `isTaken`

Two booleans — did the player win the trick, was it a skull trick — produce one of four named
outcomes:

| | Clean trick | Skull trick |
| --- | --- | --- |
| **Player won** | `CleanWin` — taken | `SkullWin` — hit |
| **Player lost** | `CleanLoss` — hit | `Dodge` — taken |

`trickOutcomeFor(playerWon, skullTrick)` is a total function over the two booleans, and the outcome is
a named `as const` union rather than a pair of booleans threaded through every branch — so the rule
reads out of the code the way it reads out of the design's table.

`isTaken(outcome)` answers whether an outcome **banks the trick** or **takes damage**. It reads from a
total `Record<TrickOutcome, boolean>` rather than comparing against two members, so adding a fifth
outcome becomes a missing-property compile error rather than a silently-false default.

The pairing is exact: `CleanWin` and `Dodge` are identical in every respect but their name, as are
`CleanLoss` and `SkullWin`. The names survive only so the UI can say *which* rule fired.

## The whole rule — `resolveTrickBank`

```ts
resolveTrickBank(before, trick: TrickFacts): TrickResolution
// TrickFacts = { playerWon, skullTrick, finalTrick, timebombTrick,
//                timebombToPlayer, timebombToQuarry, blastGuarded,   // DLR-91
//                bankClimbBonus }                                  // DLR-92
```

The three DLR-91 facts are **the Timebomb owed from an earlier trick, being paid at this one** — a
`Damage` per side, `0` when nothing is owed — plus whether a Blast Guard is held. They are handed in
rather than fetched: the pending queue lives on `EncounterState` in `src/hunt/`, `src/hunt/` must not
learn what a `RoundState` is, and the reducer is the one place that holds both. See
[the delayed hit](../hunt/timebomb-and-the-delayed-hit.md).

One call decides everything a trick does. `before` is the running `{ bank, multiplier }`; the return
is a `TrickResolution` carrying the new pair plus what the trick did to get there.

**The flags are a parameter object since DLR-90, and they were four positional booleans before it.**
PT-002 had already removed `trickCards` rather than keeping it unused behind an `_` prefix — after that
change nothing in the function read a card, and a signature naming a dependency it does not have is a
claim the next reader has to disprove. DLR-90 then added a **fifth** fact, and
`resolveTrickBank(START, true, false, false, false)` is unreadable at the call site — worse, **a
transposed pair of booleans type-checks cleanly and produces plausible numbers**, on the one function
that decides both health bars and the whole streak. One production caller and 14 spec call sites
converted; it is a **call-shape change with no behaviour change**, and the evidence is that every
pre-existing assertion in `bank.test.ts` holds unedited through it.

**One rule was added with that fifth fact**, and it is the only way a lost trick can cost the player
nothing — see [the Timebomb mark](the-timebomb-mark.md) for why it is keyed on the *outcome* rather than
on which side won:

```ts
const replaced = trick.timebombTrick && outcome === TrickOutcome.CleanLoss
```

When `replaced` is true the hit half below is skipped entirely, so `damageToPlayer` stays 0, `cashOut`
stays 0, and `bank`/`multiplier` pass through untouched rather than resetting. `TrickResolution` also
gained `timebombTarget: DuelSide | null` — the side owed the delayed hit, crossed to `DuelSide` here
because this module is already the one place that crossing happens.

**On a taken trick** — `bankAdded` is **`1 + bankClimbBonus`** (DLR-92; the bonus is `0` unless a Whetstone
is owned), the bank climbs by it, and the multiplier increments **by exactly 1 regardless**. No damage in
either direction from the trick itself.

**On a hit** — `cashOut` becomes **`forcedCashValue(bank, multiplier)`** (DLR-94; two-thirds of the
product, floored — it was the plain product until 2026-08-20), `damageToPlayer` picks up
`DAMAGE_PER_HIT`, and both running figures reset to zero.

**On the sixth trick** — the `finalTrick` fold calls **`cashValue`**, deliberately not `forcedCashValue`:
the end-of-hand cash pays in full. That asymmetry is the whole of DLR-94's rule change and is pinned by a
spec that cashes one identical streak both ways.

> **Since DLR-125 both of those branches also carry a buff contribution.** An activated buff whose
> condition fired adds to the multiplier **inside** the product (R3 step 2) and adds flat damage
> **outside** it, after the two-thirds floor (R3 step 4). Each of those two pools pays **once per
> hand**, not once per cash-out. Neither rate itself moved, and a hand with no buffs evaluates to the
> arithmetic described above unchanged. See [Buffs in the cash-out](buffs-in-the-cash-out.md).

### The two rates — `cashValue` and `forcedCashValue` (DLR-94)

```ts
cashValue(bank, multiplier): number        // the plain product
forcedCashValue(bank, multiplier): number  // that product, reduced and floored
```

`cashValue` is **the** statement of what a streak is worth, so the three cash-outs the game now has —
one the player chose, the end of the hand, and a forced hit's reduced share — cannot disagree about what
they are a share *of*. It floors a non-integer, non-positive, `NaN` or infinite input to `0` rather than
propagating it, for the reason `bankAdded`'s own guard gives: this figure feeds damage, then a rendered
heart row, so a `NaN` would vanish into a health bar with nothing logged.

`forcedCashValue` is the only reader of `FORCED_CASH_OUT_NUMERATOR` and `FORCED_CASH_OUT_DENOMINATOR`
anywhere in `src/`.

**It multiplies before it divides, and that is arithmetic rather than style.** The obvious form —
`Math.floor(x * (2 / 3))` — is wrong for a whole class of inputs, because `2 / 3` is
`0.6666666666666666`, so `3 * (2 / 3)` is `1.9999999999999998` and floors to **1** where the rule says
2. Every multiple of three is wrong by one. Taking the numerator first keeps the dividend an exact
integer at what is the only division in the file, and `Math.floor` then rounds down as the rule
requires — the Quarry is never overpaid by a rounding artefact. `bank.test.ts` pins this directly, over
every multiple of three up to 300.

It throws a named `RangeError` on a non-positive or non-finite denominator rather than returning `NaN`,
exactly as `flaskHealAmount` and `duelHealthBars` throw on theirs. Both figures are configured integers,
so this is a guard rather than a path a player reaches.

**This is the codebase's first fractional rule**, and the numerator/denominator pair is the pattern the
next one should follow. A single float constant reintroduces the bug above.

### The purchasable climb — DLR-92

```ts
const bonus =
  Number.isInteger(trick.bankClimbBonus) && trick.bankClimbBonus > 0 ? trick.bankClimbBonus : 0
bankAdded = 1 + bonus
bank += bankAdded
multiplier += 1   // UNCHANGED — deliberately
```

Three decisions in five lines, and each was made against a live alternative:

- **The bonus multiplies the curve rather than adding to a cash-out.** Because it lands on the *per-trick*
  climb and the multiplier still counts tricks, the product is `(1 + bonus) × n²` — so one copy doubles a
  six-trick hand from 36 to 72 and two triple it to 108, while a lone taken trick only moves 1 → 2. The
  alternative — a flat bonus added to `bank` once per cash-out — was what this doc previously *predicted*
  a bonus-bank item would do (see the note under `n × n` below); it would have been worth the same on a
  one-trick streak as on a six-trick one, which is the opposite of what the design wanted.
- **The multiplier's climb was left alone**, and that is the ticket's scope boundary rather than an
  omission. A twin item raising `multiplier`'s climb instead is named as the natural next addition in
  `version-4-scope.md` §1, and building both under one item was explicitly refused. `bank.test.ts` pins
  the multiplier at exactly `+1` across bonuses 0, 1 and 5 so the boundary cannot erode quietly.
- **A bonus that is not a positive integer floors to 0 rather than throwing.** `bankAdded` feeds `bank`,
  then `bank × multiplier`, then `incomingFrom`, then a rendered heart row — so a `NaN` or a fraction would
  empty a health bar with nothing logged anywhere, which is exactly the trap `web-project.md` names.
  Degrading to the bare pre-DLR-92 rule is the safe failure; throwing mid-trick would abort a hand over a
  figure the player cannot see. `Number.isInteger` rejects `NaN`, `Infinity` and `1.5` in one test, and
  the `> 0` guard rejects negatives — all four are pinned by a spec.

### How the bonus reaches a pure module without a `RunState` import

The count lives on `RunState` in `src/hunt/run.ts` and this module must never learn what a run is. The
route is the one DLR-91 established for `blastGuarded`, followed exactly:

```
RunState.whetstones
  → bankClimbBonusFor(run)              src/hunt/run.ts — the one statement of "+1 per copy"
  → <WarCouncilRound bankClimbBonus>    src/App.tsx — THE crossing, and it is a number
  → RoundUiSeed → RoundUiState          src/app/warCouncil/roundUiState.ts
  → playOptions(state)                  src/app/warCouncil/roundReducer.ts
  → PlayCardOptions.bankClimbBonus      src/warCouncil/legalMoves.ts (optional, `?? 0`)
  → TrickFacts.bankClimbBonus           src/warCouncil/playCard.ts (required)
  → here
```

**The field is called `bankClimbBonus`, not a Whetstone count, and that naming is the boundary.**
`src/warCouncil/` contains zero code references to `Whetstone` or `RunState` — a grep in the contract's
final phase enforces it, excluding comment lines because two docblocks here and in `legalMoves.ts` name
both words precisely to explain why the boundary exists. The practical payoff: "Whetstone" is placeholder
copy the developer may rename, and a rename touches `src/hunt/` and `shopLabels.ts` only.

**Required on `TrickFacts`, optional on `PlayCardOptions`** — the same split the three Timebomb facts already
use. Required on the facts object so the compiler enumerates every producer (there is exactly one:
`playCard.ts`); optional on the options object so the Quarry's call sites, which pass nothing, needed no
edit. The widening cost two edits in total rather than thirty-one, because all 30 spec call sites build
their facts through one `facts()` factory.

**`RoundUiState.bankClimbBonus` is read-only for the hand's whole life** and is deliberately *not* returned
on `WarCouncilRoundResult`, unlike `timebombCharges` and `blastGuardHeld`. A hand cannot spend a Whetstone,
so handing it back would invite a second writer for a value that never changes. `recordEncounter`'s
signature did not grow; `whetstones` rides `advanceRun`'s and `recordEncounter`'s existing `...run` spread
exactly as `coins` does.

### Two sources of a hit since DLR-91, one branch

```ts
const trickHit = !isTaken(outcome) && !replaced          // the pre-existing one
const timebombResets = trick.timebombToPlayer > 0 && !trick.blastGuarded  // the new one

// Owed whether or not the streak resets: a Guard buys back the streak, never the health.
const damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) + trick.timebombToPlayer

if (trickHit || timebombResets) {
  cashOut = bank * multiplier
  bank = 0
  multiplier = 0
}
```

Three things about that shape are the decisions, and each was chosen against a plausible alternative:

- **Timebomb reaches the same branch rather than a branch of its own.** That is what makes "Timebomb
  behaves like any other damage" true *in code* instead of asserted in a comment — one statement of
  what a reset is, so the two triggers cannot drift into meaning different things.
- **`damageToPlayer` moved out of the cash-out branch.** The health is owed whether or not the streak
  resets, which is what lets a held Guard suppress the reset without also cancelling the hit. The
  arithmetic is `2` on a trick the player won while primed and `3` on one they also lost — that sum is
  the whole of it, with no third case.
- **A win banks first, then the Timebomb cashes it.** The `isTaken` climb above runs before this branch,
  so a streak of 4 winning trick 5 while primed cashes **25**, not 16. The alternative — Timebomb landing
  before the climb — is a one-line change and a different feel; this reading was chosen because the trick
  *was* won so it should count, and because the streak visibly climbing and then dying is what makes the
  Timebomb legible as the cause. It is the one sub-decision the developer was not asked about.

`TrickResolution` gained two fields with it: **`timebombToQuarry`**, carried through so `incomingFrom` can
sum it, and **`blastGuardSpent`** (`timebombToPlayer > 0 && blastGuarded`), which reports that the Guard
actually fired so the reducer can flip the run's flag rather than re-deriving "did the Guard matter" —
that would be a second reading of one rule. See [Blast Guard](../hunt/blast-guard.md).

### Why `n × n` falls out of the two counters (PT-002)

The equation was never edited. Because a taken trick climbs **both** terms by exactly 1 **when nothing is
bought**, the two are equal for as long as a streak runs — so `bank × multiplier` on a streak of length _n_
is `n × n`: **1, 4, 9, 16, 25, 36** across a six-trick hand. The compounding is the multiplier's, as
before; what changed at PT-002 is that the additive term stopped being a source of variance the player
could not control. **Since DLR-92 a Whetstone breaks the equality deliberately** — the bank climbs faster
than the multiplier, and the product becomes `(1 + bonus) × n²`.

The `1` is still a **literal, not a config key**, and that is deliberate: 1 is what counting a trick
means. **DLR-92 added no key for the bonus either** — "+1 per copy" is the item's definition, stated once in
`bankClimbBonusFor`, and an item granting +2 a copy would be a different item rather than a retuning of
this one. The comment above the arithmetic in `bank.ts` says so, so the next reader does not "fix" either
number into configuration.

> **This section used to predict the wrong shape, and DLR-92 is the correction.** It read: "a later item
> granting bonus bank would add to `bank` rather than redefine a trick's worth." The item that arrived does
> the opposite — it redefines a trick's worth, precisely so the gain scales with the streak instead of
> being a flat top-up. The prediction is left here rather than deleted because *why* it was wrong is the
> useful part: a flat addition is worth the same on a one-trick streak as on a six-trick one, and the
> design wanted the reward for a long streak to grow.

**`bank` and `multiplier` remain two independent fields**, and DLR-92 is what that shape was being kept
for. Collapsing them into one counter would have been the obvious simplification and was rejected twice:
first speculatively, for a planned **"+1 ×"** item, and now for real — the Whetstone pushes `bank` without
touching the trick count, which needed **no restructuring of this function at all**. The multiplier twin,
when it lands, uses the other half of the same affordance.

> **The engine field is still named `bank` though it now holds a trick count.** Renaming it
> (`streakTricks`, say) would touch this file, `playCard.ts`, `types.ts`, `deal.ts`,
> `roundReducer.ts`, `WarCouncilRound.tsx`, `BankMeter.tsx` and about ten test files — roughly
> doubling a play-test ticket whose point was to get the new feel on screen. Every one of those is
> compiler-checked, so the rename stays safe whenever it happens. `types.ts` and this module's doc
> comments were restated to describe a trick count, so the name is the only thing left saying
> otherwise.

### Why the end-of-hand cash-out folds into the sixth trick

The sixth trick's forced cash-out reads like a second event, and modelling it as one would have meant
two `applyDamage` calls on trick 6, an ordering question between them, and a guard for "the first one
already resolved the encounter". `finalTrick` folds it into the same resolution instead.

That is safe because **exactly one of the two cash-outs can ever be non-zero**, and the argument is
worth stating because it is what the design rests on:

- If the trick was a **hit**, it has already set `bank` and `multiplier` to zero, so the subsequent
  end-of-hand cash of `0 × 0` is zero.
- If the trick was **taken**, `bankAdded` is at least 1 — so the bank is non-zero and there is exactly one
  bank to cash. (Before PT-002 the same step read "the sum of two card ranks, and every rank is at
  least 1". The argument survived the change to a trick count unaltered, and survived DLR-92's
  `1 + bonus` for the same reason: **all three forms are strictly positive**, which is the only property
  it ever needed. The floor-to-0 guard on the bonus is what keeps that true of the third.)

The result is **one damage application per trick**, with no ordering question, and `cashedAtHandEnd`
recording which rule actually paid out so the UI can still say why. It is display-only; the two can
never both be non-zero.

### Numeric safety

There is **no division anywhere in this module**, and neither DLR-91 nor DLR-92 added any. The multiplier is
an integer incremented by 1, the bank by a positive integer, and the cash-out is one multiplication of two
non-negative integers — so the classic `NaN` source is absent, no epsilon is needed, and none is invented.
`applyDamage`'s own non-finite/negative guard downstream is therefore a backstop against a bad caller, not
against this arithmetic.

**DLR-92 is the first change to introduce a number this module does not compute itself**, and that is why
it carries the only explicit input guard in the file. Every other figure here is derived from booleans and
its own previous value; `bankClimbBonus` arrives from four layers away, so it is validated rather than
trusted — floored to 0 unless it is a positive integer. The failure it prevents is specific: a `NaN` bonus
would make `bankAdded`, then `bank`, then `cashOut`, then a heart row all `NaN`, and a `NaN` renders as
nothing and logs nothing.

PT-002 strictly narrowed the range rather than widening it: the largest cash-out producible with an empty
shop is **36** — a six-trick unbroken streak — where the rank sum could reach the high hundreds. **DLR-92
reopened the ceiling, and left it unbounded in principle**: with `w` Whetstones owned a full hand pays
`(1 + w) × 36`, and nothing caps `w` but the purse. In practice the run pays 1 coin a fight against a
4-coin price, so `w` is small; but the safe-integer limit is now a function of how long a run lasts rather
than a fixed 36, and a cap — if one is ever wanted — belongs in `refusalFor`, not here.

DLR-91's additions are three property reads and a boolean per resolved trick, at most six tricks a
hand. `timebombToPlayer > 0` is `false` for `NaN`, so a primed figure **fails safe by not firing the
Guard** rather than by spending it silently; `applyDamage`'s own non-finite guard downstream still
refuses the figure itself.

The rounding rule the old equation needed is gone with the ×0.5 multiplier bands that produced
fractional products.

## The one seat → side crossing — `incomingFrom`

```ts
incomingFrom(resolution): IncomingDamage
```

The program's only `PlayerSide` → `DuelSide` translation, replacing the retired `duelSideDamage`. It
is keyed by the side the damage is **applied to**: the player eats `damageToPlayer`, the Quarry eats
`cashOut` **plus any Timebomb paid at this trick** (DLR-91).

Summing the Quarry's two sources *here* rather than at the call site is what keeps this the only
crossing. A reducer that added the Timebomb itself after receiving the record would be a second place
that decides which bar a figure depletes.

Existing as one function is the point. A call site building this record by hand is one transposition
away from depleting the wrong bar — which would type-check cleanly and produce plausible numbers
indefinitely, because both fields are non-negative integers and neither bar can tell whose damage it
received.

## Where it is called

`playCard.ts` calls it once, when a trick completes, and writes the result onto
`RoundState.lastResolution`. `playCard` decides nothing about the outcome itself — it reports who won
(`resolveTrickWinner`), whether the trick was skulled (`trickIsSkulled`) and whether it carried a mark
(`trickIsPrimed`), and forwards the three Timebomb facts **and DLR-92's bank-climb bonus** it was handed
through `PlayCardOptions`. All **eight** go into the `TrickFacts` literal; every rule stays here.

The rejected alternative was computing the outcome in the reducer from a before/after `RoundState`
diff, which is how the trick's *winner* used to be re-derived. That would have put the game's central
rule in a file that needs a fabricated state pair to test, and it would have made the outcome a
**second** derivation that could disagree with the bank the engine had already updated.

`lastResolution` is cleared to `null` on a lead, so a held resolution cannot outlive the trick it
describes and be shown against the next one.

## What the tests pin

`bank.test.ts` covers each acceptance criterion by name, both `finalTrick` branches (including the
"cashes once, not twice" case), and the two equality pairs — a dodge against a clean win, eating a
skull against losing a clean trick — which are what pin the four outcomes to two behaviours.

`bank.test.ts` also pins DLR-91's additions: the 2-or-3 arithmetic on a primed trick won and lost, a
primed win cashing the **larger** figure because the win banked first, a held Guard suppressing the
Timebomb reset while still paying the health, a Guard **not** suppressing a lost trick's own reset and not
being spent by it, and `incomingFrom` summing the Quarry's cash-out with its Timebomb.

**The headline spec is `pays n × n across a whole unbroken streak`** (PT-002), which replaced the
design's worked rank-sum hand and its `[0, 0, 0, 129, 0, 44]` sequence. It walks a streak from 1 to 6,
asking after each take what a hit would have cashed, and asserts the payouts are exactly
`[1, 4, 9, 16, 25, 36]`. It is the spec that would catch either term silently ceasing to climb per
trick, and the one to read first to see what this module is now for.

**DLR-92 left that spec byte-for-byte unedited** — its ticket required it — and added a parameterised
sibling beside it instead. The new `it.each` table walks the same streak at bonuses 0, 1 and 2 and asserts
`[1,4,9,16,25,36]`, `[2,8,18,32,50,72]` and `[3,12,27,48,75,108]`; the `bonus: 0` row is a deliberate
duplicate of the headline spec's numbers, so the table itself proves the new code path collapses to the old
rule. The only change to the file's pre-existing content was **one line on the shared `facts()` factory**
(`bankClimbBonus: 0`), which is what let a required field widen without touching 30 call sites.

Three further DLR-92 specs guard the boundaries rather than the arithmetic: the multiplier is pinned at
exactly `+1` across bonuses 0, 1 and 5 (the scope boundary against the twin item); a bonus on a trick that
was **not** taken adds nothing and cashes the un-bonused bank (the bonus lives inside the `isTaken` branch);
and `NaN`, `-1`, `1.5` and `Infinity` each floor to the bare `bankAdded === 1` with `bank` still finite.

The `finalTrick` fold's own trap is worth knowing before editing that spec: **a take increments both
terms before the fold computes its product**, so the fixture that cashes 4 on a taken sixth trick is
`{ bank: 1, multiplier: 1 }`, not `{ bank: 2, multiplier: 2 }`. The contract's own worked example got
this wrong and the arithmetic was corrected against the running code.
