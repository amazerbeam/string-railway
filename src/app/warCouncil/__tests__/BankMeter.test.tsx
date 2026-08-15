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
})
