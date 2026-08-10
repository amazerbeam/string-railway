# War Council — `src/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-19, SCRUM-20, SCRUM-26, DLR-47

## Responsibility

Owns the Fox in the Forest card-game layer — the trick-taking / bidding engine for one round. Kept
in its own folder so the card engine owns its own state shape independently of whatever consumes
it; historically that separation also kept it independent of the now-deleted Vanguard board engine
and battle-loop orchestrator (see `CLAUDE.md`'s recovery notes for how to view anything DLR-47
removed).

The module is a pure, headless rules engine for **one round**: deck, deterministic shuffle-and-deal,
legal-move validation, trick-winner resolution, the base game's five non-Treasure odd-card
abilities, end-of-round scoring, and (since SCRUM-26) a stated, deterministic heuristic that picks a
legal move for either side. It has no rendering — nothing here imports React or touches the DOM —
and `playCard` still accepts a proposed play from either side rather than choosing one itself; the
heuristic is a separate, optional caller of the same public surface, not a special path inside the
reducer.

## Key types & exports

| Export                                                                       | Purpose                                                                                                                                                                                                    | File                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `WarCouncilState`                                                            | Alias for `RoundState` — the engine's real per-round state shape, replacing SCRUM-19's `unknown` placeholder                                                                                               | `index.ts` / `types.ts` |
| `RoundState`                                                                 | Both hands, draw pile, decree/trump, tricks won, in-progress trick, leader, tricks played, phase                                                                                                           | `types.ts`              |
| `Suit`, `PlayerSide`, `RoundPhase`, `AbilityChoiceKind`, `IllegalMoveReason` | `as const` string-value maps (no TS `enum` — `erasableSyntaxOnly`)                                                                                                                                         | `types.ts`              |
| `CardRank`                                                                   | Named ranks for the five ability-bearing cards (`Swan: 1, Fox: 3, Woodcutter: 5, Witch: 9, Monarch: 11`) — every branch that keys off one of these ranks references this map, never a bare numeric literal | `types.ts`              |
| `Card`, `TrickCard`, `AbilityChoice`, `PlayCardResult`                       | Supporting shapes — a card, a card-plus-side in a trick, a discriminated ability-choice payload, and `playCard`'s `{ ok: true, state } \| { ok: false, reason }` result                                    | `types.ts`              |
| `otherSide`, `currentTurn`                                                   | `otherSide` flips a `PlayerSide`; `currentTurn` derives whose turn it is from `currentTrick`/`leader`                                                                                                      | `types.ts`              |
| `TRICKS_PER_ROUND`                                                           | The round-length constant (`13`) — consolidated here by DLR-47, previously duplicated as a bare literal in `deal.ts`/`playCard.ts` and separately declared in the now-deleted `src/app/tricksWon.ts`      | `types.ts`              |
| `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`     | Structural card-equality helpers shared by every module below                                                                                                                                              | `cardUtils.ts`          |
| `createDeck`                                                                 | Builds the 33-card base deck (3 suits × ranks 1–11, one of each)                                                                                                                                           | `deck.ts`               |
| `shuffle`                                                                    | Fisher-Yates shuffle, `rng: () => number` is caller-injected — no internal `Math.random()`                                                                                                                 | `shuffle.ts`            |
| `dealRound`                                                                  | Deals one round: 13/13 hands, 6-card draw pile, one decree card whose suit sets trump                                                                                                                      | `deal.ts`               |
| `legalMoves`                                                                 | Pure query: what a side may legally play right now                                                                                                                                                         | `legalMoves.ts`         |
| `resolveTrickWinner`                                                         | Pure query: given a completed `[lead, follow]` trick and the current trump suit, who won                                                                                                                   | `resolveTrick.ts`       |
| `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick`            | The three ability effects that mutate `RoundState` directly                                                                                                                                                | `abilities.ts`          |
| `playCard`                                                                   | The single reducer-shaped entry point — the only way to mutate `RoundState`                                                                                                                                | `playCard.ts`           |
| `tricksToPoints`, `scoreRound`                                               | End-of-round scoring band lookup                                                                                                                                                                           | `scoring.ts`            |
| `chooseCpuCard`, `chooseCpuFoxChoice`, `chooseCpuWoodcutterChoice`           | The three independently-testable sub-decisions of the CPU heuristic — card choice, and the Fox/Woodcutter ability choices                                                                                  | `cpuPlayer.ts`          |
| `chooseCpuMove`, `CpuMove`                                                   | Composes the three sub-decisions into one `{ card, choice? }` move; the only heuristic export re-exported from `index.ts`                                                                                  | `cpuPlayer.ts`          |

