import { describe, expect, it } from 'vitest'
import {
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  SLICE_QUARRY_CHARACTER,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  ENCOUNTER_PLAYER_RESTORE,
  SIMULTANEOUS_DEPLETION_WINNER,
  HAND_SIZE,
  SKULL_DENSITY,
  SKULL_WEIGHTS_UNIFORM,
  SKULL_WEIGHTS_RAMP,
  SKULL_WEIGHTS_HUMP,
  SKULL_WEIGHTS_AMBUSH,
  SKULL_RANK_WEIGHTS,
  DAMAGE_PER_HIT,
} from '../config'
import { DuelSide } from '../types'
import { quarryCharacterInfo } from '../quarryCharacters'

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

describe('SLICE_QUARRY_CHARACTER', () => {
  it('names a character whose rule-break is actually enforced', () => {
    expect(quarryCharacterInfo(SLICE_QUARRY_CHARACTER)).toBeDefined()
  })
})

describe('health, restore, and the depletion ruling (AC5, AC8)', () => {
  it('restores no health entering the next encounter, as a tunable rather than a hardcoded 0', () => {
    expect(ENCOUNTER_PLAYER_RESTORE).toBe(0)
    expect(Number.isFinite(ENCOUNTER_PLAYER_RESTORE)).toBe(true)
  })

  it('names the simultaneous-depletion winner as data — §5/§9: the player loses', () => {
    expect(SIMULTANEOUS_DEPLETION_WINNER).toBe(DuelSide.Quarry)
  })

  it('throws rather than returning undefined for an encounter it has no health for', () => {
    expect(() => quarryHealthForEncounter(QUARRY_ENCOUNTER_HEALTH.length)).toThrow(RangeError)
    expect(() => quarryHealthForEncounter(-1)).toThrow(RangeError)
  })
})

describe('DLR-80 configuration', () => {
  it('deals six cards and therefore six tricks', () => {
    expect(HAND_SIZE).toBe(6)
  })

  it('produces two skulls in a six-card hand, which is the spec’s roughly 30%', () => {
    const count = Math.round(HAND_SIZE * SKULL_DENSITY)
    expect(count).toBe(2)
    expect(count / HAND_SIZE).toBeCloseTo(0.333, 3)
  })

  it('deals exactly one damage per damage event', () => {
    expect(DAMAGE_PER_HIT).toBe(1)
  })

  it('starts the player at ten', () => {
    expect(PLAYER_START_HEALTH).toBe(10)
  })

  it('configures exactly one encounter', () => {
    expect(QUARRY_ENCOUNTER_HEALTH).toHaveLength(1)
    expect(() => quarryHealthForEncounter(1)).toThrow(RangeError)
  })
})

describe('skull rank weight curves', () => {
  const RANKS = Array.from({ length: 11 }, (_, i) => i + 1)
  const CURVES = {
    uniform: SKULL_WEIGHTS_UNIFORM,
    ramp: SKULL_WEIGHTS_RAMP,
    hump: SKULL_WEIGHTS_HUMP,
    ambush: SKULL_WEIGHTS_AMBUSH,
  }

  it.each(Object.entries(CURVES))('%s names every rank 1-11', (_name, curve) => {
    for (const rank of RANKS) expect(curve[rank]).toBeTypeOf('number')
  })

  it.each(Object.entries(CURVES))('%s never skulls a rank 1', (_name, curve) => {
    expect(curve[1]).toBe(0)
  })

  it.each(Object.entries(CURVES))('%s has no negative weight', (_name, curve) => {
    for (const rank of RANKS) expect(curve[rank]).toBeGreaterThanOrEqual(0)
  })

  it.each(Object.entries(CURVES))('%s has some positive weight', (_name, curve) => {
    expect(RANKS.reduce((sum, r) => sum + curve[r], 0)).toBeGreaterThan(0)
  })

  it('has hump as the active curve', () => {
    expect(SKULL_RANK_WEIGHTS).toBe(SKULL_WEIGHTS_HUMP)
  })
})
