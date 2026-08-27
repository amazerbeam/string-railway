_Part of [War Council UI](README.md)._

# The discard (now Swap), the hand's third mode, and the pre-lead gate

> **The plate this page is named for no longer exists — DLR-114 deleted it, and no rule below
> changed.** `DiscardPlate.tsx` and `warCouncilDiscard.css` went with the felt rail; the control is
> now the **third button on the action bar, labelled Swap**. It dispatches the same
> `TapDiscard`/`CancelDiscard` actions, reads the same `discardRefusalFor(discardStock(ui))`, prints
> the same `DISCARD_REFUSAL_MESSAGE` sentence on its own face, and reuses `discardAccessibleName`
> unchanged — the copy was kept, not rewritten. The `discardWindowOpen` gate, the selection model, the
> chaining behaviour, the hand's third mode and the `handleCarryOn` guard below are all exactly as
> described. See [the action bar and the buff loadout](action-bar-and-loadout.md) for where the control
> now lives; where this page says "the rail control", the bar's Swap button is what does it today.

## What it is

The discard's UI half: originally a fourth felt-rail plate (`DiscardPlate.tsx`), a third selection mode on
`HandFan`, a third per-card marker on `PlayingCard`, the reducer wiring that opens, toggles, commits
and cancels a multi-card selection, and the one predicate in this codebase deliberately built to
reach a moment every other control's gate cannot.

## The gate: `discardWindowOpen`

Every other rail control — `CheatSlots`, `TimebombCharge`, and the Apply Damage plate — gated on
`canAct`, which requires `currentTurn === PlayerSide.Player`. The discard's acceptance criteria ask for
something narrower and, at the same time, wider: available before a trick's first card, **including
before the Quarry's own lead** — the moment `currentTurn` names the Quarry, the trick has not
started, and `canAct` therefore reads `false`.

```ts
export function discardWindowOpen(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.round.currentTrick.length === 0 &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null
  )
}
```

Deliberately independent of `currentTurn`. `currentTrick.length === 0` is exactly "not mid-trick"
negated; `resolvedTrick === null` is what stops the window reopening while a trick's reveal is still
showing, matching every other control's existing behaviour of going inert during a held reveal —
including, per AC1, the reveal that ends a hand.

**This is the one predicate in the codebase deliberately independent of `canAct`/`currentTurn`.** A
future consumable control that also needs to be available before the Quarry's lead should read
`discardWindowOpen` rather than inventing a second version.

> **DLR-108 took that advice literally, and it is the whole of that ticket's AC1.** Buff activation
> is available in exactly the same window, so **no second timing gate was built**:
> `buffActivationStock(state, activation, buff)` sits beside `discardStock` in `roundUiState.ts` and
> feeds its `windowOpen` field from `discardWindowOpen(state)`, reading nothing else off the round.
> Its test asserts the two agree **on the same state object** rather than against a fixed boolean,
> which is what makes the claim checkable rather than merely stated. See
> [hunt/buff-activation-and-ap-costs.md](../hunt/buff-activation-and-ap-costs.md) for the rule behind
> it.
>
> **DLR-114 built that Apply Buff control, and it split the question in two.** A **buff row** is still
> gated on exactly this signal — `discardWindowOpen`, no second timing gate, unchanged. But
> **opening the panel** the rows sit in is gated on the wider `loadoutDoorOpen = discardWindowOpen ||
> canAct`, because DLR-114 relocated `CheatSlots` and `TimebombCharge` inside that panel and both were
> reachable mid-trick before. So mid-trick the panel opens, Cheat and Timebomb inside it are live, and
> every buff row is disabled reading "Not between tricks." See
> [the action bar and the buff loadout](action-bar-and-loadout.md#the-panel-door-is-wider-than-the-activation-window-and-that-is-a-fix-rather-than-a-looseness).

## The selection

`RoundUiState.discardSelection: readonly Card[] | null` — `null` means closed, an array (possibly
empty) means open and holding the cards currently toggled in. One field rather than a
boolean-plus-array pair, `CheatSelection`'s own stated reason: two independent fields would admit
"closed but holding a stale selection."

```ts
export function discardSelecting(state: RoundUiState): boolean {
  return state.discardSelection !== null
}

export function discardStock(state: RoundUiState): DiscardStock {
  return {
    discardsRemaining: state.discardsRemaining,
    selecting: discardSelecting(state),
    selectionSize: state.discardSelection?.length ?? 0,
    windowOpen: discardWindowOpen(state),
  }
}
```

`discardStock` assembles the four plain values `discardRefusalFor` needs in one place, the same
discipline `applyDamageStock` documents — the reducer's guard and the plate's disabled state read
`discardRefusalFor(discardStock(ui))` and cannot drift apart.

## The reducer

`handleTapDiscard`, `handleCancelDiscard` and `toggleDiscardCard` (`discardHandlers.ts`):

- **Not selecting, refusal null → OPEN.** Clears any Cheat/Timebomb selection and any armed card —
  mutual exclusion mirroring `handleTapTimebomb`'s own.
- **Selecting, refusal null → COMMIT.** The only way that combination is reachable is a non-empty
  selection, so this branch calls `applyDiscard` and decrements `discardsRemaining`.
- **Refused → no-op.**

`toggleDiscardCard` caps membership at `MAX_CARDS_PER_DISCARD`, silently ignoring a tap past the cap
or on a card not in hand — this codebase's existing silent-guard style (`clearCheat`'s
stale-selection drop).

