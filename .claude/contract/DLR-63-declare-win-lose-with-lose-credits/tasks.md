# Tasks: Win/Lose declare with capped Lose-credits, in the single-Hunt slice

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-11

**Goal:** Put one decision at the front of every Hunt — declare Win or Lose off the dealt hand — where Lose inverts card value (`12 − r`) and hands the player a capped pool of Lose-credits, each spendable on one lost trick, with Standing and the Demand check unchanged for both paths; plus the sorted hand and the new card face.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (developer-approved 2026-08-11).

---

## File map

**Created:**

- `src/warCouncil/declareHunt.ts` — `declareHunt` plus its `DeclareRejection` / `DeclareResult` types
- `src/warCouncil/__tests__/declareHunt.test.ts` — the two rejection guards and the written shape
- `src/warCouncil/claimLostTrick.ts` — `claimLostTrick`, `canClaimLostTrick`, `ClaimRejection`, `ClaimResult`
- `src/warCouncil/__tests__/claimLostTrick.test.ts` — the four rejection guards, the credit decrement, idempotence
- `src/app/warCouncil/handOrder.ts` — `sortHandForDisplay`, AC6's three-key display sort
- `src/app/warCouncil/__tests__/handOrder.test.ts` — the three keys, tie-break totality, no-mutation
- `src/app/warCouncil/DeclareGate.tsx` — AC1's declare step
- `src/app/warCouncil/__tests__/DeclareGate.test.tsx` — both choices, keyboard reachability, hand stays visible
- `.claude/contract/DLR-63-declare-win-lose-with-lose-credits/pr-description.md` — the paste-ready PR body

**Unchanged, and deliberately so:**

- `src/app/warCouncilMount.ts` — `WarCouncilMountProps` needs no edit; `Hunt` widens underneath it, which is exactly why the field was made required
- `src/hunt/config.ts`'s `STANDING_BANDS` / `resolveStanding`, `src/warCouncil/scoring.ts` — AC4 and AC5 forbid touching either; Task 21 Step 3 proves it by grep
- `src/warCouncil/cpuPlayer.ts` — the Quarry does not read the declaration

**Modified:**

