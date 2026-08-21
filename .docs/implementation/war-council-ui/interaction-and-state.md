_Part of [War Council UI](README.md)._

### Tap-twice is one action, not two

Arming a card and committing it are not two entries in `RoundUiActionKind` — both are the same
`TapCard` action, dispatched by the same `HandFan` `onTap` callback. `roundReducer.ts`'s
`handleTapCard` decides which happened by comparing the tapped card against `state.armed`: a
different (or no) armed card arms the new one; tapping the _same_ card again either opens `prompt`
(rank is `CardRank.Fox` or `CardRank.Woodcutter`) or calls the private `commit` helper, which runs
`playCard`. There is no separate confirm action and no confirm button — confirmation lives on the
card itself, per `game-ux`'s tap-cost rule.

`TapCard` is ignored outright when it is not the player's turn, or when `resolvedTrick`, `prompt`,
or `cpuFault` is set, or the round is complete.

### The exported reducer is a wrapper, and that is where cross-cutting observations go — DLR-95

Since DLR-95 `roundReducer` is no longer the `switch` itself. The switch became a **private
`applyAction`**, and the export is a two-line wrapper:

```ts
export function roundReducer(state: RoundUiState, action: RoundUiAction): RoundUiState {
  return captureUnplayed(applyAction(state, action))
}
```

The exported name, signature and behaviour are unchanged — this was a restructuring, not a
behaviour change, and every pre-existing reducer test passed untouched through it.

What it buys is a place to state a rule of the form *"after every transition, observe X"* exactly
once. DLR-95 needed the player's hand size **at the instant the Quarry's bar empties**, to price the
quick-kill payout. An encounter can currently become resolved in three different places —
`handleTapApplyDamage`, and `commit`'s two `applyResolution` calls — so writing the capture at each
would have been three copies of one rule, and the fourth way to end a fight (this file has gained
one per ticket for four tickets running) would have silently missed it.

`captureUnplayed` writes the figure exactly once: the first transition after which the encounter
reads resolved and the field is still `null`.

```ts
function captureUnplayed(next: RoundUiState): RoundUiState {
  if (next.unplayedAtResolve !== null || !isEncounterResolved(next.encounter)) {
    return next
  }
  return { ...next, unplayedAtResolve: next.round.hands[PlayerSide.Player].length }
}
```

Three properties are load-bearing:

- **The null check IS the "already captured?" test**, which is why no `before` state is needed and
  why this stays a pure function of one argument. The reducer as a whole therefore stays pure, and
  StrictMode's development double-dispatch recomputes an identical value rather than double-writing.
- **It is deliberately not gated on the winner.** A hand that ends with the *player* down freezes
  the figure too. `recordEncounter` decides no payout is owed, because deciding that here would be a
  second reading of a rule `src/hunt/` already owns.
- **The figure is frozen, not re-derived at `onComplete` time.** Reading the live hand length when
  the round reports upward happens to give the same answer today — but only because `canAct` goes
  false once the encounter resolves, so nothing further can be played. Correctness that rests on an
  unrelated predicate staying false is correctness that breaks silently. This is the same reasoning
  `openingEncounter` in `roundUiState.ts` already documents.

`RoundUiState.unplayedAtResolve` is `number | null`, seeded `null` by `createRoundUiState`; `null`
means "this hand did not end the fight" and is a legitimate value rather than a failure — which is
why it is not a defaulted `0`, a value that would read correctly and pay wrong. A remount re-seeds
it to `null`, which is correct: a remount is a new hand. It rides up to the driver through
`WarCouncilRoundResult.unplayedAtResolve`, set from `ui.unplayedAtResolve` in both of
`handleCarryOn`'s `onComplete` literals. See
[../hunt/quick-kill-payout.md](../hunt/quick-kill-payout.md) for what the run does with it.

### The module has no effect at all

