Part of [Vault](README.md).

# How the Vault is saved, and what happens to a save this build cannot read

This is the game's **first persisted state of any kind**. `src/vault/vaultStore.ts` is the first
consumer [`src/persistence/`](../persistence/README.md) has ever had; before DLR-113 that module's
own specs were its only caller.

## One shape, not a DTO pair

`VaultState` is **both** the in-memory shape and the persisted payload, deliberately. A separate
transfer object plus a mapper is two shapes that drift; one shape with a guard over it cannot. The
cost — every field this module ever gains is a persisted field from the moment it exists — is
accepted and is the point: it forces the version question to be asked at the field rather than
discovered later.

## Two guards, deliberately separate: shape then domain

`isValidVaultState` (`vaultState.ts`) is a **shape** guard and is all-or-nothing — it accepts or
rejects a whole payload, never half of it. It reads a boost record's own enumerable keys through
`Object.entries` (never `for...in`, never a direct property read) and **skips**
`__proto__` / `constructor` / `prototype` rather than rejecting on them, so a hand-edited save with
one poisoned key still loads its other, otherwise valid boosts. Every number is checked with
`Number.isSafeInteger`: balance non-negative, every boost stack at least 1. It uses local
`as { … }` property probes only — the same discipline `saveStore.ts`'s own `isSaveEnvelope` uses —
and there is no `as VaultState` cast anywhere in the module.

`reconcileVault` is a **domain** pass over an already shape-valid payload. It resolves every
`templateId` through `templateById`, drops boosts and grants this build has no template for, clamps
stacks down to `VAULT_ODDS_BOOST_MAX_STACKS`, and returns a `droppedCount`. A clamped stack is *not*
counted as dropped — that entry survives, just smaller. It never throws: a stale save is not a
programming error.

The split is what stops the half-load `.claude/rules/save-data-versioning.md` forbids. **A shape
failure loses the whole save; domain drift loses only the affected entries and keeps the balance.**

## The store, and the record that is left alone

`vaultStore.ts` is the only file in `src/vault/` that knows the Vault is persisted at all, and the
sole caller of `createSaveStore`, at section `'vault'`. `VAULT_SAVE_SECTION` is handed to the
factory and never concatenated with `SAVE_NAMESPACE` at a call site.

`loadVault` returns the store's `SaveReadOutcome` **verbatim beside the value** — never swallowed —
and runs `reconcileVault` only on a `Loaded` outcome, because reconciliation is a domain pass and
has no business running over a payload that failed its shape check or came from another schema.
`droppedCount` is `0` for every non-`Loaded` outcome.

**A version-mismatched or corrupt record is deliberately not cleared.** This store's `clear()` is
never called from a read. The unreadable bytes stay on disk until the next `saveVault` replaces
them, which is exactly what lets a future schema version write a migration for them; **a read must
not destroy data, even data this build cannot understand.**

That is the answer to the question DLR-106 explicitly deferred here: **an unmigratable save is
discarded and the player starts fresh — non-destructively, and reported.** `loadVault` hands its
caller both `EMPTY_VAULT` and the named outcome, so DLR-118's screen can say "your Vault could not
be read" instead of showing a silent zero. Migration was the alternative and is wrong at version 1
for a concrete reason: exactly one schema version has ever existed, so a migration function today
would have no source shape to migrate *from* and would be untestable speculation.

`SAVE_SCHEMA_VERSION` stays at **1** — this is the first shape ever written, so there is nothing to
bump from. **That window is now closed**: the next shape change here is a real migration.

## Nothing containing a live `Buff` is ever persisted

A bought starting card is stored as `{ templateId, tier }` — the minimal pair `mintFromTemplate`
needs — and the live `Buff` is minted fresh at run start from `RunState.nextBuffId`.

DLR-107 recorded that widening `Buff` with a required `kind` was free *only* while the buff pile was
unpersisted, and named this ticket as the point that would stop being true. **It does not.** `Buff`
stays free to gain fields forever, because no version of it is on disk. Storing the coordinates
rather than the card also means retuning `REWARD_TIER_VALUE` reaches every existing save for free,
where a persisted reward value would leave old saves paying the old numbers.

The cost paid in its place is that **`BuffTemplate.id`'s format is frozen from this commit**.
Persisting the id and persisting `{ kind, target, axis }` carry identical information, but the id
admits one total, cheap guard — membership in `BUFF_TEMPLATES` — where the coordinate form would
validate three separate vocabularies and then have to search for the template anyway. So renaming a
`BuffKind` or `BuffRewardAxis` member value now orphans saved boosts and grants: `reconcileVault`
drops them countably rather than corrupting anything, but the currency spent on them is gone, and a
future rename must ship a migration. `BuffTier`'s three values are frozen on the same terms, and the
guard validates against the declaration in `src/hunt/buffs.ts` rather than against literals of its
own, so a rename fails the guard instead of silently accepting a stale save.

`BuffTemplate.id`'s docblock was corrected in the same ticket, from "NOT persisted" (DLR-112's
wording) to "PERSISTED as of DLR-113" — the statement fixed where it is owned, rather than left
standing over persisted data.
