/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import BattleOverPanel from '../BattleOverPanel'

afterEach(cleanup)

describe('BattleOverPanel', () => {
  it('names the player as winner on a Player-Breach fixture — AC2, AC3', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Player} />)
    expect(screen.getByRole('heading', { name: 'You have taken the Vanguard' })).toBeDefined()
    expect(screen.queryByText(/opponent has taken/)).toBeNull()
  })

  it('names the opponent as winner on a CPU-Breach fixture — AC2, AC3', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Cpu} />)
    expect(
      screen.getByRole('heading', { name: 'The opponent has taken the Vanguard' }),
    ).toBeDefined()
    expect(screen.queryByText(/^You have taken/)).toBeNull()
  })

  it('renders no interactive control — active play ends here (AC2)', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Player} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('names the round the Breach was reached in', () => {
    render(<BattleOverPanel round={5} winner={PlayerSide.Player} />)
    expect(screen.getByText('Breach reached in round 5')).toBeDefined()
  })
})
