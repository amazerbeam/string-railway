# Tasks: Two health bars with live pending damage, every trick

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox
> (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-12

**Goal:** Replace the Hunt screen's player-only scoring readout with two mirrored health bars, each
carrying its own pending damage read from the same function that produces the applied damage, and make
that damage visibly land at the end of every Hunt.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder
(approved at the gate, 2026-08-12).

---

## File map

**Created:**

- `src/app/warCouncil/duelHealthBars.ts` — pure bar geometry: three health records → render-ready
  percentages. No React, no DOM, `node` Vitest project.
- `src/app/warCouncil/__tests__/duelHealthBars.test.ts` — the geometry invariants, no renderer.
- `src/app/warCouncil/DuelHealthBars.tsx` — the mirrored opposed pair, two ARIA meters, a centre slot.
- `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` — role/label queries and the accessible text.
- `src/app/warCouncil/warCouncilHealthBars.css` — the sixth stylesheet; `warCouncilHunt.css` is at 307
  lines and cannot absorb a bar surface under the 400-line budget.
- `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx` — the two-stage commit and the terminal state.
  A new file because `WarCouncilRound.test.tsx` is already at 371 lines.

**Modified:**

- `src/app/warCouncil/labels.ts:1-11,66-70` — add `HEALTH_BAR_LABEL`, `healthBarValueText`,
  `APPLY_DAMAGE_LABEL`, `FINISH_ROUND_LABEL`, `ENCOUNTER_OUTCOME`.
- `src/app/warCouncil/__tests__/labels.test.ts` — cover the three accessible-text branches.
- `src/app/warCouncil/warCouncil.css:11-36` — six new `--wc-hp-*` tokens in the existing `:root`.
- `src/app/warCouncil/roundReducer.ts:1-19,26-33,40-54,62-86` — `applied: EncounterState | null` and
  the `CommitDamage` action, which calls `applyHunt`.
- `src/app/warCouncil/__tests__/roundReducer.test.ts` — the commit, and both no-op guards.
- `src/app/warCouncilMount.ts` — `encounter` and `maxHealth` in; `damage` out, `encounter` back.
- `src/app/warCouncil/HuntLedger.tsx` — the Standing readout only: Spoils cell, both operators and the
  Damage cell retire. **Deletes the `spoils * band.multiplier` product**, which bypassed `roundDamage`.
- `src/app/warCouncil/__tests__/HuntLedger.test.tsx` — rewritten for the stripped shape.
- `src/app/warCouncil/warCouncilHunt.css:15-64,231-247` — delete `.wc-ledger-op`; add the felt fix.
- `src/app/warCouncil/RoundStatusBand.tsx` — mount `DuelHealthBars` with the trick trio as its centre;
  `spoils`/`band`/`table` out, `bars` in.
- `src/app/warCouncil/RoundOverPanel.tsx` — the AC4 second stage and the resolved-encounter terminal.
- `src/app/warCouncil/WarCouncilRound.tsx` — one `pendingHuntDamage` replaces two `scoreHunt`; the
  projection; the ledger's new home; the sixth stylesheet import.
- `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx` — the AC2 no-drift assertion end to end.
- `src/app/warCouncil/__tests__/roundFixture.ts` — add `encounterFixture` and `maxHealthFixture`.
- `src/App.tsx` — own the `EncounterState`, seed it from `startEncounter`, carry it Hunt to Hunt.

**Deleted:** _(none — `HuntLedger.tsx` is reshaped, not retired, so `StandingTrack.tsx` and
`warCouncilStandingTrack.css` stay untouched. See `plan.md` Part 1 → the audit.)_

**Developer decides or observes:**

- `warCouncil.css` → `--wc-hp-track`, `--wc-hp-secure-fill`, `--wc-hp-pending-fill`,
  `--wc-hp-lethal-edge`, `--wc-hp-height`, `--wc-hp-move-ms` — six visual values. Tasks ship the
  mockup's placeholders drawn from the existing palette; **no task invents one.**
- **Whether the mirrored pair in the status row reads as tension or as clutter** (§6's named pause
  condition). Measurement: can a playtester say who is ahead, and tell a fast Hunt from a stalling one,
  from the bars alone? First yes and second no means the net-bar fallback is free to take.
- **Whether the Standing track reads cramped in the `minmax(10rem, 17vw)` dossier column.**
  Alternatives: a new `auto` grid row for the bars (costs vertical space) or the compact cell at all
  widths.
- **Whether the one extra press per Hunt earns its beat**, on top of the declare gate and "Let them
  lead" the module doc already flags as unjudged.
- **The `align-items: flex-start` felt fix top-aligns the felt's content** at 680×520 and 700×544
  instead of centring it (Task 12). Accept the visual change, or take the module doc's other candidate
  — scoping the stretch/scroll to the end-panel state alone.
- **`ENCOUNTER_OUTCOME`'s two strings are placeholder copy** for the terminal state.
- **`SLICE_ENCOUNTER_INDEX = 0` in `App.tsx` is a placeholder, not a config key** — DLR-73 replaces it
  with the encounter loop.

---

## Phase 1 — The two leaf modules

Both files here are leaves: nothing imports them yet, so the phase ends type-checking with no
half-applied prop change anywhere. Pure geometry and display copy, both in the cheap `node` Vitest
project, both test-first because both carry invariants worth stating as assertions.

### Task 1: Add `duelHealthBars` to `src/app/warCouncil/duelHealthBars.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/duelHealthBars.ts`
- Test: `src/app/warCouncil/__tests__/duelHealthBars.test.ts`

- [x] **Step 1: Write the failing spec for the geometry invariants**

Create `src/app/warCouncil/__tests__/duelHealthBars.test.ts`. `standingSegments.test.ts` is the shape
to match — plain function-in, value-out, no renderer.

```ts
import { describe, expect, it } from 'vitest'
import { DuelSide, type Health } from '../../../hunt'
import { duelHealthBars } from '../duelHealthBars'

const MAX: Readonly<Record<DuelSide, Health>> = {
  [DuelSide.Player]: 1350,
  [DuelSide.Quarry]: 1350,
}

describe('duelHealthBars — one view per side, player first', () => {
  it('returns the player then the Quarry, so the mirror’s order is not a caller’s choice', () => {
    const views = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(views.map((v) => v.side)).toEqual([DuelSide.Player, DuelSide.Quarry])
  })
})

describe('duelHealthBars — pending is carved out of current health', () => {
  it('secure and pending sum to exactly current health as a percentage of max', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 1062, [DuelSide.Quarry]: 810 },
      { [DuelSide.Player]: 966, [DuelSide.Quarry]: 270 },
      MAX,
    )
    expect(player.pending).toBe(96)
    expect(player.securePct + player.pendingPct).toBeCloseTo((1062 / 1350) * 100, 10)
  })

  it('shrinks the pending segment when a tenth trick collapses the band (540 → 60)', () => {
    const atPeak = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 810 },
      MAX,
    )[1]
    const pastCliff = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1290 },
      MAX,
    )[1]
    expect(atPeak.pending).toBe(540)
    expect(pastCliff.pending).toBe(60)
    expect(pastCliff.pendingPct).toBeLessThan(atPeak.pendingPct)
  })

  it('reports no pending at all before a declaration, rather than a zero-width segment lie', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(player.pending).toBe(0)
    expect(player.pendingPct).toBe(0)
    expect(player.securePct).toBe(100)
  })
})

describe('duelHealthBars — lethal is a state of the bar, not a colour', () => {
  it('marks a side lethal when the pending damage empties it', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 96, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(player.lethal).toBe(true)
    expect(player.pendingPct).toBeCloseTo((96 / 1350) * 100, 10)
  })

  it('is not lethal at zero health with nothing pending — that side is already dead', () => {
    const [player] = duelHealthBars(
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
      MAX,
    )
    expect(player.lethal).toBe(false)
  })
})

describe('duelHealthBars — the only divisor is guarded', () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a max of %s rather than emitting a NaN width',
    (bad) => {
      expect(() =>
        duelHealthBars(
          { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
          { [DuelSide.Player]: 10, [DuelSide.Quarry]: 10 },
          { [DuelSide.Player]: bad, [DuelSide.Quarry]: 1350 },
        ),
      ).toThrow(RangeError)
    },
  )
})
```

- [x] **Step 2: Run the spec and confirm it fails on the missing module, not on an assertion**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts --project node`
Expected: non-zero exit, failing to resolve `../duelHealthBars`.

- [x] **Step 3: Write `duelHealthBars.ts`**

Create `src/app/warCouncil/duelHealthBars.ts`. It imports **types only** from `../../hunt` plus the
`DuelSide` value map — no React, no DOM global, so it runs in the `node` project beside
`standingSegments.ts` and `handOrder.ts`.

```ts
import { DuelSide, type Damage, type Health } from '../../hunt'

/** The two sides, in the order the mirror draws them. Player anchors the left edge, the Quarry
 *  the right, and both deplete toward the centre. */
const BAR_ORDER: readonly DuelSide[] = [DuelSide.Player, DuelSide.Quarry]

/** One side's bar, ready to render. Percentages are of that side's OWN maximum, so the pair stays
 *  comparable by length only while `P = H` holds in config — a fact these views read, never
 *  assume. */
export interface HealthBarView {
  readonly side: DuelSide
  /** Health that survives this Hunt — the solid part of the bar. */
  readonly secure: Health
  /** Health at risk but not yet lost — the lighter segment, carved out of current health. */
  readonly pending: Damage
  readonly current: Health
  readonly max: Health
  readonly securePct: number
  /** `securePct + pendingPct === current / max × 100`, exactly — asserted by the spec. */
  readonly pendingPct: number
  /** This Hunt's pending damage would empty the bar. Rendered as a form change, never colour
   *  alone (`game-ux`). */
  readonly lethal: boolean
}

/**
 * Converts three health records into render geometry.
 *
 * Performs NO damage arithmetic and NO clamping: `applyHunt` — DLR-70's single clamp point — did
 * both before `projected` arrived. That is what keeps DLR-71 AC2's single-function guarantee
 * intact, and it is what DLR-70's own `applyHunt` docblock asks of this caller.
 *
 * Refuses a non-positive or non-finite `max`. The division by `max` is the only one here, and a
 * `NaN` percentage collapses a bar to nothing while logging nothing anywhere — the same reasoning
 * `standingSegments` uses for an empty table. Both configured maxima are positive, so this is a
 * guard rather than a live path.
 *
 * Returns an ARRAY, which is what makes §6's net-only fallback (AC8) a one-line change here —
 * return a single view whose `pending` is the net — rather than a rewrite in the component.
 */
export function duelHealthBars(
  current: Readonly<Record<DuelSide, Health>>,
  projected: Readonly<Record<DuelSide, Health>>,
  max: Readonly<Record<DuelSide, Health>>,
): readonly HealthBarView[] {
  return BAR_ORDER.map((side) => {
    const sideMax = max[side]
    if (!Number.isFinite(sideMax) || sideMax <= 0) {
      throw new RangeError(
        `Cannot draw the ${side}'s health bar against a maximum of ${sideMax}: it must be a positive finite number`,
      )
    }

    const secure = projected[side]
    const pending = current[side] - secure

    return {
      side,
      secure,
      pending,
      current: current[side],
      max: sideMax,
      securePct: (secure / sideMax) * 100,
      pendingPct: (pending / sideMax) * 100,
      lethal: pending > 0 && secure <= 0,
    }
  })
}
```

- [x] **Step 4: Run the spec and the type gate**

Run: `npx vitest run src/app/warCouncil/__tests__/duelHealthBars.test.ts --project node; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

### Task 2: Add the bars' display copy to `src/app/warCouncil/labels.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/labels.ts:1-11,66-70`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Add the copy exports beside `STANDING_TRACK_LABEL`**

In `labels.ts`, widen the `../../hunt` import to bring in `DuelSide`, add
`import type { HealthBarView } from './duelHealthBars'`, and append the block below after
`STANDING_TRACK_LABEL` (line 69). Every string here is display copy; the numbers all arrive on the
view.

```ts
/** AC1/AC7 — each bar's accessible name. The two must differ, because `getByRole('meter', …)`
 *  is how the spec distinguishes them. */
export const HEALTH_BAR_LABEL: Readonly<Record<DuelSide, string>> = {
  [DuelSide.Player]: 'Your health',
  [DuelSide.Quarry]: 'The Quarry’s health',
}

/**
 * AC7's one sentence: both the current and the pending figure, for a reader who cannot see the
 * bar's two segments. `aria-valuenow` can carry only one number, so the second lives here.
 *
 * "Nothing at risk yet" rather than "0 at risk": before the declaration there is no table to read
 * and `pendingHuntDamage` returns `null`, which is a different state from a Hunt that genuinely
 * threatens nothing.
 */
export function healthBarValueText(view: HealthBarView): string {
  const standing = `${view.current} of ${view.max}.`
  if (view.lethal) return `${standing} Lethal this Hunt.`
  if (view.pending === 0) return `${standing} Nothing at risk yet.`
  return `${standing} ${view.pending} at risk this Hunt.`
}

/** The end panel's two-stage control (AC4). Stage one commits the damage so the bars can be seen
 *  to move; stage two leaves the Hunt. */
export const APPLY_DAMAGE_LABEL = 'Apply the damage'
export const FINISH_ROUND_LABEL = 'Deal the next Hunt'

/** The terminal state when a bar empties. Keyed by the winner `applyHunt` resolved — the tie is
 *  already decided by `SIMULTANEOUS_DEPLETION_WINNER`, so there is no third case here.
 *  Placeholder copy: the wording is the developer's. */
export const ENCOUNTER_OUTCOME: Readonly<Record<DuelSide, string>> = {
  [DuelSide.Player]: 'The Quarry is down. The encounter is yours.',
  [DuelSide.Quarry]: 'You are down. The run ends here.',
}
```

- [x] **Step 2: Cover all three branches of `healthBarValueText`**

Append to `src/app/warCouncil/__tests__/labels.test.ts`:

```ts
describe('healthBarValueText — both figures in one sentence (AC7)', () => {
  const base = {
    side: DuelSide.Player,
    secure: 966,
    pending: 96,
    current: 1062,
    max: 1350,
    securePct: 71.5,
    pendingPct: 7.1,
    lethal: false,
  }

  it('names the current total and the pending figure', () => {
    expect(healthBarValueText(base)).toBe('1062 of 1350. 96 at risk this Hunt.')
  })

  it('distinguishes an undeclared Hunt from one that threatens nothing', () => {
    expect(healthBarValueText({ ...base, pending: 0, secure: 1062 })).toBe(
      '1062 of 1350. Nothing at risk yet.',
    )
  })

  it('says lethal rather than making the reader compare two numbers', () => {
    expect(healthBarValueText({ ...base, secure: 0, pending: 1062, lethal: true })).toBe(
      '1062 of 1350. Lethal this Hunt.',
    )
  })
})
```

- [x] **Step 3: Run the two node specs and the type gate**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts src/app/warCouncil/__tests__/duelHealthBars.test.ts --project node; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

---

## Phase 2 — The bars on screen, not yet mounted

The stylesheet and the component. `DuelHealthBars` is written and tested but nothing renders it yet, so
this phase also ends type-checking with no half-applied prop change. Writing the sheet before the
component is deliberate: the component sets two custom properties and never an inline `width`, and the
sheet is what gives those properties meaning.

### Task 3: Add the six tokens and the sixth stylesheet ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/warCouncilHealthBars.css`
- Modify: `src/app/warCouncil/warCouncil.css:11-36` — six tokens in the existing `:root`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:41` — the import line only

- [x] **Step 1: Add the six tokens to `warCouncil.css`'s `:root`**

Insert after `--wc-plate-card-w` (line 35), inside the existing `:root` block. **All six values are
the developer's** — these are the mockup's placeholders, drawn from the palette already in this file.

```css
  /* DLR-71 — the duel health bars. Every value below is a placeholder transcribed from
     `.claude/contract/DLR-71-two-health-bars-with-pending-damage/mockup.html` and is the
     developer's to retune; the visual polish ticket owns them. */
  --wc-hp-track: #0a1211;
  --wc-hp-secure-fill: #c99a4e;
  --wc-hp-pending-fill: #8b9a94;
  --wc-hp-lethal-edge: #d1705f;
  --wc-hp-height: clamp(0.7rem, 1.7vmin, 1.05rem);
  --wc-hp-move-ms: 620ms;
```

- [x] **Step 2: Create `warCouncilHealthBars.css`**

Transcribe the `.wc-hp*` block from `mockup.html`'s stylesheet — the rules from `.wc-hp` through
`.wc-hp-sr`, plus the `.wc-hp` rule inside the narrow/short media query and the
`prefers-reduced-motion` suppression. Open the file with a header in the shape the other five use,
naming why it exists:

```css
/* War Council — the duel's two health bars, each carrying its own pending damage as a lighter
   segment carved out of its own current health (DLR-71, hybrid-design.md §6).

   The SIXTH stylesheet. `warCouncilHunt.css` stood at 307 lines and a full bar surface — track,
   two segments, the lethal state, the movement transition, its reduced-motion suppression and its
   own narrow-viewport block — would have carried it past the 400-line budget, which is the same
   forced split that produced the fourth and fifth sheets. Imported from the mount AFTER
   `warCouncilHunt.css`. Tokens live in `warCouncil.css`; nothing here redeclares `:root`.

   Carries its own copy of the `@media (max-width: 44rem), (max-height: 34rem)` breakpoint, the
   same duplication `warCouncilStandingTrack.css` already makes. The VALUE now lives in three
   files — a three-file edit if the threshold is ever tuned, and the split's one real drift risk. */
```

Three rules in it are load-bearing and must not be simplified away:

- `.wc-hp[data-side='quarry'] .wc-hp-track { flex-direction: row-reverse }` — **this is the whole of
  the mirror.** Both bars deplete toward the centre of the screen.
- `.wc-hp-secure, .wc-hp-pending { flex: 0 0 var(--w); width: var(--w); transition: … }` — the
  movement AC4 asks for is this transition firing on a declarative re-render. There is no effect and
  no timer anywhere in this feature.
- `.wc-hp-pending.wc-is-lethal` carries a `repeating-linear-gradient` hatch **and** an inset
  `box-shadow` edge, so the lethal state survives greyscale and `prefers-reduced-motion`.

- [x] **Step 3: Import the new sheet from the mount**

In `WarCouncilRound.tsx`, add the sixth import immediately after the fifth (line 41). Import order is
load-bearing in this module and a missing import leaves the feature silently unstyled with no error
anywhere — see `.docs/implementation/war-council-ui/layout-and-styling.md`.

```ts
import './warCouncilStandingTrack.css'
import './warCouncilHealthBars.css'
```

- [x] **Step 4: Confirm no banned unit or stray literal entered the sheets, and both stay in budget**

Run: `Get-ChildItem src\app\warCouncil -Include *.css -Recurse | Select-String -Pattern "\d+vh\b|\d+vw\b"`
Expected: zero hits.

Run: `(Get-Content src\app\warCouncil\warCouncilHealthBars.css).Count; (Get-Content src\app\warCouncil\warCouncil.css).Count`
Expected: both under 400. **Use `(Get-Content <path>).Count`, never `Measure-Object -Line`** — the
latter drops blank lines and has already hidden a real breach in this exact stylesheet family.

### Task 4: Add `DuelHealthBars` to `src/app/warCouncil/DuelHealthBars.tsx` ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Create: `src/app/warCouncil/DuelHealthBars.tsx`
- Test: `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx`

- [x] **Step 1: Write the component**

Follow `RoundOverPanel.tsx`'s shape exactly — one default export, one private per-side sub-component
below it. It computes nothing: every number arrives on the `HealthBarView`.

```tsx
import type { ReactNode } from 'react'
import type { HealthBarView } from './duelHealthBars'
import { HEALTH_BAR_LABEL, healthBarValueText } from './labels'

interface DuelHealthBarsProps {
  readonly bars: readonly HealthBarView[]
  /** Rendered BETWEEN the two opposed bars — the `You · Trick · Them` trio, which is the
   *  fighting-game centre slot. The mirror's geometry lives here rather than being reassembled
   *  by the caller. */
  readonly centre: ReactNode
}

/**
 * The duel's two health bars as a mirrored opposed pair (§6, `ideas.md`'s Tekken entry): the
 * player's anchored to the left edge, the Quarry's to the right, both depleting toward the centre.
 *
 * Each bar carries its OWN pending damage as a lighter segment carved out of its own current
 * health — the fighting-game recoverable-damage grammar. That is what keeps §6's four-figures risk
 * to two moving widgets rather than four, and it is what makes AC3's "health lost versus health at
 * risk" a distinction inside one bar rather than a comparison across two readouts.
 *
 * Computes nothing. `duelHealthBars` derived every percentage, and `applyHunt` did every clamp and
 * every subtraction before that. Renders whatever length of `bars` it is handed, which is what
 * makes §6's net-only fallback (AC8) a one-line change in `duelHealthBars` rather than here.
 */
export default function DuelHealthBars({ bars, centre }: DuelHealthBarsProps) {
  const [player, quarry] = bars
  return (
    <>
      {player ? <SideBar view={player} /> : null}
      {centre}
      {quarry ? <SideBar view={quarry} /> : null}
    </>
  )
}

/**
 * One side's bar. `role="meter"` is the ARIA role for a bounded reading that is not a task's
 * progress, and it is directly queryable by role and name (AC7).
 *
 * The two segment widths are set as CSS custom properties carrying ready-made percentage strings,
 * never as an inline `width`. An inline style property outranks an external rule with no
 * `!important`, so writing `width` here would make the stylesheet's own transition and lethal
 * state permanently unreachable — the exact defect `HandFan`'s transform split exists to avoid
 * (see `.docs/implementation/war-council-ui/layout-and-styling.md`).
 */
function SideBar({ view }: { view: HealthBarView }) {
  return (
    <div className="wc-hp" data-side={view.side}>
      <div className="wc-hp-head">
        <span className="wc-hp-who">{HEALTH_BAR_LABEL[view.side]}</span>
        <span className="wc-hp-num">
          {view.current} / {view.max}
        </span>
      </div>
      <div
        className="wc-hp-track"
        role="meter"
        aria-label={HEALTH_BAR_LABEL[view.side]}
        aria-valuemin={0}
        aria-valuemax={view.max}
        aria-valuenow={view.current}
        aria-valuetext={healthBarValueText(view)}
      >
        <span
          className="wc-hp-secure"
          style={{ '--w': `${view.securePct}%` } as React.CSSProperties}
        />
        <span
          className={`wc-hp-pending${view.lethal ? ' wc-is-lethal' : ''}`}
          style={{ '--w': `${view.pendingPct}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
```

- [x] **Step 2: Write the component spec, querying by role and label only**

Create `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` in the `dom` project. Build the views
through `duelHealthBars` rather than hand-writing them, so the spec cannot assert a geometry the
helper would never produce.

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DuelSide } from '../../../hunt'
import { duelHealthBars } from '../duelHealthBars'
import DuelHealthBars from '../DuelHealthBars'

const MAX = { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 }

function renderPair(current: Record<DuelSide, number>, projected: Record<DuelSide, number>) {
  return render(
    <DuelHealthBars bars={duelHealthBars(current, projected, MAX)} centre={<span>trio</span>} />,
  )
}

describe('DuelHealthBars', () => {
  it('puts both sides on screen as separately named meters (AC1, AC7)', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1254, [DuelSide.Quarry]: 810 },
    )
    expect(screen.getByRole('meter', { name: 'Your health' })).toBeTruthy()
    expect(screen.getByRole('meter', { name: 'The Quarry’s health' })).toBeTruthy()
  })

  it('renders the centre slot between the two bars', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
    )
    expect(screen.getByText('trio')).toBeTruthy()
  })

  it('reads both the current and the pending figure to a screen reader (AC7)', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1254, [DuelSide.Quarry]: 810 },
    )
    const quarry = screen.getByRole('meter', { name: 'The Quarry’s health' })
    expect(quarry.getAttribute('aria-valuenow')).toBe('1350')
    expect(quarry.getAttribute('aria-valuemax')).toBe('1350')
    expect(quarry.getAttribute('aria-valuetext')).toBe('1350 of 1350. 540 at risk this Hunt.')
  })

  it('says nothing is at risk before a declaration rather than reporting a zero', () => {
    renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
    )
    expect(
      screen.getByRole('meter', { name: 'Your health' }).getAttribute('aria-valuetext'),
    ).toBe('1350 of 1350. Nothing at risk yet.')
  })

  it('marks a lethal pending total in form as well as in text (AC3)', () => {
    const { container } = renderPair(
      { [DuelSide.Player]: 96, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 0, [DuelSide.Quarry]: 1350 },
    )
    expect(
      screen.getByRole('meter', { name: 'Your health' }).getAttribute('aria-valuetext'),
    ).toBe('96 of 1350. Lethal this Hunt.')
    expect(container.querySelectorAll('.wc-hp-pending.wc-is-lethal')).toHaveLength(1)
  })

  it('sets the two segment widths as custom properties, never as an inline width', () => {
    const { container } = renderPair(
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 1350 },
      { [DuelSide.Player]: 1350, [DuelSide.Quarry]: 810 },
    )
    const pending = container.querySelector<HTMLElement>(
      '.wc-hp[data-side="quarry"] .wc-hp-pending',
    )
    expect(pending?.style.getPropertyValue('--w')).toBe('40%')
    expect(pending?.style.width).toBe('')
  })
})
```

- [x] **Step 3: Run the dom spec and the type gate**

Run: `npx vitest run src/app/warCouncil/__tests__/DuelHealthBars.test.tsx --project dom; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

