import { buffIsWild, buffTargetSuitOf, type Buff } from '../../hunt'
import { buffConditionSentence, buffName, buffPayoffFace } from '../warCouncil/buffLabels'
import { SuitMark } from '../warCouncil/SuitMark'
import { WildMark } from '../warCouncil/WildMark'
import { SUIT_CLASS, TIER_CLASS, TIER_NUMERAL } from '../warCouncil/buffCardVisuals'
import '../warCouncil/warCouncilBuffCard.css'

/**
 * The card face alone — no `aria-label`, since a tile's accessible name is stated once, on the tile
 * itself. Reuses `warCouncilBuffCard.css` wholesale (`HeldBuffCard.tsx`'s own reasoning) so a pile
 * here is visibly the same object as the card on the felt.
 *
 * DLR-162 — EXTRACTED verbatim from `CombineGroupCard.tsx`'s local `CardFace` once the wildcard's
 * target grid (`WildTargetCard.tsx`) made the duplication real, the same reasoning
 * `buffCardVisuals.ts` records for its own extraction. The only change in the move is the wild
 * branch of the suit slot (AC9).
 */
export default function ManageBuffsCardFace({
  buff,
  count,
}: {
  readonly buff: Buff
  readonly count: number
}) {
  const suit = buffTargetSuitOf(buff)
  const wild = buffIsWild(buff)
  const payoff = buffPayoffFace(buff)
  const className = `wc-buffcard ${TIER_CLASS[buff.tier]}${
    wild ? ' wc-buffcard-wild' : suit !== null ? ` ${SUIT_CLASS[suit]}` : ''
  }`

  return (
    <span className={className} aria-hidden="true">
      <span className="wc-buffcard-sheen" aria-hidden="true" />
      <span className="wc-buffcard-face" aria-hidden="true">
        <span className="wc-buffcard-top">
          {wild ? (
            <span className="wc-buffcard-suit wc-buffcard-wild-mark">
              <WildMark />
            </span>
          ) : suit !== null ? (
            <span className="wc-buffcard-suit">
              <SuitMark suit={suit} />
            </span>
          ) : (
            <span className="wc-buffcard-suit wc-buffcard-suit-none" />
          )}
          <span className="wc-buffcard-tier">{TIER_NUMERAL[buff.tier]}</span>
          {count > 1 && <span className="wc-buffcard-count">×{count}</span>}
        </span>
        <span className="wc-buffcard-name">{buffName(buff)}</span>
        <span className="wc-buffcard-cond">{buffConditionSentence(buff)}</span>
        {payoff.risk === null ? (
          <span className="wc-buffcard-payoff">{payoff.gain}</span>
        ) : (
          <span className="wc-buffcard-payoff wc-buffcard-payoff-split">
            <span className="wc-buffcard-payoff-gain">{payoff.gain}</span>
            <span className="wc-buffcard-payoff-risk">{payoff.risk}</span>
          </span>
        )}
      </span>
    </span>
  )
}
