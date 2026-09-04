import { PlaceKind } from './cardPlacement'
import { RESHUFFLE_NOTE, SPENT_PILE_LABEL, SPENT_STANDING_NOTE, spentCountText } from './labels'
import { useMotionAnchor } from './motionAnchorContext'

interface DiscardPileProps {
  readonly spentCount: number
  /** AC9 — true only for a hand that was dealt from a reshuffle. */
  readonly reshuffled: boolean
}

/**
 * DLR-123 AC8/AC9 — the felt's spent pile: three face-down backs, a live count, and one line
 * that is either the standing "not reshuffling" statement or the reshuffle announcement.
 *
 * Renders BACKS ONLY and takes a COUNT rather than the cards. That is the enforcement point for
 * AC8's "its contents are never inspectable": a component handed `readonly Card[]` could render
 * one by mistake or leak one into the accessibility tree, and this one cannot, because it has
 * never been given them. It decides nothing else — a number and a boolean in, markup out.
 *
 * Sits beside `DecreePile` in the felt rail rather than in a corner plate, for `DecreePile`'s own
 * stated reason: the two piles are the same physical object to the player and a corner is where a
 * count gets occluded.
 */
export default function DiscardPile({ spentCount, reshuffled }: DiscardPileProps) {
  const spentPileRef = useMotionAnchor({ kind: PlaceKind.SpentPile })

  return (
    <div className="wc-pile wc-spent" role="group" aria-label={SPENT_PILE_LABEL} ref={spentPileRef}>
      <span className="wc-plate-label">{SPENT_PILE_LABEL}</span>
      <span className="wc-pile-cards" aria-hidden="true">
        <span className="wc-pile-back wc-b1" />
        <span className="wc-pile-back wc-b2" />
        <span className="wc-pile-back wc-spent-top" />
      </span>
      <span className="wc-plate-label">{spentCountText(spentCount)}</span>
      <p className={`wc-reshuffle-note${reshuffled ? ' wc-is-reshuffled' : ''}`} role="status">
        {reshuffled ? RESHUFFLE_NOTE : SPENT_STANDING_NOTE}
      </p>
    </div>
  )
}
