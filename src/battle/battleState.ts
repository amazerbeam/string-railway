import type { WarCouncilState } from '../warCouncil'
import type { VanguardState } from '../vanguard'
import { BattlePhase } from './battlePhase'

export interface BattleState {
  readonly phase: BattlePhase
  readonly warCouncil: WarCouncilState
  readonly vanguard: VanguardState
}
