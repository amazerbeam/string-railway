/**
 * The felt's UI state, its seed, its actions, and the pure predicates over it — everything the
 * reducer operates ON, separated from the reducer that operates on it.
 *
 * Split out of `roundReducer.ts` on DLR-90: that file had reached 382 of its 400-line budget
 * before Timebomb's handlers were written. The seam is deliberate rather than arbitrary — this file
 * is what a COMPONENT imports (the state shape, the action kinds, the predicates it renders from),
 * and `roundReducer.ts` is the transition function nothing but the mount needs. Nothing here
 * decides anything.
 */
import {
  currentTurn,
  PlayerSide,
  RoundPhase,
  type AbilityChoice,
  type ApplyDamageStock,
  type Card,
  type DiscardStock,
  type IllegalMoveReason,
  type TrickCard,
  type TrickResolution,
  type WarCouncilState,
} from '../../warCouncil'
import {
  apCostOf,
  hasPendingApplyPayout,
  hasPendingTimebomb,
  isEncounterResolved,
  refreshActionPointsForNewHand,
  STARTING_AP,
  type ActionPoints,
  type Buff,
  type BuffActivationState,
  type BuffActivationStock,
  type CheatCard,
  type CheatCardId,
  type EncounterState,
} from '../../hunt'

export interface ResolvedTrick {
  readonly cards: readonly TrickCard[] // [lead, follow] — the engine's load-bearing order
  readonly winner: PlayerSide
  /** What the trick did to the bank, the streak and both bars. */
  readonly resolution: TrickResolution
}

export const CheatStage = {
  /** One click — a selection, no rule effect. AC4's guard against a single misclick. */
  Poised: 'poised',
  /** Two clicks — follow-suit is lifted for the next committed card. AC5. */
  Armed: 'armed',
} as const
export type CheatStage = (typeof CheatStage)[keyof typeof CheatStage]

/** ONE field, not two nullables: `poised` and `armed` are stages of a single selection, and two
 *  nullable fields would admit the invalid pair "poised AND armed". */
export interface CheatSelection {
  readonly id: CheatCardId
  readonly stage: CheatStage
}

/** AC2 — the two stages of one Timebomb selection, mirroring `CheatStage` exactly because AC2 asks
 *  for the Cheat's arm/commit shape rather than a new interaction grammar. */
export const TimebombStage = {
  /** One tap — a selection, no effect. The misclick guard: the mark is irreversible. */
  Poised: 'poised',
  /** Two taps — the next tapped hand card is MARKED rather than played. */
  Armed: 'armed',
} as const
export type TimebombStage = (typeof TimebombStage)[keyof typeof TimebombStage]

