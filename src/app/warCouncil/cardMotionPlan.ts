import { type CardMovement, type PlaceId, faceAt } from './cardPlacement'

/**
 * DLR-157 — turns a `diffPlacements` result into a staggered, flip-aware schedule the primitive
 * can run. PURE: no React import, no DOM access, no clock and no randomness — the stagger is
 * expressed as a `delayMs` number for the caller to act on, never a `setTimeout` scheduled here.
 */

/** PLACEHOLDER, not a chosen value — the developer's to set. Above this many movements sharing
 *  one source and one destination pile, the group flies as ONE representative card back:
 *  thirteen simultaneous flights at the end of a hand is the tempo failure DLR-157's own risk
 *  section predicts. */
export const PILE_COLLAPSE_THRESHOLD = 3

/** One request the primitive can execute. `hide` names which end holds a real element that must
 *  stay laid out but invisible for the flight (AC7): 'from' for a departure into an unaddressable
 *  pile (no per-card element exists there to reveal), 'to' for an arrival into an addressable
 *  place — every face-up place renders one real element per card, so it is the arrival's real
 *  element that hides while its clone travels toward it. */
export interface CardMoveRequest {
  readonly from: PlaceId
  readonly to: PlaceId
  readonly hide: 'from' | 'to'
  readonly flip: boolean
  /** Milliseconds after `move()` that this request starts. Assigned by `planMovements`. */
  readonly delayMs: number
  /** Absent for a collapsed pile group, which flies one representative rather than n cards. */
  readonly cardKey?: string
}

function groupKey(from: PlaceId, to: PlaceId): string {
  return `${from.kind}=>${to.kind}`
}

function buildRequest(
  from: PlaceId,
  to: PlaceId,
  cardKey: string | undefined,
  delayMs: number,
): CardMoveRequest {
  return {
    from,
    to,
    hide: faceAt(to) === 'down' ? 'from' : 'to',
    flip: faceAt(from) !== faceAt(to),
    delayMs,
    ...(cardKey === undefined ? {} : { cardKey }),
  }
}

/** Turns a diff into a schedule. Applies AC5's single stagger, collapses a pile-to-pile group to
 *  ONE request (M8 reshuffle, M14 hand end — a pile moves as a pile, not as 33 cards), and sets
 *  `flip` from `faceAt(from) !== faceAt(to)`. Pure: no DOM, no clock, no randomness. */
export function planMovements(
  movements: readonly CardMovement[],
  staggerMs: number,
): readonly CardMoveRequest[] {
  const groups = new Map<string, CardMovement[]>()
  for (const movement of movements) {
    const key = groupKey(movement.from, movement.to)
    const existing = groups.get(key)
    if (existing) existing.push(movement)
    else groups.set(key, [movement])
  }

  const requests: CardMoveRequest[] = []
  const collapsedGroups = new Set<string>()
  let index = 0
  for (const movement of movements) {
    const key = groupKey(movement.from, movement.to)
    const group = groups.get(key)
    if (group === undefined) continue // unreachable — every movement seeded its own group above

    // A group collapses to one representative flight ONLY when it is a genuine pile-to-pile move —
    // the destination has no per-card anchor to resolve, i.e. no movement in the group carries a
    // distinguishing `to.slot`. A group whose destination IS addressable per card (the six-card
    // deal into the player's slotted hand) must fly every card, however many there are — collapsing
    // it would resolve to an anchor that does not exist (`playerHand` with no `slot`), and the whole
    // group would land instantly with no animation at all.
    const isPileToPile = group.every((m) => m.to.slot === undefined)

    if (isPileToPile && group.length > PILE_COLLAPSE_THRESHOLD) {
      if (collapsedGroups.has(key)) continue
      collapsedGroups.add(key)
      requests.push(
        buildRequest(
          { kind: movement.from.kind },
          { kind: movement.to.kind },
          undefined,
          index * staggerMs,
        ),
      )
      index++
      continue
    }

    requests.push(buildRequest(movement.from, movement.to, movement.cardKey, index * staggerMs))
    index++
  }
  return requests
}
