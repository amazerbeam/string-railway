import { PlayerSide, type Card, type RoundState } from '../../warCouncil'
import { cardKey } from './labels'

/**
 * DLR-157 — where every card in a `RoundState` currently is, and what changed between two
 * consecutive states. PURE: no React import, no DOM access, so this module is tested without a
 * renderer (`react-frontend`'s pure-logic testing posture) and carries no runtime dependency on
 * `src/app/`'s component tree. Lives under `src/app/` rather than `src/warCouncil/` because it
 * knows about *places on a screen* — the engine must not (`plan.md` Part 1's pure-core audit).
 */

/** Every place a card can be. String-valued so a key is readable in a debugger and in a test
 *  failure. `erasableSyntaxOnly` is on — this is the `as const` object-map form, never an enum. */
export const PlaceKind = {
  PlayerHand: 'playerHand',
  QuarryHand: 'quarryHand',
  TrickWell: 'trickWell',
  DrawPile: 'drawPile',
  SpentPile: 'spentPile',
  DecreePlate: 'decreePlate',
  AbilityPrompt: 'abilityPrompt',
  BuffGallery: 'buffGallery',
  RidingStrip: 'ridingStrip',
  HeldTray: 'heldTray',
  /** QA fix (code-evaluator review, DLR-157) — the shop's own purchase button, one per
   *  `ShopItem`, slotted by the item. Not a slot of `HeldTray`: `ShopPanel.tsx` previously reused
   *  `HeldTray` with `slot: 'offer:<item>'` to name this, which reads as a workaround around this
   *  union's fixed member set and made "which place is `offer:Heal`" something a reader had to
   *  decode rather than see. */
  ShopOffer: 'shopOffer',
  /** QA fix (code-evaluator review, DLR-157) — the slot machine stage, `ShopPanel.tsx`'s M21
   *  origin. Previously `{ kind: HeldTray, slot: 'slotMachine' }` for the same reason above. */
  SlotMachine: 'slotMachine',
} as const
export type PlaceKind = (typeof PlaceKind)[keyof typeof PlaceKind]

/** A place, addressable. `slot` narrows a multi-slot place to one of its slots — a hand card's
 *  own `cardKey`, a gallery card's buff id. Absent for a place that is one object (a pile, the
 *  well). */
export interface PlaceId {
  readonly kind: PlaceKind
  readonly slot?: string
}

/** One card changing place. `face` at each end is derived from the place, not stored on the
 *  card. */
export interface CardMovement {
  readonly cardKey: string
  readonly from: PlaceId
  readonly to: PlaceId
}

const DOWN_KINDS: ReadonlySet<PlaceKind> = new Set([
  PlaceKind.DrawPile,
  PlaceKind.SpentPile,
  PlaceKind.QuarryHand,
])

/** Face-up or face-down at rest in this place. `DrawPile`, `SpentPile` and `QuarryHand` are
 *  down; every other place is up. A movement flips exactly when these differ at its two ends
 *  (AC6). */
export function faceAt(place: PlaceId): 'up' | 'down' {
  return DOWN_KINDS.has(place.kind) ? 'down' : 'up'
}

function placeCards(
  map: Map<string, PlaceId>,
  cards: readonly Card[],
  kind: PlaceKind,
  slotted: boolean,
): void {
  for (const card of cards) {
    const key = cardKey(card)
    map.set(key, slotted ? { kind, slot: key } : { kind })
  }
}

/** Where every card in `state` currently is. Total: every one of the deck's cards appears
 *  exactly once — the invariant the spec pins — across the draw pile, the spent pile, both
 *  hands, the current trick and the decree. */
export function placementsOf(state: RoundState): ReadonlyMap<string, PlaceId> {
  const map = new Map<string, PlaceId>()
  placeCards(map, state.drawPile, PlaceKind.DrawPile, false)
  placeCards(map, state.spentPile, PlaceKind.SpentPile, false)
  placeCards(map, state.hands[PlayerSide.Player], PlaceKind.PlayerHand, true)
  placeCards(map, state.hands[PlayerSide.Cpu], PlaceKind.QuarryHand, false)
  placeCards(
    map,
    state.currentTrick.map((trickCard) => trickCard.card),
    PlaceKind.TrickWell,
    false,
  )
  // DLR-163 AC2 — a decree replaced by a suit marker has no card to place. Guarded rather than
  // defaulted: `cardKey` takes a `Card` and a fabricated stand-in would collide with a real card.
  if (state.decree !== null) map.set(cardKey(state.decree), { kind: PlaceKind.DecreePlate })
  return map
}

function samePlace(a: PlaceId, b: PlaceId): boolean {
  return a.kind === b.kind && a.slot === b.slot
}

/** Every card whose place differs between the two maps, in a stable order (`next`'s own
 *  iteration order). A card absent from `prev` (a fresh encounter) or from `next` yields no
 *  movement — there is no place to fly from, or no place to fly to. */
export function diffPlacements(
  prev: ReadonlyMap<string, PlaceId>,
  next: ReadonlyMap<string, PlaceId>,
): readonly CardMovement[] {
  const movements: CardMovement[] = []
  for (const [key, to] of next) {
    const from = prev.get(key)
    if (from === undefined) continue
    if (samePlace(from, to)) continue
    movements.push({ cardKey: key, from, to })
  }
  return movements
}
