---
name: game-ux
description: Apply and review this project's game-screen UX standards — full-viewport no-scroll layout, screen zoning, interaction cost, and accessible navigation of a card hand or board — and turn play-session feedback about a screen into a redesign document. Use when building or reviewing a playable game surface, laying out a hand or a board, deciding how a card is selected and played, fixing a screen that scrolls or crops, judging whether a surface shows the player what a decision actually needs, or working out what to change after someone says a screen was confusing, fiddly, cramped, or slow.
allowed-tools: Read, Grep, Glob, Write, Edit, WebSearch, WebFetch
metadata:
  type: reference
---

# Game UX

Standards for the surfaces a player actually plays on. A game screen is not a document: it fills the viewport, never scrolls, and is scanned in glances between decisions rather than read top to bottom.

**Scope:** this file owns the *game-screen* layer — the viewport shell, zoning, interaction cost, and how a collection of like controls is navigated. Three reference files hold the detail: `references/full-viewport-layout.md` for the shell skeleton, viewport units and the zone model; `references/feedback-to-redesign.md` for the method that turns play-session notes into a redesign doc; `references/figma-mcp.md` for reading a design out of Figma via the MCP server without importing its assumptions.

**Not here.** How to write the React and CSS is `.claude/skills/react-frontend/SKILL.md`, and its *Accessibility and input* section owns the generic floor — ≥44px targets, `:focus-visible`, `@media (hover: hover)`, `touch-action`, semantic HTML and ARIA. Read it first; this skill adds the game layer on top and does not repeat it. Whether a mechanic is any good is `game-designer`.

**The feedback boundary with `game-designer`.** Both skills take play-session feedback. Split it by what actually failed: **the player could not see, read, reach, or afford the action → here**; **the action was clear and they did not want to take it → `game-designer`**. Notes routinely contain both, so split the list before working on either half rather than choosing one skill for the whole session.

## When to Use This Skill

- Building or editing a playable game surface — a hand, a board, a HUD, a turn prompt.
- Laying out a game screen, or fixing one that scrolls, crops, or sits under a mobile address bar.
- Deciding how a player selects and commits an action, or how many taps the most-repeated action costs.
- Making a collection of sibling controls (a hand of cards, a row of tiles) keyboard-navigable.
- Reviewing a game UI for whether it shows the player what the current decision needs.
- Working out what to change after a play session — someone found a screen confusing, fiddly, cramped or slow, and the notes need turning into a decided set of changes.
- Taking a design out of Figma — reading a frame through the MCP server, or judging whether a Figma file is structured well enough to be read at all. Read `references/figma-mcp.md` first; its reject conditions are what stop Tailwind and fixed pixel dimensions arriving in `src/`.

## The hard floor

### The screen fills the viewport and never scrolls

Any game a player has played is full-screen with no page scroll, so a game surface that scrolls reads as broken. Build the shell as a fixed grid of zones sized in viewport units, not as document flow that happens to fit.

- **`100dvh` or `100svh`, never `100vh`.** `100vh` measures against the *large* viewport — toolbars retracted — so on mobile the bottom of the layout starts life underneath the address bar. `svh` is the stable choice (fits on load, no reflow); `dvh` adapts live as browser chrome hides, at the cost of a reflow. Pick one deliberately.
- **`100%` or `100dvw`, never `100vw`.** `vw` includes the scrollbar's width and overflows horizontally when one exists.
- **`overflow: hidden` on the shell.** If some region genuinely must scroll, scope the overflow to that region and say why.
- **Respect the safe area** with `env(safe-area-inset-*)` so nothing hides behind a notch or a home indicator.
- **Content scales to fit rather than pushing the layout.** Bound sizes with `clamp()` so a hand of thirteen cards and every panel still fit at a short viewport. The min and max bounds are tuning values — a developer picks them; never invent them.

Skeleton and unit table: `references/full-viewport-layout.md`.

### Zone the screen, and keep status at the edges

- **Opponent above, shared play area in the middle with a visually defined boundary, your own hand at the bottom.** Your own resources sit adjacent to your own side.
- **Anchor status displays to the edges.** Letting them drift toward the centre is a named mistake — it cramps the play area, which is the thing that matters.
- **Cards in the play area are condensed relative to hand cards.** A played card is a record, not a thing you are choosing between; rendering it at full hand-card size wastes the centre of the screen.
- **The cards take visual precedence and the UI serves them.** Chrome that competes with the cards for attention is chrome to quieten.

