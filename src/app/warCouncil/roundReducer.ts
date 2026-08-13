import {
  CardRank,
  PlayerSide,
  QUARRY_SIDE,
  RoundPhase,
  TrickOutcome,
  chooseCpuMove,
  commitQuarryMove,
  currentTurn,
  incomingFrom,
  legalMoves,
  playCard,
  sameCard,
  type AbilityChoice,
  type Card,
  type IllegalMoveReason,
  type TrickCard,
  type TrickResolution,
  type WarCouncilState,
} from '../../warCouncil'
import { applyDamage, isEncounterResolved, type EncounterState } from '../../hunt'

export interface ResolvedTrick {
  readonly cards: readonly TrickCard[] // [lead, follow] — the engine's load-bearing order
  readonly winner: PlayerSide
  /** What the trick did to the bank, the streak and both bars. */
  readonly resolution: TrickResolution
}

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
}

export interface RoundUiSeed {
  readonly round: WarCouncilState
  readonly encounter: EncounterState
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
} as const
export type RoundUiActionKind = (typeof RoundUiActionKind)[keyof typeof RoundUiActionKind]

export type RoundUiAction =
  | { readonly kind: typeof RoundUiActionKind.TapCard; readonly card: Card }
  | { readonly kind: typeof RoundUiActionKind.ChooseAbility; readonly choice: AbilityChoice }
  | { readonly kind: typeof RoundUiActionKind.CancelSelection }
  | { readonly kind: typeof RoundUiActionKind.CarryOn }

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
  }
}

export function roundReducer(state: RoundUiState, action: RoundUiAction): RoundUiState {
  switch (action.kind) {
    case RoundUiActionKind.TapCard:
      return handleTapCard(state, action.card)
    case RoundUiActionKind.ChooseAbility:
      return state.prompt ? commit(state, state.prompt, action.choice) : state
    case RoundUiActionKind.CancelSelection:
      return { ...state, armed: null, prompt: null }
    case RoundUiActionKind.CarryOn:
      return handleCarryOn(state)
  }
}

interface CpuAdvanceResult {
  readonly round: WarCouncilState
  readonly resolvedTrick: ResolvedTrick | null
  readonly cpuFault: CpuFault | null
}

function canAct(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null &&
    currentTurn(state.round) === PlayerSide.Player
  )
}

function handleTapCard(state: RoundUiState, tapped: Card): RoundUiState {
  if (!canAct(state)) {
    return state
  }

  if (state.armed && sameCard(state.armed, tapped)) {
    if (tapped.rank === CardRank.Fox || tapped.rank === CardRank.Woodcutter) {
      return { ...state, armed: null, prompt: tapped }
    }
    return commit(state, tapped)
  }

  return { ...state, armed: tapped, rejection: null }
}

/**
 * The single control the player presses between decisions. Clears a held trick reveal —
 * including the deciding sixth, so its cards and outcome are seen before the end panel — and
 * then commits the Quarry's lead if one is pending.
 *
 * Doing both in one transition is what keeps the telegraph free: the Quarry's next lead is
 * already readable beside the held reveal, so the tap that clears the reveal is the same tap
 * that lets them lead. Only trick 1 has no prior reveal to fold onto.
 */
function handleCarryOn(state: RoundUiState): RoundUiState {
  const cleared: RoundUiState =
    state.resolvedTrick === null ? state : { ...state, resolvedTrick: null }

  if (
    cleared.cpuFault !== null ||
    cleared.prompt !== null ||
    cleared.round.phase === RoundPhase.Complete ||
    isEncounterResolved(cleared.encounter) ||
    currentTurn(cleared.round) !== QUARRY_SIDE ||
    cleared.round.currentTrick.length > 0
  ) {
    return cleared
  }

  const advanced = advanceQuarryLead(cleared.round)
  return {
    ...cleared,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
  }
}

/**
 * AC6/AC8 — one trick's damage, applied once, as it happens.
 *
 * Skips `applyDamage` entirely when the trick neither cashed nor hit: an all-zero event would
 * bump `damageEventsApplied` for nothing. Guards `isEncounterResolved` rather than catching the
 * `RangeError` it would otherwise throw — a throw inside a reducer during an event handler
 * unmounts the tree.
 */
