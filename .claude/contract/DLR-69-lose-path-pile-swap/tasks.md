# Tasks: The Lose path's pile swap and the two card-value schemes

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-12

**Goal:** Make the pile a second axis of the declaration alongside the value function — Win pays a side for its own capture pile at printed rank, Lose pays it for the other side's pile at `12 − r`, each pile counted exactly once — and prove it with §8's fourteen-row Lose column and the `k = 0 → +78` falsifier.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**

- `src/hunt/config.ts:87-116` — add `PaidPile`, `CardValueScheme`, the module-private `CARD_VALUE_SCHEMES` record and `cardValueSchemeFor`; redefine `cardValueFor` off the record so the declaration→value mapping exists once.
- `src/hunt/index.ts:4-27` — re-export `CardValueScheme`, `PaidPile`, `cardValueSchemeFor`.
- `src/hunt/__tests__/config.test.ts` — add AC6's exhaustiveness suite over `Object.values(HuntDeclaration)`.
- `src/warCouncil/spoils.ts:1-26` — third parameter becomes an injectable `CardValueScheme`; resolve the pile through `otherSide` when the scheme says `Other`; rewrite the doc comment (it currently documents the interim as a chosen interim).
- `src/warCouncil/__tests__/spoils.test.ts:34-93` — re-fit the flat-value call to a scheme; replace the own-pile `describe` with AC1/AC2's own-pile-on-Win, other-pile-on-Lose, and each-pile-once assertions.
- `src/warCouncil/scoring.ts:1-116,149` — `scoreHunt`'s third parameter becomes a `CardValueScheme`; `huntDamage` resolves one scheme and hands it to both seats.
- `src/warCouncil/__tests__/scoring.test.ts:1-113` — re-fit the five injecting call sites to schemes; give the Quarry a pile in the DLR-67 both-defaults fixture so its Lose case stops being vacuous; drop the now-unused `cardValueFor` import (`noUnusedLocals` is on).
- `src/warCouncil/__tests__/huntEnumeration.test.ts:6-97` — replace `LOSE_SPLITS_OWN_PILE` with §8's transcribed Lose column (AC4); correct the `AVERAGE_RANK` comment; add AC5's explicit `k = 0 → +78` test.
- `src/warCouncil/index.ts` — **only if** Task 4's grep finds a consumer that needs `CardValueScheme` re-exported through it. The audit found none; a no-op here is the expected result, recorded rather than assumed.

**Deleted:** (none)

**Developer decides or observes:**

- **The `src/hunt/config.ts` scope extension** — `plan.md` Part 2 → Risks, bullet 1. Approved at the Step 3 gate; recorded here because the ticket's own file list does not name that file. Options (b) and (c) are written out in the plan if this is revisited.
- **`src/app/warCouncil/DeclareGate.tsx:46-47`'s copy becomes factually wrong** — it says a trick you take adds its cards to *your* Spoils on the Lose path, which the swap inverts. Every UI file is out of scope, so this contract must not touch it. Accept for the prototype / widen by one file / follow-up ticket, and the replacement wording is the developer's.
- **Whether the on-screen readouts read honestly on a Lose Hunt** — `HuntLedger.tsx:34-37` ("Running Spoils") and `RoundOverPanel.tsx:87-90` ("Spoils") will display the *Quarry's* pile value under the player's own heading. A feel judgement, answerable only by playing; not a functional check and not QA's.
- **Three design calls already approved at the plan gate**, listed so a reader of this file alone can see them rather than only a reader of `plan.md`: binding both axes into one `CardValueScheme` rather than taking a bare `declaration` parameter (`plan.md` Risks, bullet 3); leaving the `PaidPile` check inside `spoils` as a ternary rather than a second total record (bullet 4); and strengthening `scoring.test.ts`'s DLR-67 Lose fixture so it stops asserting `0 === 0` (bullet 6). Each is reversible in a single task if overturned.
- **Nothing else.** There is no unchosen tuning value in this contract, and `RANK_INVERSION_PIVOT = 12` is explicitly not one. No new dependency is required.

---

## Phase 1 — The declaration's second axis, in `src/hunt/`

Adds the pile axis beside the value axis as one total, declaration-keyed record, and redefines `cardValueFor` off it. This is a safe stopping point: `cardValueFor` keeps its name and signature, so `spoils.ts`, `scoring.ts` and the two out-of-scope `DeclareGate` files all still compile and behave identically — the phase adds capability without changing a single existing result.

### Task 1: Add the card-value scheme to `src/hunt/config.ts` and export it ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/hunt/config.ts:87-116`
- Modify: `src/hunt/index.ts:4-27`
- Test: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Write AC6's failing exhaustiveness suite in `src/hunt/__tests__/config.test.ts`**

Append this suite. Add `cardValueSchemeFor` and `PaidPile` to the existing import block from `../config` (the file already imports `cardBaseValue`, `cardValueFor`, `invertedCardValue`, `HuntDeclaration`).

