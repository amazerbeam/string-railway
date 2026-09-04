/**
 * DLR-160 AC6 — would applying this pot end the fight? Composes the SAME two calls
 * `applyPotAction` (`commitHandlers.ts`) makes when the player actually presses Apply, so the
 * Quarry's shields and the zero floor are INHERITED rather than restated. `duelHealthBars.ts`'s
 * `projectedDepletion` is the cautionary case this follows: it carried its own absorption
 * arithmetic and lied until DLR-115.
 *
 * Pure — no React, no DOM, no clock.
 */
import { applyDamage, isEncounterResolved, type EncounterState } from '../../hunt'
import { incomingFromPot } from '../../warCouncil'

export function potIsLethal(encounter: EncounterState, pot: number): boolean {
  // The caller can hand in an encounter already resolved by the same trick's own damage (a
  // skull's health loss, or pot damage folded in earlier) — routinely
  // true by the time the resolution view is built. `applyDamage` throws deliberately on an
  // already-resolved encounter (its own docblock, `src/hunt/encounter.ts`), so this asks first:
  // a finished fight cannot be un-ended by applying more pot, so it already answers `true`.
  if (isEncounterResolved(encounter)) {
    return true
  }
  return isEncounterResolved(applyDamage(encounter, incomingFromPot(pot)))
}
