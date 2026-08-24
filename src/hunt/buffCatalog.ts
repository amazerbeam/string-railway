import {
  ACTIVATED_BUFF_CONDITION,
  BuffKind,
  BuffRewardAxis,
  BuffTier,
  type Buff,
  type BuffId,
} from './buffs'
import { TIMEBOMB_PLAYER_DAMAGE, TIMEBOMB_QUARRY_DAMAGE } from './config'
import { shieldHeartsForTier } from './shield'
import { DuelSide, type Damage, type Health } from './types'

/**
 * DLR-107 — Cheat and Timebomb as ordinary `Buff` objects, per design doc §1 ("both become ordinary
 * buff cards, owned and drawn the same way everything else in the pile is").
 *
 * DLR-132 closed the migration DLR-107 started: `cheatBuff` and `timebombBuff` below are now the
 * ONE minting path — `buffTemplates.ts`'s `mintFromTemplate` delegates to them for its two
 * `ActivatedBuffTemplate`s — and the retired felt-rail widgets and their bespoke per-card state
 * machines, which used to duplicate this representation with a live mechanic, are deleted. Both
 * effects now fire out of `app/warCouncil/buffHandlers.ts`'s `handleTapBuff`, beside Ward's,
 * through the SAME two-tap row every other buff uses. Cheat and Timebomb no longer exist twice.
 */

/** A Timebomb's two figures at one tier, keyed by the side that PAYS. A PAIR, not one number, for
 *  the reason `config.ts` already gives for `TIMEBOMB_QUARRY_DAMAGE` and `TIMEBOMB_PLAYER_DAMAGE`
 *  being two keys: the player's hit is deliberately smaller because it ALSO forces the streak's
 *  cash-out, and a single shared figure is the bug that type-checks, reads correctly, and pays the
 *  wrong side.
 *
 *  DLR-132 — retyped from an interface with `quarry`/`player` fields to a `DuelSide`-keyed record.
 *  `DuelSide.Quarry === 'quarry'` and `DuelSide.Player === 'player'` are exactly those two field
 *  names, so every existing `TIMEBOMB_DAMAGE[tier].quarry` read still compiles unchanged, and the
 *  pair can now ALSO be indexed as `pair[target]` — which is what lets `timebombDamageFor` in
 *  `encounter.ts` be DELETED rather than duplicated (four tickets nominated this collapse). */
export type TimebombDamage = Readonly<Record<DuelSide, Damage>>

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

// DLR-107 AC2 — RESOLVES design doc §3's open question, and this comment IS the record AC2 asks for
// rather than a silent decision.
//
// §3 asked: does a higher Timebomb tier raise ONLY the Quarry-side damage (strictly better to pull,
// the same 2-health risk at every tier), or does it keep today's 2:1 ratio and scale BOTH sides
// (bigger reward, proportionally costlier backfire)?
//
// RESOLVED: scale BOTH sides, on today's ratio — the reading AC2 names as the default. The rejected
// reading makes a gold Timebomb a free upgrade with no added downside, which removes the very
// decision the mechanic exists to pose.
//
// THE VALUES 1/2/3 ARE A TUNING DECISION THE DEVELOPER OWNS. Neither the ticket nor §3 states
// Timebomb's tier magnitudes; this default is taken from the only tier curves the sources do state
// — AC1's Cheat duration above, and §3's Shield bullet ("Bronze adds 1, silver 2, gold 3"). It
// yields 4/8/12 to the Quarry and 2/4/6 to the player. A gold Timebomb costing 6 of a 10-point
// player bar is a large self-inflicted hit and may want a flatter curve after a playtest.
// UNIT: dimensionless multiplier applied to today's bronze figures.
export const TIMEBOMB_TIER_MULTIPLIER: Readonly<Record<BuffTier, number>> = {
  [BuffTier.Bronze]: 1,
  [BuffTier.Silver]: 2,
  [BuffTier.Gold]: 3,
}

