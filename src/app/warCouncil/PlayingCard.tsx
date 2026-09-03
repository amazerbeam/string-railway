import { useId, type CSSProperties } from 'react'
import type { Card } from '../../warCouncil'
import { buffBadgeText } from './buffRideLabels'
import CardAbilityTip from './CardAbilityTip'
import CardBuffHalo, { HALO_SATURATION_CEILING } from './CardBuffHalo'
import { RANK_FACE } from './cardFace'
import CardFace from './CardFacePanel'
import { RANK_RULE_TEXT } from './cardRuleText'
import { cardAccessibleName } from './labels'
import './warCouncilBuffRide.css'

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
  /** DLR-100 — a card currently toggled into the open discard selection. Defaults to `false` so
   *  every existing call site keeps compiling; a caller that knows the state passes it. The SAME
   *  rendering path as `skulled` — one more conditional `<span>`, not a second
   *  component. */
  readonly discardSelected?: boolean
  readonly tabIndex?: number
  /** DLR-117 — the id of an element that DESCRIBES this card (the fan's damage strip).
   *  Optional so all 13 other call sites keep compiling; only the fan passes one. Deliberately
   *  a DESCRIPTION rather than part of `cardAccessibleName`: a card's accessible name is its
   *  identity, and folding a derived figure into it would break every `getByRole('button',
   *  { name })` query in the suite and conflate two different claims. */
  readonly describedBy?: string
  /** DLR-153 — how many riding buffs could fire on this card, the higher of its two branches.
   *  `undefined` (the default) means dark: no halo, no cell, no badge. Optional so all 49 other
   *  construction sites keep compiling, the precedent `discardSelected` / `describedBy`
   *  each set. */
  readonly buffCount?: number
  /** DLR-153 — `buffCount` is a CEILING because the Quarry's card is face down. Renders the badge
   *  in the existing `~n` italic estimate form, the same grammar `wc-card-damage.wc-is-estimate`
   *  uses. */
  readonly buffEstimate?: boolean
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
  discardSelected = false,
  tabIndex,
  describedBy,
  buffCount,
  buffEstimate = false,
  style,
  onTap,
}: PlayingCardProps) {
  const condensed = variant === 'table' || variant === 'pile'
  const face = RANK_FACE[card.rank]
  const tipId = useId()
  const litCount = buffCount !== undefined && buffCount > 0 ? buffCount : null
  const lit = litCount !== null
  // DLR-153 — `--energy` (the SAME `Math.min(1, n / 5)` conversion the mockup's `paintOne`
  // makes) is set HERE, on the card element itself, rather than in `CardBuffHalo`'s `<svg>`
  // (a card CHILD). The card's own `box-shadow` glow reads `var(--energy)` and a custom property
  // set on a descendant is invisible to an ancestor's rule — that scope mismatch is what silently
  // discarded the whole `box-shadow` declaration. Setting it once here lets both the box-shadow
  // and the halo's descendant `<rect>` strokes inherit the same value — one owner.
  const cardStyle = lit
    ? ({ ...style, '--energy': Math.min(1, litCount / HALO_SATURATION_CEILING) } as CSSProperties)
    : style
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
    lit && 'wc-card-buff',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <CardAbilityTip card={card}>
      <button
        type="button"
        className={className}
        style={cardStyle}
        disabled={condensed || illegal}
        tabIndex={condensed ? -1 : tabIndex}
        aria-label={cardAccessibleName(card, { skulled })}
        aria-describedby={describedByIds}
        aria-pressed={armed || discardSelected ? true : undefined}
        onClick={() => onTap?.(card)}
      >
        {/* DLR-153 — the halo and travelling cell. `aria-hidden` on its own root: the numeral
            badge below is the accessible carrier for the same fact, so this subtree is
            decorative only. */}
        {litCount !== null && <CardBuffHalo count={litCount} />}
        {/* The skull REPLACES the art/pips, not the whole face: CardFace always renders its
            corner index, and `.wc-card.wc-is-skulled` in warCouncilCards.css hides the art
            window and pip lattice, so a skulled card keeps its rank, suit glyph and rank
            name — the trick is still won on those (AC12). */}
        <CardFace card={card} />
        {discardSelected && (
          <span className="wc-discard-mark" aria-hidden="true">
            ✕
          </span>
        )}
        {/* AC12 — a skull REPLACES the art. One bone skull on one dark wash,
            identical on every rank and suit. */}
        {skulled && (
          <span className="wc-card-skull-face" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <use href="#wc-skull" />
            </svg>
          </span>
        )}
        {/* DLR-153 — the numeral badge, ink on parchment at the card's bottom-right. This is
            the ACCESSIBLE carrier for the buff-ride fact (`CardBuffHalo` above is
            `aria-hidden`), and it is a real text node so it survives a greyscale screenshot
            (AC5). Reuses `wc-card-damage.wc-is-estimate`'s established `~n` italic grammar for
            a count that includes a `mayFire` buff, rather than inventing a second form. */}
        {litCount !== null && (
          <span className={`wc-card-buff-badge${buffEstimate ? ' wc-is-estimate' : ''}`}>
            <span aria-hidden="true">{buffEstimate ? `~${litCount}` : litCount}</span>
            <span className="wc-sr-only">
              {buffBadgeText({ count: litCount, estimate: buffEstimate })}
            </span>
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
