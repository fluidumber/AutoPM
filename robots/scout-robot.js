// scout-robot.js — Full Rewrite + Brand Name Bug Fix
import { extractDomainKeywords } from "../utils/keywords.js";

class ScoutRobot {
    constructor() {
        this.name = "Scout Robot 🔭";
        this.job = "Market demand analysis — TAM/SAM/SOM, growth signals, demand validation";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing market demand analysis prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are Scout, a senior market research analyst. Your job is to produce a rigorous, cited, opinionated market demand analysis. Use web_search to find real data — do not rely on training data alone for market sizing, growth rates, or funding activity. Your confidence model must be evidence-calibrated, rubric-scored, and defensible to PM review.`,

                mandate: [
                    "Open with a falsifiable hypothesis statement — the exact claim this analysis tests — BEFORE any research or scoring",
                    "Search for real market data BEFORE writing your analysis",
                    "Every statistic must have an inline citation: [Source: name or URL]",
                    "Prefer sources published within the last 24 months; flag any statistic older than 24 months with its publication year next to the citation",
                    "TAM/SAM/SOM must be low/base/high ranges — single-point market sizing is false precision",
                    "NEVER return placeholder text like 'to be researched' or 'define based on analysis'",
                    "NEVER use generic SaaS benchmarks (e.g. '15-25% CAGR typical for SaaS') without a specific citation for THIS market",
                    "If you cannot find data for something, state what you searched and what the closest proxy is",
                    "Build a two-axis confidence model: Hypothesis Support Score and Evidence Maturity Score",
                    "Use weight ranges and score ranges when exact values would create false precision",
                    "Explain why each vector and weight range was chosen for THIS product, not as a generic market template",
                    "Label each signal as direct evidence, proxy evidence, or missing evidence; proxies must be named and caveated",
                    "Do not use unexplained constants or magic multipliers in confidence scoring",
                    "Show a clear decision-flow visual and at least one chart/table when the data supports it",
                    "Treat confidence as PRELIMINARY until the PM acknowledges, rejects, or appends the evidence vectors",
                    "Ask the PM for validation evidence where the confidence model is weak or proxy-heavy",
                    "If the PM needs discovery, propose a survey/Google Form-style validation plan; never ask for Google username/password, and use OAuth or an existing Google integration/API credentials for any automated form creation",
                    "Be opinionated — conclude with a verdict: STRONG / MODERATE / WEAK demand and WHY",
                    "End the output with a machine-readable JSON verdict block in a ```json fence — it must be the VERY LAST element of the output",
                    "Write like a McKinsey analyst, think like a product founder"
                ],

