Part of [Run verdict UI](README.md).

# The held-cards tray — "what you hold"

`ShopHeld.tsx`, `HeldBuffCard.tsx` and `heldBuffs.ts` (2026-09-01) are the shop's answer to a gap the
screen had carried since it existed: **the player could see their coins and their health and had no
way at all to see what cards they were carrying.** The developer named it directly — _"I can't tell
what I have in my inventory"_ — and it was not a display bug but an omission: nothing on the shop
screen had ever read `RunState.buffs`.

`App.tsx` passes `run.buffs` straight through as `ShopPanelProps.heldBuffs`; `ShopPanel` passes it to
`ShopHeld` without reading a field of it, the same discipline it applies to the `slot` prop.

## It shows the cards, not their names

The tray renders each pile as the **same metallic card the felt uses** — `.wc-buffcard` and its tier
and suit classes, styled by `warCouncilBuffCard.css`, which `HeldBuffCard.tsx` imports directly.

That is the whole point, and the alternative was tried and rejected on the project's own standing
guidance: **a list of buff names carries no intuition**, because the names are agent-authored. A
reader who sees `Moon-Feeder (Momentum)` in a list has been told nothing; a reader who sees the card
they will be looking at during the fight has been told what they hold. Showing the object in the form
it will be met in is the answer to "what do I have", and a list of its labels merely restates the
question.

The pile count rides on the card as `×N` when it is more than one, using `.wc-buffcard-count` — the
same mark the gallery uses.

## It is a readout, and it is not a button

`HeldBuffCard` renders a **`<span>`**, and this is the reason it exists at all rather than reusing
`BuffCard.tsx`:

> Nothing on this screen can activate a buff. Buffs are activated **during a hand**, against action
> points and a cadence; between fights there is no trick to activate one for. A card rendered as a
> `<button>` would be an affordance that lies.

`ShopHeld.test.tsx` asserts `queryAllByRole('button')` is empty for exactly that reason. The tray's
cards are also **not tab stops**, which is what keeps a growing hand of cards from flooding the
keyboard path of a screen whose real controls number about four — `game-ux`'s threshold of roughly
five siblings would otherwise be blown by the inventory alone.

Each card carries its full description on its own `aria-label` —
`` `${buffName(buff)} — ${buffConditionSentence(buff)}` ``, plus `, N held` on a pile — because the
tray has no hover and no tap, so there is nowhere else for that wording to live. It goes through
`buffLabels.ts`, the one grammar for describing a buff, never a second phrasing.

## `heldBuffs.ts` — grouping, and why it is not `buildBuffGallery`

```ts
heldBuffStacks(buffs: readonly Buff[]): readonly HeldBuffStack[]   // { buff, count }
heldBuffCount(buffs: readonly Buff[]): number
```

The obvious move was to reuse `buildBuffGallery` from `buffGalleryModel.ts`, and it is the wrong one.
That model answers an **in-fight** question — which stacks can be activated right now, and which are
fenced off — and it demands a `refusalFor` predicate to answer it. Between fights nothing can be
activated at all, so every stack would come back carrying the same fabricated answer, and the
runs-and-fence split it produces has nothing to say on this screen. `heldBuffs.ts` is the read-only
half: group, count, order.

What it **does** reuse is `buffStackKey`, imported rather than restated. That matters more than it
looks: it is what guarantees two cards that stack on the felt stack in the shop, and it means there
is exactly one rule in the codebase for what "the same card" means.

The order is **tier descending, then `buffStackKey` ascending** — a total order, so the same holdings
always draw the same tray regardless of the order they were won in. Best cards first, because the
tray is scanned rather than read. The function is pure and never mutates its input, both asserted.

`heldBuffCount` counts **copies, not piles**, so two Bell-Takers read as two cards in the heading
while occupying one card in the row.

## Nothing renders to say nothing is held

An empty hand renders one sentence — `SHOP_HELD_EMPTY`, _"Nothing yet — pull the machine."_ — and the
count in the heading renders **not at all**, rather than as `0 cards`. `game-ux` forbids a readout
that exists to report nothing, and the empty state points at the thing to do about it, because an
empty tray with no words reads as a broken tray rather than an empty one.

## The zero-width trap

`.wc-buffcard` takes its width from being a **grid item** in the buff gallery. Dropped into the
tray's flex row it collapses to a **0px dot** — cards with a defined aspect ratio, a full face, and
no width to hang it on. `shopHeld.css` states `width: var(--wc-buffcard-w)` explicitly for that
reason.

This is the same defect the buff-gallery mockup shipped once before ("cards with width but no
height"), and it is worth knowing about before reusing `.wc-buffcard` anywhere a third time: **the
class does not carry its own size.**
