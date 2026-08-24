/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunOutcome } from '../../../hunt'
import RunOutcomePanel from '../RunOutcomePanel'
import {
  CONTINUE_ANYWAY_LABEL,
  MAP_LABEL,
  NEW_RUN_LABEL,
  SHOP_LABEL,
  VAULT_LABEL,
  VISIT_SHOP_LABEL,
  fightLabel,
  rewardText,
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
  onVault: vi.fn(),
  beatenName: undefined,
  nextName: 'Cillian',
  onMap: vi.fn(),
  quickKillPayout: 10,
  winCoins: 1,
}

describe('RunOutcomePanel — the three verdicts (AC2, AC4, AC5)', () => {
  it('offers both forward controls when a fight is won and another remains (AC2)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByRole('button', { name: fightLabel(baseProps.nextName) })).toBeTruthy()
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
    expect(screen.queryByRole('button', { name: fightLabel(baseProps.nextName) })).toBeNull()
    expect(screen.queryByRole('button', { name: SHOP_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: VISIT_SHOP_LABEL })).toBeNull()
    expect(screen.queryByRole('button', { name: CONTINUE_ANYWAY_LABEL })).toBeNull()
    expect(screen.getByRole('button', { name: NEW_RUN_LABEL })).toBeTruthy()
  })

  it('offers a control named Open the Vault on a terminal verdict, which calls onVault (DLR-118)', () => {
    const onVault = vi.fn()
    render(
      <RunOutcomePanel
        {...baseProps}
        encounterIndex={2}
        carriedHealth={0}
        outcome={RunOutcome.Lost}
        canContinue={false}
        onVault={onVault}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: VAULT_LABEL }))
    expect(onVault).toHaveBeenCalledTimes(1)
  })

  it('offers NO Vault control while a run can still continue (DLR-118)', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.queryByRole('button', { name: VAULT_LABEL })).toBeNull()
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
    // DLR-95 — the reward line is also a `role="status"` region, so this queries all of them
    // rather than assuming there is exactly one.
    expect(screen.getAllByRole('status').some((el) => el.textContent?.includes('of 3'))).toBe(true)
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
    fireEvent.click(screen.getByRole('button', { name: fightLabel(baseProps.nextName) }))
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
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue warning />)
    expect(screen.getByRole('button', { name: VISIT_SHOP_LABEL })).toBeTruthy()
    expect(screen.getByRole('button', { name: CONTINUE_ANYWAY_LABEL })).toBeTruthy()
    expect(screen.queryByRole('button', { name: fightLabel(baseProps.nextName) })).toBeNull()
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

describe('RunOutcomePanel — naming and the map control (DLR-85)', () => {
  it('names the opponent just beaten in the headline (AC8)', () => {
    render(
      <RunOutcomePanel
        {...baseProps}
        outcome={RunOutcome.InProgress}
        canContinue
        beatenName="Aoife"
      />,
    )
    expect(screen.getByRole('heading', { name: 'Aoife defeated' })).toBeTruthy()
  })

  it('names the next opponent on the primary control (AC8)', () => {
    render(
      <RunOutcomePanel
        {...baseProps}
        outcome={RunOutcome.InProgress}
        canContinue
        nextName="Cillian"
      />,
    )
    expect(screen.getByRole('button', { name: 'Fight Cillian' })).toBeTruthy()
  })

  it('offers a Map control that fires onMap (AC9)', () => {
    const onMap = vi.fn()
    render(
      <RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue onMap={onMap} />,
    )
    fireEvent.click(screen.getByRole('button', { name: MAP_LABEL }))
    expect(onMap).toHaveBeenCalledTimes(1)
  })

  it('offers no Map or continue control on a finished run', () => {
    render(<RunOutcomePanel {...baseProps} canContinue={false} outcome={RunOutcome.Lost} />)
    expect(screen.queryByRole('button', { name: MAP_LABEL })).toBeNull()
    expect(screen.getByRole('button', { name: NEW_RUN_LABEL })).toBeTruthy()
  })
})

describe('RunOutcomePanel — the quick-kill receipt (DLR-95 AC6)', () => {
  it('names both payouts on a won fight', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.InProgress} canContinue />)
    expect(screen.getByText(rewardText(1, 10))).toBeTruthy()
  })

  it('names the flat coin alone when the taper paid nothing (AC5)', () => {
    render(
      <RunOutcomePanel
        {...baseProps}
        quickKillPayout={0}
        outcome={RunOutcome.InProgress}
        canContinue
      />,
    )
    expect(screen.getByText(rewardText(1, 0))).toBeTruthy()
  })

  it('shows the receipt on the final fight of a won run, where canContinue is false', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.Won} canContinue={false} />)
    expect(screen.getByText(rewardText(1, 10))).toBeTruthy()
  })

  it('shows no receipt at all on a lost run', () => {
    render(<RunOutcomePanel {...baseProps} outcome={RunOutcome.Lost} canContinue={false} />)
    expect(screen.queryByText(rewardText(1, 10))).toBeNull()
    expect(screen.queryByText(rewardText(1, 0))).toBeNull()
  })
})
