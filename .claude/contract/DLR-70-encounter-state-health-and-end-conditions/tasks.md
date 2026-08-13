# Tasks: Encounter state — two health bars, damage application, and the end conditions

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-12

**Goal:** Build the pure arithmetic core of an encounter — an immutable `EncounterState` holding both health bars and an applied-Hunt count, one `applyHunt` transition that subtracts each side's incoming damage once and resolves the instant a bar hits zero, and a single guard-free entry point onto the same §1 equation so pending damage can be shown mid-Hunt without a second arithmetic path existing.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**

- `src/hunt/encounter.ts` — `startEncounter`, `applyHunt`, `isEncounterResolved`, plus the single clamp and the winner resolution as module-private helpers.
- `src/hunt/__tests__/encounter.test.ts` — AC1–AC8 coverage, no renderer.

**Modified:**

- `src/hunt/types.ts` — add `IncomingDamage` and `EncounterState`.
- `src/hunt/index.ts` — re-export the two types and the three functions.
- `src/warCouncil/scoring.ts:137-171` — extract `huntDamage`'s body into a private `outcomeFor`; add `pendingHuntDamage` and `duelSideDamage`.
- `src/warCouncil/index.ts:26-27` — re-export `pendingHuntDamage` and `duelSideDamage`.
- `src/warCouncil/__tests__/scoring.test.ts` — add the AC3 no-drift assertion and the adapter's coverage.

**Deleted:** (none)

**Developer decides or observes:**

- **AC8's "486 left" reading.** 486 is the player's health *entering* Hunt 4; 198 is the health at the moment the Quarry's bar empties on Hunt 4, because both bars deplete simultaneously. Task 3 asserts both, so no work is blocked — but if 486 was meant as the post-victory figure, `hybrid-design.md` §9's wording wants amending, not the code.
- **`applyHunt` throwing on an already-resolved encounter** (Task 2). A design reading, not a documented rule. If DLR-71 would rather call it idempotently, changing the throw to a no-op return is one line.
- **`winner: DuelSide | null` versus a named outcome union** (Task 1). Chosen because `SIMULTANEOUS_DEPLETION_WINNER` is already typed `DuelSide`, making the tie a read rather than a translation. If DLR-71 finds it awkward to render, adding a derived helper there is cheaper than changing the type — and nothing serialises it yet.
- **`Health` and `Damage` are both bare `number` aliases**, so nothing stops passing one where the other belongs. Branding them would churn every existing `HuntDamage` consumer and is out of scope; flagged as a known soft spot, not fixed here.
- **No tuning value is unchosen.** Every number this contract needs is a shipped DLR-66 key in `src/hunt/config.ts`. Recorded so the absence of an arithmetic decision is visible rather than an omission.
- **Nothing is playable when this closes.** No surface, no interaction, no feel question — verification is Vitest and the static gates.

---

## Phase 1 — The encounter state and its single transition

The whole of `src/hunt/`'s new work, ending with the module exported and its spec green. The phase boundary is clean because nothing outside `src/hunt/` imports any of it yet: `src/warCouncil/` and `src/app/` compile exactly as they do today at every point in this phase. Tasks 1–3 are ordered so each type exists before the code that names it.

### Task 1: Add the encounter's domain types to `src/hunt/types.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/types.ts` — append after the `Hunt` interface (currently ends at line 53)

- [x] **Step 1: Append `IncomingDamage` and `EncounterState` to the end of the file**

Both go at the end, after `Hunt`, so the existing declaration order is untouched. `Damage`, `Health`, and `DuelSide` are already declared above in this same file — no import is added.

```ts
/**
 * One Hunt's damage, keyed by the side it is APPLIED TO — never by the side that dealt it.
 * The same convention as `HuntOutcome.incoming` in src/warCouncil/scoring.ts, carried across
 * the module boundary deliberately: the crossing is performed exactly once, there, by
 * `duelSideDamage`. A dealer-keyed record would let the first caller who forgot subtract a
 * side's own damage from its own health, type-check, and produce plausible numbers forever.
 */
export type IncomingDamage = Readonly<Record<DuelSide, Damage>>

/**
 * A sequence of Hunts fought until a bar empties (§5) — the state that outlives one
 * `RoundState`. Immutable: `applyHunt` returns a new one, so a caller previews a Hunt by
 * applying it to a copy rather than projecting health through a second arithmetic path.
 *
 * Holds no `RoundState` and no `PlayerSide`. `src/hunt/` cannot import `src/warCouncil/`
 * without a cycle (types.ts:26-32), which is why damage arrives as two numbers.
 */
export interface EncounterState {
  readonly health: Readonly<Record<DuelSide, Health>>
  /** How many Hunts have been applied. NOT a cap — DLR-70 AC7 states there deliberately is
   *  none; the stall is the evidence a cap is needed (§11). */
  readonly huntsApplied: number
  /** `null` while the encounter is live. `Player` — the encounter is won; `Quarry` — the run
   *  ends. Typed `DuelSide` so the simultaneous-depletion tie is a direct read of
   *  `SIMULTANEOUS_DEPLETION_WINNER` rather than a translation onto a second vocabulary. */
  readonly winner: DuelSide | null
}
```

- [x] **Step 2: Confirm the new types compile**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Build the encounter module at `src/hunt/encounter.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/hunt/encounter.ts`
- Test: `src/hunt/__tests__/encounter.test.ts`

- [x] **Step 1: Write the failing spec for initialisation, the single application, the clamp, and the end conditions**

