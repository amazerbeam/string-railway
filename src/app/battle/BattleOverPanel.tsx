import { PlayerSide } from '../../warCouncil'
import { SIDE_LABEL } from './labels'
import './battle.css'

export interface BattleOverPanelProps {
  readonly round: number
  readonly winner: PlayerSide
}

/**
 * The Breach win/loss screen (SCRUM-31, AC2): shown once
 * BattleState.phase === 'resolved'. Renders no interactive element —
 * "no further card or board interaction is possible" (AC2) is satisfied
 * structurally, by having nothing else on the screen, not by disabling
 * controls that exist. No restart control: the brief calls that optional
 * and out of scope for this ticket (plan.md Part 1 -> Explicitly out of
 * scope).
 */
export default function BattleOverPanel({ round, winner }: BattleOverPanelProps) {
  const playerWon = winner === PlayerSide.Player

  return (
    <div className="battle-shell">
      <div
        className="battle-panel"
        data-outcome={playerWon ? 'player' : 'cpu'}
        role="region"
        aria-labelledby="battle-over-title"
      >
        <p className="battle-eyebrow">The Breach</p>
        <h1 id="battle-over-title">
          {SIDE_LABEL[winner]} {playerWon ? 'have' : 'has'} taken the Vanguard
        </h1>
        <p>
          {playerWon
            ? "Your tokens formed an unbroken chain from base to base. The battle is over — the opponent's Vanguard is yours."
            : 'Their tokens formed an unbroken chain from base to base. The battle is over — your Vanguard has fallen.'}
        </p>
        <p className="battle-round-note">Breach reached in round {round}</p>
      </div>
    </div>
  )
}