`handleTapCard` gains a first branch — `if (discardSelecting(state)) return toggleDiscardCard(state,
tapped)` — checked **before** `handleTapCard`'s existing `!canAct(state)` early return.
`handleTapCheat` and `handleTapTimebomb` each gain `discardSelecting(state)` to their opening guard,
and their poising branches gain `discardSelection: null` beside the selections they already clear —
the same mutual exclusion in the other direction. **DLR-114 extended that set by one:**
`handleToggleLoadout` clears `discardSelection` (along with `armed`, `cheatSelection` and
`timebombStage`) on the way in, and arming a Cheat or Timebomb from inside the loadout panel closes
the panel. Four modes reinterpret the next hand-card tap; two at once makes that tap ambiguous.

### The mid-implementation ordering defect

Task 13's dispatch instruction placed the new `handleTapCard` branch "ahead of the existing
`timebombArmed` check" — which, read literally, still left it **behind** the pre-existing `if
(!canAct(state)) return state` guard at the top of the function. `canAct` is false throughout the
Quarry-to-lead gap `discardWindowOpen` is built to reach, so the practical effect was: `TapDiscard`
could **open** the selection during that gap (`discardWindowOpen` does not check `canAct`), but a
subsequent `TapCard` to toggle a hand card into it was swallowed by the earlier guard — no card
could actually be added, and therefore no commit was reachable, while genuinely in the pre-lead
window. The task's own listed tests only asserted that `TapDiscard` succeeded pre-lead, not that a
following toggle did, so this passed unnoticed until the pre-Phase-5 fix reordered the two checks
and a new test drove the full pre-lead sequence — open, toggle, commit — end to end from a state
where the Quarry is about to lead.

### The post-review guard

The parallel [code-evaluator + defender + qa] review found a second interaction gap: tapping the felt
background — the same tap `handleCarryOn` reads to advance a held reveal or the Quarry's lead — while
a discard selection was open used to silently drop that selection and advance the Quarry's lead
underneath it. `handleCarryOn` now refuses to advance while `discardSelecting(state)` is true, closed
by a defender-flagged critical finding and covered by a new reducer test.

## Chaining

A commit closes the selection (`discardSelection: null`); chaining is simply tapping the rail control
again. `discardWindowOpen` stays `true` after a commit — nothing about the round's own turn state
changed — so nothing prevents an immediate re-open with the fresh hand. This was a deliberate choice
over an auto-reopening continuous mode: an explicit re-arm after seeing the new hand is a smaller,
more predictable interaction, and it matches the arm/spend/re-arm shape Cheat and Timebomb already
use. Whether the extra tap per chained throw is worth the friction is unplayed (see
[README.md](README.md)'s Deferred section).

## The hand and the card marker

`HandFan` gained `discardSelecting`/`discardSelection` props. `isFocusable` and the `illegal`
expression each gain `|| discardSelecting` beside their existing `timebombArmed` clause — a second
instance of the same "every held card is a valid tap target, including one illegal to play" relaxation,
not a new concept. `WarCouncilRound.tsx` computes `handInteractive = interactive ||
discardSelecting(ui)` and passes it to `HandFan` alone, so the hand stays interactive during the
Quarry-to-lead gap even though every other control on the rail reads the unchanged `interactive`.

`PlayingCard` gained `discardSelected?: boolean`, defaulting to `false`, rendering a third
conditional marker span alongside `skulled`/`primed` in the same component and the same
`className` cascade, and folding into `aria-pressed` — `armed` and `discardSelected` never coexist,
since arming a card to play and selecting it for discard are mutually exclusive modes.

## The hint cascade

`deriveHint` gains a branch for `ui.discardSelection !== null`, positioned directly after the
`resolvedTrick` check and **ahead of `quarryToLead`** — a discard selection in progress is the more
specific, more actionable thing to tell the player, and the two states can genuinely coexist during
the pre-lead gap. Returns `DISCARD_SELECT_HINT` when the selection is empty, `DISCARD_READY_HINT`
once at least one card is chosen.

## The file-size split

`roundReducer.ts` crossed 400 lines the moment Task 13's three discard handlers landed. Split
immediately, following this codebase's own `quarryAdvance.ts` precedent: `handleTapDiscard`,
`handleCancelDiscard` and `toggleDiscardCard` moved into a new `discardHandlers.ts` (73 lines) — a
pure move, no behaviour changed. The post-review fix pass's `handleCarryOn` guard pushed the file
over 400 again; `commit` and its private `playOptions`/`applyResolution` helpers moved into a second
new file, `commitHandlers.ts` (141 lines), the same precedent applied a second time in the same
contract. `roundReducer.ts` is 288 lines after both splits.

**DLR-114 applied the same precedent a third time**, in the same file family and for the same reason:
the loadout's three transitions went into `buffHandlers.ts` beside `discardHandlers.ts` rather than
onto `roundReducer.ts`, and the two new controls' prop objects went into `roundControlsProps.ts` the
moment they pushed `WarCouncilRound.tsx` past 400.
