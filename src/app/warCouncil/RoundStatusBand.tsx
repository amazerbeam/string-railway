import { HAND_SIZE } from '../../hunt'
import { PlayerSide } from '../../warCouncil'
import type { HealthBarView } from './duelHealthBars.ts'
import DuelHealthBars from './DuelHealthBars.tsx'

const MAX_VISIBLE_OPPONENT_BACKS = 8

interface RoundStatusBandProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly tricksPlayed: number
  readonly opponentHandCount: number
  readonly roundComplete: boolean
  readonly bars: readonly HealthBarView[]
}

/**
 * The top band (AC4): an opponent plate anchored to one edge, the mirrored duel health-bar
 * pair flanking the `You · Trick · Them` trio Tekken-fashion (§6, DLR-71), each bar depleting
 * toward the centre. Renders exactly the counts and views it is handed; the only arithmetic
 * here is the display-only trick-number clamp, read from `HAND_SIZE` rather than written as a
 * literal (DLR-80), so the final trick never reads as one past the hand's own length.
 *
 * The Standing readout no longer mounts here — DLR-80 retired it along with the declaration
 * it scored.
 */
export default function RoundStatusBand({
  tricksWon,
  tricksPlayed,
  opponentHandCount,
  roundComplete,
  bars,
}: RoundStatusBandProps) {
  const yourTricks = tricksWon[PlayerSide.Player]
  const theirTricks = tricksWon[PlayerSide.Cpu]
  const trickNumber = Math.min(tricksPlayed + (roundComplete ? 0 : 1), HAND_SIZE)
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
      <DuelHealthBars
        bars={bars}
        centre={
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
        }
      />
    </header>
  )
}
