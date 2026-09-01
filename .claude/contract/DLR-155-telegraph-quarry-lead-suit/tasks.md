# Tasks: Telegraph the Quarry's lead — glow the suit it is about to lead

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-31

**Goal:** Mark, in the "What the Quarry holds" panel, which suit the Quarry is about to lead with — enlarged glowing tiles plus a tooltip and a screen-reader sentence — so the player can choose suit-scoped buffs against a fact rather than a guess.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved at the plan gate).

---

## File map

**Created:**

- `src/hunt/telegraphConfig.ts` — the new `QUARRY_LEAD_TELEGRAPH_ENABLED` flag plus `TelegraphFidelity` / `TELEGRAPH_FIDELITY` moved out of `config.ts`
- `src/app/warCouncil/quarryTelegraph.ts` — `telegraphedLeadSuit(state, quarryToLead)`, the one call to `quarryIntent()`
- `src/app/warCouncil/__tests__/quarryTelegraph.test.ts` — renderer-free spec for the resolver
- `src/app/warCouncil/__tests__/quarryShapeCss.test.ts` — stylesheet spec for the glow and the tooltip reveal

**Modified:**

- `src/hunt/config.ts:301-311` — the three telegraph definitions become a re-export from `./telegraphConfig`
- `src/hunt/index.ts:33-35` — add `QUARRY_LEAD_TELEGRAPH_ENABLED` to the existing `./config` export list
- `src/hunt/__tests__/config.test.ts` — assert the new flag's presence and type
- `src/app/warCouncil/labels.ts` — add `quarryLeadTelegraphText(suit)`
- `src/app/warCouncil/__tests__/labels.test.ts` — cover the new sentence
- `src/app/warCouncil/QuarryShape.tsx` — the optional `leadSuit` prop and the marked row's markup
- `src/app/warCouncil/__tests__/QuarryShape.test.tsx` — cover the marked row, the two sentences, and the three unmarked states
- `src/app/warCouncil/warCouncilHunt.css` — `.wc-shape-row-lead` and `.wc-shape-tip`
- `src/app/warCouncil/WarCouncilRound.tsx:219-228,294` — one resolver call and one new prop

**Deleted:** (none)

**Developer decides or observes:**

