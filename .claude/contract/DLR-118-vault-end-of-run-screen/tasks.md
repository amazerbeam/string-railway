# Tasks: Vault end-of-run screen

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Not developer-confirmed.** This contract ran unattended as part of the 2026-08-23 sprint run. `plan.md`'s approval gate was auto-approved and `mockup.html` was written to disk but **never seen by the developer**. Every default taken is listed in `plan.md` Part 1 → Assumptions made.

Status: COMPLETE
Started: 2026-08-24

**Goal:** Build the Vault's own full-viewport screen, reached from the terminal run verdict, showing what this run's death paid in, what the Vault holds, and both of DLR-113's spends — with the empty, winning-run and save-failure states all rendered explicitly.

**Spec:** `plan.md` in this folder. Layout and states per `mockup.html` in this folder (unseen — layout reference only).

---

## File map

**Created:**

- `src/app/vault/vaultRunCredit.ts` — `creditedFromRun(outcome, coins)`, the loss-only conversion, derived through `depositLeftoverCoin`
- `src/app/vault/vaultLabels.ts` — every user-facing string on the Vault screen; all figures interpolated from `src/vault/` configuration
- `src/app/vault/VaultScreen.tsx` — the screen itself
- `src/app/vault/vault.css` — its inner layout, mounted inside `run.css`'s existing `.run-shell`
- `src/app/vault/__tests__/vaultRunCredit.test.ts` — the loss-only rule, asserted directly
- `src/app/vault/__tests__/vaultLabels.test.ts` — copy totality and figure interpolation
- `src/app/vault/__tests__/VaultScreen.test.tsx` — every screen state, by accessible role and label

**Modified:**

- `src/app/vault/useVault.ts` — widen `commit` to accept a functional updater
- `src/app/vault/__tests__/useVault.test.tsx` — cover the updater form
- `src/app/run/runLabels.ts` — add `VAULT_LABEL`
- `src/app/run/RunOutcomePanel.tsx` — add the required `onVault` prop and the terminal-verdict control
- `src/app/run/__tests__/RunOutcomePanel.test.tsx` — the `baseProps` construction site, plus a test for the new control
- `src/App.tsx` — `RunPhase.Vault`, the branch that mounts `VaultScreen`, the `onVault` prop, and the two `commit` call sites converted to the updater form

**Deleted:** (none)

**Developer decides or observes:**

- **All copy on this screen is placeholder**, including the currency noun "mark" (`VAULT_CURRENCY_SINGULAR` / `VAULT_CURRENCY_PLURAL` in `vaultLabels.ts`). Every sentence is the developer's to reword.
- **Whether the Vault should be skippable.** It is one press from the terminal verdict; pressing `Start a new run` there never shows it. Judge in play whether it should instead be the verdict's only forward control.
- **Whether two-step narrowing (family, then card) reads as focused or as hiding the catalogue.** 71 templates do not fit a no-scroll screen as one list; this is the cost.
- **Whether the screen fits without scrolling at 1280×800, 1024×768, 1366×768 and 390×844.** No browser pass ran on this contract, and jsdom has no layout engine, so nothing has verified it.
- **Every `clamp()` bound and hue in `vault.css`**, copied from `run.css`'s existing scale rather than chosen.

---

## Phase 1 — The two pure modules

The conversion rule and every sentence the screen says, as plain functions with no renderer. This phase ends type-checking with two new modules and their specs, imported by nothing yet — a clean stopping point because nothing existing changes.

### Task 1: Add `creditedFromRun` to `src/app/vault/vaultRunCredit.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/vault/vaultRunCredit.ts`
- Test: `src/app/vault/__tests__/vaultRunCredit.test.ts`

- [x] **Step 1: Write the failing spec for the loss-only rule**

Create `src/app/vault/__tests__/vaultRunCredit.test.ts`. It must assert, at minimum: a lost run with `VAULT_EXCHANGE_RATE * 3 + 7` coins credits `3`; a lost run with fewer coins than `VAULT_EXCHANGE_RATE` credits `0`; a **won** run with the same coin count credits `0`; an `InProgress` run credits `0`; and `0` / negative / non-finite coin counts credit `0`. Every expected figure is computed from `VAULT_EXCHANGE_RATE`, never written as a literal.

