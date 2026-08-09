# Implementation docs

One living file per `src/` module folder, describing how the code in that folder actually works —
maintained by the `implementation-doc-writer` skill (`.claude/skills/implementation-doc-writer/SKILL.md`),
invoked automatically by `/fb-apply` once a contract's reviewers approve.

This is the third leg alongside `.docs/design/` (design intent, why a mechanic exists) and
`.docs/game_rules/` (rules as designed/transcribed): **implementation-as-built** — what is actually
on disk right now, not what a plan proposed. A doc here should answer "how does X actually work"
without reading the source, and "what's been implemented" without digging through old tickets.

Docs are organized by module, not by ticket, and accumulate across every ticket that touches that
folder — so a mechanic's explanation lives in one place regardless of which ticket last changed it.

| Module                | Doc                                    | Status      | Built by                                       |
| --------------------- | -------------------------------------- | ----------- | ---------------------------------------------- |
| `src/warCouncil/`     | [war-council.md](war-council.md)       | implemented | SCRUM-19, SCRUM-20, SCRUM-26                   |
| `src/app/`            | [app.md](app.md)                       | implemented | SCRUM-37, SCRUM-28, SCRUM-29, SCRUM-34, DLR-47 |
| `src/app/warCouncil/` | [war-council-ui.md](war-council-ui.md) | implemented | SCRUM-28                                       |

`src/app/warCouncil/` has its own doc rather than a section inside `app.md`: it is a module folder
in its own right, and War Council's combined doc had already passed this project's 400-line budget
by the time it was split.

DLR-47 retired the Vanguard board engine, the battle-loop orchestrator, and their UIs —
`src/App.tsx` now mounts a single War Council round directly
(`src/app/warCouncil/WarCouncilRound.tsx`), dealing a fresh round and restarting on completion. See
[app.md](app.md) for the mount itself; the deleted modules' history is recoverable via `git show`
per `CLAUDE.md`'s recovery instructions, not documented here.

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
