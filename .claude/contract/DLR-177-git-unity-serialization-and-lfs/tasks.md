# Tasks: Git, Unity serialization, and LFS before the first binary asset lands

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-09-05

**Goal:** Get the repository's git configuration right for a Unity project while `unity/` still
holds nothing but text — narrowing Git LFS to the developer's chosen set, closing the measured
`.gitattributes` and `.gitignore` gaps, verifying that Force Text serialization and visible `.meta`
files are already committed, and recording the LFS decision — so the epic's art track can land
without ever needing a history rewrite.

**Spec:** `plan.md` in this folder.

> **Git is not on `PATH` in PowerShell on this machine.** Every `Run:` step below that invokes
> `git` must be executed through the **Bash** tool, from the repository root. Non-git commands are
> PowerShell as usual.

> **This contract touches no `prototype/src/` file and no C# file.** Per `plan.md` Part 1 →
> Assumptions made, the `code-evaluator`, `defender` and `qa` reviewer dispatch is not warranted —
> they review React and TypeScript and have nothing to evaluate here.

---

## File map

**Created:** (none — no new files)

**Modified:**
- `unity/.gitattributes` — replace the 28-extension LFS block with a narrowed 26-pattern LFS block
  plus an explicit 8-pattern plain-git `binary` block; extend the text-asset block by 15 Unity
  YAML and UI-toolkit extensions.
- `unity/.gitignore` — append 12 entries covering play-mode test scaffolding, Addressables output,
  the `.meta` files beside ignored `obj/` and `bin/` folders, and crash/diagnostic droppings.
- `unity/README.md` — add a "Which files go to Git LFS" note recording the decision and its line.
- `.claude/workflow/unity-project.md` — rewrite the "Developer-owned work" bullet that names this
  setup as outstanding, so the single source of truth stops describing settled work as pending.

**Deleted:** (none)

**Read for verification only, never written:**
- `unity/ProjectSettings/EditorSettings.asset` — confirm `m_SerializationMode: 2` (AC1).
- `unity/ProjectSettings/VersionControlSettings.asset` — confirm `m_Mode: Visible Meta Files` (AC2).

**Developer decides or observes:**
- **AC5 — the editor-launch check.** Open the Unity editor on `unity/`, let it finish importing,
  close it, then run `git status --porcelain unity/` through the Bash tool. Expected: empty output.
  What to look for if it is not empty: any new untracked path is an ignore-pattern gap, and any
  modified tracked file under `ProjectSettings/` is the editor rewriting a setting — judge whether
  that rewrite is one to keep and commit, or one to revert. An agent cannot make that call.
- **The three placements on the LFS line**, if you want any of them moved after seeing the file:
  `.tga` and plugin `.dll`/`.pdb` are on LFS; fonts (`.ttf`, `.otf`) are in plain git. Each is a
  one-line change. Approved at the plan gate; listed here so it stays visible.

---

## Phase 1 — The git configuration

The two files that decide how every future asset is stored. This phase is a safe stopping point
because git configuration files have no compile step and no consumer that can break half-way: after
each task the file is either the old rule or the new one, never an inconsistent blend. Both tasks
end with a `git check-attr` or `git check-ignore` verification against a representative path, so a
glob that matches nothing is caught immediately rather than months later. Nothing is committed —
the executor decides when to commit.

### Task 1: Narrow the Git LFS pattern list in `unity/.gitattributes` and declare the excluded formats explicitly ✓

- Skill: `none — repository configuration, no code`

**Files:**
- Modify: `unity/.gitattributes`

- [x] **Step 1: Confirm the window is still open — no binary is tracked under `unity/`**

This is the precondition the whole ticket rests on. If it fails, stop and report: a tracked binary
means narrowing LFS would renormalise a stored object, which is a different and larger piece of
work than this contract.

