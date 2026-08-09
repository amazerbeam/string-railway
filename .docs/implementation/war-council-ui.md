# War Council UI — `src/app/warCouncil/`

**Status:** implemented
**Built by:** SCRUM-28, DLR-47

## Responsibility

The playable War Council round screen: a full-viewport, non-scrolling game surface that renders a
dealt `WarCouncilState`, lets a human play a round of it by hand, and reports the finished round
back through SCRUM-37's `WarCouncilMountProps` contract. It owns **presentation and sequencing
only** — every rules question is delegated to `src/warCouncil/` (see
[war-council.md](war-council.md)), and this module contains no legality check, no scoring rule, and
no trick-winner computation of its own.

It sits under `src/app/` rather than beside the engine for a hard reason: `eslint.config.js`'s
pure-core override bars `src/warCouncil/**` from importing React at all, so a `.tsx` file there
would trip `no-restricted-imports` (the same override previously also scoped `src/vanguard/**`
before DLR-47 deleted that tree). `src/app/` is the layer that is _expected_ to consume the engine
and import React, which makes this its natural home. See [app.md](app.md) for the mount-prop
contract this module implements.

The folder deliberately has **no barrel**. `App.tsx` imports the mount directly by path
(`./app/warCouncil/WarCouncilRound`); `src/app/index.ts` excludes components on purpose, and a `.ts`
barrel re-exporting one is a needless brush with `react-refresh/only-export-components`.

## Key types & exports

| Export                                                                            | Purpose                                                                                               | File                   |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------- |
| `WarCouncilRound`                                                                 | Default export — the mount, satisfying `WarCouncilMountProps` (`initialState` in, `onComplete` out)   | `WarCouncilRound.tsx`  |
| `roundReducer`                                                                    | The single reducer owning every UI transition: `(RoundUiState, RoundUiAction) => RoundUiState`        | `roundReducer.ts`      |
| `createRoundUiState`                                                              | Lazy `useReducer` initializer; advances the opponent's opening lead when they lead trick 1            | `roundReducer.ts`      |
| `RoundUiState`                                                                    | `{ round, armed, prompt, resolvedTrick, rejection, cpuFault }` — the mount's one piece of state       | `roundReducer.ts`      |
| `RoundUiAction`                                                                   | `TapCard \| ChooseAbility \| CancelSelection \| CarryOn`, via the `RoundUiActionKind` `as const` map  | `roundReducer.ts`      |
| `ResolvedTrick`                                                                   | `{ cards, winner }` — a just-resolved trick held on screen until the player carries on                | `roundReducer.ts`      |
| `CpuFault`                                                                        | `IllegalMoveReason \| 'noLegalMove'` — a corrupt CPU turn, shown rather than swallowed                | `roundReducer.ts`      |
| `SUIT_NAME`, `RANK_NAME`                                                          | Display names for `Suit` and the five ability-bearing `CardRank` values                               | `labels.ts`            |
| `cardAccessibleName`                                                              | `"3 of Keys (Fox)"` / `"7 of Bells"` — the accessible name every card button binds to                 | `labels.ts`            |
| `cardKey`                                                                         | `"bells-7"` — the one stable React list key for a card, shared by every card list in the module       | `labels.ts`            |
| `ILLEGAL_MOVE_MESSAGE`                                                            | `Record<IllegalMoveReason, string>` — human copy for the engine's own rejection reasons               | `labels.ts`            |
| `fanPlacement`                                                                    | Pure fan geometry: rotation, lift, overlap, and z-order for one card at one hand position             | `fanLayout.ts`         |
| `FAN_ROTATION_STEP_DEG`, `FAN_LIFT_FACTOR`, `FAN_OVERLAP_PX`, `FAN_ARMED_Z_INDEX` | Named tuning constants `fanPlacement` reads, transcribed from the approved mockup                     | `fanLayout.ts`         |
| `useRovingTabIndex`                                                               | Shared roving-tabindex hook: one tab stop over a flat list of `count` controls, arrow/Home/End/Escape | `useRovingTabIndex.ts` |
| `SuitSymbolSheet`, `SuitMark`                                                     | The three inline `<symbol>` definitions, mounted once, and a `<use>` reference to one of them         | `SuitMark.tsx`         |
| `PlayingCard`                                                                     | One card in three renderings via `variant: 'hand' \| 'table' \| 'pile'`                               | `PlayingCard.tsx`      |

