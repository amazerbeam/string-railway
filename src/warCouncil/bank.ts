import { DAMAGE_PER_HIT, DuelSide, type IncomingDamage } from '../hunt'

/** §3.2's four rows. Named rather than a pair of booleans at every branch, so the rule reads
 *  out of the code the way it reads out of the design's table. */
export const TrickOutcome = {
  CleanWin: 'cleanWin', // AC4 — take the trick
  Dodge: 'dodge', // AC5 — take the trick
  CleanLoss: 'cleanLoss', // AC6 — take the damage
  SkullWin: 'skullWin', // AC7 — take the damage
} as const
export type TrickOutcome = (typeof TrickOutcome)[keyof typeof TrickOutcome]

/** The two running figures a hand carries. §3.3: the bank only ever climbs; the multiplier is
 *  the number of tricks taken in a row. */
export interface BankState {
  readonly bank: number
  readonly multiplier: number
}

export interface TrickResolution extends BankState {
  readonly outcome: TrickOutcome
  /** Tricks added to the bank by this trick — 1 on a take, 0 on a hit. */
  readonly bankAdded: number
  /** Damage dealt to the Quarry by this trick: AC6/AC7's cash-out, AC8's forced one, or 0. */
  readonly cashOut: number
  /** 0 or `DAMAGE_PER_HIT`. */
  readonly damageToPlayer: number
  /** Which rule produced `cashOut` — AC8's end-of-hand cash rather than AC6/AC7's. Display only:
   *  the two can never both be non-zero, because a hit resets the bank to 0 first. */
  readonly cashedAtHandEnd: boolean
}

/** §3.2's table as a total function. The skull inverts the trick: on a clean trick you want to
 *  win it, on a skull trick you want to lose it. */
export function trickOutcomeFor(playerWon: boolean, skullTrick: boolean): TrickOutcome {
  if (playerWon) {
    return skullTrick ? TrickOutcome.SkullWin : TrickOutcome.CleanWin
  }
  return skullTrick ? TrickOutcome.Dodge : TrickOutcome.CleanLoss
}

const TAKEN: Readonly<Record<TrickOutcome, boolean>> = {
  [TrickOutcome.CleanWin]: true,
  [TrickOutcome.Dodge]: true,
  [TrickOutcome.CleanLoss]: false,
  [TrickOutcome.SkullWin]: false,
}

/** Whether an outcome banks the cards (AC4/AC5) or takes damage (AC6/AC7). A total `Record`
 *  rather than a comparison, so a fifth outcome becomes a missing-property compile error. */
export function isTaken(outcome: TrickOutcome): boolean {
  return TAKEN[outcome]
}

/**
 * One trick's whole effect on the bank, the streak, and both health bars.
 *
 * `finalTrick` folds AC8 in rather than modelling it as a second event. That is safe because
 * exactly one of the two cash-outs can ever fire: a hit sets bank and multiplier to zero, so
 * AC8's subsequent `0 × 0` is zero; a take leaves exactly one bank to cash. The result is one
 * damage application per trick, with `cashedAtHandEnd` recording which rule paid out.
 *
 * Pure arithmetic over two integer counters — there is no division anywhere here, so no epsilon is
 * needed and no `NaN` is producible from the inputs this takes.
 */
export function resolveTrickBank(
  before: BankState,
  playerWon: boolean,
  skullTrick: boolean,
  finalTrick: boolean,
): TrickResolution {
  const outcome = trickOutcomeFor(playerWon, skullTrick)

  let bank = before.bank
  let multiplier = before.multiplier
  let bankAdded = 0
  let cashOut = 0
  let damageToPlayer = 0

  if (isTaken(outcome)) {
    // PT-002 — the bank counts TRICKS, not card values. Both terms climb by exactly 1 per trick
    // taken, so a streak of n cashes n × n: 1, 4, 9, 16, 25, 36 across a six-trick hand.
    // Not a config key: 1 is what counting a trick means, and a later item that grants bonus
    // bank adds to `bank` rather than redefining a trick's worth.
    bankAdded = 1
    bank += bankAdded
    multiplier += 1
  } else {
    cashOut = bank * multiplier
    damageToPlayer = DAMAGE_PER_HIT
    bank = 0
    multiplier = 0
  }

  const handEndCash = finalTrick ? bank * multiplier : 0
  if (finalTrick) {
    cashOut += handEndCash
    bank = 0
    multiplier = 0
  }

  return {
    outcome,
    bankAdded,
    cashOut,
    damageToPlayer,
    bank,
    multiplier,
    cashedAtHandEnd: handEndCash > 0,
  }
}

/**
 * THE one `PlayerSide` -> `DuelSide` crossing, replacing the retired `duelSideDamage`.
 *
 * Keyed by the side the damage is APPLIED TO: the player eats `damageToPlayer`, the Quarry eats
 * `cashOut`. Existing as one function is the point — a call site building this record by hand is
 * one transposition away from depleting the wrong bar, type-checking cleanly, and producing
 * plausible numbers indefinitely.
 */
export function incomingFrom(resolution: TrickResolution): IncomingDamage {
  return {
    [DuelSide.Player]: resolution.damageToPlayer,
    [DuelSide.Quarry]: resolution.cashOut,
  }
}