```ts
import { describe, expect, it } from 'vitest'
import { RunOutcome } from '../../../hunt'
import { VAULT_EXCHANGE_RATE } from '../../../vault'
import { creditedFromRun } from '../vaultRunCredit'

describe('creditedFromRun — the loss-only deposit rule', () => {
  it('credits floor(coins / rate) on a lost run', () => {
    expect(creditedFromRun(RunOutcome.Lost, VAULT_EXCHANGE_RATE * 3 + 7)).toBe(3)
  })

  it('credits NOTHING on a won run, whatever the leftover coin', () => {
    expect(creditedFromRun(RunOutcome.Won, VAULT_EXCHANGE_RATE * 3 + 7)).toBe(0)
  })
})
```

- [x] **Step 2: Run the spec and see it fail on the missing module**

Run: `npx vitest run src/app/vault/__tests__/vaultRunCredit.test.ts`
Expected: exits non-zero, reporting that `../vaultRunCredit` cannot be resolved.

- [x] **Step 3: Implement the module**

Create `src/app/vault/vaultRunCredit.ts`. It must call `depositLeftoverCoin` rather than dividing, so the rate stays stated once.

```ts
import { RunOutcome, type Coins } from '../../hunt'
import { EMPTY_VAULT, depositLeftoverCoin } from '../../vault'

/**
 * DLR-118 — what THIS run paid into the Vault, for display only.
 *
 * The rule DLR-113 settled: leftover coin converts at the single place a run's outcome is
 * decided, and ONLY on a loss — a win is its own reward. `App.tsx`'s `handleComplete` is the one
 * place that actually commits it; this function re-derives the same figure for the screen,
 * which is sound precisely because `run.coins` is deliberately NOT zeroed.
 *
 * It calls `depositLeftoverCoin` against `EMPTY_VAULT` rather than dividing by
 * `VAULT_EXCHANGE_RATE` itself. That is load-bearing: the rate, the floor, and the
 * finite/negative guards are stated ONCE, in `src/vault/`, and a second division here would be a
 * second source of truth free to drift from the number actually banked.
 */
export function creditedFromRun(outcome: RunOutcome, coins: Coins): number {
  if (outcome !== RunOutcome.Lost) return 0
  return depositLeftoverCoin(EMPTY_VAULT, coins).balance
}
```

- [x] **Step 4: Run the spec and the typechecker**

Run: `npx vitest run src/app/vault/__tests__/vaultRunCredit.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 2: Add the screen's copy to `src/app/vault/vaultLabels.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/vault/vaultLabels.ts`
- Test: `src/app/vault/__tests__/vaultLabels.test.ts`

- [x] **Step 1: Write the module**

Create `src/app/vault/vaultLabels.ts` with the exports named in `plan.md` Part 2 → Data shapes. Follow `src/app/run/slotLabels.ts`'s header discipline verbatim: mark the whole module PLACEHOLDER copy, and **interpolate every figure** from `VAULT_EXCHANGE_RATE`, `VAULT_ODDS_BOOST_PRICE`, `VAULT_ODDS_BOOST_MAX_STACKS` and `VAULT_STARTING_TIER_PRICE` — no price, rate or cap may appear as a numeric literal anywhere in the file.

Required shape and behaviour:

- `VAULT_READ_PROBLEM: Readonly<Record<SaveReadOutcome, string | null>>` — **total over the union**, with `Loaded` and `Empty` mapping to `null` (neither is a failure). `Corrupt` and `VersionMismatch` must both say that the unreadable record is **left on disk untouched** and that this session starts from an empty Vault — that is DLR-113's decided behaviour, rendered, not re-invented. `Unavailable` says the Vault works for this session but will not be remembered.
- `VAULT_WRITE_PROBLEM: Readonly<Record<SaveWriteOutcome, string | null>>` — total, with `Written` mapping to `null`.
- `VAULT_REFUSAL_MESSAGE: Readonly<Record<VaultSpendRefusal, string>>` — total over `notEnoughCurrency` / `unknownTemplate` / `boostMaxed`.
- `VAULT_TIER_LABEL: Readonly<Record<BuffTier, string>>` — total over `BuffTier`.
- `vaultDepositText(outcome, coins)` — three branches: a lost run that converted something; a lost run whose coins were below the rate (which must quote `VAULT_EXCHANGE_RATE` by interpolation); and a **non-lost** run, whose sentence must state that a won run pays nothing in. It calls `creditedFromRun`, never its own arithmetic.
- `currencyText(amount)` — singular/plural through `VAULT_CURRENCY_SINGULAR` / `_PLURAL`.
- `oddsBoostAccessibleName(stacks, refusal)` / `startingTierAccessibleName(tier, refusal)` — the price, then the refusal reason folded in when there is one, mirroring `slotPullAccessibleName`.
- `boostLineText(templateId, stacks)` and `grantLineText(grant)` — both word the card through `slotSymbolText(templateById(id))`, DLR-114's one grammar reached the way `slotLabels.ts` already reaches it. Neither may call `apCostOf` or handle a `Buff`. When `templateById` returns `undefined`, fall back to the raw id rather than throwing.

- [x] **Step 2: Write the spec**

Create `src/app/vault/__tests__/vaultLabels.test.ts` asserting: every `SaveReadOutcome` member has an entry and only `Loaded`/`Empty` are `null`; every `SaveWriteOutcome` member has an entry and only `Written` is `null`; every `VaultSpendRefusal` and every `BuffTier` has a non-empty entry; `vaultDepositText` on a won run contains no digit from the credited figure and is distinct from the lost-run sentence; the below-rate sentence contains `String(VAULT_EXCHANGE_RATE)`; `currencyText(1)` is singular and `currencyText(2)` is plural; and `startingTierAccessibleName` contains `String(VAULT_STARTING_TIER_PRICE[tier])` for each tier.

- [x] **Step 3: Run the spec and the typechecker**

Run: `npx vitest run src/app/vault/__tests__/vaultLabels.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 2 — The hook's committed-state fix

