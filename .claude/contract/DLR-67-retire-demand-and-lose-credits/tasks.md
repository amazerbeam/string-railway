# Tasks: Retire the Demand comparison and the capped Lose-credit mechanic

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: BLOCKED
Started: 2026-08-12

> **BLOCKED 2026-08-12 — one open defect, everything else green.** All 16 acceptance-relevant tasks
> across Phases 1–2 landed and every gate passes (typecheck, lint, `495/495` tests, scoped prettier,
> build). AC1–AC6, AC7a, AC7c and AC8 are verified; the app is playable start to finish and QA drove
> a full 13-trick round in a real browser.
>
> **The open defect is AC7b at short viewports.** Task 10's two-equation end panel overflowed inside
> the stylesheet's own `@media (max-width: 44rem), (max-height: 34rem)` breakpoint, with the
> Opponent's panel unreachable under `.wc-shell { overflow: hidden }`. The fix pass added
> `align-self: stretch` + `min-height: 0` + `justify-content: center` + `overflow-y: auto` to
> `.wc-table-inner`, which resolved the end panel **but regressed the declare gate**: centred content
> in a scroll container is clipped symmetrically and `scrollTop` cannot go negative, so the "Play to
> Win" heading is unreachable at any scroll position at 680×520 and 700×544, and a click on that
> button failed on first attempt. Measured by QA at both sizes.
>
> **The two-round review cap was reached**, so this is handed to the developer rather than auto-fixed
> a third time. Candidate resolutions QA named: scope the stretch/scroll to the end-panel state alone,
> or use `align-items: flex-start` so `scrollTop: 0` shows the true top of content. Task 16
> (`pr-description.md`) is deliberately unwritten until this closes.

**Goal:** Delete the Demand and the capped Lose-credit mechanic in one pass, leaving the app playable on a single coherent scoring path where each side is paid for its own captured cards at the declaration's value scheme, and the end panel states `card value × Standing` as Damage for both sides.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved at the gate, 2026-08-12).

---

## File map

**Created:** *(none — no new files)*

**Modified:**

- `src/hunt/types.ts` — delete `Demand`; rename `Score` → `Damage`; narrow `Hunt` to `{ quarry }`.
- `src/hunt/config.ts:1,197-219,241-247` — delete `DemandCurve`, `DEMAND_CURVE`, `FIXED_DEMAND`, `LOSE_CREDITS_PER_HUNT` and the `Demand` import.
- `src/hunt/index.ts:1,4,12,17,21` — drop five exports, swap `Score` for `Damage`.
- `src/hunt/__tests__/config.test.ts:9,14,173-176,200-203` — delete the Demand and credit-pool suites.
- `src/warCouncil/types.ts:1,59-76,107-109` — narrow `DeclarationState` to `{ path }`; add `declaredPath`.
- `src/warCouncil/declareHunt.ts:14-47` — drop the `loseCredits` parameter and the three credit fields.
- `src/warCouncil/spoils.ts` — single branch, no ±1 fold, declaration-derived value; delete `creditedTrickWorth`.
- `src/warCouncil/scoring.ts` — delete four exports; `HuntScore` → `HuntDamage` with `damage`; declaration-derived defaults.
- `src/warCouncil/playCard.ts:106-108` — comment-only: drop the pointer at the deleted `claimLostTrick.ts`.
- `src/warCouncil/index.ts:25-26,29,32-33` — barrel: drop six names, add `declaredPath`, swap `HuntScore` for `HuntDamage`.
- `src/app/warCouncil/labels.ts:1-12,69-73,88-95` — delete `DEMAND_OUTCOME_VERDICT` and `CLAIM_REJECTION_MESSAGE`.
- `src/app/warCouncil/roundReducer.ts:1-20,42-96,166-196` — delete the `ClaimTrick` action and `handleClaimTrick`; `Declare` loses `loseCredits`.
- `src/app/warCouncil/HuntLedger.tsx` — three cells, not five; Score cell reads Damage.
- `src/app/warCouncil/RoundStatusBand.tsx:1-17,26-35,66` — drop the `demand` and `declaration` props.
- `src/app/warCouncil/TrickWell.tsx:1-58,60-106` — delete the claim control, the claim-worth preview, and three props.
- `src/app/warCouncil/RoundOverPanel.tsx` — two equations, one per side; no Demand line, no verdict.
- `src/app/warCouncil/DeclareGate.tsx:1-21,47-56` — drop both props; new Lose-option body and foot copy.
- `src/app/warCouncil/WarCouncilRound.tsx:1-42,66-90,122-124,133-141,143-210,212-224` — derive `huntDamage` once; drop the claim path.
- `src/app/warCouncilMount.ts:6-15` — `score` → `damage`; the `hunt` docblock loses its Demand justification.
- `src/App.tsx:1-14` — `HUNT` narrows to `{ quarry }`.
- `src/app/warCouncil/warCouncilHunt.css:33-36,44-58,231-247` — delete the Demand, credits and verdict blocks; add the per-side panel blocks.
- `src/app/warCouncil/warCouncilDeclare.css:78-79` — comment-only: the Demand/Standing analogy names a cell that no longer exists.
- Specs rewritten in the task that changes their subject: `src/warCouncil/__tests__/{types,declareHunt,spoils,scoring,cpuPlayer,playCard,quarryIntent}.test.ts`, `src/app/warCouncil/__tests__/{labels,roundReducer,HuntLedger,TrickWell,DeclareGate,WarCouncilRound,intentPreview}.test.*`, `src/app/warCouncil/__tests__/roundFixture.ts`.

**Deleted:**

- `src/warCouncil/claimLostTrick.ts`
- `src/warCouncil/__tests__/claimLostTrick.test.ts`

**Developer decides or observes:**

- **Copy on the declare gate** — the Lose option's body and the foot line, per `plan.md` → Data shapes → *Copy that must change*. The proposed strings describe the **interim**, which will read as slightly wrong to anyone who has read §1's pile swap. Judge them in the running app.
- **The end panel's two-sided layout** — whether two mirrored equations read as a comparison or as two unrelated sums, and whether the heavier border on the higher total is the right marker. `mockup.html` §4 is the reference; the real thing is the thing to judge.
- **The Lose path now has no decision of its own between tricks** — thirteen fewer forks per round. Expected for the interim; worth playing before DLR-68 lands.
- **No tuning value is needed by this contract.** Every constant in the diff is deleted; none is added. Stated so no phase invents one.

---

## Phase 1 — The engine and config in their new shapes

This phase takes `src/hunt/` and `src/warCouncil/` down to the shapes `plan.md` → Data shapes specifies, with their specs rewritten alongside. **The boundary is deliberately asymmetric and that is the safe stopping point:** at the end of this phase `src/hunt/**` and `src/warCouncil/**` type-check and their Vitest suites pass, while `src/app/**` does not compile — it is downstream of an engine signature change and cannot be otherwise. Nothing is half-applied *within* either engine tree: no dangling export, no reader left expecting a deleted field, no spec asserting a removed behaviour. If a step misbehaves, stop and re-evaluate here rather than pressing into Phase 2, because Phase 2's edits are all consequences of these signatures.

### Task 1: Narrow the `hunt` module — delete the Demand constants, rename Score to Damage ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/types.ts`, `src/hunt/config.ts:1,197-219,241-247`, `src/hunt/index.ts:1,4,12,17,21`
- Test: `src/hunt/__tests__/config.test.ts:9,14,173-176,200-203`
- Config: `src/hunt/config.ts` — delete the `FIXED_DEMAND`, `DEMAND_CURVE` and `LOSE_CREDITS_PER_HUNT` keys

