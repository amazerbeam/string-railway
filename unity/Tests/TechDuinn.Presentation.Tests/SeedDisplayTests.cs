using NUnit.Framework;
using TechDuinn.Presentation;
using TechDuinn.Table;

namespace TechDuinn.Presentation.Tests
{
    public sealed class SeedDisplayTests
    {
        [Test]
        public void RendersEightUppercaseHexCharacters()
        {
            string code = SeedDisplay.ShortCode(SeededRng.FromSeed(0xdeadbeefu));

            Assert.That(code, Is.EqualTo("DEADBEEF"));
        }

        [Test]
        public void PadsASmallSeedToEightCharacters()
        {
            Assert.That(SeedDisplay.ShortCode(SeededRng.FromSeed(1u)), Is.EqualTo("00000001"));
        }

        [Test]
        public void TracksTheGeneratorAsItAdvances()
        {
            SeededRng first = SeededRng.FromSeed(12345u);
            SeededRng second = first.Next(out _);

            Assert.That(SeedDisplay.ShortCode(second), Is.Not.EqualTo(SeedDisplay.ShortCode(first)));
        }
    }
}
