Part of [War Council UI](README.md).

# Card faces, the printed geometry, and the ability tooltip

**DLR-149.** Before this ticket a card face was a rank numeral and a suit glyph. A player could not
tell by looking whether a card in their hand carried a rule, so they re-checked the rules on every
trick. This work replaces the single face with **three face classes**, moves every printed
rectangle's position into a **pure module that a unit test can assert against**, and adds a
**tooltip** carrying the card's rule — while printing no rule text on any face.

## The three face classes

`RANK_FACE` in `cardFace.ts` is the one place a rank's face is decided. It is total over `RANKS`
(1–11) and gives each rank a `faceClass`, a printed `name` or `null`, and a `figure` or `null`.

| Class   | Ranks                                            | Printed                                                                            |
| ------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `Act`   | 1 Swan, 3 Fox, 5 Woodcutter, 9 Witch, 11 Monarch | a painting in the fixed art window, a **solid heavy** border, the printed name     |
| `Inert` | 7 Treasure                                       | a painting too — but a **dashed** border and a printed "no rule" mark              |
| `Plain` | 2, 4, 6, **8**, 10                               | a printed pip lattice, the default border, and the **mirrored bottom-right** index |

The Treasure **was** the only `Inert` rank, and it was the card the ticket existed for: the one face
that looked special and did nothing. Its figure differs by suit — harp (Bells), chalice (Keys),
sword (Moons) — so `RankFace.figure` is either one `FigureKey` or a `Record<Suit, FigureKey>`,
resolved in `CardFacePanel.tsx` by `typeof face.figure === 'string'`.

> **DLR-163 gave the 7 a rule, so it is an acting face now.** `NO_RULE_MARK_LABEL` ("no rule") is
> still exported and `printedRects` still pushes it for an `Inert` face — but **nothing in
> `RANK_FACE` is `Inert` today**, so the mark is applied to nothing at all. It stays for a future
> inert rank.

### Rank 8 is deliberately a _plain_ rank, not an inert one

Rank 8 is **Poison** (`CardRank.Poison`), and it has no effect at all — mechanically the same nothing
the Treasure used to do. An early reference sheet gave it a dashed border, a "no rule" chip and a
printed corner label. **This code deliberately does not**, and a future reader must not "fix" it:

- AC2 named **only** the Treasure as dashed-plus-mark.
- AC3's stated reason for rank 8 keeping pips is that it _has no settled name_ — explicitly **"not
  because it is inert"**. The 8's name is under an open question.
- Giving 8 a dashed border while 6 gets none tells the player 8 is special. That is precisely the
  defect the ticket opens with.

So rank 8 gets `faceClass: Plain`, `name: null`, pips, and the mirrored index, and its tooltip prints
the plain-number sentence. A spec pins it: `cardFace.test.ts` → "gives rank 8 the plain face, with no
name and no mark".

### `hasAbility` is gone; "named" and "acts" are now two predicates

`PlayingCard.tsx` used to derive everything from `hasAbility = Boolean(RANK_NAME[card.rank])`. That
identity broke the moment the Treasure gained a printed name, so the component now reads
`RANK_FACE[card.rank].faceClass` for its class name and `cardActs(rank)` — `faceClass === Act` — for
the question "does this card change what happens".

**`RANK_NAME` in `labels.ts` was deliberately left alone.** It holds exactly the five acting ranks,
and its own spec asserts that. Adding `Treasure: 7` would change `cardAccessibleName` for every
rank-7 card and break **36 live assertions across 10 spec files** that query
`getByRole('button', { name: '7 of Bells' })`. The cost is that a rank-7 card still announces as
"7 of Bells", not "7 of Bells (Treasure)" — recorded under Deferred, and a clean follow-up ticket.
A drift test (`cardFace.test.ts` → "agrees with labels.ts RANK_NAME on every rank both name") keeps
the two maps from disagreeing where they overlap.

## Why the geometry is a pure module

AC5 — "no pip and no art window overlaps either corner index, at every rank and suit" — is
unassertable inside a component test, because **jsdom has no layout engine**. So the geometry left
the component:

- `CARD_FACE_GEOMETRY` in `cardFace.ts` states every rectangle in a **normalised card box**: `0` is
  the card's left/top edge, `1` its right/bottom, on each axis independently. This is
  **aspect-ratio independent on purpose** — the card is `2 / 3` today and the reference sheet is
  `5 / 7`, and which ships is the developer's.
- `printedRects(rank)` returns what that rank _actually prints_, split into `corners` and `printed`.
  A `Plain` rank contributes a second corner (the mirrored bottom-right); an `Inert` rank
  contributes the "no rule" mark; a painting rank contributes the art window, a pip rank
  contributes one `pipCellRect` per spot on its lattice. Overlays (skull, primed, discard) are
  always in `printed`, so each is separately proven clear of both corners — a badge sitting over a
  painting or a pip is intended and is not asserted against.
- `rectsOverlap(a, b)` is a strict comparison with **no epsilon**: every coordinate is an
  exactly-representable decimal literal from one module rather than an accumulated float, and
  touching edges count as _not_ overlapping. A boundary case asserts that directly.
- `cardFace.test.ts` runs in the **node** Vitest project and walks every rank asserting the one
  relation that matters.

### The stylesheet is held to the same numbers

A geometric proof about `cardFace.ts` proves nothing about what renders unless the stylesheet uses
the same numbers. Rather than pushing a dozen inline custom properties onto every card from React —
which would put geometry on the hot path of every card in the hand — the geometry is declared once as
`--wc-face-*` custom properties on `.wc-card` in `warCouncilCards.css`, and **`cardFaceCss.test.ts`
reads that stylesheet from disk and asserts each declared value equals its `cardFace.ts`
counterpart**. That is the same discipline `SuitMark.tsx` applies to its symbol ids, applied to a
surface the compiler equally cannot see. The same spec also asserts the mirrored corner is a true
reflection of the plain one, that the corner index is held to its declared box (without which the
AC5 assertion means nothing), and that the two measured performance findings below are still in
force.

### The pip lattice

`PIP_LAYOUT` is keyed by exactly the pip-bearing ranks (2, 4, 6, 8, 10) and holds 1-indexed
`{ row, column }` spots on a fixed **3 × 7** lattice, so a spot maps straight onto a CSS grid line.
`pipIsInverted(spot)` is `spot.row > PIP_MID_ROW` (4) — every spot below the mid-row prints rotated
180°, which is what makes the card read the same from either end (AC4). Specs assert the pip count
equals the rank, that the keys are exactly the art-less ranks, that inversion is exactly the
below-mid-row set, and that every derived cell stays inside the declared pip field.

### The primed mark's aspect-ratio coupling — the trap, and its removal on DLR-154

`CARD_ASPECT_RATIO = 2 / 3` in `cardFace.ts` **was** the one number in the module that was not
aspect-ratio independent, and it duplicated the `aspect-ratio: 2 / 3` literal in
`warCouncilCards.css` without the drift guard covering it. It existed because `.wc-primed-mark`
shipped (DLR-90/DLR-148) sizing and positioning itself in units of the card's **width on both
axes**, unlike every other rectangle here, and converting those width-relative numbers into this
module's height-normalised y-axis needed the ratio. Retuning the card's aspect ratio without moving
the constant silently broke the primed mark's geometry.

> **DLR-154 deleted the coupling outright, 2026-08-31.** The mark now hangs on the card's
> **wrapper**, outside `.wc-card`'s box, so it has no printed-on-the-face rectangle at all:
> `CARD_FACE_GEOMETRY.primedMark`, its `printedRects` entry, the `PRIMED_MARK_*` and
> `CARD_ASPECT_RATIO` constants that fed only it, the four `--wc-face-primed-*` custom properties,
> the `.wc-card .wc-primed-mark` rule and its four drift rows in `cardFaceCss.test.ts` were
> **deleted rather than repointed** — keeping a declared rectangle would have had the drift spec
> certify a false claim. The trap is gone; so is the guarantee that anything pins the mark's box.
> (DLR-166 then removed the Timebomb entirely.)

