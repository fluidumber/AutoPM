// KpisRobot — Phase 2 execution robot.
//
// Derives adoption, retention, usage, and revenue KPIs with targets, cadences,
// and source systems from Phase 1 money + plan + priority robot outputs.
//
// The North Star metric is distinct from the KPI list — it is the single number
// the whole product optimises for, sourced from the plan robot's northStarMetric
// section. Each KPI has a specific target (not "TBD"), a measurement cadence,
// and a named source system.
//
// Input:  enrichedContext with phase1Outputs.money + phase1Outputs.plan
//         + phase1Outputs.priority
// Output: _claudeInstructions payload — Claude generates the KPIs JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [money]    - Markdown text from the money robot output file
 * @property {string} [plan]     - Markdown text from the plan robot output file
 * @property {string} [priority] - Markdown text from the priority robot output file
 */

/**
 * @typedef {Object} Phase2Context
 * @property {string} [scopeOverride] - PM-supplied scope clarifications
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
 * @typedef {Object} KpiMetric
 * @property {string} metric  - Specific metric name
 * @property {string} target  - Specific target value (no "TBD" allowed)
 * @property {string} cadence - Measurement frequency: Daily / Weekly / Monthly / Quarterly
 * @property {string} source  - Named source system, e.g. "Mixpanel", "Salesforce", "Internal DB"
 */

/**
 * @typedef {Object} KpisOutput
 * @property {string}      productIdea         - Echoed from input
 * @property {Object}      _claudeInstructions - Prompt payload for Claude
 */