---

## Phase 3 — Wire the prop chain, the commit, and the encounter

The atomic phase. The mount props, `App.tsx`, `WarCouncilRound`, `RoundStatusBand`, `HuntLedger`,
`roundReducer` and `RoundOverPanel` all change together, because the prop chain cannot be split without
leaving a boundary where the project does not compile. Individual tasks inside this phase may
transiently fail `typecheck`; **the phase does not end until it passes.** Work them in order — each
later task consumes the shape the earlier one declared.

### Task 5: Add the commit transition to `src/app/warCouncil/roundReducer.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts:1-19,26-33,40-54,62-86`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [x] **Step 1: Add `applied` to the state and `CommitDamage` to the action union**

Import `applyHunt`, `isEncounterResolved` and `type EncounterState` and `type IncomingDamage` from
`'../../hunt'` (the file already imports `HuntDeclaration` from there). Then:

```ts
export interface RoundUiState {
  // …the six existing fields, unchanged…
  /** `null` until the player commits the finished Hunt's damage. Set by `CommitDamage`, which
   *  delegates to `applyHunt` — this module never subtracts a health value itself, so DLR-70's
   *  single clamp point stays single. */
  readonly applied: EncounterState | null
}

export const RoundUiActionKind = {
  TapCard: 'tapCard',
  ChooseAbility: 'chooseAbility',
  CancelSelection: 'cancelSelection',
  CarryOn: 'carryOn',
  Declare: 'declare',
  CommitDamage: 'commitDamage',
} as const

export type RoundUiAction =
  // …the five existing members…
  | {
      readonly kind: typeof RoundUiActionKind.CommitDamage
      readonly encounter: EncounterState
      /** Already keyed by the side it depletes — `duelSideDamage` performed that crossing, so
       *  this reducer cannot get it backwards. */
      readonly incoming: IncomingDamage
    }
```