The zone components — `RoundStatusBand`, `DecreePile`, `TrickWell`, `HandFan`, `AbilityPrompt`,
`RoundOverPanel` — are each a default export consumed only by `WarCouncilRound.tsx`.

`labels.ts`, `fanLayout.ts`, and `roundReducer.ts` import no React and touch no DOM global, so all
three are unit-tested in the cheap `node` Vitest project; the components are tested in the `dom`
project (see § _The two-project Vitest layout_).

## How it works

### A full-viewport shell, never a page

`WarCouncilRound.tsx` renders one `.wc-shell` grid, defined in `warCouncil.css`:
`height: 100dvh; width: 100%; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto;`,
with `env(safe-area-inset-*)` padding. `dvh` rather than `vh` is deliberate: `100vh` measures
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

The styling ships as **two** stylesheets, not one: `warCouncil.css` (tokens, the shell grid, the
status band, the felt/table, and the hand container) and `warCouncilCards.css` (the card face, the
ability prompt, and the round-over panel). The combined transcription measured 581 lines, over this
project's 400-line file budget, so it was split. `WarCouncilRound.tsx` imports **both**, and
importing only one leaves half the feature unstyled with no error anywhere — worth knowing before
debugging a card that renders with no face.

### Tap-twice is one action, not two

Arming a card and committing it are not two entries in `RoundUiActionKind` — both are the same
`TapCard` action, dispatched by the same `HandFan` `onTap` callback. `roundReducer.ts`'s
`handleTapCard` decides which happened by comparing the tapped card against `state.armed`: a
different (or no) armed card arms the new one; tapping the _same_ card again either opens `prompt`
(rank is `CardRank.Fox` or `CardRank.Woodcutter`) or calls the private `commit` helper, which runs
`playCard`. There is no separate confirm action and no confirm button — confirmation lives on the
card itself, per `game-ux`'s tap-cost rule.

`TapCard` is ignored outright when it is not the player's turn, or when `resolvedTrick`, `prompt`,
or `cpuFault` is set, or the round is complete.

### The module has no effect at all

