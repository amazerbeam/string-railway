_Part of [War Council UI](README.md)._

### One roving tabindex, shared by the hand and the ability prompt

`useRovingTabIndex(count, isFocusable, onCancel)` is the mechanism both components use: one tab stop
over a flat list of `count` sibling controls, arrow keys among the focusable ones, `Home`/`End` to
the ends, `Escape` to cancel. `HandFan` calls it with the engine's own legal moves as the focusable
set, so illegal cards are skipped rather than becoming dead stops — a `disabled` button cannot take
focus. `AbilityPrompt` calls it with every offered choice always focusable (a Fox may exchange any
held card, a Woodcutter may discard any held card or the one just drawn), over the flattened list of
hand cards plus — per rank — the decline button or the drawn card.

It was extracted rather than duplicated once the prompt needed it: an unwired prompt gave every
offered card its own tab stop, up to a dozen against a large hand, which is exactly what `game-ux`'s
hard floor rules out. `Enter` and `Space` need no handling anywhere — they activate the focused
`<button>` natively.

**One invariant it binds by string:** `focusIndex` locates its target with
`groupRef.current?.querySelectorAll('button')`, so it assumes every focusable child in the group is a
native `<button>`. Swapping `PlayingCard`'s or the decline control's root element away from `<button>`
would silently stop arrow-key navigation — the call is optional-chained, so nothing throws, no test
fails differently, and TypeScript cannot see it. A comment in the hook states this.

### `AbilityPrompt` focuses its group on mount without re-stealing focus every render

`AbilityPrompt.tsx`'s wrapping `<div>` focuses itself via a callback ref (`attachGroup`) the instant
it mounts, because the just-tapped card is disabled the moment the prompt opens and real focus drops
to `<body>` — without this, `Escape` would have nothing to bubble to.

A verification round found a keyboard trap this introduced. As a plain function defined inline in the
component body, `attachGroup` has a new identity every render, and React detaches and reattaches a
callback ref — calling it with `null`, then the new function — whenever its identity changes, even
when the underlying DOM node hasn't. The earlier version called `element.focus()` unconditionally, so
it re-fired on _every_ re-render, including the render an arrow key itself causes, stomping the focus
`useRovingTabIndex` had just moved a moment earlier in the same keydown. The `tabindex` attribute
bookkeeping advanced correctly while real `document.activeElement` snapped straight back to the group
container, so `Enter`/`Space` on the "focused" card did nothing: a keyboard-only player whose only
legal card was a Fox or Woodcutter was stuck in an unbreakable loop.

The fix is a **guard**, not a stable ref identity: this project's `react-hooks/refs` rule forbids
reading a ref's `.current` synchronously during render, which a stable-identity fix
(`useRef(fn).current`) would need. So `attachGroup` stays a plain inline function and instead refuses
to call `.focus()` when the group already contains `document.activeElement`. That is sufficient
because `useRovingTabIndex`'s `focusIndex` moves real focus synchronously inside the keydown handler,
strictly before React re-renders and the ref reattaches — by the time the callback re-fires, the
newly-focused card is already `document.activeElement` and the `contains` check is `true`.

`AbilityPrompt.test.tsx`'s arrow-key spec now asserts `document.activeElement` directly rather than
only the `tabindex` attribute. The attribute-only version passed throughout, which is exactly why the
defect went undetected by every test and was found only by QA driving the app in a real browser.

