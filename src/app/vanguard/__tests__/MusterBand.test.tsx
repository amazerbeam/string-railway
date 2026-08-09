/** @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TurnIndicator, type ClashHudState } from '../clashHud'
import MusterBand from '../MusterBand'

afterEach(cleanup)

const hud = (overrides: Partial<ClashHudState>): ClashHudState => ({
  playerMuster: 5,
  cpuMuster: 3,
  indicator: TurnIndicator.PlayerTurn,
  uncontested: false,
  ...overrides,
})

describe('MusterBand', () => {
  it('shows both sides’ Muster counts in a labelled group', () => {
    render(<MusterBand hud={hud({ playerMuster: 5, cpuMuster: 3 })} />)
    const group = screen.getByRole('group', { name: 'Muster and turn' })
    expect(within(group).getByText('5')).toBeDefined()
    expect(within(group).getByText('3')).toBeDefined()
  })

  it('shows an em dash for either side before a clash exists, not a false zero', () => {
    render(
      <MusterBand
        hud={hud({ playerMuster: null, cpuMuster: null, indicator: TurnIndicator.AwaitingMuster })}
      />,
    )
    const group = screen.getByRole('group', { name: 'Muster and turn' })
    expect(within(group).getAllByText('—')).toHaveLength(2)
    expect(within(group).getByText('Awaiting Muster')).toBeDefined()
  })

  it('switches the turn indicator’s text between Player and Cpu — AC5', () => {
    const { rerender } = render(<MusterBand hud={hud({ indicator: TurnIndicator.PlayerTurn })} />)
    expect(screen.getByText('Your move')).toBeDefined()

    rerender(<MusterBand hud={hud({ indicator: TurnIndicator.CpuTurn })} />)
    expect(screen.getByText('Their move')).toBeDefined()
    expect(screen.queryByText('Your move')).toBeNull()
  })

  it('marks the uncontested state visibly, distinct from the plain turn label', () => {
    render(<MusterBand hud={hud({ uncontested: true })} />)
    const badge = screen.getByText('Uncontested')
    expect(badge.dataset.visible).toBe('true')
  })

  it('reads as resolved once the exchange ends, with the final tallies intact', () => {
    render(
      <MusterBand
        hud={hud({ playerMuster: 2, cpuMuster: 1, indicator: TurnIndicator.Resolved })}
      />,
    )
    expect(screen.getByText('Exchange resolved')).toBeDefined()
    const group = screen.getByRole('group', { name: 'Muster and turn' })
    expect(within(group).getByText('2')).toBeDefined()
    expect(within(group).getByText('1')).toBeDefined()
  })
})
