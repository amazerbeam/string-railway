# Tasks: Tutorial mode — the concept engine, the rules reference, and the coaching surfaces that exist today

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: PLANNED
Started: 2026-08-01

**Goal:** Build the whole tutorial engine as pure `src/rules/tutorial/` code — concept registry, config-sourced copy, trigger logic for criteria 4–13, once-per-session seen-state — plus every coaching surface that exists today (the New Game toggle, the turn-step guide, the coach card, the rules reference panel), leaving only the three call sites in the station drag, the string drag and the scoring breakdown to the tickets that create them.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/constants/tutorial.ts` — `TUTORIAL_CONCEPT` (15 ids) and `TUTORIAL_STORAGE_KEY`
- `src/rules/tutorial/copy.ts` — the copy registry; every body is `(context) => string` (AC 16)
- `src/rules/tutorial/triggers.ts` — `TutorialSignal` union and `conceptsFor(signal, state)` (AC 3–13)
- `src/rules/tutorial/session.ts` — `TutorialSession` and its pure transitions (AC 14)
- `src/rules/tutorial/reference.ts` — `buildRulesReference(config)` (AC 15)
- `src/rules/__tests__/tutorialCopy.test.ts` — including the two-config differential test that enforces AC 16
- `src/rules/__tests__/tutorialTriggers.test.ts`
- `src/rules/__tests__/tutorialSession.test.ts`
- `src/rules/__tests__/tutorialReference.test.ts`
- `src/ui/tutorial/useTutorial.ts` — session owner, guarded `localStorage`, signal/dismiss API
- `src/ui/tutorial/TutorialCoach.tsx` + `TutorialCoach.css`
- `src/ui/tutorial/TurnStepGuide.tsx` + `TurnStepGuide.css`
- `src/ui/tutorial/RulesReferencePanel.tsx` + `RulesReferencePanel.css`
- `pr-description.md` (this folder)

**Modified:**
- `src/constants/stations.ts` — add `STATION_LABEL`
- `src/rules/__tests__/stations.test.ts` — cover `STATION_LABEL` completeness
- `src/ui/NewGamePanel.tsx` — add the tutorial toggle (AC 1)
- `src/ui/NewGamePanel.css` — style the toggle
- `src/ui/AppShell.tsx` — mount the hook, guide, coach and reference panel; record game completion
- `src/ui/AppShell.css` — layout slots for the tutorial column

**Deleted:** (none)

**Developer decides or observes:**
- **The copy in `src/rules/tutorial/copy.ts` and `reference.ts`** — 15 concept bodies plus the per-station "special rules" sentences. Wording and tone are developer-owned; read them and red-line.
- **Whether coaching lands at the right moment** — needs the app running, and two of three trigger interactions do not exist yet. Judge what can be judged: the toggle, the turn-step guide, the coach card's placement and dismissal, the reference panel.
- **Whether the DOM-environment Vitest split should be paid for now** — it needs a `vite.config.ts` change plus a testing-library dependency, and a new dependency needs an explicit yes. This contract does not open it.
- **Whether `localStorage` with the `stringRailway.` prefix is the pattern later persisted surfaces should follow** — this is the first persisted key in the codebase.
- **Whether the turn-step guide should also render outside tutorial mode** — planned as tutorial-only.
- **Whether AC 5 and AC 9 are acceptable as half-delivered** — the copy names the remaining-length gauge and the breakdown lines, but there is nothing to visually anchor to. Literal anchoring (a leader line, a highlighted element) is a design decision for the tickets that build those elements.
- **Whether splitting AC 4 into three concept ids, AC 10 into two and AC 13 into two reads correctly** — the alternative is one card per criterion with branching text, which makes "explained at most once per session" ambiguous when only one of the three §5.2 constraints has been hit.
- **Adding the signal hook point to the acceptance criteria of SCRUM-5, the string-drag ticket and the scoring-UI ticket** — without it, criteria 4–13 stay unreachable.
- *(No tuning value is required by this contract — every number the tutorial states already exists in `rules.json` or `STATION_DEFINITIONS`.)*

---

## Phase 1 — Concept ids, station labels, and config-sourced copy

This phase lands the string-bound names and the copy registry. It is a safe stopping point: the three new modules are additive, nothing imports them yet, and the project type-checks with `STATION_LABEL` as an unused-but-exported constant. The differential test in Task 3 is the load-bearing one — it is what turns AC 16 from a promise into a gate.

### Task 1: Add the concept id map and the storage key in `src/constants/tutorial.ts`

- Skill: `react-frontend`

**Files:**
- Create: `src/constants/tutorial.ts`

- [ ] **Step 1: Write the constants module**

Follow the shape of `src/constants/game.ts` — `UPPER_SNAKE_CASE` keys, `as const`, a doc comment citing the rulebook section and the acceptance criterion.

```ts
/**
 * SCRUM-11 — the teachable concepts, one id per acceptance-criterion clause.
 * Criteria 4, 10 and 13 split into several ids because each clause fires on a
 * different condition: AC 4 must name WHICH §5.2 constraint was violated, so it
 * maps one-to-one onto STATION_REJECTION_REASON.
 */
export const TUTORIAL_CONCEPT = {
  TURN_STEPS: 'TURN_STEPS', // AC 3  — §5.1
  STATION_TOUCHES_STRING: 'STATION_TOUCHES_STRING', // AC 4  — §5.2
  STATION_TOUCHES_STATION: 'STATION_TOUCHES_STATION', // AC 4  — §5.2
  STATION_NOT_INSIDE_BORDER: 'STATION_NOT_INSIDE_BORDER', // AC 4  — §5.2
  STRING_LENGTH_BUDGET: 'STRING_LENGTH_BUDGET', // AC 5  — §5.3.1 (M6)
  CROSSING_PENALTY: 'CROSSING_PENALTY', // AC 6  — §5.4
  PASS_THROUGH_CONNECTION: 'PASS_THROUGH_CONNECTION', // AC 7  — §7.1 (M15)
  TERMINUS_NO_PASS_THROUGH: 'TERMINUS_NO_PASS_THROUGH', // AC 8  — §5.3
  BLACK_VERSUS_GREY: 'BLACK_VERSUS_GREY', // AC 9  — §7.2
  PLAYER_LIMIT_IS_COLOURS: 'PLAYER_LIMIT_IS_COLOURS', // AC 10 — §7.1, §9
  RURAL_LOCKOUT: 'RURAL_LOCKOUT', // AC 10 — §8
  SAME_OWNER_MARKER: 'SAME_OWNER_MARKER', // AC 11 — §9
  SCENIC_MOUNTAIN_BONUS: 'SCENIC_MOUNTAIN_BONUS', // AC 12 — §8
  MARKER_MANDATORY: 'MARKER_MANDATORY', // AC 13 — §7.3 (M16)
  DEPOT_BAIT: 'DEPOT_BAIT', // AC 13 — §8
} as const

