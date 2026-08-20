# War Council — `src/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70, DLR-80, DLR-81, DLR-83, DLR-90, DLR-91, DLR-92, PT-001, PT-002

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

**PT-002 changed what the bank counts, and nothing else in the loop.** It banked both cards' printed
ranks until 2026-08-14; it now banks **1 per trick taken**, so both terms of the cash-out equation
are the streak length and a streak of _n_ cashes exactly `n × n` — 1, 4, 9, 16, 25, 36 across a hand.
`resolveTrickBank` reads no card at all as a result and lost its `trickCards` parameter. The four
outcomes, the reset, the `finalTrick` fold and `incomingFrom` are untouched.

**DLR-90 added a second marker on a card, and the first rule that can make a lost trick free.**
`envenomedCards` mirrors `skulledCards` field for field, written by a new module `envenom.ts` that
deliberately shares no helper with `skulls.ts`. Inside `resolveTrickBank` one guarded flag —
`trick.envenomTrick && outcome === TrickOutcome.CleanLoss` — skips the hit half entirely, so a marked
trick the Quarry wins cleanly costs **no health** and leaves the **bank and multiplier standing**
rather than resetting them. That is the whole reason the item is worth buying: it gives a card the
player already expects to lose with a reason to be played. The player-side case needs no counterpart —
a marked trick the player wins is already a `CleanWin`, and the delayed hit follows the **winner**, so
the symmetry is structural rather than a mirrored rule. `playCard` computes the fifth fact and judges
none of it. See [the Envenom mark](the-envenom-mark.md).

**DLR-91 gave the reset a second trigger, and gave `playCard` three facts it cannot compute itself.**
Poison stopped being paid at a hand boundary and became part of the **next trick's own damage**, which
put it inside this module's rules for the first time: `TrickFacts` gained `poisonToPlayer`,
`poisonToQuarry` and `poisonGuarded`, and the player's share now reaches the **same** cash-out branch a
lost trick reaches — so a streak in progress is spent at a moment the player did not choose, unless a
**Poison Guard** is held. `damageToPlayer` moved out of that branch, because the health is owed whether
or not the streak resets; `TrickResolution` gained `poisonToQuarry` and `poisonGuardSpent`; and
`incomingFrom` now sums the Quarry's cash-out with its poison, staying the single seat → side crossing.
The three facts are **handed in** through a widened `PlayCardOptions`, because the pending queue lives
on `EncounterState` and `src/hunt/` must not learn what a `RoundState` is. Nothing about the marker
itself changed. See [the bank and the cash-out](bank-and-cash-out.md).

## Key types & exports

