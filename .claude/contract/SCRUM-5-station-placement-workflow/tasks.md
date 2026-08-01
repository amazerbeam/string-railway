# Tasks: Station placement workflow — draw, position and legality feedback

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-01

**Goal:** Make §5.2's station step playable and legible — add a `DrawEvent` trace so the engine's already-implemented recycles and skips stop being invisible, then build the draw panel, the pointer-tracked ghost card with live per-constraint legality feedback, the guarded commit, and the marker glyph on top of it.

**Spec:** `plan.md` in this folder.

**Two decisions made here, not in `plan.md`** — both are file/type-shape calls that `plan.md` leaves to tasks, recorded up front so they are not mistaken for drift:

1. **`validateStationPlacement`'s return type is narrowed to a new `StationPlacementResult`** (Task 6). It is annotated `PlacementResult` today, whose `reason` is the wide `RejectionReason | StationRejectionReason` union — so the drag hook would receive a reason that could be one of the ten §10.2 string codes and need a cast to fill `plan.md`'s declared `reason: StationRejectionReason | null`. The function only ever returns the three §5.2 codes, and its own doc comment says so. Narrowing is verified non-breaking: `grep -rn "PlacementResult" src/` returns **3 hits, all inside `validate.ts` itself** (the declaration and two return annotations); no test annotates it, and both call sites (`reducer.ts:74`, `search.ts:141`) read only `.ok`. `PlacementResult` itself is kept unchanged for `validateStringPlacement`.
2. **The play area is promoted into `src/ui/PlayArea.tsx`** (Task 14). `useStationPlacement` must be called unconditionally, but `AppShell`'s game block only renders when `state !== null` — calling the hook in `GameShell` would mean passing it a nullable state and widening `plan.md`'s signature. Promoting the existing `{state !== null && (…)}` block into a component that only mounts with a non-null state keeps the planned signature exactly and keeps `AppShell.tsx` under its line budget. Same precedent as `SCRUM-3-4`'s `setupValidation.ts` split.

---

## File map

**Created:**

- `src/rules/staging.ts` — `cardRectAt` and `stationStepStage`, the two pure derivations behind the placement UI
- `src/rules/__tests__/staging.test.ts` — specs for both
- `src/ui/stationCardText.ts` — one card description shared by the placed card's `aria-label` and the in-hand panel
- `src/ui/placementMessages.ts` — `STATION_REJECTION_REASON` and `DRAW_EVENT` codes → player-facing copy
- `src/ui/useSvgPoint.ts` — client → world coordinate conversion via `getScreenCTM`
- `src/ui/useStationPlacement.ts` — the drag: pointer capture, ref-mutated ghost, legality-on-change state, guarded commit
- `src/ui/StationGhost.tsx` — the in-progress card, drawn at the origin and positioned by ref
- `src/ui/StationGhost.css`
- `src/ui/StationStepPanel.tsx` — deck count, drawn-card details, draw trace, live legality verdict, the two controls
- `src/ui/StationStepPanel.css`
- `src/ui/PlayArea.tsx` — owns the board `svgRef` and the placement hook; mounts only with a non-null `GameState`

**Modified:**

- `src/constants/game.ts` — add `DRAW_EVENT` and `STATION_STEP_STAGE`
- `src/rules/types.ts` — add `DrawEvent`, `DrawEventKind`, `StationStepStage`; add `lastDraw` to `GameState`
- `src/rules/setup.ts:189-205` — initialise `lastDraw` in the one full `GameState` literal
- `src/rules/validate.ts:24-64` — narrow `validateStationPlacement` to `StationPlacementResult`
- `src/rules/turn.ts` — emit `DrawEvent`s from `beginStationStep`; export `MAX_STATION_STEP_FAILURES`; clear `lastDraw` in `advanceTurn`
- `src/rules/reducer.ts:32-93` — lift the trace onto `lastDraw`; emit the two Rural events
- `src/rules/__tests__/fixtures.ts:64-81` — add `lastDraw` to `makeState`'s defaults
- `src/rules/__tests__/turn.test.ts` — trace coverage
- `src/rules/__tests__/reducer.test.ts` — `lastDraw` assembly coverage
- `src/rules/__tests__/setup.test.ts:232` — assert a fresh state's `lastDraw` is empty
- `src/ui/StationCard.tsx` — marker glyph; use the shared description
- `src/ui/StationCard.css` — marker glyph styling
- `src/ui/Board.tsx` — optional drag props and ghost slot; `role="img"` → `role="group"`
- `src/ui/Board.css` — `touch-action` and drag cursor
- `src/ui/AppShell.tsx` — render `PlayArea`

**Deleted:** *(none)*

**Developer decides or observes:**