/**
 * AC 1 — the ONLY persisted key in this application. Holds the string 'true'
 * once any game has reached status ENDED; absent otherwise. Deliberately not a
 * record of tutorial progress: cross-session progress is out of scope, and the
 * first-session default is the single thing AC 1 asks to remember.
 */
export const TUTORIAL_STORAGE_KEY = 'stringRailway.hasCompletedGame'
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add `STATION_LABEL` to `src/constants/stations.ts`

- Skill: `react-frontend`

**Files:**
- Modify: `src/constants/stations.ts` — append after `STATION_DEFINITIONS`
- Test: `src/rules/__tests__/stations.test.ts`

- [ ] **Step 1: Write the failing test for label completeness**

Append to `src/rules/__tests__/stations.test.ts`, matching the file's existing `describe`/`it` style:

```ts
describe('STATION_LABEL', () => {
  it('names every station type in STATION_TYPE', () => {
    for (const type of Object.values(STATION_TYPE)) {
      expect(STATION_LABEL[type]).toBeTruthy()
    }
  })

  it('gives each type a distinct label', () => {
    const labels = Object.values(STATION_LABEL)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
```

- [ ] **Step 2: Run the spec and confirm it fails on the missing export**

Run: `npx vitest run src/rules/__tests__/stations.test.ts`
Expected: the run fails — `STATION_LABEL` is not exported from `../../constants/stations`.

- [ ] **Step 3: Add the label map**

Append to `src/constants/stations.ts`:

```ts
/**
 * §8 display names. The board renders the raw type key (StationCard.tsx); the
 * rules reference panel and the tutorial copy render this. Rulebook data, not
 * a tunable — these never change when rules.json changes.
 */
export const STATION_LABEL: Readonly<Record<StationType, string>> = {
  [STATION_TYPE.STARTING]: 'Starting Station',
  [STATION_TYPE.HAMLET]: 'Hamlet Station',
  [STATION_TYPE.VILLAGE]: 'Village Station',
  [STATION_TYPE.TOWN]: 'Town Station',
  [STATION_TYPE.SCENIC]: 'Scenic Station',
  [STATION_TYPE.RURAL]: 'Rural Station',
  [STATION_TYPE.TERMINUS]: 'Terminus',
  [STATION_TYPE.RAILYARD]: 'Railyard',
  [STATION_TYPE.LANDMARK]: 'Landmark Station',
  [STATION_TYPE.DEPOT]: 'Depot',
}
```

- [ ] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/stations.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 3: Write the copy registry in `src/rules/tutorial/copy.ts`

- Skill: `react-frontend`

**Files:**
- Create: `src/rules/tutorial/copy.ts`
- Test: `src/rules/__tests__/tutorialCopy.test.ts`

- [ ] **Step 1: Write the failing AC 16 differential test**

Create `src/rules/__tests__/tutorialCopy.test.ts`. The differential test is the mechanism that makes AC 16 enforceable: render the whole registry under two differently-tuned configs and require every config-dependent body to change.

```ts
import { describe, expect, it } from 'vitest'
import { TUTORIAL_CONCEPT } from '../../constants/tutorial'
import { STATION_DEFINITIONS } from '../../constants/stations'
import { TUTORIAL_COPY, renderConcept } from '../tutorial/copy'
import { TEST_CONFIG } from './fixtures'
import type { TutorialConceptId, TutorialCopyContext } from '../tutorial/copy'

const BASE: TutorialCopyContext = { config: TEST_CONFIG, definitions: STATION_DEFINITIONS }

/** Every length doubled and the tolerance changed, so any body that reads a
 *  config value must produce different text. */
const RETUNED: TutorialCopyContext = {
  config: {
    ...TEST_CONFIG,
    shortStringLength: TEST_CONFIG.shortStringLength * 2,
    longStringLength: TEST_CONFIG.longStringLength * 2,
    cardSize: TEST_CONFIG.cardSize * 2,
    borderPerimeter: TEST_CONFIG.borderPerimeter * 2,
    arcLengthTolerance: 0.05,
  },
  definitions: STATION_DEFINITIONS,
}

const ALL_IDS = Object.values(TUTORIAL_CONCEPT) as readonly TutorialConceptId[]

describe('TUTORIAL_COPY', () => {
  it('has an entry for every concept id', () => {
    for (const id of ALL_IDS) {
      expect(TUTORIAL_COPY[id]).toBeDefined()
    }
    expect(Object.keys(TUTORIAL_COPY)).toHaveLength(ALL_IDS.length)
  })

  it('renders a non-empty title, body and section for every concept', () => {
    for (const id of ALL_IDS) {
      const rendered = renderConcept(id, BASE)
      expect(rendered.title.length).toBeGreaterThan(0)
      expect(rendered.body.length).toBeGreaterThan(0)
      expect(rendered.section).toMatch(/§/)
    }
  })

  // AC 16 — the gate. A hard-coded tuning number fails here.
  it('changes every config-dependent body when the config is retuned', () => {
    for (const id of ALL_IDS) {
      if (!TUTORIAL_COPY[id].dependsOnConfig) continue
      expect(renderConcept(id, RETUNED).body).not.toBe(renderConcept(id, BASE).body)
    }
  })

  it('leaves config-independent bodies unchanged when the config is retuned', () => {
    for (const id of ALL_IDS) {
      if (TUTORIAL_COPY[id].dependsOnConfig) continue
      expect(renderConcept(id, RETUNED).body).toBe(renderConcept(id, BASE).body)
    }
  })

  it('states station values from the definitions, not from literals', () => {
    const depot = renderConcept(TUTORIAL_CONCEPT.DEPOT_BAIT, BASE).body
    expect(depot).toContain(String(STATION_DEFINITIONS.DEPOT.bonusFirst))
    expect(depot).toContain(String(STATION_DEFINITIONS.DEPOT.bonusLater))

    const rural = renderConcept(TUTORIAL_CONCEPT.RURAL_LOCKOUT, BASE).body
    expect(rural).toContain(String(STATION_DEFINITIONS.RURAL.playerLimit))

    const scenic = renderConcept(TUTORIAL_CONCEPT.SCENIC_MOUNTAIN_BONUS, BASE).body
    expect(scenic).toContain(String(STATION_DEFINITIONS.SCENIC.mountainBonusValue))
  })

  it('marks the length-budget concept as config-dependent', () => {
    expect(TUTORIAL_COPY[TUTORIAL_CONCEPT.STRING_LENGTH_BUDGET].dependsOnConfig).toBe(true)
  })
})
```

- [ ] **Step 2: Run the spec and confirm it fails on the missing module**

Run: `npx vitest run src/rules/__tests__/tutorialCopy.test.ts`
Expected: the run fails to resolve `../tutorial/copy`.

- [ ] **Step 3: Write the copy module**

Create `src/rules/tutorial/copy.ts`. Types and the registry skeleton:

