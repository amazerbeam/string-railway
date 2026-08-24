import {
  createSaveStore,
  SaveReadOutcome,
  type SaveStore,
  type SaveWriteOutcome,
  type StorageLike,
} from '../persistence'
import { EMPTY_VAULT, isValidVaultState, reconcileVault, type VaultState } from './vaultState'

/**
 * DLR-113 — the only file that knows the Vault is persisted at all. Everything else in
 * `src/vault/` is plain in-memory `VaultState` arithmetic; this module is the sole caller of
 * `createSaveStore`, per `.claude/rules/save-data-versioning.md`.
 *
 * `SAVE_SCHEMA_VERSION` is NOT bumped here — this is the first shape ever written, at version 1,
 * so there is nothing to bump from (`plan.md` → Out-of-scope).
 */

/** Key suffix handed to `saveKeyFor` inside `createSaveStore`. NEVER concatenated with
 *  `SAVE_NAMESPACE` at a call site. */
export const VAULT_SAVE_SECTION = 'vault'

export interface VaultLoad {
  readonly vault: VaultState
  /** Why the load produced what it produced — reported, never swallowed. */
  readonly outcome: SaveReadOutcome
  /** Entries `reconcileVault` dropped. `0` on any non-`Loaded` outcome. */
  readonly droppedCount: number
}

/** `storage: null` means storage is unavailable, which is not an error — `createSaveStore`
 *  reports it as `SaveReadOutcome.Unavailable` rather than throwing. */
export function createVaultStore(storage: StorageLike | null): SaveStore<VaultState> {
  return createSaveStore({
    section: VAULT_SAVE_SECTION,
    defaultValue: EMPTY_VAULT,
    isValidData: isValidVaultState,
    storage,
  })
}

/**
 * Reads the store and, only on a `Loaded` outcome, runs `reconcileVault` over the result —
 * reconciliation is a DOMAIN pass over an already shape-valid payload, so it never runs on a
 * shape failure or a version mismatch. `droppedCount` is `0` for every other outcome.
 *
 * A version-mismatched or corrupt record is deliberately NOT cleared here — this store's `clear()`
 * is never called from a read. Leaving the bad bytes in place is what lets a future schema version
 * write a migration for them; the record is simply replaced by the next `saveVault` call. Reading
 * must not destroy data, even data this build cannot understand.
 */
export function loadVault(store: SaveStore<VaultState>): VaultLoad {
  const { outcome, value } = store.read()
  if (outcome !== SaveReadOutcome.Loaded) {
    return { vault: value, outcome, droppedCount: 0 }
  }
  const { vault, droppedCount } = reconcileVault(value)
  return { vault, outcome, droppedCount }
}

export function saveVault(store: SaveStore<VaultState>, vault: VaultState): SaveWriteOutcome {
  return store.write(vault)
}