This is one task, not three, because the key, its type, its barrel export and its spec bind to each other by name across four files — splitting them leaves a tree that type-checks against a key that no longer exists.

- [x] **Step 1: Delete the `Demand` alias and narrow `Hunt` in `src/hunt/types.ts`**

Delete lines 21–22 (`/** The encounter's score target… */ export type Demand = number`). Replace lines 24–25 and lines 50–60 with:

```ts
/** A side's card value × its Standing for one Hunt — what depletes the other side's health
 *  (§1's vocabulary table). Renamed from `Score` on DLR-67: there is no target to score
 *  against any more. Nothing applies it yet; DLR-68 owns that. */
export type Damage = number
```

```ts
/** One 13-trick round — the inner loop. Each side's `card value × Standing` is damage to the
 *  other (§1, §10). Narrowed on DLR-67: the Demand and the Lose-credit pool are both retired. */
export interface Hunt {
  readonly quarry: Quarry
}
```

- [x] **Step 2: Delete the four config members in `src/hunt/config.ts`**

Change line 1 to drop the `Demand` import:

```ts
import { HuntDeclaration, QuarryCharacter, DuelSide, type Health } from './types'
```

Delete these four blocks entirely, comments included: lines 197–205 (`LOSE_CREDITS_PER_HUNT` and its comment), lines 207–210 (`interface DemandCurve`), lines 212–219 (`DEMAND_CURVE` and its comment), lines 241–247 (`FIXED_DEMAND` and its comment).

- [x] **Step 3: Update the barrel in `src/hunt/index.ts`**

Line 1 becomes:

```ts
export type { Hunt, Quarry, Spoils, Standing, Damage, Health } from './types'
```

Line 4 becomes `export type { StandingBand } from './config'`. Delete `DEMAND_CURVE` (line 12), `FIXED_DEMAND` (line 17) and `LOSE_CREDITS_PER_HUNT` (line 21) from the value-export list.

- [x] **Step 4: Delete the dead suites from `src/hunt/__tests__/config.test.ts`**

Remove `DEMAND_CURVE` (line 9) and `FIXED_DEMAND` (line 14) from the import list, and delete the two describe blocks that assert them — the one covering `DEMAND_CURVE`'s null fields around lines 173–176, and the one covering `FIXED_DEMAND` around lines 200–203. Every other suite in the file (the two multiplier tables, complementarity, `cardValueFor`, `roundDamage`, the health constants) is untouched.

- [x] **Step 5: Verify the hunt module in isolation**

Run: `npx vitest run src/hunt`
Expected: exits 0; Vitest reports 0 failed and the `config.test.ts` / `quarryCharacters.test.ts` files collected.

### Task 2: Narrow `DeclarationState`, add `declaredPath`, delete the claim module ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/types.ts:1,59-76,107-109`, `src/warCouncil/declareHunt.ts:14-47`, `src/warCouncil/playCard.ts:106-108`
- Delete: `src/warCouncil/claimLostTrick.ts`, `src/warCouncil/__tests__/claimLostTrick.test.ts`
- Test: `src/warCouncil/__tests__/types.test.ts`, `src/warCouncil/__tests__/declareHunt.test.ts`, and the fixture literals in `src/warCouncil/__tests__/{cpuPlayer,playCard,quarryIntent}.test.ts`

- [x] **Step 1: Narrow `DeclarationState` and add `declaredPath` in `src/warCouncil/types.ts`**

Change line 1 to a value import, since `declaredPath` needs `HuntDeclaration` at runtime:

```ts
import { HuntDeclaration, type QuarryCharacter } from '../hunt'
```

Replace lines 59–76 with:

```ts
/**
 * The declaration made before the first trick. Narrowed to `path` alone on DLR-67 — the
 * Lose path's credit bookkeeping (`creditsRemaining`, `creditedCards`, `creditedThrough`)
 * is retired along with the mechanic that spent it (§1: the pile swap "replaces it
 * outright"). Kept as a nested object rather than a bare field on `RoundState` so a reader
 * still has exactly one absence check.
 */
export interface DeclarationState {
  readonly path: HuntDeclaration
}
```

Add immediately after `currentTurn` (line 109), matching its shape as a pure derived reading of `RoundState`:

```ts
/**
 * The value scheme and Standing table in force. An undeclared round reads as Win: nothing has
 * scored yet, and the readouts need a table to display before the player declares. The single
 * statement of that default — `spoils`, `scoreHunt` and the status band all read it here rather
 * than each writing their own `?? HuntDeclaration.Win`.
 */
export function declaredPath(state: RoundState): HuntDeclaration {
  return state.declaration?.path ?? HuntDeclaration.Win
}
```

Also update `RoundState.declaration`'s docblock (lines 97–103) to drop its `claimLostTrick` reference: it is now written by `declareHunt` and never updated thereafter.

- [x] **Step 2: Add the `declaredPath` cases to `src/warCouncil/__tests__/types.test.ts`**

Import `declaredPath` and `HuntDeclaration`, then append:

```ts
describe('declaredPath', () => {
  it('reads Win on an undeclared round, so the readouts have a table before the player declares', () => {
    expect(declaredPath(baseState())).toBe(HuntDeclaration.Win)
  })

  it('reads the declared path once one is written', () => {
    for (const path of [HuntDeclaration.Win, HuntDeclaration.Lose]) {
      expect(declaredPath(baseState({ declaration: { path } }))).toBe(path)
    }
  })
})
```

- [x] **Step 3: Reduce `declareHunt` to two parameters**

In `src/warCouncil/declareHunt.ts`, replace the docblock and signature at lines 14–47 so the function takes `(state, path)` and writes `{ path }` only. Both guards and both rejection reasons are unchanged (AC5):

```ts
/**
 * AC1: writes the declaration once, before the first card is played. Shaped like `playCard` —
 * a named rejection rather than a throw, and the input state is never partially mutated.
 *
 * Took a `loseCredits` pool until DLR-67; the credit mechanic it seeded is retired, so the
 * declaration is now the path and nothing else.
 */
export function declareHunt(state: RoundState, path: HuntDeclaration): DeclareResult {
  if (state.declaration !== undefined) {
    return { ok: false, reason: DeclareRejection.AlreadyDeclared }
  }
  if (state.tricksPlayed > 0 || state.currentTrick.length > 0) {
    return { ok: false, reason: DeclareRejection.HuntUnderway }
  }

  return { ok: true, state: { ...state, declaration: { path } } }
}
```

`HuntDeclaration` is already imported as a value at line 1; leave it.

- [x] **Step 4: Rewrite `src/warCouncil/__tests__/declareHunt.test.ts` for the two-parameter form**

Drop the third argument from all six calls. Replace the two credit-asserting cases (lines 24–42) with a single pair that asserts the whole written shape, so a re-added field fails loudly:

```ts
it('writes a Win declaration as the path and nothing else', () => {
  const result = declareHunt(undeclaredRound(), HuntDeclaration.Win)
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.state.declaration).toEqual({ path: HuntDeclaration.Win })
})

it('writes a Lose declaration as the path and nothing else', () => {
  const result = declareHunt(undeclaredRound(), HuntDeclaration.Lose)
  expect(result.ok).toBe(true)
  if (!result.ok) return
  expect(result.state.declaration).toEqual({ path: HuntDeclaration.Lose })
})
```