```ts
import { TUTORIAL_CONCEPT } from '../../constants/tutorial'
import { STATION_LABEL } from '../../constants/stations'
import type { StationDefinition, StationType } from '../../constants/stations'
import type { RulesConfig } from '../config'

export type TutorialConceptId = (typeof TUTORIAL_CONCEPT)[keyof typeof TUTORIAL_CONCEPT]

/**
 * Everything a copy body is allowed to read. AC 16 is structural: a body cannot
 * state a tuning number except by reading it from here, and the differential
 * test in tutorialCopy.test.ts fails any body that hard-codes one instead.
 */
export interface TutorialCopyContext {
  readonly config: RulesConfig
  readonly definitions: Readonly<Record<StationType, StationDefinition>>
}

export interface TutorialCopyEntry {
  readonly title: string
  readonly body: (context: TutorialCopyContext) => string
  /** True when the body interpolates a rules.json value. Drives the AC 16 test. */
  readonly dependsOnConfig: boolean
  /** Rulebook provenance, shown on the coach card. */
  readonly section: string
}

/** Record, not Partial — a concept with no copy is a compile error, never a
 *  blank card at runtime. */
export const TUTORIAL_COPY: Readonly<Record<TutorialConceptId, TutorialCopyEntry>> = {
  [TUTORIAL_CONCEPT.STRING_LENGTH_BUDGET]: {
    title: 'The whole string goes down',
    dependsOnConfig: true,
    section: '§5.3.1 (M6)',
    body: ({ config }) =>
      `A short railway string is ${config.shortStringLength} units long and a long one is ` +
      `${config.longStringLength}. You cannot use part of it — the whole string is laid, within ` +
      `${config.arcLengthTolerance * 100}%. Curving to reach a nearer station spends exactly the ` +
      `same length as going straight, so wiggling to dodge a line costs you reach. Watch the ` +
      `remaining-length gauge as you drag.`,
  },
  [TUTORIAL_CONCEPT.RURAL_LOCKOUT]: {
    title: 'Rural locks everyone else out',
    dependsOnConfig: false,
    section: '§8',
    body: ({ definitions }) =>
      `A Rural Station has a player limit of ${definitions.RURAL.playerLimit}. The first colour ` +
      `to connect takes the only slot, permanently — no other colour can ever reach it.`,
  },
  // …the remaining 13 entries, one per TUTORIAL_CONCEPT key.
}

export function renderConcept(
  id: TutorialConceptId,
  context: TutorialCopyContext,
): { readonly title: string; readonly body: string; readonly section: string } {
  const entry = TUTORIAL_COPY[id]
  return { title: entry.title, body: entry.body(context), section: entry.section }
}
```

Write all 15 entries. Content per concept, each derived from the cited section and never restating a number that lives in config or `STATION_DEFINITIONS`:

| Concept | Section | Must convey |
|---|---|---|
| `TURN_STEPS` | §5.1 | The three steps in order: draw and place a station, place a railway string, score. |
| `STATION_TOUCHES_STRING` | §5.2 | The card may not touch any string — including the border, river and mountain. |
| `STATION_TOUCHES_STATION` | §5.2 | The card may not touch another station card. |
| `STATION_NOT_INSIDE_BORDER` | §5.2 | The card must sit fully inside the border string. |
| `STRING_LENGTH_BUDGET` | §5.3.1 | Fixed length from config, whole string laid, curving costs the same as straight; names the gauge. |
| `CROSSING_PENALTY` | §5.4 | −1 for each crossing of a previously placed string, terrain included (M10); each crossing point counts separately; a crossing on top of a station card is free. |
| `PASS_THROUGH_CONNECTION` | §7.1 (M15) | Running through a station still connects you and still consumes one of its player-limit slots. |
| `TERMINUS_NO_PASS_THROUGH` | §5.3 | A string must start or end on a Terminus and may never pass through it. |
| `BLACK_VERSUS_GREY` | §7.2 | Black (top) if you were the first colour to reach it, grey (bottom) otherwise; names the breakdown lines. |
| `PLAYER_LIMIT_IS_COLOURS` | §7.1, §9 | The limit counts distinct **colours**, not people; your own extra strings to a station you are already on are always allowed. |
| `RURAL_LOCKOUT` | §8 | Limit of 1 from the definitions; permanent lock-out. |
| `SAME_OWNER_MARKER` | §9 | Each colour is a separate player, so one owner's colour scoring at their own other colour's marker fires the trigger — correct, not a bug. |
| `SCENIC_MOUNTAIN_BONUS` | §8 | A Scenic station inside the mountain loop is worth `mountainBonusValue` more. |
| `MARKER_MANDATORY` | §7.3 (M16) | Placing a Landmark or Depot means placing one of your markers, and you may not decline; later, each time another colour scores there the marker owner is affected. |
| `DEPOT_BAIT` | §8 | Depot's `bonusFirst`/`bonusLater` are inverted — the first connector scores nothing, later ones score more, and each of those pays the marker owner. |

