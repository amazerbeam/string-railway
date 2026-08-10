import { QuarryCharacter } from './types'

/**
 * Display data for one Quarry character — §4's cast. Player-facing text only; the
 * rule-break itself is enforced in `src/warCouncil/quarryRuleBreak.ts`, so a UI layer
 * renders these fields without restating the rule (DLR-51 AC7).
 */
export interface QuarryCharacterInfo {
  readonly character: QuarryCharacter
  readonly name: string
  /** One sentence, addressed to the player — transcribed from §4's worked example. */
  readonly description: string
}

/**
 * Partial by design: only the Monarch's rule-break is enforced (DLR-51). The other four
 * characters of §4's cast are a later ticket's, and an entry here without matching
 * enforcement in `quarryRuleBreak.ts` would put a rule on screen that no code applies.
 */
export const QUARRY_CHARACTERS: Readonly<Partial<Record<QuarryCharacter, QuarryCharacterInfo>>> = {
  [QuarryCharacter.Monarch]: {
    character: QuarryCharacter.Monarch,
    name: 'The Monarch',
    description:
      'Every time the Monarch leads a suit you hold, you must play your Swan of that suit or your highest card of it.',
  },
}

/**
 * Display data for `character`, or `undefined` when its rule-break is not implemented
 * yet — a caller shows no panel rather than crashing mid-round.
 */
export function quarryCharacterInfo(character: QuarryCharacter): QuarryCharacterInfo | undefined {
  return QUARRY_CHARACTERS[character]
}
