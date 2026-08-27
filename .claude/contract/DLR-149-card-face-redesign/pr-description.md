# DLR-149 — Redesign the card faces

Plan: [`plan.md`](./plan.md) (this folder)
Interactive layout/interaction reference: [`mockup.html`](./mockup.html) (this folder, approved 2026-08-27)
Composition reference: [`reference-sheet.html`](./reference-sheet.html) (this folder)

## Summary

`PlayingCard` used to render just a rank numeral and a suit glyph, so a player
had no way to tell which cards in their hand carried an ability without
re-checking the rules. This rebuilds the face into three classes:

- **Acting ranks** (Swan, Fox, Woodcutter, Witch, Monarch) and the **Treasure**
  (7 — its treasure figure differs by suit: harp / chalice / sword) get a
  painting in a fixed art window plus a printed name in the corner index.
  Acting ranks get a solid heavy border; the Treasure gets a dashed border and
  a printed "no rule" mark, because it's the one card that looks special and
  does nothing.
- **Every other rank, including 8**, stays on a printed pip lattice (3×7),
  with the lower half rotated 180° so the card reads the same from either
  end. Rank 8 deliberately gets the *plain* treatment — no dashed border, no
  "no rule" mark — because AC3 states its reason for staying on pips is that
  it has no settled name, explicitly not because it's inert; giving it a
  special border would recreate the exact defect the ticket opens with.

**Why AC5 needed geometry-as-numbers.** AC5 requires that no pip and no art
window overlap either corner index, at every rank and suit, asserted
geometrically rather than by eye. jsdom has no layout engine, so that can't be
checked from a rendered component — the numbers had to leave the component
entirely. `cardFace.ts` is a pure module (no React, no DOM) that expresses
every printed rectangle in the normalised card box (0–1 per axis) and exposes
`printedRects(rank)` / `rectsOverlap(a, b)`; `cardFace.test.ts` walks every
rank × suit in the `node` Vitest project with no renderer. The stylesheet is
held to the same numbers via named `--wc-face-*` custom properties in
`warCouncilCards.css`, and `cardFaceCss.test.ts` reads the stylesheet off disk
and asserts each declared value matches its `cardFace.ts` counterpart — so a
rename or a retuned number on either side fails a test instead of silently
drifting.

**The tooltip's three channels.** No rule text is printed on any face (AC8).
`useCardTip` + `CardAbilityTip.tsx` open a bubble on hover
(`:hover`/`:focus-within`, both universally supported — no `:has()` used),
on keyboard focus, and on tap. The bubble is portalled to `document.body`
because `HandFan` gives each fan slot its own stacking context. The rule text
is *also* rendered as a visually-hidden span inside the button and joined
into `aria-describedby` at all times, so it's in the accessible tree whether
or not the bubble is open — nothing decision-relevant is hover-only.

**Elaborated suit glyphs (AC7).** `SuitMark.tsx`'s bells/keys/moons symbols
were built out so they hold up from pip size (~14px) to corner-index size
(~28px), still setting no `stroke-width` so call sites keep controlling
weight in CSS.

## Every decision the developer must make

Leading with the one that blocks two acceptance criteria:

- **`--wc-card-w`** (`warCouncil.css`) — today `clamp(2.9rem, 6.2vmin, 4.3rem)`
  (46–69px). **AC6 (printed name) and AC7 (~14px pip) are not met until this
  is chosen.** AC7's pip floor needs ≈`5.25rem` (84px); AC6's readable name
  line needs ≈`7.5rem` (120px). Drag the width slider in `mockup.html` and
  watch the two gauges.
- **`--wc-card-name-min-w`** (`warCouncilCards.css`) — the container-query
  threshold below which the printed name suppresses itself rather than
  rendering illegibly. `150px` is a visible-behaviour placeholder, not a
  choice.
- **The card's `aspect-ratio`** (`warCouncilCards.css`) — `2 / 3` today,
  `5 / 7` in the reference sheet. Toggle in `mockup.html`.
- **The twelve `--wc-fig-*` figure colours** (four tones × three suits) and
  **`--wc-grain-opacity`** (`warCouncil.css`).
