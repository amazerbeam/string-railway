import { BuffActivationRefusal, type Buff } from '../../hunt'
import type { Card, DiscardRefusal } from '../../warCouncil'
import {
  ACTION_BAR_LABEL,
  APPLY_BUFF_LABEL,
  CARDS_LABEL,
  CARDS_NO_SELECTION_HINT,
  SWAP_LABEL,
  applyBuffAccessibleName,
  cardsAccessibleName,
} from './actionBarLabels'
import { cardAccessibleName, DISCARD_REFUSAL_MESSAGE, discardAccessibleName } from './labels'

export interface ActionBarProps {
  readonly offeredBuffs: readonly Buff[]
  readonly loadoutOpen: boolean
  readonly loadoutRefusal: BuffActivationRefusal | null
  readonly armed: Card | null
  readonly cardsEnabled: boolean
  readonly discardsRemaining: number
  readonly discardSelecting: boolean
  readonly discardSelectionSize: number
  readonly discardRefusal: DiscardRefusal | null
  readonly onToggleLoadout: () => void
  readonly onPlayArmed: () => void
  readonly onTapSwap: () => void
  readonly onCancelSwap: () => void
}

/**
 * DLR-114 AC1 — the felt's one bottom-of-screen action bar, carrying every pre-trick decision:
 * Apply Buff, Cards, Swap, in that order. ALWAYS MOUNTED for the whole hand (the plan's own
 * default) — nothing here is conditionally unmounted, every button greys with its reason on its
 * own face instead, the same "inert rather than absent" precedent every disabled card in
 * `BuffGallery` follows.
 *
 * DLR-156 Phase 4 — the Apply Damage plate is GONE. The pot's cash-or-roll choice moved off this
 * bar entirely, onto the resolution screen Phase 5 builds; there is nothing left here for it to
 * gate.
 *
 * Three controls sits below `game-ux`'s roving-tabindex threshold of about five, so these are plain
 * tab stops rather than a roving-tabindex group.
 *
 * `onClick` stops propagation, but for this component that stop is DEFENSIVE-ONLY, not
 * load-bearing: `ActionBar` renders as a sibling of `.wc-table` under `.wc-shell` (which itself
 * carries no `onClick`), so a click here can never reach `handleCarryOn` regardless of this
 * stop. It is kept for defence in depth and to stay consistent with its siblings' own stops.
 * `BuffGallery`'s identical-looking stop IS load-bearing — that component mounts inside
 * `.wc-table` and really would leak a click through to `handleCarryOn` without it. Do not delete
 * that one on the mistaken belief this bar's stop already covers it.
 *
 * `Escape` cancels a mid-poise Swap. `onCancelSwap` is called unconditionally, exactly as that
 * plate's own reducer-level cancel transition already no-ops when there is nothing to cancel.
 */
export default function ActionBar({
  offeredBuffs,
  loadoutOpen,
  loadoutRefusal,
  armed,
  cardsEnabled,
  discardsRemaining,
  discardSelecting,
  discardSelectionSize,
  discardRefusal,
  onToggleLoadout,
  onPlayArmed,
  onTapSwap,
  onCancelSwap,
}: ActionBarProps) {
  // AC2's own default — only the buff window itself disables Apply Buff. An unaffordable pile
  // still opens: the panel is where the player reads what they own and what it costs.
  const applyBuffDisabled = loadoutRefusal === BuffActivationRefusal.WindowClosed
  const cardsDisabled = !cardsEnabled || armed === null
  const swapDisabled = discardRefusal !== null

  return (
    <nav
      className="wc-bar"
      role="group"
      aria-label={ACTION_BAR_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        onCancelSwap()
      }}
    >
      <div className="wc-bar-item">
        <button
          type="button"
          className={`wc-bar-btn${loadoutOpen ? ' is-open' : ''}`}
          aria-pressed={loadoutOpen}
          aria-label={applyBuffAccessibleName(
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
            {offeredBuffs.length} held
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
    </nav>
  )
}
