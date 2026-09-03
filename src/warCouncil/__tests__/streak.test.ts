import { describe, expect, it } from 'vitest'
import { BASE_DAMAGE, DAMAGE_PER_HIT, DuelSide } from '../../hunt'
import {
  incomingFrom,
  isTaken,
  resolveTrickBank,
  TrickOutcome,
  trickOutcomeFor,
  type StreakState,
  type TrickFacts,
} from '../streak'
import { potValue } from '../pot'

const START: StreakState = { total: 0, roll: 0 }

/** The ten facts, defaulted to an ordinary unmarked non-final unprimed trick with no Swan
 *  ladder bought. */
const facts = (over: Partial<TrickFacts> = {}): TrickFacts => ({
  playerWon: false,
  skullTrick: false,
  finalTrick: false,
  baseDamageBonus: 0,
  swanKeepsMultiplier: false,
  swanKeepsBank: false,
  buffs: null,
  // DLR-163 AC8/AC10 — a trick with no Treasure in it, the default this suite measures against.
  treasureTrick: false,
  ...over,
})

describe('trickOutcomeFor', () => {
  it('maps §3.2’s four rows', () => {
    expect(trickOutcomeFor(true, false)).toBe(TrickOutcome.CleanWin)
    expect(trickOutcomeFor(false, true)).toBe(TrickOutcome.Dodge)
    expect(trickOutcomeFor(false, false)).toBe(TrickOutcome.CleanLoss)
    expect(trickOutcomeFor(true, true)).toBe(TrickOutcome.SkullWin)
  })

  it('takes the trick on a clean win and a dodge, and only those', () => {
    expect(isTaken(TrickOutcome.CleanWin)).toBe(true)
    expect(isTaken(TrickOutcome.Dodge)).toBe(true)
    expect(isTaken(TrickOutcome.CleanLoss)).toBe(false)
    expect(isTaken(TrickOutcome.SkullWin)).toBe(false)
  })
})

