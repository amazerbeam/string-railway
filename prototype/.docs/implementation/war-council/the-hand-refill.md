_Part of [War Council](README.md)._

### The player's hand is topped back up as each trick resolves (DLR-146)

Until 2026-08-26 a hand was six cards played over six tricks, so the hand narrowed as it went —
**6, 5, 4, 3, 2, 1** cards to choose from. The last two tricks were not decisions. The player's hand
is now refilled to a floor of **`PLAYER_HAND_FLOOR`** cards at each trick's resolution, so the widths
run **6, 5, 4, 4, 4, 4** and every trick after the third is still a choice.

`PLAYER_HAND_FLOOR` is `4` in `src/hunt/config.ts`, re-exported from `src/hunt/index.ts` beside
`HAND_SIZE`. It is **provisional** — chosen to be played rather than derived — and setting it to `0`
restores pre-DLR-146 behaviour exactly, with no other edit anywhere in `src/` or in the suite.

### Where the refill sits, and why each part of the ordering is load-bearing

The whole feature is one expression at the end of `playCard`'s trick-complete branch in
`playCard.ts`. Three properties of *where* it sits are rules rather than style:

- **After `resolveTrickBank`.** `buffTrickFactsFor` is handed `next.hands[PlayerSide.Player]` as
  "the hand at hand's end", which is what the Keepsake condition's `remainingSuits` reads. Refilling
  first would feed that evaluation cards the player had not been dealt when the trick resolved, so a
  buff's payout would change as a side effect of this ticket.
- **Never on the lead.** `playCard`'s one-card path returns before this point, so a drawn card
  cannot enter the trick already in progress.
