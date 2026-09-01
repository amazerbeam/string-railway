# Headless run simulator — `src/sim/`

**Status:** implemented
**Built by:** DLR-130, DLR-120, DLR-132, DLR-135, DLR-145, DLR-146, DLR-150, DLR-154, DLR-156

## Responsibility

Plays complete hands and complete runs of the game **without a browser**, by calling the shipped
engine and the shipped felt reducer directly, and reports what happened as measurable numbers. It
exists so the game's tuning can be *measured* rather than reasoned about on paper — every AP cost,
per-hand cap and price in the V5 buff work was chosen without ever being played.

It is separate from its neighbours because it **decides nothing about the game**. `src/hunt/` and
`src/warCouncil/` own the rules; `src/app/warCouncil/` owns how a hand is played out; this module
owns only *who is at the controls* and *what gets counted*. It is a consumer of all three and is
imported by none of them.

**DLR-150 kept the simulator on the same seam rather than beside it.** The Feeder carry crosses a
hand boundary, so a simulator that never threaded it would have measured a game where the carry did
not exist: `playHandWindows.ts`'s seed now passes `run.feederCarry`, `playHand.ts` dropped its
hand-built `WarCouncilRoundResult` literal in favour of the shared `roundResultFor(ui)` — the same
one `WarCouncilRound.tsx` uses, so a field added to the result can no longer reach the felt and miss
the simulator — and `playRun.ts` hands `outcome.result.feederCarry` to `recordEncounter`. The
reachability audit's pool figure moved 13 → 16 with the restored Feeder Momentum row. See
[hunt/the-feeder-carry.md](../hunt/the-feeder-carry.md) for the mechanic itself.

## Key types & exports

| Export                                                                     | Purpose                                                                                  | File                |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------- |
| `SimPolicy`                                                                | The simulated player: four required pure decision points plus two optional levers, all asked and none trusted blindly | `types.ts`          |
| `CheatPlay`                                                                | A Cheat to arm and the off-suit card to play with it, named together                     | `types.ts`          |
| `CardChoice`                                                               | A card plus its Fox/Woodcutter ability choice — `CpuMove`'s shape, so `chooseCpuMove` satisfies it | `types.ts`  |
| `ShopAction`                                                               | One between-fights action a policy wants: `buy` / `pull` / `flask`                       | `types.ts`          |
| `HandReport` / `RunReport` / `SimSummary` / `SimOptions`                   | What one hand, one run and one batch measured                                            | `types.ts`          |
| `RunEnding`                                                                | `Won` / `Lost` / `Stalled` — `Stalled` is a driver bug, deliberately not a game outcome  | `types.ts`          |
| `baselinePolicy`, `maximalistPolicy`, `POLICIES`, `BASELINE_CASH_AT_MULTIPLIER` | The shipped players, the name registry `--policy` resolves against, and the baseline's one knob. `POLICIES` is `baseline`, `maximalist`, `noBuffs`, `rerollFocused` and `cardAware`; **DLR-145 deleted `apCapacityFocused`**, whose whole purpose was to exercise the AP-capacity lever that ticket removed — left in place it would have spent coins on nothing and quietly distorted every future comparison | `baselinePolicy.ts` |
| `mintableBuffKinds`, `unreachableBuffKinds`, `unshelvedShopItems`          | Which cards a player can actually obtain, derived from production data alone             | `reachability.ts`   |
| `playHand`, `HandOutcome`                                                  | Drives one hand through `roundReducer` and returns the felt's own `WarCouncilRoundResult` | `playHand.ts`       |
| `seedFor`, `runDiscard`, `runCheatPlay`, `runBuffWindow`                   | The four between-tricks helpers `playHand`'s driver loop calls once per open window. **Split out of `playHand.ts` by DLR-145**, which pushed that file past its 400-line budget adding the `spentThisTrick` union; `playHand.ts` keeps the driver loop, which is the part that needs all four in view at once, and re-exports `seedFor` so no importer changed | `playHandWindows.ts` |
| `withOpeningPile`, `OPENING_PILE_VARIANTS`                                 | The what-if opening-pile injection point `--pile <name>` resolves against. **`OPENING_PILE_VARIANTS` is empty as of DLR-145** — see below | `openingPileVariants.ts` |
| `playRun`                                                                  | Drives one whole run: hands, `recordEncounter`, the shop visit, `advanceRun`             | `playRun.ts`        |
| `simulate`                                                                 | The batch loop over N seeded runs                                                        | `simulate.ts`       |
| `formatSummary`                                                            | Turns a `SimSummary` into the printed report — returns a string, prints nothing          | `report.ts`         |
| `fixtureRunAfterFirstFight`, `fixtureHandWithPrimedTimebomb`, `fixtureHandWithStackedBuffs` | Deterministic deep states for component specs                           | `fixtures.ts`       |
| `MAX_ACTIONS_PER_HAND`, `MAX_HANDS_PER_FIGHT`, `MAX_SHOP_ACTIONS_PER_VISIT` | The three caps that make the process terminate                                          | `simConfig.ts`      |

