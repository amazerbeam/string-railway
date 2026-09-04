/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BUFF_TEMPLATES,
  BuffTier,
  FlaskRefusal,
  mintFromTemplate,
  priceOf,
  PurchaseRefusal,
  SHOP_ITEMS,
  ShopItem,
  SLOT_MACHINE_IDS,
  SlotMachineId,
  SlotOutcome,
  type Buff,
  type BuffId,
  type Coins,
  type ShopStock,
  type SlotPullRefusal,
} from '../../../hunt'
import { ALL_BRONZE } from '../../../hunt/rankTiers'
import { HeartState } from '../../warCouncil/duelHealthBars'
import ShopPanel from '../ShopPanel'
import { shopItemAccessibleName } from '../shopLabels'

afterEach(cleanup)

/** Mint a real card from a real template — `heldBuffs.test.ts`'s own precedent, never a hand-built
 *  literal. */
function mint(templateIndex: number, tier: BuffTier, id: BuffId): Buff {
  return mintFromTemplate(BUFF_TEMPLATES[templateIndex], tier, id)
}

const heartsAt6of10: readonly HeartState[] = [
  ...Array.from({ length: 6 }, () => HeartState.Whole),
  ...Array.from({ length: 4 }, () => HeartState.Broken),
]

const noSlotRefusal: SlotPullRefusal | null = null

const noRefusals: Readonly<Record<ShopItem, PurchaseRefusal | null>> = {
  [ShopItem.Cheat]: null,
  [ShopItem.Whetstone]: null,
  [ShopItem.Heal]: null,
  [ShopItem.ApCapacity]: null,
  [ShopItem.SwanTier]: null,
  [ShopItem.WitchTier]: null,
  [ShopItem.MaxHealth]: null,
}

/** The stock `priceOf` needs now that DLR-158 makes it stock-dependent. */
const baseStock: ShopStock = {
  coins: 10,
  playerHealth: 6,
  maxPlayerHealth: 10,
  rankTiers: ALL_BRONZE,
  maxHealthPurchases: 0,
}

/** Built the same way `noRefusals` is — one entry per `ShopItem`, read straight from `priceOf` so
 *  this fixture cannot drift from the rule it prices. */
const basePrices: Readonly<Record<ShopItem, Coins>> = {
  [ShopItem.Cheat]: priceOf(ShopItem.Cheat, baseStock),
  [ShopItem.Whetstone]: priceOf(ShopItem.Whetstone, baseStock),
  [ShopItem.Heal]: priceOf(ShopItem.Heal, baseStock),
  [ShopItem.ApCapacity]: priceOf(ShopItem.ApCapacity, baseStock),
  [ShopItem.SwanTier]: priceOf(ShopItem.SwanTier, baseStock),
  [ShopItem.WitchTier]: priceOf(ShopItem.WitchTier, baseStock),
  [ShopItem.MaxHealth]: priceOf(ShopItem.MaxHealth, baseStock),
}

function baseSlot(overrides: Partial<Parameters<typeof ShopPanel>[0]['slot']> = {}) {
  return {
    machineIds: SLOT_MACHINE_IDS,
    selectedMachineId: SlotMachineId.Skirmisher,
    onSelectMachine: vi.fn(),
    reel: [],
    pullPrice: 0,
    pullRefusal: noSlotRefusal,
    onPull: vi.fn(),
    lastPull: null,
    ...overrides,
  }
}

function baseProps(heldBuffs: readonly Buff[] = []) {
  return {
    coins: 10,
    playerHealth: 6,
    maxPlayerHealth: 10,
    playerHearts: heartsAt6of10,
    nextOpponentName: 'The Monarch',
    progressText: 'Fight 2 of 3.',
    flaskCharges: 1,
    flaskRefusal: null as FlaskRefusal | null,
    onDrinkFlask: vi.fn(),
    heldBuffs,
    onManageBuffs: vi.fn(),
    onBuy: vi.fn(),
    onLeave: vi.fn(),
    refusals: noRefusals,
    prices: basePrices,
    slot: baseSlot(),
  }
}

