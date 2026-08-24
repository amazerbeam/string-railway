import type { CSSProperties } from 'react'
import type { Card } from '../../warCouncil'
import { cardAccessibleName, RANK_NAME } from './labels'
import { SuitMark } from './SuitMark'

interface PlayingCardProps {
  readonly card: Card
  readonly variant: 'hand' | 'table' | 'pile'
  readonly armed?: boolean
  readonly illegal?: boolean
  readonly winner?: boolean
  /** AC3's second half — a card carrying a skull, once it is face up. Defaults to `false` so
   *  every existing call site keeps compiling; a caller that knows the card's skull state (the
   *  hand fan never does — skulls are the Quarry's foreknowledge, not the player's own) passes
   *  it explicitly. */
  readonly skulled?: boolean
  /** DLR-90 AC2 — a card carrying the Timebomb mark. Defaults to `false` so every existing call
   *  site keeps compiling; a caller that knows the card's state passes it. The SAME rendering path
   *  as `skulled` — one more conditional `<span>` in one component, not a second component. */
  readonly primed?: boolean
  /** DLR-100 — a card currently toggled into the open discard selection. Defaults to `false` so
   *  every existing call site keeps compiling; a caller that knows the state passes it. The SAME
   *  rendering path as `skulled`/`primed` — one more conditional `<span>`, not a second
   *  component. */
  readonly discardSelected?: boolean
  readonly tabIndex?: number
  /** DLR-117 — the id of an element that DESCRIBES this card (the fan's damage strip).
   *  Optional so all 13 other call sites keep compiling; only the fan passes one. Deliberately
   *  a DESCRIPTION rather than part of `cardAccessibleName`: a card's accessible name is its
   *  identity, and folding a derived figure into it would break every `getByRole('button',
   *  { name })` query in the suite and conflate two different claims. */
  readonly describedBy?: string
  readonly style?: CSSProperties
  readonly onTap?: (card: Card) => void
}

/**
 * One card, three renderings. `variant` is what keeps "a played card is a
 * record, not a choice" a single prop instead of three near-duplicate
 * components: `table` and `pile` render condensed at `--wc-plate-card-w`
 * and never enter the keyboard path. This component computes no geometry
 * of its own — `style` carries whatever placement the caller (e.g.
 * `fanPlacement`) already worked out.
 */
export default function PlayingCard({
  card,
  variant,
  armed = false,
  illegal = false,
  winner = false,
  skulled = false,
  primed = false,
  discardSelected = false,
  tabIndex,
  describedBy,
  style,
  onTap,
}: PlayingCardProps) {
  const condensed = variant === 'table' || variant === 'pile'
  const hasAbility = Boolean(RANK_NAME[card.rank])

  const className = [
    'wc-card',
    `wc-suit-${card.suit}`,
    variant === 'table' && 'wc-is-played',
    variant === 'pile' && 'wc-is-plate',
    illegal && 'wc-is-illegal',
    armed && 'wc-is-armed',
    winner && 'wc-is-winner',
    discardSelected && 'wc-is-discard-selected',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={className}
      style={style}
      disabled={condensed || illegal}
      tabIndex={condensed ? -1 : tabIndex}
      aria-label={cardAccessibleName(card, { skulled, primed })}
      aria-describedby={describedBy}
      aria-pressed={armed || discardSelected ? true : undefined}
      onClick={() => onTap?.(card)}
    >
      <span className="wc-card-rank" aria-hidden="true">
        {card.rank}
      </span>
      <SuitMark suit={card.suit} className="wc-card-suit" />
      {skulled && (
        <span className="wc-skull-mark" aria-hidden="true">
          ☠
        </span>
      )}
      {primed && (
        <span className="wc-primed-mark" aria-hidden="true">
          ⚗
        </span>
      )}
      {discardSelected && (
        <span className="wc-discard-mark" aria-hidden="true">
          ✕
        </span>
      )}
      <span className={`wc-card-pip${hasAbility ? '' : ' wc-is-blank'}`} aria-hidden="true" />
    </button>
  )
}
