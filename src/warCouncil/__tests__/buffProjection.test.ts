import { describe, expect, it } from 'vitest'
import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  PLAYER_START_HEALTH,
  resolveTrickBuffs,
  startHandAccrual,
  type Buff,
  type BuffTrickContext,
} from '../../hunt'
import { isTaken, trickOutcomeFor, TrickOutcome } from '../streak'
import {
  buffReach,
  projectBuffBranches,
  type BuffProjectionFacts,
  type BuffProjectionInput,
} from '../buffProjection'
import { Suit, type Card } from '../types'

/**
 * DLR-152 — the two-branch projection. Every case here asserts that the projection AGREES with
 * the resolver rather than that it produces a particular number: the module's whole reason to
 * exist is that a preview derived from a second copy of the rules drifts from the rules.
 */

const bellsCard: Card = { suit: Suit.Bells, rank: 4 }
const keysCard: Card = { suit: Suit.Keys, rank: 6 }

const bladeSuitHigh: Buff = {
  id: 1,
  kind: BuffKind.SuitHigh,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.SuitHigh, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
}

const bladeSuitLow: Buff = {
  id: 2,
  kind: BuffKind.SuitLow,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.SuitLow, target: { suit: BuffTargetSuit.Bells } },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
}

const momentumSkullLow: Buff = {
  id: 3,
  kind: BuffKind.SkullLow,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.SkullLow, target: {} },
  reward: { axis: BuffRewardAxis.Multiplier, value: 2 },
}

/** Derives the outcome axis the same way production does rather than restating the table. */
function isTakenOutcome(playerWentHigh: boolean, skullTrick: boolean): boolean {
  return isTaken(trickOutcomeFor(playerWentHigh, skullTrick))
}

/** Every field of `BuffProjectionFacts` at its neutral value. The five fields the projection
 *  itself supplies — playerWentHigh, skullTrick, playerSuits, playerRanks, remainingSuits — are
 *  deliberately absent from this type, which is the point of the `Omit`. */
const FACTS: BuffProjectionFacts = {
  playerHit: false,
  finalTrick: false,
  bankAfterTrick: 0,
  tricksWithoutHit: 0,
  coins: 0,
  playerHealth: PLAYER_START_HEALTH,
  applyDamagePressed: false,
}

function input(overrides: Partial<BuffProjectionInput> = {}): BuffProjectionInput {
  return {
    active: [],
    firedThisHand: [],
    accrual: startHandAccrual(),
    facts: FACTS,
    skullTrick: false,
    hand: [bellsCard, keysCard],
    ...overrides,
  }
}

describe('AC1 — both branches, for one candidate card', () => {
  it('fires the Suit High card only on the high branch and the Suit Low card only on the other', () => {
    const projection = projectBuffBranches(
      input({ active: [bladeSuitHigh, bladeSuitLow] }),
      bellsCard,
    )
    expect(projection.won.playerWentHigh).toBe(true)
    expect(projection.lost.playerWentHigh).toBe(false)
    expect(projection.won.fired.map((b) => b.id)).toEqual([1])
    expect(projection.lost.fired.map((b) => b.id)).toEqual([2])
  })

  it('fires neither when the candidate card is off-suit', () => {
    const projection = projectBuffBranches(
      input({ active: [bladeSuitHigh, bladeSuitLow] }),
      keysCard,
    )
    expect(projection.won.fired).toEqual([])
    expect(projection.lost.fired).toEqual([])
  })

  it('gives each branch exactly one outcome when the skull is known', () => {
    const known = projectBuffBranches(input({ skullTrick: false }), bellsCard)
    expect(known.skullKnown).toBe(true)
    expect(known.won.outcomes.map((o) => o.outcome)).toEqual([TrickOutcome.HighVictory])
    expect(known.lost.outcomes.map((o) => o.outcome)).toEqual([TrickOutcome.LowDefeat])
  })
})