The four remaining cases (no mutation, both rejections) keep their assertions and lose only the `, 3` argument.

- [x] **Step 5: Delete the claim module and its spec**

Run: `Remove-Item src\warCouncil\claimLostTrick.ts, src\warCouncil\__tests__\claimLostTrick.test.ts`
Expected: both files gone; `Get-ChildItem src\warCouncil\claimLostTrick.ts -ErrorAction SilentlyContinue` returns nothing.

- [x] **Step 6: Drop the deleted module's name from `src/warCouncil/playCard.ts`**

Replace the three comment lines at 106–108 with a statement that survives the deletion:

```ts
  // `capturedCards` is appended as exactly `[lead, follow]` for the winning side, in that
  // order. `spoils` sums each side's own pile, so the order is not load-bearing for scoring
  // — but DLR-68's pile swap reads these piles too, so keep the append shape deliberate.
```

- [x] **Step 7: Strip the three dead fields from the remaining engine fixtures**

In `src/warCouncil/__tests__/cpuPlayer.test.ts:29-33`, `playCard.test.ts:19-23` and `quarryIntent.test.ts:20-24`, each builds a `DeclarationState` literal carrying `creditsRemaining`, `creditedCards` and `creditedThrough`. Reduce each to `{ path: <the path that literal already used> }` and drop the now-unused `creditsRemaining`/`creditedCards`/`creditedThrough` lines. Do not change what those specs assert — they test CPU choice, card play and intent, none of which touches the declaration beyond its presence.

- [x] **Step 8: Verify the declaration surface**

Run: `npx vitest run src/warCouncil/__tests__/types.test.ts src/warCouncil/__tests__/declareHunt.test.ts src/warCouncil/__tests__/cpuPlayer.test.ts src/warCouncil/__tests__/playCard.test.ts src/warCouncil/__tests__/quarryIntent.test.ts`
Expected: exits 0; Vitest reports 0 failed across five files.

### Task 3: Collapse `spoils` to one branch at the declaration's value scheme ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/spoils.ts`
- Test: `src/warCouncil/__tests__/spoils.test.ts`

**The Treasure/Poison fold is removed here** — approved at the gate. §1 (`hybrid-design.md` lines 39–40) states "No modifier of any kind touches either value", §9 lines 152–155 delete both rows with the arithmetic, and `cardValueFor`'s own docblock at `src/hunt/config.ts:111-113` already records them as Decided-removed.

- [x] **Step 1: Replace `src/warCouncil/spoils.ts` in full**

```ts
import { cardValueFor, type Spoils } from '../hunt'
import { declaredPath, type PlayerSide, type RoundState } from './types'

/**
 * §1's additive term: the cards on a side's own side of the table, at the value scheme the
 * declaration puts in force — printed rank on Win, `12 − r` on Lose (DLR-66's `cardValueFor`).
 * No modifier of any kind is applied: the Treasure `+1` and Poison `−1` are Decided-removed
 * (§1, §9 2026-08-11), and at ×5 a ±1 card modifier moved a Hunt by under 1% of the ceiling.
 *
 * ONE branch, deliberately. DLR-63's Lose branch summed a capped pool of credited cards from
 * the Quarry's pile; DLR-67 retires that mechanic, and DLR-68's pile swap replaces this
 * own-pile reading with the uncapped two-way swap §1 specifies. **This is a chosen interim,
 * not an accident** — for one ticket both sides are simply paid for what they captured.
 *
 * `cardValue` defaults off the state's own declaration and is overridable only for tests,
 * mirroring `resolveStanding`'s injectable-table pattern in src/hunt/config.ts.
 */
export function spoils(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardValueFor(declaredPath(state)),
): Spoils {
  return state.capturedCards[side].reduce((total, card) => total + cardValue(card.rank), 0)
}
```

`creditedTrickWorth` and the private `sumCards` go with it — neither has a caller after Task 5 and Phase 2.

- [x] **Step 2: Rewrite `src/warCouncil/__tests__/spoils.test.ts`**

Keep `stateWithCaptured` as-is (it already takes an optional `declaration`, now of the narrowed type). Delete the two Treasure/Poison describe blocks and the whole `DLR-63 AC3, the Lose branch` block. Replace with suites that assert against `cardValueFor` rather than hand-written numbers, so a retuned value scheme cannot silently pass:

```ts
describe('spoils — the flat-value identity survives (§3)', () => {
  it('equals 2 × tricksWon under a flat card value of 1', () => {
    const captured = {
      player: [
        { suit: 'bells' as const, rank: 2 },
        { suit: 'keys' as const, rank: 3 },
        { suit: 'moons' as const, rank: 4 },
        { suit: 'bells' as const, rank: 5 },
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 2, cpu: 0 })
    expect(spoils(state, 'player', () => 1)).toBe(2 * state.tricksWon.player)
  })

  it('returns 0 for a side with no captured cards', () => {
    const state = stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 0 })
    expect(spoils(state, 'player')).toBe(0)
    expect(spoils(state, 'cpu')).toBe(0)
  })
})

describe('spoils — no modifier of any kind is applied (§1, DLR-67)', () => {
  it('scores a Treasure and a Poison at their bare configured value, with no ±1', () => {
    const captured = {
      player: [
        { suit: 'keys' as const, rank: CardRank.Treasure },
        { suit: 'moons' as const, rank: CardRank.Poison },
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 1, cpu: 0 })
    const value = cardValueFor(HuntDeclaration.Win)
    expect(spoils(state, 'player')).toBe(value(CardRank.Treasure) + value(CardRank.Poison))
  })
})

describe('spoils — the declaration governs the value scheme for BOTH sides (AC4)', () => {
  const captured = {
    player: [{ suit: 'bells' as const, rank: 1 }],
    cpu: [{ suit: 'keys' as const, rank: 11 }],
  }

  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    'values each side’s own pile through cardValueFor(%s)',
    (path) => {
      const state = { ...stateWithCaptured(captured, { player: 1, cpu: 1 }), declaration: { path } }
      const value = cardValueFor(path)
      expect(spoils(state, 'player')).toBe(value(1))
      expect(spoils(state, 'cpu')).toBe(value(11))
    },
  )

  it('reads an undeclared round as Win, identically to a declared one', () => {
    const undeclared = stateWithCaptured(captured, { player: 1, cpu: 1 })
    const declared = { ...undeclared, declaration: { path: HuntDeclaration.Win } }
    expect(spoils(undeclared, 'player')).toBe(spoils(declared, 'player'))
    expect(spoils(undeclared, 'cpu')).toBe(spoils(declared, 'cpu'))
  })
})
```

Add `CardRank` to the `../types` import and `cardValueFor` to the `../../hunt` import.

- [x] **Step 3: Verify**

Run: `npx vitest run src/warCouncil/__tests__/spoils.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 4: Strip `scoring.ts` to `scoreHunt`, and rename Score to Damage ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts`
- Test: `src/warCouncil/__tests__/scoring.test.ts`

- [x] **Step 1: Replace `src/warCouncil/scoring.ts` in full**

