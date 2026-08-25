import type { ActionPoints } from './types'

// DLR-108 — the AP tunables moved here verbatim when `config.ts` reached its 400-line blocking
// budget, the same split `run.ts` → `runTransitions.ts` already made. `config.ts` re-exports every
// name below so no existing importer (`actionPoints.ts`, `index.ts`, the specs) changes.

// DLR-104 AC1 — a single flag such that flipping it off makes every AP-gated action free,
// with no consuming code writing its own bypass (see actionPoints.ts's apCostFor).
// DEVELOPER DECISION: defaults true so the module is exercisable in its own tests; flip to
// false at any time before a consumer lands with no other code change required.
// UNIT: on/off.
export const AP_ENABLED = true

// DLR-104 AC1 — the player's opening AP pool, and what a perHand refresh resets to.
// DEVELOPER-CHOSEN PLACEHOLDER pending the first playtest — no consumer exists yet (AC4), so
// this number has never been played against.
// UNIT: action points.
export const STARTING_AP: ActionPoints = 6

// DLR-116 AC2, TRANSCRIBED from the ticket ("+5 AP per purchase") — not a chosen value.
// UNIT: action points added to the per-hand pool per purchase.
export const AP_CAPACITY_STEP: ActionPoints = 5

// DLR-104 AC1 — when the AP pool resets. An ENUM-SHAPED CONSTANT, not a boolean: the
// ticket's own risk note is explicit that a boolean here is what forces a refactor the day a
// playtest wants per-fight or per-run pooling instead of per-hand. `erasableSyntaxOnly` rules
// out a real TypeScript `enum` (tsconfig.app.json) — this is the same `as const` shape
// TelegraphFidelity in `config.ts` already uses.
export const ApRefreshCadence = {
  PerHand: 'perHand',
  /** DEVELOPER-SET on 2026-08-25 — the pool refills to full CAPACITY (`STARTING_AP` plus any
   *  bought bonus) at every trick boundary, not just once at the top of the hand. Read by
   *  `openBuffWindow`, which is the per-trick boundary; `refreshActionPointsForNewHand` (the
   *  per-hand boundary) is unaffected by this value. */
  PerTrick: 'perTrick',
} as const
export type ApRefreshCadence = (typeof ApRefreshCadence)[keyof typeof ApRefreshCadence]

// DEVELOPER-SET on 2026-08-25, replacing §1's "each hand" framing / the game-designer consult's
// per-hand default (DLR-104 T1): the pool now refills every trick instead of once per hand.
export const AP_REFRESH_CADENCE: ApRefreshCadence = ApRefreshCadence.PerTrick

// DLR-108 — the four per-hand reward caps DLR-124 R6 requires. Contributions past a cap are
// CLIPPED and lost; nothing is banked. Each resets PER HAND and NOT on a hit — that asymmetry is
// the rule's entire containment mechanism (`hybrid-design.md` §5, R6). AGENT-CHOSEN on
// DLR-111/DLR-124 under this sprint's tuning-value override, never played, the developer's to move.
// UNIT: action points per hand.
export const MAX_REFUND_PER_HAND: ActionPoints = 6
// UNIT: multiplier points per hand.
export const MAX_MULTIPLIER_BONUS_PER_HAND = 6
// UNIT: damage per hand.
export const MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12
// UNIT: coins per hand.
export const MAX_COIN_BONUS_PER_HAND = 10

// DLR-109 — Apply Damage's two tunables. They live here rather than in `config.ts` because that
// file is at 372 of its 400-line blocking budget and this file is already its sanctioned overflow.
// `APPLY_DAMAGE_DELAY_TRICKS` is not an AP figure; it sits beside the AP cost because the two are
// one control's pair of tunables and splitting them across two files to satisfy a filename would
// be worse.

// AC1 — what one Apply Damage press costs. DEVELOPER-SET on 2026-08-25, replacing the
// transcribed-from-ticket default of 3 (§2 of the design doc flagged it OPEN).
// UNIT: action points per press.
export const APPLY_DAMAGE_AP_COST: ActionPoints = 1

// AC2/AC5 — how many WHOLE TRICKS BEYOND the trick the press happened in a queued payout must
// survive. `0` is DLR-143 AC3's "settles at the resolution of the very next trick after the
// press": a press queues `APPLY_DAMAGE_DELAY_TRICKS + 1` trick resolutions, so a base of `0`
// means exactly one resolution is owed. Deliberately NOT typed `ActionPoints` — it counts
// tricks, not points. Read only through `applyDamageDelayTricks`, never as a literal.
// DEVELOPER-SET on DLR-143, replacing DLR-109's transcribed default of 1 (two-trick settle).
// UNIT: tricks.
export const APPLY_DAMAGE_DELAY_TRICKS = 0

// DLR-143 — the FRACTION of a queued Apply Damage payout that survives a hit which costs the
// player red health. DEVELOPER-SET on DLR-143, replacing DLR-141's 60%: one third, rounded down
// at the point of use (`reduceApplyPayoutOnHit`). The `winner !== null` branch of `applyDamage`'s
// payout expression is untouched by this constant — a resolved encounter still evaporates the
// payout in full.
// UNIT: dimensionless fraction of the frozen cashOut, 0..1.
export const APPLY_DAMAGE_HIT_RETENTION = 1 / 3
