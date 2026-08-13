import { QuarryCharacter } from './types'

/**
 * Display data for one Quarry character — an identity label, and nothing more.
 *
 * **No character carries a mechanical power.** DLR-81 deleted the Monarch's round-long
 * rule-break: it was never a design decision, and character powers are deferred to a
 * final-boss ticket rather than being given to every opponent. So this interface
 * deliberately has no `description` field — there is no rule to describe, and a sentence
 * here would be a rule on screen that no code applies. The power ticket adds its own copy
 * back alongside its own enforcement.
 */
export interface QuarryCharacterInfo {
  readonly character: QuarryCharacter
  readonly name: string
}

/**
 * Partial by design: one opponent is configured, which is all a one-encounter build needs.
 * The other four names of the cast are a later ticket's.
 */
export const QUARRY_CHARACTERS: Readonly<Partial<Record<QuarryCharacter, QuarryCharacterInfo>>> = {
  [QuarryCharacter.Monarch]: {
    character: QuarryCharacter.Monarch,
    name: 'The Monarch',
  },
}

/**
 * Display data for `character`, or `undefined` when it has no entry yet — a caller shows no
 * panel rather than crashing mid-round.
 */
export function quarryCharacterInfo(character: QuarryCharacter): QuarryCharacterInfo | undefined {
  return QUARRY_CHARACTERS[character]
}
