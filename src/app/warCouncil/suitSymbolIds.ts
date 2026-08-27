import { Suit } from '../../warCouncil'

/** The three suit marks bind to their `<symbol>` by this id — a rename here type-checks cleanly
 *  and renders nothing, so this map and `SuitMark.tsx`'s `<symbol id>` sheet are the only two
 *  places a suit's symbol id may be written. In its own module (not `SuitMark.tsx`) because
 *  `SuitMark.tsx` is a component file — `react-refresh/only-export-components` rejects a
 *  non-component export sitting alongside `SuitMark`/`SuitSymbolSheet`, and a suppression is not
 *  on the table. `CardFacePanel.tsx`'s pip lattice imports this directly, the same map
 *  `SuitMark`'s corner glyph reads, rather than re-deriving the id string a third time
 *  (D-W1, DLR-149 fix loop). */
export const SUIT_SYMBOL_ID: Readonly<Record<Suit, string>> = {
  [Suit.Bells]: 's-bells',
  [Suit.Keys]: 's-keys',
  [Suit.Moons]: 's-moons',
}