describe('AC3 — the Overlap Bonus is computed per branch, never across the union', () => {
  it('never counts a Suit High and a Suit Low card on the same suit toward one Overlap Bonus', () => {
    const projection = projectBuffBranches(
      input({ active: [bladeSuitHigh, bladeSuitLow] }),
      bellsCard,
    )
    // One buff fires per branch, so `overlapBonusFor(1)` is 0 on BOTH. A union of the two
    // branches would be 2 fired and a spurious +1 roll — the mockup's exact defect.
    expect(projection.won.outcomes[0].accrual.multiplierBonus).toBe(0)
    expect(projection.lost.outcomes[0].accrual.multiplierBonus).toBe(0)
    expect(projection.won.outcomes[0].accrual.flatDamageBonus).toBe(1)
  })
})

describe('AC4 — the projected roll respects the same per-hand cap the live accrual does', () => {
  it('clips at MAX_MULTIPLIER_BONUS_PER_HAND when pushed past it', () => {
    const maxed = { ...startHandAccrual(), multiplierBonus: MAX_MULTIPLIER_BONUS_PER_HAND }
    const bigSuitHigh: Buff = {
      ...bladeSuitHigh,
      reward: { axis: BuffRewardAxis.Multiplier, value: MAX_MULTIPLIER_BONUS_PER_HAND },
    }
    const projection = projectBuffBranches(
      input({ active: [bigSuitHigh], accrual: maxed }),
      bellsCard,
    )
    expect(projection.won.fired.map((b) => b.id)).toEqual([1])
    expect(projection.won.outcomes[0].accrual.multiplierBonus).toBe(MAX_MULTIPLIER_BONUS_PER_HAND)
  })
})

describe('AC2 — the projection equals real resolution for the same context', () => {
  /** Rebuilds, by hand, the context the projection builds internally, and runs it through
   *  `resolveTrickBuffs` — the function `total.ts` calls on a real trick. If the projection ever
   *  stops delegating and starts deriving, these two diverge and this test fails. */
  function realResolution(playerWentHigh: boolean, skullTrick: boolean) {
    const ctx: BuffTrickContext = {
      ...FACTS,
      playerWentHigh,
      skullTrick,
      playerSuits: [BuffTargetSuit.Bells],
      playerRanks: [bellsCard.rank],
      remainingSuits: [BuffTargetSuit.Keys],
    }
    return resolveTrickBuffs(
      {
        active: [bladeSuitHigh, bladeSuitLow, momentumSkullLow],
        accrual: startHandAccrual(),
        firedThisHand: [],
        hand: {
          playerSuits: ctx.playerSuits,
          playerRanks: ctx.playerRanks,
          remainingSuits: ctx.remainingSuits,
          tricksWithoutHit: FACTS.tricksWithoutHit,
          coins: FACTS.coins,
          playerHealth: FACTS.playerHealth,
          applyDamagePressed: FACTS.applyDamagePressed,
        },
      },
      ctx,
      !isTakenOutcome(playerWentHigh, skullTrick),
    )
  }

  it.each([
    ['take, clean', true, false],
    ['take, skulled', true, true],
    ['do not take, clean', false, false],
    ['do not take, skulled', false, true],
  ])('matches fired ids and accrual on %s', (_label, playerWentHigh, skullTrick) => {
    const projection = projectBuffBranches(
      input({ active: [bladeSuitHigh, bladeSuitLow, momentumSkullLow], skullTrick }),
      bellsCard,
    )
    const branch = playerWentHigh ? projection.won : projection.lost
    const real = realResolution(playerWentHigh, skullTrick)
    expect(branch.fired.map((b) => b.id)).toEqual([...real.firedIds])
    expect(branch.outcomes).toHaveLength(1)
    expect(branch.outcomes[0].accrual).toEqual(real.accrual)
  })
})

