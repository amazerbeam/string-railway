# Corrections — 2026-08-08-game-designer-plain-language

## 2026-08-08 — Framework shorthand used without explanation; findings lacked worked examples

**What Claude did:** While critiquing `us-civil-war-game-framing.md` (a design document retired on DLR-45) under the
`game-designer` skill, cited frameworks and precedents by shorthand without unpacking them — e.g.
"a real Rosewater #17 win" with no statement of what lesson #17 says, and "the Thronebreaker
rebuttal answers a different question" without first explaining what Thronebreaker is, what the
community complaint actually was, or walking through why the document's specific defence misses it.
Findings named concepts rather than demonstrating them with a concrete scenario. Developer feedback
(verbatim): "Youre goin to have to give me exapmes and stop talking like a game engine and speak to
me like a human... I can see you flagged an issue with it, but I don't understand what you are
saying."

**What it should have done:** Explained every framework, designer, numbered lesson, or precedent
game in one plain-language sentence the first time it was used, and carried every finding with a
concrete worked example (specific numbers, or a specific scenario walked through) rather than
assuming the reader already knew the source. Applies to the report-template output and to
conversational follow-up in this skill's voice alike.

**Target:** `E:\Game Dev\StringsAndStations\.claude\skills\game-designer\SKILL.md`

**Section edited:** `## Report template` (format instruction) and `## FORBIDDEN BEHAVIORS`
(checkable rule)

**Fix status:** applied

**Diff:**

```diff
@@ ## Report template @@
 Use these headings. Order matters — strengths first, because a critique that opens with problems
 gets read as a verdict rather than as analysis.
+
+**Every framework, designer, or precedent you cite — a name, a numbered lesson, a comparable
+game — must be unpacked in one plain-language sentence the first time you use it, and every
+finding needs a concrete worked example (real numbers, or a specific scenario walked through)
+instead of just naming a concept.** This is a critique for the developer, not a citation to
+someone who already knows the source — write it so it stands on its own.

 ```markdown

@@ ## FORBIDDEN BEHAVIORS @@
 - Duplicating framework content into this file instead of `.docs/design/design-principles.md`
+- Naming a framework, designer, lesson number, or precedent game (e.g. "Rosewater #17," "the
+  Thronebreaker rebuttal") without explaining in plain language what it is, the first time it's used
```

**Why this prevents recurrence:** The failure was structural — nothing in the skill required
unpacking jargon or supplying examples, so the omission was compliant with the skill as written.
The rule now sits in the two places a critique is generated against: the output format instruction
and the forbidden-behaviours checklist.
