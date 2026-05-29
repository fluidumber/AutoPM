# Graph Report - anewapp  (2026-04-30)

## Corpus Check
- 50 files · ~55,220 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 260 nodes · 342 edges · 40 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Robot Swarm & Shared Data Contracts|Robot Swarm & Shared Data Contracts]]
- [[_COMMUNITY_Brain, Learning & Persistence|Brain, Learning & Persistence]]
- [[_COMMUNITY_Markdown  YAML Parser|Markdown / YAML Parser]]
- [[_COMMUNITY_PM Profile & Persona Management|PM Profile & Persona Management]]
- [[_COMMUNITY_Asset Store & PDD Composition|Asset Store & PDD Composition]]
- [[_COMMUNITY_Context Store & Staleness Tracking|Context Store & Staleness Tracking]]
- [[_COMMUNITY_Detective & Interview Robots|Detective & Interview Robots]]
- [[_COMMUNITY_Learning Loop & Gate Enforcement|Learning Loop & Gate Enforcement]]
- [[_COMMUNITY_Phase 1 Analysis Robots|Phase 1 Analysis Robots]]
- [[_COMMUNITY_Rendering & Presentation|Rendering & Presentation]]
- [[_COMMUNITY_Interview Robot Dialogue Engine|Interview Robot Dialogue Engine]]
- [[_COMMUNITY_System Architecture Overview|System Architecture Overview]]
- [[_COMMUNITY_PDD Templates & Examples|PDD Templates & Examples]]
- [[_COMMUNITY_Asset Feedback Subsystem|Asset Feedback Subsystem]]
- [[_COMMUNITY_Deployment & Setup|Deployment & Setup]]
- [[_COMMUNITY_Workspace Manager|Workspace Manager]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]
- [[_COMMUNITY_Miscellaneous|Miscellaneous]]

