# Tasks: Scoring, health and rounding configuration — two mirrored tables as data

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-12

**Goal:** Replace the single transcribed Standing table with the duel direction's two mirrored multiplier tables — whose band boundaries genuinely differ — and add both health totals, the per-declaration card-value accessor, the ×0.5 rounding rule, and the simultaneous-depletion ruling as named data in one module, so every later DLR-65 ticket reads its numbers from one file and a whole-table swap is a one-file edit.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**

- `src/hunt/types.ts` — add the `DuelSide` union and the `Health` alias
- `src/hunt/config.ts` — replace `STANDING_BANDS` with `HUNT_MULTIPLIER_TABLES`; add `standingTableFor`, `cardValueFor`, the rounding pair, the health constants and `SIMULTANEOUS_DEPLETION_WINNER`; make `resolveStanding`'s table parameter required
- `src/hunt/index.ts` — barrel: drop `STANDING_BANDS`, add twelve value exports and one type export
- `src/hunt/__tests__/config.test.ts` — rewrite the Standing blocks; add complementarity, alternative-pair swap, rounding, health, and depletion coverage
- `src/warCouncil/scoring.ts:1-16, 40-48` — name the Win table explicitly where the retired default was implicit
- `src/warCouncil/__tests__/scoring.test.ts:1-4, 37-117` — make the fixtures table-driven; delete the void 108-ceiling assertion
- `src/app/warCouncil/WarCouncilRound.tsx:71` — pass a table, resolved from the live declaration
- `src/app/warCouncil/__tests__/HuntLedger.test.tsx:17-35, 38, 47, 55` — pass a table at five call sites; rework the ×0 fixture onto an injected table
- `.docs/implementation/hunt/**` and `.docs/game_rules/the-hunt.md` — updated by the `implementation-doc-writer` skill in Task 13, never by hand

**Deleted:** (none)

**Developer decides or observes:**

- `DAMAGE_ROUNDING` → shipped as `HalfAwayFromZero` with health at 1,350 / 1,600. §9 records the row Undecided and offers doubling both tables and both health totals instead. Overturning it is this constant plus both tables plus both health totals, all in `config.ts`, plus one fixture.
- The multiplier tables themselves → transcribed verbatim from AC1, but the alternative pair moves both peaks to the extremes and reverses the Knizia property §1 is built on. A swap is a design change wearing tuning clothes.
- Whether two `.tsx` files may be touched → making `resolveStanding`'s table required makes the repo not compile otherwise. Both edits are one argument each.
- The status band's numbers change on screen: "Humble ×1" where it read "Humble ×6", and `HuntLedger` computes `spoils × multiplier` unrounded, so an odd Spoils under a ×0.5 band renders as e.g. `6.5`. T2 retires that readout; T3 owns rounding.
- Nothing new is playable — the exports have no consumer until T3. There is no feel question in this contract.

---

## Phase 1 — The two tables, the accessors, and every call site

Making `resolveStanding`'s table parameter required is a compile-breaking change, so this phase is not internally consistent until the last task in it lands: Task 2 deliberately leaves the tree failing `tsc`, and Tasks 3–7 close it. The phase boundary — not each task inside it — is the safe stopping point, which is why the config shape and all seven of its readers change together here rather than across a boundary. Task 2's own verification step is what proves the compiler found exactly the call sites the audit enumerated and no others.

### Task 1: Add the duel-side vocabulary to `src/hunt/types.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/types.ts` (append after the existing `Score` alias, before `HuntDeclaration`)

- [x] **Step 1: Add the `DuelSide` union and the `Health` alias**

Append to `src/hunt/types.ts`, following the file's existing `as const` object-map form (`erasableSyntaxOnly` is on — no `enum`):

```ts
/**
 * §5/§10 — the two combatants in the duel, each holding a health bar. Deliberately NOT
 * `src/warCouncil/`'s `PlayerSide` ('player' | 'cpu'): that union names the engine's two
 * seats at a trick, this one names the two sides that hold health. `src/hunt/` cannot import
 * from `src/warCouncil/` without a cycle — warCouncil already imports hunt — and §10's
 * vocabulary calls the opponent the Quarry.
 */
export const DuelSide = {
  Player: 'player',
  Quarry: 'quarry',
} as const
export type DuelSide = (typeof DuelSide)[keyof typeof DuelSide]

/** A side's remaining health — the pool damage depletes, replacing the rising Demand (§5). */
export type Health = number
```

- [x] **Step 2: Confirm the tree still compiles — this task breaks nothing**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Replace the single table with the mirrored pair in `src/hunt/config.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts:1, 18-46, 70-79`
- Config: `src/hunt/config.ts` — this file **is** the project's Hunt configuration module; the task adds `HUNT_MULTIPLIER_TABLES` (values transcribed from AC1, no value invented)

- [x] **Step 1: Widen the type import on line 1**

Replace:

```ts
import { QuarryCharacter, type Demand } from './types'
```

with:

```ts
import { HuntDeclaration, QuarryCharacter, type Demand } from './types'
```

- [x] **Step 2: Replace the `STANDING_BANDS` block (lines 18-29) with the mirrored pair**

Delete the `// §9 "Standing multipliers" …` comment and the whole `export const STANDING_BANDS` array, and put this in its place:

```ts
/**
 * The direction section's two mirrored tables — one per declaration, both sides reading
 * whichever is in force. Decided 2026-08-11 (§9 "The multipliers"): designed, not
 * transcribed from the printed table, and capped at ×5 on either path.
 *
 * The two tables' BAND BOUNDARIES genuinely differ — Win groups 7–9 in one row, Lose groups
 * 4–6 — which is why boundaries are per-row data here and never a shared list or an `if`
 * branch (DLR-66 AC1). §1 derives why the Lose table peaks at 4–6: on that path every trick
 * you win is material handed to the opponent.
 *
 * Their defining property is exact complementarity — Lose(k) = Win(13 − k) at all fourteen
 * splits. That is load-bearing, not decorative: it is what makes §1's same-path rule hold,
 * and `__tests__/config.test.ts` asserts it over whatever pair is configured here, so a
 * hand-edit that breaks it fails loudly.
 *
 * VALUES: the developer's to overturn. Swapping the whole pair — different multipliers AND
 * different boundaries — is an edit to this one literal.
 */
export const HUNT_MULTIPLIER_TABLES: Readonly<Record<HuntDeclaration, readonly StandingBand[]>> = {
  [HuntDeclaration.Win]: [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 1 },
    { minTricks: 4, maxTricks: 4, name: StandingBandName.Defeated, multiplier: 2 },
    { minTricks: 5, maxTricks: 5, name: StandingBandName.Defeated, multiplier: 3 },
    { minTricks: 6, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 4 },
    { minTricks: 7, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 0.5 },
  ],
  [HuntDeclaration.Lose]: [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 0.5 },
    { minTricks: 4, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 5 },
    { minTricks: 7, maxTricks: 7, name: StandingBandName.Victorious, multiplier: 4 },
    { minTricks: 8, maxTricks: 8, name: StandingBandName.Victorious, multiplier: 3 },
    { minTricks: 9, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 2 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 1 },
  ],
}

/**
 * AC2's declaration-aware accessor — the only way a consumer outside this module gets a
 * table. Nothing outside `src/hunt/` names `HUNT_MULTIPLIER_TABLES` or any table identifier;
 * callers name a declaration and this resolves it.
 */
export function standingTableFor(declaration: HuntDeclaration): readonly StandingBand[] {
  return HUNT_MULTIPLIER_TABLES[declaration]
}
```

