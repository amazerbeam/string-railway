import {
  CardRank,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  containsCard,
  curseCard,
  currentTurn,
  isCursed,
  sameCard,
  type Card,
} from '../../warCouncil'
import { isEncounterResolved, openBuffWindow } from '../../hunt'
import {
  canAct,
  curseArmed,
  discardSelecting,
  RoundUiActionKind,
  type RoundUiAction,
  type RoundUiState,
} from './roundUiState'
import { advanceQuarryLead } from './quarryAdvance'
import { handleCancelDiscard, handleTapDiscard, toggleDiscardCard } from './discardHandlers'
import {
  handleCancelBuffPoise,
  handleCancelLoadout,
  handleRemoveBuff,
  handleTapBuff,
  handleToggleLoadout,
} from './buffHandlers'
import { foldBuffOutcome } from './buffRoundState'
import { applyPotAction, commit, rollOverAction } from './commitHandlers'

// DLR-125 — `foldBuffOutcome` runs BEFORE `openWindowOnTrickResolved`, and the order is
// load-bearing: the fold credits R3 step 1's AP refund into `buffActivation.apPool` while it
// still holds this trick's activations, and only THEN does `openWindowOnTrickResolved` clear
// `activatedThisTrick`. Reversing the order would clear the activations the fold reads before it
// ran.
export function roundReducer(state: RoundUiState, action: RoundUiAction): RoundUiState {
  return openWindowOnTrickResolved(
    state,
    foldBuffOutcome(state, captureUnplayed(applyAction(state, action))),
  )
}

/**
 * DLR-114 — DLR-108 AC4's per-trick boundary, applied at the ONE transition where a trick actually
 * resolves. `openBuffWindow` clears `activatedThisTrick` and leaves the pool untouched.
 *
 * Fires on the `null` -> non-null edge of `resolvedTrick`, NOT on "the current trick is empty": a
 * buff is activated WHILE the trick is empty (that is what `discardWindowOpen` means), so an
 * empty-trick rule would erase every activation the instant it was made. Two-argument and pure, so
 * StrictMode's development double dispatch recomputes an identical value — the same property
 * `captureUnplayed` beside it relies on.
 */
function openWindowOnTrickResolved(prev: RoundUiState, next: RoundUiState): RoundUiState {
  if (prev.resolvedTrick !== null || next.resolvedTrick === null) return next
  return { ...next, buffActivation: openBuffWindow(next.buffActivation) }
}

/**
 * DLR-95 AC2 — ONE site for "how many cards were left when the Quarry went down", rather than one
 * at each of the places an encounter can currently become resolved (`commit`'s two
 * `applyResolution` calls). A fourth way to end a fight — and this file has gained one per ticket
 * for four tickets running — is covered for free.
 *
 * Writes exactly once: the first transition after which the encounter reads resolved and the field
 * is still `null`. The null check IS the "has this already been captured" test, which is why no
 * `before` state is needed and why this stays a pure function of one argument — so the reducer as
 * a whole stays pure and StrictMode's development double-dispatch recomputes an identical value.
 *
 * Deliberately NOT gated on the winner. A hand that ends with the PLAYER down also freezes the
 * figure; `recordEncounter` is what decides no payout is owed, because deciding that here would be
 * a second reading of a rule `src/hunt/` already owns.
 */
function captureUnplayed(next: RoundUiState): RoundUiState {
  if (next.unplayedAtResolve !== null || !isEncounterResolved(next.encounter)) {
    return next
  }
  return { ...next, unplayedAtResolve: next.round.hands[PlayerSide.Player].length }
}

/** Every action's own transition. Private since DLR-95: `roundReducer` above is the exported
 *  entry point, and it runs this function's result through `captureUnplayed`. */