/**
 * The table AC2 names. DERIVED, not hand-written: the multiplier above is applied to BOTH of
 * today's live figures, so the 2:1 ratio AC2 asks to preserve holds as arithmetic rather than as
 * three pairs of numbers that could drift apart under an edit.
 *
 * It also means the bronze row IS today's live pair by construction rather than by coincidence —
 * retuning `TIMEBOMB_QUARRY_DAMAGE` moves this table with it, which is what makes the migration
 * incapable of silently diverging from the mechanic it migrates.
 *
 * Both operands are integers and the multipliers are integers, so every product is exact — this
 * needs none of the numerator/denominator treatment `FORCED_CASH_OUT_*` required in `config.ts`.
 * UNIT: health points, applied once, to one side, at the resolution of the next trick.
 */
export const TIMEBOMB_DAMAGE: Readonly<Record<BuffTier, TimebombDamage>> = {
  [BuffTier.Bronze]: timebombRow(BuffTier.Bronze),
  [BuffTier.Silver]: timebombRow(BuffTier.Silver),
  [BuffTier.Gold]: timebombRow(BuffTier.Gold),
}

/** AC1 — mint a Cheat buff at `tier`. `id` is the caller's, minted from `RunState.nextBuffId` the
 *  same way `seedStartingBuffPile`'s are; this module never invents one and never calls
 *  `Math.random()`, because `src/hunt/` must stay deterministic. */
export function cheatBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Cheat,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.DurationTricks, value: CHEAT_DURATION_TRICKS[tier] },
  }
}

/** AC2 — mint a Timebomb buff at `tier`. The reward carries the QUARRY-side figure, which is the
 *  headline number; the paired player figure comes back from `timebombDamageOf`. `BuffReward` is
 *  deliberately one axis and one value (DLR-105, which flags multi-value rewards as an open
 *  question design doc §5 itself defers), and widening it is not this ticket's call. */
export function timebombBuff(tier: BuffTier, id: BuffId): Buff {
  return {
    id,
    kind: BuffKind.Timebomb,
    tier,
    condition: ACTIVATED_BUFF_CONDITION,
    reward: { axis: BuffRewardAxis.Magnitude, value: TIMEBOMB_DAMAGE[tier].quarry },
  }
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
 * a sharper version of it: a Cheat's duration and a Timebomb's damage are also small integers, so a
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
 * already sets in this tree and for a sharper version of its reason: a Timebomb's
 * `reward.value` is also a small integer, so the swallowed version would silently lift follow-suit
 * for the wrong card and look entirely reasonable doing it.
 */
export function cheatDurationTricksOf(buff: Buff): number {
  if (buff.kind !== BuffKind.Cheat) {
    throw new RangeError(`Buff ${buff.id} is a ${buff.kind}, not a Cheat — it has no duration`)
  }
  return buff.reward.value
}

/**
 * Both figures this Timebomb buff owes. Reads the TIER table rather than `buff.reward.value`,
 * because the caller needs the pair and `reward` carries only the Quarry half.
 *
 * THROWS on a buff of any other kind, for `cheatDurationTricksOf`'s reason.
 */
export function timebombDamageOf(buff: Buff): TimebombDamage {
  if (buff.kind !== BuffKind.Timebomb) {
    throw new RangeError(`Buff ${buff.id} is a ${buff.kind}, not a Timebomb — it owes no damage`)
  }
  return TIMEBOMB_DAMAGE[buff.tier]
}

/** One row of `TIMEBOMB_DAMAGE`. A helper rather than three inline expressions so the "multiply
 *  BOTH sides" rule is stated once and cannot be applied to one side by mistake. */
function timebombRow(tier: BuffTier): TimebombDamage {
  return {
    [DuelSide.Quarry]: TIMEBOMB_QUARRY_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
    [DuelSide.Player]: TIMEBOMB_PLAYER_DAMAGE * TIMEBOMB_TIER_MULTIPLIER[tier],
  }
}
