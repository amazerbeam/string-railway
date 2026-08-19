# PR: Poison retimed to the next trick, plus Poison Guard

Plan: [`plan.md`](./plan.md) in this contract folder.

## What changed, in one paragraph

Poison stopped being a hit paid quietly at the next deal and became a hit paid at the **next trick's resolution**, folded into that trick's own damage: 4 to the Quarry, 2 to the player, and — for the player — forcing the same cash-out-and-reset any other hit forces, so a streak in progress is spent at a moment the player did not choose. Damage across the whole game was resequenced Quarry-first, so a cash-out that kills the Quarry saves the player from the hit that would have followed it. Then the shop's empty **Fight-long** shelf got its first item: a 1-coin Poison Guard, bought between fights, live for exactly the next fight, that lets the player take poison's 2 health without losing the streak — spent the first time it fires, gone when the fight ends either way.

## The D1–D8 decisions (developer, 2026-08-19)

| # | Decision | Given |
|---|---|---|
| D1 | Poison damage is paid at the resolution of the **next trick**, not the deal of the next hand. | 2026-08-19 |
| D2 | Poison damage is **4 to the Quarry, 2 to the player** — the player-side hit is halved because it also costs a streak the Quarry does not have. So 2 on a trick the player wins, 3 total on a trick they also lose. | 2026-08-19 |
| D3 | Poison damage **kills the player's streak**, behaving exactly as ordinary damage already does — the bank **cashes out** into the Quarry and both reset. Not destroyed. | 2026-08-19 |
| D4 | Pending poison **stacks** rather than the later mark replacing the earlier. | 2026-08-19 |
| D5 | A poisoned trick that is the hand's last **carries** into the next hand; if the fight or the run ends first, the pending damage is **discarded**. | 2026-08-19 |
| D6 | **Apply Damage is disabled while poison is pending.** Recorded as a constraint on the unbuilt version-4 §3 ticket — no code in this contract. | 2026-08-19 |
| D7 | Damage is applied **Quarry first, then the player, and a Quarry that dies to it means the player takes no damage** — for **all** damage, not only poison. This overturns §9's dated simultaneous-depletion ruling (2026-08-11, the player loses the tie) and retires `SIMULTANEOUS_DEPLETION_WINNER`. | 2026-08-19, reconfirmed when the consequence was put to them |
| D8 | The interaction where holding a Guard suppresses the cash-out, so the Quarry survives and the player takes damage they would otherwise have dodged, is **accepted as a real decision** rather than smoothed out. *"That's fine, this is just a play test for buying items from the shop."* | 2026-08-19 |

## Design and config changes worth calling out

- **§9's simultaneous-depletion ruling is overturned.** The 2026-08-11 decision that the player loses a mutual kill is reversed (D7). `SIMULTANEOUS_DEPLETION_WINNER` is **deleted** from `config.ts`, `index.ts`, and the two docblocks that cited it (`run.ts`, `types.ts`) — a constant with no reader is a tunable that silently does nothing, so it was removed rather than left in place. `hybrid-design.md` §9 marks the ruling **Overturned 2026-08-19** with the replacement recorded, rather than deleting the row.
- **`ENVENOM_DAMAGE` is renamed to `ENVENOM_QUARRY_DAMAGE`**, with a new `ENVENOM_PLAYER_DAMAGE` (2) added beside it. A bare shared name sitting next to a player-side figure is precisely the ambiguity that produces a wrong-side bug that type-checks — 36 hits across 9 files were updated in one task, with a grep proving no survivor.
- **`beginNextHand` and `applyPendingEnvenom` are gone.** Poison is no longer paid at a hand boundary, so both the driver's call and the encounter-side payment function were deleted. **`hasPendingEnvenom` was kept deliberately** — it is the predicate the unbuilt D6 ticket (Apply Damage disabled while poison is pending) will need, and re-deriving the same rule later would be worse than keeping an exported predicate with no caller today.

## Developer decides or observes

Carried verbatim from `tasks.md`'s File map:

- **A1's ordering** — a trick the player *wins* while poisoned banks first, then the poison cashes the larger figure. Watch whether the streak climbing and immediately dying reads as poison's doing or as a bug.
- **Whether poison is legible at all mid-hand** — pending poison is invisible on the felt, a held Guard is invisible during a fight, and the hit shows as damage plus a vanished streak with nothing naming the cause. The likeliest thing to come back from the playtest.
- **D7's difficulty change** — every mutual kill now favours the player. No compensating retune is in scope.
- **D8's oddity** — holding a Guard suppresses the cash-out, so the Quarry survives and the player takes 2 they would otherwise have dodged. Sometimes the right play is not to hold one.
- **Whether 2-and-3 damage and a 1-coin Guard feel right**, and whether "Poison Guard" and its blurb are the copy you want. (The developer's to finalise — see the note below.)

## Verification results — Phase 6 (this closing phase)

All numbers below were actually run in this phase, not reused from earlier phases' claims:

- **Purity boundary (Task 14):** `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"` — zero hits. `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "warCouncil"` — 6 hits, all inside docblock comments explaining the import direction (`hunt/run.ts`, `hunt/types.ts`), none a live import.
- **Retired-name grep (Task 15, Step 1):** `Get-ChildItem src -Recurse -Include *.ts,*.tsx -Exclude *.test.ts,*.test.tsx | Select-String -Pattern "SIMULTANEOUS_DEPLETION_WINNER|ENVENOM_DAMAGE|beginNextHand|applyPendingEnvenom"` — 2 hits, both the known/intended exceptions: `src/hunt/config.ts`'s rename rationale (citing `ENVENOM_DAMAGE` once, to explain the rename) and `src/hunt/encounter.ts`'s `resolveWinner` docblock (citing `SIMULTANEOUS_DEPLETION_WINNER` once, to explain the overturn). No genuine survivor found.
- **Shop copy figure grep (Task 15, Step 2):** `Select-String -Path src\app\run\shopLabels.ts -Pattern "\b(1|2|4) (coin|damage|health)\b"` — zero hits. Every figure in that file is interpolated from `priceOf`, `ENVENOM_QUARRY_DAMAGE`, `ENVENOM_PLAYER_DAMAGE`, or `HEAL_HEALTH_RESTORED`.
- **File sizes (Task 15, Step 3)** — measured with `(Get-Content <path>).Count`, never `Measure-Object -Line`:

  | File | Lines |
  |---|---|
  | `src/hunt/config.ts` | 370 |
  | `src/hunt/run.ts` | 278 |
  | `src/hunt/shop.ts` | 173 |
  | `src/hunt/encounter.ts` | 189 |
  | `src/warCouncil/bank.ts` | 198 |
  | `src/warCouncil/playCard.ts` | 135 |
  | `src/app/warCouncil/roundReducer.ts` | 386 |
  | `src/app/run/ShopPanel.tsx` | 224 |
  | `src/app/run/shopLabels.ts` | 116 |
  | `src/App.tsx` | 282 |

  All under the 400-line blocking budget. `roundReducer.ts` at 386 is the closest and worth a developer glance if this area grows again.

  Test files this contract created or grew (same method) — flagged at 380+ per the task's instruction even though under budget: `src/hunt/__tests__/run.test.ts` at **397 lines** is the one warning. All others are comfortably under: `poisonGuard.test.ts` 79, `config.test.ts` 238, `encounter.test.ts` 188, `envenom.test.ts` 181, `shop.test.ts` 251, `bank.test.ts` 299, `roundReducer.envenom.test.ts` 244, `roundReducer.poison.test.ts` 310, `shopLabels.test.ts` 113, `ShopPanel.test.tsx` 266, `WarCouncilRound.duelHealthBars.test.tsx` 329.

- **Static gates and scoped suite (Task 16):**
  - `npx vitest run --project node` — **`Test Files 39 passed (39)`, `Tests 647 passed (647)`**.
  - `npx vitest run --project dom` — **`Test Files 21 passed (21)`, `Tests 177 passed (177)`**.
  - `npm run typecheck` — exit 0, no output.
  - `npm run lint` — exit 0, no output.
  - `npx prettier --check` on this contract's 17 named source files — one failure, `src/app/warCouncil/roundReducer.ts`, fixed in place with `prettier --write` (formatting only, no logic change) and re-confirmed clean. Re-ran typecheck and both Vitest projects after the fix: **`Test Files 60 passed (60)`, `Tests 824 passed (824)`**.
  - `npx prettier --check` on this contract's touched test files — one failure, `src/hunt/__tests__/run.test.ts`, fixed the same way and re-confirmed clean; re-ran typecheck and that file's spec (`Test Files 1 passed (1)`, `Tests 34 passed (34)`).

## A note for future contributors

**Poison figures are per-target-side and must be read through `envenomDamageFor(target)`, never picked at a call site.** `ENVENOM_QUARRY_DAMAGE` (4) and `ENVENOM_PLAYER_DAMAGE` (2) are deliberately separate keys rather than one shared figure — a caller that has to choose the right constant by hand is a caller that can choose the wrong one.

## Delegated to QA

Per this project's pipeline, the unfiltered suite, the production build, and the in-browser functional pass are QA's, not the Implementer's, and are reported separately:

- **Task 16, Step 2 (`npm test`)** — unfiltered full suite. Expected: all files/tests pass, at least the file count measured in this phase's scoped runs (39 node + 21 dom = 60 files) plus consistency with the numbers above.
- **Task 16, Step 4 (`npm run build`)** — production build. Expected: exit 0, `dist/` written, no bundler errors.
- **Task 17 — functional check in a real browser.** QA drives the app through the `chrome-devtools` MCP per `web-project.md`'s table: the Fight-long tab shows the Poison Guard card (Run-permanent stays empty), buying it spends a coin and flips the purse cell to "Held" and disables the card with the `GuardAlreadyActive` message, the shop does not scroll with four purse cells and the Fight-long shelf open, a full Envenom-mark-win-then-resolve-one-more-trick sequence costs 2 health at the second trick rather than at the next hand, and the console stays clean throughout.

## Placeholder copy — developer's to finalise

`SHOP_GUARD_LABEL` ("Poison Guard") and its shop blurb are placeholder copy, marked as such in `shopLabels.ts` exactly as every other placeholder string there is. Finalising the name and wording is the developer's call, not this contract's.
