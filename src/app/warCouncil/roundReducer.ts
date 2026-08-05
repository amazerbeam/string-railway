import {
  CardRank,
  PlayerSide,
  RoundPhase,
  chooseCpuMove,
  currentTurn,
  legalMoves,
  playCard,
  sameCard,
  type AbilityChoice,
  type Card,
  type IllegalMoveReason,
  type TrickCard,
  type WarCouncilState,
} from '../../warCouncil'

export interface ResolvedTrick {
  readonly cards: readonly TrickCard[] // [lead, follow] — the engine's load-bearing order
  readonly winner: PlayerSide
}

export interface RoundUiState {
  readonly round: WarCouncilState
  readonly armed: Card | null // tapped once, lifted, awaiting its second tap
  readonly prompt: Card | null // a Fox or Woodcutter awaiting its AbilityChoice
  readonly resolvedTrick: ResolvedTrick | null // held on screen until CarryOn
  readonly rejection: IllegalMoveReason | null // the player's own illegal move — recoverable
  readonly cpuFault: CpuFault | null // a corrupt CPU turn — a bug, shown not swallowed
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

/** Initial UI state — advances the CPU when it leads trick 1, so the player always sees the lead. */
export function createRoundUiState(initialState: WarCouncilState): RoundUiState {
  const base: RoundUiState = {
    round: initialState,
    armed: null,
    prompt: null,
    resolvedTrick: null,
    rejection: null,
    cpuFault: null,
  }

  if (currentTurn(initialState) !== PlayerSide.Cpu) {
    return base
  }

  const advanced = advanceCpu(initialState)
  return {
    ...base,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
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
 * Clears a held trick reveal — including the deciding thirteenth trick, so its cards and
 * winner are seen before the round-over panel appears. A no-op when nothing is held. Only
 * advances the opponent when the round is still in progress; a completed round needs no
 * further turn and the mount reports it via its own "Finish" control instead.
 */
function handleCarryOn(state: RoundUiState): RoundUiState {
  if (state.resolvedTrick === null) {
    return state
  }

  const cleared: RoundUiState = { ...state, resolvedTrick: null }
  if (
    cleared.round.phase === RoundPhase.Complete ||
    currentTurn(cleared.round) !== PlayerSide.Cpu
  ) {
    return cleared
  }

  const advanced = advanceCpu(cleared.round)
  return {
    ...cleared,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
  }
}

/** Commits `cardToPlay` for the player, then advances the opponent when the player led. */
function commit(state: RoundUiState, cardToPlay: Card, choice?: AbilityChoice): RoundUiState {
  const result = playCard(state.round, PlayerSide.Player, cardToPlay, choice)
  if (!result.ok) {
    return { ...state, armed: null, prompt: null, rejection: result.reason }
  }

  const playedCard: TrickCard = { side: PlayerSide.Player, card: cardToPlay }
  const resolvedTrick = deriveResolvedTrick(state.round, result.state, playedCard)
  const settled: RoundUiState = {
    ...state,
    round: result.state,
    armed: null,
    prompt: null,
    rejection: null,
    resolvedTrick,
  }

  if (resolvedTrick) {
    return settled
  }

  // The player led — advance the opponent in the same commit.
  const advanced = advanceCpu(result.state)
  return {
    ...settled,
    round: advanced.round,
    resolvedTrick: advanced.resolvedTrick,
    cpuFault: advanced.cpuFault,
  }
}

/** A trick resolved iff `tricksPlayed` rose; the winner is whichever side's `tricksWon` rose. */
function deriveResolvedTrick(
  before: WarCouncilState,
  after: WarCouncilState,
  playedCard: TrickCard,
): ResolvedTrick | null {
  if (after.tricksPlayed <= before.tricksPlayed) {
    return null
  }

  const winner =
    after.tricksWon[PlayerSide.Player] > before.tricksWon[PlayerSide.Player]
      ? PlayerSide.Player
      : PlayerSide.Cpu

  return { cards: [before.currentTrick[0], playedCard], winner }
}

/** Guards `legalMoves` before calling `chooseCpuMove`, which throws on an empty legal set. */
function advanceCpu(round: WarCouncilState): CpuAdvanceResult {
  const legal = legalMoves(round, PlayerSide.Cpu)
  if (legal.length === 0) {
    return { round, resolvedTrick: null, cpuFault: 'noLegalMove' }
  }

  const move = chooseCpuMove(round, PlayerSide.Cpu)
  const result = playCard(round, PlayerSide.Cpu, move.card, move.choice)
  if (!result.ok) {
    return { round, resolvedTrick: null, cpuFault: result.reason }
  }

  const playedCard: TrickCard = { side: PlayerSide.Cpu, card: move.card }
  return {
    round: result.state,
    resolvedTrick: deriveResolvedTrick(round, result.state, playedCard),
    cpuFault: null,
  }
}
