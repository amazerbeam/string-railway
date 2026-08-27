import {
  advanceTricksWithoutHit,
  DAMAGE_PER_HIT,
  DuelSide,
  FORCED_CASH_OUT_DENOMINATOR,
  FORCED_CASH_OUT_NUMERATOR,
  markCashOutPaid,
  payableCashOutBonus,
  resolveTrickBuffs,
  type BuffBonusAccrual,
  type BuffId,
  type BuffTrickInput,
  type CashOutBonus,
  type Damage,
  type IncomingDamage,
} from '../hunt'

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
  /** DLR-90 AC3/AC6 — the side owed the Timebomb figure for that side (`TIMEBOMB_QUARRY_DAMAGE` or
   *  `TIMEBOMB_PLAYER_DAMAGE`) at the start of the next hand, or `null` when the trick carried no
   *  mark. Keyed by the side the damage will be APPLIED TO, and typed
   *  `DuelSide` rather than `PlayerSide` deliberately: this module is already THE one crossing
   *  between the two vocabularies (see `incomingFrom` below), so the reducer receives a side it
   *  hands straight to `queueTimebomb` with no second crossing to get backwards. */
  readonly timebombTarget: DuelSide | null
  /** D1 — carried through so `incomingFrom` sums it into the Quarry's total. Display-safe: this is
   *  the figure paid at THIS trick, not one booked by it — that is `timebombTarget`. */
  readonly timebombToQuarry: Damage
  /** AC4 — the Guard fired and suppressed a reset, so the reducer must spend it. `true` only when
   *  Timebomb was actually owed to the player at this trick AND a Guard was held. */
  readonly blastGuardSpent: boolean
  /** DLR-125 — the hand's accrual AFTER this trick, or `null` when `TrickFacts.buffs` was
   *  `null`. Reported back OUT so the felt folds one value rather than re-deriving it. */
  readonly buffAccrual: BuffBonusAccrual | null
  /** DLR-125 — the ids that fired on this trick, in `active` order. Empty when none did. */
  readonly firedBuffIds: readonly BuffId[]
}

/**
 * The eight facts about a completed trick that decide its whole effect on the bank, the streak and
 * both bars.
 *
 * A parameter object rather than positional booleans, introduced on DLR-90 when the fourth became a
 * fifth: `resolveTrickBank(START, true, false, false, false)` is unreadable at the call site, and a
 * transposed pair of booleans type-checks cleanly and produces plausible numbers.
 */
