import type { IllegalMoveReason } from '../warCouncil'
import type { IllegalActionReason, ClashRejectionReason } from '../vanguard'
import type { BattleState } from './battleState'

export const BattleRejectionReason = {
  NotWarCouncilPhase: 'notWarCouncilPhase',
  NotMusterConversionPhase: 'notMusterConversionPhase',
  NotClashPhase: 'notClashPhase',
} as const
export type BattleRejectionReason = (typeof BattleRejectionReason)[keyof typeof BattleRejectionReason]

export type BattleActionResult =
  | { readonly ok: true; readonly state: BattleState }
  | {
      readonly ok: false
      readonly reason:
        | BattleRejectionReason
        | IllegalMoveReason
        | IllegalActionReason
        | ClashRejectionReason
    }
