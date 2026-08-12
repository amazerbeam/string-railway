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
 * AC1: writes the declaration once, before the first card is played. Shaped like `playCard` —
 * a named rejection rather than a throw, and the input state is never partially mutated.
 *
 * Took a `loseCredits` pool until DLR-67; the credit mechanic it seeded is retired, so the
 * declaration is now the path and nothing else.
 */
export function declareHunt(state: RoundState, path: HuntDeclaration): DeclareResult {
  if (state.declaration !== undefined) {
    return { ok: false, reason: DeclareRejection.AlreadyDeclared }
  }
  if (state.tricksPlayed > 0 || state.currentTrick.length > 0) {
    return { ok: false, reason: DeclareRejection.HuntUnderway }
  }

  return { ok: true, state: { ...state, declaration: { path } } }
}
