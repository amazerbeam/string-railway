Part of [Run verdict and shop UI](README.md).

# The run map, and the one screen that serves both the start and the map

DLR-85 added the run's third and fourth surfaces — except that it added **one component** used twice.
`RunPathScreen` is the start screen shown before fight one **and** the map reached between fights; the
two differ only in their title and their button's label, so two sibling components would have been
duplication for a two-string difference.

Inside it, `RunMap` draws the path itself: one horizontal line, a short **tick** per ordinary opponent
and a filled **block** per stage boss, in run order, every node named.

## Neither component computes anything

`RunMap` takes `stages: readonly PathStage[]` and a pre-worded `goalText: string`, and that is all.
Stage grouping and node status both arrive **already decided** by `src/hunt/runPath.ts`, so the
component cannot disagree with the run module about who has been beaten. `RunPathScreen` adds
`title`, `actionLabel` and `onAction` — the labels arriving already worded from `runLabels.ts`, never
built here.

The only local expression in either file is `RunMap`'s
`stages.reduce((n, stage) => n + stage.nodes.length, 0)`, which exists solely to mark the **final**
node with `data-final` so the last boss can be drawn differently from the other four. It is a count,
not a rule.

This is `ShopPanel`'s stated discipline, followed deliberately: that component's own docblock says
"Computes NOTHING … Every figure … arrive[s] as props", and it was named in the contract as the
pattern for both new files.

## The path is a status display, not a control group

Nothing on the path is clickable. Route choice — branching, picking between nodes — is explicitly out
of scope for DLR-85, so there was nothing for a node to *do*.

That decision is what keeps the accessibility right rather than merely present. The path is an `<ol
className="run-path">` carrying `aria-label={RUN_MAP_GROUP_LABEL}`, with a nested `<ol
className="run-path-stage-nodes">` per stage and one `<li className="run-path-node">` per opponent.
`aria-current="step"` sits on the current node — and **only** on it, since `runPath` guarantees at
most one.

There are **no tab stops at all**, and a spec asserts it
(`RunMap.test.tsx` → "adds no tab stops — the path is a status display, not a control group", which
queries `button, a, [tabindex]` and expects zero). `game-ux`'s roving-tabindex rule is about
navigating a *collection of controls*; twenty-five tab stops on unclickable glyphs would breach its
interaction-cost threshold rather than satisfy its keyboard one.

> **The nesting is `ol > li > ol > li`, and it has to be.** An `<li>` cannot directly contain another
> `<li>` — the parser would close the outer one and make the stage's nodes its siblings, flattening
> the grouping the CSS and the tests both depend on. The inner list is therefore a real element with
> its own class, and that class needing a layout rule is what the fix below is about.

## Every state reads without colour

`game-ux` requires each state distinguishable in **form**, not only in tone, so a greyscale screenshot
still tells them apart:

| State                | Carried by                                                                   |
| -------------------- | ---------------------------------------------------------------------------- |
| ordinary vs **boss** | a thin `.run-path-tick` against a filled `.run-path-block`                   |
| **beaten**           | the name sits inside an `<s>` element — struck out, and still present         |
| **current**          | a taller glyph plus a caret (`.run-path-node[data-status='current'] .run-path-glyph::after`) that no upcoming node has |
| the **final** boss   | `data-final='true'` draws the last block differently from the other four      |

AC6's "struck out, not removed" is structural rather than stylistic: the beaten node stays in the list
and gains an `<s>`, and the spec counts `.run-path-name s` rather than checking a colour.

Names are **angled about −52° below the line, right-aligned to their node** — the developer's choice
from the approved mockup, over a vertical writing mode that also fits but reads worse. Twenty-five
horizontal names at 1280px would give each about 50px, and "Conchobhar" does not fit at a readable
size.

## `Escape` is a container handler, and there is no effect in either file

```tsx
<div className="run-path-screen" onKeyDown={(e) => { if (e.key === 'Escape') onAction() }}>
```

`Escape` fires the same action as the button — `Back` on the map, and the begin action on the start
screen — matching `ShopPanel`'s contract. It is an `onKeyDown` on an element React already owns, **not
a document listener**, so there is nothing to register and therefore nothing to release. **Neither new
file contains a `useEffect`, a timer, an observer or a `requestAnimationFrame`**, and neither contains
`memo`, `useMemo` or `useCallback`.