Create `src/hunt/__tests__/encounter.test.ts`. This step covers AC1, AC2, AC4, AC5, AC6 and the guards; Task 3 adds AC8's four named scenarios to the same file.

```ts
import { describe, expect, it } from 'vitest'
import { applyHunt, isEncounterResolved, startEncounter } from '../encounter'
import {
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  SIMULTANEOUS_DEPLETION_WINNER,
} from '../config'
import { DuelSide, type IncomingDamage } from '../types'

/** Keyed by the side the damage is APPLIED TO, matching `IncomingDamage`. */
function damage(toPlayer: number, toQuarry: number): IncomingDamage {
  return { [DuelSide.Player]: toPlayer, [DuelSide.Quarry]: toQuarry }
}

describe('startEncounter — both bars come from the configured totals (AC1)', () => {
  it('reads PLAYER_START_HEALTH and the indexed Quarry total, and starts unresolved', () => {
    const encounter = startEncounter(0)
    expect(encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(encounter.huntsApplied).toBe(0)
    expect(encounter.winner).toBeNull()
    expect(isEncounterResolved(encounter)).toBe(false)
  })

  it('takes the second encounter’s configured total at index 1', () => {
    expect(startEncounter(1).health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(1))
  })

  it('lets quarryHealthForEncounter’s RangeError surface on an out-of-range index', () => {
    expect(() => startEncounter(99)).toThrow(RangeError)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a starting player health of %p rather than seeding a broken bar',
    (health) => {
      expect(() => startEncounter(0, health)).toThrow(RangeError)
    },
  )
})

describe('applyHunt — each side loses the OTHER side’s damage, once (AC2)', () => {
  it('subtracts both bars exactly once and counts one Hunt', () => {
    const after = applyHunt(startEncounter(0), damage(100, 250))
    expect(after.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 100)
    expect(after.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 250)
    expect(after.huntsApplied).toBe(1)
    expect(after.winner).toBeNull()
  })

  it('leaves the encounter it was given untouched', () => {
    const before = startEncounter(0)
    applyHunt(before, damage(100, 250))
    expect(before.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(before.huntsApplied).toBe(0)
  })
})

describe('applyHunt — the end conditions (AC4)', () => {
  it('the Quarry’s bar alone empties -> the Player wins', () => {
    const after = applyHunt(startEncounter(0), damage(1, quarryHealthForEncounter(0)))
    expect(after.winner).toBe(DuelSide.Player)
    expect(isEncounterResolved(after)).toBe(true)
  })

  it('the player’s bar alone empties -> the Quarry wins and the run ends', () => {
    const after = applyHunt(startEncounter(0), damage(PLAYER_START_HEALTH, 1))
    expect(after.winner).toBe(DuelSide.Quarry)
  })

  it('both bars empty on the same Hunt -> the configured tie winner takes it', () => {
    const after = applyHunt(
      startEncounter(0),
      damage(PLAYER_START_HEALTH, quarryHealthForEncounter(0)),
    )
    expect(after.health[DuelSide.Player]).toBe(0)
    expect(after.health[DuelSide.Quarry]).toBe(0)
    // Compared against the constant, not against a literal 'quarry': config.test.ts:328 is the
    // single assertion of the VALUE, this is the assertion of the RULE, so the two cannot drift.
    expect(after.winner).toBe(SIMULTANEOUS_DEPLETION_WINNER)
  })
})

describe('applyHunt — surplus damage is discarded, and health never goes negative (AC5, AC6)', () => {
  it('overkill leaves no trace: 5000 into a 1350 bar is identical to exactly emptying it', () => {
    const start = startEncounter(0)
    const exact = applyHunt(start, damage(0, quarryHealthForEncounter(0)))
    const overkill = applyHunt(start, damage(0, 5000))
    // Deep equality is the assertion: if surplus were carried or converted ANYWHERE in the
    // state, these two would differ. Nothing to inspect means nothing was kept.
    expect(overkill).toEqual(exact)
    expect(overkill.health[DuelSide.Quarry]).toBe(0)
  })

  it.each([0, 1, 1349, 1350, 1351, 99999])(
    'clamps at zero rather than reporting negative health for %i damage',
    (dealt) => {
      const after = applyHunt(startEncounter(0), damage(dealt, dealt))
      expect(after.health[DuelSide.Player]).toBeGreaterThanOrEqual(0)
      expect(after.health[DuelSide.Quarry]).toBeGreaterThanOrEqual(0)
    },
  )
})

describe('applyHunt — refuses rather than corrupting a bar', () => {
  it('throws on an encounter that has already resolved', () => {
    const resolved = applyHunt(startEncounter(0), damage(0, quarryHealthForEncounter(0)))
    expect(() => applyHunt(resolved, damage(10, 10))).toThrow(RangeError)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'throws on damage of %p rather than letting it reach a bar',
    (bad) => {
      // NaN is the one that matters: NaN - x is NaN, Math.max(0, NaN) is NaN, and a NaN health
      // renders as an empty bar with nothing logged anywhere.
      expect(() => applyHunt(startEncounter(0), damage(bad, 0))).toThrow(RangeError)
      expect(() => applyHunt(startEncounter(0), damage(0, bad))).toThrow(RangeError)
    },
  )
})
```

