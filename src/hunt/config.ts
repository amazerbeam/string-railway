import { QuarryCharacter, DuelSide, type Health, type Damage } from './types'

// §5 "Player health" — DECIDED, and small on purpose: Balatro tracks 4 hands and 3 discards as
// integers held in the head against score requirements in the hundreds and thousands, and §5
// says the asymmetry here is the same shape. At 2-4 health lost a hand, 25 is roughly eight
// hands. Replaces DLR-66's 1,350, which belonged to the retired Standing arithmetic.
// UNIT: health points, depleted 1 at a time.
export const PLAYER_START_HEALTH: Health = 25

// PLACEHOLDER — THE DEVELOPER'S TO SET, from the first play session and not from this file.
// §5 states CPU health "cannot be derived honestly yet": it depends on how large real cash-outs
// get, which is a function of play rather than arithmetic. DLR-80's Dependencies & Risks
// authorises a plainly-labelled placeholder and forbids inventing the real figure.
// The anchor behind 1000, stated so it can be argued with rather than trusted: 25 player health
// is roughly eight hands; §3.3's worked hand deals 173 but wins five of six tricks, and a hand
// that trades evenly deals perhaps a third of that. Eight hands at ~125 is ~1,000.
// One entry, not two: the second encounter is out of scope for DLR-80.
// UNIT: health points, encounter 0.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [1000]

/**
 * Throws a `RangeError` rather than returning `undefined`: an out-of-range index would
 * otherwise become `NaN` on the first subtraction and vanish from a health bar with no error
 * logged anywhere — a bad index is a caller bug.
 */
export function quarryHealthForEncounter(index: number): Health {
  const health = QUARRY_ENCOUNTER_HEALTH[index]
  if (health === undefined) {
    throw new RangeError(
      `No Quarry health configured for encounter ${index} (${QUARRY_ENCOUNTER_HEALTH.length} configured)`,
    )
  }
  return health
}

// Health restored to the player entering the next encounter. NEW TO DLR-65 — the epic states
// no restore, and the breakdown names this the single thing most likely to change, so it
// exists as a tunable precisely so testing a restore is a one-line edit.
// UNIT: health points, added once between encounters. VALUE: the developer's.
export const ENCOUNTER_PLAYER_RESTORE: Health = 0

// §5 / §9 "Simultaneous depletion" — DECIDED 2026-08-11: both bars empty on the same Hunt and
// the player loses. Data rather than a hardcoded branch, so DLR-65 T5 reads an attributed
// ruling instead of an unexplained `if`.
export const SIMULTANEOUS_DEPLETION_WINNER: DuelSide = DuelSide.Quarry

// §9 "Forage budget per encounter" — decided, provisional (developer decision,
// 2026-08-09 per DLR-48 AC3): 4 edits.
export const FORAGE_BUDGET_PER_ENCOUNTER = 4

// §9 "Encounters per run" — undecided in §9 itself; DLR-48 AC3 sets a
// provisional 5 so the prototype is playable.
export const ENCOUNTERS_PER_RUN = 5

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

// §11 "any single character is sufficient; which of the five is not load-bearing". Not a
// tuning value: DLR-51 enforces only the Monarch's rule-break and QUARRY_CHARACTERS holds
// only its copy, so this is forced by what is implemented. It exists as a key so T13 has
// exactly one place to change when the other four characters land.
export const SLICE_QUARRY_CHARACTER: QuarryCharacter = QuarryCharacter.Monarch

// §3.1/§5 — six cards each, six tricks. ONE constant, not two: every card dealt is played, so
// hand size and trick count cannot differ, and two constants that must be equal is a bug waiting
// for one of them to be edited. SETTLED (§5).
// UNIT: cards dealt to each side, and therefore tricks in a hand.
export const HAND_SIZE = 6

// §5 "Skull density, first CPU" — roughly 30% of the CPU's dealt cards carry a skull. SETTLED as
// a proportion; the count it produces is Math.round(HAND_SIZE * SKULL_DENSITY) = 2 of 6, which is
// 33%. AC2 requires this be named rather than written at its point of use.
// UNIT: proportion of the CPU's dealt hand, 0..1.
export const SKULL_DENSITY = 0.3

// §3.4 "never rank 1", stated as the lowest rank a skull may sit on. SETTLED — a skulled 1 cannot
// lose a trick, so no amount of foreknowledge helps and the dodge is unavailable. The distribution
// ACROSS the eligible ranks is §6 Q1's open question: uniform today, and `assignSkulls` takes it
// as a parameter so testing a skew is a change at one call site.
// UNIT: rank.
export const SKULL_MIN_RANK = 2

// §5 "Damage to the player" — 1, every time they take damage (AC10). SETTLED.
// UNIT: health points per damage event.
export const DAMAGE_PER_HIT: Damage = 1
