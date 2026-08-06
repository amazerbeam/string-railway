# Vanguard UI — `src/app/vanguard/`

**Status:** implemented
**Built by:** SCRUM-29

## Responsibility

The playable Vanguard match screen: a full-viewport, non-scrolling game surface that renders a
`VanguardState`, lets a human play The Clash by hand (action, then target), and reports the
finished match back through SCRUM-37's `VanguardMountProps` contract. Unlike War Council's
`WarCouncilRound`, which spans one round, this mount spans a whole **match** — it is mounted once
and plays consecutive rounds until a Breach, requesting each round's Muster from
`requestTricksWon` rather than being handed one round's state up front. It owns **presentation and
sequencing only**: every rules question is delegated to `src/vanguard/` (see
[vanguard.md](vanguard.md)), and this module contains no legality check, no cost arithmetic, no
turn-order rule, and no Breach detection of its own.

It also owns the Test-mode standalone path: `TrickEntryForm` and `TestModeVanguardHost` stand in
for a real War Council match by asking a human for each round's trick split, proving
`VanguardMountProps` is genuinely callable the way `stubs/VanguardStub.tsx` once did — except this
is the real UI, not a throwaway proof.

It sits under `src/app/` for the same reason `src/app/warCouncil/` does: `eslint.config.js`'s
pure-core override bars `src/vanguard/**` from importing React, so a `.tsx` file there would trip
`no-restricted-imports`; `src/app/` is the layer expected to consume the engine and import React.
See [app.md](app.md) for the mount-prop contract this module implements.

The folder has **no barrel**, matching `src/app/warCouncil/`'s precedent: `App.tsx` and
`TestModeVanguardHost.tsx` import components directly by path, and a `.ts` barrel re-exporting a
component is a needless brush with `react-refresh/only-export-components`.

## Key types & exports

| Export                                  | Purpose                                                                                                          | File                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `hexBoardMetrics`                       | Pure board-level geometry: `widthUnits`, `heightUnits`, `aspectRatio`, `cellWidthFraction` for a given `size`    | `hexLayout.ts`             |
| `hexPlacement`                          | The single point where an axial `HexCoord` becomes a screen-space fraction — owns board orientation              | `hexLayout.ts`             |
| `HexPlacement`, `HexBoardMetrics`       | The two return shapes above                                                                                      | `hexLayout.ts`             |
| `SIDE_NAME`                             | `'your'` / `'their'` — local copy for a side, never a raw `PlayerSide` string in UI                              | `labels.ts`                |
| `ACTION_NAME`, `ACTION_DESCRIPTION`     | Display name and short cost/range copy for each `VanguardActionKind`                                             | `labels.ts`                |
| `cellAccessibleName`                    | The one accessible name every cell `<button>` binds to (AC4)                                                     | `labels.ts`                |
| `REJECTION_MESSAGE`                     | `Record<IllegalActionReason \| ClashRejectionReason, string>` — human copy for every engine rejection            | `labels.ts`                |
| `cellReactKey`                          | Re-export of `src/vanguard`'s `cellKey`, so every list in this module shares one stable key function             | `labels.ts`                |
| `legalTargetsFor`                       | Every coordinate where an action kind is legal and affordable for a side, by dry-running the engine              | `legalTargets.ts`          |
| `MatchUiState`                          | `{ round, board, clash, selectedAction, rejection, fault }` — the mount's one piece of state                     | `matchReducer.ts`          |
| `MatchUiAction`, `MatchActionKind`      | `MusterReady \| RequestFailed \| SelectAction \| TapCell \| CancelSelection \| NextRound`, via an `as const` map | `matchReducer.ts`          |
| `MatchRejection`                        | `IllegalActionReason \| ClashRejectionReason` — the player's own rejected-action surface                         | `matchReducer.ts`          |
| `MatchFault`                            | `cpuDeadEnd \| cpuRejected \| requestFailed \| invalidTricks` — a play-blocking fault, always named              | `matchReducer.ts`          |
| `createMatchUiState`, `matchReducer`    | Lazy `useReducer` initializer and the single reducer owning the whole match                                      | `matchReducer.ts`          |
| `useHexRovingFocus`                     | One tab stop across the whole board; axial arrow-key movement, `Home`/`End`, `Escape`                            | `useHexRovingFocus.ts`     |
| `HexRovingFocus`                        | `{ groupRef, tabStopKey, handleKeyDown }` — the hook's return shape                                              | `useHexRovingFocus.ts`     |
| `HexCell`                               | Default export — one board cell as a native `<button>` (AC1, AC4)                                                | `HexCell.tsx`              |
| `VanguardBoardView`                     | Default export — the board group (AC1), renders every coordinate via `HexCell`                                   | `VanguardBoardView.tsx`    |
| `ActionPalette`, `ActionPaletteProps`   | Default export — the three Clash actions plus the hint line (AC2)                                                | `ActionPalette.tsx`        |
| `ClashOverPanel`, `ClashOverPanelProps` | Default export — the Breach and round-over overlay                                                               | `ClashOverPanel.tsx`       |
| `VanguardMatch`                         | Default export — the mount, satisfying `VanguardMountProps`                                                      | `VanguardMatch.tsx`        |
| `TrickEntryForm`, `TrickEntryFormProps` | Default export — Test-mode manual trick entry (AC6)                                                              | `TrickEntryForm.tsx`       |
| `TestModeVanguardHost`                  | Default export — the Test-mode host owning `requestTricksWon` (AC6)                                              | `TestModeVanguardHost.tsx` |

