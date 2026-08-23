# Tasks: Pending poison on the felt — at-risk hearts for a booked Envenom hit

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-23

> **Gate note.** `plan.md` and `mockup.html` were NOT developer-confirmed. This contract was produced inside the unattended sprint run of 2026-08-23, which overrides the plan-approval gate (defaults taken as pre-approved) and skips the mockup gate unseen. Every default taken is logged in `.claude/sprint-runs/2026-08-23-sprint/log.md` for batch review.

**Goal:** Make a booked Envenom hit visible on the felt — a fifth `doomed` heart state fed by `encounter.pendingEnvenom` on both bars, accessible text that names the poisoned figure separately from the at-risk one, and a trick reveal that says who owes the hit and how much — with no engine change.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder.

---

## File map

**Created:**
- `src/app/warCouncil/roundBars.ts` — `barsForRound(ui, maxHealth)`, the round screen's bar assembly, split out of `WarCouncilRound.tsx` (399/400 lines)
- `src/app/warCouncil/__tests__/roundBars.test.ts` — assembly tests against committed reducer state

**Modified:**
- `src/hunt/encounter.ts:120-123` — export `envenomDamageFor`
- `src/hunt/index.ts:76-83` — add `envenomDamageFor` to the `./encounter` export block
- `src/app/warCouncil/duelHealthBars.ts` — fifth `HeartState`, `HealthBarOverlays`, `doomed` on `HealthBarView`, `projectedFromStreak` → `projectedDepletion`
- `src/app/warCouncil/WarCouncilRound.tsx:27,138-158` — call `barsForRound`; drop the `duelHealthBars` / `projectedFromStreak` / `NO_BREAKING` imports
- `src/app/warCouncil/labels.ts:112-122` — `healthBarValueText` separates the clauses; new `poisonBookedText`
- `src/app/warCouncil/TrickWell.tsx:82-88` — the reveal's poison clause
- `src/app/warCouncil/warCouncil.css:52-61` — two new `--wc-hp-doomed-*` tokens
- `src/app/warCouncil/warCouncilHealthBars.css` — `[data-state='doomed']` selector
- `src/app/warCouncil/__tests__/duelHealthBars.test.ts` — rename + new coverage
- `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` — rename + overlays object + `doomed` render
- `src/app/warCouncil/__tests__/labels.test.ts` — `healthBarValueText` clauses + `poisonBookedText`
- `src/app/warCouncil/__tests__/TrickWell.test.tsx` — the reveal clause

**Deleted:** (none)

**Developer decides or observes:**
- `--wc-hp-doomed-opacity: 0.78` — a placeholder, chosen only to sit clearly above `--wc-hp-atrisk-opacity: 0.55` and below solid. **Not a considered value.**
- Whether `--wc-poison` green reads adequately as a heart against `--wc-felt: #16241f`, and whether five heart states still separate at a glance on the Quarry's 14–18 glyph row with both a live streak and a booked hit on screen. This is the ticket's named open design question; the plan's default is a distinct state.
- All new copy: `Poison set — they take 4 at the next trick.` / `Poison set — you take 2 at the next trick.` / ` N poisoned.` — placeholder, as every other string in `labels.ts` and `TrickWell.tsx` is.
- Whether the transient reveal clause is enough, or whether a player who taps through fast will miss it. Only judgeable by playing.

---

## Phase 1 — The derivation

The pure core of the fix: the projection learns about poison, the heart row grows a fifth band, and the two same-typed damage-record arguments collapse into one options object. The phase ends with `duelHealthBars.ts` and its spec self-consistent and every reader updated in the same pass, so the boundary type-checks with no half-applied rename.

