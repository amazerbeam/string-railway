import {
  firedBuffs,
  resolveFiredBuffs,
  type Buff,
  type BuffBonusAccrual,
  type BuffId,
  type BuffTrickContext,
} from '../hunt'
import { isTaken, trickOutcomeFor, type TrickOutcome } from './streak'
import { targetSuitOf } from './buffTrickFacts'
import { sameCard } from './cardUtils'
import type { Card } from './types'

/**
 * DLR-152 — "if I play THIS card, what do my riding buffs pay — whether or not I take the
 * trick". A THIN ADAPTER, never a calculator: it builds a `BuffTrickContext` from plain values
 * and hands it to `firedBuffs` and `resolveFiredBuffs`, the same two functions the real trick
 * resolution calls. Cadence, the four per-hand caps, the Overlap Bonus and DLR-150's Feeder
 * carry are therefore INHERITED, not restated — which is the whole point. The DLR-147 mockup
 * re-derived the predicates in the view layer and reported +6 damage for a load whose ceiling
 * was +4; a preview built on a second copy of the rules drifts from the rules.
 *
 * It contains NO switch over `BuffConditionKind`. `buffFires` is deliberately total so a
 * twelfth family fails to compile there, and a parallel table here would silently never fire a
 * new family — the exact failure that switch exists to prevent.
 *
 * The buff-side sibling of `src/app/warCouncil/cardDamage.ts`, which does the same job for
 * damage, including its `exact` flag (here `skullKnown`).
 */

/** `BuffTrickContext` minus the five fields a candidate card and a branch decide. The caller
 *  supplies the rest as plain values — never a `RoundState`.
 *
 *  NOTE: `playerHit` and `bankAfterTrick` are held constant across both branches even though they
 *  genuinely differ in the real game (a `bankAfterTrick` after a win is not the same number as
 *  after a loss). This is currently inert only because Hoarder and Unbloodied are unconstructible
 *  — see `CLAUDE.md`'s cut-buffs section before restoring either family into this module. */
export type BuffProjectionFacts = Omit<
  BuffTrickContext,
  'playerWon' | 'skullTrick' | 'playerSuits' | 'playerRanks' | 'remainingSuits'
>

export interface BuffProjectionInput {
  /** The buffs activated for this trick — already filtered through `activatableBuffs`. */
  readonly active: readonly Buff[]
  /** Ids of once-per-hand families that have already fired this hand. */
  readonly firedThisHand: readonly BuffId[]
  /** The hand's running accrual, before this trick. */
  readonly accrual: BuffBonusAccrual
  readonly facts: BuffProjectionFacts
  /** `true`/`false` once the Quarry's card is on the table; `null` while the PLAYER LEADS and
   *  the Quarry's card is face down. `null` is NOT "no skull" — it is "not knowable", and the
   *  difference is the reason this module reports rather than guesses. */
  readonly skullTrick: boolean | null
  /** The player's hand INCLUDING the candidate card. `remainingSuits` is derived from it, the
   *  way `buffTrickFactsFor` derives it from `remainingHand`. */
  readonly hand: readonly Card[]
}

/** One still-possible resolution of a branch. */
export interface BuffBranchOutcome {
  readonly outcome: TrickOutcome
  /** The accrual AFTER this branch's fired buffs resolve. */
  readonly accrual: BuffBonusAccrual
}

export interface BuffBranchProjection {
  /** The MECHANICAL axis — the player physically took the cards, before the skull inverts what
   *  that is worth. This is the axis every buff condition reads. NOT `bank.ts`'s `isTaken`,
   *  which is the OUTCOME axis and counts a Dodge as taken. */
  readonly playerWon: boolean
  /** Buffs that fire on this branch under EVERY still-possible skull reading. */
  readonly fired: readonly Buff[]
  /** DLR-153 — buffs that fire on THIS branch under some still-possible skull reading but not
   *  all. Deduped by `BuffId`, and disjoint from `fired` by construction. The projection-level
   *  `indeterminate` remains the deduped UNION of both branches' sets and is unchanged; this is
   *  the same value `branchFor` already computed and previously discarded, kept so a consumer can
   *  count one branch's ceiling without re-deriving which family reads the skull. Empty whenever
   *  `skullKnown` is true. */
  readonly mayFire: readonly Buff[]
  /** One entry per still-possible `TrickOutcome`: exactly one when the skull is known, two while
   *  the player leads. Never empty. Two entries can differ in more than their label — a Feeder
   *  pays into THIS hand on a Dodge and into the carry on a Clean Loss (DLR-150). */
  readonly outcomes: readonly BuffBranchOutcome[]
}

export interface BuffProjection {
  readonly won: BuffBranchProjection
  readonly lost: BuffBranchProjection
  /** Buffs that fire under some still-possible skull reading but not all. Today that is only
   *  `sidestep`, and only on a lead — but this is DERIVED by diffing the fired sets across the
   *  readings, never by naming a family, so a future skull-reading family is handled here with
   *  no edit. The UI words these as "may fire" rather than printing a figure. */
  readonly indeterminate: readonly Buff[]
  /** `false` while the player leads. The buff-side twin of `CardDamagePreview.exact`. */
  readonly skullKnown: boolean
}

