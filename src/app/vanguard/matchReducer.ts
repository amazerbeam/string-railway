import {
  applyClashAction,
  cellKey,
  ClashStatus,
  chooseCpuClashAction,
  convertScoreToMuster,
  openingSideForRound,
  startClash,
  type ClashRejectionReason,
  type ClashState,
  type HexCoord,
  type IllegalActionReason,
  type VanguardAction,
  type VanguardState,
} from '../../vanguard'
import { PlayerSide, scoreRound } from '../../warCouncil'
import { isValidTricksWon, type TricksWon } from '../tricksWon'
import { inferActionKind } from './legalTargets'

export type MatchRejection = IllegalActionReason | ClashRejectionReason

export type MatchFault =
  | { readonly kind: 'cpuDeadEnd'; readonly message: string }
  | { readonly kind: 'cpuRejected'; readonly reason: MatchRejection }
  | { readonly kind: 'requestFailed'; readonly message: string }
  | { readonly kind: 'invalidTricks' }

export interface MatchUiState {
  readonly round: number
  readonly board: VanguardState
  readonly clash: ClashState | null
  readonly rejection: MatchRejection | null
  readonly fault: MatchFault | null
}

export const MatchActionKind = {
  MusterReady: 'musterReady',
  RequestFailed: 'requestFailed',
  TapCell: 'tapCell',
  ClearRejection: 'clearRejection',
  NextRound: 'nextRound',
} as const
export type MatchActionKind = (typeof MatchActionKind)[keyof typeof MatchActionKind]

export type MatchUiAction =
  | { readonly kind: typeof MatchActionKind.MusterReady; readonly tricks: TricksWon }
  | { readonly kind: typeof MatchActionKind.RequestFailed; readonly message: string }
  | { readonly kind: typeof MatchActionKind.TapCell; readonly target: HexCoord }
  | { readonly kind: typeof MatchActionKind.ClearRejection }
  | { readonly kind: typeof MatchActionKind.NextRound }

export function createMatchUiState(initialState: VanguardState): MatchUiState {
  return {
    round: 1,
    board: initialState,
    clash: null,
    rejection: null,
    fault: null,
  }
}

export function matchReducer(state: MatchUiState, action: MatchUiAction): MatchUiState {
  switch (action.kind) {
    case MatchActionKind.MusterReady:
      return handleMusterReady(state, action.tricks)
    case MatchActionKind.RequestFailed:
      return { ...state, fault: { kind: 'requestFailed', message: action.message } }
    case MatchActionKind.TapCell:
      return handleTapCell(state, action.target)
    case MatchActionKind.ClearRejection:
      return { ...state, rejection: null }
    case MatchActionKind.NextRound:
      return handleNextRound(state)
  }
}

function handleMusterReady(state: MatchUiState, tricks: TricksWon): MatchUiState {
  if (state.clash !== null || state.fault !== null) {
    return state
  }

  if (!isValidTricksWon(tricks)) {
    return { ...state, fault: { kind: 'invalidTricks' } }
  }

  const score = scoreRound(tricks)
  const muster = convertScoreToMuster(score)
  const clash = startClash(state.board, muster, openingSideForRound(state.round))

  const { clash: advancedClash, fault } = advanceCpu(clash)
  return { ...state, clash: advancedClash, fault }
}

/**
 * Infers the action from the tapped cell's own occupancy (SCRUM-41's
 * click-to-act model — no palette arming step) and submits it directly.
 * `inferActionKind` is total, so every tap names a candidate action; whether
 * it's actually legal and affordable is still decided entirely by
 * `applyClashAction`, never here.
 */
function handleTapCell(state: MatchUiState, target: HexCoord): MatchUiState {
  const { clash, fault } = state
  if (
    clash?.status !== ClashStatus.InProgress ||
    clash.turn !== PlayerSide.Player ||
    fault !== null
  ) {
    return state
  }

  const cell = clash.board.cells[cellKey(target)]
  const action: VanguardAction = { kind: inferActionKind(cell, PlayerSide.Player), target }
  const result = applyClashAction(clash, PlayerSide.Player, action)
  if (!result.ok) {
    return { ...state, rejection: result.reason }
  }

  const { clash: advancedClash, fault: cpuFault } = advanceCpu(result.state)
  return { ...state, clash: advancedClash, rejection: null, fault: cpuFault }
}

function handleNextRound(state: MatchUiState): MatchUiState {
  if (state.clash === null) {
    return state
  }

  return {
    ...state,
    round: state.round + 1,
    board: state.clash.board,
    clash: null,
    rejection: null,
  }
}

/**
 * Spends the CPU's turns until the turn returns to the player or the clash ends.
 * Bounded by muster[cpu]: every accepted action costs at least EXPAND_COST (1),
 * and any rejection breaks immediately, so this cannot spin.
 *
 * `chooseCpuClashAction` throws on its documented dead end — a side with Muster
 * but no legal affordable action (vanguard.md -> Deferred). There is no legal-move
 * enumerator to guard with the way roundReducer guards `legalMoves(...).length === 0`,
 * and re-deriving one here is exactly what AC2 forbids. So the throw is caught and
 * converted into visible, play-blocking fault state — surfaced, never swallowed.
 */
function advanceCpu(clash: ClashState): { clash: ClashState; fault: MatchFault | null } {
  let current = clash

  while (current.status === ClashStatus.InProgress && current.turn === PlayerSide.Cpu) {
    let action: VanguardAction
    try {
      action = chooseCpuClashAction(current.board, PlayerSide.Cpu, current.muster[PlayerSide.Cpu])
    } catch (error) {
      return {
        clash: current,
        fault: {
          kind: 'cpuDeadEnd',
          message: error instanceof Error ? error.message : String(error),
        },
      }
    }

    const result = applyClashAction(current, PlayerSide.Cpu, action)
    if (!result.ok) {
      return { clash: current, fault: { kind: 'cpuRejected', reason: result.reason } }
    }
    current = result.state
  }

  return { clash: current, fault: null }
}
