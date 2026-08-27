# DLR-150 — Feeder carry: a Feeder that fires on a Loss banks into the next hand

Contract: [`plan.md`](./plan.md) · Approved layout reference: [`mockup.html`](./mockup.html) · Checklist: [`tasks.md`](./tasks.md)

## What changed

A Feeder paid the player for not taking a trick, and its reward was consumed by the very cash-out
that the loss triggered — a pot near zero precisely because the player just lost. Three deliberate
losses in a bad hand paid three separate points into three tiny cash-outs and accumulated into
nothing.

This splits the Feeder's reward by the trick's **outcome**:

| The Feeder fires on… | Which is a… | What happens now |
|---|---|---|
| a dodge (a skull trick the player did not take) | **Win** | pays into this hand exactly as before, stacking with every other fired buff and counting toward the Overlap Bonus |
| a clean loss, or an eaten skull | **Loss** | the reward goes to a **carry pool** that pays nothing this hand |

The carry pool survives the hand boundary, seeds the next hand's accrual as an ordinary spendable
bonus, and is wiped when the fight ends — won or lost. It compounds hand to hand within a fight
only.

Because the carry lets a multiplier bonus escape the reset that used to destroy it, **the Momentum
reward axis is restored to the Feeder family**: Bell/Key/Moon Feeder now exist on both Blade and
Momentum, taking the mintable pool from 13 templates to 16. No slot weight changed — the three new
templates become drawable the moment the row exists.

Both halves of the carry are on the felt, because the whole effect is a promise made in one hand and
redeemed in the next, and an invisible promise is not one:

- **"Banking for next hand"** — accumulates during the hand that earns it, and deliberately does
  *not* alter that hand's cash-out figure.
- **"Carried in from last hand"** — the figure the next hand opens on, visible for the whole hand
  rather than only at trick 0, so a player who looks up mid-hand still sees where their opening
  bonus came from.

## How it is built

**The skull inversion is stated exactly once.** `src/warCouncil/bank.ts`'s `TAKEN` table and
`isTaken` already *are* the inversion. Rather than add a second statement of the game's most misread
rule in another module, `resolveTrickBuffs` and `resolveFiredBuffs` receive the answer as a
parameter — `trickIsLoss`, supplied by `resolveTrickBank` as `!isTaken(outcome)`. `src/hunt/` learns
nothing new about skulls.

**A convention worth keeping.** *The skull inversion is stated exactly once, in `bank.ts`'s `TAKEN`
table; anything downstream that needs the outcome axis receives it as a parameter rather than
re-deriving it.*

**The carry rides the accrual channel that already exists.** `BuffBonusAccrual` gained `carryOut`
(what a Loss-firing Feeder banked) and `carriedIn` (display-only record of what seeded the hand).
`startHandAccrual(carriedIn)` writes the carry straight into `multiplierBonus` / `flatDamageBonus`
with the paid counters at zero — so every existing cash-out route (Apply Damage, being caught, hand
end) spends it with **no new arithmetic anywhere**.

**The run holds it between hands**, exactly as it holds the discard budget. The felt is remounted per
hand, so `RunState.feederCarry` is where a per-fight figure can live, wiped by a named
`feederCarryAfter(encounter, carry)` — `guardAfter`'s shape and its reason. `src/sim/` walks the
identical seam, so the simulator measures the game the felt plays.

### Three files split to stay under the 400-line budget

All behaviour-preserving, all forced by this change, all fixed in-ticket:

- `roundResult.ts` — `roundResultFor(ui)`. Collapsed **three** construction sites of
  `WarCouncilRoundResult` (two in `WarCouncilRound.tsx`, one hand-built in `sim/playHand.ts`) into
  one, so a field added to the result can no longer reach the felt and miss the simulator.
- `screenFor.ts` — `screenFor(phase, encounterOver)`, extracted from `App.tsx`'s ternary chain.
  `RunPhase` moved here too: the plan assumed it was importable from `../hunt`, and it never was.
- `roundUiSeed.ts` and `warCouncilBankMeter.css` — `roundUiState.ts` and `warCouncilHunt.css` each hit
  *exactly* 400 lines, so each had a cohesive block moved out and re-exported/re-imported so no
  consumer changed.

## One defect found in review, and what it says about the tests

Round-1 review found a **Critical** bug that typechecked and linted cleanly and passed all 2038
tests: `WarCouncilRound.tsx` never destructured the `feederCarry` prop, so `createRoundUiState`
always saw `undefined` and every hand opened on an empty carry. The carry was computed, reported and
stored correctly — then silently discarded on the next hand's mount. AC3 and AC6 were dead in the
running game.

