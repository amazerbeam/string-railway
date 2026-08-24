Part of [Run verdict UI](README.md).

# The shop screen — two purchases, a slot machine, and a refusal you can read

`ShopPanel.tsx` (DLR-84, DLR-89, **rebuilt DLR-116**) is the second full-viewport surface this module
owns: the screen reached from the verdict's `Shop` control.

**DLR-116 pared it down to the bone and gave it a slot machine.** The screen now sells exactly two
things — **Health** and **AP capacity** — plus the free flask, and its centre is the
[slot machine section](the-slot-machine-screen.md), where the run's real buff cards come from. The
four-tab persistence-length ladder DLR-89 built is **gone**; so are the Cheat, the Timebomb, the Blast
Guard and the Whetstone as purchases.

It remains a `RunOutcomePanel` clone in discipline as well as in CSS, reusing `.run-shell` and
`.run-btn` from `run.css` unchanged and adding only `.shop-*` rules of its own.

## What DLR-116 removed, and what it deliberately did not

`ShopCategoryTabs.tsx` and its spec were **deleted**, along with `SHOP_CATEGORY_LABEL`,
`SHOP_TABLIST_LABEL`, `SHOP_CATEGORY_COMING_SOON`, `SHOP_CATEGORY_EMPTY`,
`shopCategoryAccessibleName`, `shopTabId`, `shopPanelId`, `SHOP_ASIDE_LABEL` and the four purse
labels for the cut items. The `.shop-tabs` / `.shop-tab` rules went from `shop.css`, and
`.shop-panel` / `.shop-empty` / `.shop-aside` / `.shop-aside-label` from `shopItems.css` and
`shopFlask.css` once nothing rendered them. Their history is recoverable via `git show` per
`CLAUDE.md`; it is not reproduced here.

**The model survived the widget.** `src/hunt/shop.ts` still exports `ShopCategory`,
`SHOP_CATEGORIES`, `categoryOf`, `SHOP_ITEMS_BY_CATEGORY`, `UNCATEGORISED_SHOP_ITEMS` and
`isShopCategoryAvailable`, all still tested — a tab widget is not a mechanic, and the ladder is
expected back once there is a catalogue to put on it.

**The distinction this ticket introduced, and the one to hold onto:**

> `SHOP_ITEMS` is **what the shop offers**. The `ShopItem` union is **everything the game prices.**

`SHOP_ITEMS` is now `[ApCapacity, Heal]`, but the union keeps all six members and `priceOf`,
`categoryOf`, `refusalFor` and `buyFromShop` all stay **total** over it — so the Cheat, the Timebomb,
the Blast Guard and the Whetstone are still priced, still buyable by a caller, and still covered by
`shop.test.ts`. That totality *is* the ticket's third acceptance criterion, and it is asserted rather
than asserted-about: `shop.test.ts` iterates `Object.values(ShopItem)` and `shopLabels.test.ts` checks
every member still has a name. A consequence worth stating plainly: **until a later ticket re-offers
them, no screen sells those four**, and a player acquires that kind of effect only through the buff
pile.

## It computes nothing, and the refusals are the reason that matters

```ts
readonly refusals: Readonly<Record<ShopItem, PurchaseRefusal | null>>
```

Coins, health, the maximum, the AP capacity figure, the opponent's name, the run's position and the
whole `slot` prop all arrive as props. So does the **refusal for each item** — derived in `App.tsx`
from `refusalFor(shopStockFor(run), item)`, the same predicate `buyFromShop` throws on. **That is what
makes a greyed button and a thrown `RangeError` unable to disagree.** The record stays keyed over the
whole union rather than over `SHOP_ITEMS`, so adding an item back cannot silently produce an
`undefined` refusal.

`ShopPanel` also passes the entire `slot` object straight through to `SlotMachinePanel` without
reading a field of it — the same discipline one level down.

## The screen maps the catalogue rather than listing it