Every state transition is either the lazy `useReducer` initializer (`createRoundUiState`, called
once per mount to play the opponent's lead if they lead trick 1) or a handler fired by a tap, a
keypress, or a callback from one of the felt's own controls (`AbilityPrompt`'s `onChoose`,
`RoundOverPanel`'s `onFinish`). Both the initializer and the reducer are pure functions of their
arguments, so React StrictMode's development double-invocation simply recomputes an identical value
rather than doing anything twice for real.

The alternative — an effect that watches "it's the CPU's turn" and dispatches — is what SCRUM-37
actually hit: a synchronous `setState` inside an effect body fails this project's
`react-hooks/set-state-in-effect` lint rule, and the same effect would double-fire under StrictMode.
Even the roving tabindex moves focus imperatively inside its keydown handler rather than from an
effect reacting to a focus-index change. `Select-String … -Pattern "useEffect|useLayoutEffect"`
against `src/app/warCouncil/*.ts` and `*.tsx` returns zero hits, so there is no listener, timer,
observer, or `AbortController` in the module and therefore no cleanup to omit.

### The trick winner is derived, never recomputed by the UI

`roundReducer.ts`'s `deriveResolvedTrick(before, after, playedCard)` never calls `resolveTrickWinner`
itself — doing so would require choosing a trump suit, which is a rules question this layer must not
answer. Instead it compares `tricksPlayed` before and after the commit: a trick resolved iff
`after.tricksPlayed > before.tricksPlayed`, and the winner is whichever side's `tricksWon` entry
rose. This is possible only because `playCard` already applies `resolveTrickWinner` internally and
returns the _result_ of that decision in the new state — `roundReducer` reads the consequence rather
than re-deriving the rule.

### A held trick, and the keyboard path to leave it

`playCard` clears `currentTrick` the instant the second card lands, so without holding the resolved
trick on screen the winning card would never be visible at all. `TrickWell` therefore keeps it —
both cards in `[lead, follow]` order, labelled by side, the winner marked — until the player carries
on. An explicit tap is deterministic, needs no timer, and invents no reveal delay.

Two review rounds shaped how that carry-on is reached, and both defects are worth recording because
each was invisible to the test suite:

A held trick disables every hand card (`interactive` is `false`), and `TrickWell`'s and
`DecreePile`'s cards are `disabled` by variant, so **nothing else in the tree is focusable**. The
felt `<section>` originally carried an `onClick`/`onKeyDown` pair but no `tabIndex`, so it could
never receive focus and its key handler was dead code — a keyboard-only or switch-access player was
stuck at the end of every trick. The fix is a real, focusable control inside `TrickWell` itself,
reading "Tap the table to carry on". It shipped first as a `<span role="button" tabIndex={0}>` with a
manual `onKeyDown`, on the reasoning that a native `<button>` paired with a manual key handler risks
a double dispatch; a second review round tested that empirically and found it is only real _if_ you
attach the manual handler, which nothing requires. `RoundOverPanel`'s semantically identical "Finish
the round" control is a plain `<button type="button" onClick>` with no key handler and gets correct
native `Enter`/`Space` activation for free. `TrickWell`'s control is now the same shape, with the
manual handler deleted; `handleHintClick`'s `event.stopPropagation()` is kept, since it guards
against bubbling to the felt's own `onClick` regardless of element. `warCouncilCards.css`'s
`.wc-is-carry-on` gained a small button-chrome reset (`font-family: inherit; background: none;
border: 0`) so the browser's default button face doesn't reappear around what still reads as plain
hint text — neither value is a new visual decision, and `.wc-table-hint`'s own
font-size/weight/letter-spacing/colour are untouched because the reset never sets the `font`
shorthand.

The surrounding felt keeps its own `onClick` too, for a pointer tap anywhere on the table. Both paths
call the same `handleCarryOn`, and dispatching `CarryOn` a second time is a safe no-op in the reducer
(see below), so bubbling between the two cannot double-fire.

### The deciding trick is held exactly like every other

`roundReducer.ts`'s `commit` and `advanceCpu` set `resolvedTrick` and, on the thirteenth trick,
`phase: RoundPhase.Complete` in the same transition — both become true at once. An earlier version
of `WarCouncilRound.tsx` branched on `roundComplete` **first**, so `RoundOverPanel` replaced the
deciding trick instantly and the player never saw which cards won the round. The felt now branches on
`resolvedTrick` before `roundComplete`, so the held trick's cards and winner are always shown first;
the round-over panel renders only once `resolvedTrick` is `null` again.

`handleCarryOn` is one function serving both the held trick's control and the round-over panel's
"Finish the round" button: it dispatches `CarryOn` whenever something is held (clearing it, even when
the round is already complete), and calls `onComplete` only once nothing is held and the round is
complete — conditions mutually exclusive by construction, so `onComplete` cannot fire twice for one
click. `roundReducer.ts`'s own `handleCarryOn` mirrors this: it no longer treats a completed round as
a blanket no-op, and only skips advancing the opponent once the round is over. That guard matters —
without it, advancing on a completed round would set `cpuFault: 'noLegalMove'` every time a round
ended, since the CPU's hand is empty.

`onComplete` is called from a handler, never an effect, so it cannot double-fire on a second mount.

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

### While a prompt is open, the fan leaves the accessibility tree

`AbilityPrompt` renders a live, enabled button for every remaining hand card, using the same
`cardAccessibleName` those cards already have in `HandFan` — so with both visible, a screen-reader
user scanning a flat buttons list met every name twice, one disabled and one actionable, with nothing
but document order to tell them apart. `HandFan` now sets `aria-hidden` on `.wc-fan` when a prompt is
open. `promptOpen` is true only when `interactive` is false, which forces every card in the fan
`disabled`, so nothing focusable ever sits inside the hidden subtree.

### The two `cpuFault` cases

`roundReducer.ts`'s private `advanceCpu` guards `legalMoves(round, PlayerSide.Cpu).length === 0`
_before_ calling `chooseCpuMove`, because `chooseCpuMove` **throws** rather than returning a rejection
when the CPU has no legal move — `cpuPlayer.ts` (`src/warCouncil/`, documented in
[war-council.md](war-council.md)) picks the lowest option from an empty array, which is `undefined`,
then reads `.rank` off it. Catching that case first sets `cpuFault: 'noLegalMove'`.

The second case is a `playCard` rejection of the CPU's own chosen move — `cpuFault: result.reason`, a
bubbled `IllegalMoveReason` — which is unreachable through today's engine (`chooseCpuMove` is
documented to only ever return a move `playCard` accepts) and is carried as a defensive branch with
no test rather than faked with a contrived fixture.

