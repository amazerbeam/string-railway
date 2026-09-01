/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TrickOutcome, type TrickResolution } from '../../../warCouncil'
import BankMeter from '../BankMeter'

afterEach(cleanup)

const cleanLoss: TrickResolution = {
  outcome: TrickOutcome.CleanLoss,
  trickDamage: null,
  cashOut: 0,
  damageToPlayer: 1,
  total: 0,
  roll: 0,
  timebombTarget: null,
  timebombToQuarry: 0,
  blastGuardSpent: false,
  buffAccrual: null,
  firedBuffIds: [],
}

describe('BankMeter', () => {
  it('shows the total, the roll, and the pot the streak is sitting on', () => {
    render(<BankMeter total={3} roll={3} lastResolution={null} />)
    expect(screen.getByLabelText(/total 3, roll 3, pot stands at 9/i)).toBeTruthy()
  })

  it('says what the last trick did', () => {
    render(<BankMeter total={0} roll={0} lastResolution={cleanLoss} />)
    expect(screen.getByText(/the streak is lost/i)).toBeTruthy()
  })

  it('reads zero at the start of a hand', () => {
    render(<BankMeter total={0} roll={0} lastResolution={null} />)
    expect(screen.getByLabelText(/pot stands at 0/i)).toBeTruthy()
  })

  it('names the readout region "Total and Roll"', () => {
    render(<BankMeter total={0} roll={0} lastResolution={null} />)
    expect(screen.getByRole('region', { name: 'Total and Roll' })).toBeTruthy()
  })

  it('DLR-156 — the pot is total x roll, read off potValue', () => {
    const { container } = render(<BankMeter total={5} roll={5} lastResolution={null} />)
    expect(container.querySelector('.wc-bank-cash')?.textContent).toContain('25')
  })

  it('DLR-150 AC6 — shows what this hand opened on, named in the aria-label', () => {
    render(
      <BankMeter
        total={0}
        roll={0}
        lastResolution={null}
        carriedIn={{ multiplierBonus: 3, flatDamageBonus: 2 }}
      />,
    )
    expect(screen.getByText(/carried in from last hand/i)).toBeTruthy()
    expect(
      screen.getByLabelText(/3 multiplier and 2 damage carried in from last hand/i),
    ).toBeTruthy()
  })

  it('DLR-150 AC6 — shows what this hand is banking for the next one, without touching the pot', () => {
    const withCarryOut = render(
      <BankMeter
        total={2}
        roll={2}
        lastResolution={null}
        carryOut={{ multiplierBonus: 2, flatDamageBonus: 1 }}
      />,
    )
    expect(screen.getByText(/banking for next hand/i)).toBeTruthy()
    const cashWithCarryOut = withCarryOut.container.querySelector('.wc-bank-cash')?.textContent
    cleanup()

    // AC1 on the readout: the same render with an empty carryOut reads the same pot — carryOut
    // is never folded into what this hand's pot is worth.
    const { container: withoutCarryOut } = render(
      <BankMeter total={2} roll={2} lastResolution={null} />,
    )
    expect(withoutCarryOut.querySelector('.wc-bank-cash')?.textContent).toBe(cashWithCarryOut)
  })

  it('DLR-150 AC6 — shows neither carry line when both are empty', () => {
    const { container } = render(<BankMeter total={2} roll={2} lastResolution={null} />)
    expect(container.querySelector('.wc-bank-carried-in')).toBeNull()
    expect(container.querySelector('.wc-bank-carry-out')).toBeNull()
    expect(screen.queryByText(/carried in from last hand/i)).toBeNull()
    expect(screen.queryByText(/banking for next hand/i)).toBeNull()
  })
})
