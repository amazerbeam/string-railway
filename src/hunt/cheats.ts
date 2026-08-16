import { CHEAT_SLOT_COUNT } from './config'

/** A Cheat's identity. Minted from `RunState.nextCheatId`, never from `Math.random()` —
 *  `src/hunt/` is lint-enforced DOM-free and must stay deterministic. */
export type CheatCardId = number

/**
 * One held Cheat. An OBJECT, not a counter (DLR-83 scope): it carries an identity so a spend
 * names a specific card, so React has a stable key, and so DLR-84 has somewhere to attach a
 * price without reshaping the field. Deliberately carries nothing else — no kind, no name, no
 * cost. Those are DLR-84's.
 */
export interface CheatCard {
  readonly id: CheatCardId
}

/**
 * AC3 — the run's opening grant. Throws rather than clamping: a `RUN_STARTING_CHEATS` above the
 * slot cap is a configuration mistake, and silently handing back fewer cards than the key asks
 * for hides it until someone counts the frames on screen.
 */
export function grantCheats(count: number, firstId: CheatCardId): readonly CheatCard[] {
  if (!Number.isInteger(count) || count < 0 || count > CHEAT_SLOT_COUNT) {
    throw new RangeError(
      `Cannot grant ${count} Cheats — must be a whole number from 0 to ${CHEAT_SLOT_COUNT}`,
    )
  }
  return Array.from({ length: count }, (_, i) => ({ id: firstId + i }))
}

/**
 * AC2 — THE single statement of the two-slot cap. Throws when the slots are full rather than
 * returning the list unchanged: a silent no-op would let DLR-84 take payment for a card that was
 * never added.
 */
export function addCheat(cheats: readonly CheatCard[], card: CheatCard): readonly CheatCard[] {
  if (cheats.length >= CHEAT_SLOT_COUNT) {
    throw new RangeError(`Cannot hold a third Cheat — all ${CHEAT_SLOT_COUNT} slots are full`)
  }
  if (hasCheat(cheats, card.id)) {
    throw new RangeError(`Cheat ${card.id} is already held`)
  }
  return [...cheats, card]
}

/** AC7 — the spend. Throws when `id` is not held, so a double-consume is a loud bug rather than
 *  a no-op that leaves the slot looking correct. */
export function removeCheat(cheats: readonly CheatCard[], id: CheatCardId): readonly CheatCard[] {
  if (!hasCheat(cheats, id)) {
    throw new RangeError(`Cannot spend Cheat ${id} — it is not held`)
  }
  return cheats.filter((c) => c.id !== id)
}

/** Whether `id` is still held — read by the reducer before honouring a stale selection. */
export function hasCheat(cheats: readonly CheatCard[], id: CheatCardId): boolean {
  return cheats.some((c) => c.id === id)
}
