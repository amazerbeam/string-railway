import {
  advanceTricksWithoutHit,
  BASE_DAMAGE,
  DAMAGE_PER_HIT,
  DuelSide,
  resolveTrickBuffs,
  trickBonusFor,
  type Buff,
  type BuffBonusAccrual,
  type BuffId,
  type BuffTrickInput,
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

/** The two running figures a STREAK carries. Replaces DLR-80's `BankState`: the pair no longer
 *  counts tricks twice — `total` accumulates DAMAGE and `roll` counts the tricks it is
 *  multiplied by. Crosses hand boundaries (AC8); wiped only at a fight boundary (AC9). */
export interface StreakState {
  readonly total: number
  readonly roll: number
}

export const EMPTY_STREAK: StreakState = { total: 0, roll: 0 }

/** DLR-156 AC1's per-trick figure, broken into the terms the resolution screen narrates. */
export interface TrickDamage {
  /** BASE_DAMAGE + TrickFacts.baseDamageBonus. */
  readonly base: number
  /** Flat damage from the Blade cards fired ON THIS TRICK (AC11). */
  readonly buffDamage: number
  /** 1 + the Momentum points fired ON THIS TRICK + the Overlap Bonus (AC11, AC16). */
  readonly buffMult: number
  /** `overlapBonusFor(firedCount)` — carried separately so it gets its own beat (AC16). */
  readonly overlapBonus: number
  /** (base + buffDamage) * buffMult. */
  readonly dealt: number
}

export interface TrickResolution extends StreakState {
  readonly outcome: TrickOutcome
  /** DLR-156 AC1 — this trick's own damage and its terms. `null` on a hurt trick, which
   *  computes none. */
  readonly trickDamage: TrickDamage | null
  /** DLR-156 AC5/AC7 — damage dealt to the Quarry by THIS trick. Now always 0: only the apply
   *  choice pays, and it pays through `applyPot`, not through a resolution. */
  readonly cashOut: number
  /** 0 or `DAMAGE_PER_HIT`. */
  readonly damageToPlayer: number
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
 * The eight facts about a completed trick that decide its whole effect on the streak and both
 * bars.
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
   *  Never touches the total: the Quarry has no streak to lose. */
  readonly timebombToQuarry: Damage
  /** DLR-91 AC4 — a Blast Guard is held, so Timebomb must NOT force the cash-out. Gates the Timebomb
   *  trigger only, never the trick's own hit: a 1-coin item does not insure against every loss. */
  readonly blastGuarded: boolean
  /** DLR-92 AC4 — extra bank added by a TAKEN trick, on top of the trick's own 1. A plain number
   *  handed in, never a run figure read: this module must not learn what bought it, which is why
   *  it is not called a Whetstone count. 0 is the bare rule. The MULTIPLIER is unaffected (AC5). */
  readonly baseDamageBonus: number
  /** DLR-122 AC4 — the player's Swan ladder stands at silver or better AND the player played a
   *  Swan into this trick. A plain FACT handed in, never a run figure read, exactly as
   *  `blastGuarded` and `baseDamageBonus` above: this module must not learn who holds which card.
   *  `rankTierRules.ts`'s `swanTierFactsFor` is the single producer, and AC3's player-only gate
   *  lives there. Only ever consulted on a CLEAN LOSS — see `resolveTrickBank`. */
  readonly swanKeepsMultiplier: boolean
  /** DLR-122 AC5 — as above, at gold. Gold IMPLIES silver, and `resolveTrickBank` folds that
   *  implication in itself rather than trusting the caller, so a hand-built fact object cannot
   *  produce the nonsense state "the total survives but the streak that valued it does not". */
  readonly swanKeepsBank: boolean
  /** DLR-125 — the buffs activated for this trick plus the hand facts their conditions read.
   *  REQUIRED and `| null`, not optional: optional would let a call site skip buffs silently,
   *  and this shape has five construction sites the compiler should enumerate. A plain value
   *  handed in, never a run figure read — exactly `baseDamageBonus`'s and `blastGuarded`'s
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

/** DLR-156 — the trick contributes nothing to its own damage: `trick.buffs === null`, or no
 *  buff fired. A `const`, not mutable state. */
const EMPTY_TRICK_BONUS = { flatDamageBonus: 0, multiplierBonus: 0, overlapBonus: 0 } as const

/** DLR-156 — `bankAdded`'s guard, kept verbatim and given a name: floors a non-integer or
 *  non-positive bonus to 0 rather than propagating it. Applies to `TrickFacts.baseDamageBonus`
 *  wherever it feeds the base — this figure feeds damage, then a rendered heart row, so a NaN or
 *  a fraction would vanish into a health bar with nothing logged
 *  (`web-project.md` → "NaN propagates silently"). */
function safeBonus(bonus: number): number {
  return Number.isInteger(bonus) && bonus > 0 ? bonus : 0
}

/**
 * The figure a total of `total` at a roll of `roll` is worth IN FULL — the plain
 * product. THE one statement of it: `applyPot` is now the only cash-out this game has, so there
 * is only one caller left to disagree about what it is a share OF.
 *
 * Floors a non-integer, non-positive, NaN or infinite input to 0 rather than propagating it, for
 * the reason `safeBonus`'s own guard above states: this figure feeds damage, then a rendered heart
 * row, so a NaN would vanish into a health bar with nothing logged anywhere
 * (`web-project.md` → "NaN propagates silently"). Every real input is a non-negative integer, so
 * this is a guard rather than a live path.
 *
 * Renamed from `cashValue`. Guard and reasoning kept verbatim.
 */
export function potValue(total: number, roll: number): number {
  if (!Number.isInteger(total) || !Number.isInteger(roll) || total <= 0 || roll <= 0) {
    return 0
  }
  return total * roll
}

/**
 * DLR-156 AC1/AC7 — one trick's whole effect on the streak and both health bars.
 *
 * A BANKED trick (`isTaken(outcome)`) computes its own damage as `(base + buffDamage) x buffMult`
 * from the buffs fired ON THIS TRICK ONLY (AC11), adds it to `total`, and climbs `roll` by one. A
 * HURT trick pays the Quarry nothing and wipes both to zero — there is no two-thirds consolation
 * (AC7). Neither branch cashes anything: `cashOut` is always 0 now, and the only place the pot can
 * be paid is the apply choice, through `applyPot` below (AC3/AC5).
 *
 * The end-of-hand fold is GONE (AC8): `total` and `roll` cross a hand boundary untouched, and
 * `finalTrick` no longer folds a cash-out in — Unbloodied still reads it as a hand-scoped
 * condition, and `HAND_SIZE` still ends the hand elsewhere.
 *
 * Pure arithmetic — there is no division anywhere here, so no epsilon is needed and no `NaN` is
 * producible from the inputs this takes.
 */
export function resolveTrickBank(before: StreakState, trick: TrickFacts): TrickResolution {
  const outcome = trickOutcomeFor(trick.playerWon, trick.skullTrick)
  const taken = isTaken(outcome)

  let total = before.total
  let roll = before.roll
  let trickDamage: TrickDamage | null = null

  // AC5 — REPLACED, not added to. A marked trick the Quarry won CLEANLY costs the player nothing:
  // no health lost, and the total and roll survive uncashed even though this is a loss by the
  // normal rules. That is the item's whole point — it gives a card the player already expects to
  // lose with a reason to be played instead of being dead weight.
  //
  // Keyed on `CleanLoss` rather than on "the Quarry won" DELIBERATELY: a Dodge is also a trick the
  // Quarry won, and it is one the player BANKS, so treating every Quarry win as replaced would zero
  // a climb the player had already earned. `CleanLoss` is the only outcome where a Quarry win
  // costs the player anything, so it is the only one with something to replace.
  //
  // AC6 needs no counterpart and gets none: a marked trick the player wins is already a `CleanWin`
  // and falls through to the ordinary branch below, banking its own damage and climbing the roll.
  // The delayed hit is symmetric because `timebombTarget` follows the WINNER, not a mirrored rule.
  const replaced = trick.timebombTrick && outcome === TrickOutcome.CleanLoss

  // TWO sources of a hit since D1/D3. `trickHit` is the pre-existing one — a clean loss or a skull
  // win, unless DLR-90's AC5 replaced it. Timebomb is the new one, and it reaches the SAME branch
  // rather than getting a rule of its own: that is what makes "Timebomb behaves like any other
  // damage" true in code instead of asserted in a comment.
  const trickHit = !taken && !replaced

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

  // DLR-156 Assumption 10 — Hoarder is a cut, unconstructible family (CLAUDE.md — "Cut buffs are
  // cut until a ticket brings them back"), so this value is inert. Fed the ROLL after the trick
  // rather than the total: this trick's own damage now depends on which buffs FIRED
  // (`trickBonusFor` below needs `buffOutcome.firedIds` first), so the climbed total is not known
  // at this point without a circular read. The field keeps its name — a restoration ticket sees
  // the note here, not a silent behaviour change.
  const rollAfterTrick = taken ? roll + 1 : roll

  // DLR-124 R3/R4 — condition evaluation, unchanged in shape: DLR-156 moves the DAMAGE axes
  // (Blade/Momentum) off this accrual and onto `trickBonusFor` below, but coins, the AP refund
  // and the Feeder carry still run through here exactly as before. Cited, never restated:
  // hybrid-design.md §5.
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
            bankAfterTrick: rollAfterTrick,
            ...trick.buffs.hand,
            tricksWithoutHit: advanceTricksWithoutHit(
              trick.buffs.hand.tricksWithoutHit,
              damageToPlayer > 0,
            ),
          },
          // DLR-150 — `TAKEN` (above) is the single statement of the skull inversion; the outcome
          // axis is read once, here, and handed down rather than re-derived in `src/hunt/`.
          !taken,
        )
  const accrual = buffOutcome?.accrual ?? null
  const fired: readonly Buff[] =
    trick.buffs === null || buffOutcome === null
      ? []
      : trick.buffs.active.filter((buff) => buffOutcome.firedIds.includes(buff.id))

  if (taken) {
    // AC1/AC11 — the trick's OWN damage. `bd` and `bm` come from the buffs fired on THIS trick
    // and nothing else. The Overlap Bonus joins `bm` here, and is carried out separately on
    // `TrickDamage` so the resolution screen can beat it alone (AC16).
    const bonus = trick.buffs === null ? EMPTY_TRICK_BONUS : trickBonusFor(fired, false)
    const base = BASE_DAMAGE + safeBonus(trick.baseDamageBonus)
    const buffMult = 1 + bonus.multiplierBonus + bonus.overlapBonus
    trickDamage = {
      base,
      buffDamage: bonus.flatDamageBonus,
      buffMult,
      overlapBonus: bonus.overlapBonus,
      dealt: (base + bonus.flatDamageBonus) * buffMult,
    }
    total += trickDamage.dealt
    // AC5 — UNCHANGED, and deliberately so: the roll-side twin is a separate future item.
    roll += 1
  }

  if (trickHit || timebombResets) {
    // A1 — the win above has already banked, so a won-but-primed trick still loses THAT climb
    // too: the reset below wipes whatever `total` and `roll` stand at, including this trick's own
    // contribution.
    //
    // AC7 — a hit pays the Quarry NOTHING. There is no reduced share any more: the whole streak
    // is lost, full stop. That is the change that makes the roll-over choice a real bet.
    //
    // TIMEBOMB REACHES THIS BRANCH TOO, and deliberately (`plan.md` → Assumptions). D3's Timebomb
    // hit is the case the-hunt.md calls "the moment you cannot choose".
    //
    // DLR-122 AC5 — gold spares the streak from this reset entirely. This is the
    // poisoned-clean-loss exception's own shape (`the-hunt.md` §7) reached by a different
    // trigger, not a second implementation of it: `replaced` above already skips the hit for the
    // same reason, and this skips the reset one branch below it. The DAMAGE is untouched either
    // way — it was booked into `damageToPlayer` above and no Swan rung insures against it.
    if (!swanKeepsBank) {
      total = 0
      // DLR-122 AC4 — silver spares the ROLL, not the total: the total above still resets to
      // zero, and only the streak length survives.
      if (!swanKeepsMultiplier) {
        roll = 0
      }
    }
  }

  return {
    outcome,
    trickDamage,
    cashOut: 0,
    damageToPlayer,
    total,
    roll,
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
 * player eats `damageToPlayer`, the Quarry eats its cash-out (always 0 from a resolution now)
 * PLUS any Timebomb paid at this trick. Summing here rather than at the call site keeps that the
 * only crossing — a caller assembling this record by hand is one transposition from depleting the
 * wrong bar forever.
 */
export function incomingFrom(resolution: TrickResolution): IncomingDamage {
  return {
    [DuelSide.Player]: resolution.damageToPlayer,
    [DuelSide.Quarry]: resolution.cashOut + resolution.timebombToQuarry,
  }
}

/** DLR-156 AC5 — the apply choice: deals `potValue(total, roll)` to the Quarry and zeroes both.
 *  Cannot fail — a `StreakState` in, a dealt figure and `EMPTY_STREAK` out. Lifted from
 *  `voluntaryCashOut.ts`'s `cashBankNow`, and renamed to `applyPot`/`incomingFromPot` to match:
 *  there is no longer a second, forced cash-out for this to be a VOLUNTARY alternative to. */
export interface PotApplication {
  readonly streak: StreakState
  readonly dealt: number
}

export function applyPot(streak: StreakState): PotApplication {
  return {
    streak: EMPTY_STREAK,
    dealt: potValue(streak.total, streak.roll),
  }
}

/**
 * The `PlayerSide` -> `DuelSide` crossing for the apply choice, in one named place for the reason
 * `incomingFrom`'s docblock gives: a caller assembling this record by hand is one transposition
 * away from depleting the wrong bar forever.
 *
 * The player's entry is a hard 0 — AC5's "deals no damage to the player" is this line.
 */
export function incomingFromPot(dealt: number): IncomingDamage {
  return {
    [DuelSide.Player]: 0,
    [DuelSide.Quarry]: dealt,
  }
}
