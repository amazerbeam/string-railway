import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES } from '../../hunt/buffTemplates'
import { BuffTier } from '../../hunt/buffs'
import {
  SAVE_NAMESPACE,
  SAVE_SCHEMA_VERSION,
  SaveReadOutcome,
  SaveWriteOutcome,
  createMemoryStorage,
  saveKeyFor,
  type StorageLike,
} from '../../persistence'
import { buyOddsBoost, buyStartingTier } from '../vaultEconomy'
import { EMPTY_VAULT, type VaultState } from '../vaultState'
import { VAULT_SAVE_SECTION, createVaultStore, loadVault, saveVault } from '../vaultStore'

const KNOWN_TEMPLATE_ID = BUFF_TEMPLATES[0].id

describe('vaultStore', () => {
  it("AC4's round trip: buy a boost and a gold starting tier, save, reload over a second store", () => {
    const storage = createMemoryStorage()
    const store = createVaultStore(storage)

    let vault: VaultState = buyOddsBoost({ ...EMPTY_VAULT, balance: 100 }, KNOWN_TEMPLATE_ID)
    vault = buyStartingTier(vault, KNOWN_TEMPLATE_ID, BuffTier.Gold)
    expect(saveVault(store, vault)).toBe(SaveWriteOutcome.Written)

    const secondStore = createVaultStore(storage)
    const loaded = loadVault(secondStore)

    expect(loaded.outcome).toBe(SaveReadOutcome.Loaded)
    expect(loaded.droppedCount).toBe(0)
    expect(loaded.vault).toEqual(vault)
  })

  it('returns EMPTY_VAULT with Empty on empty storage', () => {
    const store = createVaultStore(createMemoryStorage())
    const loaded = loadVault(store)
    expect(loaded.outcome).toBe(SaveReadOutcome.Empty)
    expect(loaded.vault).toEqual(EMPTY_VAULT)
    expect(loaded.droppedCount).toBe(0)
  })

  it('returns EMPTY_VAULT with Unavailable on null storage, and a lost write is reported', () => {
    const store = createVaultStore(null)
    const loaded = loadVault(store)
    expect(loaded.outcome).toBe(SaveReadOutcome.Unavailable)
    expect(loaded.vault).toEqual(EMPTY_VAULT)
    expect(saveVault(store, EMPTY_VAULT)).toBe(SaveWriteOutcome.Unavailable)
  })

  it('returns EMPTY_VAULT with Corrupt on non-JSON bytes', () => {
    const storage = createMemoryStorage()
    storage.setItem(saveKeyFor(VAULT_SAVE_SECTION), 'not json{{{')
    const loaded = loadVault(createVaultStore(storage))
    expect(loaded.outcome).toBe(SaveReadOutcome.Corrupt)
    expect(loaded.vault).toEqual(EMPTY_VAULT)
  })

  it('returns EMPTY_VAULT with Corrupt on a valid envelope whose data fails the shape guard', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      saveKeyFor(VAULT_SAVE_SECTION),
      JSON.stringify({ version: SAVE_SCHEMA_VERSION, data: { balance: 'not a number' } }),
    )
    const loaded = loadVault(createVaultStore(storage))
    expect(loaded.outcome).toBe(SaveReadOutcome.Corrupt)
    expect(loaded.vault).toEqual(EMPTY_VAULT)
  })

  it('returns EMPTY_VAULT with VersionMismatch and leaves the raw record present', () => {
    const storage = createMemoryStorage()
    const key = saveKeyFor(VAULT_SAVE_SECTION)
    const raw = JSON.stringify({ version: SAVE_SCHEMA_VERSION + 1, data: EMPTY_VAULT })
    storage.setItem(key, raw)

    const loaded = loadVault(createVaultStore(storage))

    expect(loaded.outcome).toBe(SaveReadOutcome.VersionMismatch)
    expect(loaded.vault).toEqual(EMPTY_VAULT)
    expect(loaded.droppedCount).toBe(0)
    expect(storage.getItem(key)).toBe(raw)
  })

  it('DLR-165 — rejects a version-1 payload by VERSION, not by reconciling its old-vocabulary ids away', () => {
    // The two failure modes look identical from the outside — both end at EMPTY_VAULT — so this
    // asserts the OUTCOME, which is the only thing that tells them apart. A version-1 payload's
    // `taker:bells:magnitude` no longer resolves; without the SAVE_SCHEMA_VERSION bump this would
    // have loaded with `Loaded` and a silent `droppedCount`, losing the boost with no message.
    const storage = createMemoryStorage()
    const key = saveKeyFor(VAULT_SAVE_SECTION)
    const legacy = { balance: 40, oddsBoosts: { 'taker:bells:magnitude': 2 }, startingGrants: [] }
    storage.setItem(key, JSON.stringify({ version: 1, data: legacy }))

    const loaded = loadVault(createVaultStore(storage))

    expect(loaded.outcome).toBe(SaveReadOutcome.VersionMismatch)
    expect(loaded.vault).toEqual(EMPTY_VAULT)
    expect(loaded.droppedCount).toBe(0)
  })

  it('loads with a dropped unknown templateId, balance intact', () => {
    const storage: StorageLike = createMemoryStorage()
    const stale: VaultState = {
      balance: 42,
      oddsBoosts: { 'nope:nope': 1 },
      startingGrants: [],
    }
    storage.setItem(
      saveKeyFor(VAULT_SAVE_SECTION),
      JSON.stringify({ version: SAVE_SCHEMA_VERSION, data: stale }),
    )

    const loaded = loadVault(createVaultStore(storage))

    expect(loaded.outcome).toBe(SaveReadOutcome.Loaded)
    expect(loaded.droppedCount).toBe(1)
    expect(loaded.vault.balance).toBe(42)
    expect(loaded.vault.oddsBoosts).toEqual({})
  })

  it('touches only saveKeyFor(VAULT_SAVE_SECTION), which starts with SAVE_NAMESPACE', () => {
    const key = createVaultStore(createMemoryStorage()).key
    expect(key).toBe(saveKeyFor(VAULT_SAVE_SECTION))
    expect(key.startsWith(SAVE_NAMESPACE)).toBe(true)
  })
})
