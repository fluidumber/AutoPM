// UserStoriesRobot — Phase 2 execution robot.
//
// Derives MoSCoW-tagged user stories from Phase 1 people + feature robot outputs.
// Personas are sourced exclusively from people robot output.
// Features are sourced exclusively from feature robot output.
// Never re-prompts the PM for information already captured in Phase 1.
//
// Input:  enrichedContext with phase1Outputs.people + phase1Outputs.feature
// Output: _claudeInstructions payload — Claude generates the user stories JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [people]  - Markdown text from the people robot output file
 * @property {string} [feature] - Markdown text from the feature robot output file
 * @property {string} [plan]    - Markdown text from the plan robot output file (for phase/timeline signals)
 */

/**
 * @typedef {Object} Phase2Context
 * @property {string}  [personaOverride]         - PM-supplied persona clarifications or corrections
 * @property {string}  [featureOverride]         - PM-supplied feature clarifications or corrections
 * @property {string}  [scopeOverride]           - PM-supplied scope boundaries
 * @property {number}  [experimentClusterCount]  - Number of solution clusters to generate (default: 1)
 */

/**
 * @typedef {Object} EnrichedContext
 * @property {string}        productIdea     - Product name or one-line description
 * @property {Object}        answers         - Interview answer map (qid → value)
 * @property {string}        [summary]       - Product summary from interview
 * @property {string[]}      [brandTerms]    - Brand-name sanitisation terms
 * @property {Phase1Outputs} [phase1Outputs] - Loaded Phase 1 robot output text
 * @property {Phase2Context} [phase2Context] - Phase 2 PM-provided context manifest
 * @property {string|null}   [researchContext] - Aggregated external research from ContextStore
 */

/**
 * @typedef {Object} UserStory
 * @property {string} id          - Sequential ID, e.g. "US-001"
 * @property {string} persona     - Exact persona name from people robot output
 * @property {string} story       - "As a [persona], I want [goal], so that [reason]."
 * @property {string} description - 2-3 sentence acceptance criteria
 * @property {"MUST_HAVE"|"SHOULD_HAVE"|"COULD_HAVE"|"WONT_HAVE"|"PHASE_2"} moscow - MoSCoW priority
 */

/**
 * @typedef {Object} ExperimentCluster
 * @property {string}      clusterId    - e.g. "cluster-A", "cluster-B"
 * @property {string}      hypothesis   - The solution hypothesis this cluster tests
 * @property {UserStory[]} userStories  - Stories for this cluster
 * @property {Object}      moscowDistribution - { mustHave, shouldHave, couldHave, phase2 }
 */

/**
 * @typedef {Object} UserStoriesOutput
 * @property {string}      productIdea          - Echoed from input
 * @property {Object}      _claudeInstructions  - Prompt payload for Claude
 * @property {string}      _claudeInstructions.role
 * @property {string[]}    _claudeInstructions.mandate
 * @property {string[]}    _claudeInstructions.requiredSections
 * @property {Object}      _claudeInstructions.productContext
 * @property {Object}      _claudeInstructions.outputFormat
 */

class UserStoriesRobot {
    constructor() {
        this.name = "User Stories Robot";
    }

