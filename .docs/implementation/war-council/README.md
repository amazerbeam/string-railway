# War Council — `src/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63

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

**DLR-63 gave the module two more mutators and made `spoils` two-branch.** The Hunt's Win/Lose
declaration is engine state, not UI state — a Lose-credit is spent mid-round and the set of credited
cards determines the score, so a reducer tracking it would be adjudicating a scoring rule. `playCard`
is therefore no longer the only way to mutate `RoundState`: `declareHunt` and `claimLostTrick` join
it, each shaped identically (`{ ok: true, state } | { ok: false, reason }` over a closed `as const`
reason map, a named rejection rather than a throw, never a partially-mutated state). See
[the declaration and the Lose path](declaration-and-lose-path.md).

## Key types & exports

| Export                                                                       | Purpose                                                                                                                                                                                                    | File                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `WarCouncilState`                                                            | Alias for `RoundState` — the engine's real per-round state shape, replacing SCRUM-19's `unknown` placeholder                                                                                               | `index.ts` / `types.ts` |
| `RoundState`                                                                 | Both hands, draw pile, decree/trump, tricks won, **captured cards per side** (DLR-49), in-progress trick, leader, tricks played, phase, (DLR-51) an **optional** `quarryCharacter` naming the round-long rule-break in force, and (DLR-63) an **optional** `declaration` — absent means undeclared                                                                     | `types.ts`              |
| `Suit`, `PlayerSide`, `RoundPhase`, `AbilityChoiceKind`, `IllegalMoveReason` | `as const` string-value maps (no TS `enum` — `erasableSyntaxOnly`)                                                                                                                                         | `types.ts`              |
| `CardRank`                                                                   | Named ranks for every rank with an ability or scoring rule (`Swan: 1, Fox: 3, Woodcutter: 5, Treasure: 7, Poison: 8, Witch: 9, Monarch: 11`) — every branch that keys off one of these ranks references this map, never a bare numeric literal | `types.ts`              |
| `Card`, `TrickCard`, `AbilityChoice`, `PlayCardResult`                       | Supporting shapes — a card, a card-plus-side in a trick, a discriminated ability-choice payload, and `playCard`'s `{ ok: true, state } \| { ok: false, reason }` result                                    | `types.ts`              |
| `otherSide`, `currentTurn`                                                   | `otherSide` flips a `PlayerSide`; `currentTurn` derives whose turn it is from `currentTrick`/`leader`                                                                                                      | `types.ts`              |
| `TRICKS_PER_ROUND`                                                           | The round-length constant (`13`) — consolidated here by DLR-47, previously duplicated as a bare literal in `deal.ts`/`playCard.ts` and separately declared in the now-deleted `src/app/tricksWon.ts`      | `types.ts`              |
| `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`     | Structural card-equality helpers shared by every module below                                                                                                                                              | `cardUtils.ts`          |
| `createDeck`                                                                 | Builds the 33-card base deck (3 suits × ranks 1–11, one of each)                                                                                                                                           | `deck.ts`               |
| `shuffle`                                                                    | Fisher-Yates shuffle, `rng: () => number` is caller-injected — no internal `Math.random()`                                                                                                                 | `shuffle.ts`            |
| `dealRound`                                                                  | Deals one round: 13/13 hands, 6-card draw pile, one decree card whose suit sets trump; since DLR-51 takes an **optional** third `quarryCharacter` parameter, written once into the returned state           | `deal.ts`               |
| `legalMoves`                                                                 | Pure query: what a side may legally play right now — since DLR-51 also consults the round-long rule-break as an added disjunct alongside the pre-existing single-card Monarch check                        | `legalMoves.ts`         |
| `resolveTrickWinner`                                                         | Pure query: given a completed `[lead, follow]` trick and the current trump suit, who won                                                                                                                   | `resolveTrick.ts`       |
| `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick`            | The three ability effects that mutate `RoundState` directly                                                                                                                                                | `abilities.ts`          |
| `QUARRY_SIDE`, `monarchFollowSet`, `monarchFollowApplies`                    | The round-long rule-break module (DLR-51): the seat the Quarry plays, the Monarch's Swan-or-highest follow set, and the predicate for whether the round-long constraint is in force this trick              | `quarryRuleBreak.ts`    |
| `playCard`                                                                   | The single reducer-shaped entry point — the only way to mutate `RoundState`; since DLR-51 its rejection-reason branch also consults `monarchFollowApplies`, so a round-long Monarch rejection reports `MustFollowMonarch` rather than the generic follow-suit reason | `playCard.ts`           |
| `tricksToPoints`, `scoreRound`                                               | End-of-round scoring band lookup — since DLR-50 a one-line delegation to `src/hunt`'s `resolveStanding`, holding no band values of its own                                                                  | `scoring.ts`            |
| `spoils`                                                                     | Two-branch since DLR-63. Lose-declared + player side sums `declaration.creditedCards` at `invertedCardValue`; **every other case** (undeclared, Win, or the Quarry's side) sums that side's `capturedCards` at `cardBaseValue` exactly as DLR-49 built it. Treasure(+1)/Poison(−1) folds into both branches | `spoils.ts`             |
| `creditedTrickWorth`                                                         | `(cards, inverted?) => Spoils` — what a claimed trick is worth on the Lose path, including the Treasure/Poison fold. Extracted in DLR-63's review round so the UI's pre-claim preview and the actual score cannot diverge; both call this one function | `spoils.ts`             |
| `DeclarationState`                                                           | The declaration plus the Lose path's bookkeeping — `{ path, creditsRemaining, creditedCards, creditedThrough }`. One nested object rather than four sibling fields so a reader has exactly one absence check (DLR-63) | `types.ts`              |
| `declareHunt`, `DeclareRejection`, `DeclareResult`                           | Writes the declaration once, before the first card (AC1). Rejects `AlreadyDeclared` and `HuntUnderway`. Takes the credit pool as a **parameter** rather than reading config, so the engine stays free of the tunable (DLR-63) | `declareHunt.ts`        |
| `claimLostTrick`, `canClaimLostTrick`, `ClaimRejection`, `ClaimResult`       | Spends one Lose-credit on a trick the player lost, crediting its two cards (AC3). Four guards: `NotDeclaredLose`, `NoCreditsRemaining`, `TrickAlreadyCredited`, `TrickNotLost`. The predicate shares one private `rejectionFor` with the mutator, so the UI's offer and the engine's guard cannot disagree (DLR-63) | `claimLostTrick.ts`     |
| `scoreHunt`, `HuntScore`                                                     | §1's equation for one finished round — `{ spoils, tricks, band, standing, score }` where `score = spoils × standing`, computed once from a final `RoundState`, never accumulated per trick (DLR-50)        | `scoring.ts`            |
| `checkDemand`, `DemandOutcome`                                               | Compares a computed score against a caller-supplied Demand, returning `'cleared'` \| `'missed'`; the boundary is inclusive — equal clears (DLR-50)                                                          | `scoring.ts`            |
| `chooseCpuCard`, `chooseCpuFoxChoice`, `chooseCpuWoodcutterChoice`           | The three independently-testable sub-decisions of the CPU heuristic — card choice, and the Fox/Woodcutter ability choices                                                                                  | `cpuPlayer.ts`          |
| `chooseCpuMove`, `CpuMove`                                                   | Composes the three sub-decisions into one `{ card, choice? }` move                                                                                  | `cpuPlayer.ts`          |
| `quarryIntent`, `QuarryIntent`, `QuarryIntentStance`                         | The telegraph's preview of the Quarry's next move (DLR-52) — `{ suit, stance? }` or `null` when there is no move to describe; never the exact card, and `stance` is `Leading`/`Pressing`/`Ducking` | `cpuPlayer.ts`          |
| `commitQuarryMove`                                                           | Plays the move `quarryIntent` previewed (DLR-52) — a guarded pass-through over the unmodified `chooseCpuMove` + `playCard`, returning `playCard`'s `PlayCardResult` unchanged | `cpuPlayer.ts`          |

## How it works

- [Deck and dealing](deck-and-dealing.md) — the 33-card base deck, the Fisher-Yates shuffle, and
  how `dealRound` deals hands, the decree, and the draw pile.
- [Legal moves and the odd-card abilities](legal-moves-and-abilities.md) — what's playable at any
  moment, the Monarch exception, the four non-Witch/Monarch ability effects (Fox, Woodcutter, Swan,
  Treasure), and (DLR-51) the Quarry's round-long rule-break — the Monarch's whole-round version of
  its own exception.
- [Trick resolution and `playCard`](trick-resolution-and-play.md) — how a trick's winner is
  decided (including the Witch's "counts as trump" rule and the Fox's trump-mutation ordering), and
  `playCard`'s full order of operations as the module's single mutator.
- [Scoring](scoring.md) — the end-of-round tricks-to-points lookup, Spoils (DLR-49) — the summed
  value of a side's captured cards, two-branch since DLR-63 — and the Hunt outcome (DLR-50):
  `scoreHunt`'s Spoils × Standing, and `checkDemand`'s inclusive Demand boundary.
- [The declaration and the Lose path](declaration-and-lose-path.md) — `declareHunt`'s two guards,
  `claimLostTrick`'s four, why trick ownership is read off the capture pile's ordered tail rather
  than re-resolved, the `creditedThrough` watermark that makes a claim idempotent, and how AC4/AC5
  hold by construction rather than by discipline (DLR-63).
- [The CPU heuristic and the intent telegraph](cpu-heuristic.md) — `cpuPlayer.ts`'s five pure
  decision functions and what they do and don't know about, plus (DLR-52) the intent/commit split:
  how `quarryIntent` previews the Quarry's next move as a suit-and-stance shape without revealing
  the card, why both new entry points guard their own preconditions, and where the telegraph's
  fidelity is configured.

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
- **Named rank constants, not magic numbers** — every rank with a named ability or scoring rule is
  referenced via `CardRank.Swan` / `.Fox` / `.Woodcutter` / `.Treasure` / `.Poison` / `.Witch` /
  `.Monarch` at every production branch that keys off one of them (added during SCRUM-20's review
  fix pass for the original five, extended to Treasure/Poison by DLR-49; re-grepped in DLR-49's
  Final verification for a stray bare `rank === 7`/`rank === 8` — zero hits).
- **File-size budget** — every file in this tree is well under the project's 400-line limit; the
  largest production file is `cpuPlayer.ts` at 171 lines (it overtook `playCard.ts`, now 117, when
  DLR-52 added the intent telegraph).
- **The round-long rule-break's narrowing is defined once, consulted twice** (DLR-51) —
  `quarryRuleBreak.ts`'s `monarchFollowSet`/`monarchFollowApplies` are the sole source of truth for
  both `legalMoves`'s narrowing and `playCard`'s rejection-reason branch, so the legal set and the
  reason code explaining a rejection cannot disagree. `abilities.ts` is untouched by this
  mechanism — the round-long path reuses the single-card path's exact narrowing rather than adding
  a second, independent implementation of "Swan or highest."
- **"Not complete and the Quarry's turn" implies the Quarry holds a card** (DLR-52) — this is what
  makes `quarryIntent`/`commitQuarryMove`'s phase-and-turn guard sufficient without a separate
  `legalMoves(...).length === 0` check. `dealRound` gives each side exactly `TRICKS_PER_ROUND` cards;
  `playCard` removes exactly one card from the acting side's hand on every path (the Fox and
  Woodcutter branches in `abilities.ts` each net −1); and `playCard` derives `phase` directly from the
  incremented count in the same state rebuild (`playCard.ts:103` — `tricksPlayed ===
  TRICKS_PER_ROUND ? RoundPhase.Complete : RoundPhase.AwaitingLead`), so the two can never disagree.
  Hand size is therefore
  pinned to `13 - tricksPlayed` for whichever side `currentTurn` names, and `legalMoves` only ever
  narrows a non-empty hand or falls back to the whole hand — it never turns a non-empty hand into an
  empty legal set. Any future change to `playCard`'s hand accounting or to when `phase` becomes
  `Complete` invalidates this reasoning and re-exposes `lowestCard`'s empty-array crash.