Run (Bash tool, from the repository root):
`git ls-files unity/ | grep -icE "\.(png|jpg|jpeg|gif|bmp|ico|tga|tif|tiff|psd|psb|exr|hdr|wav|mp3|ogg|flac|mp4|mov|webm|ttf|otf|fbx|blend|dll|pdb)$"`
Expected: `0`.

- [x] **Step 2: Replace the LFS block at the bottom of `unity/.gitattributes`**

Delete the entire existing block that begins with the comment `# Binary assets go to LFS. Scoped to
unity/ deliberately: the prototype's own` and runs to the end of the file (the 28
`filter=lfs diff=lfs merge=lfs -text` lines). Replace it with exactly:

```gitattributes
# Large binaries go to Git LFS. Narrowed deliberately on DLR-177 after the
# developer was asked: LFS carries the source and media formats that are
# megabytes each and never diff usefully, and nothing else. Scoped to unity/ —
# the prototype's own images are already in plain git history and are left alone.
# See "Which files go to Git LFS" in unity/README.md for the reasoning.
*.psd  filter=lfs diff=lfs merge=lfs -text
*.psb  filter=lfs diff=lfs merge=lfs -text
*.aseprite filter=lfs diff=lfs merge=lfs -text
*.ase  filter=lfs diff=lfs merge=lfs -text
*.exr  filter=lfs diff=lfs merge=lfs -text
*.hdr  filter=lfs diff=lfs merge=lfs -text
*.tif  filter=lfs diff=lfs merge=lfs -text
*.tiff filter=lfs diff=lfs merge=lfs -text
*.tga  filter=lfs diff=lfs merge=lfs -text
*.wav  filter=lfs diff=lfs merge=lfs -text
*.flac filter=lfs diff=lfs merge=lfs -text
*.aif  filter=lfs diff=lfs merge=lfs -text
*.aiff filter=lfs diff=lfs merge=lfs -text
*.mp3  filter=lfs diff=lfs merge=lfs -text
*.ogg  filter=lfs diff=lfs merge=lfs -text
*.mp4  filter=lfs diff=lfs merge=lfs -text
*.mov  filter=lfs diff=lfs merge=lfs -text
*.webm filter=lfs diff=lfs merge=lfs -text
*.fbx  filter=lfs diff=lfs merge=lfs -text
*.blend filter=lfs diff=lfs merge=lfs -text
*.dll  filter=lfs diff=lfs merge=lfs -text
*.pdb  filter=lfs diff=lfs merge=lfs -text
*.so   filter=lfs diff=lfs merge=lfs -text
*.dylib filter=lfs diff=lfs merge=lfs -text
*.bundle filter=lfs diff=lfs merge=lfs -text
*.unitypackage filter=lfs diff=lfs merge=lfs -text

# Deliberately NOT on LFS. Small enough that plain git handles them well, and
# keeping them out of LFS means GitHub's web UI can still preview a sprite in a
# pull request and a clone does not spend LFS bandwidth on pixel art. Declared
# here rather than left to inherit from the root .gitattributes, so the whole
# LFS boundary is readable in one file — and because .bmp and the fonts have no
# root entry and would otherwise fall through to git's text=auto heuristic.
*.png  binary
*.jpg  binary
*.jpeg binary
*.gif  binary
*.bmp  binary
*.ico  binary
*.ttf  binary
*.otf  binary
```

- [x] **Step 3: Verify the new boundary resolves as intended on both sides**

Run (Bash tool, from the repository root):
`git check-attr filter -- unity/Assets/a.png unity/Assets/a.ttf unity/Assets/a.psd unity/Assets/a.aseprite unity/Assets/a.tga unity/Assets/a.wav`

Expected, exactly these six lines:
```
unity/Assets/a.png: filter: unspecified
unity/Assets/a.ttf: filter: unspecified
unity/Assets/a.psd: filter: lfs
unity/Assets/a.aseprite: filter: lfs
unity/Assets/a.tga: filter: lfs
unity/Assets/a.wav: filter: lfs
```

