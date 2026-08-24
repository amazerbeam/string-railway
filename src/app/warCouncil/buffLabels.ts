import {
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  buffTargetRankOf,
  buffTargetSuitOf,
  type ActionPoints,
  type Buff,
  BuffActivationRefusal,
} from '../../hunt'

/** DLR-114 — the family word half of a card's name. TRANSCRIBED from `v1-buff-card-list.md` ->
 *  *How a card is named*; the eight activated/consumable kinds and `Unassigned` have no row there,
 *  so their words are this ticket's own PLACEHOLDER copy. Keyed over the closed `BuffKind` union so
 *  a member added later fails to compile here rather than rendering `undefined`. */
export const BUFF_FAMILY_WORD: Readonly<Record<BuffKind, string>> = {
  [BuffKind.Taker]: 'Taker',
  [BuffKind.Feeder]: 'Feeder',
  [BuffKind.MarkOfRank]: 'Mark of the',
  [BuffKind.Sidestep]: 'Sidestep',
  [BuffKind.Glutton]: 'Glutton',
  [BuffKind.Hoarder]: 'Hoarder',
  [BuffKind.Unbloodied]: 'Unbloodied',
  [BuffKind.DebtCollector]: 'Debt Collector',
  [BuffKind.Keepsake]: 'Keepsake',
  [BuffKind.Miser]: 'Miser',
  [BuffKind.Cornered]: 'Cornered',
  [BuffKind.Cheat]: 'Cheat',
  [BuffKind.Timebomb]: 'Timebomb',
  [BuffKind.Shield]: 'Shield',
  [BuffKind.Ward]: 'Ward',
  [BuffKind.Puppeteer]: 'Puppeteer',
  [BuffKind.SecondThoughts]: 'Second Thoughts',
  [BuffKind.Foresight]: 'Foresight',
  [BuffKind.Spyglass]: 'Spyglass',
  [BuffKind.Unassigned]: 'Blank card',
}

/** The condition half, in sentence form. The eleven family rows are TRANSCRIBED from the same
 *  table; the activated cards have no condition at all, which is what `ACTIVATED_BUFF_CONDITION`
 *  already says, so they read as an action the player takes. Suit and rank are substituted by
 *  `buffConditionSentence` below. */
export const BUFF_CONDITION_SENTENCE: Readonly<Record<BuffKind, string>> = {
  [BuffKind.Taker]: 'win a trick with {suit}',
  [BuffKind.Feeder]: 'lose a trick with {suit}',
  [BuffKind.MarkOfRank]: 'win a trick with a {rank}',
  [BuffKind.Sidestep]: 'dodge a skull with this card',
  [BuffKind.Glutton]: 'eat a skull with this card',
  [BuffKind.Hoarder]: 'reach a high bank this hand',
  [BuffKind.Unbloodied]: 'survive several tricks without a hit',
  [BuffKind.DebtCollector]: 'apply damage this hand',
  [BuffKind.Keepsake]: "hold a {suit} card at hand's end",
  [BuffKind.Miser]: 'hold enough coins',
  [BuffKind.Cornered]: 'be low on health',
  [BuffKind.Cheat]: 'play any card, ignoring follow-suit',
  [BuffKind.Timebomb]: 'prime a card in your hand',
  [BuffKind.Shield]: 'raise blue hearts',
  [BuffKind.Ward]: 'absorb the next hit',
  [BuffKind.Puppeteer]: "steer the Quarry's next card",
  [BuffKind.SecondThoughts]: 'take back your last card',
  [BuffKind.Foresight]: 'look at the draw pile',
  [BuffKind.Spyglass]: "look at the Quarry's hand",
  [BuffKind.Unassigned]: 'nothing yet',
}

/** The reward suffix half. The four priced axes are TRANSCRIBED from the same document's
 *  *Reward suffix* table (Blade / Purse / Second Wind / Momentum); the rest are this ticket's own
 *  placeholder copy for axes that table does not price. */
export const BUFF_REWARD_SUFFIX: Readonly<Record<BuffRewardAxis, string>> = {
  [BuffRewardAxis.Magnitude]: 'Blade',
  [BuffRewardAxis.Coins]: 'Purse',
  [BuffRewardAxis.ApRefund]: 'Second Wind',
  [BuffRewardAxis.Multiplier]: 'Momentum',
  [BuffRewardAxis.DurationTricks]: 'Free Rein',
  [BuffRewardAxis.HeartCount]: 'Blast Guard',
  [BuffRewardAxis.CardsRevealed]: 'Sight',
  [BuffRewardAxis.CandidatesEliminated]: 'Sight',
  [BuffRewardAxis.DiscardCharges]: 'Reshape',
  [BuffRewardAxis.DamageAbsorbed]: 'Blast Guard',
  [BuffRewardAxis.None]: 'No reward',
}

