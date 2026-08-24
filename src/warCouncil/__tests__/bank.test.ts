import { describe, expect, it } from 'vitest'
import { DAMAGE_PER_HIT, DuelSide } from '../../hunt'
import {
  cashValue,
  forcedCashValue,
  incomingFrom,
  isTaken,
  resolveTrickBank,
  TrickOutcome,
  trickOutcomeFor,
  type BankState,
  type TrickFacts,
} from '../bank'

const START: BankState = { bank: 0, multiplier: 0 }

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
  bankClimbBonus: 0,
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

describe('resolveTrickBank', () => {
  it('a clean win banks one trick and climbs the multiplier', () => {
    const r = resolveTrickBank({ bank: 0, multiplier: 0 }, facts({ playerWon: true }))
    expect(r.outcome).toBe(TrickOutcome.CleanWin)
    expect(r.bankAdded).toBe(1)
    expect(r.bank).toBe(1)
    expect(r.multiplier).toBe(1)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(0)
  })

  it('AC5 — a dodged skull is identical to a clean win', () => {
    const clean = resolveTrickBank(START, facts({ playerWon: true }))
    const dodge = resolveTrickBank(START, facts({ skullTrick: true }))
    expect(dodge.bankAdded).toBe(clean.bankAdded)
    expect(dodge.bank).toBe(clean.bank)
    expect(dodge.multiplier).toBe(clean.multiplier)
    expect(dodge.damageToPlayer).toBe(0)
    expect(dodge.outcome).toBe(TrickOutcome.Dodge)
  })

  it('a clean loss cashes bank × multiplier and resets both', () => {
    const r = resolveTrickBank({ bank: 3, multiplier: 3 }, facts())
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.cashOut).toBe(6)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.bankAdded).toBe(0)
  })

  it('AC7 — winning a skull trick is identical to losing a clean one', () => {
    const before: BankState = { bank: 3, multiplier: 3 }
    const lost = resolveTrickBank(before, facts())
    const ate = resolveTrickBank(before, facts({ playerWon: true, skullTrick: true }))
    expect(ate.cashOut).toBe(lost.cashOut)
    expect(ate.damageToPlayer).toBe(lost.damageToPlayer)
    expect(ate.bank).toBe(0)
    expect(ate.multiplier).toBe(0)
    expect(ate.outcome).toBe(TrickOutcome.SkullWin)
  })

  it('AC9 — the multiplier is the streak, and a hit resets it', () => {
    let s: BankState = START
    for (const won of [true, true, true]) s = resolveTrickBank(s, facts({ playerWon: won }))
    expect(s.multiplier).toBe(3)
    s = resolveTrickBank(s, facts())
    expect(s.multiplier).toBe(0)
  })

  it('AC8 — the sixth trick cashes what the streak built', () => {
    const r = resolveTrickBank(
      { bank: 1, multiplier: 1 },
      facts({ playerWon: true, finalTrick: true }),
    )
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.cashOut).toBe(4)
    expect(r.cashedAtHandEnd).toBe(true)
  })

  it('AC8 — a sixth trick that takes damage cashes once, not twice', () => {
    const r = resolveTrickBank({ bank: 2, multiplier: 2 }, facts({ finalTrick: true }))
    expect(r.cashOut).toBe(2)
    expect(r.cashedAtHandEnd).toBe(false)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
  })

  it('a forced hit pays two-thirds of n × n across a whole unbroken streak — 0, 2, 6, 10, 16, 24', () => {
    const payouts: number[] = []
    let state = { bank: 0, multiplier: 0 }
    for (let n = 1; n <= 6; n++) {
      const taken = resolveTrickBank(state, facts({ playerWon: true }))
      state = { bank: taken.bank, multiplier: taken.multiplier }
      payouts.push(resolveTrickBank(state, facts()).cashOut)
    }
    expect(payouts).toEqual([0, 2, 6, 10, 16, 24])
  })

  it.each([
    { bonus: 0, payouts: [0, 2, 6, 10, 16, 24] },
    { bonus: 1, payouts: [1, 5, 12, 21, 33, 48] },
    { bonus: 2, payouts: [2, 8, 18, 32, 50, 72] },
  ])(
    'DLR-92 AC2/AC7 + DLR-94 AC4 — a bank-climb bonus of $bonus pays two-thirds of (1 + bonus) × n² when the streak is caught',
    ({ bonus, payouts }) => {
      const got: number[] = []
      let state = { bank: 0, multiplier: 0 }
      for (let n = 1; n <= 6; n++) {
        const taken = resolveTrickBank(state, facts({ playerWon: true, bankClimbBonus: bonus }))
        state = { bank: taken.bank, multiplier: taken.multiplier }
        got.push(resolveTrickBank(state, facts({ bankClimbBonus: bonus })).cashOut)
      }
      expect(got).toEqual(payouts)
    },
  )

  it('DLR-92 AC4 — one copy banks 2 a trick and two copies bank 3', () => {
    expect(resolveTrickBank(START, facts({ playerWon: true, bankClimbBonus: 1 })).bankAdded).toBe(2)
    expect(resolveTrickBank(START, facts({ playerWon: true, bankClimbBonus: 2 })).bankAdded).toBe(3)
  })

  it('DLR-92 AC5 — the multiplier climbs by exactly 1 whatever the bonus', () => {
    for (const bonus of [0, 1, 5]) {
      const r = resolveTrickBank(
        { bank: 4, multiplier: 2 },
        facts({ playerWon: true, bankClimbBonus: bonus }),
      )
      expect(r.multiplier).toBe(3)
    }
  })

  it('DLR-92 — a bonus is never added to a trick that is not taken', () => {
    const r = resolveTrickBank({ bank: 3, multiplier: 3 }, facts({ bankClimbBonus: 4 }))
    expect(r.bankAdded).toBe(0)
    expect(r.cashOut).toBe(6)
  })

  it('DLR-92 — a bonus that is not a positive integer floors to the bare rule', () => {
    for (const bonus of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      const r = resolveTrickBank(START, facts({ playerWon: true, bankClimbBonus: bonus }))
      expect(r.bankAdded).toBe(1)
      expect(Number.isFinite(r.bank)).toBe(true)
    }
  })

  it('AC5 — the end-of-hand cash-out still pays IN FULL, unlike a forced hit', () => {
    // The SAME streak, cashed two ways: caught on a lost trick, versus surviving to the sixth.
    const streak: BankState = { bank: 3, multiplier: 3 }
    const caught = resolveTrickBank(streak, facts())
    const survived = resolveTrickBank(streak, facts({ playerWon: true, finalTrick: true }))

    expect(caught.cashOut).toBe(6) // two-thirds of 9
    expect(caught.cashedAtHandEnd).toBe(false)
    // The win banks first, so the sixth trick cashes 4 x 4 = 16 — in full, not two-thirds (10).
    expect(survived.cashOut).toBe(16)
    expect(survived.cashedAtHandEnd).toBe(true)
  })
})