describe('AC5 — cadence is honoured because the projection goes through firedBuffs', () => {
  it('never fires an Activated card', () => {
    const cheat: Buff = {
      id: 9,
      kind: BuffKind.Cheat,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Cheat, target: {} },
      reward: { axis: BuffRewardAxis.Multiplier, value: 3 },
    }
    const projection = projectBuffBranches(input({ active: [cheat] }), bellsCard)
    expect(projection.won.fired).toEqual([])
    expect(projection.lost.fired).toEqual([])
    expect(projection.indeterminate).toEqual([])
  })

  it('does not suppress an Event-cadence family listed in firedThisHand', () => {
    // Suit High is Event cadence, so firedThisHand does NOT suppress it — asserting that keeps the
    // filter honest in the direction it actually matters for the live pool.
    const again = projectBuffBranches(
      input({ active: [bladeSuitHigh], firedThisHand: [bladeSuitHigh.id] }),
      bellsCard,
    )
    expect(again.won.fired.map((b) => b.id)).toEqual([1])
  })

  it('suppresses a Threshold-cadence family once it has already fired this hand', () => {
    // Hoarder is BuffCadence.Threshold — firesOncePerHand filters it against firedThisHand. Its
    // condition reads bankAfterTrick alone (no playerWentHigh term), so the control case below fires
    // it on the won branch to prove the suppression is what's removing it, not the condition.
    const hoarder: Buff = {
      id: 10,
      kind: BuffKind.Hoarder,
      tier: BuffTier.Bronze,
      condition: { kind: BuffKind.Hoarder },
      reward: { axis: BuffRewardAxis.Multiplier, value: 1 },
    }
    const bankFacts: BuffProjectionFacts = { ...FACTS, bankAfterTrick: 2 }

    const control = projectBuffBranches(
      input({ active: [hoarder], facts: bankFacts, firedThisHand: [] }),
      bellsCard,
    )
    expect(control.won.fired.map((b) => b.id)).toEqual([10])

    const suppressed = projectBuffBranches(
      input({ active: [hoarder], facts: bankFacts, firedThisHand: [hoarder.id] }),
      bellsCard,
    )
    expect(suppressed.won.fired).toEqual([])
    expect(suppressed.lost.fired).toEqual([])
    expect(suppressed.indeterminate).toEqual([])
  })
})

describe('AC6 — an undecidable branch is reported, not guessed', () => {
  it('places Skull Low in a branch when the Quarry has already led and the trick is skulled', () => {
    const follow = projectBuffBranches(
      input({ active: [momentumSkullLow], skullTrick: true }),
      bellsCard,
    )
    expect(follow.skullKnown).toBe(true)
    expect(follow.indeterminate).toEqual([])
    expect(follow.lost.fired.map((b) => b.id)).toEqual([3])
    expect(follow.won.fired).toEqual([])
  })

  it('reports Skull Low as indeterminate when the player leads', () => {
    const lead = projectBuffBranches(
      input({ active: [momentumSkullLow], skullTrick: null }),
      bellsCard,
    )
    expect(lead.skullKnown).toBe(false)
    expect(lead.indeterminate.map((b) => b.id)).toEqual([3])
    expect(lead.won.fired).toEqual([])
    expect(lead.lost.fired).toEqual([])
  })

  it('gives each branch both still-possible outcomes on a lead', () => {
    const lead = projectBuffBranches(input({ skullTrick: null }), bellsCard)
    expect(lead.won.outcomes.map((o) => o.outcome)).toEqual([
      TrickOutcome.HighVictory,
      TrickOutcome.HighDefeat,
    ])
    expect(lead.lost.outcomes.map((o) => o.outcome)).toEqual([
      TrickOutcome.LowDefeat,
      TrickOutcome.LowVictory,
    ])
  })

  it("splits a Suit Low card's destination across the two lead outcomes — carried on a Low Defeat, payable on a Low Victory", () => {
    const lead = projectBuffBranches(input({ active: [bladeSuitLow], skullTrick: null }), bellsCard)
    // The Suit Low card FIRES either way — its predicate has no skull term, so it pays on both a
    // Low Victory and a Low Defeat — but DLR-150 sends the reward to the carry on the Defeat and
    // pays it this hand on the Victory. Reporting one figure would be right about the amount and
    // wrong about when it can be spent.
    expect(lead.lost.fired.map((b) => b.id)).toEqual([2])
    const [lowDefeat, lowVictory] = lead.lost.outcomes
    expect(lowDefeat.accrual.carryOut.flatDamageBonus).toBe(1)
    expect(lowDefeat.accrual.flatDamageBonus).toBe(0)
    expect(lowVictory.accrual.flatDamageBonus).toBe(1)
    expect(lowVictory.accrual.carryOut.flatDamageBonus).toBe(0)
  })
})

