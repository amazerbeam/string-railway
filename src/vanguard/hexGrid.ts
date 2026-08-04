import type { CellKey, HexCoord } from './types'

const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function cellKey(coord: HexCoord): CellKey {
  return `${coord.q},${coord.r}`
}

export function isWithinBoard(coord: HexCoord, size: number): boolean {
  return coord.q >= 0 && coord.q < size && coord.r >= 0 && coord.r < size
}

export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }))
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2
}

export function allBoardCoords(size: number): HexCoord[] {
  const coords: HexCoord[] = []
  for (let q = 0; q < size; q++) {
    for (let r = 0; r < size; r++) {
      coords.push({ q, r })
    }
  }
  return coords
}

export function hexBfs(
  start: HexCoord,
  size: number,
  canEnter: (coord: HexCoord) => boolean,
): HexCoord[] {
  if (!isWithinBoard(start, size) || !canEnter(start)) return []

  const visited = new Set<CellKey>([cellKey(start)])
  const order: HexCoord[] = [start]
  const queue: HexCoord[] = [start]

  while (queue.length > 0) {
    // queue.length > 0 guarantees this is defined
    const current = queue.shift()!
    for (const neighbor of hexNeighbors(current)) {
      const key = cellKey(neighbor)
      if (visited.has(key)) continue
      if (!isWithinBoard(neighbor, size) || !canEnter(neighbor)) continue
      visited.add(key)
      order.push(neighbor)
      queue.push(neighbor)
    }
  }

  return order
}