function applyAction(state: RoundUiState, action: RoundUiAction): RoundUiState {
  switch (action.kind) {
    case RoundUiActionKind.TapCard:
      return handleTapCard(state, action.card)
    case RoundUiActionKind.ChooseAbility:
      return state.prompt ? commit(state, state.prompt, action.choice) : state
    case RoundUiActionKind.CancelSelection:
      return { ...state, armed: null, prompt: null }
    case RoundUiActionKind.CarryOn:
      return handleCarryOn(state)
    case RoundUiActionKind.TapDiscard:
      return handleTapDiscard(state)
    case RoundUiActionKind.CancelDiscard:
      return handleCancelDiscard(state)
    case RoundUiActionKind.ToggleLoadout:
      return handleToggleLoadout(state)
    case RoundUiActionKind.CancelLoadout:
      return handleCancelLoadout(state)
    case RoundUiActionKind.TapBuff:
      return handleTapBuff(state, action.id)
    case RoundUiActionKind.CancelBuffPoise:
      return handleCancelBuffPoise(state)
    case RoundUiActionKind.RemoveBuff:
      return handleRemoveBuff(state, action.id)
    // DLR-156 Task 15 Step 7 — chained through `handleCarryOn`, the SAME transition the felt's own
    // "tap the table" gesture dispatches, so a choice on the resolution screen returns the player
    // to an already-advanced table rather than the very reveal that screen just replaced (which
    // would demand a second, redundant tap before the Quarry could even lead again).
    //
    // NOT chained when the choice itself ends the encounter (`isEncounterResolved`): the felt's
    // OWN `handleCarryOn` wrapper (`WarCouncilTable.tsx`) checks `encounterOver` FIRST and reports
    // `onComplete` directly, WITHOUT ever dispatching `CarryOn` — so the held reveal it reads to
    // offer that tap must survive here, exactly as it always has for the deciding trick.
    // DLR-160 AC1 — these two used to tail-call `handleCarryOn`, which calls `advanceQuarryLead`
    // in the SAME dispatch whenever the Quarry is next to lead. Dismissing the resolution screen
    // therefore laid the Quarry's card before the player ever saw the felt, and the between-tricks
    // window closed unseen. `the-hunt.md` §4 already grants that window — "activating is only
    // available between tricks, the same window the Swap uses, before a trick's first card is
    // laid" — so nothing about the RULE changes here; the code was closing it early. Both actions
    // now close the resolution screen and stop, WITHOUT laying a card. `CarryOn`, reached only
    // from the well's own explicit control, keeps sole responsibility for that.
    //
    // `resolvedTrick` still has to be cleared, which is the ONLY thing `handleCarryOn` did that
    // these two needed — `applyPotAction`/`rollOverAction` clear `resolution` but not the felt's
    // own held reveal — EXCEPT on the one case the comment above already carves out: when the
    // choice itself ends the encounter, `resolvedTrick` must survive so the felt's OWN
    // `handleCarryOn` wrapper (`WarCouncilTable.tsx`) still has a held reveal to read `encounterOver`
    // from and report `onComplete`. Clearing it unconditionally here would strand a mid-hand kill —
    // no button left to reach `onComplete` at all, since AC1 also deleted the felt's region click.
    case RoundUiActionKind.ApplyPot: {
      const applied = applyPotAction(state)
      return isEncounterResolved(applied.encounter) ? applied : clearResolvedTrick(applied)
    }
    case RoundUiActionKind.RollOver: {
      const rolled = rollOverAction(state)
      return isEncounterResolved(rolled.encounter) ? rolled : clearResolvedTrick(rolled)
    }
  }
}

/** DLR-160 AC1 — the one thing `ApplyPot`/`RollOver` needed out of `handleCarryOn`: the felt's
 *  held reveal is dropped so the table renders the between-tricks state. Deliberately does NOT
 *  touch `currentTrick`, the turn, or the Quarry's pending lead. */
function clearResolvedTrick(state: RoundUiState): RoundUiState {
  return state.resolvedTrick === null ? state : { ...state, resolvedTrick: null }
}

