# Tasks: Two-sided damage — card value × Standing, both directions, once at trick 13

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-12

**Goal:** Add `huntDamage(finalState)` — one engine entry point that computes `card value × Standing` for both seats off the single declaration the player made, rounds each product once, and returns the pair keyed by the side each figure depletes, refusing by throwing on an unfinished or undeclared Hunt.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder — the Standing track, approved at the gate on 2026-08-12 after one revision round (per-trick pips added at the developer's request).

---

## File map

**Created:**

- `src/warCouncil/__tests__/huntEnumeration.test.ts` — §8's fourteen-split enumeration under both declarations (AC7) and the derived antisymmetry property (AC6).
- `src/app/warCouncil/standingSegments.ts` — pure helper turning a configured table plus a trick count into renderable segments.
- `src/app/warCouncil/__tests__/standingSegments.test.ts` — spans, height ratios, peak/cliff, current pip index, and the two error paths.
- `src/app/warCouncil/StandingTrack.tsx` — the Standing track component.
- `src/app/warCouncil/__tests__/StandingTrack.test.tsx` — marker placement and accessible labelling.

**Modified:**

- `src/warCouncil/scoring.ts` — wrap `damage` in `roundDamage` (AC4); add `HuntNotScorable`, `HuntNotScorableError`, `HuntOutcome`, `huntDamage`; correct the `HuntDamage` docblock's withdrawn-rename claim.
- `src/warCouncil/index.ts:26-27` — barrel: add `huntDamage`, `HuntNotScorable`, `HuntNotScorableError`, `type HuntOutcome`.
- `src/warCouncil/__tests__/scoring.test.ts` — add the AC4 fractional-product case, the two guards and their reason codes, the corrupt-trick-count propagation, AC2's shared table, and AC3's direction crossing.
- `src/warCouncil/spoils.ts:11-13` — comment-only: the pile swap is DLR-69, not DLR-68.
- `src/warCouncil/types.ts:102-110` — comment-only: record that `huntDamage` bypasses `declaredPath`'s undeclared-reads-as-Win default.
- `src/app/warCouncil/HuntLedger.tsx:1-18,35-45` — gains `table` and `tricks`; the `Standing` cell becomes the narrow-viewport fallback beside the new track.
- `src/app/warCouncil/RoundStatusBand.tsx:1-14,61` — threads `table` through to `HuntLedger`.
- `src/app/warCouncil/WarCouncilRound.tsx:188-192` — supplies `standingTableFor(declaredPath(ui.round))` and the player's trick count.
- `src/app/warCouncil/labels.ts` — add `STANDING_TRACK_LABEL`.
- `src/app/warCouncil/warCouncilHunt.css` — the track's rules plus the collapse inside the existing `@media (max-width: 44rem), (max-height: 34rem)` block.
- `src/app/warCouncil/__tests__/HuntLedger.test.tsx` — forced by two new required props; add the track's own assertions.

**Deleted:** *(none)*

**Developer decides or observes:**

- **ALREADY DECIDED, recorded so it is not re-litigated:** `HuntDamage.spoils` is **not** renamed to `cardValue`. AC1 asks for that rename; the developer withdrew it on 2026-08-12 (*"spoils is an ok name to code with for a prototype"*). This is what keeps the ticket's no-UI-file boundary intact — the three read sites are in `.tsx` files it may not touch. A reviewer diffing against AC1 will flag the field name; that flag is answered here and in `plan.md` Part 1.
- **STATED HANDOVER, not a decision:** the Lose column in `huntEnumeration.test.ts` asserts **own-pile** valuation, not §8's Lose column, because the pile swap is DLR-69. §8 publishes `78 / 0` at `k=0`; own-pile gives `0 / 156`, and the whole column's sign inverts once DLR-69 lands. AC7 names this explicitly so it is not discovered in review.
- **`HuntNotScorableError` is the first `class` in `src/`** and the first non-`RangeError` throw — approved at the plan gate, flagged here so a reviewer reads it as a decision. Classless fallback: two built-in error types plus message matching (a brittle string-bound surface).
- **AC4's rounding changes numbers already on screen.** `scoreHunt` feeds the live end panel, so a ×0.5 band on an odd card value renders as e.g. `49 × 0.5 = 25` — correct, but it reads as arithmetically wrong to a player. Copy call, owned by DLR-71. Look at a Greedy-band Hunt with an odd card total.
- **`HuntLedger.tsx:20` duplicates the equation** (`spoils * band.multiplier`) inside a component rather than reading the engine's `damage`. After this contract the mid-round preview is unrounded while the end panel is rounded — they can disagree by 0.5. UI file, out of scope. **Recommend filing its own ticket.**
- **`WarCouncilRound.tsx:69` holds a local `const huntDamage`.** Once the engine exports that name, the next ticket importing it there hits a shadowing hazard. Cannot be renamed from this contract.
- **The enumeration fixture couples `src/hunt/config.ts` to `hybrid-design.md` §8** by design. Retuning the tables breaks 28 transcribed assertions; a retune is a two-file change plus DLR-77 for the doc.
- **`npm run format:check` fails repo-wide** on pre-existing `.docs/**` files (`web-project.md` → Hard constraints on runners). Report it; do not repair it.
- **DLR-67 is `BLOCKED` on a declare-gate CSS overflow** at 680×520 and 700×544. Pre-existing, in a stylesheet this contract cannot touch — must not be attributed here.
- **The engine half is not observable.** Per the ticket: *"The numbers exist but nothing shows them until the health-bar ticket."* The Vitest enumeration is its verification. The Standing track *is* observable, so QA has real functional work here.
- **Six visual values on the track are placeholders, not choices — all yours:** the three fill colours (`#4a3d22` current, `#3c4a33` peak, `#3a2724` cliff), the track's `clamp()` width and its height, the `min-height` floor keeping a ×0.5 bar visible, and the pip opacity (`rgba(233,225,205,0.32)`). No new colour token is introduced; all three fills are mixed from existing `--wc-*` values.
- **Whether the 44rem / 34rem collapse threshold is right.** Below it the track hides and today's compact cell renders. If the bar still overflows, the levers are the track's `clamp()` lower bound or a higher threshold — both your values.
- **The ×0.5 bar at an honest scale is nearly invisible**, which is why a `min-height` floor exists. On Lose, 0-3 is that sliver and its pips stand taller than the bar. Legible, but a look for your eye — the alternative is a non-linear height scale, which would flatten the cliff.
- **Whether AC1's `spoils` → `cardValue` rename should now happen.** The scope widening put UI files in scope, so the rename that was blocked is now three mechanical lines. Left undone on your stated preference; say the word and it goes in.

---

## Phase 1 — Rounding at a single point

Puts AC4 in place before anything depends on it, so every `HuntDamage` produced from here on already means "rounded, applicable damage". The boundary is safe because rounding is the identity on every existing assertion in `scoring.test.ts` — all three of its `damage` expectations multiply even card-value sums in the ×0.5 bands — so the suite stays green and the codebase stays internally consistent with no new exports yet.

### Task 1: Apply `roundDamage` inside `scoreHunt` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts:1-9,13-23,43-49`
- Test: `src/warCouncil/__tests__/scoring.test.ts`

- [x] **Step 1: Write the failing test for a genuinely fractional product**

Append to `src/warCouncil/__tests__/scoring.test.ts`. The fixture is 19 cards of rank 6 plus one of rank 5 — card value 119, odd — at `k=10`, which is Greedy ×0.5 on the Win table, so the raw product is `59.5`:

```ts
describe('scoreHunt — the ×0.5 bands cannot produce a fractional damage value (DLR-68 AC4)', () => {
  it('rounds an odd card sum in a ×0.5 band through roundDamage, at one point', () => {
    // 19 × rank 6 + 1 × rank 5 = 119, deliberately odd. k=10 is Greedy (×0.5) on the
    // Win table, so the raw product is 59.5 — the exact case AC4 exists to forbid
    // reaching a health bar.
    const odd: Card[] = [
      ...Array.from({ length: 19 }, () => ({ suit: Suit.Bells, rank: 6 })),
      { suit: Suit.Bells, rank: 5 },
    ]
    const state = huntState({ player: odd, cpu: [] }, { player: 10, cpu: 3 })

    const result = scoreHunt(state, PlayerSide.Player)

    expect(result.spoils).toBe(119)
    expect(result.standing).toBe(resolveStanding(10, winTable).multiplier)
    expect(result.damage).toBe(60)
    expect(Number.isInteger(result.damage)).toBe(true)
  })
})
```

- [x] **Step 2: Confirm the test fails for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: exits non-zero; the new test fails with `expected 59.5 to be 60`. Every other test in the file passes. A failure reporting `Transform failed` or `Failed to load` instead is a TypeScript error in the spec, not a red test — fix it before continuing.

- [x] **Step 3: Import `roundDamage` and wrap the product**

In `src/warCouncil/scoring.ts`, add `roundDamage` to the existing `../hunt` import (alphabetically, after `resolveStanding`):

```ts
import {
  cardValueFor,
  resolveStanding,
  roundDamage,
  standingTableFor,
  type Damage,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
```

Then change the returned `damage` field — this is AC4's single point, and the only place in the project where a raw product becomes damage:

```ts
  return {
    spoils: spoilsValue,
    tricks,
    band,
    standing: band.multiplier,
    // AC4's single rounding point. Every `HuntDamage` in the program therefore means
    // rounded, applicable damage — including the ones `huntDamage` returns, which call
    // through here rather than rounding again.
    damage: roundDamage(spoilsValue * band.multiplier),
  }
```

- [x] **Step 4: Correct the `HuntDamage` docblock's withdrawn claim**

`src/warCouncil/scoring.ts:13-23` currently states that DLR-68 renames `spoils` to `cardValue`. It does not — the developer withdrew that rename on 2026-08-12. Replace the docblock so it stops describing work that will not happen:

```ts
/** One side's finished Hunt — every field derived once from a final `RoundState`, never
 *  accumulated per trick. Renamed from `HuntScore` on DLR-67: the product is damage to the
 *  other side, not a score checked against a target.
 *
 *  `spoils` is deliberately NOT renamed to `cardValue`. DLR-68 AC1 asked for that rename and
 *  the developer withdrew it (2026-08-12): the three read sites are in `.tsx` files that
 *  ticket may not touch, so renaming would have failed its own typecheck gate or breached its
 *  own scope boundary. `hybrid-design.md` §1 retires "Spoils" as a design term; the code and
 *  the on-screen copy keep it for the prototype. See `.claude/contract/DLR-68-two-sided-damage/plan.md`. */
```

- [x] **Step 5: Confirm the new test passes and nothing else moved**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed and every test in the file passing; `npm run typecheck` exits 0 with no errors. The pre-existing `k=0…13` suite, the injectable-table suite and the Greedy-cap suite must all still pass unchanged — rounding is the identity on all of them.

---

## Phase 2 — The entry point, its vocabulary, and the direction

Adds the rejection vocabulary, the outcome type, and `huntDamage` itself, then exposes them through the barrel. The boundary is safe at each task: Task 2 adds only exported declarations (no caller, no behaviour), Task 3 adds the function with its full guard set and tests, and Task 4 is a barrel-only change verified by typecheck. Nothing outside `src/warCouncil/` is touched at any point.

### Task 2: Add the rejection vocabulary and the outcome type ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts` — append after the `HuntDamage` interface

- [x] **Step 1: Add `HuntNotScorable`, `HuntNotScorableError` and `HuntOutcome`**

Insert after the `HuntDamage` interface in `src/warCouncil/scoring.ts`. The reason-code map copies `DeclareRejection`'s shape (`declareHunt.ts:4-8`) exactly. **`erasableSyntaxOnly` is on** in `tsconfig.app.json:23`, so `reason` must be declared as a field and assigned in the body — a constructor parameter property will not compile:

```ts
/**
 * Why a Hunt cannot be scored. A closed set, shaped like `DeclareRejection`
 * (declareHunt.ts:4-8) and `IllegalMoveReason` (types.ts:124-135), so a test can assert
 * WHICH guard fired without matching a message string.
 */
export const HuntNotScorable = {
  Unfinished: 'unfinished',
  Undeclared: 'undeclared',
} as const
export type HuntNotScorable = (typeof HuntNotScorable)[keyof typeof HuntNotScorable]

/**
 * AC5 requires a throw rather than a zero: a `damage: 0` return is indistinguishable from a
 * legitimately scoreless Hunt and would be applied to a health bar as authorised damage.
 *
 * The first `Error` subclass in `src/` — a deliberate deviation from the three bare
 * `RangeError` throws in src/hunt/config.ts, taken because AC5 distinguishes three failure
 * modes and a result union would let a caller ignore the failure entirely. Approved at the
 * DLR-68 plan gate.
 *
 * `reason` is declared and assigned rather than written as a constructor parameter property:
 * `erasableSyntaxOnly` is on and forbids that form.
 */
export class HuntNotScorableError extends Error {
  readonly reason: HuntNotScorable

  constructor(reason: HuntNotScorable, message: string) {
    super(message)
    this.name = 'HuntNotScorableError'
    this.reason = reason
  }
}

/**
 * Both sides' damage for one finished Hunt (AC1).
 *
 * `incoming` is keyed by the side the damage is APPLIED TO, never by the side that dealt it
 * (AC3) — `incoming[PlayerSide.Player]` is what the Quarry dealt and what depletes the
 * player's health. The crossing is performed once, in `huntDamage`, so no consumer has to
 * remember to invert. A dealer-keyed record was rejected for exactly that reason: the first
 * caller that forgot would subtract the player's own damage from the player's own health, and
 * it would type-check and produce plausible numbers indefinitely.
 */
export interface HuntOutcome {
  /** The one declaration BOTH sides were scored under (AC2). */
  readonly declaration: HuntDeclaration
  readonly incoming: Readonly<Record<PlayerSide, HuntDamage>>
}
```

- [x] **Step 2: Widen the imports these declarations need**

`HuntOutcome` needs the `HuntDeclaration` type from `../hunt`, and `PlayerSide` is currently imported into this file as a **type only** — the next task needs it as a value. Change both import statements:

```ts
import {
  cardValueFor,
  resolveStanding,
  roundDamage,
  standingTableFor,
  type Damage,
  type HuntDeclaration,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
import { spoils } from './spoils'
import {
  declaredPath,
  otherSide,
  PlayerSide,
  RoundPhase,
  TRICKS_PER_ROUND,
  type RoundState,
} from './types'
```

- [x] **Step 3: Typecheck and lint the new declarations**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `otherSide`, `RoundPhase` and `TRICKS_PER_ROUND` are imported but unused until Task 3 — if `npm run lint` reports `no-unused-vars` on them, add them in Task 3's step instead of disabling the rule, and re-run.

Confirmed as anticipated: at this point in isolation, `npm run typecheck` and `npm run lint` both reported the three names as unused (`otherSide`, `RoundPhase`, `TRICKS_PER_ROUND`). Not disabled — Task 3 below consumes all three inside `huntDamage`, and the combined re-run after Task 3 landed exits 0 for both commands (confirmed at Task 3 Step 4 and again at Task 4 Step 2).

### Task 3: Add `huntDamage` with both guards and the direction crossing ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts` — append after `scoreHunt`
- Test: `src/warCouncil/__tests__/scoring.test.ts`

- [x] **Step 1: Write the failing tests for the guards, the direction, and AC2**

Append to `src/warCouncil/__tests__/scoring.test.ts`, and extend its import line to pull in the new names plus `RoundPhase` and `HuntNotScorable` / `HuntNotScorableError`:

```ts
// Extends the file's existing imports:
//   from '../scoring':  scoreHunt, huntDamage, HuntNotScorable, HuntNotScorableError
//   from '../types':    (RoundPhase is already imported)

/** A finished, declared Hunt built on the file's existing `huntState` helper. */
function finished(state: RoundState, path: HuntDeclaration): RoundState {
  return { ...state, phase: RoundPhase.Complete, tricksPlayed: 13, declaration: { path } }
}

/** `count` cards of rank 6 — the fixed point of the Lose inversion (12 − 6 = 6), so the same
 *  pile is worth the same under BOTH value schemes. §8's frame is average rank 6. */
function averageCards(count: number): Card[] {
  return Array.from({ length: count }, () => ({ suit: Suit.Bells, rank: 6 }))
}

describe('huntDamage — refuses rather than returning zero (AC5)', () => {
  it('throws Unfinished on a Hunt that has not reached the thirteenth trick', () => {
    const state = { ...huntState({ player: [], cpu: [] }, { player: 4, cpu: 5 }), declaration: { path: HuntDeclaration.Win } }
    expect(() => huntDamage(state)).toThrow(HuntNotScorableError)
    try {
      huntDamage(state)
      expect.unreachable('huntDamage must throw on an unfinished Hunt')
    } catch (error) {
      expect((error as HuntNotScorableError).reason).toBe(HuntNotScorable.Unfinished)
    }
  })

  it('throws Undeclared on a finished Hunt that was never declared', () => {
    const state = { ...huntState({ player: [], cpu: [] }, { player: 7, cpu: 6 }), phase: RoundPhase.Complete, tricksPlayed: 13 }
    expect(() => huntDamage(state)).toThrow(HuntNotScorableError)
    try {
      huntDamage(state)
      expect.unreachable('huntDamage must throw on an undeclared Hunt')
    } catch (error) {
      expect((error as HuntNotScorableError).reason).toBe(HuntNotScorable.Undeclared)
    }
  })

  it('lets resolveStanding’s RangeError surface on a corrupt trick count rather than scoring 0', () => {
    // Legitimately Complete and declared, but the per-side count is nonsense. The guards must
    // NOT absorb this — it has to reach resolveStanding.
    const state = finished(huntState({ player: averageCards(4), cpu: [] }, { player: 14, cpu: 0 }), HuntDeclaration.Win)
    expect(() => huntDamage(state)).toThrow(RangeError)
    expect(() => huntDamage(state)).not.toThrow(HuntNotScorableError)
  })
})

describe('huntDamage — each side’s damage lands on the OTHER side (AC3)', () => {
  it('keys incoming by the side depleted, proven with asymmetric trick counts', () => {
    // Deliberately asymmetric: player 9 / Quarry 4. A symmetric fixture would pass under
    // either keying and prove nothing.
    const state = finished(
      huntState({ player: averageCards(18), cpu: averageCards(8) }, { player: 9, cpu: 4 }),
      HuntDeclaration.Win,
    )
    const outcome = huntDamage(state)

    // The player's 9 tricks (108 × ×5) deplete the QUARRY.
    expect(outcome.incoming[PlayerSide.Cpu].tricks).toBe(9)
    expect(outcome.incoming[PlayerSide.Cpu].damage).toBe(540)

    // The Quarry's 4 tricks (48 × ×2) deplete the PLAYER.
    expect(outcome.incoming[PlayerSide.Player].tricks).toBe(4)
    expect(outcome.incoming[PlayerSide.Player].damage).toBe(96)
  })
})

describe('huntDamage — both sides read the player’s one declaration (AC2)', () => {
  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    'scores both seats off standingTableFor(%s), never a per-side table',
    (path) => {
      const state = finished(
        huntState({ player: averageCards(12), cpu: averageCards(14) }, { player: 6, cpu: 7 }),
        path,
      )
      const outcome = huntDamage(state)
      const table = standingTableFor(path)

      expect(outcome.declaration).toBe(path)
      expect(outcome.incoming[PlayerSide.Cpu].standing).toBe(resolveStanding(6, table).multiplier)
      expect(outcome.incoming[PlayerSide.Player].standing).toBe(resolveStanding(7, table).multiplier)
    },
  )

  it('cannot represent a Quarry declaration at all — DeclarationState has no side key', () => {
    // The structural half of AC2, asserted rather than asserted-about: the declaration is one
    // object on RoundState with a single `path` field (types.ts:65-67), so "the Quarry declared
    // something else" is not a state this engine can express. hybrid-design.md lines 67-72
    // proves why that is a rule and not a missing symmetry.
    const state = finished(huntState({ player: averageCards(2), cpu: averageCards(24) }, { player: 1, cpu: 12 }), HuntDeclaration.Lose)
    expect(Object.keys(state.declaration ?? {})).toEqual(['path'])
  })
})
```

- [x] **Step 2: Confirm the tests fail because `huntDamage` does not exist yet**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: exits non-zero. The failure is a transform/collection error naming `huntDamage` as not exported from `../scoring` — that is the expected red state for this step, since the function is written next. Every test added in Phase 1 still passes once Step 3 lands.

Confirmed: 6 failed / 21 passed. The 6 failures were all `TypeError: huntDamage is not a function` (or the `toThrow` wrapper around it) — not a transform/collection error, since `huntDamage` was already a valid (if absent) import name at that point. All 21 pre-existing tests passed unchanged.

- [x] **Step 3: Write `huntDamage`**

Append to `src/warCouncil/scoring.ts`, after `scoreHunt`:

```ts
/**
 * AC1's entry point: both sides' damage for one finished Hunt, computed once from a final
 * `RoundState` and never accumulated per trick.
 *
 * The declaration is read straight off `state.declaration` and NOT through `declaredPath`.
 * That helper defaults an undeclared round to Win so the mid-round readouts have a table to
 * display before the player declares — correct for a readout, and wrong here: routed through
 * it, an undeclared Hunt would score cleanly off the Win table and deal real damage no rule
 * authorised. AC5 requires a refusal instead.
 *
 * Both terms are resolved ONCE and handed to both seats, which is AC2 made structural: there
 * is one declaration, it is read once, and the Quarry reading a different table is not a bug
 * that could occur and be caught but a state the code cannot express (hybrid-design.md lines
 * 67-72 for why that is load-bearing).
 */
export function huntDamage(finalState: RoundState): HuntOutcome {
  if (finalState.phase !== RoundPhase.Complete) {
    throw new HuntNotScorableError(
      HuntNotScorable.Unfinished,
      `Cannot compute damage for a Hunt in phase "${finalState.phase}": damage is read off the final trick count, so no total exists until all ${TRICKS_PER_ROUND} tricks have resolved`,
    )
  }

  const declaration = finalState.declaration?.path
  if (declaration === undefined) {
    throw new HuntNotScorableError(
      HuntNotScorable.Undeclared,
      'Cannot compute damage for an undeclared Hunt: both sides read the value scheme and multiplier table of the declared path, and no default is authorised by any rule',
    )
  }

  const cardValue = cardValueFor(declaration)
  const standingTable = standingTableFor(declaration)

  // Keyed by the side that DEALT it. Crossed below — never returned in this form.
  const dealt: Readonly<Record<PlayerSide, HuntDamage>> = {
    [PlayerSide.Player]: scoreHunt(finalState, PlayerSide.Player, cardValue, standingTable),
    [PlayerSide.Cpu]: scoreHunt(finalState, PlayerSide.Cpu, cardValue, standingTable),
  }

  return {
    declaration,
    // AC3, performed once, here. `otherSide` states the rule in the code: the damage that
    // depletes a side is the damage the OTHER side dealt.
    incoming: {
      [PlayerSide.Player]: dealt[otherSide(PlayerSide.Player)],
      [PlayerSide.Cpu]: dealt[otherSide(PlayerSide.Cpu)],
    },
  }
}
```

- [x] **Step 4: Confirm the guards, the direction and AC2 all pass**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `npm run typecheck` exits 0.

Confirmed: `Test Files 1 passed (1)`, `Tests 27 passed (27)`; `npm run typecheck` exits 0.

### Task 4: Export the new surface from the barrel ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts:26-27`

- [x] **Step 1: Add the four new names alongside the existing scoring exports**

Replace lines 26-27 of `src/warCouncil/index.ts`:

```ts
export { huntDamage, HuntNotScorable, HuntNotScorableError, scoreHunt } from './scoring'
export type { HuntDamage, HuntOutcome } from './scoring'
```

- [x] **Step 2: Typecheck and lint the barrel**

Run: `npm run typecheck; npm run lint`
Expected: both exit 0. `scoreHunt` and `HuntDamage` keep their existing names, so the three consumers in `src/app/warCouncil/` continue to resolve with no change.

Confirmed: both exit 0.

---

## Phase 3 — Agreement with the design document

Adds the spec that pins the engine against `hybrid-design.md` §8 and the derived antisymmetry property, then corrects two docblocks that point at the wrong ticket. Split from Phase 2 deliberately: Phase 2 asks "does the function behave", this phase asks "does config still agree with the design doc" — a different question with a different failure meaning. The boundary is safe because this phase adds one new spec file and changes only comments in existing ones.

### Task 5: Enumerate the fourteen splits under both declarations, and the antisymmetry property ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/warCouncil/__tests__/huntEnumeration.test.ts`
- Test: `src/warCouncil/__tests__/huntEnumeration.test.ts`

- [x] **Step 1: Write the enumeration spec**

Create `src/warCouncil/__tests__/huntEnumeration.test.ts`. It imports from the **barrel** (`'..'`) rather than from `'../scoring'`, which exercises Task 4's exports as a side effect:

```ts
import { describe, expect, it } from 'vitest'
import { huntDamage, PlayerSide, TRICKS_PER_ROUND, type Card, type RoundState } from '..'
import { RoundPhase, Suit } from '../types'
import { HuntDeclaration, standingTableFor } from '../../hunt'

// §8's frame is "printed rank, average rank 6 — a trick's two cards worth roughly 12 between
// them" (hybrid-design.md:996-999). Rank 6 is also the fixed point of the Lose inversion
// (12 − 6 = 6), so one pile of rank-6 cards is worth the same under BOTH value schemes —
// which is what lets `huntDamage(finalState)`, whose signature takes only a state, be checked
// against the design table with no injected value function.
const AVERAGE_RANK = 6

function averageCards(count: number): Card[] {
  return Array.from({ length: count }, () => ({ suit: Suit.Bells, rank: AVERAGE_RANK }))
}

/** A finished, declared Hunt in which the player won `k` of the thirteen tricks. */
function finishedHunt(k: number, path: HuntDeclaration): RoundState {
  const quarryTricks = TRICKS_PER_ROUND - k
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: Suit.Bells, rank: 2 },
    trumpSuit: Suit.Bells,
    tricksWon: { player: k, cpu: quarryTricks },
    capturedCards: { player: averageCards(2 * k), cpu: averageCards(2 * quarryTricks) },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: TRICKS_PER_ROUND,
    phase: RoundPhase.Complete,
    declaration: { path },
  }
}

/** `[k, damage the player deals, damage the Quarry deals]`. */
type Split = readonly [number, number, number]

// TRANSCRIBED from hybrid-design.md §8, lines 1003-1016, Win column — all fourteen rows.
// Frozen on purpose: if src/hunt/config.ts's tables are retuned, these fail, which is the
// point. They are products the design document publishes, not multipliers.
const WIN_SPLITS: readonly Split[] = [
  [0, 0, 78],
  [1, 12, 72],
  [2, 24, 66],
  [3, 36, 60],
  [4, 96, 540],
  [5, 180, 480],
  [6, 288, 420],
  [7, 420, 288],
  [8, 480, 180],
  [9, 540, 96],
  [10, 60, 36],
  [11, 66, 24],
  [12, 72, 12],
  [13, 78, 0],
]

// INTERIM — own-pile valuation, and deliberately NOT §8's Lose column. §8 assumes the pile
// swap: on the Lose path each side is paid for the cards the OTHER side captured, which is
// DLR-69's work. §8 line 1003 publishes 78/0 at k=0; own-pile gives 0/156, and the sign of
// the whole column inverts once the swap lands. DLR-68 AC7 names this handover explicitly so
// it is discovered here rather than in review. DLR-69 replaces this array with §8's column.
const LOSE_SPLITS_OWN_PILE: readonly Split[] = [
  [0, 0, 156],
  [1, 6, 144],
  [2, 12, 132],
  [3, 18, 120],
  [4, 240, 216],
  [5, 300, 288],
  [6, 360, 336],
  [7, 336, 360],
  [8, 288, 300],
  [9, 216, 240],
  [10, 120, 18],
  [11, 132, 12],
  [12, 144, 6],
  [13, 156, 0],
]

describe.each([
  ['Win (§8 in full)', HuntDeclaration.Win, WIN_SPLITS],
  ['Lose (interim own-pile)', HuntDeclaration.Lose, LOSE_SPLITS_OWN_PILE],
])('huntDamage — the fourteen splits at average card values, %s (AC7)', (_label, path, splits) => {
  it.each(splits)(
    'k=%i: the player deals %i and takes %i',
    (k, playerDeals, quarryDeals) => {
      const outcome = huntDamage(finishedHunt(k, path))

      expect(outcome.declaration).toBe(path)
      // incoming is keyed by the side DEPLETED, so what the player dealt is the Quarry's entry.
      expect(outcome.incoming[PlayerSide.Cpu].damage).toBe(playerDeals)
      expect(outcome.incoming[PlayerSide.Player].damage).toBe(quarryDeals)
      // Every figure in both tables is an integer, so roundDamage is the identity here —
      // this spec is not covertly testing AC4.
      expect(Number.isInteger(outcome.incoming[PlayerSide.Cpu].damage)).toBe(true)
      expect(Number.isInteger(outcome.incoming[PlayerSide.Player].damage)).toBe(true)
    },
  )
})

describe.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
  'huntDamage — Net(k) = −Net(13 − k) over the configured table pair, %s (AC6)',
  (path) => {
    // DERIVED, not transcribed: nothing here names a multiplier or a damage total, so this
    // property survives any table pair the developer swaps into src/hunt/config.ts. It is the
    // complement of the enumeration above — that one is a canary, this one is a property.
    const net = (k: number): number => {
      const outcome = huntDamage(finishedHunt(k, path))
      return outcome.incoming[PlayerSide.Cpu].damage - outcome.incoming[PlayerSide.Player].damage
    }

    // k = 0…6 covers all seven mirror pairs of a thirteen-trick round (0↔13 … 6↔7).
    it.each([0, 1, 2, 3, 4, 5, 6])('the net at k=%i is the exact negative of its mirror', (k) => {
      expect(net(k)).toBe(-net(TRICKS_PER_ROUND - k))
    })

    it('reads a real configured table, not an empty one', () => {
      // Guards the property above from passing vacuously if the table pair were ever emptied.
      expect(standingTableFor(path).length).toBeGreaterThan(0)
    })
  },
)
```

- [x] **Step 2: Run the new spec**

Run: `npx vitest run src/warCouncil/__tests__/huntEnumeration.test.ts`
Expected: exits 0, Vitest reports 0 failed and **44 passed** — 28 enumeration rows (14 × 2 declarations), 14 antisymmetry cases (7 × 2), and 2 non-vacuity checks. A failure in the Win column means `src/hunt/config.ts` and `hybrid-design.md` §8 have diverged and is a real finding, not a broken test; report it rather than adjusting the fixture.

Confirmed: `Test Files 1 passed (1)`, `Tests 44 passed (44)`. No divergence between `src/hunt/config.ts` and `hybrid-design.md` §8.

- [x] **Step 3: Measure the new file against the 400-line budget**

Run: `(Get-Content src\warCouncil\__tests__\huntEnumeration.test.ts).Count`
Expected: under 200. Use `.Count` and **not** `(… | Measure-Object -Line).Lines` — the latter drops blank lines and undercounts, which hid a real 400-line breach on DLR-63.

Confirmed: 123 lines.

### Task 6: Correct two docblocks that name the wrong ticket ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/spoils.ts:9-14`
- Modify: `src/warCouncil/types.ts:102-110`

- [x] **Step 1: Point `spoils`'s docblock at DLR-69, which actually owns the pile swap**

`src/warCouncil/spoils.ts:11-13` currently reads *"DLR-68's pile swap replaces this own-pile reading"*. The pile swap is DLR-69 (`.claude/contract/DLR-65-epic-breakdown/tasks.md:167`), and DLR-68 explicitly puts it out of scope. Replace that sentence:

```ts
 * ONE branch, deliberately. DLR-63's Lose branch summed a capped pool of credited cards from
 * the Quarry's pile; DLR-67 retires that mechanic, and DLR-69's pile swap replaces this
 * own-pile reading with the uncapped two-way swap §1 specifies. **This is a chosen interim,
 * not an accident** — until DLR-69 lands, both sides are simply paid for what they captured,
 * which is why `__tests__/huntEnumeration.test.ts` asserts §8's Win column in full but an
 * own-pile Lose column (DLR-68 AC7).
```

- [x] **Step 2: Record on `declaredPath` that `huntDamage` deliberately does not use it**

Append to the `declaredPath` docblock at `src/warCouncil/types.ts:102-107`, keeping the existing text above it:

```ts
 * NOT the path `huntDamage` takes. Its undeclared-reads-as-Win default is right for a readout
 * and wrong for scoring — routed through here, an undeclared Hunt would score cleanly off the
 * Win table and deal damage no rule authorised. `huntDamage` reads `state.declaration`
 * directly and throws `HuntNotScorableError` instead (DLR-68 AC5).
 */
```

- [x] **Step 3: Confirm the comment-only edits changed nothing else**

Run: `npm run typecheck; npx vitest run --project node`
Expected: typecheck exits 0; the whole `node` project passes with 0 failed. Both edits are inside block comments, so any test movement here means a docblock terminator was broken — check the `*/` on both files.

Confirmed: typecheck exits 0. `node` project: `Test Files 26 passed (26)`, `Tests 500 passed (500)`.

---

## Phase 4 — The Standing track

Added by the developer's scope widening on 2026-08-12. Builds the top bar's Standing track: a pure geometry helper, the component over it, the stylesheet rules, and the plumbing that feeds the configured table down from `WarCouncilRound`. Layout and interaction per `mockup.html` in this plan folder. The phase is ordered helper → component → wiring → CSS so that each task type-checks on its own; the codebase is only visually complete at the end of Task 15, but it compiles and passes at every task boundary before that.

### Task 7: Add the pure segment-geometry helper ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/standingSegments.ts`
- Test: `src/app/warCouncil/__tests__/standingSegments.test.ts`

- [x] **Step 1: Write the failing tests for spans, heights, peak/cliff, the pip index, and both error paths**

Create `src/app/warCouncil/__tests__/standingSegments.test.ts`. Every expectation derives from `standingTableFor(...)` — no multiplier or boundary is written as a literal:

```ts
import { describe, expect, it } from 'vitest'
import { standingSegments } from '../standingSegments'
import { HuntDeclaration, standingTableFor, type StandingBand } from '../../../hunt'

const winTable = standingTableFor(HuntDeclaration.Win)

describe('standingSegments — geometry derived from the configured table', () => {
  it('gives every configured row one segment, spanning its trick range', () => {
    const segments = standingSegments(winTable, 0)
    expect(segments).toHaveLength(winTable.length)
    segments.forEach((segment, i) => {
      expect(segment.span).toBe(winTable[i].maxTricks - winTable[i].minTricks + 1)
    })
    // The spans must tile 0..13 exactly — 14 positions, no gap and no overlap.
    expect(segments.reduce((total, s) => total + s.span, 0)).toBe(14)
  })

  it('scales height against the table’s largest multiplier, so the peak is 100%', () => {
    const top = Math.max(...winTable.map((b) => b.multiplier))
    const segments = standingSegments(winTable, 0)
    segments.forEach((segment, i) => {
      expect(segment.heightPct).toBeCloseTo((winTable[i].multiplier / top) * 100)
    })
    expect(segments.some((s) => s.heightPct === 100)).toBe(true)
  })

  it('marks peak and cliff from the table’s own extremes, not from a band name', () => {
    const mults = winTable.map((b) => b.multiplier)
    const segments = standingSegments(winTable, 0)
    segments.forEach((segment, i) => {
      expect(segment.isPeak).toBe(winTable[i].multiplier === Math.max(...mults))
      expect(segment.isCliff).toBe(winTable[i].multiplier === Math.min(...mults))
    })
  })

  it.each([0, 3, 4, 7, 9, 13])('puts the current pip at the right index within its bracket (k=%i)', (k) => {
    const segments = standingSegments(winTable, k)
    const current = segments.filter((s) => s.isCurrent)
    expect(current).toHaveLength(1)
    expect(current[0].band.minTricks).toBeLessThanOrEqual(k)
    expect(current[0].band.maxTricks).toBeGreaterThanOrEqual(k)
    expect(current[0].currentPipIndex).toBe(k - current[0].band.minTricks)
    segments.filter((s) => !s.isCurrent).forEach((s) => expect(s.currentPipIndex).toBeNull())
  })

  it('renders with no marker rather than throwing on an out-of-range trick count', () => {
    // A readout drawn every render must not blank the screen. This is deliberately the
    // OPPOSITE posture from huntDamage, which throws — that commits damage, this displays.
    const segments = standingSegments(winTable, 99)
    expect(segments).toHaveLength(winTable.length)
    expect(segments.every((s) => !s.isCurrent && s.currentPipIndex === null)).toBe(true)
  })

  it('throws on an empty table rather than dividing by −Infinity into NaN', () => {
    const empty: readonly StandingBand[] = []
    expect(() => standingSegments(empty, 0)).toThrow(RangeError)
  })
})
```

- [x] **Step 2: Confirm the tests fail because the helper does not exist**

Run: `npx vitest run src/app/warCouncil/__tests__/standingSegments.test.ts`
Expected: exits non-zero with a transform/collection error naming `../standingSegments` as unresolvable. That is the expected red state.

- [x] **Step 3: Write the helper**

Create `src/app/warCouncil/standingSegments.ts`:

```ts
import type { StandingBand } from '../../hunt'

/** One bracket of the configured table, prepared for rendering. */
export interface TrackSegment {
  readonly band: StandingBand
  /** `maxTricks − minTricks + 1` — the segment's flex-grow, making the x-axis trick count. */
  readonly span: number
  /** The multiplier as a percentage of the table's largest. The minimum-height floor that
   *  keeps a ×0.5 bar visible is applied in CSS, so no visual value lives here. */
  readonly heightPct: number
  readonly isPeak: boolean
  readonly isCliff: boolean
  readonly isCurrent: boolean
  /** 0-based index of the current trick's pip within this segment, or `null` if not here. */
  readonly currentPipIndex: number | null
}

/**
 * Turns the configured Standing table into renderable geometry. Writes no multiplier and no
 * band boundary of its own: spans come from each row's own trick range, heights from the
 * multiplier ratio, and peak/cliff from the table's extremes — so retuning
 * `src/hunt/config.ts` redraws the track, including at a different row count.
 *
 * An out-of-range `tricks` yields no current segment rather than throwing: this is a readout
 * drawn on every render, including before the first trick, and a throw here would blank the
 * screen. That is deliberately the opposite of `huntDamage`, which throws because it commits
 * damage. An EMPTY table does throw — `Math.max()` of nothing is `-Infinity`, and dividing by
 * it yields a `NaN` height that collapses every bar with nothing logged anywhere.
 */
export function standingSegments(
  table: readonly StandingBand[],
  tricks: number,
): readonly TrackSegment[] {
  if (table.length === 0) {
    throw new RangeError('Cannot build a Standing track from an empty multiplier table')
  }

  const multipliers = table.map((band) => band.multiplier)
  const top = Math.max(...multipliers)
  const low = Math.min(...multipliers)

  return table.map((band) => {
    const isCurrent = tricks >= band.minTricks && tricks <= band.maxTricks
    return {
      band,
      span: band.maxTricks - band.minTricks + 1,
      heightPct: (band.multiplier / top) * 100,
      isPeak: band.multiplier === top,
      isCliff: band.multiplier === low,
      isCurrent,
      currentPipIndex: isCurrent ? tricks - band.minTricks : null,
    }
  })
}
```

- [x] **Step 4: Confirm the helper passes and type-checks**

Run: `npx vitest run src/app/warCouncil/__tests__/standingSegments.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 8: Build the `StandingTrack` component ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/StandingTrack.tsx`
- Modify: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/StandingTrack.test.tsx`

- [x] **Step 1: Add the group label to `labels.ts`**

Display copy for this module already lives in `labels.ts` (`STANDING_BAND_NAME`), so the track's label goes there rather than inline:

```ts
export const STANDING_TRACK_LABEL = 'Standing track'
```

- [x] **Step 2: Write the component**

Create `src/app/warCouncil/StandingTrack.tsx`. Structure and class names per `mockup.html` in this plan folder — segments proportional to span, height carrying the multiplier, pips nested **inside** each segment:

```tsx
import type { StandingBand } from '../../hunt'
import { STANDING_BAND_NAME, STANDING_TRACK_LABEL } from './labels'
import { standingSegments } from './standingSegments'

interface StandingTrackProps {
  readonly table: readonly StandingBand[]
  readonly tricks: number
}

/**
 * The configured Standing table as a profile: the x-axis is trick count, so each bracket is
 * as wide as its trick span, and height is the multiplier — the ramp and the cliff are shapes
 * rather than six numerals to compare. Value reads through height first, so the design holds
 * without colour (`game-ux`) and needs no new colour token (`warCouncilHunt.css` header).
 *
 * Each bracket carries one pip per trick it covers, because in a flat bracket — 0-3 and 10-13
 * — the multiplier never moves while card value climbs, so the bar alone cannot say which of
 * those tricks you are on. The pips are nested inside their segment rather than laid across
 * the track as one row: the segment row's flex gaps and a track-wide pip row's gaps do not
 * divide the same width, so a shared row drifts out of register with the bracket edges.
 *
 * Renders no marker at all when `tricks` sits outside every bracket — see `standingSegments`.
 */
export default function StandingTrack({ table, tricks }: StandingTrackProps) {
  const segments = standingSegments(table, tricks)
  const current = segments.find((segment) => segment.isCurrent)

  return (
    <div className="wc-track" role="group" aria-label={STANDING_TRACK_LABEL}>
      {segments.map((segment) => (
        <span
          key={segment.band.minTricks}
          className={
            'wc-track-seg' +
            (segment.isPeak ? ' wc-is-peak' : '') +
            (segment.isCliff ? ' wc-is-cliff' : '') +
            (segment.isCurrent ? ' wc-is-current' : '')
          }
          style={{ flexGrow: segment.span, flexBasis: 0, height: `${segment.heightPct}%` }}
        >
          <span className="wc-track-mult" aria-hidden="true">
            ×{segment.band.multiplier}
          </span>
          <span className="wc-track-pips" aria-hidden="true">
            {Array.from({ length: segment.span }, (_, pip) => (
              <span
                key={pip}
                className={'wc-track-pip' + (segment.currentPipIndex === pip ? ' wc-is-here' : '')}
              />
            ))}
          </span>
        </span>
      ))}

      <span className="wc-track-ticks" aria-hidden="true">
        {segments.map((segment) => (
          <span
            key={segment.band.minTricks}
            className="wc-track-tick"
            style={{ flexGrow: segment.span, flexBasis: 0 }}
          >
            {segment.band.minTricks === segment.band.maxTricks
              ? segment.band.minTricks
              : `${segment.band.minTricks}-${segment.band.maxTricks}`}
          </span>
        ))}
      </span>

      {/* The accessible equivalent of the compact cell this replaces. Its wording differs from
          that cell's on purpose: jsdom applies no CSS, so both are in the accessibility tree
          during a component test and identical labels would make a label query match twice. */}
      <span className="wc-sr-only">
        {current
          ? `${STANDING_TRACK_LABEL}: ${STANDING_BAND_NAME[current.band.name]}, multiplier ${current.band.multiplier}, at ${tricks} tricks won`
          : `${STANDING_TRACK_LABEL}: no band for ${tricks} tricks won`}
      </span>
    </div>
  )
}
```

- [x] **Step 3: Write the component test** (added `afterEach(cleanup)`, not in the task's literal listing — see Implementer Report; without it, DOM elements accumulate across `it()` blocks in this file and the fourth test fails with "Found multiple elements")

Create `src/app/warCouncil/__tests__/StandingTrack.test.tsx`. Queries go by accessible role and label per `react-frontend`; this asserts only what is genuinely presentational, since the geometry is already covered in Task 12:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StandingTrack from '../StandingTrack'
import { HuntDeclaration, standingTableFor } from '../../../hunt'

const winTable = standingTableFor(HuntDeclaration.Win)

describe('StandingTrack', () => {
  it('names the current band, its multiplier, and the trick count', () => {
    render(<StandingTrack table={winTable} tricks={8} />)
    // k=8 is Victorious ×5 on the Win table — read from config, not asserted as a literal.
    const band = winTable.find((b) => 8 >= b.minTricks && 8 <= b.maxTricks)
    expect(
      screen.getByText(new RegExp(`multiplier ${band?.multiplier}, at 8 tricks won`)),
    ).toBeDefined()
  })

  it('renders one segment per configured row and one pip per trick', () => {
    const { container } = render(<StandingTrack table={winTable} tricks={0} />)
    expect(container.querySelectorAll('.wc-track-seg')).toHaveLength(winTable.length)
    // The pips tile 0..13 — 14 positions across the whole track.
    expect(container.querySelectorAll('.wc-track-pip')).toHaveLength(14)
    expect(container.querySelectorAll('.wc-track-pip.wc-is-here')).toHaveLength(1)
  })

  it('marks exactly one segment current, and none when the trick count is out of range', () => {
    const { container, unmount } = render(<StandingTrack table={winTable} tricks={5} />)
    expect(container.querySelectorAll('.wc-track-seg.wc-is-current')).toHaveLength(1)
    unmount()

    const out = render(<StandingTrack table={winTable} tricks={99} />)
    expect(out.container.querySelectorAll('.wc-track-seg.wc-is-current')).toHaveLength(0)
    expect(out.container.querySelectorAll('.wc-track-pip.wc-is-here')).toHaveLength(0)
  })

  it('is labelled as a group so the track is reachable as one thing', () => {
    render(<StandingTrack table={winTable} tricks={3} />)
    expect(screen.getByRole('group', { name: 'Standing track' })).toBeDefined()
  })
})
```

- [x] **Step 4: Run the component spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/StandingTrack.test.tsx; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0. This is a `.test.tsx` file, so it runs in the `dom` project — a `Timeout waiting for worker to respond` on a cold cache is a worker-start timeout, not a failure; re-run once.

### Task 9: Thread the configured table down to the ledger ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/HuntLedger.tsx:1-18,35-45`
- Modify: `src/app/warCouncil/RoundStatusBand.tsx:1-14,61`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:188-192`
- Test: `src/app/warCouncil/__tests__/HuntLedger.test.tsx`

- [x] **Step 1: Mount the track in `HuntLedger`, keeping the compact cell as the fallback**

`HuntLedger` gains `table` and `tricks`. The existing `wc-ledger-cell wc-is-band` cell is **kept** and gains the class `wc-is-compact`; CSS shows exactly one of the two. Replace the props interface and the band cell:

```tsx
interface HuntLedgerProps {
  readonly spoils: Spoils
  readonly band: StandingBand
  readonly table: readonly StandingBand[]
  readonly tricks: number
}
```

Then, in place of the current `wc-is-band` cell, render both — the track for the roomy layout and the cell for the narrow one:

```tsx
      <StandingTrack table={table} tricks={tricks} />
      <span className="wc-ledger-cell wc-is-band wc-is-compact">
        <span className="wc-ledger-key" aria-hidden="true">
          Standing
        </span>
        <span
          className="wc-ledger-value"
          aria-label={`Standing band: ${bandName}, multiplier ${band.multiplier}`}
        >
          {bandName} ×{band.multiplier}
        </span>
      </span>
```

Import `StandingTrack` at the top. Leave the `Spoils`, `×`, `=` and `Damage` cells exactly as they are, including the `damage` computation — the duplicated-equation defect is out of scope and listed under "Developer decides or observes".

- [x] **Step 2: Thread `table` through `RoundStatusBand`**

Add `readonly table: readonly StandingBand[]` to `RoundStatusBandProps`, destructure it, and pass both it and the player's trick count — which the component already computes as `yourTricks` — down:

```tsx
      <HuntLedger spoils={spoils} band={band} table={table} tricks={yourTricks} />
```

- [x] **Step 3: Supply the table from `WarCouncilRound`**

`WarCouncilRound` already imports from `'../../warCouncil'`; add `standingTableFor` and `declaredPath` so the track reads the same table that will score the Hunt, and pass it at the existing `RoundStatusBand` call site near line 188:

```tsx
        table={standingTableFor(declaredPath(ui.round))}
```

`declaredPath` is exported from `src/warCouncil/index.ts:8` and `standingTableFor` from `src/hunt/index.ts:8`. Using the same pair the engine uses is what makes it impossible for the track to display a different table from the one `huntDamage` will score with.

- [x] **Step 4: Update `HuntLedger.test.tsx` for the two new required props**

The existing spec calls `<HuntLedger spoils={48} band={band} />`, which no longer compiles. Add `table={winTable}` and a `tricks` value to each render, and add one assertion that both readouts are present and distinctly labelled:

```tsx
  it('renders the track and the compact cell with distinct labels', () => {
    render(<HuntLedger spoils={48} band={resolveStanding(7, winTable)} table={winTable} tricks={7} />)
    // jsdom applies no CSS, so both are in the tree — the labels must not collide.
    expect(screen.getByRole('group', { name: 'Standing track' })).toBeDefined()
    expect(screen.getByLabelText(/^Standing band: /)).toBeDefined()
  })
```

- [x] **Step 5: Typecheck and run every affected spec**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/HuntLedger.test.tsx src/app/warCouncil/__tests__/WarCouncilRound.test.tsx src/app/warCouncil/__tests__/StandingTrack.test.tsx`
Expected: typecheck exits 0; Vitest reports 0 failed. `WarCouncilRound.test.tsx:258-262` asserts the running-Spoils and Standing-band readouts — if its Standing assertion now matches two elements, disambiguate the query in that spec rather than changing either label.

**Confirmed, with one pre-existing, out-of-scope failure flagged rather than fixed:** typecheck exits 0. `HuntLedger.test.tsx` and `StandingTrack.test.tsx` both pass in full. `WarCouncilRound.test.tsx` reports 23 passed / 1 failed — the AC2/AC6 running-Spoils/Standing-band test at line 258 passes with no disambiguation needed (the compact cell's label format is unchanged and stays unique). The one failure, `shows Spoils × Standing = Damage for both sides, with no Demand and no verdict` (line ~314), asserts `RoundOverPanel`'s displayed Damage equals the UNROUNDED `spoilsValue * standingValue` (`61.5`), but Phase 1 (Task 1, already complete) wrapped `scoreHunt`'s `damage` field in `roundDamage`, so the real value is `62`. Verified by `git stash`-ing this task's four files and re-running the same test: it fails identically against the Phase-1-3-only tree, so this is not a regression introduced by Task 9. `RoundOverPanel.tsx` and its test are explicitly out of scope for this contract (plan.md → Explicitly out of scope) and were not touched. See the Implementer Report for the flag.

**Resolved separately (Part A, out-of-band from this task's own file list):** the stale assertion was in the test file, not `RoundOverPanel.tsx` — `WarCouncilRound.test.tsx:314-316` asserted the panel's displayed Damage against the raw `spoilsValue * standingValue`, a property AC4 deliberately ends. Fixed to assert `roundDamage(spoilsValue * standingValue)` (imported alongside `HuntDeclaration` from `'../../../hunt'`), with a comment recording that the display consequence is real and is DLR-71's copy call. Re-run: `Test Files 1 passed (1)`, `Tests 16 passed (16)`; `npx vitest run --project dom`: `Test Files 9 passed (9)`, `Tests 52 passed (52)`, 0 failed.

### Task 10: Style the track, and collapse it below the existing breakpoint ✓ (carved a fifth stylesheet — see note below Step 4)

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/warCouncilHunt.css`

- [x] **Step 1: Measure the stylesheet against its budget before adding to it** — confirmed 305

Run: `(Get-Content src\app\warCouncil\warCouncilHunt.css).Count`
Expected: 305. The file header records that this sheet was split twice because the shell sheet hit its 400-line budget, so confirm the starting point before adding roughly 60 lines. If the result after Step 2 crosses 400, carve a fifth stylesheet rather than compressing the rules.

- [x] **Step 2: Add the track's rules, using existing tokens only** — added verbatim to `warCouncilHunt.css` first as written, which brought it to 419 lines (over budget); moved to Step 4's split, see note there

Append to the ledger section of `src/app/warCouncil/warCouncilHunt.css`. Geometry and treatment per `mockup.html`; **every colour resolves from an existing `--wc-*` token or a value mixed from them — no new token is declared** (this sheet's header rule). The three fills, the `clamp()` bounds, the `min-height` floor and the pip opacity are the developer's values, carried over from the approved mockup:

```css
/* ---------- the Standing track (DLR-68) ---------- */

/* The configured table as a profile: x-axis is trick count, height is the multiplier. Value
   reads through height, so the design holds with no colour at all and needs no new token. */
.wc-track {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  width: clamp(11rem, 24vw, 14.5rem);
  height: 2.9rem;
  padding: 0.9rem 0 0.95rem;
  background: var(--wc-chamber-lift);
  border: 1px solid #23303a;
  border-radius: 0.4rem;
}

.wc-track-seg {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 12%; /* keeps a ×0.5 bar visible; developer's value */
  background: #223038;
  border-top: 1px solid #35474f;
  border-radius: 0.12rem 0.12rem 0 0;
}

/* Peak and cliff are the two shapes that decide play, so they alone take colour. */
.wc-track-seg.wc-is-peak { background: #3c4a33; border-top-color: var(--wc-brass-dim); }
.wc-track-seg.wc-is-cliff { background: #3a2724; border-top-color: var(--wc-alarm); }

/* Current bracket: a lifted fill AND a solid brass rail, so the state survives a greyscale
   screenshot and a colour-vision difference (game-ux: never colour alone). */
.wc-track-seg.wc-is-current { background: #4a3d22; border-top: 2px solid var(--wc-brass); }

.wc-track-mult {
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
  color: var(--wc-chalk-dim);
  margin-top: -0.85rem;
  white-space: nowrap;
}
.wc-track-seg.wc-is-current .wc-track-mult { color: var(--wc-brass); font-weight: 600; }

/* One pip per trick, nested INSIDE its bracket so the pips align with the bracket edges
   whatever the flex gaps do — a track-wide pip row has 13 gaps where the segment row has 5,
   which do not divide the same width. */
.wc-track-pips { position: absolute; inset: 0; display: flex; pointer-events: none; }
.wc-track-pip { flex: 1 1 0; display: flex; align-items: flex-end; justify-content: center; }
.wc-track-pip::before {
  content: '';
  width: 1px;
  height: 0.4rem;
  background: rgba(233, 225, 205, 0.32);
}

/* The current trick: a full-height rule through its own bracket plus a brass foot. Replaces a
   separate needle element, which could not stay aligned with the pips across the flex gaps. */
.wc-track-pip.wc-is-here { position: relative; }
.wc-track-pip.wc-is-here::before {
  width: 0;
  height: 100%;
  background: none;
  border-left: 1px dashed var(--wc-parchment);
}
.wc-track-pip.wc-is-here::after {
  content: '';
  position: absolute;
  bottom: -0.3rem;
  width: 0;
  height: 0;
  border-left: 0.26rem solid transparent;
  border-right: 0.26rem solid transparent;
  border-bottom: 0.3rem solid var(--wc-brass);
}

.wc-track-ticks { position: absolute; left: 0; right: 0; bottom: 0; display: flex; gap: 2px; }
.wc-track-tick {
  font-size: 0.55rem;
  color: var(--wc-chalk-dim);
  font-variant-numeric: tabular-nums;
  text-align: center;
  border-left: 1px solid #1d272d;
}
.wc-track-tick:first-child { border-left: 0; }

/* The compact Standing cell is the narrow-viewport fallback: hidden while the track shows. */
.wc-ledger-cell.wc-is-compact { display: none; }
```

Confirm `.wc-sr-only` already exists in one of the four sheets; if it does not, add it here:

```css
.wc-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

- [x] **Step 3: Collapse the track inside the existing breakpoint** — added verbatim as written first, then relocated (see Step 4's note) into a second `@media (max-width: 44rem), (max-height: 34rem)` block in the new fifth stylesheet rather than the existing block in `warCouncilHunt.css`, since that block's own file was the one over budget

Add to the **existing** `@media (max-width: 44rem), (max-height: 34rem)` block — do not open a second one. That block's own comment already records that `.wc-status`'s children exceed the viewport at this width, which is why the track hides rather than wraps: below this floor the bar carries no more than it does today.

```css
  /* The Standing track is a six-segment readout; at this width the status band is already
     over-full (see this block's note on .wc-status and .wc-ledger). The track therefore
     COLLAPSES rather than wrapping, back to the single compact cell that shipped before
     DLR-68 — which still carries the one decision-critical fact, the band you are in. */
  .wc-track {
    display: none;
  }

  .wc-ledger-cell.wc-is-compact {
    display: flex;
  }
```

- [x] **Step 4: Re-measure, typecheck, and confirm the app's specs still pass**

Run: `(Get-Content src\app\warCouncil\warCouncilHunt.css).Count; npm run typecheck; npx vitest run --project dom`
Expected: the count is under 400 (roughly 365); typecheck exits 0; the `dom` project reports 0 failed. A count of 400 or more is blocking — split the sheet in this contract rather than compressing.

**Result: the first measurement came back 419 — over budget, as the "roughly 365" estimate in this step did not anticipate.** Per this task's own instruction and the risk logged in plan.md, carved a fifth stylesheet — `src/app/warCouncil/warCouncilStandingTrack.css` — rather than compressing the rules. Moved the entire Standing-track rule block (Step 2's content) plus a second, self-contained `@media (max-width: 44rem), (max-height: 34rem)` block (Step 3's content) into the new file; `warCouncilHunt.css` reverted to exactly its pre-Task-10 content plus a corrected header comment (now names five sheets, not four). Imported the new sheet last in `WarCouncilRound.tsx`, after `warCouncilDeclare.css`. Re-measured: `warCouncilHunt.css` = 307 lines, `warCouncilStandingTrack.css` = 135 lines — both well inside budget. Also corrected `warCouncilDeclare.css`'s own header, which likewise said "import all four sheets." Re-ran: typecheck exits 0; `npx vitest run --project dom` reports 8 test files passed, 1 failed (51 passed / 1 failed) — the single failure is the same pre-existing, out-of-scope `RoundOverPanel` rounding mismatch flagged under Task 9 Step 5, confirmed unchanged by this step's CSS split.

---

## Phase 5 — Final verification

No production changes. Confirms the architectural boundary still holds, that AC8's literal ban was not breached, that no file blew its budget, and that the cumulative work passes every gate including the ones reserved for this phase.

### Task 11: Confirm the pure-core boundary still holds ✓

- Skill: `none — verification only, no file is written`

**Files:**

- Test: none — read-only greps

- [x] **Step 1: Grep for React and DOM references inside the pure trees**

`Select-String -Path` does **not** recurse and its `**` matches exactly one directory level, so it would miss `__tests__/` entirely and report a false zero. Use the recursive form:

Run: `Get-ChildItem src\warCouncil, src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|Math\.random"`
Expected: zero hits. `src/warCouncil/**` and `src/hunt/**` are both under the `no-restricted-imports` + `no-restricted-globals` override in `eslint.config.js`; a hit here is a design breach, never something to silence with an `eslint-disable`.

Confirmed by QA and re-confirmed during the review fix pass: zero hits.

### Task 12: Confirm AC8 — no multiplier, band boundary, or health total as a literal ✓

- Skill: `none — verification only, no file is written`

**Files:**

- Test: none — read-only greps

- [x] **Step 1: Grep non-test `src/warCouncil/` for the values config owns**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Where-Object { $_.FullName -notmatch '__tests__' } | Select-String -Pattern "0\.5|1350|1600|minTricks|maxTricks|multiplier:"`
Expected: zero hits. Every multiplier, band boundary and health total is reached through `standingTableFor`, `resolveStanding`, `cardValueFor`, `roundDamage` or `quarryHealthForEncounter`. This grep returned zero before the contract started, so any hit is introduced by it.

Confirmed by QA and re-confirmed during the review fix pass: zero hits.

- [x] **Step 2: Confirm the enumeration fixture is the only literal-bearing artefact, and that it is a test**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "\[4, 96, 540\]|\[9, 540, 96\]"`
Expected: exactly two hits, both in `src\warCouncil\__tests__\huntEnumeration.test.ts`. Those figures are transcriptions of `hybrid-design.md` §8's published products, which AC7 requires asserted; AC8 governs production code. A hit in any non-test file is an AC8 breach.

Confirmed by QA and re-confirmed during the review fix pass: exactly two hits, both in `src\warCouncil\__tests__\huntEnumeration.test.ts` (lines 47 and 52 after the Prettier reformat).

### Task 13: Confirm no file blew the 400-line budget ✓

- Skill: `none — verification only, no file is written`

**Files:**

- Test: none — read-only measurement

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src\warCouncil\scoring.ts, src\warCouncil\index.ts, src\warCouncil\spoils.ts, src\warCouncil\types.ts, src\warCouncil\__tests__\scoring.test.ts, src\warCouncil\__tests__\huntEnumeration.test.ts, src\app\warCouncil\standingSegments.ts, src\app\warCouncil\StandingTrack.tsx, src\app\warCouncil\HuntLedger.tsx, src\app\warCouncil\RoundStatusBand.tsx, src\app\warCouncil\WarCouncilRound.tsx, src\app\warCouncil\warCouncilHunt.css, src\app\warCouncil\__tests__\standingSegments.test.ts, src\app\warCouncil\__tests__\StandingTrack.test.tsx, src\app\warCouncil\__tests__\HuntLedger.test.tsx | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName).Count)" }`
Expected: every count under 400. `scoring.ts` starts at 50 and should land near 130; `scoring.test.ts` starts at 113 and should land near 230; `warCouncilHunt.css` starts at 305 and should land near 365 — the tightest of the set, and the one to watch. `WarCouncilRound.tsx` is already 239 and gains about four lines. Anything at or over 400 is blocking and must be split in this contract — `.Count`, not `Measure-Object -Line`, which drops blank lines and undercounts.

Confirmed, re-measured after the review fix pass's Prettier reformat (which adds lines, not removes them): `scoring.ts` 167, `index.ts` 32, `spoils.ts` 26, `types.ts` 145, `scoring.test.ts` 238, `huntEnumeration.test.ts` 120, `standingSegments.ts` 54, `StandingTrack.tsx` 79, `HuntLedger.tsx` 68, `RoundStatusBand.tsx` 66, `WarCouncilRound.tsx` 242, `warCouncilHunt.css` 307, `standingSegments.test.ts` 61, `StandingTrack.test.tsx` 46, `HuntLedger.test.tsx` 47. All well under 400.

- [x] **Step 2: Confirm no viewport-unit regression was introduced**

`game-ux`'s hard floor forbids `100vh` and `100vw` anywhere — `vh` measures against the retracted-toolbar viewport and `vw` includes the scrollbar. The track uses `vw` only inside a `clamp()` for its width, which is not a full-viewport measurement, but confirm nothing new crept in:

Run: `Get-ChildItem src\app -Recurse -Include *.css,*.tsx | Select-String -Pattern "100vh|100vw"`
Expected: zero hits.

Confirmed by QA and re-confirmed during the review fix pass: zero hits.

### Task 14: Static gates, full suite, and the production build ✓

- Skill: `none — verification only, no file is written`

**Files:**

- Test: none — the whole suite

- [x] **Step 1: Warm the Vite transform cache before the unfiltered run**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This step exists because a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project — a worker-start timeout, not a failing test, in which the `.test.tsx` files never execute at all. Running the projects separately first avoids it. A **second consecutive** timeout is a real problem; a single cold one must never be reported as a test failure.

QA ran this green. Re-run during the review fix pass, after the Prettier reformat: `node` project `Test Files 27 passed (27)`, `Tests 511 passed (511)`; `dom` project `Test Files 9 passed (9)`, `Tests 52 passed (52)`. Nothing moved.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. The DLR-67 baseline was `495/495`; this contract adds **52 tests** — 44 in `huntEnumeration.test.ts` (28 enumeration rows + 14 antisymmetry + 2 non-vacuity) and 8 in `scoring.test.ts` (1 rounding + 3 guards + 1 direction + 2 AC2 + 1 structural) — so expect **547 passing**. Quote the actual summary line rather than this figure.

QA quoted: `npm run typecheck` exit 0; `npm run lint` exit 0 (zero errors, zero warnings, no `eslint-disable` anywhere in `src/`); `npm test` → `Test Files 36 passed (36)`, `Tests 563 passed (563)` (563, not 547 — QA's number is the correct actual count; 547 was the plan's estimate before Phase 4's own tests were added to the total). Delegated to QA, not re-run unfiltered by the Implementer per policy; the scoped `node`/`dom` project runs above (511 + 52 = 563) corroborate it after the fix pass with nothing moved.

- [x] **Step 3: Check formatting of the files this contract touched**

Run: `npx prettier --check src\warCouncil\scoring.ts src\warCouncil\index.ts src\warCouncil\spoils.ts src\warCouncil\types.ts src\warCouncil\__tests__\scoring.test.ts src\warCouncil\__tests__\huntEnumeration.test.ts src\app\warCouncil\standingSegments.ts src\app\warCouncil\StandingTrack.tsx src\app\warCouncil\labels.ts src\app\warCouncil\HuntLedger.tsx src\app\warCouncil\RoundStatusBand.tsx src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncil\warCouncilHunt.css src\app\warCouncil\warCouncilStandingTrack.css src\app\warCouncil\warCouncilDeclare.css src\app\warCouncil\__tests__\standingSegments.test.ts src\app\warCouncil\__tests__\StandingTrack.test.tsx src\app\warCouncil\__tests__\HuntLedger.test.tsx src\app\warCouncil\__tests__\WarCouncilRound.test.tsx`
Expected: exits 0, "All matching files use Prettier code style". If it fails, run `npx prettier --write` on the same explicit list and re-check. Then run `npm run format:check` once and **report** its result: it fails repo-wide on pre-existing `.docs/**` files no current contract has touched, which is a known pre-existing condition and must not be repaired here.

**Widened during the review fix pass** (Code-Evaluator, Defender and QA all independently flagged the original list): it enumerated only the six Phase 1–3 `src/warCouncil/*` files and silently omitted every Phase 4 file under `src/app/warCouncil/`, so running it as originally written reported a false green while `warCouncilStandingTrack.css`, `HuntLedger.test.tsx` and `standingSegments.test.ts` sat unformatted. The command above is now the full 19-file contract map. Confirmed: `npx prettier --write` applied to the 5 offending files (`scoring.test.ts`, `huntEnumeration.test.ts`, `warCouncilStandingTrack.css`, `standingSegments.test.ts`, `HuntLedger.test.tsx` — all line-wrap/CSS-declaration-per-line only, no semantic change), then the widened `--check` command above exits 0: "All matched files use Prettier code style!". `npm run format:check` still fails repo-wide on pre-existing `.docs/**` / `.github/**` files no current contract has touched — reported, not repaired.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `npm run build` runs `npm run lint` first (`package.json:11`), so a lint failure surfaces here as a build failure.

QA confirmed: `npm run build` exit 0, `dist/` written. Delegated to QA per policy — the Implementer does not run the production build.

### Task 15: Record the browser checks QA must perform on the track ✓

- Skill: `none — a hand-off note, no file is written until Step 1`

**Files:**

- Create: `.claude/contract/DLR-68-two-sided-damage/qa-viewports.md`

- [x] **Step 1: Write the viewport list QA must drive the app at**

`game-ux` states the limit plainly: **jsdom has no layout engine, so no Vitest test can prove the status band does not scroll or crop.** That question has a right answer, so it is QA's through the `chrome-devtools` MCP, not the developer's eye — but the sizes must be named rather than left to judgement. Write `qa-viewports.md` in this plan folder listing, for each size, what to confirm:

- **1920×1080 and 1440×900** — the track renders in the top bar between `Spoils ×` and `= Damage`; six segments; the current bracket carries a brass rail; the pip count across the track is 14.
- **1024×768** — the track still shows (above the 44rem breakpoint) and the status band does not wrap onto a second row.
- **760×600** — just above the breakpoint: the last size at which the track must still fit without the band overflowing.
- **680×520 and 700×544** — **below** the breakpoint, and the two sizes DLR-67's open defect was measured at. Confirm the track is gone, the compact `Standing` cell is present, and the band is no worse than it is on `master` today. DLR-67's declare-gate overflow **will** still be present here; it is pre-existing and must not be reported as introduced by this contract.
- **390×844 (phone portrait)** — no horizontal page scroll, and nothing behind a notch.
- **In every case:** the console is clean, and `document.documentElement.scrollWidth <= clientWidth`.

Also record what is *not* QA's: whether the three fill colours, the track's size bounds, the ×0.5 height floor and the pip opacity look right. Those are the developer's, and a screenshot is not a substitute.

### Task 16: Update the PR description ✓

- Skill: `none — a document for the developer, no source file is written`

**Files:**

- Create: `.claude/contract/DLR-68-two-sided-damage/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` in this folder, and the Jira key DLR-68.
- Summary of the change: `huntDamage(finalState)` as the single two-sided damage entry point; `incoming` keyed by the side depleted; `roundDamage` at one point; two guards that throw.
- **Every decision the developer must make**, copied from the File map's "Developer decides or observes" block — the first `class` in `src/`, the rounded on-screen equation, the `HuntLedger.tsx:20` duplicated-equation defect worth its own ticket, the `WarCouncilRound.tsx:69` shadowing hazard, and the config↔design-doc coupling the enumeration fixture creates.
- **The AC1 deviation, stated plainly:** `HuntDamage.spoils` is not renamed to `cardValue`, by developer decision on 2026-08-12, and why that is what keeps the no-UI-file boundary intact.
- **The AC7 handover:** the Lose column asserts own-pile valuation, not §8's Lose column, and DLR-69 replaces the fixture array.
- **The scope widening:** the Standing track was added mid-planning on the developer's instruction, after an annotated screenshot; DLR-68 was an engine-only ticket and is now also a UI one. Link `mockup.html` and note it was approved after one revision round (per-trick pips).
- **The track's six developer-owned visual values**, and the fact that no new colour token was introduced.
- **The collapse rule** at 44rem / 34rem, why it collapses rather than wraps, and a pointer to `qa-viewports.md`.
- Verification results from Phases 1–5, quoting the actual Vitest summary line.
- Two pre-existing conditions this contract did not introduce: DLR-67's declare-gate CSS overflow at 680×520 / 700×544, and the repo-wide `format:check` failure.
- A one-line note for future contributors on the new convention: rejection reasons for a throw follow `DeclareRejection`'s `as const` shape, carried on a named `Error` subclass.

---

## Self-review

(Filled by the planner before handing off so the executor can confirm coverage.)

**Spec coverage — every `plan.md` Part 1 "In scope" bullet maps to a task:**

- `huntDamage(finalState)` entry point (AC1) — Task 3.
- Both sides off one declaration, one resolved pair (AC2) — Task 3, Steps 1 and 3.
- `incoming` keyed by the side depleted, via `otherSide()` (AC3) — Tasks 2 and 3.
- `roundDamage` at exactly one point (AC4) — Task 1.
- The two throwing guards with reason codes (AC5) — Tasks 2 and 3.
- Corrupt trick count propagates `RangeError` (AC5) — Task 3, Step 1, third case.
- Derived antisymmetry over the configured pair (AC6) — Task 5.
- Fourteen splits × both declarations against §8 (AC7) — Task 5.
- Barrel exports — Task 4, exercised by Task 5's import from `'..'`.
- `spoils.ts` pile-swap docblock correction — Task 6, Step 1.
- `declaredPath` docblock note — Task 6, Step 2.
- No literal multiplier / boundary / health total (AC8) — Task 12.
- All gates green (AC9) — Task 14.

**Spec coverage — the Standing track (developer's scope widening, 2026-08-12):**

- Segment geometry derived from the configured table, no literal multiplier or boundary — Task 7.
- One pip per trick inside each bracket, current pip marked — Tasks 7 and 8.
- The component, its group label, and the accessible band readout — Task 8.
- The configured table threaded from `WarCouncilRound` through to the track — Task 9.
- Styling from existing tokens only, no new colour token — Task 10, Step 2.
- Collapse to the compact cell below the existing 44rem / 34rem breakpoint — Task 10, Step 3.
- Stylesheet budget guarded before and after — Task 10, Steps 1 and 4, plus Task 13.
- No `100vh` / `100vw` regression — Task 13, Step 2.
- Browser verification at named viewport sizes, which jsdom cannot do — Task 15.

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `huntDamage`, `HuntOutcome`, `HuntNotScorable`, `HuntNotScorableError`, `incoming`, `declaration`, and the reason values `'unfinished'` / `'undeclared'` are spelled identically in `plan.md` Part 2 → Data shapes and in Tasks 2, 3, 4, 5 and 16. `HuntDamage.spoils` is spelled `spoils` everywhere — never `cardValue`. `scoreHunt` keeps its name in every task. The fixture helper is `averageCards` in both engine spec files and `finishedHunt` / `finished` are distinct by design (one builds a state from `k`, the other decorates the existing `huntState`).

For the track: `standingSegments`, `TrackSegment`, `heightPct`, `currentPipIndex`, `isPeak`, `isCliff`, `isCurrent`, `StandingTrack`, `STANDING_TRACK_LABEL` and the class names `wc-track`, `wc-track-seg`, `wc-track-mult`, `wc-track-pips`, `wc-track-pip`, `wc-track-ticks`, `wc-track-tick`, `wc-is-peak`, `wc-is-cliff`, `wc-is-current`, `wc-is-here`, `wc-is-compact`, `wc-sr-only` are spelled identically in `plan.md` Part 2 → Data shapes, in Tasks 7, 8, 9 and 10, and in `mockup.html`. **Class names are a string-bound surface** — the component writes them and the stylesheet matches them with no compiler between, so Task 10's CSS and Task 8's `className` strings must agree exactly. The mockup uses unprefixed names (`.seg`, `.pip`); the shipped classes take the `wc-` prefix the four stylesheets already use, which is a deliberate difference, not a transcription error.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking with rounding applied and one new test passing; no new exports exist yet, and rounding is the identity on all three pre-existing `damage` assertions, so nothing is half-applied.
- **Phase 2** ends type-checking with `huntDamage` written, tested, and exported from the barrel. Task 2's imports are transiently unused between Tasks 2 and 3 — Task 2 Step 3 names that and forbids resolving it with an `eslint-disable`.
- **Phase 3** ends type-checking with the enumeration spec passing and two docblocks corrected; both edits are inside block comments, so no runtime behaviour changes.
- **Phase 4** ends type-checking with the track rendering, styled, and collapsing at the breakpoint. The intermediate boundaries are clean but visually incomplete, which is deliberate and safe: after Task 7 the helper exists with no consumer; after Task 8 the component exists and is tested but is not mounted; after Task 9 it is mounted and both readouts render, so the bar briefly shows the track *and* the compact cell until Task 10's `wc-is-compact { display: none }` lands. That is the one boundary where the app compiles and passes but looks wrong — Tasks 9 and 10 should not be split across a stopping point.
- **Phase 5** writes no production code at all — greps, measurements, gates, and two documents in the plan folder.
