import type { CheatCard, Coins, DuelSide, EncounterState, Health, Hunt } from '../hunt'
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
  /** AC1/AC3 — the run's held Cheats at the START of this hand. Same contract as `encounter`
   *  above: an opening figure the reducer owns for the life of the hand and hands back through
   *  `WarCouncilRoundResult.cheats`. Required, not optional, so the compiler enumerates every
   *  mount site rather than letting one render an empty rail. */
  readonly cheats: readonly CheatCard[]
  /** AC2 — the run's purse during a hand. A number, not a `RunState`: the same contract
   *  `runLabel` above states — the card layer renders a run figure and must not change it.
   *  Required, not optional, so the compiler enumerates every mount site rather than letting one
   *  silently render a blank plate. */
  readonly coins: Coins
  /** The Quarry health bar's name, ALREADY WORDED by `quarryHealthLabel` — `Aoife’s health`.
   *  Exactly `runLabel`'s contract, for exactly its reason: the card layer renders the opponent's
   *  name and must not learn how to look one up, so it receives a string rather than a roster, an
   *  index, or a `RunState`. Required, not optional, so the compiler enumerates every mount site
   *  rather than letting one silently fall back to the generic wording. */
  readonly quarryLabel: string
  /** DLR-90 AC2 — Timebomb charges held at the START of this hand. The same contract `cheats` above
   *  documents: an opening figure the reducer owns for the hand's life and hands back through
   *  `WarCouncilRoundResult`. REQUIRED rather than optional so the compiler enumerates every mount
   *  site instead of letting one silently render an inert plate. */
  readonly timebombCharges: number
  /** DLR-91 AC4 — whether a Blast Guard is held at the START of this hand. The same contract
   *  `timebombCharges` above documents: an opening figure the reducer owns for the hand's life and
   *  hands back through `WarCouncilRoundResult`. REQUIRED rather than optional so the compiler
   *  enumerates every mount site instead of letting one silently fight without its insurance. */
  readonly blastGuardHeld: boolean
  /** DLR-100 AC5 — discards remaining at the START of this hand. Same contract as `timebombCharges`
   *  above: an opening figure the reducer owns for the hand's life and hands back through
   *  `WarCouncilRoundResult`. REQUIRED rather than optional so the compiler enumerates every mount
   *  site instead of letting one silently render an inert rail. */
  readonly discardsRemaining: number
  /** DLR-92 AC4 — the bank-climb bonus in force for this hand, ALREADY RESOLVED from the run's
   *  Whetstone count by `bankClimbBonusFor`. A number, not a `RunState` and not an item count: the
   *  card layer renders a run figure and must not learn what bought it. REQUIRED rather than
   *  optional so the compiler enumerates every mount site instead of letting one silently fight
   *  without the buff. Unlike `timebombCharges` and `blastGuardHeld` it does NOT come back on
   *  `WarCouncilRoundResult` — a hand cannot spend it. */
  readonly bankClimbBonus: number
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
  /** AC7 — the Cheats still held after this hand. One fewer for each Cheat spent; the run adopts
   *  it through `recordEncounter`'s third parameter. */
  readonly cheats: readonly CheatCard[]
  /** DLR-90 AC2 — the charges still held after this hand. One fewer for each card marked; the run
   *  adopts it through `recordEncounter`'s fourth parameter. */
  readonly timebombCharges: number
  /** DLR-91 AC4 — whether the Guard is still held after this hand. `false` once it has fired; the
   *  run adopts it through `recordEncounter`'s fifth parameter, which also clears it when the
   *  encounter resolved. */
  readonly blastGuardHeld: boolean
  /** DLR-100 AC5 — discards remaining after this hand. One fewer for each discard spent; the run
   *  adopts it through `recordEncounter`'s sixth parameter. */
  readonly discardsRemaining: number
  /** DLR-95 AC2 — how many cards were left in the player's hand at the instant the encounter
   *  resolved, or `null` when this hand did not resolve it. Frozen by the reducer at that
   *  transition rather than read off the live hand here — see `RoundUiState.unplayedAtResolve`
   *  for why the two are not interchangeable. The run consumes it through `recordEncounter`'s
   *  sixth parameter. */
  readonly unplayedAtResolve: number | null
}
