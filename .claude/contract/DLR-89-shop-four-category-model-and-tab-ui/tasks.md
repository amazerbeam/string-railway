# Tasks: Shop rebuild — four-category model and tab UI

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-18

**Goal:** Replace the shop's flat two-item list with version 4's persistence-length ladder — a `ShopCategory` model in `src/hunt/shop.ts` and a four-tab UI in `ShopPanel.tsx` — using only Cheat and Heal, with no behaviour change to either.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved at the plan gate).

---

## File map

**Created:**
- `src/app/run/ShopCategoryTabs.tsx` — the `role="tablist"` of four category tabs, its roving tabindex, and the refused game-permanent tab
- `src/app/run/__tests__/ShopCategoryTabs.test.tsx` — tab rendering, selection, keyboard movement, the refused tab

**Modified:**
- `src/hunt/shop.ts` — add `ShopCategory`, `SHOP_CATEGORIES`, `categoryOf`, `SHOP_ITEMS_BY_CATEGORY`, `UNCATEGORISED_SHOP_ITEMS`, `isShopCategoryAvailable`
- `src/hunt/index.ts:51-52` — re-export the six new names
- `src/app/run/shopLabels.ts` — add the tab labels, the tablist and aside labels, the coming-soon and empty sentences, and `shopCategoryAccessibleName`
- `src/app/run/ShopPanel.tsx:1,38-56,120-142` — hold the selected category, render the tablist and one tabpanel, move Heal outside the tabs
- `src/app/run/shop.css:110-115,195-199` — add the tablist/tab/panel/empty/aside rules; switch `.shop-grid` to `auto-fill` and drop the now-redundant single-column media query
- `src/hunt/__tests__/shop.test.ts` — add category-model coverage
- `src/app/run/__tests__/shopLabels.test.ts` — add copy-totality coverage
- `src/app/run/__tests__/ShopPanel.test.tsx` — add tab-integration coverage (existing 11 tests must pass **unedited**)

**Deleted:** *(none)*

**Developer decides or observes:**
- `shopLabels.ts` → `SHOP_CATEGORY_LABEL`'s four tab labels, `SHOP_TABLIST_LABEL`, `SHOP_ASIDE_LABEL`, `SHOP_CATEGORY_COMING_SOON`, `SHOP_CATEGORY_EMPTY` — placeholder copy. version-4-scope's open questions already asks whether the coming-soon state needs copy beyond that phrase.
- `shop.css` → `.shop-panel`'s `max-height` bound and `.shop-grid`'s `minmax()` floor — the two new tuning values. Together they decide how much of a long shelf is visible before it scrolls; a bound showing one and a half cards reads as broken rather than scrollable. Placeholders ship; retune by eye.
- `shop.css` → every new `clamp()` bound and hue in the tablist rules, per that file's existing header.
- **`aria-disabled` vs native `disabled` on the refused tab** — approved at the gate as `aria-disabled`; reversible in one attribute if you change your mind (`plan.md` → Risks, bullet 1).
- **Whether the item cards inside a panel should get their own roving tabindex now** rather than being deferred to the first item ticket that pushes a shelf past ~5 cards (`plan.md` → Risks).
- **Whether the screen still fits one viewport with no page scroll** now a tab row and a bordered panel are added — QA checks this at named sizes; whether it *feels* cramped is your eye.

---

## Phase 1 — The category model, in the pure core

Everything in this phase is plain TypeScript inside `src/hunt/`, which ESLint holds to no-React/no-DOM. It is fully unit-testable with no renderer, and it is what the three follow-on item tickets depend on — so it lands first and alone. The phase ends with the model exported and tested and no UI touched at all, which type-checks and leaves the app rendering exactly as it does today.

### Task 1: Add the `ShopCategory` model to `src/hunt/shop.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/shop.ts`
- Test: `src/hunt/__tests__/shop.test.ts`

- [x] **Step 1: Write the failing tests for the category model**

Append to `src/hunt/__tests__/shop.test.ts`, and extend its existing import from `../shop` to add `categoryOf`, `isShopCategoryAvailable`, `ShopCategory`, `SHOP_CATEGORIES`, `SHOP_ITEMS_BY_CATEGORY`, and `UNCATEGORISED_SHOP_ITEMS`:

```ts
describe('ShopCategory', () => {
  it('holds the four design-doc rungs, and SHOP_CATEGORIES fixes the render order (AC1/AC3)', () => {
    expect(SHOP_CATEGORIES).toEqual([
      ShopCategory.OneTimeUse,
      ShopCategory.FightLong,
      ShopCategory.RunPermanent,
      ShopCategory.GamePermanent,
    ])
  })

  it('lists every ShopCategory member exactly once', () => {
    expect([...SHOP_CATEGORIES].sort()).toEqual(Object.values(ShopCategory).sort())
  })
})

describe('categoryOf', () => {
  it('puts the Cheat on the one-time-use rung (AC2)', () => {
    expect(categoryOf(ShopItem.Cheat)).toBe(ShopCategory.OneTimeUse)
  })

  it('gives the Heal no category at all — an instant transfer has no duration (AC2)', () => {
    expect(categoryOf(ShopItem.Heal)).toBeNull()
  })

  it('answers for every SHOP_ITEMS member, so no item is silently unassigned', () => {
    for (const item of SHOP_ITEMS) {
      const category = categoryOf(item)
      expect(category === null || SHOP_CATEGORIES.includes(category)).toBe(true)
    }
  })
})

describe('SHOP_ITEMS_BY_CATEGORY', () => {
  it('has an entry for every category, so a tab can never read undefined', () => {
    for (const category of SHOP_CATEGORIES) {
      expect(Array.isArray(SHOP_ITEMS_BY_CATEGORY[category])).toBe(true)
    }
  })

  it('holds only the Cheat on the one-time-use rung today (AC5)', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.OneTimeUse]).toEqual([ShopItem.Cheat])
  })

  it('leaves fight-long, run-permanent and game-permanent empty until their items ship (AC5)', () => {
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.FightLong]).toEqual([])
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.RunPermanent]).toEqual([])
    expect(SHOP_ITEMS_BY_CATEGORY[ShopCategory.GamePermanent]).toEqual([])
  })

  it('never places an uncategorised item on a rung', () => {
    const onRungs = SHOP_CATEGORIES.flatMap((category) => SHOP_ITEMS_BY_CATEGORY[category])
    expect(onRungs).not.toContain(ShopItem.Heal)
  })

  it('accounts for every catalogue item exactly once across the rungs and the uncategorised set', () => {
    const placed = [
      ...SHOP_CATEGORIES.flatMap((category) => SHOP_ITEMS_BY_CATEGORY[category]),
      ...UNCATEGORISED_SHOP_ITEMS,
    ]
    expect([...placed].sort()).toEqual([...SHOP_ITEMS].sort())
  })
})

describe('UNCATEGORISED_SHOP_ITEMS', () => {
  it('is exactly the Heal today (AC2)', () => {
    expect(UNCATEGORISED_SHOP_ITEMS).toEqual([ShopItem.Heal])
  })
})

describe('isShopCategoryAvailable', () => {
  it('refuses only the game-permanent rung — nothing is designed for it yet (AC4)', () => {
    expect(isShopCategoryAvailable(ShopCategory.GamePermanent)).toBe(false)
  })

  it('allows the other three, including the two that are merely empty (AC5)', () => {
    expect(isShopCategoryAvailable(ShopCategory.OneTimeUse)).toBe(true)
    expect(isShopCategoryAvailable(ShopCategory.FightLong)).toBe(true)
    expect(isShopCategoryAvailable(ShopCategory.RunPermanent)).toBe(true)
  })
})
```

- [x] **Step 2: Run the new tests and confirm they fail for the right reason**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts`
Expected: non-zero exit. The failure is a **transform/collection error** naming the missing exports (`categoryOf`, `ShopCategory`, …), not an assertion failure — per `.claude/workflow/web-project.md`, a TypeScript error in a spec means the file's tests never ran. Confirm the named missing exports match Step 3's additions before continuing.

- [x] **Step 3: Add the model to `src/hunt/shop.ts`**

Insert after the `ShopItem` / `SHOP_ITEMS` block (currently lines 4–12) so the catalogue is still stated before anything derives from it:

```ts
/** The persistence-length ladder (version-4-scope.md §1) — named after the design doc's own rungs
 *  rather than Balatro's deck / Joker / consumable, since this game has no deck-building layer for
 *  those names to mean anything against. An `as const` map, not an `enum`: `erasableSyntaxOnly`. */
export const ShopCategory = {
  OneTimeUse: 'oneTimeUse',
  FightLong: 'fightLong',
  RunPermanent: 'runPermanent',
  GamePermanent: 'gamePermanent',
} as const
export type ShopCategory = (typeof ShopCategory)[keyof typeof ShopCategory]

/** AC3 — the four rungs in the order the screen renders them. THE statement of tab order: a
 *  screen maps this, it never lists the categories itself. */
export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  ShopCategory.OneTimeUse,
  ShopCategory.FightLong,
  ShopCategory.RunPermanent,
  ShopCategory.GamePermanent,
]
```

Then, after `priceOf` (whose exhaustive-switch shape `categoryOf` copies), add:

```ts
/**
 * AC2 — which rung an item sits on. Total over `ShopItem` like `priceOf`, so a new item is a
 * compile error here rather than an item that quietly appears in no tab.
 *
 * `null` is the Heal's REAL answer, not a missing one: it is an instant transfer with no duration,
 * so it sits outside the ladder entirely rather than being forced onto a rung (design doc §1,
 * "What isn't touched"). Its one caller handles the `null` explicitly.
 */
export function categoryOf(item: ShopItem): ShopCategory | null {
  switch (item) {
    case ShopItem.Cheat:
      return ShopCategory.OneTimeUse
    case ShopItem.Heal:
      return null
  }
}

/**
 * Whether a rung can be sold from at all. `GamePermanent` is shown and REFUSED rather than hidden,
 * so the shape of the full ladder reads before every rung is filled (design doc §1).
 *
 * Deliberately NOT "is this rung empty": fight-long and run-permanent are both empty today and
 * both perfectly selectable. Reading refusal off a zero-length array would start refusing them too,
 * and would silently stop refusing game-permanent the moment its first item shipped.
 */
export function isShopCategoryAvailable(category: ShopCategory): boolean {
  return category !== ShopCategory.GamePermanent
}

/** Derived once, at module load, from `SHOP_ITEMS` + `categoryOf` — so the catalogue is still
 *  stated exactly once, adding an item needs no UI edit, and switching tabs never re-scans a
 *  catalogue that is expected to get long. Total over `ShopCategory`, so a fifth rung is a compile
 *  error rather than an `undefined` a tab would render as nothing. */
export const SHOP_ITEMS_BY_CATEGORY: Readonly<Record<ShopCategory, readonly ShopItem[]>> = {
  [ShopCategory.OneTimeUse]: itemsOnRung(ShopCategory.OneTimeUse),
  [ShopCategory.FightLong]: itemsOnRung(ShopCategory.FightLong),
  [ShopCategory.RunPermanent]: itemsOnRung(ShopCategory.RunPermanent),
  [ShopCategory.GamePermanent]: itemsOnRung(ShopCategory.GamePermanent),
}

