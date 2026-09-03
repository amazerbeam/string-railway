/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  BUFF_TEMPLATES,
  mintPullAwards,
  REEL_POOL_SIZE,
  resolvePull,
  SLOT_MACHINE_IDS,
  SlotMachineId,
  SlotPullRefusal,
} from '../../../hunt'
import { buffLine } from '../../warCouncil/buffLabels'
import SlotMachinePanel, { type SlotPullView } from '../SlotMachinePanel'
import {
  SLOT_MACHINE_NAME,
  SLOT_OUTCOME_LABEL,
  SLOT_STRIP_GROUP_LABEL,
  SLOT_REFUSAL_MESSAGE,
  SLOT_RESULT_GROUP_LABEL,
  slotMachineAccessibleName,
  slotPullAccessibleName,
  slotSymbolText,
} from '../slotLabels'

afterEach(cleanup)

const reel = BUFF_TEMPLATES.slice(0, REEL_POOL_SIZE)

/** An EXPLICIT two-machine roster. `SLOT_MACHINE_IDS` is one entry while Strongbox is cut, so the
 *  chooser's keyboard model would otherwise go untested until a machine is restored — and it is
 *  precisely the sort of thing that rots while nothing exercises it. */
const TWO_MACHINES = [SlotMachineId.Skirmisher, SlotMachineId.Strongbox] as const

const twoMatchPull = resolvePull([reel[0], reel[0], reel[1]])
const twoMatchView: SlotPullView = {
  symbols: twoMatchPull.symbols,
  outcome: twoMatchPull.outcome,
  awards: mintPullAwards(twoMatchPull, 1),
  rawAwards: twoMatchPull.awards,
}