- **Whether the "Draw station" click is acceptable for AC1**, or `BEGIN_TURN` should instead run synchronously inside `newGame`. The click avoids a StrictMode double-dispatch into `applyBeginTurn`'s throw; the alternative covers only the first turn.
- **Whether to add jsdom + a Vitest environment split** so the drag gets component tests. A new devDependency, so it needs approval. Until then AC2/AC3/AC4 are covered by unit tests on the logic beneath them, **not** by driving a pointer.
- **Whether the ghost tracks the pointer without lag**, whether legal-versus-illegal reads at a glance, whether the rejection sentences land, and whether picking the card up by pressing on the board feels natural. Run `npm run dev` and look — no test answers these.
- **Whether `RURAL_CHAIN_CAPPED` earns its place in the panel.** AC5 requires only the behaviour, not the message.
- **Whether the marker glyph should appear on starting stations** (current plan: yes, wherever `markerOwner !== null`, matching where §7.3's owner penalty fires) or only on Landmark/Depot (`&& card.flags.needsMarker`).
- **The board `<svg>`'s `role="group"`** changes what a screen reader announces for SCRUM-4's delivered board.
- **Reaching M4's three-failure skip and M5's empty deck in play** needs a contrived seed or a debug affordance — neither is built here.
- **`SCRUM-3-4-config-setup-and-board/tasks.md` still reads `Status: IN PROGRESS`** with all 93 steps checked. Not this contract's work; worth flipping to `COMPLETE`.
- **No `rules.json` value is chosen or changed by this contract.** No new key is added.

---

## Phase 1 — The draw trace in the engine

Everything in this phase is additive to `src/rules/`: two constant maps, one new type, one new required `GameState` field, and event emission threaded through `beginStationStep`'s existing control flow without moving any of it. The phase boundary is safe because the two `GameState` literals are updated in the same task as the field that breaks them, so the tree type-checks at every task boundary. No UI file is touched yet.

### Task 1: Add `DRAW_EVENT` and `STATION_STEP_STAGE` to the constants map ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/constants/game.ts` — append after `GAME_ACTION`
- Config: none

- [x] **Step 1: Append both constant maps to the end of `src/constants/game.ts`**

Follow the file's existing convention: `as const` object, trailing comment on each member naming its rulebook section or M-number.

```ts
/**
 * §5.2's draw-and-recycle sequence, made reportable (SCRUM-5 AC5/AC7/AC8/AC9).
 * beginStationStep already performs every one of these; without a trace it
 * performs them invisibly, and a Landmark bounced for want of a marker is
 * indistinguishable from a clean draw.
 *
 * Deliberately NOT added to MOVE_KIND, for the reason GAME_ACTION records
 * above: Move is the persisted log undo and replay derive from, and every
 * event here is re-derivable by replaying that log through beginStationStep.
 */
export const DRAW_EVENT = {
  DREW: 'DREW',
  RECYCLED_NEEDS_MARKER: 'RECYCLED_NEEDS_MARKER', // §7.3 — both markers already placed
  RECYCLED_NO_LEGAL_PLACEMENT: 'RECYCLED_NO_LEGAL_PLACEMENT', // M4 — counts toward the skip
  SKIPPED_NO_LEGAL_PLACEMENT: 'SKIPPED_NO_LEGAL_PLACEMENT', // M4 — 3 consecutive failures
  SKIPPED_DECK_EMPTY: 'SKIPPED_DECK_EMPTY', // M5 — nothing is ever reshuffled
  EXTRA_DRAW_FROM_RURAL: 'EXTRA_DRAW_FROM_RURAL', // §7.3 Draw Station
  RURAL_CHAIN_CAPPED: 'RURAL_CHAIN_CAPPED', // §7.3 "disregard it — never a third"
} as const

/**
 * Which stage of §10.4 step 1 the state is in. AWAITING_DRAW and SKIPPED both
 * present as phase STATION with no pendingCard — see src/rules/staging.ts for
 * what separates them.
 */
export const STATION_STEP_STAGE = {
  AWAITING_DRAW: 'AWAITING_DRAW',
  PLACING: 'PLACING',
  SKIPPED: 'SKIPPED',
  DONE: 'DONE',
} as const
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add the `DrawEvent` type and the `GameState.lastDraw` field, with both construction sites ✓

- Skill: `react-frontend`

This is the mandatory single-task shape for a state-shape change: the field, its type, and **every** full `GameState` literal the audit found move together. Splitting them would leave a task boundary where the tree does not compile.

**Files:**
- Modify: `src/rules/types.ts` — import the two new constants, add `DrawEventKind` / `StationStepStage` / `DrawEvent`, add `lastDraw` to `GameState`
- Modify: `src/rules/setup.ts:189-205` — the generator's `GameState` literal
- Modify: `src/rules/__tests__/fixtures.ts:64-81` — `makeState`'s defaults
- Test: `src/rules/__tests__/setup.test.ts:232` — assert a fresh state's trace is empty

- [x] **Step 1: Add the types to `src/rules/types.ts`**

Extend the existing type-only import from `../constants/game` with `DRAW_EVENT` and `STATION_STEP_STAGE`, then add alongside the other derived unions (near `SkipReason` at line 41):

```ts
export type DrawEventKind = (typeof DRAW_EVENT)[keyof typeof DRAW_EVENT]
export type StationStepStage = (typeof STATION_STEP_STAGE)[keyof typeof STATION_STEP_STAGE]
```

And add the interface next to `StationCard`:

```ts
/** One step of §5.2's draw-and-recycle sequence, in the order it happened. */
export interface DrawEvent {
  readonly kind: DrawEventKind
  /** The card the event concerns; null for the two SKIPPED_* kinds, which are
   *  about the sequence terminating rather than about any one card. */
  readonly cardId: StationId | null
  readonly stationType: StationType | null
  /** Consecutive M4 failures accumulated at the moment this event fired, so the
   *  UI can say "2 of 3" without knowing the ceiling itself. */
  readonly failures: number
}
```

- [x] **Step 2: Add `lastDraw` to `GameState`, immediately after `lastScoring`**

```ts
  readonly lastScoring: ScoringBreakdown | null
  /** §5.2's trace for the most recent draw attempt (SCRUM-5 AC7/AC8/AC9).
   *  Transient UI-facing derived state, exactly like lastScoring — but an array
   *  rather than `| null`, because "no draw happened" and "an empty sequence of
   *  draw events" are the same fact here and every read site is a `.map` that
   *  would otherwise carry a null guard for no information gain. */
  readonly lastDraw: readonly DrawEvent[]
  readonly status: 'IN_PLAY' | 'ENDED'
```

- [x] **Step 3: Initialise it at both construction sites**

In `src/rules/setup.ts`, in the `const state: GameState = {` literal, directly after `lastScoring: null,`:

```ts
      lastScoring: null,
      lastDraw: [],
```

In `src/rules/__tests__/fixtures.ts`, in `makeState`'s `defaults`, directly after `lastScoring: null,`:

```ts
    lastScoring: null,
    lastDraw: [],
```

- [x] **Step 4: Assert the fresh-state default in `src/rules/__tests__/setup.test.ts`**

Beside the existing `expect(state.lastScoring).toBeNull()` at line 232:

```ts
    expect(state.lastDraw).toEqual([])
```

- [x] **Step 5: Typecheck, then run the two affected specs**

Run: `npm run typecheck; npx vitest run src/rules/__tests__/setup.test.ts`
Expected: typecheck exits 0. Vitest reports 0 failed — the run proves no *other* `GameState` literal was missed, since a missing required field is a compile error the typecheck would already have caught.

**Verified with a caveat:** typecheck exits 0 and 36/37 specs pass. One pre-existing, unrelated failure — `emits a board that passes validateSetup for every player count across 20 seeds (AC9)` — throws `RIVER_TOO_NEAR_MOUNTAIN` for the shipped `rules.json`'s real M2 values at seed 0/3 players. Confirmed unrelated to this task (no `lastDraw` involvement; a §12 tuning symptom against the developer-owned config, not this contract's file list).

### Task 3: Emit `DrawEvent`s from `beginStationStep` and export the M4 ceiling ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/turn.ts` — `StationStepOutcome`, `MAX_STATION_STEP_FAILURES`, `beginStationStep`, `advanceTurn`
- Test: `src/rules/__tests__/turn.test.ts`

- [x] **Step 1: Write the failing specs in `src/rules/__tests__/turn.test.ts`**

Add to the existing `beginStationStep` describe block. The file already imports `TEST_CONFIG, makeCard, makePath, makeSeat, makeState, makeStation` from `./fixtures`; extend the `../../constants/game` import with `DRAW_EVENT`, and the `../turn` import with `MAX_STATION_STEP_FAILURES`.

```ts
  it('records a DREW event naming the card it settled on', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      phase: TURN_PHASE.STATION,
      deck: [makeCard(STATION_TYPE.HAMLET)],
      paths: [makePath(PATH_KIND.BORDER, border(500, 500))],
    })
    const outcome = beginStationStep(state, TEST_CONFIG)
    expect(outcome.events.map((event) => event.kind)).toEqual([DRAW_EVENT.DREW])
    expect(outcome.events[0].stationType).toBe(STATION_TYPE.HAMLET)
  })

  it('records RECYCLED_NEEDS_MARKER when the seat has no markers left (§7.3, AC7)', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1', { markersLeft: 0 })],
      turnOrder: [PINK],
      phase: TURN_PHASE.STATION,
      deck: [makeCard(STATION_TYPE.LANDMARK), makeCard(STATION_TYPE.HAMLET)],
      paths: [makePath(PATH_KIND.BORDER, border(500, 500))],
    })
    const outcome = beginStationStep(state, TEST_CONFIG)
    expect(outcome.events.map((event) => event.kind)).toEqual([
      DRAW_EVENT.RECYCLED_NEEDS_MARKER,
      DRAW_EVENT.DREW,
    ])
    // The bounced card went to the BOTTOM, and it did NOT count as an M4 failure.
    expect(outcome.state.stationStepFailures).toBe(0)
  })

  it('records SKIPPED_DECK_EMPTY on an empty deck (M5, AC9)', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      phase: TURN_PHASE.STATION,
      deck: [],
      paths: [makePath(PATH_KIND.BORDER, border(500, 500))],
    })
    const outcome = beginStationStep(state, TEST_CONFIG)
    expect(outcome.events.map((event) => event.kind)).toEqual([DRAW_EVENT.SKIPPED_DECK_EMPTY])
    expect(outcome.events[0].cardId).toBeNull()
  })
```

For the M4 path, reuse whatever board the file's **existing** three-failure spec uses (the `border` helper at a size below `TEST_CONFIG.cardSize`, which is the file's established way to make every placement illegal):

```ts
  it('counts each unplaceable draw and ends in SKIPPED_NO_LEGAL_PLACEMENT (M4, AC8)', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      phase: TURN_PHASE.STATION,
      deck: [
        makeCard(STATION_TYPE.HAMLET),
        makeCard(STATION_TYPE.VILLAGE),
        makeCard(STATION_TYPE.TOWN),
        makeCard(STATION_TYPE.SCENIC),
      ],
      // Smaller than TEST_CONFIG.cardSize, so no rect can ever fit.
      paths: [makePath(PATH_KIND.BORDER, border(5, 5))],
    })
    const outcome = beginStationStep(state, TEST_CONFIG)
    expect(outcome.events.map((event) => event.kind)).toEqual([
      DRAW_EVENT.RECYCLED_NO_LEGAL_PLACEMENT,
      DRAW_EVENT.RECYCLED_NO_LEGAL_PLACEMENT,
      DRAW_EVENT.RECYCLED_NO_LEGAL_PLACEMENT,
      DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT,
    ])
    // failures is the running count INCLUDING the event's own failure, so the
    // UI can render "n of MAX" straight from the event.
    expect(outcome.events.map((event) => event.failures)).toEqual([
      1,
      2,
      MAX_STATION_STEP_FAILURES,
      MAX_STATION_STEP_FAILURES,
    ])
  })
```

Add one spec for `advanceTurn`, in that function's existing describe block:

```ts
  it('clears lastDraw so a previous seat trace does not linger into the next turn', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      phase: TURN_PHASE.COMPLETE,
      lastDraw: [
        { kind: DRAW_EVENT.DREW, cardId: asStationId('HAMLET-1'), stationType: STATION_TYPE.HAMLET, failures: 0 },
      ],
    })
    expect(advanceTurn(state).lastDraw).toEqual([])
  })
```

- [x] **Step 2: Run the new specs and watch them fail for the right reason**

Run: `npx vitest run src/rules/__tests__/turn.test.ts`
Expected: the new specs fail. Because `events` does not exist on `StationStepOutcome` yet this surfaces as a **TypeScript transform error for the whole file**, not as individual assertion failures — that is the expected shape here, not a broken test file.

**Observed:** the 5 new specs failed for the right reason (`events` undefined), but as a runtime `TypeError` on `outcome.events.map`, not a whole-file transform error — Vitest's default esbuild transform strips types without checking them, so an arity/property mismatch surfaces at the assertion, not at collection. Equivalent evidence that the specs exercise the not-yet-built field.

- [x] **Step 3: Export the M4 ceiling**

In `src/rules/turn.ts`, add `export` to the existing constant. Leave its doc comment (which already states it is a rulebook constant, not a `rules.json` tunable) intact and append one line:

```ts
/**
 * M4 — after this many consecutive failures to place a drawn card, step 1
 * is skipped. §10.4's literal `failures >= 3`. Rulebook constant, not a
 * rules.json tunable.
 *
 * Exported so UI copy can state the ceiling ("2 of 3") without a literal.
 */
export const MAX_STATION_STEP_FAILURES = 3
```

- [x] **Step 4: Add `events` to `StationStepOutcome` and emit them**

Extend the type import from `./types` with `DrawEvent` and `DrawEventKind`, and the value import from `../constants/game` with `DRAW_EVENT`.

```ts
export interface StationStepOutcome {
  readonly state: GameState
  readonly skipped: SkipReason | null
  /** §5.2's sequence, in the order it happened, so the UI can show a recycle
   *  instead of silently presenting whatever card finally succeeded. */
  readonly events: readonly DrawEvent[]
}
```

Inside `beginStationStep`, immediately after the `extraDraws` adjustment and before `finish`:

```ts
  const events: DrawEvent[] = []
  // Reads the live `failures` at call time, so an event carries the count
  // INCLUDING its own failure when called after the increment.
  const note = (kind: DrawEventKind, card: StationCard | null): void => {
    events.push({
      kind,
      cardId: card?.id ?? null,
      stationType: card?.type ?? null,
      failures,
    })
  }
```

Add `events` to `finish`'s returned object:

```ts
  ): StationStepOutcome => ({
    state: { ...state, deck, stationStepFailures: failures, extraDraws, pendingCard },
    skipped,
    events,
  })
```

Then place one `note` call at each of the four existing exit/continue points — **no control flow changes**:

```ts
    if (deck.length === 0) {
      note(DRAW_EVENT.SKIPPED_DECK_EMPTY, null)
      return finish(SKIP_REASON.DECK_EMPTY, null)
    }
```

```ts
    if (card.flags.needsMarker && seat.markersLeft === 0) {
      deck = [...rest, card]
      note(DRAW_EVENT.RECYCLED_NEEDS_MARKER, card)
      markerRecycleStreak += 1
```

```ts
    if (!hasLegalStationPlacement(candidateState, card, config)) {
      deck = [...rest, card]
      failures += 1
      note(DRAW_EVENT.RECYCLED_NO_LEGAL_PLACEMENT, card)
      if (failures >= MAX_STATION_STEP_FAILURES) {
        note(DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT, null)
        return finish(SKIP_REASON.NO_LEGAL_PLACEMENT, null)
      }
      continue
    }

    deck = rest
    note(DRAW_EVENT.DREW, card)
    return finish(null, card)
```

- [x] **Step 5: Clear `lastDraw` in `advanceTurn`**

In the `nextState` literal, after `pendingCard: null,`:

```ts
    pendingCard: null,
    // A previous seat's draw trace must not linger into the next seat's turn,
    // in the window between END_TURN and that seat's own BEGIN_TURN.
    lastDraw: [],
```

- [x] **Step 6: Run the spec and typecheck**

Run: `npm run typecheck; npx vitest run src/rules/__tests__/turn.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed.

**Verified:** typecheck exits 0; Vitest reports `Tests  23 passed (23)`.

### Task 4: Assemble `lastDraw` in the reducer, including the two Rural events ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/rules/reducer.ts:32-93` — `applyBeginTurn` and `applyPlaceStation`
- Test: `src/rules/__tests__/reducer.test.ts`

- [x] **Step 1: Write the failing specs in `src/rules/__tests__/reducer.test.ts`**

Extend the `../../constants/game` import with `DRAW_EVENT`.

```ts
  it('records the draw trace on lastDraw when a turn begins', () => {
    const state = makeState({
      seats: [makeSeat('PINK', 'P1')],
      turnOrder: [PINK],
      phase: TURN_PHASE.STATION,
      deck: [makeCard(STATION_TYPE.HAMLET)],
      paths: [makePath(PATH_KIND.BORDER, border(500, 500))],
    })
    const result = gameReducer(state, { kind: MOVE_KIND.BEGIN_TURN }, TEST_CONFIG)
    expect(result.lastDraw.map((event) => event.kind)).toEqual([DRAW_EVENT.DREW])
  })

  it('records EXTRA_DRAW_FROM_RURAL and the follow-on draw when a Rural is placed (AC5)', () => {
    // …board with a legal rect for both cards, pendingCard a RURAL, deck holding
    // one further card. Assert the kinds in order:
    expect(result.lastDraw.map((event) => event.kind)).toEqual([
      DRAW_EVENT.EXTRA_DRAW_FROM_RURAL,
      DRAW_EVENT.DREW,
    ])
    // The chain is still open for exactly one more card — phase stays STATION.
    expect(result.phase).toBe(TURN_PHASE.STATION)
    expect(result.pendingCard).not.toBeNull()
  })

  it('records RURAL_CHAIN_CAPPED and queues nothing on a second Rural (§7.3, AC5)', () => {
    // …same board, but drewRuralAlready: true and pendingCard a second RURAL.
    expect(result.lastDraw.map((event) => event.kind)).toEqual([DRAW_EVENT.RURAL_CHAIN_CAPPED])
    expect(result.extraDraws).toBe(0)
    expect(result.phase).toBe(TURN_PHASE.STRING)
  })

  it('leaves state untouched and logs nothing on an illegal PLACE_STATION (AC4)', () => {
    // The file already has a spec at line ~75 overlapping stationB; extend it
    // (or add beside it) with the trace assertion:
    expect(result).toBe(state)
  })
```

Build each board with the existing `makeState`/`makeStation`/`makeCard`/`makePath` fixtures, following the shape of the file's current `PLACE_STATION` specs.

- [x] **Step 2: Run and confirm they fail**

Run: `npx vitest run src/rules/__tests__/reducer.test.ts`
Expected: the new specs fail (`lastDraw` is `[]` for every case; the two Rural specs get empty arrays).

**Observed:** confirmed — 3 new specs failed exactly this way (the AC4 extension passed immediately since `result` was already `state` by reference).

- [x] **Step 3: Set `lastDraw` in `applyBeginTurn`**

Replace the trailing return:

```ts
  const outcome = beginStationStep(reset, config)
  return appendMove({ ...outcome.state, lastDraw: outcome.events }, move)
```

- [x] **Step 4: Assemble the trace in `applyPlaceStation`**

Extend the `../constants/game` import with `DRAW_EVENT` and the `./types` type import with `DrawEvent`. Replace the body from the pending-card guard through the final `appendMove`:

```ts
  const card = state.pendingCard
  if (card === null || card.id !== move.cardId) {
    throw new Error('gameReducer: PLACE_STATION cardId does not match the pending card')
  }

  // §7.3's "disregard it — never a third". MUST be read from the PRE-commit
  // state: commitStationPlacement sets drewRuralAlready true as a side effect,
  // so reading it afterwards would report every Rural as capped.
  const chainCapped = card.flags.drawStation && state.drewRuralAlready

  const result = validateStationPlacement(state, move.rect, config)
  if (!result.ok) {
    return state
  }

  const committed = commitStationPlacement(state, move.rect, config)

  const events: DrawEvent[] = []
  const noteCard = (kind: DrawEvent['kind']): void => {
    events.push({
      kind,
      cardId: card.id,
      stationType: card.type,
      failures: committed.stationStepFailures,
    })
  }
  if (chainCapped) {
    noteCard(DRAW_EVENT.RURAL_CHAIN_CAPPED)
  }

  let finalState: GameState
  if (committed.extraDraws > 0) {
    noteCard(DRAW_EVENT.EXTRA_DRAW_FROM_RURAL)
    const outcome = beginStationStep(committed, config)
    events.push(...outcome.events)
    finalState = {
      ...outcome.state,
      phase: outcome.state.pendingCard ? TURN_PHASE.STATION : TURN_PHASE.STRING,
      lastDraw: events,
    }
  } else {
    finalState = { ...committed, phase: TURN_PHASE.STRING, lastDraw: events }
  }

  return appendMove(finalState, move)
```

Note the guard is rewritten to narrow `card` once, so the later `card.flags` / `card.id` reads need no repeat null check. `applySkipStationStep` is deliberately **not** changed: the `SKIPPED_*` event written by `BEGIN_TURN` must stay on screen while the player acknowledges it.

- [x] **Step 5: Run the reducer and turn specs, and typecheck**

Run: `npm run typecheck; npx vitest run src/rules/__tests__/reducer.test.ts src/rules/__tests__/turn.test.ts`
Expected: typecheck exits 0; Vitest reports 0 failed.

**Verified:** typecheck exits 0; Vitest reports `Tests  38 passed (38)`.

---

## Phase 2 — Pure derivations for the placement surface

Two small pure functions that keep the coming components free of rule interpretation and turn-state guessing. Both are unit-testable with no DOM, which is the point. Nothing consumes them yet, so the phase ends type-checking with the engine untouched by the UI.

### Task 5: Create `src/rules/staging.ts` with `cardRectAt` and `stationStepStage` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/rules/staging.ts`
- Test: `src/rules/__tests__/staging.test.ts`

- [x] **Step 1: Write `src/rules/__tests__/staging.test.ts` first**

```ts
import { describe, expect, it } from 'vitest'
import { DRAW_EVENT, STATION_STEP_STAGE, TURN_PHASE } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { cardRectAt, stationStepStage } from '../staging'
import { asStationId } from '../types'
import type { DrawEvent } from '../types'
import { makeCard, makeState } from './fixtures'

const drawEvent = (kind: DrawEvent['kind']): DrawEvent => ({
  kind,
  cardId: asStationId('HAMLET-1'),
  stationType: STATION_TYPE.HAMLET,
  failures: 0,
})

describe('cardRectAt', () => {
  it('centres a square of exactly cardSize on the given point', () => {
    const rect = cardRectAt({ x: 100, y: 50 }, 20)
    expect(rect).toEqual({ x: 90, y: 40, width: 20, height: 20 })
  })

  it('keeps the rect centre equal to the input point for an odd size', () => {
    const rect = cardRectAt({ x: 0, y: 0 }, 15)
    expect(rect.x + rect.width / 2).toBe(0)
    expect(rect.y + rect.height / 2).toBe(0)
  })

  it('accepts negative coordinates without distorting the footprint', () => {
    const rect = cardRectAt({ x: -30, y: -30 }, 20)
    expect(rect).toEqual({ x: -40, y: -40, width: 20, height: 20 })
  })
})

describe('stationStepStage', () => {
  it('is AWAITING_DRAW in phase STATION with no card and no trace', () => {
    const state = makeState({ phase: TURN_PHASE.STATION, pendingCard: null, lastDraw: [] })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.AWAITING_DRAW)
  })

  it('is PLACING once a card is pending', () => {
    const state = makeState({
      phase: TURN_PHASE.STATION,
      pendingCard: makeCard(STATION_TYPE.HAMLET),
    })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.PLACING)
  })

  it('is SKIPPED when the trace ended in a skip, which AWAITING_DRAW otherwise looks identical to', () => {
    for (const kind of [DRAW_EVENT.SKIPPED_DECK_EMPTY, DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT]) {
      const state = makeState({
        phase: TURN_PHASE.STATION,
        pendingCard: null,
        lastDraw: [drawEvent(kind)],
      })
      expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.SKIPPED)
    }
  })

  it('is AWAITING_DRAW when the trace ended in a recycle rather than a skip', () => {
    const state = makeState({
      phase: TURN_PHASE.STATION,
      pendingCard: null,
      lastDraw: [drawEvent(DRAW_EVENT.RECYCLED_NEEDS_MARKER)],
    })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.AWAITING_DRAW)
  })

  it('is DONE outside phase STATION', () => {
    const state = makeState({ phase: TURN_PHASE.STRING })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.DONE)
  })

  it('is DONE on an ended game even though advanceTurn leaves phase STATION', () => {
    const state = makeState({ phase: TURN_PHASE.STATION, pendingCard: null, status: 'ENDED' })
    expect(stationStepStage(state)).toBe(STATION_STEP_STAGE.DONE)
  })
})
```

- [x] **Step 2: Run and confirm the file fails to resolve `../staging`**

Run: `npx vitest run src/rules/__tests__/staging.test.ts`
Expected: fails — the module does not exist yet.

**Verified:** failed with `Cannot find module '../staging'`.

- [x] **Step 3: Write `src/rules/staging.ts`**

```ts
/**
 * Pure derivations behind §10.4 step 1's player-facing surface. src/ui/ owns
 * turning a PointerEvent into world coordinates (getScreenCTM is a DOM call and
 * lives there); this module owns everything downstream of that point, so the
 * footprint rule and the stage machine are both unit-testable with no DOM.
 *
 * Adjudicates nothing: legality is validateStationPlacement's, and this module
 * never re-decides it.
 */
import { DRAW_EVENT, STATION_STEP_STAGE, TURN_PHASE } from '../constants/game'
import type { DrawEventKind, GameState, Point, Rect, StationStepStage } from './types'

/**
 * The pending card's footprint while it is being positioned, centred on
 * `centre`. Every station card is the same config.cardSize square (M2), which
 * is why the card itself is not a parameter — the same reasoning search.ts's
 * hasLegalStationPlacement records for its own unread `card`.
 */
export function cardRectAt(centre: Point, cardSize: number): Rect {
  const half = cardSize / 2
  return { x: centre.x - half, y: centre.y - half, width: cardSize, height: cardSize }
}

/** The two terminal events: the draw-and-recycle sequence ended with no card. */
const SKIP_EVENT_KINDS: ReadonlySet<DrawEventKind> = new Set([
  DRAW_EVENT.SKIPPED_DECK_EMPTY,
  DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT,
])

/**
 * Which stage of step 1 `state` is in. AWAITING_DRAW and SKIPPED both present
 * as phase STATION with no pendingCard and differ only in whether the last
 * draw attempt terminated in a skip — exactly the distinction a component
 * re-deriving this from three fields gets subtly wrong, which is why it is a
 * tested function.
 */
export function stationStepStage(state: GameState): StationStepStage {
  if (state.status === 'ENDED' || state.phase !== TURN_PHASE.STATION) {
    return STATION_STEP_STAGE.DONE
  }
  if (state.pendingCard !== null) {
    return STATION_STEP_STAGE.PLACING
  }
  const last = state.lastDraw[state.lastDraw.length - 1]
  return last !== undefined && SKIP_EVENT_KINDS.has(last.kind)
    ? STATION_STEP_STAGE.SKIPPED
    : STATION_STEP_STAGE.AWAITING_DRAW
}
```

- [x] **Step 4: Run the spec, typecheck, and confirm the boundary still holds**

Run: `npx vitest run src/rules/__tests__/staging.test.ts; npm run typecheck; npm run lint`
Expected: Vitest reports 0 failed; typecheck exits 0; lint exits 0 — lint is the gate that would catch a React import or DOM global under `src/rules/`.

**Verified:** Vitest `Tests  7 passed (7)`; typecheck exits 0; lint exits 0.

### Task 6: Narrow `validateStationPlacement`'s return type ✓

- Skill: `react-frontend`

Decision 1 from the header. The drag hook fills `plan.md`'s declared `reason: StationRejectionReason | null`; today's annotation would hand it the wide union and force a cast.

**Files:**
- Modify: `src/rules/validate.ts:24-64`
- Test: `src/rules/__tests__/validate.test.ts` — no change expected; run to prove it

- [x] **Step 1: Add the narrow result type and use it**

Leave `PlacementResult` exactly as it is — `validateStringPlacement` keeps it. Add beside it:

```ts
/**
 * §5.2 can only ever fail one of three ways, so the station validator says so
 * in its type rather than returning the ten-code §10.2 union its string
 * sibling shares. Lets the placement UI render a reason with no cast.
 */
export type StationPlacementResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: StationRejectionReason
      readonly stationId?: StationId
    }
```

Change `validateStationPlacement`'s return annotation from `PlacementResult` to `StationPlacementResult`. The body needs no change — it already returns only `STATION_REJECTION_REASON` members.

- [x] **Step 2: Typecheck and run every spec that touches validation**

Run: `npm run typecheck; npx vitest run src/rules/__tests__/validate.test.ts src/rules/__tests__/search.test.ts src/rules/__tests__/reducer.test.ts`
Expected: typecheck exits 0 — proving the narrowing broke no consumer; Vitest reports 0 failed.

**Verified:** typecheck exits 0; Vitest reports `Tests  56 passed (56)` across staging.test.ts, validate.test.ts, search.test.ts, reducer.test.ts run together.

---

## Phase 3 — The player-facing station step

The UI layer, built bottom-up: shared text, copy maps, coordinate conversion, the ghost, the drag hook, then the components that compose them. Each task leaves the tree type-checking, but the feature is only reachable from the browser after the last one. No new dependency and no `rules.json` change anywhere in this phase.

### Task 7: Share the card description and render the marker glyph ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/stationCardText.ts`
- Modify: `src/ui/StationCard.tsx` — use the shared description; add the marker glyph
- Modify: `src/ui/StationCard.css` — glyph styling

- [x] **Step 1: Create `src/ui/stationCardText.ts`**

```ts
import type { StationCard } from '../rules/types'

/**
 * One description for a card's §7.1 player limit and §7.2 black/grey connection
 * bonus, shared by the placed card's aria-label and the in-hand panel so the two
 * cannot drift. Every number comes from the card itself (§8 printed values via
 * STATION_DEFINITIONS) — none is a literal and none is a rules.json tunable.
 */
export function describeStationCard(card: StationCard): string {
  return `${card.type} station, connection bonus ${card.bonusFirst} first or ${card.bonusLater} later, player limit ${card.playerLimit}`
}
```

- [x] **Step 2: Use it in `src/ui/StationCard.tsx` and add the marker glyph**

Replace the inline `label` with the shared call, and add the glyph. Follow the file's existing fraction-of-`size` convention — add two constants beside `PAWN_RADIUS`:

```ts
/** Corner inset and radius for the §7.3 player-marker disc, kept clear of the
 *  §7.1 pawn row along the bottom edge so the two never read as one another. */
const MARKER_INSET = 0.16
const MARKER_RADIUS = 0.09
```

Then inside the `<g>`, after the pawns:

```tsx
      {station.markerOwner !== null && (
        <circle
          className="station-card__marker"
          cx={rect.x + size * (1 - MARKER_INSET)}
          cy={rect.y + size * MARKER_INSET}
          r={size * MARKER_RADIUS}
          fill={colour ?? undefined}
        />
      )}
```

Extend the `label` so the marker is announced too:

```ts
  const label =
    station.markerOwner === null
      ? describeStationCard(card)
      : `${describeStationCard(card)}, player marker placed`
```

- [x] **Step 3: Add the glyph style to `src/ui/StationCard.css`**

Follow the file's existing selector convention:

```css
.station-card__marker {
  stroke: #ffffff;
  stroke-width: 1.5;
  paint-order: stroke;
}
```

- [x] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

**Verified (phase-end block):** typecheck exits 0; lint exits 0 (0 errors, 0 warnings) — see Phase 3 verification summary at the end of this phase.

### Task 8: Create the rejection and draw-event copy maps ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/placementMessages.ts`

- [x] **Step 1: Write `src/ui/placementMessages.ts`**

Both maps are total `Record`s over their code union, so adding a code without its copy is a compile error rather than a blank message. `MAX_STATION_STEP_FAILURES` is imported, never written as a literal.

```ts
import { DRAW_EVENT, STATION_REJECTION_REASON } from '../constants/game'
import { MAX_STATION_STEP_FAILURES } from '../rules/turn'
import type { DrawEvent, StationRejectionReason, StationType } from '../rules/types'

/**
 * §5.2's three constraints in player-facing words (AC3 — the specific reason,
 * never a generic rejection). Typed as a total Record so a new code cannot ship
 * without copy.
 */
export const REJECTION_COPY: Readonly<Record<StationRejectionReason, string>> = {
  [STATION_REJECTION_REASON.TOUCHES_STRING]:
    'Touches a string — the border, the river, the mountain or a railway.',
  [STATION_REJECTION_REASON.TOUCHES_STATION]: 'Touches another station.',
  [STATION_REJECTION_REASON.NOT_INSIDE_BORDER]: 'Not fully inside the border string.',
}

/** Names the blocking station's type where the engine reported one. */
export function describeRejection(
  reason: StationRejectionReason,
  blockingStationType: StationType | null,
): string {
  const base = REJECTION_COPY[reason]
  return blockingStationType === null ? base : `${base} (${blockingStationType})`
}

/**
 * One sentence per §5.2 draw event, so AC7's marker bounce and AC8's failed
 * draws are shown rather than happening invisibly. The M4 ceiling is read from
 * turn.ts — a literal here would be a hard-coded rulebook constant in copy.
 */
export function describeDrawEvent(event: DrawEvent): string {
  const type = event.stationType ?? 'The card'
  switch (event.kind) {
    case DRAW_EVENT.DREW:
      return `Drew ${type}.`
    case DRAW_EVENT.RECYCLED_NEEDS_MARKER:
      return `${type} needs a player marker and both of yours are already placed — returned to the bottom of the deck (§7.3). Drawing again.`
    case DRAW_EVENT.RECYCLED_NO_LEGAL_PLACEMENT:
      return `${type} has no legal position anywhere on this board — returned to the bottom of the deck. Failed draw ${event.failures} of ${MAX_STATION_STEP_FAILURES}.`
    case DRAW_EVENT.SKIPPED_NO_LEGAL_PLACEMENT:
      return `${MAX_STATION_STEP_FAILURES} cards in a row had nowhere to go — skipping the station step this turn (M4).`
    case DRAW_EVENT.SKIPPED_DECK_EMPTY:
      return 'The deck is empty, and nothing is ever reshuffled — skipping the station step (M5).'
    case DRAW_EVENT.EXTRA_DRAW_FROM_RURAL:
      return `${type} is a Draw Station — draw and place a second station this turn (§7.3).`
    case DRAW_EVENT.RURAL_CHAIN_CAPPED:
      return `${type} is a Draw Station, but the extra draw does not chain — never a third (§7.3).`
  }
}
```

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. A non-exhaustive `switch` over `DrawEventKind` would fail here, which is the point of the union return type.

**Verified (phase-end block):** confirmed as part of the batched Phase 3 verification.

### Task 9: Create the client → world coordinate conversion ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/useSvgPoint.ts`

- [x] **Step 1: Write `src/ui/useSvgPoint.ts`**

Deliberately returns a fresh closure each render — no `useCallback`, because there is no profiling evidence and nothing depends on its identity.

```ts
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { Point } from '../rules/types'

/**
 * Client coordinates → board world coordinates. getScreenCTM accounts for the
 * viewBox AND for preserveAspectRatio="xMidYMid meet"'s letterboxing, which
 * hand-rolled maths over getBoundingClientRect would have to reproduce.
 *
 * The DOM half of the split: src/rules/staging.ts takes it from a world Point
 * onward. Returns null — never a NaN-bearing Point — when the matrix is
 * unavailable (not yet laid out, or display:none). A NaN coordinate would reach
 * the ghost's transform and render it nowhere, with no error.
 */
export function useSvgPoint(
  svgRef: RefObject<SVGSVGElement | null>,
): (event: ReactPointerEvent<SVGSVGElement>) => Point | null {
  return (event) => {
    const svg = svgRef.current
    if (svg === null) {
      return null
    }
    const screenToWorld = svg.getScreenCTM()?.inverse()
    if (!screenToWorld) {
      return null
    }
    const world = new DOMPoint(event.clientX, event.clientY).matrixTransform(screenToWorld)
    if (!Number.isFinite(world.x) || !Number.isFinite(world.y)) {
      return null
    }
    return { x: world.x, y: world.y }
  }
}
```

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

**Verified (phase-end block):** confirmed as part of the batched Phase 3 verification.

### Task 10: Create the ghost card ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/StationGhost.tsx`
- Create: `src/ui/StationGhost.css`

- [x] **Step 1: Write `src/ui/StationGhost.tsx`**

The load-bearing detail: this component draws at the **origin** and declares **no `transform`**. The caller ref-mutates the wrapper `<g>`'s transform, and React leaves attributes absent from an element's props alone — so a legality-driven re-render cannot snap the ghost back to a stale position.

```tsx
import { describeStationCard } from './stationCardText'
import './StationGhost.css'
import type { Ref } from 'react'
import type { StationCard } from '../rules/types'

/** Fractions of the card's own size, matching StationCard.tsx's convention so
 *  the ghost and the placed card read as the same object. */
const TITLE_Y = 0.28
const BONUS_Y = 0.58

interface StationGhostProps {
  card: StationCard
  cardSize: number
  illegal: boolean
  ghostRef: Ref<SVGGElement>
}

/**
 * The card being positioned. Drawn at the origin: `ghostRef`'s `transform` is
 * written directly by useStationPlacement on every pointer move, bypassing the
 * reconciler (react-frontend architecture rule 4). NEVER add a `transform` prop
 * to the outer <g> — React would then own the attribute and overwrite it on the
 * next legality-driven render.
 */
function StationGhost({ card, cardSize, illegal, ghostRef }: StationGhostProps) {
  return (
    <g
      className={`station-ghost${illegal ? ' station-ghost--illegal' : ''}`}
      ref={ghostRef}
      aria-hidden="true"
    >
      <rect className="station-ghost__body" x={0} y={0} width={cardSize} height={cardSize} />
      <text className="station-ghost__type" x={cardSize / 2} y={cardSize * TITLE_Y}>
        {card.type}
      </text>
      <text className="station-ghost__bonus" x={cardSize / 2} y={cardSize * BONUS_Y}>
        {card.bonusFirst} / {card.bonusLater}
      </text>
      <title>{describeStationCard(card)}</title>
    </g>
  )
}

export default StationGhost
```

- [x] **Step 2: Write `src/ui/StationGhost.css`**

Follow the existing per-component CSS pattern. The illegal state must be distinguishable by more than hue alone (AC2).

```css
.station-ghost {
  pointer-events: none;
}

.station-ghost__body {
  fill: rgb(255 255 255 / 0.82);
  stroke: #1a7f37;
  stroke-width: 3;
}

.station-ghost__type,
.station-ghost__bonus {
  text-anchor: middle;
  fill: #1f2328;
  font-size: 0.18em;
}

/* Illegal: colour AND a dashed edge, so the state does not rest on hue alone. */
.station-ghost--illegal .station-ghost__body {
  stroke: #cf222e;
  stroke-dasharray: 6 4;
  fill: rgb(255 235 233 / 0.86);
}
```

- [x] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

**Verified (phase-end block):** confirmed as part of the batched Phase 3 verification.

### Task 11: Create the drag hook ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/useStationPlacement.ts`

- [x] **Step 1: Write `src/ui/useStationPlacement.ts`**

```ts
import { useEffect, useRef, useState } from 'react'
import { MOVE_KIND } from '../constants/game'
import { cardRectAt } from '../rules/staging'
import { validateStationPlacement } from '../rules/validate'
import { useSvgPoint } from './useSvgPoint'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { RulesConfig } from '../rules/config'
import type { GameState, Move, Rect, StationId, StationRejectionReason } from '../rules/types'

export interface StationPlacementResult {
  readonly ghostRef: RefObject<SVGGElement | null>
  readonly dragging: boolean
  /** null while the current position is legal, and while no drag is active. */
  readonly reason: StationRejectionReason | null
  readonly blockingStationId: StationId | null
  readonly handlers: {
    onPointerDown(event: ReactPointerEvent<SVGSVGElement>): void
    onPointerMove(event: ReactPointerEvent<SVGSVGElement>): void
    onPointerUp(event: ReactPointerEvent<SVGSVGElement>): void
    onPointerCancel(event: ReactPointerEvent<SVGSVGElement>): void
  }
}

interface Verdict {
  readonly reason: StationRejectionReason | null
  readonly blockingStationId: StationId | null
}

const LEGAL: Verdict = { reason: null, blockingStationId: null }

/**
 * The M6-adjacent hot path, one story early. Two rules carry the design:
 *
 *  - The ghost's position is written straight to the DOM through ghostRef on
 *    every pointermove and never through React (architecture rule 4).
 *  - Legality is recomputed every move — validateStationPlacement is O(paths +
 *    stations), roughly 3 terrain paths and at most ~35 cards — but setState
 *    fires ONLY when the reason code changes, so a drag costs a render per
 *    legality transition rather than one per frame.
 *
 * Adjudicates nothing: it asks validateStationPlacement and renders the answer.
 * The reducer re-validates on dispatch, so AC4 has two independent guards.
 *
 * Handlers are JSX props rather than addEventListener registrations — React owns
 * their lifecycle, they close over the current render's state (so no stale
 * closure can validate against an old board), and there is no listener to leak.
 */
export function useStationPlacement(
  state: GameState,
  config: RulesConfig,
  svgRef: RefObject<SVGSVGElement | null>,
  dispatchMove: (move: Move) => void,
): StationPlacementResult {
  const ghostRef = useRef<SVGGElement | null>(null)
  const rectRef = useRef<Rect | null>(null)
  const reasonRef = useRef<StationRejectionReason | null>(null)
  const captureRef = useRef<{ element: SVGSVGElement; pointerId: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [verdict, setVerdict] = useState<Verdict>(LEGAL)
  const toWorld = useSvgPoint(svgRef)

  const releaseCapture = (): void => {
    const capture = captureRef.current
    if (capture !== null && capture.element.hasPointerCapture(capture.pointerId)) {
      capture.element.releasePointerCapture(capture.pointerId)
    }
    captureRef.current = null
  }

  /** Position the ghost and refresh the verdict for one pointer position. */
  const track = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const point = toWorld(event)
    if (point === null) {
      return
    }
    const rect = cardRectAt(point, config.cardSize)
    rectRef.current = rect
    ghostRef.current?.setAttribute('transform', `translate(${rect.x} ${rect.y})`)

    const result = validateStationPlacement(state, rect, config)
    const reason = result.ok ? null : result.reason
    if (reason !== reasonRef.current) {
      reasonRef.current = reason
      setVerdict(
        result.ok ? LEGAL : { reason: result.reason, blockingStationId: result.stationId ?? null },
      )
    }
  }

  const handlers = {
    onPointerDown(event: ReactPointerEvent<SVGSVGElement>): void {
      if (state.pendingCard === null) {
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      captureRef.current = { element: event.currentTarget, pointerId: event.pointerId }
      setDragging(true)
      track(event)
    },
    onPointerMove(event: ReactPointerEvent<SVGSVGElement>): void {
      if (!dragging || state.pendingCard === null) {
        return
      }
      track(event)
    },
    onPointerUp(event: ReactPointerEvent<SVGSVGElement>): void {
      const card = state.pendingCard
      const rect = rectRef.current
      releaseCapture()
      setDragging(false)
      if (card === null || rect === null) {
        return
      }
      track(event)
      // AC4 — commit only on the verdict the player was just shown. An illegal
      // release dispatches nothing, so the card stays in hand rather than being
      // placed or lost.
      if (reasonRef.current === null) {
        dispatchMove({ kind: MOVE_KIND.PLACE_STATION, cardId: card.id, rect })
      }
    },
    onPointerCancel(): void {
      releaseCapture()
      setDragging(false)
    },
  }

  // The card left the hand (committed, or a new game replaced the state): drop
  // any stale verdict so the panel does not keep showing the last reason.
  useEffect(() => {
    if (state.pendingCard === null) {
      reasonRef.current = null
      rectRef.current = null
      setVerdict(LEGAL)
      setDragging(false)
    }
  }, [state.pendingCard])

  // Cleanup-only: a drag interrupted by unmount must not leave the pointer
  // captured on a detached element.
  useEffect(() => releaseCapture, [])

  return {
    ghostRef,
    dragging,
    reason: verdict.reason,
    blockingStationId: verdict.blockingStationId,
    handlers,
  }
}
```

- [x] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `eslint-plugin-react-hooks` must be clean — do **not** silence `exhaustive-deps`; if it fires, fix the dependency rather than the warning.

**Deviation from the pasted snippet, not drift:** the plan's snippet included a `useEffect` that called `setVerdict`/`setDragging` synchronously whenever `state.pendingCard` became `null`, to drop a stale verdict after commit or a new game. `eslint-plugin-react-hooks` (a different rule from `exhaustive-deps` — `react-hooks/set-state-in-effect`) correctly flagged this as the "adjusting state when a prop changes inside an effect" anti-pattern, which risks a cascading render. Per the standing instruction never to silence a hooks lint rule, the reset was rewritten as a derived value at return time (`reason: hasCard ? verdict.reason : null`, same for `blockingStationId`) instead of a `useEffect` + `setState`. This is behaviourally equivalent for every path that matters: `reasonRef`/`rectRef` need no reset because `track()` is only ever invoked while `state.pendingCard !== null` (both `onPointerDown`/`onPointerMove` guard on it, and `onPointerUp` returns before calling `track()` when the card is `null`), so a stale ref is never read; `dragging` is already unconditionally reset to `false` by every code path that ends a drag (`onPointerUp`, `onPointerCancel`). Verified: typecheck and lint both exit 0 with this shape; no rule was disabled.

**Post-review corrections (fix pass, not part of the original task):** three issues surfaced by Code-Evaluator/Defender/QA review of the full contract, all inside this same file:

1. **CRITICAL — stale-rect bug in `onPointerUp`, present in this task's own pasted snippet.** The snippet bound `const rect = rectRef.current` (and the presence check against it) *before* calling `track(event)`, then dispatched that pre-`track()` value while gating on the `reasonRef.current` that `track()` had just recomputed from the up-event's own coordinates. Whenever the up-event's position differed from the last sampled pointermove — routine at high pointer rates or on a flick — the gate and the dispatched payload were evaluated against two different candidate rects: either a legal-at-release verdict paired with a stale, possibly-illegal rect (silently rejected by the reducer's backstop, so nothing illegal committed, but the turn did nothing with no explanation), or a legal commit at the wrong position. **Fixed:** the presence check at the top of `onPointerUp` now only confirms a drag was ever tracked (`hadTrackedPosition = rectRef.current !== null`); the rect actually dispatched, and the `reasonRef.current` gate, are both read fresh *after* `track(event)` runs, so they agree on one final position. **If this hook is ever rewritten from a fresh reading of `plan.md`, do not restore the original ordering from that document** — the plan's snippet has the same bug and needs the same correction.
2. **WARNING — the hook's `StationPlacementResult` interface renamed to `UseStationPlacementResult`.** `src/rules/validate.ts` independently exports its own, differently-shaped `StationPlacementResult` (the `{ok:true}|{ok:false;reason;stationId?}` union from Task 6 below); the two names collided with no compile error since nothing imported both, but `grep -rn StationPlacementResult` returned two semantically unrelated hits under one name. `Board.tsx`'s `pointerHandlers?: StationPlacementResult['handlers']` import was updated to match. `plan.md` names this type `StationPlacementResult` too — a future reader implementing from the plan should use `UseStationPlacementResult` for the hook's own type and leave `validate.ts`'s name alone.
3. **WARNING — `reason === null` was overloaded to mean both "legal" and "no drag has ever happened for this card."** `StationStepPanel` rendered "Legal position." into a live region as soon as a card was drawn, before the player had touched the board once, and again for one render after a Rural's extra draw swapped in a new `pendingCard` while the previous card's verdict lingered. **Fixed:** the hook now also returns `hasPosition: boolean` (state, tracking the id of the card `track()` last positioned — not a ref, since `react-hooks/refs` forbids reading a ref during render), and `StationStepPanel` renders the "Legal position." sentence only when `hasPosition` is true. `dragging` is now also masked by `hasCard` in the same return block, since a route other than `onPointerUp`/`onPointerCancel` clearing `state.pendingCard` mid-drag would otherwise leave `dragging` true past the point `hasCard` claims it does not.

