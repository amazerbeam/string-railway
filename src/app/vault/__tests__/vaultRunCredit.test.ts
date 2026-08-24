import { describe, expect, it } from 'vitest'
import { RunOutcome } from '../../../hunt'
import { VAULT_EXCHANGE_RATE } from '../../../vault'
import { creditedFromRun } from '../vaultRunCredit'

describe('creditedFromRun — the loss-only deposit rule', () => {
  it('credits floor(coins / rate) on a lost run', () => {
    expect(creditedFromRun(RunOutcome.Lost, VAULT_EXCHANGE_RATE * 3 + 7)).toBe(3)
  })

  it('credits 0 on a lost run with fewer coins than the exchange rate', () => {
    expect(creditedFromRun(RunOutcome.Lost, VAULT_EXCHANGE_RATE - 1)).toBe(0)
  })

  it('credits NOTHING on a won run, whatever the leftover coin', () => {
    expect(creditedFromRun(RunOutcome.Won, VAULT_EXCHANGE_RATE * 3 + 7)).toBe(0)
  })

  it('credits NOTHING while the run is still in progress', () => {
    expect(creditedFromRun(RunOutcome.InProgress, VAULT_EXCHANGE_RATE * 3 + 7)).toBe(0)
  })

  it('credits 0 for zero coins on a lost run', () => {
    expect(creditedFromRun(RunOutcome.Lost, 0)).toBe(0)
  })

  it('credits 0 for a negative coin count on a lost run', () => {
    expect(creditedFromRun(RunOutcome.Lost, -VAULT_EXCHANGE_RATE * 5)).toBe(0)
  })

  it('credits 0 for a non-finite coin count on a lost run', () => {
    expect(creditedFromRun(RunOutcome.Lost, Number.POSITIVE_INFINITY)).toBe(0)
    expect(creditedFromRun(RunOutcome.Lost, Number.NaN)).toBe(0)
  })
})
