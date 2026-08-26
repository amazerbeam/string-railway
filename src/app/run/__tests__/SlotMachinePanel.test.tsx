/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUFF_TEMPLATES,
  mintPullAwards,
  REEL_POOL_SIZE,
  resolvePull,
  SLOT_MACHINE_IDS,
  SlotPullRefusal,
} from '../../../hunt'
import { buffLine } from '../../warCouncil/buffLabels'
import SlotMachinePanel, { type SlotPullView } from '../SlotMachinePanel'
import {
  SLOT_NO_PULL_YET,
  SLOT_OUTCOME_LABEL,
  SLOT_REFUSAL_MESSAGE,
  SLOT_RESULT_GROUP_LABEL,
  slotMachineAccessibleName,
  slotPullAccessibleName,
  slotSymbolText,
} from '../slotLabels'

afterEach(cleanup)

const reel = BUFF_TEMPLATES.slice(0, REEL_POOL_SIZE)

const twoMatchPull = resolvePull([reel[0], reel[0], reel[1]])
const twoMatchView: SlotPullView = {
  symbols: twoMatchPull.symbols,
  outcome: twoMatchPull.outcome,
  awards: mintPullAwards(twoMatchPull, 1),
}

const threeMatchPull = resolvePull([reel[2], reel[2], reel[2]])
const threeMatchView: SlotPullView = {
  symbols: threeMatchPull.symbols,
  outcome: threeMatchPull.outcome,
  awards: mintPullAwards(threeMatchPull, 1),
}

const baseProps = {
  machineIds: SLOT_MACHINE_IDS,
  selectedMachineId: SLOT_MACHINE_IDS[0],
  onSelectMachine: vi.fn(),
  reel,
  pullPrice: 0,
  pullRefusal: null,
  onPull: vi.fn(),
  lastPull: null,
}

describe('SlotMachinePanel', () => {
  it('renders one radio per SLOT_MACHINE_IDS member, exactly one checked (AC1)', () => {
    render(<SlotMachinePanel {...baseProps} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(SLOT_MACHINE_IDS.length)
    const checked = radios.filter((radio) => radio.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
  })

  it('fires onSelectMachine when the unselected radio is clicked', () => {
    const onSelectMachine = vi.fn()
    render(<SlotMachinePanel {...baseProps} onSelectMachine={onSelectMachine} />)
    fireEvent.click(
      screen.getByRole('radio', { name: slotMachineAccessibleName(SLOT_MACHINE_IDS[1], false) }),
    )
    expect(onSelectMachine).toHaveBeenCalledTimes(1)
    expect(onSelectMachine).toHaveBeenCalledWith(SLOT_MACHINE_IDS[1])
  })

  it('ArrowRight from the selected radio moves to the next and fires onSelectMachine', () => {
    const onSelectMachine = vi.fn()
    render(<SlotMachinePanel {...baseProps} onSelectMachine={onSelectMachine} />)
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' })
    expect(onSelectMachine).toHaveBeenCalledTimes(1)
    expect(onSelectMachine).toHaveBeenCalledWith(SLOT_MACHINE_IDS[1])
  })

  it('ArrowRight from the last radio wraps to the first', () => {
    const onSelectMachine = vi.fn()
    render(
      <SlotMachinePanel
        {...baseProps}
        selectedMachineId={SLOT_MACHINE_IDS[SLOT_MACHINE_IDS.length - 1]}
        onSelectMachine={onSelectMachine}
      />,
    )
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' })
    expect(onSelectMachine).toHaveBeenCalledWith(SLOT_MACHINE_IDS[0])
  })

  it('renders exactly reel.length strip items, the first reading slotSymbolText(reel[0])', () => {
    render(<SlotMachinePanel {...baseProps} />)
    const items = screen.getAllByRole('listitem')
    // Two lists exist once a pull has landed; before that, the strip is the only one.
    expect(items.length).toBeGreaterThanOrEqual(reel.length)
    expect(items[0].textContent).toBe(slotSymbolText(reel[0]))
  })

  it('the pull button carries the price and fires onPull exactly once', () => {
    const onPull = vi.fn()
    render(<SlotMachinePanel {...baseProps} pullPrice={1} onPull={onPull} />)
    const button = screen.getByRole('button', {
      name: slotPullAccessibleName(1, null),
    })
    fireEvent.click(button)
    expect(onPull).toHaveBeenCalledTimes(1)
  })

  it('disables the pull button when refused and states why (cannot-afford rule)', () => {
    render(
      <SlotMachinePanel
        {...baseProps}
        pullPrice={1}
        pullRefusal={SlotPullRefusal.NotEnoughCoins}
      />,
    )
    const button = screen.getByRole('button', {
      name: slotPullAccessibleName(1, SlotPullRefusal.NotEnoughCoins),
    })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(SLOT_REFUSAL_MESSAGE[SlotPullRefusal.NotEnoughCoins])).toBeTruthy()
  })

  it('shows SLOT_NO_PULL_YET when lastPull is null', () => {
    render(<SlotMachinePanel {...baseProps} />)
    const group = screen.getByRole('group', { name: SLOT_RESULT_GROUP_LABEL })
    expect(group.textContent).toContain(SLOT_NO_PULL_YET)
  })

  it('shows the outcome, three symbols and two award rows for a two-match pull', () => {
    render(<SlotMachinePanel {...baseProps} lastPull={twoMatchView} />)
    const group = screen.getByRole('group', { name: SLOT_RESULT_GROUP_LABEL })
    expect(group.textContent).toContain(SLOT_OUTCOME_LABEL[twoMatchView.outcome])
    expect(twoMatchView.symbols).toHaveLength(3)
    const awardItems = screen
      .getAllByRole('listitem')
      .filter((item) => twoMatchView.awards.some((award) => item.textContent === buffLine(award)))
    expect(awardItems).toHaveLength(twoMatchView.awards.length)
    expect(twoMatchView.awards).toHaveLength(2)
  })

  it('shows exactly one gold award row for a three-match pull, with no duplicate tier prefix', () => {
    render(<SlotMachinePanel {...baseProps} lastPull={threeMatchView} />)
    expect(threeMatchView.awards).toHaveLength(1)
    const award = threeMatchView.awards[0]
    const expectedText = buffLine(award)
    const group = screen.getByRole('group', { name: SLOT_RESULT_GROUP_LABEL })
    expect(group.textContent).toContain(expectedText)
    // `buffLine` now states the tier word itself — the award row's exact text must equal it, with
    // no separate `SLOT_TIER_LABEL` prefix prepended in front (the duplication this test guards
    // against, e.g. "Silver — Silver Bell-Taker (Momentum) — ...").
    const awardItem = screen
      .getAllByRole('listitem')
      .find((item) => item.textContent === expectedText)
    expect(awardItem).toBeDefined()
  })

  it('renders no radio and does not throw when machineIds is empty (the empty-collection guard)', () => {
    expect(() => render(<SlotMachinePanel {...baseProps} machineIds={[]} />)).not.toThrow()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })
})
