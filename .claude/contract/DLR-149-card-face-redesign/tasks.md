# Tasks: Redesign the card faces — art on the named ranks, printed pip patterns, richer suit glyphs

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-27

**Goal:** Rebuild the playing-card face so a player can tell without reading anything which cards can change what happens — art plus a solid border on the five acting ranks, art plus a dashed border and a "no rule" mark on the Treasure, a printed pip lattice on every plain rank including 8 — with the corner-index geometry asserted by a unit test and every rule reaching the player through a tooltip rather than printed type.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-08-27); composition reference: `reference-sheet.html` in this folder.

---

## File map

**Created:**

- `src/app/warCouncil/cardFace.ts` — the pure face model: rank classes, printed names, figures, the pip lattice, and `CARD_FACE_GEOMETRY` with its overlap helpers
- `src/app/warCouncil/cardRuleText.ts` — per-rank tooltip copy, transcribed from `.docs/game_rules/the-hunt.md`
- `src/app/warCouncil/CardArtSheet.tsx` — the eight figure `<symbol>` definitions, mounted once per round
- `src/app/warCouncil/CardFace.tsx` — corner index, art window, pip lattice, "no rule" mark
- `src/app/warCouncil/useCardTip.ts` — the tooltip's open state, measured anchor, and document listeners
- `src/app/warCouncil/CardAbilityTip.tsx` — the tooltip host and its portalled bubble
- `src/app/warCouncil/__tests__/cardFace.test.ts` — AC5 and AC4, plus totality and `RANK_NAME` agreement
- `src/app/warCouncil/__tests__/cardRuleText.test.ts` — totality over `RANKS`, and no printed rule text leaks
- `src/app/warCouncil/__tests__/cardFaceCss.test.ts` — the stylesheet-vs-`cardFace.ts` drift guard
- `src/app/warCouncil/__tests__/CardAbilityTip.test.tsx` — hover, focus, tap, Escape, and listener teardown

**Modified:**

- `src/app/warCouncil/PlayingCard.tsx` — composes `CardFace` and `CardAbilityTip`; `hasAbility` becomes `cardActs`; props unchanged
- `src/app/warCouncil/SuitMark.tsx` — the three suit symbols elaborated (AC7), still setting no `stroke-width`
- `src/app/warCouncil/warCouncilCards.css` — the card block rewritten around the `--wc-face-*` geometry properties
- `src/app/warCouncil/WarCouncilRound.tsx:262` — mount `CardArtSheet` beside `SuitSymbolSheet`
- `src/app/warCouncil/__tests__/PlayingCard.test.tsx` — new face assertions added; the four existing class-name assertions kept green

**Deleted:** (none)

**Developer decides or observes:**

- `warCouncil.css` → `--wc-card-w` — today `clamp(2.9rem, 6.2vmin, 4.3rem)` (46–69px). AC7's ~14px pip needs ≈`5.25rem`; a ~9px printed name needs ≈`7.5rem`. **AC6 and AC7 are not met until this is chosen.** Drag the width slider in `mockup.html` and watch the two gauges.
- `warCouncilCards.css` → `--wc-card-name-min-w` — the container-query threshold below which the printed name suppresses itself. `150px` is a visible-behaviour placeholder, not a choice.
- `warCouncilCards.css` → the card's `aspect-ratio` — `2 / 3` today, `5 / 7` in the reference sheet. Toggle in `mockup.html`.
- `warCouncil.css` → the twelve `--wc-fig-*` figure colours (four tones × three suits), and `--wc-grain-opacity`.
- The discard-selected treatment — a face tint plus a centred ✕ badge is what this contract builds; the badge's glyph, size and tint are a look.
- **Greyscale check on the three face classes.** Take the screenshot. DLR-148 is the recorded case where "every state reads without colour" was claimed and then failed its own test.
- **Whether tap-to-read-also-arms feels right.** A hand-card tap opens that card's rule and arms it in the same gesture. Only playing settles whether that reads as helpful or as a mis-tap.
- **Whether the skull filling the art window is the right visual.** It replaces DLR-148's small top-right disc.
- **`fanLayout.ts` still fans.** It returns `rotateDeg: spread * 2.1` and `liftPct: spread ** 2 * 0.13`, and `warCouncilCards.css`'s `.wc-fan .wc-card` composes both. `mockup.html` lays the hand out side by side per the developer's 2026-08-27 red-line. **Retiring the fan is deliberately NOT in this contract's file map** — it is a change to `fanLayout.ts` and its transform rules, and needs its own ticket.

---

## Phase 1 — The face model, as numbers

Two pure modules and their specs. Nothing renders differently at the end of this phase — `PlayingCard` does not import either module yet — so the app type-checks and behaves exactly as it does today. This is the phase that makes AC5 assertable at all: jsdom has no layout engine, so the only way to prove nothing overlaps a corner index is to hold the geometry outside the component and check it arithmetically.

### Task 1: The pure face model in `src/app/warCouncil/cardFace.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/cardFace.ts`
- Test: `src/app/warCouncil/__tests__/cardFace.test.ts`

- [x] **Step 1: Write the failing spec for AC5, AC4 and totality**

Create `src/app/warCouncil/__tests__/cardFace.test.ts`. It runs in the `node` project (`.test.ts`), needs no DOM, and imports only from `../cardFace`, `../labels` and `../../../warCouncil`.

```ts
import { describe, expect, it } from 'vitest'
import { ALL_SUITS, RANKS } from '../../../warCouncil'
import { RANK_NAME } from '../labels'
import {
  CARD_FACE_GEOMETRY,
  PIP_LAYOUT,
  PIP_MID_ROW,
  RANK_FACE,
  RankFaceClass,
  cardActs,
  pipCellRect,
  pipIsInverted,
  printedRects,
  rectsOverlap,
} from '../cardFace'

describe('cardFace — AC5, nothing printed touches a corner index', () => {
  // The one relation that matters, and the reason the geometry left the component: jsdom has
  // no layout engine, so this cannot be asserted in a component test at all.
  it('prints no element that overlaps a corner index this rank actually prints', () => {
    for (const rank of RANKS) {
      const { corners, printed } = printedRects(rank)
      expect(corners.length).toBeGreaterThan(0)
      for (const corner of corners) {
        for (const rect of printed) {
          expect({ rank, corner, rect, overlap: rectsOverlap(corner, rect) }).toEqual({
            rank,
            corner,
            rect,
            overlap: false,
          })
        }
      }
    }
  })

  // AC5 says "at every rank and suit". Geometry is suit-independent by construction — the
  // Treasure's figure differs by suit but occupies the identical window — so assert that
  // rather than looping three identical times and calling it coverage.
  it('is suit-independent: the art window is one rectangle for all three suits', () => {
    const windows = new Set(ALL_SUITS.map(() => JSON.stringify(CARD_FACE_GEOMETRY.artWindow)))
    expect(windows.size).toBe(1)
  })

  it('treats touching edges as not overlapping', () => {
    expect(rectsOverlap({ x0: 0, y0: 0, x1: 0.5, y1: 0.5 }, { x0: 0.5, y0: 0, x1: 1, y1: 0.5 })).toBe(
      false,
    )
    expect(rectsOverlap({ x0: 0, y0: 0, x1: 0.5, y1: 0.5 }, { x0: 0.49, y0: 0, x1: 1, y1: 0.5 })).toBe(
      true,
    )
  })

  // AC6 — the mirrored index prints only where nothing else is printed there.
  it('gives a second corner index to plain ranks only', () => {
    for (const rank of RANKS) {
      const expected = RANK_FACE[rank].faceClass === RankFaceClass.Plain ? 2 : 1
      expect({ rank, corners: printedRects(rank).corners.length }).toEqual({ rank, corners: expected })
    }
  })
})

describe('cardFace — AC4, the pip lattice', () => {
  it('lays out exactly `rank` pips for every pip-bearing rank', () => {
    for (const [rank, spots] of Object.entries(PIP_LAYOUT)) {
      expect({ rank, count: spots.length }).toEqual({ rank, count: Number(rank) })
    }
  })

  it('covers exactly the ranks that carry no art', () => {
    const pipRanks = RANKS.filter((rank) => RANK_FACE[rank].figure === null)
    expect(Object.keys(PIP_LAYOUT).map(Number).sort((a, b) => a - b)).toEqual(pipRanks)
  })

  it('inverts every spot below the mid-row and none above it', () => {
    for (const spots of Object.values(PIP_LAYOUT)) {
      for (const spot of spots) {
        expect({ spot, inverted: pipIsInverted(spot) }).toEqual({
          spot,
          inverted: spot.row > PIP_MID_ROW,
        })
      }
    }
  })

  it('keeps every pip cell inside the declared pip field', () => {
    const field = CARD_FACE_GEOMETRY.pipField
    for (const [rank, spots] of Object.entries(PIP_LAYOUT)) {
      for (const spot of spots) {
        const cell = pipCellRect(Number(rank), spot)
        expect(cell.x0).toBeGreaterThanOrEqual(field.x0)
        expect(cell.x1).toBeLessThanOrEqual(field.x1)
        expect(cell.y0).toBeGreaterThanOrEqual(field.y0)
        expect(cell.y1).toBeLessThanOrEqual(field.y1)
      }
    }
  })
})

describe('cardFace — the face model', () => {
  it('describes every rank in RANKS', () => {
    for (const rank of RANKS) expect(RANK_FACE[rank]).toBeDefined()
  })

  // AC1/AC2 — "named" and "acts" are NOT the same predicate any more. That divergence is the
  // whole ticket, so it is asserted rather than left implied.
  it('acts on exactly the five acting ranks', () => {
    expect(RANKS.filter(cardActs)).toEqual([1, 3, 5, 9, 11])
  })

  it('paints exactly the six named ranks, the Treasure by suit', () => {
    expect(RANKS.filter((rank) => RANK_FACE[rank].figure !== null)).toEqual([1, 3, 5, 7, 9, 11])
    const treasure = RANK_FACE[7].figure
    expect(treasure).toEqual({ bells: 'harp', keys: 'chalice', moons: 'sword' })
  })

  // AC3 — rank 8 is a plain number. It keeps pips because it has no settled name, NOT because
  // it is inert: a dashed edge on 8 while 6 has none would tell the player 8 is special.
  it('gives rank 8 the plain face, with no name and no mark', () => {
    expect(RANK_FACE[8]).toEqual({ faceClass: RankFaceClass.Plain, name: null, figure: null })
  })

  it('marks only the Treasure inert', () => {
    expect(RANKS.filter((rank) => RANK_FACE[rank].faceClass === RankFaceClass.Inert)).toEqual([7])
  })

  // The drift guard for the two rank-name maps. `labels.ts` deliberately keeps RANK_NAME at the
  // five ACTING ranks (adding Treasure would rewrite 36 assertions across 10 spec files); this
  // module names six. They must agree wherever both name a rank.
  it('agrees with labels.ts RANK_NAME on every rank both name', () => {
    for (const key of Object.keys(RANK_NAME)) {
      expect({ key, name: RANK_FACE[Number(key)].name }).toEqual({ key, name: RANK_NAME[Number(key)] })
    }
  })
})
```