- [x] **Step 3: Make `resolveStanding`'s table parameter required**

Replace the existing doc comment and signature (lines 31-40) with:

```ts
/**
 * Resolves a trick count to its Standing band by scanning `table`.
 *
 * `table` is REQUIRED — it was optional, defaulting to the retired single table. With two
 * tables in play a default would let a Lose-path caller who omits the argument score off the
 * Win table and get a plausible number with nothing failing anywhere; requiring it turns
 * every such omission into a compile error (DLR-66 AC2). Use `standingTableFor` to get one.
 *
 * Still throws a `RangeError` outside 0–13: inside that range there is exactly one match by
 * construction in both tables, so an out-of-range call is a caller bug, not a data gap.
 */
export function resolveStanding(tricks: number, table: readonly StandingBand[]): StandingBand {
```

Leave the function body unchanged.

- [x] **Step 4: Add `cardValueFor` immediately after `invertedCardValue`**

```ts
/**
 * §1's additive term, per declaration: a card is worth its printed rank on Win and `12 − r`
 * on Lose (DLR-66 AC6). Both functions already existed and are unchanged; this is the
 * accessor that pairs with `standingTableFor`, so a consumer names a declaration once and
 * gets both terms of §1's equation.
 *
 * NO modifier of any kind is applied. The Treasure `+1` and Poison `−1` are Decided-removed
 * (§1, §9 2026-08-11) — at ×5 a ±1 card modifier moves a Hunt by 5 out of 540.
 */
export function cardValueFor(declaration: HuntDeclaration): (rank: number) => number {
  return declaration === HuntDeclaration.Lose ? invertedCardValue : cardBaseValue
}
```

- [x] **Step 5: Correct `LOSE_CREDITS_PER_HUNT`'s derivation comment**

Its current comment derives the placeholder from "`STANDING_BANDS`' Humble x6" — an export that no longer exists and a figure §1 declares void. The constant's **value is untouched** (T2 deletes the whole mechanism); only the comment changes. Replace the `// VALUE: a DEVELOPER DECISION …` paragraph with:

```ts
// VALUE: a DEVELOPER DECISION (DLR-63 plan.md -> Risks), and the whole mechanism is retired by
// DLR-65 T2 — §1 says the Lose path's pile swap "replaces it outright". The arithmetic that
// produced 3 was computed against FIXED_DEMAND (220) and the retired single table's Humble ×6;
// §1 declares those figures void along with every figure keyed to the old ceiling, so no
// derivation is restated here. Typed `number`, never `number | null`, so no consumer can
// coerce a null to 0 and silently hand the player an empty pool.
```

- [x] **Step 6: Confirm the compiler found exactly the audited call sites and no others**

Run: `npm run typecheck`
Expected: **fails**, and this is the intended state at this point in the phase — the tree is deliberately inconsistent until Task 7. Every reported error must be one of:

- `TS2305: Module '"./config"' has no exported member 'STANDING_BANDS'` (or `'../hunt'` / `'../../hunt'`) in `src/hunt/index.ts`, `src/hunt/__tests__/config.test.ts`, `src/warCouncil/scoring.ts`, `src/warCouncil/__tests__/scoring.test.ts`
- `TS2554: Expected 2 arguments, but got 1.` at `src/warCouncil/scoring.ts:15`, `src/app/warCouncil/WarCouncilRound.tsx:71`, `src/app/warCouncil/__tests__/HuntLedger.test.tsx:19, 29, 38, 47, 55`, and inside `src/hunt/__tests__/config.test.ts`

An error in any file **not** on that list means the audit missed a consumer — stop and re-grep before continuing.

Confirmed: actual output reported `TS2724` (not `TS2305`) for the missing-member errors — TypeScript's "did you mean" variant of the same "no exported member" diagnostic — plus cascading `TS7006` implicit-`any` errors on `.map((band) => …)` callbacks in `config.test.ts` and `scoring.test.ts`, both consequences of `STANDING_BANDS`'s type becoming unresolvable. Every error landed inside the seven audited files and no other file — no missed consumer.

### Task 3: Update the barrel in `src/hunt/index.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/index.ts:1-20`

- [x] **Step 1: Drop `STANDING_BANDS` and add the new exports**

In the `export type { … } from './types'` line, add `Health`. In the `export { … } from './types'` line, add `DuelSide`. In the `export { … } from './config'` block, remove `STANDING_BANDS` and add `HUNT_MULTIPLIER_TABLES`, `standingTableFor`, and `cardValueFor`.

Per this file's documented rule, `DuelSide` — both an `as const` object and its own derived type — goes **only** on the value line, never also on `export type {…}`: listing it in both raises `TS2300: Duplicate identifier` under `verbatimModuleSyntax`. `Health` is a bare type alias, so it goes only on the type line.

```ts
export type { Hunt, Quarry, Spoils, Standing, Demand, Score, Health } from './types'
export { QuarryCharacter, HuntDeclaration, DuelSide } from './types'

export type { StandingBand, DemandCurve } from './config'
export {
  StandingBandName,
  HUNT_MULTIPLIER_TABLES,
  standingTableFor,
  resolveStanding,
  cardBaseValue,
  cardValueFor,
  DEMAND_CURVE,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  FIXED_DEMAND,
  SLICE_QUARRY_CHARACTER,
  RANK_INVERSION_PIVOT,
  invertedCardValue,
  LOSE_CREDITS_PER_HUNT,
} from './config'
```

- [x] **Step 2: Confirm the barrel itself no longer errors**

Run: `npm run typecheck`
Expected: still fails (Tasks 4–7 outstanding), but **no error is reported in `src/hunt/index.ts`**. The remaining errors are the `TS2554` / `TS2305` set from Task 2 Step 6, minus the `index.ts` line.

### Task 4: Rewrite the Standing coverage in `src/hunt/__tests__/config.test.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/__tests__/config.test.ts:1-70`
- Test: `src/hunt/__tests__/config.test.ts`

This is the one place in `src/` where the AC1 transcription is written down as literals. Everywhere else derives from it — a test that derives its expected multiplier from the code under test asserts nothing, so the fixture lives once, here.

