# Graph Report - .  (2026-05-02)

## Corpus Check
- 50 files · ~55,220 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 327 nodes · 601 edges · 25 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Leader Gate (C0)|Leader Gate (C0)]]
- [[_COMMUNITY_Workspace (C1)|Workspace (C1)]]
- [[_COMMUNITY_Leader Team (C2)|Leader Team (C2)]]
- [[_COMMUNITY_Document Rendering (C3)|Document Rendering (C3)]]
- [[_COMMUNITY_Brain Brain (C4)|Brain Brain (C4)]]
- [[_COMMUNITY_Leader Team (C5)|Leader Team (C5)]]
- [[_COMMUNITY_Brain Learning (C6)|Brain Learning (C6)]]
- [[_COMMUNITY_Workspace (C7)|Workspace (C7)]]
- [[_COMMUNITY_Robot Component (C8)|Robot Component (C8)]]
- [[_COMMUNITY_Workspace (C9)|Workspace (C9)]]
- [[_COMMUNITY_Robot Component (C10)|Robot Component (C10)]]
- [[_COMMUNITY_Robot Component (C11)|Robot Component (C11)]]
- [[_COMMUNITY_Robot Component (C12)|Robot Component (C12)]]
- [[_COMMUNITY_Robot Component (C13)|Robot Component (C13)]]
- [[_COMMUNITY_Robot Component (C14)|Robot Component (C14)]]
- [[_COMMUNITY_Robot Component (C15)|Robot Component (C15)]]
- [[_COMMUNITY_Robot Component (C16)|Robot Component (C16)]]
- [[_COMMUNITY_Robot Component (C17)|Robot Component (C17)]]
- [[_COMMUNITY_Robot Component (C19)|Robot Component (C19)]]
- [[_COMMUNITY_Robot Component (C20)|Robot Component (C20)]]
- [[_COMMUNITY_Robot Component (C21)|Robot Component (C21)]]
- [[_COMMUNITY_Robot Component (C22)|Robot Component (C22)]]
- [[_COMMUNITY_Utils Presentation (C23)|Utils Presentation (C23)]]
- [[_COMMUNITY_Robot Component (C24)|Robot Component (C24)]]
- [[_COMMUNITY_Robot Component (C25)|Robot Component (C25)]]

