# Tasks: Health bar — rendering blue hearts

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **NOT DEVELOPER-CONFIRMED.** This is an unattended sprint run: `plan.md` was auto-approved at its gate and `mockup.html` was produced but never looked at. Every plan default was taken; they are logged in `.claude/sprint-runs/2026-08-23-sprint/log.md`.

Status: COMPLETE
Started: 2026-08-24

**Goal:** Add a second pip *type* — shield pips, drawn from `encounter.shieldHearts` — to the existing multi-state heart row as pip type × pip state rather than a sixth peer state, and fix the inherited `projectedDepletion` defect that makes the ticking-Timebomb preview lie once a shield exists.

**Spec:** `plan.md` in this folder. Layout reference: `mockup.html` in this folder (unreviewed).

---

## File map

**Created:** *(none — no new files)*

**Modified:**
- `src/app/warCouncil/duelHealthBars.ts` — add `PipType`; add `shielded` + `shieldPips` to `HealthBarView`; add `shield` to `HealthBarOverlays`; route `projectedDepletion` through `absorbWithShield`; derive the shield cluster.
- `src/app/warCouncil/roundBars.ts` — pass `ui.encounter.shieldHearts` into both calls.
- `src/app/warCouncil/HeartMark.tsx` — add the `hp-shield` `<symbol>` and `ShieldMark`.
- `src/app/warCouncil/DuelHealthBars.tsx` — render `data-type` on every pip and the shield cluster.
- `src/app/warCouncil/labels.ts:121-128` — extend `healthBarValueText`.
- `src/app/warCouncil/warCouncil.css` — three new `:root` custom properties.
- `src/app/warCouncil/warCouncilHealthBars.css` — `data-type`-qualified selectors and the shield cluster rules.
- `src/app/warCouncil/__tests__/duelHealthBars.test.ts` — update the `projectedDepletion` call sites; add shield derivation specs.
- `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` — add accessible-name specs for the shield.
- `src/app/warCouncil/__tests__/labels.test.ts` — add spoken-form specs (create the block if the file has none for `healthBarValueText`).

**Deleted:** *(none)*

**Developer decides or observes:**
- `--wc-hp-shield-fill` — shipped as `#4f8fc0`. Nobody chose it; never seen against `#cc3f4a`, the ticking amber, or `#3a4a52` on a real row.
- `--wc-hp-shield-ticking-opacity` — shipped as `0.78`, copying `--wc-hp-ticking-opacity`, itself already flagged as the developer's.
- `--wc-hp-shield-gap` — shipped as `0.5rem`. The only thing making the two clusters read as two.
- **The glyph** — shipped as a shield pentagon, not a blue heart. The ticket says "blue hearts"; the hard floor says colour alone is not enough.
- **The cluster's side** — shipped inboard of the red run, past the graveyard. The alternative is the anchored screen edge.
- **The spoken form's worst case** — `"10 of 10. 2 shielded, 1 of them ticking. 3 at risk. 4 ticking."` Judge whether that is a sentence anyone listens to.
- **Whether the player's now-wider bar makes DLR-119's layout risks worse** — only a browser answers this.

---

## Phase 1 — The derivation: pip type, the shield cluster, and the honest preview

Everything in this phase is inside `duelHealthBars.ts` and its spec, plus the one call site in `roundBars.ts`. It type-checks and the suite passes at the end of the phase; nothing renders differently yet because `DuelHealthBars.tsx` has not been told about the new fields. That is the safe boundary.

### Task 1: Add `PipType`, the shield fields, and the shield overlay to `duelHealthBars.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/duelHealthBars.ts`
- Test: `src/app/warCouncil/__tests__/duelHealthBars.test.ts`

- [x] **Step 1: Add the `PipType` map beside `HeartState`**

```ts
/**
 * DLR-115 — the two KINDS of pip a bar can draw. The second of two orthogonal dimensions:
 * `HeartState` above is a pip's STATE, this is its TYPE. `game-ux`'s ruling on this ticket was
 * that blue hearts must NOT become a sixth peer `HeartState` — the row already carries five and
 * has never been seen at 14–18 glyphs with a streak and a booked hit at once, so a sixth flat
 * state is above the point where the row reads at a glance. Type × state caps what can be on
 * screen instead.
 *
 * The VALUES are written straight into the DOM as `data-type`, so they are string-bound exactly
 * as `HeartState`'s are: this map and `warCouncilHealthBars.css`'s attribute selectors are the
 * only two places they may be written.
 */
export const PipType = {
  Health: 'health',
  Shield: 'shield',
} as const
export type PipType = (typeof PipType)[keyof typeof PipType]
```

