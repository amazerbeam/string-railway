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

### The Lose path's rank inversion

`invertedCardValue(rank)` in `config.ts` returns `RANK_INVERSION_PIVOT - rank`, i.e. `12 − r`
(DLR-63 AC3). The pivot is a named constant rather than an inlined `12`, and it is **not** a tuning
value: `12` is `max(RANKS) + 1` for this deck's 1–11 range, which is what makes the inversion its own
inverse — rank 1 and rank 11 swap, rank 6 maps to itself, and every output stays inside 1–11 with no
zero and no negative. `__tests__/config.test.ts` asserts all four of those properties directly
(the full rank table, that the mapped set equals the original set, that applying it twice is the
identity, and that rank 11 inverts to something greater than zero).

The signature match with `cardBaseValue` is the load-bearing design choice. Both are
`(rank: number) => number`, so `spoils` takes each as an injectable parameter and branches on the
declaration rather than on any knowledge of how a value is computed — see
[../war-council/scoring.md](../war-council/scoring.md). Nothing here divides, so no inverted value
can be `NaN` or `Infinity`.

### The Lose-credit cap

`LOSE_CREDITS_PER_HUNT` is `3`, in units of **credits per Hunt**, each spendable on exactly one lost
trick. Its comment in `config.ts` records the unit, that the value is the developer's, and the
arithmetic behind the placeholder — this is a documented derivation, not a chosen number, and
`README.md`'s Deferred section carries what to watch for. It is typed `number` rather than
`number | null` specifically so no consumer can coerce a `null` to `0` and silently hand the player
an empty pool — the trap `DEMAND_CURVE`'s own comment warns about.

The engine never reads this key. `declareHunt` takes the pool as a parameter, and it reaches the
screen through the `Hunt` prop as `hunt.loseCredits`, so `src/warCouncil/` stays free of the tunable
and no component holds a numeric literal standing in for it.

### Demand curve, Forage budget, and run length

`DEMAND_CURVE` ships as `{ base: null, growthPerEncounter: null }`, typed `DemandCurve` with both
fields `number | null` — not defaulted to `0` or any other number. §9 marks this row "Undecided,"
and DLR-48's own acceptance criteria supply provisional numbers for every other §9 row except this
one; a consumer must not coerce either field to `0`. `FORAGE_BUDGET_PER_ENCOUNTER` (`4`) and
`ENCOUNTERS_PER_RUN` (`5`) are the two constants DLR-48 does supply provisional values for, each
with a comment citing its §9 row and provisional status.
