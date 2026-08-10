# Tasks: The intent telegraph — split the CPU's move into intent and commit

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-10

**Goal:** Split `chooseCpuMove`'s single "decide and play" call into a pure `quarryIntent(state)` (telegraphed as suit + press/duck, never the exact card) and a separate `commitQuarryMove(state)` that plays it — additive only, so the existing CPU heuristic doesn't change at all.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/__tests__/quarryIntent.test.ts` — coverage for `quarryIntent` and `commitQuarryMove` (AC2–AC6)

**Modified:**
- `src/hunt/config.ts` — add `TelegraphFidelity` / `TELEGRAPH_FIDELITY` (AC4)
- `src/hunt/index.ts` — barrel-export the two new config symbols
- `src/warCouncil/cpuPlayer.ts` — add `QuarryIntentStance`, `QuarryIntent`, `quarryIntent`, `commitQuarryMove`
- `src/warCouncil/index.ts` — barrel-export the four new `cpuPlayer.ts` symbols

**Deleted:** (none)

**Developer decides or observes:** (none) — pure TypeScript, no dependency, no UI, no runtime judgement call; the one design choice flagged in `plan.md` Risks (the two-value fidelity enum vs. a single fixed constant) was resolved at the approval gate.

---

## Phase 1 — The fidelity gate: a two-value telegraph fidelity in T2's config

This phase touches only `src/hunt/`, adds one new exported type and one new exported constant, and changes nothing that reads them yet — it type-checks in isolation and nothing downstream depends on it existing until Phase 2.

### Task 1: Add `TelegraphFidelity` and `TELEGRAPH_FIDELITY` to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/config.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Write the failing test for the new config export**

Append to `src/hunt/__tests__/config.test.ts`, adding `TelegraphFidelity` and `TELEGRAPH_FIDELITY` to the existing import from `'../config'`:

```ts
describe('TELEGRAPH_FIDELITY', () => {
  it('defaults to SuitAndStance — DLR-52 AC4\'s stated default', () => {
    expect(TELEGRAPH_FIDELITY).toBe(TelegraphFidelity.SuitAndStance)
  })

  it('has exactly the two named fidelity levels', () => {
    expect(Object.values(TelegraphFidelity)).toEqual(
      expect.arrayContaining(['suit', 'suitAndStance']),
    )
    expect(Object.values(TelegraphFidelity)).toHaveLength(2)
  })
})
```

- [x] **Step 2: Run the scoped test and confirm it fails**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: fails — `TelegraphFidelity` / `TELEGRAPH_FIDELITY` do not exist in `../config` yet.

- [x] **Step 3: Add the fidelity type and constant to `src/hunt/config.ts`**

Append to the end of the file:

```ts
export const TelegraphFidelity = {
  Suit: 'suit', // narrowest — only the lead suit is telegraphed
  SuitAndStance: 'suitAndStance', // §4's stated default — suit plus pressing/ducking
} as const
export type TelegraphFidelity = (typeof TelegraphFidelity)[keyof typeof TelegraphFidelity]