### Count the taps on the most repeated action

The action a player performs most is the one whose cost compounds. Confirmation belongs **on the object being acted on**, not on a button across the screen — a second tap on the same card is a confirmation; a trip to a distant button is a chore.

This is not theoretical: Dire Wolf's own *Fox in the Forest* app is criticised in reviews for requiring cards to be dragged into place, which reviewers describe as making the game feel slow, and they asked for double-tap instead. Where a brief requires an explicit confirm step, satisfy it on the object and keep any button as a secondary, keyboard-friendly path — never as the only route. Never make drag the only way to do something.

### Never hide anything a decision needs behind hover

Touch has no hover. Detail-on-hover is fine for extras; anything the current decision depends on is on the face of the thing, always visible.

### A collection of like controls is one widget, not N tab stops

More than about five sibling controls in the tab order makes the keyboard path worse than useless — thirteen cards means thirteen presses to cross a hand. Use a roving tabindex: exactly one control at `tabindex="0"` and the rest at `-1`, arrow keys to move within the collection, `Enter`/`Space` to activate, `Escape` to cancel a selection. The container carries the group label.

### State reads without motion or colour alone

Encode state in form as well as colour — a raised card, a dashed edge, a badge — so a static screenshot still communicates it, colour-vision differences do not erase it, and `prefers-reduced-motion` costs nothing. Animation may reinforce a state change; it may not be the only signal.

## Approach

When **authoring**: read `react-frontend` for the code conventions, then build the shell from the reference file's skeleton before placing any content — retrofitting a no-scroll grid around a laid-out screen is the expensive order. Name each zone after what it holds.

When **reviewing**: walk the hard floor in order, and rank what you find by how often a player hits it. A layout that crops on a phone outranks a hover affordance; a two-tap action performed thirteen times a round outranks a one-off menu. State the tap count and the viewport size you checked at rather than asserting "feels cramped".

When **responding to feedback**: five steps, in order, detailed in `references/feedback-to-redesign.md`. Read it before starting — the reject conditions are the load-bearing part and none of them are obvious.

1. **Split each note into what was observed and what was prescribed.** Players are reliable about what went wrong and unreliable about how to fix it; the requested fix is a clue about the problem, not an instruction. The exception is a note about the cost of a repeated action — that is closer to a measurement than an opinion, and *Fox in the Forest*'s drag-vs-double-tap complaint is the case in point.
2. **Name the failure and check it is yours.** Which usability heuristic broke — signs and feedback, clarity, consistency, minimum workload, error recovery, flexibility, recognition over recall — on which zone or object, and how many times a round a player hits it. That frequency, not the strength of the complaint, sets the ranking. Anything that turns out to be a rules or incentive problem goes to `game-designer`; anything that turns out to be a number goes to the developer.
3. **Two options per finding, differing in kind rather than degree**, both written before either is judged. Parallel alternatives beat serial refinement because refining one idea invites fixation (Dow et al., Stanford). Force the divergence off two different axes — change what is said vs. change the channel, restyle in place vs. move it elsewhere, add the missing signal vs. remove the one it competes with, fix it vs. cut it. Each option carries what changes, cost, the risk it introduces, and what would settle it. Two options that differ only by a number are one option, and the number is not yours anyway.
4. **Run the interaction pass.** Walk the pairs and mark each compounding, redundant, clashing, dependent or neutral. Fixes collide over four scarce things: screen area, the player's attention in a given moment, the tap budget of the repeated action, and the moment in the loop. Resolve a clash on the hard floor first, then frequency, then reversibility — and if it is still tied, it is the developer's call.
5. **Write the set, not the list** — what ships, in what order, and what was dropped and why. A redesign doc that drops nothing has not decided anything.

## Mocking a screen up: HTML first, Figma when HTML runs out

