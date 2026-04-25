// GtmReadinessRobot — Phase 2 execution robot.
//
// Produces the Go-to-Market readiness section of the PDD:
//   - CX stage matrix (Explore / Offer / Buy-Setup / In-Life / Cancel-Leave)
//   - Provisioning plan
//   - Rollout plan with regions and waves
//   - Preview → GA cohort plan
//   - Pricing and monetisation summary
//   - Support and troubleshooting plan
//
// Derived from Phase 1 plan + money robot outputs and Phase 2 context manifest.
//
// Input:  enrichedContext with phase1Outputs.plan + phase1Outputs.money + phase2Context
// Output: _claudeInstructions payload — Claude generates the GTM readiness JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [plan]  - Markdown text from the plan robot output file
 * @property {string} [money] - Markdown text from the money robot output file
 */

/**
 * @typedef {Object} Phase2Context
 * @property {string}   [scopeOverride]  - PM-supplied scope boundaries
 * @property {string[]} [regions]        - PM-supplied target regions for rollout
 * @property {Object}   [links]          - Jira, TDD, Figma, Confluence links
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
 * @typedef {Object} CxStageItem
 * @property {string}  item     - Activity or deliverable for this stage
 * @property {boolean} required - Is this required for launch or post-launch?
 */

/**
 * @typedef {Object} CxStage
 * @property {"Explore"|"Offer"|"Buy-Setup"|"In-Life"|"Cancel-Leave"} stage
 * @property {CxStageItem[]} items
 */

/**
 * @typedef {Object} RolloutWave
 * @property {number} waveNumber - Wave sequence number
 * @property {string} scope      - Who is in this wave (e.g. "5 design partners, US only")
 * @property {string} timing     - When this wave starts (e.g. "Week 1 of preview")
 */

/**
 * @typedef {Object} GtmReadinessOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 */

