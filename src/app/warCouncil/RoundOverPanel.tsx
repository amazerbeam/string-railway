import { PlayerSide } from '../../warCouncil'
import type { Health } from '../../hunt'
import { FINISH_ROUND_LABEL } from './labels'

/** This hand's own tally — the delta against the encounter it was mounted with (§3.3), computed
 *  by the mount, never re-derived here. */
export interface HandSummary {
  readonly healthLost: Health
  readonly dealtToQuarry: Health
}

interface RoundOverPanelProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly handSummary: HandSummary
  readonly onFinish: () => void
}

/**
 * The hand-over panel (DLR-80): a hand's own tally — tricks taken, health lost, health dealt to
 * the Quarry — followed by the single control that deals the next hand. Computes nothing:
 * `handSummary`'s two figures are the mount's own delta against the encounter this hand started
 * from (`WarCouncilRound.tsx`), never re-derived here.
 *
 * Retired on DLR-80: the `Spoils × Standing = Damage` equation, the two-stage Apply/Finish
 * control, and the per-side panels — damage now lands per trick as it happens, not once at the
 * end of a Hunt, so there is nothing left here to commit.
 *
 * Retired on DLR-82: the terminal branch and its `winner` prop. A resolved encounter is now
 * `src/app/run/RunOutcomePanel.tsx`'s — this panel is solely the between-hands tally.
 */
export default function RoundOverPanel({ tricksWon, handSummary, onFinish }: RoundOverPanelProps) {
  return (
    <div className="wc-over">
      <h2>The hand is over</h2>
      <table className="wc-tally">
        <thead>
          <tr>
            <th>Figure</th>
            <th>This hand</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tricks taken</td>
            <td>{tricksWon[PlayerSide.Player]}</td>
          </tr>
          <tr>
            <td>Opponent&rsquo;s tricks</td>
            <td>{tricksWon[PlayerSide.Cpu]}</td>
          </tr>
          <tr>
            <td>Health lost</td>
            <td>{handSummary.healthLost}</td>
          </tr>
          <tr>
            <td>Dealt to the Quarry</td>
            <td>{handSummary.dealtToQuarry}</td>
          </tr>
        </tbody>
      </table>
      <div className="wc-actions">
        <button type="button" className="wc-decline" onClick={onFinish}>
          {FINISH_ROUND_LABEL}
        </button>
      </div>
    </div>
  )
}