- [ ] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/tutorialCopy.test.ts`
Expected: exits 0; Vitest reports 0 failed.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — Trigger evaluation

This phase adds the pure mapping from an interaction to the concepts it teaches — the contract the three deferred call sites will code against. Safe stopping point: `triggers.ts` imports only `containment.ts` and the constants, nothing imports it yet, and its spec passes standalone. Nothing here decides legality; it consumes reasons and breakdown lines the engine already produced.

### Task 4: Write `conceptsFor` and the signal union in `src/rules/tutorial/triggers.ts`

- Skill: `react-frontend`

**Files:**
- Create: `src/rules/tutorial/triggers.ts`
- Test: `src/rules/__tests__/tutorialTriggers.test.ts`

- [ ] **Step 1: Write the failing trigger spec**

Create `src/rules/__tests__/tutorialTriggers.test.ts` using `makeState`, `makeStation`, `makeSeat`, `makeCard` and `makePath` from `./fixtures`. Cover, one `it` each:

- `TURN_BEGAN` yields `TURN_STEPS`.
- `TURN_BEGAN` on a board holding a Terminus also yields `TERMINUS_NO_PASS_THROUGH`; on a board with none, it does not (AC 8).
- `STATION_PLACEMENT_REJECTED` yields exactly the concept matching its `StationRejectionReason` — one case per code, asserting the other two are absent (AC 4).
- `STRING_DRAG_STARTED` yields `STRING_LENGTH_BUDGET` (AC 5).
- `STRING_CROSSED_EXISTING` yields `CROSSING_PENALTY` whether `onCard` is true or false (AC 6 — the free-on-card case is part of the same explanation).
- `STRING_PLACEMENT_REJECTED` with `PLAYER_LIMIT_EXCEEDED` yields `PLAYER_LIMIT_IS_COLOURS`; when the named `stationId` is a Rural station it also yields `RURAL_LOCKOUT`; when it is a Hamlet it does not (AC 10).
- `STRING_PLACEMENT_REJECTED` with `TERMINUS_PASS_THROUGH` yields `TERMINUS_NO_PASS_THROUGH` (AC 8).
- `STRING_PLACED` with a path that runs through a station and ends elsewhere yields `PASS_THROUGH_CONNECTION`; a path that merely ends on a station does not (AC 7).
- `STATION_PLACED` with a Landmark card yields `MARKER_MANDATORY`; with a Depot card yields `MARKER_MANDATORY` and `DEPOT_BAIT`; with a Hamlet yields neither (AC 13).
- `SCORED` with a `ConnectionLine` of `tier: 'BLACK'` yields `BLACK_VERSUS_GREY` (AC 9).
- `SCORED` with a `ConnectionLine` whose `mountainBonus > 0` yields `SCENIC_MOUNTAIN_BONUS` (AC 12).
- `SCORED` with a `MarkerEffectLine` of `sameOwner: true` yields `SAME_OWNER_MARKER`; with `sameOwner: false` it does not (AC 11).
- **AC 2** — a two-seat, one-owner state built with `makeSeat('BLUE', 'P1')` and `makeSeat('RED', 'P1')` produces the same `SAME_OWNER_MARKER` result as a five-seat state, asserting no player-count branch exists.
- Determinism — calling `conceptsFor` twice with the same signal and state returns an equal array.

The pass-through case, showing the fixture shapes:

```ts
it('teaches pass-through when a string runs through a station and ends elsewhere', () => {
  const through = makeStation('HAMLET', { x: 40, y: 0, width: 20, height: 20 })
  const target = makeStation('TOWN', { x: 90, y: 0, width: 20, height: 20 })
  const state = makeState({ stations: [through, target] })
  const path = makePath(
    PATH_KIND.SHORT_RAIL,
    [
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ],
    asColourId('BLUE'),
  )

  expect(conceptsFor({ kind: 'STRING_PLACED', path }, state)).toContain(
    TUTORIAL_CONCEPT.PASS_THROUGH_CONNECTION,
  )
})
```

- [ ] **Step 2: Run the spec and confirm it fails on the missing module**

Run: `npx vitest run src/rules/__tests__/tutorialTriggers.test.ts`
Expected: the run fails to resolve `../tutorial/triggers`.

- [ ] **Step 3: Write the triggers module**

Create `src/rules/tutorial/triggers.ts`:

```ts
import { REJECTION_REASON, STATION_REJECTION_REASON } from '../../constants/game'
import { STATION_TYPE } from '../../constants/stations'
import { TUTORIAL_CONCEPT } from '../../constants/tutorial'
import { endsOn, passesThrough } from '../containment'
import type { TutorialConceptId } from './copy'
import type {
  GameState,
  PlacedPath,
  RejectionReason,
  ScoringBreakdown,
  StationCard,
  StationId,
  StationRejectionReason,
} from '../types'

/**
 * The contract the three deferred call sites emit against (SCRUM-5's station
 * drag, the string-drag ticket, the scoring-UI ticket). Transient UI events,
 * deliberately NOT added to the Move union in types.ts: Move is the persisted
 * move log that undo and replay derive from, and "the player started dragging"
 * is not an event in a game's history (AC 17). Same reasoning as GAME_ACTION
 * in constants/game.ts.
 */
export type TutorialSignal =
  | { readonly kind: 'TURN_BEGAN' }
  | { readonly kind: 'STATION_DRAG_STARTED' }
  | { readonly kind: 'STATION_PLACEMENT_REJECTED'; readonly reason: StationRejectionReason }
  | { readonly kind: 'STATION_PLACED'; readonly card: StationCard }
  | { readonly kind: 'STRING_DRAG_STARTED' }
  | { readonly kind: 'STRING_CROSSED_EXISTING'; readonly onCard: boolean }
  | {
      readonly kind: 'STRING_PLACEMENT_REJECTED'
      readonly reason: RejectionReason
      readonly stationId?: StationId
    }
  | { readonly kind: 'STRING_PLACED'; readonly path: PlacedPath }
  | { readonly kind: 'SCORED'; readonly breakdown: ScoringBreakdown }

/** §5.2 constraint -> the concept that names it (AC 4). */
const STATION_REASON_CONCEPT: Readonly<Record<StationRejectionReason, TutorialConceptId>> = {
  [STATION_REJECTION_REASON.TOUCHES_STRING]: TUTORIAL_CONCEPT.STATION_TOUCHES_STRING,
  [STATION_REJECTION_REASON.TOUCHES_STATION]: TUTORIAL_CONCEPT.STATION_TOUCHES_STATION,
  [STATION_REJECTION_REASON.NOT_INSIDE_BORDER]: TUTORIAL_CONCEPT.STATION_NOT_INSIDE_BORDER,
}

/**
 * Which concepts this interaction should teach, in display order.
 *
 * Pure and config-free: retuning rules.json changes what the copy SAYS but
 * never which concepts FIRE. Nothing here adjudicates — rejection reasons and
 * breakdown lines arrive already decided by validate.ts and scoring.ts, and
 * pass-through reuses containment.ts rather than re-deriving it.
 */
export function conceptsFor(
  signal: TutorialSignal,
  state: GameState,
): readonly TutorialConceptId[] {
  switch (signal.kind) {
    // …one branch per signal kind, per the table in Step 1.
  }
}
```

Implementation notes the branches must honour:

- `TURN_BEGAN` → `[TURN_STEPS]`, plus `TERMINUS_NO_PASS_THROUGH` when `state.stations.some((s) => s.card.flags.terminus)` (AC 8).
- `STATION_PLACEMENT_REJECTED` → `[STATION_REASON_CONCEPT[signal.reason]]`.
- `STATION_PLACED` → `MARKER_MANDATORY` when `signal.card.flags.needsMarker`, and additionally `DEPOT_BAIT` when `signal.card.type === STATION_TYPE.DEPOT`.
- `STRING_PLACEMENT_REJECTED` → switch on `signal.reason`: `PLAYER_LIMIT_EXCEEDED` gives `PLAYER_LIMIT_IS_COLOURS`, plus `RURAL_LOCKOUT` when the station named by `signal.stationId` is `RURAL`; `TERMINUS_PASS_THROUGH` gives `TERMINUS_NO_PASS_THROUGH`; every other reason gives none.
- `STRING_PLACED` → `PASS_THROUGH_CONNECTION` when any station satisfies `passesThrough(signal.path.path, station.rect) && !endsOn(signal.path.path, station.rect)`.
- `SCORED` → walk `breakdown.connections` for `tier === 'BLACK'` (`BLACK_VERSUS_GREY`) and `mountainBonus > 0` (`SCENIC_MOUNTAIN_BONUS`), then `breakdown.markerEffects` for `sameOwner` (`SAME_OWNER_MARKER`). Iterate arrays, never a `Set` or object keys, so the returned order is deterministic.
- `STATION_DRAG_STARTED` and `STRING_DRAG_STARTED` → `[]` and `[STRING_LENGTH_BUDGET]` respectively.

- [ ] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/tutorialTriggers.test.ts`
Expected: exits 0; Vitest reports 0 failed.

