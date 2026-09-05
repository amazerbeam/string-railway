Part of [War Council UI](README.md).

DLR-148 replaced `BuffLoadoutPanel`'s one-line-per-buff list with a **gallery of buff cards**: a
metallic tier frame over a near-neutral face, laid out in a fixed grid, grouped into runs, with
exact duplicates collapsed into a counted pile and everything unusable right now fenced into one
tarnished group carrying the count and the shared reason. The panel's identity did not change — it
is still `role="dialog"` named "Your buffs", still opened by the bar's Apply Buff button, still
gated by `loadoutDoorOpen` — so every spec that reached the old panel through
`getByRole('dialog', { name: 'Your buffs' })` reaches this one unedited.

> **Since DLR-174 the gallery is the secondary route, not the only one.** Tapping a hand card opens
> a per-card [arming surface](arming-a-buff-from-the-card.md) in the same felt-stage region, showing
> only the buffs that could pay on that card; the gallery is now what **Apply Buff** means — "show me
> everything I hold", with the tier and suit filters, which is the cross-trick planning tool the
> filtered surface cannot be. It was deliberately **retained rather than retired**; retiring it is the
> parent epic's call. Two consequences: the arming surface takes its **own** accessible name and never
> `LOADOUT_PANEL_LABEL`, so the seven specs above stay unambiguous; and pressing Apply Buff while a
> card is raised lowers the card and opens this gallery, rather than producing a both-open state. The
> new surface reuses `buildBuffGallery` and `BuffCard` unchanged, so a buff card looks and behaves
> identically in both.

## The rules live in a `.ts` module, the components render what it decided

`buffGalleryModel.ts` is the whole of the grouping logic and imports no React and touches no DOM.
`buildBuffGallery(buffs, refusalFor)` walks the pile once and returns a `BuffGalleryView`:

- **Duplicate collapse.** `buffStackKey(buff)` joins **kind, tier, target suit, target rank, the wild
  flag, reward axis and reward value**. Two cards merge only when they are the same card in every
  respect a player could tell apart, which is what makes the `×N` on the face exact — two Bell High
  cards that pay different amounts are two cards, not one card counted twice, and a **wild** card
  never stacks with a suitless one. The first copy in pile order is the
  one a tap acts on (`BuffStack.buff`), so repeated taps spend a stable copy. **Since DLR-159 that
  composition lives in `src/hunt/buffCombine.ts` as `buffCombineKey`, and `buffStackKey` is a one-line
  delegation to it** — the shop combines two cards on exactly this rule, and two answers to "is this
  the same card" is the drift the delegation exists to prevent. The name, the signature and the
  composed string here are unchanged, and this file's spec still guards them. See
  [../hunt/combining-cards.md](../hunt/combining-cards.md).
- **Runs.** `buffRunOf(buff)` is `suit ?? (cadence is Activated ? press : suitless)`. The activated
  test reads `BUFF_CADENCE[buff.kind]` rather than a hard-coded list of the two activated kinds, so
  restoring a cut consumable needs no edit here. `BUFF_RUN_ORDER` fixes the order:
  **Bells, Keys, Moons, Suitless, Press** — suitless last of the passives, Press last of all.
- **Order within a run** is tier descending, then `buffStackKey` ascending. That is a **total**
  order with no `Math.random()`, no date and no mutation of the input, so two identical piles in
  different input order always produce an identical grid.
- **The fence.** `refusalFor` is called **once per stack, never once per copy**. Any stack with a
  non-`null` refusal leaves its run entirely and lands in `BuffFence`; `BuffFence.reason` is the
  shared refusal when all fenced stacks agree on one and `null` when they do not. A run with no
  usable stack is omitted, so it renders no tab.

The gate itself is not re-read here. `roundControlsProps.ts`'s `buffGalleryProps` passes
`(buff) => loadoutRefusalFor(ui, buff)`, which reads `buffActivationWindowOpen` — the one owner of
the activation window. **DLR-148 changed nothing about that gate**, which is what "the fence follows
the code, not the mockup" means concretely: every template but one is gated on `discardWindowOpen`
(between tricks only) and **Cheat alone** is `canAct`, usable mid-trick. The gallery mockup showed
the inverse and the port corrected the mockup rather than moving the gate.

