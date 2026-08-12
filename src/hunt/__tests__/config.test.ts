import { describe, expect, it } from 'vitest'
import {
  HUNT_MULTIPLIER_TABLES,
  StandingBandName,
  standingTableFor,
  resolveStanding,
  cardBaseValue,
  cardValueFor,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  SLICE_QUARRY_CHARACTER,
  invertedCardValue,
  RANK_INVERSION_PIVOT,
  DamageRounding,
  DAMAGE_ROUNDING,
  roundDamage,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  ENCOUNTER_PLAYER_RESTORE,
  SIMULTANEOUS_DEPLETION_WINNER,
  type StandingBand,
} from '../config'
import { HuntDeclaration, DuelSide } from '../types'
import { quarryCharacterInfo } from '../quarryCharacters'

const win = standingTableFor(HuntDeclaration.Win)
const lose = standingTableFor(HuntDeclaration.Lose)

describe('HUNT_MULTIPLIER_TABLES — the shipped default pair (AC1)', () => {
  it.each([
    [0, 1],
    [3, 1],
    [4, 2],
    [5, 3],
    [6, 4],
    [7, 5],
    [8, 5],
    [9, 5],
    [10, 0.5],
    [13, 0.5],
  ])('Win: %i tricks -> ×%s', (tricks, multiplier) => {
    expect(resolveStanding(tricks, win).multiplier).toBe(multiplier)
  })

  it.each([
    [0, 0.5],
    [3, 0.5],
    [4, 5],
    [5, 5],
    [6, 5],
    [7, 4],
    [8, 3],
    [9, 2],
    [10, 1],
    [13, 1],
  ])('Lose: %i tricks -> ×%s', (tricks, multiplier) => {
    expect(resolveStanding(tricks, lose).multiplier).toBe(multiplier)
  })

  it('carries genuinely different band boundaries per table — Win groups 7-9, Lose groups 4-6', () => {
    const winBand = resolveStanding(8, win)
    const loseBand = resolveStanding(5, lose)
    expect([winBand.minTricks, winBand.maxTricks]).toEqual([7, 9])
    expect([loseBand.minTricks, loseBand.maxTricks]).toEqual([4, 6])
    // The same split lands in a one-row band on the other table, which is what a shared
    // boundary set could not express.
    expect(resolveStanding(8, lose).minTricks).toBe(resolveStanding(8, lose).maxTricks)
  })

  it.each([HuntDeclaration.Win, HuntDeclaration.Lose])(
    '%s resolves every trick count 0-13 to exactly one band, with no gap and no overlap',
    (declaration) => {
      const table = standingTableFor(declaration)
      for (let tricks = 0; tricks <= 13; tricks++) {
        const matches = table.filter((b) => tricks >= b.minTricks && tricks <= b.maxTricks)
        expect(matches).toHaveLength(1)
      }
    },
  )

  it('throws for a trick count outside the configured 0-13 range, on either table', () => {
    expect(() => resolveStanding(14, win)).toThrow(RangeError)
    expect(() => resolveStanding(-1, win)).toThrow(RangeError)
    expect(() => resolveStanding(14, lose)).toThrow(RangeError)
    expect(() => resolveStanding(-1, lose)).toThrow(RangeError)
  })

  it('exports one table per declaration and no other', () => {
    expect(Object.keys(HUNT_MULTIPLIER_TABLES).sort()).toEqual(
      Object.values(HuntDeclaration).sort(),
    )
  })
})

describe('complementarity — Lose(k) = Win(13 − k) at all fourteen splits (AC3)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])(
    'k=%i: the Lose multiplier equals the Win multiplier at 13 − k',
    (k) => {
      expect(resolveStanding(k, lose).multiplier).toBe(resolveStanding(13 - k, win).multiplier)
    },
  )
})

describe('a whole-table swap is data, not code (AC4)', () => {
  const altWin: readonly StandingBand[] = [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 1 },
    { minTricks: 4, maxTricks: 4, name: StandingBandName.Defeated, multiplier: 2 },
    { minTricks: 5, maxTricks: 5, name: StandingBandName.Defeated, multiplier: 3 },
    { minTricks: 6, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 4 },
    { minTricks: 7, maxTricks: 7, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 8, maxTricks: 8, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 9, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 5 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 6 },
  ]
  const altLose: readonly StandingBand[] = [
    { minTricks: 0, maxTricks: 3, name: StandingBandName.Humble, multiplier: 6 },
    { minTricks: 4, maxTricks: 6, name: StandingBandName.Defeated, multiplier: 5 },
    { minTricks: 7, maxTricks: 7, name: StandingBandName.Victorious, multiplier: 4 },
    { minTricks: 8, maxTricks: 8, name: StandingBandName.Victorious, multiplier: 3 },
    { minTricks: 9, maxTricks: 9, name: StandingBandName.Victorious, multiplier: 2 },
    { minTricks: 10, maxTricks: 13, name: StandingBandName.Greedy, multiplier: 1 },
  ]

  it('resolves the alternative multipliers, including at the Lose table’s own boundaries', () => {
    expect(resolveStanding(13, altWin).multiplier).toBe(6)
    expect(resolveStanding(0, altLose).multiplier).toBe(6)
    // 5 and 6 sit in altLose's grouped 4-6 row and in two separate altWin rows.
    expect(resolveStanding(5, altLose).multiplier).toBe(5)
    expect(resolveStanding(6, altLose).multiplier).toBe(5)
    expect(resolveStanding(5, altWin).multiplier).toBe(3)
    expect(resolveStanding(6, altWin).multiplier).toBe(4)
  })

  it('is still an exact complement, so the same-path rule survives the swap', () => {
    for (let k = 0; k <= 13; k++) {
      expect(resolveStanding(k, altLose).multiplier).toBe(
        resolveStanding(13 - k, altWin).multiplier,
      )
    }
  })

  it('leaves the real exports untouched', () => {
    expect(resolveStanding(13, win).multiplier).toBe(0.5)
    expect(resolveStanding(0, lose).multiplier).toBe(0.5)
  })
})