const SUIT_WORD: Readonly<Record<BuffTargetSuit, string>> = {
  [BuffTargetSuit.Bells]: 'Bells',
  [BuffTargetSuit.Keys]: 'Keys',
  [BuffTargetSuit.Moons]: 'Moons',
}

/** `Bell-Taker (Momentum)` / `Mark of the 9 (Blade)` / `Cheat (Free Rein)` — the naming grammar
 *  `v1-buff-card-list.md` sets: the three suit-parameterised families prefix the suit, ranks are
 *  substituted into the family word, and the reward suffix closes in parentheses. */
export function buffName(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const family = BUFF_FAMILY_WORD[buff.kind]
  const head =
    rank !== null
      ? `${family} ${rank}`
      : suit !== null
        ? `${SUIT_WORD[suit].replace(/s$/, '')}-${family}`
        : family
  return `${head} (${BUFF_REWARD_SUFFIX[buff.reward.axis]})`
}

/** The condition, with any suit or rank substituted in. */
export function buffConditionSentence(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  return BUFF_CONDITION_SENTENCE[buff.kind]
    .replace('{suit}', suit !== null ? SUIT_WORD[suit] : 'any suit')
    .replace('{rank}', rank !== null ? String(rank) : 'named rank')
}

/** `+2 multiplier` / `+3 damage` / `3 coins` / `1 action point back`. */
export function buffRewardPhrase(buff: Buff): string {
  const v = buff.reward.value
  switch (buff.reward.axis) {
    case BuffRewardAxis.Magnitude:
      return `+${v} damage`
    case BuffRewardAxis.Coins:
      return `+${v} coins`
    case BuffRewardAxis.ApRefund:
      return `+${v} action ${v === 1 ? 'point' : 'points'} back`
    case BuffRewardAxis.Multiplier:
      return `+${v} multiplier`
    case BuffRewardAxis.DurationTricks:
      return `${v} ${v === 1 ? 'trick' : 'tricks'} of no follow-suit`
    case BuffRewardAxis.HeartCount:
    case BuffRewardAxis.DamageAbsorbed:
      return `${v} blue ${v === 1 ? 'heart' : 'hearts'}`
    case BuffRewardAxis.CardsRevealed:
      return `${v} ${v === 1 ? 'card' : 'cards'} revealed`
    case BuffRewardAxis.CandidatesEliminated:
      return `${v} ${v === 1 ? 'card' : 'cards'} ruled out`
    case BuffRewardAxis.DiscardCharges:
      return `+${v} ${v === 1 ? 'swap' : 'swaps'}`
    case BuffRewardAxis.None:
      return 'nothing'
  }
}

/** THE one glanceable line, and the row's own accessible name — one string, so what a sighted
 *  player reads and what a screen reader announces cannot drift.
 *  `Bell-Taker (Momentum) — win a trick with Bells: +2 multiplier. 2 AP.` */
export function buffLine(buff: Buff, apCost: ActionPoints): string {
  return `${buffName(buff)} — ${buffConditionSentence(buff)}: ${buffRewardPhrase(buff)}. ${apCost} AP.`
}

/** PLACEHOLDER copy, as this project's rest is. */
export const BUFF_ACTIVATION_REFUSAL_MESSAGE: Readonly<Record<BuffActivationRefusal, string>> = {
  [BuffActivationRefusal.NoEffectYet]: 'Not usable yet.',
  [BuffActivationRefusal.WindowClosed]: 'Not between tricks.',
  [BuffActivationRefusal.AlreadyActive]: 'Already active this trick.',
  [BuffActivationRefusal.InsufficientAp]: 'Not enough action points.',
}

export const BUFF_POISED_HINT = 'Tap again to activate'

/** The row's full accessible name: the line, then the poise stage or the refusal reason. */
export function buffRowAccessibleName(
  buff: Buff,
  apCost: ActionPoints,
  poised: boolean,
  refusal: BuffActivationRefusal | null,
): string {
  const line = buffLine(buff, apCost)
  if (refusal !== null) return `${line} ${BUFF_ACTIVATION_REFUSAL_MESSAGE[refusal]}`
  return poised ? `${line} ${BUFF_POISED_HINT}` : line
}
