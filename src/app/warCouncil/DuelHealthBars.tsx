import { type CSSProperties, type ReactNode } from 'react'
import type { HealthBarView } from './duelHealthBars'
import { HEALTH_BAR_LABEL, healthBarValueText } from './labels'

interface DuelHealthBarsProps {
  readonly bars: readonly HealthBarView[]
  /** Rendered BETWEEN the two opposed bars — the `You · Trick · Them` trio, which is the
   *  fighting-game centre slot. The mirror's geometry (which bar anchors left, which right)
   *  therefore lives entirely in this component rather than being reassembled by its caller. */
  readonly centre: ReactNode
}

/** `--w` carries the ready-made percentage string the stylesheet reads for both segments'
 *  `flex-basis`/`width` (see `warCouncilHealthBars.css`), matching `HandFan`'s `FanCardStyle`
 *  pattern for a custom property CSS doesn't type natively. */
type SegmentStyle = CSSProperties & { '--w'?: string }

/**
 * The duel's two health bars as a mirrored opposed pair (§6, `ideas.md`'s Tekken entry): the
 * player's anchored to the left edge, the Quarry's to the right, both depleting toward the centre.
 *
 * Each bar carries its OWN pending damage as a lighter segment carved out of its own current
 * health — the fighting-game recoverable-damage grammar. That is what keeps §6's four-figures risk
 * to two moving widgets rather than four, and it is what makes AC3's "health lost versus health at
 * risk" a distinction inside one bar rather than a comparison across two readouts.
 *
 * Computes nothing. `duelHealthBars` derived every percentage, and `applyDamage` did every clamp and
 * every subtraction before that. Renders whatever length of `bars` it is handed, which is what
 * makes §6's net-only fallback (AC8) a one-line change in `duelHealthBars` rather than here.
 */
export default function DuelHealthBars({ bars, centre }: DuelHealthBarsProps) {
  const [player, quarry] = bars
  return (
    <>
      {player ? <SideBar view={player} /> : null}
      {centre}
      {quarry ? <SideBar view={quarry} /> : null}
    </>
  )
}

/**
 * One side's bar. `role="meter"` is the ARIA role for a bounded reading that is not a task's
 * progress, and it is directly queryable by role and name (AC7).
 *
 * The two segment widths are set as CSS custom properties carrying ready-made percentage strings,
 * never as an inline `width`. An inline style property outranks an external rule with no
 * `!important`, so writing `width` here would make the stylesheet's own transition and lethal
 * state permanently unreachable — the exact defect `HandFan`'s transform split exists to avoid
 * (see `.docs/implementation/war-council-ui/layout-and-styling.md`).
 */
function SideBar({ view }: { view: HealthBarView }) {
  const secureStyle: SegmentStyle = { '--w': `${view.securePct}%` }
  const pendingStyle: SegmentStyle = { '--w': `${view.pendingPct}%` }

  return (
    <div className="wc-hp" data-side={view.side}>
      <div className="wc-hp-head">
        <span className="wc-hp-who">{HEALTH_BAR_LABEL[view.side]}</span>
        <span className="wc-hp-num">
          {view.current} / {view.max}
        </span>
      </div>
      <div
        className="wc-hp-track"
        role="meter"
        aria-label={HEALTH_BAR_LABEL[view.side]}
        aria-valuemin={0}
        aria-valuemax={view.max}
        aria-valuenow={view.current}
        aria-valuetext={healthBarValueText(view)}
      >
        <span className="wc-hp-secure" style={secureStyle} />
        <span
          className={`wc-hp-pending${view.lethal ? ' wc-is-lethal' : ''}`}
          style={pendingStyle}
        />
      </div>
    </div>
  )
}
