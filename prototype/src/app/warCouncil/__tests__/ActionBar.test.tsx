/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuffActivationRefusal } from '../../../hunt'
import { DiscardRefusal, Suit } from '../../../warCouncil'
import ActionBar from '../ActionBar'

afterEach(cleanup)

function renderBar(over: Partial<Parameters<typeof ActionBar>[0]> = {}) {
  const onToggleLoadout = vi.fn()
  const onPlayArmed = vi.fn()
  const onTapSwap = vi.fn()
  const onCancelSwap = vi.fn()

  render(
    <ActionBar
      offeredBuffs={[]}
      loadoutOpen={false}
      loadoutRefusal={null}
      armed={null}
      cardsEnabled={true}
      discardsRemaining={2}
      swapCap={3}
      swapJustRaised={false}
      discardSelecting={false}
      discardSelectionSize={0}
      discardRefusal={null}
      onToggleLoadout={onToggleLoadout}
      onPlayArmed={onPlayArmed}
      onTapSwap={onTapSwap}
      onCancelSwap={onCancelSwap}
      {...over}
    />,
  )
  return {
    onToggleLoadout,
    onPlayArmed,
    onTapSwap,
    onCancelSwap,
  }
}

describe('ActionBar', () => {
  it('is a group named "Actions" containing exactly three buttons', () => {
    renderBar()
    const bar = screen.getByRole('group', { name: 'Actions' })
    expect(screen.getAllByRole('button').length).toBe(3)
    expect(bar).toBeTruthy()
  })

  it("Apply Buff's accessible name carries the held count, with no AP figure (DLR-145 AC2)", () => {
    renderBar({ offeredBuffs: [] })
    const btn = screen.getByRole('button', { name: /0 buffs held/i })
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('aria-label')).not.toContain('AP')
    expect(btn.getAttribute('aria-label')).not.toContain('action point')
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

  it("Swap's name carries the remaining count AND the cap, and clicking calls onTapSwap", () => {
    // DLR-163 AC5 — "2 left" became "2 of 3": a cap that can grow is unreadable as a bare
    // remainder, so both figures are in the name as well as on the face.
    const { onTapSwap } = renderBar({ discardsRemaining: 2, swapCap: 3 })
    const btn = screen.getByRole('button', { name: /2 of 3/i })
    fireEvent.click(btn)
    expect(onTapSwap).toHaveBeenCalledOnce()
  })

  it('a Swap refusal disables it and puts the refusal sentence on screen', () => {
    renderBar({ discardRefusal: DiscardRefusal.NoDiscardsRemaining, discardsRemaining: 0 })
    const btn = screen.getByRole('button', { name: /discard/i }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(screen.getByText(/no discards left/i)).toBeTruthy()
  })

  it('DLR-163 AC5 — the Swap control prints "N of M", at cap 3 and at cap 4', () => {
    renderBar({ discardsRemaining: 3, swapCap: 3 })
    expect(screen.getByText('3 of 3')).toBeTruthy()
    cleanup()
    renderBar({ discardsRemaining: 4, swapCap: 4 })
    expect(screen.getByText('4 of 4')).toBeTruthy()
  })

  it('DLR-163 AC6 — the raised mark is present only when swapJustRaised', () => {
    renderBar({ swapJustRaised: true })
    const raised = screen.getByRole('button', { name: /discard/i })
    expect(raised.className).toContain('wc-is-swap-raised')
    expect(raised.getAttribute('aria-label')).toContain('just raised')
    cleanup()
    renderBar({ swapJustRaised: false })
    const plain = screen.getByRole('button', { name: /discard/i })
    expect(plain.className).not.toContain('wc-is-swap-raised')
    expect(plain.getAttribute('aria-label')).not.toContain('just raised')
  })

  it('Escape calls onCancelSwap', () => {
    const { onCancelSwap } = renderBar()
    fireEvent.keyDown(screen.getByRole('group', { name: 'Actions' }), { key: 'Escape' })
    expect(onCancelSwap).toHaveBeenCalledOnce()
  })

  // In the real tree `ActionBar` renders as a sibling of `.wc-table`, not inside it, so this
  // synthetic wrapping `<div onClick>` does not reproduce any click path that actually exists —
  // `BuffGallery`'s own equivalent test is the one that pins a real risk, because that
  // component really does mount inside `.wc-table`. This test only pins the bar's defensive
  // `stopPropagation` so a future edit does not silently drop it.
  it('pins its defensive stopPropagation even though nothing here can currently receive it', () => {
    const onFelt = vi.fn()
    const onToggleLoadout = vi.fn()
    render(
      <div onClick={onFelt}>
        <ActionBar
          offeredBuffs={[]}
          loadoutOpen={false}
          loadoutRefusal={null}
          armed={null}
          cardsEnabled={true}
          discardsRemaining={2}
          swapCap={3}
          swapJustRaised={false}
          discardSelecting={false}
          discardSelectionSize={0}
          discardRefusal={null}
          onToggleLoadout={onToggleLoadout}
          onPlayArmed={vi.fn()}
          onTapSwap={vi.fn()}
          onCancelSwap={vi.fn()}
        />
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /apply buff/i }))
    expect(onFelt).not.toHaveBeenCalled()
  })
})
