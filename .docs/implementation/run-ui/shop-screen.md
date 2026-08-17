Part of [Run verdict UI](README.md).

# The shop screen — two purchases, and a refusal you can read

`ShopPanel.tsx` (DLR-84) is the second full-viewport surface this module owns: the screen reached
from the verdict's `Shop` control, selling a Cheat into a free slot or a heal, each priced from
configuration.

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
{SHOP_ITEMS.map((item) => { … })}
```

`SHOP_ITEMS` is `src/hunt/shop.ts`'s single statement of what the shop sells, so a third item would
appear on this screen without the component being edited. Each entry renders a `<button
class="shop-item">` carrying the item's name, its blurb and its price, followed by its own
`<p class="shop-refusal" role="status">`.

## A refusal reads three ways, and none of them is colour

AC6 asks that the screen *say why* rather than fail silently. It says so three times over:

1. The control is **`disabled`**, so the purchase genuinely cannot be attempted.
2. Its `.shop-item` card is **dashed-edged as well as dimmed** — `game-ux` forbids a state that
   reads only in colour, so a greyscale screenshot still shows which card is refused.
3. The reason is a **visible sentence** in a `role="status"` region beneath the card, and it is also
   folded into the button's own `aria-label` via `shopItemAccessibleName`, so a screen-reader user
   hears why on focus without having to find the sentence beside it.

The sentences themselves are `PURCHASE_REFUSAL_MESSAGE`, a `Record` **total over `PurchaseRefusal`**
— a fourth reason code would be a compile error in `shopLabels.ts` rather than a blank sentence on
screen.

## The purse row states everything a purchase decision needs

Three labelled cells inside one `role="group"`: coins, health as `current / maximum`, and Cheat slots
as `held / total`. Above them, `nextOpponentText` names who is coming and which fight it is.

The row was a single run-on sentence until the DLR-84 review; splitting it into three label+value
cells matched the approved mockup and reads better to a screen reader — one labelled group
enumerating three pairs, rather than one sentence to parse. The `purseText` helper it replaced was
removed rather than left exported and unread.

**The opponent's name is "The Monarch" on every fight, and that is correct today.**
`QUARRY_CHARACTERS` holds one entry and `SLICE_QUARRY_CHARACTER` is fixed for the run.
`nextOpponentText` already handles an `undefined` name, so DLR-85's roster needs no signature change
here — only the copy.

## Copy quotes no number

Every price comes from `priceText`, which reads `priceOf`; the heal blurb interpolates
`HEAL_HEALTH_RESTORED`. **No figure is quoted as a literal anywhere in this module**, so re-tuning a
key cannot leave the screen advertising a number the engine no longer uses. A grep in the contract's
final verification checks exactly this, and `shopLabels.test.ts` asserts the heal blurb contains
`String(HEAL_HEALTH_RESTORED)` rather than the digit `4`.

## Keyboard, and why there is no roving tabindex

Three tab stops — buy Cheat, buy Heal, leave — sit well under `game-ux`'s roving-tabindex threshold
of about five, so they are **plain tab stops** with an `Escape` handler on the container, matching
`CheatSlots`'s own keyboard contract. There is no effect, no listener and no timer; the `Escape`
handler is an `onKeyDown` on the element React already owns.

> **`Escape` leaves for the next fight, and that is an irreversible action.** `onLeave` is wired to
> the driver's `leaveForNextFight`, which calls `advanceRun` — so the shop's "back out" gesture and
> its "commit and move on" gesture are the same key, and a reflexive `Escape` permanently burns the
> between-fights moment. The DLR-84 defender flagged this and it is **the developer's call**, not a
> defect: the alternatives are returning to the verdict, or doing nothing.

## Layout

`shop.css` transcribes the contract's `mockup.html` screen B verbatim — `.shop-title`, `.shop-next`,
`.shop-purse` and its cells, `.shop-grid`, `.shop-item`, `.shop-item-price`, `.shop-refusal`,
`.shop-hint`. The refused state hangs off **`.shop-item:disabled`** rather than a state class, so it
cannot drift from the `disabled` attribute the refusal actually sets. Every
`clamp()` bound and every hue in it is a tuning value the developer owns, marked as such in the
file's header exactly as `run.css`'s is. `.shop-item` carries `min-height: 44px`, `:focus-visible`
outlines rather than bare `:focus`, and hover guarded by `@media (hover: hover)` and paired with
`:active`.

**Nothing a decision needs is behind hover** — the price and the refusal are both on the face of the
card, because the most repeated action here is one tap on a purchase and the reason it might fail
has to be readable before the tap.