// §4's visibility table / DLR-52 AC4 — the Quarry's next-trick intent is telegraphed at this
// fidelity, never as the exact card, so §4's hidden-hand row is never violated. Conservative
// default named at the DLR-52 planning gate; the single value most likely to move after T8's
// playtest.
export const TELEGRAPH_FIDELITY: TelegraphFidelity = TelegraphFidelity.SuitAndStance
```

- [x] **Step 4: Export both from the `src/hunt/index.ts` barrel**

Applied with one deviation from the literal diff below — see Notes in the Implementer Report for
Phase 1: `verbatimModuleSyntax` rejects the same identifier appearing in both the `export type {}`
line and the `export {}` line from the same module (`TS2300: Duplicate identifier`), so
`TelegraphFidelity` was added only to the value `export {}` line, matching the existing
`QuarryCharacter` pattern in this same barrel (type+value re-exported once, from the value line
only). `TELEGRAPH_FIDELITY` (value-only) was added as specified.

In the existing config export block, changed:

```ts
export type { StandingBand, DemandCurve } from './config'
export {
  StandingBandName,
  STANDING_BANDS,
  resolveStanding,
  cardBaseValue,
  DEMAND_CURVE,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
} from './config'
```

to:

```ts
export type { StandingBand, DemandCurve } from './config'
export {
  StandingBandName,
  STANDING_BANDS,
  resolveStanding,
  cardBaseValue,
  DEMAND_CURVE,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
} from './config'
```

- [x] **Step 5: Run the scoped test and typecheck**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: Vitest reports all tests passed, 0 failed; `tsc -b` exits 0.

---

## Phase 2 — The intent: a pure `quarryIntent(state)`

This phase adds the telegraph's read of the Quarry's move to `cpuPlayer.ts`, reusing the already-pure `chooseCpuCard` and `resolveTrickWinner` with no change to either. It type-checks and the new tests are green at the end of this phase, independent of Phase 3's commit step.

### Task 2: Add `QuarryIntentStance`, `QuarryIntent`, and `quarryIntent()` to `src/warCouncil/cpuPlayer.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/cpuPlayer.ts`
- Modify: `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/quarryIntent.test.ts`

- [x] **Step 1: Write the failing tests for `quarryIntent`**

Create `src/warCouncil/__tests__/quarryIntent.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { TelegraphFidelity } from '../../hunt'
import { quarryIntent, QuarryIntentStance } from '../cpuPlayer'
import { QUARRY_SIDE } from '../quarryRuleBreak'
import { PlayerSide, RoundPhase, type RoundState } from '../types'

function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [
      { suit: 'moons', rank: 2 },
      { suit: 'keys', rank: 6 },
    ],
    decree: { suit: 'bells', rank: 4 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    capturedCards: { player: [], cpu: [] },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('quarryIntent — leading (AC3)', () => {
  it('reports Leading with the suit of the lowest card in hand', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    expect(quarryIntent(state)).toEqual({ suit: 'bells', stance: QuarryIntentStance.Leading })
  })
})

describe('quarryIntent — following (AC3)', () => {
  it('reports Pressing when the Quarry would win the trick', () => {
    const state = stateWith({
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 5 } }],
      hands: { player: [], cpu: [{ suit: 'keys', rank: 9 }, { suit: 'keys', rank: 6 }] },
    })
    expect(quarryIntent(state)).toEqual({ suit: 'keys', stance: QuarryIntentStance.Pressing })
  })

  it('reports Ducking when no legal card would win', () => {
    const state = stateWith({
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 9 } }],
      hands: { player: [], cpu: [{ suit: 'keys', rank: 2 }, { suit: 'keys', rank: 4 }] },
    })
    expect(quarryIntent(state)).toEqual({ suit: 'keys', stance: QuarryIntentStance.Ducking })
  })
})

describe('quarryIntent — stability (AC2)', () => {
  it('returns a deeply equal result computed twice on the same state', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: { player: [], cpu: [{ suit: 'moons', rank: 7 }, { suit: 'bells', rank: 2 }] },
    })
    expect(quarryIntent(state)).toEqual(quarryIntent(state))
  })
})

describe('quarryIntent — fidelity (AC4)', () => {
  const state = stateWith({
    leader: QUARRY_SIDE,
    hands: { player: [], cpu: [{ suit: 'moons', rank: 7 }, { suit: 'bells', rank: 2 }] },
  })

  it('includes stance under the default SuitAndStance fidelity', () => {
    expect(quarryIntent(state).stance).toBe(QuarryIntentStance.Leading)
  })

  it('omits stance under the narrower Suit fidelity, with no other code change', () => {
    const wide = quarryIntent(state)
    const narrow = quarryIntent(state, TelegraphFidelity.Suit)
    expect(wide.stance).toBeDefined()
    expect(narrow.stance).toBeUndefined()
    expect(narrow.suit).toBe(wide.suit)
  })
})
```

- [x] **Step 2: Run the scoped test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/quarryIntent.test.ts`
Expected: fails — `quarryIntent` / `QuarryIntentStance` do not exist in `../cpuPlayer` yet.