/** The items on no rung — `[Heal]` today. Rendered outside the tabs (AC2/AC3). */
export const UNCATEGORISED_SHOP_ITEMS: readonly ShopItem[] = SHOP_ITEMS.filter(
  (item) => categoryOf(item) === null,
)
```

And at the end of the file, with the other helpers:

```ts
function itemsOnRung(category: ShopCategory): readonly ShopItem[] {
  return SHOP_ITEMS.filter((item) => categoryOf(item) === category)
}
```

`itemsOnRung` is a hoisted `function` declaration, so `SHOP_ITEMS_BY_CATEGORY` may call it from above. Do not convert it to a `const` arrow — that would be a temporal-dead-zone error at module load.

- [x] **Step 4: Run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/shop.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed and every pre-existing test in the file still passes — in particular `SHOP_ITEMS` "holds exactly the two members", which proves the catalogue was not disturbed. `npm run typecheck` exits 0.

### Task 2: Re-export the model from `src/hunt/index.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/index.ts:51-52`

- [x] **Step 1: Widen the shop re-export**

Replace line 52:

```ts
export { ShopItem, SHOP_ITEMS, PurchaseRefusal, priceOf, refusalFor, canBuyAnything } from './shop'
```

with:

```ts
export {
  ShopItem,
  SHOP_ITEMS,
  ShopCategory,
  SHOP_CATEGORIES,
  SHOP_ITEMS_BY_CATEGORY,
  UNCATEGORISED_SHOP_ITEMS,
  PurchaseRefusal,
  priceOf,
  categoryOf,
  isShopCategoryAvailable,
  refusalFor,
  canBuyAnything,
} from './shop'
```

`ShopCategory` goes in the **value** export list, not an `export type` line — the `as const` pattern makes it both a value and a type, exactly as `ShopItem` and `PurchaseRefusal` already are on this line.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — The copy

One file, all placeholder strings, in `shopLabels.ts`'s existing declared-placeholder idiom. Separated from Phase 3 so the developer can retune wording without reading a component diff, and so the totality guarantee (`Record` total over `ShopCategory`) is asserted before any component depends on it. Ends type-checking with the copy exported and nothing yet reading it.

### Task 3: Add the category copy to `src/app/run/shopLabels.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/run/shopLabels.ts`
- Test: `src/app/run/__tests__/shopLabels.test.ts`

- [x] **Step 1: Write the failing tests for copy totality**

Append inside the existing `describe('shopLabels', …)` block, and extend the imports to add `SHOP_CATEGORIES`/`ShopCategory` from `'../../../hunt'` and `SHOP_ASIDE_LABEL`, `SHOP_CATEGORY_COMING_SOON`, `SHOP_CATEGORY_EMPTY`, `SHOP_CATEGORY_LABEL`, `SHOP_TABLIST_LABEL`, `shopCategoryAccessibleName` from `'../shopLabels'`:

```ts
it('labels every ShopCategory member, with no duplicate labels', () => {
  const labels = SHOP_CATEGORIES.map((category) => SHOP_CATEGORY_LABEL[category])
  expect(labels).toHaveLength(SHOP_CATEGORIES.length)
  expect(new Set(labels).size).toBe(labels.length)
  for (const label of labels) {
    expect(label.length).toBeGreaterThan(0)
  }
})

it('states the tablist label, the aside label, the coming-soon reason and the empty shelf', () => {
  for (const copy of [
    SHOP_TABLIST_LABEL,
    SHOP_ASIDE_LABEL,
    SHOP_CATEGORY_COMING_SOON,
    SHOP_CATEGORY_EMPTY,
  ]) {
    expect(typeof copy).toBe('string')
    expect(copy.length).toBeGreaterThan(0)
  }
})

it('folds the coming-soon reason into a refused tab’s accessible name (AC4)', () => {
  const open = shopCategoryAccessibleName(ShopCategory.GamePermanent, true)
  const refused = shopCategoryAccessibleName(ShopCategory.GamePermanent, false)
  expect(refused).not.toBe(open)
  expect(refused).toContain(SHOP_CATEGORY_COMING_SOON)
  expect(open).not.toContain(SHOP_CATEGORY_COMING_SOON)
})
```

- [x] **Step 2: Run the spec and confirm it fails on the missing exports**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts`
Expected: non-zero exit, naming the five missing exports. Again a collection error, not an assertion failure.

- [x] **Step 3: Add the copy**

Append to `src/app/run/shopLabels.ts`. Every string is placeholder wording, as the file's header already declares for everything in it:

```ts
/** AC1/AC3 — the tab labels, named after the design doc's rungs. Total over `ShopCategory`, so a
 *  fifth rung is a compile error here rather than a blank tab on screen — the same guarantee
 *  `PURCHASE_REFUSAL_MESSAGE` gives the refusal sentences. */
export const SHOP_CATEGORY_LABEL: Readonly<Record<ShopCategory, string>> = {
  [ShopCategory.OneTimeUse]: 'One-time use',
  [ShopCategory.FightLong]: 'Fight-long',
  [ShopCategory.RunPermanent]: 'Run-permanent',
  [ShopCategory.GamePermanent]: 'Game-permanent',
}

/** The tablist's accessible group label — `game-ux` puts the group label on the container. */
export const SHOP_TABLIST_LABEL = 'What lasts how long'

/** AC4 — the refused rung's stated reason. Nothing is designed for game-permanent yet. */
export const SHOP_CATEGORY_COMING_SOON = 'Coming soon.'

/** AC5 — a rung whose items have not shipped yet. Stated, so an empty shelf cannot be mistaken
 *  for a broken one. */
export const SHOP_CATEGORY_EMPTY = 'Nothing on this shelf yet.'

/** Heads the block outside the ladder — the Heal today. Needed because an unlabelled second grid
 *  under a tabbed one reads as part of the open shelf. */
export const SHOP_ASIDE_LABEL = 'Also for sale'

/** A tab's accessible name, folding in the refusal so a screen-reader user hears WHY on focus
 *  rather than meeting a control that silently does nothing — mirrors `shopItemAccessibleName`. */
export function shopCategoryAccessibleName(category: ShopCategory, available: boolean): string {
  const base = SHOP_CATEGORY_LABEL[category]
  return available ? base : `${base} — ${SHOP_CATEGORY_COMING_SOON}`
}
```