- [x] **Step 2: Run it and confirm it fails because the module does not exist**

Run: `npx vitest run src/app/warCouncil/__tests__/cardFace.test.ts`
Expected: a non-zero exit with `Failed to load` / `Cannot find module '../cardFace'`. This is a collection error, not a failing assertion — it proves the spec is wired up and the module is genuinely absent.

- [x] **Step 3: Write `src/app/warCouncil/cardFace.ts`**

Pure TypeScript: no `react` import, no DOM global. File order per `react-frontend`: imports → constants → functions → exports. Every geometry number below is the approved `mockup.html`'s `--wc-face-*` values; **do not re-derive or round them** — the drift spec in Task 8 pins the stylesheet to exactly these.

```ts
import type { Suit } from '../../warCouncil'

/** A rectangle in the NORMALISED card box: 0 is the card's left/top edge, 1 its right/bottom.
 *  Aspect-ratio independent on purpose — the card is `2 / 3` today and the reference sheet is
 *  `5 / 7`, and which one ships is the developer's call. */
export interface FaceRect {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

export const RankFaceClass = {
  Act: 'act',
  Inert: 'inert',
  Plain: 'plain',
} as const
export type RankFaceClass = (typeof RankFaceClass)[keyof typeof RankFaceClass]

export type FigureKey = 'swan' | 'fox' | 'axe' | 'witch' | 'crown' | 'harp' | 'chalice' | 'sword'

export interface RankFace {
  readonly faceClass: RankFaceClass
  readonly name: string | null
  readonly figure: FigureKey | Readonly<Record<Suit, FigureKey>> | null
}

/** Total over `RANKS`. Rank 8 is `Plain` with no name: AC3 keeps it on pips because it has no
 *  settled name, explicitly NOT because it is inert. The reference sheet classes it inert and
 *  this deliberately differs — see `plan.md` Part 1 → Assumptions made. */
export const RANK_FACE: Readonly<Record<number, RankFace>> = {
  1: { faceClass: RankFaceClass.Act, name: 'Swan', figure: 'swan' },
  2: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  3: { faceClass: RankFaceClass.Act, name: 'Fox', figure: 'fox' },
  4: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  5: { faceClass: RankFaceClass.Act, name: 'Woodcutter', figure: 'axe' },
  6: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  7: {
    faceClass: RankFaceClass.Inert,
    name: 'Treasure',
    figure: { bells: 'harp', keys: 'chalice', moons: 'sword' },
  },
  8: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  9: { faceClass: RankFaceClass.Act, name: 'Witch', figure: 'witch' },
  10: { faceClass: RankFaceClass.Plain, name: null, figure: null },
  11: { faceClass: RankFaceClass.Act, name: 'Monarch', figure: 'crown' },
}

export interface PipSpot {
  readonly row: number
  readonly column: number
}

export const PIP_LATTICE_ROWS = 7
export const PIP_LATTICE_COLUMNS = 3
export const PIP_MID_ROW = 4

/** AC4 — the fixed lattice per rank, transcribed from `reference-sheet.html`'s `PIP_LAYOUT`.
 *  1-indexed so a spot maps straight onto a CSS grid line. */
export const PIP_LAYOUT: Readonly<Record<number, readonly PipSpot[]>> = {
  2: [{ row: 1, column: 2 }, { row: 7, column: 2 }],
  4: [
    { row: 1, column: 1 }, { row: 1, column: 3 },
    { row: 7, column: 1 }, { row: 7, column: 3 },
  ],
  6: [
    { row: 1, column: 1 }, { row: 1, column: 3 },
    { row: 4, column: 1 }, { row: 4, column: 3 },
    { row: 7, column: 1 }, { row: 7, column: 3 },
  ],
  8: [
    { row: 1, column: 1 }, { row: 1, column: 3 },
    { row: 3, column: 1 }, { row: 3, column: 3 },
    { row: 5, column: 1 }, { row: 5, column: 3 },
    { row: 7, column: 1 }, { row: 7, column: 3 },
  ],
  10: [
    { row: 1, column: 1 }, { row: 1, column: 3 },
    { row: 3, column: 1 }, { row: 3, column: 3 },
    { row: 5, column: 1 }, { row: 5, column: 3 },
    { row: 7, column: 1 }, { row: 7, column: 3 },
    { row: 2, column: 2 }, { row: 6, column: 2 },
  ],
}

/** The declared boxes. Every number here has a `--wc-face-*` twin in `warCouncilCards.css`, and
 *  `cardFaceCss.test.ts` fails if the two drift. The corner heights are derived from the type
 *  sizes below rather than guessed: a box shorter than its own numeral clips it. */
export const CARD_FACE_GEOMETRY = {
  cornerTopLeftNamed: { x0: 0.06, y0: 0.04, x1: 0.52, y1: 0.3 },
  cornerTopLeftPlain: { x0: 0.06, y0: 0.04, x1: 0.52, y1: 0.25 },
  cornerBottomRight: { x0: 0.48, y0: 0.75, x1: 0.94, y1: 0.96 },
  artWindow: { x0: 0.07, y0: 0.32, x1: 0.93, y1: 0.94 },
  pipField: { x0: 0.25, y0: 0.27, x1: 0.75, y1: 0.73 },
  noRuleMark: { x0: 0.16, y0: 0.8, x1: 0.84, y1: 0.94 },
  /** A skull REPLACES the art (DLR-148), so it occupies the identical window. */
  skullFace: { x0: 0.07, y0: 0.32, x1: 0.93, y1: 0.94 },
  primedMark: { x0: 0.06, y0: 0.82, x1: 0.26, y1: 0.95 },
  discardMark: { x0: 0.35, y0: 0.4, x1: 0.65, y1: 0.6 },
} as const satisfies Readonly<Record<string, FaceRect>>

/** Type and glyph sizes, as fractions of the card WIDTH. Mirrored in the stylesheet and pinned
 *  by the same drift spec — the corner boxes above are sized to contain these. */
export const CARD_FACE_TYPE = {
  rankSize: 0.24,
  nameSize: 0.075,
  cornerGlyph: 0.15,
} as const

export function cardActs(rank: number): boolean {
  return RANK_FACE[rank]?.faceClass === RankFaceClass.Act
}

export function pipIsInverted(spot: PipSpot): boolean {
  return spot.row > PIP_MID_ROW
}

export function rectsOverlap(a: FaceRect, b: FaceRect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/** One pip cell, derived from the field and the lattice's fixed division. Both divisors are
 *  compile-time constants and cannot be zero, so no `NaN` is reachable here. */
export function pipCellRect(rank: number, spot: PipSpot): FaceRect {
  const field = CARD_FACE_GEOMETRY.pipField
  const cellW = (field.x1 - field.x0) / PIP_LATTICE_COLUMNS
  const cellH = (field.y1 - field.y0) / PIP_LATTICE_ROWS
  const x0 = field.x0 + (spot.column - 1) * cellW
  const y0 = field.y0 + (spot.row - 1) * cellH
  return { x0, y0, x1: x0 + cellW, y1: y0 + cellH }
}

/** AC5 — split so the spec can assert the one relation that matters: nothing in `printed` may
 *  intersect anything in `corners`. Overlays are excluded deliberately — a badge sitting over a
 *  painting or a pip is intended, and every overlay's own rectangle is separately proven clear
 *  of both corners by `printedRects` including it in `printed`. */
export function printedRects(rank: number): {
  readonly corners: readonly FaceRect[]
  readonly printed: readonly FaceRect[]
} {
  const face = RANK_FACE[rank]
  const geometry = CARD_FACE_GEOMETRY
  const corners: FaceRect[] = [
    face.name === null ? geometry.cornerTopLeftPlain : geometry.cornerTopLeftNamed,
  ]
  // AC6 — the mirrored index prints only where nothing else is printed there.
  if (face.faceClass === RankFaceClass.Plain) corners.push(geometry.cornerBottomRight)

  const printed: FaceRect[] = [geometry.skullFace, geometry.primedMark, geometry.discardMark]
  if (face.figure !== null) printed.push(geometry.artWindow)
  else for (const spot of PIP_LAYOUT[rank]) printed.push(pipCellRect(rank, spot))
  if (face.faceClass === RankFaceClass.Inert) printed.push(geometry.noRuleMark)

  return { corners, printed }
}
```