- [x] **Step 1: Replace the import block and the whole `describe('resolveStanding')` block**

Replace lines 1-17's import list's `STANDING_BANDS` with `HUNT_MULTIPLIER_TABLES`, `standingTableFor`, and `cardValueFor`, and add `HuntDeclaration` from `'../types'`. Then replace the entire `describe('resolveStanding', …)` block (lines 20-64) with:

```ts
const win = standingTableFor(HuntDeclaration.Win)
const lose = standingTableFor(HuntDeclaration.Lose)

describe('HUNT_MULTIPLIER_TABLES — the shipped default pair (AC1)', () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [5, 3],
    [6, 4],
    [7, 5],
    [8, 5],
    [9, 5],
    [10, 0.5],
    [13, 0.5],
  ])('Win: %i tricks -> ×%s', (tricks, multiplier) => {
    expect(resolveStanding(tricks, win).multiplier).toBe(multiplier)
  })

  it.each([
    [0, 0.5],
    [3, 0.5],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 4],
    [8, 3],
    [9, 2],
    [10, 1],
    [13, 1],
  ])('Lose: %i tricks -> ×%s', (tricks, multiplier) => {
    expect(resolveStanding(tricks, lose).multiplier).toBe(multiplier)
  })

  it('carries genuinely different band boundaries per table — Win groups 7-9, Lose groups 4-6', () => {
    const winBand = resolveStanding(8, win)
    const loseBand = resolveStanding(5, lose)
    expect([winBand.minTricks, winBand.maxTricks]).toEqual([7, 9])
    expect([loseBand.minTricks, loseBand.maxTricks]).toEqual([4, 6])
    // The same split lands in a one-row band on the other table, which is what a shared
    // boundary set could not express.
    expect(resolveStanding(8, lose).minTricks).toBe(resolveStanding(8, lose).maxTricks)
  })

  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    '%s resolves every trick count 0-13 to exactly one band, with no gap and no overlap',
    (declaration) => {
      const table = standingTableFor(declaration)
      for (let tricks = 0; tricks <= 13; tricks++) {
        const matches = table.filter((b) => tricks >= b.minTricks && tricks <= b.maxTricks)
        expect(matches).toHaveLength(1)
      }
    },
  )

  it('throws for a trick count outside the configured 0-13 range, on either table', () => {
    expect(() => resolveStanding(14, win)).toThrow(RangeError)
    expect(() => resolveStanding(-1, win)).toThrow(RangeError)
    expect(() => resolveStanding(14, lose)).toThrow(RangeError)
    expect(() => resolveStanding(-1, lose)).toThrow(RangeError)
  })

  it('exports one table per declaration and no other', () => {
    expect(Object.keys(HUNT_MULTIPLIER_TABLES).sort()).toEqual(
      Object.values(HuntDeclaration).sort(),
    )
  })
})
```

- [x] **Step 2: Add the complementarity invariant (AC3)**

This is the guard the epic's Deliverable 3 asks for: it holds over **whatever pair is configured**, so a future hand-edit that breaks the same-path rule fails here rather than quietly deleting it.

```ts
describe('complementarity — Lose(k) = Win(13 − k) at all fourteen splits (AC3)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])(
    'k=%i: the Lose multiplier equals the Win multiplier at 13 − k',
    (k) => {
      expect(resolveStanding(k, lose).multiplier).toBe(resolveStanding(13 - k, win).multiplier)
    },
  )
})
```

- [x] **Step 3: Add the alternative-pair swap proof (AC4)**

The epic's alternative pair, transcribed. This is the proof a whole-table swap — different multipliers **and** the Lose side's different boundaries — is a one-file edit.

```ts
describe('a whole-table swap is data, not code (AC4)', () => {
  const altWin: readonly StandingBand[] = [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 1 },
    { minTricks: 4, maxTricks: 4, name: StandingBandName.Defeated, multiplier: 2 },
    { minTricks: 5, maxTricks: 5, name: StandingBandName.Defeated, multiplier: 3 },
    { minTricks: 6, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 4 },
    { minTricks: 7, maxTricks: 7, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 8, maxTricks: 8, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 9, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 6 },
  ]
  const altLose: readonly StandingBand[] = [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 6 },
    { minTricks: 4, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 5 },
    { minTricks: 7, maxTricks: 7, name: StandingBandName.Victorious, multiplier: 4 },
    { minTricks: 8, maxTricks: 8, name: StandingBandName.Victorious, multiplier: 3 },
    { minTricks: 9, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 2 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 1 },
  ]

  it('resolves the alternative multipliers, including at the Lose table’s own boundaries', () => {
    expect(resolveStanding(13, altWin).multiplier).toBe(6)
    expect(resolveStanding(0, altLose).multiplier).toBe(6)
    // 5 and 6 sit in altLose's grouped 4-6 row and in two separate altWin rows.
    expect(resolveStanding(5, altLose).multiplier).toBe(5)
    expect(resolveStanding(6, altLose).multiplier).toBe(5)
    expect(resolveStanding(5, altWin).multiplier).toBe(3)
    expect(resolveStanding(6, altWin).multiplier).toBe(4)
  })

  it('is still an exact complement, so the same-path rule survives the swap', () => {
    for (let k = 0; k <= 13; k++) {
      expect(resolveStanding(k, altLose).multiplier).toBe(resolveStanding(13 - k, altWin).multiplier)
    }
  })

  it('leaves the real exports untouched', () => {
    expect(resolveStanding(13, win).multiplier).toBe(0.5)
    expect(resolveStanding(0, lose).multiplier).toBe(0.5)
  })
})
```

- [x] **Step 4: Add `cardValueFor` coverage (AC6)**

```ts
describe('cardValueFor — §1’s additive term per declaration (AC6)', () => {
  it('returns the printed rank on Win and 12 − r on Lose, with no modifier of any kind', () => {
    const onWin = cardValueFor(HuntDeclaration.Win)
    const onLose = cardValueFor(HuntDeclaration.Lose)
    for (const rank of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(onWin(rank)).toBe(rank)
      expect(onLose(rank)).toBe(RANK_INVERSION_PIVOT - rank)
    }
    // Treasure (7) and Poison (8) are Decided-removed — neither carries a ±1 here.
    expect(onWin(7)).toBe(7)
    expect(onWin(8)).toBe(8)
  })
})
```

- [x] **Step 5: Run the rewritten spec**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits 0, Vitest reports 0 failed and every test in the file passing.
Confirmed: `Test Files  1 passed (1)`, `Tests  68 passed (68)`.

### Task 5: Adapt `src/warCouncil/scoring.ts` and its spec to the new signature ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts:1-16, 40-48`
- Modify: `src/warCouncil/__tests__/scoring.test.ts:1-4, 37-117`
- Test: `src/warCouncil/__tests__/scoring.test.ts`

