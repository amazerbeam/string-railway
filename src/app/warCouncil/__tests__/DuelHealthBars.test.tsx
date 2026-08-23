/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DuelSide,
  NO_PENDING_TIMEBOMB,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
} from '../../../hunt'
import { duelHealthBars, projectedDepletion, type HealthBarOverlays } from '../duelHealthBars.ts'
import DuelHealthBars from '../DuelHealthBars.tsx'
import { HEALTH_BAR_LABEL, quarryHealthLabel } from '../labels'

afterEach(cleanup)

const MAX = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}
const FULL = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}

/** A NAMED Quarry label, so the assertions prove the threaded string reaches the meter rather
 *  than passing against the generic fallback by coincidence. */
const QUARRY_LABEL = quarryHealthLabel('Aoife')

function renderPair(
  current: Record<DuelSide, number>,
  projected: Record<DuelSide, number>,
  breaking?: Record<DuelSide, number>,
) {
  const overlays: HealthBarOverlays = breaking ? { breaking } : {}
  return render(
    <DuelHealthBars
      bars={duelHealthBars(current, projected, MAX, overlays)}
      centre={<span>trio</span>}
      quarryLabel={QUARRY_LABEL}
    />,
  )
}

describe('DuelHealthBars', () => {
  it('puts both sides on screen as separately named meters (AC1, AC7)', () => {
    renderPair(FULL, FULL)
    expect(screen.getByRole('meter', { name: 'Your health' })).toBeTruthy()
    expect(screen.getByRole('meter', { name: QUARRY_LABEL })).toBeTruthy()
  })

  it('names the Quarry bar after the opponent it is handed, not generically', () => {
    renderPair(FULL, FULL)
    expect(screen.getByRole('meter', { name: 'Aoife’s health' })).toBeTruthy()
    // The generic wording is the fallback only — it must not reach the screen when a name was
    // threaded, which is the whole point of the prop.
    expect(screen.queryByRole('meter', { name: HEALTH_BAR_LABEL[DuelSide.Quarry] })).toBeNull()
    // The label shows to a sighted reader as well as to a screen reader.
    expect(screen.getByText('Aoife’s health')).toBeTruthy()
  })

  it('keeps the player bar generic — it needs nothing from the run', () => {
    renderPair(FULL, FULL)
    expect(screen.getByRole('meter', { name: HEALTH_BAR_LABEL[DuelSide.Player] })).toBeTruthy()
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

  it('renders one heart per health point, counted from max (AC1)', () => {
    const { container } = renderPair(FULL, FULL)
    const player = container.querySelector('.wc-hp[data-side="player"]')
    const quarry = container.querySelector('.wc-hp[data-side="quarry"]')
    expect(player?.querySelectorAll('.wc-hp-heart')).toHaveLength(PLAYER_START_HEALTH)
    expect(quarry?.querySelectorAll('.wc-hp-heart')).toHaveLength(quarryHealthForEncounter(0))
  })

  it('marks the hearts this event took as breaking, and the rest of the loss as broken (AC2)', () => {
    const dented = {
      [DuelSide.Player]: PLAYER_START_HEALTH - 4,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    }
    const { container } = renderPair(dented, dented, {
      [DuelSide.Player]: 2,
      [DuelSide.Quarry]: 0,
    })
    const player = container.querySelector('.wc-hp[data-side="player"]')
    expect(player?.querySelectorAll('[data-state="whole"]')).toHaveLength(PLAYER_START_HEALTH - 4)
    expect(player?.querySelectorAll('[data-state="breaking"]')).toHaveLength(2)
    expect(player?.querySelectorAll('[data-state="broken"]')).toHaveLength(2)
  })

  it('previews the streak on the Quarry’s hearts and says so to a screen reader (AC3, AC6)', () => {
    const quarryMax = quarryHealthForEncounter(0)
    const current = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }
    const { container } = renderPair(
      current,
      projectedDepletion(current, 2, 2, NO_PENDING_TIMEBOMB),
    )
    const quarry = container.querySelector('.wc-hp[data-side="quarry"]')
    expect(quarry?.querySelectorAll('[data-state="atRisk"]')).toHaveLength(4)
    expect(screen.getByRole('meter', { name: QUARRY_LABEL }).getAttribute('aria-valuetext')).toBe(
      `${quarryMax} of ${quarryMax}. 4 at risk.`,
    )
  })

  it('renders booked Timebomb as ticking hearts and names the figure to a screen reader (DLR-101)', () => {
    const quarryMax = quarryHealthForEncounter(0)
    const current = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }
    const projected = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax - 4 }
    const { container } = render(
      <DuelHealthBars
        bars={duelHealthBars(current, projected, MAX, {
          ticking: { [DuelSide.Player]: 0, [DuelSide.Quarry]: 4 },
        })}
        centre={<span>trio</span>}
        quarryLabel={QUARRY_LABEL}
      />,
    )
    const quarry = container.querySelector('.wc-hp[data-side="quarry"]')
    expect(quarry?.querySelectorAll('[data-state="ticking"]')).toHaveLength(4)
    expect(
      screen.getByRole('meter', { name: QUARRY_LABEL }).getAttribute('aria-valuetext'),
    ).toContain('ticking')
  })

  it('binds each heart to the symbol its state calls for — a broken state is a different shape, not a colour (AC6)', () => {
    const dented = {
      [DuelSide.Player]: PLAYER_START_HEALTH - 1,
      [DuelSide.Quarry]: quarryHealthForEncounter(0),
    }
    const { container } = renderPair(dented, dented)
    const hearts = container.querySelectorAll('.wc-hp[data-side="player"] .wc-hp-heart use')
    expect(hearts[0]?.getAttribute('href')).toBe('#hp-heart')
    expect(hearts[hearts.length - 1]?.getAttribute('href')).toBe('#hp-heart-broken')
  })

  it('writes no inline style on any heart — the retired `--w` split’s successor guarantee', () => {
    const { container } = renderPair(FULL, FULL)
    const styled = Array.from(container.querySelectorAll<HTMLElement>('.wc-hp-heart')).filter((h) =>
      h.getAttribute('style'),
    )
    expect(styled).toHaveLength(0)
  })
})
