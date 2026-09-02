/** Which surface is showing. A union rather than a phase boolean beside it, because
 *  "in the shop AND warned" and "in the shop before the run began" are both states that
 *  must not exist. Widened on DLR-85 with Start and Map — folding the start screen in here
 *  costs no new state variable.
 *
 *  Moved here from `App.tsx` on DLR-150 alongside `screenFor` below, which is the only reader
 *  that needs it outside the component: `App.tsx` imports both rather than defining its own
 *  copy, so the derivation and the type it switches on cannot drift apart. NOT re-exported
 *  through `../hunt` — `RunState` carries no notion of "which screen", only what the run itself
 *  is doing, and this stays a purely app-layer concern. */
export const RunPhase = {
  Start: 'start',
  Verdict: 'verdict',
  Warned: 'warned',
  Shop: 'shop',
  // DLR-159 — reachable ONLY from the shop, and returning ONLY to the shop.
  ManageBuffs: 'manageBuffs',
  Map: 'map',
  // DLR-118 — reachable ONLY from a terminal verdict's `Open the Vault` control.
  Vault: 'vault',
} as const
export type RunPhase = (typeof RunPhase)[keyof typeof RunPhase]

/** The screens `App` switches between, as the debug mirror already names them. */
export type AppScreen =
  'start' | 'map' | 'shop' | 'manageBuffs' | 'vault' | 'verdict' | 'warCouncil'

/** Which screen the app is showing, as a pure function of the two values that decide it.
 *  Extracted from `App.tsx`'s inline ternary chain (DLR-150 — 400-line budget) so the derivation
 *  is unit-testable and `debugState`'s mirror cannot disagree with the render, which is the
 *  property the chain's own comment already claims. */
export function screenFor(phase: RunPhase, encounterOver: boolean): AppScreen {
  if (phase === RunPhase.Start) return 'start'
  if (!encounterOver) return 'warCouncil'
  if (phase === RunPhase.Map) return 'map'
  if (phase === RunPhase.Shop) return 'shop'
  if (phase === RunPhase.ManageBuffs) return 'manageBuffs'
  if (phase === RunPhase.Vault) return 'vault'
  return 'verdict'
}
