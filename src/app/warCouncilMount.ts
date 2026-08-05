import type { PlayerSide, WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  readonly finalState: WarCouncilState // finalState.phase === RoundPhase.Complete
  readonly score: Readonly<Record<PlayerSide, number>>
}