- [x] **Step 2: Add `shielded` and `shieldPips` to `HealthBarView`**

Append to the interface, with docblocks stating: `shielded` may be fractional under `DAMAGE_ROUNDING = None`; `shieldPips` is `Math.ceil(shielded)` long, ordered from the anchored edge inward, and produces only `HeartState.Whole` and `HeartState.Ticking` — a shield pip has no graveyard, so `Breaking`/`Broken` are unreachable for it.

- [x] **Step 3: Add the `shield` field to `HealthBarOverlays`**

A `Health` scalar, not a `Record<DuelSide, Health>` — `EncounterState.shieldHearts` is a scalar and DLR-110 made shields player-only. Default `NO_SHIELD_HEARTS`, imported from `../../hunt`. Document that a per-side record would invent a Quarry shield nobody designed.

- [x] **Step 4: Typecheck — the two new required `HealthBarView` fields must break exactly one place**

Run: `npm run typecheck`
Expected: errors reported ONLY in `duelHealthBars.ts` (the `BAR_ORDER.map` return does not yet supply the two new fields). If any *other* file errors, a construction site was missed by the plan's audit — report it rather than working around it.

**FOUND: the plan's audit was wrong.** `labels.test.ts:127-158` (`describe('healthBarValueText — the current total against the max (DLR-80)')`) builds a `HealthBarView` object literal by hand (the `base` fixture) and errors here too, contradicting Part 1 → Config and persisted-shape audit's claim that "every test goes through `duelHealthBars()`". Reported rather than worked around — `labels.test.ts` is Task 7's Test file (Phase 2), out of this phase's `**Files:**` union, so it is left unfixed here. See the Implementer Report's Notes.

### Task 2: Route `projectedDepletion` through `absorbWithShield` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/duelHealthBars.ts`
- Test: `src/app/warCouncil/__tests__/duelHealthBars.test.ts`

- [x] **Step 1: Write the two failing specs — the shield absorbs the booked Timebomb, and it does not over-absorb**

Both directions, as the ticket requires. In `duelHealthBars.test.ts`:

```ts
describe('projectedDepletion — the player-side shield (DLR-115)', () => {
  it('spares red health that blue hearts will absorb', () => {
    const projected = projectedDepletion(
      { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
      0,
      1,
      { [DuelSide.Player]: 2, [DuelSide.Quarry]: 0 },
      2,
    )
    expect(projected[DuelSide.Player]).toBe(10)
  })

  it('lets through only the part the shield cannot take', () => {
    const projected = projectedDepletion(
      { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
      0,
      1,
      { [DuelSide.Player]: 3, [DuelSide.Quarry]: 0 },
      1,
    )
    expect(projected[DuelSide.Player]).toBe(8)
  })

  it('is unchanged with no shield', () => {
    const projected = projectedDepletion(
      { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
      0,
      1,
      { [DuelSide.Player]: 3, [DuelSide.Quarry]: 0 },
      NO_SHIELD_HEARTS,
    )
    expect(projected[DuelSide.Player]).toBe(7)
  })

  it('never touches the Quarry, which has no shield', () => {
    const projected = projectedDepletion(
      { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
      2,
      2,
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1 },
      3,
    )
    expect(projected[DuelSide.Quarry]).toBe(5)
  })
})
```

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: FAIL — `projectedDepletion` takes four parameters and ignores the shield.

- [x] **Step 3: Add the required fifth parameter and route the player side through `absorbWithShield`**

```ts
export function projectedDepletion(
  current: Readonly<Record<DuelSide, Health>>,
  bank: number,
  multiplier: number,
  pendingTimebombs: Readonly<Record<DuelSide, Damage>>,
  shieldHearts: Health,
): Readonly<Record<DuelSide, Health>> {
  // DLR-115 — THE fix for the inherited defect DLR-110 named: without this, a booked Timebomb
  // previews red hearts breaking that blue hearts would in fact absorb, so the preview
  // contradicts what `applyDamage` will do. Delegates to `absorbWithShield` rather than
  // restating the absorption order — DLR-110's single statement stays single.
  const { throughToHealth } = absorbWithShield(shieldHearts, pendingTimebombs[DuelSide.Player])
  return {
    [DuelSide.Player]: Math.max(0, current[DuelSide.Player] - throughToHealth),
    [DuelSide.Quarry]: Math.max(
      0,
      current[DuelSide.Quarry] - bank * multiplier - pendingTimebombs[DuelSide.Quarry],
    ),
  }
}
```

