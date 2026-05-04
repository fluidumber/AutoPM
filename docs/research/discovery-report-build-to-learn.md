# Discovery Report: Evolving ProductFlow into a Product Discovery Engine

**Date:** 2026-05-02  
**Status:** IMPLEMENTED — all 6 files modified, syntax verified ✅  
**Source:** SVPG "Build to Learn FAQ" (Marty Cagan, April 2026) + ProductFlow knowledge graph (327 nodes, 601 edges, 25 communities)

---

## 1. Problem Statement

ProductFlow today is a **linear, single-path system**. The PM interviews once, robots run in a fixed sequence (Phase 1 → Gate → Phase 2), and the output is a single PDD. This maps to the "Build to Earn" model described by SVPG — it optimises for producing a deliverable document, not for learning whether the solution is correct.

The SVPG article identifies four product risks that must be actively tested before committing to delivery: **Value**, **Usability**, **Feasibility**, and **Viability**. ProductFlow already has robots that address all four (PeopleRobot, CustomerJourneysRobot, FeasibilityTechRobot, MoneyRobot, etc.), but the architecture currently prevents the iterative, multi-solution testing loop that SVPG calls "Build to Learn."

## 2. What the Graph Tells Us

| Signal | Evidence | Implication |
|--------|----------|-------------|
| **WorkspaceManager is the god node** (26 edges) | Everything routes through it — persistence, context, freshness | Good: centralised persistence layer. Risk: no alternative data input path bypasses it |
| **Document Rendering is the largest community** (C3, 25 nodes, cohesion 0.22) | `renderMarkdown()`, `mdTable()`, 17+ render functions | The system's gravitational centre is *document production*, not *learning* |
| **Each robot is an isolated island** (C10–C25, cohesion 0.43–0.50) | No robot talks to another robot directly; all pipe through TeamLeader | Good for independence. Bad for "multiple solutions competing" — there is no lateral channel |
| **TeamLeader has highest betweenness centrality** (0.082) | Single bridge between Brain, Leader Gate, and Robots | All decision-making flows through one chokepoint — no room for parallel solution branches |
| **ContextStore is thin** (C7, 15 nodes, cohesion 0.28) | Only stores notes, URLs, documents, and interview answers | No schema for external research files, survey results, or experiment feedback |
| **Gate traversal is strictly sequential** (G1→G8, no branching) | `gate-traversal.js` evaluates gates in linear order | Cannot represent "run 3 experiment variants in parallel, then converge" |
| **UserStoriesRobot outputs a flat list** | Single `userStories[]` array with MoSCoW tags | No concept of "Solution Cluster A vs B vs C" — cannot model competing alternatives |

## 3. Proposed Changes — Two Pillars

### Pillar A: External Research Ingestion & Validation Loop

**The problem:** Today, the only input path is the InterviewRobot. If the PM has existing user research, survey data, or competitive analysis from external tools, there is no structured way to feed it in before the robots run.

**What changes:**

1. **Expand `CONTEXT_TYPES`** in `ContextStore` to include `"research"`, `"survey-result"`, and `"experiment-feedback"` alongside the existing `note`, `url`, `document`, `analyst-report`.
2. **Add a `loadResearchContext(slug)` method** to `ContextStore` that aggregates all research-type entries into a single text block. This block becomes available to any robot via `enrichedContext.researchContext`.
3. **Wire research context into robot `_extract*` methods.** Each robot's `analyze()` already receives `enrichedContext` — add `researchContext` as an optional field. Robots that benefit from external data (PeopleRobot, FeatureRobot, MoneyRobot) read it; others ignore it.
4. **Add a new MCP tool: `add-research`** that wraps `ContextStore.add()` with `type: "research"`. The PM can call this at any time — before the interview, between robot runs, or after Phase 1.
5. **FreshnessTracker awareness:** When new research is added for a product, mark relevant robots as `stale` so the PM is prompted to re-run them with the new data. This is the "feedback loop" — new evidence triggers re-evaluation.

