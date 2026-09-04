/**
 * DLR-156 — the resolution screen's build-up, derived from what the ENGINE already decided.
 *
 * Runs no rule of its own — the discipline `buffProjection.ts`'s docblock sets out, and
 * `cardDamage.ts`'s "performs no damage arithmetic" precedent. `resolveTrickBank` has already
 * computed `TrickResolution.trickDamage` and picked which buffs fired; this module only replays
 * those already-decided terms one at a time so the screen can narrate them. Pure and rendererless,
 * but lives in `src/app/warCouncil/` rather than `src/warCouncil/` because it produces WORDED
 * labels, and `src/warCouncil/` holds no user-facing copy.
 */
import { BuffRewardAxis, type Buff, type BuffId } from '../../hunt'
import { potValue, type StreakState, type TrickResolution } from '../../warCouncil'
import {
  absorbedBeatLabel,
  bankedBeatLabel,
  baseBeatLabel,
  bladeBeatLabel,
  hurtBeatLabel,
  momentumBeatLabel,
  overlapBeatLabel,
} from './resolutionLabels'

export const BeatKind = {
  Base: 'base', // AC1's baseDamage (+ baseDamageBonus)
  Blade: 'blade', // a fired Blade card — moves DAMAGE
  Momentum: 'momentum', // a fired Momentum card — moves MULT only
  Overlap: 'overlap', // AC16 — the Overlap Bonus, its own beat
  Banked: 'banked', // the summary row: total and roll before -> after
  Hurt: 'hurt', // the hurt branch: health taken, pot lost
  // DLR-156 B2 — a REPLACED Low Defeat (DLR-90 AC5): `trickDamage === null` (not TAKEN) but
  // NOTHING reset — no health taken, total and roll stand. Distinct from `Hurt` because the
  // wording is genuinely different, not a cosmetic variant of it.
  Absorbed: 'absorbed',
} as const
export type BeatKind = (typeof BeatKind)[keyof typeof BeatKind]

export interface ResolutionBeat {
  readonly kind: BeatKind
  /** Already-worded label — `src/app/warCouncil/` owns copy, the engine does not. */
  readonly label: string
  /** The signed contribution, for the row's `+1 DMG` / `+2 MULT` figure. */
  readonly amount: number
  /** The running DAMAGE register after this beat. */
  readonly damage: number
  /** The running MULT register after this beat. */
  readonly mult: number
  /** `damage * mult` after this beat — the number the screen animates. */
  readonly running: number
}

/** THE one id -> `Buff` resolution in this module, mirroring `buffFiredLabels.ts`'s
 *  `resolveFired`: an id with no match is DROPPED rather than rendering `undefined`. */
function resolveFired(firedBuffIds: readonly BuffId[], fired: readonly Buff[]): readonly Buff[] {
  return firedBuffIds.flatMap((id) => {
    const buff = fired.find((candidate) => candidate.id === id)
    return buff === undefined ? [] : [buff]
  })
}

/** Derives the whole sequence from what the ENGINE decided. Runs no rule of its own — the
 *  discipline `buffProjection.ts`'s docblock sets out.
 *
 *  A HURT trick (`resolution.trickDamage === null`) produces exactly ONE beat. Two shapes:
 *  ordinarily `Hurt`, stating the health taken and the pot that was lost with it (AC7: no
 *  two-thirds consolation, so the pot lost is the DIFFERENCE between the pre-trick pot and the
 *  post-trick pot — DLR-161: a Skull Helmet, a Skull Tether or a Swan rung can carry a figure
 *  through the reset, and reporting the whole pre-trick pot would narrate a streak as wiped when
 *  it in fact survived) — but a REPLACED Low Defeat (DLR-90 AC5, a primed card the Quarry takes cleanly)
 *  resets NOTHING: `resolution.damageToPlayer === 0` is then a total and reliable test (§
 *  `streak.ts`'s own `trickHit` gate: it being true always makes
 *  `damageToPlayer` positive, so `0` here can only mean neither fired), and the beat is
 *  `Absorbed` instead — narrating that nothing was lost rather than a broken streak that never
 *  broke.
 *
 *  A BANKED trick opens on `Base`, then one beat per id in `resolution.firedBuffIds`, in that
 *  order, classified `Blade` or `Momentum` by the fired buff's own reward axis; any other axis
 *  contributes nothing to THIS trick's damage (DLR-156 AC11) and gets no beat. The Overlap Bonus
 *  gets its own beat only when it is non-zero (AC16) — `overlapBonusFor(1)` is 0, so a single
 *  fired buff never produces one. The sequence closes on `Banked`, which adds nothing itself: its
 *  `damage`/`mult`/`running` carry the final trick figures forward unchanged, so the LAST beat's
 *  `running` always equals `resolution.trickDamage.dealt`. */
