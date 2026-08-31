import { useEffect } from 'react'
import { clearDebugRoundState, setDebugRoundState, type DebugRoundState } from '../debugState'

/**
 * The dev-only `window.__DEBUG_STATE__` round mirror for browser automation
 * (`.claude/skills/ai-play-tester`) — see `../debugState.ts`. Moved verbatim out of
 * `WarCouncilRound.tsx` on DLR-154, which stood at 399 of its 400-line budget.
 *
 * Two effects, not one, exactly as before: the write runs on every render that changes this
 * slice; the clear runs ONLY on unmount (empty deps), because `App` switches screens by
 * rendering the round out entirely and that is the one moment the slice actually goes stale.
 * The write is idempotent, so StrictMode's double-invocation is a no-op.
 */
export function useDebugRoundState(slice: DebugRoundState): void {
  const {
    ui,
    interactive,
    legalCount,
    applyCash,
    applyRefusal,
    discardRefusal,
    encounterOver,
    roundComplete,
  } = slice
  useEffect(() => {
    setDebugRoundState({
      ui,
      interactive,
      legalCount,
      applyCash,
      applyRefusal,
      discardRefusal,
      encounterOver,
      roundComplete,
    })
  }, [
    ui,
    interactive,
    legalCount,
    applyCash,
    applyRefusal,
    discardRefusal,
    encounterOver,
    roundComplete,
  ])
  useEffect(() => clearDebugRoundState, [])
}