export interface TrickFacts {
  readonly playerWon: boolean
  /** Any card played into the trick carries a skull (§3.2). */
  readonly skullTrick: boolean
  /** The last trick of the hand, so AC8's end-of-hand cash applies. */
  readonly finalTrick: boolean
  /** DLR-90 AC3 — any card played into the trick carries the Timebomb mark. */
  readonly timebombTrick: boolean
  /** D1/D3 — Timebomb owed to the PLAYER from an earlier trick, being paid at this one. 0 when none.
   *  Non-zero makes this trick a hit for the cash-out's purposes even if the player won it. */
  readonly timebombToPlayer: Damage
  /** D1 — Timebomb owed to the QUARRY from an earlier trick, being paid at this one. 0 when none.
   *  Never touches the bank: the Quarry has no streak to lose. */
  readonly timebombToQuarry: Damage
  /** DLR-91 AC4 — a Blast Guard is held, so Timebomb must NOT force the cash-out. Gates the Timebomb
   *  trigger only, never the trick's own hit: a 1-coin item does not insure against every loss. */
  readonly blastGuarded: boolean
  /** DLR-92 AC4 — extra bank added by a TAKEN trick, on top of the trick's own 1. A plain number
   *  handed in, never a run figure read: this module must not learn what bought it, which is why
   *  it is not called a Whetstone count. 0 is the bare rule. The MULTIPLIER is unaffected (AC5). */
  readonly bankClimbBonus: number
  /** DLR-122 AC4 — the player's Swan ladder stands at silver or better AND the player played a
   *  Swan into this trick. A plain FACT handed in, never a run figure read, exactly as
   *  `blastGuarded` and `bankClimbBonus` above: this module must not learn who holds which card.
   *  `rankTierRules.ts`'s `swanTierFactsFor` is the single producer, and AC3's player-only gate
   *  lives there. Only ever consulted on a CLEAN LOSS — see `resolveTrickBank`. */
  readonly swanKeepsMultiplier: boolean
  /** DLR-122 AC5 — as above, at gold. Gold IMPLIES silver, and `resolveTrickBank` folds that
   *  implication in itself rather than trusting the caller, so a hand-built fact object cannot
   *  produce the nonsense state "the bank survives but the streak that valued it does not". */
  readonly swanKeepsBank: boolean
  /** DLR-125 — the buffs activated for this trick plus the hand facts their conditions read.
   *  REQUIRED and `| null`, not optional: optional would let a call site skip buffs silently,
   *  and this shape has five construction sites the compiler should enumerate. A plain value
   *  handed in, never a run figure read — exactly `bankClimbBonus`'s and `blastGuarded`'s
   *  contract. */
  readonly buffs: BuffTrickInput | null
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

/** DLR-125 — the payable bonus when there is nothing to pay: a `null` accrual (no buffs this
 *  trick) reads identically to an accrual with nothing left to spend. A `const`, not mutable
 *  state. */
const NO_CASH_OUT_BONUS: CashOutBonus = { multiplierBonus: 0, flatDamageBonus: 0 }

/**
 * The figure a bank of `bank` at a multiplier of `multiplier` is worth IN FULL — the plain
 * product. THE one statement of it, so the three cash-outs this game now has (a voluntary apply,
 * the end of the hand, and a forced hit's reduced share) cannot disagree about what they are a
 * share OF.
 *
 * Floors a non-integer, non-positive, NaN or infinite input to 0 rather than propagating it, for
 * the reason `bankAdded`'s own guard below states: this figure feeds damage, then a rendered heart
 * row, so a NaN would vanish into a health bar with nothing logged anywhere
 * (`web-project.md` → "NaN propagates silently"). Every real input is a non-negative integer, so
 * this is a guard rather than a live path.
 */
export function cashValue(bank: number, multiplier: number): number {
  if (!Number.isInteger(bank) || !Number.isInteger(multiplier) || bank <= 0 || multiplier <= 0) {
    return 0
  }
  return bank * multiplier
}

/**
 * DLR-94 AC4 — what a FORCED cash-out pays: `cashValue` reduced to the configured fraction and
 * rounded DOWN, so the Quarry is never overpaid by a rounding artefact.
 *
 * MULTIPLIES BEFORE IT DIVIDES, which is load-bearing rather than stylistic. `x * (2 / 3)` is
 * `x * 0.6666666666666666`, so `3 * (2 / 3)` is `1.9999999999999998` and floors to 1 where the
 * rule says 2 — wrong for every multiple of 3. Taking the numerator first keeps the dividend an
 * exact integer at what is the only division in this file.
 *
 * Throws on a non-positive or non-finite denominator rather than returning `NaN`, exactly as
 * `flaskHealAmount` and `duelHealthBars` throw on theirs. Both figures are configured integers, so
 * this is a guard, not a path a player reaches.
 */
export function forcedCashValue(bank: number, multiplier: number): number {
  if (!Number.isFinite(FORCED_CASH_OUT_DENOMINATOR) || FORCED_CASH_OUT_DENOMINATOR <= 0) {
    throw new RangeError(
      `Cannot reduce a cash-out by a denominator of ${FORCED_CASH_OUT_DENOMINATOR}: it must be a positive finite number`,
    )
  }
  return Math.floor(
    (cashValue(bank, multiplier) * FORCED_CASH_OUT_NUMERATOR) / FORCED_CASH_OUT_DENOMINATOR,
  )
}

/**
 * One trick's whole effect on the bank, the streak, and both health bars.
 *
 * `finalTrick` folds AC8 in rather than modelling it as a second event. That is safe because
 * exactly one of the two cash-outs can ever fire: a hit sets bank and multiplier to zero, so
 * AC8's subsequent `0 × 0` is zero; a take leaves exactly one bank to cash — and DLR-90's AC5
 * REPLACED clean loss now leaves neither cash-out firing, so the bank stands untouched for
 * `finalTrick` or a later trick to cash instead. The result is at most one damage application per
 * trick, with `cashedAtHandEnd` recording which rule paid out.
 *
 * Pure arithmetic over two integer counters — there is no division anywhere here, so no epsilon is
 * needed and no `NaN` is producible from the inputs this takes.
 */
export function resolveTrickBank(before: BankState, trick: TrickFacts): TrickResolution {
  const outcome = trickOutcomeFor(trick.playerWon, trick.skullTrick)

  let bank = before.bank
  let multiplier = before.multiplier
  let bankAdded = 0
  let cashOut = 0

  // AC5 — REPLACED, not added to. A marked trick the Quarry won CLEANLY costs the player nothing:
  // no health lost, and the bank and multiplier survive uncashed even though this is a loss by the
  // normal rules. That is the item's whole point — it gives a card the player already expects to
  // lose with a reason to be played instead of being dead weight.
  //
  // Keyed on `CleanLoss` rather than on "the Quarry won" DELIBERATELY: a Dodge is also a trick the
  // Quarry won, and it is one the player BANKS, so treating every Quarry win as replaced would zero
  // a `bankAdded` the player had already earned. `CleanLoss` is the only outcome where a Quarry win
  // costs the player anything, so it is the only one with something to replace.
  //
  // AC6 needs no counterpart and gets none: a marked trick the player wins is already a `CleanWin`
  // and falls through to the ordinary branch below, banking 1 and climbing the multiplier. The
  // delayed hit is symmetric because `timebombTarget` follows the WINNER, not a mirrored rule.
  const replaced = trick.timebombTrick && outcome === TrickOutcome.CleanLoss

  if (isTaken(outcome)) {
    // PT-002 — the bank counts TRICKS, not card values, so the base is 1 and that is not a config
    // key: 1 is what counting a trick means. DLR-92 AC4 adds the run's bank-climb bonus on top,
    // so a streak of n now cashes (1 + bonus) × n².
    //
    // Floored to 0 unless it is a positive integer. `bankAdded` feeds `bank`, then `bank ×
    // multiplier`, then damage, then a rendered heart row — so a NaN or a fraction would vanish
    // into a health bar with nothing logged (`web-project.md` → "NaN propagates silently"). It
    // degrades to the bare pre-DLR-92 rule rather than throwing, because mid-trick is the wrong
    // place to abort a hand.
    const bonus =
      Number.isInteger(trick.bankClimbBonus) && trick.bankClimbBonus > 0 ? trick.bankClimbBonus : 0
    bankAdded = 1 + bonus
    bank += bankAdded
    // AC5 — UNCHANGED, and deliberately so: the multiplier-side twin is a separate future item.
    multiplier += 1
  }

  // TWO sources of a hit since D1/D3. `trickHit` is the pre-existing one — a clean loss or a skull
  // win, unless DLR-90's AC5 replaced it. Timebomb is the new one, and it reaches the SAME branch
  // rather than getting a rule of its own: that is what makes "Timebomb behaves like any other
  // damage" true in code instead of asserted in a comment.
  const trickHit = !isTaken(outcome) && !replaced

  // DLR-122 AC4/AC5 — the Swan ladder, gated on CLEAN LOSS here rather than at the call site.
  // "Not an eaten skull" is a rule about OUTCOMES, and outcomes are this module's subject; a
  // caller-side gate would put half of AC4 in `playCard.ts`, where no bank spec would ever see
  // it. A Dodge and a Clean Win have no hit to spare and a Skull Win is the eaten skull AC4
  // excludes by name, so `CleanLoss` is the whole of it.
  const swanCleanLoss = outcome === TrickOutcome.CleanLoss
  const swanKeepsBank = swanCleanLoss && trick.swanKeepsBank
  // Gold implies silver, folded in HERE rather than trusted from the caller.
  const swanKeepsMultiplier = swanCleanLoss && (trick.swanKeepsMultiplier || trick.swanKeepsBank)
  // AC4 — a held Guard suppresses the TIMEBOMB trigger only.
  const timebombResets = trick.timebombToPlayer > 0 && !trick.blastGuarded

  // Owed whether or not the streak resets: a Guard buys back the streak, never the health.
  // D2's 2-or-3 is this line — the Timebomb alone on a trick the player won, plus DAMAGE_PER_HIT
  // on one they also lost.
  const damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) + trick.timebombToPlayer

