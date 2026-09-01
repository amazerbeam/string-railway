Part of [Run verdict UI](README.md).

# The shop screen — one purchase, a slot machine, and the cards you are carrying

`ShopPanel.tsx` (DLR-84, DLR-89, rebuilt DLR-116, **rebuilt again 2026-09-01**) is the second
full-viewport surface this module owns: the screen reached from the verdict's `Shop` control.

**DLR-116 pared it down to the bone and gave it a slot machine.** Its centre is the
[slot machine section](the-slot-machine-screen.md), where the run's real buff cards come from. The
four-tab persistence-length ladder DLR-89 built is **gone**; so are the Cheat, the Timebomb, the Blast
Guard and the Whetstone as purchases.

## The 2026-09-01 rebuild — read this before the sections below it

> **This work did not go through the `/fb-*` pipeline.** It has no Jira key and no contract folder;
> it was done conversationally and documented afterwards, which is why it is dated rather than keyed.
> Its mockup is `.claude/contract/2026-09-01-shop-slot-machine/mockup.html`, whose `mockup.css` is
> **generated** from the real stylesheets by the `build-mockup.py` beside it.

The screen was rebuilt against three pieces of developer feedback, quoted because each one names a
different failure: *"it feels like a huge amount of info"*, *"I can't tell what I have in my
inventory"*, and *"the overall style I don't like"*.

**Ten stacked blocks became three zones**, and `ShopPanel` now renders **its own `.shop-shell`**
rather than borrowing `.run-shell`:

| Zone | Holds | Replaces |
|---|---|---|
| `.shop-status` | coins, hearts and the health numeral, the coming opponent | the title, the next-up line, the purse group and the health meter — four blocks |
| `.shop-stage` | the machine, and nothing else | the machine wedged between the health row and the shelf |
| `.shop-tray` | [what you hold](the-held-cards-tray.md), what a coin buys, the leave control | the item list, the flask row, the hint line and `.run-actions` |

`.run-shell` was the wrong shell for this screen and had been all along: it is `place-items: center`
with `clamp(1rem, 4vmin, 3rem)` of padding, which is right for a verdict card floating mid-screen and
wrong for a screen whose status belongs **on** the top edge. `.shop-shell` is a three-row
`grid-template-rows: auto minmax(0, 1fr) auto`, so the tray is structurally incapable of being the
thing that gets clipped when the middle runs long — which is precisely what had been happening (see
*The clipping history* below).

Three sections of this page describe the pre-rebuild screen and are marked where they do.

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

`SHOP_ITEMS` was `[ApCapacity, Heal]` at DLR-116, `[SwanTier, WitchTier, Heal]` after DLR-122 and
DLR-145, `[Heal]` alone on 2026-09-01, and is **`[Heal, MaxHealth]` since DLR-158, 2026-09-02** —
the first addition since the shelf was pared to one item, but the union keeps all its members and `priceOf`,
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

Since DLR-116 it maps the flat `SHOP_ITEMS` again — no tabs, no tabpanel, no aside heading. Each
entry is built by the `renderItem` helper, a nested function rather than a `useCallback` — there is
no profiling evidence for memoising it.

**Since 2026-09-01 an entry is a tile, not a row, and it carries no blurb.** `renderItem` renders a
`<button class="shop-buy">` holding an item's **name and price and nothing else**, inside a
`.shop-buy-slot` wrapper that also holds the refusal. The forty-word blurbs went with the rank
ladders that printed them:

> **`ShopItem.SwanTier` and `ShopItem.WitchTier` are off the shelf (developer decision).** Their
> rules are not settled — *"I haven't figured that out yet"* — and each printed a forty-word blurb
> that was a large part of what the developer meant by *"a huge amount of info"*. They keep their
> `ShopItem` member, their `priceOf` row, their `categoryOf` rung and their `refusalFor` handling, on
> exactly the DLR-116 precedent this page already describes: **no mechanic was deleted, only a list
> row**, and restoring either is a one-line change in `shop.ts`.

A consequence worth stating: `SHOP_ITEMS_BY_CATEGORY` derives from `SHOP_ITEMS`, so with only `Heal`
on the shelf — and `Heal` deliberately sitting on no rung — **every persistence-length rung is now
empty**. `categoryOf` still answers for both tier items; `shop.test.ts` asserts that split
explicitly, so the difference between "categorised" and "offered" cannot silently collapse.

### The flask is a tile too

The flask is one more `.shop-buy` in the same row, carrying `.is-flask`. It keeps its own
`role="group"` with `SHOP_FLASK_GROUP_LABEL`, so it still reads as apart from the priced items to a
screen reader even though it now sits beside them. Free-versus-priced reads in **form** — a dashed
edge where every priced tile is solid — as well as in its label. Its price slot holds **two spans**,
not one interpolated string, so the charge count is findable as its own text rather than as a
fragment of `No coin · 0 charges`; `ShopPanel.test.ts` asserts exactly that and caught it when it
was one span.

