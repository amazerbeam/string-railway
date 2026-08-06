import type { CSSProperties } from 'react'
import { cellKey, VanguardCellKind, type HexCoord, type VanguardCell } from '../../vanguard'
import { PlayerSide } from '../../warCouncil'
import type { HexPlacement } from './hexLayout'
import { cellAccessibleName } from './labels'

interface HexCellProps {
  readonly coord: HexCoord
  readonly cell: VanguardCell | undefined
  readonly bases: Readonly<Record<PlayerSide, HexCoord>>
  readonly placement: HexPlacement
  readonly cellWidthFraction: number
  readonly selectable: boolean // a legal, affordable target for the current tap
  readonly tabStop: boolean
  readonly onTap: (coord: HexCoord) => void
}

// Pointy-top hex geometry — the same ratio as hexLayout.ts's own (unexported)
// HEX_HEIGHT_TO_WIDTH. Duplicated deliberately: it is pure geometry, not a tunable, and
// this component computes no BOARD geometry of its own — it only needs one hexagon's own
// fixed height-to-width ratio to set the CSS aspect-ratio inline.
const HEX_HEIGHT_TO_WIDTH = 2 / Math.sqrt(3)

/**
 * One board cell as a native `<button>` (AC1, AC4). This component computes no geometry
 * beyond a single hexagon's own fixed aspect ratio — position and size come entirely from
 * `placement` and `cellWidthFraction`. Every colour, ring, hatch and reinforce mark is a CSS
 * rule in `vanguard.css` keyed off the `data-*` attributes set below; no colour or shape
 * value appears here.
 */
export default function HexCell({
  coord,
  cell,
  bases,
  placement,
  cellWidthFraction,
  selectable,
  tabStop,
  onTap,
}: HexCellProps) {
  const isBase =
    (coord.q === bases[PlayerSide.Player].q && coord.r === bases[PlayerSide.Player].r) ||
    (coord.q === bases[PlayerSide.Cpu].q && coord.r === bases[PlayerSide.Cpu].r)

  const kind = cell ? cell.kind : 'empty'
  const isToken = cell?.kind === VanguardCellKind.Token

  const style: CSSProperties = {
    left: `${placement.xFraction * 100}%`,
    top: `${placement.yFraction * 100}%`,
    width: `${cellWidthFraction * 100}%`,
    aspectRatio: `1 / ${HEX_HEIGHT_TO_WIDTH}`,
  }

  return (
    <button
      type="button"
      className="vg-cell"
      style={style}
      data-cell={cellKey(coord)}
      data-kind={kind}
      data-owner={isToken ? cell.owner : undefined}
      data-reinforced={isToken && cell.reinforced > 0 ? 'true' : undefined}
      data-base={isBase ? 'true' : undefined}
      data-selectable={selectable ? 'true' : undefined}
      disabled={!selectable}
      tabIndex={tabStop ? 0 : -1}
      aria-label={cellAccessibleName(coord, cell, bases)}
      onClick={() => onTap(coord)}
    >
      {isBase && (
        <span className="vg-glyph" aria-hidden="true">
          ★
        </span>
      )}
    </button>
  )
}
