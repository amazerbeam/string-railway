_Part of [War Council UI](README.md)._

### A full-viewport shell, never a page

`WarCouncilRound.tsx` renders one `.wc-shell` grid, defined in `warCouncil.css`:
`height: 100dvh; width: 100%; overflow: hidden; display: grid`, with `env(safe-area-inset-*)`
padding. DLR-53 gave it a second column for the Quarry dossier zone:

```css
grid-template-rows: auto 1fr auto auto;
grid-template-columns: minmax(10rem, 17vw) 1fr;
grid-template-areas:
  'status  status'
  'dossier table'
  'hand    hand'
  'actions actions';
```

**DLR-114 added the fourth row.** The shell was `auto 1fr auto` over three areas until the action bar
replaced the felt rail's four plates; `.wc-bar` sets `grid-area: actions` in
`warCouncilActionBar.css`. Only the `1fr` table row absorbs the difference — the bar's own height is
`auto`, bounded by `clamp()` values copied from the sibling rail stylesheets, so **the felt shrinks to
make room rather than the page growing**, which is exactly what the no-scroll floor requires. The
alternative considered and rejected was overlaying the bar as a fixed-position strip on top of the
hand: it would occlude hand cards at short viewports, which is the crop failure this page's own
history records three times below.

> **The narrow/short override must be maintained in lockstep, and the stylesheet says so.**
> `warCouncilHunt.css`'s `@media (max-width: 44rem), (max-height: 34rem)` block re-declares
> `.wc-shell`'s areas one column wide, so it carries **its own copy of the area names** — it now reads
> `'status' 'dossier' 'table' 'hand' 'actions'` with `grid-template-rows: auto auto 1fr auto auto`.
> A row added to one belongs in the other **in the same change**: a named area missing from the
> override drops `.wc-bar` out of its slot into implicit auto-placement, silently, with no error
> anywhere. This is the third duplication-across-the-breakpoint hazard this page records, and the only
> one the stylesheet guards with an explicit comment.

The dossier sits beside the felt rather than in a far corner because the telegraph inside it is read
at the moment the decision is made. `dvh` rather than `vh` is deliberate: `100vh` measures
against the browser's _large_ viewport (toolbars retracted), so on a phone the layout's bottom edge
starts life underneath the address bar; `100dvh` tracks the _dynamic_ viewport as chrome shows or
hides. `dvh` over the more conservative `svh` is a specific choice for this screen, not a default:
the shell never scrolls, so `dvh`'s live reflow-on-toolbar-change — the reason a scrolling page
prefers `svh` — can never be triggered here, and `dvh` gives the fuller surface.
`src/styles/global.css`'s `body { overflow: hidden }` (no `min-height: 100vh`) backs this up at the
document level, and `index.html`'s `viewport-fit=cover` is what makes the safe-area insets resolve
to something other than zero.

`1fr` belongs to the table row and `auto` to the two bands; reversed, the hand grows and the play
area collapses at short viewports. The hand container carries explicit `min-height` and padding
because **a card's lift is a transform, which does not affect layout size** — without reserved room
the hand's visual pixels spill outside its box and the shell's `overflow: hidden` crops them. The
fix is to reserve the room, never to loosen the overflow.

The styling ships as **twelve** stylesheets, not one, all imported by `WarCouncilRound.tsx` in cascade
order. Two of them are imported a second time, by the component that owns them —
`warCouncilBuffGallery.css` and `warCouncilBuffCard.css` from `BuffGallery.tsx` — which is the same
pattern `warCouncilActionBar.css` used to follow when `BuffLoadoutPanel.tsx` was the only other
consumer of its `.wc-loadout-*` block. **That block, and that panel, were deleted by DLR-148.**