```ts
describe('cardValueSchemeFor — the two schemes are exhaustive over the declaration union (DLR-69 AC6)', () => {
  const EVERY_DECLARATION = Object.values(HuntDeclaration)

  it('covers every declared path, so none can fall through to a default', () => {
    // Guards the loop below from passing vacuously if the union were ever emptied.
    expect(EVERY_DECLARATION.length).toBeGreaterThan(1)
    for (const declaration of EVERY_DECLARATION) {
      const scheme = cardValueSchemeFor(declaration)
      expect(typeof scheme.value).toBe('function')
      expect(Object.values(PaidPile)).toContain(scheme.paidPile)
    }
  })

  it('pairs printed rank with the own pile on Win, and 12 − r with the other pile on Lose', () => {
    const onWin = cardValueSchemeFor(HuntDeclaration.Win)
    expect(onWin.value(1)).toBe(cardBaseValue(1))
    expect(onWin.paidPile).toBe(PaidPile.Own)

    const onLose = cardValueSchemeFor(HuntDeclaration.Lose)
    expect(onLose.value(1)).toBe(invertedCardValue(1))
    expect(onLose.paidPile).toBe(PaidPile.Other)
  })

  it('differs between the two declarations on BOTH axes', () => {
    // The falsifier for a half-applied change: a record that varied only the value function
    // would satisfy every assertion above and still leave the Lose path on its own pile.
    const onWin = cardValueSchemeFor(HuntDeclaration.Win)
    const onLose = cardValueSchemeFor(HuntDeclaration.Lose)
    expect(onLose.paidPile).not.toBe(onWin.paidPile)
    expect(onLose.value(11)).not.toBe(onWin.value(11))
  })

  it('keeps cardValueFor in step with the scheme’s value function', () => {
    // cardValueFor is derived from the same record, so the two cannot drift. Asserted because
    // consumers outside the value path (src/app/warCouncil/DeclareGate.tsx) still call it.
    for (const declaration of EVERY_DECLARATION) {
      expect(cardValueSchemeFor(declaration).value).toBe(cardValueFor(declaration))
    }
  })
})
```

- [x] **Step 2: Run the new suite and confirm it is red**

Run: `npx vitest run src/hunt/__tests__/config.test.ts -t "exhaustive over the declaration union"`
Expected: the run **FAILS**. `cardValueSchemeFor` and `PaidPile` do not exist yet, so it fails either as a Vite link/transform error naming the missing export or as a `TypeError`. Both are the intended red — neither is a defect, and neither means the file's other suites are broken.

- [x] **Step 3: Add `PaidPile`, `CardValueScheme`, `CARD_VALUE_SCHEMES` and `cardValueSchemeFor` to `src/hunt/config.ts`**

Insert immediately after `invertedCardValue` (currently ending at line 103) and before the existing `cardValueFor`:

```ts
/**
 * Whose capture pile a side is paid for, stated RELATIVE to that side — which is why this union
 * needs no `PlayerSide` and `src/hunt/` stays free of any `src/warCouncil/` import (types.ts:26-32).
 * Resolving `Other` into a concrete seat is `src/warCouncil/spoils.ts`'s job, via `otherSide`.
 */
export const PaidPile = {
  Own: 'own',
  Other: 'other',
} as const
export type PaidPile = (typeof PaidPile)[keyof typeof PaidPile]

/**
 * The two halves of §1's card-value rule, bound so neither can be read without the other.
 * Deliberately not two parameters: a caller who injected `cardValueFor(Lose)` while the pile
 * defaulted from an undeclared state would get inverted values over the OWN pile — the exact
 * interim DLR-69 retires, produced by supplying half the scheme (DLR-69 AC1, AC2).
 */
export interface CardValueScheme {
  readonly value: (rank: number) => number
  readonly paidPile: PaidPile
}

/**
 * §1's card-value rule as data, per declaration (hybrid-design.md lines 42-44). A total `Record`,
 * not a ternary: a third `HuntDeclaration` member becomes a missing-property compile error rather
 * than a silent fall through to printed rank and the own pile (DLR-69 AC6).
 *
 * Module-private, unlike `HUNT_MULTIPLIER_TABLES` — which is exported and then documented as
 * unusable outside `src/hunt/`. `cardValueSchemeFor` is the only way in.
 *
 * The scheme objects are built once here rather than per call, so the accessor allocates nothing.
 */
const CARD_VALUE_SCHEMES: Readonly<Record<HuntDeclaration, CardValueScheme>> = {
  [HuntDeclaration.Win]: { value: cardBaseValue, paidPile: PaidPile.Own },
  [HuntDeclaration.Lose]: { value: invertedCardValue, paidPile: PaidPile.Other },
}

/**
 * The third sibling of `standingTableFor` and `cardValueFor`: name a declaration once, get both
 * halves of §1's card-value rule as one inseparable object.
 */
export function cardValueSchemeFor(declaration: HuntDeclaration): CardValueScheme {
  return CARD_VALUE_SCHEMES[declaration]
}
```

