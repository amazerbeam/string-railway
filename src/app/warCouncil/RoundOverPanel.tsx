import { PlayerSide } from '../../warCouncil'

interface RoundOverPanelProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly score: Readonly<Record<PlayerSide, number>>
  readonly onFinish: () => void
}

/**
 * The round-over panel: a heading, a two-row tally of each side's tricks
 * and points, and one control reporting the round through `onFinish`.
 * Computes nothing — `score` arrives already computed by the engine's
 * `scoreRound`, since the `tricksToPoints` bands are a rule this component
 * owns no part of. The mockup's own dev harness had no mount contract to
 * satisfy and so needed no explicit control here; this one is added
 * because `WarCouncilMountProps.onComplete` must be called from a handler,
 * never inferred, styled with the same `wc-decline` treatment already
 * established for the felt's other secondary control.
 */
export default function RoundOverPanel({ tricksWon, score, onFinish }: RoundOverPanelProps) {
  return (
    <div className="wc-over">
      <h2>Round complete</h2>
      <table className="wc-tally">
        <thead>
          <tr>
            <th>Side</th>
            <th>Tricks</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>You</td>
            <td>{tricksWon[PlayerSide.Player]}</td>
            <td>{score[PlayerSide.Player]}</td>
          </tr>
          <tr>
            <td>Opponent</td>
            <td>{tricksWon[PlayerSide.Cpu]}</td>
            <td>{score[PlayerSide.Cpu]}</td>
          </tr>
        </tbody>
      </table>
      <button type="button" className="wc-decline" onClick={onFinish}>
        Finish the round
      </button>
    </div>
  )
}
