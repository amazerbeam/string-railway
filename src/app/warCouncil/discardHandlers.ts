/**
 * DLR-100 — the discard's three reducer transitions: opening/committing the selection, cancelling
 * it, and toggling a hand card's membership in it — separated from the reducer that calls them.
 *
 * Split out of `roundReducer.ts` the moment Task 13 pushed it to 458 of its 400-line budget,
 * mirroring `quarryAdvance.ts`'s own split (DLR-94) for the same reason: this is a self-contained
 * block that doesn't decide anything about the rest of the felt, so nothing here needs the reducer
 * around it. PURE MOVE: no behaviour changed, and every docblock came with its function.
 */
import {
  applyDiscard,
  containsCard,
  discardRefusalFor,
  PlayerSide,
  sameCard,
  type Card,
} from '../../warCouncil'
import { MAX_CARDS_PER_DISCARD } from '../../hunt'
import { discardStock, type RoundUiState } from './roundUiState'

/**
 * DLR-100 — three outcomes on one control. Not selecting, refusal null → OPEN (clearing any Cheat
 * or Timebomb selection and any armed card, mutual exclusion mirroring `handleTapTimebomb`'s own).
 * Selecting, refusal null → the only way that happens is a non-empty selection, so COMMIT through
 * `applyDiscard` and decrement the budget. Refused → no-op, matching `handleTapApplyDamage`'s own
 * shape.
 */
export function handleTapDiscard(state: RoundUiState): RoundUiState {
  if (discardRefusalFor(discardStock(state)) !== null) {
    return state
  }
  if (state.discardSelection === null) {
    return {
      ...state,
      discardSelection: [],
      cheatSelection: null,
      timebombStage: null,
      armed: null,
    }
  }
  const round = applyDiscard(state.round, PlayerSide.Player, state.discardSelection)
  return {
    ...state,
    round,
    discardsRemaining: state.discardsRemaining - 1,
    discardSelection: null,
  }
}

/** AC9 — close the selection without spending, mirroring `clearCheat`'s and `CancelTimebomb`'s own
 *  shape. */
export function handleCancelDiscard(state: RoundUiState): RoundUiState {
  return state.discardSelection === null ? state : { ...state, discardSelection: null }
}

/**
 * Toggle `tapped`'s membership in the open selection, capped at `MAX_CARDS_PER_DISCARD` and
 * silently ignoring a tap past the cap or on a card not in hand — matching this codebase's existing
 * silent-guard style (`clearCheat`'s stale-selection drop).
 */
export function toggleDiscardCard(state: RoundUiState, tapped: Card): RoundUiState {
  const selection = state.discardSelection ?? []
  if (containsCard(selection, tapped)) {
    return { ...state, discardSelection: selection.filter((c) => !sameCard(c, tapped)) }
  }
  if (
    selection.length >= MAX_CARDS_PER_DISCARD ||
    !containsCard(state.round.hands[PlayerSide.Player], tapped)
  ) {
    return state
  }
  return { ...state, discardSelection: [...selection, tapped] }
}
