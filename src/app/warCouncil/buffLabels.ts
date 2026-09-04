import {
  BuffCadence,
  BUFF_CADENCE,
  BuffKind,
  BuffRewardAxis,
  BuffTargetSuit,
  BuffTier,
  CURSE_REWARD,
  buffIsWild,
  buffTargetRankOf,
  buffTargetSuitOf,
  conditionIsWidened,
  type Buff,
  BuffActivationRefusal,
} from '../../hunt'
import type { BuffStack } from './buffGalleryModel'

/** DLR-114 — the family word half of a card's name. TRANSCRIBED from `v1-buff-card-list.md` ->
 *  *How a card is named*; the eight activated/consumable kinds and `Unassigned` have no row there,
 *  so their words are this ticket's own PLACEHOLDER copy. Keyed over the closed `BuffKind` union so
 *  a member added later fails to compile here rather than rendering `undefined`. */
export const BUFF_FAMILY_WORD: Readonly<Record<BuffKind, string>> = {
  // DLR-165 — the family word is now an adjective naming the card's own condition. The two
  // suit-parameterised families take the suit prefix in `buffName`; `SkullLow` is suitless and so
  // carries its whole name here.
  [BuffKind.SuitHigh]: 'High',
  [BuffKind.SuitLow]: 'Low',
  [BuffKind.MarkOfRank]: 'Mark of the',
  [BuffKind.SkullLow]: 'Skull Low',
  [BuffKind.Glutton]: 'Glutton',
  [BuffKind.Hoarder]: 'Hoarder',
  [BuffKind.Unbloodied]: 'Unbloodied',
  [BuffKind.DebtCollector]: 'Debt Collector',
  [BuffKind.Keepsake]: 'Keepsake',
  [BuffKind.Miser]: 'Miser',
  [BuffKind.Cornered]: 'Cornered',
  [BuffKind.Cheat]: 'Cheat',
  [BuffKind.Shield]: 'Shield',
  [BuffKind.Ward]: 'Ward',
  [BuffKind.Puppeteer]: 'Puppeteer',
  [BuffKind.SecondThoughts]: 'Second Thoughts',
  [BuffKind.Foresight]: 'Foresight',
  [BuffKind.Spyglass]: 'Spyglass',
  [BuffKind.Unassigned]: 'Blank card',
  // DLR-161 — PLACEHOLDER copy, as this table's docblock already says of every non-transcribed row.
  [BuffKind.SkullHelmet]: 'Skull Helmet',
  [BuffKind.SkullTether]: 'Skull Tether',
  // DLR-162 — PLACEHOLDER copy.
  [BuffKind.Wildcard]: 'Wildcard',
  // DLR-167 — PLACEHOLDER copy.
  [BuffKind.Curse]: 'Curse',
}

/** The condition half, in sentence form. Suit and rank are substituted by `buffConditionSentence`
 *  below.
 *
 *  DLR-165 AC5 — every row is phrased on the MECHANICAL axis and NO ROW NAMES VICTORY OR DEFEAT.
 *  That is the rule that stops the two vocabularies re-merging: the moment a card can be read as
 *  being about the outcome, the original confusion is back. The eight CUT families are re-phrased
 *  too — no player can reach them, but leaving outcome words in this table is how the retired
 *  vocabulary comes back the day a family is restored. A spec in `buffLabels.test.ts` guards it.
 *
 *  The `{suit}` rows say "on {suit}" rather than "on a {suit} trick" because DLR-162 substitutes
 *  `any suit` for a wild card, and the article would produce "on a any suit trick". */