- [x] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/hunt/__tests__/encounter.test.ts`
Expected: the run fails to collect the file with a resolution error naming `../encounter` — the module does not exist yet. A *passing* run here means the file was created out of order.

- [x] **Step 3: Create `src/hunt/encounter.ts`**

Exported API first, module-private helpers after, per the skill's file order. No literal health number and no literal `'player'` / `'quarry'` string appears anywhere — every one is a configured key or a `DuelSide` member.

```ts
import {
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  SIMULTANEOUS_DEPLETION_WINNER,
} from './config'
import { DuelSide, type Damage, type EncounterState, type Health, type IncomingDamage } from './types'

/**
 * AC1 — a fresh encounter, both bars read from DLR-66's configured totals.
 *
 * `encounterIndex` selects the Quarry's bar from `QUARRY_ENCOUNTER_HEALTH`; it does NOT
 * sequence anything. Running the encounters in order, and any restore between them
 * (`ENCOUNTER_PLAYER_RESTORE`), is DLR-73's, and this module deliberately reads neither.
 *
 * `playerHealth` is a defaulted parameter rather than something the function closes over, the
 * same injectable pattern `resolveStanding`'s table uses — so a spec can vary it without
 * mutating module state.
 */
export function startEncounter(
  encounterIndex: number,
  playerHealth: Health = PLAYER_START_HEALTH,
): EncounterState {
  if (!Number.isFinite(playerHealth) || playerHealth <= 0) {
    throw new RangeError(
      `Cannot start an encounter with a player health of ${playerHealth}: it must be a positive finite number`,
    )
  }
  return {
    health: {
      [DuelSide.Player]: playerHealth,
      [DuelSide.Quarry]: quarryHealthForEncounter(encounterIndex),
    },
    huntsApplied: 0,
    winner: null,
  }
}

/**
 * AC2 — one finished Hunt's damage applied once, at the end of the thirteenth trick, never
 * per trick. `incoming` is already keyed by the side it depletes (`duelSideDamage` performs
 * that crossing), so this function does not invert anything and cannot get it backwards.
 *
 * Both bars are depleted BEFORE either is inspected. Resolving after the first subtraction
 * would make AC4's simultaneous case unreachable and §9's tie ruling dead code.
 *
 * Returns a new state; the input is never mutated. That is what lets a caller preview a Hunt
 * by applying it to a copy, rather than DLR-71 writing a second projection routine that could
 * drift from this one.
 */
export function applyHunt(encounter: EncounterState, incoming: IncomingDamage): EncounterState {
  if (encounter.winner !== null) {
    throw new RangeError(
      `Cannot apply a Hunt to an encounter already resolved in favour of the ${encounter.winner} after ${encounter.huntsApplied} Hunts`,
    )
  }
  assertApplicable(incoming[DuelSide.Player], DuelSide.Player)
  assertApplicable(incoming[DuelSide.Quarry], DuelSide.Quarry)

  const health = {
    [DuelSide.Player]: deplete(encounter.health[DuelSide.Player], incoming[DuelSide.Player]),
    [DuelSide.Quarry]: deplete(encounter.health[DuelSide.Quarry], incoming[DuelSide.Quarry]),
  }

  return {
    health,
    huntsApplied: encounter.huntsApplied + 1,
    winner: resolveWinner(health),
  }
}

/** One statement of what "resolved" means, so DLR-71's render guard and DLR-73's loop
 *  condition cannot disagree about it. */
export function isEncounterResolved(encounter: EncounterState): boolean {
  return encounter.winner !== null
}

/**
 * THE single clamp point (AC6) — and therefore also the single place surplus damage is
 * discarded (AC5). Those two acceptance criteria are one line of code seen from two
 * directions: nothing else in this module writes a health value, so a bar cannot go negative
 * and overkill cannot leave a trace anywhere in the returned state.
 *
 * §9 records the overkill question Deferred — wasted for now, possibly paid out later. When
 * that is designed, this is the one function that changes.
 */
function deplete(current: Health, damage: Damage): Health {
  return Math.max(0, current - damage)
}

/**
 * AC4's three cases, over bars that have already been depleted.
 *
 * The tie reads `SIMULTANEOUS_DEPLETION_WINNER` rather than returning `DuelSide.Quarry`
 * directly, so §9's dated ruling (2026-08-11 — the player loses) stays attributable from the
 * code and is overturned by editing `config.ts` alone.
 *
 * `<= 0` rather than `=== 0` states AC4's own wording. `deplete` makes zero the only reachable
 * floor today, so the two are equivalent; the comparison survives a future path that does not
 * clamp.
 */
function resolveWinner(health: Readonly<Record<DuelSide, Health>>): DuelSide | null {
  const playerDown = health[DuelSide.Player] <= 0
  const quarryDown = health[DuelSide.Quarry] <= 0
  if (playerDown && quarryDown) {
    return SIMULTANEOUS_DEPLETION_WINNER
  }
  if (quarryDown) {
    return DuelSide.Player
  }
  if (playerDown) {
    return DuelSide.Quarry
  }
  return null
}

/**
 * There is no division anywhere in this module, so the classic `NaN` source is absent — but a
 * caller can still hand one in, and `NaN - x` is `NaN` while `Math.max(0, NaN)` is `NaN`. A
 * `NaN` health renders as an empty bar and logs nothing, so it is refused before the
 * subtraction rather than diagnosed afterwards.
 *
 * Finite and non-negative, NOT integral: under `DAMAGE_ROUNDING = None` a ×0.5 band
 * legitimately produces a half-point total, and an integer guard would break a supported
 * configuration.
 */