- `src/app/warCouncil/warCouncilHunt.css` → the marked tile's **size** (`width` / `height` on `.wc-shape-row-lead .wc-shape-card`), the **ring width and glow radius** (`box-shadow`), and the **glow colour** (defaulted to `--wc-alarm`). Trades read-at-a-glance against competing with the player's own hand for attention. The contract ships the mockup's values so there is something to play against.
- Whether the telegraph's glow fights DLR-153's buff-ride lighting on the player's hand. Look at the felt with a buff-activation window open and the Quarry to lead; judge whether the screen now has one focal point too many.
- Whether the marked row reads "at a glance without hunting" (AC1's own wording). QA can prove the class lands and the sentence is in the accessibility tree; it cannot prove the glance.
- Whether the tooltip sentence should be permanently on screen rather than on hover / focus. That is a fourth line in a three-line panel — a layout change, not a tweak.
- `QUARRY_LEAD_TELEGRAPH_ENABLED` ships `true`. One word in `src/hunt/telegraphConfig.ts` if you want the readout dark by default.

---

## Phase 1 — The configuration flag and its new home

Moves the telegraph constants out of `config.ts` — which stands at 388 of its 400-line blocking budget — into a sibling file, and adds the new on/off flag beside them. Because `config.ts` re-exports all three names, no importer anywhere changes, so the phase ends with the whole tree type-checking and every existing telegraph spec still passing. Nothing renders differently yet.

### Task 1: Create `src/hunt/telegraphConfig.ts` and re-export it from `config.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/hunt/telegraphConfig.ts`
- Modify: `src/hunt/config.ts:301-311`
- Config: `src/hunt/config.ts` — the telegraph block becomes a re-export; `src/hunt/telegraphConfig.ts` — new `QUARRY_LEAD_TELEGRAPH_ENABLED` key

- [x] **Step 1: Write `src/hunt/telegraphConfig.ts`, carrying the existing comments across verbatim**

```ts
// DLR-155 — the telegraph tunables moved here when `config.ts` reached its 400-line blocking
// budget, the same split `run.ts` → `runTransitions.ts` and `config.ts` → `apConfig.ts` already
// made. `config.ts` re-exports every name below, so no existing importer changes.

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

// DLR-155 AC8 — the one switch for the Quarry's lead telegraph in the holds panel. Read in
// exactly one place (`app/warCouncil/quarryTelegraph.ts`'s `telegraphedLeadSuit`), so turning it
// off removes the highlight, the tooltip and the screen-reader sentence together, with no
// consuming code writing its own bypass — the discipline `AP_ENABLED` / `apCostFor` already sets.
// DISTINCT from TELEGRAPH_FIDELITY above, which says HOW MUCH a telegraph may reveal; this says
// whether this particular SURFACE draws one at all.
// UNIT: on/off.
export const QUARRY_LEAD_TELEGRAPH_ENABLED = true
```

- [x] **Step 2: Replace the three definitions in `src/hunt/config.ts` with a re-export**

Delete the `TelegraphFidelity` object, its type alias, and the `TELEGRAPH_FIDELITY` constant (with their comments — they moved verbatim in Step 1) from around line 301, and add this beside the existing `export { … } from './apConfig'` block at the file's end:

```ts
// DLR-155 — the telegraph tunables moved to `./telegraphConfig` when this file reached its
// 400-line blocking budget, the same split `apConfig.ts` already made. Re-exported here so every
// existing importer (`cpuPlayer.ts`, `index.ts`, the specs) resolves unchanged.
export {
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  QUARRY_LEAD_TELEGRAPH_ENABLED,
} from './telegraphConfig'
```

- [x] **Step 3: Add `QUARRY_LEAD_TELEGRAPH_ENABLED` to the barrel**

In `src/hunt/index.ts`, add the name to the existing `export { … } from './config'` list, immediately after `TELEGRAPH_FIDELITY`.

**Files (this step):** Modify `src/hunt/index.ts:33-35`

- [x] **Step 4: Verify the move broke no importer**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

- [x] **Step 5: Confirm `config.ts` is back under budget and the new file is small**

Run: `(Get-Content src\hunt\config.ts).Count; (Get-Content src\hunt\telegraphConfig.ts).Count`
Expected: the first is below 400 (it should drop to roughly 378 from 388); the second is under 40.

### Task 2: Cover the new flag in the config spec ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/__tests__/config.test.ts`
- Test: `src/hunt/__tests__/config.test.ts`

- [x] **Step 1: Add the flag to the spec's import list and assert it**

Add `QUARRY_LEAD_TELEGRAPH_ENABLED` to the existing import from `'../config'`, then add beside the existing `TELEGRAPH_FIDELITY` assertion:

```ts
it('ships the Quarry lead telegraph switched on, as a plain boolean', () => {
  // DLR-155 AC8 — a boolean, not an enum: this says whether the surface draws, and
  // TELEGRAPH_FIDELITY beside it still says how much a telegraph may reveal.
  expect(typeof QUARRY_LEAD_TELEGRAPH_ENABLED).toBe('boolean')
  expect(QUARRY_LEAD_TELEGRAPH_ENABLED).toBe(true)
})

it('still reaches the relocated telegraph constants through config.ts', () => {
  // The re-export is what keeps all fourteen existing references resolving after the move.
  expect(TELEGRAPH_FIDELITY).toBe(TelegraphFidelity.SuitAndStance)
})
```

- [x] **Step 2: Run the config spec**

Run: `npx vitest run src/hunt/__tests__/config.test.ts`
Expected: exits 0, Vitest reports 0 failed.

---

## Phase 2 — The resolver and the sentence

The two pure pieces, both testable without a renderer: the rule that decides which suit (if any) is marked, and the one sentence that names it. Neither is imported by anything yet, so the phase ends type-checking with the app rendering exactly as it does today.

### Task 3: Add `telegraphedLeadSuit` in a new pure module ✓

- Skill: react-frontend

**Files:**

- Create: `src/app/warCouncil/quarryTelegraph.ts`
- Test: `src/app/warCouncil/__tests__/quarryTelegraph.test.ts`

- [x] **Step 1: Write the failing spec first**

`makeRound()` from `./roundFixture` returns a round the **player** leads, so it is the natural "nothing marked" case; override `dealer` / `currentTrick` to aim the other states. Read `roundFixture.ts` before writing, and shape the overrides to whatever it actually exposes.

```ts
import { describe, expect, it } from 'vitest'
import { PlayerSide, quarryIntent } from '../../../warCouncil'
import { telegraphedLeadSuit } from '../quarryTelegraph'
import { makeRound } from './roundFixture'

describe('telegraphedLeadSuit', () => {
  it('marks the suit quarryIntent reports when the Quarry is to lead', () => {
    // A round aimed so the Quarry is on turn with an empty trick.
    const state = makeRound({ dealer: PlayerSide.Player })
    const intent = quarryIntent(state)
    expect(intent).not.toBeNull()
    expect(telegraphedLeadSuit(state, true)).toBe(intent!.suit)
  })

  it('marks nothing when the caller says the Quarry is not to lead', () => {
    const state = makeRound({ dealer: PlayerSide.Player })
    expect(telegraphedLeadSuit(state, false)).toBeNull()
  })

  it('marks nothing when quarryIntent has no move to describe', () => {
    // The player is on turn, so the intent function itself returns null.
    const state = makeRound()
    expect(quarryIntent(state)).toBeNull()
    expect(telegraphedLeadSuit(state, true)).toBeNull()
  })

  it('is stable under repeated calls, as StrictMode double-invoke requires', () => {
    const state = makeRound({ dealer: PlayerSide.Player })
    expect(telegraphedLeadSuit(state, true)).toBe(telegraphedLeadSuit(state, true))
  })

  it('never returns anything but a suit — no rank can reach the caller (AC5)', () => {
    const state = makeRound({ dealer: PlayerSide.Player })
    const suit = telegraphedLeadSuit(state, true)
    expect(typeof suit).toBe('string')
  })
})
```

- [x] **Step 2: Run the spec and watch it fail on the missing module**

Run: `npx vitest run src/app/warCouncil/__tests__/quarryTelegraph.test.ts`
Expected: non-zero exit; Vitest reports a failure to resolve `../quarryTelegraph`.

- [x] **Step 3: Write the module**

```ts
import { QUARRY_LEAD_TELEGRAPH_ENABLED } from '../../hunt'
import { quarryIntent, type RoundState, type Suit } from '../../warCouncil'

/**
 * DLR-155 — the suit the holds panel marks, or `null` for "mark nothing".
 *
 * `quarryToLead` is passed IN rather than re-derived. `WarCouncilRound` already computes exactly
 * "the Quarry has chosen its lead but has not committed it", and that boolean is strictly
 * stronger than AC4's wording: it additionally excludes a held reveal, an open ability prompt, an
 * engine fault and a finished round — every state in which a telegraph would be noise. A second
 * copy of that condition here is the drift this codebase avoids elsewhere.
 *
 * The ONE call to `quarryIntent` for the whole panel, and it is deliberately outside any per-row
 * or per-tile loop (DLR-155's own risk note: `quarryIntent` runs `chooseCpuCard` on every poll).
 * It is pure and safe under StrictMode's double-invoke by its own docblock.
 *
 * `stance` is read and discarded (AC6), so `TELEGRAPH_FIDELITY` can stay at `SuitAndStance`
 * without this surface implying more than it shows. No rank can pass through here: `QuarryIntent`
 * carries none.
 */
export function telegraphedLeadSuit(state: RoundState, quarryToLead: boolean): Suit | null {
  if (!QUARRY_LEAD_TELEGRAPH_ENABLED || !quarryToLead) {
    return null
  }
  return quarryIntent(state)?.suit ?? null
}
```

- [x] **Step 4: Run the spec again and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/quarryTelegraph.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; `typecheck` exits 0.

### Task 4: Add `quarryLeadTelegraphText` to `labels.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/labels.ts`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`

- [x] **Step 1: Add the failing spec beside the existing `suitShapeRowText` block**

```ts
describe('quarryLeadTelegraphText — DLR-155 AC2, the telegraph sentence', () => {
  it('names the suit and nothing else', () => {
    expect(quarryLeadTelegraphText(Suit.Bells)).toBe('The Quarry will lead with Bells')
  })

  it('draws every suit name from SUIT_NAME rather than typing one out', () => {
    for (const suit of [Suit.Bells, Suit.Keys, Suit.Moons]) {
      expect(quarryLeadTelegraphText(suit)).toBe(`The Quarry will lead with ${SUIT_NAME[suit]}`)
    }
  })

  it('never carries a rank (AC5)', () => {
    expect(quarryLeadTelegraphText(Suit.Moons)).not.toMatch(/\d/)
  })
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: non-zero exit; `quarryLeadTelegraphText` is not exported.

- [x] **Step 3: Add the builder to `labels.ts`, directly below `quarryShapeText`**

```ts
/** DLR-155 AC2/AC3 — the telegraph's ONE sentence, used by both the visible bubble and the
 *  `.wc-sr-only` span in `QuarryShape.tsx`, so the two channels cannot drift into two copies of
 *  one phrase (the exact defect DLR-80 found between `quarryShapeText` and that component, which
 *  is why `suitShapeRowText` above has a single owner). Suit name from `SUIT_NAME`, never typed
 *  out. Never a rank: `Suit` has none to give. PLACEHOLDER COPY, as this file's rest is. */
export function quarryLeadTelegraphText(suit: Suit): string {
  return `The Quarry will lead with ${SUIT_NAME[suit]}`
}
```

- [x] **Step 4: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; `typecheck` exits 0.

---

## Phase 3 — The panel and its treatment

The visible half. `QuarryShape` learns which row is marked and renders the two sentences; the stylesheet gives the marked row its enlarged tiles, its glow and its tooltip reveal. Because `leadSuit` is optional and defaults to nothing marked, the panel renders identically to today until Phase 4 passes it a suit — so the phase boundary is safe with the app unchanged on screen.

### Task 5: Give `QuarryShape` its `leadSuit` prop and the marked row's markup ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/QuarryShape.tsx`
- Test: `src/app/warCouncil/__tests__/QuarryShape.test.tsx`

- [x] **Step 1: Add the failing component spec**

Append to the existing `describe('QuarryShape', …)` block. The five existing render sites keep compiling untouched — `leadSuit` is optional — and they are the "nothing marked" coverage AC4's second half asks for.

```ts
const SHAPE = [
  { suit: Suit.Bells, held: 3, skulled: 1 },
  { suit: Suit.Keys, held: 2, skulled: 0 },
  { suit: Suit.Moons, held: 1, skulled: 0 },
]

it('marks exactly the telegraphed suit row, and says so in words', () => {
  const { container } = render(<QuarryShape shape={SHAPE} leadSuit={Suit.Bells} />)
  expect(container.querySelectorAll('.wc-shape-row-lead')).toHaveLength(1)
  expect(container.querySelector('.wc-suit-bells')!.classList).toContain('wc-shape-row-lead')

  // AC3 — real text, not an aria-label on a group of aria-hidden children.
  expect(screen.getByText('The Quarry will lead with Bells')).toBeTruthy()

  // AC2 — the visible bubble says the same thing, and is hidden from assistive tech so the
  // sentence is not announced twice.
  const tip = container.querySelector('.wc-shape-tip')!
  expect(tip.textContent).toBe('The Quarry will lead with Bells')
  expect(tip.getAttribute('aria-hidden')).toBe('true')
})

it('makes only the marked row a keyboard stop', () => {
  const { container } = render(<QuarryShape shape={SHAPE} leadSuit={Suit.Keys} />)
  const focusable = container.querySelectorAll('.wc-shape-row[tabindex="0"]')
  expect(focusable).toHaveLength(1)
  expect(focusable[0].classList).toContain('wc-suit-keys')
})

it('marks nothing when no suit is telegraphed — the player leads, or mid-trick (AC4)', () => {
  const { container } = render(<QuarryShape shape={SHAPE} leadSuit={null} />)
  expect(container.querySelectorAll('.wc-shape-row-lead')).toHaveLength(0)
  expect(container.querySelectorAll('.wc-shape-tip')).toHaveLength(0)
  expect(container.querySelectorAll('.wc-shape-row[tabindex]')).toHaveLength(0)
  expect(container.textContent).not.toMatch(/will lead with/)
})

it('marks nothing when the prop is omitted altogether', () => {
  const { container } = render(<QuarryShape shape={SHAPE} />)
  expect(container.querySelectorAll('.wc-shape-row-lead')).toHaveLength(0)
})

it('leaks no rank through the marked row (AC5)', () => {
  const { container } = render(<QuarryShape shape={SHAPE} leadSuit={Suit.Bells} />)
  const marked = container.querySelector('.wc-shape-row-lead')!
  // The marked row draws the same tally as any other — no tile is singled out.
  expect(marked.querySelectorAll('.wc-shape-card')).toHaveLength(3)
  expect(marked.querySelector('.wc-shape-tip')!.textContent).not.toMatch(/\d/)
})
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/app/warCouncil/__tests__/QuarryShape.test.tsx`
Expected: non-zero exit; the five new cases fail (no `leadSuit` prop, no `.wc-shape-row-lead`).

- [x] **Step 3: Add the prop and the marked-row markup**

Import `Suit` as a type and `quarryLeadTelegraphText` from `./labels`, then:

```tsx
interface QuarryShapeProps {
  readonly shape: readonly SuitShape[]
  /** DLR-155 — the suit to mark, or `null`/absent for none. OPTIONAL for the same reason
   *  `cardAccessibleName`'s `marks` is: every existing render site keeps compiling, and an
   *  un-telegraphed panel is a real state (the player is the one leading). */
  readonly leadSuit?: Suit | null
}
```

Inside the existing `shape.map`, above the `skulled` clamp:

```tsx
// DLR-155 — a string comparison per row, three per render. The suit is resolved ONCE upstream
// in `quarryTelegraph.ts`; nothing here polls the engine.
const marked = leadSuit !== undefined && leadSuit !== null && row.suit === leadSuit
```

and on the row element, replacing its current `className` and adding the two children:

```tsx
<div
  key={row.suit}
  className={`wc-shape-row wc-suit-${row.suit}${marked ? ' wc-shape-row-lead' : ''}`}
  tabIndex={marked ? 0 : undefined}
>
  {marked && <span className="wc-sr-only">{quarryLeadTelegraphText(row.suit)}</span>}
  <span className="wc-sr-only">{suitShapeRowText(row)}</span>
  {/* …the existing pip, suit name and cards, unchanged… */}
  {marked && (
    <span className="wc-shape-tip" aria-hidden="true">
      {quarryLeadTelegraphText(row.suit)}
    </span>
  )}
</div>
```

Extend the component's docblock with a short DLR-155 paragraph: the row is marked from a prop, it computes nothing about the telegraph, and `SuitShape` still carries no rank for it to leak.

- [x] **Step 4: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/QuarryShape.test.tsx; npm run typecheck`
Expected: Vitest exits 0 with 0 failed; `typecheck` exits 0.

- [x] **Step 5: Confirm the file is still well inside budget**

Run: `(Get-Content src\app\warCouncil\QuarryShape.tsx).Count`
Expected: under 200. If it is over 400, split it in this task rather than reporting it.

### Task 6: Style the marked row and its tooltip ✓

- Skill: game-ux

**Files:**

- Modify: `src/app/warCouncil/warCouncilHunt.css`
- Create: `src/app/warCouncil/__tests__/quarryShapeCss.test.ts`
- Test: `src/app/warCouncil/__tests__/quarryShapeCss.test.ts`

- [x] **Step 1: Add the rules, following `mockup.html`'s treatment**

Append after the existing `.wc-shape-row.wc-suit-moons .wc-shape-card` block, before the bank-meter section comment. Values are transcribed from the approved mockup and are the developer's to retune.

```css
/* ---------- DLR-155: the telegraphed lead row ----------

   FORM FIRST. The tiles grow and take a ring, so the mark survives a greyscale reading — this
   panel already spends hue on suit identity, and a second categorical axis cannot also be a
   field colour. The alarm hue reinforces; it is never the only signal.

   Keyed to the Quarry's side and deliberately unlike the player's own hand lighting: this GROWS
   where a hand card LIFTS, and takes the alarm red where the hand takes brass and the Timebomb
   green. TUNING VALUES — the tile size, the ring width, the glow radius and the colour are the
   developer's; these are the mockup's, shipped so there is something to play against. */
.wc-shape-row-lead {
  background: color-mix(in srgb, var(--wc-alarm) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--wc-alarm) 45%, transparent);
}

