/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import type { ResolvedTrick } from '../roundReducer'
import TrickWell from '../TrickWell'

afterEach(cleanup)

const resolvedTrick: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: 7 } },
    { side: PlayerSide.Cpu, card: { suit: Suit.Keys, rank: 2 } },
  ],
  winner: PlayerSide.Cpu,
}

describe('TrickWell — a resolved trick', () => {
  it('offers exactly one control, and it carries on (DLR-67: the claim fork is gone)', () => {
    // `PlayingCard` renders every table-variant card as its own (disabled, tab-index -1)
    // <button> for the played cards, so `getAllByRole('button')` alone would also pick
    // those up — filtering to the enabled buttons isolates the actual interactive controls.
    const onCarryOn = vi.fn()
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={onCarryOn}
      />,
    )
    const buttons = screen
      .getAllByRole('button')
      .filter((button) => !button.hasAttribute('disabled'))
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(onCarryOn).toHaveBeenCalledTimes(1)
  })

  it('renders no claim control and no claim-worth preview', () => {
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /claim/i })).toBeNull()
    expect(screen.queryByText(/Claiming credits/)).toBeNull()
  })

  it('names the winning side', () => {
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.getByText(/They take the trick/)).toBeDefined()
  })
})
