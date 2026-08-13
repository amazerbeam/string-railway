/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DuelSide } from '../../../hunt'
import { duelHealthBars } from '../duelHealthBars.ts'
import DuelHealthBars from '../DuelHealthBars.tsx'

afterEach(cleanup)

const MAX = { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 }

function renderPair(current: Record<DuelSide, number>, projected: Record<DuelSide, number>) {
  return render(
    <DuelHealthBars bars={duelHealthBars(current, projected, MAX)} centre={<span>trio</span>} />,
  )
}

describe('DuelHealthBars', () => {
  it('puts both sides on screen as separately named meters (AC1, AC7)', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1254, [DuelSide.Quarry]: 810 },
    )
    expect(screen.getByRole('meter', { name: 'Your health' })).toBeTruthy()
    expect(screen.getByRole('meter', { name: 'The Quarry’s health' })).toBeTruthy()
  })

  it('renders the centre slot between the two bars', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
    )
    expect(screen.getByText('trio')).toBeTruthy()
  })

  it('reads both the current and the pending figure to a screen reader (AC7)', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1254, [DuelSide.Quarry]: 810 },
    )
    const quarry = screen.getByRole('meter', { name: 'The Quarry’s health' })
    expect(quarry.getAttribute('aria-valuenow')).toBe('1350')
    expect(quarry.getAttribute('aria-valuemax')).toBe('1350')
    expect(quarry.getAttribute('aria-valuetext')).toBe('1350 of 1350. 540 at risk this Hunt.')
  })

  it('says nothing is at risk before a declaration rather than reporting a zero', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
    )
    expect(screen.getByRole('meter', { name: 'Your health' }).getAttribute('aria-valuetext')).toBe(
      '1350 of 1350. Nothing at risk yet.',
    )
  })

  it('marks a lethal pending total in form as well as in text (AC3)', () => {
    const { container } = renderPair(
      { [DuelSide.Player]: 96, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
    )
    expect(screen.getByRole('meter', { name: 'Your health' }).getAttribute('aria-valuetext')).toBe(
      '96 of 1350. Lethal this Hunt.',
    )
    expect(container.querySelectorAll('.wc-hp-pending.wc-is-lethal')).toHaveLength(1)
  })

  it('sets the two segment widths as custom properties, never as an inline width', () => {
    const { container } = renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 810 },
    )
    const pending = container.querySelector<HTMLElement>(
      '.wc-hp[data-side="quarry"] .wc-hp-pending',
    )
    expect(pending?.style.getPropertyValue('--w')).toBe('40%')
    expect(pending?.style.width).toBe('')
  })
})