- [x] **Step 4: Run the spec and the type gate**

Run: `npx vitest run src/app/warCouncil/__tests__/cardFace.test.ts; npm run typecheck`
Expected: Vitest reports `Tests` all passed with 0 failed and exits 0; `tsc -b` exits 0 with no errors.

- [x] **Step 5: Confirm the file is inside budget**

Run: `(Get-Content src\app\warCouncil\cardFace.ts).Count`
Expected: under 400. Note the number in the summary. Use `(Get-Content <path>).Count`, **not** `Measure-Object -Line`, which drops blank lines and has hidden a real breach on this repo before.

### Task 2: The tooltip copy in `src/app/warCouncil/cardRuleText.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/cardRuleText.ts`
- Test: `src/app/warCouncil/__tests__/cardRuleText.test.ts`

- [x] **Step 1: Write `src/app/warCouncil/cardRuleText.ts`**

Copy is transcribed from `.docs/game_rules/the-hunt.md` → *"Each named rank does one thing — except two"*, and §4 for the Monarch's narrowing. Cite the section; do not re-derive a rule.

```ts
import { RANK_FACE } from './cardFace'

/** The tooltip's title line. A named rank reads `9 · Witch`; an unnamed one reads `6`. */
export function cardTipTitle(rank: number): string {
  const name = RANK_FACE[rank]?.name
  return name === null || name === undefined ? String(rank) : `${rank} · ${name}`
}

/** A plain number's own sentence. Stated rather than omitted: "this card has no rule" is exactly
 *  the fact the ticket's problem statement says a player currently cannot read off a face. */
export const PLAIN_RANK_RULE_TEXT = 'A plain number card. No rule attached.'

/** AC8's body. Total over `RANKS` — a rank with no entry would hand the tooltip `undefined`,
 *  which renders as nothing and reads as "this card has no rule", the one wrong answer this
 *  surface can give. Transcribed from `.docs/game_rules/the-hunt.md`; PLACEHOLDER only in the
 *  sense that the doc's wording is the developer's, as this project's copy always is. */
export const RANK_RULE_TEXT: Readonly<Record<number, string>> = {
  1: 'If a Swan is in a trick and belongs to the side that lost it, that side leads the next trick. Two Swans: the loser leads either way.',
  2: PLAIN_RANK_RULE_TEXT,
  3: 'On playing it, you may exchange the decree card for a card from your hand. The exchanged card becomes the new decree, and its suit becomes the new trump suit. You may decline.',
  4: PLAIN_RANK_RULE_TEXT,
  5: 'On playing it, draw the top card of the draw pile, then put one card from your hand — the drawn card or one you already held — on the bottom of the pile.',
  6: PLAIN_RANK_RULE_TEXT,
  7: 'No effect at all. A named card with no rule attached.',
  8: PLAIN_RANK_RULE_TEXT,
  9: 'If a trick contains exactly one Witch, that Witch counts as trump when the winner is decided. Two Witches cancel — neither is treated as trump.',
  10: PLAIN_RANK_RULE_TEXT,
  11: 'When led, the follower may play only their Swan of that suit, or their highest card of that suit.',
}

/** AC2 — the Treasure's printed mark. Two words and no rule text: AC8 forbids rule text on any
 *  face, and this says only that there is none. PLACEHOLDER copy, as this project's copy is. */
export const NO_RULE_MARK_LABEL = 'no rule'
```

- [x] **Step 2: Write and run its spec**

Create `src/app/warCouncil/__tests__/cardRuleText.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RANKS } from '../../../warCouncil'
import { RANK_FACE, cardActs } from '../cardFace'
import { NO_RULE_MARK_LABEL, RANK_RULE_TEXT, cardTipTitle } from '../cardRuleText'

describe('cardRuleText', () => {
  it('carries copy for every rank in RANKS', () => {
    for (const rank of RANKS) expect(RANK_RULE_TEXT[rank]).toBeTruthy()
  })

  it('titles a named rank with its name and an unnamed one with the bare rank', () => {
    expect(cardTipTitle(9)).toBe('9 · Witch')
    expect(cardTipTitle(7)).toBe('7 · Treasure')
    expect(cardTipTitle(8)).toBe('8')
  })

  // The two inert named ranks must not read as though they do something, and the five acting
  // ranks must not read as though they do not. This is the ticket's whole problem statement.
  it('says plainly that the Treasure has no rule', () => {
    expect(RANK_RULE_TEXT[7]).toMatch(/no (effect|rule)/i)
  })

  it('gives every acting rank a rule longer than the plain sentence', () => {
    for (const rank of RANKS.filter(cardActs)) {
      expect({ rank, long: RANK_RULE_TEXT[rank].length > 60 }).toEqual({ rank, long: true })
    }
  })

  it('keeps the printed mark free of rule text (AC8)', () => {
    expect(NO_RULE_MARK_LABEL.split(/\s+/).length).toBeLessThanOrEqual(2)
  })

  it('names every rank the face model names', () => {
    for (const rank of RANKS) {
      const name = RANK_FACE[rank].name
      if (name !== null) expect(cardTipTitle(rank)).toContain(name)
    }
  })
})
```

Run: `npx vitest run src/app/warCouncil/__tests__/cardRuleText.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

---

## Phase 2 — The symbol sheets

The suit glyphs are elaborated and the eight figure symbols are defined and mounted. `SuitMark`'s change is visible immediately — every existing glyph gets richer — and the figure sheet is mounted but not yet referenced by any card. Both are self-contained: the phase ends type-checking, the app renders, and no face composition has changed yet.

### Task 3: Elaborate the three suit symbols in `SuitMark.tsx` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/SuitMark.tsx:29-49` — the three `<symbol>` bodies only
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx` — the existing `renders the suit mark for every suit` case must stay green

- [x] **Step 1: Replace the three symbol bodies**

Transcribed from the approved `mockup.html`'s symbol sheet. **No path carries a `strokeWidth`** — AC7 requires it, and `SuitMark.tsx`'s own docblock explains why: `stroke-width` inherits, so leaving it unset lets `warCouncil.css:224`'s single `1.7` default reach the cloned content through the `<use>` shadow tree, and a call site that wants a heavier glyph overrides it on its own class. A presentation attribute here would pin every mark in the app to one weight. Do not add one, and do not touch the surrounding docblock, `SUIT_SYMBOL_ID`, the `#wc-skull` symbol, or the `SuitMark` component.

Replace `#s-bells`'s body with:

```tsx
<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="2.9" r="1.05" />
  <path d="M12 4.9v.8" />
  <path d="M6.6 16.1v-4.3a5.4 5.4 0 0 1 10.8 0v4.3" />
  <path d="M4.4 16.1h15.2" />
  <path d="M9.9 18.7a2.1 2.1 0 0 0 4.2 0" />
  <path d="M9.3 12.1a2.7 2.7 0 0 1 2.4-2.4" opacity=".5" />
  <path d="M8.5 16.1v-3.7M15.5 16.1v-3.7" opacity=".3" />
</g>
```

`#s-keys`'s body with:

```tsx
<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="6.5" r="3.7" />
  <circle cx="12" cy="6.5" r="1.35" opacity=".55" />
  <path d="M12 10.2V21" />
  <path d="M12 14.3h3.5M12 17h2.7" />
  <path d="M12 19.5h1.9" opacity=".55" />
</g>
```

`#s-moons`'s body with:

```tsx
<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
  <path d="M15.4 3.6a8.4 8.4 0 1 0 4.1 12 6.9 6.9 0 0 1-4.1-12z" />
  <circle cx="9.5" cy="9.7" r="1.15" opacity=".45" />
  <circle cx="7.7" cy="14.3" r=".8" opacity=".4" />
  <circle cx="11.7" cy="15.5" r=".62" opacity=".35" />
</g>
```

- [x] **Step 2: Prove no `stroke-width` crept in, and that nothing regressed**

Run: `Select-String -Path src\app\warCouncil\SuitMark.tsx -Pattern "strokeWidth|stroke-width"`
Expected: zero hits.

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

### Task 4: The figure sheet in `CardArtSheet.tsx`, mounted once per round ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/CardArtSheet.tsx`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:262` — render `<CardArtSheet />` immediately after `<SuitSymbolSheet />`, and add its import beside line 49's

