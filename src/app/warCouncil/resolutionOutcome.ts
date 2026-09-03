/**
 * DLR-160 AC2 — the four outcomes `.docs/game_rules/the-hunt.md` §7 names, as a kind plus its
 * words. Runs no rule of its own: it crosses two facts the engine already decided — the MECHANICAL
 * axis (`playerTook`, i.e. `winner === PlayerSide.Player`, before the skull inverts what that is
 * worth) with whether the trick carried a skull. Lives under `src/app/` rather than
 * `src/warCouncil/` because it produces user-facing copy, the same reason `resolutionBeats.ts`
 * does.
 *
 * Read by BOTH the trick well (`TrickWell.tsx`, as the cards land) and the resolution panel
 * (`TrickResolutionScreen.tsx`), so one trick can never be worded two ways.
 */
export const TrickOutcomeKind = {
  CleanWin: 'cleanWin',
  Dodge: 'dodge',
  CleanLoss: 'cleanLoss',
  AteTheSkull: 'ateTheSkull',
} as const
export type TrickOutcomeKind = (typeof TrickOutcomeKind)[keyof typeof TrickOutcomeKind]

export function trickOutcomeKindFor(playerTook: boolean, skullTrick: boolean): TrickOutcomeKind {
  if (playerTook) return skullTrick ? TrickOutcomeKind.AteTheSkull : TrickOutcomeKind.CleanWin
  return skullTrick ? TrickOutcomeKind.Dodge : TrickOutcomeKind.CleanLoss
}

/** PLACEHOLDER copy — `the-hunt.md` §7's own terms, the developer's to retune. */
export const TRICK_OUTCOME_WORD: Readonly<Record<TrickOutcomeKind, string>> = {
  [TrickOutcomeKind.CleanWin]: 'Clean win',
  [TrickOutcomeKind.Dodge]: 'Dodge',
  [TrickOutcomeKind.CleanLoss]: 'Clean loss',
  [TrickOutcomeKind.AteTheSkull]: 'Ate the skull',
}

/** PLACEHOLDER copy. Says the CAUSE, which is the half the session found missing. */
export const TRICK_OUTCOME_WHY: Readonly<Record<TrickOutcomeKind, string>> = {
  [TrickOutcomeKind.CleanWin]: 'you took it, and it carried no skull — so it banks',
  [TrickOutcomeKind.Dodge]:
    'they took it, and it carried a skull — so it banks, and costs you nothing',
  [TrickOutcomeKind.CleanLoss]: 'they took it, and it carried no skull — your streak resets',
  [TrickOutcomeKind.AteTheSkull]: 'you took it, and it carried a skull — your streak resets',
}
