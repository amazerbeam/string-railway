# Skill Type Structural Patterns

Patterns derived from working skills in this codebase. Use as templates when generating new skills.

---

## Automation (e.g. git-commit-code, git-branch-manager)

```yaml
allowed-tools: Read, Grep, Glob, Bash(cmd:*), Write
```

**Structure:**
- Phased workflow: Check → Plan → Validate → Execute → Verify
- Each phase: purpose (1 sentence), steps, validation criteria
- Safety section for dangerous operations (IMPORTANT callouts)
- 1-2 example workflows with realistic scenarios and actual commands
- Quick reference table for common patterns
- Success criteria with verification commands (`git log -1`, `ls`, etc.)

**What makes these work:** Parallel command execution in discovery phase, good/bad examples for format rules, safety checks called out prominently before the action phase.

---

## Integration (e.g. solution-scaffold)

```yaml
allowed-tools: Read, Grep, Glob, Write, Edit
```

**Structure:**
- Core principles (5-7 numbered principles establishing philosophy)
- Multi-step workflow (6-7 steps)
- Tables for structured extraction (elements, examples, sources)
- Key decisions documented with criteria, not just outcomes
- Calibration guidance ("Don't over-scaffold...", "Prefer established tools...")
- NEVER SAY / FORBIDDEN BEHAVIORS sections

**What makes these work:** Principles-first prevents bikeshedding. Calibration guidance teaches when to scale back. Reference file delegation keeps the main skill digestible.

---

## Analysis (e.g. architecture-critique, vertical-slicing)

```yaml
allowed-tools: Read, Grep, Glob, WebSearch
```

**Structure:**
- Frameworks Used section citing authoritative sources (WAF, ATAM, INVEST)
- Multi-lens analysis (e.g. fidelity + quality, or 5 complementary frameworks)
- Structured report template (exact headings for consistent output)
- Risk/priority register as a table
- Calibration guidance ("Match critique depth to context richness...")
- NEVER SAY / FORBIDDEN BEHAVIORS sections

**What makes these work:** Framework citations add authority ("WAF RE:05" > "consider redundancy"). Multiple lenses catch more issues. Testable quality attribute scenarios.

---

## Reference (e.g. react-frontend)

```yaml
# Minimal or no allowed-tools (defaults to read-only)
```

**Structure — keep under 100 lines total:**
- Use when / Do not use when (clear boundaries)
- Instructions (2-3 high-level bullets, not procedures)
- Focus Areas (list expertise domains)
- Approach (numbered best practices)
- Output (expected deliverables)
- Optional: link to `resources/playbook.md` for detailed examples

**What makes these work:** Lean by design. Claude already has domain knowledge — the skill guides *when and how* to apply it, not teaches the domain itself.

---

## Research

```yaml
context: fork
agent: explore
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
```

**Structure:**
- Research methodology (define scope → gather info → analyze → synthesize)
- Output format template (Executive Summary, Key Findings, Recommendations, Sources)
- Explicit read-only constraints section
- Success criteria: comprehensive, accurate, actionable, well-sourced

**What makes these work:** `context: fork` isolates large outputs. Read-only constraint is a trust signal. Structured output keeps findings usable.

---

## Common Patterns Across All Types

**Proactive skills** (Integration, Analysis) need:
```markdown
## NEVER SAY THESE PHRASES:
- "What would you like me to help you with?"
- Any sentence ending with '?' asking for user direction

## FORBIDDEN BEHAVIORS:
- Asking what the user wants instead of acting
- Waiting for user direction before analyzing
```

**Skill integration** — when one skill invokes another, document the flow:
```markdown
## Skill Integrations
**commit-code**: Uncommitted Changes → Safely Committed
- When: Phase 2 (Safety Validation)
- Why: Prevents data loss during branch operations
```

**Calibration guidance** — teach the skill when to scale back:
```markdown
## Calibration
Don't over-{verb}. If {symptom of excess}, scale back.
Prefer {simpler approach} over {complex approach} when {condition}.
```
