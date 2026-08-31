/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuffTier, mintFromTemplate, templateById, timebombBuff } from '../../../hunt'
import { Suit } from '../../../warCouncil'
import BuffRidingList from '../BuffRidingList'
import type { RidingBuffRow } from '../buffRideModel'

afterEach(cleanup)

const taker = mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, 1)
const cheat = mintFromTemplate(templateById('cheat')!, BuffTier.Bronze, 2)
const timebombCard = timebombBuff(BuffTier.Bronze, 3)

describe('BuffRidingList', () => {
  it('renders nothing at all when nothing is riding (game-ux — no empty frame)', () => {
    const { container } = render(<BuffRidingList rows={[]} onRemove={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one row per row, naming the buff and its reach sentence (AC9)', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: taker, reach: 3, revocable: true, timebomb: null },
      { buff: cheat, reach: 0, revocable: false, timebomb: null },
    ]
    render(<BuffRidingList rows={rows} onRemove={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Riding this trick' })).toBeTruthy()
    expect(screen.getByText(/lights up 3 of your cards/i)).toBeTruthy()
  })

  it('renders the explicit zero-reach sentence, not "0 cards" (AC9)', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: cheat, reach: 0, revocable: false, timebomb: null },
    ]
    render(<BuffRidingList rows={rows} onRemove={vi.fn()} />)
    expect(screen.getByText(/no card in your hand can fire it/i)).toBeTruthy()
    expect(screen.queryByText(/0 cards/i)).toBeNull()
  })

  it('gives a revocable row a remove button naming the trick and the go-dark count (AC9/AC10)', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: taker, reach: 3, revocable: true, timebomb: null },
    ]
    render(<BuffRidingList rows={rows} onRemove={vi.fn()} />)
    const button = screen.getByRole('button', { name: /off the trick.*3 cards go dark/i })
    expect(button).toBeTruthy()
  })

  it('gives a non-revocable row no remove control, and states why instead', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: cheat, reach: 0, revocable: false, timebomb: null },
    ]
    render(<BuffRidingList rows={rows} onRemove={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(/already spent|no condition/i)).toBeTruthy()
  })

  it('calls onRemove once with the row buff id when its remove control is clicked', () => {
    const onRemove = vi.fn()
    const rows: readonly RidingBuffRow[] = [
      { buff: taker, reach: 3, revocable: true, timebomb: null },
    ]
    render(<BuffRidingList rows={rows} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(taker.id)
  })

  it('states the Timebomb is not yet primed, and is not greyed — AC12', () => {
    const rows: readonly RidingBuffRow[] = [
      {
        buff: timebombCard,
        reach: 0,
        revocable: true,
        timebomb: { target: null, fuseRemaining: 0 },
      },
    ]
    render(<BuffRidingList rows={rows} onRemove={vi.fn()} />)
    expect(screen.getByText(/not yet primed/i)).toBeTruthy()
    expect(document.querySelector('.wc-is-unreachable')).toBeNull()
  })

  it('names its target and offers its own removal once primed — AC5/AC12', () => {
    const five = { suit: Suit.Bells, rank: 5 }
    const rows: readonly RidingBuffRow[] = [
      {
        buff: timebombCard,
        reach: 0,
        revocable: true,
        timebomb: { target: five, fuseRemaining: 2 },
      },
    ]
    render(<BuffRidingList rows={rows} onRemove={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: /take the timebomb back off the 5 of/i }),
    ).toBeTruthy()
  })
})
