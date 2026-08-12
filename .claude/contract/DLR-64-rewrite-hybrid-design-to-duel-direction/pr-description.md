# DLR-64 — Rewrite `hybrid-design.md` to the duel direction

Plan: [`plan.md`](./plan.md) in this folder. Tasks: [`tasks.md`](./tasks.md).

## Summary

Rewrites the live design document so it argues for the game actually being built: the player
declares Win or Lose before the first card, both sides read that same declaration's card values
and multiplier table, each side's product is damage to the other's health, and it all lands once
at the thirteenth trick. `Spoils` and the rising Demand are retired; the Quarry gains a stake in
the outcome for the first time.

**Sections touched, and which of the three kinds of reversal each carried:**

| Section | Change | Kind |
|---|---|---|
| *(new, un-numbered)* | The direction stated in one page — both tables, both value schemes, the same-path rule, health, damage-once | new content |
| §1 The equation | `Spoils` retired, Demand/Treasure/Poison rows deleted, new `###` declaration subsection added | modified |
| §3 What the run rewrites | Ceiling, bimodality finding, and flat-value dependency all removed; the Forage-variance conclusion reversed | **void and replaced** — no conversion available, the premise the arguments depended on was decided the other way |
| §5 Escalation | Rising Demand replaced by Quarry health + the cap; boss's escalation specified as a deck attack | modified |
| §6 Catch-up | The Humble-dominance superset proof | **retired as a historical note, not reversed** — its subject (two bands sharing a top multiplier) stopped existing; kept as the record of why the multiplier table became designed rather than transcribed |
| §7 Run length and depth budget | "No defeated opponent" gap resolved; run shape (four characters + a boss, five encounters, order randomised) stated | modified |
| §8 The ruleset | "The Quarry does not score" | **validated and flipped** — the fourteen-row enumeration's arithmetic was untouched throughout; only the conclusion moves, from "half the table is read by nobody" to "the tug is restored" |
| §9 First-pass values | Card value and the multiplier tables move to Decided; the Demand row deleted; six new rows added, no value chosen | modified |
| §10 Vocabulary | `Spoils`/`the Demand` removed, seven new terms added, band-name mismatch flagged not fixed | modified |
| §11 Smallest testable slice | Rescoped to one fight against the Monarch, two health bars, band-position CPU named as the largest engineering item | rewritten |
| §12 Critique | Re-run against `design-principles.md §6`; the declaration free option now ranks first | rewritten |

`ideas.md` was reconciled alongside it: six entries promoted, one superseded in place, one rejected,
three new entries recorded, one existing entry annotated for the health decision. §2 and §4 were not
touched.

## Decisions still needed from the developer

From `tasks.md`'s File map → "Developer decides or observes":

- **The ×0.5 rounding rule** — pick a rounding direction, or take the offered alternative of
  doubling every entry in both tables (`×2/×4/×6/×8/×10/×1`), which makes all arithmetic integer
  and deletes the question outright. This is the one number still gating the first fight.
- **The Hunt cap `R`** — deferred, not chosen. §9 states the derivable range at `H = 1,350`: above
  2.5, well under 17.3, so 3 to 5. The slice itself is what decides whether a cap is needed at all.
- **The boss's specific deck attack** — the category (attacking deck contents) is settled by AC 6;
  the specific form (suppressing a subset of Forage edits for the Hunt, vs. removing cards outright)
  is a design reading to red-line, and there's a second candidate beside it: the character that best
  punishes a *correct* declaration read.
- **The band names** — Humble / Defeated / Victorious / Greedy describe the Win path and
  misdescribe the Lose path, where 4–6 is the peak. §10 flags this and does not rename; renaming
  would ripple into `the-hunt.md` and the built `STANDING_BANDS`.
- **Whether the declaration free option gets a mitigation** — §12 ranks it first and names two
  cheap levers (declare before the decree is turned; sort the roster so each character punishes a
  declaration). Neither is taken in this pass.

## Scope increase: §3 came into scope

