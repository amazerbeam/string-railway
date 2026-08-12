_Part of [War Council UI](README.md)._

DLR-63's presentation changes that survive: the declare gate, the hand's display order, and the card
face. None of them decides a rule — the engine's `declareHunt` does that (see
[../war-council/declaration-and-lose-path.md](../war-council/declaration-and-lose-path.md)).

> **DLR-67 deleted this file's fourth subject.** DLR-63 also shipped a **claim control** on each lost
> trick and a **credits cell** in the ledger, both serving the capped Lose-credit mechanic. §1 retires
> that mechanic outright, so the control, the cell, the `ClaimTrick` reducer action, the
> `CLAIM_REJECTION_MESSAGE` copy map and the `.wc-claim*` styles are all gone. The file was named
> `declare-gate-and-claim.md` until then. What the claim used to do is recorded once, in the engine's
> own doc under "What DLR-67 deleted".

### The declare gate is the felt cascade's first branch, not a modal

`WarCouncilRound.tsx` checks `ui.round.declaration === undefined` **before** `ui.cpuFault`,
`ui.resolvedTrick`, and `roundComplete`, so the gate precedes every other state the felt can be in.
`DeclareGate` renders in the existing `table` grid area.

That placement is the whole point. AC1 requires the player to see their **full dealt 13-card hand**
while declaring, and the hand fan is already the thing that shows it — so the fan stays mounted and
visible below the gate, merely non-interactive. A full-screen modal would have hidden the very thing
being judged.

`interactive` and `quarryToLead` are both extended with `ui.round.declaration !== undefined`, so no
card is tappable and the Quarry's lead is not offered until the declaration is made, and `deriveHint`
gains a branch reading "Declare Win or Lose". The engine's `playCard` carries a matching
`HuntNotDeclared` guard, which is therefore structurally unreachable from the shipped UI — it exists
for a future caller, not for this one.

**`DeclareGate` takes exactly one prop, `onDeclare`.** DLR-67 removed `demand` and `loseCredits`
along with the values they named. It computes nothing and holds no numeric literal: it names each
path through `HUNT_DECLARATION_NAME`, and the one number in its copy — the worked example "a 1 scores
11" — is read from `invertedCardValue(CardRank.Swan)` rather than typed as an 11, so a change to the
inversion pivot cannot leave the copy lying. Two sibling controls is under `game-ux`'s five-control
threshold, so they are ordinary tab stops with no roving tabindex.

**Its Lose copy now states the opposite of the rule, and is the developer's to rewrite.** The Lose
option reads "Cards invert — a 1 scores 11. Every trick you take still adds both its cards to your
Spoils, at those inverted values", and the foot line "Standing still comes from your trick count
either way — but the two paths band it differently." The foot line is still correct. **The first
sentence is not, as of DLR-69** (2026-08-12): under the pile swap a trick you take adds its cards to
the **Quarry's** total, not yours — the sentence asserts precisely what the swap reverses, and it is
the sentence a player reads at the moment they choose the path.

This was written when the own-pile reading was the live interim and was honest then. DLR-69 put every
UI file out of scope, so it could not fix the copy it invalidated. Three ways out were recorded for the
developer — accept it for the prototype, widen a later ticket by this one file, or a follow-up ticket —
and **the replacement wording is theirs to write**, since the gate's copy is the one place the game
explains its own scoring to a player in a sentence.

### The hand's display order — three keys, and why it is total

`sortHandForDisplay(hand)` in `handOrder.ts` returns a **copy** of the hand sorted on three keys, in
order:

1. **holding size descending** — the suit you hold most of sits leftmost
2. **`ALL_SUITS` order** (Bells, Keys, Moons) as the tie-break
3. **rank ascending** within a suit

The middle key is not decoration. Without it two suits of equal holding size would compare equal, and
the result would depend on `Array.prototype.sort`'s stability — an implementation detail. With it the
comparator is **total**, so the rendered order is deterministic.

Holding size is counted from the `hand` argument alone, which is what makes the order re-derive
correctly as the hand shrinks — and also what makes card position unstable across tricks, since a suit
can lose its leftmost slot mid-round. That is recorded as an accepted risk in
[README.md](README.md)'s Deferred section, not mitigated.

The suit axis was **developer-confirmed at DLR-63's planning gate (2026-08-11)**; the ticket's AC6 said
only "sorted by suit, then by rank" without naming either direction. **Rank ascending within a suit is
a chosen default, not a confirmed one** — descending would put the high cards leftmost, which reads
better on the Win path, while ascending puts the *valuable* cards leftmost under Lose, since low ranks
invert to high values. One line either way.

The mount applies the sort **once**, before both `HandFan` and `AbilityPrompt` receive the hand, so
`fanPlacement`'s indices and `useRovingTabIndex`'s tab-stop index automatically agree with what is on
screen. Passing the sorted hand to one and the dealt hand to the other would desynchronise the fan's
geometry from its keyboard order — the kind of bug that looks like a focus bug and is actually an
ordering bug.

### AC7's card face

`PlayingCard.tsx` needed **no JSX change at all**: the markup order stays as it was, and the suit mark
and ability pip become absolutely positioned in `warCouncilCards.css`. `.wc-card` gains
`border: 2px solid currentColor` — `currentColor` resolves against the `.wc-suit-*` rules that already
set each suit's colour, so **one declaration covers all three suits and introduces no new colour
token** — and its `justify-content` switches to `flex-start` so the rank keeps the optical centre of the
face once the mark leaves the column flow.

The three SVG `<symbol>` ids (`s-bells`, `s-keys`, `s-moons`) and `SUIT_SYMBOL_ID` are **untouched**:
this ticket moves the mark, it does not rename it. They bind by string, so a rename would type-check
cleanly and render nothing.

One consequence of `PlayingCard` always rendering a `<button>`, whatever the variant, is worth knowing
before writing a spec: a card in the `table` or `pile` variant is a **disabled** button, not a
non-button. A test that counts "how many controls does this state offer" with a bare
`getAllByRole('button')` therefore counts the played cards too. DLR-67's `TrickWell` spec filters to
enabled buttons for exactly this reason.

### The reducer's declare action

`RoundUiActionKind` gained `Declare` in DLR-63, and **`RoundUiState` gained no field** — the
declaration lives on `RoundState`, where the engine owns it. DLR-63's second action, `ClaimTrick`, and
its `handleClaimTrick` handler were deleted by DLR-67 with the mechanic they served.

`handleDeclare(state, path)` calls `declareHunt` and, on `ok`, replaces `round`. It treats a rejection
as a **no-op returning the input state by reference** — never a partial commit.

That silence is correct only because both of `declareHunt`'s rejections are structurally unreachable
through the shipped UI: the gate renders only while `declaration` is undefined. If a future change
makes either reachable, the no-op becomes a swallowed failure the player gets no feedback about, and
each rejection's copy already exists in `DECLARE_REJECTION_MESSAGE` waiting to be rendered.

The action adds no effect, timer, or listener — the module still has no `useEffect` or
`useLayoutEffect` anywhere.
