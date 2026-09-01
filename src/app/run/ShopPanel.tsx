import {
  flaskHealAmount,
  SHOP_ITEMS,
  ShopItem,
  type Buff,
  type Coins,
  type FlaskRefusal,
  type Health,
  type PurchaseRefusal,
} from '../../hunt'
import {
  flaskAccessibleName,
  flaskChargesText,
  FLASK_REFUSAL_MESSAGE,
  priceText,
  PURCHASE_REFUSAL_MESSAGE,
  SHOP_COINS_LABEL,
  SHOP_FLASK_GROUP_LABEL,
  SHOP_FLASK_LABEL,
  SHOP_FLASK_NO_COIN,
  SHOP_HEALTH_LABEL,
  SHOP_ITEM_NAME,
  SHOP_PURSE_GROUP_LABEL,
  shopItemAccessibleName,
} from './shopLabels'
import { fightLabel, NEXT_FIGHT_LABEL } from './runLabels'
import SlotMachinePanel, { type SlotMachinePanelProps } from './SlotMachinePanel'
import ShopHeld from './ShopHeld'
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
  /** One entry per point of maximum health, derived by the driver from the SAME `duelHealthBars`
   *  the felt reads — never re-derived here, so the shop's row and the fight's row cannot disagree.
   *  Between fights nothing is pending, so every entry is whole or broken. */
  readonly playerHearts: readonly HeartState[]
  /** DLR-93 AC1 — charges held, so the refusal at zero has a visible cause without hover. */
  readonly flaskCharges: number
  /** Derived by the driver from `flaskRefusalFor` — never re-derived here. `null` means the flask
   *  can be drunk. */
  readonly flaskRefusal: FlaskRefusal | null
  readonly onDrinkFlask: () => void
  /** 2026-09-01 — the cards the player is carrying, straight off `RunState.buffs`. The shop had no
   *  way to say what was held, which the developer named as the screen's worst gap: coins and
   *  health were visible and the actual holdings were not. `ShopHeld` owns the grouping. */
  readonly heldBuffs: readonly Buff[]
  /** AC10 — the coming opponent's display name, `undefined` while the roster has no entry. Also
   *  names the leave control (AC8, DLR-85). */
  readonly nextOpponentName: string | undefined
  /** AC10 — the run's position, ALREADY WORDED by `runProgressText`. */
  readonly progressText: string
  /** One entry per `ShopItem` member, derived by the driver from `refusalFor` — never re-derived
   *  here. `null` means the purchase is available. Total over the whole union, exactly as
   *  `SHOP_ITEM_NAME`, even though only `SHOP_ITEMS` is ever rendered. */
  readonly refusals: Readonly<Record<ShopItem, PurchaseRefusal | null>>
  readonly onBuy: (item: ShopItem) => void
  readonly onLeave: () => void
  /** DLR-116 AC1 — the slot machine, passed straight through from `useShopSlot`'s view plus the
   *  driver's own callbacks. `ShopPanel` computes nothing about it. */
  readonly slot: SlotMachinePanelProps
}

/**
 * The shop screen, rebuilt 2026-09-01 from this contract's `mockup.html` after the developer's
 * verdict on the previous pass: *"it feels like a huge amount of info and I can't tell what I have
 * in my inventory"*, plus a rejection of the overall style. Three zones replace ten stacked blocks:
 *
 * 1. **A status strip**, anchored to the top edge — coins, health and the coming fight in one row.
 *    The screen title, the "next up" sentence, the purse panel and the health meter were four
 *    separate blocks saying what now fits on one line. `game-ux`: status lives at the edges so it
 *    never crowds the thing that matters.
 * 2. **The machine**, centre stage and large, because it is the only thing on this screen the
 *    player is actually here to operate.
 * 3. **A tray** — what you hold, then what a coin buys, then the way out.
 *
 * What left the screen, and why it is a deletion rather than a hiding: the Swan and Witch rank
 * upgrades came off `SHOP_ITEMS` (developer decision — their rules are unsettled, and each printed
 * a forty-word blurb that was most of the wall of text), and Strongbox came off `SLOT_MACHINE_IDS`
 * because its odds were within a point of Skirmisher's on every family. Both are one row away from
 * coming back; neither mechanic is deleted.
 *
 * Computes NOTHING — a `RunOutcomePanel` clone in discipline. Every figure, every refusal and the
 * opponent's name arrive as props. `Escape` still leaves for the next fight.
 */
