import { QuarryCharacter, type Health, type Damage, type Coins } from './types'

// §5 "Player health" — DECIDED, and small on purpose: Balatro tracks 4 hands and 3 discards as
// integers held in the head against score requirements in the hundreds and thousands, and §5
// says the asymmetry here is the same shape.
// SET BY THE DEVELOPER 2026-08-14, down from 25. At 2-4 health lost a hand, 25 was roughly eight
// hands and the player's bar was never actually under threat inside a three-hand encounter —
// which made losing a trick cheap enough that throwing trick 1 (no bank to forfeit yet) was close
// to free. 10 makes a hand's worth of losses matter. Replaces DLR-66's 1,350, which belonged to
// the retired Standing arithmetic.
// UNIT: health points, depleted 1 at a time.
export const PLAYER_START_HEALTH: Health = 10

/** DLR-85 AC3 — whether a path entry is an ordinary opponent (a tick) or a stage boss
 *  (a filled block). The ONLY two node types; the ticket puts rewards, shops and events
 *  off the path explicitly. */
export const OpponentKind = {
  Ordinary: 'ordinary',
  Boss: 'boss',
} as const
export type OpponentKind = (typeof OpponentKind)[keyof typeof OpponentKind]

/**
 * DLR-85 AC4 — the ordinary opponents, in run order. THE DEVELOPER'S LIST, 2026-08-15,
 * replacing the deck-rank names (Swan, Fox, Woodcutter, Witch, Monarch) the design used
 * until now. Ten women and ten men. `as const` so an index read is a string literal
 * rather than a possibly-undefined element.
 *
 * Fadas are ordinary Unicode and need NO special handling. The ticket records plain
 * anglicisations as a fallback; nothing here implements one, because nothing needs to.
 */
export const ORDINARY_OPPONENT_NAMES = [
  'Aoife',
  'Cillian',
  'Niamh',
  'Eoin',
  'Saoirse',
  'Rónán',
  'Maeve',
  'Fergus',
  'Órla',
  'Declan',
  'Sinéad',
  'Pádraig',
  'Bríd',
  'Lorcán',
  'Clodagh',
  'Tadhg',
  'Róisín',
  'Cormac',
  'Aisling',
  'Oisín',
] as const

/** The five stage bosses, in order. Diarmuid closes the run and is the boss the design
 *  intends to ignore follow-suit — that power is a later ticket's, not this one's. */
export const STAGE_BOSS_NAMES = [
  'Bréanainn',
  'Muireann',
  'Conchobhar',
  'Gráinne',
  'Diarmuid',
] as const

/** One encounter of the run: who it is, what they are, and how much health they hold. */
export interface RunEncounterConfig {
  readonly name: string
  readonly kind: OpponentKind
  readonly health: Health
}

// How many ordinary opponents precede each stage boss. From the developer's sketch
// (2026-08-15): four ticks then a block, five times over. `runPath` NEVER reads this — a
// stage is derived from where a boss actually sits, so changing this reshapes the run
// without touching the path model.
// UNIT: ordinary opponents per stage. VALUE: the developer's.
export const ORDINARY_PER_STAGE = 4

// The health curve's three tunables. PLACEHOLDER VALUES: twenty-five hand-written figures
// would be twenty-five tuning decisions, so the SHAPE is here and the NUMBERS are the
// DEVELOPER'S — see this contract's tasks.md, "Developer decides or observes".
//
// BASE and STEP are chosen to reproduce DLR-82's existing curve EXACTLY at indices 0..2:
// 10, 14, 18. Entry 0's 10 is the developer's measured value (2026-08-14, PT-002, where
// the encounter lasted ~1.9 hands and random legal play won 63.8%) and this formula does
// not disturb it. BOSS_HEALTH_MULTIPLIER is the only genuinely new number.
//
// The run is NOT expected to be winnable on these values — Oisín holds 86 and Diarmuid
// 129 against a player starting on 10. DLR-82 already recorded that the answer is the
// shop and later stories, NOT raising PLAYER_START_HEALTH.
// UNIT: health points; health points per ordinary step; unitless multiplier.
export const ORDINARY_HEALTH_BASE: Health = 10
export const ORDINARY_HEALTH_STEP: Health = 4
export const BOSS_HEALTH_MULTIPLIER = 1.5

/**
 * `[ORDINARY_PER_STAGE × Ordinary, Boss]`, repeated until either roster list runs out —
 * so the two name lists are the run's length ceiling and no index can go out of range.
 *
 * An ordinary opponent's health is BASE + STEP × (how many ordinary opponents precede it);
 * a boss's is that same figure times the multiplier, `Math.round`ed so no fractional
 * health can reach a heart row that renders whole hearts.
 */
