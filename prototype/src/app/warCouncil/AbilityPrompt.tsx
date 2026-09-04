import {
  ALL_SUITS,
  AbilityChoiceKind,
  type AbilityChoice,
  type Card,
  type Suit,
} from '../../warCouncil'
import { PlaceKind } from './cardPlacement'
import { cardTipTitle } from './cardRuleText'
import { SUIT_NAME } from './labels'
import { useMotionAnchor } from './motionAnchorContext'
import { SuitMark } from './SuitMark'
import { useRovingTabIndex } from './useRovingTabIndex'

interface AbilityPromptProps {
  readonly card: Card
  /** DLR-163 AC1 — the suit currently in force. Naming it is a decline, and the prompt marks
   *  the row so the player is not offered a change that does nothing. */
  readonly trumpSuit: Suit
  readonly onChoose: (choice: AbilityChoice) => void
  readonly onCancel: () => void
}

/**
 * DLR-163 AC1 — the Fox's choice, rendered on the felt rather than in a modal so the hand stays
 * visible. It offers THREE SUITS AND A DECLINE and takes nothing: the whole complaint the ticket
 * quotes is that the old rule always cost a card the player wanted, so the hand is no longer part
 * of this prompt at all and the component's `hand`, `decree` and `drawnCard` props are gone with
 * the Woodcutter branch.
 *
 * The component picks nothing itself and adjudicates nothing: the suit already in force is still
 * OFFERED — hiding it would change the control count between hands — and `applyNameTrump` is what
 * makes naming it identical to declining, so the felt and the engine cannot disagree.
 *
 * The four controls are one roving-tabindex collection — `useRovingTabIndex`, the same hook
 * `HandFan` uses — rather than four separate tab stops, per `game-ux`'s hard floor on collections
 * of sibling controls. This component uses no lifecycle effect of any kind.
 */
export default function AbilityPrompt({ card, trumpSuit, onChoose, onCancel }: AbilityPromptProps) {
  // Shared by both the button and the hint copy — this is the one exit that plays nothing at all.
  const cancelLabel = `← Don't play the ${cardTipTitle(card.rank)}`
  // Three suits plus the decline button. Every offered choice is always legal, so nothing here is
  // adjudicating legality; the count alone drives which single control is the tab stop.
  const count = ALL_SUITS.length + 1
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(count, () => true, onCancel)

  // DLR-157 — called unconditionally, before any branch, per this codebase's hook rules.
  const rowRef = useMotionAnchor({ kind: PlaceKind.AbilityPrompt })

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
  // already inside the group.
  function attachGroup(element: HTMLDivElement | null) {
    groupRef.current = element
    if (element && !element.contains(document.activeElement)) {
      element.focus()
    }
  }

  return (
    <div
      ref={attachGroup}
      tabIndex={-1}
      role="group"
      aria-label="Name the new trump suit"
      className="wc-prompt"
      onKeyDown={handleKeyDown}
    >
      <p className="wc-table-line">
        Name a suit. It becomes trump before this trick is decided, and you give up nothing.
      </p>
      <div className="wc-prompt-row" ref={rowRef}>
        {ALL_SUITS.map((suit, index) => {
          const inForce = suit === trumpSuit
          return (
            <button
              key={suit}
              type="button"
              className={`wc-suit-choice wc-suit-choice-${suit}`}
              // DLR-163 AC1 — the already-trump state reads as a dashed edge AND as the words
              // below it, so it survives greyscale and colour-vision differences.
              data-inforce={inForce ? 'true' : 'false'}
              tabIndex={index === tabStopIndex ? 0 : -1}
              onClick={() => onChoose({ kind: AbilityChoiceKind.NameTrump, suit })}
            >
              <SuitMark suit={suit} className="wc-suit-choice-glyph" />
              <span className="wc-suit-choice-name">{SUIT_NAME[suit]}</span>
              {inForce && <small className="wc-suit-choice-note">already trump</small>}
            </button>
          )
        })}
        <button
          type="button"
          className="wc-decline"
          tabIndex={ALL_SUITS.length === tabStopIndex ? 0 : -1}
          onClick={() => onChoose({ kind: AbilityChoiceKind.DeclineTrump })}
        >
          Leave it as it is
        </button>
      </div>
      <p className="wc-table-hint">
        Naming a suit or leaving it alone <strong>both play the {cardTipTitle(card.rank)}</strong> —{' '}
        <strong>{cancelLabel}</strong> is the only exit that doesn't.
      </p>
      {/* Outside `.wc-prompt-row` and rendered last, so it does NOT join the roving-tabindex
          collection: `useRovingTabIndex.focusIndex` reads `groupRef.current.querySelectorAll(
          'button')` over this whole group, not just the row, so a button anywhere earlier in DOM
          order would shift every index after it. Placed after every element `count` addresses,
          this one is simply never reached by an arrow-key index — Tab still reaches it, in normal
          document order, as a distinct stop. */}
      <button type="button" className="wc-prompt-cancel" onClick={onCancel}>
        {cancelLabel}
      </button>
    </div>
  )
}