`hexLayout.ts`, `labels.ts`, `legalTargets.ts`, and `matchReducer.ts` import no React and touch no
DOM global, so all four are unit-tested in the cheap `node` Vitest project; the components are
tested in the `dom` project (see `war-council-ui.md`'s § _The two-project Vitest layout_ — this
module follows the identical split, unchanged).

## How it works

### A full-viewport shell, sibling to War Council's

`VanguardMatch.tsx` renders one `.vg-shell` grid, defined in `vanguard.css`:
`height: 100dvh; width: 100%; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto;`,
with `env(safe-area-inset-*)` padding — the same idiom `war-council-ui.md` documents in full, reused
rather than re-derived. The status band and action palette take `auto`; the board takes `1fr`. Every
custom property and class carries a `vg-` prefix (confirmed free of collisions in `src/` during
planning, where `wc-` already had 95 hits).

The styling ships as **two** stylesheets: `vanguard.css` (tokens, the shell grid, the status band,
the board, the cells, and the action palette — 305 true lines) and `vanguardPanels.css` (the
Test-mode entry panel, the Breach/round-over panel, and the fault alert — 145 true lines). Unlike
`warCouncilCards.css`, which was split because the combined file exceeded budget,
`vanguardPanels.css` was split **pre-emptively**: `vanguard.css` alone measured well under 400
lines, but the entry/panel/alert rules belong to components (`TrickEntryForm`, `ClashOverPanel`,
`VanguardMatch`'s fault alert) that Phase 2 — when `vanguard.css` was written — does not build, and
no later task in this contract touches `vanguard.css` again. Splitting then was the only
opportunity to land those rules within budget for the whole module. `VanguardMatch.tsx` imports
**both**; importing only one leaves half the feature unstyled with no error anywhere.

### `hexPlacement` is the single point where axial space becomes screen space

`hexLayout.ts`'s `hexPlacement(coord, size)` flips the `r` axis for screen space — increasing `r`
climbs the screen — so the engine's fixed `bases.player` at `{0,0}` renders **bottom-left** (lowest
and leftmost) and `bases.cpu` at `{size-1,size-1}` renders **top-right**, leaning the rhombus
left-to-right off its bottom-left corner. This was the developer's confirmed instruction at
SCRUM-29's approval gate (2026-08-05), transcribed into `hexPlacement.test.ts`'s orientation specs
before the function existed.

No coordinate is ever rewritten and nothing in `src/vanguard/` changes to produce this — the flip is
purely a rendering choice, applied once, here. That is deliberate: re-orienting the board later
(mirroring it, rotating it) is a one-line change to this function rather than a sweep of every
consumer that reads a `HexCoord`.

