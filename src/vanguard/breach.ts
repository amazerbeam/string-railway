import { otherSide } from '../warCouncil'
import type { PlayerSide } from '../warCouncil'
import { cellKey } from './hexGrid'
import { connectedNetwork } from './network'
import type { VanguardBoard } from './types'

export function hasReachedBreach(board: VanguardBoard, side: PlayerSide): boolean {
  const opponentBaseKey = cellKey(board.bases[otherSide(side)])
  return connectedNetwork(board, side).some((coord) => cellKey(coord) === opponentBaseKey)
}
