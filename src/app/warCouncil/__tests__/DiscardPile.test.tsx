import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import DiscardPile from '../DiscardPile'
import { MotionAnchorProvider } from '../MotionAnchors'

afterEach(cleanup)

// DLR-157 — `DiscardPile` now registers the spent pile's anchor, which throws outside a
// `MotionAnchorProvider`. Every render below is wrapped for that reason alone; nothing about
// this file's own assertions changed.
function renderPile(props: { spentCount: number; reshuffled: boolean }) {
  return render(
    <MotionAnchorProvider>
      <DiscardPile {...props} />
    </MotionAnchorProvider>,
  )
}

describe('DiscardPile', () => {
  it('AC8 — names the pile and posts its live count', () => {
    renderPile({ spentCount: 13, reshuffled: false })
    const plate = screen.getByRole('group', { name: 'Spent' })
    expect(within(plate).getByText('13 spent')).toBeTruthy()
  })

  it('AC9 — states that cards are not reshuffled when none has happened', () => {
    renderPile({ spentCount: 13, reshuffled: false })
    expect(screen.getByRole('status').textContent).toBe('Spent cards stay spent')
  })

  it('AC9 — announces the reshuffle at the moment it happens', () => {
    renderPile({ spentCount: 0, reshuffled: true })
    expect(screen.getByRole('status').textContent).toBe('Reshuffled — the deck is fresh')
  })

  it('AC8 — renders no card face and exposes nothing of the pile’s contents', () => {
    const { container } = renderPile({ spentCount: 26, reshuffled: false })
    expect(container.querySelectorAll('.wc-card')).toHaveLength(0)
    expect(screen.getByRole('group', { name: 'Spent' }).textContent).toBe(
      'Spent26 spentSpent cards stay spent',
    )
  })
})
