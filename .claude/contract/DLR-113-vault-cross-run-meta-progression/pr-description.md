# DLR-113: Vault — cross-run meta-progression

Plan: [`plan.md`](plan.md) · Checklist: [`tasks.md`](tasks.md) · Epic DLR-103 · Sibling: **DLR-118** (the Vault screen — not built here)

## Summary

Leftover coin at death is no longer lost. It converts into a persistent currency held in a new
`src/vault/` module, spent on two things that change future runs: raising a card's odds in the
slot-machine pool, and buying a tier of a card straight into the opening pile.

**This is the first thing this project has ever persisted.** `src/persistence/` shipped on DLR-106
with zero consumers; `src/vault/vaultStore.ts` is now its only one, and it is the only file in the
Vault that knows persistence exists at all.

**No Vault screen was built.** DLR-118 owns it. This ticket ships the mechanism those buttons will
call, plus the two wiring points that make it actually run.

## What persists, what it costs, what it buys

`VaultState = { balance, oddsBoosts, startingGrants }`, under save section `'vault'`.

| Field | What it is | Lifetime |
|---|---|---|
| `balance` | Vault currency | Persistent |
| `oddsBoosts` | `templateId -> stacks`; multiplies that template's reel weight | **Permanent** (AC2: "for future runs") |
| `startingGrants` | queue of `{templateId, tier}` minted into the opening pile | **Consumed at the next run start** (AC3: "a future run's starting pile") |

Credited **only on a run ending in death**. Never on a win — AC1 says "a run ending in death", and
paying the Vault for a win would make the strongest players accumulate fastest, which is exactly
the shape of a trivialised run 10. `run.coins` is not zeroed; the verdict panel still reads it.

## Every number, with its register

| Constant | Value | Register | Rationale |
|---|---|---|---|
| `VAULT_EXCHANGE_RATE` | 10 | **TRANSCRIBED** | AC1 states it. Not the agent's to choose. |
| `VAULT_ODDS_BOOST_PRICE` | 1 | agent-chosen | The cheapest purchase in the game, deliberately — the only thing a single 10-coin death can afford, so the currency is never dead on arrival. |
| `VAULT_ODDS_BOOST_MAX_STACKS` | 3 | agent-chosen | The anti-trivialisation cap; maxed = **x4** weight. |
| `VAULT_ODDS_BOOST_STEP` | 1 | agent-chosen | Additive: `weight x (1 + step * stacks)`. |
| `VAULT_STARTING_TIER_PRICE` | bronze 2 / silver 5 / gold 10 | **DERIVED** | Exactly `REWARD_TIER_VALUE[Coins]`'s existing 2/5/10 ladder. The game already states what a tier is worth; the Vault charges that rather than holding a second opinion. **Retune them together.** |

**Where these sit between the two failure modes.** *Run 1 is not a punishment*: nothing is gated,
all 71 templates are reachable at balance 0, and the opening pile is still `STARTING_BUFF_COUNT = 4`
— the Vault adds steering, never a stat. *Run 10 is not trivial*: the boost caps at x4, moving a
template from roughly 11% to roughly a third of appearing on a given 8-of-71 strip — clearly felt,
never guaranteed (approximate; the exact figure moves with per-family normalisation). And grants
are **consumed on use**, so a gold card costs ~100 leftover coin *every run you want it* and never
becomes a permanent power floor.

## The persisted shape, and why it carries no `Buff`

DLR-107 recorded that widening `Buff` with a required `kind` was free *only* because the buff pile
was unpersisted — "after DLR-113 this would need a schema bump". **It never lands.** A bought card
is stored as `{ templateId, tier }`, the minimal pair `mintFromTemplate` needs, and the live `Buff`
is minted fresh at run start. No domain type is ever on disk, so `Buff` stays free to widen
forever — and retuning `REWARD_TIER_VALUE` reaches every existing save for free, where persisting
the derived reward would leave old saves paying old numbers.

`VaultState` is deliberately **one type**, in-memory and persisted, not a DTO pair: two shapes
drift, one shape with a guard over it cannot.

**`BuffTemplate.id` was documented "NOT persisted" by DLR-112 — this ticket overturns that
deliberately** and fixed the statement at its declaration rather than leaving a comment
contradicting the data. Its format `<kind>[:<param>]:<axis>` is now frozen: renaming a `BuffKind`
or `BuffRewardAxis` **value** orphans saved entries, and a future rename must ship a migration.

## The unmigratable save — DLR-106 deferred this decision to here

**Discarded; the player starts fresh — but non-destructively.** `loadVault` returns the store's
`VersionMismatch` / `Corrupt` outcome verbatim beside `EMPTY_VAULT`, so DLR-118's screen can say
"your Vault could not be read" rather than showing a silent zero. The read deliberately does **not**
call `clear()`: a read must not destroy data, and leaving the bytes in place is what lets a future
version write a migration for them. The record is replaced by the next write.

Migration is the wrong answer at version 1 — there is exactly one schema version in existence, so a
migration function today would have no source shape to migrate *from*. `SAVE_SCHEMA_VERSION` stays 1.

