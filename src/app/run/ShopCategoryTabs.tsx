import { SHOP_CATEGORIES, ShopCategory, isShopCategoryAvailable } from '../../hunt'
import { useRovingTabIndex } from '../warCouncil/useRovingTabIndex'
import {
  SHOP_CATEGORY_COMING_SOON,
  SHOP_CATEGORY_LABEL,
  SHOP_TABLIST_LABEL,
  shopCategoryAccessibleName,
  shopPanelId,
  shopTabId,
} from './shopLabels'

interface ShopCategoryTabsProps {
  readonly selected: ShopCategory
  /** Fired only for an available category — activating the refused rung is a no-op. */
  readonly onSelect: (category: ShopCategory) => void
}

/**
 * The category tablist (DLR-89) — the shop's four persistence-length rungs, in `SHOP_CATEGORIES`
 * order. Presentational: it decides nothing, asking `isShopCategoryAvailable` whether a rung
 * refuses rather than naming `GamePermanent` itself, so the rule stays stated once in `src/hunt/`.
 *
 * One tab stop for the whole widget, arrow keys within it — the WAI-ARIA tabs pattern, which a
 * `role="tablist"` commits to regardless of `game-ux`'s about-five threshold: a widget that
 * announces itself as tabs and then ignores arrow keys is worse than four plain buttons.
 * Activation is MANUAL (`Enter`/`Space`/click), so arrowing onto the refused rung reaches and
 * announces it without trying to select it.
 *
 * The refused rung carries `aria-disabled`, not `disabled`: a native disabled button leaves both
 * the tab order and arrow traversal, so the tab that exists purely to say "a fourth rung is
 * coming" would never reach the keyboard user it is telling.
 *
 * `ShopPanel` renders only the SELECTED rung's tabpanel (never all four, hidden or otherwise), so
 * `aria-controls` is set on the selected tab alone — the other three would otherwise point at an
 * `id` that exists nowhere in the document, a dangling ARIA reference.
 */
export default function ShopCategoryTabs({ selected, onSelect }: ShopCategoryTabsProps) {
  // Every tab is focusable — the refused one included, which is the point of `aria-disabled`.
  // `onCancel` is a DELIBERATE no-op: `ShopPanel`'s own container already handles `Escape` by
  // leaving for the next fight, and this hook does not stop propagation, so wiring `onLeave`
  // here as well would fire `advanceRun` TWICE from one keypress and silently skip a fight.
  //
  // The rendered tab stop is derived from `selected`, NOT from the hook's own `tabStopIndex`:
  // the hook only moves `tabStopIndex` on arrow/Home/End, so a mouse click — which changes
  // `selected` and moves real DOM focus via the browser's native click-focus behaviour — would
  // otherwise leave `tabIndex={0}` on the tab that was last reached by keyboard, not the tab
  // that is actually selected. Arrow-key movement still runs through the hook's own
  // `groupRef`/`handleKeyDown`; only the tab-stop's render binding is sourced from `selected`.
  const { groupRef, handleKeyDown } = useRovingTabIndex(
    SHOP_CATEGORIES.length,
    () => true,
    () => {},
  )

  return (
    <div
      className="shop-tabs"
      role="tablist"
      aria-label={SHOP_TABLIST_LABEL}
      ref={groupRef}
      onKeyDown={handleKeyDown}
    >
      {SHOP_CATEGORIES.map((category) => {
        const available = isShopCategoryAvailable(category)
        return (
          <button
            key={category}
            type="button"
            className="shop-tab"
            id={shopTabId(category)}
            role="tab"
            aria-controls={category === selected ? shopPanelId(category) : undefined}
            aria-selected={category === selected}
            aria-disabled={available ? undefined : true}
            aria-label={shopCategoryAccessibleName(category, available)}
            tabIndex={category === selected ? 0 : -1}
            onClick={() => {
              if (available) onSelect(category)
            }}
          >
            {SHOP_CATEGORY_LABEL[category]}
          </button>
        )
      })}
      {/* AC4 — the reason is a sentence on the face of the screen, in the same `role="status"`
          region a refused purchase already states its reason in. */}
      <p className="shop-refusal shop-tabs-reason" role="status">
        {SHOP_CATEGORY_COMING_SOON}
      </p>
    </div>
  )
}
