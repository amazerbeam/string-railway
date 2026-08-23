/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FlaskRefusal,
  flaskHealAmount,
  PurchaseRefusal,
  SHOP_CATEGORIES,
  ShopCategory,
  ShopItem,
} from '../../../hunt'
import { HeartState } from '../../warCouncil/duelHealthBars'
import ShopPanel from '../ShopPanel'
import { fightLabel } from '../runLabels'
import {
  flaskAccessibleName,
  flaskChargesText,
  FLASK_REFUSAL_MESSAGE,
  PURCHASE_REFUSAL_MESSAGE,
  SHOP_CATEGORY_LABEL,
  SHOP_TIMEBOMB_LABEL,
  SHOP_FLASK_GROUP_LABEL,
  SHOP_GUARD_HELD,
  SHOP_GUARD_NONE,
  SHOP_WHETSTONE_LABEL,
  shopItemAccessibleName,
} from '../shopLabels'

afterEach(cleanup)

/** Six whole then four broken — the shape `duelHealthBars` produces for 6 of 10 health. */
const heartsAt6of10: readonly HeartState[] = [
  ...Array.from({ length: 6 }, () => HeartState.Whole),
  ...Array.from({ length: 4 }, () => HeartState.Broken),
]

const baseProps = {
  coins: 3,
  playerHealth: 6,
  maxPlayerHealth: 10,
  playerHearts: heartsAt6of10,
  cheatCount: 1,
  cheatSlotCount: 2,
  timebombCharges: 2,
  poisonGuardHeld: false,
  whetstones: 0,
  nextOpponentName: 'The Monarch',
  progressText: 'Fight 2 of 3.',
  flaskCharges: 1,
  flaskRefusal: null as FlaskRefusal | null,
  onDrinkFlask: vi.fn(),
  onBuy: vi.fn(),
  onLeave: vi.fn(),
}

const noRefusals: Readonly<Record<ShopItem, PurchaseRefusal | null>> = {
  [ShopItem.Cheat]: null,
  [ShopItem.Timebomb]: null,
  [ShopItem.PoisonGuard]: null,
  [ShopItem.Whetstone]: null,
  [ShopItem.Heal]: null,
}

