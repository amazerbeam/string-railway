import {
  ClashRejectionReason,
  IllegalActionReason,
  VanguardActionKind,
  VanguardCellKind,
  type HexCoord,
  type VanguardCell,
} from '../../vanguard'
import { PlayerSide } from '../../warCouncil'

export const SIDE_NAME: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'your',
  [PlayerSide.Cpu]: 'their',
}

export const ACTION_NAME: Readonly<Record<VanguardActionKind, string>> = {
  [VanguardActionKind.Expand]: 'Expand',
  [VanguardActionKind.Overwrite]: 'Overwrite',
  [VanguardActionKind.Reinforce]: 'Reinforce',
}

export const ACTION_DESCRIPTION: Readonly<Record<VanguardActionKind, string>> = {
  [VanguardActionKind.Expand]: '1 move · empty, within 2',
  [VanguardActionKind.Overwrite]: '2–3 moves · adjacent enemy',
  [VanguardActionKind.Reinforce]: '1 move · your own token',
}

/** The one accessible name every cell button binds to (AC4). */
export function cellAccessibleName(
  coord: HexCoord,
  cell: VanguardCell | undefined,
  bases: Readonly<Record<PlayerSide, HexCoord>>,
): string {
  const at = `Cell ${coord.q}, ${coord.r}`
  const base = basePrefix(coord, bases)

  if (!cell) return `${at} — ${base}empty`
  if (cell.kind === VanguardCellKind.Defense) return `${at} — permanent defense`

  const owner = `${SIDE_NAME[cell.owner]} token`
  return `${at} — ${base}${owner}${cell.reinforced > 0 ? ', reinforced' : ''}`
}

function basePrefix(coord: HexCoord, bases: Readonly<Record<PlayerSide, HexCoord>>): string {
  for (const side of [PlayerSide.Player, PlayerSide.Cpu]) {
    const base = bases[side]
    if (base.q === coord.q && base.r === coord.r) return `${SIDE_NAME[side]} base, `
  }
  return ''
}

export const REJECTION_MESSAGE: Readonly<
  Record<IllegalActionReason | ClashRejectionReason, string>
> = {
  [IllegalActionReason.CellOutOfBounds]: 'That cell is off the board.',
  [IllegalActionReason.CellIsDefense]: 'That cell is a permanent defense — nobody may hold it.',
  [IllegalActionReason.CellOccupied]: 'That cell is already occupied.',
  [IllegalActionReason.OutOfExpandRange]: 'That cell is too far from your network to expand into.',
  [IllegalActionReason.TargetNotEnemyToken]: 'Overwrite only takes an enemy token.',
  [IllegalActionReason.NotAdjacentToNetwork]:
    'That cell is not next to your network — Overwrite allows no gap.',
  [IllegalActionReason.TargetNotOwnToken]: 'Reinforce only strengthens a token you already hold.',
  [IllegalActionReason.ReinforcementCapReached]: 'That token is already reinforced.',
  [ClashRejectionReason.NotYourTurn]: 'It is not your turn.',
  [ClashRejectionReason.InsufficientMuster]: 'You do not have the moves left for that.',
  [ClashRejectionReason.ClashAlreadyResolved]: 'This round of The Clash is already over.',
}

export { cellKey as cellReactKey } from '../../vanguard'