```ts
import {
  cardValueFor,
  resolveStanding,
  standingTableFor,
  type Damage,
  type Spoils,
  type Standing,
  type StandingBand,
} from '../hunt'
import { spoils } from './spoils'
import { declaredPath, type PlayerSide, type RoundState } from './types'

/** One side's finished Hunt — every field derived once from a final `RoundState`, never
 *  accumulated per trick. Renamed from `HuntScore` on DLR-67: the product is damage to the
 *  other side, not a score checked against a target. DLR-68 renames `spoils` to `cardValue`
 *  and folds both sides into one `huntDamage(finalState)` entry point. */
export interface HuntDamage {
  readonly spoils: Spoils
  readonly tricks: number
  readonly band: StandingBand
  readonly standing: Standing
  readonly damage: Damage
}

/**
 * Computes §1's equation once for `side`, from `state`'s already-final `tricksWon` /
 * `capturedCards`.
 *
 * Both terms default off the state's OWN declaration via `declaredPath` — they defaulted to
 * the Win table and base card value until DLR-67, which was correct only while the Demand
 * made the player's side the only one scored. They stay injectable so a test can hold one axis
 * flat while varying the other, mirroring `resolveStanding`'s pattern in src/hunt/config.ts.
 */
export function scoreHunt(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardValueFor(declaredPath(state)),
  standingTable: readonly StandingBand[] = standingTableFor(declaredPath(state)),
): HuntDamage {
  const tricks = state.tricksWon[side]
  const band = resolveStanding(tricks, standingTable)
  const spoilsValue = spoils(state, side, cardValue)
  return {
    spoils: spoilsValue,
    tricks,
    band,
    standing: band.multiplier,
    damage: spoilsValue * band.multiplier,
  }
}
```

`tricksToPoints`, `scoreRound`, `DemandOutcome` and `checkDemand` are gone, along with the `HuntDeclaration`, `cardBaseValue`, `Score` and `Demand` imports they needed. `resolveStanding` stays — `scoreHunt` still calls it.

- [x] **Step 2: Rewrite `src/warCouncil/__tests__/scoring.test.ts`**

Delete the `tricksToPoints`, `scoreRound` and `checkDemand` describe blocks and their imports. Delete the `NEUTRAL_RANKS` fixture and let `fillerCards` use plain ranks — it existed only to dodge the ±1 fold Task 3 removed:

```ts
function fillerCards(count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({ suit: Suit.Bells, rank: (i % 11) + 1 }))
}
```

Rename `result.score` to `result.damage` at lines 82, 94, 99, 100 and 116. Then add the case that pins the new declaration-derived defaults, which no compiler check would catch:

```ts
describe('scoreHunt — both defaults come from the state’s own declaration (DLR-67)', () => {
  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    'reads cardValueFor(%s) and standingTableFor(%s) with no argument supplied',
    (path) => {
      const state = { ...huntState({ player: fillerCards(8), cpu: [] }, { player: 4, cpu: 9 }), declaration: { path } }
      const expected = scoreHunt(state, PlayerSide.Player, cardValueFor(path), standingTableFor(path))
      expect(scoreHunt(state, PlayerSide.Player)).toEqual(expected)
      expect(scoreHunt(state, PlayerSide.Player).standing).toBe(resolveStanding(4, standingTableFor(path)).multiplier)
    },
  )

  it('reads the Win table on an undeclared round', () => {
    const state = huntState({ player: fillerCards(8), cpu: [] }, { player: 4, cpu: 9 })
    expect(scoreHunt(state, PlayerSide.Player).standing).toBe(resolveStanding(4, winTable).multiplier)
  })
})
```

The 4-trick split is chosen because it is one of the splits where the two tables genuinely disagree (Win ×2, Lose ×5), so a default re-pointed at the wrong table fails loudly. Add `cardValueFor` to the `../../hunt` import.

- [x] **Step 3: Verify**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 5: Update the `warCouncil` barrel and confirm the engine is whole ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts:15-16,25-26,29,32-33`

- [x] **Step 1: Correct the exports in `src/warCouncil/index.ts`**

Add `declaredPath` to the value-export list from `./types` (lines 3–14, alphabetically after `currentTurn`). Replace lines 25–26 with:

```ts
export { scoreHunt } from './scoring'
export type { HuntDamage } from './scoring'
```

Change line 29 to `export { spoils } from './spoils'`. Delete lines 32–33 entirely — `claimLostTrick.ts` no longer exists.

- [x] **Step 2: Confirm no engine module still names a deleted symbol**

Run: `Get-ChildItem src\warCouncil, src\hunt -Recurse -Include *.ts | Select-String -Pattern "checkDemand|DemandOutcome|scoreRound|tricksToPoints|claimLostTrick|canClaimLostTrick|ClaimRejection|ClaimResult|creditedTrickWorth|creditsRemaining|creditedCards|creditedThrough|FIXED_DEMAND|DEMAND_CURVE|LOSE_CREDITS_PER_HUNT"`
Expected: zero hits. **`Get-ChildItem -Recurse`, not `Select-String -Path src\**\*.ts`** — `**` matches exactly one directory level in PowerShell, so the `-Path` form silently skips every `__tests__` folder and reports a false zero (`.claude/workflow/web-project.md` → hard constraints).

- [x] **Step 3: Run both engine suites in full**

Run: `npx vitest run src/warCouncil src/hunt`
Expected: exits 0; Vitest reports 0 failed. `src/app/**` is expected not to type-check at this point — that is Phase 2's work and is not a defect here.

---

## Phase 2 — The screen matches the engine

Every edit in this phase is a consequence of Phase 1's signatures: props that named a deleted type, a reducer action with nothing left to dispatch to, two ledger cells reading values that no longer exist, and the one addition AC7 requires. The phase ends with the whole project type-checking and every spec passing, so it is the first point at which `npm run typecheck` is expected to be clean. Layout per `mockup.html` in this folder — it settles the end panel's two-sided arrangement and the ledger's surviving three cells.

### Task 6: Delete the two dead label maps ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/labels.ts:1-12,69-73,88-95`
- Test: `src/app/warCouncil/__tests__/labels.test.ts:3,5,13,66-67,87-88`

- [x] **Step 1: Delete `DEMAND_OUTCOME_VERDICT` and `CLAIM_REJECTION_MESSAGE`**

Remove `ClaimRejection` (line 3) and `DemandOutcome` (line 5) from the `../../warCouncil` import. Delete lines 69–73 (`DEMAND_OUTCOME_VERDICT` with its docblock) and lines 88–95 (`CLAIM_REJECTION_MESSAGE` with its docblock). `ILLEGAL_MOVE_MESSAGE`, `STANCE_PHRASE`, `STANDING_BAND_NAME`, `HUNT_DECLARATION_NAME` and `DECLARE_REJECTION_MESSAGE` all stay — `DECLARE_REJECTION_MESSAGE` in particular, because AC5 keeps both declare guards.

- [x] **Step 2: Delete the matching suites in `src/app/warCouncil/__tests__/labels.test.ts`**

Drop `DEMAND_OUTCOME_VERDICT` (line 5) and `CLAIM_REJECTION_MESSAGE` (line 13) from the imports, and delete the two describe blocks asserting them (around lines 66–67 and 87–88). Leave every other suite intact.

- [x] **Step 3: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 7: Delete the `ClaimTrick` action from the reducer ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts:1-20,42-96,166-196`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts:35-37,306-369`

- [x] **Step 1: Remove the action, its case and its handler**

In `src/app/warCouncil/roundReducer.ts`: drop `canClaimLostTrick` (line 6) and `claimLostTrick` (line 8) from the `../../warCouncil` import; delete `ClaimTrick: 'claimTrick',` from `RoundUiActionKind` (line 48); delete the `ClaimTrick` member from the `RoundUiAction` union (line 62); delete `readonly loseCredits: number` from the `Declare` member (line 60); delete the `case RoundUiActionKind.ClaimTrick` arm (lines 93–94); delete `handleClaimTrick` in full (lines 175–196).

Narrow `handleDeclare` (lines 161–173) to two parameters:

```ts
/**
 * AC1. A rejection returns the input state unchanged — both of `declareHunt`'s rejections are
 * structurally unreachable from the gate, which only renders while `declaration` is undefined,
 * so this is a guard rather than a live path.
 */
