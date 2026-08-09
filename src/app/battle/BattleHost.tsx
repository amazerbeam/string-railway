import { useCallback, useReducer, useRef, useState } from 'react'
import { createVanguardBoard, type VanguardState } from '../../vanguard'
import { dealRound } from '../../warCouncil'
import type { TricksWon } from '../tricksWon'
import type { RequestTricksWon, VanguardMatchResult } from '../vanguardMount'
import type { WarCouncilRoundResult } from '../warCouncilMount'
import VanguardMatch from '../vanguard/VanguardMatch'
import WarCouncilRound from '../warCouncil/WarCouncilRound'
import BattleOverPanel from './BattleOverPanel'
import {
  BattleHostActionKind,
  battleHostReducer,
  createBattleHostUiState,
} from './battleHostReducer'
import { dealerForRound } from './dealerForRound'
import RoundTransitionPanel from './RoundTransitionPanel'
import './battle.css'

export interface BattleHostProps {
  /** Test seam only — production always uses the default. Not a tuning value. */
  readonly rng?: () => number
}

interface PendingRoundRequest {
  readonly round: number
  readonly resolve: (tricks: TricksWon) => void
}

/**
 * The real app-shell orchestrator (SCRUM-34). Mounts VanguardMatch for the
 * life of the whole battle and overlays a freshly-dealt WarCouncilRound,
 * then RoundTransitionPanel, each time VanguardMatch's requestTricksWon
 * promise needs fulfilling. No effect of its own — see plan.md Part 2 ->
 * Runtime quality notes.
 */
export default function BattleHost({ rng = Math.random }: BattleHostProps) {
  const [initialBoard] = useState<VanguardState>(() => createVanguardBoard())
  const [ui, dispatch] = useReducer(battleHostReducer, undefined, createBattleHostUiState)
  // Assigning here always OVERWRITES rather than queuing: StrictMode calls
  // VanguardMatch's effect twice in development, so this fires twice for the
  // same round (two wasted dealRound shuffles, dev-only) and the second call
  // orphans the first `resolve`. Self-heals — the reducer's RoundRequested
  // case is itself an unconditional overwrite, and the abandoned first
  // promise is inert since nothing external ever calls it. Same pattern as
  // TestModeVanguardHost's pendingRef.
  const pendingRef = useRef<PendingRoundRequest | null>(null)

  const requestTricksWon: RequestTricksWon = useCallback(
    (round) =>
      new Promise<TricksWon>((resolve) => {
        pendingRef.current = { round, resolve }
        const dealer = dealerForRound(round)
        dispatch({
          kind: BattleHostActionKind.RoundRequested,
          round,
          dealer,
          dealt: dealRound(dealer, rng),
        })
      }),
    [rng],
  )

  function handleRoundComplete(result: WarCouncilRoundResult) {
    dispatch({ kind: BattleHostActionKind.RoundComplete, result })
  }

  function handleContinueToClash() {
    if (ui.kind !== 'roundTransition') return
    const pending = pendingRef.current
    pendingRef.current = null
    dispatch({ kind: BattleHostActionKind.ContinueToClash })
    pending?.resolve(ui.tricksWon)
  }

  function handleBattleResolved(result: VanguardMatchResult) {
    dispatch({ kind: BattleHostActionKind.BattleResolved, result })
  }

  if (ui.kind === 'battleOver') {
    return <BattleOverPanel round={ui.round} winner={ui.winner} />
  }

  return (
    <>
      <VanguardMatch
        initialState={initialBoard}
        requestTricksWon={requestTricksWon}
        onComplete={handleBattleResolved}
      />
      {ui.kind === 'warCouncilRound' && (
        <div className="battle-overlay">
          <WarCouncilRound
            key={ui.round}
            initialState={ui.dealt}
            onComplete={handleRoundComplete}
          />
        </div>
      )}
      {ui.kind === 'roundTransition' && (
        <div className="battle-overlay">
          <RoundTransitionPanel
            round={ui.round}
            dealer={ui.dealer}
            tricksWon={ui.tricksWon}
            score={ui.score}
            muster={ui.muster}
            onContinue={handleContinueToClash}
          />
        </div>
      )}
    </>
  )
}
