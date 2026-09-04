import type { Buff } from '../../hunt'
import { deadBuffReasonText } from './resolutionDeadBuffs'
import { BeatKind, type ResolutionBeat } from './resolutionBeats'

export interface ResolutionBreakdownProps {
  /** The whole sequence `resolutionBeatsFor` derived, ordered. */
  readonly beats: readonly ResolutionBeat[]
  /** How many of `beats` have landed (`useBeatSequence`'s own field name). */
  readonly landed: number
  /** DLR-160 AC3 — buffs armed for this trick that did NOT fire. Empty renders nothing: a list
   *  with nothing to report is furniture (`game-ux`'s own rule), not a reassuring "nothing dead". */
  readonly deadBuffs: readonly Buff[]
}

/** The two kinds that ADD to the trick's damage before any multiplier applies. */
const ADDITIVE_KINDS: readonly BeatKind[] = [BeatKind.Base, BeatKind.Blade]
/** The two kinds that scale the additive subtotal. `BeatKind.Overlap` moves `mult`, not `damage`
 *  (`resolutionBeats.ts`'s own `mult += trickDamage.overlapBonus`), so it groups with Momentum
 *  here even though neither is a fired buff's own reward axis. */
const MULTIPLIER_KINDS: readonly BeatKind[] = [BeatKind.Momentum, BeatKind.Overlap]

/**
 * DLR-160 (widened) — the pot card's arithmetic SHAPE: the additive rows, a `Damage` subtotal
 * rule (only when a multiplier actually fired), the multiplier rows, and a final rule for the
 * figure that actually entered the pot. Replaces the flat, two-row-scrolling `ResolutionLedger`
 * this ticket retired — the whole card scrolls its own body now (`PotCard.tsx`), so a second,
 * nested scroll region inside it was never load-bearing.
 *
 * A HURT or ABSORBED trick produces exactly one beat (`resolutionBeats.ts`) and adds nothing to
 * any pot — rendering a numeric "Added 0" next to a label that already states the loss would be
 * a second, contradicting way of saying the same thing, so that branch renders the beat's own
 * label as a plain note instead of the numeric final rule.
 *
 * This is also the fix for the session's false bug report: a Key Low card was armed, pays only on a
 * trick the player goes LOW on, and the player went high — so it correctly paid nothing, and nothing on
 * screen said so. Every dead entry renders under a dashed rule with an `✕` mark and no value
 * cell at all, so it can never read as "fired and paid zero".
 */
export default function ResolutionBreakdown({
  beats,
  landed,
  deadBuffs,
}: ResolutionBreakdownProps) {
  const visible = beats.slice(0, landed)
  const additive = visible.filter((beat) => ADDITIVE_KINDS.includes(beat.kind))
  const multiplier = visible.filter((beat) => MULTIPLIER_KINDS.includes(beat.kind))
  const closing = visible.find(
    (beat) =>
      beat.kind === BeatKind.Banked ||
      beat.kind === BeatKind.Hurt ||
      beat.kind === BeatKind.Absorbed,
  )
  const subtotalDamage = additive.length > 0 ? additive[additive.length - 1].damage : 0
  const showSubtotal = additive.length > 0 && multiplier.length > 0

  return (
    <div className="wc-resolve-breakdown">
      {additive.length > 0 && (
        <>
          <span className="wc-resolve-breakdown-eyebrow" aria-hidden="true">
            This trick added
          </span>
          <ul className="wc-resolve-rows">
            {additive.map((beat, index) => (
              <li key={`${index}-${beat.kind}`} className="wc-resolve-row">
                <span className="wc-resolve-row-what">{beat.label}</span>
                <span className="wc-resolve-row-amt">+{beat.amount}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {showSubtotal && (
        <div className="wc-resolve-rule">
          <span className="wc-resolve-rule-what">Damage</span>
          <span className="wc-resolve-rule-amt">{subtotalDamage}</span>
        </div>
      )}
      {multiplier.length > 0 && (
        <ul className="wc-resolve-rows">
          {multiplier.map((beat, index) => (
            <li key={`${index}-${beat.kind}`} className="wc-resolve-row">
              <span className="wc-resolve-row-what">{beat.label}</span>
              <span className="wc-resolve-row-amt">×{beat.mult}</span>
            </li>
          ))}
        </ul>
      )}
      {closing !== undefined &&
        (closing.kind === BeatKind.Banked ? (
          <div className="wc-resolve-rule wc-resolve-rule-final">
            <span className="wc-resolve-rule-what">Added</span>
            <span className="wc-resolve-rule-amt">{closing.running}</span>
          </div>
        ) : (
          <p className="wc-resolve-closing-note">{closing.label}</p>
        ))}
      {deadBuffs.length > 0 && (
        <ul className="wc-resolve-dead-list" aria-label="Armed and did not fire this trick">
          {deadBuffs.map((buff) => (
            <li key={buff.id} className="wc-resolve-dead-row">
              <span className="wc-resolve-dead-mark" aria-hidden="true">
                ✕
              </span>
              <span className="wc-resolve-dead-text">{deadBuffReasonText(buff)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
