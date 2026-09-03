import { describe, expect, it } from 'vitest'
import { BuffTier, DuelSide, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { TrickOutcome, type StreakState, type TrickResolution } from '../../../warCouncil'
import { BeatKind, resolutionBeatsFor } from '../resolutionBeats'

// Same construction idiom as `buffFiredLabels.test.ts`'s own `buff` helper.
const buff = (id: string, tier: BuffTier, buffId: number): Buff =>
  mintFromTemplate(templateById(id)!, tier, buffId)

const bladeTaker = buff('taker:bells:magnitude', BuffTier.Bronze, 1) // +1 DMG
const momentumTakerA = buff('taker:bells:multiplier', BuffTier.Bronze, 2) // +2 MULT
const momentumTakerB = buff('taker:bells:multiplier', BuffTier.Bronze, 3) // +2 MULT

const BEFORE: StreakState = { total: 12, roll: 2 }

/** `ui-notes.md` §3's worked run: three Bell-Takers riding, a Bells trick taken, opening total 12
 *  at roll 2 — Blade +1 DMG, then two Momentum +2 MULT, then the Overlap Bonus. */
const WORKED_RESOLUTION: TrickResolution = {
  outcome: TrickOutcome.CleanWin,
  trickDamage: {
    base: 1,
    buffDamage: 1,
    buffMult: 7, // 1 + (2 + 2) momentum + 2 overlap
    overlapBonus: 2, // overlapBonusFor(3) = 3 - 1
    dealt: 14, // (1 + 1) * 7
  },
  cashOut: 0,
  damageToPlayer: 0,
  total: 26, // 12 + 14
  roll: 3,
  timebombTarget: null,
  timebombToQuarry: 0,
  blastGuardSpent: false,
  buffAccrual: null,
  firedBuffIds: [bladeTaker.id, momentumTakerA.id, momentumTakerB.id],
}

const WORKED_FIRED: readonly Buff[] = [bladeTaker, momentumTakerA, momentumTakerB]

describe('resolutionBeatsFor — the worked run', () => {
  const beats = resolutionBeatsFor(WORKED_RESOLUTION, WORKED_FIRED, BEFORE)

  it('lands six beats in order: Base, Blade, Momentum, Momentum, Overlap, Banked', () => {
    expect(beats.map((beat) => beat.kind)).toEqual([
      BeatKind.Base,
      BeatKind.Blade,
      BeatKind.Momentum,
      BeatKind.Momentum,
      BeatKind.Overlap,
      BeatKind.Banked,
    ])
  })

  it('carries the running numbers 1, 2, 6, 10, 14 through the five arithmetic beats', () => {
    expect(beats.slice(0, 5).map((beat) => beat.running)).toEqual([1, 2, 6, 10, 14])
  })

  it('the LAST beat`s running equals resolution.trickDamage.dealt — the invariant this module must hold', () => {
    expect(beats[beats.length - 1]!.running).toBe(WORKED_RESOLUTION.trickDamage!.dealt)
  })

  it('the pot after banking is 78, at roll 3 — read off the resolution, not off a beat', () => {
    expect(WORKED_RESOLUTION.total * WORKED_RESOLUTION.roll).toBe(78)
    expect(WORKED_RESOLUTION.roll).toBe(3)
  })

  it('a Momentum beat leaves `damage` unchanged and only moves `mult`', () => {
    const [, blade, momentum1, momentum2] = beats
    expect(blade!.damage).toBe(2)
    expect(momentum1!.damage).toBe(2)
    expect(momentum1!.mult).toBe(3)
    expect(momentum2!.damage).toBe(2)
    expect(momentum2!.mult).toBe(5)
  })
})

describe('resolutionBeatsFor — edge shapes', () => {
  it('a bare banked trick (no buffs fired) produces exactly two beats: Base, Banked', () => {
    const resolution: TrickResolution = {
      ...WORKED_RESOLUTION,
      trickDamage: { base: 1, buffDamage: 0, buffMult: 1, overlapBonus: 0, dealt: 1 },
      total: 13,
      roll: 3,
      firedBuffIds: [],
    }
    const beats = resolutionBeatsFor(resolution, [], BEFORE)
    expect(beats.map((beat) => beat.kind)).toEqual([BeatKind.Base, BeatKind.Banked])
    expect(beats[beats.length - 1]!.running).toBe(1)
  })

  it('a single fired buff produces NO Overlap beat, because overlapBonusFor(1) is 0', () => {
    const resolution: TrickResolution = {
      ...WORKED_RESOLUTION,
      trickDamage: { base: 1, buffDamage: 1, buffMult: 1, overlapBonus: 0, dealt: 2 },
      total: 14,
      roll: 3,
      firedBuffIds: [bladeTaker.id],
    }
    const beats = resolutionBeatsFor(resolution, [bladeTaker], BEFORE)
    expect(beats.map((beat) => beat.kind)).toEqual([BeatKind.Base, BeatKind.Blade, BeatKind.Banked])
    expect(beats.some((beat) => beat.kind === BeatKind.Overlap)).toBe(false)
    expect(beats[beats.length - 1]!.running).toBe(2)
  })

  it('a hurt trick produces exactly one beat, Hurt, carrying the health taken and the pot lost', () => {
    const before: StreakState = { total: 12, roll: 2 }
    const resolution: TrickResolution = {
      outcome: TrickOutcome.CleanLoss,
      trickDamage: null,
      cashOut: 0,
      damageToPlayer: 2,
      total: 0,
      roll: 0,
      timebombTarget: DuelSide.Quarry,
      timebombToQuarry: 0,
      blastGuardSpent: false,
      buffAccrual: null,
      firedBuffIds: [],
    }
    const beats = resolutionBeatsFor(resolution, [], before)
    expect(beats).toHaveLength(1)
    expect(beats[0]!.kind).toBe(BeatKind.Hurt)
    expect(beats[0]!.amount).toBe(-2)
    expect(beats[0]!.label).toContain('2')
    // AC7 — no two-thirds consolation: the pot lost is the WHOLE pre-trick pot, 12 x 2 = 24.
    expect(beats[0]!.label).toContain('24')
  })

  it('DLR-161 — a hurt trick a Helmet kept the total through reports the pot ACTUALLY lost, not the whole pre-trick pot', () => {
    const before: StreakState = { total: 8, roll: 2 }
    const resolution: TrickResolution = {
      outcome: TrickOutcome.CleanLoss,
      trickDamage: null,
      cashOut: 0,
      damageToPlayer: 1,
      // The Helmet kept `total` at 8; `roll` still resets to 0.
      total: 8,
      roll: 0,
      timebombTarget: DuelSide.Quarry,
      timebombToQuarry: 0,
      blastGuardSpent: false,
      buffAccrual: null,
      firedBuffIds: [],
    }
    const beats = resolutionBeatsFor(resolution, [], before)
    expect(beats).toHaveLength(1)
    expect(beats[0]!.kind).toBe(BeatKind.Hurt)
    // Pre-trick pot 8 x 2 = 16, post-trick pot 8 x 0 = 0 — 16 actually lost.
    expect(beats[0]!.label).toBe('Hurt — −1 health, 16 pot lost')
  })

  it('DLR-161 — a hurt trick both cards protected reports 0 lost, since the whole pot survived', () => {
    const before: StreakState = { total: 8, roll: 2 }
    const resolution: TrickResolution = {
      outcome: TrickOutcome.CleanLoss,
      trickDamage: null,
      cashOut: 0,
      damageToPlayer: 1,
      // Both the Helmet and the Tether kept their figure.
      total: 8,
      roll: 2,
      timebombTarget: DuelSide.Quarry,
      timebombToQuarry: 0,
      blastGuardSpent: false,
      buffAccrual: null,
      firedBuffIds: [],
    }
    const beats = resolutionBeatsFor(resolution, [], before)
    expect(beats).toHaveLength(1)
    expect(beats[0]!.kind).toBe(BeatKind.Hurt)
    expect(beats[0]!.label).toBe('Hurt — −1 health, 0 pot lost')
  })

  it('DLR-161 — a hurt trick where a gold Helmet grows the total past the pre-trick pot clamps to 0, not negative', () => {
    const before: StreakState = { total: 8, roll: 2 }
    const resolution: TrickResolution = {
      outcome: TrickOutcome.CleanLoss,
      trickDamage: null,
      cashOut: 0,
      damageToPlayer: 1,
      // A gold Skull Helmet adds its +1 to `total` on top of the Tether keeping `roll` alive —
      // both figures survive AND grow: pre-trick pot 8 x 2 = 16, post-trick pot 9 x 2 = 18, a raw
      // difference of -2. The beat must clamp this to 0, never print a negative "pot lost".
      total: 9,
      roll: 2,
      timebombTarget: DuelSide.Quarry,
      timebombToQuarry: 0,
      blastGuardSpent: false,
      buffAccrual: null,
      firedBuffIds: [],
    }
    const beats = resolutionBeatsFor(resolution, [], before)
    expect(beats).toHaveLength(1)
    expect(beats[0]!.kind).toBe(BeatKind.Hurt)
    expect(beats[0]!.label).toBe('Hurt — −1 health, 0 pot lost')
  })

  it('DLR-156 B2 — a REPLACED clean loss (DLR-90 AC5, a primed card the Quarry wins cleanly) produces exactly one beat, Absorbed, not Hurt — nothing was actually lost', () => {
    const before: StreakState = { total: 12, roll: 2 }
    const resolution: TrickResolution = {
      outcome: TrickOutcome.CleanLoss,
      trickDamage: null,
      cashOut: 0,
      // The replaced branch's own signature: zero, because neither the ordinary hit nor a
      // Timebomb fired (`streak.ts`'s `trickHit`/`timebombResets` gate).
      damageToPlayer: 0,
      // Untouched — the whole point of the replacement (DLR-90 AC5).
      total: before.total,
      roll: before.roll,
      timebombTarget: DuelSide.Player,
      timebombToQuarry: 0,
      blastGuardSpent: false,
      buffAccrual: null,
      firedBuffIds: [],
    }
    const beats = resolutionBeatsFor(resolution, [], before)
    expect(beats).toHaveLength(1)
    expect(beats[0]!.kind).toBe(BeatKind.Absorbed)
    expect(beats[0]!.kind).not.toBe(BeatKind.Hurt)
    expect(beats[0]!.amount).toBe(0)
    // The wording must not claim a break that never happened.
    expect(beats[0]!.label.toLowerCase()).not.toContain('broken')
    expect(beats[0]!.label.toLowerCase()).not.toContain('hurt')
  })
})
