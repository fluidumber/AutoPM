# Graph Report - .  (2026-06-03)

## Corpus Check
- 96 files · ~172,067 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 685 nodes · 1179 edges · 51 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 232 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Server & Session Orchestration|Server & Session Orchestration]]
- [[_COMMUNITY_Robot Architecture Rules|Robot Architecture Rules]]
- [[_COMMUNITY_Freshness Tracking|Freshness Tracking]]
- [[_COMMUNITY_Cockpit UI Screens|Cockpit UI Screens]]
- [[_COMMUNITY_Brain Database|Brain Database]]
- [[_COMMUNITY_Cockpit App Shell|Cockpit App Shell]]
- [[_COMMUNITY_Context Store|Context Store]]
- [[_COMMUNITY_Learning Engine|Learning Engine]]
- [[_COMMUNITY_PDD HTML Renderer|PDD HTML Renderer]]
- [[_COMMUNITY_Asset Store|Asset Store]]
- [[_COMMUNITY_Cockpit Data Builders|Cockpit Data Builders]]
- [[_COMMUNITY_Jira Integration & PDD Examples|Jira Integration & PDD Examples]]
- [[_COMMUNITY_Interview Robot|Interview Robot]]
- [[_COMMUNITY_Phase 2 Artifact Viewers|Phase 2 Artifact Viewers]]
- [[_COMMUNITY_Agentic vs Pipeline Architecture|Agentic vs Pipeline Architecture]]
- [[_COMMUNITY_Scout & Detective Robots|Scout & Detective Robots]]
- [[_COMMUNITY_Markdown Doc Parsing|Markdown Doc Parsing]]
- [[_COMMUNITY_Build-to-Learn Discovery|Build-to-Learn Discovery]]
- [[_COMMUNITY_Direct API & UI Roadmap|Direct API & UI Roadmap]]
- [[_COMMUNITY_App Icon Design|App Icon Design]]
- [[_COMMUNITY_Risks Registry Robot|Risks Registry Robot]]
- [[_COMMUNITY_KPIs Robot|KPIs Robot]]
- [[_COMMUNITY_User Stories Robot|User Stories Robot]]
- [[_COMMUNITY_Standalone HTML Renderer|Standalone HTML Renderer]]
- [[_COMMUNITY_Plan Robot|Plan Robot]]
- [[_COMMUNITY_People Robot|People Robot]]
- [[_COMMUNITY_Feasibility Tech Robot|Feasibility Tech Robot]]
- [[_COMMUNITY_Feature Robot|Feature Robot]]
- [[_COMMUNITY_GTM Readiness Robot|GTM Readiness Robot]]
- [[_COMMUNITY_Scope Spec Robot|Scope Spec Robot]]
- [[_COMMUNITY_Customer Journeys Robot|Customer Journeys Robot]]
- [[_COMMUNITY_Data Privacy Robot|Data Privacy Robot]]
- [[_COMMUNITY_Terms & Data Privacy Policy|Terms & Data Privacy Policy]]
- [[_COMMUNITY_CLI Entry Point|CLI Entry Point]]
- [[_COMMUNITY_Presentation Generator|Presentation Generator]]
- [[_COMMUNITY_Epic Robot|Epic Robot]]
- [[_COMMUNITY_DACI Stakeholders Robot|DACI Stakeholders Robot]]
- [[_COMMUNITY_Money Robot|Money Robot]]
- [[_COMMUNITY_Priority Robot|Priority Robot]]
- [[_COMMUNITY_ChatGPT MCP Connector|ChatGPT MCP Connector]]
- [[_COMMUNITY_Cockpit API Client|Cockpit API Client]]
- [[_COMMUNITY_Synthesizer Robot|Synthesizer Robot]]
- [[_COMMUNITY_Artifact Renderer Pipeline|Artifact Renderer Pipeline]]
- [[_COMMUNITY_Feedback & Staleness UI|Feedback & Staleness UI]]
- [[_COMMUNITY_Workspace Tests|Workspace Tests]]
- [[_COMMUNITY_Experiment Viewer Generator|Experiment Viewer Generator]]
- [[_COMMUNITY_ProductFlow + LLM Partnership|ProductFlow + LLM Partnership]]
- [[_COMMUNITY_LLM Client Robustness|LLM Client Robustness]]
- [[_COMMUNITY_Legacy Data Fix Script|Legacy Data Fix Script]]
- [[_COMMUNITY_Reconnect Test|Reconnect Test]]
- [[_COMMUNITY_Robot Registry|Robot Registry]]

