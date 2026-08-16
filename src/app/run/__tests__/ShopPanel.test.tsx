/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PurchaseRefusal, ShopItem } from '../../../hunt'
import ShopPanel from '../ShopPanel'
import { shopItemAccessibleName } from '../shopLabels'

afterEach(cleanup)

const baseProps = {
  coins: 3,
  playerHealth: 6,
  maxPlayerHealth: 10,
  cheatCount: 1,
  cheatSlotCount: 2,
  nextOpponentName: 'The Monarch',
  progressText: 'Fight 2 of 3.',
  onBuy: vi.fn(),
  onLeave: vi.fn(),
}

const noRefusals: Readonly<Record<ShopItem, PurchaseRefusal | null>> = {
  [ShopItem.Cheat]: null,
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
    fireEvent.click(screen.getByRole('button', { name: shopItemAccessibleName(ShopItem.Heal, null) }))
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
    fireEvent.click(screen.getByRole('button', { name: 'Next fight' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('states the coming opponent, the coins and the health on the face of the screen (AC10)', () => {
    render(<ShopPanel {...baseProps} refusals={noRefusals} />)
    expect(screen.getByText(/The Monarch/)).toBeTruthy()
    expect(screen.getByRole('group', { name: /purse/i }).textContent).toContain('3')
    expect(screen.getByRole('group', { name: /purse/i }).textContent).toContain('6')
  })

  it('fires onLeave on Escape', () => {
    const onLeave = vi.fn()
    const { container } = render(<ShopPanel {...baseProps} refusals={noRefusals} onLeave={onLeave} />)
    const shop = container.querySelector('.shop') as Element
    fireEvent.keyDown(shop, { key: 'Escape' })
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('renders without crashing when the next opponent has no configured name', () => {
    render(<ShopPanel {...baseProps} nextOpponentName={undefined} refusals={noRefusals} />)
    expect(screen.getByRole('button', { name: 'Next fight' })).toBeTruthy()
  })
})