describe('mayFire — the projection keeps its branch attribution (DLR-153)', () => {
  it('places a riding Skull Low in lost.mayFire on a lead, leaving won.mayFire empty', () => {
    const lead = projectBuffBranches(
      input({ active: [momentumSkullLow], skullTrick: null }),
      bellsCard,
    )
    expect(lead.lost.mayFire.map((b) => b.id)).toEqual([3])
    expect(lead.won.mayFire).toEqual([])
  })

  it('has empty mayFire on both branches of a follow, where every fired buff is certain', () => {
    const cleanFollow = projectBuffBranches(
      input({ active: [bladeSuitHigh, bladeSuitLow, momentumSkullLow], skullTrick: false }),
      bellsCard,
    )
    expect(cleanFollow.won.mayFire).toEqual([])
    expect(cleanFollow.lost.mayFire).toEqual([])

    const skulledFollow = projectBuffBranches(
      input({ active: [bladeSuitHigh, bladeSuitLow, momentumSkullLow], skullTrick: true }),
      bellsCard,
    )
    expect(skulledFollow.won.mayFire).toEqual([])
    expect(skulledFollow.lost.mayFire).toEqual([])
  })

  it('keeps projection.indeterminate equal to the deduped union of both branches’ mayFire', () => {
    const lead = projectBuffBranches(
      input({ active: [momentumSkullLow], skullTrick: null }),
      bellsCard,
    )
    const union = [...lead.won.mayFire, ...lead.lost.mayFire]
    const dedupedIds = [...new Set(union.map((b) => b.id))]
    expect(lead.indeterminate.map((b) => b.id)).toEqual(dedupedIds)
  })

  it('never puts the same buff in both fired and mayFire on one branch', () => {
    const lead = projectBuffBranches(
      input({ active: [bladeSuitHigh, bladeSuitLow, momentumSkullLow], skullTrick: null }),
      bellsCard,
    )
    for (const branch of [lead.won, lead.lost]) {
      const firedIds = new Set(branch.fired.map((b) => b.id))
      const mayFireIds = new Set(branch.mayFire.map((b) => b.id))
      for (const id of mayFireIds) {
        expect(firedIds.has(id)).toBe(false)
      }
    }
  })
})

describe('AC7 — reach counts only the cards that are legal to play this trick', () => {
  const bells2: Card = { suit: Suit.Bells, rank: 2 }
  const bells9: Card = { suit: Suit.Bells, rank: 9 }
  const moons5: Card = { suit: Suit.Moons, rank: 5 }
  const fullHand = [bells2, bells9, moons5]

  it('counts every legal card that could fire the buff', () => {
    expect(
      buffReach(input({ active: [bladeSuitHigh], hand: fullHand }), fullHand, bladeSuitHigh),
    ).toBe(2)
  })

  it('does not count a card that is in hand but not legal to play', () => {
    // `legalCards` is narrowed to the Moons follow — the two Bells are unplayable this trick, so
    // no buff can fire on them however well they match.
    expect(
      buffReach(input({ active: [bladeSuitHigh], hand: fullHand }), [moons5], bladeSuitHigh),
    ).toBe(0)
  })

  it('counts a card whose branch is indeterminate, because "could" includes "might"', () => {
    const onLead = input({ active: [momentumSkullLow], hand: fullHand, skullTrick: null })
    expect(buffReach(onLead, fullHand, momentumSkullLow)).toBe(3)
  })

  it('is 0 for an empty legal set', () => {
    expect(buffReach(input({ active: [bladeSuitHigh], hand: fullHand }), [], bladeSuitHigh)).toBe(0)
  })
})