- [ ] **Step 5: Typecheck and lint the boundary**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. The `src/rules/**` ESLint override reports no restricted import or global.

---

## Phase 3 — Once-per-session state

This phase adds the immutable session value and its transitions — AC 14's whole content. Safe stopping point: `session.ts` depends only on `triggers.ts` and `copy.ts`, and its spec passes standalone. No UI exists yet to hold it.

### Task 5: Write `TutorialSession` and its transitions in `src/rules/tutorial/session.ts`

- Skill: `react-frontend`

**Files:**
- Create: `src/rules/tutorial/session.ts`
- Test: `src/rules/__tests__/tutorialSession.test.ts`

- [ ] **Step 1: Write the failing session spec**

Create `src/rules/__tests__/tutorialSession.test.ts`. Cover, one `it` each:

- `openTutorialSession(true)` starts enabled with an empty `seen` and an empty `queue`; `openTutorialSession(false)` starts disabled.
- `noteSignal` on a disabled session returns the session unchanged (referentially equal), so a disabled tutorial does no work.
- `noteSignal` enqueues a fresh concept and adds it to `seen` in the same transition.
- **AC 14, the core assertion:** the same signal noted twice enqueues the concept once — the second `noteSignal` leaves `queue` unchanged.
- **AC 14, the enqueue-not-dismiss assertion:** note a signal, note it again *before* dismissing, then dismiss once — `activeConcept` is `null`, proving no duplicate was queued.
- `dismissConcept` removes only the named concept; a second queued concept remains and `activeConcept` returns it (AC 14 — dismissing one does not disable the rest).
- `dismissConcept` with an id not in the queue returns the session unchanged.
- `activeConcept` returns the head of the queue, or `null` when empty.
- A signal producing several concepts (e.g. `STATION_PLACED` with a Depot) queues them in `conceptsFor` order.
- The session is never mutated in place: capture `session.seen` and `session.queue` before a transition and assert the originals are unchanged afterwards.

- [ ] **Step 2: Run the spec and confirm it fails on the missing module**

Run: `npx vitest run src/rules/__tests__/tutorialSession.test.ts`
Expected: the run fails to resolve `../tutorial/session`.

- [ ] **Step 3: Write the session module**

Create `src/rules/tutorial/session.ts`:

```ts
import { conceptsFor } from './triggers'
import type { TutorialSignal } from './triggers'
import type { TutorialConceptId } from './copy'
import type { GameState } from '../types'

export interface TutorialSession {
  readonly enabled: boolean
  /**
   * A concept enters `seen` when it is ENQUEUED, not when it is dismissed.
   * Otherwise a second trigger arriving before the player dismisses the first
   * card queues it twice, which AC 14 forbids.
   */
  readonly seen: ReadonlySet<TutorialConceptId>
  readonly queue: readonly TutorialConceptId[]
}

export function openTutorialSession(enabled: boolean): TutorialSession {
  return { enabled, seen: new Set(), queue: [] }
}

export function noteSignal(
  session: TutorialSession,
  signal: TutorialSignal,
  state: GameState,
): TutorialSession {
  if (!session.enabled) {
    return session
  }
  const fresh = conceptsFor(signal, state).filter((id) => !session.seen.has(id))
  if (fresh.length === 0) {
    return session
  }
  const seen = new Set(session.seen)
  for (const id of fresh) {
    seen.add(id)
  }
  return { ...session, seen, queue: [...session.queue, ...fresh] }
}

export function dismissConcept(
  session: TutorialSession,
  id: TutorialConceptId,
): TutorialSession {
  if (!session.queue.includes(id)) {
    return session
  }
  return { ...session, queue: session.queue.filter((queued) => queued !== id) }
}

export function activeConcept(session: TutorialSession): TutorialConceptId | null {
  return session.queue[0] ?? null
}
```

- [ ] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/tutorialSession.test.ts`
Expected: exits 0; Vitest reports 0 failed.

---

## Phase 4 — The rules reference (AC 15)

This phase delivers criterion 15 end to end, and it is the one part of the ticket that needs nothing deferred. The pure builder is tested in the node environment; the panel is a thin renderer over it, which is how AC 15 gets real coverage without opening the DOM-environment split. Safe stopping point: the panel is self-contained and not yet mounted.

### Task 6: Build the reference data in `src/rules/tutorial/reference.ts`

- Skill: `react-frontend`

**Files:**
- Create: `src/rules/tutorial/reference.ts`
- Test: `src/rules/__tests__/tutorialReference.test.ts`

- [ ] **Step 1: Write the failing reference spec**

Create `src/rules/__tests__/tutorialReference.test.ts`. Cover, one `it` each:

- `turnSteps` has the three §5.1 steps in order.
- `stringLengths.short` and `.long` equal `TEST_CONFIG.shortStringLength` / `.longStringLength`, and doubling those in a modified config doubles the output (AC 16).
- `tolerancePercent` equals `TEST_CONFIG.arcLengthTolerance * 100`, and is finite for every tolerance `parseRulesConfig` permits — assert at `0.02` and at `0.5`.
- `cardSize` equals `TEST_CONFIG.cardSize`.
- `stations` has one row per `STATION_TYPE` value, each `label` matching `STATION_LABEL`, each `first`/`later`/`playerLimit` matching `STATION_DEFINITIONS`.
- `deckCount` is `null` for `STARTING` and equals `config.deckComposition[type]` for every other type.
- `deckTotal` equals the sum of `config.deckComposition`, and equals `DECK_SIZE` under `TEST_CONFIG`.
- `crossingRules` is non-empty and every entry is a non-empty string.
- No row states a value the definitions contradict: for `SCENIC`, `special` contains `String(STATION_DEFINITIONS.SCENIC.mountainBonusValue)`.

- [ ] **Step 2: Run the spec and confirm it fails on the missing module**

Run: `npx vitest run src/rules/__tests__/tutorialReference.test.ts`
Expected: the run fails to resolve `../tutorial/reference`.

- [ ] **Step 3: Write the reference builder**

Create `src/rules/tutorial/reference.ts` exporting `ReferenceStationRow`, `RulesReference` and `buildRulesReference(config)` exactly as declared in `plan.md` Part 2 → Data shapes. Rules the implementation must honour:

- Iterate `Object.values(STATION_TYPE)` for row order, so the glossary order is deterministic and adding a type cannot silently drop a row.
- `deckCount` is `null` for `STATION_TYPE.STARTING` (§2 ships the five starting stations outside the 35-card deck) and `config.deckComposition[type]` otherwise.
- `deckTotal` is summed from `config.deckComposition`, never `DECK_SIZE` — the panel must show what is loaded, not what is expected.
- `tolerancePercent` is `config.arcLengthTolerance * 100`. `parseRulesConfig` already guarantees a finite value strictly between 0 and 1, so no guard is needed and no `NaN` can reach the panel.
- `special` sentences read `STATION_DEFINITIONS` for every number — Scenic's `mountainBonusValue`, Rural's `playerLimit`, Depot's `bonusFirst`/`bonusLater`.
- `crossingRules` states: −1 per crossing of a previously placed string; terrain counts as previously placed (M10); each crossing point counts separately; a crossing on top of a station card is free (§5.4).

- [ ] **Step 4: Run the spec and confirm it passes**

Run: `npx vitest run src/rules/__tests__/tutorialReference.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 7: Render the reference panel in `src/ui/tutorial/RulesReferencePanel.tsx`

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/tutorial/RulesReferencePanel.tsx`
- Create: `src/ui/tutorial/RulesReferencePanel.css`

- [ ] **Step 1: Write the component**

Follow `src/ui/SeatLegend.tsx` and `src/ui/DebugPanel.tsx` for file order (imports → constants → component → helpers → export), per-component CSS import, and semantic markup.

```tsx
import './RulesReferencePanel.css'
import type { RulesReference } from '../../rules/tutorial/reference'