.wc-shape-row-lead .wc-shape-suit {
  font-weight: 700;
}

.wc-shape-row-lead .wc-shape-card {
  width: 1.62rem;
  height: 2.15rem;
  box-shadow:
    0 0 0 1.5px var(--wc-alarm),
    0 0 0.55rem color-mix(in srgb, var(--wc-alarm) 55%, transparent);
}

.wc-shape-row-lead .wc-shape-card-mark {
  width: 1.22rem;
  height: 1.22rem;
}

/* The tooltip. Its content is a NICETY — the glow above is what the buff decision reads, and it
   is always visible, so nothing a decision needs is hover-only. Revealed on hover for pointer
   devices only, and on `:focus-visible` so the keyboard path works without a stuck outline after
   a click. `aria-hidden` in the markup: the `.wc-sr-only` sibling carries the same sentence. */
.wc-shape-tip {
  position: absolute;
  left: 0.4rem;
  top: calc(100% + 0.3rem);
  z-index: 5;
  padding: 0.3rem 0.5rem;
  border-radius: 0.25rem;
  background: var(--wc-ink);
  color: var(--wc-parchment);
  font-size: 0.78rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.12s ease-out;
}

@media (hover: hover) {
  .wc-shape-row-lead:hover .wc-shape-tip {
    opacity: 1;
    visibility: visible;
  }
}

