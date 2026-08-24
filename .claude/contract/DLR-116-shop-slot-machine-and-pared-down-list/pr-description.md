# PR: Shop screen — slot machine and pared-down purchasable list (DLR-116)

Plan: [`.claude/contract/DLR-116-shop-slot-machine-and-pared-down-list/plan.md`](./plan.md)

## Summary

The shop screen is where a player now first pulls a reel. `RunState` gained a `runSeed`
(chosen once, by `App.tsx`, the only `Math.random()` in the seed path) plus
`apCapacityBonus` and `slotPullsThisVisit`. A new pure module, `src/hunt/slotOdds.ts`,
derives the three outcome probabilities and the expected cards per pull from
`REEL_COUNT`/`REEL_POOL_SIZE` rather than quoting them, so a retuned pool size cannot
leave the screen reading a stale percentage. A new transition, `pullSlotMachine`, charges
`pullPriceFor`, mints the pull's awards straight onto `RunState.buffs`, and throws on an
unaffordable pull exactly as `buyFromShop`/`drinkFlask` already do.

On screen: `SlotMachinePanel` (machine chooser with roving-tabindex radios, the face-up
8-symbol strip, the posted odds line, a one-tap pull control, and the last pull's outcome
and awards) is mounted inside a rewritten `ShopPanel`. The purchasable list is pared to
exactly two fixed items — Health and a new `ShopItem.ApCapacity` (`+AP_CAPACITY_STEP` = 5
action points per purchase, stacking) — and the four-rung category tablist
(`ShopCategoryTabs`) is deleted along with its spec. Every other priced item (Cheat,
Timebomb, Blast Guard, Whetstone) is off this screen's shelf but its price, category,
refusal and purchase path are untouched and still tested — `ShopItem`, `priceOf`,
`categoryOf` and `buyFromShop` all stay total over the full six-member union.

A won card from a pull goes straight to the buff pile with no choose-one gate, because
DLR-112's expected 2.64 cards per pull is a per-pull yield that only holds if every award
lands.

## Convention this ticket introduces

**`SHOP_ITEMS` is now "what the shop offers"; `ShopItem` remains "everything the game
prices."** A future re-offering of Cheat/Timebomb/Blast Guard/Whetstone is an
`SHOP_ITEMS` change alone — no switch, refusal rule or price needs to move.

## Decisions the developer must make

- **`AP_CAPACITY_PRICE`** ships at a documented placeholder of `3` coins in
  `src/hunt/config.ts`, never played. It trades the shop's only non-slot coin sink
  against the machine's 1-coin reroll: priced too low it dominates, too high AP capacity
  is decorative. Settle it by playing one run to fight 3, counting pulls forgone to buy it.
- **The odds line's information density** — `slotOddsText()` in `src/app/run/slotLabels.ts`
  renders four figures (three outcome probabilities plus expected cards per pull) in one
  sentence. Whether that reads as clarity or clutter is a copy/visual call; the fallback is
  to drop the expected-cards figure.
- **Whether one tap to pull, with no confirm step, feels right** for the screen's most
  repeated action — only judgeable by playing.
- **Whether the pared shop plus the slot section fits without scrolling or cropping** at
  1280×800, 1024×768, 1366×768 and 390×844. `src/app/run/shop.css` carries a documented
  history of vertical clipping at nine rows; this ticket removed four purse cells, the
  tablist, the tabpanel and the aside heading while adding an eight-row strip. jsdom has no
  layout engine, so no test in this suite can settle this — see "What a browser would have
  checked" below.
- **`Miser` tension** — `Miser` rewards unspent coins, and this screen is now the game's
  strongest coin sink (an uncapped 1-coin reroll). Reported as a design tension under
  `hybrid-design.md` §9, not fixed here.

