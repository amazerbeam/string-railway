import { describe, expect, it } from 'vitest'
import {
  accrueAxisBonus,
  activateFromPile,
  openBuffWindow,
  BuffKind,
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
import {
  createRoundUiState,
  offeredBuffs,
  type ResolvedTrick,
  type RoundUiState,
} from '../roundUiState'
import { discardsRemainingFixture, makeRound } from './roundFixture'

const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

// Hoarder has no surviving template (DLR-145) — it stays declared on `BuffKind`, keeps its
// `BUFF_CADENCE` row and its `buffFires` case, so it is built directly as a `Buff` literal here,
// the same idiom `buffEvaluation.test.ts` and `buffTemplates.test.ts` already use for it.
// `suitHigh:bells:magnitude` is still mintable — an Event family, the same row
// `buffEvaluation.test.ts` pins its cadence with.
const hoarder: Buff = {
  id: 1,
  kind: BuffKind.Hoarder,
  tier: BuffTier.Bronze,
  condition: { kind: BuffKind.Hoarder },
  reward: { axis: BuffRewardAxis.Magnitude, value: 1 },
}
const suitHigh = buff('suitHigh:bells:magnitude', BuffTier.Bronze, 2)

function uiFrom(over: { buffs?: readonly Buff[]; coins?: number } = {}): RoundUiState {
  return createRoundUiState({
    round: makeRound(),
    encounter: startEncounter(0),
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs: over.buffs ?? [],
    coins: over.coins,
  })
}

const RESOLUTION: TrickResolution = {
  outcome: TrickOutcome.HighVictory,
  trickDamage: { base: 1, buffDamage: 0, buffMult: 1, overlapBonus: 0, dealt: 1 },
  cashOut: 0,
  damageToPlayer: 0,
  total: 1,
  roll: 1,
  buffAccrual: null,
  firedBuffIds: [],

  treasureBonusEarned: false,
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
    const ui = uiFrom({ buffs: [hoarder, suitHigh], coins: 7 })
    const activated = {
      ...ui,
      buffActivation: { ...ui.buffActivation, activatedThisTrick: [suitHigh.id] },
    }
    const input = buffHandInputFor(activated)
    expect(input.active).toEqual([suitHigh])
    expect(input.coins).toBe(7)
  })

  it('a consumed card is no longer in the pile but is still active for THIS trick (DLR-145)', () => {
    const seeded = uiFrom({ buffs: [suitHigh] })
    const { activation, buffs } = activateFromPile(seeded.buffActivation, seeded.buffs, suitHigh, true)
    const spentState = { ...seeded, buffs, buffActivation: activation }

    expect(offeredBuffs(spentState)).toHaveLength(0)
    expect(buffHandInputFor(spentState).active.map((buff) => buff.id)).toEqual([suitHigh.id])
  })

  it('drops it from the active set once the window reopens', () => {
    const seeded = uiFrom({ buffs: [suitHigh] })
    const { activation, buffs } = activateFromPile(seeded.buffActivation, seeded.buffs, suitHigh, true)
    const nextTrick = { ...seeded, buffs, buffActivation: openBuffWindow(activation) }
    expect(buffHandInputFor(nextTrick).active).toEqual([])
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
    const prev = uiFrom({ buffs: [suitHigh] })
    const next = withResolved(prev, { buffAccrual: startHandAccrual() }, [suitHigh.id])
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
