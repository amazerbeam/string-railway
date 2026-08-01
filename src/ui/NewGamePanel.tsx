import './NewGamePanel.css'
import type { PlayerCount } from '../rules/setup'

const PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4, 5]

/** §6 — the border shape each count plays on. 2 plays the four-player square (§9). */
const SHAPE_NOTE: Readonly<Record<PlayerCount, string>> = {
  2: 'square, four colours between two players',
  3: 'triangle',
  4: 'square',
  5: 'pentagon',
}

interface NewGamePanelProps {
  onNewGame: (playerCount: PlayerCount) => void
  disabled: boolean
}

function NewGamePanel({ onNewGame, disabled }: NewGamePanelProps) {
  return (
    <section className="new-game" aria-label="Start a new game">
      <h2 className="new-game__heading">New game</h2>
      <ul className="new-game__counts">
        {PLAYER_COUNTS.map((count) => (
          <li key={count}>
            <button
              type="button"
              className="new-game__button"
              onClick={() => onNewGame(count)}
              disabled={disabled}
              aria-label={`Start a ${count} player game — ${SHAPE_NOTE[count]}`}
            >
              <span className="new-game__count">{count}</span>
              <span className="new-game__shape">{SHAPE_NOTE[count]}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default NewGamePanel
