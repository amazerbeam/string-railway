---
name: pixel-artist
description: Create pixel art assets — character sprites, buildings, objects, tiles, UI, and sprite sheets — as reviewable code that renders to PNG and SVG with no new dependency. Use when asked to make a sprite, draw a character or building in pixel art, produce a sprite sheet or tileset, choose a projection or base resolution for a game's art, build or extend a palette, or review existing pixel art against craft rules.
allowed-tools: Read, Grep, Glob, Write, Edit, PowerShell, WebSearch, WebFetch
metadata:
  type: integration
---

# Pixel Artist

Produces pixel art for this project. The output is a real asset — a PNG a screen can load, plus an SVG proof for review — generated from a definition file that is plain text, diffable, and reviewable pixel by pixel.

**Scope:** this file owns the *production method* — how an asset is authored, what craft rules it must satisfy, how a sheet is laid out, and where the files land. `references/craft-and-projection.md` holds the shading, palette, projection geometry, and per-subject recipes. `references/renderer.md` holds the renderer's API and its contract.

**Not here.** How to write the React and TypeScript that *consumes* an asset is `.claude/skills/react-frontend/SKILL.md`. How a game screen is laid out and operated is `game-ux`. Whether a mechanic is any good is `game-designer`. Component names for the two game layers (**War Council**, **The Vanguard**, and the round vocabulary) are owned by `CLAUDE.md` — use them and do not restate their rules here.

## When to Use This Skill

- Making any pixel art asset: a character, a unit marker, a building, a terrain hex, a prop, an icon, a UI frame.
- Producing a sprite sheet or a tileset, or adding an animation row to an existing one.
- Choosing or recording the project's art bible — projection, base resolution, palette, light direction, outline policy.
- Reviewing existing pixel art for the named craft failures (banding, jaggies, pillow shading, inconsistent pixel density).
- Converting a reference image or a design description into a sprite definition.

## The core principle: pixel art is authored as code

Pixel art is deliberate placement of every pixel. That makes it a *data* problem, not a painting problem — so author each sprite as a grid of single characters, one per pixel, against a named palette:

```js
const idle = sprite([
  '..KKKK..',
  '.KSSSSK.',
  '.KSssSK.',
  '..KSSK..',
  '.KRRRRK.',
  'KRRrrRRK',
  '.KRrrRK.',
  '.K.KK.K.',
], pal, 'idle');
```

This is the whole method, and it is chosen for concrete reasons: the art is legible in a diff, a reviewer can count pixels to check a 2:1 line, a palette change is one edit that propagates everywhere, a mirrored or recoloured variant is a function call rather than a redraw, and rendering is deterministic — the same definition always produces byte-identical output. `.` and a space are transparent; every other character must exist in the palette or the render fails loudly rather than punching a silent hole.

The renderer is `scripts/pixelart.mjs` in this skill's folder. It uses only Node built-ins (`node:zlib`, `node:fs`), so **it adds no dependency** — which matters, because approving a new dependency is a developer-owned pause condition in `.claude/workflow/web-project.md`. Read `references/renderer.md` before calling it.

## Workflow

### Phase 1 — Settle the art bible

Every asset decision downstream depends on six values. Check whether the project has already recorded them (Glob `.docs/design/*.md` and `art/palette.mjs`); if it has, they are binding and this phase is a read, not a choice.

If they are *not* recorded, **state the defaults below inline, say you are using them, and proceed.** Do not stall the pipeline with a form — this developer's standing preference is a conversational flag over a batched question, and a documented default is pre-approved. What genuinely needs their eyes is Phase 4, once something is on screen.

| Decision | Default for this project | Why |
|---|---|---|
| Projection | **2:1 dimetric** for the Vanguard board; **orthographic side-on** for War Council cards | 2:1 lines land exactly on the pixel grid, so a hex board stays crisp; cards are a sealed UI world and may differ |
| Base resolution | **480×270** (×4 = 1080p, ×8 = 4K) | A board must show many hexes at once and a card must show readable text; 320×180 is too coarse for both |
| Tile size | **48×24** hex/ground tiles, **24×24** icons, **16×16** UI glyphs | Even dimensions halve cleanly for the 2:1 height |
| Palette | One shared ramp set, ≤32 colours total | A new colour used once is the start of drift; see `references/craft-and-projection.md` |
| Light | Single source, **top-left**, no deviation across the set | Consistency is what makes a set read as one world |
| Outline | **Selective** — dark outline on the shadowed silhouette, dropped on lit edges | Reads at small size without the flat sticker look of a full outline |