- [x] **Step 3: Add the imports `quarryIntent` needs to `cpuPlayer.ts`**

Change the top of `src/warCouncil/cpuPlayer.ts` from:

```ts
import { cardsOfSuit, removeCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { resolveTrickWinner } from './resolveTrick'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  CardRank,
  type AbilityChoice,
  type Card,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'
```

to:

```ts
import { TelegraphFidelity, TELEGRAPH_FIDELITY } from '../hunt'
import { cardsOfSuit, removeCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { QUARRY_SIDE } from './quarryRuleBreak'
import { resolveTrickWinner } from './resolveTrick'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  CardRank,
  type AbilityChoice,
  type Card,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'
```

- [x] **Step 4: Add `QuarryIntentStance`, `QuarryIntent`, `deriveStance`, and `quarryIntent` to `cpuPlayer.ts`**

Append to the end of `src/warCouncil/cpuPlayer.ts`:

```ts
export const QuarryIntentStance = {
  Leading: 'leading',
  Pressing: 'pressing',
  Ducking: 'ducking',
} as const
export type QuarryIntentStance = (typeof QuarryIntentStance)[keyof typeof QuarryIntentStance]

export interface QuarryIntent {
  readonly suit: Suit
  // Omitted, not `undefined`-valued, when the configured fidelity is Suit-only — narrowing
  // the fidelity narrows the shape a caller actually receives (DLR-52 AC4).
  readonly stance?: QuarryIntentStance
}

// Derives the Quarry's stance for `card` against the trick already in progress — the exact
// win/duck test chooseCpuCard's own winners-filter performs internally, re-run here so
// quarryIntent never has to expose the card itself to get the same answer.
function deriveStance(state: RoundState, card: Card): QuarryIntentStance {
  if (state.currentTrick.length === 0) {
    return QuarryIntentStance.Leading
  }
  const lead = state.currentTrick[0]
  const wouldWin =
    resolveTrickWinner([lead, { side: QUARRY_SIDE, card }], state.trumpSuit) === QUARRY_SIDE
  return wouldWin ? QuarryIntentStance.Pressing : QuarryIntentStance.Ducking
}

/**
 * The telegraph's read of the Quarry's next move (§4, DLR-52) — never the card itself. Pure:
 * reads `state` and the configured fidelity, mutates nothing, safe to call any number of times
 * including under StrictMode's double-invoke (AC2). Covers both the leading and the following
 * case (AC3) via the same `currentTrick.length` branch chooseCpuCard already uses.
 */
export function quarryIntent(
  state: RoundState,
  fidelity: TelegraphFidelity = TELEGRAPH_FIDELITY,
): QuarryIntent {
  const card = chooseCpuCard(state, QUARRY_SIDE)
  if (fidelity === TelegraphFidelity.Suit) {
    return { suit: card.suit }
  }
  return { suit: card.suit, stance: deriveStance(state, card) }
}
```

Applied with one deviation from the literal code above — see the Implementer Report from the
DLR-52 review fix pass: the review round found `quarryIntent` crashed on an empty Quarry hand
(`RoundPhase.Complete`) and produced a plausible-but-wrong answer when called on a turn that
wasn't actually the Quarry's. The developer resolved this as a design decision during that
review: `quarryIntent`'s return type changed from `QuarryIntent` to `QuarryIntent | null`, and
the function now returns `null` when `state.phase === RoundPhase.Complete` or
`currentTurn(state) !== QUARRY_SIDE`, before ever calling `chooseCpuCard`. `plan.md`'s Data
shapes section still shows the pre-fix `QuarryIntent`-only return type and is intentionally not
rewritten to match, per this project's rule that the specification is never edited to match the
code.

- [x] **Step 5: Export the new symbols from `src/warCouncil/index.ts`**

Change:

```ts
export { chooseCpuMove } from './cpuPlayer'
export type { CpuMove } from './cpuPlayer'
```

to:

```ts
export { chooseCpuMove, quarryIntent, QuarryIntentStance } from './cpuPlayer'
export type { CpuMove, QuarryIntent } from './cpuPlayer'
```

