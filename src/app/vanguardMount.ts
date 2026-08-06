import type { VanguardState } from '../vanguard'
import type { PlayerSide } from '../warCouncil'
import type { TricksWon } from './tricksWon'

// Return type feeds scoreRound (src/warCouncil/scoring.ts), then
// convertScoreToMuster (src/vanguard/musterConversion.ts) — the same pipeline
// a real completed match's tricksWon goes through. No parallel scoring rule
// for the manual-entry path.
//
// Implementations must be referentially stable across renders (memoized with
// useCallback, or held in a ref) — the consuming mount (VanguardMatch) calls
// this from an effect keyed on its identity, and an unstable identity re-fires
// that effect and issues unbounded duplicate in-flight requests.
export type RequestTricksWon = (round: number) => Promise<TricksWon>

export interface VanguardMountProps {
  readonly initialState: VanguardState
  readonly requestTricksWon: RequestTricksWon
  readonly onComplete: (result: VanguardMatchResult) => void
}

export interface VanguardMatchResult {
  readonly finalState: VanguardState
  readonly winner: PlayerSide
}
