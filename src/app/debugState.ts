import type { RoundUiState } from './warCouncil/roundUiState'

/**
 * Dev-only mirror of live app state, exposed on `window.__DEBUG_STATE__` so browser automation
 * (see `.claude/skills/ai-play-tester`) can read the real reducer state directly instead of
 * reconstructing it from the DOM on every step. Never read by any production code path — every
 * write below is gated by `import.meta.env.DEV`, which Vite strips from a production build.
 *
 * Two independent writers merge into this one global rather than either overwriting it wholesale:
 * `App` owns the run/phase/vault slice for the app's whole life, and `WarCouncilRound` owns the
 * live round slice only while it is mounted — the two components cannot see each other's state,
 * and only `WarCouncilRound` knows when its own slice has gone stale (its own unmount).
 */

export interface DebugAppState {
  /** Which top-level surface `App` is rendering — mirrors its own branch order. */
  screen: 'start' | 'map' | 'shop' | 'vault' | 'verdict' | 'warCouncil'
  phase: string
  hand: number
  run: unknown
  vault: unknown
}

export interface DebugRoundState {
  ui: RoundUiState
  interactive: boolean
  legalCount: number
  discardRefusal: string | null
  encounterOver: boolean
  roundComplete: boolean
}

interface DebugState {
  app?: DebugAppState
  round?: DebugRoundState
}

declare global {
  interface Window {
    __DEBUG_STATE__?: DebugState
  }
}

export function setDebugAppState(state: DebugAppState): void {
  if (!import.meta.env.DEV) return
  window.__DEBUG_STATE__ = { ...window.__DEBUG_STATE__, app: state }
}

export function setDebugRoundState(state: DebugRoundState): void {
  if (!import.meta.env.DEV) return
  window.__DEBUG_STATE__ = { ...window.__DEBUG_STATE__, round: state }
}

/** Called on `WarCouncilRound` unmount only — a stale round slice under a different screen is
 *  worse than no round slice, since it would read as though a hand were still live. */
export function clearDebugRoundState(): void {
  if (!import.meta.env.DEV) return
  if (!window.__DEBUG_STATE__) return
  window.__DEBUG_STATE__ = { app: window.__DEBUG_STATE__.app }
}