// DLR-157 Task 14 — M21 (a slot win) and M22 (a purchase) fly into the shop's held tray, through
// the SAME `useCardMotion` primitive the felt uses. jsdom supplies no Web Animations API and these
// tests never stub one (unlike `useCardMotion.test.tsx`), so every request here resolves through
// `runRequest`'s `typeof fromEl.animate !== 'function'` branch — the SAME instant-landing path an
// unresolvable anchor takes. That is deliberate: it is what proves both movements reach their end
// state whether or not the animation itself ran, and it doubles as the `prefers-reduced-motion`
// case, which takes the same "no clone, synchronous" contract by a different route.
describe('ShopPanel — M22, a purchase flies into the tray', () => {
  it('fires onBuy exactly once when an available control is clicked, and no clone is left in the document', () => {
    const onBuy = vi.fn()
    render(<ShopPanel {...baseProps()} onBuy={onBuy} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: shopItemAccessibleName(ShopItem.Heal, basePrices[ShopItem.Heal], null),
      }),
    )
    expect(onBuy).toHaveBeenCalledTimes(1)
    expect(onBuy).toHaveBeenCalledWith(ShopItem.Heal)
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
  })

  it('fires nothing when a disabled control is clicked', () => {
    const onBuy = vi.fn()
    const refusals = { ...noRefusals, [ShopItem.Heal]: PurchaseRefusal.AlreadyFullHealth }
    render(<ShopPanel {...baseProps()} refusals={refusals} onBuy={onBuy} />)
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

  it('the tray is never left empty — a held buff renders regardless of whether any flight ran', () => {
    const buff = mint(0, BuffTier.Bronze, 1)
    render(<ShopPanel {...baseProps([buff])} />)
    expect(document.querySelectorAll('.shop-held-card').length).toBe(1)
  })

  it('every SHOP_ITEMS control still renders (AC2 unaffected by the motion wiring)', () => {
    render(<ShopPanel {...baseProps()} />)
    for (const item of SHOP_ITEMS) {
      expect(
        screen.getByRole('button', { name: shopItemAccessibleName(item, basePrices[item], null) }),
      ).toBeTruthy()
    }
  })
})

describe('ShopPanel — a second click mid-flight (QA fix — DLR-157 review, Defender CRITICAL)', () => {
  interface StubAnimation {
    onfinish: (() => void) | null
    readonly cancel: () => void
  }
  let animations: StubAnimation[]
  const originalAnimate = Element.prototype.animate

  beforeEach(() => {
    animations = []
    Element.prototype.animate = vi.fn(function animate() {
      const cancel = vi.fn()
      const anim: StubAnimation = { onfinish: null, cancel }
      animations.push(anim)
      return anim as unknown as Animation
    }) as unknown as typeof Element.prototype.animate
  })

  afterEach(() => {
    // jsdom supplies no Web Animations API at all — every other describe block in this file
    // relies on `typeof fromEl.animate !== 'function'` for its instant-landing path, which this
    // stub would otherwise break for every test that runs after this block.
    Element.prototype.animate = originalAnimate
  })

  it('disables every buy control while a purchase is still airborne, so a second click cannot supersede and drop it', () => {
    const onBuy = vi.fn()
    render(<ShopPanel {...baseProps()} onBuy={onBuy} />)
    const button = screen.getByRole('button', {
      name: shopItemAccessibleName(ShopItem.Heal, basePrices[ShopItem.Heal], null),
    }) as HTMLButtonElement

    act(() => fireEvent.click(button))
    expect(onBuy).not.toHaveBeenCalled() // the commit is deferred to the flight's landing
    expect(button.disabled).toBe(true) // AC — mirrors useTableCardMotion's M1 guard

    // Clicking again while disabled reaches nothing — jsdom still fires DOM events on a disabled
    // button, so this proves the `disabled` attribute, not React's own click gate, is doing the
    // work `onClick` alone would not.
    act(() => fireEvent.click(button))

    act(() => animations[0]?.onfinish?.())
    expect(onBuy).toHaveBeenCalledTimes(1) // the commit still lands, exactly once
    expect(button.disabled).toBe(false)
  })
})

