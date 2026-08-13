/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import { DuelSide } from '../../../hunt'
import RoundOverPanel from '../RoundOverPanel'

afterEach(cleanup)

const baseProps = {
  tricksWon: { [PlayerSide.Player]: 4, [PlayerSide.Cpu]: 2 },
  handSummary: { healthLost: 3, dealtToQuarry: 87 },
  onFinish: vi.fn(),
}

describe('RoundOverPanel — the hand-over tally, then either the outcome or the next-hand control (DLR-80)', () => {
  it('shows this hand’s own tally — tricks, health lost, health dealt to the Quarry', () => {
    render(<RoundOverPanel {...baseProps} winner={null} />)
    expect(screen.getByRole('cell', { name: '4' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '2' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '3' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '87' })).toBeTruthy()
  })

  it('titles the panel by whether the encounter has resolved', () => {
    const { rerender } = render(<RoundOverPanel {...baseProps} winner={null} />)
    expect(screen.getByRole('heading').textContent).toBe('The hand is over')
    rerender(<RoundOverPanel {...baseProps} winner={DuelSide.Player} />)
    expect(screen.getByRole('heading').textContent).toBe('The Hunt is over')
  })

  it('offers only the finish control while the encounter is still live', () => {
    render(<RoundOverPanel {...baseProps} winner={null} />)
    expect(screen.getByRole('button', { name: 'Deal the next Hunt' })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('calls onFinish once per click, so one hand is dealt once', () => {
    const onFinish = vi.fn()
    render(<RoundOverPanel {...baseProps} winner={null} onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('states the outcome and offers no next-hand control once the Quarry’s bar empties', () => {
    render(<RoundOverPanel {...baseProps} winner={DuelSide.Player} />)
    expect(screen.getByRole('status').textContent).toContain('The Quarry is down')
    expect(screen.queryByRole('button', { name: 'Deal the next Hunt' })).toBeNull()
  })

  it('names the other terminal outcome when the player’s own bar empties', () => {
    render(<RoundOverPanel {...baseProps} winner={DuelSide.Quarry} />)
    expect(screen.getByRole('status').textContent).toContain('You are down')
    expect(screen.queryByRole('button', { name: 'Deal the next Hunt' })).toBeNull()
  })
})
