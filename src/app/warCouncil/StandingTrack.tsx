import type { StandingBand } from '../../hunt'
import { STANDING_BAND_NAME, STANDING_TRACK_LABEL } from './labels'
import { standingSegments } from './standingSegments'

interface StandingTrackProps {
  readonly table: readonly StandingBand[]
  readonly tricks: number
}

/**
 * The configured Standing table as a profile: the x-axis is trick count, so each bracket is
 * as wide as its trick span, and height is the multiplier — the ramp and the cliff are shapes
 * rather than six numerals to compare. Value reads through height first, so the design holds
 * without colour (`game-ux`) and needs no new colour token (`warCouncilHunt.css` header).
 *
 * Each bracket carries one pip per trick it covers, because in a flat bracket — 0-3 and 10-13
 * — the multiplier never moves while card value climbs, so the bar alone cannot say which of
 * those tricks you are on. The pips are nested inside their segment rather than laid across
 * the track as one row: the segment row's flex gaps and a track-wide pip row's gaps do not
 * divide the same width, so a shared row drifts out of register with the bracket edges.
 *
 * Renders no marker at all when `tricks` sits outside every bracket — see `standingSegments`.
 */
export default function StandingTrack({ table, tricks }: StandingTrackProps) {
  const segments = standingSegments(table, tricks)
  const current = segments.find((segment) => segment.isCurrent)

  return (
    <div className="wc-track" role="group" aria-label={STANDING_TRACK_LABEL}>
      {segments.map((segment) => (
        <span
          key={segment.band.minTricks}
          className={
            'wc-track-seg' +
            (segment.isPeak ? ' wc-is-peak' : '') +
            (segment.isCliff ? ' wc-is-cliff' : '') +
            (segment.isCurrent ? ' wc-is-current' : '')
          }
          style={{ flexGrow: segment.span, flexBasis: 0, height: `${segment.heightPct}%` }}
        >
          <span className="wc-track-mult" aria-hidden="true">
            ×{segment.band.multiplier}
          </span>
          <span className="wc-track-pips" aria-hidden="true">
            {Array.from({ length: segment.span }, (_, pip) => (
              <span
                key={pip}
                className={'wc-track-pip' + (segment.currentPipIndex === pip ? ' wc-is-here' : '')}
              />
            ))}
          </span>
        </span>
      ))}

      <span className="wc-track-ticks" aria-hidden="true">
        {segments.map((segment) => (
          <span
            key={segment.band.minTricks}
            className="wc-track-tick"
            style={{ flexGrow: segment.span, flexBasis: 0 }}
          >
            {segment.band.minTricks === segment.band.maxTricks
              ? segment.band.minTricks
              : `${segment.band.minTricks}-${segment.band.maxTricks}`}
          </span>
        ))}
      </span>

      {/* The accessible equivalent of the compact cell this replaces. Its wording differs from
          that cell's on purpose: jsdom applies no CSS, so both are in the accessibility tree
          during a component test and identical labels would make a label query match twice. */}
      <span className="wc-sr-only">
        {current
          ? `${STANDING_TRACK_LABEL}: ${STANDING_BAND_NAME[current.band.name]}, multiplier ${current.band.multiplier}, at ${tricks} tricks won`
          : `${STANDING_TRACK_LABEL}: no band for ${tricks} tricks won`}
      </span>
    </div>
  )
}
