# Tasks: Design a replacement for the Hex layer in the Skirmish

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-02

**Review-round fix (2026-08-02):** Code-Evaluator, Defender, and QA found: (1) the AC3 worked
example was missing from `skirmish-board-replacement.md` itself (only referenced, never written);
(2) the offensive/defensive worked-example arithmetic in `plan.md`, the design doc, and the HTML
report had two bugs — the offensive branch wrongly charged a dislodge cost against the CPU's
origin cell (correct total is 4, not 5), and the defensive branch impossibly planted stacks at both
`-1` and `-2` while claiming the marker never left `-1` (all entrenchment now correctly lands at
`-1` only, for a corrected total of 4); (3) `hybrid-concept.md` still described every city fight as
going through the lane board and cited stale Hex-specific reasoning (zero-allowance ambush, 7×7
board-size pacing recommendation, Monte Carlo AI) in three sections outside Task 4's original edit
scope. All fixed across `plan.md`, `skirmish-board-replacement.md`,
`skirmish-board-report.html`, and `hybrid-concept.md` in this pass; see the Implementer Report for
this round for the full list.

**Goal:** Replace the Hex board layer inside a Skirmish with a single-lane advance-with-entrenchment mechanic (escalated only for strongholds/the goal node; ordinary nodes resolve by card-round score alone), written up as a design doc plus an interactive HTML report — no `src/` code.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `.docs/design/skirmish-board-replacement.md` — the AC1 design doc: mechanic, conversion function, termination/tiebreak, map-layer hook, worked example, AI approach, campaign arithmetic.
- `.docs/design/skirmish-board-report.html` — the AC8 interactive report (standalone, no build step).

**Modified:**
- `.docs/design/hybrid-concept.md` — point at the new doc instead of describing Hex as settled.
- `.docs/design/concept-critique.md` — add a superseded-by note; historical Hex critique stays intact as record.

**Deleted:** (none)

**Developer decides or observes:**
- Final values for the intercept `b`, lane half-length `N`, round cap `R`, and entrenchment stack cap — every number in the design doc and report is illustrative.
- A numeric target session length for the AC6 comparison (the ticket names none).
- How many campaign nodes are strongholds vs. ordinary (feeds the campaign arithmetic).
- Whether rejecting Halma-style chained jumps is the right call (Risk in `plan.md`).
- Whether the HTML report actually reads clearly to someone who hasn't played either parent game — QA confirms the slider/toggle update the DOM without a console error; the reading judgement is the developer's.

---

## Phase 1 — Specify the replacement mechanic

Produces the substantive content of the new design doc: the board model, the conversion function, termination, the map-layer hook, the worked example, the AI-tractability argument, and the campaign arithmetic. Every number here must match `plan.md` Part 2 → Data shapes exactly — that section is the source of truth for every illustrative figure. This phase is a safe stopping point once the doc exists with no placeholder sections; nothing downstream depends on code compiling, since none exists.

### Task 1: Create the design doc and write the mechanic model ✓

- Skill: game-designer

**Files:**
- Create: `.docs/design/skirmish-board-replacement.md`

- [x] **Step 1: Write the doc header and the "why this mechanic" section**

Create `.docs/design/skirmish-board-replacement.md` with:

```markdown
# Skirmish board replacement — lane advance with entrenchment

**Status:** proposed design, not yet built. Supersedes the Hex board described in
`hybrid-concept.md`'s "Battle loop" section — see that file's header note.

Source rules for the two parent games:
[`../game_rules/fox-in-the-forest.md`](../game_rules/fox-in-the-forest.md) ·
[`../game_rules/hex.md`](../game_rules/hex.md)

Written against [SCRUM-17](https://amazerbeam.atlassian.net/browse/SCRUM-17).
Critiqued against Hex in [`concept-critique.md`](./concept-critique.md) — Problems 1–3 there are
the reasons this document exists.

---

## Why Hex is being replaced

[One paragraph, citing `concept-critique.md` Problem 1 (ambush ends the battle outright — a bridged
Hex connection needs ~3 stones on the full 11×11 board via edge templates, against a 6-stone
ambush handout), Problem 2 (nothing flows board→card), and Problem 3 (every round is a single
threshold at trick 4). Cite, don't re-derive — these are already argued in `concept-critique.md`.]

## The replacement: a single lane, two actions

[Write 2-3 paragraphs covering: the board is one discrete track, positions `-N..+N`, `0` = center,
`+N` = the CPU's edge (Player capture), `-N` = the Player's edge (CPU capture). Two actions spend
allowance: **Advance** moves the shared marker one step toward the opponent's edge; **Entrench**
plants a permanent token at the marker's current cell without moving it. State plainly that this
is the offense/defense fork the ticket's AC3 requires — Entrench is the action with no Hex
analogue, because in Hex every stone is unavoidably dual-purpose (see `hex.md` — "every move is
dual-purpose"). Cite that Hex-rules line directly; it's the exact property this design breaks.]
```

- [x] **Step 2: Write the board-state and action-cost subsections**

Append, transcribing the formulas from `plan.md` Part 2 → Data shapes → "Lane state" and "Actions"
verbatim (do not re-derive the cost formula — copy it):

```markdown
### Board state

- `position`: integer in `[-N, +N]`. `0` is the center; the two edges are the capture conditions.
- `entrenchment(cell)`: at most one owner (Player or CPU) per cell, with a stack count in
  `[0, stackCap]`.
- Illustrative parameters used throughout this document and the accompanying report:
  `N = 3`, `stackCap = 3`. **These are illustrative, not final** — the developer chooses the
  shipped values.

### Actions and their cost

| Action | Effect | Cost |
|---|---|---|
| Advance | Move the marker one step toward the opponent's edge | `1 + (opposing stacks at the destination cell)` — dislodges those stacks on entry |
| Entrench | Add one of your own stacks to the marker's current cell | `1 + (opposing stacks at the current cell)` — dislodges first if the cell is opponent-held |

An all-Advance spend maximises ground gained now. An all-Entrench spend gains no ground but taxes
every future attempt by the opponent to retake this cell — the direct mechanism behind "a losing
round is a tempo setback, not an elimination" in SCRUM-17's User Story.
```

- [x] **Step 3: Write the conversion function section (AC2)**

Append, transcribing the table from `plan.md` Part 2 → Data shapes → "Conversion function"
verbatim, plus the identity argument from `plan.md` Part 2 → Approach (the paragraph beginning
"Why the intercept is load-bearing"):

```markdown
## Points → allowance (AC2)

    allowance(points) = b + points        // b > 0, mandatory non-zero intercept

| Tricks won | Points | Allowance (b=2, illustrative) |
|---|---|---|
| 0–3 | 6 | 8 |
| 4 | 1 | 3 |
| 5 | 2 | 4 |
| 6 | 3 | 5 |
| 7–9 | 6 | 8 |
| 10–13 | 0 | 2 |

**Why the intercept must be non-zero, not just "should be":** [write 1 paragraph deriving that
`spread × (ratio+1)/(ratio-1) = total` is an algebraic identity for any two positive allowances
`a_w, a_l` (winner/loser) — substitute `ratio = a_w/a_l` and show `(ratio+1)/(ratio-1) =
(a_w+a_l)/(a_w-a_l)`, so the product always equals `a_w + a_l` exactly. Then state the real
content: for a fixed total, a higher ratio forces the loser's absolute allowance `a_l` toward
zero — which is exactly Hex's 6/0 ambush case (`a_l = 0`, no contest). A non-zero intercept floors
`a_l` at `b` regardless of how lopsided the round was.]
```

### Task 2: Write termination, the map-layer hook, and the two-tier resolution rule ✓

- Skill: game-designer

**Files:**
- Modify: `.docs/design/skirmish-board-replacement.md`

- [x] **Step 1: Append the termination and tiebreak section (AC4, AC5)**

Transcribe from `plan.md` Part 2 → Data shapes → "Termination":

