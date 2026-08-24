# DLR-118 — Vault end-of-run screen

Plan: [`plan.md`](./plan.md) (this folder)

## Summary

Adds the Vault's own full-viewport screen, reached from the terminal run verdict, showing what
this run's death paid into the Vault, what the Vault holds in total, and letting the player spend
that balance on DLR-113's two purchases — a permanent odds boost on one card template, and a
one-shot starting card at a chosen tier. Leaving it starts the next run.

`RunOutcomePanel` gains an `Open the Vault` control on the terminal verdict only (no control while
a run can still continue). `App.tsx` gains a `RunPhase.Vault` route, mounted only when the run has
ended, reachable only from the verdict panel. `useVault`'s `commit` was widened to accept a
`(prev) => next` functional updater, closing a defect where two purchases committed inside one
event handler would silently revert the first (the second write computed from a stale render
closure instead of the first write's result).

## Screen states (from `src/app/vault/vaultLabels.ts` and `src/app/vault/VaultScreen.tsx`)

- **First-ever run, empty Vault** — `handle.loadOutcome === Empty`, balance 0, no boosts, no
  grants. No `role="alert"` is rendered (`Empty` maps to `null` in `VAULT_READ_PROBLEM` — it is
  not a failure). The holdings list falls back to `VAULT_EMPTY_TEXT`. Every buy control is
  disabled because no template is selectable.
- **Lost run, coins converted** — the deposit line (`role="status"`) reads
  `vaultDepositText(RunOutcome.Lost, coins)`'s "paid in" branch, quoting the credited amount
  through `currencyText`.
- **Lost run below the exchange rate** — same status line, its "did not reach
  `VAULT_EXCHANGE_RATE` — nothing converted" branch, interpolating the configured rate rather than
  quoting a literal.
- **Winning run (nothing deposited)** — the deposit line reads the non-lost sentence ("A won run
  pays nothing into the Vault — a win is its own reward"), which is textually distinct from both
  lost-run sentences. This is the assertion that proves the loss-only rule renders correctly, not
  just computes correctly.
- **Save could not be read — corrupt** — `handle.loadOutcome === Corrupt`. A `role="alert"` states
  the saved Vault could not be read, was left on disk untouched, and this session starts from an
  empty Vault.
- **Save could not be read — version mismatch** — `handle.loadOutcome === VersionMismatch`. Same
  alert wording, naming the version mismatch instead of corruption; same left-on-disk-untouched /
  empty-session behaviour.
- **Storage unavailable** — `handle.loadOutcome === Unavailable`. Alert states the Vault works for
  this session but nothing will be remembered.
- **Entries dropped** — `handle.droppedCount > 0`. Alert renders `vaultDroppedText(droppedCount)`
  (singular/plural "entry"/"entries", "was"/"were").
- **Write rejected** — `handle.lastWriteOutcome === Rejected`. Alert states the purchase could not
  be saved and may not survive a reload.
- **Write unavailable** — `handle.lastWriteOutcome === Unavailable` (also covered by
  `VAULT_WRITE_PROBLEM`, distinct wording from the read-side `Unavailable` case). States the
  purchase will not be remembered after this session.
- **Spend refused — not enough currency** — the affected buy control is disabled and its accessible
  name carries `VAULT_REFUSAL_MESSAGE[VaultSpendRefusal.NotEnoughCurrency]`.
- **Spend refused — unknown template** — same idiom; also the structural fallback when the family
  list yields no template (empty case guarded before indexing, per Task 4's rule).
- **Spend refused — boost maxed** — a boost already at `VAULT_ODDS_BOOST_MAX_STACKS` disables its
  control and states `VAULT_REFUSAL_MESSAGE[VaultSpendRefusal.BoostMaxed]`.
- **Ordinary spend success** — buying an odds boost or a starting tier (per `BuffTier`) commits a
  functional updater to `handle.commit`, reducing the balance by the configured price and either
  incrementing the boost's stack or queuing a grant.
- **Family/card narrowing** — selecting a family repopulates the card `<select>`'s options from
  `templatesForFamily`; buy controls act on whichever template id is currently selected.
- **Leaving** — the `VAULT_LEAVE_LABEL` control, and `Escape` on the screen container, both call
  `onLeave` (wired to `handleNewRun` in `App.tsx`).

Multiple alert conditions can coexist; the component shows only the first, via
`readProblem ?? writeProblem ?? droppedText` — this is a rendering choice already fixed in code,
noted here for completeness rather than as an open question.

## Layered beside `RunOutcomePanel`, not replacing it

`VaultScreen` is a new, separate component reached by its own `RunPhase.Vault` route in
`App.tsx`. `RunOutcomePanel` is unmodified except for the added `onVault` prop and one new control
on its terminal-verdict branch; the panel itself, and every other branch of it, is untouched.

`VaultScreen` mounts inside `run.css`'s existing `.run-shell` and imports `run.css` directly; its
own `vault.css` covers only the screen's interior (no second `100dvh`/`100vh`/`100vw` grid). It
imports nothing from, and shares no class name with, `warCouncilHunt.css` — so DLR-119's three
unverified layout risks in that stylesheet cannot reach this screen.

## The loss-only deposit rule, and how it's proved

`creditedFromRun(outcome, coins)` in `src/app/vault/vaultRunCredit.ts` is a pure function with no
arithmetic of its own — on anything but `RunOutcome.Lost` it returns `0`; on a loss it delegates to
`depositLeftoverCoin(EMPTY_VAULT, coins).balance`, so the rate, the floor, and the
finite/negative guards stay stated exactly once, in `src/vault/`.

- `src/app/vault/__tests__/vaultRunCredit.test.ts` asserts the rule directly: a lost run credits
  `floor(coins / VAULT_EXCHANGE_RATE)`; a won run with the identical coin count credits `0`; an
  `InProgress` run credits `0`; and `0`/negative/non-finite coin counts credit `0`. Every expected
  figure is computed from `VAULT_EXCHANGE_RATE`, never written as a literal.
- `src/app/vault/__tests__/VaultScreen.test.tsx` asserts the winning-run deposit line directly on
  the rendered screen — the "won run pays nothing in" sentence renders, is textually distinct from
  the lost-run sentence, and contains no digit from what would have been credited.

## Decisions and behaviours the developer must judge

From `tasks.md`'s File map → "Developer decides or observes":

- **All copy on this screen is placeholder**, including the currency noun "mark" (
  `VAULT_CURRENCY_SINGULAR` / `VAULT_CURRENCY_PLURAL` in `vaultLabels.ts`). Every sentence is the
  developer's to reword.
- **Whether the Vault should be skippable.** It is one press from the terminal verdict; pressing
  `Start a new run` there never shows it. Judge in play whether it should instead be the verdict's
  only forward control.
- **Whether two-step narrowing (family, then card) reads as focused or as hiding the catalogue.**
  71 templates do not fit a no-scroll screen as one list; this is the cost.
- **Whether the screen fits without scrolling at 1280×800, 1024×768, 1366×768 and 390×844.** No
  browser pass ran on this contract, and jsdom has no layout engine, so nothing has verified it.
- **Every `clamp()` bound and hue in `vault.css`**, copied from `run.css`'s existing scale rather
  than chosen.

## Verification results (Phase 5, this pass)

- **Pure-core boundary grep** (`src/hunt`, `src/vault`, recursive, `from 'react'|window\.|document\.|localStorage|Math\.random`):
  11 hits, all inside doc comments citing the rule by name (e.g. "`src/hunt/` may not call
  `Math.random()`"); zero actual imports/usages of any banned symbol.
- **Banned vocabulary grep** (`src/app/vault`, `Envenom|poison`): zero hits.
- **Configured-figure grep** (`src/app/vault`, the four Vault tunables): hits in both
  `vaultLabels.ts` and `VaultScreen.tsx` (plus their specs) — the configuration is imported and
  interpolated, never restated as a literal.
- **`apCostOf` grep** (`src/app/vault`): one hit, `VaultScreen.tsx:71`, a docblock comment stating
  the component never calls `apCostOf`. Not a call — satisfies the check's intent.
- **Prettier `--write`**, scoped to this contract's paths: reformatted
  `src/app/vault/__tests__/VaultScreen.test.tsx` and `src/app/vault/vaultLabels.ts`; every other
  file already conformed.
- **Line counts, post-Prettier** (budget 400, blocking): `App.tsx` 365 (347 before this contract),
  `VaultScreen.tsx` 228, `vaultLabels.ts` 141, `vault.css` 126, `RunOutcomePanel.tsx` 198. All under
  budget.
- **`npm run typecheck`**: exit 0, no output.
- **`npm run lint`**: exit 0, no output (no rule suppressed).
- **`npx prettier --check`**, scoped to this contract's paths: "All matched files use Prettier code
  style!", exit 0.
- **Unfiltered `npm test` and `npm run build`**: **not run by the Implementer** — delegated to QA
  per the pipeline's standing rule that the full suite and the production build belong to QA alone.
  The task's stated baseline to check against is 1526 passed of 1526 across 117 files.

## Note for future contributors

`useVault.commit` now accepts either a `VaultState` value or a `(prev: VaultState) => VaultState`
updater; the updater form is the one to prefer, since it reads the hook's live committed vault
rather than a possibly-stale render closure and is the only form safe against two commits inside
one event handler.

## What a browser would have checked

No browser pass ran on this contract. Unverified surfaces:

- **The Vault screen itself**, across all its states listed above, in a real layout engine rather
  than jsdom's DOM-only rendering.
- **No-scroll fit** at 1280×800, 1024×768, 1366×768, and 390×844 — the four viewports the File map
  calls out. `vault.css`'s `clamp()` bounds and hues were copied from `run.css`'s scale, not
  verified against these sizes.
- **Interaction feel** — whether one press to reach the Vault (vs. it being the verdict's only
  forward control), and whether the two-step family→card narrowing, read well in the hand rather
  than only passing an accessible-name assertion.
- **Visual and copy judgement** generally — every sentence on the screen is placeholder text, and
  contrast/spacing/typography were never seen rendered.
