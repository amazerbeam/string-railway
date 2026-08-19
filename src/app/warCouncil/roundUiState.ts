/**
 * The felt's UI state, its seed, its actions, and the pure predicates over it — everything the
 * reducer operates ON, separated from the reducer that operates on it.
 *
 * Split out of `roundReducer.ts` on DLR-90: that file had reached 382 of its 400-line budget
 * before Envenom's handlers were written. The seam is deliberate rather than arbitrary — this file
 * is what a COMPONENT imports (the state shape, the action kinds, the predicates it renders from),
 * and `roundReducer.ts` is the transition function nothing but the mount needs. Nothing here
 * decides anything.
 */
import type {
  AbilityChoice,
  Card,
  IllegalMoveReason,
  PlayerSide,
  TrickCard,
  TrickResolution,
  WarCouncilState,
} from '../../warCouncil'
import type { CheatCard, CheatCardId, EncounterState } from '../../hunt'

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

/** AC2 — the two stages of one Envenom selection, mirroring `CheatStage` exactly because AC2 asks
 *  for the Cheat's arm/commit shape rather than a new interaction grammar. */
export const EnvenomStage = {
  /** One tap — a selection, no effect. The misclick guard: the mark is irreversible. */
  Poised: 'poised',
  /** Two taps — the next tapped hand card is MARKED rather than played. */
  Armed: 'armed',
} as const
export type EnvenomStage = (typeof EnvenomStage)[keyof typeof EnvenomStage]

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
  readonly envenomCharges: number
  /** The hand's OWN transient — dies on remount, never touches `RunState`. ONE nullable field
   *  rather than two booleans, for `CheatSelection`'s stated reason: `poised` and `armed` are
   *  stages of one selection and two fields would admit the invalid pair "poised AND armed".
   *  No id, unlike `CheatSelection` — charges are fungible, and the card marked is the identity. */
  readonly envenomStage: EnvenomStage | null
  /** DLR-91 AC4 — mirrored from the mount's opening prop and flipped to `false` the moment a
   *  resolved trick reports `poisonGuardSpent`. Run state carried for the life of the hand, the
   *  same contract `cheats` and `envenomCharges` document. */
  readonly poisonGuardHeld: boolean
}

export interface RoundUiSeed {
  readonly round: WarCouncilState
  readonly encounter: EncounterState
  readonly cheats: readonly CheatCard[]
  readonly envenomCharges: number
  readonly poisonGuardHeld: boolean
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
  TapEnvenom: 'tapEnvenom',
  CancelEnvenom: 'cancelEnvenom',
} as const
export type RoundUiActionKind = (typeof RoundUiActionKind)[keyof typeof RoundUiActionKind]

export type RoundUiAction =
  | { readonly kind: typeof RoundUiActionKind.TapCard; readonly card: Card }
  | { readonly kind: typeof RoundUiActionKind.ChooseAbility; readonly choice: AbilityChoice }
  | { readonly kind: typeof RoundUiActionKind.CancelSelection }
  | { readonly kind: typeof RoundUiActionKind.CarryOn }
  | { readonly kind: typeof RoundUiActionKind.TapCheat; readonly id: CheatCardId }
  | { readonly kind: typeof RoundUiActionKind.CancelCheat }
  | { readonly kind: typeof RoundUiActionKind.TapEnvenom }
  | { readonly kind: typeof RoundUiActionKind.CancelEnvenom }

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
    envenomCharges: seed.envenomCharges,
    envenomStage: null,
    poisonGuardHeld: seed.poisonGuardHeld,
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
 *  Envenom armed" is exactly how a greyed card and a reducer branch drift apart. */
export function envenomArmed(state: RoundUiState): boolean {
  return state.envenomStage === EnvenomStage.Armed
}