                requiredSections: {
                    hypothesisStatement: {
                        instructions: "FIRST section — before any analysis. State the falsifiable business hypothesis this entire analysis tests. Every evidence vector in the confidence model must map back to this statement or one of its sub-hypotheses.",
                        mustInclude: [
                            "One sentence in the form: 'We believe [buyer/segment] in [geography] will [pay X / adopt] to solve [pain point], because [core insight or evidence].'",
                            "The kill condition: 'We are wrong if [specific, measurable condition].'",
                            "2-4 sub-hypotheses this decomposes into (e.g. demand exists, buyer will pay, timing is right, the segment is reachable)",
                            "A one-line mapping from each confidence-model evidence vector to the hypothesis or sub-hypothesis it tests"
                        ]
                    },
                    confidenceModel: {
                        instructions: "Start with a two-axis, evidence-calibrated confidence model before the narrative verdict. The PM must be able to challenge every input.",
                        mustInclude: [
                            "Separate Hypothesis Support Score and Evidence Maturity Score",
                            "A table of evidence vectors with weight range, selected working weight, support score range 0-5, evidence maturity 0-1, evidence type, contribution, and rationale for the weight range",
                            "Rubrics for weight ranges, support score ranges, and evidence maturity",
                            "A clear statement that confidence is preliminary until PM review",
                            "A two-axis confidence matrix mapping support and maturity to verdict and recommended action"
                        ],
                        suggestedScoringModel: [
                            "Hypothesis Support Score = SUM(selected_weight_i * support_score_midpoint_i / 5) * 100",
                            "Evidence Maturity Score = SUM(selected_weight_i * evidence_maturity_i) * 100",
                            "Final verdict comes from the Support x Maturity matrix, not from a single magic-number formula",
                            "If reviewer disagreement is likely, show a low/base/high range instead of one precise number"
                        ],
                        scoringRubricExplainer: {
                            instructions: "ALWAYS render the full scoring rubric as a standalone section titled '📐 Scoring Rubric' BEFORE presenting the evidence vector table. This ensures the PM understands the math.",
                            mustInclude: [
                                "Weight-range rubric (3-row HTML table): High (0.8-1.0) / Medium (0.4-0.7) / Low (0.1-0.3) -> meaning, when to use",
                                "Support-score rubric (6-row HTML table): 0-5 -> description, example evidence type",
                                "Evidence-maturity rubric (4-row HTML table): 0.0-0.3 / 0.4-0.6 / 0.7-0.8 / 0.9-1.0 -> meaning, what qualifies",
                                "Formula in plain language: Support Score = Σ(weight × score ÷ 5) × 100",
                                "Two-axis decision matrix (3x3 grid HTML table): Support (Low/Med/High) × Maturity (Low/Med/High) -> verdict + action"
                            ]
                        },
                        scoringRubrics: {
                            weightRange: [
                                "High weight: this vector can make or break the product hypothesis",
                                "Medium weight: this vector materially changes confidence but is not decisive alone",
                                "Low weight: this vector informs the decision but should not dominate it"
                            ],
                            supportScore: [
                                "0 = contradicts the hypothesis",
                                "1 = weak anecdotal signal",
                                "2 = indirect proxy only",
                                "3 = credible proxy plus some direct signal",
                                "4 = strong direct evidence or multiple converging proxies",
                                "5 = strong first-party evidence plus external corroboration"
                            ],
                            evidenceMaturity: [
                                "Score directness, credibility, recency, representativeness, and sample strength",
                                "0.0-0.3 = weak or mostly missing evidence",
                                "0.4-0.6 = useful proxy evidence",
                                "0.7-0.8 = credible direct evidence with some limitations",
                                "0.9-1.0 = strong first-party evidence with external corroboration"
                            ]
                        },
                        suggestedVectors: [
                            "Problem intensity and frequency",
                            "AI/adoption readiness or category readiness",
                            "Budget / willingness to pay",
                            "Market size and growth tailwind",
                            "Competitive whitespace",
                            "GTM feasibility from current stage",
                            "ROI and outcome measurability"
                        ]
                    },
                    tamSamSom: {
                        instructions: "Size the market in three tiers. TAM = total market regardless of reach. SAM = scoped to this product's geography and segment. SOM = realistic Year 1 capture given stage, team, and GTM. Every tier is a low/base/high range — never a single point.",
                        mustInclude: [
                            "TAM: low/base/high range with source and the driver of the spread",
                            "SAM: low/base/high range scoped to geography and segment with methodology",
                            "SOM: Year 1 low/base/high capture range with reasoning",
                            "State whether you used top-down (report-based), bottom-up (unit economics), or comparable company method",
                            "SOM sensitivity: name the single assumption that, if wrong, most changes SOM — and state the SOM value if that assumption fails",
                            "State explicitly whether the demand verdict still holds at the LOW end of the SOM range"
                        ]
                    },
                    whyNow: {
                        instructions: "Market timing analysis — why is NOW the right time for this product? An investment verdict is incomplete without a timing thesis.",
                        mustInclude: [
                            "What changed recently (technology, regulation, behaviour, cost curve, distribution) that makes this newly possible or newly urgent — with citation",
                            "Why the next 12-24 months specifically — what window is open and what closes it?",
                            "The cost of waiting: what does a 12-month delay do to the opportunity?",
                            "Timing verdict: EARLY / ON-TIME / LATE with reasoning"
                        ]
                    },
                    proxyRegister: {
                        instructions: "When direct evidence does not exist, use the closest defensible proxy and make the limitation obvious.",
                        mustInclude: [
                            "What direct evidence was unavailable",
                            "What proxy was used instead",
                            "Why the proxy is acceptable or risky",
                            "How the proxy affects Evidence Maturity Score and matrix verdict",
                            "What first-party validation would replace the proxy"
                        ]
                    },
                    demandSignals: {
                        instructions: "Find and present minimum 4 real demand signals with evidence.",
                        mustInclude: [
                            "Search volume or interest trend data",
                            "Competitor funding rounds with amounts and dates",
                            "Customer willingness to pay evidence from the market",
                            "Adjacent market adoption that validates this space",
                            "Each signal needs a source — not a category label"
                        ]
                    },
                    growthRate: {
                        instructions: "Find the CAGR for the most relevant market segment from a real report.",
                        mustInclude: [
                            "Specific CAGR percentage with source and forecast period",
                            "Your assessment: does this rate apply to THIS product? Why or why not?"
                        ]
                    },
                    marketTrends: {
                        instructions: "Identify minimum 3 trends specific to this product's market — not generic macro trends.",
                        mustInclude: [
                            "Each trend must directly create or threaten demand for this product",
                            "For each trend: what it means for product positioning"
                        ]
                    },
                    competitiveFundingActivity: {
                        instructions: "Search for recent funding rounds and exits in this space.",
                        mustInclude: [
                            "Which competitors raised recently, how much, and from whom",
                            "Any notable acquisitions or exits",
                            "What this funding activity signals about market maturity"
                        ]
                    },
                    riskFactors: {
                        instructions: "Identify minimum 3 demand risks SPECIFIC to this market, geography, and customer segment.",
                        mustInclude: [
                            "Not generic risks like 'competition' or 'economic downturn'",
                            "For each risk: a mitigation hypothesis"
                        ]
                    },
                    decisionFlowVisual: {
                        instructions: "Show the confidence workflow visually so a PM can understand how evidence becomes a verdict.",
                        mustInclude: [
                            "A Mermaid flowchart or equivalent decision flow",
                            "Separate paths for Hypothesis Support Score and Evidence Maturity Score",
                            "The branch where PM acknowledges, rejects, or appends evidence",
                            "The branch where missing evidence triggers discovery or a survey plan",
                            "The matrix classification and recalculation step after PM input"
                        ]
                    },
                    evidenceContributionChart: {
                        instructions: "Show which vectors drive hypothesis support and which vectors weaken evidence maturity.",
                        mustInclude: [
                            "A contribution chart or table ordered by support contribution",
                            "A maturity-gap chart or table ordered by weakest evidence quality",
                            "Clear visual treatment of weak or missing evidence",
                            "A short interpretation of which vectors must improve to move the matrix verdict"
                        ]
                    },
                    validationEvidenceAsk: {
                        instructions: "After the analysis, ask the PM for validation evidence needed to make the confidence model meaningful.",
                        mustInclude: [
                            "Separate ask #1: rate the Scout output 1-5 and acknowledge, reject, or append each evidence vector",
                            "Separate ask #2: provide validation evidence for weak or missing vectors, or choose discovery support",
                            "A table of missing/weak evidence with suggested validation method",
                            "A clear statement that Hypothesis Support and Evidence Maturity should be recalculated after PM evidence is provided"
                        ]
                    },
                    discoverySurveyPlan: {
                        instructions: "If the PM does not yet have validation evidence, provide a survey plan that can be turned into a Google Form or other survey.",
                        mustInclude: [
                            "Survey objective tied to the weakest confidence vectors",
                            "Target respondent profile and recommended sample size",
                            "Question list with type: multiple choice, Likert, ranking, short answer, or consent",
                            "Mapping from each question to the confidence vector it validates",
                            "Suggested acceptance thresholds for raising or lowering support and maturity scores",
                            "Google Forms automation note: use OAuth or an existing Google integration/API credentials; never collect or store the user's Google username/password"
                        ]
                    },
                    verdict: {
                        instructions: "Conclude with Scout's market demand verdict, based on the two-axis confidence matrix and any clearly stated PM-review assumptions.",
                        mustInclude: [
                            "Overall rating: STRONG / MODERATE / WEAK",
                            "Hypothesis Support Score with range",
                            "Evidence Maturity Score with range",
                            "Matrix verdict, e.g. high support / low maturity = promising but unvalidated",
                            "Whether the confidence is preliminary or PM-reviewed",
                            "Top 3 reasons supporting the rating",
                            "The single biggest unknown that could change the verdict",
                            "The next PM decision: acknowledge, reject, append, or run discovery"
                        ]
                    },
                    machineReadableVerdict: {
                        instructions: "The VERY LAST element of your output must be a machine-readable verdict block in a ```json fence. The Synthesizer parses this block to build the investment decision — the analysis is incomplete without it.",
                        schema: {
                            robot: "scout",
                            verdict: "STRONG | MODERATE | WEAK",
                            hypothesisSupportScore: { low: "number 0-100", base: "number 0-100", high: "number 0-100" },
                            evidenceMaturityScore: { low: "number 0-100", base: "number 0-100", high: "number 0-100" },
                            confidenceStatus: "preliminary | pm-reviewed",
                            evidenceTier: "researched-cited",
                            somYear1Base: "string — Year 1 SOM base estimate with currency",
                            timingVerdict: "EARLY | ON-TIME | LATE",
                            topReasons: ["exactly 3 strings"],
                            biggestUnknown: "string",
                            killCondition: "string — copied from the hypothesis statement"
                        },
                        rules: [
                            "All scores must be JSON numbers, not strings",
                            "Values must match the narrative verdict exactly — no divergence between prose and JSON",
                            "The block must be the final element of the output so downstream parsers can find it"
                        ]
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                geography: context.answers?.target_geo,
                segments: context.answers?.market_segment,
                buyerUserDynamic: context.answers?.buyer_vs_user,
                corePainPoint: context.answers?.pain_point,
                willingnessToPay: context.answers?.willingness_to_pay,
                knownCompetitors: context.answers?.known_competitors,
                revenueModel: context.answers?.revenue_model,
                stage: context.answers?.funding_stage,
                timeline: context.answers?.timeline,
                marketSizeKnown: context.answers?.market_size_known,
                dataSources: context.answers?.data_sources,
                fullSummary: context.summary
            },

            suggestedSearchQueries: this._generateSearchQueries(context),

            outputFormat: {
                style: "Narrative sections with inline citations — NOT bullet skeletons. Use rich HTML with inline styles for visual elements.",
                length: "Comprehensive — this is a PM deliverable, not a summary",
                citations: "Inline [Source: name/URL] after every statistic or claim",
                tables: "Use HTML tables with styled headers (background colors for column groups), alternating row shading, and bold verdict cells for: TAM/SAM/SOM, evidence vectors, proxy register, validation asks, and risk factors",
                visuals: "Include a Mermaid decision-flow chart (```mermaid fence) and a Chart.js bar chart for evidence contribution scores (<canvas> + <script> inside a ```html fence)",
                htmlRequired: "IMPORTANT: You MUST generate your response as rich HTML in this chat window using white/light backgrounds (DO NOT use dark mode). Include HTML blocks with inline styles for: (1) confidence score badges as colored <span> tags, (2) verdict banner as a styled <div> with background color matching STRONG=green/MODERATE=amber/WEAK=red, (3) evidence vector table with colored contribution bars, (4) risk severity badges. RENDERING RULE: wrap EVERY multi-line HTML block and EVERY <script> block in a ```html fence — never emit multi-line raw HTML outside a fence, or the saved HTML file will break scripts. When you are done and call the 'save-robot-output' tool, you MUST pass this HTML into the 'htmlText' parameter, AND convert the content to pure, tag-free Markdown and pass it into the 'cleanMarkdown' parameter (but ALWAYS keep the final ```json verdict block in BOTH parameters).",
                audienceViews: {
                    instructions: "Structure the output in three audience layers, in this order. Same facts at different altitude — the layers must never contradict each other.",
                    executiveBriefing: "FIRST: a 60-second C-suite view — verdict banner, hypothesis statement, 3 headline numbers (SOM base, support score, maturity score), one chart. No methodology.",
                    pmWorkingLayer: "MIDDLE: the full analysis — confidence model, TAM/SAM/SOM, demand signals, trends, risks, validation asks.",
                    analystAppendix: "LAST (before the JSON verdict block): assumptions register, data sources with publication dates, scoring rubrics, proxy register, methodology notes."
                },
                pmReviewProtocol: [
                    "Ask the PM to rate the output 1-5",
                    "Ask the PM to acknowledge, reject, or append each evidence vector",
                    "Ask the PM to provide validation evidence for weak vectors or choose discovery support",
                    "If discovery support is chosen, produce a survey/Google Form-ready question set and validation thresholds",
                    "Recalculate Hypothesis Support Score and Evidence Maturity Score after PM input is received",
                    "Move the verdict through the two-axis matrix instead of using an unexplained single-number confidence formula"
                ],
                security: "Never ask the PM for Google username/password. Automated Google Form creation must use OAuth or a configured Google integration/API credentials."
            }
        };