describe('incomingFrom', () => {
  it('keys damage by the side it depletes', () => {
    const r = resolveTrickBank({ bank: 3, multiplier: 3 }, facts())
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 1, [DuelSide.Quarry]: 6 })
  })

  it('is all zeroes for a trick that neither cashed nor hit', () => {
    const r = resolveTrickBank(START, facts({ playerWon: true }))
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 0, [DuelSide.Quarry]: 0 })
  })
})

describe('resolveTrickBank — a marked trick (DLR-90 AC3, AC5, AC6)', () => {
  const streak = { bank: 3, multiplier: 3 }

  it('AC5 — a clean loss the Quarry won costs no health and does not cash the bank', () => {
    const r = resolveTrickBank(streak, facts({ timebombTrick: true }))
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.damageToPlayer).toBe(0)
    expect(r.cashOut).toBe(0)
    expect(r.bank).toBe(3)
    expect(r.multiplier).toBe(3)
  })

  it('AC5 — the bank does not CLIMB either; the trick is replaced, not taken', () => {
    expect(resolveTrickBank(streak, facts({ timebombTrick: true })).bankAdded).toBe(0)
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
    expect(marked.bank).toBe(plain.bank)
    expect(marked.multiplier).toBe(plain.multiplier)
    expect(marked.bankAdded).toBe(plain.bankAdded)
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
    expect(marked.bankAdded).toBe(1)
    expect(marked.bank).toBe(plain.bank)
    expect(marked.multiplier).toBe(plain.multiplier)
    expect(marked.timebombTarget).toBe(DuelSide.Quarry)
  })

  it('still charges a SKULL the player chose to eat, on top of the delayed hit', () => {
    const r = resolveTrickBank(
      streak,
      facts({ playerWon: true, skullTrick: true, timebombTrick: true }),
    )
    expect(r.outcome).toBe(TrickOutcome.SkullWin)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.cashOut).toBe(6)
    expect(r.timebombTarget).toBe(DuelSide.Player)
  })

  it('AC5 on the final trick — the PRESERVED bank still cashes at hand end', () => {
    const r = resolveTrickBank(streak, facts({ timebombTrick: true, finalTrick: true }))
    expect(r.cashOut).toBe(9)
    expect(r.cashedAtHandEnd).toBe(true)
    expect(r.damageToPlayer).toBe(0)
    expect(r.bank).toBe(0)
  })

  it('reports no target on an unmarked trick', () => {
    expect(resolveTrickBank(streak, facts()).timebombTarget).toBeNull()
    expect(resolveTrickBank(streak, facts({ playerWon: true })).timebombTarget).toBeNull()
  })
})