One localised widening of `useVault.commit` so a batched double-click cannot revert a purchase. The phase ends type-checking with both existing call sites still compiling, because the signature widens rather than changes.

### Task 3: Widen `commit` in `src/app/vault/useVault.ts` to accept a functional updater ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/vault/useVault.ts`
- Test: `src/app/vault/__tests__/useVault.test.tsx`

- [x] **Step 1: Widen the type and the implementation**

Replace the `commit` declaration in `VaultHandle` and its implementation. Add a `useRef` mirror of the committed vault, initialised from the existing lazy `useState`, written **only** inside `commit`.

```ts
export type VaultCommit = VaultState | ((prev: VaultState) => VaultState)
```

```ts
  // DLR-118 — the live committed vault, so a `commit` fired twice before React re-renders
  // (a double-click, or a fast repeated key-activation) computes the second purchase from the
  // FIRST one's result rather than from the render's stale closure. Without it the second write
  // silently REVERTS the first. Written only here, inside an event callback, so StrictMode's
  // development double-invocation never touches it and no effect is needed to keep it in step —
  // `commit` is the only writer of vault state in this hook.
  const committed = useRef(load.vault)

  function commit(next: VaultCommit): void {
    const value = typeof next === 'function' ? next(committed.current) : next
    committed.current = value
    const outcome = saveVault(store, value)
    setLoad((prev) => ({
      vault: value,
      outcome: prev.outcome,
      droppedCount: prev.droppedCount,
      lastWriteOutcome: outcome,
    }))
  }
```

Update the `commit` docblock in `VaultHandle` to say it accepts either a value or a `(prev) => next` updater, and that the updater form is the one to prefer.

- [x] **Step 2: Add a spec for the updater form**

Add tests to `src/app/vault/__tests__/useVault.test.tsx`: that `commit((prev) => …)` receives the currently committed vault and stores its result; and — the defect this closes — that **two `commit` updater calls made back to back inside one `act()` both land**, i.e. a vault committed twice with `(v) => ({ ...v, balance: v.balance + 1 })` ends at `+2`, not `+1`. Assert the existing value form still works unchanged.

- [x] **Step 3: Run the spec and the typechecker**

