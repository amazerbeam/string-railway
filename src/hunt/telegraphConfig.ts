// DLR-155 — the telegraph tunables moved here when `config.ts` reached its 400-line blocking
// budget, the same split `run.ts` → `runTransitions.ts` and `config.ts` → `apConfig.ts` already
// made. `config.ts` re-exports every name below, so no existing importer changes.

export const TelegraphFidelity = {
  Suit: 'suit', // narrowest — only the lead suit is telegraphed
  SuitAndStance: 'suitAndStance', // §4's stated default — suit plus pressing/ducking
} as const
export type TelegraphFidelity = (typeof TelegraphFidelity)[keyof typeof TelegraphFidelity]

// §4's visibility table / DLR-52 AC4 — the Quarry's next-trick intent is telegraphed at this
// fidelity, never as the exact card, so §4's hidden-hand row is never violated. Conservative
// default named at the DLR-52 planning gate; the single value most likely to move after T8's
// playtest.
export const TELEGRAPH_FIDELITY: TelegraphFidelity = TelegraphFidelity.SuitAndStance

// DLR-155 AC8 — the one switch for the Quarry's lead telegraph in the holds panel. Read in
// exactly one place (`app/warCouncil/quarryTelegraph.ts`'s `telegraphedLeadSuit`), so turning it
// off removes the highlight, the tooltip and the screen-reader sentence together, with no
// consuming code writing its own bypass — the discipline `AP_ENABLED` / `apCostFor` already sets.
// DISTINCT from TELEGRAPH_FIDELITY above, which says HOW MUCH a telegraph may reveal; this says
// whether this particular SURFACE draws one at all.
// UNIT: on/off.
export const QUARRY_LEAD_TELEGRAPH_ENABLED = true
