// DataPrivacyRobot — Phase 2 execution robot.
//
// Produces the InfoSec / Legal / Certification impact matrix for the PDD.
// Every row in the matrix answers: does this product trigger an impact in
// this area? What is the impact? What is the mitigation?
//
// All content is derived from Phase 1 feature + feasibility-tech outputs.
// The robot never asks the PM for information already captured.
//
// Input:  enrichedContext with phase1Outputs.feature + phase1Outputs["feasibility-tech"]
// Output: _claudeInstructions payload — Claude generates the data-privacy JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [feature]           - Markdown text from feature robot output
 * @property {string} ["feasibility-tech"] - Markdown text from feasibility-tech output
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
 * @typedef {Object} DataPrivacyRow
 * @property {"InfoSec"|"Legal"|"Certification"} area        - Impact category
 * @property {"Yes"|"No"|"Maybe"}                impact      - Does this product trigger this area?
 * @property {string}                            description - What specifically triggers this impact
 * @property {string}                            mitigation  - Concrete mitigation or action required
 */

/**
 * @typedef {Object} DataPrivacyOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 */

class DataPrivacyRobot {
    constructor() {
        this.name = "Data Privacy Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for data privacy impact analysis.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<DataPrivacyOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing data privacy impact prompt...\n`);

        // Double-parse guard
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const featureContext      = this._extractFeatureContext(context);
        const feasibilityContext  = this._extractFeasibilityContext(context);
        const targetGeo           = context.answers?.target_geo || null;
        const marketSegment       = context.answers?.market_segment || null;
        const phase2Notes         = context.phase2Context || {};

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager and compliance specialist with deep expertise in data privacy, information security, and regulatory certification for enterprise SaaS products. Your job is to produce a specific, product-grounded impact matrix that a PM can hand directly to their Legal, InfoSec, and Compliance teams.",

                mandate: [
                    "DERIVE FROM PHASE 1 ONLY: Every impact row must be traceable to a specific feature, technical component, data type, or third-party vendor identified in the feature or feasibility-tech robot outputs. Do not invent risks that are not grounded in this product's actual design.",
                    "THREE AREAS — FULL COVERAGE: Produce rows for all three areas: InfoSec (data security, access controls, breach risk, pen testing), Legal (GDPR, CCPA, HIPAA, local data laws based on target geography), Certification (SOC 2, ISO 27001, PCI-DSS, HIPAA BAA — only list those that genuinely apply to this product's market segment and data types).",
                    "IMPACT LOGIC: Yes = this product definitively triggers this requirement. Maybe = depends on how a feature is implemented or a decision not yet made. No = this area is explicitly not triggered and state why. Do not mark everything 'Maybe' — make a defensible call.",
                    "SPECIFICITY: Each row must reference the specific feature or component that triggers the impact. 'The AI transcription feature captures and stores customer voice data' is specific. 'The product processes user data' is not.",
                    "MITIGATIONS MUST BE ACTIONABLE: Each mitigation must be a concrete action — 'Encrypt audio files at rest using AES-256 and restrict access to authorised engineers only' not 'implement encryption'. For 'No' rows, state why the risk is definitively not applicable.",
                    "GEOGRAPHY AND SEGMENT CALIBRATION: Enterprise B2B products in regulated industries (healthcare, financial services, government) have a higher bar than B2C consumer products. US + EU launch requires both GDPR and CCPA/US state privacy laws. Apply the right bar for this product's stated geography and segment.",
                    "PHASE 1 SYNTHESIS: Open with a 3-5 bullet synthesis of the data and privacy risk signals from Phase 1: what data types the product handles (from features), what third-party vendors process data (from feasibility-tech), and the highest-risk compliance areas given the geography and segment.",
                    "COVERAGE MINIMUM: Produce at least 8 rows total across all three areas. Do not produce superficial rows — every row must represent a real decision the PM needs to make or communicate to a stakeholder.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "3-5 bullet points: data types the product handles (from features), third-party vendors that process data (from feasibility-tech), and the highest-risk compliance areas given the target geography and market segment.",
                        mustInclude: ["Data types handled", "Third-party data processors", "Highest-risk compliance areas"],
                    },
                    impactMatrix: {
                        instructions: "The full impact matrix. At least 8 rows covering all three areas. Each row: area, impact (Yes/No/Maybe), description (specific feature/component triggering this), mitigation (actionable step or reason for No).",
                        targetCount: "8-15 rows",
                        outputShape: [{
                            area:        "InfoSec | Legal | Certification",
                            impact:      "Yes | No | Maybe",
                            description: "string — specific feature/component and what it triggers",
                            mitigation:  "string — actionable mitigation or reason for No",
                        }],
                    },
                    priorityActions: {
                        instructions: "After the matrix, list the top 3-5 priority actions the PM must take before launch — the 'Yes' and critical 'Maybe' rows that require immediate engagement with Legal, InfoSec, or a certification body.",
                        outputShape: ["string — specific action with owner (Legal / InfoSec / Engineering / PM)"],
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    targetGeo:      targetGeo,
                    marketSegment:  marketSegment,
                    featureContext,
                    feasibilityContext: feasibilityContext || null,
                    phase2Notes:    Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis:  "string — 3-5 bullet points (prefix each with \\n• )",
                        impactMatrix:     [{ area: "string", impact: "string", description: "string", mitigation: "string" }],
                        priorityActions:  ["string"],
                        rowCount:         "integer — total number of rows in impactMatrix",
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
    _extractFeatureContext(context) {
        if (context.phase1Outputs?.feature?.trim()) {
            return context.phase1Outputs.feature;
        }
        const a = context.answers || {};
        const parts = [];
        if (a.tech_preferences) parts.push(`Tech stack: ${a.tech_preferences}`);
        if (a.pain_point)        parts.push(`Core pain: ${a.pain_point}`);
        if (parts.length === 0) {
            parts.push(`Product: ${context.productIdea || context.summary || "Not specified"}`);
            parts.push("NOTE: Feature robot output not available — analysis will be inferred from product context.");
        }
        return parts.join("\n\n");
    }

    /**
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractFeasibilityContext(context) {
        if (context.phase1Outputs?.["feasibility-tech"]?.trim()) {
            return context.phase1Outputs["feasibility-tech"];
        }
        // feasibility-tech is a Phase 2 robot — may not exist yet
        const techStack = context.answers?.tech_preferences;
        return techStack ? `Tech stack: ${techStack}` : null;
    }
}

export default DataPrivacyRobot;