.wc-shape-row-lead:focus-visible {
  outline: 2px solid var(--wc-brass);
  outline-offset: 2px;
}

.wc-shape-row-lead:focus-visible .wc-shape-tip {
  opacity: 1;
  visibility: visible;
}

@media (prefers-reduced-motion: reduce) {
  .wc-shape-tip {
    transition: none;
  }
}
```

Also add `position: relative;` to the existing `.wc-shape-row` rule — the tooltip anchors to it.

- [x] **Step 2: Write the stylesheet spec**

jsdom has no layout engine, so the rules are asserted by reading the file — the pattern `handRowCss.test.ts` and `cardFaceCss.test.ts` already set. Copy that file's `ruleBody` helper rather than inventing a second one.

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const huntCss = readFileSync(new URL('../warCouncilHunt.css', import.meta.url), 'utf8')

describe('the telegraphed lead row (DLR-155)', () => {
  it('grows the tile as well as colouring it, so the mark survives greyscale', () => {
    const body = ruleBody(huntCss, '.wc-shape-row-lead .wc-shape-card')
    expect(body).toMatch(/width:/)
    expect(body).toMatch(/height:/)
    expect(body).toMatch(/box-shadow:/)
  })

  it('anchors the tooltip to the row', () => {
    expect(ruleBody(huntCss, '.wc-shape-row')).toMatch(/position:\s*relative/)
    expect(ruleBody(huntCss, '.wc-shape-tip')).toMatch(/position:\s*absolute/)
  })

  it('hides the tooltip until hover or keyboard focus', () => {
    expect(ruleBody(huntCss, '.wc-shape-tip')).toMatch(/visibility:\s*hidden/)
    expect(huntCss).toMatch(/@media \(hover: hover\)/)
    expect(huntCss).toMatch(/\.wc-shape-row-lead:focus-visible \.wc-shape-tip/)
  })

  it('uses :focus-visible rather than bare :focus for the keyboard outline', () => {
    expect(huntCss).not.toMatch(/\.wc-shape-row-lead:focus\s*[,{]/)
  })
})
```