The command-line entry is **`scripts/sim.ts`**, deliberately outside `src/`: it is the only file
that touches `process`, and `src/` is typed with `types: ["vite/client"]` and no `@types/node`.
`tsconfig.scripts.json` covers it.

## How it works

### Running it

```
npm run sim -- --runs 200 --seed 7 --policy baseline
```

Defaults are `--runs 200`, `--seed 1`, `--policy baseline`. The script `vite build --ssr`s
`scripts/sim.ts` into `dist-ssr/` and runs the result under node — there is **no TypeScript loader
dependency**, because node's native type-stripping cannot resolve this repo's extensionless
imports and `tsx` / `vite-node` would each be a new dependency. It always terminates.

`parseArgs` rejects an unknown flag, a missing value, a non-integer or non-finite `--seed`, and a
`--runs` below 1, exiting 1 and naming the bad argument. The `--seed` guard is not cosmetic:
`createSeededRng` (`src/hunt/seededRng.ts`) documents that `NaN` and `Infinity` both collapse onto
seed `0`'s sequence, so a silently accepted bad seed would make two "different" seeds produce
identical runs — the one failure a determinism tool must not have. An unknown `--policy` likewise
exits 1 naming the known policies rather than falling back to the baseline, because a silent
fallback would attribute one policy's numbers to another.

### The three loops

`simulate` (`simulate.ts`) maps each run index to `playRun(mixSeed(baseSeed, runIndex), policy)`.
`playRun` (`playRun.ts`) is a headless transcription of `App.tsx`'s `handleComplete` /
`leaveForNextFight`: play a hand, `recordEncounter`, then either carry `closeHand`'s deck into the
next hand of the same fight, or run the shop visit and `advanceRun`. `playHand` (`playHand.ts`)
drives one hand.

Nothing here re-implements a rule. `applyResolution`'s four-step damage/Timebomb/payout fold and
`handleTapBuff`'s activation-plus-consumable-spend live in `src/app/warCouncil/`, so the driver
**dispatches actions at the real reducer** rather than calling `playCard` directly — a driver that
skipped them would measure a game nobody plays. That is why this module imports `src/app/warCouncil/`
even though it is otherwise pure: those files are React-free TypeScript despite their folder, and
the coupling runs one way only.

### How a hand is driven

`playHand` builds the felt's seed through a single helper, `seedFor(run, dealt)`, carrying every
field `App.tsx`'s mount passes (`baseDamageBonusFor`, `playerRankTiersFor`, `apCapacityFor`, the
run's coins, cheats, charges, discards and buff pile). One helper rather than an inline literal per
call site: 44 places in `src/` build a seed of this shape, and a divergent 45th is how a field gets
forgotten.

It then loops, picking exactly **one** action per iteration in a fixed priority order read off
`roundReducer.ts`'s own guards: a `cpuFault` aborts; a resolved encounter or a complete round ends
the hand; a held trick reveal dispatches `CarryOn`; an open ability prompt dispatches
`ChooseAbility`; a between-tricks window (`discardWindowOpen`, run once per `tricksPlayed`) offers
the policy its optional discard — at most once a hand, before the buffs, because a swap changes the
hand the buff decision is made against — then its buff activations and its Apply Damage press;
`canAct` offers the policy an optional Cheat-armed play and otherwise plays a card as two `TapCard`
dispatches — arm, then commit, the real two-tap interaction; a Quarry-to-lead gap dispatches
`CarryOn`; and anything else breaks as `stalled`. At the end it assembles the same
`WarCouncilRoundResult` `WarCouncilRound.tsx`'s `handleCarryOn` reports upward.

