Part of [Run verdict UI](README.md).

# The shop screen — four shelves, four purchases, and a refusal you can read

`ShopPanel.tsx` (DLR-84, DLR-89) is the second full-viewport surface this module owns: the screen
reached from the verdict's `Shop` control, selling a Cheat into a free slot, an Envenom charge, a Poison
Guard or a heal, each priced from configuration. Since DLR-89 they sit in a **four-tab
persistence-length ladder** rather than a flat list — see [the tablist](#the-four-shelves--dlr-89).

It is a `RunOutcomePanel` clone in discipline as well as in CSS. It reuses `.run-shell` and
`.run-btn` from `run.css` unchanged and adds only `.shop-*` rules of its own.

## It computes nothing, and the refusals are the reason that matters

```ts
readonly refusals: Readonly<Record<ShopItem, PurchaseRefusal | null>>
```

Coins, health, the maximum, the slot counts, the opponent's name and the run's position all arrive
as props. So does the **refusal for each item** — derived in `App.tsx` from
`refusalFor(shopStockFor(run), item)`, which is the same predicate `buyFromShop` throws on.

**That is what makes a greyed button and a thrown `RangeError` unable to disagree.** A component
that re-derived "are the slots full" from a `cheats.length` it was handed would be a second reading
of a rule `src/hunt/cheats.ts` already owns, and the symptom would be an enabled button that throws.
The panel receives `cheatCount` and `cheatSlotCount` for **display only** — the "Cheat slots — 1 / 2"
readout in the purse row — and never tests them.

## The screen maps the catalogue rather than listing it

```tsx
const itemsOnShelf = SHOP_ITEMS_BY_CATEGORY[selectedCategory]
```

`src/hunt/shop.ts` states what the shop sells and which shelf each item sits on; this screen reads
those groupings and **groups nothing itself**. Since DLR-89 it no longer imports the flat `SHOP_ITEMS`
at all — only `SHOP_ITEMS_BY_CATEGORY` and `UNCATEGORISED_SHOP_ITEMS`, both already grouped — so a new
item appears on the right shelf with no edit here whatsoever. Each entry renders a
`<button class="shop-item">` carrying the item's name, its blurb and its price, followed by its own
`<p class="shop-refusal" role="status">`, built by a **`renderItem` helper shared by both call
sites** (the open shelf and Heal's block) so the two cannot drift apart. It is a nested function
rather than a `useCallback` — there is no profiling evidence for memoising it.

## The four shelves — DLR-89

**The ladder paid off at DLR-90, again at DLR-91, and a third time at DLR-92 — and this is the evidence.**
Envenom — the shop's
third item — appeared on the one-time-use shelf beside the Cheat with **no change to this module's item
rendering at all**: one `ShopItem` member, one `priceOf` case and one `categoryOf` case in
`src/hunt/shop.ts`, all inside the lint-enforced no-React boundary. **Poison Guard then filled the
previously empty fight-long shelf on exactly the same three lines**, so a shelf that had rendered
`SHOP_CATEGORY_EMPTY` started rendering an item with no branch edited here. **The Whetstone then did the
same to run-permanent**, the last openable shelf that was still empty. The only edit in any of the three
tickets was a purse cell. That was the property DLR-89 was built for, and it has now held three times.

**One consequence of the third payoff is worth stating, because it is a coverage change rather than a code
change.** `SHOP_CATEGORY_EMPTY`'s branch below is now **correct but unreachable by playing**: every shelf a
player can open holds an item, and the only empty rung is the refused game-permanent one, which cannot be
selected. DLR-92 repointed the component spec that used to reach that branch through the run-permanent tab —
it now asserts the Whetstone card renders there instead — and the branch itself was kept, because the next
shelf added will need it. The wording's own `shopLabels` spec still covers the string.

`ShopCategoryTabs.tsx` owns a `role="tablist"` over `SHOP_CATEGORIES`, and `ShopPanel` renders the
one `role="tabpanel"` for whichever shelf is open. **Only the selected panel is mounted**, per the
WAI-ARIA tabs pattern, rather than rendering four and hiding three.

The one piece of state this module holds anywhere:

```tsx
const [selectedCategory, setSelectedCategory] = useState<ShopCategory>(ShopCategory.OneTimeUse)
```

Presentation state, not run state — one transition, nobody else's business, and it deliberately does
**not** survive leaving the shop. One-time use is the default because it is first in
`SHOP_CATEGORIES` and the only rung holding an item today. Lifting it into `App.tsx` was considered
and rejected: `ShopPanelProps` did not change shape for this ticket at all.

`ShopCategoryTabs` **decides nothing**. It asks `isShopCategoryAvailable` whether a rung refuses
rather than naming `GamePermanent` itself, so the rule stays stated once in `src/hunt/`. A
final-verification grep guards this: the only mentions of that rung anywhere in the module are a doc
comment and `SHOP_CATEGORY_LABEL`'s key in `shopLabels.ts`, which is a copy table total over the union
rather than a branch. **No component compares a category against it.**

### The refused rung uses `aria-disabled`, not the native attribute

The ticket's AC4 said the game-permanent control should be `disabled`. It is `aria-disabled="true"`
instead, and that is the one place the contract knowingly departed from a criterion's literal word:

> **A native `disabled` button leaves both the tab order and arrow-key traversal.** The tab whose
> entire purpose is to say "a fourth rung is coming" would then never reach the keyboard user it is
> telling. `aria-disabled` keeps it focusable and announced while still refusing activation.

Everything AC4 actually asked for still holds — the tab cannot be activated (the click handler
guards on `isShopCategoryAvailable`), it renders dashed-and-dimmed, and its reason sits in a
`role="status"`. It was approved at the plan gate and is reversible in one attribute.

### One empty shelf is stated, not blank

Run-permanent holds nothing until its item ships, so the panel renders `SHOP_CATEGORY_EMPTY` —
"Nothing on this shelf yet." A blank panel is indistinguishable from a broken one, which is the whole
reason the sentence exists. **Fight-long was the other one until DLR-91**, and the branch needed no
change when it filled: emptiness is read off the shelf's derived contents, not declared anywhere.

### Heal sits outside the ladder

`UNCATEGORISED_SHOP_ITEMS` renders in its own `.shop-aside` block below the tabs, headed by
`SHOP_ASIDE_LABEL`, so it is present whichever shelf is open. An unlabelled second grid under a
tabbed one would read as part of the open shelf, which is why the heading is there rather than
optional.

### The ids that pair a tab to its panel live in `shopLabels.ts`

`shopTabId` and `shopPanelId` are both exported, because `ShopPanel` must name the same two ids on
its tabpanel that the tab names in its `aria-controls` — a second hand-written `shop-tab-${category}`
template at the call site would be a string-bound duplicate no compiler can check.

They sit in `shopLabels.ts` rather than in the component that uses them most, and that placement is
forced: `eslint-plugin-react-refresh`'s `only-export-components` rule forbids a component file
exporting a non-component value. This surfaced during implementation, not planning.

**`aria-controls` is set only on the selected tab.** Since just one panel is mounted, putting it on
all four would leave three tabs pointing at ids absent from the document — a dangling ARIA
reference. It is `undefined` on the rest, so React omits the attribute rather than emitting an empty
one.

## A refusal reads three ways, and none of them is colour

AC6 asks that the screen *say why* rather than fail silently. It says so three times over:

1. The control is **`disabled`**, so the purchase genuinely cannot be attempted.
2. Its `.shop-item` card is **dashed-edged as well as dimmed** — `game-ux` forbids a state that
   reads only in colour, so a greyscale screenshot still shows which card is refused.
3. The reason is a **visible sentence** in a `role="status"` region beneath the card, and it is also
   folded into the button's own `aria-label` via `shopItemAccessibleName`, so a screen-reader user
   hears why on focus without having to find the sentence beside it.

The sentences themselves are `PURCHASE_REFUSAL_MESSAGE`, a `Record` **total over `PurchaseRefusal`**
— a new reason code is a compile error in `shopLabels.ts` rather than a blank sentence on screen, which
is exactly how DLR-91's `GuardAlreadyActive` ("You are already holding a Poison Guard.") was enumerated.
`shopLabels.test.ts` iterates the union, so its coverage widened with no edit.

## The purse row states everything a purchase decision needs

**Five** labelled cells inside one `role="group"`: coins, Cheat slots as `held / total`, Envenom charges
held (DLR-90), the Poison Guard as **"Held" or "None"** (DLR-91), and — since DLR-92 — **Whetstones held**.
Above them, `nextOpponentText` names who is coming and which fight it is.

**Health is not one of them**, though it reads as part of the same block and reuses the same
`.shop-purse-label` / `.shop-purse-value` classes. It is a sibling `.shop-health` row carrying its own
`role="meter"` with `aria-valuenow`/`min`/`max`, because it is the figure a Heal is bought *against* and
takes the full width to be counted at a glance. Corrected 2026-08-19: this section previously counted it
inside the group and so reported one cell too many.

The Envenom cell is **a count with no denominator**, unlike the Cheat slots' `held / total`, and that
asymmetry is honest rather than an oversight: there is no cap on charges held, so there is no total to
show. The Guard's cell is a third shape again — **words, not a number** — because only one can be held
at a time, so a count would only ever read 0 or 1. Stating it in words also satisfies `game-ux`'s rule
that no state read only in colour: `SHOP_GUARD_HELD` / `SHOP_GUARD_NONE` are literal strings.

**The Whetstone cell takes the Envenom shape, not the Guard's**, and for the same reason Envenom did: it
stacks without a cap, so there is a count to show and no total to show it against. **No acceptance criterion
asked for this cell** — it was added because stacking is the item's whole point and `game-ux`'s floor puts
state a decision needs on the face of the screen: a player weighing a second copy needs to see they own one.
It is the row’s fifth cell, and `.shop-purse` is a `display: flex` with `gap` and no fixed column count, so
**`shop.css` needed no change for it** — the third item in a row to cost no CSS. Whether five cells still read
well at a glance is the developer's eye, not a test's.

**All three cells reuse the existing `.shop-purse-cell` / `.shop-purse-label` / `.shop-purse-value` classes,
so `shop.css` has needed no change for any of the three items** — and because none adds an interactive
control, the tablist's single tab stop and the screen's tab order are untouched. The cell exists because AC3
refuses a second purchase, and a refusal whose cause is invisible reads as a broken button.

The row was a single run-on sentence until the DLR-84 review; splitting it into three label+value
cells matched the approved mockup and reads better to a screen reader — one labelled group
enumerating three pairs, rather than one sentence to parse. The `purseText` helper it replaced was
removed rather than left exported and unread.

**The opponent's name is the real one since DLR-85, and the change needed no signature.** This
paragraph previously read "the name is 'The Monarch' on every fight, and that is correct today" — it was
not correct for long. `App.tsx` now feeds `nextOpponentName` from `RUN_ENCOUNTERS` rather than from
`quarryCharacterInfo(SLICE_QUARRY_CHARACTER)`, so the shop announces whoever is actually next. That was
a **defect fix**, not a copy change: the old expression printed "The Monarch" on every fight of the run.

`ShopPanelProps` is unchanged — `nextOpponentName: string | undefined` already existed and
`nextOpponentText` already handled the `undefined` case — which is the prediction this file made and the
one thing about it that held. **The leave button also names the opponent now**: `fightLabel(name)`,
falling back to `NEXT_FIGHT_LABEL` when no name is known.

## Copy quotes no number

Every price comes from `priceText`, which reads `priceOf`; the heal blurb interpolates
`HEAL_HEALTH_RESTORED`, and Envenom's interpolates **both** `ENVENOM_QUARRY_DAMAGE` and
`ENVENOM_PLAYER_DAMAGE` — it was one shared `ENVENOM_DAMAGE` until DLR-91 split the key, and rewriting
that blurb was the highest-risk line of the rename, because it is user-facing copy quoting a figure that
now differs by side. The Guard's blurb interpolates `ENVENOM_PLAYER_DAMAGE` too, since what it insures is
that specific hit. **No figure is quoted as a literal anywhere in this module**, so re-tuning a key
cannot leave the screen advertising a number the engine no longer uses. A grep in each contract's final
verification checks exactly this, and `shopLabels.test.ts` asserts each blurb contains
`String(<key>)` rather than the digit.

## Keyboard — one roving tablist, plain tab stops everywhere else

Until DLR-89 this screen had three plain tab stops and no roving tabindex, which sat comfortably
under `game-ux`'s threshold of about five siblings. The tablist changed that for the tabs alone.

**The four tabs are one tab stop with arrow keys inside it**, reusing `useRovingTabIndex` from
`src/app/warCouncil/` rather than re-implementing the mechanism. The threshold argument does not
decide this one: `game-ux`'s "more than about five" governs *when a loose collection must become one
widget*, and a `role="tablist"` already is one by definition. A widget that announces itself as tabs
and then ignores arrow keys is worse than four plain buttons.

**Activation is manual** — arrow keys and `Home`/`End` move focus, `Enter`/`Space`/click selects.
Chosen so arrowing onto the refused rung reaches and announces it without trying to select it;
selection-follows-focus would need a special case for exactly that tab.

**Which tab carries `tabIndex={0}` is derived from `selected`, not from the hook's own index.** The
hook only advances its internal index on a keypress, so a mouse click on a tab left the two
desynchronised: clicking "Fight-long" and then tabbing away and back returned focus to the
still-marked one-time-use tab. Deriving the tab stop from the controlled prop closes that; a
regression spec clicks a non-default tab and asserts it is the lone tab stop.

The item cards inside a panel keep **plain tab stops**. One card sits in a panel today, so a second
roving tabindex over cards would be speculative — but these shelves are expected to grow, so this is
a **named obligation on the follow-on item tickets** rather than a closed question: the first ticket
that pushes a shelf past roughly five cards owes the panel its own roving tabindex, and the panel is
already the right container to attach it to.

### The `Escape` trap that was designed around, not discovered

`useRovingTabIndex` calls `onCancel` on `Escape` **and does not stop propagation**, while
`ShopPanel`'s `.shop` container already handles `Escape` by calling `onLeave` — which is wired to
`advanceRun`. Passing `onLeave` through as `onCancel` would therefore have fired it **twice from one
keypress and silently skipped a fight**.

So `onCancel` is a documented no-op (`() => {}`) and `Escape` is left to bubble to the container that
already owns it. A regression spec dispatches `Escape` on the tablist itself and asserts `onLeave`
fires exactly once; live verification confirmed it advances one fight, not two.

There is still no effect, no listener and no timer anywhere on this screen — the keyboard handling is
an `onKeyDown` on elements React already owns, and the hook moves focus imperatively inside its own
handler rather than from an effect.

> **`Escape` leaves for the next fight, and that is an irreversible action.** `onLeave` is wired to
> the driver's `leaveForNextFight`, which calls `advanceRun` — so the shop's "back out" gesture and
> its "commit and move on" gesture are the same key, and a reflexive `Escape` permanently burns the
> between-fights moment. The DLR-84 defender flagged this and it is **the developer's call**, not a
> defect: the alternatives are returning to the verdict, or doing nothing.

## Layout

`shop.css` transcribes each contract's `mockup.html` — `.shop-title`, `.shop-next`, `.shop-purse` and
its cells, `.shop-grid`, `.shop-item`, `.shop-item-price`, `.shop-refusal`, `.shop-hint` (DLR-84),
plus `.shop-tabs`, `.shop-tab`, `.shop-panel`, `.shop-empty`, `.shop-aside` (DLR-89). Every
`clamp()` bound and every hue in it is a tuning value the developer owns, marked as such in the
file's header exactly as `run.css`'s is. `.shop-item` and `.shop-tab` both carry `min-height: 44px`,
`:focus-visible` outlines rather than bare `:focus`, and hover guarded by `@media (hover: hover)` and
paired with `:active`.

**Two states hang off the attribute that actually causes them**, so styling cannot drift from
behaviour: the refused purchase off `.shop-item:disabled`, and the refused tab off
`.shop-tab[aria-disabled='true']`. Both read in **form as well as tone** — a dashed edge and an absent
fill — because `game-ux` forbids a state that reads only in colour. The selected tab likewise gets a
brass edge and a lifted fill, not just a hue.

### Built for a long shelf, and the one region allowed to scroll

Every list on this screen is expected to grow, so DLR-89 replaced `.shop-grid`'s hard
`repeat(2, minmax(0, 1fr))` with `repeat(auto-fill, minmax(min(100%, 11rem), 1fr))` — item count
drives the column count, and a nine-item shelf packs instead of stretching two columns down the page.
That also made DLR-84's `max-width: 30rem` single-column media query redundant, so it was deleted:
`auto-fill` already collapses to one column. Heal's block gets the same grid, because "every list"
includes the one holding a single item today.

**`.shop-panel` is the one scoped scroll region on this screen** — `overflow-y: auto` with
`overscroll-behavior: contain`. `game-ux`'s hard floor is that the *page* never scrolls and any
genuinely scrolling region must be scoped and justified; the justification is that the catalogue is
unbounded while the viewport is not. Everything a purchase decision needs — the purse, health, the
tabs, the hint and the leave control — sits outside it and stays visible.

### The clipping defect, and why the fix is structural

DLR-89's added chrome (a tab row plus the coming-soon line) pushed the content stack taller than the
viewport, and `.run-shell` is `height: 100dvh; overflow: hidden` — so **the leave button and the hint
were silently clipped off the bottom of the screen** at every ordinary desktop height. The page does
not scroll, by design, so the primary way out of the shop was unreachable by mouse; only `Escape`
reached it, and `Escape` is not surfaced anywhere on screen.

Two failed attempts are worth recording, because both look correct:

- **Shaving spacing** closed most of the gap but not all of it, and left the layout one untested
  viewport height away from breaking again. Seven values were tightened and the button still clipped
  at 1024×768 and 1280×720.
- **`max-height: 100%` on `.shop`** was inert. `.run-shell` is a `place-items: center` grid, and that
  percentage never resolved — computed style reported the literal string `"100%"`, so `.shop` stayed
  content-sized and `.shop-panel`'s shrink capability had no deficit to absorb.

The fix that works gives `.shop` a **definite** cap that does not depend on the parent resolving
anything:

```css
.shop {
  max-height: calc(100dvh - 2 * clamp(1rem, 4vmin, 3rem)); /* mirrors .run-shell's padding */
}
.shop-panel {
  flex: 1 1 auto;
  min-height: 0; /* without this a flex child refuses to shrink below its content */
}
```

Every other child of `.shop` is `flex: 0 0 auto`, so the panel is the only thing that gives. `.shop`
keeps `height: auto`, so a roomy viewport still sizes from content and stays vertically centred —
verified unchanged at 1920×1080, where the cap goes slack (792px content under an 873px cap).

Measured live after the fix, leave-button bottom against viewport height: 624/650, 672/700, 737/768,
691/720, 768/800, 870/949 — **on screen at every size, with 24–79px to spare**, and still clear at
1024×600, below the range originally tested. The panel yields to as little as 63px at the tightest
sizes and scrolls; whether that reads as intentional rather than squeezed is the developer's eye, and
`.shop-panel`'s `max-height` and `.shop-grid`'s `minmax()` floor are the two tuning values that decide
it.

**Nothing a decision needs is behind hover** — the price and the refusal are both on the face of the
card, because the most repeated action here is one tap on a purchase and the reason it might fail
has to be readable before the tap.
