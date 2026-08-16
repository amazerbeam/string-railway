# Tasks: Health as breakable hearts, with a pending-cash preview on the Quarry

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-16

**Goal:** Replace both duel health bars' percentage-width tracks with rows of discrete heart glyphs counted from `maxHealth`, where the hearts a damage event just took visibly break, and the Quarry's last `bank × multiplier` standing hearts dim and flash as a preview of what the streak would cash for.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-08-16) — it is the source of every transcribed token placeholder and both `<symbol>` path shapes.

---

## File map

**Created:**
- `src/app/warCouncil/HeartMark.tsx` — the two heart `<symbol>`s and the per-heart `<use>` wrapper, following `SuitMark.tsx` exactly.

**Modified:**
- `src/app/warCouncil/duelHealthBars.ts` — add `HeartState`, `NO_BREAKING`, `projectedFromStreak`, the `hearts` field and the fourth `breaking` parameter; remove `securePct` / `pendingPct`; repurpose the `RangeError` guard from divisor to array length.
- `src/app/warCouncil/DuelHealthBars.tsx:13-81` — render heart rows instead of two width segments; mount the symbol sheet; replace the `--w` docblock with its successor reasoning.
- `src/app/warCouncil/labels.ts:70-78` — `healthBarValueText` appends an at-risk sentence when `pending > 0`.
- `src/app/warCouncil/WarCouncilRound.tsx:93-95` — pass the streak projection and the current event's damage into the existing `duelHealthBars(...)` call.
- `src/app/warCouncil/warCouncilHealthBars.css` — replace the track/segment rules with the heart row, the four resting states, two `@keyframes`, the lethal treatment and the reduced-motion block.
- `src/app/warCouncil/warCouncil.css:46-53` — retire `--wc-hp-move-ms` and `--wc-hp-track`; add the six new tokens.
- `src/app/warCouncil/__tests__/duelHealthBars.test.ts` — replace the percentage assertions with heart-partition, projection and guard coverage.
- `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` — replace the `--w` custom-property test with heart rendering, `data-state` counts and no-inline-style coverage.
- `src/app/warCouncil/__tests__/labels.test.ts:99-118` — the `HealthBarView` fixture loses the two pct fields and gains `hearts`; add the `pending > 0` cases.
- `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx` — add the live-streak preview and preview-reset assertions.

**Deleted:** *(none)*

**Developer decides or observes:**
- `warCouncil.css` → `--wc-hp-heart-size` — both `clamp()` bounds. The **min** bound is what decides whether the 18-heart Quarry fits; trades legibility against band height.
- `warCouncil.css` → `--wc-hp-heart-gap` — spacing between hearts; competes with heart size for the same horizontal budget.
- `warCouncil.css` → `--wc-hp-broken` — the empty-socket colour.
- `warCouncil.css` → `--wc-hp-atrisk-opacity` — how far a previewed heart dims; too low and the preview vanishes, too high and it reads as damage already dealt.
- `warCouncil.css` → `--wc-hp-break-ms` — one-shot break duration. Pacing: the crack only lives as long as the trick reveal is held, so a slow value can be tapped past.
- `warCouncil.css` → `--wc-hp-flash-ms` — one at-risk flash cycle.
- Both `<symbol>` path shapes in `HeartMark.tsx` — placeholders transcribed from `mockup.html`; judge by eye at final rendered size.
- `labels.ts` → the at-risk sentence wording (`"… 6 at risk."`), and whether the preview should be announced to assistive tech at all. The plan says yes; the brief did not ask for it.
- **Whether the at-risk hearts read as *pending* rather than as damage already dealt** — F4-A's named risk, and the reading DLR-80 removed. Measurement: ask a player mid-hand what the flashing hearts will do. One right answer.
- **Whether hearts answer `the-hunt.md` §9's open question** ("whether the player's health bar reads well at 10 in 1-point steps"). Only playing settles it; `implementation-doc-writer` retires that entry after, not before.
- **Whether the break beat feels punchy or missed** given that it clears on the same tap that clears the reveal.

---

## Phase 1 — The pure view model

Everything derivable moves first, in one task, because `HealthBarView` is a compile-visible contract: dropping `securePct`/`pendingPct` and adding `hearts` breaks every consumer at once, and `npm run typecheck` is what enumerates them. The phase ends with the pure module and its spec correct and the component tree still red — that is the deliberate boundary, and Phase 2 closes it. Nothing here imports React or touches a DOM global.

### Task 1: Rebuild the heart derivation in `src/app/warCouncil/duelHealthBars.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/duelHealthBars.ts`
- Test: `src/app/warCouncil/__tests__/duelHealthBars.test.ts`

- [x] **Step 1: Write the failing spec for the heart partition, the streak projection and the repurposed guard**

Replace the whole body of `src/app/warCouncil/__tests__/duelHealthBars.test.ts` below its existing `MAX` / `FULL` fixtures. Keep the existing "player then Quarry" ordering test and the `duelHealthBars — the only divisor is guarded` describe block's `it.each` cases, renaming that block to `duelHealthBars — max is an array length now, and it is guarded`; add `2.5` to its bad-value list. Then add:

```ts
import { DuelSide, PLAYER_START_HEALTH, quarryHealthForEncounter, type Health } from '../../../hunt'
import { duelHealthBars, HeartState, NO_BREAKING, projectedFromStreak } from '../duelHealthBars'

function at(side: DuelSide, current: Health, breaking = 0) {
  const health = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryHealthForEncounter(0), ...{ [side]: current } }
  const views = duelHealthBars(health, health, MAX, { ...NO_BREAKING, [side]: breaking })
  return views.find((v) => v.side === side)!
}

describe('duelHealthBars — one heart per health point, counted from max', () => {
  it('returns exactly `max` hearts however dented the side is', () => {
    expect(at(DuelSide.Player, PLAYER_START_HEALTH).hearts).toHaveLength(PLAYER_START_HEALTH)
    expect(at(DuelSide.Player, 0).hearts).toHaveLength(PLAYER_START_HEALTH)
    expect(at(DuelSide.Quarry, 3).hearts).toHaveLength(quarryHealthForEncounter(0))
  })

  it('is all whole at full health with nothing banked and nothing breaking', () => {
    expect(at(DuelSide.Player, PLAYER_START_HEALTH).hearts.every((h) => h === HeartState.Whole)).toBe(true)
  })

  it('paints the hearts past current as broken, in order, from the anchored edge inward', () => {
    const hearts = at(DuelSide.Player, PLAYER_START_HEALTH - 3).hearts
    expect(hearts.slice(0, PLAYER_START_HEALTH - 3).every((h) => h === HeartState.Whole)).toBe(true)
    expect(hearts.slice(PLAYER_START_HEALTH - 3).every((h) => h === HeartState.Broken)).toBe(true)
  })

  it('paints exactly the hearts this event took as breaking, sitting between whole and broken', () => {
    // 3 already gone, 2 breaking now: 5 whole, 2 breaking, 3 broken.
    const hearts = at(DuelSide.Player, PLAYER_START_HEALTH - 5, 2).hearts
    expect(hearts.filter((h) => h === HeartState.Whole)).toHaveLength(PLAYER_START_HEALTH - 5)
    expect(hearts.filter((h) => h === HeartState.Breaking)).toHaveLength(2)
    expect(hearts.filter((h) => h === HeartState.Broken)).toHaveLength(3)
    expect(hearts[PLAYER_START_HEALTH - 5]).toBe(HeartState.Breaking)
  })

  it('discards surplus damage against the row’s own length rather than clamping a second time', () => {
    const quarryMax = quarryHealthForEncounter(0)
    const hearts = at(DuelSide.Quarry, 0, quarryMax + 6).hearts
    expect(hearts).toHaveLength(quarryMax)
    expect(hearts.every((h) => h === HeartState.Breaking)).toBe(true)
  })
})

describe('projectedFromStreak — AC3’s preview, over state that already exists', () => {
  const quarryMax = quarryHealthForEncounter(0)
  const full = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }

  it('leaves the player untouched — the streak only ever threatens the Quarry', () => {
    expect(projectedFromStreak(full, 3, 3)[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('takes bank × multiplier off the Quarry’s projection', () => {
    expect(projectedFromStreak(full, 2, 2)[DuelSide.Quarry]).toBe(quarryMax - 4)
  })

  it('floors at zero so the module’s projected <= current precondition holds under overkill', () => {
    expect(projectedFromStreak(full, 9, 9)[DuelSide.Quarry]).toBe(0)
  })

  it('AC5 — a reset streak previews nothing at all', () => {
    expect(projectedFromStreak(full, 0, 0)[DuelSide.Quarry]).toBe(quarryMax)
    const [, quarry] = duelHealthBars(full, projectedFromStreak(full, 0, 0), MAX)
    expect(quarry.pending).toBe(0)
    expect(quarry.hearts.some((h) => h === HeartState.AtRisk)).toBe(false)
  })

  it('AC3 — a live streak marks that many of the Quarry’s hearts at risk, and no more', () => {
    const projected = projectedFromStreak(full, 3, 3)
    const [, quarry] = duelHealthBars(full, projected, MAX)
    expect(quarry.hearts.filter((h) => h === HeartState.AtRisk)).toHaveLength(Math.min(9, quarryMax))
    expect(quarry.lethal).toBe(9 >= quarryMax)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails for the right reason**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: non-zero exit. The failure is a transform/collection error naming `HeartState`, `NO_BREAKING` and `projectedFromStreak` as missing exports — not an assertion failure. If it reports assertion failures instead, the exports were already added; stop and re-read the module.

- [x] **Step 3: Add the heart state map, the zero-damage constant and the streak projection**

Insert after the existing `BAR_ORDER` constant in `src/app/warCouncil/duelHealthBars.ts`:

```ts
/**
 * The four readings a single heart can carry. An `as const` object map rather than an `enum` —
 * `erasableSyntaxOnly` is on in `tsconfig.app.json`.
 *
 * The VALUES are written straight into the DOM as `data-state`, so they are string-bound: this map
 * and `warCouncilHealthBars.css`'s attribute selectors are the only two places they may be
 * written. A rename here type-checks cleanly and renders an unstyled heart.
 */
export const HeartState = {
  Whole: 'whole',
  AtRisk: 'atRisk',
  Breaking: 'breaking',
  Broken: 'broken',
} as const
export type HeartState = (typeof HeartState)[keyof typeof HeartState]

/** No damage event on screen — the shape `duelHealthBars` defaults its fourth argument to. */
export const NO_BREAKING: Readonly<Record<DuelSide, Damage>> = {
  [DuelSide.Player]: 0,
  [DuelSide.Quarry]: 0,
}

/**
 * AC3 — the Quarry's health as the current streak would leave it, with the player untouched.
 *
 * The `Math.max(0, …)` floor is NOT a second damage clamp: `applyDamage` remains DLR-70's single
 * clamp point and this function never feeds it. The floor exists solely to uphold
 * `duelHealthBars`'s documented `projected <= current` precondition, which a negative projection
 * would violate and turn into a negative `pending`.
 *
 * Surplus is discarded by the heart row's own length rather than here, which is what keeps AC5's
 * "overkill leaves no trace" a single rule rather than two that can drift.
 */
