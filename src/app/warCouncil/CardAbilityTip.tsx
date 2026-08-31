import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../../warCouncil'
import { RANK_RULE_TEXT, cardTipTitle } from './cardRuleText'
import { useCardTip } from './useCardTip'

interface CardAbilityTipProps {
  readonly card: Card
  /** R4 — a primed card's fuse line, shown beneath the rank rule. `null` on every other card.
   *  Passed rather than derived: this component computes nothing about a card's state. */
  readonly fuseNote?: string | null
  readonly children: ReactNode
}

/**
 * The tap/hover/focus host for a card's rule tooltip (AC8). No `id` prop: the hidden rule span
 * that `aria-describedby` points at lives inside `PlayingCard`'s `<button>`, not here, so the
 * rule is in the accessible tree whether or not this bubble is open — the bubble itself carries
 * no id and is never linked, which is what stops the rule being announced twice.
 *
 * DLR-149 round-3 fix — the docblock this replaced claimed hover and focus were pure CSS
 * (`:hover`, `:focus-within`) and never reached React. That was never true once the bubble is
 * portalled: `createPortal(…, document.body)` makes the bubble a CHILD OF `<body>`, not a
 * descendant of this host, so no descendant selector — hover, focus-within, or an ancestor
 * `.wc-is-open` class — can ever match it. The bubble was correctly wired to only exist in the
 * DOM while tapped-open, which meant hover and focus revealed nothing at all: they had no
 * element to reveal. All three channels now go through `useCardTip`'s React state instead, and
 * the open state is expressed as a class ON THE BUBBLE ITSELF (`wc-is-open`), so the CSS rule
 * that reveals it is a plain single-element selector that actually matches a portalled node.
 * The cost is one render of one card on hover/focus; nothing else on the felt re-renders, there
 * is still no `memo`/`useMemo`/`useCallback`, and the anchor is still measured once per opening
 * (see `useCardTip`), not per frame.
 *
 * `.wc-card:disabled { pointer-events: none }`, so every handler sits on this host `<span>`
 * rather than on the button — a `table`/`pile` card or an illegal hand card would otherwise be
 * unreachable by hover, focus or tap alike, and those are exactly the cards a player most wants
 * to inspect. `onPointerEnter`/`onPointerLeave` gate on `pointerType === 'mouse'` so a touch tap
 * cannot register as a stuck hover a touch device has no way to "leave".
 *
 * The bubble is portalled to `document.body`, and stays portalled now that the fan's per-slot
 * `z-index` is gone. The stronger reason was always the card itself: `.wc-card` declares
 * `container-type: inline-size` (`warCouncilCards.css`, so the printed-name container query can
 * read the card's own width), which applies LAYOUT containment — and a layout-contained element
 * is a containing block for `position: fixed` descendants. A bubble rendered inside the button
 * would therefore resolve its `left`/`top` against the card rather than the viewport, and would
 * be clipped by the felt's own `overflow: hidden` besides. `react-dom` is already a runtime
 * dependency; nothing new is added.
 *
 * `anchor` is the CARD's rect, not this host's — see `useCardTip` for why the difference matters
 * once the card lifts.
 */
export default function CardAbilityTip({ card, fuseNote = null, children }: CardAbilityTipProps) {
  const { open, anchor, hostRef, onClick, onPointerEnter, onPointerLeave, onFocus, onBlur } =
    useCardTip()

  return (
    <span
      className="wc-card-tip-host"
      ref={hostRef}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {children}
      {open &&
        anchor !== null &&
        createPortal(
          <div
            className={open ? 'wc-card-tip wc-is-open' : 'wc-card-tip'}
            role="tooltip"
            style={
              {
                // D-W2 (defender fix-loop) — the anchor's centre travels through a CSS custom
                // property rather than a plain `left` px value, so `warCouncilCardFace.css`'s
                // `clamp()` on `.wc-card-tip`'s `left` is what actually places the bubble (an
                // inline `left` would out-rank any external `left` rule with no `!important`).
                // The outermost cards of a fan sit close enough to the viewport edge that an
                // unclamped centre would render the bubble partly off-screen.
                '--wc-tip-anchor-x': `${anchor.left + anchor.width / 2}px`,
                top: anchor.top,
              } as CSSProperties
            }
          >
            <b>{cardTipTitle(card.rank)}</b>
            {RANK_RULE_TEXT[card.rank]}
            {fuseNote !== null && fuseNote !== undefined && (
              <span className="wc-card-tip-fuse">{fuseNote}</span>
            )}
          </div>,
          document.body,
        )}
    </span>
  )
}