## God Nodes (most connected - your core abstractions)
1. `enrichedContext (shared data contract across all robots)` - 19 edges
2. `MCP Tool: run-robot` - 17 edges
3. `_claudeInstructions pattern` - 13 edges
4. `TeamLeader class` - 12 edges
5. `PMProfile.save` - 10 edges
6. `resolvePolicy (freshness-tracker)` - 8 edges
7. `phase1Outputs (shared data shape)` - 8 edges
8. `ProductRegistry.get` - 8 edges
9. `ProductRegistry.create` - 8 edges
10. `PMProfile._migrateLegacyIfNeeded` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Phase 1 Robots: Interview, Scout, Detective, People, Money, Feature, Plan, Priority` --semantically_similar_to--> `ASSEMBLY_ROBOTS constant (Phase1+Phase2 robot list)`  [INFERRED] [semantically similar]
  README.md → src/workspace/pdd-composer.js
- `Phase 2 Robots: User Stories, Scope Spec, Customer Journeys, Feasibility Tech, Feasibility Design, KPIs, Data Privacy, GTM Readiness, Risks Registry, DACI Stakeholders` --semantically_similar_to--> `ASSEMBLY_ROBOTS constant (Phase1+Phase2 robot list)`  [INFERRED] [semantically similar]
  README.md → src/workspace/pdd-composer.js
- `DaciStakeholdersRobot._deriveSectionStatus` --semantically_similar_to--> `FreshnessTracker.getRobotFreshness`  [INFERRED] [semantically similar]
  robots/daci-stakeholders-robot.js → src/workspace/freshness-tracker.js
- `PDDComposer` --implements--> `PDD JSON Schema (meta, featureOverview, executiveSummary, daci, scope, userStories, etc.)`  [INFERRED]
  src/workspace/pdd-composer.js → docs/pdd-examples/temp.txt
- `extractDomainKeywords` --semantically_similar_to--> `PeopleRobot._deriveSegments`  [INFERRED] [semantically similar]
  utils/keywords.js → robots/people-robot.js

## Hyperedges (group relationships)
- **Robot Orchestration Flow (TeamLeader → Robots → Brain → Persistence)** — teamleader_teamleader, teamleader_runsinglerobot, planrobot_analyze, peoplerobot_analyze, feasibilitytechrobot_analyze, risksregistryrobot_analyze, learningengine_learningengine, braindatabase_braindatabase [INFERRED 0.92]
- **Phase Gate Enforcement (freshness + gate check + phase2 context)** — teamleader_checkphase2gate, gatetraversal_traversegates, concept_robot_freshness, concept_phase1_phase2_gate, teamleader_buildphase2context [INFERRED 0.88]
- **Feedback → Learning → Hints Loop** — teamleader_savefeedback, braindatabase_savefeedback, learningengine_learnfromsuccess, learningengine_learnfromfailure, learningengine_getimprovementhints, teamleader_hydratelearner [EXTRACTED 0.95]
- **Phase 2 robots share the _extractPersonaContext + _extractFeatureContext + phase1Outputs pattern** — customerjourneysrobot_analyze, userstoriesrobot_analyze, feasibilitydesignrobot_analyze, dataprivacyrobot_analyze [EXTRACTED 0.95]
- **Interview → enrichedContext → Robot pipeline** — interviewrobot_buildenrichedcontext, concept_enrichedcontext, mcpserver_tool_interview, mcpserver_tool_runrobot [INFERRED 0.90]
- **Staleness policy resolution: compiled defaults → project policy → persona override → product override** — freshnesstracker_resolvepolicy, freshnesstracker_robotstalenesssdays, freshnesstracker_interviewstalenessdays, concept_stalenesspolicy [EXTRACTED 0.95]
- **Workspace Layer Core: WorkspaceManager + PMProfile + ProductRegistry share path resolution and file I/O** — workspacemanager_workspacemanager, pmprofile_pmprofile, productregistry_productregistry [EXTRACTED 0.95]
- **PDD Assembly Pipeline: PDDComposer + AssetStore + WorkspaceManager assemble product definition documents** — pddcomposer_pddcomposer, assetstore_assetstore, workspacemanager_workspacemanager [EXTRACTED 0.95]
- **Markdown Parsing Layer: parseMarkdownDoc + getSection + getListSection form the document parsing API** — markdowndoc_parsemarkdowndoc, markdowndoc_getsection, markdowndoc_getlistsection [EXTRACTED 0.95]

## Communities

### Community 0 - "Robot Swarm & Shared Data Contracts"
Cohesion: 0.06
Nodes (56): _claudeInstructions pattern, enrichedContext (shared data contract across all robots), phase1Outputs (shared data shape), CustomerJourneysRobot.analyze, CustomerJourneysRobot, CustomerJourneysRobot._extractFeatureContext, CustomerJourneysRobot._extractPersonaContext, DaciStakeholdersRobot.analyze (+48 more)

### Community 1 - "Brain, Learning & Persistence"
Cohesion: 0.1
Nodes (26): BrainDatabase class, loadFromDisk, saveAnalysis, saveFeedback, FeasibilityTechRobot class, loadData, saveData, hydrateFromPersistedFeedback (+18 more)

### Community 2 - "Markdown / YAML Parser"
Cohesion: 0.14
Nodes (23): AssetStore, coerceYamlScalar (internal), formatYamlValue (internal), getListSection, getSection, Minimal Markdown+YAML Frontmatter Parser (no external dep), parseMarkdownDoc, parseSimpleYaml (internal) (+15 more)

### Community 3 - "PM Profile & Persona Management"
Cohesion: 0.17
Nodes (21): PMProfile.addProduct, PMProfile.createPersona, PMProfile._getActivePersonaSlug, Legacy pm-profile.md Migration to profiles/default, PMProfile.listPersonas, PMProfile.load, PMProfile._migrateLegacyIfNeeded, Multi-Persona Layout (profiles/active.json + slug dir) (+13 more)

### Community 4 - "Asset Store & PDD Composition"
Cohesion: 0.12
Nodes (20): AssetStore.loadLatestRobotOutput, Phase 2 Output File Pattern (YYYY-MM-DD-robot-output.md), AssetStore._renderMarkdown (internal), AssetStore.saveRobotOutput, AssetStore.saveRobotResult, CLAUDE.md Phase 2 Execution Build Specification, CLAUDE.md Robot Architecture Golden Rules (_claudeInstructions pattern, double-parse guard), PDDComposer.assemble (+12 more)

### Community 5 - "Context Store & Staleness Tracking"
Cohesion: 0.15
Nodes (17): Staleness Policy (multi-level resolution), ContextStore.add, ContextStore, CONTEXT_TYPES constant, ContextStore.get, ContextStore.list, ContextStore.loadInterviewAnswers, ContextStore.saveInterviewAnswers (+9 more)

### Community 6 - "Detective & Interview Robots"
Cohesion: 0.21
Nodes (13): DetectiveRobot.analyze, DetectiveRobot, DetectiveRobot._extractCompetitorList, DetectiveRobot._generateSearchQueries, InterviewRobot._buildEnrichedContext, InterviewRobot robotHints.money, InterviewRobot robotHints.detective, InterviewRobot robotHints.people (+5 more)

### Community 7 - "Learning Loop & Gate Enforcement"
Cohesion: 0.24
Nodes (11): Learning Loop (feedback → learning engine → improvement hints), Phase 1 → Phase 2 Gate (workflow gate enforcement), Robot Freshness / Staleness Tracking, traverseGates, getImprovementHints, AssetStore (persistence test usage), FreshnessTracker (persistence test usage), _buildPhase2Context (+3 more)

### Community 8 - "Phase 1 Analysis Robots"
Cohesion: 0.24
Nodes (10): _claudeInstructions pattern (robot prompt architecture), FeasibilityTechRobot.analyze, FeasibilityTechRobot._extractFeatureContext, FeasibilityTechRobot._extractScopeContext, PlanRobot.analyze, PlanRobot._derivePhases, RisksRegistryRobot.analyze, RisksRegistryRobot._extractFeasibilityContext (+2 more)

### Community 9 - "Rendering & Presentation"
Cohesion: 0.25
Nodes (8): extractVegaLiteSpecs, markdownToHtml (internal), renderHtml, renderMarkdown, renderVegaLiteSpecsHtml, buildHTML (internal), escapeHTML (internal), generatePresentation

### Community 10 - "Interview Robot Dialogue Engine"
Cohesion: 0.32
Nodes (8): InterviewRobot._analyseAnswer, InterviewRobot._buildCompletionResponse, InterviewRobot._buildNextResponse, InterviewRobot._buildQuestionBank, InterviewRobot, InterviewRobot.processAnswer, InterviewRobot.skipQuestion, InterviewRobot.startInterview

### Community 11 - "System Architecture Overview"
Cohesion: 0.29
Nodes (8): AI Fitness Coaching App HTML Presentation (plans/), CLAUDE.md Codebase Ground Truth (Vanilla JS, MCP SDK, file-based persistence), ASSEMBLY_ROBOTS constant (Phase1+Phase2 robot list), AutoPM — Agentic MCP Product Strategy Tool, Phase 1 Robots: Interview, Scout, Detective, People, Money, Feature, Plan, Priority, Phase 2 Robots: User Stories, Scope Spec, Customer Journeys, Feasibility Tech, Feasibility Design, KPIs, Data Privacy, GTM Readiness, Risks Registry, DACI Stakeholders, Agentic Presentation Generator (HTML output to /plans/), Two-Phase Agentic Approach: Strategic Discovery + Execution Definition

### Community 12 - "PDD Templates & Examples"
Cohesion: 0.47
Nodes (6): PDD JSON Schema (meta, featureOverview, executiveSummary, daci, scope, userStories, etc.), BYOC SIP Trunk Monitoring PDD Example PDF (quality floor), Talkdesk Mobile 2.0 PDD Example PDF (quality ceiling), TDXNLPAA PDD Template PDF, Claude Code Prompt: ProductFlow v2 Discovery Report Request, Phase 2 Robot Specs: Reads-from and Must-produce table

### Community 13 - "Asset Feedback Subsystem"
Cohesion: 0.5
Nodes (4): AssetStore.appendFeedback, AssetStore.loadRobotResult, AssetStore._renderFeedbackBlock (internal), WorkspaceManager.getProductDir

### Community 14 - "Deployment & Setup"
Cohesion: 0.67
Nodes (3): ProductFlow v2 Deployment: Interview → Robot Relay → Feedback Loop → Presentation, ProductFlow Installation via npm + Claude Code MCP Integration, AutoPM Quickstart: Node.js Install + MCP Claude Desktop/Cursor Setup

### Community 15 - "Workspace Manager"
Cohesion: 1.0
Nodes (2): applyLearning, findSimilar

### Community 16 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): initProject (CLI command)

### Community 17 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): showHelp (CLI command)

### Community 18 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): markdown-doc (workspace test usage)

### Community 19 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): ContextStore (persistence test usage)

### Community 20 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): listSavedData

### Community 21 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): startAnalysis

### Community 22 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): ROBOT_ORDER (Phase 1 sequence)

### Community 23 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): ROBOT_ORDER_PHASE_2 (Phase 2 sequence)

### Community 24 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): PHASE2_GATE_ROBOTS (gate enforcement list)

### Community 25 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): GATES constant (G1-G8 labels)

### Community 26 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): GATE_NEXT_ACTIONS constant

### Community 27 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): getBest

### Community 28 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): getFeedbackForRobot

### Community 29 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): getRobotAverageRating

### Community 30 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): clearPolicyCache

### Community 31 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getRoot

### Community 32 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getFreshnessPath

### Community 33 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getContextDir

### Community 34 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getPDDDir

### Community 35 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getPendingPromotionPath

### Community 36 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getActiveSessionPath

### Community 37 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getPersonaStalenessOverridePath

### Community 38 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): WorkspaceManager.getProductStalenessOverridePath

### Community 39 - "Miscellaneous"
Cohesion: 1.0
Nodes (1): AssetStore.list

## Knowledge Gaps
- **94 isolated node(s):** `initProject (CLI command)`, `startMCPServer (CLI command)`, `analyzeProduct (CLI command)`, `showHelp (CLI command)`, `WorkspaceManager (workspace test usage)` (+89 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Workspace Manager`** (2 nodes): `applyLearning`, `findSimilar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `initProject (CLI command)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `showHelp (CLI command)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `markdown-doc (workspace test usage)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `ContextStore (persistence test usage)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `listSavedData`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `startAnalysis`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `ROBOT_ORDER (Phase 1 sequence)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `ROBOT_ORDER_PHASE_2 (Phase 2 sequence)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `PHASE2_GATE_ROBOTS (gate enforcement list)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `GATES constant (G1-G8 labels)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `GATE_NEXT_ACTIONS constant`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `getBest`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `getFeedbackForRobot`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `getRobotAverageRating`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `clearPolicyCache`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getRoot`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getFreshnessPath`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getContextDir`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getPDDDir`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getPendingPromotionPath`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getActiveSessionPath`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getPersonaStalenessOverridePath`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `WorkspaceManager.getProductStalenessOverridePath`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Miscellaneous`** (1 nodes): `AssetStore.list`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `enrichedContext (shared data contract across all robots)` connect `Robot Swarm & Shared Data Contracts` to `Phase 1 Analysis Robots`, `Detective & Interview Robots`, `Learning Loop & Gate Enforcement`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `_buildPhase2Context` connect `Learning Loop & Gate Enforcement` to `Robot Swarm & Shared Data Contracts`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `MCP Tool: run-robot` (e.g. with `FeatureRobot` and `ScoutRobot`) actually correct?**
  _`MCP Tool: run-robot` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `TeamLeader class` (e.g. with `startMCPServer (CLI command)` and `WorkspaceManager (workspace test usage)`) actually correct?**
  _`TeamLeader class` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `initProject (CLI command)`, `startMCPServer (CLI command)`, `analyzeProduct (CLI command)` to the rest of the system?**
  _94 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Robot Swarm & Shared Data Contracts` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Brain, Learning & Persistence` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._