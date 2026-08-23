import { useState } from 'react'
import {
  flaskHealAmount,
  SHOP_ITEMS_BY_CATEGORY,
  ShopCategory,
  ShopItem,
  UNCATEGORISED_SHOP_ITEMS,
  type Coins,
  type FlaskRefusal,
  type Health,
  type PurchaseRefusal,
} from '../../hunt'
import {
  flaskAccessibleName,
  flaskBlurbText,
  flaskChargesText,
  FLASK_REFUSAL_MESSAGE,
  nextOpponentText,
  priceText,
  PURCHASE_REFUSAL_MESSAGE,
  SHOP_ASIDE_LABEL,
  SHOP_CATEGORY_EMPTY,
  SHOP_COINS_LABEL,
  SHOP_TIMEBOMB_LABEL,
  SHOP_FLASK_FREE_TAG,
  SHOP_FLASK_GROUP_LABEL,
  SHOP_FLASK_LABEL,
  SHOP_FLASK_NO_COIN,
  SHOP_GUARD_HELD,
  SHOP_GUARD_LABEL,
  SHOP_GUARD_NONE,
  SHOP_HEALTH_LABEL,
  SHOP_ITEM_BLURB,
  SHOP_ITEM_NAME,
  SHOP_NOTHING_TO_BUY_HINT,
  SHOP_PURSE_GROUP_LABEL,
  SHOP_SLOTS_LABEL,
  SHOP_TITLE,
  SHOP_WHETSTONE_LABEL,
  shopItemAccessibleName,
  shopPanelId,
  shopTabId,
} from './shopLabels'
import { fightLabel, NEXT_FIGHT_LABEL } from './runLabels'
import ShopCategoryTabs from './ShopCategoryTabs'
import { FlaskMark, FlaskSymbolSheet } from './FlaskMark'
import { HeartMark, HeartSymbolSheet } from '../warCouncil/HeartMark'
import { HeartState } from '../warCouncil/duelHealthBars'
import './run.css'
import './shop.css'
import './shopItems.css'
import './shopFlask.css'

interface ShopPanelProps {
  readonly coins: Coins
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
  /** One entry per point of maximum health, derived by the driver from the SAME
   *  `duelHealthBars` the felt reads — never re-derived here, so the shop's row and the fight's
   *  row cannot disagree. Between fights nothing is pending, so every entry is whole or broken. */
  readonly playerHearts: readonly HeartState[]
  readonly cheatCount: number
  readonly cheatSlotCount: number
  /** DLR-90 AC2 — charges held, so the player can see what they already own before buying another.
   *  A count with no denominator, unlike `cheatCount` / `cheatSlotCount`: there is no cap. */
  readonly timebombCharges: number
  /** DLR-91 AC3 — whether a Guard is already held. A boolean, not a count like `timebombCharges`:
   *  only one can be active at a time, which is what the refusal enforces. */
  readonly blastGuardHeld: boolean
  /** DLR-92 AC2 — Whetstones owned, so the player can see what they already hold before buying
   *  another. A count with no denominator, exactly as `timebombCharges`: there is no cap. */
  readonly whetstones: number
  /** DLR-93 AC1 — charges held, so the refusal at zero has a visible cause without hover. A count
   *  with no denominator, exactly as `timebombCharges`: the epic defers raising the ceiling. */
  readonly flaskCharges: number
  /** Derived by the driver from `flaskRefusalFor` — never re-derived here, exactly as `refusals`.
   *  `null` means the flask can be drunk. */
  readonly flaskRefusal: FlaskRefusal | null
  readonly onDrinkFlask: () => void
  /** AC10 — the coming opponent's display name, `undefined` while the roster has no entry.
   *  Also names the leave control (AC8, DLR-85): `Fight <name>` when known, `NEXT_FIGHT_LABEL`
   *  otherwise. */
  readonly nextOpponentName: string | undefined
  /** AC10 — the run's position, ALREADY WORDED by `runProgressText`. */
  readonly progressText: string
  /** One entry per `SHOP_ITEMS` member, derived by the driver from `refusalFor` — never
   *  re-derived here. `null` means the purchase is available. */
  readonly refusals: Readonly<Record<ShopItem, PurchaseRefusal | null>>
  readonly onBuy: (item: ShopItem) => void
  readonly onLeave: () => void
}

