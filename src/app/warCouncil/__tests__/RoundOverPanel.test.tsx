/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import RoundOverPanel from '../RoundOverPanel'

afterEach(cleanup)

const baseProps = {
  tricksWon: { [PlayerSide.Player]: 4, [PlayerSide.Cpu]: 2 },
  handSummary: { healthLost: 3, dealtToQuarry: 87 },
  onFinish: vi.fn(),
}

describe('RoundOverPanel — the hand-over tally and its single control (DLR-80, DLR-82)', () => {
  it('shows this hand’s own tally — tricks, health lost, health dealt to the Quarry', () => {
    render(<RoundOverPanel {...baseProps} />)
    expect(screen.getByRole('cell', { name: '4' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '2' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '3' })).toBeTruthy()
    expect(screen.getByRole('cell', { name: '87' })).toBeTruthy()
  })

  it('offers only the finish control', () => {
    render(<RoundOverPanel {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Deal the next Hunt' })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('calls onFinish once per click, so one hand is dealt once', () => {
    const onFinish = vi.fn()
    render(<RoundOverPanel {...baseProps} onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: 'Deal the next Hunt' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('always offers the next-hand control — a resolved encounter no longer renders here (DLR-82)', () => {
    render(<RoundOverPanel {...baseProps} />)
    expect(screen.getByRole('heading').textContent).toBe('The hand is over')
    expect(screen.getByRole('button', { name: 'Deal the next Hunt' })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
