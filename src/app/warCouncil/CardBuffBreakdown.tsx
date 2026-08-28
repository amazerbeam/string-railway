/**
 * DLR-153 — the anchored, bottom-up per-card breakdown (AC11-AC13, AC18). Renders a
 * `CardBuffBreakdown` model value built by `buffBreakdownModel.ts` and decides nothing: every
 * sentence on this surface already comes from `buffRideLabels.ts`, baked into the model.
 *
 * DOM order is the bottom-up reading, furthest-from-the-card first: the dead rows, then the two
 * branch groups, then the Overlap row, then the two totals rows nearest the card. Always fully
 * expanded — there is no collapsed state and no expand control (AC13).
 *
 * Named `CardBuffBreakdown` — the SAME name as the `CardBuffBreakdown` type this file renders,
 * from `buffBreakdownModel.ts`. That type is imported aliased as `Breakdown` at the import site
 * below so the two names never collide in this file's namespace.
 *
 * Only the panel, row, branch and dead-row classes carry CSS today (`warCouncilBuffRide.css`,
 * written in Phase 5) — the header, condition text, payoff and totals figures are plain elements
 * rather than named classes with no rule behind them yet, so this file introduces no string-bound
 * name that Task 16.2's grep audit would find on only one side of the CSS/TSX pair.
 *
 * DLR-153 Phase 8 Correction 2 — every condition row and every dead row carries its OWN remove
 * control, restoring the ✕ `update-log.md` records as pedantically removed and practically
 * missed: "the buff is listed here, so this is where the hand goes." `riding` is threaded in
 * (rather than re-deriving reach here) so this component still decides nothing — `reach` and
 * `revocable` are read straight off the SAME `RidingBuffRow`s `BuffRidingList` renders, keyed by
 * buff id. A row whose buff has no matching `RidingBuffRow` (should not happen — every row here
 * is built from an activated buff) draws no control rather than guessing a reach.
 */
import { useRef } from 'react'
import type { BuffId } from '../../hunt'
import type { CardBuffBreakdown as Breakdown } from './buffBreakdownModel'
import {
  BREAKDOWN_LABEL,
  removeBuffLabel,
  TOTALS_LABEL,
  totalsEstimateNote,
} from './buffRideLabels'
import type { RidingBuffRow } from './buffRideModel'
import { useBuffBreakdownAnchor } from './useBuffBreakdownAnchor'

interface CardBuffBreakdownProps {
  readonly breakdown: Breakdown | null
  readonly riding: readonly RidingBuffRow[]
  readonly onEnter: () => void
  readonly onLeave: () => void
  readonly onEscape: () => void
  readonly onRemove: (id: BuffId) => void
}

export default function CardBuffBreakdown({
  breakdown,
  riding,
  onEnter,
  onLeave,
  onEscape,
  onRemove,
}: CardBuffBreakdownProps) {
  // Called unconditionally (React's own rule), even on a `null` breakdown — `useBuffBreakdownAnchor`
  // itself no-ops when either `panelRef.current` or `target` is `null`, which covers exactly the
  // render this component returns nothing on.
  const panelRef = useRef<HTMLDivElement | null>(null)
  useBuffBreakdownAnchor(panelRef, breakdown?.card ?? null)

  if (breakdown === null) return null

  function rowFor(id: BuffId): RidingBuffRow | undefined {
    return riding.find((candidate) => candidate.buff.id === id)
  }

  function removeControl(id: BuffId) {
    const row = rowFor(id)
    if (row === undefined || !row.revocable) return null
    return (
      <button
        type="button"
        className="wc-buff-breakdown-remove"
        aria-label={removeBuffLabel(row.buff, row.reach)}
        onClick={() => onRemove(id)}
      >
        ×
      </button>
    )
  }

  return (
    <div
      ref={panelRef}
      className="wc-buff-breakdown"
      role="group"
      aria-label={BREAKDOWN_LABEL}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onEscape()
      }}
    >
      <p className="wc-buff-breakdown-head">
        {breakdown.headerText}
        <small className="wc-buff-breakdown-head-note">{breakdown.firingCountText}</small>
      </p>

      <div className="wc-buff-breakdown-rows">
        {breakdown.dead.map((row) => (
          <div key={row.buff.id} className="wc-buff-breakdown-row wc-buff-breakdown-dead">
            {removeControl(row.buff.id)}
            <span className="wc-buff-breakdown-cell">
              <s>{row.reasonText}</s>
              {row.elsewhereText}
            </span>
          </div>
        ))}

        {breakdown.groups.map((group) => (
          <div key={group.branch} className="wc-buff-breakdown-group-rows">
            {group.rows.length > 0 && (
              <div className={`wc-buff-breakdown-group wc-is-${branchModifier(group.branch)}`}>
                {group.headingText}
              </div>
            )}
            {group.rows.map((row) => (
              <div
                key={row.buff.id}
                className={`wc-buff-breakdown-row wc-is-${branchModifier(group.branch)}`}
              >
                {removeControl(row.buff.id)}
                <span className="wc-buff-breakdown-cell">
                  <b>{row.buffNameText}</b>
                  <small>{row.conditionText}</small>
                </span>
                <span className="wc-buff-breakdown-payoff">{row.payoffText}</span>
              </div>
            ))}
          </div>
        ))}

        {breakdown.overlapText !== null && (
          <div className="wc-buff-breakdown-row wc-buff-breakdown-overlap">
            <span />
            <span className="wc-buff-breakdown-cell">
              <b>{breakdown.overlapText}</b>
            </span>
          </div>
        )}
      </div>

      <div className="wc-buff-breakdown-totals">
        {breakdown.totals.map((totals) => (
          <div key={totals.branch} className="wc-buff-breakdown-totals-line">
            <span className="wc-buff-breakdown-totals-key">{TOTALS_LABEL[totals.branch]}</span>
            <span className="wc-buff-breakdown-totals-value">
              {totals.damage} damage, {totals.multiplier} multiplier
              {totals.carryText !== null && ` — ${totals.carryText}`}
            </span>
            {/* Fix 3 — a genuinely unknowable skull status is never rendered as a flat certainty:
                `estimate` marks this row's figures as ONE of two still-possible readings. */}
            {totals.estimate && (
              <span className="wc-buff-breakdown-estimate">{totalsEstimateNote()}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function branchModifier(branch: Breakdown['totals'][number]['branch']): string {
  return branch === 'took' ? 'took' : 'did-not-take'
}
