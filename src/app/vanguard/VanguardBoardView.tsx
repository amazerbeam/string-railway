import {
  allBoardCoords,
  cellKey,
  type CellKey,
  type HexCoord,
  type VanguardBoard,
} from '../../vanguard'
import { hexBoardMetrics, hexPlacement } from './hexLayout'
import HexCell from './HexCell'
import { useHexRovingFocus } from './useHexRovingFocus'

interface VanguardBoardViewProps {
  readonly board: VanguardBoard
  readonly legalTargets: ReadonlySet<CellKey> // empty when no action is armed
  readonly interactive: boolean
  readonly onTapCell: (coord: HexCoord) => void
  readonly onCancel: () => void
}

/**
 * The hex board group (AC1). Renders every coordinate from `allBoardCoords(board.size)` as a
 * `HexCell`, placed by `hexPlacement(coord, board.size)` — this component computes no
 * geometry of its own and decides no legality; it renders the `legalTargets` set it is
 * handed. `allBoardCoords` itself iterates q-major, so the coordinates are re-sorted into
 * row-major order (r then q) before rendering — the order `useHexRovingFocus`'s own
 * Home/End search uses — so DOM order is stable and predictable.
 */
export default function VanguardBoardView({
  board,
  legalTargets,
  interactive,
  onTapCell,
  onCancel,
}: VanguardBoardViewProps) {
  const isFocusable = (key: CellKey) => interactive && legalTargets.has(key)
  const { groupRef, tabStopKey, handleKeyDown } = useHexRovingFocus(board, isFocusable, onCancel)
  const { cellWidthFraction, aspectRatio } = hexBoardMetrics(board.size)

  const coords = [...allBoardCoords(board.size)].sort((a, b) => a.r - b.r || a.q - b.q)

  return (
    <div
      ref={groupRef}
      className="vg-board"
      role="group"
      aria-label={`Vanguard board, ${board.size} by ${board.size} hexes`}
      style={{ aspectRatio }}
      onKeyDown={handleKeyDown}
    >
      {coords.map((coord) => {
        const key = cellKey(coord)
        const selectable = isFocusable(key)

        return (
          <HexCell
            key={key}
            coord={coord}
            cell={board.cells[key]}
            bases={board.bases}
            placement={hexPlacement(coord, board.size)}
            cellWidthFraction={cellWidthFraction}
            selectable={selectable}
            tabStop={tabStopKey === key}
            onTap={onTapCell}
          />
        )
      })}
    </div>
  )
}
