import { useState } from 'react'
import Board from './Board'
import DebugPanel from './DebugPanel'
import HeroBanner from './HeroBanner'
import NewGamePanel from './NewGamePanel'
import SeatLegend from './SeatLegend'
import { NO_OVERLAYS } from '../constants/overlays'
import { useGame } from './useGame'
import { useRulesConfig } from './useRulesConfig'
import './AppShell.css'
import type { OverlayFlags } from './BoardOverlays'
import type { RulesConfig } from '../rules/config'

function AppShell() {
  const configState = useRulesConfig()

  if (configState.status === 'loading') {
    return (
      <main className="app-shell">
        <HeroBanner />
        <p className="app-shell__status" role="status">
          Loading the tuning configuration…
        </p>
      </main>
    )
  }

  if (configState.status !== 'ready') {
    // load-failed and invalid are distinct states with distinct copy: one means
    // the file could not be reached, the other that it was reached and is wrong.
    // Neither ever falls back to constants nobody chose.
    return (
      <main className="app-shell">
        <HeroBanner />
        <section className="app-shell__error" role="alert">
          <h2>
            {configState.status === 'load-failed'
              ? 'Could not load rules.json'
              : 'rules.json is not valid'}
          </h2>
          <p className="app-shell__error-detail">{configState.message}</p>
          <p>
            The prototype cannot start without its tuning constants — playing with defaults nobody
            chose would invalidate every play-test conclusion. Fix the file and reload.
          </p>
        </section>
      </main>
    )
  }

  return <GameShell config={configState.config} />
}

/**
 * Split from AppShell so the game store's hooks are only mounted once a valid
 * config exists — useGame takes a RulesConfig, and a conditional hook call in
 * one component is not allowed.
 */
function GameShell({ config }: { config: RulesConfig }) {
  const { state, seed, playerCount, setupError, newGame } = useGame(config)
  const [overlays, setOverlays] = useState<OverlayFlags>(NO_OVERLAYS)

  return (
    <main className="app-shell">
      <HeroBanner />

      <NewGamePanel onNewGame={newGame} disabled={false} />

      {setupError !== null && (
        <section className="app-shell__error" role="alert">
          <h2>Could not generate a board</h2>
          <p className="app-shell__error-detail">{setupError}</p>
          <p>
            The geometry constants in <code>rules.json</code> may be too cramped for this player
            count — §12 of the rules document maps this symptom to the value to change.
          </p>
        </section>
      )}

      {state !== null && playerCount !== null && seed !== null && (
        <section className="app-shell__game" aria-label="Game board">
          <Board state={state} config={config} overlays={overlays} />
          <SeatLegend seats={state.seats} turnOrder={state.turnOrder} playerCount={playerCount} />
          <DebugPanel
            state={state}
            seed={seed}
            flags={overlays}
            onFlagsChange={setOverlays}
            onRegenerate={(nextSeed) => newGame(playerCount, nextSeed)}
          />
        </section>
      )}
    </main>
  )
}

export default AppShell