## God Nodes (most connected - your core abstractions)
1. `WorkspaceManager` - 26 edges
2. `renderMarkdown()` - 17 edges
3. `InterviewRobot` - 17 edges
4. `TeamLeader` - 16 edges
5. `PMProfile` - 14 edges
6. `mdTable()` - 13 edges
7. `BrainDatabase` - 13 edges
8. `ContextStore` - 12 edges
9. `FreshnessTracker` - 12 edges
10. `resolvePolicy()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `formatYamlValue()` --calls--> `test()`  [INFERRED]
  src/workspace/markdown-doc.js → tests/persistence.test.js
- `getSection()` --calls--> `test()`  [INFERRED]
  src/workspace/markdown-doc.js → tests/persistence.test.js
- `coerceYamlScalar()` --calls--> `test()`  [INFERRED]
  src/workspace/markdown-doc.js → tests/persistence.test.js

## Communities

### Community 0 - "Leader Gate (C0)"
Cohesion: 0.08
Nodes (7): traverseGates(), main(), readActiveSession(), AssetStore, ProductRegistry, slugify(), WorkspaceManager

### Community 1 - "Workspace (C1)"
Cohesion: 0.16
Nodes (10): test(), coerceYamlScalar(), escapeRegex(), formatYamlValue(), getListSection(), getSection(), parseMarkdownDoc(), parseSimpleYaml() (+2 more)

### Community 2 - "Leader Team (C2)"
Cohesion: 0.12
Nodes (2): TeamLeader, InterviewRobot

### Community 3 - "Document Rendering (C3)"
Cohesion: 0.22
Nodes (25): bulletList(), escapeHtml(), inlineHtml(), markdownToHtml(), mdTable(), renderAppendix(), renderCustomerJourneys(), renderDaci() (+17 more)

### Community 4 - "Brain Brain (C4)"
Cohesion: 0.11
Nodes (5): BrainDatabase, FeasibilityDesignRobot, ensureDataDir(), loadData(), saveData()

### Community 5 - "Leader Team (C5)"
Cohesion: 0.21
Nodes (3): daysSince(), FreshnessTracker, resolvePolicy()

### Community 6 - "Brain Learning (C6)"
Cohesion: 0.13
Nodes (3): LearningEngine, RobotMemory, main()

### Community 7 - "Workspace (C7)"
Cohesion: 0.28
Nodes (2): ContextStore, sanitiseFilename()

### Community 8 - "Robot Component (C8)"
Cohesion: 0.19
Nodes (3): DetectiveRobot, ScoutRobot, extractDomainKeywords()

### Community 9 - "Workspace (C9)"
Cohesion: 0.29
Nodes (1): PDDComposer

### Community 10 - "Robot Component (C10)"
Cohesion: 0.43
Nodes (1): RisksRegistryRobot

### Community 11 - "Robot Component (C11)"
Cohesion: 0.43
Nodes (1): KpisRobot

### Community 12 - "Robot Component (C12)"
Cohesion: 0.43
Nodes (1): UserStoriesRobot

### Community 13 - "Robot Component (C13)"
Cohesion: 0.47
Nodes (1): FeasibilityTechRobot

### Community 14 - "Robot Component (C14)"
Cohesion: 0.47
Nodes (1): GtmReadinessRobot

### Community 15 - "Robot Component (C15)"
Cohesion: 0.47
Nodes (1): ScopeSpecRobot

### Community 16 - "Robot Component (C16)"
Cohesion: 0.47
Nodes (1): CustomerJourneysRobot

### Community 17 - "Robot Component (C17)"
Cohesion: 0.47
Nodes (1): DataPrivacyRobot

### Community 19 - "Robot Component (C19)"
Cohesion: 0.5
Nodes (1): PlanRobot

### Community 20 - "Robot Component (C20)"
Cohesion: 0.5
Nodes (1): PeopleRobot

### Community 21 - "Robot Component (C21)"
Cohesion: 0.5
Nodes (1): FeatureRobot

### Community 22 - "Robot Component (C22)"
Cohesion: 0.5
Nodes (1): DaciStakeholdersRobot

### Community 23 - "Utils Presentation (C23)"
Cohesion: 0.83
Nodes (3): buildHTML(), escapeHTML(), generatePresentation()

### Community 24 - "Robot Component (C24)"
Cohesion: 0.5
Nodes (1): MoneyRobot

### Community 25 - "Robot Component (C25)"
Cohesion: 0.5
Nodes (1): PriorityRobot

## Knowledge Gaps
- **Thin community `Leader Team (C2)`** (29 nodes): `team-leader.js`, `TeamLeader`, `.answerInterviewQuestion()`, `.constructor()`, `.getAnalysisState()`, `.getFullResults()`, `.getNextRobot()`, `.skipInterviewQuestion()`, `.startAnalysis()`, `.startInterview()`, `InterviewRobot`, `._analyseAnswer()`, `._answerCoversQuestion()`, `._buildCompletionResponse()`, `._buildEnrichedContext()`, `._buildNextResponse()`, `._buildQuestionBank()`, `.constructor()`, `._countSegments()`, `._deriveSearchPriority()`, `._extractBrandTerms()`, `._extractCompetitorList()`, `._getProgress()`, `._pickFollowUp()`, `.processAnswer()`, `.skipQuestion()`, `.startInterview()`, `interview-robot.js`, `.get()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Workspace (C7)`** (15 nodes): `context-store.js`, `ContextStore`, `.add()`, `._appendToNotesFile()`, `.constructor()`, `._extractNoteContent()`, `.get()`, `._indexPath()`, `.list()`, `._loadIndex()`, `.loadInterviewAnswers()`, `._saveIndex()`, `.saveInterviewAnswers()`, `sanitiseFilename()`, `.getContextDir()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Workspace (C9)`** (11 nodes): `pdd-composer.js`, `PDDComposer`, `.assemble()`, `.assemblePhase1()`, `.constructor()`, `._loadAllRobotOutputs()`, `._loadDaciData()`, `._loadPhase1RobotOutputs()`, `._loadPhase2Context()`, `._loadProductMeta()`, `._tryParseJson()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C10)`** (7 nodes): `risks-registry-robot.js`, `RisksRegistryRobot`, `.analyze()`, `.constructor()`, `._extractFeasibilityContext()`, `._extractGtmContext()`, `._extractPlanContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C11)`** (7 nodes): `kpis-robot.js`, `KpisRobot`, `.analyze()`, `.constructor()`, `._extractMoneyContext()`, `._extractPlanContext()`, `._extractPriorityContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C12)`** (7 nodes): `user-stories-robot.js`, `UserStoriesRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractPersonaContext()`, `._extractPlanContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C13)`** (6 nodes): `FeasibilityTechRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractScopeContext()`, `feasibility-tech-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C14)`** (6 nodes): `GtmReadinessRobot`, `.analyze()`, `.constructor()`, `._extractMoneyContext()`, `._extractPlanContext()`, `gtm-readiness-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C15)`** (6 nodes): `scope-spec-robot.js`, `ScopeSpecRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractPlanContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C16)`** (6 nodes): `CustomerJourneysRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractPersonaContext()`, `customer-journeys-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C17)`** (6 nodes): `DataPrivacyRobot`, `.analyze()`, `.constructor()`, `._extractFeasibilityContext()`, `._extractFeatureContext()`, `data-privacy-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C19)`** (5 nodes): `plan-robot.js`, `PlanRobot`, `.analyze()`, `.constructor()`, `._derivePhases()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C20)`** (5 nodes): `people-robot.js`, `PeopleRobot`, `.analyze()`, `.constructor()`, `._deriveSegments()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C21)`** (5 nodes): `FeatureRobot`, `.analyze()`, `.constructor()`, `._deriveSegments()`, `feature-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C22)`** (5 nodes): `DaciStakeholdersRobot`, `.analyze()`, `.constructor()`, `._deriveSectionStatus()`, `daci-stakeholders-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C24)`** (4 nodes): `money-robot.js`, `MoneyRobot`, `.analyze()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Robot Component (C25)`** (4 nodes): `priority-robot.js`, `PriorityRobot`, `.analyze()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TeamLeader` connect `Leader Team (C2)` to `Leader Gate (C0)`, `Brain Brain (C4)`, `Leader Team (C5)`, `Brain Learning (C6)`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `WorkspaceManager` connect `Leader Gate (C0)` to `Workspace (C1)`, `Leader Team (C5)`, `Workspace (C7)`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `Leader Gate (C0)` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Leader Team (C2)` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Brain Brain (C4)` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Brain Learning (C6)` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._