Nothing caught it because every test sat either **below** the mount seam (pure accrual tests) or
**above** it (`BankMeter` with hand-built props), and the simulator's `seedFor` *did* wire it — so
every simulator-backed suite passed and masked the component's omission.

The fix adds the wiring plus `WarCouncilRound.feederCarry.test.tsx`, a mount-level regression test
verified to **fail against the un-wired code** and pass once wired. Worth remembering: a value that
crosses a seam needs a test that crosses it too.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0, 0 errors |
| `npm run lint` | exit 0, 0 errors, 0 warnings |
| `npm test` | **159 files / 2041 tests passed** (node 129/1739, dom 30/302) |
| `npm run build` | exit 0, `dist/` written, no bundler errors |
| `npx prettier --check` (contract files) | "All matched files use Prettier code style!" |
| Pure-core boundary greps (`src/hunt`, `src/warCouncil`, `src/sim`) | zero real hits |
| Skull-inversion single-statement grep | zero hits |

**File sizes**, measured with `(Get-Content <path>).Count` — all under 400:
`App.tsx` 376 · `WarCouncilRound.tsx` 346 · `roundUiState.ts` 346 · `runTransitions.ts` **397** ·
`bank.ts` 379 · `buffTemplates.ts` 284 · `run.ts` 278 · `buffAccrual.ts` 218 · `warCouncilHunt.css`
268 · `warCouncilBankMeter.css` 149 · `buffRoundState.ts` 142 · `BankMeter.tsx` 136 ·
`roundUiSeed.ts` 75 · `screenFor.ts` 36 · `roundResult.ts` 19.

> `runTransitions.ts` at **397** has three lines of headroom. The next ticket touching it will need a
> split.

`npm run format:check` repo-wide fails on 83 pre-existing `.docs/**` / `.github/**` files no contract
has touched — not gated, not this ticket's to fix.

## Nothing here was balanced — these are yours to judge by playing

The ticket said to build the readout before tuning any number, and nothing in this contract chose a
tuning value.

- **The carry's size.** A bronze Blade Feeder carries +1, a bronze Momentum Feeder +2, from the
  existing ladders. The ticket's own live risk is that this is **too small to be felt**.
- **The Momentum Feeder's tier ladder.** Ships on the existing shared `REWARD_TIER_VALUE[Multiplier]`
  (2/3/5), which invents no number. But it is a substantially bigger card than the damage version —
  18 vs 12 vs an unbuffed 9, worked in `ideas.md`. A Feeder-specific ladder would be a new tuning
  value and is yours.
- **Feeder-only, or any buff firing on a Loss?** Built Feeder-only per AC1. Consequence: a **Taker**
  that wins a skulled trick has fired on a Loss and still pays into the hand it lost. The wider
  reading is one line's difference and is arguably more coherent.
- **The Overlap Bonus on a Loss trick** still lands in this hand and is still wiped by the reset — so
  two Feeders firing on the same clean loss produce an Overlap Bonus suffering exactly the defect
  this ticket exists to fix. AC2 named the Overlap Bonus only for the dodge case, so it was left
  alone.
- **The pool moving 13 → 16 shifts every slot-draw probability.** No weight changed, but three more
  Momentum Feeders change what a pull is likely to give. Worth an eye on how the shop feels.
- **Whether the carried-in line should be persistent (as built) or a one-off flourish** at hand
  start. Pacing judgement.
- **Every colour, glyph, border weight and word** in the two new lines is placeholder, per
  `mockup.html`'s own footer.

### Seen by no one yet

No browser pass was run (off by default). What eyes-on should confirm: the two new lines resolve
their `--wc-*` custom properties rather than falling back; the relocated `warCouncilBankMeter.css`
actually applies (a moved stylesheet whose import misses renders unstyled while passing every test);
no layout crop at the target viewport; a clean console with a Momentum Feeder minting and firing for
the first time since DLR-145.

## Deliberately out of scope

The High/Low vocabulary rename (banked in `ideas.md`, still not built) · any change to Sidestep · any
cap or decay on the carry · the eight cut condition families and the two cut reward axes · any change
to `MAX_MULTIPLIER_BONUS_PER_HAND` / `MAX_FLAT_DAMAGE_BONUS_PER_HAND` (both still
`Number.POSITIVE_INFINITY`, pinned by a regression test) · new sim instrumentation for carry
frequency and average size at spend — a `play-tester` question now that this ships.
