/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DuelSide, PLAYER_START_HEALTH, quarryHealthForEncounter } from '../../../hunt'
import { duelHealthBars } from '../duelHealthBars.ts'
import DuelHealthBars from '../DuelHealthBars.tsx'

afterEach(cleanup)

const MAX = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}
const FULL = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}

function renderPair(current: Record<DuelSide, number>, projected: Record<DuelSide, number>) {
  return render(
    <DuelHealthBars bars={duelHealthBars(current, projected, MAX)} centre={<span>trio</span>} />,
  )
}

describe('DuelHealthBars', () => {
  it('puts both sides on screen as separately named meters (AC1, AC7)', () => {
    renderPair(FULL, FULL)
    expect(screen.getByRole('meter', { name: 'Your health' })).toBeTruthy()
    expect(screen.getByRole('meter', { name: 'The Quarry’s health' })).toBeTruthy()
  })

  it('renders the centre slot between the two bars', () => {
    renderPair(FULL, FULL)
    expect(screen.getByText('trio')).toBeTruthy()
  })

  it('reads the current total to a screen reader — no pending figure exists (DLR-80)', () => {
    const dented = {
      [DuelSide.Player]: PLAYER_START_HEALTH - 3,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    }
    renderPair(dented, dented)
    const player = screen.getByRole('meter', { name: 'Your health' })
    expect(player.getAttribute('aria-valuenow')).toBe(String(PLAYER_START_HEALTH - 3))
    expect(player.getAttribute('aria-valuemax')).toBe(String(PLAYER_START_HEALTH))
    expect(player.getAttribute('aria-valuetext')).toBe(
      `${PLAYER_START_HEALTH - 3} of ${PLAYER_START_HEALTH}.`,
    )
  })

  it('is not lethal at zero health with nothing pending — that side is already dead', () => {
    const empty = { [DuelSide.Player]: 0, [DuelSide.Quarry]: quarryHealthForEncounter(0) }
    const { container } = renderPair(empty, empty)
    expect(screen.getByRole('meter', { name: 'Your health' }).getAttribute('aria-valuetext')).toBe(
      `0 of ${PLAYER_START_HEALTH}.`,
    )
    expect(container.querySelectorAll('.wc-hp-pending.wc-is-lethal')).toHaveLength(0)
  })

  it('sets the two segment widths as custom properties, never as an inline width', () => {
    // A pending segment is dead in this app's own call shape (current always equals projected —
    // WarCouncilRound.tsx's own comment says why), but `duelHealthBars`/`DuelHealthBars` remain
    // generically capable of rendering one, so this pins the CSS mechanics against whatever
    // percentage the pure function itself computes, rather than a restated literal.
    const quarryMax = quarryHealthForEncounter(0)
    const current = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }
    const projected = {
      [DuelSide.Player]: PLAYER_START_HEALTH,
      [DuelSide.Quarry]: quarryMax - Math.round(quarryMax * 0.4),
    }
    const [, quarryView] = duelHealthBars(current, projected, MAX)
    const { container } = renderPair(current, projected)
    const pending = container.querySelector<HTMLElement>(
      '.wc-hp[data-side="quarry"] .wc-hp-pending',
    )
    expect(pending?.style.getPropertyValue('--w')).toBe(`${quarryView.pendingPct}%`)
    expect(pending?.style.width).toBe('')
  })
})