Record whatever is chosen in `art/palette.mjs` and one line in the asset's definition file. Six values stated once beats six values re-derived per asset.

### Phase 2 — Block the silhouette

Build the shape in one colour first, at final size, and check it reads. At 16–32px an asset is recognised by outline alone, so if the silhouette is ambiguous no amount of shading rescues it. Exaggerate the one identifying feature and delete everything else — a sword is a blade angle and a pommel, not a hilt wrap.

For a structure, lay construction lines first (the 2-step grid for dimetric), block the volume as stacked cubes, verify by **counting pixels**, then fill. Eyeballing a 2:1 line is the most common isometric mistake.

### Phase 3 — Build the ramp and shade

Apply the palette ramp, not arbitrary darker colours. Hue-shift: shadows move toward blue/purple, highlights toward yellow/orange — this single habit is the largest visible difference between amateur and professional work. Then check the render against the named failures in the hard floor below.

### Phase 4 — Render, then show it

Run the definition, write the PNG plus an SVG proof, then **read the PNG back and look at it.** A definition that runs is not an asset that works; the grid always looks different rendered than it does as text.

Then stop and show the developer. Whether the sprite *looks right* is visual judgement — a pause condition, and not something to self-certify. Say what you made, show it, name the art-bible values you assumed, and ask for the read.

### Phase 5 — Sheet and ship

Once individual frames are approved, pack them into a uniform-grid sheet with a JSON sidecar per the sheet contract below.

### Phase 6 — Verify

Run the success-criteria commands. Report the numbers.

## The hard floor

Craft rules an asset does not ship without. Detail and worked examples are in `references/craft-and-projection.md`.

- **Clusters, not confetti.** The unit of pixel art is the group of same-coloured pixels. Isolated single pixels inside a shaded area read as dirt — merge them into a cluster or remove them.
- **Consistent line steps.** A diagonal steps in even runs (1-1-1, 2-2-2, 4-4-4). A run of 2-1-3-2 is a *jaggy* and reads as a mistake at any size.
- **No banding.** Two colour edges running parallel make the eye lock onto the seam instead of the form. Break the parallel run or dither the transition.
- **No pillow shading.** Shading inward from every edge implies the light is at the viewer and flattens the form completely. Commit to the single light direction from the art bible.
- **Hue-shifted ramps only.** Never darken by dropping lightness alone.
- **One pixel density across a set.** A 16px-density sprite next to a 32px-density prop looks broken even when both are individually good. Different densities are allowed only in *sealed* worlds — gameplay art, UI art, map art — and never leak across that boundary.
- **Anti-aliasing is manual or absent.** Never a filter, never a blur, and skipping it entirely is a legitimate style.
- **Every frame of one animation shares a pivot.** Different origins per frame make the sprite visibly hop even when every frame is individually correct. The renderer bottom-aligns within the cell for exactly this reason.
- **Palette additions are a decision, not a reflex.** A colour that appears in one asset and nowhere else is drift. Extend the shared ramp or reuse it.

## Projection quick reference

Full geometry, per-projection tile construction, and the games worth studying are in `references/craft-and-projection.md`.

| Projection | Angle / ratio | Tile shape | Use for |
|---|---|---|---|
| Orthographic side-on | — | — | Cards, portraits, HUD art |
| Three-quarter top-down | ground top-down, subjects side-on | square (16, 32, 48) | Cheapest world art; screen-Y doubles as depth |
| **2:1 dimetric** | **26.57°** = 2 across / 1 down | **2:1** (48×24, 64×32) | Boards and terrain that need real volume |
| True isometric | 30°, axes at 120° | — | Avoid — does not divide into square pixels, edges come out ragged |
| Oblique / cabinet | sides at 45°, 50% length | — | Deliberately stylised, Earthbound-style |

Wall and cliff height in dimetric is conventionally **half the tile width**. Hex tiles are drawn twice as wide as tall so their diagonal edges sit on the same 2-step lines as everything else.

## Sprite sheet contract

