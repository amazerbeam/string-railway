/**
 * Setup-generation constants. None of these is a rules.json tunable: the M2/M6/
 * M8/M17 tunables all live in RulesConfig. What is here is either a value with
 * fixed meaning (a colour, a §2.1 component count) or a numeric bound on a
 * search (segment counts, retry ceilings) — the same category as search.ts's
 * REFINEMENT_DEPTH and turn.ts's ROUNDS_PER_GAME.
 */

/**
 * The five player colours (§2 — five colours of components). A colour never
 * changes value, so this is a constant map, not a tunable. `display` is the SVG
 * stroke/fill. The palette itself is visual judgement — mutual
 * distinguishability, contrast against the terrain strokes and WCAG AA are the
 * developer's to confirm.
 */
export const COLOUR_SEATS = [
  { id: 'RED', label: 'Red', display: '#e0403f' },
  { id: 'BLUE', label: 'Blue', display: '#2f7fd4' },
  { id: 'YELLOW', label: 'Yellow', display: '#e6b52c' },
  { id: 'GREEN', label: 'Green', display: '#3aa757' },
  { id: 'PINK', label: 'Pink', display: '#c760a8' },
] as const

/** Terrain stroke colours (§2 names them green mountain, blue river, black border). */
export const TERRAIN_DISPLAY = {
  BORDER: '#2b2b2b',
  RIVER: '#3f9fd0',
  MOUNTAIN: '#3f7d4a',
} as const

/**
 * §4.3 / SCRUM-4 AC5 — the mountain's centre is offset from the play-area
 * centre by a random 0-15% of the border's inradius. A stated spec range, not
 * an unchosen number. It IS a difficulty lever, so it is a candidate to promote
 * to rules.json if the developer wants to tune it.
 */
export const MOUNTAIN_OFFSET_FRACTION = 0.15

/**
 * Rendering-fidelity bounds. Raising either costs vertices and generation time;
 * neither changes arc length, because both shapes are sized so their polyline
 * length equals the configured length exactly.
 */
export const MOUNTAIN_SEGMENTS = 48
export const RIVER_SEGMENTS = 32

/** Total turn the river may accumulate across its whole walk, radians. Bounds how
 *  far it can curl, which is what keeps it a readable arc rather than a spiral. */
export const RIVER_MAX_TOTAL_TURN = Math.PI * 0.75

/** Fraction of a border edge, from each end, where the river may not start —
 *  keeps its mouth clear of the corners the starting stations occupy. */
export const RIVER_EDGE_MARGIN = 0.2

/**
 * Retry ceilings (SCRUM-4 AC9): generation retries rather than emitting an
 * illegal board, and exhausting a ceiling surfaces an error instead of looping
 * forever. The river's is highest because it is the most constrained sampler
 * and the brief names it as the one likeliest to fail on a cramped board.
 */
export const MAX_MOUNTAIN_ATTEMPTS = 40
export const MAX_RIVER_ATTEMPTS = 200
export const MAX_STATION_ATTEMPTS = 60

/** Bisection depth for the corner-station inset search (§4.1 step 6 — the
 *  smallest inset at which the card is fully inside the border). */
export const STATION_INSET_DEPTH = 24

/** §2.1 derived per-seat supply: 4 short + 1 long string, 2 player markers. */
export const SHORT_STRINGS_PER_SEAT = 4
export const LONG_STRINGS_PER_SEAT = 1
export const MARKERS_PER_SEAT = 2
