# War Council — `src/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70, DLR-80

## Responsibility

Owns the Fox in the Forest card-game layer — the trick-taking / bidding engine for one round. Kept
in its own folder so the card engine owns its own state shape independently of whatever consumes
it; historically that separation also kept it independent of the now-deleted Vanguard board engine
and battle-loop orchestrator (see `CLAUDE.md`'s recovery notes for how to view anything DLR-47
removed).

The module is a pure, headless rules engine for **one hand**: deck, deterministic shuffle-and-deal,
skull assignment, legal-move validation, trick-winner resolution, the base game's five non-Treasure
odd-card abilities, the four-outcome bank-and-streak loop, and (since SCRUM-26) a stated,
deterministic heuristic that picks a legal move for either side. It has no rendering — nothing here
imports React or touches the DOM — and `playCard` still accepts a proposed play from either side
rather than choosing one itself; the heuristic is a separate, optional caller of the same public
surface, not a special path inside the reducer.

**`playCard` is once again the module's only mutator.** DLR-63 added `declareHunt` as a second one
and DLR-67 removed a third (`claimLostTrick`); **DLR-80 deleted `declareHunt` along with the
declaration itself**, so there is exactly one way to mutate `RoundState` again. The Win/Lose
declaration existed to select a card-value scheme and a Standing multiplier table, and both were
deleted in the same ticket — leaving it nothing to select.

**DLR-80 replaced the scoring layer wholesale.** `scoring.ts`, `spoils.ts` and `declareHunt.ts` were
deleted; `skulls.ts` and `bank.ts` replaced them. A hand is now six cards and six tricks rather than
thirteen; there are no capture piles; and a trick's whole effect — what it banks, what it cashes,
what damage it deals — is decided the moment it resolves rather than once at the end. See
[skulls](skulls.md) and [the bank and the cash-out](bank-and-cash-out.md).

## Key types & exports

