/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BUFF_TEMPLATES,
  REEL_COUNT,
  REEL_POOL_SIZE,
  SLOT_MACHINE_IDS,
  mintPullAwards,
  resolvePull,
} from '../../../hunt'
import SlotMachinePanel, { type SlotPullView } from '../SlotMachinePanel'
import { RESULT_REVEAL_MS, SPIN_TOTAL_MS, reelStopMs } from '../slotSpinConfig'
import { SLOT_OUTCOME_LABEL, SLOT_SPINNING_LABEL } from '../slotLabels'

const reel = BUFF_TEMPLATES.slice(0, REEL_POOL_SIZE)

function viewFor(symbols: readonly (typeof reel)[number][]): SlotPullView {
  const pull = resolvePull(symbols)
  return { symbols: pull.symbols, outcome: pull.outcome, awards: mintPullAwards(pull, 1) }
}

const twoMatch = viewFor([reel[0], reel[0], reel[1]])
const threeMatch = viewFor([reel[2], reel[2], reel[2]])
const allDifferent = viewFor([reel[0], reel[1], reel[2]])

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

/** `useSlotSpin` reads `matchMedia` to decide whether to skip the travel. jsdom does not implement
 *  it, so each test states which world it is in rather than depending on a global default. */
function setReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

const reels = () => document.querySelectorAll('.shop-reel')
const pips = () => document.querySelectorAll('.shop-cabinet-pip')

beforeEach(() => {
  vi.useFakeTimers()
  setReducedMotion(false)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the cabinet', () => {
  it('renders one reel window per REEL_COUNT, and a payline pip over each', () => {
    render(<SlotMachinePanel {...baseProps} />)
    expect(reels()).toHaveLength(REEL_COUNT)
    expect(pips()).toHaveLength(REEL_COUNT)
  })

  it('is still at rest on mount — no reel travels until the lever is pulled', () => {
    render(<SlotMachinePanel {...baseProps} lastPull={allDifferent} />)
    for (const window of reels()) {
      expect(window.getAttribute('data-spinning')).toBeNull()
    }
  })
})

describe('the spin', () => {
  it('stops the reels one after another, the last at SPIN_TOTAL_MS', () => {
    const { rerender } = render(<SlotMachinePanel {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /pull/i }))
    rerender(<SlotMachinePanel {...baseProps} lastPull={twoMatch} />)

    // Every reel is turning the moment the lever is pulled.
    expect([...reels()].map((r) => r.getAttribute('data-spinning'))).toEqual(
      Array.from({ length: REEL_COUNT }, () => 'true'),
    )

    // Reel 0 lands first; the later reels are still turning.
    act(() => void vi.advanceTimersByTime(reelStopMs(0, REEL_COUNT)))
    expect([...reels()].map((r) => r.getAttribute('data-spinning'))).toEqual([null, 'true', 'true'])

    // By the developer's two seconds, every reel is at rest.
    act(() => void vi.advanceTimersByTime(SPIN_TOTAL_MS - reelStopMs(0, REEL_COUNT)))
    expect([...reels()].map((r) => r.getAttribute('data-spinning'))).toEqual([null, null, null])
  })

  it('withholds the outcome and the cards until after the reels have settled', () => {
    const { rerender } = render(<SlotMachinePanel {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /pull/i }))
    rerender(<SlotMachinePanel {...baseProps} lastPull={threeMatch} />)

    // Mid-spin the result must NOT be readable — that is the whole point of animating it.
    act(() => void vi.advanceTimersByTime(SPIN_TOTAL_MS - 1))
    expect(screen.queryByText(SLOT_OUTCOME_LABEL[threeMatch.outcome])).toBeNull()
    expect(screen.getAllByText(SLOT_SPINNING_LABEL).length).toBeGreaterThan(0)

    act(() => void vi.advanceTimersByTime(1 + RESULT_REVEAL_MS))
    expect(screen.getByText(SLOT_OUTCOME_LABEL[threeMatch.outcome])).toBeTruthy()
  })

  it('fires onPull exactly once per lever press, and refuses a press mid-spin', () => {
    const onPull = vi.fn()
    render(<SlotMachinePanel {...baseProps} onPull={onPull} />)
    const lever = screen.getByRole('button', { name: /pull/i })
    fireEvent.click(lever)
    expect(onPull).toHaveBeenCalledTimes(1)
    // The lever is disabled while the reels turn, so a second press cannot double-spend.
    expect((lever as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(lever)
    expect(onPull).toHaveBeenCalledTimes(1)
  })

  it('clears its timers on unmount, so nothing fires into a dead component', () => {
    const { unmount, rerender } = render(<SlotMachinePanel {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /pull/i }))
    rerender(<SlotMachinePanel {...baseProps} lastPull={twoMatch} />)
    unmount()
    // Leaving for the next fight mid-spin must not throw when the pending stops come due.
    expect(() => act(() => void vi.advanceTimersByTime(SPIN_TOTAL_MS * 2))).not.toThrow()
  })

  it('under prefers-reduced-motion, lands every reel at once and well inside the two seconds', () => {
    setReducedMotion(true)
    const { rerender } = render(<SlotMachinePanel {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /pull/i }))
    rerender(<SlotMachinePanel {...baseProps} lastPull={twoMatch} />)

    act(() => void vi.advanceTimersByTime(SPIN_TOTAL_MS / 2))
    expect([...reels()].map((r) => r.getAttribute('data-spinning'))).toEqual([null, null, null])
    expect(screen.getByText(SLOT_OUTCOME_LABEL[twoMatch.outcome])).toBeTruthy()
  })
})

describe('reading a match without colour', () => {
  function landed(view: SlotPullView) {
    const { rerender } = render(<SlotMachinePanel {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /pull/i }))
    rerender(<SlotMachinePanel {...baseProps} lastPull={view} />)
    act(() => void vi.advanceTimersByTime(SPIN_TOTAL_MS + RESULT_REVEAL_MS))
  }

  it('rings exactly the two agreeing windows on a two-match, and lights their pips', () => {
    landed(twoMatch)
    expect([...reels()].map((r) => r.getAttribute('data-matched'))).toEqual(['true', 'true', null])
    expect([...pips()].map((p) => p.getAttribute('data-on'))).toEqual(['true', 'true', null])
  })

  it('rings all three on a three-match', () => {
    landed(threeMatch)
    expect([...reels()].map((r) => r.getAttribute('data-matched'))).toEqual([
      'true',
      'true',
      'true',
    ])
  })

  it('rings nothing on an all-different pull — nothing matched', () => {
    landed(allDifferent)
    expect([...reels()].map((r) => r.getAttribute('data-matched'))).toEqual([null, null, null])
    expect(document.querySelector('.shop-cabinet-payline')?.getAttribute('data-live')).toBeNull()
  })
})

describe('the empty-strip guard', () => {
  it('renders still, dark windows and does not throw when the strip has not been drawn', () => {
    expect(() => render(<SlotMachinePanel {...baseProps} reel={[]} />)).not.toThrow()
    expect(document.querySelectorAll('.shop-reel[data-empty="true"]')).toHaveLength(REEL_COUNT)
    // And no strip chips either — `SlotStripChips` returns null rather than an empty frame.
    expect(document.querySelector('.shop-strip-chips')).toBeNull()
  })
})