const threeMatchPull = resolvePull([reel[2], reel[2], reel[2]])
const threeMatchView: SlotPullView = {
  symbols: threeMatchPull.symbols,
  outcome: threeMatchPull.outcome,
  awards: mintPullAwards(threeMatchPull, 1),
  rawAwards: threeMatchPull.awards,
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
  it('renders a NAMEPLATE and no chooser at the live one-machine roster', () => {
    render(<SlotMachinePanel {...baseProps} />)
    expect(SLOT_MACHINE_IDS).toHaveLength(1)
    // Strongbox is cut, so there is nothing to choose: no radiogroup, no radios, no tab stop.
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.getByText(SLOT_MACHINE_NAME[SLOT_MACHINE_IDS[0]])).toBeTruthy()
  })

  it('becomes a chooser again the moment a second machine is on the roster', () => {
    render(<SlotMachinePanel {...baseProps} machineIds={TWO_MACHINES} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(TWO_MACHINES.length)
    const checked = radios.filter((radio) => radio.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
  })

  it('fires onSelectMachine when the unselected radio is clicked', () => {
    const onSelectMachine = vi.fn()
    render(
      <SlotMachinePanel
        {...baseProps}
        machineIds={TWO_MACHINES}
        onSelectMachine={onSelectMachine}
      />,
    )
    fireEvent.click(
      screen.getByRole('radio', { name: slotMachineAccessibleName(TWO_MACHINES[1], false) }),
    )
    expect(onSelectMachine).toHaveBeenCalledTimes(1)
    expect(onSelectMachine).toHaveBeenCalledWith(TWO_MACHINES[1])
  })

  it('ArrowRight from the selected radio moves to the next and fires onSelectMachine', () => {
    const onSelectMachine = vi.fn()
    render(
      <SlotMachinePanel
        {...baseProps}
        machineIds={TWO_MACHINES}
        onSelectMachine={onSelectMachine}
      />,
    )
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' })
    expect(onSelectMachine).toHaveBeenCalledTimes(1)
    expect(onSelectMachine).toHaveBeenCalledWith(TWO_MACHINES[1])
  })

  it('ArrowRight from the last radio wraps to the first', () => {
    const onSelectMachine = vi.fn()
    render(
      <SlotMachinePanel
        {...baseProps}
        machineIds={TWO_MACHINES}
        selectedMachineId={TWO_MACHINES[TWO_MACHINES.length - 1]}
        onSelectMachine={onSelectMachine}
      />,
    )
    fireEvent.keyDown(screen.getByRole('radiogroup'), { key: 'ArrowRight' })
    expect(onSelectMachine).toHaveBeenCalledWith(TWO_MACHINES[0])
  })

  it('renders one strip chip per reel entry, each carrying the FULL sentence as its name', () => {
    render(<SlotMachinePanel {...baseProps} />)
    // Scoped to the strip's own list: the payout table is a list too, and counting every <li> on
    // the panel would silently pass whatever the strip happened to render.
    const strip = screen.getByRole('list', { name: SLOT_STRIP_GROUP_LABEL })
    expect(within(strip).getAllByRole('listitem')).toHaveLength(reel.length)
    // Compressed to a glyph on its face, but nothing a decision needs is hidden: the one buff
    // grammar is still reachable, and not via hover.
    expect(screen.getByLabelText(slotSymbolText(reel[0]))).toBeTruthy()
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

  it('renders an EMPTY result region before the first pull — no standing placeholder line', () => {
    render(<SlotMachinePanel {...baseProps} />)
    const group = screen.getByRole('group', { name: SLOT_RESULT_GROUP_LABEL })
    // `game-ux`: a readout that sits in the same place every visit saying nothing teaches the
    // player to stop looking at exactly the region their won cards will appear in.
    expect(group.textContent).toBe('')
  })

  it('shows the outcome, three symbols and two award rows for a two-match pull', () => {
    render(<SlotMachinePanel {...baseProps} lastPull={twoMatchView} />)
    const group = screen.getByRole('group', { name: SLOT_RESULT_GROUP_LABEL })
    expect(group.textContent).toContain(SLOT_OUTCOME_LABEL[twoMatchView.outcome])
    expect(twoMatchView.symbols).toHaveLength(3)
    // Each award row's text ENDS WITH `buffLine(award)` rather than equalling it exactly — Task 20
    // prefixes each row with a tier badge, so the row's sentence is unchanged but not the row's
    // whole text content any more.
    const awardItems = screen
      .getAllByRole('listitem')
      .filter((item) =>
        twoMatchView.awards.some((award) => item.textContent?.endsWith(buffLine(award))),
      )
    expect(awardItems).toHaveLength(twoMatchView.awards.length)
    expect(twoMatchView.awards).toHaveLength(2)
  })

  it('AC10 — badges the two matched reel windows Silver and the odd one Bronze', () => {
    render(<SlotMachinePanel {...baseProps} lastPull={twoMatchView} />)
    const badges = document.querySelectorAll(
      '.shop-cabinet-window > .shop-reel-slot > .shop-reel-tier',
    )
    expect(badges).toHaveLength(3)
    const tiers = Array.from(badges).map((badge) => badge.getAttribute('data-tier'))
    expect(tiers).toEqual(['silver', 'silver', 'bronze'])
  })

  it('AC10 — nothing is badged before a pull resolves', () => {
    render(<SlotMachinePanel {...baseProps} />)
    expect(document.querySelectorAll('.shop-reel-tier')).toHaveLength(0)
  })

  it('shows exactly one gold award row for a three-match pull, with no duplicate tier prefix', () => {
    render(<SlotMachinePanel {...baseProps} lastPull={threeMatchView} />)
    expect(threeMatchView.awards).toHaveLength(1)
    const award = threeMatchView.awards[0]
    const expectedText = buffLine(award)
    const group = screen.getByRole('group', { name: SLOT_RESULT_GROUP_LABEL })
    expect(group.textContent).toContain(expectedText)
    // `buffLine` states the tier word itself as part of the sentence — the award row's text ends
    // with it, exactly once, with no separate duplicate tier prefix ahead of the sentence
    // (the duplication this test used to guard against, e.g. "Silver — Silver Bell-Taker …").
    const awardItem = screen
      .getAllByRole('listitem')
      .find((item) => item.textContent?.endsWith(expectedText))
    expect(awardItem).toBeDefined()
  })

  it('renders no radio and no nameplate, and does not throw, when machineIds is empty', () => {
    expect(() => render(<SlotMachinePanel {...baseProps} machineIds={[]} />)).not.toThrow()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(screen.queryByRole('radiogroup')).toBeNull()
  })
})
