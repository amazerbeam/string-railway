import type { PlayerSide } from '../../warCouncil'

// Copy, not an engine string leaking into the UI — mirrors the convention
// already established in src/app/warCouncil/TrickWell.tsx, shared here
// because two components (RoundTransitionPanel, BattleOverPanel) need
// identical wording.
export const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  player: 'You',
  cpu: 'The opponent',
}
