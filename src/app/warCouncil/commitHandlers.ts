/**
 * The player's own commit — assembling the pending-Timebomb/bank-climb options a resolving trick
 * needs, folding a trick's resolution into the encounter, and committing `cardToPlay` before
 * advancing the Quarry's follow when the player led — separated from the reducer that calls it.
 *
 * Split out of `roundReducer.ts` in the DLR-100 fix pass, the moment the Quarry-to-lead-gap guard
 * pushed it to 404 of its 400-line budget, mirroring `quarryAdvance.ts`'s own split (DLR-94) and
 * `discardHandlers.ts`'s (DLR-100) for the same reason: this is a self-contained block that talks
 * to `playCard` and the encounter and decides nothing about the rest of the felt. PURE MOVE: no
 * behaviour changed, and every docblock came with its function.
 */
import {
  incomingFrom,
  playCard,
  PlayerSide,
  type AbilityChoice,
  type Card,
  type PlayCardOptions,
  type TrickCard,
  type TrickResolution,
} from '../../warCouncil'
import {
  applyDamage,
  DuelSide,
  hasPendingTimebomb,
  isEncounterResolved,
  NO_PENDING_TIMEBOMB,
  queueTimebomb,
  removeCheat,
  type EncounterState,
} from '../../hunt'
import { cheatArmed, type RoundUiState } from './roundUiState'
import { advanceQuarryFollow, deriveResolvedTrick } from './quarryAdvance'

/**
 * Every `PlayCardOptions` field a resolving trick needs: D1's Timebomb owed from EARLIER tricks, read
 * off the encounter's queue, plus DLR-92 AC4's bank-climb bonus, mirrored straight from state.
 *
 * One statement, read by both `playCard` call sites: the player's follow in `commit` and the
 * Quarry's in `advanceQuarryFollow`. Two readings of "what is pending" is exactly how a hit gets
 * paid twice or skipped, or a bonus applies to one side's follow and not the other's.
 */
function playOptions(state: RoundUiState): PlayCardOptions {
  return {
    timebombToPlayer: state.encounter.pendingTimebomb[DuelSide.Player],
    timebombToQuarry: state.encounter.pendingTimebomb[DuelSide.Quarry],
    blastGuarded: state.blastGuardHeld,
    bankClimbBonus: state.bankClimbBonus,
  }
}

/**
 * One trick's whole effect on the encounter, in the one place it is stated: the trick's own damage,
 * D1's Timebomb paid from an EARLIER trick, and this trick's own mark booked for the NEXT one.
 *
 * ORDER IS LOAD-BEARING, for the reason DLR-90 gave and one more. The damage lands FIRST, so
 * `queueTimebomb` then refuses a resolved encounter — a hit must never be carried into a fight that
 * is already over (D5's discard half at a fight boundary). And the queue is cleared BEFORE the new
 * booking, so a trick that both pays a Timebomb and carries a mark does not have its own mark wiped
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
  const cleared = hasPendingTimebomb(paid)
    ? { ...paid, pendingTimebomb: NO_PENDING_TIMEBOMB }
    : paid
  return resolution.timebombTarget === null
    ? cleared
    : queueTimebomb(cleared, resolution.timebombTarget)
}

/** Commits `cardToPlay` for the player, then advances the opponent when the player led. */
export function commit(
  state: RoundUiState,
  cardToPlay: Card,
  choice?: AbilityChoice,
): RoundUiState {
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
    timebombStage: null,
    // AC4 — consumed exactly when it suppressed a reset, which `resolveTrickBank` decided. The
    // reducer does not re-derive "did the Guard matter" — that would be a second reading of one
    // rule, and the two would drift.
    blastGuardHeld: resolvedTrick?.resolution.blastGuardSpent ? false : state.blastGuardHeld,
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
    blastGuardHeld: advanced.resolvedTrick?.resolution.blastGuardSpent
      ? false
      : settled.blastGuardHeld,
  }
}