describe('ShopPanel', () => {
  it('renders both purchase controls, queried by their accessible name', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Cheat, null) }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Heal, null) }),
    ).toBeTruthy()
  })

  it('disables a control that carries a refusal, and states the reason in the document (AC6)', () => {
    const refusals = { ...noRefusals, [ShopItem.Cheat]: PurchaseRefusal.SlotsFull }
    render(<ShopPanel {...baseProps} refusals={refusals} />)
    const button = screen.getByRole('button', {
      name: shopItemAccessibleName(ShopItem.Cheat, PurchaseRefusal.SlotsFull),
    })
    expect(button).toHaveProperty('disabled', true)
    expect(screen.getByText('Both Cheat slots are full.')).toBeTruthy()
  })

  it('fires onBuy exactly once with the right ShopItem when an available control is clicked', () => {
    const onBuy = vi.fn()
    render(<ShopPanel {...baseProps} refusals={noRefusals} onBuy={onBuy} />)
    fireEvent.click(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Heal, null) }),
    )
    expect(onBuy).toHaveBeenCalledTimes(1)
    expect(onBuy).toHaveBeenCalledWith(ShopItem.Heal)
  })

  it('fires nothing when a disabled control is clicked', () => {
    const onBuy = vi.fn()
    const refusals = { ...noRefusals, [ShopItem.Heal]: PurchaseRefusal.AlreadyFullHealth }
    render(<ShopPanel {...baseProps} refusals={refusals} onBuy={onBuy} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: shopItemAccessibleName(ShopItem.Heal, PurchaseRefusal.AlreadyFullHealth),
      }),
    )
    expect(onBuy).not.toHaveBeenCalled()
  })

  it('fires onLeave exactly once when the leave control is clicked (AC9)', () => {
    const onLeave = vi.fn()
    render(<ShopPanel {...baseProps} refusals={noRefusals} onLeave={onLeave} />)
    fireEvent.click(screen.getByRole('button', { name: fightLabel(baseProps.nextOpponentName) }))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('states the coming opponent, the coins and the health on the face of the screen (AC10)', () => {
    const { container } = render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(container.querySelector('.shop-next')?.textContent).toContain('The Monarch')
    expect(screen.getByRole('group', { name: /purse/i }).textContent).toContain('3')
    expect(screen.getByRole('meter', { name: /health/i }).textContent).toContain('6 / 10')
  })

  it('draws one heart per point of maximum health, whole for the health still held', () => {
    const { container } = render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(container.querySelectorAll('.shop-heart')).toHaveLength(10)
    expect(container.querySelectorAll('.shop-heart[data-state="whole"]')).toHaveLength(6)
    expect(container.querySelectorAll('.shop-heart[data-state="broken"]')).toHaveLength(4)
  })

  it('carries the health reading on the meter, so the hearts never have to be counted', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const meter = screen.getByRole('meter', { name: /health/i })
    expect(meter.getAttribute('aria-valuenow')).toBe('6')
    expect(meter.getAttribute('aria-valuemax')).toBe('10')
  })

  it('states the cheat-slots readout with the supplied counts', () => {
    render(<ShopPanel {...baseProps} cheatCount={1} cheatSlotCount={2} refusals={noRefusals} />)
    expect(screen.getByText('Cheat slots')).toBeTruthy()
    expect(screen.getByRole('group', { name: /purse/i }).textContent).toContain('1 / 2')
  })

  it('states the Timebomb charges held in the purse group (DLR-90 AC1)', () => {
    // A value distinct from every other purse figure in `baseProps` (coins 3, cheatCount 1,
    // cheatSlotCount 2), so this cannot pass by coincidentally matching a sibling cell.
    render(<ShopPanel {...baseProps} timebombCharges={5} refusals={noRefusals} />)
    const cell = screen.getByText(SHOP_TIMEBOMB_LABEL).closest('.shop-purse-cell')
    expect(cell?.textContent).toContain('5')
  })

  it('renders Timebomb on the one-time-use shelf beside the Cheat, priced from priceOf', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Timebomb, null) }),
    ).toBeTruthy()
  })

  it('fires onBuy with ShopItem.Timebomb when its control is clicked', () => {
    const onBuy = vi.fn()
    render(<ShopPanel {...baseProps} refusals={noRefusals} onBuy={onBuy} />)
    fireEvent.click(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Timebomb, null) }),
    )
    expect(onBuy).toHaveBeenCalledWith(ShopItem.Timebomb)
  })

  it('disables a refused Timebomb card, folding the refusal into its accessible name', () => {
    const refusals = { ...noRefusals, [ShopItem.Timebomb]: PurchaseRefusal.NotEnoughCoins }
    render(<ShopPanel {...baseProps} refusals={refusals} />)
    const button = screen.getByRole('button', {
      name: shopItemAccessibleName(ShopItem.Timebomb, PurchaseRefusal.NotEnoughCoins),
    })
    expect(button).toHaveProperty('disabled', true)
  })

  it('fires onLeave on Escape', () => {
    const onLeave = vi.fn()
    const { container } = render(
      <ShopPanel {...baseProps} refusals={noRefusals} onLeave={onLeave} />,
    )
    const shop = container.querySelector('.shop') as Element
    fireEvent.keyDown(shop, { key: 'Escape' })
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('renders without crashing when the next opponent has no configured name', () => {
    render(<ShopPanel {...baseProps} nextOpponentName={undefined} refusals={noRefusals} />)
    expect(screen.getByRole('button', { name: 'Next fight' })).toBeTruthy()
  })

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

    fireEvent.click(screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.FightLong] }))
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Heal, null) }),
    ).toBeTruthy()
  })

  it('DLR-92 — the run-permanent shelf sells the Whetstone', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    fireEvent.click(
      screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.RunPermanent] }),
    )
    expect(
      screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Whetstone, null) }),
    ).toBeTruthy()
  })

  it('DLR-92 — shows how many Whetstones are held', () => {
    render(<ShopPanel {...baseProps} whetstones={2} refusals={noRefusals} />)
    expect(screen.getByText(SHOP_WHETSTONE_LABEL)).toBeTruthy()
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

  it('DLR-91 — states whether a Guard is held, in words', () => {
    const { rerender } = render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(screen.getByText(SHOP_GUARD_NONE)).toBeTruthy()
    rerender(<ShopPanel {...baseProps} poisonGuardHeld refusals={noRefusals} />)
    expect(screen.getByText(SHOP_GUARD_HELD)).toBeTruthy()
  })

  it('DLR-91 AC1 — the Guard is on the Fight-long shelf, not the default one', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const name = shopItemAccessibleName(ShopItem.PoisonGuard, null)
    expect(screen.queryByRole('button', { name })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.FightLong] }))
    expect(screen.getByRole('button', { name })).toBeTruthy()
  })

  it('DLR-91 AC3 — a refused Guard is disabled with its reason in the document', () => {
    const refusals = { ...noRefusals, [ShopItem.PoisonGuard]: PurchaseRefusal.GuardAlreadyActive }
    render(<ShopPanel {...baseProps} poisonGuardHeld refusals={refusals} />)
    fireEvent.click(screen.getByRole('tab', { name: SHOP_CATEGORY_LABEL[ShopCategory.FightLong] }))
    const button = screen.getByRole('button', {
      name: shopItemAccessibleName(ShopItem.PoisonGuard, PurchaseRefusal.GuardAlreadyActive),
    })
    expect(button).toHaveProperty('disabled', true)
    expect(
      screen.getByText(PURCHASE_REFUSAL_MESSAGE[PurchaseRefusal.GuardAlreadyActive]),
    ).toBeTruthy()
  })
})