function handleDeclare(state: RoundUiState, path: HuntDeclaration): RoundUiState {
  const result = declareHunt(state.round, path)
  return result.ok ? { ...state, round: result.state } : state
}
```

and change its call site (line 92) to `return handleDeclare(state, action.path)`.

- [x] **Step 2: Rewrite the affected suites in `src/app/warCouncil/__tests__/roundReducer.test.ts`**

Reduce the fixture's `DeclarationState` literal at lines 35–37 to `{ path: … }`. Drop `loseCredits` from all five `Declare` dispatches in the `DLR-63 Declare` block (lines 306–341) and replace the two credit assertions (lines 315, 325) with a shape assertion:

```ts
expect(next.round.declaration).toEqual({ path: HuntDeclaration.Win })
```

```ts
expect(next.round.declaration).toEqual({ path: HuntDeclaration.Lose })
```

Delete the whole `roundReducer — DLR-63 ClaimTrick` describe block (lines 343–369) — its subject no longer exists, and AC6 forbids leaving it asserting a removed behaviour.

- [x] **Step 3: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: exits 0; Vitest reports 0 failed.

### Task 8: Three ledger cells, and the Score cell reads Damage ✓

- Skill: `react-frontend` + `game-ux`

**Files:**

- Modify: `src/app/warCouncil/HuntLedger.tsx`, `src/app/warCouncil/RoundStatusBand.tsx:1-17,26-35,66`, `src/app/warCouncil/warCouncilHunt.css:33-36,44-58`
- Test: `src/app/warCouncil/__tests__/HuntLedger.test.tsx`

**Do not touch any `wc-score-*` class.** They style the trick counter at `RoundStatusBand.tsx:52-63` (rules at `warCouncil.css:113-154`), not the Damage cell, and they bind by string in both directions — a rename here type-checks cleanly and silently unstyles the trick counter.

- [x] **Step 1: Reduce `HuntLedger.tsx` to three cells**

Replace lines 1–11 and 22–26, and delete the Demand cell (lines 61–71) and the credits block (lines 72–86). The surviving third cell's key and `aria-label` become Damage:

```ts
import type { Spoils, StandingBand } from '../../hunt'
import { STANDING_BAND_NAME } from './labels'

interface HuntLedgerProps {
  readonly spoils: Spoils
  readonly band: StandingBand
}

/**
 * §1's equation in progress: running Spoils, the Standing band the player's trick count
 * currently sits in, and the Damage they make. Computes only that product — both inputs arrive
 * already derived from config through `spoils` and `resolveStanding`, so no multiplier or band
 * boundary is written here. The Demand cell and the Lose-credit cell were removed on DLR-67.
 *
 * Each cell carries its own `aria-label` because the visible value is a bare number whose
 * meaning lives in a separate key element.
 */
export default function HuntLedger({ spoils, band }: HuntLedgerProps) {
  const bandName = STANDING_BAND_NAME[band.name]
  const damage = spoils * band.multiplier
```

In the third cell, the key text becomes `Damage` and the value's `aria-label` becomes `` `Damage so far: ${damage}` ``, rendering `{damage}`.

- [x] **Step 2: Drop the two dead props from `RoundStatusBand.tsx`**

Change line 1 to `import type { Spoils, StandingBand } from '../../hunt'` and line 2 to `import { PlayerSide } from '../../warCouncil'`. Delete `demand` and `declaration` from `RoundStatusBandProps` (lines 12, 16 with its comment) and from the destructured parameter list (lines 31, 34). Line 66 becomes:

```tsx
      <HuntLedger spoils={spoils} band={band} />
```

- [x] **Step 3: Delete the orphaned CSS**

In `src/app/warCouncil/warCouncilHunt.css`, delete lines 33–36 (the `.wc-ledger-cell.wc-is-demand` rule and its comment) and lines 44–58 (the `.wc-is-credits` block, its `.wc-is-spent` variants and their comment). Amend the surviving comment above `.wc-ledger-cell.wc-is-band` so it no longer names the Demand: the dashed border now distinguishes Standing from the two plain cells.

- [x] **Step 4: Rewrite `src/app/warCouncil/__tests__/HuntLedger.test.tsx`**

Delete the `losing` fixture (lines 13–18), the `loseTable` const if it becomes unused, and the three credit-cell suites (lines 41–75). Rewrite the two survivors against the new two-prop signature:

```tsx
describe('HuntLedger', () => {
  it('names the running Spoils, the Standing band with its multiplier, and the Damage they make', () => {
    const band = resolveStanding(7, winTable) // Victorious ×5 on the Win table
    render(<HuntLedger spoils={48} band={band} />)

    expect(screen.getByLabelText('Running Spoils: 48')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Victorious, multiplier 5/)).toBeDefined()
    expect(screen.getByLabelText('Damage so far: 240')).toBeDefined()
  })

  it('reads the Damage as 0, not blank, when the band multiplier is 0', () => {
    // No shipped band is ×0 since DLR-66, so the falsy-multiplier guard builds its own band.
    // The regression it protects against — a `0` rendering as an empty cell — is unchanged.
    const zeroBand = { ...resolveStanding(10, winTable), multiplier: 0 }
    render(<HuntLedger spoils={84} band={zeroBand} />)

    expect(screen.getByLabelText('Damage so far: 0')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Greedy, multiplier 0/)).toBeDefined()
  })

  it('renders no Demand cell and no credits cell', () => {
    render(<HuntLedger spoils={48} band={resolveStanding(7, winTable)} />)
    expect(screen.queryByLabelText(/The Demand/)).toBeNull()
    expect(screen.queryByLabelText(/Lose-credits remaining/)).toBeNull()
  })
})
```

- [x] **Step 5: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/HuntLedger.test.tsx`
Expected: exits 0; Vitest reports 0 failed.

### Task 9: Delete the claim control from the trick well ✓

- Skill: `react-frontend` + `game-ux`

**Files:**

- Modify: `src/app/warCouncil/TrickWell.tsx:1-58,60-106`, `src/app/warCouncil/warCouncilHunt.css` (the `.wc-claim-worth`, `.wc-claim-row` and `.wc-claim` rules)
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx`

After this the resolved-trick branch always offers exactly one control — the same carry-on the Win path already had. Layout per `mockup.html` §3.

- [x] **Step 1: Remove the three props and the claim branch**

In `src/app/warCouncil/TrickWell.tsx`: drop `creditedTrickWorth` from the line-2 import, leaving `import { PlayerSide, type TrickCard } from '../../warCouncil'`; delete `claimable`, `creditsRemaining` and `onClaim` from `TrickWellProps` (lines 18–21) and from the destructured parameter list (lines 36–38); delete `handleClaimClick` (lines 55–58); delete the `claimWorth` const (lines 62–65) with its comment.

Replace the conditional at lines 85–103 with the carry-on control unconditionally:

```tsx
        <p className="wc-table-line">{winnerLabel} take the trick.</p>
        <button type="button" className="wc-table-hint wc-is-carry-on" onClick={handleHintClick}>
          Tap the table to carry on
        </button>
