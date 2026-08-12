_Part of [War Council](README.md)._

### Spoils — the summed value of a side's own captured cards (DLR-49, DLR-67)

`spoils(state, side, cardValue = cardValueFor(declaredPath(state)))` in `spoils.ts` is the additive
term of the Hunt scoring equation (`.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md`
§1/§3). It is a plain reduce over `state.capturedCards[side]` (see
[Trick resolution](trick-resolution-and-play.md)'s `capturedCards` section for how that list fills
up): each card contributes `cardValue(card.rank)` and nothing else.

**Nothing is added or subtracted on top.** DLR-49's Treasure(+1)/Poison(−1) fold was removed by
DLR-67 — see [the declaration and the Lose path](declaration-and-lose-path.md) for the reasoning and
the design citation. There is no modifier anywhere in this function.

**`cardValue` defaults off the state's own declaration**, via `cardValueFor(declaredPath(state))` —
printed rank on Win, `12 − r` on Lose (see [../hunt/scoring-tunables.md](../hunt/scoring-tunables.md)).
It stays injectable purely so a test can substitute a flat `() => 1` to prove the summation itself is
correct independent of the real per-rank values, the same pattern `resolveStanding` uses. **A value
scheme is never re-derived at a call site.**

The signature has churned twice and is worth reading in that light: DLR-49 built it single-branch
over the capture pile at `cardBaseValue`; DLR-63 added a Lose-declared-player branch over credited
cards plus a fourth `inverted` parameter; DLR-67 deleted that branch and both extra parameters,
returning it to one branch — but pointed at `cardValueFor` rather than `cardBaseValue`, so the Lose
path's inversion now reaches Spoils through the *value scheme* rather than through a *branch*.

Its production consumers are `scoreHunt` (below) and the Hunt screen, which calls it indirectly
through `scoreHunt` for both sides every render.

> **A deliberate interim.** Each side being paid for its own capture pile is not §1's design — §1
> specifies a two-way pile *swap*, which DLR-68 implements. DLR-67 chose this as a coherent
> intermediate rather than jumping straight to the swap. Do not "improve" it toward the swap
> piecemeal.

### The Hunt outcome — `scoreHunt` (DLR-50, DLR-67)

`scoreHunt(state, side, cardValue?, standingTable?)` in `scoring.ts` is §1's whole equation for one
finished round, returning a `HuntDamage` of `{ spoils, tricks, band, standing, damage }`. It reads
`state.tricksWon[side]` for the trick count, calls `resolveStanding(tricks, standingTable)` once for
the band and its multiplier, calls `spoils(state, side, cardValue)` once for the additive term, and
multiplies the two — `damage = spoils × band.multiplier`.

Every field comes from a single pass over an **already-final** `RoundState`; there is no accumulator,
no loop over tricks, and no mutation, so the function is safe to call repeatedly and meaningless to
call mid-round. `standing` and `band` are not independent lookups — `standing` is literally
`band.multiplier`, so the two can never disagree.

**Both optional terms now default off the state's own declaration** (DLR-67):
`cardValue = cardValueFor(declaredPath(state))` and
`standingTable = standingTableFor(declaredPath(state))`. They defaulted to the base card value and
the Win table until then, which was only correct while the Demand made the player's side the sole
thing being scored. This is a change the compiler could not catch — the *types* did not move, only
the values — which is why `__tests__/scoring.test.ts` pins the defaults by comparing a no-argument
call against an explicit one, `it.each` over both paths, at a 4-trick split where the two tables
genuinely disagree (Win ×2, Lose ×5). A default re-pointed at the wrong table fails loudly there.

They stay injectable so a test can hold one axis flat while varying the other.

**Both sides are scored now.** DLR-67's screen calls `scoreHunt` once per side and derives a
`Record<PlayerSide, HuntDamage>` from it, feeding the same record to the end panel and to
`WarCouncilRoundResult.damage` — so the number the player reads and the number the mount reports
cannot diverge. Until then only the player's side was ever computed, because the design scored the
player against a Demand rather than the Quarry.

#### What DLR-67 deleted from this file

- **`tricksToPoints` and `scoreRound`** — the end-of-round band lookup and its two-sided wrapper.
  They existed to feed `WarCouncilRoundResult`, which now carries `scoreHunt`'s damage per side
  instead.
- **`checkDemand` and `DemandOutcome`** — the inclusive comparison of a score against a target,
  returning `'cleared'` | `'missed'`. §1 retires the Demand outright: there is no threshold, so
  there is no verdict.

The rename that came with them: `HuntScore` became `HuntDamage` and its `score` field became
`damage`, adopting §1's vocabulary ("**damage** — a side's card value × its Standing for the Hunt,
applied to the other side once at the end"). The rename stops deliberately short of `scoreHunt`
itself and of the `Spoils` term, both of which DLR-68 replaces outright as part of a signature change
it owns — so for one ticket a function called `scoreHunt` returns a `HuntDamage` whose first field is
still `spoils`. That inconsistency is chosen, not overlooked.

### An inherited numeric hazard

`resolveStanding` throws a `RangeError` outside 0–13 rather than returning a number for every
conceivable input, and `scoreHunt` does not catch it. That is deliberate — `tricksWon` is initialised
at `0` by `dealRound` and incremented once per trick, bounded by `TRICKS_PER_ROUND` (13), so an
out-of-range count means the round state is itself corrupt and should fail loudly rather than
silently score as `0`.

Two related properties worth not breaking: `spoils` is a sum over a possibly-empty array with an
initial `0`, so an empty capture pile returns `0` and never `NaN`; and **Standing multipliers are not
all integers** — both shipped tables carry a ×0.5 band — so any readout, format string or test
pattern that assumes an integer multiplier is wrong. A spec written with a bare `\d+` against a
multiplier's `aria-label` was corrected on DLR-67 for exactly this reason.
