/**
 * DLR-106 — the key prefix every save this game writes shares. Named for the REPOSITORY, not the
 * game's working title: the title has already changed once during this project, and a storage key
 * that renames orphans every save already on a player's disk with nothing able to find it again.
 *
 * This value is the one literal in the module that cannot be changed after a real save exists.
 * See `.claude/rules/save-data-versioning.md`.
 */
export const SAVE_NAMESPACE = 'strings-and-stations'

/**
 * Joins the namespace to a section name. `:` is the near-universal localStorage convention and
 * cannot collide with a section name made of identifier characters.
 */
export const SAVE_KEY_SEPARATOR = ':'

/**
 * The schema version stamped into every envelope written today. A schema IDENTITY, not a tuning
 * value — there is exactly one correct successor to any given version. Bump it when a stored
 * payload's shape changes incompatibly, and never otherwise.
 *
 * DLR-165 — bumped 1 → 2. The `BuffKind` values that `templateIdFor` composes persisted template
 * ids from were renamed (`taker:` → `suitHigh:`, `feeder:` → `suitLow:`, `sidestep:` →
 * `skullLow:`), so every id already on disk is unresolvable. `reconcileVault` would drop each one
 * silently and the developer's boosts and grants would vanish with no message; the bump makes
 * `saveStore` return `SaveReadOutcome.VersionMismatch` and the default instead. This RESETS the
 * Vault once, which is deliberate and preferred to a migration map that would keep the dead
 * vocabulary alive in code. See `.claude/rules/save-data-versioning.md`.
 */
export const SAVE_SCHEMA_VERSION = 2