Add `applied: null` to `createRoundUiState`'s returned object, and the branch to `roundReducer`'s
switch:

```ts
    case RoundUiActionKind.CommitDamage:
      return handleCommitDamage(state, action.encounter, action.incoming)
```

- [x] **Step 2: Add the handler with both guards**

Below `handleDeclare`:

```ts
/**
 * AC4's first stage: the finished Hunt's damage applied once, so the bars can be seen to move
 * before the screen changes.
 *
 * Both guards return the input state rather than letting `applyHunt`'s `RangeError` escape — a
 * throw inside a reducer during an event handler unmounts the tree. Neither is a live path: the
 * panel only renders the control while `applied === null`, and `App` stops dealing once the
 * encounter resolves. They are here because a guard that costs two comparisons is cheaper than a
 * blank screen.
 */
function handleCommitDamage(
  state: RoundUiState,
  encounter: EncounterState,
  incoming: IncomingDamage,
): RoundUiState {
  if (state.applied !== null || isEncounterResolved(encounter)) {
    return state
  }
  return { ...state, applied: applyHunt(encounter, incoming) }
}
```

- [x] **Step 3: Cover the commit and both no-ops**

Append to `src/app/warCouncil/__tests__/roundReducer.test.ts`. Import `startEncounter`, `DuelSide` and
`isEncounterResolved` from `'../../../hunt'`.