    /**
     * Build the Claude prompt payload for user story generation.
     * Claude's response to this payload becomes the persisted analysis.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<UserStoriesOutput>}
     */
    async analyze(enrichedContext) {
        // Double-parse guard — MCP may pass a JSON string
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const personaContext = this._extractPersonaContext(context);
        const featureContext = this._extractFeatureContext(context);
        const planContext    = this._extractPlanContext(context);
        const phase2Notes    = context.phase2Context || {};
        const researchContext = context.researchContext || null;
        const clusterCount   = Math.max(1, Math.min(5, phase2Notes.experimentClusterCount || 1));
        const isMultiCluster = clusterCount > 1;
        const hasPhase1Outputs = !!(
            context.phase1Outputs?.people ||
            context.phase1Outputs?.feature
        );

        return {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager and user story specialist with deep expertise in translating strategic product research into execution-ready, sprint-plannable user stories.",

                mandate: [
                    // ── STEP 1: Phase 1 synthesis ──────────────────────────
                    "PHASE 1 SYNTHESIS FIRST: Your JSON output must contain a 'phase1Synthesis' key. The value should be a single string containing 3-5 bullet points stating: (1) which personas you identified and which you are using, (2) which features you are deriving stories from and why, (3) the key MoSCoW signals from the feature robot, (4) any gaps in Phase 1 data and how you are handling them.",

                    // ── STEP 2: Derivation assumptions ────────────────────
                    "DERIVATION ASSUMPTIONS: Your JSON output must contain a 'derivationAssumptions' key. The value should be a single string containing 3-5 bullet points listing assumptions you are making (e.g. persona priority order, MoSCoW boundary decisions, feature → story mapping choices).",

                    // ── Personas ───────────────────────────────────────────
                    "PERSONAS: Use ONLY the personas found in the people robot output. Do not invent new personas. Each story must map to exactly one persona. If the people robot output is unavailable, infer personas from the product context — but flag this clearly in Phase 1 Synthesis.",

                    // ── Features ───────────────────────────────────────────
                    "FEATURES: Derive stories from the feature robot output only — mustHaveFeatures map to MUST_HAVE and SHOULD_HAVE stories; niceToHaveFeatures map to COULD_HAVE; futureFeatures map to PHASE_2. If the feature robot output is unavailable, derive from the product context — but flag this in Phase 1 Synthesis.",

                    // ── Story format ───────────────────────────────────────
                    "STORY FORMAT: Every story must use the exact format: 'As a [persona name], I want [specific, concrete goal], so that [concrete business or personal outcome].' All three clauses are mandatory. The persona clause must be an exact persona name. The goal clause must name a specific capability, not a generic action. The reason clause must connect to a real pain point or job-to-be-done from the people robot.",

                    // ── MoSCoW alignment ───────────────────────────────────
                    "MOSCOW ALIGNMENT: MUST_HAVE = feature is on the mvpCriticalPath or in the top tier of mustHaveFeatures. SHOULD_HAVE = mustHaveFeatures not on critical path, or highest-value niceToHaveFeatures. COULD_HAVE = remaining niceToHaveFeatures. WONT_HAVE = features explicitly out of scope. PHASE_2 = futureFeatures or items deprioritised for later phases. When plan robot phase signals are available, align PHASE_2 stories to roadmap phase names.",

                    // ── Volume and distribution ────────────────────────────
                    "VOLUME: Generate 20-35 stories total. Distribution target: MUST_HAVE 40-50%, SHOULD_HAVE 25-30%, COULD_HAVE 15-20%, PHASE_2 5-10%. Generate at least 2 stories per persona and at least 1 story per must-have feature. Do not generate duplicate stories.",

                    // ── Specificity bar ────────────────────────────────────
                    "SPECIFICITY: Every story must be product-specific. Generic stories are failures — e.g. 'As a user, I want to log in' is rejected. Reference the actual product, the specific persona name, and the concrete feature. The story should be specific enough to be handed to an engineer and understood without further context.",

                    // ── IDs and grouping ───────────────────────────────────
                    "IDs AND GROUPING: Assign sequential IDs starting at US-001. Group stories by persona in the output array — all stories for persona A, then all for persona B, etc. Within a persona group, sort by MoSCoW (MUST_HAVE first, then SHOULD_HAVE, etc.).",

                    // ── Description field ──────────────────────────────────
                    "DESCRIPTION: Each story must include a description field with 2-3 sentences of acceptance criteria: what 'done' looks like, what the system does, and any key edge cases or constraints the implementer must handle.",

                    // ── PM override instructions ───────────────────────────
                    "PM OVERRIDE INSTRUCTIONS: Do NOT output any text, markdown, or comments outside the JSON object. The JSON object must be the only thing in your response.",

                    // ── No re-prompting ────────────────────────────────────
                    "NO RE-PROMPTING: Do not ask the PM for information already in the Phase 1 outputs. If data is ambiguous, make the best inference and note it in Derivation Assumptions.",

                    // ── External research context ─────────────────────────
                    researchContext
                        ? "EXTERNAL RESEARCH: The PM has attached external research data (surveys, user interviews, competitive analysis, or experiment feedback). This data is provided in the researchContext field. Treat it as supplementary evidence — use it to validate, challenge, or refine the personas, features, and MoSCoW priorities derived from Phase 1 robots. If the research contradicts a Phase 1 assumption, note the conflict in Derivation Assumptions and explain which source you prioritised and why."
                        : "EXTERNAL RESEARCH: No external research has been attached. Proceed with Phase 1 robot outputs as the sole source of truth.",

                    // ── Experiment clusters ───────────────────────────────
                    ...(isMultiCluster ? [
                        `EXPERIMENT CLUSTERS: Generate ${clusterCount} distinct solution clusters, each exploring a DIFFERENT strategic hypothesis for solving the core problem. Each cluster must have: (1) a unique clusterId (e.g. 'cluster-A', 'cluster-B'), (2) a clear hypothesis statement describing the solution approach, (3) its own complete set of user stories, (4) its own MoSCoW distribution. The clusters should represent genuinely different solution strategies — not minor variations. Example: Cluster A might emphasise automation while Cluster B emphasises human-in-the-loop control. Each cluster should be independently viable.`,
                        `CLUSTER DIFFERENTIATION: Clusters must differ in their solution approach, not just in which features they include. Each hypothesis should be testable — the PM will take these to users for validation. If research context is available, use it to inform which hypotheses are worth testing.`,
                    ] : []),
                ],

                requiredSections: [
                    "JSON object with phase1Synthesis",
                    "JSON object with derivationAssumptions",
                    "JSON object with userStories",
                ],

                productContext: {
                    productIdea:       context.productIdea || context.summary || null,
                    targetMarket:      context.answers?.target_geo || context.answers?.target_market || null,
                    productStage:      context.answers?.product_stage || null,
                    summary:           context.summary || null,
                    phase1DataPresent: hasPhase1Outputs,

                    // Phase 1 robot outputs — primary source of truth
                    personaContext,
                    featureContext,
                    planContext: planContext || null,

                    // External research (tributary input)
                    researchContext: researchContext || null,

                    // Phase 2 PM overrides (may be empty)
                    phase2Notes: Object.keys(phase2Notes).length > 0 ? phase2Notes : null,

                    // Experiment cluster config
                    experimentClusterCount: clusterCount,
                },

                outputFormat: {
                    description: isMultiCluster
                        ? `Return a single JSON object containing ${clusterCount} experiment clusters. No markdown fences. No commentary outside the JSON.`
                        : "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: isMultiCluster
                        ? {
                            phase1Synthesis:       "string — 3-5 bullet points (prefix each with \\n• )",
                            derivationAssumptions: "string — 3-5 bullet points (prefix each with \\n• )",
                            experimentClusters: [
                                {
                                    clusterId:   "string — e.g. 'cluster-A'",
                                    hypothesis:  "string — 1-2 sentences describing the solution approach this cluster tests",
                                    userStories: [
                                        {
                                            id:          "string — US-A-001 format (cluster letter + sequence)",
                                            persona:     "string — exact persona name",
                                            story:       "string — 'As a [persona], I want [goal], so that [reason].'",
                                            description: "string — 2-3 sentences of acceptance criteria",
                                            moscow:      "MUST_HAVE | SHOULD_HAVE | COULD_HAVE | WONT_HAVE | PHASE_2",
                                        },
                                    ],
                                    moscowDistribution: {
                                        mustHaveCount:   "integer",
                                        shouldHaveCount: "integer",
                                        couldHaveCount:  "integer",
                                        phase2Count:     "integer",
                                    },
                                },
                            ],
                            totalClusters: "integer",
                        }
                        : {
                            phase1Synthesis:       "string — 3-5 bullet points (prefix each with \\n• ), covering personas identified, features used, MoSCoW signals, and any data gaps",
                            derivationAssumptions: "string — 3-5 bullet points (prefix each with \\n• ), listing assumptions the PM can review and override via feedback",
                            userStories: [
                                {
                                    id:          "string — US-NNN format, sequential, e.g. US-001",
                                    persona:     "string — exact persona name from people robot output",
                                    story:       "string — 'As a [persona], I want [specific goal], so that [concrete reason].'",
                                    description: "string — 2-3 sentences of acceptance criteria",
                                    moscow:      "MUST_HAVE | SHOULD_HAVE | COULD_HAVE | WONT_HAVE | PHASE_2",
                                },
                            ],
                            totalCount:      "integer — total number of stories in userStories array",
                            mustHaveCount:   "integer — number of MUST_HAVE stories",
                            shouldHaveCount: "integer — number of SHOULD_HAVE stories",
                            couldHaveCount:  "integer — number of COULD_HAVE stories",
                            phase2Count:     "integer — number of PHASE_2 stories",
                        },
                    critical: "The JSON object is the complete deliverable. Do not wrap it in markdown. Do not add prose before or after the JSON.",
                },
            },
        };
    }

    // ── Private helpers ────────────────────────────────────────────────

    /**
     * Extract persona context from enrichedContext.
     * Priority: phase1Outputs.people (saved output file) → interview answers.
     *
     * @param {EnrichedContext} context
     * @returns {string}
     */
    _extractPersonaContext(context) {
        if (context.phase1Outputs?.people?.trim()) {
            return context.phase1Outputs.people;
        }

        // Graceful fallback — interview answers that describe user segments
        const a = context.answers || {};
        const parts = [];

        if (a.target_persona)        parts.push(`Target persona: ${a.target_persona}`);
        if (a.primary_user)          parts.push(`Primary user: ${a.primary_user}`);
        if (a.user_pain_points)      parts.push(`Pain points: ${a.user_pain_points}`);
        if (a.jobs_to_be_done)       parts.push(`Jobs to be done: ${a.jobs_to_be_done}`);
        if (a.target_customer)       parts.push(`Target customer: ${a.target_customer}`);
        if (a.target_geo)            parts.push(`Target market: ${a.target_geo}`);

        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: People robot output not available — personas will be inferred from product context."
            );
        }

        return parts.join("\n\n");
    }

    /**
     * Extract feature context from enrichedContext.
     * Priority: phase1Outputs.feature (saved output file) → interview answers.
     *
     * @param {EnrichedContext} context
     * @returns {string}
     */
    _extractFeatureContext(context) {
        if (context.phase1Outputs?.feature?.trim()) {
            return context.phase1Outputs.feature;
        }

        // Graceful fallback — interview answers that describe scope
        const a = context.answers || {};
        const parts = [];

        if (a.core_features || a.key_features) {
            parts.push(`Core features: ${a.core_features || a.key_features}`);
        }
        if (a.mvp_scope || a.minimum_scope) {
            parts.push(`MVP scope: ${a.mvp_scope || a.minimum_scope}`);
        }
        if (a.differentiator || a.unique_value) {
            parts.push(`Differentiator: ${a.differentiator || a.unique_value}`);
        }

        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: Feature robot output not available — features will be inferred from product context."
            );
        }

        return parts.join("\n\n");
    }

    /**
     * Extract plan/roadmap context for phase alignment.
     * Returns null if not available — plan signals are optional for user stories.
     *
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractPlanContext(context) {
        if (context.phase1Outputs?.plan?.trim()) {
            return context.phase1Outputs.plan;
        }
        return null;
    }
}

export default UserStoriesRobot;