- **The discard-selected treatment** — a face tint plus a centred ✕ badge is
  what this contract builds (closing a pre-existing gap: `.wc-discard-mark`
  had zero CSS rules before this work); the badge's glyph, size and tint are
  a look.

## Every behaviour to judge by playing

- **Greyscale check on the three face classes.** Take the screenshot — DLR-148
  is the recorded case where "every state reads without colour" was claimed
  and then failed its own test.
- **Whether tap-to-read-also-arms feels right.** A hand-card tap opens that
  card's rule tooltip *and* arms it in the same gesture (arming already means
  "I'm considering this card"). Only playing settles whether that reads as
  helpful or as a mis-tap.
- **Whether the skull filling the art window is the right visual.** It
  replaces DLR-148's small top-right disc — the markup stays byte-identical
  across every rank and suit, so the pinning spec still holds, but the visual
  itself is a look.

## Verification results (Phase 5)

- `npx vitest run --project node` → `Test Files 125 passed (125)`,
  `Tests 1712 passed (1712)`.
- `npx vitest run --project dom` → `Test Files 29 passed (29)`,
  `Tests 286 passed (286)`.
- `npm run typecheck` → exit 0, no output.
- `npm run lint` → exit 0, no output (0 warnings).
- `npm test` (full unfiltered suite) → `Test Files 154 passed (154)`,
  `Tests 1998 passed (1998)`.
- `npx prettier --check` on every file this contract touched → one genuine
  drift found and fixed in `CardArtSheet.tsx` (long JSX attributes not
  wrapped, a single-quoted `style` string, a missing trailing semicolon —
  pure reflow, no code change); re-verified typecheck/lint/module tests
  after the fix; second check: "All matched files use Prettier code style!"
- `npm run build` → `168 modules transformed`, `dist/assets/index-*.css`
  72.35 kB, `dist/assets/index-*.js` 328.08 kB, built in 219ms, exit 0.
- File sizes (`(Get-Content <path>).Count`), every one under the 400-line
  budget: `CardAbilityTip.tsx` 54, `CardArtSheet.tsx` 213, `cardFace.ts` 198,
  `CardFacePanel.tsx` 86 (see naming note below), `cardRuleText.ts` 34,
  `PlayingCard.tsx` 133, `SuitMark.tsx` 101, `useCardTip.ts` 59,
  `warCouncilCards.css` 351, `warCouncilCardFace.css` 365, `warCouncil.css`
  393, `WarCouncilRound.tsx` 355.
- Purity grep on `cardFace.ts` / `cardRuleText.ts` for `from 'react'`,
  `window.`, `document.`, `localStorage`, `sessionStorage` → one raw regex
  hit, confirmed to be a docblock comment ending "...identical window."
  (prose, not a DOM reference). Both modules are genuinely pure.
- Geometry-literal grep on the face components, and the old-face-orphan grep
  for `wc-is-blank` → zero hits on both.

**Two naming notes for future contributors:**

- The face component is `CardFacePanel.tsx`, not `CardFace.tsx` as the ticket
  and earlier plan text name it — Windows' case-insensitive filesystem
  collides `CardFace.tsx` with the already-existing `cardFace.ts`
  (`tsc` TS1149). Its default export is still `CardFace`.
- The face's CSS landed in a new sibling file, `warCouncilCardFace.css`, not
  in `warCouncilCards.css` — the latter was already 352 lines and the
  tooltip block would have carried it over the 400-line budget.

## The new convention

**Geometry lives in `cardFace.ts` and is mirrored into `warCouncilCardFace.css`,
with `cardFaceCss.test.ts` as the guard.** Change one side and the spec
fails — that's the intended way to find out, not a coincidence to avoid.

## One more thing to know

`fanLayout.ts` still fans the hand (`rotateDeg`/`liftPct` transforms), while
`mockup.html` lays the hand out side by side per the developer's 2026-08-27
red-line direction. Reconciling the two is deliberately **not** in this
contract's file map — it changes `fanLayout.ts`'s transform rules and needs
its own ticket.