export const BUFF_CONDITION_SENTENCE: Readonly<Record<BuffKind, string>> = {
  [BuffKind.SuitHigh]: 'go high on {suit}',
  [BuffKind.SuitLow]: 'go low on {suit}',
  [BuffKind.MarkOfRank]: 'go high on a trick with a {rank}',
  // DLR-167 AC10 — the old wording claimed the buff attached to a card. NO BUFF ATTACHES TO A
  // CARD: a buff is activated FOR A TRICK and checked when that trick resolves. It came from the
  // unbuilt "Apply-to-card" category in `v1-buff-card-list.md`, which was never built.
  // DLR-165 AC7 — and it is now stated on the High/Low axis, which is what the card actually reads.
  [BuffKind.SkullLow]: 'go low on a skull',
  [BuffKind.Glutton]: 'go high on a skull',
  [BuffKind.Hoarder]: 'reach a high bank this hand',
  [BuffKind.Unbloodied]: 'survive several tricks without a hit',
  [BuffKind.DebtCollector]: 'apply damage this hand',
  [BuffKind.Keepsake]: "hold a {suit} card at hand's end",
  [BuffKind.Miser]: 'hold enough coins',
  [BuffKind.Cornered]: 'be low on health',
  [BuffKind.Cheat]: 'play any card, ignoring follow-suit',
  [BuffKind.Shield]: 'raise blue hearts',
  [BuffKind.Ward]: 'absorb the next hit',
  [BuffKind.Puppeteer]: "steer the Quarry's next card",
  [BuffKind.SecondThoughts]: 'take back your last card',
  [BuffKind.Foresight]: 'look at the draw pile',
  [BuffKind.Spyglass]: "look at the Quarry's hand",
  [BuffKind.Unassigned]: 'nothing yet',
  // DLR-161 — the BRONZE reading for both. PLACEHOLDER copy. DLR-165 moved it onto the High/Low
  // axis and dropped the same false "with this card" AC7 corrects on Skull Low.
  [BuffKind.SkullHelmet]: 'go high on a skull',
  [BuffKind.SkullTether]: 'go high on a skull',
  // DLR-162 — it has no trigger, so it reads as the action the player takes, exactly as Cheat's
  // row does. PLACEHOLDER copy.
  [BuffKind.Wildcard]: 'spend it on a suited card between fights',
  // DLR-167 — it has no trigger, so it reads as the action the player takes, as Cheat's row does.
  // PLACEHOLDER copy.
  [BuffKind.Curse]: 'put a skull on a card in your hand',
}

/** DLR-161 AC5 — silver and gold print a WIDER sentence than bronze, because they fire on a Low
 *  Defeat as well as a High Defeat. A `Partial` beside the total table above, selected by
 *  `conditionIsWidened`, so the tier rule is READ from `src/hunt/buffProtection.ts` and never
 *  restated here — the drift this codebase repeatedly designs against. PLACEHOLDER copy.
 *
 *  DLR-165 AC5 — "eat a skull, or lose a trick" named the OUTCOME axis on a card face. */
export const BUFF_WIDENED_CONDITION_SENTENCE: Partial<Readonly<Record<BuffKind, string>>> = {
  [BuffKind.SkullHelmet]: 'go high on a skull, or low on a clean trick',
  [BuffKind.SkullTether]: 'go high on a skull, or low on a clean trick',
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
  [BuffRewardAxis.HeartCount]: 'Bulwark',
  [BuffRewardAxis.CardsRevealed]: 'Sight',
  [BuffRewardAxis.CandidatesEliminated]: 'Sight',
  [BuffRewardAxis.DiscardCharges]: 'Reshape',
  [BuffRewardAxis.DamageAbsorbed]: 'Bulwark',
  [BuffRewardAxis.None]: 'No reward',
  [BuffRewardAxis.Protection]: 'Guard',
}

const SUIT_WORD: Readonly<Record<BuffTargetSuit, string>> = {
  [BuffTargetSuit.Bells]: 'Bells',
  [BuffTargetSuit.Keys]: 'Keys',
  [BuffTargetSuit.Moons]: 'Moons',
}

/** `Bell High (Momentum)` / `Skull Low (Blade)` / `Mark of the 9 (Blade)` / `Cheat (Free Rein)` —
 *  the naming grammar `v1-buff-card-list.md` sets: the suit-parameterised families prefix the suit,
 *  ranks are substituted into the family word, and the reward suffix closes in parentheses.
 *  DLR-165 replaced DLR-114's hyphenated `Bell-Taker` join with a SPACE: the family word is now an
 *  adjective phrase ("High"), not a noun ("Taker"), and a hyphen reads wrong on one. */
export function buffName(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  const family = BUFF_FAMILY_WORD[buff.kind]
  // DLR-162 AC9 — a wild card carries its wildness in the NAME as well as in its mark, so a
  // greyscale screenshot and a screen reader both read it. The prefix sits exactly where the suit
  // prefix would, because it is what replaced the suit. A wild card reports no suit and no rank,
  // so the branches stay mutually exclusive.
  const head = buffIsWild(buff)
    ? `Wild ${family}`
    : rank !== null
      ? `${family} ${rank}`
      : suit !== null
        ? `${SUIT_WORD[suit].replace(/s$/, '')} ${family}`
        : family
  return `${head} (${BUFF_REWARD_SUFFIX[buff.reward.axis]})`
}

