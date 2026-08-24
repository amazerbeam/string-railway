/**
 * DLR-130 — the caps that make the simulator TERMINATE. None of these is a game tuning value:
 * they exist so a driver bug, an engine change, or a badly written policy produces a reported
 * `stalled` run instead of a process that never exits — this project's `npm run dev` trap in a
 * new costume. Every one is set an order of magnitude above anything a real game reaches.
 */

/** Reducer dispatches allowed for ONE hand. A six-trick hand costs roughly 20-40. UNIT: dispatches. */
export const MAX_ACTIONS_PER_HAND = 400

/** Hands allowed in ONE fight. A fight is normally decided in 1-6. UNIT: hands. */
export const MAX_HANDS_PER_FIGHT = 40

/** Policy shop actions allowed at ONE visit before the driver stops asking. UNIT: actions. */
export const MAX_SHOP_ACTIONS_PER_VISIT = 40
