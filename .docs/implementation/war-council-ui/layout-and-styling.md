_Part of [War Council UI](README.md)._

### A full-viewport shell, never a page

`WarCouncilRound.tsx` renders one `.wc-shell` grid, defined in `warCouncil.css`:
`height: 100dvh; width: 100%; overflow: hidden; display: grid`, with `env(safe-area-inset-*)`
padding. DLR-53 gave it a second column for the Quarry dossier zone:

```css
grid-template-rows: auto 1fr auto;
grid-template-columns: minmax(10rem, 17vw) 1fr;
grid-template-areas:
  'status  status'
  'dossier table'
  'hand    hand';
```

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
area collapses at short viewports. The fan container carries explicit `min-height` and padding
because **card rotation and lift are transforms, which do not affect layout size** — without
reserved room the fan's visual pixels spill outside its box and the shell's `overflow: hidden` crops
them. The fix is to reserve the room, never to loosen the overflow.

The styling ships as **six** stylesheets, not one: `warCouncil.css` (tokens, the shell grid, the
status band, the felt/table, and the hand container), `warCouncilCards.css` (the card face, the
ability prompt, and the round-over panel), `warCouncilHunt.css` (DLR-53: the ledger, the dossier
zone, the telegraph, and the end panel's equation), `warCouncilDeclare.css` (DLR-63: the declare
gate and the claim control), `warCouncilStandingTrack.css` (DLR-68: the Standing track), and
`warCouncilHealthBars.css` (DLR-71: the duel's two health bars).
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

`warCouncilStandingTrack.css` carries **its own copy of the `@media (max-width: 44rem),
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
> cost; two copies of a *rule* inside them is a bug that no test can see.

`WarCouncilRound.tsx` imports **all six**, in that order, and importing only some leaves part of the
feature unstyled with no error anywhere — worth knowing before debugging a card that renders with no
face, a ledger that renders as an undifferentiated run of text, a declare gate that renders as two
default browser buttons, a Standing track that renders as a bare row of empty spans, or a health bar
that renders as an empty box with no fill and no mirror.

**Import order is load-bearing, not incidental.** `.wc-declare-option`'s hover lift and its
`@media (prefers-reduced-motion: reduce)` suppression are deliberately co-located in
`warCouncilCards.css`, with the suppression later in the same file, so it wins at equal specificity.
Putting the hover rule in a sheet that loads *after* `warCouncilCards.css` — which is what DLR-63's
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
the shell to a single column (`'status' 'dossier' 'table' 'hand'`) and turns `.wc-dossier` into a
wrapping row. `.wc-dossier` also carries `min-width: 0` and `overflow: hidden` unconditionally, so a
long rule-break sentence cannot force the grid wider than the viewport.

That block originally restructured `.wc-shell` and `.wc-dossier` but **not `.wc-status`** — the
unwrapped flex row that had just gained `HuntLedger` as its third child. At phone width the band's
content measured 744px against a 500px viewport, and the Demand cell rendered at `left: 682` —
entirely off-screen. `.wc-shell`'s `overflow: hidden` meant no scrollbar ever appeared, so the
no-scroll check passed while one of the five readouts the screen exists to show was invisible.
Every component test passed too, because jsdom has no layout engine. The fix is `flex-wrap: wrap` on
both `.wc-status` and `.wc-ledger`, inside that same media query — the ledger needs it
independently, since its five `white-space: nowrap` cells and three operators can overflow on their
own even once the band has wrapped.

The lesson is the general one for this shell: **`overflow: hidden` converts an overflow bug into an
invisibility bug rather than preventing it.** A no-scroll assertion is necessary and not sufficient;
the check that catches this class of defect is measuring a specific element's
`getBoundingClientRect()` against the viewport.

DLR-63 added the second-ever cell to `.wc-status` — the Lose-credit readout — and it inherits that
`flex-wrap` by sitting inside `.wc-ledger`. Measured at 500×844 with the pool visible, the cell's
`right` edge resolves to 446 against a 500px viewport, with no scroll on either axis. The media query
itself now lives in `warCouncilHunt.css` after the split; the declare and claim surfaces it does not
govern moved to `warCouncilDeclare.css`.

DLR-71 rebuilt `.wc-status` around the health bars: `justify-content: space-between` became
`align-items: center` with `flex-wrap: nowrap`, since the bars flex to fill rather than sitting at the
two ends, and each bar carries `min-width: 0` with a `flex` basis so it **compresses before it pushes**.
The narrow-viewport block keeps `flex-wrap: wrap`, so at 500×844 the pair wraps to two rows and stays
within the viewport (rightmost edge 489). See [The duel's health bars](duel-health-bars.md).

### A centred scroll container cannot reach its own top

The same `@media (max-width: 44rem), (max-height: 34rem)` block governs `.wc-table-inner`, and that
rule produced this family's fourth browser-caught layout defect — the subtlest of them, because the
thing that broke was the *fix* for something else.

DLR-67's end panel grew a second equation and overflowed the felt at those sizes. The fix applied was
`align-self: stretch` + `min-height: 0` + `justify-content: center` + `overflow-y: auto`, which
resolved the end panel and **broke the declare gate**. The mechanism is worth stating plainly because
it is not obvious and it generalises: **`justify-content: center` on an `overflow-y: auto` container
clips overflowing content symmetrically — half above the top edge, half below the bottom — and
`scrollTop` cannot go negative.** So the content above the top edge is unreachable at *every* scroll
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

### The fan's transform is composed in CSS, not written whole from React

`HandFan.tsx` sets only two CSS custom properties inline per card — `--wc-fan-rot` and
`--wc-fan-lift`, both carrying `fanPlacement`'s numbers as ready-made transform-function strings
(e.g. `rotate(2.1deg)`, `translateY(0.13%)`) — and never sets `transform` itself.
`warCouncilCards.css` owns the one rule that reads them
(`transform: var(--wc-fan-lift, …) var(--wc-fan-rot, …)`), plus the hover/active/armed rules that
replace the lift component outright, matching the approved mockup's own stylesheet.

This split exists because **an inline `style.transform` always outranks an external rule with no
`!important`**. When the base placement's `transform` was previously written whole from React, the
hover-lift and armed-lift rules already present in the stylesheet were permanently unreachable — a
card never actually lifted on hover, in any browser, no matter what the CSS said. `fanPlacement`
guards `count > 1` before dividing, so neither custom property can carry a `NaN`; a `NaN` inside a
`transform` string produces an invalid declaration the browser silently drops, which would flatten
the fan with no error anywhere.
