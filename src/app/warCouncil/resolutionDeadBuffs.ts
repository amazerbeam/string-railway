/**
 * DLR-160 AC3 — the buffs armed for a trick that did not fire, and why. A SET DIFFERENCE and a
 * label, never a second reading of `buffFires`: composing the reason out of `buffLabels.ts`'s
 * existing `buffConditionSentence` is what keeps this from becoming a parallel table of per-family
 * miss reasons that would drift from `src/hunt/buffEvaluation.ts`'s total switch. The discipline
 * `buffProjection.ts`'s docblock sets out.
 *
 * This is the fix for the session's false bug report: a Key Low card was armed, pays only on a trick
 * the player goes LOW on, and the player went high — so it correctly paid nothing, and nothing on
 * screen said so.
 */
import { type Buff, type BuffId } from '../../hunt'
import { buffConditionSentence, buffName } from './buffLabels'

/** An id with no match in `candidates` is DROPPED rather than rendering `undefined` — the same
 *  rule `resolveFired` in `resolutionBeats.ts` and `buffFiredLabels.ts` already apply. */
export function deadBuffsFor(
  armedIds: readonly BuffId[],
  firedIds: readonly BuffId[],
  candidates: readonly Buff[],
): readonly Buff[] {
  return armedIds.flatMap((id) => {
    if (firedIds.includes(id)) return []
    const buff = candidates.find((candidate) => candidate.id === id)
    return buff === undefined ? [] : [buff]
  })
}

/** PLACEHOLDER copy. `needed:` plus the card's own condition — one grammar, not a second table. */
export function deadBuffReasonText(buff: Buff): string {
  return `${buffName(buff)} — needed: ${buffConditionSentence(buff)}`
}
