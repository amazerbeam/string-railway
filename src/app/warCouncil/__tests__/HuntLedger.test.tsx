/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HuntDeclaration, resolveStanding, standingTableFor } from '../../../hunt'
import HuntLedger from '../HuntLedger'

afterEach(cleanup)

const winTable = standingTableFor(HuntDeclaration.Win)

describe('HuntLedger', () => {
  it('names the running Spoils, the Standing band with its multiplier, and the Damage they make', () => {
    const band = resolveStanding(7, winTable) // Victorious ×5 on the Win table
    render(<HuntLedger spoils={48} band={band} />)

    expect(screen.getByLabelText('Running Spoils: 48')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Victorious, multiplier 5/)).toBeDefined()
    expect(screen.getByLabelText('Damage so far: 240')).toBeDefined()
  })

  it('reads the Damage as 0, not blank, when the band multiplier is 0', () => {
    // No shipped band is ×0 since DLR-66, so the falsy-multiplier guard builds its own band.
    // The regression it protects against — a `0` rendering as an empty cell — is unchanged.
    const zeroBand = { ...resolveStanding(10, winTable), multiplier: 0 }
    render(<HuntLedger spoils={84} band={zeroBand} />)

    expect(screen.getByLabelText('Damage so far: 0')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Greedy, multiplier 0/)).toBeDefined()
  })

  it('renders no Demand cell and no credits cell', () => {
    render(<HuntLedger spoils={48} band={resolveStanding(7, winTable)} />)
    expect(screen.queryByLabelText(/The Demand/)).toBeNull()
    expect(screen.queryByLabelText(/Lose-credits remaining/)).toBeNull()
  })
})
