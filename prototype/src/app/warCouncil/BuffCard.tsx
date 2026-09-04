import type { Ref } from 'react'
import { BuffCadence, BUFF_CADENCE, buffIsWild, buffTargetSuitOf, type BuffId } from '../../hunt'
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
import { WildMark } from './WildMark'
import { SUIT_CLASS, TIER_CLASS, TIER_NUMERAL } from './buffCardVisuals'

interface BuffCardProps {
  readonly stack: BuffStack
  readonly poised: boolean
  readonly tabIndex: number
  readonly onTap: (id: BuffId) => void
  /** QA fix (code-evaluator review, DLR-157) — React 19 accepts `ref` as an ordinary prop on a
   *  function component, no `forwardRef` wrapper needed. Lands on THIS component's own root
   *  element (the `<button>`, or the `.wc-stack` wrapper when `count > 1`) rather than on a
   *  caller-supplied wrapping `<span>` — see the component docblock for why a wrapper breaks the
   *  grid layout. */
  readonly ref?: Ref<HTMLElement>
}

/**
 * One buff, as a metallic card. The `<button>` **is** the grid item — a `<button>` stops
 * stretching the moment it is not a direct grid item, which broke this layout three separate
 * times on the mockup — and it contains **only phrasing content**: `<span>`s throughout, no
 * `<h3>`, no `<p>`. When `stack.count > 1` the button is wrapped in a `<span className="wc-stack">`
 * carrying one or two `<span className="wc-stack-layer">` siblings **before** the button, so the
 * pile's layers sit behind it in DOM order — `warCouncilBuffGallery.css`'s own `isolation` /
 * `z-index` pairing is what keeps them there rather than painting over the card.
 *
 * QA fix (code-evaluator review, DLR-157) — a caller-supplied `ref` (React 19's plain prop, no
 * `forwardRef`) lands on THIS component's own root — the `<button>`, or the `.wc-stack` wrapper
 * when `count > 1` — never on a wrapping `<span>` a caller adds around it. `BuffGallery.tsx`
 * previously wrapped every card in its own anchor span, which made THAT span — not this
 * component's root — the grid's direct child, silently reintroducing the exact stretching defect
 * this docblock's first paragraph describes.
 */
export default function BuffCard({ stack, poised, tabIndex, onTap, ref }: BuffCardProps) {
  const { buff, count, refusal } = stack
  const suit = buffTargetSuitOf(buff)
  // DLR-162 AC9 — a wild card takes the wild mark in the empty suit slot and the wild frame class.
  const wild = buffIsWild(buff)
  const isPress = BUFF_CADENCE[buff.kind] === BuffCadence.Activated
  const cadence = buffCadenceWord(buff)
  const payoff = buffPayoffFace(buff)
  const className = `wc-buffcard ${TIER_CLASS[buff.tier]}${
    wild ? ' wc-buffcard-wild' : suit !== null ? ` ${SUIT_CLASS[suit]}` : ''
  }`
  // `count <= 1` is the common case: the button IS this component's root, so the ref lands there
  // directly. `count > 1` re-parents it onto the `.wc-stack` wrapper below instead.
  const buttonRef = count <= 1 ? (ref as Ref<HTMLButtonElement>) : undefined

  const button = (
    <button
      type="button"
      className={className}
      aria-pressed={poised}
      aria-label={buffCardAccessibleName(stack, poised, refusal)}
      disabled={refusal !== null}
      tabIndex={tabIndex}
      onClick={() => onTap(stack.ids[0])}
      ref={buttonRef}
    >
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
          <span className={`wc-buffcard-cadence${isPress ? ' wc-buffcard-cadence-press' : ''}`}>
            {cadence}
          </span>
          {count > 1 && <span className="wc-buffcard-count">×{count}</span>}
        </span>
        <span className="wc-buffcard-name">{buffName(buff)}</span>
        <span className="wc-buffcard-cond">{buffConditionSentence(buff)}</span>
        <span className="wc-buffcard-payoff">{payoff.gain}</span>
        <span className="wc-buffcard-confirm">
          {isPress ? BUFF_POISED_HINT_PRESS : BUFF_POISED_HINT}
        </span>
      </span>
    </button>
  )

  if (count <= 1) return button

  return (
    <span className={`wc-stack ${TIER_CLASS[buff.tier]}`} ref={ref as Ref<HTMLSpanElement>}>
      {count > 2 && <span className="wc-stack-layer wc-stack-layer-2" aria-hidden="true" />}
      <span className="wc-stack-layer wc-stack-layer-1" aria-hidden="true" />
      {button}
    </span>
  )
}