- [x] **Step 6: Run the scoped test and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/quarryIntent.test.ts; npm run typecheck`
Expected: Vitest reports all tests passed, 0 failed; `tsc -b` exits 0.

---

## Phase 3 — The commit step, and the cross-cutting agreement proof

This phase adds the "commit step that plays it" AC1 names, as a pure pass-through over the existing, unmodified `chooseCpuMove` + `playCard`. It closes with the full-round simulation that proves intent and the committed move never disagree (AC5) across many seeds, and confirms the pre-existing `cpuPlayer.test.ts` suite is untouched and still green (AC6).

### Task 3: Add `commitQuarryMove()` to `src/warCouncil/cpuPlayer.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/cpuPlayer.ts`
- Modify: `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/quarryIntent.test.ts`

- [x] **Step 1: Write the failing test for `commitQuarryMove`**

Append to `src/warCouncil/__tests__/quarryIntent.test.ts`, adding `commitQuarryMove` to the existing import from `'../cpuPlayer'`:

```ts
describe('commitQuarryMove', () => {
  it('plays a legal move for the Quarry, matching what quarryIntent described', () => {
    const state = stateWith({
      leader: QUARRY_SIDE,
      hands: { player: [], cpu: [{ suit: 'moons', rank: 7 }, { suit: 'bells', rank: 2 }] },
    })
    const intent = quarryIntent(state)
    const result = commitQuarryMove(state)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.currentTrick).toHaveLength(1)
      expect(result.state.currentTrick[0].card.suit).toBe(intent.suit)
      expect(result.state.currentTrick[0].side).toBe(QUARRY_SIDE)
    }
  })
})
```

- [x] **Step 2: Run the scoped test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/quarryIntent.test.ts`
Expected: fails — `commitQuarryMove` does not exist in `../cpuPlayer` yet.

- [x] **Step 3: Add the `playCard` import and `commitQuarryMove` to `cpuPlayer.ts`**

Change the import block at the top of `cpuPlayer.ts` from:

```ts
import { TelegraphFidelity, TELEGRAPH_FIDELITY } from '../hunt'
import { cardsOfSuit, removeCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { QUARRY_SIDE } from './quarryRuleBreak'
import { resolveTrickWinner } from './resolveTrick'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  CardRank,
  type AbilityChoice,
  type Card,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'
```

to:

```ts
import { TelegraphFidelity, TELEGRAPH_FIDELITY } from '../hunt'
import { cardsOfSuit, removeCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { playCard } from './playCard'
import { QUARRY_SIDE } from './quarryRuleBreak'
import { resolveTrickWinner } from './resolveTrick'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  CardRank,
  type AbilityChoice,
  type Card,
  type PlayCardResult,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'
```

Append to the end of the file:

```ts
/**
 * The commit step DLR-52 AC1 names — plays exactly the move quarryIntent described, by calling
 * the existing, unmodified chooseCpuMove + playCard sequence. Named so a caller doesn't need to
 * know QUARRY_SIDE to invoke it.
 */
export function commitQuarryMove(state: RoundState): PlayCardResult {
  const move = chooseCpuMove(state, QUARRY_SIDE)
  return playCard(state, QUARRY_SIDE, move.card, move.choice)
}
```

