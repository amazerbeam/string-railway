export const PATH_KIND = {
  SHORT_RAIL: 'SHORT_RAIL',
  LONG_RAIL: 'LONG_RAIL',
  MOUNTAIN: 'MOUNTAIN',
  RIVER: 'RIVER',
  BORDER: 'BORDER',
} as const

export const TURN_PHASE = {
  STATION: 'STATION',
  STRING: 'STRING',
  COMPLETE: 'COMPLETE',
} as const

export const MOVE_KIND = {
  BEGIN_TURN: 'BEGIN_TURN',
  PLACE_STATION: 'PLACE_STATION',
  SKIP_STATION_STEP: 'SKIP_STATION_STEP',
  PLACE_STRING: 'PLACE_STRING',
  FORFEIT_STRING: 'FORFEIT_STRING',
  END_TURN: 'END_TURN',
} as const

/** Rules.md §10.2, in reject order. The trailing number is the check's position. */
export const REJECTION_REASON = {
  NOT_IN_SUPPLY: 'NOT_IN_SUPPLY', // 1
  WRONG_LENGTH: 'WRONG_LENGTH', // 2 (M6)
  SELF_INTERSECTS: 'SELF_INTERSECTS', // 3
  ENDPOINT_OFF_STATION: 'ENDPOINT_OFF_STATION', // 4
  NETWORK_DISCONNECTED: 'NETWORK_DISCONNECTED', // 5
  STATION_ENTERED_TWICE: 'STATION_ENTERED_TWICE', // 6
  TERMINUS_PASS_THROUGH: 'TERMINUS_PASS_THROUGH', // 7
  PLAYER_LIMIT_EXCEEDED: 'PLAYER_LIMIT_EXCEEDED', // 8 (M15)
  LEAVES_BORDER: 'LEAVES_BORDER', // 9 (M7)
  DEGENERATE_TANGENCY: 'DEGENERATE_TANGENCY', // 10 (M8)
} as const

/** §5.2 station-placement constraints, used by validateStationPlacement. */
export const STATION_REJECTION_REASON = {
  TOUCHES_STRING: 'TOUCHES_STRING',
  TOUCHES_STATION: 'TOUCHES_STATION',
  NOT_INSIDE_BORDER: 'NOT_INSIDE_BORDER',
} as const

/** Why step 1 of a turn was skipped. */
export const SKIP_REASON = {
  DECK_EMPTY: 'DECK_EMPTY', // M5
  NO_LEGAL_PLACEMENT: 'NO_LEGAL_PLACEMENT', // M4, after 3 consecutive failures
} as const

/**
 * parseRulesConfig failure codes (SCRUM-3 AC4). Every one names a specific
 * malformed-config condition so the startup error can say which key is wrong
 * rather than "invalid config".
 */
export const CONFIG_FAILURE = {
  NOT_AN_OBJECT: 'NOT_AN_OBJECT',
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  MISSING_KEY: 'MISSING_KEY',
  NOT_A_NUMBER: 'NOT_A_NUMBER',
  NOT_POSITIVE: 'NOT_POSITIVE',
  TOLERANCE_OUT_OF_RANGE: 'TOLERANCE_OUT_OF_RANGE',
  LONG_NOT_LONGER_THAN_SHORT: 'LONG_NOT_LONGER_THAN_SHORT',
  DECK_COUNT_NOT_INTEGER: 'DECK_COUNT_NOT_INTEGER',
  DECK_TOTAL_MISMATCH: 'DECK_TOTAL_MISMATCH',
  DECK_TYPE_NOT_ALLOWED: 'DECK_TYPE_NOT_ALLOWED',
} as const

/**
 * validateSetup failure codes (SCRUM-4 AC9). These are the §4.1 setup
 * invariants, NOT §10.2's in-play REJECTION_REASON codes — §4.1 step 6
 * requires a starting station to touch the border, which §5.2 forbids for an
 * in-play placement. Two distinct rule sets, two distinct code sets.
 */
