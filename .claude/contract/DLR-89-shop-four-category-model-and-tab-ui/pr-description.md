# DLR-89 — Shop rebuild: four-category model and tab UI

Spec: [`plan.md`](./plan.md)
Layout/interaction reference (approved at the plan gate): [`mockup.html`](./mockup.html)

## Summary

Replaces the shop's flat two-item list with version 4's persistence-length ladder:

- **`ShopCategory` domain model** (`src/hunt/shop.ts`) — a new `as const` map of four rungs (`OneTimeUse`, `FightLong`, `RunPermanent`, `GamePermanent`), `SHOP_CATEGORIES` fixing the render order, `categoryOf` (total over `ShopItem`), `SHOP_ITEMS_BY_CATEGORY` (total over `ShopCategory`, derived once at module load), `UNCATEGORISED_SHOP_ITEMS`, and `isShopCategoryAvailable`. Re-exported from `src/hunt/index.ts`.
- **Four-tab UI** — a new `ShopCategoryTabs` component (`role="tablist"`, one tab stop for the widget, arrow-key roving tabindex per `game-ux`) rewired into `ShopPanel`, which now holds the selected category as local presentation state and renders one `role="tabpanel"` for the open rung.
- **The refused game-permanent rung** — shown, not hidden, so the shape of the full ladder reads before every rung is filled. Carries `aria-disabled` (not native `disabled`) so it still reaches the keyboard user it exists to tell, with the reason ("Coming soon.") stated in the same `role="status"` convention a refused purchase already uses.
- **Heal re-homed outside the ladder** — an instant transfer has no duration, so `categoryOf(ShopItem.Heal)` returns `null` and it renders in its own `.shop-aside` block outside the tabs, present regardless of which shelf is open.
- **`.shop-grid` / `.shop-panel` rebuilt to take a long list** — `.shop-grid` switched from a fixed two-column layout to `repeat(auto-fill, minmax(min(100%, 11rem), 1fr))` so item count drives column count instead of stretching two columns down the page; `.shop-panel` is now the one scoped-scroll region on the screen (`max-height` + `overflow-y: auto`), keeping the purse, health, tabs, hint, and leave control outside any scroll area per `game-ux`'s no-page-scroll floor.

## Behaviour-preservation evidence

**All 11 pre-existing `ShopPanel.test.tsx` tests pass unedited.** They were run as a baseline before any `ShopPanel.tsx` change (Task 5, Step 1: 11 passed, 0 failed) and again after the full rewire alongside 6 new tab-integration tests (Task 5, Step 5: 17 passed — the original 11 plus the 6 added, none of the original 11 modified). This is the evidence that Cheat and Heal purchase behaviour, pricing, and refusal messaging are unchanged.

## Decisions the developer owns

Copied from `tasks.md`'s File map → "Developer decides or observes":

- **Placeholder copy** — `shopLabels.ts`'s four tab labels (`SHOP_CATEGORY_LABEL`), `SHOP_TABLIST_LABEL`, `SHOP_ASIDE_LABEL`, `SHOP_CATEGORY_COMING_SOON`, and `SHOP_CATEGORY_EMPTY` are all placeholder wording, exactly as the rest of the file's copy is declared. `version-4-scope`'s open questions already asks whether the coming-soon state needs copy beyond that one phrase.
- **Tuning values in `shop.css`** — `.shop-panel`'s `max-height` bound and `.shop-grid`'s `minmax()` floor. Together they decide how much of a long shelf is visible before it scrolls; a bound that shows one and a half cards reads as broken rather than scrollable. Placeholders ship (`.shop-panel`'s `max-height` is `clamp(6rem, 20vmin, 10rem)` as of the review fix pass below, was `clamp(8rem, 34vmin, 20rem)`; `.shop-grid`'s floor is `min(100%, 11rem)`, unchanged) — retune by eye. The review fix pass also tightened several other spacing values in this file purely to get the always-visible chrome to fit an ~800px-tall viewport (see "Fixes from review" below) — every one of them is still the developer's to retune further.
- **`aria-disabled` vs native `disabled` on the refused tab** — approved at the plan gate as `aria-disabled`; reversible in one attribute if you change your mind (`plan.md` → Risks, bullet 1).
- **Deferred per-card roving tabindex** — item cards inside a panel keep plain tab stops for now rather than getting their own roving-tabindex treatment; deferred to the first item ticket that pushes a shelf past roughly 5 cards (`plan.md` → Risks).
- **No-scroll viewport check** — QA checks that the screen still fits one viewport with no page scroll at named sizes now a tab row and a bordered panel have been added; whether it *feels* cramped, beyond that functional check, is the developer's judgement call.

