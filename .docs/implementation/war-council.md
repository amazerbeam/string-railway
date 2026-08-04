# War Council — `src/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-19, SCRUM-20

## Responsibility

Owns the Fox in the Forest card-game layer of the hybrid — the trick-taking / bidding half of a
round, as named in the root `CLAUDE.md` → _Game naming_. Kept in its own folder, separate from
`src/vanguard/` and `src/battle/`, so the card engine and the board engine can each own their own
state shape without one leaking into the other's internals (`src/battle/` composes both, see
`battle.md`).

The module is a pure, headless rules engine for **one round**: deck, deterministic shuffle-and-deal,
legal-move validation, trick-winner resolution, the base game's five non-Treasure odd-card
abilities, and end-of-round scoring. It has no CPU decision-making and no rendering — `playCard`
accepts a proposed play from either side but never chooses one itself, and nothing here imports
React or touches the DOM.

## Key types & exports

| Export                                                                       | Purpose                                                                                                                                                                                                    | File                    |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `WarCouncilState`                                                            | Alias for `RoundState` — the engine's real per-round state shape, replacing SCRUM-19's `unknown` placeholder                                                                                               | `index.ts` / `types.ts` |
| `RoundState`                                                                 | Both hands, draw pile, decree/trump, tricks won, in-progress trick, leader, tricks played, phase                                                                                                           | `types.ts`              |
| `Suit`, `PlayerSide`, `RoundPhase`, `AbilityChoiceKind`, `IllegalMoveReason` | `as const` string-value maps (no TS `enum` — `erasableSyntaxOnly`)                                                                                                                                         | `types.ts`              |
| `CardRank`                                                                   | Named ranks for the five ability-bearing cards (`Swan: 1, Fox: 3, Woodcutter: 5, Witch: 9, Monarch: 11`) — every branch that keys off one of these ranks references this map, never a bare numeric literal | `types.ts`              |
| `Card`, `TrickCard`, `AbilityChoice`, `PlayCardResult`                       | Supporting shapes — a card, a card-plus-side in a trick, a discriminated ability-choice payload, and `playCard`'s `{ ok: true, state } \| { ok: false, reason }` result                                    | `types.ts`              |
| `otherSide`, `currentTurn`                                                   | `otherSide` flips a `PlayerSide`; `currentTurn` derives whose turn it is from `currentTrick`/`leader`                                                                                                      | `types.ts`              |
| `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`     | Structural card-equality helpers shared by every module below                                                                                                                                              | `cardUtils.ts`          |
| `createDeck`                                                                 | Builds the 33-card base deck (3 suits × ranks 1–11, one of each)                                                                                                                                           | `deck.ts`               |
| `shuffle`                                                                    | Fisher-Yates shuffle, `rng: () => number` is caller-injected — no internal `Math.random()`                                                                                                                 | `shuffle.ts`            |
| `dealRound`                                                                  | Deals one round: 13/13 hands, 6-card draw pile, one decree card whose suit sets trump                                                                                                                      | `deal.ts`               |
| `legalMoves`                                                                 | Pure query: what a side may legally play right now                                                                                                                                                         | `legalMoves.ts`         |
| `resolveTrickWinner`                                                         | Pure query: given a completed `[lead, follow]` trick and the current trump suit, who won                                                                                                                   | `resolveTrick.ts`       |
| `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick`            | The three ability effects that mutate `RoundState` directly                                                                                                                                                | `abilities.ts`          |
| `playCard`                                                                   | The single reducer-shaped entry point — the only way to mutate `RoundState`                                                                                                                                | `playCard.ts`           |
| `tricksToPoints`, `scoreRound`                                               | End-of-round scoring band lookup                                                                                                                                                                           | `scoring.ts`            |

## How it works

### The 33-card base deck

`createDeck` in `deck.ts` builds the deck by nesting a loop over `ALL_SUITS` (`bells`, `keys`,
`moons`) inside a loop over `RANKS` (`1`–`11`), producing exactly one `Card` per (suit, rank) pair —
33 cards total. No expansion-module cards (special/goal/poison) exist anywhere in this tree.

### Shuffling and dealing

`shuffle` in `shuffle.ts` is a standard Fisher-Yates shuffle over a copy of the input array — it
never mutates its argument and never calls `Math.random()` itself; every call site supplies its own
`rng: () => number` (production wiring passes `Math.random`, tests pass a fixed/deterministic
generator), so the shuffle is reproducible wherever the caller wants it to be.

`dealRound` in `deal.ts` shuffles a fresh deck, slices the first 13 cards to the player, the next 13
to the CPU, takes the 27th card as the **decree** (whose suit becomes `trumpSuit`), and the
remaining 6 cards become the `drawPile`. The **leader** for the round's first trick is
`otherSide(dealer)` — `dealRound` takes `dealer` as a plain input parameter rather than deciding
alternation itself; whether a battle alternates the dealer across rounds is explicitly left to a
later ticket (the battle-loop orchestrator), per `plan.md`'s Assumptions.

### Legal-move validation

`legalMoves` in `legalMoves.ts` is a pure query, consulted by `playCard` before anything changes:

