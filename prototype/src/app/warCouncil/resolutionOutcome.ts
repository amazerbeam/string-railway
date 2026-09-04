/**
 * DLR-160 AC2 — the four outcomes `.docs/game_rules/the-hunt.md` §7 names, as a kind plus its
 * words. Runs no rule of its own: it crosses two facts the engine already decided — the MECHANICAL
 * axis (`playerWentHigh`, i.e. `winner === PlayerSide.Player`, before the skull inverts what that
 * is worth) with whether the trick carried a skull. Lives under `src/app/` rather than
 * `src/warCouncil/` because it produces user-facing copy, the same reason `resolutionBeats.ts`
 * does.
 *
 * DLR-165 — the two axes now have SEPARATE WORDS, and the four-way name is the crossing of them:
 * High and Low name the mechanical act (did the player physically take the cards), Victory and
 * Defeat name the outcome (did the trick bank or hurt). The names below are that crossing, so a
 * reader no longer has to remember which sense "win" is being used in.
 *
 * Read by BOTH the trick well (`TrickWell.tsx`, as the cards land) and the resolution panel
 * (`TrickResolutionScreen.tsx`), so one trick can never be worded two ways.
 */
export const TrickOutcomeKind = {
  HighVictory: 'highVictory',
  LowVictory: 'lowVictory',
  LowDefeat: 'lowDefeat',
  HighDefeat: 'highDefeat',
} as const
export type TrickOutcomeKind = (typeof TrickOutcomeKind)[keyof typeof TrickOutcomeKind]

export function trickOutcomeKindFor(
  playerWentHigh: boolean,
  skullTrick: boolean,
): TrickOutcomeKind {
  if (playerWentHigh) return skullTrick ? TrickOutcomeKind.HighDefeat : TrickOutcomeKind.HighVictory
  return skullTrick ? TrickOutcomeKind.LowVictory : TrickOutcomeKind.LowDefeat
}

/** DLR-165 AC3/AC4 — the four-way name is now the load-bearing headline, replacing DLR-160's
 *  Clean win / Dodge / Clean loss / Ate the skull.
 *
 *  DLR-165 fix pass — an earlier version of this comment claimed those four words survived as
 *  flavour in `TRICK_OUTCOME_WHY` below. They do not: AC4 kept those four sentences VERBATIM and
 *  none of them contains a colour word. The code is right; the comment described an intention that
 *  was never carried out. Layout reference: this contract's `mockup.html`, first panel. */
export const TRICK_OUTCOME_WORD: Readonly<Record<TrickOutcomeKind, string>> = {
  [TrickOutcomeKind.HighVictory]: 'High Victory',
  [TrickOutcomeKind.LowVictory]: 'Low Victory',
  [TrickOutcomeKind.LowDefeat]: 'Low Defeat',
  [TrickOutcomeKind.HighDefeat]: 'High Defeat',
}

/** PLACEHOLDER copy. Says the CAUSE, which is the half the session found missing. DLR-165 AC4
 *  keeps these four sentences VERBATIM — only their keys moved. */
export const TRICK_OUTCOME_WHY: Readonly<Record<TrickOutcomeKind, string>> = {
  [TrickOutcomeKind.HighVictory]: 'you took it, and it carried no skull — so it banks',
  [TrickOutcomeKind.LowVictory]:
    'they took it, and it carried a skull — so it banks, and costs you nothing',
  [TrickOutcomeKind.LowDefeat]: 'they took it, and it carried no skull — your streak resets',
  [TrickOutcomeKind.HighDefeat]: 'you took it, and it carried a skull — your streak resets',
}