REQUIRED, not defaulted: a defaulted `= NO_SHIELD_HEARTS` would let a future caller silently reintroduce the lying preview. Record that reason in the docblock. Update the existing docblock's `Math.max(0, …)` paragraph so it still describes what the function does.

- [x] **Step 4: Update the pre-existing `projectedDepletion` call sites in the spec**

Every existing call in `duelHealthBars.test.ts` gains `NO_SHIELD_HEARTS` as its fifth argument. Do NOT change any existing expectation — an existing assertion that changes value means the fix altered no-shield behaviour, which it must not.

- [x] **Step 5: Re-run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: PASS, with every pre-existing assertion unchanged.

### Task 3: Derive the shield cluster inside `duelHealthBars` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/duelHealthBars.ts`
- Test: `src/app/warCouncil/__tests__/duelHealthBars.test.ts`

- [x] **Step 1: Write the failing specs for the cluster**

Cover: the Quarry always gets `shielded: 0` and `shieldPips: []`; a player shield of 2 with no Timebomb gives two `Whole` pips; a 3-point booked Timebomb against 2 blue hearts gives two `Ticking` shield pips AND leaves 1 red `Ticking` heart; a fractional shield of 1.5 gives two pips (the inner one `Ticking` when 0.5 is claimed); a non-finite or negative `shield` throws a `RangeError`.

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: FAIL.

- [x] **Step 3: Build the cluster inside the `BAR_ORDER.map`**

```ts
const shielded = side === DuelSide.Player ? (overlays.shield ?? NO_SHIELD_HEARTS) : NO_SHIELD_HEARTS
if (!Number.isFinite(shielded) || shielded < 0) {
  throw new RangeError(
    `Cannot draw the ${side}'s blue hearts against ${shielded}: it must be a non-negative finite number, because it is a pip count`,
  )
}
// The SAME call `projectedDepletion` makes, against the same booked figure — one rule, asked
// twice, never restated. `absorbed` is how much of the shield a booked Timebomb has already
// claimed, which is the only shield pip STATE that is live today.
const shieldClaimed = absorbWithShield(shielded, tickingBySide[side]).absorbed
```

and

```ts
shielded,
shieldPips: Array.from({ length: Math.ceil(shielded) }, (_, i) =>
  // Half a pip rounds UP into a whole one, by exactly the `i < value` rule the red row above
  // already uses — one rounding rule for the whole row rather than a second one for blue.
  // The CLAIMED pips are the innermost, because those are the ones spent first.
  i < shielded - shieldClaimed ? HeartState.Whole : HeartState.Ticking,
),
```

The guard is stated for the reason the `max` guard states: `Array.from({ length: NaN })` yields `[]` rather than throwing, so a non-finite shield would render as nothing and log nothing.

- [x] **Step 4: Re-run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts; npm run typecheck`
Expected: spec PASSES; typecheck exits 0 except for `roundBars.ts`'s now-4-argument `projectedDepletion` call, which Task 4 fixes.

Also surfaced the pre-existing `labels.test.ts` audit-miss error noted under Task 1 Step 4 — unaffected by this task, deferred to Task 7.

### Task 4: Feed the shield in from committed state ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundBars.ts`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`

- [x] **Step 1: Pass `ui.encounter.shieldHearts` into both calls**

`projectedDepletion(…, pendingTimebombs, ui.encounter.shieldHearts)` and `{ breaking, ticking, shield: ui.encounter.shieldHearts }`. Extend the module's three-bullet docblock with a fourth bullet: the SHIELD pips are `encounter.shieldHearts`, read rather than remembered for the same reason the other three are, and the player's projection is routed through `absorbWithShield` so the preview cannot contradict `applyDamage`.

- [x] **Step 2: Note the out-of-scope residual in the docblock**