- [x] **Step 4: Verify the plain-git formats are marked binary rather than left to a heuristic**

Run (Bash tool, from the repository root):
`git check-attr text -- unity/Assets/a.png unity/Assets/a.bmp unity/Assets/a.otf prototype/a.png`

Expected: the three `unity/` paths report `text: unset` (which is what the `binary` macro sets);
`prototype/a.png` also reports `text: unset`, confirming the prototype is unaffected by this change
and still resolves through the root `.gitattributes`.

### Task 2: Extend the Unity text-asset coverage in `unity/.gitattributes` ✓

- Skill: `none — repository configuration, no code`

**Files:**
- Modify: `unity/.gitattributes`

- [x] **Step 1: Add the missing Unity YAML and UI-toolkit extensions to the text block**

In the text-asset block at the top of the file, insert these lines after the existing
`*.physicMaterial2D text eol=lf` line, keeping the file's existing column alignment style:

```gitattributes
*.physicMaterial   text eol=lf
*.overrideController text eol=lf
*.mask       text eol=lf
*.preset     text eol=lf
*.mixer      text eol=lf
*.renderTexture text eol=lf
*.cubemap    text eol=lf
*.lighting   text eol=lf
*.signal     text eol=lf
*.playable   text eol=lf
*.spriteatlas   text eol=lf
*.spriteatlasv2 text eol=lf
*.inputactions text eol=lf
*.uxml       text eol=lf
*.uss        text eol=lf
```

- [x] **Step 2: Update the block's opening comment to record what is already true on disk**

Replace the existing two-line comment at the top of the file:

```gitattributes
# Unity YAML — text, so scenes and prefabs stay diffable. Serialization mode is
# already Force Text in ProjectSettings/EditorSettings.asset.
```

with:

```gitattributes
# Unity YAML and UI-toolkit sources — text, so scenes, prefabs and layouts stay
# diffable. Two project settings make this work and are committed: asset
# serialization is Force Text (EditorSettings.asset, m_SerializationMode: 2) and
# .meta files are visible (VersionControlSettings.asset, m_Mode: Visible Meta Files).
```

- [x] **Step 3: Verify the new text patterns resolve, and that the scene and meta rules did not regress**

Run (Bash tool, from the repository root):
`git check-attr text eol -- unity/Assets/a.inputactions unity/Assets/a.uxml unity/Assets/a.spriteatlas unity/Assets/Scenes/SampleScene.unity unity/Assets/a.png.meta`

Expected: all five paths report `text: set` and `eol: lf`. Before this task the first three
reported `text: auto`; the last two must be unchanged from their pre-task values.

### Task 3: Close the measured `unity/.gitignore` gaps ✓

- Skill: `none — repository configuration, no code`

**Files:**
- Modify: `unity/.gitignore`

- [x] **Step 1: Append the missing ignore entries**

Add to the end of `unity/.gitignore`, after the existing `!/TechDuinn.FastGate.sln` negation:

```gitignore
# Play-mode test scaffolding. Unity writes a scene into Assets/ when the test
# runner enters Play mode and does not always remove it again.
/[Aa]ssets/InitTestScene*.unity
/[Aa]ssets/InitTestScene*.unity.meta

# Addressables build output, if the package is ever added.
/[Aa]ssets/[Ss]treamingAssets/aa.meta
/[Aa]ssets/[Ss]treamingAssets/aa/*

# Unity writes a .meta beside every folder inside Assets/, including the obj/ and
# bin/ folders ignored above. Unanchored for the same reason those two are: these
# folders appear inside Assets/, not at the root of unity/. Without these lines an
# MSBuild run that beats Directory.Build.props leaves an orphan .meta in git status
# with nothing to explain it.
[Oo]bj.meta
[Bb]in.meta

# Crash, diagnostic and export droppings.
sysinfo.txt
*.stackdump
/[Ee]xportedObj/
/.consulo/
*.pidb.meta
*.mdb.meta
```

