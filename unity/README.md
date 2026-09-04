# The Unity project

Deliberately empty. The Unity project is scaffolded by its own ticket; nothing here yet.

The layout it will take — seven assembly definitions, four of which reference no `UnityEngine`
at all — and the reasoning behind every boundary is in
[`../.docs/implementation/unity-port-architecture.md`](../.docs/implementation/unity-port-architecture.md).
Read §2 before creating the first `.asmdef`, and §20.5 before pinning the editor version.

The web prototype this ports from is in [`../prototype/`](../prototype/) and stays runnable —
it is the oracle the port's simulator is checked against (§20.1).