- [x] **Step 1: Write `CardArtSheet.tsx`**

Eight `<symbol>` elements with ids `wc-fig-swan` / `-fox` / `-axe` / `-witch` / `-crown` / `-harp` / `-chalice` / `-sword`, each `viewBox="0 0 100 100"`, transcribed verbatim from the approved `mockup.html`'s figure symbols. Structure the wrapper exactly as `SuitSymbolSheet` does — `<svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">`.

**Every fill and stroke is a class, never a `var()` in a presentation attribute.** `SuitMark.tsx`'s docblock records that `var()` inside a presentation attribute does not resolve reliably cross-browser; the mechanism this codebase has already shipped through a `<use>` shadow tree is a class plus a CSS rule reading an inherited custom property, exactly as `.wc-skull-shadow` does. Use `className="wc-fig-dark"` / `-mid` / `-light` / `-white` for fills and `wc-fig-stroke-light` / `-mid` / `-white` for strokes; Task 7 adds the four rules that bind them.

Carry the reference sheet's two measured performance findings: **no SVG `filter`** and **no `mix-blend-mode`** anywhere. Its own header records that `feTurbulence` grain made a screenshot of eleven cards time out at 120 seconds, because every filtered box re-rasterises independently.

Open the file with a docblock stating that these are compositional placeholders — pose, crop, and how much of the face a painting gets — and that real art replaces the symbol bodies with no layout change, since the art window is declared in `cardFace.ts`.

- [x] **Step 2: Mount it**

In `src/app/warCouncil/WarCouncilRound.tsx`, add `import { CardArtSheet } from './CardArtSheet'` beside the existing `import { SuitSymbolSheet } from './SuitMark'` at line 49, and render `<CardArtSheet />` on the line after `<SuitSymbolSheet />` at line 262.

- [x] **Step 3: Verify**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed. A duplicate symbol id would not fail here — Step 4 is what catches that.

- [x] **Step 4: Prove no symbol id collides across the two sheets**

Run: `Get-ChildItem src\app\warCouncil -Include CardArtSheet.tsx,SuitMark.tsx -Recurse | Select-String -Pattern 'id="([a-z-]+)"' -AllMatches | ForEach-Object { $_.Matches.Value } | Group-Object | Where-Object Count -gt 1`
Expected: no output. Both sheets mount into one document, so a duplicate id silently renders the wrong drawing — and `<use>` binds by string, which the compiler cannot see.

- [x] **Step 5: Confirm the file is inside budget**

Run: `(Get-Content src\app\warCouncil\CardArtSheet.tsx).Count`
Expected: under 400. If eight figures push past it, split the three Treasure figures into a sibling `CardTreasureSheet.tsx` mounted alongside — do not shrink the drawings to fit a budget.

---

## Phase 3 — The face itself ✓ COMPLETE

The composition, its stylesheet, and the drift guard that keeps the two in step. This is the phase where the card visibly changes. The three tasks land together because splitting them leaves a boundary where the components render class names the stylesheet does not have — a face that type-checks and renders as a blank rectangle. At the end of the phase the app renders the new face, the four existing class-name assertions still pass, and the geometry the Phase 1 spec proved is the geometry the browser lays out.

### Task 5: `CardFace.tsx` — corner index, art window, pips, "no rule" mark ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/CardFacePanel.tsx` — NOT `CardFace.tsx` as the contract names it. See Task 6's Files note: `CardFace.tsx` collides with Phase 1's `cardFace.ts` on this Windows box's case-insensitive filesystem (TS1149), independent of import spelling. The exported component is still named `CardFace`.

- [x] **Step 1: Write the component**

Takes `{ card }: { readonly card: Card }` and nothing else — every fact is derived from `card.rank` and `card.suit` through `RANK_FACE`, which is what keeps `PlayingCardProps` unchanged and all ~14 call sites untouched.

Renders, all `aria-hidden="true"` (the card's accessible name and its `aria-describedby` carry everything a reader needs):

1. **The top-left corner index** — `<span className="wc-card-corner">` containing `<span className="wc-card-rank">{card.rank}</span>`, the printed name as `<span className="wc-card-name">` when `RANK_FACE[card.rank].name !== null`, and `<SuitMark suit={card.suit} className="wc-card-suit" />`. **Keep the class names `wc-card-rank` and `wc-card-suit`** — four existing assertions in `PlayingCard.test.tsx` bind to them by string on both sides, and renaming buys nothing.
2. **The art window**, when `figure !== null` — `<span className="wc-card-art">` wrapping a wash, a glow, a `<svg><use href={'#wc-fig-' + figureKey} /></svg>` figure, and a vignette, per `mockup.html`. Resolve the Treasure's per-suit figure by indexing the record with `card.suit`.
3. **The pip lattice**, otherwise — `<span className="wc-card-pips">` containing one `<svg className="wc-card-pip">` per `PIP_LAYOUT[card.rank]` spot, each carrying `style={{ gridRow: spot.row, gridColumn: spot.column }}` and the class `wc-is-inverted` when `pipIsInverted(spot)`. **Keep the class name `wc-card-pip`** — one existing assertion binds to it.
4. **The "no rule" mark**, when `faceClass === RankFaceClass.Inert` — `<span className="wc-card-no-rule">{NO_RULE_MARK_LABEL}</span>`.
5. **The mirrored bottom-right index**, when `faceClass === RankFaceClass.Plain` — the same corner markup with `wc-card-corner wc-is-mirrored`. AC6: only where nothing else is printed there.

The only inline style in the file is the pip's two grid values. Everything else is a class, so the geometry stays in the stylesheet where the drift spec can read it.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. `CardFace` has no consumer yet, so nothing else can break.

### Task 6: Compose the new face in `PlayingCard.tsx` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/PlayingCard.tsx:1-5` (imports), `:60` (`hasAbility` → `cardActs`), `:63-72` (class list), `:85-114` (the rendered body)
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx` — add the new face cases; keep every existing case
- Create: `src/app/warCouncil/CardFacePanel.tsx` — NOT `CardFace.tsx`. `CardFace.tsx` and Phase 1's `cardFace.ts` collide as filenames on a case-insensitive filesystem (TS1149; this box is Windows) whichever way the import is spelled. Renaming the brand-new component (one consumer) rather than the established pure module (five consumers, incl. Phase 1's own spec) is the contained fix. The exported component is still named `CardFace`; `PlayingCard.tsx` imports it as `CardFace` from `./CardFacePanel`.

- [x] **Step 1: Replace `hasAbility` with `cardActs` and widen the class list**

`hasAbility = Boolean(RANK_NAME[card.rank])` at line 60 is the one behavioural consumer of `RANK_NAME` and its meaning has changed — "named" and "acts" stop being the same predicate the moment the Treasure gets a printed name. Replace it, and drop the now-unused `RANK_NAME` import while keeping `cardAccessibleName`:

```tsx
import { RANK_FACE, RankFaceClass } from './cardFace'
import { cardAccessibleName } from './labels'
```

Add to the `className` array, after `` `wc-suit-${card.suit}` ``:

```tsx
`wc-face-${RANK_FACE[card.rank].faceClass}`,
RANK_FACE[card.rank].name !== null && 'wc-is-named',
```

`cardActs` is deliberately NOT imported here: the class list needs the three-way `faceClass`, not the two-way predicate, and importing both would leave a dead symbol `npm run lint` would flag. `cardActs` exists for `cardFace.test.ts` and `cardRuleText.ts`.

- [x] **Step 2: Replace the rendered body**

Lines 85-114 become: `<CardFace card={card} />`, then the primed and discard marks, then the skull branch. The skull still **replaces** the face rather than sitting beside it (DLR-148), so render `<CardFace />` only when `!skulled`. Keep `.wc-card-skull-face`'s markup byte-identical across every rank and suit — `PlayingCard.test.tsx`'s AC12 spec asserts exactly that — and keep the corner index visible on a skulled card, which the same spec also asserts. The corner comes from `CardFace`, so a skulled card renders a corner-only variant: pass nothing new, and let the stylesheet hide `.wc-card-art` / `.wc-card-pips` under `.wc-card.wc-is-skulled`. Add `skulled && 'wc-is-skulled'` to the class list for that.

Implemented as: `<CardFace card={card} />` renders UNCONDITIONALLY (not `!skulled`-gated) — the paragraph's first sentence ("only when `!skulled`") and its own next sentence (let the stylesheet hide art/pips under `.wc-is-skulled`) are mutually exclusive: if `CardFace` never rendered while skulled, there would be no corner to keep visible and nothing for the CSS hide-rule to hide. Rendering it always and hiding `.wc-card-art`/`.wc-card-pips` via `.wc-card.wc-is-skulled` in CSS is what actually satisfies "keep the corner index visible on a skulled card" (AC12), so that's the reading applied.

- [x] **Step 3: Add the new face assertions to `PlayingCard.test.tsx`**

Append to the existing `describe`, keeping every current case untouched:

```tsx
it('AC1 — paints the six named ranks and no other', () => {
  for (const rank of [1, 3, 5, 7, 9, 11]) {
    const { container, unmount } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank }} variant="hand" />,
    )
    expect(container.querySelector('.wc-card-art')).toBeTruthy()
    expect(container.querySelector('.wc-card-pips')).toBeNull()
    unmount()
  }
  for (const rank of [2, 4, 6, 8, 10]) {
    const { container, unmount } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank }} variant="hand" />,
    )
    expect(container.querySelector('.wc-card-art')).toBeNull()
    expect(container.querySelector('.wc-card-pips')).toBeTruthy()
    unmount()
  }
})