- [x] **Step 3: Run the stylesheet spec and confirm the sheet is under budget**

Run: `npx vitest run src/app/warCouncil/__tests__/quarryShapeCss.test.ts; (Get-Content src\app\warCouncil\warCouncilHunt.css).Count`
Expected: Vitest exits 0 with 0 failed; the line count is under 400 (it starts at 268). If it exceeds 400, split the sheet in this task following `warCouncilBankMeter.css`'s precedent.

**Post-review fix (Defender Warning, Checklist #9):** the tooltip anchored below the row could be
clipped by `.wc-dossier`'s own `overflow: hidden` for the bottommost row (Moons, third of three) —
there is no room below it before the panel's clip. Added `.wc-shape-row-lead:last-child .wc-shape-tip`,
flipping that one row's tooltip to render above instead of below (`bottom: calc(100% + 0.3rem)`
in place of `top`), keyed structurally to `:last-child` rather than to the Moons suit name so it
still holds if `ALL_SUITS`' order changes. `.wc-dossier`'s `overflow: hidden` is untouched. Pinned
with a new case in `quarryShapeCss.test.ts` asserting both the flip rule and that the ancestor's
`overflow: hidden` survives.

---

## Phase 4 — Wire it into the round

Two lines in `WarCouncilRound.tsx`, which is the phase that makes the telegraph appear on screen. The file is at 397 of a 400-line budget, so the step measures it afterwards rather than assuming.

