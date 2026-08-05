import { useState } from 'react'
import { AppMode } from './app/index'
import WarCouncilRound from './app/warCouncil/WarCouncilRound'
import type { WarCouncilRoundResult } from './app/warCouncilMount'
import { WAR_COUNCIL_FIRST_DEALER } from './battle'
import { dealRound, PlayerSide, type WarCouncilState } from './warCouncil'

/**
 * Minimal dev host: deals one War Council round and mounts the real UI, so
 * the round is playable by hand and QA can drive it in a browser. SCRUM-34
 * owns real battle-loop orchestration and should delete this host rather
 * than extend it.
 */
function App() {
  const [mode] = useState<AppMode>(AppMode.Campaign)
  // Not idempotent — StrictMode's development double-invocation deals a
  // hand this render then discards it, wasting randomness in development
  // only. It can never produce two live rounds: only the round dealt on the
  // render that actually commits is ever mounted.
  const [initialRound] = useState<WarCouncilState>(() =>
    dealRound(WAR_COUNCIL_FIRST_DEALER, Math.random),
  )
  const [result, setResult] = useState<WarCouncilRoundResult | null>(null)

  if (result) {
    return (
      <main>
        <h1>Round complete</h1>
        <p>Mode: {mode}</p>
        <p>
          You scored {result.score[PlayerSide.Player]} — the opponent scored{' '}
          {result.score[PlayerSide.Cpu]}.
        </p>
      </main>
    )
  }

  return <WarCouncilRound initialState={initialRound} onComplete={setResult} />
}

export default App
