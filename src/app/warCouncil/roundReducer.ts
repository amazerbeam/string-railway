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
  legalMoves,
  sameCard,
  type Card,
} from '../../warCouncil'
import {
  APPLY_DAMAGE_AP_COST,
  hasCheat,
  isEncounterResolved,
  openBuffWindow,
  queueApplyDamagePayout,
  queueApplyPayout,
  spendAp,
  type CheatCardId,
} from '../../hunt'
import {
  applyDamageStock,
  canAct,
  CheatStage,
  discardSelecting,
  timebombArmed,
  TimebombStage,
  RoundUiActionKind,
  type RoundUiAction,
  type RoundUiState,
} from './roundUiState'
import { advanceQuarryLead } from './quarryAdvance'
import { handleCancelDiscard, handleTapDiscard, toggleDiscardCard } from './discardHandlers'
import { handleCancelLoadout, handleTapBuff, handleToggleLoadout } from './buffHandlers'
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
    case RoundUiActionKind.TapCheat:
      return handleTapCheat(state, action.id)
    case RoundUiActionKind.CancelCheat:
      return clearCheat(state)
    case RoundUiActionKind.TapTimebomb:
      return handleTapTimebomb(state)
    case RoundUiActionKind.CancelTimebomb:
      return state.timebombStage === null ? state : { ...state, timebombStage: null }
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
  }
}

function handleTapCard(state: RoundUiState, tapped: Card): RoundUiState {
  // DLR-100 — NOT `canAct`-gated (mirrors `discardWindowOpen`); must precede the guard below.
  if (discardSelecting(state)) {
    return toggleDiscardCard(state, tapped)
  }
  if (!canAct(state)) {
    return state
  }
  // AC2 — while armed, a hand-card tap MARKS rather than plays.
  if (timebombArmed(state)) {
    return commitTimebomb(state, tapped)
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
 * AC4/AC6 — four outcomes on one id. Nothing selected poises; poised on the same id arms; armed
 * on the same id gives it back unspent; a tap on a different id poises that one instead.
 *
 * Guards `hasCheat` rather than trusting the id: a selection can outlive its card if a future
 * caller ever removes one outside `commit`, and a reducer must not throw — a throw inside a
 * reducer during an event handler unmounts the tree.
 */
function handleTapCheat(state: RoundUiState, id: CheatCardId): RoundUiState {
  if (!canAct(state) || discardSelecting(state) || !hasCheat(state.cheats, id)) {
    return state
  }
  const current = state.cheatSelection
  if (current === null || current.id !== id) {
    // Arming a Cheat reinterprets the same hand-card tap Timebomb does, so the two selections
    // cannot coexist — clear a held Timebomb selection here for the same reason `handleTapTimebomb`
    // clears `cheatSelection` on its own poise branch.
    return {
      ...state,
      cheatSelection: { id, stage: CheatStage.Poised },
      timebombStage: null,
      discardSelection: null,
    }
  }
  const stage = current.stage === CheatStage.Poised ? CheatStage.Armed : null
  return stage === null ? clearCheat(state) : { ...state, cheatSelection: { id, stage } }
}

/**
 * AC6 — disarm without spending. Also drops a poised hand card that the RE-NARROWED legal set has
 * just made illegal, so the player is never left holding a selection that will be rejected on its
 * next tap with no visible cause.
 */
function clearCheat(state: RoundUiState): RoundUiState {
  const stillLegal =
    state.armed === null || containsCard(legalMoves(state.round, PlayerSide.Player), state.armed)
  return { ...state, cheatSelection: null, armed: stillLegal ? state.armed : null }
}

/**
 * AC2 — three outcomes on one control, mirroring `handleTapCheat`. Nothing selected poises; poised
 * arms; armed gives the charge back UNSPENT.
 *
 * Poising clears the Cheat selection and any card armed-to-play: both reinterpret a hand-card tap,
 * so allowing two at once makes the next tap ambiguous.
 */
function handleTapTimebomb(state: RoundUiState): RoundUiState {
  if (!canAct(state) || discardSelecting(state) || state.timebombCharges <= 0) {
    return state
  }
  if (state.timebombStage === null) {
    return {
      ...state,
      timebombStage: TimebombStage.Poised,
      cheatSelection: null,
      armed: null,
      discardSelection: null,
    }
  }
  if (state.timebombStage === TimebombStage.Poised) {
    return { ...state, timebombStage: TimebombStage.Armed }
  }
  return { ...state, timebombStage: null }
}

/**
 * DLR-94 AC1/AC2 — three outcomes on one control, mirroring `handleTapTimebomb`'s shape. A refusal
 * changes nothing; nothing poised poises; poised COMMITS. There is no third stage: unlike Timebomb,
 * this control's second tap IS the action rather than a prelude to a hand-card tap.
 *
 * Asks `applyDamageRefusalFor` on BOTH taps, not just the first. The felt can change under a
 * poised plate — a Timebomb booking lands, a reveal is held, the turn passes — and re-reading is what
 * stops a poise made while the control was live from committing after it stopped being. D6
 * (version-4-scope §3) asks for exactly this: the control must read the pending-Timebomb predicate
 * "before it commits to anything".
 *
 * AC3 needs no code here. `cashBankNow` returns the round with only `bank` and `multiplier` moved,
 * `resolvedTrick` stays null, and nothing writes `lastResolution` — so no reveal is held, the felt
 * never enters its waiting state, and the player's next tap plays their card by the ordinary rules.
 *
 * Poising does NOT clear the Cheat or Timebomb selection, and they do not clear it. Those two
 * reinterpret the next hand-card tap and therefore cannot coexist; this one reinterprets nothing,
 * so a player may poise a Cheat and apply damage in either order without losing either.
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
 * AC2 — spend one charge to mark the tapped card.
 *
 * Guards membership, the existing mark, and the charge count BEFORE calling `primeCard`, which
 * throws on the first two: a reducer must not throw, because a throw during an event handler
 * unmounts the tree. Exactly the shape `handleTapCheat` uses when it checks `hasCheat` before
 * `removeCheat`. A guard that fails clears the selection rather than half-applying it, so the
 * player is never left armed with no visible cause.
 *
 * Legality is deliberately NOT checked: marking is not a move, and the whole point of the item is
 * marking a card the player expects to lose with.
 */
function commitTimebomb(state: RoundUiState, tapped: Card): RoundUiState {
  const hand = state.round.hands[PlayerSide.Player]
  if (
    state.timebombCharges <= 0 ||
    !containsCard(hand, tapped) ||
    isPrimed(state.round.primedCards, tapped)
  ) {
    return { ...state, timebombStage: null }
  }
  return {
    ...state,
    round: primeCard(state.round, PlayerSide.Player, tapped),
    timebombCharges: state.timebombCharges - 1,
    timebombStage: null,
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
