# DLR-119 — Full visual and UX pass across the redesigned surfaces

Plan: `plan.md` in this folder. Execution checklist: `tasks.md` (Status: COMPLETE).

**`mockup.html` in this folder went UNSEEN.** It was generated because the pipeline calls for one on a UI ticket, the approval gate was skipped per the 2026-08-23 run's standing override, and **nobody has looked at it.** `plan.md` was likewise auto-approved with no `AskUserQuestion` presented.

**No browser was opened and no server was started.** The browser pass is opt-in, off by default, and was not requested for this ticket. Every layout claim below is **arithmetic against the real stylesheets**, and it is stated as such. It is not a substitute for looking, and section 7 is the list that assumes you will.

---

## What changed

**Phase 1 — layout reachability (CSS only, no TypeScript).** `.wc-bar` gains `flex-wrap: wrap`. `--wc-dossier-narrow-max: 30dvh` is declared in `warCouncil.css`'s `:root` and read once in `warCouncilHunt.css` to bound `.wc-dossier` at the narrow/short breakpoint, with its own scoped `overflow-y: auto`. Both `.wc-shell` rules state their felt row as `minmax(0, 1fr)` rather than bare `1fr`. `.wc-fan`'s top reserve becomes `calc(var(--wc-card-w) * 0.4)` instead of a fixed `1.3rem`.

**Phase 2 — the queued payout, reported.** `PayoutOutcome` and `TrickPayoutEvent` are declared in `src/hunt/applyDamagePayout.ts`, beside the payout whose two terminal fates they name. `applyResolution` captures `pendingApplyPayout` before `applyDamage` and compares it after — the one point where "destroyed" and "not yet due" are distinguishable, since after the fold both read `null`. `settleApplyPayout` reports `Paid` when a payout comes due. The event rides on `FoldedResolution.payout` and then `ResolvedTrick.payout`, threaded at both of `commit`'s fold sites. `payoutLabels.ts` turns it into a sentence, and `queuedPayoutText` now names the risk while the payout is still in the air.

**Phase 3 — the buff-fired narration.** `buffFiredLabels.ts` composes `buffName`, `buffRewardPhrase` and `overlapBonusFor` into one clause. `TrickWell` renders it, and the payout sentence, in its existing resolved branch inside `.wc-table`'s existing `aria-live="polite"` — **no new grid row**, no new state, no timer, no effect.

**Phase 4 — the worst spoken string.** `healthBarValueText` leads with `Lethal.` instead of burying it fifth.

---

## The layout arithmetic, in full

Stated so it can be checked, and stated as arithmetic rather than observation.

**L1 — the action bar was cropping its own last control.** `.wc-bar` was `flex-direction: row` with `flex-wrap` unset. Each of its four items contains a `.wc-bar-btn` with `min-width: clamp(5.5rem, 14vmin, 8.5rem)`, which floors at **88px** below a 629px vmin, and a flex item's default `min-width: auto` stops it shrinking past its content's minimum. Four buttons at 88px, three `clamp(0.5rem, 2vmin, 1.25rem)` gaps at 8px, and two sides of `clamp(0.6rem, 2vmin, 1.5rem)` padding at 9.6px:

```
4 × 88 + 3 × 8 + 2 × 9.6 = 395.2px
```

against a **390px** viewport. `.wc-shell` is `overflow: hidden`, so **Apply Damage was not scrolled off — it was gone**, unreachable by pointer, by touch and by scroll. `flex-wrap: wrap` is a structural guarantee at any width and introduces no new size number. Shrinking the button floor would have been inventing a tuning value, which is yours.

**L2 — the vertical budget, and what actually fails.** At 1024×768 the three `auto` rows measure roughly **75 + 155 + 119 = 349px of 768**, leaving the felt 419px. The wide layout is comfortable and DLR-115's wider player bar and DLR-117's card-damage strip did not exhaust it. The narrow/short breakpoint is where the risk lives: `.wc-dossier` stops being a column and becomes a wrapping **row of four unbounded panels**, and because `.wc-shell` clips rather than scrolls and its felt row is now explicitly `minmax(0, 1fr)`, the felt collapses to zero *first* and every further pixel pushes the `hand` and `actions` rows off the bottom — the rows holding every control the player has. `--wc-dossier-narrow-max` bounds that term. **The value is a placeholder and it is yours.**