## Verification (Phase 4, this pass)

- **Pure-core boundary** — `src/hunt/` recursively grepped for `from 'react'`, `window.`, `document.`, `localStorage`, `sessionStorage`: zero hits.
- **Single-source-of-truth greps** — `GamePermanent|SHOP_ITEMS\b` in `src/app/run/`: 6 hits reviewed, all benign (a doc comment explaining the component asks `isShopCategoryAvailable` rather than hardcoding the rung; one entry of the totality label map; and the legitimately distinct `UNCATEGORISED_SHOP_ITEMS` export, imported and used correctly). No component names the refused rung in logic or re-groups the catalogue itself. `useMemo|useCallback|\bmemo\(|console\.(log|debug)` in `src/app/run/`: zero hits.
- **Vitest per-project (cache warm-up)** — `--project node`: 32 files, 532 tests passed. `--project dom`: 19 files, 137 tests passed. Both green on the first attempt, no cold-cache timeout.
- **Typecheck** — `npm run typecheck` exits 0.
- **Lint** — `npm run lint` exits 0.
- **Full suite** — `npm test`: **`Test Files  51 passed (51)`, `Tests  669 passed (669)`.**
- **Formatting** — scoped `npx prettier --check` across the ten files this contract touched: two files (`shop.test.ts`, `ShopPanel.test.tsx`) needed `--write`; re-checked clean, and the two reformatted spec files were re-run (2 files, 43 tests, all passed) to confirm the reformat changed no behaviour.
- **Production build** — `npm run build` exits 0: `dist/index.html`, `dist/assets/index-C2nfGZ5g.css` (29.71 kB), `dist/assets/index-BpeFd4nP.js` (239.56 kB), built in 2.80s, no bundler errors.

## Fixes from review

A parallel Defender + QA review of the full contract found three issues, all fixed in one pass:

- **Roving tab-stop desync on click (Defender, Warning)** — `ShopCategoryTabs`'s `tabIndex={0}` was sourced from `useRovingTabIndex`'s own keyboard-tracked index, which a mouse click never updates. Clicking a tab moved `selected` and native DOM focus but left the *tab stop* on whichever tab was last reached by keyboard, so Tab-away-and-back landed on the wrong tab. Fixed by deriving each tab's `tabIndex` from `category === selected` directly, rather than from the hook's internal index; arrow-key movement is untouched, still running through the hook's own `groupRef`/`handleKeyDown`. Regression test added: click a non-default tab, then assert it — and only it — is the lone `tabIndex={0}`.
- **Dangling `aria-controls` on unselected tabs (Defender, Warning)** — all four tabs pointed `aria-controls` at an `id` that only exists for the one rendered tabpanel (this contract deliberately renders only the selected panel, never all four hidden). Fixed by setting `aria-controls` only on the selected tab; the other three omit the attribute. Regression test added.
- **Leave/continue button and its hint render off-screen (QA, functional failure)** — the shop screen's always-visible stack (purse, health, tabs, coming-soon line, panel, aside, hint, leave button) overflowed `.run-shell`'s fixed, non-scrolling `100dvh` box at every tested viewport height (700–949px); the leave button was fully below the fold and unreachable by mouse. Fixed by tightening several `clamp()`/spacing placeholders in `shop.css` — `.shop`'s row gap, `.shop-purse`/`.shop-health`'s vertical padding, the coming-soon line's font size and spacing, `.shop-panel`'s padding and `max-height`, `.shop-item`'s padding and internal gap, and `.shop-refusal`'s `min-height`. No layout approach changed — `.shop-panel` is still the only scoped-scroll region, `.run-shell` still does not scroll. All values remain developer-owned placeholders; see `shop.css`'s inline comments at each changed rule for the old value.

## Note for future contributors

`src/hunt/shop.ts` is where a new shop item is added — one `ShopItem` member, one `priceOf` case, one `categoryOf` case, and it appears in the right tab with no UI edit. That is the property the three follow-on item tickets (Envenom, Poison Guard, Whetstone) depend on.
