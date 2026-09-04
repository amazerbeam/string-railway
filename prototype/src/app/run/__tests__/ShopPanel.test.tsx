/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FlaskRefusal,
  flaskHealAmount,
  priceOf,
  PurchaseRefusal,
  SLOT_MACHINE_IDS,
  SHOP_ITEMS,
  ShopItem,
  SlotMachineId,
  type Buff,
  type Coins,
  type ShopStock,
  type SlotPullRefusal,
} from '../../../hunt'
import { ALL_BRONZE } from '../../../hunt/rankTiers'
import { HeartState } from '../../warCouncil/duelHealthBars'
import ShopPanel from '../ShopPanel'
import { fightLabel } from '../runLabels'
import {
  flaskAccessibleName,
  flaskChargesText,
  FLASK_REFUSAL_MESSAGE,
  SHOP_FLASK_GROUP_LABEL,
  shopItemAccessibleName,
} from '../shopLabels'

afterEach(cleanup)

/** Six whole then four broken — the shape `duelHealthBars` produces for 6 of 10 health. */
const heartsAt6of10: readonly HeartState[] = [
  ...Array.from({ length: 6 }, () => HeartState.Whole),
  ...Array.from({ length: 4 }, () => HeartState.Broken),
]

const noSlotRefusal: SlotPullRefusal | null = null

const baseSlot = {
  machineIds: SLOT_MACHINE_IDS,
  selectedMachineId: SlotMachineId.Skirmisher,
  onSelectMachine: vi.fn(),
  reel: [],
  pullPrice: 0,
  pullRefusal: noSlotRefusal,
  onPull: vi.fn(),
  lastPull: null,
}

/** The stock `priceOf` needs now that DLR-158 makes it stock-dependent. Fresh run, no max-health
 *  purchases yet — matches `basePrices` below being the FIRST purchase's price. */
const baseStock: ShopStock = {
  coins: 3,
  playerHealth: 6,
  maxPlayerHealth: 10,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
}

/** Built the same way `noRefusals` below is — one entry per `ShopItem`, read straight from
 *  `priceOf` so this fixture cannot drift from the rule it prices. */
const basePrices: Readonly<Record<ShopItem, Coins>> = {
  [ShopItem.Cheat]: priceOf(ShopItem.Cheat, baseStock),
  [ShopItem.Whetstone]: priceOf(ShopItem.Whetstone, baseStock),
  [ShopItem.Heal]: priceOf(ShopItem.Heal, baseStock),
  [ShopItem.ApCapacity]: priceOf(ShopItem.ApCapacity, baseStock),
  [ShopItem.SwanTier]: priceOf(ShopItem.SwanTier, baseStock),
  [ShopItem.WitchTier]: priceOf(ShopItem.WitchTier, baseStock),
  [ShopItem.MaxHealth]: priceOf(ShopItem.MaxHealth, baseStock),
}

const baseProps = {
  coins: 3,
  playerHealth: 6,
  maxPlayerHealth: 10,
  playerHearts: heartsAt6of10,
  nextOpponentName: 'The Monarch',
  progressText: 'Fight 2 of 3.',
  flaskCharges: 1,
  flaskRefusal: null as FlaskRefusal | null,
  onDrinkFlask: vi.fn(),
  /** Empty by default — the tray's own behaviour is covered in `ShopHeld.test.tsx`; here it only
   *  has to be a valid prop. */
  heldBuffs: [] as readonly Buff[],
  onManageBuffs: vi.fn(),
  onBuy: vi.fn(),
  onLeave: vi.fn(),
  slot: baseSlot,
  /** DLR-158 — every `render(<ShopPanel {...baseProps} .../>)` call in this file carries this,
   *  exactly as it already carries `refusals` via each call's own explicit prop. */
  prices: basePrices,
}

const noRefusals: Readonly<Record<ShopItem, PurchaseRefusal | null>> = {
  [ShopItem.Cheat]: null,
  [ShopItem.Whetstone]: null,
  [ShopItem.Heal]: null,
  [ShopItem.ApCapacity]: null,
  [ShopItem.SwanTier]: null,
  [ShopItem.WitchTier]: null,
  [ShopItem.MaxHealth]: null,
}

