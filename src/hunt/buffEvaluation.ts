import { resolveFiredBuffs, type BuffBonusAccrual } from './buffAccrual'
import { isConditionFamily } from './buffCosts'
import {
  BUFF_CADENCE,
  BuffCadence,
  buffTargetRankOf,
  buffTargetSuitOf,
  type Buff,
  type BuffId,
  type BuffTargetSuit,
} from './buffs'
import { conditionThresholdOf } from './buffTemplates'
import { PLAYER_START_HEALTH } from './config'

/**
 * DLR-125 — the pure condition evaluator for the eleven shipping condition families, plus
 * DLR-124 R4's firing cadence. Cites, never restates:
 * `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` §5 → *Resolving several buffs on
 * one trick — the stacking rule* (R1–R7), and `.docs/design/Balatro-Forbidden-Solitaire/
 * v1-buff-card-list.md` → *Condition templates* / *Firing cadence*.
 *
 * Long Fall (v1 list row #8) is deferred by DLR-111 for want of a UI answer; no template is
 * generated for it (`buffTemplates.ts`) and nothing here evaluates it.
 */

/** Everything a condition reads, as PLAIN VALUES — never a RoundState, an EncounterState or a
 *  TrickCard. The per-trick half is derived by warCouncil/buffTrickFacts.ts; the hand-scoped half
 *  comes from app/warCouncil/buffRoundState.ts. */
export interface BuffTrickContext {
  /** The player won the trick physically (before the skull inverts what that is worth). */
  readonly playerWon: boolean
  /** Any card in the trick carries a skull. */
  readonly skullTrick: boolean
  /** This trick cost the player health — Unbloodied's counter and nothing else reads it. */
  readonly playerHit: boolean
  /** The last trick of the hand — Keepsake's only instant. */
  readonly finalTrick: boolean
  /** Suits the PLAYER played into this trick. */
  readonly playerSuits: readonly BuffTargetSuit[]
  /** Ranks the PLAYER played into this trick. */
  readonly playerRanks: readonly number[]
  /** Suits still in the player's hand AFTER this trick's card left it — Keepsake. */
  readonly remainingSuits: readonly BuffTargetSuit[]
  /** The bank after this trick's climb — Hoarder. UNIT: tricks. */
  readonly bankAfterTrick: number
  /** Consecutive tricks ending with no damage to the player, INCLUDING this one — Unbloodied. */
  readonly tricksWithoutHit: number
  /** The run's purse — Miser. UNIT: coins. */
  readonly coins: number
  /** The player's red hearts — Cornered. UNIT: health. */
  readonly playerHealth: number
  /** DLR-109 — Apply Damage has been PRESSED this hand. Debt Collector. The press, not the landing. */
  readonly applyDamagePressed: boolean
}

/** ONE buff's condition against ONE trick. A total `switch` over `BuffConditionKind`, so a
 *  twelfth family added to `buffCosts.ts` fails to compile HERE rather than silently never
 *  firing. Every Activated kind and `BuffKind.Unassigned` return `false` through the guard
 *  above the switch — a card that did not fire, which R7 calls a legitimate player mistake, not
 *  an error. NEVER THROWS: a root `ErrorBoundary` now exists (DLR-131), but it catches a
 *  render-phase throw and replaces the whole app with a fallback — it is a net, not a licence
 *  for this function to throw, and this runs inside a reducer dispatch. */
export function buffFires(buff: Buff, ctx: BuffTrickContext): boolean {
  if (!isConditionFamily(buff.kind)) return false
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const threshold = conditionThresholdOf(buff)
  switch (buff.kind) {
    case 'taker':
      return ctx.playerWon && suit !== null && ctx.playerSuits.includes(suit)
    case 'feeder':
      return !ctx.playerWon && suit !== null && ctx.playerSuits.includes(suit)
    case 'markOfRank':
      return ctx.playerWon && rank !== null && ctx.playerRanks.includes(rank)
    // "Dodge a skull with this card" — the trick this buff was activated FOR is a Dodge.
    case 'sidestep':
      return ctx.skullTrick && !ctx.playerWon
    // "Eat a skull with this card" — the same trick is a Skull Win.
    case 'glutton':
      return ctx.skullTrick && ctx.playerWon
    case 'hoarder':
      return threshold !== null && ctx.bankAfterTrick >= threshold
    case 'unbloodied':
      return threshold !== null && ctx.tricksWithoutHit >= threshold
    // DLR-109's reading, enforced: Apply Damage means THE PRESS, not the landing.
    case 'debtCollector':
      return ctx.applyDamagePressed
    case 'keepsake':
      return ctx.finalTrick && suit !== null && ctx.remainingSuits.includes(suit)
    case 'miser':
      return threshold !== null && ctx.coins >= threshold
    // Integer both sides — no division, so no NaN can reach a rendered heart row.
    case 'cornered':
      return threshold !== null && ctx.playerHealth * 100 < threshold * PLAYER_START_HEALTH
  }
}

