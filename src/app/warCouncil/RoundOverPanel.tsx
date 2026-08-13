import { PlayerSide, type HuntDamage } from '../../warCouncil'
import type { EncounterState } from '../../hunt'
import {
  APPLY_DAMAGE_LABEL,
  ENCOUNTER_OUTCOME,
  FINISH_ROUND_LABEL,
  STANDING_BAND_NAME,
} from './labels'

const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'You',
  [PlayerSide.Cpu]: 'Opponent',
}

interface RoundOverPanelProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly huntDamage: Readonly<Record<PlayerSide, HuntDamage>>
  /** `null` until the player commits. Once set, the bars have already moved. */
  readonly applied: EncounterState | null
  readonly onApply: () => void
  readonly onFinish: () => void
}

/**
 * The end-of-Hunt panel (AC7): shows each side's Damage as its parts — `Spoils × Standing =
 * Damage` — because §1's whole claim is that the equation is legible, not just its result.
 * Computes nothing: both sides' `HuntDamage` arrive already computed by the engine's
 * `scoreHunt` — this component only formats. The Demand line and the cleared/missed verdict
 * were removed on DLR-67.
 *
 * DLR-71's AC4 second stage: the arithmetic is followed by ONE control, `applied === null`,
 * that commits the damage through the reducer's `CommitDamage` — never here — so the bars are
 * seen to move before the screen changes. Once `applied` is set, either the next Hunt's control
 * appears or, if a bar emptied, the terminal outcome does. `applied.winner !== null` is
 * `isEncounterResolved`'s own one-line definition, narrowed as a local rather than asserted —
 * this project treats a non-null assertion the way it treats `any`.
 */
export default function RoundOverPanel({
  tricksWon,
  huntDamage,
  applied,
  onApply,
  onFinish,
}: RoundOverPanelProps) {
  const playerDamage = huntDamage[PlayerSide.Player].damage
  const cpuDamage = huntDamage[PlayerSide.Cpu].damage
  // `applied?.winner ?? null` narrows without a non-null assertion; `winner !== null` is
  // `isEncounterResolved`'s own one-line definition, read directly rather than re-imported.
  const winner = applied?.winner ?? null

  return (
    <div className="wc-over">
      <h2>The Hunt is over</h2>
      <div className="wc-sides">
        <SideEquation
          side={PlayerSide.Player}
          damage={huntDamage[PlayerSide.Player]}
          ahead={playerDamage > cpuDamage}
        />
        <SideEquation
          side={PlayerSide.Cpu}
          damage={huntDamage[PlayerSide.Cpu]}
          ahead={cpuDamage > playerDamage}
        />
      </div>
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
      {applied === null ? (
        <div className="wc-actions">
          <button type="button" className="wc-decline" onClick={onApply}>
            {APPLY_DAMAGE_LABEL}
          </button>
        </div>
      ) : winner !== null ? (
        <p className="wc-terminal" role="status">
          {ENCOUNTER_OUTCOME[winner]}
        </p>
      ) : (
        <div className="wc-actions">
          <button type="button" className="wc-decline" onClick={onFinish}>
            {FINISH_ROUND_LABEL}
          </button>
        </div>
      )}
    </div>
  )
}

function SideEquation({
  side,
  damage,
  ahead,
}: {
  side: PlayerSide
  damage: HuntDamage
  ahead: boolean
}) {
  const bandName = STANDING_BAND_NAME[damage.band.name]
  const name = SIDE_LABEL[side]
  return (
    <div className={`wc-side${ahead ? ' wc-is-ahead' : ''}`}>
      <p className="wc-side-name">{name}</p>
      <div
        className="wc-equation"
        role="group"
        aria-label={`${name}: Spoils times Standing equals Damage`}
      >
        <span className="wc-equation-part">
          <span className="wc-equation-key" aria-hidden="true">
            Spoils
          </span>
          <span className="wc-equation-value" aria-label={`${name} Spoils: ${damage.spoils}`}>
            {damage.spoils}
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
            aria-label={`${name} Standing multiplier: times ${damage.standing}`}
          >
            ×{damage.standing}
          </span>
        </span>
        <span className="wc-equation-op" aria-hidden="true">
          =
        </span>
        <span className="wc-equation-part wc-is-result">
          <span className="wc-equation-key" aria-hidden="true">
            Damage
          </span>
          <span className="wc-equation-value" aria-label={`${name} Damage: ${damage.damage}`}>
            {damage.damage}
          </span>
        </span>
      </div>
      <p className="wc-verdict-detail">
        {damage.tricks} tricks — {bandName}.
      </p>
    </div>
  )
}
