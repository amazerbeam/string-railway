# DLR-161 — Skull Helmet and Skull Tether

Plan: `.claude/contract/DLR-161-skull-helmet-and-skull-tether/plan.md`
Mockup: `.claude/contract/DLR-161-skull-helmet-and-skull-tether/mockup.html`

## What the two cards do

Both cards react to a trick that **hurt** the player on the outcome axis — an eaten skull at bronze,
widening at silver and gold to also cover a clean loss (a trick lost with no skull on it). Neither
card cares about the mechanical axis — whether the player physically took the trick — beyond what
already distinguishes "ate a skull" (took a skulled trick) from "clean loss" (did not take a
clean trick); a dodge and a clean win are both good outcomes and neither card fires on either. On a
hurt trick the 1 damage still lands exactly as it always does — these cards never spare the health —
but Skull Helmet keeps the running `total` at the value it held instead of letting the hurt trick
zero it, and Skull Tether does the same for `roll`. At gold, the surviving figure also gains one: the
Helmet's `total` +1, the Tether's `roll` +1. Arming both on the same trick protects both figures, and
a second copy of the same card on the same trick has no additional effect beyond being spent (they do
not stack).

## Developer decides or observes

- `src/hunt/slotWeights.ts` → `SLOT_FAMILY_WEIGHTS`: Skull Helmet / Skull Tether at placeholder
  **3 / 2** on the Skirmisher machine and **1 / 1** on the Strongbox machine. Trades how often either
  card is offered against how often a damage card is offered; `ideas.md` leaves open whether a
  protective card belongs on the damage strip at all.
- `src/hunt/slotWeights.ts` → `SLOT_AXIS_WEIGHTS[Protection]`: placeholder **3 / 1** per machine.
  Inert today — each family has exactly one axis, so the weight cancels out of
  `templateWeightFor` — kept only to preserve the table's total.
- `src/hunt/buffCosts.ts` → `REWARD_BASE[Protection]`: placeholder **2 / 3 / 4** AP across
  bronze / silver / gold. Trades how expensive protection is to arm against the game's other reward
  axes.
- `src/hunt/buffCosts.ts` → `CONDITION_MODIFIER` for both families: placeholder **0 / 0** — no
  reliability discount or surcharge applied to either card yet.
- `src/hunt/buffTemplates.ts` → `REWARD_TIER_VALUE[Protection]`'s gold figure: **+1**, transcribed
  directly from acceptance criterion 6. The ticket and `ideas.md` both flag it as possibly undersized
  against the game's own 1/3/5 and 2/3/5 reward ladders — judge after playing.

Also the developer's to overrule: all placeholder copy (`Skull Helmet` / `Skull Tether` as card
names, `Helmet` / `Tether` as reel words, `Guard` as the reward suffix, `HURT` as the cadence pill,
and the two condition sentences), the two drawn glyphs judged against `mockup.html`'s greyscale
button, and the new `--wc-guard: #7fae8c` colour token added to `warCouncil.css` in Phase 3. Whether
the pair feels like counterplay in a real hand is the whole point of the ticket and is only
answerable by playing.

## Acceptance criterion 10

**Satisfied, not outstanding.** DLR-160 landed `src/app/warCouncil/resolutionDeadBuffs.ts`, which
builds the "armed but did not fire" resolution-screen line generically out of `buffName` +
`buffConditionSentence`. This contract's card copy for both families feeds that existing generic
mechanism with no further code required.

## Verification

- `npx vitest run --project node` — 160 test files, 2027 tests passed.
- `npx vitest run --project dom` — 52 test files, 490 tests passed.
- `npm run typecheck` — exit 0.
- `npm run lint` — exit 0.
- `npm test` (full suite) — 212 test files, 2517 tests passed.
- `npx prettier --check` on this contract's file list — initially flagged `src/hunt/buffCosts.ts`,
  `src/warCouncil/streak.ts`, and `src/app/warCouncil/resolutionBeats.ts` (all three modified by this
  contract); reformatted with `npx prettier --write` on those three files alone, then re-checked
  clean, and typecheck/lint/a scoped Vitest re-run confirmed the reformat changed nothing behavioural.
- `npm run build` — exit 0, `dist/` written, no bundler errors.

## Known finding (not fixed in this phase)

`src/hunt/startingPile.ts`'s docblock (line 65) still reads "the pool is 16 templates" — a leftover
from before this contract widened the pool to 18. This phase is verification-only and does not touch
production code, so the comment is reported here rather than edited.