`WarCouncilRound.tsx` renders either case as a `role="alert"` message naming the raw fault value and
**blocks further play rather than retrying** — it is an engine bug and must look like one. The two are
kept separate from a player's own illegal move precisely so a genuine engine fault is never laundered
into copy reading as though the player erred. There is no `try`/`catch` anywhere in the module.

### A player's rejected move is recoverable and never partial

A commit runs `playCard` and, on `{ ok: false }`, sets `rejection` to the engine's own named
`IllegalMoveReason` and returns the input state's `round` **by reference** — matching the engine's
no-partial-mutation guarantee, so the play simply cannot commit. `WarCouncilRound` maps it to copy
through `ILLEGAL_MOVE_MESSAGE` and `HandFan` renders it in an `aria-live="polite"` region with the
`wc-is-reject` class. The next `TapCard` clears it.

This is what makes the "rejected" half of the acceptance criteria real rather than a re-implemented
check: the reducer arms anything in hand and lets `playCard` adjudicate.

### The two-project Vitest layout

`vite.config.ts` carries a `test.projects` array rather than a flat `test` block: a `node` project
(`environment: 'node'`, `include: ['src/**/__tests__/**/*.test.ts']`) and a `dom` project
(`environment: 'jsdom'`, `include: ['src/**/__tests__/**/*.test.tsx']`), both `extends: true` so the
React plugin is inherited. **A `.test.tsx` file is collected only by the `dom` project and a
`.test.ts` only by the `node` one** — put a component spec in a `.ts` file and it silently never
runs.

The split exists so the DOM environment does not become global: flipping `environment` to `jsdom`
wholesale would remove the no-DOM guarantee from every pure-logic spec in the repo at once. `jsdom`,
`@testing-library/react`, and `@testing-library/dom` are devDependencies — **no runtime dependency
was added.** `afterEach(cleanup)` is declared per spec file rather than in a `setupFiles` entry,
because a global setup file would import `@testing-library/react` into every node-environment spec
and break them.

Specs query by accessible role and name only — `data-testid` has zero hits in `src/` and this module
adds none.

## Rules & invariants enforced

- **This module re-implements no rule.** `legalMoves` decides what `HandFan` renders as tappable,
  `playCard` decides what commits, `chooseCpuMove` plays the opponent, `scoreRound` computes the
  reported score, and card equality is always the engine's own `sameCard`/`containsCard` (exported
  from `src/warCouncil/index.ts` by this ticket rather than deep-imported or re-written).
  `roundReducer.ts` contains no suit comparison, no rank comparison, and no trick-winner
  computation. The single permitted rank _identity_ check is "is this rank `CardRank.Fox` or
  `CardRank.Woodcutter`", for opening the ability prompt — via `CardRank`, never a numeric literal.