export interface RoundUiState {
  readonly round: WarCouncilState
  readonly armed: Card | null // tapped once, lifted, awaiting its second tap
  readonly prompt: Card | null // a Fox or Woodcutter awaiting its AbilityChoice
  readonly resolvedTrick: ResolvedTrick | null // held on screen until CarryOn
  readonly rejection: IllegalMoveReason | null // the player's own illegal move — recoverable
  readonly cpuFault: CpuFault | null // a corrupt CPU turn — a bug, shown not swallowed
  /** The live encounter. Never null: seeded from the mount's prop and updated in place as each
   *  trick resolves, because AC6 and AC8 make the cash-out automatic and mid-hand. Replaces the
   *  nullable `applied`, which existed only to model "the player has pressed Apply". */
  readonly encounter: EncounterState
  /** This hand's OPENING encounter, frozen at mount and never written again — the baseline the
   *  hand-over panel's tally is a delta against.
   *
   *  It is state rather than the mount's `encounter` prop deliberately. On the hand that ends the
   *  encounter, `App` sets its own encounter from `onComplete` and then returns early WITHOUT
   *  changing the `key` that would remount this component — so the prop becomes the live value
   *  underneath a panel that is still on screen, and a prop-based delta silently collapses to
   *  zero. Freezing the baseline here makes the tally independent of anything the parent does
   *  after the hand is over. */
  readonly openingEncounter: EncounterState
  /** AC1/AC3 — the run's held Cheats, mirrored from the mount's opening prop and updated in place
   *  as `commit` spends one. Run state carried for the life of the hand — see
   *  `warCouncilMount.ts`'s `WarCouncilMountProps.cheats` for the same contract `encounter`
   *  above already documents. */
  readonly cheats: readonly CheatCard[]
  /** The hand's OWN transient — dies on remount, never touches `RunState`. `null` when nothing is
   *  selected. */
  readonly cheatSelection: CheatSelection | null
  /** AC2 — charges held, mirrored from the mount's opening prop and decremented as a card is
   *  marked. Run state carried for the life of the hand — the same contract `cheats` documents. */
  readonly timebombCharges: number
  /** The hand's OWN transient — dies on remount, never touches `RunState`. ONE nullable field
   *  rather than two booleans, for `CheatSelection`'s stated reason: `poised` and `armed` are
   *  stages of one selection and two fields would admit the invalid pair "poised AND armed".
   *  No id, unlike `CheatSelection` — charges are fungible, and the card marked is the identity. */
  readonly timebombStage: TimebombStage | null
  /** DLR-91 AC4 — mirrored from the mount's opening prop and flipped to `false` the moment a
   *  resolved trick reports `blastGuardSpent`. Run state carried for the life of the hand, the
   *  same contract `cheats` and `timebombCharges` document. */
  readonly blastGuardHeld: boolean
  /** DLR-92 AC4 — the bank-climb bonus in force for this hand, mirrored from the mount's opening
   *  prop. Read-only for the hand's whole life: no action ever writes it, because a hand cannot
   *  spend or change a Whetstone — only the shop between hands can. */
  readonly bankClimbBonus: number
  /** DLR-94 — the Apply Damage plate has been tapped once and awaits its confirming second tap.
   *  The hand's OWN transient: dies on remount, never touches `RunState`.
   *
   *  A single BOOLEAN rather than `TimebombStage`'s two-stage union, deliberately. Timebomb needs
   *  two stages because its armed state waits for a THIRD tap on a hand card; Apply Damage's
   *  second tap IS the action, so "poised" is the only state there is to be in. */
  readonly applyPoised: boolean
  /** DLR-95 AC2 — the player's hand size at the FIRST transition after which the encounter reads
   *  resolved, frozen from then on. `null` until then, and `null` for a hand that never ends the
   *  fight.
   *
   *  FROZEN rather than re-derived at `onComplete` time, and that is load-bearing. The live hand
   *  length happens to give the same answer today only because `canAct` goes false once the
   *  encounter resolves, so nothing further can be played — correctness that rests on an unrelated
   *  predicate staying false is correctness that breaks silently. The same reasoning
   *  `openingEncounter` above already documents. */
  readonly unplayedAtResolve: number | null
  /** DLR-100 AC5 — mirrored from the mount's opening prop, decremented on each committed discard.
   *  Run state carried for the life of the hand — the same contract `cheats` and `timebombCharges`
   *  document. */
  readonly discardsRemaining: number
  /** DLR-100 — the hand's OWN transient: dies on remount, never touches `RunState`. `null` when
   *  the discard rail is closed; an array (possibly empty) while it is open, holding the hand
   *  cards currently toggled in. ONE field rather than a boolean-plus-array pair, for
   *  `CheatSelection`'s stated reason: two independent fields would admit "closed but holding a
   *  stale selection". */
  readonly discardSelection: readonly Card[] | null
  /** DLR-109 AC1 — the hand's action-point pool. Seeded at mount through
   *  `refreshActionPointsForNewHand`, because `App.tsx` remounts the felt per hand (`key={hand}`),
   *  so a mount IS the per-hand refresh. Spent only through `spendAp`. */
  readonly apPool: ActionPoints
}

export interface RoundUiSeed {
  readonly round: WarCouncilState
  readonly encounter: EncounterState
  readonly cheats: readonly CheatCard[]
  readonly timebombCharges: number
  readonly blastGuardHeld: boolean
  readonly bankClimbBonus: number
  readonly discardsRemaining: number
}

// `chooseCpuMove` throws rather than returning a rejection when the CPU has no legal
// move (`lowestCard([])` is `undefined`, then `card.rank` throws), so the reducer guards
// before calling it and names that case separately from a `playCard` rejection.
export type CpuFault = IllegalMoveReason | 'noLegalMove'

export const RoundUiActionKind = {
  TapCard: 'tapCard',
  ChooseAbility: 'chooseAbility',
  CancelSelection: 'cancelSelection',
  CarryOn: 'carryOn',
  TapCheat: 'tapCheat',
  CancelCheat: 'cancelCheat',
  TapTimebomb: 'tapTimebomb',
  CancelTimebomb: 'cancelTimebomb',
  TapApplyDamage: 'tapApplyDamage',
  CancelApplyDamage: 'cancelApplyDamage',
  TapDiscard: 'tapDiscard',
  CancelDiscard: 'cancelDiscard',
} as const
export type RoundUiActionKind = (typeof RoundUiActionKind)[keyof typeof RoundUiActionKind]

export type RoundUiAction =
  | { readonly kind: typeof RoundUiActionKind.TapCard; readonly card: Card }
  | { readonly kind: typeof RoundUiActionKind.ChooseAbility; readonly choice: AbilityChoice }
  | { readonly kind: typeof RoundUiActionKind.CancelSelection }
  | { readonly kind: typeof RoundUiActionKind.CarryOn }
  | { readonly kind: typeof RoundUiActionKind.TapCheat; readonly id: CheatCardId }
  | { readonly kind: typeof RoundUiActionKind.CancelCheat }
  | { readonly kind: typeof RoundUiActionKind.TapTimebomb }
  | { readonly kind: typeof RoundUiActionKind.CancelTimebomb }
  | { readonly kind: typeof RoundUiActionKind.TapApplyDamage }
  | { readonly kind: typeof RoundUiActionKind.CancelApplyDamage }
  | { readonly kind: typeof RoundUiActionKind.TapDiscard }
  | { readonly kind: typeof RoundUiActionKind.CancelDiscard }

