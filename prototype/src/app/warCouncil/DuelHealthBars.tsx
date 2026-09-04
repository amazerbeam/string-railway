import type { ReactNode } from 'react'
import { DuelSide } from '../../hunt'
import { HeartState, PipType, type HealthBarView } from './duelHealthBars'
import { HeartMark, HeartSymbolSheet, ShieldMark } from './HeartMark'
import { HEALTH_BAR_LABEL, healthBarValueText } from './labels'

interface DuelHealthBarsProps {
  readonly bars: readonly HealthBarView[]
  /** Rendered BETWEEN the two opposed bars — the `You · Trick · Them` trio, which is the
   *  fighting-game centre slot. The mirror's geometry (which bar anchors left, which right)
   *  therefore lives entirely in this component rather than being reassembled by its caller. */
  readonly centre: ReactNode
  /** The Quarry bar's name, ALREADY WORDED by `quarryHealthLabel` — `Aoife’s health`. A string
   *  rather than a name to interpolate, and never a run or an index, for the same reason
   *  `runLabel` is a string: the card layer renders a run figure and must not learn to derive
   *  one. The player's side keeps `HEALTH_BAR_LABEL`, which needs nothing from the run. */
  readonly quarryLabel: string
}

/**
 * The duel's two health bars as a mirrored opposed pair (§6, `ideas.md`'s Tekken entry): the
 * player's anchored to the left edge, the Quarry's to the right, both depleting toward the centre.
 *
 * The Quarry-side row previews the live streak as its last `bank × multiplier` standing hearts,
 * dimmed and flashing — the fighting-game recoverable-damage grammar, now expressed as discrete
 * glyphs rather than a carved-out segment. That is what keeps §6's four-figures risk to two moving
 * widgets rather than four, and it is what makes AC3's "health lost versus health at risk" a
 * distinction inside one row rather than a comparison across two readouts.
 *
 * Computes nothing. `duelHealthBars` derived every heart, and `applyDamage` did every clamp and
 * every subtraction before that. Renders whatever length of `bars` it is handed, which is what
 * makes §6's net-only fallback (AC8) a one-line change in `duelHealthBars` rather than here.
 */
export default function DuelHealthBars({ bars, centre, quarryLabel }: DuelHealthBarsProps) {
  const [player, quarry] = bars
  // Selected by the view's own side rather than by its position in `bars`, so the two labels
  // cannot be swapped by a caller that orders the pair differently.
  const nameFor = (view: HealthBarView) =>
    view.side === DuelSide.Quarry ? quarryLabel : HEALTH_BAR_LABEL[view.side]
  return (
    <>
      <HeartSymbolSheet />
      {player ? <SideBar view={player} label={nameFor(player)} /> : null}
      {centre}
      {quarry ? <SideBar view={quarry} label={nameFor(quarry)} /> : null}
    </>
  )
}

/**
 * One side's bar. `role="meter"` is the ARIA role for a bounded reading that is not a task's
 * progress, and it is directly queryable by role and name (AC7).
 *
 * This component writes NO inline style at all — not an omission of the custom-property split
 * `--w` used to carry, but its retirement. That split existed because an inline `width` outranks
 * an external rule carrying no `!important`, and a row of fixed-size glyphs has no per-element
 * geometry to communicate, so the hazard is designed out rather than guarded against. Any future
 * need for a per-heart value must come back through a custom property rather than an inline
 * style; the reasoning is recorded at `.docs/implementation/war-council-ui/layout-and-styling.md`.
 *
 * DLR-115 — the shield cluster (`view.shieldPips`) renders INSIDE this same `role="meter"`
 * element, not beside it in a second meter, so the bar stays ONE reading with one accessible
 * name: a second meter would make a screen reader announce the shield as a separate bounded
 * value it is not. It comes AFTER the health pips in DOM order, which under the player's normal
 * (non-reversed) flex direction puts it inboard, nearest the centre where damage arrives — the
 * whole row then reads outward-to-inward in depletion order: the further toward the centre, the
 * sooner it is lost. Still computes nothing; `view.shieldPips` is mapped exactly as `view.hearts`
 * already is.
 */
function SideBar({ view, label }: { view: HealthBarView; label: string }) {
  return (
    <div className="wc-hp" data-side={view.side}>
      <div className="wc-hp-head">
        <span className="wc-hp-who">{label}</span>
        <span className="wc-hp-num">
          {view.current} / {view.max}
        </span>
      </div>
      <div
        className={`wc-hp-hearts${view.lethal ? ' wc-is-lethal' : ''}`}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={view.max}
        aria-valuenow={view.current}
        aria-valuetext={healthBarValueText(view)}
      >
        {view.hearts.map((state, index) => (
          <span key={index} className="wc-hp-heart" data-type={PipType.Health} data-state={state}>
            <HeartMark broken={state === HeartState.Broken || state === HeartState.Breaking} />
          </span>
        ))}
        {view.shieldPips.length > 0 ? (
          <span className="wc-hp-shield-run">
            {view.shieldPips.map((state, index) => (
              <span
                key={index}
                className="wc-hp-heart"
                data-type={PipType.Shield}
                data-state={state}
              >
                <ShieldMark />
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </div>
  )
}
