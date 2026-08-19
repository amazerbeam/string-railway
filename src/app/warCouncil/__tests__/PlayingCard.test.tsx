/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ALL_SUITS, Suit } from '../../../warCouncil'
import PlayingCard from '../PlayingCard'

afterEach(cleanup)

describe('PlayingCard', () => {
  it('names a skulled card as skulled', () => {
    render(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" skulled />)
    expect(screen.getByRole('button', { name: /skulled/i })).toBeTruthy()
  })

  it('does not call a clean card skulled', () => {
    render(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />)
    expect(screen.queryByRole('button', { name: /skulled/i })).toBeNull()
  })

  it('carries no mark wording when unmarked', () => {
    render(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />)
    expect(screen.queryByRole('button', { name: /poisoned/i })).toBeNull()
  })

  it('renders the mark and names a poisoned card as poisoned', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" envenomed />,
    )
    expect(screen.getByRole('button', { name: /poisoned/i })).toBeTruthy()
    expect(container.querySelector('.wc-venom-mark')).toBeTruthy()
  })

  it('announces both marks on a card carrying skull and poison together', () => {
    render(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" skulled envenomed />)
    const button = screen.getByRole('button', { name: /skulled, poisoned/i })
    expect(button).toBeTruthy()
  })

  it('renders the poison mark as aria-hidden, so it is announced once through the name', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" envenomed />,
    )
    const mark = container.querySelector('.wc-venom-mark')
    expect(mark?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders the suit mark for every suit', () => {
    for (const suit of ALL_SUITS) {
      const { container, unmount } = render(<PlayingCard card={{ suit, rank: 4 }} variant="hand" />)
      expect(container.querySelector(`.wc-suit-${suit} .wc-card-suit`)).toBeTruthy()
      unmount()
    }
  })
})
