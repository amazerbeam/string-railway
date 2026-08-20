Part of [Run verdict UI](README.md).

# The flask control — free, on the shop screen, and deliberately not a shop card

DLR-93 put a **drink** control on `ShopPanel.tsx` without putting the flask in the shop. The
distinction is the whole design of this surface: the flask is free and charge-limited, and AC6 forbids
a player mistaking "free, limited charges" for "paid, unlimited while you have coins". The engine half
is [the flask](../hunt/the-flask.md).

## Why the shop screen at all

The ticket named the placement as a genuine open question and the developer settled it at the planning
gate: **the shop screen, as a potion-icon button, not the verdict panel.**

The shop is the surface already reachable **only between fights**, which is exactly AC4's gate — so
the placement enforces the availability rule structurally rather than by adding a phase check.
`App.tsx` mounts `ShopPanel` from `RunPhase.Shop` and nothing else does. `RunOutcomePanel.tsx` and
`RunMap.tsx` were not touched.

**The flask is not a `ShopItem`, and could not be one cheaply.** `priceOf` and `categoryOf` are total
over `ShopItem`, so membership would demand a price it does not have and a persistence rung it does
not sit on — and it would render as a card on a shelf beside priced ones, which is the confusion AC6
exists to prevent.

## The zone, and why distinctness is structural rather than cosmetic

The `.shop-flask` block sits **beneath the health meter it acts on and above the four-shelf tablist**,
in its own `role="group"` labelled `SHOP_FLASK_GROUP_LABEL`. `Also for sale` — the block holding the
**priced** Heal — is below the ladder, as far from the flask as the screen allows.

Five differences, none of which is a colour:

| The paid Heal                   | The flask                                        |
| ------------------------------- | ------------------------------------------------ |
| Inside the shelf structure      | Its own zone, above the tablist                  |
| A text card (`.shop-item`)      | An icon-led button (`.shop-flask-btn`)           |
| Carries `.shop-item-price`      | Carries `.shop-flask-free` — `No coin`           |
| Refused reasons are `PurchaseRefusal` | Refused reasons are `FlaskRefusal`         |
| Restores a flat 4               | Restores a proportion of the maximum (6 today)   |
| Solid edge, like every priced surface | A **dashed** edge — form, not colour, so a greyscale screenshot still separates free from paid |

The purse row gains a **sixth cell**, `.shop-purse-cell.is-flask`, labelled `Free` with the charge
count as its value — so the reason a disabled button is disabled has a visible cause without hover,
which `game-ux` requires of any state a decision needs. It is the only purse cell whose *label* is not
the name of a thing owned, which is what makes "free" read at a glance beside five priced holdings.

## It computes nothing, exactly like the rest of the module

```ts
readonly flaskCharges: number
readonly flaskRefusal: FlaskRefusal | null
readonly onDrinkFlask: () => void
```

`flaskRefusal` is derived in `App.tsx` from `flaskRefusalFor(flaskStockFor(run))` — the same predicate
`drinkFlask` throws on — and handed down, never re-derived here. That is the discipline the five shop
items already follow, and it is what makes a greyed button and a thrown `RangeError` unable to
disagree.

The one thing the component *does* call is `flaskHealAmount(maxPlayerHealth)`, twice: once for the
blurb and once for the accessible name. That is the engine's own pure function rather than arithmetic
on the screen — no component multiplies by `FLASK_HEAL_PERCENT`, and no literal `6` or `0.6` appears
anywhere under `src/app/`.

## A refusal reads three ways, none of them colour

The same three-channel treatment the shop cards use:

- the button is natively `disabled` whenever `flaskRefusal !== null`;
- `FLASK_REFUSAL_MESSAGE[refusal]` prints beneath it in a `<p role="status">` that is always rendered
  and empty when there is nothing to say, so a screen reader announces the change rather than the
  arrival of a new element;
- `flaskAccessibleName(charges, healAmount, refusal)` folds the reason into the control's own
  `aria-label`, so a screen-reader user hears *why* on focus without hunting for the sentence.

`FLASK_REFUSAL_MESSAGE` is a `Record` **total over `FlaskRefusal`**, so a third reason code is a
compile error here rather than a blank sentence on screen — the guarantee `PURCHASE_REFUSAL_MESSAGE`
already gives purchases.

## The potion glyph

`FlaskMark.tsx` follows `HeartMark.tsx` exactly: a `FLASK_SYMBOL_ID` map so the id is written in two
places and only two, a `FlaskSymbolSheet` mounted **once** (by `ShopPanel`, beside `HeartSymbolSheet`),
`currentColor` on every path so CSS tints it, and `aria-hidden` on the glyph because the button around
it already carries the name.

**The silhouette is deliberately unlike the heart's**, not merely a different colour — a stoppered
flask with two bubbles — so the two never read as the same thing at a glance and neither depends on
colour vision. No path sets `stroke-width`: it is an inherited SVG property, so leaving it unset lets
CSS set the weight and have it reach the cloned content through the `<use>` shadow tree.

**Every `d` value is a placeholder** transcribed from the contract's `mockup.html`, marked as such in
the file, exactly as `HeartMark.tsx` marks its own. The developer's UX design supersedes it wholesale,
along with every CSS figure in the `.shop-flask*` block.

## Copy quotes no number, and the tap cost is one

`flaskBlurbText(healAmount)` and `flaskAccessibleName` both **interpolate the computed figure** rather
than quoting "6", so re-tuning `FLASK_HEAL_PERCENT` cannot leave the screen advertising a number the
engine no longer uses. `flaskChargesText` pluralises, so it reads sensibly at 0, at 1, and at any
deferred higher ceiling.

Drinking is **one tap** — the most this screen's least-repeated action should cost — with no arm step
and no confirmation, because the action is reversible in the only sense that matters here: it is
refused outright when it would do nothing (at full health), so there is no wasted-charge press to
confirm against. The button is not part of the tablist's roving tabindex; it is a plain tab stop, and
the screen's tab order is otherwise unchanged.

## Every new copy string is placeholder

`SHOP_FLASK_GROUP_LABEL`, `SHOP_FLASK_LABEL`, `SHOP_FLASK_FREE_TAG`, `SHOP_FLASK_NO_COIN`,
`flaskBlurbText`, `flaskChargesText` and both `FLASK_REFUSAL_MESSAGE` sentences are all the
developer's to rewrite — and **"Flask" itself is on `version-4-scope.md`'s open-names list**, beside
Envenom, Poison Guard and Whetstone.
