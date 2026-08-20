# DLR-94 — Apply Damage: a player-triggered cash-out

**Contract:** [`plan.md`](plan.md) · [`tasks.md`](tasks.md) · [`mockup.html`](mockup.html)
**Epic:** DLR-87 — Shop rebuild: persistence categories, flask, Apply Damage, quick-kill payout
**Design source:** `.docs/design/Balatro-Forbidden-Solitaire/version-4-scope.md` §3, including D6

---

## What changed

Until now the bank cashed on exactly two events, both of them things that *happened* to the player: a
hit, and the sixth trick arriving. This adds a third that the player **chooses**.

**Apply Damage** is a pre-card control on the felt rail. It deals the **full** `bank × multiplier` to
the Quarry, resets both counters, and costs **no health**. The trick then proceeds normally — the
player still plays their card, and it resolves by the ordinary rules against a freshly zeroed bank.

**And the automatic cash-out got worse, which is the point.** `resolveTrickBank`'s forced-hit branch now
pays **two-thirds of `bank × multiplier`, floored** — for every forced hit: a clean loss, an eaten
skull, and a poison hit that resets the streak. **The end-of-hand cash-out is untouched** and still pays
in full, pinned by a test that cashes one identical streak both ways.

| Tricks in a row | 1 | 2 | 3 | 4 | 5 | 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Cashed by you, or at hand's end | 1 | 4 | 9 | 16 | 25 | 36 |
| Caught holding it | 0 | 2 | 6 | 10 | 16 | 24 |

That turns a growing bank into a bet rather than a number the game spends for you at the worst moment.

**D6 graduated from `[not built]`.** Apply Damage is refused while poison is pending — a design decision
recorded on 2026-08-19 with nothing to enforce it until now.

---

## For future contributors: the fraction is two constants, not one float

**This is the codebase's first fractional rule, and the next one will be tempted to write `* (2 / 3)`.
Don't.** `2 / 3` is `0.6666666666666666`, so `3 * (2 / 3)` is `1.9999999999999998`, which floors to **1**
where the rule says **2** — wrong for every multiple of three. `FORCED_CASH_OUT_NUMERATOR` and
`FORCED_CASH_OUT_DENOMINATOR` are separate so `forcedCashValue` can multiply *before* it divides, keeping
the dividend an exact integer at the only division involved. `bank.test.ts` pins this directly over every
multiple of three up to 300.

---

## Decisions the developer owns

**Two rule readings were the planner's, not the ticket's.** Both shipped as documented defaults and both
are yours to overturn:

1. **Poison pays the reduced rate too.** The ticket enumerated only "clean loss and eating a skull", but
   poison reaches the identical `if (trickHit || poisonResets)` branch, and the stated rationale — "you
   got caught before you chose to apply" — is exactly what a poison hit is. Paying poison in full would
   make being poisoned the *cheapest* way to lose a streak, inverting the item the rule sits beside.
   Reversing it means splitting that branch into two cash-out figures.
2. **The control is available on a follow as well as on a lead.** "Before playing a card each trick"
   was read as *whenever your own card is next to be committed*. The stricter lead-only reading is
   defensible and would halve how often the control is reachable — a one-line change to the refusal
   predicate plus a fourth refusal reason.

**All new copy is placeholder**, flagged as such in `labels.ts` exactly as every other label there is:
`APPLY_DAMAGE_RAIL_LABEL` (`'Apply'`), `APPLY_DAMAGE_POISED_HINT`, the three
`APPLY_DAMAGE_REFUSAL_MESSAGE` sentences, `applyDamageAccessibleName`'s wording, `BankMeter`'s
"If you're hit first" line, and the plate's `⤓` glyph. Nothing about the rule depends on any of it.

**Judgement calls only answerable by playing:**

- Whether **two taps** (poise-then-commit) is right, or one. A misclick permanently spends a streak,
  which is why it mirrors the Cheat and Envenom grammar — but Apply Damage is not a per-trick reflex, so
  the tap cost barely compounds.
- Whether a **third plate crowds `.wc-felt-rail`** at a short viewport. QA proved the page does not
  scroll at 1920×1080, 1440×900 and 1280×720; whether it *reads* crowded is your eye.
- Whether the **absent breaking-hearts beat** on a voluntary apply reads as abrupt. Those hearts read off
  `ui.resolvedTrick`, and a voluntary apply resolves no trick, so they simply drop.
- **The recorded decision that the at-risk heart preview keeps showing the FULL figure**, with the
  reduced figure on `BankMeter` instead. `projectedFromStreak` is deliberately untouched.

---

## Two files were split, both pure moves

Neither changed a public name or a barrel surface, and every pre-existing spec passed unedited through
both:

