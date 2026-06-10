// synthesizer-robot.js — The Master Synthesis Agent (Phase 1a′)
// Consolidates outputs from Scout, Detective, People, and Money into an Investment Board verdict.

class SynthesizerRobot {
    constructor() {
        this.name = "Synthesizer Robot 🧠";
        this.job = "Master Synthesis Agent — Investment Board Go/No-Go Decision";
        this.successCount = 0;
    }

    /**
     * @typedef {Object} Phase1Outputs
     * @property {string} scout - Raw markdown output from Scout robot
     * @property {string} detective - Raw markdown output from Detective robot
     * @property {string} people - Raw markdown output from People robot
     * @property {string} money - Raw markdown output from Money robot
     */

    /**
     * @param {Object} context 
     * @param {Phase1Outputs} context.phase1Outputs - The generated analyses from Phase 1a robots.
     * @param {string} context.productIdea - The core product idea/summary.
     */
    async analyze(context) {
        process.stderr.write(`\n${this.name}: Preparing synthesis prompt...\n`);

        const p1 = context.phase1Outputs || {};

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: "You are the Investment Board Synthesizer, a highly analytical Chief Product Officer. Your job is to read the outputs from the Scout (Market), Detective (Competition), People (Personas), and Money (Financials) agents and produce a consolidated Go/No-Go investment verdict.",
                
                mandate: [
                    "Synthesize, DO NOT summarize. Look for conflicts between the four inputs (e.g. big market but zero differentiation, or high differentiation but negative unit economics).",
                    "Do NOT invent new data. Your synthesis must be derived entirely from the provided Phase 1a outputs.",
                    "If a Phase 1a output is missing or incomplete, explicitly state how that impacts the confidence of the final verdict.",
                    "The final verdict must be a clear GO, NO-GO, or PIVOT.",
                    "Do not use generic SaaS filler. Focus entirely on the specific dynamics of this product.",
                    "Calculate an aggregate 'Investment Confidence Score' based on the inputs."
                ],

                requiredSections: {
                    executiveSummary: {
                        instructions: "A high-impact executive summary that can be read in 60 seconds.",
                        mustInclude: [
                            "The core hypothesis synthesized into a single sentence.",
                            "The consolidated Go/No-Go/Pivot verdict.",
                            "The aggregate Investment Confidence Score.",
                            "The single biggest reason for this verdict."
                        ]
                    },
                    conflictResolution: {
                        instructions: "Identify tensions or conflicts between the four Phase 1a outputs.",
                        mustInclude: [
                            "Market demand vs Competitive moat (Is the market big enough to support a weak moat, or does a strong moat justify a niche market?)",
                            "Feature requirements vs Financial viability (Does the required feature set break the unit economics?)",
                            "Any explicit contradictions between the agents (e.g. Scout says high demand, Money says terrible margins)."
                        ]
                    },
                    investmentMatrix: {
                        instructions: "Provide a matrix scoring the product across the four Phase 1a dimensions.",
                        mustInclude: [
                            "A table with the dimensions: Market Demand (Scout), Competitive Position (Detective), User Relevance (People), Financial Viability (Money).",
                            "A score (1-10) for each dimension.",
                            "A one-sentence rationale for each score.",
                            "The aggregate Investment Confidence Score (weighted average or logical sum)."
                        ]
                    },
                    killPivotCriteria: {
                        instructions: "Define the specific criteria that would change this verdict.",
                        mustInclude: [
                            "If GO: What early signals would force a PIVOT?",
                            "If NO-GO: What specific assumptions, if proven wrong, would upgrade this to a GO?",
                            "If PIVOT: What is the recommended pivot direction and what must be true for it to work?"
                        ]
                    },
                    pmDecisionGate: {
                        instructions: "Hand control back to the PM.",
                        mustInclude: [
                            "A clear statement that this synthesis is a recommendation, and the PM is the final decision maker.",
                            "A prompt for the PM to Override, Endorse, or Request More Data before advancing to Epic generation."
                        ]
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                scoutFindings: p1.scout || "No Scout output provided.",
                detectiveFindings: p1.detective || "No Detective output provided.",
                peopleFindings: p1.people || "No People output provided.",
                moneyFindings: p1.money || "No Money output provided."
            },

            outputFormat: {
                style: "Board-level presentation narrative. Direct, analytical, and uncompromising.",
                length: "Concise but comprehensive.",
                tables: "Use HTML tables for the Investment Matrix.",
                htmlRequired: "IMPORTANT: You MUST generate your response as rich HTML in this chat window using white/light backgrounds (DO NOT use dark mode). Include raw HTML blocks with inline styles for: (1) The Go/No-Go verdict banner (Green/Red/Amber), (2) The Investment Matrix table, (3) The PM Decision Gate. When you are done and call the 'save-robot-output' tool, you MUST pass this HTML into the 'htmlText' parameter, AND convert the content to pure, tag-free Markdown and pass it into the 'cleanMarkdown' parameter."
            }
        };

        this.successCount++;
        return analysis;
    }
}

export default SynthesizerRobot;