`hexBoardMetrics(size)` computes the board's own bounding-box geometry — `widthUnits`,
`heightUnits`, the derived `aspectRatio`, and `cellWidthFraction` — from two geometric constants
that are **not tunables**: `ROW_HEIGHT_RATIO = 0.75` (a pointy-top hex row advances three quarters
of a hex height) and `HEX_HEIGHT_TO_WIDTH = 2/√3` (a pointy-top hex's fixed height-to-width ratio).
Both functions guard `size <= 0` by substituting `1`, so a degenerate size can never produce a zero
divisor — the same class of silent failure `war-council-ui.md`'s `fanLayout.ts` guard exists to
prevent: a `NaN` reaching a CSS `%` offset or `aspect-ratio` is dropped by the browser with no error
anywhere.

`vanguard.css`'s `.vg-board` writes its `aspect-ratio` as `16 / 8.6547` with a comment naming it as
`hexBoardMetrics(11)`'s own output — derived, not hand-chosen — while `VanguardBoardView.tsx` also
sets the aspect ratio inline from a live `hexBoardMetrics(board.size)` call, so a retuned
`BOARD_SIZE` reshapes the board with no CSS edit required.

### `legalTargets.ts` asks the engine rather than deciding

`legalTargetsFor(board, side, kind, musterAvailable)` contains **no legality rule of its own** — no
distance check, no adjacency test, no ownership comparison, no cost arithmetic. It dry-runs
`applyVanguardAction(board, side, { kind, target })` for every coordinate in
`allBoardCoords(board.size)`, and a coordinate is offered only when the result is `{ ok: true }` and
its `cost` is affordable against `musterAvailable`. This is the same `firstValidated`
dry-run-validate pattern `chooseCpuClashAction` already uses to pick one action
([vanguard.md](vanguard.md) → _The Clash CPU heuristic_), generalised here from "the first legal
candidate" to "every legal candidate."

This is what makes AC2's "no client-side re-implementation of legality" real rather than aspirational:
because the function never encodes a rule, it **cannot drift** from the engine — a future change to
Expand's range or Overwrite's cost changes what `applyVanguardAction` accepts, and this function's
output changes with it automatically, with nothing here to update.

The cost is `board.size²` engine calls (121 at `BOARD_SIZE = 11`), recomputed on every render while
an action is armed — `VanguardMatch.tsx` calls it three times per render, once per action kind, so
that `ActionPalette`'s `enabled` map and the armed action's `legalTargets` set share one pass of
results rather than re-asking per kind on demand. This is a discrete turn-based board, not a pointer
hot path, so recompute-from-scratch is the simplest correct design — the same stance
[vanguard.md](vanguard.md) documents for `connectedNetwork`. It also mirrors `applyClashAction`'s
own `Number.isFinite` guard on `musterAvailable`: without it, a malformed Muster value would compare
as affordable against every cost, so a non-finite value returns an empty set outright.

### Action-then-target: two taps, no confirm step

`ActionPalette` offers the three `VanguardActionKind` values as ordinary buttons — three controls is
comfortably under `game-ux`'s "about five" natural-tab-stop floor, so it needs no roving tabindex.
`matchReducer.ts`'s `handleSelectAction` toggles the tapped kind off if it is already armed,
otherwise arms it and clears any prior `rejection`; it is a no-op when it is not the player's turn.
`handleTapCell` is ignored unless a clash is `InProgress`, it is the player's turn, an action is
armed, and no `fault` is set. A legal tap calls `applyClashAction`, and on success **keeps the
selected action armed** — a developer-confirmed choice (`Developer decides or observes`, below)
that makes a run of same-kind actions cost one tap each after the first, at the cost of a mis-tap
placing a token instead of doing nothing.

A rejected tap sets `rejection` to the engine's own named reason and returns the input state's
`clash` **by reference** — matching `applyClashAction`'s no-partial-mutation guarantee, so a
rejected tap provably cannot have touched the board. `ActionPalette`'s `hint` line renders it via
`REJECTION_MESSAGE` in an `aria-live="polite"` region; the next `SelectAction` or a successful
`TapCell` clears it.

### The CPU-advance loop and its termination argument

`matchReducer.ts`'s private `advanceCpu(clash)` runs after `MusterReady` and after every accepted
player action, because The Clash's turn engine hands consecutive turns to one side once the other is
exhausted ([vanguard.md](vanguard.md) → _the turn-engine reducer_, step 7) — a single CPU step is not
enough; the reducer must spend every CPU turn in a row until the turn genuinely returns to the
player or the clash ends:

```ts
function advanceCpu(clash: ClashState): { clash: ClashState; fault: MatchFault | null } {
  let current = clash
  while (current.status === ClashStatus.InProgress && current.turn === PlayerSide.Cpu) {
    let action: VanguardAction
    try {
      action = chooseCpuClashAction(current.board, PlayerSide.Cpu, current.muster[PlayerSide.Cpu])
    } catch (error) {
      return { clash: current, fault: { kind: 'cpuDeadEnd', message: ... } }
    }
    const result = applyClashAction(current, PlayerSide.Cpu, action)
    if (!result.ok) return { clash: current, fault: { kind: 'cpuRejected', reason: result.reason } }
    current = result.state
  }
  return { clash: current, fault: null }
}
```

It cannot spin: every accepted action costs at least the Expand cost (the module's own minimum, 1
Muster), so `current.muster[PlayerSide.Cpu]` strictly decreases on every successful iteration and
the loop's own `status`/`turn` guard eventually becomes false either from exhaustion (handled inside
`applyClashAction`, [vanguard.md](vanguard.md)) or a Breach; any rejection or thrown dead end breaks
the loop immediately rather than retrying.

