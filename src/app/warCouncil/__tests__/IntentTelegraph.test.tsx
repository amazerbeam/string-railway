/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { QuarryIntentStance, Suit } from '../../../warCouncil'
import IntentTelegraph from '../IntentTelegraph'

afterEach(cleanup)

describe('IntentTelegraph', () => {
  it('names a live leading intent', () => {
    render(
      <IntentTelegraph
        intent={{ suit: Suit.Bells, stance: QuarryIntentStance.Leading }}
        speculative={false}
      />,
    )
    expect(screen.getByRole('status', { name: /will lead Bells/i })).toBeDefined()
  })

  it('prefixes a speculative pressing intent with "If you lead that card"', () => {
    render(
      <IntentTelegraph
        intent={{ suit: Suit.Keys, stance: QuarryIntentStance.Pressing }}
        speculative={true}
      />,
    )
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-label')).toMatch(/^If you lead that card/)
  })

  it('names a distinct status in each mode when intent is null', () => {
    const { unmount } = render(<IntentTelegraph intent={null} speculative={false} />)
    const live = screen.getByRole('status').getAttribute('aria-label')
    unmount()
    render(<IntentTelegraph intent={null} speculative={true} />)
    const speculative = screen.getByRole('status').getAttribute('aria-label')
    expect(live).not.toBe(speculative)
    expect(live).toBeTruthy()
    expect(speculative).toBeTruthy()
  })

  it('renders without crashing and names the suit when stance is absent (suit-only fidelity)', () => {
    render(<IntentTelegraph intent={{ suit: Suit.Moons }} speculative={false} />)
    expect(screen.getByRole('status', { name: /Moons/i })).toBeDefined()
  })
})