| Export                                                                       | Purpose                                                                                                                                                                                                    | File                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `WarCouncilState`                                                            | Alias for `RoundState` — the engine's real per-round state shape, replacing SCRUM-19's `unknown` placeholder                                                                                               | `index.ts` / `types.ts` |
| `RoundState`                                                                 | Both hands, draw pile, decree/trump, tricks won, in-progress trick, leader, tricks played, phase, (DLR-51) an **optional** `quarryCharacter` naming the round-long rule-break in force, and (DLR-80) `skulledCards`, `bank`, `multiplier` and `lastResolution`. **DLR-80 removed `capturedCards` and `declaration`** — the capture piles fed only Spoils, and the bank replaced it | `types.ts`              |
| `Suit`, `PlayerSide`, `RoundPhase`, `AbilityChoiceKind`, `IllegalMoveReason` | `as const` string-value maps (no TS `enum` — `erasableSyntaxOnly`)                                                                                                                                         | `types.ts`              |
| `CardRank`                                                                   | Named ranks for every rank with an ability or scoring rule (`Swan: 1, Fox: 3, Woodcutter: 5, Treasure: 7, Poison: 8, Witch: 9, Monarch: 11`) — every branch that keys off one of these ranks references this map, never a bare numeric literal | `types.ts`              |
| `Card`, `TrickCard`, `AbilityChoice`, `PlayCardResult`                       | Supporting shapes — a card, a card-plus-side in a trick, a discriminated ability-choice payload, and `playCard`'s `{ ok: true, state } \| { ok: false, reason }` result                                    | `types.ts`              |
| `otherSide`, `currentTurn`                                                   | `otherSide` flips a `PlayerSide`; `currentTurn` derives whose turn it is from `currentTrick`/`leader`. **`declaredPath` was deleted by DLR-80** with the declaration it read                              | `types.ts`              |
| `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`     | Structural card-equality helpers shared by every module below                                                                                                                                              | `cardUtils.ts`          |
| `createDeck`                                                                 | Builds the 33-card base deck (3 suits × ranks 1–11, one of each)                                                                                                                                           | `deck.ts`               |
| `shuffle`                                                                    | Fisher-Yates shuffle, `rng: () => number` is caller-injected — no internal `Math.random()`                                                                                                                 | `shuffle.ts`            |
| `dealRound`                                                                  | Deals one hand: **`HAND_SIZE` (6) cards a side, a 20-card draw pile**, one decree card whose suit sets trump; assigns the Quarry's skulls from the same injected `rng`; seeds `bank`/`multiplier` at 0 and `lastResolution` at `null`. Since DLR-51 takes an **optional** third `quarryCharacter` parameter, written once into the returned state | `deal.ts`               |
| `legalMoves`                                                                 | Pure query: what a side may legally play right now — since DLR-51 also consults the round-long rule-break as an added disjunct alongside the pre-existing single-card Monarch check                        | `legalMoves.ts`         |
| `resolveTrickWinner`                                                         | Pure query: given a completed `[lead, follow]` trick and the current trump suit, who won                                                                                                                   | `resolveTrick.ts`       |
| `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick`            | The three ability effects that mutate `RoundState` directly                                                                                                                                                | `abilities.ts`          |
| `QUARRY_SIDE`, `monarchFollowSet`, `monarchFollowApplies`                    | The round-long rule-break module (DLR-51): the seat the Quarry plays, the Monarch's Swan-or-highest follow set, and the predicate for whether the round-long constraint is in force this trick              | `quarryRuleBreak.ts`    |
| `playCard`                                                                   | The single reducer-shaped entry point — the only way to mutate `RoundState`; since DLR-51 its rejection-reason branch also consults `monarchFollowApplies`, so a round-long Monarch rejection reports `MustFollowMonarch` rather than the generic follow-suit reason | `playCard.ts`           |
| `assignSkulls`, `skullableCards`, `isSkulled`                                | **DLR-80.** Assignment for one dealt hand at `SKULL_DENSITY`, excluding ranks below `SKULL_MIN_RANK`, drawn through `shuffle` from the **injected `rng`** — never `Math.random`, so a seeded deal reproduces its skulls. Density and min-rank are defaulted parameters, so the open rank-skew question is testable at one call site | `skulls.ts`             |
| `suitShape`, `SuitShape`                                                     | **DLR-80.** One row per suit — `{ suit, held, skulled }` — in `ALL_SUITS` order, including a zero row for a stripped suit. **Carries no rank field**, so the never-reveal-a-rank rule is enforced by the type rather than by the component                | `skulls.ts`             |
| `trickIsSkulled`                                                             | **DLR-80.** True if **any** card in the trick is skulled, not just the Quarry's — so a skull that changed hands via a Fox exchange survives with no special case                                          | `skulls.ts`             |
| `TrickOutcome`, `trickOutcomeFor`, `isTaken`                                 | **DLR-80.** The four-outcome table as a total function of two booleans (`CleanWin`/`Dodge` take the trick, `CleanLoss`/`SkullWin` take damage), plus whether an outcome banks or hits — read from a total `Record`, so a fifth outcome is a compile error | `bank.ts`               |
| `resolveTrickBank`, `BankState`, `TrickResolution`                           | **DLR-80 — the whole scoring loop in one pure function.** Banks both printed ranks and increments the streak on a taken trick; cashes `bank × multiplier`, deals `DAMAGE_PER_HIT` and resets both on a hit. `finalTrick` folds the end-of-hand cash-out in rather than firing a second event — safe because exactly one of the two can be non-zero | `bank.ts`               |
| `incomingFrom`                                                               | **DLR-80.** The program's only `PlayerSide` → `DuelSide` crossing, replacing the retired `duelSideDamage`. Keyed by the side each figure **depletes**: the player eats `damageToPlayer`, the Quarry eats `cashOut`                                        | `bank.ts`               |
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
- [Skulls](skulls.md) — how skulls are assigned to the Quarry's dealt hand from the injected `rng`,
  why they live as a list on `RoundState` rather than a field on a card, the never-rank-1 rule, why a
  trick is skulled if *any* card in it is, and how `SuitShape` makes "never reveal a rank" a property
  of the type rather than of the component (DLR-80).
- [The bank, the streak, and the cash-out](bank-and-cash-out.md) — the four-outcome table, what a
  taken trick and a hit each do, why the end-of-hand cash-out folds into the sixth trick's resolution
  instead of firing separately, why there is no division anywhere in the new arithmetic, and
  `incomingFrom` as the single seat → side crossing (DLR-80).
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
  largest production file is `scoring.ts` at 225 lines after DLR-70's extraction and two new
  functions (it overtook `cpuPlayer.ts` at 171, which had itself overtaken `playCard.ts`, now 117,
  when DLR-52 added the intent telegraph). Measure with `(Get-Content <file>).Count`, never
  `Measure-Object -Line` — see [../hunt/README.md](../hunt/README.md) for the DLR-63 breach that
  proved why.
- **The round-long rule-break's narrowing is defined once, consulted twice** (DLR-51) —
  `quarryRuleBreak.ts`'s `monarchFollowSet`/`monarchFollowApplies` are the sole source of truth for
  both `legalMoves`'s narrowing and `playCard`'s rejection-reason branch, so the legal set and the
  reason code explaining a rejection cannot disagree. `abilities.ts` is untouched by this
  mechanism — the round-long path reuses the single-card path's exact narrowing rather than adding
  a second, independent implementation of "Swan or highest."