```

The `handleHintClick` `stopPropagation` guard stays — it still prevents a double-dispatch through the felt's own `onClick`.

- [x] **Step 2: Delete the orphaned claim CSS** (found in `warCouncilDeclare.css` and `warCouncilCards.css` — the task's file map cited `warCouncilHunt.css`, which held none of these rules; anchored on the grep instead)

Run: `Select-String -Path src\app\warCouncil\*.css -Pattern "wc-claim"`
Expected: this locates every rule; delete each `.wc-claim`, `.wc-claim-row` and `.wc-claim-worth` block found, then re-run and expect zero hits.

- [x] **Step 3: Replace `src/app/warCouncil/__tests__/TrickWell.test.tsx`** (first assertion adjusted to filter to enabled buttons — `PlayingCard` renders every table-variant card as its own disabled `<button>`, so an unfiltered `getAllByRole('button')` finds 3, not 1; noted in the Implementer report)

Every one of its three suites tests the deleted claim control, and its fixture comment documents a Treasure-fold behaviour that no longer exists. Replace the whole file with coverage of what the branch does now:

```tsx
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerSide, Suit } from '../../../warCouncil'
import type { ResolvedTrick } from '../roundReducer'
import TrickWell from '../TrickWell'

afterEach(cleanup)

const resolvedTrick: ResolvedTrick = {
  cards: [
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: 7 } },
    { side: PlayerSide.Cpu, card: { suit: Suit.Keys, rank: 2 } },
  ],
  winner: PlayerSide.Cpu,
}

describe('TrickWell — a resolved trick', () => {
  it('offers exactly one control, and it carries on (DLR-67: the claim fork is gone)', () => {
    const onCarryOn = vi.fn()
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={onCarryOn}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    fireEvent.click(buttons[0])
    expect(onCarryOn).toHaveBeenCalledTimes(1)
  })

  it('renders no claim control and no claim-worth preview', () => {
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: /claim/i })).toBeNull()
    expect(screen.queryByText(/Claiming credits/)).toBeNull()
  })

  it('names the winning side', () => {
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={resolvedTrick}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.getByText(/They take the trick/)).toBeDefined()
  })
})
```

- [x] **Step 4: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/TrickWell.test.tsx`
Expected: exits 0; Vitest reports 0 failed.

### Task 10: Two equations on the end panel, no target and no verdict ✓

- Skill: `react-frontend` + `game-ux`

**Files:**

- Modify: `src/app/warCouncil/RoundOverPanel.tsx`, `src/app/warCouncil/warCouncilHunt.css:231-247`

This is the contract's one addition (AC7). Layout per `mockup.html` §4: two mirrored equation groups side by side, each named for its side, the higher total marked by a heavier border so the distinction survives without colour.

- [x] **Step 1: Rewrite `src/app/warCouncil/RoundOverPanel.tsx`**

Replace the imports, props and the body between the `<h2>` and the tally:

```tsx
import { PlayerSide, type HuntDamage } from '../../warCouncil'
import { STANDING_BAND_NAME } from './labels'

const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'You',
  [PlayerSide.Cpu]: 'Opponent',
}

interface RoundOverPanelProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly huntDamage: Readonly<Record<PlayerSide, HuntDamage>>
  readonly onFinish: () => void
}
```

Extract the equation into a local helper below the component (file order: component, then helpers), rendering one group per side. It computes nothing — every value arrives already derived by `scoreHunt`:

```tsx
function SideEquation({ side, damage, ahead }: { side: PlayerSide; damage: HuntDamage; ahead: boolean }) {
  const bandName = STANDING_BAND_NAME[damage.band.name]
  const name = SIDE_LABEL[side]
  return (
    <div className={`wc-side${ahead ? ' wc-is-ahead' : ''}`}>
      <p className="wc-side-name">{name}</p>
      <div className="wc-equation" role="group" aria-label={`${name}: Spoils times Standing equals Damage`}>
        <span className="wc-equation-part">
          <span className="wc-equation-key" aria-hidden="true">Spoils</span>
          <span className="wc-equation-value" aria-label={`${name} Spoils: ${damage.spoils}`}>{damage.spoils}</span>
        </span>
        <span className="wc-equation-op" aria-hidden="true">×</span>
        <span className="wc-equation-part">
          <span className="wc-equation-key" aria-hidden="true">Standing</span>
          <span className="wc-equation-value" aria-label={`${name} Standing multiplier: times ${damage.standing}`}>×{damage.standing}</span>
        </span>
        <span className="wc-equation-op" aria-hidden="true">=</span>
        <span className="wc-equation-part wc-is-result">
          <span className="wc-equation-key" aria-hidden="true">Damage</span>
          <span className="wc-equation-value" aria-label={`${name} Damage: ${damage.damage}`}>{damage.damage}</span>
        </span>
      </div>
      <p className="wc-verdict-detail">{damage.tricks} tricks — {bandName}.</p>
    </div>
  )
}
```

The component body renders both sides inside a `<div className="wc-sides">`, marking `ahead` on whichever `damage.damage` is strictly greater (neither, on a tie), then keeps the existing tricks tally table and the "Finish the round" button unchanged. Delete the Demand paragraph (lines 69–72) and the verdict paragraph (lines 73–75) outright.

- [x] **Step 2: Swap the verdict CSS for the per-side CSS**

In `src/app/warCouncil/warCouncilHunt.css`, delete `.wc-verdict` (line 231), `.wc-verdict.wc-is-cleared` (line 239) and `.wc-verdict.wc-is-missed` (line 244). Keep `.wc-verdict-detail` — it still carries the per-side tricks-and-band line. Add rules for `.wc-sides` (a wrapping flex row), `.wc-side` (a bordered panel), `.wc-side.wc-is-ahead` (a heavier border, so the marker is form and not colour) and `.wc-side-name`, matching `mockup.html`'s values and reusing the sheet's existing custom properties — introduce no new colour literal.

- [x] **Step 3: Confirm the panel file stayed within budget** (124 lines)

Run: `(Get-Content src\app\warCouncil\RoundOverPanel.tsx).Count`
Expected: under 200. Use `.Count`, not `(… | Measure-Object -Line).Lines` — the latter drops blank lines and undercounts, which hid a real 400-line breach on DLR-63.

There is no typecheck step here on purpose: this task changes `RoundOverPanel`'s props while its only consumer is still rewritten in Task 12, so the tree is transiently red between the two. Its assertions live in Task 12, Step 5.

### Task 11: New declare-gate copy, with both props gone ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/DeclareGate.tsx:1-21,47-56`, `src/app/warCouncil/warCouncilDeclare.css:78-79`
- Test: `src/app/warCouncil/__tests__/DeclareGate.test.tsx`

Copy per `plan.md` → Data shapes → *Copy that must change*. It is the developer's to overturn; do not invent an alternative.

- [x] **Step 1: Drop both props and replace the two copy blocks**

Change line 2 to `import { HuntDeclaration, invertedCardValue } from '../../hunt'`. Reduce the props to `{ onDeclare }` and update the docblock so it no longer says `demand` and `loseCredits` arrive resolved from config. Replace the Lose option's body (lines 47–50) and the foot line (lines 53–55):

