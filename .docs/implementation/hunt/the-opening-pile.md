Part of [Hunt](README.md).

# The opening pile — the four real bronze cards a run starts with

`src/hunt/startingPile.ts` (DLR-135, 2026-08-25) owns one question: **what is in a player's pile the
instant `startRun` returns?** Before this ticket the answer was "four stubs nothing can use"; it is
now "four distinct, real, bronze cards drawn from the shipping catalog".

## What it replaced, and why the replacement was overdue

DLR-105's `seedStartingBuffPile` lived in `buffs.ts` and minted `STARTING_BUFF_COUNT`
`BuffKind.Unassigned` stubs, each carrying `UNASSIGNED_BUFF_CONDITION` and `UNASSIGNED_BUFF_REWARD`.
Its own docblock gave the reason: the real catalog (design doc §5) was not yet authored. **DLR-111
authored it and DLR-112 built the reel that draws from it, and the scaffold outlived that reason by
four tickets.** Meanwhile `activatableBuffs` correctly filtered all four straight back out — so a
run opened holding exactly **one** usable card, the guaranteed bronze Cheat `RUN_STARTING_CHEATS`
adds. See [the buff pile](buff-pile.md) for the record of that scaffold as it stood.

## The four exports

| Export                                                | Answers                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `startingPileSeedFor(runSeed)`                        | the opening pile's own seed stream — `mixSeed(runSeed)`                                              |
| `openingPileWeightOf(template)`                       | a template's draw weight for the opening pile                                                        |
| `seedStartingBuffPile(count, firstId, rng, weightOf?)` | `count` distinct bronze cards, consecutive ids from `firstId`                                        |
| `startingBuffPileFor(count, firstId, runSeed)`        | the seed derivation and the draw in one call — **the** call `startRun` makes                         |

## How the draw works

`startRun` calls `startingBuffPileFor(STARTING_BUFF_COUNT, 1, runSeed)`. That derives
`startingPileSeedFor(runSeed)`, builds a `createSeededRng` over it, and hands the generator to
`seedStartingBuffPile`, which runs `weightedDrawWithoutReplacement(BUFF_TEMPLATES,
openingPileWeightOf, rng, count)` and mints each drawn template through `mintFromTemplate` at
`BuffTier.Bronze` with consecutive ids from `firstId`. Exactly one `rng()` call is spent per card.

Four properties are deliberate and each is load-bearing:

- **Seeded, with its own named stream.** `startingPileSeedFor` is a **one-part** `mixSeed` fold —
  deliberately a different shape from `dealSeedFor`'s and `slotSeedFor`'s three-part folds, so the
  opening pile cannot collide with a deal or a spin. The same `runSeed` reproduces the same opening
  hand, which DLR-130's simulator and the developer's balance pass both depend on.
- **`rng` is a required parameter, never defaulted.** A defaulted generator would let a call site
  drop determinism with no compile error, and determinism is the one property this function must not
  lose. `weightOf`, by contrast, **is** defaulted — exactly as `drawReelPool`'s is — so a curve can
  be tested without mutating module state.
- **Drawn without replacement**, so the opening hand holds four *different* cards rather than four
  copies of one.
- **Bronze, always.** The tier is fixed at the call, not drawn.

`startingPile.ts` is inside the lint-enforced pure-core tree: no React, no DOM global, and no
`Math.random()` — `eslint.config.js`'s `src/hunt/**` override forbids it and `npm run lint` is a
gate.

## The weight contributes no number of its own

`openingPileWeightOf(template)` is the **sum of `templateWeightFor(machineId, template)` across every
`SLOT_MACHINE_IDS` member** — that is, over both the Skirmisher and the Strongbox reel tables. It is
a derivation over `SLOT_FAMILY_WEIGHTS` and `SLOT_AXIS_WEIGHTS` as they already ship, and **DLR-135
introduced no new weight table and no new coefficient** (its AC3 forbids changing a tuning value).

Two alternatives were considered and rejected, and the reasons are worth keeping:

- **A third `SLOT_FAMILY_WEIGHTS`-shaped table for the opening pile** would have been eleven-plus
  unchosen numbers on a ticket that may not change a tuning value, each needing its own balance pass
  before it meant anything.
- **Taking one machine's table** would silently hand every opening hand that machine's lean —
  Skirmisher's trick bias or Strongbox's coin bias — with nobody having chosen it. Summing is
  **machine-neutral by construction**, which is the right posture because the opening pile is not a
  slot machine.

`templateWeightFor` already returns `0` rather than dividing when its denominator is `0`, so no `NaN`
can enter the sum; a sum of non-negative finite terms is non-negative and finite.

Both sub-decisions are **one-line reversals**, recorded here because a later balance pass may want
them: `templateWeightFor(SlotMachineId.Skirmisher, template)` for a trick-lean opening hand, and
`if (template.form === 'activated') return 0` to exclude Cheat and Timebomb.

## Cheat and Timebomb are eligible draws

They have been ordinary members of `BUFF_TEMPLATES` since DLR-132, and excluding them here would
re-introduce exactly the special-casing that ticket removed. So **a run can open holding more than
one Cheat, or two Timebombs**, and the guaranteed bronze Cheat is no longer the pile's only
`Cheat`. Bronze Cheat prices at 3 AP and bronze Timebomb at 2 AP against a 6-AP opening pool —
neither is degenerate at bronze.

This is why `reachability.test.ts` no longer asserts
`buffs.filter(kind === Cheat).length === RUN_STARTING_CHEATS`: that stopped being a true statement of
intent for every seed. It asserts instead that the pile's **final** `RUN_STARTING_CHEATS` members are
the guaranteed Cheats — a position claim the count-only original could not make.

