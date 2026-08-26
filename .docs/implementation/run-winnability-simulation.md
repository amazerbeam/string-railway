# Run-winnability simulation — 2026-08-22

> **Superseded as a reading of the current game, 2026-08-25.** Every figure below was measured
> against a game with action points on, an eleven-family 73-template buff pool, four opening cards,
> one coin a fight and two live per-hand damage caps. DLR-145 changed all five. The doc is kept for
> its method and its diagnosis — the trick-deficit finding and the way the engine was called
> directly — not for its numbers. The current measurements live in
> [hunt/the-opening-pile.md](hunt/the-opening-pile.md) and `.docs/game_rules/the-hunt.md`'s Known
> tensions.

A standalone investigation, not tied to a ticket: **is a full 25-fight run currently winnable, and
if not, why not?** `the-hunt.md`'s own Status register already says "not winnable as configured,
provisional, accepted," but the most recent full-run data on record (DLR-92, 2026-08-19) predates
the flask (DLR-93), Apply Damage (DLR-94), the quick-kill payout (DLR-95), and the discard (DLR-100)
— so the question was reopened by asking it fresh rather than trusting a three-ticket-stale note.

## What was played

Every run was a full 25-encounter run (5 stages × 4 ordinary opponents + 1 stage boss), simulated
by calling the real, unmocked pure engine directly — no browser, no `chrome-devtools`, no rewriting
of any rule. This is possible because `src/hunt/**` and `src/warCouncil/**` carry an ESLint-enforced
boundary (no React import, no DOM access), so the entire rules engine is plain functions callable
from a script. Two simulation passes were run, in a temporary Vitest file
(`src/hunt/__tests__/_scratch-run-simulation*.test.ts`) deleted before each pass concluded — nothing
was left in `src/`; `git status --porcelain` was confirmed clean both times.

**Functions called directly, no approximation of any rule:**
`startRun` / `recordEncounter` / `advanceRun` / `buyFromShop` / `drinkFlask`
(`src/hunt/runTransitions.ts`, `src/hunt/run.ts`), `dealRound` / `playCard` / `chooseCpuMove` /
`cashBankNow` (`src/warCouncil/deal.ts`, `playCard.ts`, `cpuPlayer.ts`, `voluntaryCashOut.ts`),
`primeCard` (`src/warCouncil/timebomb.ts`), `applyDiscard` (`src/warCouncil/discard.ts`),
`addCheat` / `removeCheat` / `hasCheat` (`src/hunt/cheats.ts`), `legalMoves` called with
`{ ignoreFollowSuit: true }` when a Cheat was armed (`src/warCouncil/legalMoves.ts`).

## Pass 1 — baseline play (120 runs)

**How it was played:** the simulated player reused the engine's own `chooseCpuMove` heuristic
(dodge a losing skulled card, else try to win, else play lowest) for its own trick-by-trick
decisions — the same logic the game already uses to drive its opponent. Between fights it drank
the flask whenever charged and healed (bought a Heal at ≤70% health), then spent any coin surplus
on Whetstones. Two cash-out policies were compared: **hoard** (never voluntarily Apply Damage) and
**eager** (cash out once bank value ≥2, plus a low-health safety valve). No Cheats, no discards, no
Timebomb, no Blast Guard were used in this pass.

**Result: 0/120 wins**, both policies. Death histogram (hoard, n=60): fight 0 — 30 runs, fight 1 —
15, fight 2 — 14, fight 3 — 1. Player health eroded ~2.65 HP/hand against ~3.06–3.10 HP/hand dealt
to the Quarry — a real but thin ~15% edge, nowhere near enough buffer against variance on a static
10-HP cap. Average coin at death: 0.72–1.10 — never close to a Whetstone's 4-coin price.

## Pass 2 — full toolkit (900 runs, 6 configurations)

Pass 1 used only two of the run's available tools (Heal, Whetstone). This pass rebuilt the harness
to actually use Cheats, the discard budget, Timebomb, and Blast Guard, wired through their real
exported functions, and re-ran 150 full runs per configuration:

