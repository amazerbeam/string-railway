# DLR-101 — Pending poison on the felt

Plan: [`plan.md`](./plan.md) in this folder. Layout reference: [`mockup.html`](./mockup.html).

## What changed

Playing a poisoned card booked a delayed hit that landed at the next trick's resolution, and **nothing on the felt showed it existed**. In the reported session, 4 damage was correctly booked against the Quarry, the bar still read 14/14, and the player concluded the mechanic was broken.

The engine was already right — `encounter.pendingEnvenom` carried everything the readout needed. This is purely the missing readout, and **no engine behaviour changed**.

- **The health-bar projection now subtracts booked poison as well as the streak.** `projectedFromStreak` became `projectedDepletion(current, bank, multiplier, pendingPoison)`, subtracting each side's booked poison from both bars and flooring both at zero to uphold `duelHealthBars`'s documented `projected <= current` precondition.
- **A fifth heart state, `doomed`.** Committed poison gets its own state rather than reusing `atRisk` — see the decision note below. It renders green, static, and sits innermost, between the conditional at-risk band and the already-broken hearts.
- **`duelHealthBars`'s fourth argument became a `HealthBarOverlays` options object** (`{ breaking?, doomed? }`). Both overlays are `Readonly<Record<DuelSide, Damage>>`, so as positional arguments they were silently transposable and would have produced plausible-but-wrong pictures. This follows `bank.ts`'s `TrickFacts` precedent. **This is a new convention for the module** — a future overlay goes in the object, not a fifth positional parameter.
- **`healthBarValueText` now names the two figures separately** — `14 of 14. 3 at risk. 4 poisoned.` — because a meter that calls a booked hit "at risk" is less true than its own picture.
- **The trick reveal names the hit and its target** when the trick booked one, reading the amount from `envenomDamageFor` (promoted to a `src/hunt` export) rather than choosing between the two constants at the call site.
- **New pure module `roundBars.ts`.** Forced, not chosen: `WarCouncilRound.tsx` was at 399 of its hard 400-line budget. It is now 380, and the bar assembly is directly testable without a renderer for the first time.

## The ticket's open design question — decided without you

The ticket asked whether pending poison should reuse the existing `atRisk` heart state or get its own, and said "Decide at the mockup gate". **This sprint run skips that gate, so the plan's default was taken: a distinct `doomed` state.**

The reasoning: on the Quarry's bar the streak's conditional hearts and the committed poison hearts can be on screen simultaneously and stack. One shared figure makes them indistinguishable exactly when the distinction matters, and makes the spoken text say something false about damage nothing can stop.

**Reverting is deliberately cheap** if you disagree — delete the `HeartState.Doomed` member, delete the `[data-state='doomed']` block, and drop `doomedCount` from the derivation. `pending` was kept as the *total* band specifically so a revert touches neither the geometry nor `lethal`.

## What you need to decide or look at

- **`--wc-hp-doomed-opacity: 0.78` is a number nobody chose.** It is an explicit placeholder, picked only to sit clearly above `--wc-hp-atrisk-opacity: 0.55` and below solid. It is a tuning value and it is yours.
- **Does green-on-green read?** `doomed` reuses the existing `--wc-poison: #8fb04e` against `--wc-felt: #16241f`. Aliased as `--wc-hp-doomed-fill` so you can retune the heart without disturbing the card mark.
- **Do five heart states still separate at a glance** on the Quarry's 14–18 glyph row, with a live streak and a booked hit on screen at once? This is the real risk of the decision above.
- **All new copy is placeholder** — `Poison set — they take 4 at the next trick.` / `Poison set — you take 2 at the next trick.` / ` N poisoned.` — as every other string in `labels.ts` and `TrickWell.tsx` is.
- **The reveal clause is transient.** It lives on the held resolved trick and disappears when you tap to carry on. The bar readout is the durable signal, but a player tapping through fast may never see the clause. Only judgeable by playing.
- **A held Poison Guard is still invisible** — scoped out per the ticket. But the bar now shows poison booked against the player that a held Guard may cancel, so the two surfaces are related on screen in a way they were not before. Possibly a follow-up ticket.

## Verification

See the Implementation Summary in the run report for the final gate numbers (typecheck, lint, unfiltered suite, build) and the reviewers' verdicts.

`roundReducer.poison.test.ts` must remain 8/8 — it pins the exact engine behaviour this contract deliberately did not touch.

## Note for future contributors

Two conventions introduced here:

1. **`HealthBarOverlays` is how a same-typed damage record reaches `duelHealthBars`.** Do not add a fifth positional parameter; add a named field to the object.
2. **`HeartState`'s five values are string-bound.** The `as const` map in `duelHealthBars.ts` and the attribute selectors in `warCouncilHealthBars.css` remain the only two places any of them may be written — a rename type-checks cleanly and renders an unstyled heart.

And one environment trap worth knowing: on this Windows case-insensitive filesystem, `tsc` silently excludes `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` from compilation because it collides with the sibling `duelHealthBars.test.ts`. **A clean `npm run typecheck` does not prove that file compiles** — only a scoped `npx vitest run` on its exact path does.
