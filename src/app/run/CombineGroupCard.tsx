import { buffTargetSuitOf, type Buff } from '../../hunt'
import { buffConditionSentence, buffName, buffPayoffFace } from '../warCouncil/buffLabels'
import { SuitMark } from '../warCouncil/SuitMark'
import { SUIT_CLASS, TIER_CLASS, TIER_NUMERAL } from '../warCouncil/buffCardVisuals'
import type { CombineGroup } from './manageBuffs'
import {
  COMBINE_REFUSAL_MESSAGE,
  MANAGE_BUFFS_CANCEL_LABEL,
  MANAGE_BUFFS_COMMIT_LABEL,
  MANAGE_BUFFS_DESTROY_LABEL,
  MANAGE_BUFFS_JUST_MADE,
  MANAGE_BUFFS_MAKE_LABEL,
  combineConfirmDestroyText,
  combineConfirmMakeText,
  combineCostText,
  combineReadyTileAccessibleName,
  combineRefusedTileAccessibleName,
} from './manageBuffsLabels'
import '../warCouncil/warCouncilBuffCard.css'

export interface CombineGroupCardProps {
  readonly group: CombineGroup
  readonly armed: boolean
  readonly justMade: boolean
  /** Copies held right now — the tile prints `held → held − 1` while armed. */
  readonly held: number
  readonly tabStop: boolean
  readonly onArm: () => void
  readonly onCommit: () => void
  readonly onCancel: () => void
}

/** The card face alone — no `aria-label`, since a ready or refused tile's accessible name is
 *  stated once, on the tile itself, by `combineReadyTileAccessibleName` /
 *  `combineRefusedTileAccessibleName`. Reuses `warCouncilBuffCard.css` wholesale
 *  (`HeldBuffCard.tsx`'s own reasoning) so a pile here is visibly the same object as the card on
 *  the felt. */
function CardFace({ buff, count }: { readonly buff: Buff; readonly count: number }) {
  const suit = buffTargetSuitOf(buff)
  const payoff = buffPayoffFace(buff)
  const className = `wc-buffcard ${TIER_CLASS[buff.tier]}${suit !== null ? ` ${SUIT_CLASS[suit]}` : ''}`

  return (
    <span className={className} aria-hidden="true">
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
  )
}

/**
 * DLR-159 — one pile on the Manage Buffs screen. Three faces, mutually exclusive:
 *
 * - **Refused** (`group.refusal !== null`) — an `<li>`, never a `<button>`: nothing on this tile
 *   can be acted on, and a card rendered as a button that cannot act is an affordance that lies.
 *   The reason is on the tile's face, not behind a hover.
 * - **Ready, unarmed** — a `<button>`, the first of the gesture's two taps. Its own accessible
 *   name states what combining it would produce, in the card's own terms (AC7).
 * - **Ready, armed** — the confirmation lives ON the tile (`game-ux`'s rule against confirming at
 *   a distant control): what is destroyed, what is made, and the pile count dropping by one, with
 *   `Combine` and `Cancel` as the tile's own controls. `Combine` carries `autoFocus` so the second
 *   tap of the gesture lands on a control that already has focus.
 */
export default function CombineGroupCard({
  group,
  armed,
  justMade,
  held,
  tabStop,
  onArm,
  onCommit,
  onCancel,
}: CombineGroupCardProps) {
  const { buff, count, refusal, produces } = group
  const badge = justMade ? <span className="mb-new">{MANAGE_BUFFS_JUST_MADE}</span> : null

  if (refusal !== null) {
    return (
      <li
        className="mb-pile is-refused"
        data-combine-key={group.key}
        tabIndex={-1}
        aria-label={combineRefusedTileAccessibleName(buff, count, refusal)}
      >
        {badge}
        <CardFace buff={buff} count={count} />
        <span className="mb-strip is-refused">{COMBINE_REFUSAL_MESSAGE[refusal]}</span>
      </li>
    )
  }

  // Unreachable once `refusal` is null — `manageBuffsView` only ever pairs a null refusal with a
  // non-null preview. Narrowed explicitly rather than asserted away with `!`.
  if (produces === null) return null

  if (armed) {
    return (
      <div className="mb-pile is-armed">
        <CardFace buff={buff} count={count} />
        <div className="mb-confirm">
          <span className="mb-confirm-lab">{MANAGE_BUFFS_DESTROY_LABEL}</span>
          <span className="mb-confirm-lose">{combineConfirmDestroyText(buff)}</span>
          <span className="mb-confirm-lab">{MANAGE_BUFFS_MAKE_LABEL}</span>
          <span className="mb-confirm-gain">{combineConfirmMakeText(produces)}</span>
          <span className="mb-confirm-cost">{combineCostText(held)}</span>
          <div className="mb-confirm-acts">
            <button type="button" className="mb-go" onClick={onCommit} autoFocus>
              {MANAGE_BUFFS_COMMIT_LABEL}
            </button>
            <button type="button" className="mb-no" onClick={onCancel}>
              {MANAGE_BUFFS_CANCEL_LABEL}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="mb-pile"
      data-combine-key={group.key}
      tabIndex={tabStop ? 0 : -1}
      onClick={onArm}
      aria-label={combineReadyTileAccessibleName(buff, count, produces)}
    >
      {badge}
      <CardFace buff={buff} count={count} />
      <span className="mb-strip is-ready">
        <span className="mb-arrow" aria-hidden="true">
          ⇧
        </span>{' '}
        Combine → {TIER_NUMERAL[produces.tier]}
      </span>
    </button>
  )
}