### The two mechanics with their own files

- [The policy seam, the two policies, and why every printed number depends on them](the-policy-seam.md)
  — `SimPolicy`'s four required methods and two optional levers, why the levers are optional, how
  `runDiscard` and `runCheatPlay` drive a multi-step ritual without leaving it half-open, and what
  `baselinePolicy` and `maximalistPolicy` each actually do.
- [The reachability audit](reachability-audit.md) — which cards the game declares against which a
  player can obtain, why the spec pins today's gaps as passing assertions, and what it measured.

### What it prints

`formatSummary` groups the batch into outcomes (won / lost / stalled and the win rate), fights
reached and won, hands per encounter, damage distribution per hand to each side (mean, median, p90,
max), the economy (coins earned and spent, slot pulls, buffs owned at the end), buff and AP usage
per hand, and faults. Every division guards its divisor and prints `n/a` on an empty sample rather
than emitting `NaN`; percentiles read a sorted array by index and never interpolate.

DLR-120 added three figures, and the first of them is the one the tool was ultimately built to
produce. **`hands played holding NO activatable buff`** counts hands where
`activatableBuffs(run.buffs)` was empty at the deal — read through the *production* predicate the
loadout panel itself reads, so the simulator and the felt cannot disagree about what "holds a usable
buff" means. It converts "the buff system is barely exercised" from an inference off an activations
average into a direct measurement, and it is what separates a balance failure from an integration
one. A **`Levers`** section reports mean discards and mean Cheats armed per run, so a policy that
declares a lever but never actually pulls it is visible rather than assumed.

`Stalled` is reported separately from `Lost` throughout, so a driver bug can never be read as a
balance finding.

### The fixtures

`fixtures.ts` reuses the drivers to reach states browser QA has never been able to reach, because
coins only arrive once a fight is finished: `fixtureRunAfterFirstFight` (a `RunState` holding real
coins, a health delta and a quick-kill payout), `fixtureHandWithPrimedTimebomb` (a card marked and
the detonation booked on `encounter.pendingTimebomb`), and `fixtureHandWithStackedBuffs` (two or
more buffs activated in one trick). Each is deterministic and returns the same value every call, so
a `.test.tsx` component spec can import one and assert what that state *renders*.

`fixtureHandWithPrimedTimebomb` buys its charge through `buyFromShop(run, ShopItem.Timebomb)`
directly. That is legitimate rather than a back door: `buyFromShop` is total over `ShopItem` and
still prices Timebomb — DLR-116 pared it off the `SHOP_ITEMS` shelf, not out of the game.

> **Its success test changed shape on DLR-154, 2026-08-31, and the change is the point.** The
> driver used to wait for *a primed card **and** a booked payment* together. It now waits for a
> booked payment alone, because a detonation — whether the marked card was played or its two-trick
> fuse ran out in hand — **lifts the mark in the same transition that books the payment**. The
> co-occurrence the old test waited for is no longer a reachable state; it was the defect that
> ticket's FIX B removed. The fixture still reaches the state it names, and the tightening is what
> stops the new in-hand-fuse route silently satisfying a fixture written for the played route.

## Rules & invariants enforced

- **Purity.** `src/sim/**` was added to `eslint.config.js`'s pure-core override alongside
  `src/warCouncil/**`, `src/hunt/**` and `src/vault/**` — no React import, no DOM global. It was
  added to the *later* block's `ignores` list in the same change, because ESLint flat config
  **replaces, never merges** same-key rule options: without that entry the narrower storage-only
  list would silently overwrite the full DOM ban with `npm run lint` still exiting 0. That exact
  regression shipped once, on DLR-106.
- **Determinism.** No `Math.random()` anywhere in `src/sim/**` or `scripts/`. Every seed is folded
  by an existing helper — `mixSeed` for the run, `dealSeedFor` (via `dealHand`) for the deal,
  `slotSeedFor` / `spinSeedFor` for the strip and the spin. `chooseBuffs`' sort tiebreaks on
  `buff.id`, which is monotonic and never reused, and `maximalistPolicy`'s discard sort tiebreaks on
  suit — both orderings are total, so no tie can resolve differently between two runs of the same
  seed. Verified end to end rather than argued: two identical invocations produce byte-identical
  output.
