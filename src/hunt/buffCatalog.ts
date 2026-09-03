import {
  ACTIVATED_BUFF_CONDITION,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  type Buff,
  type BuffId,
} from './buffs'
import { shieldHeartsForTier } from './shield'
import type { Health } from './types'

/**
 * DLR-107 — Cheat as an ordinary `Buff` object, per design doc §1 ("both become ordinary
 * buff cards, owned and drawn the same way everything else in the pile is").
 *
 * DLR-132 closed the migration DLR-107 started: `cheatBuff` below is now the
 * ONE minting path — `buffTemplates.ts`'s `mintFromTemplate` delegates to it for its
 * `ActivatedBuffTemplate` — and the retired felt-rail widgets and their bespoke per-card state
 * machines, which used to duplicate this representation with a live mechanic, are deleted. The
 * effect now fires out of `app/warCouncil/buffHandlers.ts`'s `handleTapBuff`, beside Ward's,
 * through the SAME two-tap row every other buff uses. Cheat no longer exists twice.
 */

// DLR-107 AC1 — how many tricks a Cheat's follow-suit break lasts, by tier. TRANSCRIBED verbatim
// from AC1 ("{ bronze: 1, silver: 2, gold: 3 }") and from design doc §3 ("Cheat's tier is duration
// — how many tricks the follow-suit break lasts, not a magnitude"). NOT chosen here.
//
// Bronze's 1 IS today's behaviour: `LegalMoveOptions.ignoreFollowSuit` lifts follow-suit for
// exactly one committed card, so a bronze Cheat under the new model is the Cheat that ships today.
//
// GOLD IS NOT SAFE TO SHIP ACTIVE. This ticket's own Dependencies & Risks, and design doc §3, both
// flag three tricks of no-follow-suit as needing a costing pass first ("close to a guaranteed run
// of wins rather than one clutch save"). Nothing in `src/` activates a buff, so no player-reachable
// path can reach this row; the tiered-AP-cost ticket is what prices it.
// UNIT: tricks of no-follow-suit granted by one activation.
export const CHEAT_DURATION_TRICKS: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/** AC1 — mint a Cheat buff at `tier`. `id` is the caller's, minted from `RunState.nextBuffId` the
 *  same way `startingPile.ts`'s `seedStartingBuffPile` (now living there, not here) mints its own;
 *  this module never invents one and never calls `Math.random()`, because `src/hunt/` must stay
 *  deterministic. */
export function cheatBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Cheat,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.DurationTricks, value: CHEAT_DURATION_TRICKS[tier] },
  }
}

/** DLR-162 AC1 — mint a Wildcard at `tier`. NO condition and NO reward, which is what AC1 says:
 *  `ACTIVATED_BUFF_CONDITION` is the shared "the player pulls this" condition Cheat already uses,
 *  and the `None` axis at 0 is the honest pair — `buffRewardPhrase` already words that axis as
 *  "nothing", so no placeholder figure is invented.
 *
 *  The TIER IS CARRIED, not pinned: the reels award a tier and a three-of-a-kind readout says so,
 *  and handing over a bronze card under a "1 gold" line would make that readout a lie. All three
 *  tiers convert exactly one card (AC4) — whether a higher tier should do more is a design
 *  question this ticket routes to the developer, not a default to invent.
 *
 *  `id` is the CALLER's, from `RunState.nextBuffId`; this module never invents one and never calls
 *  `Math.random()`, because `src/hunt/` must stay deterministic. */
export function wildcardBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Wildcard,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.None, value: 0 },
  }
}

/** DLR-167 — Curse's two figures at one tier. A PAIR, not one number, because `BuffReward` is
 *  deliberately one axis and one value (DLR-105) and widening it for one card is a type change this
 *  codebase has twice declined to make.
 *  UNIT: `damage` in damage points added to the cursed trick's base; `multiplier` in multiplier
 *  points added to that trick's `buffMult`. */
export interface CurseBonus {
  readonly damage: number
  readonly multiplier: number
}

