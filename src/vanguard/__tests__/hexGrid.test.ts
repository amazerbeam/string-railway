import { describe, expect, it } from 'vitest'
import {
  allBoardCoords,
  cellKey,
  hexBfs,
  hexDistance,
  hexNeighbors,
  isWithinBoard,
} from '../hexGrid'
import type { HexCoord } from '../types'

describe('cellKey', () => {
  it('formats a coordinate as "q,r"', () => {
    expect(cellKey({ q: 3, r: -2 })).toBe('3,-2')
  })
})

describe('isWithinBoard', () => {
  it('accepts the corners of a size-N board', () => {
    expect(isWithinBoard({ q: 0, r: 0 }, 5)).toBe(true)
    expect(isWithinBoard({ q: 4, r: 4 }, 5)).toBe(true)
  })

  it('rejects one step outside either axis', () => {
    expect(isWithinBoard({ q: -1, r: 0 }, 5)).toBe(false)
    expect(isWithinBoard({ q: 0, r: 5 }, 5)).toBe(false)
  })
})

describe('hexNeighbors', () => {
  it('returns the 6 axial-direction neighbours, unfiltered by bounds', () => {
    expect(hexNeighbors({ q: 0, r: 0 })).toEqual([
      { q: 1, r: 0 },
      { q: 1, r: -1 },
      { q: 0, r: -1 },
      { q: -1, r: 0 },
      { q: -1, r: 1 },
      { q: 0, r: 1 },
    ])
  })
})

describe('hexDistance', () => {
  it('is 0 for the same cell', () => {
    expect(hexDistance({ q: 2, r: 2 }, { q: 2, r: 2 })).toBe(0)
  })

  it('is 1 for each of the 6 neighbours', () => {
    const origin: HexCoord = { q: 4, r: 4 }
    for (const neighbor of hexNeighbors(origin)) {
      expect(hexDistance(origin, neighbor)).toBe(1)
    }
  })

  it('is 2 exactly 2 hex-spaces away, and 3 exactly 3 away', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(2)
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3)
  })
})

describe('allBoardCoords', () => {
  it('returns exactly size*size coordinates with no duplicates', () => {
    const coords = allBoardCoords(4)
    expect(coords).toHaveLength(16)
    expect(new Set(coords.map(cellKey)).size).toBe(16)
  })
})

describe('hexBfs', () => {
  it('returns [] when the start cell itself fails canEnter', () => {
    expect(hexBfs({ q: 0, r: 0 }, 5, () => false)).toEqual([])
  })

  it('returns [] when the start cell is out of bounds', () => {
    expect(hexBfs({ q: -1, r: 0 }, 5, () => true)).toEqual([])
  })

  it('visits every canEnter-passing cell reachable from start, no duplicates', () => {
    const result = hexBfs({ q: 0, r: 0 }, 3, () => true)
    expect(result).toHaveLength(9)
    expect(new Set(result.map(cellKey)).size).toBe(9)
  })

  it('stops at a canEnter boundary rather than crossing it', () => {
    const blocked = new Set(['1,0', '0,1'])
    const result = hexBfs({ q: 0, r: 0 }, 3, (c) => !blocked.has(cellKey(c)))
    expect(result).toEqual([{ q: 0, r: 0 }])
  })

  it('every prefix of the visiting order is itself connected back to start', () => {
    const result = hexBfs({ q: 0, r: 0 }, 3, () => true)
    const visitedSoFar = new Set<string>()
    for (const coord of result) {
      const hasNeighborAlready =
        visitedSoFar.size === 0 || hexNeighbors(coord).some((n) => visitedSoFar.has(cellKey(n)))
      expect(hasNeighborAlready).toBe(true)
      visitedSoFar.add(cellKey(coord))
    }
  })
})
