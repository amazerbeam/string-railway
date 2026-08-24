/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apCostOf,
  BuffActivationRefusal,
  BuffTier,
  cheatBuff,
  startBuffActivation,
  timebombBuff,
  type Buff,
  type BuffActivationState,
} from '../../../hunt'
import BuffLoadoutPanel from '../BuffLoadoutPanel'
import { LOADOUT_EMPTY_MESSAGE } from '../actionBarLabels'
import { BUFF_ACTIVATION_REFUSAL_MESSAGE, buffLine, buffRowAccessibleName } from '../buffLabels'

afterEach(cleanup)

const buff1: Buff = cheatBuff(BuffTier.Bronze, 1)
const buff2: Buff = cheatBuff(BuffTier.Silver, 2)
const timebomb: Buff = timebombBuff(BuffTier.Bronze, 3)

function renderPanel(over: Partial<Parameters<typeof BuffLoadoutPanel>[0]> = {}) {
  const activation: BuffActivationState = startBuffActivation()
  const onTapBuff = vi.fn()
  const onClose = vi.fn()

  render(
    <BuffLoadoutPanel
      buffs={[buff1, buff2]}
      activation={activation}
      poised={null}
      refusalFor={() => null}
      apCostFor={apCostOf}
      onTapBuff={onTapBuff}
      onClose={onClose}
      {...over}
    />,
  )
  return { onTapBuff, onClose, activation }
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

  // DLR-132 — Cheat and Timebomb are ordinary rows now: CheatSlots and TimebombCharge are
  // deleted, and their behavioural coverage (a Cheat lifting follow-suit, a Timebomb priming a
  // card) is re-expressed against the reducer in `buffHandlers.test.ts` and
  // `roundReducer.timebomb.test.ts`. This file's own job is only that the two render as rows.
  it('renders a Cheat row and a Timebomb row in buffLine grammar, queried by accessible role and name', () => {
    renderPanel({ buffs: [buff1, timebomb] })
    expect(screen.getByRole('button', { name: buffLine(buff1, apCostOf(buff1)) })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: buffLine(timebomb, apCostOf(timebomb)) }),
    ).toBeTruthy()
    // Neither is its own group any more — the two retired widgets are gone.
    expect(screen.queryByRole('group', { name: 'Cheats' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Timebomb' })).toBeNull()
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

// ── DLR-132 Task 8 — the widened focus order, pinned explicitly ────────────────────────────────
//
// This is the risk the ticket names: two rows joined a roving tabindex they were deliberately
// outside of. `useRovingTabIndex` has already caused one integration-only crash this run
// (`isFocusable(0)` reaching `apCostOf(undefined)` on an empty collection) — the last two cases
// below are that crash guard, over the two shapes that reach `isFocusable(0)` with nothing behind
// it: an empty pile and an all-refused one.
describe('BuffLoadoutPanel — the widened focus order over a pile containing both cards', () => {
  const pile = [buff1, timebomb, buff2]

  it('makes exactly one row a tab stop, and it is the first activatable one', () => {
    renderPanel({ buffs: pile })
    const rows = pile.map((b) => screen.getByRole('button', { name: buffLine(b, apCostOf(b)) }))
    const tabbable = rows.filter((r) => r.getAttribute('tabindex') === '0')
    expect(tabbable).toHaveLength(1)
    expect(tabbable[0]).toBe(rows[0])
    expect(rows[1].getAttribute('tabindex')).toBe('-1')
    expect(rows[2].getAttribute('tabindex')).toBe('-1')
  })

  it('skips a refused row when ArrowDown moves focus', () => {
    renderPanel({
      buffs: pile,
      refusalFor: (buff) => (buff.id === timebomb.id ? BuffActivationRefusal.AlreadyActive : null),
    })
    const row1 = screen.getByRole('button', {
      name: buffRowAccessibleName(buff1, apCostOf(buff1), false, null),
    })
    const row3 = screen.getByRole('button', {
      name: buffRowAccessibleName(buff2, apCostOf(buff2), false, null),
    })
    row1.focus()
    fireEvent.keyDown(row1, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(row3)
  })

  it('wraps from the last activatable row to the first', () => {
    renderPanel({ buffs: pile })
    const row1 = screen.getByRole('button', { name: buffLine(buff1, apCostOf(buff1)) })
    const row3 = screen.getByRole('button', { name: buffLine(buff2, apCostOf(buff2)) })
    // Reach row3 by real keyboard navigation from the hook's own initial tab stop (row1) — the
    // hook tracks its OWN position across keypresses, so jumping DOM focus straight to row3 with
    // `.focus()` leaves that internal position at row1 and the next ArrowDown reads from there,
    // not from wherever `document.activeElement` happens to be.
    row1.focus()
    fireEvent.keyDown(row1, { key: 'ArrowDown' })
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(row3)
    fireEvent.keyDown(row3, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(row1)
  })

  it('lands Home on the first activatable row and End on the last', () => {
    renderPanel({ buffs: pile })
    const row1 = screen.getByRole('button', { name: buffLine(buff1, apCostOf(buff1)) })
    const row3 = screen.getByRole('button', { name: buffLine(buff2, apCostOf(buff2)) })
    row1.focus()
    fireEvent.keyDown(row1, { key: 'End' })
    expect(document.activeElement).toBe(row3)
    fireEvent.keyDown(row3, { key: 'Home' })
    expect(document.activeElement).toBe(row1)
  })

  it('renders every row disabled and throws nothing when every row is refused', () => {
    expect(() =>
      renderPanel({ buffs: pile, refusalFor: () => BuffActivationRefusal.WindowClosed }),
    ).not.toThrow()
    const rows = pile.map((b) =>
      screen.getByRole('button', {
        name: buffRowAccessibleName(b, apCostOf(b), false, BuffActivationRefusal.WindowClosed),
      }),
    )
    // No row is reachable by keyboard: `isFocusable(0)` false is the guard `useRovingTabIndex`
    // depends on, and a `disabled` button is unfocusable regardless of its `tabIndex` attribute.
    expect(rows.every((r) => (r as HTMLButtonElement).disabled)).toBe(true)
  })

  it('renders the empty message and throws nothing on an empty pile', () => {
    expect(() => renderPanel({ buffs: [] })).not.toThrow()
    expect(screen.getByText(LOADOUT_EMPTY_MESSAGE)).toBeTruthy()
  })
})