The ticket scoped the rewrite to "sections 1 and 5 through 12," with §1–§4 expected to survive
substantially intact. That held for §2 and §4 but not for §3: its `108` ceiling derivation, its
bimodality finding, and its flat-value dependency are all void under the new tables, and its Forage
variance conclusion reverses. Leaving §3 untouched would have left the document deriving and
defending a `108`-point ceiling that the same document contradicts four sections later — an
internal contradiction rather than a smaller diff. §3 was brought into scope for that reason; see
`plan.md` → Risks for the full argument.

## AC drift

AC 1, 3, and 4 as written in the Jira ticket could not be executed against the design session's
decisions (retiring `Spoils` as a score/comparator term, the two mirrored multiplier tables
replacing a single Standing table, and there being no Greedy-×0 zero-damage lane). `plan.md`'s
AC-drift table (Part 1) carries the reading actually used for each — worth reading before deciding
whether the criteria need updating. **The Jira ticket description should be updated to match**, or
this plan is the only record that the criteria were re-read deliberately rather than missed.

## Verification results (Phase 4)

All commands below were run and their actual output recorded — see `tasks.md` Tasks 13–17 for the
full detail.

- **`git status --porcelain`** — only `hybrid-design.md`, `ideas.md`, and this contract's own folder
  changed. No `src/`, no `.docs/game_rules/`, no `.docs/implementation/`, no `package.json` /
  `package-lock.json` entries.
- **`npm run typecheck`** — exits 0, no errors (zero-cost sanity check; proves nothing about the
  documents).
- **Section-numbering invariant** — all thirteen `##` headings present and unchanged (the twelve
  numbered sections plus the one new un-numbered opening section); a second grep confirms no `##`
  was added inside a numbered section.
- **Void-figure grep** — 11 hits for the retired figures (`108`, `×6`, the credit-mechanic
  comparison figures) in `hybrid-design.md`, and all 11 sit inside sentences that explicitly mark
  the figure as retired, historical, or void (the opening section's notice, §1's discarded-branch
  notes, §3's Forage notes, §6's historical note, §8's converted passage). None presents a void
  figure as current arithmetic.
- **New-figure grep** — the ceiling (540 / 765), the max swing (±444), the boundary total (708), and
  the health value (1,350) all appear (28 hits); `1,350` never appears as `900`, and the two `1,620`
  hits are both explicit citations of `ideas.md`'s illustration, not the document's own value.
- **The deliberate `the-hunt.md` / `scoring.md` divergence** — recorded, not fixed. 21 hits in
  `the-hunt.md` and 10 in `scoring.md` for the superseded `×6` table, the `220` Demand, and
  `LOSE_CREDITS_PER_HUNT` / `DEMAND_CURVE` / `FIXED_DEMAND`. Both files describe built code and
  current rules, neither of which this contract touches, so they correctly continue to state the
  superseded numbers. Confirmed via `implementation-doc-writer`'s Step 1 rule-change check: this
  diff changes nothing a player may do, must do, or is scored on, so `the-hunt.md` was correctly not
  edited.
- **Prettier, scoped** — `npx prettier --write` on the two changed files, then `npx prettier --check`
  on them: exits 0, "All matched files use Prettier code style!" The heading invariant was
  re-checked after the reformat and held.
- **Prettier, repo-wide, reported honestly** — `npm run format:check` **fails**, exit code 1, "Code
  style issues found in 21 files." Those 21 are pre-existing offenders elsewhere in `.docs/` and
  `.github/` (design notes, implementation docs, GitHub instructions) — neither `hybrid-design.md`
  nor `ideas.md` is among them. This is AC 12 as narrowed: the repo-wide script cannot pass without
  touching 21 unrelated files, which `.claude/workflow/web-project.md` forbids as an unrelated-work
  side effect, so the real gate is the scoped check above, and this step exists only to prove the
  contract didn't make the repo-wide state worse.

No code shipped, so there is nothing for QA to run and nothing verifiable by running the app. The
developer's review is of the prose itself — whether the reversals read as conversions rather than
overwrites, and whether the opening section states the direction clearly enough to decompose the
next epic against.

## For future contributors

**`hybrid-design.md`'s twelve numbered sections are a stable citation surface.** An audit at the
start of this contract found 148 `§N` references across eight live files pointing at them. A future
rewrite should add un-numbered or `###` headings rather than renumbering — renumbering silently
invalidates every citation, and nothing lints a `§N`.
