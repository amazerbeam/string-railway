# DLR-160 — Readability and interaction fixes from the first narrated play session

Plan: [`plan.md`](plan.md) · Layout and interaction reference: [`mockup.html`](mockup.html)

Twelve interface defects from one recorded 33-minute play session, across four surfaces. Not one of
them is a rule change — every frustration in that session was something that could not be seen,
could not be reached, or was lost to a stray click.

---

## What changed, by acceptance criterion

**AC1 — dismissing the resolution screen cannot advance into the next trick.**
Two independent defects produced the symptom, and both were removed rather than mitigated. The felt
carried an `onClick` on the whole `.wc-table` section, so any click landing in the play area while a
trick was held committed the Quarry's lead — that handler is gone, and the trick well's own button
(which already existed) is now the only way to advance. Separately, `ApplyPot` and `RollOver` in
`roundReducer.ts` both tail-called `handleCarryOn`, which laid the Quarry's card in the very dispatch
that dismissed the panel. Both now close the panel and stop. Nothing in `the-hunt.md` changed: §4
already grants the between-tricks window; the code was closing it early.
→ `WarCouncilTable.tsx`, `roundReducer.ts`, `warCouncilTable.css`

**AC2 — the skull, and which of the four outcomes it was.**
A new pure module, `resolutionOutcome.ts`, crosses two facts the engine already decided — the
mechanical axis (`winner === PlayerSide.Player`) and whether the trick carried a skull — into *clean
win* / *dodge* / *clean loss* / *ate the skull*, each with a one-line reason. Both the trick well (as
the cards land, per the red-line at the approval gate) and the resolution panel read that one module,
so a skull trick cannot be worded one way on the felt and another on the panel. The skull also shows
on the card face.
→ `resolutionOutcome.ts`, `TrickWell.tsx`, `TrickResolutionScreen.tsx`, `roundControlsProps.ts`

**AC3 — the buffs that were armed and did not fire.**
`resolutionDeadBuffs.ts` takes the armed set minus the fired set, resolved against the same candidate
union the paying beats use, and composes each row's reason from the existing `buffConditionSentence`
rather than a second table of per-family miss reasons. Rows render struck through, distinct from the
ones that paid. This is the fix for the session's false bug report: a Key-Feeder was armed, pays only
on a trick the player *loses*, the player won — so it correctly paid nothing, and nothing on screen
said so.
→ `resolutionDeadBuffs.ts`, `ResolutionBreakdown.tsx`, `commitHandlers.ts`

**AC4 — the rank tooltip no longer covers the breakdown panel.**
Both surfaces anchor to the top edge of the same hovered card, so they collided by construction, every
time. `CardBuffBreakdown` now publishes its measured top edge through a small context; `CardAbilityTip`
anchors above whichever of the card and the panel is higher. No new measurement, observer, timer or
listener — it reuses the `useLayoutEffect` the anchor hook already ran.
→ `breakdownRectContext.ts`, `useBuffBreakdownAnchor.ts`, `CardBuffBreakdown.tsx`, `CardAbilityTip.tsx`, `BuffRideZone.tsx`

**AC5 — the type hierarchy inverted.**
The pot (`total × roll`) takes the large treatment and the impact animation; the trick's own
contribution drops to a subordinate size. Previously a contribution of 1 rendered roughly three times
the size of a pot of 12.
→ `warCouncilResolve.css`

**AC6 — a lethal pot is marked on the Apply control.**
`resolutionLethal.ts` composes the same two calls `applyPotAction` makes, so the Quarry's shields and
the zero floor are inherited rather than restated. The marking is a word plus a colour, never a colour
alone, and the fact is folded into the control's `aria-label`. **See the open question below.**
→ `resolutionLethal.ts`, `TrickResolutionScreen.tsx`

**AC7 — the decree (trump) is on the panel**, as a suit mark plus the suit word.
→ `TrickResolutionScreen.tsx`