- [x] **Step 2: Verify the new patterns do not swallow anything currently tracked**

This is the real risk of the task: `unity/.gitignore` carries carefully-anchored patterns that keep
four hand-written `.csproj` files and the fast-gate solution tracked, and a new unanchored pattern
could reach them.

Run (Bash tool, from the repository root):
`git ls-files unity/ | git check-ignore --stdin --no-index -v; echo "exit=$?"`
Expected: no path is printed, and `exit=1` — `git check-ignore` exits 1 when nothing matches, which
here means no tracked file under `unity/` is matched by any ignore pattern.

- [x] **Step 3: Verify the new patterns do match what they are meant to**

Run (Bash tool, from the repository root):
`git check-ignore -v unity/Assets/TechDuinn.Table/obj.meta unity/Assets/InitTestScene1.unity unity/sysinfo.txt unity/Assets/crash.stackdump`
Expected: all four paths are printed, each annotated with `unity/.gitignore` and the line number of
the pattern that matched it.

- [x] **Step 4: Confirm the working tree is still clean**

Run (Bash tool, from the repository root):
`git status --porcelain unity/`
Expected: two modified entries only — ` M unity/.gitattributes` and ` M unity/.gitignore`. No
untracked path, and nothing under `unity/Assets/` or `unity/ProjectSettings/`.

---

## Phase 2 — Verify the settings, and record the decision

No file under `unity/Assets/` or `unity/ProjectSettings/` is written in this phase — the two Unity
settings are read and confirmed, because acceptance criteria 1 and 2 ask that they be *committed*
and they already are. The rest of the phase writes the decision down in the three places that each
answer a different question. Safe stopping point: the git configuration from Phase 1 is complete and
self-consistent on its own, and everything here is documentation.

### Task 4: Verify and record that Force Text serialization and visible `.meta` files are committed ✓

- Skill: `none — verification only, no file written`

**Files:**
- Read: `unity/ProjectSettings/EditorSettings.asset`
- Read: `unity/ProjectSettings/VersionControlSettings.asset`

- [x] **Step 1: Confirm asset serialization is Force Text (acceptance criterion 1)**

Run: `Select-String -Path unity\ProjectSettings\EditorSettings.asset -Pattern "m_SerializationMode"`
Expected: one hit, `  m_SerializationMode: 2`. Unity's `SerializationMode` enum is
`Mixed = 0, ForceBinary = 1, ForceText = 2`, so `2` is Force Text. If it reads anything else, stop
and report — changing it is an editor action, not a YAML edit.

- [x] **Step 2: Confirm `.meta` files are visible and therefore committed (acceptance criterion 2)**

Run: `Select-String -Path unity\ProjectSettings\VersionControlSettings.asset -Pattern "m_Mode"`
Expected: one hit, `  m_Mode: Visible Meta Files`.

- [x] **Step 3: Confirm both settings files are tracked, not merely present on disk**

Run (Bash tool, from the repository root):
`git ls-files unity/ProjectSettings/EditorSettings.asset unity/ProjectSettings/VersionControlSettings.asset`
Expected: both paths printed. A setting that is correct on disk but untracked satisfies neither
criterion.

- [x] **Step 4: Confirm `.meta` files are actually in the index**

Run (Bash tool, from the repository root): `git ls-files unity/ | grep -c "\.meta$"`
Expected: `24` or more. It was 24 when this contract was planned and only grows.

### Task 5: Record the LFS decision in `unity/README.md` ✓

- Skill: `none — documentation`

**Files:**
- Modify: `unity/README.md`

- [x] **Step 1: Append a "Which files go to Git LFS" section**

Read the existing file first and match its heading level and prose style. Append a section covering
exactly these points, written as prose rather than a bare list:

- The rule in one sentence: large source and media formats go to Git LFS; small raster art and
  fonts stay in ordinary git.
