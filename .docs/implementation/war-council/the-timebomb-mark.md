Part of [War Council](README.md).

# The Timebomb mark, and the clean loss it replaces

DLR-90. A second marker on a card, wholly separate from the skull, and the one rule that makes it
worth 2 coins: **a marked trick the Quarry wins cleanly costs the player nothing at all.**

The queue the mark feeds and the charge that pays for it are `src/hunt/`'s — see
[Timebomb and the delayed hit](../hunt/timebomb-and-the-delayed-hit.md). This file owns the marker
itself and the change inside `resolveTrickBank`. **DLR-91 changed when the booked hit is paid and how
much each side pays, and needed no edit to the marker at all** — the reason is in
[`timebombTarget`](#timebombtarget-is-typed-duelside-and-that-is-where-the-crossing-already-lives)
below.

## `primedCards` mirrors `skulledCards`, field for field

`RoundState.primedCards` is a `readonly Card[]`, added immediately after `skulledCards` and
carried by every state spread thereafter. `dealRound` seeds it to `[]`. It is a **required** field
rather than an optional one, for the reason `skulledCards` is: required → optional makes every
consumer's assumption wrong, and the compiler enumerating all 18 construction sites across 12 spec
files is the cheap half of that trade.

The lifecycle is deliberately identical to the skull's, because the marker has the same problem to
solve: a card can change hands mid-hand. The Fox exchanges a card into the decree, and the player's
own Fox can later take that decree back into hand. So membership is tested against **the completed
trick**, never against a seat.

**Hand-scoped by construction.** `dealRound` rebuilds `RoundState`, so a mark cannot leak into the
next hand — and that is correct rather than a limitation: `HAND_SIZE` is 6 with six tricks, so every
card dealt is played and a mark normally resolves in the hand it was made. The one exception is a
marked card the Woodcutter buries on the bottom of the draw pile or the Fox exchanges away and the
player never takes back. **That simply wastes the charge**, and nothing guards it.

> **DLR-154 closed the larger half of that hole, 2026-08-31.** A marked card the player simply
> *sits on* no longer evaporates for free: it carries a **two-trick fuse** and detonates in the
> hand against the player when the fuse runs out. The fuse and its booking are the app layer's, not
> this module's — see
> [Priming a Timebomb](../war-council-ui/timebomb-priming-and-the-fuse.md) — and they change nothing
> here, because the fuse only counts **while the card is still in the player's hand**. A card buried
> by the Woodcutter or exchanged away by the Fox leaves the hand, so its fuse stops rather than
> firing, and that narrower case still wastes the spend with nothing to warn the player.

## `src/warCouncil/timebomb.ts` is a separate module from `skulls.ts`, on purpose

Three functions, and the separation is the design rather than a filing choice:

| Export             | What it does                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| `isPrimed`      | Membership by **suit and rank together**, via `containsCard`                |
| `trickIsPrimed` | `true` iff **any** card played into the trick carries the mark             |
| `primeCard`      | Writes the mark, throwing rather than no-op'ing                            |
| `unprimeCard`    | **DLR-154** — lifts the mark, throwing rather than no-op'ing (below)       |

DLR-90 states Timebomb is a wholly separate marker from a skull, and **two markers sharing a helper is
how they stop being separate.** Nothing in `timebomb.ts` reads `skulledCards`; nothing in `skulls.ts`
reads `primedCards`. The boundary is visible in the file tree rather than only in a comment, which
is what stops a later ticket "simplifying" them into one marker list with a kind field.

### `primeCard` throws, and the reducer is why that is safe

It raises a `RangeError` naming the card when the card is not in that side's hand, and again when the
card is already marked. That discipline was originally cited against `cheats.ts`'s `addCheat` — that
module is deleted (DLR-132) — for the same reason it still holds: **a silent no-op would let the
caller spend a charge for a mark that was never made.**

> **The reducer function that guards this call is renamed, DLR-132, 2026-08-24.** `commitTimebomb` is
> deleted; `primeTapped` in `src/app/warCouncil/roundReducer.ts` is `handleTapCard`'s replacement
> branch and keeps the same three guards verbatim (card in hand, not already primed, damage actually
> armed via `RoundUiState.timebombArmedDamage`) before calling `primeCard`. The Cheat side of the
> "checks before calling" comparison below is also gone: `handleTapCheat`/`hasCheat`/`removeCheat` no
> longer exist, because a Cheat is spent through the ordinary `handleTapBuff` two-tap flow, which
> re-reads its own refusal before committing rather than checking membership in a held list.

### `unprimeCard` mirrors it, and both callers guard first — DLR-154

Lifting a mark is `primeCard`'s mirror in every respect that matters: it throws a `RangeError`
naming the card when the card is **not** primed, for the same reason the writer throws — a silent
no-op would let a caller believe a mark was lifted that was never there. It returns
`primedCards.filter(...)` by `sameCard`, so it removes exactly the one card.

Both of its callers live in `src/app/warCouncil/` and both guard with `isPrimed` before calling,
because a reducer must not throw during an event handler: `handleRemoveBuff`'s Timebomb branch,
which is how a riding Timebomb is now taken back, and `timebombMarks.ts`'s two lift helpers, which
retire a mark that has detonated — in hand, or by being played. **This module still decides nothing
about when either happens.**

`roundReducer.ts`'s `commitTimebomb` guarded all three conditions — the charge count, membership, and
the existing mark — *before* calling it, exactly as `handleTapCheat` checked `hasCheat` before
`removeCheat`. A reducer must not throw, because a throw during an event handler unmounts the tree.
So both throws are reachable only from a driver bug, and a failed guard clears the selection rather
than half-applying it. A spec dispatches a tap with a card that is not in hand and asserts a state
comes back rather than a `RangeError` escaping.

## The rule: a marked `CleanLoss` is *replaced*, not added to

Inside `resolveTrickBank`, one guarded flag:

```ts
const replaced = trick.timebombTrick && outcome === TrickOutcome.CleanLoss
```

When it is true the hit half of the function is skipped entirely — so `damageToPlayer` stays 0,
`cashOut` stays 0, and `bank` and `multiplier` pass through **untouched** rather than resetting. The
player loses the trick by the normal rules and pays nothing for it, and the streak they had built
survives.

That is the item's whole point: it gives a card the player already expects to lose with a reason to
be played instead of being dead weight.

### Keyed on `CleanLoss`, not on "the Quarry won" — and that distinction is load-bearing

The literal ticket wording is "if the Quarry won the primed trick". Applied literally it would be
a defect, because **a Dodge is also a trick the Quarry won** — and a Dodge is a trick the *player
banks*. Zeroing its `bankAdded` would delete a bank the player had already earned.

`CleanLoss` is the only outcome where a Quarry win costs the player anything, so it is the only one
with something to replace. The two readings agree everywhere the override does anything, and this one
cannot regress a Dodge. A spec pins it: a marked skull trick the Quarry wins still reports
`TrickOutcome.Dodge`, still banks 1, and matches an unmarked Dodge's bank and multiplier exactly.

### AC6 needs no counterpart, and gets none

A marked trick the **player** wins is already a `CleanWin`. It falls through to the ordinary branch,
banks 1, climbs the multiplier, and the delayed hit lands on the player at the next trick's resolution
instead of on the Quarry. There is no mirrored rule and no second branch — the symmetry is structural, because
`timebombTarget` follows the **winner** rather than a side named in a rule. A spec asserts a marked
`CleanWin` is field-for-field identical to an unmarked one across `bank`, `multiplier`, `bankAdded`,
`cashOut` and `damageToPlayer`.

**A marked trick that is also a skull trick and that the player wins still costs the skull's
damage**, on top of the delayed hit — it resolves as an ordinary `SkullWin`. That falls out of the
same rules rather than from a branch: the override waives only the Quarry-win case, and nothing
suppresses a skull the player chose to eat. (A **Blast Guard** does not suppress it either — the Guard
gates the Timebomb trigger alone, never a trick's own hit.) It is the harshest available reading of a case no
acceptance criterion names, and it is flagged for the developer rather than settled.

**The end-of-hand cash still applies over a preserved bank.** A replaced clean loss on the sixth
trick cashes `bank × multiplier` through the existing `finalTrick` fold — the bank survived, so there
is something there to cash. That is the existing rule acting on a bank that lived, not a new rule.

## `timebombTarget` is typed `DuelSide`, and that is where the crossing already lives

`TrickResolution.timebombTarget: DuelSide | null` — the side owed the delayed hit, or `null` when the
trick carried no mark. **This module names no figure and no timing**, which is why DLR-91 splitting the
amount into a per-side pair *and* retiming the payment needed no edit here at all, and why DLR-132
making the figure depend on the primed card's own tier needed none either: the target is a side, the
app layer's `commit` (`commitHandlers.ts`) now supplies the damage pair directly to `queueTimebomb`
rather than this module or `encounter.ts` looking one up (`timebombDamageFor` is deleted), and the
reducer still decides when it is settled.

`DuelSide` rather than `PlayerSide` is deliberate. `bank.ts` is already **the** one crossing between
the two vocabularies — `incomingFrom`'s docblock says so — and it already imports `DuelSide` from
`../hunt`. Typing the target as a `DuelSide` here means the reducer receives a side it can hand
straight to `queueTimebomb` with **no second crossing to get backwards**. A dealer-keyed record would
let a caller deplete the wrong bar and produce plausible numbers forever, which is exactly the class
of bug that convention exists to prevent. No new cross-module import and no import cycle is created.

## `TrickFacts` — why four booleans became a parameter object

`resolveTrickBank(before, playerWon, skullTrick, finalTrick)` became
`resolveTrickBank(before, trick: TrickFacts)` in the same pass, because this change added a fifth
fact and `resolveTrickBank(START, true, false, false, false)` is unreadable at the call site — and,
worse, **a transposed pair of booleans type-checks cleanly and produces plausible numbers.** On a
function that decides both bars and the whole streak, that is the failure mode worth spending a
refactor on.

One production caller (`playCard.ts`) and 14 spec call sites converted. It is a **call-shape change
with no behaviour change**, and the evidence is that every pre-existing assertion in `bank.test.ts`
still holds unedited through the conversion.

**It paid for itself one ticket later.** DLR-91 added a sixth, seventh and eighth fact —
`timebombToPlayer`, `timebombToQuarry`, `blastGuarded` — as three named properties on the same object,
where the positional form would have been an eight-argument call with five booleans in it. The
conversion was made for a fifth fact and the fifth is not what justified it.

## `playCard` computes the fifth fact and decides nothing

The only change to it. It already computed `trickIsSkulled(next.skulledCards, completedTrick)` and
handed it down; it now computes `trickIsPrimed(next.primedCards, completedTrick)` the same way:

```ts
const lastResolution = resolveTrickBank(
  { bank: next.bank, multiplier: next.multiplier },
  {
    playerWon: winner === PlayerSide.Player,
    skullTrick: trickIsSkulled(next.skulledCards, completedTrick),
    finalTrick,
    timebombTrick: trickIsPrimed(next.primedCards, completedTrick),
    // DLR-91 — forwarded from `PlayCardOptions`, defaulting to 0 / 0 / false. `playCard` cannot
    // derive these: the pending queue is on `EncounterState`, which it has no access to.
    timebombToPlayer: options?.timebombToPlayer ?? 0,
    timebombToQuarry: options?.timebombToQuarry ?? 0,
    blastGuarded: options?.blastGuarded ?? false,
  },
)
```

Every rule lives in `resolveTrickBank`, and DLR-90's and DLR-91's with them. This function reports facts
about a trick; it judges none of them. The three DLR-91 facts it does not even compute — it forwards
them, which is what keeps `src/hunt/` and `src/warCouncil/` from having to know about each other's
state. See [the Cheat bypass](legal-moves-and-abilities.md) for the options parameter they arrive on.

## Why the marker is engine state at all

Keeping it in `RoundUiState` was the alternative, and it was rejected on the replaced-loss rule. By
the time the reducer sees a resolved trick, `playCard` has **already** written the reset `bank` and
`multiplier` onto `RoundState` — so honouring "the bank and multiplier are preserved" from the UI
layer would mean the reducer rewriting engine state and re-deriving rules `resolveTrickBank` owns.
Two readings of one rule is the drift this codebase is organised to prevent.

## Cost

`isPrimed` and `trickIsPrimed` are `containsCard` scans over lists bounded by `HAND_SIZE` (6)
and a two-card trick, so both are effectively constant and neither allocates. `primeCard` allocates
one array of at most six entries, once per mark. Nothing here runs per pointer move — the fastest
surface upstream is a card tap, at human speed — and no memoisation was added anywhere.
