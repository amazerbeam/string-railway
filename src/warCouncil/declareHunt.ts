import { HuntDeclaration } from '../hunt'
import type { RoundState } from './types'

export const DeclareRejection = {
  AlreadyDeclared: 'alreadyDeclared',
  HuntUnderway: 'huntUnderway',
} as const
export type DeclareRejection = (typeof DeclareRejection)[keyof typeof DeclareRejection]

export type DeclareResult =
  | { readonly ok: true; readonly state: RoundState }
  | { readonly ok: false; readonly reason: DeclareRejection }

/**
 * AC1: writes the declaration once, before the first card is played. Shaped like
 * `playCard` — a named rejection rather than a throw, and the input state is never
 * partially mutated.
 *
 * `loseCredits` is supplied by the caller rather than read from config here, so this
 * module stays free of the tunable and a test can vary the pool without touching
 * `LOSE_CREDITS_PER_HUNT`. It is ignored on the Win path by construction.
 */
export function declareHunt(
  state: RoundState,
  path: HuntDeclaration,
  loseCredits: number,
): DeclareResult {
  if (state.declaration !== undefined) {
    return { ok: false, reason: DeclareRejection.AlreadyDeclared }
  }
  if (state.tricksPlayed > 0 || state.currentTrick.length > 0) {
    return { ok: false, reason: DeclareRejection.HuntUnderway }
  }

  return {
    ok: true,
    state: {
      ...state,
      declaration: {
        path,
        creditsRemaining: path === HuntDeclaration.Lose ? loseCredits : 0,
        creditedCards: [],
        creditedThrough: 0,
      },
    },
  }
}