| Config | What was added | Win rate | Avg fights survived | Best single run | p90 |
|---|---|---|---|---|---|
| A | Baseline (Heal + Whetstone only, same as Pass 1) | 0/150 | 1.21 | 8 | 3 |
| B | + Cheats (spent only when ordinary follow-suit has no winner and an off-suit trump would win) | 0/150 | 1.13 | 5 | 3 |
| C1 | + Discard, dumping **high**-ranked cards | 0/150 | 0.96 | 8 | 2 |
| C2 | + Discard, dumping **low**-ranked cards (a re-roll gamble) | 0/150 | 1.35 | 6 | 3 |
| D | + Timebomb + Blast Guard (marked only when the follow was a predicted loss) | 0/150 | 1.14 | 5 | 3 |
| E | Full toolkit together (Cheats + Timebomb + Guard + discard-low) | 0/150 | 1.25 | 5 | 3 |

**No configuration produced a single win across 900 runs.** The best single run of the entire
investigation reached fight 8 of 25 (still stage 2, before the second stage boss).

**Why the extra tools barely moved the needle:** a fresh run starts with `RUN_STARTING_CHEATS = 0`
and `0` Timebomb charges — both are bought, not granted, and `COINS_PER_ENCOUNTER_WIN = 1` against
`CHEAT_PRICE = 1` / `TIMEBOMB_PRICE = 2` means even a single win barely buys one charge. Since 34% of
runs die on encounter 0 alone and 69% are dead by encounter 1, most runs are over before there is
ever a shop visit to spend on these tools at all. The discard budget is the one tool free from turn
one (`DISCARDS_PER_FIGHT = 3`, no purchase needed) and was the only lever that measurably helped —
dumping low cards (config C2) gave the best average survival of any configuration tested, a ~12%
improvement over baseline. Dumping high cards (C1) was actively worse than baseline, because only
the Quarry's hand carries skulls (`assignSkulls` in `src/warCouncil/deal.ts`) — a player's high card
is pure offense with no downside, so discarding it throws away a winning tool rather than dodging a
trap.

## Causal read

This is the curve behaving as its own source comments say it should — `src/hunt/config.ts` states
outright that the run is "NOT expected to be winnable on these values" and that DLR-82 already ruled
the answer is the shop economy, not a bigger player-health bar. The simulation adds one thing beyond
what was already on record: **the health curve's problem starts on fight one, not partway through
the run.** Roughly half of all baseline runs die on the very first, exactly-matched 10-vs-10 fight
against Aoife, before any curve divergence has even had a chance to set in — this is a sharper and
more immediate finding than "the run gets harder than the economy can keep up with later on."

## A plausible reconciliation with a developer's own play experience

`src/hunt/config.ts`'s own comments record that `PLAYER_START_HEALTH` was **25** until **2026-08-14**
and is **10** since. A run played (or remembered) from before that change would have carried roughly
2.5× the health cushion these simulations ran against, which would fully explain reaching much
further than fight 4 without implicating anything found here.

## What this doc does not claim

- This is not a claim that no play sequence can ever win — 900 simulated runs is a large sample but
  not an exhaustive search, and a genuinely optimal (rather than "sensible, tool-using") strategy was
  not attempted.
- The simulated trick-play itself still leans on the engine's own `chooseCpuMove` heuristic rather
  than a bespoke stronger AI — a materially smarter card-by-card strategy was out of scope for this
  investigation and could move these numbers.
- Nothing here changes any `src/` file, `the-hunt.md`, or any other module doc. The reachability gap
  in the quick-kill payout's own worked example, found separately during DLR-98's verification pass,
  is recorded in `the-hunt.md`'s own Known tensions section, not repeated here.

## Addendum, 2026-08-22 — the harness's own skull-dodge check was a no-op for the player

Pass 1 and Pass 2 above both describe the simulated player as reusing the engine's own
`chooseCpuCard`/`chooseCpuMove` heuristic, including its skull-dodge behaviour. That heuristic's dodge
check filters candidate cards for a skull mark before deciding whether to duck a losing trick — but
`assignSkulls` (`src/warCouncil/deal.ts`) only ever marks cards in the **Quarry's** dealt hand, never
the player's. Reused for the player's own side, that filter is always empty, so every result recorded
above was produced by a player that never actually used the one piece of information — a skull
becoming visible once played — the whole design is built around. It always collapsed to "always try to
win the trick, else play lowest."

