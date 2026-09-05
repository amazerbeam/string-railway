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