- **`RoundState.quarryCharacter` is write-once** (DLR-51) — only `dealRound` ever sets it; every
  other state update in this tree rebuilds `RoundState` by spreading, so the field cannot toggle
  mid-round by construction. Proven, not just argued: a 60-seed simulation in `cpuPlayer.test.ts`
  asserts the field is unchanged after every one of a round's 13 plays.

## Deferred / not yet implemented

- **Meta-game-aware or search-based CPU play.** `chooseCpuMove` (SCRUM-26) treats every War Council
  round identically regardless of any broader run state — no lookahead, no determinized search, and
  no awareness of anything beyond the current `RoundState`. The Vanguard board engine and
  battle-loop orchestrator this module's isolation was originally scoped against were both removed
  by DLR-47; a later ticket in the DLR-46 epic (the Hunt run loop) decides what, if any, run-level
  context ought to feed the CPU's decisions, and this module's public surface is unaffected either
  way — `chooseCpuMove` takes only a `RoundState` today.
- **The intent telegraph renders, but its pacing is unstyled.** DLR-53 gave `quarryIntent` and
  `commitQuarryMove` their first production callers: the Hunt screen reads the intent every render,
  and `roundReducer.ts` now commits the Quarry's *lead* through `commitQuarryMove` (its
  `advanceQuarryLead` path) while still using `chooseCpuMove` for the *follow*, which needs the
  chosen card to build the trick reveal. So DLR-52's split is live rather than provable only under
  Vitest. What remains deferred is presentation: any pacing or animation of the reveal is T15's.