- [x] **Step 4: Redefine `cardValueFor` off the record**

Replace the body at `src/hunt/config.ts:114-116`. Keep the existing doc comment above it and append the two sentences shown.

```ts
/**
 * §1's additive term, per declaration: a card is worth its printed rank on Win and `12 − r`
 * on Lose (DLR-66 AC6). Both functions already existed and are unchanged; this is the
 * accessor that pairs with `standingTableFor`, so a consumer names a declaration once and
 * gets both terms of §1's equation.
 *
 * NO modifier of any kind is applied. The Treasure `+1` and Poison `−1` are Decided-removed
 * (§1, §9 2026-08-11) — at ×5 a ±1 card modifier moves a Hunt by 5 out of 540.
 *
 * DLR-69: now read off `CARD_VALUE_SCHEMES` rather than a `declaration === Lose` ternary, so the
 * declaration → value mapping exists exactly once and a third declared path cannot default. This
 * is the VALUE half only; a caller that also needs the pile half wants `cardValueSchemeFor`.
 */
export function cardValueFor(declaration: HuntDeclaration): (rank: number) => number {
  return CARD_VALUE_SCHEMES[declaration].value
}
```

- [x] **Step 5: Re-export the three new names from `src/hunt/index.ts`**

Add `CardValueScheme` to the existing type-export line for `./config` (currently `export type { StandingBand } from './config'`), and `PaidPile` plus `cardValueSchemeFor` into the existing value-export block from `./config`:

```ts
export type { StandingBand, CardValueScheme } from './config'
export {
  StandingBandName,
  HUNT_MULTIPLIER_TABLES,
  standingTableFor,
  resolveStanding,
  cardBaseValue,
  cardValueFor,
  PaidPile,
  cardValueSchemeFor,
  // …the remaining existing entries, unchanged
} from './config'
```

- [x] **Step 6: Typecheck, then confirm the whole `src/hunt/` spec file is green**

Run: `npm run typecheck; npx vitest run src/hunt/__tests__/config.test.ts`
Expected: `typecheck` exits 0 with no errors. Vitest reports **0 failed** and every pre-existing suite in the file still passing alongside the four new AC6 tests — the existing `cardValueFor` suite at `config.test.ts:151-163` must be untouched and green, which is what proves Step 4 changed no behaviour.

---

## Phase 2 — The swap itself, in `src/warCouncil/`

Threads the scheme through `spoils` and then `scoring`, which is where the Lose path actually changes pile. The two tasks are ordered and **the codebase does not type-check between them** — Task 2 changes `spoils`'s parameter type while `scoring.ts:105` still passes a bare function, and Task 3 is what closes that. The phase boundary, not the task boundary, is the safe stopping point; Task 3's final step is where the whole tree is consistent again.

### Task 2: Resolve the paid pile in `src/warCouncil/spoils.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/spoils.ts:1-26`
- Test: `src/warCouncil/__tests__/spoils.test.ts:34-93`

- [x] **Step 1: Replace the own-pile `describe` block in `src/warCouncil/__tests__/spoils.test.ts`**

Delete the block currently at lines 71-85 (`'spoils — the declaration governs the value scheme for BOTH sides (AC4)'`) down to and including its `it.each`, keeping the `const captured` fixture and the `'reads an undeclared round as Win'` test that follows it. Replace with:

```ts
describe('spoils — the declaration decides WHOSE pile a side is paid for (DLR-69 AC1, AC2)', () => {
  // Deliberately asymmetric — rank 1 against rank 11. A symmetric fixture would pass under
  // either pile and prove nothing, which is the failure mode this ticket exists to close.
  const captured = {
    player: [{ suit: 'bells' as const, rank: 1 }],
    cpu: [{ suit: 'keys' as const, rank: 11 }],
  }
  const declared = (path: HuntDeclaration): RoundState => ({
    ...stateWithCaptured(captured, { player: 1, cpu: 1 }),
    declaration: { path },
  })

  it('pays each side for its OWN pile at printed rank on Win (AC1)', () => {
    const state = declared(HuntDeclaration.Win)
    expect(spoils(state, 'player')).toBe(cardBaseValue(1))
    expect(spoils(state, 'cpu')).toBe(cardBaseValue(11))
  })

  it('pays each side for the OTHER side’s pile at 12 − r on Lose (AC2)', () => {
    const state = declared(HuntDeclaration.Lose)
    // The player is paid for the Quarry's rank-11 card: 12 − 11 = 1.
    expect(spoils(state, 'player')).toBe(invertedCardValue(11))
    // The Quarry is paid for the player's rank-1 card: 12 − 1 = 11.
    expect(spoils(state, 'cpu')).toBe(invertedCardValue(1))
  })

  it('counts each pile exactly once across the two sides on Lose (AC2)', () => {
    // hybrid-design.md:208-214's discarded branch — both sides counting the Quarry's pile —
    // would make this sum 2 × invertedCardValue(11), paying one pile out twice.
    const state = declared(HuntDeclaration.Lose)
    expect(spoils(state, 'player') + spoils(state, 'cpu')).toBe(
      invertedCardValue(1) + invertedCardValue(11),
    )
  })
})
```

