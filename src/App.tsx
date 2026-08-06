import { useState } from 'react'
import { AppMode } from './app/index'
import TestModeVanguardHost from './app/vanguard/TestModeVanguardHost'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import { WAR_COUNCIL_FIRST_DEALER } from './battle'
import { dealRound, PlayerSide, type WarCouncilState } from './warCouncil'

/**
 * Minimal dev host. Deals one War Council round and mounts the real UI, and now
 * also offers a Test-mode switch that mounts the standalone Vanguard. Both are
 * temporary: SCRUM-34 owns real battle-loop orchestration and should delete this
 * host rather than extend it.
 */
function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.Campaign)
  // Not idempotent — StrictMode's development double-invocation deals a
  // hand this render then discards it, wasting randomness in development
  // only. It can never produce two live rounds: only the round dealt on the
  // render that actually commits is ever mounted.
  const [initialRound] = useState<WarCouncilState>(() =>
    dealRound(WAR_COUNCIL_FIRST_DEALER, Math.random),
  )
  const [result, setResult] = useState<WarCouncilRoundResult | null>(null)

  if (mode === AppMode.Test) {
    return <TestModeVanguardHost />
  }

  return (
    <>
      {/* Throwaway scaffolding — SCRUM-34 deletes this host rather than
          extending it, so this control is not styled as a designed screen. */}
      <button
        type="button"
        onClick={() => setMode(AppMode.Test)}
        style={{ position: 'fixed', top: 8, right: 8, zIndex: 999 }}
      >
        Switch to Test mode (Vanguard)
      </button>
      {result ? (
        <main>
          <h1>Round complete</h1>
          <p>Mode: {mode}</p>
          <p>
            You scored {result.score[PlayerSide.Player]} — the opponent scored{' '}
            {result.score[PlayerSide.Cpu]}.
          </p>
        </main>
      ) : (
        <WarCouncilRound initialState={initialRound} onComplete={setResult} />
      )}
    </>
  )
}

export default App
