import { describe, expect, it } from 'vitest'
import {
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  QUARRY_LEAD_TELEGRAPH_ENABLED,
  SLICE_QUARRY_CHARACTER,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  ENCOUNTER_PLAYER_RESTORE,
  HAND_SIZE,
  SKULL_DENSITY,
  DAMAGE_PER_HIT,
  BASE_DAMAGE,
  RUN_STARTING_CHEATS,
  COINS_PER_ENCOUNTER_WIN,
  CHEAT_PRICE,
  HEAL_PRICE,
  HEAL_HEALTH_RESTORED,
  FLASK_STARTING_CHARGES,
  FLASK_HEAL_PERCENT,
  OpponentKind,
  ORDINARY_OPPONENT_NAMES,
  STAGE_BOSS_NAMES,
  RUN_ENCOUNTERS,
  runEncounterAt,
  AP_ENABLED,
  STARTING_AP,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
} from '../config'
import {
  SKULL_WEIGHTS_UNIFORM,
  SKULL_WEIGHTS_RAMP,
  SKULL_WEIGHTS_HUMP,
  SKULL_WEIGHTS_AMBUSH,
  SKULL_RANK_WEIGHTS,
} from '../skullWeights'
import { quarryCharacterInfo } from '../quarryCharacters'

describe('Forage and run-length constants', () => {
  it('keeps DLR-48 AC3’s forage budget', () => {
    expect(FORAGE_BUDGET_PER_ENCOUNTER).toBe(4)
  })

  it('derives the run length from the curve rather than stating it twice (DLR-82 AC1)', () => {
    expect(ENCOUNTERS_PER_RUN).toBe(QUARRY_ENCOUNTER_HEALTH.length)
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

  it('DLR-156 AC10 — BASE_DAMAGE is the configured 1', () => {
    expect(BASE_DAMAGE).toBe(1)
  })

  it('starts the player at ten', () => {
    expect(PLAYER_START_HEALTH).toBe(10)
  })

  it('configures at least three encounters, rising and not all the same (DLR-82 AC1)', () => {
    expect(QUARRY_ENCOUNTER_HEALTH.length).toBeGreaterThanOrEqual(3)
    expect(new Set(QUARRY_ENCOUNTER_HEALTH).size).toBeGreaterThan(1)
    for (const health of QUARRY_ENCOUNTER_HEALTH) {
      expect(health).toBeGreaterThan(0)
      expect(Number.isFinite(health)).toBe(true)
    }
    expect(() => quarryHealthForEncounter(QUARRY_ENCOUNTER_HEALTH.length)).toThrow(RangeError)
  })
})

describe('The opening Cheat pile seed (DLR-132, re-homed from DLR-83)', () => {
  it('grants a whole, non-negative number of opening Cheat buffs', () => {
    expect(Number.isInteger(RUN_STARTING_CHEATS)).toBe(true)
    expect(RUN_STARTING_CHEATS).toBeGreaterThanOrEqual(0)
  })
})

describe('DLR-84 shop tunables', () => {
  it('prices both items and the payout as non-negative whole numbers of coins', () => {
    for (const value of [COINS_PER_ENCOUNTER_WIN, CHEAT_PRICE, HEAL_PRICE]) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })

  it('restores a positive, finite amount of health that cannot exceed the player maximum in one buy', () => {
    expect(HEAL_HEALTH_RESTORED).toBeGreaterThan(0)
    expect(Number.isFinite(HEAL_HEALTH_RESTORED)).toBe(true)
    expect(HEAL_HEALTH_RESTORED).toBeLessThanOrEqual(PLAYER_START_HEALTH)
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

describe('RUN_ENCOUNTERS (DLR-85)', () => {
  it('is the source QUARRY_ENCOUNTER_HEALTH projects, entry for entry', () => {
    expect(QUARRY_ENCOUNTER_HEALTH).toEqual(RUN_ENCOUNTERS.map((e) => e.health))
    expect(ENCOUNTERS_PER_RUN).toBe(RUN_ENCOUNTERS.length)
  })

  it('preserves DLR-82’s measured opening curve', () => {
    expect(QUARRY_ENCOUNTER_HEALTH.slice(0, 3)).toEqual([10, 14, 18])
  })

  it('runs four ordinary opponents to a boss, five stages over, closing on Diarmuid', () => {
    expect(RUN_ENCOUNTERS).toHaveLength(25)
    expect(RUN_ENCOUNTERS.filter((e) => e.kind === OpponentKind.Boss)).toHaveLength(5)
    const last = RUN_ENCOUNTERS[RUN_ENCOUNTERS.length - 1]
    expect(last?.kind).toBe(OpponentKind.Boss)
    expect(last?.name).toBe('Diarmuid')
  })

  it('names every entry from the roster, without reuse', () => {
    const names = RUN_ENCOUNTERS.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
    for (const e of RUN_ENCOUNTERS) {
      const roster = e.kind === OpponentKind.Boss ? STAGE_BOSS_NAMES : ORDINARY_OPPONENT_NAMES
      expect(roster).toContain(e.name)
    }
  })

  it('gives every entry a positive finite health', () => {
    for (const e of RUN_ENCOUNTERS) {
      expect(Number.isFinite(e.health)).toBe(true)
      expect(e.health).toBeGreaterThan(0)
      expect(Number.isInteger(e.health)).toBe(true)
    }
  })

  it('throws a RangeError for an index past the configured run', () => {
    expect(() => runEncounterAt(RUN_ENCOUNTERS.length)).toThrow(RangeError)
    expect(() => runEncounterAt(-1)).toThrow(RangeError)
  })
})

describe('DLR-93 — the flask (AC1, AC2)', () => {
  it('opens a run with exactly one charge, as a key rather than a literal', () => {
    expect(FLASK_STARTING_CHARGES).toBe(1)
    expect(Number.isInteger(FLASK_STARTING_CHARGES)).toBe(true)
    expect(FLASK_STARTING_CHARGES).toBeGreaterThan(0)
  })

  it('restores a proportion of maximum health, not a 0..100 percentage', () => {
    expect(FLASK_HEAL_PERCENT).toBe(0.6)
    expect(FLASK_HEAL_PERCENT).toBeGreaterThan(0)
    expect(FLASK_HEAL_PERCENT).toBeLessThanOrEqual(1)
  })

  it('is a bigger heal than the shop pays for, at the current maximum', () => {
    expect(Math.round(PLAYER_START_HEALTH * FLASK_HEAL_PERCENT)).toBeGreaterThan(
      HEAL_HEALTH_RESTORED,
    )
  })
})

describe('Action Points (DLR-104 AC1)', () => {
  it('starts with a positive, finite, whole-number pool', () => {
    expect(Number.isInteger(STARTING_AP)).toBe(true)
    expect(STARTING_AP).toBeGreaterThan(0)
  })

  it('defaults AP_ENABLED to a real boolean, not a truthy placeholder', () => {
    expect(typeof AP_ENABLED).toBe('boolean')
  })

  it('defaults the refresh cadence to perTrick, the developer-set 2026-08-25 default', () => {
    expect(AP_REFRESH_CADENCE).toBe(ApRefreshCadence.PerTrick)
  })

  it('names the cadence as an enum-shaped constant, not a boolean', () => {
    expect(Object.values(ApRefreshCadence)).toContain('perHand')
    expect(Object.values(ApRefreshCadence)).toContain('perTrick')
  })
})