## The shell is reused, not redefined

`RunPathScreen` mounts inside `run.css`'s existing `.run-shell` — `100dvh`, `width: 100%`,
`overflow: hidden`, `env(safe-area-inset-*)` padding — and `runMap.css` adds **no second shell**. It
reuses `.run-btn` for the action too. So there remains exactly one full-viewport grid in the codebase
to keep right, which is the whole point of the reuse.

`runMap.css` holds only the path's own classes, and its header records what every sibling stylesheet
here records: **every `clamp()` bound, the −52° angle, the name font size and every colour in it is the
developer's to retune.** All of it is transcribed from the contract's approved `mockup.html`.

## The AC3 defect, and what it cost to find

`RunMap` renders each stage's nodes into `<ol className="run-path-stage-nodes">`, and the first version
of `runMap.css` **never defined that class**. An `<ol>` with no rule defaults to `display: block`, so
every stage's nodes stacked **vertically** and the path rendered as a 5-column × 5-row grid instead of
one horizontal line — a straight failure of AC3's "laid out along one horizontal path in run order".

**Every test passed.** `jsdom` has no layout engine, so the component specs — which assert glyph
counts, struck-out names, `aria-current`, and the absence of tab stops — could not see it. It was
caught by QA driving the real browser, reading `getComputedStyle(...).display` and the
`getBoundingClientRect()` of all twenty-five nodes.

The fix adds the missing structural rule:

```css
.run-path-stage-nodes {
  display: flex;
  align-items: flex-start;
  list-style: none;
  margin: 0;
  padding: 0;
}
```

Those values are copied from the already-approved `.run-path-stage` rule; no tuning value was chosen
or changed. A regression spec now pins the structure the rule targets — every stage's node list is an
`<ol.run-path-stage-nodes>` holding its `.run-path-node` children directly.

> **That spec is honest about its own limit, and the limit matters.** It catches the wrapper being
> renamed or dropped. It **cannot** catch the CSS declaration being deleted again with the DOM left
> intact, because `jsdom` never applies the stylesheet. The test says so in a comment. The real guard
> against that regression is a browser check, not a Vitest run — which is worth remembering before
> trusting it.

## AC11 is not met, and it is a silent crop

**This is the contract's one unmet acceptance criterion.** The restored horizontal layout does not fit
below roughly 1088px of usable width, and `.run-shell` is `overflow: hidden` — so nodes past the right
edge are **cropped, not scrolled**, with nothing on screen to say so.

Measured by QA against `getBoundingClientRect()` on all twenty-five nodes:

| Viewport      | Nodes visible | Also lost                                    |
| ------------- | ------------- | -------------------------------------------- |
| 1280 × 800    | 25 / 25       | —                                            |
| 1024 × 768    | 21 / 25       | —                                            |
| 768 × 1024    | 16 / 25       | —                                            |
| 500 × 844     | 14 / 25       | **Diarmuid**, the title, and half the button |

Round 1 of review did **not** catch this, and the reason is worth recording: the broken vertical-stack
layout happened to be *more compact* than the intended one, so it fitted. Fixing AC3 is what made
AC11 fail.

The plan named this as its top AC11 risk in advance, and named the three honest fixes — **a smaller
name font, a steeper angle, or letting the path itself be the one horizontally-scrolling region**
(which `game-ux` permits if scoped and justified). All three are tuning or layout decisions that are
**the developer's**, so none was applied. Narrower than 500px was not directly observable — the
resize tool floors at `innerWidth: 500` — and would be worse, not better.

## Testing

Both files are covered by component specs querying by accessible role and label, under the `dom`
Vitest project: `src/app/run/__tests__/RunMap.test.tsx` (names on every node, the goal line, the
labelled group, tick-vs-block counts, beaten nodes struck out and still present, exactly one
`aria-current` node, zero tab stops, a flat run rendering one stage with no block, and the
node-list structure) and `src/app/run/__tests__/RunPathScreen.test.tsx` (title, goal, path, exactly one
button named by its prop, the action firing on click, and the action firing on `Escape`).

Both files pair `render` with `afterEach(cleanup)`, matching every sibling spec in this repo — there is
no global auto-cleanup configured, so without it DOM nodes from earlier `it()` blocks accumulate and
`getByText` fails on duplicates.