```tsx
          <span className="wc-declare-option-body">
            Cards invert — a {CardRank.Swan} scores {invertedCardValue(CardRank.Swan)}. Every trick
            you take still adds both its cards to your <b>Spoils</b>, at those inverted values.
          </span>
```

```tsx
      <p className="wc-declare-foot">
        Standing still comes from your trick count either way — but the two paths band it
        differently.
      </p>
```

- [x] **Step 2: Correct the stale CSS comment**

`src/app/warCouncil/warCouncilDeclare.css:78-79` explains the dashed Lose border as "matching how the ledger already separates Demand from Standing". The ledger no longer has a Demand cell; rewrite the clause to name the Standing cell alone.

- [x] **Step 3: Update `src/app/warCouncil/__tests__/DeclareGate.test.tsx`**

Drop `demand` and `loseCredits` from all four `render` calls. Delete the third case entirely (lines 23–26, "shows the credit pool it was handed") — its subject is gone — and add one that pins the surviving derived value:

```tsx
it('reads the inverted example off invertedCardValue, not a hard-coded 11', () => {
  render(<DeclareGate onDeclare={vi.fn()} />)
  const lose = screen.getByRole('button', { name: /lose/i })
  expect(lose.textContent).toContain(String(invertedCardValue(CardRank.Swan)))
})
```

Import `invertedCardValue` from `../../../hunt` and `CardRank` from `../../../warCouncil`. The other three cases keep their assertions unchanged.

- [x] **Step 4: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/DeclareGate.test.tsx`
Expected: exits 0; Vitest reports 0 failed.

### Task 12: Wire the mount — one `huntDamage` record feeding both the panel and `onComplete` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx`, `src/app/warCouncilMount.ts:6-15`, `src/App.tsx:1-14`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`, `src/app/warCouncil/__tests__/roundFixture.ts:48-55`, `src/app/warCouncil/__tests__/intentPreview.test.ts:13-15`

- [x] **Step 1: Rename the mount contract's field and correct its docblock**

In `src/app/warCouncilMount.ts`, replace lines 6–7's comment with one that no longer justifies a Demand, and line 14 with:

```ts
  readonly damage: Readonly<Record<PlayerSide, number>>
```

- [x] **Step 2: Narrow the `HUNT` literal in `src/App.tsx`**

```tsx
import { SLICE_QUARRY_CHARACTER, type Hunt } from './hunt'
```

```tsx
// The slice's single encounter (§11): one Quarry. Built once at module scope because its only
// half is a configuration constant — it holds no per-round state, so it cannot go stale across
// the remounts below. The Demand and the Lose-credit pool were retired on DLR-67.
const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }
```

- [x] **Step 3: Derive `huntDamage` once in `WarCouncilRound.tsx` and drop the claim path**

Reduce the `../../hunt` import to `{ quarryCharacterInfo }` and the `../../warCouncil` import to `{ CardRank, PlayerSide, RoundPhase, currentTurn, legalMoves, quarryIntent, sameCard, scoreHunt, type Card, type HuntDamage, type QuarryIntent }`.

Replace the `runningSpoils` / `band` derivation (lines 68–77) and delete `declared` (line 79), `held` and `claimable` (lines 85–89):

```tsx
  // Both sides derived every render from already-final state, then reused three ways — the
  // status band's readout, the end panel, and `onComplete` — so the number the player reads and
  // the number the mount reports cannot diverge. `spoils` reduces over at most 26 captured cards
  // and `resolveStanding` scans a six-row table: bounded work, no memo.
  const huntDamage: Readonly<Record<PlayerSide, HuntDamage>> = {
    [PlayerSide.Player]: scoreHunt(ui.round, PlayerSide.Player),
    [PlayerSide.Cpu]: scoreHunt(ui.round, PlayerSide.Cpu),
  }
```

Delete `handleClaim` (lines 122–124). In `handleCarryOn`, line 139 becomes:

```tsx
      onComplete({
        finalState: ui.round,
        damage: {
          [PlayerSide.Player]: huntDamage[PlayerSide.Player].damage,
          [PlayerSide.Cpu]: huntDamage[PlayerSide.Cpu].damage,
        },
      })
```

Update the four render sites: `<DeclareGate onDeclare={(path) => dispatch({ kind: RoundUiActionKind.Declare, path })} />`; both `<TrickWell>` calls lose `claimable`, `creditsRemaining` and `onClaim`; `<RoundOverPanel tricksWon={ui.round.tricksWon} huntDamage={huntDamage} onFinish={handleCarryOn} />` (the local `const huntScore` at line 177 goes with it); and `<RoundStatusBand … spoils={huntDamage[PlayerSide.Player].spoils} band={huntDamage[PlayerSide.Player].band} />` with `demand` and `declaration` removed.

- [x] **Step 4: Narrow the component fixture**

In `src/app/warCouncil/__tests__/roundFixture.ts`, replace lines 48–55 with:

```ts
/** A fixed Hunt for component tests. */
export const huntFixture: Hunt = { quarry: { character: QuarryCharacter.Monarch } }
```

In `src/app/warCouncil/__tests__/intentPreview.test.ts:13-15`, reduce the `DeclarationState` literal to `{ path: … }`.

- [x] **Step 5: Rewrite the affected suites in `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`** (the `\d+` regexes in the fenced code above needed widening to `\d+(?:\.\d+)?` — the Standing multiplier can be fractional, `hunt/config.ts`'s Greedy/Humble bands are ×0.5, and the seeded round in this spec produces one; noted in the Implementer report)

Reduce the fixture's declaration literal at lines 16–18 to `{ path: … }`. In the readouts case (lines 263–274) drop the Demand assertion at line 267 and rename the case. Replace the whole `the end-of-Hunt panel (AC4)` describe block (lines 292–345) — both of its cases turn on a Demand verdict — with one case covering AC7:

```tsx
  describe('the end-of-Hunt panel (AC7)', () => {
    function readValue(label: RegExp): number {
      const text = screen.getByLabelText(label).getAttribute('aria-label') ?? ''
      const match = text.match(/\d+/)
      if (!match) throw new Error(`no number found in aria-label: ${text}`)
      return Number(match[0])
    }

    it('shows Spoils × Standing = Damage for both sides, with no Demand and no verdict', () => {
      render(
        <WarCouncilRound
          initialState={dealRound(PlayerSide.Cpu, lcg(2026), huntFixture.quarry.character)}
          hunt={huntFixture}
          onComplete={vi.fn()}
        />,
      )
      declareWin()
      playFullRoundToCompletion()

      for (const name of ['You', 'Opponent']) {
        const spoilsValue = readValue(new RegExp(`^${name} Spoils: \\d+$`))
        const standingValue = readValue(new RegExp(`^${name} Standing multiplier: times \\d+$`))
        expect(readValue(new RegExp(`^${name} Damage: \\d+$`))).toBe(spoilsValue * standingValue)
      }

      expect(screen.queryByLabelText(/Demand/)).toBeNull()
      expect(screen.queryByText(/demand (cleared|missed)/i)).toBeNull()
    })
  })
```

Delete the `shows the credits cell only after declaring Lose` case (lines 388–395) outright. The remaining DLR-63 cases — the gate blocking the hand, the gate clearing on declare, and the hand's display order — keep their assertions and need no edit beyond the fixture.

- [x] **Step 6: Verify the whole app-layer suite and the types**

Run: `npx vitest run src/app; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; `npm run typecheck` exits 0 with no errors. This is the first point at which the whole project type-checks.

