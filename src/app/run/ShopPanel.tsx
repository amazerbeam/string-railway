import {
  flaskHealAmount,
  SHOP_ITEMS,
  ShopItem,
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
  SHOP_COINS_LABEL,
  SHOP_FLASK_GROUP_LABEL,
  SHOP_FLASK_LABEL,
  SHOP_FLASK_NO_COIN,
  SHOP_HEALTH_LABEL,
  SHOP_ITEM_BLURB,
  SHOP_ITEM_NAME,
  SHOP_NOTHING_TO_BUY_HINT,
  SHOP_PURSE_GROUP_LABEL,
  SHOP_TITLE,
  shopItemAccessibleName,
} from './shopLabels'
import { fightLabel, NEXT_FIGHT_LABEL } from './runLabels'
import SlotMachinePanel, { type SlotMachinePanelProps } from './SlotMachinePanel'
import { FlaskMark, FlaskSymbolSheet } from './FlaskMark'
import { HeartMark, HeartSymbolSheet } from '../warCouncil/HeartMark'
import { HeartState } from '../warCouncil/duelHealthBars'
import './run.css'
import './shop.css'
import './shopItems.css'
import './shopFlask.css'
import './shopSlot.css'

interface ShopPanelProps {
  readonly coins: Coins
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
  /** One entry per point of maximum health, derived by the driver from the SAME
   *  `duelHealthBars` the felt reads — never re-derived here, so the shop's row and the fight's
   *  row cannot disagree. Between fights nothing is pending, so every entry is whole or broken. */
  readonly playerHearts: readonly HeartState[]
  /** DLR-93 AC1 — charges held, so the refusal at zero has a visible cause without hover. A count
   *  with no denominator, exactly as before: the epic defers raising the ceiling. */
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
  /** One entry per `ShopItem` member, derived by the driver from `refusalFor` — never re-derived
   *  here. `null` means the purchase is available. Total over the whole union, exactly as
   *  `SHOP_ITEM_NAME`, even though only `SHOP_ITEMS` is ever rendered. */
  readonly refusals: Readonly<Record<ShopItem, PurchaseRefusal | null>>
  readonly onBuy: (item: ShopItem) => void
  readonly onLeave: () => void
  /** DLR-116 AC1 — the slot machine section, passed straight through from `useShopSlot`'s view
   *  plus the driver's own callbacks. `ShopPanel` computes nothing about it. */
  readonly slot: SlotMachinePanelProps
}

/**
 * The shop screen (DLR-84, ladder rebuilt on DLR-89, pared down and given a slot machine on
 * DLR-116): a full-viewport surface reached from the run verdict, offering exactly Health and the
 * two rank-tier steps as fixed purchases, a slot machine to pull, and a free flask to drink.
 * DLR-145 AC3 — the action-point purchase left the shelf along with the rest of action points;
 * `SHOP_ITEMS` is the one place that changed, per its own docblock.
 *
 * Computes NOTHING — a `RunOutcomePanel` clone in discipline. Every figure, every refusal, and
 * the opponent's name arrive as props; this component maps `SHOP_ITEMS` in one flat list and
 * fires the callbacks it is given. Layout follows this contract's `plan.md` and `mockup.html`.
 *
 * The four-rung category tablist (`ShopCategoryTabs`) is gone on this ticket — two fixed items
 * need no ladder (AC2/AC3). `Escape` still leaves for the next fight.
 */
export default function ShopPanel({
  coins,
  playerHealth,
  maxPlayerHealth,
  playerHearts,
  flaskCharges,
  flaskRefusal,
  onDrinkFlask,
  nextOpponentName,
  progressText,
  refusals,
  onBuy,
  onLeave,
  slot,
}: ShopPanelProps) {
  // One row per item — a plain list rather than a card grid (developer correction, mid-fix on
  // DLR-89): the name and blurb read left-to-right on the row's face, with the price pinned
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

        <SlotMachinePanel {...slot} />

        {/* AC2/AC3 — the pared purchasable list: Health and the two rank-tier steps, no tablist,
            no tabpanel, no "Also for sale" heading. DLR-145 AC3 took the AP-capacity row off. */}
        <div className="shop-list">{SHOP_ITEMS.map(renderItem)}</div>

        {/* AC6 (DLR-93) — the flask keeps its OWN accessible group so it still reads as apart
            from the priced items to a screen reader, even sitting in the same flow. */}
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
