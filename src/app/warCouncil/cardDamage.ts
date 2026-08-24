/**
 * The hand fan's per-card win/lose damage readout (DLR-117).
 *
 * THE ONE RULE THIS MODULE OBEYS: it performs no damage arithmetic. Both branches are
 * produced by handing a hypothetical `TrickResolution` to `applyResolution` — the SAME fold
 * `commitHandlers.ts` commits a real trick through — and reading the health DELTA back off
 * the returned encounter. Shield absorption, the zero floor on health, and the rule that a
 * hit destroys a payout due at the same resolution are therefore inherited, not restated.
 * `projectedDepletion` is the cautionary case this discipline comes from: it carried its own
 * absorption arithmetic and previewed red hearts breaking that blue hearts would have
 * absorbed, until DLR-115 routed it through `absorbWithShield`.
 *
 * Split out of the component for `roundBars.ts`'s reason: as a block inside `HandFan` this
 * could only be exercised through a renderer.
 */
import { DuelSide, HAND_SIZE, isEncounterResolved, type Damage } from '../../hunt'
import {
  PlayerSide,
  resolveTrickBank,
  RoundPhase,
  trickIsPrimed,
  trickIsSkulled,
  type Card,
  type TrickCard,
  type TrickFacts,
} from '../../warCouncil'
import { applyResolution, playOptions } from './commitHandlers'
import type { RoundUiState } from './roundUiState'

/** The health each side loses at this trick's resolution, in one branch. */
export interface CardDamageBranch {
  readonly toQuarry: Damage
  readonly toPlayer: Damage
  /** Blue hearts spent absorbing this branch's hit. `0` while nothing mints a Shield. */
  readonly shielded: Damage
}

export interface CardDamagePreview {
  readonly win: CardDamageBranch
  readonly lose: CardDamageBranch
  /** `true` only when the Quarry's card is already on the table, so `trickIsSkulled` and
   *  `trickIsPrimed` have every card of the trick to test. `false` while the player leads —
   *  the Quarry's face-down card may carry a skull, which inverts the win branch. */
  readonly exact: boolean
}

/**
 * `null` once the encounter is resolved or the hand is over: there is no next trick to
 * preview, and `applyResolution` short-circuits on a resolved encounter, so computing anyway
 * would print a confident `0 / 0` meaning "nothing to preview" and reading as "no damage".
 */
export function cardDamagePreview(state: RoundUiState, card: Card): CardDamagePreview | null {
  if (state.round.phase === RoundPhase.Complete || isEncounterResolved(state.encounter)) {
    return null
  }

  // Only the cards the PLAYER can see: the Quarry's lead if it is already on the table, plus
  // the card being considered. The Quarry's unplayed answer is never consulted — it is
  // computable (`chooseCpuCard` is deterministic) and reading it would leak the exact card
  // past `TELEGRAPH_FIDELITY`.
  const visible: readonly TrickCard[] = [
    ...state.round.currentTrick,
    { side: PlayerSide.Player, card },
  ]

  // The four queue/run facts come from `playOptions` — the SAME assembly both commit call
  // sites use — with `playCard.ts`'s own `?? 0` / `?? false` defaulting reproduced field for
  // field, so the preview and the commit cannot read "what is pending" differently.
  const options = playOptions(state)
  const finalTrick = state.round.tricksPlayed + 1 === HAND_SIZE
  const shared: Omit<TrickFacts, 'playerWon'> = {
    skullTrick: trickIsSkulled(state.round.skulledCards, visible),
    finalTrick,
    timebombTrick: trickIsPrimed(state.round.primedCards, visible),
    timebombToPlayer: options.timebombToPlayer ?? 0,
    timebombToQuarry: options.timebombToQuarry ?? 0,
    blastGuarded: options.blastGuarded ?? false,
    bankClimbBonus: options.bankClimbBonus ?? 0,
  }

  return {
    win: branchFor(state, { ...shared, playerWon: true }),
    lose: branchFor(state, { ...shared, playerWon: false }),
    exact: state.round.currentTrick.length === 1,
  }
}

/** One branch, as a health delta across the real fold. Never mutates `state`. */
function branchFor(state: RoundUiState, facts: TrickFacts): CardDamageBranch {
  const resolution = resolveTrickBank(
    { bank: state.round.bank, multiplier: state.round.multiplier },
    facts,
  )
  const before = state.encounter
  const after = applyResolution(before, resolution, facts.finalTrick).encounter
  return {
    toQuarry: before.health[DuelSide.Quarry] - after.health[DuelSide.Quarry],
    toPlayer: before.health[DuelSide.Player] - after.health[DuelSide.Player],
    shielded: before.shieldHearts - after.shieldHearts,
  }
}