Signature adaptation only — no behaviour redesign. Both `tricksToPoints` and `scoreHunt` are on DLR-65 T2's retirement list, so the Win default is named explicitly at the point of use rather than reinvested in.

- [x] **Step 1: Name the Win table where the retired default was implicit**

In the import block, replace `STANDING_BANDS` with `standingTableFor` and add `HuntDeclaration`. Then:

```ts
export function tricksToPoints(tricks: number): number {
  return resolveStanding(tricks, standingTableFor(HuntDeclaration.Win)).multiplier
}
```

and in `scoreHunt`'s parameter list replace `standingTable: readonly StandingBand[] = STANDING_BANDS` with:

```ts
  standingTable: readonly StandingBand[] = standingTableFor(HuntDeclaration.Win),
```

Update `scoreHunt`'s doc comment sentence "`cardValue` and `standingTable` default to the live config (T2/T3)" to say they default to `cardBaseValue` and the **Win** table, since there is no single live table any more.

- [x] **Step 2: Make the `tricksToPoints` fixture table-driven and drop the retired transcription**

Replace the import of `STANDING_BANDS` on line 4 with `standingTableFor` and `HuntDeclaration`, and replace the whole `describe('tricksToPoints', …)` block (lines 37-56) with a version that carries no multiplier literals — the transcription lives in `src/hunt/__tests__/config.test.ts` and is not restated here:

```ts
const winTable = standingTableFor(HuntDeclaration.Win)
const loseTable = standingTableFor(HuntDeclaration.Lose)

describe('tricksToPoints', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])(
    'tricks=%i reads the Win table',
    (tricks) => {
      expect(tricksToPoints(tricks)).toBe(resolveStanding(tricks, winTable).multiplier)
    },
  )

  it('reads the Win table specifically, not whichever table is listed first', () => {
    // 4 tricks is one of the splits where the two tables genuinely disagree, so this
    // fails loudly if the default is ever re-pointed at the Lose table.
    expect(tricksToPoints(4)).not.toBe(resolveStanding(4, loseTable).multiplier)
  })
})
```

Add `resolveStanding` to the import from `'../../hunt'`.

- [x] **Step 3: Make the `scoreHunt` fixture table-driven and delete the void ceiling assertion**

Replace the `describe('scoreHunt — §3 flat-value table (AC4)', …)` block (lines 69-100) with:

```ts
describe('scoreHunt — the product of the two terms, over the Win table', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])(
    'k=%i tricks -> spoils × the band multiplier',
    (k) => {
      const state = huntState({ player: fillerCards(2 * k), cpu: [] }, { player: k, cpu: 13 - k })
      const band = resolveStanding(k, winTable)
      const result = scoreHunt(state, PlayerSide.Player, () => 1)
      expect(result.spoils).toBe(2 * k)
      expect(result.tricks).toBe(k)
      expect(result.band.name).toBe(band.name)
      expect(result.score).toBe(2 * k * band.multiplier)
    },
  )
})
```

The `it('k=9 peaks at 108, the §3 ceiling')` case is **deleted, not adapted**: §1 states that every figure keyed to the old 108-point ceiling is void, so there is no ceiling here left to assert.

- [x] **Step 4: Rework the injected-table proof onto the new pair**

Replace the `describe('scoreHunt — Humble break-even at a raised multiplier (AC5)', …)` block (lines 102-117). §6 retires the Humble-dominance argument the ×18 figure came from, but the proof that the table is genuinely live is still worth keeping — restated with no reference to the retired arithmetic:

```ts
describe('scoreHunt — the standing table is genuinely injectable', () => {
  it('scores off an injected table and leaves the real exports unaffected', () => {
    const raised: readonly StandingBand[] = winTable.map((band) =>
      band.name === StandingBandName.Humble ? { ...band, multiplier: 18 } : band,
    )
    const state = huntState({ player: fillerCards(6), cpu: [] }, { player: 3, cpu: 10 })

    expect(scoreHunt(state, PlayerSide.Player, () => 1, raised).score).toBe(6 * 18)

    // The same state, un-injected: the only thing that changed between the two calls is
    // the table passed in.
    const baseline = scoreHunt(state, PlayerSide.Player, () => 1)
    expect(baseline.score).toBe(6 * resolveStanding(3, winTable).multiplier)
    expect(baseline.score).not.toBe(6 * 18)
  })
})
```

The `Greedy zeroes a round` block (lines 119-133) asserts `standing` is `0` at k=13, which the Win table's ×0.5 no longer satisfies. Change its two assertions to read the live band — `expect(result.standing).toBe(resolveStanding(13, winTable).multiplier)` and `expect(result.score).toBe(26 * CardRank.Monarch * result.standing)` — and rename the `describe` to `'scoreHunt — the Greedy band still caps a round with maximal Spoils'`. The `checkDemand` block is untouched; T2 retires it.

- [x] **Step 5: Run the adapted spec**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: exits 0, Vitest reports 0 failed.
Confirmed: `Test Files  1 passed (1)`, `Tests  35 passed (35)`.

### Task 6: Pass a table at the round mount's call site ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx:2, 68-71`

One argument. No layout, copy, control, or component shape changes — the component gains no rule and decides nothing.

- [x] **Step 1: Resolve the table from the live declaration**

Add `standingTableFor` and `HuntDeclaration` to the import from `'../../hunt'` on line 2, then replace line 71:

```tsx
  // The declaration governs which table both sides read (§1). Before the player has
  // declared, nothing has scored yet — the Win table is the readout's display default here,
  // named at the call site rather than hidden in a parameter default.
  const band = resolveStanding(
    ui.round.tricksWon[PlayerSide.Player],
    standingTableFor(ui.round.declaration?.path ?? HuntDeclaration.Win),
  )
```

Update the comment on line 69 — "`resolveStanding` scans a six-row table" is still accurate for both tables, so only extend it if the wording drifts; do not add a memo.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: still fails, with errors only in `src/app/warCouncil/__tests__/HuntLedger.test.tsx` (Task 7). No error in `WarCouncilRound.tsx`.

### Task 7: Pass a table at the ledger spec's five call sites ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/__tests__/HuntLedger.test.tsx:4, 17-35, 38, 47, 55`
- Test: `src/app/warCouncil/__tests__/HuntLedger.test.tsx`

- [x] **Step 1: Import the accessor and pass the declaration-appropriate table**

Add `standingTableFor` to the import on line 4. Then at each `resolveStanding` call, pass the table the surrounding fixture's declaration implies — Win at lines 19, 29 and 55 (`declaration={null}`), Lose at lines 38 and 47 (`declaration={losing}` / a Lose spread), e.g.:

```tsx
const winTable = standingTableFor(HuntDeclaration.Win)
const loseTable = standingTableFor(HuntDeclaration.Lose)
// …
const band = resolveStanding(7, winTable)
// …
render(<HuntLedger demand={100} spoils={12} band={resolveStanding(2, loseTable)} declaration={losing} />)
```

