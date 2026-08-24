/**
 * DLR-125 — the hand's buff bookkeeping: the accrual, which once-per-hand families have already
 * fired, Unbloodied's no-hit counter, the coins earned so far, and the Apply-Damage-press flag —
 * as one value, its assembly into `PlayCardOptions.buffs`, and the fold of a resolved trick's
 * outcome back into the felt.
 *
 * A SEPARATE MODULE from `roundUiState.ts` rather than three more fields there: that file stands
 * at 379 of its 400-line budget, and `BuffHandState` plus its seeding and fold would breach it.
 * `roundUiState.ts` still owns `RoundUiState.buffHand`'s declaration and `createRoundUiState`'s
 * call to `startBuffHand()`, which IS the per-hand reset — `App.tsx` remounts the felt per hand
 * (`key={hand}`), the identical argument `buffActivation`'s own docblock already makes.
 */
import {
  advanceTricksWithoutHit,
  DuelSide,
  firesOncePerHand,
  startHandAccrual,
  type BuffBonusAccrual,
  type BuffId,
  type Coins,
} from '../../hunt'
import type { BuffHandInput } from '../../warCouncil'
import { offeredBuffs, type RoundUiState } from './roundUiState'

/** The hand's buff bookkeeping, as one value. Seeded by `createRoundUiState` — which IS the
 *  per-hand reset, because `App.tsx` remounts the felt per hand (`key={hand}`), the identical
 *  argument `startBuffActivation` already makes. */
export interface BuffHandState {
  readonly accrual: BuffBonusAccrual
  readonly firedThisHand: readonly BuffId[]
  /** Unbloodied's condition counter. Zeroes on a hit — which is a CONDITION reset, not a CAP
   *  reset, and lives here rather than in `buffAccrual.ts` so the two can never be confused
   *  (hybrid-design.md §5 R6). */
  readonly tricksWithoutHit: number
  /** Purse, accumulated this hand and handed up at hand's end. UNIT: coins. */
  readonly coinsEarned: Coins
  /** DLR-109 — Apply Damage was PRESSED this hand. */
  readonly applyDamagePressed: boolean
}

/** A fresh hand's bookkeeping — nothing fired, nothing pressed, the no-hit streak at zero. */
export function startBuffHand(): BuffHandState {
  return {
    accrual: startHandAccrual(),
    firedThisHand: [],
    tricksWithoutHit: 0,
    coinsEarned: 0,
    applyDamagePressed: false,
  }
}

/** Assembles `PlayCardOptions.buffs` from the felt. Reads the offered pile through
 *  `offeredBuffs` and this trick's activations off `buffActivation.activatedThisTrick` — never a
 *  second filter, which is the `Unassigned` trap `plan.md` names. */
export function buffHandInputFor(state: RoundUiState): BuffHandInput {
  const active = offeredBuffs(state).filter((buff) =>
    state.buffActivation.activatedThisTrick.includes(buff.id),
  )
  return {
    active,
    accrual: state.buffHand.accrual,
    firedThisHand: state.buffHand.firedThisHand,
    tricksWithoutHit: state.buffHand.tricksWithoutHit,
    coins: state.coins,
    playerHealth: state.encounter.health[DuelSide.Player],
    applyDamagePressed: state.buffHand.applyDamagePressed,
  }
}

/** Resolves each fired id back to its `Buff` through `offeredBuffs` — never a second filter — and
 *  keeps only the ones `firesOncePerHand` is true for, so an Event family that fired stays free to
 *  fire again this hand. */
function firedOncePerHandIds(state: RoundUiState, firedIds: readonly BuffId[]): readonly BuffId[] {
  const offered = offeredBuffs(state)
  return firedIds.filter((id) => {
    const buff = offered.find((candidate) => candidate.id === id)
    return buff !== undefined && firesOncePerHand(buff)
  })
}

/**
 * Folds a resolved trick's buff outcome back into the felt. R3's steps 1 and 5 land here —
 * step 1 (Second Wind) into the AP pool, which is why this runs AFTER the trick has resolved and
 * never during it: a refund the player could re-spend on the trick that generated it is the loop
 * `MAX_REFUND_PER_HAND` exists to bound. Step 5 (Purse) accumulates for the hand's end.
 *
 * Fires on the `null` -> non-null edge of `resolvedTrick`, the same edge `openWindowOnTrickResolved`
 * uses, and must run BEFORE it so the refunded AP survives into the next window. Pure and
 * two-argument, so StrictMode's development double dispatch recomputes an identical value.
 *
 * `tricksWithoutHit` is the ONE counter here that zeroes on a hit. It is Unbloodied's CONDITION,
 * not a cap: R6's four caps reset per hand and NOT on a hit, they live in `buffAccrual.ts`, and
 * `startHandAccrual()` is still the only reset that touches them.
 */
export function foldBuffOutcome(prev: RoundUiState, next: RoundUiState): RoundUiState {
  if (prev.resolvedTrick !== null || next.resolvedTrick === null) return next
  const { resolution } = next.resolvedTrick
  const accrual = resolution.buffAccrual
  const hand = next.buffHand
  if (accrual === null) {
    return {
      ...next,
      buffHand: {
        ...hand,
        tricksWithoutHit: advanceTricksWithoutHit(
          hand.tricksWithoutHit,
          resolution.damageToPlayer > 0,
        ),
      },
    }
  }
  // Deltas, not totals: `accrual` is the hand's running figure and the pool has already been
  // credited with everything before this trick.
  const refunded = accrual.apRefunded - hand.accrual.apRefunded
  const coined = accrual.coinBonus - hand.accrual.coinBonus
  const firedOnce = firedOncePerHandIds(next, resolution.firedBuffIds)
  return {
    ...next,
    buffActivation: { ...next.buffActivation, apPool: next.buffActivation.apPool + refunded },
    buffHand: {
      accrual,
      firedThisHand: [...hand.firedThisHand, ...firedOnce],
      tricksWithoutHit: advanceTricksWithoutHit(
        hand.tricksWithoutHit,
        resolution.damageToPlayer > 0,
      ),
      coinsEarned: hand.coinsEarned + coined,
      applyDamagePressed: hand.applyDamagePressed,
    },
  }
}