/**
 * The shop screen (DLR-84, ladder rebuilt on DLR-89): a full-viewport surface reached from the
 * run verdict, selling a Cheat into a free slot or a heal, each priced from configuration and
 * each refusable with a stated reason on the face of its own card.
 *
 * Computes NOTHING — a `RunOutcomePanel` clone in discipline. Every figure, every refusal, and
 * the opponent's name arrive as props; this component maps `SHOP_ITEMS_BY_CATEGORY` for whichever
 * rung is open plus `UNCATEGORISED_SHOP_ITEMS` outside the tabs, and fires the two callbacks it
 * is given. Layout follows this contract's `mockup.html`, screen B.
 *
 * The category tablist (`ShopCategoryTabs`) is one tab stop for the whole widget, with arrow
 * keys moving inside it per `game-ux`'s roving-tabindex floor. `Escape` is still handled here,
 * and here only — the tablist's own `onCancel` is a deliberate no-op, so leaving for the next
 * fight fires exactly once per keypress rather than twice.
 */
export default function ShopPanel({
  coins,
  playerHealth,
  maxPlayerHealth,
  playerHearts,
  cheatCount,
  cheatSlotCount,
  timebombCharges,
  blastGuardHeld,
  whetstones,
  flaskCharges,
  flaskRefusal,
  onDrinkFlask,
  nextOpponentName,
  progressText,
  refusals,
  onBuy,
  onLeave,
}: ShopPanelProps) {
  // Which shelf is open. PRESENTATION state, not run state: it has one transition, it is nobody
  // else's business, and it deliberately does not survive leaving the shop. One-time use is the
  // default because it is first in `SHOP_CATEGORIES` and the only rung with an item today.
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>(ShopCategory.OneTimeUse)
  const itemsOnShelf = SHOP_ITEMS_BY_CATEGORY[selectedCategory]

  // One row per item — a plain list rather than a card grid (developer correction, mid-fix on
  // this ticket): the name and blurb read left-to-right on the row's face, with the price pinned
  // to its far end, per `shopItems.css`'s `.shop-list-item`.
  function renderItem(item: ShopItem) {
    const refusal = refusals[item]
    return (
      <div key={item}>
        <button
          type="button"
          className="shop-list-item"
          disabled={refusal !== null}
          onClick={() => onBuy(item)}
          aria-label={shopItemAccessibleName(item, refusal)}
        >
          <span className="shop-list-item-main">
            <span className="shop-item-name">{SHOP_ITEM_NAME[item]}</span>
            {' — '}
            <span className="shop-item-blurb">{SHOP_ITEM_BLURB[item]}</span>
          </span>
          <span className="shop-item-price">{priceText(item)}</span>
        </button>
        <p className="shop-refusal" role="status">
          {refusal === null ? '' : PURCHASE_REFUSAL_MESSAGE[refusal]}
        </p>
      </div>
    )
  }

  return (
    <div className="run-shell">
      <div
        className="shop"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onLeave()
        }}
      >
        <HeartSymbolSheet />
        <FlaskSymbolSheet />
        <h1 className="shop-title">{SHOP_TITLE}</h1>
        <p className="shop-next">{nextOpponentText(nextOpponentName, progressText)}</p>

        <div className="shop-purse" role="group" aria-label={SHOP_PURSE_GROUP_LABEL}>
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{SHOP_COINS_LABEL}</span>
            <span className="shop-purse-value">{coins}</span>
          </span>
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{SHOP_SLOTS_LABEL}</span>
            <span className="shop-purse-value">
              {cheatCount} / {cheatSlotCount}
            </span>
          </span>
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{SHOP_TIMEBOMB_LABEL}</span>
            <span className="shop-purse-value">{timebombCharges}</span>
          </span>
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{SHOP_GUARD_LABEL}</span>
            <span className="shop-purse-value">
              {blastGuardHeld ? SHOP_GUARD_HELD : SHOP_GUARD_NONE}
            </span>
          </span>
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{SHOP_WHETSTONE_LABEL}</span>
            <span className="shop-purse-value">{whetstones}</span>
          </span>
          <span className="shop-purse-cell is-flask">
            <span className="shop-purse-label">{SHOP_FLASK_FREE_TAG}</span>
            <span className="shop-purse-value">{flaskChargesText(flaskCharges)}</span>
          </span>
        </div>

        {/* The health readout is a row of its own rather than a purse cell: it is what a heal is
            bought against, so it gets the width to be counted at a glance. The numeric stays —
            it carries the `meter`'s accessible reading, and the hearts are decoration over it. */}
        <div
          className="shop-health"
          role="meter"
          aria-valuenow={playerHealth}
          aria-valuemin={0}
          aria-valuemax={maxPlayerHealth}
          aria-label={`${SHOP_HEALTH_LABEL} ${playerHealth} of ${maxPlayerHealth}`}
        >
          <span className="shop-purse-label">{SHOP_HEALTH_LABEL}</span>
          <span className="shop-hearts" aria-hidden="true">
            {playerHearts.map((state, index) => (
              <span key={index} className="shop-heart" data-state={state}>
                <HeartMark broken={state === HeartState.Broken || state === HeartState.Breaking} />
              </span>
            ))}
          </span>
          <span className="shop-purse-value">
            {playerHealth} / {maxPlayerHealth}
          </span>
        </div>

        <ShopCategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />

        {/* Only the selected rung's panel is rendered, per the WAI-ARIA tabs pattern. The panel is
            the one region on this screen allowed to scroll (see `shop.css`) — the catalogue is
            unbounded and the viewport is not, and every figure a purchase decision needs stays
            outside it. */}
        <div
          className="shop-panel"
          id={shopPanelId(selectedCategory)}
          role="tabpanel"
          aria-labelledby={shopTabId(selectedCategory)}
          tabIndex={0}
        >
          {itemsOnShelf.length === 0 ? (
            // AC5 — stated, so an empty shelf cannot be mistaken for a broken one.
            <p className="shop-empty">{SHOP_CATEGORY_EMPTY}</p>
          ) : (
            <div className="shop-list">{itemsOnShelf.map(renderItem)}</div>
          )}
        </div>

        {/* AC2/AC3 — the Heal is an instant transfer with no duration, so it is not on the ladder
            and does not live in a tab. AC6 (DLR-93) — the flask now shares this row with the Heal
            (developer direction, mid-fix on this ticket): `.shop-list--extras` lays the two side
            by side, wrapping to a stack once the column is too narrow to hold both. The flask
            keeps its OWN accessible group (`role="group"`, `SHOP_FLASK_GROUP_LABEL`) so it still
            reads as apart from the priced items to a screen reader even though it now sits
            visually beside one — `ShopPanel.test.tsx` asserts exactly that. */}
        <div className="shop-aside">
          <span className="shop-aside-label">{SHOP_ASIDE_LABEL}</span>
          <div className="shop-list shop-list--extras">
            <div role="group" aria-label={SHOP_FLASK_GROUP_LABEL}>
              <button
                type="button"
                className="shop-list-item is-flask"
                disabled={flaskRefusal !== null}
                onClick={onDrinkFlask}
                aria-label={flaskAccessibleName(
                  flaskCharges,
                  flaskHealAmount(maxPlayerHealth),
                  flaskRefusal,
                )}
              >
                <span className="shop-flask-icon" aria-hidden="true">
                  <FlaskMark />
                </span>
                <span className="shop-list-item-main">
                  <span className="shop-item-name">{SHOP_FLASK_LABEL}</span>
                  {' — '}
                  <span className="shop-item-blurb">
                    {flaskBlurbText(flaskHealAmount(maxPlayerHealth))}
                  </span>
                </span>
                <span className="shop-flask-tag">
                  <span className="shop-flask-free">{SHOP_FLASK_NO_COIN}</span>
                  <span className="shop-flask-charges">{flaskChargesText(flaskCharges)}</span>
                </span>
              </button>
              <p className="shop-refusal" role="status">
                {flaskRefusal === null ? '' : FLASK_REFUSAL_MESSAGE[flaskRefusal]}
              </p>
            </div>
            {UNCATEGORISED_SHOP_ITEMS.map(renderItem)}
          </div>
        </div>

        <p className="shop-hint">{SHOP_NOTHING_TO_BUY_HINT}</p>

        <div className="run-actions">
          <button type="button" className="run-btn is-primary" onClick={onLeave}>
            {nextOpponentName === undefined ? NEXT_FIGHT_LABEL : fightLabel(nextOpponentName)}
          </button>
        </div>
      </div>
    </div>
  )
}