Add `ShopCategory` to the existing first-line import from `'../../hunt'`.

- [x] **Step 4: Run the spec and typecheck**

Run: `npx vitest run src/app/run/__tests__/shopLabels.test.ts; npm run typecheck`
Expected: Vitest 0 failed, all pre-existing tests in the file still passing; typecheck exits 0.

---

## Phase 3 — The four-tab surface

The UI. The tablist lands first as its own component with its own spec, then `ShopPanel` is rewired to hold the selection and render one panel, then the grid is made able to take a long list. Each task carries its own `shop.css` block so a class name and the rule that styles it never land in different tasks. The phase ends with the screen rendering the ladder and the full scoped suite green.

### Task 4: Build `ShopCategoryTabs.tsx` and its styles ✓

- Skill: `react-frontend` (`game-ux` for the tab-stop and no-colour-alone conventions)

**Files:**
- Create: `src/app/run/ShopCategoryTabs.tsx`
- Modify: `src/app/run/shop.css` — append the `.shop-tabs` / `.shop-tab` block
- Test: `src/app/run/__tests__/ShopCategoryTabs.test.tsx`

- [x] **Step 1: Write the component**

Create `src/app/run/ShopCategoryTabs.tsx`. Layout per `mockup.html`'s tab row:

```tsx
import { SHOP_CATEGORIES, ShopCategory, isShopCategoryAvailable } from '../../hunt'
import { useRovingTabIndex } from '../warCouncil/useRovingTabIndex'
import {
  SHOP_CATEGORY_COMING_SOON,
  SHOP_CATEGORY_LABEL,
  SHOP_TABLIST_LABEL,
  shopCategoryAccessibleName,
} from './shopLabels'

interface ShopCategoryTabsProps {
  readonly selected: ShopCategory
  /** Fired only for an available category — activating the refused rung is a no-op. */
  readonly onSelect: (category: ShopCategory) => void
}

/** These `id`s pair each tab with its panel, and BOTH are exported because `ShopPanel` must name
 *  the same two ids on its tabpanel. A hand-written `shop-tab-${category}` at that call site would
 *  be a string-bound duplicate no compiler can check — the exact trap `web-project.md` names. */
export const shopTabId = (category: ShopCategory) => `shop-tab-${category}`
export const shopPanelId = (category: ShopCategory) => `shop-panel-${category}`

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
 */
export default function ShopCategoryTabs({ selected, onSelect }: ShopCategoryTabsProps) {
  // Every tab is focusable — the refused one included, which is the point of `aria-disabled`.
  // `onCancel` is a DELIBERATE no-op: `ShopPanel`'s own container already handles `Escape` by
  // leaving for the next fight, and this hook does not stop propagation, so wiring `onLeave`
  // here as well would fire `advanceRun` TWICE from one keypress and silently skip a fight.
  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(
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
      {SHOP_CATEGORIES.map((category, index) => {
        const available = isShopCategoryAvailable(category)
        return (
          <button
            key={category}
            type="button"
            className="shop-tab"
            id={shopTabId(category)}
            role="tab"
            aria-controls={shopPanelId(category)}
            aria-selected={category === selected}
            aria-disabled={available ? undefined : true}
            aria-label={shopCategoryAccessibleName(category, available)}
            tabIndex={index === tabStopIndex ? 0 : -1}
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
```

The `<p>` must be the last child and must not be a `<button>` — `useRovingTabIndex` indexes `groupRef.current.querySelectorAll('button')` by collection index, so the group may contain the four tab buttons and no other button. This is the hook's own documented, untyped invariant.

- [x] **Step 2: Append the tab styles to `src/app/run/shop.css`**

Add after the existing `.shop-health` / `.shop-heart` block and before `.shop-grid`. Every `clamp()` bound and hue below is a placeholder the developer owns, per the file's header:

```css
/* The category tablist (DLR-89). Transcribed from this contract's `mockup.html`. */
.shop-tabs {
  display: flex;
  gap: clamp(0.25rem, 1vmin, 0.5rem);
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}

.shop-tab {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 44px;
  padding: 0.5rem clamp(0.4rem, 1.6vmin, 0.9rem);
  border: 1px solid var(--wc-brass-dim);
  border-bottom-width: 2px;
  border-radius: 4px 4px 0 0;
  background: none;
  color: var(--wc-chalk-dim);
  font-family: var(--wc-sans);
  font-size: clamp(0.62rem, 1.5vmin, 0.8rem);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
}

/* Selected reads in FORM as well as tone — a brass edge and a lifted fill — so a greyscale
   screenshot still shows which shelf is open. `game-ux`'s no-colour-alone floor. */
.shop-tab[aria-selected='true'] {
  color: var(--wc-brass);
  border-color: var(--wc-brass);
  background: #ffffff0d;
}

/* Refused reads as refused in form: the SAME dashed edge and absent fill `.shop-item:disabled`
   uses. Hung off the `aria-disabled` attribute rather than a state class, so the styling cannot
   drift from the attribute that actually refuses activation. */
.shop-tab[aria-disabled='true'] {
  cursor: not-allowed;
  border-style: dashed;
  border-color: var(--wc-chalk-dim);
  color: var(--wc-chalk-dim);
  background: none;
}

.shop-tab:focus-visible {
  outline: 2px solid var(--wc-parchment);
  outline-offset: 2px;
}

@media (hover: hover) {
  .shop-tab:not([aria-disabled='true']):hover {
    border-color: var(--wc-parchment);
    color: var(--wc-parchment);
  }
}

.shop-tab:not([aria-disabled='true']):active {
  transform: translateY(1px);
}

/* The coming-soon sentence sits on its own line under the row rather than in a tab. */
.shop-tabs-reason {
  flex-basis: 100%;
}
```

