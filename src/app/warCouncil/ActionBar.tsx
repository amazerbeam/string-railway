import {
  APPLY_DAMAGE_AP_COST,
  BuffActivationRefusal,
  type ActionPoints,
  type Buff,
  type PendingApplyPayout,
} from '../../hunt'
import type { ApplyDamageRefusal, Card, DiscardRefusal } from '../../warCouncil'
import {
  ACTION_BAR_LABEL,
  APPLY_BUFF_LABEL,
  APPLY_DAMAGE_BAR_LABEL,
  CARDS_LABEL,
  CARDS_NO_SELECTION_HINT,
  SWAP_LABEL,
  applyBuffAccessibleName,
  applyDamageBarAccessibleName,
  cardsAccessibleName,
  queuedPayoutText,
} from './actionBarLabels'
import {
  APPLY_DAMAGE_REFUSAL_MESSAGE,
  cardAccessibleName,
  DISCARD_REFUSAL_MESSAGE,
  discardAccessibleName,
} from './labels'

export interface ActionBarProps {
  readonly apPool: ActionPoints
  readonly offeredBuffs: readonly Buff[]
  readonly loadoutOpen: boolean
  readonly loadoutRefusal: BuffActivationRefusal | null
  readonly armed: Card | null
  readonly cardsEnabled: boolean
  readonly discardsRemaining: number
  readonly discardSelecting: boolean
  readonly discardSelectionSize: number
  readonly discardRefusal: DiscardRefusal | null
  readonly applyCashValue: number
  readonly applyPoised: boolean
  readonly applyRefusal: ApplyDamageRefusal | null
  readonly pendingPayout: PendingApplyPayout | null
  readonly onToggleLoadout: () => void
  readonly onPlayArmed: () => void
  readonly onTapSwap: () => void
  readonly onCancelSwap: () => void
  readonly onTapApplyDamage: () => void
  readonly onCancelApplyDamage: () => void
}

/**
 * DLR-114 AC1 — the felt's one bottom-of-screen action bar, carrying every pre-trick decision:
 * Apply Buff, Cards, Swap, Apply Damage, in that order. ALWAYS MOUNTED for the whole hand (the
 * plan's own default) — nothing here is conditionally unmounted, every button greys with its
 * reason on its own face instead, the same "inert rather than absent" precedent every disabled
 * row in `BuffLoadoutPanel` follows.
 *
 * Four controls sits below `game-ux`'s roving-tabindex threshold of about five, so these are plain
 * tab stops rather than a roving-tabindex group.
 *
 * `onClick` stops propagation, but for this component that stop is DEFENSIVE-ONLY, not
 * load-bearing: `ActionBar` renders as a sibling of `.wc-table` under `.wc-shell` (which itself
 * carries no `onClick`), so a click here can never reach `handleCarryOn` regardless of this
 * stop. It is kept for defence in depth and to stay consistent with its siblings' own stops.
 * `BuffLoadoutPanel`'s identical-looking stop IS load-bearing — that component mounts inside
 * `.wc-table` and really would leak a click through to `handleCarryOn` without it. Do not delete
 * that one on the mistaken belief this bar's stop already covers it.
 *
 * `Escape` cancels whichever of Swap/Apply Damage is mid-poise — both cancel handlers are called
 * unconditionally, exactly as those retired plates' own reducer-level cancel transitions already
 * no-op when there is nothing to cancel.
 */