| Export                                                                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | File                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `WarCouncilState`                                                            | Alias for `RoundState` — the engine's real per-round state shape, replacing SCRUM-19's `unknown` placeholder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `index.ts` / `types.ts` |
| `RoundState`                                                                 | Both hands, draw pile, decree/trump, tricks won, in-progress trick, leader, tricks played, phase, and (DLR-80) `skulledCards`, `bank`, `multiplier` and `lastResolution`, plus (DLR-90) `envenomedCards`. **DLR-80 removed `capturedCards` and `declaration`** — the capture piles fed only Spoils, and the bank replaced it. **DLR-81 removed `quarryCharacter`** — the Quarry has no rule-break, so no engine state names one. **`envenomedCards` is required, not optional**, matching `skulledCards` for its reason: required → optional makes every consumer's assumption wrong, and the compiler enumerating all 18 construction sites is the cheap half of that trade | `types.ts` |
| `Suit`, `PlayerSide`, `RoundPhase`, `AbilityChoiceKind`, `IllegalMoveReason` | `as const` string-value maps (no TS `enum` — `erasableSyntaxOnly`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `types.ts`              |
| `CardRank`                                                                   | Named ranks for every rank with an ability or scoring rule (`Swan: 1, Fox: 3, Woodcutter: 5, Treasure: 7, Poison: 8, Witch: 9, Monarch: 11`) — every branch that keys off one of these ranks references this map, never a bare numeric literal                                                                                                                                                                                                                                                                                                                                                           | `types.ts`              |
| `Card`, `TrickCard`, `AbilityChoice`, `PlayCardResult`                       | Supporting shapes — a card, a card-plus-side in a trick, a discriminated ability-choice payload, and `playCard`'s `{ ok: true, state } \| { ok: false, reason }` result                                                                                                                                                                                                                                                                                                                                                                                                                                  | `types.ts`              |
| `otherSide`, `currentTurn`                                                   | `otherSide` flips a `PlayerSide`; `currentTurn` derives whose turn it is from `currentTrick`/`leader`. **`declaredPath` was deleted by DLR-80** with the declaration it read                                                                                                                                                                                                                                                                                                                                                                                                                             | `types.ts`              |
| `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`     | Structural card-equality helpers shared by every module below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `cardUtils.ts`          |
| `createDeck`                                                                 | Builds the 33-card base deck (3 suits × ranks 1–11, one of each)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `deck.ts`               |
| `shuffle`                                                                    | Fisher-Yates shuffle, `rng: () => number` is caller-injected — no internal `Math.random()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `shuffle.ts`            |
| `dealRound`                                                                  | Deals one hand: **`HAND_SIZE` (6) cards a side, a 20-card draw pile**, one decree card whose suit sets trump; assigns the Quarry's skulls from the same injected `rng`; seeds `bank`/`multiplier` at 0 and `lastResolution` at `null`. **Two parameters** — DLR-81 removed the third, `quarryCharacter`                                                                                                                                                                                                                                                                                                  | `deal.ts`               |
| `legalMoves`, `monarchFollowSet`                                             | Pure query: what a side may legally play right now — follow suit, narrowed to Swan-or-highest **only when a rank 11 was the led card**, and identically for both sides. **DLR-81 removed the round-long disjunct**                                                                                                                                                                                                                                                                                                                                                                                       | `legalMoves.ts`         |
| `resolveTrickWinner`                                                         | Pure query: given a completed `[lead, follow]` trick and the current trump suit, who won                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `resolveTrick.ts`       |
| `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick`            | The three ability effects that mutate `RoundState` directly                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `abilities.ts`          |
| `QUARRY_SIDE`                                                                | The seat the Quarry plays (`PlayerSide.Cpu`), so a future mode that seats it as the player has one place to change. Seat vocabulary only — **DLR-81 moved it here from the deleted `quarryRuleBreak.ts`**                                                                                                                                                                                                                                                                                                                                                                                                | `types.ts`              |
| `playCard`                                                                   | The single reducer-shaped entry point — the only way to mutate `RoundState`. Its rejection-reason branch mirrors `legalMoves`' own led-rank-11 condition, so the legal set and `MustFollowMonarch` cannot disagree                                                                                                                                                                                                                                                                                                                                                                                       | `playCard.ts`           |
| `assignSkulls`, `skullableCards`, `weightedDraw`, `isSkulled`                | **DLR-80; draw reworked by PT-001.** Assignment for one dealt hand at `SKULL_DENSITY`, drawn against a **weight-per-rank curve** (`SKULL_RANK_WEIGHTS`) from the **injected `rng`** — never `Math.random`, so a seeded deal reproduces its skulls. `weightedDraw` picks without replacement at **exactly one `rng` call per card**, which is what preserves that. Density (how many) and weights (which ranks) are orthogonal defaulted parameters, so a curve is testable at one call site. `skullableCards` filters on positive weight — "never rank 1" is `1: 0` in every curve, not a separate floor | `skulls.ts`             |
| `suitShape`, `SuitShape`                                                     | **DLR-80.** One row per suit — `{ suit, held, skulled }` — in `ALL_SUITS` order, including a zero row for a stripped suit. **Carries no rank field**, so the never-reveal-a-rank rule is enforced by the type rather than by the component                                                                                                                                                                                                                                                                                                                                                               | `skulls.ts`             |
| `trickIsSkulled`                                                             | Whether a completed trick carries a skull — `true` if **any** card in it does. Tests the trick rather than a seat, so a card changing hands mid-hand needs no special case (DLR-80) | `skulls.ts` |
| `isEnvenomed`, `trickIsEnvenomed`, `envenomCard`                             | **The Envenom marker (DLR-90), and deliberately a SEPARATE module from `skulls.ts`.** DLR-90 states poison is a wholly separate marker from a skull, and two markers sharing a helper is how they stop being separate — so nothing here reads `skulledCards` and nothing there reads `envenomedCards`, and the boundary is visible in the file tree rather than only in a comment. `trickIsEnvenomed` tests the **trick** for the same reason `trickIsSkulled` does: the Fox can exchange a marked card into the decree and the player's Fox can take it back, so a marked card can be played by either side within one hand. `envenomCard` **throws** on a card not in hand or already marked — `addCheat`'s discipline, because a silent no-op would spend a charge for a mark that was never made — and the reducer guards all three conditions before calling it | `envenom.ts` |
| `TrickOutcome`, `trickOutcomeFor`, `isTaken`                                 | **DLR-80.** The four-outcome table as a total function of two booleans (`CleanWin`/`Dodge` take the trick, `CleanLoss`/`SkullWin` take damage), plus whether an outcome banks or hits — read from a total `Record`, so a fifth outcome is a compile error                                                                                                                                                                                                                                                                                                                                                | `bank.ts`               |
| `resolveTrickBank`, `BankState`, `TrickResolution`, `TrickFacts`             | **DLR-80 — the whole scoring loop in one pure function; what it banks reworked by PT-002, one rule added by DLR-90, a second cash-out trigger by DLR-91, and a purchasable climb by DLR-92.** Banks **`1 + bankClimbBonus` per trick taken** and increments the streak by exactly 1, so with an empty shop both terms climb together and a streak of _n_ cashes `n × n` — and with `w` Whetstones owned it cashes `(1 + w) × n²`; cashes `bank × multiplier`, deals `DAMAGE_PER_HIT` and resets both on a hit. `finalTrick` folds the end-of-hand cash-out in rather than firing a second event — safe because exactly one of the two can be non-zero. **DLR-90 replaced the four positional booleans with a `TrickFacts` parameter object** when the fourth became a fifth: `resolveTrickBank(START, true, false, false, false)` is unreadable, and a transposed pair type-checks cleanly and produces plausible numbers on a function that decides both bars. A call-shape change with no behaviour change — every pre-existing assertion in `bank.test.ts` holds unedited through it. `TrickResolution` also gained `envenomTarget: DuelSide \| null`, typed `DuelSide` because this module is already **the** one crossing between the two vocabularies. **DLR-92 added an eighth fact, `bankClimbBonus`**, required so the compiler enumerates its one producer; it is floored to 0 unless a positive integer, because it is the only figure this module does not compute itself and it feeds a rendered health bar. `bank` still holds a trick count under its old name | `bank.ts` |
| `PlayCardOptions`                                                            | **DLR-91.** `playCard`'s options parameter, **extending `LegalMoveOptions`** so one object still satisfies `legalMoves`. Carries the poison owed to each side at this trick and whether a Poison Guard is held — **not legality**, which is why it is a separate type rather than three more fields on the one `legalMoves` reads. Handed in by the reducer because the pending queue is on `EncounterState` and `src/hunt/` must not learn about `RoundState`. **DLR-92 widened it with `bankClimbBonus?: number`** for the same reason in the other direction: the Whetstone count is a run figure and `src/warCouncil/` must not learn `RunState`, so the reducer — which holds both — hands in a plain number. Optional here and required on `TrickFacts`, so the Quarry's call sites needed no edit | `legalMoves.ts` |
| `incomingFrom`                                                               | **DLR-80.** The program's only `PlayerSide` → `DuelSide` crossing, replacing the retired `duelSideDamage`. Keyed by the side each figure **depletes**: the player eats `damageToPlayer`, the Quarry eats `cashOut` **plus any poison paid at this trick (DLR-91)** — summed here rather than at the call site, so this stays the only crossing                                                                                                                                                                                                                                                                                                                                                                                       | `bank.ts`               |
| `chooseCpuCard`, `chooseCpuFoxChoice`, `chooseCpuWoodcutterChoice`           | The three independently-testable sub-decisions of the CPU heuristic — card choice, and the Fox/Woodcutter ability choices                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `cpuPlayer.ts`          |
| `chooseCpuMove`, `CpuMove`                                                   | Composes the three sub-decisions into one `{ card, choice? }` move                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `cpuPlayer.ts`          |
| `quarryIntent`, `QuarryIntent`, `QuarryIntentStance`                         | The telegraph's preview of the Quarry's next move (DLR-52) — `{ suit, stance? }` or `null` when there is no move to describe; never the exact card, and `stance` is `Leading`/`Pressing`/`Ducking`                                                                                                                                                                                                                                                                                                                                                                                                       | `cpuPlayer.ts`          |
| `commitQuarryMove`                                                           | Plays the move `quarryIntent` previewed (DLR-52) — a guarded pass-through over the unmodified `chooseCpuMove` + `playCard`, returning `playCard`'s `PlayCardResult` unchanged                                                                                                                                                                                                                                                                                                                                                                                                                            | `cpuPlayer.ts`          |

## How it works

- [Deck and dealing](deck-and-dealing.md) — the 33-card base deck, the Fisher-Yates shuffle, and
  how `dealRound` deals hands, the decree, and the draw pile.
- [Legal moves and the odd-card abilities](legal-moves-and-abilities.md) — what's playable at any
  moment, the led-Monarch exception, the four non-Witch/Monarch ability effects (Fox, Woodcutter,
  Swan, Treasure), why the Quarry has **no** rule-break (DLR-81 removed the one DLR-51 built), and
  the **Cheat bypass** — `LegalMoveOptions`, the one sanctioned way to lift a legality rule, and why
  making it a parameter rather than a state field is what keeps it out of the Quarry's reach (DLR-83).
- [Trick resolution and `playCard`](trick-resolution-and-play.md) — how a trick's winner is
  decided (including the Witch's "counts as trump" rule and the Fox's trump-mutation ordering), and
  `playCard`'s full order of operations as the module's single mutator.
- [Skulls](skulls.md) — how skulls are assigned to the Quarry's dealt hand from the injected `rng`,
  the **weighted without-replacement draw** and why it consumes exactly one `rng` call per card, why
  they live as a list on `RoundState` rather than a field on a card, the never-rank-1 rule as a zero
  weight, why a trick is skulled if _any_ card in it is, and how `SuitShape` makes "never reveal a
  rank" a property of the type rather than of the component (DLR-80, PT-001).
- [The bank, the streak, and the cash-out](bank-and-cash-out.md) — the four-outcome table, what a
  taken trick and a hit each do, **why a streak of _n_ cashes exactly `n × n`** now that the bank
  counts tricks rather than card values, why the end-of-hand cash-out folds into the sixth trick's
  resolution instead of firing separately, why there is no division anywhere in the new arithmetic,
  and `incomingFrom` as the single seat → side crossing (DLR-80, PT-002).
- [The bank, the streak, and the cash-out](bank-and-cash-out.md) also now covers **the two sources of
  a hit** and the 2-or-3 arithmetic poison produces (DLR-91), and **the purchasable per-trick climb** —
  `1 + bonus` on a taken trick, why it multiplies the whole curve instead of topping up a cash-out, the
  floor-to-0 guard that keeps a spoiled figure out of a health bar, and **the four-layer route by which a
  run figure reaches a module that must not know what a run is** (DLR-92).
- [The Envenom mark, and the clean loss it replaces](the-envenom-mark.md) — `envenomedCards` and why
  it mirrors `skulledCards` field for field, why `envenom.ts` is a separate module from `skulls.ts`
  rather than a shared marker list, `envenomCard`'s throw and why the reducer makes it safe, **the
  replaced-`CleanLoss` rule and why it is keyed on the outcome rather than on "the Quarry won"** (a
  Dodge is also a Quarry win, and it is one the player banks), why the player-side case needs no
  counterpart, why `envenomTarget` names a side but no figure and no timing (which is why DLR-91 needed
  no edit to it), the `TrickFacts` refactor, and why the marker
  is engine state at all (DLR-90).
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
- **The Quarry has no rule-break, and a soak test keeps it that way** (DLR-81) — `legalMoves` reads
  only the led card and the follower's hand; no function in this tree branches on which seat is
  acting. The guard is a 60-seed simulation in `cpuPlayer.test.ts` asserting that every follow's
  legal set equals plain follow-suit unless a rank 11 was led, with both branches proven non-vacuous.
  This is a **regression guard, not a description** — it exists because the power shipped once
  already, unexamined, and cost five forced follows in twelve tricks before a play session caught it.
- **The Monarch narrowing is defined once, consulted twice** — `legalMoves.ts`'s `monarchFollowSet`
  is the sole source of truth for both `legalMoves`'s narrowing and `playCard`'s rejection-reason
  branch, so the legal set and the reason code explaining a rejection cannot disagree.
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
- **`RoundState.skulledCards` is write-once** (DLR-80) —
  only `dealRound` sets it, and every other update spreads the previous state forward. A skull can
  therefore neither appear nor vanish mid-hand, which is what lets `trickIsSkulled` be a pure
  membership test rather than something that has to reason about when it is being asked.
- **`lastResolution` is cleared on a lead** (DLR-80). `playCard`'s one-card early return writes
  `lastResolution: null`, so a resolution cannot outlive the trick it describes and be rendered
  against the next one.

## Deferred / not yet implemented

- **Nothing raises the multiplier's climb, and that is DLR-92's stated scope boundary** rather than an
  oversight. `resolveTrickBank`'s `multiplier += 1` takes no bonus and no `ShopItem` maps to one; a spec pins
  the multiplier at exactly `+1` across three bonus values so the boundary cannot erode quietly. The twin
  item is named as the natural next addition in `version-4-scope.md` §1, and the affordance is already here —
  `bank` and `multiplier` are two independent fields, which PT-002 kept apart for precisely this and DLR-92
  used the first half of. Building it means a second optional field on `PlayCardOptions`, a second required
  one on `TrickFacts`, and a sibling to `bankClimbBonusFor` on the `hunt` side.
- **Nothing on the felt says why the bank is climbing faster** (DLR-92). `BankMeter` renders the running
  bank and multiplier, so a player owning two Whetstones sees the bank jump by 3 a trick with nothing naming
  the cause — the only surface stating what they own is the shop's purse cell, which is not on screen during
  a fight. This is the third item in a row with that shape (see the poison and Poison Guard entries in
  [../hunt/README.md](../hunt/README.md)), and no rule required a readout, so none was invented.
- **Meta-game-aware or search-based CPU play.** `chooseCpuMove` (SCRUM-26) treats every War Council
  round identically regardless of any broader run state — no lookahead, no determinized search, and
  no awareness of anything beyond the current `RoundState`. The Vanguard board engine and
  battle-loop orchestrator this module's isolation was originally scoped against were both removed
  by DLR-47; a later ticket in the DLR-46 epic (the Hunt run loop) decides what, if any, run-level
  context ought to feed the CPU's decisions, and this module's public surface is unaffected either
  way — `chooseCpuMove` takes only a `RoundState` today.
- **The intent telegraph renders, but its pacing is unstyled.** DLR-53 gave `quarryIntent` and
  `commitQuarryMove` their first production callers: the Hunt screen reads the intent every render,
  and `roundReducer.ts` now commits the Quarry's _lead_ through `commitQuarryMove` (its
  `advanceQuarryLead` path) while still using `chooseCpuMove` for the _follow_, which needs the
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
  too: `resolveTrickBank` is a fixed handful of integer additions, called once when a trick completes
  rather than once per render, so there is nothing left on a hot path to consider memoising. **PT-002
  reduced that further** — it no longer reads either card.
- **The `bank` field's name no longer describes what it holds** (PT-002). It is a **trick count**,
  not a rank sum, and renaming it (`streakTricks`, say) was deliberately left out of a play-test
  ticket — it would touch `bank.ts`, `playCard.ts`, `types.ts`, `deal.ts`, `roundReducer.ts`,
  `WarCouncilRound.tsx`, `BankMeter.tsx` and roughly ten test files. Every one is compiler-checked, so
  the rename is safe whenever someone wants it. `types.ts` and `bank.ts`'s doc comments were restated
  to say "the number of tricks taken in a row", so the identifier is the only thing left describing
  the retired model. **Whether to rename it is the developer's call.**
- **Nothing yet moves the two terms independently** (PT-002). `bank` and `multiplier` are kept as two
  fields specifically so a planned one-time-use **"+1 ×"** item can push the multiplier without
  touching the trick count — but no item, shop, or currency exists, so today the two are always equal
  for the whole of a streak. The shape is the affordance; the consumer is a later contract.
- **The Quarry does not avoid _leading_ a skulled card** (DLR-80). `chooseCpuCard`'s skull-dump
  branch applies only when following; the lead is the unchanged lowest-legal-card rule. This is the
  deliberate minimum the ticket scoped — a lead-time skull-avoidance rule is a second behaviour with
  its own feel consequences — and it means the Quarry will sometimes lead a skull and be trivially
  dodged. It is the obvious next CPU improvement, and the play-test measurement that will surface it
  is counting how many dodges were decisions rather than gifts.
- **The skull rank curve is chosen but unplayed** (PT-001). The distribution is no longer uniform:
  `SKULL_RANK_WEIGHTS` is the hump curve, weighted onto the middle ranks. That was a developer
  decision taken from a simulation rather than from play, so the weights are expected to move —
  which way is theirs to say after a session, not this module's to pick.
- **No opponent selects its own curve** (PT-001). `SKULL_WEIGHTS_UNIFORM`, `_RAMP` and `_AMBUSH` are
  exported and have **no production reader on purpose** — they are the difficulty and variety lever
  for a later opponent, and the `ideas.md` entry records why. **Do not delete them as dead code.**
  Wiring one to an opponent needs `Quarry`/`Hunt` to carry a curve and `dealRound` to thread it to
  `assignSkulls`'s fourth parameter, which is a later contract; the parameter is already there.
- **No Quarry character has a power, and what a power would even be is undecided** (DLR-81). The
  five character names exist as identity labels only. Powers are intended for a **final boss** rather
  than for every opponent, and nothing about their shape has been designed — so there is no
  "add each the same way" recipe here, deliberately. A future ticket designs the mechanic first.
  Note for whoever picks it up: `legalMoves` currently takes no character input at all, which is the
  property the soak test protects; adding one is a deliberate re-opening, not a small extension.
- **Every engine measurement recorded before 2026-08-13 was taken against the removed power.** The
  play sessions that produced the current design — and the skull tuning questions below — ran against
  a Quarry that narrowed the player's follow on every lead. Treat pre-DLR-81 numbers as provisional.
- **No target of any kind.** DLR-67 retired the Demand outright — there is no threshold to clear,
  no verdict, and no surplus reward. §1's duel direction replaces "did you beat a number" with
  "how much damage did each side deal", and only the first half of that exists here.
- **Persistence/serialisation.** Nothing in this module reads or writes storage; `RoundState` is an
  in-memory shape only.
- **The special, goal, and poison expansion modules.** Only the base 33-card deck is representable —
  no expansion card exists anywhere in this tree, by construction (`ALL_SUITS` × `RANKS` only).