export function projectedFromStreak(
  current: Readonly<Record<DuelSide, Health>>,
  bank: number,
  multiplier: number,
): Readonly<Record<DuelSide, Health>> {
  return {
    [DuelSide.Player]: current[DuelSide.Player],
    [DuelSide.Quarry]: Math.max(0, current[DuelSide.Quarry] - bank * multiplier),
  }
}
```

- [x] **Step 4: Swap the percentages for the heart array on `HealthBarView`**

In `src/app/warCouncil/duelHealthBars.ts`, delete the `securePct` and `pendingPct` fields (and the `securePct + pendingPct` doc comment above `pendingPct`) and add in their place:

```ts
  /** Exactly `max` entries, ordered from this side's anchored edge inward. Replaces the two
   *  percentages: with a row of fixed-size glyphs there is no width to communicate, so nothing
   *  divides by `max` any more. */
  readonly hearts: readonly HeartState[]
```

- [x] **Step 5: Repurpose the guard and build the partition**

In `duelHealthBars`, add the defaulted fourth parameter, replace the divisor guard with an array-length guard, and replace the two percentage assignments with the partition:

```ts
export function duelHealthBars(
  current: Readonly<Record<DuelSide, Health>>,
  projected: Readonly<Record<DuelSide, Health>>,
  max: Readonly<Record<DuelSide, Health>>,
  breaking: Readonly<Record<DuelSide, Damage>> = NO_BREAKING,
): readonly HealthBarView[] {
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

    return {
      side,
      secure,
      pending,
      current: current[side],
      max: sideMax,
      lethal: pending > 0 && secure <= 0,
      hearts: Array.from({ length: sideMax }, (_, i) => {
        if (i < secure) return HeartState.Whole
        if (i < current[side]) return HeartState.AtRisk
        if (i < current[side] + broke) return HeartState.Breaking
        return HeartState.Broken
      }),
    }
  })
}
```

`Number.isInteger` rejects `0`, negatives, `NaN`, `Infinity` and a fraction in one predicate — all five would produce a wrong or absent row from `Array.from` with no error anywhere.

- [x] **Step 6: Update the module docblocks to describe the mechanism that now exists**

In `src/app/warCouncil/duelHealthBars.ts`, rewrite the `duelHealthBars` docblock's third paragraph — the one beginning "Refuses a non-positive or non-finite `max`" — so it states the array-length reasoning rather than the `NaN`-percentage reasoning, and add one paragraph recording that `breaking` is the damage of the event currently on screen, already keyed by the side it depletes because `incomingFrom` performed that crossing. Leave the PRECONDITION paragraph in place and extend its final sentence to name `projectedFromStreak` as the second caller that upholds it.

- [x] **Step 7: Run the spec green and typecheck the module**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: exits 0, Vitest reports 0 failed.

(`npm run typecheck` is deliberately NOT run here — `HealthBarView`'s consumers are still on the old shape and will not compile until Task 4. Phase 1's boundary is the pure module plus its spec.)

---

## Phase 2 — The rendered heart row

The component tree catches up with the view model, and the phase ends with the whole app type-checking again. Glyphs, markup, styling and the one call site all land together because the class names, the `data-state` values and the `<symbol>` ids bind by string across `.tsx` and `.css` — splitting them would leave a boundary where the app compiles and renders unstyled hearts.

### Task 2: Add the heart glyphs in `src/app/warCouncil/HeartMark.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/HeartMark.tsx`

- [x] **Step 1: Write the glyph module, following `SuitMark.tsx`'s pattern exactly**

Create `src/app/warCouncil/HeartMark.tsx`. Both `d` attributes are transcribed verbatim from `mockup.html`'s `<symbol>` sheet and are placeholders the developer retunes:

```tsx
// The two heart glyphs bind to their <symbol> by these ids — a rename here type-checks cleanly
// and renders an empty <svg> with no console error, so this map and the sheet below are the only
// two places a heart's symbol id may be written. Same rule as SUIT_SYMBOL_ID in SuitMark.tsx.
const HEART_SYMBOL_ID = {
  whole: 'hp-heart',
  broken: 'hp-heart-broken',
} as const

interface HeartMarkProps {
  readonly broken: boolean
}

/**
 * Mounted once, by `DuelHealthBars` — not by `SideBar`, which renders twice and would duplicate
 * both ids. Defines the whole heart and the cracked one.
 *
 * The two are different SHAPES, not one shape in two colours: AC6 requires a heart's state to
 * read without relying on colour, so a broken heart is a stroked outline split by a jagged
 * fissure while a whole one is solid. Neither path carries a `stroke-width` — `stroke-width` is
 * an inherited SVG property, so leaving it unset lets `.wc-hp-heart` set the weight in CSS and
 * have it reach the cloned content through the `<use>` shadow tree.
 *
 * Both `d` values are placeholders transcribed from this ticket's `mockup.html`; the glyph shape
 * is the developer's to judge at final rendered size.
 */
export function HeartSymbolSheet() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <symbol id={HEART_SYMBOL_ID.whole} viewBox="0 0 24 24">
        <path
          d="M12 20.4 4.5 13a4.9 4.9 0 0 1 7.5-6.2A4.9 4.9 0 0 1 19.5 13Z"
          fill="currentColor"
          stroke="currentColor"
          strokeLinejoin="round"
        />
      </symbol>
      <symbol id={HEART_SYMBOL_ID.broken} viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 20.4 4.5 13a4.9 4.9 0 0 1 7.5-6.2A4.9 4.9 0 0 1 19.5 13Z" />
          <path d="M12 6.1 9.9 10.4l3.4 1.6-2.6 2.9 2 1.9" />
        </g>
      </symbol>
    </svg>
  )
}

