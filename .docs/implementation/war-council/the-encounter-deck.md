_Part of [War Council](README.md)._

### The deck outlives the hand that deals from it (DLR-123)

Until 2026-08-24 `dealRound` built a fresh `createDeck()` and shuffled it on **every** hand, so a
read the player earned in one hand was worth nothing in the next. `encounterDeck.ts` moves the
deck's lifetime from **hand-scoped to encounter-scoped**: one shuffled 33 is dealt from repeatedly,
cards resolved to tricks accumulate in a second pile that is never dealt from, and only when the
draw pile can no longer cover a whole deal does everything fold back together and shuffle once.

The module is four exports and one interface, all pure and all in the lint-enforced pure core:

| Export                 | What it is                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `CARDS_PER_DEAL`       | `HAND_SIZE * 2 + 1` — what one hand costs, and therefore the reshuffle threshold          |
| `EncounterDeck`        | `{ drawPile, spentPile }` — what one encounter carries between its hands                  |
| `FRESH_ENCOUNTER_DECK` | both piles empty; the "new encounter" value, shared and only ever spread from             |
| `isFreshDeck`          | the one statement of what "fresh" means, so `dealRound`'s branch and a spec cannot differ |
| `closeHand(state)`     | the hand-boundary fold — every card not in the draw pile joins the spent pile             |
| `dealPileFor(deck,rng)`| the reshuffle rule — returns `{ drawPile, reshuffled }`                                   |

`CARDS_PER_DEAL` is **derived, never written as `13`**. `HAND_SIZE` is `6` in `src/hunt/config.ts`,
so a deal takes 6 + 6 + 1 = 13. It is not a configuration dial anyone has to keep in step with the
hand size: it is what a deal costs, so it is the threshold by definition rather than by choice.

### The cycle — 20, 7, reshuffle, 20

A hand costs 13 of the 33. That produces a fixed four-step cadence, and `deckCycle.test.ts` observes
it rather than asserting it in prose:

| Hand of the fight | Draw pile after dealing | Spent pile at hand's end | Reshuffled at this deal? |
| ----------------- | ----------------------- | ------------------------ | ------------------------ |
| 1                 | **20**                  | 13                       | no                       |
| 2                 | **7**                   | 26                       | no                       |
| 3                 | **20**                  | 13                       | **yes** — 26 + 7 shuffled |
| 4                 | **7**                   | 26                       | no                       |

The spec's observed sequences are `draws = [20, 7, 20, 7]` and
`reshuffles = [false, false, true, false]`. So there is **exactly one reshuffle per two-hand cycle,
and never on a fight's first hand** — a fresh encounter always opens on a shuffled 33.

An encounter runs about 3.3 hands, so a typical fight sees exactly one reshuffle: what the player
has tracked spikes across hand two and is wiped once, mid-fight.

### `closeHand` — the total rule at the hand boundary

`closeHand(state)` returns `{ drawPile: state.drawPile, spentPile: [...state.spentPile, decree,
both hands, every card still in `currentTrick`] }`. That is **one** rule, not three coordinated
special cases, and it is what makes a hand cost exactly 13 whatever happened during it:

- the unspent **decree** goes with it, which is the ticket's own AC4;
- a **Fox exchange** needs no clause — whatever card the Fox left in the decree slot is what gets
  spent;
- a hand **ended early** by a mid-hand cash-out or a health bar emptying still folds the cards
  still held;
- all 33 are conserved **by construction**, because the two returned piles are exactly the input
  state's cards repartitioned.

The driver calls it at exactly one place — `App.tsx`'s `handleComplete`, as
`dealNextHand(recorded, closeHand(result.finalState))`. Every other path into a deal passes
`FRESH_ENCOUNTER_DECK`, which is how the reset at every encounter boundary falls out structurally
rather than needing a rule of its own.

### `dealPileFor` — when the reshuffle happens, and what goes into it

```
drawPile.length >= CARDS_PER_DEAL  →  { drawPile, reshuffled: false }   — deal on from here
otherwise                          →  { shuffle(spent ++ draw, rng), reshuffled: true }
```

**The leftover draw pile is folded _into_ the shuffle, not left on top of it.** Discarding it would
lose cards from a 33-card deck; stacking it on top would be a second rule about ordering with no
observable difference, since those cards were never seen either way. Folding conserves all 33 in one
sentence and makes "a full reset of what the player knows" literally true.

