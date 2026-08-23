import type { DiscardRefusal } from '../../warCouncil'
import { DISCARD_RAIL_LABEL, DISCARD_REFUSAL_MESSAGE, discardAccessibleName } from './labels'
import './warCouncilDiscard.css'

interface DiscardPlateProps {
  readonly discardsRemaining: number
  readonly selecting: boolean
  readonly selectionSize: number
  readonly refusal: DiscardRefusal | null
  readonly onTap: () => void
  readonly onCancel: () => void
}

/**
 * DLR-100 AC1/AC9 — the felt-rail plate for the discard, a SIBLING of `CheatSlots`, `TimebombCharge`
 * and `ApplyDamagePlate` rather than a generalisation of any of them: the four controls keep
 * independent copy and independent components, so retuning one never risks the others.
 *
 * `onClick` STOPS PROPAGATION for `ApplyDamagePlate.tsx`'s own load-bearing reason: this mounts
 * inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting — so
 * without it, opening the discard selection while a trick reveal is held would also clear the
 * reveal and commit the Quarry's lead as a side effect. (In practice `discardRefusalFor` already
 * refuses the tap while a reveal is held, since `discardWindowOpen` requires `resolvedTrick ===
 * null` — this guard is defence in depth, matching every sibling control's own.)
 *
 * The refusal sentence renders on the control's own face rather than in a tooltip: `game-ux`
 * forbids hiding anything the current decision needs behind hover, and touch has no hover at all.
 * One control is far below the roving-tabindex threshold, so it is a plain tab stop.
 */
export default function DiscardPlate({
  discardsRemaining,
  selecting,
  selectionSize,
  refusal,
  onTap,
  onCancel,
}: DiscardPlateProps) {
  const disabled = refusal !== null

  return (
    <div
      className="wc-discard-rail"
      role="group"
      aria-label={DISCARD_RAIL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <span className="wc-plate-label">{DISCARD_RAIL_LABEL}</span>
      <button
        type="button"
        className={`wc-discard-plate${selecting ? ' is-selecting' : ''}`}
        aria-pressed={selecting && !disabled}
        aria-label={discardAccessibleName(discardsRemaining, selecting, selectionSize, refusal)}
        disabled={disabled}
        onClick={onTap}
      >
        <span className="wc-discard-glyph" aria-hidden="true">
          ⇄
        </span>
        <span className="wc-discard-count" aria-hidden="true">
          {discardsRemaining}
        </span>
      </button>
      {refusal !== null && <p className="wc-discard-refusal">{DISCARD_REFUSAL_MESSAGE[refusal]}</p>}
    </div>
  )
}
