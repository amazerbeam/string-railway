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

### The Hunt readouts each carry their own accessible name

DLR-53's four readouts are bare numbers whose meaning lives in a separate visual key element, which
a screen reader would otherwise announce as an unlabelled run of digits. Each therefore carries its
own `aria-label` while the visual key is `aria-hidden`: `HuntLedger`'s four cells ("Running Spoils:
N", "Standing band: Victorious, multiplier 6", "Score so far: N", "The Demand: N"),
`QuarryDossier`'s region and trick count, and `RoundOverPanel`'s three equation parts.

`IntentTelegraph` goes further and hides *all* its visible text, carrying one `aria-label` on the
container built by `intentAccessibleName` — so the eyebrow and the line are heard as one sentence
rather than two fragments. Its `role="status"` announces a changed intent without stealing focus
from the hand.

One collision worth knowing about: `HuntLedger` stays mounted in the status band while
`RoundOverPanel` is on the felt, so the panel's Demand deliberately reads "Demand for this Hunt: N"
rather than reusing the ledger's "The Demand: N". Identical names across two simultaneously-mounted
components make a `getByLabelText` query ambiguous.

### While a prompt is open, the fan leaves the accessibility tree

`AbilityPrompt` renders a live, enabled button for every remaining hand card, using the same
`cardAccessibleName` those cards already have in `HandFan` — so with both visible, a screen-reader
user scanning a flat buttons list met every name twice, one disabled and one actionable, with nothing
but document order to tell them apart. `HandFan` now sets `aria-hidden` on `.wc-fan` when a prompt is
open. `promptOpen` is true only when `interactive` is false, which forces every card in the fan
`disabled`, so nothing focusable ever sits inside the hidden subtree.