**L3 — the fan's reserve did not scale with the thing it reserved for.** The reserve was a fixed `1.3rem` (20.8px). What overflows the fan's box scales with `--wc-card-w`:

```
armed lift          0.20 × cardHeight, cardHeight = 1.5w   →  0.300w
armed scale(1.05)   0.025 × cardHeight                     →  0.038w
max fan rotation    sin(5.25°) / 2, from FAN_ROTATION_STEP_DEG
                    2.1 and a 6-card hand's max |spread| 2.5 →  0.046w
                                                     total  =  0.384w
```

Rounded up to `0.4`. At `--wc-card-w`'s lower bound (2.9rem = 46.4px) that is **18.6px** against the old 20.8px — the hand row gets 2.2px *back*, a small repayment on the 7-12px DLR-117 spent. At the upper bound (4.3rem = 68.8px) it is **27.5px** against the same 20.8px, **which is where the old fixed value was clipping the top of an armed card.** The multiplier is derived from constants already in `fanLayout.ts` and `warCouncilCards.css`; it was not chosen.

---

## Where the three carried layout risks now stand

**Risk 1 — "`.wc-shell` may scroll" was mis-stated.** `.wc-shell` is `height: 100dvh; overflow: hidden`, so it **cannot scroll**. The real risk is **cropping**, which is worse, because `.wc-table` already carries `min-height: 0` — the felt row collapses to zero before anything else yields, and the excess then pushes the *last* rows out. That is now bounded by L1 (horizontal) and L2 (vertical), and both `.wc-shell` rules state `minmax(0, 1fr)` so the guarantee no longer depends on a rule in a different file. **Bounded, not proven absent.**

**Risk 2 — the narrow override's missing `actions` row.** Confirmed present in `warCouncilHunt.css` by reading, and the row list now matches the base rule at five areas and five tracks. The Defender's DLR-114 fix holds. **It has still never been rendered.**

**Risk 3 — the hand fan cropped.** Closed by arithmetic at **both** `--wc-card-w` clamp bounds, which is the strongest claim available without a browser. Note the fan and the action bar are separate grid rows, so the bar can never overlap the fan; the only crop path was the shell overflowing, which is Risk 1.

---

## The ErrorBoundary — analysed, sound, not changed

Recorded so it is not re-investigated. `body` has `overflow: hidden`, so an overflowing fallback panel would put **both escape controls out of reach** — the failure mode of the thing whose only job is to be the last resort. It does not occur:

`.error-fallback` is `display: grid; place-items: center` with a single implicit `auto` row inside a container of definite `100dvh` height. `align-content` defaults to `normal`, which behaves as `stretch` for grid and stretches an `auto` track to fill the free space — so the row is the full padded viewport height. `.error-fallback__panel`'s `max-height: 100%` therefore resolves against a **definite** track and caps the panel, and its `overflow-y: auto` scrolls the excess inside it. Both controls stay reachable.

That is a static reading of grid track sizing. **The static palette's legibility under light *and* dark system settings is still unseen**, as is whether both controls are truly ≥44px on screen and whether a long `error.message` wraps.

---

## Everything you decide, and everything nobody has looked at

**Tuning values this ticket introduced (one):**
- `--wc-dossier-narrow-max: 30dvh` — a documented placeholder. Too low and the dossier scrolls on a phone; too high and the guarantee weakens. Only 390×844 settles it.

