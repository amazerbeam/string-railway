Part of [War Council UI](README.md).

# Every card movement, and the one system that draws them

**DLR-157.** Before this ticket cards teleported everywhere except one place: DLR-156 had built a
real flight for the player's own played card (`useCardFlight.ts`) and nothing else moved visibly.
DLR-157 turned that single flight into the game's **only** way a card moves, and wired it to every
movement the game actually performs.

The ticket's first output was an inventory rather than code — every moment a card changes which
place it belongs to, read out of the source rather than assumed. It found **27** movements against
the ticket's 10-row seed list, and proved two seed rows factually wrong: there is no discard pile
(a discarded card goes to the **bottom of the draw pile**, and the component named `DiscardPile.tsx`
renders the *spent* pile), and `closeHand` runs at the end of a **hand**, not a trick. Nineteen of
the 27 are live and animate; four are non-movements (a Timebomb mark, an arming lift, the resolution
screen's *cloned* cards, the ledger plaque's own beat); four are unreachable in play and recorded as
such. The inventory itself lives in the contract folder
(`.claude/contract/DLR-157-every-card-movement-animates/card-movement-inventory.md`), which is where
the ticket asked for it.

## The shape: one primitive, two triggers, a registry between them

### The primitive — `useCardMotion.move(requests, onAllLanded)`

`useCardMotion.ts` is DLR-156's hook, renamed and generalised from `fly(from, to, onLanded)` to a
**list**. `useCardFlight` and the `CardFlight` interface no longer exist anywhere in `src/`.

Everything DLR-156 proved survives verbatim in `runRequest`: the source cloned into a fixed
`.wc-card-flyer` layer appended to `document.body`, above every `overflow: hidden` ancestor; the arc
that lifts clear before it travels, so the card reads as *placed* rather than dragged through its
neighbours; the real element left in the layout but hidden with `visibility`, so its slot keeps its
space; and — the part that exists because of a real defect — **the three-path landing race**, where
`animation.onfinish`, a `setTimeout` matched to the duration, and a `visibilitychange` handler all
reach one idempotent `land()`. `onfinish` alone is not safe: a background tab freezes Web Animations
at time 0, `onfinish` never fires, and everything waiting on it is dead for the rest of the session.

What DLR-157 added:

- **A per-request stagger.** Each request carries its own `delayMs` and starts on its own timer. A
  request whose `delayMs` is `0` starts synchronously, so a group of one is byte-for-byte the old
  behaviour.
- **A flip.** A request whose face changes animates a second `rotateY` keyframe set on the clone,
  timed by `--wc-flip-at` — a number, not a branch (see *The tokens* below).
- **A `prefers-reduced-motion` short circuit** that fires **before any clone is made**: no flyer, no
  timer, no hidden slot, `onAllLanded` called synchronously. A different code path rather than a
  one-millisecond duration, following `useSlotSpin.ts`'s precedent — a one-millisecond animation
  still creates a node, still hides a slot, and still depends on a callback firing.
- **A teardown that lands nothing.** `teardown()` closes the same `landed` idempotence guard that
  `land()` does, but **without** calling the landing callback. A stray `onfinish`, timer or
  `visibilitychange` firing after unmount therefore finds the guard already closed. The mount
  effect's cleanup tears every live flight down.
- **A flush.** A group still airborne when a second `move()` arrives has its `onAllLanded`
  **called exactly once** — right after its visuals are torn down — before the new group starts.
  This is not cosmetic: two sites defer a real state commit to that callback (a buff removal in
  `useBuffCardMotion.flyToGallery`, a purchase in `ShopPanel.handleBuy`), and both share one
  `useCardMotion()` instance with a second trigger that can supersede them mid-flight. Tearing down
  without flushing would silently drop the commit. Unmount still flushes nothing — there is nothing
  left to receive it.

**An unresolvable anchor is not an error and is not skipped.** If either end resolves to no element
— an off-screen place, a collapsed pile, or jsdom, where `Element.prototype.animate` is
feature-detected as absent — the request lands *instantly* and still counts toward `onAllLanded`. No
destination is ever left empty, animated or not.

### The registry — `MotionAnchors.tsx` + `motionAnchorContext.ts`

Six of the inventory's movements land in a slot **that does not exist until the state commits** (the
trick's refill, the deal's three destinations, the discard's inbound draw, the Woodcutter's drawn
card), so their caller cannot hand the primitive two live elements the way `handleTap` does. Instead
a movement names its source and destination *places* by key, and the primitive resolves both to
boxes at the moment it measures.

`anchorKeyFor(place)` folds a `PlaceId` into a string (`"playerHand:bells-7"`, or just `"drawPile"`
for a place that is one object). `MotionAnchorProvider` holds the key→element map in a `useRef` —
never module-level state, which would survive HMR and leak between tests in one file — and
`useMotionAnchor(place)` returns a ref callback that registers on a non-null element and unregisters
on `null`, so React's own unmount call is what releases it and nothing can leak a detached node.
`useMotionAnchors()` **throws** outside a provider rather than degrading quietly.

