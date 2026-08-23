import type { ApplyDamageRefusal } from '../../warCouncil'
import {
  APPLY_DAMAGE_RAIL_LABEL,
  APPLY_DAMAGE_REFUSAL_MESSAGE,
  applyDamageAccessibleName,
} from './labels'
import './warCouncilApplyDamage.css'

interface ApplyDamagePlateProps {
  /** What applying right now would deal. `bank.ts`'s `cashValue` owns the figure; this component
   *  asserts nothing about it. */
  readonly cashValue: number
  readonly poised: boolean
  /** `null` when the control is live; otherwise WHY it is not. `applyDamageRefusalFor` is the one
   *  statement of this — the plate never decides its own availability, which is what keeps its
   *  disabled state and the reducer's guard from drifting apart. */
  readonly refusal: ApplyDamageRefusal | null
  readonly onTap: () => void
  readonly onCancel: () => void
}

/**
 * DLR-94 AC1 — the felt-rail plate for the Apply Damage action, a SIBLING of `CheatSlots` and
 * `TimebombCharge` rather than a generalisation of either: the three controls keep independent copy
 * and independent components, so retuning one never risks the others.
 *
 * `onClick` STOPS PROPAGATION for the load-bearing reason `TimebombCharge.tsx`'s does: this mounts
 * inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting — so
 * without it, poising the plate while a trick reveal is held would also clear the reveal and
 * commit the Quarry's lead as a side effect.
 *
 * The refusal sentence renders on the face of the control rather than in a tooltip: `game-ux`
 * forbids hiding anything the current decision needs behind hover, and touch has no hover at all.
 * One control is far below the roving-tabindex threshold, so it is a plain tab stop.
 */
export default function ApplyDamagePlate({
  cashValue,
  poised,
  refusal,
  onTap,
  onCancel,
}: ApplyDamagePlateProps) {
  const disabled = refusal !== null

  return (
    <div
      className="wc-apply-rail"
      role="group"
      aria-label={APPLY_DAMAGE_RAIL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <span className="wc-plate-label">{APPLY_DAMAGE_RAIL_LABEL}</span>
      <button
        type="button"
        className={`wc-apply-plate${poised && !disabled ? ' is-poised' : ''}`}
        aria-pressed={poised && !disabled}
        aria-label={applyDamageAccessibleName(cashValue, poised, refusal)}
        disabled={disabled}
        onClick={onTap}
      >
        <span className="wc-apply-glyph" aria-hidden="true">
          ⤓
        </span>
        <span className="wc-apply-figure" aria-hidden="true">
          {cashValue}
        </span>
      </button>
      {refusal !== null && (
        <p className="wc-apply-refusal">{APPLY_DAMAGE_REFUSAL_MESSAGE[refusal]}</p>
      )}
    </div>
  )
}
