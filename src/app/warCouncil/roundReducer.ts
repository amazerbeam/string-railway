import {
  applyDamageRefusalFor,
  cashBankNow,
  CardRank,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  containsCard,
  currentTurn,
  envenomCard,
  incomingFrom,
  incomingFromCashOut,
  isEnvenomed,
  legalMoves,
  playCard,
  sameCard,
  type AbilityChoice,
  type Card,
  type PlayCardOptions,
  type TrickCard,
  type TrickResolution,
} from '../../warCouncil'
import {
  applyDamage,
  DuelSide,
  hasCheat,
  hasPendingEnvenom,
  isEncounterResolved,
  NO_PENDING_ENVENOM,
  queueEnvenom,
  removeCheat,
  type CheatCardId,
  type EncounterState,
} from '../../hunt'
import {
  applyDamageStock,
  canAct,
  cheatArmed,
  CheatStage,
  envenomArmed,
  EnvenomStage,
  RoundUiActionKind,
  type RoundUiAction,
  type RoundUiState,
} from './roundUiState'
import { advanceQuarryFollow, advanceQuarryLead, deriveResolvedTrick } from './quarryAdvance'

export function roundReducer(state: RoundUiState, action: RoundUiAction): RoundUiState {
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
    case RoundUiActionKind.TapEnvenom:
      return handleTapEnvenom(state)
    case RoundUiActionKind.CancelEnvenom:
      return state.envenomStage === null ? state : { ...state, envenomStage: null }
    case RoundUiActionKind.TapApplyDamage:
      return handleTapApplyDamage(state)
    case RoundUiActionKind.CancelApplyDamage:
      return state.applyPoised ? { ...state, applyPoised: false } : state
  }
}