### AP capacity, the one new purchase — off the shelf since DLR-145

> **`ShopItem.ApCapacity` is no longer in `SHOP_ITEMS`.** Everything below still describes live code
> — the price, the step, `RunState.apCapacityBonus`, `apCapacityFor`, `buyFromShop`'s branch and
> `RoundUiSeed.apCapacity` are all untouched and still tested — but **no screen sells it**, and with
> `AP_ENABLED` false the capacity it would buy has no spender. It is off the shelf on exactly the
> DLR-116 precedent this page already describes.


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

> **Since 2026-09-01 a refusal renders only when there IS one.** Every refusal paragraph used to be
> rendered unconditionally with an empty string inside it and a `min-height: 1em` holding a line open,
> so the screen reserved five blank lines to say nothing was wrong. `game-ux` forbids a panel that
> exists to report nothing, and those five reserved lines were a real part of the height overrun the
> clipping history below describes. The `min-height` is gone from `.shop-refusal` with them.

## The purse row states everything a purchase decision needs

> **Superseded 2026-09-01 by the status strip.** This section describes the pre-rebuild screen. The
> purse group, the `.shop-health` meter row and the `.shop-title` / `.shop-next` block are now one
> `.shop-status` row on the top edge — see *The status strip* below. Kept because the reasoning about
> what a purchase decision needs is unchanged and still governs what that row carries.

**Two** labelled cells inside one `role="group"` at DLR-116: **coins** and **action points**. The
Cheat-slots, Timebomb, Blast Guard, Whetstone and flask-charge cells went with the items they
described — the flask's count still shows on the flask row itself, so nothing was lost by dropping its
purse cell.

> **DLR-145 took the action-points cell out too, leaving the purse a single-cell group.** With
> `AP_ENABLED` false there is no pool to state; `SHOP_AP_LABEL` was deleted from `shopLabels.ts` and
> `ShopPanelProps.apCapacity` was removed with its supplier in `App.tsx`.
> `SHOP_ITEM_NAME[ShopItem.ApCapacity]` and `SHOP_ITEM_BLURB[ShopItem.ApCapacity]` **stay**, because
> both `Record`s are total over the whole `ShopItem` union. Health remains a sibling row rather than a
> purse cell, for the reason immediately below, so a one-cell "purse" beside a full-width health
> meter is the shape the screen now has. **Whether that reads as deliberate or as a hole is a
> look-at-it question and no browser pass has been run.**

**Health is not one of them**, though it reads as part of the same block and reuses the same
`.shop-purse-label` / `.shop-purse-value` classes. It is a sibling `.shop-health` row carrying its own
`role="meter"` with `aria-valuenow`/`min`/`max`, because it is the figure a Heal is bought _against_
and takes the full width to be counted at a glance.

Above the cells, `nextOpponentText` names who is coming and which fight it is. **The opponent's name
is the real one since DLR-85** — `App.tsx` feeds `nextOpponentName` from `RUN_ENCOUNTERS`, and the
leave button names it too via `fightLabel(name)`, falling back to `NEXT_FIGHT_LABEL`.

Cutting four cells was not free space for its own sake: it is what funds the slot section's vertical
budget on a short viewport. See the clipping history below.

## The status strip

One `<header class="shop-status">`, anchored to the top edge, carrying three things: the **coin
count**, the **health**, and **who is next**. `game-ux`'s rule is that status lives at the edges so
it never crowds the thing that matters, and four separate blocks saying what fits on one line was
the clearest instance of the information overload the developer named.

Two details are load-bearing rather than decorative:

- **The health numeral stayed.** The first cut of this strip showed hearts alone, and
  `ShopPanel.test.ts`'s *"carries the health reading on the meter, so the hearts never have to be
  counted"* failed — correctly. At ten points of maximum health a heart row is a thing to *count*,
  which `game-ux` warns against; the hearts give the shape at a glance and the fraction gives the
  exact figure. The `role="meter"` and its `aria-valuenow`/`min`/`max` moved onto this cell intact.
- **Hearts still differ in shape, not only in tone** — a filled heart and a cracked outline — so the
  row survives a greyscale screenshot, and `.shop-heart[data-state]` still hangs off the state that
  causes it.

The opponent's name sits at the far end with `margin-left: auto`, above the run position.
`nextOpponentText` is no longer used by this screen; the name and `progressText` are placed
separately so the name can carry the larger type.

## The second tile, and the price that moves

DLR-158 put a second buy tile on the shelf: the **max-health raise**, which adds
`MAX_HEALTH_PER_PURCHASE` to the run's ceiling and leaves the player at full health at the new top.
Its name (`Max health`) and blurb are **placeholder copy, the developer's to rewrite**, like every
string in this module.

