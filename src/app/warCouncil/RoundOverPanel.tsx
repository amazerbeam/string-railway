import type { Demand } from '../../hunt'
import { DemandOutcome, PlayerSide, type HuntScore } from '../../warCouncil'
import { DEMAND_OUTCOME_VERDICT, STANDING_BAND_NAME } from './labels'

interface RoundOverPanelProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly huntScore: HuntScore
  readonly demand: Demand
  readonly outcome: DemandOutcome
  readonly onFinish: () => void
}

/**
 * The end-of-Hunt panel (AC4): shows the score as its parts — `Spoils × Standing = Score` —
 * before the Demand and the cleared/missed verdict, because §1's whole claim is that the
 * equation is legible, not just its result. Computes nothing: `huntScore` arrives already
 * computed by the engine's `scoreHunt` and `outcome` by `checkDemand` — this component only
 * formats. The opponent's *points* row is dropped from the tally below, because §1's
 * equation is one-sided and the Quarry has no Demand to clear, but its trick count stays.
 */
export default function RoundOverPanel({
  tricksWon,
  huntScore,
  demand,
  outcome,
  onFinish,
}: RoundOverPanelProps) {
  const bandName = STANDING_BAND_NAME[huntScore.band.name]
  const isCleared = outcome === DemandOutcome.Cleared

  return (
    <div className="wc-over">
      <h2>The Hunt is over</h2>
      <div className="wc-equation" role="group" aria-label="Spoils times Standing equals Score">
        <span className="wc-equation-part">
          <span className="wc-equation-key" aria-hidden="true">
            Spoils
          </span>
          <span className="wc-equation-value" aria-label={`Spoils: ${huntScore.spoils}`}>
            {huntScore.spoils}
          </span>
        </span>
        <span className="wc-equation-op" aria-hidden="true">
          ×
        </span>
        <span className="wc-equation-part">
          <span className="wc-equation-key" aria-hidden="true">
            Standing
          </span>
          <span
            className="wc-equation-value"
            aria-label={`Standing multiplier: times ${huntScore.standing}`}
          >
            ×{huntScore.standing}
          </span>
        </span>
        <span className="wc-equation-op" aria-hidden="true">
          =
        </span>
        <span className="wc-equation-part wc-is-result">
          <span className="wc-equation-key" aria-hidden="true">
            Score
          </span>
          <span className="wc-equation-value" aria-label={`Score: ${huntScore.score}`}>
            {huntScore.score}
          </span>
        </span>
      </div>
      <p className="wc-verdict-detail">
        {huntScore.tricks} tricks — {bandName}. The Demand was{' '}
        <span aria-label={`Demand for this Hunt: ${demand}`}>{demand}</span>.
      </p>
      <p className={`wc-verdict ${isCleared ? 'wc-is-cleared' : 'wc-is-missed'}`}>
        {DEMAND_OUTCOME_VERDICT[outcome]}
      </p>
      <table className="wc-tally">
        <thead>
          <tr>
            <th>Side</th>
            <th>Tricks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>You</td>
            <td>{tricksWon[PlayerSide.Player]}</td>
          </tr>
          <tr>
            <td>Opponent</td>
            <td>{tricksWon[PlayerSide.Cpu]}</td>
          </tr>
        </tbody>
      </table>
      <button type="button" className="wc-decline" onClick={onFinish}>
        Finish the round
      </button>
    </div>
  )
}