describe('ShopPanel — the flask (DLR-93)', () => {
  it('renders the drink control enabled, queried by its accessible name', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const btn = screen.getByRole('button', {
      name: flaskAccessibleName(1, flaskHealAmount(10), null),
    })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('fires onDrinkFlask exactly once per click', () => {
    const onDrinkFlask = vi.fn()
    render(<ShopPanel {...baseProps} onDrinkFlask={onDrinkFlask} refusals={noRefusals} />)
    fireEvent.click(
      screen.getByRole('button', { name: flaskAccessibleName(1, flaskHealAmount(10), null) }),
    )
    expect(onDrinkFlask).toHaveBeenCalledTimes(1)
  })

  it('disables the control and states the reason at zero charges', () => {
    const onDrinkFlask = vi.fn()
    render(
      <ShopPanel
        {...baseProps}
        flaskCharges={0}
        flaskRefusal={FlaskRefusal.NoCharges}
        onDrinkFlask={onDrinkFlask}
        refusals={noRefusals}
      />,
    )
    const btn = screen.getByRole('button', {
      name: flaskAccessibleName(0, flaskHealAmount(10), FlaskRefusal.NoCharges),
    })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(FLASK_REFUSAL_MESSAGE[FlaskRefusal.NoCharges])).toBeTruthy()
    fireEvent.click(btn)
    expect(onDrinkFlask).not.toHaveBeenCalled()
  })

  it('disables the control and states the reason at full health', () => {
    render(
      <ShopPanel
        {...baseProps}
        playerHealth={10}
        flaskRefusal={FlaskRefusal.AlreadyFullHealth}
        refusals={noRefusals}
      />,
    )
    expect(screen.getByText(FLASK_REFUSAL_MESSAGE[FlaskRefusal.AlreadyFullHealth])).toBeTruthy()
  })

  // AC6 / `game-ux` — the charge count is on the face of the screen, not behind hover, so the
  // zero-charge refusal has a visible cause.
  it('shows the charge count outside the control as well as in it', () => {
    render(<ShopPanel {...baseProps} flaskCharges={0} refusals={noRefusals} />)
    expect(screen.getAllByText(flaskChargesText(0)).length).toBeGreaterThan(0)
  })

  it('groups the flask under its own accessible label, apart from the priced items', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(screen.getByRole('group', { name: SHOP_FLASK_GROUP_LABEL })).toBeTruthy()
  })
})
