---
name: skill-creator
description: Creates complete Agent Skills from minimal user input. Use when user wants to create a skill, build a new skill, make a skill, design a skill, scaffold a skill, generate a skill, or needs help with skill creation.
license: Apache-2.0
metadata:
  author: talos-ai-solutions
  version: "2.0"
  model: inherit
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Skill Creator

Generate working Agent Skills from minimal input. Takes a 1-2 sentence description and produces a complete SKILL.md with proper structure, ready to use immediately.

## When to Use This Skill

- User wants to create, build, design, scaffold, or generate a skill
- User needs help structuring or validating a skill

## Workflow

### Step 1: Capture Intent & Classify

From the user's input, determine:

1. **Skill purpose** — what does it do?
2. **Skill type** — classify using this table:

| Intent Keywords | Type | Example | Typical Tools |
|----------------|------|---------|---------------|
| automate, workflow, commit, deploy | **Automation** | git-commit-code | Read, Grep, Glob, Bash(cmd:*), Write |
| coordinate, orchestrate, scaffold | **Integration** | solution-scaffold | Read, Grep, Glob, Write, Edit |
| evaluate, critique, review, assess | **Analysis** | architecture-critique | Read, Grep, Glob, WebSearch |
| conventions, standards, guidelines | **Reference** | dotnet-csharp-pro | Read, Grep, Glob |
| research, explore, investigate | **Research** | (explore pattern) | Read, Grep, Glob, WebSearch, WebFetch |

3. **Duplicate check** — `Grep` existing `.claude/skills/` for overlap
4. **Frameworks needed** — does the skill need WAF, ATAM, INVEST, etc.?

### Step 2: Generate Name & Description

**Name:** kebab-case, 3-64 chars, regex `^[a-z0-9]+(-[a-z0-9]+)*$`

**Description:** max 1024 chars, third-person, format:
`"{What it does}. Use when {trigger 1}, {trigger 2}, {trigger 3}, or {trigger 4}."`

- Lead with action verb (Generate, Create, Analyze, Manage, Coordinate)
- Include 3+ natural trigger phrases the user would say
- Never use "helps with", "assists in", or passive voice

### Step 2.5: Assess Live API Sources

Before writing anything, classify whether the skill's domain involves versioned external APIs. This drives `allowed-tools` and whether a live-resolution phase is needed in the workflow.

**First, confirm what is actually connected.** Do not add an MCP tool to `allowed-tools` from this table without checking it exists in the current session — a skill that names an unavailable tool fails at invocation. If the documentation MCP you want is absent, fall back to `WebSearch` + `WebFetch`, or state the version assumption explicitly in the skill.

| Signal in skill description | Add to allowed-tools (if connected) | Live resolution needed |
|---|---|---|
| Generates code against a versioned npm package whose API moves between majors (a build tool, a test runner, a framework plugin — anything in `dependencies` / `devDependencies`) | a documentation MCP if one is connected, else `WebSearch`, `WebFetch` | Yes — config shapes and plugin APIs change hard between majors; resolve before generating |
| Generates code against a third-party library this project does not already depend on | a documentation MCP if one is connected, else `WebSearch`, `WebFetch` | Yes — and note that adding a runtime dependency here needs the developer's approval |
| Uses stable platform APIs (`Pointer Events`, `SVG`, `fetch`), core React, or stable CLIs (git, npm) | None | No — surface is stable across versions |
| Analysis / review only (read-only output) | None | No |

Version-gating is worth stating in the skill rather than resolving live: `package.json` pins what exists. Read it, name the version the skill was written against, and do not hardcode signatures that will drift.

**If live resolution is needed**, the generated SKILL.md must include:

1. A **"Resolve Live Sources"** workflow phase positioned immediately before any code generation step. Example:
   ```
   Resolve "{package-name}" against whichever documentation source this session has:
     - a connected documentation MCP, if one is available; else
     - WebSearch + WebFetch against the official docs for the pinned version
   Read the "{relevant topic}" section before generating any code against it.
   ```

2. A **Scope header** at the top of every reference file that explicitly labels:
   - What is **structural** (permanent — folder layout, design patterns, safety rules)
   - What is **owned by the MCP source** (method signatures, version-gated features, platform options)

   This boundary prevents reference files from going stale and signals to future editors where not to hardcode API details.

### Step 3: Write the SKILL.md

Read `references/type-patterns.md` for structural patterns per type, then generate the complete file.

