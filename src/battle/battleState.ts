import type { PlayerSide, WarCouncilState } from '../warCouncil'
import type { VanguardState, ClashState } from '../vanguard'
import { BattlePhase } from './battlePhase'

export type BattleState =
  | {
      readonly phase: typeof BattlePhase.WarCouncilRound
      readonly round: number
      readonly dealer: PlayerSide
      readonly vanguard: VanguardState
      readonly warCouncil: WarCouncilState
    }
  | {
      readonly phase: typeof BattlePhase.MusterConversion
      readonly round: number
      readonly dealer: PlayerSide
      readonly vanguard: VanguardState
      readonly warCouncil: WarCouncilState
    }
  | {
      readonly phase: typeof BattlePhase.Clash
      readonly round: number
      readonly dealer: PlayerSide
      readonly clash: ClashState
    }
  | {
      readonly phase: typeof BattlePhase.Resolved
      readonly round: number
      readonly vanguard: VanguardState
      readonly winner: PlayerSide
    }
