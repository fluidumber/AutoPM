// FeasibilityTechRobot — Phase 2 execution robot.
//
// Produces the technical feasibility section of the PDD: architecture overview,
// Mermaid diagram, technical concerns + mitigations, third-party vendors,
// security & compliance, and infrastructure dependencies.
//
// Input:  enrichedContext with phase1Outputs.feature + phase1Outputs["scope-spec"]
//         and phase2Context (tech stack, regions) from context/phase2-context.json
// Output: _claudeInstructions payload — Claude generates the feasibility-tech JSON

/**
 * @typedef {Object} Phase1Outputs
 * @property {string} [feature]     - Markdown text from the feature robot output file
 * @property {string} ["scope-spec"] - Markdown text from the scope-spec robot output file
 */

/**
 * @typedef {Object} Phase2Context
 * @property {string} [scopeOverride]   - PM-supplied scope clarifications
 * @property {string} [featureOverride] - PM-supplied feature clarifications
 * @property {Object} [links]           - Jira, TDD, Figma, Confluence links
 */

/**
 * @typedef {Object} EnrichedContext
 * @property {string}        productIdea     - Product name or one-line description
 * @property {Object}        answers         - Interview answer map (qid → value)
 * @property {string}        [summary]       - Product summary from interview
 * @property {Phase1Outputs} [phase1Outputs] - Loaded Phase 1 + Phase 2 robot output text
 * @property {Phase2Context} [phase2Context] - Phase 2 PM-provided context manifest
 */

/**
 * @typedef {Object} TechnicalConcern
 * @property {string} concern    - Specific technical risk or challenge
 * @property {string} mitigation - Concrete mitigation approach
 */

/**
 * @typedef {Object} ThirdPartyVendor
 * @property {string}  name                     - Vendor name
 * @property {string}  purpose                  - What this vendor provides
 * @property {boolean} requiresDirectEngagement - Does the PM need to engage this vendor directly?
 */

/**
 * @typedef {Object} InfrastructureDependency
 * @property {string}      dependency        - What is needed
 * @property {string}      responsibleParty  - Who owns this dependency
 * @property {string|null} jiraLink          - Jira ticket URL or null
 */

/**
 * @typedef {Object} FeasibilityTechOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 */

