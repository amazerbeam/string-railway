import CardFace from './ManageBuffsCardFace'
import type { WildTargetTile } from './manageBuffs'
import {
  MANAGE_BUFFS_CANCEL_LABEL,
  MANAGE_BUFFS_MAKE_LABEL,
  MANAGE_BUFFS_DESTROY_LABEL,
  MANAGE_BUFFS_WILD_COMMIT_LABEL,
  WILD_REFUSAL_MESSAGE,
  combineCostText,
  wildConfirmDestroyText,
  wildConfirmMakeText,
  wildTargetTileAccessibleName,
} from './manageBuffsLabels'
import type { BuffTier } from '../../hunt'
import '../warCouncil/warCouncilBuffCard.css'

export interface WildTargetCardProps {
  readonly tile: WildTargetTile
  readonly armed: boolean
  /** The tier of the wildcard that would be spent — the confirm face names it. */
  readonly wildcardTier: BuffTier
  /** Copies held right now — the tile prints `held → held − 1` while armed. */
  readonly held: number
  readonly tabStop: boolean
  readonly onArm: () => void
  readonly onCommit: () => void
  readonly onCancel: () => void
}

/**
 * DLR-162 — one tile in the wildcard's target grid. Three faces, mutually exclusive, exactly as
 * `CombineGroupCard.tsx` establishes them:
 *
 * - **Refused** (`tile.refusal !== null`) — an `<li>`, never a `<button>`: nothing here can be
 *   acted on, and a card rendered as a button that cannot act is an affordance that lies. Every
 *   refused target is SHOWN rather than hidden, with its reason on the face, because a player who
 *   owns four Sidesteps needs to see why none of them can be targeted (AC5).
 * - **Selectable, unarmed** — a `<button>`, the first of the gesture's two taps. Its accessible
 *   name states what the card would become.
 * - **Armed** — the confirmation lives ON the tile: what is destroyed (one wildcard), what is made
 *   (the same card, wild), and the pile count dropping by one. `Make wild` carries `autoFocus` so
 *   the second tap lands on a control that already has focus.
 */
export default function WildTargetCard({
  tile,
  armed,
  wildcardTier,
  held,
  tabStop,
  onArm,
  onCommit,
  onCancel,
}: WildTargetCardProps) {
  const { buff, count, refusal, produces } = tile

  if (refusal !== null || produces === null) {
    return (
      <li
        className="mb-pile is-refused"
        data-wild-key={tile.key}
        tabIndex={-1}
        aria-label={wildTargetTileAccessibleName(buff, count, produces, refusal)}
      >
        <CardFace buff={buff} count={count} />
        <span className="mb-strip is-refused">
          {refusal === null ? '' : WILD_REFUSAL_MESSAGE[refusal]}
        </span>
      </li>
    )
  }

  if (armed) {
    return (
      <div className="mb-pile is-armed">
        <CardFace buff={buff} count={count} />
        <div className="mb-confirm">
          <span className="mb-confirm-lab">{MANAGE_BUFFS_DESTROY_LABEL}</span>
          <span className="mb-confirm-lose">{wildConfirmDestroyText(wildcardTier)}</span>
          <span className="mb-confirm-lab">{MANAGE_BUFFS_MAKE_LABEL}</span>
          <span className="mb-confirm-gain">{wildConfirmMakeText(produces)}</span>
          <span className="mb-confirm-cost">{combineCostText(held)}</span>
          <div className="mb-confirm-acts">
            <button type="button" className="mb-go" onClick={onCommit} autoFocus>
              {MANAGE_BUFFS_WILD_COMMIT_LABEL}
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
      data-wild-key={tile.key}
      tabIndex={tabStop ? 0 : -1}
      onClick={onArm}
      aria-label={wildTargetTileAccessibleName(buff, count, produces, null)}
    >
      <CardFace buff={buff} count={count} />
      <span className="mb-strip is-ready">
        <span className="mb-arrow" aria-hidden="true">
          ✳
        </span>{' '}
        {MANAGE_BUFFS_WILD_COMMIT_LABEL}
      </span>
    </button>
  )
}
