/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import TrickEntryForm from '../TrickEntryForm'

afterEach(cleanup)

describe('TrickEntryForm — AC6', () => {
  it('derives the opponent’s count instead of asking for it', () => {
    render(<TrickEntryForm round={1} onSubmit={vi.fn()} />)
    const input = screen.getByLabelText(/tricks you won/i)
    fireEvent.change(input, { target: { value: '9' } })
    expect(screen.getByText(/they won 4/i)).toBeDefined()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
  })

  it('submits a split that always sums to a full round', () => {
    const onSubmit = vi.fn()
    render(<TrickEntryForm round={1} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/tricks you won/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /convert to muster/i }))
    expect(onSubmit).toHaveBeenCalledWith({ [PlayerSide.Player]: 3, [PlayerSide.Cpu]: 10 })
  })

  it('refuses an out-of-range entry rather than clamping it', () => {
    const onSubmit = vi.fn()
    render(<TrickEntryForm round={1} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/tricks you won/i), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('button', { name: /convert to muster/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/whole number from 0 to 13/i)).toBeDefined()
  })
})
