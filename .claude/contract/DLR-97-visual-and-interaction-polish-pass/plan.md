# Plan: Visual and interaction polish pass

Plan folder: `.claude/contract/DLR-97-visual-and-interaction-polish-pass/`
Execution status: see `tasks.md` in this folder.

---

## Part 1 — Alignment

### Task reference

Jira DLR-97, "Visual and interaction polish pass." Acceptance criteria, verbatim:

1. Every new interactive surface from the build tickets (DLR-89 through DLR-95) gets a deliberate pass on spacing, colour (against this project's existing palette, not a new one), interactive states (`:hover`/`:focus-visible`/`:active`, matching `ShopPanel`'s existing `@media (hover: hover)` guard), and motion where `game-ux` calls for it.
2. The disabled game-permanent tab's "Coming Soon" treatment reads as intentional rather than broken.
3. Nothing here changes behaviour, refusal logic, or acceptance criteria already verified by the build and integration tickets — this is a CSS/copy/motion pass, not a rules pass.
4. `game-ux`'s full-viewport-layout guidance and interaction-cost guidance are followed for any surface this pass touches.

Blocked by DLR-96 (integration pass), which carries `Status: COMPLETE` in its own `tasks.md` as of this planning session (2026-08-21), per commit `0605368` ("DLR-95 quick-kill payout, DLR-96 integration pass").

**Follow-up scope, added 2026-08-21 in the same planning session, before `/fb-apply` ran.** The developer played the app and gave direct feedback, triaged through `game-ux` (interaction/legibility) and `game-designer` (pacing/design) per each skill's own feedback method. Four of the seven notes turned out to be UX-legibility problems on already-correct mechanics and are folded into this plan below; the game-designer-mode notes (three screens read as "boring") could not be triaged to a concrete fix without the developer naming which of pacing, reward, or presentation is the actual complaint per screen, so they are recorded as an explicit open question rather than built. **This expands the plan past DLR-97's own Jira acceptance criteria**, which name only the five build tickets' surfaces (tabs, poison-marking, flask, Apply Damage) — `AbilityPrompt.tsx`, `DecreePile.tsx`, `TrickWell.tsx`, and the Cheat rail predate DLR-89. Flagged in Risks: the Jira ticket description has not been updated to match, and doing so needs the developer's confirmation before it happens.

### Restated goal

DLR-89 through DLR-95 each shipped one piece of the run economy — the four-category shop tabs, the Envenom/poison-marking interaction, the flask control, and the Apply Damage plate — at a functional default, with every touched CSS file's own header comment explicitly marking its spacing, colour, and motion values as a placeholder the developer owns. This ticket does not change what any of these surfaces do. It gives each one a deliberate visual and interaction pass: real hover/focus/active states where a surface is missing one, motion on state changes that currently snap with no transition, and treating the refused "game-permanent" tab as a considered dead-end rather than an oversight — all read against the palette and tokens `warCouncil.css`'s `:root` already establishes, never a new one.

### In scope

