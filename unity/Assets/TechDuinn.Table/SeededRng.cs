using System;

namespace TechDuinn.Table
{
    /// <summary>
    /// The only randomness source a rules assembly may reach for. mulberry32, ported bit-for-bit
    /// from prototype/src/hunt/seededRng.ts so a seed replays identically in both implementations
    /// and a later seed-for-seed comparison against the oracle stays possible (architecture §20.1).
    ///
    /// UnityEngine.Random is structurally unreachable here — TechDuinn.Table sets
    /// noEngineReferences. System.Random is banned by architecture §10 because its sequence is not
    /// contractually stable across .NET versions, and the Mono-to-CoreCLR cutover is exactly the
    /// event that would change it and invalidate every recorded seed.
    ///
    /// A readonly struct rather than the readonly record struct §10 asks for: record structs are
    /// C# 10 and Unity 6's Mono compiler is C# 9. Convert after the 6.8 CoreCLR cutover.
    /// </summary>
    public readonly struct SeededRng : IEquatable<SeededRng>
    {
        /// <summary>The generator's whole state. A value, never a field on a service (§10).</summary>
        public uint State { get; }

        private SeededRng(uint state)
        {
            State = state;
        }

        /// <summary>A generator positioned at <paramref name="seed"/>.</summary>
        public static SeededRng FromSeed(uint seed) => new SeededRng(seed);

        /// <summary>
        /// The next raw 32-bit output, and the generator that follows this one. No float is ever
        /// produced: the prototype's trailing division by 2^32 is deliberately not ported (§20.2).
        /// Allocation-free — five integer operations on a stack value, safe in a per-frame path.
        /// </summary>
        public SeededRng Next(out uint value)
        {
            unchecked
            {
                uint state = State + 0x6d2b79f5u;
                uint t = state;
                t = (t ^ (t >> 15)) * (t | 1u);
                t ^= t + (t ^ (t >> 7)) * (t | 61u);
                value = t ^ (t >> 14);
                return new SeededRng(state);
            }
        }

        /// <summary>
        /// A value in [0, <paramref name="exclusiveBound"/>), and the generator that follows.
        /// Computed as (ulong)raw * bound >> 32 — the integer identity of the prototype's
        /// Math.floor(rng() * n), so the two implementations agree exactly. Modulo would be a
        /// different sequence and would quietly cost the oracle comparison. The shift truncates
        /// toward zero, which is the rounding direction §20.2 requires stating at every division.
        /// </summary>
        /// <exception cref="ArgumentOutOfRangeException">
        /// When <paramref name="exclusiveBound"/> is not positive. A bound of zero would otherwise
        /// yield 0 and look plausible forever.
        /// </exception>
        public SeededRng NextBelow(int exclusiveBound, out int value)
        {
            if (exclusiveBound <= 0)
            {
                throw new ArgumentOutOfRangeException(
                    nameof(exclusiveBound),
                    exclusiveBound,
                    "A bounded draw needs a positive upper bound.");
            }

            SeededRng next = Next(out uint raw);
            value = (int)(((ulong)raw * (ulong)exclusiveBound) >> 32);
            return next;
        }

        public bool Equals(SeededRng other) => State == other.State;

        public override bool Equals(object? obj) => obj is SeededRng other && Equals(other);

        public override int GetHashCode() => State.GetHashCode();

        public static bool operator ==(SeededRng left, SeededRng right) => left.Equals(right);

        public static bool operator !=(SeededRng left, SeededRng right) => !left.Equals(right);
    }

    /// <summary>Seed composition, ported from the same prototype module.</summary>
    public static class Seeds
    {
        /// <summary>
        /// Fold integers into one 32-bit seed, order-sensitive. FNV-1a with a shift-xor finaliser,
        /// matching the prototype's mixSeed exactly. The params array allocates per call, which is
        /// deliberate and fine: seed composition happens once per hand, never per frame.
        /// </summary>
        public static uint MixSeed(params int[] parts)
        {
            if (parts == null)
            {
                throw new ArgumentNullException(nameof(parts));
            }

            unchecked
            {
                uint hash = 0x811c9dc5u;
                foreach (int part in parts)
                {
                    hash = (hash ^ (uint)part) * 0x01000193u;
                    hash ^= hash >> 13;
                }

                return hash;
            }
        }

        /// <summary>
        /// The seed for one hand's deal, and for the reshuffle that happens under the same
        /// generator. Unique per hand of a run: the encounter index separates the fights and the
        /// hand index separates the hands within one.
        /// </summary>
        public static uint DealSeedFor(uint runSeed, int encounterIndex, int handOfFight) =>
            MixSeed(unchecked((int)runSeed), encounterIndex, handOfFight);
    }
}
