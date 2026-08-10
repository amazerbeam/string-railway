import type { Hunt } from '../hunt'
import type { PlayerSide, WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  /** The encounter's Demand and Quarry (§1, §4). Required: an optional Demand would let a
   *  caller render a Hunt with nothing to clear and no verdict to reach. */
  readonly hunt: Hunt
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  readonly finalState: WarCouncilState // finalState.phase === RoundPhase.Complete
  readonly score: Readonly<Record<PlayerSide, number>>
}
