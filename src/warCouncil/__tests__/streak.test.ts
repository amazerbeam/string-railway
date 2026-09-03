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
  timebombTrick: false,
  timebombToPlayer: 0,
  timebombToQuarry: 0,
  blastGuarded: false,
  baseDamageBonus: 0,
  swanKeepsMultiplier: false,
  swanKeepsBank: false,
  buffs: null,
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

  it('is all zeroes for a bare banked trick with no Timebomb in play', () => {
    const r = resolveTrickBank(START, facts({ playerWon: true }))
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 0, [DuelSide.Quarry]: 0 })
  })
})

describe('resolveTrickBank — a marked trick (DLR-90 AC3, AC5, AC6)', () => {
  const streak = { total: 3, roll: 3 }

  it('AC5 — a clean loss the Quarry won costs no health and does not touch the streak', () => {
    const r = resolveTrickBank(streak, facts({ timebombTrick: true }))
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.damageToPlayer).toBe(0)
    expect(r.cashOut).toBe(0)
    expect(r.total).toBe(3)
    expect(r.roll).toBe(3)
  })

  it('AC5 — the total does not CLIMB either; the trick is replaced, not taken', () => {
    expect(resolveTrickBank(streak, facts({ timebombTrick: true })).trickDamage).toBeNull()
  })

  it('AC5 — the Quarry is the side owed the delayed hit', () => {
    expect(resolveTrickBank(streak, facts({ timebombTrick: true })).timebombTarget).toBe(
      DuelSide.Quarry,
    )
  })

  it('AC6 — a marked trick the player won is an ORDINARY clean win, with no special branch', () => {
    const marked = resolveTrickBank(streak, facts({ playerWon: true, timebombTrick: true }))
    const plain = resolveTrickBank(streak, facts({ playerWon: true }))
    expect(marked.outcome).toBe(TrickOutcome.CleanWin)
    expect(marked.total).toBe(plain.total)
    expect(marked.roll).toBe(plain.roll)
    expect(marked.trickDamage).toEqual(plain.trickDamage)
    expect(marked.cashOut).toBe(plain.cashOut)
    expect(marked.damageToPlayer).toBe(plain.damageToPlayer)
  })

  it('AC6 — and the player is the side owed the delayed hit', () => {
    expect(
      resolveTrickBank(streak, facts({ playerWon: true, timebombTrick: true })).timebombTarget,
    ).toBe(DuelSide.Player)
  })

  it('leaves a DODGE alone — the Quarry won it, but the player BANKS it', () => {
    const marked = resolveTrickBank(streak, facts({ skullTrick: true, timebombTrick: true }))
    const plain = resolveTrickBank(streak, facts({ skullTrick: true }))
    expect(marked.outcome).toBe(TrickOutcome.Dodge)
    expect(marked.trickDamage?.dealt).toBe(BASE_DAMAGE)
    expect(marked.total).toBe(plain.total)
    expect(marked.roll).toBe(plain.roll)
    expect(marked.timebombTarget).toBe(DuelSide.Quarry)
  })

  it('still charges a SKULL the player chose to eat, on top of the delayed hit — and cashes nothing', () => {
    const r = resolveTrickBank(
      streak,
      facts({ playerWon: true, skullTrick: true, timebombTrick: true }),
    )
    expect(r.outcome).toBe(TrickOutcome.SkullWin)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.cashOut).toBe(0)
    expect(r.timebombTarget).toBe(DuelSide.Player)
  })

  it('AC5/AC8 on the final trick — a REPLACED clean loss preserves the streak and cashes nothing', () => {
    const r = resolveTrickBank(streak, facts({ timebombTrick: true, finalTrick: true }))
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(0)
    expect(r.total).toBe(3)
    expect(r.roll).toBe(3)
  })

  it('reports no target on an unmarked trick', () => {
    expect(resolveTrickBank(streak, facts()).timebombTarget).toBeNull()
    expect(resolveTrickBank(streak, facts({ playerWon: true })).timebombTarget).toBeNull()
  })
})