> **Post-review correction (round 2 fix pass):** the fixture ranks specified above — `player: rank 1`,
> `cpu: rank 11` — were found during round-1 review to be a mirror pair under
> `RANK_INVERSION_PIVOT` (12): `12 − 11 = 1` and `12 − 1 = 11`, so own-pile-at-printed-rank (Win)
> and other-pile-at-inverted (Lose) produced the identical two numbers on both sides, and the block's
> comment claimed an asymmetry property the fixture did not actually have. The fixture actually
> shipped, and to be kept on any future edit, is `player: rank 2` / `cpu: rank 11` (sum 13, not 12),
> with the comment and every expected value corrected to match. Do not restore the rank-1/rank-11
> pair shown above from this plan text — it is the exact defect the correction closed.

- [x] **Step 2: Re-fit the flat-value injection at `spoils.test.ts:46` to a scheme**

```ts
expect(spoils(state, 'player', { value: () => 1, paidPile: PaidPile.Own })).toBe(
  2 * state.tricksWon.player,
)
```

Update the file's imports: add `cardBaseValue`, `invertedCardValue` and `PaidPile` from `'../../hunt'`. Keep `cardValueFor` — line 66's Treasure/Poison assertion still uses it. `HuntDeclaration` and the `RoundState` type are already imported.

- [x] **Step 3: Run the spec and confirm it is red on the Lose assertions**

Run: `npx vitest run src/warCouncil/__tests__/spoils.test.ts`
Expected: the run **FAILS**. The AC2 tests fail because `spoils` still sums the own pile — `spoils(state, 'player')` returns `invertedCardValue(1)` (11) where 1 is expected. This is the interim behaviour being caught, which is the point of the step.

- [x] **Step 4: Implement the pile resolution in `src/warCouncil/spoils.ts`**

Replace the file in full — the existing doc comment documents the interim as a deliberate interim and is now wrong end to end.

```ts
import { cardValueSchemeFor, PaidPile, type CardValueScheme, type Spoils } from '../hunt'
import { declaredPath, otherSide, type PlayerSide, type RoundState } from './types'

/**
 * §1's additive term: the value of the one capture pile this side is paid for, under the scheme
 * the declaration puts in force. On Win that is the side's OWN pile at printed rank; on Lose it is
 * the OTHER side's pile at `12 − r` (hybrid-design.md lines 42-44 — "each pile is counted exactly
 * once, by the side that did not win it").
 *
 * That invariant needs no counter and no bookkeeping: it is a consequence of each side reading
 * exactly one pile and the two sides reading different ones. The discarded branch — both sides
 * counting the Quarry's pile — pays one pile out twice and flips the sign at `k = 0`, where a
 * player who declares Lose and wins zero tricks would finish 78 behind instead of 78 ahead
 * (hybrid-design.md lines 208-214).
 *
 * No modifier of any kind is applied: the Treasure `+1` and Poison `−1` are Decided-removed
 * (§1, §9 2026-08-11), and at ×5 a ±1 card modifier moved a Hunt by under 1% of the ceiling.
 *
 * `scheme` carries BOTH axes on purpose and defaults off the state's own declaration. Splitting
 * them into two parameters would let a caller inject the Lose value function while the pile
 * defaulted from an undeclared state — inverted values over the own pile, which is precisely the
 * DLR-67 interim this replaces. It stays injectable for tests, mirroring `resolveStanding`'s
 * table parameter in src/hunt/config.ts.
 */
export function spoils(
  state: RoundState,
  side: PlayerSide,
  scheme: CardValueScheme = cardValueSchemeFor(declaredPath(state)),
): Spoils {
  const paidFor = scheme.paidPile === PaidPile.Other ? otherSide(side) : side
  return state.capturedCards[paidFor].reduce((total, card) => total + scheme.value(card.rank), 0)
}
```

- [x] **Step 5: Re-run the spec and confirm it is green**

Run: `npx vitest run src/warCouncil/__tests__/spoils.test.ts`
Expected: Vitest reports **0 failed**. Note that `npm run typecheck` is expected to FAIL at this point — `scoring.ts:105` still passes a bare function to `spoils` — and Task 3 closes it. Do not "fix" that by reverting anything here.

### Task 3: Thread the scheme through `src/warCouncil/scoring.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/scoring.ts:1-20,95-116,149`
- Test: `src/warCouncil/__tests__/scoring.test.ts:1-113`

- [x] **Step 1: Change `scoreHunt`'s third parameter to a `CardValueScheme`**

In the import block from `'../hunt'` (lines 1-11), replace `cardValueFor` with `cardValueSchemeFor` and add `type CardValueScheme`. Then replace `scoreHunt`'s signature and its `spoils` call:

```ts
export function scoreHunt(
  state: RoundState,
  side: PlayerSide,
  scheme: CardValueScheme = cardValueSchemeFor(declaredPath(state)),
  standingTable: readonly StandingBand[] = standingTableFor(declaredPath(state)),
): HuntDamage {
  const tricks = state.tricksWon[side]
  const band = resolveStanding(tricks, standingTable)
  const spoilsValue = spoils(state, side, scheme)
```

Amend the sentence in its doc comment that reads "They stay injectable so a test can hold one axis flat while varying the other" to name what is now one axis rather than two:

```ts
 * Both terms default off the state's OWN declaration via `declaredPath`. DLR-69 replaced the bare
 * card-value function with a `CardValueScheme` carrying both the value function and the pile it is
 * summed over, so no caller can inject one half and let the other default from a different source.
 * Scheme and table stay injectable so a test can hold one term flat while varying the other,
 * mirroring `resolveStanding`'s pattern in src/hunt/config.ts.
```

- [x] **Step 2: Resolve one scheme in `huntDamage` and hand it to both seats**

Replace `scoring.ts:149-156`:

```ts
  const scheme = cardValueSchemeFor(declaration)
  const standingTable = standingTableFor(declaration)

  // Keyed by the side that DEALT it. Crossed below — never returned in this form.
  const dealt: Readonly<Record<PlayerSide, HuntDamage>> = {
    [PlayerSide.Player]: scoreHunt(finalState, PlayerSide.Player, scheme, standingTable),
    [PlayerSide.Cpu]: scoreHunt(finalState, PlayerSide.Cpu, scheme, standingTable),
  }
```

The surrounding doc comment's claim that "Both terms are resolved ONCE and handed to both seats" is now true of three facts rather than two (value function, paid pile, table) and needs no rewrite — but add one sentence: `DLR-69: the pile a side is paid for travels in that same scheme, so "the two sides read different piles" is one crossing performed in \`spoils\`, not a per-seat decision either caller could get wrong.`

- [x] **Step 3: Re-fit the five injecting call sites in `src/warCouncil/__tests__/scoring.test.ts`**

Add a shared flat scheme after the file's existing `winTable` constant (line 36), and replace `() => 1` at lines 44, 60 and 64 with it:

```ts
// Card value held flat at 1 over the own pile, so a spec can isolate the multiplier axis. The
// same role `() => 1` played before DLR-69 bound the two axes into one object.
const FLAT_OWN: CardValueScheme = { value: () => 1, paidPile: PaidPile.Own }
```

- line 44 → `const result = scoreHunt(state, PlayerSide.Player, FLAT_OWN)`
- line 60 → `expect(scoreHunt(state, PlayerSide.Player, FLAT_OWN, raised).damage).toBe(6 * 18)`
- line 64 → `const baseline = scoreHunt(state, PlayerSide.Player, FLAT_OWN)`

In the import block from `'../../hunt'` (lines 4-11): **remove `cardValueFor`** — it becomes unused and `noUnusedLocals` is on in `tsconfig.app.json`, so leaving it is a typecheck error — and add `cardValueSchemeFor`, `PaidPile`, and `type CardValueScheme`.

- [x] **Step 4: Give the Quarry a pile in the DLR-67 both-defaults fixture, so its Lose case stops being vacuous**

Replace the fixture and expectation at `scoring.test.ts:90-99`. Today `cpu: []` means the post-swap Lose branch scores the player off an empty pile — 0 on both sides of the assertion, so it passes while proving nothing.

```ts
      const state = {
        ...huntState(
          // The Quarry's pile is non-empty on purpose: post-DLR-69 the Lose path scores the
          // player off it, and a `cpu: []` fixture would make this assertion 0 === 0.
          { player: fillerCards(8), cpu: fillerCards(18) },
          { player: 4, cpu: 9 },
        ),
        declaration: { path },
      }
      const expected = scoreHunt(
        state,
        PlayerSide.Player,
        cardValueSchemeFor(path),
        standingTableFor(path),
      )
```

- [x] **Step 5: Typecheck the whole tree and run both `src/warCouncil` specs**

Run: `npm run typecheck; npx vitest run src/warCouncil/__tests__/scoring.test.ts src/warCouncil/__tests__/spoils.test.ts`
Expected: `typecheck` exits 0 — this is the step that closes Task 2's deliberate breakage, so a non-zero exit here means a call site was missed rather than that anything is wrong with the design. Vitest reports **0 failed** across both files.

### Task 4: Confirm whether `src/warCouncil/index.ts` needs the scheme re-exported ✓ (no-op)

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/index.ts` — **conditionally**, only if Step 1 finds a consumer

- [x] **Step 1: Grep for any consumer outside `src/hunt/` and `src/warCouncil/` that supplies the third argument**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch 'warCouncil\\(spoils|scoring)\.ts' } | Select-String -Pattern "spoils\(.*,.*,|scoreHunt\(.*,.*,"`
Expected: hits only inside `src/warCouncil/__tests__/` (which import from `'../../hunt'` directly) and **zero** hits under `src/app/`. If that holds, make no edit — `src/warCouncil/index.ts` is correct as it stands, since no `src/warCouncil` name changed and `CardValueScheme` is reachable from `src/hunt`.