function buildRunEncounters(): readonly RunEncounterConfig[] {
  const encounters: RunEncounterConfig[] = []
  let ordinariesUsed = 0
  for (const bossName of STAGE_BOSS_NAMES) {
    for (let i = 0; i < ORDINARY_PER_STAGE; i += 1) {
      const name = ORDINARY_OPPONENT_NAMES[ordinariesUsed]
      if (name === undefined) break
      encounters.push({
        name,
        kind: OpponentKind.Ordinary,
        health: ORDINARY_HEALTH_BASE + ORDINARY_HEALTH_STEP * ordinariesUsed,
      })
      ordinariesUsed += 1
    }
    encounters.push({
      name: bossName,
      kind: OpponentKind.Boss,
      health: Math.round(
        (ORDINARY_HEALTH_BASE + ORDINARY_HEALTH_STEP * ordinariesUsed) * BOSS_HEALTH_MULTIPLIER,
      ),
    })
  }
  return encounters
}

/**
 * THE run's sequence — AC2's "the same source the run itself reads", literally rather than
 * approximately. Its length IS the run's length, its `kind` positions decide the stages,
 * and its `health` figures are what QUARRY_ENCOUNTER_HEALTH projects.
 *
 * MUST stay declared above QUARRY_ENCOUNTER_HEALTH: that projection reads this at module
 * init, and a forward reference evaluates as `undefined` and throws on `.map`.
 *
 * Still a plain array. Replacing the builder with twenty-five explicit literals later is a
 * local edit with no consumer change.
 */
export const RUN_ENCOUNTERS: readonly RunEncounterConfig[] = buildRunEncounters()

// The Quarry's health, one entry per encounter, in run order — now a PROJECTION of
// RUN_ENCOUNTERS rather than a hand-written literal (DLR-85). A second array beside the
// roster is the source that drifts: a fourth name with only three healths would render a
// fourth node for a fight that throws the moment the player reached it.
// Opens 10, 14, 18 exactly as it did before DLR-85.
// UNIT: health points, indexed 0..n-1 by encounter.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = RUN_ENCOUNTERS.map((e) => e.health)

/**
 * THE range guard for the run's sequence, in one place. Throws a `RangeError` rather than
 * returning `undefined` for the reason this module already gave: an out-of-range index
 * becomes `NaN` on the first subtraction and vanishes from a health bar with no error
 * logged anywhere. A bad index is a caller bug.
 */
export function runEncounterAt(index: number): RunEncounterConfig {
  const encounter = RUN_ENCOUNTERS[index]
  if (encounter === undefined) {
    throw new RangeError(
      `No opponent configured for encounter ${index} (${RUN_ENCOUNTERS.length} configured)`,
    )
  }
  return encounter
}

/** Unchanged signature and behaviour; the guard now lives in `runEncounterAt` so it is
 *  stated once rather than twice. */
export function quarryHealthForEncounter(index: number): Health {
  return runEncounterAt(index).health
}

// Health restored to the player entering the next encounter. NEW TO DLR-65 — the epic states
// no restore, and the breakdown names this the single thing most likely to change, so it
// exists as a tunable precisely so testing a restore is a one-line edit.
// UNIT: health points, added once between encounters. VALUE: the developer's.
export const ENCOUNTER_PLAYER_RESTORE: Health = 0

// §9 "Forage budget per encounter" — decided, provisional (developer decision,
// 2026-08-09 per DLR-48 AC3): 4 edits.
export const FORAGE_BUDGET_PER_ENCOUNTER = 4

// §9 "Encounters per run" — DERIVED, never chosen. `QUARRY_ENCOUNTER_HEALTH` is the single source
// of truth for run length (DLR-82 AC1); a free-standing number beside it is the second source that
// drifts, and any value larger than the array is a RangeError from `quarryHealthForEncounter`
// waiting to happen. Replaces DLR-48 AC3's provisional 5, which sat beside a one-entry array.
export const ENCOUNTERS_PER_RUN = QUARRY_ENCOUNTER_HEALTH.length

// DLR-132 — how many bronze Cheat BUFFS `startRun` seeds into `RunState.buffs`. Re-homed from the
// retired two-slot rail: the pile has no capacity cap, so the old 0..CHEAT_SLOT_COUNT guard has
// nothing left to guard. The VALUE is unchanged, so a run opens holding exactly the one Cheat it
// always has — whether it should open holding one at all is still the developer's open question.
// UNIT: bronze Cheat buffs in the opening pile.
export const RUN_STARTING_CHEATS = 1

// DLR-105 AC3, superseded by DLR-145 AC6 — the run's opening buff-pile size, all bronze.
// TRANSCRIBED FROM DLR-145 (design §3.4): a fight runs two to four hands at six tricks each, so
// firing about one card a trick makes twenty close to exactly one fight's ammunition — the player
// reaches the first shop nearly empty, with coins to restock. Drawn WITH REPLACEMENT from a
// 16-template pool (`startingPile.ts`), so the pile holds duplicates by design.
// UNIT: buffs granted once, at the start of a run, all at BuffTier.Bronze.
export const STARTING_BUFF_COUNT = 20

