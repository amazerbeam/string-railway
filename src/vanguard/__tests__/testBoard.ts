import type { VanguardBoard } from '../types'

export function boardWith(
  cells: VanguardBoard['cells'],
  overrides?: { size?: VanguardBoard['size']; bases?: VanguardBoard['bases'] }
): VanguardBoard {
  return {
    size: overrides?.size ?? 5,
    bases: overrides?.bases ?? { player: { q: 0, r: 0 }, cpu: { q: 4, r: 4 } },
    cells,
  }
}