## The short-draw guard

`seedStartingBuffPile` **throws `RangeError`** when `weightedDrawWithoutReplacement` returns fewer
than `count` templates, naming the count, the number drawn, and the two weight tables to check. It
mirrors `drawReelPool`'s short-strip guard for the same stated reason: a pile shorter than asked is a
**configuration bug** — an all-zero weight table — not a legal state, and it would otherwise surface
far from its cause. Unreachable with the shipped tables (73 templates, every family weighted ≥ 1 on
both machines), but a zeroed row is one edit away. The project's `throw new` site count went 99 → 100
and none was weakened.

`mintFromTemplate`'s own `RangeError` on a condition template with no reward ladder is unchanged and
is **now reachable from `startRun`**, which is correct: a template the reward ladder cannot price
must not become an opening card silently.

## Why it is a module of its own

Forced, not preferred. The new implementation must import `buffTemplates.ts` (`BUFF_TEMPLATES`,
`mintFromTemplate`) and `slotWeights.ts` (`templateWeightFor`,
`weightedDrawWithoutReplacement`), and **both of those import `buffs.ts`** — keeping the function in
`buffs.ts` would open exactly the import cycle `slotWeights.ts`'s own docblock refuses to open for
`warCouncil`. `slotMachine.ts` was the alternative home and was rejected: the opening pile is not a
slot machine, and that file is already 203 lines of one coherent subject.

The module is deliberately written as the **sibling of `slotMachine.ts`'s `drawReelPool`** — derive a
named seed from `runSeed`, weight the pool, draw distinct templates without replacement, throw on a
short draw, mint at a fixed tier with consecutive ids. Read side by side they should show one pattern
applied twice, not two designs.

## `BuffKind.Unassigned` survived, and the distinction matters

**Nothing in production mints it any more** — that is the whole of what DLR-135 removed. The member
itself was **kept, deliberately**, and it is now the codebase's **retained canonical unpriced-kind
sentinel** rather than live placeholder content. Five guard suites read it by name:

- `buffActivation.priced.test.ts` — the `isPricedBuff` / `activatableBuffs` guard;
- `buffCosts.test.ts` — `apCostOf` throws `RangeError` on it;
- `consumables.test.ts` — the not-a-consumable fixture, nine uses;
- `src/app/__tests__/ErrorBoundary.test.tsx` — asserts the literal string
  `apCostOf: no AP price for buff kind "unassigned"`;
- `src/sim/reachability.ts` — excludes it by name from both the mintable and the unreachable sets.

Deleting the member would force each of those to fabricate an unpriced kind through a cast, which
**weakens the very guard the ticket asked to preserve**. So DLR-135 removed the **cause** and left
the **guard** intact: `isPricedBuff` and `activatableBuffs` are byte-identical across the change, and
`UNASSIGNED_BUFF_CONDITION` / `UNASSIGNED_BUFF_REWARD` stay exported as the one place that literal is
stated. A follow-up ticket may delete the member, but it must own rewriting those five fixture sites.

## What a run actually opens holding

**Five cards, and all five are activatable**: four random real bronze draws
(`STARTING_BUFF_COUNT = 4`) plus the one guaranteed bronze Cheat (`RUN_STARTING_CHEATS = 1`, seeded
as an ordinary pile member since DLR-132). Ids run `1..4` for the draws, then the Vault's grants, then
the Cheats — `startRun` keeps `nextBuffId` as the one true high-water mark.

**The count is unchanged; it was five before too.** What changed is that four of the five were inert
placeholders `activatableBuffs` discarded, so the player effectively opened with **one**.
`RUN_STARTING_CHEATS` was deliberately left alone — whether a run should open holding a guaranteed
Cheat at all, and whether five is the right number, is a standing question and was not DLR-135's to
settle. See `.docs/game_rules/the-hunt.md`.

## What the simulator measured, and what was done about it — nothing

`npm run sim -- --runs 200 --seed 1`, before (`f56a51f`) against after:

| Figure                              | Before   | After    |
| ----------------------------------- | -------- | -------- |
| Win rate                            | **0.0%** | **0.0%** |
| Mean buff activations per hand      | **1.50** | **2.86** |
| Mean AP spent per hand              | 4.35     | 4.41     |
| Hands holding no activatable buff   | 0.0%     | 0.0%     |
| Mean fight reached                  | 0.46     | 0.52     |
| Mean coins earned                   | 0.84     | 1.07     |
| Mean damage to the Quarry per hand  | 2.29     | 2.44     |

Activations **nearly doubled**, which is exactly what the change was for. AP spent barely moved,
because the AP pool rather than the card supply is the binding constraint. **The win rate did not
move off 0.0%** — and DLR-135 was the last known confound behind it, so a 0% win rate now points at
the numbers rather than at the player being starved of cards. That is a finding for the developer's
balance pass. **Nothing was retuned in response and no tuning value is in the diff** — not
`STARTING_BUFF_COUNT`, not `RUN_STARTING_CHEATS`, not an AP cost, damage figure, weight or threshold.
Recorded in `.docs/game_rules/the-hunt.md`'s Known tensions.

## Not yet judged

The opening hand's *composition* can only be assessed by playing it. Four random bronze cards can be
four Threshold-cadence cards that never fire in fight one, or four Event cards that all pay. The
simulator reports the aggregate; whether the opening hand **reads as a hand with a plan in it** is
the developer's eyes, and nobody has looked. The weights it draws through are themselves
agent-authored and unplayed — see [the slot machine](the-slot-machine.md).