export const SETUP_FAILURE = {
  BORDER_SELF_INTERSECTS: 'BORDER_SELF_INTERSECTS',
  BORDER_WRONG_PERIMETER: 'BORDER_WRONG_PERIMETER',
  MOUNTAIN_SELF_INTERSECTS: 'MOUNTAIN_SELF_INTERSECTS',
  MOUNTAIN_WRONG_LENGTH: 'MOUNTAIN_WRONG_LENGTH',
  MOUNTAIN_OUTSIDE_BORDER: 'MOUNTAIN_OUTSIDE_BORDER',
  MOUNTAIN_TOUCHES_BORDER: 'MOUNTAIN_TOUCHES_BORDER',
  MOUNTAIN_TOUCHES_RIVER: 'MOUNTAIN_TOUCHES_RIVER',
  RIVER_SELF_INTERSECTS: 'RIVER_SELF_INTERSECTS',
  RIVER_WRONG_LENGTH: 'RIVER_WRONG_LENGTH',
  RIVER_OUTSIDE_BORDER: 'RIVER_OUTSIDE_BORDER',
  RIVER_BORDER_TOUCH_COUNT: 'RIVER_BORDER_TOUCH_COUNT',
  RIVER_TOO_NEAR_MOUNTAIN: 'RIVER_TOO_NEAR_MOUNTAIN',
  STATION_OUTSIDE_BORDER: 'STATION_OUTSIDE_BORDER',
  STATION_NOT_TOUCHING_BORDER: 'STATION_NOT_TOUCHING_BORDER',
  STATION_TOUCHES_TERRAIN: 'STATION_TOUCHES_TERRAIN',
  STATION_TOUCHES_STATION: 'STATION_TOUCHES_STATION',
  SEAT_COUNT_MISMATCH: 'SEAT_COUNT_MISMATCH',
  SEAT_STARTING_STATION_MISSING: 'SEAT_STARTING_STATION_MISSING',
} as const

/**
 * UI-level action kinds for useGame. Deliberately NOT added to MOVE_KIND:
 * Move is the persisted move-log union that undo and replay derive from, and
 * starting a new game is not an event in a game's own history. Widening Move
 * would force a new case through every existing switch and invalidate any
 * stored log.
 */
export const GAME_ACTION = {
  NEW_GAME: 'NEW_GAME',
  MOVE: 'MOVE',
} as const

/**
 * §5.2's draw-and-recycle sequence, made reportable (SCRUM-5 AC5/AC7/AC8/AC9).
 * beginStationStep already performs every one of these; without a trace it
 * performs them invisibly, and a Landmark bounced for want of a marker is
 * indistinguishable from a clean draw.
 *
 * Deliberately NOT added to MOVE_KIND, for the reason GAME_ACTION records
 * above: Move is the persisted log undo and replay derive from, and every
 * event here is re-derivable by replaying that log through beginStationStep.
 */
export const DRAW_EVENT = {
  DREW: 'DREW',
  RECYCLED_NEEDS_MARKER: 'RECYCLED_NEEDS_MARKER', // §7.3 — both markers already placed
  RECYCLED_NO_LEGAL_PLACEMENT: 'RECYCLED_NO_LEGAL_PLACEMENT', // M4 — counts toward the skip
  SKIPPED_NO_LEGAL_PLACEMENT: 'SKIPPED_NO_LEGAL_PLACEMENT', // M4 — 3 consecutive failures
  SKIPPED_DECK_EMPTY: 'SKIPPED_DECK_EMPTY', // M5 — nothing is ever reshuffled
  EXTRA_DRAW_FROM_RURAL: 'EXTRA_DRAW_FROM_RURAL', // §7.3 Draw Station
  RURAL_CHAIN_CAPPED: 'RURAL_CHAIN_CAPPED', // §7.3 "disregard it — never a third"
} as const

/**
 * Which stage of §10.4 step 1 the state is in. AWAITING_DRAW and SKIPPED both
 * present as phase STATION with no pendingCard — see src/rules/staging.ts for
 * what separates them.
 */
export const STATION_STEP_STAGE = {
  AWAITING_DRAW: 'AWAITING_DRAW',
  PLACING: 'PLACING',
  SKIPPED: 'SKIPPED',
  DONE: 'DONE',
} as const