function applyResolution(encounter: EncounterState, resolution: TrickResolution): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  if (resolution.cashOut === 0 && resolution.damageToPlayer === 0) return encounter
  return applyDamage(encounter, incomingFrom(resolution))
}

/** Commits `cardToPlay` for the player, then advances the opponent when the player led. */
function commit(state: RoundUiState, cardToPlay: Card, choice?: AbilityChoice): RoundUiState {
  const result = playCard(state.round, PlayerSide.Player, cardToPlay, choice)
  if (!result.ok) {
    return { ...state, armed: null, prompt: null, rejection: result.reason }
  }

  const playedCard: TrickCard = { side: PlayerSide.Player, card: cardToPlay }
  const resolvedTrick = deriveResolvedTrick(state.round, result.state, playedCard)
  const encounter = resolvedTrick
    ? applyResolution(state.encounter, resolvedTrick.resolution)
    : state.encounter
  const settled: RoundUiState = {
    ...state,
    round: result.state,
    armed: null,
    prompt: null,
    rejection: null,
    resolvedTrick,
    encounter,
  }

  if (resolvedTrick) {
    return settled
  }

  // The player led — advance the opponent in the same commit.
  const advanced = advanceQuarryFollow(result.state)
  return {
    ...settled,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
    encounter: advanced.resolvedTrick
      ? applyResolution(settled.encounter, advanced.resolvedTrick.resolution)
      : settled.encounter,
  }
}

/** A trick resolved iff the engine wrote a `lastResolution` on `after` — the definitive signal
 *  now that the bank, not `tricksWon`, is what changed. The physical winner is recovered from
 *  the outcome itself (`CleanWin`/`SkullWin` favour the player, `Dodge`/`CleanLoss` favour the
 *  Quarry) rather than by diffing `tricksWon`, which `resolveTrickBank` already consulted once. */
function deriveResolvedTrick(
  before: WarCouncilState,
  after: WarCouncilState,
  playedCard: TrickCard,
): ResolvedTrick | null {
  const resolution = after.lastResolution
  if (resolution === null) {
    return null
  }
  const winner =
    resolution.outcome === TrickOutcome.CleanWin || resolution.outcome === TrickOutcome.SkullWin
      ? PlayerSide.Player
      : PlayerSide.Cpu
  return { cards: [before.currentTrick[0], playedCard], winner, resolution }
}

/**
 * Commits the Quarry's *follow* — the answer to a lead already on the table — needing
 * `chooseCpuMove`'s chosen card to derive the resolved trick's reveal. Guards `legalMoves`
 * before calling `chooseCpuMove`, which throws on an empty legal set.
 */
function advanceQuarryFollow(round: WarCouncilState): CpuAdvanceResult {
  const legal = legalMoves(round, QUARRY_SIDE)
  if (legal.length === 0) {
    return { round, resolvedTrick: null, cpuFault: 'noLegalMove' }
  }

  const move = chooseCpuMove(round, QUARRY_SIDE)
  const result = playCard(round, QUARRY_SIDE, move.card, move.choice)
  if (!result.ok) {
    return { round, resolvedTrick: null, cpuFault: result.reason }
  }

  const playedCard: TrickCard = { side: QUARRY_SIDE, card: move.card }
  return {
    round: result.state,
    resolvedTrick: deriveResolvedTrick(round, result.state, playedCard),
    cpuFault: null,
  }
}

/**
 * Commits a Quarry *lead* through the engine's own `commitQuarryMove` — the commit half of
 * the split DLR-52 introduced for exactly this. A lead never completes a trick, so there is
 * no resolved reveal to derive and no need to know which card was chosen.
 *
 * Keeps `advanceQuarryFollow`'s empty-legal-set guard: `commitQuarryMove` reaches
 * `chooseCpuCard`, whose `lowestCard([])` would throw rather than return a rejection.
 */
function advanceQuarryLead(round: WarCouncilState): CpuAdvanceResult {
  if (legalMoves(round, QUARRY_SIDE).length === 0) {
    return { round, resolvedTrick: null, cpuFault: 'noLegalMove' }
  }
  const result = commitQuarryMove(round)
  if (!result.ok) {
    return { round, resolvedTrick: null, cpuFault: result.reason }
  }
  return { round: result.state, resolvedTrick: null, cpuFault: null }
}
