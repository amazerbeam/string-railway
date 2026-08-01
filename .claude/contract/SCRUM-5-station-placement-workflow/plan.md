# Plan: Station placement workflow — draw, position and legality feedback

Plan folder: `.claude/contract/SCRUM-5-station-placement-workflow/`
Execution status: see `tasks.md` in this folder.

---

## Part 1 — Alignment

*(The shared understanding of what this task is doing. Restate it in your own words — this is how the developer confirms you read the brief correctly before any design happens. Mismatch here = stop and fix.)*

### Task reference

**Jira:** [SCRUM-5 — Station placement workflow — draw, position and legality feedback](https://amazerbeam.atlassian.net/browse/SCRUM-5) (Story, parent epic SCRUM-1, status To Do).

**Problem statement (verbatim from the ticket):**

> Step 1 of every turn is drawing a station from the deck and placing it (§5.2). The three placement constraints are simple to state — touches no string, touches no other station, fully within the border — but hard to satisfy by eye on a crowded board, because a card that looks clear may be grazing a river arc by a unit or two.
>
> Without live legality feedback the player is guessing, and a rejected placement with no explanation makes the prototype feel broken rather than constrained. This step also carries three special behaviours (Rural's extra draw, Landmark and Depot's mandatory marker, and the redraw rules) that need to be visible rather than silent.

**User story:** As the active player, I want to see the station I drew and position it with immediate legal-or-not feedback, so that I can find a good spot deliberately instead of by trial and error.

**Acceptance criteria (verbatim):**

1. At the start of a turn the top card is drawn and displayed with its type, connection bonus values and player limit before placement begins.
2. Dragging the card over the board shows continuously whether the current position is legal against all three §5.2 constraints, with the illegal case visually distinct.
3. When a position is illegal, the specific reason is shown — touching a string, touching another station, or not fully inside the border — not a generic rejection.
4. An illegal placement cannot be committed; releasing on an illegal position leaves the card in hand rather than placing it or losing it.
5. Drawing a Rural station immediately triggers a second draw and placement in the same turn, and the second station never triggers a third even if it is also Rural (§7.3, §8).
6. Drawing a Landmark or Depot places one of the active player's markers automatically on commit, mandatory per M16, and the marker is visible on the card afterwards.
7. Drawing a Landmark or Depot when both of that player's markers are already placed returns the card to the bottom of the deck and draws again, with the redraw shown to the player rather than happening invisibly.
8. A drawn card with no legal position anywhere goes to the bottom of the deck and a new card is drawn; after 3 consecutive such failures step 1 is skipped and the turn proceeds to string placement (M4).
9. An empty deck skips step 1 with a clear indication, and nothing is ever reshuffled (M5).
10. Remaining deck count is visible at all times.

**Scope boundaries (verbatim from the ticket):**

*In scope:* draw presentation and the drag-to-place interaction · live legality evaluation against §5.2 and per-constraint failure messaging · Rural extra-draw chain with the one-extra cap · Landmark and Depot marker attachment on placement · M4 unplaceable-card redraw and 3-failure skip; M5 empty-deck skip · deck counter.

*Out of scope:* card rotation (the square footprint makes orientation meaningless for legality) · railway string placement and scoring (steps 2 and 3) · final card art · undoing a committed station placement outside the debug affordances · any AI or automatic placement suggestion.

**Developer comment on the ticket (2026-07-31, Joss Duffy) — narrows the scope:**

> Criterion 8's legal-placement search is being implemented as part of SCRUM-2 rather than here — the turn loop needs the same answer for the M4 three-failure skip and the M9 forfeit, so it lands in `src/rules/search.ts` with the rest of the engine. This story will consume `hasLegalStationPlacement` rather than building its own sweep.

That comment is honoured: `hasLegalStationPlacement` exists at `src/rules/search.ts:116` and is already wired into `beginStationStep`. **Nothing in this plan writes a placement search.** The ticket's stated performance risk ("a naive sweep may be slow enough to stall the UI") is therefore already retired — the search runs once per drawn card inside the reducer, never per pointer event.

**Repository state confirmed at planning time (2026-08-01), which differs from `CLAUDE.md`:**

`CLAUDE.md` describes an empty scaffold. It is stale. SCRUM-2 (rules engine) is `COMPLETE` and SCRUM-3/SCRUM-4 (config, seeded setup, SVG board) has all 93 task steps checked, though its `tasks.md` still reads `Status: IN PROGRESS`. `src/rules/` holds 15 modules with 15 spec files; `src/ui/` renders a real board. This plan is written against the code on disk, not against `CLAUDE.md`.

### Restated goal

Make step 1 of a turn playable and legible. The rules engine already *decides* everything this story needs — `validateStationPlacement` returns which of the three §5.2 constraints failed, `beginStationStep` already runs the draw-and-recycle sequence including the marker-starved redraw (AC7), the M4 three-failure skip (AC8) and the M5 empty-deck skip (AC9), and `commitStationPlacement` already attaches the mandatory M16 marker and queues the capped Rural extra draw (AC5, AC6). What is missing is that **none of it is visible or reachable from the UI**: no component ever dispatches `BEGIN_TURN`, and `beginStationStep` performs its recycles silently, returning only the final outcome — so a Landmark bounced for want of a marker and two failed draws before a third card succeeded are indistinguishable from a single clean draw. This story adds a draw-and-recycle *trace* to the engine so those events can be reported, then builds the player-facing surface on top: a panel showing the deck count and the drawn card's type, black/grey connection bonuses and player limit; a ghost card that follows the pointer over the SVG board and continuously shows legal-or-not with the specific failing constraint named; a commit that is refused unless the engine says the position is legal; and a marker glyph on placed Landmark/Depot cards. The turn ends at the boundary of step 2 — the string phase is SCRUM-6's.

### In scope

- A `DrawEvent` trace emitted by `beginStationStep`, surfaced on `GameState.lastDraw`, so every recycle, skip and extra draw in §5.2's sequence is reportable instead of silent (AC5, AC7, AC8, AC9).
- Two new pure derivations in `src/rules/staging.ts`: the pending card's footprint for a given pointer position, and which stage of step 1 the state is in (awaiting a draw / positioning / skipped / done).
- A station-step panel showing the remaining deck count (AC10), the drawn card's type, black `bonusFirst` / grey `bonusLater` and player limit (AC1), and a live region reporting the draw trace and the current legality verdict (AC2, AC3, AC5, AC7, AC8, AC9).
- A ghost station card that follows the pointer across the SVG board with its position ref-mutated off the reconciler, restyled when the position is illegal (AC2).
- Per-constraint rejection copy mapped from the three `STATION_REJECTION_REASON` codes the engine already returns, naming the specific blocking station where the engine reports one (AC3).
- A commit path that dispatches `PLACE_STATION` only when the engine judged the position legal, and leaves the card in hand on an illegal release or a cancelled pointer (AC4).
- Player-driven `BEGIN_TURN` and `SKIP_STATION_STEP` dispatch, so the station step can actually start and can be closed out after an M4/M5 skip.
- A marker glyph rendered on any placed station carrying a `markerOwner` (AC6).
- Vitest coverage under `src/rules/__tests__/` for the trace, the two staging derivations and the reducer's assembly of `lastDraw`.

### Explicitly out of scope

- **The legal-placement search** — `hasLegalStationPlacement` already exists (developer comment above). Not rewritten, not wrapped, not tuned.
- **Railway string placement and scoring** — SCRUM-6 and SCRUM-7. This story leaves the state in `phase: STRING` and stops; that is a dead end in the UI until SCRUM-6 lands, and is expected.
- **`END_TURN` dispatch and the full turn loop** — reaching `phase: STRING` is where this story ends, so nothing advances the seat. `advanceTurn` is touched only to clear the stale trace field.
- **Card rotation** — the footprint is a `config.cardSize` square; orientation cannot change legality.
- **Final card art**, and any restyling of the board beyond the marker glyph and the ghost.
- **Undo of a committed placement** beyond what the existing debug panel offers.
- **Any AI, hint, or automatic placement suggestion**, including the rulebook's "place so you can connect this turn" advice and any string-reach preview. The ticket defers that explicitly; the design must merely not preclude it.
- **A jsdom environment split and component tests.** See Risks — this needs a new devDependency, which is a developer decision.
- **Touch and stylus input** — the skill scopes the prototype to pointer/mouse primary.
- **Any change to a value in `public/rules.json`.** No new key is needed; `cardSize` already exists and is already read.

### Pattern Reference

The brief supplied no code reference beyond naming `src/rules/search.ts`. The references chosen here, all verified on disk:

| Concern | Follow |
|---|---|
| Transient UI-facing derived state on `GameState` | `lastScoring: ScoringBreakdown \| null` — `src/rules/types.ts:96`, written by `applyScoring` (`src/rules/scoring.ts:200`), initialised at `src/rules/setup.ts:203` and `src/rules/__tests__/fixtures.ts:78`. `lastDraw` mirrors this exactly. |
| String-bound code constants | `REJECTION_REASON` / `STATION_REJECTION_REASON` / `SKIP_REASON` in `src/constants/game.ts:25-49`, each with its rulebook section and M-number in a trailing comment. `DRAW_EVENT` follows the same shape. |
| Reject-order validation returning a named reason | `validateStationPlacement` — `src/rules/validate.ts:37-64`. Consumed, not modified. |
| A rulebook constant that is *not* a `rules.json` tunable | `ROUNDS_PER_GAME` (`src/rules/turn.ts:23`) and `MAX_STATION_STEP_FAILURES` (`src/rules/turn.ts:30`), both with a comment stating why they are not tunables. |
| SVG component shape, fraction-of-`cardSize` layout | `src/ui/StationCard.tsx` — `TITLE_Y`/`BONUS_Y`/`PAWN_Y` as fractions so nothing assumes a pixel footprint. |
| A hook holding logic out of a component | `src/ui/useGame.ts`, `src/ui/useRulesConfig.ts`, `src/ui/usePrefersReducedMotion.ts`. |
| Panel component + sibling `.css`, `aria-label` on the section | `src/ui/DebugPanel.tsx` + `DebugPanel.css`, `src/ui/NewGamePanel.tsx`. |
| Everything else | `.claude/skills/react-frontend/SKILL.md` and its `references/engineering-standards.md`. |

Rulebook sections this story implements: **§5.2** (the three placement constraints, the M4 redraw and 3-failure skip, the M5 empty-deck skip), **§7.1/§7.2** (player limit pawns, black/grey connection bonus), **§7.3** (Draw Station "disregard it" cap, Player Marker redraw-when-exhausted), **§8** (printed card values), **§10.4** (the turn loop's step 1). M-numbers depended on: **M2** (`cardSize`), **M4** (three-failure skip), **M5** (no reshuffle), **M16** (marker placement mandatory).

### Constraints flagged on the brief

- **AC4 is absolute:** an illegal placement cannot commit, and the card is neither placed nor lost. The engine already enforces this (`applyPlaceStation` returns the input state untouched when validation fails, `src/rules/reducer.ts:74-77`); the UI must not create a second, weaker path to commit.
- **AC3 forbids a generic rejection.** The specific failing constraint must be named. The engine returns exactly this and the UI must not collapse it.
- **AC7 and AC9 say "shown to the player rather than happening invisibly" / "with a clear indication".** This is the constraint that forces the engine change — the current `StationStepOutcome` cannot express what happened.
- **AC5's cap is normative:** §7.3 says of a second Draw Station icon, "disregard it — never a third". Already enforced by `drewRuralAlready`; must not be re-derived in the UI.
- **AC10: the deck count is visible *at all times*,** not only while a card is in hand.
- **M5: nothing is ever reshuffled.** No code path may rebuild or reorder the deck.
- **Determinism.** The station step must stay a pure function of state and the logged moves — no `Math.random()`, no `Date.now()` anywhere in this story's code paths. The `DrawEvent` trace must be *derivable by replay*, which is why it is transient state and not a `Move`.
- **The `src/rules/` boundary** — enforced by `eslint.config.js`, and `npm run build` runs `npm run lint` first, so a violation fails the build rather than review.
- **Two runtime dependencies only.** This story adds none.
- **Files over 400 lines are blocking**, measured not estimated.

### Assumptions made

- **`BEGIN_TURN` is dispatched by an explicit "Draw station" control, not automatically on mount.** *Rationale:* the obvious alternative — an effect that fires `BEGIN_TURN` when `phase === STATION && pendingCard === null` — is unsafe under React StrictMode, which double-invokes effects in development; the second dispatch hits `applyBeginTurn`'s `pendingCard !== null` guard (`src/rules/reducer.ts:36`) and **throws**. A user-initiated dispatch has no such hazard, needs no cleanup, and suits a hotseat game where the next player takes the mouse anyway. AC1 is still met: after the click, the card is drawn and displayed before placement begins. Flagged in Risks as the developer's to overrule.
- **The ghost card is picked up by pressing on the board, not dragged out of the hand panel.** *Rationale:* pointer capture on the `<svg>` keeps the whole interaction in one coordinate space and one element; a cross-element drag would need a second coordinate conversion for no rules benefit. Pressing anywhere on the board picks the card up; a press-and-release without movement is the same code path, so a plain click also places.
- **Legality is recomputed on every `pointermove`, but React state is set only when the reason *code changes*.** *Rationale:* `validateStationPlacement` is O(paths + stations) — about 3 terrain paths plus at most ~30 stations — so recomputing it per move is cheap, but re-rendering per move is not. The ghost's position goes through a ref; only a legal↔illegal↔different-reason transition triggers a render.
- **The ghost's transform is written via ref and never declared in JSX.** *Rationale:* React only writes attributes present in the element's props, so an attribute it does not manage survives re-renders. Declaring `transform` in JSX would let a legality-driven re-render snap the ghost back. This is the load-bearing detail of the drag design.
- **`GameState.lastDraw` is `readonly DrawEvent[]`, not `DrawEvent[] | null`.** *Rationale:* it mirrors `lastScoring`'s role but not its nullability — "nothing was drawn" and "an empty sequence of draw events" are the same fact here, and every read site is a `.map` that would otherwise carry a null guard for no information gain.
- **The `DrawEvent` trace is transient state, not a new `Move` variant.** *Rationale:* every event is re-derivable by replaying the logged moves through `beginStationStep`, so putting it in the log would duplicate derivable data and invalidate any stored log for nothing. `Move` is untouched by this story.
- **`advanceTurn` clears `lastDraw`.** *Rationale:* one line that stops a previous seat's trace lingering into the next seat's turn in the window between `END_TURN` and the next `BEGIN_TURN`. `END_TURN` is otherwise out of scope.
- **The marker glyph renders whenever `markerOwner !== null`, which includes starting stations.** *Rationale:* `src/rules/setup.ts:145` deliberately sets `markerOwner` on every starting station so §7.3's marker-owner penalty fires for them, and §7.3 states the penalty applies to "the marker's owner — **or the player whose starting station it is**". Rendering the glyph for exactly the set of cards where a marker effect can fire is the truthful display. It is drawn in a corner, distinct from the §7.1 pawn row along the bottom edge.
- **`MAX_STATION_STEP_FAILURES` is exported from `turn.ts` so the M4 progress message can read it.** *Rationale:* the alternative is a literal `3` in UI copy, which the skill classes as a defect. It is a rulebook constant, not a `rules.json` tunable — `turn.ts:26-30` already says so — so exporting it does not create a new tuning surface.
- **Rejection copy lives in `src/ui/placementMessages.ts`, not in `src/constants/`.** *Rationale:* the reason *codes* are shared constants and already exist; the *sentences* are presentation and belong with the UI that renders them.
- **The board `<svg>`'s `role="img"` becomes `role="group"`.** *Rationale:* `role="img"` makes the entire subtree a single opaque graphic to assistive technology, which is defensible for a static board and wrong the moment the board is the drag surface with a ghost card inside it. `role="group"` keeps the `aria-label` and lets children be exposed. No test asserts the current role (there are no component tests).
- **No new `rules.json` key.** *Rationale:* the only tunable this story needs is `cardSize`, which exists and is already read by `search.ts` and the setup generator.

### Config and persisted-shape audit

Performed with `Grep`/`Read` against the working tree on 2026-08-01. This story adds no `rules.json` key and renames nothing, but it **widens `GameState`**, so checks 2–4 are the substantive ones.

- **`rules.json` keys — none renamed, retyped or removed.** The one key this story reads, `geometry.cardSize`, is unchanged; it is already consumed at `src/rules/search.ts:134` and `src/rules/setup.ts`. No new key is added, so there is no unchosen value to route to the developer. `public/rules.json` is **not** in this story's file list.
- **Nothing is persisted, anywhere.** `grep -rn "localStorage\|sessionStorage" src/` → **0 hits**. No saved games, no stored move logs, no migration surface. Adding a `GameState` field today costs nothing; recording here that the window was open is what will let a later change know it has closed.
- **`GameState` gains one required field, breaking exactly 2 construction sites.** A grep for `: GameState` across `src/` returns 40 hits, of which **38 are parameter or return-type annotations and `{...state}` spreads** that absorb a new field automatically. Only **2 are full object literals** that must be edited in the same task or the build breaks: `src/rules/setup.ts:189` (which sets `lastScoring: null` at line 203) and `src/rules/__tests__/fixtures.ts:64` inside `makeState` (which sets `lastScoring: null` at line 78). Both are named in Task 2's `**Files:**` block. No type is narrowed, no field becomes optional, no union is widened — this is purely additive, so no existing `switch` grows a case.
- **`StationStepOutcome` gains one required field, with 4 consumers.** `grep -n "beginStationStep"` → declaration at `src/rules/turn.ts:79`, plus call sites at `src/rules/reducer.ts:48` (`applyBeginTurn`) and `src/rules/reducer.ts:83` (`applyPlaceStation`), and the specs in `src/rules/__tests__/turn.test.ts`. All four are in Task 1/Task 3's file lists. Adding a field to the returned object breaks no destructuring consumer.
- **`Move` is untouched, so no stored log could be invalidated even if one existed.** `MOVE_KIND` gains no member; the six variants at `src/rules/types.ts:100-114` are unchanged. `DRAW_EVENT` is a separate constant map, deliberately not added to `MOVE_KIND` — the same reasoning `src/constants/game.ts:96-106` already records for `GAME_ACTION`.
- **Names align across the chain.** `DRAW_EVENT` keys (`src/constants/game.ts`) ↔ `DrawEventKind` (`src/rules/types.ts`, derived from the constant via `typeof`, so the compiler binds them) ↔ the message map in `src/ui/placementMessages.ts` (typed `Record<DrawEventKind, ...>`, so a missing key is a type error, not a silent `undefined`). Same treatment for `STATION_REJECTION_REASON` → its message map. The one binding the compiler cannot check is the CSS class names shared between `StationGhost.tsx` and `StationGhost.css`; both are created in the same task.
- **The `src/rules/` boundary holds.** `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"` → **0 hits** today. The new `src/rules/staging.ts` takes a `Point` and a `number` and returns a `Rect` — it never sees a `PointerEvent`. Converting client coordinates to world coordinates needs `getScreenCTM()`, which is a DOM call, and it lives in `src/ui/useSvgPoint.ts` on the correct side of the line.

---

## Part 2 — Technical design

### Approach

**The engine already adjudicates every rule this story needs; the work is making its decisions reachable and legible.** Three facts from the audit shape the design. First, `validateStationPlacement(state, rect, config)` is pure, cheap and already returns which of the three §5.2 constraints failed plus the blocking station's id — so live legality feedback is a call, not an algorithm, and AC2/AC3/AC4 need no new rules code at all. Second, `beginStationStep` already implements §5.2's whole draw-and-recycle sequence, including the marker-starved bounce (AC7), the M4 failure count and skip (AC8) and the M5 empty-deck skip (AC9). Third — and this is the one genuine gap — it implements them *silently*, returning `{ state, skipped }`, so the UI cannot tell a clean draw from one preceded by a bounced Landmark and two failed cards. AC7's "rather than happening invisibly" and AC9's "with a clear indication" cannot be satisfied by reading the returned state, because the deck is a black box and the recycles left no mark.

So the engine change is narrow and additive: `StationStepOutcome` gains `events: readonly DrawEvent[]`, an ordered trace appended at each decision point in the existing loop — no control flow moves. The reducer lifts that trace onto `GameState.lastDraw`, mirroring exactly how `applyScoring` lifts a `ScoringBreakdown` onto `lastScoring`; the UI reads it the same way it will read scoring in SCRUM-7. Two events are the reducer's own rather than `beginStationStep`'s, because only the reducer knows them: `EXTRA_DRAW_FROM_RURAL`, emitted when a commit queues the extra draw, and `RURAL_CHAIN_CAPPED`, emitted when a Draw Station card is placed while `drewRuralAlready` was already true — §7.3's "disregard it" made visible, so a second Rural producing nothing reads as a rule rather than a bug. `RURAL_CHAIN_CAPPED` must be computed from the **pre-commit** state, since `commitStationPlacement` sets `drewRuralAlready` true as a side effect; getting that wrong silently suppresses the message. The trace is transient state and deliberately **not** a `Move` — it is fully re-derivable by replaying the log, and widening `Move` would invalidate stored logs for data that costs nothing to recompute. This follows the precedent `src/constants/game.ts:96-106` set when it kept `GAME_ACTION` out of `MOVE_KIND`.

The alternative considered and rejected for the trace was **deriving it in the UI by diffing the deck across dispatches** — comparing `prevState.deck` to `nextState.deck` to infer which cards were rotated to the bottom. It needs no engine change, which is its only merit. It is wrong because it reconstructs a decision the engine already made from its side effects, it cannot distinguish a marker bounce from an M4 failure (both rotate one card to the bottom, but only one increments the failure count and only one counts toward the skip), and it puts rule interpretation in a component, which the skill forbids outright. A second alternative — **returning the trace out-of-band from the reducer** — would break the `(state, move) => state` signature that undo and replay rest on.

**On the UI side the split is: pure maths in `src/rules/`, DOM in `src/ui/`, and nothing in between deciding a rule.** A new pure module `src/rules/staging.ts` holds the two derivations worth testing without a renderer: `cardRectAt(centre, cardSize)`, which centres the card footprint on a world point, and `stationStepStage(state)`, which collapses `(phase, pendingCard, lastDraw)` into one of four stages — `AWAITING_DRAW`, `PLACING`, `SKIPPED`, `DONE` — so the panel is a switch over a tested value rather than a component re-deriving a turn-state machine from three fields. The two stages that look alike, `AWAITING_DRAW` and `SKIPPED`, both have `phase: STATION` with no pending card and are separated only by whether the trace ends in a `SKIPPED_*` event; that is precisely the kind of distinction a component gets subtly wrong and a unit test pins down. Client-to-world coordinate conversion stays in `src/ui/useSvgPoint.ts` because it needs `getScreenCTM()` — the board uses `preserveAspectRatio="xMidYMid meet"`, so hand-rolling the maths from `getBoundingClientRect()` would have to reproduce the letterboxing offset, whereas the CTM already accounts for it.

**The drag follows the skill's architecture rule 4, with one refinement.** The in-progress ghost's position is written straight to the DOM: `useStationPlacement` holds a ref to a `<g>` element and sets its `transform` on every `pointermove`, and that `<g>` **never declares `transform` in JSX** — React does not touch attributes absent from an element's props, so a re-render cannot snap the ghost back to a stale position. Legality, however, is not per-frame data: it changes only when the pointer crosses a constraint boundary, so the hook recomputes `validateStationPlacement` on every move but calls `setState` only when the reason *code* differs from the last one, comparing against a ref. A drag across a crowded board therefore costs a handful of renders rather than one per frame, while the ghost tracks the pointer exactly. No `memo`, `useMemo` or `useCallback` is added anywhere — there is no profiling evidence, and the skill treats speculative memoisation as its own defect. Commit is gated on the same verdict the ghost is showing: `pointerup` dispatches `PLACE_STATION` only when the reason is `null`, and `pointercancel` aborts without dispatching, so an illegal release leaves the card in hand (AC4) with the reducer's own refusal as the second line of defence rather than the first.

### Skills to invoke during execution

- **`react-frontend`** — owns every file this story touches. Load it for: the `src/rules/` purity boundary (`staging.ts` and the `turn.ts`/`reducer.ts` changes), the ref-mutated drag contract and its hot-path rules (`useStationPlacement`, `StationGhost`), the ban on hard-coded tunables (`cardSize` and `MAX_STATION_STEP_FAILURES` both come from a named source, never a literal), colour-first keying (`markerOwner` is a `ColourId`), the 400-line file budget, and the Vitest posture that puts every new spec under `src/rules/__tests__/` with no DOM. Resolves to `.claude/skills/react-frontend/SKILL.md`; also read its `references/engineering-standards.md` before creating the new components.

Developer override: `management-jira` was offered and **declined** — this contract does not transition the Jira ticket, so SCRUM-5's status stays the developer's to move.

Also Read before starting: **`.claude/workflow/web-project.md`** (paths, runners, the PowerShell chaining rule, the correctness traps). `.claude/rules/` was scanned — it contains only `README.md`, so **no shared rule file applies**; re-scan rather than trusting this line, since the README names determinism and save-data versioning as the likely first two, either of which would constrain this story.

### Diagram

```mermaid
sequenceDiagram
    actor P as Player
    participant Panel as StationStepPanel
    participant Board as Board (svg)
    participant Hook as useStationPlacement
    participant Rules as src/rules/ (pure)
    participant Store as useGame reducer

    P->>Panel: click "Draw station"
    Panel->>Store: dispatch BEGIN_TURN
    Store->>Rules: beginStationStep(state, config)
    Note over Rules: recycles a marker-starved card (AC7)<br/>or an unplaceable one (AC8, M4);<br/>appends a DrawEvent at each step
    Rules-->>Store: { state, skipped, events }
    Store-->>Panel: GameState.lastDraw + pendingCard
    Panel-->>P: deck count, card type/bonuses/limit,<br/>trace messages in a live region

    P->>Board: pointerdown (setPointerCapture)
    loop every pointermove
        Board->>Hook: PointerEvent
        Hook->>Hook: toWorld() via getScreenCTM
        Hook->>Rules: cardRectAt(point, config.cardSize)
        Hook->>Rules: validateStationPlacement(state, rect, config)
        Rules-->>Hook: ok | reason (one of three §5.2 codes)
        Hook->>Board: ghostRef.setAttribute("transform", …)
        Note right of Hook: ref mutation only —<br/>setState fires ONLY when<br/>the reason code changes
    end

    alt reason === null (legal)
        P->>Board: pointerup
        Hook->>Store: dispatch PLACE_STATION { cardId, rect }
        Store->>Rules: validateStationPlacement (again — AC4 backstop)
        Store->>Rules: commitStationPlacement → M16 marker, Rural queue
        opt extraDraws > 0 (AC5)
            Store->>Rules: beginStationStep — the one extra draw
        end
        Store-->>Panel: phase STRING (SCRUM-6 takes over) or STATION with the extra card
    else reason !== null (illegal)
        P->>Board: pointerup / pointercancel
        Hook-->>Panel: no dispatch — card stays in hand (AC4)
    end
```

### Data shapes

#### `src/constants/game.ts` — added

```ts
/**
 * §5.2's draw-and-recycle sequence, made reportable (SCRUM-5 AC5/AC7/AC8/AC9).
 * Deliberately NOT added to MOVE_KIND, for the reason GAME_ACTION records above:
 * Move is the persisted log undo and replay derive from, and every event here is
 * re-derivable by replaying that log through beginStationStep.
 */
export const DRAW_EVENT = {
  DREW: 'DREW',
  RECYCLED_NEEDS_MARKER: 'RECYCLED_NEEDS_MARKER', // §7.3 — both markers already placed
  RECYCLED_NO_LEGAL_PLACEMENT: 'RECYCLED_NO_LEGAL_PLACEMENT', // M4 — counts toward the skip
  SKIPPED_NO_LEGAL_PLACEMENT: 'SKIPPED_NO_LEGAL_PLACEMENT', // M4 — 3 consecutive failures
  SKIPPED_DECK_EMPTY: 'SKIPPED_DECK_EMPTY', // M5 — never reshuffled
  EXTRA_DRAW_FROM_RURAL: 'EXTRA_DRAW_FROM_RURAL', // §7.3 Draw Station
  RURAL_CHAIN_CAPPED: 'RURAL_CHAIN_CAPPED', // §7.3 "disregard it — never a third"
} as const

/** Which stage of §10.4 step 1 the state is in; see src/rules/staging.ts. */
export const STATION_STEP_STAGE = {
  AWAITING_DRAW: 'AWAITING_DRAW',
  PLACING: 'PLACING',
  SKIPPED: 'SKIPPED',
  DONE: 'DONE',
} as const
```

#### `src/rules/types.ts` — added and modified

```ts
export type DrawEventKind = (typeof DRAW_EVENT)[keyof typeof DRAW_EVENT]
export type StationStepStage = (typeof STATION_STEP_STAGE)[keyof typeof STATION_STEP_STAGE]

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

// MODIFIED — GameState gains one required field. Additive: no existing field
// changes type or nullability, and Move is untouched.
export interface GameState {
  // …unchanged fields…
  readonly lastScoring: ScoringBreakdown | null
  /** §5.2's trace for the most recent draw attempt. Empty when nothing has been
   *  drawn yet or the last dispatch drew nothing. An array rather than `| null`:
   *  "no draw happened" and "an empty sequence" are the same fact here. */
  readonly lastDraw: readonly DrawEvent[]
  readonly status: 'IN_PLAY' | 'ENDED'
}
```

#### `src/rules/turn.ts` — modified

```ts
// MODIFIED — one added field; both existing fields keep their names and types.
export interface StationStepOutcome {
  readonly state: GameState
  readonly skipped: SkipReason | null
  readonly events: readonly DrawEvent[]
}

// MODIFIED — was module-private. Exported so UI copy can state the M4 ceiling
// without a literal. A rulebook constant, not a rules.json tunable (see its
// existing doc comment at turn.ts:26-30).
export const MAX_STATION_STEP_FAILURES = 3

// Signatures unchanged:
export function beginStationStep(state: GameState, config: RulesConfig): StationStepOutcome
export function advanceTurn(state: GameState): GameState // now also clears lastDraw
```

#### `src/rules/staging.ts` — new module

```ts
/** The pending card's footprint centred on a world point. Pure: src/ui/ owns
 *  turning a PointerEvent into world coordinates, this owns the footprint. */
export function cardRectAt(centre: Point, cardSize: number): Rect

/** Which stage of §10.4 step 1 `state` is in. AWAITING_DRAW and SKIPPED both
 *  present as phase STATION with no pendingCard; they are separated only by
 *  whether lastDraw ends in a SKIPPED_* event. */
export function stationStepStage(state: GameState): StationStepStage
```

#### `src/ui/` — new modules

```ts
// useSvgPoint.ts — the DOM half of coordinate conversion.
// Returns null (never NaN) when the CTM is unavailable, e.g. before layout.
export function useSvgPoint(
  svgRef: RefObject<SVGSVGElement | null>,
): (event: React.PointerEvent<SVGSVGElement>) => Point | null

// useStationPlacement.ts — the drag. `reason` is null while the position is
// legal and while no drag is in progress.
export interface StationPlacementResult {
  readonly ghostRef: RefObject<SVGGElement | null>
  readonly dragging: boolean
  readonly reason: StationRejectionReason | null
  readonly blockingStationId: StationId | null
  readonly handlers: {
    onPointerDown(event: React.PointerEvent<SVGSVGElement>): void
    onPointerMove(event: React.PointerEvent<SVGSVGElement>): void
    onPointerUp(event: React.PointerEvent<SVGSVGElement>): void
    onPointerCancel(event: React.PointerEvent<SVGSVGElement>): void
  }
}
export function useStationPlacement(
  state: GameState,
  config: RulesConfig,
  svgRef: RefObject<SVGSVGElement | null>,
  dispatchMove: (move: Move) => void,
): StationPlacementResult

// placementMessages.ts — presentation. Typed as total Records, so adding a code
// without its copy is a compile error rather than a blank message.
export const REJECTION_COPY: Readonly<Record<StationRejectionReason, string>>
export function describeDrawEvent(event: DrawEvent): string
export function describeRejection(
  reason: StationRejectionReason,
  blockingStationType: StationType | null,
): string

// stationCardText.ts — one description shared by the placed card's aria-label
// and the in-hand panel, so the two cannot drift.
export function describeStationCard(card: StationCard): string
```

#### `src/ui/` — component props

```ts
// StationGhost.tsx — NEW. Draws a cardSize square at the ORIGIN; the caller
// positions it by ref-mutating the wrapper <g>'s transform. `transform` must
// not appear in this component's JSX.
interface StationGhostProps {
  card: StationCard
  cardSize: number
  illegal: boolean
}

// StationStepPanel.tsx — NEW.
interface StationStepPanelProps {
  state: GameState
  stage: StationStepStage
  reason: StationRejectionReason | null
  blockingStationId: StationId | null
  onBeginTurn(): void
  onSkipStationStep(): void
}

// Board.tsx — MODIFIED. Existing props unchanged; three added, all optional so
// the board still renders standalone.
interface BoardProps {
  state: GameState
  config: RulesConfig
  overlays: OverlayFlags
  svgRef?: RefObject<SVGSVGElement | null>
  pointerHandlers?: StationPlacementResult['handlers']
  ghost?: ReactNode
}

// StationCard.tsx — MODIFIED. Props unchanged; renders a marker disc when
// station.markerOwner !== null, in a corner clear of the §7.1 pawn row.
```

#### No other contract changes

No `rules.json` key added, renamed or retyped. No `package.json` dependency or script change. No `Move` variant, no `MOVE_KIND` member, no `tsconfig.json` or `vite.config.ts` change.

### Runtime quality notes

- **Purity and adjudication:** `src/rules/staging.ts` imports only types and `src/constants/game.ts`; it takes a `Point` and a `number`, never a `PointerEvent`, so the DOM never reaches it. The `turn.ts` and `reducer.ts` changes add data to existing return values and move no control flow. **No component decides legality** — `useStationPlacement` calls `validateStationPlacement` and renders its verdict; `placementMessages.ts` maps an engine-produced code to a sentence and cannot invent one, because both maps are typed as total `Record`s over the code unions. `markerOwner` is a `ColourId` throughout and no `PlayerId` enters any path here. Every tunable is sourced: `cardSize` from `RulesConfig`, the M4 ceiling from the exported `MAX_STATION_STEP_FAILURES`, card values from `STATION_DEFINITIONS` — no numeric literal in source or copy.
- **Effects, mount and teardown:** the drag registers **no** `addEventListener`, no timer and no `requestAnimationFrame` — handlers are JSX props on the `<svg>`, so React owns their lifecycle and there is nothing to leak. The one effect in `useStationPlacement` is a cleanup-only effect that calls `releasePointerCapture` if a drag is still active at unmount. Pointer capture is released on **both** `pointerup` and `pointercancel`; `pointercancel` additionally aborts without dispatching. `BEGIN_TURN` is dispatched from a click, never an effect, so StrictMode's double-invocation cannot double-dispatch it into `applyBeginTurn`'s throw — this is the specific hazard the assumption above avoids. No module-level mutable state is introduced. On a second new game `useGame` replaces the whole `GameState` and the hook's refs are re-initialised by the remount; `lastDraw` starts empty from `generateSetup`.
- **Hot-path cost:** per `pointermove` — one `getScreenCTM().inverse()` and `DOMPoint` transform, one `Rect` literal from `cardRectAt`, one `validateStationPlacement` call scanning ~3 paths and ≤35 stations, and one `setAttribute`. Two small allocations and a linear scan over a set bounded by the deck size; no path sampling, no crossing detection (there is no in-progress path in this story), no search. **The legal-placement search is not on this path** — `hasLegalStationPlacement` runs inside the reducer once per drawn card, which is what the developer's ticket comment secured. React renders are bounded by the number of legality *transitions* during a drag, not by frame count. No memoisation is added and none is justified without profiling.
- **Determinism and numeric safety:** no `Math.random()` and no `Date.now()` in any code this story adds — the existing `Date.now()` at `src/ui/useGame.ts:60` mints a seed at the UI boundary and is untouched. The `DrawEvent` trace is produced by the same pure `beginStationStep` the move log replays through, so a replayed game produces an identical trace; that is precisely why it is transient state rather than logged data. `cardRectAt` performs one division by the literal 2 and cannot produce `NaN` from a finite input; `useSvgPoint` returns `null` rather than `NaN` coordinates when `getScreenCTM()` is unavailable, and the caller treats `null` as "no update this frame" so no `NaN` can reach a `transform` or a `Rect`. `config.cardSize` is already validated `> 0` and finite by `parseRulesConfig`. This story introduces no new epsilon — tangency is `config.tangencyTolerance`, applied inside `validateStationPlacement`, unchanged.
- **Error paths:** an illegal position is a **player state, not an error** — the ghost restyles, the panel names the constraint, and no dispatch occurs; the reducer's own re-validation (`src/rules/reducer.ts:74-77`) remains the backstop, so the two would have to fail together for an illegal placement to commit. A genuinely impossible input still throws from the reducer, unchanged and uncaught — nothing here wraps a dispatch in `try`/`catch`, and no path returns a success shape on failure. `beginStationStep`'s existing throw for a deck of exclusively marker-needing cards is left as-is. The two terminal skips are ordinary outcomes with their own copy, not errors: `SKIPPED_DECK_EMPTY` (M5) and `SKIPPED_NO_LEGAL_PLACEMENT` (M4) both render an explanation plus a control to continue to step 2. No new async surface is introduced — the only fetch in the app is `rules.json`, already handled with its four states by `useRulesConfig`.

### Risks and judgement calls

- **`BEGIN_TURN` behind a "Draw station" click rather than automatic.** AC1 says "at the start of a turn the top card is drawn". This plan makes that one deliberate click, because the automatic alternative is a StrictMode double-dispatch into a reducer throw. If you want it automatic, the safe form is to run `gameReducer(generated, { kind: BEGIN_TURN }, config)` synchronously inside `newGame` before dispatching `NEW_GAME` — no effect involved — but that only covers the *first* turn, so a control is still needed after an M4/M5 skip and once SCRUM-6 adds `END_TURN`. **Your call at this gate.**
- **No component tests, and closing that gap needs a new dependency.** `vite.config.ts` sets `environment: 'node'` with `include: ['src/**/__tests__/**/*.test.ts']`, and the skill's own debt table says the first component test must add an environment split rather than flip the global — flipping it would silently un-enforce the `src/rules/` purity boundary at runtime. A real component test also needs **jsdom**, which is not installed, and a new dependency is yours to approve. This plan therefore maximises what is testable purely (the trace, both staging derivations, the reducer's assembly) and leaves the drag itself to your eyes. **The consequence, stated plainly: AC2's continuous feedback, AC3's messaging and AC4's "leaves the card in hand" are verified by unit-testing the logic beneath them, not by driving a pointer.** Say the word and I will add the split and jsdom as a separate contract.
- **The whole interaction is developer-judged.** Whether the ghost tracks the pointer without lag, whether legal-versus-illegal reads at a glance, whether the rejection sentences land, and whether picking the card up by pressing on the board feels natural rather than surprising — none of it has a test. This is the M6-adjacent pause condition arriving early: you run `npm run dev` and look.
- **`RURAL_CHAIN_CAPPED` is a message the ticket did not ask for.** AC5 requires only that a second Rural produces no third draw. Telling the player *why* nothing happened costs one event kind and one sentence, and §7.3's "disregard it" is otherwise indistinguishable from a bug. Drop it if you think it clutters the panel.
- **The marker glyph will appear on starting stations too.** `setup.ts:145` sets `markerOwner` on every starting station so §7.3's owner penalty fires, and §7.3 does extend the penalty to "the player whose starting station it is". Showing the glyph wherever a marker effect can fire is truthful, but if you would rather it appeared only on Landmark and Depot cards, the condition becomes `markerOwner !== null && card.flags.needsMarker` — one line, your preference to state.
- **`role="img"` → `role="group"` on the board `<svg>`.** Correct once the board is interactive, but it changes what a screen reader announces for the board as a whole. No test asserts it. Flagging because it touches SCRUM-4's delivered output.
- **The keyboard gap is real and not closed here.** There is no keyboard equivalent for positioning the card. A "place at the first legal position" fallback would need a legal-position *search result* rather than the boolean `hasLegalStationPlacement` returns, so it is genuinely new engine work, not a UI affordance — out of scope, and stated rather than hidden.
- **This story ends at a dead end, by design.** Committing a station moves `phase` to `STRING`, where nothing exists until SCRUM-6. Expect to place one or two stations and then be stuck with no way to end the turn; that is the correct outcome of this contract, not a defect. Testing M4's three-failure skip and M5's empty deck will need a debug affordance or a contrived seed — worth knowing before you go looking for them.
- **`SCRUM-3-4-config-setup-and-board/tasks.md` still reads `Status: IN PROGRESS` with all 93 steps checked.** Not this story's work, but it will keep offering itself to `/fb-apply` and withholding itself from `/fb-archive` until someone flips it to `COMPLETE`. Worth a one-line fix while you are here.
- **No tuning value is needed and none is invented.** This story adds no `rules.json` key and changes no value in it.
