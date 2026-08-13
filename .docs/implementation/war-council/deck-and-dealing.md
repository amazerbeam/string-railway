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

`dealRound` in `deal.ts` shuffles a fresh deck, slices the first `HAND_SIZE` (6) cards to the player
and the next 6 to the CPU, takes the 13th card as the **decree** (whose suit becomes `trumpSuit`),
and the remaining **20** cards become the `drawPile`. The deck arithmetic is `33 − 6 − 6 = 21`, of
which the decree takes one.

> **DLR-80 changed the hand from 13 to 6.** `HAND_SIZE` in `src/hunt/config.ts` replaced the old
> `TRICKS_PER_ROUND` constant, which lived in this module's `types.ts`. It is deliberately **one**
> constant serving both the hand size and the trick count: every card dealt is played, so the two
> cannot differ, and two constants that must be equal is a bug waiting for one of them to be edited.
> The draw pile grew from 6 cards to 20 as a consequence.

**Skulls are assigned here too** (DLR-80): `dealRound` calls `assignSkulls(cpuHand, rng)` with the
**same injected `rng`** it shuffled with, so a seeded deal reproduces its skulls as well as its
cards, and writes the result to `skulledCards`. Only the Quarry's dealt hand is skulled — a card the
Woodcutter later draws from the pile arrives unskulled, because the density is a property of the
deal. See [skulls](skulls.md). `bank` and `multiplier` are seeded at 0 and `lastResolution` at
`null`.

The **leader** for the hand's first trick is `otherSide(dealer)` — `dealRound` takes `dealer` as a
plain input parameter rather than deciding alternation itself; how a run alternates the dealer across
hands is decided by the caller — see [../app/README.md](../app/README.md)'s `dealerForRound` for the
current placeholder, and this module's own
[Deferred](README.md#deferred--not-yet-implemented) section for what's still open.
