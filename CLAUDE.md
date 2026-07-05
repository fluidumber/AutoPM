# ProductFlow — CLAUDE.md

## Codebase Ground Truth

**Language**: Vanilla JavaScript, Node.js ES Modules. No TypeScript. No transpilation.
**MCP SDK**: Official `@modelcontextprotocol/sdk` (stdio transport). Not FastMCP.
**Persistence**: File-based only. No SQLite, no Postgres. Two stores:
  - Global brain: `data/brain-database.json`
  - Per-product workspace: `~/.productflow/products/<slug>/`
**Output**: Notion-compatible markdown in `assets/pdd/`, HTML in `plans/`, robot assets in `assets/`.
**UI**: None. All output is files.

---

## Directory Layout

```
src/                  MCP server + workspace layer
  mcp-server.js       All MCP tool registrations
  workspace/          WorkspaceManager, AssetStore, ContextStore,
                      FreshnessTracker, ProductRegistry, PMProfile,
                      pdd-composer.js (Phase 2)
robots/               One file per robot
leader/               team-leader.js — orchestrator and session management
brain/                brain-database.js, learning-engine.js, robot-memory.js
utils/                file-storage.js, keywords.js, presentation-generator.js,
                      pdd-renderer.js (Phase 2)
data/                 brain-database.json (global)
plans/                HTML presentation artifacts
docs/                 Reference documents
```

### Product Workspace Layout

```
~/.productflow/
  pm-profile.md
  products/<slug>/
    product.md                  name, stage, targetMarket, competitors, tags, phase
    freshness.json              lastRun timestamps + asset paths per robot
    context/
      interview-answers.md      Phase 1 PM answers (Q&A keyed by question ID)
      notes.md                  Ad-hoc PM notes and URLs
      index.json                Context entry metadata index
      documents/                Analyst reports, pasted docs
      phase2-context.json       Phase 2 PM inputs (tech stack, regions, owner, links)
      daci.json                 DACI + key contacts (PM-confirmed, persists across runs)
    assets/
      YYYY-MM-DD-<robot>.md         Robot prompt payload (YAML frontmatter + JSON)
      YYYY-MM-DD-<robot>-output.md  Claude's generated analysis text (saved via save-robot-output)
      pdd/
        pdd-<slug>-v<semver>.md     Notion-compatible PDD markdown (primary)
        pdd-<slug>-v<semver>.json   PDD JSON (full schema, machine-readable)
        pdd-<slug>-latest.md        Copy of latest version
```

---

## Robot Architecture — The Golden Rules

### 1. Every robot is self-contained

No shared template engine. No base class. Each robot file is independently readable
and deployable. If you need similar logic in two robots, copy it — do not abstract it.

### 2. The `_claudeInstructions` pattern

Every `analyze()` method returns this shape:

```js
const analysis = {
  productIdea: context.productIdea || context.summary,

  _claudeInstructions: {
    role: `You are [RobotName], a [specific expert identity with domain + years]...`,
    mandate: [
      "Rule 1 — specific, actionable, non-negotiable",
      "NEVER do X",
      "ALWAYS include Y",
    ],
    // robot-specific context and sections...
    requiredSections: {
      sectionName: {
        instructions: "What Claude must produce here",
        mustInclude: ["Specific element 1", "Specific element 2"],
      },
    },
  },

  productContext: { /* key fields for reference */ },

  outputFormat: {
    style: "...",
    tables: "...",
    length: "...",
  },
};
```

The MCP server reads `_claudeInstructions.role` as the system prompt and constructs
the user message from `mandate` + `requiredSections` + `productContext`.

### 3. Double-parse guard — every robot, no exceptions

```js
const context = typeof enrichedContext === "string"
  ? JSON.parse(enrichedContext)
  : enrichedContext;
```

### 4. Context field names — use exactly these

Phase 1 robots read from `context.answers.*`:

| Field | Description |
|---|---|
| `context.answers.target_geo` | Geography |
| `context.answers.market_segment` | B2B / B2C / B2B2C |
| `context.answers.pain_point` | Core problem |
| `context.answers.why_existing_fail` | Differentiation basis |
| `context.answers.known_competitors` | Competitor list |
| `context.answers.revenue_model` | Monetisation approach |
| `context.answers.willingness_to_pay` | Pricing anchor |
| `context.answers.funding_stage` | Stage context |
| `context.answers.timeline` | MVP target |
| `context.answers.team_size` | Resource constraint |
| `context.answers.tech_preferences` | Tech constraints |
| `context.answers.buyer_vs_user` | Buyer/user split |
| `context.answers.market_size_known` | Prior market sizing |
| `context.answers.reference_companies` | Benchmark companies |
| `context.answers.data_sources` | Preferred sources |

