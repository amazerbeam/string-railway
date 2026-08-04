import type { PlayerSide } from '../warCouncil'

export interface HexCoord {
  readonly q: number
  readonly r: number
}

export type CellKey = string // `${q},${r}`

export const VanguardCellKind = {
  Token: 'token',
  Defense: 'defense',
} as const
export type VanguardCellKind = (typeof VanguardCellKind)[keyof typeof VanguardCellKind]

export interface TokenCell {
  readonly kind: typeof VanguardCellKind.Token
  readonly owner: PlayerSide
  readonly reinforced: number // stacked reinforcement level, 0..REINFORCE_MAX_STACK
}

export interface DefenseCell {
  readonly kind: typeof VanguardCellKind.Defense
}

export type VanguardCell = TokenCell | DefenseCell

export interface VanguardBoard {
  readonly size: number
  readonly bases: Readonly<Record<PlayerSide, HexCoord>>
  // Sparse: an in-bounds coordinate absent from this record is an empty cell.
  // Typed with `| undefined` explicitly since `noUncheckedIndexedAccess` is not on
  // in this project's tsconfig — without it, an unguarded `.kind` read on a
  // genuinely empty cell would compile cleanly and crash at runtime.
  readonly cells: Readonly<Record<CellKey, VanguardCell | undefined>>
}

export const VanguardActionKind = {
  Expand: 'expand',
  Overwrite: 'overwrite',
  Reinforce: 'reinforce',
} as const
export type VanguardActionKind = (typeof VanguardActionKind)[keyof typeof VanguardActionKind]

export type VanguardAction =
  | { readonly kind: typeof VanguardActionKind.Expand; readonly target: HexCoord }
  | { readonly kind: typeof VanguardActionKind.Overwrite; readonly target: HexCoord }
  | { readonly kind: typeof VanguardActionKind.Reinforce; readonly target: HexCoord }

export const IllegalActionReason = {
  CellOutOfBounds: 'cellOutOfBounds',
  CellIsDefense: 'cellIsDefense',
  CellOccupied: 'cellOccupied',
  OutOfExpandRange: 'outOfExpandRange',
  TargetNotEnemyToken: 'targetNotEnemyToken',
  NotAdjacentToNetwork: 'notAdjacentToNetwork',
  TargetNotOwnToken: 'targetNotOwnToken',
  ReinforcementCapReached: 'reinforcementCapReached',
} as const
export type IllegalActionReason = (typeof IllegalActionReason)[keyof typeof IllegalActionReason]

export type VanguardActionResult =
  | { readonly ok: true; readonly board: VanguardBoard; readonly cost: number }
  | { readonly ok: false; readonly reason: IllegalActionReason }

export type Muster = Readonly<Record<PlayerSide, number>>

export const ClashStatus = {
  InProgress: 'inProgress',
  Breached: 'breached',
  Complete: 'complete',
} as const
export type ClashStatus = (typeof ClashStatus)[keyof typeof ClashStatus]

export type ClashState =
  | {
      readonly status: typeof ClashStatus.InProgress
      readonly board: VanguardBoard
      readonly muster: Muster
      readonly turn: PlayerSide
    }
  | {
      readonly status: typeof ClashStatus.Breached
      readonly board: VanguardBoard
      readonly muster: Muster
      readonly winner: PlayerSide
    }
  | {
      readonly status: typeof ClashStatus.Complete
      readonly board: VanguardBoard
      readonly muster: Muster
    }

export const ClashRejectionReason = {
  NotYourTurn: 'notYourTurn',
  InsufficientMuster: 'insufficientMuster',
  ClashAlreadyResolved: 'clashAlreadyResolved',
} as const
export type ClashRejectionReason = (typeof ClashRejectionReason)[keyof typeof ClashRejectionReason]

export type ClashActionResult =
  | { readonly ok: true; readonly state: ClashState }
  | { readonly ok: false; readonly reason: IllegalActionReason | ClashRejectionReason }