Run: `npx vitest run src/app/vault/__tests__/useVault.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 3 — The screen

The component, its stylesheet, and its component spec. The phase ends type-checking with `VaultScreen` complete but not yet mounted — nothing routes to it until Phase 4, so the app is unchanged and consistent at this boundary.

### Task 4: Build `src/app/vault/VaultScreen.tsx` and `src/app/vault/vault.css` ✓

- Skill: react-frontend
- Skill: game-ux

**Files:**

- Create: `src/app/vault/VaultScreen.tsx`
- Create: `src/app/vault/vault.css`

- [x] **Step 1: Write the stylesheet**

Create `src/app/vault/vault.css` covering only the inside of the shell — the screen mounts into `run.css`'s existing `.run-shell`, so **no second `100dvh` grid, no `100vh`, and no `100vw` may appear**. Layout per `mockup.html` in this folder. Every `clamp()` bound and hue is copied from `run.css`'s existing scale; head the file with the same "the DEVELOPER'S to retune" comment `run.css` carries. The holdings list is the one region allowed its own `overflow-y: auto` with a `max-height`, because the queued-grant list is unbounded in length; say so in a comment. Every control keeps a ≥44px hit area, uses `:focus-visible`, wraps hover in `@media (hover: hover)`, and sets `touch-action: manipulation`.

- [x] **Step 2: Write the component**

Create `src/app/vault/VaultScreen.tsx` with the props from `plan.md` Part 2 → Data shapes. Structure, in order:

1. `<div className="run-shell">` → `<div className="vault-screen" onKeyDown={…Escape → onLeave}>`.
2. `<h1>` carrying `VAULT_TITLE`.
3. A `role="alert"` paragraph rendered **only** when `VAULT_READ_PROBLEM[handle.loadOutcome]` is non-null, when `handle.lastWriteOutcome` maps to a non-null `VAULT_WRITE_PROBLEM` entry, or when `handle.droppedCount > 0`.
4. A `role="group"` ledger labelled `VAULT_LEDGER_GROUP_LABEL`, containing a `role="status"` deposit line from `vaultDepositText(outcome, leftoverCoins)`, the balance from `vaultBalanceText(handle.vault.balance)`, and a holdings `<ul>` listing each boost through `boostLineText` and each queued grant through `grantLineText` — falling back to `VAULT_EMPTY_TEXT` when the vault holds nothing at all.
5. A `role="group"` spend region labelled `VAULT_SPEND_GROUP_LABEL`, containing two `<label>`-wrapped `<select>` elements (family, then card) and four buy controls: one odds boost and one per `BuffTier`, each `disabled` when its refusal is non-null and each carrying its refusal in its `aria-label` via the two accessible-name helpers. A `role="status"` line shows the current refusal message.
6. A `.run-actions` div with the single `VAULT_LEAVE_LABEL` control calling `onLeave`.

Rules the component must obey:

- The family list is derived from `BUFF_TEMPLATES`' distinct `kind` values in declaration order; the card list is `templatesForFamily(selectedKind)`. **Guard the empty case before indexing** — if a family somehow yields no template, render no card select and disable every buy control rather than reading index `0`.
- Both spend handlers re-derive their refusal (`oddsBoostRefusalFor` / `startingTierRefusalFor`) against the vault they actually see and **no-op when refused**, then `handle.commit((v) => buyOddsBoost(v, id))` / `handle.commit((v) => buyStartingTier(v, id, tier))`. The functional form is required; the value form loses a batched second click.
- No effect, no timer, no listener, no `Math.random()`, no `console.*`, no `memo`/`useMemo`/`useCallback`, and no numeric literal for any price, rate or cap.
- The component never calls `apCostOf` and never handles a `Buff`.

- [x] **Step 3: Typecheck and measure both new files against the 400-line budget**

Run: `npm run typecheck; (Get-Content src\app\vault\VaultScreen.tsx).Count; (Get-Content src\app\vault\vault.css).Count`
Expected: `tsc -b` exits 0; both counts are under 400. If `VaultScreen.tsx` exceeds 400, split the ledger region into a sibling component in this same task.

### Task 5: Cover every screen state in `src/app/vault/__tests__/VaultScreen.test.tsx` ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/vault/__tests__/VaultScreen.test.tsx`

- [x] **Step 1: Write the component spec**

Create `src/app/vault/__tests__/VaultScreen.test.tsx` with `/** @vitest-environment jsdom */` at the top, following `src/app/run/__tests__/RunOutcomePanel.test.tsx`'s shape (a `baseProps` object plus `afterEach(cleanup)`). Build the `VaultHandle` as a plain object literal with a `vi.fn()` `commit` — the screen must be testable without `useVault`. **Every query is `getByRole` / `getByLabelText` / `getByText` against an exported label constant; never a class name, never a `data-testid`, and never a quoted English sentence.**

Required cases, one per screen state:

