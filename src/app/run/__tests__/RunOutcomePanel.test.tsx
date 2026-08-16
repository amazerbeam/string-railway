/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunOutcome } from '../../../hunt'
import RunOutcomePanel from '../RunOutcomePanel'
import { NEW_RUN_LABEL, NEXT_FIGHT_LABEL } from '../runLabels'

afterEach(cleanup)

const baseProps = {
  encounterIndex: 0,
  encounterCount: 3,
  carriedHealth: 6,
  tricks: { taken: 4, lost: 2 },
  onNextFight: vi.fn(),
  onNewRun: vi.fn(),
}

describe('RunOutcomePanel — the three verdicts (AC2, AC4, AC5)', () => {
  it('offers the continue control when a fight is won and another remains (AC2)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('button', { name: NEXT_FIGHT_LABEL })).toBeTruthy()
    expect(screen.queryByRole('button', { name: NEW_RUN_LABEL })).toBeNull()
  })

  it('offers NO further fight once the player is down (AC4)', () => {
    render(
      <RunOutcomePanel
        {...baseProps}
        encounterIndex={2}
        carriedHealth={0}
        outcome={RunOutcome.Lost}
        canContinue={false}
      />,
    )
    expect(screen.queryByRole('button', { name: NEXT_FIGHT_LABEL })).toBeNull()
    expect(screen.getByRole('button', { name: NEW_RUN_LABEL })).toBeTruthy()
  })

  it('heads a won run differently from a won intermediate fight (AC5)', () => {
    const { rerender } = render(
      <RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />,
    )
    const intermediate = screen.getByRole('heading').textContent
    rerender(
      <RunOutcomePanel
        {...baseProps}
        encounterIndex={2}
        outcome={RunOutcome.Won}
        canContinue={false}
      />,
    )
    expect(screen.getByRole('heading').textContent).not.toBe(intermediate)
  })

  it('states which fight of the run the verdict belongs to (AC6)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('status').textContent).toContain('of 3')
  })

  it('draws one bar per trick of the deciding hand, marked taken or lost', () => {
    const { container } = render(
      <RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />,
    )
    expect(container.querySelectorAll('.run-trick')).toHaveLength(6)
    expect(container.querySelectorAll('.run-trick.is-lost')).toHaveLength(2)
  })

  it('states the trick split in text, so it does not depend on colour (game-ux)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('group', { name: /tricks taken/i })).toBeTruthy()
  })

  it('fires each handler exactly once per click, so a fight is not advanced twice', () => {
    const onNextFight = vi.fn()
    render(
      <RunOutcomePanel
        {...baseProps}
        outcome={RunOutcome.InProgress}
        canContinue
        onNextFight={onNextFight}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: NEXT_FIGHT_LABEL }))
    expect(onNextFight).toHaveBeenCalledTimes(1)
  })

  it('renders a bar row with no lost tricks without crashing', () => {
    const { container } = render(
      <RunOutcomePanel
        {...baseProps}
        tricks={{ taken: 6, lost: 0 }}
        outcome={RunOutcome.InProgress}
        canContinue
      />,
    )
    expect(container.querySelectorAll('.run-trick')).toHaveLength(6)
    expect(container.querySelectorAll('.run-trick.is-lost')).toHaveLength(0)
  })
})