**Fight 1 in isolation, 300 trials each, real player.play() calling the same engine functions:**

| | naive (the bug above, as actually run above) | genuinely skull-aware (ducks a visibly-skulled lead) |
|---|---|---|
| win rate | 175/300 (58%) | 220/300 (73%) |
| losses | 125 | 80 |
| fatal outcome: clean loss / skull-win | 84 / 41 | 65 / 15 |
| forced — no legal alternative existed | 9/125 | 80/80 |

Skull-awareness alone cuts fight-one losses by 36%, mostly by not walking into a visible `SkullWin`.
Under skull-aware play, **every** remaining loss was a genuinely forced follow-suit trap with no legal
alternative in hand — real variance, not a missed decision.

**Full 25-fight runs, skull-aware player, `RUN_STARTING_CHEATS` at both its old (0) and current (1)
value, 150 trials each:**

| | 0 starting Cheats | 1 starting Cheat |
|---|---|---|
| wins | 0/150 | 0/150 |
| avg fights survived | 0.75 → ~2 once skull-aware (see below) | 0.80 |
| died fight 0 | 66 (44%) | 64 (43%) |

The starting-Cheat comparison above was run with the **naive (bug-present)** strategy on both sides,
isolating that one variable — it shows a starting Cheat does not measurably move the death rate either
way (44% vs 43% at fight 0), consistent with a Cheat only ever refusing one forced trick rather than
touching the thing actually killing runs.

A **separate** 150-run pass with the skull-dodge bug fixed (fight-0-only harness's finding applied to
the full run) still produced **0/150 full clears**, but average fights survived rose to roughly **2**
(from ~1), the best single run reached **fight 6** (up from 5), and deaths that used to cluster almost
entirely at fight 0 now land mostly around **fight 3–4** instead.

**What this does and doesn't establish.** It confirms fight one is skill-navigable and that the
original "0/900 wins" headline was measuring a broken test harness on its opening fight, not a rigged
one. It does **not** establish that the run is winnable, or close to it, once a player is actually
surviving long enough to reach the later stages — see the exchange-ratio argument in
`../design/Balatro-Forbidden-Solitaire/version-5-developer-idea.md` for why the deeper-run gap is a separate, larger question this fix does not
answer. As before: not an exhaustive search, and the strategies used here are "reasonable and
tool-using," not provably optimal.

---

## Superseded as a method by DLR-130 — 2026-08-24

Both passes above were run from a **temporary Vitest file deleted before each pass concluded**, so
nothing about them was repeatable: the harness that produced these numbers no longer exists, and
re-running the question meant rebuilding the driver from scratch.

DLR-130 made that driver permanent. `src/sim/` (see [sim/](sim/README.md)) plays complete seeded
runs over the same unmocked engine, plus the felt reducer this investigation's scratch harness
skipped — so it now measures buff activation and the Apply Damage payout, which did not exist when
the passes above were run. `npm run sim -- --runs 200 --seed 7` is the repeatable form of the
question this file asked once.

**The findings above stand and were not revisited.** They are pre-V5-buff-work data and remain the
record of what was measured on 2026-08-22. The first observation from the permanent tool — 0/20
wins at `--seed 7`, mean fight reached 0.60 — is consistent with them, and is likewise an
observation: DLR-130 shipped the instrument, and the developer's balance pass is a separate
exercise that had not run when this note was written.

---

## Re-asked with the permanent tool, and re-framed — DLR-120, 2026-08-24

The question this file opened is now repeatable, and it was re-asked at scale: **1,600 runs**, 200
each at seeds 1 / 7 / 42 / 99999, against **two** policies. `Faults: none` and `stalled runs: 0` in
every batch. **Zero wins in all sixteen hundred.** The per-hand exchange is 2.07–2.21 dealt against
2.58–2.73 taken — stable across every seed and both players, so a deficit rather than variance, and
consistent with this file's own pre-V5 passes (0/120, 0/150).

