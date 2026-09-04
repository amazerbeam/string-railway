/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUFF_TEMPLATES,
  BuffTier,
  mintFromTemplate,
  priceOf,
  SLOT_MACHINE_IDS,
  ShopItem,
  SlotMachineId,
  type Coins,
  type ShopStock,
  type SlotPullRefusal,
} from '../../../hunt'
import { ALL_BRONZE } from '../../../hunt/rankTiers'
import { HeartState } from '../../warCouncil/duelHealthBars'
import ShopPanel from '../ShopPanel'
import { SHOP_MANAGE_BUFFS_LABEL } from '../shopLabels'

afterEach(cleanup)

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

const baseStock: ShopStock = {
  coins: 3,
  playerHealth: 6,
  maxPlayerHealth: 10,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
}

const basePrices: Readonly<Record<ShopItem, Coins>> = {
  [ShopItem.Cheat]: priceOf(ShopItem.Cheat, baseStock),
  [ShopItem.Whetstone]: priceOf(ShopItem.Whetstone, baseStock),
  [ShopItem.Heal]: priceOf(ShopItem.Heal, baseStock),
  [ShopItem.ApCapacity]: priceOf(ShopItem.ApCapacity, baseStock),
  [ShopItem.SwanTier]: priceOf(ShopItem.SwanTier, baseStock),
  [ShopItem.WitchTier]: priceOf(ShopItem.WitchTier, baseStock),
  [ShopItem.MaxHealth]: priceOf(ShopItem.MaxHealth, baseStock),
}

const noRefusals = Object.fromEntries(
  Object.values(ShopItem).map((item) => [item, null]),
) as Record<ShopItem, null>

const baseProps = {
  coins: 3,
  playerHealth: 6,
  maxPlayerHealth: 10,
  playerHearts: heartsAt6of10,
  flaskCharges: 1,
  flaskRefusal: null,
  onDrinkFlask: vi.fn(),
  nextOpponentName: 'The Fox',
  progressText: '',
  refusals: noRefusals,
  prices: basePrices,
  onBuy: vi.fn(),
  onLeave: vi.fn(),
  slot: baseSlot,
}

describe('ShopPanel — the Manage Buffs entry control', () => {
  it('shows a Manage Buffs button, and clicking it calls onManageBuffs exactly once', () => {
    const onManageBuffs = vi.fn()
    render(
      <ShopPanel
        {...baseProps}
        heldBuffs={[mintFromTemplate(BUFF_TEMPLATES[0], BuffTier.Bronze, 1)]}
        onManageBuffs={onManageBuffs}
      />,
    )
    const button = screen.getByRole('button', { name: SHOP_MANAGE_BUFFS_LABEL })
    fireEvent.click(button)
    expect(onManageBuffs).toHaveBeenCalledOnce()
  })
})