- `ShopCategoryTabs.tsx` / `shop.css` `.shop-tab*` — the four-category tablist, including the refused tab's "Coming Soon" treatment (AC2) and its `.shop-tabs-reason` line.
- The poison-marking interaction: `EnvenomCharge.tsx` / `warCouncilEnvenom.css` (the felt-rail plate — held/poised/armed) and the on-card Envenom mark in `PlayingCard.tsx` / `warCouncilCards.css`'s `.wc-venom-mark`.
- The flask control: `shopFlask.css`'s `.shop-list-item.is-flask` row, `.shop-flask-icon`, `.shop-flask-tag`, `.shop-flask-free`, `.shop-flask-charges` (`FlaskMark.tsx` itself is glyph geometry, not interaction — touched only if the glyph's stroke weight needs to match the polished frame).
- The Apply Damage button: `ApplyDamagePlate.tsx` / `warCouncilApplyDamage.css`'s `.wc-apply-plate` (poised state, refusal sentence).
- Cross-surface consistency: making sure the three felt-rail plates (Cheat slot, Envenom plate, Apply Damage plate) and the two shop-list treatments (priced item, flask row) read as one family of controls, since `warCouncilEnvenom.css` and `warCouncilApplyDamage.css` already say they mirror each other and `warCouncilCheats.css` deliberately.
- Any named motion-duration or easing value this pass introduces goes into `warCouncil.css`'s `:root`, alongside the existing `--wc-hp-break-ms` / `--wc-hp-flash-ms` precedent — never an inline magic number repeated across files.
- **(Follow-up, 2026-08-21) The ability prompt's entrance.** `AbilityPrompt.tsx` / `warCouncilCards.css`'s `.wc-prompt` — currently a bare conditional render with no transition, which the developer's own playtest note names as jarring ("every move is too static ... it's jarring when the card moves up beside the selectable cards"). `game-ux` heuristic: signs and feedback — the system acted (a rank ability triggered) and gave no visual signal that a new state had arrived.
- **(Follow-up) The decree swap's visibility.** `DecreePile.tsx` / `warCouncilTable.css`'s `.wc-pile-cards .wc-card` — today the Fox-exchange decree change is an instant prop swap with zero transition; the developer's note ("it happens all in one motion, hard to tell anything happened") is a literal description of the code, confirmed by reading it. Same heuristic as above, and the fix is keyed to the same root cause: this component has no motion mechanism at all yet.
- **(Follow-up) The skull/poison damage causality signal.** `TrickWell.tsx` — the resolution sentence currently says only "You/They take the trick," never naming the damage figure, even though `resolvedTrick.resolution.cashOut` and `.damageToPlayer` are already computed and passed in. `game-ux` heuristic: recognition over recall, compounded by the health-bar break animation (`wc-hp-break`, `warCouncilHealthBars.css`) firing in a different screen zone (the status band) than the resolved trick the player is looking at (the felt centre) — the two events read as unrelated.
- **(Follow-up) The felt-rail plates' resemblance to a playing card.** `warCouncilCheats.css`'s `.wc-cheat-slot`, `warCouncilEnvenom.css`'s `.wc-envenom-plate`, `warCouncilApplyDamage.css`'s `.wc-apply-plate` — all three explicitly declare `aspect-ratio: 2 / 3`, the same proportion as `.wc-card` itself, and all three sit in the felt-left rail directly beside the decree pile's real card. `game-ux` heuristic: consistency — two things that are not interchangeable (a control you press vs. a card you play) currently share a silhouette. Reshaping away from the 2:3 card ratio is the more decisive fix over a material-only change, since these plates' colours already differ from `.wc-card`'s parchment gradient (they use the dark brass gradient already) — the confusion is in shape, not colour.

### Explicitly out of scope