describe('resolveTrickBank — DLR-156 AC1/AC7, the roll-over formula', () => {
  it('a clean win banks its own damage and climbs the roll', () => {
    const r = resolveTrickBank({ total: 0, roll: 0 }, facts({ playerWon: true }))
    expect(r.outcome).toBe(TrickOutcome.CleanWin)
    expect(r.trickDamage?.dealt).toBe(BASE_DAMAGE)
    expect(r.total).toBe(1)
    expect(r.roll).toBe(1)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(0)
  })

  it('AC5 — a dodged skull is identical to a clean win', () => {
    const clean = resolveTrickBank(START, facts({ playerWon: true }))
    const dodge = resolveTrickBank(START, facts({ skullTrick: true }))
    expect(dodge.trickDamage).toEqual(clean.trickDamage)
    expect(dodge.total).toBe(clean.total)
    expect(dodge.roll).toBe(clean.roll)
    expect(dodge.damageToPlayer).toBe(0)
    expect(dodge.outcome).toBe(TrickOutcome.Dodge)
  })

  it('AC7 — a clean loss pays the Quarry nothing and wipes both to zero', () => {
    const r = resolveTrickBank({ total: 3, roll: 3 }, facts())
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
    expect(r.trickDamage).toBeNull()
  })

  it('AC7 — winning a skull trick is identical to losing a clean one', () => {
    const before: StreakState = { total: 3, roll: 3 }
    const lost = resolveTrickBank(before, facts())
    const ate = resolveTrickBank(before, facts({ playerWon: true, skullTrick: true }))
    expect(ate.cashOut).toBe(lost.cashOut)
    expect(ate.damageToPlayer).toBe(lost.damageToPlayer)
    expect(ate.total).toBe(0)
    expect(ate.roll).toBe(0)
    expect(ate.outcome).toBe(TrickOutcome.SkullWin)
  })

  it('AC9 — the roll is the streak, and a hit resets it', () => {
    let s: StreakState = START
    for (const won of [true, true, true]) s = resolveTrickBank(s, facts({ playerWon: won }))
    expect(s.roll).toBe(3)
    s = resolveTrickBank(s, facts())
    expect(s.roll).toBe(0)
  })

  it('AC8 — the sixth trick banks like any other; nothing cashes at hand end', () => {
    const r = resolveTrickBank({ total: 1, roll: 1 }, facts({ playerWon: true, finalTrick: true }))
    expect(r.total).toBe(2)
    expect(r.roll).toBe(2)
    expect(r.cashOut).toBe(0)
  })

  it('AC8 — a sixth trick that takes damage still wipes the streak, and still cashes nothing', () => {
    const r = resolveTrickBank({ total: 2, roll: 2 }, facts({ finalTrick: true }))
    expect(r.cashOut).toBe(0)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
  })

  it('a hit pays nothing regardless of how large the streak it wipes was', () => {
    const payouts: number[] = []
    let state = { total: 0, roll: 0 }
    for (let n = 1; n <= 6; n++) {
      const taken = resolveTrickBank(state, facts({ playerWon: true }))
      state = { total: taken.total, roll: taken.roll }
      payouts.push(resolveTrickBank(state, facts()).cashOut)
    }
    expect(payouts).toEqual([0, 0, 0, 0, 0, 0])
  })

  it.each([0, 1, 2])(
    'DLR-92 AC7 + DLR-156 AC7 — a total-climb bonus of %i still pays nothing when the streak is caught',
    (bonus) => {
      let state = { total: 0, roll: 0 }
      for (let n = 1; n <= 6; n++) {
        const taken = resolveTrickBank(state, facts({ playerWon: true, baseDamageBonus: bonus }))
        state = { total: taken.total, roll: taken.roll }
      }
      const hit = resolveTrickBank(state, facts({ baseDamageBonus: bonus }))
      expect(hit.cashOut).toBe(0)
      expect(hit.total).toBe(0)
      expect(hit.roll).toBe(0)
    },
  )

  it('DLR-92 AC4 — one copy adds 1 to the base and two copies add 2', () => {
    expect(
      resolveTrickBank(START, facts({ playerWon: true, baseDamageBonus: 1 })).trickDamage?.dealt,
    ).toBe(2)
    expect(
      resolveTrickBank(START, facts({ playerWon: true, baseDamageBonus: 2 })).trickDamage?.dealt,
    ).toBe(3)
  })

  it('DLR-92 AC5 — the roll climbs by exactly 1 whatever the bonus', () => {
    for (const bonus of [0, 1, 5]) {
      const r = resolveTrickBank(
        { total: 4, roll: 2 },
        facts({ playerWon: true, baseDamageBonus: bonus }),
      )
      expect(r.roll).toBe(3)
    }
  })

  it('DLR-92 — a bonus is never added to a trick that is not taken', () => {
    const r = resolveTrickBank({ total: 3, roll: 3 }, facts({ baseDamageBonus: 4 }))
    expect(r.trickDamage).toBeNull()
    expect(r.cashOut).toBe(0)
  })

  it('DLR-92 — a bonus that is not a positive integer floors to the bare rule', () => {
    for (const bonus of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      const r = resolveTrickBank(START, facts({ playerWon: true, baseDamageBonus: bonus }))
      expect(r.trickDamage?.dealt).toBe(BASE_DAMAGE)
      expect(Number.isFinite(r.total)).toBe(true)
    }
  })
})

describe('incomingFrom', () => {
  it('keys damage by the side it depletes — AC7, a hit pays the Quarry nothing', () => {
    const r = resolveTrickBank({ total: 3, roll: 3 }, facts())
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 1, [DuelSide.Quarry]: 0 })
  })

  it('is all zeroes for a bare banked trick', () => {
    const r = resolveTrickBank(START, facts({ playerWon: true }))
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 0, [DuelSide.Quarry]: 0 })
  })
})

describe('potValue — DLR-156', () => {
  it('is the plain product', () => {
    expect(potValue(3, 3)).toBe(9)
    expect(potValue(5, 5)).toBe(25)
    expect(potValue(0, 0)).toBe(0)
  })

  it('floors a degenerate total or roll to zero rather than propagating it', () => {
    for (const bad of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(potValue(bad, 3)).toBe(0)
      expect(potValue(3, bad)).toBe(0)
    }
  })
})