```ts
describe('CommitDamage — the Hunt lands once, through applyHunt', () => {
  const incoming = { [DuelSide.Player]: 96, [DuelSide.Quarry]: 540 }

  function commit(state: RoundUiState, encounter = startEncounter(0)) {
    return roundReducer(state, { kind: RoundUiActionKind.CommitDamage, encounter, incoming })
  }

  it('depletes both bars from the encounter it was handed', () => {
    const next = commit(createRoundUiState(makeRound()))
    expect(next.applied?.health).toEqual({
      [DuelSide.Player]: 1350 - 96,
      [DuelSide.Quarry]: 1350 - 540,
    })
    expect(next.applied?.huntsApplied).toBe(1)
  })

  it('resolves the encounter when a bar empties, rather than going negative', () => {
    const next = roundReducer(createRoundUiState(makeRound()), {
      kind: RoundUiActionKind.CommitDamage,
      encounter: startEncounter(0),
      incoming: { [DuelSide.Player]: 0, [DuelSide.Quarry]: 99_999 },
    })
    expect(next.applied?.health[DuelSide.Quarry]).toBe(0)
    expect(isEncounterResolved(next.applied!)).toBe(true)
  })

  it('is a no-op the second time, so one Hunt cannot be applied twice', () => {
    const once = commit(createRoundUiState(makeRound()))
    expect(commit(once)).toBe(once)
  })

  it('is a no-op against an already-resolved encounter instead of throwing', () => {
    const resolved = { ...startEncounter(0), winner: DuelSide.Player }
    const state = createRoundUiState(makeRound())
    expect(commit(state, resolved)).toBe(state)
  })

  it('leaves applied untouched on every other action', () => {
    const state = createRoundUiState(makeRound())
    expect(roundReducer(state, { kind: RoundUiActionKind.CancelSelection }).applied).toBeNull()
  })
})
```

- [x] **Step 4: Run the reducer spec and measure the file**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts --project node`
Expected: Vitest reports 0 failed.

Run: `(Get-Content src\app\warCouncil\__tests__\roundReducer.test.ts).Count; (Get-Content src\app\warCouncil\roundReducer.ts).Count`
Expected: both under 400. The spec started at 324 — if it crosses, carve
`src/app/warCouncil/__tests__/roundReducer.commit.test.ts` and move this `describe` into it rather
than compressing the assertions.

### Task 6: Reshape the mount contract in `src/app/warCouncilMount.ts` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncilMount.ts`
- Test: `src/app/warCouncil/__tests__/roundFixture.ts` — add the two fixtures every later spec needs

- [x] **Step 1: Rewrite the two interfaces**

`PlayerSide` becomes unused here once `damage` goes — drop that import rather than leaving it to trip
`@typescript-eslint/no-unused-vars`.

```ts
import type { DuelSide, EncounterState, Health, Hunt } from '../hunt'
import type { WarCouncilState } from '../warCouncil'

export interface WarCouncilMountProps {
  readonly initialState: WarCouncilState
  /** The encounter's Quarry (§4). The Demand and the Lose-credit pool were retired on DLR-67. */
  readonly hunt: Hunt
  /** The live encounter this Hunt is fought inside (DLR-71). Health only changes at trick 13, so
   *  this is constant for the whole round. */
  readonly encounter: EncounterState
  /** Each side's configured maximum, for the bars' denominator. NOT derivable from
   *  `EncounterState`, which carries current health only. */
  readonly maxHealth: Readonly<Record<DuelSide, Health>>
  readonly onComplete: (result: WarCouncilRoundResult) => void
}

export interface WarCouncilRoundResult {
  readonly finalState: WarCouncilState // finalState.phase === RoundPhase.Complete
  /** The encounter AFTER this Hunt's damage was applied — the state the player just watched land.
   *  Replaces DLR-67's `damage: Readonly<Record<PlayerSide, number>>`, which had one producer and
   *  no consumer: handing up the applied state makes applying one Hunt twice unexpressible rather
   *  than merely unlikely. */
  readonly encounter: EncounterState
}
```

- [x] **Step 2: Add the two shared fixtures**

Append to `src/app/warCouncil/__tests__/roundFixture.ts`, importing `startEncounter`,
`PLAYER_START_HEALTH`, `quarryHealthForEncounter` and `DuelSide` from `'../../../hunt'`:

```ts
/** A fresh encounter for component specs — both bars full, nothing applied. */
export const encounterFixture = startEncounter(0)

/** The configured maxima, read from config rather than written as numbers (AC5). */
export const maxHealthFixture = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(0),
}
```

- [x] **Step 3: Confirm the old field name is gone everywhere it was read** (transient hit at `WarCouncilRound.tsx:125` cleared by Task 10 — see Implementer report)

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "result\.damage|damage:\s*\{"`
Expected: zero hits. Use the recursive `Get-ChildItem` form — `Select-String -Path` does not recurse
and its `**` matches exactly one directory level, which produces a false green on this exact check.

### Task 7: Strip `src/app/warCouncil/HuntLedger.tsx` to the Standing readout ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/HuntLedger.tsx`
- Modify: `src/app/warCouncil/warCouncilHunt.css:15-64` — delete `.wc-ledger-op` only
- Test: `src/app/warCouncil/__tests__/HuntLedger.test.tsx`

**Do not touch `StandingTrack.tsx` or `warCouncilStandingTrack.css`.** Keeping the `wc-ledger-cell`
and `wc-is-compact` class names is the whole reason this component is reshaped rather than retired —
that sheet owns the compact cell's narrow-viewport rules and binds to those names by string. See
`plan.md` Part 1 → the audit.

- [x] **Step 1: Delete the Spoils cell, both operators, and the Damage cell**

