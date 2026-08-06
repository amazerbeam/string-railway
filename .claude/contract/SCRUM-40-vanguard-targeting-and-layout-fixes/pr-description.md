# PR: Vanguard targeting-and-layout fixes (SCRUM-40, SCRUM-41, SCRUM-42)

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

- **SCRUM-40** — Expand and Overwrite legality now key off any cell a side owns (`ownedCells`,
  `src/vanguard/network.ts`), not just the base-connected chain (`connectedNetwork`, still used
  unchanged by the Breach condition). Each action keeps its own existing range (Expand: 2,
  Overwrite: adjacency/1) — only the reference set changed. `chooseCpuClashAction`'s candidate
  generation and tiering key off the same broadened set.
- **SCRUM-41** — A Clash action is now one tap: the action kind is inferred from the tapped cell's
  own occupancy (`inferActionKind`, `src/app/vanguard/legalTargets.ts`) and submitted directly —
  no "arm an action, then tap a target" step. Every currently-legal target across all three action
  kinds is highlighted continuously (`allLegalTargets`). `ActionPalette` is reduced to a read-only
  legend (cost/range reference only; no buttons, no `onSelect`/`selected` props).
- **SCRUM-42** — Both bases now sit at the horizontal center of their own edge row
  (`{q: floor(BOARD_SIZE/2), r: 0}` / `{..., r: BOARD_SIZE-1}`) instead of opposite corners. Each
  side's starting cluster is derived geometry — the base cell plus every on-board hex touching it
  — rather than a separately-tunable BFS size. `STARTING_CLUSTER_SIZE` is removed from
  configuration entirely; nothing replaces it.

## Decisions for the developer

- **Whether the read-only `ActionPalette` legend should stay or be removed.** SCRUM-41's brief says
  "no palette-first step," which this plan read as "no arming step," not "no palette at all" — the
  cost/range reference (`ACTION_DESCRIPTION`) has no other home on screen today. An alternative
  (delete it, let the board's own highlighting carry everything) was considered and set aside.
  Worth a look now that it's running.
- **Whether the single shared brass-ring highlight reads clearly with several cells lit at once.**
  All three action kinds' legal targets are now highlighted simultaneously with the one existing
  `data-selectable` ring — no colour-per-kind was added. The cell's own `data-owner`/`data-kind`
  colouring (empty/dark, player/purple, cpu/green) is the only other visual cue distinguishing what
  a highlighted cell means.
- **Whether the `Defense → Expand → CellIsDefense` rejection copy feels right.** Tapping a
  permanent-defense cell infers `Expand` (since the function is total and has no other candidate
  to offer), and the engine's own `CellIsDefense` rejection is what the player sees — there's no
  alternative reason code for "not a legal target" today.

## Verification results

- **Typecheck:** PASS — `npm run typecheck` exits 0, whole project.
- **Lint:** PASS — `npm run lint` exits 0, no warnings, whole project.
- **Vitest (scoped to this contract's touched trees):** PASS — `npx vitest run src/vanguard/__tests__ src/app/vanguard/__tests__` → **19 test files, 153 tests passed**, 0 failed.
- **Full unfiltered suite (`npm test`) and production build (`npm run build`):** not run in this
  fix pass — per this pipeline's division of labor, the Implementer runs only scoped verification;
  the unfiltered suite and the build are QA's to run once, at the end.

## For future contributors

Expand and Overwrite's legality reference set is `ownedCells` (every cell the side currently owns,
chain-connected or not) — **not** `connectedNetwork`. Only the Breach condition (`hasReachedBreach`
in `breach.ts`) still requires the connected chain; a gapped, disconnected owned cell extends
Expand/Overwrite's reach but does not by itself count toward a Breach.
