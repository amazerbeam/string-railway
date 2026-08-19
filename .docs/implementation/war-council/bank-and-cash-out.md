Part of [War Council](README.md).

# The bank, the streak, and the cash-out

`bank.ts` (DLR-80) is the whole of the game's scoring loop in one pure module. It replaced
`scoring.ts`, `spoils.ts` and `declareHunt.ts`, which were deleted outright — with them went Spoils,
the capture piles, both Standing multiplier tables, rank inversion, the Win/Lose declaration, damage
rounding, and the once-per-Hunt damage application.

**PT-002 changed what the bank counts.** It banked both cards' printed ranks until 2026-08-14; it now
banks **1 per trick taken**, so both terms of the cash-out equation are the streak length and a
streak of _n_ cashes exactly `n × n`.

**DLR-91 then gave the reset a second trigger** — poison owed to the player at this trick — reaching the
**same** branch a lost trick reaches rather than getting a rule of its own. The four outcomes, the
`finalTrick` fold and `incomingFrom`'s job are all still as DLR-80 left them; what moved is that
`damageToPlayer` is now computed outside the cash-out branch and `incomingFrom` sums two sources into
the Quarry's total.

Nothing here imports React or touches the DOM; it imports only `DAMAGE_PER_HIT`, `DuelSide` and
`IncomingDamage` from `src/hunt/`. **It reads no card at all** — PT-002 removed the last one, and
with it the `TrickCard` import.

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
// TrickFacts = { playerWon, skullTrick, finalTrick, envenomTrick,
//                poisonToPlayer, poisonToQuarry, poisonGuarded }   // the last three: DLR-91
```

The three DLR-91 facts are **the poison owed from an earlier trick, being paid at this one** — a
`Damage` per side, `0` when nothing is owed — plus whether a Poison Guard is held. They are handed in
rather than fetched: the pending queue lives on `EncounterState` in `src/hunt/`, `src/hunt/` must not
learn what a `RoundState` is, and the reducer is the one place that holds both. See
[the delayed hit](../hunt/envenom-and-the-delayed-hit.md).

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
nothing — see [the Envenom mark](the-envenom-mark.md) for why it is keyed on the *outcome* rather than
on which side won:

```ts
const replaced = trick.envenomTrick && outcome === TrickOutcome.CleanLoss
```

When `replaced` is true the hit half below is skipped entirely, so `damageToPlayer` stays 0, `cashOut`
stays 0, and `bank`/`multiplier` pass through untouched rather than resetting. `TrickResolution` also
gained `envenomTarget: DuelSide | null` — the side owed the delayed hit, crossed to `DuelSide` here
because this module is already the one place that crossing happens.

**On a taken trick** — `bankAdded` is **1**, the bank climbs by it, and the multiplier increments. No
damage in either direction from the trick itself.

**On a hit** — `cashOut` becomes `bank × multiplier`, `damageToPlayer` picks up `DAMAGE_PER_HIT`, and
both running figures reset to zero.

### Two sources of a hit since DLR-91, one branch

```ts
const trickHit = !isTaken(outcome) && !replaced          // the pre-existing one
const poisonResets = trick.poisonToPlayer > 0 && !trick.poisonGuarded  // the new one

// Owed whether or not the streak resets: a Guard buys back the streak, never the health.
const damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) + trick.poisonToPlayer

