// FeasibilityDesignRobot — Phase 2 execution robot.
//
// Produces the design feasibility section of the PDD: design principles,
// low-fidelity wireflow (screen-by-screen prose), and accessibility commitments.
//
// All content is derived from Phase 1 people + feature robot outputs.
// The wireflow is prose-based — not actual wireframes — describing what each
// screen contains, what the user can do, and how it connects to the next screen.
//
// Input:  enrichedContext with phase1Outputs.people + phase1Outputs.feature
// Output: _claudeInstructions payload — Claude generates the feasibility-design JSON

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
 * @typedef {Object} WireflowScreen
 * @property {string} screen      - Screen name, e.g. "Agent Home Dashboard"
 * @property {string} description - What is on this screen, what the user can do,
 *                                  and how it transitions to the next screen
 */

/**
 * @typedef {Object} FeasibilityDesignOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 */

class FeasibilityDesignRobot {
    constructor() {
        this.name = "Feasibility Design Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for design feasibility analysis.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<FeasibilityDesignOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing design feasibility prompt...\n`);

        // Double-parse guard — MCP may pass a JSON string
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const personaContext = this._extractPersonaContext(context);
        const featureContext = this._extractFeatureContext(context);
        const techStack      = context.answers?.tech_preferences || null;
        const phase2Notes    = context.phase2Context || {};

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product designer and UX strategist with deep experience designing enterprise and consumer products. Your job is to translate persona research and feature scope into concrete design principles and a screen-by-screen wireflow narrative that the design and engineering team can use as a shared blueprint. You do not produce visual wireframes — you produce the prose specification that drives them.",

                mandate: [
                    "DERIVE FROM PHASE 1 ONLY: Design principles must be grounded in the specific pains, motivations, and behaviours of the personas from the people robot output. Feature interactions in the wireflow must reference actual features from the feature robot output. Do not invent design principles from generic UX heuristics alone.",
                    "PHASE 1 SYNTHESIS FIRST: Open with a 3-5 bullet synthesis of the design signals from Phase 1: which persona needs drove which design principles, which features create the most complex UX challenges, and any tension between buyer needs and user needs that the design must resolve.",
                    "DESIGN PRINCIPLES: Produce 5-8 design principles. Each must be specific to this product and its personas — not generic (avoid 'be simple', 'be intuitive'). Each principle must state: the principle name, a 1-sentence description, and the persona signal that grounds it.",
                    "WIREFLOW COVERAGE: The wireflow must cover every must-have feature from the feature robot output as at least one screen. Missing a must-have feature from the wireflow is a defect. Cover core flows for the primary persona — the persona whose journey is most central to the product's value proposition.",
                    "SCREEN DESCRIPTIONS: Each screen description must include: (1) what the screen shows, (2) what the user can do on this screen, (3) the primary action that takes them to the next screen, and (4) any design decision that matters (e.g. empty states, error states, loading states for async operations).",
                    "FLOW CONTINUITY: The wireflow must read as a narrative — each screen should reference the previous screen and explain the transition. A reader should be able to walk through the flow without seeing any visuals.",
                    "ACCESSIBILITY: List 5-8 concrete accessibility commitments specific to this product's tech stack and user base. Reference actual WCAG criteria or platform-specific guidelines (iOS/Android/Web) where applicable. Generic statements like 'we will follow WCAG 2.1' are not commitments — they are intentions.",
                    "MOBILE VS WEB: If the product is mobile (React Native, iOS, Android), the wireflow must reflect mobile-native interaction patterns — not web patterns ported to mobile. If multi-platform, note the platform-specific design considerations per screen.",
                    "NO GENERIC OUTPUT: Every screen name must be a real screen for this product. Every design principle must cite a persona pain or motivation. Every accessibility commitment must be actionable.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "3-5 bullet points: design signals from personas (which pains drive which design decisions), feature complexity signals (which features create the hardest UX problems), and buyer/user tension to resolve.",
                        mustInclude: ["Persona design signals", "Feature UX complexity", "Buyer/user design tension"],
                    },
                    designPrinciples: {
                        instructions: "5-8 design principles grounded in persona research and feature scope. Each principle: name + 1-sentence description + the persona signal that grounds it.",
                        targetCount: "5-8 principles",
                        outputShape: ["string — 'Principle name: description. (Grounded in: persona signal)'"],
                    },
                    wireflow: {
                        instructions: "Screen-by-screen prose wireflow covering all must-have features. Each screen: name, what it shows, what the user can do, primary action to next screen, and any key design decision (empty states, errors, loading). Write as a narrative — each screen references the one before.",
                        targetCount: "8-15 screens covering all must-have features",
                        outputShape: [{
                            screen:      "string — specific screen name for this product",
                            description: "string — 3-5 sentences: what it shows, user actions, transition, key design decisions",
                        }],
                    },
                    accessibilityCommitments: {
                        instructions: "5-8 concrete, actionable accessibility commitments specific to this product's platform and user base. Reference WCAG criteria or platform guidelines by name. These are commitments, not aspirations.",
                        targetCount: "5-8 commitments",
                        outputShape: ["string — specific commitment with WCAG/platform reference"],
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    techStack:      techStack,
                    marketSegment:  context.answers?.market_segment || null,
                    targetGeo:      context.answers?.target_geo || null,
                    buyerVsUser:    context.answers?.buyer_vs_user || null,
                    personaContext,
                    featureContext,
                    phase2Notes:    Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis:          "string — 3-5 bullet points (prefix each with \\n• )",
                        designPrinciples:         ["string — 'Principle: description. (Grounded in: signal)'"],
                        wireflow:                 [{ screen: "string", description: "string" }],
                        accessibilityCommitments: ["string"],
                        screenCount:              "integer — number of screens in wireflow",
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
        if (a.buyer_vs_user) parts.push(`Buyer/user split: ${a.buyer_vs_user}`);
        if (a.pain_point)    parts.push(`Core pain: ${a.pain_point}`);
        if (a.target_geo)    parts.push(`Market: ${a.target_geo}`);
        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: People robot output not available — design principles will be inferred from product context."
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
        if (a.tech_preferences) parts.push(`Tech: ${a.tech_preferences}`);
        if (a.pain_point)        parts.push(`Core pain: ${a.pain_point}`);
        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: Feature robot output not available — wireflow will be inferred from product context."
            );
        }
        return parts.join("\n\n");
    }
}

export default FeasibilityDesignRobot;
