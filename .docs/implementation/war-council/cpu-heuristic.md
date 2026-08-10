_Part of [War Council](README.md)._

### The CPU heuristic (`cpuPlayer.ts`, SCRUM-26)

Five small pure functions, none of which ever invents a value outside what the engine itself
already treats as legal:

- **`chooseCpuCard(state, side)`** — card selection only. Reads `legalMoves(state, side)` and never
  re-derives legality itself. If `currentTrick` is empty (leading), picks the lowest-ranked legal
  card (tie-broken by `ALL_SUITS` declaration order — Bells < Keys < Moons — via an internal
  `compareCards`/`lowestCard` pair). If a card has already been led (following), filters
  `legalMoves()`'s output down to the cards that would win the trick — evaluated by calling the
  engine's own `resolveTrickWinner` for each candidate, never a re-implemented trump/suit
  comparison — and plays the lowest of those; if none would win, ducks with the lowest legal card
  at all.
- **`chooseCpuFoxChoice(handAfterFox, trumpSuit)`** — exchanges the Fox for the lowest card of the
  hand's most-held suit whenever that suit isn't already trump (concentrates trump in the CPU's
  strongest suit); declines if the strongest suit is already trump, or if the hand is empty (the
  Fox was the side's last card).
- **`chooseCpuWoodcutterChoice(handWithDrawn)`** — always discards the lowest-ranked card of the
  hand after the draw.
- **`chooseCpuMove(state, side)`** — composes the above: picks the card, then — only if its rank is
  `CardRank.Fox` or `CardRank.Woodcutter` — computes the matching ability choice, building the
  candidate hand the exact same way `playCard.ts` does internally (`[...handAfter, drawPile[0]]`
  for Woodcutter), so the two stay in lockstep. Returns a `CpuMove` (`{ card, choice? }`) that
  `playCard`/`submitWarCouncilCard` always accepts.

`chooseCpuMove` is **legality-generic per `PlayerSide`** — nothing in it assumes `side === Cpu` — so
the same function drives either side's turn. This is how the module's own test suite exercises "a
range of hands" for AC4 (60 seeded full 13-trick rounds via `dealRound` + `playCard`, alternating
which side is dealt as `Player`/`Cpu` by seed parity) without a second, throwaway decision function
for the non-CPU side.

The heuristic has **no awareness of any run-level state** — every decision is a pure function of the
current `RoundState` alone, by design (see [Deferred](README.md#deferred--not-yet-implemented)).