interface RulesReferencePanelProps {
  reference: RulesReference
}

/**
 * AC 15 — reachable at any time, in or out of tutorial mode. A thin renderer:
 * every value comes from buildRulesReference, which is covered in the node
 * environment by tutorialReference.test.ts. No logic lives here.
 */
function RulesReferencePanel({ reference }: RulesReferencePanelProps) {
  return (
    <details className="rules-reference">
      <summary className="rules-reference__summary">Rules reference</summary>
      {/* turn steps (ol) · string lengths and tolerance · crossing rules (ul) ·
          station glossary (table with a scope="col" header row) */}
    </details>
  )
}

export default RulesReferencePanel
```

Requirements the markup must meet: a `<table>` for the glossary with `<th scope="col">` headers; an `<ol>` for the turn steps; the `<summary>` is the disclosure control and must present a ≥44px hit area via padding; `:focus-visible` for the keyboard outline; hover styles wrapped in `@media (hover: hover)` and paired with `:active`; `touch-action: manipulation`. No number appears as a literal in JSX — every one comes off the `reference` prop.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

---

## Phase 5 — The tutorial hook, the coaching surfaces, and the wiring

This phase connects everything to the running app: the hook that owns the session and the only `localStorage` access in the codebase, the coach card, the turn-step guide, the New Game toggle, and the `AppShell` wiring. It is last because every earlier phase is independently testable and this one is not. Safe stopping point: the app type-checks, builds, and renders the toggle, the guide, the coach and the reference panel against a real generated board.

### Task 8: Write `src/ui/tutorial/useTutorial.ts`

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/tutorial/useTutorial.ts`

- [ ] **Step 1: Write the hook**

Follow `src/ui/useRulesConfig.ts` — it is the precedent for a hook owning the codebase's only reach for a given browser API. Structure:

```ts
import { useCallback, useState } from 'react'
import { TUTORIAL_STORAGE_KEY } from '../../constants/tutorial'
import { STATION_DEFINITIONS } from '../../constants/stations'
import { renderConcept } from '../../rules/tutorial/copy'
import {
  activeConcept,
  dismissConcept,
  noteSignal,
  openTutorialSession,
} from '../../rules/tutorial/session'
import type { TutorialSignal } from '../../rules/tutorial/triggers'
import type { TutorialConceptId } from '../../rules/tutorial/copy'
import type { RulesConfig } from '../../rules/config'
import type { GameState } from '../../rules/types'

/**
 * AC 1 — the first-session default. Guarded because localStorage throws in
 * private mode and when storage is disabled. Falling back to "no game
 * completed" turns the tutorial ON, which is the safe direction: this defaults
 * an unavailable user PREFERENCE, not a rule value, and is deliberately not
 * the forbidden `catch { return DEFAULTS }` on a config load.
 */
export function readTutorialDefault(): boolean {
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) !== 'true'
  } catch {
    return true
  }
}

/** Fire-and-forget: failing to record completion means the tutorial defaults
 *  on again next session, which is the safe direction. */
export function markGameCompleted(): void {
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
  } catch {
    // Storage unavailable — nothing to recover, and nothing worth telling the
    // player. Deliberately empty, not a swallowed failure of a real operation.
  }
}
```

Then `useTutorial(config, defaultEnabled)`:

- `const [session, setSession] = useState(() => openTutorialSession(defaultEnabled))` — lazy initialiser, local UI state, **not** a second store and not a copy of `GameState`.
- `setEnabled(enabled)` replaces the session via `openTutorialSession(enabled)`, so toggling off and on within a session starts a fresh `seen` set — matching "once per session" where the session is the tutorial session.
- `signal(signal, state)` calls `setSession((current) => noteSignal(current, signal, state))`. Take `state` as an argument rather than closing over it, so a handler registered once cannot validate against a stale board.
- `dismiss(id)` calls `setSession((current) => dismissConcept(current, id))`.
- `active` derives from `activeConcept(session)` and `renderConcept(id, { config, definitions: STATION_DEFINITIONS })`, returning `null` when the queue is empty. Computed during render — derived state is never stored.
- Wrap `signal` and `dismiss` in `useCallback` only if `AppShell` passes them to a child that would otherwise re-register an effect; otherwise leave them plain, since memoisation without profiling evidence is an anti-pattern.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. Note that `localStorage` is restricted only under `src/rules/**`; this file is under `src/ui/` and is the sanctioned location.

### Task 9: Write `src/ui/tutorial/TutorialCoach.tsx`

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/tutorial/TutorialCoach.tsx`
- Create: `src/ui/tutorial/TutorialCoach.css`

- [ ] **Step 1: Write the component**

```tsx
import './TutorialCoach.css'
import type { TutorialConceptId } from '../../rules/tutorial/copy'

interface TutorialCoachProps {
  active: {
    readonly id: TutorialConceptId
    readonly title: string
    readonly body: string
    readonly section: string
  } | null
  onDismiss: (id: TutorialConceptId) => void
}

/**
 * AC 14 — one card at a time, dismissible, and dismissing it does not disable
 * the rest: the session simply advances to the next queued concept.
 *
 * Deliberately a card in a fixed region, not a popover anchored to an SVG node.
 * AC 5's length gauge and AC 9's breakdown lines do not exist yet; the copy
 * names them, and visual anchoring belongs to the tickets that build them.
 */
