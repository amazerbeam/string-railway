using TechDuinn.Table;

namespace TechDuinn.Presentation
{
    /// <summary>
    /// A view model over the rules' generator. Exists so TechDuinn.Presentation holds real work
    /// rather than a marker type, and so its one-way reference on TechDuinn.Table is load-bearing.
    /// </summary>
    public static class SeedDisplay
    {
        /// <summary>
        /// The eight-character uppercase hex code a debug overlay shows for a generator's position.
        /// Pure. Allocates the returned string, so it belongs on a debug overlay rather than in a
        /// per-frame path.
        /// </summary>
        public static string ShortCode(SeededRng rng) => rng.State.ToString("X8");
    }
}