describe('resolveTrickBank — Timebomb retimed to the trick that pays it (DLR-91 D1/D3)', () => {
  it('D3 — Timebomb owed to the player cashes the streak out and resets it, even on a trick they won', () => {
    const before = { bank: 4, multiplier: 4 }
    const r = resolveTrickBank(before, facts({ playerWon: true, timebombToPlayer: 2 }))
    // A1 — the win banks FIRST, so the cash-out is 5 x 5, not 4 x 4.
    expect(r.bankAdded).toBe(1)
    expect(r.cashOut).toBe(16)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    // D2 — 2 on a trick the player won: no DAMAGE_PER_HIT, only the Timebomb.
    expect(r.damageToPlayer).toBe(2)
  })

  it('D2 — a trick the player loses while primed costs the trick’s damage AND the Timebomb', () => {
    const r = resolveTrickBank({ bank: 3, multiplier: 3 }, facts({ timebombToPlayer: 2 }))
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT + 2)
    expect(r.cashOut).toBe(6)
    expect(r.multiplier).toBe(0)
  })

  it('D1 — Timebomb owed to the Quarry never touches the player’s streak', () => {
    const r = resolveTrickBank(
      { bank: 2, multiplier: 2 },
      facts({ playerWon: true, timebombToQuarry: 4 }),
    )
    expect(r.bank).toBe(3)
    expect(r.multiplier).toBe(3)
    expect(r.damageToPlayer).toBe(0)
    expect(r.timebombToQuarry).toBe(4)
  })

  it('D1 — incomingFrom sums the Quarry’s cash-out and its Timebomb into one figure', () => {
    const r = resolveTrickBank({ bank: 2, multiplier: 2 }, facts({ timebombToQuarry: 4 }))
    expect(incomingFrom(r)[DuelSide.Quarry]).toBe(r.cashOut + 4)
    expect(incomingFrom(r)[DuelSide.Player]).toBe(DAMAGE_PER_HIT)
  })
})

describe('resolveTrickBank — the Blast Guard (DLR-91 AC4/AC5, A4/A5)', () => {
  it('AC4 — a held Guard leaves the streak standing but does not refund the health', () => {
    const r = resolveTrickBank(
      { bank: 4, multiplier: 4 },
      facts({ playerWon: true, timebombToPlayer: 2, blastGuarded: true }),
    )
    expect(r.bank).toBe(5)
    expect(r.multiplier).toBe(5)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(2)
    expect(r.blastGuardSpent).toBe(true)
  })

  it('A4 — a Guard does NOT save the streak from the trick’s own hit, and is not spent by it', () => {
    const r = resolveTrickBank(
      { bank: 4, multiplier: 4 },
      facts({ playerWon: false, timebombToPlayer: 0, blastGuarded: true }),
    )
    expect(r.cashOut).toBe(10)
    expect(r.multiplier).toBe(0)
    expect(r.blastGuardSpent).toBe(false)
  })

  it('A5 — a Guard is not spent on a trick that owed the player no Timebomb', () => {
    const r = resolveTrickBank(
      { bank: 1, multiplier: 1 },
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
    expect(incomingFrom(resolveTrickBank({ bank: 0, multiplier: 0 }, guarded))).toEqual(
      incomingFrom(resolveTrickBank({ bank: 0, multiplier: 0 }, bare)),
    )
  })

  it('AC4 — a Guard fires and is spent even with no streak in progress', () => {
    const r = resolveTrickBank(
      { bank: 0, multiplier: 0 },
      facts({ playerWon: true, timebombToPlayer: 2, blastGuarded: true }),
    )
    expect(r.blastGuardSpent).toBe(true)
  })
})

describe('cashValue and forcedCashValue — DLR-94 AC4', () => {
  it('cashValue is the plain product', () => {
    expect(cashValue(3, 3)).toBe(9)
    expect(cashValue(5, 5)).toBe(25)
    expect(cashValue(0, 0)).toBe(0)
  })

  it('forcedCashValue pays two-thirds, rounded DOWN so the Quarry is never overpaid', () => {
    expect(forcedCashValue(3, 3)).toBe(6) // 9 -> 6 exactly
    expect(forcedCashValue(2, 2)).toBe(2) // 4 -> 2.66 -> 2
    expect(forcedCashValue(5, 5)).toBe(16) // 25 -> 16.66 -> 16
    expect(forcedCashValue(1, 1)).toBe(0) // 1 -> 0.66 -> 0
  })

  // The regression the float form produces: `3 * (2 / 3)` is 1.9999999999999998, which floors to
  // 1. Multiplying by the numerator BEFORE dividing keeps the dividend an exact integer.
  it('is exact on every multiple of three, where a float fraction loses one', () => {
    for (const product of [3, 6, 9, 12, 15, 30, 300]) {
      expect(forcedCashValue(1, product)).toBe((product * 2) / 3)
      expect(Math.floor(product * (2 / 3))).toBeLessThanOrEqual(forcedCashValue(1, product))
    }
  })

  it('floors a degenerate bank or multiplier to zero rather than propagating it', () => {
    for (const bad of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(cashValue(bad, 3)).toBe(0)
      expect(forcedCashValue(bad, 3)).toBe(0)
      expect(forcedCashValue(3, bad)).toBe(0)
    }
  })
})
