import type { DuelSide, EncounterState, Health, Hunt } from '../hunt'
import type { WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  /** The encounter's Quarry (§4). The Demand and the Lose-credit pool were retired on DLR-67. */
  readonly hunt: Hunt
  /** The live encounter this Hunt is fought inside (DLR-71). Health only changes at trick 13, so
   *  this is constant for the whole round. */
  readonly encounter: EncounterState
  /** Each side's configured maximum, for the bars' denominator. NOT derivable from
   *  `EncounterState`, which carries current health only. */
  readonly maxHealth: Readonly<Record<DuelSide, Health>>
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  readonly finalState: WarCouncilState // finalState.phase === RoundPhase.Complete
  /** The encounter AFTER this Hunt's damage was applied — the state the player just watched land.
   *  Replaces DLR-67's `damage: Readonly<Record<PlayerSide, number>>`, which had one producer and
   *  no consumer: handing up the applied state makes applying one Hunt twice unexpressible rather
   *  than merely unlikely. */
  readonly encounter: EncounterState
}