if (trickHit || poisonResets) {
  cashOut = bank * multiplier
  bank = 0
  multiplier = 0
}
```

Three things about that shape are the decisions, and each was chosen against a plausible alternative:

- **Poison reaches the same branch rather than a branch of its own.** That is what makes "poison
  behaves like any other damage" true *in code* instead of asserted in a comment — one statement of
  what a reset is, so the two triggers cannot drift into meaning different things.
- **`damageToPlayer` moved out of the cash-out branch.** The health is owed whether or not the streak
  resets, which is what lets a held Guard suppress the reset without also cancelling the hit. The
  arithmetic is `2` on a trick the player won while poisoned and `3` on one they also lost — that sum is
  the whole of it, with no third case.
- **A win banks first, then the poison cashes it.** The `isTaken` climb above runs before this branch,
  so a streak of 4 winning trick 5 while poisoned cashes **25**, not 16. The alternative — poison landing
  before the climb — is a one-line change and a different feel; this reading was chosen because the trick
  *was* won so it should count, and because the streak visibly climbing and then dying is what makes the
  poison legible as the cause. It is the one sub-decision the developer was not asked about.

`TrickResolution` gained two fields with it: **`poisonToQuarry`**, carried through so `incomingFrom` can
sum it, and **`poisonGuardSpent`** (`poisonToPlayer > 0 && poisonGuarded`), which reports that the Guard
actually fired so the reducer can flip the run's flag rather than re-deriving "did the Guard matter" —
that would be a second reading of one rule. See [Poison Guard](../hunt/poison-guard.md).

### Why `n × n` falls out of the two counters (PT-002)

The equation was never edited. Because a taken trick now climbs **both** terms by exactly 1, the two
are equal for as long as a streak runs — so `bank × multiplier` on a streak of length _n_ is `n × n`:
**1, 4, 9, 16, 25, 36** across a six-trick hand. The compounding is the multiplier's, as before; what
changed is that the additive term stopped being a source of variance the player could not control.

The `1` is a **literal, not a config key**, and that is deliberate. 1 is what counting a trick means,
and a later item granting bonus bank would add to `bank` rather than redefine a trick's worth. The
comment above it in `bank.ts` says so, so the next reader does not "fix" it into configuration.

**`bank` and `multiplier` remain two independent fields**, even though they now hold the same number
for the whole of a streak. Collapsing them into one counter would have been the obvious
simplification and was rejected: the planned one-time-use **"+1 ×"** item needs a term the shop can
push without touching the trick count, and the two-field shape is what keeps that buildable without
restructuring this function.

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
- If the trick was **taken**, `bankAdded` is 1 — so the bank is non-zero and there is exactly one
  bank to cash. (Before PT-002 the same step read "the sum of two card ranks, and every rank is at
  least 1". The argument survived the change to a trick count unaltered, because both forms are
  strictly positive.)

The result is **one damage application per trick**, with no ordering question, and `cashedAtHandEnd`
recording which rule actually paid out so the UI can still say why. It is display-only; the two can
never both be non-zero.

### Numeric safety

There is **no division anywhere in this module**, and DLR-91 added none. Both figures are integers incremented by 1, and the
cash-out is one multiplication of two non-negative integers — so the classic `NaN` source is absent,
no epsilon is needed, and none is invented. `applyDamage`'s own non-finite/negative guard downstream
is therefore a backstop against a bad caller, not against this arithmetic.

PT-002 strictly narrowed the range rather than widening it: the largest cash-out producible is now
**36** — a six-trick unbroken streak — where the rank sum could reach the high hundreds. Nothing here
approaches the safe-integer limit from either direction.

DLR-91's additions are three property reads and a boolean per resolved trick, at most six tricks a
hand. `poisonToPlayer > 0` is `false` for `NaN`, so a poisoned figure **fails safe by not firing the
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
`cashOut` **plus any poison paid at this trick** (DLR-91).

Summing the Quarry's two sources *here* rather than at the call site is what keeps this the only
crossing. A reducer that added the poison itself after receiving the record would be a second place
that decides which bar a figure depletes.

Existing as one function is the point. A call site building this record by hand is one transposition
away from depleting the wrong bar — which would type-check cleanly and produce plausible numbers
indefinitely, because both fields are non-negative integers and neither bar can tell whose damage it
received.

## Where it is called

`playCard.ts` calls it once, when a trick completes, and writes the result onto
`RoundState.lastResolution`. `playCard` decides nothing about the outcome itself — it reports who won
(`resolveTrickWinner`), whether the trick was skulled (`trickIsSkulled`) and whether it carried a mark
(`trickIsEnvenomed`), and forwards the three poison facts it was handed through `PlayCardOptions`. All
seven go into the `TrickFacts` literal; every rule stays here.

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

`bank.test.ts` also pins DLR-91's additions: the 2-or-3 arithmetic on a poisoned trick won and lost, a
poisoned win cashing the **larger** figure because the win banked first, a held Guard suppressing the
poison reset while still paying the health, a Guard **not** suppressing a lost trick's own reset and not
being spent by it, and `incomingFrom` summing the Quarry's cash-out with its poison.

**The headline spec is `pays n × n across a whole unbroken streak`** (PT-002), which replaced the
design's worked rank-sum hand and its `[0, 0, 0, 129, 0, 44]` sequence. It walks a streak from 1 to 6,
asking after each take what a hit would have cashed, and asserts the payouts are exactly
`[1, 4, 9, 16, 25, 36]`. It is the spec that would catch either term silently ceasing to climb per
trick, and the one to read first to see what this module is now for.

The `finalTrick` fold's own trap is worth knowing before editing that spec: **a take increments both
terms before the fold computes its product**, so the fixture that cashes 4 on a taken sixth trick is
`{ bank: 1, multiplier: 1 }`, not `{ bank: 2, multiplier: 2 }`. The contract's own worked example got
this wrong and the arithmetic was corrected against the running code.
