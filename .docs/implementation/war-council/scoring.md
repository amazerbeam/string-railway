_Part of [War Council](README.md)._

### End-of-round scoring

`scoring.ts` is intentionally independent of the trick engine — `tricksToPoints` is a fixed lookup
over an integer 0–13 (`0–3 → 6`, `4 → 1`, `5 → 2`, `6 → 3`, `7–9 → 6`, `10–13 → 0`), and
`scoreRound` applies it directly to both sides' final `tricksWon` via a plain two-field object
literal (`{ player: tricksToPoints(tricksWon.player), cpu: tricksToPoints(tricksWon.cpu) }`) — no
loop, no cast, since there are exactly two sides. `scoring.ts` still reads its own hard-coded band
values rather than `src/hunt`'s `resolveStanding`/`STANDING_BANDS` — deliberately left duplicated
until a later ticket migrates it (see [../hunt/README.md](../hunt/README.md)'s Deferred section).

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
`spoils` is not yet called from anywhere outside its own test — no ticket has wired it into
`scoreRound`, a running score, or a UI display yet (that's a later ticket in the DLR-46 epic, see
Deferred below).
