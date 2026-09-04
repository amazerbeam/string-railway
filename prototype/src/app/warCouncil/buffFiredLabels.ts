/**
 * DLR-119 — what fired, and what the overlap paid. DLR-125 gave `buffAccrual` a caller, so
 * activated buffs genuinely pay on all four axes now — but nothing on screen names the cause, and
 * the Overlap Bonus (`+(k-1)` Momentum, `hybrid-design.md` §5 R5) fires on real play for the first
 * time and is the least intuitive figure in the stacking rule.
 *
 * Composes only: `buffName` and `buffRewardPhrase` for a card's name and reward (`buffLabels.ts`),
 * and `overlapBonusFor` for the bonus (`src/hunt/buffAccrual.ts`). `k - 1` is NEVER re-derived
 * here — R5's own argument against a quadratic basis lives in that function and this module must
 * not acquire a second reading of it.
 *
 * PLACEHOLDER copy, as every string on this screen is.
 */
import { overlapBonusFor, type Buff, type BuffId } from '../../hunt'
import { buffName, buffRewardPhrase } from './buffLabels'

/** The display names of the buffs that fired, in `firedBuffIds` order, each resolved against the
 *  offered pile. An id with no match is DROPPED — a sentence containing `undefined` is worse than
 *  a shorter sentence, and `firedOncePerHandIds` in `buffRoundState.ts` already treats an
 *  unresolvable id the same way. */
export function firedBuffNames(
  firedBuffIds: readonly BuffId[],
  offered: readonly Buff[],
): readonly string[] {
  return resolveFired(firedBuffIds, offered).map(buffName)
}

/** THE one id -> `Buff` resolution in this module, so `firedBuffNames` and `buffFiredText` can
 *  never disagree about which ids resolved. Mirrors `firedOncePerHandIds` in `buffRoundState.ts`,
 *  which resolves the same ids against the same pile the same way. */
function resolveFired(firedBuffIds: readonly BuffId[], offered: readonly Buff[]): readonly Buff[] {
  return firedBuffIds.flatMap((id) => {
    const buff = offered.find((candidate) => candidate.id === id)
    return buff === undefined ? [] : [buff]
  })
}

/** `Overlap Bonus +2 Momentum.` — `null` below two fired buffs, where `overlapBonusFor` is 0. */
export function overlapBonusText(firedCount: number): string | null {
  const bonus = overlapBonusFor(firedCount)
  return bonus > 0 ? `Overlap Bonus +${bonus} Momentum.` : null
}

/** The clause a resolved trick adds when buffs fired on it. `null` when none did — the felt then
 *  renders no element rather than an empty line. */
export function buffFiredText(
  firedBuffIds: readonly BuffId[],
  offered: readonly Buff[],
): string | null {
  const fired = resolveFired(firedBuffIds, offered)
  if (fired.length === 0) return null
  // DLR-119 review fix: the clauses join on '. ', not ' '. `buffRewardPhrase` never ends in a stop,
  // so a bare-space join ran three buffs together as
  // `Bell High (Momentum): +2 multiplier Key Low (Momentum): +2 multiplier …` — unparseable
  // aloud, and unparseable is the failure this ticket exists to fix. The multi-buff case is also
  // the ONLY one that matters here: `overlapBonusFor` pays nothing below two fired buffs, so the
  // run-on was exactly the shape a player would actually meet.
  const named = fired.map((buff) => `${buffName(buff)}: ${buffRewardPhrase(buff)}`).join('. ')
  const overlap = overlapBonusText(fired.length)
  return overlap === null ? `${named}.` : `${named}. ${overlap}`
}
