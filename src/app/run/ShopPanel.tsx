import {
  SHOP_ITEMS,
  ShopItem,
  type Coins,
  type Health,
  type PurchaseRefusal,
} from '../../hunt'
import {
  nextOpponentText,
  priceText,
  PURCHASE_REFUSAL_MESSAGE,
  purseText,
  SHOP_ITEM_BLURB,
  SHOP_ITEM_NAME,
  SHOP_NOTHING_TO_BUY_HINT,
  SHOP_PURSE_GROUP_LABEL,
  SHOP_TITLE,
  shopItemAccessibleName,
} from './shopLabels'
import { NEXT_FIGHT_LABEL } from './runLabels'
import './run.css'
import './shop.css'

interface ShopPanelProps {
  readonly coins: Coins
  readonly playerHealth: Health
  readonly maxPlayerHealth: Health
  readonly cheatCount: number
  readonly cheatSlotCount: number
  /** AC10 — the coming opponent's display name, `undefined` while the roster has no entry.
   *  Reads "The Monarch" on every fight until DLR-85 lands the roster; that is correct today. */
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
 * The shop screen (DLR-84): a full-viewport surface reached from the run verdict, selling a
 * Cheat into a free slot or a heal, each priced from configuration and each refusable with a
 * stated reason on the face of its own card.
 *
 * Computes NOTHING — a `RunOutcomePanel` clone in discipline. Every figure, every refusal, and
 * the opponent's name arrive as props; this component only maps `SHOP_ITEMS` and fires the two
 * callbacks it is given. Layout follows this contract's `mockup.html`, screen B.
 *
 * Three tab stops (two purchase cards, the leave control) sit well under `game-ux`'s
 * roving-tabindex threshold of about five, so they are plain tab stops with an `Escape` handler
 * on the container, matching `CheatSlots`'s own keyboard contract.
 */
export default function ShopPanel({
  coins,
  playerHealth,
  maxPlayerHealth,
  nextOpponentName,
  progressText,
  refusals,
  onBuy,
  onLeave,
}: ShopPanelProps) {
  return (
    <div className="run-shell">
      <div
        className="shop"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onLeave()
        }}
      >
        <h1 className="shop-title">{SHOP_TITLE}</h1>
        <p className="shop-next">{nextOpponentText(nextOpponentName, progressText)}</p>

        <div className="shop-purse" role="group" aria-label={SHOP_PURSE_GROUP_LABEL}>
          <span className="shop-purse-cell">
            <span className="shop-purse-label">{purseText(coins, playerHealth, maxPlayerHealth)}</span>
          </span>
        </div>

        <div className="shop-grid">
          {SHOP_ITEMS.map((item) => {
            const refusal = refusals[item]
            return (
              <div key={item}>
                <button
                  type="button"
                  className="shop-item"
                  disabled={refusal !== null}
                  onClick={() => onBuy(item)}
                  aria-label={shopItemAccessibleName(item, refusal)}
                >
                  <span className="shop-item-name">{SHOP_ITEM_NAME[item]}</span>
                  <span className="shop-item-blurb">{SHOP_ITEM_BLURB[item]}</span>
                  <span className="shop-item-price">{priceText(item)}</span>
                </button>
                <p className="shop-refusal" role="status">
                  {refusal === null ? '' : PURCHASE_REFUSAL_MESSAGE[refusal]}
                </p>
              </div>
            )
          })}
        </div>

        <p className="shop-hint">{SHOP_NOTHING_TO_BUY_HINT}</p>

        <div className="run-actions">
          <button type="button" className="run-btn is-primary" onClick={onLeave}>
            {NEXT_FIGHT_LABEL}
          </button>
        </div>
      </div>
    </div>
  )
}
