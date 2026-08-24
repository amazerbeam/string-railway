# DLR-117 — Live card preview: win/lose damage readout

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

Every hand card now carries an always-visible readout of the damage it would deal to the
Quarry if it wins its trick and the damage it would cost the player if it loses. The figures
are never invented — `cardDamagePreview` (new: `src/app/warCouncil/cardDamage.ts`) builds a
hypothetical `TrickResolution` for each branch and hands it to the exact `applyResolution` fold
the reducer commits a real trick through, then reads the health delta back off the result.

The compact glyph form (`W6 L1`, or `~W6 L1` while the preview is an estimate) renders
`aria-hidden` beneath each card in a new `.wc-fan-slot` wrapper; the full four-figure sentence —
both sides of both branches, any shield absorption, and the estimate caveat — is the card
button's accessible **description**, reached through a new `describedBy` → `aria-describedby`
prop on `PlayingCard`. The card's accessible **name** is unchanged.

New/changed files: `src/app/warCouncil/cardDamage.ts` (new, 101 lines) and its spec;
`commitHandlers.ts` (`playOptions`, `FoldedResolution`, `applyResolution` made `export` —
visibility only, no signature or behaviour change); `labels.ts` (`cardDamageGlyphText`,
`cardDamageText`, `CARD_DAMAGE_ESTIMATE_NOTE`, `CARD_DAMAGE_ESTIMATE_GLYPH`); `PlayingCard.tsx`
(optional `describedBy` prop); `HandFan.tsx` (required `damageForCard` callback, `.wc-fan-slot`
wrapper, `.wc-card-damage` strip); `warCouncilHand.css` (`.wc-fan-slot`, `.wc-card-damage`,
`.wc-card-damage.wc-is-estimate`); `WarCouncilRound.tsx` (one import, one prop passed to
`HandFan`).

## Every case where the preview is an estimate rather than a certainty