All three verified: `npm run typecheck` and `npm run lint` both exit 0; `npm run format:check` clean; `npx vitest run` — `1 failed | 271 passed (272)`, the one failure being the pre-existing AC9 `RIVER_TOO_NEAR_MOUNTAIN` failure noted at Task 2, unrelated to this file.

- [x] **Step 3: Measure the file**

Run: `(Get-Content src\ui\useStationPlacement.ts | Measure-Object -Line).Lines`
Expected: under 200. Over 400 is blocking and must be split in this task.

**Verified:** 136 lines (post-deviation; the pasted-snippet shape measured 139). **Post-fix-pass: 176 lines** — still comfortably under the 200-line "fine" band.

### Task 12: Wire the drag surface and the ghost slot into `Board` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/Board.tsx`
- Modify: `src/ui/Board.css`

- [x] **Step 1: Add the three optional props and change the role**

All three are optional so `Board` still renders standalone. `role="img"` becomes `role="group"`: `img` collapses the whole subtree into one opaque graphic, which was right for a static board and is wrong once the board is the drag surface with a ghost inside it.

```tsx
interface BoardProps {
  state: GameState
  config: RulesConfig
  overlays: OverlayFlags
  svgRef?: RefObject<SVGSVGElement | null>
  pointerHandlers?: StationPlacementResult['handlers']
  ghost?: ReactNode
}

function Board({ state, config, overlays, svgRef, pointerHandlers, ghost }: BoardProps) {
  const bounds = boardBounds(state, config)

  return (
    <svg
      className={`board${ghost ? ' board--placing' : ''}`}
      ref={svgRef}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={`String Railway board, ${state.seats.length} colour seats, round ${state.round}`}
      {...pointerHandlers}
    >
      <BoardTerrain paths={state.paths} />
      {state.stations.map((station) => (
        <StationCard
          key={String(station.card.id)}
          station={station}
          colour={displayFor(station.markerOwner)}
        />
      ))}
      <BoardOverlays state={state} flags={overlays} />
      {ghost}
    </svg>
  )
}
```