Also use `context.brandTerms[]` to exclude product name from search queries (Scout, Detective).
Also use `context.robotHints.scout`, `.detective`, `.people`, `.money`, `.plan` for pre-packaged context.

### 5. Phase 2 robots receive extended context — always via TeamLeader

Phase 2 robots receive an extended enrichedContext built by `TeamLeader._buildPhase2Context()`:

```js
{
  ...enrichedContext,       // all Phase 1 PM interview answers
  phase1Outputs: {          // Claude's saved analysis text per robot
    scout: "markdown text",
    detective: "markdown text",
    people: "markdown text",
    feature: "markdown text",
    // ... etc.
  },
  phase2Context: { ... },   // from context/phase2-context.json
}
```

Never hard-code asset paths or file I/O in robot code. All disk I/O goes through
the workspace layer in `team-leader.js`.

Phase 1 outputs are loaded from `assets/YYYY-MM-DD-<robot>-output.md` (saved when PM
calls `save-robot-output` after each Phase 1 robot run). If an output file doesn't exist,
the robot falls back to the `productContext` object from the prompt payload.

### 6. JSDoc all inputs and outputs

The PDD composer depends on field shapes being predictable. Every Phase 2 robot's
`analyze()` must have a JSDoc `@typedef` for both input and output. Inline comments
on every non-obvious field.

---

## Output Conventions — Verdict Blocks, Audience Views, Renderer Fences

### 1. Machine-readable verdict block — Phase 1a robots feed the Synthesizer

Every Phase 1a robot (scout, detective, people, money) mandates a `json`-fenced
verdict block as the VERY LAST element of Claude's generated output. The Synthesizer
parses these via `_extractVerdictBlock()` — it scans every `json` fence in the saved
output and keeps the last valid one whose `robot` field matches — and uses them as
the authoritative numeric inputs for its weighted two-axis (Support × Maturity)
investment scoring.

Common schema (all scores are JSON numbers 0–100, never strings):

```json
{
  "robot": "scout",
  "verdict": "STRONG | MODERATE | WEAK",
  "hypothesisSupportScore": { "low": 55, "base": 68, "high": 80 },
  "evidenceMaturityScore": { "low": 30, "base": 42, "high": 55 },
  "confidenceStatus": "preliminary | pm-reviewed",
  "evidenceTier": "researched-cited"
}
```

Per-robot dimension score field and evidence tier:

| Robot | Score field | evidenceTier |
|---|---|---|
| scout | `hypothesisSupportScore` | `researched-cited` |
| detective | `competitivePositionScore` | `researched-cited` |
| people | `userRelevanceScore` | `pm-interview-derived` |
| money | `financialViabilityScore` | `modeled-with-benchmarks` |

Rules:

- The block must be the final element of the output — downstream parsers rely on position.
- JSON values must match the narrative verdict exactly — no prose/JSON divergence.
- When calling `save-robot-output`, keep the verdict block in BOTH `htmlText` and
  `cleanMarkdown` — the Synthesizer reads the saved `cleanMarkdown`.
- Synthesizer downgrade rule: if Scout's `confidenceStatus` is `preliminary`, or any
  dimension's evidence maturity is below 40, the verdict is capped at CONDITIONAL GO.
- A new robot that feeds the Synthesizer must emit this block AND be added to the
  Synthesizer's weighting rubric — one without the other breaks the investment math.

### 2. `audienceViews` — three-layer output structure

Analysis robots define `outputFormat.audienceViews` with exactly these three keys,
and the generated output is ordered accordingly:

| Key | Position | Content |
|---|---|---|
| `executiveBriefing` | FIRST | 60-second C-suite view — verdict banner, headline numbers, one visual. No methodology. |
| `pmWorkingLayer` | MIDDLE | The full analysis — all working detail. |
| `analystAppendix` | LAST (before the JSON verdict block, where one exists) | Assumptions register, sources with dates, scoring rubrics, methodology notes. |

New robots with long-form narrative output must follow this convention so PMs can
consume any robot's output at the depth they need.