Rewrite `HuntLedger.tsx`. `spoils` leaves the props; `band`, `table` and `tricks` stay. The
`const damage = spoils * band.multiplier` line goes with them — **that product bypassed `roundDamage`
and is the second arithmetic path AC2 forbids.** The bars carry that number now.

```tsx
import type { StandingBand } from '../../hunt'
import { STANDING_BAND_NAME } from './labels'
import StandingTrack from './StandingTrack'

interface HuntLedgerProps {
  readonly band: StandingBand
  readonly table: readonly StandingBand[]
  readonly tricks: number
}

/**
 * The Standing readout: which multiplier table is in force and where the player's trick count sits
 * in it. Computes nothing — `resolveStanding` derived the band and `standingSegments` derives the
 * track's geometry.
 *
 * DLR-71 stripped this to the Standing half and moved it out of the status band into the dossier
 * column. Its Spoils cell, its two operators and its Damage cell are gone: the health bars now
 * carry the running figure, and this component's `spoils * band.multiplier` was a second
 * arithmetic path that bypassed `roundDamage` (AC2). The Demand and Lose-credit cells went on
 * DLR-67.
 *
 * Still renders BOTH the track and the compact cell — the breakpoint in
 * `warCouncilStandingTrack.css` shows exactly one, so there is no `matchMedia`, no resize listener
 * and nothing to clean up. Their accessible labels differ deliberately: jsdom applies no CSS, so
 * both are in the accessibility tree during a component test.
 */
export default function HuntLedger({ band, table, tricks }: HuntLedgerProps) {
  const bandName = STANDING_BAND_NAME[band.name]

  return (
    <div className="wc-ledger" role="group" aria-label="Standing">
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
    </div>
  )
}
```

- [x] **Step 2: Delete `.wc-ledger-op` from `warCouncilHunt.css`**

Remove the whole `.wc-ledger-op { … }` rule (lines 58-64) — the two operators it styled are gone.
**Keep `.wc-ledger`, `.wc-ledger-cell`, `.wc-ledger-cell.wc-is-band`, `.wc-ledger-key` and
`.wc-ledger-value`:** the compact cell still uses all five, and `warCouncilStandingTrack.css`
selects on two of them.

- [x] **Step 3: Rewrite the spec for the stripped shape**

Replace `src/app/warCouncil/__tests__/HuntLedger.test.tsx`'s body. Keep the existing import of
`resolveStanding` and `standingTableFor`; assert the Standing readout and assert the retired cells are
**gone**, so a future revert is caught.

```tsx
describe('HuntLedger — the Standing readout only (DLR-71)', () => {
  const winTable = standingTableFor(HuntDeclaration.Win)

  it('names the band and its multiplier for a screen reader', () => {
    render(<HuntLedger band={resolveStanding(7, winTable)} table={winTable} tricks={7} />)
    expect(screen.getByLabelText('Standing band: Victorious, multiplier 5')).toBeTruthy()
  })

  it('renders the whole configured table as a track beside the compact cell', () => {
    render(<HuntLedger band={resolveStanding(7, winTable)} table={winTable} tricks={7} />)
    expect(screen.getByRole('group', { name: 'Standing track' })).toBeTruthy()
  })

  it('no longer shows Spoils or Damage — the health bars carry those now', () => {
    render(<HuntLedger band={resolveStanding(7, winTable)} table={winTable} tricks={7} />)
    expect(screen.queryByText('Spoils')).toBeNull()
    expect(screen.queryByText('Damage')).toBeNull()
  })
})
```

- [x] **Step 4: Run the ledger spec**

Run: `npx vitest run src/app/warCouncil/__tests__/HuntLedger.test.tsx --project dom`
Expected: Vitest reports 0 failed. `typecheck` will still fail at this point — `RoundStatusBand` has
not yet stopped passing `spoils`. That is Task 8.

### Task 8: Rebuild `src/app/warCouncil/RoundStatusBand.tsx` around the mirrored pair ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Modify: `src/app/warCouncil/RoundStatusBand.tsx`
- Modify: `src/app/warCouncil/warCouncilHunt.css:231-247` — the narrow-viewport block gains `.wc-hp`

- [x] **Step 1: Swap the ledger for the bars, with the trick trio as their centre** (required the explicit `.ts`/`.tsx` extensions on the `duelHealthBars`/`DuelHealthBars` imports to dodge the Windows case-collision trap)

The band becomes `[opponent plate] [player bar] [You · Trick · Them] [quarry bar]`, per
`mockup.html`'s status band. `spoils`, `band` and `table` leave the props; `bars` arrives. `HuntLedger`
is no longer mounted here — Task 10 mounts it in the dossier.

```tsx
import { PlayerSide } from '../../warCouncil'
import type { HealthBarView } from './duelHealthBars'
import DuelHealthBars from './DuelHealthBars'

const MAX_VISIBLE_OPPONENT_BACKS = 8

interface RoundStatusBandProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly tricksPlayed: number
  readonly opponentHandCount: number
  readonly roundComplete: boolean
  readonly bars: readonly HealthBarView[]
}
```

Keep the existing `.wc-plate` block and the `trickNumber` clamp verbatim. Replace the `.wc-score`
element and the `<HuntLedger …/>` line with:

```tsx
      <DuelHealthBars
        bars={bars}
        centre={
          <div className="wc-score" role="group" aria-label="Tricks won">
            {/* …the three existing cells, unchanged… */}
          </div>
        }
      />
```

The band's own `justify-content: space-between` must become the mockup's `align-items: center` with
`flex-wrap: nowrap`, since the bars now flex to fill rather than sitting at the two ends.

- [x] **Step 2: Let the bars compress before they push, at narrow widths** (the `.wc-hp { flex: 1 1
  40% }` copy this step added to `warCouncilHunt.css` was removed in the review fix pass as
  unreachable — `warCouncilHealthBars.css` is imported after this sheet and carries the identical
  rule at identical specificity inside its own copy of the same breakpoint, so that later rule
  always won. The rule's one home is `warCouncilHealthBars.css`; `warCouncilHunt.css` now carries
  only a comment pointing there. The work described below was done and then superseded — left
  ticked because it was completed as specified before the finding.)

In `warCouncilHunt.css`'s existing `@media (max-width: 44rem), (max-height: 34rem)` block, add
`.wc-hp { flex: 1 1 40% }` alongside the `flex-wrap: wrap` already on `.wc-status`. This band's
documented failure mode is over-fullness at phone width — DLR-53 measured its content at 744px against
a 500px viewport with one readout rendered entirely off-screen and no scrollbar to reveal it, because
`.wc-shell`'s `overflow: hidden` converts an overflow bug into an invisibility bug. The bars carry
`min-width: 0` from `warCouncilHealthBars.css` for the same reason.

- [x] **Step 3: Typecheck the two components that now agree**

Run: `npm run typecheck`
Expected: still non-zero — `WarCouncilRound` has not yet been updated to pass `bars`. Confirm the
remaining errors name only `WarCouncilRound.tsx`, `RoundOverPanel.tsx`, `App.tsx` and their specs; an
error naming `RoundStatusBand.tsx`, `HuntLedger.tsx` or `DuelHealthBars.tsx` is a defect in Tasks 4, 7
or 8 and must be fixed before moving on.

### Task 9: Give `src/app/warCouncil/RoundOverPanel.tsx` the AC4 second stage ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Modify: `src/app/warCouncil/RoundOverPanel.tsx`
- Test: `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx` (new — `WarCouncilRound.test.tsx` is at
  371 lines and has no room)