- **Not on the final trick.** When `finalTrick` is true the hand is over, so a card drawn there
  could never be played — it would only pull the draw pile a card further down before `closeHand`
  swept it back. This is the one place the ticket reads its own acceptance criterion ("at each
  trick's resolution") non-literally, and it is recorded as such in the contract's Assumptions.

**The Quarry is satisfied by construction, not by a guard.** The refill names `PlayerSide.Player`
directly; the Quarry is simply never passed to it, so there is no branch that could be inverted. The
Quarry is still dealt `HAND_SIZE`, plays `HAND_SIZE`, and draws nothing.

**The floor's off switch is the absence of a code path, not a flag.** The refill is a single
`playerHand.length >= floor` test, so at `0` it is unreachable — there is no second path for a
revert to miss, and no companion `REFILL_ENABLED` boolean that must be kept in step with the number.
Every spec this ticket wrote or rewrote derives its expectations from `HAND_SIZE` and
`PLAYER_HAND_FLOOR` rather than pinning a figure measured at `4`, so the whole suite stays green at
`0` as well.

`PlayCardOptions.handFloor?: number` (`legalMoves.ts`) exists only so both values can be pinned
through the real code path. **Absent means `PLAYER_HAND_FLOOR`**, so no production call site passes
it and the constant remains the single dial; the alternative was mocking `../hunt`, a lint-enforced
pure module, in order to test it.

### `drawCards` — the one way a card leaves the draw pile mid-hand

The refill is the first thing in the game's history that **shortens the draw pile within a hand**.
That retires the invariant the rest of the engine was quietly relying on (see
[the encounter deck](the-encounter-deck.md)), so rather than guarding each reader separately,
`encounterDeck.ts` gained one primitive and **five sites now route through it**:

| Site | File | What it was before |
| ---- | ---- | ------------------ |
| The refill | `playCard.ts` | new |
| `applyDiscard` | `discard.ts` | `state.drawPile.slice(0, discarded.length)` |
| The Woodcutter's draw | `abilities.ts` | `const [drawn, ...rest] = state.drawPile` — `undefined` into a hand on an empty pile |
| The Woodcutter-discard **preview** | `playCard.ts` | `drawPile[0]`, which could be `undefined` |
| `chooseCpuMove`'s Woodcutter **preview** | `cpuPlayer.ts` | `drawPile[0]`, same |

(The last two sites went with DLR-163's rewrite — the Woodcutter takes no choice any more, so
neither preview exists. `applyQuarrySwap` inherited the first site's draw, through `drawCards`.)

```ts
export function drawCards(source: DrawSource, count: number): DrawResult
```

`DrawSource` is **the three fields a draw needs and nothing else** — `drawPile`, `spentPile`,
`drawSeed` — the same `DiscardStock` discipline that keeps this module from learning the shape of
its callers. A `RoundState` satisfies it structurally, which is why every call site passes the state
itself. `DrawResult` returns the cards drawn plus those three fields as they now stand, so it can be
spread straight onto a state.

The rule is:

```
drawPile.length >= count  →  take from the FRONT of drawPile
otherwise                 →  take what drawPile has, rebuild it by shuffling the spent pile
                             under createSeededRng(drawSeed), take the rest, empty spentPile,
                             advance drawSeed
```

**The leftover front cards keep their place at the head of the draw** rather than being folded into
the shuffle — folding them in would reorder cards the caller has effectively already been handed.
This is the opposite choice from `dealPileFor`, which *does* fold its leftovers in, and the two
differ because `dealPileFor`'s leftovers have not been drawn yet.

**It does not throw on an exhausted deck.** When both piles together are short it returns **fewer
cards than asked**, with the shortfall visible in `drawn.length` — the acceptance criterion's
"no-op rather than a throw" as the degenerate case of a general rule, rather than a special case.
It *does* throw a `RangeError` on a negative or non-finite `count`, the guard discipline
`quickKillPayout` and `flaskHealAmount` already set: a `NaN` count would slice to an empty array and
silently draw nothing.

`DrawResult.reshuffled` reports whether the fold happened, so a spec can pin it. It is deliberately
**not** written to `RoundState.reshuffled`, which means "this hand was DEALT from a reshuffle" and is
read by the felt's notice — writing it mid-hand would make that notice describe something it does
not mean.

### `drawSeed` — how a mid-hand reshuffle stays reproducible

`src/hunt/` and `src/warCouncil/` are lint-enforced free of `Math.random()`, because DLR-130's
headless simulator depends on a run being reproducible from its seed. A mid-hand reshuffle needs
randomness, and threading an `Rng` parameter through `playCard` would touch every call site in the
app, the CPU player, the simulator and thirty-odd specs.

So `RoundState` gained one required field, `drawSeed: number`:

- **Written once by `dealRound`**, as `Math.floor(rng() * 0x100000000)` off the deal's own
  generator — so it inherits `dealSeedFor(runSeed, encounterIndex, handOfFight)`'s
  run/encounter/hand uniqueness for free.
- **Replaced by `mixSeed(drawSeed, spentPile.length)`** each time a reshuffle consumes it, so two
  reshuffles inside one hand cannot repeat each other's order.
- **A plain integer, not an `Rng` closure**, deliberately: `RoundState` is immutable, plain,
  serialisable data and every function in this tree takes `rng` explicitly. Deriving the seed from
  observable counters alone was rejected because the resulting permutation would not vary with the
  run seed.

It is **required rather than optional**, matching `skulledCards`' reasoning: a total shape with no
field a reader can forget about, at the cost of the fifteen construction sites the compiler
enumerated (fourteen of them specs).

### What the refill costs the deck, and what a hand now leaves behind

At `PLAYER_HAND_FLOOR = 4` and `HAND_SIZE = 6`, exactly **three** tricks end with the player below
the floor (tricks 3, 4 and 5 — trick 1 leaves 5 cards, trick 2 leaves 4, and trick 6 is skipped), so
one hand takes `CARDS_PER_DEAL + 3 = 16` cards off the deck rather than 13. `deckCycle.test.ts`
derives that figure as `Math.max(0, Math.min(HAND_SIZE - 1, PLAYER_HAND_FLOOR - 1))` rather than
pinning `3`, which is what keeps the spec green at a floor of `0`.

**A hand can now end with cards still in the player's hand** — three of them, at today's constants.
`closeHand` needs no new clause: its "every card not in the draw pile joins the spent pile" rule
already sweeps both hands, so all 33 cards stay conserved with no edit.

The refill is handed the spent pile **with the just-resolved trick's two cards already appended**,
and `playCard` then takes `refill.spentPile` rather than rebuilding it. That is what keeps the count
right when a refill triggers a reshuffle at the same instant the trick is being spent.

### Cost

The refill runs at most three times a hand and allocates an array of at most `PLAYER_HAND_FLOOR`
cards. A reshuffle shuffles at most 33. Neither is a per-render or pointer-frequency path, so
nothing here is memoised.