Every state transition is either the lazy `useReducer` initializer (`createRoundUiState`, called
once per mount) or a handler fired by a tap, a keypress, or a callback from one of the felt's own
controls (`AbilityPrompt`'s `onChoose`, `RoundOverPanel`'s `onFinish`). Both the initializer and the
reducer are pure functions of their arguments, so React StrictMode's development double-invocation
simply recomputes an identical value rather than doing anything twice for real. Since DLR-53 the
initializer is a *pure restructuring* of `initialState` with no engine call at all — it no longer
plays the opponent's opening lead, which makes it trivially rather than arguably idempotent. See
[Hunt readouts and the telegraph](hunt-readouts-and-telegraph.md) for why that lead is now held.

DLR-53 added `previewQuarryIntent` and `quarryIntent` calls *during render*, which is safe for the
same reason: both are documented pure and neither mutates the state handed to it, so a StrictMode
double-invoke recomputes identical values. Neither result is stored in `RoundUiState` — a stored
copy could only go stale against `ui.round`.

The alternative — an effect that watches "it's the CPU's turn" and dispatches — is what SCRUM-37
actually hit: a synchronous `setState` inside an effect body fails this project's
`react-hooks/set-state-in-effect` lint rule, and the same effect would double-fire under StrictMode.
Even the roving tabindex moves focus imperatively inside its keydown handler rather than from an
effect reacting to a focus-index change. `Select-String … -Pattern "useEffect|useLayoutEffect"`
against `src/app/warCouncil/*.ts` and `*.tsx` returns zero hits, so there is no listener, timer,
observer, or `AbortController` in the module and therefore no cleanup to omit.

### The trick winner is derived, never recomputed by the UI

`quarryAdvance.ts`'s `deriveResolvedTrick(before, after, playedCard)` (in `roundReducer.ts` until DLR-94 moved it) never calls `resolveTrickWinner`
itself — doing so would require choosing a trump suit, which is a rules question this layer must not
answer. This is possible only because `playCard` already applies `resolveTrickWinner` internally and
returns the _result_ of that decision in the new state — `roundReducer` reads the consequence rather
than re-deriving the rule.

**What it reads changed with DLR-80.** It used to diff `tricksPlayed` and `tricksWon` across the
commit: a trick resolved iff `after.tricksPlayed > before.tricksPlayed`, the winner being whichever
side's `tricksWon` entry rose. It now tests **`after.lastResolution`** — non-null iff a trick
resolved — and recovers the physical winner from the outcome itself: `CleanWin` and `SkullWin` favour
the player, `Dodge` and `CleanLoss` favour the Quarry. The bank, not the trick count, is what a trick
now changes, so `lastResolution` is the definitive signal; and the winner comes from an enum
`resolveTrickBank` already consulted rather than from a second diff that could disagree with it.

### A held trick, and the keyboard path to leave it

`playCard` clears `currentTrick` the instant the second card lands, so without holding the resolved
trick on screen the winning card would never be visible at all. `TrickWell` therefore keeps it —
both cards in `[lead, follow]` order, labelled by side, the winner marked — until the player carries
on. An explicit tap is deterministic, needs no timer, and invents no reveal delay.

Two review rounds shaped how that carry-on is reached, and both defects are worth recording because
each was invisible to the test suite:

A held trick disables every hand card (`interactive` is `false`), and `TrickWell`'s and
`DecreePile`'s cards are `disabled` by variant, so **nothing else in the tree is focusable**. The
felt `<section>` originally carried an `onClick`/`onKeyDown` pair but no `tabIndex`, so it could
never receive focus and its key handler was dead code — a keyboard-only or switch-access player was
stuck at the end of every trick. The fix is a real, focusable control inside `TrickWell` itself,
reading "Tap the table to carry on". It shipped first as a `<span role="button" tabIndex={0}>` with a
manual `onKeyDown`, on the reasoning that a native `<button>` paired with a manual key handler risks
a double dispatch; a second review round tested that empirically and found it is only real _if_ you
attach the manual handler, which nothing requires. `RoundOverPanel`'s semantically identical "Finish
the round" control is a plain `<button type="button" onClick>` with no key handler and gets correct
native `Enter`/`Space` activation for free. `TrickWell`'s control is now the same shape, with the
manual handler deleted; `handleHintClick`'s `event.stopPropagation()` is kept, since it guards
against bubbling to the felt's own `onClick` regardless of element. `warCouncilCards.css`'s
`.wc-is-carry-on` gained a small button-chrome reset (`font-family: inherit; background: none;
border: 0`) so the browser's default button face doesn't reappear around what still reads as plain
hint text — neither value is a new visual decision, and `.wc-table-hint`'s own
font-size/weight/letter-spacing/colour are untouched because the reset never sets the `font`
shorthand.