## How it works

- [Deck and dealing](deck-and-dealing.md) — the 33-card base deck, the Fisher-Yates shuffle, and
  how `dealRound` deals hands, the decree, and the draw pile.
- [Legal moves and the odd-card abilities](legal-moves-and-abilities.md) — what's playable at any
  moment, the Monarch exception, and the four non-Witch/Monarch ability effects (Fox, Woodcutter,
  Swan, Treasure).
- [Trick resolution and `playCard`](trick-resolution-and-play.md) — how a trick's winner is
  decided (including the Witch's "counts as trump" rule and the Fox's trump-mutation ordering), and
  `playCard`'s full order of operations as the module's single mutator.
- [Scoring](scoring.md) — the end-of-round tricks-to-points lookup.
- [The CPU heuristic](cpu-heuristic.md) — `cpuPlayer.ts`'s five pure functions and what they do and
  don't know about.

## Rules & invariants enforced

- **Pure-core boundary** (SCRUM-19, re-confirmed by every ticket since): `eslint.config.js` scopes a
  `no-restricted-imports` / `no-restricted-globals` block to `src/warCouncil/**/*.{ts,tsx}` — the
  same block previously also scoped `src/vanguard/**/*.{ts,tsx}` before DLR-47 deleted that tree,
  and now also scopes `src/hunt/**/*.{ts,tsx}` since DLR-48 extended the same block rather than
  pasting a second copy (see [../hunt/README.md](../hunt/README.md)).
  This module may not import `react`/`react-dom` and may not reference DOM/network globals.
  Enforced by ESLint (`npm run lint`), re-grepped explicitly in SCRUM-20's Final verification (zero
  hits).
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

- **Meta-game-aware or search-based CPU play.** `chooseCpuMove` (SCRUM-26) treats every War Council
  round identically regardless of any broader run state — no lookahead, no determinized search, and
  no awareness of anything beyond the current `RoundState`. The Vanguard board engine and
  battle-loop orchestrator this module's isolation was originally scoped against were both removed
  by DLR-47; a later ticket in the DLR-46 epic (the Hunt run loop) decides what, if any, run-level
  context ought to feed the CPU's decisions, and this module's public surface is unaffected either
  way — `chooseCpuMove` takes only a `RoundState` today.
- **Treasure's (rank 7) mid-round point bonus.** The card is an ordinary playable card here — no
  special ability, no scoring bonus. Whether/how Treasure points feed any run-level resource is an
  open design question for a later ticket, not resolved here.
- **Dealer alternation across more than one round.** `dealRound` takes `dealer` as a plain input
  parameter and does not decide alternation itself. `src/App.tsx`'s placeholder restart (DLR-47) now
  calls `src/app/dealerForRound.ts` to alternate by round parity from a placeholder first-dealer
  constant — see [../app/README.md](../app/README.md) — but that restart is explicit scaffolding
  ahead of the real Hunt run loop (a later ticket in the DLR-46 epic), which may replace this
  alternation rule entirely.
- **Any multi-round or run-level orchestration.** This module's surface is exactly one round;
  nothing here tracks score, state, or a win condition across rounds. `src/App.tsx`'s current
  restart-on-completion (DLR-47) is a placeholder, not a run loop — see
  [../app/README.md](../app/README.md)'s Deferred section.
- **Persistence/serialisation.** Nothing in this module reads or writes storage; `RoundState` is an
  in-memory shape only.
- **The special, goal, and poison expansion modules.** Only the base 33-card deck is representable —
  no expansion card exists anywhere in this tree, by construction (`ALL_SUITS` × `RANKS` only).
