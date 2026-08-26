# DLR-147 — Full UI pass

Approved mockups for the epic. **This folder is not a contract** — there is no `plan.md` and no
`tasks.md`, so plan resolution (`.claude/workflow/plan-resolution.md`) skips it. It is the shared
home for the epic's approved UI mockups, which outlive any one child ticket.

`update-log.md` is the running record of every design decision behind these files — read it before
planning either child ticket, so the reasoning does not have to be reverse-engineered out of CSS.

| File | Ticket | Surface |
|---|---|---|
| `mockup-buff-gallery.html` | DLR-148 | The buff loadout rebuilt as a tier-filtered card gallery, plus the felt's game state re-homed into a left rail so nothing occludes the decree, the spent pile or the Quarry's played card |
| `mockup-card-faces.html` | DLR-149 | All 33 card faces — art on the named ranks, printed pip patterns, richer suit glyphs |
| `mockup-buff-metal.html` | DLR-148 | **The settled buff card** — off-white face, metallic bronze/silver/gold frame, roman-numeral tier, bare suit glyph, suit-coloured payoff bar, suit-grouped ordering |
| `mockup-buff-suit.html` | DLR-148 | Superseded. The four suit options, kept as the record of how the tier/suit colour constraint was found |

Both are interactive: open them in a browser rather than reading the source.

- **Buff gallery** — click a card twice to poise then fire (it spends a copy), use the tier filters,
  arrow keys traverse the grid, `Escape` unwinds. The toggle bottom-right flips mid-trick /
  between-tricks so the fenced "not usable now" group can be seen filling and emptying.
- **Card faces** — hover, focus or tap any card for its rule tooltip; the filter buttons narrow to
  the fifteen that act, the named cards, or the plain numbers. It scrolls **deliberately**: it is a
  reference sheet, not a play surface, so `game-ux`'s no-scroll floor does not apply to it.

## Reading them

They are intent, not spec. Both are plain co-located CSS with no build step, by design — nothing
here is portable into `src/`, which has its own conventions
(`.claude/skills/react-frontend/SKILL.md`). Re-author; do not port.

Every value marked `PLACEHOLDER` in either file is a tuning decision the developer owns and nobody
has made — tier colours, card sizes, art-window proportion, palettes, grain strength. They are
written down so they are visible, not so they are adopted.

## When a child ticket is planned

`/fb-plan DLR-148` creates its own folder (`DLR-148-<kebab-title>/`) and looks for `mockup.html`
**there**, not here. Point the plan at the file in this folder rather than copying it, so there is
one copy to correct. Later surfaces in this epic — the shop, the run map, the vault, the round-over
panel — add their mockups here under the same `mockup-<surface>.html` naming.
