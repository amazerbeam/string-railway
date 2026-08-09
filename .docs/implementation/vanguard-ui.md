# Vanguard UI — `src/app/vanguard/`

**Status:** implemented
**Built by:** SCRUM-29, SCRUM-41, SCRUM-30

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

| Export                                  | Purpose                                                                                                                                                                       | File                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `hexBoardMetrics`                       | Pure board-level geometry: `widthUnits`, `heightUnits`, `aspectRatio`, `cellWidthFraction` for a given `size`                                                                 | `hexLayout.ts`             |
| `hexPlacement`                          | The single point where an axial `HexCoord` becomes a screen-space fraction — owns board orientation                                                                           | `hexLayout.ts`             |
| `HexPlacement`, `HexBoardMetrics`       | The two return shapes above                                                                                                                                                   | `hexLayout.ts`             |
| `SIDE_NAME`                             | `'your'` / `'their'` — local copy for a side, never a raw `PlayerSide` string in UI                                                                                           | `labels.ts`                |
| `ACTION_NAME`, `ACTION_DESCRIPTION`     | Display name and short cost/range copy for each `VanguardActionKind`                                                                                                          | `labels.ts`                |
| `cellAccessibleName`                    | The one accessible name every cell `<button>` binds to (AC4)                                                                                                                  | `labels.ts`                |
| `REJECTION_MESSAGE`                     | `Record<IllegalActionReason \| ClashRejectionReason, string>` — human copy for every engine rejection                                                                         | `labels.ts`                |
| `cellReactKey`                          | Re-export of `src/vanguard`'s `cellKey`, so every list in this module shares one stable key function                                                                          | `labels.ts`                |
| `legalTargetsFor`                       | Every coordinate where an action kind is legal and affordable for a side, by dry-running the engine                                                                           | `legalTargets.ts`          |
| `inferActionKind`                       | Total, pure — which action kind a tap on a cell means, inferred from its occupancy (SCRUM-41)                                                                                 | `legalTargets.ts`          |
| `allLegalTargets`                       | The union of every action kind's already-computed legal-target set — the board's continuous highlight (SCRUM-41)                                                              | `legalTargets.ts`          |
| `MatchUiState`                          | `{ round, board, clash, rejection, fault }` — the mount's one piece of state (SCRUM-41 removed `selectedAction`)                                                              | `matchReducer.ts`          |
| `MatchUiAction`, `MatchActionKind`      | `MusterReady \| RequestFailed \| TapCell \| ClearRejection \| NextRound`, via an `as const` map (SCRUM-41 removed `SelectAction`; `CancelSelection` renamed `ClearRejection`) | `matchReducer.ts`          |
| `MatchRejection`                        | `IllegalActionReason \| ClashRejectionReason` — the player's own rejected-action surface                                                                                      | `matchReducer.ts`          |
| `MatchFault`                            | `cpuDeadEnd \| cpuRejected \| requestFailed \| invalidTricks` — a play-blocking fault, always named                                                                           | `matchReducer.ts`          |
| `createMatchUiState`, `matchReducer`    | Lazy `useReducer` initializer and the single reducer owning the whole match                                                                                                   | `matchReducer.ts`          |
| `TurnIndicator`                         | `awaitingMuster \| playerTurn \| cpuTurn \| resolved` — the HUD's own lifecycle label, via an `as const` map (SCRUM-30)                                                       | `clashHud.ts`              |
| `ClashHudState`                         | `{ playerMuster, cpuMuster, indicator, uncontested }` — the HUD's whole displayed shape (SCRUM-30)                                                                            | `clashHud.ts`              |
| `deriveClashHud`                        | Total, pure — `ClashState \| null` to `ClashHudState`; reads Muster and turn straight off the engine's result (SCRUM-30)                                                      | `clashHud.ts`              |
| `deriveHint`                            | Total, pure — `(MatchUiState, ClashHudState)` to the palette's hint string; moved out of `VanguardMatch.tsx`'s own body so it's unit-tested without a renderer (SCRUM-30)     | `clashHud.ts`              |
| `useHexRovingFocus`                     | One tab stop across the whole board; axial arrow-key movement, `Home`/`End`, `Escape`                                                                                         | `useHexRovingFocus.ts`     |
| `HexRovingFocus`                        | `{ groupRef, tabStopKey, handleKeyDown }` — the hook's return shape                                                                                                           | `useHexRovingFocus.ts`     |
| `HexCell`                               | Default export — one board cell as a native `<button>` (AC1, AC4)                                                                                                             | `HexCell.tsx`              |
| `VanguardBoardView`                     | Default export — the board group (AC1), renders every coordinate via `HexCell`                                                                                                | `VanguardBoardView.tsx`    |
| `ActionPalette`, `ActionPaletteProps`   | Default export — the three Clash actions plus the hint line (AC2)                                                                                                             | `ActionPalette.tsx`        |
| `MusterBand`, `MusterBandProps`         | Default export — the status-band HUD: both sides' Muster and the turn/lifecycle badge (SCRUM-30, AC1–AC4)                                                                     | `MusterBand.tsx`           |
| `ClashOverPanel`, `ClashOverPanelProps` | Default export — the Breach and round-over overlay                                                                                                                            | `ClashOverPanel.tsx`       |
| `VanguardMatch`                         | Default export — the mount, satisfying `VanguardMountProps`                                                                                                                   | `VanguardMatch.tsx`        |
| `TrickEntryForm`, `TrickEntryFormProps` | Default export — Test-mode manual trick entry (AC6)                                                                                                                           | `TrickEntryForm.tsx`       |
| `TestModeVanguardHost`                  | Default export — the Test-mode host owning `requestTricksWon` (AC6)                                                                                                           | `TestModeVanguardHost.tsx` |

