# Craft, palette, and projection

**Scope.** Everything in this file is **structural** — it is craft technique and projection geometry, not a versioned API. The 2:1 ratio, the walk-cycle key poses, and the named shading failures have been stable for thirty years and will not drift. Nothing here should ever be replaced by a live documentation lookup.

**Owned elsewhere:** the project's chosen projection, base resolution, tile size, palette, light direction, and outline policy are the art bible in `SKILL.md` Phase 1 and, where a project has recorded them, its `art/palette.mjs`. This project has no art tree at present — the previous one was retired on DLR-45. This file explains *how* each option works; it does not decide which one this project uses.

---

## Palette ramps

A ramp is an ordered run of colours describing one material from shadow to highlight. Build ramps, not colours — an asset then shades by stepping along a ramp rather than by inventing a darker version of a fill.

**Ramp length.** 3 steps is enough for a small prop (shadow / base / light). 4–5 for a character or a large surface. Beyond 5 you are describing detail the resolution cannot hold.

**Hue-shift every step.** Moving from base to shadow, rotate the hue toward blue/purple *and* drop saturation less than you expect. Moving to highlight, rotate toward yellow/orange. A ramp that only changes lightness reads as grey and dead, and this is the single most visible amateur tell.

```
bad   #b13e53  ->  #8a3142  ->  #632331     (lightness only)
good  #ef7d57  ->  #b13e53  ->  #7a2438     (hue rotates warm -> cool as it darkens)
```

**Share ramps across materials.** Deliberately reusing one ramp for wood and for leather is what makes a set cohere, and it is why a 32-colour palette can carry an entire game. A colour that appears in exactly one asset is drift.

**Reserve two keys globally:** one near-black outline colour used by everything, and one shared shadow/contact colour. Those two doing consistent work across every asset is most of what "consistent style" means in practice.

Lospec's palette library is the standard place to start rather than mixing from scratch — pick an established palette and constrain to it.

---

## The named failures

| Failure | What it looks like | Fix |
|---|---|---|
| **Jaggies** | A diagonal whose steps run 2-1-3-2 | Even runs: 1-1-1, 2-2-2, 4-4-4. Pick one rhythm per line and hold it |
| **Banding** | Two colour edges running parallel, so the eye reads the seam not the form | Break the parallel run, stagger it, or dither the transition |
| **Pillow shading** | Shading inward from every edge, form looks like an inflated cushion | Commit to one light direction; the far side stays dark all the way to the silhouette |
| **Confetti / noise** | Isolated single pixels scattered inside a shaded region | Merge into clusters or delete. The cluster is the unit, not the pixel |
| **Orphan pixel** | A single pixel poking off a silhouette | Absorb it into the neighbouring cluster |
| **Density mismatch** | One sprite's pixels visibly bigger than another's | One density per sealed world; never scale a sprite by a non-integer factor |
| **Dead ramp** | Shading that changes lightness only | Hue-shift (above) |
| **Muddy midtones** | Ramp steps too close together, form disappears | Fewer steps, further apart. Contrast reads; subtlety does not at 32px |

## Anti-aliasing and dithering

**Anti-aliasing** is manually placing an intermediate colour at a corner where a line changes direction, to soften the step. Rules: manual only, never a filter; apply it to *interior* curves and leave the outer silhouette hard so the sprite stays crisp against any background; and skipping it entirely is a legitimate, common style choice. Never anti-alias a sprite that will be displayed at 1:1 — there is nothing to soften.

**Dithering** alternates two ramp neighbours to fake an intermediate step or a gradient. It earns its place on large surfaces — a sky, a big wall, a water plane — and reads as noise on anything under about 24px. Use a regular checker or a 50%/25% pattern; irregular dithering just looks like the confetti failure.

## Outlining

Pick one policy for the project and hold it.

- **Full dark outline** — every silhouette edge outlined. Maximum readability on a busy board, slightly cartoonish, flattens form. This is the Advance Wars / Wargroove choice and it is a strong default for small units on terrain.
- **Selective outline** — outline present on shadowed edges, dropped where the light hits. More volume, more modern, needs stronger internal contrast to keep the silhouette legible.
- **No outline** — painterly. Requires real value separation between the subject and every background it sits on. Risky on a board where terrain colour varies.

Outline colour should be a dark version of the fill's hue, not pure black, except for the one shared near-black used deliberately across the set.

---

## Projection geometry

### 2:1 dimetric

Two axes foreshortened equally at **26.565°** from horizontal, because that is exactly a 2-pixels-across / 1-pixel-down line. The angle is chosen *by the pixel grid*, not by geometry — 2-step lines are crisp, countable, and tile perfectly.

Construction:

1. Draw the ground diamond with 2-step lines. A 48-wide tile is 24 tall.
2. Extrude down by the wall height — conventionally **half the tile width** (24px for a 48px tile).
3. The three visible faces are: top (the diamond), and two side faces. Each takes a different ramp step from the same ramp — top lightest, the two sides at differing shadow depths per the light direction.

Verify by counting pixels along every diagonal. Do not trust your eye on a 2-step line.

**True isometric — 30°, axes at 120° — is the thing to avoid.** It cannot be expressed in whole pixels, so every edge comes out ragged. "Isometric pixel art" almost always means 2:1 dimetric.

### Hex tiles in dimetric

Draw the hex twice as wide as it is tall so its diagonal edges ride the same 2-step lines as the rest of the art. A flat-top hex then has two horizontal edges and four 2-step diagonals, and it tiles against its neighbours without a seam. Pick the tile width first as an even multiple of 4, so the half-height and the quarter offsets all land on whole pixels.

