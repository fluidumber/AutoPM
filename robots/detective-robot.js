// detective-robot.js — Full Rewrite + Brand Name Bug Fix + Coverage Completeness
import { extractDomainKeywords } from "../utils/keywords.js";

class DetectiveRobot {
    constructor() {
        this.name = "Detective Robot 🔎";
        this.job = "Competitive intelligence — competitors, gaps, moat, positioning";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing competitive intelligence prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const knownCompetitors = context.robotHints?.detective?.knownCompetitors
            || this._extractCompetitorList(context.answers?.known_competitors || "");

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are Detective, a senior competitive intelligence analyst. Your job is to map the competitive landscape with precision — direct competitors, indirect alternatives, market gaps, and the moat this product can build. Use web_search to find real competitor data, pricing, funding, and positioning. Never speculate without evidence.`,

                mandate: [
                    "Search for each known competitor before analysing them — use real current data",
                    "Go beyond the competitor list provided — find competitors the PM may not know about",
                    "Every competitor strength and weakness must be grounded in observable evidence (product, pricing, reviews, funding)",
                    "NEVER list generic moat factors like 'brand loyalty' without explaining how THIS product earns them",
                    "NEVER return placeholder competitor names or generic weakness lists",
                    "Profile EVERY competitor in the knownCompetitors list — if a competitor is out of scope (e.g. wrong industry), explicitly state why it was excluded rather than silently dropping it",
                    "Conclude with a positioning recommendation — where should this product stand in the market?"
                ],

                requiredSections: {
                    directCompetitors: {
                        instructions: `Research and profile EVERY competitor in the knownCompetitors list below. Do not silently skip any — if a competitor is tangential or out of scope, include a one-line triage note explaining why it was deprioritised. Then search for additional competitors the PM may have missed.`,
                        perCompetitor: [
                            "Name, founding year, funding raised (with source)",
                            "Core product and methodology (what makes them tick)",
                            "Pricing model and price points (search their website)",
                            "Top 3 genuine strengths (observable, not generic)",
                            "Top 3 genuine weaknesses (what users actually complain about — check reviews, forums)",
                            "Estimated market reach or revenue if findable",
                            "The ONE thing they do better than anyone else"
                        ],
                        knownCompetitors: knownCompetitors,
                        coverageRule: "Profile all competitors above OR provide an explicit triage note for any excluded. Never silently drop a competitor from the list."
                    },
                    indirectCompetitors: {
                        instructions: "What do customers use TODAY when they don't use any of the direct competitors? These are the real alternatives to displace.",
                        mustInclude: [
                            "Manual/offline methods (spreadsheets, WhatsApp groups, word of mouth)",
                            "Adjacent category products being repurposed",
                            "Free or low-cost substitutes",
                            "For each: why customers stick with it despite its limitations"
                        ]
                    },
                    marketGaps: {
                        instructions: "Derive the real gaps from the competitor analysis — not generic complaints.",
                        mustInclude: [
                            "Methodology gaps: what approach do all competitors share that is fundamentally flawed?",
                            "Segment gaps: which customer segments are underserved or ignored?",
                            "Experience gaps: where does the user journey break down across all competitors?",
                            "Pricing gaps: what price point or model is missing in the market?",
                            "Geographic gaps: where are competitors absent or weak?"
                        ]
                    },
                    differentiators: {
                        instructions: "Based on the product context and the competitive analysis, derive the genuine differentiators.",
                        mustInclude: [
                            "Methodological differentiator: what does this product do fundamentally differently?",
                            "Experience differentiator: what does the user journey feel like vs. competitors?",
                            "Business model differentiator: how does the monetisation differ?",
                            "Segment differentiator: who does this serve that competitors ignore?"
                        ]
                    },
                    competitiveMoat: {
                        instructions: "Analyse the moat this product can realistically build. Be specific — not generic.",
                        moatTypes: [
                            "Data moat: does longitudinal user data create a compounding advantage?",
                            "Network effects: does each new user/expert/institute make the platform more valuable for others?",
                            "Switching costs: what makes it hard to leave once a user is invested?",
                            "Methodology IP: is the assessment/recommendation approach hard to replicate?",
                            "Distribution moat: does the B2B2C expert channel create defensible distribution?"
                        ],
                        mustConclude: "Rate each moat type: STRONG / EMERGING / WEAK and explain why"
                    },
                    positioningRecommendation: {
                        instructions: "Based on everything above, recommend where this product should position itself.",
                        mustInclude: [
                            "The 1-sentence positioning statement",
                            "Which competitor to position AGAINST most directly (and why)",
                            "Which competitor to avoid going head-to-head with (and why)",
                            "The category narrative this product should own"
                        ]
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                differentiation: context.answers?.why_existing_fail,
                knownCompetitors: context.answers?.known_competitors,
                benchmarkRequests: context.answers?.reference_companies,
                geography: context.answers?.target_geo,
                segments: context.answers?.market_segment,
                revenueModel: context.answers?.revenue_model,
                fullSummary: context.summary
            },

            suggestedSearchQueries: this._generateSearchQueries(context, knownCompetitors),

            outputFormat: {
                style: "One subsection per competitor with consistent structure, then narrative sections for gaps, moat, and positioning",
                length: "Thorough — competitive intel is only useful if specific",
                citations: "Link to pricing pages, review platforms, funding databases where possible",
                tables: "Use a comparison table for direct competitors (name, funding, pricing, key strength, key weakness)"
            }
        };

        this.successCount++;
        return analysis;
    }

    _extractCompetitorList(competitorAnswer) {
        if (!competitorAnswer) return [];
        return competitorAnswer
            .split(/,|;|\n/)
            .map(c => c.replace(/\[.*?\]/g, "").trim())
            .filter(c => c.length > 2 && !c.toLowerCase().startsWith("research"));
    }

    _generateSearchQueries(context, competitors) {
        const queries = [];

        // ── FIX: read brandTerms seeded by interview robot ──────────────
        const brandTerms = context.brandTerms || [];

        // Derive domain keywords from pain_point (always descriptive, never branded)
        const painPoint = context.answers?.pain_point || "";
        let keywords = extractDomainKeywords(painPoint, brandTerms);

        // Fallback: if pain_point produced fewer than 2 words, use productIdea minus brand terms
        if (keywords.split(" ").filter(Boolean).length < 2) {
            keywords = extractDomainKeywords(context.productIdea || "", brandTerms);
        }

        const geo = (context.answers?.target_geo || "India").split(/[—,]/)[0].trim();

        // Competitor-specific searches — still uses actual competitor names (correct)
        competitors.slice(0, 3).forEach(c => {
            queries.push(`${c} funding pricing product features 2024 2025`);
            queries.push(`${c} reviews complaints alternatives`);
        });

        // ── FIX: gap discovery now uses clean domain keywords, not raw productIdea words
        queries.push(`${keywords} market gaps underserved segment ${geo}`);
        queries.push(`best ${keywords} platform ${geo} comparison`);

        return queries;
    }

    // Keyword extraction moved to utils/keywords.js
}

export default DetectiveRobot;