- [x] **Step 2: Update the first fixture's expected multiplier and product**

Line 19's trailing `// Victorious ×6` comment is stale and must go. Under the Win table 7 tricks is Victorious ×5, so with `spoils={48}` the product is **240**, not 288:

```tsx
    const band = resolveStanding(7, winTable) // Victorious ×5 on the Win table
    render(<HuntLedger demand={220} spoils={48} band={band} declaration={null} />)

    expect(screen.getByLabelText('The Demand: 220')).toBeDefined()
    expect(screen.getByLabelText('Running Spoils: 48')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Victorious, multiplier 5/)).toBeDefined()
    expect(screen.getByLabelText('Score so far: 240')).toBeDefined()
```

These two literals are deliberate: this is a rendering fixture, and it should fail loudly if the shipped table is retuned.

- [x] **Step 3: Rework the ×0 regression guard onto an injected band**

The existing test asserts the ledger renders `0` rather than blanking when the multiplier is falsy, and reaches that state via `resolveStanding(10)`. **No shipped band has multiplier `0` any more** — the lowest in either table is ×0.5 — so the guard must construct the band rather than look it up, or it stops testing anything:

```tsx
  it('reads the score as 0, not blank, when the band multiplier is 0', () => {
    // No shipped band is ×0 since DLR-66, so the falsy-multiplier guard builds its own band.
    // The regression it protects against — a `0` rendering as an empty cell — is unchanged.
    const zeroBand = { ...resolveStanding(10, winTable), multiplier: 0 }
    render(<HuntLedger demand={220} spoils={84} band={zeroBand} declaration={null} />)

    expect(screen.getByLabelText('Score so far: 0')).toBeDefined()
    expect(screen.getByLabelText(/Standing band: Greedy, multiplier 0/)).toBeDefined()
  })
```

- [x] **Step 4: Run the ledger spec**

Run: `npx vitest run src/app/warCouncil/__tests__/HuntLedger.test.tsx`
Expected: exits 0, Vitest reports 0 failed. This is the `dom` project — on a cold Vite transform cache its worker start can time out; that is infrastructure, not a failure. Re-run once before treating a timeout as real.
Confirmed after two cold-cache worker-start timeouts (not test failures — no test ran either time) and warming the `node` then `dom` projects: `Test Files  1 passed (1)`, `Tests  5 passed (5)`.

- [x] **Step 5: Close the phase — the tree is consistent again**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.
Confirmed: exit 0, no errors.

---

## Phase 2 — The rounding rule, the health totals, and the depletion ruling

Purely additive: every task here adds exports nothing yet consumes, so the tree type-checks throughout and each task is independently a safe stopping point. `roundDamage` is deliberately left inert — DLR-65 T3 owns the damage arithmetic that will call it — which is what keeps this contract's diff reviewable.

### Task 8: Add the ×0.5 rounding rule to `src/hunt/config.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts` (append after `cardValueFor`)
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — adds `DAMAGE_ROUNDING`, whose value is a stated default the developer may overturn

- [x] **Step 1: Write the failing test for both rounding settings (AC7)**

Append to `src/hunt/__tests__/config.test.ts`. The odd card sum under a ×0.5 band is derived from the live table, not asserted as a bare literal:

```ts
describe('roundDamage — the ×0.5 bands (AC7)', () => {
  // 13 is an odd card sum; at 11 tricks the Win table's Greedy band is ×0.5, so the raw
  // product is 6.5 — exactly the case the rounding rule exists to settle.
  const raw = 13 * resolveStanding(11, win).multiplier

  it('is a half-point product, so the rule is genuinely load-bearing', () => {
    expect(raw).toBe(6.5)
    expect(Number.isInteger(raw)).toBe(false)
  })

  it('rounds half away from zero by default', () => {
    expect(DAMAGE_ROUNDING).toBe(DamageRounding.HalfAwayFromZero)
    expect(roundDamage(raw)).toBe(7)
    expect(roundDamage(raw, DamageRounding.HalfAwayFromZero)).toBe(7)
  })

  it('leaves the product untouched under the doubled-table setting', () => {
    expect(roundDamage(raw, DamageRounding.None)).toBe(6.5)
  })

  it('is half away from zero, not half toward positive infinity', () => {
    // Math.round(-0.5) is -0 in JS, so a bare Math.round would misname the rule.
    expect(roundDamage(-0.5, DamageRounding.HalfAwayFromZero)).toBe(-1)
    expect(roundDamage(0.5, DamageRounding.HalfAwayFromZero)).toBe(1)
  })

  it('throws rather than rounding a non-finite value into a health bar', () => {
    expect(() => roundDamage(Number.NaN)).toThrow(RangeError)
    expect(() => roundDamage(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })

  it('has exactly the two named settings', () => {
    expect(Object.values(DamageRounding)).toHaveLength(2)
  })
})
```

Add `DamageRounding`, `DAMAGE_ROUNDING`, and `roundDamage` to the file's import from `'../config'`.

- [x] **Step 2: Run the new spec and watch it fail for the right reason**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: fails to collect with a transform error naming `DamageRounding` / `roundDamage` as missing exports — the symbols do not exist yet. A collection error here is the expected red state, not a defect.
Confirmed: Vitest's esbuild transform does not hard-fail collection on a missing named export in this project's setup — instead the imported names resolve to `undefined` at runtime, and all 10 new assertions failed with `TypeError`/`AssertionError` tracing directly to `DamageRounding`, `DAMAGE_ROUNDING`, and `roundDamage` being `undefined`. Red for the right reason; the pre-existing 69 tests still passed.

- [x] **Step 3: Implement the rule**

```ts
/**
 * The two settings §9's "Rounding of the ×0.5 bands" row leaves open. `None` is the doubling
 * dissolution that row offers: double every multiplier in both tables and both health totals
 * and every product is an integer, so there is nothing left to round — the same table in a
 * different presentation, not a different table.
 */
export const DamageRounding = {
  HalfAwayFromZero: 'halfAwayFromZero',
  None: 'none',
} as const
export type DamageRounding = (typeof DamageRounding)[keyof typeof DamageRounding]

/**
 * §9 records this row Undecided; DLR-65 says it cannot be deferred past phase 2, so DLR-66
 * ships a stated default rather than a null. THE DEVELOPER'S TO OVERTURN — switching to the
 * doubled presentation is this constant plus both tables plus both health totals, every one
 * of them in this file.
 */
export const DAMAGE_ROUNDING: DamageRounding = DamageRounding.HalfAwayFromZero

/**
 * Applies the rule to one side's raw `card value × Standing`. Nothing calls this yet — DLR-65
 * T3 owns the damage arithmetic. The rule is a defaulted parameter rather than something the
 * function closes over, so a test proves both settings without mutating module state, the
 * same injectable pattern `resolveStanding`'s table already uses.
 *
 * `Math.sign(raw) * Math.round(Math.abs(raw))`, never bare `Math.round`: JS breaks ties toward
 * +∞, so `Math.round(-0.5)` is `-0` and the rule would not be the one it is named after.
 * Throws on a non-finite input — a NaN rounded into a health bar renders nothing and logs
 * nothing, which is the failure mode that never gets reported.
 */
export function roundDamage(raw: number, rule: DamageRounding = DAMAGE_ROUNDING): number {
  if (!Number.isFinite(raw)) {
    throw new RangeError(`Cannot round a non-finite damage value: ${raw}`)
  }
  return rule === DamageRounding.None ? raw : Math.sign(raw) * Math.round(Math.abs(raw))
}
```