**Its price is the first on this screen that moves.** It costs more with each copy already bought, so
the tile shows the price of the *next* purchase, and that figure has to change the moment a purchase
lands without leaving the shop. It needs no mechanism to do so:

- `App.tsx` derives `stock` from `run` on every render, and derives `prices={shopPricesFor(stock)}`
  from that — the sibling of `shopRefusalsFor(stock)`, built by iterating the `ShopItem` union.
- `ShopPanel` takes `prices` as a prop and prints `prices[item]`. It **computes nothing**, exactly as
  it computes no refusal.
- A buy changes `run`, which re-derives everything above it. No effect, no listener, nothing to clean
  up, nothing for StrictMode to double-fire.

`priceText` and `shopItemAccessibleName` were changed to take the **price** rather than the item, so
the copy layer no longer calls `priceOf` and therefore no longer needs the shop's rules — which is
what it would need, now that a price depends on the stock.

**Being at full health does not grey this tile**, unlike the Heal beside it: the engine's `refusalFor`
has no branch for it, so the only reason that can appear on it is not having the coins. See
[the max-health purchase](../hunt/the-max-health-purchase.md).

**Never seen on a real screen.** Whether two buy tiles plus the flask and the leave control still fit
the viewport and read clearly, and whether a price ticking up looks like a mechanic rather than a
glitch, are the developer's to judge.

## Copy quotes no number

Every price comes from `priceText`, which is handed a figure derived from `priceOf`; the heal blurb interpolates
`HEAL_HEALTH_RESTORED`; the AP-capacity blurb interpolates `AP_CAPACITY_STEP`; the slot surface's payout
table is built from `slotOutcomeOdds()` and its strip summary from `expectedCardsPerPull()`. **No figure is quoted as a
literal anywhere in this module**, so re-tuning a key cannot leave the screen advertising a number the
engine no longer uses. Each contract's final verification greps for exactly this, and the label specs
assert each blurb contains `String(<key>)` rather than the digit.

Blurbs for the four cut items are **kept** in `SHOP_ITEM_NAME` / `SHOP_ITEM_BLURB`, which stay total
over the union — the copy is not deleted because the mechanics are not.

## Keyboard

With the tablist gone, the purchasable rows, the flask and the leave control are **plain tab stops**
again, comfortably under `game-ux`'s threshold of about five siblings.

> **Since 2026-09-01 there is no roving-tabindex widget on this screen at all.** The machine chooser
> was the last one, and with a single machine on the roster the marquee is a nameplate rather than a
> control — see [the slot machine screen](the-slot-machine-screen.md). The whole screen is now a
> handful of plain tab stops: one buy tile, the flask, the lever, and the leave control. The held
> cards are deliberately **not** tab stops, because none of them can be activated between fights.

`Escape` is handled on `.shop-shell` and there only, calling `onLeave`. The DLR-89 note about
`useRovingTabIndex`'s `onCancel` firing `onLeave` twice from one keypress **no longer applies** — the
tablist that made it possible is gone, and the chooser that replaced it does not take an `onCancel`.
There is still no effect, no listener and no timer anywhere on this screen.

> **`Escape` leaves for the next fight, and that is an irreversible action.** `onLeave` is wired to
> the driver's `leaveForNextFight`, which calls `advanceRun` — so the shop's "back out" gesture and
> its "commit and move on" gesture are the same key, and a reflexive `Escape` permanently burns the
> between-fights moment. The DLR-84 defender flagged this and it remains **the developer's call**.

## Layout

The shop's CSS transcribes each contract's `mockup.html`. It ships as **six** sheets since
2026-09-01 — `shop.css` (the `.shop-shell` grid, the status strip, the stage, the tray and the leave
control), `shopItems.css` (the buy tiles and the refusal line), `shopFlask.css` (what is genuinely
the flask's own and not a buy tile's — now just its glyph hover), `shopSlot.css` (the machine's
section, its strip chips, its payout table and its result), `shopSlotCabinet.css` (the marquee, the
case, the payline and the lever) and `shopSlotReel.css` (the drums and the travel animation), plus
`shopHeld.css` imported by `ShopHeld.tsx` itself. `ShopPanel.tsx` imports the first four in that
order, which is the order the declarations sat in when they were one file, so the cascade is
unchanged.