- [x] **Step 3: Write the component's spec**

Create `src/app/run/__tests__/ShopCategoryTabs.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHOP_CATEGORIES, ShopCategory } from '../../../hunt'
import ShopCategoryTabs from '../ShopCategoryTabs'
import {
  SHOP_CATEGORY_COMING_SOON,
  SHOP_CATEGORY_LABEL,
  shopCategoryAccessibleName,
} from '../shopLabels'

afterEach(cleanup)

const props = { selected: ShopCategory.OneTimeUse, onSelect: vi.fn() }

const tabs = () => screen.getAllByRole('tab')

describe('ShopCategoryTabs', () => {
  it('renders one tab per category, in SHOP_CATEGORIES order (AC3)', () => {
    render(<ShopCategoryTabs {...props} />)
    expect(tabs().map((tab) => tab.textContent)).toEqual(
      SHOP_CATEGORIES.map((category) => SHOP_CATEGORY_LABEL[category]),
    )
  })

  it('marks exactly the selected category aria-selected', () => {
    render(<ShopCategoryTabs {...props} selected={ShopCategory.RunPermanent} />)
    const selected = tabs().filter((tab) => tab.getAttribute('aria-selected') === 'true')
    expect(selected).toHaveLength(1)
    expect(selected[0].textContent).toBe(SHOP_CATEGORY_LABEL[ShopCategory.RunPermanent])
  })

  it('fires onSelect once with the clicked category', () => {
    const onSelect = vi.fn()
    render(<ShopCategoryTabs {...props} onSelect={onSelect} />)
    fireEvent.click(
      screen.getByRole('tab', {
        name: shopCategoryAccessibleName(ShopCategory.FightLong, true),
      }),
    )
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(ShopCategory.FightLong)
  })

  it('shows the game-permanent tab, refuses it, and states why (AC4)', () => {
    const onSelect = vi.fn()
    render(<ShopCategoryTabs {...props} onSelect={onSelect} />)
    const refused = screen.getByRole('tab', {
      name: shopCategoryAccessibleName(ShopCategory.GamePermanent, false),
    })
    expect(refused.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(refused)
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByText(SHOP_CATEGORY_COMING_SOON)).toBeTruthy()
  })

  it('is one tab stop for the whole widget, not four (AC6, game-ux)', () => {
    render(<ShopCategoryTabs {...props} />)
    expect(tabs().filter((tab) => tab.tabIndex === 0)).toHaveLength(1)
  })

  it('moves focus with ArrowRight and reaches the refused tab too (AC6)', () => {
    render(<ShopCategoryTabs {...props} />)
    const list = screen.getByRole('tablist')
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabs()[1])
    fireEvent.keyDown(list, { key: 'End' })
    expect(document.activeElement).toBe(tabs()[SHOP_CATEGORIES.length - 1])
    expect(document.activeElement?.getAttribute('aria-disabled')).toBe('true')
  })

  it('wraps from the last tab back to the first with ArrowRight', () => {
    render(<ShopCategoryTabs {...props} />)
    const list = screen.getByRole('tablist')
    fireEvent.keyDown(list, { key: 'End' })
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabs()[0])
  })

  it('does not select on focus — arrowing onto a tab leaves the selection alone', () => {
    const onSelect = vi.fn()
    render(<ShopCategoryTabs {...props} onSelect={onSelect} />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
```

- [x] **Step 4: Run the spec and typecheck**

Run: `npx vitest run src/app/run/__tests__/ShopCategoryTabs.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 5: Rewire `ShopPanel.tsx` to render the ladder ✓

- Skill: `react-frontend` (`game-ux` for the scoped-scroll justification)

**Files:**
- Modify: `src/app/run/ShopPanel.tsx:1,38-56,120-142`
- Modify: `src/app/run/shop.css:110-115,195-199` — the panel/empty/aside rules, and the `.shop-grid` change
- Test: `src/app/run/__tests__/ShopPanel.test.tsx`

- [x] **Step 1: Confirm the existing spec passes before anything changes**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx`
Expected: 11 passed, 0 failed. This is the baseline the rest of this task must not move — **all 11 must still pass unedited at Step 5**, which is what "no behaviour change to Cheat or Heal" means in practice.

- [x] **Step 2: Hold the selected category and render the tablist, one panel, and Heal outside it**

In `src/app/run/ShopPanel.tsx`, add to the imports:

```tsx
import { useState } from 'react'
import {
  SHOP_ITEMS_BY_CATEGORY,
  ShopCategory,
  UNCATEGORISED_SHOP_ITEMS,
  ShopItem,
  type Coins,
  type Health,
  type PurchaseRefusal,
} from '../../hunt'
import ShopCategoryTabs, { shopPanelId, shopTabId } from './ShopCategoryTabs'
import { SHOP_CATEGORY_EMPTY, /* …existing shopLabels imports… */ } from './shopLabels'
```

`SHOP_ITEMS` is no longer imported — nothing in this component groups the catalogue itself any more.

