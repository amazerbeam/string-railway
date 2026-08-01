import HeroBanner from './HeroBanner'
import NewGamePanel from './NewGamePanel'
import PlayArea from './PlayArea'
import { useGame } from './useGame'
import { useRulesConfig } from './useRulesConfig'
import './AppShell.css'
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
  const { state, seed, playerCount, setupError, newGame, dispatchMove } = useGame(config)

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
        <PlayArea
          state={state}
          config={config}
          seed={seed}
          playerCount={playerCount}
          dispatchMove={dispatchMove}
          onRegenerate={(nextSeed) => newGame(playerCount, nextSeed)}
        />
      )}
    </main>
  )
}

export default AppShell
