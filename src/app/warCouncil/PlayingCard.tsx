import { useId, type CSSProperties } from 'react'
import type { Card } from '../../warCouncil'
import CardAbilityTip from './CardAbilityTip'
import { RANK_FACE } from './cardFace'
import CardFace from './CardFacePanel'
import { RANK_RULE_TEXT } from './cardRuleText'
import { cardAccessibleName } from './labels'

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
 * of its own — `style` carries whatever placement the caller has already
 * worked out, and the hand no longer passes one at all now that the fan is
 * a plain gapped row (`HandFan`).
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
  const face = RANK_FACE[card.rank]
  const tipId = useId()
  // DLR-117's `describedBy` used to be passed through as-is, present only when the caller
  // supplied one; the rule span below is now ALWAYS present, so `aria-describedby` is now
  // always non-empty — the caller's id (when present) sits alongside the rule id rather than
  // replacing it.
  const describedByIds = [describedBy, tipId].filter(Boolean).join(' ')

  const className = [
    'wc-card',
    `wc-suit-${card.suit}`,
    `wc-face-${face.faceClass}`,
    face.name !== null && 'wc-is-named',
    variant === 'table' && 'wc-is-played',
    variant === 'pile' && 'wc-is-plate',
    illegal && 'wc-is-illegal',
    armed && 'wc-is-armed',
    winner && 'wc-is-winner',
    discardSelected && 'wc-is-discard-selected',
    skulled && 'wc-is-skulled',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <CardAbilityTip card={card}>
      <button
        type="button"
        className={className}
        style={style}
        disabled={condensed || illegal}
        tabIndex={condensed ? -1 : tabIndex}
        aria-label={cardAccessibleName(card, { skulled, primed })}
        aria-describedby={describedByIds}
        aria-pressed={armed || discardSelected ? true : undefined}
        onClick={() => onTap?.(card)}
      >
        {/* The skull REPLACES the art/pips, not the whole face: CardFace always renders its
            corner index, and `.wc-card.wc-is-skulled` in warCouncilCards.css hides the art
            window and pip lattice, so a skulled card keeps its rank, suit glyph and rank
            name — the trick is still won on those (AC12). */}
        <CardFace card={card} />
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
        {/* AC12 — a skull REPLACES the art; a Timebomb is ADDED. One bone skull on one dark wash,
            identical on every rank and suit. */}
        {skulled && (
          <span className="wc-card-skull-face" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <use href="#wc-skull" />
            </svg>
          </span>
        )}
        {/* AC8 — the rule reaches the accessible tree unconditionally, whether or not the
            tooltip bubble is open. `game-ux` forbids hiding a decision-relevant fact behind
            hover, and touch has no hover at all. */}
        <span id={tipId} className="wc-sr-only">
          {RANK_RULE_TEXT[card.rank]}
        </span>
      </button>
    </CardAbilityTip>
  )
}
