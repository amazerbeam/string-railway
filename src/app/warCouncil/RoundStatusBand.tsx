import type { Spoils, StandingBand } from '../../hunt'
import { PlayerSide } from '../../warCouncil'
import HuntLedger from './HuntLedger'

const MAX_VISIBLE_OPPONENT_BACKS = 8

interface RoundStatusBandProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly tricksPlayed: number
  readonly opponentHandCount: number
  readonly roundComplete: boolean
  readonly spoils: Spoils
  readonly band: StandingBand
  readonly table: readonly StandingBand[]
}

/**
 * The top band (AC4): an opponent plate — a decorative face-down stack plus
 * a held count — anchored to one edge, and a three-cell scoreboard anchored
 * to the other. Renders exactly the counts it is handed; the only
 * arithmetic here is the display-only trick-number clamp, so the final
 * trick never reads as trick 14.
 */
export default function RoundStatusBand({
  tricksWon,
  tricksPlayed,
  opponentHandCount,
  roundComplete,
  spoils,
  band,
  table,
}: RoundStatusBandProps) {
  const yourTricks = tricksWon[PlayerSide.Player]
  const theirTricks = tricksWon[PlayerSide.Cpu]
  const trickNumber = Math.min(tricksPlayed + (roundComplete ? 0 : 1), 13)
  const backs = Array.from({ length: Math.min(opponentHandCount, MAX_VISIBLE_OPPONENT_BACKS) })

  return (
    <header className="wc-status">
      <div className="wc-plate">
        <span className="wc-plate-label">Opponent</span>
        <span className="wc-stack" aria-hidden="true">
          {backs.map((_, index) => (
            <span key={index} className="wc-stack-back" />
          ))}
        </span>
        <span className="wc-plate-label">{opponentHandCount} held</span>
      </div>
      <div className="wc-score" role="group" aria-label="Tricks won">
        <span className={`wc-score-cell${yourTricks > theirTricks ? ' wc-is-lead' : ''}`}>
          <span className="wc-score-side">You</span>
          <span className="wc-score-value">{yourTricks}</span>
        </span>
        <span className="wc-score-cell">
          <span className="wc-score-side">Trick</span>
          <span className="wc-score-value">{trickNumber}</span>
        </span>
        <span className={`wc-score-cell${theirTricks > yourTricks ? ' wc-is-lead' : ''}`}>
          <span className="wc-score-side">Them</span>
          <span className="wc-score-value">{theirTricks}</span>
        </span>
      </div>
      <HuntLedger spoils={spoils} band={band} table={table} tricks={yourTricks} />
    </header>
  )
}
