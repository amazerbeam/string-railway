import type { Card, Suit } from '../../warCouncil'
import { PlaceKind } from './cardPlacement'
import { cardKey, SUIT_NAME } from './labels'
import { useMotionAnchor, useMotionAnchors } from './motionAnchorContext'
import PlayingCard from './PlayingCard'
import { SuitMark } from './SuitMark'

interface DecreePileProps {
  readonly decree: Card
  readonly trumpSuit: Suit
  readonly drawPileCount: number
  /** DLR-90 AC2 — the Fox can exchange a marked card into the decree, so this is a place a marked
   *  card renders. Defaults to `false` so every existing call site keeps compiling unchanged. */
  readonly primed?: boolean
}

/**
 * The felt-left pile (AC3): the decree card face-up, two decorative
 * face-down backs stacked behind it, a "<suit> is trump" chip, and the
 * draw-pile count. Lives on the felt rather than in a corner plate because
 * trump is the most-consulted value in a trick-taking game and a corner is
 * where it gets occluded. `decree` and `trumpSuit` are read straight from
 * round state on every render, so a Fox exchange — applied by `playCard`
 * before the trick resolves — updates both immediately with no extra
 * wiring.
 */
export default function DecreePile({
  decree,
  trumpSuit,
  drawPileCount,
  primed = false,
}: DecreePileProps) {
  // DLR-157 — two distinct places live in this one component: the decree plate (the face-up
  // card) and the draw pile (the count). Two separate anchors, not one for the whole `.wc-pile`.
  //
  // DOCUMENTED CARVE-OUT (Defender review, DLR-157) — M11 (the Fox exchange) swaps a hand card
  // for the decree in ONE commit: `DecreePlate → PlayerHand` (the old decree returning) and
  // `PlayerHand → DecreePlate` (the new one arriving), diffed and planned AFTER the state has
  // already committed. By the time the driver clones this element for the "old decree returning"
  // request, React has already re-rendered `decree` to the NEW card — the flight clones whatever
  // is current, so the departing flight visually shows the wrong face. A real fix needs the
  // driver to clone from the PREVIOUS render's DOM before applying the new state (or to carry a
  // snapshot of the departing card's own art rather than resolving live), which is a change to
  // `useCardMotionDriver`'s ordering guarantees, not to this component — out of reach for this
  // fix pass. The card still lands in the right place; only its face while airborne is wrong.
  const decreeRef = useMotionAnchor({ kind: PlaceKind.DecreePlate })
  const drawPileRef = useMotionAnchor({ kind: PlaceKind.DrawPile })
  // AC7 — the decree card currently flying INTO the plate renders invisible-but-laid-out until
  // it lands, so the plate does not reflow.
  const { arriving } = useMotionAnchors()

  return (
    <div className="wc-pile">
      <span className="wc-plate-label">Decree</span>
      <span
        className={`wc-pile-cards${arriving.has(cardKey(decree)) ? ' wc-is-in-flight' : ''}`}
        ref={decreeRef}
      >
        <span className="wc-pile-back wc-b1" aria-hidden="true" />
        <span className="wc-pile-back wc-b2" aria-hidden="true" />
        <PlayingCard
          key={`${decree.suit}-${decree.rank}`}
          card={decree}
          variant="pile"
          primed={primed}
        />
      </span>
      <span className="wc-trump-mark">
        <SuitMark suit={trumpSuit} className="wc-trump-mark-icon" />
        {SUIT_NAME[trumpSuit]} is trump
      </span>
      <span className="wc-plate-label" ref={drawPileRef}>
        {drawPileCount} in the pile
      </span>
    </div>
  )
}
