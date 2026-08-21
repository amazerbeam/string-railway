# DLR-97 — Visual and interaction polish pass

Plan: [`plan.md`](./plan.md) in this folder.

## Summary

A CSS/copy/motion-only polish pass across the four surfaces named in AC1 — the shop tabs, the poison-marking interaction (Envenom plate + on-card mark), the flask control, and the Apply Damage plate — giving each real hover/focus/active states, motion where controls previously snapped, and a "Coming Soon" treatment on the refused shop tab that reads as intentional rather than broken.

Plus four follow-up legibility fixes triaged from direct playtest feedback via `game-ux`/`game-designer`:

- An entrance animation on the ability prompt (fade + rise on mount).
- A visible crossfade on the decree swap (previously an instant, invisible replace).
- The damage figure named directly in the trick-resolution sentence, so the causality of who dealt/took damage reads at a glance.
- The three felt-rail plates (Cheat slot, Envenom plate, Apply Damage plate) reshaped from the playing-card silhouette (`aspect-ratio: 2 / 3`) to a squat rounded rectangle (`aspect-ratio: 4 / 3`), so none of the three reads as a fourth playing card in the rail.

**No behaviour, refusal logic, or already-verified acceptance criterion changed anywhere.** Every task is CSS-only, a copy-string constant, or a `key`/read-only-prop change (`DecreePile.tsx`'s `key` affects only React remount identity, not any queried role, label, or state).

## Developer decisions needed

- **Every concrete colour, spacing, and motion-duration figure this pass adds is a first pass** — `--wc-ui-transition-ms` (140ms), `--wc-prompt-enter-ms` (180ms), `--wc-decree-swap-ms` (220ms), and every hover/lift/lock-glyph value in `shop.css`, `shopItems.css`, `shopFlask.css`. Read them in `npm run dev` and retune by eye.
- **The rewritten `SHOP_CATEGORY_COMING_SOON` copy** ("Locked for now — game-permanent items are still being designed.") needs a tone read against the original refusal-style sentence.
- **The felt-rail reshape** (`aspect-ratio: 4 / 3`, `border-radius: 10px` on all three plates) is the more decisive of two options considered — see `plan.md` → Risks for the cheaper, material-only alternative that was set aside. Worth a second look once played.
- Whether the new tab/row transitions feel right in pacing, once played.

## Open questions not built against

Two notes from the same playtest pass were deliberately **not** built here — they need a design decision before there's a task to write:

- **Mine-reveal telegraphing** — should the mine/skull telegraph before commit, or does only the flip-moment need to register better?
- **The "boring" screens** — home/map, win/lose, and between-hands tally were all flagged as boring in the same session. Which of pacing, reward, or presentation is behind each one is still open.

Both are recorded in `tasks.md`'s File map and in `plan.md` → Risks so they aren't lost.

## Jira scope question

DLR-97's original scope was the four AC1 surfaces. The four follow-up fixes (Phases 5–7) were triaged into this same contract on 2026-08-21 rather than split into a new ticket. Worth deciding whether DLR-97's Jira description should be updated to cover the expanded scope, or whether the follow-up items should be split into their own ticket for cleaner history.

## Verification results

All gates green after one fix-review round. Typecheck: 0 errors. Lint: 0 errors, 0 warnings. Full suite: 74 test files / 957 tests, all passing. Production build: exits 0, `dist/` written cleanly. Code-Evaluator and Defender both approved with zero Critical/Warning findings across both review rounds.

QA's first pass found one real gap: `TrickWell.test.tsx`'s existing assertion on the resolution sentence was a substring match that didn't actually verify the new damage-figure clauses (Task 16) — fixed with two new assertions, sanity-checked as non-tautological (fails when the production change is reverted), and confirmed in round 2.

Live browser verification (QA, reusing the dev server on `localhost:5173`, 1280×800): the Apply Damage plate, Envenom plate shape, Cheat slot shape, ability-prompt entrance, decree-swap crossfade, and both branches of the damage-causality wording were all driven live with a clean console throughout. The shop tabs, the flask row, and the on-card venom mark were **not reached live** in the same session — QA chose not to push the fight further once its own health dropped low, rather than risk restarting the run. Those three are backed by matching diffs, passing scoped tests, and correct production-bundle output, disclosed by QA as weaker evidence than a live interaction. Worth a manual look in `npm run dev` if you want the strongest confirmation on those three specifically.

## Note for future work

`--wc-ui-transition-ms`, `--wc-prompt-enter-ms`, and `--wc-decree-swap-ms` are now the shared durations for any future control/animation of their kind — read them rather than inlining a new duration figure.
