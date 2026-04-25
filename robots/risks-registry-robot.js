// RisksRegistryRobot — Phase 2 execution robot.
//
// Produces a structured risk register covering 5 categories:
//   Delivery / Technical / Adoption / GTM / Dependency
//
// Each risk has: category, description, probability, impact, mitigation, owner.
// Content is derived from Phase 1 plan + feasibility-tech outputs and Phase 2
// gtm-readiness output (if available).
//
// Input:  enrichedContext with phase1Outputs.plan + phase1Outputs["feasibility-tech"]
//         + phase1Outputs["gtm-readiness"]
// Output: _claudeInstructions payload — Claude generates the risks JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [plan]               - Markdown text from plan robot output
 * @property {string} ["feasibility-tech"]  - Markdown text from feasibility-tech output
 * @property {string} ["gtm-readiness"]     - Markdown text from gtm-readiness output (optional)
 */

/**
 * @typedef {Object} EnrichedContext
 * @property {string}        productIdea     - Product name or one-line description
 * @property {Object}        answers         - Interview answer map (qid → value)
 * @property {string}        [summary]       - Product summary from interview
 * @property {Phase1Outputs} [phase1Outputs] - Loaded robot output text
 * @property {Object}        [phase2Context] - Phase 2 PM-provided context manifest
 */

/**
 * @typedef {Object} Risk
 * @property {"Delivery"|"Technical"|"Adoption"|"GTM"|"Dependency"} category  - Risk category
 * @property {string}                                                risk       - Specific risk description
 * @property {"Low"|"Medium"|"High"}                                probability - Likelihood of occurrence
 * @property {"Low"|"Medium"|"High"}                                impact      - Impact if it occurs
 * @property {string}                                                mitigation  - Concrete mitigation approach
 * @property {string}                                                owner       - Role responsible for mitigation
 */

/**
 * @typedef {Object} RisksRegistryOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 */

class RisksRegistryRobot {
    constructor() {
        this.name = "Risks Registry Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for risk register generation.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<RisksRegistryOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing risk register prompt...\n`);

        // Double-parse guard
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const planContext       = this._extractPlanContext(context);
        const feasibilityContext = this._extractFeasibilityContext(context);
        const gtmContext        = this._extractGtmContext(context);
        const phase2Notes       = context.phase2Context || {};

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager and risk management specialist with deep experience delivering enterprise software products on time and at scale. Your job is to produce a complete, actionable risk register that a PM can present to stakeholders and use to track mitigations throughout the delivery lifecycle.",

                mandate: [
                    "DERIVE FROM PHASE 1 ONLY: Every risk must be traceable to a specific signal in the plan robot (phase risks, critical path), feasibility-tech robot (technical concerns, infra dependencies), or gtm-readiness robot (launch risks, provisioning gaps). Do not invent risks that are not grounded in Phase 1 evidence.",
                    "PHASE 1 SYNTHESIS: Open with a 3-5 bullet synthesis of the highest-risk signals across Phase 1: the plan robot's #1 phase risk, the feasibility-tech's most critical technical concerns, and any GTM readiness gaps from the gtm-readiness robot.",
                    "FIVE CATEGORIES — ALL COVERED: Produce risks across all five categories. Delivery = timeline, resource, dependency slippage. Technical = architecture, integration, performance, security risks. Adoption = user acceptance, change management, onboarding friction. GTM = pricing, positioning, competitive response, launch readiness. Dependency = third-party vendors, internal systems, regulatory approvals.",
                    "PROBABILITY AND IMPACT CALIBRATION: Be honest — not everything is High. Use the plan robot's stated risks and feasibility-tech's mitigations to calibrate. A risk with an existing strong mitigation typically has lower residual probability.",
                    "MITIGATIONS MUST BE CONCRETE: 'Monitor closely' is not a mitigation. 'Reduce scope to core AI transcription feature only and defer MDM integration to Phase 2, saving 3 weeks of engineering' is a mitigation. Each mitigation must be actionable and owned.",
                    "OWNERS MUST BE ROLE-SPECIFIC: Assign each risk to a real role — PM, Engineering Lead, DevOps, Legal, Sales, Marketing, Executive Sponsor. Not 'the team'.",
                    "VOLUME: Produce 15-25 risks across all five categories. At least 2 risks per category. The risk register should reflect the real complexity of this product — neither trivially short nor padded with duplicates.",
                    "HIGH-RISK SUMMARY: After the full register, produce a 'Top 5 Risks' summary — the five risks with the highest combined probability × impact score. These are the ones the PM must present to the executive sponsor.",
                    "SPECIFICITY BAR: 'The project could be delayed' is not a risk. 'The React Native MDM integration requires a 6-week vendor engagement with the MDM provider that has not been initiated, creating a critical path risk to the Q3 2026 preview launch' is a risk.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "3-5 bullet points: plan robot's top phase risk, feasibility-tech's most critical concerns, GTM readiness gaps, and any dependency that is on the critical path.",
                        mustInclude: ["Plan robot phase risk", "Feasibility-tech critical concerns", "GTM readiness gaps", "Critical path dependencies"],
                    },
                    risks: {
                        instructions: "The full risk register. 15-25 risks across all 5 categories. Each risk: category, specific description, probability, impact, concrete mitigation, and named role owner.",
                        categories: ["Delivery", "Technical", "Adoption", "GTM", "Dependency"],
                        targetCount: "15-25 risks, at least 2 per category",
                        outputShape: [{
                            category:    "Delivery | Technical | Adoption | GTM | Dependency",
                            risk:        "string — specific, product-grounded risk description",
                            probability: "Low | Medium | High",
                            impact:      "Low | Medium | High",
                            mitigation:  "string — concrete, actionable mitigation",
                            owner:       "string — specific role responsible for mitigation",
                        }],
                    },
                    top5Risks: {
                        instructions: "The 5 highest-priority risks (highest probability × impact). These are the PM's executive summary risk talking points.",
                        outputShape: ["string — risk summary with category, probability, impact, and one-line mitigation"],
                    },
                },