- `src/hunt/types.ts` — add `HuntDeclaration`; add `loseCredits` to `Hunt`
- `src/hunt/config.ts` — add `RANK_INVERSION_PIVOT`, `invertedCardValue`, `LOSE_CREDITS_PER_HUNT`
- `src/hunt/index.ts` — re-export the five new names
- `src/hunt/__tests__/config.test.ts` — cover `invertedCardValue`
- `src/warCouncil/types.ts` — add `DeclarationState`; add `declaration?` to `RoundState`; add `HuntNotDeclared` to `IllegalMoveReason`
- `src/warCouncil/spoils.ts` — two-branch on the declaration, fourth injectable parameter
- `src/warCouncil/__tests__/spoils.test.ts` — the Lose branch, the unchanged Win branch
- `src/warCouncil/playCard.ts` — the `HuntNotDeclared` guard
- `src/warCouncil/__tests__/playCard.test.ts` — the new guard, and that declared rounds are unaffected
- `src/warCouncil/index.ts` — re-export the new engine surface
- `src/app/warCouncil/roundReducer.ts` — `Declare` and `ClaimTrick` actions
- `src/app/warCouncil/__tests__/roundReducer.test.ts` — both new actions and their no-op paths
- `src/app/warCouncil/WarCouncilRound.tsx` — the felt cascade's new first branch, the sorted hand, the derived claim
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` — the gate blocks play, the claim commits, the sort renders
- `src/app/warCouncil/TrickWell.tsx` — the claim control on a held lost trick
- `src/app/warCouncil/HuntLedger.tsx` — the conditional credits cell
- `src/app/warCouncil/__tests__/HuntLedger.test.tsx` — cell present under Lose, absent under Win, zero renders
- `src/app/warCouncil/labels.ts` — declaration/rejection copy, plus one `ILLEGAL_MOVE_MESSAGE` entry
- `src/app/warCouncil/__tests__/labels.test.ts` — the new maps are exhaustive
- `src/app/warCouncil/__tests__/roundFixture.ts` — `huntFixture` gains `loseCredits`
- `src/app/warCouncil/warCouncilCards.css` — AC7's suit border and bottom-left mark
- `src/app/warCouncil/warCouncilHunt.css` — the declare gate, the claim row, the credits cell
- `src/App.tsx` — pass `LOSE_CREDITS_PER_HUNT` into `HUNT`

**Deleted:** (none)

**Developer decides or observes:**

- `src/hunt/config.ts` → `LOSE_CREDITS_PER_HUNT` — ships as a documented placeholder of `3`, derived from `220 / (6 × 12) ≈ 3` against `FIXED_DEMAND`. **The value is the developer's.** Watch whether a Hunt ever ends with an unspent credit, or a spend is regretted; if neither happens, 3 is too many.
- Rank direction *within* a suit — ascending is the chosen default. Descending puts high cards leftmost (better on Win); ascending puts the valuable cards leftmost under Lose. One line in `sortHandForDisplay`.
- Whether the hand re-ordering mid-round (holding sizes change as cards leave, so a suit can lose its leftmost slot) reads as the hand tidying itself or as cards moving under your finger. Fallback is fixed `ALL_SUITS` order — the same one line.
- AC7's card face: border width, the mark's corner offset, and whether a suit-coloured border reads as information or decoration at `--wc-card-w`'s `clamp(2.9rem, 6.2vmin, 4.3rem)`. The mockup carries a transcribable default.
- Whether the declare gate's tap, on top of trick 1's existing "Let them lead" tap, opens the Hunt as a decision or as a speed bump.
- Whether declaring Lose is worth declaring at all. It lands in Humble, which `hybrid-design.md` §6 proves is dominated at ×6 — AC4 forbids touching a multiplier here, so a weak first playtest is expected and is not this ticket's defect.

---

## Phase 1 — Config and domain types

The vocabulary layer: the declaration union, the inverted-value function, the credit cap, and the `Hunt` field that carries it. Everything here is pure data and pure functions inside the lint-enforced core, with no consumer yet — so the phase ends type-checking with the whole existing suite still green, and no behaviour has changed anywhere.

### Task 1: Add `HuntDeclaration` and widen `Hunt` in `src/hunt/types.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/types.ts`

- [x] **Step 1: Add the declaration union, following the file's existing `as const` map idiom**

Append after the `QuarryCharacter` block:

```ts
/** DLR-63 AC1: the path declared off the dealt hand, before the first trick. */
export const HuntDeclaration = {
  Win: 'win',
  Lose: 'lose',
} as const
export type HuntDeclaration = (typeof HuntDeclaration)[keyof typeof HuntDeclaration]
```

- [x] **Step 2: Add the required `loseCredits` field to `Hunt`**

Replace the `Hunt` interface body:

```ts
export interface Hunt {
  readonly quarry: Quarry
  readonly demand: Demand
  /**
   * DLR-63 AC3: the capped pool a Lose declaration hands the player. Required for the
   * same reason `demand` is — an optional count would let a caller render a Lose path
   * with `undefined` credits and no error anywhere.
   */
  readonly loseCredits: number
}
```

- [x] **Step 3: Confirm the intended compile break, and only the intended one**

Run: `npm run typecheck`
Expected: exits non-zero with errors at exactly two `Hunt` construction sites — `src/App.tsx` and `src/app/warCouncil/__tests__/roundFixture.ts`. Both are closed by Task 4, inside this phase. Any third site is a construction the audit missed — stop and report it rather than patching past it.

### Task 2: Add the inverted value and the credit cap to `src/hunt/config.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts`
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — add `LOSE_CREDITS_PER_HUNT` (value is a developer decision)

- [x] **Step 1: Write the failing spec for `invertedCardValue` across the whole rank range**

Append to `src/hunt/__tests__/config.test.ts`, and add `invertedCardValue` / `RANK_INVERSION_PIVOT` to the existing import block at the top of that file:

```ts
describe('invertedCardValue — DLR-63 AC3', () => {
  it.each([
    [1, 11],
    [2, 10],
    [6, 6],
    [10, 2],
    [11, 1],
  ])('inverts rank %i to %i', (rank, expected) => {
    expect(invertedCardValue(rank)).toBe(expected)
  })

  it('is symmetric across the 1-11 deck — every rank maps into the same range', () => {
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    expect(ranks.map(invertedCardValue).sort((a, b) => a - b)).toEqual(ranks)
  })

  it('is its own inverse', () => {
    for (const rank of [1, 5, 8, 11]) {
      expect(invertedCardValue(invertedCardValue(rank))).toBe(rank)
    }
  })

  it('pivots on max rank + 1, so no rank inverts to zero or below', () => {
    expect(RANK_INVERSION_PIVOT).toBe(12)
    expect(invertedCardValue(11)).toBeGreaterThan(0)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails on the missing export, not on a wrong value**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits non-zero. The failure is a transform/collection error naming `invertedCardValue` — not an assertion failure. A `Tests N failed` line with assertion diffs means the export already exists and something else is wrong.

(Observed: `TypeError: invertedCardValue is not a function` / `expected undefined to be 12` across 8 failing tests — a missing-export failure under Vitest's esbuild ESM transform, not a wrong-value assertion diff. Same underlying signal, different error shape than "transform/collection error".)

- [x] **Step 3: Add the pivot, the function, and the credit cap**

Append to `src/hunt/config.ts`, after `cardBaseValue`:

```ts
// DLR-63 AC3's `12 − r`. NOT a tuning value: 12 is max(RANKS) + 1 for the 1-11 deck,
// so the inversion is symmetric (rank 1 <-> 11) and its own inverse. Named rather than
// inlined so a future deck-size change has exactly one place to look.
export const RANK_INVERSION_PIVOT = 12

/**
 * DLR-63 AC3 — a card's value on the Lose path. Deliberately the same
 * `(rank: number) => number` signature as `cardBaseValue`, so it drops into `spoils`'s
 * injectable value parameter with no new plumbing.
 */
export function invertedCardValue(rank: number): number {
  return RANK_INVERSION_PIVOT - rank
}

// DLR-63 AC3 "a capped number of Lose-credits".
// UNIT: credits per Hunt — each spendable on exactly one lost trick.
// VALUE: a DEVELOPER DECISION (DLR-63 plan.md -> Risks). The number below is derived
// arithmetic offered for review, not a chosen value: against FIXED_DEMAND (220) and
// STANDING_BANDS' Humble x6, a credited trick is worth the two cards' inverted values —
// about 12 on an average trick, up to 22 on a two-Swan trick. Clearing 220 therefore
// needs roughly 220 / (6 * 12) ~= 3 average credited tricks, or 2 in the best case.
// 3 sits at that break-even and is the number most likely to move after the first
// playtest. Typed `number`, never `number | null`, so no consumer can coerce a null to 0.
export const LOSE_CREDITS_PER_HUNT = 3
```

- [x] **Step 4: Run the spec green**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 3: Re-export the new `src/hunt` surface ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/index.ts`

- [x] **Step 1: Add the five new names to the existing barrel exports**

In the `export type { … } from './types'` line add `HuntDeclaration` to the *value* export beside `QuarryCharacter` (it is an `as const` map plus a type, so it needs both a value and a type export exactly as `QuarryCharacter` does):

```ts
export { QuarryCharacter, HuntDeclaration } from './types'
```

And add to the `from './config'` value export block:

```ts
  RANK_INVERSION_PIVOT,
  invertedCardValue,
  LOSE_CREDITS_PER_HUNT,
```

- [x] **Step 2: Confirm the barrel resolves**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits 0. This spec imports through the module directly, so a green run plus Task 1 Step 3's known two-site break is the signal; the barrel itself is proven by Phase 2's consumers.

### Task 4: Supply the credit cap at both `Hunt` construction sites ✓

Both sites move together, in one task, because `Hunt` is a shape change and splitting it across a phase boundary would leave the tree not type-checking.

- Skill: `react-frontend`

**Files:**

- Modify: `src/App.tsx:1-13`
- Modify: `src/app/warCouncil/__tests__/roundFixture.ts:48-53`

- [x] **Step 1: Import the constant and add it to the module-scope `HUNT`**

Replace the import and the `HUNT` literal:

```tsx
import {
  FIXED_DEMAND,
  LOSE_CREDITS_PER_HUNT,
  SLICE_QUARRY_CHARACTER,
  type Hunt,
} from './hunt'

// The slice's single encounter (§11): one fixed Demand, one Quarry, one Lose-credit pool.
// Built once at module scope because all three halves are configuration constants — it
// holds no per-round state, so it cannot go stale across the remounts below.
const HUNT: Hunt = {
  quarry: { character: SLICE_QUARRY_CHARACTER },
  demand: FIXED_DEMAND,
  loseCredits: LOSE_CREDITS_PER_HUNT,
}
```

- [x] **Step 2: Give the component-test fixture its own credit pool, as a literal**

In `src/app/warCouncil/__tests__/roundFixture.ts`:

```ts
/** A fixed Hunt for component tests — literal Demand and credit pool, so a test never
 *  depends on the developer-owned FIXED_DEMAND / LOSE_CREDITS_PER_HUNT values and never
 *  breaks when either is retuned. */
export const huntFixture: Hunt = {
  quarry: { character: QuarryCharacter.Monarch },
  demand: 100,
  loseCredits: 2,
}
```

- [x] **Step 3: Confirm the phase closes clean**

Run: `npm run typecheck; npx vitest run src/hunt`
Expected: both exit 0, no errors reported, Vitest reports 0 failed. Phase 1 ends with the tree type-checking and no half-applied shape change.

---

## Phase 2 — The engine: declaration state, the two entry points, and Spoils

The rules layer, entirely inside the pure core. `RoundState` widens by one optional field, two guarded entry points join `playCard` as mutators, and `spoils` becomes two-branch. The phase ends with every new rule unit-tested and — critically — **the entire pre-existing suite still green**, which is how AC2's "Win works exactly as today" is proved: no existing fixture declares, and undeclared scores identically to Win.

### Task 5: Add `DeclarationState`, widen `RoundState`, and close the copy map ✓

`IllegalMoveReason` and its exhaustive `Record<IllegalMoveReason, string>` copy map change in the **same** task: the union and its readers are one shape, and splitting them would leave the phase boundary not type-checking.

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/types.ts`
- Modify: `src/app/warCouncil/labels.ts` — the one new `ILLEGAL_MOVE_MESSAGE` entry

- [x] **Step 1: Import the declaration union and add the state interface**

Extend the existing type-only import at the top of the file:

```ts
import type { HuntDeclaration, QuarryCharacter } from '../hunt'
```

Add above `RoundState`:

```ts
/**
 * DLR-63: the declaration made before the first trick, plus the Lose path's bookkeeping.
 * One nested object rather than three sibling fields so a reader has exactly one
 * absence check.
 */
export interface DeclarationState {
  readonly path: HuntDeclaration
  /** Credits not yet spent. Always `0` when `path` is `Win`. */
  readonly creditsRemaining: number
  /** Cards credited to the player's Spoils from lost tricks. Always empty when `path` is `Win`. */
  readonly creditedCards: readonly Card[]
  /**
   * `tricksPlayed` at the moment the most recent credit was spent. A credit may only be
   * spent on the trick that just resolved and `tricksPlayed` strictly increases, so this
   * makes a second claim on one trick a rejection rather than a double-credit.
   */
  readonly creditedThrough: number
}
```

- [x] **Step 2: Add the optional field to `RoundState`, beside `quarryCharacter`**

```ts
  /**
   * DLR-63 AC1/AC3. Written by `declareHunt`, updated only by `claimLostTrick`, and
   * carried by every existing state spread. Optional — absent means undeclared, which is
   * the pre-DLR-63 shape every existing spec fixture holds, and which `spoils` treats
   * identically to a Win declaration (AC2). Required would break 22 hand-built
   * `RoundState` literals for no gain; this follows `quarryCharacter?`'s precedent.
   */
  readonly declaration?: DeclarationState
```

- [x] **Step 3: Add the one new rejection reason**

Add to the `IllegalMoveReason` map, after `RoundComplete`:

```ts
  HuntNotDeclared: 'huntNotDeclared',
```

- [x] **Step 4: Add the matching copy entry, in this same task**

In `src/app/warCouncil/labels.ts`, add to `ILLEGAL_MOVE_MESSAGE`:

```ts
  [IllegalMoveReason.HuntNotDeclared]: 'Declare Win or Lose before you play a card.',
```

Nothing else in `labels.ts` changes here — the three *new* copy maps are Task 11's, and they add no exhaustiveness obligation to an existing type.

- [x] **Step 5: Confirm the tree still type-checks**

Run: `npm run typecheck`
Expected: exits 0, no errors reported. The union widened and its one exhaustive reader widened with it, so nothing is left half-applied.

### Task 6: Add `declareHunt` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/warCouncil/declareHunt.ts`
- Test: `src/warCouncil/__tests__/declareHunt.test.ts`

- [x] **Step 1: Write the failing spec**

Create `src/warCouncil/__tests__/declareHunt.test.ts`. Build fixtures with the same hand-built `RoundState` literal shape `src/warCouncil/__tests__/spoils.test.ts` already uses.

```ts
import { describe, expect, it } from 'vitest'
import { HuntDeclaration } from '../../hunt'
import { declareHunt, DeclareRejection } from '../declareHunt'
import { PlayerSide, RoundPhase, type RoundState } from '../types'

function undeclaredRound(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
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

describe('declareHunt — AC1', () => {
  it('writes a Win declaration with no credits and no credited cards', () => {
    const result = declareHunt(undeclaredRound(), HuntDeclaration.Win, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.declaration).toEqual({
      path: HuntDeclaration.Win,
      creditsRemaining: 0,
      creditedCards: [],
      creditedThrough: 0,
    })
  })

  it('writes a Lose declaration carrying the supplied credit pool', () => {
    const result = declareHunt(undeclaredRound(), HuntDeclaration.Lose, 3)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.declaration?.path).toBe(HuntDeclaration.Lose)
    expect(result.state.declaration?.creditsRemaining).toBe(3)
  })

  it('does not mutate the input state', () => {
    const before = undeclaredRound()
    declareHunt(before, HuntDeclaration.Lose, 3)
    expect(before.declaration).toBeUndefined()
  })

  it('rejects a second declaration', () => {
    const first = declareHunt(undeclaredRound(), HuntDeclaration.Win, 3)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = declareHunt(first.state, HuntDeclaration.Lose, 3)
    expect(second).toEqual({ ok: false, reason: DeclareRejection.AlreadyDeclared })
  })

  it('rejects a declaration once a trick has been played', () => {
    const result = declareHunt(undeclaredRound({ tricksPlayed: 1 }), HuntDeclaration.Win, 3)
    expect(result).toEqual({ ok: false, reason: DeclareRejection.HuntUnderway })
  })

  it('rejects a declaration once a card is on the table', () => {
    const underway = undeclaredRound({
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'bells', rank: 4 } }],
      phase: RoundPhase.AwaitingFollow,
    })
    expect(declareHunt(underway, HuntDeclaration.Win, 3)).toEqual({
      ok: false,
      reason: DeclareRejection.HuntUnderway,
    })
  })
})
```

- [x] **Step 2: Run it and confirm it fails on the missing module**

Run: `npx vitest run src/warCouncil/__tests__/declareHunt.test.ts`
Expected: exits non-zero with a "Failed to load" / transform error naming `../declareHunt`.

- [x] **Step 3: Implement it**

Create `src/warCouncil/declareHunt.ts`:

```ts
import { HuntDeclaration } from '../hunt'
import type { RoundState } from './types'

export const DeclareRejection = {
  AlreadyDeclared: 'alreadyDeclared',
  HuntUnderway: 'huntUnderway',
} as const
export type DeclareRejection = (typeof DeclareRejection)[keyof typeof DeclareRejection]

export type DeclareResult =
  | { readonly ok: true; readonly state: RoundState }
  | { readonly ok: false; readonly reason: DeclareRejection }

/**
 * AC1: writes the declaration once, before the first card is played. Shaped like
 * `playCard` — a named rejection rather than a throw, and the input state is never
 * partially mutated.
 *
 * `loseCredits` is supplied by the caller rather than read from config here, so this
 * module stays free of the tunable and a test can vary the pool without touching
 * `LOSE_CREDITS_PER_HUNT`. It is ignored on the Win path by construction.
 */
export function declareHunt(
  state: RoundState,
  path: HuntDeclaration,
  loseCredits: number,
): DeclareResult {
  if (state.declaration !== undefined) {
    return { ok: false, reason: DeclareRejection.AlreadyDeclared }
  }
  if (state.tricksPlayed > 0 || state.currentTrick.length > 0) {
    return { ok: false, reason: DeclareRejection.HuntUnderway }
  }

  return {
    ok: true,
    state: {
      ...state,
      declaration: {
        path,
        creditsRemaining: path === HuntDeclaration.Lose ? loseCredits : 0,
        creditedCards: [],
        creditedThrough: 0,
      },
    },
  }
}
```

- [x] **Step 4: Run the spec green**

Run: `npx vitest run src/warCouncil/__tests__/declareHunt.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 7: Add `claimLostTrick` and `canClaimLostTrick` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/warCouncil/claimLostTrick.ts`
- Test: `src/warCouncil/__tests__/claimLostTrick.test.ts`

- [x] **Step 1: Write the failing spec, covering all four guards and idempotence**

Create `src/warCouncil/__tests__/claimLostTrick.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { HuntDeclaration } from '../../hunt'
import { canClaimLostTrick, ClaimRejection, claimLostTrick } from '../claimLostTrick'
import { QUARRY_SIDE } from '../quarryRuleBreak'
import {
  PlayerSide,
  RoundPhase,
  type Card,
  type DeclarationState,
  type RoundState,
  type TrickCard,
} from '../types'

const lead: TrickCard = { side: PlayerSide.Player, card: { suit: 'keys', rank: 1 } }
const follow: TrickCard = { side: QUARRY_SIDE, card: { suit: 'keys', rank: 6 } }
const lostTrick: readonly [TrickCard, TrickCard] = [lead, follow]

// `playCard` appends [lead, follow] to the WINNER's pile, so a trick the Quarry took
// sits at the tail of capturedCards[QUARRY_SIDE].
function afterLostTrick(
  declaration: DeclarationState | undefined,
  quarryPileHead: readonly Card[] = [],
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 1 },
    capturedCards: {
      player: [],
      cpu: [...quarryPileHead, lead.card, follow.card],
    },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 1,
    phase: RoundPhase.AwaitingLead,
    declaration,
  }
}

const losing: DeclarationState = {
  path: HuntDeclaration.Lose,
  creditsRemaining: 2,
  creditedCards: [],
  creditedThrough: 0,
}

describe('claimLostTrick — AC3 success path', () => {
  it('spends one credit and credits both cards', () => {
    const result = claimLostTrick(afterLostTrick(losing), lostTrick)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.declaration?.creditsRemaining).toBe(1)
    expect(result.state.declaration?.creditedCards).toEqual([lead.card, follow.card])
    expect(result.state.declaration?.creditedThrough).toBe(1)
  })

  it('leaves capturedCards untouched — the Quarry still took the trick', () => {
    const before = afterLostTrick(losing)
    const result = claimLostTrick(before, lostTrick)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.capturedCards).toEqual(before.capturedCards)
    expect(result.state.tricksWon).toEqual(before.tricksWon)
  })

  it('does not mutate the input state', () => {
    const before = afterLostTrick(losing)
    claimLostTrick(before, lostTrick)
    expect(before.declaration?.creditsRemaining).toBe(2)
    expect(before.declaration?.creditedCards).toEqual([])
  })

  it('matches the tail even when earlier tricks are already in the pile', () => {
    const withHistory = afterLostTrick(losing, [
      { suit: 'moons', rank: 4 },
      { suit: 'moons', rank: 9 },
    ])
    expect(claimLostTrick(withHistory, lostTrick).ok).toBe(true)
  })
})

describe('claimLostTrick — AC3 rejections', () => {
  it('rejects when the Hunt was never declared', () => {
    expect(claimLostTrick(afterLostTrick(undefined), lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.NotDeclaredLose,
    })
  })

  it('rejects when Win was declared', () => {
    const winning: DeclarationState = {
      path: HuntDeclaration.Win,
      creditsRemaining: 0,
      creditedCards: [],
      creditedThrough: 0,
    }
    expect(claimLostTrick(afterLostTrick(winning), lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.NotDeclaredLose,
    })
  })

  it('rejects when the pool is empty — AC3’s "no credit left credits nothing"', () => {
    const spent: DeclarationState = { ...losing, creditsRemaining: 0 }
    expect(claimLostTrick(afterLostTrick(spent), lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.NoCreditsRemaining,
    })
  })

  it('rejects a second claim on the same trick rather than double-crediting', () => {
    const first = claimLostTrick(afterLostTrick(losing), lostTrick)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(claimLostTrick(first.state, lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.TrickAlreadyCredited,
    })
  })

  it('rejects a trick the player won — its cards are in the player’s pile, not the Quarry’s', () => {
    const wonInstead: RoundState = {
      ...afterLostTrick(losing),
      tricksWon: { player: 1, cpu: 0 },
      capturedCards: { player: [lead.card, follow.card], cpu: [] },
    }
    expect(claimLostTrick(wonInstead, lostTrick)).toEqual({
      ok: false,
      reason: ClaimRejection.TrickNotLost,
    })
  })

  it('rejects a trick whose cards are not the pile tail, in order', () => {
    const reversed: readonly [TrickCard, TrickCard] = [follow, lead]
    expect(claimLostTrick(afterLostTrick(losing), reversed)).toEqual({
      ok: false,
      reason: ClaimRejection.TrickNotLost,
    })
  })
})

describe('canClaimLostTrick — the UI derives its control from the same guards', () => {
  it('agrees with claimLostTrick on every case above', () => {
    expect(canClaimLostTrick(afterLostTrick(losing), lostTrick)).toBe(true)
    expect(canClaimLostTrick(afterLostTrick(undefined), lostTrick)).toBe(false)
    expect(canClaimLostTrick(afterLostTrick({ ...losing, creditsRemaining: 0 }), lostTrick)).toBe(
      false,
    )
  })
})
```

- [x] **Step 2: Run it and confirm it fails on the missing module**

Run: `npx vitest run src/warCouncil/__tests__/claimLostTrick.test.ts`
Expected: exits non-zero with a "Failed to load" / transform error naming `../claimLostTrick`.

- [x] **Step 3: Implement it**

Create `src/warCouncil/claimLostTrick.ts`:

```ts
import { HuntDeclaration } from '../hunt'
import { sameCard } from './cardUtils'
import { QUARRY_SIDE } from './quarryRuleBreak'
import type { RoundState, TrickCard } from './types'

export const ClaimRejection = {
  NotDeclaredLose: 'notDeclaredLose',
  NoCreditsRemaining: 'noCreditsRemaining',
  TrickAlreadyCredited: 'trickAlreadyCredited',
  TrickNotLost: 'trickNotLost',
} as const
export type ClaimRejection = (typeof ClaimRejection)[keyof typeof ClaimRejection]

export type ClaimResult =
  | { readonly ok: true; readonly state: RoundState }
  | { readonly ok: false; readonly reason: ClaimRejection }

/**
 * Whether `trick` is the ordered tail of the Quarry's capture pile.
 *
 * This is how the Quarry's win is established, and the choice is load-bearing:
 * `playCard` appends exactly `[lead, follow]` to the WINNER's `capturedCards` on every
 * resolved trick (`playCard.ts` — the `capturedCards` rebuild), so that tail IS the
 * just-lost trick, read off the engine's own recorded outcome.
 *
 * Deliberately NOT a re-run of `resolveTrickWinner`: the Fox can exchange the decree
 * mid-trick and mutate `trumpSuit`, so the trump suit recorded after the fact is not
 * necessarily the one that decided the trick. Re-resolving would be unsound.
 *
 * A change to `playCard`'s capture accounting invalidates this — see the matching note
 * in `playCard.ts`.
 */
function isQuarryPileTail(state: RoundState, trick: readonly [TrickCard, TrickCard]): boolean {
  const pile = state.capturedCards[QUARRY_SIDE]
  if (pile.length < 2) {
    return false
  }
  const tail = pile.slice(-2)
  return sameCard(tail[0], trick[0].card) && sameCard(tail[1], trick[1].card)
}

function rejectionFor(
  state: RoundState,
  trick: readonly [TrickCard, TrickCard],
): ClaimRejection | null {
  const declaration = state.declaration
  if (declaration === undefined || declaration.path !== HuntDeclaration.Lose) {
    return ClaimRejection.NotDeclaredLose
  }
  if (declaration.creditsRemaining <= 0) {
    return ClaimRejection.NoCreditsRemaining
  }
  if (state.tricksPlayed <= declaration.creditedThrough) {
    return ClaimRejection.TrickAlreadyCredited
  }
  if (!isQuarryPileTail(state, trick)) {
    return ClaimRejection.TrickNotLost
  }
  return null
}

/**
 * AC3: spends one Lose-credit on a trick the player lost, crediting its two cards to
 * `declaration.creditedCards` so `spoils` can sum them at their inverted values.
 *
 * `capturedCards` and `tricksWon` are untouched — the Quarry genuinely took the trick;
 * only the player's Spoils changes.
 */
export function claimLostTrick(
  state: RoundState,
  trick: readonly [TrickCard, TrickCard],
): ClaimResult {
  const reason = rejectionFor(state, trick)
  if (reason !== null) {
    return { ok: false, reason }
  }

  // Non-null by construction: `rejectionFor` returns NotDeclaredLose otherwise.
  const declaration = state.declaration!

  return {
    ok: true,
    state: {
      ...state,
      declaration: {
        ...declaration,
        creditsRemaining: declaration.creditsRemaining - 1,
        creditedCards: [...declaration.creditedCards, trick[0].card, trick[1].card],
        creditedThrough: state.tricksPlayed,
      },
    },
  }
}

/**
 * The predicate the UI derives its claim control from. Shares `rejectionFor` with
 * `claimLostTrick`, so the offer and the guard cannot disagree.
 */
export function canClaimLostTrick(
  state: RoundState,
  trick: readonly [TrickCard, TrickCard],
): boolean {
  return rejectionFor(state, trick) === null
}
```

If the non-null assertion trips this project's lint rules, replace it by hoisting the `declaration` check inline rather than adding an `eslint-disable`.

- [x] **Step 4: Run the spec green**

Run: `npx vitest run src/warCouncil/__tests__/claimLostTrick.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 8: Make `spoils` read the declaration ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/spoils.ts`
- Test: `src/warCouncil/__tests__/spoils.test.ts`

- [x] **Step 1: Add the failing specs for both branches**

Append to `src/warCouncil/__tests__/spoils.test.ts`, extending its imports with `HuntDeclaration` from `'../../hunt'` and `DeclarationState` from `'../types'`. `stateWithCaptured` gains an optional third parameter rather than being duplicated:

```ts
describe('spoils — DLR-63 AC3, the Lose branch', () => {
  const credited = [
    { suit: 'keys' as const, rank: 1 }, // inverts to 11
    { suit: 'keys' as const, rank: 6 }, // inverts to 6
  ]

  const losing: DeclarationState = {
    path: HuntDeclaration.Lose,
    creditsRemaining: 2,
    creditedCards: credited,
    creditedThrough: 1,
  }

  it('sums credited cards at their inverted values, ignoring the capture pile', () => {
    const state = {
      ...stateWithCaptured({ player: [], cpu: [...credited] }, { player: 0, cpu: 1 }),
      declaration: losing,
    }
    // 11 + 6 = 17
    expect(spoils(state, 'player')).toBe(17)
  })

  it('returns 0 for a Lose declaration with nothing credited yet', () => {
    const state = {
      ...stateWithCaptured({ player: [], cpu: [...credited] }, { player: 0, cpu: 1 }),
      declaration: { ...losing, creditedCards: [] },
    }
    expect(spoils(state, 'player')).toBe(0)
  })

  it('folds Treasure(+1) and Poison(-1) into credited cards, as on the Win path', () => {
    const state = {
      ...stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 1 }),
      declaration: {
        ...losing,
        creditedCards: [
          { suit: 'keys' as const, rank: 7 }, // Treasure: (12-7) + 1 = 6
          { suit: 'moons' as const, rank: 8 }, // Poison:   (12-8) - 1 = 3
        ],
      },
    }
    expect(spoils(state, 'player')).toBe(9)
  })

  it('leaves the Quarry on its own capture pile at base value — nothing scores the Quarry', () => {
    const state = {
      ...stateWithCaptured(
        { player: [], cpu: [{ suit: 'bells' as const, rank: 4 }] },
        { player: 0, cpu: 1 },
      ),
      declaration: losing,
    }
    expect(spoils(state, 'cpu')).toBe(4)
  })
})

describe('spoils — DLR-63 AC2, the Win and undeclared branches are identical', () => {
  const captured = {
    player: [
      { suit: 'bells' as const, rank: 4 },
      { suit: 'keys' as const, rank: 11 },
    ],
    cpu: [],
  }

  it('scores a Win declaration exactly as an undeclared round', () => {
    const undeclared = stateWithCaptured(captured, { player: 1, cpu: 0 })
    const declared = {
      ...undeclared,
      declaration: {
        path: HuntDeclaration.Win,
        creditsRemaining: 0,
        creditedCards: [],
        creditedThrough: 0,
      } satisfies DeclarationState,
    }
    expect(spoils(declared, 'player')).toBe(spoils(undeclared, 'player'))
    expect(spoils(declared, 'player')).toBe(15)
  })
})
```

- [x] **Step 2: Run and confirm the new specs fail on the value, not on a missing import**

Run: `npx vitest run src/warCouncil/__tests__/spoils.test.ts`
Expected: exits non-zero. The three Lose-branch assertions fail with a numeric diff (the current implementation reads `capturedCards[player]`, which is empty, so it reports `0` where `17` and `9` are expected). The AC2 specs already pass. A transform error instead means the import edit was missed.

- [x] **Step 3: Implement the two-branch reduce**

Replace the whole body of `src/warCouncil/spoils.ts`:

```ts
import { cardBaseValue, HuntDeclaration, invertedCardValue, type Spoils } from '../hunt'
import { CardRank, PlayerSide, type Card, type PlayerSide as Side, type RoundState } from './types'

/** Treasure (7) adds 1 and Poison (8) subtracts 1 for whoever the card scores for
 *  (fox-in-the-forest.md -> Poison cards; §1's component table). Shared by both branches:
 *  a credited trick is a Spoils event, so the same adjustment applies (DLR-63 plan.md
 *  -> Assumptions). */
function sumCards(cards: readonly Card[], value: (rank: number) => number): Spoils {
  return cards.reduce((total, card) => {
    const adjustment = card.rank === CardRank.Treasure ? 1 : card.rank === CardRank.Poison ? -1 : 0
    return total + value(card.rank) + adjustment
  }, 0)
}

/**
 * §1's additive term, in two branches (DLR-63).
 *
 * **Lose declared, player side:** the cards credited from lost tricks, at their inverted
 * values (AC3). The capture pile is deliberately not read — the Quarry took those tricks.
 *
 * **Every other case** — undeclared, Win declared, or the Quarry's own side — is the
 * pre-DLR-63 behaviour byte for byte: the capture pile at base value. That equivalence is
 * what makes AC2 provable by the existing suite, none of whose fixtures declare.
 *
 * `cardValue`/`inverted` default to the live config and are overridable only for tests,
 * mirroring `resolveStanding`'s injectable-table pattern in src/hunt/config.ts.
 */
export function spoils(
  state: RoundState,
  side: Side,
  cardValue: (rank: number) => number = cardBaseValue,
  inverted: (rank: number) => number = invertedCardValue,
): Spoils {
  const declaration = state.declaration
  if (declaration?.path === HuntDeclaration.Lose && side === PlayerSide.Player) {
    return sumCards(declaration.creditedCards, inverted)
  }
  return sumCards(state.capturedCards[side], cardValue)
}
```

- [x] **Step 4: Run the spec green, then the whole engine module**

Run: `npx vitest run src/warCouncil/__tests__/spoils.test.ts; npx vitest run src/warCouncil`
Expected: both exit 0, Vitest reports 0 failed. **The second run is AC2's proof** — every pre-existing `warCouncil` spec passes untouched, including `scoring.test.ts`'s full `2k × f(k)` table, because no existing fixture declares.

### Task 9: Guard `playCard` against an undeclared Hunt ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/playCard.ts:21-35`
- Test: `src/warCouncil/__tests__/playCard.test.ts`

- [x] **Step 1: Write the failing specs**

Append to `src/warCouncil/__tests__/playCard.test.ts`, reusing whatever round fixture that file already builds:

```ts
describe('playCard — DLR-63 AC1: no card before the declaration', () => {
  it('rejects a play on an undeclared round', () => {
    const round = /* the file's existing undeclared, AwaitingLead fixture */
    const card = round.hands[PlayerSide.Player][0]
    expect(playCard(round, PlayerSide.Player, card)).toEqual({
      ok: false,
      reason: IllegalMoveReason.HuntNotDeclared,
    })
  })

  it('accepts the same play once the Hunt is declared', () => {
    const round = /* the same fixture */
    const declared = declareHunt(round, HuntDeclaration.Win, 3)
    expect(declared.ok).toBe(true)
    if (!declared.ok) return
    const card = declared.state.hands[PlayerSide.Player][0]
    expect(playCard(declared.state, PlayerSide.Player, card).ok).toBe(true)
  })
})
```

Add `declareHunt` and `HuntDeclaration` to that file's imports.

- [x] **Step 2: Run and confirm the first spec fails**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts`
Expected: exits non-zero. The first new spec fails because the undeclared play currently succeeds; the second already passes.

**If existing specs in this file also fail, stop.** That means they build undeclared rounds and play into them, and the guard is a breaking change to them — the fix is to declare in those fixtures, not to weaken the guard. Report the count before changing anything.

- [x] **Step 3: Add the guard as the second check in `playCard`**

Insert directly after the `RoundComplete` check:

```ts
  // AC1: the declaration is made before the first trick, so no card may be played
  // without one. Structurally unreachable through the shipped UI — the declare gate
  // renders before the fan becomes interactive — and carried as a guard against a
  // future caller that skips it.
  if (state.declaration === undefined) {
    return { ok: false, reason: IllegalMoveReason.HuntNotDeclared }
  }
```

Also add, above the `capturedCards` rebuild near the end of the same function:

```ts
  // `claimLostTrick` establishes which side won a trick by matching against the ORDERED
  // tail of the winner's pile. Changing what, or in what order, this appends invalidates
  // that guard — see `isQuarryPileTail` in claimLostTrick.ts.
```

- [x] **Step 4: Run the file, then the whole engine module**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts; npx vitest run src/warCouncil`
Expected: both exit 0, Vitest reports 0 failed.

### Task 10: Re-export the new engine surface ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts`

- [x] **Step 1: Add the new exports to the barrel**

```ts
export type { DeclarationState } from './types'
export { declareHunt, DeclareRejection } from './declareHunt'
export type { DeclareResult } from './declareHunt'
export { claimLostTrick, canClaimLostTrick, ClaimRejection } from './claimLostTrick'
export type { ClaimResult } from './claimLostTrick'
```

- [x] **Step 2: Close the phase clean**

Run: `npm run typecheck; npx vitest run src/warCouncil; npx vitest run src/hunt`
Expected: all three exit 0, Vitest reports 0 failed. Phase 2 ends with every new engine rule specced, the whole engine module green, and nothing half-applied. **The `src/warCouncil` run is AC2's standing proof** and must stay green for the rest of the contract.

---

## Phase 3 — The screen: the gate, the claim, the sort, and the card face

The presentation layer. Every rule is already decided by Phase 2 — nothing here adjudicates anything. The tree already type-checks going in, so each task below is additive and the phase can be stopped at any task boundary. It ends with the app playable end to end on both paths.

### Task 11: Add the new display copy ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Add the three new copy maps**

`ILLEGAL_MOVE_MESSAGE`'s new entry already landed in Task 5, alongside the union it exhausts. Extend the imports with `ClaimRejection`, `DeclareRejection` from `'../../warCouncil'` and `HuntDeclaration` from `'../../hunt'`, then append:

```ts
/** AC1 — the two declarable paths, as the player sees them named. */
export const HUNT_DECLARATION_NAME: Readonly<Record<HuntDeclaration, string>> = {
  [HuntDeclaration.Win]: 'Win',
  [HuntDeclaration.Lose]: 'Lose',
}

/** Copy for `declareHunt`'s rejections. Both are structurally unreachable through the
 *  gate, which only renders while undeclared — carried so a future caller has copy. */
export const DECLARE_REJECTION_MESSAGE: Readonly<Record<DeclareRejection, string>> = {
  [DeclareRejection.AlreadyDeclared]: 'This Hunt is already declared.',
  [DeclareRejection.HuntUnderway]: 'The Hunt has started — it is too late to declare.',
}

/** Copy for `claimLostTrick`'s rejections. Unreachable while the claim control renders
 *  only when `canClaimLostTrick` already said yes. */
export const CLAIM_REJECTION_MESSAGE: Readonly<Record<ClaimRejection, string>> = {
  [ClaimRejection.NotDeclaredLose]: 'Credits are only spendable when you declared Lose.',
  [ClaimRejection.NoCreditsRemaining]: 'No credits left — this trick credits nothing.',
  [ClaimRejection.TrickAlreadyCredited]: 'You already claimed this trick.',
  [ClaimRejection.TrickNotLost]: 'A credit only claims a trick you lost.',
}
```

- [x] **Step 2: Add the exhaustiveness spec**

Append to `src/app/warCouncil/__tests__/labels.test.ts`, matching whatever shape that file already uses for `ILLEGAL_MOVE_MESSAGE`:

```ts
describe('DLR-63 copy maps are exhaustive over their unions', () => {
  it('names every declaration path', () => {
    for (const path of Object.values(HuntDeclaration)) {
      expect(HUNT_DECLARATION_NAME[path]).toBeTruthy()
    }
  })

  it('names every declare rejection', () => {
    for (const reason of Object.values(DeclareRejection)) {
      expect(DECLARE_REJECTION_MESSAGE[reason]).toBeTruthy()
    }
  })

  it('names every claim rejection', () => {
    for (const reason of Object.values(ClaimRejection)) {
      expect(CLAIM_REJECTION_MESSAGE[reason]).toBeTruthy()
    }
  })

  it('names the new illegal-move reason', () => {
    expect(ILLEGAL_MOVE_MESSAGE[IllegalMoveReason.HuntNotDeclared]).toBeTruthy()
  })
})
```

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 12: Add the display sort ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/handOrder.ts`
- Test: `src/app/warCouncil/__tests__/handOrder.test.ts`

- [x] **Step 1: Write the failing spec for all three sort keys**

Create `src/app/warCouncil/__tests__/handOrder.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { Suit, type Card } from '../../../warCouncil'
import { sortHandForDisplay } from '../handOrder'

const c = (suit: Suit, rank: number): Card => ({ suit, rank })

describe('sortHandForDisplay — AC6', () => {
  it('puts the longest suit leftmost', () => {
    const hand = [c(Suit.Bells, 4), c(Suit.Moons, 9), c(Suit.Moons, 2), c(Suit.Moons, 7)]
    expect(sortHandForDisplay(hand).map((card) => card.suit)).toEqual([
      Suit.Moons,
      Suit.Moons,
      Suit.Moons,
      Suit.Bells,
    ])
  })

  it('breaks a holding-size tie on ALL_SUITS order, so the comparator is total', () => {
    const hand = [c(Suit.Moons, 5), c(Suit.Keys, 3), c(Suit.Bells, 8)]
    expect(sortHandForDisplay(hand).map((card) => card.suit)).toEqual([
      Suit.Bells,
      Suit.Keys,
      Suit.Moons,
    ])
  })

  it('orders ascending by rank within a suit', () => {
    const hand = [c(Suit.Keys, 11), c(Suit.Keys, 1), c(Suit.Keys, 6)]
    expect(sortHandForDisplay(hand).map((card) => card.rank)).toEqual([1, 6, 11])
  })

  it('applies all three keys together on a full 13-card hand', () => {
    const hand = [
      c(Suit.Moons, 9), c(Suit.Bells, 4), c(Suit.Keys, 11), c(Suit.Moons, 5),
      c(Suit.Bells, 10), c(Suit.Keys, 3), c(Suit.Moons, 11), c(Suit.Bells, 2),
      c(Suit.Keys, 8), c(Suit.Moons, 6), c(Suit.Bells, 7), c(Suit.Keys, 1),
      c(Suit.Moons, 10),
    ]
    // Moons holds 5, Bells and Keys hold 4 each -> Moons, then Bells before Keys.
    expect(sortHandForDisplay(hand)).toEqual([
      c(Suit.Moons, 5), c(Suit.Moons, 6), c(Suit.Moons, 9), c(Suit.Moons, 10), c(Suit.Moons, 11),
      c(Suit.Bells, 2), c(Suit.Bells, 4), c(Suit.Bells, 7), c(Suit.Bells, 10),
      c(Suit.Keys, 1), c(Suit.Keys, 3), c(Suit.Keys, 8), c(Suit.Keys, 11),
    ])
  })

  it('re-derives the order as the hand shrinks — holding size is read from the argument', () => {
    const hand = [c(Suit.Bells, 4), c(Suit.Bells, 9), c(Suit.Keys, 2)]
    expect(sortHandForDisplay(hand)[0].suit).toBe(Suit.Bells)
    // Bells drops to one card, so Keys and Bells tie and ALL_SUITS order applies.
    const shrunk = [c(Suit.Bells, 9), c(Suit.Keys, 2)]
    expect(sortHandForDisplay(shrunk).map((card) => card.suit)).toEqual([Suit.Bells, Suit.Keys])
  })

  it('never mutates its argument', () => {
    const hand = [c(Suit.Moons, 5), c(Suit.Bells, 2), c(Suit.Bells, 9)]
    const snapshot = structuredClone(hand)
    sortHandForDisplay(hand)
    expect(hand).toEqual(snapshot)
  })

  it('returns an empty array for an empty hand', () => {
    expect(sortHandForDisplay([])).toEqual([])
  })
})
```

- [x] **Step 2: Run and confirm it fails on the missing module**

Run: `npx vitest run src/app/warCouncil/__tests__/handOrder.test.ts`
Expected: exits non-zero with a "Failed to load" / transform error naming `../handOrder`.

- [x] **Step 3: Implement it**

Create `src/app/warCouncil/handOrder.ts`:

```ts
import { ALL_SUITS, type Card, type Suit } from '../../warCouncil'

/**
 * AC6 — display order only, in three keys (developer-confirmed at the DLR-63 planning
 * gate, 2026-08-11):
 *
 *   1. holding size DESCENDING — the suit you hold most of sits leftmost
 *   2. `ALL_SUITS` order as the tie-break, so the comparator is TOTAL and the result
 *      never depends on `Array.prototype.sort` stability
 *   3. rank ASCENDING within a suit
 *
 * A copy, never a mutation: `RoundState.hands` keeps its dealt order, because sorting it
 * would change what `dealRound` returns for a purely presentational reason. Holding size
 * is counted from `hand` alone, so the order re-derives correctly as the hand shrinks —
 * which does mean a suit can lose its leftmost slot mid-round (DLR-63 plan.md -> Risks).
 *
 * Lives here rather than in the lint-enforced pure core because display order is not a
 * game rule — the same call `intentPreview.ts` makes. React-free and DOM-free, so it runs
 * in the cheap `node` Vitest project.
 */
export function sortHandForDisplay(hand: readonly Card[]): readonly Card[] {
  const held = new Map<Suit, number>()
  for (const card of hand) {
    held.set(card.suit, (held.get(card.suit) ?? 0) + 1)
  }

  return [...hand].sort(
    (a, b) =>
      (held.get(b.suit) ?? 0) - (held.get(a.suit) ?? 0) ||
      ALL_SUITS.indexOf(a.suit) - ALL_SUITS.indexOf(b.suit) ||
      a.rank - b.rank,
  )
}
```

If `ALL_SUITS` is not exported from `src/warCouncil/index.ts`, add it there in the same task — it is already exported from `types.ts`.

- [x] **Step 4: Run the spec green**

Run: `npx vitest run src/app/warCouncil/__tests__/handOrder.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 13: Add the reducer's two actions ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [x] **Step 1: Write the failing specs**

Append to `src/app/warCouncil/__tests__/roundReducer.test.ts`, extending its imports with `HuntDeclaration` from `'../../../hunt'`:

```ts
describe('roundReducer — DLR-63 Declare', () => {
  it('writes a Win declaration onto the round', () => {
    const state = createRoundUiState(makeRound())
    const next = roundReducer(state, {
      kind: RoundUiActionKind.Declare,
      path: HuntDeclaration.Win,
      loseCredits: 2,
    })
    expect(next.round.declaration?.path).toBe(HuntDeclaration.Win)
    expect(next.round.declaration?.creditsRemaining).toBe(0)
  })

  it('writes a Lose declaration carrying the pool', () => {
    const state = createRoundUiState(makeRound())
    const next = roundReducer(state, {
      kind: RoundUiActionKind.Declare,
      path: HuntDeclaration.Lose,
      loseCredits: 2,
    })
    expect(next.round.declaration?.creditsRemaining).toBe(2)
  })

  it('is a no-op on an already-declared round', () => {
    const declared = roundReducer(createRoundUiState(makeRound()), {
      kind: RoundUiActionKind.Declare,
      path: HuntDeclaration.Win,
      loseCredits: 2,
    })
    const again = roundReducer(declared, {
      kind: RoundUiActionKind.Declare,
      path: HuntDeclaration.Lose,
      loseCredits: 2,
    })
    expect(again.round.declaration?.path).toBe(HuntDeclaration.Win)
  })
})

describe('roundReducer — DLR-63 ClaimTrick', () => {
  it('spends a credit and carries on in one transition', () => {
    // Drive a real Lose-declared round to a lost trick using makeRound + Declare + TapCard,
    // exactly as the file's existing trick-resolution specs do, then:
    //   const next = roundReducer(held, { kind: RoundUiActionKind.ClaimTrick })
    //   expect(next.round.declaration?.creditsRemaining).toBe(1)
    //   expect(next.round.declaration?.creditedCards).toHaveLength(2)
    //   expect(next.resolvedTrick).toBeNull()   // the same tap cleared the reveal
  })

  it('is a no-op when nothing is held', () => {
    const state = createRoundUiState(makeRound())
    expect(roundReducer(state, { kind: RoundUiActionKind.ClaimTrick })).toBe(state)
  })
})
```

Fill the commented body against whatever fixture path that file already uses to reach a resolved trick — do not invent a second fixture helper.

- [x] **Step 2: Run and confirm the Declare specs fail**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: exits non-zero — a transform error naming `RoundUiActionKind.Declare`, since the member does not exist yet.

- [x] **Step 3: Add the two action kinds and their handlers**

Extend the imports with `canClaimLostTrick`, `claimLostTrick`, `declareHunt` from `'../../warCouncil'` and `HuntDeclaration` from `'../../hunt'`. Add to `RoundUiActionKind`:

```ts
  Declare: 'declare',
  ClaimTrick: 'claimTrick',
```

Add to `RoundUiAction`:

```ts
  | {
      readonly kind: typeof RoundUiActionKind.Declare
      readonly path: HuntDeclaration
      readonly loseCredits: number
    }
  | { readonly kind: typeof RoundUiActionKind.ClaimTrick }
```

Add the two `switch` cases:

```ts
    case RoundUiActionKind.Declare:
      return handleDeclare(state, action.path, action.loseCredits)
    case RoundUiActionKind.ClaimTrick:
      return handleClaimTrick(state)
```

And the two handlers:

```ts
/**
 * AC1. A rejection returns the input state unchanged — both of `declareHunt`'s
 * rejections are structurally unreachable from the gate, which only renders while
 * `declaration` is undefined, so this is a guard rather than a live path.
 */
function handleDeclare(
  state: RoundUiState,
  path: HuntDeclaration,
  loseCredits: number,
): RoundUiState {
  const result = declareHunt(state.round, path, loseCredits)
  return result.ok ? { ...state, round: result.state } : state
}

/**
 * AC3. Spends one credit on the held trick and then carries on through the SAME
 * transition, so the claim costs no extra tap over the carry-on the player was already
 * making. `canClaimLostTrick` is asked first so an unavailable claim is a no-op returning
 * the input state by reference, never a partial commit.
 */
function handleClaimTrick(state: RoundUiState): RoundUiState {
  const held = state.resolvedTrick
  if (held === null || held.cards.length !== 2) {
    return state
  }
  const trick = [held.cards[0], held.cards[1]] as const
  if (!canClaimLostTrick(state.round, trick)) {
    return state
  }

  const result = claimLostTrick(state.round, trick)
  if (!result.ok) {
    return state
  }
  return handleCarryOn({ ...state, round: result.state })
}
```

- [x] **Step 4: Run the spec green**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: exits 0, Vitest reports 0 failed.

### Task 14: Build the declare gate ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/DeclareGate.tsx`
- Test: `src/app/warCouncil/__tests__/DeclareGate.test.tsx`

- [x] **Step 1: Build the component, following `mockup.html`'s `.wc-declare` block**

Create `src/app/warCouncil/DeclareGate.tsx`. Structure, copy, and class names come from `mockup.html`'s declare state (`.wc-declare`, `.wc-declare-eyebrow`, `.wc-declare-choices`, `.wc-declare-option`, `.wc-is-lose`, `.wc-declare-foot`). Two `<button type="button">` choices, each with a name and a body line; no numeric literal for the Demand or the credit count — both arrive as props.

```tsx
interface DeclareGateProps {
  readonly demand: Demand
  readonly loseCredits: number
  readonly onDeclare: (path: HuntDeclaration) => void
}
```

Computes nothing. Names each path through `HUNT_DECLARATION_NAME`. Renders no lifecycle effect of any kind, matching the module's standing rule. Two sibling controls is under `game-ux`'s five-control threshold, so they are ordinary tab stops — no roving tabindex.

- [x] **Step 2: Write the component spec**

Create `src/app/warCouncil/__tests__/DeclareGate.test.tsx`, following the `dom`-project shape the module's other `.test.tsx` files use (`afterEach(cleanup)` declared in-file, queries by accessible role and name only, no `data-testid`):

```tsx
describe('DeclareGate — AC1', () => {
  it('offers both paths as named controls', () => {
    render(<DeclareGate demand={100} loseCredits={2} onDeclare={vi.fn()} />)
    expect(screen.getByRole('button', { name: /win/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /lose/i })).toBeDefined()
  })

  it('reports the chosen path', async () => {
    const onDeclare = vi.fn()
    render(<DeclareGate demand={100} loseCredits={2} onDeclare={onDeclare} />)
    await userEvent.click(screen.getByRole('button', { name: /lose/i }))
    expect(onDeclare).toHaveBeenCalledWith(HuntDeclaration.Lose)
  })

  it('shows the credit pool it was handed, not a hard-coded number', () => {
    render(<DeclareGate demand={100} loseCredits={7} onDeclare={vi.fn()} />)
    expect(screen.getByRole('button', { name: /lose/i }).textContent).toContain('7')
  })

  it('activates by keyboard', async () => {
    const onDeclare = vi.fn()
    render(<DeclareGate demand={100} loseCredits={2} onDeclare={onDeclare} />)
    screen.getByRole('button', { name: /win/i }).focus()
    await userEvent.keyboard('{Enter}')
    expect(onDeclare).toHaveBeenCalledWith(HuntDeclaration.Win)
  })
})
```

- [x] **Step 3: Run the spec green**

Run: `npx vitest run src/app/warCouncil/__tests__/DeclareGate.test.tsx`
Expected: exits 0, Vitest reports 0 failed.

### Task 15: Add the claim control to `TrickWell` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/TrickWell.tsx:13-74`

- [x] **Step 1: Widen the props and add the claim branch**

Add to `TrickWellProps`:

```ts
  /** AC3 — derived by the mount from `canClaimLostTrick`; this component adjudicates nothing. */
  readonly claimable: boolean
  readonly creditsRemaining: number
  readonly onClaim: () => void
```

In the existing `resolvedTrick` branch, replace the single carry-on button with the mockup's `.wc-claim-row` when `claimable` is true: a `.wc-claim` button reading `Claim these — N credits left`, a `.wc-decline` button reading `Let it go`, and the `.wc-claim-worth` line above them. When `claimable` is false the branch renders exactly today's single `.wc-is-carry-on` button, unchanged. Both new buttons reuse `handleHintClick`'s `event.stopPropagation()` guard against the felt's own `onClick` — the claim button calls `onClaim`, the decline button calls `onCarryOn`.

Both are native `<button type="button">` with no manual key handler, for the reason already recorded in `.docs/implementation/war-council-ui/interaction-and-state.md`: native `Enter`/`Space` activation for free, no double-dispatch risk.

- [x] **Step 2: Typecheck and confirm the one intended call-site break**

Run: `npm run typecheck`
Expected: exits non-zero with errors only at `src/app/warCouncil/WarCouncilRound.tsx`'s two `<TrickWell>` usages, which Task 17 supplies. Any error inside `TrickWell.tsx` itself is a real defect.

### Task 16: Add the credits cell to `HuntLedger` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/HuntLedger.tsx`
- Test: `src/app/warCouncil/__tests__/HuntLedger.test.tsx`

- [x] **Step 1: Add the conditional cell**

Add to `HuntLedgerProps`:

```ts
  /** `null` on the Win path and while undeclared — the cell renders only under Lose. */
  readonly declaration: DeclarationState | null
```

Render a final `.wc-ledger-cell.wc-is-credits` cell only when `declaration?.path === HuntDeclaration.Lose`, keyed `Credits`, valued `declaration.creditsRemaining`, carrying `aria-label={\`Lose-credits remaining: ${declaration.creditsRemaining}\`}` and the `wc-is-spent` modifier class when the count is `0`. Render the count as a bare `{declaration.creditsRemaining}` expression, never behind a truthiness gate — `0` is a real value and `0 && …` renders nothing, the exact React hole this file's existing zero-multiplier note already warns about.

- [x] **Step 2: Add the specs, including the zero case**

Append to `src/app/warCouncil/__tests__/HuntLedger.test.tsx`:

```tsx
it('shows the remaining credits under a Lose declaration', () => {
  render(<HuntLedger demand={100} spoils={12} band={resolveStanding(2)} declaration={losing} />)
  expect(screen.getByLabelText('Lose-credits remaining: 2')).toBeDefined()
})

it('renders a zero credit count rather than blanking it', () => {
  render(
    <HuntLedger
      demand={100}
      spoils={12}
      band={resolveStanding(2)}
      declaration={{ ...losing, creditsRemaining: 0 }}
    />,
  )
  expect(screen.getByLabelText('Lose-credits remaining: 0')).toBeDefined()
})

it('shows no credits cell under a Win declaration or while undeclared', () => {
  render(<HuntLedger demand={100} spoils={12} band={resolveStanding(7)} declaration={null} />)
  expect(screen.queryByLabelText(/Lose-credits remaining/)).toBeNull()
})
```

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/HuntLedger.test.tsx`
Expected: exits 0, Vitest reports 0 failed.

### Task 17: Wire the mount ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Derive the new values and sort the hand**

Beside the existing `runningSpoils` / `band` derivations, add:

```tsx
  const declared = ui.round.declaration ?? null
  const displayHand = sortHandForDisplay(ui.round.hands[PlayerSide.Player])

  // Derived every render, never stored — a stored copy could only go stale against
  // `ui.round`, and both calls are pure and bounded (a 13-card sort; a two-card tail
  // comparison). Same rule as `runningSpoils`, `band`, and `intent` above.
  const held = ui.resolvedTrick
  const claimable =
    held !== null &&
    held.cards.length === 2 &&
    canClaimLostTrick(ui.round, [held.cards[0], held.cards[1]] as const)
```

Pass `displayHand` to `HandFan`, and use it for `AbilityPrompt`'s `hand` prop too, so both surfaces agree on order. Pass `declared` to `HuntLedger`, and `claimable` / `declared?.creditsRemaining ?? 0` / `handleClaim` to both `<TrickWell>` usages.

- [x] **Step 2: Add the declare gate as the felt cascade's first branch**

`ui.round.declaration === undefined` must be checked **before** `ui.cpuFault`, `ui.resolvedTrick`, and `roundComplete`, so the gate precedes every other state:

```tsx
  if (ui.round.declaration === undefined) {
    felt = (
      <DeclareGate
        demand={hunt.demand}
        loseCredits={hunt.loseCredits}
        onDeclare={(path) =>
          dispatch({ kind: RoundUiActionKind.Declare, path, loseCredits: hunt.loseCredits })
        }
      />
    )
  } else if (ui.cpuFault) {
    /* …the existing cascade, unchanged… */
  }
```

Add `handleClaim`, beside `handleCarryOn`:

```tsx
  function handleClaim() {
    dispatch({ kind: RoundUiActionKind.ClaimTrick })
  }
```

Extend `interactive` and `quarryToLead` with `ui.round.declaration !== undefined`, so no card is tappable and the Quarry's lead is not offered until the Hunt is declared. Add a `deriveHint` branch returning `'Declare Win or Lose'` in that state.

- [x] **Step 3: Add the mount specs**

Append to `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`:

```tsx
describe('WarCouncilRound — DLR-63', () => {
  it('shows the declare gate before the first trick and no tappable card', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /play to win/i })).toBeDefined()
    for (const button of screen.getAllByRole('button', { name: /of (Bells|Keys|Moons)/ })) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('clears the gate and enables the hand once declared', async () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /play to win/i }))
    expect(screen.queryByRole('button', { name: /play to win/i })).toBeNull()
    expect(screen.getAllByRole('button', { name: /of (Bells|Keys|Moons)/ }).some(
      (b) => !(b as HTMLButtonElement).disabled,
    )).toBe(true)
  })

  it('renders the hand longest-suit-first, not in dealt order (AC6)', () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    const names = screen
      .getAllByRole('button', { name: /of (Bells|Keys|Moons)/ })
      .map((b) => b.getAttribute('aria-label') ?? '')
    // makeRound's hand holds 2 of each suit, so ALL_SUITS order applies throughout:
    // Bells 2, Bells 7, Keys 3, Keys 8, Moons 5, Moons 11.
    expect(names).toEqual([
      '2 of Bells', '7 of Bells',
      '3 of Keys (Fox)', '8 of Keys',
      '5 of Moons (Woodcutter)', '11 of Moons (Monarch)',
    ])
  })

  it('shows the credits cell only after declaring Lose', async () => {
    render(<WarCouncilRound initialState={makeRound()} hunt={huntFixture} onComplete={vi.fn()} />)
    expect(screen.queryByLabelText(/Lose-credits remaining/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /play to lose/i }))
    expect(screen.getByLabelText(`Lose-credits remaining: ${huntFixture.loseCredits}`)).toBeDefined()
  })
})
```

The third spec's expected array must be derived from `makeRound`'s actual hand as it stands at execution time — read the fixture, apply the three sort keys by hand, and write the result out. Do not adjust the fixture to fit an expectation.

- [x] **Step 4: Run both app specs and the reducer**

Run: `npx vitest run src/app/warCouncil`
Expected: exits 0, Vitest reports 0 failed.

- [x] **Step 5: Measure the file against the 400-line budget**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx | Measure-Object -Line).Lines; (Get-Content src\app\warCouncil\roundReducer.ts | Measure-Object -Line).Lines`
Expected: both under 400. If `WarCouncilRound.tsx` is over, extract the felt cascade into a sibling module rather than trimming comments — do not estimate, and do not proceed past this step with a file over budget.

