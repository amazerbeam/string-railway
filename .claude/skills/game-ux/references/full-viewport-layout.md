# Full-viewport layout — Reference

Detail behind `SKILL.md` → *The screen fills the viewport and never scrolls* and *Zone the screen*.

## Scope

**Structural — permanent, safe to rely on.** The shell pattern, the zone model, the reasoning behind each unit choice, the roving-tabindex model, and the verification approach. These are design decisions, not version facts.

**Dated — re-check before relying on it.** Browser-support baselines. The support statements below were written **August 2026**; support only ever widens, so a stale note here understates rather than misleads. If a support claim is load-bearing for a decision, verify it rather than quoting this file.

**Not owned here.** React and CSS conventions, the generic accessibility floor (≥44px, `:focus-visible`, `@media (hover: hover)`, `touch-action`, semantic HTML/ARIA) — `.claude/skills/react-frontend/SKILL.md`. Runner commands and paths — `.claude/workflow/web-project.md`. Nothing in this file restates them.

## Which viewport unit

| Unit | Measures | Use it when |
|---|---|---|
| `vh` | The **large** viewport — browser toolbars treated as retracted | Effectively never for a game shell. On mobile this is taller than what the player can see on load, so the bottom of the layout starts underneath the address bar. This is the bug people mean by "100vh lies". |
| `svh` | The **small** viewport — toolbars treated as visible | The stable default. Fits on load, and never reflows when chrome hides. A little vertical space is left unused when toolbars retract. |
| `lvh` | The large viewport, named honestly | Deliberately immersive layouts that should fill the maximum area and accept clipping while chrome is showing. |
| `dvh` | The **current** viewport, live | When the layout should track chrome appearing and disappearing. Costs a reflow each time, which is visible as content jumping while scrolling on mobile — for a non-scrolling game shell that cost rarely materialises, which is what makes `dvh` a reasonable default here. |

Width has the same trap for a different reason: **`100vw` includes the width of a classic scrollbar**, so on a desktop browser that reserves scrollbar space, `width: 100vw` is wider than the visible area and produces horizontal overflow. `100%` on a full-width ancestor, or `100dvw`, avoids it. The newer viewport units did **not** fix this — it is a separate problem from the mobile-toolbar one.

`svh`, `lvh`, and `dvh` reached Baseline Widely Available in June 2025 and are supported by every major engine.

## The shell

A game screen is a fixed grid of named zones. Build this before placing content — retrofitting it around a laid-out screen is the expensive order.

```css
.game-shell {
  /* One of svh / dvh, chosen deliberately — see the table above. */
  height: 100dvh;
  width: 100%;
  overflow: hidden;

  display: grid;
  /* Fixed bands top and bottom; the play area absorbs the slack. */
  grid-template-rows: auto 1fr auto;
  /* Name the zones after what they hold, not where they sit. */
  grid-template-areas:
    'status'
    'play'
    'hand';

  /* Keep clear of notches, home indicators, and rounded corners. */
  padding:
    env(safe-area-inset-top) env(safe-area-inset-right)
    env(safe-area-inset-bottom) env(safe-area-inset-left);
  box-sizing: border-box;
}
```

`env()` takes a fallback as a second argument — `env(safe-area-inset-top, 0px)` — for browsers or devices with no inset. A bare `env()` on an unsupported browser resolves to nothing and the declaration is dropped, which is usually the behaviour you want anyway.

Two shell rules worth stating because they are easy to lose:

- **`overflow: hidden` belongs on the shell, not on `body`** alone. If a region genuinely must scroll, give that region `overflow-y: auto` and record why in a comment — an unexplained scrolling region is how a no-scroll layout quietly stops being one.
- **`1fr` on the play area, `auto` on the bands.** Reversing this makes the hand grow and the play area collapse at short viewports, which is exactly backwards: the play area is the part with a variable amount to show.

## Sizing content to fit rather than pushing the layout

With `overflow: hidden`, content that does not fit is content the player cannot see — so sizing must be bounded, not intrinsic.

```css
.card {
  /* min / preferred / max — the min and max are tuning values a developer picks. */
  width: clamp(2.5rem, 7vmin, 4.5rem);
  aspect-ratio: 2 / 3;
}
```

- **`vmin` rather than `vh` or `vw`** for anything that should stay proportional in both orientations.
- **`aspect-ratio`** keeps a card a card without a second dimension to keep in sync.
- **A crowded collection can overlap instead of shrinking further.** A negative inline margin fans a hand so a wide collection stays inside its band without each card becoming unreadable. The overlap amount is a tuning value.
- **The min and max bounds, and any overlap amount, are the developer's** (`SKILL.md` → *Decisions that are not yours*). Name the key, ship a documented default, and say it is a placeholder.

