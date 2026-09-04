---
name: play-tester
description: Answer statistical and "why" questions about the Hunt encounter by running the real engine through its headless simulator at scale, extending the simulator's instrumentation additively when a question needs data it doesn't yet track, and replaying one seed interactively when a question needs judgement rather than a count. Use when asked whether the encounter is winnable, what the win rate is, what buffs are unusable in the first hand, which buffs perform best, how far a player gets under a given strategy (e.g. never buying health), or to explain why one specific simulated run failed.
allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell, Skill
metadata:
  type: automation
---

## Overview

`prototype/src/sim/` already drives the real production engine — the same `roundReducer` a tap in the UI calls — through a scripted policy, at whatever scale you ask for (`npm run sim -- --runs 500`, run from `prototype/` — see `.claude/workflow/web-project.md` → *Verification commands*). Most play-testing questions are answered by reading or lightly extending that machinery, not by inventing a new tool. This skill's job is to check what the sim already tracks, extend it additively only where a question needs a fact it doesn't yet carry, run the real quality gates on that change, run the sim, and report the numbers in plain language — so instrumentation compounds across questions instead of being rebuilt each time.

Read `references/sim-architecture.md` before making any change — it maps every file this skill touches and the extension points already built into them.

## When to Use This Skill

- "Is the encounter winnable? What's the win rate?"
- "What buffs are unusable in the first hand? / dead cards early?"
- "Which buffs perform best?"
- "If the player never buys health (or never activates buffs, or always discards), how far do they get?"
- "Why did this specific run/seed fail?" — a judgement question about one game, not a count across many
- Any question of the shape "play N games and tell me X" about the Hunt encounter

## Core workflow

### 1. Check — does the data already exist?

Read `prototype/src/sim/types.ts` (`HandReport`, `RunReport`, `SimSummary`), `prototype/src/sim/report.ts`, `prototype/src/sim/playHand.ts`, and `prototype/src/sim/playRun.ts`. If every fact the question needs is already a field on `HandReport`/`RunReport` — even if `formatSummary` doesn't print it — skip straight to step 4 with a small, disposable query script instead of touching the engine. Most repeat questions land here once the instrumentation has grown a little.

### 2. Extend — only if a fact is genuinely missing

Two kinds of gap, two different fixes:

- **A new observation** (e.g. "which buff *kind* got refused, not just a count"): add an optional, additively-named field to `HandReport` or `RunReport`, populate it at its one real call site (`runBuffWindow`/`playHand.ts` for hand-level facts, `playRun.ts` for run-level facts), and leave every existing field's name and meaning untouched. Never rename or repurpose a field — `report.test.ts` and anything reading old data both depend on the existing shape.
- **A new strategy** (e.g. "never buys health"): add a new `SimPolicy` next to `baselinePolicy`/`maximalistPolicy` in `prototype/src/sim/baselinePolicy.ts`, reusing as much of `baselinePolicy`'s card/buff logic as the question allows so a result is attributable to the one lever that changed, and register it in `POLICIES`.

Invoke the `react-frontend` skill before writing any of this — `prototype/src/sim/` is real, tested, lint-enforced production TypeScript, not a scratch script, and its conventions (strict types, no `any` without a stated reason, 400-line file limit, no `console.log`) apply here exactly as anywhere else under `prototype/src/`.

If a bulk-query workflow will clearly get reused (this is at least the second question answered this way), add a `--json` flag to `prototype/scripts/sim.ts` that dumps the full `SimSummary` instead of the printed text — future questions can then query a captured run set without re-simulating, as long as no new field is needed. Don't add this speculatively before a second question has actually shown up.

### 3. Validate — the gates are not optional

Before trusting a single number out of a changed sim, run all three from `prototype/` (see `.claude/workflow/web-project.md` → *Verification commands*):

```
npm run typecheck
npm run lint
npx vitest run src/sim
```

Extend or add a test asserting the new field/policy behaves as claimed (existing tests in `prototype/src/sim/__tests__/` are the pattern). A number produced by code that hasn't passed these is not a finding — it's a guess with a decimal point.

### 4. Run — at a sample size the question can trust

```
npm run sim -- --runs <N> --seed <S> --policy <name>
```

Pick `N` from what's being measured: a headline win rate is stable around a few hundred runs; a rare event (a specific buff's refusal rate in hand 1 across many possible pile compositions) may need more. Vary `--seed` (or run twice with different base seeds) when a finding looks surprising, to rule out one unlucky batch. Run every policy the question compares (e.g. `baseline` vs. the new no-heal policy) at the same `--runs`/`--seed` so the comparison is apples-to-apples.

### 5. Replay — for a "why" question about one run, not a count

When the question is about a single failing seed rather than a distribution (see step 4's output for a candidate seed), a scripted policy's fixed heuristic can't tell you whether a *thinking* player could have done better — only real judgement can. Build (or reuse, if one already exists) a small snapshot/replay script outside `prototype/src/` (see `references/sim-architecture.md` → "Interactive replay") that, from a fixed seed and a replayable list of decisions made so far, prints the actual legal moves at the next decision point (via the engine's own `legalMoves`/`offeredBuffs`/refusal predicates — never a guessed list) and stops. Play it out turn by turn, reasoning about each move, to find out whether the failure was forced or a bad line. This mode is for a handful of hands on a specific seed, never for bulk answers — each decision costs a full turn, so it does not scale the way step 4 does.

### 6. Report — plain language first

Lead with the plain finding and the round numbers a developer would want to hear first; keep the instrumentation detail (which field, which file) available if asked, not in the headline. State the sample size and policy alongside every number — "62% win rate" is meaningless without "baseline policy, 500 runs, seed 1". When a finding implies a tuning change, name the observation and stop there: which value to change, and by how much, is the developer's call, not this skill's.

## Data lifecycle

- **Instrumentation fields are permanent.** Once a field exists on `HandReport`/`RunReport`, leave it — the next question likely reuses it, and removing one breaks whatever last relied on it.
- Every `npm run …` command in this skill runs from `prototype/`, not the repository root — `.claude/workflow/web-project.md` states the exact form once.
- **JSON dumps of `SimSummary` are disposable per-question artifacts** unless the developer says otherwise. Don't build a persistent corpus of past runs without being asked; a fresh run at the current code is more trustworthy than an old one anyway, and code changes fast enough here that a stale dump is a trap.

## Calibration

Don't add a new `HandReport` field for something one query script can already compute by combining existing fields. Don't add a new `SimPolicy` for a variation one flag on an existing policy could express — a proliferation of near-identical policies makes `POLICIES` itself the thing that needs maintaining. Prefer extending `baselinePolicy`'s existing knobs (its shop order, its cash-out multiplier) over forking a whole new policy when the question is really "what if this one baseline choice were different."

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index. (`save-data-versioning.md` does not apply to sim output — nothing this skill produces is written through `prototype/src/persistence/`.)

## Success Criteria

- Every reported number is backed by a run of `npm run sim` (or the interactive replay, for a single-seed "why" question) against code that has passed `npm run typecheck`, `npm run lint`, and `npx vitest run src/sim` — all run from `prototype/`.
- No existing `HandReport`/`RunReport` field was renamed, removed, or repurposed to answer a new question.
- The report states policy name, `--runs`, and `--seed` alongside every headline figure.
- A tuning or balance implication is named as an observation, not enacted as a change on this skill's own authority.
