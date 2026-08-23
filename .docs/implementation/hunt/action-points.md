Part of [Hunt](README.md).

DLR-104 gave this module a resource with no consumer yet — `actionPoints.ts` is a standalone,
pure module shipped ahead of the two tickets (T5 buff activation, T6 Apply Damage) that will
actually spend against it. Nothing in `RunState` or `EncounterState` holds a live AP pool: this
ticket ships the rule, not the state field that rule will one day operate on. That field is
explicitly the next ticket's to add, once there is something to spend AP on.

**The toggle is the point of the ticket, not a side detail.** `AP_ENABLED` (`config.ts`, default
`true`) is read in exactly one place — `apCostFor`. `canAffordAp` and `spendAp` both call
`apCostFor` rather than re-checking the flag themselves, so a future consumer that wants to know
whether an action is affordable, or wants to spend for it, never writes its own
`if (AP_ENABLED) …` branch. This mirrors `src/warCouncil/voluntaryCashOut.ts`'s
`applyDamageRefusalFor`: one function every caller goes through, so the *rule* — not just the
*flag* — lives in one place. Flip `AP_ENABLED` to `false` in `config.ts` and every AP-gated action
becomes free, with zero other code change.

`apCostGiven(cost, enabled)` exists solely so both branches of that toggle are independently
unit-testable. `AP_ENABLED` is a real exported `const`, not a mutable test seam, so the only way to
assert the *disabled* branch's behaviour without depending on the constant's live value is to
expose the branch-taking logic as a pure function that takes `enabled` as an explicit parameter.
`apCostFor` is the only one of the two a real consumer should ever call.

**The refresh rule is a single function reading a cadence, not a boolean.** `refreshActionPointsForNewHand(currentAp)`
reads `AP_REFRESH_CADENCE` (`config.ts`, an `as const`-shaped enum matching the `TelegraphFidelity`
pattern, since `erasableSyntaxOnly` rules out a real TypeScript `enum`). For `PerHand` — the only
cadence that exists today — it returns `STARTING_AP` regardless of the incoming pool. For any other
cadence value it passes `currentAp` through unchanged; that branch is dead code today (there is
only one member), but it is what lets a later per-fight or per-run cadence be added as one new
config entry and one new `if`, rather than a boolean-to-enum type change.

`spendAp(pool, cost)` throws a `RangeError` rather than clamping to zero when `pool` cannot cover
the (toggle-adjusted) cost — the same discipline `src/hunt/cheats.ts`'s `removeCheat` uses for a
double-spend. An unaffordable spend reaching this function is a caller bug to surface loudly, not a
state to paper over silently.

**Developer decisions carried by this ticket, not yet exercised by play:** `STARTING_AP = 6` is an
unplayed placeholder — no consumer exists yet to balance it against, exactly like every other
freshly-shipped tunable in this module at launch. `AP_ENABLED` defaulting `true` is a judgement
call the brief didn't state a default for; it was chosen so the module is exercisable in its own
tests, and is a one-line flip either way before a real consumer lands.