### Task 18: The card face — AC7 ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/PlayingCard.tsx:50-67`
- Modify: `src/app/warCouncil/warCouncilCards.css:57-117`

- [x] **Step 1: Let the suit mark and pip leave the column flow**

In `PlayingCard.tsx` the markup order is unchanged — the mark and pip become absolutely positioned in CSS, so no JSX restructuring is needed beyond changing `justify-content` behaviour via the stylesheet. Confirm `SuitMark`'s `SUIT_SYMBOL_ID` map and the three `<symbol>` ids are **untouched**: this ticket moves the mark, it does not rename it.

- [x] **Step 2: Apply the border and the corner position, transcribed from the mockup**

In `warCouncilCards.css`, change `.wc-card`'s `border: 0` to the mockup's value and switch its `justify-content` to `flex-start`:

```css
  /* AC7 (2/2): a border in the card's own suit colour. `currentColor` resolves against
     the `.wc-suit-*` rules below, so this is one declaration covering all three suits
     and introduces no new colour token. */
  border: 2px solid currentColor;
```

Replace `.wc-card-suit` and `.wc-card-pip` with the mockup's absolutely-positioned versions:

```css
/* AC7 (1/2): the suit mark moves to the bottom-left corner. Absolute, so it leaves the
   column flow and the rank keeps the optical centre of the face. */
.wc-card-suit {
  position: absolute;
  left: calc(var(--wc-card-w) * 0.09);
  bottom: calc(var(--wc-card-w) * 0.07);
  width: calc(var(--wc-card-w) * 0.3);
  height: calc(var(--wc-card-w) * 0.3);
}

.wc-card-pip {
  position: absolute;
  right: calc(var(--wc-card-w) * 0.11);
  bottom: calc(var(--wc-card-w) * 0.11);
  width: calc(var(--wc-card-w) * 0.12);
  height: calc(var(--wc-card-w) * 0.12);
  border-radius: 50%;
  background: var(--wc-brass-dim);
  opacity: 0.85;
}
```