class GtmReadinessRobot {
    constructor() {
        this.name = "GTM Readiness Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for GTM readiness analysis.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<GtmReadinessOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing GTM readiness prompt...\n`);

        // Double-parse guard
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const planContext  = this._extractPlanContext(context);
        const moneyContext = this._extractMoneyContext(context);
        const phase2Notes  = context.phase2Context || {};
        const targetGeo    = context.answers?.target_geo || null;
        const revenueModel = context.answers?.revenue_model || null;
        const timeline     = context.answers?.timeline || null;

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager and go-to-market strategist with deep experience launching enterprise SaaS products globally. Your job is to produce a complete, execution-ready GTM readiness plan derived from Phase 1 research — specific enough for a product launch team to action directly.",

                mandate: [
                    "DERIVE FROM PHASE 1 ONLY: The rollout plan, waves, pricing, and provisioning must be grounded in the plan robot's phase structure, the money robot's pricing and revenue model, and the stated target geography from the interview. Do not invent GTM elements not supported by Phase 1 data.",
                    "PHASE 1 SYNTHESIS: Open with a 3-5 bullet synthesis of the GTM signals from Phase 1: plan robot's phase milestones, money robot's pricing and monetisation model, and target geography's market readiness implications.",
                    "CX STAGE MATRIX — ALL 5 STAGES: Cover every stage of the customer experience lifecycle: Explore (discovery, marketing), Offer (sales, trials, pricing), Buy-Setup (purchase, onboarding, provisioning), In-Life (support, upgrades, renewals), Cancel-Leave (offboarding, win-back). For each stage: list the specific activities/deliverables and flag which are required for launch vs. post-launch.",
                    "PROVISIONING PLAN: Describe how the product is provisioned to a new customer end-to-end. For enterprise B2B: who configures what, how long it takes, what the customer needs to provide. For self-serve: what the sign-up and activation flow looks like. Be specific — name the steps.",
                    "ROLLOUT WAVES: Design 2-4 rollout waves from preview to GA. Each wave must have a specific scope (who is in it, e.g. 'top 5 design partners in US'), timing relative to a milestone, and exit criteria before the next wave. Waves must align with the plan robot's phase structure.",
                    "PREVIEW TO GA: Define the preview cohort specifically — who qualifies, how many accounts/users, what they get, and how long preview lasts. The GA criteria must be specific and measurable (not 'when we feel ready').",
                    "PRICING AND MONETISATION: Summarise the pricing model derived from the money robot — tiers, per-seat vs. usage, enterprise contract structure, and any freemium component. Reference the money robot's pricing data directly.",
                    "SUPPORT AND TROUBLESHOOTING: Define the support model for launch — tier 1/2/3 ownership, SLA commitments, knowledge base requirements, known day-1 issues and their workarounds. Derive known day-1 issues from the feasibility-tech concerns where available.",
                    "GEOGRAPHY SENSITIVITY: If the rollout covers multiple regions (e.g. US + EU), call out region-specific requirements — data residency, localisation, compliance, partner channel differences.",
                    "NO GENERIC OUTPUT: 'Create marketing materials' is not an item. 'Produce a 1-page competitive battlecard for Genesys Cloud CX for the US enterprise segment by Wave 1' is an item.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "3-5 bullet points: plan robot phase milestones that gate GTM activities, money robot pricing signals, and geography's GTM implications.",
                        mustInclude: ["Plan phase milestones", "Pricing model signals", "Geography GTM implications"],
                    },
                    cxStageMatrix: {
                        instructions: "All 5 CX stages. Each stage: 3-6 specific items, each flagged required (true = must have for launch) or not. Items must be specific to this product — not generic SaaS launch checklist items.",
                        stages: ["Explore", "Offer", "Buy-Setup", "In-Life", "Cancel-Leave"],
                        outputShape: [{
                            stage: "Explore | Offer | Buy-Setup | In-Life | Cancel-Leave",
                            items: [{ item: "string — specific to this product", required: "boolean" }],
                        }],
                    },
                    provisioning: {
                        instructions: "End-to-end description of how a new customer gets the product provisioned and activated. Name the steps, who does them, and how long each takes. For enterprise B2B: include SSO setup, admin configuration, and user onboarding steps.",
                    },
                    rollout: {
                        instructions: "2-4 rollout waves from preview to GA. Each wave: who is in it (specific scope), when it starts (timing relative to a milestone), and exit criteria.",
                        outputShape: {
                            plan:    "string — prose summary of the overall rollout approach",
                            regions: ["string — target region names"],
                            waves: [{
                                waveNumber: "integer",
                                scope:      "string — who is in this wave, specific",
                                timing:     "string — when this wave starts, relative to a milestone",
                            }],
                        },
                    },
                    previewToGA: {
                        instructions: "Preview cohort definition, duration, feedback mechanism, and specific measurable GA criteria.",
                        outputShape: {
                            previewCohortDescription: "string — who qualifies, how many accounts, what they get",
                            previewDurationDays:       "integer — number of days",
                            feedbackMechanism:         "string — how feedback is collected from preview users",
                            gaCriteria:                "string — specific, measurable criteria for GA declaration",
                        },
                    },
                    pricingAndMonetization: {
                        instructions: "Pricing model summary derived from money robot. Tiers, per-seat vs. usage, enterprise contract structure. Reference the money robot's pricing assumptions directly.",
                    },
                    supportAndTroubleshooting: {
                        instructions: "Support model for launch: tier 1/2/3 ownership, SLA commitments, knowledge base scope, and known day-1 issues with workarounds (derived from feasibility-tech concerns where available).",
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    targetGeo:      targetGeo,
                    revenueModel:   revenueModel,
                    timeline:       timeline,
                    marketSegment:  context.answers?.market_segment || null,
                    planContext,
                    moneyContext:   moneyContext || null,
                    phase2Notes:    Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis:       "string — 3-5 bullet points (prefix each with \\n• )",
                        cxStageMatrix:         [{ stage: "string", items: [{ item: "string", required: "boolean" }] }],
                        provisioning:          "string — prose",
                        rollout:               { plan: "string", regions: ["string"], waves: [{ waveNumber: "integer", scope: "string", timing: "string" }] },
                        previewToGA:           { previewCohortDescription: "string", previewDurationDays: "integer", feedbackMechanism: "string", gaCriteria: "string" },
                        pricingAndMonetization: "string — prose",
                        supportAndTroubleshooting: "string — prose",
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
     * @param {EnrichedContext} context
     * @returns {string}
     */
    _extractPlanContext(context) {
        if (context.phase1Outputs?.plan?.trim()) {
            return context.phase1Outputs.plan;
        }
        const timeline = context.answers?.timeline;
        return timeline
            ? `Timeline: ${timeline}`
            : `Product: ${context.productIdea || context.summary || "Not specified"}\nNOTE: Plan robot output not available.`;
    }

    /**
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractMoneyContext(context) {
        if (context.phase1Outputs?.money?.trim()) {
            return context.phase1Outputs.money;
        }
        const a = context.answers || {};
        const parts = [];
        if (a.revenue_model)      parts.push(`Revenue model: ${a.revenue_model}`);
        if (a.willingness_to_pay) parts.push(`Pricing context: ${a.willingness_to_pay}`);
        return parts.length > 0 ? parts.join("\n") : null;
    }
}

export default GtmReadinessRobot;