**Default to a hand-authored `mockup.html`.** It is what `/fb-plan`'s UI gate approves, and it is the only medium in which this skill's hard floor is even expressible — `dvh`/`svh`, `clamp()` bounds, `overflow: hidden`, safe-area insets, tap counts and the keyboard model are all behaviour, and a fixed-pixel canvas has none of them. A mockup you can run also *fails* in front of you: on 2026-08-26 the buff-gallery mockup shipped four defects that were invisible in the equivalent Figma frames and obvious within seconds of loading the page (an invisible element whose `color-mix()` resolved against the wrong `currentColor`, an `[hidden]` attribute losing to `display:flex`, cards with width but no height, and a missing narrow breakpoint). Its CSS is also a draft of the real stylesheet rather than something to be re-authored.

**Reach for Figma when the job is one HTML is bad at**, and say which: the developer wants to move elements by hand rather than through you; a reusable component/variant library or bound design tokens across many screens; many alternative layouts compared side by side on one canvas; handing frames to another person; producing art assets. `references/figma-mcp.md` owns how to reach the server, what it costs, and the reject conditions — read it before proposing Figma, not after.

Neither medium settles a tuning value. See *Decisions that are not yours* below.

## Verification, and its one real limit

Layout claims are checked in a browser, not in a test. **jsdom has no layout engine**, so no Vitest test can prove a screen does not scroll — a component test that passes tells you nothing about whether the hand fits. Check it in a real browser at a few named viewport sizes and report the sizes. Because that question has a right answer, it belongs to QA driving the app through the `chrome-devtools` MCP, not to the developer's eye. What *does* belong to the developer's eye is whether the result feels right.

Keyboard behaviour, by contrast, is testable: focus movement, activation keys, and `Escape` are all assertable in a component test.

## Decisions that are not yours

Per the root `CLAUDE.md`, the developer owns visual and copy judgement, every tuning value, and anything needing judgement of the running app. In this skill's territory that specifically means: card and panel size bounds, glyph and colour choices, pacing and how long a resolved state stays on screen, and whether an interaction feels good.

Lay out the options with their consequences and the measurement that would settle them, then stop. Flag the assumption and keep working rather than blocking — but never quietly pick a tuning value and present it as a finding.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index. That folder is currently empty; re-scan rather than assuming it stays that way.

## Extending this skill

When a game-UX question comes up that the hard floor does not answer, research it (`WebSearch`, `WebFetch` — prefer shipped-game teardowns, practitioner write-ups, platform documentation, and the WAI-ARIA Authoring Practices over listicles), then add the finding to whichever reference file owns it — `references/full-viewport-layout.md` for anything about the shell, zoning or keyboard model, `references/feedback-to-redesign.md` for anything about reading feedback or choosing between fixes, `references/figma-mcp.md` for anything about Figma or its MCP server — with its source link, rather than leaving it in a conversation. If a finding fits none of the three, add a fourth file rather than wedging it into the nearest one.

State plainly where the research is thin instead of inflating a search result into a principle, and **record whether you fetched the primary text or only read a search summary** — `feedback-to-redesign.md` has a *Where this research is thin* section that does exactly this, and it is the part that stops a secondhand paraphrase hardening into a rule.

## Success Criteria

- The shell is one full-viewport grid: `dvh`/`svh` height, `overflow: hidden`, safe-area insets, no `100vh` and no `100vw` anywhere in the diff.
- No page scroll at any viewport size checked, and the sizes checked are named in the summary.
- Zones are explicit and status is anchored to an edge; play-area cards are condensed relative to hand cards.
- The most repeated action's tap count is stated, and confirmation happens on the object rather than only at a distant button.
- Nothing a current decision needs is hover-only.
- Any collection of more than about five sibling controls uses a roving tabindex, with arrow-key movement and `Escape` covered by a component test.
- Every state is distinguishable without colour or motion alone.
- No tuning value — size bound, delay, glyph, colour — was invented rather than routed to the developer.

When the work was a response to feedback, additionally:

- Every note is recorded as an observation separate from the fix the player asked for, and the fix they asked for was set aside rather than implemented on their say-so.
- Every finding names a usability heuristic, a zone, and a times-per-round figure.
- Every finding carries two options that differ in kind, each with its cost, its risk, and what would settle it — or one option plus an explicit statement of why the alternatives were rejected.
- The interaction pass is written down, with each clash naming the resource the two fixes compete for and how it was resolved.
- The doc names what was dropped. A redesign doc with an empty dropped list is rejected.
- Anything that turned out to be a rules problem went to `game-designer` rather than being patched with UI.