> **`run.css` now `@import`s `warCouncil.css`, and that is a bug fix rather than tidying.** Every
> `--wc-*` token this module reads — every colour, every border, both font stacks — is declared in
> `warCouncil.css`'s `:root`, and **nothing on the run screens imported it**. The shop, the verdict
> and the map had their palette only because `WarCouncilRound` had mounted earlier in the session and
> left the stylesheet loaded, which is true in a real playthrough and false the moment a run screen
> renders without a fight in front of it — where every token resolved to nothing and the screen lost
> its entire appearance at once. Found by rendering `ShopPanel` in isolation. The bundler emits one
> copy however many modules ask for it. Every `clamp()` bound and every hue in
all four is a tuning value the developer owns, marked as such in each file's header. Every control
carries `min-height: 44px`, `:focus-visible` outlines rather than bare `:focus`, and hover guarded by
`@media (hover: hover)` and paired with `:active`.

**States hang off the attribute that actually causes them**, so styling cannot drift from behaviour:
the refused purchase off `.shop-buy:disabled`, a matched reel off its `data-matched`. Both
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

**DLR-116 changed both sides of that budget at once and nobody looked.** It removed four purse cells,
the tablist, the tabpanel and the aside heading, and added a slot section carrying a chooser, an odds
line, an eight-row strip, a pull control and a result group.

**On 2026-09-01 it was measured, and it had been broken the whole time.** At 1920×911 the shop's
content stood at **1010px inside an 838px box — 172px clipped**, and what was clipped was the bottom
of the screen: the flask row and the leave button, both entirely off-screen. A player at an ordinary
desktop height could not see the control that ends the visit.

The fix is structural rather than another shaved bound, and it is a **width** fix for a height
problem: `.shop-shell`'s three explicit rows put the tray outside anything that can overflow, and
the machine gets a stage of its own instead of a slot in a stack. `max-height: calc(100dvh - …)` on
`.shop` is gone with `.run-shell`.

Two scoped scroll regions survive, both bounded and both justified — `game-ux` forbids the **page**
scrolling, not one region owning its overflow:

- `.shop-held-cards` scrolls **horizontally** once the holdings outgrow the width. Horizontal
  deliberately: a second row of cards would push the machine off the top of the screen.
- `.shop-stage` gains `overflow-y: auto` **only under `@media (max-height: 34rem)`**, where a stack
  is the only thing that fits. The status strip and the leave button stay pinned outside it, so the
  control that ends the visit can never be the thing that scrolls away.

**Verified in a browser this time**, across ten viewport sizes — 1920×1080, 1920×700, 1440×900,
1280×800, 1024×768, 820×1180, 430×932, 430×700, 390×844 and 360×640. At every one: no page scroll on
either axis, nothing clipped, the cabinet inside its case, and the leave button on screen. jsdom
still has no layout engine, so **none of that is asserted by the suite** — it was measured in Chrome
against a harness mounting the real `ShopPanel`, and a future layout change needs re-measuring rather
than trusting a green test run.

**Nothing a decision needs is behind hover** — the price and the refusal are both on the face of the
tile, and the strip and the payouts are both on the face of the machine.

## A bought or won card flies to the tray — DLR-157

The shop holds the run layer's only two card movements, and both go through the same primitive the
felt uses: `useCardMotion.move`, documented in full at
[war-council-ui/card-motion.md](../war-council-ui/card-motion.md). Nothing here is a second
implementation of anything.

`ShopPanel` **mounts its own `MotionAnchorProvider`.** The shop and the round are different screens
and never share a registry — the round's diff driver would have nothing to say about a purchase
anyway. The provider has to sit *above* the component that consumes it (a component cannot resolve a
context it renders itself), so the exported `ShopPanel` is now a two-line wrapper and every prop it
takes is passed straight through to `ShopPanelContent`, which is where the screen actually lives.

**A purchase defers its own commit to the landing.** The click *is* the moment, so `handleBuy` flies
the offer tile to the tray and calls `onBuy(item)` in the landing callback — the same deferred-
dispatch shape the player's own played card uses. If either anchor cannot be resolved the request
lands instantly and the callback fires straight away, so **the purchase always reaches `RunState`,
animated or not.**

**A slot-machine win cannot defer anything**, and that is a real difference rather than an
oversight: `useShopSlot.pull` commits the awarded buff and the pull result together, synchronously,
so there is no "before the buff exists" moment left to hang a dispatch on. Instead the screen
watches `heldBuffs` for an id that is **both** new since the previous render **and** named in this
pull's own `awards` — the second clause is what stops a purchase firing the win animation.

Two `PlaceKind` members exist so these two origins are *named* rather than encoded: `ShopOffer`
(slotted by `ShopItem`, one per buy tile) and `SlotMachine`. An earlier revision reused `HeldTray`
with invented slot strings for both, which made "which place is `offer:Heal`" something a reader had
to decode. `ShopHeld` registers `HeldTray` on its outer `<section>` rather than on the `<ul>` inside
it, because the `<ul>` only renders once something is held — **the very first purchase of a run must
still have a destination to fly toward.**

Covered by `src/app/run/__tests__/ShopCardMotion.test.tsx`. Nothing about how either movement
*looks* is provable in jsdom.
