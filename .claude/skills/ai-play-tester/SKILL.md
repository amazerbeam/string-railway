---
name: ai-play-tester
description: Drives a live browser playthrough of the Hunt game end-to-end using Chrome automation, reading a dev-only window state mirror to decide what to click instead of parsing screenshots one at a time. Use when asked to browser-test the game, do a browser playthrough, click through a run to check a change, drive the app through Chrome, or reproduce a bug by playing it live rather than reasoning about it statically.
allowed-tools: Read, Grep, Glob, Skill, mcp__claude-in-chrome__tabs_context_mcp, mcp__claude-in-chrome__navigate, mcp__claude-in-chrome__computer, mcp__claude-in-chrome__read_page, mcp__claude-in-chrome__tabs_create_mcp, mcp__claude-in-chrome__tabs_close_mcp, mcp__claude-in-chrome__javascript_tool, mcp__claude-in-chrome__browser_batch, mcp__claude-in-chrome__find, mcp__claude-in-chrome__read_console_messages
metadata:
  type: automation
---

# AI Play Tester

## Overview

Plays the live app in a real Chrome tab to verify a change actually works end to end, not just that its unit tests pass. Its speed comes from reading `window.__DEBUG_STATE__` — a dev-only mirror of the app's real reducer state — instead of reconstructing the screen from a DOM snapshot or screenshot at every step. This is distinct from `play-tester`, which answers statistical "how does the encounter play out at scale" questions by running the headless simulator; this skill drives the actual rendered UI for one live human-shaped run.

## When to Use This Skill

- "Do a browser playthrough" / "click through a run" / "play the game in the browser"
- Verifying a UI or rules change actually shows up correctly on screen, after `/fb-apply` or manual edits
- Reproducing a bug that only shows up through real interaction (a screen transition, a stuck button, a console error)
- Confirming a run can be completed start to finish without getting stuck
- "Learn to play" / "see how far a good player gets" / any request for actual playing judgement rather than mechanical click-through — see `references/strategy-engine.md`

Not for: win-rate/balance questions across many simulated runs (that's `play-tester`), and not for writing or reviewing game code (that's `react-frontend`).

## Core Workflow

### 1. Confirm the debug dump is present

The speed of this skill depends on `window.__DEBUG_STATE__` existing in the running dev build — a plain object, kept current by dev-only `useEffect`s guarded by `import.meta.env.DEV`, that mirrors live app state (run/phase/vault state from `App.tsx`, round/hand/buff state from `WarCouncilRound.tsx`) without needing a DOM read. See `references/game-state-and-labels.md` for its expected shape and where it's wired.

Check for it early with `javascript_tool` (`window.__DEBUG_STATE__ !== undefined`). If it's missing:
- Tell the developer the dump isn't wired yet rather than silently falling back for the whole run — a missing dump usually means either the feature hasn't been built, or a stale/reverted local build is running.
- Fall back to `read_page` (accessibility snapshot) for that session. It's slower but still correct — components in this codebase already carry accessible roles/labels for their interactive elements (`react-frontend` convention).

### 2. Launch the app

Invoke the `run` skill to start the dev server the project's own way, rather than reaching for `npm run dev` directly — it knows the project's launch pattern and won't leave a server running in the foreground. Wait for it to report ready before navigating.

### 3. Open a tab and get oriented

