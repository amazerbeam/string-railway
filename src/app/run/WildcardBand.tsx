import type { Buff } from '../../hunt'
import CardFace from './ManageBuffsCardFace'
import {
  MANAGE_BUFFS_WILD_BAND,
  MANAGE_BUFFS_WILD_RULE,
  MANAGE_BUFFS_WILD_SPEND_LABEL,
} from './manageBuffsLabels'

export interface WildcardBandProps {
  /** The wildcard whose face the band shows — the lowest-id one held, the copy a spend consumes. */
  readonly wildcard: Buff
  readonly count: number
  readonly onArm: () => void
}

/** The key the panel's focus-restore list uses to find this band's control again after the target
 *  mode closes. Not a pile key — no pile can collide with it, because a pile key always carries
 *  the `|` separators `buffCombineKey` composes. */
export const WILD_BAND_FOCUS_KEY = 'wildband'

/**
 * DLR-162 — the wildcard band, above the two combine bands on the Manage Buffs screen
 * (`mockup.html`). One card face, the count, the rule sentence, and the control that arms the
 * target mode.
 *
 * The panel renders NOTHING at all when no wildcard is held — `game-ux`'s rule against a panel that
 * reports that nothing is happening — so this component is never mounted for an empty band and
 * carries no empty state of its own.
 */
export default function WildcardBand({ wildcard, count, onArm }: WildcardBandProps) {
  return (
    <div className="mb-wildband">
      <CardFace buff={wildcard} count={count} />
      <div className="mb-wildband-copy">
        {/* DLR-162 fix pass — an `<h2 className="mb-bandhead">` exactly as both sibling bands on
            this screen are. It was a `<div>`, which read as a heading and was absent from the
            heading outline a screen-reader user navigates by. */}
        <h2 className="mb-bandhead">
          <span className="mb-pip" aria-hidden="true" />
          {MANAGE_BUFFS_WILD_BAND} · {count}
        </h2>
        <p className="mb-wildband-rule">{MANAGE_BUFFS_WILD_RULE}</p>
      </div>
      <button type="button" className="mb-go" onClick={onArm} data-wild-key={WILD_BAND_FOCUS_KEY}>
        {MANAGE_BUFFS_WILD_SPEND_LABEL}
      </button>
    </div>
  )
}
