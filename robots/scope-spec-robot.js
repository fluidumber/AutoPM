// ScopeSpecRobot — Phase 2 execution robot.
//
// Derives the full scope specification from Phase 1 feature + plan robot outputs.
// Produces: critical-change flag, core/non-core functionality split, roles &
// permissions, out-of-scope list, assumptions, constraints, and limitations.
//
// Input:  enrichedContext with phase1Outputs.feature + phase1Outputs.plan
// Output: _claudeInstructions payload — Claude generates the scope spec JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [feature] - Markdown text from the feature robot output file
 * @property {string} [plan]    - Markdown text from the plan robot output file
 */

/**
 * @typedef {Object} Phase2Context
 * @property {string} [scopeOverride]   - PM-supplied explicit scope boundaries or corrections
 * @property {string} [featureOverride] - PM-supplied feature clarifications
 */

/**
 * @typedef {Object} EnrichedContext
 * @property {string}        productIdea     - Product name or one-line description
 * @property {Object}        answers         - Interview answer map (qid → value)
 * @property {string}        [summary]       - Product summary from interview
 * @property {Phase1Outputs} [phase1Outputs] - Loaded Phase 1 robot output text
 * @property {Phase2Context} [phase2Context] - Phase 2 PM-provided context manifest
 */

/**
 * @typedef {Object} Functionality
 * @property {string} name        - Short capability name
 * @property {string} description - What it does and why it is in/out of core scope
 */

/**
 * @typedef {Object} ScopeSpecOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 * @property {string}   _claudeInstructions.role
 * @property {string[]} _claudeInstructions.mandate
 * @property {Object}   _claudeInstructions.requiredSections
 * @property {Object}   _claudeInstructions.productContext
 * @property {Object}   _claudeInstructions.outputFormat
 */

