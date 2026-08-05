/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suit } from '../../../warCouncil'
import HandFan from '../HandFan'
import { card } from './roundFixture'

afterEach(cleanup)

const HAND = [card(Suit.Bells, 7), card(Suit.Keys, 3), card(Suit.Moons, 11)]

function renderFan(overrides = {}) {
  const onTap = vi.fn()
  const onCancel = vi.fn()
  render(
    <HandFan
      hand={HAND}
      legal={[card(Suit.Moons, 11)]}
      armed={null}
      interactive
      hint="Follow their lead"
      rejected={false}
      promptOpen={false}
      onTap={onTap}
      onCancel={onCancel}
      {...overrides}
    />,
  )
  return { onTap, onCancel }
}

describe('HandFan', () => {
  it('names every card by rank and suit', () => {
    renderFan()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toBeDefined()
    expect(screen.getByRole('button', { name: '3 of Keys (Fox)' })).toBeDefined()
    // 11 is CardRank.Monarch — one of the five ability-bearing ranks labels.ts
    // already decorates (RANK_NAME keys [1, 3, 5, 9, 11]), so its accessible
    // name carries the parenthetical too, same as the Fox above.
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toBeDefined()
  })

  it('disables the cards the engine excluded', () => {
    renderFan()
    expect(screen.getByRole('button', { name: '7 of Bells' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '11 of Moons (Monarch)' })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('reports a tap on a legal card', () => {
    const { onTap } = renderFan()
    screen.getByRole('button', { name: '11 of Moons (Monarch)' }).click()
    expect(onTap).toHaveBeenCalledWith(card(Suit.Moons, 11))
  })

  it('keeps the whole hand to a single tab stop', () => {
    renderFan({ legal: HAND })
    const stops = screen.getAllByRole('button').filter((b) => b.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })

  it('cancels the selection on Escape', () => {
    const { onCancel } = renderFan({ armed: card(Suit.Moons, 11) })
    const group = screen.getByRole('group', { name: /hand/i })
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('marks the hint as rejected when a rejection is showing', () => {
    renderFan({ rejected: true, hint: 'You must follow the led suit.' })
    expect(screen.getByText('You must follow the led suit.').className).toContain('wc-is-reject')
  })

  it('marks the hint as live only for an armed card, matching the mockup’s own cascade', () => {
    renderFan({ armed: card(Suit.Moons, 11), hint: 'Tap 11 of Moons (Monarch) again to play it' })
    expect(screen.getByText(/again to play it/).className).toContain('wc-is-live')
  })

  it('does not mark the hint as live for a non-armed hint, e.g. a resolved trick', () => {
    renderFan({ hint: 'Trick resolved' })
    expect(screen.getByText('Trick resolved').className).not.toContain('wc-is-live')
  })

  it('hides the fan from the accessibility tree while a prompt is open', () => {
    renderFan({ promptOpen: true })
    // Testing Library's role queries exclude aria-hidden subtrees by default, so the
    // group itself becomes unreachable by role — the same effect a screen reader gets.
    expect(screen.queryByRole('group', { name: /hand/i })).toBeNull()
    expect(document.querySelector('.wc-fan')?.getAttribute('aria-hidden')).toBe('true')
  })
})
