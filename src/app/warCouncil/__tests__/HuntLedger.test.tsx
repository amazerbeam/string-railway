/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HuntDeclaration, resolveStanding, standingTableFor } from '../../../hunt'
import HuntLedger from '../HuntLedger'

afterEach(cleanup)

describe('HuntLedger — the Standing readout only (DLR-71)', () => {
  const winTable = standingTableFor(HuntDeclaration.Win)

  it('names the band and its multiplier for a screen reader', () => {
    render(<HuntLedger band={resolveStanding(7, winTable)} table={winTable} tricks={7} />)
    expect(screen.getByLabelText('Standing band: Victorious, multiplier 5')).toBeTruthy()
  })

  it('renders the whole configured table as a track beside the compact cell', () => {
    render(<HuntLedger band={resolveStanding(7, winTable)} table={winTable} tricks={7} />)
    expect(screen.getByRole('group', { name: 'Standing track' })).toBeTruthy()
  })

  it('no longer shows Spoils or Damage — the health bars carry those now', () => {
    render(<HuntLedger band={resolveStanding(7, winTable)} table={winTable} tricks={7} />)
    expect(screen.queryByText('Spoils')).toBeNull()
    expect(screen.queryByText('Damage')).toBeNull()
  })
})
