/**
 * play-tester (2026-08-25) — THE CARD-AWARE POLICY.
 *
 * `baselinePolicy` activates every buff it can afford, cheapest AP first, and never once looks at
 * the player's hand. In the driver the buff window runs BEFORE `chooseCard`, and those two methods
 * never talk, so the baseline routinely arms `markOfRank(9)` and then plays a 10 — spending AP on a
 * card that could not possibly fire. Every buff figure this skill has reported was measured against
 * that blind player, which understates any card keyed to a SUIT or a RANK and understates the
 * Overlap Bonus (`buffAccrual.ts` → `overlapBonusFor`) badly, since two conditions only coincide
 * when somebody aims them at the same card.
 *
 * This policy aims them. Its three differences from `baselinePolicy`, and NOTHING else — shop order
 * is the baseline's own method by reference, so any gap in the printed figures is attributable to
 * card/buff coordination alone:
 *
 * 1. BUFFS — picks the legal card the most affordable buffs are KEYED TO, arms that stack, and
 *    deliberately does NOT arm a targeted buff aimed at a different card. Untargeted buffs
 *    (`hoarder`, `unbloodied`, `debtCollector`, `sidestep`, …) fire off bank/streak/health rather
 *    than off the card, so they are armed afterwards on the baseline's cheapest-first rule.
 * 2. CARDS — plays the legal card matching the most buffs ALREADY ARMED this trick, falling back to
 *    `chooseCpuMove` when nothing matches. Reading what is armed, rather than re-deriving step 1's
 *    intention, is what keeps the two steps agreeing after the buff window has spent AP.
 * 3. DISCARDS — when no card in hand matches any held buff, swaps out the cards that match nothing,
 *    which is the lever the baseline never pulls at all.
 *
 * WHAT IT STILL DOES NOT DO: `taker` needs the trick WON and `feeder` needs it LOST, and while
 * leading the Quarry's answer is unknowable, so a match is an aimed shot rather than a guaranteed
 * fire. It also never arms a Cheat — that stays `maximalistPolicy`'s territory.
 */
import {
  CardRank,
  chooseCpuMove,
  discardRefusalFor,
  legalMoves,
  PlayerSide,
  sameCard,
  type Card,
  type RoundState,
} from '../warCouncil'
import {
  apCostFor,
  apCostOf,
  buffTargetRankOf,
  buffTargetSuitOf,
  MAX_CARDS_PER_DISCARD,
  type ActionPoints,
  type Buff,
  type BuffId,
} from '../hunt'
import { loadoutRefusalFor } from '../app/warCouncil/buffHandlers'
import { discardStock, offeredBuffs, type RoundUiState } from '../app/warCouncil/roundUiState'
import { baselinePolicy } from './baselinePolicy'
import type { CardChoice, SimPolicy } from './types'

/** Whether a buff's condition is keyed to a specific card at all. The suit- and rank-parameterised
 *  families (`taker`, `feeder`, `markOfRank`, `keepsake`) are the ones a card choice can aim; every
 *  other family reads bank, streak, health, coins or a button press and is unaffected by which card
 *  is played. */
function isCardTargeted(buff: Buff): boolean {
  return buffTargetSuitOf(buff) !== null || buffTargetRankOf(buff) !== null
}

/**
 * Whether this card satisfies the buff's TARGET — the half of the condition a card choice controls.
 *
 * Deliberately NOT a second implementation of `buffFires` (`buffEvaluation.ts`): that also needs to
 * know who won the trick, which is unknowable while leading, and a policy that re-derived the real
 * predicate would be two statements of one rule. This answers only "is this the card this buff is
 * keyed to", which is exactly what a player aiming a stack can control.
 *
 * Compares suits as strings because `BuffTargetSuit` and `Suit` are separate unions with identical
 * members — `src/hunt/` cannot import `src/warCouncil/` without the cycle both modules' comments
 * refuse to open, and `buffs.test.ts` already pins the two together member-for-member.
 */
function cardMatchesTarget(buff: Buff, card: Card): boolean {
  const suit = buffTargetSuitOf(buff)
  if (suit !== null) return String(card.suit) === String(suit)
  const rank = buffTargetRankOf(buff)
  if (rank !== null) return card.rank === rank
  return false
}

/** The Fox opens an `AbilityChoice` prompt, and this policy returns no choice of its own — the
 *  driver would answer the prompt from `chooseCpuMove`'s choice for a DIFFERENT card. Excluded
 *  for exactly the reason `maximalistPolicy.wantsCheatPlay` excludes it.
 *
 *  DLR-163 — the Woodcutter is NO LONGER excluded: it carries no choice since the 5's rule became
 *  a Swap-pile raise, so a policy may lead or follow with one freely. */
function isPromptFree(card: Card): boolean {
  return card.rank !== CardRank.Fox
}

/** play-tester (2026-09-02) — through `apCostFor`, not `apCostOf`. See `baselinePolicy.ts`'s
 *  `apBudgetCostOf` for the full account: with action points off the engine charges nothing, and
 *  budgeting at raw prices capped this policy's stack at six cards on a 196-card pile. */