**AC8 — the buff pile filters by suit.** A sibling of the tier filter, composed with it as one
`BuffGalleryFilter` value rather than two independent `useState` calls, so "silver Moons" is
expressible and the counts are always recomputed over the intersection. Two filters can now produce an
empty intersection, so there is a line saying so rather than an empty grid.
→ `buffSuitFilterModel.ts`, `BuffSuitFilter.tsx`, `BuffGallery.tsx`, `buffRunLabels.ts`

**AC9 — a look at your cards before the fight.** A new `RunPhase.PreFight` sits between leaving the
shop and the first card, showing the path map with a read-only tray of held cards. Its one control
starts the fight, so the fight now begins on your press rather than on leaving the shop.
→ `screenFor.ts`, `debugState.ts`, `RunPathScreen.tsx`, `PathScreens.tsx`, `App.tsx`

**AC10 — the slot machine states each card's tier.** On the landed reel windows and the award rows,
read off the pull's own awards by template id — never by re-deriving the match rule. **Note the
reading:** a strip symbol is a `BuffTemplate` and carries no tier at all; the tier is decided by how
the three reels matched. So the face-up strip keeps its untiered chips, because there is no tier there
to state.
→ `slotTier.ts`, `SlotMachinePanel.tsx`, `useShopSlot.ts`

**AC11 — slower, and no longer the whole viewport.** The resolution surface is now a panel over a
still-mounted felt rather than a screen that replaces it. `--wc-trick-dwell` went 800ms → 1000ms.
A side effect worth knowing: the table is no longer torn down and remounted at every trick, so the
card-motion hooks keep their identity across a resolution — strictly fewer mounts than before.
→ `warCouncilResolvePanel.css`, `WarCouncilRound.tsx`, `TrickResolutionScreen.tsx`

**AC12 — the Fox exchange can be cancelled.** The reducer action already existed and already did the
right thing; only the control was missing. The prompt's copy now names all three exits and says
plainly that *Keep the decree* still plays the Fox while cancel does not — that distinction is the
whole of this criterion.
→ `AbilityPrompt.tsx`, `warCouncilCards.css`

**File splits carried along**, because four files in this ticket's path were within sixteen lines of
the blocking 400-line budget and all grew: `ResolutionView` moved to its own module (re-exported, so
no importer changed), the panel chrome split out of `warCouncilResolve.css`, the breakdown rows into
`ResolutionBreakdown.tsx`, three path branches out of `App.tsx`, the buff-ride zone out of
`WarCouncilTable.tsx`, and one test file that crossed the budget.

---

## Decisions waiting on you

Every one of these ships as a documented placeholder. None was chosen by the pipeline.

**The panel's size and placement** — `--wc-resolve-panel-w` (`22rem`) and `--wc-resolve-panel-inset`
(`1.1rem`) in `warCouncilResolvePanel.css`. Trades the panel's legibility against how much felt stays
visible behind it.

**Three font-size bounds** in `warCouncilResolve.css` / `warCouncilResolvePanel.css` — the pot's
`clamp()`, the trick contribution's, and the outcome word's. The inversion is done; the exact sizes
are yours.

**Three remaining durations** — `--wc-flight` (380ms), `--wc-beat` (520ms), `--wc-resolve-hold`
(700ms). `--wc-trick-dwell` is settled at 1000ms from your own words at the gate; these three are not.

**The tooltip's vertical floor** — `max(6rem, …)` in `warCouncilCardTip.css`, reusing the already-shipped
horizontal clamp value rather than inventing a new number. Retune once you have seen it against a real
breakdown panel.

**The lethal marking's treatment** — currently the word "Lethal · ends the fight" plus a colour. It
reads in greyscale, which is the hard requirement; whether the wording is right is a copy call.

**The four-outcome copy** — `TRICK_OUTCOME_WORD` and `TRICK_OUTCOME_WHY` in `resolutionOutcome.ts`
ship `the-hunt.md` §7's own terms. Whether *ate the skull* reads well on a panel only playing settles.

**Whether the dead-buff rows need a cap, a scroll region, or a collapsed count** — three armed buffs
with one firing gives two struck-through rows in a panel that just got smaller. Judge at 640px of
viewport height, where an overflow is already recorded on this screen. No cap was invented.