- `tabs_context_mcp` first, to see what's already open — never reuse a tab from an unrelated task.
- `tabs_create_mcp` a fresh tab, `navigate` to the dev server URL it printed.
- One `javascript_tool` read of `window.__DEBUG_STATE__` (or one `read_page` if the dump isn't present) to see the starting screen.

### 4. Drive the run

Loop: **read state → decide the next action from it → click → re-read state to confirm it landed.** Three things below were learned the hard way running this skill for real — apply them from the start rather than rediscovering them:

- **Click via `javascript_tool`, not `computer` coordinates.** On at least one setup, the `computer` tool's screenshot pixel space did not map onto the real click target even after correcting for `devicePixelRatio` — clicks silently landed nowhere. A real DOM `element.click()` (find the element with `document.querySelector`, matched by its `aria-label`) fired the React handler every time. Reserve `computer`/`find` for the rare case a control has no accessible name to match on. `browser_batch` is for `computer`-style action sequences — it doesn't help a `javascript_tool`-driven loop, so prefer the pattern below over it here.
- **A state read immediately after a click sees stale data.** React flushes the dev-only mirror's `useEffect` after a `setTimeout`/microtask gap, not synchronously with the click event. `element.click(); JSON.stringify(window.__DEBUG_STATE__)` in the same statement reads the *pre-click* state. Always `await` a short delay (150–400ms) between the click and the read.
- **Don't `await` a multi-step loop inside one `javascript_exec` call — it hits the tool's own ~45s round-trip timeout**, even when the loop itself would finish well inside that window; the game state keeps advancing server-side but the RPC response never comes back. Instead, launch the loop as a **detached async IIFE** (fire it, don't `await` the outer call — the exec returns immediately) writing its trace to a page-global (`window.__trace`), then poll that global from separate short `javascript_exec` calls. See `references/round-driver.md` for a copy-paste driver built this way, plus the concrete DOM landmarks (hand selector, illegal-card class, the four different "advance" button texts a hand cycles through) it depends on.

Beyond those three: never trigger a JS `alert`/`confirm`/`prompt` — check `read_console_messages` and the state dump first rather than clicking blind on a control that might raise one. If state after a click doesn't match what was expected, stop and re-orient with a `read_page` snapshot or a screenshot rather than guessing again — a mismatch usually means either a real bug or a misread label, and both need a look rather than a retry.

**A fourth thing, learned the same way: once the loop is running, only read from the page — never call into it.** A manual `javascript_exec` that clicks a button or invokes the step function directly while the detached loop is also mid-click can race it and stall the whole loop with no error anywhere. See `references/strategy-engine.md`'s concurrency note.

#### Driving with actual judgement, not first-legal-card

`round-driver.md`'s default step always plays `legalCards[0]` — it proves the screens hold together, but it is not trying to win and produces nothing worth reporting about the game itself. Whenever the developer wants a playthrough that reflects real decisions rather than the mechanical default — "learn to play", "play well", any question whose answer depends on cards actually being chosen well — swap in the lookahead engine from `references/strategy-engine.md` instead. It exploits something worth knowing up front: the Quarry's card choice (`src/warCouncil/cpuPlayer.ts` → `chooseCpuCard`) is **fully deterministic, no randomness at all** — so with the debug mirror's full state (it exposes the Quarry's hand and the skull assignments, same as everything else this skill already reads), you can compute exactly what the Quarry will play in response to each candidate card before committing one, and pick the best available outcome rather than the first legal one. That reference also covers the extra screens (`verdict`/`map`/`shop`, the low-health "Continue anyway" confirmation) a multi-fight run passes through that the base driver skeleton doesn't handle.

### 5. Recognize the stopping point

Stop when the run reaches its outcome screen (verdict/warned per `RunPhase`), when the specific thing the developer asked to check has been confirmed or refuted, or after 2–3 failed attempts to progress past the same screen — per the project's browser-automation guidance, that's a "stop and ask" condition, not something to keep retrying past.

### 6. Report

State plainly what was verified, not just that a run completed:
- The specific behavior checked and what happened (pass/fail, with the state values that show it)
- Any console errors seen (`read_console_messages`), even if the run otherwise completed
- Whether the debug dump was available for the whole run, or the session fell back to snapshots partway through

A judged playthrough (section 4's lookahead engine, not the first-legal default) that surfaces a real, reportable pattern — not just one run's win or loss — belongs in `.docs/ai-play-tester/`, written up the way that folder's `README.md` describes, with the finding's source named as a single live browser session rather than a simulator batch. A single run is an anecdote worth telling the developer directly; only a pattern worth someone else finding later earns a file.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index.

## Success Criteria

- The specific behavior the developer asked about was actually observed live in the browser, not inferred from code reading
- `window.__DEBUG_STATE__` was used as the primary source when present; snapshots were only a fallback, and that fallback was reported, not silently absorbed
- No JS dialog was triggered and no orphaned tab or dev server was left behind
- Any console error encountered during the run is reported even if it didn't block progress
