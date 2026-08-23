export const BuffTier = {
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
} as const
export type BuffTier = (typeof BuffTier)[keyof typeof BuffTier]

/**
 * DLR-107 — WHICH card a buff is. DLR-105 shipped `Buff` with no identity field: `condition.kind`
 * describes a TRIGGER, not a card, and overloading it would make "when this fires" and "what this
 * is" the same string. A closed `as const` map, not an `enum` — `erasableSyntaxOnly` is on
 * (`tsconfig.app.json`), the same reason `BuffTier` above takes this shape.
 *
 * `Unassigned` is what `seedStartingBuffPile` mints: the run's opening pile is still placeholder
 * content (DLR-105 AC4), and naming that keeps it obviously placeholder rather than silently
 * turning the four opening buffs into Cheats.
 */
export const BuffKind = {
  Unassigned: 'unassigned',
  Cheat: 'cheat',
  Timebomb: 'timebomb',
} as const
export type BuffKind = (typeof BuffKind)[keyof typeof BuffKind]

/** Minted from `RunState.nextBuffId`, never from `Math.random()` — `src/hunt/` is
 *  lint-enforced DOM-free and must stay deterministic, exactly as `CheatCardId` already is. */
export type BuffId = number

/** AC1's three known reward axes — the tier-scaled quantity varies PER CARD, not a fixed
 *  "damage" field. Closed union deliberately: this is exactly what AC1's own risk note asks
 *  to be reviewed before this ticket is marked done. A fourth axis is a type change for
 *  whichever later ticket needs it. */
export const BuffRewardAxis = {
  Magnitude: 'magnitude',
  DurationTricks: 'durationTricks',
  HeartCount: 'heartCount',
} as const
export type BuffRewardAxis = (typeof BuffRewardAxis)[keyof typeof BuffRewardAxis]

/** A data-only descriptor — no evaluator. AC4 defers activation logic to a later ticket;
 *  `kind` is an open string because the real condition catalog (design doc §5) is explicitly
 *  "TO BE REVIEWED, not committed." */
export interface BuffCondition {
  readonly kind: string
}

/** The tier-scaled payoff. `axis` names WHICH quantity this buff's tier scales (magnitude,
 *  duration, or heart count); `value` is this buff's current tier's figure on that axis. */
export interface BuffReward {
  readonly axis: BuffRewardAxis
  readonly value: number
}

/** One owned buff. Carries no evaluation logic — condition matching and reward application are
 *  a later ticket's job (T5). */
export interface Buff {
  readonly id: BuffId
  /** DLR-107 — WHICH card this is. Required: every construction site names it, so a buff can never
   *  exist without an identity. */
  readonly kind: BuffKind
  readonly tier: BuffTier
  readonly condition: BuffCondition
  readonly reward: BuffReward
}

/**
 * The starting pile's placeholder content — every seeded buff shares this inert condition and
 * a zero-value reward, since the real catalog (design doc §5) is not yet authored (DLR-103 T7a)
 * and AC4 rules out anything reading these values yet. Exported so the seeding test can assert
 * against it without duplicating the literal.
 */
export const UNASSIGNED_BUFF_CONDITION: BuffCondition = { kind: 'unassigned' }
export const UNASSIGNED_BUFF_REWARD: BuffReward = { axis: BuffRewardAxis.Magnitude, value: 0 }

/**
 * DLR-107 — the condition for a buff the PLAYER pulls rather than one that fires on a trigger.
 * Cheat and Timebomb are both activated deliberately, per design doc §1 ("held in the pile and
 * sprung in response to what's actually happening"), so neither has a trigger to describe.
 * Shared by both rather than one per card: there is one thing being said here, not two.
 */
export const ACTIVATED_BUFF_CONDITION: BuffCondition = { kind: 'activated' }

/**
 * AC3 — the run's opening pile: `count` bronze buffs, all placeholder content, with
 * consecutive ids starting at `firstId`. Mirrors `grantCheats`'s `(count, firstId)` shape but
 * carries no upper-bound throw: unlike `CHEAT_SLOT_COUNT`, no capacity cap is stated anywhere in
 * this ticket's scope for the buff pile (see plan.md's Assumptions).
 */
export function seedStartingBuffPile(count: number, firstId: BuffId): readonly Buff[] {
  return Array.from({ length: count }, (_, i) => ({
    id: firstId + i,
    kind: BuffKind.Unassigned,
    tier: BuffTier.Bronze,
    condition: UNASSIGNED_BUFF_CONDITION,
    reward: UNASSIGNED_BUFF_REWARD,
  }))
}