Since DLR-116 it maps the flat `SHOP_ITEMS` again — two items, one `.shop-list`, no tabs, no
tabpanel, no aside heading. Each entry renders a `<button class="shop-list-item">` carrying the
item's name, its blurb and its price, followed by its own `<p class="shop-refusal" role="status">`,
built by the `renderItem` helper. It is a nested function rather than a `useCallback` — there is no
profiling evidence for memoising it.

### AP capacity, the one new purchase

`ShopItem.ApCapacity` costs `AP_CAPACITY_PRICE` coins and adds `AP_CAPACITY_STEP` (**5**) action
points to the per-hand pool, for the rest of the run, stacking without a cap. `refusalFor` gained
**no** case for it — the only thing that can refuse it is the coin check, which is exactly what "fixed
and always-purchasable" means. Its blurb interpolates `AP_CAPACITY_STEP` rather than quoting `+5`.

`RunState.apCapacityBonus` is a **count of purchases**, not a point total; `apCapacityFor(bonus)` owns
the multiplication so the step size is stated once. `App.tsx` passes `apCapacityFor(run.apCapacityBonus)`
to both this screen (for its purse cell) and to `WarCouncilRound`, where it seeds the hand's pool
through `RoundUiSeed.apCapacity` — an **optional** seed field defaulting to `STARTING_AP`, so the
roughly thirty existing seed fixtures needed no edit.

> **`AP_CAPACITY_PRICE` is `3` and has never been played.** It is a documented placeholder, and it
> trades directly against the slot machine's 1-coin reroll — the developer's to move.

## A refusal reads three ways, and none of them is colour

AC6 of DLR-84 asked that the screen _say why_ rather than fail silently. It says so three times over:

1. The control is **`disabled`**, so the purchase genuinely cannot be attempted.
2. Its row is **dashed-edged as well as dimmed** — `game-ux` forbids a state that reads only in
   colour, so a greyscale screenshot still shows which row is refused.
3. The reason is a **visible sentence** in a `role="status"` region beneath the row, and it is also
   folded into the button's own `aria-label` via `shopItemAccessibleName`.

The sentences are `PURCHASE_REFUSAL_MESSAGE`, a `Record` **total over `PurchaseRefusal`** — a new
reason code is a compile error in `shopLabels.ts` rather than a blank sentence on screen.
`shopLabels.test.ts` iterates the union, so its coverage widens with no edit.

## The purse row states everything a purchase decision needs

**Two** labelled cells inside one `role="group"` since DLR-116: **coins** and **action points**. The
Cheat-slots, Timebomb, Blast Guard, Whetstone and flask-charge cells went with the items they
described — the flask's count still shows on the flask row itself, so nothing was lost by dropping its
purse cell.

**Health is not one of them**, though it reads as part of the same block and reuses the same
`.shop-purse-label` / `.shop-purse-value` classes. It is a sibling `.shop-health` row carrying its own
`role="meter"` with `aria-valuenow`/`min`/`max`, because it is the figure a Heal is bought _against_
and takes the full width to be counted at a glance.

Above the cells, `nextOpponentText` names who is coming and which fight it is. **The opponent's name
is the real one since DLR-85** — `App.tsx` feeds `nextOpponentName` from `RUN_ENCOUNTERS`, and the
leave button names it too via `fightLabel(name)`, falling back to `NEXT_FIGHT_LABEL`.

Cutting four cells was not free space for its own sake: it is what funds the slot section's vertical
budget on a short viewport. See the clipping history below.

## Copy quotes no number

Every price comes from `priceText`, which reads `priceOf`; the heal blurb interpolates
`HEAL_HEALTH_RESTORED`; the AP-capacity blurb interpolates `AP_CAPACITY_STEP`; the slot surface's odds
sentence is built from `slotOutcomeOdds()` and `expectedCardsPerPull()`. **No figure is quoted as a
literal anywhere in this module**, so re-tuning a key cannot leave the screen advertising a number the
engine no longer uses. Each contract's final verification greps for exactly this, and the label specs
assert each blurb contains `String(<key>)` rather than the digit.