Two providers exist, one per screen and never shared: `WarCouncilRound.tsx` mounts one around the
whole round, and `ShopPanel.tsx` mounts its own. In both cases the provider has to sit *above* the
component that consumes it — a component cannot resolve a context it renders itself — which is why
`ShopPanel` is a two-line wrapper around `ShopPanelContent`, and why the diff driver runs inside a
`RoundMotionDriver` child rather than in `WarCouncilRound`'s own body.

The registry also carries **`arriving`** — real React state, not a ref, because components read it
to render. A card key in that set marks its slot `.wc-is-in-flight`, which is `visibility: hidden`
and nothing else. `HandFan`, `TrickWell` and `DecreePile` each read it.

> **`visibility`, never `display`.** `display: none` removes the box and reflows the row
> immediately — which is exactly the thing the ticket forbids under the player's pointer. A
> departing card's gap closes **after** it lands, and an arriving card's slot fills after it lands,
> never during either.

The registry exists to replace a `document.querySelector('.wc-trick-row')`, the one string-bound
DOM coupling the pre-DLR-157 flight had. Nineteen of those would be nineteen couplings outside the
compiler's view — the maintenance trap `.claude/workflow/web-project.md` names explicitly.

Two files rather than one, for one enforced reason: `react-refresh/only-export-components` (a real
`npm run lint` gate) forbids a `.tsx` exporting both a component and non-components.
`MotionAnchors.tsx` is the provider and nothing else; the context, the key form, the types and the
two hooks are in `motionAnchorContext.ts`.

### The two pure modules — where the real invariants live

Neither imports React nor touches the DOM (grep-verified), so both are tested by plain
function-in/value-out assertions in the cheap `node` Vitest project. They live under `src/app/`
rather than `src/warCouncil/` **because they know about places on a screen, which the engine must
not** — the pure-core lint boundary is untouched in both directions.

**`cardPlacement.ts`** — where every card is.

- `PlaceKind` — the closed set of places, as the `as const` object-map form (`erasableSyntaxOnly` is
  on, so never an enum): `PlayerHand`, `QuarryHand`, `TrickWell`, `DrawPile`, `SpentPile`,
  `DecreePlate`, `AbilityPrompt`, `BuffGallery`, `RidingStrip`, `HeldTray`, and — added in review —
  `ShopOffer` and `SlotMachine`, so the shop's two origins are *named* rather than encoded as
  invented slots of the held tray.
- `PlaceId` — `{ kind, slot? }`. `slot` narrows a multi-slot place to one of its slots (a hand
  card's own `cardKey`, a gallery card's buff id) and is absent for a place that is one object.
- `placementsOf(state)` — a `RoundState` mapped to `ReadonlyMap<cardKey, PlaceId>`, **total** over
  the deck: every card appears exactly once, across the draw pile, the spent pile, both hands, the
  current trick and the decree. That totality is the invariant the spec pins.
- `diffPlacements(prev, next)` — every card whose place differs, in `next`'s own iteration order. A
  card absent from either map yields no movement: there is no place to fly from, or none to fly to.
- `faceAt(place)` — `DrawPile`, `SpentPile` and `QuarryHand` are face **down**; every other place is
  up. A movement flips exactly when these differ at its two ends.