### Three-quarter top-down

Not a true projection — a useful lie. The **ground is drawn as if from directly above, while subjects are drawn from the side.** Screen-Y doubles as depth, so lower on screen reads as nearer, and a tall sprite legitimately overlaps whatever sits above it. Square tiles. Characters are conventionally **1 tile wide × 2 tall**.

It is the cheapest world art per asset and the most legible, which is why most 2D games use it.

### Oblique / cabinet

Front face flat-on, sides pushed off at 45° at 50% length. Geometrically wrong on purpose; charming. Earthbound, Pac-Mania, Ultima VII.

---

## Per-subject recipes

### Characters and unit markers

- **Proportions:** at small sizes the head takes **⅓ to ½ of total height**. Realistic proportions at 32px produce a stick figure. Expression is where a character reads from, so buy it with head size.
- Silhouette first, in one colour, at final size.
- **Four directions maximum** — down, side, up — mirroring the side for left/right. Eight-way movement reads fine on four drawn directions.
- **Walk cycle key poses:** Contact (foot strike) → Down (lowest point) → Passing (mid-stride) → Up (highest point). Block those four, then in-between only if the motion needs it.
- A run cycle can donate its frames to a walk by omitting the full-stride ones.
- Give even a static unit a 2-frame idle. A board of perfectly still sprites reads as a dead game.

### Buildings and structures

- **Modular kit before bespoke.** Author: wall segment, corner, window insert, door, roof slope, roof cap, foundation. Assemble buildings from the kit. One kit yields dozens of buildings.
- Construction lines first, block as stacked cubes, count pixels, then fill.
- **Textures must tile seamlessly on all four edges** of each surface, or repetition shows as a visible seam grid.
- **Uniform detail density across the kit.** A heavily textured wall beside a flat roof is the fastest way to look assembled from two different games.
- Silhouette carries identity at board scale — a tower is a proportion, not its brickwork.

### Objects and props

- Silhouette-only recognition test at final size, before any shading.
- Exaggerate the one identifying feature; delete the rest.
- **Every prop needs a contact shadow** — a small dark cluster where it meets the ground — or it floats.
- Recolour within the shared palette for variants: one barrel, three hue rotations, three biomes.

### UI and icons

- **9-slice frames:** four corners, four edges, one centre. One small asset then scales to any panel size without stretching a corner.
- Icons on a fixed grid — 16×16 or 24×24 — with 1px of internal breathing room so nothing touches the cell edge.
- Bitmap text sits on the pixel grid at integer scale, or is rendered at native display resolution *above* the pixel layer. Decide once for the whole project; a half-scaled glyph is the most visible possible defect.

---

## Base resolution and the pixel grid

The rendering model is: draw everything to an offscreen canvas at the native low resolution, then upscale that one canvas by an **integer** factor with nearest-neighbour filtering.

| Base | ×1080p | ×4K | Character height it suits |
|---|---|---|---|
| 320×180 | ×6 | ×12 | 16–24px — chunky, fastest to produce |
| 384×216 | ×5 | ×10 | 24px |
| 480×270 | ×4 | ×8 | 24–32px — readable text, many tiles on screen |
| 640×360 | ×3 | ×6 | 32–48px — roughly 4× the art cost of 320×180 |

**Every doubling of sprite resolution roughly quadruples the work per asset.** A 16px character animates in an evening; a 64px one takes a week. Multiply that across the whole asset list before committing.

Rules that come with integer scaling: nearest-neighbour everywhere, no bilinear, no mipmaps; camera position snaps to whole base-pixels or every sprite jitters; no rotation off 90° multiples; and post-processing applies to the composited low-res canvas so it cannot introduce colours outside the palette.

---

## Examples worth studying

**For a hex/board strategy game specifically:**

- **Songs of Conquest** — the reference for 2:1 dimetric strategy boards with modular buildings. Has a 120+ page official digital artbook showing process.
- **Into the Breach**, **Advance Wars**, **Wargroove** — grid-tactics readability: how a unit stays legible at tiny size on busy terrain, and how terrain recedes without competing with units.

**For craft:**

- **SLYNYRD's Pixelblog** — the best free structured curriculum. #22 covers top-down character sprites, #41 covers isometric.
- **Derek Yu's Pixel Art Tutorial** — the short foundational one; clearest statement of clusters, jaggies, and anti-aliasing.
- **Saint11's tutorials** (Celeste's artist) — dense single-image lessons; the *Consistency* article is the source of the sealed-worlds rule.
- **Pixel Parmesan**, *Fundamentals of Isometric Pixel Art* — construction lines.
- **Lospec** — largest tutorial index plus the canonical palette library.
- **PixelJoint** — the community gallery; top-rated pieces and their comment threads are free critique lessons.

**Sheets to pull apart** to learn layout conventions: **Kenney.nl** (40,000+ CC0 assets, unusually consistent, clean uniform-grid sheets), itch.io free asset packs, OpenGameArt for volume.

**On hybrid pipelines:** *Dead Cells* modelled and animated in 3D, rendered through an orthographic camera at target sprite resolution, then pixelated and hand-touched, with normal maps for dynamic light. *Eastward* drew by hand then rebuilt assets in a 3D scene with hand-painted bump maps. Both traded pixel-level intentionality for retake speed and lighting. It is a production decision, not an aesthetic shortcut, and it is out of scope for a project with no 3D pipeline.
