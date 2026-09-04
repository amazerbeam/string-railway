/** The arming surface's copy (DLR-174), transcribed from `mockup.html`. Authored by the
 *  developer and read on screen, so it is transcribed rather than re-worded.
 *
 *  `ArmingWindow` is imported TYPE-ONLY, not as a value: `armingSurfaceModel.ts` (which OWNS
 *  that type) also imports the two reason/remedy strings below, and a value-level import in
 *  both directions would be a genuine circular dependency that crashes at module load — whichever
 *  module is entered first must fully process its import of the other before running its own
 *  body, so the other side reads its not-yet-assigned export and throws a TDZ error. `ARMING_
 *  WINDOW_TEXT`'s keys are therefore written as the type's own literal string values
 *  (`'betweenTricks'` / `'cheatOnly'`) rather than as `[ArmingWindow.BetweenTricks]` — the type
 *  import still keeps this Record checked against every window `armingSurfaceModel.ts` declares. */
import type { ArmingWindow } from './armingSurfaceModel'

export const ARMING_SURFACE_LABEL = 'Arm for this card'
export const ARMING_WINDOW_TEXT: Readonly<Record<ArmingWindow, string>> = {
  betweenTricks: 'Between tricks',
  cheatOnly: 'Cheat only',
}
export const ARMING_EMPTY_TEXT = 'Nothing pays on this card'
export const ARMING_NO_VALID_CARDS_TEXT = 'No valid cards to play'
export const ARMING_FOLLOW_SUIT_REASON = 'Follow-suit binds while you hold the led suit'
export const ARMING_NO_CHEAT_REMEDY = 'A Cheat breaks it — you are not holding one'
export const ARMING_CURSE_CLAIMED_TEXT = 'Hand tap claimed'
export const ARMING_CURSE_MODE_TEXT = 'One tap ends this'
/** Stated on the Cheat's own row when arming it would make the raised card playable. */
export const ARMING_UNLOCKS_CARD_TEXT = 'Arming this makes the card playable'
/** A buff that lands in the projection's indeterminate set. Never a figure. */
export const ARMING_MAY_FIRE_TEXT = 'may fire'
