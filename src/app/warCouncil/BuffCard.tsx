import {
  BuffCadence,
  BUFF_CADENCE,
  BuffTargetSuit,
  BuffTier,
  buffTargetSuitOf,
  type BuffId,
} from '../../hunt'
import {
  buffCadenceWord,
  buffCardAccessibleName,
  buffConditionSentence,
  buffName,
  buffPayoffFace,
  BUFF_POISED_HINT,
  BUFF_POISED_HINT_PRESS,
} from './buffLabels'
import type { BuffStack } from './buffGalleryModel'
import { SuitMark } from './SuitMark'

interface BuffCardProps {
  readonly stack: BuffStack
  readonly poised: boolean
  readonly tabIndex: number
  readonly onTap: (id: BuffId) => void
}

/** AC2 — tier is legible as a ROMAN NUMERAL, independent of colour: a metallic gradient reads as
 *  light-and-dark in greyscale, never as bronze/silver/gold. The tier WORD is deliberately not
 *  rendered here — it is what pushed the condition into the payoff bar on the mockup — so this
 *  numeral, the metal and the tinted face are the only carriers. */
const TIER_NUMERAL: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'I',
  [BuffTier.Silver]: 'II',
  [BuffTier.Gold]: 'III',
}

const TIER_CLASS: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'wc-buffcard-bronze',
  [BuffTier.Silver]: 'wc-buffcard-silver',
  [BuffTier.Gold]: 'wc-buffcard-gold',
}

const SUIT_CLASS: Readonly<Record<BuffTargetSuit, string>> = {
  [BuffTargetSuit.Bells]: 'wc-buffcard-bells',
  [BuffTargetSuit.Keys]: 'wc-buffcard-keys',
  [BuffTargetSuit.Moons]: 'wc-buffcard-moons',
}

/**
 * One buff, as a metallic card. The `<button>` **is** the grid item — a `<button>` stops
 * stretching the moment it is not a direct grid item, which broke this layout three separate
 * times on the mockup — and it contains **only phrasing content**: `<span>`s throughout, no
 * `<h3>`, no `<p>`. When `stack.count > 1` the button is wrapped in a `<span className="wc-stack">`
 * carrying one or two `<span className="wc-stack-layer">` siblings **before** the button, so the
 * pile's layers sit behind it in DOM order — `warCouncilBuffGallery.css`'s own `isolation` /
 * `z-index` pairing is what keeps them there rather than painting over the card.
 */
export default function BuffCard({ stack, poised, tabIndex, onTap }: BuffCardProps) {
  const { buff, count, refusal } = stack
  const suit = buffTargetSuitOf(buff)
  const isPress = BUFF_CADENCE[buff.kind] === BuffCadence.Activated
  const cadence = buffCadenceWord(buff)
  const payoff = buffPayoffFace(buff)
  const className = `wc-buffcard ${TIER_CLASS[buff.tier]}${suit !== null ? ` ${SUIT_CLASS[suit]}` : ''}`

  const button = (
    <button
      type="button"
      className={className}
      aria-pressed={poised}
      aria-label={buffCardAccessibleName(stack, poised, refusal)}
      disabled={refusal !== null}
      tabIndex={tabIndex}
      onClick={() => onTap(stack.ids[0])}
    >
      <span className="wc-buffcard-sheen" aria-hidden="true" />
      <span className="wc-buffcard-face" aria-hidden="true">
        <span className="wc-buffcard-top">
          {suit !== null ? (
            <span className="wc-buffcard-suit">
              <SuitMark suit={suit} />
            </span>
          ) : (
            <span className="wc-buffcard-suit wc-buffcard-suit-none" />
          )}
          <span className="wc-buffcard-tier">{TIER_NUMERAL[buff.tier]}</span>
          <span className={`wc-buffcard-cadence${isPress ? ' wc-buffcard-cadence-press' : ''}`}>
            {cadence}
          </span>
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
        <span className="wc-buffcard-confirm">
          {isPress ? BUFF_POISED_HINT_PRESS : BUFF_POISED_HINT}
        </span>
      </span>
    </button>
  )

  if (count <= 1) return button

  return (
    <span className={`wc-stack ${TIER_CLASS[buff.tier]}`}>
      {count > 2 && <span className="wc-stack-layer wc-stack-layer-2" aria-hidden="true" />}
      <span className="wc-stack-layer wc-stack-layer-1" aria-hidden="true" />
      {button}
    </span>
  )
}
