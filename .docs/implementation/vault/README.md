# Vault — `src/vault/` and `src/app/vault/`

**Status:** implemented
**Built by:** DLR-113, DLR-118

## Responsibility

Owns the layer **above** a run: a currency that outlives one, and the two things it buys. A run is
`src/hunt/`'s; the Vault reads a run's _end_ state and steers the _next_ one. It is the game's first
persisted state of any kind — `src/vault/vaultStore.ts` is the first consumer
[`src/persistence/`](../persistence/README.md) has ever had.

It is a **new top-level module**, a sibling of `hunt/`, `app/`, `warCouncil/`, `persistence/`, and
not files inside `src/hunt/`, for two reasons: it outlives a run rather than being part of one, and
putting it in `hunt` would make `hunt` depend on `persistence`, widening the tree that is lint-fenced
as pure engine. The dependency edge is one-way — `vault` imports `hunt` and `persistence`; neither
imports `vault` — the same shape `warCouncil → hunt` already has.

## Key types & exports

| Export                                                    | Purpose                                                                                                                                                                                                                                     | File              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `VAULT_EXCHANGE_RATE`                                     | `10` — leftover coin per 1 Vault currency. **TRANSCRIBED from DLR-113 AC1**, not chosen                                                                                                                                                     | `vaultConfig.ts`  |
| `VAULT_ODDS_BOOST_PRICE`                                  | `1` — currency per odds-boost stack. **AGENT-CHOSEN, unplayed**                                                                                                                                                                             | `vaultConfig.ts`  |
| `VAULT_ODDS_BOOST_MAX_STACKS`                             | `3` — the cap, and the anti-determinism guard on the reel: uncapped, a boosted template's weight could be driven arbitrarily high and DLR-112's readable posted strip would collapse into a near-certainty. **AGENT-CHOSEN**                | `vaultConfig.ts`  |
| `VAULT_ODDS_BOOST_STEP`                                   | `1` — additive multiplier per stack; `weight × (1 + STEP × stacks)`. **AGENT-CHOSEN**                                                                                                                                                       | `vaultConfig.ts`  |
| `VAULT_STARTING_TIER_PRICE`                               | `{ bronze: 2, silver: 5, gold: 10 }` — **AGENT-CHOSEN but DERIVED** from `REWARD_TIER_VALUE[BuffRewardAxis.Coins]`'s existing 2/5/10 ladder, so the Vault charges the same bronze:silver:gold ratio the game already states a tier is worth | `vaultConfig.ts`  |
| `VaultState`                                              | `{ balance, oddsBoosts, startingGrants }` — **both** the in-memory shape and the persisted payload                                                                                                                                          | `vaultState.ts`   |
| `EMPTY_VAULT`                                             | balance 0, no boosts, no grants — the value every failed read returns                                                                                                                                                                       | `vaultState.ts`   |
| `isValidVaultState`                                       | the mandatory shape guard, all-or-nothing over a whole payload                                                                                                                                                                              | `vaultState.ts`   |
| `reconcileVault`, `VaultReconciliation`                   | the separate **domain** pass, and its `{ vault, droppedCount }` result                                                                                                                                                                      | `vaultState.ts`   |
| `TemplateGrant`                                           | `{ templateId, tier }` — re-exported from `src/hunt/buffTemplates.ts`, which owns it                                                                                                                                                        | `vaultState.ts`   |
| `depositLeftoverCoin`                                     | AC1 — credits `floor(coin / VAULT_EXCHANGE_RATE)`                                                                                                                                                                                           | `vaultEconomy.ts` |
| `VaultSpendRefusal`                                       | `notEnoughCurrency` / `unknownTemplate` / `boostMaxed` — reason **codes**, never sentences                                                                                                                                                  | `vaultEconomy.ts` |
| `oddsBoostRefusalFor`, `buyOddsBoost`                     | AC2 — the predicate and the spend                                                                                                                                                                                                           | `vaultEconomy.ts` |
| `startingTierRefusalFor`, `buyStartingTier`               | AC3 — the predicate and the spend                                                                                                                                                                                                           | `vaultEconomy.ts` |
| `clearStartingGrants`                                     | empties the grant queue; balance and boosts untouched                                                                                                                                                                                       | `vaultEconomy.ts` |
| `boostMultiplierFor`                                      | `1 + STEP × stacks`, clamped; `1` for an unboosted **or unknown** id                                                                                                                                                                        | `vaultOdds.ts`    |
| `vaultReelWeightFor`                                      | the `weightOf` function `drawReelPool` already accepts                                                                                                                                                                                      | `vaultOdds.ts`    |
| `drawVaultReelPool`                                       | the one call a future slot screen makes                                                                                                                                                                                                     | `vaultOdds.ts`    |
| `VAULT_SAVE_SECTION`                                      | `'vault'` — the key suffix handed to `saveKeyFor`, never concatenated at a call site                                                                                                                                                        | `vaultStore.ts`   |
| `createVaultStore`, `loadVault`, `saveVault`, `VaultLoad` | the persistence surface, and the only place in `src/vault/` that knows there is any                                                                                                                                                         | `vaultStore.ts`   |