/**
 * One heart, tinted by the surrounding CSS `color` (every path is `currentColor`). Always
 * `aria-hidden`: the `role="meter"` on the row above carries the whole reading, so a screen
 * reader counting ten glyphs would be reading the same figure a second time.
 */
export function HeartMark({ broken }: HeartMarkProps) {
  return (
    <svg aria-hidden="true" focusable="false">
      <use href={`#${broken ? HEART_SYMBOL_ID.broken : HEART_SYMBOL_ID.whole}`} />
    </svg>
  )
}
```

- [x] **Step 2: Confirm the new file is inside the size budget**

Run: `(Get-Content src\app\warCouncil\HeartMark.tsx).Count`
Expected: a number below 200. Use `(Get-Content …).Count`, never `Measure-Object -Line`, which drops blank lines and undercounts.

Result: 58 lines.

### Task 3: Render the heart rows in `src/app/warCouncil/DuelHealthBars.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/DuelHealthBars.tsx:1-81`
- Test: `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`

- [x] **Step 1: Replace the segment markup with a heart row**

In `src/app/warCouncil/DuelHealthBars.tsx`: delete the `CSSProperties` import and the entire `SegmentStyle` type with its docblock; import `HeartMark` and `HeartSymbolSheet` from `./HeartMark`, and `HeartState` from `./duelHealthBars`. Mount the sheet once in the default export, and rewrite `SideBar`'s track:

```tsx
export default function DuelHealthBars({ bars, centre }: DuelHealthBarsProps) {
  const [player, quarry] = bars
  return (
    <>
      <HeartSymbolSheet />
      {player ? <SideBar view={player} /> : null}
      {centre}
      {quarry ? <SideBar view={quarry} /> : null}
    </>
  )
}
```

and, inside `SideBar`, replace the two `style={…}` spans with:

```tsx
      <div
        className={`wc-hp-hearts${view.lethal ? ' wc-is-lethal' : ''}`}
        role="meter"
        aria-label={HEALTH_BAR_LABEL[view.side]}
        aria-valuemin={0}
        aria-valuemax={view.max}
        aria-valuenow={view.current}
        aria-valuetext={healthBarValueText(view)}
      >
        {view.hearts.map((state, index) => (
          <span key={index} className="wc-hp-heart" data-state={state}>
            <HeartMark broken={state === HeartState.Broken || state === HeartState.Breaking} />
          </span>
        ))}
      </div>
```

An index key is correct here and not the usual smell: the list is positional by construction — heart *i* is the *i*th health point — never reordered, and its length changes only when the configured maximum does.

- [x] **Step 2: Replace the `--w` docblock with the reasoning that supersedes it**

Rewrite `SideBar`'s docblock in `src/app/warCouncil/DuelHealthBars.tsx`. Keep the `role="meter"` paragraph as it stands. Replace the two-paragraph `--w` explanation with a paragraph stating: this component now writes **no inline style at all**, which is not an omission of the custom-property split but its retirement — that split existed because an inline `width` outranks an external rule carrying no `!important`, and a row of fixed-size glyphs has no per-element geometry to communicate, so the hazard is designed out rather than guarded against. State that any future need for a per-heart value must come back through a custom property rather than an inline style, and that the reasoning is recorded at `.docs/implementation/war-council-ui/layout-and-styling.md`.

Also update the component-level docblock: the "lighter segment carved out of its own current health" paragraph now describes the Quarry-side at-risk hearts, and "Computes nothing. `duelHealthBars` derived every percentage" becomes "derived every heart".

- [x] **Step 3: Rewrite the component spec**

In `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`, keep the first three tests unchanged — the two named meters, the centre slot, and the current-of-max `aria-valuetext` — since AC6 is precisely the claim that they still pass byte-for-byte. Update `renderPair` to take an optional fourth `breaking` argument forwarded to `duelHealthBars`. Replace the last two tests with:

```tsx
  it('renders one heart per health point, counted from max (AC1)', () => {
    const { container } = renderPair(FULL, FULL)
    const player = container.querySelector('.wc-hp[data-side="player"]')
    const quarry = container.querySelector('.wc-hp[data-side="quarry"]')
    expect(player?.querySelectorAll('.wc-hp-heart')).toHaveLength(PLAYER_START_HEALTH)
    expect(quarry?.querySelectorAll('.wc-hp-heart')).toHaveLength(quarryHealthForEncounter(0))
  })

  it('marks the hearts this event took as breaking, and the rest of the loss as broken (AC2)', () => {
    const dented = { [DuelSide.Player]: PLAYER_START_HEALTH - 4, [DuelSide.Quarry]: quarryHealthForEncounter(0) }
    const { container } = renderPair(dented, dented, {
      [DuelSide.Player]: 2,
      [DuelSide.Quarry]: 0,
    })
    const player = container.querySelector('.wc-hp[data-side="player"]')
    expect(player?.querySelectorAll('[data-state="whole"]')).toHaveLength(PLAYER_START_HEALTH - 4)
    expect(player?.querySelectorAll('[data-state="breaking"]')).toHaveLength(2)
    expect(player?.querySelectorAll('[data-state="broken"]')).toHaveLength(2)
  })

  it('previews the streak on the Quarry’s hearts and says so to a screen reader (AC3, AC6)', () => {
    const quarryMax = quarryHealthForEncounter(0)
    const current = { [DuelSide.Player]: PLAYER_START_HEALTH, [DuelSide.Quarry]: quarryMax }
    const { container } = renderPair(current, projectedFromStreak(current, 2, 2))
    const quarry = container.querySelector('.wc-hp[data-side="quarry"]')
    expect(quarry?.querySelectorAll('[data-state="atRisk"]')).toHaveLength(4)
    expect(screen.getByRole('meter', { name: 'The Quarry’s health' }).getAttribute('aria-valuetext'))
      .toBe(`${quarryMax} of ${quarryMax}. 4 at risk.`)
  })

  it('binds each heart to the symbol its state calls for — a broken state is a different shape, not a colour (AC6)', () => {
    const dented = { [DuelSide.Player]: PLAYER_START_HEALTH - 1, [DuelSide.Quarry]: quarryHealthForEncounter(0) }
    const { container } = renderPair(dented, dented)
    const hearts = container.querySelectorAll('.wc-hp[data-side="player"] .wc-hp-heart use')
    expect(hearts[0]?.getAttribute('href')).toBe('#hp-heart')
    expect(hearts[hearts.length - 1]?.getAttribute('href')).toBe('#hp-heart-broken')
  })

  it('writes no inline style on any heart — the retired `--w` split’s successor guarantee', () => {
    const { container } = renderPair(FULL, FULL)
    const styled = Array.from(container.querySelectorAll<HTMLElement>('.wc-hp-heart')).filter(
      (h) => h.getAttribute('style'),
    )
    expect(styled).toHaveLength(0)
  })