Applied with one deviation from the literal code above — the same DLR-52 review fix pass noted
under Task 2 Step 4 found `commitQuarryMove` crashed and misfired for the identical two states
(round already complete; not actually the Quarry's turn). `commitQuarryMove`'s return type stays
`PlayCardResult` — its `{ ok: false, reason }` shape already models failure — so the fix guards
both states before calling `chooseCpuMove`, returning `{ ok: false, reason:
IllegalMoveReason.RoundComplete }` or `{ ok: false, reason: IllegalMoveReason.NotYourTurn }`
respectively, mirroring the reasons `playCard` itself gives for the same states. `plan.md` is
intentionally not edited to match, per this project's rule that the specification is never
rewritten to match the code.

- [x] **Step 4: Export `commitQuarryMove` from `src/warCouncil/index.ts`**

Change:

```ts
export { chooseCpuMove, quarryIntent, QuarryIntentStance } from './cpuPlayer'
```

to:

```ts
export { chooseCpuMove, commitQuarryMove, quarryIntent, QuarryIntentStance } from './cpuPlayer'
```

- [x] **Step 5: Run the scoped test and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/quarryIntent.test.ts; npm run typecheck`
Expected: Vitest reports all tests passed, 0 failed; `tsc -b` exits 0.

### Task 4: Full-round simulation proving intent and commit never disagree (AC5), and confirming the existing suite is unchanged (AC6) ✓

- Skill: react-frontend

**Files:**
- Test: `src/warCouncil/__tests__/quarryIntent.test.ts`

- [x] **Step 1: Add the seeded full-round simulation test**

Append to `src/warCouncil/__tests__/quarryIntent.test.ts`, adding `chooseCpuMove` to the existing import from `'../cpuPlayer'` and adding new imports for `dealRound`, `playCard`, `resolveTrickWinner`, and `currentTurn`:

```ts
import { dealRound } from '../deal'
import { playCard } from '../playCard'
import { resolveTrickWinner } from '../resolveTrick'
import { currentTurn } from '../types'

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('quarryIntent and commitQuarryMove — simulated full rounds (AC5, AC6)', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

  it.each(seeds)(
    'intent and the committed move agree on suit and stance every Quarry turn (seed %i)',
    (seed) => {
      let state = dealRound(seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu, lcg(seed))
      let guard = 0
      let quarryTurns = 0

      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)

        if (turn === QUARRY_SIDE) {
          quarryTurns += 1
          const intent = quarryIntent(state)
          const move = chooseCpuMove(state, QUARRY_SIDE)
          expect(move.card.suit).toBe(intent.suit)
          if (intent.stance !== QuarryIntentStance.Leading) {
            const lead = state.currentTrick[0]
            const wouldWin =
              resolveTrickWinner([lead, { side: QUARRY_SIDE, card: move.card }], state.trumpSuit) ===
              QUARRY_SIDE
            expect(intent.stance === QuarryIntentStance.Pressing).toBe(wouldWin)
          }
          const result = commitQuarryMove(state)
          if (!result.ok) throw new Error(`illegal commit at seed ${seed}: ${result.reason}`)
          state = result.state
        } else {
          const move = chooseCpuMove(state, turn)
          const result = playCard(state, turn, move.card, move.choice)
          if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
          state = result.state
        }
      }

      expect(quarryTurns).toBeGreaterThan(0)
      expect(state.tricksPlayed).toBe(13)
    },
  )
})
```

Applied with one deviation from the literal test code shown across Tasks 2, 3, and 4 above — see
the note under Task 2 Step 4. Since the return-type change (`QuarryIntent | null`) landed in the
DLR-52 review fix pass, after all four tasks' literal snippets were originally written,
`src/warCouncil/__tests__/quarryIntent.test.ts` was updated in that same pass to null-narrow every
call site that dereferences `.suit`/`.stance` (an explicit `expect(...).not.toBeNull()` guard or a
whole-object `toEqual`, never a `!` non-null assertion), and this simulation now throws loudly if
`quarryIntent` is ever `null` on a turn `currentTurn` already confirms is the Quarry's. The same
pass also strengthened the AC4 "omits stance" assertion to check the key's absence directly
(`'stance' in narrow`) rather than `toBeUndefined()`, and added three new `describe` blocks proving
`quarryIntent`/`commitQuarryMove` return `null`/`{ ok: false, reason }` for the guarded states
noted under Task 2 Step 4 and Task 3 Step 3. The file on disk is the current source of truth; the
snippets above are retained as the phase's original intent, not a literal diff of the current file.

- [x] **Step 2: Run the new test file and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/quarryIntent.test.ts; npm run typecheck`
Expected: Vitest reports all tests passed, 0 failed; `tsc -b` exits 0.

- [x] **Step 3: Confirm the existing CPU test suite is untouched and still green (AC6)**