One paragraph, in `barsForRound`: the `breaking` overlay is still the GROSS damage of the event on screen, while `encounter.shieldHearts` is the post-absorption remainder — so when a shield partially absorbs a landed hit, more red pips render `breaking` than red health actually lost. Fixing it exactly needs `ResolvedTrick` to record the absorption; DLR-115's Scope Boundaries put the engine half out of bounds. Unreachable today because nothing calls `activateShield` from the app layer.

- [x] **Step 3: Typecheck and run the round-bars spec**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: typecheck exits 0; both specs pass.

Ran as `npm run typecheck` (only the pre-existing `labels.test.ts` construction-site error remains, out of Phase 1 scope — see Task 1 Step 4) plus two scoped runs to dodge Windows' case-insensitive filename match between `duelHealthBars.test.ts` and `DuelHealthBars.test.tsx`: `npx vitest run --project dom src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx` (3 passed) and `npx vitest run --project node src/app/warCouncil/__tests__/duelHealthBars.test.ts` (35 passed).

---

## Phase 2 — The row: glyph, markup, stylesheet, spoken form

This phase makes the derivation visible. It ends with the full suite green and every new state asserted through an accessible name, which — with no browser pass on this ticket — is the only evidence that will exist.

### Task 5: Add the shield glyph ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/HeartMark.tsx`

- [x] **Step 1: Add `SHIELD_SYMBOL_ID`, the `<symbol>`, and `ShieldMark`**

A shield pentagon, per `mockup.html` (`d="M12 2.6 20 5.4v6.2c0 4.6-3.2 8.2-8 9.8-4.8-1.6-8-5.2-8-9.8V5.4Z"`). Document: a DIFFERENT SILHOUETTE, not a blue heart — `game-ux`'s hard floor is that state reads without colour alone, and a blue heart beside a red heart is a colour swap that vanishes in greyscale and for a colour-blind player. The `d` value and the choice of a shield over a heart are the developer's to judge at rendered size, exactly as `HeartMark`'s own docblock already says of the heart paths. `HeartMark`'s signature is UNCHANGED, so `ShopPanel.tsx` and `App.tsx` are untouched.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 6: Render the cluster, with both dimensions in the DOM ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/DuelHealthBars.tsx`
- Test: `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`

- [x] **Step 1: Write the failing component specs, querying by role and accessible name (AC3)**

```ts
it('names the standing blue hearts in the bar’s accessible value', () => {
  // build a player view via duelHealthBars with { shield: 2 }, render, then:
  expect(screen.getByRole('meter', { name: HEALTH_BAR_LABEL[DuelSide.Player] })).toHaveAttribute(
    'aria-valuetext',
    '10 of 10. 2 shielded.',
  )
})
```

Plus: a shield and a booked Timebomb together read `'10 of 10. 2 shielded, 2 of them ticking.'`; a bar with no shield's accessible value is unchanged from today; the meter's `aria-valuenow`/`aria-valuemax` stay RED-only (a 10/10 player with a shield still reports `10` of `10`, never `12`); and the shield cluster's pips are present alongside the health pips inside the one meter.

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`
Expected: FAIL.

- [x] **Step 3: Render both dimensions in `SideBar`**

Every health pip gains `data-type={PipType.Health}` alongside its existing `data-state`. After the health pips, inside the SAME `role="meter"` element, render the cluster when `view.shieldPips.length > 0`:

```tsx
{view.shieldPips.length > 0 ? (
  <span className="wc-hp-shield-run">
    {view.shieldPips.map((state, index) => (
      <span key={index} className="wc-hp-heart" data-type={PipType.Shield} data-state={state}>
        <ShieldMark />
      </span>
    ))}
  </span>
) : null}
```

Document in `SideBar`'s docblock: the cluster is rendered INSIDE the meter, not beside it, so the bar stays ONE reading with one accessible name — a second meter would make a screen reader announce the shield as a separate bounded value it is not. And it comes AFTER the health pips in DOM order, which under the player's normal flex direction puts it inboard, nearest the centre where damage arrives; the whole row then reads outward-to-inward in depletion order. Still computes nothing.

