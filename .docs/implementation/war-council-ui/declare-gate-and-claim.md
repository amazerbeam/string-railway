_Part of [War Council UI](README.md)._

DLR-63's four presentation changes: the declare gate, the claim control, the hand's display order, and
the card face. None of them decides a rule — the engine's `declareHunt`, `canClaimLostTrick`,
`claimLostTrick`, and `creditedTrickWorth` do that (see
[../war-council/declaration-and-lose-path.md](../war-council/declaration-and-lose-path.md)).

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

`DeclareGate` computes nothing: it takes `demand`, `loseCredits`, and `onDeclare`, names each path
through `HUNT_DECLARATION_NAME`, and holds no numeric literal for either the Demand or the credit pool.
Two sibling controls is under `game-ux`'s five-control threshold, so they are ordinary tab stops with
no roving tabindex.

### The claim decision folds onto a tap the player was already making

A lost trick already stopped on a held reveal with one "tap the table to carry on" control. When a
claim is available, `TrickWell`'s existing `resolvedTrick` branch renders the mockup's `.wc-claim-row`
instead: a `.wc-claim` button ("Claim these — N credits left"), a `.wc-decline` button ("Let it go"),
and a `.wc-claim-worth` line above them. When `claimable` is false it renders exactly the previous
single carry-on button, unchanged.

**Tap count per trick is therefore unchanged.** `handleClaimTrick` in `roundReducer.ts` spends the
credit and then falls through to the existing `handleCarryOn` body, so claiming and carrying on are one
transition — which is what keeps the most-repeated action in the game at its previous cost. Both new
buttons reuse `handleHintClick`'s `event.stopPropagation()` guard against the felt's own `onClick`, and
both are native `<button type="button">` with no manual key handler (see
[interaction-and-state.md](interaction-and-state.md) for why: native `Enter`/`Space` activation for
free, and no double-dispatch risk).

`claimable` is **derived every render** from the engine's own `canClaimLostTrick`, never stored — the
same rule `runningSpoils`, `band`, and `intent` already follow. A stored copy could only go stale
against `ui.round`, and both calls are pure and bounded (a 13-card sort; a two-card tail comparison).
Because the offer and the guard share one predicate, the button cannot appear for a claim the engine
would reject.

`TrickWell` shows what the claim is *worth* before it is spent, and that number comes from the engine's
`creditedTrickWorth` rather than from a local sum. **This is worth knowing because the first
implementation got it wrong**: it summed `invertedCardValue` directly and omitted the
Treasure(+1)/Poison(−1) fold, so the previewed number disagreed by one with the Spoils actually
credited whenever the trick held a Treasure or a Poison — an informed decision quietly built on a
wrong number. The approved `mockup.html`'s own demo JS has the same gap and never exposed it, because
its illustrative trick uses ranks 1 and 6. **The mockup is a layout and interaction reference, not a
specification for a scoring formula.**

### The credits readout, and the `0` that must not vanish

`HuntLedger` renders a final `.wc-ledger-cell.wc-is-credits` cell only when
`declaration?.path === HuntDeclaration.Lose`, keyed "Credits", carrying
`aria-label="Lose-credits remaining: N"` and a `wc-is-spent` modifier at zero. It reads
`declaration.creditsRemaining` rather than counting anything.

The count renders as a **bare `{declaration.creditsRemaining}` expression, never behind a truthiness
gate.** `{count && …}` renders nothing when `count` is `0`, and `0` is a real and important value here
— it is the state in which the player has no credits left. A spec asserts the zero case explicitly for
exactly this reason.

`WarCouncilRound.tsx` renders `HuntLedger` only through `RoundStatusBand`, so the `declaration` prop is
threaded through that intermediate component alongside the `demand`/`spoils`/`band` it already forwards.

The cell is the **second** ever added to `.wc-status`, and the first one shipped entirely off-screen at
phone width — see [layout-and-styling.md](layout-and-styling.md)'s narrow/short collapse section. It
sits inside `.wc-ledger` so it inherits the `flex-wrap: wrap` that fix installed, and QA measures its
`getBoundingClientRect()` against the viewport at four named sizes rather than trusting a no-scroll
assertion.

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

Every transcribed value — the border width, the mark's `calc(var(--wc-card-w) * …)` offsets and size,
the pip's position — comes from the approved mockup. Whether the result *reads* as information or
decoration at the card-width floor is a developer judgement, recorded in
[README.md](README.md)'s Deferred section.

### The reducer's two new actions

`RoundUiActionKind` gained `Declare` and `ClaimTrick`, and **`RoundUiState` gained no field.**

`handleDeclare` calls `declareHunt` and, on `ok`, replaces `round`. `handleClaimTrick` guards on the
held trick's arity, asks `canClaimLostTrick`, calls `claimLostTrick`, and falls through to
`handleCarryOn`. Both treat a rejection as a **no-op returning the input state by reference** — never a
partial commit.

That silence is correct only because both rejections are structurally unreachable through the shipped
UI: the gate renders only while `declaration` is undefined, and the claim button renders only when
`canClaimLostTrick` already said yes. If a future change makes either reachable, the no-op becomes a
swallowed failure the player gets no feedback about, and each rejection's copy already exists in
`DECLARE_REJECTION_MESSAGE` / `CLAIM_REJECTION_MESSAGE` waiting to be rendered.

Neither action adds an effect, a timer, or a listener — the module still has no `useEffect` or
`useLayoutEffect` anywhere. Both engine entry points are pure, so React StrictMode's double-invocation
cannot double-credit even setting `creditedThrough` aside.