Two later refusals join it on the fence. A **wildcard** is refused outright with
`BuffActivationRefusal.ShopOnly` — it is spent on the Manage Buffs screen and has no felt effect at
all — and a **second Curse** is refused with `CurseLive` while one is armed or a card is already
marked this trick.

## What is on a card's face

`BuffCard.tsx` renders one `BuffStack` and decides nothing about it. The face carries, in order: the
target suit as a bare coloured glyph (`SuitMark`, or an empty slot for a suitless card), the tier as
a **roman numeral** (`I` / `II` / `III`), the cadence word, the `×N` when the stack holds more than
one, the card's name, its condition sentence, and the payoff bar pinned to the bottom edge.

**Tier is legible without colour by construction.** A metallic gradient reads as light-and-dark in
greyscale, never as bronze/silver/gold, so the numeral is the carrier that survives.

> **DLR-159 moved the three lookup tables out of the component.** `TIER_NUMERAL`, `TIER_CLASS` and
> `SUIT_CLASS` were carried separately by `BuffCard.tsx` here and by `HeldBuffCard.tsx` in the shop
> tray; the Manage Buffs screen's pile tile would have been the third copy, which is what made the
> duplication real — a new suit or tier meant three synchronised edits with no compiler check tying
> them together. They now live once in `buffCardVisuals.ts`, a pure lookup table and **not** a
> component: all three files still render their own card face. The tier
> _word_ is deliberately not rendered — it is what pushed the condition text into the payoff bar on
> the mockup.

**The cadence word is derived, never authored per card.** `buffLabels.ts`'s `buffCadenceWord(buff)`
reads `BUFF_EVENT_WORD[buff.kind]` first and falls back to `BUFF_CADENCE_WORD[BUFF_CADENCE[kind]]`.
`BuffCadence.Event` is shared by three live families that fire on different branches of a trick, so
`Event` alone would say nothing; the narrowing is a `Partial` over `BuffKind` holding the three live
Event families, and the eight cut families fall through to the cadence table rather than rendering
`undefined`. The words are **`HIGH` / `LOW` / `SKULL` / `WHEN` / `HAND END` / `PRESS`** — Suit High
takes `HIGH`, both Suit Low and Skull Low take `LOW`, and the two protective families take `SKULL`.

> **Those words are the mechanical axis, on purpose.** Every buff condition reads `playerWentHigh` —
> _did the player physically take the cards_ — while the streak, the multiplier and the damage read
> the outcome axis. The mockup said `WIN` / `LOSE`, which would have put outcome words on a
> mechanical test right beside a consequence readout speaking the outcome axis in the same felt.
> That collision is the single most common source of wrong statements about this game, and **DLR-165
> is the ticket that split the two vocabularies apart for good**: Victory and Defeat name the
> outcome, High and Low name the act, and **a buff card uses High or Low and never names Victory or
> Defeat.** The words themselves are placeholder copy and the developer's; the axis split is not.
>
> The pills read `TAKE` / `MISS` / `SKULL LOSS` / `HURT` before that rename.

**`BuffPayoff` is `{ gain: string }` and nothing else.** It carried a second half, `risk`, for the
Timebomb's self-inflicted figure — and the **DLR-167 fix pass removed it**, because after DLR-166
deleted that card `risk` was `null` at both of `buffPayoff`'s return sites, so six consumer branches
across five files were provably unreachable and every one had to be read and dismissed by anyone
auditing the code. It is kept as an **object** rather than collapsed to a bare `string` so a card
that costs the player a figure can add the field back as a widening rather than a signature change
at every call site.

**Curse is the one card that pays two figures**, and `buffPayoff` special-cases it: it reads
`CURSE_REWARD[buff.tier]` — never a literal — and prints `+2 damage, +1 multiplier` at gold and
`+N damage` below it, so a retuned ladder cannot leave the card advertising a figure the engine will
not honour.

`buffPayoffFace(buff)` is a second, **face-only** rendering: the face has a measured 33px box and
`white-space: nowrap; overflow: hidden`, so a card whose payoff does not fit abbreviates there while
the full sentence stays in the accessible name. **No card in today's pool needs the abbreviation**,
so it is currently `buffPayoff` verbatim. The unabbreviated sentence lives in
`buffCardAccessibleName`, which also carries the condition, the payoff, the `×N` suffix,
and either the refusal message or the poise hint — `Tap again to spend` for a `PRESS` card, whose
second tap is irreversible.