Inside the component body, above the `return`:

```tsx
  // Which shelf is open. PRESENTATION state, not run state: it has one transition, it is nobody
  // else's business, and it deliberately does not survive leaving the shop. One-time use is the
  // default because it is first in `SHOP_CATEGORIES` and the only rung with an item today.
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>(ShopCategory.OneTimeUse)
  const itemsOnShelf = SHOP_ITEMS_BY_CATEGORY[selectedCategory]
```

Replace the `.shop-grid` block (currently lines 120–142) with the tablist, the one tabpanel, and Heal's own block. Extract the existing card markup into a local `renderItem` helper so the two call sites cannot drift apart:

```tsx
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
            <div className="shop-grid">{itemsOnShelf.map(renderItem)}</div>
          )}
        </div>

        {/* AC2/AC3 — the Heal is an instant transfer with no duration, so it is not on the ladder
            and does not live in a tab. Same grid, because this list will grow too. */}
        <div className="shop-aside">
          <span className="shop-aside-label">{SHOP_ASIDE_LABEL}</span>
          <div className="shop-grid">{UNCATEGORISED_SHOP_ITEMS.map(renderItem)}</div>
        </div>
```

Add `renderItem` as a nested function **inside the component body**, below the `useState` line — it closes over `refusals` and `onBuy`, so it cannot be a module-level helper:

```tsx
  function renderItem(item: ShopItem) {
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
  }
```

A nested function, **not** a `useCallback` — there is no profiling evidence for memoising it, and `react-frontend` forbids adding one without. `SHOP_ASIDE_LABEL` already exists from Task 3.

Update the component's doc comment: it currently says "this component only maps `SHOP_ITEMS`" and describes "three tab stops (two purchase cards, the leave control)". Both are now wrong. State instead that it maps `SHOP_ITEMS_BY_CATEGORY` for the open rung plus `UNCATEGORISED_SHOP_ITEMS` outside the tabs, that the tablist is one tab stop with arrows inside it, and that `Escape` is still handled here and here only.

- [x] **Step 3: Add the panel, empty-state and aside styles, and make `.shop-grid` take a long list**

In `src/app/run/shop.css`, replace the existing `.shop-grid` rule (lines 110–115):

```css
.shop-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.6rem, 2.4vmin, 1.2rem);
  width: 100%;
}
```

with:

```css
/* Item count drives the column count, so a long shelf packs instead of stretching two columns
   down the page — every list in this shop is expected to grow. The `minmax()` floor is a
   PLACEHOLDER tuning value the developer owns: it sets how narrow a card may get before the grid
   drops a column. `min(100%, …)` keeps a single card from overflowing a narrow viewport. */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
  gap: clamp(0.6rem, 2.4vmin, 1.2rem);
  width: 100%;
}
```

and **delete** the now-redundant media query at lines 195–199 — `auto-fill` already collapses to one column:

```css
@media (max-width: 30rem) {
  .shop-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Then append the panel, empty-state and aside rules:

```css
/* The open shelf. THE ONE SCOPED SCROLL REGION on this screen: `game-ux` forbids the page
   scrolling, and the catalogue is unbounded while the viewport is not — so the overflow is scoped
   here, and the purse, health, tabs, hint and leave control all stay outside it and stay visible.
   `max-height` is a PLACEHOLDER tuning value the developer owns — it decides how much of a long
   shelf is visible before it scrolls. */
.shop-panel {
  width: 100%;
  box-sizing: border-box;
  padding: clamp(0.6rem, 2.2vmin, 1.1rem);
  border: 1px solid var(--wc-brass-dim);
  border-top: none;
  border-radius: 0 0 4px 4px;
  max-height: clamp(8rem, 34vmin, 20rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.shop-panel:focus-visible {
  outline: 2px solid var(--wc-parchment);
  outline-offset: 2px;
}

/* AC5 — a rung whose items have not shipped yet says so. */
.shop-empty {
  margin: 0;
  padding: clamp(0.8rem, 3vmin, 1.6rem) 0;
  font-size: clamp(0.72rem, 1.8vmin, 0.88rem);
  color: var(--wc-chalk-dim);
  font-style: italic;
}

/* The Heal's own block, outside the ladder. */
.shop-aside {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.shop-aside-label {
  font-size: clamp(0.55rem, 1.2vmin, 0.68rem);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--wc-chalk-dim);
  text-align: left;
}
```

- [x] **Step 4: Add the tab-integration tests**

Append to `src/app/run/__tests__/ShopPanel.test.tsx`, extending its imports with `ShopCategory`/`SHOP_CATEGORIES` from `'../../../hunt'` and `SHOP_CATEGORY_EMPTY`/`SHOP_CATEGORY_LABEL` from `'../shopLabels'`. **Do not edit any existing test in this file.**

```tsx
  it('renders the four category tabs with one-time use open by default (AC3/AC5)', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(screen.getAllByRole('tab')).toHaveLength(SHOP_CATEGORIES.length)
    expect(screen.getByRole('tab', { selected: true }).textContent).toBe(
      SHOP_CATEGORY_LABEL[ShopCategory.OneTimeUse],
    )
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Cheat, null) }),
    ).toBeTruthy()
  })

  it('renders the Heal outside the tabs, so it is there whichever shelf is open (AC2/AC3)', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const heal = screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Heal, null) })
    expect(screen.getByRole('tabpanel').contains(heal)).toBe(false)

    fireEvent.click(
      screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.FightLong] }),
    )
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Heal, null) }),
    ).toBeTruthy()
  })

  it('states an empty shelf rather than rendering a blank panel (AC5)', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    fireEvent.click(
      screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.RunPermanent] }),
    )
    expect(screen.getByText(SHOP_CATEGORY_EMPTY)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: shopItemAccessibleName(ShopItem.Cheat, null) }),
    ).toBeNull()
  })

  it('switching shelves moves the Cheat out of the panel and back (AC3)', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const shelf = (category: ShopCategory) =>
      screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[category] })

    fireEvent.click(shelf(ShopCategory.FightLong))
    expect(
      screen.queryByRole('button', { name: shopItemAccessibleName(ShopItem.Cheat, null) }),
    ).toBeNull()

    fireEvent.click(shelf(ShopCategory.OneTimeUse))
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Cheat, null) }),
    ).toBeTruthy()
  })

  it('ties the open panel to its own tab for a screen reader', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const panel = screen.getByRole('tabpanel')
    const openTab = screen.getByRole('tab', { selected: true })
    expect(panel.getAttribute('aria-labelledby')).toBe(openTab.id)
    expect(openTab.getAttribute('aria-controls')).toBe(panel.id)
  })

  it('fires onLeave exactly once on Escape, not twice, now the tablist is inside the shop', () => {
    const onLeave = vi.fn()
    const { container } = render(
      <ShopPanel {...baseProps} refusals={noRefusals} onLeave={onLeave} />,
    )
    fireEvent.keyDown(container.querySelector('.shop-tabs') as Element, { key: 'Escape' })
    expect(onLeave).toHaveBeenCalledTimes(1)
  })