function TutorialCoach({ active, onDismiss }: TutorialCoachProps) {
  if (active === null) {
    return null
  }

  return (
    <aside className="tutorial-coach" role="status" aria-live="polite">
      <h3 className="tutorial-coach__title">{active.title}</h3>
      <p className="tutorial-coach__body">{active.body}</p>
      <p className="tutorial-coach__section">{active.section}</p>
      <button
        type="button"
        className="tutorial-coach__dismiss"
        onClick={() => onDismiss(active.id)}
      >
        Got it
      </button>
    </aside>
  )
}

export default TutorialCoach
```

CSS requirements: `.tutorial-coach__dismiss` has a ≥44×44px hit area (padding, not font size), `:focus-visible` outline, `@media (hover: hover)` hover paired with `:active`, and `touch-action: manipulation`. AA contrast against the card background.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 10: Write `src/ui/tutorial/TurnStepGuide.tsx`

- Skill: `react-frontend`

**Files:**
- Create: `src/ui/tutorial/TurnStepGuide.tsx`
- Create: `src/ui/tutorial/TurnStepGuide.css`

- [ ] **Step 1: Write the component**

AC 3 — the three §5.1 steps, current indicated, others visibly pending. Driven entirely by `GameState.phase`, which is already `TURN_PHASE.STATION | STRING | COMPLETE`.

```tsx
import { TURN_PHASE } from '../../constants/game'
import './TurnStepGuide.css'
import type { TurnPhase } from '../../rules/types'

/** §5.1, in order. Each entry's phase is the TURN_PHASE value during which
 *  that step is the current one. */
const STEPS: readonly { readonly phase: TurnPhase; readonly label: string }[] = [
  { phase: TURN_PHASE.STATION, label: 'Draw and place a station' },
  { phase: TURN_PHASE.STRING, label: 'Place a railway string' },
  { phase: TURN_PHASE.COMPLETE, label: 'Score points' },
]

interface TurnStepGuideProps {
  phase: TurnPhase
}

