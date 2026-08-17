import { HAND_SIZE, type Coins } from '../../hunt'
import { PlayerSide } from '../../warCouncil'
import type { HealthBarView } from './duelHealthBars.ts'
import DuelHealthBars from './DuelHealthBars.tsx'
import { COINS_PLATE_LABEL } from './labels'

const MAX_VISIBLE_OPPONENT_BACKS = 8

interface RoundStatusBandProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly tricksPlayed: number
  readonly opponentHandCount: number
  readonly roundComplete: boolean
  readonly bars: readonly HealthBarView[]
  readonly runLabel: string
  /** AC2 — the run's purse during a hand, threaded through unread and unchanged
   *  (`warCouncilMount.ts`'s own docblock). */
  readonly coins: Coins
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
  runLabel,
  coins,
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
      <div className="wc-run">
        <span className="wc-plate-label">Run</span>
        <span className="wc-run-value">{runLabel}</span>
      </div>
      <div className="wc-coins">
        <span className="wc-plate-label">{COINS_PLATE_LABEL}</span>
        <span className="wc-run-value">{coins}</span>
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
