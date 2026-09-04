import type { Card } from '../../warCouncil'
import { PIP_LAYOUT, RANK_FACE, RankFaceClass, pipIsInverted } from './cardFace'
import { NO_RULE_MARK_LABEL } from './cardRuleText'
import { SuitMark } from './SuitMark'
import { SUIT_SYMBOL_ID } from './suitSymbolIds'

interface CardFaceProps {
  readonly card: Card
}

/**
 * The rendered card face: a corner index, an art window or a pip lattice, and the "no rule"
 * mark. Every fact is derived from `card.rank` and `card.suit` through `RANK_FACE` and
 * `PIP_LAYOUT` — no prop beyond `card`, which is what keeps `PlayingCardProps` unchanged and
 * every call site untouched. The whole subtree is `aria-hidden`: the card's accessible name
 * and its `aria-describedby` carry everything a screen reader needs (AC8).
 *
 * FILE NAME NOTE: the contract names this file `CardFace.tsx`. It is `CardFacePanel.tsx` here
 * because `cardFace.ts` (the pure geometry module, Phase 1) already exists in this directory —
 * on a case-insensitive filesystem (this box is Windows), `CardFace.tsx` and `cardFace.ts`
 * collide and `tsc` fails outright with TS1149 ("differs ... only in casing"), independent of
 * how either is imported. Renaming the brand-new component (one consumer so far) is the
 * contained fix; renaming the established pure module would touch every phase that imports it,
 * including phases not yet run. The exported component is still named `CardFace`.
 */
export default function CardFace({ card }: CardFaceProps) {
  const face = RANK_FACE[card.rank]
  const figureKey =
    face.figure === null
      ? null
      : typeof face.figure === 'string'
        ? face.figure
        : face.figure[card.suit]

  return (
    <span aria-hidden="true">
      <CardCorner card={card} mirrored={false} />
      {figureKey !== null ? (
        <span className="wc-card-art">
          <span className="wc-card-art-wash" />
          <span className="wc-card-art-glow" />
          <span className="wc-card-art-figure">
            <svg viewBox="0 0 100 100">
              <use href={`#wc-fig-${figureKey}`} />
            </svg>
          </span>
          <span className="wc-card-art-vig" />
        </span>
      ) : (
        <span className="wc-card-pips">
          {PIP_LAYOUT[card.rank].map((spot) => (
            <svg
              key={`${spot.row}-${spot.column}`}
              className={pipIsInverted(spot) ? 'wc-card-pip wc-is-inverted' : 'wc-card-pip'}
              style={{ gridRow: spot.row, gridColumn: spot.column }}
            >
              <use href={`#${SUIT_SYMBOL_ID[card.suit]}`} />
            </svg>
          ))}
        </span>
      )}
      {face.faceClass === RankFaceClass.Inert && (
        <span className="wc-card-no-rule">{NO_RULE_MARK_LABEL}</span>
      )}
      {/* AC6 — the mirrored bottom-right index prints only where nothing else is printed there. */}
      {face.faceClass === RankFaceClass.Plain && <CardCorner card={card} mirrored />}
    </span>
  )
}

function CardCorner({ card, mirrored }: { readonly card: Card; readonly mirrored: boolean }) {
  const face = RANK_FACE[card.rank]
  return (
    <span className={mirrored ? 'wc-card-corner wc-is-mirrored' : 'wc-card-corner'}>
      <span className="wc-card-rank">{card.rank}</span>
      {face.name !== null && <span className="wc-card-name">{face.name}</span>}
      <SuitMark suit={card.suit} className="wc-card-suit" />
    </span>
  )
}