## God Nodes (most connected - your core abstractions)
1. `WorkspaceManager` - 31 edges
2. `BrainDatabase` - 19 edges
3. `TeamLeader` - 18 edges
4. `renderMarkdown()` - 17 edges
5. `InterviewRobot` - 17 edges
6. `PMProfile` - 15 edges
7. `main()` - 15 edges
8. `FreshnessTracker` - 14 edges
9. `mdTable()` - 13 edges
10. `enrichProduct()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `AGENTS.md Codebase Ground Truth` --semantically_similar_to--> `CLAUDE.md Project Instructions`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `FeasibilityTechViewer` --semantically_similar_to--> `BYOC SIP Trunk Monitoring PDD (example)`  [INFERRED] [semantically similar]
  docs/RELEASE_NOTES.md → docs/pdd-examples/GCN-PDD - BYOC SIP Trunk Monitoring-221025-104428.pdf
- `test()` --calls--> `renderMarkdown()`  [INFERRED]
  tests/persistence.test.js → src/ui/cockpit/atoms.jsx
- `test()` --calls--> `formatYamlValue()`  [INFERRED]
  tests/persistence.test.js → /Users/anandshrivastava/productflow/src/workspace/markdown-doc.js
- `renderHtml()` --calls--> `main()`  [INFERRED]
  /Users/anandshrivastava/productflow/utils/pdd-renderer.js → scripts/slm-driver.mjs

## Hyperedges (group relationships)
- **Phase 1 Strategic Discovery Robot Pipeline** — readme_scout_robot, readme_detective_robot, readme_people_robot, readme_money_robot, readme_feature_robot, readme_plan_robot, readme_priority_robot [EXTRACTED 1.00]
- **StyleIQ Deck Robot-Derived Sections** — presentation_styleiq_market_tam, presentation_styleiq_competitors, presentation_styleiq_personas, presentation_styleiq_financials, presentation_styleiq_daci [INFERRED 0.80]
- **MCP Client Wiring Across Clients** — quickstart_claude_desktop_config, quickstart_cursor_config, install_autopm_guide [EXTRACTED 1.00]
- **Build-to-Learn Product Discovery Synthesis** — discovery_report_build_to_learn_product_discovery_engine, build_to_learn_architecture_discovery, discovery_report_build_to_learn_pillar_b_experiment_clusters, build_to_learn_architecture_experiment_matrix, discovery_report_build_to_learn_svpg_build_to_learn [INFERRED 0.80]
- **Phase 2 React Epic Viewer Suite** — release_notes_epic_viewers, release_notes_feasibility_tech_viewer, release_notes_risks_registry_viewer, release_notes_gtm_readiness_viewer, release_notes_customer_journeys_viewer [EXTRACTED 0.90]
- **Direct API Mode Future Build-Out** — architecture_llm_discussion_direct_api_mode, architecture_llm_discussion_llm_client_js, architecture_llm_discussion_robot_runner_js, architecture_llm_discussion_orchestrator_js [EXTRACTED 0.90]

## Communities

### Community 0 - "Server & Session Orchestration"
Cohesion: 0.08
Nodes (12): traverseGates(), buildWorkspaceCheck(), serialiseMarkdownDoc(), initServer(), main(), readActiveSession(), startStdio(), startSseServer() (+4 more)

### Community 1 - "Robot Architecture Rules"
Cohesion: 0.04
Nodes (58): Brand-Agnostic Code Rule (rationale), _claudeInstructions Pattern, Context Field Name Contract, Directory Layout, Double-Parse Guard, AGENTS.md Codebase Ground Truth, Learning Loop / LearningEngine Hints, PDD Composer + Renderer (+50 more)

### Community 2 - "Freshness Tracking"
Cohesion: 0.1
Nodes (14): clearPolicyCache(), collectRobotEntries(), daysSince(), FreshnessTracker, isPlainObject(), normalizeScopeArgs(), pickLatestEntry(), resolvePolicy() (+6 more)

### Community 3 - "Cockpit UI Screens"
Cohesion: 0.11
Nodes (31): daysAgo(), formatDate(), gatesFor(), relativeTime(), ArtifactViewer(), FeedbackPanel(), FreshnessDrawer(), MoneyDetail() (+23 more)

### Community 4 - "Brain Database"
Cohesion: 0.08
Nodes (6): BrainDatabase, ensureDataDir(), loadData(), saveData(), NotificationService, ProcessAdvisor

### Community 5 - "Cockpit App Shell"
Cohesion: 0.08
Nodes (16): App(), applyPathVisibility(), ConnectionPill(), Rail(), TopBar(), TweaksPanelOverlay(), escapeHtml(), inline() (+8 more)

### Community 6 - "Context Store"
Cohesion: 0.12
Nodes (3): ContextStore, sanitiseFilename(), PDDComposer

### Community 7 - "Learning Engine"
Cohesion: 0.1
Nodes (5): FeasibilityDesignRobot, getThreshold(), LearningEngine, RobotMemory, main()

### Community 8 - "PDD HTML Renderer"
Cohesion: 0.22
Nodes (25): bulletList(), escapeHtml(), inlineHtml(), markdownToHtml(), mdTable(), renderAppendix(), renderCustomerJourneys(), renderDaci() (+17 more)

### Community 9 - "Asset Store"
Cohesion: 0.14
Nodes (5): AssetStore, isPlainObject(), normalizeScopeArgs(), buildPolicy(), main()

### Community 10 - "Cockpit Data Builders"
Cohesion: 0.26
Nodes (20): buildActivity(), buildArtifacts(), buildContext(), buildFeedback(), buildRobotRuns(), computeGates(), computeRobotStatus(), countInterviewAnswers() (+12 more)

### Community 11 - "Jira Integration & PDD Examples"
Cohesion: 0.1
Nodes (20): Cockpit as MCP Admin Dashboard, Integrations as Data Surfaces, Talkdesk Mobile 2.0 PDD (example), BYOC SIP Trunk Monitoring PDD (example), Atlassian Document Format (ADF) Payload, Epic Mapping (Scope Spec to Jira Epic), jira-export MCP Tool (proposed), utils/jira-exporter.js (proposed) (+12 more)

### Community 12 - "Interview Robot"
Cohesion: 0.21
Nodes (1): InterviewRobot

### Community 13 - "Phase 2 Artifact Viewers"
Cohesion: 0.29
Nodes (15): CustomerJourneysViewer(), DaciStakeholdersViewer(), DataPrivacyViewer(), FeasibilityDesignViewer(), FeasibilityTechViewer(), GtmReadinessViewer(), KpisViewer(), Mermaid() (+7 more)

### Community 14 - "Agentic vs Pipeline Architecture"
Cohesion: 0.12
Nodes (17): Core Agent Loop (Brain), Functional Data Tools (run_market_research), Pipeline vs Agentic AI Comparison, Quality Rubric Stopping Condition, Rationale: structured robot expertise is the defensible moat, Self-Evaluation Step (recommended), Rationale: stay a pipeline — autonomous agents not enterprise-ready in 2026, _claudeInstructions Pattern (+9 more)

### Community 15 - "Scout & Detective Robots"
Cohesion: 0.16
Nodes (3): DetectiveRobot, extractDomainKeywords(), ScoutRobot

### Community 16 - "Markdown Doc Parsing"
Cohesion: 0.22
Nodes (11): coerceYamlScalar(), escapeRegex(), formatYamlValue(), getListSection(), getSection(), parseMarkdownDoc(), parseSimpleYaml(), backfillEpicFreshnessFromFiles() (+3 more)

### Community 17 - "Build-to-Learn Discovery"
Cohesion: 0.15
Nodes (15): Build to Learn Architectural Discovery, ExperimentAnalysisRobot (proposed), Experiment Matrix (Solution A vs B), PrototypeRobot (proposed), ResearchRobot (proposed), Tributary & Distributary Validation Loop, add-research MCP Tool, Four Product Risks (Value/Usability/Feasibility/Viability) (+7 more)

### Community 18 - "Direct API & UI Roadmap"
Cohesion: 0.2
Nodes (10): Direct API Mode (Future), src/llm-client.js (proposed), Rationale: Direct API mode not yet — MCP is the right prototype stage, src/orchestrator.js (proposed), src/robot-runner.js (proposed), Approve Phase 2 Section feature, Global Search (Cmd+K) feature, Re-check Freshness endpoint (+2 more)

### Community 19 - "App Icon Design"
Cohesion: 0.36
Nodes (8): ProductFlow App Icon, Antennae / Ear Tufts, Automation / AI Robot Theme, Dark Near-Black Background, Gear / Cog Outline, Blue Line-Art Style, Stylized Robot/Owl Head Motif, ProductFlow Product

### Community 20 - "Risks Registry Robot"
Cohesion: 0.43
Nodes (1): RisksRegistryRobot

### Community 21 - "KPIs Robot"
Cohesion: 0.43
Nodes (1): KpisRobot

### Community 22 - "User Stories Robot"
Cohesion: 0.43
Nodes (1): UserStoriesRobot

### Community 23 - "Standalone HTML Renderer"
Cohesion: 0.48
Nodes (5): escapeHtml(), markdownToHtml(), packageHtml(), translateMarkdown(), main()

### Community 24 - "Plan Robot"
Cohesion: 0.4
Nodes (1): PlanRobot

### Community 25 - "People Robot"
Cohesion: 0.4
Nodes (1): PeopleRobot

### Community 26 - "Feasibility Tech Robot"
Cohesion: 0.47
Nodes (1): FeasibilityTechRobot

### Community 27 - "Feature Robot"
Cohesion: 0.4
Nodes (1): FeatureRobot

### Community 28 - "GTM Readiness Robot"
Cohesion: 0.47
Nodes (1): GtmReadinessRobot

### Community 29 - "Scope Spec Robot"
Cohesion: 0.47
Nodes (1): ScopeSpecRobot

### Community 30 - "Customer Journeys Robot"
Cohesion: 0.47
Nodes (1): CustomerJourneysRobot

### Community 31 - "Data Privacy Robot"
Cohesion: 0.47
Nodes (1): DataPrivacyRobot

### Community 32 - "Terms & Data Privacy Policy"
Cohesion: 0.33
Nodes (6): accept-terms MCP Tool, Rationale: anonymise patterns to protect product/PM identity, Knowledge Layer (anonymised patterns), Local-only Data Storage, Process Improvement Email Notifications, AutoPM Terms of Service v1.0

### Community 33 - "CLI Entry Point"
Cohesion: 0.4
Nodes (0): 

### Community 34 - "Presentation Generator"
Cohesion: 0.8
Nodes (3): buildHTML(), escapeHTML(), generatePresentation()

### Community 35 - "Epic Robot"
Cohesion: 0.4
Nodes (1): EpicRobot

### Community 36 - "DACI Stakeholders Robot"
Cohesion: 0.5
Nodes (1): DaciStakeholdersRobot

### Community 37 - "Money Robot"
Cohesion: 0.4
Nodes (1): MoneyRobot

### Community 38 - "Priority Robot"
Cohesion: 0.4
Nodes (1): PriorityRobot

### Community 39 - "ChatGPT MCP Connector"
Cohesion: 0.4
Nodes (5): ChatGPT MCP Connector, Rationale: Cloudflare bypasses localhost block and HTML warning pages, Cloudflare Tunnel, mcp-sse-server.js (port 4322), ProductFlow SSE Bridge

### Community 40 - "Cockpit API Client"
Cohesion: 0.67
Nodes (2): applyBundle(), withTimeout()

### Community 41 - "Synthesizer Robot"
Cohesion: 0.5
Nodes (1): SynthesizerRobot

### Community 42 - "Artifact Renderer Pipeline"
Cohesion: 0.5
Nodes (4): Rich Artifact Renderer Pipeline, atoms.jsx Markdown Renderer, Mermaid.js Integration, Vega-Lite Integration

### Community 43 - "Feedback & Staleness UI"
Cohesion: 0.67
Nodes (0): 

### Community 44 - "Workspace Tests"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Experiment Viewer Generator"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "ProductFlow + LLM Partnership"
Cohesion: 1.0
Nodes (2): Rationale: ProductFlow + LLM are a deliberate partnership, ProductFlow Structure Layer

### Community 47 - "LLM Client Robustness"
Cohesion: 1.0
Nodes (2): LLM Client Tooling Variability, _tryParseJson Defensive Fence Stripping

### Community 48 - "Legacy Data Fix Script"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Reconnect Test"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Robot Registry"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **76 isolated node(s):** `Install Node.js (LTS)`, `Cursor MCP Config`, `Interview Tool Trigger`, `Local-first, no API keys (rationale)`, `Optional Environment Variables` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Workspace Tests`** (2 nodes): `workspace.test.js`, `test()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Experiment Viewer Generator`** (2 nodes): `generateExperimentViewer()`, `generate-viewer.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ProductFlow + LLM Partnership`** (2 nodes): `Rationale: ProductFlow + LLM are a deliberate partnership`, `ProductFlow Structure Layer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `LLM Client Robustness`** (2 nodes): `LLM Client Tooling Variability`, `_tryParseJson Defensive Fence Stripping`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legacy Data Fix Script`** (1 nodes): `fix-legacy-data.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Reconnect Test`** (1 nodes): `test-reconnect.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Registry`** (1 nodes): `robot-registry.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `Freshness Tracking` to `Server & Session Orchestration`, `Cockpit App Shell`, `Context Store`, `PDD HTML Renderer`, `Asset Store`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `renderMarkdown()` connect `Cockpit App Shell` to `Markdown Doc Parsing`, `Freshness Tracking`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Why does `useKey()` connect `Cockpit App Shell` to `Cockpit UI Screens`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `Install Node.js (LTS)`, `Cursor MCP Config`, `Interview Tool Trigger` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server & Session Orchestration` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Robot Architecture Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Freshness Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._