it('AC1 — the Treasure’s figure differs by suit', () => {
  const used = new Set<string>()
  for (const suit of ALL_SUITS) {
    const { container, unmount } = render(
      <PlayingCard card={{ suit, rank: 7 }} variant="hand" />,
    )
    used.add(container.querySelector('.wc-card-art use')!.getAttribute('href')!)
    unmount()
  }
  expect(used).toEqual(new Set(['#wc-fig-harp', '#wc-fig-chalice', '#wc-fig-sword']))
})

it('AC2 — only the Treasure carries the “no rule” mark, and only the five acting ranks act', () => {
  for (const rank of [1, 3, 5, 9, 11]) {
    const { container, unmount } = render(
      <PlayingCard card={{ suit: Suit.Keys, rank }} variant="hand" />,
    )
    expect(container.querySelector('.wc-face-act')).toBeTruthy()
    expect(container.querySelector('.wc-card-no-rule')).toBeNull()
    unmount()
  }
  const { container } = render(<PlayingCard card={{ suit: Suit.Keys, rank: 7 }} variant="hand" />)
  expect(container.querySelector('.wc-face-inert')).toBeTruthy()
  expect(container.querySelector('.wc-card-no-rule')).toBeTruthy()
})

// AC3 — rank 8 is a plain number, not a second inert card.
it('AC3 — rank 8 renders exactly as rank 6 does, structurally', () => {
  const shape = (rank: number) => {
    const { container, unmount } = render(
      <PlayingCard card={{ suit: Suit.Moons, rank }} variant="hand" />,
    )
    const out = {
      face: container.querySelector('.wc-card')!.className.includes('wc-face-plain'),
      named: Boolean(container.querySelector('.wc-card-name')),
      mark: Boolean(container.querySelector('.wc-card-no-rule')),
      corners: container.querySelectorAll('.wc-card-corner').length,
    }
    unmount()
    return out
  }
  expect(shape(8)).toEqual(shape(6))
  expect(shape(8)).toEqual({ face: true, named: false, mark: false, corners: 2 })
})

// AC4 — the count and the rotation, in the DOM this time. The lattice ARITHMETIC is proven
// without a renderer in cardFace.test.ts; this only checks the component wired it up.
it('AC4 — lays out `rank` pips with the lower half inverted', () => {
  const { container } = render(<PlayingCard card={{ suit: Suit.Bells, rank: 10 }} variant="hand" />)
  const pips = container.querySelectorAll('.wc-card-pip')
  expect(pips.length).toBe(10)
  expect(container.querySelectorAll('.wc-card-pip.wc-is-inverted').length).toBe(4)
})

// AC6 — the mirrored index appears only where nothing else is printed there.
it('AC6 — mirrors the corner index on plain ranks only', () => {
  for (const [rank, expected] of [[6, 2], [8, 2], [7, 1], [9, 1]] as const) {
    const { container, unmount } = render(
      <PlayingCard card={{ suit: Suit.Bells, rank }} variant="hand" />,
    )
    expect({ rank, corners: container.querySelectorAll('.wc-card-corner').length }).toEqual({
      rank,
      corners: expected,
    })
    unmount()
  }
})

it('AC6 — prints the name on a named rank and nothing on an unnamed one', () => {
  const { container, unmount } = render(
    <PlayingCard card={{ suit: Suit.Bells, rank: 5 }} variant="hand" />,
  )
  expect(container.querySelector('.wc-card-name')?.textContent).toBe('Woodcutter')
  unmount()
  const plain = render(<PlayingCard card={{ suit: Suit.Bells, rank: 8 }} variant="hand" />)
  expect(plain.container.querySelector('.wc-card-name')).toBeNull()
})

// AC8 — no face prints rule text. The rule reaches the player through the tooltip and the
// accessible tree, and this is the assertion that stops a well-meaning later change printing it.
it('AC8 — prints no rule text on any face, at every rank and suit', () => {
  for (const suit of ALL_SUITS) {
    for (const rank of [1, 3, 5, 7, 8, 9, 11]) {
      const { container, unmount } = render(<PlayingCard card={{ suit, rank }} variant="hand" />)
      const printed = container.querySelector('.wc-card')!.textContent ?? ''
      expect({ suit, rank, printed }).toEqual({
        suit,
        rank,
        printed: expect.not.stringContaining('trick') as unknown as string,
      })
      unmount()
    }
  }
})
```

If the final `AC8` case reads awkwardly against `expect.not.stringContaining`, assert instead that the card's `textContent` length is under 40 characters at every rank and suit — the corner index, the name and the two-word mark cannot exceed that, and any printed rule would.

Applied the length-under-40 alternative for the AC8 case (the `expect.not.stringContaining` form reads awkwardly, as the task itself anticipated). Also corrected the AC4 case's hardcoded inverted-pip count from 4 to 5 — `cardFace.ts`'s already-built `PIP_LAYOUT[10]` puts five spots (rows 5, 5, 6, 7, 7) below `PIP_MID_ROW`, not four; the module is Phase 1's and already covered by its own passing spec, so the new test was fixed to match it rather than the reverse.

- [x] **Step 4: Run the card specs and the type gate**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed, including the eleven pre-existing cases.

Actual: `Test Files 1 passed (1)`, `Tests 20 passed (20)` (11 pre-existing + 9 new); `npm run typecheck` exits 0.

- [x] **Step 5: Confirm every call site still compiles and behaves**

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx src/app/warCouncil/__tests__/TrickWell.test.tsx src/app/warCouncil/__tests__/AbilityPrompt.test.tsx`
Expected: exits 0, 0 failed. `PlayingCardProps` did not change, so any failure here is a real regression in the rendered face, not an expected update.

Actual: `Test Files 3 passed (3)`, all green.

- [x] **Step 6: Confirm the file is inside budget**

Run: `(Get-Content src\app\warCouncil\PlayingCard.tsx).Count`
Expected: under 400.

### Task 7: Rewrite the card block in `warCouncilCards.css` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/app/warCouncil/warCouncilCards.css:75-205` — the card, corner, suit, skull, primed and pip rules
- Config: `src/app/warCouncil/warCouncil.css` — add the twelve `--wc-fig-*` colour tokens beside the existing `--wc-bells` / `--wc-keys` / `--wc-moons` at lines 31-33 (values are the developer's; use `mockup.html`'s as documented placeholders)
- Create: `src/app/warCouncil/warCouncilCardFace.css` — the split-off face rules (art window, pips, no-rule mark, overlays, figure-tint bindings); imported from `WarCouncilRound.tsx`. `--wc-face-*` custom properties and `.wc-card-corner` stay in `warCouncilCards.css` because Task 8's drift spec reads that file specifically.

- [x] **Step 1: Declare the geometry as custom properties on `.wc-card`**

Every value is `CARD_FACE_GEOMETRY` and `CARD_FACE_TYPE` from Task 1, written as a bare fraction. Task 8's drift spec parses exactly these declarations, so the property names and the numbers must match the module character for character.

```css
.wc-card {
  --wc-face-corner-x: 0.06;
  --wc-face-corner-y: 0.04;
  --wc-face-corner-w: 0.46;
  --wc-face-corner-h-named: 0.26;
  --wc-face-corner-h-plain: 0.21;
  --wc-face-rank-size: 0.24;
  --wc-face-name-size: 0.075;
  --wc-face-corner-glyph: 0.15;
  --wc-face-art-x: 0.07;
  --wc-face-art-top: 0.32;
  --wc-face-art-bottom: 0.06;
  --wc-face-pip-x: 0.25;
  --wc-face-pip-top: 0.27;
  --wc-face-pip-bottom: 0.27;
  --wc-face-mark-x: 0.16;
  --wc-face-mark-top: 0.8;
  --wc-face-mark-bottom: 0.06;
  container-type: inline-size;
}
```

- [x] **Step 2: Port the face rules from `mockup.html`**

Transcribe the approved mockup's `.corner` / `.rank` / `.nm` / `.art` / `.pips` / `.no-rule` blocks onto the project's class names — `.wc-card-corner`, `.wc-card-rank`, `.wc-card-name`, `.wc-card-suit`, `.wc-card-art`, `.wc-card-pips`, `.wc-card-pip`, `.wc-card-no-rule` — keeping the existing file's `calc(var(--wc-card-w) * …)` idiom for anything sized against the card's width and `calc(100% * …)` for anything positioned in the normalised box. Five things carry over exactly:

