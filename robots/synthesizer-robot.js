// synthesizer-robot.js — The Master Synthesis Agent (Phase 1a′)
// Consolidates outputs from Scout, Detective, People, and Money into an Investment Board verdict.
// Consumes the machine-readable ```json verdict blocks each Phase 1a robot appends to its output,
// so dimension scores are passed as data — not re-derived from prose.

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
     * @typedef {Object} StructuredVerdict
     * @property {string} robot - Which robot emitted the block (scout|detective|people|money)
     * @property {string} verdict - The robot's categorical verdict
     * @property {Object} [hypothesisSupportScore] - {low, base, high} 0-100 (scout)
     * @property {Object} [competitivePositionScore] - {low, base, high} 0-100 (detective)
     * @property {Object} [userRelevanceScore] - {low, base, high} 0-100 (people)
     * @property {Object} [financialViabilityScore] - {low, base, high} 0-100 (money)
     * @property {Object} [evidenceMaturityScore] - {low, base, high} 0-100
     * @property {string} [confidenceStatus] - preliminary | pm-reviewed (scout)
     * @property {string} [evidenceTier] - evidence provenance label
     */

    /**
     * @param {Object|string} enrichedContext
     * @param {Phase1Outputs} enrichedContext.phase1Outputs - The generated analyses from Phase 1a robots.
     * @param {string} enrichedContext.productIdea - The core product idea/summary.
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing synthesis prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const p1 = context.phase1Outputs || {};

        // Parse the machine-readable verdict blocks out of each Phase 1a output.
        // These are the authoritative numeric inputs for the investment matrix.
        const structuredVerdicts = {};
        const missingVerdictBlocks = [];
        for (const robot of ["scout", "detective", "people", "money"]) {
            const verdict = this._extractVerdictBlock(p1[robot], robot);
            if (verdict) {
                structuredVerdicts[robot] = verdict;
            } else {
                missingVerdictBlocks.push(robot);
            }
        }

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: "You are the Investment Board Synthesizer, a highly analytical Chief Product Officer. Your job is to read the outputs from the Scout (Market), Detective (Competition), People (Personas), and Money (Financials) agents and produce a consolidated, evidence-weighted Go/No-Go investment verdict. You apply the same two-axis discipline Scout uses — Hypothesis Support × Evidence Maturity — at the portfolio level. Your verdict must be defensible in front of a board that will challenge every number.",

                mandate: [
                    "Synthesize, DO NOT summarize. Look for conflicts between the four inputs (e.g. big market but zero differentiation, or high differentiation but negative unit economics).",
                    "Do NOT invent new data. Your synthesis must be derived entirely from the provided Phase 1a outputs.",
                    "Use the structuredVerdicts blocks below as the AUTHORITATIVE numeric inputs. If a verdict block is missing for a robot, derive that dimension's score from its prose, cap that dimension's evidence maturity at 40/100, and state that you did so.",
                    "NEVER use unexplained constants: every weight comes from the weighting rubric below, and any adjustment must be justified in one sentence.",
                    "Score TWO aggregates, not one: Aggregate Hypothesis Support (0-100) and Aggregate Evidence Maturity (0-100). The verdict comes from the Support × Maturity matrix — never from a single blended number.",
                    "DOWNGRADE RULE: if Scout's confidenceStatus is 'preliminary', or any dimension's evidence maturity is below 40, the verdict cannot exceed CONDITIONAL GO. State exactly what validation lifts the cap.",
                    "TRACEABILITY: every score in the Investment Matrix must cite the agent and section it came from, e.g. [Scout → TAM/SAM/SOM] or [Money → Unit Economics].",
                    "Respect evidence tiers: 'pm-interview-derived' (People) and mostly-[modeled] (Money) inputs are hypotheses, not facts — weight their maturity accordingly.",
                    "The final verdict must be exactly one of: GO, CONDITIONAL GO, PIVOT, NO-GO.",
                    "Do not use generic SaaS filler. Focus entirely on the specific dynamics of this product.",
                    "End the output with a machine-readable JSON verdict block in a ```json fence — it must be the VERY LAST element of the output."
                ],

                scoringModel: {
                    instructions: "Apply this weighting rubric and show the math in a table. Dimension base scores come from structuredVerdicts; low/high ranges propagate to aggregate low/high.",
                    defaultWeights: {
                        marketDemand: { weight: 0.30, source: "scout.hypothesisSupportScore" },
                        competitivePosition: { weight: 0.25, source: "detective.competitivePositionScore" },
                        userRelevance: { weight: 0.20, source: "people.userRelevanceScore" },
                        financialViability: { weight: 0.25, source: "money.financialViabilityScore" }
                    },
                    weightAdjustmentRule: "You may shift up to 0.05 between dimensions when the product context clearly warrants it (e.g. winner-take-all market → competitive weight up; regulated market → financial weight up). State the shift and the one-sentence reason. Weights must always sum to 1.0.",
                    formulas: [
                        "Aggregate Hypothesis Support = Σ (weight_i × dimensionSupport_i), computed at low, base, and high",
                        "Aggregate Evidence Maturity = Σ (weight_i × dimensionMaturity_i), computed at low, base, and high",
                        "Show the full calculation table: dimension | weight | support (low/base/high) | maturity (low/base/high) | weighted contribution | trace"
                    ],
                    verdictMatrix: [
                        "Support ≥ 70 AND Maturity ≥ 60 → GO",
                        "Support ≥ 70 AND Maturity < 60 → CONDITIONAL GO — high promise, unvalidated; name the validation that lifts the cap",
                        "Support 45-69 → CONDITIONAL GO or PIVOT depending on which dimension drags the score — explain which and why",
                        "Support < 45 → NO-GO or PIVOT — state the specific assumptions that, if proven wrong, would upgrade the verdict"
                    ]
                },

                requiredSections: {
                    executiveOnePager: {
                        instructions: "FIRST section — a board-ready one-pager readable in 60 seconds.",
                        mustInclude: [
                            "The core hypothesis synthesized into a single sentence (from Scout's hypothesis statement).",
                            "The verdict banner: GO / CONDITIONAL GO / PIVOT / NO-GO.",
                            "Aggregate Hypothesis Support and Aggregate Evidence Maturity, each as base score with low-high range.",
                            "The single biggest reason for this verdict and the single biggest unknown.",
                            "One visual: the 2×2 position (see visuals below)."
                        ]
                    },
                    investmentMatrix: {
                        instructions: "The full scoring table across the four Phase 1a dimensions, using structuredVerdicts as inputs.",
                        mustInclude: [
                            "A table: Dimension | Weight | Support (low/base/high) | Evidence Maturity (low/base/high) | Weighted Contribution | Trace [Agent → Section].",
                            "A one-sentence rationale for each dimension score.",
                            "The aggregate calculation shown explicitly — a board member must be able to recompute it.",
                            "Any weight adjustment from the default, with its one-sentence justification.",
                            "The matrix cell the aggregates land in, and the verdict that follows."
                        ]
                    },
                    conflictResolution: {
                        instructions: "Identify tensions or conflicts between the four Phase 1a outputs.",
                        mustInclude: [
                            "Market demand vs Competitive moat (Is the market big enough to support a weak moat, or does a strong moat justify a niche market?)",
                            "Feature requirements vs Financial viability (Does the required feature set break the unit economics?)",
                            "Any explicit contradictions between the agents (e.g. Scout says high demand, Money says terrible margins) — cite both sections.",
                            "For each conflict: which agent's evidence is more mature, and how the conflict was resolved in the scoring."
                        ]
                    },
                    evidenceGaps: {
                        instructions: "The honest accounting of what this verdict rests on.",
                        mustInclude: [
                            "Each dimension's evidence tier (researched-cited / pm-interview-derived / modeled-with-benchmarks) and what that means for confidence.",
                            "Whether the DOWNGRADE RULE was triggered, by what, and exactly what validation evidence lifts the cap.",
                            "The 3 cheapest validation actions that would most improve Aggregate Evidence Maturity, ranked by impact-per-effort."
                        ]
                    },
                    killPivotCriteria: {
                        instructions: "Define the specific criteria that would change this verdict.",
                        mustInclude: [
                            "If GO/CONDITIONAL GO: What early signals would force a PIVOT? Use measurable thresholds tied to the kill condition in Scout's hypothesis statement.",
                            "If NO-GO: What specific assumptions, if proven wrong, would upgrade this to a GO?",
                            "If PIVOT: What is the recommended pivot direction and what must be true for it to work?"
                        ]
                    },
                    pmDecisionGate: {
                        instructions: "Hand control back to the PM.",
                        mustInclude: [
                            "A clear statement that this synthesis is a recommendation, and the PM is the final decision maker.",
                            "A prompt for the PM to Override, Endorse, or Request More Data before advancing to Epic generation.",
                            "If the verdict is CONDITIONAL GO: the specific validation checklist the PM should complete before endorsing."
                        ]
                    },
                    machineReadableVerdict: {
                        instructions: "The VERY LAST element of your output must be a machine-readable verdict block in a ```json fence, for the PDD composer and downstream tooling.",
                        schema: {
                            robot: "synthesizer",
                            verdict: "GO | CONDITIONAL GO | PIVOT | NO-GO",
                            aggregateSupportScore: { low: "number 0-100", base: "number 0-100", high: "number 0-100" },
                            aggregateMaturityScore: { low: "number 0-100", base: "number 0-100", high: "number 0-100" },
                            weightsUsed: { marketDemand: "number", competitivePosition: "number", userRelevance: "number", financialViability: "number" },
                            downgradeRuleTriggered: "boolean",
                            downgradeReason: "string or null",
                            dimensionScores: {
                                marketDemand: "number 0-100 (base)",
                                competitivePosition: "number 0-100 (base)",
                                userRelevance: "number 0-100 (base)",
                                financialViability: "number 0-100 (base)"
                            },
                            biggestReason: "string",
                            biggestUnknown: "string",
                            pmDecision: "pending | endorsed | overridden"
                        },
                        rules: [
                            "All scores must be JSON numbers, not strings",
                            "Values must match the Investment Matrix exactly — no divergence between prose and JSON",
                            "The block must be the final element of the output"
                        ]
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                structuredVerdicts: structuredVerdicts,
                missingVerdictBlocks: missingVerdictBlocks,
                scoutFindings: p1.scout || "No Scout output provided.",
                detectiveFindings: p1.detective || "No Detective output provided.",
                peopleFindings: p1.people || "No People output provided.",
                moneyFindings: p1.money || "No Money output provided."
            },

            outputFormat: {
                style: "Board-level presentation narrative. Direct, analytical, and uncompromising.",
                length: "Concise but comprehensive.",
                tables: "Use rich HTML tables with styled headers and alternating row shading for the Investment Matrix and the aggregate calculation.",
                visuals: "Three visuals are REQUIRED: (1) a Chart.js radar chart of the four dimensions with two series — Support and Evidence Maturity (<canvas> + <script> inside a ```html fence); (2) a 2×2 positioning grid — Market Attractiveness (Scout+Money) × Ability to Win (Detective+People) — as a styled HTML grid with the product plotted in its quadrant; (3) a Mermaid flowchart (```mermaid fence) showing how the four verdict blocks flow through weights and the matrix to the final verdict, including the downgrade-rule branch.",
                htmlRequired: "IMPORTANT: You MUST generate your response as rich HTML in this chat window using white/light backgrounds (DO NOT use dark mode). Include HTML blocks with inline styles for: (1) The verdict banner (GO=green, CONDITIONAL GO=amber, PIVOT=orange, NO-GO=red), (2) The Investment Matrix table, (3) The 2×2 positioning grid, (4) The PM Decision Gate. RENDERING RULE: wrap EVERY multi-line HTML block and EVERY <script> block in a ```html fence — never emit multi-line raw HTML outside a fence, or the saved HTML file will break scripts. When you are done and call the 'save-robot-output' tool, you MUST pass this HTML into the 'htmlText' parameter, AND convert the content to pure, tag-free Markdown and pass it into the 'cleanMarkdown' parameter (but ALWAYS keep the final ```json verdict block in BOTH parameters).",
                audienceViews: {
                    instructions: "Structure the output in three audience layers, in this order. Same facts at different altitude — the layers must never contradict each other.",
                    executiveBriefing: "FIRST: the executive one-pager — verdict banner, hypothesis, two aggregate scores with ranges, 2×2 grid. Readable in 60 seconds.",
                    pmWorkingLayer: "MIDDLE: the investment matrix with full math, conflict resolution, kill/pivot criteria, PM decision gate.",
                    analystAppendix: "LAST (before the JSON verdict block): evidence gaps, per-dimension evidence tiers, the downgrade-rule accounting, and the validation actions ranked by impact-per-effort."
                }
            }
        };

        this.successCount++;
        return analysis;
    }

    /**
     * Extract the machine-readable verdict block a Phase 1a robot appended to its output.
     * Scans every ```json fence and returns the last parseable one whose `robot` field
     * matches — robust to outputs that also contain other JSON blocks (e.g. Money's
     * Vega-Lite chart specs).
     *
     * @param {string|undefined} outputText - the robot's saved cleanMarkdown output
     * @param {string} robotName - which robot's verdict block to look for
     * @returns {StructuredVerdict|null}
     */
    _extractVerdictBlock(outputText, robotName) {
        if (!outputText) return null;

        const fenceRe = /```json\s*([\s\S]*?)```/g;
        let match;
        let found = null;
        while ((match = fenceRe.exec(outputText)) !== null) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed && parsed.robot === robotName) {
                    found = parsed; // keep scanning — the verdict block is the last one
                }
            } catch {
                // not valid JSON (or not a verdict block) — skip
            }
        }
        return found;
    }
}

export default SynthesizerRobot;
