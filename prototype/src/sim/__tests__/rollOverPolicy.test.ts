import { describe, expect, it } from 'vitest'
import { withRollTarget, rollTargetPolicies, ROLL_TARGET_SWEEP } from '../rollOverPolicy'
import { cardAwarePolicy } from '../cardAwarePolicy'
import { POLICIES } from '../policies'
import { playRun } from '../playRun'
import type { RoundUiState } from '../../app/warCouncil/roundUiState'
import { DuelSide, STARTING_AP } from '../../hunt'

/** The two fields `wantsApplyPot` actually reads — the standing streak on the resolution screen and
 *  the Quarry's remaining health. Built by hand rather than by driving a real hand to a resolution:
 *  the stopping rule is pure arithmetic over these two facts, and a real hand cannot be steered to
 *  an arbitrary (total, roll, health) triple to pin the boundary cases below. */
function uiAt(total: number, roll: number, quarryHealth: number): RoundUiState {
  return {
    resolution: { resolution: { total, roll } },
    encounter: { health: { [DuelSide.Quarry]: quarryHealth } },
  } as unknown as RoundUiState
}

describe('withRollTarget', () => {
  it('rolls over below the target and applies once the roll reaches it', () => {
    const policy = withRollTarget(cardAwarePolicy, 4, 'test')
    // A pot far short of the Quarry's health, so only the threshold clause can decide.
    expect(policy.wantsApplyPot?.(uiAt(3, 3, 1000))).toBe(false)
    expect(policy.wantsApplyPot?.(uiAt(4, 4, 1000))).toBe(true)
    expect(policy.wantsApplyPot?.(uiAt(5, 5, 1000))).toBe(true)
  })

  it('cashes a lethal pot immediately, whatever the target says', () => {
    const policy = withRollTarget(cardAwarePolicy, 6, 'test')
    // total 4 x roll 2 = 8, against a Quarry on 8. Lethal, and roll 2 is far below the target.
    expect(policy.wantsApplyPot?.(uiAt(4, 2, 8))).toBe(true)
    // One health more and it is no longer lethal, so the target takes over again.
    expect(policy.wantsApplyPot?.(uiAt(4, 2, 9))).toBe(false)
  })

  it('applies when there is no resolution screen to decide about', () => {
    const policy = withRollTarget(cardAwarePolicy, 4, 'test')
    expect(policy.wantsApplyPot?.({ resolution: null } as unknown as RoundUiState)).toBe(true)
  })

  it('passes every other method through by reference, so a gap is the push alone', () => {
    const policy = withRollTarget(cardAwarePolicy, 3, 'test')
    expect(policy.chooseCard).toBe(cardAwarePolicy.chooseCard)
    expect(policy.chooseBuffs).toBe(cardAwarePolicy.chooseBuffs)
    expect(policy.nextShopAction).toBe(cardAwarePolicy.nextShopAction)
    expect(policy.name).toBe('test')
  })

  it('throws rather than clamping on a target below 1', () => {
    expect(() => withRollTarget(cardAwarePolicy, 0, 'bad')).toThrow(RangeError)
    expect(() => withRollTarget(cardAwarePolicy, 1.5, 'bad')).toThrow(RangeError)
  })
})

describe('rollTargetPolicies', () => {
  it('builds one policy per sweep entry, named after its target', () => {
    const built = rollTargetPolicies(cardAwarePolicy, 'cardAware')
    expect(Object.keys(built)).toEqual(ROLL_TARGET_SWEEP.map((n) => `cardAwareRoll${n}`))
    for (const [key, policy] of Object.entries(built)) {
      expect(policy.name).toBe(key)
    }
  })

  it('registers every sweep entry in POLICIES under both prefixes', () => {
    for (const target of ROLL_TARGET_SWEEP) {
      expect(POLICIES[`cardAwareRoll${target}`]).toBeDefined()
      expect(POLICIES[`rerollRoll${target}`]).toBeDefined()
    }
  })
})

describe('the push actually reaches the engine', () => {
  const SEEDS = [11, 12, 13, 14, 15]

  function potsOver(policyName: string): readonly number[] {
    return SEEDS.flatMap((seed) =>
      playRun(seed, POLICIES[policyName]).hands.flatMap((hand) => hand.potsApplied),
    )
  }

  it('the never-push floor never carries a roll past 1, and the push does', () => {
    for (const seed of SEEDS) {
      // Cashing on every banked trick means nothing can ever accumulate — which is exactly what
      // "the roll-over mechanic was switched off" meant before this module existed.
      for (const hand of playRun(seed, POLICIES.cardAwareRoll1).hands) {
        expect(hand.streakOut.roll).toBeLessThanOrEqual(1)
      }
    }
    const pushedRolls = SEEDS.flatMap((seed) =>
      playRun(seed, POLICIES.cardAwareRoll4).hands.map((hand) => hand.streakOut.roll),
    )
    expect(Math.max(...pushedRolls)).toBeGreaterThan(1)
  })

  it('the push cashes bigger pots than the floor can reach', () => {
    expect(Math.max(...potsOver('cardAwareRoll4'))).toBeGreaterThan(
      Math.max(...potsOver('cardAwareRoll1')),
    )
  })
})

describe('the buff stack is no longer rationed by a switched-off resource', () => {
  it('fires more cards on one trick than STARTING_AP could ever have paid for', () => {
    // Regression pin for the AP-budget fix (`baselinePolicy.ts`'s `apBudgetCostOf`). Both policies
    // budgeted through `apCostOf`'s RAW price table against a pool of `STARTING_AP` (6) at prices
    // of 1 to 3, so nothing could ever arm more than six cards on a trick — while the engine, with
    // `AP_ENABLED` off since 2026-08-25, charged nothing and refused nothing. The Overlap Bonus
    // pays `firedCount - 1`, so that self-imposed cap understated the whole stacking mechanic.
    const stacks: number[] = []
    for (const seed of [1, 2, 3]) {
      for (const hand of playRun(seed, POLICIES.rerollRoll3).hands) {
        const perTrick = new Map<number, number>()
        for (const outcome of hand.buffFireOutcomes) {
          perTrick.set(outcome.trickOfHand, (perTrick.get(outcome.trickOfHand) ?? 0) + 1)
        }
        stacks.push(...perTrick.values())
      }
    }
    expect(Math.max(...stacks)).toBeGreaterThan(STARTING_AP)
  })
})
