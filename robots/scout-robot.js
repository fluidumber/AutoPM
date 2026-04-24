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
                role: `You are Scout, a senior market research analyst. Your job is to produce a rigorous, cited, opinionated market demand analysis. Use web_search to find real data — do not rely on training data alone for market sizing, growth rates, or funding activity.`,

                mandate: [
                    "Search for real market data BEFORE writing your analysis",
                    "Every statistic must have an inline citation: [Source: name or URL]",
                    "NEVER return placeholder text like 'to be researched' or 'define based on analysis'",
                    "NEVER use generic SaaS benchmarks (e.g. '15-25% CAGR typical for SaaS') without a specific citation for THIS market",
                    "If you cannot find data for something, state what you searched and what the closest proxy is",
                    "Be opinionated — conclude with a verdict: STRONG / MODERATE / WEAK demand and WHY",
                    "Write like a McKinsey analyst, think like a product founder"
                ],

                requiredSections: {
                    tamSamSom: {
                        instructions: "Size the market in three tiers. TAM = total market regardless of reach. SAM = scoped to this product's geography and segment. SOM = realistic Year 1 capture given stage, team, and GTM.",
                        mustInclude: [
                            "TAM: specific INR/USD figure with source",
                            "SAM: scoped to geography and segment with methodology",
                            "SOM: Year 1 realistic capture with reasoning",
                            "State whether you used top-down (report-based), bottom-up (unit economics), or comparable company method"
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
                    verdict: {
                        instructions: "Conclude with Scout's market demand verdict.",
                        mustInclude: [
                            "Overall rating: STRONG / MODERATE / WEAK",
                            "Confidence score 1-10 with reasoning",
                            "Top 3 reasons supporting the rating",
                            "The single biggest unknown that could change the verdict"
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
                style: "Narrative sections with inline citations — NOT bullet skeletons",
                length: "Comprehensive — this is a PM deliverable, not a summary",
                citations: "Inline [Source: name/URL] after every statistic or claim",
                tables: "Use a table for TAM/SAM/SOM breakdown and for risk factors"
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

        const geo = (context.answers?.target_geo || "India").split(/[—,]/)[0].trim();
        const competitors = context.robotHints?.detective?.knownCompetitors || [];

        // Market sizing queries — now uses clean domain keywords, not brand names
        queries.push(`${keywords} market size ${geo} 2025`);
        queries.push(`${keywords} industry TAM CAGR forecast report`);

        // Demand signals
        queries.push(`${keywords} startup funding rounds 2024 2025`);
        queries.push(`${keywords} ${geo} growth trends demand`);

        // Competitor funding — still uses actual competitor names (correct — these are not brand exclusions)
        if (competitors.length > 0) {
            queries.push(`${competitors[0]} funding revenue valuation 2024 2025`);
        }

        // Segment-specific
        const segment = context.answers?.market_segment || "";
        if (segment.toLowerCase().includes("b2b")) {
            queries.push(`${keywords} enterprise B2B market ${geo}`);
        }
        if (segment.toLowerCase().includes("b2c")) {
            queries.push(`${keywords} consumer market ${geo} willingness to pay`);
        }

        return queries;
    }

    // Keyword extraction moved to utils/keywords.js
}

export default ScoutRobot;