- **The corner index is held to its declared box** — `width: calc(100% * var(--wc-face-corner-w))`, `height: calc(100% * var(--wc-face-corner-h-plain))` with `.wc-card.wc-is-named .wc-card-corner` raising it to `-h-named`, plus `overflow: hidden` and `align-content: start`. The geometric assertion is only honest if the stylesheet actually holds the element to the rectangle the spec checks — and a box shorter than its own numeral clips it, which is the defect the mockup review caught.
- **`.wc-card.wc-is-skulled` hides `.wc-card-art` and `.wc-card-pips`**, since the skull replaces the face.
- **`.wc-card-skull-face` moves from the top-right disc to the art window** — the same `--wc-face-art-*` insets — keeping its existing background and colour values.
- **`.wc-card-discard-mark`** gets its first rule ever: a centred badge inside `CARD_FACE_GEOMETRY.discardMark` plus a face tint. **Not** the mockup's full-face veil, which covered the corner index and so contradicted AC6.
- **The paper grain is a tiled background image and there is no `mix-blend-mode` and no `filter`** anywhere in the block. `reference-sheet.html`'s header records both as measured performance traps, not preferences.

Add the container query that suppresses the printed name below the threshold, and the four figure-tint rules that bind `CardArtSheet`'s classes:

```css
@container (max-width: 150px) {
  .wc-card-name {
    display: none;
  }
}

.wc-fig-dark { fill: var(--wc-fig-dark); }
.wc-fig-mid { fill: var(--wc-fig-mid); }
.wc-fig-light { fill: var(--wc-fig-light); }
.wc-fig-white { fill: var(--wc-fig-white); }
.wc-fig-stroke-light { stroke: var(--wc-fig-light); }
.wc-fig-stroke-mid { stroke: var(--wc-fig-mid); }
.wc-fig-stroke-white { stroke: var(--wc-fig-white); }
```

`150px` is a documented placeholder for `--wc-card-name-min-w`, listed under *Developer decides or observes*. Comment it as such; do not present it as a choice.

- [x] **Step 3: Let a disabled card's host receive pointer events**

Add `.wc-card:disabled { pointer-events: none; }`. Browsers do not dispatch pointer events on a disabled form control, and every `table` / `pile` card and every illegal hand card is `disabled` — without this the Task 10 tooltip is unreachable on exactly the cards a player most often wants to inspect. The host wrapper receives them instead.

- [x] **Step 4: Verify the sheet is clean and nothing regressed**

Run: `Select-String -Path src\app\warCouncil\warCouncilCards.css -Pattern "mix-blend-mode|filter:\s*url\("`
Expected: zero hits.

Run: `npx prettier --check src/app/warCouncil/warCouncilCards.css src/app/warCouncil/warCouncil.css`
Expected: exits 0. Scope it to these two files — the repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files no contract has touched, and `npm run format` must never be run here.

- [x] **Step 5: Confirm the file is inside budget**

Run: `(Get-Content src\app\warCouncil\warCouncilCards.css).Count`
Expected: under 400. It is 359 lines today and this task grows it. If it breaches, split the face rules into a sibling `warCouncilCardFace.css` imported beside it from `WarCouncilRound.tsx` — the same split that produced this file from `warCouncil.css`, for the same reason. Do this **in this task**, not as a finding handed back.

Breached (630 lines after the rewrite) — split per the fallback above. `warCouncilCards.css` is now 351 lines (holds the `--wc-face-*` geometry custom properties and `.wc-card-corner`, since `cardFaceCss.test.ts` reads this file specifically) and the new `warCouncilCardFace.css` is 297 lines (art window, pips, no-rule mark, overlays, figure-tint bindings, grain, act/inert border). Both under 400.

### Task 8: The stylesheet drift guard ✓

- Skill: `react-frontend`

**Files:**

- Test: `src/app/warCouncil/__tests__/cardFaceCss.test.ts`

- [x] **Step 1: Write the spec**

The geometry is stated twice by design — once in TypeScript so it can be reasoned about and asserted, once in CSS so it can lay out. Custom-property names and their values bind by string on both sides and the compiler sees neither, which is exactly the correctness trap `web-project.md` names. This spec is what makes the pair a single source of truth in practice.

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CARD_FACE_GEOMETRY, CARD_FACE_TYPE } from '../cardFace'

const css = readFileSync(new URL('../warCouncilCards.css', import.meta.url), 'utf8')

function declared(property: string): number {
  const match = css.match(new RegExp(`--${property}:\\s*([0-9.]+)\\s*;`))
  if (match === null) throw new Error(`warCouncilCards.css declares no --${property}`)
  return Number(match[1])
}

// The stylesheet's property, and the expression that reconstructs it from the module. Adding a
// geometry number to one side and not the other is what this table exists to catch.
const MIRRORED: ReadonlyArray<readonly [string, number]> = [
  ['wc-face-corner-x', CARD_FACE_GEOMETRY.cornerTopLeftPlain.x0],
  ['wc-face-corner-y', CARD_FACE_GEOMETRY.cornerTopLeftPlain.y0],
  [
    'wc-face-corner-w',
    CARD_FACE_GEOMETRY.cornerTopLeftPlain.x1 - CARD_FACE_GEOMETRY.cornerTopLeftPlain.x0,
  ],
  [
    'wc-face-corner-h-named',
    CARD_FACE_GEOMETRY.cornerTopLeftNamed.y1 - CARD_FACE_GEOMETRY.cornerTopLeftNamed.y0,
  ],
  [
    'wc-face-corner-h-plain',
    CARD_FACE_GEOMETRY.cornerTopLeftPlain.y1 - CARD_FACE_GEOMETRY.cornerTopLeftPlain.y0,
  ],
  ['wc-face-rank-size', CARD_FACE_TYPE.rankSize],
  ['wc-face-name-size', CARD_FACE_TYPE.nameSize],
  ['wc-face-corner-glyph', CARD_FACE_TYPE.cornerGlyph],
  ['wc-face-art-x', CARD_FACE_GEOMETRY.artWindow.x0],
  ['wc-face-art-top', CARD_FACE_GEOMETRY.artWindow.y0],
  ['wc-face-art-bottom', 1 - CARD_FACE_GEOMETRY.artWindow.y1],
  ['wc-face-pip-x', CARD_FACE_GEOMETRY.pipField.x0],
  ['wc-face-pip-top', CARD_FACE_GEOMETRY.pipField.y0],
  ['wc-face-pip-bottom', 1 - CARD_FACE_GEOMETRY.pipField.y1],
  ['wc-face-mark-x', CARD_FACE_GEOMETRY.noRuleMark.x0],
  ['wc-face-mark-top', CARD_FACE_GEOMETRY.noRuleMark.y0],
  ['wc-face-mark-bottom', 1 - CARD_FACE_GEOMETRY.noRuleMark.y1],
]

describe('warCouncilCards.css mirrors cardFace.ts', () => {
  it.each(MIRRORED)('declares --%s as %d', (property, expected) => {
    expect(declared(property)).toBeCloseTo(expected, 5)
  })

  // The mirrored corner box is the geometry the stylesheet derives rather than declares, so
  // assert the derivation instead: it is the top-left plain box, reflected.
  it('keeps the mirrored corner a reflection of the plain one', () => {
    const tl = CARD_FACE_GEOMETRY.cornerTopLeftPlain
    const br = CARD_FACE_GEOMETRY.cornerBottomRight
    expect(1 - br.x1).toBeCloseTo(tl.x0, 5)
    expect(1 - br.y1).toBeCloseTo(tl.y0, 5)
    expect(br.x1 - br.x0).toBeCloseTo(tl.x1 - tl.x0, 5)
    expect(br.y1 - br.y0).toBeCloseTo(tl.y1 - tl.y0, 5)
  })

  it('holds the corner index to its declared box, so the AC5 assertion means something', () => {
    expect(css).toMatch(/\.wc-card-corner\b[^}]*overflow:\s*hidden/s)
    expect(css).toMatch(/\.wc-card-corner\b[^}]*height:\s*calc\(100% \* var\(--wc-face-corner-h-plain\)\)/s)
  })

  it('carries the reference sheet’s two measured performance findings', () => {
    expect(css).not.toMatch(/mix-blend-mode/)
    expect(css).not.toMatch(/filter:\s*url\(/)
  })
})
```

- [x] **Step 2: Run it**

Run: `npx vitest run src/app/warCouncil/__tests__/cardFaceCss.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed. A failure here is a real mismatch — fix the side that is wrong rather than loosening the spec.

Actual: `Test Files 1 passed (1)`, `Tests 20 passed (20)`; `npm run typecheck` exits 0. (`typecheck` only went green after the `CardFace.tsx` → `CardFacePanel.tsx` rename recorded under Task 5/6 — TS1149 on this Windows box.)

---

## Phase 4 — The tooltip

AC8's channel. The rule text is put into the accessible tree unconditionally and into a visible bubble on hover, focus and tap. This is the only effect-bearing code in the contract, so its teardown is asserted rather than assumed. The phase ends with the full face and its rule surface working together.

### Task 9: `useCardTip.ts` — open state, anchor, and document listeners ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/useCardTip.ts`

- [x] **Step 1: Write the hook**

