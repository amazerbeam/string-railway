_Part of [War Council](README.md)._

The Win/Lose declaration (DLR-63) is the Hunt's opening decision and the engine's second and third
mutators. This file covers the two entry points, the four guards that make a credit spend
self-adjudicating, and why the whole feature leaves the multiplicative half of the score equation
untouched.

### Why the declaration is engine state

`RoundState` gained one **optional** field, `declaration?: DeclarationState`, carrying
`{ path, creditsRemaining, creditedCards, creditedThrough }`.

It lives here rather than in the UI reducer because **a Lose-credit is spent mid-round and the set of
credited cards determines the score.** `src/app/warCouncil/` is under a standing rule that it
re-implements no game rule — `legalMoves` decides what is tappable, `playCard` decides what commits,
`scoreHunt` decides the score. A reducer tracking "which lost tricks did I credit" would be
adjudicating a scoring rule, so `RoundUiState` gained no field at all (see
[../war-council-ui/interaction-and-state.md](../war-council-ui/interaction-and-state.md)).

**Optional, not required, and one nested object rather than four siblings.** Both choices follow
`quarryCharacter?`'s precedent from DLR-51 and were argued from a count: DLR-63's planning audit found
**22 hand-built `RoundState` literals** across the specs and `roundFixture.ts`, every one of which a
required field would have broken for no gain. Absent means undeclared, and one nested object gives a
reader exactly one absence check.

### `declareHunt` — two guards

`declareHunt(state, path, loseCredits)` in `declareHunt.ts` writes the declaration once and rejects
`AlreadyDeclared` (the field is already set) or `HuntUnderway` (`tricksPlayed > 0`, or a card is
already on the table). On the Win path `creditsRemaining` is written as `0` by construction, so a Win
declaration can never carry a spendable pool.

`loseCredits` arrives as a **parameter rather than being read from config here** — that is what keeps
this module free of `LOSE_CREDITS_PER_HUNT` and lets a test vary the pool without touching the live
tunable (see [../hunt/scoring-tunables.md](../hunt/scoring-tunables.md)).

`playCard` gained one matching rejection reason, `IllegalMoveReason.HuntNotDeclared`, checked directly
after `RoundComplete`: no card may be played before the Hunt is declared. It is structurally
unreachable through the shipped UI, since the declare gate renders before the fan becomes
interactive — it is carried as a guard against a future caller that skips the gate. It is the **only**
new `IllegalMoveReason` member, so it forced exactly one new entry in the exhaustive
`ILLEGAL_MOVE_MESSAGE` copy map. The declare and claim rejections deliberately stay in their own
closed unions rather than joining that one: `ILLEGAL_MOVE_MESSAGE` is rendered as a *hand-card*
rejection hint, and a claim rejection is never that.

One consequence worth knowing before writing a spec against this module: **the guard is a breaking
change to any fixture that builds an undeclared round and plays into it.** DLR-63 had to add a
declaration to roughly 22 pre-existing specs across five files (`playCard.test.ts`,
`cpuPlayer.test.ts`, `quarryIntent.test.ts`, and, in `src/app/warCouncil/`, `roundReducer.test.ts`
and `WarCouncilRound.test.tsx`). Two of those files were outside the planned file list — the audit of
"which fixtures declare" undercounted, and the correct remedy is always to declare in the fixture,
never to weaken the guard.

### `claimLostTrick` — four guards, and the one that matters

`claimLostTrick(state, trick)` spends one credit on a trick the player lost, appending that trick's
two cards to `declaration.creditedCards`. **`capturedCards` and `tricksWon` are untouched** — the
Quarry genuinely took the trick and it still counts toward the Quarry's total; only the player's
Spoils changes.

`rejectionFor` checks four conditions in order:

| Reason | Condition |
| --- | --- |
| `NotDeclaredLose` | no declaration, or the path is Win |
| `NoCreditsRemaining` | `creditsRemaining <= 0` |
| `TrickAlreadyCredited` | `tricksPlayed <= creditedThrough` |
| `TrickNotLost` | the supplied trick is not the ordered tail of the Quarry's capture pile |

**`TrickNotLost` is the interesting one.** `isQuarryPileTail` establishes that the Quarry won the
trick by checking the supplied two cards against the last two entries of `capturedCards[QUARRY_SIDE]`,
in order. `playCard` appends exactly `[lead, follow]` to the **winner's** pile on every resolved
trick, so that tail *is* the just-lost trick, read off the engine's own recorded outcome.