- If `currentTrick` is empty, the leader may play any card in hand — no restriction.
- Otherwise the led card's suit must be followed if the side holds any card of that suit
  (`cardsOfSuit`); if they hold none, they may play anything.
- **Monarch exception** (`CardRank.Monarch`, rank 11): if Monarch was the led card and the follower
  holds any card of that suit, their legal set narrows to `{ their Swan of that suit, if held } ∪
{ their highest card of that suit }`, deduplicated when the two coincide. If they hold none of
  that suit, they may play anything, same as the general rule.

Every other ability (Fox, Woodcutter, Witch, Swan's leader-override) affects trick _outcome_ or
_state_, not what's legal to play, so none of them appear here — they live in `playCard`'s
post-validation ability dispatch and in `resolveTrickWinner` instead.

### Trick-winner resolution

`resolveTrickWinner` in `resolveTrick.ts` takes a completed `[leadCard, followCard]` trick — **this
order is load-bearing** (stated in a comment directly above the function) — plus the trump suit
_as it stands at the moment the function is called_. A card is "effectively trump" if its suit
matches `trumpSuit`, **or** it is the sole rank-9 (Witch) card present in the trick (the "one Witch
counts as trump, two Witches neutralise each other" rule). If either card is effectively trump, the
higher-ranked effectively-trump card wins; otherwise, if both cards share the lead suit, higher rank
wins, and if the follower is off-suit entirely, the lead card wins unconditionally.

### The Fox's mid-trick trump mutation (AC2)

`playCard` (see below) applies `applyFoxExchange` — which mutates `trumpSuit` on the returned state
— **before** it ever calls `resolveTrickWinner` for that trick. Because the trump suit passed to
`resolveTrickWinner` is read off `next.trumpSuit` after any Fox exchange earlier in the same
`playCard` call, a trick where Fox was played uses the **post-exchange** trump suit to determine its
winner, exactly as `.docs/game_rules/fox-in-the-forest.md`'s Appendix specifies. This ordering is
the single correctness-critical sequencing in the whole reducer, and is the one the shipped test
`playCard.test.ts :: 'a full trick resolves using the trump suit as of after the Fox exchange'` is
built to distinguish (its fixture is constructed so the pre- and post-exchange trump suits produce
different winners — an earlier draft of this test used a fixture where they coincided, which was
caught in review and rewritten).

### The other four odd-card abilities

All three state-mutating effects live in `abilities.ts`, kept separate from `playCard.ts`'s
sequencing so each is independently testable against a hand-built `RoundState` fixture:

- **Fox** (`CardRank.Fox`, rank 3) — `applyFoxExchange` removes the chosen hand card, makes it the
  new decree (and thus the new `trumpSuit`), and gives the side the old decree card in return.
- **Woodcutter** (`CardRank.Woodcutter`, rank 5) — `applyWoodcutterDraw` draws the top card of
  `drawPile` into the side's hand, then removes the chosen discard (drawn or previously held) and
  appends it to the bottom of `drawPile`. **Invariant:** `drawPile`'s length stays fixed at 6 for
  the life of a round, since every draw is paired with a discard back onto the pile — documented in
  a comment directly above the function, since nothing type-checks this and a future mutator that
  breaks the pairing would silently corrupt the pile.
- **Swan** (`CardRank.Swan`, rank 1) — `nextLeaderAfterTrick` normally returns the trick's winner as
  the next leader, **unless** a Swan in the trick belongs to the losing side, in which case that
  side leads next instead (covers the two-Swans case: the trick's loser leads next either way).
- **Witch** (`CardRank.Witch`, rank 9) — has no separate ability function; its "counts as trump when
  alone" rule is folded directly into `resolveTrickWinner` (see above), since it only affects trick
  _outcome_, not any other state.
- **Monarch** (`CardRank.Monarch`, rank 11) — has no separate ability function either; its forced
  narrowing of the follower's legal set is folded into `legalMoves` (see above).
- **Treasure** (rank 7) has no ability function or special handling anywhere — it is an ordinary
  playable card. Its mid-round point-award rule is deliberately not implemented (see _Deferred_).

### `playCard` — the single reducer-shaped entry point

`playCard` in `playCard.ts` is the only function in this module that produces a new `RoundState`; no
other exported function mutates state. Its order of operations:

1. Reject if the round is already `RoundPhase.Complete` (`IllegalMoveReason.RoundComplete`).
2. Reject if it isn't `side`'s turn per `currentTurn` (`NotYourTurn`).
3. Reject if the card isn't in `side`'s hand (`CardNotInHand`).
4. Reject if the card isn't in `legalMoves(state, side)` — distinguishing `MustFollowMonarch` from
   the general `MustFollowLeadSuit` based on whether Monarch was the led card.
5. Remove the card from the hand, then dispatch by rank:
   - **Fox** — requires an `AbilityChoice`; `FoxExchange` applies `applyFoxExchange` (rejecting
     `InvalidFoxExchangeCard` if the named hand card isn't actually held), `FoxDecline` does
     nothing, anything else is `UnexpectedAbilityChoice`, and no choice at all is
     `MissingAbilityChoice`.
   - **Woodcutter** — requires a `WoodcutterDiscard` choice with the same missing/mismatched-kind
     split as Fox (`MissingAbilityChoice` / `UnexpectedAbilityChoice`), then rejects
     `InvalidWoodcutterDiscard` if the named discard isn't in the post-draw hand, else applies
     `applyWoodcutterDraw`.
   - **Any other rank** — a supplied `choice` at all is rejected as `UnexpectedAbilityChoice` (no
     rank other than Fox/Woodcutter expects one).
6. Append the card to `currentTrick`. If this is the trick's first card, the result is `{ ok: true,
state }` with `phase: AwaitingFollow`. If it's the second, `resolveTrickWinner` and
   `nextLeaderAfterTrick` run, `tricksWon`/`tricksPlayed` increment, and `phase` becomes `Complete`
   once `tricksPlayed` reaches 13, else `AwaitingLead`.

Every rejection returns `{ ok: false, reason }` and leaves the **input** `state` untouched — no
partial mutation, no thrown exception; a caller (a future CPU or UI ticket) branches on the named
`IllegalMoveReason` rather than parsing an exception message.

### End-of-round scoring

`scoring.ts` is intentionally independent of the trick engine — `tricksToPoints` is a fixed lookup
over an integer 0–13 (`0–3 → 6`, `4 → 1`, `5 → 2`, `6 → 3`, `7–9 → 6`, `10–13 → 0`), and
`scoreRound` applies it directly to both sides' final `tricksWon` via a plain two-field object
literal (`{ player: tricksToPoints(tricksWon.player), cpu: tricksToPoints(tricksWon.cpu) }`) — no
loop, no cast, since there are exactly two sides.

## Rules & invariants enforced

- **Pure-core boundary** (SCRUM-19, re-confirmed by every ticket since): `eslint.config.js` scopes a
  `no-restricted-imports` / `no-restricted-globals` block to `src/warCouncil/**/*.{ts,tsx}` and
  `src/vanguard/**/*.{ts,tsx}`. This module may not import `react`/`react-dom` and may not reference
  DOM/network globals. Enforced by ESLint (`npm run lint`), re-grepped explicitly in SCRUM-20's
  Final verification (zero hits).
- **No internal `Math.random()`** — every random source in this module is the caller-injected `rng`
  parameter to `shuffle`/`dealRound`. Grepped explicitly in SCRUM-20's Final verification (zero
  hits), so production wiring and tests can diverge (real randomness vs. a deterministic generator)
  without touching this module's own code.
- **`playCard` is the only mutator** — `legalMoves`, `resolveTrickWinner`, and every function in
  `abilities.ts` are pure queries/helpers `playCard` calls; a future CPU or UI ticket should call
  `playCard` to change state and the query functions only to inspect it, never call an ability
  effect directly to mutate state outside the reducer.
- **`resolveTrickWinner`'s tuple order is load-bearing** — `[leadCard, followCard]`, documented in a
  comment above the function; `playCard` enforces the order by construction (the first card added
  to `currentTrick` is always the lead).
- **Card equality is structural** (`suit` + `rank`, via `cardUtils.ts`) — no identity or synthetic id
  scheme, since the 33-card deck has exactly one card per (suit, rank) pair.
- **Named rank constants, not magic numbers** — the five ability-bearing ranks are referenced via
  `CardRank.Swan` / `.Fox` / `.Woodcutter` / `.Witch` / `.Monarch` at every production branch that
  keys off one of them (added during SCRUM-20's review fix pass, after the first draft used bare
  numeric literals at several of these sites).
- **File-size budget** — every file in this tree is well under the project's 400-line limit; the
  largest production file (`playCard.ts`) is 89 lines.

## Deferred / not yet implemented

- **Any CPU decision-making.** `playCard` accepts a proposed play from either side; nothing in this
  module chooses one. A future CPU ticket is the first real caller beyond this engine's own tests.
- **Treasure's (rank 7) mid-round point bonus.** The card is an ordinary playable card here — no
  special ability, no scoring bonus. Whether/how Treasure points feed Muster is an explicitly open
  design question (`.docs/design/hybrid-concept.md` → _Open questions_) this ticket was told not to
  resolve.
- **Dealer alternation across a battle.** `dealRound` takes `dealer` as an input parameter; deciding
  what value to pass across a sequence of rounds (reset vs. continue per city/battle) belongs to the
  battle-loop orchestrator ticket, not this one.
- **Any multi-round or `BattleState`-level orchestration.** This module's surface is exactly one
  round; `src/battle/battleState.ts` composes this engine's `RoundState` (as `WarCouncilState`) with
  `src/vanguard/`'s state, but nothing here knows about that composition.
- **Persistence/serialisation.** Nothing in this module reads or writes storage; `RoundState` is an
  in-memory shape only.
- **The special, goal, and poison expansion modules.** Only the base 33-card deck is representable —
  no expansion card exists anywhere in this tree, by construction (`ALL_SUITS` × `RANKS` only).
