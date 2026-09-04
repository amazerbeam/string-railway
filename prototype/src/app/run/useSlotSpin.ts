import { useEffect, useRef, useState } from 'react'
import { REDUCED_MOTION_MS, RESULT_REVEAL_MS, SPIN_TOTAL_MS, reelStopMs } from './slotSpinConfig'

/** What the cabinet is doing right now. `Idle` covers both "no pull yet this visit" and "a pull
 *  has landed and is being read" — the result region tells those apart from `lastPull`, so a
 *  fourth phase would be a second source of truth for the same fact. */
export const SpinPhase = { Idle: 'idle', Spinning: 'spinning' } as const
export type SpinPhase = (typeof SpinPhase)[keyof typeof SpinPhase]

export interface SlotSpin {
  readonly phase: SpinPhase
  /** `true` once reel `index` has come to rest. Every reel is settled while `Idle`. */
  readonly settled: (index: number) => boolean
  /** `false` from the moment the lever is pulled until `RESULT_REVEAL_MS` after the last reel
   *  lands — what keeps the outcome and the cards from arriving before the reels agree. */
  readonly resultVisible: boolean
  /** A monotonic counter, bumped on every pull. The reels key their travel off it so a second
   *  pull re-runs the animation even when it lands on the same three symbols. */
  readonly spinId: number
  readonly start: () => void
}

/**
 * The cabinet's animation clock — the ONE owner of every timer on this screen.
 *
 * Kept out of `SlotMachinePanel` so that component stays what its docblock promises: a renderer
 * of props with no computation of its own. Kept out of `useShopSlot` too, because that hook is
 * deliberately effect-free and timer-free (its own docblock says so) and owns run state, which a
 * spin is not — a spin is presentation, and it is discarded on unmount.
 *
 * Every timer is registered in one ref'd array and cleared in the effect's cleanup, so an unmount
 * mid-spin (leaving for the next fight while the reels are still turning) leaves nothing behind to
 * fire into a dead component. `react-frontend`'s cleanup contract, and the reason the timers are
 * here rather than scattered across three components.
 */
export function useSlotSpin(reelCount: number): SlotSpin {
  const [phase, setPhase] = useState<SpinPhase>(SpinPhase.Idle)
  const [settledCount, setSettledCount] = useState(reelCount)
  const [resultVisible, setResultVisible] = useState(true)
  const [spinId, setSpinId] = useState(0)
  const timers = useRef<number[]>([])

  function clearTimers() {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }

  // The ONLY effect here, and it schedules nothing — it exists purely so that whatever `start`
  // has queued is torn down on unmount. Registering the cleanup once, rather than re-running an
  // effect per spin, is what keeps a spin from being restarted by an unrelated re-render.
  useEffect(() => clearTimers, [])

  function start() {
    // Re-entrancy guard: a second lever press mid-spin restarts the animation rather than
    // layering a second set of timers over the first, which would land reels out of order.
    clearTimers()
    setSpinId((id) => id + 1)
    setPhase(SpinPhase.Spinning)
    setResultVisible(false)

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const at = (ms: number, run: () => void) => {
      timers.current.push(window.setTimeout(run, ms))
    }

    if (reduced) {
      // No travel at all: the windows cross-fade to their landed symbols after one short beat,
      // then the result follows. `game-ux` — motion may reinforce a state change, never carry it.
      setSettledCount(0)
      at(REDUCED_MOTION_MS, () => {
        setSettledCount(reelCount)
        setPhase(SpinPhase.Idle)
        setResultVisible(true)
      })
      return
    }

    setSettledCount(0)
    for (let index = 0; index < reelCount; index += 1) {
      at(reelStopMs(index, reelCount), () => setSettledCount(index + 1))
    }
    at(SPIN_TOTAL_MS + RESULT_REVEAL_MS, () => {
      setPhase(SpinPhase.Idle)
      setResultVisible(true)
    })
  }

  return {
    phase,
    settled: (index: number) => index < settledCount,
    resultVisible,
    spinId,
    start,
  }
}
