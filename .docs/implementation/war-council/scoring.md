_Part of [War Council](README.md)._

### End-of-round scoring

`scoring.ts` is intentionally independent of the trick engine. `tricksToPoints(tricks)` is a
one-line delegation to `src/hunt/config.ts`'s `resolveStanding(tricks).multiplier` — since DLR-50 it
holds no band values of its own, so `STANDING_BANDS` is the single owner of the six printed Standing
multipliers (see [../hunt/README.md](../hunt/README.md)'s Standing band resolution section). The
function keeps its original `(tricks: number) => number` signature and, under the live table,
returns numerically identical values to the five-branch if-chain it replaced — which is why its two
UI consumers (`WarCouncilRound.tsx`, `RoundOverPanel.tsx`, see
[../war-council-ui/README.md](../war-council-ui/README.md)) needed no change. `scoreRound` applies it
directly to both sides' final `tricksWon` via a plain two-field object literal
(`{ player: tricksToPoints(tricksWon.player), cpu: tricksToPoints(tricksWon.cpu) }`) — no loop, no
cast, since there are exactly two sides.

One behavioural consequence of the migration is worth knowing: the old if-chain returned a number
for every conceivable input, including negatives and values above 13. `resolveStanding` throws a
`RangeError` outside 0–13 instead, and neither `tricksToPoints` nor `scoreHunt` catches it. That is
deliberate — `tricksWon` is initialised at `0` by `dealRound` and incremented once per trick,
bounded by `TRICKS_PER_ROUND` (13), so an out-of-range count means the round state is itself
corrupt and should fail loudly rather than silently score as `0`.

### Spoils — the summed value of captured cards (DLR-49)

`spoils(state, side, cardValue = cardBaseValue)` in `spoils.ts` is the additive term of the Hunt
scoring equation (`.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` §1/§3). It's a plain
reduce over `state.capturedCards[side]` (see [Trick resolution](trick-resolution-and-play.md)'s
`capturedCards` section for how that list fills up): each card contributes `cardValue(card.rank)`,
plus 1 if it's a Treasure (`CardRank.Treasure`, rank 7), minus 1 if it's a Poison
(`CardRank.Poison`, rank 8). `cardValue` defaults to `src/hunt/config.ts`'s `cardBaseValue` — the
first real consumer of that module's config (see [../hunt/README.md](../hunt/README.md)) — and is
never re-derived inline; the optional third parameter exists purely so a test can substitute a flat
`() => 1` to prove the summation itself is correct independent of the real per-rank values, the
same injectable-second-argument pattern `src/hunt/config.ts`'s `resolveStanding` already uses.
Since DLR-50, `spoils` has one production consumer inside this module: `scoreHunt` (below). DLR-53
added a second, outside it — the Hunt screen calls `spoils(round, PlayerSide.Player)` every render
to show the running total. It is still deliberately not wired into `scoreRound`, whose per-side
output remains what `WarCouncilRoundResult` reports.

### The Hunt outcome — `scoreHunt` and `checkDemand` (DLR-50)

`scoreHunt(state, side, cardValue?, standingTable?)` in `scoring.ts` is §1's whole equation for one
finished round, returning a `HuntScore` of `{ spoils, tricks, band, standing, score }`. It reads
`state.tricksWon[side]` for the trick count, calls `resolveStanding(tricks, standingTable)` once for
the band and its multiplier, calls `spoils(state, side, cardValue)` once for the additive term, and
multiplies the two — `score = spoils × band.multiplier`. Every field comes from that single pass
over an **already-final** `RoundState`; there is no accumulator, no loop over tricks, and no
mutation, so the function is safe to call repeatedly and meaningless to call mid-round. `standing`
and `band` are not independent lookups — `standing` is literally `band.multiplier`, so the two can
never disagree.

The two optional trailing parameters follow the injectable-argument pattern `spoils` and
`resolveStanding` already established: `cardValue` defaults to `cardBaseValue` and `standingTable`
defaults to `STANDING_BANDS`, so `scoreHunt(state, side)` means "score under the live config."
They exist so a test can hold one axis flat while varying the other — `__tests__/scoring.test.ts`
reproduces the design's full `2k × f(k)` table by passing `() => 1`, and proves the Standing table
is genuinely live by passing a copy with Humble raised to ×18 and watching `k=3` reach the same 108
ceiling `k=9` reaches under the real table. The copy is built with `.map`, so `STANDING_BANDS`
itself is never mutated.

`checkDemand(score, demand)` is a deliberately separate one-line comparison returning a
`DemandOutcome` — `'cleared'` or `'missed'`, declared as an `as const` map plus a derived union in
the same `IllegalMoveReason` shape used throughout `types.ts`. **The boundary is inclusive: a score
exactly equal to the Demand clears it.** `checkDemand` knows nothing about `scoreHunt`,
`RoundState`, or `DEMAND_CURVE` — the Demand is a plain number the caller supplies, so composing the
two (`checkDemand(scoreHunt(state, side).score, demand)`) is the caller's job. Deciding what the
Demand actually *is*, storing it, or advancing it across encounters is T9's run state, and nothing
in this module reads the (still `null`/`null`) `DEMAND_CURVE`.

Both functions gained their first production caller in DLR-53: `WarCouncilRound.tsx` composes them
exactly as described above — `checkDemand(scoreHunt(ui.round, PlayerSide.Player).score, hunt.demand)`
— and the end-of-Hunt panel renders the `HuntScore`'s parts as arithmetic before the verdict. The
Demand it supplies is `src/hunt`'s `FIXED_DEMAND`, a single placeholder target; a Demand that rises
across encounters is still T9's run state.
