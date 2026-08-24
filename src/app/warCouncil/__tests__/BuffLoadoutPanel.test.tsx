/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apCostOf,
  BuffActivationRefusal,
  BuffTier,
  cheatBuff,
  startBuffActivation,
  type Buff,
  type BuffActivationState,
} from '../../../hunt'
import BuffLoadoutPanel from '../BuffLoadoutPanel'
import { LOADOUT_EMPTY_MESSAGE } from '../actionBarLabels'
import { BUFF_ACTIVATION_REFUSAL_MESSAGE, buffRowAccessibleName } from '../buffLabels'

afterEach(cleanup)

const buff1: Buff = cheatBuff(BuffTier.Bronze, 1)
const buff2: Buff = cheatBuff(BuffTier.Silver, 2)

function renderPanel(over: Partial<Parameters<typeof BuffLoadoutPanel>[0]> = {}) {
  const activation: BuffActivationState = startBuffActivation()
  const onTapBuff = vi.fn()
  const onTapCheat = vi.fn()
  const onCancelCheat = vi.fn()
  const onTapTimebomb = vi.fn()
  const onCancelTimebomb = vi.fn()
  const onClose = vi.fn()

  render(
    <BuffLoadoutPanel
      buffs={[buff1, buff2]}
      activation={activation}
      poised={null}
      refusalFor={() => null}
      apCostFor={apCostOf}
      cheats={[]}
      cheatSelection={null}
      timebombCharges={0}
      timebombStage={null}
      interactive={true}
      onTapBuff={onTapBuff}
      onTapCheat={onTapCheat}
      onCancelCheat={onCancelCheat}
      onTapTimebomb={onTapTimebomb}
      onCancelTimebomb={onCancelTimebomb}
      onClose={onClose}
      {...over}
    />,
  )
  return {
    onTapBuff,
    onTapCheat,
    onCancelCheat,
    onTapTimebomb,
    onCancelTimebomb,
    onClose,
    activation,
  }
}

describe('BuffLoadoutPanel', () => {
  it('is a dialog named "Your buffs"', () => {
    renderPanel()
    expect(screen.getByRole('dialog', { name: 'Your buffs' })).toBeTruthy()
  })

  it('renders one button per offered buff, each named with its full line and AP cost', () => {
    renderPanel()
    const name1 = buffRowAccessibleName(buff1, apCostOf(buff1), false, null)
    const name2 = buffRowAccessibleName(buff2, apCostOf(buff2), false, null)
    expect(screen.getByRole('button', { name: name1 })).toBeTruthy()
    expect(screen.getByRole('button', { name: name2 })).toBeTruthy()
  })

  it('shows the remaining AP figure on screen', () => {
    const { activation } = renderPanel()
    expect(screen.getByText(`${activation.apPool} action points left`)).toBeTruthy()
  })

  it('disables a row refused for InsufficientAp and puts the reason on its own face', () => {
    renderPanel({
      refusalFor: (buff) => (buff.id === buff2.id ? BuffActivationRefusal.InsufficientAp : null),
    })
    const row2 = screen.getByRole('button', {
      name: buffRowAccessibleName(
        buff2,
        apCostOf(buff2),
        false,
        BuffActivationRefusal.InsufficientAp,
      ),
    })
    expect((row2 as HTMLButtonElement).disabled).toBe(true)
    expect(
      screen.getByText(BUFF_ACTIVATION_REFUSAL_MESSAGE[BuffActivationRefusal.InsufficientAp]),
    ).toBeTruthy()
  })

  it('clicking a live row calls onTapBuff with that buff id', () => {
    const { onTapBuff } = renderPanel()
    fireEvent.click(
      screen.getByRole('button', {
        name: buffRowAccessibleName(buff1, apCostOf(buff1), false, null),
      }),
    )
    expect(onTapBuff).toHaveBeenCalledWith(buff1.id)
  })

  it('marks the poised row aria-pressed true and every other row false', () => {
    renderPanel({ poised: buff1.id })
    const row1 = screen.getByRole('button', {
      name: buffRowAccessibleName(buff1, apCostOf(buff1), true, null),
    })
    const row2 = screen.getByRole('button', {
      name: buffRowAccessibleName(buff2, apCostOf(buff2), false, null),
    })
    expect(row1.getAttribute('aria-pressed')).toBe('true')
    expect(row2.getAttribute('aria-pressed')).toBe('false')
  })

  it('Escape calls onClose', () => {
    const { onClose } = renderPanel()
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Your buffs' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows the empty message and no buff row when buffs is empty', () => {
    renderPanel({ buffs: [] })
    expect(screen.getByText(LOADOUT_EMPTY_MESSAGE)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /AP\./ })).toBeNull()
  })

  it('renders the relocated Cheat and Timebomb groups by their existing accessible names', () => {
    renderPanel()
    expect(screen.getByRole('group', { name: 'Cheats' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Timebomb' })).toBeTruthy()
  })

  it('ArrowRight moves focus from the first buff row to the second', () => {
    renderPanel()
    const name1 = buffRowAccessibleName(buff1, apCostOf(buff1), false, null)
    const name2 = buffRowAccessibleName(buff2, apCostOf(buff2), false, null)
    const row1 = screen.getByRole('button', { name: name1 })
    const row2 = screen.getByRole('button', { name: name2 })
    row1.focus()
    fireEvent.keyDown(row1, { key: 'ArrowRight' })
    expect(row2).toBe(document.activeElement)
  })
})
