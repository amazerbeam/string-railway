# Run-winnability simulation — 2026-08-22

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
