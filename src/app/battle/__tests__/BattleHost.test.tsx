import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { convertScoreToMuster, type VanguardState } from '../../../vanguard'
import { PlayerSide, scoreRound, type WarCouncilState } from '../../../warCouncil'
import type { TricksWon } from '../../tricksWon'
import type { VanguardMountProps } from '../../vanguardMount'
import type { WarCouncilMountProps } from '../../warCouncilMount'

afterEach(cleanup)

const SCRIPTED_TRICKS: TricksWon = { player: 9, cpu: 4 }

vi.mock('../../vanguard/VanguardMatch', () => ({
  default: function MockVanguardMatch({ requestTricksWon, onComplete }: VanguardMountProps) {
    const [tricks, setTricks] = useState<TricksWon | null>(null)
    useEffect(() => {
      requestTricksWon(1).then(setTricks)
    }, [requestTricksWon])
    return (
      <div data-testid="vanguard-match-stub">
        <span data-testid="received-tricks">
          {tricks ? `${tricks.player}-${tricks.cpu}` : 'pending'}
        </span>
        <button
          onClick={() => onComplete({ finalState: {} as VanguardState, winner: PlayerSide.Player })}
        >
          force-breach
        </button>
      </div>
    )
  },
}))

vi.mock('../../warCouncil/WarCouncilRound', () => ({
  default: function MockWarCouncilRound({ onComplete }: WarCouncilMountProps) {
    return (
      <button
        onClick={() =>
          onComplete({
            finalState: { tricksWon: SCRIPTED_TRICKS } as unknown as WarCouncilState,
            score: scoreRound(SCRIPTED_TRICKS),
          })
        }
      >
        complete-round
      </button>
    )
  },
}))

const { default: BattleHost } = await import('../BattleHost')

describe('BattleHost', () => {
  it('drives a full round through to Breach, threading score, muster, and tricks at each handoff', async () => {
    render(<BattleHost />)

    // VanguardMatch's mocked effect has already requested round 1's tricks —
    // BattleHost deals it and overlays the War Council round.
    fireEvent.click(screen.getByRole('button', { name: 'complete-round' }))

    const expectedScore = scoreRound(SCRIPTED_TRICKS)
    const expectedMuster = convertScoreToMuster(expectedScore)
    const panel = screen.getByRole('region', { name: 'The War Council has spoken' })
    expect(within(panel).getByText(String(SCRIPTED_TRICKS.player))).toBeDefined()
    expect(within(panel).getByText(String(SCRIPTED_TRICKS.cpu))).toBeDefined()
    expect(within(panel).getByText(String(expectedScore.player))).toBeDefined()
    expect(within(panel).getByText(String(expectedMuster[PlayerSide.Player]))).toBeDefined()
    expect(within(panel).getByText(String(expectedMuster[PlayerSide.Cpu]))).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Begin The Clash' }))

    // The overlay is gone and VanguardMatch's pending promise resolved with
    // exactly the tricks the round produced. The resolution reaches the
    // mock's own state through a promise microtask, so this needs a flush.
    expect(screen.queryByRole('region', { name: 'The War Council has spoken' })).toBeNull()
    await waitFor(() =>
      expect(screen.getByTestId('received-tricks').textContent).toBe(
        `${SCRIPTED_TRICKS.player}-${SCRIPTED_TRICKS.cpu}`,
      ),
    )

    // Now genuinely back in the vanguard state (matches the real
    // invariant — Breach can only resolve while no round is in flight).
    fireEvent.click(screen.getByRole('button', { name: 'force-breach' }))

    expect(screen.getByRole('heading', { name: /taken the Vanguard/i })).toBeDefined()
    expect(screen.getByText(/Breach reached in round 1/i)).toBeDefined()
  })
})
