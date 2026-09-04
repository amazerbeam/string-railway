/**
 * The cabinet's spin timings, in one place. UNIT: milliseconds.
 *
 * `SPIN_TOTAL_MS` is the DEVELOPER'S figure — they asked for two seconds for the whole animation.
 * Everything else below is derived from it or is a PLACEHOLDER split the developer owns: how the
 * three reels stagger inside those two seconds, and how long the result takes to arrive after the
 * last one lands, are feel questions that need playing rather than deciding on paper.
 */

/** The whole animation, first movement to last reel settled. The developer's number. */
export const SPIN_TOTAL_MS = 2000

/** How much sooner each earlier reel stops. Reel 3 lands at `SPIN_TOTAL_MS`; reel 2 at
 *  `SPIN_TOTAL_MS - REEL_STAGGER_MS`; reel 1 at `SPIN_TOTAL_MS - 2 * REEL_STAGGER_MS`. A
 *  PLACEHOLDER: too small and the three read as one thud, too large and reel 1 feels finished
 *  before the pull has begun. */
export const REEL_STAGGER_MS = 320

/** How long the cabinet holds every reel still before the outcome and the cards appear, so the
 *  match is read off the payline first and the words confirm it rather than pre-empting it.
 *  Sits OUTSIDE `SPIN_TOTAL_MS` — the two seconds are the reels' own. PLACEHOLDER. */
export const RESULT_REVEAL_MS = 260

/** Under `prefers-reduced-motion`, no reel travels: each window cross-fades straight to its
 *  landed symbol and the result follows. One short beat, so the change is still perceived as a
 *  pull rather than as the screen having always said that. PLACEHOLDER. */
export const REDUCED_MOTION_MS = 320

/** When reel `index` (0-based) comes to rest. */
export function reelStopMs(index: number, reelCount: number): number {
  return SPIN_TOTAL_MS - (reelCount - 1 - index) * REEL_STAGGER_MS
}
