/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES, BuffTier, mintFromTemplate, type Buff, type BuffId } from '../../../hunt'
import { buffConditionSentence, buffName } from '../../warCouncil/buffLabels'
import { MotionAnchorProvider } from '../../warCouncil/MotionAnchors'
import ShopHeld from '../ShopHeld'
import { SHOP_HELD_EMPTY, SHOP_HELD_GROUP_LABEL, heldCountText } from '../shopLabels'

afterEach(cleanup)

function mint(templateIndex: number, tier: BuffTier, id: BuffId): Buff {
  return mintFromTemplate(BUFF_TEMPLATES[templateIndex], tier, id)
}

// DLR-157 Task 14 — `ShopHeld` now registers `PlaceKind.HeldTray` through `useMotionAnchor`, which
// throws outside a `MotionAnchorProvider` (`motionAnchorContext.ts`'s own guard). `ShopPanel.tsx`
// mounts the real one in production; every render here needs its own, the same collateral fix
// Phase 3 made for `BuffGallery.test.tsx` and `BuffRidingList`'s own callers.
function renderShopHeld(buffs: readonly Buff[], onManageBuffs = () => {}) {
  return render(
    <MotionAnchorProvider>
      <ShopHeld buffs={buffs} onManageBuffs={onManageBuffs} />
    </MotionAnchorProvider>,
  )
}

describe('ShopHeld — the "what you hold" tray', () => {
  it('says so plainly when nothing is held, and points at what to do about it', () => {
    renderShopHeld([])
    expect(screen.getByText(SHOP_HELD_EMPTY)).toBeTruthy()
    // No count renders when there is nothing to count — `game-ux` forbids a readout that exists
    // only to report nothing.
    expect(screen.queryByText(heldCountText(0))).toBeNull()
  })

  it('draws one card per pile and prints the COPY count in the heading', () => {
    const buffs = [
      mint(0, BuffTier.Bronze, 1),
      mint(0, BuffTier.Bronze, 2),
      mint(1, BuffTier.Gold, 3),
    ]
    renderShopHeld(buffs)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText(heldCountText(3))).toBeTruthy()
  })

  it('names each card the ONE way a buff is ever described, condition included', () => {
    const buff = mint(0, BuffTier.Silver, 1)
    renderShopHeld([buff])
    expect(screen.getByLabelText(`${buffName(buff)} — ${buffConditionSentence(buff)}`)).toBeTruthy()
  })

  it('states the held count on a pile of more than one, in the accessible name', () => {
    const buff = mint(0, BuffTier.Bronze, 1)
    renderShopHeld([buff, mint(0, BuffTier.Bronze, 2)])
    expect(
      screen.getByLabelText(`${buffName(buff)} — ${buffConditionSentence(buff)}, 2 held`),
    ).toBeTruthy()
  })

  it('renders no card as a button — nothing on a card here can be activated between fights', () => {
    renderShopHeld([mint(0, BuffTier.Bronze, 1)])
    // DLR-159 — the tray's OWN "Manage Buffs" control is a legitimate button; the card itself
    // (a `.wc-buffcard`) must not be one.
    expect(document.querySelector('button.wc-buffcard')).toBeNull()
  })

  it('groups itself under its own accessible label', () => {
    renderShopHeld([])
    expect(screen.getByRole('region', { name: SHOP_HELD_GROUP_LABEL })).toBeTruthy()
  })

  it('carries the tier as a numeral, so tier survives a greyscale screenshot', () => {
    renderShopHeld([mint(0, BuffTier.Gold, 1)])
    expect(document.querySelector('.wc-buffcard-tier')?.textContent).toBe('III')
  })
})