- Why the line is drawn there: a finished pixel-art PNG is a few kilobytes and previews in GitHub's
  web UI, so LFS would cost convenience and bandwidth for no benefit; a layered `.psd` or
  `.aseprite`, an audio track, a video clip or a vendored plugin DLL is megabytes, never diffs
  usefully, and is replaced wholesale on every change — which is exactly what bloats a repository
  permanently.
- Where the rule lives: `unity/.gitattributes`, which is the only place the pattern list is stated.
- What a contributor must do: have Git LFS installed before cloning, or LFS-tracked files arrive as
  pointer text instead of the real asset.
- When it was decided and by whom: the developer, on DLR-177, before any binary asset existed under
  `unity/` — which is why no history rewrite was needed. Note that reversing the decision later
  would need `git lfs migrate` and a force-push.

- [x] **Step 2: Confirm the file still reads as one document**

Run: `(Get-Content unity\README.md).Count`
Expected: a line count greater than before the edit, and under 400 — the project's file-size gate.
Read the file back and confirm the new section does not duplicate a statement already made
elsewhere in it.

### Task 6: Retire the "outstanding" framing in `.claude/workflow/unity-project.md` ✓

- Skill: `none — documentation`

**Files:**
- Modify: `.claude/workflow/unity-project.md`

- [x] **Step 1: Rewrite the developer-owned bullet that names this setup as pending**

That file's "Developer-owned work" section currently ends with a bullet reading:

```markdown
- **The git and LFS setup before the first binary asset lands** (§20.3) — forcing text
  serialization, committing `.meta` files, configuring LFS for art and audio, and taking Unity's
  own `.gitignore`. Retrofitting LFS after sprites are in history is a rewrite of the repository.
```

Replace it with a bullet that records the decision as settled and states what remains developer-
owned, following that file's existing style — it must convey:

- **Settled on DLR-177**, before any binary asset existed under `unity/`. Force Text serialization
  and visible `.meta` files were already committed; Git LFS was narrowed to the large source and
  media formats after the developer was asked, with small raster art and fonts left in ordinary
  git. `unity/.gitattributes` owns the pattern list and `unity/README.md` explains the line.
- **What is still developer-owned:** adding a genuinely new *kind* of asset — anything that is not
  already covered by a pattern in `unity/.gitattributes` — because placing it on the wrong side of
  the LFS line is only cheap to fix before it is committed.
- Keep the §20.3 citation and the warning that retrofitting LFS after sprites are in history is a
  repository rewrite, since that is why the rule exists at all.

- [x] **Step 2: Confirm nothing else in the repository still describes this work as outstanding**

Run: `Get-ChildItem -Path .claude,CLAUDE.md,unity\README.md -Recurse -Include *.md | Select-String -Pattern "\bLFS\b"`

