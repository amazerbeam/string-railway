# The Unity project

Three assembly definitions exist under `Assets/` (DLR-176) — `TechDuinn.Table` and
`TechDuinn.Presentation` are engine-free and each carries a `.csproj` beside its `.asmdef`;
`TechDuinn.Game` references `UnityEngine`. The matching test projects live under `Tests/`,
alongside the `TechDuinn.FastGate.sln` solution that runs them.

See [`.claude/workflow/unity-project.md`](../.claude/workflow/unity-project.md) for the current
layout, the runner commands, and which of the seven designed assemblies are still deferred.

The reasoning behind every boundary is in
[`../.docs/implementation/unity-port-architecture.md`](../.docs/implementation/unity-port-architecture.md).

The web prototype this ports from is in [`../prototype/`](../prototype/) and stays runnable —
it is the oracle the port's simulator is checked against (§20.1).

## Which files go to Git LFS

Large source and media formats go to Git LFS; small raster art and fonts stay in ordinary git. The
line is drawn there because a finished pixel-art PNG is a few kilobytes and previews in GitHub's
web UI, so putting it on LFS would cost convenience and bandwidth for no benefit — while a layered
`.psd` or `.aseprite`, an audio track, a video clip, or a vendored plugin DLL is megabytes, never
diffs usefully, and is replaced wholesale on every change, which is exactly what bloats a
repository permanently.

`unity/.gitattributes` is the only place the pattern list is stated — read it rather than this
paragraph for the current boundary. A contributor needs Git LFS installed before cloning, or every
LFS-tracked file arrives as pointer text instead of the real asset.

The developer decided this on DLR-177, before any binary asset existed under `unity/` — which is
why adopting it needed no history rewrite. Reversing the decision later would need
`git lfs migrate import` across the whole history plus a force-push, so treat the boundary as
settled rather than provisional.
