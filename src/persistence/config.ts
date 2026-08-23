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
 * value — there is exactly one correct value for the first version of a schema. Bump it when a
 * stored payload's shape changes incompatibly, and never otherwise.
 */
export const SAVE_SCHEMA_VERSION = 1