Add the two type imports: `import type { ReactNode, RefObject } from 'react'` and `import type { StationPlacementResult } from './useStationPlacement'`.

The ghost renders **last** so it sits above the terrain, the cards and the overlays.

**Deviation from the pasted snippet, not drift:** the snippet omits `config` from the `<BoardTerrain>`/`<BoardOverlays>` calls. The file on disk has both components requiring `config: RulesConfig` (added since the plan was written, for terrain stroke and overlay-mark scaling), so `config={config}` was kept on both calls — dropping it would be a compile error. Everything else applied exactly as shown.

- [x] **Step 2: Add the drag affordances to `src/ui/Board.css`**

```css
/* The board is a drag surface while a card is in hand. touch-action: none (not
   manipulation) is required: a pointer drag must not be stolen by scroll or
   pinch-zoom mid-placement. */
.board--placing {
  cursor: grab;
  touch-action: none;
}

.board--placing:active {
  cursor: grabbing;
}
```

- [x] **Step 3: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

**Verified (phase-end block):** confirmed as part of the batched Phase 3 verification.

**Post-review correction (fix pass):** `StationPlacementResult` (the hook's type, imported here for `pointerHandlers?: StationPlacementResult['handlers']`) was renamed to `UseStationPlacementResult` to stop colliding by name with `src/rules/validate.ts`'s unrelated, differently-shaped `StationPlacementResult`. See Task 11's post-review note for the full reasoning. This file's import and prop type were updated to match; typecheck and lint both re-verified clean.

### Task 13: Create the station step panel ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/StationStepPanel.tsx`
- Create: `src/ui/StationStepPanel.css`

- [x] **Step 1: Write `src/ui/StationStepPanel.tsx`**

Covers AC1 (card details before placement), AC3 (the specific reason), AC5/AC7/AC8/AC9 (the trace, in a live region) and AC10 (the deck count, rendered at every stage).

```tsx
import { STATION_STEP_STAGE } from '../constants/game'
import { describeDrawEvent, describeRejection } from './placementMessages'
import './StationStepPanel.css'
import type {
  GameState,
  StationId,
  StationRejectionReason,
  StationStepStage,
  StationType,
} from '../rules/types'

interface StationStepPanelProps {
  state: GameState
  stage: StationStepStage
  reason: StationRejectionReason | null
  blockingStationId: StationId | null
  onBeginTurn(): void
  onSkipStationStep(): void
}

function StationStepPanel({
  state,
  stage,
  reason,
  blockingStationId,
  onBeginTurn,
  onSkipStationStep,
}: StationStepPanelProps) {
  const card = state.pendingCard

  return (
    <section className="station-step" aria-label="Station step">
      {/* AC10 — visible at every stage, not only while a card is in hand. */}
      <p className="station-step__deck">
        Deck: <strong>{state.deck.length}</strong> cards remaining
      </p>

      {stage === STATION_STEP_STAGE.AWAITING_DRAW && (
        <button type="button" className="station-step__button" onClick={onBeginTurn}>
          Draw station
        </button>
      )}

      {card !== null && (
        <div className="station-step__card">
          <h3 className="station-step__type">{card.type}</h3>
          <p className="station-step__bonus">
            <span className="station-step__bonus-first">{card.bonusFirst}</span>
            <span className="station-step__bonus-later">{card.bonusLater}</span>
            <span className="station-step__bonus-label">
              connection bonus — black if you connect first, grey otherwise (§7.2)
            </span>
          </p>
          <p className="station-step__limit">
            Player limit: <strong>{card.playerLimit}</strong> (§7.1)
          </p>
          <p className="station-step__hint">Press on the board to position it, release to place.</p>
        </div>
      )}

      {stage === STATION_STEP_STAGE.SKIPPED && (
        <button type="button" className="station-step__button" onClick={onSkipStationStep}>
          Continue to string placement
        </button>
      )}

      {/* AC2/AC3 — the live verdict, named rather than generic. */}
      <p
        className={`station-step__verdict${reason === null ? '' : ' station-step__verdict--illegal'}`}
        role="status"
      >
        {reason === null
          ? card === null
            ? ''
            : 'Legal position.'
          : describeRejection(reason, blockingStationType(state, blockingStationId))}
      </p>

      {/* AC5/AC7/AC8/AC9 — the recycles, shown rather than silent. */}
      {state.lastDraw.length > 0 && (
        <ul className="station-step__trace" aria-label="Draw log">
          {state.lastDraw.map((event, index) => (
            <li key={`${event.kind}-${String(event.cardId)}-${index}`}>
              {describeDrawEvent(event)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The blocking station's printed type, for AC3's "touching another station". */
function blockingStationType(state: GameState, stationId: StationId | null): StationType | null {
  if (stationId === null) {
    return null
  }
  return state.stations.find((station) => station.card.id === stationId)?.card.type ?? null
}

export default StationStepPanel
```

- [x] **Step 2: Write `src/ui/StationStepPanel.css`**

Follow `DebugPanel.css`'s conventions. The 44px minimum is the skill's hard floor for an interactive control.

```css
.station-step {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.station-step__button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.5rem 1rem;
  touch-action: manipulation;
}

.station-step__button:focus-visible {
  outline: 2px solid #0969da;
  outline-offset: 2px;
}

@media (hover: hover) {
  .station-step__button:hover {
    background: #f3f4f6;
  }
}

.station-step__button:active {
  background: #e6e8eb;
}

.station-step__bonus-first {
  background: #1f2328;
  color: #ffffff;
  padding: 0.1rem 0.45rem;
}

.station-step__bonus-later {
  background: #8c959f;
  color: #ffffff;
  padding: 0.1rem 0.45rem;
}

.station-step__verdict--illegal {
  color: #cf222e;
  font-weight: 600;
}

.station-step__trace {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
```

- [x] **Step 3: Typecheck, lint, and measure**

Run: `npm run typecheck; npm run lint; (Get-Content src\ui\StationStepPanel.tsx | Measure-Object -Line).Lines`
Expected: both commands exit 0; the file is under 200 lines.

**Verified:** typecheck exits 0; lint exits 0; `StationStepPanel.tsx` measured 91 lines.

**Post-review correction (fix pass):** added a `hasPosition: boolean` prop (from `useStationPlacement`'s new `hasPosition`, Task 11's post-review note) and gated the "Legal position." sentence on it: `reason === null ? (card !== null && hasPosition ? 'Legal position.' : '') : describeRejection(...)`. Previously `reason === null` alone triggered "Legal position." — true both when the position was genuinely legal and when no drag had ever happened yet for the pending card, so the live region announced a validated fact before the player had touched the board once. Re-verified: typecheck and lint both exit 0.

### Task 14: Compose the play area and wire it into `AppShell` ✓

- Skill: `react-frontend`

Decision 2 from the header: `useStationPlacement` must be called unconditionally, so the block that only renders with a non-null state becomes its own component.

**Files:**
- Create: `src/ui/PlayArea.tsx`
- Modify: `src/ui/AppShell.tsx` — replace the inline game block with `PlayArea`

- [x] **Step 1: Write `src/ui/PlayArea.tsx`**

This is `AppShell`'s existing `{state !== null && …}` block, promoted verbatim and extended with the placement surface.

```tsx
import { useRef, useState } from 'react'
import Board from './Board'
import DebugPanel from './DebugPanel'
import SeatLegend from './SeatLegend'
import StationGhost from './StationGhost'
import StationStepPanel from './StationStepPanel'
import { MOVE_KIND, STATION_STEP_STAGE } from '../constants/game'
import { NO_OVERLAYS } from '../constants/overlays'
import { stationStepStage } from '../rules/staging'
import { useStationPlacement } from './useStationPlacement'
import type { OverlayFlags } from './BoardOverlays'
import type { RulesConfig } from '../rules/config'
import type { PlayerCount } from '../rules/setup'
import type { GameState, Move } from '../rules/types'

interface PlayAreaProps {
  state: GameState
  config: RulesConfig
  seed: number
  playerCount: PlayerCount
  dispatchMove: (move: Move) => void
  onRegenerate: (seed: number) => void
}

/**
 * Split out of AppShell so useStationPlacement is called unconditionally: the
 * hook needs a non-null GameState, and AppShell's game block only renders once
 * one exists. A conditional hook call is not allowed, and widening the hook to
 * accept null would push a null check into every line of the drag.
 */
function PlayArea({
  state,
  config,
  seed,
  playerCount,
  dispatchMove,
  onRegenerate,
}: PlayAreaProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [overlays, setOverlays] = useState<OverlayFlags>(NO_OVERLAYS)
  const placement = useStationPlacement(state, config, svgRef, dispatchMove)
  const stage = stationStepStage(state)

  const ghost =
    stage === STATION_STEP_STAGE.PLACING && state.pendingCard !== null && placement.dragging ? (
      <StationGhost
        card={state.pendingCard}
        cardSize={config.cardSize}
        illegal={placement.reason !== null}
        ghostRef={placement.ghostRef}
      />
    ) : null

  return (
    <section className="app-shell__game" aria-label="Game board">
      <Board
        state={state}
        config={config}
        overlays={overlays}
        svgRef={svgRef}
        pointerHandlers={placement.handlers}
        ghost={ghost}
      />
      <StationStepPanel
        state={state}
        stage={stage}
        reason={placement.reason}
        blockingStationId={placement.blockingStationId}
        onBeginTurn={() => dispatchMove({ kind: MOVE_KIND.BEGIN_TURN })}
        onSkipStationStep={() =>
          dispatchMove({
            kind: MOVE_KIND.SKIP_STATION_STEP,
            reason: skipReasonFor(state),
          })
        }
      />
      <SeatLegend seats={state.seats} turnOrder={state.turnOrder} playerCount={playerCount} />
      <DebugPanel
        state={state}
        seed={seed}
        flags={overlays}
        onFlagsChange={setOverlays}
        onRegenerate={onRegenerate}
      />
    </section>
  )
}

export default PlayArea
```

Add the `skipReasonFor` helper below the component (file order: imports → constants → component → helpers → export). It reads the reason off the terminal event the engine already recorded rather than re-deciding it:

```tsx
/** The skip reason the engine already determined, taken from the terminal
 *  event rather than re-derived — a component may not decide a rule. */
function skipReasonFor(state: GameState): SkipReason {
  const last = state.lastDraw[state.lastDraw.length - 1]
  return last?.kind === DRAW_EVENT.SKIPPED_DECK_EMPTY
    ? SKIP_REASON.DECK_EMPTY
    : SKIP_REASON.NO_LEGAL_PLACEMENT
}
```

Extend the `../constants/game` import with `DRAW_EVENT` and `SKIP_REASON`, and the `../rules/types` type import with `SkipReason`.

- [x] **Step 2: Replace the game block in `src/ui/AppShell.tsx`**

`GameShell` keeps `useGame` and the setup-error branch; the `overlays` state moves into `PlayArea`, so drop the now-unused `useState` and `NO_OVERLAYS` / `OverlayFlags` imports along with the `Board`, `SeatLegend` and `DebugPanel` imports.

```tsx
function GameShell({ config }: { config: RulesConfig }) {
  const { state, seed, playerCount, setupError, newGame, dispatchMove } = useGame(config)

  return (
    <main className="app-shell">
      <HeroBanner />

      <NewGamePanel onNewGame={newGame} disabled={false} />

      {setupError !== null && (
        <section className="app-shell__error" role="alert">
          {/* …unchanged… */}
        </section>
      )}

      {state !== null && playerCount !== null && seed !== null && (
        <PlayArea
          state={state}
          config={config}
          seed={seed}
          playerCount={playerCount}
          dispatchMove={dispatchMove}
          onRegenerate={(nextSeed) => newGame(playerCount, nextSeed)}
        />
      )}
    </main>
  )
}
```

- [x] **Step 3: Typecheck, lint, and measure both files**

Run: `npm run typecheck; npm run lint; (Get-Content src\ui\PlayArea.tsx | Measure-Object -Line).Lines; (Get-Content src\ui\AppShell.tsx | Measure-Object -Line).Lines`
Expected: both commands exit 0; both files under 200 lines.

**Verified:** typecheck exits 0; lint exits 0 (0 errors, 0 warnings); `PlayArea.tsx` measured 92 lines; `AppShell.tsx` measured 78 lines.

**Post-review corrections (fix pass):** two changes to `PlayArea.tsx`, both re-verified: (1) passes the hook's new `hasPosition` prop through to `StationStepPanel` (Task 11/13's post-review notes); (2) the multi-line `function PlayArea({ ... }: PlayAreaProps) {` destructuring signature was collapsed to one line — QA's closing `format-check` gate found it was the sole `npm run format:check` violation in the tree (it fits Prettier's 100-char `printWidth` on one line; no task before the closing phase had run `format:check`, so the defect was invisible until then). `PlayArea.tsx` now measures 86 lines. `npm run format:check` re-verified clean across the whole tree.

