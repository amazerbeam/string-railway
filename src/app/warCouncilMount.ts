import type { DuelSide, EncounterState, Health, Hunt } from '../hunt'
import type { WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  /** The encounter's Quarry (§4). The Demand and the Lose-credit pool were retired on DLR-67. */
  readonly hunt: Hunt
  /** The encounter this hand starts from — the reducer owns it thereafter and applies each
   *  trick's damage as it lands (DLR-80 AC6/AC8). */
  readonly encounter: EncounterState
  /** Each side's configured maximum, for the bars' denominator. NOT derivable from
   *  `EncounterState`, which carries current health only. */
  readonly maxHealth: Readonly<Record<DuelSide, Health>>
  /** AC6 — which fight of the run this is, ALREADY WORDED by the run layer. A string, not a
   *  `RunState`: the card layer renders the run's position and must not be able to read or change
   *  it. Required rather than optional deliberately, so the compiler enumerates every mount site
   *  instead of letting one silently render an empty band. */
  readonly runLabel: string
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  /** The round state at the moment `onComplete` fired. `finalState.phase` is NOT guaranteed to be
   *  `RoundPhase.Complete`: a bank cash-out can resolve the encounter mid-hand (AC6/AC8), on any
   *  trick, in which case `onComplete` fires immediately with the hand still short of its sixth
   *  trick — `finalState.phase` sitting on `AwaitingLead`/`AwaitingFollow` rather than `Complete`.
   *  A reader must check `encounter` (below) for whether the encounter itself is over, never this
   *  phase, for that. */
  readonly finalState: WarCouncilState
  /** The encounter after every damage event this hand produced. Replaces DLR-67's
   *  `damage: Readonly<Record<PlayerSide, number>>`, which had one producer and no consumer:
   *  handing up the encounter itself makes applying one event twice unexpressible rather than
   *  merely unlikely. */
  readonly encounter: EncounterState
}
