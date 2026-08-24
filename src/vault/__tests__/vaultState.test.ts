import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES } from '../../hunt/buffTemplates'
import { BuffTier } from '../../hunt/buffs'
import { VAULT_ODDS_BOOST_MAX_STACKS } from '../vaultConfig'
import { EMPTY_VAULT, isValidVaultState, reconcileVault, type VaultState } from '../vaultState'

const KNOWN_TEMPLATE_ID = BUFF_TEMPLATES[0].id

function validVault(): VaultState {
  return {
    balance: 12,
    oddsBoosts: { [KNOWN_TEMPLATE_ID]: 2 },
    startingGrants: [{ templateId: KNOWN_TEMPLATE_ID, tier: BuffTier.Gold }],
  }
}

describe('isValidVaultState', () => {
  it('accepts EMPTY_VAULT', () => {
    expect(isValidVaultState(EMPTY_VAULT)).toBe(true)
  })

  it('accepts a fully populated valid vault', () => {
    expect(isValidVaultState(validVault())).toBe(true)
  })

  it.each([null, undefined, 42, 'x', []])('rejects %p', (candidate) => {
    expect(isValidVaultState(candidate)).toBe(false)
  })

  it('rejects a missing balance', () => {
    const { balance, ...rest } = validVault()
    void balance
    expect(isValidVaultState(rest)).toBe(false)
  })

  it.each([-1, NaN, Infinity, 1.5])('rejects a balance of %p', (balance) => {
    expect(isValidVaultState({ ...validVault(), balance })).toBe(false)
  })

  it.each([[], 'x', 42, null])('rejects oddsBoosts of %p', (oddsBoosts) => {
    expect(isValidVaultState({ ...validVault(), oddsBoosts })).toBe(false)
  })

  it.each([0, -1, 1.5, NaN, 'two'])('rejects an oddsBoosts stack of %p', (stack) => {
    expect(isValidVaultState({ ...validVault(), oddsBoosts: { [KNOWN_TEMPLATE_ID]: stack } })).toBe(
      false,
    )
  })

  it.each(['x', 42, null, {}])('rejects startingGrants of %p', (startingGrants) => {
    expect(isValidVaultState({ ...validVault(), startingGrants })).toBe(false)
  })

  it('rejects a startingGrants entry that is not an object', () => {
    expect(isValidVaultState({ ...validVault(), startingGrants: ['nope'] })).toBe(false)
  })

  it('rejects a startingGrants entry with a non-string templateId', () => {
    expect(
      isValidVaultState({
        ...validVault(),
        startingGrants: [{ templateId: 42, tier: BuffTier.Gold }],
      }),
    ).toBe(false)
  })

  it('rejects a startingGrants entry with a tier outside BuffTier', () => {
    expect(
      isValidVaultState({
        ...validVault(),
        startingGrants: [{ templateId: KNOWN_TEMPLATE_ID, tier: 'platinum' }],
      }),
    ).toBe(false)
  })

  it('ignores a __proto__ key rather than treating it as a boost', () => {
    const candidate = JSON.parse(
      `{"balance": 0, "oddsBoosts": {"__proto__": {"polluted": true}}, "startingGrants": []}`,
    ) as unknown
    expect(isValidVaultState(candidate)).toBe(true)
  })
})

describe('reconcileVault', () => {
  it('leaves a clean vault untouched with droppedCount 0', () => {
    const vault = validVault()
    const { vault: reconciled, droppedCount } = reconcileVault(vault)
    expect(reconciled).toEqual(vault)
    expect(droppedCount).toBe(0)
  })

  it('drops a boost and a grant naming an unknown template, counting both', () => {
    const vault: VaultState = {
      balance: 5,
      oddsBoosts: { [KNOWN_TEMPLATE_ID]: 1, 'nope:nope': 1 },
      startingGrants: [
        { templateId: KNOWN_TEMPLATE_ID, tier: BuffTier.Bronze },
        { templateId: 'nope:nope', tier: BuffTier.Bronze },
      ],
    }
    const { vault: reconciled, droppedCount } = reconcileVault(vault)
    expect(reconciled.oddsBoosts).toEqual({ [KNOWN_TEMPLATE_ID]: 1 })
    expect(reconciled.startingGrants).toEqual([
      { templateId: KNOWN_TEMPLATE_ID, tier: BuffTier.Bronze },
    ])
    expect(reconciled.balance).toBe(5)
    expect(droppedCount).toBe(2)
  })

  it('clamps a stack above VAULT_ODDS_BOOST_MAX_STACKS down to the cap without counting it as dropped', () => {
    const vault: VaultState = {
      balance: 0,
      oddsBoosts: { [KNOWN_TEMPLATE_ID]: VAULT_ODDS_BOOST_MAX_STACKS + 5 },
      startingGrants: [],
    }
    const { vault: reconciled, droppedCount } = reconcileVault(vault)
    expect(reconciled.oddsBoosts[KNOWN_TEMPLATE_ID]).toBe(VAULT_ODDS_BOOST_MAX_STACKS)
    expect(droppedCount).toBe(0)
  })
})