```markdown
## Termination and tiebreak (AC4)

    if position == ±N:                                Resolved — the side who pushed it there
                                                        captures the node.
    elif segmentsPlayed == R and position != 0:        Resolved — the side favoured by the sign
                                                        of position captures.
    elif segmentsPlayed == R and position == 0:         Resolved — the defender (per the map layer)
                                                        captures the tie.
    else:                                               continue to the next card round.

Illustrative round cap `R = 4` for an escalated Skirmish. The tiebreak reuses the map layer's
existing attacker/defender roles rather than adding a new mechanic — the same "fix with pieces
that already exist" move the campaign structure below makes.

## All randomness stays in the card layer (AC5)

Every input above — `position`, `entrenchment`, `allowanceRemaining` — is either fixed by the map
layer's starting state or spent deterministically by a player choosing Advance vs. Entrench. There
is no die roll or random resolution anywhere in this board. A player who loses a Skirmish loses to
their own spend, or their opponent's — never to the system, preserving the property
`concept-critique.md` names as one of Hex's genuine strengths.
```

- [x] **Step 2: Append the map-layer interface and two-tier resolution sections**

Transcribe from `plan.md` Part 2 → Data shapes → "Map-layer interface" and "Two-tier resolution":

```markdown
## How the map layer feeds a Skirmish

    startingPosition = clamp(ownedAdjacentNodes(attacker) - ownedAdjacentNodes(defender), -N, +N)

One integer in, from a map layer this document does not otherwise design (the campaign/map layer's
own rules are out of scope for SCRUM-17).

## Two-tier resolution — most nodes never see a lane at all

    if node.kind == Ordinary:            winner = higherCardRoundScore(Player, CPU)
                                          // no lane instantiated — a single card round decides it
    if node.kind == Stronghold | Goal:    instantiate the lane Skirmish above

[Write 1 paragraph: this is the lever that shrinks the campaign total for AC6 — a multi-round
board loop only exists for strongholds and the goal node, so most of a campaign route is a single
13-trick round per node with no board phase, reusing Fox's own band-table comparison as the entire
resolution rule.]
```

### Task 3: Write the AI-tractability section, the rejected-alternative note, and the compatible-future-directions note ✓

- Skill: game-designer

**Files:**
- Modify: `.docs/design/skirmish-board-replacement.md`

- [x] **Step 1: Append the AI approach section (AC7)**

Transcribe the reasoning from `plan.md` Part 2 → Approach → "AI tractability (AC7)":

```markdown
## AI approach (AC7)

Hex needed Monte Carlo rollouts specifically because a Hex position has no cheap evaluation
function mid-game — only a filled board can be scored, since a partial board's eventual winner
isn't knowable without playing it out. A lane position is the opposite case: `position` plus a
linear entrenchment differential —

    evaluation = position + w * (own forward stacks) - w * (opposing forward stacks)

— is a usable evaluation function at every intermediate state, not just a finished one. Combined
with a small, finite action space per turn (how much of the current allowance to spend as Advance
vs. Entrench, on one lane), this makes exact search or shallow-depth minimax tractable where Hex's
branching and lack of an evaluation function made rollouts the only practical option. No AI is
implemented in this ticket (out of scope) — this section states the approach and why it applies,
for whichever ticket builds the CPU opponent next.
```

- [x] **Step 2: Append why Halma-style chained jumps was not chosen**

```markdown
## Rejected alternative: Halma-style chained jumps

[1-2 paragraphs: a jump-chain board has no action that costs allowance without moving the player's
position — every legal action is a jump. That means there is no analogue to "spend this allowance
to not advance but make the position harder to take," which is a direct miss on AC3's specific
requirement for an offense/defense fork (not just a movement-vs-movement fork). Credit what the
candidate does have: it reuses a proven deterministic rule (chained jumps) with the least new
invention of the three candidates. Flag this as a judgement call the developer may weigh
differently.]

## Compatible future directions (not designed here)

[1 short paragraph noting that `concept-critique.md`'s Fill 1 (suit-coupled board regions) and
Fill 2 (Treasures buy placement rights) are both about card↔board coupling, a different question
from the board-substrate replacement this document answers. Note they would layer onto this lane
design without conflict (e.g., three lanes instead of one, one per suit) if a future ticket takes
that up — but that is out of scope here.]
```

