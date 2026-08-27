import type {
  ActionPoints,
  Buff,
  BuffCarry,
  Coins,
  DuelSide,
  EncounterState,
  Health,
  Hunt,
  RankTierTable,
} from '../hunt'
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
  /** DLR-91 AC4 — whether a Blast Guard is held at the START of this hand. An opening figure the
   *  reducer owns for the hand's life and hands back through `WarCouncilRoundResult`. REQUIRED
   *  rather than optional so the compiler enumerates every mount site instead of letting one
   *  silently fight without its insurance. */
  readonly blastGuardHeld: boolean
  /** DLR-100 AC5 — discards remaining at the START of this hand. Same contract as `blastGuardHeld`
   *  above: an opening figure the reducer owns for the hand's life and hands back through
   *  `WarCouncilRoundResult`. REQUIRED rather than optional so the compiler enumerates every mount
   *  site instead of letting one silently render an inert rail. */
  readonly discardsRemaining: number
  /** DLR-114 — the run's owned buff pile at the START of this hand. The same contract `blastGuardHeld`
   *  above documents: an opening figure the reducer owns for the life of the hand. REQUIRED rather
   *  than optional so the compiler enumerates every mount site instead of letting one silently
   *  render an empty loadout. DLR-126 — it DOES come back on `WarCouncilRoundResult.buffs` now:
   *  a hand spends consumable items as well as action points, so it can change the pile. DLR-132 —
   *  Cheat and Timebomb are pile members now, so this is also the ONLY figure that carries either
   *  of them into or out of a hand; there is no longer a second `cheats`/`timebombCharges` pair. */
  readonly buffs: readonly Buff[]
  /** DLR-92 AC4 — the bank-climb bonus in force for this hand, ALREADY RESOLVED from the run's
   *  Whetstone count by `bankClimbBonusFor`. A number, not a `RunState` and not an item count: the
   *  card layer renders a run figure and must not learn what bought it. REQUIRED rather than
   *  optional so the compiler enumerates every mount site instead of letting one silently fight
   *  without the buff. Unlike `blastGuardHeld` it does NOT come back on
   *  `WarCouncilRoundResult` — a hand cannot spend it. */
  readonly bankClimbBonus: number
  /** DLR-116 — the per-hand AP pool including capacity bought in the shop. OPTIONAL and defaulted
   *  to STARTING_AP so every existing seed fixture reproduces the pre-DLR-116 pool exactly; the
   *  driver passes apCapacityFor(run.apCapacityBonus). */
  readonly apCapacity?: ActionPoints
  /** DLR-122 AC2/AC3 — the PLAYER's bought ability ladder, ALREADY RESOLVED from the run by
   *  `playerRankTiersFor`. A plain table, not a `RunState`: the card layer resolves a run figure
   *  and must not learn what bought it, exactly as `bankClimbBonus` above documents. OPTIONAL and
   *  defaulted to `ALL_BRONZE`, following `apCapacity` immediately above rather than
   *  `bankClimbBonus`: an absent table IS "nothing bought", which AC1 requires play identically
   *  to today, so every existing seed fixture reproduces the pre-DLR-122 game exactly. Unlike
   *  `blastGuardHeld` it does NOT come back on `WarCouncilRoundResult` —
   *  a hand cannot buy or spend a tier. */
  readonly rankTiers?: RankTierTable
  /** DLR-150 AC3 — the carry this hand OPENS on. OPTIONAL and defaulted to `EMPTY_BUFF_CARRY`,
   *  following `apCapacity`, so every existing mount site and fixture reproduces today's game. */
  readonly feederCarry?: BuffCarry
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
  /** DLR-91 AC4 — whether the Guard is still held after this hand. `false` once it has fired; the
   *  run adopts it through `recordEncounter`'s third parameter, which also clears it when the
   *  encounter resolved. */
  readonly blastGuardHeld: boolean
  /** DLR-100 AC5 — discards remaining after this hand. One fewer for each discard spent; the run
   *  adopts it through `recordEncounter`'s fourth parameter. */
  readonly discardsRemaining: number
  /** DLR-126 — the owned buff pile after this hand. One fewer for each CONSUMABLE ITEM spent; the
   *  run adopts it through `recordEncounter`'s seventh parameter. The same contract `blastGuardHeld`
   *  above documents, and it reverses `WarCouncilMountProps.buffs`' own note that the pile "does NOT come
   *  back on `WarCouncilRoundResult`" — that was true while a hand could only spend action points.
   *  It can spend cards now. REQUIRED rather than optional so the compiler enumerates both
   *  construction sites instead of letting one silently resurrect a spent consumable. DLR-132 — a
   *  Cheat and a Timebomb are pile members like any other buff, so this field alone carries either
   *  one's spend back to the run; there is no more `cheats`/`timebombCharges` pair beside it. */
  readonly buffs: readonly Buff[]
  /** DLR-95 AC2 — how many cards were left in the player's hand at the instant the encounter
   *  resolved, or `null` when this hand did not resolve it. Frozen by the reducer at that
   *  transition rather than read off the live hand here — see `RoundUiState.unplayedAtResolve`
   *  for why the two are not interchangeable. The run consumes it through `recordEncounter`'s
   *  fifth parameter. */
  readonly unplayedAtResolve: number | null
  /** DLR-125 — Purse coins this hand's fired buffs earned, already clipped at
   *  `MAX_COIN_BONUS_PER_HAND` by the accrual. REQUIRED so the compiler enumerates both
   *  construction sites; the run adopts it through `recordEncounter`'s optional sixth
   *  parameter. */
  readonly coinsEarned: Coins
  /** DLR-150 AC1 — what this hand banked for the next one. REQUIRED, following `coinsEarned`,
   *  so the compiler enumerates every construction site. */
  readonly feederCarry: BuffCarry
}