/** Both skull readings, for the lead case where neither can be ruled out. */
const BOTH_READINGS: readonly boolean[] = [false, true]

/**
 * Both branches for one candidate card. Pure: never mutates `input`, `candidate`, or anything
 * reachable from them, and reads no clock, no random source and no global.
 */
export function projectBuffBranches(input: BuffProjectionInput, candidate: Card): BuffProjection {
  const readings = input.skullTrick === null ? BOTH_READINGS : [input.skullTrick]
  const remainingSuits = input.hand
    .filter((card) => !sameCard(card, candidate))
    .map((card) => targetSuitOf(card.suit))

  const won = branchFor(input, candidate, remainingSuits, readings, true)
  const lost = branchFor(input, candidate, remainingSuits, readings, false)

  return {
    won: won.branch,
    lost: lost.branch,
    indeterminate: dedupeById([...won.indeterminate, ...lost.indeterminate]),
    skullKnown: input.skullTrick !== null,
  }
}

/** AC7 — how many of `legalCards` could fire `buff` this trick. "Could" includes "might": a card
 *  for which the buff lands in `indeterminate` still counts, because reporting 0 for a buff that
 *  may well pay reads as "this buff is dead" at exactly the moment the player is deciding
 *  whether to activate it. `legalCards` is the caller's `legalMoves(state, PlayerSide.Player,
 *  options)` output — an illegal card is not counted because it is not in the list, and this
 *  module takes plain values rather than a `RoundState` so it cannot compute legality itself. */
export function buffReach(
  input: BuffProjectionInput,
  legalCards: readonly Card[],
  buff: Buff,
): number {
  return legalCards.filter((card) => {
    const projection = projectBuffBranches(input, card)
    return (
      hasBuff(projection.won.fired, buff.id) ||
      hasBuff(projection.lost.fired, buff.id) ||
      hasBuff(projection.indeterminate, buff.id)
    )
  }).length
}

/** One branch, evaluated once per still-possible skull reading. A buff that fires under every
 *  reading is certain; one that fires under some but not all is lifted out to `indeterminate`,
 *  because the ruleset withholds the Quarry's card and printing a figure for it would either
 *  fabricate or leak information about that card. */
function branchFor(
  input: BuffProjectionInput,
  candidate: Card,
  remainingSuits: readonly ReturnType<typeof targetSuitOf>[],
  readings: readonly boolean[],
  playerWon: boolean,
): { readonly branch: BuffBranchProjection; readonly indeterminate: readonly Buff[] } {
  const perReading = readings.map((skullTrick) =>
    firedBuffs(
      input.active,
      input.firedThisHand,
      contextFor(input, candidate, remainingSuits, playerWon, skullTrick),
    ),
  )
  const certain = perReading[0].filter((buff) =>
    perReading.every((fired) => hasBuff(fired, buff.id)),
  )
  const indeterminate = perReading.flat().filter((buff) => !hasBuff(certain, buff.id))
  const deduped = dedupeById(indeterminate)

  return {
    branch: {
      playerWon,
      fired: certain,
      mayFire: deduped,
      outcomes: readings.map((skullTrick) => {
        const outcome = trickOutcomeFor(playerWon, skullTrick)
        return {
          outcome,
          // `bank.ts`'s `TAKEN` table is the SINGLE statement of the skull inversion; this reads
          // it rather than restating it, exactly as `resolveTrickBuffs` does.
          accrual: resolveFiredBuffs(input.accrual, certain, !isTaken(outcome)),
        }
      }),
    },
    indeterminate: deduped,
  }
}

/** The candidate card's context: the caller's facts with the five branch- and card-determined
 *  fields overridden. `playerSuits` and `playerRanks` are PLURAL — one candidate card means a
 *  single-element array, not a scalar. */
function contextFor(
  input: BuffProjectionInput,
  candidate: Card,
  remainingSuits: readonly ReturnType<typeof targetSuitOf>[],
  playerWon: boolean,
  skullTrick: boolean,
): BuffTrickContext {
  return {
    ...input.facts,
    playerWon,
    skullTrick,
    playerSuits: [targetSuitOf(candidate.suit)],
    playerRanks: [candidate.rank],
    remainingSuits,
  }
}

function hasBuff(buffs: readonly Buff[], id: BuffId): boolean {
  return buffs.some((buff) => buff.id === id)
}

/** Order follows first appearance, which follows `active` — the pile's order is the player's
 *  mental order, the same reason `firedBuffs` preserves it. */
function dedupeById(buffs: readonly Buff[]): readonly Buff[] {
  return buffs.filter((buff, i) => buffs.findIndex((b) => b.id === buff.id) === i)
}
