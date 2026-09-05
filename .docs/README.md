# Documentation — the live game

This tree documents the game being built in `unity/`. It is written **as each system is actually
built**, not ahead of it, and it starts nearly empty on purpose.

| Folder | Owns | Answers |
|---|---|---|
| `game_rules/the-hunt.md` | The playable procedure as it currently stands | "What are the rules?" |
| `design/` | Why each rule exists, and the branches discarded on the way | "Why this rule?" |
| `implementation/<module>/` | What the code does, per module | "How does the code do it?" |
| `marketing/` | Devlog plans, clips, Steam copy, the published log | "What are we saying about it?" |

`game_rules/` and `implementation/` are maintained by the `implementation-doc-writer` skill and
updated by `/fb-apply` — never edited by hand. `design/` is `game-designer`'s. `marketing/` is
`content-manager`'s.

## The other tree

`prototype/.docs/` documents the retained web prototype under `prototype/`. It is complete, it is
frozen, and it describes **the previous design direction** — including mechanics this build has not
adopted and may never adopt.

Read it as prior art. Never write to it, never cite it as current, and never treat a rule it states
as inherited here. A rule that is not written in this tree is undecided.
