_Part of [Hunt](README.md)._

### Standing band resolution

`STANDING_BANDS` is a flat array of six `StandingBand` rows covering trick counts 0–13 with no gap
and no overlap: 0–3 Humble ×6, 4 Defeated ×1, 5 Defeated ×2, 6 Defeated ×3, 7–9 Victorious ×6,
10–13 Greedy ×0. `resolveStanding(tricks, table = STANDING_BANDS)` in `config.ts` does a linear
scan for the row whose `[minTricks, maxTricks]` contains `tricks`, and throws a `RangeError` for
anything outside 0–13 (there's always exactly one match inside that range by construction, so an
out-of-range call is treated as a caller bug, not a data gap). The table is a second, optional
parameter rather than a value the function closes over directly — this is what lets
`__tests__/config.test.ts` prove the function is genuinely table-driven (a test builds a mutated
copy of the table, confirms the resolved multiplier changes, then confirms the real
`STANDING_BANDS` export is unaffected) without ever mutating shared module state between tests.

### Card base value

`cardBaseValue(rank)` in `config.ts` is a one-line identity function (`rank => rank`) encoding the
§9/§3 decision that a card's Hunt value is its printed rank rather than a flat 1 — flat 1 would
collapse Spoils×Standing to the single-variable function `2k×f(k)`; rank-weighting keeps the two
terms of the scoring equation independent.

### Demand curve, Forage budget, and run length

`DEMAND_CURVE` ships as `{ base: null, growthPerEncounter: null }`, typed `DemandCurve` with both
fields `number | null` — not defaulted to `0` or any other number. §9 marks this row "Undecided,"
and DLR-48's own acceptance criteria supply provisional numbers for every other §9 row except this
one; a consumer must not coerce either field to `0`. `FORAGE_BUDGET_PER_ENCOUNTER` (`4`) and
`ENCOUNTERS_PER_RUN` (`5`) are the two constants DLR-48 does supply provisional values for, each
with a comment citing its §9 row and provisional status.
