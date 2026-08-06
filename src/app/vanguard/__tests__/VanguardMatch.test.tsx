/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
const clashStarted = () =>
  waitFor(() => expect(screen.getByRole('button', { name: /Expand/ })).toBeDefined())

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

  it('submits a legal Expand to the engine — AC2', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    fireEvent.click(screen.getByRole('button', { name: /Expand/ }))

    const target = screen
      .getAllByRole('button')
      .find(
        (b) =>
          /^Cell /.test(b.getAttribute('aria-label') ?? '') && !(b as HTMLButtonElement).disabled,
      )
    expect(target).toBeDefined()
    const nameBefore = target!.getAttribute('aria-label')!
    fireEvent.click(target!)

    await waitFor(() => expect(screen.queryByRole('button', { name: nameBefore })).toBeNull())
  })

  it('submits a legal Overwrite to the engine — AC2', async () => {
    render(
      <VanguardMatch
        initialState={makeBoard()}
        requestTricksWon={resolveTricks}
        onComplete={vi.fn()}
      />,
    )
    await clashStarted()
    fireEvent.click(screen.getByRole('button', { name: /Overwrite/ }))

    const target = cell('Cell 2, 1 — their token')
    expect(target.disabled).toBe(false)
    fireEvent.click(target)

    await waitFor(() => expect(cell('Cell 2, 1 — your token')).toBeDefined())
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
    fireEvent.click(screen.getByRole('button', { name: /Overwrite/ }))

    const defense = cell('Cell 2, 2 — permanent defense')
    expect(defense.disabled).toBe(true)
    fireEvent.click(defense)
    expect(cell('Cell 2, 2 — permanent defense')).toBeDefined()
  })
})
