# DLR-158 — Shop sells a growing max-health increase

Plan: [`plan.md`](./plan.md)
Mockup (approved 2026-09-01): [`mockup.html`](./mockup.html)

## Summary

Maximum health used to be a module constant (`PLAYER_START_HEALTH`) threaded through four
defaulted parameters. It is now a field the run itself owns and carries (`RunState.maxPlayerHealth`),
alongside a new `maxHealthPurchases` count. `buyFromShop`, `drinkFlask`, `shopStockFor` and
`flaskStockFor` all lost the defaulted `maxPlayerHealth` parameter and read the run's own field
instead.

A second shelf item — `ShopItem.MaxHealth`, currently labelled `Max health` — sits beside Heal.
Buying it raises the run's health ceiling by a configured amount and refills the player to the new
top (so a player on 1 of 6 who buys it leaves on 8 of 8). Each copy stacks; there is no purchase cap.
Its price climbs **linearly** with the number of copies already bought this run
(`base + step × purchases`), which is the only thing that keeps buying it forever from being free —
`refusalFor` never refuses it for being at full health, only for insufficient coins.

The shop screen no longer computes any price itself: the driver derives every item's current price
via `shopPricesFor(stock)` and hands the whole map down as a `prices` prop, so `ShopPanel` and its
copy helpers (`priceText`, `shopItemAccessibleName`) just render a number they're given.

## Every decision the developer must make

- **The three placeholder tuning values**, all in `src/hunt/maxHealth.ts`, all marked
  `VALUE UNCHOSEN` in the source:
  - `MAX_HEALTH_PER_PURCHASE = 2` — health added to the ceiling per purchase.
  - `MAX_HEALTH_PRICE_BASE = 3` — what the first copy costs.
  - `MAX_HEALTH_PRICE_STEP = 2` — coins added to the price per copy already bought. At these values
    the ladder is 3 / 5 / 7 / 9 coins against a 10-coin encounter win.
- **Linear vs. multiplicative price growth.** The plan chose linear (`base + step × n`); the ticket
  only requires each copy cost more than the last. Swapping to a multiplier (`base × step^n`) is a
  one-expression edit to `maxHealthPriceFor` in `src/hunt/maxHealth.ts`.
- **The item's name and blurb.** Currently the placeholder `Max health` with a placeholder blurb in
  `src/app/run/shopLabels.ts` (the blurb itself isn't rendered on the shelf, but the map stays total
  over `ShopItem`, same as Cheat and Whetstone).

## Every behaviour the developer must judge by playing

- Whether the second buy tile reads clearly beside Heal, the flask, and the leave control at the
  game's usual window size. `mockup.html` is the layout reference; judge the actual running app.
- Whether the price ticking up after each purchase reads as a mechanic rather than a glitch.
- Whether the item, at its shipped 3/5/7/9 price ladder, displaces Heal (1 coin) outright, since it
  also heals to full as a side effect of raising the ceiling.

## Verification results (Phase 5)

- **Vitest, `--project node`:** `Test Files 149 passed (149)` / `Tests 1893 passed (1893)`.
- **Vitest, `--project dom`:** `Test Files 48 passed (48)` / `Tests 459 passed (459)` — no cold-start timeout.
- **`npm run typecheck`:** exit 0.
- **`npm run lint`:** exit 0.
- **`npm test` (unfiltered suite):** `Test Files 197 passed (197)` / `Tests 2352 passed (2352)`.
- **`npx prettier --check` (scoped to the contract's touched files):** exit 0 — "All matched files use Prettier code style!"
- **`npm run build`:** exit 0 — `dist/index.html`, `dist/assets/index-DuuHbfI3.css` (99.15 kB), `dist/assets/index-CxggKlH0.js` (368.75 kB), 223 modules transformed.
- **Line counts (`(Get-Content <path>).Count`), all under the 400-line blocking budget:**
  - `src/hunt/runTransitions.ts` — 369
  - `src/hunt/runCarry.ts` — 67
  - `src/hunt/maxHealth.ts` — 64
  - `src/hunt/shop.ts` — 281
  - `src/hunt/run.ts` — 307
  - `src/hunt/config.ts` — 382
  - `src/App.tsx` — 383
  - `src/app/run/ShopPanel.tsx` — 326
  - `src/app/run/shopLabels.ts` — 159
  - `src/app/run/shopPrices.ts` — 20
- **Pure-core boundary (`src/hunt`):** zero hits for `react`/DOM/storage references.
- **Storage-access grep (project-wide):** exactly the three known hits from
  `.claude/rules/save-data-versioning.md` (two in `src/persistence/browserStorage.ts`, one docblock
  mention in `src/persistence/saveStore.ts`). `SAVE_SCHEMA_VERSION` is unchanged at `1` — nothing
  about this ticket touches a persisted shape.
- **Tunable-literal grep:** the three `MAX_HEALTH_*` constants appear only in their own module, the
  barrel re-export, the interpolated shop blurb, and the two spec files that import them — no bare
  arithmetic on `2` or `3` elsewhere.
- **Stale-defaulted-parameter grep:** the pattern also caught 2 hits in
  `src/hunt/__tests__/run.shop.test.ts` — a test fixture and a `toEqual` assertion that legitimately
  set/read a run's `maxPlayerHealth` field against `PLAYER_START_HEALTH` (the run's own starting
  health), not a function-signature default. Not a defect; the four real defaulted-parameter forms
  were removed in Task 3.

## One line for future contributors

A shop price that depends on run state goes through `priceOf(item, stock)` and reaches the screen
via `shopPricesFor` — never by a component calling the shop's pricing rules directly.