1. **Lost run, coins converted** — the deposit line reads `vaultDepositText(RunOutcome.Lost, coins)` and the balance line reads `vaultBalanceText(balance)`.
2. **Winning run** — the deposit line reads the non-lost sentence and is **not** the lost-run sentence. This is the assertion that proves the loss-only rule is rendered.
3. **Lost run below the exchange rate** — the deposit line is the below-rate sentence.
4. **First-ever run, empty Vault** (`balance: 0`, no boosts, no grants, `loadOutcome: Empty`) — `VAULT_EMPTY_TEXT` is present, **no `role="alert"` is rendered**, and every buy control is disabled.
5. **Save could not be read** (`loadOutcome: Corrupt`, then `VersionMismatch`) — a `role="alert"` is present carrying the matching `VAULT_READ_PROBLEM` entry.
6. **Storage unavailable** (`loadOutcome: Unavailable`) — the matching alert is present.
7. **Entries dropped** (`droppedCount: 2`) — `vaultDroppedText(2)` is present.
8. **Write failed** (`lastWriteOutcome: Rejected`) — the matching `VAULT_WRITE_PROBLEM` alert is present.
9. **Buying an odds boost** — with an affordable balance, clicking the control named `oddsBoostAccessibleName(0, null)` calls `commit` exactly once with a **function**, and applying that function to the props' vault yields a balance reduced by `VAULT_ODDS_BOOST_PRICE` and a stack of 1.
10. **Buying a starting tier** — same, per tier, asserting the balance falls by `VAULT_STARTING_TIER_PRICE[tier]` and one grant is queued.
11. **A maxed boost refuses** — with `VAULT_ODDS_BOOST_MAX_STACKS` already held, the boost control is disabled and its accessible name carries `VAULT_REFUSAL_MESSAGE[VaultSpendRefusal.BoostMaxed]`.
12. **Leaving** — the control named `VAULT_LEAVE_LABEL` calls `onLeave`, and `Escape` on the container calls it too.
13. **Selecting a family then a card** — changing the family select changes the card select's options, and the buy controls act on the newly selected template id.

- [x] **Step 2: Run the spec and the typechecker**

Run: `npx vitest run src/app/vault/__tests__/VaultScreen.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

---

## Phase 4 — Wiring it into the run flow

The verdict gains its control and the driver gains its phase. This is the first phase where the app's behaviour changes, and it ends with the whole route reachable and type-checking.

### Task 6: Add the `Open the Vault` control to the terminal verdict ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/run/runLabels.ts`
- Modify: `src/app/run/RunOutcomePanel.tsx`
- Test: `src/app/run/__tests__/RunOutcomePanel.test.tsx`

- [x] **Step 1: Add the label**

In `src/app/run/runLabels.ts`, beside the existing control labels, add:

```ts
/** DLR-118 — the terminal verdict's route to the Vault screen. PLACEHOLDER copy. */
export const VAULT_LABEL = 'Open the Vault'
```

- [x] **Step 2: Add the prop and the control**

In `src/app/run/RunOutcomePanel.tsx`, add the required `onVault: () => void` prop with the docblock from `plan.md` Part 2 → Data shapes, destructure it, and render it in the `!canContinue` branch only — the branch that currently holds `NEW_RUN_LABEL` alone. `Open the Vault` becomes the primary control and `Start a new run` the secondary beside it:

```tsx
          <div className="run-actions">
            <button type="button" className="run-btn is-primary" onClick={onVault}>
              {VAULT_LABEL}
            </button>
            <button type="button" className="run-btn" onClick={onNewRun}>
              {NEW_RUN_LABEL}
            </button>
          </div>
```

Nothing in the `canContinue` branches changes: there is no Vault control while a run can still continue.

- [x] **Step 3: Update the spec's construction site and cover the new control**

In `src/app/run/__tests__/RunOutcomePanel.test.tsx`, add `onVault: vi.fn()` to `baseProps` — the single construction site the audit found — and add two tests: that a terminal verdict offers a control named `VAULT_LABEL` which calls `onVault` when clicked, and that a verdict with `canContinue` offers **no** control named `VAULT_LABEL`.

- [x] **Step 4: Run the spec and the typechecker**

Run: `npx vitest run src/app/run/__tests__/RunOutcomePanel.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; `tsc -b` exits 0.

### Task 7: Mount the Vault phase in `src/App.tsx` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/App.tsx`