**Key authoring principles** (from Anthropic's best practices):

- **Under 500 lines** — if approaching limit, split detail into `references/`
- **Only add what Claude doesn't know** — skip explaining regex, kebab-case, what action verbs are
- **Explain the why, not just the what** — reasoning helps Claude generalize
- **Avoid rigid ALWAYS/NEVER in all caps** — that's a yellow flag for brittle prompts
- **Progressive disclosure** — SKILL.md is the overview; reference files load on demand
- **Match freedom to fragility** — strict scripts for dangerous ops, loose guidance for judgment calls

**Required sections (all types):**

1. YAML frontmatter: name, description, allowed-tools, metadata
2. Overview (2-3 sentences, not paragraphs)
3. When to Use This Skill
4. Core workflow/methodology
5. **Shared rules (read on demand)** — every skill must include this section. Use the boilerplate below verbatim, then list 1–3 example topics relevant to this skill (or omit examples if none yet exist). Ensure `Read`, `Grep`, and `Glob` are in `allowed-tools`.

   ```markdown
   ## Shared rules (read on demand)

   Project-wide rules live at `.claude/rules/`. Before answering, scan `.claude/rules/` (Glob `.claude/rules/*.md`) and Read any file whose topic matches the decision — including rules added after this skill was written. See `.claude/rules/README.md` for the index.
   ```

6. Success Criteria (verifiable, with commands where possible)

**Type-specific additions:**

| Type | Extra Sections |
|------|---------------|
| Automation | Phased workflow (Check→Plan→Validate→Execute→Verify), safety checks, example workflows |
| Integration | Core principles, orchestration steps, calibration guidance |
| Analysis | Frameworks used (with citations), report template, calibration guidance |
| Reference | Use when / Do not use when, Focus areas, Approach, Output. Keep under 100 lines total |
| Research | Methodology, output format, read-only constraints. Use `context: fork` |

**For proactive skills** (Integration, Analysis), add:
- `## NEVER SAY THESE PHRASES:` — list passive questioning patterns
- `## FORBIDDEN BEHAVIORS:` — list behaviors that violate proactive intent

### Step 4: Design Tool Permissions

Start minimal, add only what's needed:

1. Base: `Read, Grep, Glob` (every skill)
2. Modifies files? → add `Write` and/or `Edit`
3. Runs commands? → add `Bash(prefix:*)` with pattern restriction (never `Bash(*)`)
4. Needs web? → add `WebSearch`, `WebFetch`
5. Research type? → must be read-only, no Write/Edit/Bash
6. Has versioned library APIs? → add the documentation MCP tools from Step 2.5 **only if they are connected in this session**; otherwise `WebSearch`, `WebFetch`
7. Never add an MCP tool speculatively. An `allowed-tools` entry naming a server that isn't connected makes the skill fail the moment it reaches that step.

### Step 5: Create Reference Files (only if needed)

**Create references when:**
- Skill uses external frameworks needing detailed criteria
- SKILL.md would exceed ~400 lines without them
- Complex decision trees or checklists (50+ items)

**Do not create references for:**
- Things Claude already knows (language features, common patterns)
- Restating what's already in SKILL.md
- Simple automation or reference skills

Structure: `references/` with one file per concern, linked from SKILL.md.
Keep references one level deep — no nested references.

### Step 6: Validate

Check the generated skill:

| Check | Rule | Fix |
|-------|------|-----|
| Name format | Matches `^[a-z0-9]+(-[a-z0-9]+)*$`, 3-64 chars | Convert to kebab-case |
| Description | Action verb + 3+ triggers + min 30 chars | Rewrite active voice |
| Tools | No wildcards (`*`), Bash has pattern prefix | Restrict or remove |
| Structure | All required sections present for type | Add missing sections |
| Content | No passive questioning, no vague terms | Remove or rewrite |
| Size | SKILL.md under 500 lines | Extract to references |

### Step 7: Write Files & Report

1. Create `.claude/skills/{skill-name}/`
2. Write `SKILL.md`
3. Write reference files if any
4. Report to user:

```
Skill created: {skill-name}
Location: .claude/skills/{skill-name}/SKILL.md
Type: {type} | Tools: {allowed-tools}

Invoke: /{skill-name} or say: "{trigger phrase}"
```

## Success Criteria

- Skill file exists and frontmatter passes validation
- All required sections present for the skill type
- Tool permissions are minimal and pattern-restricted
- Description has action verb + 3+ trigger phrases
- SKILL.md body under 500 lines
- Skill is immediately invocable

## NEVER SAY THESE PHRASES:
- "What sections would you like?"
- "Should I add reference files?"
- "What would you like the description to say?"
- Any sentence asking for details one-by-one

## FORBIDDEN BEHAVIORS:
- Passive interviewing (asking for each detail separately)
- Waiting for approval on every choice
- Creating incomplete skills that need manual finishing
- Generating skills without validating them
- Putting versioned API signatures or config shapes in reference files — if the skill targets a versioned third-party package, those details belong in a live-resolution phase, or behind an explicit "written against version X" note, not hardcoded in a file that will silently go stale
- Skipping Step 2.5 when the skill description mentions a versioned npm package or a library this project does not already depend on
- Adding an MCP tool to `allowed-tools` without confirming that server is connected
