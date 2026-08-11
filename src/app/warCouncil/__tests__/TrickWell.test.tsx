/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import type { ResolvedTrick } from '../roundReducer'
import TrickWell from '../TrickWell'

afterEach(cleanup)

// A Treasure card (rank 7) alongside a plain card — the exact case the DLR-63 review fix
// covers. invertedCardValue(7) = 5, invertedCardValue(2) = 10: the unfolded raw sum a buggy
// preview would show is 5 + 10 = 15. `creditedTrickWorth` folds Treasure's +1 in, so the
// correct, credited total is (5 + 1) + 10 = 16 — the two numbers deliberately differ by
// exactly 1, so this fixture would catch the bug Fix 1 corrects (a Treasure/Poison pair
// cancels the fold's effect on the total and would not).
const resolvedTrick: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: 7 } }, // Treasure
    { side: PlayerSide.Cpu, card: { suit: Suit.Keys, rank: 2 } }, // plain
  ],
  winner: PlayerSide.Cpu,
}

describe('TrickWell — claim control (AC3)', () => {
  it('previews the claim worth with the Treasure/Poison fold applied, matching spoils exactly', () => {
    const { container } = render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={vi.fn()}
        claimable
        creditsRemaining={3}
        onClaim={vi.fn()}
      />,
    )
    // The rendered number sits inside a <b>, splitting the sentence across elements
    // (the same reason WarCouncilRound.test.tsx reads `.textContent` off a queried node
    // rather than matching a plain string/regex across it) — no accessible name exists
    // for a purely informational paragraph, so this reads the paragraph's own textContent
    // via the same CSS-class query `HandFan.test.tsx` already uses for `.wc-fan`.
    const claimWorth = container.querySelector('.wc-claim-worth')
    expect(claimWorth?.textContent).toBe('Claiming credits 16 Spoils.')
  })

  it('reports a claim through the button, once the credited worth is read', () => {
    const onClaim = vi.fn()
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={vi.fn()}
        claimable
        creditsRemaining={3}
        onClaim={onClaim}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /claim these — 3 credits left/i }))
    expect(onClaim).toHaveBeenCalledTimes(1)
  })

  it('renders no claim control, and no claim-worth preview, when the trick is not claimable', () => {
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={vi.fn()}
        claimable={false}
        creditsRemaining={3}
        onClaim={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /claim these/i })).toBeNull()
    expect(screen.queryByText(/Claiming credits/)).toBeNull()
  })
})
