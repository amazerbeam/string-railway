# DLR-153 — Activate buffs for the trick

Plan and tasks: [`plan.md`](plan.md) · [`tasks.md`](tasks.md)

## What changed

Activating a buff used to delete a card from the pile and change nothing else on screen. Nine of the sixteen live templates are gated on the suit of the card you end up playing, and the UI never said which of your cards that was.

Now:

- **Activation takes no card target.** There is no card-selection step and no refusal about choosing a card. (It is still *two taps* — poise, then commit. That is DLR-126's reversibility model, deliberately kept; see Assumption 10.)
- **The hand is the readout.** Every legal-to-play card a riding buff could fire on lights up with three independent carriers: a halo that gains energy, a single bright cell travelling the card's perimeter that gains speed, and a numeral badge that survives greyscale and reduced motion.
- **A "riding this trick" list** names each activated buff, gives its reach across your hand, states the zero-reach case out loud ("no card in your hand can fire it"), and carries a remove control.
- **A per-card breakdown** opens without any interaction once a buff is riding, switches target on hover or focus, and reads bottom-up: struck-through rows for buffs that cannot fire here, then the two branch groups, then the Overlap Bonus, then both branch totals with neither emphasised.

**Every figure on this surface comes from `projectBuffBranches`.** The view layer derives no firing rule of its own — that is the defect this ticket exists to prevent, and the Task 16.1 Step 2 grep is what keeps it that way.

## The rule change

`the-hunt.md` recorded *"activation commits on a second tap with **no way to un-activate**."* There now is one.

- **Revocable: Taker, Feeder, Sidestep** — the three condition families. Removal returns the card to the pile, refunds the action-point cost, and clears the buff from the trick. `isRevocableBuff` in `src/hunt/buffActivation.ts` is the single statement of which cards qualify, read by both the row's control and the reducer's guard so the two cannot disagree.
- **Not revocable: Cheat, Timebomb, Ward, Shield** — their spend also arms felt state (`cheatTricksRemaining`, `timebombArmedDamage`, `activateShield`, `activateWard`) that this transition cannot reverse. They still appear in the riding list, with a status line and no remove control, because a list that hid them would lie about what is riding.
- **A revoked card is appended to the end of the pile**, not reinserted at its old index (Assumption 3). It moves under your finger. Restoring the original index would need a second piece of state whose only job is to survive one transition.

## One engine amendment to DLR-152

`BuffBranchProjection` gained a required `mayFire: readonly Buff[]` — the per-branch indeterminate set that `branchFor` already computed and then discarded. Additive; `projection.indeterminate` is unchanged and remains the deduped union of both branches.

Without it, AC4's "the higher of its two branches" is uncomputable without re-deriving the rules in the view — and a lead with a Sidestep riding would badge 0, which is exactly the "this buff is dead" lie the reach figure exists to prevent.

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass, zero warnings |
| `npm test` | **2176 passing** (1832 node + 344 dom) |
| `npm run build` | pass, `dist/` written |
| `npx prettier --check` (this contract's files) | pass |

`npm run format:check` still fails on ~82 pre-existing `.md` files untouched by this contract. Not this ticket's defect. **Never run `npm run format`** — it rewrites every design document in the repo.

**Browser pass: run**, at 1440×900, 1280×720 and an emulated ~430px (the emulator clamps to 500). Measured live rather than inferred:

- **AC5** — greyscale screenshot taken. Badge numerals stay crisp and legible; a 1-buff card is distinguishable from a 3-buff card by the numeral alone. Stated plainly: the halo's energy channel contributes nothing in greyscale — it is reinforcement for colour-sighted players.
- **AC6** — reduced motion forced through the CSSOM: `animationName: none`, `strokeDasharray: none`, cell at full opacity; halo and badge unaffected.
- **AC7** — lap durations at counts 1–6: `2.7s, 2.2s, 1.7s, 1.2s, 0.9s, 0.9s`. Never below the 0.9s floor.
- **AC8** — resolved transforms (`DOMMatrix.m42`): rest `−3.766`, hover `−7.532`, armed `−16.74`. Monotonic, rest exactly half hover.
- **AC19** — badge ink on parchment: **13.85:1**, against a 4.5:1 floor.
- Console clean throughout.

## AC17 — the panel covers the trick, and that is accepted

**Developer decision, 2026-08-27: accepted.** *"If I can't see it I can't fix it, if it's an issue I'll fix it after."* Recorded in `the-hunt.md` as a `[provisional]` rule — the buff panel may cover the played cards while open — rather than as a defect. Nothing below is a bug report; it is the arithmetic that makes the trade cheap to revisit if it grates in play.

The breakdown panel overlaps the **live trick display** (`.wc-trick-row`) at every viewport, and wins the hit-test at 1440×900 and ~500px — so while the panel is open the trick is not merely covered but unclickable.

Root cause, measured: the panel's `max-width: min(30rem, calc(100% - var(--wc-rail-w)))` protects the decree and spent piles because both live inside `.wc-felt-rail` — but **`.wc-trick-row` is not in that rail**. It is a sibling under `.wc-table-inner`, so the rail subtraction does nothing for it.

Shrinking the panel to clear it works on desktop and is impossible at narrow widths:

| Viewport | Trick row right edge | Panel right | Max width that clears | Current |
|---|---|---|---|---|
| 1440×900 | 1024 | 1440 | ≤416px (~25rem) | 480px |
| 1280×720 | 911 | 1280 | ≤369px (~23rem) | 480px |
| ~500px | 383 | 500 | **117px** | `min-width` is 288px |

At the single-column shell the panel's own minimum width exceeds the clear space, so a panel growing upward **must** cover the trick. There is no mechanical placement that satisfies AC17 at that width.

**Option 1 was taken.** If it does grate in play, the other two are still on the table:

2. **Cap the width at ~23rem** — fixes both desktop sizes, narrow still overlaps. One token change.
3. **Move the panel somewhere else entirely** — a side sheet, or over the felt as a deliberate full-width overlay with a dismiss. The largest change, and the only one that actually resolves the underlying tension.

The underlying tension is real and worth naming: the shell is fixed-height and no-scroll, and this panel is large (up to 7 rows with 3 buffs riding — measured `scrollHeight` 489 against a 304px cap, so it already scrolls internally). Something has to yield. Related: `update-log.md` OPEN #10 asks whether the two-branch totals read as clarity or arithmetic homework — that density question and this placement question are the same question wearing two hats.

## Everything else you own

Every colour, size bound, slope, delay and glyph in this contract is a **documented placeholder**, transcribed rather than chosen:

- `--wc-buff-halo` — **red or brass.** Red was asked for, but `--wc-alarm` already means damage and `--wc-brass` already means yours-and-selected (`update-log.md` OPEN #9).
- `--wc-buff-lap-base: 3.2s` — the lap-time slope's intercept. **The 0.9s floor is not a placeholder**; it is a flash-safety limit and must not be lowered.
- The halo's four stroke widths and four opacities · the badge size · the panel's `max-height: min(34vh, 22rem)` and `margin-bottom: 0.4rem` · `CLOSE_DELAY_MS` (160ms).

Decisions and readings to sanity-check:

- **Whether activation should collapse to one tap.** AC1's "one tap" was read as "no target". Now that removal gives you a real undo, the argument for the poise weakens. Separable change, yours.
- **Whether a suitless buff lighting the entire hand reads well**, with the glow no longer discriminating and the badge carrying the state alone. Functionally correct; a feel question.
- **Whether a revoked card appended to the pile's end** is acceptable rather than restored to its position.
- **Whether limiting removal to the three condition families is the right reading** — the alternative is that irreversible cards do not appear in the list at all, which is shorter and less honest.

## For future contributors

**The view layer never re-derives which buffs fire.** `buffRideModel.ts` and `buffBreakdownModel.ts` delegate every firing question to `projectBuffBranches`, which calls the same `firedBuffs` / `resolveFiredBuffs` that real trick resolution calls. There is no `switch` over `BuffConditionKind` anywhere under `src/app/`, and the Task 16.1 Step 2 grep is what keeps it that way. The DLR-147 mockup re-derived those predicates and reported +6 damage for a load whose real ceiling was +4 — that is the failure this architecture exists to prevent.

Two related disciplines worth preserving: every sentence this surface prints comes from `buffRideLabels.ts`, and the travelling cell's lap time is computed in CSS (`max()` against `--wc-buff-lap-floor`) so no count can defeat the safety floor from TypeScript.