describe('ShopPanel — leaving mid-flight (QA fix — DLR-157 follow-up, Defender WARNING)', () => {
  interface StubAnimation {
    onfinish: (() => void) | null
    readonly cancel: () => void
  }
  let animations: StubAnimation[]
  const originalAnimate = Element.prototype.animate

  beforeEach(() => {
    animations = []
    Element.prototype.animate = vi.fn(function animate() {
      const cancel = vi.fn()
      const anim: StubAnimation = { onfinish: null, cancel }
      animations.push(anim)
      return anim as unknown as Animation
    }) as unknown as typeof Element.prototype.animate
  })

  afterEach(() => {
    Element.prototype.animate = originalAnimate
  })

  it('blocks the Leave button while a purchase is still airborne, and re-enables it once the flight lands', () => {
    const onBuy = vi.fn()
    const onLeave = vi.fn()
    render(<ShopPanel {...baseProps()} onBuy={onBuy} onLeave={onLeave} />)
    const buyButton = screen.getByRole('button', {
      name: shopItemAccessibleName(ShopItem.Heal, basePrices[ShopItem.Heal], null),
    })
    const leaveButton = screen.getByRole('button', {
      name: 'Fight The Monarch',
    }) as HTMLButtonElement

    act(() => fireEvent.click(buyButton))
    expect(leaveButton.disabled).toBe(true)

    // A click reaching the disabled control must not fire onLeave — jsdom still dispatches the
    // event on a disabled button, so this proves the `disabled` attribute is doing the work.
    act(() => fireEvent.click(leaveButton))
    expect(onLeave).not.toHaveBeenCalled()

    act(() => animations[0]?.onfinish?.())
    expect(onBuy).toHaveBeenCalledTimes(1) // the purchase's commit still lands
    expect(leaveButton.disabled).toBe(false)

    fireEvent.click(leaveButton)
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while a purchase is still airborne, and honours it once the flight lands', () => {
    const onBuy = vi.fn()
    const onLeave = vi.fn()
    const { container } = render(<ShopPanel {...baseProps()} onBuy={onBuy} onLeave={onLeave} />)
    const buyButton = screen.getByRole('button', {
      name: shopItemAccessibleName(ShopItem.Heal, basePrices[ShopItem.Heal], null),
    })
    const shell = container.querySelector('.shop-shell') as HTMLElement

    act(() => fireEvent.click(buyButton))
    fireEvent.keyDown(shell, { key: 'Escape' })
    expect(onLeave).not.toHaveBeenCalled()

    act(() => animations[0]?.onfinish?.())
    expect(onBuy).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(shell, { key: 'Escape' })
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('leaves normally when no flight is airborne — the gate never gets permanently stuck', () => {
    const onLeave = vi.fn()
    render(<ShopPanel {...baseProps()} onLeave={onLeave} />)
    const leaveButton = screen.getByRole('button', {
      name: 'Fight The Monarch',
    }) as HTMLButtonElement
    expect(leaveButton.disabled).toBe(false)

    fireEvent.click(leaveButton)
    expect(onLeave).toHaveBeenCalledTimes(1)
  })
})

describe('ShopPanel — M21, a slot win flies into the tray', () => {
  it('reaches its end state when a pull awards a buff that then appears in heldBuffs, with no clone left behind', () => {
    const award = mint(0, BuffTier.Gold, 7)
    const { rerender } = render(<ShopPanel {...baseProps([])} />)

    // The parent commits the pull's award into `RunState.buffs` and re-renders with both the new
    // `heldBuffs` and the `lastPull` that named it — the same single-tick shape
    // `useShopSlot.pull` produces (`setLastPull` and `onRun` fire together).
    rerender(
      <ShopPanel
        {...baseProps([award])}
        slot={baseSlot({
          lastPull: {
            symbols: [BUFF_TEMPLATES[0]],
            outcome: SlotOutcome.ThreeMatch,
            awards: [award],
            rawAwards: [{ template: BUFF_TEMPLATES[0], tier: BuffTier.Gold }],
          },
        })}
      />,
    )

    expect(document.querySelectorAll('.shop-held-card').length).toBe(1)
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
  })

  it('does not fly a buff that arrived through a purchase, not a pull — awards names only what actually won', () => {
    const purchased = mint(0, BuffTier.Bronze, 3)
    const { rerender } = render(<ShopPanel {...baseProps([])} />)

    // Nothing in `slot.lastPull.awards` names this id — the diff watcher must not mistake a
    // purchase for a win.
    rerender(<ShopPanel {...baseProps([purchased])} />)

    expect(document.querySelectorAll('.shop-held-card').length).toBe(1)
    expect(document.querySelectorAll('.wc-card-flyer').length).toBe(0)
  })
})
