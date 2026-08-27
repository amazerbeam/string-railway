/**
 * DLR-148 Phase 1 — the trick consequence readout's pure view-model. Derives, from the Quarry's led
 * card alone, what taking the trick does to the player and what not taking it does — in the rank
 * table's own terms (`.docs/game_rules/the-hunt.md` → *Each named rank does one thing*, §7's four
 * outcomes). No React, no DOM — tested without a renderer under the `node` Vitest project.
 *
 * The readout speaks only about the Quarry's led card: `trickConsequence` returns `null` when the
 * trick is empty, when the PLAYER led it, and when the led card produces no clauses — one guard,
 * three cases, satisfying AC14 ("no placeholder row, no empty panel") by construction rather than by
 * a render-time check.
 *
 * Named `trickConsequenceModel.ts` rather than `trickConsequence.ts` (this file's original name)
 * as of Phase 5: this file and the new `TrickConsequence.tsx` component differ only by case, and
 * this dev environment's Vite/Vitest module resolution folds two source files that differ only by
 * case into ONE cached module id — `import TrickConsequence from './TrickConsequence'` silently
 * resolved to THIS file's exports (no default export, so `undefined`) the moment both existed in
 * the same module graph, reproducing the exact `buffGallery.ts` → `buffGalleryModel.ts` collision
 * this file's own sibling already worked around. Renamed rather than worked around a second time,
 * since the collision would recur in the real app bundle. No behaviour changed by the rename —
 * every export below is unchanged.
 */
import {
  CardRank,
  isSkulled,
  PlayerSide,
  type Card,
  type Suit,
  type TrickCard,
} from '../../warCouncil'
import type { RoundUiState } from './roundUiState'

export const ConsequenceBranch = { Win: 'win', Lose: 'lose', Rule: 'rule' } as const
export type ConsequenceBranch = (typeof ConsequenceBranch)[keyof typeof ConsequenceBranch]

/** Colour appears only on the consequence, never on the label. */
export const ConsequenceTone = {
  Costly: 'costly',
  Worthwhile: 'worthwhile',
  Neutral: 'neutral',
} as const
export type ConsequenceTone = (typeof ConsequenceTone)[keyof typeof ConsequenceTone]

/** One sentence's worth of meaning. The words live in `consequenceLabels.ts`. */
export const ConsequenceClauseKind = {
  YouEatSkull: 'youEatSkull',
  TheyEatSkull: 'theyEatSkull',
  SwanLoserLeads: 'swanLoserLeads',
  MonarchNarrowsFollow: 'monarchNarrowsFollow',
  LoneWitchIsTrump: 'loneWitchIsTrump',
} as const
export type ConsequenceClauseKind =
  (typeof ConsequenceClauseKind)[keyof typeof ConsequenceClauseKind]

export interface ConsequenceClause {
  readonly kind: ConsequenceClauseKind
  readonly tone: ConsequenceTone
}

export interface ConsequenceRow {
  readonly branch: ConsequenceBranch
  /** Never empty — a row with no clause is not built. */
  readonly clauses: readonly ConsequenceClause[]
}

export interface TrickConsequenceView {
  readonly led: Card
  readonly skulled: boolean
  /** Never empty — `trickConsequence` returns `null` instead. */
  readonly rows: readonly ConsequenceRow[]
}

export interface TrickConsequenceFacts {
  /** `null` when the trick is empty. */
  readonly led: TrickCard | null
  readonly skulled: boolean
  readonly trumpSuit: Suit
  /** Witches already face up in this trick. Exactly 1 makes the led Witch a lone Witch. */
  readonly witchCount: number
}

/** `null` when there is no led card, when the PLAYER led it, or when no clause applies. */
export function trickConsequence(facts: TrickConsequenceFacts): TrickConsequenceView | null {
  const { led } = facts
  // The readout speaks about THEIR card. No led card, or a card the player led themselves, and
  // there is nothing to say — AC14, and AC16's lead state, satisfied by construction.
  if (led === null || led.side === PlayerSide.Player) return null

  const rows: ConsequenceRow[] = []
  const rank = led.card.rank

  if (facts.skulled) {
    const winClauses: ConsequenceClause[] = [
      { kind: ConsequenceClauseKind.YouEatSkull, tone: ConsequenceTone.Costly },
    ]
    if (rank === CardRank.Swan) {
      winClauses.push({ kind: ConsequenceClauseKind.SwanLoserLeads, tone: ConsequenceTone.Neutral })
    }
    rows.push({ branch: ConsequenceBranch.Win, clauses: winClauses })
    rows.push({
      branch: ConsequenceBranch.Lose,
      clauses: [{ kind: ConsequenceClauseKind.TheyEatSkull, tone: ConsequenceTone.Worthwhile }],
    })
  } else if (rank === CardRank.Swan) {
    // Unskulled Swan: the leader change is real whether or not a skull is present, but only on the
    // WIN branch — on the lose branch their Swan won and `nextLeaderAfterTrick` does nothing.
    rows.push({
      branch: ConsequenceBranch.Win,
      clauses: [{ kind: ConsequenceClauseKind.SwanLoserLeads, tone: ConsequenceTone.Neutral }],
    })
  }

  if (rank === CardRank.Monarch) {
    rows.push({
      branch: ConsequenceBranch.Rule,
      clauses: [
        { kind: ConsequenceClauseKind.MonarchNarrowsFollow, tone: ConsequenceTone.Neutral },
      ],
    })
  }

  // A lone Witch — exactly one Witch face up in this trick. Two Witches cancel, so no rule row.
  if (rank === CardRank.Witch && facts.witchCount === 1) {
    rows.push({
      branch: ConsequenceBranch.Rule,
      clauses: [{ kind: ConsequenceClauseKind.LoneWitchIsTrump, tone: ConsequenceTone.Neutral }],
    })
  }

  // Fox and Woodcutter resolve the instant the card is played, before the follow — nothing left
  // for them to do to the follower by the time the card is face up in the trick.
  // Treasure and Poison have no rule at all. A clean card with no acting rank reaches here with
  // nothing. Return `null`, never an empty view — `game-ux`: do not render a panel that has
  // nothing to say, and an empty view would hand the component the choice.
  return rows.length === 0 ? null : { led: led.card, skulled: facts.skulled, rows }
}

/** Builds `TrickConsequenceFacts` from round state in one place, so the rail and its spec cannot
 *  read the trick differently. */
export function trickConsequenceFacts(state: RoundUiState): TrickConsequenceFacts {
  const led = state.round.currentTrick[0] ?? null
  const witchCount = state.round.currentTrick.filter(
    (trickCard) => trickCard.card.rank === CardRank.Witch,
  ).length
  return {
    led,
    skulled: led !== null && isSkulled(state.round.skulledCards, led.card),
    trumpSuit: state.round.trumpSuit,
    witchCount,
  }
}
