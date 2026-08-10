import { describe, expect, it } from 'vitest'
import {
  STANDING_BANDS,
  StandingBandName,
  resolveStanding,
  cardBaseValue,
  DEMAND_CURVE,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  FIXED_DEMAND,
  SLICE_QUARRY_CHARACTER,
  type StandingBand,
} from '../config'
import { quarryCharacterInfo } from '../quarryCharacters'

describe('resolveStanding', () => {
  it.each([
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 1],
    [5, 2],
    [6, 3],
    [7, 6],
    [8, 6],
    [9, 6],
    [10, 0],
    [11, 0],
    [12, 0],
    [13, 0],
  ])('tricks=%i -> multiplier %i', (tricks, multiplier) => {
    expect(resolveStanding(tricks).multiplier).toBe(multiplier)
  })

  it('resolves every trick count 0-13 to exactly one band, with no gap and no overlap', () => {
    for (let tricks = 0; tricks <= 13; tricks++) {
      const matches = STANDING_BANDS.filter(
        (band) => tricks >= band.minTricks && tricks <= band.maxTricks,
      )
      expect(matches).toHaveLength(1)
    }
  })

  it('changes the resolved value when a multiplier changes in the table, with no other edit', () => {
    const baseline = resolveStanding(0)
    const mutatedTable: readonly StandingBand[] = STANDING_BANDS.map((band) =>
      band.name === StandingBandName.Humble ? { ...band, multiplier: 99 } : band,
    )
    const mutated = resolveStanding(0, mutatedTable)
    expect(mutated.multiplier).toBe(99)
    expect(mutated.multiplier).not.toBe(baseline.multiplier)
    expect(resolveStanding(0).multiplier).toBe(baseline.multiplier)
  })

  it('throws for a trick count outside the configured 0-13 range', () => {
    expect(() => resolveStanding(14)).toThrow(RangeError)
    expect(() => resolveStanding(-1)).toThrow(RangeError)
  })
})

describe('cardBaseValue', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('rank %i is worth its printed rank', (rank) => {
    expect(cardBaseValue(rank)).toBe(rank)
  })
})

describe('DEMAND_CURVE', () => {
  it('ships with no chosen value — both fields stay null until the developer sets them', () => {
    expect(DEMAND_CURVE.base).toBeNull()
    expect(DEMAND_CURVE.growthPerEncounter).toBeNull()
  })
})

describe('Forage and run-length constants', () => {
  it('matches the provisional values from DLR-48 AC3', () => {
    expect(FORAGE_BUDGET_PER_ENCOUNTER).toBe(4)
    expect(ENCOUNTERS_PER_RUN).toBe(5)
  })
})

describe('TELEGRAPH_FIDELITY', () => {
  it("defaults to SuitAndStance — DLR-52 AC4's stated default", () => {
    expect(TELEGRAPH_FIDELITY).toBe(TelegraphFidelity.SuitAndStance)
  })

  it('has exactly the two named fidelity levels', () => {
    expect(Object.values(TelegraphFidelity)).toEqual(
      expect.arrayContaining(['suit', 'suitAndStance']),
    )
    expect(Object.values(TelegraphFidelity)).toHaveLength(2)
  })
})

describe('FIXED_DEMAND', () => {
  it('is a positive finite number, so checkDemand can never compare against null', () => {
    expect(Number.isFinite(FIXED_DEMAND)).toBe(true)
    expect(FIXED_DEMAND).toBeGreaterThan(0)
  })
})

describe('SLICE_QUARRY_CHARACTER', () => {
  it('names a character whose rule-break is actually enforced', () => {
    expect(quarryCharacterInfo(SLICE_QUARRY_CHARACTER)).toBeDefined()
  })
})
