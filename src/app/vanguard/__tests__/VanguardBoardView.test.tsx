/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VanguardActionKind, cellKey } from '../../../vanguard'
import { PlayerSide } from '../../../warCouncil'
import { legalTargetsFor } from '../legalTargets'
import VanguardBoardView from '../VanguardBoardView'
import { makeBoard, SMALL_SIZE } from './boardFixture'

afterEach(cleanup)

const board = makeBoard()
const noTargets = new Set<string>()

describe('VanguardBoardView — AC1', () => {
  it('renders one button per board coordinate', () => {
    render(
      <VanguardBoardView
        board={board}
        legalTargets={noTargets}
        interactive={false}
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(SMALL_SIZE * SMALL_SIZE)
  })

  it('names both bases, a reinforced token, a defense cell, and an empty cell', () => {
    render(
      <VanguardBoardView
        board={board}
        legalTargets={noTargets}
        interactive={false}
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Cell 0, 0 — your base, your token' })).toBeDefined()
    expect(
      screen.getByRole('button', { name: 'Cell 4, 4 — their base, their token' }),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cell 1, 1 — your token, reinforced' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cell 2, 2 — permanent defense' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Cell 3, 0 — empty' })).toBeDefined()
  })

  it('disables every cell that is not a legal target — AC2', () => {
    const targets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Reinforce, 9)
    render(
      <VanguardBoardView
        board={board}
        legalTargets={targets}
        interactive
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    // {0,0} is an unreinforced own token — legal. {2,2} is a defense — never legal.
    // `jest-dom` is NOT a dependency here, so there is no `toBeDisabled` matcher:
    // assert the DOM property directly rather than adding a package.
    expect(targets.has(cellKey({ q: 0, r: 0 }))).toBe(true)
    const own = screen.getByRole('button', { name: 'Cell 0, 0 — your base, your token' })
    const defense = screen.getByRole('button', { name: 'Cell 2, 2 — permanent defense' })
    expect((own as HTMLButtonElement).disabled).toBe(false)
    expect((defense as HTMLButtonElement).disabled).toBe(true)
  })

  it('is one tab stop across the whole board, not one per cell', () => {
    render(
      <VanguardBoardView
        board={board}
        legalTargets={noTargets}
        interactive={false}
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const stops = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(stops).toHaveLength(1)
  })

  it('resyncs the tab stop to a focusable cell when the tracked cell stops being legal', () => {
    // The tab stop is seeded to the player's own base ({0,0}), which is a legal Reinforce
    // target (it's their own unreinforced token) but can never be a legal Expand target
    // (Expand only targets empty cells) — switching the armed action from Reinforce to
    // Expand is exactly the scenario where the previously tracked tab stop stops being
    // focusable without any arrow/Home/End key ever firing.
    const reinforceTargets = legalTargetsFor(
      board,
      PlayerSide.Player,
      VanguardActionKind.Reinforce,
      9,
    )
    const expandTargets = legalTargetsFor(board, PlayerSide.Player, VanguardActionKind.Expand, 9)
    expect(reinforceTargets.has(cellKey({ q: 0, r: 0 }))).toBe(true)
    expect(expandTargets.has(cellKey({ q: 0, r: 0 }))).toBe(false)
    expect(expandTargets.size).toBeGreaterThan(0)

    const { rerender } = render(
      <VanguardBoardView
        board={board}
        legalTargets={reinforceTargets}
        interactive
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    rerender(
      <VanguardBoardView
        board={board}
        legalTargets={expandTargets}
        interactive
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    // Some cell must remain a genuinely Tab-reachable tab stop: exactly one button carries
    // tabIndex 0, and it must not be disabled — a disabled native <button> can never receive
    // focus via Tab, so a disabled tab stop would strand keyboard navigation off the board.
    const stops = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(stops).toHaveLength(1)
    expect((stops[0] as HTMLButtonElement).disabled).toBe(false)
    expect(expandTargets.has(stops[0].getAttribute('data-cell') as string)).toBe(true)
  })

  it('crosses an illegal gap on repeated ArrowRight instead of getting stuck on it', () => {
    // A sparse target set with a legal/illegal/legal run: {1,1} and {3,1} are legal,
    // {2,1} in between is not. This is the regression scenario from the Round 2
    // residual — computing the current position from the derived, snapped-back
    // tabStopKey instead of the raw lastChosenKey stranded a player who arrowed onto
    // {2,1} oscillating between {1,1} and {2,1}, never reaching {3,1}.
    const targets = new Set([cellKey({ q: 1, r: 1 }), cellKey({ q: 3, r: 1 })])

    render(
      <VanguardBoardView
        board={board}
        legalTargets={targets}
        interactive
        onTapCell={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const group = screen.getByRole('group')

    // Home genuinely tab-stops the player at {1,1} (the first legal cell in
    // row-major order) — this records {1,1} as the real lastChosenKey, not merely
    // the derived fallback the seeded base {0,0} would otherwise show.
    fireEvent.keyDown(group, { key: 'Home' })
    const afterHome = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(afterHome).toHaveLength(1)
    expect(afterHome[0].getAttribute('data-cell')).toBe(cellKey({ q: 1, r: 1 }))

    fireEvent.keyDown(group, { key: 'ArrowRight' })
    fireEvent.keyDown(group, { key: 'ArrowRight' })

    const stops = screen.getAllByRole('button').filter((b) => b.tabIndex === 0)
    expect(stops).toHaveLength(1)
    expect((stops[0] as HTMLButtonElement).disabled).toBe(false)
    expect(stops[0].getAttribute('data-cell')).toBe(cellKey({ q: 3, r: 1 }))
  })
})
