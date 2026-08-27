# War Council — `src/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-19, SCRUM-20, SCRUM-26, DLR-47, DLR-49, DLR-50, DLR-51, DLR-52, DLR-63, DLR-66, DLR-67, DLR-68, DLR-69, DLR-70, DLR-80, DLR-81, DLR-83, DLR-90, DLR-91, DLR-92, DLR-94, DLR-96, DLR-100, DLR-109, DLR-125, DLR-143, DLR-146, DLR-149, DLR-150, PT-001, PT-002

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
`primedCards` mirrors `skulledCards` field for field, written by a new module `timebomb.ts` that
deliberately shares no helper with `skulls.ts`. Inside `resolveTrickBank` one guarded flag —
`trick.timebombTrick && outcome === TrickOutcome.CleanLoss` — skips the hit half entirely, so a marked
trick the Quarry wins cleanly costs **no health** and leaves the **bank and multiplier standing**
rather than resetting them. That is the whole reason the item is worth buying: it gives a card the
player already expects to lose with a reason to be played. The player-side case needs no counterpart —
a marked trick the player wins is already a `CleanWin`, and the delayed hit follows the **winner**, so
the symmetry is structural rather than a mirrored rule. `playCard` computes the fifth fact and judges
none of it. See [the Timebomb mark](the-timebomb-mark.md).

**DLR-91 gave the reset a second trigger, and gave `playCard` three facts it cannot compute itself.**
Timebomb stopped being paid at a hand boundary and became part of the **next trick's own damage**, which
put it inside this module's rules for the first time: `TrickFacts` gained `timebombToPlayer`,
`timebombToQuarry` and `blastGuarded`, and the player's share now reaches the **same** cash-out branch a
lost trick reaches — so a streak in progress is spent at a moment the player did not choose, unless a
**Blast Guard** is held. `damageToPlayer` moved out of that branch, because the health is owed whether
or not the streak resets; `TrickResolution` gained `timebombToQuarry` and `blastGuardSpent`; and
`incomingFrom` now sums the Quarry's cash-out with its Timebomb, staying the single seat → side crossing.
The three facts are **handed in** through a widened `PlayCardOptions`, because the pending queue lives
on `EncounterState` and `src/hunt/` must not learn what a `RoundState` is. Nothing about the marker
itself changed. See [the bank and the cash-out](bank-and-cash-out.md).

**DLR-94 gave the module a third kind of cash-out and split the old one into two rates.** Until
2026-08-20 the bank cashed on exactly two events, both of them things that *happened* to the player: a
hit, and the sixth trick arriving. `voluntaryCashOut.ts` adds one the player **chooses** — it spends the
streak into the Quarry in full, at no cost in health, and leaves the trick mid-flight so play carries on
by the ordinary rules. Its counterpart in `bank.ts` is that a hit the player did *not* choose now pays
only a configured fraction — two-thirds, floored — through the new `forcedCashValue`, while `cashValue`
states the plain product once so all three cash-outs agree about what they are a share of. The
end-of-hand fold deliberately keeps paying in full. **It is not a fifth `TrickOutcome`**, and the reasons
are worth reading before anyone tries to make it one — see
[the voluntary cash-out](voluntary-cash-out.md). It is also the codebase's **first fractional rule**;
the numerator/denominator pair in `src/hunt/config.ts` is a correctness measure, not a style choice.

**DLR-109 gave this rule a cost and a delay, though `voluntaryCashOut.ts`'s own arithmetic is
unchanged.** `cashBankNow` and `incomingFromCashOut` still compute the same figures they always did;
what changed is that the reducer now **queues** the result instead of dealing it in the same
transition, and the committing press costs `APPLY_DAMAGE_AP_COST` action points. This module's
contribution is the availability half: `applyDamageRefusalFor` grew two clauses, `PayoutPending` and
`InsufficientAp`, extending the existing single-source-of-truth pattern rather than adding a second
one. The delay, the landing, and the wipe-on-damage rule live in `src/hunt/`'s
[delayed Apply Damage payout](../hunt/delayed-apply-damage-payout.md).