- **"Not complete and the Quarry's turn" implies the Quarry holds a card** (DLR-52) — this is what
  makes `quarryIntent`/`commitQuarryMove`'s phase-and-turn guard sufficient without a separate
  `legalMoves(...).length === 0` check. `dealRound` gives each side exactly `HAND_SIZE` cards;
  `playCard` removes exactly one card from the acting side's hand on every path (the Fox and
  Woodcutter branches in `abilities.ts` each net −1); and `playCard` derives `phase` directly from the
  incremented count in the same state rebuild (`tricksPlayed === HAND_SIZE ? RoundPhase.Complete :
  RoundPhase.AwaitingLead`), so the two can never disagree.
  Hand size is therefore
  pinned to `HAND_SIZE - tricksPlayed` for whichever side `currentTurn` names, and `legalMoves` only ever
  narrows a non-empty hand or falls back to the whole hand — it never turns a non-empty hand into an
  empty legal set. Any future change to `playCard`'s hand accounting or to when `phase` becomes
  `Complete` invalidates this reasoning and re-exposes `lowestCard`'s empty-array crash.
- **`RoundState.quarryCharacter` is write-once** (DLR-51) — only `dealRound` ever sets it; every
  other state update in this tree rebuilds `RoundState` by spreading, so the field cannot toggle
  mid-round by construction. Proven, not just argued: a seeded simulation in `cpuPlayer.test.ts`
  asserts the field is unchanged after every play of a hand.
- **`RoundState.skulledCards` is write-once too** (DLR-80), and for the same structural reason —
  only `dealRound` sets it, and every other update spreads the previous state forward. A skull can
  therefore neither appear nor vanish mid-hand, which is what lets `trickIsSkulled` be a pure
  membership test rather than something that has to reason about when it is being asked.
- **`lastResolution` is cleared on a lead** (DLR-80). `playCard`'s one-card early return writes
  `lastResolution: null`, so a resolution cannot outlive the trick it describes and be rendered
  against the next one.

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
- **Treasure and Poison now do nothing at all beyond their printed rank.** Both are ordinary
  playable cards during the trick — no play-time ability, unlike Fox/Woodcutter/Witch/Monarch — and
  since DLR-67 removed the ±1 scoring fold they carry no scoring intervention either. They remain
  **named ranks** (`CardRank.Treasure`, `CardRank.Poison`) because §1 keeps rank 7's identity as a
  named card; what, if anything, they come to mean is an open design question for a later ticket.
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
- **The whole of the previous scoring layer was deleted by DLR-80**, and the entries this list used
  to carry about it went with it. `scoring.ts` (`scoreHunt`, `huntDamage`, `pendingHuntDamage`,
  `duelSideDamage`, `HuntNotScorable`), `spoils.ts` and `declareHunt.ts` no longer exist, along with
  the enumeration spec that pinned the Standing tables against the design document and the stale
  `playCard.ts` comment about which pile `spoils` summed. The per-render cost note went with them
  too: `resolveTrickBank` is a fixed number of additions over exactly two cards, called once when a
  trick completes rather than once per render, so there is nothing left on a hot path to consider
  memoising.
- **The Quarry does not avoid *leading* a skulled card** (DLR-80). `chooseCpuCard`'s skull-dump
  branch applies only when following; the lead is the unchanged lowest-legal-card rule. This is the
  deliberate minimum the ticket scoped — a lead-time skull-avoidance rule is a second behaviour with
  its own feel consequences — and it means the Quarry will sometimes lead a skull and be trivially
  dodged. It is the obvious next CPU improvement, and the play-test measurement that will surface it
  is counting how many dodges were decisions rather than gifts.
- **The skull rank distribution is uniform and untested.** `assignSkulls` takes `density` and
  `minRank` as defaulted parameters precisely so a low or high skew is a one-line change at the call
  site, but which way to skew is a design decision the developer makes after playing, not something
  this module should pick.
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
- **No target of any kind.** DLR-67 retired the Demand outright — there is no threshold to clear,
  no verdict, and no surplus reward. §1's duel direction replaces "did you beat a number" with
  "how much damage did each side deal", and only the first half of that exists here.
- **Persistence/serialisation.** Nothing in this module reads or writes storage; `RoundState` is an
  in-memory shape only.
- **The special, goal, and poison expansion modules.** Only the base 33-card deck is representable —
  no expansion card exists anywhere in this tree, by construction (`ALL_SUITS` × `RANKS` only).