                productContext: {
                    productIdea:        context.productIdea || context.summary || null,
                    timeline:           context.answers?.timeline || null,
                    teamSize:           context.answers?.team_size || null,
                    techStack:          context.answers?.tech_preferences || null,
                    targetGeo:          context.answers?.target_geo || null,
                    marketSegment:      context.answers?.market_segment || null,
                    planContext,
                    feasibilityContext: feasibilityContext || null,
                    gtmContext:         gtmContext || null,
                    phase2Notes:        Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis: "string — 3-5 bullet points (prefix each with \\n• )",
                        risks: [{
                            category:    "string",
                            risk:        "string",
                            probability: "Low | Medium | High",
                            impact:      "Low | Medium | High",
                            mitigation:  "string",
                            owner:       "string",
                        }],
                        top5Risks:  ["string"],
                        totalCount: "integer — total number of risks",
                        byCategory: {
                            Delivery:   "integer",
                            Technical:  "integer",
                            Adoption:   "integer",
                            GTM:        "integer",
                            Dependency: "integer",
                        },
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
        const parts = [];
        if (context.answers?.timeline) parts.push(`Timeline: ${context.answers.timeline}`);
        if (context.answers?.team_size) parts.push(`Team: ${context.answers.team_size}`);
        if (parts.length === 0) {
            parts.push(`Product: ${context.productIdea || context.summary || "Not specified"}`);
            parts.push("NOTE: Plan robot output not available.");
        }
        return parts.join("\n");
    }

    /**
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractFeasibilityContext(context) {
        if (context.phase1Outputs?.["feasibility-tech"]?.trim()) {
            return context.phase1Outputs["feasibility-tech"];
        }
        const techStack = context.answers?.tech_preferences;
        return techStack ? `Tech stack: ${techStack}` : null;
    }

    /**
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractGtmContext(context) {
        if (context.phase1Outputs?.["gtm-readiness"]?.trim()) {
            return context.phase1Outputs["gtm-readiness"];
        }
        // gtm-readiness is a Phase 2 robot — may not exist yet
        const parts = [];
        if (context.answers?.target_geo)   parts.push(`Target market: ${context.answers.target_geo}`);
        if (context.answers?.revenue_model) parts.push(`Revenue model: ${context.answers.revenue_model}`);
        return parts.length > 0 ? parts.join("\n") : null;
    }
}

export default RisksRegistryRobot;
