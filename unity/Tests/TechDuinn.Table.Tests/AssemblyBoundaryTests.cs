using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using NUnit.Framework;
using TechDuinn.Presentation;
using TechDuinn.Table;

namespace TechDuinn.Table.Tests
{
    /// <summary>
    /// DLR-176 acceptance criterion 4: TechDuinn.Presentation may reference TechDuinn.Table, and the
    /// reverse must be impossible. Architecture §2 makes this the load-bearing rule of the whole
    /// layout — it is what stops a MonoBehaviour ending up inside a rule.
    /// </summary>
    public sealed class AssemblyBoundaryTests
    {
        private static string[] ReferencedAssemblyNames(Assembly assembly) =>
            assembly.GetReferencedAssemblies()
                .Select(reference => reference.Name ?? string.Empty)
                .ToArray();

        private static JsonElement ReadAsmdef(string name)
        {
            string path = Path.Combine(AppContext.BaseDirectory, "Asmdefs", name);
            Assert.That(File.Exists(path), Is.True, $"{name} was not copied to the test output.");

            using JsonDocument document = JsonDocument.Parse(File.ReadAllText(path));
            return document.RootElement.Clone();
        }

        [Test]
        public void TableReferencesNothingFromTheEngine()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeededRng).Assembly);

            Assert.That(
                references.Any(name => name.StartsWith("UnityEngine", StringComparison.Ordinal)),
                Is.False,
                "TechDuinn.Table must compile with no UnityEngine reference at all.");
        }

        [Test]
        public void TableDoesNotReferencePresentation()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeededRng).Assembly);

            Assert.That(references, Has.No.Member("TechDuinn.Presentation"));
        }

        [Test]
        public void PresentationDoesReferenceTable()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeedDisplay).Assembly);

            Assert.That(references, Has.Member("TechDuinn.Table"));
        }

        [Test]
        public void PresentationReferencesNothingFromTheEngineEither()
        {
            string[] references = ReferencedAssemblyNames(typeof(SeedDisplay).Assembly);

            Assert.That(
                references.Any(name => name.StartsWith("UnityEngine", StringComparison.Ordinal)),
                Is.False);
        }

        [Test]
        public void TablesAssemblyDefinitionDeclaresNoReferencesAndNoEngine()
        {
            JsonElement asmdef = ReadAsmdef("TechDuinn.Table.asmdef");

            Assert.That(asmdef.GetProperty("references").GetArrayLength(), Is.Zero);
            Assert.That(asmdef.GetProperty("noEngineReferences").GetBoolean(), Is.True);
        }

        [Test]
        public void PresentationsAssemblyDefinitionDeclaresAReferenceAndNoEngine()
        {
            JsonElement asmdef = ReadAsmdef("TechDuinn.Presentation.asmdef");

            Assert.That(asmdef.GetProperty("references").GetArrayLength(), Is.GreaterThan(0));
            Assert.That(asmdef.GetProperty("noEngineReferences").GetBoolean(), Is.True);
        }

        [Test]
        public void GamesAssemblyDefinitionIsTheOneThatKeepsTheEngine()
        {
            JsonElement asmdef = ReadAsmdef("TechDuinn.Game.asmdef");

            Assert.That(asmdef.GetProperty("noEngineReferences").GetBoolean(), Is.False);
        }
    }
}
