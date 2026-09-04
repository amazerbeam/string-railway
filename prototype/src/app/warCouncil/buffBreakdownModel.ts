/**
 * DLR-153 — one card's per-buff breakdown: two branch totals with neither emphasised, the Overlap
 * Bonus as its own row, condition rows naming their buff, and struck-through "cannot fire here"
 * rows. Reads the `CardBuffLight.projection` `lightsForHand` already built — it NEVER calls
 * `projectBuffBranches` a second time. Damage and multiplier deltas are `outcome.accrual` MINUS
 * `state.buffHand.accrual`, the subtraction `BuffProjection`'s own doc explicitly leaves to the
 * consumer; nothing else is computed. No `switch` over `BuffConditionKind` anywhere here.
 */
import type { Buff, BuffBonusAccrual } from '../../hunt'
import {
  sameCard,
  type BuffBranchOutcome,
  type BuffBranchProjection,
  type Card,
} from '../../warCouncil'
import { activatedBuffs, projectionHasBuff, reachOf, type CardBuffLight } from './buffRideModel'
import { buffConditionSentence, buffName, buffPayoff } from './buffLabels'
import {
  buffBadgeText,
  BRANCH_HEADING,
  deadRowElsewhereText,
  deadRowReasonText,
} from './buffRideLabels'
import { cardAccessibleName, cardKey } from './labels'
import type { RoundUiState } from './roundUiState'

/** Which branch a group of rows belongs to. Named on the MECHANICAL axis, because that is the axis
 *  every buff condition reads (`CLAUDE.md` → "Win and lose mean two different things"). */
export const BreakdownBranch = { Took: 'took', DidNotTake: 'didNotTake' } as const
export type BreakdownBranch = (typeof BreakdownBranch)[keyof typeof BreakdownBranch]

/** One condition row. `mayFire` renders the "may fire" wording rather than a figure — the ruleset
 *  withholds the Quarry's card, so printing a certain figure here would fabricate or leak. */
export interface BreakdownConditionRow {
  readonly buff: Buff
  readonly conditionText: string
  readonly buffNameText: string
  readonly payoffText: string
  readonly mayFire: boolean
}

/** A buff that cannot fire on THIS card, struck through (AC12). `elsewhereText` carries the second
 *  clause — "It is lighting your 2 Bells cards instead." — or the zero-reach sentence when the
 *  buff reaches nothing at all, so the row never reads as "wasted". */
export interface BreakdownDeadRow {
  readonly buff: Buff
  readonly reasonText: string
  readonly elsewhereText: string
}

/** The totals for one branch. NEITHER branch is emphasised anywhere in the view (AC11); this type
 *  carries no "preferred" flag for that reason. `carryText` is non-null only when this branch's
 *  outcome diverts a Suit Low card into the next hand's carry (DLR-150), read off
 *  `BuffBranchOutcome.accrual`, never recomputed. */
export interface BreakdownTotals {
  readonly branch: BreakdownBranch
  readonly damage: number
  readonly multiplier: number
  readonly carryText: string | null
  /** DLR-153 Fix 3 — true when the trick's skull status is not yet knowable (a lead with an
   *  unskulled candidate, `branchProjection.outcomes.length === 2`) and this row's figures
   *  therefore assume ONE of two still-possible skull readings rather than a settled fact.
   *  `totalsFor` used to pick `outcomes[0]` silently and render it as a flat certainty — exactly
   *  the "reported a figure the rules cannot yet support" failure this ticket exists to prevent
   *  (`CLAUDE.md` — `null` means "not knowable", never "no skull"). Reuses the SAME "this is a
   *  ceiling, not a figure" signal `CardBuffLight.estimate` and `BreakdownConditionRow.mayFire`
   *  already carry, rather than inventing a second one. */
  readonly estimate: boolean
}

export interface CardBuffBreakdown {
  readonly card: Card
  readonly headerText: string
  readonly firingCountText: string
  /** Furthest from the card, rendered FIRST in DOM order and visually topmost. */
  readonly dead: readonly BreakdownDeadRow[]
  readonly groups: readonly {
    readonly branch: BreakdownBranch
    readonly headingText: string
    readonly rows: readonly BreakdownConditionRow[]
  }[]
  /** `firedCount - 1`, clamped at 0 — the game's only combo, its own row immediately above the
   *  totals. `null` when it is 0, because `game-ux` forbids a row that reports nothing.
   *
   *  Reads the HIGHER of the two branches' certain-fired counts, the same "read the higher
   *  ceiling" discipline `CardBuffLight.count` (AC4) already applies: the trick has not resolved,
   *  so which branch's overlap actually lands is not yet knowable either. */
  readonly overlapText: string | null
  /** Nearest the card. Exactly two entries, in branch order, neither emphasised. */
  readonly totals: readonly [BreakdownTotals, BreakdownTotals]
}