| Sheet | Owns |
|---|---|
| `warCouncilActionBar.css` (133) | DLR-114: the whole action bar (`.wc-bar*`, including `grid-area: actions`). Its `.wc-loadout*` block — the old buff panel — was **deleted by DLR-148**, taking the sheet from 239 lines to 133. Every size bound in it is a `clamp()` copied from a sibling rail sheet rather than a new number — placeholder, flagged for the polish ticket |
| `warCouncil.css` (393) | the `:root` tokens, the shell grid, the status band including DLR-82's `.wc-run` readout, and — re-homed by DLR-80 — the `.wc-sr-only` utility. **DLR-148 added the buff card's metals, face tints, inks, the two size bounds `--wc-buffcard-w` / `--wc-rail-w`, the skull shadow, and the five contrast-derived inks**; `__tests__/contrast.test.ts` parses this file and asserts the 4.5:1 floor against whatever it says. **DLR-149 added the twelve `--wc-fig-*` figure colours (four per suit) and `--wc-grain-opacity` (0.28)** — all thirteen placeholders, the developer's to choose |
| `warCouncilTable.css` (176) | DLR-93: the decree and draw pile, and the whole `.wc-table` block — the felt itself. **DLR-148 replaced its `1fr auto 1fr` with `var(--wc-rail-w) minmax(0, 1fr)`** — the rail/stage split — and corrected a comment that had been pointing `.wc-felt-rail`'s rules at a stylesheet deleted two tickets earlier |
| `warCouncilFeltRail.css` (109) | **DLR-148, new.** The felt's left game rail: the always-mounted decree/trick/readout/spent column, the condensed trick strip it shows while the gallery holds the stage, and the readout slip's light ground and its three tones. Closes a pre-existing defect — `.wc-felt-rail` had **no rule at all** before this sheet existed |
| `warCouncilBuffGallery.css` (272) | **DLR-148, new.** The gallery panel, its head figures, the tier-chip filter, the `repeat(auto-fill, <fixed>)` grid (never `minmax(…, 1fr)`), the run tabs and the fence. Carries the `isolation: isolate` on the pile wrapper that keeps a stacked card from painting over its own face |
| `warCouncilBuffCard.css` (387) | **DLR-148, new.** One buff card: the metal frame, the tinted face, the roman numeral, the cadence pill, the suit-coloured payoff bar and its split variant, the hover sheen, and the tarnish a fenced card takes. Carries the card's own `isolation: isolate` + `overflow: hidden`, and the `white-space: nowrap` on the payoff bar that makes the rest of the card's vertical layout computable |
| `warCouncilCards.css` (366) | the card face, the ability prompt, and the hand-over panel. **DLR-149 moved the whole card-face block out into `warCouncilCardFace.css`** and left behind the `--wc-face-*` geometry custom properties, the `aspect-ratio`, and the `@container (max-width: 150px)` name suppression. **DLR-148 added `.wc-card-skull-face`** and removed `.wc-skull-mark`, the corner glyph it replaces |
| `warCouncilCardFace.css` (327) | **DLR-149, new.** The card face itself: the three face-class borders, the art window's wash/glow/figure/vignette stack, the pip lattice and its 180-degree lower half, the "no rule" mark, the paper grain (a tiled base64 bitmap, never an SVG `filter`), and the skull-face rules — including the `.wc-card.wc-face-plain` branch that routes a plain rank's skull through the `--wc-face-pip-*` properties so it clears the mirrored corner index |
| `warCouncilCardTip.css` (87) | **DLR-149, new.** The ability tooltip bubble, split from `warCouncilCardFace.css` in the same ticket's round-2 fix loop when the combined file crossed the 400-line budget. Reads `--wc-card-w` and the inline `--wc-tip-anchor-x`, and clamps the bubble's centre into the viewport rather than measuring its own rendered width. **The bubble is portalled to `document.body`, so it is revealed by the single-element rule `.wc-card-tip.wc-is-open` — a descendant selector on the host can never match a portalled node** — see [Card faces and the ability tooltip](card-faces-and-the-ability-tooltip.md) |
| `warCouncilHunt.css` (376) | the dossier zone and DLR-80's `.wc-shape*` and `.wc-bank*` readouts. **DLR-148 deleted its six `.wc-telegraph*` rules** with the component they styled, taking the sheet from 417 lines — over the blocking budget before this ticket touched it — to 376 |
| `warCouncilHealthBars.css` | DLR-71: the duel's two health displays — rewritten by DLR-86 from a bar surface into the heart rows, their four `[data-state]` rules, the two `@keyframes`, and DLR-115's `[data-type]` product |
| `warCouncilHand.css` | DLR-82: the hand container and the hand row (the fan, until the DLR-149 follow-up retired it) |