/** The condition, with any suit or rank substituted in. */
export function buffConditionSentence(buff: Buff): string {
  const suit = buffTargetSuitOf(buff)
  const rank = buffTargetRankOf(buff)
  // The `??` is safe rather than silent: `conditionIsWidened` is true only for the two kinds
  // `BUFF_WIDENED_CONDITION_SENTENCE` names, so the fallback is unreachable and exists only to
  // satisfy the index signature.
  const sentence = conditionIsWidened(buff)
    ? (BUFF_WIDENED_CONDITION_SENTENCE[buff.kind] ?? BUFF_CONDITION_SENTENCE[buff.kind])
    : BUFF_CONDITION_SENTENCE[buff.kind]
  return sentence
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
    // DLR-161 — one axis, two families, so the FIGURE saved comes from the kind. The value is
    // AC6's gold bonus and is 0 below gold, which is why the phrase has two shapes rather than
    // always printing "+0".
    case BuffRewardAxis.Protection: {
      const figure = buff.kind === BuffKind.SkullTether ? 'roll' : 'total'
      return v > 0 ? `your ${figure} survives, +${v}` : `your ${figure} survives`
    }
  }
}

/** The tier word every loadout row states, so a player can tell which copy of a buff they own. */
const BUFF_TIER_WORD: Readonly<Record<BuffTier, string>> = {
  [BuffTier.Bronze]: 'Bronze',
  [BuffTier.Silver]: 'Silver',
  [BuffTier.Gold]: 'Gold',
}

/** THE one glanceable line, and the row's own accessible name — one string, so what a sighted
 *  player reads and what a screen reader announces cannot drift.
 *  `Bronze Bell High (Momentum) — go high on Bells: +2 multiplier.`
 *  DLR-145 AC2 — the trailing `N AP.` is gone with action points. The parameter is REMOVED rather
 *  than passed a zero: a row that reads "0 AP" still claims a resource exists. */
export function buffLine(buff: Buff): string {
  return `${BUFF_TIER_WORD[buff.tier]} ${buffName(buff)} — ${buffConditionSentence(buff)}: ${buffRewardPhrase(buff)}.`
}

/** PLACEHOLDER copy, as this project's rest is. */
export const BUFF_ACTIVATION_REFUSAL_MESSAGE: Readonly<Record<BuffActivationRefusal, string>> = {
  // DLR-162 — PLACEHOLDER copy. Says WHERE the card is spent, not merely that it cannot be:
  // the row renders this on its own face, and a player holding a card they cannot use is exactly
  // who this sentence is for.
  [BuffActivationRefusal.ShopOnly]: 'Spend this on the Manage Buffs screen.',
  [BuffActivationRefusal.NoEffectYet]: 'Not usable yet.',
  [BuffActivationRefusal.WindowClosed]: 'Not between tricks.',
  // DLR-167 — PLACEHOLDER copy. Says what the player must do next rather than merely refusing:
  // a Curse is already waiting for a card, and tapping one is what clears it.
  [BuffActivationRefusal.CurseLive]: 'A Curse is already waiting for a card.',
  [BuffActivationRefusal.AlreadyActive]: 'Already active this trick.',
  [BuffActivationRefusal.InsufficientAp]: 'Not enough action points.',
}

export const BUFF_POISED_HINT = 'Tap again to activate'

/** The row's full accessible name: the line, then the poise stage or the refusal reason. */
export function buffRowAccessibleName(
  buff: Buff,
  poised: boolean,
  refusal: BuffActivationRefusal | null,
): string {
  const line = buffLine(buff)
  if (refusal !== null) return `${line} ${BUFF_ACTIVATION_REFUSAL_MESSAGE[refusal]}`
  return poised ? `${line} ${BUFF_POISED_HINT}` : line
}

/** AC9 — the cadence word, derived from `BUFF_CADENCE` and never authored per card. Keyed over
 *  the closed `BuffCadence` union. `Event` is a placeholder here — every live `Event` family is
 *  narrowed by kind below, through `BUFF_EVENT_WORD`; this table is what a cut `Event` family
 *  (that has no entry in `BUFF_EVENT_WORD`) still falls back to, so it resolves to a word rather
 *  than `undefined`. */
const CADENCE_WORD: Readonly<Record<BuffCadence, string>> = {
  [BuffCadence.Event]: 'WHEN',
  [BuffCadence.Threshold]: 'WHEN',
  [BuffCadence.Terminal]: 'HAND END',
  [BuffCadence.Activated]: 'PRESS',
}

/** AC9's public export — the same table as `CADENCE_WORD` above, so a consumer or a test can read
 *  the fallback word straight from a `BuffCadence` without minting a `Buff`. */
export const BUFF_CADENCE_WORD: Readonly<Record<BuffCadence, string>> = CADENCE_WORD

/** `Event` is shared by three live families that fire on different branches of the trick, so the
 *  word is narrowed by kind. MECHANICAL vocabulary, because every buff condition reads
 *  `playerWentHigh`, "did the player physically take the cards", NOT the outcome axis the bank and
 *  the damage read.
 *
 *  DLR-165 removed that collision at its source: the pill now uses the SAME two words the cards and
 *  the resolution headline do. The four-way scheme those words belong to is stated in `CLAUDE.md`.
 *
 *  `SKULL` on the two protective families is a DEVELOPER DECISION recorded in this contract's file
 *  map: they fire going high on a skull at bronze and on ANY Defeat at silver/gold, so no single
 *  High/Low word is true at both tiers. `SKULL` is accurate at bronze and merely incomplete above
 *  it; the card's own condition sentence carries the difference. PLACEHOLDER copy.
 *
 *  A `Partial` over the closed `BuffKind` union — the eight cut families fall through to
 *  `BUFF_CADENCE_WORD` via `BUFF_CADENCE`, through `buffCadenceWord` below. */
