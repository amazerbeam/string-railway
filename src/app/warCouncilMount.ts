import type { Hunt } from '../hunt'
import type { PlayerSide, WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  /** The encounter's Quarry (§4). The Demand and the Lose-credit pool were retired on DLR-67. */
  readonly hunt: Hunt
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  readonly finalState: WarCouncilState // finalState.phase === RoundPhase.Complete
  readonly damage: Readonly<Record<PlayerSide, number>>
}