describe('cardValueFor — §1’s additive term per declaration (AC6)', () => {
  it('returns the printed rank on Win and 12 − r on Lose, with no modifier of any kind', () => {
    const onWin = cardValueFor(HuntDeclaration.Win)
    const onLose = cardValueFor(HuntDeclaration.Lose)
    for (const rank of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(onWin(rank)).toBe(rank)
      expect(onLose(rank)).toBe(RANK_INVERSION_PIVOT - rank)
    }
    // Treasure (7) and Poison (8) are Decided-removed — neither carries a ±1 here.
    expect(onWin(7)).toBe(7)
    expect(onWin(8)).toBe(8)
  })
})

describe('cardBaseValue', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])('rank %i is worth its printed rank', (rank) => {
    expect(cardBaseValue(rank)).toBe(rank)
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

describe('SLICE_QUARRY_CHARACTER', () => {
  it('names a character whose rule-break is actually enforced', () => {
    expect(quarryCharacterInfo(SLICE_QUARRY_CHARACTER)).toBeDefined()
  })
})

describe('invertedCardValue — DLR-63 AC3', () => {
  it.each([
    [1, 11],
    [2, 10],
    [6, 6],
    [10, 2],
    [11, 1],
  ])('inverts rank %i to %i', (rank, expected) => {
    expect(invertedCardValue(rank)).toBe(expected)
  })

  it('is symmetric across the 1-11 deck — every rank maps into the same range', () => {
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    expect(ranks.map(invertedCardValue).sort((a, b) => a - b)).toEqual(ranks)
  })

  it('is its own inverse', () => {
    for (const rank of [1, 5, 8, 11]) {
      expect(invertedCardValue(invertedCardValue(rank))).toBe(rank)
    }
  })

  it('pivots on max rank + 1, so no rank inverts to zero or below', () => {
    expect(RANK_INVERSION_PIVOT).toBe(12)
    expect(invertedCardValue(11)).toBeGreaterThan(0)
  })
})

describe('roundDamage — the ×0.5 bands (AC7)', () => {
  // 13 is an odd card sum; at 11 tricks the Win table's Greedy band is ×0.5, so the raw
  // product is 6.5 — exactly the case the rounding rule exists to settle.
  const raw = 13 * resolveStanding(11, win).multiplier

  it('is a half-point product, so the rule is genuinely load-bearing', () => {
    expect(raw).toBe(6.5)
    expect(Number.isInteger(raw)).toBe(false)
  })

  it('rounds half away from zero by default', () => {
    expect(DAMAGE_ROUNDING).toBe(DamageRounding.HalfAwayFromZero)
    expect(roundDamage(raw)).toBe(7)
    expect(roundDamage(raw, DamageRounding.HalfAwayFromZero)).toBe(7)
  })

  it('leaves the product untouched under the doubled-table setting', () => {
    expect(roundDamage(raw, DamageRounding.None)).toBe(6.5)
  })

  it('is half away from zero, not half toward positive infinity', () => {
    // Math.round(-0.5) is -0 in JS, so a bare Math.round would misname the rule.
    expect(roundDamage(-0.5, DamageRounding.HalfAwayFromZero)).toBe(-1)
    expect(roundDamage(0.5, DamageRounding.HalfAwayFromZero)).toBe(1)
  })

  it('throws rather than rounding a non-finite value into a health bar', () => {
    expect(() => roundDamage(Number.NaN)).toThrow(RangeError)
    expect(() => roundDamage(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })

  it('has exactly the two named settings', () => {
    expect(Object.values(DamageRounding)).toHaveLength(2)
  })
})

describe('health, restore, and the depletion ruling (AC5, AC8)', () => {
  it('starts the player and the first Quarry on equal health', () => {
    expect(PLAYER_START_HEALTH).toBe(1350)
    // §9 "Player health P": the equality is what puts the win/lose boundary exactly on the
    // 6/7 line the declaration commits to, and it survives any later rescaling.
    expect(quarryHealthForEncounter(0)).toBe(PLAYER_START_HEALTH)
  })

  it('carries one health total per encounter, the second harder than the first', () => {
    expect(QUARRY_ENCOUNTER_HEALTH).toEqual([1350, 1600])
    expect(quarryHealthForEncounter(1)).toBe(1600)
  })

  it('throws rather than returning undefined for an encounter it has no health for', () => {
    expect(() => quarryHealthForEncounter(QUARRY_ENCOUNTER_HEALTH.length)).toThrow(RangeError)
    expect(() => quarryHealthForEncounter(-1)).toThrow(RangeError)
  })

  it('restores no health entering the next encounter, as a tunable rather than a hardcoded 0', () => {
    expect(ENCOUNTER_PLAYER_RESTORE).toBe(0)
    expect(Number.isFinite(ENCOUNTER_PLAYER_RESTORE)).toBe(true)
  })

  it('names the simultaneous-depletion winner as data — §5/§9: the player loses', () => {
    expect(SIMULTANEOUS_DEPLETION_WINNER).toBe(DuelSide.Quarry)
  })
})
