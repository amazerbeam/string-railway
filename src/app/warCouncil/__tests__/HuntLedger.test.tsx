/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HuntDeclaration, resolveStanding } from '../../../hunt'
import type { DeclarationState } from '../../../warCouncil'
import HuntLedger from '../HuntLedger'

afterEach(cleanup)

const losing: DeclarationState = {
  path: HuntDeclaration.Lose,
  creditsRemaining: 2,
  creditedCards: [],
  creditedThrough: 0,
}

describe('HuntLedger', () => {
  it('names the Demand, the running Spoils, the Standing band with its multiplier, and the product', () => {
    const band = resolveStanding(7) // Victorious ×6
    render(<HuntLedger demand={220} spoils={48} band={band} declaration={null} />)

    expect(screen.getByLabelText('The Demand: 220')).toBeDefined()
    expect(screen.getByLabelText('Running Spoils: 48')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Victorious, multiplier 6/)).toBeDefined()
    expect(screen.getByLabelText('Score so far: 288')).toBeDefined()
  })

  it('reads the score as 0, not blank, when the band multiplier is 0 (Greedy, 10+ tricks)', () => {
    const band = resolveStanding(10)
    expect(band.multiplier).toBe(0)
    render(<HuntLedger demand={220} spoils={84} band={band} declaration={null} />)

    expect(screen.getByLabelText('Score so far: 0')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Greedy, multiplier 0/)).toBeDefined()
  })

  it('shows the remaining credits under a Lose declaration', () => {
    render(<HuntLedger demand={100} spoils={12} band={resolveStanding(2)} declaration={losing} />)
    expect(screen.getByLabelText('Lose-credits remaining: 2')).toBeDefined()
  })

  it('renders a zero credit count rather than blanking it', () => {
    render(
      <HuntLedger
        demand={100}
        spoils={12}
        band={resolveStanding(2)}
        declaration={{ ...losing, creditsRemaining: 0 }}
      />,
    )
    expect(screen.getByLabelText('Lose-credits remaining: 0')).toBeDefined()
  })

  it('shows no credits cell under a Win declaration or while undeclared', () => {
    render(<HuntLedger demand={100} spoils={12} band={resolveStanding(7)} declaration={null} />)
    expect(screen.queryByLabelText(/Lose-credits remaining/)).toBeNull()
  })
})