## The skull's footprint follows the rank's own content

DLR-148's small top-right skull disc is gone: a skull now **fills the rank's declared content
window**, because DLR-148's own wording is that a skull _replaces the art_, and a corner disc over
an otherwise blank face was the reading that broke once a face had an art window.

`skullFootprintFor(rank)` picks which window, and a late fix in this contract is why it is a
function rather than one constant:

- an `Act`/`Inert` rank uses `CARD_FACE_GEOMETRY.skullFace` (identical to `artWindow`) — it has only
  the single top-left corner and clears it with room to spare;
- a `Plain` rank uses `CARD_FACE_GEOMETRY.pipField` instead, because it _also_ carries the mirrored
  bottom-right index, which the wider art-sized window runs straight into.

No new rectangle was invented and **no `--wc-face-skull-*` property exists**: the CSS rule
`.wc-card.wc-face-plain .wc-card-skull-face` in `warCouncilCardFace.css` routes the plain branch
through the same `--wc-face-pip-*` properties `.wc-card-pips` already uses, and
`cardFaceCss.test.ts` asserts that routing.

**A skulled card keeps its corner index**, its rank, suit glyph and rank name — the trick is still
won on rank and suit. `.wc-card.wc-is-skulled` hides only the art window and the pip lattice, so the
markup stays byte-identical across every rank and suit and DLR-148's AC12 spec still holds.

## The tooltip

`cardRuleText.ts` (34 lines) holds `RANK_RULE_TEXT`, total over `RANKS`, transcribed from
`.docs/game_rules/the-hunt.md` §5's named-rank table and §4's Monarch narrowing. Every unnamed rank
gets `PLAIN_RANK_RULE_TEXT` — "this card has no rule" is exactly the fact the ticket's problem
statement says a player cannot currently read, so it is stated rather than omitted. `cardTipTitle`
gives `9 · Witch` for a named rank and a bare `6` for an unnamed one. `NO_RULE_MARK_LABEL`
("no rule") is the Treasure's printed mark — two words and no rule text, because AC8 forbids rule
text on any face.

`useCardTip.ts` owns the whole interaction:

- **three independent open reasons — hover, focus and tap**, tracked separately, with `open` true
  whenever any one of them is active. Releasing hover while the card is still focused therefore
  leaves the bubble up. Hover is gated on `event.pointerType === 'mouse'`, so a touch tap cannot
  also register as a stuck hover that a touch device has no way to "leave".
- the **anchor `DOMRect`** — and **what is measured is the card, not the host**. A hand card lifts:
  `translateY(-9%)` on hover, `-5%` while pressed, `-20%` plus `scale(1.05)` while armed
  (`warCouncilCards.css`). Those transforms sit on `button.wc-card`; the host `<span>` carries none
  of them, so measuring the host anchored the bubble to where the card _would_ be if it never
  lifted, which put a growing gap between an armed card and its own tooltip. `cardElement(host)`
  takes the host's first element child — the card button — and `getBoundingClientRect()` reflects
  transforms, so the lifted position comes for free.
- **when it is measured**: on each opening, _and_ on the card's own **`transitionend`**. That single
  discrete event covers every lift state there is, because each one is reached by transitioning
  `transform` on the same element — hovering in or out, pressing, arming and disarming all end in a
  `transitionend` that re-measures. There is still **no `ResizeObserver`, no `requestAnimationFrame`
  loop and no re-measure on pointer move**, and `nextAnchor` keeps the previous rect when the box
  did not actually move, so a `transitionend` for a property that changed nothing costs no render.
- listeners — `pointerdown`, `pointerover` and `keydown`/Escape on `document`, `resize` on `window`,
  and `transitionend` on the card — registered **only while open** and removed in the same effect's
  cleanup. A card that unmounts with its tooltip up (a played card leaving the hand, the ordinary
  case) leaves nothing behind, and add-and-remove being idempotent makes StrictMode's double
  invocation a no-op.
- **exclusivity comes free** from `pointerdown`: a tap on a second card fires `pointerdown` before
  its `click`, so the first bubble closes with no shared state between cards.
