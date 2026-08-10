# DLR-51 — The Quarry's round-long rule-break: the mechanism, plus the Monarch

Plan: [`plan.md`](./plan.md) in this contract folder.
Jira: **DLR-51** (Story, Highest, label `engine`, parent epic DLR-46).

## Summary

Gives a Hunt one Quarry character whose printed ability applies for the whole round rather than
for the single card that prints it, and implements exactly one of the five — **the Monarch** —
end to end in the engine.

- **`RoundState` gains one optional field**, `quarryCharacter?: QuarryCharacter` (`src/warCouncil/types.ts`) — written once by `dealRound` (`src/warCouncil/deal.ts`, new optional third parameter) and never written again.
- **One new pure rule-break module**, `src/warCouncil/quarryRuleBreak.ts` — `QUARRY_SIDE`, `monarchFollowSet` (the Swan-then-highest set, lifted verbatim from the existing single-card path), and `monarchFollowApplies` (the round-long applicability predicate).
- **One added disjunct in `legalMoves.ts`** — the round-long rule-break is consulted as an *additional* condition alongside the existing single-card Monarch check, not a replacement.
- **One reason-code fix in `playCard.ts`** — a rejection caused by the round-long rule-break now reports `IllegalMoveReason.MustFollowMonarch` (the existing code) instead of the generic follow-suit reason, by consulting the same `monarchFollowApplies` predicate `legalMoves` uses, so the legal set and the rejection reason cannot drift apart.
- **The Monarch's display data**, `src/hunt/quarryCharacters.ts` — `QUARRY_CHARACTERS` (a `Partial<Record<QuarryCharacter, QuarryCharacterInfo>>`, Monarch-only today) and `quarryCharacterInfo()`, both re-exported from `src/hunt/index.ts`.

**Untouched, deliberately:** `src/warCouncil/abilities.ts` (AC 2 — the single-card abilities are unchanged), `src/hunt/config.ts` (the Monarch's rule-break has no numeric/tunable aspect — AC 8), and everything under `src/app/**` (no UI change in this ticket).

## Decisions for the developer

1. **The Monarch's on-screen sentence (copy).** Shipped, transcribed from §4's worked example:

   > "Every time the Monarch leads a suit you hold, you must play your Swan of that suit or your highest card of it."

   This is a one-line edit in `src/hunt/quarryCharacters.ts` if the wording should change — including whether it should also name the liability (a player who has already shed both cards of a suit is unconstrained in it).

2. **Rule reading: "highest of the suit" recomputed live vs. fixed at deal time.** Shipped as **live recompute** — `monarchFollowSet` reads the hand at the moment of the follow, every time. Consequence, pinned by test (`legalMovesQuarry.test.ts`, "recomputes the highest from the current hand rather than fixing it at deal time"): shedding your Swan and your top card of a suit narrows you to your *new* highest of that suit on the next Quarry lead of it — it does not free you in that suit. Reversing this reading would change what `RoundState` needs to carry (a snapshot of the deal-time highest per suit) and is a re-plan, not a tweak.

## What this ticket does not touch

Nothing in the running app exercises this yet. `dealRound`'s two callers in `App.tsx` keep passing two arguments — which character appears in which encounter is T9's run-scheduling work, still to land. So there is **no play-test step** for this ticket; the mechanism is proven by the seeded CPU simulation (AC 6) described below, not by running the app.

## Verification results

All numbers below are from this phase's (Phase 3) own re-run, which supersedes the per-task numbers reported during Phases 1–2 with full-suite totals. Phase breakdown: Phase 1 (Tasks 1–5) built the field, the rule module, the `legalMoves` disjunct, and the `playCard` reason-code fix, each task leaving `npm run typecheck` clean; Phase 2 (Task 6) added the 61-case seeded CPU simulation (AC 6) with no production change.

- **Pure-core boundary** (Task 7): `Get-ChildItem -Path src\warCouncil,src\hunt -Recurse -Filter *.ts | Select-String -Pattern "from 'react|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("` → zero hits. `Get-ChildItem -Path src\hunt -Recurse -Filter *.ts | Select-String -Pattern "^import .*warCouncil"` → zero hits (the `warCouncil → hunt` edge stays one-way).
- **No hard-coded tunables, files within budget** (Task 8): `Select-String … -Pattern "rank === 1\b|rank === 11\b|rank > 1\b"` over the four changed engine files → zero hits (Swan/Monarch referenced only via `CardRank.Swan`/`CardRank.Monarch`). `git status --porcelain src/hunt/config.ts src/warCouncil/abilities.ts src/warCouncil/__tests__/legalMoves.test.ts src/app` → no output (all four confirmed untouched). File sizes: `quarryCharacters.ts` 32, `quarryCharacters.test.ts` 23, `quarryRuleBreak.ts` 40, `quarryRuleBreak.test.ts` 90, `legalMovesQuarry.test.ts` 104, `legalMoves.ts` 20, `playCard.ts` 110, `types.ts` 96, `deal.ts` 33, `cpuPlayer.test.ts` 287 — every file well under the 400-line budget.
- **Vitest cache warm-up** (Task 9, Step 1): `--project node` → 21 files, 302 tests passed. `--project dom` → 3 files, 22 tests passed. Both exit 0.
- **Typecheck**: `npm run typecheck` → exit 0, no errors.
- **Lint**: `npm run lint` → exit 0, no errors or warnings.
- **Full suite**: `npm test` → exit 0 — **`Test Files  24 passed (24)`** / **`Tests  324 passed (324)`**.
- **Formatting** (Task 9, Step 3): scoped `npx prettier --check` over the 14 files this contract touched initially flagged 2 hand-wrapped files (`src/warCouncil/playCard.ts`, `src/warCouncil/__tests__/cpuPlayer.test.ts`) out of style. Ran `npx prettier --write` on those two files only (the exception this step explicitly grants), re-confirmed `npm run typecheck` clean and the two affected specs still green (145 passed) to prove the reformat changed no behaviour, then re-ran the check: `All matched files use Prettier code style!` — exit 0.
- **Production build**: `npm run build` → exit 0. `50 modules transformed`, `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js` written, built in 389ms, no bundler errors.

## For future contributors

A new round-long character is added by giving it an entry in `QUARRY_CHARACTERS`
(`src/hunt/quarryCharacters.ts`) **and** enforcement in `quarryRuleBreak.ts`
(`src/warCouncil/quarryRuleBreak.ts`) — both are required, not either. `QUARRY_CHARACTERS`'s
`Partial<Record<QuarryCharacter, QuarryCharacterInfo>>` type makes the four still-unimplemented
characters (Witch, Woodcutter, Fox, Swan) visible as `undefined` lookups rather than silently
displaying a rule nothing enforces; a later ticket (T13) closes that gap.
