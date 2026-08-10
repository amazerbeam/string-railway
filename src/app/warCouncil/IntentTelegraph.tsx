import type { QuarryIntent } from '../../warCouncil'
import { intentAccessibleName, STANCE_PHRASE, SUIT_NAME } from './labels'
import { SuitMark } from './SuitMark'

interface IntentTelegraphProps {
  readonly intent: QuarryIntent | null
  /** True when derived from a card the player has armed but not committed. */
  readonly speculative: boolean
}

/**
 * §4's telegraphed intent (AC3). Renders suit and stance only — never the card — so the
 * hidden-hand row of §4's visibility table is never violated. Computes nothing: the intent
 * arrives already derived, and the fidelity that decided whether `stance` is present at all
 * is `TELEGRAPH_FIDELITY`'s, not this component's.
 *
 * `role="status"` announces a changed intent without stealing focus from the hand.
 */
export default function IntentTelegraph({ intent, speculative }: IntentTelegraphProps) {
  const className = [
    'wc-telegraph',
    speculative && 'wc-is-speculative',
    intent === null && 'wc-telegraph-empty',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} role="status" aria-label={intentAccessibleName(intent, speculative)}>
      <span className="wc-telegraph-eyebrow" aria-hidden="true">
        {speculative ? 'If you lead that' : 'Their intent'}
      </span>
      <p className="wc-telegraph-line" aria-hidden="true">
        {intent === null ? (
          speculative ? (
            'Nothing to read from that lead.'
          ) : (
            'Waiting on your lead.'
          )
        ) : (
          <>
            <SuitMark suit={intent.suit} className="wc-telegraph-mark" />
            They will {intent.stance === undefined ? 'play' : STANCE_PHRASE[intent.stance]}{' '}
            {SUIT_NAME[intent.suit]}.
          </>
        )}
      </p>
    </div>
  )
}