export default function ShopPanel({
  coins,
  playerHealth,
  maxPlayerHealth,
  playerHearts,
  flaskCharges,
  flaskRefusal,
  onDrinkFlask,
  heldBuffs,
  nextOpponentName,
  progressText,
  refusals,
  onBuy,
  onLeave,
  slot,
}: ShopPanelProps) {
  // One tile per purchasable, carrying a name and a price and nothing else. The blurb is gone: on
  // a one-item shelf the name IS the description, and the paragraph it replaced was a third of the
  // screen's text.
  function renderItem(item: ShopItem) {
    const refusal = refusals[item]
    return (
      <div key={item} className="shop-buy-slot">
        <button
          type="button"
          className="shop-buy"
          disabled={refusal !== null}
          onClick={() => onBuy(item)}
          aria-label={shopItemAccessibleName(item, refusal)}
        >
          <span className="shop-buy-name">{SHOP_ITEM_NAME[item]}</span>
          <span className="shop-buy-price">{priceText(item)}</span>
        </button>
        {/* A reason renders only when there IS one — `game-ux` forbids a panel that exists to say
            nothing is wrong, and five reserved-but-empty lines were a large part of why the old
            screen overran its own height. */}
        {refusal !== null && (
          <p className="shop-refusal" role="status">
            {PURCHASE_REFUSAL_MESSAGE[refusal]}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="shop-shell"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onLeave()
      }}
    >
      <HeartSymbolSheet />
      <FlaskSymbolSheet />

      <header className="shop-status" role="group" aria-label={SHOP_PURSE_GROUP_LABEL}>
        <span className="shop-stat">
          <span className="shop-stat-value is-coins">{coins}</span>
          <span className="shop-stat-label">{SHOP_COINS_LABEL}</span>
        </span>

        {/* The numeric stays alongside the hearts: it carries the `meter`'s accessible reading, and
            the hearts are the at-a-glance count over it. */}
        <span
          className="shop-stat"
          role="meter"
          aria-valuenow={playerHealth}
          aria-valuemin={0}
          aria-valuemax={maxPlayerHealth}
          aria-label={`${SHOP_HEALTH_LABEL} ${playerHealth} of ${maxPlayerHealth}`}
        >
          <span className="shop-hearts" aria-hidden="true">
            {playerHearts.map((state, index) => (
              <span key={index} className="shop-heart" data-state={state}>
                <HeartMark broken={state === HeartState.Broken || state === HeartState.Breaking} />
              </span>
            ))}
          </span>
          {/* The numeral stays beside the hearts. At ten points of maximum health the row is a
              thing to COUNT, and `game-ux` warns against making the player do that — the hearts
              give the shape at a glance, the fraction gives the exact figure without counting. */}
          <span className="shop-stat-value is-health">
            {playerHealth} / {maxPlayerHealth}
          </span>
          <span className="shop-stat-label">{SHOP_HEALTH_LABEL}</span>
        </span>

        <span className="shop-next">
          <b>{nextOpponentName ?? NEXT_FIGHT_LABEL}</b>
          {progressText}
        </span>
      </header>

      <main className="shop-stage">
        <SlotMachinePanel {...slot} />
      </main>

      <footer className="shop-tray">
        <ShopHeld buffs={heldBuffs} />

        <div className="shop-buys">
          {SHOP_ITEMS.map(renderItem)}

          {/* AC6 (DLR-93) — the flask keeps its OWN accessible group so it still reads as apart
              from the priced items to a screen reader, even sitting in the same row. */}
          <div className="shop-buy-slot" role="group" aria-label={SHOP_FLASK_GROUP_LABEL}>
            <button
              type="button"
              className="shop-buy is-flask"
              disabled={flaskRefusal !== null}
              onClick={onDrinkFlask}
              aria-label={flaskAccessibleName(
                flaskCharges,
                flaskHealAmount(maxPlayerHealth),
                flaskRefusal,
              )}
            >
              <span className="shop-buy-icon" aria-hidden="true">
                <FlaskMark />
              </span>
              <span className="shop-buy-name">{SHOP_FLASK_LABEL}</span>
              {/* Two spans, not one interpolated string: the charge count has to be findable as
                  its own text, so "0 charges" reads as a fact on the face of the screen rather
                  than as a fragment of "No coin · 0 charges". */}
              <span className="shop-buy-price">
                <span className="shop-buy-free">{SHOP_FLASK_NO_COIN}</span>
                <span className="shop-buy-charges">{flaskChargesText(flaskCharges)}</span>
              </span>
            </button>
            {flaskRefusal !== null && (
              <p className="shop-refusal" role="status">
                {FLASK_REFUSAL_MESSAGE[flaskRefusal]}
              </p>
            )}
          </div>

          <button type="button" className="shop-leave" onClick={onLeave}>
            {nextOpponentName === undefined ? NEXT_FIGHT_LABEL : fightLabel(nextOpponentName)}
          </button>
        </div>
      </footer>
    </div>
  )
}
