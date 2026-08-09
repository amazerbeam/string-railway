# DLR-44 — Design: Balatro × Forbidden Solitaire treatment of The Fox in the Forest

**Ticket:** <https://amazerbeam.atlassian.net/browse/DLR-44>
**Contract:** [`plan.md`](./plan.md) · [`tasks.md`](./tasks.md)

## Summary

Adds one design document — `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` (726 lines, twelve
sections). **No code changed.** Nothing under `src/` was written; `src/warCouncil/` was read only, to size
§11's slice honestly.

## The spine, in three lines

- **The equation:** `Score = Spoils × Standing`, evaluated once at the end of each 13-trick round. Spoils
  is the summed value of the cards you captured (additive); Standing is a multiplier read off the
  trick-count band you finish in, taken **verbatim** from the base game's printed table — zero invented
  numbers.
- **The shared object:** the deck-and-decree. The outer loop edits the deck the hand is dealt from and the
  decree that sets trump; the inner loop plays and captures those same cards. There is **no exchange rate
  anywhere** — both terms are read off the same pile, which is the toll-booth failure `forbidden-solitaire.md`
  §4 warns about, avoided by construction.
- **The 156 ceiling:** 13 tricks × 2 cards = 26 captured cards at most; at plain card value and the best
  multiplier, `26 × 6 = 156`. A Demand rising past that **cannot** be met by winning more tricks — only by
  making cards worth more. That forces the outer loop to rewrite an input rather than hand over a bonus,
  and it costs zero rules added.

## Decisions the developer must make

Every one of these is stated in the document as first-pass and unchosen. None was decided by this contract.

| Decision | What it trades off |
|---|---|
| **Standing ×0 for the Greedy band** | Zeroes a whole round — harsher than the base game, where 0 points still leaves your running total intact. May need a small positive multiplier. Flagged in §9 as the most suspect number in the design. |
| **Encounters per run · the Demand curve's base and shape · the Forage budget** | Unchosen tuning values. §9 states shapes and ranges plus the measurement that would settle each. |
| **Card base values** — is a plain card worth 1, or its rank? | The highest-leverage number in the document: it moves the 156 ceiling and therefore §3's whole argument. |
| **The naming** — the Hunt / the Quarry / Spoils / Standing / the Demand / Forage | A copy judgement, entirely yours. Accepting it implies a follow-up `CLAUDE.md` naming-pointer edit that **this contract deliberately does not make**. |
| **Catch-up: whether to add a still-winnable signal** | Showing it removes the reveal-drama `balatro.md` §2.5 argues for; hiding it taxes the most engaged players, who compute it anyway. §6 states both costs and does not choose. |
| **Slice sizing basis** | §11 is sized against the existing `src/warCouncil/` engine. If you want it sized as a clean prototype instead, that section changes materially. |
| **DLR-18 position** | Default taken: independent alternative, neither supersedes, not sequential. §10 also notes DLR-26's War Council CPU is shared work whichever direction proceeds. |

## The one thing only playing settles

**Does the trick layer stay tense against a CPU, or does it read as a slot machine with extra steps?** Fox
in the Forest gets its drama from reading a live opponent. The design's answer is telegraphed intent + a
hidden hand + a readable printed exception — but whether that *works* is a feel question paper cannot
resolve. **§11 exists to test exactly this**, and it carries a kill criterion that can actually fire.

## Verification

| Check | Result |
|---|---|
| Twelve `##` sections, numbered 1–12, matching `plan.md`'s section map | **PASS** — exactly 12 |
| Four cited reference documents resolve on disk | **PASS** — all four |
| No stale doc pointer copied from `CLAUDE.md` | **PASS** — 0 genuinely stale hits (see quirk 2) |
| No placeholders (`TBD` / `TODO` / `implement later` / `fill in details` / `to be decided`) | **PASS** — 0 hits; also 0 hits for "open question" |
| Every fork names its discarded branch | **PASS** — 12 matches (≥6 required) |
| `npx prettier --check` on the new file | **PASS** — "All matched files use Prettier code style!" |
| No source file modified by this contract | **PASS** — see quirk 3 |
| Document length | **726 lines** — comfortably above its siblings (`balatro.md` 514, `forbidden-solitaire.md` 383), so no section was written thin |

`npm run typecheck` and `npm run lint` are **genuinely N/A** — there is not one `.ts` or `.tsx` file in this
diff. The unfiltered suite and production build were skipped at the developer's instruction: this contract
changes no source, so they could only have reported pre-existing state.

### Three quirks that would otherwise mislead you

1. **The contract's own line-count command under-reports.** `(Get-Content … | Measure-Object -Line).Lines`
   returns **607**; the true count is **726** (`wc -l`). PowerShell's `-Line` skips blank separator lines
   when fed a string array. The 726 figure is the real one.
2. **The dead-path grep false-positives by design.** `Select-String -Pattern "design/design-principles\.md"`
   returns 2 hits — but both are the *correct* `../old-design/design-principles.md` citation, which contains
   the searched string as a substring (`old-`**`design/design-principles.md`**). Re-run anchored with a
   negative lookbehind for `old-` and it returns **0**. The document cites only real paths.
3. **The working tree was already dirty before this contract began** — 31 entries including `src/App.tsx`,
   `src/vanguard/overwrite.ts`, and an untracked `src/app/battle/`, all from prior work. `git status
   --porcelain` after this contract is **byte-identical** to the baseline captured before it started, so the
   `src/` entries are not a scope violation and nothing here touched them. This contract added exactly two
   files: `hybrid-design.md` and this `pr-description.md`.

## Notes for future contributors

`.docs/design/Balatro-Forbidden-Solitaire/` now holds two research references (`balatro.md`,
`forbidden-solitaire.md`) plus one committed design (`hybrid-design.md`). The design **cites** the research
and does not restate it — per the single-source-of-truth rule, fix a parent-game rule where it is owned, not
at the call site.

**`CLAUDE.md` is stale** and misled parts of this run: it describes the repo as an empty prototype scaffold
with no application code (there are ~142 files under `src/` and two complete engines), cites
`.docs/design/design-principles.md` and `.docs/design/skirmish-board-replacement.md` — neither of which
exists, the real paths carry `old-design/` — and names the Jira project `SCRUM` when it is `DLR`. **A
separate `/fb-issue` is recommended; this contract does not fix it.**