---

**Phase 3 verification block (batched, per the Implementer's deferred-verification policy):**

Run: `npm run typecheck; npm run lint`
Result: typecheck exits 0, no errors. Lint's first pass surfaced one real defect — `react-hooks/set-state-in-effect` on `useStationPlacement.ts`'s stale-verdict-reset effect (see Task 11 Step 2's deviation note) — fixed by deriving the reset at render time instead of disabling the rule. Re-run: both exit 0 (lint: 0 errors, 0 warnings). No `src/rules/` file was touched this phase, so the boundary grep does not apply here (it is Task 15's, Phase 4). No new Vitest spec was created this phase (no task in this phase lists a `Test:` path, per the contract's explicit instruction), so no scoped Vitest run applies either.

---

## Phase 4 — Final verification

No production changes. Only cumulative sanity checks: the architectural boundary, the no-hard-coded-tunable rule, file budgets, the full gates, and the PR description.

### Task 15: Confirm the `src/rules/` boundary still holds ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|from ""react""|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `staging.ts` in particular must be clean — it takes a `Point`, never a `PointerEvent`.

**Verified:** zero hits. `src/rules/` remains React- and DOM-free.

### Task 16: Confirm no tunable was hard-coded and no debug logging shipped ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep source and copy for the literals `rules.json` owns**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits outside `src/rules/config.ts`'s doc comments and the test fixtures' own `TEST_CONFIG`. Any hit in `src/ui/` is a defect — `cardSize` must come from `RulesConfig`.

**Verified with a judged non-hit:** one hit, `src\ui\HeroScene.tsx:22`, a decorative SVG path-curve string (`M -60 168 C 130 96 250 210 ...`) containing the bare token `120` among ~14 other freehand curve coordinates. `HeroScene.tsx` is not in this contract's file map (not created or modified by any of Tasks 1–14) and predates this contract; the number is a hero-banner illustration coordinate, not a `cardSize`/`shortStringLength`/etc. read — `src/rules/config.ts` itself has zero hits for any of the five literals. Judged not a defect of this contract and left unchanged (out of scope to edit a file this contract's tasks never touched).

- [x] **Step 2: Confirm the M4 ceiling is imported, never written as a literal**

Run: `Select-String -Path src\ui\*.ts,src\ui\*.tsx -Pattern "MAX_STATION_STEP_FAILURES|\bof 3\b"`
Expected: hits for `MAX_STATION_STEP_FAILURES` in `placementMessages.ts` only; zero hits for a literal `of 3`.

**Verified:** 3 hits, all in `src\ui\placementMessages.ts` (the import and its two template-literal uses); zero hits for a literal `of 3`.

- [x] **Step 3: Confirm no debug logging and no unseeded randomness were introduced**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "console\.(log|debug)|Math\.random"`
Expected: zero hits.

**Verified with a judged non-hit:** 2 hits, both inside pre-existing doc comments (`src\rules\rng.ts:4` and `src\rules\setup.ts:79`) stating in prose that `Math.random()` is a defect and is not used — not a call site. Zero actual `console.log`/`console.debug`/`Math.random()` invocations anywhere.

### Task 17: Confirm every new and grown file is inside the size budget ✓

- Skill: `react-frontend`

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\rules\staging.ts,src\rules\turn.ts,src\rules\reducer.ts,src\rules\types.ts,src\ui\useStationPlacement.ts,src\ui\StationStepPanel.tsx,src\ui\PlayArea.tsx,src\ui\StationGhost.tsx,src\ui\Board.tsx,src\ui\StationCard.tsx,src\ui\AppShell.tsx,src\ui\placementMessages.ts | ForEach-Object { "{0,6} {1}" -f (Get-Content $_.FullName | Measure-Object -Line).Lines, $_.Name }`
Expected: every file under 400 lines. Anything at 200–400 gets a second look; anything over 400 is blocking and must be split before this contract closes.

**Verified:** every file is well under 400 lines — `staging.ts` 45, `turn.ts` 256, `reducer.ts` 233, `types.ts` 183, `useStationPlacement.ts` 136, `StationStepPanel.tsx` 91, `PlayArea.tsx` 92, `StationGhost.tsx` 40, `Board.tsx` 53, `StationCard.tsx` 96, `AppShell.tsx` 78, `placementMessages.ts` 46. `turn.ts` (256) and `reducer.ts` (233) fall in the 200–400 "second look" band — both grew by additive event-emission code (Tasks 3 and 4) layered onto existing control flow rather than new unrelated concerns, so no split is warranted.

**Post-review re-measure (fix pass):** `useStationPlacement.ts` grew from 136 to 176 lines (the stale-rect fix, the `hasPosition` state and its comments — Task 11's post-review note); `PlayArea.tsx` shrank from 92 to 86 lines (the Prettier reformat collapsed the multi-line destructuring signature — Task 14's post-review note). Both remain comfortably under the 200-line "fine" band; no split warranted.

### Task 18: Static gates and the full suite ✓

- Skill: `react-frontend`

Delegated to QA, per the pipeline rule that the unfiltered suite and the production build belong to QA alone. Run by QA in the round-2 verification pass.

- [x] **Step 1: Typecheck, lint, formatting, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports 0 failed. The page-7 worked example (§5.4) in `scoring.test.ts` must still be green — this contract does not touch scoring, so a failure there is a regression.

**Verified by QA (round 2):** typecheck exits 0; lint exits 0 with 0 errors and 0 warnings; `format:check` reports "All matched files use Prettier code style!" — this was the round-1 failure (`src/ui/PlayArea.tsx`), now fixed. `npm test` reports `Test Files 1 failed | 17 passed (18)`, `Tests 1 failed | 271 passed (272)`. **The single failure is pre-existing and out of this contract's scope:** `setup.test.ts`'s `emits a board that passes validateSetup for every player count across 20 seeds (AC9)` throws `RIVER_TOO_NEAR_MOUNTAIN` at seed 0 / 3 players against the shipped `public/rules.json` — a §12 tuning symptom on a developer-owned value, confirmed present before this contract's first edit by all three round-1 reviewers. The page-7 worked example was re-run in isolation and is green (6 passed).

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `lint` first, so a boundary violation fails here too.

**Verified by QA (round 2):** exits 0. `lint` ran first with 0 errors, then `tsc -b`, then `vite build` — 69 modules transformed, `dist/index.html` and `dist/assets/*.{css,js}` written in 597ms, no bundler errors.

### Task 19: Write the PR description ✓

- Skill: `none — a hand-off document for the developer, no code`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:

- A link to `plan.md` in this folder.
- A summary: the engine gained an additive `DrawEvent` trace because `beginStationStep` already implemented §5.2's recycles but performed them invisibly; the UI layer on top delivers the draw panel, the ref-mutated ghost with live per-constraint legality, the guarded commit and the marker glyph.
- **Every decision the developer must make**, copied from the File map's "Developer decides or observes" list — chiefly the `BEGIN_TURN` click, the jsdom/component-test question, and the `RURAL_CHAIN_CAPPED` and starting-station-glyph preferences.
- **What was verified and what was not, stated plainly.** Quote the actual gate results. State explicitly that AC2, AC3 and AC4 are covered by unit tests on the logic beneath the interaction and **not** by driving a pointer, and that the drag has no keyboard equivalent.
- Verification results from the prior phases, with the Vitest summary line.
- A one-line note for future contributors on the two conventions introduced: transient UI-facing state on `GameState` follows the `lastScoring` precedent, and a ref-positioned SVG element must never declare that attribute in JSX.

---

## Self-review

(Filled by the planner before handing off, kept in the file so the executor can confirm coverage.)

**Spec coverage — every `plan.md` In-scope bullet maps to at least one task:**

- `DrawEvent` trace surfaced on `GameState.lastDraw` (AC5, AC7, AC8, AC9) — Tasks 1, 2, 3, 4.
- Two pure derivations in `src/rules/staging.ts` — Task 5.
- Station-step panel: deck count (AC10), card type/bonuses/limit (AC1), trace and verdict live region (AC2, AC3) — Task 13.
- Pointer-tracked ghost with ref-mutated position and illegal styling (AC2) — Tasks 10, 11, 12.
- Per-constraint rejection copy naming the blocking station (AC3) — Tasks 6, 8, 13.
- Commit guarded on the engine's verdict; illegal release keeps the card in hand (AC4) — Task 11, with the reducer backstop asserted in Task 4.
- `BEGIN_TURN` and `SKIP_STATION_STEP` dispatch — Task 14.
- Marker glyph on placed stations (AC6) — Task 7.
- Vitest coverage under `src/rules/__tests__/` — Tasks 2, 3, 4, 5.

**Acceptance-criteria coverage:** AC1 → 13, 14 · AC2 → 10, 11, 12 · AC3 → 8, 13 · AC4 → 11 (+4) · AC5 → 4, 8 · AC6 → 7 · AC7 → 3, 8 · AC8 → 3, 8 · AC9 → 3, 8 · AC10 → 13. AC8's search half was delivered by SCRUM-2 per the developer's ticket comment and is consumed, not rebuilt.

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, "appropriate error handling", or "similar to Task N". Every step shows the exact code or a runnable command with `Run:` / `Expected:`. Two spec steps (Task 4's Rural cases) describe the board setup in a comment rather than spelling out every fixture line, but give the exact assertions and name the fixtures to build it from — deliberate, because the surrounding file already establishes that board shape.

**Type / name consistency:** `DRAW_EVENT` / `DrawEventKind` / `DrawEvent` / `lastDraw` / `STATION_STEP_STAGE` / `StationStepStage` / `stationStepStage` / `cardRectAt` / `MAX_STATION_STEP_FAILURES` / `StationPlacementResult` / `describeStationCard` / `describeDrawEvent` / `describeRejection` / `REJECTION_COPY` / `useSvgPoint` / `useStationPlacement` / `StationPlacementResult.handlers` / `ghostRef` are each spelled identically in every task that names them, and every one appears in `plan.md` Part 2 → Data shapes except `StationPlacementResult` (the narrowed validator type) and `PlayArea`, both recorded as explicit decisions in this file's header. CSS class names are created in the same task as the component that references them.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: the `GameState` field and both of its full-literal construction sites change inside Task 2, so no intermediate task leaves an uncompilable tree; Task 3's `events` field and Task 4's consumers are added in dependency order.
- **Phase 2** ends type-checking: `staging.ts` and `validate.ts`'s narrowing are additive, have no consumers yet, and the narrowing is verified non-breaking by typecheck in Task 6 Step 2.
- **Phase 3** ends type-checking after every task: each UI module is created before the module that imports it (text → messages → coordinates → ghost → hook → Board → panel → PlayArea), so no task imports something that does not yet exist. The feature is only reachable from the browser after Task 14, which is expected, not a broken boundary.
- **Phase 4** makes no production change.