> **Two sheets this table used to list no longer exist.** `warCouncilCheats.css` and
> `warCouncilTimebomb.css` went with `CheatSlots.tsx` and `TimebombCharge.tsx` on **DLR-132**, when
> both became ordinary buff cards. `warCouncilCheats.css` is worth remembering for one reason: a
> comment in `warCouncilTable.css` went on pointing `.wc-felt-rail`'s rules at it for two tickets
> after it was deleted, so the class styled nothing at all until DLR-148 noticed. That is the
> string-bound failure mode this module's invariants warn about, in its cheapest possible form.

The felt used to live in `warCouncil.css` alongside the shell; DLR-93 moved it out (see below).

**DLR-114 is the first ticket to delete stylesheets rather than split one.** `warCouncilApplyDamage.css`
and `warCouncilDiscard.css` went with the two plates they styled, and `warCouncilActionBar.css` (one
new sheet) replaced both — so the family went from ten sheets to nine while gaining a surface. No
`.wc-apply-*` or `.wc-discard-*` selector survives anywhere in `src/`; a grep in the contract's final
verification proved no orphaned class reference was left behind, which matters because **a CSS class
that binds by string and resolves to nothing fails silently**, the same hazard the `.wc-sr-only`
re-homing below records.

**DLR-97 added three named motion-duration tokens to `warCouncil.css`'s `:root`**, alongside the
pre-existing `--wc-hp-break-ms`/`--wc-hp-flash-ms` pair: `--wc-ui-transition-ms` (140ms — the shared
hover/active/state-change duration for controls that previously snapped: the shop tabs, the shop
list rows, and the felt-rail plates' hover `filter`), `--wc-prompt-enter-ms` (180ms — the ability
prompt's mount entrance) and `--wc-decree-swap-ms` (220ms — the decree pile's swap crossfade). Every
surface this pass touched reads one of the three by `var()` rather than repeating a literal duration;
see [the Timebomb plate's polish-pass note](timebomb-charge-and-the-mark.md#dlr-97-the-plates-polish-pass),
[the ability prompt's entrance note](accessibility.md#dlr-97-gave-the-prompts-mount-a-visible-entrance-orthogonal-to-the-focus-fix-above),
and [the decree swap's crossfade note](interaction-and-state.md#dlr-97-the-decree-swap-now-visibly-crossfades)
for where each is consumed. All three are the developer's to retune by eye; none is a placeholder
pending a decision — DLR-97 shipped considered first-pass values per this project's "ship rough,
then tune by feel" convention.

> **DLR-86 retired this module's one inline-style mechanism, and the reasoning is worth keeping
> rather than the mechanism.** `DuelHealthBars.tsx` used to write bar geometry into a `--w` custom
> property on each segment instead of an inline `width`, precisely because an inline `width`
> out-ranks an external rule that carries no `!important` — it would have permanently defeated the
> stylesheet's own transition and lethal-state rules. The heart rows have **no per-element geometry
> to communicate at all**, so the component now writes no inline style anywhere and the hazard is
> designed out rather than guarded against. The rule that survives: any future need for a per-heart
> value comes back through a custom property, never through `style={…}`.

> **DLR-93 split the seventh out, for the same reason as every split before it.** `warCouncil.css` had
> sat at **exactly 400 lines** — the blocking budget, with zero headroom — since DLR-84, and DLR-93's
> remediation pass moved the decree/draw pile and the `.wc-table` block out verbatim into
> `warCouncilTable.css` (151 lines), leaving `warCouncil.css` at **258**. Every declaration was
> preserved byte-for-byte and `WarCouncilRound.tsx` imports the new sheet immediately after
> `warCouncil.css`, so the cascade is unchanged. The seam chosen was the shell/tokens versus the table
> surface, which is the one seam the file already read as.

> **DLR-82 split the fifth out, for the same reason as every split before it.** Adding the `.wc-run`
> block pushed `warCouncil.css` to **431 lines**, past the 400-line ceiling. The hand/fan rules moved
> out verbatim into `warCouncilHand.css` (46 lines), leaving `warCouncil.css` at 393. Content only
> moved — no rule, value or selector changed — and the new sheet is imported from
> `WarCouncilRound.tsx` with the others.

> **DLR-80 deleted two of the six.** `warCouncilDeclare.css` went with the declare gate and
> `warCouncilStandingTrack.css` with the Standing track. **`.wc-sr-only` was defined only in the
> latter and used only by `StandingTrack.tsx`**, so deleting the pair would have taken the project's
> sole screen-reader-only utility with it — it was re-homed verbatim into `warCouncil.css` in the
> same task. A CSS class that binds by string and resolves to nothing fails silently and is invisible
> to the compiler, which is exactly why the audit looked for it. It currently has no consumer: both
> new readouts label their glyphs directly rather than using a visually-hidden span.

**Every split happened for the same reason — the 400-line file budget**, and the count is a reliable
record of how often this sheet family has hit it. The combined original transcription measured 581
lines; `warCouncil.css` then could not absorb DLR-53's new zone plus four surfaces;
`warCouncilHunt.css` reached 423 lines once DLR-63 added the declare and claim surfaces to it; and it
reached **419** again when DLR-68's track rules were appended, which is what carved the fifth sheet.
That last one is worth noting as a process point: DLR-68's own contract predicted the additions would
land around 365 lines and instructed the implementer to carve a new sheet rather than compress the
rules if the prediction proved wrong. It did, and the sheet was carved — `warCouncilHunt.css` is back
at 307.

The **sixth** was carved differently: DLR-71 planned it up front rather than discovering it. A full bar
surface — track, two segments, the lethal state, the movement transition, its reduced-motion
suppression and its own narrow-viewport block — measured around 150 lines against a
`warCouncilHunt.css` already at 307, so the split was in the contract's file map before any CSS was
written. `warCouncilHealthBars.css` landed at 121 lines after review removed four dead rules from it.

`warCouncilHealthBars.css` carries **its own copy of the `@media (max-width: 44rem),
(max-height: 34rem)` breakpoint** rather than adding two selectors to the block in
`warCouncilHunt.css`, precisely to avoid reopening a sheet that had just been brought back under
budget. `warCouncilHealthBars.css` does the same for the same reason, so **the breakpoint value now
lives in three files** — a three-file edit if the threshold is ever tuned, and the one real drift risk
the split has introduced. Consolidating it is its own ticket.

> **That duplication cost something real on DLR-71, and it is the concrete argument for consolidating.**
> The contract instructed a `.wc-hp { flex: 1 1 40% }` rule into `warCouncilHunt.css`'s copy of the
> breakpoint — but the mockup transcription had already produced the identical rule in
> `warCouncilHealthBars.css`'s copy, at identical specificity, in a sheet that loads **later**. The
> `warCouncilHunt.css` copy was therefore not merely redundant but **completely unreachable**, and it
> took a reviewer reading both sheets' media blocks side by side to notice. Review deleted it and left a
> pointer comment naming the surviving rule's one home. Two copies of a breakpoint are a maintenance
> cost; two copies of a _rule_ inside them is a bug that no test can see.

`WarCouncilRound.tsx` imports **all of them**, in that order, and importing only some leaves part of the
feature unstyled with no error anywhere — worth knowing before debugging a card that renders with no
face, a shape or bank readout that renders as an undifferentiated run of text, or a health bar
that renders as an empty box with no fill and no mirror. A Vite build fails loudly on a missing CSS
import, so a stale import is a broken build rather than a silent gap.

**Import order is load-bearing, not incidental.** A card's hover lift and its
`@media (prefers-reduced-motion: reduce)` suppression are deliberately co-located in
`warCouncilCards.css`, with the suppression later in the same file, so it wins at equal specificity.
Putting the hover rule in a sheet that loads _after_ `warCouncilCards.css` — which is what DLR-63's
tasks originally specified — would have silently inverted that, leaving the reduced-motion override
unreachable while every test still passed.

> **A measurement trap this file's own history now documents.** `warCouncilHunt.css`'s breach went
> undetected through both of DLR-63's review rounds because three separate measurements used
> `(Get-Content <file> | Measure-Object -Line).Lines`, which **counts a blank line as zero** and so
> undercounts a file by its blank-line count. It reported 367 for a 423-line file. Measure a stylesheet
> with `(Get-Content <file>).Count` or `[System.IO.File]::ReadAllLines(<file>).Length`. `CLAUDE.md` and
> `.claude/workflow/web-project.md` still prescribe the undercounting form; see
> [../hunt/README.md](../hunt/README.md)'s file-size note.

### The narrow/short collapse, and the bug it was written without

`warCouncilHunt.css` closes with `@media (max-width: 44rem), (max-height: 34rem)`, which collapses
the shell to a single column (`'status' 'dossier' 'table' 'hand' 'actions'` since DLR-114 — four
areas before it) and turns `.wc-dossier` into a wrapping row. `.wc-dossier` also carries `min-width: 0` and `overflow: hidden` unconditionally, so no
long readout can force the grid wider than the viewport. (The specific overflow risk that motivated
it — the Quarry's round-long rule-break sentence — is gone with the power itself as of DLR-81, but
the guard stays: `.wc-dossier` still hosts the intent telegraph and the suit-shape rows.)

That block originally restructured `.wc-shell` and `.wc-dossier` but **not `.wc-status`** — the
unwrapped flex row that had just gained a third child. At phone width the band's
content measured 744px against a 500px viewport, and the Demand cell rendered at `left: 682` —
entirely off-screen. `.wc-shell`'s `overflow: hidden` meant no scrollbar ever appeared, so the
no-scroll check passed while one of the five readouts the screen exists to show was invisible.
Every component test passed too, because jsdom has no layout engine. The fix was `flex-wrap: wrap` on
`.wc-status` and on the offending readout independently, inside that same media query — a readout
whose cells carry `white-space: nowrap` can overflow on its own even once the band has wrapped.
(The readout in question, the Hunt ledger, was deleted by DLR-80; the wrapping rule on `.wc-status`
survives, and the lesson below is why.)

The lesson is the general one for this shell: **`overflow: hidden` converts an overflow bug into an
invisibility bug rather than preventing it.** A no-scroll assertion is necessary and not sufficient;
the check that catches this class of defect is measuring a specific element's
`getBoundingClientRect()` against the viewport.

DLR-63 added the second-ever cell to `.wc-status` — the Lose-credit readout — and it inherits that
`flex-wrap` by sitting inside its own readout. Measured at 500×844, the cell's
`right` edge resolves to 446 against a 500px viewport, with no scroll on either axis. The media query
itself lives in `warCouncilHunt.css`.

DLR-71 rebuilt `.wc-status` around the health bars: `justify-content: space-between` became
`align-items: center` with `flex-wrap: nowrap`, since the bars flex to fill rather than sitting at the
two ends, and each bar carries `min-width: 0` with a `flex` basis so it **compresses before it pushes**.
The narrow-viewport block keeps `flex-wrap: wrap`, so at 500×844 the pair wraps to two rows and stays
within the viewport (rightmost edge 489). See [The duel's health bars](duel-health-bars.md).

### A centred scroll container cannot reach its own top

The same `@media (max-width: 44rem), (max-height: 34rem)` block governs `.wc-table-inner`, and that
rule produced this family's fourth browser-caught layout defect — the subtlest of them, because the
thing that broke was the _fix_ for something else.

DLR-67's end panel grew a second equation and overflowed the felt at those sizes. The fix applied was
`align-self: stretch` + `min-height: 0` + `justify-content: center` + `overflow-y: auto`, which
resolved the end panel and **broke the declare gate**. The mechanism is worth stating plainly because
it is not obvious and it generalises: **`justify-content: center` on an `overflow-y: auto` container
clips overflowing content symmetrically — half above the top edge, half below the bottom — and
`scrollTop` cannot go negative.** So the content above the top edge is unreachable at _every_ scroll
position, not merely at rest. The declare gate's own "Play to Win" heading became invisible at 680×520
and 700×544, and a click on that option failed on first attempt. Scrolling could not recover it.

DLR-71 resolved it with **`justify-content: flex-start`**, so `scrollTop: 0` shows the true top of
content, and it was forced rather than chosen: DLR-71's end panel is taller again — two equations, two
bars, a control — and its acceptance criteria gated on 1024×640 and phone portrait, so shipping without
the fix was not possible. QA re-measured the two sizes that left DLR-67 blocked: the heading is fully
visible at `scrollTop: 0` (top 362.6 in the 520px viewport, 365.3 in the 544px one) and the click
succeeds first time.

The cost is that the felt's content now **top-aligns rather than centring** at these two sizes. That is
a visible change the developer owns, and the alternative remains scoping the stretch/scroll to the
end-panel state alone — more CSS, centring preserved. A standing check accompanies the fix: grep this
sheet family for `justify-content: center` and confirm no remaining hit shares a rule with
`overflow-y: auto`, since the same pairing under a different selector is the same defect.

### The hand is a straight gapped row, laid out entirely in CSS

`HandFan.tsx` sets **no inline style at all**. Every card in `hand` renders as a `PlayingCard`
inside a `.wc-fan-slot` column, and the row's geometry is three declarations in
`warCouncilHand.css`:

- `.wc-fan` is a centred flex row with `gap: calc(var(--wc-card-w) * 0.12)`. `0.12` is a
  **placeholder the developer may retune**; the only thing it has to clear is the armed card's own
  growth. `scale(1.05)` on a card of width `w` adds `0.05w` in total, i.e. `0.025w` on each side, so
  a `0.12w` gap leaves roughly `0.095w` of clear space beside an armed card and the two boxes never
  meet.
- `.wc-fan`'s top padding, `calc(var(--wc-card-w) * 0.35)`, reserves the room the lift pushes
  outside the layout box, because the shell clips overflow. The figure is re-derived with the
  rotation term removed: the card is `aspect-ratio: 2 / 3`, so its height is `1.5w`; the armed lift
  of `20%` of that height is `0.300w`, and `scale(1.05)`'s overflow above the resting box is half
  the added height, `0.038w` — `0.338w`, rounded up to `0.35`. It was `0.4` while the fan also
  carried a `0.046w` rotation term.
- `.wc-fan-slot` carries no `z-index` and no margin, so a card's painted face and its tap target are
  the same rectangle.

`warCouncilCards.css` owns the transforms. A hand card **rests** at `translateY(0%)` — declared
rather than left at `transform: none`, so the interaction states have an explicit resting value to
transition back to — and three rules replace it outright: `-9%` on hover, `-5%` while pressed, and
`-20%` with `scale(1.05)` while armed. Those lifts are what makes a card feel selectable, and
`game-ux` counts that feedback as load-bearing rather than decoration, so they survived the fan.
`z-index: 20` lives on the armed rule and **only** there: the armed card is the only one that grows
past its own resting box, so it is the only one that needs to paint over its neighbours, and that
one declaration is now the single owner of hand-card stacking.

> **Why the fan went (DLR-149 follow-up).** The hand used to rotate each card about the row's
> centre, arc it on a lift curve, pull it left over its neighbour with a negative margin, and stack
> the slots by `z-index: index` — all computed by `fanPlacement` in `fanLayout.ts` and handed to
> `HandFan` as inline style. It produced two defects. **Cards could not be reliably selected:**
> the overlap gave each card's rightmost ~10% to its right-hand neighbour, an armed card's
> `z-index: 20` plus `scale(1.05)` plus `-20%` lift covered *both* neighbours, and a rotated card's
> bounding box extends past its own visible quad, so a click near an edge fell through to the card
> behind. Measured self-hit coverage was **76–92%** per card, and the strip stolen beside an armed
> card resolved *to the armed card* — which plays it rather than changing the selection. The row
> measures **100% self-hit coverage on every card in every state, armed included.** It also carried
> a live cascade trap worth remembering: **an inline `style.transform` always outranks an external
> rule with no `!important`**, so an earlier revision that wrote the whole `transform` from React
> made the stylesheet's hover and armed lifts permanently unreachable — a card never lifted on
> hover, in any browser, no matter what the CSS said. That is the reason not to reintroduce
> rotation and overlap by handing `HandFan` a `transform` again. `fanLayout.ts` and its spec are
> deleted; `__tests__/handRowCss.test.ts` now pins the row's contract by reading these two
> stylesheets from disk.