- **Termination.** Every loop is bounded by one of `simConfig.ts`'s three caps, and hitting one is
  reported as `stalled` rather than absorbed. The run-level loop is structurally finite because
  `RunOutcome` leaves `InProgress` after a fixed encounter count or any loss.
- **Refusal before commit.** Every engine call that throws by design on a refused action is
  preceded by its matching refusal predicate. Nothing in this module catches an exception to return
  a success shape.
- **No game state is written.** The module reads configuration and calls transitions; it changes no
  rule, no tuning value and no persisted data. It never imports `src/vault/vaultStore.ts`, so it
  cannot reach the persistence tree even transitively — a simulated run plays with an empty Vault.

## Deferred / not yet implemented

- **The modelled player applies whenever a pot stands and never pushes** (DLR-156). Neither shipped
  policy implements `wantsApplyPot`, so the driver's own default answers for both. It is the
  lowest-variance line the apply-or-roll choice admits and a deliberate floor, **not a claim about
  optimal play** — and since the roll-over mechanic exists precisely for the push, every damage
  figure this tool now prints is a lower bound on what the equation can pay. Revisiting it is the
  developer's, and a policy that times its cash-out is the obvious next one to write.
- **Two policies exist, and neither is a good card player.** `POLICIES` holds `baseline` and
  `maximalist` (DLR-120), and both take their cards from `chooseCpuMove` seated on the player. A
  policy that actually plays well — one that times its cash-out, or reasons about the decree — is a
  later ticket dropped in behind the same interface; nothing in the driver needs to change to accept
  one. Every damage figure this tool prints is conditional on that limitation.
- **No policy can be given a starting buff pile.** `playRun` calls `startRun(PLAYER_START_HEALTH,
  [], seed)`, and that second argument is DLR-113's `TemplateGrant[]` — already wired, always empty
  here. Passing grants would measure the game with the buff system live from the first trick, which
  is **the single highest-value measurement still missing** (see
  [the reachability audit](reachability-audit.md)). DLR-120 deliberately did not add the flag: it is
  one step from running the balance pass, which is the developer's.
- **`Puppeteer`'s window is never opened.** No reducer opens `ConsumableTiming.BeforeOwnCard`, so the
  driver has no window to offer it in even if a template ever mints one.
- **No balancing was done here, and none should be read out of this module.** DLR-130 shipped the
  instrument, not the readings. The developer's balance pass is a separate exercise, and the
  first observation this tool recorded is in `../run-winnability-simulation.md`.
- **`OPENING_PILE_VARIANTS` is empty, and the seam is deliberately kept.** DLR-145 deleted both
  named what-if piles: `conditionsOnlyOpeningWeightOf` zeroed exactly the three families (`miser`,
  `keepsake`, `cornered`) that ticket removed from `BUFF_TEMPLATES` outright, and
  `recommendedOpeningWeightOf` compared a template's axis against `apRefund` and `coins` — neither of
  which `MintableRewardAxis` has a member for any more, so the comparison no longer compiles. **The
  reduced pool *is* the recommendation those variants existed to measure.** `withOpeningPile` and
  the (now empty) `OPENING_PILE_VARIANTS` map stay, so `SimConfig.openingPileVariant`, `playRun.ts`'s
  lookup and the `--pile` flag need no edit — an unknown `--pile <name>` fails exactly as it always
  did, with no names left to ask for. A future what-if pile is one new entry, not a structural
  change. `EXCLUDED_OPENING_KINDS`, `EXCLUDED_OPENING_AXIS`, `COINS_WEIGHT_FACTOR` and
  `SIDESTEP_WEIGHT_FACTOR` went with them.
- **No export format but plain text.** No CSV, no JSON, no charting, no parallel or multi-process
  batching. `--runs` has a lower bound but no upper one, so a very large batch is simply slow.
- **The Vault is not simulated.** Starting grants and Vault-adjusted slot odds
  (`drawVaultReelPool`) are out of the loop; the driver calls `drawReelPool` directly.
