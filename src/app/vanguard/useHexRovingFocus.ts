import { useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { cellKey, type CellKey, type HexCoord, type VanguardBoard } from '../../vanguard'
import { PlayerSide } from '../../warCouncil'

export interface HexRovingFocus {
  readonly groupRef: RefObject<HTMLDivElement | null>
  readonly tabStopKey: CellKey
  readonly handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

// hexPlacement flips the r axis for screen space (increasing r climbs the screen), so an
// arrow key must move focus the way it points, not the way the axis is signed: ArrowUp
// increases r, ArrowDown decreases it.
const ARROW_STEP: Readonly<Record<string, HexCoord>> = {
  ArrowLeft: { q: -1, r: 0 },
  ArrowRight: { q: 1, r: 0 },
  ArrowUp: { q: 0, r: 1 },
  ArrowDown: { q: 0, r: -1 },
}

/**
 * One tab stop across the whole board. ArrowLeft/Right step q by ∓1; ArrowUp steps r by +1
 * and ArrowDown by -1, because `hexPlacement` flips the r axis so increasing r climbs the
 * screen — an arrow key must move focus the way it points, not the way the axis is signed.
 * Home/End jump to the first/last focusable cell, Escape calls onCancel. Focus moves
 * imperatively inside the keydown handler, never from an effect.
 *
 * `isFocusable` is recomputed by the caller on every render (it closes over `legalTargets`,
 * which changes whenever the armed action changes) — not just in response to this hook's own
 * arrow/Home/End handling. `lastChosenKey` state only remembers the last cell the player
 * explicitly moved to; the tab stop actually returned is derived fresh each render from that
 * plus the live `isFocusable`, falling back to the first focusable cell whenever the
 * remembered one is no longer focusable. That keeps the "always exactly one tab stop, and it
 * is always reachable" invariant true across an externally-changing focusable set without
 * resyncing state from an effect.
 */
export function useHexRovingFocus(
  board: VanguardBoard,
  isFocusable: (key: CellKey) => boolean,
  onCancel: () => void,
): HexRovingFocus {
  const groupRef = useRef<HTMLDivElement>(null)
  const [lastChosenKey, setLastChosenKey] = useState<CellKey>(() =>
    cellKey(board.bases[PlayerSide.Player]),
  )

  const tabStopKey = isFocusable(lastChosenKey)
    ? lastChosenKey
    : (firstFocusableKey(board.size, isFocusable) ?? lastChosenKey)

  function moveTo(key: CellKey) {
    setLastChosenKey(key)
    if (!isFocusable(key)) return

    // Invariant this hook depends on but cannot enforce: every cell renders a native
    // <button> carrying data-cell="<q>,<r>". The lookup binds by attribute string with
    // no typed contract — if HexCell ever stops setting it, or renders something other
    // than a <button>, arrow-key navigation silently stops moving focus. The call is
    // optional-chained, so nothing throws, no test fails differently, and TypeScript
    // cannot see it. Task 8 owns the other half of this binding.
    const target = groupRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${key}"]`)
    target?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onCancel()
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      const first = firstFocusableKey(board.size, isFocusable)
      if (first !== null) moveTo(first)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      const last = lastFocusableKey(board.size, isFocusable)
      if (last !== null) moveTo(last)
      return
    }

    const step = ARROW_STEP[event.key]
    if (!step) return
    event.preventDefault()

    const current = parseCellKey(lastChosenKey)
    const next: HexCoord = {
      q: clampToBoard(current.q + step.q, board.size),
      r: clampToBoard(current.r + step.r, board.size),
    }
    moveTo(cellKey(next))
  }

  return { groupRef, tabStopKey, handleKeyDown }
}

function clampToBoard(value: number, size: number): number {
  return Math.min(size - 1, Math.max(0, value))
}

function parseCellKey(key: CellKey): HexCoord {
  const [q, r] = key.split(',').map(Number)
  return { q, r }
}

/** Row-major order (r ascending, then q ascending) — the same order `VanguardBoardView` renders in. */
function firstFocusableKey(size: number, isFocusable: (key: CellKey) => boolean): CellKey | null {
  for (let r = 0; r < size; r++) {
    for (let q = 0; q < size; q++) {
      const key = cellKey({ q, r })
      if (isFocusable(key)) return key
    }
  }
  return null
}

/** The last cell in that same row-major order. */
function lastFocusableKey(size: number, isFocusable: (key: CellKey) => boolean): CellKey | null {
  for (let r = size - 1; r >= 0; r--) {
    for (let q = size - 1; q >= 0; q--) {
      const key = cellKey({ q, r })
      if (isFocusable(key)) return key
    }
  }
  return null
}