### The module's single `try`/`catch`

`chooseCpuClashAction` throws a plain `Error` on its documented, unmodeled dead end: a side with
Muster left but no legal Expand, Overwrite, or Reinforce action exists at all
([vanguard.md](vanguard.md) → _The Clash CPU heuristic_). `war-council-ui.md`'s equivalent case
(`roundReducer`'s `advanceCpu`) avoids ever hitting that throw by calling
`legalMoves(round, PlayerSide.Cpu).length === 0` **before** invoking `chooseCpuMove` — but Vanguard
has no such enumerator to guard with: "each `apply*` function only reports legality as a side effect
of attempting the action" ([vanguard.md](vanguard.md) → _The Clash CPU heuristic_), and building one
here to pre-check would itself be exactly the re-implementation-of-legality AC2 forbids. So this
module's `advanceCpu` is the one place in `src/app/` with a real `try`/`catch`: it catches the throw
and converts it into `fault: { kind: 'cpuDeadEnd', message }`, rendered as a `role="alert"` and
**blocking further play** — `VanguardMatch`'s `canAct` is `playerTurn && ui.fault === null`, so a
set fault disables every cell and every palette button. The fault is deliberately visible rather
than swallowed: it is an unmodeled engine gap, not a rule, and must look like one to the player.

The sibling case — `applyClashAction` rejecting the CPU's own chosen action, `fault: cpuRejected`
carrying the bubbled `MatchRejection` — is unreachable through today's engine: `chooseCpuClashAction`
dry-run-validates every candidate via `applyVanguardAction` before returning it, and its candidate
generation already filters cost against the Muster it was handed
([vanguard.md](vanguard.md) → _The Clash CPU heuristic_, step 3). It is carried as a defensive
branch with no test, exactly as `war-council-ui.md` records for its own sibling case.

Both faults, plus `requestFailed` (the `requestTricksWon` promise rejecting) and `invalidTricks`
(a resolved split `isValidTricksWon` refuses), render through one `faultMessage` switch and one
`role="alert"` paragraph in `VanguardMatch.tsx` — four named surfaces, none silently swallowed.

### The single effect, its `cancelled` flag, and why nothing dispatches synchronously

`VanguardMatch.tsx` has exactly one effect, keyed on `[ui.clash, ui.round, requestTricksWon]`. It
guards `ui.clash !== null` at the top and returns immediately if a clash is already open, so it only
ever fires when a fresh round needs its Muster — at mount, and again each time `NextRound` clears
`clash` back to `null`. It calls `requestTricksWon(ui.round)` and dispatches `MusterReady` from the
resolved `.then()` callback, or `RequestFailed` from `.catch()` — **never synchronously in the effect
body**, which is what this project's `react-hooks/set-state-in-effect` lint rule forbids and what
`war-council-ui.md` records as the mistake SCRUM-37's own stub actually made. A `cancelled` flag, set
in the effect's cleanup, guards both callbacks: a promise that resolves after unmount, or after React
StrictMode's development double-invocation triggers a second run, can never dispatch into a dead
instance. The dependency array is exhaustive, not suppressed — `requestTricksWon` is listed because
`RequestTricksWon`'s own documented contract ([app.md](app.md) → _`RequestTricksWon` carries a
referential-stability requirement_) is that a real implementation holds a stable identity, so listing
it costs nothing in a correct host and catches an incorrect one by re-firing visibly.