### 3. Renderer fence rules — `utils/html-renderer.js`

`renderHtml()` converts saved markdown to a styled HTML document. How fences render:

| Fence language | Rendering |
|---|---|
| `html` | Passed through raw — scripts and canvases execute |
| `mermaid` | Wrapped in `<div class="mermaid">` |
| `json` containing `vega-lite` (must be valid JSON) | Rendered as a live chart via vega-embed |
| Anything else (including plain `json` verdict blocks) | Escaped `<pre><code>` |

Multi-line raw HTML that starts with a block-level tag (`<script>`, `<div>`,
`<table>`, `<canvas>`, …) is buffered until the tag closes and passed through
unwrapped — never `<p>`-wrapped. Robot prompts must still mandate wrapping every
multi-line HTML/script block in an `html` fence (see `htmlRequired` in existing
robots); the raw passthrough is a safety net, not the convention.

---

## Saving Robot Output — Required for Phase 2

After each robot run, Claude must call `save-robot-output` with the full markdown
text of its generated analysis. This is what enables Phase 2 robots to build on
Phase 1 content.

The saved output file (`YYYY-MM-DD-<robot>-output.md`) is distinct from the prompt
payload file (`YYYY-MM-DD-<robot>.md`). The payload file contains the `_claudeInstructions`
structure. The output file contains Claude's actual generated analysis text.

---

## Learning Loop — Hook Every Robot In

All robots (Phase 1 and Phase 2) go through `TeamLeader.runSingleRobot()`, which
automatically calls `LearningEngine.getImprovementHints(robotName)` and attaches
`result._improvementHints` before passing to Claude.

No manual wiring needed in robot files — just register the robot in the appropriate
`ROBOT_ORDER` array and the `this.robots` map in `team-leader.js`.

Feedback rating rules (in `saveFeedback()`):
- Rating ≥ 4 → `learnFromSuccess()`
- Rating < 4 → `learnFromFailure()`

---

## MCP Tool Registration Pattern

Every new tool in `src/mcp-server.js` follows this structure:

```js
server.tool(
  "tool-name",
  `Description of the tool and when to call it.`,
  {
    paramName: z.string().describe("What this param is for"),
    optionalParam: z.string().optional().describe("..."),
  },
  async ({ paramName, optionalParam }) => {
    // implementation
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);
```

`console.log` is redirected to `stderr` at the top of `mcp-server.js` — never use
`process.stdout.write` in tool handlers.

---

## Prompt Quality Rules (from productflow-prompt-engineer skill)

1. **Role assignment must be specific**: "You are User-Stories, a senior PM with 12
   years of enterprise product experience. Your job is to..." — never "You are a
   helpful assistant."

2. **Mandate array enforces guardrails**: Use "NEVER" and "ALWAYS" explicitly.
   Vague intentions produce vague output.

3. **No placeholders in output**: If data is unavailable, reason from what exists and
   flag it as an estimate. Never return "To be determined" or "Research needed."

4. **Brand-agnostic in code**: No organisation names, product names, or vendor names
   in hardcoded robot code — `role` strings, `mandate` arrays, `requiredSections`,
   or `outputFormat` objects. The product under analysis is always "the product" or
   referenced by `context.productIdea`.
   > **Note**: This rule applies to robot code only, not to PM-provided runtime context.
   > PMs naturally reference their own product name, company name, and competitors in
   > their interview answers and phase2-context — that is expected and correct.

5. **Search query hygiene (Scout, Detective)**: Use `context.brandTerms[]` to strip
   product name from domain keyword extraction. Queries must describe the problem
   domain, not the product name.

---

## Robot Reviewer Checklist (from productflow-robot-reviewer skill)

Before committing any robot file, verify:

- [ ] Double-parse guard present in `analyze()`
- [ ] Extracts from `context.answers.*` using correct question IDs (Phase 1 robots)
- [ ] Uses `context.phase1Outputs.*` for Phase 1 data (Phase 2 robots)
- [ ] `_claudeInstructions.role` is specific and expert
- [ ] `mandate` array has ≥ 5 concrete rules with NEVER/ALWAYS
- [ ] `requiredSections` are specific to this robot's output type
- [ ] PM heuristics embedded where relevant
- [ ] `outputFormat` specifies style, schema, length
- [ ] JSDoc `@typedef` on input and output shapes (Phase 2 robots)
- [ ] No brand names hardcoded in any prompt text
- [ ] Robot registered in `ROBOT_ORDER` / `ROBOT_ORDER_PHASE_2` in team-leader.js
- [ ] Robot key added to `run-robot` and `feedback` Zod enums in mcp-server.js