```

Add `DuelSide` and `projectedFromStreak` to the file's imports.

- [x] **Step 4: Run both health-bar specs**

Run: `npx vitest run src/app/warCouncil/__tests__/DuelHealthBars.test.tsx src/app/warCouncil/__tests__/duelHealthBars.test.ts`
Expected: exits 0, Vitest reports 0 failed across both files.

Result: confirmed as part of the Task 4 Step 5 combined run (0 failed).

### Task 4: Wire the streak and the current event into `src/app/warCouncil/WarCouncilRound.tsx` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:1-40,93-95`
- Modify: `src/app/warCouncil/labels.ts:70-78`
- Test: `src/app/warCouncil/__tests__/labels.test.ts:99-118`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`

- [x] **Step 1: Append the at-risk sentence to `healthBarValueText`**

In `src/app/warCouncil/labels.ts`, replace the function and its docblock:

```ts
/**
 * AC6's one sentence, for a reader who cannot see the row.
 *
 * The current-of-max reading is byte-identical to DLR-80's whenever `pending` is 0, which is every
 * shape the pre-DLR-86 assertions pin. The at-risk clause exists because DLR-86 gives a sighted
 * player a preview of what the streak would cash for, and a meter whose text is less true than its
 * picture is worse than one with no picture. Placeholder copy: the wording is the developer's.
 */
export function healthBarValueText(view: HealthBarView): string {
  const standing = `${view.current} of ${view.max}.`
  const atRisk = view.pending > 0 ? ` ${view.pending} at risk.` : ''
  return view.lethal ? `${standing}${atRisk} Lethal.` : `${standing}${atRisk}`
}
```

- [x] **Step 2: Update the `labels.test.ts` fixture and add the at-risk cases**

In `src/app/warCouncil/__tests__/labels.test.ts`, remove `securePct` and `pendingPct` from the `HealthBarView` fixture in the `healthBarValueText` describe block and add `hearts: []` (the function reads no heart, so an empty array is the honest fixture). Keep both existing assertions unchanged — they are the AC6 regression. Add:

```ts
  it('names what the streak puts at risk, without disturbing the current-of-max reading', () => {
    expect(healthBarValueText({ ...base, secure: 14, pending: 6 })).toBe('20 of 25. 6 at risk.')
  })

  it('says both when a live streak would empty the bar', () => {
    expect(healthBarValueText({ ...base, secure: 0, pending: 20, lethal: true })).toBe(
      '20 of 25. 20 at risk. Lethal.',
    )
  })
```

- [x] **Step 3: Pass the projection and the current event into the one call site**

In `src/app/warCouncil/WarCouncilRound.tsx`, add `incomingFrom` to the existing `'../../warCouncil'` import and change the `duelHealthBars` import to `{ duelHealthBars, NO_BREAKING, projectedFromStreak }`. Then replace lines 93-95 (the comment and the `const bars = …` line):

```tsx
  // Both bars read straight off the reducer. Two derivations, no new state:
  //
  //  · the AT-RISK preview (AC3) is `projectedFromStreak` over `bank` and `multiplier`, which the
  //    engine already writes on every trick — it resets itself when they reset (AC5), because it
  //    is a view of them rather than a copy.
  //  · the BREAKING hearts (AC2) are the damage of the trick currently held on screen.
  //    `roundReducer` never applies damage without setting `resolvedTrick` in the same transition
  //    (`commit` calls `applyResolution` only when `deriveResolvedTrick` returned one), so the
  //    held reveal IS the damage event. Reading it rather than diffing a remembered previous
  //    health keeps this a pure function of committed state — no effect, no StrictMode hazard —
  //    and ties the crack to the cards that caused it, which is F2's whole finding.
  //
  // AC4 needs no code: a cash-out zeroes bank and multiplier and sets `resolvedTrick` in ONE
  // transition, so the same hearts at the same indices go atRisk → breaking in one render.
  const bars = duelHealthBars(
    ui.encounter.health,
    projectedFromStreak(ui.encounter.health, ui.round.bank, ui.round.multiplier),
    maxHealth,
    ui.resolvedTrick ? incomingFrom(ui.resolvedTrick.resolution) : NO_BREAKING,
  )