`index.ts` re-exports all of the above, types then values, mirroring `src/hunt/index.ts`'s barrel.

### The React layer — `src/app/vault/` (DLR-118)

`src/vault/` is pure and lint-fenced; everything that touches React lives in `src/app/vault/` and is
documented in [the Vault screen](the-vault-screen.md).

| Export                                                        | Purpose                                                                                       | File                |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| `useVault`, `VaultHandle`, `VaultCommit`                      | the JSX-free glue: the store, the load outcome, the dropped count, the last write outcome, and `commit`, which since DLR-118 accepts a value **or** a `(prev) => next` updater | `useVault.ts`       |
| `creditedFromRun`                                             | what THIS run paid in — loss-only, derived through `depositLeftoverCoin`, never a second division | `vaultRunCredit.ts` |
| `VaultScreen`, `VaultScreenProps`                             | the screen itself, mounted from `App.tsx` on `RunPhase.Vault`                                   | `VaultScreen.tsx`   |
| `vaultDepositText`, `vaultBalanceText`, `vaultDroppedText`, `VAULT_READ_PROBLEM`, `VAULT_WRITE_PROBLEM`, `VAULT_REFUSAL_MESSAGE`, and the rest | every user-facing string, all PLACEHOLDER copy, every figure interpolated from `vaultConfig.ts` | `vaultLabels.ts`    |

## How it works

- [Saving the Vault](saving-the-vault.md) — the envelope, the two guards, and what happens to a save
  this build cannot read.
- [The Vault screen](the-vault-screen.md) — when the screen appears and what dismisses it, the
  loss-only deposit rendered, every empty and failure state, the two-select card chooser, and why each
  spend re-derives its refusal inside the commit updater.

The sections below remain the module's own account of the pure economy; the two files above cover the
persistence surface and the React layer in full.

### Deposit on death, and what the remainder does

`depositLeftoverCoin` (`vaultEconomy.ts`) adds `Math.floor(safeCoin / VAULT_EXCHANGE_RATE)` to the
balance and **discards the remainder**. `safeCoin` is `leftoverCoin` only when `Number.isFinite` and
positive, otherwise `0`, so no `NaN` and no negative balance is constructible from this function. A
carried remainder was rejected as a fourth persisted field whose only job would be making a 9-coin
death feel less bad. `App.tsx` is the only caller and fires it on a `RunOutcome.Lost` recording
only — see [the run driver](../app/run-driver.md).

### The two spends, in `shop.ts`'s idiom

`oddsBoostRefusalFor` and `startingTierRefusalFor` are the single statement of what each purchase
costs and whether it can happen, exactly as `src/hunt/shop.ts`'s `refusalFor` is for the shop —
item-specific reasons (unknown template, maxed stack) are tested **before** the currency check, so an
unaffordable purchase that is also impossible reports the durable reason. `buyOddsBoost` and
`buyStartingTier` each re-run their own predicate and throw `RangeError` past it: a refused purchase
reaching them is a driver bug, never a state a caller must catch. That is `buyFromShop`'s discipline
verbatim.

A bought boost is **permanent** — nothing ever removes a stack. A bought grant is **one-shot**: it
sits in `startingGrants` until a run start mints it, and `clearStartingGrants` empties the queue.

### The odds boost reaches the reel by multiplication, not replacement

DLR-112 made `drawReelPool`'s third `weightOf` parameter defaulted expressly for this seam.
`vaultReelWeightFor(vault, machineId)` returns
`(template) => templateWeightFor(machineId, template) * boostMultiplierFor(vault, template.id)`.
**Multiplying is load-bearing**: replacing the weight outright would erase `slotWeights.ts`'s
per-family normalisation, so a family's share of a strip would become its template count rather than
its stated weight. `drawVaultReelPool(vault, machineId, rng)` is the one-call wrapper, and it passes
`rng` straight through — `src/vault/` calls no random source of its own, so the module is as
`Math.random()`-free as `src/hunt/`.

At the cap the multiplier is **×4**, which moves one template from roughly 11% of appearing on a
strip to roughly a third. **DLR-116 gave it its first production caller**: the shop's slot screen
draws every strip through `drawVaultReelPool`, so a boosted reel is now something a player actually
sees. (Until then the boost was exercised by tests only.)

### Two guards, deliberately separate: shape then domain

`isValidVaultState` is a **shape** guard and is all-or-nothing — it accepts or rejects a whole
payload, never half of it. It reads a boost record's own enumerable keys through `Object.entries`
(never `for...in`, never a direct property read) and **skips** `__proto__` / `constructor` /
`prototype` rather than rejecting on them, so a hand-edited save with one poisoned key still loads
its other boosts; every number is checked with `Number.isSafeInteger`.

