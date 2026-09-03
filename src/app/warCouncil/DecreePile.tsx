import type { Card, Suit } from '../../warCouncil'
import { PlaceKind } from './cardPlacement'
import { cardKey, SUIT_NAME } from './labels'
import { useMotionAnchor, useMotionAnchors } from './motionAnchorContext'
import PlayingCard from './PlayingCard'
import { SuitMark } from './SuitMark'

interface DecreePileProps {
  /** DLR-163 AC2 — `null` once a Fox has replaced the card with a bare suit. `null` does NOT mean
   *  "no trump": `trumpSuit` beside it is always live. */
  readonly decree: Card | null
  readonly trumpSuit: Suit
  readonly drawPileCount: number
}

/**
 * The felt-left pile (AC3): the decree card face-up, two decorative
 * face-down backs stacked behind it, a "<suit> is trump" chip, and the
 * draw-pile count. Lives on the felt rather than in a corner plate because
 * trump is the most-consulted value in a trick-taking game and a corner is
 * where it gets occluded. `decree` and `trumpSuit` are read straight from
 * round state on every render, so a suit named by a Fox — applied by
 * `playCard` before the trick resolves — updates both immediately with no
 * extra wiring.
 *
 * DLR-163 AC2 — `decree` is nullable. `null` means a Fox has replaced the
 * card with a bare suit; the plate then renders a marker in the card's own
 * footprint rather than nothing, so it does not reflow.
 */
export default function DecreePile({ decree, trumpSuit, drawPileCount }: DecreePileProps) {
  // DLR-157 — two distinct places live in this one component: the decree plate (the face-up
  // card) and the draw pile (the count). Two separate anchors, not one for the whole `.wc-pile`.
  //
  // DLR-163 — the DLR-157 carve-out that used to sit here is DELETED rather than silently
  // dropped: it documented the Fox exchange's two-flight commit, where the departing decree
  // showed the wrong face while airborne. No card is ever moved ONTO the decree any more, so
  // that case is unreachable.
  //
  // Both `useMotionAnchor` calls stay UNCONDITIONAL and above the null branch below, per this
  // codebase's hook rules.
  const decreeRef = useMotionAnchor({ kind: PlaceKind.DecreePlate })
  const drawPileRef = useMotionAnchor({ kind: PlaceKind.DrawPile })
  // AC7 — the decree card currently flying INTO the plate renders invisible-but-laid-out until
  // it lands, so the plate does not reflow.
  const { arriving } = useMotionAnchors()
  const inFlight = decree !== null && arriving.has(cardKey(decree))

  return (
    <div className="wc-pile">
      <span className="wc-plate-label">Decree</span>
      <span className={`wc-pile-cards${inFlight ? ' wc-is-in-flight' : ''}`} ref={decreeRef}>
        <span className="wc-pile-back wc-b1" aria-hidden="true" />
        <span className="wc-pile-back wc-b2" aria-hidden="true" />
        {decree === null ? (
          // DLR-163 AC2 — the plate keeps the card's own footprint so the felt does not reflow,
          // and reads as a marker by its DASHED edge, not by colour. `role="img"` with an
          // `aria-label` tells a screen reader what the plate now holds.
          <span
            className="wc-decree-marker"
            role="img"
            aria-label={`Decree replaced — ${SUIT_NAME[trumpSuit]} is trump`}
          >
            <SuitMark suit={trumpSuit} className="wc-decree-marker-icon" />
            <span className="wc-decree-marker-name">{SUIT_NAME[trumpSuit]}</span>
          </span>
        ) : (
          <PlayingCard key={`${decree.suit}-${decree.rank}`} card={decree} variant="pile" />
        )}
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
