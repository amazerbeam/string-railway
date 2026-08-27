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
  buffAccrual: null,
  firedBuffIds: [],
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

  it('2026-08-25 — an unpaid buff bonus is folded into the multiplier and both cash figures', () => {
    const { container } = render(
      <BankMeter
        bank={2}
        multiplier={2}
        lastResolution={null}
        pendingBonus={{ multiplierBonus: 2, flatDamageBonus: 1 }}
      />,
    )
    // Momentum lands inside the product: 2 x (2 + 2) = 8, plus Blade's +1 on top = 9.
    expect(container.querySelector('.wc-bank-cash')?.textContent).toContain('9')
    expect(container.querySelector('.wc-bank-pending-bonus')?.textContent).toContain('+2')
    expect(container.querySelector('.wc-bank-pending')?.textContent).toContain('+2')
    expect(container.querySelector('.wc-bank-pending')?.textContent).toContain('+1')
  })

  it('shows no pending-bonus readout when nothing is unpaid', () => {
    const { container } = render(<BankMeter bank={2} multiplier={2} lastResolution={null} />)
    expect(container.querySelector('.wc-bank-pending')).toBeNull()
    expect(container.querySelector('.wc-bank-pending-bonus')).toBeNull()
  })

  it('DLR-150 AC6 — shows what this hand opened on, named in the aria-label', () => {
    render(
      <BankMeter
        bank={0}
        multiplier={0}
        lastResolution={null}
        carriedIn={{ multiplierBonus: 3, flatDamageBonus: 2 }}
      />,
    )
    expect(screen.getByText(/carried in from last hand/i)).toBeTruthy()
    expect(
      screen.getByLabelText(/3 multiplier and 2 damage carried in from last hand/i),
    ).toBeTruthy()
  })

  it('DLR-150 AC6 — shows what this hand is banking for the next one, without touching cash-out', () => {
    const withCarryOut = render(
      <BankMeter
        bank={2}
        multiplier={2}
        lastResolution={null}
        carryOut={{ multiplierBonus: 2, flatDamageBonus: 1 }}
      />,
    )
    expect(screen.getByText(/banking for next hand/i)).toBeTruthy()
    const cashWithCarryOut = withCarryOut.container.querySelector('.wc-bank-cash')?.textContent
    cleanup()

    // AC1 on the readout: the same render with an empty carryOut cashes for the same figure —
    // carryOut is never folded into what this hand's cash-out pays.
    const { container: withoutCarryOut } = render(
      <BankMeter bank={2} multiplier={2} lastResolution={null} />,
    )
    expect(withoutCarryOut.querySelector('.wc-bank-cash')?.textContent).toBe(cashWithCarryOut)
  })

  it('DLR-150 AC6 — shows neither carry line when both are empty', () => {
    const { container } = render(<BankMeter bank={2} multiplier={2} lastResolution={null} />)
    expect(container.querySelector('.wc-bank-carried-in')).toBeNull()
    expect(container.querySelector('.wc-bank-carry-out')).toBeNull()
    expect(screen.queryByText(/carried in from last hand/i)).toBeNull()
    expect(screen.queryByText(/banking for next hand/i)).toBeNull()
  })
})
