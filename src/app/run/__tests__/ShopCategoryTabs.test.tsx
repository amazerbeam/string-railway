/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHOP_CATEGORIES, ShopCategory } from '../../../hunt'
import ShopCategoryTabs from '../ShopCategoryTabs'
import {
  SHOP_CATEGORY_COMING_SOON,
  SHOP_CATEGORY_LABEL,
  shopCategoryAccessibleName,
  shopPanelId,
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

  it('keeps the tab stop on the actually-selected tab after a mouse click, not the last keyboard-focused one (regression)', () => {
    // Clicking never moves the hook's own keyboard-tracked index — the rendered tab stop must be
    // sourced from `selected` itself, or Shift+Tab back into the tablist lands on the wrong tab.
    const onSelect = vi.fn()
    const { rerender } = render(<ShopCategoryTabs {...props} onSelect={onSelect} />)
    fireEvent.click(
      screen.getByRole('tab', {
        name: shopCategoryAccessibleName(ShopCategory.FightLong, true),
      }),
    )
    // A real parent (`ShopPanel`) is controlled: `onSelect` flows back in as `selected`.
    rerender(<ShopCategoryTabs {...props} onSelect={onSelect} selected={ShopCategory.FightLong} />)
    const tabStops = tabs().filter((tab) => tab.tabIndex === 0)
    expect(tabStops).toHaveLength(1)
    expect(tabStops[0].textContent).toBe(SHOP_CATEGORY_LABEL[ShopCategory.FightLong])
  })

  it('sets aria-controls only on the selected tab — the other three panels never mount (regression)', () => {
    render(<ShopCategoryTabs {...props} selected={ShopCategory.RunPermanent} />)
    const selectedTab = screen.getByRole('tab', {
      name: shopCategoryAccessibleName(ShopCategory.RunPermanent, true),
    })
    expect(selectedTab.getAttribute('aria-controls')).toBe(shopPanelId(ShopCategory.RunPermanent))
    for (const tab of tabs().filter((candidate) => candidate !== selectedTab)) {
      expect(tab.hasAttribute('aria-controls')).toBe(false)
    }
  })
})
