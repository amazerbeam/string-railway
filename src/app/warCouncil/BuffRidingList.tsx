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
  buffReachText,
  nonRevocableStatusText,
  removeBuffLabel,
  RIDING_LIST_LABEL,
} from './buffRideLabels'
import './warCouncilBuffRidePanel.css'

interface BuffRidingListProps {
  readonly rows: readonly RidingBuffRow[]
  readonly onRemove: (id: BuffId) => void
}

export default function BuffRidingList({ rows, onRemove }: BuffRidingListProps) {
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
        >
          <span>
            <b>{buffName(row.buff)}</b>
          </span>
          <span>{buffReachText(row.reach)}</span>
          {row.revocable ? (
            <button
              type="button"
              className="wc-buff-riding-remove"
              aria-label={removeBuffLabel(row.buff, row.reach)}
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