  // DLR-125/DLR-124 R3 — evaluation happens HERE, between the climb and the cash-out, because two
  // conditions read figures that exist only inside this function: Hoarder's bank AFTER the climb
  // and Unbloodied's "was this trick a hit". R3's five steps then land in their forced order —
  // step 2 (Momentum) inside the product below, step 4 (Blade) outside it, after §7's two-thirds
  // floor. Steps 1 and 5 (Second Wind, Purse) touch nothing this hand's damage depends on and are
  // folded by the felt from `buffAccrual`. Cited, never restated: hybrid-design.md §5.
  const buffOutcome =
    trick.buffs === null
      ? null
      : resolveTrickBuffs(
          trick.buffs,
          {
            playerWon: trick.playerWon,
            skullTrick: trick.skullTrick,
            playerHit: damageToPlayer > 0,
            finalTrick: trick.finalTrick,
            bankAfterTrick: bank,
            ...trick.buffs.hand,
            tricksWithoutHit: advanceTricksWithoutHit(
              trick.buffs.hand.tricksWithoutHit,
              damageToPlayer > 0,
            ),
          },
          // DLR-150 — `TAKEN` (above) is the single statement of the skull inversion; the outcome
          // axis is read once, here, and handed down rather than re-derived in `src/hunt/`.
          !isTaken(outcome),
        )
  let accrual = buffOutcome?.accrual ?? null

