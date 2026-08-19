/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit, TrickOutcome } from '../../../warCouncil'
import type { ResolvedTrick } from '../roundUiState'
import TrickWell from '../TrickWell'

afterEach(cleanup)

const resolvedTrick: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: 7 } },
    { side: PlayerSide.Cpu, card: { suit: Suit.Keys, rank: 2 } },
  ],
  winner: PlayerSide.Cpu,
  resolution: {
    outcome: TrickOutcome.CleanLoss,
    bankAdded: 0,
    cashOut: 20,
    damageToPlayer: 1,
    bank: 0,
    multiplier: 0,
    cashedAtHandEnd: false,
    envenomTarget: null,
    poisonToQuarry: 0,
    poisonGuardSpent: false,
  },
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

  it('announces the marked card as poisoned (DLR-90 AC2)', () => {
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        envenomedCards={[{ suit: Suit.Bells, rank: 7 }]}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /7 of Bells, poisoned/i })).toBeDefined()
  })

  it('announces a card carrying both a skull and the mark, both wordings present', () => {
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        skulledCards={[{ suit: Suit.Bells, rank: 7 }]}
        envenomedCards={[{ suit: Suit.Bells, rank: 7 }]}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /7 of Bells, skulled, poisoned/i })).toBeDefined()
  })
})
