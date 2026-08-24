import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createMemoryStorage, SaveReadOutcome, SaveWriteOutcome } from '../../../persistence'
import { EMPTY_VAULT, type VaultState } from '../../../vault'
import { useVault } from '../useVault'

const VAULT_WITH_BALANCE: VaultState = {
  balance: 7,
  oddsBoosts: {},
  startingGrants: [],
}

describe('useVault (DLR-113)', () => {
  it('starts from EMPTY_VAULT with SaveReadOutcome.Empty over unwritten storage', () => {
    const { result } = renderHook(() => useVault(createMemoryStorage()))
    expect(result.current.vault).toEqual(EMPTY_VAULT)
    expect(result.current.loadOutcome).toBe(SaveReadOutcome.Empty)
    expect(result.current.droppedCount).toBe(0)
  })

  it('commit writes through the store and a second hook over the same storage loads it back', () => {
    const storage = createMemoryStorage()
    const { result } = renderHook(() => useVault(storage))

    expect(result.current.lastWriteOutcome).toBeNull()

    act(() => {
      result.current.commit(VAULT_WITH_BALANCE)
    })

    expect(result.current.vault).toEqual(VAULT_WITH_BALANCE)
    expect(result.current.lastWriteOutcome).toBe(SaveWriteOutcome.Written)

    const { result: reloaded } = renderHook(() => useVault(storage))
    expect(reloaded.current.vault).toEqual(VAULT_WITH_BALANCE)
    expect(reloaded.current.loadOutcome).toBe(SaveReadOutcome.Loaded)
  })

  it('reports Unavailable on null storage and still commits in memory', () => {
    const { result } = renderHook(() => useVault(null))
    expect(result.current.loadOutcome).toBe(SaveReadOutcome.Unavailable)
    expect(result.current.vault).toEqual(EMPTY_VAULT)
    expect(result.current.lastWriteOutcome).toBeNull()

    act(() => {
      result.current.commit(VAULT_WITH_BALANCE)
    })

    expect(result.current.vault).toEqual(VAULT_WITH_BALANCE)
    expect(result.current.lastWriteOutcome).toBe(SaveWriteOutcome.Unavailable)
  })

  it('commit accepts an updater that receives the currently committed vault', () => {
    const { result } = renderHook(() => useVault(createMemoryStorage()))

    act(() => {
      result.current.commit(VAULT_WITH_BALANCE)
    })

    act(() => {
      result.current.commit((prev) => ({ ...prev, balance: prev.balance + 5 }))
    })

    expect(result.current.vault).toEqual({ ...VAULT_WITH_BALANCE, balance: 12 })
  })

  it('two updater commits batched in one act() both land — the defect this closes', () => {
    const { result } = renderHook(() => useVault(createMemoryStorage()))

    act(() => {
      result.current.commit((v) => ({ ...v, balance: v.balance + 1 }))
      result.current.commit((v) => ({ ...v, balance: v.balance + 1 }))
    })

    expect(result.current.vault.balance).toBe(2)
  })
})