**Tuning values this ticket deliberately did NOT touch** — every one still yours, none seen rendered: `--wc-hp-shield-fill: #4f8fc0`, `--wc-hp-shield-ticking-opacity: 0.78` (a copy of `--wc-hp-ticking-opacity`; two unseen numbers agreeing is a reason to tune them together, not evidence either is right), `--wc-hp-shield-gap: 0.5rem` against `--wc-hp-heart-gap: 0.18rem`, the card-damage strip's smallest clamp (~9.3px, nominated as most-likely-wrong), `vault.css`'s nine `--wc-*` properties and every `clamp()` and hue, `shopSlot.css`'s properties, `errorBoundary.css`'s static palette.

**All new copy is placeholder:**
`Your queued 12 lands.` · `The hit destroyed your queued 12.` · `Damage to you destroys it.` · `Bell-Taker (Momentum): +2 multiplier.` · `Overlap Bonus +2 Momentum.`
The last two say the reward axis twice — once inside `buffName`'s parentheses, once in `buffRewardPhrase`. That is `buffLine`'s existing grammar, not a new one; breaking from it is yours.

**Open questions:**
- Whether `.wc-bar` wrapping to two rows on a phone (~50-60px of extra `actions` row) is an acceptable price for reachability. It buys a control you could not otherwise reach, which outranks it on `game-ux`'s hard floor — but the trade has never been seen.
- Whether a scrolling dossier at the narrow breakpoint reads acceptably.
- Whether naming the Overlap Bonus on the felt explains it or just adds a fourth number to a readout that already has three.
- Whether `healthBarValueText` should be **shortened** as well as re-ordered. Untouched, still open.
- **DLR-117 AC1** — hiding the always-visible per-card win/lose readout until a buff is active. Deliberately **not implemented**: hiding an always-visible readout is a visual judgement, which is exactly why DLR-125 declined to decide it.

---

## 7. The prioritised list of what still needs your eyes

This is the agenda. It is ordered so your own pass starts at the top rather than hunting. Viewports that matter: **1280×800, 1024×768, 1366×768, 390×844.**

**1 — Reachability, at 390×844.** Does the action bar wrap to two rows, and is **Apply Damage tappable**? This is the one defect in this ticket that made a control unreachable, the fix is structural, and it has never been rendered. While you are there: does the two-row bar crowd the hand or the felt off the bottom?

**2 — The narrow/short stack, at 390×844 and at any window under 34rem tall.** Does `.wc-dossier` fit inside `30dvh`, and do the `hand` and `actions` rows survive? If the dossier scrolls, is `30dvh` the wrong number or is the scroll acceptable? **This is the only value this ticket asks you to choose.**

**3 — The armed card's top edge, at a wide viewport** where `--wc-card-w` reaches its `4.3rem` bound. Does the lifted card clear the reserve? This was clipping before and the fix is arithmetic only.

**4 — The whole shell at 1280×800, 1024×768 and 1366×768.** The arithmetic says 349px of 768 in auto rows with 419px left for the felt. Confirm nothing crops. **This is the run's oldest debt and it has never been rendered once.**

**5 — Do the new custom properties resolve rather than silently falling back?** `getComputedStyle` on `.wc-dossier` at the narrow breakpoint should show a real `max-height`, not `none`. A name misspelled between two stylesheets compiles, lints and passes all 1811 tests while rendering the wrong thing. *(Mitigated but not proven: the grep returns the expected 3 hits and both spellings match.)*

**6 — The resolved-trick readout with every clause at once.** A trick that wins, cashes, damages you, books a Timebomb, fires two buffs **and** settles a payout renders five stacked sentences. Does that fit the felt, and does it read as one event or as a wall? The buff clause is brass, the payout clause is dim (alarm-red when destroyed).

**7 — The two narration sentences, judged as copy.** Does naming the Overlap Bonus earn its line? Does `The hit destroyed your queued 12.` land at the moment it appears?

**8 — `Lethal.` leading the health bar's spoken value**, with a screen reader. The worst case now reads `Lethal. 10 of 10. 2 shielded, 1 of them ticking. 6 at risk. 4 ticking.` Judge whether anyone listens to that, and whether it should also be shortened.

**9 — A clean console** on load, after a StrictMode remount, and after a trick that fires a buff.