Blurbs for the four cut items are **kept** in `SHOP_ITEM_NAME` / `SHOP_ITEM_BLURB`, which stay total
over the union — the copy is not deleted because the mechanics are not.

## Keyboard

With the tablist gone, the purchasable rows, the flask and the leave control are **plain tab stops**
again, comfortably under `game-ux`'s threshold of about five siblings. The one roving-tabindex widget
on this screen is now the slot machine's machine chooser — see
[the slot machine screen](the-slot-machine-screen.md).

`Escape` is handled on `.shop` and there only, calling `onLeave`. The DLR-89 note about
`useRovingTabIndex`'s `onCancel` firing `onLeave` twice from one keypress **no longer applies** — the
tablist that made it possible is gone, and the chooser that replaced it does not take an `onCancel`.
There is still no effect, no listener and no timer anywhere on this screen.

> **`Escape` leaves for the next fight, and that is an irreversible action.** `onLeave` is wired to
> the driver's `leaveForNextFight`, which calls `advanceRun` — so the shop's "back out" gesture and
> its "commit and move on" gesture are the same key, and a reflexive `Escape` permanently burns the
> between-fights moment. The DLR-84 defender flagged this and it remains **the developer's call**.

## Layout

The shop's CSS transcribes each contract's `mockup.html`. It ships as **four** sheets since DLR-116 —
`shop.css` (the shell, the title, the purse and health rows, the hint), `shopItems.css` (the item
rows, the refusal and hint copy), `shopFlask.css` (the flask block) and `shopSlot.css` (the whole
`.shop-slot-*` block). `ShopPanel.tsx` imports them in that order, which is the order the declarations
sat in when they were one file, so the cascade is unchanged. Every `clamp()` bound and every hue in
all four is a tuning value the developer owns, marked as such in each file's header. Every control
carries `min-height: 44px`, `:focus-visible` outlines rather than bare `:focus`, and hover guarded by
`@media (hover: hover)` and paired with `:active`.

**States hang off the attribute that actually causes them**, so styling cannot drift from behaviour:
the refused purchase off `.shop-list-item:disabled`, the chosen machine off its `aria-checked`. Both
read in **form as well as tone** — a dashed edge, an absent fill, a marker glyph — because `game-ux`
forbids a state that reads only in colour.

### The clipping history, and why it still matters

DLR-89's added chrome pushed the content stack taller than the viewport, and `.run-shell` is
`height: 100dvh; overflow: hidden` — so **the leave button and the hint were silently clipped off the
bottom** at every ordinary desktop height. Two failed attempts are worth recording, because both look
correct: shaving spacing closed most of the gap but not all of it, and `max-height: 100%` on `.shop`
was **inert**, because `.run-shell` is a `place-items: center` grid and that percentage never resolved.

The fix that works gives `.shop` a **definite** cap that does not depend on the parent resolving
anything:

```css
.shop {
  max-height: calc(100dvh - 2 * clamp(1rem, 4vmin, 3rem)); /* mirrors .run-shell's padding */
}
```

**DLR-116 changed both sides of that budget at once and nobody has looked.** It removed four purse
cells, the tablist, the tabpanel and the aside heading, and added a slot section carrying a chooser,
an odds line, an eight-row strip, a pull control and a result group. The strip is the one region given
its own `overflow-y: auto`, for the reason `.shop-panel` used to have it: eight rows against a bounded
height. **jsdom has no layout engine, so no test in this suite can settle whether the screen fits.**
The browser pass was not requested on DLR-116, so 1280×800, 1024×768, 1366×768 and 390×844 are all
**unverified** and sit on the developer's eyes-on list.

**Nothing a decision needs is behind hover** — the price and the refusal are both on the face of the
row, and the strip and the odds are both on the face of the machine.
