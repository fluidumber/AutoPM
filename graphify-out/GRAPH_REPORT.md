# Graph Report - productflow  (2026-05-04)

## Corpus Check
- 40 files · ~58,643 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 330 nodes · 611 edges · 26 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 125 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `WorkspaceManager` - 26 edges
2. `renderMarkdown()` - 17 edges
3. `InterviewRobot` - 17 edges
4. `TeamLeader` - 16 edges
5. `PMProfile` - 14 edges
6. `mdTable()` - 13 edges
7. `BrainDatabase` - 13 edges
8. `ContextStore` - 13 edges
9. `FreshnessTracker` - 13 edges
10. `PDDComposer` - 11 edges

## Surprising Connections (you probably didn't know these)
- `test()` --calls--> `formatYamlValue()`  [INFERRED]
  tests/persistence.test.js → src/workspace/markdown-doc.js
- `test()` --calls--> `getSection()`  [INFERRED]
  tests/persistence.test.js → src/workspace/markdown-doc.js
- `test()` --calls--> `coerceYamlScalar()`  [INFERRED]
  tests/persistence.test.js → src/workspace/markdown-doc.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (5): traverseGates(), main(), readActiveSession(), AssetStore, WorkspaceManager

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (10): test(), coerceYamlScalar(), escapeRegex(), formatYamlValue(), getListSection(), getSection(), parseMarkdownDoc(), parseSimpleYaml() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.22
Nodes (25): bulletList(), escapeHtml(), inlineHtml(), markdownToHtml(), mdTable(), renderAppendix(), renderCustomerJourneys(), renderDaci() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (5): BrainDatabase, FeasibilityDesignRobot, ensureDataDir(), loadData(), saveData()

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (3): TeamLeader, ProductRegistry, slugify()

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (3): LearningEngine, RobotMemory, main()

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (3): daysSince(), FreshnessTracker, resolvePolicy()

### Community 7 - "Community 7"
Cohesion: 0.26
Nodes (2): ContextStore, sanitiseFilename()

### Community 8 - "Community 8"
Cohesion: 0.23
Nodes (1): InterviewRobot

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (3): DetectiveRobot, ScoutRobot, extractDomainKeywords()

### Community 10 - "Community 10"
Cohesion: 0.27
Nodes (1): PDDComposer

### Community 11 - "Community 11"
Cohesion: 0.43
Nodes (1): RisksRegistryRobot

### Community 12 - "Community 12"
Cohesion: 0.43
Nodes (1): KpisRobot

### Community 13 - "Community 13"
Cohesion: 0.43
Nodes (1): UserStoriesRobot

### Community 14 - "Community 14"
Cohesion: 0.47
Nodes (1): FeasibilityTechRobot

### Community 15 - "Community 15"
Cohesion: 0.47
Nodes (1): GtmReadinessRobot

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (1): ScopeSpecRobot

### Community 17 - "Community 17"
Cohesion: 0.47
Nodes (1): CustomerJourneysRobot

### Community 18 - "Community 18"
Cohesion: 0.47
Nodes (1): DataPrivacyRobot

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (1): PlanRobot

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (1): PeopleRobot

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (1): FeatureRobot

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (1): DaciStakeholdersRobot

### Community 24 - "Community 24"
Cohesion: 0.83
Nodes (3): buildHTML(), escapeHTML(), generatePresentation()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (1): MoneyRobot

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (1): PriorityRobot

## Knowledge Gaps
- **Thin community `Community 7`** (17 nodes): `context-store.js`, `ContextStore`, `.add()`, `._appendToNotesFile()`, `.constructor()`, `._extractNoteContent()`, `.get()`, `._indexPath()`, `.list()`, `._loadIndex()`, `.loadInterviewAnswers()`, `.loadResearchContext()`, `._saveIndex()`, `.saveInterviewAnswers()`, `sanitiseFilename()`, `.ensureProductStructure()`, `.getContextDir()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (17 nodes): `InterviewRobot`, `._analyseAnswer()`, `._answerCoversQuestion()`, `._buildCompletionResponse()`, `._buildEnrichedContext()`, `._buildNextResponse()`, `._buildQuestionBank()`, `.constructor()`, `._countSegments()`, `._deriveSearchPriority()`, `._extractBrandTerms()`, `._extractCompetitorList()`, `._getProgress()`, `._pickFollowUp()`, `.processAnswer()`, `.startInterview()`, `interview-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (12 nodes): `pdd-composer.js`, `PDDComposer`, `.assemble()`, `.assemblePhase1()`, `.constructor()`, `._loadAllRobotOutputs()`, `._loadDaciData()`, `._loadExperimentSelection()`, `._loadPhase1RobotOutputs()`, `._loadPhase2Context()`, `._loadProductMeta()`, `._tryParseJson()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (7 nodes): `risks-registry-robot.js`, `RisksRegistryRobot`, `.analyze()`, `.constructor()`, `._extractFeasibilityContext()`, `._extractGtmContext()`, `._extractPlanContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (7 nodes): `kpis-robot.js`, `KpisRobot`, `.analyze()`, `.constructor()`, `._extractMoneyContext()`, `._extractPlanContext()`, `._extractPriorityContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (7 nodes): `user-stories-robot.js`, `UserStoriesRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractPersonaContext()`, `._extractPlanContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `FeasibilityTechRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractScopeContext()`, `feasibility-tech-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (6 nodes): `GtmReadinessRobot`, `.analyze()`, `.constructor()`, `._extractMoneyContext()`, `._extractPlanContext()`, `gtm-readiness-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (6 nodes): `scope-spec-robot.js`, `ScopeSpecRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractPlanContext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (6 nodes): `CustomerJourneysRobot`, `.analyze()`, `.constructor()`, `._extractFeatureContext()`, `._extractPersonaContext()`, `customer-journeys-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (6 nodes): `DataPrivacyRobot`, `.analyze()`, `.constructor()`, `._extractFeasibilityContext()`, `._extractFeatureContext()`, `data-privacy-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (5 nodes): `plan-robot.js`, `PlanRobot`, `.analyze()`, `.constructor()`, `._derivePhases()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (5 nodes): `people-robot.js`, `PeopleRobot`, `.analyze()`, `.constructor()`, `._deriveSegments()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (5 nodes): `FeatureRobot`, `.analyze()`, `.constructor()`, `._deriveSegments()`, `feature-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `DaciStakeholdersRobot`, `.analyze()`, `.constructor()`, `._deriveSectionStatus()`, `daci-stakeholders-robot.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (4 nodes): `money-robot.js`, `MoneyRobot`, `.analyze()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (4 nodes): `priority-robot.js`, `PriorityRobot`, `.analyze()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TeamLeader` connect `Community 4` to `Community 0`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `WorkspaceManager` connect `Community 0` to `Community 1`, `Community 4`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._