- [x] **Step 4: Export through the barrel and re-run**

Add `DamageRounding`, `DAMAGE_ROUNDING`, and `roundDamage` to the value export list in `src/hunt/index.ts` — `DamageRounding` on the value line only, never also on `export type {…}`.

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0.
Confirmed (after Task 9 also landed, in the same phase-end batch): `Test Files 1 passed (1)`, `Tests 79 passed (79)`; `tsc -b` exits 0.

### Task 9: Add the health totals, the restore, and the depletion ruling ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts` (append after `roundDamage`); `src/hunt/index.ts`
- Test: `src/hunt/__tests__/config.test.ts`
- Config: `src/hunt/config.ts` — `PLAYER_START_HEALTH`, `QUARRY_ENCOUNTER_HEALTH`, `ENCOUNTER_PLAYER_RESTORE`, `SIMULTANEOUS_DEPLETION_WINNER`; every value transcribed from AC5/AC8 or §9, none invented

- [x] **Step 1: Write the failing test (AC5, AC8)**

```ts
describe('health, restore, and the depletion ruling (AC5, AC8)', () => {
  it('starts the player and the first Quarry on equal health', () => {
    expect(PLAYER_START_HEALTH).toBe(1350)
    // §9 "Player health P": the equality is what puts the win/lose boundary exactly on the
    // 6/7 line the declaration commits to, and it survives any later rescaling.
    expect(quarryHealthForEncounter(0)).toBe(PLAYER_START_HEALTH)
  })

  it('carries one health total per encounter, the second harder than the first', () => {
    expect(QUARRY_ENCOUNTER_HEALTH).toEqual([1350, 1600])
    expect(quarryHealthForEncounter(1)).toBe(1600)
  })

  it('throws rather than returning undefined for an encounter it has no health for', () => {
    expect(() => quarryHealthForEncounter(QUARRY_ENCOUNTER_HEALTH.length)).toThrow(RangeError)
    expect(() => quarryHealthForEncounter(-1)).toThrow(RangeError)
  })

  it('restores no health entering the next encounter, as a tunable rather than a hardcoded 0', () => {
    expect(ENCOUNTER_PLAYER_RESTORE).toBe(0)
    expect(Number.isFinite(ENCOUNTER_PLAYER_RESTORE)).toBe(true)
  })

  it('names the simultaneous-depletion winner as data — §5/§9: the player loses', () => {
    expect(SIMULTANEOUS_DEPLETION_WINNER).toBe(DuelSide.Quarry)
  })
})
```

Add the five new names plus `DuelSide` to the spec's imports.

- [x] **Step 2: Run it and watch it fail for the right reason**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: fails to collect, naming the missing exports. Red for the right reason before implementing.
Confirmed: run together with Task 8's new block, all 10 new tests failed (5 rounding + 5 health/depletion) with `TypeError`/`AssertionError` tracing to the not-yet-exported `PLAYER_START_HEALTH`, `QUARRY_ENCOUNTER_HEALTH`, `quarryHealthForEncounter`, `ENCOUNTER_PLAYER_RESTORE`, and `SIMULTANEOUS_DEPLETION_WINNER` being `undefined`.

- [x] **Step 3: Implement the constants and the accessor**

Add `type Health` to the import from `'./types'` on line 1, then append:

```ts
// §9 "Player health P" — DECIDED 2026-08-11, the developer's value. Equal to the Quarry's
// first-encounter health by design: `P = H` is what puts the win/lose boundary exactly on the
// 6/7 line the declaration commits to (7 tricks a Hunt wins on Hunt 4, 6 tricks loses on
// Hunt 4), and §5 states that property survives any later rescaling of health.
// UNIT: health points, depleted by damage.
export const PLAYER_START_HEALTH: Health = 1350

// Per-encounter Quarry health, in encounter order. NEW TO DLR-65 — §9 decides only the 1,350
// of the first bar (Quarry health H, 2026-08-11); the 1,600 second encounter is the epic's,
// and which character carries it is an assumption (the Monarch, the only one with round-long
// enforcement on disk — src/warCouncil/quarryRuleBreak.ts).
// UNIT: health points per encounter. A `readonly Health[]` rather than a fixed pair so a third
// encounter is one more entry, not a type change.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [1350, 1600]

/**
 * Throws a `RangeError` rather than returning `undefined`: an out-of-range index would
 * otherwise become `NaN` on the first subtraction and vanish from a health bar with no error
 * logged anywhere. Same posture as `resolveStanding` — a bad index is a caller bug.
 */
export function quarryHealthForEncounter(index: number): Health {
  const health = QUARRY_ENCOUNTER_HEALTH[index]
  if (health === undefined) {
    throw new RangeError(
      `No Quarry health configured for encounter ${index} (${QUARRY_ENCOUNTER_HEALTH.length} configured)`,
    )
  }
  return health
}

// Health restored to the player entering the next encounter. NEW TO DLR-65 — the epic states
// no restore, and the breakdown names this the single thing most likely to change, so it
// exists as a tunable precisely so testing a restore is a one-line edit.
// UNIT: health points, added once between encounters. VALUE: the developer's.
export const ENCOUNTER_PLAYER_RESTORE: Health = 0

// §5 / §9 "Simultaneous depletion" — DECIDED 2026-08-11: both bars empty on the same Hunt and
// the player loses. Data rather than a hardcoded branch, so DLR-65 T5 reads an attributed
// ruling instead of an unexplained `if`.
export const SIMULTANEOUS_DEPLETION_WINNER: DuelSide = DuelSide.Quarry
```

Add `DuelSide` to the import from `'./types'` on line 1 as a value (it is used as one here).

- [x] **Step 4: Export through the barrel and re-run**

Add `PLAYER_START_HEALTH`, `QUARRY_ENCOUNTER_HEALTH`, `quarryHealthForEncounter`, `ENCOUNTER_PLAYER_RESTORE`, and `SIMULTANEOUS_DEPLETION_WINNER` to the value export list in `src/hunt/index.ts`.

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; typecheck exits 0.
Confirmed: `Test Files 1 passed (1)`, `Tests 79 passed (79)`; `tsc -b` exits 0. Also ran `npm run lint` (not an explicitly listed step but required by CLAUDE.md/web-project.md whenever `.ts` files are touched): exits 0, no output.