- Any new mechanic, rule, refusal condition, or acceptance criterion already verified by DLR-89 through DLR-96 (AC3). No task in this plan touches `roundReducer.ts`, `bank.ts`, `run.ts`, `shop.ts`, `flask.ts`, or `voluntaryCashOut.ts` — the follow-up tasks below read existing `TrickResolution` fields, they do not add or change one.
- Retuning a price, a percentage, or a tier multiplier — a design/tuning decision, not a polish one, per the ticket's own Scope Boundaries.
- The Poison Guard mechanic's own indicator: confirmed by grep (`poisonGuardHeld` — 19 files) that this flag drives reducer logic only and has no dedicated rendered badge anywhere in the felt UI today (no hit in `roundHint.ts`, `RoundStatusBand.tsx`, or `QuarryDossier.tsx`). There is nothing visual to polish for it; see Assumptions.
- The duel health bars' own animation (`DuelHealthBars.tsx` / `warCouncilHealthBars.css`) — already correctly built (the `wc-hp-break` keyframe) and untouched; this plan only adds a second, synchronised signal in the felt (see In scope), it does not change the health bar itself.
- Any surface reachable only through DLR-96's integration composition (bank math, run-state carryover) — that ticket's own scope, already closed.
- **(Follow-up) Whether the mine/skull's identity should telegraph before the player commits to a trick.** The developer's note "it's not clear when I'm playing into a skull card" has two different causes with opposite fixes: either the reveal-on-flip moment doesn't register (a UX pacing gap, closed by the same fix as the damage-causality finding above), or the hidden-until-played design itself is the complaint (a request to change what `IntentTelegraph.tsx`'s own docblock says is deliberately hidden — "renders suit and stance only — never the card"). This plan does not guess which; see Risks. No task changes what `IntentTelegraph` reveals.
- **(Follow-up) The three "boring" screens** — the home/start screen and run map (`RunPathScreen.tsx`), the win/lose verdict (`RunOutcomePanel.tsx`), and the between-hands tally (`RoundOverPanel.tsx`). Read via `game-designer`'s Feedback method: each screen's flatness could be a pacing problem (nothing happens for a beat where something should), a reward problem (winning/losing doesn't feel earned), or a presentation problem (the facts are all there but arranged like a spreadsheet) — and each diagnosis wants a different fix. The developer has not yet said which applies to which screen, and `game-designer`'s own rule is that a tuning/feel diagnosis is the developer's call, not something this skill picks and presents as a finding. No task builds against any of the three screens; this is recorded so the follow-up is not lost, not to imply it is scheduled.
- The Cheat rail's own selection logic and `CheatSlots.tsx`'s component code — only its CSS frame (`warCouncilCheats.css`) is touched, for the shape fix, matching the other two rail plates' own CSS-only scope.

### Pattern Reference

- `ShopPanel.test.tsx` asserts the flask is grouped "apart from the priced items" at the accessibility-tree level — any restyle of `.is-flask` must keep that grouping intact.
- `shop.css`, `shopItems.css`, `shopFlask.css`, `warCouncilEnvenom.css`, `warCouncilApplyDamage.css` — every one of these files' own header comment states its values are placeholders the developer owns; this ticket is where that placeholder status ends.
- `warCouncilCheats.css` — the Cheat rail plate is the established sibling both `warCouncilEnvenom.css` and `warCouncilApplyDamage.css` say they mirror; use it as the reference for the felt-rail-plate family's shared frame (`.wc-*-plate` sizing, poised/armed lift, corner-tick signal).
- `warCouncil.css`'s `:root` — the one token source for colour and, per the existing `--wc-hp-*-ms` pair, motion duration. No new palette.
- `game-ux` SKILL.md → "State reads without motion or colour alone" and "Never hide anything a decision needs behind hover" — both already followed by every surface in scope (dashed/solid form distinctions, refusal text rendered on the face of the control) and must stay followed as this pass adds motion.
- **(Follow-up)** `game-ux` SKILL.md's `references/feedback-to-redesign.md` — the classification method (heuristic, zone, frequency, two-options-that-differ-in-kind) used to triage the developer's playtest notes into the four follow-up items above; the "signs and feedback" and "consistency" heuristics specifically, per the Restated goal's follow-up note.
- **(Follow-up)** `game-designer` SKILL.md, Mode C (Feedback) — used to separate the three "boring"-screen notes' observation from the developer's implied diagnosis, and to determine that none of them can be costed without first knowing whether the complaint is pacing, reward, or presentation.
- `roundUiState.ts`'s `ResolvedTrick`/`TrickResolution` shape (`src/warCouncil/bank.ts:27-42`) — the existing `cashOut`/`damageToPlayer` fields the damage-causality task reads; no field here is added or renamed.

### Constraints flagged on the brief

- "Nothing here changes behaviour, refusal logic, or acceptance criteria already verified" (AC3) — every task in this plan is CSS-only, plus the one copy string named in AC2, plus at most a class-name/prop passthrough if a new state needs a hook the component doesn't yet expose (none identified below).
- The brief's own "Dependencies & Risks" names this as "pause-condition-adjacent" and expects several "which of these looks better" moments — visual judgement is explicitly the developer's, per `CLAUDE.md` → Developer-owned work. This plan cannot resolve those itself; see Risks and judgement calls.
- "Design Assets: N/A ... flag whether a mockup pass precedes it" — addressed directly below: no mockup is planned (see the mockup-skip note ahead of the approval gate).

### Assumptions made

- **"Poison/guard indicators" in scope means the Envenom rail plate and the on-card venom mark, not a separate Poison Guard badge** — confirmed by grep that `poisonGuardHeld` has no rendered surface anywhere in `src/app`. Flagged as a scope-narrowing the developer should red-line if a Poison Guard indicator was expected to exist and this audit missed it.
- **No mockup precedes this ticket.** Step 3.5's mockup step exists to validate a *new* layout or interaction before real code is written. Every surface here already renders and behaves correctly in the shipped app; a static HTML mockup of controls that already exist and are wired up would duplicate the real thing rather than de-risk it, and this project's own convention (`CLAUDE.md`'s "ship rough, then tune by feel") is to tune the *running* app by eye, not a stand-in. The ticket's own "flag whether a mockup pass precedes it" is answered here: no. The developer should red-line this if they'd rather see options mocked up before `/fb-apply` touches real files.
- **New motion-duration tokens are named constants in `warCouncil.css`'s `:root`, not inline magic numbers**, matching the `--wc-hp-break-ms` / `--wc-hp-flash-ms` precedent already in that file — chosen because it is the one place motion timing is already named rather than inlined, and because `shop.css`'s cascade (mounted after `warCouncil.css` loads once any war-council screen has been visited) already reads other `--wc-*` tokens from the same `:root` without redeclaring them.
- **`FlaskMark.tsx` itself is not a task** unless a polished frame changes the glyph's stroke weight — its own docblock already states the shape is "the developer's to judge at final rendered size," so this plan defers any `stroke-width` change to the CSS task that wraps it (`.shop-flask-icon svg`), not a separate component edit.
- **Concrete CSS values proposed in tasks.md are a considered first pass, not a final answer** — per this project's "ship rough, then tune by feel" convention and the brief's own expectation of developer judgement calls, the Implementer commits to specific numbers (no `TBD`), and the developer tunes by eye afterward via `npm run dev`, exactly as the pause condition in `CLAUDE.md` → Developer-owned work describes. This is not the same as inventing a *tuning value nobody can choose* (like a price) — it is building the polish as specified, per this project's stated convention, and then playing it.
- **(Follow-up) The ability-prompt entrance and the decree swap both ship as CSS-only mount-triggered animations, not a new transient-banner UI state.** A "the decree just changed because of X" status sentence would need new state (a timestamp or a timeout to know when to stop showing it), which is a feature, not a polish pass, and is explicitly what DLR-97's own AC3 forbids. The animation-only fix is chosen instead: `AbilityPrompt`'s `.wc-prompt` already only exists while the choice is being made, so a mount-triggered `@keyframes` needs no new state; `DecreePile`'s card swap gets the same treatment via a `key` prop on the rendered `PlayingCard` (forcing React to remount it on a genuine card change, which is a presentational key, not new state), so its own `@keyframes` replays on every swap.
- **(Follow-up) The damage-causality fix is copy-only, reading data the reducer already produces.** `resolvedTrick.resolution.cashOut` and `.damageToPlayer` are already computed by `bank.ts` and threaded onto `ResolvedTrick` before this plan touches anything — confirmed by reading `roundUiState.ts`. Naming the figure in `TrickWell.tsx`'s resolution sentence is a prop-read, not a new derivation.
- **(Follow-up) The felt-rail plates reshape away from the 2:3 card aspect ratio, rather than keeping the shape and only changing the material.** Chosen over the cheaper material-only alternative because the three plates' colours already differ from `.wc-card` (a dark brass gradient vs. the card's parchment gradient) — so colour is not what's causing the resemblance, shape is, and only a shape change closes the actual note. This is flagged in Risks as the more expensive, more decisive option, in case the developer would rather take the cheaper, weaker fix first and see if it's enough.
- **(Follow-up) The two open items — mine-reveal telegraphing and the three "boring" screens — are recorded but not built.** Building against either would mean picking a design/feel reading on this plan's own authority, which both `game-ux` and `game-designer` explicitly forbid. They are listed in Risks as direct questions for the developer.

### Config and persisted-shape audit

Skipped — no configuration key, persisted field, storage key, or exported constant map changes. This pass adds CSS-only rules (plus, where a new custom-property token is introduced, a `:root` addition in `warCouncil.css` under new names with zero existing hits) and at most one copy-string edit in `src/app/run/shopLabels.ts` for AC2 — a string literal, not a config key with readers to keep in sync. `data-testid`/`aria-*`/CSS class names already in use are not renamed by any task below; grep confirmed zero renames are planned.

---

## Part 2 — Technical design

### Approach

This is a CSS- and copy-only pass over five already-correct, already-tested surfaces, so the technical design is which concrete values to add and where, not a new data flow. Every surface in scope already has a working, accessible interaction model (roving tabindex on the tabs, `aria-disabled` on the refused tab, `:disabled` plus a refusal sentence on the Apply Damage plate, a grouped flask row) — none of that changes. What each surface currently lacks, per its own header comment, is: a real `:hover`/`:active` differentiation beyond the one or two states already wired (several controls jump straight from rest to selected/armed with no transition), and, for the refused shop tab specifically, a treatment that reads as "not yet" rather than "broken."

The work is organised per CSS file rather than per component, because every file in scope is already scoped to exactly one surface (`warCouncilEnvenom.css` to the Envenom plate, `warCouncilApplyDamage.css` to the Apply Damage plate, `shopFlask.css` to the flask row) and each carries its own docblock stating "every value here is a placeholder" — the task boundary that already exists in the codebase is the right task boundary for this plan. Two cross-cutting decisions apply to all of them:

1. **Motion.** `.wc-envenom-plate` and `.wc-apply-plate` already transition `transform`/`box-shadow` at 140ms; `.wc-card` transitions the same pair at 0.13s; `.shop-tab` and `.shop-list-item` currently have **no** transition at all — a click or a state change on either snaps instantly. This pass adds a matching transition to both, using a new named duration token (`--wc-ui-transition-ms`, alongside the existing `--wc-hp-break-ms` pattern) so the shop's snap-free motion matches the felt's, rather than inventing a third unrelated duration. `prefers-reduced-motion: reduce` is honoured everywhere a transition is added, following `.wc-apply-plate`'s and `.wc-card`'s existing guard.
2. **Colour stays inside the existing palette.** Every proposed value below reads an existing `--wc-*` custom property (`--wc-brass`, `--wc-parchment`, `--wc-alarm`, `--wc-chalk-dim`, `--wc-poison`) — AC1 explicitly forbids a new palette, and the existing tokens already cover every semantic need this pass has (a considered hue, a refusal hue, a dim/inactive hue).

The refused "game-permanent" tab (AC2) is the one place this pass adds a genuinely new visual treatment rather than refining an existing one: today it is dashed-border-plus-dim-text, identical in form to a disabled shop item — correct per `game-ux`'s no-colour-alone rule, but visually indistinguishable from "this failed" rather than "this is coming." The fix stays inside the same dashed-border language (so the refusal signal already tested by `ShopCategoryTabs.test.tsx` and `ShopPanel.test.tsx` is untouched) and adds a small locked-state glyph plus, per AC2, a copy pass on `SHOP_CATEGORY_COMING_SOON` in `shopLabels.ts` so the sentence itself reads as an intentional roadmap note rather than a generic refusal reason.

No component's props, state, reducer wiring, or accessible name computation changes. `PlayingCard.tsx`'s `envenomed` prop, `ApplyDamagePlate.tsx`'s `poised`/`refusal` props, and `EnvenomCharge.tsx`'s `stage` prop are all read exactly as they are today — every task is scoped to the `.css` file(s) that render off those existing states, plus the one labelled copy string.

**(Follow-up) The four added surfaces follow the same discipline, extended slightly to cover motion-on-mount and one new `key` prop.** The ability-prompt entrance and the decree swap both need a signal that "this just appeared/changed" with no new UI state, so both use a CSS `@keyframes` that plays automatically on mount — `AbilityPrompt`'s `.wc-prompt` already only exists while a choice is being made, so its entrance animates for free; `DecreePile`'s `PlayingCard` gets a `key={cardKey(decree)}` prop so React remounts it (and therefore replays its own entrance keyframe) exactly when the card actually changes, which is a presentational hint to the reconciler, not new state. The damage-causality fix reads two fields (`cashOut`, `damageToPlayer`) `bank.ts` already computes onto `ResolvedTrick.resolution` and threads them into `TrickWell.tsx`'s existing sentence — no new derivation. The felt-rail reshape is CSS-only across the three plates' existing frame rules. None of the four touches `roundReducer.ts` or any file DLR-96 already closed out.

### Skills to invoke during execution

- `react-frontend` — governs every CSS edit's `:hover`/`:focus-visible`/`:active` shape, the `@media (hover: hover)` guard, the ≥44×44px hit-area floor (already met by every control in scope — no task shrinks a target), and the 400-line budget on every file this pass grows (`shop.css` is at 240 lines, `shopFlask.css` at 90, `warCouncilEnvenom.css` at 98, `warCouncilApplyDamage.css` at 109, `warCouncilCards.css` at 329, `warCouncil.css` at 258, `warCouncilCheats.css` at 119, `warCouncilTable.css` — all with headroom).
- `game-ux` — governs the "state reads without motion or colour alone" rule this pass must not weaken while adding motion, the interaction-cost/full-viewport guidance AC4 names explicitly, and (follow-up) the heuristic vocabulary and feedback-to-redesign method behind the four new follow-up tasks — invoke it again during `/fb-apply` so the Implementer builds against the same heuristic names, not a paraphrase.
- `game-designer` — (follow-up) not implementation guidance for any task here, since none of the follow-up tasks touch a rule or a tunable — invoked so the Implementer and any reviewer stay inside its "never pick a tuning/feel value" boundary on the two open items, rather than one of them quietly resolving the mine-telegraph or boring-screen questions mid-`/fb-apply`.
- `.claude/rules/` — scanned; the folder is empty, no rule file applies.
- `.claude/workflow/web-project.md` — always listed per this project's convention; owns the verification commands every task below uses.
- No developer override on the original scope — the confirmed list matches the proposed list from Step 1.5c. `game-designer` is added for the follow-up scope only, per the developer's explicit instruction (2026-08-21) to invoke it at `/fb-apply` time.

### Diagram

Diagram skipped — no new data flow, state machine, or sequence of calls. Every task is a CSS rule addition/change against an already-correct render path; a flowchart of "component renders → existing prop → existing class → new CSS rule" would restate the file list above with arrows.

### Data shapes

No type, config, or contract changes. One copy-string edit:

```ts
// src/app/run/shopLabels.ts — existing export, value only, no signature change
export const SHOP_CATEGORY_COMING_SOON: string
```

One new `:root` custom-property token in `warCouncil.css`, alongside the existing `--wc-hp-break-ms` / `--wc-hp-flash-ms` pair:

```css
--wc-ui-transition-ms: 140ms; /* shared hover/active/state-change duration for tab and list-item controls that currently snap */
```

No other exported name, class name, `data-testid`, or `aria-*` id is added, renamed, or removed by this plan.

**(Follow-up) Two more `:root` tokens, same file, same reasoning** — named durations for the two new `@keyframes` this follow-up scope introduces, so neither is a magic number repeated across `warCouncilCards.css` and `warCouncilTable.css`:

```css
--wc-prompt-enter-ms: 180ms; /* AbilityPrompt's entrance fade/rise */
--wc-decree-swap-ms: 220ms;  /* DecreePile's keyed crossfade on a Fox exchange */
```

No prop, function signature, or reducer-facing type changes. The damage-causality task reads two existing `TrickResolution` fields already on `ResolvedTrick.resolution` (`src/warCouncil/bank.ts:27-42`) — `cashOut: number` and `damageToPlayer: number` — into `TrickWell.tsx`'s existing resolution `<p>`; neither field is added, renamed, or retyped.

### Runtime quality notes

- **Purity and adjudication:** every change is a CSS rule or a literal string; no component decides new logic, and no tunable value is read anywhere but a `:root` custom property or an inline `clamp()` bound, matching every existing rule in these files.
- **Effects, mount and teardown:** N/A — no effect, listener, timer, or observer is added or changed by any task in this plan. (Follow-up) The decree-swap `key` prop is a presentational remount hint, not an effect — React's own reconciliation handles the unmount/remount, and `@keyframes` plays automatically on mount with no `useEffect` needed either side.
- **Hot-path cost:** a CSS `transition` on `transform`/`box-shadow`/`background` is compositor-cheap and matches the cost profile already accepted for `.wc-card`, `.wc-envenom-plate`, and `.wc-apply-plate` — no task adds a `transition: all` or transitions a layout-affecting property (`width`, `height`, `padding`), which would force layout on every frame. (Follow-up) The two new `@keyframes` (prompt entrance, decree swap) animate `opacity`/`transform` only, same cost profile; the felt-rail reshape changes `aspect-ratio` and `border-radius`, both one-time layout costs paid once per plate per mount, not per frame.
- **Determinism and numeric safety:** N/A — no arithmetic, no divisor, nothing that can produce `NaN`. The one new numeric value (`--wc-ui-transition-ms`) is a fixed CSS duration, not a computed figure.
- **Error paths:** N/A — no new async surface, no new error state. The refused tab's existing `aria-disabled` + rendered-reason-sentence pattern (already correct per AC3/AC4) is preserved exactly; this pass only makes it read better, per AC2.

### Risks and judgement calls

- **Every concrete colour, spacing, and motion-duration figure proposed in `tasks.md` is a developer judgement call**, per `CLAUDE.md` → Developer-owned work ("Visual judgement — layout, readability, colour contrast by eye, whether copy lands right") and this ticket's own "Dependencies & Risks" naming several expected "which of these looks better" moments. The plan commits to specific values so nothing is built as a placeholder-of-a-placeholder, but the developer is expected to retune by eye after `/fb-apply` — this is the pass's whole purpose, not a defect in the plan.
- **No mockup precedes this ticket** (see Assumptions) — if the developer would rather compare options in a static mockup before real CSS is touched, that is a different execution shape than this plan assumes, and worth red-lining now rather than after `/fb-apply` has already edited five files.
- **The "Coming Soon" tab copy (AC2)** is rewritten as part of this plan (see Approach) — the developer should read the proposed sentence in `tasks.md` and correct it if the tone is wrong; copy judgement is explicitly the developer's per the same Developer-owned-work list.
- **No new dependency, no config value, and no renamed identifier** is introduced by this plan — nothing here needs a pre-`/fb-apply` decision beyond the two items above.
- **Whether the motion actually "feels right"** — the transition duration and easing chosen for the tab/list-item controls — can only be judged by running the app and clicking through it; QA can confirm the transition fires and the console stays clean, but pacing and feel are the developer's per `game-ux` → "Decisions that are not yours."
- **(Follow-up) This plan now exceeds DLR-97's own Jira acceptance criteria**, which name only the five build tickets' surfaces. The Jira ticket description has not been updated to reflect the four follow-up items — I have not edited it, since an ad-hoc content edit needs the developer's explicit confirmation per the `management-jira` skill's own rule, not the automatic per-transition authorisation `/fb-plan` and `/fb-apply` already have. Say the word and I'll update the description (or split the follow-up items into their own linked ticket) before `/fb-apply` runs — whichever keeps Jira honest about what this contract actually does.
- **(Follow-up) The felt-rail reshape (Cheat slot, Envenom plate, Apply Damage plate away from the 2:3 card ratio) is the more expensive of the two options I laid out in chat**, and I picked it because colour alone can't be the fix here (the plates already differ from `.wc-card` in colour). But it's still a shape/silhouette call, squarely a `game-ux` "decision that is not mine" — the developer should look at the built result and say whether the reshape reads right, or whether the cheaper, weaker material-only alternative (same 2:3 frame, a distinctly non-parchment gradient) would have been enough.
- **(Follow-up) Two items are genuinely unresolved and nothing in tasks.md builds against them:**
  1. Whether the mine/skull should telegraph before the player commits to a trick, or whether the existing hidden-until-flip design is correct and only the moment of the flip needs to register better (which this plan's damage-causality task already addresses). These are opposite fixes and only the developer can say which was meant.
  2. Which of pacing, reward, or presentation is behind each of the three "boring" screens (home/map, win/lose, between-hands tally) — `game-designer`'s Feedback method can't cost a fix without that answer, and picking one on this plan's own authority would be exactly the kind of silent feel-judgement both skills forbid.
  Both are recorded here so they aren't lost, and both are open questions to answer before either becomes its own contract — not something this plan is deferring by accident.
