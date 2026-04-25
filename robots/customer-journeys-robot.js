// CustomerJourneysRobot — Phase 2 execution robot.
//
// Produces end-to-end narrative customer journeys for the top 2-3 personas,
// derived from Phase 1 people + feature robot outputs.
//
// Each journey follows a persona from the moment they encounter the product
// through full adoption — grounded in the specific features and pain points
// identified in Phase 1, not generic journey templates.
//
// Input:  enrichedContext with phase1Outputs.people + phase1Outputs.feature
// Output: _claudeInstructions payload — Claude generates the journeys JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [people]  - Markdown text from the people robot output file
 * @property {string} [feature] - Markdown text from the feature robot output file
 */

/**
 * @typedef {Object} Phase2Context
 * @property {string} [personaOverride]  - PM-supplied persona clarifications
 * @property {string} [featureOverride]  - PM-supplied feature clarifications
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
 * @typedef {Object} JourneyStep
 * @property {number} stepNumber - Sequential step number starting at 1
 * @property {string} action     - What the persona does at this step
 * @property {string} detail     - What happens in the product + how the persona feels/thinks
 */

/**
 * @typedef {Object} CustomerJourney
 * @property {string}        persona - Exact persona name from people robot
 * @property {string}        title   - Short descriptive title for this journey
 * @property {JourneyStep[]} steps   - Ordered list of journey steps
 */

/**
 * @typedef {Object} CustomerJourneysOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 * @property {string}   _claudeInstructions.role
 * @property {string[]} _claudeInstructions.mandate
 * @property {Object}   _claudeInstructions.requiredSections
 * @property {Object}   _claudeInstructions.productContext
 * @property {Object}   _claudeInstructions.outputFormat
 */

class CustomerJourneysRobot {
    constructor() {
        this.name = "Customer Journeys Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for customer journey generation.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<CustomerJourneysOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing customer journeys prompt...\n`);

        // Double-parse guard — MCP may pass a JSON string
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const personaContext = this._extractPersonaContext(context);
        const featureContext = this._extractFeatureContext(context);
        const phase2Notes    = context.phase2Context || {};

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager and UX researcher specialising in customer journey mapping. You turn persona research and feature analysis into vivid, specific, end-to-end journey narratives that engineering and design teams can use to validate product decisions. You do not write generic journey templates — every step is grounded in the specific product, personas, and features from Phase 1.",

                mandate: [
                    "PERSONAS FROM PHASE 1 ONLY: Use only the personas identified in the people robot output. Do not invent new personas. Select the top 2-3 personas by strategic priority — the ones whose journey most clearly validates the product's core value proposition.",
                    "FEATURES FROM PHASE 1 ONLY: The product interactions at each step must reference actual features from the feature robot output — specifically must-have features for the core journey, nice-to-have features for the enriched journey. Do not invent product behaviour.",
                    "PHASE 1 SYNTHESIS FIRST: Before writing any journeys, output a brief synthesis (3-5 bullets) explaining: which personas you selected and why, which features are central to each journey, and any key signals from the people robot's journey map section you are building on.",
                    "STEP DEPTH: Each step must have a specific action (what the persona does) and a rich detail (what the product does, what the persona thinks/feels, and any friction or delight moment). Generic steps like 'User logs in' are failures — name the specific screen, feature, or interaction.",
                    "JOURNEY SCOPE: Each journey should span the full arc — from the moment the persona first encounters the product (or the triggering event that creates need) through first value, regular use, and at least one moment of advanced use or advocacy. 8-14 steps per journey.",
                    "EMOTIONAL LAYER: At least 3 steps per journey must include an emotional note — how the persona feels at that moment and why. These are the moments the design team needs to get right.",
                    "FRICTION POINTS: At least 2 steps per journey must be friction points — moments where the persona might drop off, hesitate, or need help. Include what the product does to mitigate each friction point.",
                    "DELIGHT MOMENTS: At least 1 step per journey must be a delight moment — the moment the persona realises the product is genuinely solving their problem. This is the activation moment the team needs to engineer.",
                    "JOURNEY TITLES: Give each journey a specific, descriptive title that names the persona and their key outcome — e.g. 'The Contact Centre Supervisor discovers real-time AI coaching for the first time' not 'Supervisor onboarding journey'.",
                    "NO RE-PROMPTING: Do not ask the PM for information already in Phase 1 outputs. If persona or feature data is missing, note it in the synthesis section and make your best inference.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "3-5 bullet points: which personas selected and why, which features anchor each journey, and what signals from the people robot's journey map section you are building on.",
                        mustInclude: ["Persona selection rationale", "Feature anchors per journey", "People robot journey map signals"],
                    },
                    customerJourneys: {
                        instructions: "2-3 complete journey narratives. Each journey covers one persona from triggering event → first use → regular use → advanced use / advocacy. Each step must have a specific action and a rich detail. Minimum 8 steps, maximum 14 steps per journey.",
                        perJourneyShape: {
                            persona:  "string — exact persona name from people robot",
                            title:    "string — descriptive title naming persona + key outcome",
                            steps: [{
                                stepNumber: "integer — starting at 1",
                                action:     "string — what the persona does at this step (specific to this product)",
                                detail:     "string — what the product does, how the persona feels/thinks, any friction or delight moment (2-4 sentences)",
                            }],
                        },
                        targetCount: "2-3 journeys",
                    },
                    journeyInsights: {
                        instructions: "After the journeys, output 3-5 cross-journey insights: patterns across journeys that the product team must address. E.g. a friction point that appears in all journeys, a delight moment that could be amplified, or a persona-specific need that current features don't address well.",
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    targetMarket:   context.answers?.target_geo || null,
                    buyerVsUser:    context.answers?.buyer_vs_user || null,
                    painPoint:      context.answers?.pain_point || null,
                    personaContext,
                    featureContext,
                    phase2Notes:    Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis: "string — 3-5 bullet points (prefix each with \\n• )",
                        customerJourneys: [
                            {
                                persona:  "string — exact persona name",
                                title:    "string — descriptive journey title",
                                steps: [{
                                    stepNumber: "integer",
                                    action:     "string — specific action",
                                    detail:     "string — 2-4 sentences covering product behaviour, persona emotion, and any friction/delight",
                                }],
                                stepCount: "integer — number of steps in this journey",
                            },
                        ],
                        journeyInsights:  "string — 3-5 bullet points (prefix each with \\n• )",
                        totalJourneys:    "integer — number of journeys generated",
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
     * Extract persona context from enrichedContext.
     * Priority: phase1Outputs.people → interview answers.
     *
     * @param {EnrichedContext} context
     * @returns {string}
     */
    _extractPersonaContext(context) {
        if (context.phase1Outputs?.people?.trim()) {
            return context.phase1Outputs.people;
        }

        const a = context.answers || {};
        const parts = [];
        if (a.target_persona || a.primary_user) {
            parts.push(`Target persona: ${a.target_persona || a.primary_user}`);
        }
        if (a.buyer_vs_user) parts.push(`Buyer/user split: ${a.buyer_vs_user}`);
        if (a.pain_point)    parts.push(`Core pain: ${a.pain_point}`);
        if (a.target_geo)    parts.push(`Market: ${a.target_geo}`);

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
        if (a.pain_point)        parts.push(`Core pain addressed: ${a.pain_point}`);
        if (a.tech_preferences)  parts.push(`Tech approach: ${a.tech_preferences}`);

        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: Feature robot output not available — product interactions will be inferred from context."
            );
        }
        return parts.join("\n\n");
    }
}

export default CustomerJourneysRobot;
