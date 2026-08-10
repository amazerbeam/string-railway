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

### The module has no effect at all

Every state transition is either the lazy `useReducer` initializer (`createRoundUiState`, called
once per mount to play the opponent's lead if they lead trick 1) or a handler fired by a tap, a
keypress, or a callback from one of the felt's own controls (`AbilityPrompt`'s `onChoose`,
`RoundOverPanel`'s `onFinish`). Both the initializer and the reducer are pure functions of their
arguments, so React StrictMode's development double-invocation simply recomputes an identical value
rather than doing anything twice for real.

The alternative — an effect that watches "it's the CPU's turn" and dispatches — is what SCRUM-37
actually hit: a synchronous `setState` inside an effect body fails this project's
`react-hooks/set-state-in-effect` lint rule, and the same effect would double-fire under StrictMode.
Even the roving tabindex moves focus imperatively inside its keydown handler rather than from an
effect reacting to a focus-index change. `Select-String … -Pattern "useEffect|useLayoutEffect"`
against `src/app/warCouncil/*.ts` and `*.tsx` returns zero hits, so there is no listener, timer,
observer, or `AbortController` in the module and therefore no cleanup to omit.

### The trick winner is derived, never recomputed by the UI

`roundReducer.ts`'s `deriveResolvedTrick(before, after, playedCard)` never calls `resolveTrickWinner`
itself — doing so would require choosing a trump suit, which is a rules question this layer must not
answer. Instead it compares `tricksPlayed` before and after the commit: a trick resolved iff
`after.tricksPlayed > before.tricksPlayed`, and the winner is whichever side's `tricksWon` entry
rose. This is possible only because `playCard` already applies `resolveTrickWinner` internally and
returns the _result_ of that decision in the new state — `roundReducer` reads the consequence rather
than re-deriving the rule.

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

`roundReducer.ts`'s `commit` and `advanceCpu` set `resolvedTrick` and, on the thirteenth trick,
`phase: RoundPhase.Complete` in the same transition — both become true at once. An earlier version
of `WarCouncilRound.tsx` branched on `roundComplete` **first**, so `RoundOverPanel` replaced the
deciding trick instantly and the player never saw which cards won the round. The felt now branches on
`resolvedTrick` before `roundComplete`, so the held trick's cards and winner are always shown first;
the round-over panel renders only once `resolvedTrick` is `null` again.

`handleCarryOn` is one function serving both the held trick's control and the round-over panel's
"Finish the round" button: it dispatches `CarryOn` whenever something is held (clearing it, even when
the round is already complete), and calls `onComplete` only once nothing is held and the round is
complete — conditions mutually exclusive by construction, so `onComplete` cannot fire twice for one
click. `roundReducer.ts`'s own `handleCarryOn` mirrors this: it no longer treats a completed round as
a blanket no-op, and only skips advancing the opponent once the round is over. That guard matters —
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