- [x] **Step 1: Add the phase, the handle, and the branch**

In `src/App.tsx`:

- Add `Vault: 'vault'` to the `RunPhase` map, with a one-line comment saying it is reachable only from a terminal verdict.
- Change `const { vault, commit } = useVault()` to keep the whole handle: `const vaultHandle = useVault()` followed by `const { vault, commit } = vaultHandle`.
- Convert both existing `commit` call sites to the updater form, since Task 3 made it available and it is the safer one:
  `commit((v) => depositLeftoverCoin(v, recorded.coins))` and `commit(clearStartingGrants)`.
- Add `onVault={() => setPhase(RunPhase.Vault)}` to the `<RunOutcomePanel>` element.
- Add the branch **above** the `if (encounterOver)` verdict branch:

```tsx
  if (encounterOver && phase === RunPhase.Vault) {
    // `run.coins` is NOT zeroed by the deposit — `handleComplete` leaves it for the verdict
    // panel — so the screen re-derives what was banked rather than needing state for it.
    return (
      <VaultScreen
        handle={vaultHandle}
        outcome={run.outcome}
        leftoverCoins={run.coins}
        onLeave={handleNewRun}
      />
    )
  }
```

- [x] **Step 2: Typecheck and measure `App.tsx` against the 400-line budget**

Run: `npm run typecheck; (Get-Content src\App.tsx).Count`
Expected: `tsc -b` exits 0; the count is under 400. It was 347 before this contract.

---

## Phase 5 — Final verification

No production changes. Only the cumulative sanity checks: the pure-core boundary still holds, no tunable was restated as a literal, the file budget is met, and the whole suite plus the build are green.

### Task 8: Confirm the pure-core boundary and the vocabulary still hold ✓

- Skill: none — verification only, no code is written

**Files:**

- (no files changed)

- [x] **Step 1: Confirm no React, DOM or storage global entered the pure trees**