/** R4 — `Event` fires every time, `Threshold` and `Terminal` once per hand. Order follows
 *  `active`, because the pile's order is the player's mental order. */
export function firesOncePerHand(buff: Buff): boolean {
  const cadence = BUFF_CADENCE[buff.kind]
  return cadence === BuffCadence.Threshold || cadence === BuffCadence.Terminal
}

/** The buffs that fire on this trick, with DLR-124 R4's cadence applied: Event every time,
 *  Threshold once per hand (filtered against `firedThisHand`), Terminal only when
 *  `ctx.finalTrick`, Activated never. Order follows `active`. */
export function firedBuffs(
  active: readonly Buff[],
  firedThisHand: readonly BuffId[],
  ctx: BuffTrickContext,
): readonly Buff[] {
  return active.filter(
    (buff) =>
      BUFF_CADENCE[buff.kind] !== BuffCadence.Activated &&
      !(firesOncePerHand(buff) && firedThisHand.includes(buff.id)) &&
      buffFires(buff, ctx),
  )
}

/** `BuffTrickContext` minus the eight fields the trick and `resolveTrickBank`'s own locals
 *  supply. Declared HERE, beside the context it is a subset of, so the two cannot drift. */
export type BuffHandContext = Pick<
  BuffTrickContext,
  | 'playerSuits'
  | 'playerRanks'
  | 'remainingSuits'
  | 'tricksWithoutHit'
  | 'coins'
  | 'playerHealth'
  | 'applyDamagePressed'
>

/** The hand-scoped half of buff evaluation, handed to `resolveTrickBank` as PLAIN VALUES exactly
 *  as `baseDamageBonus` and `blastGuarded` are. Declared in `src/hunt/` because `hunt` owns what a
 *  buff is; `streak.ts` imports it rather than restating it. */
export interface BuffTrickInput {
  /** The buffs activated for THIS trick — already filtered through `activatableBuffs`. */
  readonly active: readonly Buff[]
  /** The hand's running accrual, before this trick. */
  readonly accrual: BuffBonusAccrual
  /** Ids of once-per-hand families that have already fired this hand. */
  readonly firedThisHand: readonly BuffId[]
  readonly hand: BuffHandContext
}

/** Unbloodied's condition counter, advanced. THE one statement of it, called by
 *  `resolveTrickBank` (which needs the value INCLUDING this trick) and by `foldBuffOutcome`
 *  (which stores it for the next one), so the two can never disagree. This is a CONDITION
 *  counter, not a cap — it is the one thing here that legitimately zeroes on a hit, and it lives
 *  deliberately far from `buffAccrual.ts`, whose counters never do (R6). */
export function advanceTricksWithoutHit(current: number, playerHit: boolean): number {
  return playerHit ? 0 : current + 1
}

export interface BuffTrickOutcome {
  readonly accrual: BuffBonusAccrual
  readonly firedIds: readonly BuffId[]
}

/** R4's cadence and R1/R2/R5/R6 in one call, so `bank.ts` states R3's ORDER and nothing else.
 *  `trickIsLoss` is the OUTCOME axis and is passed straight through to `resolveFiredBuffs` — it
 *  arrives from `bank.ts`'s `!isTaken(outcome)` because `src/hunt/` deliberately does not hold a
 *  second statement of the skull inversion. */
export function resolveTrickBuffs(
  input: BuffTrickInput,
  ctx: BuffTrickContext,
  trickIsLoss: boolean,
): BuffTrickOutcome {
  const fired = firedBuffs(input.active, input.firedThisHand, ctx)
  return {
    accrual: resolveFiredBuffs(input.accrual, fired, trickIsLoss),
    firedIds: fired.map((buff) => buff.id),
  }
}