**DLR-96 added no code, only proof that DLR-89 through DLR-95 actually compose.** It is a verification
ticket against the seven run-economy tickets above, not a feature — a static audit of every shared
interface (`bank.ts`'s three cash-out paths, `RunState`'s fields, the three refusal unions) found the
composition already correct, so the ticket's whole deliverable is the test that makes the specific
claim below checkable rather than merely asserted in a docblock:
`src/warCouncil/__tests__/bank.integration.test.ts` buys two Whetstones through the real
`buyFromShop`, reads the resulting `bankClimbBonusFor`, drives it through three real
`resolveTrickBank` calls, and asserts a forced hit's `forcedCashValue` reads the **boosted** bank
`resolveTrickBank`'s own docblock already described — not the bare figure a Whetstone-free run would
produce. A companion test, `src/hunt/__tests__/run.integration.test.ts`, does the equivalent for
every epic-added `RunState` field at once (see [../hunt/README.md](../hunt/README.md)). A live
five-touchpoint browser playthrough (all four shop categories, a flask drink, a voluntary Apply
Damage, and a quick-kill payout) found nothing beyond what the static audit already confirmed; a
stage-boss kill and its flask refill were not reached live and remain a developer judgement call
rather than a defect.

**DLR-100 added a fifth standalone mechanic module beside `voluntaryCashOut.ts`, and it is the first
one that generalises an existing convention rather than inventing a new one.** `discard.ts` swaps 1
to `MAX_CARDS_PER_DISCARD` cards from a hand for the same count off the front of `drawPile`,
appending the discarded cards to its back — `applyWoodcutterDraw`'s own one-card
"draw one, bury one on the bottom" convention, generalised to n. It follows `voluntaryCashOut.ts`'s
shape exactly: a `DiscardRefusal` `as const` reason-code map, a `DiscardStock` interface of plain
values, a `discardRefusalFor(stock)` predicate read by both the reducer's guard and the rail
control's disabled state, and an `applyDiscard` that throws on a violated precondition the reducer
already checked — never on a UI-reachable path. This module's whole contribution is the swap and its
refusal; the budget it draws down lives on `RunState` in `src/hunt/` (see
[../hunt/the-discard-budget.md](../hunt/the-discard-budget.md)), and the moment it may be spent is
computed in `src/app/warCouncil/roundUiState.ts`, because that predicate reads `RoundUiState` fields
(`resolvedTrick`, `prompt`, `cpuFault`) with no meaning inside `RoundState`. See
[The discard — the swap and its refusal](the-discard.md).

**DLR-146 refilled the player's hand mid-hand, and in doing so retired the oldest quiet assumption
in this module.** The player is topped back up to `PLAYER_HAND_FLOOR` (4) cards as each trick
resolves, so a hand's widths run 6, 5, 4, 4, 4, 4 instead of 6, 5, 4, 3, 2, 1 and the last tricks are
still choices. The Quarry is untouched — dealt `HAND_SIZE`, plays `HAND_SIZE`, draws nothing — and
the hand still ends when its sixth trick resolves, now with cards left in the player's hand for
`closeHand` to sweep. The consequence is larger than the feature: **the draw pile can shrink within a
hand for the first time**, which made `applyDiscard`'s `RangeError` reachable inside a reducer and let
`applyWoodcutterDraw` destructure `undefined` into a hand. One new primitive, `drawCards`, is now the
single way a card leaves the draw pile mid-hand — it folds the spent pile back in under a seeded
shuffle when the pile runs short — and five sites route through it. See
[the hand refill](the-hand-refill.md).

## Key types & exports