/** `null` for a card with no entry in the light map — a panel with nothing to report renders
 *  nothing (`game-ux`), rather than a zero-filled object a component would have to detect. */
export function breakdownFor(
  state: RoundUiState,
  legal: readonly Card[],
  lights: ReadonlyMap<string, CardBuffLight>,
  card: Card,
): CardBuffBreakdown | null {
  // `legal` re-guards `card`'s own legality rather than trusting the caller's `lights` lookup
  // alone — the map is already scoped to `legal`, but a card the caller passes in error (not the
  // one `lights` was built from) must not silently read as "no light" when it could instead read
  // as "not a legal card at all".
  if (!legal.some((option) => sameCard(option, card))) return null
  const light = lights.get(cardKey(card))
  if (light === undefined) return null
  const { projection } = light
  const before = state.buffHand.accrual

  const dead: readonly BreakdownDeadRow[] = activatedBuffs(state)
    .filter((buff) => !projectionHasBuff(projection, buff.id))
    .map((buff) => ({
      buff,
      reasonText: deadRowReasonText(buff, card),
      elsewhereText: deadRowElsewhereText(buff, reachOf(lights, buff.id)),
    }))

  const firedCount = Math.max(projection.won.fired.length, projection.lost.fired.length)
  const overlap = Math.max(0, firedCount - 1)

  return {
    card,
    headerText: cardAccessibleName(card),
    firingCountText: buffBadgeText(light),
    dead,
    groups: [
      groupFor(BreakdownBranch.Took, projection.won),
      groupFor(BreakdownBranch.DidNotTake, projection.lost),
    ],
    overlapText: overlap > 0 ? `Overlap Bonus — +${overlap} multiplier` : null,
    totals: [
      totalsFor(BreakdownBranch.Took, projection.won, before),
      totalsFor(BreakdownBranch.DidNotTake, projection.lost, before),
    ],
  }
}

function groupFor(
  branch: BreakdownBranch,
  branchProjection: BuffBranchProjection,
): { branch: BreakdownBranch; headingText: string; rows: readonly BreakdownConditionRow[] } {
  return {
    branch,
    headingText: BRANCH_HEADING[branch],
    rows: [
      ...branchProjection.fired.map((buff) => rowFor(buff, false)),
      ...branchProjection.mayFire.map((buff) => rowFor(buff, true)),
    ],
  }
}

function rowFor(buff: Buff, mayFire: boolean): BreakdownConditionRow {
  return {
    buff,
    conditionText: buffConditionSentence(buff),
    buffNameText: buffName(buff),
    payoffText: mayFire ? 'may fire' : payoffPhrase(buff),
    mayFire,
  }
}

function payoffPhrase(buff: Buff): string {
  return buffPayoff(buff).gain
}

/** Picks `branchProjection.outcomes[0]` — the skull-FALSE reading when the skull is unknown,
 *  matching `BuffProjection`'s own `BOTH_READINGS` order — for the FIGURES, but never renders that
 *  pick as a settled fact: `estimate` is `true` whenever `outcomes.length === 2`, i.e. the skull is
 *  genuinely unknowable yet, so the row carries the SAME qualified-figure signal
 *  `CardBuffLight.estimate` already uses rather than a second one. The two outcomes can only
 *  disagree in figures when a riding Suit Low card's carry depends on Low Victory vs. Low Defeat;
 *  the condition
 *  rows above are unaffected either way — `fired`/`mayFire` are already the union across
 *  readings. */
function totalsFor(
  branch: BreakdownBranch,
  branchProjection: BuffBranchProjection,
  before: BuffBonusAccrual,
): BreakdownTotals {
  const outcome = branchProjection.outcomes[0]
  return {
    branch,
    damage: outcome.accrual.flatDamageBonus - before.flatDamageBonus,
    multiplier: outcome.accrual.multiplierBonus - before.multiplierBonus,
    carryText: carryTextFor(before, outcome),
    estimate: branchProjection.outcomes.length === 2,
  }
}

/** `null` unless this branch's resolution diverted a Suit Low card's reward into `carryOut` (DLR-150) —
 *  read as a delta off `BuffBranchOutcome.accrual`, never recomputed. */
function carryTextFor(before: BuffBonusAccrual, outcome: BuffBranchOutcome): string | null {
  const damage = outcome.accrual.carryOut.flatDamageBonus - before.carryOut.flatDamageBonus
  const multiplier = outcome.accrual.carryOut.multiplierBonus - before.carryOut.multiplierBonus
  if (damage === 0 && multiplier === 0) return null
  const parts: string[] = []
  if (damage > 0) parts.push(`+${damage} damage`)
  if (multiplier > 0) parts.push(`+${multiplier} multiplier`)
  return `${parts.join(' and ')} carries to next hand`
}