## The grid, and the four layout traps that are structural rules here

- The `<button>` **is** the grid item. A `<button>` stops stretching the moment it is not a direct
  grid item, which broke the mockup's layout three separate times.
- The button contains **only phrasing content** — `<span>`s throughout, no `<h3>`, no `<p>`.
- The grid is `repeat(auto-fill, var(--wc-buffcard-w))` with `justify-content: start`, never
  `minmax(…, 1fr)`, so **a card's size does not encode how many there are** and a tier-filtered
  gallery does not stretch three cards across the panel.
- **The card and the duplicate pile must each be their own stacking context.** Neither creates one
  by default, so both contests get resolved in the _grid's_ context and both lose the same way: on
  the mockup's first render the hover sheen swept across the whole card and its neighbours instead
  of travelling the rim, and every stacked buff rendered as a blank slab of metal with no face at
  all, because the pile painted over its own card. The second one does not read as a z-order bug, it
  reads as "that card is broken". `warCouncilBuffGallery.css` carries `isolation: isolate` plus
  `overflow: hidden` on the card and `isolation: isolate` with an explicit `z-index` on the pile
  wrapper, with the reasoning at the point of use.

**No SVG filter over `feTurbulence` and no `mix-blend-mode` appear anywhere.** Both were measured as
performance traps while building the mockups — the first timed out `Page.captureScreenshot` at 120s
with eleven cards on screen, the second forces a compositing layer per card. The paper-grain texture
they were built for is deliberately not ported; its two prohibitions are recorded as CSS comments
where a future ticket would add it.

## Keyboard: one roving group, and `Escape` unwinds one level

`useRovingTabIndex` is reused unchanged, and that **constrains the markup**. It indexes
`groupRef.current.querySelectorAll('button')` **positionally** with no typed contract, so the ref'd
element must contain exactly the buff cards, as native `<button>`s, in DOM order, and nothing else
focusable. Two consequences:

- `BuffRunTab` is a **`<div>`, not a button** — it labels a run, it is not a control — and is
  `aria-hidden`, since each card's own accessible name already carries what it says.
- `BuffTierFilter`'s four chips **are** buttons, so they render **outside** `groupRef`, above the
  scroll region.

`isFocusable(index)` guards `cards[index] !== undefined` before reading `.refusal`, because the hook
probes index 0 unconditionally even on an empty collection. That guard is carried over verbatim from
`BuffLoadoutPanel` and is load-bearing for the same reason: it is the gap that produced an
integration-only crash once already.

**`Escape` unwinds one level, which needed a second reducer action.**
`RoundUiActionKind.CancelBuffPoise` joins the union; `buffHandlers.ts`'s `handleCancelBuffPoise`
drops an unspent poise and leaves the panel open, returning `state` itself — not a fresh object —
when the panel is shut or nothing is poised, so an idle `Escape` cannot even cause a re-render.
`CancelLoadout` keeps its old meaning, "close the panel outright", because that is what the bar's
own toggle dispatches and it must always close outright. The gallery's own handler is the ladder:
poised → `onCancelPoise`, otherwise → `onClose`. Covered by
`__tests__/roundReducer.cancelBuffPoise.test.ts`.

The panel's outer `onClick={(e) => e.stopPropagation()}` is **load-bearing**, not defensive: this
mounts inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt is waiting.
`ActionBar`'s identical-looking stop is the defensive one — the two are not interchangeable.

## The filters are component-local, and the fence's note follows them

`BuffGallery` holds the filter in a `useState` that is created and destroyed with the panel —
ephemeral view state, not round state, so it does not belong in `roundReducer`. `buildBuffGallery`
is **not** re-run when the filter changes: the component filters the view it was handed.

**Since DLR-160 there are two axes, held as ONE value.** `BuffGalleryFilter` in
`buffSuitFilterModel.ts` is `{ tier, run }`, each either a value or `'all'`, and `matchesFilter`
requires **both** to agree — the intersection, never either filter alone. A single object rather than
two independent `useState` calls is the same argument `roundUiState.ts` makes for `discardSelection`
and `loadout` being single nullable fields: it makes an inconsistent pair — a stale tier beside a
suit the counts were never recomputed over — unexpressible rather than merely unlikely.