---

## Phase 3 — Final verification

No production changes. Every task here is a sanity check that the cumulative work is clean, followed by the documentation update and the PR write-up.

### Task 10: Confirm AC9 — no band boundary or multiplier survives outside the module ✓

- Skill: `none — verification greps, no code written`

**Files:**

- Modify: (none)

- [x] **Step 1: Confirm the retired single-table export is gone everywhere**

Run: `Select-String -Path (Get-ChildItem -Recurse -Path src -Include *.ts,*.tsx).FullName -Pattern "STANDING_BANDS"`
Expected: zero hits.
Confirmed: zero hits.

- [x] **Step 2: Confirm no band boundary is written outside `src/hunt/`**

Run: `Select-String -Path (Get-ChildItem -Recurse -Path src\app,src\warCouncil -Include *.ts,*.tsx).FullName -Pattern "minTricks|maxTricks"`
Expected: zero hits. `minTricks`/`maxTricks` are the fields any hand-written band table would have to use, so a hit here is a boundary that escaped the module.
Confirmed: zero hits.

- [x] **Step 3: Confirm the tables are named in exactly one place**

Run: `Select-String -Path (Get-ChildItem -Recurse -Path src -Include *.ts,*.tsx).FullName -Pattern "HUNT_MULTIPLIER_TABLES"`
Expected: hits only in `src\hunt\config.ts` and `src\hunt\index.ts` and `src\hunt\__tests__\config.test.ts`. No hit under `src\app\` or `src\warCouncil\` — AC2's "no consumer outside this module names a table by identifier".
Confirmed: hits only in those three files (`config.ts`, `index.ts`, `config.test.ts`), no hit under `src\app\` or `src\warCouncil\`.

### Task 11: Confirm the pure-core boundary and the file-size budget ✓

- Skill: `none — verification greps and measurement, no code written`

**Files:**

- Modify: (none)

- [x] **Step 1: Confirm `src/hunt/` is still React-free and DOM-free**

Run: `Select-String -Path (Get-ChildItem -Recurse -Path src\hunt -Include *.ts,*.tsx).FullName -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("`
Expected: zero hits. `eslint.config.js` enforces this too; the grep is the explicit second check DLR-48 established for this tree.
Confirmed: zero hits.

- [x] **Step 2: Measure every file this contract grew**

Run: `foreach ($f in "src\hunt\config.ts","src\hunt\types.ts","src\hunt\index.ts","src\hunt\__tests__\config.test.ts","src\warCouncil\scoring.ts","src\warCouncil\__tests__\scoring.test.ts","src\app\warCouncil\__tests__\HuntLedger.test.tsx") { "$((Get-Content $f).Count)  $f" }`
Expected: every count under 400. `config.ts` was 127 and is projected near 240. **Use `(Get-Content <file>).Count`, not `Measure-Object -Line`** — the latter drops blank lines and hid a real 423-line breach on DLR-63. If `config.ts` does exceed 400, split the table pair and `standingTableFor` into `src/hunt/standingTables.ts` and re-export through the barrel.
Confirmed: `config.ts` 253, `types.ts` 60, `index.ts` 33, `config.test.ts` 301, `scoring.ts` 71, `scoring.test.ts` 138, `HuntLedger.test.tsx` 66 — all under 400, no split needed.

### Task 12: Static gates, full suite, and production build ✓

- Skill: `none — verification only, no code written`

**Files:**

- Modify: (none)

- [x] **Step 1: Typecheck, lint, and formatting**

Run: `npm run typecheck; npm run lint; npx prettier --check src\hunt\config.ts src\hunt\types.ts src\hunt\index.ts src\hunt\__tests__\config.test.ts src\warCouncil\scoring.ts src\warCouncil\__tests__\scoring.test.ts src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncil\__tests__\HuntLedger.test.tsx`
Expected: all three exit 0. Prettier is scoped to this contract's files deliberately — the repo-wide `npm run format:check` currently fails on pre-existing `.docs/**` files no current contract has touched, so run it and report the result but gate on the scoped check.
Confirmed: `typecheck` exit 0, `lint` exit 0. Scoped `prettier --check` **initially failed** on `config.test.ts`, `scoring.test.ts`, and `HuntLedger.test.tsx` — fixed via `npx prettier --write` on those three files (the one self-fix permitted for this contract's own files), then re-checked: `All matched files use Prettier code style!`. Repo-wide `npm run format:check` was also run and reported: still fails on 21 pre-existing `.docs/**`/`.github/**` files this contract never touched — expected, not gated on.

- [x] **Step 2: The unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm test`
Expected: all exit 0, Vitest reports 0 failed. The projects run separately first to warm the Vite transform cache — a cold `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is infrastructure, not a failing test. Only a **second consecutive** timeout is a real problem.
Confirmed: `--project node` → `Test Files 26 passed (26)`, `Tests 481 passed (481)`. `--project dom` → `Test Files 8 passed (8)`, `Tests 51 passed (51)` (no cold-cache timeout this run). `npm test` → `Test Files 34 passed (34)`, `Tests 532 passed (532)`.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Confirmed: exit 0, `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js` written, no bundler errors.

### Task 13: Bring `.docs/implementation/` and the ruleset up to date ✓

- Skill: `implementation-doc-writer`

**Files:**

- Modify: `.docs/implementation/hunt/README.md`, `.docs/implementation/hunt/scoring-tunables.md`, `.docs/implementation/war-council/scoring.md`, `.docs/game_rules/the-hunt.md` — **all written by the skill, never by hand**

This ticket opens the DLR-65 redesign, and the hunt module's existing docs describe a table this contract deletes — `scoring-tunables.md`'s whole "Standing band resolution" section documents `STANDING_BANDS` and `resolveStanding`'s now-removed default, and `hunt/README.md`'s export table has four rows that no longer resolve. `/fb-apply` Step 6.5 already mandates this invocation on every run with no exception; this task is the developer's explicit belt-and-braces on that guarantee (`plan.md` Part 1 → Task reference), and it names the stale files so the skill starts from a target list rather than a blank sweep.

- [x] **Step 1: Invoke the skill after the gates are green**

Done at `/fb-apply` Step 6.5, after all three reviewers approved. The skill's own Step 1 sweep found the
staleness was **wider than this task's starting list** — nine doc files cited a changed identifier, not
four. Updated: `hunt/README.md` (Built by, Responsibility, 13 export rows, invariants, line counts, five
Deferred entries — two of which derived their arithmetic from the now-void old ceiling),
`hunt/scoring-tunables.md` (Standing section rewritten for the pair; `cardValueFor` section added;
credit-cap derivation corrected), `war-council/scoring.md`, `war-council/README.md`,
`war-council/declaration-and-lose-path.md` (its "known consequence" blockquote described a dominance
problem §6 has since dissolved), `war-council/cpu-heuristic.md`, `war-council-ui/README.md`,
`war-council-ui/hunt-readouts-and-telegraph.md` (including its "Greedy has multiplier 0" section, which
no shipped band now satisfies), `war-council-ui/accessibility.md` (a stale `multiplier 6` example), and
the top-level `README.md`. **Created:** `hunt/duel-health-and-damage.md` for the inert half.

Invoke `implementation-doc-writer` via the `Skill` tool. Let it decide what to create and what to update — do not hand-write doc content, and do not pre-judge that there is nothing to document. Point it at, as a starting list and not a limit:

- `.docs/implementation/hunt/scoring-tunables.md` — the Standing-band section describes a single table and a defaulted parameter, both retired
- `.docs/implementation/hunt/README.md` — the export table's `STANDING_BANDS` row is gone; `resolveStanding`'s row now takes a required table; twelve exports are new; the "Tuning the Standing multipliers" and "no band boundary or multiplier survives as a literal" entries need restating against the pair
- `.docs/implementation/war-council/scoring.md` — `tricksToPoints` and `scoreHunt` now name the Win table
- `.docs/game_rules/the-hunt.md` — the multiplier tables, both health totals, the rounding rule, and the simultaneous-depletion ruling are rule-level facts this contract settles or provisionally settles

- [x] **Step 2: Confirm the docs no longer cite a deleted export**

Run: `Select-String -Path (Get-ChildItem -Recurse -Path .docs\implementation,.docs\game_rules -Include *.md).FullName -Pattern "STANDING_BANDS"`
Expected: zero hits.

**Actual: 3 hits, all in `.docs/implementation/hunt/README.md` (lines 40, 63, 132), and all deliberate
— this step is recorded as a knowing deviation, not a pass.** `.docs/game_rules/the-hunt.md` is clean.
Every surviving mention names the export in order to say it is **gone**: "the single `STANDING_BANDS`
table is gone, replaced by…", "…replacing the retired single `STANDING_BANDS`", and the invariant
recording that DLR-66 verified "zero `STANDING_BANDS` hits anywhere in `src/`".

The check's intent — no doc describing a deleted export as though it still exists — is satisfied. Its
literal zero-hit form is not, and cannot be by any doc that explains a rename: a reader whose import
just broke greps for the old name, and a cumulative implementation doc is the right place for them to
land. **Reworded prose was rejected as the fix**, since it would degrade the docs to turn a grep green.
Suggested amendment for a future contract: scope the pattern to citations that imply currency, or grep
`the-hunt.md` alone — that file genuinely should never name an export at all, and does not.

### Task 14: Write the PR description ✓

- Skill: `none — a hand-off document, no code written`

**Files:**

- Create: `.claude/contract/DLR-66-scoring-health-and-rounding-config/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` in this folder and to [DLR-66](https://amazerbeam.atlassian.net/browse/DLR-66).
- Summary: the single transcribed table is replaced by two mirrored tables whose boundaries differ; `resolveStanding` now requires a caller-supplied table; the health totals, the rounding rule, the per-declaration card-value accessor, and the depletion ruling are named data in one module.
- Every decision the developer must make: the rounding rule shipped as `HalfAwayFromZero` with health at 1,350 / 1,600 and doubling as the one-file alternative; the multiplier tables themselves; whether the two `.tsx` call-site edits are acceptable.
- What changes visibly and why nothing new is playable: the status band reads new multipliers and `HuntLedger` can render a `.5` product until T2/T3; the exports have no consumer until T3.
- Verification results from Tasks 10-12, quoted — the grep hit counts, the measured line counts, and the Vitest summary lines.
- A one-line note for future contributors: consumers name a **declaration**, never a table; `standingTableFor` and `cardValueFor` are the module's whole public entry point for §1's two terms.

---

## Self-review

**Spec coverage:**

- `HUNT_MULTIPLIER_TABLES`, one table per declaration, boundaries as per-row data (AC1) — Task 2, asserted in Task 4.
- `resolveStanding` against a caller-supplied table, still `RangeError` outside 0–13; declaration-aware accessor; no consumer names a table (AC2) — Tasks 2, 5, 6, 7; verified in Task 10 Step 3.
- Complementarity invariant at all fourteen splits (AC3) — Task 4 Step 2.
- Alternative-pair swap with the Lose side's different boundaries, real exports unaffected (AC4) — Task 4 Step 3.
- `PLAYER_START_HEALTH`, the Quarry health sequence, `ENCOUNTER_PLAYER_RESTORE`, each with a source-citing comment (AC5) — Task 9.
- `cardValueFor` returning `cardBaseValue` / `invertedCardValue`, no modifier applied (AC6) — Task 2 Step 4, asserted in Task 4 Step 4.
- `DAMAGE_ROUNDING` and `roundDamage`, odd card sum under a ×0.5 band in both settings (AC7) — Task 8.
- `SIMULTANEOUS_DEPLETION_WINNER` as data (AC8) — Task 9.
- `STANDING_BANDS` gone, no boundary or multiplier literal outside the module (AC9) — Tasks 2, 3, 5; verified in Task 10.
- `typecheck`, `lint`, `format:check`, scoped Vitest (AC10) — Task 12.
- Developer's added requirement — `.docs/implementation/` up to date at the end of `/fb-apply` — Task 13.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with its expected result. No step runs bare `vitest`, `npm run dev`, or hand-edits `package-lock.json`. No step invents a tuning value — every number is transcribed from AC1, AC5, AC7, or §9.

**Type / name consistency:** `HUNT_MULTIPLIER_TABLES`, `standingTableFor`, `cardValueFor`, `DamageRounding`, `DAMAGE_ROUNDING`, `roundDamage`, `PLAYER_START_HEALTH`, `QUARRY_ENCOUNTER_HEALTH`, `quarryHealthForEncounter`, `ENCOUNTER_PLAYER_RESTORE`, `SIMULTANEOUS_DEPLETION_WINNER`, `DuelSide`, and `Health` are spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes exactly. `resolveStanding(tricks, table)` takes two arguments in every call site written in Tasks 4–7. `StandingBand`, `StandingBandName`, and `HuntScore` are unchanged throughout.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking (Task 7 Step 5 asserts exit 0). It is deliberately the only phase with a broken interior — a required-parameter change cannot be internally consistent until every reader passes one — which is why the config shape and all seven of its readers change inside this single phase rather than across a boundary, and why Task 2 Step 6 enumerates the exact errors expected mid-phase. No half-applied rename and no dead import survives it.
- **Phase 2** is purely additive and type-checks after every task; nothing consumes the new exports, so no existing behaviour moves. Tasks 8 and 9 each end with a passing scoped Vitest run and a clean typecheck.
- **Phase 3** makes no production change at all — greps, measurements, gates, the doc-writer invocation, and the PR write-up.
