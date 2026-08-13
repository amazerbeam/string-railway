import { describe, expect, it } from 'vitest'
import { applyHunt, isEncounterResolved, startEncounter } from '../encounter'
import {
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  SIMULTANEOUS_DEPLETION_WINNER,
} from '../config'
import { DuelSide, type IncomingDamage } from '../types'

/** Keyed by the side the damage is APPLIED TO, matching `IncomingDamage`. */
function damage(toPlayer: number, toQuarry: number): IncomingDamage {
  return { [DuelSide.Player]: toPlayer, [DuelSide.Quarry]: toQuarry }
}

describe('startEncounter — both bars come from the configured totals (AC1)', () => {
  it('reads PLAYER_START_HEALTH and the indexed Quarry total, and starts unresolved', () => {
    const encounter = startEncounter(0)
    expect(encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(encounter.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0))
    expect(encounter.huntsApplied).toBe(0)
    expect(encounter.winner).toBeNull()
    expect(isEncounterResolved(encounter)).toBe(false)
  })

  it('takes the second encounter’s configured total at index 1', () => {
    expect(startEncounter(1).health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(1))
  })

  it('lets quarryHealthForEncounter’s RangeError surface on an out-of-range index', () => {
    expect(() => startEncounter(99)).toThrow(RangeError)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a starting player health of %p rather than seeding a broken bar',
    (health) => {
      expect(() => startEncounter(0, health)).toThrow(RangeError)
    },
  )
})

describe('applyHunt — each side loses the OTHER side’s damage, once (AC2)', () => {
  it('subtracts both bars exactly once and counts one Hunt', () => {
    const after = applyHunt(startEncounter(0), damage(100, 250))
    expect(after.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 100)
    expect(after.health[DuelSide.Quarry]).toBe(quarryHealthForEncounter(0) - 250)
    expect(after.huntsApplied).toBe(1)
    expect(after.winner).toBeNull()
  })

  it('leaves the encounter it was given untouched', () => {
    const before = startEncounter(0)
    applyHunt(before, damage(100, 250))
    expect(before.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
    expect(before.huntsApplied).toBe(0)
  })
})

describe('applyHunt — the end conditions (AC4)', () => {
  it('the Quarry’s bar alone empties -> the Player wins', () => {
    const after = applyHunt(startEncounter(0), damage(1, quarryHealthForEncounter(0)))
    expect(after.winner).toBe(DuelSide.Player)
    expect(isEncounterResolved(after)).toBe(true)
  })

  it('the player’s bar alone empties -> the Quarry wins and the run ends', () => {
    const after = applyHunt(startEncounter(0), damage(PLAYER_START_HEALTH, 1))
    expect(after.winner).toBe(DuelSide.Quarry)
  })

  it('both bars empty on the same Hunt -> the configured tie winner takes it', () => {
    const after = applyHunt(
      startEncounter(0),
      damage(PLAYER_START_HEALTH, quarryHealthForEncounter(0)),
    )
    expect(after.health[DuelSide.Player]).toBe(0)
    expect(after.health[DuelSide.Quarry]).toBe(0)
    // Compared against the constant, not against a literal 'quarry': config.test.ts:328 is the
    // single assertion of the VALUE, this is the assertion of the RULE, so the two cannot drift.
    expect(after.winner).toBe(SIMULTANEOUS_DEPLETION_WINNER)
  })
})

describe('applyHunt — surplus damage is discarded, and health never goes negative (AC5, AC6)', () => {
  it('overkill leaves no trace: 5000 into a 1350 bar is identical to exactly emptying it', () => {
    const start = startEncounter(0)
    const exact = applyHunt(start, damage(0, quarryHealthForEncounter(0)))
    const overkill = applyHunt(start, damage(0, 5000))
    // Deep equality is the assertion: if surplus were carried or converted ANYWHERE in the
    // state, these two would differ. Nothing to inspect means nothing was kept.
    expect(overkill).toEqual(exact)
    expect(overkill.health[DuelSide.Quarry]).toBe(0)
  })

  it.each([0, 1, 1349, 1350, 1351, 99999])(
    'clamps at zero rather than reporting negative health for %i damage',
    (dealt) => {
      const after = applyHunt(startEncounter(0), damage(dealt, dealt))
      expect(after.health[DuelSide.Player]).toBeGreaterThanOrEqual(0)
      expect(after.health[DuelSide.Quarry]).toBeGreaterThanOrEqual(0)
    },
  )
})

describe('applyHunt — refuses rather than corrupting a bar', () => {
  it('throws on an encounter that has already resolved', () => {
    const resolved = applyHunt(startEncounter(0), damage(0, quarryHealthForEncounter(0)))
    expect(() => applyHunt(resolved, damage(10, 10))).toThrow(RangeError)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])(
    'throws on damage of %p rather than letting it reach a bar',
    (bad) => {
      // NaN is the one that matters: NaN - x is NaN, Math.max(0, NaN) is NaN, and a NaN health
      // renders as an empty bar with nothing logged anywhere.
      expect(() => applyHunt(startEncounter(0), damage(bad, 0))).toThrow(RangeError)
      expect(() => applyHunt(startEncounter(0), damage(0, bad))).toThrow(RangeError)
    },
  )
})

// AC8's fixtures, derived here so the numbers are checkable without leaving the file.
//
// Every captured card is rank 6 — the exact mean of ranks 1-11, the convention
// src/warCouncil/__tests__/huntEnumeration.test.ts already uses. A trick captures two cards,
// so k tricks is 12k of card value. Win table: 0-3 x1, 4 x2, 5 x3, 6 x4, 7-9 x5, 10-13 x0.5.
// Both sides read the one declared table (DLR-68 AC2) and the two counts sum to 13.
//
//   player 9  -> 108 x5   = 540 dealt;  Quarry 4 -> 48 x2 = 96
//   player 8  ->  96 x5   = 480 dealt;  Quarry 5 -> 60 x3 = 180
//   player 7  ->  84 x5   = 420 dealt;  Quarry 6 -> 72 x4 = 288   (708 on the table, §5)
//   player 10 -> 120 x0.5 =  60 dealt;  Quarry 3 -> 36 x1 = 36
//   player 13 -> 156 x0.5 =  78 dealt;  Quarry 0 ->  0 x1 = 0
const FAST_9 = damage(96, 540)
const FAST_8 = damage(180, 480)
const BOUNDARY_7 = damage(288, 420)
const BOUNDARY_6 = damage(420, 288)
const TAIL_10 = damage(36, 60)
const TAIL_13 = damage(0, 78)

/** Applies the same Hunt until the encounter resolves. `maxHunts` is the SPEC's bound, not a
 *  game rule — AC7 states the game has no cap — so a resolution bug fails as an assertion
 *  rather than hanging the suite. */
function fight(incoming: IncomingDamage, maxHunts = 100) {
  let current = startEncounter(0)
  while (!isEncounterResolved(current) && current.huntsApplied < maxHunts) {
    current = applyHunt(current, incoming)
  }
  return current
}

describe('AC8 — the fast band resolves in 3-4 Hunts at 7-9 tricks (§5, §9)', () => {
  it('9 tricks a Hunt wins on Hunt 3 with 1062 left', () => {
    const end = fight(FAST_9)
    expect(end.winner).toBe(DuelSide.Player)
    expect(end.huntsApplied).toBe(3)
    expect(end.health[DuelSide.Player]).toBe(1062)
    expect(end.health[DuelSide.Quarry]).toBe(0)
  })

  it('8 tricks a Hunt wins on Hunt 3 with 810 left', () => {
    const end = fight(FAST_8)
    expect(end.huntsApplied).toBe(3)
    expect(end.health[DuelSide.Player]).toBe(810)
  })
})

describe('AC8 — the P = H boundary sits exactly on the 6/7 line (§5, §9)', () => {
  it('7 tricks a Hunt: 486 left entering Hunt 4, then the encounter is won on it', () => {
    let encounter = startEncounter(0)
    for (let i = 0; i < 3; i += 1) {
      encounter = applyHunt(encounter, BOUNDARY_7)
    }
    // §9's stated figure — the player's health ENTERING Hunt 4 (1350 - 3 x 288).
    expect(encounter.health[DuelSide.Player]).toBe(486)
    expect(encounter.health[DuelSide.Quarry]).toBe(90)
    expect(encounter.winner).toBeNull()

    // And the same instant from the other side: both bars deplete together, so when the
    // Quarry's empties on Hunt 4 the player is on 198, not 486. Both figures are correct
    // about different instants; asserting both pins which is which.
    const won = applyHunt(encounter, BOUNDARY_7)
    expect(won.winner).toBe(DuelSide.Player)
    expect(won.huntsApplied).toBe(4)
    expect(won.health[DuelSide.Player]).toBe(198)
    expect(won.health[DuelSide.Quarry]).toBe(0)
  })

  it('6 tricks a Hunt loses on Hunt 4 — the exact mirror', () => {
    const end = fight(BOUNDARY_6)
    expect(end.winner).toBe(DuelSide.Quarry)
    expect(end.huntsApplied).toBe(4)
    expect(end.health[DuelSide.Player]).toBe(0)
    expect(end.health[DuelSide.Quarry]).toBe(198)
  })
})

describe('AC8, AC7 — the tail runs 18-23 Hunts at 10-13 tricks, uncapped (§5, §9, §11)', () => {
  it('10 tricks a Hunt — the slowest line — takes 23 Hunts', () => {
    const end = fight(TAIL_10)
    expect(end.huntsApplied).toBe(23)
    expect(end.winner).toBe(DuelSide.Player)
    expect(end.health[DuelSide.Player]).toBe(522)
  })

  it('13 tricks a Hunt takes 18 Hunts and costs the player nothing', () => {
    const end = fight(TAIL_13)
    expect(end.huntsApplied).toBe(18)
    expect(end.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH)
  })

  it('runs past any plausible cap without refusing — there is deliberately none (AC7)', () => {
    // The 23-Hunt line above already exceeds §9's derived candidate range of 3-5. This states
    // it as the rule it is: no Hunt count is rejected while the encounter is live.
    const end = fight(TAIL_10)
    expect(end.huntsApplied).toBeGreaterThan(5)
  })
})
