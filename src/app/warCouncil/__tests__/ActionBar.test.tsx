/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APPLY_DAMAGE_AP_COST, BuffActivationRefusal, type PendingApplyPayout } from '../../../hunt'
import { ApplyDamageRefusal, DiscardRefusal, Suit } from '../../../warCouncil'
import ActionBar from '../ActionBar'

afterEach(cleanup)

function renderBar(over: Partial<Parameters<typeof ActionBar>[0]> = {}) {
  const onToggleLoadout = vi.fn()
  const onPlayArmed = vi.fn()
  const onTapSwap = vi.fn()
  const onCancelSwap = vi.fn()
  const onTapApplyDamage = vi.fn()
  const onCancelApplyDamage = vi.fn()

  render(
    <ActionBar
      apPool={4}
      offeredBuffs={[]}
      loadoutOpen={false}
      loadoutRefusal={null}
      armed={null}
      cardsEnabled={true}
      discardsRemaining={2}
      discardSelecting={false}
      discardSelectionSize={0}
      discardRefusal={null}
      applyCashValue={9}
      applyPoised={false}
      applyRefusal={null}
      pendingPayout={null}
      onToggleLoadout={onToggleLoadout}
      onPlayArmed={onPlayArmed}
      onTapSwap={onTapSwap}
      onCancelSwap={onCancelSwap}
      onTapApplyDamage={onTapApplyDamage}
      onCancelApplyDamage={onCancelApplyDamage}
      {...over}
    />,
  )
  return {
    onToggleLoadout,
    onPlayArmed,
    onTapSwap,
    onCancelSwap,
    onTapApplyDamage,
    onCancelApplyDamage,
  }
}

describe('ActionBar', () => {
  it('is a group named "Actions" containing exactly four buttons', () => {
    renderBar()
    const bar = screen.getByRole('group', { name: 'Actions' })
    expect(screen.getAllByRole('button').length).toBe(4)
    expect(bar).toBeTruthy()
  })

  it("Apply Buff's accessible name carries the remaining AP figure", () => {
    renderBar({ apPool: 4 })
    expect(screen.getByRole('button', { name: /4 action points left/ })).toBeTruthy()
  })

  it('Apply Buff is enabled when loadoutRefusal is null', () => {
    renderBar({ loadoutRefusal: null })
    const btn = screen.getByRole('button', { name: /apply buff/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('Apply Buff is enabled when loadoutRefusal is InsufficientAp', () => {
    renderBar({ loadoutRefusal: BuffActivationRefusal.InsufficientAp })
    const btn = screen.getByRole('button', { name: /apply buff/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
  })

  it('Apply Buff is disabled when loadoutRefusal is WindowClosed', () => {
    renderBar({ loadoutRefusal: BuffActivationRefusal.WindowClosed })
    const btn = screen.getByRole('button', { name: /apply buff/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Cards is disabled with no armed card, and named "No card selected"', () => {
    renderBar({ armed: null })
    const btn = screen.getByRole('button', { name: /no card selected/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('Cards is enabled and pressed with an armed card, names it, and plays it on click', () => {
    const { onPlayArmed } = renderBar({ armed: { suit: Suit.Bells, rank: 7 } })
    const btn = screen.getByRole('button', { name: /play the 7 of bells/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(false)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(btn)
    expect(onPlayArmed).toHaveBeenCalledOnce()
  })

  it("Swap's name carries the remaining discard count, and clicking calls onTapSwap", () => {
    const { onTapSwap } = renderBar({ discardsRemaining: 2 })
    const btn = screen.getByRole('button', { name: /2 left/i })
    fireEvent.click(btn)
    expect(onTapSwap).toHaveBeenCalledOnce()
  })

  it('a Swap refusal disables it and puts the refusal sentence on screen', () => {
    renderBar({ discardRefusal: DiscardRefusal.NoDiscardsRemaining, discardsRemaining: 0 })
    const btn = screen.getByRole('button', { name: /discard/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(screen.getByText(/no discards left/i)).toBeTruthy()
  })

  it("Apply Damage's face carries the AP cost", () => {
    renderBar()
    expect(screen.getByText(`9 for ${APPLY_DAMAGE_AP_COST} AP`)).toBeTruthy()
  })

  it('shows "2 tricks to go" for a pending payout with resolutionsOwed 2', () => {
    const pending: PendingApplyPayout = { cashOut: 12, resolutionsOwed: 2, unplayedAtPress: 3 }
    renderBar({ pendingPayout: pending })
    expect(screen.getByText(/2 tricks to go/)).toBeTruthy()
  })

  it('shows "1 trick to go" for a pending payout with resolutionsOwed 1', () => {
    const pending: PendingApplyPayout = { cashOut: 12, resolutionsOwed: 1, unplayedAtPress: 3 }
    renderBar({ pendingPayout: pending })
    expect(screen.getByText(/1 trick to go/)).toBeTruthy()
  })

  it('clicking Apply Damage calls onTapApplyDamage', () => {
    const { onTapApplyDamage } = renderBar()
    fireEvent.click(screen.getByRole('button', { name: /apply damage/i }))
    expect(onTapApplyDamage).toHaveBeenCalledOnce()
  })

  it('Escape calls onCancelApplyDamage', () => {
    const { onCancelApplyDamage } = renderBar()
    fireEvent.keyDown(screen.getByRole('group', { name: 'Actions' }), { key: 'Escape' })
    expect(onCancelApplyDamage).toHaveBeenCalledOnce()
  })

  // In the real tree `ActionBar` renders as a sibling of `.wc-table`, not inside it, so this
  // synthetic wrapping `<div onClick>` does not reproduce any click path that actually exists —
  // `BuffLoadoutPanel`'s own equivalent test is the one that pins a real risk, because that
  // component really does mount inside `.wc-table`. This test only pins the bar's defensive
  // `stopPropagation` so a future edit does not silently drop it.
  it('pins its defensive stopPropagation even though nothing here can currently receive it', () => {
    const onFelt = vi.fn()
    const onToggleLoadout = vi.fn()
    render(
      <div onClick={onFelt}>
        <ActionBar
          apPool={4}
          offeredBuffs={[]}
          loadoutOpen={false}
          loadoutRefusal={null}
          armed={null}
          cardsEnabled={true}
          discardsRemaining={2}
          discardSelecting={false}
          discardSelectionSize={0}
          discardRefusal={null}
          applyCashValue={9}
          applyPoised={false}
          applyRefusal={ApplyDamageRefusal.EmptyBank}
          pendingPayout={null}
          onToggleLoadout={onToggleLoadout}
          onPlayArmed={vi.fn()}
          onTapSwap={vi.fn()}
          onCancelSwap={vi.fn()}
          onTapApplyDamage={vi.fn()}
          onCancelApplyDamage={vi.fn()}
        />
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(onFelt).not.toHaveBeenCalled()
  })
})