**Actual result:** the grep also surfaced two lines in `src/app/warCouncil/WarCouncilRound.tsx` (72-73). Inspection shows both are the pre-existing two-argument calls `scoreHunt(ui.round, PlayerSide.Player)` / `scoreHunt(ui.round, PlayerSide.Cpu)` — the regex's second required comma is matched by the object-literal's trailing comma after the closing paren, not a third function argument. No `src/app/` call site supplies a third argument to either function. The substantive audit finding holds; the regex has a false-positive on trailing-comma object literals worth noting for whoever reuses it. No edit made.

- [x] **Step 2: Add the re-export only if Step 1 found an `src/app/` consumer — N/A, skipped**

Step 1 found no `src/app/` consumer supplying a third argument, so this step is correctly skipped per its own instructions. `src/warCouncil/index.ts` is left unmodified — a no-op is the expected outcome, not an oversight.

---

## Phase 3 — §8's Lose column and the discarded branch's falsifier

The ticket's headline evidence, and test-only: no production file changes in this phase. It replaces DLR-68's interim fixture with §8's published Lose column and adds the `k = 0` assertion that the discarded branch would fail. A safe stopping point by construction — nothing but a spec file moves.

### Task 5: Transcribe §8's Lose column and assert the `k = 0` edge case ✓

- Skill: `react-frontend`

**Files:**

- Test: `src/warCouncil/__tests__/huntEnumeration.test.ts:6-97`

- [x] **Step 1: Correct the `AVERAGE_RANK` comment so it explains what still holds after the swap**

Replace the comment at lines 6-10. Rank 6 remains the right fixture card, but for a reason that now needs stating in two parts rather than one.

```ts
// §8's frame is "printed rank, average rank 6 — a trick's two cards worth roughly 12 between
// them" (hybrid-design.md:996-999). Rank 6 is also the fixed point of the Lose inversion
// (12 − 6 = 6), so a pile of rank-6 cards is worth the same under BOTH value schemes. Post-DLR-69
// the schemes differ on a second axis — WHICH pile a side is paid for — and both piles here are
// rank-6 cards, so the figures below still fall out of `huntDamage(finalState)` with no injected
// scheme, which is what lets a signature taking only a state be checked against the design table.
```

- [x] **Step 2: Replace `LOSE_SPLITS_OWN_PILE` with §8's transcribed Lose column**

Delete lines 59-79 in full (the `INTERIM` comment and the `LOSE_SPLITS_OWN_PILE` array) and put this in their place:

```ts
// TRANSCRIBED from hybrid-design.md §8, lines 1003-1016, Lose column — all fourteen rows, in the
// same frozen-on-purpose spirit as WIN_SPLITS above. Replaces DLR-68's interim own-pile column,
// the handover DLR-68 AC7 named. Under the pile swap each side is paid for the OTHER side's pile,
// so this column is the Win column with its two damage figures exchanged — which is §8 line 1020's
// "the Lose column the exact negative of the Win column at every row", stated as data.
// The four rows §8 flags in bold: k=0, k=4, k=9, k=13 (DLR-69 AC4).
const LOSE_SPLITS: readonly Split[] = [
  [0, 78, 0],
  [1, 72, 12],
  [2, 66, 24],
  [3, 60, 36],
  [4, 540, 96],
  [5, 480, 180],
  [6, 420, 288],
  [7, 288, 420],
  [8, 180, 480],
  [9, 96, 540],
  [10, 36, 60],
  [11, 24, 66],
  [12, 12, 72],
  [13, 0, 78],
]
```

- [x] **Step 3: Point the `describe.each` at the new fixture and relabel it**

Replace line 83:

```ts
  ['Lose (§8 in full)', HuntDeclaration.Lose, LOSE_SPLITS],
```

Also update the enclosing `describe.each` title on line 84 — it cites `(AC7)`, which was DLR-68's criterion for the interim column. It is now DLR-69 AC4's:

```ts
])('huntDamage — the fourteen splits at average card values, %s (DLR-69 AC4)', (_label, path, splits) => {
```

- [x] **Step 4: Add AC5's explicit `k = 0` assertion**

Append after the `describe.each` block that ends at line 97 (before the antisymmetry block):

```ts
describe('huntDamage — the k = 0 Lose edge case, the discarded branch’s own falsifier (AC5)', () => {
  it('pays the player 78 and the Quarry 0 when a declared-Lose player wins zero tricks', () => {
    const outcome = huntDamage(finishedHunt(0, HuntDeclaration.Lose))

    // hybrid-design.md:208-214. Only one pile exists in this split — the Quarry's 13-trick,
    // 26-card sweep. The rule counts it once, for the side that did not win it, so it pays the
    // PLAYER: 26 × 6 = 156, at Lose(0) = ×0.5 → 78. The discarded branch (both sides counting the
    // Quarry's pile) pays it to the Quarry instead, finishing a plan executed as well as it can be
    // executed 78 BEHIND rather than 78 ahead. That sign is what this test exists to pin.
    expect(outcome.incoming[PlayerSide.Cpu].damage).toBe(78)
    expect(outcome.incoming[PlayerSide.Player].damage).toBe(0)
    expect(
      outcome.incoming[PlayerSide.Cpu].damage - outcome.incoming[PlayerSide.Player].damage,
    ).toBe(78)
  })
})
```

