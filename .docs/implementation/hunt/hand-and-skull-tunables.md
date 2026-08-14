Part of [Hunt](README.md).

# The hand, the skulls, and the damage constants

Every number DLR-80's loop turns on is a named export in `config.ts`, carrying its unit, its design
citation, and whose decision the value is. Nothing in the loop reads a literal at its point of use.

This file replaced `scoring-tunables.md`, which documented the two Standing multiplier tables, the
per-declaration card-value accessor, and rank inversion. **All of that was deleted by DLR-80** — see
[what went](#what-dlr-80-deleted-from-this-module) at the foot.

## The four new keys

| Key | Value | Unit | Status |
| --- | --- | --- | --- |
| `HAND_SIZE` | `6` | cards a side, and therefore tricks in a hand | settled |
| `SKULL_DENSITY` | `0.3` | proportion of the Quarry's dealt hand, 0..1 | settled |
| `SKULL_RANK_WEIGHTS` | `SKULL_WEIGHTS_HUMP` | relative weight per rank, ≥ 0, unitless | provisional (PT-001) |
| `DAMAGE_PER_HIT` | `1` | health points per damage event | settled |

`SKULL_MIN_RANK` was the fourth key here until **PT-001** absorbed it into the weight curves — see
[the rank curve](#the-rank-curve-replaced-the-rank-floor-pt-001) below.

### `HAND_SIZE` is deliberately one constant, not two

The design states "six cards each, six tricks", and the two **cannot** differ — every card dealt is
played, so the hand ends exactly when the last card does. Two constants that must be equal is a bug
waiting for one of them to be edited, so there is one.

It is read by `dealRound` (to slice both hands) and by `playCard` (to decide when `phase` becomes
`Complete` and when to fire the end-of-hand cash-out), and by `RoundStatusBand.tsx` for the "trick N
of 6" readout — which had been a hard-coded `13` at its point of use until DLR-80 replaced it with
this read.

It replaced `TRICKS_PER_ROUND`, which lived in `src/warCouncil/types.ts`. Moving it here put it
beside every other tunable rather than in the engine that happened to use it first.

### `SKULL_DENSITY` produces a count, and the count is what matters

`Math.round(HAND_SIZE × SKULL_DENSITY)` = `Math.round(1.8)` = **2 of 6**, which is 33% — the design's
"roughly 30%". It is stated as a proportion rather than a count so that changing the hand size scales
the skulls with it.

`assignSkulls` clamps the result to the number of *eligible* cards, so a hand that cannot carry two
skulls carries fewer rather than throwing.

### The rank curve replaced the rank floor (PT-001)

Which ranks carry skulls is a **table**, not a floor. `SkullRankWeights` is
`Readonly<Record<number, number>>` — a relative weight per rank, where `0` means never and only the
ratios matter, so a curve can be reshaped without renormalising it.

Four curves ship as named constants. **`SKULL_RANK_WEIGHTS` is the one in force**, and changing that
single reference is the whole cost of play-testing a different shape:

| Curve | Weights, rank 1 → 11 | In force? |
| --- | --- | --- |
| `SKULL_WEIGHTS_UNIFORM` | `0,1,1,1,1,1,1,1,1,1,1` | no — the pre-PT-001 behaviour, kept as the reference point |
| `SKULL_WEIGHTS_RAMP` | `0,1,2,3,4,5,6,7,8,9,10` | no |
| `SKULL_WEIGHTS_HUMP` | `0,2,5,8,10,10,8,5,2,1,1` | **yes** |
| `SKULL_WEIGHTS_AMBUSH` | `0,10,9,8,7,6,5,4,3,2,1` | no |

**"Never rank 1" is now `1: 0` in every curve**, which is why `SKULL_MIN_RANK` was deleted rather
than kept — the two stated the same rule twice. The table form is also the stronger guarantee: a
config test asserts `curve[1] === 0` across every shipped curve, so the rule extends to any curve
added later, where a single floor constant only ever covered the current draw.

**Hump is a decision, not a default — and it is provisional.** The developer chose it on 2026-08-14
from a rendered comparison of all four curves plus a 300,000-hand simulation of the per-rank skull
rates each produces. Its reasoning is that the extremes of the scale remove the player's decision,
so the weight belongs in the middle band where the player's own card settles the trick (see
`.docs/design/Balatro-Forbidden-Solitaire/ideas.md` → "Worth costing"). **Nobody has played it yet**,
so expect the numbers to move; that is the marker, not a caveat.

**The three unused curves are exported on purpose and must not be deleted as dead code.** They are
the intended difficulty and variety lever — a later opponent handed the ambush curve plays very
differently from one handed the ramp, with no new rule anywhere. Wiring a curve *to* an opponent is
not built.

`assignSkulls` takes both `density` and `weights` as **defaulted parameters** rather than closing over
these constants, so testing a curve is a change at one call site with no module state mutated — the
same injectable idiom `startEncounter`'s `playerHealth` uses. The two are orthogonal: density decides
how many skulls, the curve decides which ranks.

### `DAMAGE_PER_HIT` is flat, and that is the rule

Exactly 1, every time the player takes damage — losing a clean trick or winning a skull trick. It
does not scale with the cards, the streak, or the hand. Typed `Damage` so it cannot be confused with
a rank or a health total at a call site.

## The health totals

| Key | Value | Status |
| --- | --- | --- |
| `PLAYER_START_HEALTH` | `25` | **settled** |
| `QUARRY_ENCOUNTER_HEALTH` | `[1000]` | **a placeholder — the developer's** |
| `ENCOUNTER_PLAYER_RESTORE` | `0` | not built, still no consumer |
| `SIMULTANEOUS_DEPLETION_WINNER` | `DuelSide.Quarry` | settled |

**The two totals are asymmetric on purpose.** The player's 25 is a small integer held in the head;
the Quarry's lands in the hundreds or thousands because it absorbs `bank × multiplier`. The design
names Balatro's *4 hands, 3 discards* against score requirements in the thousands as the same shape.
At 2–4 health lost per hand, 25 is roughly eight hands.

25 replaced DLR-66's 1,350, which belonged to the retired Standing arithmetic. One consequence worth
knowing: `duelHealthBars`'s denominator changed scale by ~54×, so the player's bar now moves in nine
or so discrete steps of 1 rather than draining smoothly. Whether that reads well is a visual question
for the developer.

### The Quarry's health is a labelled placeholder, not a decision

`QUARRY_ENCOUNTER_HEALTH = [1000]` and **the code says so in its own comment**. The design states
outright that CPU health cannot be derived honestly yet: it depends on how large real cash-outs get,
which depends on how long streaks actually run, and that is a function of play rather than
arithmetic.

The anchor behind 1000 is written beside it so it can be argued with rather than trusted: 25 player
health is roughly eight hands; the design's worked hand deals 173 but wins five of six tricks, and a
hand that trades evenly deals perhaps a third of that; eight hands at ~125 is ~1,000. **That is an
anchor, not a derivation.**

**It dropped from two entries to one** — the second encounter is out of scope. The array type and
`quarryHealthForEncounter`'s `RangeError` are both kept unchanged: the throw is what turns a stale
`encounterIndex: 1` into a loud failure rather than an `undefined` that becomes `NaN` on the first
subtraction and vanishes from a health bar with nothing logged.

### `DuelSide` is not `PlayerSide`, and the distinction is load-bearing

`DuelSide` (`player` / `quarry`) names the two sides that **hold health**. `src/warCouncil/`'s
`PlayerSide` (`player` / `cpu`) names the two **seats at a trick**. They are deliberately separate
types with deliberately different member names, because `src/hunt/` cannot import from
`src/warCouncil/` without a cycle.

The crossing between them happens **exactly once in the program**, in `src/warCouncil/bank.ts`'s
`incomingFrom` — which is on the warCouncil side because that is the side allowed to know both
vocabularies. `IncomingDamage` is `Readonly<Record<DuelSide, Damage>>`, keyed by the side each figure
**depletes** rather than the side that dealt it, so the direction is carried by the data rather than
trusted to whoever reads it next. Before DLR-80 the same crossing was `scoring.ts`'s
`duelSideDamage`; the function moved and its convention did not.

## The unchanged tunables

`FORAGE_BUDGET_PER_ENCOUNTER` (4), `ENCOUNTERS_PER_RUN` (5), `TELEGRAPH_FIDELITY` (`SuitAndStance`),
`SLICE_QUARRY_CHARACTER` (`Monarch`) and `ENCOUNTER_PLAYER_RESTORE` (0) were untouched by DLR-80. The
first two and the last still have **no consumer** — Forage and the run sequence are unbuilt.

## What DLR-80 deleted from this module

Removed outright, with no dead references left behind:

`StandingBandName`, `StandingBand`, `HUNT_MULTIPLIER_TABLES`, `standingTableFor`, `resolveStanding`,
`cardBaseValue`, `RANK_INVERSION_PIVOT`, `invertedCardValue`, `PaidPile`, `CardValueScheme`,
`CARD_VALUE_SCHEMES`, `cardValueSchemeFor`, `cardValueFor`, `DamageRounding`, `DAMAGE_ROUNDING`,
`roundDamage` — and from `types.ts`, `HuntDeclaration`, `Spoils` and `Standing`.

The reasoning, in the design's own terms: six tricks give seven possible outcomes, which cannot carry
four bands without one trick swinging a whole band — and the streak multiplier replaces what the
bands were for. The declaration existed to select a multiplier table and a card-value scheme, so it
had nothing left to select. Rank inversion and the pile swap died with the declaration. And rounding
went because **no fractional damage is producible any more**: the bank is a sum of integer ranks and
the multiplier an integer count, so there is no division anywhere in the new arithmetic.