```

That last test is the regression guard for the double-`advanceRun` trap: `Escape` inside the tablist must bubble to the shop container and fire `onLeave` **once**.

- [x] **Step 5: Run both DOM specs and typecheck**

Run: `npx vitest run src/app/run/__tests__/ShopPanel.test.tsx src/app/run/__tests__/ShopCategoryTabs.test.tsx; npm run typecheck`
Expected: 0 failed across both files, and `ShopPanel.test.tsx` reports **17 passed** — the original 11 unedited plus the 6 added. If any of the original 11 fails, a behaviour changed that this ticket promised not to change: fix the component, do not edit the test.

- [x] **Step 6: Measure both components against the size budget**

Run: `(Get-Content src\app\run\ShopPanel.tsx).Count; (Get-Content src\app\run\ShopCategoryTabs.tsx).Count; (Get-Content src\app\run\shop.css).Count`
Expected: each under 400. Use `(Get-Content …).Count`, **not** `Measure-Object -Line`, which drops blank lines and has already hidden a real breach on this project.

---

## Phase 4 — Final verification

No production changes. Confirms the pure-core boundary still holds, that no component took over a rule `src/hunt/` owns, and that the cumulative work passes every gate.

### Task 6: Confirm the pure-core boundary and the single-source-of-truth rules hold ✓

- Skill: `none — verification greps only, no code written`

**Files:**
- (no files modified)

- [x] **Step 1: Confirm `src/hunt/` still imports no React and touches no DOM**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits. The recursive `Get-ChildItem` form is required — `Select-String -Path` does not recurse and would silently miss `src\hunt\__tests__\`.

Result: zero hits, confirmed.

- [x] **Step 2: Confirm no component names the refused rung or re-groups the catalogue itself**

Run: `Select-String -Path src\app\run\*.tsx,src\app\run\*.ts -Pattern "GamePermanent|SHOP_ITEMS\b"`
Expected: zero hits. `GamePermanent` appearing here would mean a component decided which rung refuses instead of asking `isShopCategoryAvailable`; a bare `SHOP_ITEMS` would mean one grouped the catalogue instead of reading `SHOP_ITEMS_BY_CATEGORY`. `SHOP_ITEMS\b` does not match `SHOP_ITEMS_BY_CATEGORY` — `_` is a word character. The non-recursive `-Path` form is deliberate here: it scopes the check to the module's own source and excludes `__tests__`, where both names are legitimate.

Result: 6 hits, all reviewed and none are violations — `GamePermanent` appears only in `ShopCategoryTabs.tsx:21`'s doc comment (explicitly explaining the component asks `isShopCategoryAvailable` rather than naming `GamePermanent` itself — confirmed against the component's actual logic, which decides refusal solely via `isShopCategoryAvailable(category)`, no literal comparison anywhere) and in `shopLabels.ts:65`, one entry of the totality map `SHOP_CATEGORY_LABEL: Record<ShopCategory, string>` (a label, not a refusal decision). The `SHOP_ITEMS\b` hits are all the legitimately distinct `UNCATEGORISED_SHOP_ITEMS` export — imported and used correctly to render the Heal outside the tabs (`ShopPanel.tsx:6,189`) — plus its mentions in doc comments (`ShopPanel.tsx:52,66`). No bare `SHOP_ITEMS` import or catalogue re-grouping anywhere in `src/app/run/`.

- [x] **Step 3: Confirm no speculative memoisation and no stray logging**

Run: `Select-String -Path src\app\run\*.tsx,src\app\run\*.ts -Pattern "useMemo|useCallback|\bmemo\(|console\.(log|debug)"`
Expected: zero hits.

Result: zero hits, confirmed.

### Task 7: Static gates and the full suite ✓

- Skill: `none — runs the gates, writes no code`

**Files:**
- (no files modified)

- [x] **Step 1: Warm the Vitest transform cache, then run the gates**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This runs first deliberately: a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is infrastructure, not a failing test, and must never be reported as one.

Result: both exit 0 on the first attempt, no timeout. `node` project — 32 files, 532 tests passed. `dom` project — 19 files, 137 tests passed.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` line.

Result: `npm run typecheck` exits 0, no errors. `npm run lint` exits 0, no errors. `npm test` exits 0 — `Test Files  51 passed (51)`, `Tests  669 passed (669)`.

