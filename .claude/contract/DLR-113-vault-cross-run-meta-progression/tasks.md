# Tasks: Vault — cross-run meta-progression

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

**Goal:** Build the Vault mechanism — a persistent cross-run record of currency, per-template odds boosts, and bought starting cards — written through `src/persistence/`, credited from leftover coin on death, spent through two named paths, and applied at run start and at reel draw; with no Vault screen (DLR-118's).

**Spec:** `plan.md` in this folder.

> Approved under the 2026-08-23 unattended sprint-run instruction: the plan gate was auto-approved at the plan's stated defaults rather than developer-confirmed, and the skill-confirmation question was skipped. **No mockup was called for** — the only `.tsx` in the file map is `src/App.tsx`, and the change to it adds no rendered markup, so there is no surface to mock up.

---

## File map

**Created:**
- `src/vault/vaultConfig.ts` — the exchange rate, both spend prices, and the boost step and cap.
- `src/vault/vaultState.ts` — `VaultState`, `EMPTY_VAULT`, the shape guard, and `reconcileVault`.
- `src/vault/vaultEconomy.ts` — deposit-on-death, both spends, their refusal codes, grant clearing.
- `src/vault/vaultOdds.ts` — boost multiplier, the `drawReelPool` weight function, `drawVaultReelPool`.
- `src/vault/vaultStore.ts` — the only file that knows the Vault is persisted; `createSaveStore` only.
- `src/vault/index.ts` — the module barrel.
- `src/vault/__tests__/vaultState.test.ts` — guard rejection cases and reconciliation.
- `src/vault/__tests__/vaultEconomy.test.ts` — conversion arithmetic, refusals, both spends.
- `src/vault/__tests__/vaultOdds.test.ts` — multiplier composition and the reel-draw seam.
- `src/vault/__tests__/vaultStore.test.ts` — AC4's round trip, version mismatch, corrupt payload.
- `src/app/vault/useVault.ts` — the JSX-free React glue.
- `src/app/vault/__tests__/useVault.test.tsx` — the hook's load and commit behaviour.
- `src/hunt/__tests__/buffTemplates.grants.test.ts` — `templateById` and `mintGrants`.
- `src/hunt/__tests__/run.grants.test.ts` — `startRun`'s grants parameter.

**Modified:**
- `src/hunt/buffTemplates.ts` — add `TemplateGrant`, `templateById`, `mintGrants`; correct the `BuffTemplate.id` "NOT persisted" docblock.
- `src/hunt/run.ts:137-160` — `startRun` gains a defaulted `grants` parameter.
- `src/hunt/index.ts` — export the three new `buffTemplates` names.
- `src/App.tsx` — deposit on death; claim grants at run start.
- `eslint.config.js` — add `src/vault/**` to the pure-core block and to the storage block's `ignores`.

**Deleted:** *(none)*

**Developer decides or observes:**
- `src/vault/vaultConfig.ts` → `VAULT_EXCHANGE_RATE = 10` — transcribed from AC1, but at today's coin economy (`COINS_PER_ENCOUNTER_WIN = 1`, shop prices 1–4) a typical death holds 0–5 leftover coin and converts to **0**. Decide after playing whether to lower the rate or raise coin income.
- `src/vault/vaultConfig.ts` → `VAULT_ODDS_BOOST_PRICE = 1`, `VAULT_ODDS_BOOST_MAX_STACKS = 3`, `VAULT_ODDS_BOOST_STEP = 1`, `VAULT_STARTING_TIER_PRICE = {bronze 2, silver 5, gold 10}` — all agent-chosen and unplayed. The tier prices are derived from `REWARD_TIER_VALUE[Coins]`'s 2/5/10 ladder; retune them together.
- Whether starting grants are **one-shot** (this contract's reading of AC3's "a future run's starting pile") or permanent. Making them permanent is deleting one `clearStartingGrants` call in `App.tsx`.
- Whether an unreadable save should be **discarded** (this contract) or migrated at the first `SAVE_SCHEMA_VERSION` bump. Discarding is right for a prototype nobody has played; hand builds to other people and that changes.
- Whether progression *feels* like progression at these prices, and whether run 1 reads as a complete game rather than a stripped one. Only playing answers this.

---

## Phase 1 — Hunt-side seams: template lookup, grant minting, and `startRun`

`src/vault/` cannot mint a `Buff` without importing hunt's minting rules, and hunt must not import vault. This phase puts both halves in hunt — the `TemplateGrant` coordinate pair and the functions that turn one into a card — so the dependency edge runs one way only. Nothing in this phase references the Vault, so the tree type-checks and every existing spec still passes at the boundary.

### Task 1: Add `TemplateGrant`, `templateById`, and `mintGrants` to `src/hunt/buffTemplates.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/buffTemplates.ts`
- Test: `src/hunt/__tests__/buffTemplates.grants.test.ts`

- [x] **Step 1: Write the failing spec for the lookup and the minting**

Create `src/hunt/__tests__/buffTemplates.grants.test.ts` covering: `templateById` returns the template whose `id` matches for every id in `BUFF_TEMPLATES`; `templateById('nope:nope')` returns `undefined`; `mintGrants([], 7)` returns `[]`; `mintGrants` mints one `Buff` per grant with consecutive ids from `firstId` and the tier requested; an unknown `templateId` is **skipped** and ids stay consecutive over what was actually minted (so `mintGrants([unknown, known], 5)` returns one buff with `id === 5`).

```ts
import { describe, expect, it } from 'vitest'
import { BUFF_TEMPLATES, mintGrants, templateById } from '../buffTemplates'
import { BuffTier } from '../buffs'
```

- [x] **Step 2: Run the spec and confirm it fails to resolve the new names**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.grants.test.ts`
Expected: fails — `templateById`/`mintGrants` are not exported yet.

- [x] **Step 3: Add the type, the derived lookup, and the minting function**

Append to `src/hunt/buffTemplates.ts`, after `BUFF_TEMPLATE_COUNT`:

```ts
/** One bought card, as coordinates rather than as a `Buff`. Declared HERE and not in
 *  `src/vault/`: hunt owns how a template becomes a card, and declaring it in vault would force
 *  the reverse import edge. DLR-113 persists this pair — and deliberately nothing else — so no
 *  domain type is ever on disk and `Buff` stays free to widen (DLR-107's note lands nowhere). */
export interface TemplateGrant {
  readonly templateId: string
  readonly tier: BuffTier
}

/** `BUFF_TEMPLATES` keyed by id, derived ONCE at module load in the style `slotWeights.ts`'s
 *  `FAMILY_AXIS_TOTAL` already uses, so a lookup never rescans the pool. */
const TEMPLATES_BY_ID: ReadonlyMap<string, BuffTemplate> = new Map(
  BUFF_TEMPLATES.map((template) => [template.id, template]),
)

/** `undefined` for an id this build has no template for — which is exactly what DLR-113's
 *  `reconcileVault` tests a stale save against. */
export function templateById(id: string): BuffTemplate | undefined {
  return TEMPLATES_BY_ID.get(id)
}

/** One `Buff` per grant, consecutive ids from `firstId`, mirroring `mintPullAwards`. A grant
 *  naming an id this build no longer has is SKIPPED rather than throwing: a save written by an
 *  older build is not a programming error, and dropping the one dead card is better than
 *  refusing to start the run. Ids stay consecutive over what was actually minted. */
export function mintGrants(grants: readonly TemplateGrant[], firstId: BuffId): readonly Buff[] {
  const minted: Buff[] = []
  for (const grant of grants) {
    const template = templateById(grant.templateId)
    if (template === undefined) continue
    minted.push(mintFromTemplate(template, grant.tier, firstId + minted.length))
  }
  return minted
}
```

- [x] **Step 4: Correct the `BuffTemplate.id` docblock — it now describes persisted data**

Replace the `id` field comment inside `interface BuffTemplate`:

```ts
  /** Stable identifier, `<kind>[:<param>]:<axis>` — e.g. `taker:bells:magnitude`. PERSISTED as
   *  of DLR-113: the Vault stores boosts and grants by this id, so the FORMAT is frozen and a
   *  renamed `BuffKind` or `BuffRewardAxis` value orphans saved entries. `reconcileVault` drops
   *  an id it cannot resolve rather than corrupting anything, but the currency spent on it is
   *  gone — a future rename must ship a migration. (Was documented "NOT persisted" by DLR-112;
   *  DLR-113 overturned that deliberately, see that ticket's plan.md → Approach.) */
```

- [x] **Step 5: Run the spec and the existing template spec**

Run: `npx vitest run src/hunt/__tests__/buffTemplates.grants.test.ts src/hunt/__tests__/buffTemplates.test.ts`
Expected: exits 0, 0 failed.

### Task 2: Give `startRun` a defaulted `grants` parameter ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/run.ts:137-160`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/run.grants.test.ts`

- [x] **Step 1: Write the failing spec for a granted opening pile**

Create `src/hunt/__tests__/run.grants.test.ts` covering: `startRun()` still returns `STARTING_BUFF_COUNT` buffs and `nextBuffId === STARTING_BUFF_COUNT + 1` (the unchanged default path); `startRun(PLAYER_START_HEALTH, [{templateId: <a real id>, tier: BuffTier.Gold}])` returns `STARTING_BUFF_COUNT + 1` buffs whose last entry is gold with that template's `kind`; ids are unique across the whole pile and `nextBuffId` is one past the highest; a grant naming an unknown template adds nothing and leaves `nextBuffId` unmoved.

- [x] **Step 2: Run the spec and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/run.grants.test.ts`
Expected: fails — `startRun` takes one parameter today.

- [x] **Step 3: Widen `startRun`**

In `src/hunt/run.ts`, extend the import from `./buffTemplates` (add one) and change the signature and the two buff fields:

```ts
import { mintGrants, type TemplateGrant } from './buffTemplates'

/** `grants` (DLR-113 AC3) is the Vault's bought starting cards, minted into the opening pile
 *  alongside the seeded placeholders. DEFAULTED to `[]`, so every existing call site is
 *  unchanged and a run started with no Vault behaves exactly as before. */
export function startRun(
  playerHealth: Health = PLAYER_START_HEALTH,
  grants: readonly TemplateGrant[] = [],
): RunState {
  const granted = mintGrants(grants, STARTING_BUFF_COUNT + 1)
  return {
    // …every existing field unchanged…
    buffs: [...seedStartingBuffPile(STARTING_BUFF_COUNT, 1), ...granted],
    nextBuffId: STARTING_BUFF_COUNT + 1 + granted.length,
  }
}
```

- [x] **Step 4: Export the three new names from the hunt barrel**

In `src/hunt/index.ts`, add `templateById` and `mintGrants` to the value export block that already carries `mintFromTemplate`, and `TemplateGrant` to the `export type` block that already carries `BuffTemplate`.

- [x] **Step 5: Run the run specs and the fast gate**

Run: `npx vitest run src/hunt/__tests__/run.grants.test.ts src/hunt/__tests__/run.test.ts src/hunt/__tests__/run-buffs.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0.

---

## Phase 2 — The Vault module

Everything the Vault *is*, as pure TypeScript with no React, no DOM, and no direct storage access. The boundary is established first (Task 3) so every file written after it is lint-checked against it as it lands. Nothing in this phase is imported by the app yet, so the tree type-checks throughout and the app's behaviour is unchanged at the phase boundary.

### Task 3: Fence `src/vault/**` and write `vaultConfig.ts` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/vault/vaultConfig.ts`
- Config: `eslint.config.js` — add `src/vault/**/*.{ts,tsx}` to the pure-core block's `files` and to the storage block's `ignores`

- [x] **Step 1: Extend the existing pure-core override — do not paste a second block**

In `eslint.config.js`, change the pure-core block's `files` array from
`['src/warCouncil/**/*.{ts,tsx}', 'src/hunt/**/*.{ts,tsx}']` to
`['src/warCouncil/**/*.{ts,tsx}', 'src/hunt/**/*.{ts,tsx}', 'src/vault/**/*.{ts,tsx}']`,
and change the storage block's `ignores` from
`['src/persistence/browserStorage.ts', 'src/warCouncil/**', 'src/hunt/**']` to
`['src/persistence/browserStorage.ts', 'src/warCouncil/**', 'src/hunt/**', 'src/vault/**']`.

Add to that block's existing explanatory comment: `src/vault/**` joins the same list for the same flat-config replacement reason — the pure-core block above already bans `localStorage` and `sessionStorage` there, so nothing is lost.

- [x] **Step 2: Write the configuration module**

Create `src/vault/vaultConfig.ts` with the six constants exactly as `plan.md` Part 2 → Data shapes states them, each carrying its `UNIT:` line and its register (`TRANSCRIBED` for `VAULT_EXCHANGE_RATE`, `AGENT-CHOSEN` for the rest), in the documented-constant style `src/hunt/slotConfig.ts` uses. State in the module docblock that `VAULT_STARTING_TIER_PRICE`'s 2/5/10 is derived from `REWARD_TIER_VALUE[BuffRewardAxis.Coins]` rather than independently chosen, and that `VAULT_ODDS_BOOST_MAX_STACKS` exists so a boosted template can never become certain.

- [x] **Step 3: Confirm the boundary and the types**

Run: `npm run lint; npm run typecheck`
Expected: both exit 0.

### Task 4: `src/vault/vaultState.ts` — the shape, its guard, and reconciliation ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/vault/vaultState.ts`
- Test: `src/vault/__tests__/vaultState.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/vault/__tests__/vaultState.test.ts` covering, for `isValidVaultState`: accepts `EMPTY_VAULT` and a fully populated valid vault; rejects `null`, `undefined`, `42`, `'x'`, `[]`; rejects a missing `balance`, a negative balance, `NaN`, `Infinity`, and a fractional balance; rejects `oddsBoosts` that is an array, or holds a zero, negative, fractional, or non-numeric stack; rejects `startingGrants` that is not an array, holds a non-object, a non-string `templateId`, or a `tier` outside `BuffTier`'s three values; ignores a `__proto__` key rather than treating it as a boost. And for `reconcileVault`: leaves a clean vault untouched with `droppedCount === 0`; drops a boost and a grant naming an unknown template and counts both; clamps a stack above `VAULT_ODDS_BOOST_MAX_STACKS` down to the cap without counting it as dropped.

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vault/__tests__/vaultState.test.ts`
Expected: fails — the module does not exist.

- [x] **Step 3: Implement the module**

Create `src/vault/vaultState.ts` with `VaultState`, `EMPTY_VAULT`, `isValidVaultState`, `VaultReconciliation`, and `reconcileVault`, matching `plan.md` Part 2 → Data shapes. Constraints the implementation must meet:

- `isValidVaultState` is a **shape** guard and narrows without a single `as` on the parsed value beyond the local `as { … }` property probes `saveStore.ts`'s own `isSaveEnvelope` uses. It accepts or rejects the whole payload — never partially.
- Boost keys are read via `Object.entries` into a fresh record, skipping `__proto__`, `constructor`, and `prototype`, so a hand-edited save cannot reach an object's prototype through a boost lookup.
- Every numeric field is checked with `Number.isSafeInteger` and a range, so no `NaN` or `Infinity` survives the guard into arithmetic.
- `reconcileVault` is a **domain** pass over an already shape-valid payload: it resolves each `templateId` through `templateById`, drops what does not resolve, clamps stacks, and never throws.
- Import `BuffTier` from `../hunt/buffs` and validate against its members rather than against string literals of its own.

- [x] **Step 4: Run the spec and the gates**

Run: `npx vitest run src/vault/__tests__/vaultState.test.ts; npm run typecheck; npm run lint`
Expected: Vitest exits 0 with 0 failed; both gates exit 0.

### Task 5: `src/vault/vaultEconomy.ts` — deposit, refusals, and both spends ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/vault/vaultEconomy.ts`
- Test: `src/vault/__tests__/vaultEconomy.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/vault/__tests__/vaultEconomy.test.ts` covering: `depositLeftoverCoin` credits `Math.floor(coin / VAULT_EXCHANGE_RATE)` for 0, 9, 10, 19, 100 and discards the remainder; a negative, `NaN`, or `Infinity` coin figure credits 0 and never produces a non-integer balance; the input vault is not mutated. `oddsBoostRefusalFor` returns `UnknownTemplate` for an id not in `BUFF_TEMPLATES`, `NotEnoughCurrency` below `VAULT_ODDS_BOOST_PRICE`, `BoostMaxed` at `VAULT_ODDS_BOOST_MAX_STACKS`, and `null` when affordable. `buyOddsBoost` debits exactly the price, adds one stack, stacks to the cap across repeated buys, and throws `RangeError` when called past its own refusal. `startingTierRefusalFor` prices each tier from `VAULT_STARTING_TIER_PRICE` and refuses an unknown template; `buyStartingTier` debits and appends one grant, and buying the same card twice queues **two** grants. `clearStartingGrants` empties the queue and leaves the balance and boosts untouched.

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vault/__tests__/vaultEconomy.test.ts`
Expected: fails — the module does not exist.

- [x] **Step 3: Implement the module**

Create `src/vault/vaultEconomy.ts` per `plan.md` Part 2 → Data shapes. Constraints:

- `VaultSpendRefusal` is an `as const` map, not an enum (`erasableSyntaxOnly`), following `SlotPullRefusal`.
- The refusal predicates are the **single** statement of affordability; the `buy*` functions call them and throw `RangeError` on a refusal, exactly as `buyFromShop` does — reachable only from a driver bug, so DLR-118's buttons guard with the predicate.
- `depositLeftoverCoin` guards `Number.isFinite` before dividing and floors a negative to 0, so no `NaN` and no negative balance is constructible.
- Every returned vault is a fresh object; nothing mutates its input.

- [x] **Step 4: Run the spec and the fast gate**

Run: `npx vitest run src/vault/__tests__/vaultEconomy.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0.

### Task 6: `src/vault/vaultOdds.ts` — the `drawReelPool` weight seam ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/vault/vaultOdds.ts`
- Test: `src/vault/__tests__/vaultOdds.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/vault/__tests__/vaultOdds.test.ts` covering: `boostMultiplierFor` returns `1` for an unboosted or unknown id and `1 + VAULT_ODDS_BOOST_STEP * stacks` otherwise, clamped at the cap. `vaultReelWeightFor(EMPTY_VAULT, machineId)` returns exactly `templateWeightFor(machineId, template)` for every template — the empty Vault must not perturb DLR-112's shipped odds at all. A boosted template's weight is the multiplier times its base weight. `drawVaultReelPool(EMPTY_VAULT, machineId, createSeededRng(n))` produces the identical strip to `drawReelPool(machineId, createSeededRng(n))` for several seeds, and a heavily boosted template appears on the strip strictly more often than unboosted across a sweep of seeds. Determinism: the same seed gives the same strip twice.

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vault/__tests__/vaultOdds.test.ts`
Expected: fails — the module does not exist.

- [x] **Step 3: Implement the module**

Create `src/vault/vaultOdds.ts` per `plan.md` Part 2 → Data shapes. Constraints:

- `vaultReelWeightFor` **multiplies** `templateWeightFor`'s result; it never replaces it, because replacement would erase the per-family normalisation `slotWeights.ts` documents.
- `drawVaultReelPool` passes `rng` straight through to `drawReelPool` and calls no random source of its own — `src/vault/` is as `Math.random()`-free as `src/hunt/`.
- The module docblock cites `slotMachine.ts` → `drawReelPool`'s defaulted `weightOf`, which DLR-112 built for exactly this.

- [x] **Step 4: Run the spec plus the slot specs it must not disturb**

Run: `npx vitest run src/vault/__tests__/vaultOdds.test.ts src/hunt/__tests__/slotMachine.test.ts src/hunt/__tests__/slotWeights.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0.

### Task 7: `src/vault/vaultStore.ts` and the barrel — the only file that knows about storage ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/vault/vaultStore.ts`
- Create: `src/vault/index.ts`
- Test: `src/vault/__tests__/vaultStore.test.ts`

- [x] **Step 1: Write the failing spec — this is AC4**

Create `src/vault/__tests__/vaultStore.test.ts` over `createMemoryStorage()` covering:

- **AC4's round trip.** Buy an odds boost and a gold starting tier into a vault, `saveVault`, build a **second store over the same storage** (the reload), `loadVault` — the balance, the boost stacks, and the grant come back identical, with `outcome === SaveReadOutcome.Loaded` and `droppedCount === 0`.
- `loadVault` on empty storage returns `EMPTY_VAULT` with `SaveReadOutcome.Empty`.
- A store built on `null` storage returns `EMPTY_VAULT` with `Unavailable`, and `saveVault` returns `SaveWriteOutcome.Unavailable` — a lost write is reported, never silently successful.
- Non-JSON bytes under the key, and a valid envelope whose `data` fails the shape guard, both return `EMPTY_VAULT` with `Corrupt`.
- **The unmigratable save.** An envelope written at `SAVE_SCHEMA_VERSION + 1` returns `EMPTY_VAULT` with `VersionMismatch`, and the raw record is **still present in storage afterwards** — the read does not destroy it.
- A stored vault naming a `templateId` no longer in `BUFF_TEMPLATES` loads with `outcome === Loaded`, that entry dropped, `droppedCount === 1`, and the **balance intact**.
- `saveKeyFor(VAULT_SAVE_SECTION)` is the only key touched, and it starts with `SAVE_NAMESPACE`.

- [x] **Step 2: Run and confirm it fails**

Run: `npx vitest run src/vault/__tests__/vaultStore.test.ts`
Expected: fails — the module does not exist.

- [x] **Step 3: Implement the store**

Create `src/vault/vaultStore.ts` per `plan.md` Part 2 → Data shapes. Constraints — these are `.claude/rules/save-data-versioning.md`'s reject conditions, and the executor must Read that file before writing this task:

- `createVaultStore` calls `createSaveStore({ section: VAULT_SAVE_SECTION, defaultValue: EMPTY_VAULT, isValidData: isValidVaultState, storage })`. It never names `localStorage`, never composes a key, and never writes a bare payload.
- `loadVault` returns the store's outcome verbatim beside the value — no outcome is collapsed, and a non-`Loaded` outcome never comes back as a success shape.
- Reconciliation runs **only** on a `Loaded` result; `droppedCount` is `0` for every other outcome.
- `loadVault` does **not** call `clear()`. The record a version mismatch could not read stays on disk until the next write replaces it, so a future migration still has its bytes. Say so in the docblock, with the reason, since DLR-106 deferred this decision to this ticket.
- `SAVE_SCHEMA_VERSION` is **not** bumped: this is the first shape ever written, at version 1.

- [x] **Step 4: Write the barrel**

Create `src/vault/index.ts` re-exporting the public surface of the five modules — the config constants, `VaultState`/`EMPTY_VAULT`/`isValidVaultState`/`reconcileVault`, `VaultSpendRefusal` and the economy functions, the three odds functions, and `VAULT_SAVE_SECTION`/`createVaultStore`/`loadVault`/`saveVault`/`VaultLoad` — in the shape `src/persistence/index.ts` uses.

- [x] **Step 5: Run the vault suite and both gates**

Run: `npx vitest run src/vault; npm run typecheck; npm run lint`
Expected: Vitest exits 0 with 0 failed; both gates exit 0.

---

## Phase 3 — Wiring the mechanism into the app

The Vault only matters if leftover coin actually reaches it and bought cards actually arrive. This phase adds the thin React glue and the two call sites in `App.tsx`, both of which are user callbacks rather than effects, so nothing new needs cleanup. No screen is built — the balance is held, not shown, which is exactly the DLR-113/DLR-118 line.

### Task 8: `src/app/vault/useVault.ts` — the React glue ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/vault/useVault.ts`
- Test: `src/app/vault/__tests__/useVault.test.tsx`

- [x] **Step 1: Write the hook**

Create `src/app/vault/useVault.ts` returning `VaultHandle` per `plan.md` Part 2 → Data shapes. Constraints:

- **No `useEffect`.** Two `useState`s with pure lazy initialisers — the store, and the initial `loadVault` result. StrictMode's double-invocation re-reads storage (idempotent) and re-wraps the same `localStorage` (stateless).
- `storage` is an optional parameter resolved **inside** the lazy initialiser via `browserLocalStorage()`, never called per render.
- `commit(next)` calls `saveVault` then `setVault(next)`. A rejected or unavailable write still updates the in-memory vault, so the session keeps working and only persistence is lost. It never throws and logs nothing.
- The file contains no JSX, so it stays a `.ts`.

- [x] **Step 2: Write the hook spec**

Create `src/app/vault/__tests__/useVault.test.tsx` using `renderHook` from `@testing-library/react` over an injected `createMemoryStorage()`: the initial value is `EMPTY_VAULT` with `SaveReadOutcome.Empty`; after `act(() => result.current.commit(vaultWithBalance))` the handle reports the new vault **and** a second `renderHook` over the same storage loads it back with `SaveReadOutcome.Loaded`; a hook built on `null` storage reports `Unavailable` and still commits in memory.

- [x] **Step 3: Run the hook spec**

Run: `npx vitest run src/app/vault/__tests__/useVault.test.tsx`
Expected: exits 0, 0 failed.

### Task 9: Wire deposit-on-death and claim-at-run-start into `App.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/App.tsx`

- [x] **Step 1: Add the hook and the two call sites**

In `src/App.tsx`:

- Import `RunOutcome` and `PLAYER_START_HEALTH` (already imported) from `./hunt`, `useVault` from `./app/vault/useVault`, and `clearStartingGrants` / `depositLeftoverCoin` from `./vault`.
- `const { vault, commit } = useVault()` beside the existing state.
- In `handleComplete`, inside the `isEncounterResolved(recorded.encounter)` branch, before the `return`: when `recorded.outcome === RunOutcome.Lost`, `commit(depositLeftoverCoin(vault, recorded.coins))`. AC1's conversion, at the one place the run's outcome is decided in this component. Do not zero `run.coins` — the verdict panel reads it.
- Replace the Start screen's `onAction={() => setPhase(RunPhase.Verdict)}` with a named `handleBeginRun` that calls `setRun(startRun(PLAYER_START_HEALTH, vault.startingGrants))`, commits `clearStartingGrants(vault)` **only when there is at least one grant** (so an ordinary run start writes nothing), and then sets the phase. Comment why this button is the run-start hook: `App.tsx` already routes both the initial mount and `handleNewRun` through `RunPhase.Start`, so it is the single structural place a run begins — and being a callback, there is nothing for StrictMode to double-fire.

- [x] **Step 2: Confirm the app still type-checks and its existing spec still passes**

Run: `npx vitest run src/__tests__/App.test.tsx; npm run typecheck; npm run lint`
Expected: Vitest exits 0 with 0 failed; both gates exit 0.

- [x] **Step 3: Measure every file this contract created or grew**

Run: `Get-ChildItem src\vault,src\app\vault -Recurse -Include *.ts,*.tsx | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }; "App.tsx $((Get-Content src\App.tsx).Count)"; "buffTemplates.ts $((Get-Content src\hunt\buffTemplates.ts).Count)"; "run.ts $((Get-Content src\hunt\run.ts).Count)"`
Expected: every count under 400. Any file at or over 400 is split in this task, not handed back as a finding.

---

## Phase 4 — Final verification

No production changes. Only cumulative sanity checks: the purity boundary, the storage boundary, the no-hard-coded-tunable check, and the full gates.

### Task 10: Confirm the two architectural boundaries still hold ✓

- Skill: `none — verification greps only, no code written`

- [x] **Step 1: No React and no DOM inside the pure trees, `src/vault/` now included**

Run: `Get-ChildItem src\vault,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|from \"react\"|\bwindow\.|\bdocument\.|Math\.random\("`
Expected: zero hits. A docblock that merely names `Math.random()` in prose is read individually and not counted as a hit.

- [x] **Step 2: Storage stays confined, per `.claude/rules/save-data-versioning.md` → How to verify**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "globalThis\.(localStorage|sessionStorage)\b|\b(localStorage|sessionStorage)\.(getItem|setItem|removeItem|clear)\("`
Expected: the same three hits the rule records — two in `src/persistence/browserStorage.ts`, one prose reference in `src/persistence/saveStore.ts`. Any fourth hit is a defect.

- [x] **Step 3: The namespace is composed in exactly one place**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "'strings-and-stations'"`
Expected: hits only in `src/persistence/config.ts`.

### Task 11: Confirm no Vault tunable was hard-coded ✓

- Skill: `none — verification greps only, no code written`

- [x] **Step 1: The rate, the cap, and the tier prices appear only in configuration**

Run: `Get-ChildItem src\vault,src\app\vault -Recurse -Include *.ts,*.tsx -Exclude *.test.ts,*.test.tsx | Select-String -Pattern "VAULT_EXCHANGE_RATE|VAULT_ODDS_BOOST_PRICE|VAULT_ODDS_BOOST_MAX_STACKS|VAULT_ODDS_BOOST_STEP|VAULT_STARTING_TIER_PRICE"`
Expected: every hit is either the declaration in `vaultConfig.ts`, an import, a barrel re-export, or a use of the named constant — no bare `10`, `2`, `5`, or `3` standing in for one of them in logic.

### Task 12: Static gates and full suite ✓

- Skill: `none — verification only, no code written`

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed and a file count at or above the 100-file, 1318-test baseline.

- [x] **Step 2: Prettier over only the files this contract touched**

Run: `npx prettier --check src/vault src/app/vault src/App.tsx src/hunt/buffTemplates.ts src/hunt/run.ts src/hunt/index.ts eslint.config.js`
Expected: exits 0. Repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is not a gate for this contract.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 13: Write the PR description ✓

- Skill: `none — documentation, no code written`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; what persists, what it costs, and what it buys; every number chosen with its justification and its register; the persisted shape and why it carries no `Buff`; the unmigratable-save decision and its reasoning; the DLR-113/DLR-118 boundary; the verification results with real numbers; and the developer-decides list from this file's File map verbatim.

---

## Self-review

**Spec coverage:**
- AC1 (conversion on death at `VAULT_EXCHANGE_RATE = 10`, persisted) — Tasks 3, 5, 7, 9.
- AC2 (odds boost raises a named buff's weight, persisted, re-applied on run start) — Tasks 5, 6, 7, 8.
- AC3 (three separately priced bronze/silver/gold purchases placing that tier into a future run's starting pile) — Tasks 1, 2, 5, 9.
- AC4 (both spends and the balance survive a reload, verified by a round-trip unit test through the storage layer) — Task 7, Step 1.
- `plan.md` In-scope: new `src/vault/` module — Tasks 3–7; `VaultState` shape — Task 4; typed store and guard — Tasks 4, 7; reconciliation — Tasks 4, 7; `drawReelPool` seam — Task 6; `startRun` grants and hunt-side minting — Tasks 1, 2; `useVault` — Task 8; `App.tsx` wiring — Task 9; eslint fence — Task 3; tests beside every pure module — Tasks 1, 2, 4, 5, 6, 7, 8.
- `plan.md` Out-of-scope holds: no `.tsx` is created; the only `.tsx` modified is `src/App.tsx`, which gains no markup.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change with its constraints named, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `VaultState`, `EMPTY_VAULT`, `isValidVaultState`, `reconcileVault`, `VaultReconciliation`, `VaultSpendRefusal`, `depositLeftoverCoin`, `oddsBoostRefusalFor`, `startingTierRefusalFor`, `buyOddsBoost`, `buyStartingTier`, `clearStartingGrants`, `boostMultiplierFor`, `vaultReelWeightFor`, `drawVaultReelPool`, `VAULT_SAVE_SECTION`, `VaultLoad`, `createVaultStore`, `loadVault`, `saveVault`, `VaultHandle`, `useVault`, `TemplateGrant`, `templateById`, `mintGrants`, and the six `VAULT_*` constants are spelled identically in `plan.md` Part 2 → Data shapes and in every task above. `TemplateGrant` is declared once, in `src/hunt/buffTemplates.ts`, and referenced everywhere else.

**Phase boundary cleanliness:**
- Phase 1 ends with hunt widened by three new exports and one defaulted parameter; every existing call site compiles unchanged and the Vault does not exist yet, so nothing is half-applied.
- Phase 2 ends with a complete, tested, lint-fenced `src/vault/` that nothing imports; the app's behaviour is byte-for-byte what it was.
- Phase 3 ends with the mechanism live and the file budget measured; no screen exists, which is the intended state until DLR-118.
- Phase 4 changes no production code.