The **half-load** is what the rule forbids, and the two-stage design avoids it: `isValidVaultState`
is an all-or-nothing **shape** guard; `reconcileVault` is a separate **domain** pass that drops only
entries naming templates this build lacks, returning a count. Shape failure loses the save; domain
drift loses the affected entries and **keeps the balance**.

## `.claude/rules/save-data-versioning.md` — all six reject conditions

1. `localStorage`/`sessionStorage` named only in `browserStorage.ts` — lint-enforced; grep returns the same 3 recorded hits.
2. Key composed only via `saveKeyFor`, from section `'vault'` — never concatenated.
3. `{version, data}` envelope only, via `createSaveStore`.
4. No incompatible shape change; `SAVE_SCHEMA_VERSION` correctly stays 1 (first shape ever written).
5. No `as T` on a parsed payload — `isValidVaultState` narrows, using only the local property probes `saveStore.ts`'s own `isSaveEnvelope` already uses.
6. No read failure reported as success. Round-1 review found the one place this was *nearly* violated on the write side — `commit` discarded `saveVault`'s outcome — now fixed via `lastWriteOutcome`.

## The DLR-113 / DLR-118 boundary

**Shipped here (the mechanism):** the state and its guard, the store, both spend paths with their
refusal predicates, the odds seam, grant minting, and two wiring points — deposit when the run's
outcome becomes `Lost`, claim grants when the Start screen's button begins a run.

**Left to DLR-118 (the screen):** every `.tsx`, the balance display, both spend buttons, and
navigation from the verdict flow. **Nothing of DLR-118's work was absorbed.** Two consequences
worth knowing: the two spends have no way to be invoked in the app today, and AC2's "re-applied on
run start" has no *visible* surface because DLR-112 shipped the slot engine with no screen either —
`drawVaultReelPool` has no production caller yet and is exercised by tests only. That is
structural, not a gap.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **1403 passed / 1403, 107 files, 0 failed** (baseline 1318 / 100) |
| `npm run build` | exit 0, `dist/` written |
| `npx prettier --check` (contract-scoped) | exit 0 |

Boundary greps all as expected: zero real React/DOM/`Math.random()` hits in `src/vault` + `src/hunt`
(9 hits, all docblock prose); exactly 3 storage hits, all in `src/persistence/`;
`'strings-and-stations'` only in `src/persistence/config.ts`; no Vault tunable hard-coded.

`src/vault/**` was added to the pure-core ESLint fence **and** to the storage block's `ignores` —
the second is load-bearing, because flat config *replaces* rather than merges same-key rule
options, the exact regression caught on DLR-106. The Defender probe-tested the fence with a
throwaway `window.location.href` file rather than trusting a green lint run.

Review: 2 rounds. Round 1 — Code-Evaluator APPROVED, Defender APPROVED (1 Warning), QA FAILURES
FOUND (Prettier on 6 files). Round 2 — all three APPROVED, Defender 0/0/0.

**No browser pass was run** (opt-in, not requested; none is claimed). What one would have checked:
the Start screen's "Fight &lt;name&gt;" button still advancing into the first fight — the only
behaviourally reachable change — a clean console on load and remount, and that the Vault balance is
held but rendered nowhere, which *is* the DLR-113/DLR-118 line.

## Developer decides or observes

- `VAULT_EXCHANGE_RATE = 10` — transcribed from AC1, but at today's coin economy
  (`COINS_PER_ENCOUNTER_WIN = 1`, shop prices 1–4) a typical death holds 0–5 leftover coin and
  converts to **0**. Decide after playing whether to lower the rate or raise coin income.
- `VAULT_ODDS_BOOST_PRICE = 1`, `VAULT_ODDS_BOOST_MAX_STACKS = 3`, `VAULT_ODDS_BOOST_STEP = 1`,
  `VAULT_STARTING_TIER_PRICE = {bronze 2, silver 5, gold 10}` — all agent-chosen and unplayed. The
  tier prices are derived from `REWARD_TIER_VALUE[Coins]`'s 2/5/10 ladder; retune them together.
- Whether starting grants are **one-shot** (this contract's reading of AC3's "a future run's
  starting pile") or permanent. Making them permanent is deleting one `clearStartingGrants` call in
  `App.tsx` — and the meta becomes compounding.
- Whether an unreadable save should be **discarded** (this contract) or migrated at the first
  `SAVE_SCHEMA_VERSION` bump. Discarding is right for a prototype nobody has played; hand builds to
  other people and that changes.
- Whether progression *feels* like progression at these prices, and whether run 1 reads as a
  complete game rather than a stripped one. Only playing answers this.
- **Watch, don't pre-balance:** `Miser` rewards unspent coins and so does the Vault, so the two
  point the same way — the Vault reinforces the hoarding incentive DLR-111 flagged rather than
  resolving it. Left alone deliberately.

## New convention introduced

A **third** lint-fenced pure tree, `src/vault/**`, alongside `src/hunt/**` and `src/warCouncil/**`
— no React, no DOM, no storage globals. Anything added under `src/vault/` inherits that fence;
storage access goes through `src/persistence/` or it does not happen.