**DLR-97 gave the prompt's mount a visible entrance, orthogonal to the focus fix above.** Before this
pass `.wc-prompt` had no transition at all — it appeared instantly, which the developer's own
playtest note called jarring ("it's jarring when the card moves up beside the selectable cards").
`warCouncilCards.css` now gives `.wc-prompt` a `wc-prompt-enter` `@keyframes` (fade + `translateY`
rise) that plays automatically on mount, timed by a new `--wc-prompt-enter-ms` token (180ms,
`warCouncil.css`'s `:root`), with a `prefers-reduced-motion: reduce` guard. This is CSS-only and adds
no component state — `.wc-prompt` already only exists while a choice is being made, so a
mount-triggered keyframe needed nothing beyond the class it already has. It does not touch the
`attachGroup`/roving-tabindex mechanism documented above; the two are independent.

### The Hunt readouts each carry their own accessible name

The dossier readouts are bare numbers whose meaning lives in a separate visual key element, which a
screen reader would otherwise announce as an unlabelled run of digits. Each therefore carries its own
`aria-label` while the visual key is `aria-hidden`: `QuarryDossier`'s region and trick count, and
since DLR-80 `QuarryShape`'s per-suit rows and `BankMeter`'s figures.

**`QuarryShape`'s rows** read `"<Suit>: N held, M skulled"` — or `"…, none skulled"` at zero — built
by `labels.ts`'s `suitShapeRowText`, which is the **single owner** of that phrase and is also what
`quarryShapeText` composes its whole-shape sentence from. Each skull glyph inside a row is
additionally a `role="img"` carrying `SKULL_MARK_LABEL`, so the count is announced rather than left
to a visual tally of repeated glyphs.

**A skulled card announces itself.** `cardAccessibleName` takes a `skulled` flag and appends a
suffix, so the skull is in the accessible name and not only in the glyph — which is what makes the
"skulls are visible before you commit" rule hold for a screen-reader user as well as a sighted one.

> Retired by DLR-80: `HuntLedger`'s cells and `RoundOverPanel`'s three equation parts. The hand-over
> panel now renders a plain tally table rather than an equation, so its figures are labelled by their
> own row headers rather than by hand-written `aria-label`s.

**DLR-71 added the two health bars, and they are the module's first `role="meter"` elements.** Each
carries `aria-label` (`"Your health"` / `"The Quarry's health"` — the two must differ, since that is how
a test and a screen-reader user both tell them apart), `aria-valuemin`/`max`/`now`, and an
`aria-valuetext` sentence built by `healthBarValueText`. The `valuetext` exists because
**`aria-valuenow` can carry only one number** and the display carries two: the current health and the
pending damage. It also states the lethal case outright rather than making a listener compare two
figures. See [The duel's health bars](duel-health-bars.md).

**DLR-86 turned the bars into heart rows without touching any of that**, and the fact that the whole
query surface survived is the load-bearing part rather than an incidental one: every existing spec
reads these meters by `getByRole('meter', { name })` and `aria-valuenow`, so a passing suite is the
evidence that the accessible reading did not regress while the picture changed completely. Each
individual heart is `aria-hidden` — the meter above the row already carries the reading, and a screen
reader counting eighteen glyphs would be stating the same figure a second time.

The one deliberate addition: `healthBarValueText` **appends an at-risk clause when, and only when,
`pending > 0`** — `"10 of 10. 6 at risk."`, or `"10 of 10. 12 at risk. Lethal."`. Its no-pending
output is byte-identical to DLR-80's, which is exactly what the untouched pre-DLR-86 assertions pin.
The reasoning is that DLR-86 gives a sighted player a preview of what the banked streak would cash
for, and **a meter whose text is less true than its picture is worse than one with no picture**.
Withholding the preview from assistive tech would have been the alternative; it was rejected on those
grounds. The wording is placeholder copy and the call itself is flagged for the developer, since the
brief asked for neither.

**The five heart states read without colour, and without motion.** `whole` and `broken` bind to two
different `<symbol>`s — a solid heart against a cracked outline — so the row separates in greyscale;
opacity, colour and the two animations are reinforcement, never the only signal. Under
`prefers-reduced-motion: reduce`, `warCouncilHealthBars.css` sets `animation: none` on the `atRisk`
and `breaking` states and pins `breaking` to the colour its keyframe would otherwise have landed on.
Nothing else changes, because the resting appearance was already carrying every state before
either animation ran — which is what makes the reduced-motion guarantee structural rather than a
second set of rules to keep in step. jsdom evaluates no media query, so this one is held by static
review of the stylesheet rather than by a test.

**DLR-101's `doomed` needed no reduced-motion entry at all, and that is the same guarantee reached
one step earlier.** It was four states until that ticket. A committed hit is static by decision —
`atRisk` flashes because it is conditional and evaporates if the streak breaks — so there is no
animation to suppress, and the state loses nothing when motion is off. It binds to the **solid**
`<symbol>`, the same one `whole` uses, so it reads as *standing*, which it is; only fill and opacity
separate it. **Whether it separates from `atRisk` and `whole` at a glance is unverified visually** —
QA could not reach a live poisoned trick in a browser (see [README.md](README.md)'s Deferred list),
and the opacity that carries much of the distinction is an unchosen placeholder.

**The meter's text was split rather than extended** (DLR-101). `healthBarValueText` now emits the
booked figure as its own clause — `14 of 14. 3 at risk. 4 poisoned.` — instead of folding poison into
the at-risk figure, for the reason above: the spoken text would otherwise have called *committed*
damage "at risk", which is the picture-versus-text failure this section already names. Either clause
is omitted at zero, so a bar with neither reads exactly as it did before. The wording is placeholder.

`IntentTelegraph` goes further and hides *all* its visible text, carrying one `aria-label` on the
container built by `intentAccessibleName` — so the eyebrow and the line are heard as one sentence
rather than two fragments. Its `role="status"` announces a changed intent without stealing focus
from the hand.

One collision hazard worth keeping in mind: the dossier readouts stay mounted while `RoundOverPanel`
is on the felt, so any accessible name the panel introduces must not duplicate one already on screen
— identical names across two simultaneously-mounted components make a `getByLabelText` query
ambiguous. The DLR-80 panel avoids it by using a table with row headers rather than labelled figures.

### While a prompt is open, the fan leaves the accessibility tree

`AbilityPrompt` renders a live, enabled button for every remaining hand card, using the same
`cardAccessibleName` those cards already have in `HandFan` — so with both visible, a screen-reader
user scanning a flat buttons list met every name twice, one disabled and one actionable, with nothing
but document order to tell them apart. `HandFan` now sets `aria-hidden` on `.wc-fan` when a prompt is
open. `promptOpen` is true only when `interactive` is false, which forces every card in the fan
`disabled`, so nothing focusable ever sits inside the hidden subtree.
