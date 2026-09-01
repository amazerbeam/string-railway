import {
  CardRank,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  containsCard,
  currentTurn,
  primeCard,
  isPrimed,
  sameCard,
  type Card,
} from '../../warCouncil'
import { isEncounterResolved, openBuffWindow, TIMEBOMB_FUSE_TRICKS } from '../../hunt'
import {
  canAct,
  discardSelecting,
  timebombArmed,
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
    case RoundUiActionKind.ApplyPot: {
      const applied = applyPotAction(state)
      return isEncounterResolved(applied.encounter) ? applied : handleCarryOn(applied)
    }
    case RoundUiActionKind.RollOver: {
      const rolled = rollOverAction(state)
      return isEncounterResolved(rolled.encounter) ? rolled : handleCarryOn(rolled)
    }
  }
}

function handleTapCard(state: RoundUiState, tapped: Card): RoundUiState {
  // DLR-100 — NOT `canAct`-gated (mirrors `discardWindowOpen`); must precede the guard below.
  if (discardSelecting(state)) {
    return toggleDiscardCard(state, tapped)
  }
  // DLR-154 FIX A — also NOT `canAct`-gated, and for the same reason: a Timebomb can be armed
  // during the Quarry-to-lead gap (`discardWindowOpen`'s window), where `canAct` is false because
  // the Quarry, not the player, is next to move. Priming there must still reach `primeTapped`,
  // whose own guards (membership, an existing mark, the armed damage) are what keep this safe to
  // reach from a window where `canAct` is false — legality is deliberately not checked here.
  if (timebombArmed(state)) {
    return primeTapped(state, tapped)
  }
  if (!canAct(state)) {
    return state
  }

  if (state.armed && sameCard(state.armed, tapped)) {
    if (tapped.rank === CardRank.Fox || tapped.rank === CardRank.Woodcutter) {
      return { ...state, armed: null, prompt: tapped }
    }
    return commit(state, tapped)
  }

  return { ...state, armed: tapped, rejection: null }
}

/**
 * AC2 — an armed Timebomb's next hand-card tap primes the card rather than playing it.
 *
 * Guards membership, the existing mark, and the armed damage BEFORE calling `primeCard`, which
 * throws on the first two: a reducer must not throw, because a throw during an event handler
 * unmounts the tree. Kept verbatim from the pre-DLR-132 `commitTimebomb`'s three guards. A guard
 * that fails clears the armed state rather than half-applying, so the player is never left armed
 * with no visible cause.
 *
 * On success, the pair moves from `timebombArmedDamage` (paid for, waiting) to
 * `primedTimebombDamage` (what the primed card will detonate for) — `applyResolution` reads the
 * latter when this trick's prime books against the encounter.
 *
 * Legality is deliberately NOT checked: priming is not a move, and the whole point of the card is
 * marking one the player expects to lose with.
 */
function primeTapped(state: RoundUiState, tapped: Card): RoundUiState {
  const hand = state.round.hands[PlayerSide.Player]
  if (state.timebombArmedDamage === null || !containsCard(hand, tapped)) {
    // Unreachable from the fan (every rendered card is held), so this keeps its existing
    // clear-and-abandon behaviour rather than growing a second recovery path.
    return { ...state, timebombArmedDamage: null }
  }
  // Assumption 5 — a tap on an already-primed card is a NO-OP that keeps the mode open. Clearing
  // here would abandon a paid-for card with no mark to show for it, and leave the player with no
  // visible cause. The prompt stays on screen and the next tap can still land.
  if (isPrimed(state.round.primedCards, tapped)) return state
  return {
    ...state,
    round: primeCard(state.round, PlayerSide.Player, tapped),
    timebombArmedDamage: null,
    primedTimebombDamage: state.timebombArmedDamage,
    timebombFuseRemaining: TIMEBOMB_FUSE_TRICKS,
    armed: null,
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
