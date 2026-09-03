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
 *
 * DLR-156 B1 — AC5 zeroed `TrickResolution.cashOut` unconditionally: a win no longer pays the
 * Quarry immediately, so `win.toQuarry` (below) is now correctly 0 on every ordinary trick, and
 * stays that way. That is NOT this module going stale — it is the new rule stated correctly. What
 * a win is now worth is `winPot`, read the SAME discipline applies to: straight off the win
 * branch's own `TrickResolution`, never re-derived.
 */
import { DuelSide, HAND_SIZE, isEncounterResolved, type Damage } from '../../hunt'
import {
  buffTrickFactsFor,
  PlayerSide,
  potValue,
  resolveTrickBank,
  sameCard,
  swanTierFactsFor,
  RoundPhase,
  trickIsSkulled,
  type Card,
  type TrickCard,
  type TrickFacts,
  type TrickResolution,
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

/** DLR-156 B1 — what winning this trick would be worth TOWARD THE POT. `win.toQuarry` above
 *  stays 0 on an ordinary trick (AC5 — only the resolution screen's
 *  own Apply choice ever pays immediately), so it alone cannot carry "does this card matter"; a
 *  streak of any size previewed the same flat "no damage" without this. Read straight off
 *  `resolveTrickBank`'s own win-branch `TrickResolution` — no arithmetic of its own, the same
 *  discipline this module's docblock states for every other figure here. */
export interface CardDamageWinPot {
  /** This card's own contribution to `total` if the trick is taken (AC1/AC11) — `0` on a bare
   *  trick with nothing riding. */
  readonly trickDamage: number
  /** `total` after this trick, if taken. */
  readonly total: number
  /** `roll` after this trick, if taken. */
  readonly roll: number
  /** `potValue(total, roll)` after this trick — what the streak would be WORTH, not what it
   *  pays: nothing is dealt until the player chooses Apply on the resolution screen. */
  readonly pot: number
}

export interface CardDamagePreview {
  readonly win: CardDamageBranch
  readonly lose: CardDamageBranch
  readonly winPot: CardDamageWinPot
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

  // The run facts come from `playOptions` — the SAME assembly both commit call
  // sites use — with `playCard.ts`'s own `?? 0` defaulting reproduced field for
  // field, so the preview and the commit cannot read them differently.
  const options = playOptions(state)
  const finalTrick = state.round.tricksPlayed + 1 === HAND_SIZE
  const remainingHand = state.round.hands[PlayerSide.Player].filter((c) => !sameCard(c, card))
  const shared: Omit<TrickFacts, 'playerWon'> = {
    skullTrick: trickIsSkulled(state.round.skulledCards, visible),
    finalTrick,
    baseDamageBonus: options.baseDamageBonus ?? 0,
    // DLR-122 — the Swan ladder, derived exactly as `playCard.ts` derives it, from the same
    // `playOptions` assembly. `visible` already carries the real `side` on every entry, which is
    // what makes AC3's player-only gate work here too: a Quarry Swan on the table cannot satisfy
    // it. A preview that read the run's ladder itself would be the second reading `playOptions`'
    // own docblock warns about.
    ...swanTierFactsFor(visible, options.playerRankTiers),
    // DLR-117 AC3, met by DLR-125. The preview STILL computes no damage: it threads the same
    // buff input the commit does through the same `resolveTrickBank`, then reads a health delta
    // off `applyResolution`. R3's order, the four caps and the Overlap Bonus are inherited, never
    // restated here — which is the preview's whole correctness argument.
    ...buffTrickFactsFor(visible, remainingHand, options.buffs ?? null),
  }

  const streak = { total: state.round.total, roll: state.round.roll }
  const winResolution = resolveTrickBank(streak, { ...shared, playerWon: true })
  const loseResolution = resolveTrickBank(streak, { ...shared, playerWon: false })

  return {
    win: branchFor(state, winResolution),
    lose: branchFor(state, loseResolution),
    // DLR-156 B1 — read straight off the win branch's OWN resolution, never re-derived: the
    // trick's own `trickDamage.dealt` and the `total`/`roll` `resolveTrickBank` already climbed.
    // `potValue` is `streak.ts`'s own single statement of what a streak is worth, called here
    // exactly as `commitHandlers.ts`'s `nextPotFloor` calls it.
    winPot: {
      trickDamage: winResolution.trickDamage?.dealt ?? 0,
      total: winResolution.total,
      roll: winResolution.roll,
      pot: potValue(winResolution.total, winResolution.roll),
    },
    exact: state.round.currentTrick.length === 1,
  }
}

/** One branch, as a health delta across the real fold. Never mutates `state`. Takes the
 *  RESOLUTION rather than the facts, so `cardDamagePreview` above computes each branch's
 *  `resolveTrickBank` call exactly once and reuses it for both the health delta here and (on the
 *  win branch) `winPot` — two readings of one resolution, never two separate derivations. */
function branchFor(state: RoundUiState, resolution: TrickResolution): CardDamageBranch {
  const before = state.encounter
  const after = applyResolution(before, resolution).encounter
  return {
    toQuarry: before.health[DuelSide.Quarry] - after.health[DuelSide.Quarry],
    toPlayer: before.health[DuelSide.Player] - after.health[DuelSide.Player],
    shielded: before.shieldHearts - after.shieldHearts,
  }
}
