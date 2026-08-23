import type { Card, Suit } from '../../warCouncil'
import { SUIT_NAME } from './labels'
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
  return (
    <div className="wc-pile">
      <span className="wc-plate-label">Decree</span>
      <span className="wc-pile-cards">
        <span className="wc-pile-back wc-b1" aria-hidden="true" />
        <span className="wc-pile-back wc-b2" aria-hidden="true" />
        <PlayingCard key={`${decree.suit}-${decree.rank}`} card={decree} variant="pile" primed={primed} />
      </span>
      <span className="wc-trump-mark">
        <SuitMark suit={trumpSuit} className="wc-trump-mark-icon" />
        {SUIT_NAME[trumpSuit]} is trump
      </span>
      <span className="wc-plate-label">{drawPileCount} in the pile</span>
    </div>
  )
}