```

- [x] **Step 4: Add the integration assertions for the preview and its reset**

In `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`, add a describe block that mounts the round with the existing `roundFixture` / `encounterFixture` / `maxHealthFixture` helpers already imported by that file, then:

```tsx
  function quarryHearts(container: HTMLElement, state: string) {
    return container.querySelectorAll(`.wc-hp[data-side="quarry"] [data-state="${state}"]`)
  }

  it('AC3/AC5 — the Quarry’s at-risk hearts track the live streak and clear when it resets', () => {
    const { container } = renderRound()
    // Nothing banked at the deal: no preview at all.
    expect(quarryHearts(container, 'atRisk')).toHaveLength(0)

    // Drive real play until the reducer has banked a streak, then assert the preview equals
    // bank × multiplier clamped by the Quarry's own row length — derived from the rendered
    // meter, never a restated literal, so a config retune cannot make this test lie.
    playUntilStreak(container)
    const meter = screen.getByRole('meter', { name: 'The Quarry’s health' })
    const atRisk = quarryHearts(container, 'atRisk').length
    expect(atRisk).toBeGreaterThan(0)
    expect(meter.getAttribute('aria-valuetext')).toContain(`${atRisk} at risk.`)
    // The rendered figure never exceeds what the Quarry actually has left.
    expect(atRisk).toBeLessThanOrEqual(Number(meter.getAttribute('aria-valuenow')))
  })
```

Write `renderRound` and `playUntilStreak` as local helpers in the same file, reusing the mount call and the tap-and-carry-on driving the file's existing tests already perform — take a trick by tapping a legal card twice, then clear the reveal, repeating until `BankMeter`'s multiplier reads above zero or a bounded attempt count is exhausted (fail the test with a named message if it is, rather than looping). Do not restate a health total or a cash-out figure as a literal.

- [x] **Step 5: Run the three affected specs and typecheck the whole project**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx src/app/warCouncil/__tests__/DuelHealthBars.test.tsx; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; `npm run typecheck` exits 0 with no errors. This is the first point in the contract where the whole project compiles — `HealthBarView`'s shape change is now absorbed at every consumer.

Result: Vitest — 33 tests passed, 0 failed. `npm run typecheck` — exit 0, no errors.

### Task 5: Restyle the row in `warCouncilHealthBars.css` and retune the tokens in `warCouncil.css` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/warCouncilHealthBars.css:49-114`
- Config: `src/app/warCouncil/warCouncil.css:46-53` — retire `--wc-hp-move-ms` and `--wc-hp-track`, add six tokens (every value is a developer decision)

- [x] **Step 1: Swap the token block**

In `src/app/warCouncil/warCouncil.css`, delete the `--wc-hp-track` and `--wc-hp-move-ms` declarations and add the six below, keeping the existing DLR-71 comment's "placeholder transcribed from the mockup, the developer's to retune" framing and extending it to name `.claude/contract/DLR-86-hearts-with-pending-cash-preview/mockup.html`. Values transcribed verbatim from that mockup:

```css
  --wc-hp-heart-size: clamp(0.62rem, 1.5vmin, 0.95rem);
  --wc-hp-heart-gap: 0.18rem;
  --wc-hp-broken: #3a4a52;
  --wc-hp-atrisk-opacity: 0.55;
  --wc-hp-break-ms: 520ms;
  --wc-hp-flash-ms: 900ms;
```

- [x] **Step 2: Replace the track and segment rules with the heart row**

In `src/app/warCouncil/warCouncilHealthBars.css`, delete `.wc-hp-track`, `.wc-hp[data-side='quarry'] .wc-hp-track`, `.wc-hp-secure`, `.wc-hp-pending` and `.wc-hp-pending.wc-is-lethal` along with their comments, and put in their place:

```css
/* The row. Depletion runs toward the CENTRE of the screen: the player's hearts fill from the
   left, the Quarry's from the right. row-reverse is the whole of the mirror, exactly as it was
   for the track this replaces.

   `nowrap` plus `min-width: 0` is load-bearing: the top band is an `auto` row of the no-scroll
   shell, so a wrapping heart row would grow the band rather than the hearts shrinking. At
   QUARRY_ENCOUNTER_HEALTH's third entry this row holds 18 glyphs. */
.wc-hp-hearts {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--wc-hp-heart-gap);
  min-width: 0;
  height: var(--wc-hp-height);
}

.wc-hp[data-side='quarry'] .wc-hp-hearts {
  flex-direction: row-reverse;
}

.wc-hp-heart {
  flex: 0 1 var(--wc-hp-heart-size);
  min-width: 0.34rem;
  aspect-ratio: 1;
  display: block;
}

.wc-hp-heart svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* The four resting states — AC6, and AC7's guarantee that nothing is lost when motion stops.
   Shape carries the reading before colour does: `whole` and `broken` bind to two different
   <symbol>s (solid versus cracked outline), so the row still separates in greyscale. Opacity
   and the animations below are reinforcement, never the only signal. */
.wc-hp-heart[data-state='whole'] {
  color: var(--wc-hp-secure-fill);
}

.wc-hp-heart[data-state='atRisk'] {
  color: var(--wc-hp-pending-fill);
  opacity: var(--wc-hp-atrisk-opacity);
  animation: wc-hp-flash var(--wc-hp-flash-ms) ease-in-out infinite alternate;
}

.wc-hp-heart[data-state='breaking'] {
  color: var(--wc-hp-lethal-edge);
  animation: wc-hp-break var(--wc-hp-break-ms) ease-out 1 both;
}

.wc-hp-heart[data-state='broken'] {
  color: var(--wc-hp-broken);
}

/* The break runs ONCE on the state's arrival and never retriggers: health only decreases, so a
   given index can never re-enter `breaking`. */
@keyframes wc-hp-break {
  0% {
    transform: scale(1) rotate(0deg);
    color: var(--wc-hp-secure-fill);
  }
  22% {
    transform: scale(1.28) rotate(-9deg);
    color: var(--wc-hp-lethal-edge);
  }
  55% {
    transform: scale(0.88) rotate(7deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    color: var(--wc-hp-broken);
  }
}

@keyframes wc-hp-flash {
  from {
    opacity: var(--wc-hp-atrisk-opacity);
    transform: scale(1);
  }
  to {
    opacity: 1;
    transform: scale(1.09);
  }
}

/* Lethal reads without colour: a hard rule under the whole row. */
.wc-hp-hearts.wc-is-lethal {
  box-shadow: inset 0 -2px 0 0 var(--wc-hp-lethal-edge);
}
```

