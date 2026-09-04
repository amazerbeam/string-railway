import { describe, expect, it } from 'vitest'
import { BuffTier, RunOutcome } from '../../../hunt'
import { VAULT_EXCHANGE_RATE, VAULT_STARTING_TIER_PRICE, VaultSpendRefusal } from '../../../vault'
import { SaveReadOutcome, SaveWriteOutcome } from '../../../persistence'
import {
  VAULT_READ_PROBLEM,
  VAULT_WRITE_PROBLEM,
  VAULT_REFUSAL_MESSAGE,
  VAULT_TIER_LABEL,
  currencyText,
  vaultDepositText,
  startingTierAccessibleName,
} from '../vaultLabels'
import { creditedFromRun } from '../vaultRunCredit'

describe('VAULT_READ_PROBLEM', () => {
  it('has an entry for every SaveReadOutcome, with Loaded and Empty null', () => {
    for (const outcome of Object.values(SaveReadOutcome)) {
      expect(Object.prototype.hasOwnProperty.call(VAULT_READ_PROBLEM, outcome)).toBe(true)
    }
    expect(VAULT_READ_PROBLEM[SaveReadOutcome.Loaded]).toBeNull()
    expect(VAULT_READ_PROBLEM[SaveReadOutcome.Empty]).toBeNull()
  })

  it('is non-null for every real failure outcome', () => {
    expect(VAULT_READ_PROBLEM[SaveReadOutcome.Corrupt]).not.toBeNull()
    expect(VAULT_READ_PROBLEM[SaveReadOutcome.VersionMismatch]).not.toBeNull()
    expect(VAULT_READ_PROBLEM[SaveReadOutcome.Unavailable]).not.toBeNull()
  })
})

describe('VAULT_WRITE_PROBLEM', () => {
  it('has an entry for every SaveWriteOutcome, with only Written null', () => {
    for (const outcome of Object.values(SaveWriteOutcome)) {
      expect(Object.prototype.hasOwnProperty.call(VAULT_WRITE_PROBLEM, outcome)).toBe(true)
    }
    expect(VAULT_WRITE_PROBLEM[SaveWriteOutcome.Written]).toBeNull()
    expect(VAULT_WRITE_PROBLEM[SaveWriteOutcome.Rejected]).not.toBeNull()
    expect(VAULT_WRITE_PROBLEM[SaveWriteOutcome.Unavailable]).not.toBeNull()
  })
})

describe('VAULT_REFUSAL_MESSAGE', () => {
  it('has a non-empty entry for every VaultSpendRefusal', () => {
    for (const refusal of Object.values(VaultSpendRefusal)) {
      expect(VAULT_REFUSAL_MESSAGE[refusal]).toBeTruthy()
    }
  })
})

describe('VAULT_TIER_LABEL', () => {
  it('has a non-empty entry for every BuffTier', () => {
    for (const tier of Object.values(BuffTier)) {
      expect(VAULT_TIER_LABEL[tier]).toBeTruthy()
    }
  })
})

describe('vaultDepositText', () => {
  it('on a won run, contains no digit from the credited figure and differs from the lost sentence', () => {
    const coins = VAULT_EXCHANGE_RATE * 3 + 7
    const wonText = vaultDepositText(RunOutcome.Won, coins)
    const credited = creditedFromRun(RunOutcome.Lost, coins)
    expect(wonText).not.toContain(String(credited))
    const lostText = vaultDepositText(RunOutcome.Lost, coins)
    expect(wonText).not.toBe(lostText)
  })

  it('below the exchange rate, quotes VAULT_EXCHANGE_RATE by interpolation', () => {
    const text = vaultDepositText(RunOutcome.Lost, VAULT_EXCHANGE_RATE - 1)
    expect(text).toContain(String(VAULT_EXCHANGE_RATE))
  })
})

describe('currencyText', () => {
  it('is singular at 1 and plural at 2', () => {
    expect(currencyText(1)).toContain('mark')
    expect(currencyText(1)).not.toContain('marks')
    expect(currencyText(2)).toContain('marks')
  })
})

describe('startingTierAccessibleName', () => {
  it('contains the configured price for every tier', () => {
    for (const tier of Object.values(BuffTier)) {
      const name = startingTierAccessibleName(tier, null)
      expect(name).toContain(String(VAULT_STARTING_TIER_PRICE[tier]))
    }
  })
})
