import {
  advanceTricksWithoutHit,
  BASE_DAMAGE,
  curseBonusOf,
  DAMAGE_PER_HIT,
  DuelSide,
  EMPTY_CURSE_BONUS,
  QUARRY_TREASURE_DAMAGE,
  resolveTrickBuffs,
  streakProtectionFor,
  trickBonusFor,
  type Buff,
  type BuffBonusAccrual,
  type BuffId,
  type BuffTrickInput,
  type IncomingDamage,
} from '../hunt'

/** §3.2's four rows. Renamed by DLR-165 onto the two-axis scheme: the first word is the
 *  MECHANICAL act (High = the player took the cards), the second is the OUTCOME (Victory = banks,
 *  Defeat = hurts). Named rather than a pair of booleans at every branch, so the rule reads out of
 *  the code the way it reads out of the design's table. */
export const TrickOutcome = {
  HighVictory: 'highVictory', // was CleanWin  — AC4, took a clean trick
  LowVictory: 'lowVictory', // was Dodge     — AC5, did not take a skulled trick
  LowDefeat: 'lowDefeat', // was CleanLoss — AC6, did not take a clean trick
  HighDefeat: 'highDefeat', // was SkullWin  — AC7, took a skulled trick
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
  /** 0, `DAMAGE_PER_HIT`, or `QUARRY_TREASURE_DAMAGE` on a hurt trick that carried a Treasure
   *  (DLR-163 AC10). */
  readonly damageToPlayer: number
  /** DLR-163 AC8 — this trick BANKED and carried a Treasure, so the fight's base-damage figure
   *  owes `TREASURE_BASE_DAMAGE_STEP`. Reported OUT rather than applied here: the figure is run
   *  state and this module has never been allowed to see one. */
  readonly treasureBonusEarned: boolean
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
  /** DLR-165 — the MECHANICAL axis: the player physically took the cards, before the skull
   *  inverts what that is worth. */
  readonly playerWentHigh: boolean
  /** Any card played into the trick carries a skull (§3.2). */
  readonly skullTrick: boolean
  /** The last trick of the hand, so AC8's end-of-hand cash applies. */
  readonly finalTrick: boolean
  /** DLR-92 AC4 — extra bank added by a TAKEN trick, on top of the trick's own 1. A plain number
   *  handed in, never a run figure read: this module must not learn what bought it, which is why
   *  it is not called a Whetstone count. 0 is the bare rule. The MULTIPLIER is unaffected (AC5). */
  readonly baseDamageBonus: number
  /** DLR-122 AC4 — the player's Swan ladder stands at silver or better AND the player played a
   *  Swan into this trick. A plain FACT handed in, never a run figure read, exactly as
   *  `baseDamageBonus` above: this module must not learn who holds which card.
   *  `rankTierRules.ts`'s `swanTierFactsFor` is the single producer, and AC3's player-only gate
   *  lives there. Only ever consulted on a LOW DEFEAT — see `resolveTrickBank`. */
  readonly swanKeepsMultiplier: boolean
  /** DLR-122 AC5 — as above, at gold. Gold IMPLIES silver, and `resolveTrickBank` folds that
   *  implication in itself rather than trusting the caller, so a hand-built fact object cannot
   *  produce the nonsense state "the total survives but the streak that valued it does not". */
  readonly swanKeepsBank: boolean
  /** DLR-125 — the buffs activated for this trick plus the hand facts their conditions read.
   *  REQUIRED and `| null`, not optional: optional would let a call site skip buffs silently,
   *  and this shape has five construction sites the compiler should enumerate. A plain value
   *  handed in, never a run figure read — exactly `baseDamageBonus`'s
   *  contract. */
  readonly buffs: BuffTrickInput | null
  /** DLR-163 AC8/AC10 — a Treasure was played into this trick, by EITHER side. A plain FACT
   *  handed in, exactly as `baseDamageBonus` and `swanKeepsBank` are: this module must not
   *  learn whose card it was, and AC8/AC10 do not depend on it. REQUIRED, not optional, so the
   *  compiler enumerates every construction site. */
  readonly treasureTrick: boolean
}

/** §3.2's table as a total function. The skull inverts the trick: on a clean trick you want to go
 *  high, on a skull trick you want to go low. */
export function trickOutcomeFor(playerWentHigh: boolean, skullTrick: boolean): TrickOutcome {
  if (playerWentHigh) {
    return skullTrick ? TrickOutcome.HighDefeat : TrickOutcome.HighVictory
  }
  return skullTrick ? TrickOutcome.LowVictory : TrickOutcome.LowDefeat
}

/** Whether the outcome BANKS. The two Victories do, the two Defeats do not — which is now what
 *  the names themselves say. */
