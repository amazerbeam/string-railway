export type { VanguardBoard as VanguardState } from './types'

export { VanguardCellKind, VanguardActionKind, IllegalActionReason } from './types'
export type {
  HexCoord,
  CellKey,
  TokenCell,
  DefenseCell,
  VanguardCell,
  VanguardBoard,
  VanguardAction,
  VanguardActionResult,
} from './types'
export {
  cellKey,
  isWithinBoard,
  hexNeighbors,
  hexDistance,
  allBoardCoords,
  hexBfs,
} from './hexGrid'
export {
  BOARD_SIZE,
  DEFENSE_CELLS,
  EXPAND_RANGE,
  EXPAND_COST,
  OVERWRITE_COST,
  OVERWRITE_COST_REINFORCED,
  REINFORCE_COST,
  REINFORCE_MAX_STACK,
} from './config'
export { connectedNetwork, minDistanceToNetwork, ownedCells } from './network'
export { hasReachedBreach } from './breach'
export { createVanguardBoard } from './createBoard'
export { applyExpand } from './expand'
export { applyOverwrite, overwriteCostFor } from './overwrite'
export { applyReinforce } from './reinforce'
export { applyVanguardAction } from './applyVanguardAction'
export type { Muster } from './types'
export { MUSTER_BASELINE, MUSTER_BONUS } from './config'
export { convertScoreToMuster } from './musterConversion'
export { ClashStatus, ClashRejectionReason } from './types'
export type { ClashState, ClashActionResult } from './types'
export { CLASH_FIRST_ROUND_OPENER } from './config'
export { startClash, applyClashAction } from './clash'
export { openingSideForRound } from './clashOpener'
export { chooseCpuClashAction } from './cpuPlayer'