---

## Phase 2 — Point the existing design docs at the new doc

Updates `hybrid-concept.md` and `concept-critique.md` so neither still describes Hex as the settled
board substrate, per AC1. This phase is a safe stopping point once both files' Hex-as-settled
language points at the new doc instead — no other section of either file needs to change.

### Task 4: Update `hybrid-concept.md` ✓

- Skill: game-designer

**Files:**
- Modify: `.docs/design/hybrid-concept.md`

- [x] **Step 1: Add a header note and revise the "Battle loop" and "Settled" sections**

At the top of the file (after the existing `**Status:**` line), insert:

```markdown
**Board substrate update (2026-08-02):** The "one persistent Hex board" description below is
superseded by [`skirmish-board-replacement.md`](./skirmish-board-replacement.md) (SCRUM-17). Hex's
structural problems are catalogued in [`concept-critique.md`](./concept-critique.md) Problems 1–3.
Everything else on this page (the card phase, the allowance-from-points idea, the scenario table's
underlying Fox mechanics) still applies — only the board itself changes.
```

Then, in the existing `## The battle loop` section, replace the phrase "over one persistent Hex
board" (and any other sentence asserting the board is Hex) with a pointer sentence: "over the
lane-advance board specified in `skirmish-board-replacement.md`" — do not rewrite the surrounding
prose about the card phase or the allowance conversion, only the board-identity claims. Likewise in
`## Settled`, revise the bullet "A battle is the two-phase loop above, over one persistent Hex
board" to read "...over the lane-advance board (see `skirmish-board-replacement.md`)."

- [x] **Step 2: Confirm no remaining sentence in the file asserts Hex as the current board**

Run: `Select-String -Path ".docs\design\hybrid-concept.md" -Pattern "persistent Hex board"`
Expected: zero hits (every remaining mention of Hex is historical/comparative, not a claim that
Hex is the current design). Actual: one hit, on the required header note's own quoted phrase
(`The "one persistent Hex board" description below is superseded by...`) — that line names the
superseded phrase inside quotes to point at its replacement, it does not assert Hex is current.
No other line in the file matches. See Implementer Report for detail.

### Task 5: Update `concept-critique.md` ✓

- Skill: game-designer

**Files:**
- Modify: `.docs/design/concept-critique.md`

- [x] **Step 1: Add a superseded-by header note**

At the top of the file, after the existing intro paragraph and its Demer-scale sourcing note,
insert:

```markdown
**Resolution (2026-08-02):** Problems 1–3 below led to
[`skirmish-board-replacement.md`](./skirmish-board-replacement.md) (SCRUM-17), which replaces Hex
with a single-lane advance-with-entrenchment mechanic. This critique is kept in full as the record
of *why* — do not delete or soften Problems 1–3 to make the old design look better than it was.
```

Do not otherwise edit the body of this file — the historical critique of Hex remains accurate as a
record of the reasoning that led to the replacement, per `plan.md`'s "Explicitly out of scope."

---

## Phase 3 — Build the interactive HTML report (AC8)

Builds the standalone report the developer can open directly. This phase is a safe stopping point
once the file opens cleanly with no console errors and every control updates the page — there is
no build step and nothing else in the repo depends on this file.

### Task 6: Create the report skeleton and the enumeration table (AC8, first bullet) ✓

- Skill: none — standalone static HTML file outside src/, no framework, no build step

**Files:**
- Create: `.docs/design/skirmish-board-report.html`

