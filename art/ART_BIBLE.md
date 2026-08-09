# Art bible — setting & visual direction (first draft)

**Status:** first-draft description only. This file owns *what the world looks like and why*;
`palette.mjs` owns *the technical rendering values* (projection, resolution, tile size, palette,
light, outline) per the `pixel-artist` skill's Phase 1 — this file doesn't restate those. Nothing
below is a final craft decision — palette, silhouette, and composition choices are the developer's
call once something is actually on screen, per `game-designer`'s pause-condition rule. Treat this as
the reference brief an asset author reads first, not a finished bible.

Narrative and naming source: [`../.docs/design/ideas-and-concepts.md`](../.docs/design/ideas-and-concepts.md)
→ "Historical framing & battle goals." Card/unit naming: [`../.docs/design/reskin.md`](../.docs/design/reskin.md).

---

## The setting, in one paragraph

A fictional stand-in for the American Civil War — not America, and no real place names survive, but
the visual and structural grammar is drawn straight from it: two large, colour-coded armies, massed
infantry lines, fixed bayonets, smoothbore artillery, cavalry, regimental flags carried into the
line rather than left in camp. Two factions: **the Reds and the Blues.** The player chooses a side at
campaign start; the Blues win the war regardless of which side is played (see the design doc above
for why that's a narrative fact, not a mechanical one).

## Reference

The seed reference is a period battle lithograph in the Kurz & Allison mould — the kind of print
that shows an entire engagement as one wide frieze: two lines advancing into each other under a
smoke-streaked sky, cannon firing at close range, crossed banners marking where the lines have
already met, fallen figures in the foreground reading the cost without slowing the composition down.
What's worth carrying into the pixel art house style from that source is the **composition logic**,
not a literal copy of it — dense, wide, legible-at-a-glance battle scenes read the same way a 32px
sprite has to: recognisable from silhouette and colour blocking before any detail resolves.

## Faction colour

**Recommendation, not yet confirmed:** Red = the existing oxblood ramp (`P`/`R`/`R` in
`palette.mjs`), Blue = the existing azure swap (`N`/`B`/`b`), already documented in that file as
"the faction-swap ramp for oxblood." Both ramps already exist and were built before this setting was
chosen — using them for the two-army colour split costs zero new palette entries, applied with
`recolour(spr, { P: 'N', R: 'B', r: 'b' })` rather than a redraw. Needs the developer's confirmation,
not because the technical fit is in doubt, but because which faction gets which colour is a reading
the developer owns.

## What's still open

- Fictional country name, faction names beyond "Reds/Blues," city and place names — none chosen yet.
  These feed both this file and `reskin.md`'s naming gaps once decided.
- Uniform silhouette specifics per faction (kepi vs. slouch hat, coat cut, etc.) — not designed.
- Terrain reference for the Vanguard hex board and the overworld travel map — this bible currently
  only covers character/unit art pulled from the battle-print reference; the board and map are their
  own visual problems, not addressed here yet.
- Whether the existing `karvann.mjs` character (oxblood, unfactioned) is a Red-faction unit by
  default or a neutral/named character outside the two-army split — not decided; flagged so the
  faction recolour isn't applied to him without checking first.
