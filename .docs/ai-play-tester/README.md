# AI play-tester findings

Findings produced by running the real engine through its headless simulator (`src/sim/`, driven by
`npm run sim`) at scale, via the `play-tester` skill. One file per question that turned out to be
worth keeping.

## What belongs here

A finding that is **measured**, **reproducible**, and **still open** — i.e. it describes how the game
currently behaves and nobody has acted on it yet. Every number carries the policy name, `--runs` and
`--seed` that produced it, so it can be re-run and checked against the code as it stands today.

## What does NOT belong here

| Not this | It lives here instead |
|---|---|
| What the rules currently are | `.docs/game_rules/the-hunt.md` |
| Why a rule exists, discarded branches | `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` |
| How the shipped code works, per module | `.docs/implementation/<module>/` |
| A tuning decision, once made | the design docs above, and the code |

In particular this folder **states observations, never enacts tuning**. Which value to change, and by
how much, is the developer's call — a file here names what was measured and stops.

## Staleness

These findings are snapshots against a fast-moving prototype. Each file records the date and the
commit-era facts it depended on. A finding older than the code it describes should be **re-run**
before being trusted, not patched by hand.

## Index

- [`buffs-weak-at-run-start.md`](buffs-weak-at-run-start.md) — which buff cards contribute nothing in
  the run's opening fight, and the three structural reasons why. Carries a **proposed, not
  implemented** recommendation to drop `miser`, `keepsake` and `cornered` from the opening pile.