## Size a tile against the container it actually gets, not the screen

A `clamp()` in `vw`/`vmin` sizes a card against the **viewport**, but the card lives in whatever is
left after the rails, panels and gutters have taken their share. Those are not the same number, and
the gap is usually large.

**Measure the container before choosing the bound.** On DLR-148 the buff grid was assumed to be
~1167px wide inside a 1440px viewport; it was **787px**. The card bound had been set from the wrong
figure, so sixteen tiles wrapped to three rows instead of two, the panel overflowed by 56px, and the
group that had to stay visible was pushed below the fold. Nothing looked broken — it just quietly
hid the thing the screen existed to show.

```js
// in the browser, before picking the bound
const grid = document.querySelector('.grid')
const gap  = 13                                   // whatever the computed gap is
const perRow = 8                                  // how many you need per row
const maxCardWidth = (grid.clientWidth - (perRow - 1) * gap) / perRow
```

Then set the `vw` term so it lands under that at your reference viewport, and **re-assert the
overflow** — the bound is still a tuning value the developer owns, but *which* values are viable is a
measurement, not a preference.

## A group label costs a row; an in-flow tile costs a cell

Grouping tiles inside a fixed-height panel is where headings get expensive. A heading above each
group consumes a full row of vertical budget per group, whether the group holds one tile or eight.

On the same screen, four suit groups with headings needed roughly **800px** against the **416px** the
panel had. Replacing each heading with a **tile-shaped label sitting in the flow of the same grid** —
one grid cell, same dimensions as a card — dropped the cost to four cells: sixteen cards plus four
labels is twenty cells, exactly two rows of eight, and the fenced group stayed on screen.

Reach for the in-flow label when the panel's height is fixed and the groups are small. Reach for a
heading when the page can scroll, or when groups are large enough that a row of chrome per group is
a rounding error.

## Pin a tile's bottom element to one line

Anything anchored to the **bottom** of a tile that can wrap will grow *upward* into whatever sits
above it — and then no percentage position above it is safe, because its height is data-dependent.

This fails intermittently, which is what makes it nasty: on DLR-148 twelve buff cards were clean and
exactly two were broken, because only those two had reward text long enough to wrap onto a second
line. `white-space: nowrap` on the bottom element makes its height a constant and every position
above it computable. If the text genuinely cannot fit on one line, shorten the *text* — a truncated
payoff is worse than a shorter phrasing.

The same applies to a wrapping top row: pin it with `flex-wrap: nowrap` and size its contents down,
rather than letting it push into the title beneath.

## Zone model

```
┌──────────────────────────────────────────────┐
│ status  opponent + shared state, edge-anchored│  auto
├──────────────────────────────────────────────┤
│                                              │
│ play    shared area, bounded, condensed cards │  1fr
│                                              │
├──────────────────────────────────────────────┤
│ hand    your controls, thumb-reachable        │  auto
└──────────────────────────────────────────────┘
```

- **Your own resources sit next to your own side**, so the thing you spend and the thing you spend it on are read in one glance.
- **Status is anchored to an edge.** Letting status displays creep toward the centre is a named mistake in card-game UI teardowns: it squeezes the play area, which is the zone whose content actually varies.
- **A played card is a record, not a choice** — render it condensed. Full hand-card dimensions in the play area spend the most valuable part of the screen on information the player has already acted on.
- **Reserve the space a transient state needs.** A zone that is empty until something resolves and then grows shifts everything around it at the moment the player is reading it.

## The round-end summary teaches through what the player *didn't* use

A between-rounds summary that reports only what happened is a receipt. A summary that also reports the
options that went **unused** — resources not spent, rerolls not taken, an ability never fired — teaches
the player that those options exist at all, which is the one moment they have attention to spare for
learning something.

The observation this comes from: a first Balatro session where the round-end line "0 purchased, 0
rerolled" was what revealed two systems the player had not noticed while playing. The zeros did the
teaching, not the score.

Two properties make this cheap rather than clever:

- **It needs no new surface.** The panel already exists; this is a row on it.
- **It is usually already instrumented.** "Was this resource left unspent" is the same number a
  designer needs to know whether the resource's budget is too generous — so one line can settle a
  tuning question and teach the player at once.

The reject condition is the ordinary one: a summary is read once per round, so it may not carry
anything the player needs *during* a round. If a number belongs to a live decision, it belongs on the
screen the decision is made on.

