/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Suit } from '../../../warCouncil'
import QuarryShape from '../QuarryShape'

afterEach(cleanup)

describe('QuarryShape', () => {
  it('reports cards held and skulls per suit', () => {
    render(
      <QuarryShape
        shape={[
          { suit: Suit.Bells, held: 3, skulled: 1 },
          { suit: Suit.Keys, held: 2, skulled: 0 },
          { suit: Suit.Moons, held: 1, skulled: 0 },
        ]}
      />,
    )
    expect(screen.getByLabelText(/Bells: 3 held, 1 skulled/i)).toBeTruthy()
  })

  it('never renders a rank', () => {
    const { container } = render(
      <QuarryShape
        shape={[
          { suit: Suit.Bells, held: 2, skulled: 1 },
          { suit: Suit.Keys, held: 3, skulled: 0 },
          { suit: Suit.Moons, held: 1, skulled: 0 },
        ]}
      />,
    )
    expect(container.textContent).not.toMatch(/\b(7|9|11)\b/)
  })

  it('shows a suit the Quarry has been stripped of as zero', () => {
    render(
      <QuarryShape
        shape={[
          { suit: Suit.Bells, held: 0, skulled: 0 },
          { suit: Suit.Keys, held: 3, skulled: 1 },
          { suit: Suit.Moons, held: 2, skulled: 0 },
        ]}
      />,
    )
    expect(screen.getByLabelText(/Bells: 0 held, none skulled/i)).toBeTruthy()
  })
})
