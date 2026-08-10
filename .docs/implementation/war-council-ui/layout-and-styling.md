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

The styling ships as **three** stylesheets, not one: `warCouncil.css` (tokens, the shell grid, the
status band, the felt/table, and the hand container), `warCouncilCards.css` (the card face, the
ability prompt, and the round-over panel), and `warCouncilHunt.css` (DLR-53: the ledger, the dossier
zone, the telegraph, and the end panel's equation). The first split happened because the combined
transcription measured 581 lines, over this project's 400-line file budget; the second happened for
the same reason — `warCouncil.css` was at 367 lines and could not absorb a new zone plus four new
surfaces. `WarCouncilRound.tsx` imports **all three**, and importing only some leaves part of the
feature unstyled with no error anywhere — worth knowing before debugging a card that renders with no
face or a ledger that renders as an undifferentiated run of text.

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
