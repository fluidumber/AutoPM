# Graph Report - /Users/anandshrivastava/productflow  (2026-05-29)

## Corpus Check
- 56 files · ~141,341 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 477 nodes · 844 edges · 37 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 173 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `WorkspaceManager` - 27 edges
2. `BrainDatabase` - 19 edges
3. `renderMarkdown()` - 17 edges
4. `InterviewRobot` - 17 edges
5. `TeamLeader` - 16 edges
6. `PMProfile` - 15 edges
7. `mdTable()` - 13 edges
8. `ContextStore` - 13 edges
9. `FreshnessTracker` - 13 edges
10. `enrichProduct()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `renderMarkdown()` --calls--> `test()`  [INFERRED]
  /Users/anandshrivastava/productflow/src/ui/cockpit/atoms.jsx → /Users/anandshrivastava/productflow/tests/persistence.test.js
- `formatYamlValue()` --calls--> `test()`  [INFERRED]
  /Users/anandshrivastava/productflow/src/workspace/markdown-doc.js → /Users/anandshrivastava/productflow/tests/persistence.test.js
- `App()` --calls--> `useKey()`  [INFERRED]
  /Users/anandshrivastava/productflow/src/ui/cockpit/app.jsx → /Users/anandshrivastava/productflow/src/ui/cockpit/atoms.jsx
- `ArtifactViewer()` --calls--> `formatDate()`  [INFERRED]
  /Users/anandshrivastava/productflow/src/ui/cockpit/drawers.jsx → /Users/anandshrivastava/productflow/src/ui/cockpit/data.js
- `FeedbackPanel()` --calls--> `relativeTime()`  [INFERRED]
  /Users/anandshrivastava/productflow/src/ui/cockpit/drawers.jsx → /Users/anandshrivastava/productflow/src/ui/cockpit/data.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (8): AssetStore, isPlainObject(), normalizeScopeArgs(), traverseGates(), buildPolicy(), main(), readActiveSession(), WorkspaceManager

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (8): collectRobotEntries(), daysSince(), FreshnessTracker, isPlainObject(), normalizeScopeArgs(), pickLatestEntry(), resolvePolicy(), TeamLeader

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (6): BrainDatabase, ensureDataDir(), loadData(), saveData(), NotificationService, ProcessAdvisor

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (15): useKey(), formatDate(), gatesFor(), relativeTime(), ArtifactViewer(), FeedbackPanel(), FreshnessDrawer(), MoneyDetail() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (5): buildWorkspaceCheck(), serialiseMarkdownDoc(), PMProfile, ProductRegistry, slugify()

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (6): App(), escapeHtml(), inline(), renderMarkdown(), useToast(), useTweaks()

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (5): FeasibilityDesignRobot, getThreshold(), LearningEngine, RobotMemory, main()

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (25): bulletList(), escapeHtml(), inlineHtml(), markdownToHtml(), mdTable(), renderAppendix(), renderCustomerJourneys(), renderDaci() (+17 more)

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (17): buildActivity(), buildArtifacts(), buildRobotRuns(), computeGates(), computeRobotStatus(), countInterviewAnswers(), daysBetween(), enrichProduct() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.23
Nodes (1): InterviewRobot

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (3): ContextStore, sanitiseFilename(), buildContext()

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (11): coerceYamlScalar(), escapeRegex(), formatYamlValue(), getListSection(), getSection(), parseMarkdownDoc(), parseSimpleYaml(), backfillEpicFreshnessFromFiles() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (3): DetectiveRobot, extractDomainKeywords(), ScoutRobot

### Community 13 - "Community 13"
Cohesion: 0.28
Nodes (11): CustomerJourneysViewer(), DaciStakeholdersViewer(), DataPrivacyViewer(), FeasibilityDesignViewer(), FeasibilityTechViewer(), GtmReadinessViewer(), KpisViewer(), RisksRegistryViewer() (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.27
Nodes (1): PDDComposer

### Community 15 - "Community 15"
Cohesion: 0.43
Nodes (1): RisksRegistryRobot

### Community 16 - "Community 16"
Cohesion: 0.43
Nodes (1): KpisRobot

### Community 17 - "Community 17"
Cohesion: 0.43
Nodes (1): UserStoriesRobot

### Community 18 - "Community 18"
Cohesion: 0.47
Nodes (1): FeasibilityTechRobot

### Community 19 - "Community 19"
Cohesion: 0.47
Nodes (1): GtmReadinessRobot

### Community 20 - "Community 20"
Cohesion: 0.47
Nodes (1): ScopeSpecRobot

### Community 21 - "Community 21"
Cohesion: 0.47
Nodes (1): CustomerJourneysRobot

### Community 22 - "Community 22"
Cohesion: 0.47
Nodes (1): DataPrivacyRobot

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (1): PlanRobot

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (1): PeopleRobot

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (1): FeatureRobot

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (1): DaciStakeholdersRobot

### Community 28 - "Community 28"
Cohesion: 0.83
Nodes (3): buildHTML(), escapeHTML(), generatePresentation()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (1): EpicRobot

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): MoneyRobot

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (1): PriorityRobot

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 34`** (2 nodes): `workspace.test.js`, `test()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `generateExperimentViewer()`, `generate-viewer.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `fix-legacy-data.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `test()` connect `Community 11` to `Community 9`, `Community 5`?**
  _High betweenness centrality (0.155) - this node is a cross-community bridge._
- **Why does `renderMarkdown()` connect `Community 5` to `Community 11`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `useKey()` connect `Community 3` to `Community 5`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._