- [x] **Step 4: Re-run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`
Expected: PASS.

**QA fix pass:** added `'binds a shield pip to its own symbol — a different shape from a health pip, not a colour (AC1)'` to the `DLR-115` describe block — the accessible-name specs above proved the shield is *counted* correctly but never proved its `<use href>` differs from a health pip's `#hp-heart`, which is AC1's actual accessibility guarantee. The new spec queries within the role-resolved meter (matching this file's established pattern) for both pip types' `<use href>` and asserts they differ, so a regression that made `ShieldMark` render the heart symbol would now fail here even though pip counts and `aria-valuetext` would still be correct. `npx vitest run --project dom src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` → 17 passed.

### Task 7: Extend the spoken form ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/labels.ts:121-128`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Write the failing specs for `healthBarValueText`**

Four cases: no shield → today's string, byte for byte; a shield, no Timebomb → `' 2 shielded.'` inserted after the standing clause and before at-risk; a shield partly claimed → `' 2 shielded, 1 of them ticking.'`; the worst case (shield + at-risk + red ticking + lethal) asserted in full, so the sentence's total length is on the record for the developer to judge.

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: FAIL.

- [x] **Step 3: Add the shield clause**

Insert between `standing` and `atRisk`. Derive the claimed count from the view's own `shieldPips` (`shieldPips.filter((s) => s === HeartState.Ticking).length`) rather than recomputing an absorption — the view already carries the answer, and a second derivation here is exactly the drift this module avoids elsewhere. Document the ORDER: standing, shielded, at risk, ticking, lethal — outermost protection to innermost certainty, matching the row's own left-to-right reading. And document why `of them` is there: without it, `'2 shielded, 1 ticking. 3 ticking.'` reads as two unrelated ticking figures.

- [x] **Step 4: Re-run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: PASS.

### Task 8: Style the two dimensions ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/warCouncil.css`
- Modify: `src/app/warCouncil/warCouncilHealthBars.css`
- Config: none

- [x] **Step 1: Add the three custom properties to `:root` in `warCouncil.css`**

```css
/* DLR-115 — the blue heart. NONE of these three numbers was chosen by anyone: the developer owns
   the colour, the opacity and the gap, and none has been seen against a full row. The opacity
   copies --wc-hp-ticking-opacity so the two "already claimed" readings agree; two unseen numbers
   agreeing is a reason to tune them together, not evidence either is right. */
--wc-hp-shield-fill: #4f8fc0;
--wc-hp-shield-ticking-opacity: 0.78;
--wc-hp-shield-gap: 0.5rem;
```

- [x] **Step 2: Qualify the existing state selectors by `data-type` and add the shield rules**

Every existing `.wc-hp-heart[data-state='…']` rule becomes `.wc-hp-heart[data-type='health'][data-state='…']`, including the two entries in the `prefers-reduced-motion` block. Then add:

```css
/* The shield cluster — a SECOND cluster, not a continuation of the red run. The wider gap is what
   makes that read; without it the two types run together. It sits inboard of the health pips so
   the whole row reads outward-to-inward in depletion order: the further toward the centre, the
   sooner it is lost. */
.wc-hp-shield-run {
  display: flex;
  flex-wrap: nowrap;
  gap: var(--wc-hp-heart-gap);
  margin-inline-start: var(--wc-hp-shield-gap);
  min-width: 0;
  flex: 0 1 auto;
}

/* Shape carries the reading before colour does, exactly as it does for the red row: a shield pip
   binds to a DIFFERENT <symbol> (a shield, not a heart), so the two types still separate in
   greyscale and for a colour-blind player. A blue-vs-red colour swap alone would fail that floor.
   Both shield states are STATIC — no animation, so neither needs an entry in the reduced-motion
   block and neither loses anything when motion is off. */
.wc-hp-heart[data-type='shield'][data-state='whole'] {
  color: var(--wc-hp-shield-fill);
}

/* A blue heart a booked Timebomb has already claimed. Same static treatment, and the same
   opacity figure, as the red `ticking` heart — one visual language for "committed, not yet
   landed", across both pip types. */
.wc-hp-heart[data-type='shield'][data-state='ticking'] {
  color: var(--wc-hp-shield-fill);
  opacity: var(--wc-hp-shield-ticking-opacity);
}
```

Update the sheet's header comment: it says "the five resting states" and "each a row of discrete heart glyphs" — it is now two pip types over a shared state vocabulary.

- [x] **Step 3: Grep both stylesheets for every new custom property name**