`reconcileVault` is a **domain** pass over an already shape-valid payload. It resolves every
`templateId` through `templateById`, drops boosts and grants this build has no template for, clamps
stacks down to `VAULT_ODDS_BOOST_MAX_STACKS`, and returns a `droppedCount`. A clamped stack is _not_
counted as dropped — that entry survives, just smaller.

The split is what stops the half-load the save-data rule forbids: a shape failure loses the whole
save, domain drift loses only the affected entries and keeps the balance.

### Persistence, and what happens to a save this build cannot read

`vaultStore.ts` is the only file in the module that knows the Vault is persisted, and the sole caller
of `createSaveStore`, at section `'vault'`. `loadVault` returns the store's `SaveReadOutcome`
**verbatim beside the value** — never swallowed — and runs `reconcileVault` only on `Loaded`;
`droppedCount` is `0` for every other outcome.

**A version-mismatched or corrupt record is deliberately not cleared.** This store's `clear()` is
never called from a read. The unreadable bytes stay on disk until the next `saveVault` replaces them,
which is what lets a future schema version write a migration for them; a read must not destroy data,
even data this build cannot understand. This is the answer to the question DLR-106 explicitly
deferred to this ticket: **an unmigratable save is discarded, non-destructively, and the player
starts fresh** — with the outcome reported so a screen can say why rather than showing a silent zero.

`SAVE_SCHEMA_VERSION` stays at **1**: this is the first shape ever written, so there is nothing to
bump from. That window is now closed — the next shape change is a real migration.

### Nothing containing a live `Buff` is ever persisted

A bought starting card is stored as `{ templateId, tier }` — the minimal pair `mintFromTemplate`
needs — and the live `Buff` is minted fresh at run start. DLR-107 recorded that widening `Buff` with
a required `kind` was free _only_ while the buff pile was unpersisted, and named this ticket as the
point that stops being true. It does not: `Buff` stays free to gain fields forever, because no
version of it is on disk. Storing the coordinates instead of the card also means retuning
`REWARD_TIER_VALUE` reaches every existing save for free, where a persisted reward value would leave
old saves paying old numbers.

The cost paid instead is that **`BuffTemplate.id`'s format is frozen from this commit** — renaming a
`BuffKind` or `BuffRewardAxis` member value orphans saved boosts and grants. `reconcileVault` drops
them countably rather than corrupting anything, but the currency spent on them is gone, so a future
rename must ship a migration. Its docblock in `src/hunt/buffTemplates.ts` was corrected in the same
ticket, from "NOT persisted" to "PERSISTED as of DLR-113".

## Rules & invariants enforced

- **`.claude/rules/save-data-versioning.md`** binds every file here — all six reject conditions. No
  key is composed outside `saveKeyFor`, no payload is written bare, no `as VaultState` cast bypasses
  `isValidVaultState`, and no read failure is reported as success.
- **The pure-core ESLint boundary.** `eslint.config.js` adds `src/vault/**` to the same
  `no-restricted-imports` / `no-restricted-globals` block that fences `src/warCouncil/**` and
  `src/hunt/**` — no React, no DOM, no `localStorage`, no `Math.random()`.
- **`src/vault/**` is also in the storage block's `ignores`, and that is load-bearing** rather than
  an exemption: ESLint flat config **replaces** same-key rule options instead of merging them, so
  leaving `src/vault/**` matched by the narrower storage block would silently overwrite the fuller
  DOM ban above. This is the exact regression that shipped and was caught on DLR-106.
- **Nothing here throws except a `buy*` called past its own refusal.** `createSaveStore` never
  throws; neither does any read, guard, or reconciliation. There is no `catch { return DEFAULTS }`
  anywhere — every failure returns `EMPTY_VAULT` **paired with the named outcome**.
- **No module-level mutable state.** `createVaultStore` returns a fresh store per call.
- **No user-facing copy.** Refusals are reason codes, as in `src/hunt/`.

## Deferred / not yet implemented

- ~~**No Vault screen — DLR-118 owns it.**~~ **Closed by DLR-118.** `src/app/vault/VaultScreen.tsx` is
  mounted from `App.tsx` on `RunPhase.Vault`, reached from the terminal verdict's `Open the Vault`
  control. `buyOddsBoost` and `buyStartingTier` both have production callers now, so a player can see
  a balance and spend it. See [the Vault screen](the-vault-screen.md).
- ~~**No live surface for a boosted reel.**~~ **Closed by DLR-116**, and the loop closed by DLR-118.
  `drawVaultReelPool` is called by `src/app/run/useShopSlot.ts` on every render of the shop's slot
  section, so a boosted reel is something a player sees; and since DLR-118 a player can *earn* the
  boost that stocks it. The composed path is live end to end.
- **No mid-run display of Vault currency** — deferred by the ticket, which reveals it at run end only.
- **No migration**, and nothing to migrate: one schema version has ever existed.
- **No carried conversion remainder**, and no Vault credit on a **won** run — both deliberate, see
  How it works and `plan.md` → Assumptions.
- **Nothing is gated behind the Vault.** Every template is reachable at balance 0; the Vault changes
  only how often one appears and what you start holding.