`BuffSuitFilter.tsx` renders the second row: six real `<button>`s — `all`, the three suits,
`No suit` and `Press` — carrying a `SuitMark` glyph **plus the run's word**, never a colour alone.
It renders **outside** `groupRef` for the same positional-indexing reason `BuffTierFilter` does (see
the keyboard section above). The five run words and the three suits come from `buffRunLabels.ts`,
split out of `BuffRunTab.tsx` so the grid's run headers and the filter chips cannot name the same
five runs two ways — and split into a file exporting no component at all, because a component file
that also exports a plain constant trips `react-refresh/only-export-components`.

**The suit chips' own counts follow the tier filter.** `runCountsFor(view, tier)` sums the held
counts per run over the stacks the tier filter already allows, so picking _Gold_ narrows what the
suit row reports before a suit is even picked — rather than the suit chips advertising figures for
cards a tier pick has already hidden.

**Two filters can produce an empty intersection a single filter never could**, so there is a line —
"No buffs match this filter." — where an empty grid would otherwise read as broken. It is shown only
while at least one axis is filtered: an empty pile keeps its own quiet empty grid rather than being
told a filter is to blame.

One subtlety worth stating because it looks like duplication: the fence's shared reason is
**recomputed over the filtered stacks** rather than read from `view.fence.reason`. Either filter can
narrow a mixed-reason fence down to one that shares a single reason, or the reverse, and the fence's
own note has to describe what is actually on screen. The sentence itself reuses
`BUFF_ACTIVATION_REFUSAL_MESSAGE` rather than authoring a second copy of the same wording, and falls
back to "for different reasons" when the fenced stacks do not agree.

`buffSuitFilterModel.test.ts` pins the intersection, the tier-scoped run counts and the `'all'`
rows, with no renderer.

## The 4.5:1 contrast floor is enforced by a test that parses the real stylesheet

`__tests__/contrast.test.ts` reads `warCouncil.css` with `readFileSync`, extracts the token hexes by
regex and computes the WCAG relative-luminance ratio for every payoff-bar ink against its suit and
every readout ink against the readout ground, asserting **at least 4.5:1**. It runs in the `node`
Vitest project and pulls Node's ambient types through a file-local `/// <reference types="node" />`
rather than widening `tsconfig.app.json`'s `types` for the whole tree.

Exporting the hexes from TypeScript and mirroring them in CSS was rejected as exactly the
two-sources-of-truth failure this codebase is organised against — **the CSS stays the single owner
of the colour**, and the test still fails if someone retunes a suit without re-measuring.
`token()`'s `throw` on a missing token is deliberate: a renamed token must fail loudly rather than
silently pass by comparing `undefined` against `undefined`.

The measurement that made this necessary: **white fails on all three suits** — Bells 2.99:1, Keys
3.37:1, Moons 3.51:1 — and both existing project accents fail on the readout's light ground
(`--wc-alarm` 3.03:1, `--wc-brass` 2.29:1). The inks that ship are contrast-derived, not chosen.
Every other colour and size token DLR-148 added is a transcribed placeholder the developer owns;
**the 4.5:1 floor is the one figure that is not.**

## The `.ts` model and its `.tsx` component may not share a name

`buffGalleryModel.ts` was `buffGallery.ts` for two phases, and `trickConsequenceModel.ts` was
`trickConsequence.ts`. Both were renamed, and the rule is worth stating as an invariant rather than
as a ticket anecdote: **a pure `.ts` view-model and its `.tsx` component may not have names that
differ only by case.** This toolchain's Vite/Vitest module resolution folds two source files whose
names differ only by case into **one cached module id**, even though the filesystem underneath is
case-sensitive — so `import BuffGallery from './BuffGallery'` silently resolved to the _model's_
exports, which have no default export, and the component rendered as `undefined` the moment both
were in one module graph. It is not a test-only artefact: the same collision would recur in the app
bundle as soon as `WarCouncilRound.tsx` imported both. The `Model` suffix is the convention that
avoids it; nothing about either module's behaviour changed with the rename.

**DLR-160 hit the same wall a third time and confirmed the mechanism at the compiler.** The plan
named the suit filter's model `buffSuitFilter.ts` beside `BuffSuitFilter.tsx`, and `tsc -b` failed
with TS1149/TS1192 the moment both files existed side by side. It ships as
`buffSuitFilterModel.ts`; only the filename differs from the plan.
