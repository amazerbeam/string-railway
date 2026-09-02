import { buffTargetSuitOf } from '../../hunt'
import { buffConditionSentence, buffName, buffPayoffFace } from '../warCouncil/buffLabels'
import { SuitMark } from '../warCouncil/SuitMark'
import { SUIT_CLASS, TIER_CLASS, TIER_NUMERAL } from '../warCouncil/buffCardVisuals'
import type { HeldBuffStack } from './heldBuffs'
import '../warCouncil/warCouncilBuffCard.css'

/**
 * 2026-09-01 — one held card, as the shop's "What you hold" tray draws it.
 *
 * A `<span>`, NOT a `<button>`, and that is the whole reason this component exists rather than
 * reusing `BuffCard.tsx`: nothing on this screen can activate a buff, and a card rendered as a
 * button is an affordance that lies. It borrows `BuffCard`'s classes and therefore
 * `warCouncilBuffCard.css` wholesale, so the card in the tray is visibly the same object as the
 * card on the felt — which is the point of showing it at all. The player is being told what they
 * will be playing with, in the form they will see it.
 *
 * `warCouncilBuffCard.css` sizes `.wc-buffcard` as a GRID ITEM in the gallery, so it collapses to a
 * zero-width dot in any other container. `shopHeld.css` states the width explicitly for that
 * reason.
 */
export default function HeldBuffCard({ stack }: { readonly stack: HeldBuffStack }) {
  const { buff, count } = stack
  const suit = buffTargetSuitOf(buff)
  const payoff = buffPayoffFace(buff)
  const className = `wc-buffcard ${TIER_CLASS[buff.tier]}${suit !== null ? ` ${SUIT_CLASS[suit]}` : ''}`

  return (
    <li className="shop-held-card">
      <span
        className={className}
        // The pile is described once, in full, on the card itself — the tray has no hover and no
        // tap, so there is nowhere else for this to live.
        aria-label={`${buffName(buff)} — ${buffConditionSentence(buff)}${count > 1 ? `, ${count} held` : ''}`}
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
    </li>
  )
}