**10 — The shop and the Vault**, against `game-ux`. **This ticket changed neither** — their stylesheets build on `run.css`'s `.run-shell` and share nothing with `warCouncilHunt.css`, and their open items (density, palette, copy) are all eyes-on rather than statically determinable. AC1's review of those two surfaces is this paragraph, not a diff.

**11 — The `ErrorBoundary` fallback's palette** under both light and dark system settings, and its two controls' real hit size.

---

## What was deliberately left, and why

- **Balance.** The game is currently unwinnable — 0 wins in 200 simulated runs, 2.17 damage dealt against 2.64 taken (DLR-130). **Not one value was retuned.** That is your pass and it was explicitly out of scope.
- **Three non-visual findings met along the way, named so they are not re-found:** `Keepsake` is confirmed dead (3 Purse cards pay nothing); **no template mints a consumable**, so Ward, Second Thoughts, Puppeteer, Foresight and Spyglass are unreachable by play; `Miser` fights the shop. None is a layout or narration defect and none was touched.
- **Taste.** Priorities 1 and 2 of the ticket's own four — unreachable surfaces, and the engine doing things the screen never narrates — were shipped properly. Priority 3 got one fix (`Lethal.` leading). Priority 4 was not attempted.

---

## Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | exits 0 |
| `npm run lint` | exits 0, 0 warnings |
| `npm test` | **1811 passed of 1811, 140 files, 0 failed** (baseline 1789 / 138) |
| `npm run build` | exits 0, 153 modules, `dist/` written |
| `npx prettier --check` (scoped to this contract's files) | exits 0 |

Reviewers: **Code-Evaluator APPROVED**, **Defender APPROVED** (0 critical, 0 warning, 1 info — fixed), **QA ALL PASSED**. **One round, of a permitted two.**

**Boundary and integrity checks:** pure-core grep over `src/hunt` and `src/warCouncil` → zero hits. `--wc-dossier-narrow-max` grep → exactly 3 hits (declaration, one prose mention, one `var()` read). No existing name renamed anywhere. Nothing this contract touches is persisted, so no save shape changed. No effect, listener, observer, timer or `requestAnimationFrame` was added, so there is no cleanup to write.

**Line budgets after this work** (400 blocking, measured with `(Get-Content <path>).Count`): `roundUiState.ts` **399**, `warCouncilHunt.css` **395**, `WarCouncilRound.tsx` **394**, `labels.ts` **389**. None breached. **`roundUiState.ts` has one line of headroom — the next field added to `ResolvedTrick` or `RoundUiState` forces a split.**

### Two record-keeping defects QA found, neither introduced here

- **The `throw new` baseline was stale.** `tasks.md` expected 98, from DLR-131's log entry. QA checked out `c760f78` in a temporary detached worktree and measured **102** there, and confirmed `git diff c760f78 -- src` contains zero added or removed `throw new` lines. The invariant that matters — this contract weakens no throw — holds. `tasks.md` is corrected; **the figure quoted in the run log should be 102, not 98, next time it is used.**
- **DLR-129's vocabulary retirement has five files left.** `poison` still appears in `src/hunt/rankTiers.ts` (`TieredRank.Poison`), and in comment prose in `src/vault/vaultOdds.ts`, `src/vault/vaultState.ts`, `src/warCouncil/bank.ts` and `src/warCouncil/types.ts`. **None is touched by this contract** and none renders to the UI, so this is a pre-existing gap rather than a regression — but it is a gap, and `CardRank.Poison` (rank 8) is the only sanctioned survivor.

### A note for future contributors

`applyResolution` is now the single place that can tell a **paid** payout from a **destroyed** one. After the fold both read `pendingApplyPayout: null`, so the distinction is not recoverable downstream — if you need it somewhere new, thread `TrickPayoutEvent` rather than re-deriving it from two encounter snapshots. `projectedDepletion` is the cautionary precedent: it carried its own copy of the absorption arithmetic and lied until DLR-115.
