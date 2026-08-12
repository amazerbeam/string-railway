import type { StandingBand } from '../../hunt'

/** One bracket of the configured table, prepared for rendering. */
export interface TrackSegment {
  readonly band: StandingBand
  /** `maxTricks − minTricks + 1` — the segment's flex-grow, making the x-axis trick count. */
  readonly span: number
  /** The multiplier as a percentage of the table's largest. The minimum-height floor that
   *  keeps a ×0.5 bar visible is applied in CSS, so no visual value lives here. */
  readonly heightPct: number
  readonly isPeak: boolean
  readonly isCliff: boolean
  readonly isCurrent: boolean
  /** 0-based index of the current trick's pip within this segment, or `null` if not here. */
  readonly currentPipIndex: number | null
}

/**
 * Turns the configured Standing table into renderable geometry. Writes no multiplier and no
 * band boundary of its own: spans come from each row's own trick range, heights from the
 * multiplier ratio, and peak/cliff from the table's extremes — so retuning
 * `src/hunt/config.ts` redraws the track, including at a different row count.
 *
 * An out-of-range `tricks` yields no current segment rather than throwing: this is a readout
 * drawn on every render, including before the first trick, and a throw here would blank the
 * screen. That is deliberately the opposite of `huntDamage`, which throws because it commits
 * damage. An EMPTY table does throw — `Math.max()` of nothing is `-Infinity`, and dividing by
 * it yields a `NaN` height that collapses every bar with nothing logged anywhere.
 */
export function standingSegments(
  table: readonly StandingBand[],
  tricks: number,
): readonly TrackSegment[] {
  if (table.length === 0) {
    throw new RangeError('Cannot build a Standing track from an empty multiplier table')
  }

  const multipliers = table.map((band) => band.multiplier)
  const top = Math.max(...multipliers)
  const low = Math.min(...multipliers)

  return table.map((band) => {
    const isCurrent = tricks >= band.minTricks && tricks <= band.maxTricks
    return {
      band,
      span: band.maxTricks - band.minTricks + 1,
      heightPct: (band.multiplier / top) * 100,
      isPeak: band.multiplier === top,
      isCliff: band.multiplier === low,
      isCurrent,
      currentPipIndex: isCurrent ? tricks - band.minTricks : null,
    }
  })
}