- **Uniform grid.** Every cell identical — trivial to slice, trivial to hand-edit. Rows are animations or directions; columns are frames.
- **2 pixels of transparent padding** between cells, so no neighbouring pixel bleeds in when the sheet is filtered or upscaled.
- **A JSON sidecar always ships with the sheet** — cell size, padding, per-tag frame counts, and per-frame rects. Without it the consumer hardcodes offsets and breaks on the next edit.
- **Mirror rather than redraw** for left/right facings (`flipX`).
- **Frame budgets:** walk 4 (contact → passing → contact → passing), run 6–8, idle 2–4 slow, attack 3–5 weighted as anticipation → strike → recovery. More than 8 frames on anything is waste here.
- **Do the multiplication before drawing.** 4 directions × 6 animations × 8 frames is 192 frames. A board game needs idles and state changes, not walk cycles — that is usually the right place to spend nothing.

## Where files live

`.claude/workflow/web-project.md` owns the repo layout. This skill adds one tree, and the paths below are its convention:

```
art/
  palette.mjs           the shared ramp set — the art bible in code
  <subject>.mjs         one definition file per asset or asset family
public/art/
  <name>.png            generated, served verbatim by Vite, copied into dist/
  <name>.json           the sheet sidecar
  <name>.svg            generated SVG proof for review
```

Generated files under `public/art/` are build output — regenerate them, never hand-edit them. The definition in `art/` is the source of truth.

The first time this tree is created, add it to the Layout block in `.claude/workflow/web-project.md` so the paths stay stated once, and flag to the developer that you did.

## Traps on this machine

- **An absolute ESM import fails on Windows.** `import … from 'E:/…'` throws `ERR_UNSUPPORTED_ESM_URL_SCHEME`. Definition files in `art/` import the renderer by **relative** path; only a script outside the repo needs a `file:///E:/Game%20Dev/…` URL.
- **PowerShell, chained with `;`, never `&&`** — per `CLAUDE.md`.
- **The renderer is not part of `npm run build`.** It is run explicitly; a stale PNG in `public/art/` will ship silently if the definition changed and nobody re-ran it. Regenerate as part of the same change.
- **Never claim a sprite looks right without reading the rendered PNG back.** The text grid and the image are not the same artefact.

## Success Criteria

| Check | Command | Expected |
|---|---|---|
| Definition runs and emits | `node art\<subject>.mjs` | Exit 0, paths printed |
| The PNG exists | `Get-ChildItem public\art\<name>.png` | Listed, non-zero length |
| The PNG is a real PNG, right size | `node -e "const b=require('fs').readFileSync('public/art/<name>.png');console.log(b.subarray(1,4).toString(),b.readUInt32BE(16)+'x'+b.readUInt32BE(20))"` | `PNG <w>x<h>` matching the sheet contract |
| The sidecar parses | `Get-Content public\art\<name>.json \| ConvertFrom-Json` | No error; cell and pad match |
| It actually looks right | Read the PNG back, then show the developer | Their sign-off — never self-certified |
| Nothing else broke | `npm run typecheck` | Exit 0 (only if `src/` was touched) |

## Calibration

Don't over-render. A single 16×16 icon does not need a sheet, a sidecar, and a palette module — write it, render it, show it. Scale the ceremony to the asset: one-off icon → one definition and a PNG; an animated unit with facings → the full sheet contract.

Prefer editing an existing definition and extending the shared ramp over authoring a new family. Prefer mirroring, recolouring, and modular kits — a wall segment, a corner, a roof cap — over bespoke assets; one kit yields dozens of buildings, and twenty bespoke buildings yield twenty buildings.

If the request is really about how a screen is laid out rather than what an asset looks like, hand off to `game-ux` instead of drawing.

## Shared rules (read on demand)

Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index.

Topics that would land here: asset naming and palette ownership, generated-vs-authored file boundaries, determinism of generated output.

## NEVER SAY THESE PHRASES:

- "What size would you like the sprite to be?"
- "Which palette should I use?"
- "Should I make a sprite sheet?"
- "What projection do you want?"
- Any sentence collecting art-bible values one at a time instead of proposing the documented defaults and proceeding.

## FORBIDDEN BEHAVIORS:

- Interviewing the developer for values that already have defaults in Phase 1.
- Reporting a sprite as finished without rendering it and reading the PNG back.
- Claiming a sprite looks good — that is the developer's judgement, and a render is evidence for them, not a verdict from you.
- Adding an npm dependency to draw, encode, or pack an image. The renderer is dependency-free on purpose.
- Hand-editing a generated file under `public/art/` instead of its definition in `art/`.
- Introducing a colour outside the shared palette because one asset needed it.
- Mixing pixel densities within one sealed world.
- Emitting a sheet with no JSON sidecar.