Run: `Select-String -Path src\app\warCouncil\*.css -Pattern "wc-hp-shield"`
Actual: 8 hits, not the task's stated 6 — 3 declarations in `warCouncil.css` (correct), plus **5**, not 3, in `warCouncilHealthBars.css`: the task's own Step 2 code block uses `var(--wc-hp-shield-fill)` in TWO rules (shield `whole` and shield `ticking`), and the class selector `.wc-hp-shield-run {` itself also matches the bare-substring pattern `wc-hp-shield`. So the task's "3 usages" estimate undercounts its own specified CSS by 2. All three property names are spelled identically in both files (`--wc-hp-shield-fill` ×1 decl + ×2 usage, `--wc-hp-shield-ticking-opacity` ×1 decl + ×1 usage, `--wc-hp-shield-gap` ×1 decl + ×1 usage) — the check this step exists for (no orphaned/misspelled property) PASSES; only the exact-count expectation in the task file is wrong. Flag to the planner rather than worked around.

- [x] **Step 4: Grep for any `data-state` selector left unqualified**

Run: `Select-String -Path src\app\warCouncil\warCouncilHealthBars.css -Pattern "wc-hp-heart\[data-state"`
Expected: zero hits — every state selector is now qualified by `data-type`. Confirmed: zero hits.

---

## Phase 3 — Final verification

No production changes. Sanity-checks only.

### Task 9: Confirm no tunable was hard-coded and no name drifted

- Skill: none — verification only

- [ ] **Step 1: Grep source for the literal values configuration owns**

Run: `Select-String -Path src\app\**\*.ts,src\app\**\*.tsx -Pattern "#4f8fc0|0\.78|0\.5rem"`
Expected: zero hits — all three live in `warCouncil.css` only.

- [ ] **Step 2: Confirm no sixth `HeartState` member was added**

Run: `Select-String -Path src\app\warCouncil\duelHealthBars.ts -Pattern "^  (Whole|AtRisk|Ticking|Breaking|Broken|Shield|Shielded|Blue):"`
Expected: exactly the five original members. Any sixth is the `game-ux` ruling broken.

- [ ] **Step 3: Confirm the retired vocabulary is absent**

Run: `Select-String -Path src\app\warCouncil\*.ts,src\app\warCouncil\*.tsx,src\app\warCouncil\*.css -Pattern "Envenom|envenom|poison" -CaseSensitive:$false`
Expected: zero hits in the files this contract touched (`CardRank.Poison` lives in the engine and is an unrelated card rank).

### Task 10: File length, after Prettier

- Skill: none — verification only

- [ ] **Step 1: Format, then count every line of each touched file**

Run: `npx prettier --write "src/app/warCouncil/duelHealthBars.ts" "src/app/warCouncil/DuelHealthBars.tsx" "src/app/warCouncil/HeartMark.tsx" "src/app/warCouncil/roundBars.ts" "src/app/warCouncil/labels.ts" "src/app/warCouncil/warCouncil.css" "src/app/warCouncil/warCouncilHealthBars.css"; Get-ChildItem src\app\warCouncil\*.ts,src\app\warCouncil\*.tsx,src\app\warCouncil\*.css | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }`
Expected: every file under 400. `(Get-Content).Count` counts blank lines; `Measure-Object -Line` does NOT and has hidden a real breach on this project before. If a file breaches, split it in-ticket — never hand it back as a finding.

### Task 11: Static gates and full suite

- Skill: none — verification only

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test -- --run`
Expected: all three exit 0. Vitest reports 0 failed against a baseline of **1453 passed of 1453 in 112 files** — the new specs raise the count; any failure belongs to this ticket.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0.

---

## Self-review

- **Phase boundaries are revertible.** Phase 1 ends type-clean with the suite green and nothing rendering differently. Phase 2 ends with the row rendered and every new reading asserted. Phase 3 changes nothing.
- **Every file in the map is named by a task**, and no task touches a path outside its own `**Files:**` block.
- **Both directions of the `projectedDepletion` fix are tested** — with a shield (red spared) and without (behaviour byte-identical to today), plus the partial case and the Quarry's untouched path.
- **No tuning value is invented as settled.** Three numbers ship with the value stated, the reason stated, and "nobody chose this" stated, in the plan, in the CSS, in the task file, and in the sprint log.
- **`npm run format:check` is not a gate here** — it fails on ~58 pre-existing `.md` files repo-wide. Task 10 runs Prettier over the touched files instead.
