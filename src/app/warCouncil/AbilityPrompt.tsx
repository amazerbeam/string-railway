import {
  AbilityChoiceKind,
  CardRank,
  type AbilityChoice,
  type Card,
} from '../../warCouncil'
import { PlaceKind } from './cardPlacement'
import { cardTipTitle } from './cardRuleText'
import { cardAccessibleName, cardKey } from './labels'
import { useMotionAnchor } from './motionAnchorContext'
import PlayingCard from './PlayingCard'
import { useRovingTabIndex } from './useRovingTabIndex'

interface AbilityPromptProps {
  readonly card: Card
  readonly decree: Card
  readonly hand: readonly Card[] // hand minus the armed card
  readonly drawnCard: Card | null // drawPile[0] for Woodcutter, null for Fox
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
  onChoose,
  onCancel,
}: AbilityPromptProps) {
  const isFox = card.rank === CardRank.Fox
  // Shared by both branches and by the hint copy below — AC12's whole point is that this
  // button, unlike "Keep the decree" / discarding, plays nothing at all.
  const cancelLabel = `← Don't play the ${cardTipTitle(card.rank)}`
  // Every offered choice is always a legal one — a Fox may exchange any held card, a
  // Woodcutter may discard any held card or the one just drawn — so nothing here is
  // adjudicating legality; the count alone drives which single item is the tab stop.
  const count = isFox ? hand.length + 1 : (drawnCard ? 1 : 0) + hand.length
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(count, () => true, onCancel)

  // DLR-157 — two places, called unconditionally before either branch below: the row itself
  // (both branches render exactly one `.wc-prompt-row`), and the Woodcutter's drawn-card slot,
  // which only one of the two branches ever renders.
  const rowRef = useMotionAnchor({ kind: PlaceKind.AbilityPrompt })
  const drawnRef = useMotionAnchor({ kind: PlaceKind.AbilityPrompt, slot: 'drawn' })

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
        <div className="wc-prompt-row" ref={rowRef}>
          {hand.map((handCard, index) => (
            <PlayingCard
              key={cardKey(handCard)}
              card={handCard}
              variant="hand"
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
        <p className="wc-table-hint">
          Choose a card, keep the decree, or cancel. <strong>Keep the decree</strong> still plays
          the {cardTipTitle(card.rank)} — <strong>{cancelLabel}</strong> is the only exit that
          doesn't.
        </p>
        {/* AC12 — outside `.wc-prompt-row` and rendered last, so it does NOT join the
            roving-tabindex collection: `useRovingTabIndex.focusIndex` reads
            `groupRef.current.querySelectorAll('button')` over this whole group, not just the
            row, so a button anywhere earlier in DOM order would shift every index after it.
            Placed after every element `count` addresses, this one is simply never reached by
            an arrow-key index — Tab still reaches it, in normal document order, as a distinct
            stop. */}
        <button type="button" className="wc-prompt-cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
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
      <div className="wc-prompt-row" ref={rowRef}>
        {drawnCard && (
          <span className="wc-drawn-wrap" ref={drawnRef}>
            <span className="wc-drawn-tag">Drawn</span>
            <PlayingCard
              card={drawnCard}
              variant="hand"
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
            tabIndex={index + handOffset === tabStopIndex ? 0 : -1}
            onTap={() => onChoose({ kind: AbilityChoiceKind.WoodcutterDiscard, discard: handCard })}
          />
        ))}
      </div>
      <p className="wc-table-hint">Choose one to discard, or cancel to draw nothing.</p>
      {/* AC12 — same placement rationale as the Fox branch above: outside `.wc-prompt-row` and
          rendered last, so it falls outside the roving-tabindex collection's positional index. */}
      <button type="button" className="wc-prompt-cancel" onClick={onCancel}>
        {cancelLabel}
      </button>
    </div>
  )
}
