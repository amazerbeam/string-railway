/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import RoundTransitionPanel from '../RoundTransitionPanel'

afterEach(cleanup)

describe('RoundTransitionPanel', () => {
  it('shows the round’s tricks, score, and Muster for both sides — AC1, AC3', () => {
    render(
      <RoundTransitionPanel
        round={3}
        dealer={PlayerSide.Player}
        tricksWon={{ player: 8, cpu: 5 }}
        score={{ player: 6, cpu: 2 }}
        muster={{ player: 10, cpu: 7 }}
        onContinue={() => {}}
      />,
    )
    const panel = screen.getByRole('region', { name: 'The War Council has spoken' })
    expect(within(panel).getByText('Round 3 complete')).toBeDefined()
    expect(within(panel).getByText('8')).toBeDefined()
    expect(within(panel).getByText('6')).toBeDefined()
    expect(within(panel).getByText('5')).toBeDefined()
    expect(within(panel).getByText('2')).toBeDefined()
    expect(within(panel).getByText('10')).toBeDefined()
    expect(within(panel).getByText('7')).toBeDefined()
  })

  it('names this round’s dealer and next round’s dealer distinctly — AC1', () => {
    render(
      <RoundTransitionPanel
        round={1}
        dealer={PlayerSide.Cpu}
        tricksWon={{ player: 4, cpu: 9 }}
        score={{ player: 1, cpu: 6 }}
        muster={{ player: 7, cpu: 10 }}
        onContinue={() => {}}
      />,
    )
    // dealer = Cpu this round, so next round's dealer alternates to Player.
    expect(screen.getByText('the opponent', { selector: 'strong' })).toBeDefined()
    expect(screen.getByText('you', { selector: 'strong' })).toBeDefined()
  })

  it('calls onContinue when the primary control is pressed', () => {
    const onContinue = vi.fn()
    render(
      <RoundTransitionPanel
        round={1}
        dealer={PlayerSide.Player}
        tricksWon={{ player: 8, cpu: 5 }}
        score={{ player: 6, cpu: 2 }}
        muster={{ player: 10, cpu: 7 }}
        onContinue={onContinue}
      />,
    )
    screen.getByRole('button', { name: 'Begin The Clash' }).click()
    expect(onContinue).toHaveBeenCalledOnce()
  })
})