1. **The Quarry's card is face down (the player is to lead).** `trickIsSkulled` and
   `trickIsPrimed` test the whole trick, and skulls are dealt to the Quarry, so the trick's
   skull and Timebomb state are undecided until the Quarry's card is on the table. A skulled
   Quarry card would turn the win branch from a `CleanWin` into a `SkullWin` and invert both
   figures. Flagged on screen with the leading `~` and italics, and in words with
   `CARD_DAMAGE_ESTIMATE_NOTE`. `exact` is `true` only when `round.currentTrick.length === 1`
   (the Quarry's lead is already on the table).
2. **A Timebomb this card would BOOK for the next trick is not shown.** `applyResolution`
   books it, but booking costs no health at *this* resolution, so it never appears in the
   health delta the preview reads. Playing a primed card that wins therefore reads as cheaper
   than it turns out to be, until the ticking hearts appear after the trick resolves.
3. **Overkill is truncated.** Every figure is a health delta and `deplete` floors health at 0,
   so "win: 4" against a Quarry on 4 health means "enough", not "exactly 4 gross". This matches
   how `duelHealthBars` already handles overkill, but it is a reading the developer should
   confirm (see Developer decisions below).
4. **Activated buffs contribute nothing.** `src/hunt/buffAccrual.ts` has no caller anywhere in
   `src/`; `activateBuff` spends AP and records `activatedThisTrick` and stops there. The
   preview deliberately does not add a bonus the resolution will not pay. **Consequence: DLR-117's
   AC3 (additive stacking of several buffs on one card) is not met today** — the code is
   structured so it becomes true automatically the moment buff accrual is wired into
   `playOptions`, with no edit to this contract's files, but as of this commit it is
   structurally poised rather than actually true.
5. **AC1's "once any buff is active" gate was deliberately not built.** The readout is always
   visible, because bank, multiplier, a pending Timebomb, a held Blast Guard, the final trick,
   and a primed card all already move these numbers, and hiding a true number until a buff
   fires would withhold it for no reason.
6. **The two card-invariant cross-terms are not on the card face.** A Timebomb detonating on a
   win, and the forced cash-out on a loss, are the same whichever card is played and are
   already previewed on the health bars (DLR-101's ticking hearts, DLR-86 AC3's at-risk band).
   They ARE included in the spoken description on every card.
7. **The preview never collapses to the one branch that will actually happen**, even though
   `chooseCpuCard` is deterministic and it could, because doing so would leak the Quarry's exact
   card past `TELEGRAPH_FIDELITY`.

## How the anti-drift claim was proved

`branchFor` calls `resolveTrickBank`, then the exported `applyResolution`, and reports
`before.health[side] - after.health[side]` per side plus `before.shieldHearts - after.shieldHearts`
— a health delta produced by the real fold, so shield absorption, the zero floor, and the
payout-destroyed-by-a-hit rule are inherited rather than restated. `applyDamage`'s own docblock
sanctions exactly this pattern: *"Returns a new state; the input is never mutated. That is what
lets a caller preview an event by applying it to a copy, rather than writing a second projection
routine that could drift from this one."*

Verified three ways:

- `Select-String` over `cardDamage.ts` for `applyResolution|playOptions|resolveTrickBank` found
  exactly the import statement plus one call site each — the preview's only routes to a damage
  figure.
- A recursive grep for `Math\.min\(.*[Ss]hield|absorbWithShield` across `src/app/warCouncil`
  found only prose in `cardDamage.ts`'s docblock and `duelHealthBars.ts`'s pre-existing calls —
  no inline shield arithmetic was reintroduced.
- `cardDamage.test.ts` reads every expected figure off the engine's own `DAMAGE_PER_HIT`,
  `forcedCashValue(3, 2)`, and `cashValue(2, 2)` rather than hard-coding a number, so the spec
  would actually catch drift if the fold's arithmetic ever changed underneath it.

## Vertical cost and its interaction with DLR-119

The `hand` grid row grows by roughly **7-12px** — one line of `calc(var(--wc-card-w) * 0.2)`
text plus a `calc(var(--wc-card-w) * 0.04)` gap, less the ~3.2px of slack already inside
`.wc-fan`'s `min-height`. No grid row was added to `.wc-shell`, and `.wc-fan`'s
rotation-reserve padding was deliberately not spent, because that reserve is DLR-119's
territory. This makes DLR-119's three open risks slightly worse rather than better:
`.wc-shell` possibly scrolling at 1280×800 / 1024×768 / 1366×768 / 390×844, the
never-rendered narrow-viewport `actions` row override in `warCouncilHunt.css`, and the hand
fan's card-overlap cropping.

## What a browser would have checked, and did not

The browser pass was **not requested this run**. Left unverified:

- Whether the added 7-12px makes `.wc-shell` scroll or crop at 1280×800 / 1024×768 /
  1366×768 / 390×844.
- Whether `--wc-card-w` and `--wc-chalk-dim` resolve inside `.wc-card-damage` rather than
  silently falling back.
- Whether the strip is legible at the smallest clamp (`--wc-card-w: 2.9rem`, so about 9.3px
  font size).
- Whether the fan's card overlap occludes the strip of an underlying card.
- A clean console on load and after a remount, specifically watching for an
  `aria-describedby`-target-missing warning given the ids are composed per card from
  `useId()`.

A mockup exists at `mockup.html` in this plan folder and **went unseen**.

## Verification results

- **Phase 1**: `npm run typecheck` exit 0; `roundReducer` specs 45 passed; `cardDamage.test.ts`
  10 passed; whole `warCouncil` node project 241 passed across 20 files.
- **Phase 2**: typecheck exit 0; `labels.test.ts` 45 passed.
- **Phase 3**: typecheck exit 0; `PlayingCard.test.tsx` 8 passed; `HandFan.test.tsx` 21 passed;
  `WarCouncilRound.readouts` + `WarCouncilRound` 19 passed; whole dom project under
  `src/app/warCouncil` 165 passed across 20 files.
- **Phase 4 (QA)**: `npm run typecheck` exit 0; `npm run lint` exit 0; `npm test` →
  **117 test files passed, 1526 tests passed** (baseline was 1503 of 1503 across 116 files);
  `npx prettier --check` on the 12 contract files → "All matched files use Prettier code
  style!"; `npm run build` exit 0, `dist/` written in 214ms with no bundler errors.
- **Reviewers**: Code-Evaluator APPROVED, Defender APPROVED (0 critical / 0 warning / 0 info),
  QA ALL PASSED — one round, no fix pass needed.
- **File sizes**, measured with `(Get-Content <path>).Count`: `WarCouncilRound.tsx` 380,
  `HandFan.tsx` 183, `labels.ts` 359, `cardDamage.ts` 101, `commitHandlers.ts` 217 — all under
  the 400-line budget.

## Developer decisions outstanding

- The glyph form `W6 L1` / `~W6 L1` and the `~` estimate marker are placeholder copy.
- `font-size: calc(var(--wc-card-w) * 0.2)` is transcribed from the card's own scale
  convention (rank 0.34, suit 0.56, pip 0.12) and is the developer's to retune.
- Whether the two-figure density on the card face is right.
- Whether truncating overkill to the health actually lost is the right reading.
- Whether the preview should ever collapse to the single real branch.

## Note for future contributors

A preview on this screen derives from `applyResolution` and reads a health delta — it never
re-derives damage. Any new preview on this screen should follow the same pattern rather than
writing a second projection routine that could drift from the fold.