**What does NOT change:** No new robots. No new gate. The existing `TeamLeader → Robot → AssetStore` flow stays intact. We are widening the input funnel, not rebuilding the pipeline.

### Pillar B: Multi-Solution Experiment Clusters

**The problem:** `UserStoriesRobot` produces one flat array of stories. There is no way to model "Solution A (heavy automation) vs Solution B (human-in-the-loop)" and let the PM test both before committing. SVPG is explicit: "building to learn is primarily about solving the problem, and that's where we need to spend most of our time."

**What changes:**

1. **Refactor `UserStoriesRobot` output schema** from a flat `userStories[]` to an `experimentClusters[]` array. Each cluster contains its own `hypothesis`, `userStories[]`, and `moscowDistribution`. The existing flat output becomes the default single-cluster case (backwards compatible).
2. **Add `clusterCount` to the `_claudeInstructions` mandate.** Default is `1` (current behaviour). When the PM (or a future ValidationRobot) sets `clusterCount: 3` in the phase2Context, Claude generates 3 alternative solution clusters instead of 1.
3. **Add a convergence step to `PDDComposer`.** When `experimentClusters.length > 1`, the composer presents a comparison table. The PM selects the winning cluster (or a hybrid). Only the selected cluster flows into the final PDD.
4. **Add a new MCP tool: `select-experiment`** that takes a `clusterId` (or array of story IDs from multiple clusters) and writes the selection to `context/experiment-selection.json`. `PDDComposer.assemble()` reads this file to know which cluster to render.
5. **Future (not in scope now):** A `PrototypeRobot` that calls external design tools to generate wireframes per cluster. A `ValidationRobot` that generates interview scripts to test each cluster with users. These are flagged as future work to avoid scope creep.

**What does NOT change:** The gate system (G1–G8) is untouched. Phase 1 robots are untouched. The `TeamLeader` orchestration flow stays the same. We are branching the output of one robot and adding a convergence point before the PDD, not rebuilding the pipeline.

## 4. What Is Explicitly Out of Scope

- **No new robots** in this iteration. No `ResearchRobot`, `ValidationRobot`, or `PrototypeRobot`. We add capabilities to existing modules.
- **No design tool integration.** Wireframe/prototype generation is a future pillar.
- **No changes to Phase 1.** Scout, Detective, People, Money, Feature, Plan, Priority are untouched.
- **No changes to the gate system.** G1–G8 stay sequential. Experiment clusters operate within G6 (Phase 2 in progress), not as a new gate.

## 5. Files Affected (Estimated)

| File | Change Type | Scope |
|------|-------------|-------|
| `src/workspace/context-store.js` | Modify | Add 3 new context types, add `loadResearchContext()` |
| `robots/user-stories-robot.js` | Modify | Refactor output schema to support `experimentClusters[]` |
| `src/workspace/pdd-composer.js` | Modify | Read `experiment-selection.json`, filter to selected cluster |
| `src/mcp-server.js` | Modify | Add `add-research` and `select-experiment` MCP tools |
| `src/workspace/freshness-tracker.js` | Modify | Add `invalidateOnResearch()` to mark robots stale when new research arrives |
| `leader/team-leader.js` | Minor | Pass `researchContext` into `enrichedContext` when building Phase 2 context |

## 6. Open Questions for the PM

1. **Cluster count default:** Should the system always generate multiple clusters, or should it default to 1 (current behaviour) and only branch when the PM explicitly requests it?
2. **Research-triggered staleness:** When the PM adds new research, which robots should go stale? Only the directly relevant ones (e.g., new persona research → PeopleRobot), or all Phase 1 robots?
3. **Hybrid selection:** When converging experiment clusters, should the PM be able to cherry-pick individual stories from different clusters, or only select one complete cluster?
4. **Scope of Pillar A in this iteration:** Should we build the `add-research` MCP tool immediately, or first validate the concept by manually placing research files in `context/documents/` and having the robots read them?

---

**Next step:** Approve or iterate on this report. No code will be written until the direction is confirmed.
