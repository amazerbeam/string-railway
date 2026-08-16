/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunOutcome } from '../../../hunt'
import RunOutcomePanel from '../RunOutcomePanel'
import {
  CONTINUE_ANYWAY_LABEL,
  CONTINUE_LABEL,
  NEW_RUN_LABEL,
  SHOP_LABEL,
  VISIT_SHOP_LABEL,
} from '../runLabels'

afterEach(cleanup)

const baseProps = {
  encounterIndex: 0,
  encounterCount: 3,
  carriedHealth: 6,
  tricks: { taken: 4, lost: 2 },
  coins: 2,
  warning: false,
  onShop: vi.fn(),
  onContinue: vi.fn(),
  onDismissWarning: vi.fn(),
  onNewRun: vi.fn(),
}

describe('RunOutcomePanel — the three verdicts (AC2, AC4, AC5)', () => {
  it('offers both forward controls when a fight is won and another remains (AC2)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('button', { name: CONTINUE_LABEL })).toBeTruthy()
    expect(screen.getByRole('button', { name: SHOP_LABEL })).toBeTruthy()
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
    expect(screen.queryByRole('button', { name: CONTINUE_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: SHOP_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: VISIT_SHOP_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: CONTINUE_ANYWAY_LABEL })).toBeNull()
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
    const onContinue = vi.fn()
    render(
      <RunOutcomePanel
        {...baseProps}
        outcome={RunOutcome.InProgress}
        canContinue
        onContinue={onContinue}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: CONTINUE_LABEL }))
    expect(onContinue).toHaveBeenCalledTimes(1)
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

describe('RunOutcomePanel — the unspent-coin warning (DLR-84)', () => {
  it('replaces the plain pair with the warning pair when warning is true', () => {
    render(
      <RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue warning />,
    )
    expect(screen.getByRole('button', { name: VISIT_SHOP_LABEL })).toBeTruthy()
    expect(screen.getByRole('button', { name: CONTINUE_ANYWAY_LABEL })).toBeTruthy()
    expect(screen.queryByRole('button', { name: CONTINUE_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: SHOP_LABEL })).toBeNull()
  })

  it("states the balance in the warning's sentence", () => {
    render(
      <RunOutcomePanel
        {...baseProps}
        outcome={RunOutcome.InProgress}
        canContinue
        warning
        coins={3}
      />,
    )
    expect(screen.getAllByRole('status').some((el) => el.textContent?.includes('3'))).toBe(true)
  })

  it('fires onDismissWarning exactly once on Escape', () => {
    const onDismissWarning = vi.fn()
    const { container } = render(
      <RunOutcomePanel
        {...baseProps}
        outcome={RunOutcome.InProgress}
        canContinue
        warning
        onDismissWarning={onDismissWarning}
      />,
    )
    const warningEl = container.querySelector('.run-warning')
    expect(warningEl).toBeTruthy()
    fireEvent.keyDown(warningEl as Element, { key: 'Escape' })
    expect(onDismissWarning).toHaveBeenCalledTimes(1)
  })
})
