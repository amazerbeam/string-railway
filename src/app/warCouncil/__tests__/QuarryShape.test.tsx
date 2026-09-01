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

  const SHAPE = [
    { suit: Suit.Bells, held: 3, skulled: 1 },
    { suit: Suit.Keys, held: 2, skulled: 0 },
    { suit: Suit.Moons, held: 1, skulled: 0 },
  ]

  it('marks exactly the telegraphed suit row, and says so in words', () => {
    const { container } = render(<QuarryShape shape={SHAPE} leadSuit={Suit.Bells} />)
    expect(container.querySelectorAll('.wc-shape-row-lead')).toHaveLength(1)
    expect(container.querySelector('.wc-suit-bells')!.classList).toContain('wc-shape-row-lead')

    // AC3 — real text, not an aria-label on a group of aria-hidden children. The sentence is
    // carried in two channels (the `.wc-sr-only` span and the visible `.wc-shape-tip`), so both
    // copies are asserted rather than a single `getByText` — which would otherwise throw on
    // finding two matching nodes.
    expect(screen.getAllByText('The Quarry will lead with Bells')).toHaveLength(2)

    // AC2 — the visible bubble says the same thing, and is hidden from assistive tech so the
    // sentence is not announced twice.
    const tip = container.querySelector('.wc-shape-tip')!
    expect(tip.textContent).toBe('The Quarry will lead with Bells')
    expect(tip.getAttribute('aria-hidden')).toBe('true')
  })

  it('makes only the marked row a keyboard stop', () => {
    const { container } = render(<QuarryShape shape={SHAPE} leadSuit={Suit.Keys} />)
    const focusable = container.querySelectorAll('.wc-shape-row[tabindex="0"]')
    expect(focusable).toHaveLength(1)
    expect(focusable[0].classList).toContain('wc-suit-keys')
  })

  it('marks nothing when no suit is telegraphed — the player leads, or mid-trick (AC4)', () => {
    const { container } = render(<QuarryShape shape={SHAPE} leadSuit={null} />)
    expect(container.querySelectorAll('.wc-shape-row-lead')).toHaveLength(0)
    expect(container.querySelectorAll('.wc-shape-tip')).toHaveLength(0)
    expect(container.querySelectorAll('.wc-shape-row[tabindex]')).toHaveLength(0)
    expect(container.textContent).not.toMatch(/will lead with/)
  })

  it('marks nothing when the prop is omitted altogether', () => {
    const { container } = render(<QuarryShape shape={SHAPE} />)
    expect(container.querySelectorAll('.wc-shape-row-lead')).toHaveLength(0)
  })

  it('leaks no rank through the marked row (AC5)', () => {
    const { container } = render(<QuarryShape shape={SHAPE} leadSuit={Suit.Bells} />)
    const marked = container.querySelector('.wc-shape-row-lead')!
    // The marked row draws the same tally as any other — no tile is singled out.
    expect(marked.querySelectorAll('.wc-shape-card')).toHaveLength(3)
    expect(marked.querySelector('.wc-shape-tip')!.textContent).not.toMatch(/\d/)
  })
})
