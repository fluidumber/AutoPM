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

## Phase 1 Robot Order and Staleness Windows

```
ROBOT_ORDER = ["scout", "detective", "people", "money", "feature", "plan", "priority"]

Staleness: scout 90d, detective 60d, people 180d, money 90d,
           feature/plan/priority 30d each
```

---

## Phase 2 Robot Order and Staleness Windows

```
ROBOT_ORDER_PHASE_2 = [
  "user-stories",         // reads: people-output, feature-output
  "scope-spec",           // reads: feature-output, plan-output
  "feasibility-tech",     // reads: feature-output, scope-spec-output, phase2-context
  "feasibility-design",   // reads: people-output, feature-output
  "customer-journeys",    // reads: people-output, feature-output
  "data-privacy",         // reads: feature-output, feasibility-tech-output
  "gtm-readiness",        // reads: plan-output, money-output, phase2-context
  "risks-registry",       // reads: plan-output, feasibility-tech-output, gtm-readiness-output
  "kpis",                 // reads: money-output, plan-output, priority-output
  "daci-stakeholders",    // reads: context/daci.json, phase2-context, interview-answers
]

Staleness: user-stories/scope-spec/gtm-readiness/risks-registry 30d,
           feasibility-tech/feasibility-design 60d,
           customer-journeys/data-privacy/kpis 90d,
           daci-stakeholders 180d
```

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