| Export                                                                       | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | File                    |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `WarCouncilState`                                                            | Alias for `RoundState` — the engine's real per-round state shape, replacing SCRUM-19's `unknown` placeholder                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `index.ts` / `types.ts` |
| `RoundState`                                                                 | Both hands, draw pile, decree/trump, tricks won, in-progress trick, leader, tricks played, phase, and (DLR-80) `skulledCards`, `bank`, `multiplier` and `lastResolution`, plus (DLR-90) `primedCards` and (DLR-146) `drawSeed`. **DLR-80 removed `capturedCards` and `declaration`** — the capture piles fed only Spoils, and the bank replaced it. **DLR-81 removed `quarryCharacter`** — the Quarry has no rule-break, so no engine state names one. **`primedCards` is required, not optional**, matching `skulledCards` for its reason: required → optional makes every consumer's assumption wrong, and the compiler enumerating all 18 construction sites is the cheap half of that trade | `types.ts` |
| `Suit`, `PlayerSide`, `RoundPhase`, `AbilityChoiceKind`, `IllegalMoveReason` | `as const` string-value maps (no TS `enum` — `erasableSyntaxOnly`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `types.ts`              |
| `CardRank`                                                                   | Named ranks for every rank with an ability or scoring rule (`Swan: 1, Fox: 3, Woodcutter: 5, Treasure: 7, Poison: 8, Witch: 9, Monarch: 11`) — every branch that keys off one of these ranks references this map, never a bare numeric literal                                                                                                                                                                                                                                                                                                                                                           | `types.ts`              |
| `Card`, `TrickCard`, `AbilityChoice`, `PlayCardResult`                       | Supporting shapes — a card, a card-plus-side in a trick, a discriminated ability-choice payload, and `playCard`'s `{ ok: true, state } \| { ok: false, reason }` result                                                                                                                                                                                                                                                                                                                                                                                                                                  | `types.ts`              |
| `otherSide`, `currentTurn`                                                   | `otherSide` flips a `PlayerSide`; `currentTurn` derives whose turn it is from `currentTrick`/`leader`. **`declaredPath` was deleted by DLR-80** with the declaration it read                                                                                                                                                                                                                                                                                                                                                                                                                             | `types.ts`              |
| `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`     | Structural card-equality helpers shared by every module below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `cardUtils.ts`          |
| `RANKS`                                                                      | The eleven ranks, `1`-`11`, in order. Declared in `types.ts` since SCRUM-19 and **re-exported from the barrel by DLR-149** — unchanged in value, but the app layer's card-face model and its specs iterate it rather than restating the range | `index.ts` / `types.ts` |
| `createDeck`                                                                 | Builds the 33-card base deck (3 suits × ranks 1–11, one of each)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `deck.ts`               |
| `shuffle`                                                                    | Fisher-Yates shuffle, `rng: () => number` is caller-injected — no internal `Math.random()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `shuffle.ts`            |
| `dealRound`                                                                  | Deals one hand: **`HAND_SIZE` (6) cards a side, a 20-card draw pile** (which since DLR-146 SHRINKS during the hand rather than only being swapped against); **seeds `drawSeed` from the deal's own generator (DLR-146)**, one decree card whose suit sets trump; assigns the Quarry's skulls from the same injected `rng`; seeds `bank`/`multiplier` at 0 and `lastResolution` at `null`. **Two parameters** — DLR-81 removed the third, `quarryCharacter`                                                                                                                                                                                                                                                                                                  | `deal.ts`               |
| `legalMoves`, `monarchFollowSet`                                             | Pure query: what a side may legally play right now — follow suit, narrowed to Swan-or-highest **only when a rank 11 was the led card**, and identically for both sides. **DLR-81 removed the round-long disjunct**                                                                                                                                                                                                                                                                                                                                                                                       | `legalMoves.ts`         |
| `resolveTrickWinner`                                                         | Pure query: given a completed `[lead, follow]` trick and the current trump suit, who won                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `resolveTrick.ts`       |
| `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick`            | The three ability effects that mutate `RoundState` directly                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `abilities.ts`          |
| `QUARRY_SIDE`                                                                | The seat the Quarry plays (`PlayerSide.Cpu`), so a future mode that seats it as the player has one place to change. Seat vocabulary only — **DLR-81 moved it here from the deleted `quarryRuleBreak.ts`**                                                                                                                                                                                                                                                                                                                                                                                                | `types.ts`              |
| `playCard`                                                                   | The single reducer-shaped entry point — the only way to mutate `RoundState`. Its rejection-reason branch mirrors `legalMoves`' own led-rank-11 condition, so the legal set and `MustFollowMonarch` cannot disagree                                                                                                                                                                                                                                                                                                                                                                                       | `playCard.ts`           |
| `assignSkulls`, `skullableCards`, `weightedDraw`, `isSkulled`                | **DLR-80; draw reworked by PT-001.** Assignment for one dealt hand at `SKULL_DENSITY`, drawn against a **weight-per-rank curve** (`SKULL_RANK_WEIGHTS`) from the **injected `rng`** — never `Math.random`, so a seeded deal reproduces its skulls. `weightedDraw` picks without replacement at **exactly one `rng` call per card**, which is what preserves that. Density (how many) and weights (which ranks) are orthogonal defaulted parameters, so a curve is testable at one call site. `skullableCards` filters on positive weight — "never rank 1" is `1: 0` in every curve, not a separate floor | `skulls.ts`             |
| `suitShape`, `SuitShape`                                                     | **DLR-80.** One row per suit — `{ suit, held, skulled }` — in `ALL_SUITS` order, including a zero row for a stripped suit. **Carries no rank field**, so the never-reveal-a-rank rule is enforced by the type rather than by the component                                                                                                                                                                                                                                                                                                                                                               | `skulls.ts`             |
| `trickIsSkulled`                                                             | Whether a completed trick carries a skull — `true` if **any** card in it does. Tests the trick rather than a seat, so a card changing hands mid-hand needs no special case (DLR-80) | `skulls.ts` |
| `isPrimed`, `trickIsPrimed`, `primeCard`                             | **The Timebomb marker (DLR-90), and deliberately a SEPARATE module from `skulls.ts`.** DLR-90 states Timebomb is a wholly separate marker from a skull, and two markers sharing a helper is how they stop being separate — so nothing here reads `skulledCards` and nothing there reads `primedCards`, and the boundary is visible in the file tree rather than only in a comment. `trickIsPrimed` tests the **trick** for the same reason `trickIsSkulled` does: the Fox can exchange a marked card into the decree and the player's Fox can take it back, so a marked card can be played by either side within one hand. `primeCard` **throws** on a card not in hand or already marked — `addCheat`'s discipline, because a silent no-op would spend a charge for a mark that was never made — and the reducer guards all three conditions before calling it | `timebomb.ts` |
| `TrickOutcome`, `trickOutcomeFor`, `isTaken`                                 | **DLR-80.** The four-outcome table as a total function of two booleans (`CleanWin`/`Dodge` take the trick, `CleanLoss`/`SkullWin` take damage), plus whether an outcome banks or hits — read from a total `Record`, so a fifth outcome is a compile error                                                                                                                                                                                                                                                                                                                                                | `bank.ts`               |
| `resolveTrickBank`, `BankState`, `TrickResolution`, `TrickFacts`             | **DLR-80 — the whole scoring loop in one pure function; what it banks reworked by PT-002, one rule added by DLR-90, a second cash-out trigger by DLR-91, and a purchasable climb by DLR-92.** Banks **`1 + bankClimbBonus` per trick taken** and increments the streak by exactly 1, so with an empty shop both terms climb together and a streak of _n_ cashes `n × n` — and with `w` Whetstones owned it cashes `(1 + w) × n²`; cashes `bank × multiplier`, deals `DAMAGE_PER_HIT` and resets both on a hit. `finalTrick` folds the end-of-hand cash-out in rather than firing a second event — safe because exactly one of the two can be non-zero. **DLR-90 replaced the four positional booleans with a `TrickFacts` parameter object** when the fourth became a fifth: `resolveTrickBank(START, true, false, false, false)` is unreadable, and a transposed pair type-checks cleanly and produces plausible numbers on a function that decides both bars. A call-shape change with no behaviour change — every pre-existing assertion in `bank.test.ts` holds unedited through it. `TrickResolution` also gained `timebombTarget: DuelSide \| null`, typed `DuelSide` because this module is already **the** one crossing between the two vocabularies. **DLR-92 added an eighth fact, `bankClimbBonus`**, required so the compiler enumerates its one producer; it is floored to 0 unless a positive integer, because it is the only figure this module does not compute itself and it feeds a rendered health bar. `bank` still holds a trick count under its old name. **DLR-125 added `TrickFacts.buffs` and two `TrickResolution` fields (`buffAccrual`, `firedBuffIds`)** — required properties typed `| null`, following `swanKeepsBank`'s discipline so the compiler enumerates every construction site; evaluation happens **inside** this function, between the take/hit branch and the cash-out | `bank.ts` |
| `PlayCardOptions`                                                            | **DLR-91.** `playCard`'s options parameter, **extending `LegalMoveOptions`** so one object still satisfies `legalMoves`. Carries the Timebomb owed to each side at this trick and whether a Blast Guard is held — **not legality**, which is why it is a separate type rather than three more fields on the one `legalMoves` reads. Handed in by the reducer because the pending queue is on `EncounterState` and `src/hunt/` must not learn about `RoundState`. **DLR-92 widened it with `bankClimbBonus?: number`** for the same reason in the other direction: the Whetstone count is a run figure and `src/warCouncil/` must not learn `RunState`, so the reducer — which holds both — hands in a plain number. Optional here and required on `TrickFacts`, so the Quarry's call sites needed no edit. **DLR-125 added a sixth field, `buffs?: BuffHandInput`** — the hand-scoped buff input, optional for the same reason: absent is "this caller evaluates no buffs", which is exactly what the Quarry's call sites are |
| `buffTrickFactsFor`, `BuffHandInput`                                         | **DLR-125.** THE single producer of the per-trick half of the buff evaluation context — the suits and ranks the **player** played into this trick, and the suits left in their hand after the played card left it (which is what "at hand's end" means for Keepsake). Mirrors `swanTierFactsFor` exactly, and for the same reason: two readings of "what did the player play" is how a preview and a commit drift apart. Its two readers are `playCard.ts` and `cardDamage.ts`'s preview. `src/hunt/` cannot see `TrickCard`, so this crossing lives on **this** side of the boundary and hands `hunt` plain `BuffTargetSuit` values through a total `TARGET_SUIT` map — a member added to `Suit` is a compile error here rather than a silent `undefined` | `buffTrickFacts.ts`     | `legalMoves.ts` |
| `incomingFrom`                                                               | **DLR-80.** The program's only `PlayerSide` → `DuelSide` crossing, replacing the retired `duelSideDamage`. Keyed by the side each figure **depletes**: the player eats `damageToPlayer`, the Quarry eats `cashOut` **plus any Timebomb paid at this trick (DLR-91)** — summed here rather than at the call site, so this stays the only crossing                                                                                                                                                                                                                                                                                                                                                                                       | `bank.ts`               |
| `cashValue`, `forcedCashValue`                                               | **DLR-94.** The two rates a streak can cash at. `cashValue` is **the** statement of the plain product, so the three cash-outs cannot disagree about what they are a share of; `forcedCashValue` reduces it to the configured fraction and floors it, for the branch the player did not choose. It is the only reader of `FORCED_CASH_OUT_NUMERATOR`/`_DENOMINATOR` anywhere in `src/`, and it **multiplies before it divides** — `x * (2 / 3)` floors wrong on every multiple of 3, which is a correctness bug rather than a rounding preference. Both floor a degenerate input to 0 rather than letting a `NaN` reach a health bar; `forcedCashValue` throws a named `RangeError` on a bad denominator | `bank.ts`               |
| `cashBankNow`, `VoluntaryCashOut`                                            | **DLR-94.** The cash-out the player chooses: returns the round with **only** `bank` and `multiplier` zeroed and `cashOut` at the **full** `cashValue`. Everything else — `lastResolution`, `currentTrick`, `phase`, `leader`, both hands — passes through untouched, which is what makes "the trick carries on afterwards" a no-op rather than a rule. Deliberately **not** a fifth `TrickOutcome`: that would make `trickOutcomeFor` partial, give every `isTaken` consumer a non-trick case, and produce a `TrickResolution` describing a trick that never happened | `voluntaryCashOut.ts`   |
| `applyDamageRefusalFor`, `ApplyDamageRefusal`, `ApplyDamageStock`            | **DLR-94.** **The** single statement of whether Apply Damage is available — read by the reducer before it commits and by the plate to disable itself and print the reason, so the two cannot drift. Reasons are **codes, not sentences** (`labels.ts` keys them through a total `Record`), ordered `NotYourMove` → `TrickInProgress` → `PayoutPending` → `InsufficientAp` → `EmptyBank` because that is the reason that will still be true after the next trick banks. **DLR-143 replaced `TimebombPending` with `TrickInProgress`** (leader-only: refuses once any card is on the table) and deleted the reversed D6 rule that a pending Timebomb blocks the press — the two now stack. `ApplyDamageStock` is six plain values, never an `EncounterState` or a `RoundUiState` — the same discipline as `FlaskStock` | `voluntaryCashOut.ts`   |
| `incomingFromCashOut`                                                        | **DLR-94.** The seat → side crossing for a voluntary cash-out, named for the reason `incomingFrom`'s docblock gives. The player's entry is a hard `0` — "deals no damage to the player" is literally that line                                                                                                                                                                                                                                                                                                                                                                                     | `voluntaryCashOut.ts`   |
| `chooseCpuCard`, `chooseCpuFoxChoice`, `chooseCpuWoodcutterChoice`           | The three independently-testable sub-decisions of the CPU heuristic — card choice, and the Fox/Woodcutter ability choices                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `cpuPlayer.ts`          |
| `chooseCpuMove`, `CpuMove`                                                   | Composes the three sub-decisions into one `{ card, choice? }` move                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `cpuPlayer.ts`          |
| `quarryIntent`, `QuarryIntent`, `QuarryIntentStance`                         | The telegraph's preview of the Quarry's next move (DLR-52) — `{ suit, stance? }` or `null` when there is no move to describe; never the exact card, and `stance` is `Leading`/`Pressing`/`Ducking`                                                                                                                                                                                                                                                                                                                                                                                                       | `cpuPlayer.ts`          |
| `commitQuarryMove`                                                           | Plays the move `quarryIntent` previewed (DLR-52) — a guarded pass-through over the unmodified `chooseCpuMove` + `playCard`, returning `playCard`'s `PlayCardResult` unchanged                                                                                                                                                                                                                                                                                                                                                                                                                            | `cpuPlayer.ts`          |
| `DiscardRefusal`, `DiscardStock`, `discardRefusalFor`                        | **DLR-100.** The reason-code union — `NotAvailable` / `NoDiscardsRemaining` / `EmptySelection`, checked in that order (`windowOpen` first, mirroring `applyDamageRefusalFor`'s own ordering); the four plain values (`discardsRemaining`, `selecting`, `selectionSize`, `windowOpen`) the rule needs and nothing else, assembled by `roundUiState.ts`'s `discardStock` rather than passed a `RoundUiState`; and **THE** single statement of availability, read by both the reducer's guard and the rail control's disabled state so the two cannot drift                                            | `discard.ts`            |
| `applyDiscard`                                                               | **DLR-100.** The swap: `n` cards off `side`'s hand, the same `n` off the FRONT of `drawPile`, the discarded cards appended to its BACK — `applyWoodcutterDraw`'s convention generalised from one card to n. `drawPile.length` is invariant across the call. Throws a `RangeError` on a count outside `1..MAX_CARDS_PER_DISCARD` or a card not held by `side`, on a violated precondition the reducer already checked — reachable only from a driver bug, never a UI-reachable path. **DLR-146 routed the draw through `drawCards`, so `drawPile.length` is NO LONGER invariant across the call** — a short pile folds the spent pile back in and the two piles are repartitioned, all 33 still conserved. Its third guard is re-aimed at `drawPile.length + spentPile.length`, so it still names a genuine caller bug and no longer fires on a state the game can now reach | `discard.ts`            |
| `drawCards`, `DrawSource`, `DrawResult`                                      | **DLR-146.** THE single way a card leaves the draw pile mid-hand, and `dealPileFor`'s sibling: it draws off the FRONT of `drawPile` and, when the pile cannot cover the request, folds `spentPile` back in under `createSeededRng(drawSeed)` and keeps drawing. `DrawSource` is the three fields a draw needs and nothing else (`drawPile`, `spentPile`, `drawSeed`), which a `RoundState` satisfies structurally. **Returns fewer cards rather than throwing on an exhausted deck** — the shortfall is visible in `drawn.length` — but throws a `RangeError` on a negative or non-finite `count`. `DrawResult.reshuffled` is reported for specs and deliberately never written to `RoundState.reshuffled` | `encounterDeck.ts`     |
| `RoundState.drawSeed`                                                        | **DLR-146.** A plain integer, **required**, seeding a mid-hand reshuffle. Written once by `dealRound` off the deal's own generator (so it inherits `dealSeedFor`'s run/encounter/hand uniqueness) and replaced by `mixSeed(drawSeed, spentPile.length)` each time a reshuffle consumes it. An integer rather than an `Rng` closure because `RoundState` is plain, immutable, serialisable data. **Nothing to do with `reshuffled`**, which is a property of the DEAL and is never written mid-hand | `types.ts`             |
| `PlayCardOptions.handFloor`                                                  | **DLR-146.** The hand floor in force for this call. **Absent means `PLAYER_HAND_FLOOR`**, so no production call site passes it and the constant stays the single dial; it exists solely so the revert can be pinned at `0` and at `4` through the real code path rather than by mocking `../hunt`, which is lint-enforced pure | `legalMoves.ts`        |

## How it works

- [Deck and dealing](deck-and-dealing.md) — the 33-card base deck, the Fisher-Yates shuffle, and
  how `dealRound` deals hands, the decree, and the draw pile.
- [The encounter deck](the-encounter-deck.md) — how the deck's lifetime moved from hand-scoped to
  encounter-scoped (DLR-123): one shuffled 33 dealt from repeatedly, a spent pile that is never
  dealt from, the single reshuffle when the draw pile can no longer cover a whole deal, and why
  seeding the deal from `runSeed` made a hand reproducible for the first time.
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
  a hit** and the 2-or-3 arithmetic Timebomb produces (DLR-91), and **the purchasable per-trick climb** —
  `1 + bonus` on a taken trick, why it multiplies the whole curve instead of topping up a cash-out, the
  floor-to-0 guard that keeps a spoiled figure out of a health bar, and **the four-layer route by which a
  run figure reaches a module that must not know what a run is** (DLR-92).
- [The bank, the streak, and the cash-out](bank-and-cash-out.md) also now covers **the two rates a
  forced cash-out and a chosen one pay** — `cashValue` and `forcedCashValue`, why the fraction is a
  numerator over a denominator rather than a float, and why the end-of-hand fold deliberately keeps
  paying in full (DLR-94).
- [Applying damage — the cash-out the player chooses](voluntary-cash-out.md) — `cashBankNow` and what it
  pointedly does **not** touch, the one availability predicate both the reducer and the plate read,
  the refusal ordering and why it is that way round, `ApplyDamageStock`'s six plain values, why
  this is its own module rather than a fifth `TrickOutcome`, and — since DLR-109 — the AP cost and
  the two new refusal codes for a queued payout still in the air (DLR-94, DLR-109).
- [The Timebomb mark, and the clean loss it replaces](the-timebomb-mark.md) — `primedCards` and why
  it mirrors `skulledCards` field for field, why `timebomb.ts` is a separate module from `skulls.ts`
  rather than a shared marker list, `primeCard`'s throw and why the reducer makes it safe, **the
  replaced-`CleanLoss` rule and why it is keyed on the outcome rather than on "the Quarry won"** (a
  Dodge is also a Quarry win, and it is one the player banks), why the player-side case needs no
  counterpart, why `timebombTarget` names a side but no figure and no timing (which is why DLR-91 needed
  no edit to it), the `TrickFacts` refactor, and why the marker
  is engine state at all (DLR-90).
- [The CPU heuristic and the intent telegraph](cpu-heuristic.md) — `cpuPlayer.ts`'s five pure
  decision functions and what they do and don't know about, plus (DLR-52) the intent/commit split:
  how `quarryIntent` previews the Quarry's next move as a suit-and-stance shape without revealing
  the card, why both new entry points guard their own preconditions, and where the telegraph's
  fidelity is configured.
- [Buffs in the cash-out](buffs-in-the-cash-out.md) — why the evaluation call site is **inside**
  `resolveTrickBank` rather than before or after it (Hoarder needs the bank after the climb;
  Unbloodied needs to know whether the trick was a hit; and R3 puts Momentum inside the product and
  Blade outside it), which two of R3's five steps land here, the `payableCashOutBonus` /
  `markCashOutPaid` pair that makes R6's ceiling a per-**hand** bound, why the two new `TrickFacts`
  and `TrickResolution` fields are required rather than optional, `buffTrickFactsFor` as the single
  producer of the per-trick facts, `PlayCardOptions`' sixth field (DLR-125), and **`resolveTrickBank`
  supplying `!isTaken(outcome)` as `trickIsLoss`** so the skull inversion stays stated exactly once
  in this file and `src/hunt/` never re-derives it (DLR-150).
- [The hand refill and the mid-hand draw](the-hand-refill.md) — the player's hand topped back up to
  `PLAYER_HAND_FLOOR` as each trick resolves, why the refill sits after `resolveTrickBank` and is
  skipped on the final trick, why a floor of `0` is a missing code path rather than a flag,
  `drawCards` as the one mid-hand draw and the five sites that route through it, `drawSeed` and how a
  mid-hand reshuffle stays reproducible from the run seed, and what a hand now leaves behind for
  `closeHand` to sweep (DLR-146).
- [The discard — the swap and its refusal](the-discard.md) — `applyDiscard`'s bottom-of-pile
  generalisation of `applyWoodcutterDraw`, why `drawPile.length` is invariant across the call, the
  three refusal reasons and their ordering, why `windowOpen` is computed a layer up rather than here,
  and the defensive third throw guard added in the post-review fix pass (DLR-100).

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
  referenced via `CardRank.Swan` / `.Fox` / `.Woodcutter` / `.Treasure` / `.Timebomb` / `.Witch` /
  `.Monarch` at every production branch that keys off one of them (added during SCRUM-20's review
  fix pass for the original five, extended to Treasure/Timebomb by DLR-49; re-grepped in DLR-49's
  Final verification for a stray bare `rank === 7`/`rank === 8` — zero hits).
- **File-size budget** — every file in this tree is under the project's 400-line limit. Measured
  2026-08-26 (DLR-146): the largest production file is `bank.ts` at **373**, then `cpuPlayer.ts` at
  200, `playCard.ts` at 194 and `encounterDeck.ts` at 166. (`scoring.ts`, which this bullet used to
  name as the largest, was deleted by DLR-80.) Measure with `(Get-Content <file>).Count`, never
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
  **The QUARRY's** hand size is therefore
  pinned to `HAND_SIZE - tricksPlayed`, and `legalMoves` only ever
  narrows a non-empty hand or falls back to the whole hand — it never turns a non-empty hand into an
  empty legal set. **DLR-146 broke the pinning for the PLAYER only, and the reasoning survives
  intact**: the refill can only ever ADD cards to the player's hand, so a player hand that was
  non-empty stays non-empty and the guard's conclusion still holds. The Quarry never refills, which is
  what keeps the arithmetic exact on the side this guard is actually about. Any future change to `playCard`'s hand accounting or to when `phase` becomes
  `Complete` invalidates this reasoning and re-exposes `lowestCard`'s empty-array crash.
- **`RoundState.skulledCards` is write-once** (DLR-80) —
  only `dealRound` sets it, and every other update spreads the previous state forward. A skull can
  therefore neither appear nor vanish mid-hand, which is what lets `trickIsSkulled` be a pure
  membership test rather than something that has to reason about when it is being asked.
- **`lastResolution` is cleared on a lead** (DLR-80). `playCard`'s one-card early return writes
  `lastResolution: null`, so a resolution cannot outlive the trick it describes and be rendered
  against the next one.

## Deferred / not yet implemented

- **Nothing on the felt says a mid-hand reshuffle happened** (DLR-146). When a refill, a swap or a
  Woodcutter draw outruns the draw pile, `drawCards` folds the spent pile back in silently.
  `RoundState.reshuffled` keeps its documented deal-only meaning and is deliberately not written
  mid-hand, so the notice the felt already has cannot be reused for this. Whether the player should be
  told at all is a copy and visual call, left to the developer rather than invented here. It is the
  fourth item in a row with this shape — see the Whetstone and Timebomb entries above.
- **Seen cards can now come back inside a hand** (DLR-146). A mid-hand reshuffle folds cards both
  sides have watched resolve back into the draw pile, so a refill can hand the player a card taken
  three tricks ago. The between-hand reshuffle already did exactly this, so it is not a new kind of
  event — but it is newly visible *within* a hand and it weakens card-counting. Whether that reads as
  fine or as cheap is a judgement only playing answers.
- **Drawing a card on a trick the player did NOT take — the catch-up variant — is out of scope**
  (DLR-146). The floor alone was shipped first; if it reads flat, the catch-up draw is the named
  follow-up rather than a change to the floor.
- **The floor value `4` is the developer's and has not been played** (DLR-146). No code in this tree
  is correct only at `4`, and the whole suite is green at `0` as well, so the dial is safe to turn.
- **The discard's overlap with the Cheat is untouched, by design doc §6's own "open" ruling**
  (DLR-100). Both mechanics change what is playable, but through different levers — the Cheat lifts
  follow-suit on a committed card, the discard replaces cards before a trick starts — and this ticket
  built the discard without revisiting how the two interact. Nothing here forbids holding both
  active in the same fight; whether that combination wants a rule of its own is undecided.
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
  a fight. This is the third item in a row with that shape (see the Timebomb and Blast Guard entries in
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
- **Treasure and Timebomb now do nothing at all beyond their printed rank.** Both are ordinary
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
- **The special, goal, and Timebomb expansion modules.** Only the base 33-card deck is representable —
  no expansion card exists anywhere in this tree, by construction (`ALL_SUITS` × `RANKS` only).