### Task 1: Teach `duelHealthBars.ts` about committed poison ✓
- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/duelHealthBars.ts`
- Test: `src/app/warCouncil/__tests__/duelHealthBars.test.ts`

- [x] **Step 1: Add the failing tests for the new projection, the fifth state, and the clamp**

Append to `src/app/warCouncil/__tests__/duelHealthBars.test.ts`, and rename the existing `describe('projectedFromStreak — AC3's preview, over state that already exists')` block to `describe('projectedDepletion — AC3's preview plus DLR-101's booked poison')`, updating all six of its `projectedFromStreak(...)` calls to `projectedDepletion(...)` with `NO_PENDING_ENVENOM` as the new fourth argument. Update the import on line 3 to `projectedDepletion` and add `NO_PENDING_ENVENOM` from `../../../hunt`. Update the `duelHealthBars(health, health, MAX, { ...NO_BREAKING, [side]: breaking })` helper on line 16 to pass `{ breaking: { ...NO_BREAKING, [side]: breaking } }`.

```ts
describe('DLR-101 — booked poison on the projection and the row', () => {
  it('subtracts the Quarry’s booked poison as well as the streak', () => {
    const projected = projectedDepletion(full, 2, 2, {
      [DuelSide.Player]: 0,
      [DuelSide.Quarry]: ENVENOM_QUARRY_DAMAGE,
    })
    expect(projected[DuelSide.Quarry]).toBe(quarryMax - 4 - ENVENOM_QUARRY_DAMAGE)
  })

  it('subtracts the player’s booked poison, which the streak never touches', () => {
    const projected = projectedDepletion(full, 3, 3, {
      [DuelSide.Player]: ENVENOM_PLAYER_DAMAGE,
      [DuelSide.Quarry]: 0,
    })
    expect(projected[DuelSide.Player]).toBe(PLAYER_START_HEALTH - ENVENOM_PLAYER_DAMAGE)
  })

  it('floors both sides at zero, so `projected <= current` still holds', () => {
    const projected = projectedDepletion(full, 99, 99, {
      [DuelSide.Player]: 999,
      [DuelSide.Quarry]: 999,
    })
    expect(projected[DuelSide.Player]).toBe(0)
    expect(projected[DuelSide.Quarry]).toBe(0)
  })

  it('marks the innermost standing hearts `doomed`, with at-risk outside them', () => {
    const current = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 }
    const projected = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 3 }
    const [, quarry] = duelHealthBars(current, projected, MAX, {
      doomed: { [DuelSide.Player]: 0, [DuelSide.Quarry]: 4 },
    })
    expect(quarry.doomed).toBe(4)
    expect(quarry.pending).toBe(7)
    expect(quarry.hearts.slice(0, 3)).toEqual([
      HeartState.Whole,
      HeartState.Whole,
      HeartState.Whole,
    ])
    expect(quarry.hearts.slice(3, 6)).toEqual([
      HeartState.AtRisk,
      HeartState.AtRisk,
      HeartState.AtRisk,
    ])
    expect(quarry.hearts.slice(6, 10)).toEqual([
      HeartState.Doomed,
      HeartState.Doomed,
      HeartState.Doomed,
      HeartState.Doomed,
    ])
  })

  it('clamps `doomed` to the pending band, so overkill leaves no trace', () => {
    const current = { [DuelSide.Player]: 2, [DuelSide.Quarry]: 10 }
    const projected = { [DuelSide.Player]: 0, [DuelSide.Quarry]: 10 }
    const [player] = duelHealthBars(current, projected, MAX, {
      doomed: { [DuelSide.Player]: 99, [DuelSide.Quarry]: 0 },
    })
    expect(player.doomed).toBe(2)
    expect(player.hearts.filter((s) => s === HeartState.Doomed)).toHaveLength(2)
    expect(player.lethal).toBe(true)
  })

  it('is byte-identical to the pre-DLR-101 row when nothing is booked', () => {
    const current = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 }
    const projected = { [DuelSide.Player]: 10, [DuelSide.Quarry]: 7 }
    const [, withOverlay] = duelHealthBars(current, projected, MAX, {})
    const [, withNone] = duelHealthBars(current, projected, MAX)
    expect(withOverlay.hearts).toEqual(withNone.hearts)
    expect(withNone.doomed).toBe(0)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: non-zero exit. The failure is a transform/collection error naming `projectedDepletion` and `HeartState.Doomed` as missing exports — not an assertion failure.

- [x] **Step 3: Add the fifth `HeartState`, `HealthBarOverlays`, and `doomed` on the view**

In `src/app/warCouncil/duelHealthBars.ts`, add `Doomed: 'doomed',` to the `HeartState` map between `AtRisk` and `Breaking`, extending the existing docblock's string-binding warning to cover it. Add the `doomed` field to `HealthBarView` and the new `HealthBarOverlays` interface, exactly as `plan.md` Part 2 → Data shapes gives them. Import `NO_PENDING_ENVENOM` alongside the existing `DuelSide` import from `'../../hunt'`.

```ts
/** The two damage records a bar can overlay, keyed by the side each depletes.
 *
 *  An OPTIONS OBJECT rather than two positional arguments, for the reason `bank.ts`'s `TrickFacts`
 *  gives: both are `Readonly<Record<DuelSide, Damage>>`, so a transposed pair type-checks cleanly
 *  and produces a plausible but wrong picture. Naming them makes that a compile error.
 */
export interface HealthBarOverlays {
  /** The damage of the event currently on screen — the `breaking` hearts (DLR-86 AC2). */
  readonly breaking?: Readonly<Record<DuelSide, Damage>>
  /** DLR-101 — poison already booked against each side, i.e. `encounter.pendingEnvenom` passed
   *  through unchanged. COMMITTED, unlike the streak preview: it lands at the resolution of the
   *  next trick and nothing on the felt stops it, which is why it gets its own heart state
   *  rather than reusing `atRisk`. */
  readonly doomed?: Readonly<Record<DuelSide, Damage>>
}
```

- [x] **Step 4: Rename `projectedFromStreak` to `projectedDepletion` and subtract poison**

Replace the whole function. The `Math.max(0, …)` floor now applies to both sides and remains the upholder of `duelHealthBars`'s `projected <= current` precondition rather than a second damage clamp.

```ts
/**
 * AC3's streak preview, plus DLR-101's booked poison — the two things that will deplete a bar
 * without another card being played.
 *
 * RENAMED from `projectedFromStreak` on DLR-101. The old name described half of what this now
 * does, and a second sibling projection function is exactly the drift this module's single-
 * statement discipline exists to prevent.
 *
 * The `Math.max(0, …)` floor is NOT a second damage clamp: `applyDamage` remains DLR-70's single
 * clamp point and this function never feeds it. The floor exists solely to uphold
 * `duelHealthBars`'s documented `projected <= current` precondition, which a negative projection
 * would violate and turn into a negative `pending`. It now covers BOTH sides, because poison is
 * booked symmetrically while the streak only ever depletes the Quarry.
 *
 * Surplus is discarded by the heart row's own length rather than here, which is what keeps AC5's
 * "overkill leaves no trace" a single rule rather than two that can drift.
 */
export function projectedDepletion(
  current: Readonly<Record<DuelSide, Health>>,
  bank: number,
  multiplier: number,
  pendingPoison: Readonly<Record<DuelSide, Damage>>,
): Readonly<Record<DuelSide, Health>> {
  return {
    [DuelSide.Player]: Math.max(0, current[DuelSide.Player] - pendingPoison[DuelSide.Player]),
    [DuelSide.Quarry]: Math.max(
      0,
      current[DuelSide.Quarry] - bank * multiplier - pendingPoison[DuelSide.Quarry],
    ),
  }
}
```

- [x] **Step 5: Take the overlays object and derive the `doomed` band**

Change `duelHealthBars`'s fourth parameter and its body. Update the docblock paragraph that currently describes `breaking` as the fourth argument, and the PRECONDITION paragraph's list of projection sources so it names `projectedDepletion`.

```ts
export function duelHealthBars(
  current: Readonly<Record<DuelSide, Health>>,
  projected: Readonly<Record<DuelSide, Health>>,
  max: Readonly<Record<DuelSide, Health>>,
  overlays: HealthBarOverlays = {},
): readonly HealthBarView[] {
  const breaking = overlays.breaking ?? NO_BREAKING
  const doomedBySide = overlays.doomed ?? NO_PENDING_ENVENOM

  return BAR_ORDER.map((side) => {
    const sideMax = max[side]
    if (!Number.isInteger(sideMax) || sideMax <= 0) {
      throw new RangeError(
        `Cannot draw the ${side}'s heart row against a maximum of ${sideMax}: it must be a positive integer, because it is the number of hearts`,
      )
    }

    const secure = projected[side]
    const pending = current[side] - secure
    const broke = breaking[side]
    // The ONE clamp on booked poison, and the only arithmetic this function performs on it.
    // `pending` is non-negative by the upheld precondition, so `doomed` is too.
    const doomed = Math.min(doomedBySide[side], pending)
    // The innermost standing heart the streak's conditional preview reaches. Below it the band is
    // committed: poison lands at the next trick and nothing on the felt stops it.
    const atRiskEnd = current[side] - doomed

    return {
      side,
      secure,
      pending,
      doomed,
      current: current[side],
      max: sideMax,
      lethal: pending > 0 && secure <= 0,
      hearts: Array.from({ length: sideMax }, (_, i) => {
        if (i < secure) return HeartState.Whole
        if (i < atRiskEnd) return HeartState.AtRisk
        if (i < current[side]) return HeartState.Doomed
        if (i < current[side] + broke) return HeartState.Breaking
        return HeartState.Broken
      }),
    }
  })
}
```

- [x] **Step 6: Run the spec green and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed for that file. `npm run typecheck` still reports errors at this point — `WarCouncilRound.tsx` and `DuelHealthBars.test.tsx` have not been updated yet; they are Task 2 and Task 4. Record which errors remain and confirm every one names one of those two files.

**Result:** `duelHealthBars.test.ts` — 0 failed (the vitest filter also matched `DuelHealthBars.test.tsx` on Windows' case-insensitive filesystem; its 2 failures are the expected Task-4 gap). Typecheck errors: `WarCouncilRound.tsx` (2, expected) and `DuelHealthBars.test.tsx` (part of the above). **One extra file also errors: `labels.test.ts` (4 errors)** — its `base: HealthBarView` test fixture at line 127 is hand-written rather than built via `duelHealthBars()`, so the plan's "every construction site is inside `duelHealthBars` itself" audit (Part 1 → Config and persisted-shape audit) missed this fixture. `labels.test.ts` is already a Task 4 Test target and Task 4's own steps add `doomed`-aware cases to it, so this is not a new task — it is a planner-accuracy note for Task 4/self-review, flagged rather than fixed here since `labels.test.ts` is outside Task 1's `**Files:**` block.

---

## Phase 2 — The round screen

The assembly moves out of the over-budget component into a pure module, and the component is reduced to a single call. The phase ends with `npm run typecheck` fully clean and `WarCouncilRound.tsx` back under its line budget.

### Task 2: Split the bar assembly into `roundBars.ts` ✓
- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/roundBars.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:27,138-158`
- Test: `src/app/warCouncil/__tests__/roundBars.test.ts`

- [x] **Step 1: Write `roundBars.ts`**

A PURE MOVE of the existing assembly plus the poison wiring. Every docblock that came off `WarCouncilRound.tsx` comes with it.

```ts
/**
 * The round screen's two health bars, assembled from committed reducer state.
 *
 * Split out of `WarCouncilRound.tsx` on DLR-101, the moment the poison wiring pushed it past its
 * 400-line budget — the same forced split that produced `quarryAdvance.ts` (DLR-94),
 * `commitHandlers.ts` and `discardHandlers.ts` (DLR-100). It is also the split that makes this
 * derivation directly testable: as a block inside a component it could only be exercised through
 * a renderer.
 */
import { DuelSide, incomingFrom } from '../../warCouncil'
import type { Health } from '../../hunt'
import { duelHealthBars, NO_BREAKING, projectedDepletion, type HealthBarView } from './duelHealthBars'
import type { RoundUiState } from './roundUiState'

/**
 * Three derivations, no new state:
 *
 *  · the AT-RISK preview (DLR-86 AC3) is the streak over `bank` and `multiplier`, which the engine
 *    already writes on every trick — it resets itself when they reset (AC5), because it is a view
 *    of them rather than a copy.
 *  · the DOOMED hearts (DLR-101) are `encounter.pendingEnvenom`, which the engine books when a
 *    marked trick resolves and clears when it pays. Read rather than remembered, for the same
 *    reason: a copy would need an effect, and an effect would need to survive StrictMode.
 *  · the BREAKING hearts (DLR-86 AC2) are the damage of the trick currently held on screen.
 *    `roundReducer` never applies damage without setting `resolvedTrick` in the same transition,
 *    so the held reveal IS the damage event. Reading it rather than diffing a remembered previous
 *    health keeps this a pure function of committed state and ties the crack to the cards that
 *    caused it.
 *
 * DLR-86 AC4 needs no code: a cash-out zeroes bank and multiplier and sets `resolvedTrick` in ONE
 * transition, so the same hearts at the same indices go atRisk -> breaking in one render.
 */
export function barsForRound(
  ui: RoundUiState,
  maxHealth: Readonly<Record<DuelSide, Health>>,
): readonly HealthBarView[] {
  const pendingPoison = ui.encounter.pendingEnvenom
  return duelHealthBars(
    ui.encounter.health,
    projectedDepletion(ui.encounter.health, ui.round.bank, ui.round.multiplier, pendingPoison),
    maxHealth,
    {
      breaking: ui.resolvedTrick ? incomingFrom(ui.resolvedTrick.resolution) : NO_BREAKING,
      doomed: pendingPoison,
    },
  )
}
```

If `DuelSide` is not re-exported from `'../../warCouncil'`, import it from `'../../hunt'` alongside `Health` — check the barrel before writing the import line rather than assuming either.

- [x] **Step 2: Reduce the call site in `WarCouncilRound.tsx`**

Replace the whole `const bars = duelHealthBars(…)` block **and its preceding comment block** (lines 138-158) with:

```tsx
  // DLR-101 — the whole assembly, including the booked-poison band, lives in `roundBars.ts`.
  const bars = barsForRound(ui, maxHealth)
```

Then replace the line-27 import `import { duelHealthBars, NO_BREAKING, projectedFromStreak } from './duelHealthBars'` with `import { barsForRound } from './roundBars'`, keeping the import block alphabetically ordered as it already is. Remove `incomingFrom` from the `'../../warCouncil'` import **only if no other line in the file uses it** — grep before deleting.

- [x] **Step 3: Write the assembly spec**

Create `src/app/warCouncil/__tests__/roundBars.test.ts`. Build a `RoundUiState` with `createRoundUiState` (the same helper `WarCouncilRound.tsx` seeds its reducer with) and assert three cases: no poison booked reproduces the pre-DLR-101 row; poison booked against the Quarry produces `doomed > 0` on the Quarry view and `0` on the player view; poison booked against the player produces the mirror. Query the returned views by `side` rather than by array index, so a reordering of `BAR_ORDER` cannot make a wrong assertion pass.

- [x] **Step 4: Run both specs and the full typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/roundBars.test.ts src/app/warCouncil/__tests__/duelHealthBars.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed. `npm run typecheck` exits 0 apart from errors in `DuelHealthBars.test.tsx`, which Task 4 fixes.

**Result:** Vitest — `roundBars.test.ts` and `duelHealthBars.test.ts` both 0 failed (`Test Files 1 failed | 2 passed (3)`, `Tests 2 failed | 35 passed (37)` — the 1 failed file and 2 failed tests are `DuelHealthBars.test.tsx`, matched incidentally by the glob on this case-insensitive filesystem, and are the pre-existing Task-4 gap, not this task's). `npm run typecheck` exits with 4 errors, **all in `labels.test.ts`**, not `DuelHealthBars.test.tsx` — this is the exact gap Task 1's own Result section already flagged (its hand-written `HealthBarView` fixture at line ~127 lacks `doomed`) and is Task 4's to fix, not this task's. **Environment note, not a defect:** on this Windows case-insensitive filesystem, `tsc -b`'s file discovery silently drops `DuelHealthBars.test.tsx` from compilation entirely (`--listFiles` confirms it never appears, while `duelHealthBars.test.ts` and `WarCouncilRound.duelHealthBars.test.tsx` both do) — so its stale `projectedFromStreak` call is invisible to `tsc` here even though it still fails at runtime under Vitest. Worth Task 4 knowing this before treating a clean typecheck as proof that file is fixed. No error in `WarCouncilRound.tsx` or `roundBars.ts` — the boundary this task owns is clean.

- [x] **Step 5: Confirm `WarCouncilRound.tsx` is back inside its budget**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count; (Get-Content src\app\warCouncil\roundBars.ts).Count; (Get-Content src\app\warCouncil\duelHealthBars.ts).Count`
Expected: every count is below 400. `WarCouncilRound.tsx` should be around 380. Use `(Get-Content <path>).Count`, **not** `Measure-Object -Line`, which drops blank lines and has hidden a real breach before (`.claude/workflow/web-project.md`).

**Result:** `WarCouncilRound.tsx` = 380, `roundBars.ts` = 52, `duelHealthBars.ts` = 179. All well under 400.

---

## Phase 3 — What the player sees

The rendered heart, the meter's spoken text, and the reveal's clause. Each is a separate module with its own copy owner, so each is its own task. The phase ends with every surface this ticket names rendering the booked hit.

### Task 3: Style the `doomed` heart ✓
- Skill: `game-ux`

**Files:**
- Modify: `src/app/warCouncil/warCouncilHealthBars.css`
- Config: `src/app/warCouncil/warCouncil.css` — add `--wc-hp-doomed-fill` and `--wc-hp-doomed-opacity` to the existing `:root` block beside the other `--wc-hp-*` tokens (lines 52-61)

- [x] **Step 1: Add the two tokens to `warCouncil.css`**

Insert after `--wc-hp-atrisk-opacity: 0.55;`. Nothing here redeclares `:root` in a second sheet.

```css
  /* DLR-101 — the committed-poison heart. An ALIAS of the poison mark's own colour rather than a
     new colour value: it ties the heart to the marker that caused it, and it means no tuning
     number was invented for it. The opacity is a PLACEHOLDER, picked only to sit clearly above
     --wc-hp-atrisk-opacity and clearly below solid — the developer owns the value. */
  --wc-hp-doomed-fill: var(--wc-poison);
  --wc-hp-doomed-opacity: 0.78;
```

- [x] **Step 2: Add the selector to `warCouncilHealthBars.css`**

Insert between the `[data-state='atRisk']` and `[data-state='breaking']` blocks, mirroring the row order. Extend that section's existing comment from "four resting states" to "five".

```css
/* DLR-101 — committed poison. STATIC, deliberately: `atRisk` flashes because it is conditional
   and evaporates if the streak is broken, while a booked hit lands at the next trick and nothing
   on the felt stops it. A flashing committed heart would say the wrong thing about certainty —
   and because it is static it needs no entry in the reduced-motion block below, and loses
   nothing when motion is off. Shape still carries the reading before colour does: a doomed heart
   binds to the same solid <symbol> as a whole one, so it reads as STANDING, which it is. */
.wc-hp-heart[data-state='doomed'] {
  color: var(--wc-hp-doomed-fill);
  opacity: var(--wc-hp-doomed-opacity);
}
```

- [x] **Step 3: Confirm the string binding is complete**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "doomed"`
Expected: hits in exactly four files — `duelHealthBars.ts` (the map value and the field), `warCouncil.css` (the two tokens), `warCouncilHealthBars.css` (the selector), and `roundBars.ts`/the specs. Confirm the literal string `'doomed'` itself appears in only `duelHealthBars.ts` and `warCouncilHealthBars.css`, which is the two-places rule that map's docblock states.

### Task 4: Separate the meter's committed clause from its conditional one ✓
- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/labels.ts:112-122`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`
- Test: `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`

- [x] **Step 1: Add the failing tests**

In `src/app/warCouncil/__tests__/labels.test.ts`, add assertions that `healthBarValueText` on a view with `pending: 7, doomed: 4` reads `… 3 at risk. 4 poisoned.`; that a view with `doomed: 0` is byte-identical to the pre-DLR-101 string; and that a view with `pending === doomed` omits the at-risk clause entirely. If that spec file does not exist, create it, importing `healthBarValueText` from `../labels` and building views with `duelHealthBars` rather than hand-writing a `HealthBarView` literal.

In `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`, update the line-5 import to `projectedDepletion`, the line-31 `duelHealthBars(current, projected, MAX, breaking)` call to pass `{ breaking }`, and the line-105 `projectedFromStreak(current, 2, 2)` call to `projectedDepletion(current, 2, 2, NO_PENDING_ENVENOM)`. Add a test that renders a pair with `{ doomed: { [DuelSide.Player]: 0, [DuelSide.Quarry]: 4 } }` and asserts four `[data-state='doomed']` elements in the Quarry's row and that `getByRole('meter', { name: … })`'s `aria-valuetext` contains `poisoned`.

- [x] **Step 2: Run both specs and confirm they fail on the assertion, not on a missing import** (deferred to phase-end block)

- [x] **Step 3: Split the clauses in `healthBarValueText`**

```ts
/**
 * DLR-86 AC6's one sentence, for a reader who cannot see the row.
 *
 * The current-of-max reading is byte-identical to DLR-80's whenever `pending` is 0, and the
 * at-risk clause is byte-identical to DLR-86's whenever `doomed` is 0 — which is every shape the
 * earlier assertions pin.
 *
 * DLR-101 splits the two clauses because they are two different claims. "At risk" is conditional
 * and evaporates if the streak breaks; "poisoned" is committed and lands at the next trick. A
 * meter that calls a booked hit "at risk" is less true than its own picture, which this file's
 * own standard says is worse than having no picture at all. Placeholder copy: the wording is the
 * developer's.
 */
export function healthBarValueText(view: HealthBarView): string {
  const standing = `${view.current} of ${view.max}.`
  const atRiskOnly = view.pending - view.doomed
  const atRisk = atRiskOnly > 0 ? ` ${atRiskOnly} at risk.` : ''
  const poisoned = view.doomed > 0 ? ` ${view.doomed} poisoned.` : ''
  const body = `${standing}${atRisk}${poisoned}`
  return view.lethal ? `${body} Lethal.` : body
}
```

- [x] **Step 4: Run both specs green** (deferred to phase-end block)

### Task 5: Name the booked hit in the trick reveal ✓
- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/encounter.ts:120-123` — export `envenomDamageFor`
- Modify: `src/hunt/index.ts:76-83` — add it to the `./encounter` export block
- Modify: `src/app/warCouncil/labels.ts` — add `poisonBookedText`
- Modify: `src/app/warCouncil/TrickWell.tsx:82-88`
- Modify: `src/app/warCouncil/warCouncilTable.css` — `.wc-poison-clause` rule (ORCHESTRATOR CORRECTION 1: moved here from `warCouncilHealthBars.css`, beside `.wc-table-line`)
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx`

- [x] **Step 1: Add the failing test**

In `src/app/warCouncil/__tests__/TrickWell.test.tsx`, add two tests: a resolved trick whose `resolution.envenomTarget` is `DuelSide.Quarry` renders text containing `they take 4 at the next trick`, and one whose `envenomTarget` is `null` renders no `Poison set` text at all. Query by text through the rendered `<p className="wc-table-line">` using `getByText` with a matcher function, not by class. If that spec file does not exist, create it following `DuelHealthBars.test.tsx`'s shape.

- [x] **Step 2: Export `envenomDamageFor`**

In `src/hunt/encounter.ts`, change `function envenomDamageFor(` to `export function envenomDamageFor(` and extend its docblock with one sentence: DLR-101 promoted it because the copy layer needs the figure and a caller that chose between the two constants itself is a caller that can choose the wrong one — the same reason the function exists at all. Add `envenomDamageFor` to the `./encounter` export block in `src/hunt/index.ts`.

- [x] **Step 3: Add `poisonBookedText` to `labels.ts`**

Place it beside the other Envenom copy (after `ENVENOM_ARMED_HINT`). It reads the figure from the engine rather than restating either constant.

```ts
/** DLR-101 — the reveal's clause for a hit this trick just BOOKED, as distinct from one it paid.
 *  Names the side and the amount, which the Apply Damage refusal (the only prior trace of a
 *  booked hit anywhere in the UI) named neither of. The figure comes from `envenomDamageFor`,
 *  its single owner, so this copy cannot pick the wrong constant. PLACEHOLDER copy, as this
 *  file's rest is. */
export function poisonBookedText(target: DuelSide): string {
  const amount = envenomDamageFor(target)
  return target === DuelSide.Player
    ? `Poison set — you take ${amount} at the next trick.`
    : `Poison set — they take ${amount} at the next trick.`
}
```

Add `envenomDamageFor` to the existing `'../../hunt'` import in `labels.ts`, which already imports `DuelSide`.

- [x] **Step 4: Render the clause in `TrickWell.tsx`**

Extend the resolved-trick `<p className="wc-table-line">`. The clause is wrapped so the stylesheet can tint it; add a `.wc-poison-clause { color: var(--wc-poison); }` rule to `warCouncilHealthBars.css` only if no existing sheet already carries an equivalent — grep for `wc-poison-clause` first and reuse rather than duplicating.

```tsx
        <p className="wc-table-line">
          {winnerLabel} take the trick.
          {resolvedTrick.resolution.cashOut > 0 && ` They take ${resolvedTrick.resolution.cashOut}.`}
          {resolvedTrick.resolution.damageToPlayer > 0 &&
            ` You take ${resolvedTrick.resolution.damageToPlayer}.`}
          {resolvedTrick.resolution.envenomTarget !== null && (
            <span className="wc-poison-clause">
              {' '}
              {poisonBookedText(resolvedTrick.resolution.envenomTarget)}
            </span>
          )}
        </p>
```

- [x] **Step 5: Run the spec green and typecheck** (deferred to phase-end block)

**Phase 3 verification block (Tasks 3-5, batched):**
- `npm run typecheck` — exit 0, no errors anywhere.
- `npm run lint` — exit 0, clean.
- `npx vitest run src/app/warCouncil/__tests__/labels.test.ts src/app/warCouncil/__tests__/TrickWell.test.tsx src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` — `Test Files 3 passed (3)`, `Tests 54 passed (54)`. `DuelHealthBars.test.tsx` run explicitly by its exact path per correction 3, since Windows' case-insensitive filesystem makes a glob match it incidentally against `duelHealthBars.test.ts` — confirmed both spec files pass independently in this same run.
- `npx prettier --check` on every file this phase touched — clean after one `--write` pass fixed spacing/wrapping in `TrickWell.tsx`, `src/hunt/index.ts`, and `DuelHealthBars.test.tsx` (added-line wrapping only, no logic change).
- Grep `projectedFromStreak` across `src` — one hit, inside `duelHealthBars.ts`'s own docblock recording the rename's history (expected, re-checked structurally in Task 7).
- File sizes after this phase: `labels.ts` 290, `TrickWell.tsx` 143, `warCouncilHealthBars.css` 183, `warCouncilTable.css` 180, `warCouncil.css` 274, `encounter.ts` 193 — all well under 400.

---

## Phase 4 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, that the engine was genuinely not touched, and that no file crossed its budget.

### Task 6: Confirm the pure-core boundary still holds ✓
- Skill: `none — a verification grep, no code written`

**Files:**
- (no file changes)

- [x] **Step 1: Grep the pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `src/hunt/**` and `src/warCouncil/**` are the trees the `eslint.config.js` override protects, and this contract adds one export to the first of them.

- [x] **Step 2: Confirm the engine is genuinely untouched apart from that one export**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git diff --stat -- src/hunt src/warCouncil`
Expected: exactly two files — `src/hunt/encounter.ts` and `src/hunt/index.ts` — and only a handful of lines in each. Any change to `src/warCouncil/**` is out of scope and must be reverted.

### Task 7: Confirm no stale name and no hard-coded poison figure ✓
- Skill: `none — verification greps, no code written`

**Files:**
- (no file changes)

- [x] **Step 1: Confirm the rename left nothing behind**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "projectedFromStreak"`
Expected: zero hits.

- [x] **Step 2: Confirm neither poison figure was inlined**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "take 4 |take 2 |= 4$|= 2$"`
Expected: no hit that writes either poison damage figure as a literal in copy or logic. `4` and `2` must reach the felt only through `envenomDamageFor`. Incidental unrelated hits (array indices, test fixtures asserting an engine constant) are fine — read each one rather than counting.

- [x] **Step 3: Confirm no file crossed 400 lines**

Run: `Get-ChildItem src\app\warCouncil,src\hunt -Recurse -Include *.ts,*.tsx | ForEach-Object { [pscustomobject]@{ n = $_.Name; c = (Get-Content $_.FullName).Count } } | Where-Object { $_.c -gt 400 }`
Expected: no rows. `(Get-Content).Count`, not `Measure-Object -Line`.

### Task 8: Static gates and full suite ✓
- Skill: `none — verification runs, no code written`

**Files:**
- (no file changes)

- [x] **Step 1: Warm the Vitest cache, then run the gates and the unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two warm-up project runs are per `.claude/workflow/web-project.md` — a single cold `npm test` can report a `[vitest-pool-runner]` worker-start timeout, which is infrastructure and must never be reported as a test failure. `roundReducer.poison.test.ts` must still report 8/8: this contract changes no engine behaviour.

- [x] **Step 2: Confirm formatting of the files this contract changed**

Run: `npx prettier --check src/app/warCouncil/duelHealthBars.ts src/app/warCouncil/roundBars.ts src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/labels.ts src/app/warCouncil/TrickWell.tsx src/app/warCouncil/warCouncil.css src/app/warCouncil/warCouncilHealthBars.css src/hunt/encounter.ts src/hunt/index.ts`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files this contract has not touched, and fixing that is not this contract's job.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 9: Update the PR description ✓
- Skill: `none — a document, no code written`

**Files:**
- Create: `.claude/contract/DLR-101-pending-poison-on-the-felt/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` in this folder; a summary of the change; the fact that the ticket's named open design question (own state versus reusing `atRisk`) was decided in favour of a distinct `doomed` state under the sprint run's gate override, and how to revert it if the developer disagrees; every developer decision from the File map's "Developer decides or observes" block; the verification numbers from Task 8; and a one-line note that `HealthBarOverlays` is the new convention for passing a same-typed damage record to `duelHealthBars`.

---

## Self-review

**Spec coverage:**
- Fifth `HeartState` value `doomed` — Task 1 (Step 3), Task 3.
- Projection subtracts pending poison on both sides — Task 1 (Steps 1, 4).
- `doomed` overlay clamped against the pending band; `doomed` on `HealthBarView` — Task 1 (Steps 1, 3, 5).
- `HealthBarOverlays` options object replacing the transposable positional pair — Task 1 (Steps 3, 5), Task 4 (Step 1, the `DuelHealthBars.test.tsx` call-site update).
- New pure module `roundBars.ts` keeping `WarCouncilRound.tsx` under budget — Task 2 (all steps), verified in Task 2 Step 5 and Task 7 Step 3.
- CSS for `[data-state='doomed']` including reduced-motion behaviour — Task 3 (Steps 1, 2); the state is static, so the reduced-motion block needs no entry and Step 2's comment records why.
- `healthBarValueText` naming the poisoned figure separately — Task 4 (Steps 1, 3).
- Trick reveal naming the booked hit and its target — Task 5 (Steps 1, 3, 4).
- `envenomDamageFor` exported from `src/hunt` — Task 5 (Step 2), boundary re-checked in Task 6.
- Unit tests for projection, heart derivation, accessible text; component tests for rendered `doomed` hearts and the reveal — Tasks 1, 2, 4, 5.
- No engine change — asserted structurally in Task 6 Step 2 and behaviourally in Task 8 Step 1 (`roundReducer.poison.test.ts` 8/8).

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest` or `npm run dev`; no step hand-edits `package-lock.json`; no step invents a tuning value — the one new number (`--wc-hp-doomed-opacity: 0.78`) is written as an explicit placeholder and routed to "Developer decides or observes".

**Type / name consistency:** `projectedDepletion`, `HealthBarOverlays`, `HeartState.Doomed` / `'doomed'`, `HealthBarView.doomed`, `barsForRound`, `poisonBookedText`, and `envenomDamageFor` are spelled identically in `plan.md` Part 2 → Data shapes and in every task that uses them. `NO_BREAKING` keeps its name and meaning; `NO_PENDING_ENVENOM` is imported from `src/hunt` rather than a second local constant being declared. The two CSS custom properties are `--wc-hp-doomed-fill` and `--wc-hp-doomed-opacity` in both the token block and the selector.

**Phase boundary cleanliness:**
- **Phase 1** ends with `duelHealthBars.ts` and its own spec self-consistent. `npm run typecheck` is deliberately still red here, and Task 1 Step 6 states the exact two files whose errors are expected and why — a half-applied rename would show up as an error in a third file, which is the check.
- **Phase 2** ends with `npm run typecheck` clean apart from `DuelHealthBars.test.tsx`, no dead imports in `WarCouncilRound.tsx` (Step 2 greps before deleting `incomingFrom`), and no file over budget (Step 5 measures three of them).
- **Phase 3** ends fully green: Task 4 Step 4 and Task 5 Step 5 both require `npm run typecheck` to exit 0 with no errors at all, and every spec touched by the contract runs green.
- **Phase 4** changes no production code — every step is a grep, a gate, a build, or a document.
