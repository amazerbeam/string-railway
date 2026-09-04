/**
 * DLR-156 — wording for the resolution screen's build-up beats. `src/warCouncil/` and `src/hunt/`
 * hold no user-facing copy (`voluntaryCashOut.ts`'s own docblock states that rule, and
 * `buffFiredLabels.ts` is the surviving precedent), so every string a beat carries is authored
 * here rather than in the engine.
 *
 * PLACEHOLDER copy, as every string on this screen is — `ui-notes.md` §3's worked table is the
 * wording this module transcribes, not a final copy pass.
 */
import type { Buff } from '../../hunt'
import type { StreakState } from '../../warCouncil'
import { buffName } from './buffLabels'

/** `Base damage +1`. */
export function baseBeatLabel(base: number): string {
  return `Base damage +${base}`
}

/** `Bell High (Blade) bronze +1 DMG` — the tier word is not carried on `Buff` itself, so this
 *  states the card's name and its own printed value only, matching `ui-notes.md` §3's table. */
export function bladeBeatLabel(buff: Buff, amount: number): string {
  return `${buffName(buff)} +${amount} DMG`
}

/** `Bell High (Momentum) bronze +2 MULT`. */
export function momentumBeatLabel(buff: Buff, amount: number): string {
  return `${buffName(buff)} +${amount} MULT`
}

/** `Overlap Bonus +2 MULT (3 fired − 1)` — `firedCount` is stated for legibility; the `- 1` is
 *  never recomputed here, only printed, since `overlapBonusFor` already decided it. */
export function overlapBeatLabel(bonus: number, firedCount: number): string {
  return `Overlap Bonus +${bonus} MULT (${firedCount} fired − 1)`
}

/** `Banked — total 12→26, roll 2→3`. */
export function bankedBeatLabel(before: StreakState, after: StreakState): string {
  return `Banked — total ${before.total}→${after.total}, roll ${before.roll}→${after.roll}`
}

/** `Hurt — −2 health, 24 pot lost`. */
export function hurtBeatLabel(damageToPlayer: number, potLost: number): string {
  return `Hurt — −${damageToPlayer} health, ${potLost} pot lost`
}

/** DLR-156 B2 — the trick that neither banked nor hurt: `resolveTrickBank` wrote no `trickDamage`
 *  AND no `damageToPlayer`, so nothing was actually lost. `hurtBeatLabel` said "Hurt" and named a
 *  pot that was never touched — this is the correct, separate wording for the branch that costs
 *  nobody anything.
 *
 *  DLR-166 fix pass — the prime is DELETED, so the original trigger (a primed card the Quarry took
 *  cleanly, DLR-90 AC5) is gone with it. The branch is retained because it is stated over the
 *  RESOLUTION's own two figures rather than over any one mechanic, which is what makes it total;
 *  the copy no longer names a card that does not exist. PLACEHOLDER wording, the developer's. */
export function absorbedBeatLabel(): string {
  return 'Absorbed — this trick cost nothing; the streak stands'
}

/**
 * The resolution screen's header once Apply Damage has been pressed and the hold has begun
 * (`ui-notes.md` §4: "the header changes to name what happened"). Names the target generically —
 * `quarryHealthLabel`'s own docblock states DLR-85's deliberate choice to keep the FIGHT screen
 * generic and reserve the opponent's own name for run-level surfaces — rather than the mockup's
 * illustrative "Dealt to Aoife".
 */
export function appliedHoldLabel(): string {
  return 'dealt to the Quarry'
}

/** The header once Roll over has been pressed and the hold has begun — names the streak this
 *  trick is carrying forward, distinct from the hurt branch's Onward, which changes nothing (the
 *  header stays whatever it already said). */
export function rolledOverHoldLabel(nextRoll: number): string {
  return `rolled over — roll now ×${nextRoll}`
}
