/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES, BuffTier, mintFromTemplate, type Buff, type BuffId } from '../../../hunt'
import { buffConditionSentence, buffName } from '../../warCouncil/buffLabels'
import ShopHeld from '../ShopHeld'
import { SHOP_HELD_EMPTY, SHOP_HELD_GROUP_LABEL, heldCountText } from '../shopLabels'

afterEach(cleanup)

function mint(templateIndex: number, tier: BuffTier, id: BuffId): Buff {
  return mintFromTemplate(BUFF_TEMPLATES[templateIndex], tier, id)
}

describe('ShopHeld — the "what you hold" tray', () => {
  it('says so plainly when nothing is held, and points at what to do about it', () => {
    render(<ShopHeld buffs={[]} />)
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
    render(<ShopHeld buffs={buffs} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText(heldCountText(3))).toBeTruthy()
  })

  it('names each card the ONE way a buff is ever described, condition included', () => {
    const buff = mint(0, BuffTier.Silver, 1)
    render(<ShopHeld buffs={[buff]} />)
    expect(screen.getByLabelText(`${buffName(buff)} — ${buffConditionSentence(buff)}`)).toBeTruthy()
  })

  it('states the held count on a pile of more than one, in the accessible name', () => {
    const buff = mint(0, BuffTier.Bronze, 1)
    render(<ShopHeld buffs={[buff, mint(0, BuffTier.Bronze, 2)]} />)
    expect(
      screen.getByLabelText(`${buffName(buff)} — ${buffConditionSentence(buff)}, 2 held`),
    ).toBeTruthy()
  })

  it('renders NO button — nothing here can be activated between fights', () => {
    render(<ShopHeld buffs={[mint(0, BuffTier.Bronze, 1)]} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('groups itself under its own accessible label', () => {
    render(<ShopHeld buffs={[]} />)
    expect(screen.getByRole('region', { name: SHOP_HELD_GROUP_LABEL })).toBeTruthy()
  })

  it('carries the tier as a numeral, so tier survives a greyscale screenshot', () => {
    render(<ShopHeld buffs={[mint(0, BuffTier.Gold, 1)]} />)
    expect(document.querySelector('.wc-buffcard-tier')?.textContent).toBe('III')
  })
})
