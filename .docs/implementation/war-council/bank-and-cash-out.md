Part of [War Council](README.md).

# The bank, the streak, and the cash-out

`bank.ts` (DLR-80) is the whole of the game's scoring loop in one pure module. It replaced
`scoring.ts`, `spoils.ts` and `declareHunt.ts`, which were deleted outright — with them went Spoils,
the capture piles, both Standing multiplier tables, rank inversion, the Win/Lose declaration, damage
rounding, and the once-per-Hunt damage application.

Nothing here imports React or touches the DOM; it imports only `DAMAGE_PER_HIT`, `DuelSide` and
`IncomingDamage` from `src/hunt/`, plus `TrickCard` from its own module's types.

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

`isTaken(outcome)` answers whether an outcome **banks the cards** or **takes damage**. It reads from a
total `Record<TrickOutcome, boolean>` rather than comparing against two members, so adding a fifth
outcome becomes a missing-property compile error rather than a silently-false default.

The pairing is exact: `CleanWin` and `Dodge` are identical in every respect but their name, as are
`CleanLoss` and `SkullWin`. The names survive only so the UI can say *which* rule fired.

## The whole rule — `resolveTrickBank`

```ts
resolveTrickBank(before, trickCards, playerWon, skullTrick, finalTrick): TrickResolution
```

One call decides everything a trick does. `before` is the running `{ bank, multiplier }`; the return
is a `TrickResolution` carrying the new pair plus what the trick did to get there.

**On a taken trick** — both cards' **printed ranks** are added to the bank (`bankAdded`), and the
multiplier increments. No damage in either direction. There is no card-value function anywhere in this
module: a card is worth `card.rank`, read directly, and the rank-inversion path that used to sit
between the two is gone.

**On a hit** — `cashOut` becomes `bank × multiplier`, `damageToPlayer` becomes `DAMAGE_PER_HIT`, and
both running figures reset to zero.

### Why the end-of-hand cash-out folds into the sixth trick

The sixth trick's forced cash-out reads like a second event, and modelling it as one would have meant
two `applyDamage` calls on trick 6, an ordering question between them, and a guard for "the first one
already resolved the encounter". `finalTrick` folds it into the same resolution instead.

That is safe because **exactly one of the two cash-outs can ever be non-zero**, and the argument is
worth stating because it is what the design rests on:

- If the trick was a **hit**, it has already set `bank` and `multiplier` to zero, so the subsequent
  end-of-hand cash of `0 × 0` is zero.
- If the trick was **taken**, `bankAdded` is the sum of two card ranks and every rank is at least 1 —
  so the bank is non-zero and there is exactly one bank to cash.

The result is **one damage application per trick**, with no ordering question, and `cashedAtHandEnd`
recording which rule actually paid out so the UI can still say why. It is display-only; the two can
never both be non-zero.

### Numeric safety

There is **no division anywhere in this module**. The bank is a sum of integer ranks, the multiplier
an increment, and the cash-out one multiplication of two non-negative integers — so the classic `NaN`
source is absent, no epsilon is needed, and none is invented. `applyDamage`'s own non-finite/negative
guard downstream is therefore a backstop against a bad caller, not against this arithmetic.

The rounding rule the old equation needed is gone with the ×0.5 multiplier bands that produced
fractional products.

## The one seat → side crossing — `incomingFrom`

```ts
incomingFrom(resolution): IncomingDamage
```

The program's only `PlayerSide` → `DuelSide` translation, replacing the retired `duelSideDamage`. It
is keyed by the side the damage is **applied to**: the player eats `damageToPlayer`, the Quarry eats
`cashOut`.

Existing as one function is the point. A call site building this record by hand is one transposition
away from depleting the wrong bar — which would type-check cleanly and produce plausible numbers
indefinitely, because both fields are non-negative integers and neither bar can tell whose damage it
received.

## Where it is called

`playCard.ts` calls it once, when a trick completes, and writes the result onto
`RoundState.lastResolution`. `playCard` decides nothing about the outcome itself — it reports who won
(`resolveTrickWinner`) and whether the trick was skulled (`trickIsSkulled`), and hands both to
`resolveTrickBank`.

The rejected alternative was computing the outcome in the reducer from a before/after `RoundState`
diff, which is how the trick's *winner* used to be re-derived. That would have put the game's central
rule in a file that needs a fabricated state pair to test, and it would have made the outcome a
**second** derivation that could disagree with the bank the engine had already updated.

`lastResolution` is cleared to `null` on a lead, so a held resolution cannot outlive the trick it
describes and be shown against the next one.

## What the tests pin

`bank.test.ts` covers each acceptance criterion by name, both `finalTrick` branches (including the
"cashes once, not twice" case), and reproduces the design's own worked six-trick hand end to end,
asserting the exact per-trick cash-out sequence `[0, 0, 0, 129, 0, 44]`. That last spec is the one
that would catch a change to the fold-in argument above.