function assertApplicable(damage: Damage, side: DuelSide): void {
  if (!Number.isFinite(damage) || damage < 0) {
    throw new RangeError(
      `Damage applied to the ${side} must be a non-negative finite number, received ${damage}`,
    )
  }
}
```

- [x] **Step 4: Run the spec and the type gate together**

Run: `npx vitest run src/hunt/__tests__/encounter.test.ts; npm run typecheck`
Expected: Vitest reports `Tests` with 0 failed and every `describe` in Step 1 green; `typecheck` exits 0.

### Task 3: Cover AC8's four named scenarios ✓

- Skill: `react-frontend`

**Files:**

- Test: `src/hunt/__tests__/encounter.test.ts` — append

- [x] **Step 1: Append the fixture constants and the four scenario suites**

Append to the end of `src/hunt/__tests__/encounter.test.ts`. The damage figures are hand-computed rather than simulated, which is what makes the 23-Hunt tail case 23 integer subtractions instead of 299 played tricks.

```ts
// AC8's fixtures, derived here so the numbers are checkable without leaving the file.
//
// Every captured card is rank 6 — the exact mean of ranks 1-11, the convention
// src/warCouncil/__tests__/huntEnumeration.test.ts already uses. A trick captures two cards,
// so k tricks is 12k of card value. Win table: 0-3 x1, 4 x2, 5 x3, 6 x4, 7-9 x5, 10-13 x0.5.
// Both sides read the one declared table (DLR-68 AC2) and the two counts sum to 13.
//
//   player 9  -> 108 x5   = 540 dealt;  Quarry 4 -> 48 x2 = 96
//   player 8  ->  96 x5   = 480 dealt;  Quarry 5 -> 60 x3 = 180
//   player 7  ->  84 x5   = 420 dealt;  Quarry 6 -> 72 x4 = 288   (708 on the table, §5)
//   player 10 -> 120 x0.5 =  60 dealt;  Quarry 3 -> 36 x1 = 36
//   player 13 -> 156 x0.5 =  78 dealt;  Quarry 0 ->  0 x1 = 0
const FAST_9 = damage(96, 540)
const FAST_8 = damage(180, 480)
const BOUNDARY_7 = damage(288, 420)
const BOUNDARY_6 = damage(420, 288)
const TAIL_10 = damage(36, 60)
const TAIL_13 = damage(0, 78)

/** Applies the same Hunt until the encounter resolves. `maxHunts` is the SPEC's bound, not a
 *  game rule — AC7 states the game has no cap — so a resolution bug fails as an assertion
 *  rather than hanging the suite. */
function fight(incoming: IncomingDamage, maxHunts = 100) {
  let current = startEncounter(0)
  while (!isEncounterResolved(current) && current.huntsApplied < maxHunts) {
    current = applyHunt(current, incoming)
  }
  return current
}

describe('AC8 — the fast band resolves in 3-4 Hunts at 7-9 tricks (§5, §9)', () => {
  it('9 tricks a Hunt wins on Hunt 3 with 1062 left', () => {
    const end = fight(FAST_9)
    expect(end.winner).toBe(DuelSide.Player)
    expect(end.huntsApplied).toBe(3)
    expect(end.health[DuelSide.Player]).toBe(1062)
    expect(end.health[DuelSide.Quarry]).toBe(0)
  })

  it('8 tricks a Hunt wins on Hunt 3 with 810 left', () => {
    const end = fight(FAST_8)
    expect(end.huntsApplied).toBe(3)
    expect(end.health[DuelSide.Player]).toBe(810)
  })
})

describe('AC8 — the P = H boundary sits exactly on the 6/7 line (§5, §9)', () => {
  it('7 tricks a Hunt: 486 left entering Hunt 4, then the encounter is won on it', () => {
    let encounter = startEncounter(0)
    for (let i = 0; i < 3; i += 1) {
      encounter = applyHunt(encounter, BOUNDARY_7)
    }
    // §9's stated figure — the player's health ENTERING Hunt 4 (1350 - 3 x 288).
    expect(encounter.health[DuelSide.Player]).toBe(486)
    expect(encounter.health[DuelSide.Quarry]).toBe(90)
    expect(encounter.winner).toBeNull()

    // And the same instant from the other side: both bars deplete together, so when the
    // Quarry's empties on Hunt 4 the player is on 198, not 486. Both figures are correct
    // about different instants; asserting both pins which is which.
    const won = applyHunt(encounter, BOUNDARY_7)
    expect(won.winner).toBe(DuelSide.Player)
    expect(won.huntsApplied).toBe(4)
    expect(won.health[DuelSide.Player]).toBe(198)
    expect(won.health[DuelSide.Quarry]).toBe(0)
  })

  it('6 tricks a Hunt loses on Hunt 4 — the exact mirror', () => {
    const end = fight(BOUNDARY_6)
    expect(end.winner).toBe(DuelSide.Quarry)
    expect(end.huntsApplied).toBe(4)
    expect(end.health[DuelSide.Player]).toBe(0)
    expect(end.health[DuelSide.Quarry]).toBe(198)
  })
})