- **`chooseCpuCard` itself is still undefended against an empty legal set.** Its internal
  `lowestCard` remains a bare `[...cards].sort(...)[0]`, returning `undefined` rather than throwing a
  meaningful error. Every path that currently reaches it is guarded by its caller — `advanceCpu`,
  `quarryIntent`, and `commitQuarryMove` each check independently — but that is three copies of one
  precondition, and a fourth caller added without it would crash. Making the function defensive at
  source was out of DLR-52's scope (its AC6 required `chooseCpuCard` stay byte-for-byte unchanged so
  the existing suite proved behaviour preservation); it is worth a follow-up ticket.
- **Treasure/Poison's play-time behaviour.** Both are ordinary playable cards during the trick
  itself — no play-time ability, unlike Fox/Woodcutter/Witch/Monarch. Their effect is a scoring
  intervention applied after capture (see [Scoring](scoring.md)'s Spoils section, DLR-49), not a
  rule enforced during legal-move checking or trick resolution. Whether/how Treasure/Poison feed
  any further run-level resource beyond Spoils is an open design question for a later ticket.
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
- **The Hunt score is displayed; the *run* around it is not.** DLR-53 wired `spoils`,
  `resolveStanding`, `scoreHunt`, and `checkDemand` to the screen — a running ledger during play and
  `Spoils × Standing = Score` with a cleared/missed verdict at the end (see
  [../war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md)).
  `scoreRound` is deliberately still what `WarCouncilRoundResult` reports, because that payload was
  left unchanged rather than reshaped for a run loop nobody has written.
- **Nothing decides, stores, or advances a Demand.** `checkDemand` takes one as a parameter and
  compares it; where the number comes from and how it grows across encounters is T9's run state.
  `src/hunt`'s `DEMAND_CURVE` is still `{ base: null, growthPerEncounter: null }` and is not read
  anywhere in this module.
- **Only the player's side is ever scored.** `scoreHunt` takes a `PlayerSide` and would compute a
  `HuntScore` for either, but nothing calls it for the CPU — the design scores the player against
  the Demand, not the Quarry (§8).
- **Four of the Quarry's five §4 characters have no round-long enforcement.** Only the Monarch is
  implemented (DLR-51); the Witch, Fox, Woodcutter, and Swan have no entry in `quarryRuleBreak.ts`
  and no round-long behaviour anywhere in this tree — a later ticket adds each the same way: an
  applicability predicate plus a narrowing function, consulted from `legalMoves` and `playCard`.
- **No round in the shipped app has a `quarryCharacter` active.** `dealRound`'s third parameter is
  optional and every call site — both in `src/App.tsx` and every existing test fixture — still
  passes only two arguments. Deciding which character appears in which encounter is a later
  ticket's run-scheduling job; until then the Monarch mechanism is provable only under Vitest.
- **The rejected-move UI copy is stale for the round-long trigger.** DLR-51 widened *when*
  `IllegalMoveReason.MustFollowMonarch` fires — it now also covers the round-long constraint, where
  an ordinary card was led rather than a literal Monarch. `src/app/warCouncil/labels.ts`'s copy for
  that reason ("The Monarch was led…") is only true for the pre-existing single-card trigger; DLR-51
  did not update it, because `src/app/**` is outside this ticket's `engine`-labeled scope and the
  wording is a developer copy call. Currently unreachable (see the bullet above), but the next
  ticket that wires a character into a real round will need to fix this before shipping it — see
  [../war-council-ui/README.md](../war-council-ui/README.md).
- **No surplus-Spoils reward.** Clearing the Demand by a wide margin takes the same code path as
  clearing it exactly; §12's open question about rewarding overshoot has no implementation.
- **Persistence/serialisation.** Nothing in this module reads or writes storage; `RoundState` is an
  in-memory shape only.
- **The special, goal, and poison expansion modules.** Only the base 33-card deck is representable —
  no expansion card exists anywhere in this tree, by construction (`ALL_SUITS` × `RANKS` only).