### AC3 is structural: the board never leaves the screen

`VanguardMatch.tsx`'s `<main className="vg-board-area">` always renders `VanguardBoardView` — there
is no branch anywhere in the component that swaps it for a loading state, a fault message, or a
panel. The trick-request pending state, the outcome panel (`ClashOverPanel`), and the fault alert
are all **overlays**, positioned absolutely by `vanguardPanels.css` (`.vg-panel`, `.vg-alert`) or, for
the Test-mode entry form, anchored to the screen edge by `vanguardPanels.css`'s `.vg-entry`. The
board underneath is always present in the DOM and always visible; nothing conditionally unmounts it.
This makes "the board stays visible while the War Council decides" a structural property of the
render tree rather than a rule a future edit could accidentally break by adding a new early return.

### AC6 is structural too: the mount never knows which mode it is in

`TrickEntryForm` is rendered by `TestModeVanguardHost`, never by `VanguardMatch` — the same design
`app.md` names as SCRUM-37's central idea, now realised: `VanguardMatch` only ever calls the
`requestTricksWon` callback it is handed, with no branch checking a mode. `TestModeVanguardHost`
supplies a `requestTricksWon` that resolves a `Promise` only once a human submits `TrickEntryForm`,
via a `pendingRef` (a `useRef`, not `useState`, so resolving it never itself triggers a render — only
`setPendingRound` does) that is deliberately **overwritten, not queued**, on every call: React
StrictMode calls `VanguardMatch`'s effect twice in development, and without the overwrite the first
promise would be orphaned with no way to ever settle. A future Campaign host would instead resolve
`requestTricksWon` immediately from a just-completed War Council round's own `tricksWon` — exactly
the branch `app.md` describes and this module still does not build.

`requestTricksWon` itself is `useCallback`-wrapped in `TestModeVanguardHost.tsx` with an empty
dependency array — the module's one use of `useCallback`, and not a profiling-driven exception to
`react-frontend`'s no-speculative-memoisation rule: it exists because `RequestTricksWon`'s documented
contract _requires_ referential stability (`app.md`), and the callback's closure only reads a ref and
a stable `useState` setter, both of which are stable across renders by React's own contract, so the
empty array is correct rather than merely convenient.

### `TrickEntryForm` derives the opponent's count instead of asking for it

The form renders exactly **one** number input, for the player's own trick count; the CPU's is
computed as `TRICKS_PER_ROUND - player` and only displayed. This answers the open question
`app.md`'s prior _Deferred_ section posed for this ticket — "whether the form should make an
invalid split nearly unrepresentable in the first place... rather than relying on
[`isValidTricksWon`] as the primary defence" — by making an impossible split structurally
unrepresentable through the UI: there is no way to type two numbers that fail to sum to
`TRICKS_PER_ROUND`, because only one is ever typed. `isValidTricksWon` remains in `matchReducer.ts`'s
`handleMusterReady` as the reducer's own backstop, unchanged and still load-bearing against any
future caller of `MusterReady` that does not go through this form.

### One roving-focus hook for the whole board, two dimensions instead of one

`useHexRovingFocus(board, isFocusable, onCancel)` is the hex-board analogue of
`war-council-ui.md`'s `useRovingTabIndex`, extended from a flat list to axial 2D movement: one
`CellKey` tab stop across all `board.size²` cells, moved imperatively inside the keydown handler
(never from an effect — there is no `useEffect` in this file). `ArrowLeft`/`ArrowRight` step `q` by
∓1; **`ArrowUp` steps `r` by +1 and `ArrowDown` by −1**, because `hexPlacement` flips the `r` axis so
increasing `r` climbs the screen — an arrow key has to move focus the way it visually points, not the
way the axis is numerically signed. Both axes clamp to `[0, board.size - 1]`. `Home`/`End` jump to
the first/last focusable cell in row-major order (`r` ascending, then `q`) — the same order
`VanguardBoardView` renders in, so DOM order and keyboard order agree. `Escape` calls `onCancel`.
Moving the tab stop to a non-focusable cell (a `disabled` button) still updates `tabStopKey` so the
next arrow press continues from there, but skips the `.focus()` call — a `disabled` element cannot
take focus regardless.

