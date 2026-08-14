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
    // Real text in a `.wc-sr-only` span, not an `aria-label` — a row whose every visible child is
    // aria-hidden gets pruned from the a11y tree, taking an attribute label with it.
    expect(screen.getByText(/Bells: 3 held, 1 skulled/i)).toBeTruthy()
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

  it('draws one card tile per card held, skulled ones marked', () => {
    const { container } = render(
      <QuarryShape
        shape={[
          { suit: Suit.Bells, held: 2, skulled: 2 },
          { suit: Suit.Keys, held: 4, skulled: 2 },
          { suit: Suit.Moons, held: 0, skulled: 0 },
        ]}
      />,
    )
    const keys = container.querySelector('.wc-suit-keys')!
    // 4 held → 4 tiles, of which 2 carry the skull: the developer's `[k] [k] [p] [p]`.
    expect(keys.querySelectorAll('.wc-shape-card')).toHaveLength(4)
    expect(keys.querySelectorAll('.wc-shape-card-skulled')).toHaveLength(2)

    // Every card skulled is a legal row, and every tile should then be a skull.
    const bells = container.querySelector('.wc-suit-bells')!
    expect(bells.querySelectorAll('.wc-shape-card')).toHaveLength(2)
    expect(bells.querySelectorAll('.wc-shape-card-skulled')).toHaveLength(2)

    // A stripped suit draws no tiles at all, not an empty box.
    expect(
      container.querySelector('.wc-suit-moons')!.querySelectorAll('.wc-shape-card'),
    ).toHaveLength(0)
  })

  it('shows no digits on screen — the tally is the tiles', () => {
    const { container } = render(
      <QuarryShape
        shape={[
          { suit: Suit.Bells, held: 3, skulled: 1 },
          { suit: Suit.Keys, held: 2, skulled: 0 },
          { suit: Suit.Moons, held: 1, skulled: 1 },
        ]}
      />,
    )
    // Only the sighted cells — the `.wc-sr-only` sentence still states both counts in words and
    // digits, deliberately, and is the one thing here allowed to carry a number.
    const seen = Array.from(container.querySelectorAll('.wc-shape-suit, .wc-shape-cards'))
      .map((cell) => cell.textContent)
      .join('')
    expect(seen).not.toMatch(/\d/)
    expect(seen).toMatch(/Bells/)
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
    expect(screen.getByText(/Bells: 0 held, none skulled/i)).toBeTruthy()
  })
})
