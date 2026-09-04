import { BuffKind, BuffRewardAxis, BuffTier, type Buff } from './buffs'

/**
 * DLR-161 — which of the streak's two figures a trick's fired buffs save, and by how much.
 *
 * States NO condition of its own. It receives buffs that `firedBuffs` has already decided fired,
 * exactly as `resolveFiredBuffs` does, and reads only their kind, axis and reward value — the
 * discipline `buffProjection.ts`'s docblock sets out, and the reason there is no second copy of
 * `buffFires` anywhere in this tree.
 *
 * On the reward VALUE being 0 at bronze and silver: that zero is real, not this codebase's
 * "plausible zero that type-checks". Protection is binary and is carried by the buff having fired
 * at all; the value is AC6's gold bonus added on top of the figure that survived. There is
 * deliberately no way to express "protects by N" — a total either survives or it does not.
 *
 * DLR-165 renamed `protectionCoversCleanLoss` to `protectionCoversLowDefeat`: the widened tiers
 * cover any Defeat, and "clean loss" is retired vocabulary. No predicate changed.
 */

/** The two families whose reward axis is `Protection`. */
export type BuffProtectiveKind = typeof BuffKind.SkullHelmet | typeof BuffKind.SkullTether

export interface StreakProtection {
  /** A Skull Helmet fired: `total` survives the reset. */
  readonly keepsTotal: boolean
  /** A Skull Tether fired: `roll` survives the reset. */
  readonly keepsRoll: boolean
  /** AC6 — added to the surviving `total`. 0 below gold. UNIT: damage. */
  readonly totalBonus: number
  /** AC6 — added to the surviving `roll`. 0 below gold. UNIT: tricks. */
  readonly rollBonus: number
}

export const NO_STREAK_PROTECTION: StreakProtection = {
  keepsTotal: false,
  keepsRoll: false,
  totalBonus: 0,
  rollBonus: 0,
}

const PROTECTIVE_KINDS: ReadonlySet<BuffKind> = new Set([
  BuffKind.SkullHelmet,
  BuffKind.SkullTether,
])

export function isProtectiveKind(kind: BuffKind): kind is BuffProtectiveKind {
  return PROTECTIVE_KINDS.has(kind)
}

/** AC5 — silver and gold widen the condition from a High Defeat to ANY Defeat. A
 *  total `Record` rather than `tier !== Bronze`, so a fourth tier is a compile error here. */
const COVERS_LOW_DEFEAT: Readonly<Record<BuffTier, boolean>> = {
  [BuffTier.Bronze]: false,
  [BuffTier.Silver]: true,
  [BuffTier.Gold]: true,
}

/** THE one statement of AC5's widening. `buffFires` reads it to decide whether the card fires;
 *  `buffConditionSentence` reads it to decide which sentence the card face prints. Two readers,
 *  one rule — the shape `conditionThresholdOf` already established for a tier-scaled condition. */
export function protectionCoversLowDefeat(tier: BuffTier): boolean {
  return COVERS_LOW_DEFEAT[tier]
}

/** The same question for a whole buff, so the label layer asks once rather than composing two. */
export function conditionIsWidened(buff: Buff): boolean {
  return isProtectiveKind(buff.kind) && protectionCoversLowDefeat(buff.tier)
}

/** AC8 — protection does not stack. Bonuses fold with `Math.max`, never a sum: two gold Helmets
 *  on one trick add 1, not 2, because a total either survives or it does not. Both copies are
 *  still SPENT, which is the arming layer's business and deliberately not this function's. */
export function streakProtectionFor(fired: readonly Buff[]): StreakProtection {
  return fired.reduce<StreakProtection>((running, buff) => {
    if (buff.reward.axis !== BuffRewardAxis.Protection) return running
    if (buff.kind === BuffKind.SkullHelmet) {
      return {
        ...running,
        keepsTotal: true,
        totalBonus: Math.max(running.totalBonus, buff.reward.value),
      }
    }
    if (buff.kind === BuffKind.SkullTether) {
      return {
        ...running,
        keepsRoll: true,
        rollBonus: Math.max(running.rollBonus, buff.reward.value),
      }
    }
    return running
  }, NO_STREAK_PROTECTION)
}
