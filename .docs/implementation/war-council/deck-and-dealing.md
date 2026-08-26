_Part of [War Council](README.md)._

### The 33-card base deck

`createDeck` in `deck.ts` builds the deck by nesting a loop over `ALL_SUITS` (`bells`, `keys`,
`moons`) inside a loop over `RANKS` (`1`–`11`), producing exactly one `Card` per (suit, rank) pair —
33 cards total. No expansion-module cards (special/goal/Timebomb) exist anywhere in this tree.

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
> constant serving both the hand size and the trick count, and the draw pile grew from 6 cards to 20
> as a consequence.
>
> **DLR-146 changed what that one constant means, and it no longer means "every card dealt is
> played".** The player is refilled to `PLAYER_HAND_FLOOR` as tricks resolve, so they see more than
> `HAND_SIZE` cards and end a hand still holding some. `HAND_SIZE` is still one constant rather than
> two because it is the **Quarry's** hand size and the trick count, and those two genuinely cannot
> differ — the Quarry never refills, so the hand ends exactly when its last card does. Two constants
> that must be equal is still a bug waiting for one of them to be edited.

`dealRound` also seeds **`drawSeed`** (DLR-146) from the same generator, which is what makes a
mid-hand reshuffle reproducible from the run seed. See
[the hand refill](the-hand-refill.md).

> **The 20-card remainder is no longer a fixed figure for the life of the hand.** The player's
> per-trick refill takes cards off it, so at today's constants a hand costs 16 rather than 13 and the
> pile can run short mid-hand — which `drawCards` handles by folding the spent pile back in. See
> [the encounter deck](the-encounter-deck.md).

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
