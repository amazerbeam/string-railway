# DLR-84 — Earn coins and buy a Cheat card or a heal between fights

Plan: [`plan.md`](./plan.md)
Mockup (approved 2026-08-16): [`mockup.html`](./mockup.html)

## Summary

The run now has a one-decision economy. Beating an opponent pays **1 coin** (`COINS_PER_ENCOUNTER_WIN`),
credited at the single moment `recordEncounter` resolves a won encounter — nowhere else. The balance
starts at 0, carries untouched across every fight boundary, and is visible in two places at once: a
`.wc-coins` plate on the felt during the fight that is earning it, and the shop's purse row between
fights.

After a won fight the verdict offers **two** forward controls instead of one — `Continue`, straight to
the next fight, and `Shop`, into a new full-viewport screen. The shop sells exactly two things, each
priced from configuration and each refusable with a stated reason on the face of its own card rather
than a silent no-op: a **Cheat** into a free slot, or a **Heal** that restores 4 health immediately and
clamps to the player's maximum. Because the shop is opt-in, `Continue` is guarded — pressed while the
player still holds a coin that could buy something (`canBuyAnything`), it swaps in a warning
(`Continue anyway` / `Visit the shop`) rather than silently walking past a purchase. Leaving the shop
starts the next fight with every purchase already in effect.

One convention runs through the engine and the screen alike: **`refusalFor` is the single statement of
whether a purchase is available**, read by `buyFromShop` (which throws if it's ever called anyway),
by the button that greys out, and by the warning that decides whether to fire — never re-derived at a
call site. See the note at the bottom.

### Review fix pass (this change)

Three reviewers found issues against the initial implementation; all are now resolved:

- **Wired up the cheat-slots readout.** `ShopPanel`'s purse row was mocked up with three cells —
  Coins, Health, Cheat slots — but the code only rendered two, leaving `cheatCount`/`cheatSlotCount`
  props, `SHOP_SLOTS_LABEL`, and the `.shop-purse-value` CSS class all unused. The mockup's screen B
  purse row clearly shows the third cell (`id="purse-slots"`, "1 / 2"), so the fix was to build it
  rather than delete the props — the purse row now renders all three cells from the mockup, each a
  `.shop-purse-label` + `.shop-purse-value` pair. The now-superseded `purseText` helper (a single
  sentence combining just coins and health) and its test were removed rather than left dangling
  alongside the new per-cell layout. The genuinely dead `.shop-log` CSS rule — no element in any
  reading of the screen renders it — was deleted.
- **Fixed a double-click race that could throw an uncaught `RangeError`.** `App.tsx`'s `handleBuy`
  called `buyFromShop` unconditionally on every click; a second click landing before React committed
  the first purchase's `disabled` state (a rapid double-click, or fast repeated key-activation, on the
  last affordable purchase) could reach `buyFromShop`'s deliberate throw with no error boundary in the
  app — a white screen. Fixed by re-deriving `refusalFor` **inside** the functional `setRun` updater
  and no-op'ing rather than calling `buyFromShop` when the item is already refused against whichever
  run that call actually sees. The throw itself is untouched — it still fires from a genuine driver
  bug, just not from this one.
- **Fixed formatting.** `npx prettier --write` on the four files QA flagged; `--check` now exits 0.

## Developer decisions needed (playing or judgement, not code)

Copied in full from `tasks.md`'s File map, plus one added by this fix pass:

- **Copy** — `SHOP_TITLE`, `SHOP_ITEM_NAME`, `SHOP_ITEM_BLURB`, the three `PURCHASE_REFUSAL_MESSAGE`
  sentences, `CONTINUE_LABEL`, `SHOP_LABEL`, `VISIT_SHOP_LABEL`, `CONTINUE_ANYWAY_LABEL`,
  `unspentCoinsText`, `COINS_PLATE_LABEL`. All placeholder, marked as such in the files.
- **Every `clamp()` bound and every hue** in `src/app/run/shop.css` and the new `.wc-coins` block.
  Transcribed from `mockup.html`; yours to retune.
- **Whether the warning is a safety net or a nag.** It fires on every visit where anything is
  affordable, which with a 1-coin payout and 1-coin prices is every unspent visit. A threshold or
  removing it is one line in `App.tsx`'s `handleContinue`.
- **Whether `Escape` should dismiss the warning or mean "continue anyway".** Built as dismiss.
- **Whether `Escape` inside the shop should dismiss back to the verdict or mean "continue anyway"
  (i.e. commit and advance).** Currently `Escape` anywhere in the shop calls `onLeave`, which is
  `leaveForNextFight` — an irreversible `advanceRun`. Flagged by the defender during review as the
  same class of call as the warning's `Escape` question above; left exactly as built, per instruction.
- **Whether 4 health per fight is the right answer** to DLR-82's predicted fight-three wall.
  `QUARRY_ENCOUNTER_HEALTH` is deliberately not retuned here.
- **The ticket's own pricing watch:** if you buy Heal on every single visit, the Cheat is mispriced,
  not uninteresting. `CHEAT_PRICE` and `HEAL_PRICE` are separate keys so the fix is one line.
- **Whether the `Continue` / `Shop` pair reads at a glance**, and whether the two purchase cards, the
  new cheat-slots readout, and their refusal sentences are legible. QA confirms they render and
  commit; feel is yours.

## Verification (Phase 5, actual figures)

- `npm test` → **581 passed across 46 files, 0 failed** (QA, before this fix pass; re-scoped runs after
  the fix pass — `ShopPanel.test.tsx` + `shopLabels.test.ts`: 16 passed; adding `RunOutcomePanel.test.tsx`:
  27 passed — all green, no regressions).
- `npm run typecheck` → exit 0 (`tsc -b`, re-run after the fix pass).
- `npm run lint` → exit 0 (`eslint .`, re-run after the fix pass).
- `npm run build` → exit 0, `dist/` written, no bundler errors (QA).
- Phase 5 Task 11 grep (purity boundary, `src/hunt/**`) → zero hits (QA).
- Phase 5 Task 12 grep (no hardcoded shop tunable) → clean, every hit an import/export/interpolation
  (QA).
- `npx prettier --check` on the four QA-flagged files (`src/app/run/ShopPanel.tsx`,
  `src/app/run/__tests__/ShopPanel.test.tsx`, `src/app/run/__tests__/shopLabels.test.ts`,
  `src/app/run/__tests__/RunOutcomePanel.test.tsx`) → **re-run after `--write`: exit 0,
  "All matched files use Prettier code style!"**
- File sizes after the fix pass: `App.tsx` 202 lines, `ShopPanel.tsx` 133 lines, `shopLabels.ts` 56
  lines, `shop.css` 148 lines — all well under the 400-line budget. `warCouncil.css` was not touched
  by this fix pass and stays at its existing 400-line ceiling.

Unverified by the Implementer, as always: how the screen looks and feels in a running browser (the
cheat-slots readout's placement, the warning's legibility, whether `Continue`/`Shop` reads at a glance)
— that is QA's live-browser pass and the developer's judgement, not something a component test or a
static gate can show.

## Note for future contributors

One exported predicate, `refusalFor`, is read by the transition that throws (`buyFromShop`), the
button that greys (`ShopPanel`'s `disabled`), and the warning that fires (`canBuyAnything` /
`handleContinue`) — and, as of this fix pass, by the driver's own double-click guard inside
`handleBuy`. Never re-derive the refusal rule at a new call site; read `refusalFor` (or
`canBuyAnything`, which is `some()` over it) instead.
