import { useCallback, useReducer, useState } from 'react'
import { GAME_ACTION } from '../constants/game'
import { gameReducer } from '../rules/reducer'
import { generateSetup, SetupGenerationError } from '../rules/setup'
import type { RulesConfig } from '../rules/config'
import type { PlayerCount } from '../rules/setup'
import type { GameState, Move } from '../rules/types'

export type GameAction =
  | { readonly kind: typeof GAME_ACTION.NEW_GAME; readonly state: GameState }
  | { readonly kind: typeof GAME_ACTION.MOVE; readonly move: Move; readonly config: RulesConfig }

export interface UseGameResult {
  readonly state: GameState | null
  readonly seed: number | null
  readonly playerCount: PlayerCount | null
  readonly setupError: string | null
  newGame(playerCount: PlayerCount, seed?: number): void
  dispatchMove(move: Move): void
}

/**
 * The single sanctioned store (no Redux, no Zustand, no second useReducer over
 * a parallel copy of game state). MOVE delegates straight to the §10.4 reducer;
 * NEW_GAME replaces the whole GameState.
 *
 * NEW_GAME is deliberately NOT a Move: Move is the persisted move-log union that
 * undo and replay derive from, and starting a game is not an event in that
 * game's own history. Widening Move would force a case through every existing
 * switch and invalidate any stored log.
 *
 * The config travels ON the MOVE action rather than being captured in a closure,
 * so the reducer stays a pure function of (state, action) and cannot read a
 * stale config from an earlier render.
 */
function reduce(state: GameState | null, action: GameAction): GameState | null {
  switch (action.kind) {
    case GAME_ACTION.NEW_GAME:
      return action.state
    case GAME_ACTION.MOVE:
      if (state === null) {
        // A move before a game exists is a caller bug, not a player mistake.
        throw new Error('useGame: MOVE dispatched before a game was created')
      }
      return gameReducer(state, action.move, action.config)
  }
}

export function useGame(config: RulesConfig): UseGameResult {
  const [state, dispatch] = useReducer(reduce, null)
  const [seed, setSeed] = useState<number | null>(null)
  const [playerCount, setPlayerCount] = useState<PlayerCount | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)

  const newGame = useCallback(
    (nextPlayerCount: PlayerCount, requestedSeed?: number): void => {
      // Date.now() is used ONLY to mint a seed at the UI boundary, never inside
      // a sampler. The seed is then recorded and displayed, which is what makes
      // the board reproducible (SCRUM-4 AC8, SCRUM-3 AC6).
      const nextSeed = requestedSeed ?? Date.now() >>> 0
      // Cleared on entry so a previous failure cannot linger behind a board.
      setSetupError(null)
      try {
        const generated = generateSetup({ playerCount: nextPlayerCount, seed: nextSeed }, config)
        setSeed(nextSeed)
        setPlayerCount(nextPlayerCount)
        dispatch({ kind: GAME_ACTION.NEW_GAME, state: generated })
      } catch (error) {
        // Only a generation failure is turned into displayed state. Anything
        // else propagates — swallowing it would disguise a real defect as a
        // cramped board.
        if (error instanceof SetupGenerationError) {
          setSetupError(error.message)
          return
        }
        throw error
      }
    },
    [config],
  )

  const dispatchMove = useCallback(
    (move: Move): void => {
      dispatch({ kind: GAME_ACTION.MOVE, move, config })
    },
    [config],
  )

  return { state, seed, playerCount, setupError, newGame, dispatchMove }
}