- [x] **Step 5: Run the file and confirm every suite in it is green, including DLR-68's untouched antisymmetry property**

Run: `npx vitest run src/warCouncil/__tests__/huntEnumeration.test.ts`
Expected: Vitest reports **0 failed**, with 28 enumeration cases (14 Win + 14 Lose), the new `k = 0` test, and DLR-68's `Net(k) = −Net(13 − k)` suite at lines 99-120 all passing. That last suite is **not edited by this contract** — it is derived rather than transcribed and the swap preserves it, so a failure there means the implementation is wrong, not the fixture.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean, plus the two greps the ticket asks for by name and the PR description.

### Task 6.1: Confirm the pure-core boundary still holds ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep both pure trees, recursively, for a React import or a DOM global**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: **zero hits.** The recursive `Get-ChildItem | Select-String` form is required — `Select-String -Path 'src\**\*.ts'` reaches exactly one directory level and would silently report zero for a hit inside `__tests__/` (`.claude/workflow/web-project.md`). The boundary is lint-enforced at `eslint.config.js:24`, so Task 6.4's `npm run lint` is the second, independent check.

### Task 6.2: Confirm AC3 — no card modifier survives in the value path ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep the three value-path source files for a Treasure or Poison branch**

Run: `Select-String -Path src\hunt\config.ts,src\warCouncil\spoils.ts,src\warCouncil\scoring.ts -Pattern "CardRank\.(Treasure|Poison)|Treasure|Poison"`
Expected: **zero hits.** An explicit file list is the correct use of `-Path`. The three surviving hits repo-wide are all in `src/warCouncil/__tests__/spoils.test.ts` (lines 60, 61, 67) and are the fixture and assertion *proving* no modifier applies — they are not branches and must not be removed.

### Task 6.3: Confirm the interim is gone and exactly one place selects a pile ✓

- Skill: `react-frontend`

