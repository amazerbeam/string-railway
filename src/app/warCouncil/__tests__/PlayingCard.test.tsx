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
    expect(screen.queryByRole('button', { name: /primed/i })).toBeNull()
  })

  it('renders the mark and names a primed card as primed', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" primed />,
    )
    expect(screen.getByRole('button', { name: /primed/i })).toBeTruthy()
    expect(container.querySelector('.wc-primed-mark')).toBeTruthy()
  })

  it('announces both marks on a card carrying skull and Timebomb together', () => {
    render(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" skulled primed />)
    const button = screen.getByRole('button', { name: /skulled, primed/i })
    expect(button).toBeTruthy()
  })

  it('renders the Timebomb mark as aria-hidden, so it is announced once through the name', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" primed />,
    )
    const mark = container.querySelector('.wc-primed-mark')
    expect(mark?.getAttribute('aria-hidden')).toBe('true')
  })

  it('exposes aria-describedby only when describedBy is passed (DLR-117)', () => {
    const { rerender } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" describedBy="dmg-1" />,
    )
    expect(
      screen.getByRole('button', { name: '6 of Bells' }).getAttribute('aria-describedby'),
    ).toBe('dmg-1')

    rerender(<PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />)
    expect(
      screen.getByRole('button', { name: '6 of Bells' }).hasAttribute('aria-describedby'),
    ).toBe(false)
  })

  it('renders the suit mark for every suit', () => {
    for (const suit of ALL_SUITS) {
      const { container, unmount } = render(<PlayingCard card={{ suit, rank: 4 }} variant="hand" />)
      expect(container.querySelector(`.wc-suit-${suit} .wc-card-suit`)).toBeTruthy()
      unmount()
    }
  })

  // AC12 — a skull is a property of the trick, not of a character: every rank and every suit
  // must render the identical skull markup, so a player recognises it across the table without
  // reading it. The five acting ranks (RANK_NAME's keys) plus one plain rank, across all three
  // suits.
  const ACTING_RANKS = [1, 3, 5, 9, 11]
  const PLAIN_RANK = 6

  it('AC12 — the skull face is byte-identical for every rank and suit', () => {
    const markups = new Set<string>()
    for (const suit of ALL_SUITS) {
      for (const rank of [...ACTING_RANKS, PLAIN_RANK]) {
        const { container, unmount } = render(
          <PlayingCard card={{ suit, rank }} variant="hand" skulled />,
        )
        const face = container.querySelector('.wc-card-skull-face')
        expect(face).toBeTruthy()
        markups.add(face!.innerHTML)
        unmount()
      }
    }
    expect(markups.size).toBe(1)
  })

  it('AC12 — the corner survives: a skulled card still shows its rank and suit', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Keys, rank: 11 }} variant="hand" skulled />,
    )
    expect(container.querySelector('.wc-card-rank')?.textContent).toBe('11')
    expect(container.querySelector('.wc-suit-keys .wc-card-suit')).toBeTruthy()
  })

  it('AC12 — a skulled and primed card renders both the skull face and the primed mark', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Moons, rank: 1 }} variant="hand" skulled primed />,
    )
    expect(container.querySelector('.wc-card-skull-face')).toBeTruthy()
    expect(container.querySelector('.wc-primed-mark')).toBeTruthy()
    expect(screen.getByRole('button', { name: /skulled, primed/i })).toBeTruthy()
  })

  it('AC12 — an unskulled card renders the pip and no skull element', () => {
    const { container } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank: 6 }} variant="hand" />,
    )
    expect(container.querySelector('.wc-card-pip')).toBeTruthy()
    expect(container.querySelector('.wc-card-skull-face')).toBeNull()
  })
})