function handleTapCard(state: RoundUiState, tapped: Card): RoundUiState {
  if (!canAct(state)) {
    return state
  }

  // AC2 — while armed, a hand-card tap MARKS rather than plays.
  if (envenomArmed(state)) {
    return commitEnvenom(state, tapped)
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
  if (!canAct(state) || !hasCheat(state.cheats, id)) {
    return state
  }
  const current = state.cheatSelection
  if (current === null || current.id !== id) {
    // Arming a Cheat reinterprets the same hand-card tap Envenom does, so the two selections
    // cannot coexist — clear a held Envenom selection here for the same reason `handleTapEnvenom`
    // clears `cheatSelection` on its own poise branch.
    return { ...state, cheatSelection: { id, stage: CheatStage.Poised }, envenomStage: null }
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
function handleTapEnvenom(state: RoundUiState): RoundUiState {
  if (!canAct(state) || state.envenomCharges <= 0) {
    return state
  }
  if (state.envenomStage === null) {
    return { ...state, envenomStage: EnvenomStage.Poised, cheatSelection: null, armed: null }
  }
  if (state.envenomStage === EnvenomStage.Poised) {
    return { ...state, envenomStage: EnvenomStage.Armed }
  }
  return { ...state, envenomStage: null }
}

/**
 * DLR-94 AC1/AC2 — three outcomes on one control, mirroring `handleTapEnvenom`'s shape. A refusal
 * changes nothing; nothing poised poises; poised COMMITS. There is no third stage: unlike Envenom,
 * this control's second tap IS the action rather than a prelude to a hand-card tap.
 *
 * Asks `applyDamageRefusalFor` on BOTH taps, not just the first. The felt can change under a
 * poised plate — a poison booking lands, a reveal is held, the turn passes — and re-reading is what
 * stops a poise made while the control was live from committing after it stopped being. D6
 * (version-4-scope §3) asks for exactly this: the control must read the pending-poison predicate
 * "before it commits to anything".
 *
 * AC3 needs no code here. `cashBankNow` returns the round with only `bank` and `multiplier` moved,
 * `resolvedTrick` stays null, and nothing writes `lastResolution` — so no reveal is held, the felt
 * never enters its waiting state, and the player's next tap plays their card by the ordinary rules.
 *
 * Poising does NOT clear the Cheat or Envenom selection, and they do not clear it. Those two
 * reinterpret the next hand-card tap and therefore cannot coexist; this one reinterprets nothing,
 * so a player may poise a Cheat and apply damage in either order without losing either.
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
  // Guarded for the reason `applyResolution` guards: `applyDamage` THROWS on an already-resolved
  // encounter, and a reducer must not throw — a throw during an event handler unmounts the tree.
  // Unreachable in practice, since a resolved encounter already fails `canAct`.
  const encounter = isEncounterResolved(state.encounter)
    ? state.encounter
    : applyDamage(state.encounter, incomingFromCashOut(cashOut))
  return { ...state, round, encounter, applyPoised: false }
}

/**
 * AC2 — spend one charge to mark the tapped card.
 *
 * Guards membership, the existing mark, and the charge count BEFORE calling `envenomCard`, which
 * throws on the first two: a reducer must not throw, because a throw during an event handler
 * unmounts the tree. Exactly the shape `handleTapCheat` uses when it checks `hasCheat` before
 * `removeCheat`. A guard that fails clears the selection rather than half-applying it, so the
 * player is never left armed with no visible cause.
 *
 * Legality is deliberately NOT checked: marking is not a move, and the whole point of the item is
 * marking a card the player expects to lose with.
 */
function commitEnvenom(state: RoundUiState, tapped: Card): RoundUiState {
  const hand = state.round.hands[PlayerSide.Player]
  if (
    state.envenomCharges <= 0 ||
    !containsCard(hand, tapped) ||
    isEnvenomed(state.round.envenomedCards, tapped)
  ) {
    return { ...state, envenomStage: null }
  }
  return {
    ...state,
    round: envenomCard(state.round, PlayerSide.Player, tapped),
    envenomCharges: state.envenomCharges - 1,
    envenomStage: null,
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
    cleared.round.currentTrick.length > 0
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

/**
 * Every `PlayCardOptions` field a resolving trick needs: D1's poison owed from EARLIER tricks, read
 * off the encounter's queue, plus DLR-92 AC4's bank-climb bonus, mirrored straight from state.
 *
 * One statement, read by both `playCard` call sites: the player's follow in `commit` and the
 * Quarry's in `advanceQuarryFollow`. Two readings of "what is pending" is exactly how a hit gets
 * paid twice or skipped, or a bonus applies to one side's follow and not the other's.
 */
function playOptions(state: RoundUiState): PlayCardOptions {
  return {
    poisonToPlayer: state.encounter.pendingEnvenom[DuelSide.Player],
    poisonToQuarry: state.encounter.pendingEnvenom[DuelSide.Quarry],
    poisonGuarded: state.poisonGuardHeld,
    bankClimbBonus: state.bankClimbBonus,
  }
}

/**
 * One trick's whole effect on the encounter, in the one place it is stated: the trick's own damage,
 * D1's poison paid from an EARLIER trick, and this trick's own mark booked for the NEXT one.
 *
 * ORDER IS LOAD-BEARING, for the reason DLR-90 gave and one more. The damage lands FIRST, so
 * `queueEnvenom` then refuses a resolved encounter — a hit must never be carried into a fight that
 * is already over (D5's discard half at a fight boundary). And the queue is cleared BEFORE the new
 * booking, so a trick that both pays a poison and carries a mark does not have its own mark wiped
 * by the clear.
 *
 * The all-zero skip avoids bumping `damageEventsApplied` for nothing, but does not return early: a
 * REPLACED clean loss (DLR-90 AC5) is an all-zero event that still owes a booking.
 */
function applyResolution(encounter: EncounterState, resolution: TrickResolution): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  const cleared = hasPendingEnvenom(paid) ? { ...paid, pendingEnvenom: NO_PENDING_ENVENOM } : paid
  return resolution.envenomTarget === null
    ? cleared
    : queueEnvenom(cleared, resolution.envenomTarget)
}

/** Commits `cardToPlay` for the player, then advances the opponent when the player led. */
function commit(state: RoundUiState, cardToPlay: Card, choice?: AbilityChoice): RoundUiState {
  const armedCheat = cheatArmed(state) ? state.cheatSelection : null
  const result = playCard(state.round, PlayerSide.Player, cardToPlay, choice, {
    ...playOptions(state),
    ...(armedCheat ? { ignoreFollowSuit: true } : {}),
  })
  if (!result.ok) {
    // A rejection is NOT a commit (AC7), so the Cheat survives and stays armed — the player can
    // try another card without paying twice.
    return { ...state, armed: null, prompt: null, rejection: result.reason }
  }

  // AC7 — consumed on ANY successful commit while armed, even if the card was legal anyway.
  // No "was it needed" check: that would put a legality judgement in the reducer that
  // `legalMoves` already owns, and would make arming free.
  const cheats = armedCheat ? removeCheat(state.cheats, armedCheat.id) : state.cheats

  const playedCard: TrickCard = { side: PlayerSide.Player, card: cardToPlay }
  const resolvedTrick = deriveResolvedTrick(state.round, result.state, playedCard)
  const encounter = resolvedTrick
    ? applyResolution(state.encounter, resolvedTrick.resolution)
    : state.encounter
  const settled: RoundUiState = {
    ...state,
    round: result.state,
    armed: null,
    prompt: null,
    rejection: null,
    resolvedTrick,
    encounter,
    cheats,
    cheatSelection: null,
    envenomStage: null,
    // AC4 — consumed exactly when it suppressed a reset, which `resolveTrickBank` decided. The
    // reducer does not re-derive "did the Guard matter" — that would be a second reading of one
    // rule, and the two would drift.
    poisonGuardHeld: resolvedTrick?.resolution.poisonGuardSpent ? false : state.poisonGuardHeld,
  }

  if (resolvedTrick) {
    return settled
  }

  // The player led — advance the opponent in the same commit. `settled`, not `state`, so the
  // Quarry's follow reads the queue as the player's own commit left it.
  const advanced = advanceQuarryFollow(result.state, playOptions(settled))
  return {
    ...settled,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
    encounter: advanced.resolvedTrick
      ? applyResolution(settled.encounter, advanced.resolvedTrick.resolution)
      : settled.encounter,
    poisonGuardHeld: advanced.resolvedTrick?.resolution.poisonGuardSpent
      ? false
      : settled.poisonGuardHeld,
  }
}