- [x] **Step 1: Add the two-stage control and the terminal state** (used a narrowing `const winner = applied?.winner ?? null` local instead of the sketch's `applied.winner!` non-null assertion)

Props gain `applied`, `onApply`. The two `SideEquation` renders and the tricks table are unchanged —
AC4's arithmetic half already shipped on DLR-67. Import `isEncounterResolved` and `type EncounterState`
from `'../../hunt'`, and the three control strings from `./labels`.

```tsx
interface RoundOverPanelProps {
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly huntDamage: Readonly<Record<PlayerSide, HuntDamage>>
  /** `null` until the player commits. Once set, the bars have already moved. */
  readonly applied: EncounterState | null
  readonly onApply: () => void
  readonly onFinish: () => void
}
```

Replace the single `<button className="wc-decline">` with the three-way tail below. The order is the
point: AC4 asks for the arithmetic **then** the movement, so the equations are on screen before the
control that moves the bars exists.

```tsx
      {applied === null ? (
        <div className="wc-actions">
          <button type="button" className="wc-decline" onClick={onApply}>
            {APPLY_DAMAGE_LABEL}
          </button>
        </div>
      ) : isEncounterResolved(applied) ? (
        <p className="wc-terminal" role="status">
          {ENCOUNTER_OUTCOME[applied.winner!]}
        </p>
      ) : (
        <div className="wc-actions">
          <button type="button" className="wc-decline" onClick={onFinish}>
            {FINISH_ROUND_LABEL}
          </button>
        </div>
      )}
```

`applied.winner!` is safe under `isEncounterResolved`, which is exactly the statement that `winner`
is non-null — but prefer a narrowing local (`const winner = applied.winner; if (winner) …`) over the
non-null assertion if it reads cleanly, since this project treats assertions the way it treats `any`.

Add `.wc-terminal` and `.wc-actions` to `warCouncilHealthBars.css` if they are not already there from
Task 3's transcription of `mockup.html`.

- [x] **Step 2: Write the panel spec** (used `fireEvent.click` in place of the sketch's `userEvent.click` — `@testing-library/user-event` is not a project dependency; see Implementer report)

Create `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx`, using `encounterFixture` from
`roundFixture.ts`.

```tsx
describe('RoundOverPanel — arithmetic first, then the bars move (AC4)', () => {
  it('offers only the apply control while nothing is committed', () => {
    render(<RoundOverPanel {...props} applied={null} />)
    expect(screen.getByRole('button', { name: 'Apply the damage' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Deal the next Hunt' })).toBeNull()
  })

  it('shows both sides’ Spoils × Standing = Damage before anything is applied', () => {
    render(<RoundOverPanel {...props} applied={null} />)
    expect(screen.getByLabelText('You: Spoils times Standing equals Damage')).toBeTruthy()
    expect(screen.getByLabelText('Opponent: Spoils times Standing equals Damage')).toBeTruthy()
  })

  it('calls onApply once, so one Hunt is committed once', async () => {
    const onApply = vi.fn()
    render(<RoundOverPanel {...props} applied={null} onApply={onApply} />)
    await userEvent.click(screen.getByRole('button', { name: 'Apply the damage' }))
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('swaps to the finish control once the damage has landed', () => {
    render(<RoundOverPanel {...props} applied={applyHunt(encounterFixture, LIGHT)} />)
    expect(screen.getByRole('button', { name: 'Deal the next Hunt' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Apply the damage' })).toBeNull()
  })

  it('states the outcome and offers no next Hunt once a bar empties', () => {
    render(<RoundOverPanel {...props} applied={applyHunt(encounterFixture, LETHAL_TO_QUARRY)} />)
    expect(screen.getByRole('status').textContent).toContain('The Quarry is down')
    expect(screen.queryByRole('button', { name: 'Deal the next Hunt' })).toBeNull()
  })
})
```

- [x] **Step 3: Run the panel spec**

Run: `npx vitest run src/app/warCouncil/__tests__/RoundOverPanel.test.tsx --project dom`
Expected: Vitest reports 0 failed.

### Task 10: Rewire `src/app/warCouncil/WarCouncilRound.tsx` onto one derivation ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx:1-42,66-90,116-130,184-214`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Replace the two `scoreHunt` calls with one pending derivation**

Drop `scoreHunt` from the `../../warCouncil` import and add `otherSide`, `pendingHuntDamage`,
`duelSideDamage`. Add `resolveStanding` and `applyHunt` to the `../../hunt` import. Replace the
`huntDamage` block (lines 67-74) with:

```tsx
  // ONE call, not two. `pendingHuntDamage` is the same function that produces the applied damage —
  // both it and `huntDamage` delegate to `outcomeFor` — so the figure the player watches climb
  // through thirteen tricks IS the figure that lands (AC2). It returns `null` while undeclared:
  // a figure no declaration authorises is exactly what that guard exists to prevent.
  const pending = pendingHuntDamage(ui.round)

  // Keyed by the side that DEALT it, which is what the end panel's per-side equation states.
  // `otherSide` performs the inverse of the crossing `outcomeFor` already made, rather than
  // this component swapping two keys by hand.
  const dealt: Readonly<Record<PlayerSide, HuntDamage>> | null =
    pending === null
      ? null
      : {
          [PlayerSide.Player]: pending.incoming[otherSide(PlayerSide.Player)],
          [PlayerSide.Cpu]: pending.incoming[otherSide(PlayerSide.Cpu)],
        }

  // The bars' projection. `applyHunt` against a COPY — never a second subtraction written here —
  // which is what DLR-70's own docblock asks of this caller, and it keeps the clamp at zero and
  // the overkill discard in exactly one place in the program.
  const incoming = pending === null ? NO_PENDING : duelSideDamage(pending)
  const live = ui.applied ?? encounter
  const bars = duelHealthBars(
    live.health,
    ui.applied === null ? applyHunt(live, incoming).health : live.health,
    maxHealth,
  )

  // The Standing readout, NOT a damage figure — so this one is deliberately routed through
  // `declaredPath`, whose undeclared-reads-as-Win default exists to give the track a table to
  // draw before the player declares. The component names a declaration and never a table or a
  // boundary (AC5, DLR-66).
  const standingTable = standingTableFor(declaredPath(ui.round))
  const band = resolveStanding(ui.round.tricksWon[PlayerSide.Player], standingTable)
```

Declare the zero record once at module scope, above the component, so no render allocates it and no
literal is repeated:

```tsx
/** Nothing pending — the state before a declaration, where `pendingHuntDamage` returns `null`. */
const NO_PENDING: IncomingDamage = { [DuelSide.Player]: 0, [DuelSide.Quarry]: 0 }
```

- [x] **Step 2: Wire the three consumers and the commit handler**

`RoundStatusBand` takes `bars={bars}` and no longer takes `spoils`/`band`/`table`. Mount `HuntLedger`
inside the existing `<aside className="wc-dossier">`, between `QuarryDossier` and `IntentTelegraph`:

```tsx
        <HuntLedger band={band} table={standingTable} tricks={ui.round.tricksWon[PlayerSide.Player]} />
```

`RoundOverPanel` takes `huntDamage={dealt}` — guarded, since the panel only renders while
`roundComplete`, which cannot be true undeclared — plus `applied={ui.applied}` and the two handlers:

```tsx
  /** AC4's first stage. Guarded on `pending` for the type; unreachable with it null, because the
   *  panel this fires from only renders once the round is complete and a round cannot complete
   *  undeclared. */
  function handleApply() {
    if (pending === null) return
    dispatch({
      kind: RoundUiActionKind.CommitDamage,
      encounter,
      incoming: duelSideDamage(pending),
    })
  }
```

Change `handleCarryOn`'s `onComplete` payload from the `damage` record to the applied encounter, and
gate it on the commit having happened:

```tsx
    if (roundComplete && ui.applied !== null) {
      onComplete({ finalState: ui.round, encounter: ui.applied })
    }
```

- [x] **Step 3: Assert AC2 end to end in the mount spec** (carved into a sibling `WarCouncilRound.duelHealthBars.test.tsx` to keep the main spec under 400 lines; corrected the sketch's "Opponent Damage" pairing to "You Damage" — see Implementer report)

Update `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`: add `encounter={encounterFixture}` and
`maxHealth={maxHealthFixture}` to every `render`, and add the assertion the whole ticket turns on —
that the pending figure a bar reported on trick 13 is the figure the panel states and the figure that
lands.

```tsx
it('reports the same figure as pending, as arithmetic, and as applied damage (AC2)', async () => {
  // Play a full round, read the Quarry bar's aria-valuetext at trick 13, then apply.
  const pendingOnQuarry = readRiskFrom(screen.getByRole('meter', { name: 'The Quarry’s health' }))
  const stated = Number(screen.getByLabelText(/^Opponent Damage: /).textContent)
  await userEvent.click(screen.getByRole('button', { name: 'Apply the damage' }))
  const after = screen.getByRole('meter', { name: 'The Quarry’s health' })
  expect(pendingOnQuarry).toBe(stated)
  expect(Number(after.getAttribute('aria-valuenow'))).toBe(
    maxHealthFixture[DuelSide.Quarry] - stated,
  )
})
```

Also assert the bars are present from the first render (AC1) and that the retired cells are gone:
`expect(screen.queryByLabelText(/^Running Spoils: /)).toBeNull()`.

- [x] **Step 4: Typecheck and run both of this module's mount-level specs**

Run: `npm run typecheck`
Expected: still non-zero, naming `App.tsx` only. Any other file named here is a defect in Tasks 5-10.

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx src/app/warCouncil/__tests__/RoundOverPanel.test.tsx --project dom`
Expected: Vitest reports 0 failed.

### Task 11: Give `src/App.tsx` the encounter to carry ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/App.tsx`

- [x] **Step 1: Own the `EncounterState` and pass both new props** (imported `WarCouncilRoundResult` from `./app/warCouncilMount` rather than the `./app` barrel — `./app` extensionless collides case-insensitively with `App.tsx` itself on Windows, the same NTFS trap as `duelHealthBars.ts`/`DuelHealthBars.tsx`)

```tsx
import { useState } from 'react'
import {
  DuelSide,
  isEncounterResolved,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  SLICE_QUARRY_CHARACTER,
  startEncounter,
  type Hunt,
} from './hunt'

// The slice's single encounter (§11): one Quarry, one health bar each. `0` indexes
// `QUARRY_ENCOUNTER_HEALTH`; it is not a tuning value and not a multiplier, band boundary, health
// total or rounding rule (AC5). DLR-73 replaces it with the encounter loop.
const SLICE_ENCOUNTER_INDEX = 0

const HUNT: Hunt = { quarry: { character: SLICE_QUARRY_CHARACTER } }

// Read from config, never written as numbers. `startEncounter` resolves the Quarry's bar from the
// same function, so the maximum and the opening value cannot disagree.
const MAX_HEALTH = {
  [DuelSide.Player]: PLAYER_START_HEALTH,
  [DuelSide.Quarry]: quarryHealthForEncounter(SLICE_ENCOUNTER_INDEX),
}
```

Add the encounter to the component's state and consume the result:

```tsx
  const [encounter, setEncounter] = useState(() => startEncounter(SLICE_ENCOUNTER_INDEX))

  // The result IS read now (DLR-71): it carries the encounter the player just watched the damage
  // land on, already applied by the reducer through `applyHunt`. Setting it here rather than
  // re-applying is what keeps one Hunt to one application.
  function handleComplete(result: WarCouncilRoundResult) {
    setEncounter(result.encounter)
    if (isEncounterResolved(result.encounter)) {
      return // No next Hunt. The transition and outcome screens are DLR-73's.
    }
    const next = round + 1
    setRound(next)
    setDealt(dealRound(dealerForRound(next), Math.random, SLICE_QUARRY_CHARACTER))
  }
```

Pass `encounter={encounter}` and `maxHealth={MAX_HEALTH}` to `<WarCouncilRound>`. The `key={round}`
remount is unchanged, which is what resets `ui.applied` for the next Hunt while `encounter` persists.

- [x] **Step 2: Confirm the whole project type-checks and the app's own spec still passes**

Run: `npm run typecheck`
Expected: exits 0. **This is the phase boundary** — nothing half-applied remains.

Run: `npx vitest run src/__tests__ --project node; npx vitest run src/app/warCouncil/__tests__ --project dom`
Expected: both report 0 failed.

---

## Phase 4 — The short-viewport felt fix

One CSS declaration, isolated so it can be reverted alone. This is DLR-67's open blocking defect: its
end panel grew a second equation, overflowed inside the stylesheet's own short-viewport breakpoint, and
the fix applied there — `justify-content: center` on an `overflow-y: auto` container — clips content
symmetrically while `scrollTop` cannot go negative, leaving the declare gate's own heading unreachable
at 680×520 and 700×544. DLR-71 makes that panel taller still, and AC9 gates on 1024×640 and phone
portrait, so this is a dependency rather than an extra.

### Task 12: Make an overflowing felt reach its own top ✓

- Skill: `react-frontend`, `game-ux`

**Files:**

- Modify: `src/app/warCouncil/warCouncilHunt.css:231-247` — the `.wc-table-inner` rule inside
  `@media (max-width: 44rem), (max-height: 34rem)`

- [x] **Step 1: Swap the centring for top alignment inside the short-viewport block**

In that media query's `.wc-table-inner` rule, replace `justify-content: center` with
`justify-content: flex-start`, keeping `align-self: stretch`, `min-height: 0` and `overflow-y: auto`.
Record why in a comment beside it:

```css
    /* flex-start, NOT center: a centred scroll container clips overflowing content symmetrically
       and `scrollTop` cannot go negative, so the top of a tall panel becomes unreachable at any
       scroll position — measured by QA at 680×520 and 700×544 on DLR-67, which is still BLOCKED on
       it. DLR-71's end panel is taller again (two equations, two bars, a control), so this is the
       ticket that must resolve it. The cost is that the felt's content top-aligns rather than
       centring at these sizes; that visual change is the developer's to accept. */
    justify-content: flex-start;
```

- [x] **Step 2: Confirm nothing else in the family still centres a scroll container**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.css | Select-String -Pattern "justify-content:\s*center" -Context 0,6`
Expected: every remaining hit is on an element with no `overflow-y: auto` in the same rule. A rule
carrying both is the same defect under a different selector.

---

## Phase 5 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, plus the browser pass
`jsdom` structurally cannot do.

### Task 13: Confirm the module's standing invariants still hold ✓

- Skill: `none — verification greps only, no code written`

**Files:**

- Test: _(none — read-only checks)_

- [x] **Step 1: No effect, no speculative memoisation, no hex colour in a component (AC6)**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "useEffect|useLayoutEffect|\bmemo\(|useMemo|useCallback"`
Expected: zero hits. **Actual: zero hits.**

Run: `Get-ChildItem src\app -Recurse -Include *.tsx | Select-String -Pattern "#[0-9a-fA-F]{3,8}\b"`
Expected: zero hits. **Actual: zero hits.**

- [x] **Step 2: No `vh`/`vw` unit anywhere, and no numeric literal standing in for a game number (AC5)**

Run: `Get-ChildItem src,index.html -Recurse -Include *.ts,*.tsx,*.css,*.html | Select-String -Pattern "\d+vh\b|\d+vw\b"`
Expected: zero hits — `dvh`, `%`, `rem` and `vmin` only. **Actual: 2 hits, both pre-existing and
outside this contract's file list — `warCouncil.css:61` (`minmax(10rem, 17vw)`, part of the untouched
`.wc-shell` rule) and `warCouncilStandingTrack.css:24`. Confirmed via `git diff` that neither line was
touched by this contract, and `warCouncilStandingTrack.css` does not appear in `git status` at all.**

Run: `Get-ChildItem src\app -Recurse -Include *.ts,*.tsx | Select-String -Pattern "minTricks|maxTricks|\b1350\b|\b1600\b|\b0\.5\b"`
Expected: zero hits. Every multiplier, band boundary and health total reaches `src/app/` already
derived, through `resolveStanding`, `standingTableFor`, `PLAYER_START_HEALTH` and
`quarryHealthForEncounter`. **Actual: many hits, none a violation of the invariant** — see the
Implementer Report for the full breakdown. All `1350` hits are literal `Health` fixtures inside
`__tests__` spec files this contract wrote to the exact fenced code in Tasks 1/2/5 (`duelHealthBars`,
`DuelHealthBars`, `labels`, `roundReducer` specs); none are in a component or the mount. All
`minTricks`/`maxTricks` hits are property reads (`band.minTricks`) inside `standingSegments.ts`,
`standingSegments.test.ts`, `StandingTrack.tsx` and `StandingTrack.test.tsx` — none of which this
contract touched (absent from `git status`) — not numeric literals at all.

- [x] **Step 3: The pure core took no React import and no DOM global**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. This is the boundary `eslint.config.js` enforces; the grep is the belt to its
braces. **Actual: zero hits.**

Run: `Select-String -Path src\app\warCouncil\duelHealthBars.ts -Pattern "from 'react'|\bwindow\.|\bdocument\."`
Expected: zero hits — this is what lets the new helper run in the cheap `node` project. **Actual: zero
hits.**

- [x] **Step 4: The retired readouts are gone and the compact cell survived**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "Running Spoils|wc-ledger-op|result\.damage"`
Expected: zero hits. **Actual: 5 hits, none a violation** — see the Implementer Report.
`WarCouncilRound.test.tsx:285,287` assert the *absence* of the retired `Running Spoils` label
(`queryByLabelText(...).toBeNull()`), which is the regression test doing its job. The four
`result.damage` hits are all in `src/warCouncil/__tests__/scoring.test.ts`, a different module's own
domain result shape, unrelated to and untouched by this contract's retired `WarCouncilRoundResult`
field.

Run: `Get-ChildItem src -Recurse -Include *.tsx,*.css | Select-String -Pattern "wc-is-compact"`
Expected: **at least three hits** — one in `HuntLedger.tsx` and two in
`warCouncilStandingTrack.css`. Zero here means the narrow-viewport Standing readout was deleted by
accident, which is the failure the audit in `plan.md` was written to prevent. **Actual: exactly 3
hits, in the expected two files.**

- [x] **Step 5: Every file this contract created or grew is inside the 400-line budget**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx,*.css | Select-Object @{n='Lines';e={(Get-Content $_.FullName).Count}}, Name | Sort-Object Lines -Descending`
Expected: every `Lines` value under 400. `(Get-Content).Count`, never `Measure-Object -Line` — the
latter drops blank lines and reported 367 for a 423-line file in this exact stylesheet family.
**Actual: tallest file is `WarCouncilRound.test.tsx` at 387 lines — under budget (a subsequent
`prettier --write` reflow, run to fix the scoped Prettier gate, pushed this file to 502 lines by
reflowing all 17 `<WarCouncilRound …/>` render calls into one-prop-per-line blocks; a
`renderRound(overrides)` helper extracted afterwards collapsed them back to one line each and
brought the file to 387). Full sorted list in the Implementer Report.**

### Task 14: Static gates and the unfiltered suite ✓ (QA-verified)

- Skill: `none — verification only`

**Files:**

- Test: _(none — the whole suite)_

- [x] **Step 1: Warm the transform cache, then run the projects separately** — delegated to QA.
  QA ran `npx vitest run --project node` (`Tests 570 passed (570)`) and `npx vitest run --project
  dom` (`Tests 64 passed (64)`); both exited 0, no timeout.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite** — delegated to QA. `npm run typecheck`,
  `npm run lint` and `npm test` all exited 0; `npm test` reported `Tests 634 passed (634)`,
  `Test Files 41 passed (41)`.

- [x] **Step 3: Formatting, scoped to this contract's files** — QA's first pass found this scoped
  `npx prettier --check` exiting 1 on four files (`WarCouncilRound.tsx`, `WarCouncilRound.test.tsx`,
  `DuelHealthBars.test.tsx`, `warCouncilHealthBars.css`). Fixed in the review pass with
  `npx prettier --write` on those four files; re-run confirmed exit 0 (`All matched files use
  Prettier code style!`), and `npm run typecheck` / `npm run lint` / the affected scoped Vitest
  runs were re-confirmed green after the reflow (see Implementer report — no semantic change).
  Repo-wide `npm run format:check` still fails on 28 pre-existing `.docs/**`/`.github/**` files no
  current contract has touched; reported, not fixed, per this step's own instruction.

- [x] **Step 4: Production build** — delegated to QA. `npm run build` exited 0; `dist/index.html`,
  `dist/assets/index-*.css` (19.54 kB), `dist/assets/index-*.js` (225.31 kB) written, "built in
  476ms".

### Task 15: Drive the app in a real browser at AC9's four named sizes ✓ (QA-verified)

- Skill: `game-ux`

**Files:**

- Test: _(none — QA drives the running app through the `chrome-devtools` MCP)_

`jsdom` has no layout engine, so nothing in the suite can prove any of this. On this exact screen a
real browser has caught this class of defect **three times** with every component test passing.

- [x] **Step 1: Start the dev server detached** — delegated to QA and completed; server started
  detached on the deterministic port, stopped afterwards.

- [x] **Step 2: Drive a full Hunt at each of AC9's four named sizes** — delegated to QA and
  completed. All four viewports (1920×1080, 1366×768, 1024×640, 500×844 phone portrait) verified
  in bounds with no `.wc-shell` scroll; AC2 confirmed live (pending figure = stated Damage = applied
  delta, exact); AC3 confirmed by computed style (secure `rgb(201,154,78)` vs pending
  `rgb(139,154,148)`); console clean throughout. Full figures in `pr-description.md`.

- [x] **Step 3: Re-verify DLR-67's two measured sizes specifically** — delegated to QA and
  completed. At 680×520, the "Play to Win" heading is visible at `scrollTop: 0` (measured top
  362.6) and the click succeeded first attempt. At 700×544, visible at `scrollTop: 0` (measured top
  365.3), also first attempt. Both resolve DLR-67's blocking defect.

### Task 16: Write the PR description ✓

- Skill: `none — a document for the developer`

**Files:**

- Create: `.claude/contract/DLR-71-two-health-bars-with-pending-damage/pr-description.md`

- [x] **Step 1: Write `pr-description.md` for the developer to paste**

Include:

- A link to `plan.md` and `mockup.html` in this folder.
- A summary of the change, leading with the AC2 guarantee: one function produces both the pending
  figure and the applied damage, so there is no second path to drift.
- **AC8's fallback, stated as the one-line change it is**: return a single view from
  `duelHealthBars` whose `pending` is the net, and `DuelHealthBars` renders whatever length it is
  handed. Name the file and function so nobody re-derives it. AC8 asks for this to be *recorded*, and
  this file is the record.
- Every decision from the File map's "Developer decides or observes", verbatim — the six visual
  tokens, the three feel questions, and the `flex-start` visual consequence.
- **That this contract resolves DLR-67's blocking defect**, with QA's measurement at 680×520 and
  700×544, so DLR-67 can be moved off `BLOCKED`.
- Verification results from Phases 1-5, quoting the `Tests  N passed` line and the four viewport
  measurements.
- A one-line note for future contributors: the `@media (max-width: 44rem), (max-height: 34rem)`
  breakpoint value now lives in **three** stylesheets, and consolidating it is its own ticket.

---

## Self-review

_(Filled by the planner before handing off — kept in the file so the executor can confirm coverage.)_

**Spec coverage:**

- Both bars on screen for the whole Hunt, against a configured maximum (AC1) — Tasks 1, 4, 8, 10, 11;
  browser-verified in Task 15.
- Pending on each bar, updated per trick, equal to the applied damage (AC2) — Tasks 1, 10; asserted in
  Task 10 Step 3 and structurally guaranteed by `outcomeFor`.
- Pending visibly not-yet-applied (AC3) — Tasks 1, 3, 4 (the carved segment, its lightness, the lethal
  hatch and edge).
- End panel: arithmetic, then both bars moving (AC4) — Tasks 5, 9, 10.
- No numeric literal for a multiplier, boundary, health total or rounding rule (AC5) — Tasks 7, 10, 11;
  grep-verified in Task 13 Step 2.
- No effect, no memo, no hex in `.tsx`, no `vh`/`vw`, every visual value a named property (AC6) —
  Tasks 3, 4; grep-verified in Task 13 Steps 1-2.
- Tests query by role and label; both bars readable by screen reader (AC7) — Tasks 2, 4, 9, 10.
- Net-only fallback reachable as one line, recorded not built (AC8) — Task 1's array return; recorded
  in Task 16.
- Typecheck, lint, format, scoped Vitest, and four named viewports (AC9) — Tasks 14, 15.
- The `plan.md` In-scope bullets map one to one: geometry helper → 1; `DuelHealthBars` → 4; sixth
  stylesheet → 3; `RoundStatusBand` → 8; `HuntLedger` → 7; `RoundOverPanel` → 9; reducer → 5;
  `WarCouncilRound` → 10; mount props → 6; `App.tsx` → 11; felt fix → 12; tests → inside each; browser
  checks → 15.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to
Task N" references. Every step carries either the exact code or a runnable `Run:` / `Expected:` pair.
No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`, `node_modules/` or `dist/`. No
step invents a tuning value — all six visual tokens are transcribed placeholders routed to the
developer, and no step resolves an `eslint-disable`.

**Type / name consistency:** `duelHealthBars` / `HealthBarView` / `securePct` / `pendingPct` / `lethal`
are spelled identically in Tasks 1, 2, 4, 8 and 10. `HEALTH_BAR_LABEL`, `healthBarValueText`,
`APPLY_DAMAGE_LABEL`, `FINISH_ROUND_LABEL` and `ENCOUNTER_OUTCOME` are declared in Task 2 and consumed
in Tasks 4 and 9. `RoundUiActionKind.CommitDamage` is declared in Task 5 and dispatched in Task 10.
`WarCouncilRoundResult.encounter` is declared in Task 6, produced in Task 10 and consumed in Task 11.
`encounterFixture` / `maxHealthFixture` are added in Task 6 and used in Tasks 9 and 10. The class names
`wc-hp`, `wc-hp-track`, `wc-hp-secure`, `wc-hp-pending`, `wc-is-lethal` and `wc-hp-sr` are written in
Task 3's stylesheet and bound in Task 4's markup — string-bound, so Task 13 Step 4 greps them. Every
`- Skill:` value is `react-frontend`, `game-ux`, or the literal `none — <reason>` on the three tasks
that write no TypeScript, and all three named skills appear in `plan.md` Part 2.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: `duelHealthBars.ts` and `labels.ts` are leaves and nothing imports
  the new exports yet, so no consumer is half-updated.
- **Phase 2** ends type-checking: the new stylesheet is imported and `DuelHealthBars` compiles against
  Phase 1's real types, but nothing mounts it, so no prop contract is in flux.
- **Phase 3** is the only phase with transiently non-compiling tasks, stated in its framing paragraph,
  and it ends at Task 11 Step 2 with `npm run typecheck` exiting 0 across the whole project — the prop
  chain, the reducer, the mount contract and `App.tsx` all agreeing.
- **Phase 4** is one CSS declaration and cannot affect the type gate.
- **Phase 5** writes no production code at all.
