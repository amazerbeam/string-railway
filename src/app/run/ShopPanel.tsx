import { useEffect, useRef } from 'react'
import {
  flaskHealAmount,
  SHOP_ITEMS,
  ShopItem,
  type Buff,
  type BuffId,
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
import { PlaceKind } from '../warCouncil/cardPlacement'
import { MotionAnchorProvider } from '../warCouncil/MotionAnchors'
import { anchorKeyFor, useMotionAnchors } from '../warCouncil/motionAnchorContext'
import { useCardMotion } from '../warCouncil/useCardMotion'
import './run.css'
import './shop.css'
import './shopItems.css'
import './shopFlask.css'
import './shopSlot.css'

/** DLR-157 Task 14 — the tray itself (`PlaceKind.HeldTray`, unslotted, `ShopHeld.tsx`'s own
 *  anchor) and the two places a card can fly FROM into it. QA fix (code-evaluator review) —
 *  these two origins were previously named as `HeldTray` slots (`slot: 'offer:<item>'`,
 *  `slot: 'slotMachine'`), which read as a workaround around `cardPlacement.ts`'s fixed
 *  `PlaceKind` union rather than what they actually are — neither is a slot of the tray.
 *  `PlaceKind.ShopOffer` and `PlaceKind.SlotMachine` name them directly. `offerAnchor` slots by
 *  the purchased `ShopItem` (M22); `SLOT_MACHINE_ANCHOR` is the one coarse origin for a slot win
 *  (M21) — `SlotMachinePanel.tsx` registers no anchor of its own, so the flight starts from the
 *  stage that hosts it. */
function offerAnchor(item: ShopItem) {
  return { kind: PlaceKind.ShopOffer, slot: item }
}
const SLOT_MACHINE_ANCHOR = { kind: PlaceKind.SlotMachine } as const
const TRAY_ANCHOR = { kind: PlaceKind.HeldTray } as const

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
  /** DLR-158 AC5 — one entry per `ShopItem`, derived by the driver from `priceOf` and never
   *  re-derived here: the price of the NEXT purchase, which for the max-health raise climbs with
   *  every copy bought. Total over the whole union, exactly as `refusals` is. */
  readonly prices: Readonly<Record<ShopItem, Coins>>
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
 *
 * DLR-157 Task 14 — mounts its OWN `MotionAnchorProvider`: the shop and the round are different
 * screens and never share a registry (`useCardMotionDriver.ts`'s felt-only diff would have nothing
 * to say about a shop purchase anyway). The provider has to sit ABOVE the component that calls
 * `useMotionAnchors`/`useCardMotion` — a component cannot resolve a context it renders itself — so
 * the real content lives in `ShopPanelContent` below, and this outer function does nothing else.
 */
export default function ShopPanel(props: ShopPanelProps) {
  return (
    <MotionAnchorProvider>
      <ShopPanelContent {...props} />
    </MotionAnchorProvider>
  )
}

function ShopPanelContent({
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
  prices,
  onBuy,
  onLeave,
  slot,
}: ShopPanelProps) {
  const { register } = useMotionAnchors()
  const { move, inFlight } = useCardMotion()

  // M22 — a purchase's own trigger: the click IS the moment, so this defers `onBuy` to the
  // flight's landing, mirroring `useTableCardMotion.flyPlayedCard`'s deferred-dispatch shape for
  // M1. An unresolvable anchor (`useCardMotion.ts`'s own path) lands instantly and calls back
  // straight away — the purchase always reaches `RunState`, animated or not.
  function handleBuy(item: ShopItem) {
    move([{ from: offerAnchor(item), to: TRAY_ANCHOR, hide: 'to', flip: false, delayMs: 0 }], () =>
      onBuy(item),
    )
  }

  // M21 — a slot win's OWN trigger is `useShopSlot.pull`, out of this file's reach (Task 14's own
  // `**Files:**` block), and it already commits `RunState` and `lastPull` together, synchronously —
  // there is no "before the buff exists" moment left to defer a dispatch onto. Watching `heldBuffs`
  // for an id that is BOTH new since the previous render AND named in this pull's own `awards` is
  // the same shape `buffRideProps.ts`'s activation watcher uses for M15, scoped to the one case
  // (a WIN, not a purchase) it must not double-fire on.
  const previousHeldIdsRef = useRef<ReadonlySet<BuffId>>(new Set(heldBuffs.map((buff) => buff.id)))
  useEffect(() => {
    const currentIds = new Set(heldBuffs.map((buff) => buff.id))
    const awardedIds = new Set((slot.lastPull?.awards ?? []).map((buff) => buff.id))
    for (const id of currentIds) {
      if (!previousHeldIdsRef.current.has(id) && awardedIds.has(id)) {
        move(
          [{ from: SLOT_MACHINE_ANCHOR, to: TRAY_ANCHOR, hide: 'to', flip: false, delayMs: 0 }],
          () => {},
        )
      }
    }
    previousHeldIdsRef.current = currentIds
  }, [heldBuffs, slot.lastPull, move])

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
          // QA fix (DLR-157 review) — `inFlight` folded in alongside the refusal gate, mirroring
          // `useTableCardMotion`'s M1 guard: a purchase's own commit is deferred to its flight's
          // landing (`handleBuy` below), and the M21 slot-win watcher shares this SAME
          // `useCardMotion()` instance, so a second click mid-flight would otherwise supersede —
          // and, before this fix, silently drop — the first purchase's commit.
          disabled={refusal !== null || inFlight}
          onClick={() => handleBuy(item)}
          aria-label={shopItemAccessibleName(item, prices[item], refusal)}
          ref={register(anchorKeyFor(offerAnchor(item)))}
        >
          <span className="shop-buy-name">{SHOP_ITEM_NAME[item]}</span>
          <span className="shop-buy-price">{priceText(prices[item])}</span>
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
        // QA fix (DLR-157 follow-up) — a purchase's commit is deferred to its flight's landing
        // (`handleBuy` above); leaving mid-flight unmounts this component and `useCardMotion`'s
        // cleanup tears the flight down WITHOUT flushing `onAllLanded`, by design (flushing into
        // an unmounting tree would be wrong). Gating Escape on `inFlight`, exactly like the Buy
        // buttons already are, is what stops that purchase from silently never committing.
        if (e.key === 'Escape' && !inFlight) onLeave()
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

      <main className="shop-stage" ref={register(anchorKeyFor(SLOT_MACHINE_ANCHOR))}>
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

          {/* QA fix (DLR-157 follow-up) — same `inFlight` gate as the Escape handler above and the
              Buy buttons: leaving while a purchase's flight is airborne would unmount this screen
              before `onBuy` ever fires, silently dropping the purchase. `inFlight` clears the
              instant the ~380ms flight lands, so the control is never stuck disabled. */}
          <button type="button" className="shop-leave" disabled={inFlight} onClick={onLeave}>
            {nextOpponentName === undefined ? NEXT_FIGHT_LABEL : fightLabel(nextOpponentName)}
          </button>
        </div>
      </footer>
    </div>
  )
}
