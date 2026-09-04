# Figma and the Figma MCP server

Owned by `game-ux/SKILL.md`. This file covers where Figma sits in this project's pipeline, how the MCP server is reached, and the file-structuring practices that decide whether the design context it returns is worth anything.

Read it before proposing Figma as a source for a `mockup.html`, before calling any `mcp__figma__*` tool, or when the developer asks what the MCP can do.

> **Default is HTML.** `SKILL.md` → *Mocking a screen up* sets the order: hand-author `mockup.html` first, and reach for Figma only for the jobs HTML is bad at — the developer moving elements by hand, a reusable component/variant library or bound tokens across many screens, many layouts compared side by side on one canvas, handing frames to another person, producing art assets. Everything below still applies when you do reach for it. Nothing below is a reason to reach for it by default.

## Where Figma fits here — and where it does not

This project's UI gate is `.claude/contract/<slug>/mockup.html`: an interactive HTML mockup with its own AskUserQuestion approval step (root `CLAUDE.md` → the `/fb-plan` lifecycle). Figma does not replace that gate. It can only feed it — a Figma frame is an *input* a mockup is built from, and the mockup still has to be a real, clickable, full-viewport HTML page because that is what the developer approves.

Two consequences:

- **Never paste MCP-generated code into `src/`.** The server's default output is React + Tailwind. This codebase uses plain co-located CSS files (`src/app/warCouncil/warCouncilCards.css` and its siblings) and has no Tailwind. Generated markup is a description of a layout, to be re-authored under `.claude/skills/react-frontend/SKILL.md`, not a patch.
- **The hard floor still applies to anything derived from a Figma frame.** A Figma artboard is a fixed-pixel canvas; the shell rules in `full-viewport-layout.md` (`dvh`/`svh`, no `100vh`, no `100vw`, `overflow: hidden`, safe-area insets, `clamp()` bounds) are not expressible in it. Treat frame dimensions as one named viewport size, never as the layout contract.

A Figma frame from the developer is a sketch of intent, not a spec — the same reading the project already applies to hand-drawn developer mockups.

## Reaching the server

Two servers exist. **The remote one is what is installed here.**

| | Remote | Desktop |
|---|---|---|
| Endpoint | `https://mcp.figma.com/mcp` (HTTP transport) | local server inside the Figma desktop app |
| Needs the desktop app running | No | Yes — Dev Mode toggled on (`Shift+D`) in an open **design** file, then *Enable desktop MCP server* in the inspect panel |
| Selection model | link-based — you paste a node URL | follows the live selection in the app |
| Tool set | full, including the create/edit tools | inspection subset |

Install (already done in this repo — listed as the `figma` server):

```
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

**Auth is OAuth and is the developer's to complete. It is now done** — as of 2026-08-26 the server is authorised for `jossduffy.jd@gmail.com` and the full tool set is present. If it ever lapses, the signature is the server surfacing only `mcp__figma__authenticate` and `mcp__figma__complete_authentication`; `authenticate` returns a URL for the developer to open, and if the localhost callback page fails to load the address-bar URL is still valid and goes to `complete_authentication`. Do not attempt to authenticate on the developer's behalf without asking.

Figma's docs do not state a plan or seat requirement for the remote server on the installation page. The desktop server is documented as requiring a Dev or Full seat on a paid plan. *(Seat requirement read from a search summary of the help-centre article, not the primary text — the help centre 302s to a login wall. Treat as unconfirmed.)*

### The budget, and why it decides whether Figma is viable at all

Tool calls are metered per seat, not per plan, and this is the single most important number on the page — a session can run out mid-design, which is exactly what happened on 2026-08-26. From the server's own `file://figma/docs/rate-limits-access.md` resource (fetch it with `ReadMcpResourceTool`; it is also linked from any rate-limit error):

| Seat | Starter | Professional | Organization | Enterprise |
|---|---|---|---|---|
| View / Collab | 20 / month | 6 / month | 6 / month | 6 / month |
| Dev / Full | 20 / month | 200 / day · 10 / min | 200 / day · 15 / min | 600 / day · 20 / min |

Education matches Professional Dev/Full. **A View or Collab seat on a paid plan gets fewer calls than the free Starter plan** — the allowance tracks the seat type, so upgrading the plan without upgrading the seat makes things worse. Per-seat monthly prices from `figma.com/pricing` (fetched 2026-08-26): Professional $16 Full / $12 Dev / $3 Collab; Organization $55 / $25 / $5; Enterprise $90 / $35 / $5. Only Professional bills monthly. The cheapest upgrade that changes anything is **Professional + a Dev seat, $12/month**; a Full seat buys no extra MCP allowance.

`whoami`, `create_new_file` and `add_code_connect_map` are exempt. `use_figma` and `get_screenshot` are **not** — they are the two you actually spend, and a build-then-look loop burns two per step. Budget the whole design before the first call, and prefer `await node.screenshot()` inside a `use_figma` script over a separate `get_screenshot` call: it returns the image inline and costs one call instead of two.

