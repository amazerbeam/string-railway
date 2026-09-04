import { QUARRY_LEAD_TELEGRAPH_ENABLED } from '../../hunt'
import { quarryIntent, type RoundState, type Suit } from '../../warCouncil'

/**
 * DLR-155 — the suit the holds panel marks, or `null` for "mark nothing".
 *
 * `quarryToLead` is passed IN rather than re-derived. `WarCouncilRound` already computes exactly
 * "the Quarry has chosen its lead but has not committed it", and that boolean is strictly
 * stronger than AC4's wording: it additionally excludes a held reveal, an open ability prompt, an
 * engine fault and a finished round — every state in which a telegraph would be noise. A second
 * copy of that condition here is the drift this codebase avoids elsewhere.
 *
 * The ONE call to `quarryIntent` for the whole panel, and it is deliberately outside any per-row
 * or per-tile loop (DLR-155's own risk note: `quarryIntent` runs `chooseCpuCard` on every poll).
 * It is pure and safe under StrictMode's double-invoke by its own docblock.
 *
 * `stance` is read and discarded (AC6), so `TELEGRAPH_FIDELITY` can stay at `SuitAndStance`
 * without this surface implying more than it shows. No rank can pass through here: `QuarryIntent`
 * carries none.
 */
export function telegraphedLeadSuit(state: RoundState, quarryToLead: boolean): Suit | null {
  if (!QUARRY_LEAD_TELEGRAPH_ENABLED || !quarryToLead) {
    return null
  }
  return quarryIntent(state)?.suit ?? null
}