Source: developer play session, recorded at `prototype/.docs/design/Balatro-Forbidden-Solitaire/balatro-play-notes.md`
(note 7, and §3.4 for the worked application). This is one session's observation, not researched
literature — treated as a pattern worth reusing, not as an established principle.

## Keyboard navigation within a collection

The WAI-ARIA composite-widget model, applied to a hand or a row of tiles:

| Key | Behaviour |
|---|---|
| `Tab` / `Shift+Tab` | Move **to and from** the collection as a whole — one stop, not one per item |
| `Arrow` keys | Move **within** the collection, updating which item holds `tabindex="0"` |
| `Enter` / `Space` | Activate the focused item |
| `Escape` | Cancel the current selection without activating |

Exactly one item carries `tabindex="0"` at a time; every other item carries `tabindex="-1"`, which keeps it focusable by script and reachable by arrow key while removing it from the tab sequence. The container carries the group's accessible name.

Two failure modes to avoid: `tabindex="-1"` combined with `aria-hidden="true"` removes an item from *both* the keyboard path and the screen-reader path, which is almost never intended; and moving `tabindex` without also moving DOM focus leaves the visible focus ring behind, so do both.

All of this is assertable in a component test — focus movement, activation, and `Escape` — unlike the layout claims above.

## Verifying a no-scroll layout

**jsdom has no layout engine.** Every element reports zero size, so a component test cannot detect a screen that scrolls, crops, or overflows. Treating a green component suite as evidence about layout is the specific mistake to avoid.

**Assert the geometry; do not look at it.** Overlap and overflow both have exact answers, and the
eye is unreliable at the 2–3px scale where they usually start. Two checks worth scripting on any
card or tile surface, because both caught real defects on DLR-148 that repeated visual passes had
missed:

```js
// 1. does the panel overflow its own scroll container?
sc.scrollHeight <= sc.clientHeight + 1
// 2. does any part of a tile overlap any other part?
const hit = (a, b) => !(a.right <= b.left || a.left >= b.right ||
                        a.bottom <= b.top || a.top >= b.bottom)
```

Run them at every viewport in the spread, and in **every state the surface has** — a mode toggle that
adds tiles can break a layout that was clean a moment earlier.

Check it in a real browser and report the viewport sizes checked. A reasonable spread: a short laptop window, a phone in portrait, and the same phone in landscape — landscape is where a bottom-anchored hand and a `1fr` play area compete hardest. The check is whether the document scrolls at all and whether every zone's content is fully visible; both have right answers, so this is QA's work through the `chrome-devtools` MCP rather than a developer judgement call. Whether the result *feels* right remains the developer's.

## Sources

Viewport units and the mobile-viewport problem — [CSS dvh, svh, lvh guide](https://csstoolkit.net/blog/css-dvh-svh-lvh-guide/), [When 100vh Lies](https://blog.openreplay.com/fix-100vh-mobile-viewport/), [Don't use 100vh for mobile responsive](https://dev.to/nirazanbasnet/dont-use-100vh-for-mobile-responsive-3o97). The scrollbar caveat — [New CSS Viewport Units Do Not Solve The Classic Scrollbar Problem, Smashing Magazine](https://www.smashingmagazine.com/2023/12/new-css-viewport-units-not-solve-classic-scrollbar-problem/). Safe-area insets — [Understanding env() Safe Area Insets in CSS](https://mohammadshehadeh.com/css/safe-area-insets).

Card-game zoning and information hierarchy — [The Card Games UI Design of Fairtravel Battle, GDKeys](https://gdkeys.com/the-card-games-ui-design-of-fairtravel-battle/), [Marvel Snap gameplay wireframe](https://medium.com/@hello_54095/marvel-snap-gameplay-wireframe-ed76251eebc5), [Mobile Game UI/UX Top 10 Best Practices](https://www.linkedin.com/pulse/mobile-game-uiux-top-10-best-practices-troy-dunniway).

Interaction cost, and the *Fox in the Forest* app's drag-to-play criticism — [Board Game Quest digital review](https://www.boardgamequest.com/the-fox-in-the-forest-digital-review/), [8bit Meeple app review](https://8bitmeeple.com/review/the-fox-in-the-forest/).

Keyboard navigation and roving tabindex — [Keyboard Navigation Patterns for Complex Widgets](https://www.uxpin.com/studio/blog/keyboard-navigation-patterns-complex-widgets/), [WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/), [Accessibility Dos and Don'ts for Interactive Cards, Livefront](https://livefront.com/writing/accessibility-dos-and-donts-for-interactive-cards/).