---

## Phase 3 — Final verification

No production changes. These tasks prove the acceptance criteria that are stated as greps, confirm the architectural boundary and the must-not-move CSS classes survived, and run the gates.

### Task 13: Confirm the pure-core boundary still holds ✓

- Skill: `none — a verification grep, no code written`

- [x] **Step 1: Grep for React and DOM references inside the engine trees**

Run: `Get-ChildItem src\warCouncil, src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|\bfetch\("`
Expected: zero hits. The `src/warCouncil/**` and `src/hunt/**` boundary is enforced by `eslint.config.js`; this proves the deletions did not smuggle anything across it. Recursive by `Get-ChildItem` for the reason given in Task 5, Step 2.

### Task 14: Confirm every deleted name is gone (AC1, AC2, AC3) ✓

- Skill: `none — verification greps, no code written`

**Every grep in this task recurses via `Get-ChildItem`.** `Select-String -Path src\**\*.ts` reaches only one directory level and would skip all five `__tests__` folders, reporting a false zero for names still on disk — see `.claude/workflow/web-project.md` → hard constraints. Measured on this repo: the `-Path` form finds 4 lines containing `declareHunt`; the recursive form finds 27.

- [x] **Step 1: Grep `src/` for every name AC1 and AC2 delete**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "checkDemand|DemandOutcome|scoreRound|tricksToPoints|FIXED_DEMAND|DEMAND_CURVE|DemandCurve|claimLostTrick|canClaimLostTrick|ClaimRejection|ClaimResult|creditedTrickWorth|LOSE_CREDITS_PER_HUNT|loseCredits|creditsRemaining|creditedCards|creditedThrough|ClaimTrick|CLAIM_REJECTION_MESSAGE|DEMAND_OUTCOME_VERDICT"`
Expected: zero hits.

- [x] **Step 2: Grep `src/` for the Demand as a word, in code and in copy (AC7)**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "\bDemand\b|\bdemand\b"`
Expected: zero hits. AC7 requires no screen to reference a Demand, and the type alias is gone, so this is exact rather than approximate.

- [x] **Step 3: Grep `src/` for the retired credit vocabulary in user-facing copy**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "credit"`
Expected: zero hits. `Select-String` is case-insensitive by default, so this catches `Credits`, `creditedCards` and prose alike.

- [x] **Step 4: Confirm the trick counter's classes survived the Score → Damage rename**

Run: `Select-String -Path src\app\warCouncil\RoundStatusBand.tsx,src\app\warCouncil\warCouncil.css -Pattern "wc-score"`
Expected: **non-zero** — 7 rules in `warCouncil.css` and 8 references in `RoundStatusBand.tsx`. This is the one grep in this phase that must find something: those classes style the trick counter, not the Damage cell, and a blanket rename would have unstyled it silently.

- [x] **Step 5: Confirm no stale `Score` identifier survived**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "\bScore\b|HuntScore"`
Expected: zero hits. `scoreHunt` is deliberately retained and matches neither pattern (`\bScore\b` needs a word boundary before `S`, and the file holds no `HuntScore`).

### Task 15: Static gates and the full suite ✓

- Skill: `none — verification commands, no code written`

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. If `npm test` reports `[vitest-pool-runner]: Timeout waiting for worker to respond` on a cold cache, that is infrastructure and not a failing test — warm it with `npx vitest run --project node; npx vitest run --project dom` and re-run before reporting anything.

- [x] **Step 2: Check formatting on the files this contract changed**

Run: `npx prettier --check src/hunt src/warCouncil src/app src/App.tsx`
Expected: exits 0. The repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no current contract has touched (`.claude/workflow/web-project.md`) — run it once for the record if you wish, but gate on this scoped check and never "fix" the repo-wide failure as a side effect.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 16: Update the PR description ✗ — not written; contract BLOCKED on a live layout regression

- Skill: `none — a written hand-off, no code`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` and `mockup.html` in this folder.
- Summary: the two mechanics deleted, the one addition (AC7's two-sided panel), and the `Score` → `Damage` rename with its gate date.
- Every decision the developer owns: the declare-gate and end-panel copy, whether the two-sided panel reads as a comparison, and that the Lose path now has no between-trick decision until DLR-68.
- The Treasure/Poison fold removal, called out explicitly with its §1 citation — it is the reading most likely to surprise a reviewer who reads only the ticket.
- Verification results from Phase 3, quoting the actual summary lines and grep counts, including the deliberately non-zero `wc-score` count.
- A one-line note for future contributors: `declaredPath` is now the single statement of "undeclared reads as Win" — read it there rather than writing another `?? HuntDeclaration.Win`.

---

## Self-review

**Spec coverage:**

- AC1 (Demand names gone) — Tasks 1, 4, 5, 14.
- AC2 (credit names gone, `DeclarationState` narrowed) — Tasks 1, 2, 3, 5, 14.
- AC3 (`ClaimTrick`, claim control, credits cell, `CLAIM_REJECTION_MESSAGE`) — Tasks 6, 7, 8, 9, 14.
- AC4 (`spoils` single-branch via `cardValueFor`) — Task 3.
- AC5 (declare gate still gates; `declareHunt` keeps both guards, drops the pool) — Tasks 2, 7, 11, 12.
- AC6 (every dead test deleted or rewritten, none skipped) — Tasks 1, 2, 3, 4, 6, 7, 8, 9, 11, 12.
- AC7 (playable; both sides' equation; no Demand or credit on screen) — Tasks 10, 12, 14, 15; the playable-start-to-finish check is QA's in a real browser.
- AC8 (typecheck, lint, format:check, scoped Vitest) — Task 15, plus a scoped run closing every code task.
- `plan.md` In-scope bullet "rename Score → Damage" — Tasks 1, 4, 8, 10, 12, 14.
- `plan.md` In-scope bullet "`declaredPath`" — Task 2, consumed in Tasks 3 and 4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact deletion with its line range, or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`, `node_modules/` or `dist/`. No step invents a tuning value; no step proposes an `eslint-disable`.

**Type / name consistency:** `declaredPath` is introduced in Task 2 and consumed identically in Tasks 3 and 4. `HuntDamage` is introduced in Task 4, exported in Task 5, and consumed in Tasks 10 and 12 — never as `HuntScore`. `damage` is the field name in Task 4's interface, Task 1's `Damage` alias, Task 8's ledger `aria-label`, Task 10's panel, and Task 12's `WarCouncilRoundResult` — never `score`. `declareHunt(state, path)` is two-parameter in Tasks 2, 7 and 12 alike. `spoils(state, side, cardValue?)` is three-parameter in Tasks 3, 4 and 12. `huntDamage` is the prop name in Task 10 and the local name in Task 12.

**Phase boundary cleanliness:**

- **Phase 1** ends with `src/hunt/**` and `src/warCouncil/**` type-checking, both suites green, no dangling export in either barrel, no spec asserting a deleted behaviour, and `claimLostTrick.ts` removed along with every reference to it. `src/app/**` does not compile — stated in the phase framing as the deliberate, unavoidable consequence of an engine signature change, not a half-applied rename.
- **Phase 2** ends with the whole project type-checking (`npm run typecheck` in Task 12, Step 6) and every app-layer spec green, with no orphaned CSS selector and no element left carrying a deleted class.
- **Phase 3** makes no production change at all; each task is a grep or a gate, so it cannot leave the tree in any state but the one Phase 2 finished in.
