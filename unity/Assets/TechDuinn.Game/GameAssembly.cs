namespace TechDuinn.Game
{
    /// <summary>
    /// Placeholder so the assembly compiles and Unity does not warn on a script-less .asmdef.
    /// TechDuinn.Game holds MonoBehaviours, prefabs, input, animation, audio, scene wiring and the
    /// composition root (architecture §2); none of that exists yet and DLR-176 does not add it.
    /// The first real TechDuinn.Game ticket deletes this file.
    /// </summary>
    internal static class GameAssembly
    {
        internal const string Purpose = "Scene wiring and MonoBehaviours. Nothing built yet.";
    }
}