// DLR-84 AC1, superseded by DLR-145 AC7 — what beating an opponent pays. TRANSCRIBED FROM DLR-145,
// not chosen here. Credited by `recordEncounter`.
// UNIT: coins, credited once per encounter won.
export const COINS_PER_ENCOUNTER_WIN: Coins = 10

// DLR-84 AC3 — the shop's two prices. Both TRANSCRIBED, both 1, and deliberately TWO keys rather
// than one shared price: the ticket predicts the player buying Heal every visit and names
// re-pricing the Cheat as the one-line answer, which is only one line if they are separate.
// UNIT: coins per purchase.
export const CHEAT_PRICE: Coins = 1
export const HEAL_PRICE: Coins = 1

// DLR-158 — the max-health purchase's price is NOT a key here. It climbs with the number already
// bought, so it is a formula rather than a constant, and it lives with its rule in
// `src/hunt/maxHealth.ts` — exactly as `RANK_TIER_STEP_PRICE` lives in `rankTiers.ts`.

// DLR-116 — what one AP-capacity purchase costs. A separate key from HEAL_PRICE for the reason
// CHEAT_PRICE and HEAL_PRICE are already separate: re-pricing one item must not move another.
// VALUE UNCHOSEN — a documented placeholder, NEVER PLAYED. The developer's to move.
// UNIT: coins per purchase.
export const AP_CAPACITY_PRICE: Coins = 3

// DLR-84 AC4 — health restored by one Heal, BEFORE the clamp to PLAYER_START_HEALTH. TRANSCRIBED.
// No longer the only source of healing: DLR-93 landed the flask below, a FREE charge-limited heal
// sized as a proportion of the maximum rather than a flat figure. There is still no rest site, and
// `ENCOUNTER_PLAYER_RESTORE` above stays deliberately unread — the flask is a separate,
// player-triggered mechanic, not that tunable finally being wired in.
// UNIT: health points, added once on purchase.
export const HEAL_HEALTH_RESTORED: Health = 4

// DLR-93 AC1 — how many flask charges a run opens with, and the figure a stage-boss kill refills
// to. TRANSCRIBED from version-4-scope.md §2 ("Carried as a single charge ... refilled to one
// charge each time a stage boss is beaten"). NOT an open tuning value: the epic explicitly defers
// re-tuning the charge count ("revisit only if it plays too thin"). ONE key rather than a separate
// refill figure, because the run's full-flask amount is one number — a second key beside it is the
// one that gets raised without the other.
// UNIT: flask charges.
export const FLASK_STARTING_CHARGES = 1

// DLR-93 AC2 — the proportion of MAXIMUM health one flask restores, before the clamp. TRANSCRIBED
// from version-4-scope.md §2 ("Restores 60% of the player's maximum health — 6 points at today's
// provisional 10"). A PROPORTION in 0..1, exactly like SKULL_DENSITY below, NOT a 0..100
// percentage — AC2's formula is Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT).
// Deliberately a percentage of the maximum rather than a flat figure like HEAL_HEALTH_RESTORED
// above: it must stay an emergency heal if PLAYER_START_HEALTH moves again, as it already has once.
// UNIT: proportion of maximum health, 0..1.
export const FLASK_HEAL_PERCENT = 0.6

// DLR-92 AC1 — the Whetstone's price. TRANSCRIBED from version-4-scope.md §1's own heading
// ("Run-permanent — new item: Whetstone (placeholder name), 4 coins"), which prices it as "the
// shop's one real splurge": four times a Heal, and reachable early only via the quick-kill payout
// rather than by grinding 1-coin fight wins. NOT chosen here and NOT an open tuning value. Its own
// key for the reason every other item's price already has one: re-pricing one item must not move
// another.
// UNIT: coins per purchase.
export const WHETSTONE_PRICE: Coins = 4

// DLR-95 AC2 — the quick-kill payout's tier curve: COINS PER CARD left unplayed, indexed by
// (hand of the fight − 1). TRANSCRIBED from version-4-scope.md §4 ("×2 in the first hand, ×1 in
// the second, ×0.5 in the third, ×0 from the fourth on"), which marks the curve "Confirmed as
// final" — NOT an open tuning value.
//
// A hand beyond this array's length pays 0, which IS AC5's taper: the array's LENGTH is the rule,
// so extending or shortening the curve is one edit here and no code change. ONE key rather than a
// separate coins-per-card rate beside it — the ×1 second-hand tier IS the design's "1 coin per
// card" base, and two numbers that must multiply out to the documented figure is the pair that
// drifts.
//
// All three values are exactly representable in binary, so `cards × multiplier` is exact and
// needs no numerator/denominator treatment.
// UNIT: coins per card left unplayed in the player's hand at the kill.
export const QUICK_KILL_TIER_MULTIPLIERS: readonly number[] = [2, 1, 0.5]