```ts
import { useEffect, useRef, useState } from 'react'

export interface CardTipState {
  readonly open: boolean
  readonly anchor: DOMRect | null
  readonly hostRef: React.RefObject<HTMLSpanElement | null>
  readonly toggle: () => void
  readonly close: () => void
}

/**
 * The tooltip's open state and the three listeners that close it.
 *
 * All three are registered ONLY while open and removed in the same effect's cleanup, so a card
 * that unmounts with its tooltip up — a played card leaving the hand, which is the ordinary case —
 * leaves nothing behind. Add-and-remove is idempotent, so StrictMode's double invocation is a
 * no-op rather than a doubled handler.
 *
 * The `pointerdown` listener is also what gives exclusivity for free: a tap on a second card fires
 * `pointerdown` before its `click`, so the first tooltip closes without any shared state between
 * cards.
 *
 * `resize` CLOSES rather than re-measures. The anchor is measured once on open; the felt is a
 * no-scroll shell so there is no scroll to track, and a bubble left pointing at where the card
 * used to be is worse than one that has been dismissed.
 */
export function useCardTip(): CardTipState {
  const hostRef = useRef<HTMLSpanElement | null>(null)
  const [anchor, setAnchor] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (anchor === null) return
    const close = () => setAnchor(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
    }
  }, [anchor])

  function toggle() {
    // A visible no-op rather than a bubble rendered at the origin: if the host is not mounted
    // there is nothing to anchor to, and guessing a position would be worse than doing nothing.
    const rect = hostRef.current?.getBoundingClientRect() ?? null
    setAnchor((current) => (current === null ? rect : null))
  }

  return { open: anchor !== null, anchor, hostRef, toggle, close: () => setAnchor(null) }
}
```

Note that `open` is derived from `anchor` rather than held as a second `useState` — two pieces of state for one fact is exactly how a bubble ends up open with no position.

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

Actual: exits 0.