describe('AC8, AC7 — the tail runs 18-23 Hunts at 10-13 tricks, uncapped (§5, §9, §11)', () => {
  it('10 tricks a Hunt — the slowest line — takes 23 Hunts', () => {
    const end = fight(TAIL_10)
    expect(end.huntsApplied).toBe(23)
    expect(end.winner).toBe(DuelSide.Player)
    expect(end.health[DuelSide.Player]).toBe(522)
  })

  it('13 tricks a Hunt takes 18 Hunts and costs the player nothing', () => {
    const end = fight(TAIL_13)
    expect(end.huntsApplied).toBe(18)
    expect(end.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('runs past any plausible cap without refusing — there is deliberately none (AC7)', () => {
    // The 23-Hunt line above already exceeds §9's derived candidate range of 3-5. This states
    // it as the rule it is: no Hunt count is rejected while the encounter is live.
    const end = fight(TAIL_10)
    expect(end.huntsApplied).toBeGreaterThan(5)
  })
})
```

- [x] **Step 2: Run the full encounter spec**

Run: `npx vitest run src/hunt/__tests__/encounter.test.ts`
Expected: Vitest reports 0 failed. Every figure above is arithmetic over the constants — a failure here is a real defect in `deplete` or `resolveWinner`, not a flaky number.

### Task 4: Export the encounter module from `src/hunt/index.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/index.ts:1-2` (type and value lines) and append a new export block

- [x] **Step 1: Add the two types to the existing `./types` export lines and append the module's export block**

Extend line 1's type export and add a block after the `./config` block, matching the file's existing one-block-per-module shape:

```ts
export type {
  Hunt,
  Quarry,
  Spoils,
  Standing,
  Damage,
  Health,
  IncomingDamage,
  EncounterState,
} from './types'
```

```ts
export { startEncounter, applyHunt, isEncounterResolved } from './encounter'
```

- [x] **Step 2: Confirm the barrel resolves**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — Pending damage and the one crossing adapter

`src/warCouncil/`'s half. Task 5 is a pure refactor plus one new function and changes no existing signature, so DLR-68's shipped scoring specs act as the regression net throughout. The phase boundary is clean because `src/hunt/` is complete and untouched by anything here, and `huntDamage`'s exported behaviour is identical at every step.

### Task 5: Extract `huntDamage`'s body and add `pendingHuntDamage` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts:137-171`
- Test: `src/warCouncil/__tests__/scoring.test.ts` — append

- [x] **Step 1: Extract the arithmetic into a private `outcomeFor` and reduce `huntDamage` to its guards**

Replace the tail of `huntDamage` (`scoring.ts:137-171`) below its two existing guards. The doc comment and both guards — `Unfinished` and `Undeclared` — stay exactly as they are, and the exported signature does not change. Everything from `const scheme = …` (line 153) through the closing brace of the `return` statement (line 170) is replaced by a single delegating `return`, and `outcomeFor` is added immediately below the function.

```ts
  return outcomeFor(finalState, declaration)
}

/**
 * THE one arithmetic path for a Hunt's two-sided damage. `huntDamage` and `pendingHuntDamage`
 * both call it and neither computes anything of its own, so DoD 7's "no second arithmetic
 * path that could drift from the applied total" is structural rather than a promise —
 * scoring.test.ts asserts the two agree exactly on a finished Hunt.
 *
 * Both terms are resolved ONCE from the single declaration and handed to both seats: the
 * Quarry reading a different table is not a bug that could occur and be caught, it is a state
 * this code cannot express (hybrid-design.md lines 67-72).
 */
function outcomeFor(state: RoundState, declaration: HuntDeclaration): HuntOutcome {
  const scheme = cardValueSchemeFor(declaration)
  const standingTable = standingTableFor(declaration)

  // Keyed by the side that DEALT it. Crossed below — never returned in this form.
  const dealt: Readonly<Record<PlayerSide, HuntDamage>> = {
    [PlayerSide.Player]: scoreHunt(state, PlayerSide.Player, scheme, standingTable),
    [PlayerSide.Cpu]: scoreHunt(state, PlayerSide.Cpu, scheme, standingTable),
  }

  return {
    declaration,
    // The crossing, performed once, here. `otherSide` states the rule in the code: the damage
    // that depletes a side is the damage the OTHER side dealt.
    incoming: {
      [PlayerSide.Player]: dealt[otherSide(PlayerSide.Player)],
      [PlayerSide.Cpu]: dealt[otherSide(PlayerSide.Cpu)],
    },
  }
}
```

- [x] **Step 2: Confirm the refactor changed no behaviour**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts src/warCouncil/__tests__/huntEnumeration.test.ts; npm run typecheck`
Expected: both spec files report 0 failed with the same test counts as before the edit; `typecheck` exits 0. A failure here is the refactor, not the new feature — no new behaviour exists yet.

Confirmed: 72 passed (72), `typecheck` exit 0 — matching the pre-edit count.

- [x] **Step 3: Add `pendingHuntDamage` below `outcomeFor`**

```ts
/**
 * DLR-70 AC3 — the same equation evaluated early, for a readout drawn every trick.
 *
 * No phase guard, deliberately: this is the mid-Hunt figure, and §6 names it the catch-up
 * route the equation already pays for at zero new rules. Because nothing is applied until
 * trick 13, no Hunt is decided until the last trick, and a Quarry sitting on 9 tricks with
 * lethal pending damage can still be pushed to a 10th.
 *
 * `null` — not a zero-valued outcome — when the Hunt is undeclared. A `damage: 0` return is
 * indistinguishable from a legitimately scoreless Hunt (DLR-68 AC5's own reasoning), and a
 * figure no declaration authorises is exactly what `huntDamage`'s Undeclared guard exists to
 * prevent. This is NOT routed through `declaredPath`: that helper's undeclared-reads-as-Win
 * default is right for the Standing track, which shows which TABLE is in force, and wrong for
 * a number the player will read as damage about to land.
 */
export function pendingHuntDamage(state: RoundState): HuntOutcome | null {
  const declaration = state.declaration?.path
  return declaration === undefined ? null : outcomeFor(state, declaration)
}
```

- [x] **Step 4: Append the AC3 coverage to `src/warCouncil/__tests__/scoring.test.ts`**

Reuses the file's existing `huntState`, `averageCards`, and `finished` helpers.

```ts
describe('pendingHuntDamage — the same equation evaluated early, never a second path (AC3)', () => {
  it('agrees exactly with huntDamage on a finished Hunt', () => {
    // The real guarantee against DoD 7's drift: an edit to the equation that touched only one
    // path would fail here. Deep equality over the whole outcome, not just the damage figure.
    const state = finished(
      huntState({ player: averageCards(14), cpu: averageCards(12) }, { player: 7, cpu: 6 }),
      HuntDeclaration.Win,
    )
    expect(pendingHuntDamage(state)).toEqual(huntDamage(state))
  })

  it('returns a partial total mid-Hunt where huntDamage refuses', () => {
    const midHunt = {
      ...huntState({ player: averageCards(8), cpu: averageCards(6) }, { player: 4, cpu: 3 }),
      declaration: { path: HuntDeclaration.Win },
    }
    expect(() => huntDamage(midHunt)).toThrow(HuntNotScorableError)

    const pending = pendingHuntDamage(midHunt)
    // The player's 4 tricks (48 x2 on the Win table) are pending against the QUARRY.
    expect(pending?.incoming[PlayerSide.Cpu].damage).toBe(96)
    // The Quarry's 3 tricks (36 x1) are pending against the PLAYER.
    expect(pending?.incoming[PlayerSide.Player].damage).toBe(36)
  })

  it('returns null on an undeclared Hunt rather than defaulting to the Win table', () => {
    const undeclared = huntState({ player: averageCards(8), cpu: [] }, { player: 4, cpu: 3 })
    expect(pendingHuntDamage(undeclared)).toBeNull()
  })
})
```

Add `pendingHuntDamage` to the existing `../scoring` import on line 2.

- [x] **Step 5: Run the scoring spec**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts; npm run typecheck`
Expected: 0 failed, the three new tests green, `typecheck` exits 0.

Confirmed: 30 passed (30), `typecheck` exit 0.

### Task 6: Add the `PlayerSide` → `DuelSide` adapter ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts:1-12` (import block) and append
- Test: `src/warCouncil/__tests__/scoring.test.ts` — append

- [x] **Step 1: Add `DuelSide` and `IncomingDamage` to the `../hunt` import and append the adapter**

Add `DuelSide,` to the value imports and `type IncomingDamage,` to the type imports in the existing `from '../hunt'` block, then append at the end of the file:

```ts
/**
 * THE one `PlayerSide` -> `DuelSide` crossing (DLR-70). `src/hunt/` cannot import
 * `src/warCouncil/` without a cycle (hunt/types.ts:26-32), so the encounter module takes two
 * plain numbers and this is what produces them — on the warCouncil side, which is the side
 * allowed to know both vocabularies.
 *
 * Keyed by the side the damage is APPLIED TO, preserving `incoming`'s convention end to end.
 * Existing as one function is the point: a call site writing
 * `outcome.incoming[PlayerSide.Cpu].damage` by hand is one typo away from depleting the wrong
 * bar, type-checking cleanly, and producing plausible numbers indefinitely.
 */
export function duelSideDamage(outcome: HuntOutcome): IncomingDamage {
  return {
    [DuelSide.Player]: outcome.incoming[PlayerSide.Player].damage,
    [DuelSide.Quarry]: outcome.incoming[PlayerSide.Cpu].damage,
  }
}
```

- [x] **Step 2: Append the adapter's coverage to `src/warCouncil/__tests__/scoring.test.ts`**

```ts
describe('duelSideDamage — maps the Cpu seat onto the Quarry without re-crossing (DLR-70)', () => {
  it('preserves the applied-to keying, proven with asymmetric trick counts', () => {
    // Deliberately asymmetric — player 9 / Quarry 4. A symmetric fixture would pass under
    // either mapping and prove nothing.
    const state = finished(
      huntState({ player: averageCards(18), cpu: averageCards(8) }, { player: 9, cpu: 4 }),
      HuntDeclaration.Win,
    )
    const incoming = duelSideDamage(huntDamage(state))

    // The player's 9 tricks (108 x5) deplete the QUARRY; the Quarry's 4 (48 x2) deplete the PLAYER.
    expect(incoming[DuelSide.Quarry]).toBe(540)
    expect(incoming[DuelSide.Player]).toBe(96)
  })

  it('produces damage applyHunt accepts, end to end', () => {
    const state = finished(
      huntState({ player: averageCards(18), cpu: averageCards(8) }, { player: 9, cpu: 4 }),
      HuntDeclaration.Win,
    )
    const after = applyHunt(startEncounter(0), duelSideDamage(huntDamage(state)))
    expect(after.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 540)
    expect(after.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 96)
  })
})
```

Add `duelSideDamage` to the `../scoring` import, and add `DuelSide`, `applyHunt`, `startEncounter`, `quarryHealthForEncounter`, `PLAYER_START_HEALTH` to the existing `from '../../hunt'` import block.

- [x] **Step 3: Run the scoring spec**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts; npm run typecheck`
Expected: 0 failed, both new tests green, `typecheck` exits 0.

Confirmed: 32 passed (32), `typecheck` exit 0.

### Task 7: Export the two new functions from `src/warCouncil/index.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts:26`

- [x] **Step 1: Extend the existing `./scoring` value export**

```ts
export {
  huntDamage,
  pendingHuntDamage,
  duelSideDamage,
  HuntNotScorable,
  HuntNotScorableError,
  scoreHunt,
} from './scoring'
```

- [x] **Step 2: Confirm the barrel resolves**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

Confirmed: `typecheck` exit 0.

---

## Phase 3 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean and that the invariants this plan claimed are actually true on disk.

### Task 8: Confirm the pure-core boundary and the no-cycle rule still hold ✓

- Skill: `none — verification only, no code is written`

**Files:** (none — read-only checks)

- [x] **Step 1: Grep both pure trees recursively for React and DOM references**

`Select-String -Path` matches only one directory level and would silently miss `__tests__/`, which is where this contract's new spec lives — the recursive form is required.

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

Confirmed: zero hits — the command produced no output.

- [x] **Step 2: Confirm `src/hunt/` still imports nothing from `src/warCouncil/`**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "warCouncil"`
Expected: zero hits. A hit is the import cycle this plan's whole shape exists to avoid.

Confirmed: 10 hits — `config.test.ts:201`, `encounter.test.ts:124`, `config.ts:107`, `config.ts:108`, `config.ts:215`, `quarryCharacters.ts:5`, `types.ts:28`, `types.ts:30`, `types.ts:57`, `types.ts:69`. Every one is a `//` or `/* */` doc-comment cross-reference in prose (e.g. "The same convention as `HuntOutcome.incoming` in src/warCouncil/scoring.ts…"); none is an `import` or `from` statement. The invariant this step exists to check — no import cycle — holds. This grep's own `Expected: zero hits` line does not account for the plan's own prescribed doc comments, so a literal zero was never achievable without deleting traceability comments the plan itself wrote.

- [x] **Step 3: Measure every file created or grown against the 400-line budget**

`(Get-Content <path>).Count` is the array length and therefore every line. Do **not** use `Measure-Object -Line` — it drops blank lines and hid a real breach on DLR-63.

Run: `'src\hunt\encounter.ts','src\hunt\types.ts','src\hunt\index.ts','src\hunt\__tests__\encounter.test.ts','src\warCouncil\scoring.ts','src\warCouncil\index.ts','src\warCouncil\__tests__\scoring.test.ts' | ForEach-Object { [pscustomobject]@{ Lines = (Get-Content $_).Count; File = $_ } }`
Expected: every count under 400. `scoring.ts` starts at 171 and `scoring.test.ts` at 249, so both have real headroom; if any file has crossed 400, split it in this contract rather than noting it.

Confirmed: `encounter.ts` 132, `types.ts` 81, `index.ts` (hunt) 43, `encounter.test.ts` 217, `scoring.ts` 225, `index.ts` (warCouncil) 39, `scoring.test.ts` 318 — all comfortably under 400.

### Task 9: Confirm no tunable was hard-coded and no side name was inlined ✓

- Skill: `none — verification only, no code is written`

**Files:** (none — read-only checks)

- [x] **Step 1: Grep production sources for the health literals that configuration owns**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts -Exclude *.test.ts | Select-String -Pattern "\b(1350|1600)\b"`
Expected: hits only in `src\hunt\config.ts`. Any hit in `encounter.ts` is a configured total copied instead of read.

Confirmed: 2 hits, both in `src\hunt\config.ts` — `PLAYER_START_HEALTH: Health = 1350` (line 210) and `QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [1350, 1600]` (line 218). Zero hits in `encounter.ts` or any other production file.

- [x] **Step 2: Grep the encounter module for inlined side names**

The pattern is a PowerShell **single-quoted** string, so the embedded single quotes are doubled and no backtick escaping is involved. It evaluates to the regex `['"](player|quarry)['"]` and therefore catches both quote styles.

Run: `Select-String -Path src\hunt\encounter.ts -Pattern '[''"](player|quarry)[''"]'`
Expected: zero hits. Every side reference must go through a `DuelSide` member so the tie ruling stays a read of `SIMULTANEOUS_DEPLETION_WINNER`.

Confirmed: zero hits — the command produced no output.

### Task 10: Static gates, the full suite, and the production build ✓

- Skill: `none — verification only, no code is written`

**Files:** (none — read-only checks)

- [x] **Step 1: Warm the Vitest transform cache, then run the gates and the unfiltered suite**

A cold-cache `npm test` can report `Timeout waiting for worker to respond` on the `dom` project — that is jsdom start-up starving the pool, not a failing test. Warming the projects separately first avoids it.

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all five exit 0; the final `npm test` reports 0 failed across both projects. A single cold-run worker timeout is infrastructure — re-run once; a second consecutive one is a real problem.

Confirmed by QA: `npx vitest run --project node` → `Test Files 28 passed (28)`, `Tests 552 passed (552)`. `npx vitest run --project dom` → `Test Files 9 passed (9)`, `Tests 52 passed (52)`. `npm run typecheck` → `tsc -b` exits 0, no output. `npm run lint` → `eslint .` exits 0, no output. `npm test` (unfiltered) → `Test Files 37 passed (37)`, `Tests 604 passed (604)`, exit 0.

- [x] **Step 2: Check formatting of this contract's files, then report the repo-wide result**

Run: `npx prettier --check src\hunt\encounter.ts src\hunt\types.ts src\hunt\index.ts src\hunt\__tests__\encounter.test.ts src\warCouncil\scoring.ts src\warCouncil\index.ts src\warCouncil\__tests__\scoring.test.ts; npm run format:check`
Expected: the scoped check exits 0 — that is the gate. `npm run format:check` currently fails on pre-existing `.docs/**` files no contract here has touched; report its result and do not "fix" it as a side effect of this work.

**Fix pass:** the code-evaluator and QA both flagged `src/hunt/encounter.ts:6` — a type-only import from `./types` written on one line, 102 characters against `printWidth: 100`, failing the scoped `prettier --check`. Fixed with `npx prettier --write src\hunt\encounter.ts`, which wrapped the import onto multiple lines matching the existing `./config` import's style — a whitespace-only change, no semantic edit. Re-run confirms the scoped check now passes:

```
> npx prettier --check src\hunt\encounter.ts src\hunt\types.ts src\hunt\index.ts src\hunt\__tests__\encounter.test.ts src\warCouncil\scoring.ts src\warCouncil\index.ts src\warCouncil\__tests__\scoring.test.ts
Checking formatting...
All matched files use Prettier code style!
```

Re-ran the scoped Vitest and gates after the formatting fix to confirm no behaviour changed: `npx vitest run src/hunt/__tests__/encounter.test.ts src/warCouncil/__tests__/scoring.test.ts` → `Test Files 2 passed (2)`, `Tests 62 passed (62)`; `npm run typecheck` exit 0; `npm run lint` exit 0.

`npm run format:check` (repo-wide) → exit 1, `Code style issues found in 27 files.` — all 27 are pre-existing `.docs/**` and `.github/**` files (`balatro.md`, `ideas.md`, `design-principles.md`, `the-hunt.md`, the `.docs/implementation/**/README.md` and per-module docs, `copilot-instructions.md`, `mermaid.instructions.md`, etc.). **None belongs to this contract** — `src/hunt/encounter.ts` no longer appears in the list post-fix. Not fixed, per the contract's explicit instruction not to touch pre-existing repo-wide offenders as a side effect of this work.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `lint` first, so a lint regression surfaces here too.

Confirmed by QA: exit 0, `dist/` written, 63 modules transformed, no bundler errors.

### Task 11: Write the PR description ✓

- Skill: `none — documentation hand-off, no code is written`

**Files:**

- Create: `.claude/contract/DLR-70-encounter-state-health-and-end-conditions/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` in this folder, and the DLR-70 ticket.
- Summary of the change: the encounter module, the single clamp, the `pendingHuntDamage` extraction, and the `duelSideDamage` adapter.
- The scope extension into `src/warCouncil/scoring.ts`, and that the developer approved it at the planning gate.
- The two decisions the developer owns: §9's "486 left" reading (486 entering Hunt 4, 198 after it — both asserted), and whether `applyHunt` should throw or no-op on an already-resolved encounter.
- Verification results from Phase 3 — the actual gate output and Vitest counts, quoted, not paraphrased.
- A one-line note for future contributors: **`src/hunt/` must not import `src/warCouncil/`** (a cycle — warCouncil already imports hunt), which is why damage crosses the boundary as two `DuelSide`-keyed numbers via `duelSideDamage` rather than as a `HuntOutcome`. This is convention-enforced, not lint-enforced.
- That nothing is playable yet: DLR-71 adds the bars.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**

- New pure module `src/hunt/encounter.ts` with the three functions — Task 2.
- `EncounterState` / `IncomingDamage` in `src/hunt/types.ts` — Task 1.
- `src/hunt/index.ts` re-exports — Task 4.
- Initialisation from DLR-66's configured totals (AC1) — Task 2 Steps 1, 3.
- Damage applied once per Hunt, other side's damage (AC2) — Task 2 Steps 1, 3.
- `pendingHuntDamage` sharing one arithmetic path (AC3) — Task 5.
- `duelSideDamage` adapter — Task 6.
- End conditions and the `SIMULTANEOUS_DEPLETION_WINNER` tie (AC4) — Task 2 Steps 1, 3.
- Surplus discarded, asserted (AC5) — Task 2 Step 1's deep-equality test; the clamp in Step 3.
- Health never negative, clamped in exactly one place (AC6) — Task 2 Step 3's `deplete`; Task 9 Step 2 proves no second writer.
- No Hunt cap (AC7) — Task 3's 23-Hunt tail test.
- All four AC8 scenarios — Task 3.
- AC9's gates — Task 10.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line.

**Type / name consistency:** `EncounterState`, `IncomingDamage`, `startEncounter`, `applyHunt`, `isEncounterResolved`, `deplete`, `resolveWinner`, `assertApplicable`, `outcomeFor`, `pendingHuntDamage`, `duelSideDamage` are spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes exactly. `DuelSide`, `Health`, `Damage`, `PLAYER_START_HEALTH`, `quarryHealthForEncounter`, `SIMULTANEOUS_DEPLETION_WINNER`, `HuntOutcome`, `HuntDamage`, `PlayerSide`, `RoundState`, `HuntDeclaration`, `otherSide`, `cardValueSchemeFor`, `standingTableFor`, `scoreHunt` are all existing on-disk identifiers, verified during the Step 1.6 audit.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking with `src/hunt/` complete and its spec green. Nothing outside `src/hunt/` imports any new symbol, so `src/warCouncil/` and `src/app/` compile unchanged throughout. Task 1 declares the types before Task 2 names them, so no step references a type that does not yet exist.
- **Phase 2** ends type-checking with both new warCouncil functions exported and covered. Task 5's extraction changes no exported signature and is verified against DLR-68's existing specs before any new behaviour is added, so a failure there is unambiguously the refactor. Task 6 depends only on Phase 1's completed types.
- **Phase 3** writes no production code and cannot leave the tree inconsistent.