export default function ActionBar({
  apPool,
  offeredBuffs,
  loadoutOpen,
  loadoutRefusal,
  armed,
  cardsEnabled,
  discardsRemaining,
  discardSelecting,
  discardSelectionSize,
  discardRefusal,
  applyCashValue,
  applyPoised,
  applyRefusal,
  pendingPayout,
  onToggleLoadout,
  onPlayArmed,
  onTapSwap,
  onCancelSwap,
  onTapApplyDamage,
  onCancelApplyDamage,
}: ActionBarProps) {
  // AC2's own default — only the buff window itself disables Apply Buff. An unaffordable pile
  // still opens: the panel is where the player reads what they own and what it costs.
  const applyBuffDisabled = loadoutRefusal === BuffActivationRefusal.WindowClosed
  const cardsDisabled = !cardsEnabled || armed === null
  const swapDisabled = discardRefusal !== null
  const applyDamageDisabled = applyRefusal !== null
  const queued = queuedPayoutText(pendingPayout)

  return (
    <nav
      className="wc-bar"
      role="group"
      aria-label={ACTION_BAR_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        onCancelApplyDamage()
        onCancelSwap()
      }}
    >
      <div className="wc-bar-item">
        <button
          type="button"
          className={`wc-bar-btn${loadoutOpen ? ' is-open' : ''}`}
          aria-pressed={loadoutOpen}
          aria-label={applyBuffAccessibleName(
            apPool,
            offeredBuffs.length,
            loadoutOpen,
            loadoutRefusal !== BuffActivationRefusal.WindowClosed,
          )}
          disabled={applyBuffDisabled}
          onClick={onToggleLoadout}
        >
          <span className="wc-bar-btn-label" aria-hidden="true">
            {APPLY_BUFF_LABEL}
          </span>
          <span className="wc-bar-btn-figure" aria-hidden="true">
            {apPool} AP · {offeredBuffs.length} held
          </span>
        </button>
      </div>

      <div className="wc-bar-item">
        <button
          type="button"
          className={`wc-bar-btn${armed !== null ? ' is-armed' : ''}`}
          aria-pressed={armed !== null}
          aria-label={cardsAccessibleName(armed)}
          disabled={cardsDisabled}
          onClick={onPlayArmed}
        >
          <span className="wc-bar-btn-label" aria-hidden="true">
            {CARDS_LABEL}
          </span>
          <span className="wc-bar-btn-figure" aria-hidden="true">
            {armed === null ? CARDS_NO_SELECTION_HINT : cardAccessibleName(armed)}
          </span>
        </button>
      </div>

      <div className="wc-bar-item">
        <button
          type="button"
          className={`wc-bar-btn${discardSelecting ? ' is-selecting' : ''}`}
          aria-pressed={discardSelecting}
          aria-label={discardAccessibleName(
            discardsRemaining,
            discardSelecting,
            discardSelectionSize,
            discardRefusal,
          )}
          disabled={swapDisabled}
          onClick={onTapSwap}
        >
          <span className="wc-bar-btn-label" aria-hidden="true">
            {SWAP_LABEL}
          </span>
          <span className="wc-bar-btn-figure" aria-hidden="true">
            {discardsRemaining} left
          </span>
        </button>
        {discardRefusal !== null && (
          <p className="wc-bar-refusal">{DISCARD_REFUSAL_MESSAGE[discardRefusal]}</p>
        )}
      </div>

      <div className="wc-bar-item">
        <button
          type="button"
          className={`wc-bar-btn${applyPoised ? ' is-poised' : ''}`}
          aria-pressed={applyPoised}
          aria-label={applyDamageBarAccessibleName(
            applyCashValue,
            APPLY_DAMAGE_AP_COST,
            applyPoised,
            applyRefusal,
            pendingPayout,
          )}
          disabled={applyDamageDisabled}
          onClick={onTapApplyDamage}
        >
          <span className="wc-bar-btn-label" aria-hidden="true">
            {APPLY_DAMAGE_BAR_LABEL}
          </span>
          <span className="wc-bar-btn-figure" aria-hidden="true">
            {applyCashValue} for {APPLY_DAMAGE_AP_COST} AP
          </span>
        </button>
        {queued !== null && <p className="wc-bar-queued">{queued}</p>}
        {applyRefusal !== null && (
          <p className="wc-bar-refusal">{APPLY_DAMAGE_REFUSAL_MESSAGE[applyRefusal]}</p>
        )}
      </div>
    </nav>
  )
}