*(Counting caveat, observed: this account is Starter/View, i.e. 20/month. The session that hit the cap had made 8 `use_figma` and 3 `get_screenshot` calls — 11, not 20 — with no other known usage. Either earlier activity was unaccounted for or reads and writes are metered differently than the doc implies. Treat 20 as a ceiling you may reach early, not a budget you can plan to spend exactly.)*

## The tools, grouped by what you would actually use them for

Names are exact, from Figma's *Tools and prompts* reference (primary source). `(remote)` marks tools the remote server exposes and the desktop server does not.

**Reading a design — the ones that matter for this project**

- `get_metadata` — sparse XML of the selection: layer IDs, names, types, positions, sizes. **Call this first on anything larger than a single component.** It is the cheap map you then target.
- `get_design_context` — the main one (formerly `get_code`). Returns code context for a node; defaults to React + Tailwind, redirectable in the prompt (`generate my Figma selection in Vue`). Set `clientFrameworks` to your exact Code Connect label if mappings exist.
- `get_screenshot` — PNG of the selection. **Fetch this alongside any context call**, always, as visual ground truth against a payload that may have been truncated.
- `get_variable_defs` — the variables and styles in the selection: colours, spacing, typography. This is the tool that turns a design into tokens rather than into numbers.
- `get_motion_context` — keyframe data with CSS `@keyframes` and easing curves.

**Code Connect** — `get_code_connect_map`, `get_code_connect_suggestions`, `add_code_connect_map`, `send_code_connect_mappings`, `get_context_for_code_connect` (remote). Maps Figma components to real source paths so generated context references your components instead of inventing markup.

**Writing into Figma** (remote) — `use_figma` (general create/edit/inspect), `generate_figma_design` (push live UI back as layers), `create_new_file`, `upload_assets`, `download_assets` (≤20 nodes per call), `generate_diagram` (Mermaid → FigJam), `search_design_system`, `get_libraries`, `whoami`.

**Other** — `get_figjam` (FigJam → XML plus screenshots), the shader tools (`list_shader_effects`, `list_shader_fills`, `get_shader_effect`, `get_shader_fill`), and the `weave_*` workflow-runner tools. `weave_run_tool` confirms cost before running — it is a spend, so it is the developer's call.

There is one prompt, `create_design_system_rules`, which generates a rules file describing how to translate that design system into code.

## Best practice, in the order it bites

Ranked by how much damage getting it wrong does, not by how often it is mentioned.

1. **Select small.** A page-sized selection produces a large XML payload that truncates silently and yields incomplete or wrong output. Split a screen into Header / Board / Hand / HUD and fetch each. Figma's own guidance is that if the call feels slow or stuck, the selection is too big.
2. **`get_metadata` before `get_design_context`.** Map, then target. Fetching context for the whole tree to find one node is the expensive mistake.
3. **Screenshot everything you read.** Truncation is not always reported. The PNG is how you notice.
4. **Variables, never hardcoded fills.** Colours, spacing, radii and type mapped to Figma variables are what `get_variable_defs` can return. A frame full of literal hex values returns literal hex values, and those are tuning decisions this project does not let an agent invent — they route to the developer.
5. **Auto Layout everywhere.** It is the only place responsive *intent* is encoded; it maps to Flexbox. A frame of absolutely-positioned rectangles carries no intent to extract, and absolute positioning is precisely what the no-scroll shell forbids.
6. **Components with variants, semantically named.** Variants (default / selected / disabled / loading) tell the agent the UI's state set. For a card hand, this is what distinguishes "raised card" from "a card that is 8px higher".
7. **Layer names are the API.** PascalCase components, kebab-case layers, no `Frame 427`.
8. **Code Connect if the component library is real.** It is what makes generated context reuse actual source components. For a prototype with one screen it is overhead; for a stable component set it is the difference between reuse and re-authoring.
9. **Annotate behaviour that geometry cannot show** — hover and focus states, transitions, responsive rules. Static geometry cannot express them, and this skill's floor says nothing a decision needs may be hover-only, which is a claim about behaviour, not layout.
10. **Say the framework and the styling in the prompt.** Here: React 19 function components, plain co-located CSS, no Tailwind, no CSS-in-JS.