class FeasibilityTechRobot {
    constructor() {
        this.name = "Feasibility Tech Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for technical feasibility analysis.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<FeasibilityTechOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing technical feasibility prompt...\n`);

        // Double-parse guard — MCP may pass a JSON string
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const featureContext   = this._extractFeatureContext(context);
        const scopeContext     = this._extractScopeContext(context);
        const techStack        = context.answers?.tech_preferences || null;
        const targetGeo        = context.answers?.target_geo || null;
        const teamSize         = context.answers?.team_size || null;
        const phase2Notes      = context.phase2Context || {};

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a principal software architect and technical product manager with deep experience delivering enterprise SaaS products. Your job is to produce a concrete, product-specific technical feasibility assessment that an engineering lead can use to start sprint planning and architecture design. You reason from the product's stated tech stack, feature scope, and constraints — not from generic frameworks.",

                mandate: [
                    "DERIVE FROM PHASE 1 ONLY: Every technical decision, concern, and vendor recommendation must be traceable to the feature robot output, scope-spec output, or stated tech stack in the interview answers. Do not invent technical requirements.",
                    "ARCHITECTURE OVERVIEW: Write a specific prose description of how the system will be built — named components, data flows, and integration points. Reference the actual tech stack from the interview. This should be detailed enough for an engineer to start drawing component diagrams.",
                    "MERMAID DIAGRAM: Produce a valid Mermaid flowchart (flowchart TD or flowchart LR) showing the key system components and their relationships. Use real component names derived from the product's tech stack and features. The diagram must be valid Mermaid syntax — test it mentally. Do not use placeholder node names.",
                    "TECHNICAL CONCERNS: Identify 5-8 specific technical challenges for THIS product — not generic SaaS risks. Each concern must have a concrete mitigation. Generic concerns like 'scalability' without a product-specific context are rejected.",
                    "THIRD-PARTY VENDORS: List only vendors that are genuinely required for the stated features and tech stack. For each, state whether the PM needs to engage them directly (procurement, contract, integration agreement) vs. self-serve API. Do not list every possible tool — only the ones this product needs.",
                    "SECURITY AND COMPLIANCE: Derive from the target geography, market segment (enterprise B2B = different bar than B2C), and feature scope. Name specific frameworks (SOC 2, GDPR, HIPAA, ISO 27001) only where they apply to this product. Explain why each applies.",
                    "INFRASTRUCTURE DEPENDENCIES: List the infrastructure that must be provisioned or agreed before engineering can start. Name the responsible party (engineering team, DevOps, third party). These are blockers, not nice-to-haves.",
                    "NO GENERIC OUTPUT: Phrases like 'follow security best practices' or 'use a scalable database' are failures. Every statement must be specific to this product's architecture and context.",
                    "PHASE 1 SYNTHESIS: Open with a 3-5 bullet synthesis of the technical signals from Phase 1 (features requiring novel tech, scope constraints that affect architecture, tech stack dependencies) before the detailed analysis.",
                ],

                requiredSections: {
                    phase1Synthesis: {
                        instructions: "3-5 bullet points summarising: which features drive the most technical complexity, what the stated tech stack implies for architecture, and any scope constraints that create technical risk.",
                        mustInclude: ["Feature complexity signals", "Tech stack implications", "Scope constraints affecting architecture"],
                    },
                    architectureOverview: {
                        instructions: "Prose description of the system architecture: key components, data flows, integration points, and deployment model. Reference the actual tech stack. 3-5 paragraphs. Specific enough for an engineer to start drawing a component diagram.",
                    },
                    architectureDiagramMermaid: {
                        instructions: "A valid Mermaid flowchart diagram (flowchart TD or LR) showing system components and their relationships. Use real component names from the product's tech stack. The output must be only the raw Mermaid source — no markdown fences, no commentary. Example structure: client app → API gateway → core services → data stores → third-party integrations.",
                    },
                    technicalConcerns: {
                        instructions: "5-8 specific technical challenges for this product. Each must be product-specific (reference the actual features or tech stack). Include a concrete mitigation for each.",
                        targetCount: "5-8 concerns",
                        outputShape: [{ concern: "string — specific to this product", mitigation: "string — concrete approach, not generic advice" }],
                    },
                    thirdPartyVendors: {
                        instructions: "Vendors genuinely required for the stated features and tech stack. Self-serve APIs vs. direct-engagement vendors are distinguished. Do not list every possible tool.",
                        outputShape: [{
                            name:                     "string — vendor name",
                            purpose:                  "string — what it provides for this product specifically",
                            requiresDirectEngagement: "boolean — true if procurement/contract/agreement needed",
                        }],
                    },
                    securityAndCompliance: {
                        instructions: "Prose covering: which compliance frameworks apply and why (based on geo, segment, data handled), key security requirements for the stated features, and any certification timeline implications.",
                    },
                    infrastructureDependencies: {
                        instructions: "Infrastructure that must be in place before engineering can start or before launch. Name the responsible party. These are blockers.",
                        outputShape: [{
                            dependency:       "string — what is needed",
                            responsibleParty: "string — who owns this",
                            jiraLink:         "string | null — ticket URL or null",
                        }],
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    techStack:      techStack,
                    targetGeo:      targetGeo,
                    teamSize:       teamSize,
                    timeline:       context.answers?.timeline || null,
                    marketSegment:  context.answers?.market_segment || null,
                    featureContext,
                    scopeContext:   scopeContext || null,
                    phase2Notes:    Object.keys(phase2Notes).length > 0 ? phase2Notes : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        phase1Synthesis:            "string — 3-5 bullet points (prefix each with \\n• )",
                        architectureOverview:        "string — prose, 3-5 paragraphs",
                        architectureDiagramMermaid:  "string — raw Mermaid source only, no fences",
                        technicalConcerns:           [{ concern: "string", mitigation: "string" }],
                        thirdPartyVendors:           [{ name: "string", purpose: "string", requiresDirectEngagement: "boolean" }],
                        securityAndCompliance:        "string — prose",
                        infrastructureDependencies:  [{ dependency: "string", responsibleParty: "string", jiraLink: "string | null" }],
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
        if (a.tech_preferences) parts.push(`Tech stack: ${a.tech_preferences}`);
        if (a.pain_point)        parts.push(`Core pain: ${a.pain_point}`);
        if (parts.length === 0) {
            parts.push(
                `Product: ${context.productIdea || context.summary || "Not specified"}`,
                "NOTE: Feature robot output not available — architecture will be inferred from product context."
            );
        }
        return parts.join("\n\n");
    }

    /**
     * Extract scope-spec context from enrichedContext.
     * scope-spec is a Phase 2 robot — may not yet exist if this runs first.
     * Returns null gracefully if unavailable.
     *
     * @param {EnrichedContext} context
     * @returns {string|null}
     */
    _extractScopeContext(context) {
        // scope-spec is stored under phase1Outputs by _buildPhase2Context,
        // which loads all robot outputs regardless of phase.
        if (context.phase1Outputs?.["scope-spec"]?.trim()) {
            return context.phase1Outputs["scope-spec"];
        }
        return null;
    }
}

export default FeasibilityTechRobot;