### Task 10: `CardAbilityTip.tsx` and its wiring into `PlayingCard` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/app/warCouncil/CardAbilityTip.tsx`
- Modify: `src/app/warCouncil/PlayingCard.tsx` — wrap the button, join the rule id into `aria-describedby`
- Modify: `src/app/warCouncil/warCouncilCardFace.css` — the `.wc-card-tip-host` and `.wc-card-tip` rules (redirected here from `warCouncilCards.css`; see Step 3's note — `warCouncilCards.css` was already 352 lines and the tooltip block would have pushed it to 414, over the 400-line budget)
- Test: `src/app/warCouncil/__tests__/CardAbilityTip.test.tsx`

- [x] **Step 1: Write `CardAbilityTip.tsx`**

Takes `{ card, children }` — no id prop, because the hidden rule span that `aria-describedby` points at lives in `PlayingCard`, not here. Renders `<span className="wc-card-tip-host" ref={hostRef} onClick={toggle}>`, its `children` (the card's `<button>`), and — when open — a `createPortal` of the bubble into `document.body`:

```tsx
{open && anchor !== null &&
  createPortal(
    <div
      className="wc-card-tip"
      role="tooltip"
      style={{ left: anchor.left + anchor.width / 2, top: anchor.top }}
    >
      <b>{cardTipTitle(card.rank)}</b>
      {RANK_RULE_TEXT[card.rank]}
    </div>,
    document.body,
  )}
```

The bubble is portalled because `HandFan` gives each slot its own `z-index` (`fanLayout.ts:28`), which creates a stacking context per slot — a bubble rendered inside a slot is trapped beneath the neighbouring card whatever `z-index` it is given. `react-dom` is already a runtime dependency; nothing new is added.

The bubble carries **no id and no `aria-describedby` link**: the rule text reaches assistive technology through the always-present hidden span in Step 2, so linking the transient bubble as well would announce it twice. Hover and focus are handled entirely in CSS (`:hover`, `:focus-within` on the host) and never reach React — no `:has()` anywhere, which answers the ticket's open question by removing the dependency.

- [x] **Step 2: Wire it into `PlayingCard`**

Wrap the existing `<button>` in `<CardAbilityTip card={card}>`. Add the always-present rule span **inside** the button, with an id from `useId()`, and join it into the existing `describedBy`:

```tsx
const tipId = useId()
const describedByIds = [describedBy, tipId].filter(Boolean).join(' ')
```

Pass `aria-describedby={describedByIds}` — note that this is now always non-empty, so the existing `exposes aria-describedby only when describedBy is passed (DLR-117)` case must be updated to assert that the caller's id is *present among* the ids rather than that the attribute is absent. Update that case's name and body to match; do not delete it.

Inside the button, after the face:

```tsx
<span id={tipId} className="wc-sr-only">
  {RANK_RULE_TEXT[card.rank]}
</span>
```

This is what keeps `game-ux`'s rule — nothing a decision needs behind hover — satisfied: touch has no hover, and a rule that existed only while a bubble was open would be unreachable for anyone not using a pointer.

The host is a `<span>`, so `useRovingTabIndex`'s `querySelectorAll('button')` contract is untouched: the card's root is still a native `<button>` and the bubble is a `<div>`, never a second button.

- [x] **Step 3: Style the host and the bubble**

Port `mockup.html`'s `.tip-host` / `.tip` rules onto `.wc-card-tip-host` / `.wc-card-tip`, with the bubble `position: fixed` (it is portalled to `document.body`) and `transform: translate(-50%, -100%)` so the `left`/`top` written inline anchor its bottom-centre to the card's top edge. Open on `.wc-card-tip-host:hover`, `.wc-card-tip-host:focus-within`, and the open state class. Wrap the hover rule in `@media (hover: hover)` and keep the whole transition inside the existing `@media (prefers-reduced-motion: reduce)` block.

Actual: placed in `warCouncilCardFace.css` instead of `warCouncilCards.css` — the latter was already 352 lines and the ~62-line tooltip block would have carried it to 414, over the 400-line budget; `warCouncilCardFace.css` (297 → 365) had the room. Its own `@media (prefers-reduced-motion: reduce)` block (new, since none existed there before) covers `.wc-card-tip`'s transition; `warCouncilCards.css`'s existing reduced-motion block, which covers `.wc-card`, is untouched.

- [x] **Step 4: Write the tooltip spec**

Create `src/app/warCouncil/__tests__/CardAbilityTip.test.tsx` (`dom` project). Cover: a tap opens the bubble and a second tap closes it; `Escape` closes it; a `pointerdown` elsewhere closes it; the rule text is in the accessible tree **before** any interaction (query the hidden span by id from the button's `aria-describedby`); mounting inside `<StrictMode>` yields exactly one bubble; and unmounting while open removes every document listener — spy on `document.removeEventListener` and assert `pointerdown` and `keydown` were both released.

- [x] **Step 5: Run the card specs and the type gate**

Run: `npx vitest run src/app/warCouncil/__tests__/CardAbilityTip.test.tsx src/app/warCouncil/__tests__/PlayingCard.test.tsx; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

Actual: `Test Files 2 passed (2)`, `Tests 26 passed (26)`; `npm run typecheck` exits 0.

- [x] **Step 6: Confirm every call site still passes**

Run: `npx vitest run --project dom`
Expected: exits 0, 0 failed. The host `<span>` becomes a flex item in `AbilityPrompt`, `TrickWell`, `DecreePile` and `FeltRail`; a failure here is a real layout or query regression.

Actual: `Test Files 29 passed (29)`, `Tests 286 passed (286)`. Collateral fallout from `aria-describedby` now always carrying the rule-text id (and the button's full `textContent` now legitimately including the hidden rule sentence): four pre-existing specs asserted the OLD behaviour and needed updating to match the new, intended one — `PlayingCard.test.tsx`'s `AC8` case (now reads only the `aria-hidden` face wrapper's text, not the whole button) and its DLR-117 case (renamed, now asserts the caller's id is present *among* the ids rather than that the attribute is absent), plus `HandFan.test.tsx` (3 cases) and `WarCouncilRound.readouts.test.tsx` (2 cases), both of which resolve `aria-describedby`'s now-multi-id value by resolving and concatenating every id rather than calling `getElementById` on the raw (space-separated, so invalid) attribute string. `npx vitest run src/app/warCouncil/__tests__/` — the whole directory, not the full unfiltered suite — separately confirmed all 557 tests in the module pass.

---

## Phase 5 — Final verification

No production changes. Only sanity checks that the cumulative work is clean and that the boundaries this contract claimed are the boundaries it actually has.

### Task 11: Confirm the two new pure modules are genuinely pure ✓

- [x] **Step 1: Grep for React and DOM references in the face model**

Run: `Get-ChildItem src\app\warCouncil -Include cardFace.ts,cardRuleText.ts -Recurse | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits. Neither module lives under a lint-enforced pure tree — `src/app/**` is outside `src/warCouncil/**` and `src/hunt/**` — so this is review-enforced, and it is what lets `cardFace.test.ts` run in the cheap `node` project without a DOM.

Actual: one raw regex hit, in `cardFace.ts:123` — a docblock comment ending "...it occupies the identical window." The `\bwindow\.` pattern matches the prose word "window" followed by the sentence's full stop, not a `window.` DOM global reference. Confirmed by reading the surrounding lines: it is a comment on the `skullFace` rect entry. No real React import, DOM global, or storage access in either file — the modules are genuinely pure.

### Task 12: Confirm no geometry number was hard-coded outside its owner ✓

- [x] **Step 1: Grep the components for raw geometry fractions**

Run: `Get-ChildItem src\app\warCouncil -Include CardFace.tsx,PlayingCard.tsx,CardAbilityTip.tsx -Recurse | Select-String -Pattern "0\.(06|04|46|26|21|24|075|15|07|32|27|25|16|8)\b"`
Expected: zero hits. Every one of those numbers belongs to `cardFace.ts` or to a `--wc-face-*` custom property; a literal in a component is the drift the Task 8 spec exists to prevent, arriving by a route that spec cannot see.

Actual: zero hits. Also re-ran against the actual on-disk face component, `CardFacePanel.tsx` (the task's literal filename `CardFace.tsx` does not exist — see the case-collision note in the dispatch) — zero hits there too.

- [x] **Step 2: Confirm the old face left no orphans**

Run: `Get-ChildItem src\app\warCouncil -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "wc-is-blank"`
Expected: zero hits. `.wc-card-pip.wc-is-blank` was the old "this rank has no ability" marker and has no meaning under the new face; if the class survives in the stylesheet with no renderer, remove it.

Actual: zero hits. No orphaned class from the old face survives.

### Task 13: Static gates and full suite ✓

- [x] **Step 1: Warm the transform cache, then typecheck, lint and run the whole suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all five exit 0; the final `npm test` reports 0 failed. The two scoped runs first are deliberate — a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a jsdom worker-start timeout and **not** a failing test. Treat only a second consecutive timeout as a real problem.

Actual: `npx vitest run --project node` → `Test Files 125 passed (125)`, `Tests 1712 passed (1712)`. `npx vitest run --project dom` → `Test Files 29 passed (29)`, `Tests 286 passed (286)`. `npm run typecheck` exits 0, no output. `npm run lint` exits 0, no output (0 warnings). `npm test` → `Test Files 154 passed (154)`, `Tests 1998 passed (1998)`. All five exit 0.

- [x] **Step 2: Confirm formatting on the files this contract changed**

Run: `npx prettier --check src/app/warCouncil/cardFace.ts src/app/warCouncil/cardRuleText.ts src/app/warCouncil/CardArtSheet.tsx src/app/warCouncil/CardFacePanel.tsx src/app/warCouncil/CardAbilityTip.tsx src/app/warCouncil/useCardTip.ts src/app/warCouncil/PlayingCard.tsx src/app/warCouncil/SuitMark.tsx src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/warCouncilCards.css src/app/warCouncil/warCouncil.css`
Expected: exits 0. Scoped deliberately — the repo-wide `format:check` fails on ~58 pre-existing `.md` files, and `npm run format` must never be run: it rewrote 59 files by ~1,800 lines on DLR-116 and churned every hand-edited design document.

Actual: file list uses `CardFacePanel.tsx` — the task's literal `CardFace.tsx` does not exist on disk (case-collision, see dispatch notes). First run flagged `CardArtSheet.tsx` as unformatted — genuine drift (long JSX attribute lines not wrapped, single-quoted `style` string, missing trailing semicolon), fixed with `npx prettier --write` on that one file (pure whitespace/quote reflow, no code change). Re-ran typecheck, lint and `npx vitest run src/app/warCouncil/__tests__/` after the fix — all clean (`Test Files 49 passed (49)`, `Tests 557 passed (557)`). Second `prettier --check` run: "All matched files use Prettier code style!" — exits 0.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Actual: `npm run lint && tsc -b && vite build` all succeeded — `168 modules transformed`, `dist/index.html`, `dist/assets/index-*.css` (72.35 kB), `dist/assets/index-*.js` (328.08 kB), `✓ built in 219ms`. Exit 0, no bundler errors.

- [x] **Step 4: Measure every file this contract created or grew**

Run: `Get-ChildItem src\app\warCouncil -Include cardFace.ts,cardRuleText.ts,CardArtSheet.tsx,CardFacePanel.tsx,CardAbilityTip.tsx,useCardTip.ts,PlayingCard.tsx,SuitMark.tsx,warCouncilCards.css -Recurse | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName).Count)" }`

Actual: `CardAbilityTip.tsx: 54`, `CardArtSheet.tsx: 213`, `cardFace.ts: 198`, `CardFacePanel.tsx: 86`, `cardRuleText.ts: 34`, `PlayingCard.tsx: 133`, `SuitMark.tsx: 101`, `useCardTip.ts: 59`, `warCouncilCards.css: 351`. Also measured the other files this contract's phases touched, not named in the task's list: `warCouncilCardFace.css: 365`, `warCouncil.css: 393`, `WarCouncilRound.tsx: 355`. Every count is under 400 — no breach.
Expected: every count under 400. Report the numbers. Any breach is fixed inside this contract by splitting the file, never handed back as a finding.

### Task 14: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` and `mockup.html` in this folder.
- A summary of the change: three face classes, the geometry-as-numbers approach and why AC5 needed it, the tooltip's three channels, and the elaborated suit glyphs.
- **Every decision the developer must make**, copied from the File map's *Developer decides or observes* — leading with `--wc-card-w`, since AC6 and AC7 are not met until it is chosen, and stating the two figures (≈5.25rem for a 14px pip, ≈7.5rem for a 9px name).
- **Every behaviour they must judge by playing** — the greyscale check, tap-to-read-also-arms, and the skull filling the art window.
- Verification results from Phase 5, quoting the actual Vitest summary lines and file counts.
- A one-line note for future contributors on the new convention: **geometry lives in `cardFace.ts` and is mirrored into `warCouncilCards.css`, with `cardFaceCss.test.ts` as the guard** — change one side and the spec fails, which is the intended way to find out.
- A note that `fanLayout.ts` still fans while `mockup.html` lays the hand out side by side, and that reconciling the two is deliberately a separate ticket.

---

## Self-review

**Spec coverage:**

- *Pure `cardFace.ts` with face classes, names, figures, lattice and geometry* — Task 1.
- *Vitest node spec asserting AC5, AC4, totality and `RANK_NAME` agreement* — Task 1 Step 1; Task 2 Step 2 covers the copy half.
- *Rebuilt `PlayingCard.tsx` with props unchanged* — Task 6.
- *`CardFace.tsx`, `CardArtSheet.tsx`, `CardAbilityTip.tsx` + `useCardTip.ts`* — Tasks 5, 4, 10 and 9.
- *Elaborated suit symbols setting no `stroke-width` (AC7)* — Task 3, with a grep proving it.
- *Rewritten card-face CSS driven by mirrored custom properties, plus the drift spec* — Tasks 7 and 8.
- *A CSS rule for `.wc-discard-mark`* — Task 7 Step 2.
- *`CardArtSheet` mounted in `WarCouncilRound.tsx`* — Task 4 Step 2.
- *Rule copy in `cardRuleText.ts` from `the-hunt.md`* — Task 2.
- *AC1* — Tasks 1, 5, 6 (two component cases). *AC2* — Tasks 1, 6, 7. *AC3* — Tasks 1, 6. *AC4* — Tasks 1, 5, 6. *AC5* — Task 1 Step 1, held honest by Tasks 7 and 8. *AC6* — Tasks 1, 5, 6, 7. *AC7* — Task 3, with the size decision routed to the developer. *AC8* — Tasks 2, 6 (the no-printed-text case), 9, 10.

**Placeholder scan:** no `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N". Every step shows the exact code, the exact transcription source, or a runnable command with `Run:` / `Expected:`.

**Type / name consistency:** `CARD_FACE_GEOMETRY`, `CARD_FACE_TYPE`, `RANK_FACE`, `RankFaceClass`, `FigureKey`, `PipSpot`, `PIP_LAYOUT`, `PIP_MID_ROW`, `pipCellRect`, `pipIsInverted`, `printedRects`, `rectsOverlap`, `cardActs`, `RANK_RULE_TEXT`, `cardTipTitle`, `NO_RULE_MARK_LABEL`, `useCardTip`, `CardTipState` are spelled identically in Tasks 1, 2, 5, 6, 8, 9 and 10 and match `plan.md` Part 2 → Data shapes. The class names `wc-card-rank`, `wc-card-suit` and `wc-card-pip` are deliberately retained from the existing face, and `wc-card-corner`, `wc-card-name`, `wc-card-art`, `wc-card-pips`, `wc-card-no-rule`, `wc-card-tip-host`, `wc-card-tip`, `wc-is-named`, `wc-is-inverted`, `wc-is-skulled` and the seven `wc-fig-*` classes are used identically in Tasks 4, 5, 6, 7, 8 and 10. The seventeen `--wc-face-*` property names appear identically in Tasks 7 and 8 and in `mockup.html`. Figure symbol ids are `wc-fig-<FigureKey>` in Tasks 4, 5 and 6, with Task 4 Step 4 grepping for a collision with `SuitMark`'s ids.

**Phase boundary cleanliness:**

- *Phase 1* ends with two pure modules and their specs added and nothing importing them — the app type-checks and renders exactly as before.
- *Phase 2* ends with the suit glyphs elaborated (a visible but self-contained change) and the figure sheet mounted but unreferenced; no half-applied face, no dead import.
- *Phase 3* ends with the composition, its stylesheet and the drift guard landed together — the one boundary that could not be split, since components rendering classes the stylesheet lacks would type-check and render blank.
- *Phase 4* ends with the tooltip working through all three channels and the rule text in the accessible tree; `PlayingCardProps` is still unchanged, so no call site is mid-migration.
- *Phase 5* changes no production code.
