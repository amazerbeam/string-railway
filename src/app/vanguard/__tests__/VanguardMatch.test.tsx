/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide } from '../../../warCouncil'
import VanguardMatch from '../VanguardMatch'
import { makeBoard } from './boardFixture'

afterEach(cleanup)

// 9 tricks (6 points) beats 4 tricks (1 point), so the player takes the bonus.
const winningSplit = { [PlayerSide.Player]: 9, [PlayerSide.Cpu]: 4 }
const resolveTricks = () => Promise.resolve(winningSplit)
const neverResolves = () => new Promise<never>(() => {})

const cell = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement
// SCRUM-41: no arming step, so "the clash has started (and it's the
// player's turn)" is signalled by at least one board cell becoming a live,
// enabled target — the legend renders no button at all anymore.
const clashStarted = () =>
  waitFor(() =>
    expect(screen.getAllByRole('button').some((b) => !(b as HTMLButtonElement).disabled)).toBe(
      true,
    ),
  )

describe('VanguardMatch', () => {
  it('keeps the board on screen while the War Council result is outstanding — AC3', () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={neverResolves}
        onComplete={vi.fn()}
      />,
    )
    expect(cell('Cell 0, 0 — your base, your token')).toBeDefined()
    expect(cell('Cell 2, 2 — permanent defense')).toBeDefined()
  })

  it('taps an empty cell directly and submits the inferred Expand — SCRUM-41', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    const target = cell('Cell 2, 0 — empty')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Cell 2, 0 — empty' })).toBeNull(),
    )
  })

  it('taps an adjacent enemy token directly and submits the inferred Overwrite — SCRUM-41', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    const target = cell('Cell 1, 2 — their token')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)
    await waitFor(() => expect(cell('Cell 1, 2 — your token')).toBeDefined())
  })

  it('taps the player’s own token directly and submits the inferred Reinforce — SCRUM-41', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    const target = cell('Cell 0, 0 — your base, your token')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)
    await waitFor(() => expect(cell('Cell 0, 0 — your base, your token, reinforced')).toBeDefined())
  })

  it('disables an illegal target so it cannot be submitted — AC2, AC4', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    const defense = cell('Cell 2, 2 — permanent defense')
    expect(defense.disabled).toBe(true)
    fireEvent.click(defense)
    expect(cell('Cell 2, 2 — permanent defense')).toBeDefined()
  })

  // Multiple .vg-muster-value cells exist (player + CPU), so a single-match
  // getByText would throw on "multiple elements found" — read both as one
  // joined string instead, still queried through the accessible group only.
  const musterReading = () =>
    within(screen.getByRole('group', { name: 'Muster and turn' }))
      .getAllByText(/^\d+$/)
      .map((el) => el.textContent)
      .join(',')

  it('updates the rendered Muster count after an accepted action, having switched to the player’s own turn — AC1, AC2, AC5', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    await waitFor(() => expect(screen.getByText('Your move')).toBeDefined())
    expect(screen.queryByText('Awaiting Muster')).toBeNull()
    const before = musterReading()

    const target = cell('Cell 2, 0 — empty')
    fireEvent.click(target)

    await waitFor(() => expect(musterReading()).not.toBe(before))
  })

  it('shows the awaiting-Muster state before the clash starts — AC2, AC5', () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={neverResolves}
        onComplete={vi.fn()}
      />,
    )
    expect(screen.getByText('Awaiting Muster')).toBeDefined()
  })
})
