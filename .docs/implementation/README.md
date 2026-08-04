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

| Module            | Doc                              | Status      | Built by           |
| ----------------- | -------------------------------- | ----------- | ------------------ |
| `src/warCouncil/` | [war-council.md](war-council.md) | implemented | SCRUM-19, SCRUM-20 |
| `src/vanguard/`   | [vanguard.md](vanguard.md)       | partial     | SCRUM-19, SCRUM-21, SCRUM-22, SCRUM-23, SCRUM-24 |
| `src/battle/`     | [battle.md](battle.md)           | implemented | SCRUM-19, SCRUM-25 |

**scaffold** = types/folders only, no runtime logic yet. **partial** = some real logic, incomplete.
**implemented** = the module's stated responsibility is functionally covered (may still grow).