**Whether the pre-fight stop earns its place** — it adds a screen to the run flow that did not exist.
If you would rather the review were reachable *from* the fight without a new screen, that is a
different and smaller change.

---

## Open question — the lethal marking in an already-lost fight

Raised in review and deliberately left for you, because the answer is a design reading.

`potIsLethal` returns `true` for any encounter that is already resolved — including one resolved in
the **Quarry's** favour, i.e. you are already dead. That state is reachable: Timebomb damage can take
you to zero on a trick you physically won, which also banks a pot. The Apply control then reads
"Lethal · ends the fight" as though your pot were about to kill the Quarry, when the fight has in fact
already ended with you dead. Pressing Apply is safe — `applyPotAction` already no-ops on a resolved
encounter — so this is misleading copy, not a crash.

Two ways out, and the choice is yours: branch on which side the encounter resolved in favour of, so
the marking only claims lethality when it is your blow that lands; or suppress the Apply / Roll-over
choice entirely once the encounter is resolved against you, folding it into the existing no-choice
branch. The second is the larger change and arguably the more honest screen.

---

## What only playing can settle

**The one to try first, because the whole plan rests on it.** Play a trick where the Quarry leads,
dismiss the resolution panel with Apply or Roll over, and confirm **Apply Buff is reachable before the
Quarry's card lands**. That is the AC1b reading: the between-tricks window `the-hunt.md` §4 already
grants was being closed early by the code, and no rule was moved to open it. If your intent is instead
that the Quarry's lead should land automatically and the window re-open after it, that is a rule change
and this needs revisiting.

Then, in rough order of risk:

- The resolution panel at a **short viewport (≤640px tall)** — an overflow is already recorded on this
  screen, and the dead-buff rows lengthen the panel exactly where it was made smaller.
- **Hover the Witch, Fox, Woodcutter, Swan and Monarch** with a breakdown panel open, and confirm the
  rules bubble clears the take-it / don't-take-it lines. jsdom has no layout engine, so the tests pin
  the contract, not the geometry.
- Whether the **pot now reads as the larger figure** and the trick's contribution as subordinate.
- Whether the **1000ms dwell** is long enough to read the outcome line before the panel appears.
- The **suit chips** beside the tier chips, and the empty-intersection line.
- The **tier badges** on landed reels, and that nothing is badged mid-spin.
- The **pre-fight tray**, and the **Fox prompt's** three exits reading distinctly.

Nothing on this screen has ever been seen running — DLR-156 shipped it with its browser pass skipped —
so treat layout surprises as expected rather than as regressions.

---

## Verification

All gates green at the close of the run:

- `npm test` — **2517 passed, 0 failed** (212 files)
- `npx vitest run --project dom` — 490 passed (52 files) · `src/app` — 1112 passed (109 files)
- `npm run typecheck` — exit 0
- `npm run lint` — exit 0, 0 warnings
- `npm run build` — exit 0, `dist/assets/index-DrvAPiDq.js` 385.80 kB
- File-size sweep — no file this contract touched is over 400 lines
- Greps clean: no `wc-is-waiting` or "Tap the table to carry on" in live code; no `100vh`/`100vw` in
  `src/app/warCouncil/*.css`; no React or DOM import inside the `src/warCouncil/` + `src/hunt/` pure core

One residual: `npx prettier --check` flags `src/app/warCouncil/resolutionBeats.ts`, and the offending
line is DLR-161's uncommitted content in a file this contract also owns — a one-line rewrap belonging
to whichever contract picks it up.

A crash found in review and fixed: `potIsLethal` called `applyDamage` on an encounter the trick's own
damage had already resolved, and `applyDamage` throws deliberately on that input — 16 sim tests
crashed through the production `commit()` path. Guarded, with the boundary case now pinned by a test.

---

## One convention for future contributors

**`resolutionOutcome.ts` is the single source of the four-outcome vocabulary.** Both the trick well and
the resolution panel read it, and neither surface may word an outcome itself. The bug this ticket
exists to fix was one surface saying only who physically took the trick — which is exactly the half
that misleads on a skull trick.