**The re-framing matters more than the repetition.** DLR-120 added one figure to the report, and it
changes what the deficit above is a measurement *of*: **between 67% and 71% of all hands were played
holding no activatable buff at all.** A run opened, at the time, with four `Unassigned` placeholders
that `activatableBuffs` filtered out of every offer (no longer true — see the DLR-135 section at the
foot of this file); the only route to a real card is the free pull at the
shop; and the shop is reached only by **winning a fight**, which 55–60% of runs never do. So the
2.17-against-2.64 exchange is not a reading of the tuned game falling ~20% short — it is a reading of
the **pre-buff game**, which is the same game the two passes above measured before any of the V5 work
existed. That the number has not moved is therefore not evidence that the buff work failed; it is
evidence that the buff work is largely absent from the sample.

A second policy, `maximalist`, was added to test the obvious alternative explanation — that the
simulated player is simply not using what it has. It is `baselinePolicy` with identical card and buff
play (asserted by reference) plus the two levers a run actually grants: the Swap budget and the one
starting Cheat. Both fire on every run — about 4 discards, exactly 1.00 Cheats — and the exchange
moves by roughly **0.02 damage a hand**. That is a useful negative result: the levers the player
already holds are not the missing ingredient.

**Nothing was retuned, by anyone.** The reading recorded here is that the 0-win result is an
**integration** problem before it is a balance one, and that the balance question cannot be answered
honestly until the acquisition surfaces sit somewhere a living player can reach them. The caveats are
stated plainly: a ~20% deficit is wide enough that a balance component probably survives full
reachability, and both policies take their cards from `chooseCpuMove`, so neither is a good player.

**The single measurement still missing** is the cheapest one: `playRun` calls
`startRun(PLAYER_START_HEALTH, [], seed)`, and that empty second argument is DLR-113's
`TemplateGrant[]`. Passing grants measures the game with the buff system live from the first trick.
DLR-120 deliberately did not add the flag — it is one step from running the balance pass, which is
the developer's.

## The starvation confound was removed, and the win rate did not move — DLR-135, 2026-08-25

The 67–71% figure above described a game in which a run opened with four `BuffKind.Unassigned`
placeholders that `activatableBuffs` filtered out of every offer. **DLR-132 took that figure to 0.0%
by re-homing the guaranteed Cheat into the pile; DLR-135 made the other four cards real.** A run now
opens holding five cards — four distinct real bronze draws from `BUFF_TEMPLATES` plus the guaranteed
bronze Cheat — and every one of them is activatable. See
[The opening pile](hunt/the-opening-pile.md).

`npm run sim -- --runs 200 --seed 1`, taken immediately before (`f56a51f`) and after on the same
machine:

| Figure                             | Before   | After    |
| ---------------------------------- | -------- | -------- |
| Win rate                           | **0.0%** | **0.0%** |
| Mean buff activations per hand     | **1.50** | **2.86** |
| Mean AP spent per hand             | 4.35     | 4.41     |
| Hands holding no activatable buff  | 0.0%     | 0.0%     |
| Mean fight reached                 | 0.46     | 0.52     |
| Mean coins earned                  | 0.84     | 1.07     |
| Mean damage to the Quarry per hand | 2.29     | 2.44     |
| Max damage to the player in a hand | 9        | 6        |

Activations **nearly doubled**. AP spent barely moved, which says the **AP pool rather than the card
supply is now the binding constraint**. Everything else drifted marginally in the player's favour.

**What this changes is what the 0% is evidence of.** The section above argued the 0-win result was an
*integration* problem before a balance one, and that the balance question could not be answered until
a living player could reach the acquisition surfaces. **DLR-135 was the last known confound.** The
player is demonstrably no longer starved of cards, and the win rate still has not moved — so a 0% win
rate now points at **the numbers** rather than at the supply. That is a finding for the developer's
balance pass, and **nothing was retuned in response to it**: no AP cost, damage figure, slot weight,
threshold, `STARTING_BUFF_COUNT` or `RUN_STARTING_CHEATS` is in DLR-135's diff. Also recorded under
`.docs/game_rules/the-hunt.md`'s Known tensions.

The single measurement still missing is unchanged: `playRun` still passes an empty `TemplateGrant[]`,
so the Vault's contribution is still unmeasured.
