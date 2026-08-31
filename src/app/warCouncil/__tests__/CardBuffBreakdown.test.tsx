/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Suit } from '../../../warCouncil'
import CardBuffBreakdown from '../CardBuffBreakdown'
import type { CardBuffBreakdown as CardBuffBreakdownModel } from '../buffBreakdownModel'
import { BreakdownBranch } from '../buffBreakdownModel'
import type { RidingBuffRow } from '../buffRideModel'
import { BuffTier, mintFromTemplate, templateById } from '../../../hunt'

afterEach(cleanup)

const bellsTaker = mintFromTemplate(templateById('taker:bells:magnitude')!, BuffTier.Bronze, 1)
const bellsFeeder = mintFromTemplate(templateById('feeder:bells:multiplier')!, BuffTier.Bronze, 2)

const card = { suit: Suit.Bells, rank: 2 } as const

const ridingFixture: readonly RidingBuffRow[] = [
  { buff: bellsTaker, reach: 2, revocable: true, timebomb: null },
  { buff: bellsFeeder, reach: 1, revocable: true, timebomb: null },
]

function fullBreakdown(overrides: Partial<CardBuffBreakdownModel> = {}): CardBuffBreakdownModel {
  return {
    card,
    headerText: '2 of Bells',
    firingCountText: '1 buff could fire on this card',
    dead: [
      {
        buff: bellsFeeder,
        reasonText: 'Needs Bells — this card is Bells.',
        elsewhereText: ' It is lighting 1 of your Bells cards instead.',
      },
    ],
    groups: [
      {
        branch: BreakdownBranch.Took,
        headingText: 'If you take this trick',
        rows: [
          {
            buff: bellsTaker,
            conditionText: 'Play a Bells card and win the trick',
            buffNameText: 'Bells Taker',
            payoffText: '+2 damage',
            mayFire: false,
          },
        ],
      },
      {
        branch: BreakdownBranch.DidNotTake,
        headingText: 'If you do not take this trick',
        rows: [],
      },
    ],
    overlapText: null,
    totals: [
      { branch: BreakdownBranch.Took, damage: 2, multiplier: 0, carryText: null, estimate: false },
      {
        branch: BreakdownBranch.DidNotTake,
        damage: 0,
        multiplier: 0,
        carryText: null,
        estimate: false,
      },
    ],
    ...overrides,
  }
}

function renderBreakdown(overrides: Partial<CardBuffBreakdownModel> = {}, onRemove = vi.fn()) {
  return render(
    <CardBuffBreakdown
      breakdown={fullBreakdown(overrides)}
      riding={ridingFixture}
      onEnter={vi.fn()}
      onLeave={vi.fn()}
      onEscape={vi.fn()}
      onRemove={onRemove}
    />,
  )
}

describe('CardBuffBreakdown', () => {
  it('renders nothing on a null breakdown (game-ux)', () => {
    const { container } = render(
      <CardBuffBreakdown
        breakdown={null}
        riding={ridingFixture}
        onEnter={vi.fn()}
        onLeave={vi.fn()}
        onEscape={vi.fn()}
        onRemove={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders both totals rows with neither carrying an emphasis marker (AC11)', () => {
    renderBreakdown()
    const took = screen.getByText('Take it').closest('[class]')
    const didNotTake = screen.getByText("Don't take it").closest('[class]')
    for (const row of [took, didNotTake]) {
      expect(row).not.toBeNull()
      expect(row!.className).not.toMatch(/emphasis|preferred|current/i)
      expect(row!.getAttribute('aria-current')).toBeNull()
    }
  })

  it('renders the Overlap Bonus row immediately above the totals, and omits it when null (AC11)', () => {
    renderBreakdown({ overlapText: 'Overlap Bonus — +1 multiplier' })
    expect(screen.getByText('Overlap Bonus — +1 multiplier')).toBeTruthy()
  })

  it('omits the Overlap row entirely when overlapText is null', () => {
    renderBreakdown()
    expect(screen.queryByText(/Overlap Bonus/)).toBeNull()
  })

  it('shows each condition row with its buff name and its condition sentence (AC11)', () => {
    renderBreakdown()
    expect(screen.getByText('Bells Taker')).toBeTruthy()
    expect(screen.getByText('Play a Bells card and win the trick')).toBeTruthy()
  })

  it('renders dead rows struck through, with both clauses, before the branch groups in DOM order (AC12)', () => {
    const { container } = renderBreakdown()
    const deadRow = container.querySelector('.wc-buff-breakdown-row.wc-buff-breakdown-dead')
    expect(deadRow).not.toBeNull()
    expect(deadRow!.textContent).toMatch(/Needs Bells/i)
    expect(screen.getByText(/lighting 1 of your Bells cards instead/i)).toBeTruthy()
    const html = container.innerHTML
    expect(html.indexOf('Needs Bells')).toBeLessThan(html.indexOf('Bells Taker'))
  })

  it('renders fully expanded with no expand control (AC13)', () => {
    renderBreakdown()
    expect(screen.queryByRole('button', { name: /expand|collapse|show more/i })).toBeNull()
  })

  it('marks an estimated totals row rather than rendering it as a settled figure (Fix 3)', () => {
    renderBreakdown({
      totals: [
        {
          branch: BreakdownBranch.Took,
          damage: 2,
          multiplier: 0,
          carryText: null,
          estimate: true,
        },
        {
          branch: BreakdownBranch.DidNotTake,
          damage: 0,
          multiplier: 0,
          carryText: null,
          estimate: false,
        },
      ],
    })
    expect(screen.getByText(/not yet known/i)).toBeTruthy()
    // Only ONE row is estimated — the note must not appear twice.
    expect(screen.getAllByText(/not yet known/i)).toHaveLength(1)
  })

  // DLR-153 Phase 8 Correction 2 — "the hover readout was unreachable, and taking the ✕ out of
  // it was pedantry" (`update-log.md`). The buff is listed here, so this is where the hand goes.
  it('gives every condition row a remove control that calls onRemove with that buff id (Correction 2)', () => {
    const onRemove = vi.fn()
    renderBreakdown({}, onRemove)
    const control = screen.getByRole('button', { name: /take bell-taker.*off the trick/i })
    fireEvent.click(control)
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(bellsTaker.id)
  })

  it('gives every struck-through dead row a remove control too — a dead row is still riding (Correction 2)', () => {
    const onRemove = vi.fn()
    renderBreakdown({}, onRemove)
    const control = screen.getByRole('button', { name: /take bell-feeder.*off the trick/i })
    fireEvent.click(control)
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(bellsFeeder.id)
  })

  it('names the trick and what goes dark, never a single card, reusing removeBuffLabel unchanged (Correction 2)', () => {
    renderBreakdown()
    const control = screen.getByRole('button', { name: /take bell-taker.*off the trick/i })
    const accessibleName = control.getAttribute('aria-label') ?? ''
    expect(accessibleName).toMatch(/off the trick/)
    expect(accessibleName).toMatch(/\d+ cards? go dark/)
  })

  // AC18 — with real controls in the panel now (Correction 2), this assertion is finally REAL
  // rather than vacuous: the panel has focusable controls, and blurring one does not close it.
  it('does not close when a control inside it fires blur (AC18)', () => {
    renderBreakdown()
    const panel = screen.getByRole('group', { name: 'What this card is worth' })
    const control = within(panel).getByRole('button', { name: /take bell-taker.*off the trick/i })
    control.focus()
    expect(document.activeElement).toBe(control)
    fireEvent.blur(control)
    expect(screen.getByRole('group', { name: 'What this card is worth' })).toBeTruthy()
  })
})
