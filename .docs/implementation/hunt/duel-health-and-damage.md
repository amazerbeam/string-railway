_Part of [Hunt](README.md)._

Everything on this page was added by **DLR-66**, which shipped all of it with no consumer at all —
deliberately, so every number the rest of the DLR-65 epic needs would exist in one file, provably
swappable in a single edit.

**Most of it now has one.** DLR-68 made `scoreHunt` the first caller of `roundDamage`, and DLR-70's
`src/hunt/encounter.ts` is the first production reader of `PLAYER_START_HEALTH`,
`quarryHealthForEncounter` and `SIMULTANEOUS_DEPLETION_WINNER` — see
[The encounter state and the end conditions](encounter-state-and-end-conditions.md) for what reads
them and how. **`ENCOUNTER_PLAYER_RESTORE` is the one constant on this page still read by nothing**,
and that is intentional: it applies between encounters, which is DLR-73's.

**And since DLR-71 a player can see it.** `src/app/` imports the encounter module — `App.tsx` seeds and
carries an `EncounterState`, the round reducer applies each Hunt's damage — and both health totals on
this page are now drawn as bars, each showing its side's current health against the maximum these
constants set. `PLAYER_START_HEALTH` and `quarryHealthForEncounter` are read a second time in
`App.tsx`, for the bars' **denominator**, which `EncounterState` does not carry. See
[../war-council-ui/duel-health-bars.md](../war-council-ui/duel-health-bars.md).

### The two sides — `DuelSide`

`DuelSide` in `types.ts` is an `as const` union of `player` and `quarry`, with `Health` as a bare
`number` alias beside it.

It is **deliberately not** `src/warCouncil/types.ts`'s `PlayerSide` (`player` | `cpu`), and the
distinction is worth holding onto because the two will need mapping later. `PlayerSide` names the
engine's two *seats at a trick*; `DuelSide` names the two sides that *hold health*. The import
direction settles it regardless of preference: `src/warCouncil/` already imports `src/hunt/`, so
`src/hunt/` cannot import back without a cycle. The design's vocabulary (§10) also calls the
opponent the Quarry rather than the CPU.

**That mapping now exists, in exactly one place.** DLR-70's `duelSideDamage(outcome)` in
`src/warCouncil/scoring.ts` is the only `PlayerSide` → `DuelSide` crossing in the program, and it sits
on the warCouncil side because that is the side allowed to know both vocabularies. The two unions were
deliberately **not** unified — they name genuinely different things, and one adapter is cheaper than
collapsing the distinction. `DuelSide` is no longer confined to `src/hunt/`; a *second* crossing
appearing anywhere is what to grep for.

### The rounding rule

Both tables carry a ×0.5 band, so `card value × Standing` is fractional for the first time in this
codebase — an odd card sum under a ×0.5 band produces a half-point product. §9 records the rounding
row as **Undecided** and offers a dissolution rather than an answer: double every multiplier in both
tables and both health totals, and every product is an integer with nothing left to round. That is
the same table in a different presentation, not a different table.

DLR-66 ships a **stated default** rather than a `null`, because the epic says the row cannot be
deferred past its second phase:

- `DamageRounding` — a closed two-value union, `HalfAwayFromZero` and `None`. Two values because
  that is exactly what §9 describes: one rule, and the doubled presentation that needs no rule.
- `DAMAGE_ROUNDING` — `HalfAwayFromZero`. **The developer's to overturn**, and cheaply: switching to
  the doubled presentation is this constant plus both tables plus both health totals, every one of
  them in `config.ts`.
- `roundDamage(raw, rule = DAMAGE_ROUNDING)` — applies it.

Two implementation details carry real weight:

**It is `Math.sign(raw) * Math.round(Math.abs(raw))`, never bare `Math.round`.** JavaScript's
`Math.round` breaks ties toward `+∞`, so `Math.round(-0.5)` is `-0` — which would make the constant's
name a lie. Damage should never be negative, but the function is written to be correct rather than
to depend on that, and a test pins both `-0.5 → -1` and `0.5 → 1`.

**The rule is a defaulted parameter, not something the function closes over.** This is the same
injectable pattern `resolveStanding`'s table uses, and for the same reason: a test proves both
settings without mutating module state, so no test can leak a rounding mode into the next one.

`roundDamage` throws a `RangeError` on a non-finite input rather than rounding it. A `NaN` rounded
into a health bar renders nothing and logs nothing, which is the failure mode that never gets
reported — so it fails loudly at the one place a fractional multiplier enters the system.

### Health, the restore, and the depletion ruling

| Export | Value | Status |
|---|---|---|
| `PLAYER_START_HEALTH` | `1350` | §9 "Player health P" — **Decided 2026-08-11**, the developer's value |
| `QUARRY_ENCOUNTER_HEALTH` | `[1350, 1600]` | The first bar is §9's Decided Quarry health `H`; the 1,600 second encounter is **new to DLR-65** |
| `ENCOUNTER_PLAYER_RESTORE` | `0` | **New to DLR-65** — the epic states no restore |
| `SIMULTANEOUS_DEPLETION_WINNER` | `DuelSide.Quarry` | §5 / §9 — **Decided 2026-08-11**: both bars empty on the same Hunt and the player loses |

**`P = H` is a design property, not a coincidence.** The player's health equals the Quarry's
first-encounter health deliberately: that equality is what puts the win/lose boundary exactly on the
6/7 line the declaration commits to. §5 states the property survives any later rescaling of health,
so a future tuning pass that moves both numbers together keeps it — and one that moves only one
breaks it silently.

**Which character carries the 1,600 second bar is an assumption**, not a decision. The epic
describes that encounter only by its health total; the Monarch is named because it is the only
character with round-long enforcement on disk (`src/warCouncil/quarryRuleBreak.ts`).

`ENCOUNTER_PLAYER_RESTORE` exists as a tunable *precisely because* it is `0`. The epic's breakdown
names it the single thing most likely to change, so it is a named constant rather than an absent
mechanism — testing a restore is then a one-line edit instead of a new feature.

`quarryHealthForEncounter(index)` throws a `RangeError` rather than returning `undefined` for an
index it has no health for. Same posture as `resolveStanding`: an out-of-range index would otherwise
become `NaN` on the first subtraction and vanish from a health bar with no error logged anywhere.
The sequence is a `readonly Health[]` rather than a fixed two-tuple so a third encounter is one more
entry, not a type change. **DLR-70 relies on that guard rather than duplicating it** —
`startEncounter` validates its own `playerHealth` and lets this `RangeError` propagate for a bad
index.

`SIMULTANEOUS_DEPLETION_WINNER` is data rather than a branch so that the code reading it presents an
attributed ruling instead of an unexplained `if`. **DLR-70's `resolveWinner` is that reader**, and it
returns the constant directly for the both-bars-empty case; its spec asserts the *rule* by comparing
against the constant, while `__tests__/config.test.ts` remains the single assertion of its *value*.
Overturning §9's ruling is therefore still an edit to this file alone.