- **No `useEffect` or `useLayoutEffect` anywhere**, in `.ts` or `.tsx` (see § _The module has no
  effect at all_). Enforced by a grep in the contract's final verification.
- **`labels.ts`, `fanLayout.ts`, and `roundReducer.ts` import no React and touch no DOM global** —
  verified by grep, which is what lets them run in the `node` Vitest project.
- **Every visual value is a named CSS custom property or a named constant in `fanLayout.ts`**,
  transcribed from the developer-approved `mockup.html`. No hex colour appears in any `.tsx` — a grep
  enforces this — and no `vh`/`vw` unit appears anywhere in `src/` or `index.html`; dimensions are
  `dvh`, `%`, `rem`, or `vmin`.
- **No `memo`, `useMemo`, or `useCallback`.** There is no profiling evidence for any and the
  `react-frontend` skill forbids speculative memoisation. The heaviest per-tap work is one
  `legalMoves` over at most 13 cards plus one `playCard`; every collection is bounded by the 33-card
  deck.
- No lint rule is suppressed anywhere in the module, there is no `any`, no module-level mutable
  state, and no `console.log`/`console.debug`.
- The three SVG `<symbol>` ids (`s-bells`, `s-keys`, `s-moons`) are defined and consumed entirely
  within `SuitMark.tsx`, routed through a `SUIT_SYMBOL_ID` map. They bind by string: a rename
  type-checks cleanly and renders nothing.

## Deferred / not yet implemented

- **No automated test covers the no-scroll layout.** `jsdom` has no layout engine, so nothing in the
  suite can prove `.wc-shell` never scrolls or crops at a given viewport size. That check belongs to
  QA driving the app in a real browser at named sizes. It has been verified at 1280×720, 844×390
  (landscape), and a phone portrait — the last at 500×844 rather than 390×844, because the browser
  tooling floors window width at 500px on this machine; `--wc-card-w`'s
  `clamp(2.9rem, 6.2vmin, 4.3rem)` resolves to its `2.9rem` floor at both widths, making the two
  layout-equivalent for that measurement.
- **The `cpuFault` `IllegalMoveReason` branch is defensive and deliberately untested** — unreachable
  through today's engine, carried as a guard against a future engine regression rather than faked
  with a contrived fixture.
- **`chooseCpuMove` throws instead of rejecting on an empty legal set.** The reducer guards around it
  rather than fixing the engine, which was out of scope for a UI ticket. A future engine ticket
  should make it return a rejection like every other failure path.
- **Single round only.** The mount spans exactly one round per `WarCouncilRoundResult`. Multi-round
  play, persistence, save/replay, and undo are all absent — nothing in this repository stores state
  yet, so round state lives only in the `useReducer` and a later persistence ticket would need no
  migration.
- **A single dark theme, deliberately.** The shell sets `color-scheme: dark` locally and offers no
  light variant; `src/styles/global.css` keeps `color-scheme` for any future non-game screen.
  Reversible, but it means the game screen and a future non-game screen will not match by default.
- **No card art.** Card faces are CSS and text — parchment ground, serif rank, an inline-SVG suit
  mark tinted per suit, and a brass pip on the five ability-bearing ranks. The pip stands in for a
  printed ability name, which cannot fit at this card width without truncating. Art direction is a
  separate ticket.
- **Animation is limited to the mockup's card lift and the carry-on hint pulse**, both of which
  honour `prefers-reduced-motion`. Nothing else moves.
- **Focus reverts to `<body>` when a carry-on control unmounts**, so a keyboard player presses `Tab`
  once per trick to reach the next control. Standard browser behaviour when a focused element is
  removed or disabled; minor friction across a 13-trick round, not a trap, and left as-is.
- **Every visual constant remains the developer's to retune.** The felt/brass/parchment palette, the
  three suit hues, the `clamp()` card-size bounds, and `fanLayout.ts`'s rotation step, lift factor,
  and overlap are transcribed-and-confirmed defaults from the approved mockup, each a one-line
  change — not final values.