**`cardMotionPlan.ts`** — turning a diff into a schedule. `planMovements(movements, staggerMs)`
assigns delays `0, s, 2s, …`; sets `flip` from `faceAt(from) !== faceAt(to)`; sets `hide` from
`faceAt(to) === 'down' ? 'from' : 'to'` (a departure into an unaddressable pile has no per-card
element at the far end to reveal, so the source hides; every face-up place renders one real element
per card, so it is the arrival's element that hides while its clone travels toward it); and
collapses a group to a single representative flight above `PILE_COLLAPSE_THRESHOLD`.

> **The collapse condition is load-bearing, and an earlier version of it was wrong.** A group
> collapses **only when it is a genuine pile-to-pile move** — when *no* movement in the group
> carries a distinguishing `to.slot`. An earlier version collapsed on raw count alone, which
> silently made the six-card deal not animate at all: the collapsed request named
> `{ kind: PlayerHand }` with no slot, no anchor was ever registered under that key, and the whole
> group took the unresolvable-anchor path and landed instantly.

`PILE_COLLAPSE_THRESHOLD` is `3`, and it is a **placeholder the developer sets by playing**. Above
it, the reshuffle (20–26 cards) and the end-of-hand sweep (up to 13) fly one card back rather than
*n* — thirteen simultaneous flights is the tempo failure the ticket's own risk section predicts.

### The two triggers

**Diff-driven, post-commit — `useCardMotionDriver.ts`.** Mounted once, in `WarCouncilRound`'s
`RoundMotionDriver` child. It watches `ui.round` across renders, diffs the placements, plans the
schedule and runs it. Fourteen movements fall out of this one wiring — the Quarry's play, the trick
closing, the refill, all three destinations of the deal, the reshuffle, both halves of the discard
swap, the Fox exchange, both halves of the Woodcutter, and the end-of-hand sweep — including the
CPU-driven ones no UI event handler ever sees.

The previous placement lives in a `useRef`, updated **immediately** on every effect run rather than
in the landing callback, so a second `round` change mid-flight diffs against the truth rather than a
stale map. It is `null` on the first run and that case returns before computing anything: a fresh
mount must emit **no** movements rather than flying the whole deck in from nowhere. Under
StrictMode's double mount the second invocation finds the ref already holding the placements it just
wrote, with `round` unchanged, so the diff is empty — no special-casing beyond the ref itself.

**Caller-driven, pre-commit — three sites, the same primitive.** Where a handler knows the exact
moment and wants to defer its state commit until the card visibly arrives, the diff is the wrong
shape: it would resolve the trick *before* the card landed.

- `useTableCardMotion.ts` — the player's own played card. DLR-156's behaviour unchanged, lifted out
  of `WarCouncilTable.tsx` (which sat at exactly 400 lines) with its two `querySelector`s replaced
  by anchors.
- `useBuffCardMotion.ts` — a buff going up to the riding strip and coming back. A buff is not a card
  in `RoundState`, so `cardPlacement.ts` never sees it; both directions are `flip: false` and
  `hide: 'to'`, applied by hand for the same reading `planMovements` would give.
- `ShopPanel.tsx` — a purchase, which defers `onBuy` to the landing; and a slot-machine win, which
  cannot defer anything (`useShopSlot.pull` commits the buff and the pull result together,
  synchronously) and so watches `heldBuffs` for an id that is both new since the previous render and
  named in this pull's own awards.

The alternative — wiring each movement at its own commit site — is the "ten implementations" the
ticket forbids: nineteen places that each have to remember the stagger, the flip, the reduced-motion
branch and the landing race, and nineteen places for one of them to be forgotten. It also cannot
express the trick close and the refill draw, which are two movements in opposite directions
committed in a single reducer step. Having the *engine* emit movement descriptors was rejected for
the pure-core boundary: `src/warCouncil/` must not learn about presentation.

## The tokens — one block, every value a placeholder

`warCouncilMotion.css`'s single `:root` block is the only place any card movement's duration,
distance or easing is stated. `cardMotionConfig.ts` is its only reader, reading each property live
off the computed style so the stylesheet stays the source of truth rather than a duplicated
TypeScript literal.

| Token | Placeholder | What it is |
|---|---|---|
| `--wc-flight` | `380ms` | one card's travel time — **moved** here from `warCouncilResolve.css`, value unchanged |
| `--wc-flight-stagger` | `70ms` | the one stagger between requests in a group |
| `--wc-flight-lift` | `34px` | the arc's peak lift — was a bare `-34` literal |
| `--wc-flight-tilt` | `4deg` | the mid-flight rotation — was a bare `-4deg` literal |
| `--wc-flight-ease` | `cubic-bezier(0.3, 0.75, 0.25, 1)` | was a bare string literal |
| `--wc-flip-at` | `0.5` | the fraction of the flight the flip lands on: `0.5` turns the card in mid-air, `1` turns it as it lands |

**Every one of these is unchosen.** They are transcribed or invented placeholders, and the developer
sets them by playing — the whole design exists so pacing is a token pass rather than a rewrite.
`--wc-flip-at` in particular is the ticket's own in-transit-versus-on-landing question, shipped as a
single number in the same block as everything else rather than as a branch, so it is recorded once
and applies to every movement whose face changes.

Reading is guarded rather than trusted, because jsdom computes no custom properties at all and a
`NaN` or zero duration would leave a Web Animations animation never finishing: every duration and
distance goes through `Number.isFinite && > 0` before use, falling back to a documented literal;
the stagger uses `>= 0`, since zero (every request at once, deliberately) is a legitimate setting;
and `--wc-flip-at` is clamped into `[0, 1]` regardless of what the stylesheet holds.

Moving the flyer rule and `--wc-flight` into this new sheet also relieved `warCouncil.css`, which
was at **405** lines and already over the project's 400-line budget before this ticket started; it
is 393 now. `WarCouncilTable.tsx` went from exactly 400 to 399 for the same reason, by way of
`useTableCardMotion.ts`.

## One change to `BuffCard`

`BuffCard.tsx` accepts `ref` as a plain React 19 prop and puts it on its own root element — the
`<button>` in the common case, the `.wc-stack` wrapper when the card is stacked. Registering the
anchor on a wrapper `<div>` instead would have inserted an element between the gallery's CSS grid
and its item, which is the layout trap the gallery's own doc records.

## What a browser would have to judge

Nothing about the motion is provable in Vitest: jsdom has no layout engine, so "the card arrives at
the well", "no gap closes mid-flight" and "nothing reflows" are browser questions with right
answers. What the specs *do* assert is the end state (reached whether or not the animation ran), the
reduced-motion path reaching it synchronously, and the differ's and planner's arithmetic —
`cardPlacement.test.ts`, `cardPlacementMovements.test.ts`, `cardMotionPlan.test.ts`,
`cardMotionConfig.test.ts`, `MotionAnchors.test.tsx`, `useCardMotion.test.tsx`,
`useCardMotionDriver.test.tsx` and `src/app/run/__tests__/ShopCardMotion.test.tsx`.
