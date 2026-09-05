# DLR-177 — Git configuration for Unity, before the first binary asset lands

Plan: `.claude/contract/DLR-177-git-unity-serialization-and-lfs/plan.md`
Jira: DLR-177

## Summary

Most of this ticket was already satisfied on disk. Force Text asset serialization and visible
`.meta` files were already committed — this PR verifies that rather than changing it. The
substantive change is narrowing Git LFS to the set the developer actually chose, plus closing four
gaps measured against the plan: fifteen missing Unity YAML / UI-toolkit text extensions in
`unity/.gitattributes`, and twelve missing patterns in `unity/.gitignore` (play-mode test
scaffolding, Addressables output, `.meta` files beside the already-ignored `obj/`/`bin/` folders,
and crash/diagnostic droppings).

## The LFS decision

Git LFS stores a file outside the normal git object store and leaves a small pointer in its place —
worth it for a file that's large and never diffs usefully, wasteful for one that's small and does.
The previous `.gitattributes` had put 28 extensions on LFS without the developer ever being asked,
which is exactly what this ticket's acceptance criteria forbid. That block is now replaced with a
narrowed, developer-approved split:

**On Git LFS (26 patterns)** — large source and media formats: `.psd .psb .aseprite .ase .exr .hdr
.tif .tiff .tga .wav .flac .aif .aiff .mp3 .ogg .mp4 .mov .webm .fbx .blend .dll .pdb .so .dylib
.bundle .unitypackage`

**Left in plain git, declared `binary` explicitly (8 patterns)** — small raster art and fonts, so
they still preview in GitHub's web UI and don't cost LFS bandwidth on every clone: `.png .jpg .jpeg
.gif .bmp .ico .ttf .otf`

Timing is why no history rewrite was needed: `git ls-files unity/` matching any binary extension
returned **0** before this change was made. Nothing was renormalised.

## Decisions for you to make

**1. The editor-launch check (acceptance criterion 5) — please run this before merging.**

Open the Unity editor on `unity/`, let it finish importing, close it, then run:

```
git status --porcelain unity/
```

Expected: empty output. If it isn't:
- A new **untracked** path means an ignore-pattern gap — `unity/.gitignore` is missing a pattern
  for whatever Unity just wrote.
- A **modified tracked file** under `ProjectSettings/` means the editor rewrote a setting on
  launch. You decide whether that rewrite is one to keep and commit, or one to revert — this is a
  judgement call about editor behaviour an agent can't make.

**2. Three placements on the LFS line, if you want any moved** (each is a one-line edit in
`unity/.gitattributes`):
- `.tga` is on LFS. Some teams keep uncompressed TGA sprite sheets in plain git since they're
  often small; this project put it on LFS as a "large media format" by default.
- Plugin `.dll` / `.pdb` are on LFS. If any vendored plugin binary turns out to be tiny, it could
  move to plain git instead.
- Fonts (`.ttf`, `.otf`) are in plain git. If a font file turns out to be unusually large, it could
  move to LFS.

None of these were flagged as wrong — they're just the line-item decisions worth double-checking
now, while moving one costs a one-line edit rather than a history rewrite.

## Verification actually run

**Phase 1 — `.gitattributes` / `.gitignore` (from the plan; already completed before this phase):**

- Precondition: `git ls-files unity/` matching binary extensions → **0**.
- `git check-attr filter --` on six paths: `a.png: filter: unspecified`, `a.ttf: filter:
  unspecified`, `a.psd: filter: lfs`, `a.aseprite: filter: lfs`, `a.tga: filter: lfs`, `a.wav:
  filter: lfs`.
- `git check-attr text --` on `a.png`, `a.bmp`, `a.otf` (unity) and `a.png` (prototype) → all four
  `text: unset`, confirming the prototype tree resolves unchanged through the root
  `.gitattributes`.
- `git check-attr text eol --` on `a.inputactions`, `a.uxml`, `a.spriteatlas`, `SampleScene.unity`,
  `a.png.meta` → all five `text: set` / `eol: lf`.
- `git ls-files unity/ | git check-ignore --stdin --no-index -v` → nothing printed, exit 1: no
  tracked file under `unity/` matches any ignore pattern.
- `git check-ignore -v` on the four new-pattern targets:
  ```
  unity/.gitignore:68:[Oo]bj.meta	unity/Assets/TechDuinn.Table/obj.meta
  unity/.gitignore:56:/[Aa]ssets/InitTestScene*.unity	unity/Assets/InitTestScene1.unity
  unity/.gitignore:72:sysinfo.txt	unity/sysinfo.txt
  unity/.gitignore:73:*.stackdump	unity/Assets/crash.stackdump
  ```

**Phase 2 — settings and documentation (already completed before this phase):**

- `unity/ProjectSettings/EditorSettings.asset` line 7 → `m_SerializationMode: 2` (Force Text, AC1).
- `unity/ProjectSettings/VersionControlSettings.asset` line 6 → `m_Mode: Visible Meta Files` (AC2).
- Both settings files were already correct on disk and were only read, never written. **24**
  `.meta` files are in the index.
- `unity/README.md` gained the "Which files go to Git LFS" section; `.claude/workflow/unity-project.md`
  now records this setup as settled rather than pending.
- The decision was posted as a Jira comment on DLR-177 (comment id 10745) and read back to confirm
  it landed.

**Phase 3 — final sanity checks (this phase):**

`git check-attr filter diff merge text --` across every category (`a.png`, `a.psd`, `a.wav`,
`a.aseprite`, `a.ttf`, `a.tga`, `SampleScene.unity`, `a.png.meta`, `a.inputactions`,
`prototype/a.png`) returned exactly the expected split — LFS paths report `filter: lfs`, `diff:
lfs`, `merge: lfs`, `text: unset`; plain-binary paths report `filter: unspecified`, `text: unset`;
text-asset paths report `filter: unspecified`, `text: set`; the prototype path is untouched.

`git lfs ls-files` → empty, `count=0` — nothing is stored in LFS yet, as expected: this ticket
configures the boundary, it doesn't populate it.

`git status --porcelain -uall` → exactly the four planned modified files (`unity/.gitattributes`,
`unity/.gitignore`, `unity/README.md`, `.claude/workflow/unity-project.md`), plus this contract's
own `plan.md` and `tasks.md`, plus a pre-existing, unrelated untracked `.docs/art/` (two image
files) that predates this contract. No untracked or modified path under `unity/Assets/` or
`unity/ProjectSettings/`.

`git ls-files | git check-ignore --stdin --no-index -v` → nothing printed, exit code 1, checked
against the whole repository: no tracked file anywhere became ignored by this change.

## For future contributors

Anything binary and large under `unity/` — layered source files, audio, video, vendored plugin
binaries — goes to Git LFS; small raster art and fonts stay in plain git. `unity/.gitattributes` is
the single place that states the pattern list; `unity/README.md`'s "Which files go to Git LFS"
section explains the reasoning behind the line.

## Flag for a later ticket

`.github/workflows/ci.yml` checks out with `actions/checkout@v5` and no `lfs: true`. That's fine
today because nothing is LFS-tracked yet, but once the first LFS asset lands, CI will check out a
pointer file instead of the real asset unless that workflow is updated. Out of scope for this
ticket by its own stated boundaries — flagging it here so it isn't forgotten.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_019SQ1KeUUvFYcQJZk4AuHK5