describe('resolveTrickBank — Timebomb retimed to the trick that pays it (DLR-91 D1/D3)', () => {
  it('D3 — Timebomb owed to the player wipes the streak, even on a trick they won, and cashes nothing', () => {
    const before = { total: 4, roll: 4 }
    const r = resolveTrickBank(before, facts({ playerWon: true, timebombToPlayer: 2 }))
    // A1 — the win banks FIRST, but the Timebomb reset wipes that climb too.
    expect(r.trickDamage?.dealt).toBe(BASE_DAMAGE)
    expect(r.cashOut).toBe(0)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
    // D2 — 2 on a trick the player won: no DAMAGE_PER_HIT, only the Timebomb.
    expect(r.damageToPlayer).toBe(2)
  })

  it('D2 — a trick the player loses while primed costs the trick’s damage AND the Timebomb, and cashes nothing', () => {
    const r = resolveTrickBank({ total: 3, roll: 3 }, facts({ timebombToPlayer: 2 }))
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT + 2)
    expect(r.cashOut).toBe(0)
    expect(r.roll).toBe(0)
  })

  it('D1 — Timebomb owed to the Quarry never touches the player’s streak', () => {
    const r = resolveTrickBank(
      { total: 2, roll: 2 },
      facts({ playerWon: true, timebombToQuarry: 4 }),
    )
    expect(r.total).toBe(3)
    expect(r.roll).toBe(3)
    expect(r.damageToPlayer).toBe(0)
    expect(r.timebombToQuarry).toBe(4)
  })

  it('D1 — incomingFrom sums the Quarry’s cash-out (always 0) and its Timebomb into one figure', () => {
    const r = resolveTrickBank({ total: 2, roll: 2 }, facts({ timebombToQuarry: 4 }))
    expect(incomingFrom(r)[DuelSide.Quarry]).toBe(r.cashOut + 4)
    expect(incomingFrom(r)[DuelSide.Player]).toBe(DAMAGE_PER_HIT)
  })
})

describe('resolveTrickBank — the Blast Guard (DLR-91 AC4/AC5, A4/A5)', () => {
  it('AC4 — a held Guard leaves the streak standing but does not refund the health', () => {
    const r = resolveTrickBank(
      { total: 4, roll: 4 },
      facts({ playerWon: true, timebombToPlayer: 2, blastGuarded: true }),
    )
    expect(r.total).toBe(5)
    expect(r.roll).toBe(5)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(2)
    expect(r.blastGuardSpent).toBe(true)
  })

  it('A4 — a Guard does NOT save the streak from the trick’s own hit, and is not spent by it', () => {
    const r = resolveTrickBank(
      { total: 4, roll: 4 },
      facts({ playerWon: false, timebombToPlayer: 0, blastGuarded: true }),
    )
    expect(r.cashOut).toBe(0)
    expect(r.total).toBe(0)
    expect(r.roll).toBe(0)
    expect(r.blastGuardSpent).toBe(false)
  })

  it('A5 — a Guard is not spent on a trick that owed the player no Timebomb', () => {
    const r = resolveTrickBank(
      { total: 1, roll: 1 },
      facts({ playerWon: true, timebombToPlayer: 0, timebombToQuarry: 4, blastGuarded: true }),
    )
    expect(r.blastGuardSpent).toBe(false)
  })

  it('AC5 — a Guard does nothing to Timebomb owed to the Quarry', () => {
    const guarded = facts({
      playerWon: true,
      timebombToPlayer: 0,
      timebombToQuarry: 4,
      blastGuarded: true,
    })
    const bare = { ...guarded, blastGuarded: false }
    expect(incomingFrom(resolveTrickBank({ total: 0, roll: 0 }, guarded))).toEqual(
      incomingFrom(resolveTrickBank({ total: 0, roll: 0 }, bare)),
    )
  })

  it('AC4 — a Guard fires and is spent even with no streak in progress', () => {
    const r = resolveTrickBank(
      { total: 0, roll: 0 },
      facts({ playerWon: true, timebombToPlayer: 2, blastGuarded: true }),
    )
    expect(r.blastGuardSpent).toBe(true)
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
