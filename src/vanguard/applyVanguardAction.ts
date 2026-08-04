import type { PlayerSide } from '../warCouncil'
import { applyExpand } from './expand'
import { applyOverwrite } from './overwrite'
import { applyReinforce } from './reinforce'
import { VanguardActionKind } from './types'
import type { VanguardAction, VanguardActionResult, VanguardBoard } from './types'

export function applyVanguardAction(
  board: VanguardBoard,
  side: PlayerSide,
  action: VanguardAction,
): VanguardActionResult {
  switch (action.kind) {
    case VanguardActionKind.Expand:
      return applyExpand(board, side, action.target)
    case VanguardActionKind.Overwrite:
      return applyOverwrite(board, side, action.target)
    case VanguardActionKind.Reinforce:
      return applyReinforce(board, side, action.target)
  }
}