export const BUFF_EVENT_WORD: Partial<Readonly<Record<BuffKind, string>>> = {
  [BuffKind.SuitHigh]: 'HIGH',
  [BuffKind.SuitLow]: 'LOW',
  [BuffKind.SkullLow]: 'LOW',
  [BuffKind.SkullHelmet]: 'SKULL',
  [BuffKind.SkullTether]: 'SKULL',
}

/** The cadence word a buff's card states — never free text (AC9). */
export function buffCadenceWord(buff: Buff): string {
  return BUFF_EVENT_WORD[buff.kind] ?? BUFF_CADENCE_WORD[BUFF_CADENCE[buff.kind]]
}

/** AC5 — a card's payoff, split into what it pays and what it can cost. `risk` is `null` for every
 *  card in the pool today, which is what makes the split bar a SHAPE the component can render
 *  rather than a special case: a future card that costs the player something fills it in without
 *  the card's own branch reaching the renderer. */
export interface BuffPayoff {
  readonly gain: string
  /** Present only where the same figure can land on the player. */
  readonly risk: string | null
}

export function buffPayoff(buff: Buff): BuffPayoff {
  // DLR-167 — Curse pays TWO figures at gold, and `BuffReward` carries only the damage half
  // (`curseBuff`). Read through `CURSE_REWARD`, never as a literal, so a retuned ladder cannot
  // leave the card advertising a figure the engine will not honour. `risk` stays `null`: the card's
  // cost is a bad trick, not a figure landing on the player.
  if (buff.kind === BuffKind.Curse) {
    const reward = CURSE_REWARD[buff.tier]
    const gain =
      reward.multiplier > 0
        ? `+${reward.damage} damage, +${reward.multiplier} multiplier`
        : `+${reward.damage} damage`
    return { gain, risk: null }
  }
  return { gain: buffRewardPhrase(buff), risk: null }
}

/** AC10/DLR-148 fix-pass — the FACE-only rendering of `buffPayoff`. The face has a half-width box
 *  (measured: 33px at both 1440x900 and 1280x720) and `warCouncilBuffCard.css`'s
 *  `white-space: nowrap; overflow: hidden` clips an overlong phrase mid-word rather than wrapping
 *  it, so a card whose payoff does not fit abbreviates HERE while the full unabbreviated sentence
 *  — AC5's second half — stays in `buffCardAccessibleName` via `buffPayoff` above. No card in
 *  today's pool needs the abbreviation, so this is currently `buffPayoff` verbatim. */
export function buffPayoffFace(buff: Buff): BuffPayoff {
  return buffPayoff(buff)
}

/** The count suffix a stack states — `×N` only when there is more than one copy (AC7 wording, not
 *  a resource claim: "1 held" is not said, matching DLR-145 AC2's discipline against a claim that
 *  reads like a resource that isn't there). */
function buffCountSuffix(stack: BuffStack): string {
  return stack.count > 1 ? ` ×${stack.count}` : ''
}

/** PRESS cards are SPENT by the second tap and `Escape` cannot bring them back. */
export const BUFF_POISED_HINT_PRESS = 'Tap again to spend'

/** AC5's second half — the accessible name carries the whole sentence, both figures included, and
 *  `buffName(buff)` verbatim so `getByRole('button', { name: /Cheat \(/ })`-style queries in
 *  `WarCouncilRound.actionBar.test.tsx` keeps matching across the rewrite. */
export function buffCardAccessibleName(
  stack: BuffStack,
  poised: boolean,
  refusal: BuffActivationRefusal | null,
): string {
  const { buff } = stack
  const payoff = buffPayoff(buff)
  const payoffSentence = payoff.risk === null ? payoff.gain : `${payoff.gain}, ${payoff.risk}`
  const name = `${buffName(buff)} — ${buffConditionSentence(buff)}: ${payoffSentence}.${buffCountSuffix(stack)}`
  if (refusal !== null) return `${name} ${BUFF_ACTIVATION_REFUSAL_MESSAGE[refusal]}`
  if (!poised) return name
  const hint =
    BUFF_CADENCE[buff.kind] === BuffCadence.Activated ? BUFF_POISED_HINT_PRESS : BUFF_POISED_HINT
  return `${name} ${hint}`
}