        this.successCount++;
        return analysis;
    }

    _generateSearchQueries(context) {
        const queries = [];

        // ── FIX: read brandTerms seeded by interview robot ──────────────
        const brandTerms = context.brandTerms || [];

        // Derive domain keywords from pain_point first (always descriptive, never branded)
        // Fall back to productIdea with brand exclusion if pain_point is missing
        const painPoint = context.answers?.pain_point || "";
        let keywords = extractDomainKeywords(painPoint, brandTerms);

        // Fallback: if pain_point produced fewer than 2 words, use productIdea minus brand terms
        if (keywords.split(" ").filter(Boolean).length < 2) {
            keywords = extractDomainKeywords(context.productIdea || "", brandTerms);
        }

        // Geography from context only — never inject a default market into research queries
        const geo = (context.answers?.target_geo || "").split(/[—,]/)[0].trim();
        const competitors = context.robotHints?.detective?.knownCompetitors || [];

        // Years derived from the clock — hardcoded years go stale and poison recency
        const year = new Date().getFullYear();

        // Market sizing queries — now uses clean domain keywords, not brand names
        queries.push(`${keywords} market size ${geo} ${year}`.replace(/\s+/g, " ").trim());
        queries.push(`${keywords} industry TAM CAGR forecast report ${year}`);

        // Demand signals
        queries.push(`${keywords} startup funding rounds ${year - 1} ${year}`);
        queries.push(`${keywords} ${geo} growth trends demand`.replace(/\s+/g, " ").trim());

        // Competitor funding — still uses actual competitor names (correct — these are not brand exclusions)
        if (competitors.length > 0) {
            queries.push(`${competitors[0]} funding revenue valuation ${year - 1} ${year}`);
        }

        // Segment-specific
        const segment = context.answers?.market_segment || "";
        if (segment.toLowerCase().includes("b2b")) {
            queries.push(`${keywords} enterprise B2B market ${geo}`.replace(/\s+/g, " ").trim());
        }
        if (segment.toLowerCase().includes("b2c")) {
            queries.push(`${keywords} consumer market ${geo} willingness to pay`.replace(/\s+/g, " ").trim());
        }

        return queries;
    }

    // Keyword extraction moved to utils/keywords.js
}

export default ScoutRobot;