- **a mouse moving off the host closes every channel** (`pointerover`, gated on
  `pointerType === 'mouse'`). Without it a bubble latched: tapping a card arms it, opens its tooltip
  _and_ focuses the button, so neither the `tap` nor the `focus` channel had any reason to drop while
  the player moved on to hover a different card — two bubbles stayed up, the armed card's over the
  hovered card's, and the stale one was the one being read. Pointing elsewhere is a clear statement
  about what the player is now looking at, so it outranks a stale focus. The mouse gate is why a
  keyboard user's focus bubble is never dismissed by a resting pointer, and a touch pointer has no
  "moving over things" state to read this from.
- **`resize` closes rather than re-measures.** The felt is a no-scroll shell, so there is no scroll
  to track, and a bubble pointing at where the card used to be is worse than a dismissed one.
- if `hostRef.current` is null at the moment of measurement it is a visible no-op rather than a
  bubble rendered at the origin.

`CardAbilityTip.tsx` is the host wrapper. Four structural decisions worth keeping:

- **All five handlers — `onClick`, `onPointerEnter`, `onPointerLeave`, `onFocus`, `onBlur` — sit on
  the host `<span>`, not on the button.** `.wc-card:disabled
{ pointer-events: none }`, and `table`/`pile` cards and every illegal hand card are `disabled` —
  on the button the tooltip would be unreachable on exactly the cards a player most wants to
  inspect.
- **The bubble is portalled to `document.body`** with `position: fixed`. The hand's own cards create
  stacking contexts a bubble rendered inside one cannot escape: the armed card carries `z-index: 20`
  (`.wc-fan .wc-card.wc-is-armed` in `warCouncilCards.css`), and every card is transformed, which
  establishes a containing block for a `position: fixed` descendant. A bubble rendered inside a card
  is therefore trapped beneath its neighbour whatever `z-index` it is given. (This used to be
  justified by the per-slot `z-index` `fanLayout.ts` handed each fan slot; that module is gone with
  the fan, and the portal is no less necessary for it.) The cost:
  the bubble lives outside the card's DOM subtree, so anything later assuming "the tooltip is inside
  the card" will be wrong.
- **The anchor's centre travels through `--wc-tip-anchor-x`**, a custom property, rather than a
  plain inline `left`. `warCouncilCardTip.css` clamps it — `left: clamp(6rem,
var(--wc-tip-anchor-x), calc(100dvw - 6rem))` — and an inline `left` would out-rank that. The
  outermost cards of the hand sit close enough to the viewport edge that an unclamped centre renders
  the bubble partly off-screen. The bubble sits `0.35rem` above its anchor's **current** top edge —
  measured in-browser at 6px in the resting, hovered and armed states alike, which is what
  re-measuring on `transitionend` buys. **DLR-160 routed the vertical the same way**, and swapped
  both `100vw`s for `100dvw` — see below.