// Which opponent the single encounter is fought against. Purely an IDENTITY LABEL — it selects
// a name for the dossier panel and nothing else. No character carries a mechanical power:
// DLR-81 deleted the Monarch's round-long rule-break, and powers are deferred to a final-boss
// ticket rather than given to every opponent. Forced by what QUARRY_CHARACTERS holds, so not a
// tuning value; it exists as a key so the later roster ticket has one place to change.
export const SLICE_QUARRY_CHARACTER: QuarryCharacter = QuarryCharacter.Monarch

// §3.1/§5 — six cards each, six tricks. ONE constant, not two: the Quarry is dealt this many and
// plays exactly this many, so its hand size and the trick count cannot differ, and two constants
// that must be equal is a bug waiting for one of them to be edited. SETTLED (§5).
//
// DLR-146 — this is NO LONGER the number of cards the PLAYER plays through in a hand. The player
// is topped back up to `PLAYER_HAND_FLOOR` as tricks resolve, so they see more than `HAND_SIZE`
// cards and end the hand still holding some, which `closeHand` sweeps to the spent pile. The trick
// count is still `HAND_SIZE`, because the Quarry still runs out.
// UNIT: cards dealt to each side, and therefore tricks in a hand.
export const HAND_SIZE = 6

// DLR-146 — the player's hand is topped back up to this many cards as each trick resolves, so the
// last tricks of a hand stay decisions instead of the one card left in hand. The Quarry NEVER
// refills. SET THIS TO 0 TO RESTORE PRE-DLR-146 BEHAVIOUR EXACTLY, with no other edit anywhere:
// the refill is a single `hand.length < PLAYER_HAND_FLOOR` test, so a floor of 0 is unreachable
// rather than a second code path. PROVISIONAL — chosen to be played, not derived.
// UNIT: cards held by the player.
export const PLAYER_HAND_FLOOR = 4

// §5 "Skull density, first CPU" — roughly 30% of the CPU's dealt cards carry a skull. SETTLED as
// a proportion; the count it produces is Math.round(HAND_SIZE * SKULL_DENSITY) = 2 of 6, which is
// 33%. AC2 requires this be named rather than written at its point of use.
// UNIT: proportion of the CPU's dealt hand, 0..1.
export const SKULL_DENSITY = 0.3

// §5 "Damage to the player" — 1, every time they take damage (AC10). SETTLED.
// UNIT: health points per damage event.
export const DAMAGE_PER_HIT: Damage = 1

// DLR-156 AC10 — the damage every BANKED trick starts from, before any buff and before the
// run's `baseDamageBonus`. THE single statement of it: `resolveTrickBank` is the only reader,
// and nothing else may write a bare 1 into the damage equation.
//
// A CONSTANT, deliberately. `roll-over-damage-model.md` → Out of scope: a card family that
// raises the base — paying back only if the streak survives — is a separate design, and
// nothing in this ticket may make this figure a variable. UNIT: damage.
export const BASE_DAMAGE: Damage = 1

// DLR-100 D4/D5 (the-discard.md) — the discard's two figures. BOTH PROVISIONAL, the developer's
// values set 2026-08-19, explicitly expected to move after play — the design doc's own words:
// "ship it, play it, move it." Two separate keys, not one shared number, because they answer
// different questions — how many TIMES per fight vs how BIG one throw can be — and retuning one
// must not accidentally move the other.
// UNIT: DISCARDS_PER_FIGHT — discard actions per fight, reset by advanceRun at every fight
// boundary. MAX_CARDS_PER_DISCARD — cards per single discard action.
export const DISCARDS_PER_FIGHT = 3
export const MAX_CARDS_PER_DISCARD = 3

// DLR-108 — the AP tunables moved to `./apConfig` when this file reached its 400-line blocking
// budget, the same split `run.ts` → `runTransitions.ts` already made. Re-exported here so every
// existing importer (`actionPoints.ts`, `index.ts`, the specs) resolves unchanged.
export {
  AP_ENABLED,
  STARTING_AP,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
  MAX_REFUND_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_COIN_BONUS_PER_HAND,
  AP_CAPACITY_STEP,
} from './apConfig'

// DLR-155 — the telegraph tunables moved to `./telegraphConfig` when this file reached its
// 400-line blocking budget, the same split `apConfig.ts` already made. Re-exported here so every
// existing importer (`cpuPlayer.ts`, `index.ts`, the specs) resolves unchanged.
export {
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  QUARRY_LEAD_TELEGRAPH_ENABLED,
} from './telegraphConfig'