describe('ShopPanel', () => {
  it('renders exactly SHOP_ITEMS.length purchase controls, queried by their accessible name (AC2)', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    // DLR-122 refilled the run-permanent rung, so the offered list is four rather than two.
    // Driven off `SHOP_ITEMS` itself rather than a transcribed roster, so adding or removing an
    // item is a one-line change in `shop.ts` and no edit here.
    for (const item of SHOP_ITEMS) {
      expect(
        screen.getByRole('button', { name: shopItemAccessibleName(item, basePrices[item], null) }),
      ).toBeTruthy()
    }
    expect(screen.getAllByRole('button', { name: /coin/ })).toHaveLength(SHOP_ITEMS.length)
  })

  it('DLR-158 — the Heal tile still reads "1 coin" and its accessible name is unchanged by the prices prop', () => {
    const { container } = render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(basePrices[ShopItem.Heal]).toBe(1)
    const healButton = screen.getByRole('button', {
      name: shopItemAccessibleName(ShopItem.Heal, basePrices[ShopItem.Heal], null),
    })
    expect(healButton.getAttribute('aria-label')).toBe('Heal — 1 coin')
    expect(container.querySelector('.shop-buy-price')?.textContent).toBe('1 coin')
  })

  it('names no button, tab or text after Cheat or Whetstone (AC3)', () => {
    const { container } = render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    const forbidden = ['Cheat', 'Whetstone']
    for (const word of forbidden) {
      expect(container.textContent).not.toContain(word)
    }
  })

  it('renders no tab and no tabpanel — the category ladder is gone', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryAllByRole('tabpanel')).toHaveLength(0)
  })

  it('disables a control that carries a refusal, and states the reason in the document', () => {
    const refusals = { ...noRefusals, [ShopItem.Heal]: PurchaseRefusal.AlreadyFullHealth }
    render(<ShopPanel {...baseProps} refusals={refusals} />)
    const button = screen.getByRole('button', {
      name: shopItemAccessibleName(
        ShopItem.Heal,
        basePrices[ShopItem.Heal],
        PurchaseRefusal.AlreadyFullHealth,
      ),
    })
    expect(button).toHaveProperty('disabled', true)
    expect(screen.getByText('You are already at full health.')).toBeTruthy()
  })

  it('fires onBuy exactly once with the right ShopItem when an available control is clicked', () => {
    const onBuy = vi.fn()
    render(<ShopPanel {...baseProps} refusals={noRefusals} onBuy={onBuy} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: shopItemAccessibleName(ShopItem.Heal, basePrices[ShopItem.Heal], null),
      }),
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
        name: shopItemAccessibleName(
          ShopItem.Heal,
          basePrices[ShopItem.Heal],
          PurchaseRefusal.AlreadyFullHealth,
        ),
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

  it('states the coming opponent and the coins on the face of the screen (AC10); no Action points cell (DLR-145 AC3)', () => {
    const { container } = render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(container.querySelector('.shop-next')?.textContent).toContain('The Monarch')
    const purse = screen.getByRole('group', { name: /purse/i })
    expect(purse.textContent).toContain('3')
    expect(purse.textContent).not.toContain('Action points')
  })

  it('states the health on the meter', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
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

  it('fires onLeave on Escape', () => {
    const onLeave = vi.fn()
    const { container } = render(
      <ShopPanel {...baseProps} refusals={noRefusals} onLeave={onLeave} />,
    )
    const shop = container.querySelector('.shop-shell') as Element
    fireEvent.keyDown(shop, { key: 'Escape' })
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('renders without crashing when the next opponent has no configured name', () => {
    render(<ShopPanel {...baseProps} nextOpponentName={undefined} refusals={noRefusals} />)
    expect(screen.getByRole('button', { name: 'Next fight' })).toBeTruthy()
  })

  it('mounts the slot section — a nameplate at the one-machine roster, and a pull control', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    // Strongbox is cut, so the marquee is a nameplate and there is nothing to choose.
    expect(SLOT_MACHINE_IDS).toHaveLength(1)
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /pull/i })).toBeTruthy()
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

// A two-match / three-match result is exercised on `SlotMachinePanel.test.tsx` directly — this
// file only proves `ShopPanel` mounts the section, per its own file list.