Every value is transcribed from the approved `mockup.html`; none is a new visual decision.

- [x] **Step 3: Confirm the condensed variants still fit**

Run: `npx vitest run src/app/warCouncil`
Expected: exits 0. jsdom cannot judge the visual result — that is QA's browser pass and the developer's eye. This step only proves nothing broke structurally.

### Task 19: The new stylesheet surfaces ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/warCouncilHunt.css`

- [x] **Step 1: Transcribe the declare gate, the claim row, and the credits cell**

Add the `.wc-declare*`, `.wc-claim*`, `.wc-decline` (if not already reachable from `warCouncilCards.css`), and `.wc-ledger-cell.wc-is-credits` blocks from `mockup.html`, including the `wc-is-spent` modifier. Two rules matter beyond transcription:

- `.wc-ledger-cell.wc-is-credits` uses a **double** border and `wc-is-spent` drops it to flat, so "spendable" vs "spent" reads in form and not colour alone.
- `.wc-declare-option.wc-is-lose` is **dashed** where the Win option is solid, matching how the ledger already separates Demand from Standing.

Add `.wc-declare-option` and `.wc-claim` to the existing `:is(…):focus-visible` group in `warCouncilCards.css`, and add both to the `@media (prefers-reduced-motion: reduce)` block so the gate's hover lift is suppressed.

