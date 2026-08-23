/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TrickOutcome, type TrickResolution } from '../../../warCouncil'
import BankMeter from '../BankMeter'

afterEach(cleanup)

const cleanLoss: TrickResolution = {
  outcome: TrickOutcome.CleanLoss,
  bankAdded: 0,
  cashOut: 9,
  damageToPlayer: 1,
  bank: 0,
  multiplier: 0,
  cashedAtHandEnd: false,
  timebombTarget: null,
  timebombToQuarry: 0,
  blastGuardSpent: false,
}

describe('BankMeter', () => {
  it('shows the tricks, the multiplier, and what the streak would cash for', () => {
    render(<BankMeter bank={3} multiplier={3} lastResolution={null} />)
    expect(screen.getByLabelText(/tricks 3, multiplier 3, cashes for 9/i)).toBeTruthy()
  })

  it('says what the last trick did', () => {
    render(<BankMeter bank={0} multiplier={0} lastResolution={cleanLoss} />)
    expect(screen.getByText(/the streak cashes/i)).toBeTruthy()
  })

  it('reads zero at the start of a hand', () => {
    render(<BankMeter bank={0} multiplier={0} lastResolution={null} />)
    expect(screen.getByLabelText(/cashes for 0/i)).toBeTruthy()
  })

  it('names the readout region "Tricks and Multiplier"', () => {
    render(<BankMeter bank={0} multiplier={0} lastResolution={null} />)
    expect(screen.getByRole('region', { name: 'Tricks and Multiplier' })).toBeTruthy()
  })

  it('DLR-94 — shows what the streak pays if the player is hit before applying', () => {
    render(<BankMeter bank={3} multiplier={3} lastResolution={null} />)
    // 3 x 3 = 9 in full; two-thirds of 9, floored, is 6.
    expect(screen.getByLabelText(/cashes for 9, or 6 if you are hit first/i)).toBeTruthy()
  })

  it('DLR-94 — the reduced figure is on the face of the readout, not behind a hover', () => {
    const { container } = render(<BankMeter bank={5} multiplier={5} lastResolution={null} />)
    // 5 x 5 = 25; two-thirds floored is 16.
    expect(container.querySelector('.wc-bank-forced')?.textContent).toContain('16')
  })
})