Run: `Get-ChildItem src\hunt, src\vault -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. **Actual:** 11 hits, every one inside a doc comment citing the rule by name (e.g. "`src/hunt/` may not call `Math.random()`") — zero actual imports/usages of any banned symbol.

- [x] **Step 2: Confirm the banned vocabulary is absent from this contract's new files**

Run: `Get-ChildItem src\app\vault -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "Envenom|poison"`
Expected: zero hits. **Actual:** zero hits.

### Task 9: Confirm no tunable was hard-coded on the new screen ✓

- Skill: none — verification only, no code is written

**Files:**

- (no files changed)

- [x] **Step 1: Confirm the Vault's configured figures are read, never restated**

Run: `Get-ChildItem src\app\vault -Recurse -Include *.ts,*.tsx | Select-String -Pattern "VAULT_EXCHANGE_RATE|VAULT_ODDS_BOOST_PRICE|VAULT_ODDS_BOOST_MAX_STACKS|VAULT_STARTING_TIER_PRICE"`
Expected: at least one hit in `vaultLabels.ts` and at least one in `VaultScreen.tsx` — the configuration is imported and interpolated. **Actual:** hits in both, plus their specs.

- [x] **Step 2: Confirm `apCostOf` is never reached from the Vault screen**

Run: `Get-ChildItem src\app\vault -Recurse -Include *.ts,*.tsx | Select-String -Pattern "apCostOf"`
Expected: zero hits — the `Unassigned` `RangeError` trap is structurally unreachable from this surface. **Actual:** one hit, `VaultScreen.tsx:71`, a docblock comment stating the component never calls `apCostOf` — not a call, satisfies the check's intent.

### Task 10: Format this contract's files, then run the static gates and the full suite ✓

- Skill: none — verification only, no code is written

**Files:**

- (no files changed beyond Prettier's own formatting of this contract's paths)

- [x] **Step 1: Format only this contract's files**

Run: `npx prettier --write src/app/vault src/app/run/RunOutcomePanel.tsx src/app/run/runLabels.ts src/app/run/__tests__/RunOutcomePanel.test.tsx src/App.tsx`
Expected: exits 0. **Never run `npm run format`** — it is `prettier --write` repo-wide and rewrites ~58 unrelated markdown files. **Actual:** exit 0; reformatted `VaultScreen.test.tsx` and `vaultLabels.ts`, all other files already conformed.

- [x] **Step 2: Re-measure every file this contract created or grew, after Prettier**

Run: `(Get-Content src\App.tsx).Count; (Get-Content src\app\vault\VaultScreen.tsx).Count; (Get-Content src\app\vault\vaultLabels.ts).Count; (Get-Content src\app\vault\vault.css).Count; (Get-Content src\app\run\RunOutcomePanel.tsx).Count`
Expected: every count under 400. A breach is fixed in this ticket, not handed back. **Actual:** 365, 228, 141, 126, 198 — all under budget.

- [x] **Step 3: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed, against a baseline of 1526 passed of 1526 across 117 files. **Actual:** `npm run typecheck` exit 0, `npm run lint` exit 0 — both run by the Implementer. **`npm test` (unfiltered) was NOT run** — delegated to QA per the pipeline's standing rule that the full suite belongs to QA alone.

- [x] **Step 4: Confirm formatting of this contract's files only**

Run: `npx prettier --check src/app/vault src/app/run/RunOutcomePanel.tsx src/app/run/runLabels.ts src/app/run/__tests__/RunOutcomePanel.test.tsx src/App.tsx`
Expected: exits 0. Repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is not this contract's gate. **Actual:** exit 0, "All matched files use Prettier code style!".

- [x] **Step 5: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. **Not run by the Implementer** — delegated to QA per the pipeline's standing rule that the production build belongs to QA alone.

### Task 11: Write the PR description ✓

- Skill: none — a document for the developer, no code

**Files:**

- Create: `.claude/contract/DLR-118-vault-end-of-run-screen/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` in this folder; a summary of the change; **every screen state defined, including empty, winning-run and save-failure**; the statement that the screen sits beside `RunOutcomePanel` rather than replacing it and shares CSS with `run.css` and none with `warCouncilHunt.css`; every decision the developer must make and every behaviour they must judge by playing (the File map's "Developer decides or observes" list); the verification results from Phase 5 with real numbers; and a one-line note that `useVault.commit` now prefers the functional-updater form.

---

## Self-review

**Spec coverage:**

- AC1 — the screen shows the balance including what was just converted → Tasks 1, 2, 4, 5 (cases 1–3).
- AC2 — both spends offered → Tasks 4, 5 (cases 9–11).
- AC3 — leaving returns to the start-screen flow → Tasks 4, 5 (case 12), 7 (`onLeave={handleNewRun}`).
- AC4 — component tests query by accessible role and label → Task 5 Step 1, stated as a hard constraint on every query.
- In scope: new `VaultScreen` under `src/app/vault/` → Task 4. Ledger region → Task 4 step 2 item 4. Spend region → Task 4 step 2 item 5. Every non-happy state → Task 5 cases 4–8. `Open the Vault` control and `Start a new run` → Tasks 6, 7. Pure `creditedFromRun` and `vaultLabels` → Tasks 1, 2. Component tests by role and label → Task 5.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is a concrete code change or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `creditedFromRun`, `VaultCommit`, `VaultHandle.commit`, `VaultScreenProps`, `VAULT_LABEL`, `VAULT_TITLE`, `VAULT_EMPTY_TEXT`, `VAULT_LEAVE_LABEL`, `VAULT_READ_PROBLEM`, `VAULT_WRITE_PROBLEM`, `VAULT_REFUSAL_MESSAGE`, `VAULT_TIER_LABEL`, `vaultDepositText`, `vaultBalanceText`, `vaultDroppedText`, `boostLineText`, `grantLineText`, `oddsBoostAccessibleName`, `startingTierAccessibleName`, `currencyText`, and `RunPhase.Vault` are spelled identically in `plan.md` Part 2 → Data shapes and in every task that uses them. `onVault` is the prop name in Tasks 6 and 7 alike.

**Phase boundary cleanliness:**

- Phase 1 ends with two new pure modules and their specs; nothing imports them yet, so the app is unchanged and `tsc -b` is clean.
- Phase 2 ends with `commit` widened, not changed — both existing call sites still compile untouched, and the spec covers the new form.
- Phase 3 ends with `VaultScreen` and `vault.css` complete and fully specced but mounted by nothing; the running app is still exactly as it was.
- Phase 4 is the first behavioural change and completes the whole route in one phase — the label, the prop, its construction site, and the driver branch all land together, so there is no boundary at which `RunOutcomePanelProps` has a required prop nobody passes.
- Phase 5 changes no production code at all.