`hexLayout.ts`, `labels.ts`, `legalTargets.ts`, `matchReducer.ts`, and `clashHud.ts` import no
React and touch no DOM global, so all five are unit-tested in the cheap `node` Vitest project; the
components — including `MusterBand.tsx`, purely presentational — are tested in the `dom` project
(see `war-council-ui.md`'s § _The two-project Vitest layout_ — this module follows the identical
split, unchanged).

## How it works

### A full-viewport shell, sibling to War Council's

`VanguardMatch.tsx` renders one `.vg-shell` grid, defined in `vanguard.css`:
`height: 100dvh; width: 100%; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto;`,
with `env(safe-area-inset-*)` padding — the same idiom `war-council-ui.md` documents in full, reused
rather than re-derived. The status band and action palette take `auto`; the board takes `1fr`. Every
custom property and class carries a `vg-` prefix (confirmed free of collisions in `src/` during
planning, where `wc-` already had 95 hits).

`.vg-band` (the header, `grid-area: status`) is itself a two-row grid (SCRUM-30):
`grid-template-rows: auto auto`, its own row holding `.vg-band-round` ("Round N · The Clash") and its
second row holding `MusterBand`. This replaced a single flex row carrying only the round label and a
placeholder note; the second row was added because a three-cell Muster/turn scoreboard did not fit
the original thin single row at short viewports (`plan.md` → _Risks and judgement calls_ flagged this
as a space call, confirmed against the mockup during implementation).

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

The cost is `board.size²` engine calls (121 at `BOARD_SIZE = 11`), recomputed every render for all
three action kinds unconditionally — `VanguardMatch.tsx` calls it three times per render, once per
kind, so `ActionPalette`'s `enabled` map and the board's union `legalTargets` set (via
`allLegalTargets`, below) share one pass of results rather than re-asking per kind on demand. This is
a discrete turn-based board, not a pointer hot path, so recompute-from-scratch is the simplest
correct design — the same stance [vanguard.md](vanguard.md) documents for `connectedNetwork`. It
also mirrors `applyClashAction`'s own `Number.isFinite` guard on `musterAvailable`: without it, a
malformed Muster value would compare as affordable against every cost, so a non-finite value returns
an empty set outright.

### Click-to-act: one tap, the action inferred from what's on the cell (SCRUM-41)

SCRUM-41 removed the "arm an action, then tap a target" two-step AC2 originally shipped with
(SCRUM-29) — a deliberate revision of that ticket's own AC2, not a defect fix on top of it. The
player now taps any highlighted cell directly; `inferActionKind(cell, side)` in `legalTargets.ts`
is a small, total, pure mapping from a cell's occupancy to a `VanguardActionKind` — empty or a
defense cell infers `Expand`, the acting side's own token infers `Reinforce` (even at the
reinforcement cap), an enemy token infers `Overwrite`. It decides no legality — that's still
entirely `applyVanguardAction`/`applyClashAction`'s job — only which candidate action a tap should
attempt. Mapping a `Defense`-cell tap to `Expand` is a deliberate choice: `applyExpand`'s own
`CellIsDefense` check runs before any distance check, so the engine's own correct rejection reason
is what the player sees, rather than inventing a client-side "not a legal target" concept
`applyClashAction` has no reason code for.

