# DLR-145 — Consumable buff cards, no action points, a pared five-card pool

**Plan:** [`plan.md`](./plan.md)
**Mockup (interactive reference, approved 2026-08-25):** [`mockup.html`](./mockup.html)

## Summary

Turns each buff card into something the player *spends* instead of rents:

- Taker, Feeder and Sidestep now leave the pile the instant they're activated (`CONDITION_CARD_SINGLE_USE`, mirroring the existing `ACTIVATED_CARD_SINGLE_USE` toggle DLR-142 shipped for Cheat/Timebomb).
- Action points are gone. `AP_ENABLED = false`, every AP-cost/AP-pool readout is removed from the action bar, the loadout panel and the shop purse, and the action-point purchase is off the shop shelf.
- The mintable pool drops from 73 templates to exactly 13: `taker` × 3 suits × {Blade, Momentum}, `feeder` × 3 suits × {Blade}, `sidestep` × {Blade, Momentum}, plus `cheat` and `timebomb`. Eight condition families (`markOfRank`, `glutton`, `hoarder`, `unbloodied`, `debtCollector`, `miser`, `cornered`, `keepsake`) and two reward axes (`coins`, `apRefund`) become unconstructible — not deleted, just unreachable, same discipline DLR-116 already used for Cheat/Timebomb/Blast Guard/Whetstone.
- A fresh run opens with 20 activatable bronze cards (`STARTING_BUFF_COUNT = 20`, drawn **with replacement** since 13 distinct templates can't fill 20 slots without it) and pays 10 coins a fight win (`COINS_PER_ENCOUNTER_WIN = 10`).
- Two per-hand reward caps (multiplier bonus, flat-damage bonus) are raised to `Number.POSITIVE_INFINITY` so a consumed card's payout can never be silently clipped to nothing (AC9).

## The `spentThisTrick` addition, and why it's not optional

This is **not named in the ticket**, but shipping AC1 without it silently breaks the game: `buffHandInputFor` (`src/app/warCouncil/buffRoundState.ts`) builds a trick's active buff set by filtering the pile (`offeredBuffs`). Once a Taker/Feeder/Sidestep is consumable, `activateFromPile` removes it from the pile at the moment it's spent — so by the time the trick resolves, filtering the pile alone finds nothing, and a spent card pays out zero with no throw, no refusal, and no log to explain why. That's the exact silent failure mode that would have made AC10's "beat Aoife with bronze cards" claim false in practice even though every unit test around consumption passed.

The fix is a new `BuffActivationState.spentThisTrick` field: cards removed from the pile during the current trick are kept here just long enough to still count as active for that trick's resolution, then cleared on the same edge `activatedThisTrick` already clears on (`openBuffWindow`, `refreshBuffsForNewHand`). `buffHandInputFor` unions `offeredBuffs(state)` with `state.buffActivation.spentThisTrick` when building the active set.

**The simulator's `src/sim/playHand.ts` had the identical latent bug** — its own `pendingActive` snapshot was built from `offeredBuffs(ui)` alone — and was fixed the same way, in Phase 4, by unioning in `ui.buffActivation.spentThisTrick`. Anyone extending either the felt or the simulator to activate a consumable buff needs to know this pattern exists; it's the one shape a "just filter the pile" instinct gets wrong here.

## Developer decisions and playtest observations needed

Copied from `tasks.md`'s File map → "Developer decides or observes", plus two items Phase 2 flagged directly:

- **The buff loadout panel now renders 21 rows** where it was laid out against 5. Open it between tricks and judge whether it scrolls acceptably, whether rows need grouping by family, and whether the two-tap spend still reads at that density (check 1280×800 and 1440×900). Most likely thing to look wrong on first play.
- **The shop poses no choice** at 10 coins against a 1-coin heal and a 1-coin pull — deliberate per design §3.6, to be tuned after playing. Confirm it feels like a restock rather than a decision, and say what the prices should become.
- **Whether a fresh run should still open with the guaranteed Cheat.** `RUN_STARTING_CHEATS` stays 1, so the pile is 21 cards, not 20. One line to change if 20 should mean 20.
- **Whether the two slot machines still feel different.** Strongbox's coin/refund lean is gone with those axes; both machines' axis tables are now flat and differ only by family weight. Any replacement lean is a tuning value and is the developer's.
- **AC10's felt result vs. its measured result — see below. This is now the most important open question on the ticket.**
- **The shop purse.** The real `ShopPanel.tsx` (unlike the mockup) already renders Health as its own meter row outside `.shop-purse` — a prior ticket's deliberate design choice. After this ticket, `.shop-purse` carries exactly ONE cell (Coins), not two. Whether a one-cell purse group still reads as deliberate rather than as a gap where the AP cell used to be needs eyes on it.
- **Apply Damage's visible figure.** It lost its `for N AP` clause the same as its accessible name did — the step text that drove this change named only the accessible name, but the visible figure carried the identical clause and was fixed alongside it. Worth a glance to confirm it reads cleanly as `cash N`.

## Measured verification results

**Tasks 15/16 (boundary + copy greps) — pure-core boundary holds; no AP readout regression, no cut-family template survives.** Full detail in `tasks.md` Task 15/16, but in short: every unexpected grep hit beyond what the task predicted was traced and is one of (a) a doc comment explaining the `AP_ENABLED` design, (b) an internal identifier for the AP mechanism kept deliberately live but gated to free (never displayed), or (c) a total-`Record`/exhaustive-`switch` entry for an unreachable enum member — the same sanctioned pattern the tasks explicitly called out for one instance, just present in more places than that instance alone. No real regression found.

**Task 17 (typecheck, lint, full suite, formatting, production build) — NOT run by the Implementer. Delegated to QA**, per this phase's own instruction. Do not treat anything in this document as evidence those gates passed; they haven't been run yet at PR time.

**Task 18 — AC10 and AC11, measured against the real engine via `src/sim/`:**

- `npm run sim -- --runs 200 --seed 1` — completed, exit 0, no fault, no stall, no `RangeError`. AC11's simulator half holds.
- **AC10, measured via a disposable query script driving `simulate()` directly (200 runs, seed 1, cross-checked at seed 7), against `baseline` (activates every legal buff every window) and `noBuffs` (activates none):**
  - Fight 0 (Aoife) won at all: 177/200 (88.5%), baseline policy.
  - **(a) Beat Aoife on trick 1 or 2 of hand 1 while activating a bronze card: 0/200 (0.0%), both seeds.** The earliest observed win, across every sampled run, was trick 3 — most winning hand-1s ran 4–6 tricks even under a policy that activates every buff it legally can.
  - **(b) Beat Aoife with zero buffs activated across the whole fight: 51.0% (seed 1) / 52.5% (seed 7), `noBuffs` policy.**

**AC10 does not hold as stated.** Design §4's arithmetic predicts (a) — Aoife dead on trick one or two — is reachable via one bronze Bell-Taker on Momentum over two won Bell tricks (`2 × (2 + 4) = 12` against 10 HP). Measured against the shipped engine, it never happens, at either seed, under a policy that already maximizes activation. (b)'s "remains winnable with nothing activated" claim is well supported — slightly over half of runs — so that half of AC10 stands. The (a) half needs the developer's read: either the shipped mechanics don't actually let a Bell-Taker/Momentum line pay off the way the arithmetic assumed (worth checking against `buffAccrual.ts`'s overlap-bonus and cash-out timing), or AC10's trick-count target needs revisiting now that it's measured rather than assumed.

## Convention introduced: per-family single-use toggle

A card's single-use-ness is now a per-family developer toggle, read by exactly one function:

- `ACTIVATED_CARD_SINGLE_USE` (Cheat/Timebomb, DLR-142) and `CONDITION_CARD_SINGLE_USE` (Taker/Feeder/Sidestep, this ticket) are both `Readonly<Record<Kind, boolean>>` in `src/hunt/consumables.ts`.
- `isConsumableItem` is the **only** reader of either map.
- Reverting one card to "stays in the pile" is a one-line edit — flip its entry to `false`. Nothing else in `consumables.ts`, and no other file, needs to change.

## Warning: clear local storage before playing

Vault grants and slot-odds boosts bought against a now-cut template (any of the eight condition families or the `coins`/`apRefund` axes) become unresolvable. `templateById` returns `undefined` for them, `mintGrants` silently skips the grant, and whatever currency was spent to buy it is simply gone. Nothing corrupts and no save is rejected — the loss is silent, not a crash — but a play session against stale local storage will quietly under-deliver on any pre-DLR-145 purchase. Clear it before the first session against this build.