This hook is a deliberate near-duplicate of `useRovingTabIndex`, not a refactor of it: extracting a
shared core would mean editing SCRUM-28's already-completed module, which this contract declined to
do (`plan.md` → _Risks and judgement calls_). Consolidating the two is acknowledged, undone debt.

### The `data-cell` attribute — a string-bound invariant across two files

`useHexRovingFocus.ts`'s `moveTo` locates the DOM node to focus with
`groupRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${key}"]`)`; `HexCell.tsx` is the
only place that sets `data-cell={cellKey(coord)}`. Nothing but a shared string ties the two
together — if `HexCell` ever stopped setting the attribute, or rendered something other than a
`<button>`, arrow-key navigation would silently stop moving real focus, with no compile error (the
lookup is optional-chained) and no test failing differently, since `tabIndex` bookkeeping would still
advance correctly while `document.activeElement` stayed put. Both files carry a comment naming this.

### The reducer decides no rule; every consequential value is read off the engine's own result

`matchReducer.ts` never calls `hasReachedBreach`, never compares a `hexDistance`, never computes an
Overwrite or Reinforce cost, and never checks `Number.isFinite` on a Muster value itself — all of
that lives inside `applyClashAction` (turn order, legality, cost, exhaustion, the Breach check) or
`chooseCpuClashAction` (the CPU's own move). The reducer's job is entirely to read
`ClashState.status` and `ClashState.turn` and translate the result into UI state: `rejection` on a
`{ ok: false }` result, `clash` replaced on `{ ok: true }`, `fault` set on the two CPU failure paths.
`MusterReady` runs the documented, unmodified pipeline —
`isValidTricksWon` → `scoreRound` → `convertScoreToMuster` → `startClash(board, muster,
openingSideForRound(round))` — and only calls `scoreRound` once the trick split has already passed
`isValidTricksWon`; an invalid split sets `fault: { kind: 'invalidTricks' }` and stops before
`scoreRound` runs at all.

## Rules & invariants enforced

- **This module re-implements no rule.** `legalTargetsFor` decides what `HexCell` renders as
  selectable, `applyClashAction` decides what commits, `chooseCpuClashAction` plays the opponent,
  `openingSideForRound` decides who opens a round, and `scoreRound` → `convertScoreToMuster` decide
  the Muster. `matchReducer.ts` contains no distance comparison, no adjacency test, no cost
  arithmetic, and no `hasReachedBreach` call.
- **Exactly one effect exists in the module** (`VanguardMatch.tsx`, the `requestTricksWon` request) —
  verified by grep in the contract's Final verification. It registers no listener, timer, observer,
  `requestAnimationFrame`, or `AbortController`; its only resource is a `cancelled` boolean released
  in its own cleanup.
- **`hexLayout.ts`, `labels.ts`, `legalTargets.ts`, and `matchReducer.ts` import no React and touch
  no DOM global** — verified by grep, which is what lets them run in the `node` Vitest project.
- **Every visual value is a named CSS custom property**, `vg`-prefixed and transcribed from the
  approved `mockup.html`. No hex colour literal appears in any `.tsx` — a grep enforces this — and
  no `vh`/`vw` unit appears anywhere in the module; dimensions are `dvh`, `%`, `rem`, or `vmin`.
- **No `memo`, `useMemo`, or profiling-driven `useCallback`.** The module's one `useCallback`
  (`TestModeVanguardHost`'s `requestTricksWon`) exists to satisfy `RequestTricksWon`'s documented
  referential-stability contract, not as a performance optimisation — there is no profiling evidence
  behind it and none was needed, since its dependency array is provably empty by construction.
- **No lint rule is suppressed anywhere in the module**, there is no `any`, no module-level mutable
  state, and no `console.log`/`console.debug`.
- **The `data-cell` attribute binds `HexCell.tsx` to `useHexRovingFocus.ts` by string only** — both
  sites carry a comment naming the invariant, and Final verification greps for both hits.
- **No `data-testid` anywhere** — every component test queries by accessible role and label, verified
  by grep alongside the `data-cell` check.

## Deferred / not yet implemented

- **No automated test covers the no-scroll layout, the board's visual orientation, or the reinforced
  marker's colour-independent legibility.** `jsdom` has no layout engine — those checks belong to QA
  driving the app in a real browser at named viewport sizes (`tasks.md` Task 19).
- **The `cpuRejected` `MatchRejection` branch is defensive and deliberately untested** —
  unreachable through today's engine, since `chooseCpuClashAction` dry-run-validates before
  returning and its own candidate generation already filters against the Muster it was handed.
  Carried as a guard against a future engine regression, mirroring `war-council-ui.md`'s identical
  sibling case.
- **`chooseCpuClashAction`'s unmodeled dead end is caught, not fixed.** This module's `try`/`catch`
  around it converts the throw into a play-blocking fault rather than resolving the underlying
  stalemate gap `vanguard.md` documents in its own Deferred section — a future engine ticket owns
  actually handling "Muster left, nothing legal to spend it on."
- **`useHexRovingFocus` near-duplicates `src/app/warCouncil/useRovingTabIndex`.** Two roving-tabindex
  hooks now exist under `src/app/`; consolidating them would mean editing SCRUM-28's completed
  module, declined for this contract (`plan.md` → _Risks and judgement calls_).
- **No battle-loop wiring, and two match loops now exist for the same mechanic.** This mount owns its
  own round-to-round loop (`MatchUiState.round`, `NextRound`); `src/battle/`'s `submitClashAction`
  already sequences rounds at the `BattleState` level. SCRUM-34 has to decide which one Campaign
  actually runs — nothing here imports `src/battle/` and nothing there imports this module.
- **`src/App.tsx`'s Test-mode control is throwaway scaffolding.** It is the only way this screen and
  AC6 are reachable in the running app today; SCRUM-34 replaces the whole dev host rather than
  extending it.
- **Muster counts and a turn indicator are not shown.** `VanguardMatch.tsx`'s status band literally
  reads "Muster counts and turn indicator are SCRUM-30" — `ActionPalette`'s `hint` line carries a
  minimal whose-turn message (needed so the palette can be correctly disabled), but the fuller
  Muster/turn display is explicitly out of scope here.
- **A single dark theme, deliberately** — `vanguard.css` sets `color-scheme: dark` locally with no
  light variant, matching `war-council-ui.md`'s identical choice.
- **No token or board art beyond CSS.** Every visual is a CSS rule keyed off `data-*` attributes —
  AC5's functional-default visuals, not blocked on an art pass.
- **Every developer tuning value remains outstanding**, copied from `tasks.md`'s _Developer decides
  or observes_:
  - Every custom-property value in `vanguard.css` is a one-line retune, transcribed from the
    approved mockup: `--vg-player`/`--vg-player-deep` and `--vg-cpu`/`--vg-cpu-deep` (purple
    Player / green CPU are fixed by `skirmish-board-replacement.md`; these exact shades are not),
    `--vg-defense`, `--vg-empty`, `--vg-empty-edge`, `--vg-selectable`, `--vg-reinforce-mark`,
    `--vg-board-max`'s `clamp()` bounds, and `--vg-radius`.
  - Whether the reinforced marker reads clearly as "+1" in its mockup form (a parchment bar across
    the token's waist) rather than a ring, pip, or numeral.
  - Whether keeping the palette armed after a successful submission is right — a run of Expands
    costs one tap each after the first, but a mis-tap places a token instead of doing nothing.
  - Whether two taps per Clash action (palette, then cell) drags across a full Muster of 7–10 moves
    per round.
  - Whether an 11×11 rhombus is legible and pleasant at a phone viewport, and whether 121 cells is
    the right density. `BOARD_SIZE` stays SCRUM-21's placeholder `11`, retunable in one line in
    `src/vanguard/config.ts` — not this module's own value.
  - Whether a screen-reader user can genuinely navigate a 2D hex board by axial arrow keys. QA can
    confirm focus moves; whether the mental model works is real assistive-technology use.
  - Accepting this module's single `try`/`catch` (around `chooseCpuClashAction`'s dead-end throw),
    where `src/app/warCouncil/` has none.
  - Accepting that `src/App.tsx`'s mode control is throwaway scaffolding SCRUM-34 deletes.