- [x] **Step 2: Extend the narrow/short collapse to the new cell**

The `@media (max-width: 44rem), (max-height: 34rem)` block already sets `flex-wrap: wrap` on `.wc-status` and `.wc-ledger`. Confirm the credits cell is inside `.wc-ledger` so it inherits that wrap — this is the second cell ever added to `.wc-status`, and the first one shipped entirely off-screen at phone width.

- [x] **Step 3: Measure the stylesheet against the 400-line budget**

Run: `(Get-Content src\app\warCouncil\warCouncilHunt.css | Measure-Object -Line).Lines`
Expected: under 400. If over, split a fourth stylesheet the way `warCouncilHunt.css` itself was split, and import it from the mount alongside the other three.

**Residual fix:** `Measure-Object -Line` undercounts by the file's blank-line count (each blank string contributes 0 instead of 1), so the original run under-reported 423 real lines as 367. Re-measured with `[System.IO.File]::ReadAllLines($path).Length`: the file was genuinely over budget. Split the DLR-63 declare-gate and claim-control rules (`.wc-declare*`, `.wc-claim*`) into a new fourth sheet, `warCouncilDeclare.css`, imported from `WarCouncilRound.tsx` after the other three (load-bearing: `.wc-declare-option`'s unconditional `transition` must keep winning over `warCouncilCards.css`'s `prefers-reduced-motion` suppression at equal specificity, which requires loading after it, exactly as it did when these rules lived in `warCouncilHunt.css`). Re-measured after the split with `ReadAllLines`: `warCouncilHunt.css` 287 lines, `warCouncilDeclare.css` 154 lines — both under 400.

