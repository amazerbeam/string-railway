/**
 * DLR-148 Phase 1 — the trick consequence readout's copy. `trickConsequence.ts` decides which
 * clauses apply; this file holds the words, matching how `buffLabels.ts` and `labels.ts` already
 * split rules from copy.
 */
import { cardAccessibleName } from './labels'
import {
  ConsequenceBranch,
  ConsequenceClauseKind,
  type TrickConsequenceView,
} from './trickConsequenceModel'

/** PLACEHOLDER COPY, as this project's rest is. Every sentence is TRANSCRIBED from
 *  `.docs/game_rules/the-hunt.md` — the rank table for the three rule clauses, section 7's
 *  four-outcome table for the two skull clauses. Keyed over the closed clause union so a member
 *  added later fails to compile here rather than rendering `undefined`. */
export const CONSEQUENCE_CLAUSE_TEXT: Readonly<Record<ConsequenceClauseKind, string>> = {
  [ConsequenceClauseKind.YouEatSkull]:
    'You eat the skull — one heart, and your bank cashes at two-thirds.',
  [ConsequenceClauseKind.TheyEatSkull]:
    'They eat the skull. You bank the trick and your multiplier climbs.',
  [ConsequenceClauseKind.SwanLoserLeads]: 'Their Swan lost, so they lead the next trick.',
  [ConsequenceClauseKind.MonarchNarrowsFollow]:
    'You may play only your Swan of that suit, or your highest card of it.',
  [ConsequenceClauseKind.LoneWitchIsTrump]:
    'Their Witch counts as trump — unless you play a Witch too, and the two cancel.',
}

export const CONSEQUENCE_BRANCH_LABEL: Readonly<Record<ConsequenceBranch, string>> = {
  [ConsequenceBranch.Win]: 'If you win',
  [ConsequenceBranch.Lose]: 'If you lose',
  [ConsequenceBranch.Rule]: 'Rule',
}

/** The readout's own accessible name, so a reader who cannot see the slip gets the same claim. */
export function consequenceAccessibleName(view: TrickConsequenceView): string {
  const cardName = cardAccessibleName(view.led, { skulled: view.skulled })
  const rowText = view.rows
    .map((row) => {
      const clauseText = row.clauses.map((clause) => CONSEQUENCE_CLAUSE_TEXT[clause.kind]).join(' ')
      return `${CONSEQUENCE_BRANCH_LABEL[row.branch]}: ${clauseText}`
    })
    .join(' ')
  return `${cardName}. ${rowText}`
}