class ScopeSpecRobot {
    constructor() {
        this.name = "Scope Spec Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for scope specification.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<ScopeSpecOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing scope specification prompt...\n`);

        // Double-parse guard — MCP may pass a JSON string
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const featureContext = this._extractFeatureContext(context);
        const planContext    = this._extractPlanContext(context);
        const phase2Notes    = context.phase2Context || {};
        const techStack      = context.answers?.tech_preferences || null;
        const timeline       = context.answers?.timeline || null;

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager and scope definition specialist with deep expertise in writing airtight scope specifications for enterprise software products. Your job is to draw clear, defensible lines between what is in scope, what is out of scope, and what the product will deliberately not do — derived entirely from Phase 1 research.",

                mandate: [
                    "DERIVE FROM PHASE 1 ONLY: Every item in your scope spec must be traceable to the feature robot output or plan robot output. Do not invent scope items. If Phase 1 data is missing, note it and make your best inference — never leave a section empty.",
                    "CRITICAL CHANGE FLAG: Determine whether this product is a critical change (breaking change, regulatory impact, or major customer-facing disruption). Use the feature complexity, plan phases, and tech constraints to reason. A binary yes/no with a specific, product-grounded justification — not a generic answer.",
                    "CORE vs NON-CORE SPLIT: Core functionalities = features on the mvpCriticalPath or flagged as MUST_HAVE in the feature robot. Non-core = nice-to-have and future features. Every functionality item needs a name and a 2-3 sentence description that explains what it does AND why it lands in that category.",
                    "ROLES AND PERMISSIONS: Derive from the buyer/user split in interview context and the feature robot's segment-specific features. Name actual roles (not 'Admin', 'User' — use product-specific names). State what each role can and cannot do for the core functionalities.",
                    "OUT OF SCOPE: Be specific and ruthless. Generic items like 'out of scope: billing integration' are rejected. Each out-of-scope item must reference why it was excluded — e.g. 'X is out of scope for v1 because it depends on Y infrastructure not available within the stated timeline.'",
                    "ASSUMPTIONS: State the assumptions the team is making that, if wrong, would change the scope materially. Each assumption must be falsifiable — something that could be proven wrong by research or a decision.",
                    "CONSTRAINTS: Hard limits that cannot be changed — timeline, team size, tech stack, regulatory, budget. Derive from interview answers. Each constraint must reference its source.",
                    "LIMITATIONS: Known limitations of v1 that are accepted and will be addressed in later phases. These are deliberate decisions, not failures. Reference the plan robot's phase structure where available.",
                    "NO GENERIC FILLER: Every bullet point must be product-specific. 'The product will not support X' is only acceptable if X is a realistic ask that a stakeholder might make.",
                    "SPECIFICITY BAR: If a stakeholder read this scope spec, they should know exactly what is and is not being built, and why. Ambiguity is a defect.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "Open with a 3-5 bullet synthesis of what you found in the feature and plan outputs that drives this scope spec. Explain: which features you are treating as core, which phase of the plan defines v1 scope, and any signals about critical change.",
                        mustInclude: ["Feature robot source signals", "Plan robot phase alignment", "Critical-change signal source"],
                    },
                    criticalChange: {
                        instructions: "Binary determination: is this a critical change? Provide a specific, product-grounded reasoning paragraph. Reference the tech stack, feature complexity, and user impact. A critical change means: breaking change to existing workflows, regulatory/compliance impact, or major architecture shift.",
                        outputShape: {
                            isCritical: "boolean",
                            reasoning: "string — 2-4 sentences specific to this product",
                        },
                    },
                    coreFunctionalities: {
                        instructions: "List the core functionalities in v1 scope. Derived from mvpCriticalPath and MUST_HAVE features in the feature robot output. Each item: name (specific capability) + description (what it does + why it is core to the value proposition).",
                        targetCount: "6-12 items",
                        outputShape: [{ name: "string", description: "string — 2-3 sentences" }],
                    },
                    nonCoreFunctionalities: {
                        instructions: "List features and capabilities that are out of v1 scope but planned for later phases. Derived from nice-to-have and future features. Each item must reference which phase it targets (if plan robot provided phase names).",
                        targetCount: "5-10 items",
                        outputShape: [{ name: "string", description: "string — 2-3 sentences including target phase" }],
                    },
                    rolesAndPermissions: {
                        instructions: "Describe the roles in the system and what each can do. Use product-specific role names (not generic Admin/User). Derive from the buyer/user split and feature robot segment-specific features. Format as a prose paragraph or structured role cards — whichever is clearer for this product.",
                    },
                    outOfScope: {
                        instructions: "Explicit list of what this product will NOT do in v1, with a reason for each. 8-12 items. Each must be a realistic ask that a stakeholder might make — not obvious non-starters.",
                        targetCount: "8-12 items",
                        outputShape: ["string — 'X is out of scope because Y'"],
                    },
                    assumptions: {
                        instructions: "List the assumptions the team is making that, if proven wrong, would change the scope materially. 5-8 items. Each must be falsifiable.",
                        targetCount: "5-8 items",
                        outputShape: ["string — specific, falsifiable assumption"],
                    },
                    constraints: {
                        instructions: "Hard limits that cannot be changed — timeline, team, tech stack, regulatory. Derive from interview answers. 4-8 items. Each must reference its source (e.g. 'Timeline: 6-month build, per PM interview answer').",
                        targetCount: "4-8 items",
                        outputShape: ["string — constraint with source reference"],
                    },
                    limitations: {
                        instructions: "Known v1 limitations that are accepted and deliberately deferred to later phases. 4-8 items. Each must reference the plan phase in which it will be addressed (if available from plan robot output).",
                        targetCount: "4-8 items",
                        outputShape: ["string — limitation and the phase/condition that will address it"],
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    timeline:       timeline,
                    techStack:      techStack,
                    teamSize:       context.answers?.team_size || null,
                    fundingStage:   context.answers?.funding_stage || null,
                    painPoint:      context.answers?.pain_point || null,
                    buyerVsUser:    context.answers?.buyer_vs_user || null,
                    featureContext,
                    planContext:    planContext || null,
                    phase2Notes:    Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object with all sections. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis:        "string — 3-5 bullet points (prefix each with \\n• )",
                        criticalChange:         { isCritical: "boolean", reasoning: "string" },
                        coreFunctionalities:    [{ name: "string", description: "string" }],
                        nonCoreFunctionalities: [{ name: "string", description: "string" }],
                        rolesAndPermissions:    "string — prose or structured role cards",
                        outOfScope:             ["string"],
                        assumptions:            ["string"],
                        constraints:            ["string"],
                        limitations:            ["string"],
                    },
                    critical: "The JSON object is the complete deliverable. Output ONLY the JSON.",
                },
            },
        };

        this.successCount++;
        return analysis;
    }

    // ── Private helpers ────────────────────────────────────────────────

    /**
     * Extract feature context from enrichedContext.
     * Priority: phase1Outputs.feature → interview answers.
     *
     * @param {EnrichedContext} context
     * @returns {string}
     */
    _extractFeatureContext(context) {
        if (context.phase1Outputs?.feature?.trim()) {
            return context.phase1Outputs.feature;
        }

        const a = context.answers || {};
        const parts = [];
        if (a.pain_point)        parts.push(`Core pain: ${a.pain_point}`);
        if (a.tech_preferences)  parts.push(`Tech stack: ${a.tech_preferences}`);
        if (a.timeline)          parts.push(`Timeline: ${a.timeline}`);

        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: Feature robot output not available — scope will be inferred from product context."
            );
        }
        return parts.join("\n\n");
    }

    /**
     * Extract plan/roadmap context from enrichedContext.
     * Priority: phase1Outputs.plan → null (optional input for scope-spec).
     *
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractPlanContext(context) {
        if (context.phase1Outputs?.plan?.trim()) {
            return context.phase1Outputs.plan;
        }
        // Plan is not strictly required for scope-spec — degrade gracefully
        const timeline = context.answers?.timeline;
        return timeline ? `Timeline: ${timeline}` : null;
    }
}

export default ScopeSpecRobot;