class KpisRobot {
    constructor() {
        this.name = "KPIs Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for KPI generation.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<KpisOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing KPIs prompt...\n`);

        // Double-parse guard — MCP may pass a JSON string
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const moneyContext    = this._extractMoneyContext(context);
        const planContext     = this._extractPlanContext(context);
        const priorityContext = this._extractPriorityContext(context);
        const phase2Notes     = context.phase2Context || {};

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager and data analytics specialist with deep experience defining measurable success frameworks for enterprise and consumer products. Your job is to produce a complete, specific KPI framework derived from Phase 1 financial modelling, roadmap, and prioritisation research — with real targets, real cadences, and real source systems.",

                mandate: [
                    "DERIVE FROM PHASE 1 ONLY: The North Star metric, KPI targets, and financial benchmarks must be grounded in the money robot's unit economics and revenue projections, the plan robot's phase milestones, and the priority robot's RICE scores. Do not invent metrics or targets without Phase 1 backing.",
                    "PHASE 1 SYNTHESIS FIRST: Open with a 3-5 bullet synthesis of the measurement signals from Phase 1: the money robot's key metric, the plan robot's northStarMetric, the priority robot's top-ranked features, and the financial scenario that best matches the product's current stage.",
                    "NORTH STAR: Define the single North Star metric — the one number that best captures value delivery and that the whole team optimises for. It must be DISTINCT from KPIs. Source it from the plan robot's northStarMetric section or derive it from the money robot's keyMetricToWatch. State why this is the right North Star for this product at this stage.",
                    "NO TBD TARGETS: Every KPI must have a specific target — a number, percentage, or threshold. If Phase 1 data doesn't give an exact number, derive one from the money robot's scenarios (use the base scenario as the target). State your derivation assumption explicitly.",
                    "FOUR KPI CATEGORIES: Adoption (new users/accounts reaching activation), Retention (users returning and staying), Usage (depth and frequency of engagement with core features), Revenue (ARR, MRR, conversion, expansion). Each category must have 2-4 metrics.",
                    "SOURCE SYSTEMS: Every metric must name a real source system where it will be measured — analytics platform (Mixpanel, Amplitude, Heap), CRM (Salesforce, HubSpot), product database, support platform, or billing system. Do not leave source as 'analytics tool' — name the specific system appropriate for this product's tech stack.",
                    "CADENCE LOGIC: Daily metrics = operational health (errors, load time). Weekly = growth and activation signals. Monthly = retention and revenue. Quarterly = strategic KPIs and OKR check-ins. Assign each KPI the right cadence.",
                    "FEEDBACK MECHANISMS: Include 3-5 qualitative feedback mechanisms (NPS, CSAT, user interviews, support ticket analysis, in-app surveys) with their cadence and what decision they inform. These complement the quantitative KPIs.",
                    "PHASE ALIGNMENT: Where the plan robot defined phase milestones, align KPI targets to phases — e.g. 'Target for Phase 1 completion: X. Target for Phase 2 completion: Y.' This makes the KPI framework a tracking tool for the roadmap.",
                    "SPECIFICITY BAR: 'Increase daily active users' is not a KPI. 'DAU: 500 at 30 days post-launch (base scenario), measured weekly in Mixpanel' is a KPI.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "3-5 bullet points: money robot's key metric, plan robot's North Star signal, priority robot's top features (these drive usage KPIs), and the financial scenario that sets the target baseline.",
                        mustInclude: ["Money robot key metric", "Plan robot North Star signal", "Priority robot top features", "Financial scenario for targets"],
                    },
                    northStar: {
                        instructions: "The single North Star metric: name, definition, target, cadence, source system, and a 2-3 sentence explanation of why this is the right North Star for this product at this stage. Must be distinct from the KPI list.",
                        outputShape: {
                            metric:     "string — metric name",
                            definition: "string — precise definition (what counts as one unit of this metric)",
                            target:     "string — specific target with timeframe",
                            cadence:    "string — measurement frequency",
                            source:     "string — named system",
                            rationale:  "string — why this is the right North Star for this product/stage",
                        },
                    },
                    adoption: {
                        instructions: "2-4 adoption KPIs: metrics tracking new users/accounts reaching activation. Activation = the moment a user first experiences the core value proposition. Derive the activation definition from the most critical must-have feature.",
                        targetCount: "2-4 metrics",
                        outputShape: [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                    },
                    retention: {
                        instructions: "2-4 retention KPIs: metrics tracking users returning and staying. Include at least one churn metric and one cohort retention metric. Targets must be derived from the money robot's LTV/churn assumptions.",
                        targetCount: "2-4 metrics",
                        outputShape: [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                    },
                    usage: {
                        instructions: "2-4 usage KPIs: metrics tracking depth and frequency of engagement with core features. At least one metric per top-priority feature from the priority robot's mvpBundle.",
                        targetCount: "2-4 metrics",
                        outputShape: [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                    },
                    revenue: {
                        instructions: "2-4 revenue KPIs: ARR/MRR, conversion rates, expansion revenue. Targets must be aligned with the money robot's base scenario projections.",
                        targetCount: "2-4 metrics",
                        outputShape: [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                    },
                    feedbackMechanisms: {
                        instructions: "3-5 qualitative feedback mechanisms with cadence and the decision they inform. These supplement quantitative KPIs.",
                        targetCount: "3-5 mechanisms",
                        outputShape: ["string — 'Mechanism (cadence): what decision this informs'"],
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    revenueModel:   context.answers?.revenue_model || null,
                    targetGeo:      context.answers?.target_geo || null,
                    marketSegment:  context.answers?.market_segment || null,
                    timeline:       context.answers?.timeline || null,
                    fundingStage:   context.answers?.funding_stage || null,
                    moneyContext,
                    planContext:    planContext || null,
                    priorityContext: priorityContext || null,
                    phase2Notes:    Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis:    "string — 3-5 bullet points (prefix each with \\n• )",
                        northStar:          { metric: "string", definition: "string", target: "string", cadence: "string", source: "string", rationale: "string" },
                        adoption:           [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                        retention:          [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                        usage:              [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                        revenue:            [{ metric: "string", target: "string", cadence: "string", source: "string" }],
                        feedbackMechanisms: ["string"],
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
     * Extract money context from enrichedContext.
     * Priority: phase1Outputs.money → interview answers.
     *
     * @param {EnrichedContext} context
     * @returns {string}
     */
    _extractMoneyContext(context) {
        if (context.phase1Outputs?.money?.trim()) {
            return context.phase1Outputs.money;
        }
        const a = context.answers || {};
        const parts = [];
        if (a.revenue_model)        parts.push(`Revenue model: ${a.revenue_model}`);
        if (a.willingness_to_pay)   parts.push(`Pricing context: ${a.willingness_to_pay}`);
        if (a.funding_stage)        parts.push(`Stage: ${a.funding_stage}`);
        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: Money robot output not available — KPI targets will be inferred from product context."
            );
        }
        return parts.join("\n\n");
    }

    /**
     * Extract plan context from enrichedContext.
     * Priority: phase1Outputs.plan → interview timeline answer.
     *
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractPlanContext(context) {
        if (context.phase1Outputs?.plan?.trim()) {
            return context.phase1Outputs.plan;
        }
        const timeline = context.answers?.timeline;
        return timeline ? `Timeline: ${timeline}` : null;
    }

    /**
     * Extract priority context from enrichedContext.
     * Priority: phase1Outputs.priority → null (optional for KPIs).
     *
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractPriorityContext(context) {
        if (context.phase1Outputs?.priority?.trim()) {
            return context.phase1Outputs.priority;
        }
        return null;
    }
}

export default KpisRobot;