Reported accuracy on well-structured files is roughly 85–90%, with responsive breakpoints, interaction states and accessibility named as the residue needing manual work. *(This figure is from a practitioner blog post surfaced in search, not from Figma — it is a vendor-adjacent estimate, and it happens to leave out exactly the three things this skill's hard floor is about. Do not quote it as a guarantee.)*

## Reject conditions

1. Reject any change that lands MCP-generated Tailwind classes, inline style objects, or `Frame 427`-style names in `src/`.
2. Reject a `get_design_context` call on a whole page or board without a preceding `get_metadata` pass.
3. Reject design context read without a matching `get_screenshot`, and any claim about a layout made from XML alone.
4. Reject a layout that carries a Figma frame's fixed pixel dimensions into the shell in place of `dvh`/`svh` and `clamp()` bounds.
5. Reject any size bound, colour, glyph, easing duration or spacing value taken from a Figma frame and presented as settled. It is a tuning value; it is the developer's. Extracted variables are a *proposal* to be confirmed, not an approval.
6. Reject an unprompted authentication attempt, and any `weave_run_tool` call — both are the developer's to authorise.
7. Reject Figma output offered in place of the `mockup.html` gate. The gate wants an interactive HTML page.

## Where this research is thin

- **Fetched as primary text:** Figma's *Tools and prompts* reference (full tool list), the *Remote server installation* page (endpoint URL, `claude mcp add` command, OAuth flow), the docs index, and DeepWiki's mirror of `figma/mcp-server-guide`'s best-practices chapter.
- **Search summary only, not primary:** the desktop-server seat requirement and the Dev Mode enable steps (help centre is behind a Zendesk login redirect); the 85–90% accuracy figure (practitioner blog).
- **404 at the time of writing:** `developers.figma.com/docs/figma-mcp-server/best-practices/`. The practice list above is assembled from the DeepWiki chapter plus a LogRocket file-structuring article, and should be re-checked against Figma's own page if it returns.
- **Now observed, 2026-08-26 (this section previously read "not verified at all — the server is unauthenticated"):** the server is authenticated and the write path works end to end. `whoami` → `create_new_file` → repeated `use_figma` built a three-screen board from scratch. Confirmed: the mandatory-skill preamble is real and the skills load as MCP resources (`skill://figma/figma-use/SKILL.md`, `skill://figma/figma-create-new-file/SKILL.md`) via `ReadMcpResourceTool`; `create_new_file` needs a `planKey` from `whoami`; scripts are atomic, so a thrown error leaves the file untouched. Still undocumented here because they were never exercised: every read tool (`get_design_context`, `get_variable_defs`, `get_motion_context`, `get_figjam`), all Code Connect tools, and every `weave_*` tool.

### Observed gotchas the vendor skill does not warn about

- **`figma.createFrame()` fills white.** Passing `fills: []` inside the same `.set({...})` that also sets `width`/`height` did not clear it — the frames rendered as white blocks and needed a second pass assigning `node.fills = []` on its own. Set fills in a separate statement, and screenshot before assuming a container is transparent.
- **`node.query()` rejects `/` in an attribute value.** `query('FRAME[name=zone/felt]')` throws `Invalid selector: unexpected character '/'`. Slash-delimited layer names are the natural convention (`zone/felt`, `card/Bronze/Bell-High`) and they break the selector engine, so reach for `children.find(c => c.name === '…')` instead of `query` whenever names contain slashes.
- **A text node given a fixed width needs `textAutoResize='HEIGHT'` set before `resize()`**, or it collapses — the vendor skill says this and it is correct; it bites immediately on any wrapped card copy.
- **Two-tone card faces need the ink colour named explicitly.** `color-mix(in srgb, currentColor …)` on a child resolves `currentColor` against *that child's own* `color`, which is easy to set to the light field colour first — producing a light-on-light bar that is invisible and silently passes review. The same bug shipped into the HTML mockup; see `SKILL.md` → *Mocking a screen up*.

### What the two media actually cost, measured once

Building the same buff-gallery screen both ways on 2026-08-26: Figma took 12 metered tool calls for three static frames and ran out of allowance before the design was finished; the HTML mockup took one file write plus three patches, and running it surfaced four defects that the Figma frames could not have exposed (an invisible `color-mix()` bar, `[hidden]` losing to `display:flex`, cards with width but no height, and a missing narrow breakpoint that left the fenced group unreachable). This is one observation, not a benchmark — but it is why `SKILL.md` puts HTML first.

## Sources

- [Tools and prompts — Figma Developer Docs](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
- [Remote server installation — Figma Developer Docs](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- [Figma MCP server — docs index](https://developers.figma.com/docs/figma-mcp-server/)
- [Guide to the Figma MCP server — Figma Help Center](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)
- [Introducing our Dev Mode MCP server — Figma Blog](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [Best Practices — figma/mcp-server-guide (DeepWiki)](https://deepwiki.com/figma/mcp-server-guide/8-best-practices)
- [Figma pricing](https://www.figma.com/pricing/) — per-seat prices, fetched 2026-08-26
- `file://figma/docs/rate-limits-access.md` — the MCP server's own rate-limit resource, read via `ReadMcpResourceTool`
- [How to structure Figma files for MCP and AI-powered code generation — LogRocket](https://blog.logrocket.com/ux-design/design-to-code-with-figma-mcp/)
