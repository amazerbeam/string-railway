/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveStanding } from '../../../hunt'
import HuntLedger from '../HuntLedger'

afterEach(cleanup)

describe('HuntLedger', () => {
  it('names the Demand, the running Spoils, the Standing band with its multiplier, and the product', () => {
    const band = resolveStanding(7) // Victorious ×6
    render(<HuntLedger demand={220} spoils={48} band={band} />)

    expect(screen.getByLabelText('The Demand: 220')).toBeDefined()
    expect(screen.getByLabelText('Running Spoils: 48')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Victorious, multiplier 6/)).toBeDefined()
    expect(screen.getByLabelText('Score so far: 288')).toBeDefined()
  })

  it('reads the score as 0, not blank, when the band multiplier is 0 (Greedy, 10+ tricks)', () => {
    const band = resolveStanding(10)
    expect(band.multiplier).toBe(0)
    render(<HuntLedger demand={220} spoils={84} band={band} />)

    expect(screen.getByLabelText('Score so far: 0')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Greedy, multiplier 0/)).toBeDefined()
  })
})