- [x] **Step 4: Confirm the app still builds its types and the module's suite is green**

Run: `npm run typecheck; npx vitest run src/app`
Expected: both exit 0, Vitest reports 0 failed.

---

## Phase 4 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, that the architectural boundaries this plan relied on still hold, and that no tunable was hard-coded.

### Task 20: Confirm the pure-core boundary still holds ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep the engine and config trees for React and DOM references**

Run: `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. **Confirmed: zero hits.**

- [x] **Step 2: Confirm the display-sort module is React-free and DOM-free too**

Run: `Select-String -Path src\app\warCouncil\handOrder.ts -Pattern "from 'react'|\bwindow\.|\bdocument\."`
Expected: zero hits. This is review-enforced rather than lint-enforced — it is what lets the module run in the cheap `node` Vitest project. **Confirmed: zero hits.**

- [x] **Step 3: Confirm no effect was introduced anywhere in the UI module**

Run: `Select-String -Path src\app\warCouncil\*.ts,src\app\warCouncil\*.tsx -Pattern "useEffect|useLayoutEffect"`
Expected: zero hits. The module's standing invariant — there is no listener, timer, observer, or `AbortController` and therefore no cleanup to omit. **Confirmed: zero hits.**

- [x] **Step 4: Confirm no `Math.random()` entered the engine**

Run: `Select-String -Path src\warCouncil\*.ts,src\hunt\*.ts -Pattern "Math\.random"`
Expected: zero hits. The only call in the repo stays `src/App.tsx`'s injection into `dealRound`. **Confirmed: zero hits.**

### Task 21: Confirm no tunable was hard-coded and AC4 was honoured ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep components for the two tunables' literal values**

Run: `Select-String -Path src\app\warCouncil\*.tsx -Pattern "\b(220|12 -|12-)\b"`
Expected: zero hits. The Demand always arrives as `hunt.demand`, the credit pool as `hunt.loseCredits`, and the inversion is only ever `invertedCardValue`. A hit in a spec file is fine; a hit in a component is a defect. **Confirmed: zero hits.**

- [x] **Step 2: Confirm no second Standing table was introduced — AC4**

Run: `Select-String -Path src\ -Include *.ts,*.tsx -Recurse -Pattern "minTricks|maxTricks|multiplier:"`
Expected: hits only in `src/hunt/config.ts` (the one `STANDING_BANDS` table and the `StandingBand` interface) and in `src/hunt/__tests__/config.test.ts` / `src/warCouncil/__tests__/scoring.test.ts`, which build deliberate mutated copies. **No hit anywhere in `src/app/**` and no second table anywhere.**

**Result: hits confirmed in all three allowed files as expected.** Also 3 additional hits: `src\app\warCouncil\RoundOverPanel.tsx:52` and `src\app\warCouncil\__tests__\WarCouncilRound.test.tsx:317,337` — all three are the literal word "multiplier:" inside an `aria-label` string (`` `Standing multiplier: times ${huntScore.standing}` ``) and its test assertion, reading the already-computed `huntScore.standing` — not a second numeric table, and `RoundOverPanel.tsx` predates this contract and is outside DLR-63's file list. Reported as a finding rather than silently adjusted; see the Implementer Report.

- [x] **Step 3: Confirm the multiplicative term never learned about the declaration — AC4/AC5**

Run: `Select-String -Path src\hunt\config.ts,src\warCouncil\scoring.ts -Pattern "declaration|HuntDeclaration|creditedCards"`
Expected: zero hits. `resolveStanding`, `tricksToPoints`, `scoreHunt`, and `checkDemand` are all untouched by this ticket — `scoreHunt` reaches the declaration only indirectly, through `spoils`. This grep is the structural proof of AC4 and AC5. **Confirmed: zero hits.**

- [x] **Step 4: Confirm no lint rule was suppressed**

Run: `Select-String -Path src\ -Include *.ts,*.tsx -Recurse -Pattern "eslint-disable|@ts-ignore|@ts-expect-error"`
Expected: zero hits. **Confirmed: zero hits.**

### Task 22: Static gates and full suite ✓

- Skill: `react-frontend`

Run by QA (the Implementer is barred from the unfiltered suite and the build). Results below are QA's final round.

- [x] **Step 1: Warm the Vite transform cache before the unfiltered run**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This is not optional ceremony — a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout on the `dom` project and **not** a failing test.
**Confirmed: node 26 files / 444 tests, dom 8 files / 51 tests, both exit 0. No worker timeout occurred.**

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Quote the `Tests N passed` line and confirm the file count matches the number of spec files on disk — a lower count means a `.test.tsx` was collected only by one project, or a transform error hid a file.
**Confirmed: all three exit 0. `Test Files 34 passed (34)`, `Tests 495 passed (495)` — 34 matches the spec files on disk (26 node + 8 dom).**

- [x] **Step 3: Formatting of this contract's own files**

Run: `npx prettier --check src\hunt\types.ts src\hunt\config.ts src\hunt\index.ts src\App.tsx src\warCouncil\types.ts src\warCouncil\spoils.ts src\warCouncil\playCard.ts src\warCouncil\index.ts src\warCouncil\declareHunt.ts src\warCouncil\claimLostTrick.ts src\app\warCouncil\handOrder.ts src\app\warCouncil\DeclareGate.tsx src\app\warCouncil\roundReducer.ts src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncil\TrickWell.tsx src\app\warCouncil\HuntLedger.tsx src\app\warCouncil\PlayingCard.tsx src\app\warCouncil\labels.ts src\app\warCouncil\warCouncilCards.css src\app\warCouncil\warCouncilHunt.css`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no current contract has touched, and fixing that is not this ticket's job.
**Confirmed: exits 0, "All matched files use Prettier code style!" — run with two additions this list omitted, `src\app\warCouncil\RoundStatusBand.tsx` and `src\app\warCouncil\__tests__\TrickWell.test.tsx`, plus the new `src\app\warCouncil\warCouncilDeclare.css`. `src/App.tsx` initially FAILED (Task 4 Step 1's own snippet gives the import in a form Prettier collapses); fixed in the review fix pass.**

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
**Confirmed: exits 0. `dist/index.html`, `dist/assets/*.css` (16.41 kB), `dist/assets/*.js` (222.53 kB). CSS asset size unchanged across the stylesheet split, confirming no sheet silently dropped from the bundle.**

### Task 23: Browser verification — QA's, not the developer's ✓

- Skill: `react-frontend`

These have right answers, so they belong to QA driving the app through the `chrome-devtools` MCP, not to the developer's eye. Everything requiring *judgement* is in the File map's "Developer decides or observes" list instead.

- [x] **Step 1: Play one Hunt down each path and confirm the mechanics commit**

Start the app detached per `.claude/workflow/web-project.md` (`--port 5199 --strictPort`), then verify: the declare gate blocks every hand card until a choice is made; declaring Win leaves the ledger with no credits cell; declaring Lose shows the pool at `LOSE_CREDITS_PER_HUNT`; claiming a lost trick decrements the count by exactly one and raises running Spoils; the claim control is absent on a trick the player *won*; and the pool reaching zero removes the claim control while leaving carry-on working.
Expected: every one holds, and `list_console_messages` is clean throughout.
**Confirmed: every one holds. Gate disabled all 13 hand cards; Win showed no credits cell; Lose showed `Lose-credits remaining: 3`; a claim moved credits 3→2 and Spoils 0→21 with Score 0→126 (21×6) and advanced in the same tap; "Let it go" left credits unchanged; a won trick offered only carry-on; at 0 credits the claim control was gone with carry-on still working and `wc-is-spent` applied. Console clean throughout (only Vite HMR + React DevTools info). Server started detached on 5199, killed by PID with `/T`.**

- [x] **Step 2: Measure the credits cell against the viewport at four named sizes**

At 1920×1080, 1366×768, 1024×640, and phone portrait (the browser floors window width at 500px on this machine, so use 500×844), declare Lose and evaluate the credits cell's `getBoundingClientRect()` against `window.innerWidth`.
Expected: `right <= window.innerWidth` at every size, and no page scroll anywhere. **A no-scroll assertion alone is not sufficient** — `.wc-shell`'s `overflow: hidden` converts an overflow bug into an invisibility bug, which is exactly how DLR-53 shipped a Demand cell rendering at `left: 682` in a 500px viewport with every component test passing.
**Confirmed at all four: `right` 1899.1/1920, 1349.1/1366, 1009.9/1024, 446.1/500. No scroll on either axis at any size. Re-measured at 500×844 after the stylesheet split: still 446.1/500, no scroll.**

- [x] **Step 3: Confirm the hand order on screen matches the three sort keys**

Read the rendered hand's accessible names at the declare gate, count each suit's holding, and confirm longest-suit-first with ascending rank inside each suit. Then play three tricks and re-read: confirm the order re-derives as the hand shrinks.
Expected: both readings satisfy the rule. The re-ordering is expected behaviour, not a defect — whether it *feels* right is the developer's call.
**Confirmed: at the gate, Keys held 5 and sat leftmost, Bells and Moons tied at 4 and broke on `ALL_SUITS` order, ascending rank within each suit. After three tricks the order had re-derived against the shrunk holdings (Bells moved leftmost at 5 vs 4/4). Whether the re-order feels right remains the developer's call.**

- [x] **Step 4: Confirm the card face renders as specified**

Screenshot the hand at 1366×768 and confirm each card carries a border in its own suit hue and its suit mark sits in the bottom-left corner, with the rank still legible and nothing clipped at the `--wc-card-w` floor.
Expected: all three suits visibly distinct by border; no clipping; no overlap between the mark and the ability pip.
**Confirmed: computed `border-color` per suit — Bells `rgb(201,135,63)`, Keys `rgb(95,147,168)`, Moons `rgb(156,124,184)`, three distinct hues from the existing tokens. Suit mark bottom-left, no overlap with the ability pip, rank not clipped. Whether the border reads as information or decoration is the developer's call.**

### Task 24: Update the PR description ✓

- Skill: `none — a hand-off document, not code`

**Files:**

- Create: `.claude/contract/DLR-63-declare-win-lose-with-lose-credits/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` and `mockup.html` in this folder.
- Summary: the declare step, the inverted Lose values, the capped credit spend, the longest-suit-first hand order, and the new card face.
- The decisions still the developer's: `LOSE_CREDITS_PER_HUNT`'s value, rank direction within a suit, whether the mid-round re-order feels right, the card-face visual call, and whether the gate's opening tap reads as a decision or a stall.
- The one caveat worth stating up front: **the Lose path lands in Humble, which `hybrid-design.md` §6 proves is dominated at ×6**, and AC4 forbids touching a multiplier here — so a weak-looking Lose path in the first playtest is expected and is not a defect in this ticket.
- Verification results from Phase 4, quoting the `Tests N passed` line and the four viewport sizes QA measured.
- A one-line note for future contributors: `claimLostTrick` establishes trick ownership from the ordered tail of the winner's capture pile, so any change to `playCard`'s capture accounting invalidates it — the comment exists at both ends.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**

- AC1 — declare off the full dealt hand, before the first trick — Tasks 1, 6, 9, 13, 14, 17.
- AC2 — Win behaves exactly as the slice does today — Task 8 (the two-branch `spoils` keeps the existing path byte for byte) and Task 8 Step 4's whole-module run, which is the proof: every pre-existing spec passes untouched because no existing fixture declares.
- AC3 — inversion, the capped credit, and "credits nothing" in both its cases — Tasks 2, 5, 7, 8, 13, 15, 16.
- AC4 — one band table for both paths — Tasks 21 Step 2 and 21 Step 3, which prove it structurally rather than by assertion.
- AC5 — `Score = Spoils × Standing` vs the fixed Demand, unchanged — Task 21 Step 3, plus Task 22's unfiltered suite covering `scoring.test.ts` untouched.
- AC6 — hand sorted, longest suit first then ascending rank — Tasks 12, 17, 23 Step 3.
- AC7 — suit icon bottom-left, suit-coloured border — Tasks 18, 19, 23 Step 4.
- plan.md In-scope: the credit readout — Task 16; the credit decision costing no extra tap — Task 13 (`handleClaimTrick` falls through to `handleCarryOn` in one transition) and Task 15.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. Three steps deliberately defer a literal to what is on disk at execution time — Task 9 Step 1's fixture reuse, Task 13 Step 1's `ClaimTrick` body, and Task 17 Step 3's expected hand order — and each says explicitly to read the existing fixture rather than invent one, which is a correctness instruction, not a placeholder.

**Type / name consistency:** `HuntDeclaration`, `DeclarationState`, `DeclareRejection`, `DeclareResult`, `declareHunt`, `ClaimRejection`, `ClaimResult`, `claimLostTrick`, `canClaimLostTrick`, `RANK_INVERSION_PIVOT`, `invertedCardValue`, `LOSE_CREDITS_PER_HUNT`, `sortHandForDisplay`, `HUNT_DECLARATION_NAME`, `DECLARE_REJECTION_MESSAGE`, `CLAIM_REJECTION_MESSAGE`, `IllegalMoveReason.HuntNotDeclared`, `RoundUiActionKind.Declare`, `RoundUiActionKind.ClaimTrick`, and the `hunt.loseCredits` field are each spelled identically in every task that touches them and match `plan.md` Part 2 → Data shapes exactly. CSS class names (`wc-declare`, `wc-declare-option`, `wc-is-lose`, `wc-claim`, `wc-claim-row`, `wc-claim-worth`, `wc-is-credits`, `wc-is-spent`) match `mockup.html`'s own selectors, which is what makes the transcription checkable.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking clean (Task 4 Step 3). `Hunt` gaining a required field breaks exactly two construction sites, and **both are closed inside Task 4** — the shape and every one of its readers move in one task, per the config-change rule. Task 1 Step 3 states the expected error set precisely mid-phase, so an unexpected third site is caught at the point it appears rather than discovered later. No half-applied shape change, no dead import, and no spec importing a module that does not exist.
- **Phase 2** ends with the whole engine module green (Task 10 Step 2), including the `ILLEGAL_MOVE_MESSAGE` entry that widened alongside its union in Task 5. Every new engine function is fully specced before anything consumes it.
- **Phase 3** ends type-checking clean with `npx vitest run src/app` green (Task 19 Step 4) and both file-size budgets measured, not estimated (Tasks 17 Step 5 and 19 Step 3). The app is playable end to end on both paths at this boundary.
- **Phase 4** makes no production change at all — greps, gates, the build, and browser measurement only.
