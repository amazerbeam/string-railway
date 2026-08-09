import { convertScoreToMuster, type Muster } from '../../vanguard'
import type { PlayerSide, WarCouncilState } from '../../warCouncil'
import type { VanguardMatchResult } from '../vanguardMount'
import type { WarCouncilRoundResult } from '../warCouncilMount'
import type { TricksWon } from '../tricksWon'

export type BattleHostUiState =
  | { readonly kind: 'vanguard'; readonly round: number }
  | {
      readonly kind: 'warCouncilRound'
      readonly round: number
      readonly dealer: PlayerSide
      readonly dealt: WarCouncilState
    }
  | {
      readonly kind: 'roundTransition'
      readonly round: number
      readonly dealer: PlayerSide
      readonly tricksWon: TricksWon
      readonly score: Readonly<Record<PlayerSide, number>>
      readonly muster: Muster
    }
  | { readonly kind: 'battleOver'; readonly round: number; readonly winner: PlayerSide }

export const BattleHostActionKind = {
  RoundRequested: 'roundRequested',
  RoundComplete: 'roundComplete',
  ContinueToClash: 'continueToClash',
  BattleResolved: 'battleResolved',
} as const
export type BattleHostActionKind = (typeof BattleHostActionKind)[keyof typeof BattleHostActionKind]

export type BattleHostUiAction =
  | {
      readonly kind: typeof BattleHostActionKind.RoundRequested
      readonly round: number
      readonly dealer: PlayerSide
      readonly dealt: WarCouncilState
    }
  | {
      readonly kind: typeof BattleHostActionKind.RoundComplete
      readonly result: WarCouncilRoundResult
    }
  | { readonly kind: typeof BattleHostActionKind.ContinueToClash }
  | {
      readonly kind: typeof BattleHostActionKind.BattleResolved
      readonly result: VanguardMatchResult
    }

export function createBattleHostUiState(): BattleHostUiState {
  return { kind: 'vanguard', round: 0 }
}

export function battleHostReducer(
  state: BattleHostUiState,
  action: BattleHostUiAction,
): BattleHostUiState {
  switch (action.kind) {
    case BattleHostActionKind.RoundRequested:
      return {
        kind: 'warCouncilRound',
        round: action.round,
        dealer: action.dealer,
        dealt: action.dealt,
      }

    case BattleHostActionKind.RoundComplete: {
      if (state.kind !== 'warCouncilRound') return state
      const tricksWon = action.result.finalState.tricksWon
      const score = action.result.score
      return {
        kind: 'roundTransition',
        round: state.round,
        dealer: state.dealer,
        tricksWon,
        score,
        muster: convertScoreToMuster(score),
      }
    }

    case BattleHostActionKind.ContinueToClash: {
      if (state.kind !== 'roundTransition') return state
      return { kind: 'vanguard', round: state.round }
    }

    case BattleHostActionKind.BattleResolved: {
      if (state.kind !== 'vanguard') return state
      return { kind: 'battleOver', round: state.round, winner: action.result.winner }
    }
  }
}