It **throws** a `RangeError` naming both pile sizes and the shortfall when the two piles together
cannot cover a deal. That is unreachable through the shipped driver — `closeHand` conserves all 33,
so the draw pile at a hand's start is exactly 33, 20 or 7, and 7 reshuffles back to 33 — and it is
kept for `shieldHeartsForTier`'s stated reason: the guard is not dead code, it is the check that
makes the guarantee hold. It sits on a path no event handler reaches, deliberately, because `src/`
has no `ErrorBoundary` (DLR-131) and an escaping throw would blank the screen.

### The draw pile cannot run out mid-hand, and that is why one check at the deal is enough

`drawPile.length` is **invariant for the life of a hand**. `applyWoodcutterDraw` returns a card for
every card it takes, and `applyDiscard` appends the swapped cards to the pile's back as it takes the
same number off its front (see [the discard](the-discard.md)). Nothing else touches the pile at all.

So the only moment a reshuffle can ever be needed is the deal — which is exactly what "one reshuffle
per cycle" means, and why `dealPileFor` is called from `dealRound` and nowhere else. A spec pins the
invariant, because a future mutator that broke the take/return pairing would silently reintroduce a
mid-hand exhaustion that nothing else in the engine is defended against.

### The spent pile grows at exactly one place

`playCard.ts`'s trick-complete return appends the completed trick's two cards:
`spentPile: [...next.spentPile, completedTrick[0].card, completedTrick[1].card]`. That is the
module's only writer besides `dealRound` (which seeds it from the carried deck) — so the pile grows
when a trick resolves and cannot grow at any other time.

It ticks at the **resolution**, not when the player dismisses the trick well, so the two cards are
counted while still visible in `TrickWell`. The count reflects state; a count that lagged the state
would be a second source of truth.

> **The player's swap and the Woodcutter's bury do NOT go here.** Both still go to the **bottom of
> the draw pile**, so those cards stay unseen — neither `discard.ts` nor `abilities.ts` changed a
> line for DLR-123. "Discard" continues to mean the player's swap everywhere in this codebase; the
> new pile is the **spent pile**. See [the discard](the-discard.md).

### What `dealRound` does with a carried deck

`dealRound(dealer, rng, deck?)` takes the deck **trailing and optional**, defaulted to
`FRESH_ENCOUNTER_DECK`. An absent or empty deck **is** a new encounter, so every pre-existing
two-argument call still means exactly what it meant — a fresh 33 — and no existing spec had to be
rewritten to say what it already said.

Inside, the branch is one expression: a fresh deck shuffles `createDeck()`; otherwise `dealPileFor`
decides whether to reshuffle. Then `spentPile` is written as `opening.reshuffled ? [] : deck.spentPile`
— the pile empties **only** at a reshuffle, and the new-encounter case needs no branch of its own
because `FRESH_ENCOUNTER_DECK.spentPile` is already `[]`.

`reshuffled` is written once here and is **hand-scoped**: the next deal rewrites it, so the felt's
notice cannot persist into a hand that was not reshuffled.

Two things deliberately do **not** cross the hand boundary on a card. **Timebomb marks** stay
hand-scoped (`primedCards` is seeded `[]` at every deal), because a mark that rode a card into the
spent pile and back out through a reshuffle would be an invisible mark on a face-down card. And
**skulls are re-rolled, never remembered** — `assignSkulls` runs per-deal against the Quarry's six
newly dealt cards, so a card that carried a skull in hand one and returns after a reshuffle is
rolled from scratch.

### Determinism — seeding the deal seeds the reshuffle

The reshuffle is exactly where a `Math.random()` gets added by reflex, with nothing to catch it. It
cannot happen here: the reshuffle runs **inside** `dealRound`, under the same injected generator the
deal uses, so there is no second RNG to remember to seed.

The whole path is `App.tsx` → `src/app/handDeal.ts`'s `dealHand` →
`dealSeedFor(run.runSeed, run.encounterIndex, run.handOfFight)` in `src/hunt/seededRng.ts` →
`createSeededRng` (mulberry32) → `dealRound` → `shuffle` and `assignSkulls`. `dealSeedFor` is
`mixSeed` over the triple and mirrors `slotMachine.ts`'s `slotSeedFor` field for field; the triple is
unique per hand of a run because `encounterIndex` separates the fights and `handOfFight` the hands
within one.

Before DLR-123 the driver handed `dealRound` a bare `Math.random`, so **no deal and no reshuffle in
this game was ever reproducible**. `src/App.tsx` now has exactly three `Math.random()` calls, all
`Math.floor(Math.random() * 0x100000000)` feeding `startRun`'s seed, and **none of them reaches a
deal**. The pure-core ESLint override on `src/warCouncil/**` and `src/hunt/**` makes reintroducing
one a lint failure rather than a silent regression.
