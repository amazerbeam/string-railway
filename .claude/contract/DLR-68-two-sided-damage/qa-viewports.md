# QA browser checks — DLR-68 Standing track

The engine half of this contract (`huntDamage`, the guards, the rounding) is not observable
in a browser — nothing renders it until DLR-71 — so its verification is the Vitest
enumeration (`huntEnumeration.test.ts`) and the `scoring.test.ts` suite, not this document.

**The Standing track is fully observable**, and jsdom has no layout engine — no Vitest test
can prove the status band does not scroll or crop at a given viewport. That question has a
right answer, so it is QA's to answer by driving the app through the `chrome-devtools` MCP,
at the sizes named below. The sizes are named rather than left to judgement.

The track's rules live in `src/app/warCouncil/warCouncilStandingTrack.css` — a fifth
stylesheet, carved out of `warCouncilHunt.css` during this contract because that sheet
crossed its 400-line budget (419 lines) once the track's rules were added verbatim. It is
imported last, after `warCouncilDeclare.css`, from the mount component. It carries its own
copy of the `@media (max-width: 44rem), (max-height: 34rem)` breakpoint block (the same
breakpoint value as the other four sheets, not a duplicated rule). Look there, not in
`warCouncilHunt.css`, for anything the track does at a given width.

## Sizes to check

### 1920×1080 and 1440×900

- The track renders in the top bar, in the middle slot between `Spoils ×` and `= Damage`.
- Six segments are visible (one per row of the configured Win/Lose table).
- The current bracket carries a brass rail (the `.wc-is-current` border treatment).
- The pip count across the whole track is 14 (one per trick, 0 through 13).

### 1024×768

- The track still shows — this is above the 44rem / 34rem collapse breakpoint.
- The status band does not wrap onto a second row.

### 760×600

- Just above the breakpoint: the last size at which the track must still fit without the
  band overflowing.

### 680×520 and 700×544

- **Below** the breakpoint, and the two sizes DLR-67's open defect was measured at.
- Confirm the track is gone (collapsed via CSS `display: none`) and the compact `Standing`
  cell is present in its place.
- Confirm the band is no worse than it is on `master` today.
- **DLR-67's declare-gate overflow will still be present here.** It is pre-existing, lives in
  a different stylesheet this contract did not touch, and must not be reported as introduced
  by this contract.

### 390×844 (phone portrait)

- No horizontal page scroll.
- Nothing rendered behind a notch / safe-area inset.

### In every case

- The browser console is clean — no errors, no warnings.
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.

## What is NOT QA's to judge

The following are the developer's placeholder values, carried over from the approved
mockup, and a screenshot is not a substitute for the developer looking at them:

- The three fill colours (`#4a3d22` current, `#3c4a33` peak, `#3a2724` cliff).
- The track's size bounds — the `clamp()` width and the fixed height.
- The `min-height` floor that keeps a ×0.5 bar visible on the Lose path's 0-3 bracket.
- The pip opacity (`rgba(233, 225, 205, 0.32)`).

QA should report what it observes at each size above (pass/fail against the stated
criteria, screenshots if useful) without rendering a verdict on whether these four values
look right — that judgement stays with the developer.
