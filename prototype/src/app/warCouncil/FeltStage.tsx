import type { ReactNode } from 'react'

export interface FeltStageProps {
  readonly children: ReactNode
}

/**
 * DLR-148 Phase 5 — the felt's right-hand stage. Deliberately a thin layout wrapper: the branch
 * chain that picks fault / resolved trick / round over / prompt / trick well is moved VERBATIM
 * into `roundControlsProps.ts`'s `feltStageProps` (its ordering is load-bearing — the held reveal
 * is checked before `roundComplete` so the deciding sixth trick is shown at all), and the
 * gallery-or-stage choice is one ternary at the call site in `WarCouncilRound.tsx`. Extracting the
 * chain itself would move five pieces of round state into a second component for no gain;
 * extracting the box is what buys the 400-line budget back.
 */
export default function FeltStage({ children }: FeltStageProps) {
  return <div className="wc-table-inner">{children}</div>
}