### Task 7: Resolve the lead suit and pass it to `QuarryShape` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx:219-228,294`
- Create: `src/app/warCouncil/roundHandSummary.ts` (unplanned — see Notes)

- [x] **Step 1: Add the import and the resolver call**

Import `telegraphedLeadSuit` from `./quarryTelegraph` alongside the existing `./roundBars` / `./roundHint` imports, then add immediately after the existing `const hint = deriveHint(ui, interactive, quarryToLead)` line:

```tsx
// DLR-155 — ONE call per render, deliberately outside `QuarryShape`'s own row loop:
// `quarryIntent` runs `chooseCpuCard` on every poll. No `useMemo` — no profiling evidence.
const leadSuit = telegraphedLeadSuit(ui.round, quarryToLead)
```

- [x] **Step 2: Pass it to the panel**

Change the existing element at line 294:

```tsx
<QuarryShape shape={shape} leadSuit={leadSuit} />
```

- [x] **Step 3: Typecheck and re-run every spec that renders the round**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/QuarryShape.test.tsx src/app/warCouncil/__tests__/quarryTelegraph.test.ts`
Expected: `typecheck` exits 0; Vitest exits 0 with 0 failed.

- [x] **Step 4: Confirm the round component did not breach its budget**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: under 400. If it is over, extract in this task — do not report it as a finding.

**Note:** the two-line change alone put the file at 402/400. Extracted the pre-existing
`handSummary` derivation (the largest self-contained, heavily-commented block with no telegraph
involvement) into a new `roundHandSummary.ts` — `handSummaryFor(ui)` — bringing the round component
to 390 lines. The extraction removed the file's now-unused `DuelSide` import; re-ran the pinned
regression spec `WarCouncilRound.duelHealthBars.test.tsx` (3 passed) to confirm the tally is
unchanged.

---

## Phase 5 — Final verification

No production changes. Confirms the pure-core boundary still holds, that no telegraph literal was hard-coded past the configuration flag, and that the cumulative work passes every gate.

### Task 8: Confirm the pure-core boundary and the single-owner rules still hold ✓

- Skill: none — verification greps only, no code written

**Files:**

- (verification only — no file is modified)

- [x] **Step 1: Confirm the new hunt config file imports no React and touches no DOM**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. **Confirmed — zero hits.**

- [x] **Step 2: Confirm the telegraph sentence has exactly one owner**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "will lead with"`
Expected: hits only in `src/app/warCouncil/labels.ts` (the builder) and in the two specs that assert its output — never a second hand-typed copy in `QuarryShape.tsx`.
**Confirmed — 6 lines across exactly three files: `labels.ts:207` (the builder), `labels.test.ts:287,292` and `QuarryShape.test.tsx:111,116,132` (both specs asserting the builder's output, including the negative assertion that nothing renders when unmarked). No hit in `QuarryShape.tsx` itself — the component calls the builder, it does not retype the sentence.**

- [x] **Step 3: Confirm the configuration flag is read in exactly one place**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "QUARRY_LEAD_TELEGRAPH_ENABLED"`
Expected: four hits — the definition in `src/hunt/telegraphConfig.ts`, the re-export in `src/hunt/config.ts`, the barrel entry in `src/hunt/index.ts`, and the single read in `src/app/warCouncil/quarryTelegraph.ts` — plus its assertions in `src/hunt/__tests__/config.test.ts`. No consuming component may name it.
**Confirmed — exactly the five files named: `telegraphConfig.ts` (definition), `config.ts:384` (re-export), `index.ts:35` (barrel), `quarryTelegraph.ts` (import + the one read), `config.test.ts` (import + 2 assertions). `QuarryShape.tsx` and `WarCouncilRound.tsx` do not name the flag — they only see the already-resolved `leadSuit` value.**

- [x] **Step 4: Confirm no rank reached the panel**

Run: `Get-ChildItem src\app\warCouncil -Include QuarryShape.tsx,quarryTelegraph.ts | Select-String -Pattern "rank|RANK_NAME|CardRank"`
Expected: zero hits. **Confirmed — zero hits.**

### Task 9: Static gates, full suite and build ✓

- Skill: none — verification only, no code written

**Files:**

- (verification only — no file is modified)

- [x] **Step 1: Warm the Vitest cache, then run every gate**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; the final Vitest run reports 0 failed. A single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` on the first `dom` run is infrastructure, not a defect — re-run it once before reporting anything.

- [x] **Step 2: Confirm the files this contract touched are formatted**

Run: `npx prettier --check src\hunt\telegraphConfig.ts src\hunt\config.ts src\hunt\index.ts src\app\warCouncil\quarryTelegraph.ts src\app\warCouncil\labels.ts src\app\warCouncil\QuarryShape.tsx src\app\warCouncil\warCouncilHunt.css src\app\warCouncil\WarCouncilRound.tsx`
Expected: exits 0. Repo-wide `npm run format:check` fails on pre-existing files and `npm run format` must never be run.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 10: Write the PR description ✓

- Skill: none — documentation hand-off, no code written

**Files:**

- Create: `.claude/contract/DLR-155-telegraph-quarry-lead-suit/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` in this folder, and to `mockup.html` as the approved layout reference.
- A summary of the change: the holds panel now marks the suit the Quarry is about to lead, from an engine function that already existed and had no reader.
- Every decision the developer must make and every behaviour they must judge by playing — the glow's size and colour, whether it fights DLR-153's hand lighting, whether it reads at a glance, whether the tooltip should be permanent, and the flag's default.
- Verification results from the prior phases, quoting the actual Vitest summary lines and exit codes.
- A one-line note for future contributors: `src/hunt/telegraphConfig.ts` is now where the telegraph tunables live, re-exported from `config.ts` — the same arrangement `apConfig.ts` has.

---

## Self-review

**Spec coverage:**

- AC1 (the marked row is enlarged and glowing) — Tasks 5, 6.
- AC2 (hover or keyboard focus shows the exact sentence, suit name from `SUIT_NAME`) — Tasks 4, 5, 6.
- AC3 (the same sentence as real text for a screen reader, `.wc-sr-only`, not an `aria-label` on an `aria-hidden` group) — Task 5.
- AC4 (present only while the intent is non-null and the trick is empty; clears when the Quarry has led; never when the player leads) — Tasks 3, 5, 7.
- AC5 (no rank leaked; the tiles stay a tally) — Tasks 3, 4, 5, 8.
- AC6 (`stance` read and discarded, fidelity unchanged) — Task 3.
- AC7 (Vitest coverage of the highlight, the tooltip, and the un-marked states) — Tasks 3, 4, 5, 6.
- AC8 (one boolean turns it off, following existing patterns) — Tasks 1, 2, 8.
- Plan In-scope: new pure module — Task 3; new config file — Task 1; sentence builder — Task 4; `QuarryShape` — Task 5; CSS — Task 6; `WarCouncilRound` wiring — Task 7; all five specs — Tasks 2, 3, 4, 5, 6.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with its expected result.

**Type / name consistency:** `QUARRY_LEAD_TELEGRAPH_ENABLED` (Tasks 1, 2, 3, 8), `telegraphedLeadSuit` (Tasks 3, 7), `quarryLeadTelegraphText` (Tasks 4, 5, 8), `leadSuit` as prop and local (Tasks 5, 7), `wc-shape-row-lead` and `wc-shape-tip` (Tasks 5, 6) are spelled identically everywhere they appear, and each matches `plan.md` Part 2 → Data shapes. `TelegraphFidelity` / `TELEGRAPH_FIDELITY` are moved, never renamed.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking: the constants moved and are re-exported under their original names, so no importer changes and no rename is half-applied.
- **Phase 2** ends type-checking: two new pure exports plus their specs, imported by nothing yet, with no dead import left behind.
- **Phase 3** ends type-checking: `leadSuit` is optional, so the panel and its five existing render sites compile and render exactly as before; the CSS additions apply to a class nothing yet emits.
- **Phase 4** ends type-checking with the feature live: the only new import is a module Phase 2 already created and tested.
- **Phase 5** changes no production file — greps, gates and one document.
