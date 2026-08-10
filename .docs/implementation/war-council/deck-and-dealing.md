_Part of [War Council](README.md)._

### The 33-card base deck

`createDeck` in `deck.ts` builds the deck by nesting a loop over `ALL_SUITS` (`bells`, `keys`,
`moons`) inside a loop over `RANKS` (`1`–`11`), producing exactly one `Card` per (suit, rank) pair —
33 cards total. No expansion-module cards (special/goal/poison) exist anywhere in this tree.

### Shuffling and dealing

`shuffle` in `shuffle.ts` is a standard Fisher-Yates shuffle over a copy of the input array — it
never mutates its argument and never calls `Math.random()` itself; every call site supplies its own
`rng: () => number` (production wiring passes `Math.random`, tests pass a fixed/deterministic
generator), so the shuffle is reproducible wherever the caller wants it to be.

`dealRound` in `deal.ts` shuffles a fresh deck, slices the first `TRICKS_PER_ROUND` (13) cards to
the player, the next 13 to the CPU, takes the 27th card as the **decree** (whose suit becomes
`trumpSuit`), and the remaining 6 cards become the `drawPile`. The **leader** for the round's first
trick is `otherSide(dealer)` — `dealRound` takes `dealer` as a plain input parameter rather than
deciding alternation itself; how a run alternates the dealer across rounds is decided by the
caller — see [../app/README.md](../app/README.md)'s `dealerForRound` for the current placeholder,
and this module's own [Deferred](README.md#deferred--not-yet-implemented) section for what's still
open.