function apBudgetCostOf(buff: Buff): ActionPoints {
  return apCostFor(apCostOf(buff))
}

function byApCostThenId(a: Buff, b: Buff): number {
  const costDiff = apBudgetCostOf(a) - apBudgetCostOf(b)
  return costDiff !== 0 ? costDiff : a.id - b.id
}

/** The legal card the most `candidates` are keyed to, or `null` when none is keyed to any of them. */
function bestAimedCard(ui: RoundUiState, candidates: readonly Buff[]): Card | null {
  let best: Card | null = null
  let bestCount = 0
  for (const card of legalMoves(ui.round, PlayerSide.Player).filter(isPromptFree)) {
    const count = candidates.filter((buff) => cardMatchesTarget(buff, card)).length
    if (count > bestCount) {
      bestCount = count
      best = card
    }
  }
  return best
}

/**
 * The aimed stack first, then the untargeted buffs, spending AP cheapest-first within each group
 * while the pool covers it, exactly as the baseline does.
 *
 * A targeted buff aimed at a card this trick will NOT play is left unarmed — that omission is the
 * whole point of this policy, and it is why its AP spend runs lower than the baseline's.
 */
function chooseBuffs(ui: RoundUiState): readonly BuffId[] {
  const affordable = offeredBuffs(ui).filter((buff) => loadoutRefusalFor(ui, buff) === null)
  if (affordable.length === 0) return []

  const targeted = affordable.filter(isCardTargeted)
  const aimedCard = bestAimedCard(ui, targeted)
  const aimed =
    aimedCard === null ? [] : targeted.filter((buff) => cardMatchesTarget(buff, aimedCard))
  const untargeted = affordable.filter((buff) => !isCardTargeted(buff))

  const ordered = [...aimed.sort(byApCostThenId), ...untargeted.sort(byApCostThenId)]
  const chosen: BuffId[] = []
  let pool = ui.buffActivation.apPool
  for (const buff of ordered) {
    const cost = apBudgetCostOf(buff)
    if (pool - cost < 0) continue
    pool -= cost
    chosen.push(buff.id)
  }
  return chosen
}

/**
 * The legal card matching the most buffs ARMED THIS TRICK, else `chooseCpuMove`'s pick.
 *
 * Reads `activatedThisTrick` rather than recomputing `chooseBuffs`' intention: the buff window has
 * already spent AP by the time this runs, so re-running that scoring could answer differently. What
 * is armed is a fact; what was intended is not.
 */
function chooseCard(round: RoundState, ui?: RoundUiState): CardChoice {
  const fallback = chooseCpuMove(round, PlayerSide.Player)
  if (ui === undefined) return fallback

  const armed = ui.buffActivation.activatedThisTrick.flatMap((id) => {
    const buff = ui.buffs.find((candidate) => candidate.id === id)
    return buff === undefined || !isCardTargeted(buff) ? [] : [buff]
  })
  if (armed.length === 0) return fallback

  let best: Card | null = null
  let bestCount = 0
  for (const card of legalMoves(round, PlayerSide.Player).filter(isPromptFree)) {
    const count = armed.filter((buff) => cardMatchesTarget(buff, card)).length
    if (count > bestCount) {
      bestCount = count
      best = card
    }
  }
  if (best === null) return fallback
  // Keep the engine's own `AbilityChoice` when it named this same card; `isPromptFree` guarantees
  // the card needs none otherwise.
  return sameCard(best, fallback.card) ? fallback : { card: best }
}

/**
 * Swap out the cards no held buff is keyed to — the lever `baselinePolicy` never pulls.
 *
 * Only when NOTHING in hand matches any held targeted buff: a hand that can already aim a stack is
 * a hand worth keeping, and spending the fight's `DISCARDS_PER_FIGHT` budget to improve it further
 * would measure the budget rather than the swap (`maximalistPolicy.chooseDiscard`'s stated reason
 * for firing once per hand).
 */
function chooseDiscard(ui: RoundUiState): readonly Card[] {
  if (discardRefusalFor(discardStock(ui)) !== null) return []
  const targeted = offeredBuffs(ui).filter(isCardTargeted)
  if (targeted.length === 0) return []

  const hand = ui.round.hands[PlayerSide.Player]
  const deadCards = hand.filter((card) => !targeted.some((buff) => cardMatchesTarget(buff, card)))
  // Something in hand already aims a buff — keep the hand.
  if (deadCards.length === hand.length) {
    return [...deadCards]
      .sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : a.suit.localeCompare(b.suit)))
      .slice(0, MAX_CARDS_PER_DISCARD)
  }
  return []
}

export const cardAwarePolicy: SimPolicy = {
  name: 'cardAware',
  chooseCard,
  chooseBuffs,
  chooseDiscard,
  // Reference-identical to the baseline's, so a difference in the figures is attributable to card
  // and buff coordination rather than to a different shop rule.
  nextShopAction: baselinePolicy.nextShopAction,
}