Run: `git status --porcelain -- src/warCouncil/__tests__/cpuPlayer.test.ts; npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: the `git status` line prints no output (file untouched); Vitest reports the same test count as before this contract, 0 failed.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 5: Confirm no fidelity or stance check bypasses the exported `as const` symbols ✓

- [x] **Step 1: Grep for a raw string comparison instead of the exported enum members**

Run: `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "===\s*'suitAndStance'|===\s*'suit'|stance\s*===\s*'(pressing|ducking|leading)'"`
Expected: zero hits — `cpuPlayer.ts`'s own `fidelity === TelegraphFidelity.Suit` check reads the exported symbol, not a raw string, and the `as const` object definitions in `config.ts`/`cpuPlayer.ts` (`Suit: 'suit'`, `Leading: 'leading'`, etc.) are key-value declarations, not comparisons, so they don't match this pattern.

### Task 6: Static gates and full suite ✓

Executed by QA (this contract reserves the unfiltered suite and the build for QA, not the
Implementer). Both steps run twice — once in the round-1 review and again in the round-2
verification round after the fix pass.

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports `0 failed` with a higher total test count than before this contract (Phase 1's config tests + Phase 2/3/4's `quarryIntent.test.ts` file, all newly added).
Actual (round 2, post-fix-pass): `tsc -b` exit 0; `eslint .` exit 0, zero warnings; `npm test` → **Test Files 25 passed (25), Tests 398 passed (398)**, 0 failed — up from 393 in round 1, the +5 being the guarded-state tests the fix pass added.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Actual: exit 0; `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js` written; no bundler errors.

### Task 7: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: split `chooseCpuMove` into a pure `quarryIntent(state)` (telegraphed as suit + press/duck) and an additive `commitQuarryMove(state)`, plus the `TelegraphFidelity` config gate in `src/hunt/config.ts`.
- The one design choice the developer already confirmed at the approval gate: the fidelity is a real two-value enum (`Suit` / `SuitAndStance`), not a single fixed constant.
- Verification results from Phase 4 (typecheck, lint, full suite counts before/after, build).
- One-line note for future contributors: any future CPU-facing telegraph should read `TELEGRAPH_FIDELITY` from `src/hunt/config.ts` rather than inlining a fidelity check, and any new `QuarryIntentStance` value needs a `never`-guarded `switch` per `react-frontend`'s "Exhaustiveness checking" section.

---

## Self-review

**Spec coverage:**
- AC1 (split into `quarryIntent` + a commit step) — Tasks 2, 3.
- AC2 (stability) — Task 2, Step 1 (`quarryIntent — stability` describe block).
- AC3 (both leading and following) — Task 2, Step 1 (`quarryIntent — leading` / `— following` describe blocks).
- AC4 (stated fidelity, config-driven, widened/narrowed with no other edit) — Task 1 (the config constant), Task 2 Step 1 (`quarryIntent — fidelity` describe block).
- AC5 (intent and committed move never disagree, full simulated round) — Task 4.
- AC6 (existing `cpuPlayer.ts` behaviour and test suite preserved) — satisfied by construction (Tasks 2–3 never edit `chooseCpuMove`/`chooseCpuCard`/`playCard`), verified by Task 4 Step 3.
- AC7 (no timer, no effect) — satisfied by construction; every function added is a plain synchronous call chain, confirmed by inspection in Tasks 2–3 (no new step needed, nothing to grep).
- AC8 (typecheck/lint/scoped Vitest green) — every task's final step; Task 6 for the unfiltered suite.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `TelegraphFidelity` / `TELEGRAPH_FIDELITY`, `QuarryIntentStance`, `QuarryIntent`, `quarryIntent`, `commitQuarryMove` are spelled identically across Tasks 1–4 and match `plan.md` Part 2 → Data shapes exactly. `QUARRY_SIDE` is imported, never redefined.

**Phase boundary cleanliness:** Phase 1 type-checks with `src/hunt/config.ts` holding a new, unconsumed export — no dangling import anywhere. Phase 2 type-checks with `quarryIntent` fully wired and tested, independent of Phase 3's commit step. Phase 3 type-checks with both `quarryIntent` and `commitQuarryMove` complete and cross-tested. Phase 4 makes no production change.