## Verification results (QA, full implementation, this pass)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0, zero errors |
| `npm run lint` | exit 0, zero errors, zero warnings; zero `eslint-disable` anywhere in `src/` |
| `npm test` (unfiltered) | **116 files, 1502 passed**, 0 failed (baseline before this ticket: 1474 passed / 112 files; delta reflects `ShopCategoryTabs.test.tsx`'s ~115 lines of deleted cases plus the new slot/AP-capacity/pared-shop specs) |
| `npx prettier --check` (16 changed files) | exit 0, all matched files already Prettier-clean |
| `npm run build` | exit 0, `dist/` written (134 modules, ~284.5 kB JS / ~40.5 kB CSS), no bundler errors |
| `Math.random()` in `src/hunt`, `src/vault` | zero live calls — every hit is a comment stating the tree must stay free of it |
| React/DOM globals in `src/hunt`, `src/vault` | zero hits |
| A strip or symbol array assigned onto `RunState` | zero hits — only `pullSlotMachine`'s `SlotPull` parameter and its `pull.awards` read appear in `run.ts`/`runTransitions.ts` |
| Odds percentages / `+5 action` as literals outside the label test | zero — the one extra hit (`runTransitions.ts`'s doc comment quoting "2.64 cards per pull") is design-rationale prose, not UI copy; judged not a defect |
| Deleted tab names (`ShopCategoryTabs`, `SHOP_CATEGORY_LABEL`, etc.) | zero live references — remaining hits are historical prose in comments explaining what was deleted |
| File sizes (10 changed files, measured with `(Get-Content).Count` after `npm run format`) | all ≤ 400 lines — largest is `runTransitions.ts` at 350 and `App.tsx` at 347 |

## Component test query style (AC4)

Every new and rewritten assertion for this ticket's own surface (the machine chooser, the
pull control, the refusal states, the pared purchasable list, the empty-collection guard)
queries by accessible role and label — `getByRole`/`getAllByRole`/`queryAllByRole` with
`name`, never a class selector or `data-testid`.

One pre-existing gap, not introduced by this ticket: `ShopPanel.test.tsx` carries three
`container.querySelector('.shop-next' | '.shop-heart' | '.shop')` uses against the health
meter/hearts row (explicitly unchanged by this ticket) and the root `Escape` handler.
These predate DLR-116 (confirmed against the pre-ticket file at `f45d66e`) and are outside
this ticket's own AC1–AC3 surface; flagged here rather than silently carried forward
unremarked.

## What a browser would have checked (not run this pass — opt-in, not requested)

No server was started; no page was navigated. A developer's eyes-on pass on the shop
screen (`npm run dev`, reach it from a won encounter's verdict) should check:

- **Layout, at all four viewports (1280×800, 1024×768, 1366×768, 390×844):** the purse
  (coins + AP cells), the health meter/hearts row, the full slot section (machine chooser,
  8-symbol strip, odds line, pull control, last-pull result), the two-item purchasable
  list, the flask row and the leave button all fit without page scroll or cropping. This
  is the specific risk `shop.css`'s documented clipping history and this ticket's freed/
  added vertical space make worth checking first.
- **CSS custom properties in `shopSlot.css` resolving** rather than silently falling back
  to an inherited value — a renamed property referenced from a stylesheet nobody updated
  would compile, lint and pass every test while rendering the wrong sizing/colour.
- **A clean console** on load, after choosing a machine, after a pull, and after a second
  navigation to the shop (remount safety for `useShopSlot`'s two `useState` values).
- **The machine chooser's roving tabindex and radio semantics** by keyboard — arrow keys
  moving and selecting, wrapping at the ends, `Home`/`End` — and that the selected state
  reads without colour alone.
- **A real pull**, at least once per machine: the first pull of a visit is free, the second
  costs `SLOT_REROLL_PRICE`, the three spun symbols and the awarded cards read correctly at
  their tiers, and the awarded cards appear on the felt's buff pile in the next hand.
- **The odds line's actual wording** against the strip shown, for the copy/clutter
  judgement above.

Run seeding uses `Math.random()` in `App.tsx` (per plan, no fixed seed for a manual check),
so a manual pass will see a different strip/spin each time — that is expected, not a
determinism defect (the automated specs cover determinism with fixed seeds).
