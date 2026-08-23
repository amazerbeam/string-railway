import {
  AbilityChoiceKind,
  CardRank,
  isPrimed,
  type AbilityChoice,
  type Card,
} from '../../warCouncil'
import { cardAccessibleName, cardKey } from './labels'
import PlayingCard from './PlayingCard'
import { useRovingTabIndex } from './useRovingTabIndex'

interface AbilityPromptProps {
  readonly card: Card
  readonly decree: Card
  readonly hand: readonly Card[] // hand minus the armed card
  readonly drawnCard: Card | null // drawPile[0] for Woodcutter, null for Fox
  /** DLR-90 AC2 — a marked card offered as a Fox exchange or Woodcutter discard still announces
   *  its own Timebomb. Defaults to `[]` for `TrickWell`'s `skulledCards`-style reason. */
  readonly primedCards?: readonly Card[]
  readonly onChoose: (choice: AbilityChoice) => void
  readonly onCancel: () => void
}

/**
 * The Fox/Woodcutter choice, rendered on the felt rather than in a modal
 * so the hand stays visible while choosing which card to give away or
 * discard. The component picks nothing itself: a Fox with an empty `hand`
 * renders decline as the only option, exactly what `playCard` accepts when
 * the Fox was the last card held. This component uses no lifecycle effect
 * of any kind.
 *
 * The offered cards (plus, per rank, the decline button or the drawn card)
 * are one roving-tabindex collection — `useRovingTabIndex`, the same hook
 * `HandFan` uses over its own hand — rather than each a separate tab stop:
 * a Fox exchange or a Woodcutter discard against a large hand can offer up
 * to a dozen choices, and `game-ux`'s hard floor is explicit that more than
 * about five sibling controls in the tab order is worse than none.
 */
export default function AbilityPrompt({
  card,
  decree,
  hand,
  drawnCard,
  primedCards = [],
  onChoose,
  onCancel,
}: AbilityPromptProps) {
  const isFox = card.rank === CardRank.Fox
  // Every offered choice is always a legal one — a Fox may exchange any held card, a
  // Woodcutter may discard any held card or the one just drawn — so nothing here is
  // adjudicating legality; the count alone drives which single item is the tab stop.
  const count = isFox ? hand.length + 1 : (drawnCard ? 1 : 0) + hand.length
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(count, () => true, onCancel)

  // Focuses the prompt on mount, so `Escape` works immediately without requiring the
  // player to tab first, while also handing the roving-tabindex hook its container node —
  // imperative ref work at attach time, not a lifecycle effect.
  //
  // Root cause of the keyboard trap this replaces: this callback ref is a new function
  // identity on every render (it is defined inline in the component body), so React
  // detaches and reattaches it — calling it with `null`, then the new function — on every
  // re-render, even though the underlying DOM node hasn't changed. An unconditional
  // `element.focus()` here therefore re-fired on every re-render, including the render an
  // arrow key itself causes, stomping the focus `useRovingTabIndex`'s `focusIndex` had just
  // moved a moment earlier in the same keydown: the tabindex bookkeeping advanced correctly,
  // but real `document.activeElement` snapped straight back to this group container.
  //
  // The fix is the guard below, not a stable ref identity: this project's
  // `react-hooks/refs` lint rule forbids reading a ref's `.current` synchronously during
  // render (the shape a stable-identity fix would need, e.g. `useRef(fn).current`), so the
  // callback stays a plain inline function and instead refuses to steal focus that is
  // already inside the group. That is sufficient because `focusIndex` moves real focus
  // synchronously inside the keydown handler, before React re-renders and this ref
  // reattaches — by the time this callback re-fires, `document.activeElement` is already
  // the newly-focused card, and `element.contains(document.activeElement)` is then `true`.
  function attachGroup(element: HTMLDivElement | null) {
    groupRef.current = element
    if (element && !element.contains(document.activeElement)) {
      element.focus()
    }
  }

  if (isFox) {
    return (
      <div
        ref={attachGroup}
        tabIndex={-1}
        role="group"
        aria-label="Choose what the card does"
        className="wc-prompt"
        onKeyDown={handleKeyDown}
      >
        <p className="wc-table-line">
          Give a card to become the decree, and take {cardAccessibleName(decree)} back. This changes
          trump before the trick resolves.
        </p>
        <div className="wc-prompt-row">
          {hand.map((handCard, index) => (
            <PlayingCard
              key={cardKey(handCard)}
              card={handCard}
              variant="hand"
              primed={isPrimed(primedCards, handCard)}
              tabIndex={index === tabStopIndex ? 0 : -1}
              onTap={() => onChoose({ kind: AbilityChoiceKind.FoxExchange, handCard })}
            />
          ))}
          <button
            type="button"
            className="wc-decline"
            tabIndex={hand.length === tabStopIndex ? 0 : -1}
            onClick={() => onChoose({ kind: AbilityChoiceKind.FoxDecline })}
          >
            Keep the decree
          </button>
        </div>
        <p className="wc-table-hint">Choose one, or decline</p>
      </div>
    )
  }

  const handOffset = drawnCard ? 1 : 0

  return (
    <div
      ref={attachGroup}
      tabIndex={-1}
      role="group"
      aria-label="Choose what the card does"
      className="wc-prompt"
      onKeyDown={handleKeyDown}
    >
      <p className="wc-table-line">
        You drew {drawnCard ? cardAccessibleName(drawnCard) : 'a card'}. Put one card back on the
        pile.
      </p>
      <div className="wc-prompt-row">
        {drawnCard && (
          <span className="wc-drawn-wrap">
            <span className="wc-drawn-tag">Drawn</span>
            <PlayingCard
              card={drawnCard}
              variant="hand"
              primed={isPrimed(primedCards, drawnCard)}
              tabIndex={tabStopIndex === 0 ? 0 : -1}
              onTap={() =>
                onChoose({ kind: AbilityChoiceKind.WoodcutterDiscard, discard: drawnCard })
              }
            />
          </span>
        )}
        {hand.map((handCard, index) => (
          <PlayingCard
            key={cardKey(handCard)}
            card={handCard}
            variant="hand"
            primed={isPrimed(primedCards, handCard)}
            tabIndex={index + handOffset === tabStopIndex ? 0 : -1}
            onTap={() => onChoose({ kind: AbilityChoiceKind.WoodcutterDiscard, discard: handCard })}
          />
        ))}
      </div>
      <p className="wc-table-hint">Choose one to discard</p>
    </div>
  )
}