The surrounding felt keeps its own `onClick` too, for a pointer tap anywhere on the table. Both paths
call the same `handleCarryOn`, and dispatching `CarryOn` a second time is a safe no-op in the reducer
(see below), so bubbling between the two cannot double-fire.

### The deciding trick is held exactly like every other

`roundReducer.ts`'s `commit` and `quarryAdvance.ts`'s `advanceQuarryFollow` (moved there by DLR-94) set `resolvedTrick` and, on the **sixth** trick
(`HAND_SIZE`, thirteen before DLR-80), `phase: RoundPhase.Complete` in the same transition — both
become true at once. An earlier version of `WarCouncilRound.tsx` branched on `roundComplete`
**first**, so `RoundOverPanel` replaced the deciding trick instantly and the player never saw which
cards won the round. The felt now branches on `resolvedTrick` before `roundComplete`, so the held
trick's cards and winner are always shown first; the round-over panel renders only once
`resolvedTrick` is `null` again.

**One case deliberately breaks that order: a resolved *encounter*.** `encounterOver` is checked ahead
of both, because DLR-80's cash-out can empty a bar on any trick — so the trick that finishes the
encounter never gets its own reveal beat, and the terminal panel is what the player sees next. That
is the one place a trick's cards are traded away for stating the outcome immediately.

`handleCarryOn` is one function serving four controls — the held trick's, the pending Quarry lead's
(DLR-53), the round-over panel's "Finish the round" button, and the felt itself. Its branches, in
order:

1. **`encounterOver` → `onComplete`, unconditionally.** Checked first because once a bar has emptied
   the felt shows the terminal panel rather than a held reveal, so there is nothing left to clear; a
   `CarryOn` dispatch here would only clear something nothing renders.
2. **Something held *or* a Quarry lead pending → dispatch `CarryOn`**, clearing and/or committing,
   even when the round is already complete.
3. **Otherwise, `roundComplete` → `onComplete`.**

`quarryToLead` is only ever true while `roundComplete` is false, so branches 2 and 3 stay mutually
exclusive by construction and `onComplete` cannot fire twice for one click.

Branch 1 is also why the hand-over tally cannot read the mount's `encounter` prop: it is the branch
that hands the encounter upward while the panel stays mounted, which is exactly when the prop stops
being this hand's opening figure. See
[the hand-over panel](hunt-readouts-and-telegraph.md#the-hand-over-panel-states-a-tally-not-an-equation).
`roundReducer.ts`'s own `handleCarryOn` mirrors this: it no longer treats a completed round as a
blanket no-op, and only skips advancing the opponent once the round is over. That guard matters —
without it, advancing on a completed round would set `cpuFault: 'noLegalMove'` every time a round
ended, since the CPU's hand is empty.

`onComplete` is called from a handler, never an effect, so it cannot double-fire on a second mount.

### A player's rejected move is recoverable and never partial

A commit runs `playCard` and, on `{ ok: false }`, sets `rejection` to the engine's own named
`IllegalMoveReason` and returns the input state's `round` **by reference** — matching the engine's
no-partial-mutation guarantee, so the play simply cannot commit. `WarCouncilRound` maps it to copy
through `ILLEGAL_MOVE_MESSAGE` and `HandFan` renders it in an `aria-live="polite"` region with the
`wc-is-reject` class. The next `TapCard` clears it.

This is what makes the "rejected" half of the acceptance criteria real rather than a re-implemented
check: the reducer arms anything in hand and lets `playCard` adjudicate.