Because the three action kinds are legal on structurally disjoint occupancy classes (Expand only
succeeds on an empty cell, Overwrite only on an enemy token, Reinforce only on the acting side's own
token — enforced by each `apply*` function's own first cell-state check), the union of the three
already-computed per-kind `legalTargetsFor` sets is already exactly "every cell the player can
currently tap to do something." `allLegalTargets(byAction)` in `legalTargets.ts` is therefore a
small, pure union of three already-computed `ReadonlySet<CellKey>`s — it does not re-run the engine
a fourth time. `VanguardMatch.tsx` wires the board's `legalTargets` prop to
`allLegalTargets(targetsByAction)` whenever it's the player's turn, so every currently-legal target
across all three kinds is highlighted continuously, not just one armed kind's targets.

`matchReducer.ts`'s `handleTapCell` calls `inferActionKind` once per tap and submits the result
directly via `applyClashAction` — there is no more `selectedAction` field, no `SelectAction`
dispatch, and no arming step of any kind. `ActionPalette` lost its `onSelect`/`selected` props and
its `<button>`s: it is now a read-only legend (`<ul className="vg-actions">` of plain `<li>`
items), still showing each kind's name and cost/range copy (`ACTION_NAME`/`ACTION_DESCRIPTION`) and
dimming (`data-enabled="false"`, `opacity: 0.38`) a kind with `enabled[kind] === false`, but
committing nothing — the only way to act is tapping a board cell.

A rejected tap sets `rejection` to the engine's own named reason and returns the input state's
`clash` **by reference** — matching `applyClashAction`'s no-partial-mutation guarantee, so a
rejected tap provably cannot have touched the board. The hint line (rendered by `ActionPalette`,
still) shows it via `REJECTION_MESSAGE` in an `aria-live="polite"` region; `MatchActionKind.ClearRejection`
(renamed from `CancelSelection` — there is nothing left to "cancel" an arming of, so Escape now only
dismisses a rejection banner) or the next successful `TapCell` clears it.

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

### The Muster/turn HUD (SCRUM-30) and why `CpuTurn` is typed but not reachable here

`clashHud.ts`'s `deriveClashHud(clash: ClashState | null): ClashHudState` is a total, pure read of
`ClashState` — no legality, cost, or turn-order rule of its own, matching the reducer's own
"decides no rule" convention below. With no clash yet (the War Council still deciding the round)
it returns `{ playerMuster: null, cpuMuster: null, indicator: AwaitingMuster, uncontested: false }`,
distinguishing "not started" from "zero" so the HUD never reads "you have 0 moves" before a round
has begun. Once a clash exists, `playerMuster`/`cpuMuster` are read straight off
`clash.muster[PlayerSide.Player]`/`clash.muster[PlayerSide.Cpu]`; while `status === InProgress` the
`indicator` is `PlayerTurn` or `CpuTurn` from `clash.turn`, and `uncontested` re-reads the identical
predicate `applyClashAction`'s own step 7 already uses to lock a turn — `clash.muster[mover] > 0 &&
clash.muster[other] === 0` — rather than deriving a second version of the same rule. Once `status`
leaves `InProgress` (`Breached` or `Complete`), the indicator becomes `Resolved` and `uncontested`
is forced `false`; the two counts are left exactly as `applyClashAction` last set them, which is
what lets `MusterBand` keep showing the frozen final tallies behind `ClashOverPanel`'s overlay (AC4)
with no special-casing in either component.

`deriveHint(ui: MatchUiState, hud: ClashHudState): string` moved out of `VanguardMatch.tsx`'s own
body into this same module so it is unit-tested without a renderer (it was previously a
module-local function inside the component file). Its cascade is unchanged in priority — a live
`ui.rejection` always wins, via `REJECTION_MESSAGE` — but its lifecycle branches now switch on
`hud.indicator` instead of the two separate `playerTurn`/`selectedAction`-shaped booleans the
component used to compute inline, and its uncontested branches name the mover's exact remaining
Muster count (`` `CPU is out of moves — you're spending your remaining ${hud.playerMuster} moves` ``),
matching AC3's own example copy verbatim in shape.

`MusterBand.tsx` is the presentational sibling that renders `ClashHudState` with no state and no
handler of its own: a `role="group" aria-label="Muster and turn"` three-cell layout — a Muster cell
for the player, a turn/lifecycle badge in the middle switching its text off a `TURN_LABEL` map keyed
by `TurnIndicator`, a Muster cell for the CPU — mirroring `war-council-ui.md`'s `RoundStatusBand`
scoreboard shape rather than inventing a new one. The uncontested case is marked by a second,
separately-styled `<span data-visible={hud.uncontested}>Uncontested</span>`, not by a colour change
alone, satisfying `game-ux`'s "state reads without motion or colour alone" rule; each Muster value
falls back to an em dash (`hud.playerMuster ?? '—'`) rather than a bare `0` while `AwaitingMuster`.
No `aria-live` region — like `RoundStatusBand`, the counts and badge text simply update on normal
re-render, since nothing here is announced mid-interaction the way a rejection banner is.

`TurnIndicator.CpuTurn` is a real, tested branch of the type — but it is **provably unreachable
through `VanguardMatch`'s actual render output**, confirmed by tracing `matchReducer.ts`, not
guessed: `advanceCpu` (above) runs synchronously inside `handleMusterReady` and `handleTapCell`,
_before_ either handler ever returns a new `MatchUiState`, and its `while` loop does not stop until
`current.turn` genuinely returns to `Player` or `current.status` leaves `InProgress`. So
`ui.clash.turn` is provably always `Player` whenever `ui.clash.status === InProgress`, in every
state this mount ever stores or renders — the CPU's own turns are always fully drained within one
synchronous batch, never observed mid-turn. `deriveClashHud`'s `CpuTurn`/uncontested-for-CPU
branches are exercised only through direct fixtures in `clashHud.test.ts` and `MusterBand.test.tsx`
(a hand-built `ClashState` with `turn: PlayerSide.Cpu`), the identical "typed but currently
unreachable through today's caller" pattern this module already carries for the `cpuRejected`
`MatchRejection` branch, above. `plan.md` → Part 1 → _Assumptions_ carries the full trace and names
this as the plan's single most consequential judgement call, flagged for the developer to re-check
if a future engine change ever lets a CPU turn become independently observable — at which point this
branch would need an end-to-end test, not just a fixture-level one.

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
  arithmetic, and no `hasReachedBreach` call. `clashHud.ts`'s `uncontested` flag re-reads
  `applyClashAction`'s own step-7 exhaustion predicate rather than deriving a second version of it.
- **Exactly one effect exists in the module** (`VanguardMatch.tsx`, the `requestTricksWon` request) —
  verified by grep in the contract's Final verification. It registers no listener, timer, observer,
  `requestAnimationFrame`, or `AbortController`; its only resource is a `cancelled` boolean released
  in its own cleanup.
- **`hexLayout.ts`, `labels.ts`, `legalTargets.ts`, `matchReducer.ts`, and `clashHud.ts` import no
  React and touch no DOM global** — verified by grep, which is what lets them run in the `node`
  Vitest project.
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
- **Muster counts and a turn indicator now ship (SCRUM-30).** `MusterBand`, driven by
  `clashHud.ts`'s `deriveClashHud`, replaced the former placeholder note in `.vg-band` — see
  _The Muster/turn HUD (SCRUM-30)_ above. `TurnIndicator.CpuTurn` and its uncontested pairing remain
  typed and fixture-tested but not reachable through this mount's real render output, per the same
  section.
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
  - Whether the single shared brass-ring highlight (rather than a colour per inferred action kind)
    reads clearly enough with several cells lit up at once now that SCRUM-41 shows every legal
    target across all three kinds simultaneously (no longer applicable: whether two taps per Clash
    action dragged — SCRUM-41 made it one tap, removing the arming step this bullet used to ask
    about).
  - Whether inferring `Expand` for a tapped defense cell (surfacing `CellIsDefense`) feels like the
    right rejection (SCRUM-41).
  - Whether an 11×11 rhombus is legible and pleasant at a phone viewport, and whether 121 cells is
    the right density. `BOARD_SIZE` stays SCRUM-21's placeholder `11`, retunable in one line in
    `src/vanguard/config.ts` — not this module's own value.
  - Whether a screen-reader user can genuinely navigate a 2D hex board by axial arrow keys. QA can
    confirm focus moves; whether the mental model works is real assistive-technology use.
  - Accepting this module's single `try`/`catch` (around `chooseCpuClashAction`'s dead-end throw),
    where `src/app/warCouncil/` has none.
  - Accepting that `src/App.tsx`'s mode control is throwaway scaffolding SCRUM-34 deletes.
  - The exact HUD copy (`TURN_LABEL`'s four strings, the "Uncontested" marker, and `deriveHint`'s
    uncontested sentences) and the exact visual treatment of the turn-active/uncontested badge
    (colour, shape, whether it pulses) are mockup-confirmed defaults, not fixed permanently
    (`plan.md` → _Risks and judgement calls_).
  - Whether the `.vg-band` two-row header reads well at a genuinely short phone viewport — worth
    judging on a real device, which is QA's job, not something planned or implemented against a
    guess (`plan.md` → _Risks and judgement calls_).