This is deliberately **not** a re-run of `resolveTrickWinner`, which would be unsound: the Fox can
exchange the decree and mutate `trumpSuit` *inside the very trick being resolved*, so the trump suit
recorded after the fact is not necessarily the one that decided the trick (see
[trick-resolution-and-play.md](trick-resolution-and-play.md) for that ordering).

The cost of the choice is a coupling: **any change to `playCard`'s capture accounting — what it
appends, or in what order — silently invalidates this guard.** A comment sits at both ends, on
`isQuarryPileTail` here and above the `capturedCards` rebuild in `playCard.ts`. Because the 33-card
deck holds no duplicate card, no two distinct tricks can produce an identical tail, so the match
cannot be spoofed by a legitimate recurrence.

**`creditedThrough` is the idempotence guard.** It records `tricksPlayed` at the moment of the last
spend. A credit may only be spent on the trick that has just resolved and `tricksPlayed` strictly
increases, so a second claim on one trick is a rejection rather than a double-credit. That holds
independently of the UI: both entry points are pure and non-mutating, so React StrictMode's
double-invocation of a reducer cannot double-credit even setting the watermark aside.

`canClaimLostTrick(state, trick)` is the predicate the screen derives its claim control from, and it
**shares `rejectionFor` with the mutator** — so the offer the player sees and the guard that
adjudicates it cannot disagree. The UI derives it every render rather than storing it.

### Two-branch `spoils`, and why AC4/AC5 hold by construction

`spoils(state, side, cardValue = cardBaseValue, inverted = invertedCardValue)` in `spoils.ts` now
branches once:

- **Lose declared and `side` is the player** — reduce over `declaration.creditedCards` at `inverted`.
  The capture pile is deliberately not read: the Quarry took those tricks.
- **Every other case** — undeclared, Win declared, or the Quarry's own side — the pre-DLR-63 reduce
  over `capturedCards[side]` at `cardValue`, byte for byte.

That second branch being *unchanged* is what makes the ticket's AC2 ("Win works exactly as today")
provable by the **existing** suite rather than by new tests: no pre-existing fixture declares, and
undeclared scores identically to Win. Both new parameters are optional defaults, so `scoreHunt` and
the Hunt screen's running-Spoils readout needed no edit at all.

The Treasure(+1)/Poison(−1) fold is shared by both branches through the private `sumCards` helper —
a credited trick is a Spoils event, so the same adjustment applies. On the Lose path a Poison 8 scores
`(12 − 8) − 1 = 3`.

**`creditedTrickWorth(cards, inverted?)` exists because the fold was briefly duplicated.** DLR-63's
first implementation had `TrickWell` compute its pre-claim preview with its own raw sum over
`invertedCardValue`, omitting the ±1 — so the number shown before spending a credit disagreed by one
with the Spoils actually credited whenever the trick held a Treasure or a Poison. Two reviewers caught
it independently. The fix was to extract the shared function rather than to fix the copy: the preview
and the score now call the same code, and the divergence is structurally impossible. **Never re-derive
a credited trick's worth at a call site** — that is precisely the bug this export exists to prevent.

The important structural property of all of the above: **`scoreHunt` already delegated to `spoils` and
read `tricksWon` for the band, so the multiplicative term never learns the declaration exists.** AC4's
"one Standing table for both paths" and AC5's "unchanged Demand check" therefore hold by construction,
not by discipline — `resolveStanding`, `tricksToPoints`, `STANDING_BANDS`, `scoreHunt`, and
`checkDemand` are all untouched by the ticket. DLR-63's final verification greps
`src/hunt/config.ts` and `src/warCouncil/scoring.ts` for `declaration|HuntDeclaration|creditedCards`
and expects zero hits; that grep is the structural proof, and it is cheaper to re-run than to reason
about.

> **A known consequence, not a defect.** Declaring Lose steers toward a low trick count, which lands
> in the Humble band — the band `hybrid-design.md` §6 proves is dominated at ×6. AC4 forbids touching
> a multiplier here, so the Lose path is expected to look weak until the multipliers are tuned. See
> [../../game_rules/the-hunt.md](../../game_rules/the-hunt.md)'s Known tensions.
