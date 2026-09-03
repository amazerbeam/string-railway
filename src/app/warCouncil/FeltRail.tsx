import {
  isSkulled,
  PlayerSide,
  type Card,
  type Suit,
  type TrickCard,
} from '../../warCouncil'
import DecreePile from './DecreePile'
import DiscardPile from './DiscardPile'
import PlayingCard from './PlayingCard'
import TrickConsequence from './TrickConsequence'
import type { TrickConsequenceView } from './trickConsequenceModel'

// Copy, not an engine string leaking into the UI — mirrors `TrickWell.tsx`'s own SIDE_LABEL.
const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'You',
  [PlayerSide.Cpu]: 'Them',
}

export interface FeltRailProps {
  readonly decree: Card
  readonly trumpSuit: Suit
  readonly drawPileCount: number
  readonly spentCount: number
  readonly reshuffled: boolean
  /** The condensed trick strip — rendered only while the gallery holds the stage. `null` while the
   *  stage's own `TrickWell` is showing the cards instead, so the trick's cards render in exactly
   *  one place at a time. */
  readonly trick: readonly TrickCard[] | null
  readonly skulledCards: readonly Card[]
  /** Renders in BOTH felt states — under the trick well it would vanish at the exact moment the
   *  player is choosing a buff, which is when the consequence matters most. */
  readonly consequence: TrickConsequenceView | null
}

/**
 * DLR-148 Phase 5 — the felt's left game rail: decree, the trick (condensed, only while the gallery
 * holds the stage) and its consequence readout, and the spent pile. ALWAYS mounted, and a grid
 * COLUMN of `.wc-table` rather than a layer stacked over the stage — AC1 ("opening the buff surface
 * never occludes the decree, the spent pile, or the Quarry's played card") is a structural
 * guarantee here, not a z-index: nothing the stage renders can cover a sibling grid column.
 */
export default function FeltRail({
  decree,
  trumpSuit,
  drawPileCount,
  spentCount,
  reshuffled,
  trick,
  skulledCards,
  consequence,
}: FeltRailProps) {
  return (
    <div className="wc-felt-rail">
      <DecreePile
        decree={decree}
        trumpSuit={trumpSuit}
        drawPileCount={drawPileCount}
      />
      <hr className="wc-rail-rule" aria-hidden="true" />
      <div className="wc-rail-trick">
        {trick !== null && (
          <div className="wc-rail-trick-strip">
            {trick.map((played) => (
              <span key={`${played.card.suit}-${played.card.rank}`} className="wc-rail-trick-card">
                <span className="wc-rail-trick-side">{SIDE_LABEL[played.side]}</span>
                <PlayingCard
                  card={played.card}
                  variant="pile"
                  skulled={isSkulled(skulledCards, played.card)}
                />
              </span>
            ))}
          </div>
        )}
        <TrickConsequence view={consequence} />
      </div>
      <hr className="wc-rail-rule" aria-hidden="true" />
      <DiscardPile spentCount={spentCount} reshuffled={reshuffled} />
    </div>
  )
}