const TAKEN: Readonly<Record<TrickOutcome, boolean>> = {
  [TrickOutcome.HighVictory]: true,
  [TrickOutcome.LowVictory]: true,
  [TrickOutcome.LowDefeat]: false,
  [TrickOutcome.HighDefeat]: false,
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
 * DLR-156 AC1/AC7 — one trick's whole effect on the streak and both health bars.
 *
 * A BANKED trick (`isTaken(outcome)`) computes its own damage as `(base + buffDamage) x buffMult`
 * from the buffs fired ON THIS TRICK ONLY (AC11), adds it to `total`, and climbs `roll` by one. A
 * HURT trick pays the Quarry nothing and wipes both to zero — there is no two-thirds consolation
 * (AC7), UNLESS a fired Skull Helmet or Skull Tether saves one of the two figures (DLR-161, see
 * below). Neither branch cashes anything: `cashOut` is always 0 now, and the only place the pot
 * can be paid is the apply choice, through `applyPot` in `pot.ts` (AC3/AC5).
 *
 * The end-of-hand fold is GONE (AC8): `total` and `roll` cross a hand boundary untouched, and
 * `finalTrick` no longer folds a cash-out in — Unbloodied still reads it as a hand-scoped
 * condition, and `HAND_SIZE` still ends the hand elsewhere.
 *
 * DLR-161 — Skull Helmet spares `total` and Skull Tether spares `roll` through a hurt trick,
 * exactly as the Swan ladder already spares both at gold; a card's own gold rung then adds one to
 * whichever figure it saved. Neither card ever spares the health: `damageToPlayer` is computed
 * above the reset block and this rule never reaches it (AC7).
 *
 * Pure arithmetic — there is no division anywhere here, so no epsilon is needed and no `NaN` is
 * producible from the inputs this takes.
 */
export function resolveTrickBank(before: StreakState, trick: TrickFacts): TrickResolution {
  const outcome = trickOutcomeFor(trick.playerWentHigh, trick.skullTrick)
  const taken = isTaken(outcome)

  let total = before.total
  let roll = before.roll
  let trickDamage: TrickDamage | null = null

  // A hit is a trick that hurt — a Low Defeat or a High Defeat.
  const trickHit = !taken

  // DLR-122 AC4/AC5 — the Swan ladder, gated on LOW DEFEAT here rather than at the call site.
  // "Not an eaten skull" is a rule about OUTCOMES, and outcomes are this module's subject; a
  // caller-side gate would put half of AC4 in `playCard.ts`, where no bank spec would ever see
  // it. A Low Victory and a High Victory have no hit to spare and a High Defeat is the eaten skull
  // AC4 excludes by name, so `LowDefeat` is the whole of it. Keyed on the OUTCOME rather than on
  // the player going low, deliberately — a Low Victory is also a trick the player did not take.
  const swanLowDefeat = outcome === TrickOutcome.LowDefeat
  const swanKeepsBank = swanLowDefeat && trick.swanKeepsBank
  // Gold implies silver, folded in HERE rather than trusted from the caller.
  const swanKeepsMultiplier = swanLowDefeat && (trick.swanKeepsMultiplier || trick.swanKeepsBank)

  // DLR-163 AC10 — a Treasure REPLACES the flat hit rather than adding to it. This is the line
  // that retires the-hunt.md §8's "damage to the player, per event: 1, every time" — every
  // readout, projection and simulator figure that assumed exactly 1 has to stop assuming it.
  const hitDamage = trick.treasureTrick ? QUARRY_TREASURE_DAMAGE : DAMAGE_PER_HIT
  const damageToPlayer = trickHit ? hitDamage : 0

  // DLR-156 Assumption 10 — Hoarder is a cut, unconstructible family (CLAUDE.md — "Cut buffs are
  // cut until a ticket brings them back"), so this value is inert. Fed the ROLL after the trick
  // rather than the total: this trick's own damage now depends on which buffs FIRED
  // (`trickBonusFor` below needs `buffOutcome.firedIds` first), so the climbed total is not known
  // at this point without a circular read. The field keeps its name — a restoration ticket sees
  // the note here, not a silent behaviour change.
  const rollAfterTrick = taken ? roll + 1 : roll

  // DLR-124 R3/R4 — condition evaluation, unchanged in shape: DLR-156 moves the DAMAGE axes
  // (Blade/Momentum) off this accrual and onto `trickBonusFor` below, but coins, the AP refund
  // and the low carry still run through here exactly as before. Cited, never restated:
  // hybrid-design.md §5.
  const buffOutcome =
    trick.buffs === null
      ? null
      : resolveTrickBuffs(
          trick.buffs,
          {
            playerWentHigh: trick.playerWentHigh,
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

  // DLR-161 — derived HERE, from the buffs this trick actually fired, rather than handed in on
  // `TrickFacts` the way the Swan's two booleans are. The Swan comes from a run permanent the
  // caller genuinely knows about; this depends on condition evaluation that happens inside this
  // function, so passing it in would force the caller to evaluate the conditions a second time —
  // the second copy of the rules `buffProjection.ts`'s docblock exists to prevent.
  const protection = streakProtectionFor(fired)

  if (taken) {
    // AC1/AC11 — the trick's OWN damage. `bd` and `bm` come from the buffs fired on THIS trick
    // and nothing else. The Overlap Bonus joins `bm` here, and is carried out separately on
    // `TrickDamage` so the resolution screen can beat it alone (AC16).
    const bonus = trick.buffs === null ? EMPTY_TRICK_BONUS : trickBonusFor(fired, false)
    // DLR-167 AC6 — DERIVED here from the buffs riding this trick, for the reason the
    // `streakProtectionFor` note above gives: they are already in scope, and handing this in on
    // `TrickFacts` would make the caller evaluate the same set a second time.
    // Reads `trick.buffs.active`, NOT `fired`: a Curse is `BuffCadence.Activated`, so it is
    // excluded from the fired set by design and its payoff is owed for the trick it was ACTIVATED
    // for. Only a BANKED trick reaches this branch at all, which is what makes AC6's reward
    // self-gating with no "only on a Low Victory" condition written anywhere.
    //
    // OPEN QUESTION for the developer (DLR-167 review, 2026-09-04) — the reward is owed on ANY
    // banked trick, not only on one the cursed card was played into. So marking a card and then
    // never playing it earns the bonus with none of the risk the card is priced for. Whether that
    // is the intended reading is a RULE decision, not a defect anyone here may settle; the
    // behaviour is deliberately left exactly as it stands until a ticket decides it.
    const curse = trick.buffs === null ? EMPTY_CURSE_BONUS : curseBonusOf(trick.buffs.active)
    const base = BASE_DAMAGE + safeBonus(trick.baseDamageBonus) + safeBonus(curse.damage)
    const buffMult = 1 + bonus.multiplierBonus + bonus.overlapBonus + safeBonus(curse.multiplier)
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

  if (trickHit) {
    // AC7 — a hit pays the Quarry NOTHING. There is no reduced share any more: the whole streak
    // is lost, full stop. That is the change that makes the roll-over choice a real bet.
    //
    // DLR-122 AC5 — gold spares the streak from this reset entirely. This is the
    // poisoned-Low-Defeat exception's own shape (`the-hunt.md` §7) reached by a different
    // trigger, not a second implementation of it. The DAMAGE is untouched — it was booked into
    // `damageToPlayer` above and no Swan rung insures against it.
    // DLR-166 fix pass — this used to cite a `replaced` local as the sibling case that skips the
    // hit for the same reason. That variable went with the prime it named; nothing else here
    // changed.
    // DLR-161 — the nested Swan guard becomes two INDEPENDENT guards. The old nesting encoded
    // "gold implies silver" as structure, and structure cannot express "the roll survives but the
    // total does not" — which is exactly Skull Tether. Behaviour-identical for all four Swan
    // cases (DLR-122 AC4: silver spares the roll only; AC5: gold spares both), and a regression
    // spec pins each of them.
    const keepsTotal = swanKeepsBank || protection.keepsTotal
    const keepsRoll = swanKeepsBank || swanKeepsMultiplier || protection.keepsRoll

    if (!keepsTotal) {
      total = 0
    } else if (protection.keepsTotal) {
      // AC6 — the gold bonus is added only where the PROTECTION saved the figure. A Swan that
      // already spared it does not also pay the card's +1: one save, one bonus.
      total += protection.totalBonus
    }

    if (!keepsRoll) {
      roll = 0
    } else if (protection.keepsRoll) {
      roll += protection.rollBonus
    }
  }

  return {
    outcome,
    trickDamage,
    cashOut: 0,
    damageToPlayer,
    // DLR-163 AC8 — reported OUT, never applied here. The fight's base-damage figure is RUN state
    // and this module has never been allowed to see one — the same contract `baseDamageBonus`
    // states from the other direction. `taken` is the OUTCOME axis, which is exactly AC9's
    // "Victory means the outcome axis, not the mechanical one": a Low Victory earns it and a High
    // Defeat does not.
    treasureBonusEarned: trick.treasureTrick && taken,
    total,
    roll,
    buffAccrual: accrual,
    firedBuffIds: buffOutcome?.firedIds ?? [],
  }
}

/**
 * THE one `PlayerSide` -> `DuelSide` crossing. Keyed by the side the damage is APPLIED TO: the
 * player eats `damageToPlayer`, the Quarry eats its cash-out (always 0 from a resolution now).
 * Crossing here rather than at the call site keeps that the
 * only crossing — a caller assembling this record by hand is one transposition from depleting the
 * wrong bar forever.
 */
export function incomingFrom(resolution: TrickResolution): IncomingDamage {
  return {
    [DuelSide.Player]: resolution.damageToPlayer,
    [DuelSide.Quarry]: resolution.cashOut,
  }
}