export function resolutionBeatsFor(
  resolution: TrickResolution,
  fired: readonly Buff[],
  before: StreakState,
): readonly ResolutionBeat[] {
  const { trickDamage } = resolution

  if (trickDamage === null) {
    if (resolution.damageToPlayer === 0) {
      return [
        {
          kind: BeatKind.Absorbed,
          label: absorbedBeatLabel(),
          amount: 0,
          damage: 0,
          mult: 0,
          running: 0,
        },
      ]
    }
    // DLR-161 — the pot ACTUALLY lost, not the whole pre-trick pot. A Skull Helmet, a Skull
    // Tether or a Swan rung can carry a figure through the reset, and the old expression narrated
    // the full pot as gone on a trick where most of it survived. The raw difference CAN be
    // negative: a gold protective save adds its bonus to a figure that survives the reset
    // alongside the other figure also surviving, so the post-trick pot can come out higher than
    // the pre-trick one on a hurt trick (worked case: `before = { total: 8, roll: 2 }`, a gold
    // Skull Helmet and a Skull Tether both fire — `potValue(8, 2) = 16`, `potValue(9, 2) = 18`,
    // raw difference `-2`). This beat reports LOSS and has no vocabulary for a hurt trick that
    // grew the streak, so it clamps to zero rather than print a negative "pot lost". This module
    // still runs no rule of its own beyond that clamp — it subtracts two figures the engine
    // decided.
    const potLost = Math.max(
      0,
      potValue(before.total, before.roll) - potValue(resolution.total, resolution.roll),
    )
    return [
      {
        kind: BeatKind.Hurt,
        label: hurtBeatLabel(resolution.damageToPlayer, potLost),
        amount: -resolution.damageToPlayer,
        damage: 0,
        mult: 0,
        running: 0,
      },
    ]
  }

  const beats: ResolutionBeat[] = []
  let damage = trickDamage.base
  let mult = 1
  beats.push({
    kind: BeatKind.Base,
    label: baseBeatLabel(trickDamage.base),
    amount: trickDamage.base,
    damage,
    mult,
    running: damage * mult,
  })

  const orderedFired = resolveFired(resolution.firedBuffIds, fired)
  for (const buff of orderedFired) {
    const amount = buff.reward.value
    if (buff.reward.axis === BuffRewardAxis.Magnitude) {
      damage += amount
      beats.push({
        kind: BeatKind.Blade,
        label: bladeBeatLabel(buff, amount),
        amount,
        damage,
        mult,
        running: damage * mult,
      })
    } else if (buff.reward.axis === BuffRewardAxis.Multiplier) {
      mult += amount
      beats.push({
        kind: BeatKind.Momentum,
        label: momentumBeatLabel(buff, amount),
        amount,
        damage,
        mult,
        running: damage * mult,
      })
    }
    // Any other reward axis (Coins, ApRefund, …) contributes nothing to THIS trick's damage
    // (DLR-156 AC11) and gets no beat here — it still pays through `resolveFiredBuffs` elsewhere.
  }

  if (trickDamage.overlapBonus > 0) {
    mult += trickDamage.overlapBonus
    beats.push({
      kind: BeatKind.Overlap,
      label: overlapBeatLabel(trickDamage.overlapBonus, orderedFired.length),
      amount: trickDamage.overlapBonus,
      damage,
      mult,
      running: damage * mult,
    })
  }

  const after: StreakState = { total: resolution.total, roll: resolution.roll }
  beats.push({
    kind: BeatKind.Banked,
    label: bankedBeatLabel(before, after),
    amount: 0,
    damage,
    mult,
    running: damage * mult,
  })

  return beats
}