/** Still a pure restructuring of its seed, so StrictMode's double-invocation of the lazy
 *  `useReducer` initialiser recomputes an identical value. */
export function createRoundUiState(seed: RoundUiSeed): RoundUiState {
  return {
    round: seed.round,
    armed: null,
    prompt: null,
    resolvedTrick: null,
    rejection: null,
    cpuFault: null,
    encounter: seed.encounter,
    openingEncounter: seed.encounter,
    cheats: seed.cheats,
    cheatSelection: null,
    timebombCharges: seed.timebombCharges,
    timebombStage: null,
    blastGuardHeld: seed.blastGuardHeld,
    bankClimbBonus: seed.bankClimbBonus,
    applyPoised: false,
    unplayedAtResolve: null,
    discardsRemaining: seed.discardsRemaining,
    discardSelection: null,
    apPool: refreshActionPointsForNewHand(STARTING_AP),
  }
}

/** `true` when the next committed card should ignore follow-suit. EXPORTED so the mount computes
 *  its `legal` set from the SAME predicate the reducer commits with — two readings of "is the
 *  Cheat armed" is exactly how a fan's greying and a rejection reason drift apart. */
export function cheatArmed(state: RoundUiState): boolean {
  return state.cheatSelection?.stage === CheatStage.Armed
}

/** `true` when the next tapped hand card should be MARKED rather than played. EXPORTED so the
 *  mount's tappability and the reducer's branch read the SAME predicate — two readings of "is
 *  Timebomb armed" is exactly how a greyed card and a reducer branch drift apart. */
export function timebombArmed(state: RoundUiState): boolean {
  return state.timebombStage === TimebombStage.Armed
}

/** The felt is waiting on the player's own card — nothing is held, nothing is prompting, the
 *  engine has not faulted, the hand and the fight are both still live, and it is their turn.
 *
 *  EXPORTED and moved here from `roundReducer.ts` on DLR-94, because `WarCouncilRound.tsx` was
 *  recomputing the identical six clauses inline as `interactive`. Two readings of one gate is how
 *  a greyed control and a reducer branch drift apart — the same reason `cheatArmed` and
 *  `timebombArmed` below are exported rather than recomputed in the component. */
export function canAct(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null &&
    currentTurn(state.round) === PlayerSide.Player
  )
}

/** The plain values `applyDamageRefusalFor` needs, assembled in ONE place so the reducer's guard
 *  and the plate's disabled state cannot read availability differently.
 *
 *  This is where the app layer's shape is translated into the pure module's — `hasPendingTimebomb`
 *  and `canAct` are read HERE and nowhere else, which is what lets `voluntaryCashOut.ts` take four
 *  plain values and stay ignorant of both `EncounterState` and `RoundUiState`. */
export function applyDamageStock(state: RoundUiState): ApplyDamageStock {
  return {
    bank: state.round.bank,
    multiplier: state.round.multiplier,
    timebombPending: hasPendingTimebomb(state.encounter),
    payoutPending: hasPendingApplyPayout(state.encounter),
    apPool: state.apPool,
    canAct: canAct(state),
  }
}

/** `true` once the mode is open — mirrors `timebombArmed`'s "is a hand-card tap reinterpreted" role,
 *  but for a MULTI-card selection rather than a single armed target. */
export function discardSelecting(state: RoundUiState): boolean {
  return state.discardSelection !== null
}

/** AC1 — the moment the action is available, independent of whose turn it is. Deliberately does
 *  NOT read `canAct`/`currentTurn`: this is what reaches the Quarry-to-lead gap, where `canAct` is
 *  false because the Quarry, not the player, is next to move — but the trick has not started. */
export function discardWindowOpen(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.round.currentTrick.length === 0 &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null
  )
}

/** The plain values `discardRefusalFor` needs, assembled in ONE place so the reducer's guard and
 *  the rail control's disabled state cannot read availability differently — the same discipline
 *  `applyDamageStock` above documents. */
export function discardStock(state: RoundUiState): DiscardStock {
  return {
    discardsRemaining: state.discardsRemaining,
    selecting: discardSelecting(state),
    selectionSize: state.discardSelection?.length ?? 0,
    windowOpen: discardWindowOpen(state),
  }
}

/** AC1 — the Apply Buff window is the DISCARD window. No second timing gate is built: this reads
 *  `discardWindowOpen` and nothing else, exactly as `discardStock` above does, so the two actions
 *  cannot disagree about when the felt is between tricks. */
export function buffActivationStock(
  state: RoundUiState,
  activation: BuffActivationState,
  buff: Buff,
): BuffActivationStock {
  return {
    windowOpen: discardWindowOpen(state),
    apPool: activation.apPool,
    apCost: apCostOf(buff),
    alreadyActive: activation.activatedThisTrick.includes(buff.id),
  }
}
