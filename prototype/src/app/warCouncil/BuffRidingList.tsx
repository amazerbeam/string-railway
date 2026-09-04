/**
 * DLR-153 — "Riding this trick" (AC9/AC10). Renders `RidingBuffRow`s built by `buffRideModel.ts`
 * and decides nothing: every sentence comes from `buffRideLabels.ts`. A `game-ux` panel with
 * nothing to report renders nothing at all — no empty frame, no placeholder row.
 *
 * Only the row and remove-control classes carry CSS today (`warCouncilBuffRide.css`, written in
 * Phase 5) — the buff name, reach sentence and status text are plain `<span>`s rather than named
 * classes with no rule behind them yet, so this file introduces no string-bound name that Task
 * 16.2's grep audit would find on only one side of the CSS/TSX pair.
 */
import type { BuffId } from '../../hunt'
import type { RidingBuffRow } from './buffRideModel'
import {
  buffName,
  nonRevocableStatusText,
  removeBuffLabel,
  ridingRowText,
  RIDING_LIST_LABEL,
} from './buffRideLabels'
import { PlaceKind } from './cardPlacement'
import { anchorKeyFor, useMotionAnchors } from './motionAnchorContext'
import './warCouncilBuffRidePanel.css'

interface BuffRidingListProps {
  readonly rows: readonly RidingBuffRow[]
  readonly onRemove: (id: BuffId) => void
  /** QA fix (DLR-157 review) — true while a buff's own M15/M16 flight is airborne. Disables every
   *  remove button for the duration, so a second tap cannot supersede a removal's still-in-flight
   *  commit — the tap cost stays one, the same guard `useTableCardMotion`'s `inFlight` gives M1. */
  readonly disabled: boolean
}

export default function BuffRidingList({ rows, onRemove, disabled }: BuffRidingListProps) {
  // DLR-157 — called before the early return below, or the hook order would change the render
  // this list goes from empty to non-empty (or back), which React forbids.
  const { register } = useMotionAnchors()

  if (rows.length === 0) return null

  return (
    <div className="wc-buff-riding-list" role="group" aria-label={RIDING_LIST_LABEL}>
      <span className="wc-buff-riding-heading" aria-hidden="true">
        {RIDING_LIST_LABEL}
      </span>
      {rows.map((row) => (
        <div
          key={row.buff.id}
          className={`wc-buff-riding-row${row.reach === 0 ? ' wc-is-unreachable' : ''}`}
          ref={register(anchorKeyFor({ kind: PlaceKind.RidingStrip, slot: String(row.buff.id) }))}
        >
          <span>
            <b>{buffName(row.buff)}</b>
          </span>
          <span>{ridingRowText(row)}</span>
          {row.revocable ? (
            <button
              type="button"
              className="wc-buff-riding-remove"
              aria-label={removeBuffLabel(row.buff, row.reach)}
              disabled={disabled}
              onClick={() => onRemove(row.buff.id)}
            >
              ×
            </button>
          ) : (
            <span>{nonRevocableStatusText(row.buff)}</span>
          )}
        </div>
      ))}
    </div>
  )
}
