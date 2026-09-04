# `src/sim/` architecture map

**Scope header:** everything below is structural — file responsibilities and current extension
points in this codebase's own `src/sim/` tree. It is not a versioned third-party API; there is no
live source to resolve. It will drift only if `src/sim/` itself is refactored, in which case re-read
the files directly rather than trusting this map.

## The three loops

| File | Loop | Drives |
|---|---|---|
| `src/sim/playHand.ts` | inner | one hand, by dispatching `RoundUiAction`s at `roundReducer` — the same reducer the UI calls |
| `src/sim/playRun.ts` | middle | one whole run: repeats `playHand` until an encounter resolves, then the shop, then `advanceRun` |
| `src/sim/simulate.ts` | outer | N seeded runs into one `SimSummary`, via `mixSeed(baseSeed, runIndex)` |

`scripts/sim.ts` is the CLI on top of `simulate` — `npm run sim -- --runs <N> --seed <S> --policy <name>`.
It lives outside `src/` because it needs Node globals `src/` is deliberately typed without.

## The policy seam

`src/sim/types.ts`'s `SimPolicy` interface is the only thing that varies between `baselinePolicy`
and `maximalistPolicy` (`src/sim/baselinePolicy.ts`), and where a new strategy question becomes a
new policy:

```
chooseCard(round): CardChoice           // which card + ability choice to play
wantsApplyDamage(ui): boolean           // press Apply Damage this window?
chooseBuffs(ui): readonly BuffId[]      // which owned buffs to activate, in order
nextShopAction(run): ShopAction | null  // buy / pull / flask / null (leave)
chooseDiscard?(ui): readonly Card[]     // optional
wantsCheatPlay?(ui): CheatPlay | null   // optional
```

Every method is advisory — `playHand.ts`'s driver re-asks the engine's own refusal predicate
(`applyDamageRefusalFor`, `loadoutRefusalFor`, `discardRefusalFor`, …) before dispatching anything a
policy asks for, and skips rather than throws on a refusal. This is why a new policy can be sloppy
about edge cases: the driver is the actual safety net.

Register a new policy in `POLICIES` (`src/sim/baselinePolicy.ts`, exported through `src/sim/index.ts`)
to make it selectable via `--policy <name>`.

## The report shape

`src/sim/types.ts`:

- `HandReport` — one hand's facts (damage each way, the four trick outcomes counted, buffs activated, AP spent, Apply
  Damage presses, coins from buffs, `activatableBuffsHeld` at hand start, discards/cheats used,
  `stalled`/`fault` bug signals).
- `RunReport` — one run's facts (seed, `RunEnding`, fight reached, fights won, the hand-by-hand
  `HandReport[]`, economy totals, `deadCardRefusals`).
- `SimSummary` — a policy name, base seed, and every `RunReport` from one batch.

`src/sim/report.ts`'s `formatSummary` is the ONLY thing that turns a `SimSummary` into the printed
text `npm run sim` shows — it prints a fixed set of aggregates (win rate, damage percentiles, mean
buff activations, etc.) and nothing per-buff-kind or per-hand-number today. Extending a field on
`HandReport`/`RunReport` does **not** require touching `formatSummary` — a query script can read the
richer data directly. Only touch `formatSummary` when a new aggregate genuinely belongs in the
headline report every run prints, not for a one-off question.

**Where to populate a new field:**
- Hand-level (e.g. "which buff kind was refused"): inside `runBuffWindow` or `playHand` itself
  (`src/sim/playHand.ts`), summed the same way `deadCardRefusals`/`apSpentTotal` already are — note
  the existing docblock warning that a start/end diff undercounts anything that crosses a per-trick
  AP refill, so sum at the spend site, not by subtracting before/after.
- Run-level (e.g. a new economy total): inside `playRun.ts`'s main loop, alongside `coinsEarned`/
  `slotPulls`.

## Reachability vs. simulated play

`src/sim/reachability.ts` answers a *different* question than the simulator: not "how often does a
buff get used," but "does any production path mint this buff/shop item at all." It's pure, data-only,
and reads `BUFF_TEMPLATES`/`SHOP_ITEMS`/`startRun()` directly — no reducer, no `rng`. Check here first
if a question is really about a card's existence rather than its performance (e.g. "is this buff kind
even obtainable" vs. "how often does the player get value from it").

## Interactive replay (for a single-seed "why" question)

There is no standing script for this today — `scripts/verify-ap-and-payout.ts` is the closest existing
example of the pattern (drives `startRun`/`dealHand`/`roundReducer` directly, outside `src/`, to prove
a specific scenario without a browser). A replay script for play-testing follows the same shape but
generalizes it:

1. Take a seed and an ordered list of decisions made so far (start empty).
2. Rebuild the run/hand deterministically from the seed and replay each prior decision through
   `roundReducer`, exactly as `playHand.ts` does per-action.
3. At the resulting state, compute the actual legal options via the engine's own functions —
   `legalMoves(round, PlayerSide.Player)`, `offeredBuffs(ui)`, `applyDamageRefusalFor(...)`,
   `discardRefusalFor(...)` — the same ones `roundReducer` itself consults. Print them plus the
   relevant state (hand, trick history, health, bank, multiplier, AP pool).
3. Exit. The next invocation appends one more decision to the list and repeats.

This gives an engine-verified legal-move list every time — never a guessed or hand-maintained one —
at the cost of one script run per decision, which is why step 5 of `SKILL.md` restricts this mode to
a handful of hands on one seed, not a bulk answer.