- **`:has()` was deliberately avoided**, which is how the ticket's "check `:has()` support" question
  was answered — by removing the dependency rather than accepting it. All three channels are
  resolved in React instead, and the reveal is the single-element rule `.wc-card-tip.wc-is-open` on
  the bubble itself — see [The reveal has to be a class on the bubble](#the-reveal-has-to-be-a-class-on-the-bubble)
  for why nothing else can work while the bubble is portalled.

### DLR-160 AC4 — the rank bubble and the breakdown panel collided by construction

The play session lost a trick to this: hovering the Witch to read what it does put the rule bubble
**exactly on top of** the buff breakdown that explained the card's number, and the player filed a
false bug report about the number instead.

It was never intermittent. Both surfaces anchor to **the top edge of the same hovered card** —
`useBuffBreakdownAnchor` sets the panel's `bottom` from the card's measured rect, `useCardTip` sets
the bubble's `top` from the same rect — so they land on the same line every single time.

The fix places the bubble above **whichever of the two is higher**, and it adds no measurement:

1. `useBuffBreakdownAnchor` now **returns** the panel's resulting top edge in viewport coordinates,
   derived arithmetically from the `zoneRect`, `bottom` and `panelRect` its `useLayoutEffect`
   already computes to place the panel (`zoneRect.bottom - bottom - panelRect.height`). No second
   `getBoundingClientRect()`, no `ResizeObserver`, no poll, no new listener — see
   [the buff ride](buff-ride-and-the-card-breakdown.md#dlr-160-ac4--the-panel-publishes-its-own-top-edge).
2. `CardBuffBreakdown` reports it upward through an `onTopChange` callback **from an effect, never
   during render**, and `BuffRideZone` publishes it through `BreakdownTopContext`
   (`breakdownRectContext.ts`) — one number crossing one boundary, `null` when no panel is open.
3. `CardAbilityTip` reads it with `useBreakdownTop()` and writes
   `Math.min(anchor.top, breakdownTop)` — or the card's own top when there is no panel — into
   **`--wc-tip-anchor-y`**.

**The custom property is what makes the placement safe**, for the same reason `--wc-tip-anchor-x` is
one: `warCouncilCardTip.css` applies `top: max(6rem, var(--wc-tip-anchor-y))`, and an inline `top`
would out-rank that floor with no `!important`. The floor reuses the `6rem` edge margin already
shipped for the horizontal clamp rather than inventing a second number, so anchoring above a tall
panel on a short viewport cannot push the bubble's own top off-screen. **It is a placeholder** —
derived, not chosen, and worth retuning once someone has seen it against a real breakdown.

The two `100vw`s in the same rule became `100dvw` in the same pass, per `game-ux`'s floor against the
static viewport unit.

Neither number can be proven correct under Vitest — jsdom has no layout engine, so the specs pin the
contract (the context value reaching the bubble, the `min` being taken) rather than the geometry.
The alternative fix — hiding the bubble while a breakdown is open — was rejected: the rank rule is
exactly what a player hovering a Witch wants, and the criterion asks for no overlap, not for one of

### A tap on a hand card opens the tooltip _and_ arms it

Deliberate, and pinned by a test ("arms the card AND opens its tooltip on the same tap, with a real
`onTap` handler wired"). `roundReducer` already makes tap-1 arm and tap-2 commit, and arming already
means "I am considering this card" — exactly when the rule is wanted. **No reducer change and no new
affordance.** The cost is that a touch player cannot inspect a card without selecting it; whether
that reads as helpful or as a mis-tap is a feel judgement, recorded in the plan's Risks.

### Accessibility

The rule text reaches the accessible tree **whether or not the bubble is open**: a visually-hidden
`<span id={tipId} className="wc-sr-only">` sits inside the `<button>`, and `PlayingCard` joins its
id into `aria-describedby` alongside the caller's existing `describedBy` (DLR-117's damage strip).
`game-ux` forbids hiding a decision-relevant fact behind hover, and touch has no hover at all.

Consequences:

- **`aria-describedby` now legitimately carries multiple ids.** Three existing specs had to stop
  calling `document.getElementById` on the raw space-separated string.
- The `<button>` **stays the card's root** — `useRovingTabIndex` binds by `querySelectorAll('button')`
  — and the bubble is a `<div role="tooltip">`, never a second button.
- The bubble carries **no id and is never linked** from `aria-describedby`. Linking it too would
  announce the rule twice.
- `CardFacePanel`'s entire rendered subtree is `aria-hidden` — the accessible name and the
  description carry everything a screen reader needs.

## Symbols, tinting, and the two performance findings carried in

The eight figures (`swan`, `fox`, `axe`, `witch`, `crown`, `harp`, `chalice`, `sword`) are
`<symbol id="wc-fig-…">` bodies in `CardArtSheet.tsx`, mounted **once per round** by
`WarCouncilRound.tsx` beside the existing `SuitSymbolSheet` and referenced by `<use>`. Eleven cards
on the felt therefore cost eleven references, not eleven drawings.

Two findings measured on the reference sheet are carried into `src/` verbatim, and
`cardFaceCss.test.ts` asserts both are still true:

- **The paper grain is a tiled 64×64 base64 bitmap, never an SVG `filter`/`feTurbulence`.**
- **No `mix-blend-mode` appears anywhere.**

Each forced per-card rasterisation and stalled a screenshot at 120 seconds.

Per-suit tinting rides on **inherited custom properties read by class-based CSS rules**
(`--wc-fig-dark/mid/light/white`, set by `.wc-suit-*`), the one mechanism this codebase has already
shipped through a `<use>` shadow tree (`.wc-skull-shadow`) — never `var()` inside a **presentation
attribute**, which `SuitMark.tsx`'s docblock records as unreliable cross-browser. `SuitMark`'s three
glyphs were elaborated in the same pass and still set **no `stroke-width`**, so call sites keep
owning glyph weight in CSS (AC7).

### `suitSymbolIds.ts` — a 15-line module for one map

`SUIT_SYMBOL_ID` binds a suit to its `<symbol>` id by string: a rename type-checks cleanly and
renders nothing. It lives in its own module rather than in `SuitMark.tsx` because that is a
component file and `react-refresh/only-export-components` rejects a non-component export beside
`SuitMark`/`SuitSymbolSheet` — **the rule was not disabled**. `CardFacePanel`'s pip lattice imports
the same map the corner glyph reads, rather than re-deriving the id a third time.

### `CardFacePanel.tsx` exports a component named `CardFace`

The file is `CardFacePanel.tsx`, not `CardFace.tsx`, purely because `cardFace.ts` already exists in
the same directory: on a case-insensitive filesystem (this is a Windows box) the two collide and
`tsc` fails outright with **TS1149** ("differs only in casing"), independent of how either is
imported. Renaming the brand-new component with one consumer was the contained fix; renaming the
established pure module would have touched every phase that imports it. **The exported component is
still named `CardFace`, and `PlayingCard.tsx` imports it as `CardFace from './CardFacePanel'`.**

## The reveal has to be a class on the bubble

`.wc-card-tip` is `opacity: 0; visibility: hidden` by default and is revealed by exactly one rule,
`.wc-card-tip.wc-is-open` — a **single-element selector**, matching a class the bubble carries
itself (`className={open ? 'wc-card-tip wc-is-open' : 'wc-card-tip'}` in `CardAbilityTip.tsx`).

**This is the trap worth remembering, because the obvious "simplification" is to move the class back
onto the host.** The bubble is `createPortal`ed to `document.body`, so it is a child of `<body>` and
never a descendant of `.wc-card-tip-host` — no descendant selector can reach it, whether that is
`.wc-card-tip-host:hover .wc-card-tip`, `:focus-within`, or an ancestor `.wc-is-open`. DLR-149's
first pass shipped exactly those three rules and the visible bubble could therefore never appear;
the fix in the same ticket deleted them for the single-element rule above. The portal is not
negotiable either — the armed card's `z-index: 20` and every card's own transform create stacking
contexts, so a bubble rendered inside a card is trapped beneath its neighbour. Portal plus ancestor selector cannot
coexist; if the portal ever goes, the selector may change with it, and not before.

### Hover and focus go through React, which the plan did not intend

`plan.md` Part 2's Runtime quality note says hover "never reaches React at all". That was written
for a pure-CSS `:hover` reveal and cannot hold alongside the portal, so it is **no longer true**:
all three channels — hover, focus and tap — go through `useCardTip`'s state, and the reasoning is
recorded in `CardAbilityTip.tsx`'s docblock. The measured cost is **one render of one card** on
hover or focus; nothing else on the felt re-renders, no `memo`/`useMemo`/`useCallback` was added,
and the anchor is still measured on discrete events — each opening, plus the card's `transitionend`
— rather than per frame.

`CardAbilityTip.test.tsx` pins the behaviour rather than leaving it to a browser pass: hover opens
and leave closes on a real **mouse** pointer with the class asserted **on the bubble**; a **touch**
pointer does not open it; focus and blur open and close it; and hover opens the bubble on a
**disabled (illegal)** hand card — the case the host-wrapper design exists to serve. All of
DLR-149's earlier tap, Escape, outside-`pointerdown`, StrictMode and listener-release coverage is
kept alongside it.