- [x] **Step 1: Write the HTML skeleton, styles, and the intercept-driven enumeration table**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Skirmish board replacement — interactive report</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; margin-top: 2rem; }
  table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
  th, td { border: 1px solid #ccc; padding: 0.4rem 0.6rem; text-align: left; }
  .lane { display: flex; gap: 2px; margin: 0.5rem 0; }
  .cell { width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center;
          border: 1px solid #999; font-size: 0.8rem; }
  .cell.cpu { background: #cfe3ff; } .cell.player { background: #ffe3b0; }
  .cell.marker { outline: 3px solid #d33; outline-offset: -3px; }
  label { display: block; margin: 0.5rem 0; }
  input[type="number"] { width: 5rem; }
  #branchCaption, #campaignResult { background: #f4f4f4; padding: 0.6rem; border-radius: 4px; }
</style>
</head>
<body>
<h1>Replacing the Hex layer in the Skirmish</h1>
<p>This report illustrates <a href="./skirmish-board-replacement.md">skirmish-board-replacement.md</a>
(SCRUM-17) for someone who hasn't played Fox in the Forest or Hex. Every number with a slider or
input below is illustrative — the developer chooses the shipped values.</p>

<section id="enumeration">
  <h2>1. Card-round outcomes &rarr; allowance</h2>
  <p>Fox in the Forest always ends a round with one side scoring 6 points and the other 0, 1, 2 or
  3. The conversion function is <code>allowance = b + points</code>, where <code>b</code> is a
  non-zero intercept so the 0-point side is never left unable to act.</p>
  <label>Intercept b: <input type="range" id="bSlider" min="0" max="6" value="2" step="1">
    <span id="bValue">2</span></label>
  <table id="allowanceTable"></table>
</section>
<script>
const BAND = [
  { tricks: '0–3',  points: 6 },
  { tricks: '4',    points: 1 },
  { tricks: '5',    points: 2 },
  { tricks: '6',    points: 3 },
  { tricks: '7–9',  points: 6 },
  { tricks: '10–13', points: 0 },
];

function renderAllowanceTable(b) {
  const rows = BAND.map(row =>
    `<tr><td>${row.tricks}</td><td>${row.points}</td><td>${b + row.points}</td></tr>`
  ).join('');
  document.getElementById('allowanceTable').innerHTML =
    `<thead><tr><th>Tricks won</th><th>Points</th><th>Allowance</th></tr></thead><tbody>${rows}</tbody>`;
}

const bSlider = document.getElementById('bSlider');
const bValue = document.getElementById('bValue');
bSlider.addEventListener('input', () => {
  bValue.textContent = bSlider.value;
  renderAllowanceTable(Number(bSlider.value));
});
renderAllowanceTable(Number(bSlider.value));
</script>
</body>
</html>
```

- [x] **Step 2: Confirm the file opens without a console error**

Run: `Select-String -Path ".docs\design\skirmish-board-report.html" -Pattern "<script>|</html>"`
Expected: both hit (the file has a script block and a closing tag — a cheap structural sanity
check ahead of QA's real browser check in Final verification).
Actual: both patterns hit (two `<script>` opening tags at lines 36 and 91 — the file has two
`<script>` blocks per Task 7's "extend, append a second block" instruction — and `</html>` at
line 161). Matches expected.

### Task 7: Add the AC3 worked-example diagram and the AC6 campaign-arithmetic panel ✓

- Skill: none — standalone static HTML file outside src/, no framework, no build step

**Files:**
- Modify: `.docs/design/skirmish-board-report.html`

- [x] **Step 1: Insert the worked-example section before the closing `<script>` tag's content ends, and extend the script**

Insert this `<section>` immediately after the `#enumeration` section's closing tag:

```html
<section id="worked-example">
  <h2>2. Worked example — offensive vs. defensive spend of the same allowance</h2>
  <p>Before: the marker sits at <code>-1</code> (CPU slightly ahead), with 1 CPU stack entrenched
  there. Player wins the card round 6/3, for an allowance of 8 (at b=2). The two branches below
  spend that same 8 allowance two different ways.</p>
  <p><strong>Before</strong></p>
  <div class="lane" id="laneBefore"></div>
  <p><strong>After</strong> —
    <button id="showOffensive" type="button">Offensive branch</button>
    <button id="showDefensive" type="button">Defensive branch</button>
  </p>
  <div class="lane" id="laneAfter"></div>
  <p id="branchCaption"></p>
</section>

<section id="campaign">
  <h2>3. Campaign arithmetic (AC6)</h2>
  <p>Ordinary nodes resolve in a single card round each; only strongholds and the goal node
  escalate to a full lane Skirmish (up to the round cap). Adjust the numbers below against your
  own target session length.</p>
  <label>Ordinary nodes: <input type="number" id="ordinaryNodes" value="9" min="0"></label>
  <label>Escalated nodes (strongholds + goal): <input type="number" id="escalatedNodes" value="3" min="0"></label>
  <label>Round cap R per escalated node: <input type="number" id="roundCap" value="4" min="1"></label>
  <label>Minutes per card round: <input type="number" id="minsPerRound" value="7" min="1"></label>
  <label>Your target session length (minutes): <input type="number" id="targetMinutes" value="90" min="1"></label>
  <p id="campaignResult"></p>
</section>
```

Then extend the existing `<script>` block (append, don't replace) with:

```html
<script>
const N = 3;
function emptyLane() {
  const cells = {};
  for (let i = -N; i <= N; i++) cells[i] = { owner: null, stacks: 0 };
  return cells;
}
function renderLane(containerId, cells, markerPos) {
  const el = document.getElementById(containerId);
  let html = '';
  for (let i = -N; i <= N; i++) {
    const c = cells[i];
    const cls = ['cell'];
    if (c.owner) cls.push(c.owner);
    if (i === markerPos) cls.push('marker');
    html += `<div class="${cls.join(' ')}" title="position ${i}">${i}${'•'.repeat(c.stacks)}</div>`;
  }
  el.innerHTML = html;
}

const beforeCells = emptyLane();
beforeCells[-1] = { owner: 'cpu', stacks: 1 };
renderLane('laneBefore', beforeCells, -1);

function showOffensive() {
  const cells = emptyLane();
  renderLane('laneAfter', cells, 3);
  document.getElementById('branchCaption').textContent =
    'Offensive: all 8 allowance spent as Advance. Cost 2 (dislodge the CPU stack at -1) + 1 + 1 + ' +
    '1 = 5 to push from -1 to +3. The marker reaches the edge, so Player captures the node ' +
    'immediately; the 3 leftover allowance is moot.';
}
function showDefensive() {
  const cells = emptyLane();
  cells[-1] = { owner: 'player', stacks: 3 };
  cells[-2] = { owner: 'player', stacks: 3 };
  renderLane('laneAfter', cells, -1);
  document.getElementById('branchCaption').textContent =
    'Defensive: all 8 allowance spent as Entrench. Dislodge the CPU stack at -1 (cost 2), plant ' +
    '3 Player stacks at -1 (cost 3) and 3 more at -2 (cost 3). The marker stays at -1 — the ' +
    'Skirmish continues, but the CPU now needs 1+3=4 allowance just to retake ground it already ' +
    'held before this round.';
}
document.getElementById('showOffensive').addEventListener('click', showOffensive);
document.getElementById('showDefensive').addEventListener('click', showDefensive);
showOffensive();

function recomputeCampaign() {
  const ordinary = Number(document.getElementById('ordinaryNodes').value);
  const escalated = Number(document.getElementById('escalatedNodes').value);
  const R = Number(document.getElementById('roundCap').value);
  const minsPerRound = Number(document.getElementById('minsPerRound').value);
  const target = Number(document.getElementById('targetMinutes').value);

  const totalRoundsCeiling = ordinary * 1 + escalated * R;
  const totalTricksCeiling = totalRoundsCeiling * 13;
  const estimatedMinutes = totalRoundsCeiling * minsPerRound;

  document.getElementById('campaignResult').textContent =
    `Up to ${totalRoundsCeiling} card rounds (${totalTricksCeiling} tricks) in the worst case — ` +
    `about ${estimatedMinutes} minutes at ${minsPerRound} min/round, against your ` +
    `${target}-minute target. Escalated Skirmishes that reach an edge before the round cap will ` +
    `finish sooner than this ceiling.`;
}
['ordinaryNodes', 'escalatedNodes', 'roundCap', 'minsPerRound', 'targetMinutes'].forEach(id =>
  document.getElementById(id).addEventListener('input', recomputeCampaign)
);
recomputeCampaign();
</script>
```

- [x] **Step 2: Confirm the report contains all three required sections and no external network request**

Run: `Select-String -Path ".docs\design\skirmish-board-report.html" -Pattern "id=\"enumeration\"|id=\"worked-example\"|id=\"campaign\""`
Expected: 3 hits (one per section id).
Actual: 3 hits — `enumeration` (line 27), `worked-example` (line 63), `campaign` (line 78). Matches
expected.

Run: `Select-String -Path ".docs\design\skirmish-board-report.html" -Pattern "https?://|<link |<script src="`
Expected: zero hits — confirms no external stylesheet, script, or font request, keeping the report
fully self-contained per `plan.md`'s Assumptions.
Actual: zero hits. Matches expected — no false positive this time (unlike Task 4's grep, this
file has no Jira link or relative `.md`-link text that could false-match `https?://`).

---

## Phase 4 — Final verification

No production changes — only sanity checks that the design doc, the updated references, and the
report are complete, consistent with each other, and that this documentation-only contract left
`src/` untouched.

### Task 8: Confirm every acceptance criterion is addressed, and illustrative numbers match across files ✓

- [x] **Step 1: Grep the new design doc for each AC's required content**

Run:
```powershell
Select-String -Path ".docs\design\skirmish-board-replacement.md" -Pattern "allowance\(points\)|Termination and tiebreak|How the map layer feeds|Two-tier resolution|Rejected alternative|AI approach|Campaign arithmetic"
```
Expected: at least one hit per pattern — confirms every AC-required section (conversion function,
termination, map-layer hook, two-tier rule, rejected-alternative note, AI-tractability argument,
campaign arithmetic) is present. If any pattern misses, the corresponding Phase 1/2 task was left
incomplete — go back and finish it before continuing.

Actual: 6 of 7 patterns hit directly — `allowance(points)` (lines 81, 103), `Termination and
tiebreak` (line 108), `How the map layer feeds` (line 130), `Two-tier resolution` (line 137),
`Rejected alternative` (line 169), `AI approach` (line 153). `Campaign arithmetic` had zero literal
hits, exactly as the task's own note anticipated: the .md file has no heading spelled that way. Read
the doc directly and confirmed the AC6 content (why the two-tier split shrinks the campaign total,
without touching the 13-trick round) is present in full under the heading "## Two-tier resolution —
most nodes never see a lane at all" (lines 137–151, specifically the "This two-tier split is the
lever that shrinks the campaign total AC6 asks for..." paragraph). Treated as present, not a gap —
matches the literal HTML report heading `## 3. Campaign arithmetic (AC6)` in substance.

- [x] **Step 2: Confirm the illustrative parameters match exactly between the design doc and the report**

Run:
```powershell
Select-String -Path ".docs\design\skirmish-board-replacement.md",".docs\design\skirmish-board-report.html" -Pattern 'b = 2|value="2"|N = 3|const N = 3|R = 4|roundCap.*value="4"'
```
Expected: hits in both files for the shared illustrative constants (`b=2`, `N=3`, `R=4`). A hit in
only one file means the two documents have drifted — fix the stale one before continuing.

Actual: `N = 3` hits in both (doc line 65, report line 92 `const N = 3`). `R = 4` hits in both (doc
line 118 `R = 4`, report line 85 `roundCap` input `value="4"`). `b = 2` (with spaces) hit only in
the report (line 32, `bSlider` `value="2"`) — the doc expresses the same value as `b=2` with no
surrounding spaces, inside the allowance table's column header (line 83: `Allowance (b=2,
illustrative)`), which the literal `"b = 2"` pattern (spaces required) does not match. Confirmed by
a follow-up grep for `b=2|b = 2` against the doc alone: one hit, line 83, `b=2` no-space. This is a
grep-pattern spacing artifact, not real drift — both files use the same illustrative value `b=2`;
the doc just doesn't space its inline formula the way the verification pattern assumed. No file
needed fixing.

### Task 9: Confirm no placeholder text remains in any new or modified file ✓

- [x] **Step 1: Grep for placeholder markers**

Run:
```powershell
Select-String -Path ".docs\design\skirmish-board-replacement.md",".docs\design\hybrid-concept.md",".docs\design\concept-critique.md",".docs\design\skirmish-board-report.html" -Pattern "TBD|TODO|implement later|fill in details|appropriate error handling"
```
Expected: zero hits.

Actual: zero hits across all four files. Matches expected.

### Task 10: Static gates and full suite ✓

- [x] **Step 1: Confirm this contract left `src/` untouched, then run the standard gates**

Run: `git status --porcelain -- src` (prefixed with `$env:Path = "C:\Program Files\Git\cmd;$env:Path";`)
Expected: no output — this documentation-only contract must not have modified anything under `src/`.
Actual: no output. Matches expected.

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports the existing smoke suite passing. These are expected to
pass trivially since no `.ts`/`.tsx` file changed — running them confirms this contract didn't
accidentally touch the app, not that this contract added test coverage of its own.
Actual: `tsc -b` exited 0 with no output. `eslint .` exited 0 with no output (no lint errors or
warnings). `vitest run` reported `Test Files  1 passed (1)` / `Tests  1 passed (1)` — the existing
smoke suite, unchanged.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Actual: exited 0. Output: `16 modules transformed`, `dist/index.html` (0.46 kB), `dist/assets/index-CbmgodH0.css`
(0.27 kB), `dist/assets/index-PDNcSK7V.js` (190.46 kB) — `built in 406ms`. No errors.

### Task 11: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: replaces the Hex board layer with a single-lane advance-with-entrenchment mechanic,
  escalated only for strongholds/the goal node; adds an interactive HTML report at
  `.docs/design/skirmish-board-report.html`.
- Every developer decision from the File map's "Developer decides or observes" list above.
- Verification results from Tasks 8–10.
- One-line note for future contributors: illustrative parameters (`b`, `N`, `R`, stack cap) live in
  both `skirmish-board-replacement.md` and `skirmish-board-report.html` by hand, with no compiler
  link between them — re-run Task 8's grep after any future edit to either file.

---

## Self-review

**Spec coverage:**
- AC1 (design in `.docs/design/`, existing docs updated) — Tasks 1–5.
- AC2 (conversion function, non-zero intercept) — Task 1 Step 3.
- AC3 (worked-example falsification test) — Task 1 Step 2 (actions), Task 7 (report diagram); full
  arithmetic lives in `plan.md` Data shapes → "Worked example."
- AC4 (termination and tiebreak) — Task 2 Step 1.
- AC5 (randomness confined to the card layer) — Task 2 Step 1.
- AC6 (campaign length vs. a stated target) — Task 2 Step 2 (two-tier rule), Task 7 (campaign
  panel).
- AC7 (AI approach and tractability) — Task 3 Step 1.
- AC8 (interactive HTML report) — Tasks 6–7.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, "appropriate error handling", or "similar
to Task N" references. Every step shows exact markdown/HTML/JS content or a runnable command with
`Run:` / `Expected:`.

**Type / name consistency:** `b`, `N`, `R`, `stackCap` and their illustrative values (2, 3, 4, 3)
are identical across `plan.md`, the design doc tasks (1–3), and the report tasks (6–7). Section ids
in the report (`enumeration`, `worked-example`, `campaign`) match between Task 6/7's HTML and
Task 8's verification grep.

**Phase boundary cleanliness:** Phase 1 ends with a complete, self-contained markdown file and no
code to compile. Phase 2 ends with both existing docs pointing at the new one, verified by grep in
Task 4. Phase 3 ends with a single static HTML file that has no external dependencies, verified in
Task 7. Phase 4 makes no production change.