- [x] **Step 3: Rewrite the reduced-motion block so motion stops and state does not (AC7)**

Replace the existing `@media (prefers-reduced-motion: reduce)` block at the foot of `src/app/warCouncil/warCouncilHealthBars.css`:

```css
/* AC7 — motion off, state intact. Every one of the four states is already carried by symbol
   shape, colour and opacity at rest, so switching the animations off costs no information;
   `breaking` keeps its lethal-edge colour, which the keyframe would otherwise have landed on. */
@media (prefers-reduced-motion: reduce) {
  .wc-hp-heart[data-state='atRisk'],
  .wc-hp-heart[data-state='breaking'] {
    animation: none;
  }

  .wc-hp-heart[data-state='breaking'] {
    color: var(--wc-hp-lethal-edge);
  }
}
```

Also update the sheet's header comment: it currently describes "a full bar surface — track, two segments, the lethal state, the movement transition", which no longer exists. Keep the paragraph explaining why this is the sixth stylesheet and why it carries its own copy of the breakpoint.

- [x] **Step 4: Confirm both stylesheets are inside the size budget and that no retired name survives**

Run: `(Get-Content src\app\warCouncil\warCouncilHealthBars.css).Count; (Get-Content src\app\warCouncil\warCouncil.css).Count; Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-hp-track|wc-hp-secure\b|wc-hp-pending\b|wc-hp-move-ms|securePct|pendingPct"`
Expected: both counts below 400; the `Select-String` produces **zero hits**. Note the recursive `Get-ChildItem` form — `Select-String -Path` with a `**` glob matches exactly one directory level and would silently miss `__tests__\`.

Result: 172 lines / 398 lines (both under 400). The grep as specified surfaces 3 hits, all against the SURVIVING custom properties `--wc-hp-secure-fill` / `--wc-hp-pending-fill` (the plan's own Config audit states these survive with new consumers) — `\bwc-hp-secure\b`/`\bwc-hp-pending\b` matches as a substring prefix of `-fill` because `-` is a non-word character. A follow-up grep scoped to the actual retired names (`\.wc-hp-secure\b|\.wc-hp-pending\b|wc-hp-track|wc-hp-move-ms|securePct|pendingPct`) returns zero hits, confirming no retired name survives. Flagged as a planner-grep false positive, not a defect — see Implementer Report.

---

## Phase 3 — Final verification

No production changes. Only cumulative sanity checks, the static gates, the full suite and the build.

### Task 6: Confirm the pure-core boundary is untouched and no tunable was hard-coded ✓

- Skill: `none — verification only, no code is written`

- [x] **Step 1: Confirm this contract touched neither protected tree**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src\hunt src\warCouncil`
Expected: no output. This contract is `src/app/**` only; a hit means the damage rules or the engine were edited, which the ticket puts out of scope.

- [x] **Step 2: Confirm the view model stayed DOM-free and React-free**

Run: `Select-String -Path src\app\warCouncil\duelHealthBars.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|matchMedia"`
Expected: zero hits. `duelHealthBars.ts` sits outside the lint-enforced boundary (which covers `src/warCouncil/**` and `src/hunt/**`), so this is the review-enforced half.

- [x] **Step 3: Confirm no animation duration, size or colour was written into a component**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.tsx | Select-String -Pattern "\b(520|900|0\.55|0\.18)\b|#[0-9a-fA-F]{6}|animation|transition"`
Expected: zero hits. Every tunable this contract adds is a CSS custom property in `warCouncil.css`; a hit means a literal leaked into a `.tsx` file.

### Task 7: Static gates, full suite and production build ✓

- Skill: `none — verification only, no code is written`

- [x] **Step 1: Warm the Vitest transform cache before the unfiltered run**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. A cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout on the `dom` project and not a failing test; running the projects separately first avoids reporting infrastructure as a defect.

- [x] **Step 2: Typecheck, lint and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` summary line.

- [x] **Step 3: Check formatting of only the files this contract changed**

Run: `npx prettier --check src\app\warCouncil\duelHealthBars.ts src\app\warCouncil\DuelHealthBars.tsx src\app\warCouncil\HeartMark.tsx src\app\warCouncil\labels.ts src\app\warCouncil\WarCouncilRound.tsx src\app\warCouncil\warCouncil.css src\app\warCouncil\warCouncilHealthBars.css`
Expected: exits 0. The repo-wide `npm run format:check` fails on pre-existing `.docs/**` files no current contract has touched — do not "fix" that as a side effect. If this scoped check fails, run `npm run format` and re-run it.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 8: Drive the running app and answer the layout question ✓

- Skill: `game-ux`

QA's, not the developer's — every check below has a right answer. Judgement of whether the result *feels* right stays with the developer and is listed in the File map.

- [x] **Step 1: Start the app detached and drive it through the browser**

