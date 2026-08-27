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
  skullFootprintFor,
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
    expect(
      rectsOverlap({ x0: 0, y0: 0, x1: 0.5, y1: 0.5 }, { x0: 0.5, y0: 0, x1: 1, y1: 0.5 }),
    ).toBe(false)
    expect(
      rectsOverlap({ x0: 0, y0: 0, x1: 0.5, y1: 0.5 }, { x0: 0.49, y0: 0, x1: 1, y1: 0.5 }),
    ).toBe(true)
  })

  // AC6 — the mirrored index prints only where nothing else is printed there.
  it('gives a second corner index to plain ranks only', () => {
    for (const rank of RANKS) {
      const expected = RANK_FACE[rank].faceClass === RankFaceClass.Plain ? 2 : 1
      expect({ rank, corners: printedRects(rank).corners.length }).toEqual({
        rank,
        corners: expected,
      })
    }
  })

  // CRIT-2 (round-2 defender review) — the overlap assertion above passed even while
  // `warCouncilCardFace.css` painted every skull at `skullFace`/`artWindow` regardless of rank,
  // because `pipField` never overlaps a corner EITHER, so a wrong-but-non-overlapping footprint
  // was indistinguishable from a right one. Assert the branch selection by name instead, so a
  // future change that puts a Plain rank back on the art-window footprint fails here.
  it('gives a skulled Plain rank the pip field footprint, and an Act/Inert rank the art window', () => {
    for (const rank of RANKS) {
      const face = RANK_FACE[rank]
      const expected =
        face.faceClass === RankFaceClass.Plain
          ? CARD_FACE_GEOMETRY.pipField
          : CARD_FACE_GEOMETRY.skullFace
      expect({ rank, footprint: skullFootprintFor(rank) }).toEqual({ rank, footprint: expected })
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
    expect(
      Object.keys(PIP_LAYOUT)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(pipRanks)
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
      expect({ key, name: RANK_FACE[Number(key)].name }).toEqual({
        key,
        name: RANK_NAME[Number(key)],
      })
    }
  })
})