- `src/hunt/config.ts` **413 → 324**, carving `skullWeights.ts` (93). Adding the two constants would
  have breached the 400-line ceiling.
- `src/app/warCouncil/roundReducer.ts` **390 → 352**, carving `quarryAdvance.ts` (96). Widening before
  cutting is what kept each step of the phase type-checking.

`canAct` also moved into `roundUiState.ts` and is now **exported**: it had been private to the reducer
while `WarCouncilRound.tsx` recomputed the identical six clauses inline as `interactive`.

---

## Verification

Every figure below is quoted from an actual run.

| Gate | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no errors |
| `npm run lint` | exit 0, no errors, no warnings |
| `npm test` (unfiltered) | **68 files, 922 passed**, 0 failed |
| `npx vitest run --project node` | **44 files, 728 passed** |
| `npx vitest run --project dom` | **24 files, 194 passed** (no cold timeout) |
| `npx prettier --check` (19 contract paths) | `All matched files use Prettier code style!` |
| `npm run build` | exit 0, `dist/` written, no bundler errors |

**Per phase:** Phase 1 — `bank.test.ts` 42 passed, app-layer specs 44 passed, combined re-check 164
passed. Phase 2 — `voluntaryCashOut.test.ts` 13 passed. Phase 3 — the five reducer specs 64 passed.
Phase 4 — `labels` 33, `ApplyDamagePlate` 7, `BankMeter` + envenom 17, `roundHint` 10, the full felt
suite 35.

**Static audits:** zero React imports or DOM globals under `src/warCouncil/**` and `src/hunt/**`; no
literal fraction anywhere in `src/` outside explanatory comments; `FORCED_CASH_OUT_*` read only in
`config.ts` (declaration), `hunt/index.ts` (re-export) and `bank.ts` (`forcedCashValue`, its sole
reader); no near-miss spelling of any new identifier; every touched file under 400 lines.

**Driven in a real browser (QA):** the plate rendering beside the Cheat and Envenom plates with a clean
console; the empty-bank refusal sentence rendered on the control's face as a `<p>` rather than a tooltip;
the refusal switching to "Not your move yet." mid-trick; one click poising it with a dashed gold lift and
`aria-pressed=true`; the second click dropping the Quarry's hearts by the full figure with the player's
health unchanged and the bank readout zeroed; the trick then resolving normally and the hand advancing;
and no page scroll at all three viewport sizes.

---

## Incident during review, disclosed

QA accidentally reverted `src/warCouncil/__tests__/bank.test.ts` to the last commit with a
`git checkout --` while trying to undo a stray `prettier --write`. Because this contract's work was
uncommitted, that destroyed Task 2's edits rather than undoing the write. It was caught by QA itself,
reported rather than hidden, and repaired in the fix pass by re-applying Task 2's Steps 1, 7 and 8
verbatim from `tasks.md` — which is the specific reason those steps record their exact content. The
restoration was then verified line-by-line against the contract by both the Code-Evaluator and QA, with
no assertion weakened or dropped. **No production file was ever affected.**

---

## Files changed

**Created:** `src/warCouncil/voluntaryCashOut.ts`, `src/hunt/skullWeights.ts`,
`src/app/warCouncil/quarryAdvance.ts`, `src/app/warCouncil/ApplyDamagePlate.tsx`,
`src/app/warCouncil/warCouncilApplyDamage.css`, plus specs
`src/warCouncil/__tests__/voluntaryCashOut.test.ts`,
`src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`,
`src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`.

**Modified:** `src/hunt/config.ts`, `src/hunt/index.ts`, `src/warCouncil/bank.ts`,
`src/warCouncil/index.ts`, `src/app/warCouncil/roundUiState.ts`,
`src/app/warCouncil/roundReducer.ts`, `src/app/warCouncil/labels.ts`,
`src/app/warCouncil/roundHint.ts`, `src/app/warCouncil/BankMeter.tsx`,
`src/app/warCouncil/WarCouncilRound.tsx`, `src/app/warCouncil/warCouncilHunt.css`, plus the specs
`src/hunt/__tests__/config.test.ts`, `src/warCouncil/__tests__/bank.test.ts`,
`src/app/warCouncil/__tests__/{labels,roundHint,BankMeter,roundReducer.bank,WarCouncilRound,WarCouncilRound.readouts}.test.*`.

**Docs:** `.docs/game_rules/the-hunt.md` (the two-thirds rule, the new Apply Damage section, D6
graduating to `[settled]`, nine new Status-register rows, five new Known tensions);
`.docs/implementation/war-council/voluntary-cash-out.md` and
`.docs/implementation/war-council-ui/apply-damage-plate.md` (new); and updates to the `hunt`,
`war-council` and `war-council-ui` module docs plus the top-level index.
