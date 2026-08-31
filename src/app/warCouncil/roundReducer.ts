import {
  applyDamageRefusalFor,
  cashBankNow,
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
import {
  APPLY_DAMAGE_AP_COST,
  isEncounterResolved,
  openBuffWindow,
  queueApplyDamagePayout,
  queueApplyPayout,
  spendAp,
  TIMEBOMB_FUSE_TRICKS,
} from '../../hunt'
import {
  applyDamageStock,
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
import { commit } from './commitHandlers'

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
 * at each of the three places an encounter can currently become resolved (`handleTapApplyDamage`,
 * and `commit`'s two `applyResolution` calls). A fourth way to end a fight — and this file has
 * gained one per ticket for four tickets running — is covered for free.
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
    case RoundUiActionKind.TapApplyDamage:
      return handleTapApplyDamage(state)
    case RoundUiActionKind.CancelApplyDamage:
      return state.applyPoised ? { ...state, applyPoised: false } : state
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
 * DLR-94 AC1/AC2 — three outcomes on one control. A refusal
 * changes nothing; nothing poised poises; poised COMMITS. There is no third stage: unlike a
 * Timebomb row, this control's second tap IS the action rather than a prelude to a hand-card tap.
 *
 * Asks `applyDamageRefusalFor` on BOTH taps, not just the first. The felt can change under a
 * poised plate — the Quarry leads (starting the trick and closing the leader-only window), a
 * reveal is held, the turn passes — and re-reading is what stops a poise made while the control
 * was live from committing after it stopped being. DLR-143 AC1 reverses D6 (version-4-scope §3,
 * 2026-08-19): a pending Timebomb no longer blocks this control at all, and the two are allowed
 * to stack, settling together in `commitHandlers.ts`'s existing trick-resolution fold.
 *
 * AC3 needs no code here. `cashBankNow` returns the round with only `bank` and `multiplier` moved,
 * `resolvedTrick` stays null, and nothing writes `lastResolution` — so no reveal is held, the felt
 * never enters its waiting state, and the player's next tap plays their card by the ordinary rules.
 *
 * Poising does NOT clear a live Cheat or an armed Timebomb, and they do not clear it. Neither
 * reinterprets a hand-card tap the way arming a Timebomb does, so a player may poise a Cheat and
 * apply damage in either order without losing either.
 *
 * DLR-109 — the committing tap no longer resolves anything. It spends `APPLY_DAMAGE_AP_COST`
 * through `spendAp`, the only subtraction path, and QUEUES the cash-out instead of dealing it —
 * `applyResolution` in `commitHandlers.ts` settles it a trick or more later, LAST, after the
 * trick's own damage and the Timebomb book/clear. The AP is spent at the moment of the press and
 * is NOT refunded if the queued payout is later wiped by AC3's damage-during-the-window rule.
 * `captureUnplayed` no longer fires on this transition — the press no longer resolves the
 * encounter, so there is nothing for it to capture here; a DELAYED kill's press-time hand size is
 * threaded instead through `settleApplyPayout`'s `unplayedAtPress`.
 */
function handleTapApplyDamage(state: RoundUiState): RoundUiState {
  if (applyDamageRefusalFor(applyDamageStock(state)) !== null) {
    // A refusal drops a held poise rather than leaving it stranded, and never half-applies. The
    // reason is already on the plate's face, so the player is never left with no visible cause.
    return state.applyPoised ? { ...state, applyPoised: false } : state
  }
  if (!state.applyPoised) {
    return { ...state, applyPoised: true }
  }

  const { state: round, cashOut } = cashBankNow(state.round)
  // Guarded for `applyResolution`'s stated reason: a resolved encounter must never be written to,
  // and a reducer must not throw. Unreachable in practice — a resolved encounter already fails
  // `canAct`, so `applyDamageRefusalFor` returned `NotYourMove` above.
  if (isEncounterResolved(state.encounter)) {
    return { ...state, applyPoised: false }
  }
  // AC2 — the press no longer deals anything. It freezes the figure and the press-time hand size
  // (AC4) and hands both to the encounter's queue; `applyResolution` settles it a trick or more
  // later. AC1 — the cost is spent through `spendAp`, the ONLY subtraction path, so `AP_ENABLED`
  // is honoured with no bypass written here. `spendAp` throws on an unaffordable spend and the
  // `InsufficientAp` refusal above is what guarantees this line never reaches that.
  const payout = queueApplyPayout(cashOut, state.round.hands[PlayerSide.Player].length)
  return {
    ...state,
    round,
    encounter: queueApplyDamagePayout(state.encounter, payout),
    buffActivation: {
      ...state.buffActivation,
      apPool: spendAp(state.buffActivation.apPool, APPLY_DAMAGE_AP_COST),
    },
    // DLR-125 — Debt Collector's trigger is THE PRESS, not the landing (DLR-109's reading, until
    // now unenforced in code). Set here, at the moment the press commits, and read at the next
    // trick's resolution; firing on the queued payout's arrival would pay the family a trick or
    // more late and would silently contradict a reading DLR-109 already recorded.
    buffHand: { ...state.buffHand, applyDamagePressed: true },
    applyPoised: false,
  }
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
