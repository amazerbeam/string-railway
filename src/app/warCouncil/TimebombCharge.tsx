import { TIMEBOMB_RAIL_LABEL, timebombAccessibleName } from './labels'
import { TimebombStage } from './roundUiState'
import './warCouncilTimebomb.css'

interface TimebombChargeProps {
  /** Charges held. `run.ts` owns the count; this component asserts nothing about it. */
  readonly charges: number
  readonly stage: TimebombStage | null
  /** The same gate the Cheat rail and the fan use, so Timebomb cannot be armed into a moment
   *  where no card can be played. */
  readonly interactive: boolean
  readonly onTap: () => void
  readonly onCancel: () => void
}

/**
 * AC2 — the felt-rail plate for a held Timebomb charge, mirroring `CheatSlots.tsx`'s structure and
 * keyboard contract. A SIBLING of `CheatSlots`, not a generalisation of it: the two consumables
 * keep independent copy and independent components, so retuning one never risks the other.
 *
 * `onClick` STOPS PROPAGATION for the same load-bearing reason `CheatSlots.tsx`'s does: this
 * mounts inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting —
 * so without it, arming a charge while a trick reveal is held would also clear the reveal and
 * commit the Quarry's lead as a side effect.
 *
 * One control is far below `game-ux`'s roving-tabindex threshold, so it is a plain tab stop.
 * The rail stays inert rather than absent at zero charges — AC1's purse cell and this plate must
 * never disagree about whether the item still exists this run.
 */
export default function TimebombCharge({
  charges,
  stage,
  interactive,
  onTap,
  onCancel,
}: TimebombChargeProps) {
  const disabled = !interactive || charges <= 0

  return (
    <div
      className="wc-timebomb-rail"
      role="group"
      aria-label={TIMEBOMB_RAIL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <span className="wc-plate-label">{TIMEBOMB_RAIL_LABEL}</span>
      <button
        type="button"
        className={`wc-timebomb-plate${stage ? ` is-${stage}` : ''}`}
        aria-pressed={stage === TimebombStage.Armed}
        aria-label={timebombAccessibleName(stage, charges)}
        disabled={disabled}
        onClick={onTap}
      >
        <span className="wc-timebomb-glyph" aria-hidden="true">
          ⚗
        </span>
        <span className="wc-timebomb-count" aria-hidden="true">
          {charges}
        </span>
      </button>
    </div>
  )
}