function TurnStepGuide({ phase }: TurnStepGuideProps) {
  return (
    <ol className="turn-step-guide" aria-label="Turn steps">
      {STEPS.map((step) => {
        const current = step.phase === phase
        return (
          <li
            key={step.phase}
            className={`turn-step-guide__step${current ? ' turn-step-guide__step--current' : ''}`}
            aria-current={current ? 'step' : undefined}
          >
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}

export default TurnStepGuide
```

The pending steps must be visually distinct from the current one by more than colour alone (weight or a marker), so the distinction survives a contrast failure.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0.

### Task 11: Add the tutorial toggle to `src/ui/NewGamePanel.tsx`

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/NewGamePanel.tsx:14-41` — widen the props and add the control
- Modify: `src/ui/NewGamePanel.css`

- [ ] **Step 1: Widen the props and render the checkbox**

Replace the `NewGamePanelProps` interface with:

```tsx
interface NewGamePanelProps {
  onNewGame: (playerCount: PlayerCount) => void
  disabled: boolean
  tutorialEnabled: boolean
  onTutorialEnabledChange: (enabled: boolean) => void
}
```

Add, after the `<ul className="new-game__counts">` block and before `</section>`, a labelled checkbox — a real `<input type="checkbox">` with an associated `<label>`, not a styled `div`:

```tsx
<label className="new-game__tutorial">
  <input
    type="checkbox"
    checked={tutorialEnabled}
    onChange={(event) => onTutorialEnabledChange(event.target.checked)}
  />
  <span>Tutorial mode — explain the rules as I play</span>
</label>
```

CSS: ≥44px hit area on the label, `:focus-visible` on the input, `@media (hover: hover)` hover paired with `:active`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: fails in `src/ui/AppShell.tsx` — `NewGamePanel` is rendered without the two new required props. That is the expected intermediate state; Task 12 resolves it.

### Task 12: Wire the tutorial into `src/ui/AppShell.tsx`

- Skill: `react-frontend`

**Files:**
- Modify: `src/ui/AppShell.tsx:59-95` — the `GameShell` component
- Modify: `src/ui/AppShell.css`

- [ ] **Step 1: Mount the hook and the surfaces**

Inside `GameShell`:

- `const [tutorialEnabled, setTutorialEnabled] = useState(readTutorialDefault)` — AC 1's first-session default, read once via the lazy initialiser so `localStorage` is not touched on every render.
- `const tutorial = useTutorial(config, tutorialEnabled)`.
- The `onTutorialEnabledChange` handler sets both the local flag and `tutorial.setEnabled`, so toggling mid-session takes effect immediately.
- Pass `tutorialEnabled` and that handler to `<NewGamePanel>`, resolving Task 11's intermediate failure.
- Render `<RulesReferencePanel reference={buildRulesReference(config)} />` **outside** the `tutorialEnabled` guard — AC 15 requires it in and out of tutorial mode.
- Render `<TurnStepGuide phase={state.phase} />` and `<TutorialCoach active={tutorial.active} onDismiss={tutorial.dismiss} />` inside the existing `state !== null && …` block, guarded on `tutorialEnabled`.

- [ ] **Step 2: Emit the two signals that exist today**

Add one effect that fires `TURN_BEGAN` when `state.round` or `state.activeSeatIndex` changes, and one that fires `STATION_PLACED` when `state.stations.length` grows — reading the newly appended station's `card`. Both must be idempotent under StrictMode's double mount: `noteSignal` is already idempotent per concept (a repeat is filtered by `seen`), which is what makes this safe. Depend on the specific scalar values, not on `state`, so an unrelated state change does not re-fire.

- [ ] **Step 3: Record game completion for AC 1**

Add an effect that calls `markGameCompleted()` when `state.status === 'ENDED'`. Guard on the status value so it fires on the transition rather than on every subsequent render; writing the same key twice is harmless, which is what makes the StrictMode double mount safe here too.

- [ ] **Step 4: Typecheck and lint**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0, including the earlier `NewGamePanel` error now resolved.

- [ ] **Step 5: Run the four tutorial specs together**

Run: `npx vitest run src/rules/__tests__/tutorialCopy.test.ts src/rules/__tests__/tutorialTriggers.test.ts src/rules/__tests__/tutorialSession.test.ts src/rules/__tests__/tutorialReference.test.ts`
Expected: exits 0; Vitest reports 0 failed.

---

## Phase 6 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task M.1: Confirm the `src/rules/` boundary still holds

- Skill: `none — verification only, no code written`

- [ ] **Step 1: Grep for React and DOM references under `src/rules/`**

Run: `Select-String -Path src\rules\*.ts,src\rules\**\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. In particular the four new `src/rules/tutorial/` modules must not appear — `localStorage` belongs to `src/ui/tutorial/useTutorial.ts` alone.

- [ ] **Step 2: Confirm no `.tsx` file was created under `src/rules/`**

Run: `Get-ChildItem src\rules -Recurse -Filter *.tsx`
Expected: no output.

### Task M.2: Confirm AC 17 — the tutorial has no path to the reducer

- Skill: `none — verification only, no code written`

- [ ] **Step 1: Grep the tutorial modules for a rules-mutation import**

Run: `Select-String -Path src\rules\tutorial\*.ts,src\ui\tutorial\*.ts,src\ui\tutorial\*.tsx -Pattern "from '.*reducer'|from '.*turn'|dispatchMove|MOVE_KIND"`
Expected: zero hits. The tutorial reads state and reports concepts; it never produces a `Move`, so scores are identical with tutorial mode on or off.

### Task M.3: Confirm no tunable was hard-coded in tutorial copy

- Skill: `none — verification only, no code written`

- [ ] **Step 1: Grep the new modules for the literals `rules.json` owns**

Run: `Select-String -Path src\rules\tutorial\*.ts,src\ui\tutorial\*.tsx,src\constants\tutorial.ts -Pattern "\b(350|700|1400|4000|120)\b"`
Expected: zero hits. (`src/ui/HeroScene.tsx:22` holds a pre-existing decorative-path hit outside this contract's file set; it is not a tunable and is not in scope.)

- [ ] **Step 2: Confirm the AC 16 differential test is present and passing**

Run: `npx vitest run -t "changes every config-dependent body when the config is retuned"`
Expected: exits 0; Vitest reports 1 passed.

### Task M.4: Confirm no file exceeds the size budget

- Skill: `none — verification only, no code written`

- [ ] **Step 1: Measure every file created or grown**

Run: `Get-ChildItem src\rules\tutorial\*.ts,src\ui\tutorial\*.tsx,src\ui\tutorial\*.ts,src\constants\tutorial.ts,src\ui\AppShell.tsx,src\ui\NewGamePanel.tsx,src\constants\stations.ts | ForEach-Object { "{0,-52} {1}" -f $_.Name, (Get-Content $_.FullName | Measure-Object -Line).Lines }`
Expected: every count under 400. Anything in 200–400 gets a second look for a hook or sibling component hiding in it; anything over 400 is split in this phase, not deferred.

### Task M.5: Static gates, full suite, and build

- Skill: `none — verification only, no code written`

- [ ] **Step 1: Typecheck, lint, format check, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm run format:check; npm test`
Expected: all four exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` summary line.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task M.6: Write the PR description

- Skill: `none — documentation, no code written`

**Files:**
- Create: `.claude/contract/SCRUM-11-tutorial-mode-core/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` in this folder and to [SCRUM-11](https://amazerbeam.atlassian.net/browse/SCRUM-11).
- Summary of the change, and an explicit acceptance-criterion table marking which of the 17 are **delivered**, which are **delivered as tested logic awaiting a call site** (4–13), and which are **partial** (5 and 9 — copy names the gauge and the breakdown lines, visual anchoring deferred).
- The three deferred hook points, named precisely, with the recommendation that each be added to the acceptance criteria of SCRUM-5, the string-drag ticket and the scoring-UI ticket.
- Every decision the developer must make and every behaviour they must judge by playing, copied from the File map's "Developer decides or observes".
- Verification results from Phase 6, with the actual numbers.
- A one-line note for future contributors on the two conventions introduced: copy bodies are `(context) => string` so AC 16 is enforced by a test rather than by review, and `stringRailway.hasCompletedGame` is the first persisted key and sets the prefix pattern.
- The stated accessibility gap: no component test covers the toggle, the coach or the reference panel, because the Vitest DOM-environment split is unopened debt.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage** — every `plan.md` Part 1 "In scope" bullet maps to a task:

- `src/constants/tutorial.ts` (ids + storage key) — Task 1.
- `src/constants/stations.ts` `STATION_LABEL` — Task 2.
- `src/rules/tutorial/copy.ts` + AC 16 differential test — Task 3, verified again in Task M.3.
- `src/rules/tutorial/triggers.ts` (AC 3–13) — Task 4.
- `src/rules/tutorial/session.ts` (AC 14) — Task 5.
- `src/rules/tutorial/reference.ts` (AC 15) — Task 6.
- `src/ui/tutorial/useTutorial.ts` (AC 1, 14) — Task 8.
- `TutorialCoach.tsx` — Task 9. `TurnStepGuide.tsx` (AC 3) — Task 10. `RulesReferencePanel.tsx` (AC 15) — Task 7.
- `NewGamePanel.tsx` toggle (AC 1) — Task 11. `AppShell.tsx` wiring — Task 12.
- Vitest coverage including AC 2 (2- and 5-player) and AC 11 (§9 same-owner) — Tasks 3, 4, 5, 6; AC 2 and AC 11 specifically in Task 4 Step 1.
- AC 17 (no rules change, no leniency) — enforced structurally, verified in Task M.2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows exact code, an explicit content table, or a runnable command with `Run:` / `Expected:`. The one intentionally elided code block — `TUTORIAL_COPY`'s remaining 13 entries in Task 3 Step 3 — is specified by a per-concept content table naming the section and the fact each body must convey, and is gated by a test that fails if any entry is missing.

**Type / name consistency:** `TutorialConceptId`, `TutorialCopyContext`, `TutorialCopyEntry`, `TUTORIAL_COPY`, `renderConcept`, `TutorialSignal`, `conceptsFor`, `TutorialSession`, `openTutorialSession`, `noteSignal`, `dismissConcept`, `activeConcept`, `ReferenceStationRow`, `RulesReference`, `buildRulesReference`, `useTutorial`, `readTutorialDefault`, `markGameCompleted`, `TUTORIAL_CONCEPT`, `TUTORIAL_STORAGE_KEY`, `STATION_LABEL` — each is spelled identically in every task that uses it and matches `plan.md` Part 2 → Data shapes. The 15 concept ids and the 8 `TutorialSignal.kind` values are declared once and imported everywhere else. `TUTORIAL_STORAGE_KEY`'s value `'stringRailway.hasCompletedGame'` appears in Task 1 only; Tasks 8 and M.2 reference it by name.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: three additive files, `STATION_LABEL` exported and covered by its own spec, nothing importing the copy registry except its test.
- **Phase 2** ends type-checking: `triggers.ts` imports only `containment.ts`, the constants and `copy.ts`'s type; its spec passes standalone; the boundary lint is run explicitly at Step 5.
- **Phase 3** ends type-checking: `session.ts` closes over `triggers.ts` and `copy.ts` only; no UI holds a session yet.
- **Phase 4** ends type-checking: the reference builder is covered, and the panel compiles as an unmounted component.
- **Phase 5** contains one deliberate intra-phase break — Task 11 Step 2 widens `NewGamePanelProps` and expects `AppShell.tsx` to fail typecheck until Task 12 Step 1 passes the new props. The break is named in the step's `Expected:` line and is closed inside the same phase, so the **phase boundary** is clean even though a task boundary inside it is not.
- **Phase 6** makes no production change; if Task M.4 finds a file over 400 lines it is split inside this phase rather than deferred.