---

## Robot Order and Staleness Windows

**CRITICAL RULE: Single Source of Truth**
The list, order, and phase categorisation of all robots is centrally defined in `src/config/robot-registry.js`. Do NOT hardcode robot arrays anywhere else in the codebase.

To add a new robot:
1. Create the robot class in `robots/`.
2. Add its name to the appropriate array (`PHASE1A_ROBOTS`, `PHASE1B_ROBOTS`, or `PHASE2_ROBOTS`) in `src/config/robot-registry.js`.
3. Add its staleness window to `ROBOT_STALENESS_DAYS` in `src/workspace/freshness-tracker.js`.
4. Register the instance in `team-leader.js`.

Staleness defaults:
- Phase 1a (Core): scout 90d, detective 60d, people 180d, money 90d
- Phase 1b (Asks): epic 30d, feature 30d, plan 30d, priority 30d
- Phase 2 (Execution): user-stories/scope-spec/gtm-readiness/risks-registry 30d, feasibility-tech/feasibility-design 60d, customer-journeys/data-privacy/kpis 90d, daci-stakeholders 180d

**Phase gate**: All 7 Phase 1 robots must be `fresh` before any Phase 2 robot can run.
Enforced by `promote-to-phase-2` MCP tool (Phase 2 batch).

**Phase 2 intake**: `context/phase2-context.json` — scaffolded by `promote-to-phase-2`,
updated by `phase2-context-update` tool. All Phase 2 robots read from this file.

**DACI persistence**: `context/daci.json` — PM-confirmed metadata, not AI analysis.
Persists across runs. `daci-stakeholders` robot loads existing file and asks
"Has anything changed?" rather than starting from scratch.

**PDD export**: `assets/pdd/pdd-<slug>-v<semver>.md` + `.json`
Semver: patch = re-run same scope, minor = new robot output added, major = PM declares new scope.

---

## ProductFlow v2 — Phase 2 Execution Build

*Build started: 2026-04-25*

### Phase 2 New Files

| File | Purpose |
|---|---|
| `robots/user-stories-robot.js` | MoSCoW-tagged user stories from personas + features |
| `robots/scope-spec-robot.js` | Scope, assumptions, constraints, critical-change flag |
| `robots/feasibility-tech-robot.js` | Architecture, tech concerns, vendors, infra deps |
| `robots/feasibility-design-robot.js` | Design principles, wireflow, accessibility |
| `robots/customer-journeys-robot.js` | End-to-end journey narratives per persona |
| `robots/data-privacy-robot.js` | InfoSec/Legal/Certification impact matrix |
| `robots/gtm-readiness-robot.js` | CX stage matrix, rollout waves, preview→GA |
| `robots/risks-registry-robot.js` | Structured risk register across 5 categories |
| `robots/kpis-robot.js` | Adoption/retention/usage/revenue KPIs with targets |
| `robots/daci-stakeholders-robot.js` | DACI table + key contacts |
| `src/workspace/pdd-composer.js` | Assembles PDD JSON from all robot outputs |
| `utils/pdd-renderer.js` | PDD JSON → Notion-compatible markdown + HTML |

### Phase 2 Modified Files (additive only)

| File | What changes |
|---|---|
| `leader/team-leader.js` | `ROBOT_ORDER_PHASE_2`, `PHASE2_GATE_ROBOTS`, phase2 context builder |
| `src/mcp-server.js` | `save-robot-output` tool + updated Zod enums per batch |
| `src/workspace/freshness-tracker.js` | 10 new staleness entries |
| `src/workspace/workspace-manager.js` | `getPhase2ContextPath()`, `getDACIPath()`, `getPDDDir()` |
| `src/workspace/asset-store.js` | `saveRobotOutput()`, `loadLatestRobotOutput()` |

### Non-Negotiables

- No existing robot files are modified
- No existing MCP tool signatures change
- No existing workspace layout changes
- Phase 2 robots never re-prompt PM for Phase 1 context
- All output is specific to the product — zero generic filler
- No brand or organisation names hardcoded in any robot code or prompt templates
