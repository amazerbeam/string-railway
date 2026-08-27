/** @vitest-environment jsdom */
/**
 * DLR-148 Phase 5 Task 13 — `TrickConsequence` renders a `TrickConsequenceView` it never builds
 * itself (`trickConsequence.ts` owns every rule); this spec is about what the component does with
 * a view it is handed, not about the rule table.
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import { consequenceAccessibleName } from '../consequenceLabels'
import TrickConsequence from '../TrickConsequence'
import { trickConsequence, type TrickConsequenceFacts } from '../trickConsequenceModel'

afterEach(cleanup)

// A skulled Quarry lead that is not a Swan and not a lone Witch — the plain two-row case
// (`YouEatSkull` win branch, `TheyEatSkull` lose branch), no rule row muddying AC15's check.
const SKULLED_LEAD_FACTS: TrickConsequenceFacts = {
  led: { side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 4 } },
  skulled: true,
  trumpSuit: Suit.Keys,
  witchCount: 0,
}

describe('TrickConsequence', () => {
  it('renders nothing at all when there is no view (AC14) — no placeholder row, no empty frame', () => {
    const { container } = render(<TrickConsequence view={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders both branch labels and both consequences for a skulled lead (AC13)', () => {
    const view = trickConsequence(SKULLED_LEAD_FACTS)
    expect(view).not.toBeNull()
    const { getByText } = render(<TrickConsequence view={view} />)
    expect(getByText('If you win')).toBeDefined()
    expect(getByText('If you lose')).toBeDefined()
    expect(getByText(/You eat the skull/)).toBeDefined()
    expect(getByText(/They eat the skull/)).toBeDefined()
  })

  it('gives neither branch row an emphasis class, an ordering marker, or an aria attribute the other lacks (AC15)', () => {
    const view = trickConsequence(SKULLED_LEAD_FACTS)
    const { container } = render(<TrickConsequence view={view} />)
    const rows = Array.from(container.querySelectorAll('.wc-readout-row'))
    expect(rows).toHaveLength(2)
    const [first, second] = rows
    // Identical class list — neither branch is styled as more important than the other.
    expect(first.className).toBe(second.className)
    // No row carries an attribute (an aria-* flag, an ordering data-attribute) the other lacks.
    expect(first.getAttributeNames().sort()).toEqual(second.getAttributeNames().sort())
  })

  it('never colours the branch label — colour appears only on the consequence text', () => {
    const view = trickConsequence(SKULLED_LEAD_FACTS)
    const { container } = render(<TrickConsequence view={view} />)
    const labels = Array.from(container.querySelectorAll('.wc-readout-label'))
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label.className).not.toMatch(/wc-is-costly|wc-is-worthwhile/)
    }
    const costly = container.querySelector('.wc-readout-clause.wc-is-costly')
    const worthwhile = container.querySelector('.wc-readout-clause.wc-is-worthwhile')
    expect(costly).not.toBeNull()
    expect(worthwhile).not.toBeNull()
  })

  it('gives the whole readout one accessible name from consequenceAccessibleName', () => {
    const view = trickConsequence(SKULLED_LEAD_FACTS)
    expect(view).not.toBeNull()
    const { container } = render(<TrickConsequence view={view} />)
    const readout = container.querySelector('.wc-readout')
    expect(readout?.getAttribute('aria-label')).toBe(consequenceAccessibleName(view!))
  })
})