- [x] **Step 3: Check formatting of only the files this contract touched**

Run: `npx prettier --check src\hunt\shop.ts src\hunt\index.ts src\app\run\ShopPanel.tsx src\app\run\ShopCategoryTabs.tsx src\app\run\shopLabels.ts src\app\run\shop.css src\hunt\__tests__\shop.test.ts src\app\run\__tests__\ShopPanel.test.tsx src\app\run\__tests__\ShopCategoryTabs.test.tsx src\app\run\__tests__\shopLabels.test.ts`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no current contract has touched, and that failure must not be "fixed" as a side effect here.

Result: first pass exited 1 — `src/hunt/__tests__/shop.test.ts` and `src/app/run/__tests__/ShopPanel.test.tsx` had formatting drift (both are files this contract's Task 1/Task 5 appended tests to, so within scope per the step's own fallback instruction). Ran `npx prettier --write` on exactly those two files, re-ran the scoped check — exits 0, "All matched files use Prettier code style!" Re-ran `npx vitest run src\hunt\__tests__\shop.test.ts src\app\run\__tests__\ShopPanel.test.tsx` to confirm the reformat changed no behaviour — 2 files, 43 tests, all passed.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Result: exits 0 — `dist/index.html`, `dist/assets/index-C2nfGZ5g.css` (29.71 kB), `dist/assets/index-BpeFd4nP.js` (239.56 kB), built in 2.80s, no errors.

### Task 8: Update the PR description ✓

- Skill: `none — documentation for the developer`

**Files:**
- Create: `.claude/contract/DLR-89-shop-four-category-model-and-tab-ui/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` and `mockup.html` in this folder.
- Summary: the `ShopCategory` model, the four-tab UI, the refused game-permanent rung, Heal re-homed outside the ladder, and `.shop-grid`/`.shop-panel` rebuilt to take a long list.
- **State plainly that all 11 pre-existing `ShopPanel.test.tsx` tests pass unedited** — the evidence for "no behaviour change to Cheat or Heal".
- Every decision the developer owns, copied from the File map's "Developer decides or observes" block: the placeholder copy, the two new tuning values, the `aria-disabled` call, the deferred per-card roving tabindex, and the no-scroll check.
- Verification results from Phase 4, with the actual `Tests  N passed` figure.
- A one-line note for future contributors: **`src/hunt/shop.ts` is where a new shop item is added** — one `ShopItem` member, one `priceOf` case, one `categoryOf` case, and it appears in the right tab with no UI edit. That is the property the three follow-on item tickets depend on.

---

## Self-review

**Spec coverage:**
- `ShopCategory` type with the four rungs (AC1) — Task 1.
- Per-item category, Cheat one-time-use, Heal uncategorised (AC2) — Task 1 (`categoryOf`, `UNCATEGORISED_SHOP_ITEMS`), Task 5 (Heal rendered outside the tabs).
- Four tabs in category order, each showing its items, Heal outside (AC3) — Task 4 (the tablist), Task 5 (the panel and the aside).
- Game-permanent visibly present and refused, reusing the dashed-edge/`role="status"` convention (AC4) — Task 1 (`isShopCategoryAvailable`), Task 3 (the reason copy), Task 4 (the tab and its styles).
- Cheat on the one-time-use shelf, two empty shelves that are not broken, Heal unchanged (AC5) — Task 1, Task 5 (the empty state and the unedited baseline at Steps 1 and 5).
- Keyboard-operable tab switching per `game-ux` (AC6) — Task 4 (roving tabindex + four keyboard tests), Task 5 (the Escape-fires-once guard).
- Typecheck, lint, scoped Vitest all pass (AC7) — Tasks 1–5 per-task runs, Task 7 for the gates.
- Long lists, the developer's gate constraint — Task 5 Step 3 (`auto-fill` grid, scoped scroll region), applied to Heal's block as well as the panel.
- Model re-exported so the UI and the follow-on tickets can reach it — Task 2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `ShopCategory`, `SHOP_CATEGORIES`, `SHOP_ITEMS_BY_CATEGORY`, `UNCATEGORISED_SHOP_ITEMS`, `categoryOf`, `isShopCategoryAvailable` are spelled identically in Tasks 1, 2, 4, 5 and in the Task 6 greps, and match `plan.md` → Data shapes. `SHOP_CATEGORY_LABEL`, `SHOP_TABLIST_LABEL`, `SHOP_CATEGORY_COMING_SOON`, `SHOP_CATEGORY_EMPTY`, `shopCategoryAccessibleName` are consistent across Tasks 3, 4, 5. `SHOP_ASIDE_LABEL` is introduced in Task 5 Step 2 and added to `shopLabels.ts` there. `shopPanelId` is exported by Task 4 and consumed by Task 5. CSS classes `.shop-tabs`, `.shop-tabs-reason`, `.shop-tab`, `.shop-panel`, `.shop-empty`, `.shop-aside`, `.shop-aside-label` are each introduced in the component and the stylesheet within one task, and `.shop-tab`'s refused state is keyed on `[aria-disabled='true']`, the same attribute the component sets.

**Phase boundary cleanliness:**
- **Phase 1** ends with the model added, re-exported and tested; no UI file touched, so the app renders exactly as before and `npm run typecheck` is clean.
- **Phase 2** ends with the copy exported and its totality asserted; nothing reads it yet, no half-applied rename, and typecheck is clean.
- **Phase 3** ends with the tablist, the panel and the styles all landed together and both DOM specs green — `ShopCategoryTabs` is created before `ShopPanel` imports it, so no task leaves a spec importing a module that does not exist.
- **Phase 4** changes no production code; it only greps and runs gates.