/** DLR-167 AC6, TRANSCRIBED verbatim — "bronze +1 damage; silver +2 damage; gold +2 damage and
 *  +1 multiplier". NOT chosen here, and the ticket's scope boundaries forbid retuning them in this
 *  contract: they ship as specified and get tuned by playing. */
export const CURSE_REWARD: Readonly<Record<BuffTier, CurseBonus>> = {
  [BuffTier.Bronze]: { damage: 1, multiplier: 0 },
  [BuffTier.Silver]: { damage: 2, multiplier: 0 },
  [BuffTier.Gold]: { damage: 2, multiplier: 1 },
}

/** DLR-167 AC1 — mint a Curse at `tier`. `condition` is the shared `ACTIVATED_BUFF_CONDITION`
 *  Cheat already uses: the player presses it, so it has no trigger. `reward` carries the DAMAGE
 *  half as its headline figure — the multiplier half is read through `curseRewardOf` below, which
 *  is the same split `BuffReward`'s one-axis shape forces on any two-figure card.
 *
 *  `id` is the CALLER's, from `RunState.nextBuffId`; this module never invents one and never calls
 *  `Math.random()`, because `src/hunt/` must stay deterministic. */
export function curseBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Curse,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.Magnitude, value: CURSE_REWARD[tier].damage },
  }
}

/**
 * Both of Curse's figures for this card's tier.
 *
 * THROWS on a buff of any other kind rather than returning a plausible pair, for
 * `cheatDurationTricksOf`'s stated reason and a sharper version of it: every figure here is a small
 * integer, so a swallowed version would quietly add another card's damage to a trick's base and
 * look entirely reasonable doing it.
 */
export function curseRewardOf(buff: Buff): CurseBonus {
  if (buff.kind !== BuffKind.Curse) {
    throw new RangeError(`Buff ${buff.id} is a ${buff.kind}, not a Curse — it has no curse reward`)
  }
  return CURSE_REWARD[buff.tier]
}

/** DLR-110 — mint a Shield buff at `tier`. On the `heartCount` axis `buffs.ts` and
 *  `.docs/implementation/hunt/buff-pile.md` already name as Shield's. `id` is the caller's, minted
 *  from `RunState.nextBuffId` exactly as `cheatBuff`'s is; this module never invents one.
 *
 *  Reads the tier table through `shieldHeartsForTier` rather than re-indexing `SHIELD_HEARTS`, so
 *  one tier has exactly one answer. */
export function shieldBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Shield,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.HeartCount, value: shieldHeartsForTier(tier) },
  }
}

/**
 * Blue hearts this Shield buff grants. Reads `buff.reward.value` — the figure the buff was MINTED
 * with — rather than re-indexing the tier table, so one object has exactly one answer, the rule
 * `cheatDurationTricksOf` sets.
 *
 * THROWS on a buff of any other kind rather than returning a number, for that function's reason and
 * a sharper version of it: a Cheat's duration is also a small integer, so a
 * swallowed version would grant a plausible-looking shield off the wrong card.
 */
export function shieldHeartsOf(buff: Buff): Health {
  if (buff.kind !== BuffKind.Shield) {
    throw new RangeError(
      `Buff ${buff.id} is a ${buff.kind}, not a Shield — it grants no blue hearts`,
    )
  }
  return buff.reward.value
}

/**
 * Tricks of no-follow-suit this Cheat buff grants. Reads `buff.reward.value` — the figure the buff
 * was MINTED with — rather than re-indexing the table, so one object has exactly one answer.
 *
 * THROWS on a buff of any other kind rather than returning a number, the discipline `spendConsumable`
 * already sets in this tree and for a sharper version of its reason: another activated card's
 * `reward.value` is also a small integer, so the swallowed version would silently lift follow-suit
 * for the wrong card and look entirely reasonable doing it.
 */
export function cheatDurationTricksOf(buff: Buff): number {
  if (buff.kind !== BuffKind.Cheat) {
    throw new RangeError(`Buff ${buff.id} is a ${buff.kind}, not a Cheat — it has no duration`)
  }
  return buff.reward.value
}