  if (trickHit || timebombResets) {
    // A1 — the win above has already banked, so a won-but-primed trick cashes the LARGER figure.
    //
    // DLR-94 AC4 — but a hit the player did not CHOOSE pays only the configured fraction of it.
    // That reduction is the whole cost that makes Apply Damage (`voluntaryCashOut.ts`) a decision:
    // cash the streak yourself for its full worth, or push it and be paid a share when caught.
    //
    // TIMEBOMB REACHES THIS BRANCH TOO, and deliberately (`plan.md` → Assumptions). D3's Timebomb hit
    // is the case the-hunt.md calls "the moment you cannot choose" — precisely what the reduction
    // is charging for. Paying Timebomb in full would make being primed the CHEAPEST way to lose a
    // streak, which inverts the item this rule sits beside.
    //
    // DLR-122 AC5 — gold spares the FORCED cash-out. This is the poisoned-clean-loss exception's
    // own shape (`the-hunt.md` §7) reached by a different trigger, not a second implementation of
    // it: `replaced` above already skips the hit for the same reason, and this skips the cash-out
    // one branch below it. The DAMAGE is untouched either way — it was booked into
    // `damageToPlayer` above and no Swan rung insures against it.
    //
    // "THE FORCED cash-out", precisely, and NOT every cash-out — the end-of-hand fold below still
    // fires on the surviving bank, and that is the rule working rather than leaking past it. On
    // the sixth trick a gold Swan therefore pays the Quarry MORE, not less: a bank of 3 at a
    // multiplier of 3 pays `forcedCashValue(3, 3)` = 6 when it is caught, and the spared streak
    // reaches the final fold intact to pay `cashValue(3, 3)` = 9 in full. `cashOut` is damage
    // dealt TO THE QUARRY (see `incomingFrom`), so the larger figure is the upgrade behaving as
    // its own sentence says — the two-thirds reduction is the cost of being caught, and a gold
    // Swan is exactly the purchase that says you were not. Pinned by the `finalTrick` cases in
    // `rankTiers.resolution.test.ts`; raised by DLR-122's defender review and left as the reading
    // the developer confirms.
    if (!swanKeepsBank) {
      // R3 steps 2-4: Momentum joins the multiplier INSIDE the product, Blade is added to what
      // the product (and §7's two-thirds reduction) produced. `spend`/`markCashOutPaid` is what
      // makes R6's cap a per-HAND bound: each pool pays once, not once per cash-out.
      const spend = accrual === null ? NO_CASH_OUT_BONUS : payableCashOutBonus(accrual)
      cashOut = forcedCashValue(bank, multiplier + spend.multiplierBonus) + spend.flatDamageBonus
      if (accrual !== null) accrual = markCashOutPaid(accrual, spend)
      bank = 0
      // DLR-122 AC4 — silver spares the RATE, not the POT: the bank above still cashes at the
      // configured fraction and still resets to zero, and only the streak survives.
      if (!swanKeepsMultiplier) {
        multiplier = 0
      }
    }
  }

  // AC5 — UNCHANGED, and deliberately so: the end-of-hand cash pays IN FULL. The reduction above
  // is specifically the "you got caught before you chose to apply" cost, and the sixth trick
  // simply arriving is not being caught.
  const endSpend = accrual === null ? NO_CASH_OUT_BONUS : payableCashOutBonus(accrual)
  const handEndCash = trick.finalTrick
    ? cashValue(bank, multiplier + endSpend.multiplierBonus) + endSpend.flatDamageBonus
    : 0
  if (trick.finalTrick && accrual !== null) accrual = markCashOutPaid(accrual, endSpend)
  if (trick.finalTrick) {
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
    // The PHYSICAL winner of a marked trick, crossed to `DuelSide` here and only here.
    timebombTarget: trick.timebombTrick
      ? trick.playerWon
        ? DuelSide.Player
        : DuelSide.Quarry
      : null,
    timebombToQuarry: trick.timebombToQuarry,
    blastGuardSpent: trick.timebombToPlayer > 0 && trick.blastGuarded,
    buffAccrual: accrual,
    firedBuffIds: buffOutcome?.firedIds ?? [],
  }
}

/**
 * THE one `PlayerSide` -> `DuelSide` crossing. Keyed by the side the damage is APPLIED TO: the
 * player eats `damageToPlayer`, the Quarry eats its cash-out PLUS any Timebomb paid at this trick.
 * Summing here rather than at the call site keeps that the only crossing — a caller assembling
 * this record by hand is one transposition from depleting the wrong bar forever.
 */
export function incomingFrom(resolution: TrickResolution): IncomingDamage {
  return {
    [DuelSide.Player]: resolution.damageToPlayer,
    [DuelSide.Quarry]: resolution.cashOut + resolution.timebombToQuarry,
  }
}