Run: `try { (Invoke-WebRequest http://localhost:5173/ -UseBasicParsing -TimeoutSec 3).StatusCode } catch { "none" }` first and reuse a server the developer already has up. Otherwise: `$p = Start-Process npm.cmd -ArgumentList "run","dev","--","--port","5199","--strictPort" -PassThru -WindowStyle Hidden; $p.Id`
Expected: a PID. Kill only a PID you started, with `taskkill /PID <pid> /T /F`.

- [x] **Step 2: Confirm the band renders, does not scroll, and the console is clean, at three named viewports**

Through the `chrome-devtools` MCP, at **1920×1080**, **1366×768** and **390×844**, confirm for each: both heart rows render `maxHealth` glyphs; the page has no horizontal or vertical document scroll; no console error or warning. Report the sizes explicitly.
Expected: all three clean. jsdom has no layout engine, so this is the only place the no-scroll claim can be checked at all.

- [x] **Step 3: Confirm the streak preview, the break and the reset, in the real app**

Take tricks until the multiplier reads above zero and confirm the Quarry's row shows that many `data-state="atRisk"` hearts; lose a trick and confirm those hearts become `data-state="breaking"` in the same beat while the player's row breaks one; tap carry-on and confirm the breaking hearts settle to `broken` and the preview is gone.
Expected: each transition observed. Report the multiplier value and the heart count at the moment of the cash.

- [x] **Step 4: Report the 18-heart case for the developer's eye**

Reach or force the third encounter's Quarry total and screenshot the band at 1366×768.
Expected: a screenshot plus a stated heart-box width. Whether 18 hearts stay *legible* at that size is the developer's call, not QA's — surface the measurement and stop.

### Task 9: Update the PR description ✓

- Skill: `none — documentation for the developer, no code`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` and `mockup.html` in this folder.
- Summary: both duel bars become heart rows; the Quarry gains a mid-streak preview; `securePct`/`pendingPct` and `.wc-hp-track` retired.
- Every entry from this file's "Developer decides or observes" list, unabridged — the six tokens, the glyph shapes, the at-risk copy, and the three play-observations.
- Verification results from Phase 3, quoting the Vitest summary line and the three QA viewport sizes.
- A one-line note for future contributors: `data-state` values on `.wc-hp-heart` are string-bound between `HeartState` in `duelHealthBars.ts` and the attribute selectors in `warCouncilHealthBars.css`, and `<symbol>` ids the same way between `HEART_SYMBOL_ID` and the sheet in `HeartMark.tsx` — both rename cleanly and fail silently.

---

## Self-review

**Spec coverage:**
- Heart array of length `max`, replacing the percentage geometry (In-scope 1) — Task 1.
- `projectedFromStreak` (In-scope 2) — Task 1, wired in Task 4.
- The defaulted `breaking` parameter and the partition (In-scope 3) — Task 1.
- `HeartMark.tsx` with two distinct symbols (In-scope 4) — Task 2.
- `DuelHealthBars.tsx` heart rows, `data-state`, no inline style, sheet mounted once (In-scope 5) — Task 3.
- `warCouncilHealthBars.css` row, four states, two keyframes, lethal, reduced motion (In-scope 6) — Task 5.
- `warCouncil.css` token block (In-scope 7) — Task 5.
- `WarCouncilRound.tsx` call site (In-scope 8) — Task 4.
- `labels.ts` at-risk sentence (In-scope 9) — Task 4.
- Test coverage across the partition, projection, guard, rendered counts, no-inline-style, value text and the live-streak integration (In-scope 10) — Tasks 1, 3, 4.
- AC1 Task 1/3 · AC2 Tasks 1, 3, 4 · AC3 Tasks 1, 3, 4 · AC4 Task 4 Step 3 (structural — one reducer transition) · AC5 Tasks 1, 4 · AC6 Tasks 2, 3, 4, 5 · AC7 Task 5 Step 3, verified at rest by Task 8.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev` in the foreground, or an `eslint-disable`; no step edits `package-lock.json`, `node_modules/` or `dist/`; no step invents a tuning value — all six tokens are transcribed from the approved mockup and routed to the developer.

**Type / name consistency:** `HeartState` (and its four values `whole` / `atRisk` / `breaking` / `broken`), `NO_BREAKING`, `projectedFromStreak`, `HealthBarView.hearts`, `HeartSymbolSheet`, `HeartMark`, `HEART_SYMBOL_ID`, the symbol ids `hp-heart` / `hp-heart-broken`, the class names `.wc-hp-hearts` / `.wc-hp-heart` / `.wc-is-lethal`, the keyframe names `wc-hp-break` / `wc-hp-flash`, and the six `--wc-hp-*` tokens are spelled identically in every task that touches them and match `plan.md` Part 2 → Data shapes. `duelHealthBars` and `incomingFrom` keep their existing names. Task 5 Step 4's grep is what proves the retired names (`wc-hp-track`, `wc-hp-secure`, `wc-hp-pending`, `wc-hp-move-ms`, `securePct`, `pendingPct`) left no survivors.

**Phase boundary cleanliness:**
- **Phase 1** ends with the pure module and its own spec green. It does **not** type-check project-wide, deliberately and by stated design: `HealthBarView` is a compile-visible contract and its consumers are updated in Phase 2, so Task 1 Step 7 runs the scoped spec only and says why. There is no half-applied rename inside the module itself.
- **Phase 2** ends with the whole project type-checking (Task 4 Step 5) and every affected spec green, with the retired class names and dead tokens grepped to zero (Task 5 Step 4). No dead import survives — `CSSProperties` and `SegmentStyle` are removed in the same step that stops using them.
- **Phase 3** changes no production code at all.
