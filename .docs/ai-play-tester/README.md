# AI play-tester findings

Findings from two different agents driving the real engine, kept in one folder because both answer
the same kind of question — how the game currently plays, not what its rules say or how its code is
built:

- **`play-tester`** — the headless simulator (`src/sim/`, driven by `npm run sim`) at scale: thousands
  of seeded runs, a measured statistic per finding.
- **`ai-play-tester`** — a single live run driven through the real browser UI via Chrome automation,
  choosing cards with an actual lookahead against the Quarry's deterministic AI rather than a
  simulated policy. What it reports is an observation from one session, not a statistic — see that
  skill's `references/strategy-engine.md` for how the play was chosen.

One file per question that turned out to be worth keeping, either way.

## What belongs here

A finding that is **reproducible** and **still open** — i.e. it describes how the game currently
behaves and nobody has acted on it yet. A `play-tester` finding carries the policy name, `--runs` and
`--seed` that produced it, so it can be re-run and checked against the code as it stands today. An
`ai-play-tester` finding instead names the exact fights/session it came from and says plainly that
it's a single run's observation — re-running it means playing again, not re-executing a seed, so treat
its numbers as illustrative rather than statistical until a `play-tester` batch confirms the pattern.

## What does NOT belong here

| Not this                               | It lives here instead                                       |
| -------------------------------------- | ----------------------------------------------------------- |
| What the rules currently are           | `.docs/game_rules/the-hunt.md`                              |
| Why a rule exists, discarded branches  | `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` |
| How the shipped code works, per module | `.docs/implementation/<module>/`                            |
| A tuning decision, once made           | the design docs above, and the code                         |

In particular this folder **states observations, never enacts tuning**. Which value to change, and by
how much, is the developer's call — a file here names what was measured and stops.

## Staleness

These findings are snapshots against a fast-moving prototype. Each file records the date and the
commit-era facts it depended on. A finding older than the code it describes should be **re-run**
before being trusted, not patched by hand.

## Index

- [`buffs-weak-at-run-start.md`](buffs-weak-at-run-start.md) — `play-tester`, headless sim. Which buff
  cards contribute nothing in the run's opening fight, and the three structural reasons why. Carries a
  **proposed, not implemented** recommendation to drop `miser`, `keepsake` and `cornered` from the
  opening pile.
- [`live-playthrough-log.md`](live-playthrough-log.md) — `ai-play-tester`, live browser sessions. A
  running log of judged (not first-legal) playthroughs — what was played, what happened, and any
  pattern worth a developer's attention.
