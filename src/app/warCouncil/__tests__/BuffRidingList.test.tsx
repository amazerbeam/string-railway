/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BuffTier, mintFromTemplate, templateById, timebombBuff, type BuffId } from '../../../hunt'
import { Suit } from '../../../warCouncil'
import BuffRidingList from '../BuffRidingList'
import type { RidingBuffRow } from '../buffRideModel'
import { MotionAnchorProvider } from '../MotionAnchors'

afterEach(cleanup)

const taker = mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, 1)
const cheat = mintFromTemplate(templateById('cheat')!, BuffTier.Bronze, 2)
const timebombCard = timebombBuff(BuffTier.Bronze, 3)

// DLR-157 — `BuffRidingList` now calls `useMotionAnchors()` unconditionally (before its own
// early return, so the hook order stays fixed across an empty-to-non-empty transition), which
// throws outside a `MotionAnchorProvider`. Every render in this file goes through this helper
// for that reason alone; `MotionAnchorProvider` itself renders no wrapping DOM element, so
// `container.firstChild` below is unaffected.
function renderList(
  rows: readonly RidingBuffRow[],
  onRemove: (id: BuffId) => void,
  disabled = false,
) {
  return render(
    <MotionAnchorProvider>
      <BuffRidingList rows={rows} onRemove={onRemove} disabled={disabled} />
    </MotionAnchorProvider>,
  )
}

describe('BuffRidingList', () => {
  it('renders nothing at all when nothing is riding (game-ux — no empty frame)', () => {
    const { container } = renderList([], vi.fn())
    expect(container.firstChild).toBeNull()
  })

  it('renders one row per row, naming the buff and its reach sentence (AC9)', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: taker, reach: 3, revocable: true, timebomb: null },
      { buff: cheat, reach: 0, revocable: false, timebomb: null },
    ]
    renderList(rows, vi.fn())
    expect(screen.getByRole('group', { name: 'Riding this trick' })).toBeTruthy()
    expect(screen.getByText(/lights up 3 of your cards/i)).toBeTruthy()
  })

  it('renders the explicit zero-reach sentence, not "0 cards" (AC9)', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: cheat, reach: 0, revocable: false, timebomb: null },
    ]
    renderList(rows, vi.fn())
    expect(screen.getByText(/no card in your hand can fire it/i)).toBeTruthy()
    expect(screen.queryByText(/0 cards/i)).toBeNull()
  })

  it('gives a revocable row a remove button naming the trick and the go-dark count (AC9/AC10)', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: taker, reach: 3, revocable: true, timebomb: null },
    ]
    renderList(rows, vi.fn())
    const button = screen.getByRole('button', { name: /off the trick.*3 cards go dark/i })
    expect(button).toBeTruthy()
  })

  it('gives a non-revocable row no remove control, and states why instead', () => {
    const rows: readonly RidingBuffRow[] = [
      { buff: cheat, reach: 0, revocable: false, timebomb: null },
    ]
    renderList(rows, vi.fn())
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(/already spent|no condition/i)).toBeTruthy()
  })

  it('calls onRemove once with the row buff id when its remove control is clicked', () => {
    const onRemove = vi.fn()
    const rows: readonly RidingBuffRow[] = [
      { buff: taker, reach: 3, revocable: true, timebomb: null },
    ]
    renderList(rows, onRemove)
    fireEvent.click(screen.getByRole('button'))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(taker.id)
  })

  it('disables the remove button while a buff motion flight is airborne (QA fix — DLR-157 review)', () => {
    const onRemove = vi.fn()
    const rows: readonly RidingBuffRow[] = [
      { buff: taker, reach: 3, revocable: true, timebomb: null },
    ]
    renderList(rows, onRemove, true)
    const button = screen.getByRole('button', {
      name: /off the trick.*3 cards go dark/i,
    }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
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
    renderList(rows, vi.fn())
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
    renderList(rows, vi.fn())
    expect(
      screen.getByRole('button', { name: /take the timebomb back off the 5 of/i }),
    ).toBeTruthy()
  })
})
