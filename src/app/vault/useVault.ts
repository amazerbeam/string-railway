import { useState } from 'react'
import {
  browserLocalStorage,
  type SaveStore,
  type StorageLike,
  SaveReadOutcome,
  SaveWriteOutcome,
} from '../../persistence'
import { createVaultStore, loadVault, saveVault, type VaultState } from '../../vault'

export interface VaultHandle {
  readonly vault: VaultState
  readonly loadOutcome: SaveReadOutcome
  readonly droppedCount: number
  /**
   * The write-side counterpart to `loadOutcome`. `null` before any write has been attempted
   * in this session; otherwise the `SaveWriteOutcome` of the most recent `commit`. Reported,
   * never swallowed — same discipline `loadVault` applies to every non-`Loaded` read. DLR-118's
   * Vault screen is the intended consumer; this hook itself renders no UI for it.
   */
  readonly lastWriteOutcome: SaveWriteOutcome | null
  /** Writes through the store, then sets state. Never throws. */
  commit(next: VaultState): void
}

/**
 * DLR-113 — the JSX-free React glue between `src/vault/`'s pure economy and the app shell.
 *
 * Holds NO effect. Two `useState`s carry pure lazy initialisers — the store, and the initial
 * `loadVault` result — so StrictMode's development double-invocation only re-reads storage
 * (idempotent) and re-wraps the same `localStorage` (stateless); there is nothing to clean up.
 *
 * `storage` is resolved to `browserLocalStorage()` INSIDE the store's lazy initialiser, never as
 * a default parameter expression, so an omitted argument never re-resolves it per render — only
 * once, on mount. `storage === null` (explicitly passed) means "no storage", which
 * `createVaultStore` reports as `SaveReadOutcome.Unavailable` rather than falling back.
 */
export function useVault(storage?: StorageLike | null): VaultHandle {
  const [store] = useState<SaveStore<VaultState>>(() =>
    createVaultStore(storage === undefined ? browserLocalStorage() : storage),
  )
  const [load, setLoad] = useState(() => ({
    ...loadVault(store),
    lastWriteOutcome: null as SaveWriteOutcome | null,
  }))

  function commit(next: VaultState): void {
    const outcome = saveVault(store, next)
    setLoad((prev) => ({
      vault: next,
      outcome: prev.outcome,
      droppedCount: prev.droppedCount,
      lastWriteOutcome: outcome,
    }))
  }

  return {
    vault: load.vault,
    loadOutcome: load.outcome,
    droppedCount: load.droppedCount,
    lastWriteOutcome: load.lastWriteOutcome,
    commit,
  }
}
