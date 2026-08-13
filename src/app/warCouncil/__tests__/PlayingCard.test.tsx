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

  it('renders the suit mark for every suit', () => {
    for (const suit of ALL_SUITS) {
      const { container, unmount } = render(<PlayingCard card={{ suit, rank: 4 }} variant="hand" />)
      expect(container.querySelector(`.wc-suit-${suit} .wc-card-suit`)).toBeTruthy()
      unmount()
    }
  })
})