function handleTapCard(state: RoundUiState, tapped: Card): RoundUiState {
  // DLR-100 — NOT `canAct`-gated (mirrors `discardWindowOpen`); must precede the guard below.
  if (discardSelecting(state)) {
    return toggleDiscardCard(state, tapped)
  }
  // DLR-167 AC3 — also NOT `canAct`-gated, and for the same reason: a Curse is armed in the
  // between-tricks window, which reaches the Quarry-to-lead gap where `canAct` is false because
  // the Quarry is next to move. `curseTapped`'s own guards are what keep this safe to reach from
  // there. Placed BESIDE the discard branch rather than after the guard, deliberately.
  if (curseArmed(state)) {
    return curseTapped(state, tapped)
  }
  if (!canAct(state)) {
    return state
  }

  if (state.armed && sameCard(state.armed, tapped)) {
    // DLR-163 AC5 — only the 3 arms a prompt now. The 5 commits on its second tap like any plain
    // card, because it takes no choice at all.
    if (tapped.rank === CardRank.Fox) {
      return { ...state, armed: null, prompt: tapped }
    }
    return commit(state, tapped)
  }

  return { ...state, armed: tapped, rejection: null }
}

/**
 * DLR-167 AC3 — the tap that MARKS a card rather than playing it.
 *
 * **LEGALITY IS DELIBERATELY NOT CHECKED**, and that is the whole point of the card: marking is not
 * a move, so a card that could not legally be played this trick is still a legal target. The only
 * questions asked are the two `curseCard` throws on, because a reducer must not throw during an
 * event handler:
 *
 * - **Not in hand** — the arm is DROPPED rather than half-applied, so the player is never left
 *   armed with no visible cause. Unreachable from the felt (every tap comes off a rendered hand
 *   card) and kept as a guard for a future caller.
 * - **Already cursed** — a NO-OP that keeps the mode open, returning `state` itself so an idle
 *   re-tap cannot even cause a re-render.
 */
function curseTapped(state: RoundUiState, tapped: Card): RoundUiState {
  if (!containsCard(state.round.hands[PlayerSide.Player], tapped)) {
    return { ...state, curseArmedBuff: null }
  }
  if (isCursed(state.round.cursedCards, tapped)) {
    return state
  }
  return {
    ...state,
    round: curseCard(state.round, PlayerSide.Player, tapped),
    curseArmedBuff: null,
    // The mark is not a rejection of anything; clear a stale one so the hint reads the new state.
    rejection: null,
  }
}

/**
 * The single control the player presses between decisions. Clears a held trick reveal —
 * including the deciding sixth, so its cards and outcome are seen before the end panel — and
 * then commits the Quarry's lead if one is pending.
 *
 * Doing both in one transition is what keeps the telegraph free: the Quarry's next lead is
 * already readable beside the held reveal, so the tap that clears the reveal is the same tap
 * that lets them lead. Only trick 1 has no prior reveal to fold onto.
 */
function handleCarryOn(state: RoundUiState): RoundUiState {
  const cleared: RoundUiState =
    state.resolvedTrick === null ? state : { ...state, resolvedTrick: null }

  if (
    cleared.cpuFault !== null ||
    cleared.prompt !== null ||
    cleared.round.phase === RoundPhase.Complete ||
    isEncounterResolved(cleared.encounter) ||
    currentTurn(cleared.round) !== QUARRY_SIDE ||
    cleared.round.currentTrick.length > 0 ||
    // DLR-100 fix pass — a discard selection open during the Quarry-to-lead gap must be finished
    // or cancelled before the felt's ambient "tap to carry on" gesture is allowed to advance the
    // lead again. Mirrors `handleTapCard`'s discard-first ordering: discarding takes priority.
    discardSelecting(cleared)
  ) {
    return cleared
  }

  const advanced = advanceQuarryLead(cleared.round)
  return {
    ...cleared,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
  }
}

// `commit` (the player's own commit, folding a trick's resolution into the encounter and
// advancing the Quarry's follow when the player led) now lives in `commitHandlers.ts` — split out
// in the DLR-100 fix pass alongside this file's Quarry-to-lead-gap guard, the same reason
// `discardHandlers.ts` and `quarryAdvance.ts` were split out before it.