- [x] **Step 1: Grep for the retired fixture name**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "LOSE_SPLITS_OWN_PILE|own-pile|interim own"`
Expected: **zero hits.** Both of `LOSE_SPLITS_OWN_PILE`'s prior hits were in `huntEnumeration.test.ts` (lines 64, 83) and Task 5 replaced them.

- [x] **Step 2: Grep for every non-test site that indexes a capture pile**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Where-Object { $_.FullName -notmatch '__tests__' } | Select-String -Pattern "capturedCards\["`
Expected: **exactly 2 hits** — `src/warCouncil/playCard.ts:111` (the accumulator that writes a captured trick into the winner's pile) and `src/warCouncil/spoils.ts` (the single reader that decides which pile is valued). Any third hit is a second place selecting a pile, which is how "each pile counted exactly once" would silently break.

### Task 6.4: Static gates and the full suite ✓

- Skill: `react-frontend`

- [x] **Step 1: Warm the Vite transform cache by running the two Vitest projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0, **0 failed**. This is not redundant with Step 2: a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond` on the `dom` project, which is a worker-start timeout and not a failing test (`.claude/workflow/web-project.md`). Warming first makes Step 2's result trustworthy.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports **0 failed**. Quote the `Tests  N passed` summary line.

- [x] **Step 3: Check formatting of this contract's files only, then report the repo-wide result**

Run: `npx prettier --check src/hunt/config.ts src/hunt/index.ts src/hunt/__tests__/config.test.ts src/warCouncil/spoils.ts src/warCouncil/scoring.ts src/warCouncil/__tests__/spoils.test.ts src/warCouncil/__tests__/scoring.test.ts src/warCouncil/__tests__/huntEnumeration.test.ts; npm run format:check`
Expected: the scoped `prettier --check` exits 0 — that is the gate. `npm run format:check` is AC7's wording and must be **run and reported**, but it fails on pre-existing `.docs/**` files no current contract has touched, so a failure there is reported, not fixed. If the scoped check fails, run `npx prettier --write` on those same paths and re-check.

- [x] **Step 4: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\config.ts,src\hunt\index.ts,src\hunt\__tests__\config.test.ts,src\warCouncil\spoils.ts,src\warCouncil\scoring.ts,src\warCouncil\__tests__\spoils.test.ts,src\warCouncil\__tests__\scoring.test.ts,src\warCouncil\__tests__\huntEnumeration.test.ts | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }`
Expected: every file **under 400 lines**. Baselines before this contract: `config.ts` 221, `spoils.ts` 26, `scoring.ts` 167, `config.test.ts` 287, `spoils.test.ts` 93, `scoring.test.ts` 238, `huntEnumeration.test.ts` 120. `config.ts` (~256 expected) and `config.test.ts` (~310 expected) land in the 200–400 "second look" band — report the numbers rather than only a pass. `(Get-Content …).Count` is used rather than `Measure-Object -Line`, which drops blank lines and undercounts.

- [x] **Step 5: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `npm run build` runs `npm run lint` first per `package.json`, so a lint regression surfaces here too.

### Task 6.5: Update the PR description ✓

- Skill: `none — a hand-off document for the developer, no TypeScript written`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- Link to `plan.md` in this folder, and the DLR-69 issue key.
- Summary: the Lose path's two-way pile swap, the `CardValueScheme` that binds the value and pile axes, and §8's Lose column replacing DLR-68's interim.
- **The two decisions the developer owns**, verbatim from this file's "Developer decides or observes": the `src/hunt/config.ts` scope extension (approved at the plan gate), and `DeclareGate.tsx:46-47`'s copy now stating the opposite of the rule with every UI file out of scope. State the three options for the copy and that the wording is theirs.
- **One behaviour only judgeable by playing:** whether `HuntLedger`'s "Running Spoils" and `RoundOverPanel`'s "Spoils" read honestly on a Lose-declared Hunt now that they display the Quarry's pile value under the player's heading.
- Verification results from Phase 4, with real numbers: the `Tests  N passed` line, the four grep results, the eight file line counts, and the `format:check` caveat.
- A one-line note for future contributors on the new convention: a fact the declaration decides gets a total `Readonly<Record<HuntDeclaration, …>>` and an accessor, never a ternary — and two facts that must not be read apart travel in one object rather than two parameters.

---

## Self-review

(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)

**Spec coverage:**

- AC1 — Win, own pile at printed rank: Task 1 (the record's Win entry + its assertion), Task 2 (the resolution + the AC1 test), Task 5 (the Win column, unchanged and still green).
- AC2 — Lose, other side's pile at `12 − r`, each pile once: Task 1 (the Lose entry), Task 2 (the AC2 tests, including the counted-exactly-once sum), Task 6.3 Step 2 (exactly one pile-selection site).
- AC3 — no modifier, confirmed by grep: Task 6.2.
- AC4 — the fourteen splits under both declarations, four flagged rows: Task 5 Steps 2-3, Step 5.
- AC5 — `k = 0` Lose asserted explicitly as `+78`: Task 5 Step 4.
- AC6 — the two schemes exhaustive over the declaration union: Task 1 Steps 1, 3, 4 (a total `Record` for the structural half, replacing the `cardValueFor` ternary) and Step 6.
- AC7 — typecheck, lint, format:check, scoped Vitest: Task 6.4 Steps 1-3, with scoped runs also in Tasks 1, 2, 3 and 5.
- Ticket scope — `spoils.ts`, the damage module, `types.ts`, `index.ts` and their tests: Tasks 2, 3, 4. `src/warCouncil/types.ts` needs no edit (the audit found no name or shape in it changing) and is recorded as such rather than opened.
- In-scope bullet "`src/warCouncil/index.ts` re-exports whatever new names cross the boundary": Task 4, which resolves to a no-op by the audit's finding and says so.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`, `node_modules/` or `dist/`. No `eslint-disable` anywhere. No step invents a tuning value — this contract adds no configuration key and needs no number chosen.

**Type / name consistency:** `PaidPile`, `PaidPile.Own`, `PaidPile.Other`, `CardValueScheme`, `CARD_VALUE_SCHEMES`, `cardValueSchemeFor`, `FLAT_OWN` and `LOSE_SPLITS` are spelled identically in every task that names them and match `plan.md` Part 2 → Data shapes exactly. `cardValueFor` keeps its name and `(declaration) => (rank) => number` signature throughout, which is what leaves the six `invertedCardValue` / `cardValueFor` hits in the out-of-scope `DeclareGate` files untouched. `spoils` and `scoreHunt` keep their names; only their third parameter's type changes, in Tasks 2 and 3 respectively, and Task 3 Step 5 is where the tree type-checks again.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking (Task 1 Step 6) with `cardValueFor` unchanged in name, signature and behaviour, so every existing consumer — including two out-of-scope `.tsx` files — compiles and behaves identically. Nothing is half-applied: the record, the accessor, the re-exports and the AC6 spec all land in one task.
- **Phase 2** ends type-checking at Task 3 Step 5. It deliberately does **not** type-check between Tasks 2 and 3 — Task 2 changes `spoils`'s parameter type while `scoring.ts` still passes a function — and both the phase framing and Task 2 Step 5 say so explicitly so the executor does not misread it as a defect and revert. Task 4 adds no risk: it either makes a one-line re-export addition and re-typechecks, or makes no edit at all.
- **Phase 3** touches one spec file and no production code, so it cannot leave the tree inconsistent. It ends with that file green (Task 5 Step 5), including DLR-68's antisymmetry suite, which this contract does not edit.
- **Phase 4** makes no production change. Every task is a grep, a gate, a measurement, or the PR description.
