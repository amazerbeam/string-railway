import { describe, expect, it } from 'vitest'
import {
  accrueAxisBonus,
  BuffRewardAxis,
  BuffTier,
  EMPTY_BUFF_ACCRUAL,
  mintFromTemplate,
  startEncounter,
  startHandAccrual,
  templateById,
  type Buff,
  type BuffBonusAccrual,
} from '../../../hunt'
import { PlayerSide, TrickOutcome, type TrickResolution } from '../../../warCouncil'
import { buffHandInputFor, foldBuffOutcome, startBuffHand } from '../buffRoundState'
import { createRoundUiState, type ResolvedTrick, type RoundUiState } from '../roundUiState'
import { discardsRemainingFixture, makeRound, timebombChargesFixture } from './roundFixture'

const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

// `hoarder:magnitude` is a Threshold family; `taker:bells:magnitude` is an Event family —
// the same two rows `buffEvaluation.test.ts` pins their cadence with.
const hoarder = buff('hoarder:magnitude', BuffTier.Bronze, 1)
const taker = buff('taker:bells:magnitude', BuffTier.Bronze, 2)

function uiFrom(over: { buffs?: readonly Buff[]; coins?: number } = {}): RoundUiState {
  return createRoundUiState({
    round: makeRound(),
    encounter: startEncounter(0),
    cheats: [],
    timebombCharges: timebombChargesFixture,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: over.buffs ?? [],
    coins: over.coins,
  })
}

const RESOLUTION: TrickResolution = {
  outcome: TrickOutcome.CleanWin,
  bankAdded: 1,
  cashOut: 0,
  damageToPlayer: 0,
  bank: 1,
  multiplier: 1,
  cashedAtHandEnd: false,
  timebombTarget: null,
  timebombToQuarry: 0,
  blastGuardSpent: false,
  buffAccrual: null,
  firedBuffIds: [],
}

function withResolved(
  ui: RoundUiState,
  over: Partial<TrickResolution>,
  firedBuffIds: readonly number[] = [],
): RoundUiState {
  const resolvedTrick: ResolvedTrick = {
    cards: [],
    winner: PlayerSide.Player,
    resolution: { ...RESOLUTION, ...over, firedBuffIds },
  }
  return { ...ui, resolvedTrick }
}

describe('startBuffHand', () => {
  it('starts empty — no accrual, nothing fired, no press, the streak at zero', () => {
    const hand = startBuffHand()
    expect(hand.accrual).toEqual(startHandAccrual())
    expect(hand.firedThisHand).toEqual([])
    expect(hand.tricksWithoutHit).toBe(0)
    expect(hand.coinsEarned).toBe(0)
    expect(hand.applyDamagePressed).toBe(false)
  })
})

describe('buffHandInputFor', () => {
  it('assembles only the buffs activated for this trick, never the whole offered pile', () => {
    const ui = uiFrom({ buffs: [hoarder, taker], coins: 7 })
    const activated = {
      ...ui,
      buffActivation: { ...ui.buffActivation, activatedThisTrick: [taker.id] },
    }
    const input = buffHandInputFor(activated)
    expect(input.active).toEqual([taker])
    expect(input.coins).toBe(7)
  })
})

describe('foldBuffOutcome', () => {
  it('is a no-op off the resolved-trick edge — prev already held a resolution', () => {
    const ui = uiFrom()
    const held = withResolved(ui, {})
    expect(foldBuffOutcome(held, held)).toBe(held)
  })

  it('is a no-op when the next trick has not resolved', () => {
    const ui = uiFrom()
    expect(foldBuffOutcome(ui, ui)).toBe(ui)
  })

  it('R3 step 1 — a Second Wind refund lands in the pool for the NEXT window', () => {
    const prev = uiFrom()
    const accrual = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.ApRefund, 3)
    const next = withResolved(prev, { buffAccrual: accrual })
    const folded = foldBuffOutcome(prev, next)
    expect(folded.buffActivation.apPool).toBe(next.buffActivation.apPool + 3)
  })

  it('R3 step 5 — a Purse contribution accumulates into coinsEarned', () => {
    const prev = uiFrom()
    const accrual = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Coins, 5)
    const next = withResolved(prev, { buffAccrual: accrual })
    const folded = foldBuffOutcome(prev, next)
    expect(folded.buffHand.coinsEarned).toBe(5)
  })

  it('a threshold family that fired is recorded once and does not fire again this hand', () => {
    const prev = uiFrom({ buffs: [hoarder] })
    const next = withResolved(prev, { buffAccrual: startHandAccrual() }, [hoarder.id])
    const folded = foldBuffOutcome(prev, next)
    expect(folded.buffHand.firedThisHand).toEqual([hoarder.id])
  })

  it('an event family that fired is NOT recorded, so it can fire again', () => {
    const prev = uiFrom({ buffs: [taker] })
    const next = withResolved(prev, { buffAccrual: startHandAccrual() }, [taker.id])
    const folded = foldBuffOutcome(prev, next)
    expect(folded.buffHand.firedThisHand).toEqual([])
  })

  it('the no-hit counter climbs on a clean trick and zeroes on a hit', () => {
    const prev = uiFrom()
    const clean = withResolved(prev, { damageToPlayer: 0 })
    expect(foldBuffOutcome(prev, clean).buffHand.tricksWithoutHit).toBe(1)

    const hit = withResolved(prev, { damageToPlayer: 1 })
    expect(foldBuffOutcome(prev, hit).buffHand.tricksWithoutHit).toBe(0)
  })

  it('R6 — a hit does NOT reset the accrual or its caps', () => {
    const accrued = accrueAxisBonus(startHandAccrual(), BuffRewardAxis.Multiplier, 4)
    const prev: RoundUiState = { ...uiFrom(), buffHand: { ...startBuffHand(), accrual: accrued } }
    // The accrual reported back by `resolveTrickBank` is unchanged by the hit — nothing new fired.
    const next = withResolved(prev, { damageToPlayer: 1, buffAccrual: accrued })
    const folded = foldBuffOutcome(prev, next)
    const expectedAccrual: BuffBonusAccrual = accrued
    expect(folded.buffHand.accrual).toEqual(expectedAccrual)
    expect(folded.buffHand.accrual).not.toEqual(EMPTY_BUFF_ACCRUAL)
  })
})
