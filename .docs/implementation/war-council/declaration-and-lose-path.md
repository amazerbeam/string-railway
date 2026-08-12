_Part of [War Council](README.md)._

The Win/Lose declaration (DLR-63) is the Hunt's opening decision and the engine's second mutator.
This file covers the two guards that keep it write-once, the single statement of what an undeclared
round reads as, and what the Lose path is now that DLR-67 has retired the capped credit mechanic
that used to define it.

### Why the declaration is engine state

`RoundState` carries one **optional** field, `declaration?: DeclarationState`. Since DLR-67 that is
`{ path }` and nothing else.

It lives here rather than in the UI reducer because **the declaration selects the card-value scheme
and the Standing table both sides are scored on.** `src/app/warCouncil/` is under a standing rule
that it re-implements no game rule — `legalMoves` decides what is tappable, `playCard` decides what
commits, `scoreHunt` decides the damage. A reducer holding the declaration would be adjudicating a
scoring rule, so `RoundUiState` gained no field at all (see
[../war-council-ui/interaction-and-state.md](../war-council-ui/interaction-and-state.md)).

**Optional, not required, and still a nested object rather than a bare field.** Absent means
undeclared, and one nested object gives a reader exactly one absence check. DLR-63 argued the
optionality from a count — its planning audit found **22 hand-built `RoundState` literals** across
the specs and `roundFixture.ts`, every one of which a required field would have broken for no gain.
DLR-67 narrowed the object from four fields to one and deliberately did **not** flatten it to
`RoundState.path`, so that single-absence-check property survives.

### `declaredPath` — the undeclared default, stated once

`declaredPath(state)` in `types.ts` returns `state.declaration?.path ?? HuntDeclaration.Win`. It
sits beside `currentTurn`, the existing precedent for a pure derived reading of `RoundState`.

It exists because **"undeclared reads as Win" was about to be written in three places at once** —
`spoils`' value scheme, `scoreHunt`'s Standing table, and the status band's live readout. Before
DLR-67 that default was written inline once in the screen and implied twice by parameter defaults
that hard-coded the Win table. Three copies of a rule is three places for it to drift, so DLR-67
made it one function and pointed all three at it.

The reason the default is *Win* rather than an error or a null band: nothing has scored yet, and the
readouts need a table to display before the player declares. **Never write another
`?? HuntDeclaration.Win` at a call site** — that is exactly what this function exists to prevent.

### `declareHunt` — two guards

`declareHunt(state, path)` in `declareHunt.ts` writes the declaration once and rejects
`AlreadyDeclared` (the field is already set) or `HuntUnderway` (`tricksPlayed > 0`, or a card is
already on the table). It writes `{ path }` and nothing else.

**DLR-67 removed its third parameter.** It used to take a `loseCredits` pool, which arrived as a
parameter rather than being read from config so the engine stayed free of the tunable. Both the pool
and its tunable are gone; the two guards and both rejection reasons are unchanged.

`playCard` carries one matching rejection reason, `IllegalMoveReason.HuntNotDeclared`, checked
directly after `RoundComplete`: no card may be played before the Hunt is declared. It is
structurally unreachable through the shipped UI, since the declare gate renders before the fan
becomes interactive — it is carried as a guard against a future caller that skips the gate. The
declare rejections deliberately stay in their own closed union rather than joining
`ILLEGAL_MOVE_MESSAGE`, which is rendered as a *hand-card* rejection hint.

One consequence worth knowing before writing a spec against this module: **the guard is a breaking
change to any fixture that builds an undeclared round and plays into it.** DLR-63 had to add a
declaration to roughly 22 pre-existing specs across five files. The correct remedy is always to
declare in the fixture, never to weaken the guard.

### What the Lose path is now

The Lose path is, as of DLR-67, **entirely a scoring reading** — it changes what your cards are
worth and which Standing table bands your trick count, and nothing else. It adds no decision during
play.

- **Card values invert.** `cardValueFor(HuntDeclaration.Lose)` scores a rank `r` as `12 − r`, so a
  Swan (1) is worth 11 and a Monarch (11) is worth 1. See
  [../hunt/scoring-tunables.md](../hunt/scoring-tunables.md).
- **A different Standing table bands the trick count** — `standingTableFor(HuntDeclaration.Lose)`
  peaks at 4–6 tricks where the Win table peaks at 7–9 (DLR-66).
- **Both readings apply to both sides.** The declaration is the round's, not the player's, so
  `spoils(state, 'cpu')` uses the same scheme as the player's.

> **What DLR-67 deleted, and why it is worth knowing.** DLR-63 gave the Lose path a **capped
> credit mechanic**: a pool of `LOSE_CREDITS_PER_HUNT` credits, each spendable on a trick you had
> just lost to append its two cards to your own Spoils, guarded by four rejections
> (`NotDeclaredLose`, `NoCreditsRemaining`, `TrickAlreadyCredited`, `TrickNotLost`) and a
> `creditedThrough` watermark that made a spend idempotent. `hybrid-design.md` §1 retires it —
> "the three-credit mechanic and its four guards are replaced, not tuned" — in favour of a two-way
> pile swap. DLR-67 deleted `claimLostTrick.ts` whole, along with the three bookkeeping fields on
> `DeclarationState`, the `ClaimTrick` reducer action and the on-screen claim control. It is
> recoverable from git history, not from this ticket; `CLAUDE.md` records the `git show` incantation.

**The immediate consequence for play: the Lose path currently has no decision of its own between
tricks.** Where a resolved lost trick used to offer a two-way fork ("Claim these — N credits left" /
"Let it go"), every resolved trick now offers the same single carry-on control — thirteen fewer
forks per round. That is expected for the interim; DLR-68's pile swap is what gives the path its
texture back.

### Single-branch `spoils`, and the modifier that went with it

`spoils(state, side, cardValue = cardValueFor(declaredPath(state)))` in `spoils.ts` is now a plain
reduce over `state.capturedCards[side]` — each side paid for the cards it captured itself, at the
scheme the declaration puts in force. DLR-63's Lose branch, which summed `declaration.creditedCards`
instead, is gone with the mechanic that filled that array, and the private `sumCards` helper and the
exported `creditedTrickWorth` went with it.

**The Treasure(+1)/Poison(−1) fold was removed in the same move**, closing a gap DLR-66 had opened:
§1 states "no modifier of any kind touches either value", §9 deletes both rows with their
arithmetic, and `cardValueFor`'s own docblock already recorded them as Decided-removed — so keeping
the fold would have made `spoils` contradict the exact function it is now told to call. At ×5 a ±1
card modifier moved a Hunt by under 1% of the ceiling, which is what made it safe to drop rather
than re-home.

**This own-pile reading is a chosen interim, not the design.** §1 specifies a two-way pile swap;
DLR-68 owns it. DLR-67 collapsed the credit branch to the simplest coherent form rather than
jumping straight to the swap, so the intermediate state is a state someone could play, not a
half-migration.
