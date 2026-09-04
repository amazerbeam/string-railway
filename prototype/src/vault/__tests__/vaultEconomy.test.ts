import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES } from '../../hunt/buffTemplates'
import { BuffTier } from '../../hunt/buffs'
import {
  VAULT_ODDS_BOOST_MAX_STACKS,
  VAULT_ODDS_BOOST_PRICE,
  VAULT_STARTING_TIER_PRICE,
} from '../vaultConfig'
import { EMPTY_VAULT, type VaultState } from '../vaultState'
import {
  VaultSpendRefusal,
  buyOddsBoost,
  buyStartingTier,
  clearStartingGrants,
  depositLeftoverCoin,
  oddsBoostRefusalFor,
  startingTierRefusalFor,
} from '../vaultEconomy'

const KNOWN_TEMPLATE_ID = BUFF_TEMPLATES[0].id
const UNKNOWN_TEMPLATE_ID = 'nope:nope'

describe('depositLeftoverCoin', () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [19, 1],
    [100, 10],
  ])('credits floor(%i / RATE) = %i and discards the remainder', (coin, credited) => {
    const result = depositLeftoverCoin(EMPTY_VAULT, coin)
    expect(result.balance).toBe(credited)
  })

  it.each([-5, NaN, Infinity])('credits 0 for a coin figure of %p', (coin) => {
    const result = depositLeftoverCoin(EMPTY_VAULT, coin)
    expect(result.balance).toBe(0)
    expect(Number.isInteger(result.balance)).toBe(true)
  })

  it('does not mutate the input vault', () => {
    const vault = { ...EMPTY_VAULT, balance: 5 }
    depositLeftoverCoin(vault, 100)
    expect(vault.balance).toBe(5)
  })
})

describe('oddsBoostRefusalFor', () => {
  it('refuses an unknown template', () => {
    expect(oddsBoostRefusalFor(EMPTY_VAULT, UNKNOWN_TEMPLATE_ID)).toBe(
      VaultSpendRefusal.UnknownTemplate,
    )
  })

  it('refuses below VAULT_ODDS_BOOST_PRICE', () => {
    const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_ODDS_BOOST_PRICE - 1 }
    expect(oddsBoostRefusalFor(vault, KNOWN_TEMPLATE_ID)).toBe(VaultSpendRefusal.NotEnoughCurrency)
  })

  it('refuses at VAULT_ODDS_BOOST_MAX_STACKS', () => {
    const vault: VaultState = {
      ...EMPTY_VAULT,
      balance: VAULT_ODDS_BOOST_PRICE,
      oddsBoosts: { [KNOWN_TEMPLATE_ID]: VAULT_ODDS_BOOST_MAX_STACKS },
    }
    expect(oddsBoostRefusalFor(vault, KNOWN_TEMPLATE_ID)).toBe(VaultSpendRefusal.BoostMaxed)
  })

  it('allows when affordable and unmaxed', () => {
    const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_ODDS_BOOST_PRICE }
    expect(oddsBoostRefusalFor(vault, KNOWN_TEMPLATE_ID)).toBeNull()
  })
})

describe('buyOddsBoost', () => {
  it('debits exactly the price and adds one stack', () => {
    const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_ODDS_BOOST_PRICE + 5 }
    const result = buyOddsBoost(vault, KNOWN_TEMPLATE_ID)
    expect(result.balance).toBe(5)
    expect(result.oddsBoosts[KNOWN_TEMPLATE_ID]).toBe(1)
  })

  it('stacks to the cap across repeated buys', () => {
    let vault: VaultState = {
      ...EMPTY_VAULT,
      balance: VAULT_ODDS_BOOST_PRICE * VAULT_ODDS_BOOST_MAX_STACKS,
    }
    for (let i = 0; i < VAULT_ODDS_BOOST_MAX_STACKS; i++) {
      vault = buyOddsBoost(vault, KNOWN_TEMPLATE_ID)
    }
    expect(vault.oddsBoosts[KNOWN_TEMPLATE_ID]).toBe(VAULT_ODDS_BOOST_MAX_STACKS)
  })

  it('throws RangeError when called past its own refusal', () => {
    expect(() => buyOddsBoost(EMPTY_VAULT, UNKNOWN_TEMPLATE_ID)).toThrow(RangeError)
  })
})

describe('startingTierRefusalFor', () => {
  it('prices each tier from VAULT_STARTING_TIER_PRICE', () => {
    for (const tier of Object.values(BuffTier)) {
      const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_STARTING_TIER_PRICE[tier] - 1 }
      expect(startingTierRefusalFor(vault, KNOWN_TEMPLATE_ID, tier)).toBe(
        VaultSpendRefusal.NotEnoughCurrency,
      )
      const affordable: VaultState = { ...EMPTY_VAULT, balance: VAULT_STARTING_TIER_PRICE[tier] }
      expect(startingTierRefusalFor(affordable, KNOWN_TEMPLATE_ID, tier)).toBeNull()
    }
  })

  it('refuses an unknown template', () => {
    expect(startingTierRefusalFor(EMPTY_VAULT, UNKNOWN_TEMPLATE_ID, BuffTier.Gold)).toBe(
      VaultSpendRefusal.UnknownTemplate,
    )
  })
})

describe('buyStartingTier', () => {
  it('debits and appends one grant', () => {
    const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_STARTING_TIER_PRICE[BuffTier.Gold] }
    const result = buyStartingTier(vault, KNOWN_TEMPLATE_ID, BuffTier.Gold)
    expect(result.balance).toBe(0)
    expect(result.startingGrants).toEqual([{ templateId: KNOWN_TEMPLATE_ID, tier: BuffTier.Gold }])
  })

  it('buying the same card twice queues two grants', () => {
    let vault: VaultState = {
      ...EMPTY_VAULT,
      balance: VAULT_STARTING_TIER_PRICE[BuffTier.Bronze] * 2,
    }
    vault = buyStartingTier(vault, KNOWN_TEMPLATE_ID, BuffTier.Bronze)
    vault = buyStartingTier(vault, KNOWN_TEMPLATE_ID, BuffTier.Bronze)
    expect(vault.startingGrants).toEqual([
      { templateId: KNOWN_TEMPLATE_ID, tier: BuffTier.Bronze },
      { templateId: KNOWN_TEMPLATE_ID, tier: BuffTier.Bronze },
    ])
  })

  it('throws RangeError when called past its own refusal', () => {
    expect(() => buyStartingTier(EMPTY_VAULT, KNOWN_TEMPLATE_ID, BuffTier.Gold)).toThrow(RangeError)
  })
})

describe('clearStartingGrants', () => {
  it('empties the queue and leaves the balance and boosts untouched', () => {
    const vault: VaultState = {
      balance: 7,
      oddsBoosts: { [KNOWN_TEMPLATE_ID]: 1 },
      startingGrants: [{ templateId: KNOWN_TEMPLATE_ID, tier: BuffTier.Gold }],
    }
    const result = clearStartingGrants(vault)
    expect(result.startingGrants).toEqual([])
    expect(result.balance).toBe(7)
    expect(result.oddsBoosts).toEqual({ [KNOWN_TEMPLATE_ID]: 1 })
  })
})