(PowerShell's `-Path` does not expand `**` recursively, which is why this pipes `Get-ChildItem
-Recurse` into `Select-String` rather than globbing directly.)
Expected: hits in `.claude/workflow/unity-project.md`, in `unity/README.md`, and in this
contract's own `plan.md` and `tasks.md` — and nowhere else. Ignore the contract folder's own hits;
they describe the decision, not a pending task. Any *other* file describing the LFS setup as
outstanding is a stale statement to fix in this task.

### Task 7: Record the LFS decision on DLR-177 ✓

- Skill: `none — Jira only, no code`

**Files:** (no repository file — Jira only)

- [x] **Step 1: Post the decision as a comment on DLR-177**

This is acceptance criterion 3's "recorded on the ticket", and it is the criterion's literal ask.
Invoke the `management-jira` skill and add a comment to `DLR-177` covering:

- **The question that was put:** whether to use Git LFS under `unity/` and for which extensions,
  with the storage, bandwidth, GitHub-preview and clone-time trade-offs stated.
- **The answer:** LFS, narrowed to large source and media formats only.
- **What was implemented:** the 26 LFS patterns and the 8 formats deliberately left in plain git,
  quoted as extension lists.
- **Why the timing mattered:** zero binary files were tracked under `unity/` when the change was
  made — verified, not assumed — so no object was renormalised and no history was rewritten.
- **What reversing it would cost later:** `git lfs migrate import` across the whole history plus a
  force-push, which this repository has never needed.

- [x] **Step 2: Confirm the comment landed**

Read `DLR-177` back through the `management-jira` skill and confirm the comment is present.
Expected: the comment appears on the issue. Per the standing note on this project's Jira, a write
that reports a timeout may still have landed — read back rather than retrying blind.

---

## Phase 3 — Final verification

No production changes. Only sanity checks that the cumulative work resolves the way the plan
intends, using git itself as the gate. There is no `npm test` and no `dotnet test` step here,
because nothing this contract changes is reachable from either — `plan.md` Part 2 → Risks states
this as a deliberate scope fact rather than an omission.

### Task 8: Confirm the full attribute boundary resolves correctly across every category ✓

- Skill: `none — verification only`

- [x] **Step 1: Resolve one representative path per category and read all four columns**

Run (Bash tool, from the repository root):
`git check-attr filter diff merge text -- unity/Assets/a.png unity/Assets/a.psd unity/Assets/a.wav unity/Assets/a.aseprite unity/Assets/a.ttf unity/Assets/a.tga unity/Assets/Scenes/SampleScene.unity unity/Assets/a.png.meta unity/Assets/a.inputactions prototype/a.png`

Expected: `a.psd`, `a.wav`, `a.aseprite` and `a.tga` each report `filter: lfs`, `diff: lfs`,
`merge: lfs`, `text: unset`. `a.png` and `a.ttf` report `filter: unspecified` and `text: unset`.
`SampleScene.unity`, `a.png.meta` and `a.inputactions` report `filter: unspecified` and
`text: set`. `prototype/a.png` reports `filter: unspecified` and `text: unset`, confirming the
prototype tree is untouched by everything in this contract. Confirmed exactly as expected.

- [x] **Step 2: Confirm no LFS object was created and no tracked file was renormalised**

Run (Bash tool, from the repository root): `git lfs ls-files; echo "count=$(git lfs ls-files | wc -l)"`
Expected: `count=0`. This contract configures LFS; it stores nothing in it, because there is
nothing binary to store yet. Confirmed: `count=0`.

### Task 9: Confirm the working tree is clean and only the four intended files changed ✓

- Skill: `none — verification only`

- [x] **Step 1: Confirm the diff is exactly the four planned files**

Run (Bash tool, from the repository root): `git status --porcelain -uall`
Expected: exactly four modified entries — `unity/.gitattributes`, `unity/.gitignore`,
`unity/README.md` and `.claude/workflow/unity-project.md` — plus the two files this contract itself
creates under `.claude/contract/DLR-177-git-unity-serialization-and-lfs/`. No untracked path under
`unity/Assets/` or `unity/ProjectSettings/`, and no modified file under either. Confirmed: exactly
those four modified entries, plus this contract's own `plan.md` and `tasks.md`, plus a pre-existing
and unrelated untracked `.docs/art/` (two files) that predates this contract per the task's own note.

- [x] **Step 2: Confirm no tracked file became ignored**

Run (Bash tool, from the repository root):
`git ls-files | git check-ignore --stdin --no-index -v; echo "exit=$?"`
Expected: nothing printed and `exit=1`, across the whole repository rather than just `unity/`.
Confirmed: no output, exit code 1.

### Task 10: Update the PR description ✓

- Skill: `none — documentation`

**Files:**
- Create: `.claude/contract/DLR-177-git-unity-serialization-and-lfs/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- A link to `plan.md` in this folder, and the DLR-177 issue key.
- A summary of the change, leading with the honest framing: most of this ticket was already
  satisfied on disk, and the substantive change is narrowing Git LFS to the developer's chosen set
  plus closing four measured gaps.
- The LFS decision, its two extension lists, and the note that zero binaries were tracked under
  `unity/` when it was made — so no history was rewritten.
- **Every decision the developer must make and every behaviour they must judge by playing:** the
  editor-launch check of acceptance criterion 5, with the exact command and what a non-empty result
  would mean; and the three placements on the LFS line (`.tga`, plugin `.dll`/`.pdb`, fonts) if any
  is to be moved.
- The verification results from Phases 1 to 3, quoting the actual `git check-attr`,
  `git check-ignore` and `git status` output rather than asserting they passed.
- **A one-line note for future contributors on the new convention:** which files go to Git LFS
  under `unity/`, and that `unity/.gitattributes` owns the list while `unity/README.md` explains
  the line.
- **A one-line flag for a later ticket:** `.github/workflows/ci.yml` checks out with
  `actions/checkout@v5` and no `lfs: true`, so once an LFS-tracked asset exists, CI would receive a
  pointer file rather than the asset. Out of scope here by the ticket's own scope boundaries.

---

## Self-review

**Spec coverage:**
- Narrow the LFS pattern list to the developer's chosen set — Task 1.
- Declare the deliberately-excluded binary formats as plain-git `binary` — Task 1, Step 2.
- Extend `.gitattributes` to the omitted Unity YAML and UI text-asset extensions — Task 2.
- Close the `unity/.gitignore` gaps — Task 3.
- Verify and record Force Text serialization (AC1) and visible `.meta` files (AC2) — Task 4.
- Record the LFS decision in `unity/README.md` — Task 5.
- Update the "Developer-owned work" bullet in `.claude/workflow/unity-project.md` — Task 6.
- Record the LFS decision on the ticket (AC3) — Task 7.
- A `.gitattributes` covering line endings for Unity text assets and the LFS patterns (AC4) —
  Tasks 1 and 2, verified in Task 8.
- Verify with `git check-attr` that every changed pattern resolves as intended, and that
  `git status` is clean — Tasks 8 and 9.
- AC5's editor-launch check — routed to "Developer decides or observes" in the File map, with the
  exact command and the reading of a non-empty result. Not agent work: an agent cannot judge
  whether an editor-generated change is expected.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or
"similar to Task N" references. Every step shows either the exact text to write or a runnable
command with its expected output. No step runs bare `vitest`, `npm run dev`, or hand-edits a
lockfile. No step invents a tuning value — the one open decision, the LFS extension set, was put to
the developer and answered before planning, and is recorded in `plan.md` Part 1 → Task reference.

**Type / name consistency:** No types, functions or config keys are introduced — this contract
writes no code. The identifiers that must stay consistent are file paths and glob patterns, and
they do: `unity/.gitattributes`, `unity/.gitignore`, `unity/README.md` and
`.claude/workflow/unity-project.md` are named identically in the File map, in every task's
`**Files:**` block, and in the Phase 3 expected `git status` output. The 26 LFS patterns and 8
`binary` patterns written in Task 1 are the same sets verified in Tasks 1, 3 and 8 and the same
sets quoted in Tasks 5, 6, 7 and 10. `m_SerializationMode: 2` and `m_Mode: Visible Meta Files` are
quoted identically in Task 2's comment rewrite, Task 4's verification and `plan.md` Part 2 → Data
shapes.

**Phase boundary cleanliness:**
- *Phase 1* ends with both git configuration files complete and internally consistent, verified by
  `git check-attr` and `git check-ignore` against representative paths, with `git status` showing
  those two files and nothing else. No half-applied pattern set: each task replaces or appends a
  whole labelled block.
- *Phase 2* writes no file under `unity/Assets/` or `unity/ProjectSettings/` at all — it reads two
  settings for verification and writes three documentation surfaces, none of which any other file
  depends on. The repository is fully consistent whether or not Phase 3 runs.
- *Phase 3* makes no production change of any kind. Every step is a read or a `git` query, so the
  phase cannot leave the tree in a different state than it found it.
